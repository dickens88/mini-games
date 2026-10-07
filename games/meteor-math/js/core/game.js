// One round: meteors falling with questions on them, the answer being typed,
// the laser, shields, combos, the UFO, meteor showers, split meteors and
// bosses. No drawing and no page here, so the whole round can run in node.
//
// update(s, dt) moves time on; press(s, key) is a key from the keypad
// ('0'–'9', 'back', 'fire'). Both push what happened onto s.events for the
// drawing and sounds to react to; the caller empties it.

import {
  W, GROUND, TOP, RADIUS, MARGIN, SHIELDS, WAIT, MAX_DIGITS, FAST_MS,
  POWER_TIME, UFO_TIME, SHOWER_GAP, SPEED_MIN, SPEED_MAX, comboMult
} from '../config.js';
import { makeRng, next, pick } from './rng.js';
import { poolFor, pickFact, makeProblem, flipProblem, record, kindOf, levelOf } from './facts.js';
import { POWERS } from '../data/powerups.js';

const BOSS_TOP = 200;          // where a boss hovers when it's pushed all the way back
const BOSS_R = 70;

export function newGame(spec, stats, seed) {
  const s = {
    spec, stats,
    rng: makeRng(seed == null ? (Math.random() * 1e9) | 0 : seed),
    pool: spec.pairs ? spec.pairs.map(p => p.key) : poolFor(spec.tables, spec.upTo),
    t: 0, phase: 'play', wait: 1.8,
    meteors: [], nextId: 1, spawnT: 0,
    ufo: null, ufoT: spec.ufo ? spec.ufo * 0.6 : 0,
    shower: null, showerDone: !spec.shower, showerNext: 50,
    boss: null,
    typed: '', pending: 0,
    shields: SHIELDS, score: 0, combo: 0, bestCombo: 0,
    cleared: 0, right: 0, wrong: 0, missed: 0,
    fx: { freeze: 0, slow: 0, double: 0 },
    speedK: 1, lastShot: 0,
    recent: [], revenge: [], missList: [],
    events: []
  };
  if (spec.boss) {
    s.boss = { hp: spec.boss.hp, max: spec.boss.hp, x: W / 2, y: -BOSS_R, prob: null, born: 0, hurt: 0, art: spec.boss.art,
      vy: (GROUND - BOSS_R - BOSS_TOP) / spec.boss.time };
  }
  s.events.push({ type: 'start', name: spec.name });
  return s;
}

// ---------- what's on screen ----------

// everything that can be shot, with its answer
function targets(s) {
  const out = [];
  for (const m of s.meteors) if (!m.dead) out.push({ type: 'meteor', obj: m, answer: m.prob.answer, danger: m.y });
  if (s.ufo) out.push({ type: 'ufo', obj: s.ufo, answer: s.ufo.prob.answer, danger: -1 });
  if (s.boss && s.boss.prob) out.push({ type: 'boss', obj: s.boss, answer: s.boss.prob.answer, danger: s.boss.y - 1000 });
  return out;
}
export const onScreen = targets;

function busyKeys(s) {
  const k = new Set(s.recent);
  for (const m of s.meteors) k.add(m.prob.key);
  if (s.ufo) k.add(s.ufo.prob.key);
  if (s.boss && s.boss.prob) k.add(s.boss.prob.key);
  return k;
}

function chooseOp(s) {
  const ops = s.spec.ops;
  let total = 0;
  for (const k in ops) total += ops[k];
  let r = next(s.rng) * total;
  for (const k in ops) { r -= ops[k]; if (r < 0) return k; }
  return 'mul';
}

// a new question: a missed fact coming back for revenge first, otherwise a
// weighted pick that favours the facts the player is shaky on
function newProblem(s) {
  const busy = busyKeys(s);
  const due = s.revenge.findIndex(r => r.at <= s.t && !busy.has(r.key));
  if (due >= 0) {
    const r = s.revenge.splice(due, 1)[0];
    return Object.assign(makeProblem(r.key, r.op, s.rng), { revenge: true });
  }
  const answers = new Set(targets(s).map(t => t.answer));
  let prob = null;
  for (let tries = 0; tries < 6; tries++) {
    if (s.spec.pairs) {
      const pairs = s.spec.pairs.filter(p => !busy.has(p.key));
      const list = pairs.length ? pairs : s.spec.pairs;
      // the shakier the fact, the more it comes up
      let total = 0;
      const w = list.map(p => { const x = 5 - levelOf(s.stats, p.key, p.kind); total += x; return x; });
      let r = next(s.rng) * total, p = list[list.length - 1];
      for (let i = 0; i < list.length; i++) { r -= w[i]; if (r < 0) { p = list[i]; break; } }
      prob = makeProblem(p.key, p.kind === 'mul' ? 'mul' : next(s.rng) < 0.7 ? 'div' : 'miss', s.rng);
    } else {
      const op = chooseOp(s);
      prob = makeProblem(pickFact(s.pool, s.stats, kindOf(op), s.rng, busy), op, s.rng);
    }
    // two meteors with the same answer on screen at once is confusing
    if (!answers.has(prob.answer)) break;
  }
  s.recent.push(prob.key);
  if (s.recent.length > 4) s.recent.shift();
  return prob;
}

// somewhere along the top not right on top of another meteor
function freeX(s, r) {
  let best = W / 2, bestGap = -1;
  for (let i = 0; i < 8; i++) {
    let x = MARGIN + next(s.rng) * (W - 2 * MARGIN);
    // keep clear of a boss in the middle
    if (s.boss && Math.abs(x - s.boss.x) < 110 + r) x = x < s.boss.x ? MARGIN + next(s.rng) * 40 : W - MARGIN - next(s.rng) * 40;
    let gap = 1e9;
    for (const m of s.meteors) if (m.y < TOP + 160) gap = Math.min(gap, Math.abs(m.x - x) - m.r - r);
    if (gap > 30) return x;
    if (gap > bestGap) { bestGap = gap; best = x; }
  }
  return best;
}

function fallTime(s) {
  return s.spec.endless ? Math.max(5.5, s.spec.fall - s.t * 0.02) : s.spec.fall;
}

function addMeteor(s, prob, kind, x, y) {
  const r = RADIUS[kind];
  const startY = y == null ? TOP - r : y;
  const fall = fallTime(s) * (kind === 'shower' ? 0.8 : 1);
  const m = {
    id: s.nextId++, kind, prob, r,
    x: x == null ? freeX(s, r) : x, y: startY,
    vy: (GROUND - TOP + r) / fall,
    born: s.t, spin: (next(s.rng) - 0.5) * 1.2, seed: next(s.rng)
  };
  s.meteors.push(m);
  s.events.push({ type: 'spawn', id: m.id, kind });
  return m;
}

function maxOn(s) {
  return s.spec.endless ? Math.min(5, s.spec.maxOn + Math.floor(s.t / 60)) : s.spec.maxOn;
}

function spawnGap(s) {
  const g = s.spec.endless ? Math.max(1.8, s.spec.gap - s.t * 0.006) : s.spec.gap;
  return g / s.speedK;
}

// ---------- the round ----------

export function update(s, dt) {
  if (s.phase !== 'play') return;
  s.t += dt;
  for (const k in s.fx) if (s.fx[k] > 0) s.fx[k] = Math.max(0, s.fx[k] - dt);
  if (s.wait > 0) { s.wait -= dt; return; }

  // "1" typed while a 12 is falling: give the second digit a moment
  if (s.pending > 0) {
    s.pending -= dt;
    if (s.pending <= 0) { s.pending = 0; check(s, true); }
  }

  const frozen = s.fx.freeze > 0;
  const speed = (s.fx.slow > 0 ? 0.5 : 1) * s.speedK;

  if (!frozen) {
    for (const m of s.meteors) {
      m.y += m.vy * speed * dt;
      if (m.y + m.r * 0.55 >= GROUND) land(s, m);
    }
    s.meteors = s.meteors.filter(m => !m.dead);
  }
  if (s.phase !== 'play') return;

  updateUfo(s, dt, frozen);
  updateBoss(s, dt, frozen, speed);
  if (s.phase !== 'play') return;
  updateShower(s, dt, frozen);

  // new meteors
  if (!frozen && !s.shower) {
    s.spawnT -= dt;
    const regular = s.meteors.filter(m => m.kind === 'rock' || m.kind === 'big').length;
    const left = s.spec.goal ? s.spec.goal - s.cleared - regular : Infinity;
    if (!s.meteors.length && !(s.boss && s.boss.prob)) s.spawnT = Math.min(s.spawnT, 0.35);
    if (s.spawnT <= 0 && left > 0 && s.meteors.length < maxOn(s)) {
      const big = s.spec.split && next(s.rng) < s.spec.split;
      addMeteor(s, newProblem(s), big ? 'big' : 'rock');
      s.spawnT = spawnGap(s) * (0.8 + next(s.rng) * 0.4);
    }
  }

  // the answer being typed can't be right any more (its meteor went): start over quietly
  if (s.typed && !targets(s).some(t => String(t.answer).startsWith(s.typed))) { s.typed = ''; s.pending = 0; s.events.push({ type: 'typed' }); }

  if (s.spec.goal && !s.spec.boss && s.cleared >= s.spec.goal) win(s);
}

function updateUfo(s, dt, frozen) {
  if (s.ufo) {
    const u = s.ufo;
    if (!frozen) u.x += u.dir * u.speed * dt;
    u.y = u.baseY + Math.sin((s.t - u.born) * 2.4) * 12;
    if (u.x < -80 || u.x > W + 80) { s.ufo = null; s.events.push({ type: 'ufoGone' }); }
    return;
  }
  if (!s.spec.ufo || frozen || s.shower) return;
  s.ufoT -= dt;
  if (s.ufoT > 0) return;
  s.ufoT = s.spec.ufo * (0.75 + next(s.rng) * 0.5);
  const dir = next(s.rng) < 0.5 ? 1 : -1;
  s.ufo = {
    x: dir > 0 ? -70 : W + 70, baseY: TOP + 56, y: TOP + 56, dir, born: s.t,
    speed: (W + 140) / UFO_TIME, prob: newProblem(s)
  };
  s.events.push({ type: 'ufo' });
}

function updateBoss(s, dt, frozen, speed) {
  const b = s.boss;
  if (!b) return;
  b.hurt = Math.max(0, b.hurt - dt);
  if (b.y < BOSS_TOP) { b.y = Math.min(BOSS_TOP, b.y + 120 * dt); if (b.y < BOSS_TOP) return; }
  if (!b.prob) { b.prob = newProblem(s); b.born = s.t; s.events.push({ type: 'bossAsk' }); }
  if (!frozen) b.y += b.vy * speed * dt;
  if (b.y + BOSS_R >= GROUND) {
    // the boss reached the ground: a shield breaks and it bounces back up
    b.y = BOSS_TOP;
    s.combo = 0;
    s.events.push({ type: 'slam', x: b.x });
    hurt(s);
  }
}

function updateShower(s, dt, frozen) {
  if (!s.shower) {
    if (s.boss) return;
    const start = s.spec.endless ? s.t >= s.showerNext : !s.showerDone && s.cleared >= s.spec.goal * 0.35;
    if (!start) return;
    s.showerDone = true;
    s.showerNext = s.t + 55;
    const tables = s.spec.tables.filter(t => t > 2 && t !== 10);
    const table = tables.length ? pick(s.rng, tables) : 7;
    s.shower = { table, i: 1, upTo: Math.min(12, Math.max(9, s.spec.upTo)), gap: 0.4 };
    s.events.push({ type: 'shower', table });
    return;
  }
  if (frozen) return;
  const sh = s.shower;
  sh.gap -= dt;
  if (sh.gap > 0) return;
  if (sh.i > sh.upTo) {
    // over once the last shooting star has gone
    if (!s.meteors.some(m => m.kind === 'shower')) { s.shower = null; s.spawnT = 1; }
    return;
  }
  const a = sh.table, b = sh.i;
  const x = MARGIN + ((b - 1) / (sh.upTo - 1)) * (W - 2 * MARGIN);
  const prob = { key: null, op: 'mul', text: `${a} × ${b}`, answer: a * b, full: `${a} × ${b} = ${a * b}` };
  addMeteor(s, prob, 'shower', x);
  sh.i++;
  sh.gap = SHOWER_GAP;
}

function land(s, m) {
  m.dead = true;
  s.events.push({ type: 'land', x: m.x, y: GROUND, kind: m.kind, text: m.prob.full });
  if (m.kind === 'shower') return;          // shooting stars just fizzle out
  s.missed++;
  s.combo = 0;
  s.speedK = Math.max(SPEED_MIN, s.speedK - 0.08);
  record(s.stats, m.prob.key, kindOf(m.prob.op), false, 0);
  if (!s.missList.includes(m.prob.full)) s.missList.push(m.prob.full);
  // it'll be back soon, so the right answer gets used straight away
  if (!s.revenge.some(r => r.key === m.prob.key)) s.revenge.push({ key: m.prob.key, op: m.prob.op, at: s.t + 6 + next(s.rng) * 8 });
  if (!s.spec.gentle) hurt(s);
}

function hurt(s) {
  s.shields--;
  s.events.push({ type: 'hurt', shields: s.shields });
  if (s.shields <= 0) lose(s);
}

function win(s) {
  s.phase = 'won';
  for (const m of s.meteors) s.events.push({ type: 'pop', x: m.x, y: m.y, kind: m.kind });
  s.meteors = [];
  s.ufo = null;
  s.typed = '';
  s.events.push({ type: 'won' });
}

function lose(s) {
  s.phase = 'lost';
  s.typed = '';
  s.events.push({ type: 'lost' });
}

// ---------- answering ----------

export function press(s, key) {
  if (s.phase !== 'play' || s.wait > 0) return;
  if (key === 'back') {
    if (s.typed) { s.typed = s.typed.slice(0, -1); s.pending = 0; s.events.push({ type: 'typed' }); }
    return;
  }
  if (key === 'fire') { if (s.typed) check(s, true); return; }
  if (!/^[0-9]$/.test(key) || s.typed.length >= MAX_DIGITS) return;
  if (s.typed === '' && key === '0') { wrong(s); return; }
  s.typed += key;
  s.events.push({ type: 'typed' });
  check(s, false);
}

// does what's typed hit something? `force` (fire key or the wait ran out)
// fires even if a longer answer starts the same way
function check(s, force) {
  const str = s.typed;
  if (!str) return;
  const v = Number(str);
  const ts = targets(s);
  const hits = ts.filter(t => t.answer === v);
  const longer = ts.some(t => String(t.answer).length > str.length && String(t.answer).startsWith(str));
  if (hits.length && (!longer || force)) { fire(s, hits); return; }
  if (longer && !force) { s.pending = hits.length ? WAIT : 0; return; }
  wrong(s);
}

function wrong(s) {
  s.wrong++;
  s.combo = 0;
  s.typed = '';
  s.pending = 0;
  s.events.push({ type: 'wrong' });
}

function fire(s, hits) {
  // the most dangerous one first: the lowest meteor, then the UFO, then the boss
  hits.sort((a, b) => b.danger - a.danger);
  const hit = hits[0];
  const o = hit.obj;
  const prob = o.prob;
  s.typed = '';
  s.pending = 0;
  const ms = Math.min(s.t - (o.born || 0), s.t - s.lastShot) * 1000;
  s.lastShot = s.t;
  s.right++;
  s.combo++;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  const mult = comboMult(s.combo) * (s.fx.double > 0 ? 2 : 1);
  const fast = ms <= FAST_MS;
  const points = (10 + (fast ? 5 : 0)) * mult;
  s.score += points;
  if (ms < 2500) s.speedK = Math.min(SPEED_MAX, s.speedK + 0.025);
  if (prob.key) record(s.stats, prob.key, kindOf(prob.op), true, ms);
  s.events.push({ type: 'zap', target: hit.type, x: o.x, y: o.y, points, mult, combo: s.combo, fast, text: prob.full, kind: o.kind });

  if (hit.type === 'meteor') {
    o.dead = true;
    s.meteors = s.meteors.filter(m => !m.dead);
    if (o.kind === 'rock' || o.kind === 'big') s.cleared++;
    // a big meteor splits: the same fact the other way round
    if (o.kind === 'big') {
      const mini = addMeteor(s, flipProblem(prob, s.rng), 'mini', Math.max(MARGIN, Math.min(W - MARGIN, o.x)), o.y);
      s.events.push({ type: 'split', x: o.x, y: o.y, id: mini.id });
      // the half that's left is extra work, so the next meteor waits a little
      s.spawnT = Math.max(s.spawnT, 0) + spawnGap(s) * 0.6;
    }
  } else if (hit.type === 'ufo') {
    s.ufo = null;
    givePower(s, o.x, o.y);
  } else {
    o.hp--;
    o.hurt = 0.5;
    o.y = Math.max(BOSS_TOP, o.y - 70);
    o.prob = null;
    s.events.push({ type: 'bossHit', hp: o.hp, x: o.x, y: o.y });
    if (o.hp <= 0) { s.events.push({ type: 'bossDown', x: o.x, y: o.y }); s.cleared = o.max; win(s); }
  }
}

function givePower(s, x, y) {
  const list = POWERS.filter(p => !(p.id === 'shield' && s.shields >= SHIELDS && next(s.rng) < 0.7));
  let total = 0;
  for (const p of list) total += p.weight;
  let r = next(s.rng) * total, power = list[0];
  for (const p of list) { r -= p.weight; if (r < 0) { power = p; break; } }
  usePower(s, power.id, x, y);
}

export function usePower(s, id, x, y) {
  s.events.push({ type: 'power', id, x, y });
  if (id === 'freeze' || id === 'slow' || id === 'double') s.fx[id] = POWER_TIME[id];
  else if (id === 'shield') {
    if (s.shields < SHIELDS) s.shields++;
    else s.score += 50;
  } else if (id === 'bomb') {
    for (const m of s.meteors) {
      s.events.push({ type: 'pop', x: m.x, y: m.y, kind: m.kind });
      if (m.kind === 'rock' || m.kind === 'big') s.cleared++;
      s.score += 5;
    }
    s.meteors = [];
  }
}

// ---------- the end ----------

export function result(s) {
  const tries = s.right + s.wrong + s.missed;
  const accuracy = tries ? s.right / tries : 0;
  const stars = s.phase === 'won' ? 1 + (s.shields === SHIELDS ? 1 : 0) + (accuracy >= 0.85 ? 1 : 0) : 0;
  return { won: s.phase === 'won', stars, accuracy, score: s.score, bestCombo: s.bestCombo,
    right: s.right, wrong: s.wrong, missed: s.missed, time: s.t, missList: s.missList.slice(0, 8) };
}

// for the hint dots in Weak Spots: the meteor that's been waiting longest
export function hintTarget(s, after) {
  let best = null;
  for (const m of s.meteors) if (m.kind !== 'shower' && s.t - m.born >= after && (!best || m.y > best.y)) best = m;
  return best;
}

