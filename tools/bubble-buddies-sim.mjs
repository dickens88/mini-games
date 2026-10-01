// Bubble Buddies rules check — a simple robot plays every level.
//
//   node tools/bubble-buddies-sim.mjs          every level, 2 tries each, plus endless runs
//   node tools/bubble-buddies-sim.mjs 5        5 tries per level
//
// Checks every file is in the offline list, every level is laid out sensibly
// (nothing floating, nothing near the line, every colour in play), shots never
// land in an impossible cell, a saved game loads back exactly, and the robot
// can clear each level. Prints shots used against par, for tuning the stars.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'games/bubble-buddies');
const mod = p => import(join(GAME, 'js', p));

const { MIN_ANGLE, MAX_ANGLE, DEAD_ROW } = await mod('config.js');
const { LEVEL_COUNT, buildLevel } = await mod('data/levels.js');
const { newLevel, newEndless, shoot, swap, aim, serialize, deserialize } = await mod('core/game.js');
const { each, get, neighbors, count, lowest, inside, colorsIn } = await mod('core/grid.js');
const { floating } = await mod('core/match.js');

const TRIES = Number(process.argv[2]) || 2;
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

// ---- level layouts ----
for (let n = 1; n <= LEVEL_COUNT; n++) {
  const L = buildLevel(n);
  const cells = count(L.grid);
  if (cells < 12) fail(`level ${n}: only ${cells} bubbles`);
  if (floating(L.grid).length) fail(`level ${n}: bubbles floating at the start`);
  if (lowest(L.grid) + 3 >= DEAD_ROW) fail(`level ${n}: starts too close to the line`);
  const used = new Set(colorsIn(L.grid));
  if (used.size < L.colors.length) fail(`level ${n}: only ${used.size} of ${L.colors.length} colours used`);
  // a colour with fewer than 3 bubbles is fine (you shoot more in), but none may be missing
}

// ---- the robot: tries every angle with both bubbles and keeps the best ----
const ANGLES = 64;
const WOBBLE = 0.035;   // the robot's hand shakes a little, roughly like a person's
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
function evaluate(st, ev) {
  let v = 0;
  for (const e of ev) {
    if (e.t === 'pop') v += e.list.length;
    if (e.t === 'drop') v += e.list.length * 1.6;
    if (e.t === 'win' || e.t === 'wave') v += 1000;
    if (e.t === 'lose') v -= 1000;
    if (e.t === 'push') v -= 2;
    if (e.t === 'land') {
      const cell = get(st.grid, e.r, e.c);
      if (cell) v += neighbors(st.grid, e.r, e.c).filter(([r, c]) => (get(st.grid, r, c) || {}).color === cell.color).length * 0.35;
      v -= e.r * 0.03;
    }
  }
  return v;
}
function bestMove(st) {
  let best = null;
  for (const swapped of [false, true]) {
    for (let i = 0; i < ANGLES; i++) {
      const a = MIN_ANGLE + (MAX_ANGLE - MIN_ANGLE) * (i + 0.5) / ANGLES;
      const copy = JSON.parse(JSON.stringify(st));
      if (swapped) swap(copy);
      const v = evaluate(copy, shoot(copy, a)) - (swapped ? 0.01 : 0);
      if (!best || v > best.v) best = { v, a, swapped };
    }
  }
  return best;
}

function checkGrid(st, where) {
  each(st.grid, (cell, r, c) => {
    if (!inside(st.grid, r, c)) fail(`${where}: bubble outside the grid at ${r},${c}`);
    if (!(cell.color >= 0)) fail(`${where}: bubble with no colour at ${r},${c}`);
  });
  if (floating(st.grid).length) fail(`${where}: bubbles left floating`);
}

function play(st, where, maxShots) {
  let saveChecked = false;
  while (!st.over && st.shots < maxShots) {
    const m = bestMove(st);
    if (m.swapped) swap(st);
    const a = m.a + (rnd() * 2 - 1) * WOBBLE;
    const tr = aim(st, a);
    if (get(st.grid, tr.cell[0], tr.cell[1])) fail(`${where}: shot aimed at a full cell`);
    shoot(st, a);
    checkGrid(st, where);
    if (!saveChecked && st.shots === 5) {
      saveChecked = true;
      const back = deserialize(serialize(st));
      if (!back || serialize(back) !== serialize(st)) fail(`${where}: saved game does not load back`);
    }
  }
  return st;
}

const t0 = Date.now();
let wins = 0, games = 0, threeStar = 0;
const rows = [];
for (let n = 1; n <= LEVEL_COUNT; n++) {
  const shots = [];
  let w = 0;
  for (let k = 0; k < TRIES; k++) {
    const st = play(newLevel(n, 1000 * k + n), `level ${n} try ${k}`, 250);
    games++;
    if (st.over === 'win') { w++; wins++; shots.push(st.shots); if (st.stars === 3) threeStar++; }
  }
  const par = buildLevel(n).par;
  const avg = shots.length ? shots.reduce((a, b) => a + b, 0) / shots.length : NaN;
  rows.push({ n, par, avg, w, cells: count(buildLevel(n).grid), colors: buildLevel(n).colors.length });
  if (w === 0) fail(`level ${n}: the robot never cleared it`);
}

for (let i = 0; i < rows.length; i += 10) {
  console.log(rows.slice(i, i + 10).map(r => `${String(r.n).padStart(3)}:${String(Math.round(r.avg)).padStart(3)}/${String(r.par).padStart(2)}${r.w < TRIES ? '!' : ' '}`).join(' '));
}
if (process.env.FIT) for (const r of rows) console.log('FIT', r.n, r.cells, r.colors, r.avg.toFixed(1));
console.log(`levels: robot cleared ${wins}/${games}, 3 stars in ${threeStar}  (shots/par, ! = lost a try)`);

// ---- endless: the robot keeps going; it must survive a few waves and the game must end eventually or keep sane ----
for (let k = 0; k < 3; k++) {
  const st = play(newEndless(77 + k), `endless ${k}`, 400);
  console.log(`endless ${k}: wave ${st.wave}, ${st.shots} shots, score ${st.score}, ${st.over || 'still going'}`);
}

console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (failed) { console.log('FAILED'); process.exit(1); }
console.log('all good');
