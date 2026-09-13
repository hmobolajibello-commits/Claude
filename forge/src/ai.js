// Claude designs the game; forge compiles and ships it.
//
// The division of labour matters. The model is not asked to write a game engine
// -- the Luau runtime in runtime/ is fixed and tested. It is asked for the two
// things that actually differ between games: the settings table and the map, as
// data, using the tag vocabulary in tags.js. It may add extra server modules
// when a mechanic genuinely needs new code, and those are reviewed like any
// other file in the project.

import fs from 'node:fs';
import path from 'node:path';
import { catalogForPrompt } from './tags.js';
import { normalizeMap, lintProject, MANIFEST_NAME, MAP_NAME } from './project.js';

const MODEL = process.env.FORGE_MODEL || 'claude-opus-5';
const MAX_TOKENS = 64000;
const MAP_INLINE_LIMIT = 60_000; // characters of map.json sent verbatim

export class AiError extends Error {
  constructor(message) {
    super(message);
    this.name = "AiError";
  }
}

async function anthropic() {
  let Anthropic;
  try {
    ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
  } catch {
    throw new AiError('The AI commands need the Anthropic SDK. Run `npm install` inside the forge directory.');
  }
  return new Anthropic();
}

/**
 * One non-interactive turn. Streams because these responses are long, and opts
 * into server-side refusal fallbacks so a policy decline is rescued inside the
 * same call rather than surfacing as an empty result.
 */
async function ask({ system, user, onProgress }) {
  const client = await anthropic();
  const request = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: user }],
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
  };

  const send = async (withFallbacks) => {
    const stream = client.beta.messages.stream(
      withFallbacks
        ? { ...request, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
        : request,
    );
    if (onProgress) {
      let sawText = false;
      stream.on('text', () => {
        if (!sawText) {
          sawText = true;
          onProgress('writing');
        }
      });
    }
    return stream.finalMessage();
  };

  let message;
  try {
    message = await send(true);
  } catch (error) {
    // Older API surfaces reject the fallback beta; the request itself is fine.
    const status = error?.status;
    if (status === 400 || status === 404) {
      message = await send(false);
    } else if (status === 401 || status === 403) {
      throw new AiError(
        'Anthropic rejected the credentials. Set ANTHROPIC_API_KEY, or run `ant auth login`.',
      );
    } else if (/authentication method|apiKey|authToken/i.test(error?.message ?? '')) {
      // The SDK could not find a credential at all -- say what to do about it.
      throw new AiError(
        'No Anthropic credentials found. Set ANTHROPIC_API_KEY in this shell, or run `ant auth login`.',
      );
    } else {
      throw new AiError(`Claude request failed: ${error?.message ?? error}`);
    }
  }

  if (message.stop_reason === 'refusal') {
    const category = message.stop_details?.category ?? 'unspecified';
    throw new AiError(`Claude declined this request (${category}). Try describing the game differently.`);
  }

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!text.trim()) {
    throw new AiError(`Claude returned no text (stop reason: ${message.stop_reason}).`);
  }
  return { text, usage: message.usage };
}

/** Pull the single JSON object out of a model response. */
export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new AiError(`No JSON object in the response. It began: ${text.slice(0, 200)}`);
  }
  const slice = candidate.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (error) {
    throw new AiError(`The response was not valid JSON: ${error.message}`);
  }
}

function designBrief() {
  const { tags, systems } = catalogForPrompt();
  return `You design Roblox games that are compiled by a tool called forge.

forge owns a tested Luau runtime. You do not write the engine. You describe the
game as data, and forge turns it into a real place file.

GEOMETRY
Every brick is an object in map.json:
  {
    "name": "UniqueName",          // unique across the map; referenced by tags
    "folder": "Stage1",            // optional grouping inside Workspace.Map
    "className": "Part",           // or "SpawnLocation" for a spawn pad
    "size": [x, y, z],             // studs
    "position": [x, y, z],         // centre of the brick, studs
    "rotation": [rx, ry, rz],      // optional, degrees
    "color": "#rrggbb",
    "material": "Plastic|SmoothPlastic|Neon|Wood|WoodPlanks|Marble|Slate|Concrete|Granite|Brick|Pebble|Cobblestone|Metal|DiamondPlate|Grass|Sand|Ice|Glass|ForceField",
    "shape": "Block|Ball|Cylinder|Wedge",   // optional, Part only
    "anchored": true,              // leave true unless it must fall
    "canCollide": true,
    "transparency": 0,
    "tags": ["ForgeCoin"],         // behaviour, from the list below
    "data": { "value": 5 }         // config for those tags
  }

TAGS (the only behaviours that exist; a brick with no tag is scenery)
${tags}

SYSTEMS (settings.systems; Save must be first and Tags is needed for any tag)
${systems}

SETTINGS (forge.project.json "settings")
  name, currency {name, start, multiplier}, showWins, respawnTime,
  save {enabled, store, autosaveSeconds, studio},
  checkpoints {enabled, reward, resetOnWin},
  coins {value, respawn},
  backpack {capacity, rate},          // include only for a collect-and-sell loop
  rounds {enabled, intermission, duration, minPlayers, reward},
  shop {items: [{id, name, description, price, kind, value}]}
     kind is one of: speed, jump, capacity, multiplier

RULES THAT MAKE THE DIFFERENCE BETWEEN A PLACE AND A GAME
- Exactly one reachable spawn area, on a brick, with a SpawnLocation above it.
- Nothing floats unreachably: a player must be able to walk or jump from the
  spawn to everything that matters. Jumps are at most 22 studs of gap and at
  most 6 studs of rise. A default character is 5 studs tall and 2 wide.
- Give the world a floor. Falling off should hit a brick tagged ForgeKill, not
  fall forever.
- Progression: something to earn, something to spend it on, a reason to return.
- 120-400 bricks is a real level. Fewer than 60 feels like a test place.
- Names must be unique, descriptive, and referenced correctly in data fields
  (ForgeBuy.unlocks and ForgeTeleport.target must name bricks that exist).
- Do the arithmetic. Positions are absolute world coordinates, not offsets.`;
}

const OUTPUT_CONTRACT = `Reply with one JSON object and nothing else:
{
  "name": "Short game name",
  "description": "One sentence.",
  "settings": { ... },
  "map": { "lighting": { "timeOfDay": "14:00:00", "brightness": 2 }, "parts": [ ... ] },
  "extraModules": [ { "name": "Pets", "source": "--!strict\\nlocal Pets = {}\\n...\\nreturn Pets" } ],
  "notes": "What you built and what a player does, 2-4 sentences."
}
"extraModules" is optional and usually empty. Include a module only when the
mechanic cannot be expressed with the tags above. Each one is a ModuleScript in
ServerScriptService.Forge returning a table with a .start() function, and its
name must also be appended to settings.systems.`;

/** Design a brand-new game from a prompt. */
export async function generateGame(prompt, { onProgress } = {}) {
  const attempt = async (repair) => {
    const user = repair
      ? `${repair.original}\n\nYour previous answer had a problem that must be fixed:\n${repair.problem}\n\nReply again with the complete corrected JSON object.`
      : `Design this game:\n\n${prompt}\n\n${OUTPUT_CONTRACT}`;
    const { text, usage } = await ask({ system: designBrief(), user, onProgress });
    return { design: extractJson(text), usage, user };
  };

  onProgress?.('designing');
  let result = await attempt();
  let problems = validateDesign(result.design);

  if (problems.length) {
    onProgress?.('fixing');
    const retry = await attempt({ original: result.user, problem: problems.join('\n') });
    const retryProblems = validateDesign(retry.design);
    if (retryProblems.length === 0) {
      result = retry;
      problems = [];
    } else if (retryProblems.length < problems.length) {
      result = retry;
      problems = retryProblems;
    }
  }

  return { ...result.design, warnings: problems, usage: result.usage };
}

/** Hard errors (would not build) and soft warnings, as one list. */
export function validateDesign(design) {
  const problems = [];
  if (!design || typeof design !== 'object') return ['The response was not an object.'];
  if (!design.map || !Array.isArray(design.map.parts)) return ['map.parts is missing or not an array.'];
  if (design.map.parts.length === 0) return ['map.parts is empty.'];

  try {
    const { parts } = normalizeMap(design.map);
    const fake = {
      manifest: { name: design.name, settings: design.settings ?? {} },
      map: design.map,
      sources: {
        serverScripts: [{ name: 'Main' }],
        serverModules: Object.keys({ Save: 1, Leaderstats: 1, Economy: 1, Tags: 1, Shop: 1, Plots: 1, Rounds: 1 })
          .concat((design.extraModules ?? []).map((m) => m.name))
          .map((name) => ({ name })),
        clientScripts: [{ name: 'Hud' }],
        sharedModules: [{ name: 'Net' }],
      },
    };
    problems.push(...lintProject(fake));

    const names = new Set(parts.map((p) => p.name));
    for (const part of parts) {
      const target = part.data?.target;
      if (part.tags.includes('ForgeTeleport') && target && !names.has(target)) {
        problems.push(`${part.name} teleports to "${target}", which is not a brick in the map.`);
      }
      const unlocks = part.data?.unlocks;
      if (part.tags.includes('ForgeBuy') && unlocks && !names.has(unlocks)) {
        problems.push(`${part.name} unlocks "${unlocks}", which is not a brick in the map.`);
      }
    }

    for (const module of design.extraModules ?? []) {
      if (!module.name || typeof module.source !== 'string') {
        problems.push('Every extraModules entry needs a name and a source string.');
      } else if (!/return\s+\w+/.test(module.source)) {
        problems.push(`extraModules "${module.name}" does not return anything.`);
      }
    }
  } catch (error) {
    problems.push(error.message);
  }
  return problems;
}

/** Write a design to disk as a project, reusing the runtime. */
export function designToProject(design, dir, { writeRuntime }) {
  const target = path.resolve(dir);
  fs.mkdirSync(target, { recursive: true });

  const settings = { ...(design.settings ?? {}), name: design.name };
  const systems = new Set(settings.systems ?? ['Save', 'Leaderstats', 'Economy', 'Tags']);
  for (const module of design.extraModules ?? []) systems.add(module.name);
  settings.systems = [...systems];

  const manifest = {
    name: design.name ?? 'Forge Game',
    description: design.description ?? '',
    template: 'generated',
    prompt: design.prompt,
    createdAt: new Date().toISOString(),
    settings,
  };

  fs.writeFileSync(path.join(target, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(target, MAP_NAME), `${JSON.stringify(design.map, null, 2)}\n`);
  fs.writeFileSync(path.join(target, '.gitignore'), 'build/\n');

  const files = writeRuntime(target);
  const extras = [];
  for (const module of design.extraModules ?? []) {
    const file = path.join(target, 'src', 'server', 'modules', `${module.name}.lua`);
    fs.writeFileSync(file, module.source.endsWith('\n') ? module.source : `${module.source}\n`);
    extras.push(`${module.name}.lua`);
  }

  return { dir: target, manifest, files, extras };
}

//------------------------------------------------------------------------------
// Iterating on a project that already exists
//------------------------------------------------------------------------------

function summarizeMap(map) {
  const parts = map.parts ?? [];
  const byFolder = new Map();
  const byTag = new Map();
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };

  for (const part of parts) {
    const folder = part.folder ?? '(root)';
    byFolder.set(folder, (byFolder.get(folder) ?? 0) + 1);
    for (const tag of part.tags ?? []) byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
    const position = part.position ?? [0, 0, 0];
    for (let axis = 0; axis < 3; axis += 1) {
      bounds.min[axis] = Math.min(bounds.min[axis], position[axis]);
      bounds.max[axis] = Math.max(bounds.max[axis], position[axis]);
    }
  }

  return [
    `${parts.length} bricks`,
    `folders: ${[...byFolder].map(([name, count]) => `${name} (${count})`).join(', ') || 'none'}`,
    `tags: ${[...byTag].map(([tag, count]) => `${tag} x${count}`).join(', ') || 'none'}`,
    `extent: x ${bounds.min[0]}..${bounds.max[0]}, y ${bounds.min[1]}..${bounds.max[1]}, z ${bounds.min[2]}..${bounds.max[2]}`,
    `names: ${parts.slice(0, 80).map((p) => p.name).join(', ')}${parts.length > 80 ? ', ...' : ''}`,
  ].join('\n');
}

const EDIT_CONTRACT = `Reply with one JSON object and nothing else:
{
  "settings": { ... },              // optional, replaces forge.project.json settings
  "mapEdits": {
    "add":    [ { ...brick... } ],  // new bricks
    "update": [ { "name": "Existing", "position": [0,10,0] } ],  // named brick, changed fields only
    "remove": [ "BrickName" ]
  },
  "map": { "parts": [...] },        // optional full replacement; prefer mapEdits
  "files": [ { "path": "src/server/modules/Pets.lua", "source": "..." } ],
  "notes": "What changed, 1-3 sentences."
}
Only include the keys you are actually changing. Positions are absolute world
coordinates. Keep every brick reachable.`;

/** Ask for a change to an existing project. Returns the parsed edit. */
export async function planEdit(project, instruction, { onProgress } = {}) {
  const mapJson = JSON.stringify(project.map, null, 1);
  const mapSection =
    mapJson.length <= MAP_INLINE_LIMIT
      ? `Current map.json:\n${mapJson}`
      : `The map is too large to include in full. Summary:\n${summarizeMap(project.map)}\n\nUse mapEdits (add/update/remove by name) rather than replacing the map.`;

  const fileList = Object.entries(project.sources)
    .flatMap(([group, files]) => files.map((file) => `${group}/${file.file}`))
    .join(', ');

  const user = [
    `An existing forge project needs a change.`,
    ``,
    `Name: ${project.manifest.name}`,
    `Description: ${project.manifest.description ?? '(none)'}`,
    `Settings: ${JSON.stringify(project.manifest.settings ?? {}, null, 1)}`,
    `Source files: ${fileList}`,
    ``,
    mapSection,
    ``,
    `Requested change:`,
    instruction,
    ``,
    EDIT_CONTRACT,
  ].join('\n');

  onProgress?.('planning');
  const { text, usage } = await ask({ system: designBrief(), user, onProgress });
  return { ...extractJson(text), usage };
}

/** Apply a planEdit result to a project's map. Returns the new map. */
export function applyMapEdits(map, edits) {
  if (!edits) return map;
  const parts = [...(map.parts ?? [])];
  const indexByName = new Map(parts.map((part, index) => [part.name, index]));

  for (const name of edits.remove ?? []) {
    const index = indexByName.get(name);
    if (index === undefined) continue;
    parts[index] = null;
  }

  for (const change of edits.update ?? []) {
    const index = indexByName.get(change.name);
    if (index === undefined || parts[index] === null) continue;
    parts[index] = { ...parts[index], ...change };
  }

  const kept = parts.filter(Boolean);
  const existing = new Set(kept.map((part) => part.name));
  for (const addition of edits.add ?? []) {
    if (addition?.name && existing.has(addition.name)) {
      // Never silently shadow a brick the map already has.
      addition.name = `${addition.name}_new`;
    }
    kept.push(addition);
    if (addition?.name) existing.add(addition.name);
  }

  return { ...map, parts: kept };
}
