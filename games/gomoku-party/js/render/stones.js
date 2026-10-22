// A stone is a glossy disc in the player's colour with their pal's head on
// top. Each look is drawn once into a little canvas and reused, so a full
// board stays cheap to paint every frame.

import { SIDE } from '../config.js';
import { palById } from '../data/pals.js';
import { drawPalHead } from './pals.js';

const cache = new Map();

function tint(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// the disc and head, size × size pixels
function sprite(palId, p, mood, size) {
  const key = `${palId}|${p}|${mood || ''}|${size}`;
  let cv = cache.get(key);
  if (cv) return cv;
  if (cache.size > 300) cache.clear();
  cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const c = size / 2, r = size * 0.45;
  const col = SIDE[p];
  const g = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.1, c, c, r);
  g.addColorStop(0, tint(col, 0.55));
  g.addColorStop(0.55, col);
  g.addColorStop(1, tint(col, -0.25));
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.035); ctx.strokeStyle = tint(col, -0.4); ctx.stroke();
  // the head sits low in the disc so the ears fit inside it
  drawPalHead(ctx, palById(palId), c, c + r * 0.27, r * 0.024, mood);
  // a glint on the rim
  ctx.beginPath(); ctx.arc(c, c, r * 0.86, Math.PI * 1.1, Math.PI * 1.45);
  ctx.lineWidth = Math.max(1, size * 0.04); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke();
  cache.set(key, cv);
  return cv;
}

// o: { pal, p, mood, r (radius in world units), px (pixels per world unit), alpha, lift }
export function drawStone(ctx, x, y, o) {
  const r = o.r, box = r / 0.9;   // half the sprite; its disc is 0.45 of the sprite
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (!o.ghost) {
    ctx.fillStyle = 'rgba(40,20,40,.22)';
    ctx.beginPath(); ctx.ellipse(x + r * 0.08, y + r * 0.28 + (o.lift || 0) * 0.5, r * 0.95, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  }
  const size = Math.max(16, Math.round(box * 2 * o.px / 4) * 4);
  ctx.drawImage(sprite(o.pal, o.p, o.mood, size), x - box, y - box - (o.lift || 0), box * 2, box * 2);
  ctx.restore();
}

// a stone's bubble shield
export function drawShield(ctx, x, y, r, t) {
  ctx.save();
  const wob = 1 + Math.sin(t * 3) * 0.03;
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r * 1.18);
  g.addColorStop(0, 'rgba(255,255,255,.45)');
  g.addColorStop(0.7, 'rgba(120,240,230,.12)');
  g.addColorStop(1, 'rgba(46,196,182,.45)');
  ctx.beginPath(); ctx.arc(x, y, r * 1.15 * wob, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = r * 0.09; ctx.strokeStyle = 'rgba(46,196,182,.85)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.9, Math.PI * 1.15, Math.PI * 1.4);
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}
