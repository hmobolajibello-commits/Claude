// A forge project is a directory, and building it produces a .rbxlx place.
//
//   forge.project.json   name, description, settings (compiled to a Settings module)
//   map.json             every brick in the world, as data
//   src/server/*.server.lua          -> ServerScriptService (Script)
//   src/server/modules/*.lua         -> ServerScriptService/Forge (ModuleScript)
//   src/client/*.client.lua          -> StarterPlayerScripts (LocalScript)
//   src/shared/*.lua                 -> ReplicatedStorage/Forge (ModuleScript)
//
// The mapping is by convention, so there is no separate project file to keep in
// sync: drop a .lua file in the right folder and the next build includes it.

import fs from 'node:fs';
import path from 'node:path';
import { instance, serializePlace, MATERIALS, SHAPES, SURFACES, LIGHTING_TECHNOLOGY } from './rbxlx.js';
import { luaModule } from './lua.js';

export const MANIFEST_NAME = 'forge.project.json';
export const MAP_NAME = 'map.json';

export class ProjectError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProjectError";
  }
}

function readJson(file, label) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') throw new ProjectError(`${label} is missing: ${file}`);
    throw new ProjectError(`Could not read ${label}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ProjectError(`${label} is not valid JSON (${file}): ${error.message}`);
  }
}

function listLua(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.lua'))
    .map((entry) => entry.name)
    .sort();
}

function scriptName(fileName) {
  return fileName.replace(/\.(server|client)\.lua$/, '').replace(/\.lua$/, '');
}

export function loadProject(dir) {
  const root = path.resolve(dir);
  const manifest = readJson(path.join(root, MANIFEST_NAME), 'forge.project.json');
  const mapPath = path.join(root, MAP_NAME);
  const map = fs.existsSync(mapPath) ? readJson(mapPath, 'map.json') : { parts: [] };

  const read = (...segments) => fs.readFileSync(path.join(root, ...segments), 'utf8');
  const dirOf = (...segments) => path.join(root, 'src', ...segments);

  const sources = {
    serverScripts: listLua(dirOf('server')).map((file) => ({ name: scriptName(file), source: read('src', 'server', file), file })),
    serverModules: listLua(dirOf('server', 'modules')).map((file) => ({ name: scriptName(file), source: read('src', 'server', 'modules', file), file })),
    clientScripts: listLua(dirOf('client')).map((file) => ({ name: scriptName(file), source: read('src', 'client', file), file })),
    sharedModules: listLua(dirOf('shared')).map((file) => ({ name: scriptName(file), source: read('src', 'shared', file), file })),
  };

  return { dir: root, manifest, map, sources };
}

const DEFAULT_LIGHTING = {
  brightness: 2,
  ambient: '#7f7f7f',
  outdoorAmbient: '#8c8c8c',
  timeOfDay: '14:30:00',
  technology: 'ShadowMap',
  globalShadows: true,
};

function resolveMaterial(name) {
  if (name == null) return MATERIALS.Plastic;
  if (typeof name === 'number') return name;
  const key = Object.keys(MATERIALS).find((m) => m.toLowerCase() === String(name).toLowerCase());
  if (!key) throw new ProjectError(`Unknown material "${name}". Known: ${Object.keys(MATERIALS).join(', ')}`);
  return MATERIALS[key];
}

function resolveShape(name) {
  if (name == null) return undefined;
  if (typeof name === 'number') return name;
  const key = Object.keys(SHAPES).find((s) => s.toLowerCase() === String(name).toLowerCase());
  if (!key) throw new ProjectError(`Unknown shape "${name}". Known: ${Object.keys(SHAPES).join(', ')}`);
  return SHAPES[key];
}

function vector(value, fallback, label) {
  const source = value ?? fallback;
  if (!Array.isArray(source) || source.length !== 3 || source.some((n) => typeof n !== 'number' || !Number.isFinite(n))) {
    throw new ProjectError(`${label} must be three numbers, got ${JSON.stringify(value)}`);
  }
  return source;
}

/**
 * Validate and normalize map.json, giving every brick a unique name.
 * Returns the normalized parts plus the MapData payload the runtime reads.
 */
export function normalizeMap(map) {
  const parts = map.parts ?? [];
  if (!Array.isArray(parts)) throw new ProjectError('map.json: "parts" must be an array');

  const used = new Map();
  const normalized = [];
  const mapData = { parts: {} };

  parts.forEach((part, index) => {
    if (typeof part !== 'object' || part === null) {
      throw new ProjectError(`map.json: parts[${index}] is not an object`);
    }
    const base = part.name ? String(part.name) : `Part${index + 1}`;
    let name = base;
    if (used.has(name)) {
      const count = used.get(name) + 1;
      used.set(name, count);
      name = `${base}_${count}`;
    }
    used.set(name, used.get(name) ?? 1);

    const entry = {
      name,
      folder: part.folder ? String(part.folder) : null,
      className: part.className === 'SpawnLocation' ? 'SpawnLocation' : 'Part',
      size: vector(part.size, [4, 1, 4], `map.json: parts[${index}].size`),
      position: vector(part.position, [0, 0, 0], `map.json: parts[${index}].position`),
      rotation: part.rotation ? vector(part.rotation, [0, 0, 0], `map.json: parts[${index}].rotation`) : [0, 0, 0],
      color: part.color ?? '#a3a2a5',
      material: resolveMaterial(part.material),
      shape: resolveShape(part.shape),
      anchored: part.anchored !== false,
      canCollide: part.canCollide !== false,
      transparency: typeof part.transparency === 'number' ? part.transparency : 0,
      tags: Array.isArray(part.tags) ? part.tags.map(String) : [],
      data: part.data ?? {},
    };
    normalized.push(entry);

    if (entry.tags.length > 0 || Object.keys(entry.data).length > 0) {
      mapData.parts[name] = { tags: entry.tags, data: entry.data };
    }
  });

  return { parts: normalized, mapData };
}

function partInstance(part) {
  return instance(part.className, {
    Name: part.name,
    Size: part.size,
    CFrame: { position: part.position, rotation: part.rotation },
    Color: part.color,
    Material: part.material,
    Shape: part.className === 'Part' ? (part.shape ?? SHAPES.Block) : undefined,
    Anchored: part.anchored,
    CanCollide: part.canCollide,
    Transparency: part.transparency,
    TopSurface: SURFACES.Smooth,
    BottomSurface: SURFACES.Smooth,
    ...(part.className === 'SpawnLocation' ? { Neutral: true, Duration: 0, AllowTeamChangeOnTouch: false } : {}),
  });
}

/** Build the place tree and serialize it. Returns { xml, stats }. */
export function buildPlace(project) {
  const { manifest, map, sources } = project;
  const { parts, mapData } = normalizeMap(map);

  // The runtime reads these unconditionally, so fill them in here rather than
  // trusting every manifest (and every generated design) to be complete.
  const settings = {
    name: manifest.name ?? 'Forge Game',
    showWins: true,
    respawnTime: 3,
    ...(manifest.settings ?? {}),
  };
  settings.currency = { name: 'Coins', start: 0, multiplier: 1, ...(settings.currency ?? {}) };
  settings.save = { enabled: true, store: 'ForgeSave_v1', autosaveSeconds: 120, studio: false, ...(settings.save ?? {}) };
  settings.systems = settings.systems?.length ? settings.systems : ['Save', 'Leaderstats', 'Economy', 'Tags'];

  // Workspace: bricks, grouped into folders when the map asks for it.
  const folders = new Map();
  const mapChildren = [];
  for (const part of parts) {
    const node = partInstance(part);
    if (!part.folder) {
      mapChildren.push(node);
      continue;
    }
    if (!folders.has(part.folder)) {
      const folder = instance('Folder', { Name: part.folder }, []);
      folders.set(part.folder, folder);
      mapChildren.push(folder);
    }
    folders.get(part.folder).children.push(node);
  }

  const workspace = instance('Workspace', { Gravity: settings.gravity ?? 196.2 }, [
    instance('Terrain', { Name: 'Terrain' }),
    instance('Folder', { Name: 'Map' }, mapChildren),
  ]);

  const lighting = { ...DEFAULT_LIGHTING, ...(map.lighting ?? {}) };
  const lightingNode = instance('Lighting', {
    Brightness: lighting.brightness,
    Ambient: lighting.ambient,
    OutdoorAmbient: lighting.outdoorAmbient,
    TimeOfDay: lighting.timeOfDay,
    GlobalShadows: lighting.globalShadows,
    Technology: LIGHTING_TECHNOLOGY[lighting.technology] ?? LIGHTING_TECHNOLOGY.ShadowMap,
    EnvironmentDiffuseScale: 0.4,
    EnvironmentSpecularScale: 0.4,
  });

  const generated = [
    instance('ModuleScript', {
      Name: 'Settings',
      Source: luaModule(settings, 'Generated by forge from forge.project.json -- edit that file, not this one.'),
    }),
    instance('ModuleScript', {
      Name: 'MapData',
      Source: luaModule(mapData, 'Generated by forge from map.json -- tags and per-brick config.'),
    }),
  ];

  const replicatedStorage = instance('ReplicatedStorage', {}, [
    instance('Folder', { Name: 'Forge' }, [
      ...generated,
      ...sources.sharedModules.map((m) => instance('ModuleScript', { Name: m.name, Source: m.source })),
    ]),
  ]);

  const serverScriptService = instance('ServerScriptService', {}, [
    ...sources.serverScripts.map((s) => instance('Script', { Name: s.name, Source: s.source })),
    instance('Folder', { Name: 'Forge' }, sources.serverModules.map((m) => instance('ModuleScript', { Name: m.name, Source: m.source }))),
  ]);

  const starterPlayer = instance('StarterPlayer', {}, [
    instance('StarterPlayerScripts', {}, sources.clientScripts.map((s) => instance('LocalScript', { Name: s.name, Source: s.source }))),
    instance('StarterCharacterScripts', {}, []),
  ]);

  const roots = [
    workspace,
    lightingNode,
    replicatedStorage,
    serverScriptService,
    instance('ServerStorage', {}, []),
    starterPlayer,
    instance('StarterGui', {}, []),
    instance('Players', { RespawnTime: settings.respawnTime ?? 3 }),
    instance('SoundService', {}),
    instance('Teams', {}, []),
  ];

  const xml = serializePlace(roots);
  return {
    xml,
    stats: {
      parts: parts.length,
      tagged: Object.keys(mapData.parts).length,
      scripts:
        sources.serverScripts.length + sources.serverModules.length + sources.clientScripts.length + sources.sharedModules.length,
      spawns: parts.filter((p) => p.className === 'SpawnLocation').length,
      bytes: Buffer.byteLength(xml, 'utf8'),
    },
  };
}

/** Sanity checks worth surfacing before a publish reaches players. */
export function lintProject(project) {
  const problems = [];
  const { parts } = normalizeMap(project.map);
  const settings = project.manifest.settings ?? {};

  if (!parts.some((p) => p.className === 'SpawnLocation')) {
    problems.push('No SpawnLocation in map.json -- players will spawn at the world origin and fall.');
  }
  if (!project.sources.serverScripts.length) {
    problems.push('No server entry script in src/server/ -- nothing will start.');
  }

  const known = new Set(project.sources.serverModules.map((m) => m.name));
  for (const system of settings.systems ?? []) {
    if (!known.has(system)) problems.push(`Settings lists system "${system}" but src/server/modules/${system}.lua does not exist.`);
  }

  const tagged = new Set(parts.flatMap((p) => p.tags));
  if (settings.checkpoints?.enabled && !tagged.has('ForgeCheckpoint')) {
    problems.push('Checkpoints are enabled but no brick is tagged ForgeCheckpoint.');
  }
  if (tagged.has('ForgeSell') && !settings.backpack) {
    problems.push('A brick is tagged ForgeSell but settings.backpack is missing, so nothing can be carried.');
  }
  if (settings.rounds?.enabled && !tagged.has('ForgeArenaSpawn')) {
    problems.push('Rounds are enabled but no brick is tagged ForgeArenaSpawn.');
  }
  return problems;
}
