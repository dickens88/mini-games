// Draws one frame of a match: the court, both pals, the ball, power-up
// bubbles, hints and effects. Reads the match state; never changes it.

import { W, H, FLOOR, NET_X, BALL_R, COURT_L, COURT_R } from '../config.js';
import { palById } from '../data/pals.js';
import { powerById } from '../data/powerups.js';
import { predict } from '../core/physics.js';
import { env, bubbleY } from '../core/match.js';
import { sizeOf } from '../core/player.js';
import { COURT_ART, drawSurface, drawNet } from './courts.js';
import { drawPal } from './pals.js';
import { drawPowerBubble, drawPowerIcon } from './icons.js';
import { drawParts, drawWords, drawBanner } from './fx.js';

const INK = '#3B2340';
const DISPLAY = "'Baloo 2', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif";
export const SIDE_COLORS = ['#FF5E8A', '#3D8BFF'];

// the still part of a court, painted once per size
const cache = {};
function backdrop(id, scale) {
  const key = id + '@' + scale;
  if (!cache[key]) {
    for (const k in cache) if (k.startsWith(id + '@')) delete cache[k];
    const c = document.createElement('canvas');
    c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    const x = c.getContext('2d');
    x.scale(scale, scale);
    const art = COURT_ART[id];
    art.back(x);
    cache[key] = c;
  }
  return cache[key];
}

// a picture of a court for the setup screen
export function paintCourtThumb(cv, id) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 160, h = cv.clientHeight || 90;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  const s = (w * dpr) / W;
  ctx.setTransform(s, 0, 0, s, 0, (h * dpr - H * s) / 2);
  const art = COURT_ART[id];
  art.back(ctx);
  art.live(ctx, 1, null, 0);
  drawSurface(ctx, art);
  drawNet(ctx, art);
}

export function render(ctx, s, view) {
  const { fx, t } = view;
  const art = COURT_ART[s.court.id];
  const scale = view.scale;

  ctx.save();
  if (fx.shake > 0) ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
  ctx.drawImage(backdrop(s.court.id, scale), 0, 0, W, H);
  art.live(ctx, t, s, fx.cheer);
  drawSurface(ctx, art);
  if (s.court.wind) windsocks(ctx, s, t);

  if (view.helper && s.phase === 'rally') landing(ctx, s, t);
  shadows(ctx, s);
  drawNet(ctx, art);

  for (const b of s.bubbles) {
    const fade = Math.min(1, b.age * 3) * (b.life - b.age < 1.5 ? 0.5 + 0.5 * Math.sin(b.age * 20) : 1);
    drawPowerBubble(ctx, b.power, b.x, bubbleY(b), b.r, t + b.id, Math.max(0, fade));
  }

  s.players.forEach((p, i) => pal(ctx, s, p, i, view));
  ball(ctx, s, view);

  drawParts(ctx, fx);
  drawWords(ctx, fx);
  if (s.phase === 'serve') serveHint(ctx, s, view);
  offscreen(ctx, s);
  if (fx.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${fx.flash * 0.5})`; ctx.fillRect(0, 0, W, H); }
  drawBanner(ctx, fx, W / 2, H * 0.36);
  ctx.restore();
}

// ---------- pieces ----------

function shadows(ctx, s) {
  ctx.fillStyle = 'rgba(30,20,50,.22)';
  for (const p of s.players) {
    const h = FLOOR - p.y, k = Math.max(0.4, 1 - h / 260) * sizeOf(p);
    ctx.beginPath(); ctx.ellipse(p.x, FLOOR + 1, 24 * k, 6 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  const b = s.ball;
  if (b.y < FLOOR) {
    const h = FLOOR - b.y, k = Math.max(0.3, 1 - h / 380);
    ctx.fillStyle = `rgba(30,20,50,${0.3 * k})`;
    ctx.beginPath(); ctx.ellipse(b.x, FLOOR + 1, 10 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// where the ball is going to come down, in the colour of the pal who has to get it
function landing(ctx, s, t) {
  const b = s.ball;
  if (b.lastHitter < 0 || b.bounces > 0) return;
  const { floors } = predict(b, env(s), 3, 8);
  const f = floors[0];
  if (!f) return;
  const out = f.x < COURT_L || f.x > COURT_R || (b.lastHitter === 0 ? f.x < NET_X : f.x > NET_X);
  const who = 1 - b.lastHitter;
  const pulse = 1 + Math.sin(t * 10) * 0.12;
  ctx.save();
  ctx.translate(f.x, FLOOR + 1);
  ctx.scale(pulse, pulse);
  ctx.lineWidth = 3;
  ctx.strokeStyle = out ? 'rgba(255,255,255,.55)' : SIDE_COLORS[who];
  ctx.setLineDash(out ? [4, 4] : []);
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  if (out) {
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.moveTo(5, -5); ctx.lineTo(-5, 5); ctx.stroke();
  }
  ctx.restore();
}

function pal(ctx, s, p, i, view) {
  const def = palById(p.pal);
  const glow = p.charge === 'fire' ? 'rgba(255,120,40,.8)' : p.charge === 'zigzag' ? 'rgba(183,124,255,.8)' : null;
  const swing = p.swingT >= 0 ? p.swingT : null;
  const size = sizeOf(p);
  let mood = p.mood;
  if (!mood && p.fx.freeze > 0) mood = 'frozen';
  if (p.fx.speed > 0 && p.onGround && Math.abs(p.vx) > 200 && Math.random() < 0.5) {
    view.fx.parts.push({ x: p.x - Math.sign(p.vx) * 10, y: FLOOR - 4, vx: -p.vx * 0.2, vy: -30, life: 0.35, age: 0, size: 4, color: 'rgba(255,255,255,.8)', kind: 'dot', g: 0, spin: 0 });
  }
  drawPal(ctx, def, {
    x: p.x, y: p.y, dir: p.dir, size, run: p.run, air: !p.onGround, vx: p.vx,
    swing, mood, t: view.t + i * 1.7, giant: p.fx.giant > 0, glow, land: p.landT
  });
  if (p.fx.freeze > 0) iceCube(ctx, p, size);
  if (p.stun > 0 || p.mood === 'dizzy') dizzyStars(ctx, p, size, view.t);

  // the tag over their head, and any power-ups running on them
  const top = p.y - 112 * size - (def.ears === 'long' ? 14 * size : 0);
  tag(ctx, view.labels[i], p.x, top, SIDE_COLORS[i]);
  const running = ['giant', 'speed', 'tiny'].filter(k => p.fx[k] > 0);
  if (p.charge) running.unshift(p.charge);
  running.forEach((k, j) => {
    const x = p.x + (j - (running.length - 1) / 2) * 30, y = top - 26;
    const d = powerById(k);
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
    if (d.time) {
      ctx.strokeStyle = d.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.fx[k] / d.time)); ctx.stroke();
    } else {
      ctx.strokeStyle = d.color; ctx.lineWidth = 3; ctx.stroke();
    }
    drawPowerIcon(ctx, k, x, y, 10);
  });
}

function tag(ctx, text, x, y, color) {
  if (!text) return;
  ctx.font = `800 13px ${DISPLAY}`;
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - 10, w, 19, 9.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 5, y + 8); ctx.lineTo(x + 5, y + 8); ctx.lineTo(x, y + 14); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
}

function iceCube(ctx, p, size) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(size, size);
  ctx.fillStyle = 'rgba(190,240,255,.55)';
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-36, -98, 72, 98, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath(); ctx.moveTo(-28, -90); ctx.lineTo(-14, -90); ctx.lineTo(-28, -60); ctx.fill();
  ctx.restore();
}

function dizzyStars(ctx, p, size, t) {
  for (let i = 0; i < 3; i++) {
    const a = t * 6 + i * 2.1;
    const x = p.x + Math.cos(a) * 22 * size, y = p.y - 96 * size + Math.sin(a) * 6;
    ctx.fillStyle = '#FFD23F';
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.5 : 6; ctx.lineTo(Math.cos(k * Math.PI / 5) * r, Math.sin(k * Math.PI / 5) * r); }
    ctx.fill(); ctx.restore();
  }
}

function ball(ctx, s, view) {
  const b = s.ball, fx = view.fx;
  // a trail when it's going fast
  const sp = Math.hypot(b.vx, b.vy);
  fx.trail.push({ x: b.x, y: b.y });
  if (fx.trail.length > 10) fx.trail.shift();
  if (!b.held && sp > 500) {
    for (let i = 0; i < fx.trail.length - 1; i++) {
      const q = fx.trail[i], k = i / fx.trail.length;
      ctx.fillStyle = b.fire ? `rgba(255,${120 + k * 80},40,${k * 0.6})` : b.zig ? `rgba(183,124,255,${k * 0.45})` : `rgba(255,255,255,${k * 0.4})`;
      ctx.beginPath(); ctx.arc(q.x, q.y, BALL_R * (0.4 + k * 0.6), 0, Math.PI * 2); ctx.fill();
    }
  }
  if (b.fire && Math.random() < 0.8) {
    fx.parts.push({ x: b.x + (Math.random() - 0.5) * 8, y: b.y + (Math.random() - 0.5) * 8, vx: -b.vx * 0.1, vy: -60, life: 0.35, age: 0, size: 7, color: Math.random() < 0.5 ? '#FF6A3D' : '#FFD23F', kind: 'flame', g: -100, spin: 0 });
  }
  if (b.zig && Math.random() < 0.4) {
    fx.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.4, age: 0, size: 3, color: '#D7B8FF', kind: 'star', g: 0, spin: 0 });
  }
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.spin);
  ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, BALL_R);
  g.addColorStop(0, b.fire ? '#FFF2A8' : '#F6FF9E');
  g.addColorStop(1, b.fire ? '#FF7A2E' : '#C9E52A');
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(59,35,64,.55)'; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(-BALL_R * 1.1, 0, BALL_R * 0.9, -0.9, 0.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(BALL_R * 1.1, 0, BALL_R * 0.9, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  ctx.restore();
}

// the ball went over the top of the screen: an arrow shows where it is
function offscreen(ctx, s) {
  const b = s.ball;
  if (b.y > -BALL_R) return;
  const h = Math.min(1, -b.y / 400);
  ctx.save();
  ctx.translate(Math.max(14, Math.min(W - 14, b.x)), 14);
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(9 - h * 3, 6); ctx.lineTo(-9 + h * 3, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function serveHint(ctx, s, view) {
  if (s.ball.tossed || s.phaseT < 0.5) return;
  const hint = view.serveHint[s.server];
  if (!hint) return;
  const p = s.players[s.server];
  const x = Math.max(110, Math.min(W - 110, p.x + p.dir * 50)), y = p.y - 160;
  const a = 0.75 + Math.sin(view.t * 5) * 0.25;
  ctx.globalAlpha = a;
  ctx.font = `800 15px ${DISPLAY}`;
  const w = ctx.measureText(hint).width + 22;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - 14, w, 28, 14); ctx.fill();
  ctx.strokeStyle = SIDE_COLORS[s.server]; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(hint, x, y + 1);
  ctx.globalAlpha = 1;
}

// beach flags on the posts show which way the wind blows and how hard
function windsocks(ctx, s, t) {
  const w = s.wind / Math.max(1, s.court.wind);
  for (const x of [20, W - 20]) {
    const y = FLOOR - 120;
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y, 4, 110);
    ctx.save();
    ctx.translate(x, y + 6);
    const len = 14 + Math.abs(w) * 30, dir = w >= 0 ? 1 : -1;
    ctx.fillStyle = '#FF5E7E';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    for (let i = 0; i <= 6; i++) ctx.lineTo(dir * len * i / 6, -6 + Math.sin(t * 10 + i) * 2 * (1 - Math.abs(w) * 0.6) + (1 - Math.abs(w)) * i * 2);
    for (let i = 6; i >= 0; i--) ctx.lineTo(dir * len * i / 6, 6 - i * 0.9 + Math.sin(t * 10 + i) * 2 * (1 - Math.abs(w) * 0.6) + (1 - Math.abs(w)) * i * 2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // a big arrow at the top when it's really blowing
  if (Math.abs(w) > 0.15) {
    ctx.save();
    ctx.translate(W / 2, 22);
    ctx.globalAlpha = Math.min(1, Math.abs(w) * 1.4);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = `800 13px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const n = Math.abs(w) > 0.7 ? 3 : Math.abs(w) > 0.4 ? 2 : 1;
    const arrows = (w > 0 ? '›' : '‹').repeat(n);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(59,35,64,.5)';
    const label = w > 0 ? `WIND ${arrows}` : `${arrows} WIND`;
    ctx.font = `800 16px ${DISPLAY}`;
    ctx.strokeText(label, Math.sin(t * 3) * 3 * Math.sign(w), 0);
    ctx.fillText(label, Math.sin(t * 3) * 3 * Math.sign(w), 0);
    ctx.restore();
    // streaks of wind
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const sp = 260 * Math.abs(w) + 60;
      const x = ((i * 173 + t * sp * Math.sign(w)) % (W + 120) + W + 120) % (W + 120) - 60;
      const y = 70 + i * 55;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sign(w) * 40 * Math.abs(w), y); ctx.stroke();
    }
  }
}

