// WARDEN WARS — maps (iteration 3a). Grid 9 x 13 tiles of T=40 logical px. Coords are [col,row].
'use strict';
const MAP_COLS = 9, MAP_ROWS = 13, MAP_H = MAP_ROWS * T; // 520
// Wave plans. R: build 1.0, breather 0.7, spike 1.35, boss 2.2. cp = checkpoint wave (run saved, 30s lead-in timer).
const R_OF = { build: 1.0, breather: 0.8, spike: 1.45, boss: 2.2 };
const MAPS = {
  glacier: {
    key: 'glacier', name: 'Glacier Pass', home: 'stone', M: 1.45, bossK: 0.75, theme: 'snow',
    howto: 'Harpies and Moths fly straight over the pass: build Gale Harpoons or Icefang Spires. Tap the cornice (top right) to drop the avalanche early.',
    blurb: 'A frozen pass above Rimehold. Ice lanes speed the Hollow up 30%. Every 4th wave the cornice drops an avalanche.',
    routes: [[[4, 0], [4, 1], [1, 1], [1, 4], [7, 4], [7, 7], [2, 7], [2, 10], [6, 10], [6, 12]]],
    ice: [[[1, 4], [7, 4]], [[2, 10], [6, 10]]], // +30% speed segments
    pads: [[2, 2], [5, 2], [0, 3], [3, 3], [3, 5], [5, 5], [8, 5], [6, 6], [1, 6], [0, 8], [3, 8], [5, 8], [8, 8], [4, 9], [1, 11], [4, 11], [7, 11], [7, 9]],
    hero: [4, 6],
    avalanche: { every: 4, telegraph: 3, dmg: 120, stun: 2, pads: [6, 7], cornice: [8, 3], zone: { c: 7, r: 5.5, rad: 62 }, at: 9 },
    waves: [
      { t: 'build', mix: { husk: 1 } },
      { t: 'build', mix: { husk: 0.6, ling: 0.4 } },
      { t: 'spike', mix: { ling: 0.5, husk: 0.3, harpy: 0.2 }, mini: 'shard' },
      { t: 'breather', cp: true, mix: { husk: 0.6, harpy: 0.4 } },
      { t: 'build', mix: { husk: 0.4, shard: 0.35, ling: 0.25 } },
      { t: 'spike', mix: { ling: 0.35, harpy: 0.25, siren: 0.2, husk: 0.2 }, mini: 'siren' },
      { t: 'breather', cp: true, mix: { husk: 0.5, moth: 0.5 } },
      { t: 'boss', mix: { husk: 0.5, harpy: 0.25, ling: 0.25 }, boss: 'herald' },
    ],
    boost: { 4: 1.1, 5: 1.1 }, // Kai: +10% budget on Glacier waves 4-5
    stakes: [2, 5, 7], // 0-based wave indices that offer a stake
  },
  foundry: {
    key: 'foundry', name: 'Foundry Row', home: 'forge', M: 1.35, bossK: 1.45, bossKFac: { stone: 0.9, forge: 1.3 }, theme: 'foundry',
    howto: 'Vents on Street A scald the Hollow every 8s and cool nearby towers. Cover Street B too: half of every wave takes it. Flak Gargoyles for flyers.',
    blurb: 'Ashgate\u2019s furnace streets. The road forks: Street A is short with 3 steam vents, Street B is long. The Hollow alternate and merge at X.',
    routes: [
      [[4, 0], [4, 2], [4, 8], [4, 10], [1, 10], [1, 12]],                       // Street A (short)
      [[4, 0], [4, 2], [7, 2], [7, 8], [4, 8], [4, 10], [1, 10], [1, 12]],       // Street B (long)
    ],
    fork: [4, 2], merge: [4, 8],
    vents: [[4, 3.5], [4, 5], [4, 6.5]], vent: { every: 8, dur: 2, dps: 25, rad: 30, heatCut: 0.3, near: 62 },
    pads: [[2, 1], [5, 1], [3, 3], [5, 3], [3, 5], [5, 5], [3, 7], [5, 7], [6, 4], [8, 3], [8, 6], [6, 6], [2, 9], [5, 9], [3, 11], [0, 11], [2, 12], [8, 9]],
    hero: [2, 6],
    waves: [
      { t: 'build', mix: { husk: 1 } },
      { t: 'build', mix: { husk: 0.6, ling: 0.4 } },
      { t: 'spike', mix: { ling: 0.5, husk: 0.3, harpy: 0.2 }, mini: 'shard' },
      { t: 'breather', cp: true, mix: { husk: 0.6, harpy: 0.4 } },
      { t: 'build', mix: { husk: 0.4, shard: 0.35, ling: 0.25 } },
      { t: 'build', mix: { ling: 0.4, harpy: 0.3, husk: 0.3 } },
      { t: 'spike', mix: { ling: 0.3, siren: 0.2, harpy: 0.25, moth: 0.25 }, mini: 'siren', flyCut: 0.3 },
      { t: 'breather', cp: true, mix: { husk: 0.5, moth: 0.5 } },
      { t: 'build', mix: { husk: 0.3, shard: 0.3, harpy: 0.2, moth: 0.2 } },
      { t: 'spike', mix: { ling: 0.3, shard: 0.2, harpy: 0.3, moth: 0.2 }, mini: 'shard', flyCut: 0.3 },
      { t: 'boss', mix: { husk: 0.5, harpy: 0.25, ling: 0.25 }, boss: 'herald' },
    ],
    stakes: [2, 6, 9],
  },
};
const MAP_ORDER = ['glacier', 'foundry'];
// Wave HP budget (spec): HP(w) = 260 * 1.15^(w-1) * R * M  (w is 1-based; boss HP is separate)
const waveBudget = (map, w) => 300 * Math.pow(WAVE_GROWTH, w - 1) * R_OF[map.waves[w - 1].t] * map.M * ((map.boost && map.boost[w]) || 1);
const WAVE_GROWTH = 1.17;
// Auto-launch timer before wave index wi (0-based) — none before wave 1.
function waveTimer(map, wi) {
  if (wi === 0) return 0; const d = map.waves[wi];
  if (d.t === 'boss') return 40; if (d.cp) return 30; if (d.t === 'spike') return 14; return 20;
}
// Early-call bonus for calling wave w (1-based) with `rem` of `timer` seconds left. Boss call pays nothing.
function earlyBonus(map, wi, rem, timer) {
  if (!timer || map.waves[wi].t === 'boss') return 0; const w = wi + 1;
  return Math.min(60, Math.round((10 + 2 * w) * rem / timer));
}
