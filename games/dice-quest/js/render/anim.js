// Where each pawn is drawn and how it moves. The rules move players
// instantly; the scene keeps its own positions and walks the pawns there one
// tween at a time, so a bump only shows once the bumper has actually arrived.
//
// Every pawn has: x, y (board units), z (height off the ground), scale,
// sx / sy (squash and stretch), rot (spin), dizzy (seconds of stars left),
// label (a number shown above it, e.g. steps left) and alpha.

import { onCurve } from './kit.js';

const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPEED = REDUCED_MOTION ? 0.45 : 1;
const MOTION = REDUCED_MOTION ? 0 : 1;   // scales lifts, squashes and spins

const OFFSETS = {
  1: [[0, 0]],
  2: [[-1.9, -0.6], [1.9, 0.6]],
  3: [[0, -2], [-2, 1.4], [2, 1.4]],
  4: [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]
};

const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);

// resting place of every pawn, spreading out pawns that share a cell
export function layout(state, map) {
  const groups = new Map();
  state.players.forEach((pl, pi) => {
    if (!groups.has(pl.pos)) groups.set(pl.pos, []);
    groups.get(pl.pos).push(pi);
  });
  const out = new Map();
  for (const [pos, list] of groups) {
    const base = map.cells[pos];
    const offs = OFFSETS[Math.min(list.length, 4)];
    const big = pos === 0 || pos === map.goal;  // the start and goal are roomier
    list.forEach((pi, k) => {
      const o = offs[k % offs.length];
      out.set(pi, { x: base.x + o[0] * (big ? 1.3 : 1), y: base.y + o[1] * (big ? 1.3 : 1), scale: list.length > 1 && !big ? 0.82 : 1 });
    });
  }
  return out;
}

export function createScene() {
  const vis = new Map();
  const tweens = [];

  function fresh(t) {
    return { x: t.x, y: t.y, z: 0, scale: t.scale, sx: 1, sy: 1, rot: 0, dizzy: 0, label: null, alpha: 1 };
  }

  function snap(state, map) {
    vis.clear();
    for (const [pi, t] of layout(state, map)) vis.set(pi, fresh(t));
  }

  // every frame: squash, spin and dizziness wear off; idle pawns drift to their resting places.
  // `hold` keeps pawns where they are while a turn is still playing out (e.g. during the dice
  // roll) — the rules have already moved them, and drifting now would spoil the walk.
  function relax(state, map, dt, hold) {
    const k = 1 - Math.pow(0.0001, dt);
    const spring = 1 - Math.pow(0.002, dt);
    for (const v of vis.values()) {
      v.sx += (1 - v.sx) * spring;
      v.sy += (1 - v.sy) * spring;
      if (v.dizzy > 0) v.dizzy = Math.max(0, v.dizzy - dt);
    }
    if (hold || tweens.length) return;
    for (const [pi, t] of layout(state, map)) {
      const v = vis.get(pi);
      if (!v) continue;
      v.x += (t.x - v.x) * k;
      v.y += (t.y - v.y) * k;
      v.scale += (t.scale - v.scale) * k;
      v.z += (0 - v.z) * k;
      v.rot += (0 - v.rot) * k;
    }
  }

  function tween(dur, fn) {
    return new Promise(done => tweens.push({ t: 0, dur: Math.max(0.001, dur * SPEED), fn, done }));
  }

  function update(dt) {
    if (!tweens.length) return;
    const tw = tweens[0];
    tw.t += dt;
    const t = Math.min(1, tw.t / tw.dur);
    tw.fn(t);
    if (t >= 1) { tweens.shift(); tw.done(); }
  }

  const wait = sec => tween(sec, () => {});

  // a hop to (x, y): crouch, stretch on the way up, squash on landing
  function hop(pi, to, dur, height, onLand, spin = 0) {
    const v = vis.get(pi);
    if (!v) return Promise.resolve();
    const x0 = v.x, y0 = v.y, s0 = v.scale;
    const crouch = 0.18;
    return tween(dur, t => {
      if (t < crouch) {
        const c = Math.sin(t / crouch * Math.PI / 2) * 0.16 * MOTION;
        v.sx = 1 + c; v.sy = 1 - c;
        return;
      }
      const u = (t - crouch) / (1 - crouch), e = ease(u);
      v.x = x0 + (to.x - x0) * e;
      v.y = y0 + (to.y - y0) * e;
      v.z = Math.sin(Math.PI * u) * height * MOTION;
      v.scale = s0 + (1 - s0) * e;
      const air = Math.sin(Math.PI * u) * 0.14 * MOTION;
      v.sx = 1 - air; v.sy = 1 + air;
      if (spin) v.rot = spin * Math.PI * 2 * e * MOTION;
      if (t >= 1) {
        v.z = 0;
        if (spin) v.rot = 0;
        v.sx = 1 + 0.24 * MOTION; v.sy = 1 - 0.24 * MOTION;
        if (onLand) onLand(v);
      }
    });
  }

  // ride a ladder or slide along its curve; spin turns the pawn while it goes
  function ride(pi, curve, dur, height, { spin = 0, onFrame } = {}) {
    const v = vis.get(pi);
    if (!v) return Promise.resolve();
    const x0 = v.x, y0 = v.y;
    return tween(dur, t => {
      const e = ease(t);
      const p = onCurve(curve, e);
      const blend = Math.min(1, t * 5);   // start where the pawn stands, join the curve quickly
      v.x = x0 + (p.x - x0) * blend;
      v.y = y0 + (p.y - y0) * blend;
      v.z = Math.sin(Math.PI * t) * height * MOTION;
      v.scale = 1 + Math.sin(Math.PI * t) * 0.15 * MOTION;
      v.rot = spin * Math.PI * 2 * e * MOTION;
      if (onFrame) onFrame(v, t);
      if (t >= 1) { v.z = 0; v.rot = 0; v.sx = 1 + 0.2 * MOTION; v.sy = 1 - 0.2 * MOTION; }
    });
  }

  // two pawns at once (swaps)
  function hopPair(a, toA, b, toB, dur, height) {
    const va = vis.get(a), vb = vis.get(b);
    if (!va || !vb) return Promise.resolve();
    const a0 = { x: va.x, y: va.y }, b0 = { x: vb.x, y: vb.y };
    return tween(dur, t => {
      const e = ease(t), z = Math.sin(Math.PI * t) * height * MOTION;
      va.x = a0.x + (toA.x - a0.x) * e; va.y = a0.y + (toA.y - a0.y) * e; va.z = z;
      vb.x = b0.x + (toB.x - b0.x) * e; vb.y = b0.y + (toB.y - b0.y) * e; vb.z = z;
      va.rot = vb.rot = Math.sin(Math.PI * t) * 0.6 * MOTION;
      if (t >= 1) { va.z = vb.z = 0; va.rot = vb.rot = 0; va.sy = vb.sy = 1 - 0.2 * MOTION; va.sx = vb.sx = 1 + 0.2 * MOTION; }
    });
  }

  // spin down to nothing and pop back elsewhere (portals)
  async function warp(pi, to, onMid) {
    const v = vis.get(pi);
    if (!v) return;
    await tween(0.4, t => { v.scale = 1 - easeOut(t); v.rot = t * Math.PI * 3 * MOTION; });
    v.x = to.x; v.y = to.y;
    if (onMid) onMid();
    await tween(0.45, t => {
      // overshoot a little, then settle
      v.scale = t < 0.7 ? easeOut(t / 0.7) * 1.2 : 1.2 - (t - 0.7) / 0.3 * 0.2;
      v.rot = (1 - t) * Math.PI * 3 * MOTION;
    });
    v.rot = 0;
  }

  // a quick side-to-side wobble (scared, stuck)
  function shake(pi, dur, amount = 0.8) {
    const v = vis.get(pi);
    if (!v) return Promise.resolve();
    const x0 = v.x;
    return tween(dur, t => {
      v.x = x0 + Math.sin(t * 40) * amount * (1 - t) * MOTION;
      v.rot = Math.sin(t * 40) * 0.15 * (1 - t) * MOTION;
      if (t >= 1) { v.x = x0; v.rot = 0; }
    });
  }

  // several pawns wobble together (earthquake)
  function shakeAll(pis, dur, amount = 1) {
    const list = pis.map(pi => ({ v: vis.get(pi), x0: vis.get(pi) && vis.get(pi).x })).filter(o => o.v);
    return tween(dur, t => {
      for (const { v, x0 } of list) {
        v.x = x0 + Math.sin(t * 46 + x0) * amount * (1 - t) * MOTION;
        v.rot = Math.sin(t * 46) * 0.2 * (1 - t) * MOTION;
        if (t >= 1) { v.x = x0; v.rot = 0; }
      }
    });
  }

  // sink into quicksand / seaweed / a tractor beam and pop back up
  function sink(pi, dur) {
    const v = vis.get(pi);
    if (!v) return Promise.resolve();
    return tween(dur, t => {
      const d = Math.sin(Math.PI * t);
      v.sy = 1 - 0.35 * d * MOTION;
      v.sx = 1 + 0.15 * d * MOTION;
      v.rot = Math.sin(t * 30) * 0.08 * MOTION;
    });
  }

  // happy bounces on the spot (finishing)
  function cheer(pi, times, onBounce) {
    const v = vis.get(pi);
    if (!v) return Promise.resolve();
    return tween(0.42 * times, t => {
      const phase = (t * times) % 1;
      v.z = Math.sin(Math.PI * phase) * 2.2 * MOTION;
      v.rot = Math.sin(t * Math.PI * 2 * times) * 0.25 * MOTION;
      const s = Math.sin(Math.PI * phase) * 0.12 * MOTION;
      v.sx = 1 - s; v.sy = 1 + s;
      if (onBounce && phase < 0.05) onBounce(v);
      if (t >= 1) { v.z = 0; v.rot = 0; }
    });
  }

  function dizzy(pi, sec) {
    const v = vis.get(pi);
    if (v && MOTION) v.dizzy = sec;
  }

  function label(pi, text) {
    const v = vis.get(pi);
    if (v) v.label = text;
  }

  return {
    vis, snap, relax, update, tween, wait,
    hop, ride, hopPair, warp, shake, shakeAll, sink, cheer, dizzy, label,
    busy: () => tweens.length > 0
  };
}
