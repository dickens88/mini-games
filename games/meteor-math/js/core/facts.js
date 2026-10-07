// The 78 times-table facts from 1×1 to 12×12 (7×8 and 8×7 are one fact) and
// how well the player knows each one, two ways round:
//   mul — the product:          7 × 8 = ?
//   div — going backwards:      56 ÷ 7 = ?   and   7 × ? = 56
//
// Each way has a record [level 0–4, times seen, times wrong, average ms].
// Fast right answers move a fact up a level, wrong or missed ones drop it,
// and facts on low levels are picked far more often.

import { next, pick } from './rng.js';
import { FAST_MS } from '../config.js';

export const MAX = 12;
export const TOP_LEVEL = 4;
export const FACTS = [];
for (let a = 1; a <= MAX; a++) for (let b = a; b <= MAX; b++) FACTS.push(a + 'x' + b);

export const factKey = (a, b) => (a <= b ? a + 'x' + b : b + 'x' + a);
export const factPair = key => key.split('x').map(Number);
export const kindOf = op => (op === 'mul' ? 'mul' : 'div');
export const KINDS = ['mul', 'div'];

// how much more often a fact on each level comes up (unseen facts count as 3)
const WEIGHT = [6, 4, 2.5, 1.2, 0.5];
const UNSEEN = 3;
// ×1 and ×10 are too easy to spend time on: they turn up as a breather now and then
const isEasy = key => { const [a, b] = factPair(key); return a === 1 || a === 10 || b === 1 || b === 10; };

export function rec(stats, key, kind) {
  const f = stats[key] || (stats[key] = {});
  return f[kind] || (f[kind] = [0, 0, 0, 0]);
}
export const peek = (stats, key, kind) => (stats[key] && stats[key][kind]) || null;
export const levelOf = (stats, key, kind) => { const r = peek(stats, key, kind); return r ? r[0] : 0; };

// one answer: right and quick moves up a level, right but slow only climbs to
// level 2 (it's known, not yet by heart), wrong or missed drops two levels
export function record(stats, key, kind, correct, ms) {
  const r = rec(stats, key, kind);
  r[1]++;
  if (correct) {
    if (ms <= FAST_MS) r[0] = Math.min(TOP_LEVEL, r[0] + 1);
    else if (r[0] < 2) r[0]++;
    const m = Math.min(Math.round(ms), 30000);
    r[3] = r[3] ? Math.round(r[3] * 0.7 + m * 0.3) : m;
  } else {
    r[2]++;
    r[0] = Math.max(0, r[0] - 2);
  }
  return r[0];
}

// the facts a level is about: any fact with one of its tables, the other
// factor no bigger than upTo
export function poolFor(tables, upTo) {
  return FACTS.filter(k => {
    const [a, b] = factPair(k);
    return (tables.includes(a) && b <= upTo) || (tables.includes(b) && a <= upTo);
  });
}

export function weightOf(stats, key, kind) {
  const r = peek(stats, key, kind);
  const w = r && r[1] ? WEIGHT[r[0]] : UNSEEN;
  return isEasy(key) ? w * 0.25 : w;
}

// a weighted pick from the pool, skipping facts in `avoid` (already on screen
// or just asked) unless there is nothing else
export function pickFact(pool, stats, kind, rng, avoid) {
  let total = 0;
  const w = pool.map(k => {
    const x = avoid && avoid.has(k) ? 0 : weightOf(stats, k, kind);
    total += x;
    return x;
  });
  if (total <= 0) return pick(rng, pool);
  let r = next(rng) * total;
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r < 0) return pool[i]; }
  return pool[pool.length - 1];
}

// a question about a fact; the factors come in either order
export function makeProblem(key, op, rng) {
  let [a, b] = factPair(key);
  if (next(rng) < 0.5) [a, b] = [b, a];
  const p = a * b;
  if (op === 'mul') return { key, op, text: `${a} × ${b}`, answer: p, full: `${a} × ${b} = ${p}` };
  if (op === 'div') return { key, op, text: `${p} ÷ ${a}`, answer: b, full: `${p} ÷ ${a} = ${b}` };
  return { key, op: 'miss', text: `${a} × ? = ${p}`, answer: b, full: `${a} × ${b} = ${p}` };
}

// the fact a split meteor turns into: the same fact the other way round
export function flipProblem(prob, rng) {
  return makeProblem(prob.key, prob.op === 'mul' ? 'div' : 'mul', rng);
}

// the n shakiest facts the player has met (low level, often wrong, slow),
// topped up with the hardest unseen ones if there aren't enough yet
export function weakest(stats, n) {
  const list = [];
  for (const key of FACTS) {
    if (isEasy(key)) continue;
    for (const kind of KINDS) {
      const r = peek(stats, key, kind);
      if (!r || !r[1] || r[0] >= TOP_LEVEL) continue;
      list.push({ key, kind, score: r[0] * 10 - Math.min(r[2], 8) - Math.min(r[3], 9000) / 1000 });
    }
  }
  list.sort((x, y) => x.score - y.score);
  const out = list.slice(0, n).map(({ key, kind }) => ({ key, kind }));
  if (out.length < n) {
    const hard = FACTS.filter(k => { const [a, b] = factPair(k); return a >= 6 && b >= 6 && b !== 10; })
      .sort((x, y) => factPair(y).reduce((p, q) => p * q) - factPair(x).reduce((p, q) => p * q));
    for (const kind of KINDS) {
      for (const key of hard) {
        if (out.length >= n) break;
        const r = peek(stats, key, kind);
        if ((!r || r[0] < TOP_LEVEL) && !out.some(o => o.key === key && o.kind === kind)) out.push({ key, kind });
      }
    }
  }
  return out;
}

// for the fact map and the menu: how many facts sit on each level
export function tally(stats, kind) {
  const t = { unseen: 0, levels: [0, 0, 0, 0, 0] };
  for (const key of FACTS) {
    const r = peek(stats, key, kind);
    if (!r || !r[1]) t.unseen++;
    else t.levels[r[0]]++;
  }
  return t;
}
