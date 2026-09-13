// The vocabulary a map can use. This is the contract between map.json and
// src/server/modules/Tags.lua, and it is what the model is told it may use.

export const TAG_CATALOG = [
  { tag: 'ForgeStart', what: 'Marks the starting spawn area.', data: {} },
  { tag: 'ForgeKill', what: 'Kills anyone who touches it (lava, spikes, the void floor).', data: {} },
  { tag: 'ForgeDamage', what: 'Damages on touch, with a cooldown.', data: { damage: 10, cooldown: 1 } },
  { tag: 'ForgeHeal', what: 'Heals to full on touch.', data: { cooldown: 3 } },
  { tag: 'ForgeCheckpoint', what: 'Saves progress; the player respawns here.', data: { order: 1, reward: 25 } },
  { tag: 'ForgeCoin', what: 'Collectable currency; disappears then returns.', data: { value: 5, respawn: 8 } },
  { tag: 'ForgeOrb', what: 'Fills the backpack instead of paying out directly (simulator loop).', data: { value: 1, respawn: 4 } },
  { tag: 'ForgeSell', what: 'Converts a carried backpack into currency.', data: { rate: 3 } },
  { tag: 'ForgeWin', what: 'Finish line: pays out, counts a win, sends the player back to the start.', data: { value: 250 } },
  { tag: 'ForgeJumpPad', what: 'Launches the player upward.', data: { power: 120 } },
  { tag: 'ForgeSpeedPad', what: 'Temporary walk-speed boost.', data: { bonus: 12, duration: 5 } },
  { tag: 'ForgeConveyor', what: 'Pushes anything standing on it.', data: { speed: 20, direction: [0, 0, 1] } },
  { tag: 'ForgePlatform', what: 'Slides back and forth, carrying riders.', data: { offset: [0, 0, 24], period: 6 } },
  { tag: 'ForgeSpinner', what: 'Spins in place (decorative; pairs well with ForgeCoin).', data: { speed: 60 } },
  { tag: 'ForgeTeleport', what: 'Teleports the toucher to the named brick.', data: { target: 'SomePartName' } },
  { tag: 'ForgePlot', what: 'A tycoon plot floor, claimed by one player.', data: { index: 1 } },
  { tag: 'ForgeDropper', what: 'Spawns paying drops for its plot.', data: { plot: 1, value: 2, interval: 2, locked: false } },
  { tag: 'ForgeCollector', what: 'Collects drops and pays the plot owner.', data: { plot: 1 } },
  { tag: 'ForgeBuy', what: 'Purchase button that unlocks a named dropper.', data: { plot: 1, cost: 400, unlocks: 'Dropper1_2' } },
  { tag: 'ForgeLobbySpawn', what: 'Where players wait between arena rounds.', data: {} },
  { tag: 'ForgeArenaSpawn', what: 'Where fighters are placed when a round starts.', data: {} },
];

export const SYSTEMS = {
  Save: 'DataStore-backed profiles. Required by everything else.',
  Leaderstats: 'Shows currency and wins in the player list.',
  Economy: 'Currency awards, spending, and HUD pushes.',
  Tags: 'Runs every map tag listed above.',
  Shop: 'Server-authoritative shop for settings.shop.items.',
  Plots: 'Tycoon plot claiming, droppers, collectors, buy buttons.',
  Rounds: 'Arena round loop driven by settings.rounds.',
};

export function catalogForPrompt() {
  const tags = TAG_CATALOG.map(
    (entry) => `- ${entry.tag}: ${entry.what} data: ${JSON.stringify(entry.data)}`,
  ).join('\n');
  const systems = Object.entries(SYSTEMS).map(([name, what]) => `- ${name}: ${what}`).join('\n');
  return { tags, systems };
}
