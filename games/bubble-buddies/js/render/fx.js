// Particles, floating numbers, rings, lightning and the big banners.

import { W, H } from '../config.js';
import { star, roundRect } from './buddy.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const easeOutBack = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
const CONFETTI = ['#FF6B8E', '#FFD23C', '#4FD18B', '#4AA8FF', '#A97BFF', '#FF9B3D', '#FFFFFF'];
const MAX = 1200;

export function createFx(lite) {
  const parts = [], texts = [], rings = [], bolts = [], banners = [];
  const k = n => Math.max(1, Math.round(lite ? n * 0.35 : n));

  function add(p) { if (parts.length < MAX) parts.push(p); }

  return {
    // the main pop: droplets, sparkles and a ring
    burst(x, y, col, power = 1) {
      for (let i = 0; i < k(9 * power); i++) {
        const a = rnd(0, TAU), v = rnd(90, 260) * power;
        add({ kind: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 520, life: rnd(0.35, 0.7), age: 0, size: rnd(2.2, 4.6), color: i % 3 ? col.main : col.light });
      }
      for (let i = 0; i < k(4 * power); i++) {
        const a = rnd(0, TAU), v = rnd(50, 150) * power;
        add({ kind: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0, drag: 2.5, life: rnd(0.45, 0.8), age: 0, size: rnd(4, 7.5), rot: rnd(0, TAU), vr: rnd(-6, 6), color: i % 2 ? '#FFFFFF' : col.light });
      }
      rings.push({ x, y, r0: 10, r1: 34 * Math.sqrt(power), life: 0.32, age: 0, width: 4, color: col.light });
    },
    hearts(x, y, n) {
      for (let i = 0; i < k(n); i++) {
        add({ kind: 'heart', x: x + rnd(-14, 14), y: y + rnd(-8, 8), vx: rnd(-40, 40), vy: rnd(-140, -70), g: -20, life: rnd(0.8, 1.3), age: 0, size: rnd(5, 9), rot: rnd(-0.4, 0.4), vr: rnd(-1.5, 1.5), color: Math.random() < 0.5 ? '#FF6B8E' : '#FF9EC0' });
      }
    },
    puff(x, y, n, color = 'rgba(255,255,255,.9)', spread = 20) {
      for (let i = 0; i < k(n); i++) {
        add({ kind: 'puff', x: x + rnd(-spread, spread), y: y + rnd(-4, 4), vx: rnd(-40, 40), vy: rnd(-30, 10), g: 0, drag: 3, life: rnd(0.4, 0.7), age: 0, size: rnd(5, 10), grow: rnd(10, 22), color });
      }
    },
    sparkle(x, y, color = '#FFFFFF', size = 6) {
      add({ kind: 'star', x, y, vx: rnd(-20, 20), vy: rnd(-30, 0), g: 0, drag: 1, life: rnd(0.3, 0.55), age: 0, size, rot: rnd(0, TAU), vr: rnd(-4, 4), color });
    },
    trail(x, y, color) {
      add({ kind: 'dot', x: x + rnd(-5, 5), y: y + rnd(-5, 5), vx: rnd(-15, 15), vy: rnd(-15, 15), g: 0, life: rnd(0.2, 0.38), age: 0, size: rnd(2, 4), color });
    },
    ring(x, y, color, r1 = 60, life = 0.4, width = 6) {
      rings.push({ x, y, r0: 6, r1, life, age: 0, width, color });
    },
    text(x, y, str, color = '#FFFFFF', size = 18, life = 0.95) {
      texts.push({ x, y, str, color, size, life, age: 0 });
    },
    bolt(x1, y1, x2, y2) {
      bolts.push({ x1, y1, x2, y2, life: 0.45, age: 0, seed: Math.random() * 1000 });
    },
    confetti(n, fromX = null) {
      for (let i = 0; i < k(n); i++) {
        const left = fromX == null ? i % 2 === 0 : fromX < W / 2;
        const x = fromX == null ? (left ? -5 : W + 5) : fromX;
        add({ kind: 'confetti', x, y: H * rnd(0.55, 0.8), vx: (left ? 1 : -1) * rnd(120, 420), vy: rnd(-760, -380), g: 620, drag: 0.9, life: rnd(1.8, 3), age: 0, size: rnd(5, 9), rot: rnd(0, TAU), vr: rnd(-10, 10), color: CONFETTI[i % CONFETTI.length], flip: rnd(4, 12) });
      }
    },
    // a homing sparkle: flies from one point to another, then calls done
    fly(x, y, tx, ty, color, done, delay = 0) {
      add({ kind: 'fly', x, y, sx: x, sy: y, tx, ty, life: 0.55, age: -delay, size: 7, rot: 0, vr: 8, color, done });
    },
    banner(str, opts = {}) {
      banners.length = 0;
      banners.push({ str, age: 0, life: opts.life || 1.25, size: opts.size || 46, a: opts.a || '#FFF6A8', b: opts.b || '#FF9B3D', rays: !!opts.rays, y: opts.y || 270, sub: opts.sub || '' });
    },

    update(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age < 0) continue;
        if (p.age >= p.life) {
          if (p.done) p.done();
          parts.splice(i, 1); continue;
        }
        if (p.kind === 'fly') {
          const t = p.age / p.life, e = t * t * (3 - 2 * t);
          const lift = Math.sin(t * Math.PI) * 70;
          p.x = p.sx + (p.tx - p.sx) * e;
          p.y = p.sy + (p.ty - p.sy) * e - lift;
          p.rot += p.vr * dt;
          continue;
        }
        if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; }
        p.vy += (p.g || 0) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vr) p.rot += p.vr * dt;
      }
      for (const list of [texts, rings, bolts, banners]) {
        for (let i = list.length - 1; i >= 0; i--) {
          list[i].age += dt;
          if (list[i].age >= list[i].life) list.splice(i, 1);
        }
      }
    },

    draw(ctx, time) {
      for (const r of rings) {
        const t = r.age / r.life;
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - (1 - t) * (1 - t)), 0, TAU);
        ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (1 - t) + 0.5; ctx.stroke();
      }
      for (const p of parts) {
        if (p.age < 0) continue;
        const t = p.age / p.life;
        ctx.globalAlpha = p.kind === 'puff' ? (1 - t) * 0.7 : t > 0.7 ? (1 - t) / 0.3 : 1;
        switch (p.kind) {
          case 'dot':
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, TAU); ctx.fillStyle = p.color; ctx.fill();
            break;
          case 'puff':
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size + p.grow * t, 0, TAU); ctx.fillStyle = p.color; ctx.fill();
            break;
          case 'star': case 'fly':
            star(ctx, p.x, p.y, p.size * (p.kind === 'fly' ? 1 : 1 - t * 0.6), p.size * 0.38, p.rot, p.color);
            if (p.kind === 'fly') { ctx.globalAlpha = 0.5; star(ctx, p.x, p.y, p.size * 1.8, p.size * 0.3, -p.rot, '#FFFFFF'); }
            break;
          case 'heart':
            heart(ctx, p.x, p.y, p.size, p.rot, p.color);
            break;
          case 'confetti': {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.scale(1, Math.cos(p.age * p.flip));
            ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
            break;
          }
        }
      }
      ctx.globalAlpha = 1;

      for (const b of bolts) drawBolt(ctx, b, time);

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const tx of texts) {
        const t = tx.age / tx.life;
        const pop = t < 0.2 ? easeOutBack(t / 0.2) : 1;
        ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
        ctx.font = `800 ${tx.size * pop}px 'Baloo 2', system-ui, sans-serif`;
        const y = tx.y - t * 34;
        ctx.lineWidth = tx.size * 0.22; ctx.strokeStyle = 'rgba(59,35,64,.85)'; ctx.lineJoin = 'round';
        ctx.strokeText(tx.str, tx.x, y);
        ctx.fillStyle = tx.color; ctx.fillText(tx.str, tx.x, y);
      }
      ctx.globalAlpha = 1;

      for (const b of banners) drawBanner(ctx, b, time);
    }
  };
}

function heart(ctx, x, y, s, rot, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s / 10, s / 10);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-10, -3, -6, -11, 0, -5);
  ctx.bezierCurveTo(6, -11, 10, -3, 0, 4);
  ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}

function drawBolt(ctx, b, time) {
  const t = b.age / b.life;
  const flick = Math.floor(time * 30 + b.seed);
  ctx.save();
  ctx.globalAlpha = (1 - t) * (flick % 3 === 0 ? 0.6 : 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [w, c] of [[9, 'rgba(120,200,255,.55)'], [3.5, '#FFFFFF']]) {
    ctx.beginPath();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = b.x1 + (b.x2 - b.x1) * u;
      const y = b.y1 + (b.y2 - b.y1) * u + (i && i < n ? Math.sin(flick * 1.7 + i * 2.3) * 9 : 0);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
  }
  ctx.restore();
}

function drawBanner(ctx, b, time) {
  const t = b.age, L = b.life;
  const inT = Math.min(1, t / 0.32);
  const s = easeOutBack(inT) * (t > L - 0.25 ? 1 + (t - (L - 0.25)) * 1.2 : 1);
  const alpha = t > L - 0.25 ? Math.max(0, (L - t) / 0.25) : 1;
  const y = b.y - (t > L - 0.25 ? (t - (L - 0.25)) * 80 : 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, y);
  if (b.rays) {
    ctx.save();
    ctx.rotate(time * 0.8);
    ctx.globalAlpha = alpha * 0.28 * Math.min(1, inT * 1.5);
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, -230 * s); ctx.lineTo(22, -230 * s); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  ctx.rotate(Math.sin(time * 3) * 0.03);
  ctx.scale(s, s);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${b.size}px 'Baloo 2', system-ui, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = b.size * 0.3; ctx.strokeStyle = '#3B2340'; ctx.strokeText(b.str, 0, 0);
  ctx.lineWidth = b.size * 0.12; ctx.strokeStyle = '#FFFFFF'; ctx.strokeText(b.str, 0, 0);
  const grad = ctx.createLinearGradient(0, -b.size / 2, 0, b.size / 2);
  grad.addColorStop(0, b.a); grad.addColorStop(1, b.b);
  ctx.fillStyle = grad; ctx.fillText(b.str, 0, 0);
  if (b.sub) {
    ctx.font = `800 ${b.size * 0.4}px 'Baloo 2', system-ui, sans-serif`;
    const w = ctx.measureText(b.sub).width + 24;
    roundRect(ctx, -w / 2, b.size * 0.48, w, b.size * 0.52, b.size * 0.26);
    ctx.fillStyle = '#3B2340'; ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillText(b.sub, 0, b.size * 0.75);
  }
  ctx.restore();
}
