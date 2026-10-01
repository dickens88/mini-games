// The rules. A game is one plain object (it saves as JSON) and shoot() turns
// one shot into a list of events, in the order the page should show them.
// Nothing here touches the page, so tools/bubble-buddies-sim.mjs can run it in node.

import { BUDDIES, CHARGE_MAX, SPECIALS, BOMB_REACH, DEAD_ROW } from '../config.js';
import { next as rand, pick, shuffle } from './rng.js';
import {
  createGrid, get, put, clear, neighbors, each, count, lowest, trim, colorsIn,
  cellX, cellY, pushRow, rowLen
} from './grid.js';
import { cluster, sameColor, floating } from './match.js';
import { traceShot } from './shot.js';
import { buildLevel, waveSpec, randomRow } from '../data/levels.js';

function base(mode, seed) {
  return {
    v: 1, mode, level: 0, wave: 0, theme: 'meadow',
    grid: createGrid(), colors: [], cur: null, next: null, bonus: [],
    rng: seed | 0, nextId: 1,
    shots: 0, misses: 0, pushEvery: 8, par: 0,
    score: 0, streak: 0, bestStreak: 0, charge: 0,
    over: null, stars: 0
  };
}

export function newLevel(n, seed) {
  const L = buildLevel(n);
  const st = base('level', seed);
  Object.assign(st, { level: n, grid: L.grid, colors: L.colors, pushEvery: L.pushEvery, par: L.par, theme: L.theme });
  giveIds(st);
  deal(st);
  return st;
}

export function newEndless(seed) {
  const st = base('endless', seed);
  st.theme = 'candy';
  st.wave = 1;
  fillWave(st);
  deal(st);
  return st;
}

function fillWave(st) {
  const spec = waveSpec(st.wave);
  st.colors = shuffle(st, BUDDIES.map((_, i) => i)).slice(0, spec.colors);
  st.pushEvery = spec.pushEvery;
  st.misses = 0;
  const g = st.grid = createGrid();
  for (let r = 0; r < spec.rows; r++) {
    const above = g.rows[r - 1];
    randomRow(st, st.colors, above, rowLen(g, r)).forEach((cell, c) => put(g, r, c, cell));
  }
  giveIds(st);
}

function giveIds(st) {
  each(st.grid, cell => { if (!cell.id) cell.id = st.nextId++; });
}

function pickColor(st) {
  const present = colorsIn(st.grid);
  return pick(st, present.length ? present : st.colors);
}

function deal(st) {
  st.cur = { color: pickColor(st) };
  st.next = { color: pickColor(st) };
}

// colours that have left the board are never served
function refresh(st) {
  const present = colorsIn(st.grid);
  if (!present.length) return;
  for (const b of [st.cur, st.next]) {
    if (!b.special && !present.includes(b.color)) b.color = pick(st, present);
  }
}

// a power-up goes straight into the launcher queue
function award(st) {
  const kind = pick(st, SPECIALS);
  if (!st.next.special) st.next = { special: kind, color: -1 };
  else st.bonus.push(kind);
  return kind;
}

export function swap(st) {
  if (st.over) return false;
  [st.cur, st.next] = [st.next, st.cur];
  return true;
}

export const aim = (st, angle) => traceShot(st.grid, angle);

// take cells off the board; order says how far (in bubbles) each was from the impact
function take(st, cells, x, y) {
  const g = st.grid;
  const out = [];
  for (const [r, c] of cells) {
    const cell = get(g, r, c);
    if (!cell) continue;
    const cx = cellX(g, r, c), cy = cellY(g, r);
    out.push({ id: cell.id, color: cell.color, gift: !!cell.gift, x: cx, y: cy, order: Math.round(Math.hypot(cx - x, cy - y) / 40) });
    clear(g, r, c);
  }
  return out;
}

export function shoot(st, angle) {
  if (st.over) return [];
  const g = st.grid;
  const tr = traceShot(g, angle);
  const ball = st.cur;
  const [r, c] = tr.cell;
  const x = cellX(g, r, c), y = cellY(g, r);
  const id = st.nextId++;
  const ev = [{ t: 'shot', points: tr.points, length: tr.length, ball, r, c, id, x, y }];
  st.shots++;

  let hits = [];
  if (ball.special === 'bomb') {
    each(g, (cell, rr, cc) => { if (Math.hypot(cellX(g, rr, cc) - x, cellY(g, rr) - y) <= BOMB_REACH) hits.push([rr, cc]); });
    ev.push({ t: 'bomb', x, y });
  } else if (ball.special === 'lightning') {
    (g.rows[r] || []).forEach((cell, cc) => { if (cell) hits.push([r, cc]); });
    ev.push({ t: 'zap', x, y });
  } else {
    const rainbow = ball.special === 'rainbow';
    const cell = { id, color: rainbow ? -1 : ball.color };
    put(g, r, c, cell);
    ev.push({ t: 'land', id, r, c, x, y, rainbow });
    if (rainbow) {
      // a rainbow joins every colour it touches
      const touching = [...new Set(neighbors(g, r, c).map(([a, b]) => get(g, a, b)).filter(Boolean).map(n => n.color))];
      const keys = new Set();
      for (const k of touching) {
        const cl = cluster(g, r, c, n => n === cell || n.color === k);
        if (cl.length >= 3) cl.forEach(p => keys.add(p[0] + ',' + p[1]));
      }
      if (keys.size) hits = [...keys].map(k => k.split(',').map(Number));
      else {
        const hit = tr.hit && get(g, tr.hit[0], tr.hit[1]);
        cell.color = hit ? hit.color : touching.length ? touching[0] : pickColor(st);
      }
      ev.push({ t: 'rainbow', id, x, y, color: cell.color, popped: keys.size > 0 });
    } else {
      const cl = sameColor(g, r, c);
      if (cl.length >= 3) hits = cl;
    }
  }

  const popped = take(st, hits, x, y);
  const dropped = popped.length ? take(st, floating(g), x, y) : [];
  trim(g);

  let gained = 0;
  if (popped.length) {
    st.streak++;
    st.bestStreak = Math.max(st.bestStreak, st.streak);
    const mult = Math.min(st.streak, 5);
    const popPts = popped.length * 10 * mult;
    const dropPts = dropped.length * 20 * (1 + Math.floor(dropped.length / 3)) * mult;
    gained = popPts + dropPts;
    ev.push({ t: 'pop', list: popped, points: popPts, x, y });
    if (dropped.length) ev.push({ t: 'drop', list: dropped, points: dropPts });
    ev.push({ t: 'combo', streak: st.streak, cleared: popped.length + dropped.length, mult });
    for (const b of popped.concat(dropped)) {
      if (b.gift) ev.push({ t: 'gift', kind: award(st), x: b.x, y: b.y });
    }
    st.charge += popped.length + 2 * dropped.length;
    while (st.charge >= CHARGE_MAX) {
      st.charge -= CHARGE_MAX;
      ev.push({ t: 'charged', kind: award(st) });
    }
  } else {
    st.streak = 0;
    st.misses++;
  }
  if (st.mode === 'endless') st.misses++;     // in endless the rows keep coming no matter what
  if (!popped.length) ev.push({ t: 'miss', misses: st.misses, of: st.pushEvery });

  if (!count(g)) {
    if (st.mode === 'level') {
      const bonus = 500 + Math.max(0, st.par - st.shots) * 100;
      gained += bonus;
      st.over = 'win';
      st.stars = st.shots <= st.par ? 3 : st.shots <= Math.ceil(st.par * 1.4) ? 2 : 1;
      ev.push({ t: 'win', stars: st.stars, bonus });
    } else {
      const bonus = 1000 * st.wave;
      gained += bonus;
      st.wave++;
      fillWave(st);
      ev.push({ t: 'wave', wave: st.wave, bonus });
    }
  } else if (st.misses >= st.pushEvery) {
    st.misses = 0;
    if (st.mode === 'level') {
      g.ceil++;
      ev.push({ t: 'push', kind: 'ceil' });
    } else {
      pushRow(g, len => randomRow(st, st.colors, g.rows[0], len));
      giveIds(st);
      ev.push({ t: 'push', kind: 'row' });
    }
  }

  if (!st.over && lowest(g) + g.ceil >= DEAD_ROW) {
    st.over = 'lose';
    ev.push({ t: 'lose' });
  }

  st.score += gained;
  if (!st.over) {
    st.cur = st.next;
    st.next = st.bonus.length ? { special: st.bonus.shift(), color: -1 } : { color: pickColor(st) };
    refresh(st);
  }
  ev.push({ t: 'score', score: st.score, gained });
  return ev;
}

// how close the lowest bubble is to the line: 0 = far, 1 = one row away, 2 = touching
export function danger(st) {
  const left = DEAD_ROW - (lowest(st.grid) + st.grid.ceil);
  return left <= 1 ? 2 : left <= 2 ? 1 : 0;
}

export function serialize(st) { return JSON.stringify(st); }

export function deserialize(text) {
  try {
    const st = JSON.parse(text);
    if (!st || st.v !== 1 || !st.grid || !Array.isArray(st.grid.rows) || !st.cur || !st.next) return null;
    if (st.mode !== 'level' && st.mode !== 'endless') return null;
    return st;
  } catch (e) {
    return null;
  }
}

export { rand };
