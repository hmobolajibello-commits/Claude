// `forge doctor` -- find which part of a place file Roblox refuses.
//
// Roblox answers a rejected upload with 400 "Invalid Content stream" and no
// detail about what it disliked. Rather than guess, this uploads a sequence of
// places that grow one feature at a time and reports the first that fails. Each
// one goes up as a Saved version, so the live game is never touched.

import { instance, serializePlace, MATERIALS, SHAPES, SURFACES } from './rbxlx.js';
import { buildPlace } from './project.js';

const part = (name, extra = {}) =>
  instance('Part', {
    Name: name,
    Size: [20, 1, 20],
    CFrame: { position: [0, 5, 0], rotation: [0, 0, 0] },
    Color: '#a3a2a5',
    Material: MATERIALS.Plastic,
    Shape: SHAPES.Block,
    Anchored: true,
    CanCollide: true,
    Transparency: 0,
    TopSurface: SURFACES.Smooth,
    BottomSurface: SURFACES.Smooth,
    ...extra,
  });

const spawn = () =>
  instance('SpawnLocation', {
    Name: 'SpawnLocation',
    Size: [12, 1, 12],
    CFrame: { position: [0, 7, 0], rotation: [0, 0, 0] },
    Color: '#4f8ff7',
    Material: MATERIALS.Plastic,
    Anchored: true,
    CanCollide: true,
    Transparency: 0,
    TopSurface: SURFACES.Smooth,
    BottomSurface: SURFACES.Smooth,
    Neutral: true,
    Duration: 0,
    AllowTeamChangeOnTouch: false,
  });

/**
 * Each stage is a complete place, adding exactly one thing to the one before,
 * so the first failure names the feature Roblox rejects.
 */
export function stages(project) {
  const list = [
    {
      id: 'workspace',
      what: 'a Workspace and nothing else',
      xml: () => serializePlace([instance('Workspace', { Name: 'Workspace' })]),
    },
    {
      id: 'part',
      what: 'one anchored Part',
      xml: () => serializePlace([instance('Workspace', { Name: 'Workspace' }, [part('Baseplate')])]),
    },
    {
      id: 'spawn',
      what: 'a Part and a SpawnLocation',
      xml: () => serializePlace([instance('Workspace', { Name: 'Workspace' }, [part('Baseplate'), spawn()])]),
    },
    {
      id: 'folder',
      what: 'parts nested inside Folders',
      xml: () =>
        serializePlace([
          instance('Workspace', { Name: 'Workspace' }, [
            instance('Folder', { Name: 'Map' }, [instance('Folder', { Name: 'Stage1' }, [part('Baseplate'), spawn()])]),
          ]),
        ]),
    },
    {
      id: 'services',
      what: 'the other services forge writes',
      xml: () =>
        serializePlace([
          instance('Workspace', { Name: 'Workspace' }, [part('Baseplate'), spawn()]),
          instance('Lighting', { Name: 'Lighting', Brightness: 2 }),
          instance('ReplicatedStorage', { Name: 'ReplicatedStorage' }),
          instance('ServerScriptService', { Name: 'ServerScriptService' }),
          instance('ServerStorage', { Name: 'ServerStorage' }),
          instance('StarterGui', { Name: 'StarterGui' }),
          instance('StarterPlayer', { Name: 'StarterPlayer' }, [
            instance('StarterPlayerScripts', { Name: 'StarterPlayerScripts' }),
            instance('StarterCharacterScripts', { Name: 'StarterCharacterScripts' }),
          ]),
          instance('Players', { Name: 'Players', RespawnTime: 3 }),
          instance('SoundService', { Name: 'SoundService' }),
          instance('Teams', { Name: 'Teams' }),
        ]),
    },
    {
      id: 'script',
      what: 'a Script carrying Luau source',
      xml: () =>
        serializePlace([
          instance('Workspace', { Name: 'Workspace' }, [part('Baseplate'), spawn()]),
          instance('ServerScriptService', { Name: 'ServerScriptService' }, [
            instance('Script', { Name: 'Hello', Source: 'print("hello from forge")\n' }),
          ]),
        ]),
    },
    {
      id: 'modules',
      what: 'a ModuleScript and a LocalScript',
      xml: () =>
        serializePlace([
          instance('Workspace', { Name: 'Workspace' }, [part('Baseplate'), spawn()]),
          instance('ReplicatedStorage', { Name: 'ReplicatedStorage' }, [
            instance('ModuleScript', { Name: 'Settings', Source: 'return { name = "forge" }\n' }),
          ]),
          instance('StarterPlayer', { Name: 'StarterPlayer' }, [
            instance('StarterPlayerScripts', { Name: 'StarterPlayerScripts' }, [
              instance('LocalScript', { Name: 'Hud', Source: 'print("client")\n' }),
            ]),
          ]),
        ]),
    },
  ];

  if (project) {
    list.push({ id: 'full', what: 'the complete generated place', xml: () => buildPlace(project).xml });
  }
  return list;
}

/**
 * Upload each stage until one fails.
 * @returns {Promise<Array<{id, what, bytes, ok, status?, message?}>>}
 */
export async function runDoctor(client, { project, onStage } = {}) {
  const results = [];

  for (const stage of stages(project)) {
    const xml = stage.xml();
    const bytes = Buffer.byteLength(xml, 'utf8');
    onStage?.({ ...stage, bytes, phase: 'start' });

    try {
      const result = await client.publishPlace(xml, { versionType: 'Saved' });
      const entry = { id: stage.id, what: stage.what, bytes, ok: true, version: result.versionNumber };
      results.push(entry);
      onStage?.({ ...entry, phase: 'done' });
    } catch (error) {
      const entry = {
        id: stage.id,
        what: stage.what,
        bytes,
        ok: false,
        status: error.status,
        message: error.message,
        xml,
      };
      results.push(entry);
      onStage?.({ ...entry, phase: 'done' });
      break;
    }
  }

  return results;
}
