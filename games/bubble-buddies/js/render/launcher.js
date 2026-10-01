// The bottom of the board: the launcher, the power meter and the "ceiling
// drops soon" dots. Dino (render/dragon.js) stands beside it holding the next
// bubble; the swap and reload throws between the two are drawn here too.

import { SHOOTER, CHARGE_MAX, R, BUDDIES } from '../config.js';
import { drawBuddy, star, roundRect } from './buddy.js';
import { holdPoint } from './dragon.js';

const TAU = Math.PI * 2;
export const HELD_SCALE = 0.8;

const lerp = (a, b, k) => a + (b - a) * k;
const smooth = s => s * s * (3 - 2 * s);
const back = s => s >= 1 ? 1 : 1 + 2.7 * Math.pow(s - 1, 3) + 1.7 * Math.pow(s - 1, 2);

// v: { angle, recoil, cur, next, swapT, swapMode, charge, chargeGlow, misses, pushEvery, warn, time, px, mode, ready }
export function drawLauncher(ctx, v) {
  const { x, y } = SHOOTER;
  const t = v.time;

  // shadow
  ctx.fillStyle = 'rgba(40,20,70,.18)';
  ctx.beginPath(); ctx.ellipse(x, y + 34, 46, 9, 0, 0, TAU); ctx.fill();

  // power meter: a rainbow arc under the launcher
  const frac = Math.min(1, v.charge / CHARGE_MAX);
  const a0 = 0.12 * Math.PI, a1 = 0.88 * Math.PI;
  ctx.lineCap = 'round';
  ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.arc(x, y, 44, a0, a1); ctx.stroke();
  if (frac > 0) {
    const grad = ctx.createLinearGradient(x + 44, y, x - 44, y);
    BUDDIES.forEach((b, i) => grad.addColorStop(i / (BUDDIES.length - 1), b.main));
    ctx.lineWidth = 6 + (v.chargeGlow || 0) * 3; ctx.strokeStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, 44, a1 - (a1 - a0) * frac, a1); ctx.stroke();
    if (frac > 0.75) {
      const k = (Math.sin(t * 8) + 1) / 2;
      const ang = a1 - (a1 - a0) * frac;
      star(ctx, x + Math.cos(ang) * 44, y + Math.sin(ang) * 44, 5 + k * 3, 2, t * 4, '#FFFFFF');
    }
  }

  // pedestal: a puffy cloud
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(80,60,120,.18)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x - 22, y + 16, 15, 0, TAU); ctx.arc(x + 22, y + 16, 15, 0, TAU); ctx.arc(x, y + 20, 20, 0, TAU);
  ctx.fill();

  // the barrel points where you aim
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-v.angle);
  const kick = v.recoil * 8;
  const col = v.cur.special ? '#FF7EB0' : BUDDIES[v.cur.color].main;
  roundRect(ctx, 6 - kick, -11, 40, 22, 10);
  ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = 'rgba(80,60,120,.3)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = col;
  roundRect(ctx, 30 - kick, -12, 8, 24, 3); ctx.fill();
  roundRect(ctx, 16 - kick, -11, 5, 22, 2); ctx.fill();
  ctx.restore();

  // the bubble waiting in the launcher (when it isn't flying over from Dino)
  const bob = Math.sin(t * 3) * 1.5;
  if (v.cur.special && v.swapT == null && v.ready !== false) {
    // a ready power-up glows
    const k = (Math.sin(t * 6) + 1) / 2;
    ctx.globalAlpha = 0.35 + k * 0.3;
    ctx.beginPath(); ctx.arc(x, y, R + 7 + k * 4, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (v.ready !== false && v.swapT == null) {
    const lx = Math.cos(v.angle) * 0.07, ly = -Math.sin(v.angle) * 0.07;
    drawBuddy(ctx, v.px, {
      x, y: y + bob, color: v.cur.color, special: v.cur.special,
      scale: v.readyPop == null ? 1 : back(v.readyPop),
      t, blink: blinkAt(t, 0), lx, ly, sx: 1 + v.recoil * 0.12, sy: 1 - v.recoil * 0.12, shine: v.shine
    });
  }

  // dots: how many more misses before the ceiling drops (or, in endless, before a new row)
  const n = v.pushEvery, left = n - v.misses;
  const gap = 13, x0 = x - (n - 1) * gap / 2, yd = y + 66;
  for (let i = 0; i < n; i++) {
    const used = i >= left;
    const warn = left === 1 && !used;
    const k = warn ? (Math.sin(t * 12) + 1) / 2 : 0;
    ctx.beginPath(); ctx.arc(x0 + i * gap, yd, used ? 3.2 : 4.6 + k * 1.5, 0, TAU);
    ctx.fillStyle = used ? 'rgba(59,35,64,.22)' : warn ? `rgb(255,${90 + k * 60},120)` : '#FFFFFF';
    ctx.fill();
    if (!used) { ctx.strokeStyle = 'rgba(59,35,64,.35)'; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
}

function blinkAt(t, off) {
  const p = (t + off) % 4.2;
  return p < 0.12 ? 1 : 0;
}

// Dino's bubble, drawn at the origin (Dino's paws): hidden while it is being
// swapped, popping in fresh after a reload
export function drawHeld(ctx, v) {
  const advancing = v.swapT != null && v.swapMode === 'advance';
  if (v.swapT != null && !advancing) return;
  const scale = HELD_SCALE * (advancing ? back(Math.max(0, v.swapT * 1.5 - 0.5)) : 1);
  drawBuddy(ctx, v.px, {
    x: 0, y: 0, color: v.next.color, special: v.next.special, scale, t: v.time,
    blink: blinkAt(v.time, 1.3), lx: -0.05, ly: -0.04, shine: v.shine
  });
}

// the throws: Dino's bubble arcs into the launcher, and on a swap the launcher's arcs back
export function drawThrows(ctx, v) {
  if (v.swapT == null) return;
  const h = holdPoint(), e = smooth(v.swapT);
  const up = Math.sin(e * Math.PI) * 60;
  drawBuddy(ctx, v.px, {
    x: lerp(h.x, SHOOTER.x, e), y: lerp(h.y, SHOOTER.y, e) - up, color: v.cur.color, special: v.cur.special,
    scale: lerp(HELD_SCALE, 1, e), rot: (1 - e) * -6, t: v.time, mood: 'happy'
  });
  if (v.swapMode === 'swap') {
    drawBuddy(ctx, v.px, {
      x: lerp(SHOOTER.x, h.x, e), y: lerp(SHOOTER.y, h.y, e) - up * 0.5, color: v.next.color, special: v.next.special,
      scale: lerp(1, HELD_SCALE, e), rot: e * 6, t: v.time, mood: 'happy'
    });
  }
}
