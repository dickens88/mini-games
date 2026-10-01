// Draws one frame: the cached map, its moving decorations, bananas, the
// players' pawns, the big rolling die, the turn banner, effects and pop-up words.

import { SEATS } from '../config.js';
import { THEMES } from './themes/index.js';
import { drawMapArt } from './board-art.js';
import { avatarImage } from './avatars.js';
import { emoji, text, roundRect } from './kit.js';

const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAWN_R = 3.5;
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };

const backOut = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const cache = document.createElement('canvas');
  const cctx = cache.getContext('2d');
  let u = 6, cacheKey = '';
  const particles = [];
  const pops = [];
  const dice = [];     // big dice tumbling across the board
  let banner = null;   // "Ann's turn!"
  let shake = 0;
  let clock = 0;

  function resize() {
    const css = canvas.clientWidth || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const px = Math.round(css * dpr);
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; cacheKey = ''; }
    u = px / 100;
  }

  function ensureBoard(map) {
    const key = canvas.width + '|' + map.def.id;
    if (key === cacheKey) return;
    cache.width = canvas.width; cache.height = canvas.height;
    cctx.clearRect(0, 0, cache.width, cache.height);
    drawMapArt(cctx, canvas.width, map);
    cacheKey = key;
  }

  /* ---------- effects (positions in board units) ---------- */
  function burst(x, y, colours, n, speed = 25, kind = 'dot') {
    if (REDUCED_MOTION) n = Math.ceil(n / 3);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kind === 'confetti' ? 20 : 0),
        life: 0, max: 0.6 + Math.random() * 0.6, size: 0.5 + Math.random() * 0.6,
        col: colours[k % colours.length], kind, spin: Math.random() * 6 });
    }
  }
  function puff(x, y, col = 'rgba(255,255,255,0.9)', n = 12) {
    for (let k = 0; k < (REDUCED_MOTION ? 4 : n); k++) {
      const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 10;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.7 + Math.random() * 0.4,
        size: 1.4 + Math.random() * 1.2, col, kind: 'puff' });
    }
  }
  // what flies up under a landing pawn, in the map's style
  function land(x, y, fx, power = 1) {
    if (REDUCED_MOTION) return;
    const n = Math.round(7 * power);
    for (let k = 0; k < n; k++) {
      const side = k % 2 ? 1 : -1;
      const a = Math.PI + (side > 0 ? -0.35 : 0.35) - Math.random() * 0.5 * side;
      const v = (6 + Math.random() * 9) * power;
      const col = fx.land[k % fx.land.length];
      if (fx.kind === 'puff') {
        particles.push({ x: x + side * 1.5, y: y + 2.4, vx: -Math.cos(a) * v * side * 0.9, vy: -2 - Math.random() * 3, life: 0, max: 0.45 + Math.random() * 0.3, size: 0.8 + Math.random() * 0.8, col, kind: 'puff' });
      } else if (fx.kind === 'drop') {
        particles.push({ x: x + side * 1.2, y: y + 2.2, vx: side * (3 + Math.random() * 7) * power, vy: -(10 + Math.random() * 10) * power, life: 0, max: 0.55, size: 0.35 + Math.random() * 0.35, col, kind: 'dot' });
      } else {
        particles.push({ x, y: y + 2, vx: Math.cos(k / n * Math.PI * 2) * v, vy: Math.sin(k / n * Math.PI * 2) * v * 0.5, life: 0, max: 0.5, size: 0.5 + Math.random() * 0.4, col, kind: 'spark' });
      }
    }
  }
  function trail(x, y, col) {
    particles.push({ x: x + (Math.random() - 0.5) * 1.5, y: y + (Math.random() - 0.5) * 1.5, vx: 0, vy: 0, life: 0, max: 0.5, size: 0.9, col, kind: 'trail' });
  }
  // particles that spiral into (or out of) a point — portals
  function swirl(x, y, colours, inward) {
    if (REDUCED_MOTION) return;
    for (let k = 0; k < 22; k++) {
      particles.push({ x, y, cx: x, cy: y, ang: k / 22 * Math.PI * 2, r0: inward ? 8 : 0.5, r1: inward ? 0.3 : 9,
        life: 0, max: 0.55 + Math.random() * 0.2, size: 0.5 + Math.random() * 0.4, col: colours[k % colours.length], kind: 'swirl' });
    }
  }
  function confetti() {
    const cols = SEATS.map(s => s.main).concat(['#fff', '#FFE27A']);
    for (let k = 0; k < (REDUCED_MOTION ? 30 : 140); k++) {
      particles.push({ x: Math.random() * 100, y: -3 - Math.random() * 25, vx: (Math.random() - 0.5) * 12,
        vy: 14 + Math.random() * 18, life: 0, max: 3.5 + Math.random() * 1.5, size: 0.8 + Math.random() * 0.6,
        col: cols[k % cols.length], kind: 'confetti', spin: Math.random() * 6, fall: true });
    }
  }
  // fireworks over a spot
  function fireworks(x, y, colours, bursts = 4) {
    for (let b = 0; b < bursts; b++) {
      setTimeout(() => {
        const bx = x + (Math.random() - 0.5) * 30, by = Math.max(10, y - 8 - Math.random() * 20);
        burst(bx, by, colours, 28, 22, 'spark');
      }, b * 260);
    }
  }
  function pop(x, y, str, col) {
    pops.push({ x, y, text: str, col: col || '#1F2A44', life: 0, max: 1.6, tilt: (Math.random() - 0.5) * 0.12 });
  }
  function bump(power) {
    if (!REDUCED_MOTION) shake = Math.max(shake, power);
  }

  // throw the big die (or two) across the board; resolves as they settle
  function throwDice(values, col) {
    return new Promise(resolve => {
      const settle = REDUCED_MOTION ? 0.2 : 0.85;
      values.forEach((v, k) => {
        const tx = 50 + (values.length > 1 ? (k ? 8 : -8) : 0);
        dice.push({ value: v, from: { x: tx - 30 + k * 6, y: 112 }, to: { x: tx, y: 48 }, t: 0, settle, hold: 0.55, col,
          spin: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 2), face: 1 + Math.floor(Math.random() * 6), flick: 0,
          done: k === values.length - 1 ? resolve : null });
      });
    });
  }

  // "Ann's turn!" slides across the top of the board
  function showBanner(str, col, avatar) {
    banner = { text: str, col, avatar, t: 0, dur: REDUCED_MOTION ? 0.9 : 1.25 };
  }

  function step(dt) {
    clock += dt;
    for (let k = particles.length - 1; k >= 0; k--) {
      const p = particles[k];
      p.life += dt;
      if (p.life >= p.max) { particles.splice(k, 1); continue; }
      if (p.kind === 'swirl') {
        const t = p.life / p.max, r = p.r0 + (p.r1 - p.r0) * t;
        p.ang += dt * 9;
        p.x = p.cx + Math.cos(p.ang) * r;
        p.y = p.cy + Math.sin(p.ang) * r;
        continue;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'dot' || p.kind === 'confetti') p.vy += (p.fall ? 8 : 60) * dt;
      if (p.kind === 'puff' || p.kind === 'spark') { p.vx *= 0.9; p.vy *= 0.9; }
      if (p.spin) p.spin += dt * 8;
    }
    for (let k = pops.length - 1; k >= 0; k--) {
      pops[k].life += dt;
      if (pops[k].life >= pops[k].max) pops.splice(k, 1);
    }
    for (let k = dice.length - 1; k >= 0; k--) {
      const d = dice[k];
      d.t += dt;
      d.flick += dt;
      if (d.t < d.settle && d.flick > 0.07) { d.flick = 0; d.face = 1 + Math.floor(Math.random() * 6); }
      if (d.t >= d.settle && d.done) { d.face = d.value; d.done(); d.done = null; }
      if (d.t >= d.settle) d.face = d.value;
      if (d.t > d.settle + d.hold + 0.35) dice.splice(k, 1);
    }
    if (banner) {
      banner.t += dt;
      if (banner.t > banner.dur) banner = null;
    }
    shake = Math.max(0, shake - dt * 2.5);
  }

  /* ---------- drawing ---------- */
  function drawDie(d) {
    const S = n => n * u;
    const t = Math.min(1, d.t / d.settle);
    // fly in with two bounces
    let x, y;
    if (t < 1) {
      const e = 1 - Math.pow(1 - t, 2);
      x = d.from.x + (d.to.x - d.from.x) * e;
      const bounce = Math.abs(Math.sin(t * Math.PI * 2.5)) * (1 - t) * 14;
      y = d.from.y + (d.to.y - d.from.y) * Math.min(1, t * 1.6) - bounce;
    } else {
      x = d.to.x; y = d.to.y;
    }
    const after = Math.max(0, d.t - d.settle);
    const out = Math.max(0, after - d.hold) / 0.35;      // fading away
    const landPop = after < 0.25 ? 1 + Math.sin(after / 0.25 * Math.PI) * 0.18 : 1;
    const size = 11 * landPop * (1 - out * 0.5);
    const rot = t < 1 ? d.spin * (1 - t) * (1 - t) * Math.PI : 0;
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(S(x), S(y));
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(S(0.6), S(size * 0.62), S(size * 0.5), S(size * 0.14), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(rot);
    roundRect(ctx, S(-size / 2), S(-size / 2), S(size), S(size), S(size * 0.22));
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = S(0.7);
    ctx.strokeStyle = d.col.main;
    ctx.stroke();
    ctx.fillStyle = d.face === 6 && t >= 1 ? d.col.main : d.col.dark;
    for (const [px, py] of PIPS[d.face]) {
      ctx.beginPath();
      ctx.arc(S(px * size * 0.27), S(py * size * 0.27), S(size * 0.095), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBanner() {
    const S = n => n * u;
    const b = banner, t = b.t / b.dur;
    // slide in, pause, slide out
    let x;
    if (REDUCED_MOTION) x = 50;
    else if (t < 0.25) x = -40 + backOut(t / 0.25) * 90;
    else if (t < 0.75) x = 50;
    else x = 50 + Math.pow((t - 0.75) / 0.25, 2) * 95;
    ctx.font = `800 ${S(5)}px "Baloo 2", system-ui, sans-serif`;
    const w = Math.max(40, ctx.measureText(b.text).width / u + 17), h = 10, y = 12;
    ctx.save();
    ctx.globalAlpha = REDUCED_MOTION ? Math.min(1, (1 - t) * 4) : 1;
    ctx.translate(S(x), S(y));
    ctx.rotate(-0.03);
    roundRect(ctx, S(-w / 2), S(-h / 2), S(w), S(h), S(h / 2));
    ctx.fillStyle = b.col.main;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = S(2);
    ctx.shadowOffsetY = S(0.6);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = S(0.7);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    const img = avatarImage(b.avatar);
    const ax = -w / 2 + 1.5, ar = 5.6;
    ctx.save();
    ctx.beginPath();
    ctx.arc(S(ax + ar - 1.2), 0, S(ar), 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = S(0.7);
    ctx.strokeStyle = b.col.dark;
    ctx.stroke();
    ctx.clip();
    if (img) ctx.drawImage(img, S(ax - 1.2), S(-ar), S(ar * 2), S(ar * 2));
    ctx.restore();
    text(ctx, b.text, S(4.75), S(0.3), S(5), '#fff', b.col.dark);
    ctx.restore();
  }

  function drawPawn(pl, v, active, time, idle) {
    const c = SEATS[pl.seat];
    const r = PAWN_R * (v.scale ?? 1);
    if (r < 0.15) return;
    const bob = active && idle && !REDUCED_MOTION ? Math.abs(Math.sin(time * 4)) * 1 : 0;
    // the finisher keeps doing little happy hops
    const joy = pl.rank === 1 && idle && !REDUCED_MOTION ? Math.abs(Math.sin(time * 3.2)) * 1.2 : 0;
    const lift = v.z * 3 + bob + joy;
    const gx = v.x * u, gy = (v.y + r * 0.8) * u;   // the ground under the pawn
    ctx.save();
    ctx.globalAlpha = v.alpha ?? 1;

    // shadow shrinks as the pawn rises
    const sh = Math.max(0.35, 1 - lift * 0.06);
    ctx.beginPath();
    ctx.ellipse(gx, gy, r * u * 0.85 * sh, r * u * 0.3 * sh, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();

    // body: squash and stretch around the feet, spin around the middle
    ctx.translate(gx, gy - lift * u);
    ctx.scale(v.sx ?? 1, v.sy ?? 1);
    ctx.translate(0, -r * 0.8 * u);
    ctx.rotate(v.rot || 0);

    if (active) {
      const pulse = REDUCED_MOTION ? 0 : Math.sin(time * 5) * 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, (r + 1.1 + pulse) * u, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * u, 0, Math.PI * 2);
    ctx.fillStyle = c.soft;
    ctx.fill();
    const img = avatarImage(pl.avatar);
    if (img) {
      ctx.save();
      ctx.clip();
      ctx.drawImage(img, -r * u, -r * u, r * 2 * u, r * 2 * u);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * u, 0, Math.PI * 2);
    ctx.lineWidth = r * 0.22 * u;
    ctx.strokeStyle = c.main;
    ctx.stroke();
    ctx.lineWidth = r * 0.07 * u;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.11 * u, 0, Math.PI * 2);
    ctx.stroke();

    if (pl.shield) {
      ctx.beginPath();
      ctx.arc(0, 0, (r + 1) * u, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120, 210, 255, 0.18)';
      ctx.fill();
      ctx.lineWidth = 0.45 * u;
      ctx.strokeStyle = `rgba(80, 170, 255, ${0.65 + 0.3 * Math.sin(time * 4)})`;
      ctx.stroke();
    }
    if (pl.skip > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r * u, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(170, 220, 255, 0.35)';
      ctx.fill();
    }
    ctx.restore();

    const top = gy - lift * u - r * 1.8 * u * (v.sy ?? 1);
    if (pl.skip > 0) emoji(ctx, '💤', gx + r * 0.9 * u, top + r * 0.3 * u + Math.sin(time * 3) * 0.4 * u, r * 0.9 * u);

    // dizzy stars circling the head
    if (v.dizzy > 0) {
      ctx.globalAlpha = Math.min(1, v.dizzy * 2);
      for (let k = 0; k < 3; k++) {
        const a = time * 6 + k * Math.PI * 2 / 3;
        emoji(ctx, '⭐', gx + Math.cos(a) * r * 0.9 * u, top + Math.sin(a) * r * 0.3 * u, r * 0.55 * u);
      }
      ctx.globalAlpha = 1;
    }

    // steps left, in a little bubble
    if (v.label != null) {
      const bx = gx, by = top - 1.6 * u;
      ctx.beginPath();
      ctx.arc(bx, by, 2.2 * u, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 0.45 * u;
      ctx.strokeStyle = c.main;
      ctx.stroke();
      text(ctx, String(v.label), bx, by + 0.15 * u, 3 * u, c.dark);
    }
  }

  // view: { state, map, vis, time, dt, busy }
  function frame(view) {
    const { state, map, vis, time } = view;
    resize();
    ensureBoard(map);
    step(view.dt);
    const theme = THEMES[map.def.id];
    const S = n => n * u;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * u * 3, (Math.random() - 0.5) * shake * u * 3);
    ctx.drawImage(cache, 0, 0);
    if (theme.ambient && !REDUCED_MOTION) theme.ambient(ctx, S, time);

    // bananas wobble a little so they catch the eye
    for (const pos of state.bananas) {
      const p = map.cells[pos];
      ctx.save();
      ctx.translate(S(p.x + 1.6), S(p.y + 1.6));
      ctx.rotate(REDUCED_MOTION ? 0 : Math.sin(time * 3 + pos) * 0.2);
      emoji(ctx, '🍌', 0, 0, S(3.4));
      ctx.restore();
    }

    // pawns: lower ones first, the active player on top
    const order = state.players.map((pl, pi) => pi).sort((a, b) => {
      const va = vis.get(a), vb = vis.get(b);
      if (!va || !vb) return 0;
      if (a === state.turn) return 1;
      if (b === state.turn) return -1;
      return va.y - vb.y;
    });
    for (const pi of order) {
      const v = vis.get(pi);
      if (v) drawPawn(state.players[pi], v, pi === state.turn && state.phase !== 'over', time, !view.busy);
    }

    for (const p of particles) {
      const t = p.life / p.max;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.col;
      if (p.kind === 'confetti') {
        ctx.save();
        ctx.translate(S(p.x), S(p.y));
        ctx.rotate(p.spin);
        ctx.fillRect(-S(p.size), -S(p.size * 0.5), S(p.size * 2), S(p.size));
        ctx.restore();
      } else if (p.kind === 'spark') {
        const s = S(p.size * (1 - t * 0.5));
        ctx.fillRect(S(p.x) - s * 0.25, S(p.y) - s * 1.5, s * 0.5, s * 3);
        ctx.fillRect(S(p.x) - s * 1.5, S(p.y) - s * 0.25, s * 3, s * 0.5);
      } else {
        ctx.beginPath();
        ctx.arc(S(p.x), S(p.y), S(p.size * (p.kind === 'puff' ? 1 + t : p.kind === 'trail' ? 1 - t * 0.5 : 1)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (const d of dice) drawDie(d);

    for (const p of pops) {
      const t = p.life / p.max;
      const rise = Math.min(1, t * 2.5);
      const y = p.y - 5 - rise * 4 - Math.max(0, t - 0.6) * 6;
      ctx.globalAlpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
      const grow = t < 0.22 ? backOut(t / 0.22) : 1;
      const x = Math.min(84, Math.max(16, p.x));
      ctx.save();
      ctx.translate(S(x), S(y));
      ctx.rotate(p.tilt * (REDUCED_MOTION ? 0 : 1));
      ctx.scale(grow, grow);
      text(ctx, p.text, 0, 0, S(3.8), p.col, '#fff');
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (banner) drawBanner();
  }

  // where a board position is on screen (for things that fly to the page)
  function toScreen(x, y) {
    const r = canvas.getBoundingClientRect();
    return { x: r.left + x / 100 * r.width, y: r.top + y / 100 * r.height };
  }

  return { frame, resize, burst, puff, land, trail, swirl, confetti, fireworks, pop, bump, throwDice, showBanner, toScreen };
}
