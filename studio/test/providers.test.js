import test from 'node:test';
import assert from 'node:assert/strict';
import { chat, PRESETS } from '../lib/providers.js';

// One internal conversation, translated onto each provider's wire format.
const MESSAGES = [
  { role: 'system', content: 'SYSTEM' },
  { role: 'user', content: 'build it' },
  { role: 'assistant', content: 'looking', toolCalls: [{ id: 'call_1', name: 'read_file', args: { path: 'a.js' } }] },
  { role: 'tool', toolCallId: 'call_1', name: 'read_file', content: 'file body' },
];
const TOOLS = [{ name: 'read_file', description: 'read', parameters: { type: 'object', properties: { path: { type: 'string' } } } }];

function mock(payload) {
  const seen = {};
  globalThis.fetch = async (url, init) => {
    Object.assign(seen, { url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return seen;
}

test('every preset declares what a caller needs to know', () => {
  for (const [id, preset] of Object.entries(PRESETS)) {
    assert.ok(preset.label, `${id} needs a label`);
    assert.equal(typeof preset.needsKey, 'boolean', `${id} needs needsKey`);
    assert.ok(['openai', 'anthropic', 'ollama'].includes(preset.kind), `${id} has an unknown kind`);
  }
  const free = Object.values(PRESETS).filter((p) => p.free);
  assert.ok(free.length >= 4, 'there should be several free options');
});

test('openai-compatible: system stays inline and tool results keep their id', async () => {
  const seen = mock({ choices: [{ message: { content: 'done', tool_calls: [{ id: 'x1', type: 'function', function: { name: 'read_file', arguments: '{"path":"b.js"}' } }] }, finish_reason: 'tool_calls' }] });
  const out = await chat({ provider: 'groq', apiKey: 'k', model: 'm', messages: MESSAGES, tools: TOOLS });

  assert.match(seen.url, /\/chat\/completions$/);
  assert.equal(seen.headers.authorization, 'Bearer k');
  assert.equal(seen.body.messages[0].role, 'system');
  assert.equal(seen.body.messages[2].tool_calls[0].function.name, 'read_file');
  assert.equal(typeof seen.body.messages[2].tool_calls[0].function.arguments, 'string', 'arguments must be a JSON string');
  assert.equal(seen.body.messages[3].tool_call_id, 'call_1');
  assert.equal(seen.body.tools[0].function.name, 'read_file');
  assert.equal(out.toolCalls[0].args.path, 'b.js');
});

test('anthropic: system is hoisted and tool results become user blocks', async () => {
  const seen = mock({ content: [{ type: 'text', text: 'done' }, { type: 'tool_use', id: 'x1', name: 'read_file', input: { path: 'b.js' } }], stop_reason: 'tool_use' });
  const out = await chat({ provider: 'anthropic', apiKey: 'k', model: 'm', messages: MESSAGES, tools: TOOLS });

  assert.match(seen.url, /\/v1\/messages$/);
  assert.equal(seen.headers['x-api-key'], 'k');
  assert.equal(seen.headers['anthropic-version'], '2023-06-01');
  assert.equal(seen.body.system, 'SYSTEM');
  assert.ok(!seen.body.messages.some((m) => m.role === 'system'), 'system must not remain a message');
  assert.ok(seen.body.messages[1].content.some((b) => b.type === 'tool_use' && b.id === 'call_1'));
  assert.equal(seen.body.messages[2].role, 'user');
  assert.equal(seen.body.messages[2].content[0].tool_use_id, 'call_1');
  assert.equal(seen.body.tools[0].input_schema.type, 'object');
  assert.equal(typeof seen.body.max_tokens, 'number');
  assert.equal(out.content, 'done');
  assert.equal(out.toolCalls[0].args.path, 'b.js');
});

test('anthropic: consecutive tool results merge into one user turn', async () => {
  const seen = mock({ content: [{ type: 'text', text: 'ok' }] });
  await chat({
    provider: 'anthropic', apiKey: 'k', model: 'm', tools: TOOLS,
    messages: [
      { role: 'user', content: 'go' },
      { role: 'assistant', content: '', toolCalls: [{ id: 'a', name: 'read_file', args: {} }, { id: 'b', name: 'read_file', args: {} }] },
      { role: 'tool', toolCallId: 'a', content: 'one' },
      { role: 'tool', toolCallId: 'b', content: 'two' },
    ],
  });
  const results = seen.body.messages.filter((m) => m.role === 'user' && Array.isArray(m.content));
  assert.equal(results.length, 1, 'both results belong to a single user turn');
  assert.equal(results[0].content.length, 2);
});

test('ollama: object arguments survive the round trip and ids are synthesised', async () => {
  const seen = mock({ message: { content: 'done', tool_calls: [{ function: { name: 'read_file', arguments: { path: 'b.js' } } }] }, done_reason: 'stop' });
  const out = await chat({ provider: 'ollama', model: 'm', messages: MESSAGES, tools: TOOLS });

  assert.match(seen.url, /\/api\/chat$/);
  assert.equal(seen.body.stream, false);
  assert.equal(typeof seen.body.messages[2].tool_calls[0].function.arguments, 'object');
  assert.ok(out.toolCalls[0].id, 'a call id is needed to pair the result back');
  assert.equal(out.toolCalls[0].args.path, 'b.js');
});

test('malformed tool arguments do not crash the caller', async () => {
  mock({ choices: [{ message: { tool_calls: [{ id: 'x', function: { name: 'read_file', arguments: '{not json' } }] } }] });
  const out = await chat({ provider: 'groq', apiKey: 'k', model: 'm', messages: MESSAGES, tools: TOOLS });
  assert.equal(out.toolCalls[0].name, 'read_file');
  assert.ok('_raw' in out.toolCalls[0].args, 'the raw text is handed on so the tool can report a useful error');
});

test('configuration mistakes are explained, not stack-traced', async () => {
  await assert.rejects(() => chat({ provider: 'groq', model: 'm', messages: [] }), /needs an API key/);
  await assert.rejects(() => chat({ provider: 'groq', apiKey: 'k', messages: [] }), /no model selected/);

  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'bad key' } }), { status: 401 });
  await assert.rejects(() => chat({ provider: 'groq', apiKey: 'k', model: 'm', messages: [] }), /401.*Settings/s);

  globalThis.fetch = async () => new Response('rate limited', { status: 429 });
  await assert.rejects(() => chat({ provider: 'groq', apiKey: 'k', model: 'm', messages: [] }), /rate limited/);

  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(() => chat({ provider: 'ollama', model: 'm', messages: [] }), /local server running/);
});
