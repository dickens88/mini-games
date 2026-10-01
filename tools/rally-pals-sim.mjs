// Rally Pals rules check — two robots play whole matches on every court.
//
//   node tools/rally-pals-sim.mjs          4 matches per court and robot level
//   node tools/rally-pals-sim.mjs 20       20 matches each
//
// Checks every file is in the offline list, tennis scoring (deuce, advantage,
// games), that clean shots land in from anywhere a pal can hit, and that robot
// matches always finish with real rallies. Prints rally lengths and how points
// were won, for tuning.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'games/rally-pals');
const mod = p => import(join(GAME, 'js', p));

const { DT, FLOOR, NET_X, COURT_L, COURT_R, BALL_R, FORMATS } = await mod('config.js');
const { COURTS } = await mod('data/courts.js');
const { PALS } = await mod('data/pals.js');
const { newScore, award, call, pointLabel, bigPoint } = await mod('core/score.js');
const { planShot, SHOTS } = await mod('core/shot.js');
const { newBall, moveBall } = await mod('core/physics.js');
const { newMatch, step } = await mod('core/match.js');
const { newBrain, think } = await mod('core/ai.js');

const RUNS = Number(process.argv[2]) || 4;
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

// ---- scoring ----
{
  const s = newScore('set3');
  const seq = (who, n) => { for (let i = 0; i < n; i++) award(s, who); };
  seq(0, 3); seq(1, 3);
  if (call(s, 0).text !== 'Deuce') fail('3–3 should be deuce, got ' + call(s, 0).text);
  award(s, 1);
  if (call(s, 0).kind !== 'adv' || call(s, 0).who !== 1 || pointLabel(s, 1) !== 'AD') fail('advantage to player 2 expected');
  if (!bigPoint(s) || bigPoint(s).who !== 1) fail('player 2 should be on game point');
  award(s, 0);
  if (call(s, 0).text !== 'Deuce') fail('back to deuce expected');
  seq(0, 2);
  if (s.games[0] !== 1 || s.points[0] !== 0) fail('player 1 should have won the game');
  seq(0, 8);
  if (s.winner !== 0) fail('player 1 should have won 3 games to 0');
  if (call(newScore('set3'), 0).text !== 'Love all') fail('a new game is love all');
  const q = newScore('quick');
  for (let i = 0; i < 6; i++) { award(q, 0); award(q, 1); }
  if (q.winner !== -1 || bigPoint(q).kind !== 'match') fail('6–6 should be match point, not over');
  award(q, 1);
  if (q.winner !== 1) fail('quick match should end at 7');
}

// ---- clean shots land in, from anywhere a pal can reach ----
for (const court of COURTS) {
  const env = { g: court.gravity, wind: 0, bounce: court.bounce, skid: court.skid };
  let tries = 0, inside = 0, net = 0;
  for (const kind of Object.keys(SHOTS)) {
    for (let x = 30; x < NET_X - 20; x += 23) {
      for (let h = 15; h <= (kind === 'smash' ? 230 : 130); h += 23) {
        for (const r of [0.05, 0.5, 0.95]) {
          for (const side of [0, 1]) {
            const bx = side === 0 ? x : 960 - x;
            const shot = planShot(bx, FLOOR - h, side, kind, 1, court.gravity, 0, false, r, 1 - r);
            const b = Object.assign(newBall(), { x: bx, y: FLOOR - h, vx: shot.vx, vy: shot.vy, held: false });
            let land = null;
            for (let i = 0; i < 1200 && land === null; i++) {
              const hit = moveBall(b, env, DT);
              if (hit && hit.floor !== undefined) land = hit.floor;
            }
            tries++;
            if (b.netTouch) net++;
            const other = side === 0 ? land > NET_X : land < NET_X;
            if (land !== null && other && land >= COURT_L && land <= COURT_R) inside++;
          }
        }
      }
    }
  }
  const pct = (100 * inside / tries).toFixed(1);
  console.log(`${court.name.padEnd(12)} clean shots in: ${pct}%  (net cord ${net})`);
  if (inside / tries < 0.97) fail(`${court.name}: only ${pct}% of clean shots land in`);
}

// ---- robot matches ----
const REASONS = ['ace', 'winner', 'smash', 'fire', 'header', 'out', 'net', 'short'];
for (const court of COURTS) {
  for (const level of ['easy', 'normal', 'hard']) {
    const sum = { rallies: [], reasons: {}, points: 0, time: 0, powers: 0, smashes: 0, headers: 0, wins: [0, 0] };
    for (let run = 0; run < RUNS; run++) {
      const seed = 1000 + run * 77;
      const s = newMatch({ pals: [PALS[run % 6].id, PALS[(run + 1) % 6].id], court: court.id, format: run % 2 ? 'set3' : 'quick', seed });
      const brains = [newBrain(level, seed + 1), newBrain(level, seed + 2)];
      let ticks = 0;
      while (s.phase !== 'over' && ticks < 120 * 60 * 30) {
        const ev = step(s, [think(brains[0], s, 0), think(brains[1], s, 1)], DT);
        ticks++;
        for (const e of ev) {
          if (e.type === 'point') {
            sum.points++;
            sum.rallies.push(e.rally);
            sum.reasons[e.reason] = (sum.reasons[e.reason] || 0) + 1;
            if (!REASONS.includes(e.reason)) fail('unknown point reason ' + e.reason);
          }
        }
        const b = s.ball;
        if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) { fail(`${court.id}/${level}: ball position is not a number`); break; }
        for (const p of s.players) {
          if (p.side === 0 ? p.x > NET_X : p.x < NET_X) fail(`${court.id}: a pal walked through the net`);
        }
        if (s.phase === 'rally' && s.rallyT > 90) { fail(`${court.id}/${level}: a rally lasted 90 seconds`); break; }
      }
      if (s.phase !== 'over') { fail(`${court.id}/${level} run ${run}: match never finished`); continue; }
      sum.time += ticks * DT;
      sum.powers += s.stats.powers[0] + s.stats.powers[1];
      sum.smashes += s.stats.smashes[0] + s.stats.smashes[1];
      sum.headers += s.stats.headers[0] + s.stats.headers[1];
      sum.wins[s.score.winner]++;
    }
    const r = sum.rallies;
    const avg = r.reduce((a, b) => a + b, 0) / (r.length || 1);
    const long = r.filter(n => n >= 6).length / (r.length || 1);
    const reasons = REASONS.filter(k => sum.reasons[k]).map(k => `${k} ${Math.round(100 * sum.reasons[k] / sum.points)}%`).join(', ');
    console.log(`${court.name.padEnd(12)} ${level.padEnd(6)} avg rally ${avg.toFixed(1)}, 6+ hits ${(100 * long).toFixed(0)}%, ` +
      `${(sum.time / RUNS / 60).toFixed(1)} min/match, smashes ${sum.smashes}, headers ${sum.headers}, powers ${sum.powers}, wins ${sum.wins.join(':')}`);
    console.log(`${''.padEnd(19)} ${reasons}`);
    if (level !== 'easy' && avg < 2.5) fail(`${court.name}/${level}: rallies too short (${avg.toFixed(1)})`);
  }
}

console.log(failed ? '\nSOME CHECKS FAILED' : '\nall checks passed');
process.exit(failed ? 1 : 0);
