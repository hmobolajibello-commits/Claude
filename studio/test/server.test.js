import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.js');
const PASSWORD = 'a good long password';
const BOOT_TIMEOUT_MS = 15000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => resolve(false));
    socket.setTimeout(500, () => { socket.destroy(); resolve(false); });
  });
}

/**
 * Start a real server the way the container image does.
 * Readiness is decided by the port actually accepting connections rather than
 * by matching banner text, so a wording change never hangs the suite.
 */
async function start(extraEnv = {}, args = []) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vs-srv-'));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, [SERVER, ...args], {
    env: {
      PATH: process.env.PATH,
      STUDIO_DATA_DIR: path.join(dir, '.studio'),
      STUDIO_WORKSPACE: path.join(dir, 'workspace'),
      HOST: '127.0.0.1',
      PORT: String(port),
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });

  let exited = false;
  child.on('exit', () => { exited = true; });

  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (exited) break;                       // refused to start; the test inspects output
    if (await portOpen(port)) break;
    await sleep(100);
  }

  const server = {
    port,
    dir,
    child,
    exited: () => exited,
    get output() { return output; },
    base: `http://127.0.0.1:${port}`,
    async stop() {
      if (!exited) {
        child.kill('SIGKILL');
        await new Promise((resolve) => child.on('exit', resolve));
      }
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
  return server;
}

async function signIn(server, password = PASSWORD) {
  const res = await fetch(`${server.base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  assert.equal(res.status, 200, 'sign-in should succeed');
  return res.headers.get('set-cookie').split(';')[0];
}

test('refuses a public bind when no password is set', async (t) => {
  const server = await start({ HOST: '0.0.0.0' });
  t.after(() => server.stop());
  assert.ok(server.exited(), 'the process should have exited');
  assert.equal(server.child.exitCode, 1);
  assert.match(server.output, /Refusing to start/);
  assert.match(server.output, /STUDIO_PASSWORD/);
});

test('starts on a public bind once a password is set', async (t) => {
  const server = await start({ HOST: '0.0.0.0', STUDIO_PASSWORD: PASSWORD });
  t.after(() => server.stop());
  assert.ok(!server.exited(), 'the process should still be running');
  assert.match(server.output, /password required/);
});

test('a short password is rejected outright', async (t) => {
  const server = await start({ STUDIO_PASSWORD: 'short' });
  t.after(() => server.stop());
  assert.ok(server.exited());
  assert.match(server.output, /at least 8/);
});

test('nothing is served without a session', async (t) => {
  const server = await start({ STUDIO_PASSWORD: PASSWORD });
  t.after(() => server.stop());

  for (const route of ['/api/state', '/api/files', '/api/connections', '/api/file?path=x']) {
    assert.equal((await fetch(`${server.base}${route}`)).status, 401, route);
  }
  for (const route of ['/', '/app.js', '/preview/']) {
    const res = await fetch(`${server.base}${route}`, { redirect: 'manual' });
    assert.equal(res.status, 302, route);
    assert.equal(res.headers.get('location'), '/login');
  }
  // The sign-in page and the stylesheet it needs stay public.
  assert.equal((await fetch(`${server.base}/login`)).status, 200);
  assert.equal((await fetch(`${server.base}/app.css`)).status, 200);
});

test('signing in unlocks the app; a forged cookie does not', async (t) => {
  const server = await start({ STUDIO_PASSWORD: PASSWORD });
  t.after(() => server.stop());

  const bad = await fetch(`${server.base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: 'wrong' }),
  });
  assert.equal(bad.status, 401);
  assert.equal(bad.headers.get('set-cookie'), null, 'a failed sign-in must not set a cookie');

  const cookie = await signIn(server);
  assert.equal((await fetch(`${server.base}/api/state`, { headers: { cookie } })).status, 200);
  assert.equal((await fetch(`${server.base}/api/state`, { headers: { cookie: 'studio_session=forged' } })).status, 401);
});

test('the session cookie is HttpOnly and SameSite', async (t) => {
  const server = await start({ STUDIO_PASSWORD: PASSWORD });
  t.after(() => server.stop());
  const res = await fetch(`${server.base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const cookie = res.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
});

test('signing out invalidates the session', async (t) => {
  const server = await start({ STUDIO_PASSWORD: PASSWORD });
  t.after(() => server.stop());
  const cookie = await signIn(server);
  assert.equal((await fetch(`${server.base}/api/logout`, { method: 'POST', headers: { cookie } })).status, 200);
  assert.equal((await fetch(`${server.base}/api/state`, { headers: { cookie } })).status, 401);
});

test('an api key from the environment is used but never exposed or persisted', async (t) => {
  const server = await start({
    STUDIO_PASSWORD: PASSWORD,
    STUDIO_PROVIDER: 'google',
    STUDIO_MODEL: 'gemini-2.0-flash',
    STUDIO_API_KEY: 'sk-env-provided-secret-value',
  });
  t.after(() => server.stop());
  const cookie = await signIn(server);

  const state = await (await fetch(`${server.base}/api/state`, { headers: { cookie } })).json();
  assert.doesNotMatch(JSON.stringify(state), /sk-env-provided/, 'the key must never reach the browser');
  assert.equal(state.config.hasApiKey, true);
  assert.equal(state.config.model, 'gemini-2.0-flash');
  assert.deepEqual([...state.config.envLocked].sort(), ['apiKey', 'model', 'provider']);

  // The browser cannot override what the host pinned.
  const updated = await (await fetch(`${server.base}/api/config`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ model: 'something-else', apiKey: 'attacker-key', maxSteps: 31 }),
  })).json();
  assert.equal(updated.config.model, 'gemini-2.0-flash', 'the env-pinned model must win');
  assert.equal(updated.config.maxSteps, 31, 'fields the env does not pin stay editable');

  const onDisk = await fs.readFile(path.join(server.dir, '.studio', 'config.json'), 'utf8');
  assert.doesNotMatch(onDisk, /sk-env-provided/, 'an env key must not be written to disk');
  assert.doesNotMatch(onDisk, /attacker-key/);
});

test('cross-origin writes are refused even with a valid session', async (t) => {
  const server = await start({ STUDIO_PASSWORD: PASSWORD });
  t.after(() => server.stop());
  const cookie = await signIn(server);

  const res = await fetch(`${server.base}/api/config`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie, origin: 'https://evil.example' },
    body: JSON.stringify({ maxSteps: 60 }),
  });
  assert.equal(res.status, 403);
});

test('repeated wrong passwords lock the caller out', async (t) => {
  const server = await start({ STUDIO_PASSWORD: PASSWORD });
  t.after(() => server.stop());

  let sawLockout = false;
  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${server.base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: `guess-${i}` }),
    });
    if (res.status === 429) { sawLockout = true; break; }
  }
  assert.ok(sawLockout, 'guessing should eventually be rate limited');

  // Even the correct password is refused while the lockout stands.
  const correct = await fetch(`${server.base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD }),
  });
  assert.equal(correct.status, 429);
});

test('with no password the app is open, for local use', async (t) => {
  const server = await start();
  t.after(() => server.stop());
  assert.equal((await fetch(`${server.base}/api/state`)).status, 200);
  assert.match(server.output, /loopback only/);
});

test('the data directory is honoured, so a mounted volume persists settings', async (t) => {
  const server = await start({ STUDIO_PASSWORD: PASSWORD });
  t.after(() => server.stop());
  const cookie = await signIn(server);

  await fetch(`${server.base}/api/config`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ maxSteps: 42 }),
  });

  const saved = JSON.parse(await fs.readFile(path.join(server.dir, '.studio', 'config.json'), 'utf8'));
  assert.equal(saved.maxSteps, 42);
  const mode = (await fs.stat(path.join(server.dir, '.studio', 'config.json'))).mode & 0o777;
  assert.equal(mode, 0o600, 'settings may hold an api key, so keep them owner-only');
});
