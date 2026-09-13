// Where forge keeps the link to your Roblox place.
//
// The Open Cloud API key is a secret with write access to a live experience, so
// it is stored outside the repository, in a 0600 file under the home directory,
// and it is never sent anywhere except apis.roblox.com.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CONFIG_DIR = process.env.FORGE_HOME || path.join(os.homedir(), '.roblox-forge');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const EMPTY = { apiKey: '', universeId: '', placeId: '', lastPublishedVersion: null, projects: {} };

export function loadConfig() {
  let stored = {};
  try {
    stored = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Could not read ${CONFIG_PATH}: ${error.message}`);
    }
  }
  const config = { ...EMPTY, ...stored };
  // Environment variables win, so CI and one-off shells never need the file.
  if (process.env.ROBLOX_API_KEY) config.apiKey = process.env.ROBLOX_API_KEY;
  if (process.env.ROBLOX_UNIVERSE_ID) config.universeId = process.env.ROBLOX_UNIVERSE_ID;
  if (process.env.ROBLOX_PLACE_ID) config.placeId = process.env.ROBLOX_PLACE_ID;
  return config;
}

export function saveConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const { ...persisted } = config;
  // Don't write back values that only came from the environment.
  if (process.env.ROBLOX_API_KEY && persisted.apiKey === process.env.ROBLOX_API_KEY) persisted.apiKey = '';
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(persisted, null, 2)}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(CONFIG_PATH, 0o600);
  } catch {
    // Best effort -- some filesystems (e.g. mounted Windows shares) refuse.
  }
  return CONFIG_PATH;
}

export function updateConfig(patch) {
  const config = { ...loadConfig(), ...patch };
  saveConfig(config);
  return config;
}

export function maskKey(key) {
  if (!key) return '(not set)';
  if (key.length <= 12) return `${key.slice(0, 2)}...`;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export function isLinked(config = loadConfig()) {
  return Boolean(config.apiKey && config.universeId && config.placeId);
}
