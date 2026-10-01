// The ball in flight: gravity, wind, the wiggle power-up, bounces off the
// floor and the net. No rules here — those are in match.js. predict() runs the
// same steps ahead of time for the robot and for the landing marker.

import { BALL_R, FLOOR, NET_X, NET_TOP, DT } from '../config.js';

const NET_HW = 3;                // half the net's thickness
const WIGGLE = 24, WIGGLE_RATE = 12;   // the wiggle power-up: up and down by this much, this fast

export function newBall() {
  return { x: 0, y: 0, vx: 0, vy: 0, spin: 0, held: true, tossed: false,
    lastHitter: -1, bounces: 0, sinceHit: 0, kind: null, fire: false, zig: false, zigT: 0, netTouch: false };
}

// env: { g, wind, bounce, skid } — what the court does to the ball
// Returns null, or what the ball touched this step: { floor: x } or { net: true }.
export function moveBall(b, env, dt = DT) {
  b.vx += (env.wind || 0) * dt;
  b.vy += env.g * dt;
  const px = b.x, py = b.y;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.zig) {
    // a wiggle on top of the normal flight, so it still lands about where it was aimed
    const was = Math.sin(b.zigT * WIGGLE_RATE);
    b.zigT += dt;
    b.y += (Math.sin(b.zigT * WIGGLE_RATE) - was) * WIGGLE * Math.min(1, b.zigT * 3);
  }
  b.spin += b.vx * dt * 0.05;
  let touched = null;

  // the net: a post from NET_TOP down to the floor
  const crossed = (px - NET_X) * (b.x - NET_X) < 0;
  const f = crossed ? (NET_X - px) / (b.x - px) : 0;
  const yAtNet = py + (b.y - py) * f;
  const cy = Math.max(NET_TOP, Math.min(FLOOR, b.y));
  let dx = b.x - NET_X, dy = b.y - cy;
  if (crossed && yAtNet + BALL_R > NET_TOP) {
    // passed straight through in one step: put it back on the side it came from
    b.x = NET_X + Math.sign(px - NET_X) * (BALL_R + NET_HW);
    b.y = Math.max(yAtNet, NET_TOP + 1);
    dx = b.x - NET_X; dy = 0;
  }
  const d = Math.hypot(dx, dy);
  if (d < BALL_R + NET_HW) {
    const nx = d > 0.001 ? dx / d : Math.sign(px - NET_X) || 1, ny = d > 0.001 ? dy / d : 0;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      // the top tape is springy, the mesh soaks the ball up
      const e = ny < -0.5 ? 0.45 : 0.18;
      b.vx -= (1 + e) * vn * nx;
      b.vy -= (1 + e) * vn * ny;
      if (ny < -0.5) {
        // a ball can't balance on the tape: it always tumbles off one side
        b.vx *= 0.7;
        if (Math.abs(b.vx) < 70) b.vx = (b.vx < 0 || (b.vx === 0 && px < NET_X) ? -1 : 1) * 70;
      }
      b.x = NET_X + nx * (BALL_R + NET_HW + 0.5);
      b.y = cy + ny * (BALL_R + NET_HW + 0.5);
      b.netTouch = true;
      touched = { net: true };
    }
  }

  if (b.y + BALL_R >= FLOOR && b.vy > 0) {
    b.y = FLOOR - BALL_R;
    b.vy = -b.vy * env.bounce;
    if (b.vy > -70) b.vy = 0;
    b.vx *= env.skid;
    touched = { floor: b.x, speed: Math.hypot(b.vx, b.vy) };
  }
  return touched;
}

// run the ball forward without touching it. Returns the path and the first
// two floor touches.
export function predict(ball, env, maxT = 2.5, every = 4) {
  const b = Object.assign({}, ball);
  const path = [], floors = [];
  let t = 0, i = 0;
  while (t < maxT && floors.length < 2) {
    const hit = moveBall(b, env, DT);
    t += DT; i++;
    if (hit && hit.floor !== undefined) floors.push({ x: b.x, t, i: path.length });
    if (i % every === 0 || (hit && hit.floor !== undefined)) path.push({ x: b.x, y: b.y, vy: b.vy, t, bounces: floors.length });
    if (b.x < -60 || b.x > 1020) break;
  }
  return { path, floors };
}
