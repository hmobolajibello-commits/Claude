import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildTools, runAgent, systemPrompt } from '../lib/tools.js';
import { Workspace } from '../lib/workspace.js';
import { Connections } from '../lib/connections.js';

async function harness({ allowCommands = false } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vs-agent-'));
  const workspace = new Workspace(dir);
  await workspace.init();
  const connections = new Connections(path.join(dir, 'c.json'));
  await connections.load();
  return { workspace, connections, tools: buildTools({ workspace, connections, allowCommands }) };
}

test('shell access is off unless it is switched on', async () => {
  const locked = await harness();
  const opened = await harness({ allowCommands: true });
  assert.ok(!locked.tools.some((t) => t.name === 'run_command'));
  assert.ok(opened.tools.some((t) => t.name === 'run_command'));
  assert.match(systemPrompt({ allowCommands: false }), /cannot run shell commands/);
  assert.match(systemPrompt({ allowCommands: true }), /run_command is available/);
});

test('the system prompt tells the model whether accounts exist', () => {
  assert.match(systemPrompt({ hasConnections: true }), /list_connections/);
  assert.match(systemPrompt({ hasConnections: false }), /No accounts are connected/);
  assert.match(systemPrompt({}), /data, not instruction/, 'must warn about injected web content');
});

test('shell commands run inside the workspace and report failure', async () => {
  const { tools, workspace } = await harness({ allowCommands: true });
  const run = tools.find((t) => t.name === 'run_command');
  const out = await run.run({ command: 'pwd && echo hello' });
  assert.match(out, /hello/);
  assert.match(out, new RegExp(path.basename(workspace.root)));
  assert.match(await run.run({ command: 'exit 3' }), /Exit code 3/);
});

test('a tool error is handed back to the model, not thrown', async () => {
  const { tools } = await harness();
  const events = [];
  let turn = 0;
  const chat = async () => (turn++ === 0
    ? { content: '', toolCalls: [{ id: 'c1', name: 'read_file', args: { path: 'missing.txt' } }] }
    : { content: 'That file was not there, so I made one.', toolCalls: [] });

  await runAgent({ chat, config: {}, messages: [], tools, emit: (e) => events.push(e), maxSteps: 5 });
  const failure = events.find((e) => e.type === 'tool_end' && !e.ok);
  assert.ok(failure, 'the failure should be reported');
  assert.match(failure.preview, /does not exist/);
  assert.ok(events.some((e) => e.type === 'assistant'), 'the run continues past the error');
});

test('an unknown tool name lists the real ones', async () => {
  const { tools } = await harness();
  const events = [];
  let turn = 0;
  const chat = async () => (turn++ === 0
    ? { content: '', toolCalls: [{ id: 'c1', name: 'make_coffee', args: {} }] }
    : { content: 'used a real tool', toolCalls: [] });

  await runAgent({ chat, config: {}, messages: [], tools, emit: (e) => events.push(e), maxSteps: 5 });
  const failure = events.find((e) => e.type === 'tool_end' && e.name === 'make_coffee');
  assert.equal(failure.ok, false);
  assert.match(failure.preview, /no tool called "make_coffee"/);
  assert.match(failure.preview, /list_files/);
});

test('the loop stops at the step limit and still answers', async () => {
  const { tools } = await harness();
  const events = [];
  let calls = 0;
  const chat = async ({ tools: offered }) => {
    calls++;
    return offered.length
      ? { content: '', toolCalls: [{ id: `c${calls}`, name: 'list_files', args: {} }] }
      : { content: 'Out of steps, here is where I got to.', toolCalls: [] };
  };

  const result = await runAgent({ chat, config: {}, messages: [], tools, emit: (e) => events.push(e), maxSteps: 5 });
  assert.equal(result.hitLimit, true);
  assert.equal(calls, 6, 'five tool steps, then one wrap-up call with no tools offered');
  assert.ok(events.some((e) => e.type === 'assistant' && /Out of steps/.test(e.text)));
});

test('mutating tools are flagged so the UI knows to refresh', async () => {
  const { tools } = await harness();
  const events = [];
  let turn = 0;
  const chat = async () => (turn++ === 0
    ? { content: '', toolCalls: [{ id: 'w', name: 'write_file', args: { path: 'a.txt', content: 'hi' } }] }
    : { content: 'done', toolCalls: [] });

  await runAgent({ chat, config: {}, messages: [], tools, emit: (e) => events.push(e), maxSteps: 4 });
  const write = events.find((e) => e.type === 'tool_end' && e.name === 'write_file');
  assert.equal(write.mutates, true);
  assert.equal(write.ok, true);
});

test('an aborted run stops without calling the model', async () => {
  const { tools } = await harness();
  const controller = new AbortController();
  controller.abort();
  let called = false;
  const result = await runAgent({
    chat: async () => { called = true; return { content: 'x', toolCalls: [] }; },
    config: {}, messages: [], tools, emit: () => {}, maxSteps: 4, signal: controller.signal,
  });
  assert.equal(result.stopped, true);
  assert.equal(called, false);
});

test('history carries tool calls and results in order', async () => {
  const { tools } = await harness();
  let turn = 0;
  const chat = async () => (turn++ === 0
    ? { content: 'checking', toolCalls: [{ id: 'c1', name: 'list_files', args: {} }] }
    : { content: 'all done', toolCalls: [] });

  const { history } = await runAgent({ chat, config: {}, messages: [{ role: 'user', content: 'go' }], tools, emit: () => {}, maxSteps: 4 });
  assert.deepEqual(history.map((m) => m.role), ['user', 'assistant', 'tool', 'assistant']);
  assert.equal(history[1].toolCalls[0].id, 'c1');
  assert.equal(history[2].toolCallId, 'c1');
});
