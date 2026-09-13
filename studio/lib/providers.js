// Model providers, normalised behind one chat() call.
//
// Two wire formats cover everything: the OpenAI chat-completions shape (which
// Groq, OpenRouter, Google, Together, LM Studio and llama.cpp all speak) and
// Anthropic's messages shape. Ollama gets its own adapter because its native
// endpoint handles local tool-calling more reliably than its compat layer.
//
// Internally a message is { role, content, toolCalls?, toolCallId?, name? } and
// a tool call is { id, name, args }. Adapters translate at the edges only.

export const PRESETS = {
  ollama: {
    label: 'Ollama (local)', kind: 'ollama', free: true, needsKey: false,
    baseUrl: 'http://127.0.0.1:11434',
    models: ['qwen2.5-coder:7b', 'qwen2.5-coder:14b', 'llama3.1:8b', 'mistral-nemo', 'deepseek-r1:8b'],
    help: 'Free and fully offline. Install from ollama.com, then: ollama pull qwen2.5-coder:7b',
  },
  groq: {
    label: 'Groq', kind: 'openai', free: true, needsKey: true,
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen-2.5-coder-32b'],
    help: 'Free tier with generous rate limits. Key: console.groq.com/keys',
  },
  google: {
    label: 'Google AI Studio', kind: 'openai', free: true, needsKey: true,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    help: 'Free tier, no card required. Key: aistudio.google.com/apikey',
  },
  openrouter: {
    label: 'OpenRouter', kind: 'openai', free: true, needsKey: true,
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['deepseek/deepseek-chat-v3-0324:free', 'qwen/qwen-2.5-coder-32b-instruct:free', 'meta-llama/llama-3.3-70b-instruct:free'],
    help: 'Models ending in :free cost nothing. Key: openrouter.ai/keys',
  },
  cerebras: {
    label: 'Cerebras', kind: 'openai', free: true, needsKey: true,
    baseUrl: 'https://api.cerebras.ai/v1',
    models: ['llama-3.3-70b', 'qwen-3-coder-480b'],
    help: 'Free tier, very fast. Key: cloud.cerebras.ai',
  },
  anthropic: {
    label: 'Anthropic', kind: 'anthropic', free: false, needsKey: true,
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001'],
    help: 'Paid. Key: console.anthropic.com',
  },
  openai: {
    label: 'OpenAI', kind: 'openai', free: false, needsKey: true,
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini'],
    help: 'Paid. Key: platform.openai.com/api-keys',
  },
  lmstudio: {
    label: 'LM Studio (local)', kind: 'openai', free: true, needsKey: false,
    baseUrl: 'http://127.0.0.1:1234/v1',
    models: ['local-model'],
    help: 'Free and offline. Start the local server from LM Studio, then pick any loaded model.',
  },
  custom: {
    label: 'Custom endpoint', kind: 'openai', free: false, needsKey: false,
    baseUrl: '', models: [],
    help: 'Any OpenAI-compatible /chat/completions endpoint.',
  },
};

class ProviderError extends Error {
  constructor(message, { status, provider } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.provider = provider;
  }
}

async function postJson(url, { headers, body, signal, provider }) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    const hint = /127\.0\.0\.1|localhost/.test(url)
      ? ' Is the local server running?'
      : ' Check the base URL and your network connection.';
    throw new ProviderError(`could not reach ${url}: ${err.message}.${hint}`, { provider });
  }

  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const detail = parsed?.error?.message || parsed?.error || parsed?.message || text.slice(0, 400);
    const extra = res.status === 401 || res.status === 403
      ? ' — check the API key in Settings.'
      : res.status === 429 ? ' — rate limited; wait a moment or switch provider.' : '';
    throw new ProviderError(`${provider} returned HTTP ${res.status}: ${detail}${extra}`, { status: res.status, provider });
  }
  if (!parsed) throw new ProviderError(`${provider} returned a response that was not JSON: ${text.slice(0, 200)}`, { provider });
  return parsed;
}

/* ---------- OpenAI-compatible ---------- */

function toOpenAiMessages(messages) {
  return messages.map((msg) => {
    if (msg.role === 'tool') {
      return { role: 'tool', tool_call_id: msg.toolCallId, content: msg.content };
    }
    if (msg.role === 'assistant' && msg.toolCalls?.length) {
      return {
        role: 'assistant',
        content: msg.content || null,
        tool_calls: msg.toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: JSON.stringify(call.args ?? {}) },
        })),
      };
    }
    return { role: msg.role, content: msg.content ?? '' };
  });
}

function parseArgs(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return { _raw: String(raw) }; // let the tool report a useful error instead of crashing the loop
  }
}

async function chatOpenAi({ baseUrl, apiKey, model, messages, tools, temperature, signal, provider }) {
  const headers = {};
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  if (/openrouter\.ai/.test(baseUrl)) {
    headers['http-referer'] = 'http://localhost';
    headers['x-title'] = 'Voice Studio';
  }
  const body = { model, messages: toOpenAiMessages(messages), temperature, stream: false };
  if (tools?.length) {
    body.tools = tools.map((tool) => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } }));
    body.tool_choice = 'auto';
  }

  const data = await postJson(`${baseUrl.replace(/\/$/, '')}/chat/completions`, { headers, body, signal, provider });
  const choice = data.choices?.[0];
  if (!choice) throw new ProviderError(`${provider} returned no choices`, { provider });

  return {
    content: choice.message?.content || '',
    toolCalls: (choice.message?.tool_calls || []).map((call, i) => ({
      id: call.id || `call_${i}`,
      name: call.function?.name,
      args: parseArgs(call.function?.arguments),
    })),
    usage: data.usage || null,
    finishReason: choice.finish_reason,
  };
}

/* ---------- Anthropic ---------- */

async function chatAnthropic({ baseUrl, apiKey, model, messages, tools, temperature, maxTokens, signal, provider }) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const converted = [];
  for (const msg of messages) {
    if (msg.role === 'system') continue;
    if (msg.role === 'tool') {
      // Anthropic carries tool results as user-turn content blocks.
      const block = { type: 'tool_result', tool_use_id: msg.toolCallId, content: msg.content };
      const last = converted[converted.length - 1];
      if (last?.role === 'user' && Array.isArray(last.content)) last.content.push(block);
      else converted.push({ role: 'user', content: [block] });
      continue;
    }
    if (msg.role === 'assistant' && msg.toolCalls?.length) {
      const content = [];
      if (msg.content) content.push({ type: 'text', text: msg.content });
      for (const call of msg.toolCalls) {
        content.push({ type: 'tool_use', id: call.id, name: call.name, input: call.args ?? {} });
      }
      converted.push({ role: 'assistant', content });
      continue;
    }
    converted.push({ role: msg.role, content: msg.content ?? '' });
  }

  const body = { model, max_tokens: maxTokens || 8192, temperature, messages: converted };
  if (system) body.system = system;
  if (tools?.length) {
    body.tools = tools.map((tool) => ({ name: tool.name, description: tool.description, input_schema: tool.parameters }));
  }

  const data = await postJson(`${baseUrl.replace(/\/$/, '')}/v1/messages`, {
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body, signal, provider,
  });

  const textParts = [];
  const toolCalls = [];
  for (const block of data.content || []) {
    if (block.type === 'text') textParts.push(block.text);
    if (block.type === 'tool_use') toolCalls.push({ id: block.id, name: block.name, args: block.input || {} });
  }
  return { content: textParts.join('\n'), toolCalls, usage: data.usage || null, finishReason: data.stop_reason };
}

/* ---------- Ollama ---------- */

async function chatOllama({ baseUrl, model, messages, tools, temperature, signal, provider }) {
  const converted = messages.map((msg) => {
    if (msg.role === 'tool') return { role: 'tool', content: msg.content };
    if (msg.role === 'assistant' && msg.toolCalls?.length) {
      return {
        role: 'assistant',
        content: msg.content || '',
        tool_calls: msg.toolCalls.map((call) => ({ function: { name: call.name, arguments: call.args ?? {} } })),
      };
    }
    return { role: msg.role, content: msg.content ?? '' };
  });

  const body = { model, messages: converted, stream: false, options: { temperature } };
  if (tools?.length) {
    body.tools = tools.map((tool) => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } }));
  }

  const data = await postJson(`${baseUrl.replace(/\/$/, '')}/api/chat`, { body, signal, provider });
  return {
    content: data.message?.content || '',
    // Ollama omits call ids, so we synthesise stable ones for the tool-result pairing.
    toolCalls: (data.message?.tool_calls || []).map((call, i) => ({
      id: `call_${Date.now()}_${i}`,
      name: call.function?.name,
      args: parseArgs(call.function?.arguments),
    })),
    usage: data.eval_count ? { output_tokens: data.eval_count, input_tokens: data.prompt_eval_count } : null,
    finishReason: data.done_reason,
  };
}

export async function chat(options) {
  const preset = PRESETS[options.provider] || PRESETS.custom;
  const kind = options.kind || preset.kind;
  const baseUrl = options.baseUrl || preset.baseUrl;
  if (!baseUrl) throw new ProviderError('no base URL configured for this provider', { provider: options.provider });
  if (!options.model) throw new ProviderError('no model selected — pick one in Settings', { provider: options.provider });
  if (preset.needsKey && !options.apiKey) {
    throw new ProviderError(`${preset.label} needs an API key. Add one in Settings — ${preset.help}`, { provider: options.provider });
  }

  const args = { ...options, baseUrl, provider: preset.label || options.provider, temperature: options.temperature ?? 0.3 };
  if (kind === 'anthropic') return chatAnthropic(args);
  if (kind === 'ollama') return chatOllama(args);
  return chatOpenAi(args);
}

/** Ask a provider which models it actually has. Best-effort — never fatal. */
export async function listModels({ provider, baseUrl, apiKey }) {
  const preset = PRESETS[provider] || PRESETS.custom;
  const base = (baseUrl || preset.baseUrl || '').replace(/\/$/, '');
  if (!base) return [];
  try {
    if (preset.kind === 'ollama') {
      const res = await fetch(`${base}/api/tags`);
      const data = await res.json();
      return (data.models || []).map((m) => m.name);
    }
    if (preset.kind === 'anthropic') return preset.models;
    const res = await fetch(`${base}/models`, { headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {} });
    if (!res.ok) return preset.models;
    const data = await res.json();
    return (data.data || []).map((m) => m.id).sort();
  } catch {
    return preset.models;
  }
}
