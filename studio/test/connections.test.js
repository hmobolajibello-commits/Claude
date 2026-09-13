import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Connections } from '../lib/connections.js';
import { buildTools } from '../lib/tools.js';

const TOKEN = 'ghp_SECRET_VALUE_0123456789';

async function fresh({ secret = 'passphrase' } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vs-conn-'));
  const file = path.join(dir, 'connections.json');
  const connections = new Connections(file, { secret });
  await connections.load();
  return { connections, file };
}

function captureFetch(response = { ok: true }) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), ...init });
    return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return calls;
}

test('the stored token never appears in anything the UI or model sees', async () => {
  const { connections, file } = await fresh();
  await connections.add({ service: 'github', token: TOKEN });

  const listed = JSON.stringify(connections.list());
  assert.doesNotMatch(listed, /SECRET_VALUE/);
  assert.doesNotMatch(listed, /token/);

  const tools = buildTools({ workspace: null, connections, allowCommands: false });
  const summary = await tools.find((t) => t.name === 'list_connections').run({});
  assert.doesNotMatch(summary, /SECRET_VALUE/);
  assert.match(summary, /read-only/);

  const onDisk = await fs.readFile(file, 'utf8');
  assert.doesNotMatch(onDisk, /SECRET_VALUE/, 'token must be encrypted at rest');
  assert.match(onDisk, /enc:v1:/);
});

test('the credential file is readable only by its owner', async () => {
  const { connections, file } = await fresh();
  await connections.add({ service: 'github', token: TOKEN });
  assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
});

test('an unencrypted store still works when no passphrase is set', async () => {
  const { connections, file } = await fresh({ secret: '' });
  await connections.add({ service: 'github', token: TOKEN });
  const calls = captureFetch();
  await connections.call('github', { path: '/user' });
  assert.equal(calls[0].headers.authorization, `Bearer ${TOKEN}`);
  assert.match(await fs.readFile(file, 'utf8'), /SECRET_VALUE/, 'without a passphrase it is plaintext, by design');
});

test('the server attaches auth; the caller only supplies a path', async () => {
  const { connections } = await fresh();
  await connections.add({ service: 'github', token: TOKEN });
  const calls = captureFetch({ login: 'octocat' });
  const result = await connections.call('github', { path: '/user', query: { per_page: 5 } });
  assert.equal(calls[0].url, 'https://api.github.com/user?per_page=5');
  assert.equal(calls[0].headers.authorization, `Bearer ${TOKEN}`);
  assert.equal(calls[0].headers['x-github-api-version'], '2022-11-28');
  assert.equal(result.body.login, 'octocat');
});

test('a connection cannot be aimed at another host', async () => {
  const { connections } = await fresh();
  await connections.add({ service: 'github', token: TOKEN });
  const calls = captureFetch();

  // The property that matters is that the credential only ever reaches the
  // pinned host. Some of these are refused outright and some are normalised
  // back onto the base URL; both are fine, reaching evil.test is not.
  const attempts = [
    'https://evil.test/steal',   // absolute URL
    '//evil.test/steal',         // protocol-relative
    '/../../evil',               // traversal above the base path
    'https://api.github.com.evil.test/x', // lookalike host
  ];

  for (const attempt of attempts) {
    const before = calls.length;
    try {
      await connections.call('github', { path: attempt });
    } catch (err) {
      assert.match(err.message, /may only reach|escapes|private/);
      continue;
    }
    const sent = calls[before];
    assert.ok(sent, `${attempt} reported success without a request`);
    assert.equal(new URL(sent.url).hostname, 'api.github.com', `${attempt} left the pinned host`);
  }
});

test('write methods need explicit permission', async () => {
  const { connections } = await fresh();
  await connections.add({ service: 'github', token: TOKEN, allowWrites: false });
  await connections.add({ id: 'notion', service: 'notion', token: 'n', allowWrites: true });
  captureFetch();

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    await assert.rejects(() => connections.call('github', { method, path: '/x' }), /read-only/);
  }
  await assert.doesNotReject(() => connections.call('github', { method: 'GET', path: '/x' }));
  await assert.doesNotReject(() => connections.call('notion', { method: 'POST', path: '/pages', body: { a: 1 } }));
});

test('a service that needs a base URL rejects a private one', async () => {
  const { connections } = await fresh();
  await assert.rejects(
    () => connections.add({ service: 'custom', token: 't', baseUrl: 'http://169.254.169.254/' }),
    /private address/,
  );
  await assert.rejects(() => connections.add({ service: 'custom', token: 't' }), /needs a base URL/);
});

test('an unknown connection points at the Accounts panel', async () => {
  const { connections } = await fresh();
  await assert.rejects(() => connections.call('dropbox', { path: '/' }), /no connection named .*Accounts panel/s);
});

test('connections survive a restart and a wrong passphrase cannot use them', async () => {
  const { connections, file } = await fresh();
  await connections.add({ service: 'github', token: TOKEN });

  const reopened = new Connections(file, { secret: 'passphrase' });
  await reopened.load();
  const calls = captureFetch();
  await reopened.call('github', { path: '/user' });
  assert.equal(calls[0].headers.authorization, `Bearer ${TOKEN}`);

  const wrong = new Connections(file, { secret: 'not-it' });
  await wrong.load();
  await assert.rejects(() => wrong.call('github', { path: '/user' }));
});

test('disconnecting removes the stored credential', async () => {
  const { connections, file } = await fresh();
  await connections.add({ service: 'github', token: TOKEN });
  assert.equal(await connections.remove('github'), true);
  assert.deepEqual(connections.list(), []);
  assert.doesNotMatch(await fs.readFile(file, 'utf8'), /enc:v1:/);
  assert.equal(await connections.remove('github'), false);
});
