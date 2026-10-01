// Sparkles, dust, confetti, little pop-up words, the big banner between
// points and a bit of screen shake. All of it is just for show.

const INK = '#3B2340';
const DISPLAY = "'Baloo 2', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif";

export function createFx() {
  return { parts: [], words: [], banner: null, shake: 0, flash: 0, cheer: 0, trail: [] };
}

export function burst(fx, x, y, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
    const sp = (o.speed ?? 180) * (0.4 + Math.random() * 0.8);
    fx.parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: (o.life ?? 0.6) * (0.6 + Math.random() * 0.6), age: 0,
      size: (o.size ?? 4) * (0.6 + Math.random() * 0.8),
      color: Array.isArray(o.color) ? o.color[(Math.random() * o.color.length) | 0] : (o.color || '#fff'),
      kind: o.kind || 'dot', g: o.gravity ?? 400, spin: Math.random() * 6
    });
  }
}

export function word(fx, text, x, y, color = '#fff', size = 22) {
  fx.words.push({ text, x, y, color, size, age: 0, life: 1 });
}

export function banner(fx, title, sub, color = '#FF6F9C', life = 1.6) {
  fx.banner = { title, sub, color, age: 0, life };
}

export function updateFx(fx, dt) {
  for (const p of fx.parts) {
    p.age += dt;
    p.vy += p.g * dt;
    p.vx *= 1 - dt * 1.5;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.spin += dt * 8;
  }
  fx.parts = fx.parts.filter(p => p.age < p.life);
  for (const w of fx.words) { w.age += dt; w.y -= dt * 40; }
  fx.words = fx.words.filter(w => w.age < w.life);
  if (fx.banner && (fx.banner.age += dt) > fx.banner.life) fx.banner = null;
  fx.shake = Math.max(0, fx.shake - dt * 30);
  fx.flash = Math.max(0, fx.flash - dt * 3);
  fx.cheer = Math.max(0, fx.cheer - dt);
}

export function drawParts(ctx, fx) {
  for (const p of fx.parts) {
    const k = 1 - p.age / p.life;
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.fillStyle = p.color;
    if (p.kind === 'star') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin);
      star(ctx, p.size * (0.5 + k * 0.5));
      ctx.fill(); ctx.restore();
    } else if (p.kind === 'confetti') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else if (p.kind === 'flame') {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function star(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

function outlined(ctx, text, x, y, size, fill, line = INK) {
  ctx.font = `800 ${size}px ${DISPLAY}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.22; ctx.strokeStyle = line;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export function drawWords(ctx, fx) {
  for (const w of fx.words) {
    const k = w.age / w.life;
    const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : k < 0.25 ? 1.1 - (k - 0.15) : 1;
    ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    ctx.save(); ctx.translate(w.x, w.y); ctx.scale(pop, pop);
    outlined(ctx, w.text, 0, 0, w.size, w.color);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function drawBanner(ctx, fx, cx, cy) {
  const b = fx.banner;
  if (!b) return;
  const k = b.age / b.life;
  const inT = Math.min(1, b.age / 0.25);
  const ease = 1 + 2.2 * Math.pow(inT - 1, 3) + 1.2 * Math.pow(inT - 1, 2);
  const alpha = k > 0.82 ? (1 - k) / 0.18 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(ease, ease);
  ctx.rotate(-0.03);
  outlined(ctx, b.title, 0, 0, 58, b.color);
  if (b.sub) outlined(ctx, b.sub, 0, 46, 26, '#fff');
  ctx.restore();
}
