// The computer pal. It reads the match like a player would: it waits a moment
// after the other pal hits, guesses where the ball will come down, runs there
// and swings when the ball is in reach. Easier robots react later, run slower,
// misjudge more and sometimes swing at nothing.

import { FLOOR, NET_X, COURT_L, COURT_R, SWING, W } from '../config.js';
import { makeRng, next } from './rng.js';
import { predict } from './physics.js';
import { env } from './match.js';
import { hitZone, reachOf, sizeOf } from './player.js';

export const LEVELS = {
  easy: { name: 'Easy', react: 0.34, run: 0.68, guess: 34, whiff: 0.2, judgeOut: 0.15, smash: 0.15 },
  normal: { name: 'Normal', react: 0.2, run: 0.86, guess: 16, whiff: 0.07, judgeOut: 0.5, smash: 0.5 },
  hard: { name: 'Hard', react: 0.1, run: 1, guess: 5, whiff: 0.015, judgeOut: 0.9, smash: 0.9 }
};

export function newBrain(level, seed) {
  return { L: LEVELS[level] || LEVELS.normal, rng: makeRng(seed | 0), wait: 0, seen: '', plan: null,
    replan: 0, err: 0, shot: 0, serveAt: 0, runAcc: 0, letGo: false, rolled: '', noSwing: 0, trySmash: false };
}

export function think(brain, s, me) {
  const L = brain.L, p = s.players[me], ball = s.ball;
  const input = { left: false, right: false, jump: false, swing: false };
  const home = me === 0 ? 170 : W - 170;
  let goal = home;

  if (s.phase === 'over') return input;

  if (s.phase === 'serve') {
    if (s.server === me) {
      if (!brain.serveAt) { brain.serveAt = s.phaseT + 0.5 + next(brain.rng) * 0.9; brain.shot = pickShot(brain, s, me); }
      if (!ball.tossed && s.phaseT >= brain.serveAt) input.swing = true;
      if (ball.tossed) hold(input, p, brain.shot);
      return input;
    }
    brain.serveAt = 0;
    goal = me === 0 ? 150 : W - 150;
    return walk(brain, input, p, goal, 10);
  }
  brain.serveAt = 0;

  // the other pal just touched it: take a moment to react, then make a plan
  const key = s.score.points.join() + '/' + s.score.games.join() + '/' + s.rally;
  if (key !== brain.seen) {
    brain.seen = key;
    brain.plan = null;
    brain.letGo = false;
    if (ball.lastHitter >= 0 && ball.lastHitter !== me) {
      brain.wait = L.react * (0.7 + next(brain.rng) * 0.6);
      brain.err = (next(brain.rng) - 0.5) * 2 * L.guess;
      brain.shot = pickShot(brain, s, me);
      brain.trySmash = next(brain.rng) < L.smash * 0.5;
    }
  }
  if (brain.wait > 0) { brain.wait -= 1 / 120; return walk(brain, input, p, p.x, 999); }

  const coming = ball.lastHitter !== me && s.phase === 'rally';
  if (coming) {
    brain.replan -= 1 / 120;
    if (!brain.plan || brain.replan <= 0) { brain.plan = plan(s, me, p, brain); brain.replan = 0.12; }
    const pl = brain.plan;
    if (pl && !brain.letGo) {
      const left = pl.at - s.t;
      goal = pl.x - p.dir * SWING.ahead * sizeOf(p) + brain.err * Math.min(1, Math.max(0, left));
      if (pl.jump && p.onGround && left < 0.3 && left > 0.15) input.jump = true;
    }
    // close enough: swing (unless it's going out and we know to leave it)
    const z = hitZone(p);
    const d = Math.hypot(ball.x - z.x, ball.y - z.y);
    const myHalf = me === 0 ? ball.x < NET_X : ball.x > NET_X;
    const closing = (ball.x - z.x) * ball.vx < 0 || (ball.y - z.y) * ball.vy < 0;
    if (myHalf && !brain.letGo && d < reachOf(p) * (closing ? 0.75 : 0.95) && p.swingT < 0 && !p.prevSwing && s.t >= brain.noSwing) {
      // now and then a robot just misses the moment
      if (brain.rolled !== brain.seen) {
        brain.rolled = brain.seen;
        if (next(brain.rng) < L.whiff + s.rally * 0.003) brain.noSwing = s.t + 0.35;
      }
      if (s.t >= brain.noSwing) { input.swing = true; hold(input, p, brain.shot); }
    }
    if (input.swing) return input;
  } else if (s.phase === 'rally') {
    // our own shot is on its way: drift back toward the middle of our half,
    // closer to the net after a smash
    goal = ball.kind === 'smash' ? (me === 0 ? 300 : W - 300) : home;
  }
  return walk(brain, input, p, goal, 7);
}

function hold(input, p, shot) {
  if (shot > 0) { if (p.dir > 0) input.right = true; else input.left = true; }
  if (shot < 0) { if (p.dir > 0) input.left = true; else input.right = true; }
}

// drive at a pal hanging back, lob a pal at the net, mostly just play it safe
function pickShot(brain, s, me) {
  const them = s.players[1 - me];
  const nearNet = Math.abs(them.x - NET_X) < 140;
  const r = next(brain.rng);
  if (nearNet) return r < 0.55 ? -1 : r < 0.8 ? 0 : 1;
  return r < 0.5 ? 0 : r < 0.8 ? 1 : -1;
}

// where to meet the ball: the first point on its path in our half that is at
// racket height and that we can run to in time
function plan(s, me, p, brain) {
  const L = brain.L;
  const { path, floors } = predict(s.ball, env(s), 3, 2);
  const mine = x => (me === 0 ? x < NET_X - 4 : x > NET_X + 4);
  const z = hitZone(p);
  const zoneUp = p.y - z.y;
  const speed = 330 * L.run * (p.fx.speed > 0 ? 1.4 : 1);
  // going to land out? a good player leaves it
  const first = floors[0];
  if (s.ball.bounces === 0 && first && mine(first.x) && (first.x < COURT_L - 6 || first.x > COURT_R + 6) && next(brain.rng) < L.judgeOut) {
    brain.letGo = true;
    return null;
  }
  let best = null;
  for (const q of path) {
    if (!mine(q.x)) continue;
    if (q.bounces + s.ball.bounces >= 2) break;
    const lo = me === 0 ? 22 : NET_X + 26, hi = me === 0 ? NET_X - 26 : W - 22;
    const stand = q.x - p.dir * SWING.ahead * sizeOf(p);
    if (stand < lo - 10 || stand > hi + 10) continue;
    const runT = Math.abs(stand - p.x) / speed;
    const h = FLOOR - q.y;
    const reachable = runT < q.t + 0.05;
    if (!reachable) continue;
    // high and dropping near the net: jump and smash it
    if (brain.trySmash && h > zoneUp + 70 && h < zoneUp + 130 && q.vy > 0 && q.t > 0.25) {
      return { x: q.x, at: s.t + q.t, jump: true };
    }
    if (Math.abs(h - zoneUp) < reachOf(p) * 0.55 && q.vy > -200) return { x: q.x, at: s.t + q.t };
    if (!best) best = { x: q.x, at: s.t + q.t };
  }
  return best;
}

function walk(brain, input, p, goal, slack) {
  const dx = goal - p.x;
  if (Math.abs(dx) <= slack) return input;
  // a slower robot only pushes the stick some of the time
  brain.runAcc += brain.L.run;
  if (brain.runAcc < 1) return input;
  brain.runAcc -= 1;
  if (dx > 0) input.right = true; else input.left = true;
  return input;
}
