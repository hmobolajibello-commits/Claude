// Plain-node test suite: node test/run.js
//
// Covers the parts that are easy to get silently wrong -- the XML property
// names and colour packing, the Luau emitter's escaping, map normalization, the
// Open Cloud request shape, and the AI output handling. It never calls Roblox or
// Anthropic; both are exercised through injected fakes.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
}

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-test-'));
process.env.FORGE_HOME = path.join(sandbox, 'home');
process.env.FORGE_WORKSPACE = path.join(sandbox, 'games');

const { serializePlace, instance, parseColor, rotationMatrix, MATERIALS, SHAPES } = await import('../src/rbxlx.js');
const { toLua, luaModule } = await import('../src/lua.js');
const { normalizeMap, buildPlace, lintProject, loadProject, ProjectError } = await import('../src/project.js');
const { createProject } = await import('../src/scaffold.js');
const { TEMPLATES, buildTemplate } = await import('../src/templates.js');
const { OpenCloud, OpenCloudError } = await import('../src/opencloud.js');
const { extractJson, applyMapEdits, validateDesign } = await import('../src/ai.js');
const { createApp } = await import('../src/server.js');

//------------------------------------------------------------------------------
// rbxlx
//------------------------------------------------------------------------------

await test('colours pack into the uint32 Roblox expects', () => {
  assert.deepEqual(parseColor('#ff8800'), { r: 255, g: 136, b: 0 });
  assert.deepEqual(parseColor('#f80'), { r: 255, g: 136, b: 0 });
  assert.deepEqual(parseColor([255, 0, 0]), { r: 255, g: 0, b: 0 });
  assert.deepEqual(parseColor([0.5, 0.5, 0.5]), { r: 128, g: 128, b: 128 });
  const xml = serializePlace([instance('Part', { Color: '#ff8800' })]);
  // 0xFFFF8800
  assert.match(xml, /<Color3uint8 name="Color3uint8">4294936576<\/Color3uint8>/);
});

await test('Size and Shape use their serialized names, not the Luau ones', () => {
  const xml = serializePlace([instance('Part', { Size: [4, 2, 1], Shape: SHAPES.Ball })]);
  assert.match(xml, /<Vector3 name="size">/);
  assert.match(xml, /<token name="shape">0<\/token>/);
  assert.doesNotMatch(xml, /name="Size"/);
});

await test('a Y rotation produces the right matrix', () => {
  const [r00, , r02, , , , r20, , r22] = rotationMatrix([0, 90, 0]);
  assert.ok(Math.abs(r00) < 1e-9, 'R00 should be ~0');
  assert.ok(Math.abs(r02 - 1) < 1e-9, 'R02 should be ~1');
  assert.ok(Math.abs(r20 + 1) < 1e-9, 'R20 should be ~-1');
  assert.ok(Math.abs(r22) < 1e-9, 'R22 should be ~0');
});

await test('Luau source is XML-escaped, including comparisons', () => {
  const xml = serializePlace([instance('Script', { Source: 'if a < b and c > d then print("x & y") end' })]);
  assert.match(xml, /if a &lt; b and c &gt; d then print\(&quot;x &amp; y&quot;\) end/);
  assert.doesNotMatch(xml, /< b/);
});

await test('an unknown property fails loudly instead of silently vanishing', () => {
  assert.throws(() => serializePlace([instance('Part', { Sparkliness: 3 })]), /unknown property "Sparkliness"/);
});

await test('every referent is unique', () => {
  const xml = serializePlace([
    instance('Workspace', {}, [instance('Part', {}), instance('Part', {}, [instance('Part', {})])]),
  ]);
  const referents = [...xml.matchAll(/referent="(RBX\d+)"/g)].map((m) => m[1]);
  assert.equal(referents.length, 4);
  assert.equal(new Set(referents).size, 4);
});

//------------------------------------------------------------------------------
// Luau emitter
//------------------------------------------------------------------------------

await test('table keys are quoted only when they have to be', () => {
  const source = toLua({ name: 'x', 'not-an-ident': 1, end: 2, systems: ['Save'] });
  assert.match(source, /name = "x"/);
  assert.match(source, /\["not-an-ident"\] = 1/);
  assert.match(source, /\["end"\] = 2/);
  assert.match(source, /systems = \{\n\t\t"Save",\n\t\}/);
});

await test('strings with quotes and newlines survive', () => {
  assert.equal(toLua('say "hi"\nbye'), '"say \\"hi\\"\\nbye"');
  assert.match(luaModule({ a: 1 }, 'header'), /^-- header\n\nreturn \{/);
});

//------------------------------------------------------------------------------
// Projects and maps
//------------------------------------------------------------------------------

await test('duplicate brick names are made unique', () => {
  const { parts } = normalizeMap({ parts: [{ name: 'Pad' }, { name: 'Pad' }, { name: 'Pad' }] });
  assert.deepEqual(parts.map((p) => p.name), ['Pad', 'Pad_2', 'Pad_3']);
});

await test('bad geometry is rejected with a pointed message', () => {
  assert.throws(() => normalizeMap({ parts: [{ name: 'A', size: [1, 2] }] }), /parts\[0\]\.size must be three numbers/);
  assert.throws(() => normalizeMap({ parts: [{ name: 'A', material: 'Cheese' }] }), /Unknown material "Cheese"/);
  assert.throws(() => normalizeMap({ parts: 'lots' }), ProjectError);
});

await test('only tagged or configured bricks reach MapData', () => {
  const { mapData } = normalizeMap({
    parts: [{ name: 'Scenery' }, { name: 'Lava', tags: ['ForgeKill'] }, { name: 'Cfg', data: { order: 1 } }],
  });
  assert.deepEqual(Object.keys(mapData.parts).sort(), ['Cfg', 'Lava']);
  assert.deepEqual(mapData.parts.Lava.tags, ['ForgeKill']);
});

await test('the build fills in settings the runtime assumes exist', () => {
  const project = {
    manifest: { name: 'Bare', settings: {} },
    map: { parts: [{ name: 'Floor' }] },
    sources: { serverScripts: [], serverModules: [], clientScripts: [], sharedModules: [] },
  };
  const { xml } = buildPlace(project);
  // Quotes inside a ProtectedString are XML-escaped, so match the escaped form.
  assert.match(xml, /name = &quot;Coins&quot;/);
  assert.match(xml, /store = &quot;ForgeSave_v1&quot;/);
  assert.match(xml, /&quot;Save&quot;,/);
});

await test('lint catches the mistakes that make a place unplayable', () => {
  const problems = lintProject({
    manifest: { name: 'X', settings: { systems: ['Nope'], checkpoints: { enabled: true } } },
    map: { parts: [{ name: 'Floor' }] },
    sources: { serverScripts: [], serverModules: [], clientScripts: [], sharedModules: [] },
  });
  assert.ok(problems.some((p) => /No SpawnLocation/.test(p)));
  assert.ok(problems.some((p) => /No server entry script/.test(p)));
  assert.ok(problems.some((p) => /system "Nope"/.test(p)));
  assert.ok(problems.some((p) => /ForgeCheckpoint/.test(p)));
});

//------------------------------------------------------------------------------
// Templates, end to end
//------------------------------------------------------------------------------

for (const name of Object.keys(TEMPLATES)) {
  await test(`the ${name} template scaffolds, builds and lints clean`, () => {
    const dir = path.join(sandbox, 'templates', name);
    createProject(dir, { template: name, seed: 7, name: `Test ${name}` });
    const project = loadProject(dir);
    const { xml, stats } = buildPlace(project);

    assert.ok(stats.parts > 20, `${name} only produced ${stats.parts} bricks`);
    assert.ok(stats.spawns >= 1, `${name} has no spawn`);
    assert.ok(stats.scripts >= 10, `${name} is missing runtime scripts`);
    assert.deepEqual(lintProject(project), []);

    // The runtime must actually be in the place, in the right services.
    assert.match(xml, /<Item class="ServerScriptService"/);
    assert.match(xml, /<Item class="ModuleScript" referent="[^"]+">\s*<Properties>\s*<string name="Name">Settings/);
    assert.match(xml, /<string name="Name">MapData<\/string>/);
    assert.match(xml, /<Item class="LocalScript"/);
    assert.match(xml, /<Item class="SpawnLocation"/);
  });
}

await test('the same seed produces the same map twice', () => {
  const a = buildTemplate('obby', { name: 'Same', seed: 99 });
  const b = buildTemplate('obby', { name: 'Same', seed: 99 });
  assert.equal(JSON.stringify(a.map), JSON.stringify(b.map));
  const c = buildTemplate('obby', { name: 'Same', seed: 100 });
  assert.notEqual(JSON.stringify(a.map), JSON.stringify(c.map));
});

await test('every template only uses tags the runtime implements', () => {
  const tagsLua = fs.readFileSync(new URL('../runtime/server/modules/Tags.lua', import.meta.url), 'utf8');
  const plotsLua = fs.readFileSync(new URL('../runtime/server/modules/Plots.lua', import.meta.url), 'utf8');
  const roundsLua = fs.readFileSync(new URL('../runtime/server/modules/Rounds.lua', import.meta.url), 'utf8');
  const runtime = tagsLua + plotsLua + roundsLua;

  for (const name of Object.keys(TEMPLATES)) {
    const { map } = buildTemplate(name, { name, seed: 3 });
    const used = new Set(map.parts.flatMap((part) => part.tags ?? []));
    for (const tag of used) {
      // A tag is handled either as a behaviour key or by an explicit lookup.
      const handled = new RegExp(`(behaviours\\.${tag}\\b|"${tag}")`).test(runtime);
      assert.ok(handled, `${name} uses ${tag} but no runtime module handles it`);
    }
  }
});

//------------------------------------------------------------------------------
// Open Cloud
//------------------------------------------------------------------------------

await test('publish hits the documented endpoint with the key and content type', async () => {
  const calls = [];
  const client = new OpenCloud({
    apiKey: 'key-123',
    universeId: '11',
    placeId: '22',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ versionNumber: 7 }), { status: 200 });
    },
  });
  const result = await client.publishPlace('<roblox/>');
  assert.equal(result.versionNumber, 7);
  assert.equal(calls[0].url, 'https://apis.roblox.com/universes/v1/11/places/22/versions?versionType=Published');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['x-api-key'], 'key-123');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/xml');
});

await test('Roblox errors come back explained, not as bare status codes', async () => {
  const client = new OpenCloud({
    apiKey: 'k',
    universeId: '1',
    placeId: '2',
    fetchImpl: async () => new Response(JSON.stringify({ message: 'Invalid API key' }), { status: 403 }),
  });
  await assert.rejects(() => client.publishPlace('<roblox/>'), (error) => {
    assert.ok(error instanceof OpenCloudError);
    assert.match(error.message, /403/);
    assert.match(error.message, /missing a required scope/);
    assert.match(error.message, /Invalid API key/);
    return true;
  });
});

await test('a cloud script run polls until the task finishes and returns its logs', async () => {
  let poll = 0;
  const client = new OpenCloud({
    apiKey: 'k',
    universeId: '1',
    placeId: '2',
    fetchImpl: async (url) => {
      if (url.endsWith('/logs?maxPageSize=1000')) {
        return new Response(JSON.stringify({ luauExecutionSessionTaskLogs: [{ messages: ['hello'] }] }), { status: 200 });
      }
      if (url.includes('luau-execution-session-tasks') && !url.includes('/tasks/')) {
        return new Response(JSON.stringify({ path: 'universes/1/places/2/versions/3/tasks/abc', state: 'QUEUED' }), { status: 200 });
      }
      poll += 1;
      return new Response(
        JSON.stringify({
          path: 'universes/1/places/2/versions/3/tasks/abc',
          state: poll >= 2 ? 'COMPLETE' : 'PROCESSING',
          output: { results: [{ ok: true }] },
        }),
        { status: 200 },
      );
    },
  });

  const result = await client.runLuau('return 1', { version: 3, pollMs: 1 });
  assert.equal(result.state, 'COMPLETE');
  assert.deepEqual(result.logs, ['hello']);
  assert.deepEqual(result.output, [{ ok: true }]);
});

await test('running a script without a published version explains what to do', async () => {
  const client = new OpenCloud({ apiKey: 'k', universeId: '1', placeId: '2', fetchImpl: async () => new Response('{}') });
  await assert.rejects(() => client.runLuau('return 1'), /Publish once with `forge deploy`/);
});

await test('a missing key is caught before any request', () => {
  assert.throws(() => new OpenCloud({}), /forge link/);
});

//------------------------------------------------------------------------------
// AI plumbing (no network)
//------------------------------------------------------------------------------

await test('JSON survives fences and surrounding prose', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Here you go:\n{"a":[1,2]}\nHope that helps.'), { a: [1, 2] });
  assert.throws(() => extractJson('no object here'), /No JSON object/);
  assert.throws(() => extractJson('{"a": }'), /not valid JSON/);
});

await test('map edits add, update and remove by name', () => {
  const map = { parts: [{ name: 'A', position: [0, 0, 0] }, { name: 'B' }, { name: 'C' }] };
  const next = applyMapEdits(map, {
    remove: ['B'],
    update: [{ name: 'A', position: [0, 10, 0] }],
    add: [{ name: 'D' }],
  });
  assert.deepEqual(next.parts.map((p) => p.name), ['A', 'C', 'D']);
  assert.deepEqual(next.parts[0].position, [0, 10, 0]);
  assert.deepEqual(map.parts.length, 3, 'the original map must not be mutated');
});

await test('an added brick never shadows an existing name', () => {
  const next = applyMapEdits({ parts: [{ name: 'A' }] }, { add: [{ name: 'A' }] });
  assert.deepEqual(next.parts.map((p) => p.name), ['A', 'A_new']);
});

await test('a design that references bricks it never placed is rejected', () => {
  const problems = validateDesign({
    name: 'Broken',
    settings: { systems: ['Save', 'Tags'] },
    map: {
      parts: [
        { name: 'Floor', size: [100, 2, 100], position: [0, 0, 0] },
        { name: 'Spawn', className: 'SpawnLocation', size: [8, 1, 8], position: [0, 2, 0] },
        { name: 'Door', size: [4, 8, 1], position: [0, 5, 20], tags: ['ForgeTeleport'], data: { target: 'Nowhere' } },
      ],
    },
  });
  assert.ok(problems.some((p) => /Door teleports to "Nowhere"/.test(p)), problems.join('; '));
});

await test('a sound design passes validation', () => {
  const { map, manifest } = buildTemplate('obby', { name: 'Fine', seed: 5 });
  const problems = validateDesign({ name: 'Fine', settings: manifest.settings, map });
  assert.deepEqual(problems, []);
});

//------------------------------------------------------------------------------
// Dashboard API
//------------------------------------------------------------------------------

await test('the dashboard serves its page, catalog and project list', async () => {
  const server = http.createServer(createApp());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>forge<\/title>/);

    const catalog = await (await fetch(`${base}/api/catalog`)).json();
    assert.equal(catalog.templates.length, Object.keys(TEMPLATES).length);
    assert.ok(catalog.tags.some((tag) => tag.tag === 'ForgeCheckpoint'));

    const created = await (
      await fetch(`${base}/api/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'arena', name: 'Dash Arena', seed: 1 }),
      })
    ).json();
    assert.equal(created.name, 'Dash Arena');

    const list = await (await fetch(`${base}/api/projects`)).json();
    assert.ok(list.projects.some((p) => p.name === 'Dash Arena'));

    const built = await (
      await fetch(`${base}/api/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: created.id }),
      })
    ).json();
    assert.ok(built.stats.parts > 20);
    assert.ok(fs.existsSync(built.out));

    const status = await (await fetch(`${base}/api/status`)).json();
    assert.equal(status.linked, false);
    assert.equal(status.apiKey, '(not set)');

    const missing = await fetch(`${base}/api/nope`);
    assert.equal(missing.status, 404);
  } finally {
    server.close();
  }
});

await test('the dashboard refuses to escape its workspace', async () => {
  const server = http.createServer(createApp());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const id of ['../..', '/etc', 'a/../../b']) {
      const response = await fetch(`${base}/api/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      assert.equal(response.status, 400, `id ${id} should be refused`);
    }
  } finally {
    server.close();
  }
});

await test('deploying without a link fails before touching the network', async () => {
  const server = http.createServer(createApp());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/api/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'dash-arena' }),
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Link a Roblox place first/);
  } finally {
    server.close();
  }
});

//------------------------------------------------------------------------------
// Luau structure
//------------------------------------------------------------------------------

await test('every Luau file in the runtime has balanced blocks', async () => {
  const { checkBalance } = await import('./luau.js');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith('.lua')) files.push(child);
    }
  };
  for (const root of ['runtime', 'src']) walk(path.join(here, '..', root));

  assert.ok(files.length >= 11, `expected the runtime modules, found ${files.length}`);
  for (const file of files) {
    const report = checkBalance(fs.readFileSync(file, 'utf8'));
    assert.ok(
      report.balanced,
      `${path.basename(file)}: ${report.opens} block openers vs ${report.ends} ends, ` +
        `${report.repeats} repeat vs ${report.untils} until`,
    );
  }
});

await test('the balance check actually notices a missing end', async () => {
  const { checkBalance, stripLuau } = await import('./luau.js');
  assert.equal(checkBalance('local function f() return 1 end').balanced, true);
  assert.equal(checkBalance('local function f() return 1').balanced, false);
  assert.equal(checkBalance('if a then b() end end').balanced, false);
  assert.equal(checkBalance('if a then b() elseif c then d() end').balanced, true);
  assert.equal(checkBalance('repeat x() until y').balanced, true);
  // Keywords inside comments and strings must not count.
  assert.equal(checkBalance('local s = "function do then" -- end\nlocal t = 1').balanced, true);
  assert.equal(stripLuau('a --[[ function ]] b').includes('function'), false);
});

//------------------------------------------------------------------------------

fs.rmSync(sandbox, { recursive: true, force: true });

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? '  ok  ' : ' FAIL '} ${result.name}`);
  if (!result.ok) console.log(`        ${result.error.message.split('\n').join('\n        ')}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
