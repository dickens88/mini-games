// A pal on the court: running, jumping, swinging, and the power-ups on them.
// Inputs are plain "held" flags; presses are worked out here so the keyboard,
// the touch buttons and the robot all drive a pal the same way.

import { W, FLOOR, NET_X, PAL, SWING } from '../config.js';

export function newPlayer(side, pal) {
  return {
    side, pal, dir: side === 0 ? 1 : -1,
    x: side === 0 ? 150 : W - 150, y: FLOOR, vx: 0, vy: 0, onGround: true,
    swingT: -1, hitThisSwing: false, swingKind: null,
    prevJump: false, prevSwing: false, held: 0,
    fx: { giant: 0, speed: 0, tiny: 0, freeze: 0 },
    charge: null, stun: 0, run: 0, mood: null, moodT: 0, landT: 0
  };
}

export const sizeOf = p => (p.fx.tiny > 0 ? 0.62 : 1);
export const reachOf = p => SWING.reach * (p.fx.giant > 0 ? 1.6 : 1) * (p.fx.tiny > 0 ? 0.78 : 1);

// where the racket can hit the ball right now
export function hitZone(p) {
  const s = sizeOf(p);
  return { x: p.x + p.dir * SWING.ahead * s * (p.fx.giant > 0 ? 1.25 : 1), y: p.y - SWING.up * s, r: reachOf(p) };
}

// the parts of a pal that a ball can bounce off
export function bodyCircles(p) {
  const s = sizeOf(p);
  return [
    { x: p.x, y: p.y - PAL.headY * s, r: PAL.headR * s },
    { x: p.x, y: p.y - PAL.bodyY * s, r: PAL.bodyR * s }
  ];
}

export function bounds(p) {
  return p.side === 0 ? [PAL.minX, NET_X - PAL.netGap] : [NET_X + PAL.netGap, W - PAL.minX];
}

// which way the stick is pushed, from this pal's point of view
export function heldDir(p, input) {
  const h = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  return h === 0 ? 0 : (h === p.dir ? 1 : -1);    // 1 toward the net, -1 away
}

// env: { grip, lowGravity }; lock: [min, max] x while serving, or null
// Returns 'jump' and/or 'swing' when those start, for the sounds.
export function movePlayer(p, input, env, dt, opts) {
  const out = {};
  for (const k in p.fx) if (p.fx[k] > 0) p.fx[k] = Math.max(0, p.fx[k] - dt);
  if (p.stun > 0) p.stun = Math.max(0, p.stun - dt);
  if (p.moodT > 0 && (p.moodT -= dt) <= 0) p.mood = null;
  if (p.landT > 0) p.landT = Math.max(0, p.landT - dt);
  const stuck = p.fx.freeze > 0 || p.stun > 0 || (opts && opts.still);
  const jumpPress = input.jump && !p.prevJump, swingPress = input.swing && !p.prevSwing;
  p.prevJump = !!input.jump; p.prevSwing = !!input.swing;
  p.held = heldDir(p, input);

  const fast = p.fx.speed > 0 ? 1.42 : 1;
  const want = stuck ? 0 : ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * PAL.speed * fast * (p.fx.tiny > 0 ? 1.08 : 1);
  // grip: on ice it takes a while to get going and to stop; in the air you steer a little less
  const acc = PAL.accel * env.grip * (p.onGround ? 1 : 0.7) * (p.stun > 0 ? 0.1 : 1);
  const dv = want - p.vx, step = acc * dt;
  p.vx += Math.abs(dv) <= step ? dv : Math.sign(dv) * step;

  if (jumpPress && p.onGround && !stuck) {
    p.vy = -PAL.jump * (p.fx.speed > 0 ? 1.12 : 1);
    p.onGround = false;
    out.jump = true;
  }
  if (!p.onGround) {
    p.vy += PAL.gravity * (env.lowGravity ? 0.6 : 1) * dt;
    p.y += p.vy * dt;
    if (p.y >= FLOOR) { p.y = FLOOR; p.vy = 0; p.onGround = true; p.landT = 0.15; out.land = true; }
  }

  p.x += p.vx * dt;
  const [lo, hi] = (opts && opts.lock) || bounds(p);
  if (p.x < lo) { p.x = lo; if (p.vx < 0) p.vx = 0; }
  if (p.x > hi) { p.x = hi; if (p.vx > 0) p.vx = 0; }
  if (p.onGround && Math.abs(p.vx) > 20) p.run += Math.abs(p.vx) * dt * 0.045;

  if (p.swingT >= 0) {
    p.swingT += dt;
    if (p.swingT >= SWING.time) p.swingT = -1;
  }
  if (swingPress && !stuck && p.swingT < 0) {
    p.swingT = 0; p.hitThisSwing = false;
    out.swing = true;
  }
  return out;
}

export const swingActive = p => p.swingT >= 0 && p.swingT <= SWING.active && !p.hitThisSwing;

export function setMood(p, mood, time) { p.mood = mood; p.moodT = time; }
