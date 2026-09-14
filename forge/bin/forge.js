#!/usr/bin/env node
// forge -- link a Roblox place, then build, publish and iterate on games in it.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { loadConfig, saveConfig, updateConfig, maskKey, isLinked, CONFIG_PATH } from '../src/config.js';
import { OpenCloud, OpenCloudError, verifyCredentials, parsePlaceId, findUniverseForPlace } from '../src/opencloud.js';
import { loadProject, buildPlace, lintProject, ProjectError, MANIFEST_NAME, MAP_NAME } from '../src/project.js';
import { createProject, writeRuntime } from '../src/scaffold.js';
import { TEMPLATES } from '../src/templates.js';
import { TAG_CATALOG } from '../src/tags.js';

const ESC = String.fromCharCode(27);
const color = (code) => (text) => (process.stdout.isTTY ? `${ESC}[${code}m${text}${ESC}[0m` : String(text));
const bold = color(1);
const dim = color(2);
const red = color(31);
const green = color(32);
const yellow = color(33);
const cyan = color(36);

const say = (...args) => console.log(...args);
const ok = (text) => say(`${green('ok')} ${text}`);
const note = (text) => say(`${dim('--')} ${dim(text)}`);
const warnLine = (text) => say(`${yellow('!')} ${text}`);

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "UsageError";
  }
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const [name, inline] = token.slice(2).split('=');
    if (inline !== undefined) {
      flags[name] = inline;
    } else if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
      flags[name] = argv[index + 1];
      index += 1;
    } else {
      flags[name] = true;
    }
  }
  return { positional, flags };
}

// A path the user can paste back: relative when that is shorter and inside
// the working directory, absolute when it would otherwise be ../../../..
function displayPath(target) {
  const relative = path.relative(process.cwd(), target);
  if (!relative) return '.';
  return relative.startsWith('..') ? target : relative;
}

function projectDir(positional, flags) {
  return path.resolve(flags.project ?? positional[0] ?? '.');
}

function openProject(dir) {
  if (!fs.existsSync(path.join(dir, MANIFEST_NAME))) {
    throw new UsageError(`No ${MANIFEST_NAME} in ${dir}. Run \`forge new <dir>\` or \`forge generate "..."\` first.`);
  }
  return loadProject(dir);
}

function clientFor(flags, config = loadConfig()) {
  return new OpenCloud({
    apiKey: flags.key ?? config.apiKey,
    universeId: flags.universe ?? config.universeId,
    placeId: flags.place ?? config.placeId,
  });
}

//------------------------------------------------------------------------------

const HELP = `${bold('forge')} -- build Roblox games from a project directory and ship them with Open Cloud.

${bold('Linking')}
  forge link                       Connect a Roblox place (API key + your game's link)
  forge status                     Show what is linked and what is installed
  forge unlink                     Forget the stored credentials

${bold('Making games')}
  forge templates                  List the built-in game templates
  forge new <dir> [--template T]   Scaffold a playable game (obby, tycoon, simulator, arena)
  forge generate "<prompt>" [--out dir]
                                   Have Claude design a new game, then write it
  forge iterate <dir> "<change>"   Have Claude change an existing game
  forge tags                       The tag vocabulary a map can use

${bold('Shipping')}
  forge build [dir]                Compile to build/place.rbxlx
  forge publish [dir] [--saved]    Upload the compiled place (--saved = Studio copy only)
  forge deploy [dir]               Build then publish, in one step
  forge run <script.lua>           Run Luau inside a real server for your place
  forge verify                     Publish-check: confirm the runtime booted in the cloud
  forge doctor [dir]               Find which part of a place file Roblox rejects

${bold('Dashboard')}
  forge ui [--port 7171]           Local web dashboard for all of the above

${bold('Common flags')}
  --template <name>  --name "Title"  --seed <n>  --out <dir>  --force
  --key <api-key>    --place <link|id>  --universe <id>   (override the stored link)

${dim(`Config: ${CONFIG_PATH}`)}
`;

//------------------------------------------------------------------------------

const commands = {};

commands.help = () => say(HELP);

commands.templates = () => {
  say(bold('\nTemplates\n'));
  for (const [key, template] of Object.entries(TEMPLATES)) {
    say(`  ${cyan(key.padEnd(11))} ${template.blurb}`);
  }
  say(`\n${dim('forge new my-game --template tycoon')}\n`);
};

commands.tags = () => {
  say(bold('\nMap tags\n'));
  for (const entry of TAG_CATALOG) {
    say(`  ${cyan(entry.tag.padEnd(17))} ${entry.what}`);
    if (Object.keys(entry.data).length) say(`  ${' '.repeat(17)} ${dim(`data ${JSON.stringify(entry.data)}`)}`);
  }
  say('');
};

commands.link = async ({ flags }) => {
  const config = loadConfig();
  let apiKey = flags.key;
  let universeId = flags.universe;
  let placeInput = flags.place;
  let placeId = null;

  const prompt = (!apiKey || !placeInput) ? readline.createInterface({ input: stdin, output: stdout }) : null;
  try {
    if (prompt) {
      say(`
${bold('Link a Roblox place')}

forge reaches Roblox through ${bold('Open Cloud')}, with an API key you create --
never your password, never a cookie. An API key is the only credential Roblox
accepts for publishing a place; there is no "sign in with Roblox" for this.

  1. Open ${cyan('https://create.roblox.com/dashboard/credentials')}
  2. Create API Key, give it any name
  3. Under Access Permissions, ${bold('Select API System')} -> ${bold('universe-places')},
     pick your experience, and tick the ${bold('write')} operation
  4. Optional, for ${bold('forge verify')}: add ${bold('luau-execution-sessions')} the same way
  5. Optional, so status can show the game's name: add ${bold('universe')} with ${bold('read')}
  6. Leave ${bold('Restrict IP addresses')} switched off
  7. Save & Generate key, then copy it (Roblox shows it once)
`);
      apiKey = apiKey || (await prompt.question(`${bold('API key')}: `)).trim();
      placeInput = placeInput || (await prompt.question(`${bold('Game link or place ID')}: `)).trim();
    }

    placeId = parsePlaceId(placeInput);
    if (!apiKey) throw new UsageError('An API key is required.');
    if (!placeId) {
      throw new UsageError(`Could not read a place ID from "${placeInput}". Paste the roblox.com link to your game, or the numeric place ID.`);
    }

    // Open Cloud cannot list your universes, but a place usually knows which
    // universe contains it -- try that before asking.
    if (!universeId) {
      say(`\n${dim('looking up which experience that place belongs to...')}`);
      universeId = await findUniverseForPlace(placeId);
      if (universeId) {
        note(`universe ${universeId}`);
      } else if (prompt) {
        say(`
${yellow('Could not look that up automatically.')} Open your experience on
${cyan('create.roblox.com')} -- the configure URL ends with the universe ID
(.../configure?id=${bold('UNIVERSE')}).
`);
        universeId = (await prompt.question(`${bold('Universe ID')}: `)).trim();
      }
    }

    if (!universeId) throw new UsageError('A universe ID is required. Pass --universe <id>.');
    if (!/^\d+$/.test(String(universeId))) throw new UsageError(`Universe ID should be digits only, got "${universeId}".`);
  } finally {
    prompt?.close();
  }

  say(`\n${dim('checking with Roblox...')}`);
  const { universe, universeError, place } = await verifyCredentials({ apiKey, universeId, placeId });

  saveConfig({ ...config, apiKey, universeId: String(universeId), placeId: String(placeId) });
  ok(`linked to ${bold(universe?.displayName ?? `universe ${universeId}`)}`);

  if (place?.error) {
    note(`could not read the place: ${place.error}`);
  } else if (place) {
    note(`place: ${place.displayName ?? placeId}`);
  }

  // A key scoped only to publishing cannot read the universe. That is normal
  // and not a failure -- say so plainly rather than looking broken.
  if (universeError) {
    warnLine('the key cannot read your experience details, only publish to it');
    note('that is expected for a publish-only key -- deploying will still work');
    note('to see the name and status, add the "universe" system with read to the key');
  }

  note(`saved to ${CONFIG_PATH} (readable only by you)`);
  say(`\n  ${dim('next:')} node bin/forge.js new games/my-obby --template obby\n`);
};

commands.unlink = () => {
  updateConfig({ apiKey: '', universeId: '', placeId: '', lastPublishedVersion: null });
  ok('credentials forgotten');
};

commands.status = async () => {
  const config = loadConfig();
  say(bold('\nforge status\n'));
  say(`  API key            ${config.apiKey ? green(maskKey(config.apiKey)) : red('not set')}`);
  say(`  Universe           ${config.universeId || red('not set')}`);
  say(`  Place              ${config.placeId || red('not set')}`);
  say(`  Last published     ${config.lastPublishedVersion ? `version ${config.lastPublishedVersion}` : dim('never')}`);

  let sdk = red('not installed (run npm install for AI commands)');
  try {
    await import('@anthropic-ai/sdk');
    const credentialled = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
    sdk = `${green('installed')}${credentialled ? '' : dim(' (no ANTHROPIC_API_KEY in this shell; an `ant auth login` profile also works)')}`;
  } catch {
    // left as the default message
  }
  say(`  Anthropic SDK      ${sdk}`);

  if (!isLinked(config)) {
    say(`\n${yellow('Not linked yet.')} Run ${bold('forge link')}.\n`);
    return;
  }

  try {
    const universe = await clientFor({}, config).getUniverse();
    say(`\n  ${green('reachable')}  ${bold(universe.displayName ?? '')} ${dim(universe.path ?? '')}`);
    if (universe.visibility) say(`  ${dim(`visibility: ${universe.visibility}`)}`);
  } catch (error) {
    say(`\n  ${red('unreachable')}  ${error.message}`);
  }
  say('');
};

commands.new = async ({ positional, flags }) => {
  const dir = positional[0];
  if (!dir) throw new UsageError('Where should it go? e.g. `forge new games/my-obby --template obby`');

  const created = createProject(dir, {
    template: flags.template ?? 'obby',
    name: flags.name,
    seed: flags.seed ? Number(flags.seed) : undefined,
    stages: flags.stages ? Number(flags.stages) : undefined,
    plots: flags.plots ? Number(flags.plots) : undefined,
    zones: flags.zones ? Number(flags.zones) : undefined,
    force: Boolean(flags.force),
  });

  const project = loadProject(created.dir);
  const { stats } = buildPlace(project);
  ok(`created ${bold(created.manifest.name)} in ${created.dir}`);
  note(created.manifest.description);
  note(`${stats.parts} bricks, ${stats.tagged} interactive, ${stats.scripts} scripts`);
  say(`\n  ${dim('next:')} forge deploy ${displayPath(created.dir)}\n`);
};

commands.build = async ({ positional, flags }) => {
  const dir = projectDir(positional, flags);
  const project = openProject(dir);
  const { xml, stats } = buildPlace(project);

  const out = path.resolve(flags.out ?? path.join(dir, 'build', 'place.rbxlx'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, xml);

  const problems = lintProject(project);
  ok(`built ${bold(project.manifest.name)}`);
  note(`${stats.parts} bricks (${stats.tagged} interactive), ${stats.scripts} scripts, ${(stats.bytes / 1024).toFixed(0)} KB`);
  note(out);
  for (const problem of problems) warnLine(problem);
  return { out, stats, problems };
};

async function publishXml(xml, { flags, label }) {
  const config = loadConfig();
  if (!isLinked({ ...config, apiKey: flags.key ?? config.apiKey, universeId: flags.universe ?? config.universeId, placeId: flags.place ?? config.placeId })) {
    throw new UsageError('Not linked to a place yet. Run `forge link`.');
  }
  const client = clientFor(flags, config);
  const versionType = flags.saved ? 'Saved' : 'Published';

  say(`${dim(`uploading ${(Buffer.byteLength(xml, 'utf8') / 1024).toFixed(0)} KB to place ${client.placeId}...`)}`);
  const result = await client.publishPlace(xml, { versionType });
  const version = result.versionNumber ?? result.VersionNumber;

  updateConfig({ lastPublishedVersion: version ?? config.lastPublishedVersion });
  ok(`${versionType.toLowerCase()} ${label} as version ${bold(String(version))}`);
  if (versionType === 'Published') {
    say(`   ${cyan(`https://www.roblox.com/games/${client.placeId}`)}`);
  } else {
    note('Saved only -- open the place in Studio to see it; players still get the old version.');
  }
  return version;
}

commands.publish = async ({ positional, flags }) => {
  const dir = projectDir(positional, flags);
  const file = flags.file
    ? path.resolve(flags.file)
    : path.join(dir, 'build', 'place.rbxlx');
  if (!fs.existsSync(file)) throw new UsageError(`No built place at ${file}. Run \`forge build\` (or \`forge deploy\`).`);
  await publishXml(fs.readFileSync(file, 'utf8'), { flags, label: path.basename(file) });
};

commands.deploy = async ({ positional, flags }) => {
  const dir = projectDir(positional, flags);
  const project = openProject(dir);
  const { xml, stats } = buildPlace(project);
  const problems = lintProject(project);

  note(`${stats.parts} bricks (${stats.tagged} interactive), ${stats.scripts} scripts`);
  for (const problem of problems) warnLine(problem);
  if (problems.length && !flags.force) {
    throw new UsageError('Refusing to publish with the problems above. Fix them, or pass --force.');
  }

  const out = path.join(dir, 'build', 'place.rbxlx');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, xml);
  await publishXml(xml, { flags, label: project.manifest.name });
};

commands.generate = async ({ positional, flags }) => {
  const prompt = positional.join(' ').trim();
  if (!prompt) throw new UsageError('Describe the game: `forge generate "a neon parkour tower with a shop"`');

  const { generateGame, designToProject } = await import('../src/ai.js');
  const stages = { designing: 'designing the game', writing: 'writing the map', fixing: 'fixing its own mistakes' };
  const { warnings, usage, ...design } = await generateGame(prompt, {
    onProgress: (stage) => note(stages[stage] ?? stage),
  });

  const slug = (design.name ?? 'game').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';
  const out = flags.out ?? path.join('games', slug);
  design.prompt = prompt;
  const created = designToProject(design, out, { writeRuntime });

  const project = loadProject(created.dir);
  const { stats } = buildPlace(project);

  say('');
  ok(`designed ${bold(design.name)}`);
  if (design.notes) say(`\n${design.notes}\n`);
  note(`${stats.parts} bricks (${stats.tagged} interactive), ${stats.scripts} scripts`);
  if (created.extras.length) note(`custom modules: ${created.extras.join(', ')}`);
  note(created.dir);
  if (usage) note(`${usage.input_tokens} in / ${usage.output_tokens} out tokens`);
  for (const problem of warnings ?? []) warnLine(problem);
  say(`\n  ${dim('next:')} forge deploy ${displayPath(created.dir)}\n`);
};

commands.iterate = async ({ positional, flags }) => {
  const dir = path.resolve(positional[0] ?? '.');
  const instruction = positional.slice(1).join(' ').trim() || String(flags.change ?? '');
  if (!instruction) throw new UsageError('What should change? `forge iterate games/my-obby "make the last stage harder"`');

  const project = openProject(dir);
  const { planEdit, applyMapEdits } = await import('../src/ai.js');
  const edit = await planEdit(project, instruction, { onProgress: (stage) => note(stage) });

  const before = (project.map.parts ?? []).length;
  let map = project.map;
  if (edit.map && Array.isArray(edit.map.parts)) {
    map = edit.map;
  } else if (edit.mapEdits) {
    map = applyMapEdits(project.map, edit.mapEdits);
  }

  const manifest = edit.settings
    ? { ...project.manifest, settings: { ...project.manifest.settings, ...edit.settings } }
    : project.manifest;

  // Type-check the result by building it before anything is written.
  const candidate = { ...project, manifest, map };
  const { stats } = buildPlace(candidate);

  fs.writeFileSync(path.join(dir, MAP_NAME), `${JSON.stringify(map, null, 2)}\n`);
  if (edit.settings) fs.writeFileSync(path.join(dir, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const file of edit.files ?? []) {
    if (typeof file.path !== 'string' || typeof file.source !== 'string') continue;
    const resolved = path.resolve(dir, file.path);
    if (!resolved.startsWith(dir + path.sep)) {
      warnLine(`skipped ${file.path} -- outside the project`);
      continue;
    }
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, file.source.endsWith('\n') ? file.source : `${file.source}\n`);
    note(`wrote ${file.path}`);
  }

  say('');
  ok(edit.notes ?? 'applied the change');
  note(`${before} -> ${stats.parts} bricks (${stats.tagged} interactive)`);
  for (const problem of lintProject(candidate)) warnLine(problem);
  say(`\n  ${dim('next:')} forge deploy ${displayPath(dir)}\n`);
};

commands.run = async ({ positional, flags }) => {
  const file = positional[0];
  if (!file) throw new UsageError('Which script? `forge run scripts/probe.lua`');
  const script = fs.readFileSync(path.resolve(file), 'utf8');
  const config = loadConfig();
  const client = clientFor(flags, config);

  const version = flags.version ? Number(flags.version) : config.lastPublishedVersion;
  say(`${dim(`running ${path.basename(file)} in a cloud server for place ${client.placeId}...`)}`);
  const result = await client.runLuau(script, { version, onPoll: (state) => note(state.toLowerCase()) });

  say('');
  for (const line of result.logs) say(`  ${dim('|')} ${line}`);
  if (result.state === 'COMPLETE') {
    ok('script completed');
    if (result.output) say(`${dim('returned')} ${JSON.stringify(result.output, null, 2)}`);
  } else {
    say(`${red('failed')} ${result.state}`);
    if (result.error) say(`  ${result.error.message ?? JSON.stringify(result.error)}`);
    process.exitCode = 1;
  }
};

const PROBE = fs.readFileSync(new URL('../src/probe.lua', import.meta.url), 'utf8');

commands.verify = async ({ flags }) => {
  const config = loadConfig();
  const client = clientFor(flags, config);
  const version = flags.version ? Number(flags.version) : config.lastPublishedVersion;
  if (!version) throw new UsageError('Nothing published yet. Run `forge deploy` first.');

  say(`${dim(`starting a cloud server on version ${version}...`)}`);
  const result = await client.runLuau(PROBE, { version, onPoll: (state) => note(state.toLowerCase()) });
  for (const line of result.logs) say(`  ${dim('|')} ${line}`);

  const payload = Array.isArray(result.output) ? result.output[0] : result.output;
  if (result.state === 'COMPLETE' && payload?.ok) {
    ok(`${bold(payload.game)} is live: ${payload.bricks} bricks, ${payload.tagged} interactive`);
    note(`systems: ${(payload.systems ?? []).join(', ')}`);
  } else {
    say(`${red('verification failed')} ${result.state}`);
    if (payload?.reason) say(`  ${payload.reason}`);
    if (payload?.missing?.length) say(`  bricks in MapData but not in the place: ${payload.missing.join(', ')}`);
    if (result.error) say(`  ${result.error.message ?? JSON.stringify(result.error)}`);
    process.exitCode = 1;
  }
};

commands.doctor = async ({ positional, flags }) => {
  const config = loadConfig();
  const client = clientFor(flags, config);

  let project = null;
  const dir = positional[0] ? path.resolve(positional[0]) : null;
  if (dir && fs.existsSync(path.join(dir, MANIFEST_NAME))) project = loadProject(dir);

  const { runDoctor } = await import('../src/doctor.js');

  say(`
${bold('forge doctor')}

Roblox rejects a bad place file with 400 and no detail about why. This uploads
a sequence of places, each adding one thing to the last, and stops at the first
one Roblox refuses -- so the failure names the feature. Every upload is a Saved
version, so players keep seeing the current game.
`);

  const results = await runDoctor(client, {
    project,
    onStage: (stage) => {
      if (stage.phase === 'start') {
        const label = `${stage.id} `.padEnd(12, '.');
        process.stdout.write(`  ${dim(label)} ${stage.what} ${dim(`(${(stage.bytes / 1024).toFixed(1)} KB)`)} `);
      } else if (stage.ok) {
        say(green('ok'));
      } else {
        say(red(`FAILED ${stage.status ?? ''}`));
      }
    },
  });

  const failure = results.find((entry) => !entry.ok);
  say('');

  if (!failure) {
    ok('every stage uploaded, including the full place');
    note('the place file is acceptable to Roblox -- try deploying again');
    return;
  }

  const passed = results.filter((entry) => entry.ok);
  say(`${red('Roblox rejects')} ${bold(failure.what)}`);
  if (passed.length) {
    note(`everything up to and including "${passed[passed.length - 1].what}" was accepted`);
  }
  say(`\n  ${failure.message}\n`);

  // Keep the exact document that failed, so it can be inspected or opened in
  // Studio without having to reproduce the run.
  const out = path.resolve('doctor-failed.rbxlx');
  fs.writeFileSync(out, failure.xml);
  note(`the rejected file is saved at ${out}`);
  note('open it in Studio (File -> Open from File) to see whether Studio accepts it too');
  process.exitCode = 1;
};

commands.ui = async ({ flags }) => {
  const { startServer } = await import('../src/server.js');
  const port = Number(flags.port ?? 7171);
  const { url } = await startServer({ port, host: flags.host ?? '127.0.0.1' });
  say(`\n${bold('forge dashboard')} ${cyan(url)}\n${dim('Ctrl-C to stop.')}\n`);
};

//------------------------------------------------------------------------------

const ALIASES = { '-h': 'help', '--help': 'help', ls: 'templates', init: 'new', push: 'deploy' };

async function main() {
  const [, , rawCommand, ...rest] = process.argv;
  const name = ALIASES[rawCommand] ?? rawCommand;

  if (!name) {
    say(HELP);
    const config = loadConfig();
    if (!isLinked(config)) say(`${yellow('Not linked to Roblox yet.')} Start with ${bold('forge link')}.\n`);
    return;
  }

  const command = commands[name];
  if (!command) {
    say(`${red(`Unknown command "${rawCommand}".`)}\n`);
    say(HELP);
    process.exitCode = 1;
    return;
  }

  await command(parseArgs(rest));
}

main().catch((error) => {
  if (error instanceof UsageError || error instanceof ProjectError) {
    say(`${red('error')} ${error.message}`);
  } else if (error instanceof OpenCloudError) {
    say(`${red('roblox')} ${error.message}`);
  } else if (error?.name === 'AiError') {
    say(`${red('claude')} ${error.message}`);
  } else {
    say(`${red('error')} ${error?.stack ?? error}`);
  }
  process.exitCode = 1;
});
