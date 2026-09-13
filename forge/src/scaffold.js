// Creating a project on disk: template output plus a copy of the Luau runtime.
//
// The runtime is copied rather than referenced, so a generated game is
// self-contained -- you can edit any module in it without touching forge.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTemplate, TEMPLATES } from './templates.js';
import { MANIFEST_NAME, MAP_NAME } from './project.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const RUNTIME_DIR = path.join(here, '..', 'runtime');

function copyLua(fromDir, toDir) {
  fs.mkdirSync(toDir, { recursive: true });
  if (!fs.existsSync(fromDir)) return [];
  const copied = [];
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.lua')) {
      fs.copyFileSync(path.join(fromDir, entry.name), path.join(toDir, entry.name));
      copied.push(entry.name);
    }
  }
  return copied;
}

export function writeRuntime(projectDir) {
  const src = path.join(projectDir, 'src');
  return {
    shared: copyLua(path.join(RUNTIME_DIR, 'shared'), path.join(src, 'shared')),
    serverModules: copyLua(path.join(RUNTIME_DIR, 'server', 'modules'), path.join(src, 'server', 'modules')),
    server: copyLua(path.join(RUNTIME_DIR, 'server'), path.join(src, 'server')),
    client: copyLua(path.join(RUNTIME_DIR, 'client'), path.join(src, 'client')),
  };
}

function projectReadme(manifest) {
  return `# ${manifest.name}

${manifest.description}

Built by [forge](../README.md) from the \`${manifest.template}\` template (seed \`${manifest.seed}\`).

## Working on it

\`\`\`sh
forge build .          # compile to build/place.rbxlx
forge deploy .         # compile and publish to the linked place
forge iterate . "add a moving platform section before the last checkpoint"
\`\`\`

## Layout

| Path | Becomes |
| --- | --- |
| \`${MANIFEST_NAME}\` | \`ReplicatedStorage.Forge.Settings\` |
| \`${MAP_NAME}\` | Every brick in \`Workspace.Map\`, plus \`ReplicatedStorage.Forge.MapData\` |
| \`src/server/*.server.lua\` | \`ServerScriptService\` scripts |
| \`src/server/modules/*.lua\` | \`ServerScriptService.Forge\` modules |
| \`src/client/*.client.lua\` | \`StarterPlayerScripts\` scripts |
| \`src/shared/*.lua\` | \`ReplicatedStorage.Forge\` modules |

Bricks carry no scripts. A brick becomes interactive by listing a tag in
\`map.json\` -- \`ForgeKill\`, \`ForgeCheckpoint\`, \`ForgeCoin\`, \`ForgeConveyor\`,
\`ForgePlatform\`, \`ForgeJumpPad\`, \`ForgeSpeedPad\`, \`ForgeOrb\`, \`ForgeSell\`,
\`ForgeWin\`, \`ForgeDamage\`, \`ForgeHeal\`, \`ForgeTeleport\`, \`ForgeSpinner\`,
\`ForgePlot\`, \`ForgeDropper\`, \`ForgeCollector\`, \`ForgeBuy\`,
\`ForgeLobbySpawn\`, \`ForgeArenaSpawn\` -- and the behaviour lives in
\`src/server/modules/Tags.lua\`.
`;
}

/**
 * Scaffold a new project directory.
 * @returns {{dir: string, manifest: object, files: object}}
 */
export function createProject(dir, { template = 'obby', name, seed, force = false, ...options } = {}) {
  const target = path.resolve(dir);
  if (fs.existsSync(path.join(target, MANIFEST_NAME)) && !force) {
    throw new Error(`${target} already contains a forge project. Pass --force to overwrite it.`);
  }
  if (!TEMPLATES[template]) {
    throw new Error(`Unknown template "${template}". Available: ${Object.keys(TEMPLATES).join(', ')}`);
  }

  const projectName = name || path.basename(target).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const { manifest, map } = buildTemplate(template, { name: projectName, seed, ...options });

  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(target, MAP_NAME), `${JSON.stringify(map, null, 2)}\n`);
  fs.writeFileSync(path.join(target, 'README.md'), projectReadme(manifest));
  fs.writeFileSync(path.join(target, '.gitignore'), 'build/\n');

  const files = writeRuntime(target);
  return { dir: target, manifest, files };
}
