// Meteor Math rules check — robot kids play every level.
//
//   node tools/meteor-math-sim.mjs          12 runs per level and robot
//   node tools/meteor-math-sim.mjs 20       20 runs each
//
// Checks every file is in the offline list, that every question is a real
// times-table fact with a whole-number answer, that levels only ask their own
// tables, the "1 or 12?" wait before firing, how facts move up and down,
// that shaky facts come up more, the Quick Check, saves and hero unlocks, and
// that robot kids can finish every level (a quick one nearly always, a slower
// one mostly).
// Prints win rates and level lengths for tuning.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'games/meteor-math');
const mod = p => import(pathToFileURL(join(GAME, 'js', p)).href);

const { DT, SHIELDS, WAIT, FAST_MS } = await mod('config.js');
const { FACTS, factPair, makeProblem, flipProblem, record, poolFor, pickFact, weakest, levelOf } = await mod('core/facts.js');
const { LEVELS, WORLDS, ENDLESS, weakSpec } = await mod('data/worlds.js');
const { newGame, update, press, result } = await mod('core/game.js');
const { newCheck, answer, apply, CHECK_SIZE } = await mod('core/placement.js');
const { makeRng, next } = await mod('core/rng.js');

// save.js reads localStorage only inside load/persist, so it imports fine in node
const { clean, cleanStats, defaults, isOpen } = await mod('save.js');
const { HEROES, heroOpen } = await mod('data/heroes.js');

const RUNS = Number(process.argv[2]) || 12;
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

// ---- the facts and the questions made from them ----
if (FACTS.length !== 78) fail('expected 78 facts, got ' + FACTS.length);
function solve(text) {
  let m;
  if ((m = text.match(/^(\d+) × (\d+)$/))) return +m[1] * +m[2];
  if ((m = text.match(/^(\d+) ÷ (\d+)$/))) { const q = +m[1] / +m[2]; return Number.isInteger(q) ? q : NaN; }
  if ((m = text.match(/^(\d+) × \? = (\d+)$/))) { const q = +m[2] / +m[1]; return Number.isInteger(q) ? q : NaN; }
  return NaN;
}
{
  const rng = makeRng(1);
  for (const key of FACTS) for (const op of ['mul', 'div', 'miss']) for (let i = 0; i < 6; i++) {
    const p = makeProblem(key, op, rng);
    if (solve(p.text) !== p.answer) fail(`${key}/${op}: "${p.text}" has answer ${p.answer}, really ${solve(p.text)}`);
    if (!(p.answer >= 1 && p.answer <= 144)) fail(`${p.text}: answer ${p.answer} out of range`);
    if (!p.full.includes('= ')) fail(`${p.text}: no full sentence`);
    const f = flipProblem(p, rng);
    if (f.key !== key || (f.op === 'mul') === (p.op === 'mul')) fail(`${p.text}: split meteor isn't the same fact the other way round`);
  }
}

// ---- levels: sensible data, their own tables, every fact somewhere ----
{
  const covered = new Set();
  for (const l of LEVELS) {
    const pool = poolFor(l.tables, l.upTo);
    if (pool.length < 6) fail(`${l.id}: only ${pool.length} facts`);
    pool.forEach(k => covered.add(k));
    if (!l.boss && !(l.goal > 0)) fail(`${l.id}: no goal`);
    if (l.boss && !(l.boss.hp > 0)) fail(`${l.id}: boss with no health`);
    if (!Object.keys(l.ops).every(o => ['mul', 'div', 'miss'].includes(o))) fail(`${l.id}: unknown question kind`);
  }
  const missing = FACTS.filter(k => k !== '1x1' && !covered.has(k));
  if (missing.length) fail('facts no level asks: ' + missing.join(' '));
  if (LEVELS.length !== WORLDS.length * 6) fail('expected 6 levels per world');
}

// ---- how a fact moves up and down ----
{
  const st = {};
  record(st, '7x8', 'mul', true, 1500);
  record(st, '7x8', 'mul', true, 1500);
  if (levelOf(st, '7x8', 'mul') !== 2) fail('two quick right answers should reach level 2');
  record(st, '7x8', 'mul', true, FAST_MS + 2000);
  if (levelOf(st, '7x8', 'mul') !== 2) fail('a slow right answer should not climb past 2');
  record(st, '7x8', 'mul', true, 900); record(st, '7x8', 'mul', true, 900); record(st, '7x8', 'mul', true, 900);
  if (levelOf(st, '7x8', 'mul') !== 4) fail('quick answers should top out at level 4');
  record(st, '7x8', 'mul', false, 0);
  if (levelOf(st, '7x8', 'mul') !== 2) fail('a miss should drop two levels');
  if (st['7x8'].mul[1] !== 7 || st['7x8'].mul[2] !== 1) fail('seen / wrong counts are off: ' + st['7x8'].mul);
  if (levelOf(st, '7x8', 'div') !== 0) fail('mul and div should be tracked separately');
}

// ---- shaky facts come up more ----
{
  const pool = poolFor([6, 7, 8, 9], 9);
  const st = {};
  for (const k of pool) st[k] = { mul: [4, 10, 0, 1200] };
  st['7x8'] = { mul: [0, 10, 6, 6000] };
  st['6x9'] = { mul: [0, 10, 5, 5000] };
  const rng = makeRng(5);
  const n = {};
  for (let i = 0; i < 20000; i++) { const k = pickFact(pool, st, 'mul', rng, new Set()); n[k] = (n[k] || 0) + 1; }
  const avg = 20000 / pool.length;
  for (const k of ['7x8', '6x9']) if (!(n[k] > avg * 4)) fail(`weak fact ${k} came up ${n[k]} times, average ${avg.toFixed(0)}`);
  const weak = weakest(st, 12);
  if (weak.length !== 12) fail('weakest() should fill up to 12');
  if (weak[0].key !== '7x8' && weak[0].key !== '6x9') fail('weakest() should start with the shakiest fact, got ' + weak[0].key);
  // and in a real round
  const s = newGame(LEVELS[2], st, 9);
  const seen = {};
  for (let i = 0; i < 60 * 400 && s.phase === 'play'; i++) {
    update(s, DT);
    for (const e of s.events) if (e.type === 'spawn') { const m = s.meteors.find(x => x.id === e.id); if (m) seen[m.prob.key] = (seen[m.prob.key] || 0) + 1; }
    s.events.length = 0;
    // zap whatever is lowest straight away, so the round keeps spawning
    const low = s.meteors.slice().sort((a, b) => b.y - a.y)[0];
    if (low && s.t - low.born > 1) for (const ch of String(low.prob.answer)) press(s, ch);
    if (s.pending) press(s, 'fire');
  }
}

// ---- typing: "1" waits while a 12 is falling, "12" fires at once ----
{
  const spec = Object.assign({}, LEVELS[0], { goal: 50 });
  const mk = () => {
    const s = newGame(spec, {}, 3);
    s.wait = 0; s.spawnT = 99;
    s.meteors.push({ id: 900, kind: 'rock', r: 40, x: 100, y: 200, vy: 0, born: 0, spin: 0, seed: 0.1, prob: { key: '1x1', op: 'mul', text: '1 × 1', answer: 1, full: '1 × 1 = 1' } });
    s.meteors.push({ id: 901, kind: 'rock', r: 40, x: 300, y: 200, vy: 0, born: 0, spin: 0, seed: 0.2, prob: { key: '3x4', op: 'mul', text: '3 × 4', answer: 12, full: '3 × 4 = 12' } });
    return s;
  };
  let s = mk();
  press(s, '1');
  if (s.meteors.length !== 2 || !(s.pending > 0)) fail('"1" with a 12 on screen should wait');
  for (let i = 0; i < Math.ceil((WAIT + 0.1) / DT); i++) update(s, DT);
  if (s.meteors.some(m => m.id === 900)) fail('after the wait, "1" should zap the 1');
  s = mk();
  press(s, '1'); press(s, '2');
  if (s.meteors.some(m => m.id === 901) || !s.meteors.some(m => m.id === 900)) fail('"12" should zap the 12 straight away');
  s = mk();
  press(s, '1'); press(s, 'fire');
  if (s.meteors.some(m => m.id === 900)) fail('fire should zap the 1 without waiting');
  s = mk();
  press(s, '5');
  if (s.wrong !== 1 || s.typed !== '' || s.shields !== SHIELDS) fail('an answer nothing has should count as wrong, cost no shield, and clear');
}

// ---- saves ----
{
  const st = {};
  record(st, '7x8', 'mul', true, 1000);
  record(st, '9x12', 'div', false, 0);
  const sv = Object.assign(defaults(), { checked: true, unlocked: 2, best: 1234, stars: { '1-1': 3, '2-B': 2 }, stats: st });
  const back = clean(JSON.parse(JSON.stringify(sv)));
  if (JSON.stringify(back) !== JSON.stringify(sv)) fail('save does not survive a round trip');
  for (const bad of [null, 'x', 42, [], { unlocked: 99, best: -5, stars: { '9-9': 3, '1-1': 'x' }, stats: { '7x8': { mul: [9, 'a', 1] }, 'zz': {} } }]) {
    const c = clean(bad);
    if (c.unlocked < 0 || c.unlocked >= WORLDS.length || c.best < 0 || c.stars['9-9'] || Object.keys(c.stats).length) fail('a broken save got through: ' + JSON.stringify(bad));
  }
  const c2 = cleanStats({ '7x8': { mul: [7, 3, 1, 999999] } });
  if (c2['7x8'].mul[0] !== 4 || c2['7x8'].mul[3] !== 60000) fail('stats should be clamped');
  // heroes: a locked hero can't be smuggled in through the save
  if (clean({ hero: 'frog', stars: {} }).hero !== 'dino') fail('a locked hero should fall back to Dino');
  if (clean({ hero: 'bunny' }).hero !== 'bunny') fail('Bunny should be free from the start');
  const lots = {}; LEVELS.slice(0, 17).forEach(l => { lots[l.id] = 3; });
  if (clean({ hero: 'frog', stars: lots }).hero !== 'frog') fail('Frog should open with 51 stars');
  if (HEROES.filter(h => heroOpen(h, {})).length < 2) fail('there should be a few heroes to pick from at the start');
  if (Math.max(...HEROES.map(h => h.stars)) > LEVELS.length * 3 * 0.75) fail('the last hero should open well before every star is collected');
  const fresh = defaults();
  if (!isOpen(fresh, LEVELS[0]) || isOpen(fresh, LEVELS[1]) || isOpen(fresh, LEVELS[6])) fail('a fresh save should open just level 1-1');
}

// ---- quick check ----
{
  for (let seed = 1; seed <= 30; seed++) {
    const c = newCheck(seed);
    const keys = new Set(c.items.map(it => it.prob.key));
    if (c.items.length !== CHECK_SIZE || keys.size !== CHECK_SIZE) fail(`check ${seed}: ${c.items.length} items, ${keys.size} different facts`);
    if (c.items.some(it => solve(it.prob.text) !== it.prob.answer)) fail(`check ${seed}: a wrong answer key`);
  }
  let c = newCheck(7);
  while (!c.done) answer(c, c.items[c.i].prob.answer, 1500);
  let st = {}, out = apply(c, st);
  if (out.world !== 3 || out.right !== CHECK_SIZE) fail('a perfect quick check should open every world, got ' + out.world);
  if (levelOf(st, '3x4', 'mul') !== 2) fail('a strong check should mark the easy facts as known');
  c = newCheck(7);
  while (!c.done) answer(c, null, 9000);
  st = {}; out = apply(c, st);
  if (out.world !== 0 || out.right !== 0) fail('a check with no answers should start at world 1');
  if (levelOf(st, '3x4', 'mul') !== 0) fail('a weak check should not fill in facts');
}

// ---- robot kids ----
// think: seconds before starting to type; acc: chance the answer is right
const KIDS = {
  quick: { think: [1.0, 2.2], acc: 0.95, hard: 0.9 },
  steady: { think: [1.8, 3.6], acc: 0.88, hard: 0.78 }
};

function robot(kid, seed) {
  const rng = makeRng(seed);
  const b = { prob: null, readyAt: 0, plan: '', keyAt: 0 };
  const between = ([lo, hi]) => lo + next(rng) * (hi - lo);
  return s => {
    const live = [];
    for (const m of s.meteors) live.push({ prob: m.prob, y: m.y });
    if (s.boss && s.boss.prob) live.push({ prob: s.boss.prob, y: s.boss.y - 300 });
    if (s.ufo) live.push({ prob: s.ufo.prob, y: -400 });
    if (b.prob && !live.some(l => l.prob === b.prob)) { b.prob = null; b.plan = ''; while (s.typed) press(s, 'back'); }
    if (!b.prob) {
      if (!live.length) return;
      live.sort((x, y) => y.y - x.y);
      b.prob = live[0].prob;
      b.readyAt = s.t + between(kid.think);
      b.plan = null;
    }
    if (s.t < b.readyAt) return;
    if (b.plan === null) {
      const hard = b.prob.key && factPair(b.prob.key)[1] >= 11;
      const ok = next(rng) < (hard ? kid.hard : kid.acc);
      let v = b.prob.answer;
      if (!ok) { v += [1, -1, 2, 10, -2][Math.floor(next(rng) * 5)]; if (v < 1) v = b.prob.answer + 1; }
      b.plan = String(v);
      b.keyAt = s.t;
    }
    if (b.plan.length && s.t >= b.keyAt) {
      press(s, b.plan[0]);
      b.plan = b.plan.slice(1);
      b.keyAt = s.t + 0.18;
    } else if (!b.plan.length) {
      if (s.pending > 0 && next(rng) < 0.05) press(s, 'fire');
      if (!s.typed) b.prob = null;
    }
  };
}

function play(spec, stats, kid, seed, maxMin) {
  const s = newGame(spec, stats, seed);
  const bot = robot(kid, seed * 7 + 1);
  const allowed = new Set(spec.pairs ? spec.pairs.map(p => p.key) : poolFor(spec.tables, spec.upTo));
  let bad = null, ticks = 0, kinds = {};
  while (s.phase === 'play' && ticks < maxMin * 60 / DT) {
    update(s, DT);
    bot(s);
    for (const e of s.events) {
      kinds[e.type] = (kinds[e.type] || 0) + 1;
      if (e.type === 'spawn') {
        const m = s.meteors.find(x => x.id === e.id);
        if (m && m.prob.key && !allowed.has(m.prob.key) && !m.prob.revenge && m.kind !== 'mini') bad = `${m.prob.text} isn't one of ${spec.id}'s facts`;
        if (m && solve(m.prob.text) !== m.prob.answer) bad = `${m.prob.text} has answer ${m.prob.answer}`;
      }
    }
    s.events.length = 0;
    ticks++;
  }
  return { s, res: result(s), bad, stuck: s.phase === 'play', kinds };
}

console.log('\nlevel  robot   wins   avg time   right   ufo/shower/split');
for (const l of LEVELS) {
  for (const [name, kid] of Object.entries(KIDS)) {
    let wins = 0, time = 0, acc = 0;
    const ev = { ufo: 0, shower: 0, split: 0 };
    for (let r = 0; r < RUNS; r++) {
      const { res, bad, stuck, kinds } = play(l, {}, kid, 1000 + r * 13 + l.world * 101 + l.index, 12);
      if (bad) fail(`${l.id}: ${bad}`);
      if (stuck) fail(`${l.id} (${name}): still going after 12 minutes`);
      if (res.won) wins++;
      time += res.time; acc += res.accuracy;
      for (const k in ev) ev[k] += kinds[k] || 0;
    }
    console.log(`${l.id.padEnd(6)} ${name.padEnd(7)} ${String(wins).padStart(2)}/${RUNS}   ${(time / RUNS / 60).toFixed(1).padStart(4)} min   ${Math.round(acc / RUNS * 100)}%     ${ev.ufo}/${ev.shower}/${ev.split}`);
    if (name === 'quick' && wins < RUNS * 0.8) fail(`${l.id}: a quick player only won ${wins}/${RUNS}`);
    if (name === 'steady' && wins < RUNS * 0.35) fail(`${l.id}: a steady player only won ${wins}/${RUNS}`);
    if (l.ufo && !ev.ufo) fail(`${l.id}: no UFO ever came`);
    if (l.shower && !ev.shower) fail(`${l.id}: no shower ever came`);
    if (l.split && !ev.split) fail(`${l.id}: nothing ever split`);
  }
}

// endless ends, and gets harder; weak spots never breaks a shield
{
  let total = 0;
  for (let r = 0; r < RUNS; r++) {
    const { res, stuck } = play(ENDLESS, {}, KIDS.steady, 50 + r, 30);
    if (stuck) fail('endless never ended in 30 minutes for a steady player');
    total += res.time;
  }
  console.log(`\nendless: a steady player lasts ${(total / RUNS / 60).toFixed(1)} min on average`);
  const st = {};
  for (const k of FACTS) st[k] = { mul: [3, 5, 0, 2000], div: [3, 5, 0, 2000] };
  st['7x8'].mul = [0, 6, 4, 7000];
  st['8x12'].div = [0, 6, 3, 8000];
  const spec = weakSpec(weakest(st, 12));
  const { s, res, stuck } = play(spec, st, { think: [3, 6], acc: 0.6, hard: 0.6 }, 77, 20);
  if (stuck || !res.won) fail('weak spots should always finish with a win');
  if (s.shields !== SHIELDS) fail('weak spots should never break a shield');
  console.log(`weak spots: ${(res.time / 60).toFixed(1)} min for a struggling player`);
}

console.log(failed ? '\nSOME CHECKS FAILED' : '\nall checks passed');
process.exit(failed ? 1 : 0);
