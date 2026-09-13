// Voice Studio front end: wires the mic, the chat stream, the file pane and the
// settings/accounts sheets to the local server.

import { VoiceListener, Speaker, isSupported as voiceSupported } from './voice.js';

const $ = (id) => document.getElementById(id);
const el = {
  statusDot: $('statusDot'), micButton: $('micButton'), micLabel: $('micLabel'),
  modelBadge: $('modelBadge'), heard: $('heard'), heardText: $('heardText'),
  messages: $('messages'), composer: $('composer'), input: $('input'),
  sendButton: $('sendButton'), stopButton: $('stopButton'), setupHint: $('setupHint'),
  fileTree: $('fileTree'), editor: $('editor'), openFileName: $('openFileName'),
  saveFile: $('saveFile'), workspacePath: $('workspacePath'), preview: $('preview'),
  settings: $('settingsDialog'), accounts: $('accountsDialog'),
  connectionList: $('connectionList'), serviceSelect: $('serviceSelect'), serviceHelp: $('serviceHelp'),
};

const state = {
  config: null,
  presets: {},
  services: {},
  connections: [],
  history: [],        // the conversation, in the shape the server wants it back
  running: false,
  abort: null,
  openFile: null,
  dirty: false,
};

const voice = new VoiceListener();
const speaker = new Speaker();

/* ---------- tiny markdown renderer ---------- */

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Fenced code is pulled out first and restored last, so the inline rules below
// cannot mangle it. Everything is HTML-escaped before any tag is introduced.
const CODE_SLOT = '%%CODE';

function renderMarkdown(text) {
  const blocks = [];
  let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    blocks.push(`<pre><code class="lang-${escapeHtml(lang)}">${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`);
    return `\n\n${CODE_SLOT}${blocks.length - 1}\n\n`;
  });

  html = escapeHtml(html)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  html = html
    .split(/\n{2,}/)
    .map((para) => {
      const trimmed = para.trim();
      if (trimmed.startsWith(CODE_SLOT)) return trimmed;
      const lines = para.split('\n').filter((line) => line.trim() !== '');
      if (!lines.length) return '';
      if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${line.replace(/^\s*[-*]\s+/, '')}</li>`).join('')}</ul>`;
      }
      if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
        return `<ol>${lines.map((line) => `<li>${line.replace(/^\s*\d+\.\s+/, '')}</li>`).join('')}</ol>`;
      }
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');

  return html.replace(new RegExp(`${CODE_SLOT}(\\d+)`, 'g'), (_, index) => blocks[Number(index)] || '');
}

/* ---------- chat rendering ---------- */

function clearWelcome() {
  el.messages.querySelector('.welcome')?.remove();
}

function addMessage(role, text, { spoken = false, error = false } = {}) {
  clearWelcome();
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}${spoken ? ' voice' : ''}${error ? ' error' : ''}`;
  const who = document.createElement('div');
  who.className = 'who';
  who.textContent = error ? 'error' : role === 'user' ? 'you' : 'studio';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (role === 'user' || error) bubble.textContent = text;
  else bubble.innerHTML = renderMarkdown(text);
  wrap.append(who, bubble);
  el.messages.append(wrap);
  scrollDown();
  return wrap;
}

const TOOL_VERB = {
  list_files: 'listing files', read_file: 'reading', write_file: 'writing', edit_file: 'editing',
  delete_file: 'deleting', search_files: 'searching files', web_search: 'searching the web',
  browse_url: 'reading', connection_call: 'calling', list_connections: 'checking accounts',
  run_command: 'running',
};

function toolSummary(name, args = {}) {
  const verb = TOOL_VERB[name] || name;
  const target = args.path || args.url || args.query || args.command
    || (args.connection ? `${args.connection} ${args.method || 'GET'} ${args.path || ''}`.trim() : '')
    || args.dir || '';
  return target ? `${verb} ${target}` : verb;
}

function addToolRow(id, name, args) {
  clearWelcome();
  const row = document.createElement('div');
  row.className = 'tool running';
  row.dataset.toolId = id;
  const label = document.createElement('span');
  label.className = 'name';
  label.textContent = name;
  const detail = document.createElement('span');
  detail.className = 'detail';
  detail.textContent = toolSummary(name, args);
  row.append(label, detail);
  el.messages.append(row);
  scrollDown();
}

function finishToolRow({ id, name, ok, preview }) {
  const row = el.messages.querySelector(`[data-tool-id="${CSS.escape(String(id))}"]`);
  if (!row) return;
  row.classList.remove('running');
  row.classList.add(ok ? 'done' : 'failed');
  const detail = row.querySelector('.detail');
  if (!preview || !detail) return;

  const summaryText = detail.textContent;
  detail.remove();
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = ok ? summaryText : `${summaryText} — failed`;
  const pre = document.createElement('pre');
  pre.textContent = preview;
  details.append(summary, pre);
  row.append(details);
  scrollDown();
}

function scrollDown() {
  el.messages.scrollTop = el.messages.scrollHeight;
}

/* ---------- talking to the server ---------- */

async function api(path, options = {}) {
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed with HTTP ${res.status}`);
  return data;
}

async function send(text, { spoken = false } = {}) {
  const message = (text || '').trim();
  if (!message || state.running) return;

  addMessage('user', message, { spoken });
  state.history.push({ role: 'user', content: message });
  el.input.value = '';
  autoGrow();
  setRunning(true);

  const controller = new AbortController();
  state.abort = controller;
  let spoke = false;
  let touchedFiles = false;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: state.history }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`the server rejected the request (HTTP ${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Server-sent events are separated by a blank line.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';
      for (const frame of frames) {
        const line = frame.split('\n').find((candidate) => candidate.startsWith('data: '));
        if (!line) continue;
        let event;
        try {
          event = JSON.parse(line.slice(6));
        } catch {
          continue;
        }

        if (event.type === 'assistant' && event.text) {
          addMessage('assistant', event.text);
          state.history.push({ role: 'assistant', content: event.text });
          if (!spoke) {
            spoke = true;
            speakReply(event.text);
          }
        } else if (event.type === 'tool_start') {
          addToolRow(event.id, event.name, event.args);
        } else if (event.type === 'tool_end') {
          finishToolRow(event);
          if (event.mutates) touchedFiles = true;
        } else if (event.type === 'error') {
          addMessage('assistant', event.message, { error: true });
        } else if (event.type === 'done' && event.hitLimit) {
          addMessage('assistant', 'Stopped at the tool-step limit for this turn. Say "keep going" to continue.', { error: true });
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') addMessage('assistant', err.message, { error: true });
  } finally {
    setRunning(false);
    state.abort = null;
    if (touchedFiles) {
      await refreshFiles();
      reloadPreview();
    }
  }
}

// The whole conversation is replayed on each turn, so cap it before the context
// (and the bill, on paid providers) grows without bound.
function trimHistory() {
  const MAX = 60;
  if (state.history.length > MAX) state.history = state.history.slice(-MAX);
}

function setRunning(running) {
  state.running = running;
  trimHistory();
  el.sendButton.hidden = running;
  el.stopButton.hidden = !running;
  updateStatusDot();
}

function speakReply(text) {
  if (!speaker.enabled) return;
  voice.pause();
  speaker.speak(text, { onEnd: () => voice.resume() });
}

/* ---------- status ---------- */

function updateStatusDot() {
  const dot = el.statusDot;
  dot.className = 'dot';
  if (state.running) dot.classList.add('busy');
  else if (voice.enabled) dot.classList.add('live');
  else if (state.config?.model) dot.classList.add('ok');
}

function updateBadge() {
  const config = state.config;
  if (!config) return;
  const preset = state.presets[config.provider];
  el.modelBadge.textContent = config.model
    ? `${preset?.label || config.provider} · ${config.model}`
    : 'no model — open Settings';

  const problems = [];
  if (!config.model) problems.push('choose a model');
  if (preset?.needsKey && !config.hasApiKey) problems.push(`add a ${preset.label} API key`);
  if (el.setupHint) {
    el.setupHint.hidden = problems.length === 0;
    el.setupHint.textContent = problems.length
      ? `Before you start: ${problems.join(' and ')} in Settings. ${preset?.help || ''}`
      : '';
  }
}

/* ---------- voice wiring ---------- */

function idlePrompt() {
  return voice.options.requireWakeWord && voice.options.wakeWord
    ? `waiting for "${voice.options.wakeWord}"…`
    : 'go ahead…';
}

function setupVoice() {
  if (!voiceSupported) {
    el.micButton.disabled = true;
    el.micLabel.textContent = 'Voice not supported';
    el.micButton.title = 'This browser has no Web Speech API. Chrome, Edge and Safari have it; Firefox does not.';
    return;
  }

  el.micButton.addEventListener('click', () => voice.toggle());

  voice.addEventListener('state', (event) => {
    const listening = event.detail.listening;
    el.micButton.setAttribute('aria-pressed', String(listening));
    el.micLabel.textContent = listening ? 'Listening' : 'Start listening';
    el.heard.hidden = !listening;
    el.heardText.textContent = listening ? idlePrompt() : '';
    updateStatusDot();
  });

  voice.addEventListener('partial', (event) => {
    el.heardText.textContent = event.detail.text;
  });

  voice.addEventListener('ignored', (event) => {
    el.heardText.textContent = `ignored, no wake word: ${event.detail.text}`;
  });

  voice.addEventListener('utterance', (event) => {
    const { text, autoSend } = event.detail;
    el.heardText.textContent = idlePrompt();

    if (handleSpokenCommand(text)) return;
    if (autoSend && !state.running) {
      send(text, { spoken: true });
    } else {
      // Mid-run or auto-send off: park it in the composer rather than drop it.
      el.input.value = el.input.value ? `${el.input.value} ${text}` : text;
      autoGrow();
    }
  });

  voice.addEventListener('error', (event) => {
    addMessage('assistant', event.detail.message, { error: true });
    if (event.detail.fatal) {
      el.micButton.setAttribute('aria-pressed', 'false');
      el.micLabel.textContent = 'Start listening';
      el.heard.hidden = true;
      updateStatusDot();
    }
  });
}

/** Phrases the app acts on itself instead of sending to the model. */
function handleSpokenCommand(text) {
  const phrase = text.toLowerCase().replace(/[.!?,]/g, '').trim();

  if (['stop listening', 'stop the mic', 'mute', 'mute yourself'].includes(phrase)) {
    voice.stop();
    return true;
  }
  if (['be quiet', 'stop talking', 'quiet'].includes(phrase)) {
    speaker.cancel();
    return true;
  }
  if (['stop', 'cancel', 'stop that', 'never mind', 'nevermind'].includes(phrase)) {
    speaker.cancel();
    state.abort?.abort();
    return true;
  }
  if (['clear the chat', 'clear chat', 'start over', 'new chat'].includes(phrase)) {
    state.history = [];
    el.messages.innerHTML = '';
    addMessage('assistant', 'Cleared. What next?');
    return true;
  }
  return false;
}

/* ---------- files ---------- */

async function refreshFiles() {
  try {
    const { files, root } = await api('/api/files');
    el.workspacePath.textContent = root;
    el.fileTree.innerHTML = '';
    if (!files.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Empty. Ask for something to be built.';
      el.fileTree.append(li);
      return;
    }
    for (const file of files) {
      const li = document.createElement('li');
      const depth = file.path.split('/').length - 1;
      li.style.paddingLeft = `${8 + depth * 12}px`;
      li.textContent = file.type === 'dir' ? `${file.path.split('/').pop()}/` : file.path.split('/').pop();
      li.title = file.path;
      if (file.type === 'dir') {
        li.className = 'dir';
      } else {
        li.addEventListener('click', () => openFile(file.path));
        if (file.path === state.openFile) li.classList.add('active');
      }
      el.fileTree.append(li);
    }
  } catch (err) {
    el.fileTree.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = err.message;
    el.fileTree.append(li);
  }
}

async function openFile(path) {
  if (state.dirty && !confirm('Discard unsaved changes to the open file?')) return;
  try {
    const { content } = await api(`/api/file?path=${encodeURIComponent(path)}`);
    state.openFile = path;
    state.dirty = false;
    el.editor.value = content;
    el.openFileName.textContent = path;
    el.saveFile.hidden = true;
    [...el.fileTree.children].forEach((li) => li.classList.toggle('active', li.title === path));
  } catch (err) {
    el.openFileName.textContent = `${path} — ${err.message}`;
  }
}

async function saveOpenFile() {
  if (!state.openFile) return;
  try {
    await api('/api/file', { method: 'PUT', body: { path: state.openFile, content: el.editor.value } });
    state.dirty = false;
    el.saveFile.hidden = true;
    reloadPreview();
  } catch (err) {
    el.openFileName.textContent = `${state.openFile} — ${err.message}`;
  }
}

function reloadPreview() {
  // Cache-bust so the iframe shows what was just written.
  el.preview.src = `/preview/?t=${Date.now()}`;
}

/* ---------- settings ---------- */

function fillSettings() {
  const config = state.config;
  if (!config) return;
  const providerSelect = $('providerSelect');
  providerSelect.innerHTML = '';
  for (const [id, preset] of Object.entries(state.presets)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = preset.free ? `${preset.label} — free` : preset.label;
    providerSelect.append(option);
  }
  providerSelect.value = config.provider;

  $('modelInput').value = config.model || '';
  $('baseUrlInput').value = config.baseUrl || '';
  $('apiKeyInput').value = '';
  $('autoSend').checked = config.voice.autoSend;
  $('silenceMs').value = config.voice.silenceMs;
  $('silenceOut').value = `${(config.voice.silenceMs / 1000).toFixed(1)}s`;
  $('speakReplies').checked = config.voice.speakReplies;
  $('requireWakeWord').checked = config.voice.requireWakeWord;
  $('wakeWord').value = config.voice.wakeWord || '';
  $('voiceLang').value = config.voice.language || 'en-US';
  $('maxSteps').value = config.maxSteps;
  $('stepsOut').value = config.maxSteps;
  $('shellState').textContent = config.allowCommands
    ? 'Shell commands are enabled: the AI can run builds, installs and tests inside the workspace.'
    : 'Shell commands are off. Restart the server with --allow-commands to let the AI run builds and tests.';
  syncProviderHelp();
}

function syncProviderHelp() {
  const providerId = $('providerSelect').value;
  const preset = state.presets[providerId];
  $('providerHelp').textContent = preset?.help || '';
  $('keyRow').hidden = !preset?.needsKey;
  $('keyState').textContent = state.config.hasApiKey && providerId === state.config.provider
    ? 'A key is already saved. Leave this blank to keep it.'
    : preset?.needsKey ? 'Required for this provider.' : '';

  const list = $('modelList');
  list.innerHTML = '';
  for (const model of preset?.models || []) {
    const option = document.createElement('option');
    option.value = model;
    list.append(option);
  }
}

async function saveSettings() {
  const body = {
    provider: $('providerSelect').value,
    model: $('modelInput').value.trim(),
    baseUrl: $('baseUrlInput').value.trim(),
    maxSteps: Number($('maxSteps').value),
    voice: {
      autoSend: $('autoSend').checked,
      silenceMs: Number($('silenceMs').value),
      speakReplies: $('speakReplies').checked,
      requireWakeWord: $('requireWakeWord').checked,
      wakeWord: $('wakeWord').value.trim(),
      language: $('voiceLang').value.trim() || 'en-US',
    },
  };
  const key = $('apiKeyInput').value.trim();
  if (key) body.apiKey = key;

  const saved = $('settingsSaved');
  try {
    const { config } = await api('/api/config', { method: 'POST', body });
    state.config = config;
    $('apiKeyInput').value = '';
    applyVoiceConfig();
    updateBadge();
    updateStatusDot();
    saved.classList.remove('error');
    saved.textContent = 'Saved';
  } catch (err) {
    saved.classList.add('error');
    saved.textContent = err.message;
  }
  saved.hidden = false;
  setTimeout(() => { saved.hidden = true; }, 2400);
}

function applyVoiceConfig() {
  voice.configure(state.config.voice);
  speaker.enabled = state.config.voice.speakReplies && speaker.available;
}

/* ---------- accounts ---------- */

function fillAccounts() {
  const select = el.serviceSelect;
  if (!select.children.length) {
    for (const [id, service] of Object.entries(state.services)) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = service.label;
      select.append(option);
    }
    select.addEventListener('change', syncServiceFields);
  }
  syncServiceFields();
  renderConnections();
}

function syncServiceFields() {
  const service = state.services[el.serviceSelect.value] || {};
  el.serviceHelp.textContent = service.tokenHelp || '';
  $('baseRow').hidden = !service.needsBaseUrl;
  $('usernameRow').hidden = !service.basic;
}

function renderConnections() {
  el.connectionList.innerHTML = '';
  if (!state.connections.length) {
    const li = document.createElement('li');
    li.className = 'none';
    li.textContent = 'No accounts connected yet.';
    el.connectionList.append(li);
    return;
  }

  for (const conn of state.connections) {
    const li = document.createElement('li');

    const meta = document.createElement('div');
    meta.className = 'meta';
    const name = document.createElement('b');
    name.textContent = `${conn.label} · ${conn.id}`;
    const base = document.createElement('small');
    base.textContent = conn.baseUrl;
    meta.append(name, base);

    const mode = document.createElement('span');
    mode.className = `mode${conn.allowWrites ? ' rw' : ''}`;
    mode.textContent = conn.allowWrites ? 'read + write' : 'read-only';

    const remove = document.createElement('button');
    remove.className = 'ghost small';
    remove.textContent = 'Disconnect';
    remove.addEventListener('click', async () => {
      if (!confirm(`Disconnect ${conn.label}? The stored token is deleted.`)) return;
      const data = await api(`/api/connections/${encodeURIComponent(conn.id)}`, { method: 'DELETE' });
      state.connections = data.connections;
      renderConnections();
    });

    li.append(meta, mode, remove);
    el.connectionList.append(li);
  }
}

async function addConnection() {
  const error = $('connError');
  error.hidden = true;
  try {
    const data = await api('/api/connections', {
      method: 'POST',
      body: {
        service: el.serviceSelect.value,
        token: $('connToken').value.trim(),
        username: $('connUsername').value.trim(),
        baseUrl: $('connBaseUrl').value.trim(),
        label: $('connLabel').value.trim(),
        allowWrites: $('connWrites').checked,
      },
    });
    state.connections = data.connections;
    renderConnections();
    $('connToken').value = '';
    $('connLabel').value = '';
    $('connUsername').value = '';
    $('connWrites').checked = false;
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  }
}

/* ---------- composer ---------- */

function autoGrow() {
  el.input.style.height = 'auto';
  el.input.style.height = `${Math.min(el.input.scrollHeight, 180)}px`;
}

/* ---------- boot ---------- */

function wireUi() {
  el.composer.addEventListener('submit', (event) => {
    event.preventDefault();
    send(el.input.value);
  });

  el.input.addEventListener('input', autoGrow);
  el.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(el.input.value);
    }
  });

  el.stopButton.addEventListener('click', () => {
    state.abort?.abort();
    speaker.cancel();
  });

  el.messages.addEventListener('click', (event) => {
    const example = event.target.closest('.examples li');
    if (example) send(example.textContent);
  });

  $('openSettings').addEventListener('click', () => { fillSettings(); el.settings.showModal(); });
  $('openAccounts').addEventListener('click', () => { fillAccounts(); el.accounts.showModal(); });
  $('saveSettings').addEventListener('click', saveSettings);
  $('addConnection').addEventListener('click', addConnection);
  $('providerSelect').addEventListener('change', syncProviderHelp);
  $('silenceMs').addEventListener('input', (event) => {
    $('silenceOut').value = `${(event.target.value / 1000).toFixed(1)}s`;
  });
  $('maxSteps').addEventListener('input', (event) => { $('stepsOut').value = event.target.value; });

  $('fetchModels').addEventListener('click', async (event) => {
    const button = event.target;
    button.textContent = '…';
    try {
      const query = new URLSearchParams({
        provider: $('providerSelect').value,
        baseUrl: $('baseUrlInput').value.trim(),
      });
      const { models } = await api(`/api/models?${query}`);
      const list = $('modelList');
      list.innerHTML = '';
      for (const model of models) {
        const option = document.createElement('option');
        option.value = model;
        list.append(option);
      }
      button.textContent = models.length ? `${models.length} found` : 'none found';
    } catch {
      button.textContent = 'failed';
    }
    setTimeout(() => { button.textContent = 'Fetch'; }, 2400);
  });

  el.editor.addEventListener('input', () => {
    state.dirty = true;
    el.saveFile.hidden = false;
  });
  el.editor.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      saveOpenFile();
    }
  });
  el.saveFile.addEventListener('click', saveOpenFile);
  $('refreshFiles').addEventListener('click', refreshFiles);
  $('reloadPreview').addEventListener('click', reloadPreview);
  $('popPreview').addEventListener('click', () => window.open('/preview/', '_blank', 'noopener'));

  // Tabs, for narrow screens.
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((other) => other.classList.toggle('active', other === tab));
      document.querySelectorAll('.pane').forEach((pane) => { pane.hidden = pane.id !== tab.dataset.pane; });
    });
  });

  // Hold space to talk, when the focus is not in a field.
  let spaceHeld = false;
  document.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || spaceHeld) return;
    if (document.activeElement?.matches('input, textarea, select') || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    spaceHeld = true;
    if (!voice.enabled) {
      voice.pushToTalk = true;
      voice.start();
    }
  });
  document.addEventListener('keyup', (event) => {
    if (event.code !== 'Space') return;
    spaceHeld = false;
    if (voice.pushToTalk) {
      voice.pushToTalk = false;
      voice.stop();
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (state.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  // Panes are tabbed when narrow and side by side when wide.
  const wide = window.matchMedia('(min-width: 901px)');
  const syncPanes = () => {
    if (wide.matches) document.querySelectorAll('.pane').forEach((pane) => { pane.hidden = false; });
    else document.querySelector('.tab.active')?.click();
  };
  wide.addEventListener('change', syncPanes);
  syncPanes();
}

async function boot() {
  wireUi();
  setupVoice();
  try {
    const data = await api('/api/state');
    state.config = data.config;
    state.presets = data.presets;
    state.services = data.services;
    state.connections = data.connections;
    applyVoiceConfig();
    updateBadge();
    updateStatusDot();
    el.workspacePath.textContent = data.config.workspace;
  } catch (err) {
    addMessage('assistant', `Could not reach the local server: ${err.message}`, { error: true });
  }
  await refreshFiles();
}

boot();
