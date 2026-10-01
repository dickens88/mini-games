// Garden Guard balance check — plays every level with a simple greedy bot.
//
//   node tools/garden-guard-sim.mjs            all levels
//   node tools/garden-guard-sim.mjs 1-1        one level, wave by wave
//
// The bot builds a fixed mix of towers on the pads that cover the most road,
// upgrades when it can't build, drops powers on the bug closest to the garden,
// and never calls waves early. If it can't win a level, real players will
// struggle; if it gets three stars easily, the level is too soft.
//
// It also checks the level data (enemies, towers, roads, pads) and that the
// service worker caches every file of the game.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'games/garden-guard');
const mod = p => import(join(GAME, 'js', p));

const { LEVELS, TOWERS, ENEMIES, POWERS } = await mod('data/registry.js');
const { createState, serialize, deserialize } = await mod('core/state.js');
const { step } = await mod('core/sim.js');
const { build, upgrade, callWave, towerOnPad, castPower } = await mod('core/commands.js');
const { nextUpgrade } = await mod('core/towers.js');
const { pointAt } = await mod('core/path.js');
const { STAR_LIVES } = await mod('config.js');

let problems = 0;
const problem = msg => { problems++; console.log('  ✗ ' + msg); };

/* ---------- data checks ---------- */
function checkLevel(level) {
  const state = createState(level.id, 1);
  for (const t of level.towers) if (!TOWERS[t]) problem(`${level.id}: unknown tower ${t}`);
  for (const p of level.powers || []) if (!POWERS[p]) problem(`${level.id}: unknown power ${p}`);
  state.waves.forEach((w, i) => {
    if (!w.length) problem(`${level.id}: wave ${i + 1} is empty`);
    for (const s of w) if (!ENEMIES[s.type]) problem(`${level.id}: wave ${i + 1} unknown enemy ${s.type}`);
  });
  // a pad sitting on the road would put a tower in the bugs' way
  for (const pad of state.pads) {
    for (const path of state.paths) {
      for (let d = 0; d < path.len; d += 0.1) {
        const p = pointAt(path, d);
        if (Math.abs(p.x - pad.c - 0.5) < 0.5 && Math.abs(p.y - pad.r - 0.5) < 0.5) {
          problem(`${level.id}: pad ${pad.c},${pad.r} is on the road`);
          return;
        }
      }
    }
  }
}

function checkCache() {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const walk = dir => readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  for (const f of walk(GAME)) {
    if (!/\.(js|css|png)$/.test(f)) continue;
    const url = '/' + relative(ROOT, f).split('\\').join('/');
    if (!sw.includes(`'${url}'`)) problem(`sw.js does not cache ${url}`);
  }
}

/* ---------- the bot ---------- */
// the order the bot likes to build in; types the level doesn't have are skipped
const PLAN = ['pea', 'melon', 'sunflower', 'pea', 'mint', 'cactus', 'melon', 'pea', 'cactus', 'mint', 'melon', 'cactus'];

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

function nextType(state) {
  const plan = PLAN.filter(t => state.level.towers.includes(t));
  const fighters = plan.filter(t => TOWERS[t].attack !== 'none');
  const n = state.towers.length;
  return n < plan.length ? plan[n] : fighters[n % fighters.length];
}

function botTurn(state, padOrder) {
  while (!state.result) {
    const type = nextType(state);
    // sunflowers go at the back, everything else where it sees the most road
    const order = TOWERS[type].attack === 'none' ? [...padOrder].reverse() : padOrder;
    const pad = order.find(i => !towerOnPad(state, i));
    if (pad !== undefined && state.gold >= TOWERS[type].cost && build(state, pad, type).ok) continue;
    const cheapest = state.towers
      .map(t => ({ t, up: nextUpgrade(t) }))
      .filter(x => x.up)
      .sort((a, b) => a.up.cost - b.up.cost)[0];
    if (cheapest && state.gold >= cheapest.up.cost && (pad === undefined || cheapest.up.cost < TOWERS[type].cost) &&
      upgrade(state, cheapest.t.uid).ok) continue;
    break;
  }
  const lead = state.enemies.reduce((best, e) => (!best || e.d / state.paths[e.path].len > best.d / state.paths[best.path].len ? e : best), null);
  if (lead && lead.d / state.paths[lead.path].len > 0.4) {
    for (const id in state.powerCd) castPower(state, id, lead.x, lead.y);
  }
}

function play(level, verbose) {
  let state = createState(level.id, 12345);
  const padOrder = state.pads.map((p, i) => ({ i, s: padCoverage(state, p, 2.6) }))
    .sort((a, b) => b.s - a.s).map(x => x.i);
  botTurn(state, padOrder);
  callWave(state);
  let wave = state.waveIdx, livesAtWave = state.lives, worst = { wave: 0, lost: 0 };
  while (!state.result && state.time < 3600) {
    step(state);
    state.events.length = 0;
    botTurn(state, padOrder);
    if (state.waveIdx !== wave) {
      // the autosave must bring back exactly the same game
      const copy = deserialize(JSON.parse(JSON.stringify(serialize(state))));
      if (JSON.stringify(serialize(copy)) !== JSON.stringify(serialize(state))) problem(`${level.id}: save does not round-trip`);
      state = copy;
      const lost = livesAtWave - state.lives;
      if (verbose) console.log(`  wave ${wave}: lost ${lost}, gold ${state.gold}, towers ${state.towers.map(t => t.type.slice(0, 2) + (t.level + 1)).join(' ')}`);
      if (lost > worst.lost) worst = { wave, lost };
      wave = state.waveIdx; livesAtWave = state.lives;
    }
  }
  if (verbose && state.result) console.log(`  last wave: lost ${livesAtWave - state.lives}`);
  const stars = STAR_LIVES.filter(n => state.lives >= n).length;
  return { result: state.result, lives: state.lives, stars, worst, time: Math.round(state.time), state };
}

const only = process.argv[2];
checkCache();
for (const level of LEVELS) {
  if (only && level.id !== only) continue;
  checkLevel(level);
  const r = play(level, !!only);
  console.log(`${level.id} ${level.name.padEnd(16)} ${String(r.result).padEnd(4)} lives ${String(r.lives).padStart(2)}  ${'★'.repeat(r.stars).padEnd(3)}  ${r.time}s  worst wave ${r.worst.wave} (-${r.worst.lost})`);
  if (r.result !== 'win') problem(`${level.id}: the bot lost`);
}
console.log(problems ? `${problems} problem(s)` : 'all good');
process.exitCode = problems ? 1 : 0;
