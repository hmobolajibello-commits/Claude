#!/usr/bin/env node
// Voice Studio — a local server for a voice-driven AI coding agent.
//
// Binds to 127.0.0.1 by default: the process holds API keys and account tokens,
// so it is not something to expose to a network without thinking about it. Pass
// --host 0.0.0.0 deliberately (and it will warn you).
//
// Zero dependencies — Node 18+ only.

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Workspace } from './lib/workspace.js';
import { Connections, REGISTRY } from './lib/connections.js';
import { chat, listModels, PRESETS } from './lib/providers.js';
import { buildTools, runAgent, systemPrompt } from './lib/tools.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(HERE, 'public');

function parseArgs(argv) {
  const args = { port: 4173, host: '127.0.0.1', allowCommands: false, open: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') args.port = Number(argv[++i]);
    else if (arg === '--host') args.host = argv[++i];
    else if (arg === '--workspace' || arg === '-w') args.workspace = argv[++i];
    else if (arg === '--allow-commands') args.allowCommands = true;
    else if (arg === '--open') args.open = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

const argv = parseArgs(process.argv.slice(2));
if (argv.help) {
  console.log(`Voice Studio

  node server.js [options]

  -p, --port <n>        Port to listen on (default 4173)
      --host <addr>     Address to bind (default 127.0.0.1)
  -w, --workspace <dir> Where the AI writes code (default ./workspace)
      --allow-commands  Let the AI run shell commands in the workspace
      --open            Open a browser once the server is up

  Environment:
    STUDIO_SECRET       Passphrase used to encrypt stored account tokens
`);
  process.exit(0);
}

const CONFIG_DIR = path.join(HERE, '.studio');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const workspace = new Workspace(argv.workspace || path.join(HERE, 'workspace'));
const connections = new Connections(path.join(CONFIG_DIR, 'connections.json'));

const DEFAULT_CONFIG = {
  provider: 'ollama',
  model: '',
  baseUrl: '',
  apiKey: '',
  temperature: 0.3,
  maxSteps: 24,
  voice: { autoSend: true, silenceMs: 1400, speakReplies: false, wakeWord: '', requireWakeWord: false, language: 'en-US' },
};

let config = { ...DEFAULT_CONFIG };

async function loadConfig() {
  try {
    const saved = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8'));
    config = { ...DEFAULT_CONFIG, ...saved, voice: { ...DEFAULT_CONFIG.voice, ...(saved.voice || {}) } };
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`could not read config: ${err.message}`);
  }
}

async function saveConfig() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 });
}

/** The API key never goes back to the browser — only whether one is set. */
function publicConfig() {
  const { apiKey, ...rest } = config;
  return { ...rest, hasApiKey: !!apiKey, allowCommands: argv.allowCommands, workspace: workspace.root };
}

/* ---------- HTTP helpers ---------- */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.map': 'application/json',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload), 'cache-control': 'no-store' });
  res.end(payload);
}

async function readBody(req, limit = 20_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('request body was not valid JSON');
  }
}

async function serveFile(res, absPath, { cache = 'no-store' } = {}) {
  try {
    const stat = await fs.stat(absPath);
    if (stat.isDirectory()) return false;
    const body = await fs.readFile(absPath);
    res.writeHead(200, {
      'content-type': MIME[path.extname(absPath).toLowerCase()] || 'application/octet-stream',
      'content-length': body.length,
      'cache-control': cache,
    });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

/* ---------- routes ---------- */

async function handleApi(req, res, url) {
  const route = url.pathname;

  if (route === '/api/state' && req.method === 'GET') {
    return sendJson(res, 200, {
      config: publicConfig(),
      presets: Object.fromEntries(Object.entries(PRESETS).map(([id, p]) => [id, { ...p, kind: undefined }])),
      connections: connections.list(),
      services: Object.fromEntries(Object.entries(REGISTRY).map(([id, s]) => [id, { label: s.label, tokenHelp: s.tokenHelp, needsBaseUrl: !!s.needsBaseUrl, basic: s.auth?.type === 'basic' }])),
    });
  }

  if (route === '/api/config' && req.method === 'POST') {
    const body = await readBody(req);
    const next = { ...config, ...body, voice: { ...config.voice, ...(body.voice || {}) } };
    // An empty apiKey from the UI means "leave it alone", not "clear it".
    if (body.apiKey === '' || body.apiKey === undefined) next.apiKey = config.apiKey;
    if (body.clearApiKey) next.apiKey = '';
    delete next.clearApiKey;
    delete next.hasApiKey;
    config = next;
    await saveConfig();
    return sendJson(res, 200, { config: publicConfig() });
  }

  if (route === '/api/models' && req.method === 'GET') {
    const provider = url.searchParams.get('provider') || config.provider;
    const models = await listModels({
      provider,
      baseUrl: url.searchParams.get('baseUrl') || (provider === config.provider ? config.baseUrl : ''),
      apiKey: provider === config.provider ? config.apiKey : '',
    });
    return sendJson(res, 200, { models });
  }

  if (route === '/api/connections' && req.method === 'GET') {
    return sendJson(res, 200, { connections: connections.list() });
  }
  if (route === '/api/connections' && req.method === 'POST') {
    const added = await connections.add(await readBody(req));
    return sendJson(res, 200, { connection: added, connections: connections.list() });
  }
  if (route.startsWith('/api/connections/') && req.method === 'DELETE') {
    await connections.remove(decodeURIComponent(route.slice('/api/connections/'.length)));
    return sendJson(res, 200, { connections: connections.list() });
  }
  if (route === '/api/connections/test' && req.method === 'POST') {
    const { id, path: testPath } = await readBody(req);
    const result = await connections.call(id, { method: 'GET', path: testPath || '/' });
    return sendJson(res, 200, { status: result.status, ok: result.ok, body: typeof result.body === 'string' ? result.body.slice(0, 800) : result.body });
  }

  if (route === '/api/files' && req.method === 'GET') {
    return sendJson(res, 200, { files: await workspace.list('.'), root: workspace.root });
  }
  if (route === '/api/file' && req.method === 'GET') {
    return sendJson(res, 200, { content: await workspace.read(url.searchParams.get('path')) });
  }
  if (route === '/api/file' && req.method === 'PUT') {
    const { path: filePath, content } = await readBody(req);
    return sendJson(res, 200, { path: await workspace.write(filePath, content) });
  }
  if (route === '/api/file' && req.method === 'DELETE') {
    const { path: filePath } = await readBody(req);
    return sendJson(res, 200, { path: await workspace.remove(filePath) });
  }

  if (route === '/api/chat' && req.method === 'POST') return handleChat(req, res);

  return sendJson(res, 404, { error: `no such endpoint: ${route}` });
}

/** The agent turn, streamed to the browser over server-sent events. */
async function handleChat(req, res) {
  const body = await readBody(req);
  const controller = new AbortController();
  req.on('close', () => controller.abort());

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  const emit = (event) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const tools = buildTools({ workspace, connections, allowCommands: argv.allowCommands });
    const history = [
      { role: 'system', content: systemPrompt({ hasConnections: connections.list().length > 0, allowCommands: argv.allowCommands }) },
      ...(body.messages || []).map((msg) => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        toolCallId: msg.toolCallId,
      })),
    ];

    const result = await runAgent({
      chat,
      config: {
        provider: config.provider,
        model: body.model || config.model,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        temperature: config.temperature,
      },
      messages: history,
      tools,
      emit,
      maxSteps: config.maxSteps,
      signal: controller.signal,
    });

    emit({ type: 'done', stopped: result.stopped, hitLimit: !!result.hitLimit, steps: result.steps });
  } catch (err) {
    if (err.name === 'AbortError') emit({ type: 'done', stopped: true });
    else emit({ type: 'error', message: err.message });
  } finally {
    if (!res.writableEnded) res.end();
  }
}

/* ---------- server ---------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Only same-origin browser requests: a page on another site must not be able
  // to drive this server, which holds the user's keys.
  const origin = req.headers.origin;
  if (origin && req.method !== 'GET') {
    const expected = new Set([`http://${req.headers.host}`, `https://${req.headers.host}`]);
    if (!expected.has(origin)) {
      return sendJson(res, 403, { error: 'cross-origin requests are not allowed' });
    }
  }

  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);

    // The workspace served raw, so the preview pane can render what the AI built.
    if (url.pathname.startsWith('/preview')) {
      const rel = decodeURIComponent(url.pathname.slice('/preview'.length)) || '/';
      const target = rel === '/' || rel === '' ? 'index.html' : rel;
      let abs;
      try {
        abs = await workspace.resolve(target);
      } catch {
        res.writeHead(403, { 'content-type': 'text/plain' });
        return res.end('forbidden');
      }
      if (await serveFile(res, abs)) return;
      if (await serveFile(res, path.join(abs, 'index.html'))) return;
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;padding:2rem;color:#666">Nothing to preview yet. Ask the AI to build something with an <code>index.html</code> at the workspace root.</body>');
    }

    const staticPath = url.pathname === '/' ? '/index.html' : url.pathname;
    const abs = path.join(PUBLIC_DIR, staticPath);
    // Compare against PUBLIC_DIR + separator: a bare startsWith would also
    // accept a sibling folder whose name merely begins with "public".
    if (abs !== PUBLIC_DIR && !abs.startsWith(PUBLIC_DIR + path.sep)) {
      res.writeHead(403); return res.end('forbidden');
    }
    if (await serveFile(res, abs)) return;

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: err.message });
    else if (!res.writableEnded) res.end();
  }
});

await workspace.init();
await loadConfig();
await connections.load();

server.listen(argv.port, argv.host, () => {
  const shown = argv.host === '0.0.0.0' ? localAddress() : argv.host;
  console.log(`\n  Voice Studio  →  http://${shown}:${argv.port}`);
  console.log(`  workspace     →  ${workspace.root}`);
  console.log(`  provider      →  ${config.provider}${config.model ? ` / ${config.model}` : ' (pick a model in Settings)'}`);
  if (argv.allowCommands) console.log('  shell         →  enabled (--allow-commands)');
  if (argv.host === '0.0.0.0') {
    console.log('\n  ! Bound to all interfaces. Anyone who can reach this port can use your');
    console.log('    API keys and connected accounts. Only do this on a network you trust.');
  }
  console.log('');
  if (argv.open) openBrowser(`http://127.0.0.1:${argv.port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${argv.port} is already in use. Try: node server.js --port ${argv.port + 1}\n`);
    process.exit(1);
  }
  throw err;
});

function localAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

function openBrowser(target) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  import('node:child_process').then(({ spawn }) => {
    spawn(cmd, [target], { detached: true, stdio: 'ignore', shell: process.platform === 'win32' }).unref();
  }).catch(() => {});
}
