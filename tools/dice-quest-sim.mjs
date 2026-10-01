// Dice Quest rules check — plays many games on every map.
//
//   node tools/dice-quest-sim.mjs          5,000 games per map and player count
//   node tools/dice-quest-sim.mjs 500      fewer games
//
// Checks every map is laid out sensibly (no two features on one cell, ladders
// go up, slides go down), every file is in the offline list, every game ends
// and a saved game loads back exactly. Prints how long games run and how
// often each event fires, for balancing.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'games/dice-quest');
const mod = p => import(join(GAME, 'js', p));

const { MAPS } = await mod('data/maps/index.js');
const { getMap } = await mod('core/map.js');
const { createState, serialize, deserialize } = await mod('core/state.js');
const { roll } = await mod('core/turn.js');
const { useItem, usableSlots, targets, needsTarget } = await mod('core/items.js');
const { drain } = await mod('core/events.js');

const GAMES = Number(process.argv[2]) || 5000;
let failed = false;
const fail = msg => { console.log('✗', msg); failed = true; };

// ---- every file must be in the service worker's offline list ----
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const url = '/' + relative(ROOT, p).split('\\').join('/');
    const key = url.endsWith('/index.html') ? url.slice(0, -'index.html'.length) : url;
    if (!sw.includes("'" + key + "'")) fail('missing from sw.js PRECACHE: ' + key);
  }
})(GAME);

// ---- map layout ----
for (const def of MAPS) {
  const m = getMap(def.id);
  const used = new Map();
  const mark = (cell, what) => {
    if (cell <= 0 || cell >= m.goal) fail(`${def.id}: ${what} on start/goal (${cell})`);
    if (used.has(cell)) fail(`${def.id}: cell ${cell} has ${used.get(cell)} and ${what}`);
    used.set(cell, what);
  };
  for (const [kind, a, b] of def.features) {
    if (!def.kinds[kind]) fail(`${def.id}: no name/icon for ${kind}`);
    mark(a, kind);
    if (kind === 'portal') mark(b, kind);
    if (kind === 'ladder' && !(b > a)) fail(`${def.id}: ladder ${a}→${b} goes down`);
    if (kind === 'slide' && !(b < a)) fail(`${def.id}: slide ${a}→${b} goes up`);
  }
  let gap = Infinity;
  for (let i = 0; i < m.cells.length; i++) for (let j = i + 1; j < m.cells.length; j++) {
    gap = Math.min(gap, Math.hypot(m.cells[i].x - m.cells[j].x, m.cells[i].y - m.cells[j].y));
  }
  if (gap < 6) fail(`${def.id}: cells only ${gap.toFixed(2)} apart`);
}

// ---- games ----
let seed = 99;
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);

function play(map, count) {
  const players = Array.from({ length: count }, () => ({}));
  const state = createState({ map, players, seed: (rand() * 2 ** 32) >>> 0 });
  const tally = {};
  let firstWin = 0, actions = 0;
  while (state.phase !== 'over') {
    if (++actions > 5000) throw new Error(map + ': game never ended');
    // a player uses an item now and then
    const slots = usableSlots(state);
    const k = slots.findIndex(Boolean);
    if (k >= 0 && rand() < 0.6) {
      const id = state.players[state.turn].items[k];
      const t = needsTarget(id);
      const tg = targets(state);
      const arg = t === 'number' ? 1 + Math.floor(rand() * 6) : t === 'player' ? tg[Math.floor(rand() * tg.length)] : undefined;
      useItem(state, k, arg);
    } else {
      roll(state);
    }
    for (const e of drain(state)) {
      tally[e.type] = (tally[e.type] || 0) + 1;
      if (e.type === 'finish' && e.rank === 1) firstWin = state.turns;
    }
    for (const p of state.players) {
      if (!Number.isInteger(p.pos) || p.pos < 0 || p.pos > getMap(map).goal) throw new Error(map + ': bad position ' + p.pos);
      if (p.items.length > 2) throw new Error('too many items');
    }
    if (actions % 41 === 0) {
      const copy = deserialize(serialize(state));
      if (!copy || serialize(copy) !== serialize(state)) throw new Error('save round-trip');
    }
  }
  return { rounds: firstWin / count, all: state.turns / count, tally };
}

for (const def of MAPS) {
  for (const count of [2, 4]) {
    let sum = 0, all = 0, max = 0;
    const tally = {};
    for (let g = 0; g < GAMES; g++) {
      const r = play(def.id, count);
      sum += r.rounds; all += r.all; max = Math.max(max, r.rounds);
      for (const k in r.tally) tally[k] = (tally[k] || 0) + r.tally[k];
    }
    const per = k => ((tally[k] || 0) / GAMES).toFixed(1);
    console.log(`${def.name.padEnd(12)} ${count}p: winner after ${(sum / GAMES).toFixed(1)} rounds (max ${max.toFixed(0)}), all done ${(all / GAMES).toFixed(1)}` +
      ` | per game: ${per('ladder')} up, ${per('slide')} down, ${per('portal')} portals, ${per('bump')} bumps, ${per('item')} items, ${per('trap')} traps`);
  }
}
if (failed) process.exit(1);
console.log('ok —', GAMES, 'games per map and player count');
