// Gomoku Party rules check — two robots play whole games on every board.
//
//   node tools/gomoku-party-sim.mjs          40 games per board and size
//   node tools/gomoku-party-sim.mjs 200      200 games each
//
// Checks every file is in the offline list, that special spots are laid out
// fairly (mirrored around the middle), that nothing ever sits on a rock, vent
// or black hole, that party events and paint never make a five, that a copy
// of the game plays out exactly the same (take-backs rely on that), and that
// every game ends. Prints game lengths and how often each item and event
// came up, for tuning.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'games/gomoku-party');
const mod = p => import(join(GAME, 'js', p));

const { SIZES, MAX_ITEMS } = await mod('config.js');
const { BOARDS } = await mod('data/boards.js');
const { ITEMS } = await mod('data/items.js');
const { newGame, place, useItem, targets, randomSpot } = await mod('core/game.js');
const { open, solid, fiveAt, winningSpots } = await mod('core/board.js');
const { EVENTS } = await mod('core/events.js');

const RUNS = Number(process.argv[2]) || 40;
let failed = 0;
const fail = msg => { if (failed < 30) console.log('✗', msg); failed++; };

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

// ---- every board's events and items exist ----
for (const b of BOARDS) for (const id of b.rules.events) if (!EVENTS[id]) fail(`${b.id}: unknown event ${id}`);

// ---- special spots: mirrored, the middle kept clear ----
for (const b of BOARDS) for (const n of SIZES) for (let seed = 1; seed <= 300; seed++) {
  const s = newGame({ size: n, board: b.id, party: true, first: 0, seed });
  const m = (n - 1) / 2;
  const want = { garden: 0, ice: 1, volcano: 4, space: 8 }[b.id];
  const count = s.terrain.filter(Boolean).length;
  if (b.id === 'ice' ? count < 8 : count !== want) fail(`${b.id} ${n}×${n} seed ${seed}: ${count} special spots`);
  for (let i = 0; i < n * n; i++) {
    const t = s.terrain[i], j = n * n - 1 - i, u = s.terrain[j];
    if (!t) { if (u) fail(`${b.id} seed ${seed}: spot ${j} has no mirror`); continue; }
    const x = i % n, y = (i / n) | 0;
    if (Math.abs(x - m) <= 1 && Math.abs(y - m) <= 1) fail(`${b.id} seed ${seed}: ${t.t} in the middle`);
    if (!u || u.t !== t.t) fail(`${b.id} seed ${seed}: ${t.t} at ${i} not mirrored`);
    else if (t.t === 'ice' && u.dir !== (t.dir + 2) % 4) fail(`${b.id} seed ${seed}: ice arrows not mirrored`);
    else if (t.t === 'portal' && (t.twin !== j || u.twin !== i)) fail(`${b.id} seed ${seed}: portal twins wrong`);
  }
  for (let i = 0; i < n * n; i++) if (s.gift[i] && !s.gift[n * n - 1 - i]) fail(`${b.id} seed ${seed}: first gifts not mirrored`);
}

// ---- robots ----
// a fair-ish robot: wins if it can, blocks if it must, sometimes uses an item, else plays near the action
function robot(s, rnd) {
  const p = s.turn;
  if (s.items[p].length && !s.usedItem && rnd() < 0.5) {
    const slot = Math.floor(rnd() * s.items[p].length), spots = targets(s, s.items[p][slot]);
    // aim items where they matter: at the other player's threats, or at random
    const danger = winningSpots(s, 1 - p);
    const good = spots.filter(i => danger.some(d => Math.abs(d % s.n - i % s.n) <= 1 && Math.abs(((d / s.n) | 0) - ((i / s.n) | 0)) <= 1));
    const pool = good.length ? good : spots;
    if (pool.length) return { item: slot, at: pool[Math.floor(rnd() * pool.length)] };
  }
  const win = winningSpots(s, p);
  if (win.length) return { at: win[0] };
  // (their winning spot may be frozen for us)
  const block = winningSpots(s, 1 - p).filter(i => open(s, i, p));
  if (block.length) return { at: block[Math.floor(rnd() * block.length)] };
  // grow its own lines a little: prefer spots next to its own stones
  const mine = [];
  for (let i = 0; i < s.stone.length; i++) if (open(s, i, p) && touches(s, i, p)) mine.push(i);
  if (mine.length && rnd() < 0.8) return { at: mine[Math.floor(rnd() * mine.length)] };
  const i = randomSpot(s);
  return { at: i < 0 ? 0 : i };
}

function touches(s, i, p) {
  const x = i % s.n, y = (i / s.n) | 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const a = x + dx, b = y + dy;
    if ((dx || dy) && a >= 0 && b >= 0 && a < s.n && b < s.n && s.stone[b * s.n + a] === p) return true;
  }
  return false;
}

function anyFive(s) {
  for (let i = 0; i < s.stone.length; i++) if (s.stone[i] >= 0 && fiveAt(s, i)) return s.stone[i];
  return -1;
}

function check(s, where) {
  for (let i = 0; i < s.stone.length; i++) {
    if (s.stone[i] >= 0 && solid(s, i)) return fail(`${where}: a stone sits on a ${s.rock[i] ? 'rock' : s.terrain[i].t}`);
    if (s.block[i] < 0 || s.frost[i] < 0) return fail(`${where}: a timer went below zero`);
    if (s.shield[i] && s.stone[i] < 0) { /* a shield on an empty spot is harmless but shouldn't happen */ return fail(`${where}: shield left behind`); }
  }
  for (const p of [0, 1]) if (s.items[p].length > MAX_ITEMS) return fail(`${where}: player ${p + 1} holds ${s.items[p].length} items`);
}

let seed = 1;
const rows = [];
const tally = { items: {}, events: {} };
for (const b of BOARDS) for (const n of SIZES) for (const party of [true, false]) {
  if (!party && b.id !== 'garden') continue;
  const lens = [], wins = [0, 0, 0];
  for (let run = 0; run < RUNS; run++) {
    let r = seed++ * 7919;
    const rnd = () => ((r = (Math.imul(r, 48271) >>> 0) % 2147483647) / 2147483647);
    const s = newGame({ size: n, board: b.id, party, first: run % 2, seed: r });
    const where = `${b.id} ${n}×${n}${party ? '' : ' classic'} game ${run}`;
    let steps = 0;
    const before = failed;
    while (s.winner === null && steps < 2000) {
      steps++;
      const mv = robot(s, rnd);
      const twin = structuredClone(s);
      let ev;
      if (mv.item !== undefined) {
        const id = s.items[s.turn][mv.item], p = s.turn;
        ev = useItem(s, mv.item, mv.at);
        if (!ev) { fail(`${where}: robot's ${id} refused`); break; }
        tally.items[id] = (tally.items[id] || 0) + 1;
        if (id === 'paint' && fiveAt(s, mv.at)) fail(`${where}: paint made a five`);
        if (s.winner === null && anyFive(s) >= 0 && s.turn !== p) fail(`${where}: a five appeared after ${id}`);
        const again = useItem(twin, mv.item, mv.at);
        if (JSON.stringify(again) !== JSON.stringify(ev) || JSON.stringify(twin) !== JSON.stringify(s)) fail(`${where}: a copy played ${id} differently`);
      } else {
        ev = place(s, mv.at);
        if (!ev) { fail(`${where}: robot's stone refused at ${mv.at}`); break; }
        const again = place(twin, mv.at);
        if (JSON.stringify(again) !== JSON.stringify(ev) || JSON.stringify(twin) !== JSON.stringify(s)) fail(`${where}: a copy played a stone differently`);
        // an event at the end of the move must never hand out a five
        if (s.winner === null && anyFive(s) >= 0) fail(`${where}: a five is on the board but nobody won`);
      }
      for (const e of ev) {
        if (e.type === 'event') tally.events[e.id] = (tally.events[e.id] || 0) + 1;
      }
      check(s, where);
      if (failed > before) break;
    }
    if (failed > before) continue;
    if (s.winner === null) fail(`${where}: never finished`);
    lens.push(s.moves);
    wins[s.winner === 'draw' ? 2 : s.winner]++;
  }
  lens.sort((a, c) => a - c);
  if (!lens.length) continue;
  rows.push(`${(b.id + (party ? '' : ' (classic)')).padEnd(18)} ${n}×${n}  moves: median ${String(lens[lens.length >> 1]).padStart(3)}, longest ${String(lens[lens.length - 1]).padStart(3)}   wins P1/P2/draw ${wins.join('/')}`);
}

console.log(rows.join('\n'));
console.log('items used:', ITEMS.map(it => `${it.id} ${tally.items[it.id] || 0}`).join(', '));
console.log('events:', Object.entries(tally.events).map(([k, v]) => `${k} ${v}`).join(', '));
console.log(failed ? `\n${failed} checks failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
