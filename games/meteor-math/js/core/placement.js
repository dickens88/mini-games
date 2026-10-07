// Quick Check: 24 calm questions (no meteors) on the harder facts, to find
// out what the player already knows. Facts answered quickly go straight to
// "known by heart", and a strong showing fills in the easier facts too and
// opens later worlds, so nobody has to grind through what they already know.

import { makeRng, shuffle } from './rng.js';
import { FACTS, factPair, makeProblem, rec, kindOf, peek } from './facts.js';
import { FAST_MS } from '../config.js';

export const CHECK_SIZE = 24;
const MIX = { mul: 12, div: 8, miss: 4 };

export function newCheck(seed) {
  const rng = makeRng(seed == null ? (Math.random() * 1e9) | 0 : seed);
  // the facts worth asking about: at least one factor 6 or more, none of ×1 / ×10
  const hard = FACTS.filter(k => { const [a, b] = factPair(k); return a >= 3 && b >= 6 && a !== 10 && b !== 10; });
  const big = shuffle(rng, hard.filter(k => factPair(k)[1] >= 11));
  const mid = shuffle(rng, hard.filter(k => factPair(k)[1] <= 9));
  // two thirds from 1–9 (should be known), a third with 11 or 12 (maybe not yet)
  const keys = [];
  for (let i = 0; keys.length < CHECK_SIZE; i++) {
    const from = i % 3 === 2 ? big : mid;
    keys.push(from.pop() || mid.pop() || big.pop());
  }
  const ops = [];
  for (const op in MIX) for (let i = 0; i < MIX[op]; i++) ops.push(op);
  shuffle(rng, ops);
  const items = keys.map((k, i) => ({ prob: makeProblem(k, ops[i], rng), answer: null, ms: 0 }));
  return { rng, items, i: 0, done: false };
}

export const current = c => (c.done ? null : c.items[c.i]);

// value null means "don't know"
export function answer(c, value, ms) {
  const it = c.items[c.i];
  it.answer = value;
  it.ms = ms;
  it.correct = value === it.prob.answer;
  c.i++;
  if (c.i >= c.items.length) c.done = true;
  return it.correct;
}

function rate(items) {
  if (!items.length) return 0;
  return items.filter(it => it.correct && it.ms <= FAST_MS * 1.5).length / items.length;
}

// write what the check found into the stats; returns the scores and the
// highest world (0-based) the player is ready for
export function apply(c, stats) {
  const asked = c.items.slice(0, c.i);
  for (const it of asked) {
    const r = rec(stats, it.prob.key, kindOf(it.prob.op));
    r[1]++;
    if (it.correct) {
      r[0] = Math.max(r[0], it.ms <= FAST_MS ? 3 : 1);
      r[3] = Math.round(Math.min(it.ms, 30000));
    } else { r[2]++; r[0] = 0; }
  }
  const low = it => factPair(it.prob.key)[1] <= 9;
  const mul = rate(asked.filter(it => it.prob.op === 'mul' && low(it)));
  const div = rate(asked.filter(it => it.prob.op !== 'mul' && low(it)));
  const twelve = rate(asked.filter(it => !low(it)));
  // a strong player clearly knows the easy facts too: mark the unseen ones as known
  const fill = (kind, ok) => {
    if (!ok) return;
    for (const key of FACTS) {
      const [a, b] = factPair(key);
      if (b > 9 && a !== 1 && a !== 10 && b !== 10) continue;
      const r = peek(stats, key, kind);
      if (!r || !r[1]) { const n = rec(stats, key, kind); n[0] = 2; n[1] = 1; }
    }
  };
  fill('mul', mul >= 0.8);
  fill('div', div >= 0.8);
  const world = mul >= 0.8 ? (div >= 0.8 ? (twelve >= 0.8 ? 3 : 2) : 1) : 0;
  return { mul, div, twelve, world, right: asked.filter(it => it.correct).length, asked: asked.length };
}

