// Short-lived eye candy on top of the board: sparks, confetti, smoke, shock
// rings, floating words, and the things that fly in for events (meteors,
// lightning, snowballs, lava). Everything is in board units.

import { drawIcon, rockShape } from './icons.js';

export function createFx() {
  return { parts: [], rings: [], words: [], flyers: [], shake: 0 };
}

export function burst(fx, x, y, cols, n = 14, speed = 220, size = 5, opts = {}) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.35 + Math.random() * 0.75);
    fx.parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (opts.up || 0),
      g: opts.g === undefined ? 380 : opts.g, life: 0, max: (opts.life || 0.7) * (0.6 + Math.random() * 0.6),
      r: size * (0.6 + Math.random() * 0.8), col: cols[k % cols.length],
      kind: opts.kind || 'dot', spin: (Math.random() - 0.5) * 12, a: Math.random() * 6
    });
  }
}

export function confetti(fx, W) {
  const cols = ['#FF5E8A', '#3D8BFF', '#FFC21A', '#3DDC97', '#B45CFF', '#FF8A3D'];
  for (let k = 0; k < 120; k++) {
    fx.parts.push({
      x: Math.random() * W, y: -20 - Math.random() * W * 0.4, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 120,
      g: 60, life: 0, max: 3 + Math.random() * 1.5, r: 5 + Math.random() * 4, col: cols[k % cols.length],
      kind: 'paper', spin: (Math.random() - 0.5) * 10, a: Math.random() * 6
    });
  }
}

export function ring(fx, x, y, col, max, life = 0.5, width = 6) {
  fx.rings.push({ x, y, col, max, life: 0, dur: life, width });
}

export function word(fx, x, y, text, col, size = 30) {
  fx.words.push({ x, y, text, col, size, life: 0 });
}

// something that travels from one point to another and then calls done()
export function fly(fx, o) {
  fx.flyers.push({ life: 0, ...o });
}

export function updateFx(fx, dt) {
  for (const p of fx.parts) {
    p.life += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 1 - dt * (p.kind === 'smoke' ? 2.5 : 0.6);
    p.a += p.spin * dt;
  }
  fx.parts = fx.parts.filter(p => p.life < p.max);
  for (const r of fx.rings) r.life += dt;
  fx.rings = fx.rings.filter(r => r.life < r.dur);
  for (const w of fx.words) w.life += dt;
  fx.words = fx.words.filter(w => w.life < 1.3);
  for (const f of fx.flyers) {
    f.life += dt;
    if (f.life >= f.dur && !f.landed) { f.landed = true; if (f.done) f.done(); }
  }
  fx.flyers = fx.flyers.filter(f => f.life < f.dur + (f.linger || 0));
  fx.shake = Math.max(0, fx.shake - dt * 1.8);
}

function drawFlyer(ctx, f, t) {
  const k = Math.min(1, f.life / f.dur);
  if (f.kind === 'meteor') {
    if (k >= 1) return;
    const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k * k;
    const ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang - Math.PI * 0.75);
    drawIcon(ctx, 'meteor', 0, 0, f.size);
    ctx.restore();
  } else if (f.kind === 'bolt') {
    if (k >= 1 && f.life > f.dur + 0.25) return;
    ctx.save();
    ctx.globalAlpha = k < 1 ? 0.4 + k * 0.6 : Math.max(0, 1 - (f.life - f.dur) / 0.25);
    for (const [w, c] of [[14, 'rgba(255,230,120,.45)'], [5, '#FFF6C2']]) {
      ctx.beginPath();
      for (const [px, py] of f.points) ctx.lineTo(px, py);
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.restore();
  } else if (f.kind === 'blob') {
    if (k >= 1) return;
    const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * f.arc;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, f.size, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x - f.size * 0.3, y - f.size * 0.3, 1, x, y, f.size);
    g.addColorStop(0, '#FFE08A'); g.addColorStop(0.5, '#FF8A3D'); g.addColorStop(1, '#D9381E');
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
  } else if (f.kind === 'snowball') {
    const seg = f.points.length - 1, pos = Math.min(seg, k * seg), j = Math.floor(pos), u = pos - j;
    const a = f.points[j], b = f.points[Math.min(seg, j + 1)];
    if (k >= 1 && f.life > f.dur + 0.2) return;
    const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
    ctx.save();
    ctx.globalAlpha = k < 1 ? 1 : Math.max(0, 1 - (f.life - f.dur) / 0.2);
    ctx.translate(x, y); ctx.rotate(t * 10 * (f.spin || 1));
    drawIcon(ctx, 'snowball', 0, 0, f.size);
    ctx.restore();
  } else if (f.kind === 'drop') {
    // rocks, gifts and icons falling into place
    if (k >= 1) return;
    const y = f.y1 - (1 - k * k) * f.height;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 3);
    if (f.icon === 'rockShape') { ctx.translate(f.x1, y); rockShape(ctx, f.size); }
    else drawIcon(ctx, f.icon, f.x1, y, f.size);
    ctx.restore();
  } else if (f.kind === 'item') {
    // an item flying from the board to a player's pocket (screen handled by the HUD)
    if (k >= 1) return;
    const e = 1 - (1 - k) * (1 - k);
    const x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 60;
    drawIcon(ctx, f.icon, x, y, f.size * (1 + Math.sin(k * Math.PI) * 0.4));
  }
}

export function drawFx(ctx, fx, t) {
  for (const f of fx.flyers) drawFlyer(ctx, f, t);
  for (const r of fx.rings) {
    const k = r.life / r.dur;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.max * (0.2 + 0.8 * (1 - (1 - k) * (1 - k))), 0, Math.PI * 2);
    ctx.strokeStyle = r.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = r.width * (1 - k * 0.6); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of fx.parts) {
    const k = p.life / p.max;
    ctx.globalAlpha = p.kind === 'smoke' ? 0.5 * (1 - k) : Math.min(1, (1 - k) * 2);
    ctx.fillStyle = p.col;
    if (p.kind === 'paper') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2 * (0.4 + Math.abs(Math.sin(p.a * 2))));
      ctx.restore();
    } else if (p.kind === 'smoke') {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k * 2.2), 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'shard') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.lineTo(p.r * 0.6, p.r * 0.6); ctx.lineTo(-p.r * 0.6, p.r * 0.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const w of fx.words) {
    const k = w.life / 1.3;
    const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
    ctx.save();
    ctx.translate(w.x, w.y - k * 40);
    ctx.scale(pop, pop);
    ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
    ctx.font = `800 ${w.size}px 'Baloo 2', system-ui, sans-serif`;
    ctx.lineWidth = w.size * 0.22; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round';
    ctx.strokeText(w.text, 0, 0);
    ctx.fillStyle = w.col; ctx.fillText(w.text, 0, 0);
    ctx.restore();
  }
}
