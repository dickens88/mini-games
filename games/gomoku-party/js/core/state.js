// A new game, and the small changes shared by moves, items and party events.
// The whole game is plain arrays and numbers (the random generator too), so
// structuredClone makes a perfect copy for take-backs.

import { MAX_ITEMS } from '../config.js';
import { ITEMS } from '../data/items.js';
import { boardById } from '../data/boards.js';
import { makeRng, next, int } from './rng.js';
import { open, nearStones } from './board.js';

// o: { size, board, party, first, seed }
export function newGame(o) {
  const n = o.size, N = n * n;
  const rules = boardById(o.board).rules;
  const s = {
    n, board: o.board, party: !!o.party,
    r: makeRng(o.seed),
    turn: o.first, first: o.first, moves: 0,
    winner: null, line: null, last: -1,
    stone: new Array(N).fill(-1),
    shield: new Array(N).fill(false),
    rock: new Array(N).fill(false),
    gift: new Array(N).fill(false),
    block: new Array(N).fill(0),            // moves left on a crater or lava
    blockKind: new Array(N).fill(''),
    frost: new Array(N).fill(0),            // moves left frozen
    frostFor: new Array(N).fill(-1),        // who can't go there: 0, 1, or 2 for both
    terrain: new Array(N).fill(null),
    items: [[], []],
    usedItem: false,
    nextEvent: o.party ? rules.eventEvery : 0,
    nextGift: o.party ? rules.giftEvery : 0,
    stats: { placed: [0, 0], items: [0, 0], gifts: [0, 0], lost: [0, 0] }
  };
  if (s.party) {
    for (const c of boardById(o.board).terrain(n, s.r)) {
      const { x, y, ...t } = c;
      s.terrain[y * n + x] = t;
    }
    // the first gifts come in mirrored pairs, a fair start
    for (let k = 0, tries = 0; k < rules.startGifts && tries < 200; tries++) {
      const m = (n - 1) / 2, x = int(s.r, n), y = int(s.r, n);
      const d = Math.max(Math.abs(x - m), Math.abs(y - m));
      const i = y * n + x, j = (n - 1 - y) * n + (n - 1 - x);
      if (d < 2 || d > m - 1 || i === j || !giftable(s, i) || !giftable(s, j)) continue;
      s.gift[i] = s.gift[j] = true;
      k += 2;
    }
  }
  return s;
}

export const rules = s => boardById(s.board).rules;
export const rand = s => next(s.r);
export const randInt = (s, k) => int(s.r, k);

export function giftable(s, i) {
  return !s.gift[i] && open(s, i, 0) && open(s, i, 1) && !(s.terrain[i] && s.terrain[i].t === 'portal');
}

export function rollItem(s) {
  let total = 0;
  for (const it of ITEMS) total += it.weight;
  let k = rand(s) * total;
  for (const it of ITEMS) if ((k -= it.weight) < 0) return it.id;
  return ITEMS[0].id;
}

// gives player p a random item; null when their hands are full
export function giveItem(s, p) {
  if (s.items[p].length >= MAX_ITEMS) return null;
  const id = rollItem(s);
  s.items[p].push(id);
  return id;
}

// knocks a stone off; shields protect it. Returns true if it went.
export function removeStone(s, i) {
  const p = s.stone[i];
  if (p < 0 || s.shield[i]) return false;
  s.stone[i] = -1;
  s.stats.lost[p]++;
  return true;
}

// up to k different spots that pass ok(i), preferring ones near the action
export function pickSpots(s, k, ok, near = 2) {
  const all = [], close = [];
  for (let i = 0; i < s.stone.length; i++) {
    if (!ok(i)) continue;
    all.push(i);
    if (nearStones(s, i, near)) close.push(i);
  }
  const pool = close.length >= k ? close : all;
  const out = [];
  while (out.length < k && pool.length) out.push(pool.splice(randInt(s, pool.length), 1)[0]);
  return out;
}

export function addGifts(s, k) {
  const cells = pickSpots(s, k, i => giftable(s, i));
  cells.forEach(i => { s.gift[i] = true; });
  return cells;
}

export const giftCount = s => s.gift.reduce((a, g) => a + (g ? 1 : 0), 0);
