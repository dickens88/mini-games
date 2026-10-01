// One match: serving, the rally, deciding who won each point, power-up
// bubbles and the wind. step() moves everything on by one tick and returns a
// list of what happened, which the page turns into sounds, sparkles and
// banners. Nothing in here touches the page, so the robot check runs it in node.

import { W, FLOOR, NET_X, NET_TOP, COURT_L, COURT_R, BALL_R, DT, POINT_PAUSE, AUTO_SERVE } from '../config.js';
import { courtById } from '../data/courts.js';
import { powerById, POWERUPS } from '../data/powerups.js';
import { makeRng, next, int, pick } from './rng.js';
import { newBall, moveBall } from './physics.js';
import { planShot } from './shot.js';
import { newPlayer, movePlayer, hitZone, bodyCircles, swingActive, sizeOf, setMood } from './player.js';
import { newScore, award, serverFor, call, bigPoint } from './score.js';

const IDLE = { left: false, right: false, jump: false, swing: false };

export function newMatch(o) {
  const seed = o.seed === undefined ? (Math.random() * 2 ** 31) | 0 : o.seed;
  const s = {
    opts: { pals: o.pals, court: o.court, format: o.format, powerups: o.powerups !== false },
    court: courtById(o.court),
    rng: makeRng(seed),
    t: 0, phase: 'serve', phaseT: 0,
    players: [newPlayer(0, o.pals[0]), newPlayer(1, o.pals[1])],
    ball: newBall(),
    score: newScore(o.format),
    firstServer: 0, server: 0,
    bubbles: [], bubbleT: 4, bubbleId: 0,
    wind: 0, windTarget: 0, windT: 3,
    rally: 0, rallyT: 0,
    last: null,
    stats: { longest: 0, hits: 0, points: [0, 0], aces: [0, 0], smashes: [0, 0], headers: [0, 0], powers: [0, 0] }
  };
  s.firstServer = int(s.rng, 2);
  resetForServe(s);
  return s;
}

export function env(s) {
  const c = s.court;
  return { g: c.gravity, wind: s.wind, bounce: c.bounce, skid: c.skid, grip: c.grip, lowGravity: !!c.lowGravity };
}

function resetForServe(s) {
  s.server = serverFor(s.score, s.firstServer);
  for (const p of s.players) {
    const serving = p.side === s.server;
    const back = serving ? 104 : 150;
    p.x = p.side === 0 ? back : W - back;
    p.y = FLOOR; p.vx = 0; p.vy = 0; p.onGround = true;
    p.swingT = -1; p.stun = 0;
  }
  Object.assign(s.ball, newBall());
  holdBall(s);
  s.phase = 'serve'; s.phaseT = 0;
  s.rally = 0; s.rallyT = 0;
}

function holdBall(s) {
  const p = s.players[s.server];
  s.ball.x = p.x + p.dir * 14;
  s.ball.y = p.y - 100 * sizeOf(p) + Math.sin(s.t * 4) * 3;
  s.ball.vx = 0; s.ball.vy = 0;
}

// the serving pal stays near their own baseline
function serveLock(s, p) {
  if (p.side !== s.server) return null;
  return p.side === 0 ? [COURT_L - 30, COURT_L + 120] : [COURT_R - 120, COURT_R + 30];
}

export function step(s, inputs, dt = DT) {
  const ev = [];
  const e = env(s);
  s.t += dt; s.phaseT += dt;
  if (s.phase === 'rally') s.rallyT += dt;

  updateWind(s, dt, ev);
  e.wind = s.wind;

  const ball = s.ball;
  const tossing = s.phase === 'serve' && ball.tossed;
  s.players.forEach((p, i) => {
    const input = (s.phase === 'over' ? IDLE : inputs[i]) || IDLE;
    const r = movePlayer(p, input, e, dt, { lock: s.phase === 'serve' ? serveLock(s, p) : null, still: tossing && i === s.server });
    if (r.jump) ev.push({ type: 'jump', who: i });
    if (r.land) ev.push({ type: 'land', who: i, x: p.x });
    if (r.swing) ev.push({ type: 'swing', who: i });
  });

  if (s.phase === 'serve') serving(s, inputs, e, ev, dt);
  else {
    ball.sinceHit += dt;
    const touched = moveBall(ball, ball.lastHitter >= 0 ? e : { ...e, wind: 0 }, dt);
    if (touched && touched.net) ev.push({ type: 'net', x: ball.x, y: ball.y });
    if (s.phase === 'rally') {
      rackets(s, e, ev);
      headers(s, ev);
      bubbles(s, ev);
      if (touched && touched.floor !== undefined) floorRule(s, touched, ev);
      else if (ball.x < -BALL_R * 3 || ball.x > W + BALL_R * 3) awayRule(s, ev);
    } else {
      if (touched && touched.floor !== undefined && touched.speed > 120) ev.push({ type: 'bounce', x: ball.x, quiet: true });
      // after the point the ball just rolls away and stops at the walls
      if (ball.x < BALL_R || ball.x > W - BALL_R) { ball.vx *= -0.4; ball.x = Math.max(BALL_R, Math.min(W - BALL_R, ball.x)); }
    }
  }

  if (s.phase === 'rally' || s.phase === 'serve') tickBubbles(s, dt, ev);

  if (s.phase === 'point' && s.phaseT >= POINT_PAUSE) {
    if (s.score.winner >= 0) { s.phase = 'over'; s.phaseT = 0; ev.push({ type: 'over', winner: s.score.winner }); }
    else { resetForServe(s); ev.push({ type: 'ready', server: s.server, call: call(s.score, s.server), big: bigPoint(s.score) }); }
  }
  return ev;
}

function updateWind(s, dt, ev) {
  if (!s.court.wind) return;
  s.windT -= dt;
  if (s.windT <= 0) {
    s.windT = 5 + next(s.rng) * 4;
    const calm = next(s.rng) < 0.2;
    const prev = s.windTarget;
    s.windTarget = calm ? 0 : (next(s.rng) < 0.5 ? -1 : 1) * s.court.wind * (0.45 + next(s.rng) * 0.55);
    if (Math.sign(prev) !== Math.sign(s.windTarget) || Math.abs(prev - s.windTarget) > 60) ev.push({ type: 'wind', to: s.windTarget });
  }
  s.wind += (s.windTarget - s.wind) * Math.min(1, dt * 1.2);
}

// ---------- serving ----------

function serving(s, inputs, e, ev, dt) {
  const ball = s.ball, p = s.players[s.server];
  const input = inputs[s.server] || IDLE;
  if (!ball.tossed) {
    holdBall(s);
    // a press of swing tosses the ball up; nobody serving for a while tosses it anyway
    if ((input.swing && p.swingT === 0) || s.phaseT > AUTO_SERVE) {
      ball.tossed = true;
      ball.held = false;
      ball.vy = -440;
      p.swingT = -1;
      ev.push({ type: 'toss', who: s.server });
    }
    return;
  }
  moveBall(ball, { ...e, wind: 0 }, dt);
  if (ball.vy < -30) return;
  // the top of the toss: the racket comes over and serves
  const h = p.held;
  const kind = h > 0 ? 'serveDrive' : h < 0 ? 'serveLob' : 'serve';
  const shot = planShot(ball.x, ball.y, p.side, kind, 0.93, e.g, 0, p.charge === 'fire', next(s.rng), next(s.rng), e.wind);
  hit(s, p, shot, kind, 0.93, ev);
  s.phase = 'rally'; s.phaseT = 0;
}

// ---------- the rally ----------

function hit(s, p, shot, kind, quality, ev) {
  const ball = s.ball;
  ball.vx = shot.vx; ball.vy = shot.vy;
  ball.lastHitter = p.side; ball.bounces = 0; ball.sinceHit = 0; ball.netTouch = false;
  ball.kind = kind;
  ball.fire = false; ball.zig = false; ball.zigT = 0;
  if (p.charge === 'fire') { ball.fire = true; p.charge = null; }
  else if (p.charge === 'zigzag') { ball.zig = true; p.charge = null; }
  p.swingT = Math.max(p.swingT, 0); p.hitThisSwing = true; p.swingKind = kind;
  s.rally++;
  s.stats.hits++;
  s.stats.longest = Math.max(s.stats.longest, s.rally);
  ev.push({ type: 'hit', who: p.side, kind, quality, x: ball.x, y: ball.y, fire: ball.fire, zig: ball.zig, rally: s.rally });
}

function rackets(s, e, ev) {
  const ball = s.ball;
  for (const p of s.players) {
    if (!swingActive(p)) continue;
    const mine = p.side === 0 ? ball.x < NET_X + 8 : ball.x > NET_X - 8;
    if (!mine) continue;
    if (ball.lastHitter === p.side && ball.sinceHit < 0.3) continue;
    const z = hitZone(p);
    const d = Math.hypot(ball.x - z.x, ball.y - z.y);
    if (d > z.r + BALL_R) continue;

    // the middle of the racket is the sweet spot; the very edge still gets it back, just wildly
    const quality = Math.max(0, Math.min(1, 1.3 - d / z.r));
    let kind = p.held > 0 ? 'drive' : p.held < 0 ? 'lob' : 'normal';
    if (!p.onGround && ball.y < NET_TOP - 24) kind = 'smash';
    if (ball.fire) {
      // returning a fireball: you get it back, but it knocks you off your feet
      p.vx = -p.dir * 460; p.stun = 0.4;
      setMood(p, 'dizzy', 0.9);
      ev.push({ type: 'burn', who: p.side, x: ball.x, y: ball.y });
    }
    const shot = planShot(ball.x, ball.y, p.side, kind, quality, e.g, s.rally, p.charge === 'fire', next(s.rng), next(s.rng), e.wind);
    if (kind === 'smash') s.stats.smashes[p.side]++;
    hit(s, p, shot, kind, quality, ev);
    return;
  }
}

// a ball can bounce off a pal's head or tummy. That counts as their touch —
// it still has to get over the net.
function headers(s, ev) {
  const ball = s.ball;
  for (const p of s.players) {
    if (ball.lastHitter === p.side && ball.sinceHit < 0.3) continue;
    for (const c of bodyCircles(p)) {
      const dx = ball.x - c.x, dy = ball.y - c.y, d = Math.hypot(dx, dy);
      if (d >= c.r + BALL_R || d < 0.001) continue;
      const nx = dx / d, ny = dy / d;
      const rvx = ball.vx - p.vx, rvy = ball.vy - p.vy;
      const vn = rvx * nx + rvy * ny;
      if (vn >= 0) continue;
      const e = 0.8;
      ball.vx -= (1 + e) * vn * nx;
      ball.vy -= (1 + e) * vn * ny;
      // a bonk on the head pops the ball up and toward the net: sometimes
      // that's enough to get it over
      const k = Math.sqrt(s.court.gravity / 1000);
      ball.vx = (p.dir * (Math.abs(ball.vx) * 0.45 + 140) + p.vx * 0.5) * k;
      ball.vy = Math.min(ball.vy * 0.6, -380) * k;
      ball.x = c.x + nx * (c.r + BALL_R + 0.5);
      ball.y = c.y + ny * (c.r + BALL_R + 0.5);
      ball.lastHitter = p.side; ball.bounces = 0; ball.sinceHit = 0; ball.netTouch = false;
      ball.kind = 'header'; ball.fire = false; ball.zig = false;
      s.rally++;
      s.stats.headers[p.side]++;
      setMood(p, 'bonk', 0.7);
      ev.push({ type: 'header', who: p.side, x: ball.x, y: ball.y });
      return;
    }
  }
}

function floorRule(s, touched, ev) {
  const ball = s.ball, x = touched.floor;
  const hitter = ball.lastHitter, side = x < NET_X ? 0 : 1;
  if (ball.bounces === 0) {
    if (side === hitter) return endPoint(s, 1 - hitter, ball.netTouch ? 'net' : 'short', ev, x);
    if (x < COURT_L || x > COURT_R) return endPoint(s, 1 - hitter, 'out', ev, x);
    ball.bounces = 1;
    ev.push({ type: 'bounce', x, inCourt: true });
    return;
  }
  endPoint(s, hitter, winnerReason(s), ev, x);
}

function awayRule(s, ev) {
  const ball = s.ball, hitter = ball.lastHitter;
  if (ball.bounces >= 1) endPoint(s, hitter, winnerReason(s), ev, ball.x);
  else endPoint(s, 1 - hitter, 'out', ev, ball.x);
}

function winnerReason(s) {
  const k = s.ball.kind;
  if (s.rally === 1 && (k === 'serve' || k === 'serveDrive' || k === 'serveLob')) return 'ace';
  if (k === 'smash') return 'smash';
  if (s.ball.fire) return 'fire';
  if (k === 'header') return 'header';
  return 'winner';
}

function endPoint(s, winner, reason, ev, x) {
  const loser = 1 - winner;
  s.phase = 'point'; s.phaseT = 0;
  const res = award(s.score, winner);
  s.stats.points[winner]++;
  if (reason === 'ace') s.stats.aces[winner]++;
  setMood(s.players[winner], 'happy', POINT_PAUSE);
  setMood(s.players[loser], 'sad', POINT_PAUSE);
  s.last = { winner, reason, game: res.game, match: res.match, x, rally: s.rally };
  ev.push({ type: 'point', winner, reason, x, game: res.game, match: res.match, rally: s.rally, call: call(s.score, s.server) });
}

// ---------- power-up bubbles ----------

function tickBubbles(s, dt, ev) {
  for (const b of s.bubbles) { b.age += dt; }
  const before = s.bubbles.length;
  s.bubbles = s.bubbles.filter(b => b.age < b.life);
  if (s.bubbles.length < before) ev.push({ type: 'bubbleGone' });
  if (!s.opts.powerups || s.phase !== 'rally') return;
  s.bubbleT -= dt;
  if (s.bubbleT > 0 || s.bubbles.length >= 2) return;
  s.bubbleT = 5 + next(s.rng) * 5;
  const def = pick(s.rng, POWERUPS);
  const side = int(s.rng, 2) ? 1 : -1;
  const high = s.court.lowGravity ? 120 : 0;
  const b = {
    id: ++s.bubbleId, power: def.id, r: 22, age: 0, life: 11,
    x: NET_X + side * (70 + next(s.rng) * 250),
    y: FLOOR - (165 + high + next(s.rng) * 150)
  };
  s.bubbles.push(b);
  ev.push({ type: 'bubble', id: b.id, power: def.id, x: b.x, y: b.y });
}

function bubbles(s, ev) {
  const ball = s.ball;
  if (ball.lastHitter < 0) return;
  for (const b of s.bubbles) {
    const y = bubbleY(b);
    if (Math.hypot(ball.x - b.x, ball.y - y) > b.r + BALL_R) continue;
    s.bubbles = s.bubbles.filter(o => o !== b);
    const who = ball.lastHitter, def = powerById(b.power);
    const target = s.players[def.on === 'them' ? 1 - who : who];
    if (def.charge) target.charge = def.id;
    else target.fx[def.id] = def.time;
    if (def.id === 'freeze') setMood(target, 'frozen', def.time);
    s.stats.powers[who]++;
    ev.push({ type: 'power', who, target: target.side, power: def.id, x: b.x, y });
    return;
  }
}

// bubbles bob gently; the rules and the drawing both use this
export const bubbleY = b => b.y + Math.sin(b.age * 2.2 + b.id) * 8;

export function isOver(s) { return s.phase === 'over'; }
