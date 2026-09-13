import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Workspace } from '../lib/workspace.js';

async function fresh() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vs-ws-'));
  const workspace = new Workspace(dir);
  await workspace.init();
  return workspace;
}

test('refuses paths that climb out of the workspace', async () => {
  const ws = await fresh();
  for (const bad of ['../secret', '../../etc/passwd', 'a/../../../etc/passwd']) {
    await assert.rejects(() => ws.resolve(bad), /escapes the workspace/, bad);
  }
});

test('treats a leading slash as workspace-relative, not absolute', async () => {
  const ws = await fresh();
  const resolved = await ws.resolve('/index.html');
  assert.equal(ws.rel(resolved), 'index.html');
});

test('refuses to follow a symlink out of the workspace', async () => {
  const ws = await fresh();
  await fs.symlink('/etc', path.join(ws.root, 'escape'));
  await assert.rejects(() => ws.resolve('escape/passwd'), /symlink/);
});

test('resolves the root itself', async () => {
  const ws = await fresh();
  assert.equal(await ws.resolve('.'), ws.root);
  assert.deepEqual(await ws.list('.'), []);
});

test('writes create missing parent folders', async () => {
  const ws = await fresh();
  await ws.write('src/deep/app.js', 'console.log(1)');
  assert.equal(await ws.read('src/deep/app.js'), 'console.log(1)');
  const listed = (await ws.list('.')).map((entry) => entry.path);
  assert.deepEqual(listed, ['src', 'src/deep', 'src/deep/app.js']);
});

test('reading a missing file explains itself in workspace terms', async () => {
  const ws = await fresh();
  await assert.rejects(() => ws.read('nope.txt'), (err) => {
    assert.match(err.message, /nope\.txt does not exist/);
    assert.doesNotMatch(err.message, /tmp/, 'should not leak the absolute path');
    return true;
  });
});

test('reading a folder says so rather than throwing EISDIR', async () => {
  const ws = await fresh();
  await ws.write('src/a.js', 'x');
  await assert.rejects(() => ws.read('src'), /is a folder/);
});

test('edit requires a unique match unless replace_all is set', async () => {
  const ws = await fresh();
  await ws.write('a.txt', 'one two one');
  await assert.rejects(() => ws.edit('a.txt', 'one', 'X'), /more than once/);
  await ws.edit('a.txt', 'one', 'X', true);
  assert.equal(await ws.read('a.txt'), 'X two X');
  await assert.rejects(() => ws.edit('a.txt', 'absent', 'y'), /was not found/);
});

test('grep reports file, line and text', async () => {
  const ws = await fresh();
  await ws.write('a.js', 'const x = 1;\nconst target = 2;');
  const hits = await ws.grep('target');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].path, 'a.js');
  assert.equal(hits[0].line, 2);
});

test('the workspace root cannot be deleted', async () => {
  const ws = await fresh();
  await assert.rejects(() => ws.remove('.'), /workspace root/);
});
