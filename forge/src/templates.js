// Playable starting points.
//
// A template returns a manifest (compiled into the Settings module) and a map
// (every brick, as data). Generation is seeded, so `forge new` twice with the
// same seed produces byte-identical places -- and a different seed produces a
// different course.

/** mulberry32 -- small, fast, and stable across Node versions. */
function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (random, list) => list[Math.floor(random() * list.length)];
const between = (random, min, max) => min + random() * (max - min);
const roundTo = (value, step = 1) => Math.round(value / step) * step;

const BASE_SHOP = [
  { id: 'speed1', name: 'Light Boots', description: '+4 walk speed', price: 150, kind: 'speed', value: 4 },
  { id: 'jump1', name: 'Spring Coil', description: '+15 jump power', price: 250, kind: 'jump', value: 15 },
  { id: 'speed2', name: 'Racing Shoes', description: '+8 walk speed', price: 600, kind: 'speed', value: 8 },
];

function manifest({ name, description, template, seed, settings }) {
  return {
    name,
    description,
    template,
    seed,
    createdAt: new Date().toISOString(),
    settings: {
      name,
      currency: { name: 'Coins', start: 0, multiplier: 1 },
      showWins: true,
      respawnTime: 3,
      save: { enabled: true, store: 'ForgeSave_v1', autosaveSeconds: 120, studio: false },
      ...settings,
    },
  };
}

//------------------------------------------------------------------------------
// Obby: stages of platforms, hazards, coins and checkpoints.
//------------------------------------------------------------------------------

function obby({ name, seed, stages = 6 }) {
  const random = rng(seed);
  const parts = [];
  const palette = ['#4f8ff7', '#f77f4f', '#6fd66f', '#c86fd6', '#e8c34f', '#4fd6c8'];

  parts.push({
    name: 'StartPad',
    size: [40, 2, 40],
    position: [0, 0, -30],
    color: '#2f3a4a',
    material: 'Slate',
    folder: 'Start',
  });
  parts.push({
    name: 'Spawn',
    className: 'SpawnLocation',
    size: [12, 1, 12],
    position: [0, 1.5, -30],
    color: '#4f8ff7',
    material: 'Neon',
    folder: 'Start',
    tags: ['ForgeStart'],
  });

  let z = 0;
  let y = 0;
  const hazards = ['gap', 'kill', 'conveyor', 'platform', 'narrow', 'jump', 'speed'];

  for (let stage = 1; stage <= stages; stage += 1) {
    const folder = `Stage${stage}`;
    const color = palette[(stage - 1) % palette.length];
    const obstacles = 4 + Math.floor(random() * 3);

    for (let step = 0; step < obstacles; step += 1) {
      const kind = stage === 1 && step < 2 ? 'gap' : pick(random, hazards);
      const drift = roundTo(between(random, -10, 10), 2);

      if (kind === 'kill') {
        z += 14;
        parts.push({
          name: `Lava_${stage}_${step}`,
          size: [16, 1, 10],
          position: [drift, y, z],
          color: '#e34a2f',
          material: 'Neon',
          folder,
          tags: ['ForgeKill'],
        });
        z += 12;
        parts.push({ name: `Path_${stage}_${step}`, size: [14, 1, 8], position: [drift, y, z], color, material: 'SmoothPlastic', folder });
      } else if (kind === 'conveyor') {
        z += 16;
        parts.push({
          name: `Conveyor_${stage}_${step}`,
          size: [10, 1, 34],
          position: [drift, y, z + 10],
          color: '#3f4f6f',
          material: 'Metal',
          folder,
          tags: ['ForgeConveyor'],
          data: { speed: 18, direction: [0, 0, 1] },
        });
        z += 34;
      } else if (kind === 'platform') {
        z += 18;
        parts.push({
          name: `Mover_${stage}_${step}`,
          size: [10, 1, 10],
          position: [drift, y, z],
          color: '#9f7fe8',
          material: 'SmoothPlastic',
          folder,
          tags: ['ForgePlatform'],
          data: { offset: [roundTo(between(random, -24, 24)), 0, 0], period: roundTo(between(random, 4, 8)) },
        });
        z += 16;
        parts.push({ name: `Path_${stage}_${step}`, size: [12, 1, 8], position: [drift, y, z], color, material: 'SmoothPlastic', folder });
      } else if (kind === 'narrow') {
        z += 14;
        parts.push({ name: `Beam_${stage}_${step}`, size: [2.5, 1, 30], position: [drift, y, z + 12], color, material: 'Wood', folder });
        z += 30;
      } else if (kind === 'jump') {
        z += 14;
        parts.push({
          name: `JumpPad_${stage}_${step}`,
          size: [8, 1, 8],
          position: [drift, y, z],
          color: '#4fe8a0',
          material: 'Neon',
          folder,
          tags: ['ForgeJumpPad'],
          data: { power: 130 },
        });
        y += 12;
        z += 22;
        parts.push({ name: `Ledge_${stage}_${step}`, size: [14, 1, 10], position: [drift, y, z], color, material: 'SmoothPlastic', folder });
      } else if (kind === 'speed') {
        z += 14;
        parts.push({
          name: `SpeedPad_${stage}_${step}`,
          size: [8, 1, 12],
          position: [drift, y, z],
          color: '#4fd6ff',
          material: 'Neon',
          folder,
          tags: ['ForgeSpeedPad'],
          data: { bonus: 14, duration: 5 },
        });
        z += 26;
        parts.push({ name: `Path_${stage}_${step}`, size: [12, 1, 10], position: [drift, y, z], color, material: 'SmoothPlastic', folder });
      } else {
        z += roundTo(between(random, 16, 26), 2);
        parts.push({
          name: `Jump_${stage}_${step}`,
          size: [roundTo(between(random, 7, 13)), 1, roundTo(between(random, 7, 12))],
          position: [drift, y, z],
          color,
          material: 'SmoothPlastic',
          folder,
        });
      }

      if (random() < 0.55) {
        parts.push({
          name: `Coin_${stage}_${step}`,
          size: [2.5, 2.5, 0.5],
          position: [drift, y + 4, z],
          rotation: [0, 0, 0],
          color: '#ffd24f',
          material: 'Neon',
          shape: 'Cylinder',
          canCollide: false,
          folder,
          tags: ['ForgeCoin', 'ForgeSpinner'],
          data: { value: 5 + stage * 2, respawn: 10, speed: 90 },
        });
      }
    }

    z += 22;
    parts.push({
      name: `Checkpoint${stage}`,
      size: [18, 2, 18],
      position: [0, y, z],
      color: '#2fe08f',
      material: 'Neon',
      folder,
      tags: ['ForgeCheckpoint'],
      data: { order: stage, reward: 25 * stage },
    });
    z += 16;
  }

  parts.push({
    name: 'WinPad',
    size: [26, 2, 26],
    position: [0, y, z + 10],
    color: '#ffd24f',
    material: 'Neon',
    folder: 'Finish',
    tags: ['ForgeWin'],
    data: { value: 250 },
  });

  return {
    manifest: manifest({
      name,
      description: `A ${stages}-stage obby with checkpoints, hazards and collectable coins.`,
      template: 'obby',
      seed,
      settings: {
        systems: ['Save', 'Leaderstats', 'Economy', 'Tags', 'Shop'],
        checkpoints: { enabled: true, reward: 25, resetOnWin: true },
        coins: { value: 5, respawn: 10 },
        shop: { items: BASE_SHOP },
      },
    }),
    map: { lighting: { timeOfDay: '15:00:00', brightness: 2.2 }, parts },
  };
}

//------------------------------------------------------------------------------
// Tycoon: a plot each, droppers you unlock, a conveyor that pays out.
//------------------------------------------------------------------------------

function tycoon({ name, seed, plots = 4 }) {
  const random = rng(seed);
  const parts = [];
  const spacing = 180;
  const columns = 2;

  parts.push({
    name: 'Ground',
    size: [spacing * columns + 120, 2, spacing * Math.ceil(plots / columns) + 120],
    position: [spacing / 2, -1, spacing / 2],
    color: '#3f5f3f',
    material: 'Grass',
  });

  for (let index = 1; index <= plots; index += 1) {
    const column = (index - 1) % columns;
    const row = Math.floor((index - 1) / columns);
    const ox = column * spacing;
    const oz = row * spacing;
    const folder = `Plot${index}`;
    const accent = pick(random, ['#4f8ff7', '#f77f4f', '#6fd66f', '#c86fd6']);

    parts.push({
      name: `PlotFloor${index}`,
      size: [120, 2, 120],
      position: [ox, 0, oz],
      color: '#54606f',
      material: 'Concrete',
      folder,
      tags: ['ForgePlot'],
      data: { index },
    });
    parts.push({
      name: `PlotSpawn${index}`,
      className: 'SpawnLocation',
      size: [10, 1, 10],
      position: [ox, 1.5, oz - 48],
      color: accent,
      material: 'Neon',
      folder,
      tags: ['ForgeStart'],
    });

    // A conveyor that carries drops into the collector.
    parts.push({
      name: `Belt${index}`,
      size: [16, 1, 90],
      position: [ox + 30, 4, oz],
      color: '#2f3a4a',
      material: 'Metal',
      folder,
      tags: ['ForgeConveyor'],
      data: { speed: 26, direction: [0, 0, -1] },
    });
    parts.push({
      name: `Collector${index}`,
      size: [18, 8, 6],
      position: [ox + 30, 6, oz - 48],
      color: '#2fe08f',
      material: 'Neon',
      folder,
      tags: ['ForgeCollector'],
      data: { plot: index },
    });

    // Three droppers; the first is free, the rest are bought at buttons.
    const tiers = [
      { value: 2, interval: 2.0, cost: 0 },
      { value: 8, interval: 2.4, cost: 400 },
      { value: 26, interval: 3.0, cost: 2500 },
    ];
    tiers.forEach((tier, tierIndex) => {
      const dropperName = `Dropper${index}_${tierIndex + 1}`;
      parts.push({
        name: dropperName,
        size: [12, 10, 12],
        position: [ox + 30, 14, oz + 30 - tierIndex * 26],
        color: tierIndex === 0 ? accent : '#6f7787',
        material: tierIndex === 0 ? 'Neon' : 'Metal',
        folder,
        tags: ['ForgeDropper'],
        data: { plot: index, value: tier.value, interval: tier.interval, locked: tier.cost > 0, lifetime: 25 },
      });
      if (tier.cost > 0) {
        parts.push({
          name: `Buy${index}_${tierIndex + 1}`,
          size: [8, 4, 8],
          position: [ox - 10, 2, oz + 30 - tierIndex * 26],
          color: '#ffd24f',
          material: 'Neon',
          folder,
          tags: ['ForgeBuy'],
          data: { plot: index, cost: tier.cost, unlocks: dropperName },
        });
      }
    });
  }

  return {
    manifest: manifest({
      name,
      description: `A ${plots}-plot tycoon: claim a plot, buy droppers, collect the payout.`,
      template: 'tycoon',
      seed,
      settings: {
        systems: ['Save', 'Leaderstats', 'Economy', 'Tags', 'Shop', 'Plots'],
        currency: { name: 'Cash', start: 0, multiplier: 1 },
        shop: { items: BASE_SHOP },
      },
    }),
    map: { lighting: { timeOfDay: '13:00:00' }, parts },
  };
}

//------------------------------------------------------------------------------
// Simulator: fill a backpack in the zones, sell it at the hub, buy upgrades.
//------------------------------------------------------------------------------

function simulator({ name, seed, zones = 3 }) {
  const random = rng(seed);
  const parts = [];

  parts.push({ name: 'Hub', size: [90, 2, 90], position: [0, 0, 0], color: '#3a4454', material: 'Slate', folder: 'Hub' });
  parts.push({
    name: 'Spawn',
    className: 'SpawnLocation',
    size: [12, 1, 12],
    position: [0, 1.5, 20],
    color: '#4f8ff7',
    material: 'Neon',
    folder: 'Hub',
    tags: ['ForgeStart'],
  });
  parts.push({
    name: 'SellPad',
    size: [20, 1, 20],
    position: [0, 1.5, -24],
    color: '#2fe08f',
    material: 'Neon',
    folder: 'Hub',
    tags: ['ForgeSell'],
    data: { rate: 3 },
  });

  const zoneSpecs = [
    { label: 'Meadow', color: '#6fd66f', orb: '#b7f07f', value: 1, radius: 70, angle: 0 },
    { label: 'Cavern', color: '#6f7fd6', orb: '#9fb7ff', value: 3, radius: 70, angle: 120 },
    { label: 'Volcano', color: '#d66f4f', orb: '#ffb07f', value: 8, radius: 70, angle: 240 },
    { label: 'Void', color: '#8f4fd6', orb: '#d79fff', value: 20, radius: 70, angle: 60 },
  ];

  for (let index = 0; index < Math.min(zones, zoneSpecs.length); index += 1) {
    const zone = zoneSpecs[index];
    const folder = zone.label;
    const radians = (zone.angle * Math.PI) / 180;
    const cx = roundTo(Math.cos(radians) * 150, 2);
    const cz = roundTo(Math.sin(radians) * 150, 2);

    parts.push({
      name: `${zone.label}Floor`,
      size: [110, 2, 110],
      position: [cx, index * 6, cz],
      color: zone.color,
      material: 'Slate',
      folder,
    });
    parts.push({
      name: `${zone.label}Bridge`,
      size: [10, 1, 120],
      position: [roundTo(cx / 2, 2), index * 3, roundTo(cz / 2, 2)],
      rotation: [0, roundTo(-zone.angle + 90), 0],
      color: '#54606f',
      material: 'WoodPlanks',
      folder,
    });

    const orbs = 12 + index * 4;
    for (let orb = 0; orb < orbs; orb += 1) {
      const theta = (orb / orbs) * Math.PI * 2;
      const distance = between(random, 14, 46);
      parts.push({
        name: `${zone.label}Orb_${orb + 1}`,
        size: [3, 3, 3],
        position: [roundTo(cx + Math.cos(theta) * distance, 1), index * 6 + 4, roundTo(cz + Math.sin(theta) * distance, 1)],
        color: zone.orb,
        material: 'Neon',
        shape: 'Ball',
        canCollide: false,
        folder,
        tags: ['ForgeOrb'],
        data: { value: zone.value, respawn: 5 },
      });
    }
  }

  return {
    manifest: manifest({
      name,
      description: 'A collect-and-sell simulator: fill the backpack, sell at the hub, upgrade, repeat.',
      template: 'simulator',
      seed,
      settings: {
        systems: ['Save', 'Leaderstats', 'Economy', 'Tags', 'Shop'],
        backpack: { capacity: 25, rate: 3 },
        shop: {
          items: [
            { id: 'bag1', name: 'Bigger Bag', description: '+25 carry capacity', price: 200, kind: 'capacity', value: 25 },
            { id: 'mult1', name: 'Sell Boost', description: '+50% sell value', price: 750, kind: 'multiplier', value: 0.5 },
            { id: 'bag2', name: 'Huge Bag', description: '+100 carry capacity', price: 2000, kind: 'capacity', value: 100 },
            ...BASE_SHOP,
          ],
        },
      },
    }),
    map: { lighting: { timeOfDay: '16:00:00' }, parts },
  };
}

//------------------------------------------------------------------------------
// Arena: lobby, then a round in the pit. Last one standing wins.
//------------------------------------------------------------------------------

function arena({ name, seed, fighters = 8 }) {
  const random = rng(seed);
  const parts = [];

  parts.push({ name: 'Lobby', size: [70, 2, 70], position: [0, 40, -200], color: '#3a4454', material: 'Slate', folder: 'Lobby' });
  for (let index = 0; index < 4; index += 1) {
    parts.push({
      name: `LobbySpawn${index + 1}`,
      className: 'SpawnLocation',
      size: [8, 1, 8],
      position: [-20 + index * 14, 41.5, -200],
      color: '#4f8ff7',
      material: 'Neon',
      folder: 'Lobby',
      tags: ['ForgeLobbySpawn', 'ForgeStart'],
    });
  }

  parts.push({ name: 'ArenaFloor', size: [180, 2, 180], position: [0, 40, 0], color: '#54606f', material: 'Concrete', folder: 'Arena' });
  parts.push({
    name: 'Pit',
    size: [400, 2, 400],
    position: [0, -10, 0],
    color: '#e34a2f',
    material: 'Neon',
    folder: 'Arena',
    tags: ['ForgeKill'],
  });

  for (let index = 0; index < fighters; index += 1) {
    const theta = (index / fighters) * Math.PI * 2;
    parts.push({
      name: `ArenaSpawn${index + 1}`,
      size: [8, 1, 8],
      position: [roundTo(Math.cos(theta) * 70, 1), 41.5, roundTo(Math.sin(theta) * 70, 1)],
      color: '#ffd24f',
      material: 'Neon',
      canCollide: false,
      folder: 'Arena',
      tags: ['ForgeArenaSpawn'],
    });
  }

  // Cover, plus a couple of hazards to break stalemates.
  for (let index = 0; index < 10; index += 1) {
    parts.push({
      name: `Cover_${index + 1}`,
      size: [roundTo(between(random, 8, 18)), roundTo(between(random, 6, 14)), roundTo(between(random, 6, 14))],
      position: [roundTo(between(random, -70, 70), 1), 44, roundTo(between(random, -70, 70), 1)],
      color: '#6f7787',
      material: 'Concrete',
      folder: 'Arena',
    });
  }
  for (let index = 0; index < 4; index += 1) {
    const theta = (index / 4) * Math.PI * 2 + 0.4;
    parts.push({
      name: `Hazard_${index + 1}`,
      size: [22, 1, 22],
      position: [roundTo(Math.cos(theta) * 45, 1), 41.2, roundTo(Math.sin(theta) * 45, 1)],
      color: '#e37a2f',
      material: 'Neon',
      folder: 'Arena',
      tags: ['ForgeDamage'],
      data: { damage: 12, cooldown: 0.8 },
    });
  }
  parts.push({
    name: 'Medkit',
    size: [8, 1, 8],
    position: [0, 41.2, 0],
    color: '#2fe08f',
    material: 'Neon',
    folder: 'Arena',
    tags: ['ForgeHeal'],
    data: { cooldown: 20 },
  });

  return {
    manifest: manifest({
      name,
      description: 'Round-based arena: intermission in the lobby, then last one standing in the pit.',
      template: 'arena',
      seed,
      settings: {
        systems: ['Save', 'Leaderstats', 'Economy', 'Tags', 'Shop', 'Rounds'],
        rounds: { enabled: true, intermission: 15, duration: 120, minPlayers: 2, reward: 150 },
        shop: { items: BASE_SHOP },
      },
    }),
    map: { lighting: { timeOfDay: '19:30:00', brightness: 1.6, outdoorAmbient: '#4a4a60' }, parts },
  };
}

export const TEMPLATES = {
  obby: { label: 'Obby', blurb: 'Staged obstacle course with checkpoints, hazards and coins.', build: obby },
  tycoon: { label: 'Tycoon', blurb: 'Claimable plots, droppers you unlock, conveyor payouts.', build: tycoon },
  simulator: { label: 'Simulator', blurb: 'Collect orbs, sell at the hub, buy upgrades, repeat.', build: simulator },
  arena: { label: 'Arena', blurb: 'Round-based last-one-standing with a lobby and a lava pit.', build: arena },
};

export function buildTemplate(templateName, options = {}) {
  const template = TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Unknown template "${templateName}". Available: ${Object.keys(TEMPLATES).join(', ')}`);
  }
  const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);
  return template.build({ name: options.name ?? template.label, ...options, seed });
}
