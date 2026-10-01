// Drawing one bubble buddy: a see-through glass bubble with a face floating
// inside. The glass is painted once per colour in two layers: the tinted
// inside (behind the face) and the shiny surface (in front of it). A glint
// sweeps across now and then.

import { BUDDIES, R } from '../config.js';

const TAU = Math.PI * 2;
const INK = '#3B2340';
const PAD = 3;

const cache = new Map();
let cacheScale = 0;

function cached(key, px, paint) {
  if (px !== cacheScale) { cache.clear(); cacheScale = px; }
  let cv = cache.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = cv.height = Math.ceil((R + PAD) * 2 * px);
    const g = cv.getContext('2d');
    g.scale(px, px);
    g.translate(R + PAD, R + PAD);
    paint(g);
    cache.set(key, cv);
  }
  return cv;
}

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

const GLASS = {
  bomb: { light: '#A9ADE6', main: '#5B5F9A', dark: '#26284F' },
  lightning: { light: '#FFFBD6', main: '#FFD23C', dark: '#E08A00' },
  grey: { light: '#F2F0F6', main: '#BDB7C8', dark: '#857E95' },
  rainbow: { light: '#FFFFFF', main: '#FFB8D8', dark: '#9A6BFF' }
};
const colorsFor = kind => GLASS[kind] || BUDDIES[kind] || BUDDIES[0];

// the inside: clear in the middle, deeper colour towards the rim, and a pool
// of light at the bottom where the light comes through
function glassBack(g, c, fill) {
  const r = R - 0.6;
  g.beginPath(); g.arc(0, 0, r, 0, TAU);
  if (fill) g.fillStyle = fill;
  else {
    const body = g.createRadialGradient(-r * 0.18, -r * 0.22, r * 0.05, 0, 0, r);
    body.addColorStop(0, rgba(c.light, 0.55));
    body.addColorStop(0.45, rgba(c.main, 0.64));
    body.addColorStop(0.8, rgba(c.main, 0.9));
    body.addColorStop(0.94, rgba(c.dark, 0.96));
    body.addColorStop(1, rgba(c.dark, 1));
    g.fillStyle = body;
  }
  g.fill();
  g.save();
  g.clip();
  // like a glass marble: a little darker under the top rim, bright where the light comes out below
  const depth = g.createLinearGradient(0, -r, 0, r * 0.2);
  depth.addColorStop(0, rgba(c.dark, 0.28)); depth.addColorStop(1, rgba(c.dark, 0));
  g.fillStyle = depth; g.fillRect(-r, -r, r * 2, r * 2);
  const pool = g.createRadialGradient(r * 0.1, r * 0.62, 0, r * 0.1, r * 0.62, r * 0.7);
  pool.addColorStop(0, 'rgba(255,255,255,.9)');
  pool.addColorStop(0.35, rgba(c.light, 0.65));
  pool.addColorStop(1, rgba(c.light, 0));
  g.fillStyle = pool; g.fillRect(-r, -r, r * 2, r * 2);
  g.restore();
}

// the surface: crisp rim, a curved window highlight, a rainbow film and a sparkle
function glassFront(g, c) {
  const r = R - 0.6;
  const rim = g.createLinearGradient(0, -r, 0, r);
  rim.addColorStop(0, 'rgba(255,255,255,.95)');
  rim.addColorStop(0.45, rgba(c.main, 0.9));
  rim.addColorStop(1, rgba(c.dark, 1));
  g.beginPath(); g.arc(0, 0, r - 0.4, 0, TAU);
  g.strokeStyle = rim; g.lineWidth = 1.3; g.stroke();

  g.lineCap = 'round';
  g.beginPath(); g.arc(0, 0, r - 2.6, 0.18 * Math.PI, 0.82 * Math.PI);
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.6; g.stroke();

  const sheen = g.createLinearGradient(r * 0.1, -r, r, -r * 0.1);
  ['#FF9EC0', '#FFE27A', '#9BF0C4', '#9AD4FF', '#C9A9FF'].forEach((col, i) => sheen.addColorStop(i / 4, rgba(col, 0.55)));
  g.beginPath(); g.arc(0, 0, r - 2.3, -0.46 * Math.PI, -0.04 * Math.PI);
  g.strokeStyle = sheen; g.lineWidth = 2.2; g.stroke();

  const hi = g.createLinearGradient(-r, -r, 0, 0);
  hi.addColorStop(0, 'rgba(255,255,255,.95)'); hi.addColorStop(1, 'rgba(255,255,255,.12)');
  g.beginPath();
  g.arc(0, 0, r - 2.4, Math.PI * 1.04, Math.PI * 1.62);
  g.arc(1.8, 2.4, r - 6.4, Math.PI * 1.6, Math.PI * 1.07, true);
  g.closePath();
  g.fillStyle = hi; g.fill();

  g.beginPath(); g.ellipse(-r * 0.3, -r * 0.62, r * 0.12, r * 0.06, -0.5, 0, TAU);
  g.fillStyle = 'rgba(255,255,255,.95)'; g.fill();
  sparkle4(g, r * 0.5, -r * 0.42, 2.8, 'rgba(255,255,255,.9)');
  g.beginPath(); g.arc(r * 0.34, r * 0.56, 1.3, 0, TAU);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.fill();
}

function sparkle4(g, x, y, s, color) {
  g.beginPath();
  g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s);
  g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s);
  g.fillStyle = color; g.fill();
}

const backFor = (kind, px) => cached('b' + kind, px, g => glassBack(g, colorsFor(kind)));
const frontFor = (kind, px) => cached('f' + kind, px, g => glassFront(g, colorsFor(kind)));

// o: { x, y, color, special, gift, scale, sx, sy, rot, alpha, mood, blink, lx, ly, t, grey, shine }
export function drawBuddy(ctx, px, o) {
  const s = o.scale == null ? 1 : o.scale;
  if (s <= 0.01) return;
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(s * (o.sx || 1), s * (o.sy || 1));
  if (o.alpha != null && o.alpha < 1) ctx.globalAlpha *= o.alpha;

  const sp = o.special;
  const kind = o.grey ? 'grey' : sp || o.color;
  const size = (R + PAD) * 2;
  if (sp === 'rainbow' && !o.grey) rainbowBack(ctx, o.t || 0);
  else ctx.drawImage(backFor(kind, px), -R - PAD, -R - PAD, size, size);

  face(ctx, o);

  ctx.drawImage(frontFor(kind, px), -R - PAD, -R - PAD, size, size);
  if (o.shine != null && o.shine >= 0 && o.shine < 1) glint(ctx, o.shine);
  if (sp === 'bomb') fuse(ctx, o.t || 0);
  if (sp === 'lightning') crackle(ctx, o.t || 0);
  if (o.gift && !o.grey) bow(ctx, o.t || 0);
  ctx.restore();
}

// a band of light sliding across the glass
function glint(ctx, k) {
  const r = R - 1;
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  ctx.rotate(-0.75);
  const x = -r * 1.5 + k * r * 3;
  const band = ctx.createLinearGradient(x - r * 0.3, 0, x + r * 0.3, 0);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(0.5, 'rgba(255,255,255,.75)');
  band.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = band;
  ctx.fillRect(x - r * 0.3, -r, r * 0.6, r * 2);
  ctx.restore();
}

function rainbowBack(ctx, t) {
  const a = t * 2.2;
  const grad = ctx.createLinearGradient(Math.cos(a) * -R, Math.sin(a) * -R, Math.cos(a) * R, Math.sin(a) * R);
  BUDDIES.forEach((b, i) => grad.addColorStop(i / (BUDDIES.length - 1), rgba(b.main, 0.85)));
  glassBack(ctx, GLASS.rainbow, grad);
}

function fuse(ctx, t) {
  ctx.fillStyle = '#6B6FA6';
  roundRect(ctx, -4.5, -R - 3, 9, 6, 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -R - 3);
  ctx.quadraticCurveTo(5, -R - 11, 10, -R - 8);
  ctx.strokeStyle = '#8A6A4A'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
  const f = 0.75 + 0.35 * Math.sin(t * 40) * Math.sin(t * 23);
  star(ctx, 10, -R - 8, 5.5 * f, 2.2 * f, t * 6, '#FFD23C');
  star(ctx, 10, -R - 8, 3 * f, 1.2 * f, -t * 9, '#FFFFFF');
}

function crackle(ctx, t) {
  const k = Math.floor(t * 14);
  ctx.save();
  ctx.strokeStyle = 'rgba(120,200,255,.95)'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
  for (let i = 0; i < 2; i++) {
    const a = ((k * 7 + i * 13) % 12) / 12 * TAU;
    ctx.beginPath();
    for (let j = 0; j < 4; j++) {
      const rr = R + 1 + j * 3, aa = a + (j % 2 ? 0.18 : -0.12);
      const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr;
      if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  // a little bolt on the forehead
  ctx.beginPath();
  ctx.moveTo(1.5, -R * 0.86); ctx.lineTo(-3.5, -R * 0.52); ctx.lineTo(0, -R * 0.52); ctx.lineTo(-2, -R * 0.26); ctx.lineTo(4, -R * 0.62); ctx.lineTo(0.5, -R * 0.62);
  ctx.closePath(); ctx.fillStyle = '#FFFFFF'; ctx.fill();
}

function bow(ctx, t) {
  const wob = Math.sin(t * 5) * 0.08;
  ctx.save();
  ctx.translate(0, -R * 0.82); ctx.rotate(wob);
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#E24A86'; ctx.lineWidth = 1.3;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(s * 6, -1, 6.5, 4.2, s * 0.35, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fillStyle = '#FF7EB0'; ctx.fill(); ctx.stroke();
  ctx.restore();
  // twinkle
  const k = (Math.sin(t * 3.1) + 1) / 2;
  star(ctx, R * 0.62, -R * 0.62, 3.5 * k + 0.5, 1.2, t, 'rgba(255,255,255,.95)');
}

/* ---------- faces ---------- */

function face(ctx, o) {
  const b = o.special ? null : BUDDIES[o.color] || BUDDIES[0];
  let eyes = o.special === 'rainbow' ? 'star' : o.special === 'bomb' ? 'dot' : o.special === 'lightning' ? 'wide' : b.eyes;
  let mouth = o.special === 'rainbow' ? 'open' : o.special === 'bomb' ? 'smirk' : o.special === 'lightning' ? 'open' : b.mouth;
  const mood = o.mood || 'idle';
  if (mood === 'happy') { eyes = 'happy'; mouth = 'open'; }
  else if (mood === 'surprised') { eyes = 'wide'; mouth = 'o'; }
  else if (mood === 'sad') { eyes = 'sad'; mouth = 'frown'; }
  else if (mood === 'worried') { mouth = 'wavy'; }
  const ink = o.special === 'bomb' ? '#FFFFFF' : INK;

  ctx.save();
  ctx.scale(R, R);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const lx = o.lx || 0, ly = o.ly || 0;

  // cheeks
  ctx.fillStyle = o.special === 'bomb' ? 'rgba(255,120,160,.45)' : 'rgba(255,80,120,.33)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 0.56, 0.2, 0.14, 0.085, 0, 0, TAU); ctx.fill(); }

  drawEyes(ctx, eyes, o.blink > 0 && eyes !== 'happy' && eyes !== 'sleepy' && eyes !== 'sad', lx, ly, ink);
  if (mood === 'worried') {
    ctx.strokeStyle = ink; ctx.lineWidth = 0.06;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 0.18, -0.4); ctx.lineTo(s * 0.46, -0.31); ctx.stroke(); }
    // a drop of sweat
    ctx.fillStyle = 'rgba(140,210,255,.95)';
    ctx.beginPath(); ctx.moveTo(0.74, -0.42); ctx.quadraticCurveTo(0.9, -0.16, 0.74, -0.12); ctx.quadraticCurveTo(0.58, -0.16, 0.74, -0.42); ctx.fill();
  }
  if (mood === 'sad') {
    ctx.fillStyle = 'rgba(120,200,255,.95)';
    ctx.beginPath(); ctx.ellipse(-0.38, 0.12 + ((o.t || 0) * 0.6 % 0.3), 0.06, 0.09, 0, 0, TAU); ctx.fill();
  }
  drawMouth(ctx, mouth, ink);
  ctx.restore();
}

function drawEyes(ctx, type, closed, lx, ly, ink) {
  const ex = 0.33, ey = -0.04;
  ctx.fillStyle = ink; ctx.strokeStyle = ink;
  for (const s of [-1, 1]) {
    const x = s * ex + lx, y = ey + ly;
    if (closed) {
      ctx.lineWidth = 0.07;
      ctx.beginPath(); ctx.moveTo(x - 0.11, y); ctx.quadraticCurveTo(x, y + 0.07, x + 0.11, y); ctx.stroke();
      continue;
    }
    switch (type) {
      case 'happy':
        ctx.lineWidth = 0.08;
        ctx.beginPath(); ctx.moveTo(x - 0.12, y + 0.05); ctx.quadraticCurveTo(x, y - 0.16, x + 0.12, y + 0.05); ctx.stroke();
        break;
      case 'sleepy':
        ctx.lineWidth = 0.075;
        ctx.beginPath(); ctx.moveTo(x - 0.12, y - 0.03); ctx.quadraticCurveTo(x, y + 0.12, x + 0.12, y - 0.03); ctx.stroke();
        break;
      case 'sad':
        ctx.lineWidth = 0.075;
        ctx.beginPath(); ctx.moveTo(x - 0.11, y + 0.04); ctx.quadraticCurveTo(x, y - 0.08, x + 0.11, y + 0.04); ctx.stroke();
        // brows tilt up towards the middle
        ctx.beginPath(); ctx.moveTo(x + s * 0.1, y - 0.17); ctx.lineTo(x - s * 0.1, y - 0.25); ctx.stroke();
        break;
      case 'big':
        ctx.beginPath(); ctx.ellipse(x, y, 0.14, 0.19, 0, 0, TAU); ctx.fill();
        dotW(ctx, x + 0.05, y - 0.07, 0.065); dotW(ctx, x - 0.04, y + 0.07, 0.03);
        break;
      case 'wide':
        ctx.beginPath(); ctx.arc(s * ex, ey, 0.18, 0, TAU);
        ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 0.045; ctx.stroke();
        ctx.fillStyle = ink === '#FFFFFF' ? INK : ink;
        ctx.beginPath(); ctx.arc(s * ex + lx * 1.5, ey + ly * 1.5, 0.095, 0, TAU); ctx.fill();
        dotW(ctx, s * ex + lx * 1.5 + 0.035, ey + ly * 1.5 - 0.04, 0.035);
        ctx.fillStyle = ink;
        break;
      case 'star':
        star(ctx, x, y, 0.17, 0.075, 0, ink);
        dotW(ctx, x + 0.04, y - 0.05, 0.03);
        break;
      default: // dot
        ctx.beginPath(); ctx.ellipse(x, y, 0.105, 0.145, 0, 0, TAU); ctx.fill();
        dotW(ctx, x + 0.035, y - 0.055, 0.042);
    }
    ctx.fillStyle = ink;
  }
}

function dotW(ctx, x, y, r) {
  const f = ctx.fillStyle;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = f;
}

function drawMouth(ctx, type, ink) {
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 0.07;
  const y = 0.24;
  switch (type) {
    case 'open':
      ctx.beginPath(); ctx.moveTo(-0.15, y); ctx.quadraticCurveTo(0, y + 0.36, 0.15, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FF8FA8';
      ctx.beginPath(); ctx.ellipse(0, y + 0.13, 0.07, 0.045, 0, 0, TAU); ctx.fill();
      break;
    case 'o':
      ctx.beginPath(); ctx.ellipse(0, y + 0.06, 0.075, 0.095, 0, 0, TAU); ctx.fill();
      break;
    case 'cat':
      ctx.beginPath(); ctx.moveTo(-0.15, y); ctx.quadraticCurveTo(-0.075, y + 0.13, 0, y + 0.02); ctx.quadraticCurveTo(0.075, y + 0.13, 0.15, y); ctx.stroke();
      break;
    case 'frown':
      ctx.beginPath(); ctx.moveTo(-0.12, y + 0.12); ctx.quadraticCurveTo(0, y - 0.02, 0.12, y + 0.12); ctx.stroke();
      break;
    case 'wavy':
      ctx.beginPath(); ctx.moveTo(-0.15, y + 0.06);
      ctx.quadraticCurveTo(-0.075, y - 0.02, 0, y + 0.06); ctx.quadraticCurveTo(0.075, y + 0.14, 0.15, y + 0.06); ctx.stroke();
      break;
    case 'smirk':
      ctx.beginPath(); ctx.moveTo(-0.13, y + 0.02); ctx.quadraticCurveTo(0.02, y + 0.16, 0.15, y - 0.02); ctx.stroke();
      break;
    default: // smile
      ctx.beginPath(); ctx.moveTo(-0.13, y); ctx.quadraticCurveTo(0, y + 0.16, 0.13, y); ctx.stroke();
  }
}

/* ---------- small shared shapes ---------- */

export function star(ctx, x, y, outer, inner, rot, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5 - Math.PI / 2;
    const rr = i % 2 ? inner : outer;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const colorOf = (color, special) =>
  special === 'bomb' ? { main: '#5B5F9A', light: '#B9BCE8', dark: '#2A2C55' }
    : special === 'lightning' ? { main: '#FFD83D', light: '#FFF6B0', dark: '#E09000' }
      : special === 'rainbow' ? { main: '#FF7EB0', light: '#FFFFFF', dark: '#A97BFF' }
        : BUDDIES[color] || BUDDIES[0];
