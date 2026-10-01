// Garden Guard balance check — plays every level with a simple greedy bot.
//
//   node tools/garden-guard-sim.mjs            all levels
//   node tools/garden-guard-sim.mjs 1-1        one level, wave by wave
//
// The bot builds on the pad that covers the most road, upgrades when it can't
// build, and never calls waves early. If it can't win a level, real players
// will struggle; if it gets three stars easily, the level is too soft.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'games/garden-guard');
const mod = p => import(join(GAME, 'js', p));

const { LEVELS, TOWERS } = await mod('data/registry.js');
const { createState } = await mod('core/state.js');
const { step } = await mod('core/sim.js');
const { build, upgrade, callWave, towerOnPad } = await mod('core/commands.js');
const { nextUpgrade } = await mod('core/towers.js');
const { pointAt } = await mod('core/path.js');
const { STAR_LIVES } = await mod('config.js');

function padCoverage(state, pad, range) {
  let n = 0;
  for (const path of state.paths) {
    for (let d = 0; d < path.len; d += 0.25) {
      const p = pointAt(path, d);
      if (Math.hypot(p.x - pad.c - 0.5, p.y - pad.r - 0.5) <= range) n++;
    }
  }
  return n;
}

function botTurn(state, padOrder) {
  const types = state.level.towers;
  for (;;) {
    const type = types[0];
    const pad = padOrder.find(i => !towerOnPad(state, i));
    if (pad !== undefined && state.gold >= TOWERS[type].cost) { build(state, pad, type); continue; }
    const cheapest = state.towers
      .map(t => ({ t, up: nextUpgrade(t) }))
      .filter(x => x.up)
      .sort((a, b) => a.up.cost - b.up.cost)[0];
    if (cheapest && state.gold >= cheapest.up.cost && (pad === undefined || cheapest.up.cost < TOWERS[type].cost)) {
      upgrade(state, cheapest.t.uid);
      continue;
    }
    return;
  }
}

function play(level, verbose) {
  const state = createState(level.id, 12345);
  const range = TOWERS[level.towers[0]].levels[0].range;
  const padOrder = state.pads.map((p, i) => ({ i, s: padCoverage(state, p, range) }))
    .sort((a, b) => b.s - a.s).map(x => x.i);
  botTurn(state, padOrder);
  callWave(state);
  let wave = state.waveIdx, livesAtWave = state.lives, worst = { wave: 0, lost: 0 };
  while (!state.result && state.time < 3600) {
    step(state);
    state.events.length = 0;
    botTurn(state, padOrder);
    if (state.waveIdx !== wave) {
      const lost = livesAtWave - state.lives;
      if (verbose) console.log(`  wave ${wave}: lost ${lost}, gold ${state.gold}, towers ${state.towers.length}`);
      if (lost > worst.lost) worst = { wave, lost };
      wave = state.waveIdx; livesAtWave = state.lives;
    }
  }
  const stars = STAR_LIVES.filter(n => state.lives >= n).length;
  return { result: state.result, lives: state.lives, stars, worst, time: Math.round(state.time) };
}

const only = process.argv[2];
for (const level of LEVELS) {
  if (only && level.id !== only) continue;
  const r = play(level, !!only);
  console.log(`${level.id} ${level.name.padEnd(16)} ${String(r.result).padEnd(4)} lives ${String(r.lives).padStart(2)}  ${'★'.repeat(r.stars).padEnd(3)}  ${r.time}s  worst wave ${r.worst.wave} (-${r.worst.lost})`);
}
