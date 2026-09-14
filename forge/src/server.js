// The dashboard's backend: a small JSON API over the same functions the CLI
// uses, served on localhost only.
//
// The Roblox API key never reaches the browser -- the page only ever sees a
// masked version and whether the link works.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig, saveConfig, updateConfig, maskKey, isLinked, CONFIG_PATH } from './config.js';
import { OpenCloud, verifyCredentials, parsePlaceId, findUniverseForPlace } from './opencloud.js';
import { loadProject, buildPlace, lintProject, MANIFEST_NAME, MAP_NAME } from './project.js';
import { createProject, writeRuntime } from './scaffold.js';
import { TEMPLATES } from './templates.js';
import { TAG_CATALOG } from './tags.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const UI_FILE = path.join(here, 'ui', 'index.html');

/** Where the dashboard looks for and creates projects. */
function workspaceRoot() {
  return path.resolve(process.env.FORGE_WORKSPACE || path.join(process.cwd(), 'games'));
}

function listProjects() {
  const root = workspaceRoot();
  if (!fs.existsSync(root)) return [];
  const found = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    if (!fs.existsSync(path.join(dir, MANIFEST_NAME))) continue;
    try {
      const project = loadProject(dir);
      const { stats } = buildPlace(project);
      found.push({
        id: entry.name,
        dir,
        name: project.manifest.name,
        description: project.manifest.description ?? '',
        template: project.manifest.template ?? 'custom',
        stats,
        problems: lintProject(project),
      });
    } catch (error) {
      found.push({ id: entry.name, dir, name: entry.name, error: error.message });
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

function resolveProject(id) {
  if (typeof id !== 'string' || !id || id.includes('..') || path.isAbsolute(id)) {
    throw new Error('Bad project id.');
  }
  const dir = path.join(workspaceRoot(), id);
  if (!fs.existsSync(path.join(dir, MANIFEST_NAME))) throw new Error(`No project called "${id}".`);
  return loadProject(dir);
}

async function status() {
  const config = loadConfig();
  const result = {
    linked: isLinked(config),
    apiKey: maskKey(config.apiKey),
    universeId: config.universeId,
    placeId: config.placeId,
    lastPublishedVersion: config.lastPublishedVersion,
    configPath: CONFIG_PATH,
    workspace: workspaceRoot(),
    sdk: false,
  };
  try {
    await import('@anthropic-ai/sdk');
    result.sdk = true;
  } catch {
    result.sdk = false;
  }
  if (result.linked) {
    try {
      const universe = await new OpenCloud({ apiKey: config.apiKey, universeId: config.universeId, placeId: config.placeId }).getUniverse();
      result.universe = { name: universe.displayName, visibility: universe.visibility };
    } catch (error) {
      result.reachError = error.message;
    }
  }
  return result;
}

const routes = {
  'GET /api/status': () => status(),

  'GET /api/catalog': () => ({
    templates: Object.entries(TEMPLATES).map(([id, t]) => ({ id, label: t.label, blurb: t.blurb })),
    tags: TAG_CATALOG,
  }),

  'GET /api/projects': () => ({ projects: listProjects() }),

  'POST /api/link': async (body) => {
    const apiKey = String(body.apiKey ?? '').trim();
    if (!apiKey) throw new Error('An API key is required.');

    const placeId = parsePlaceId(body.place ?? body.placeId);
    if (!placeId) throw new Error('Paste the roblox.com link to your game, or its numeric place ID.');

    // Open Cloud cannot list your universes; a place usually knows its own.
    let universeId = String(body.universeId ?? '').trim();
    if (!universeId) universeId = (await findUniverseForPlace(placeId)) ?? '';
    if (!universeId) {
      throw new Error(
        'Could not work out the universe ID for that place. Find it in the configure URL for your experience on create.roblox.com and enter it below.',
      );
    }
    if (!/^\d+$/.test(universeId)) throw new Error('Universe ID should be digits only.');

    const { universe, place } = await verifyCredentials({ apiKey, universeId, placeId });
    saveConfig({ ...loadConfig(), apiKey, universeId, placeId });
    return {
      universe: { name: universe.displayName },
      universeId,
      placeId,
      place: place?.displayName ?? null,
      placeError: place?.error ?? null,
    };
  },

  'POST /api/unlink': () => {
    updateConfig({ apiKey: '', universeId: '', placeId: '', lastPublishedVersion: null });
    return { ok: true };
  },

  'POST /api/new': (body) => {
    const template = body.template ?? 'obby';
    const name = (body.name ?? '').trim() || TEMPLATES[template]?.label || 'Game';
    const id = (body.id ?? name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';
    const created = createProject(path.join(workspaceRoot(), id), {
      template,
      name,
      seed: body.seed ? Number(body.seed) : undefined,
      force: Boolean(body.force),
    });
    const project = loadProject(created.dir);
    return { id, name: created.manifest.name, stats: buildPlace(project).stats };
  },

  'POST /api/build': (body) => {
    const project = resolveProject(body.id);
    const { xml, stats } = buildPlace(project);
    const out = path.join(project.dir, 'build', 'place.rbxlx');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, xml);
    return { stats, out, problems: lintProject(project) };
  },

  'POST /api/deploy': async (body) => {
    const config = loadConfig();
    if (!isLinked(config)) throw new Error('Link a Roblox place first.');
    const project = resolveProject(body.id);
    const { xml, stats } = buildPlace(project);
    const problems = lintProject(project);
    if (problems.length && !body.force) {
      return { published: false, problems, stats, message: 'Fix these first, or deploy anyway.' };
    }
    const client = new OpenCloud({ apiKey: config.apiKey, universeId: config.universeId, placeId: config.placeId });
    const result = await client.publishPlace(xml, { versionType: body.saved ? 'Saved' : 'Published' });
    const version = result.versionNumber ?? result.VersionNumber ?? null;
    updateConfig({ lastPublishedVersion: version ?? config.lastPublishedVersion });
    return {
      published: true,
      version,
      stats,
      problems,
      url: `https://www.roblox.com/games/${config.placeId}`,
    };
  },

  'POST /api/generate': async (body) => {
    const prompt = String(body.prompt ?? '').trim();
    if (!prompt) throw new Error('Describe the game first.');
    const { generateGame, designToProject } = await import('./ai.js');
    const { warnings, usage, ...design } = await generateGame(prompt);
    design.prompt = prompt;
    const id = (design.name ?? 'game').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';
    const created = designToProject(design, path.join(workspaceRoot(), id), { writeRuntime });
    const project = loadProject(created.dir);
    return {
      id,
      name: design.name,
      notes: design.notes ?? '',
      extras: created.extras,
      stats: buildPlace(project).stats,
      warnings,
      usage,
    };
  },

  'POST /api/iterate': async (body) => {
    const project = resolveProject(body.id);
    const instruction = String(body.instruction ?? '').trim();
    if (!instruction) throw new Error('Say what should change.');

    const { planEdit, applyMapEdits } = await import('./ai.js');
    const edit = await planEdit(project, instruction);

    let map = project.map;
    if (edit.map && Array.isArray(edit.map.parts)) map = edit.map;
    else if (edit.mapEdits) map = applyMapEdits(project.map, edit.mapEdits);

    const manifest = edit.settings
      ? { ...project.manifest, settings: { ...project.manifest.settings, ...edit.settings } }
      : project.manifest;

    const candidate = { ...project, manifest, map };
    const { stats } = buildPlace(candidate); // throws before anything is written

    fs.writeFileSync(path.join(project.dir, MAP_NAME), `${JSON.stringify(map, null, 2)}\n`);
    if (edit.settings) fs.writeFileSync(path.join(project.dir, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);

    const written = [];
    for (const file of edit.files ?? []) {
      if (typeof file.path !== 'string' || typeof file.source !== 'string') continue;
      const resolved = path.resolve(project.dir, file.path);
      if (!resolved.startsWith(project.dir + path.sep)) continue;
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, file.source.endsWith('\n') ? file.source : `${file.source}\n`);
      written.push(file.path);
    }

    return { notes: edit.notes ?? 'Applied.', stats, written, problems: lintProject(candidate), usage: edit.usage };
  },

  'POST /api/verify': async () => {
    const config = loadConfig();
    if (!config.lastPublishedVersion) throw new Error('Nothing published yet.');
    const client = new OpenCloud({ apiKey: config.apiKey, universeId: config.universeId, placeId: config.placeId });
    const probe = fs.readFileSync(path.join(here, 'probe.lua'), 'utf8');
    const result = await client.runLuau(probe, { version: config.lastPublishedVersion });
    const payload = Array.isArray(result.output) ? result.output[0] : result.output;
    return { state: result.state, logs: result.logs, payload, error: result.error };
  },
};

function send(response, code, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error('Request too large.');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createApp() {
  return async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const key = `${request.method} ${url.pathname}`;

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const html = fs.readFileSync(UI_FILE);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(html);
      return;
    }

    const handler = routes[key];
    if (!handler) {
      send(response, 404, { error: `No route for ${key}` });
      return;
    }

    try {
      const body = request.method === 'POST' ? await readBody(request) : {};
      send(response, 200, await handler(body, url));
    } catch (error) {
      send(response, 400, { error: error.message ?? String(error) });
    }
  };
}

export function startServer({ port = 7171, host = '127.0.0.1' } = {}) {
  const server = http.createServer(createApp());
  return new Promise((resolve, reject) => {
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Try \`forge ui --port ${port + 1}\`.`));
      } else {
        reject(error);
      }
    });
    server.listen(port, host, () => resolve({ server, url: `http://${host}:${port}` }));
  });
}
