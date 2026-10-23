// Mushroom Hollow: a moonlit forest floor of odd mushrooms — a giant fly
// agaric, glowing stalks, a mushroom with an eye, a swirly lollipop cap —
// with a bubbling cauldron and crystals. Shelf-fungus stairs climb ahead,
// caterpillars slide you back, fairy rings of tiny mushrooms are the portals.

import { roundRect, text, seeded, curvePath, onCurve, routePath, arrowHead, CELL_R } from '../kit.js';

const CATERPILLARS = [['#7BD389', '#C4F5C9'], ['#9B7BFF', '#DCD0FF'], ['#4FC3F7', '#C2EBFD'], ['#FF8FB1', '#FFD6E2']];

// decorations that the ambient layer animates too
const EYE = { x: 41, y: 22, s: 8 };          // the mushroom that watches you
const CAULDRON = { x: 80, y: 86, s: 8 };
const GLOWS = [[5, 43, 7], [8.5, 42, 9.5], [12, 43.5, 6], [44, 42, 7.5], [47.5, 41.5, 5.5], [94, 63, 6], [96.5, 62, 4.5]];

/* ---------- mushrooms ---------- */

// a classic red toadstool with white spots; (x, y) is the foot of the stem
function agaric(ctx, S, x, y, s, cap) {
  stem(ctx, S, x, y, s * 0.24, s * 0.85, '#F7EEDC');
  ctx.beginPath();
  ctx.ellipse(S(x), S(y - s * 0.62), S(s * 0.27), S(s * 0.07), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#EADCBE';
  ctx.fill();
  agaricCap(ctx, S, x, y - s * 0.8, s, cap);
}

function agaricCap(ctx, S, x, cy, s, cap = ['#FF6B6B', '#B3122E']) {
  ctx.beginPath();
  ctx.ellipse(S(x), S(cy), S(s * 0.95), S(s * 0.16), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#E8CFAF';
  ctx.fill();
  const g = ctx.createRadialGradient(S(x - s * 0.3), S(cy - s * 0.5), S(s * 0.1), S(x), S(cy), S(s));
  g.addColorStop(0, cap[0]);
  g.addColorStop(1, cap[1]);
  ctx.beginPath();
  ctx.ellipse(S(x), S(cy), S(s * 0.95), S(s * 0.7), 0, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const [dx, dy, r] of [[-0.5, -0.22, 0.13], [-0.12, -0.52, 0.16], [0.32, -0.36, 0.12], [0.62, -0.12, 0.09], [-0.78, -0.06, 0.07], [0.08, -0.18, 0.08]]) {
    ctx.beginPath();
    ctx.ellipse(S(x + dx * s), S(cy + dy * s), S(r * s), S(r * s * 0.8), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function stem(ctx, S, x, y, w, h, col) {
  ctx.beginPath();
  ctx.moveTo(S(x - w), S(y));
  ctx.quadraticCurveTo(S(x - w * 0.4), S(y - h * 0.5), S(x - w * 0.7), S(y - h));
  ctx.lineTo(S(x + w * 0.7), S(y - h));
  ctx.quadraticCurveTo(S(x + w * 0.4), S(y - h * 0.5), S(x + w), S(y));
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.fillStyle = 'rgba(60, 30, 70, 0.18)';
  ctx.beginPath();
  ctx.ellipse(S(x), S(y), S(w * 1.4), S(w * 0.35), 0, 0, Math.PI * 2);
  ctx.fill();
}

// a thin stalk with a little glowing bell on top
function glowStalk(ctx, S, x, y, h, col) {
  const top = { x: x + h * 0.12, y: y - h };
  const halo = ctx.createRadialGradient(S(top.x), S(top.y), 0, S(top.x), S(top.y), S(h * 0.55));
  halo.addColorStop(0, col.replace('1)', '0.55)'));
  halo.addColorStop(1, col.replace('1)', '0)'));
  ctx.fillStyle = halo;
  ctx.fillRect(S(top.x - h), S(top.y - h), S(h * 2), S(h * 2));
  ctx.beginPath();
  ctx.moveTo(S(x), S(y));
  ctx.quadraticCurveTo(S(x - h * 0.1), S(y - h * 0.5), S(top.x), S(top.y));
  ctx.strokeStyle = '#E9F7F2';
  ctx.lineWidth = S(h * 0.07);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(S(top.x), S(top.y + h * 0.02), S(h * 0.2), S(h * 0.17), 0, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(S(top.x - h * 0.06), S(top.y - h * 0.08), S(h * 0.06), S(h * 0.035), -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
}

// a lime mushroom with one big eye (the pupil is redrawn by the ambient layer)
function eyeShroom(ctx, S, { x, y, s }) {
  stem(ctx, S, x, y, s * 0.2, s * 0.75, '#DDEFC4');
  const cy = y - s * 0.85;
  ctx.beginPath();
  ctx.ellipse(S(x), S(cy + s * 0.1), S(s * 0.62), S(s * 0.12), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#9DB86A';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(S(x), S(cy + s * 0.1), S(s * 0.62), S(s * 0.62), 0, Math.PI, 0);
  ctx.closePath();
  const g = ctx.createRadialGradient(S(x - s * 0.2), S(cy - s * 0.3), S(s * 0.05), S(x), S(cy), S(s * 0.7));
  g.addColorStop(0, '#D4F57A');
  g.addColorStop(1, '#6FA332');
  ctx.fillStyle = g;
  ctx.fill();
  eye(ctx, S, x, cy - s * 0.12, s * 0.27, 0, 0, 0);
}

function eye(ctx, S, x, y, r, lookX, lookY, shut) {
  ctx.beginPath();
  ctx.ellipse(S(x), S(y), S(r), S(r * 0.85), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFDF5';
  ctx.fill();
  ctx.lineWidth = S(r * 0.1);
  ctx.strokeStyle = '#3B5A1A';
  ctx.stroke();
  if (shut < 0.9) {
    ctx.beginPath();
    ctx.arc(S(x + lookX * r * 0.35), S(y + lookY * r * 0.3), S(r * 0.48), 0, Math.PI * 2);
    ctx.fillStyle = '#B04CE0';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(S(x + lookX * r * 0.42), S(y + lookY * r * 0.36), S(r * 0.24), 0, Math.PI * 2);
    ctx.fillStyle = '#1B1030';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(S(x + lookX * r * 0.35 - r * 0.15), S(y + lookY * r * 0.3 - r * 0.18), S(r * 0.1), 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  if (shut > 0) {
    // the lid comes down from the top
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(S(x), S(y), S(r * 1.05), S(r * 0.9), 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#86BC3E';
    ctx.fillRect(S(x - r * 1.1), S(y - r), S(r * 2.2), S(r * 1.9 * shut));
    ctx.restore();
  }
  // lashes
  ctx.strokeStyle = '#3B5A1A';
  ctx.lineWidth = S(r * 0.09);
  for (const a of [-2.3, -1.9, -1.57, -1.25, -0.85]) {
    ctx.beginPath();
    ctx.moveTo(S(x + Math.cos(a) * r), S(y + Math.sin(a) * r * 0.85));
    ctx.lineTo(S(x + Math.cos(a) * r * 1.35), S(y + Math.sin(a) * r * 1.2));
    ctx.stroke();
  }
}

// a wide pink cap with a lollipop swirl and a curly stem
function swirlShroom(ctx, S, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(S(x - s * 0.13), S(y));
  ctx.bezierCurveTo(S(x - s * 0.5), S(y - s * 0.3), S(x + s * 0.35), S(y - s * 0.4), S(x - s * 0.08), S(y - s * 0.8));
  ctx.lineTo(S(x + s * 0.1), S(y - s * 0.8));
  ctx.bezierCurveTo(S(x + s * 0.55), S(y - s * 0.42), S(x - s * 0.3), S(y - s * 0.3), S(x + s * 0.13), S(y));
  ctx.closePath();
  ctx.fillStyle = '#FBE3F2';
  ctx.fill();
  const cx = x, cy = y - s * 0.78;
  ctx.beginPath();
  ctx.ellipse(S(cx), S(cy), S(s * 0.85), S(s * 0.13), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#C2569B';
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(S(cx), S(cy), S(s * 0.85), S(s * 0.55), 0, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = '#FF8FD8';
  ctx.fill();
  ctx.clip();
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 9; a += 0.15) {
    const r = a / (Math.PI * 9) * s * 0.9;
    const px = cx + Math.cos(a) * r, py = cy - s * 0.22 + Math.sin(a) * r * 0.62;
    a ? ctx.lineTo(S(px), S(py)) : ctx.moveTo(S(px), S(py));
  }
  ctx.strokeStyle = '#FFF0FB';
  ctx.lineWidth = S(s * 0.07);
  ctx.stroke();
  ctx.restore();
}

// a tall purple ink cap with dripping edges
function inkCap(ctx, S, x, y, s) {
  stem(ctx, S, x, y, s * 0.1, s * 0.6, '#EFE6F7');
  const top = y - s * 1.15, bot = y - s * 0.5, w = s * 0.28;
  ctx.beginPath();
  ctx.moveTo(S(x - w), S(bot));
  ctx.bezierCurveTo(S(x - w * 1.15), S(top + s * 0.2), S(x - w * 0.6), S(top), S(x), S(top));
  ctx.bezierCurveTo(S(x + w * 0.6), S(top), S(x + w * 1.15), S(top + s * 0.2), S(x + w), S(bot));
  for (let k = 0; k <= 4; k++) {
    const px = x + w - k / 4 * w * 2;
    ctx.quadraticCurveTo(S(px + w * 0.25), S(bot + s * (k % 2 ? 0.12 : 0.03)), S(px), S(bot));
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, S(top), 0, S(bot + s * 0.1));
  g.addColorStop(0, '#B79BEA');
  g.addColorStop(0.6, '#6A44B5');
  g.addColorStop(1, '#2E1A47');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = S(s * 0.025);
  for (const dx of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(S(x + dx * w), S(top + s * 0.12));
    ctx.lineTo(S(x + dx * w * 1.3), S(bot - s * 0.04));
    ctx.stroke();
  }
}

// a see-through blue jelly mushroom
function jelly(ctx, S, x, y, s) {
  ctx.globalAlpha = 0.85;
  stem(ctx, S, x, y, s * 0.16, s * 0.6, 'rgba(160, 225, 255, 0.75)');
  const cy = y - s * 0.6;
  ctx.beginPath();
  ctx.ellipse(S(x), S(cy), S(s * 0.65), S(s * 0.5), 0, Math.PI, 0);
  ctx.quadraticCurveTo(S(x + s * 0.3), S(cy + s * 0.18), S(x), S(cy + s * 0.06));
  ctx.quadraticCurveTo(S(x - s * 0.3), S(cy + s * 0.18), S(x - s * 0.65), S(cy));
  const g = ctx.createRadialGradient(S(x), S(cy - s * 0.2), 0, S(x), S(cy), S(s * 0.7));
  g.addColorStop(0, 'rgba(200, 245, 255, 0.9)');
  g.addColorStop(1, 'rgba(70, 160, 255, 0.8)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.ellipse(S(x - s * 0.25), S(cy - s * 0.28), S(s * 0.14), S(s * 0.07), -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
}

// three flat caps stacked on one stem, like a little pagoda
function stackShroom(ctx, S, x, y, s) {
  stem(ctx, S, x, y, s * 0.1, s * 1.1, '#F3E3C4');
  [[0.95, 0.5, '#F4A259'], [0.7, 0.38, '#F6BD60'], [0.45, 0.27, '#F7D488']].forEach(([w, h, c], k) => {
    const cy = y - s * (0.45 + k * 0.33);
    ctx.beginPath();
    ctx.ellipse(S(x), S(cy), S(s * w * 0.5), S(s * h * 0.35), 0, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(S(x), S(cy), S(s * w * 0.5), S(s * 0.04), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#B5652A';
    ctx.fill();
  });
}

function puffball(ctx, S, x, y, r) {
  const g = ctx.createRadialGradient(S(x - r * 0.35), S(y - r * 0.4), S(r * 0.1), S(x), S(y), S(r));
  g.addColorStop(0, '#FFFDF4');
  g.addColorStop(1, '#D8C7A6');
  ctx.beginPath();
  ctx.ellipse(S(x), S(y), S(r), S(r * 0.88), 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = 'rgba(140, 110, 70, 0.5)';
  for (const [dx, dy] of [[-0.3, -0.2], [0.25, -0.35], [0.4, 0.1], [-0.1, 0.25], [0.05, -0.05]]) {
    ctx.beginPath();
    ctx.arc(S(x + dx * r), S(y + dy * r), S(r * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- magic things ---------- */

function moon(ctx, S, x, y, r) {
  const halo = ctx.createRadialGradient(S(x), S(y), S(r * 0.5), S(x), S(y), S(r * 2.6));
  halo.addColorStop(0, 'rgba(255, 244, 200, 0.35)');
  halo.addColorStop(1, 'rgba(255, 244, 200, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(S(x - r * 3), S(y - r * 3), S(r * 6), S(r * 6));
  ctx.save();
  ctx.beginPath();
  ctx.rect(S(x - r * 2), S(y - r * 2), S(r * 4), S(r * 4));
  ctx.arc(S(x + r * 0.55), S(y - r * 0.3), S(r * 0.85), 0, Math.PI * 2);
  ctx.clip('evenodd');
  ctx.beginPath();
  ctx.arc(S(x), S(y), S(r), 0, Math.PI * 2);
  ctx.fillStyle = '#FFF1B8';
  ctx.fill();
  ctx.restore();
}

function sparkle(ctx, S, x, y, r, col) {
  ctx.beginPath();
  ctx.moveTo(S(x), S(y - r));
  ctx.quadraticCurveTo(S(x), S(y), S(x + r), S(y));
  ctx.quadraticCurveTo(S(x), S(y), S(x), S(y + r));
  ctx.quadraticCurveTo(S(x), S(y), S(x - r), S(y));
  ctx.quadraticCurveTo(S(x), S(y), S(x), S(y - r));
  ctx.fillStyle = col;
  ctx.fill();
}

function crystals(ctx, S, x, y, s) {
  [[-0.35, 0.7, -0.35, '#9F7BFF'], [0.3, 0.6, 0.3, '#7FE3F2'], [0, 1, 0, '#C9A6FF']].forEach(([dx, h, tilt, c]) => {
    ctx.save();
    ctx.translate(S(x + dx * s), S(y));
    ctx.rotate(tilt);
    const w = s * 0.18, hh = s * h;
    ctx.beginPath();
    ctx.moveTo(S(-w), 0);
    ctx.lineTo(S(-w), S(-hh * 0.75));
    ctx.lineTo(0, S(-hh));
    ctx.lineTo(S(w), S(-hh * 0.75));
    ctx.lineTo(S(w), 0);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(S(-w * 0.2), 0);
    ctx.lineTo(S(-w * 0.2), S(-hh * 0.8));
    ctx.lineTo(0, S(-hh));
    ctx.lineTo(S(w), S(-hh * 0.75));
    ctx.lineTo(S(w), 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
    ctx.restore();
  });
}

function cauldron(ctx, S, { x, y, s }) {
  // fire
  for (const [dx, h, c] of [[-0.35, 0.45, '#FF8A3D'], [0.3, 0.4, '#FF8A3D'], [0, 0.55, '#FFC94D'], [-0.1, 0.3, '#FFF1A8']]) {
    ctx.beginPath();
    ctx.moveTo(S(x + (dx - 0.18) * s), S(y + s * 0.5));
    ctx.quadraticCurveTo(S(x + (dx - 0.1) * s), S(y + s * (0.5 - h * 0.6)), S(x + dx * s), S(y + s * (0.5 - h)));
    ctx.quadraticCurveTo(S(x + (dx + 0.1) * s), S(y + s * (0.5 - h * 0.6)), S(x + (dx + 0.18) * s), S(y + s * 0.5));
    ctx.fillStyle = c;
    ctx.fill();
  }
  // pot
  ctx.beginPath();
  ctx.ellipse(S(x), S(y), S(s * 0.62), S(s * 0.5), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#2B2638';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(S(x - s * 0.25), S(y - s * 0.05), S(s * 0.12), S(s * 0.22), 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  // brew
  const ty = y - s * 0.38;
  const glow = ctx.createRadialGradient(S(x), S(ty), 0, S(x), S(ty), S(s * 1.1));
  glow.addColorStop(0, 'rgba(124, 255, 107, 0.4)');
  glow.addColorStop(1, 'rgba(124, 255, 107, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(S(x - s * 1.2), S(ty - s * 1.2), S(s * 2.4), S(s * 2.4));
  ctx.beginPath();
  ctx.ellipse(S(x), S(ty), S(s * 0.55), S(s * 0.14), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#3A3450';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(S(x), S(ty + s * 0.01), S(s * 0.46), S(s * 0.1), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#7CFF6B';
  ctx.fill();
}

function flask(ctx, S, x, y, s, col) {
  ctx.fillStyle = 'rgba(230, 240, 255, 0.45)';
  ctx.fillRect(S(x - s * 0.13), S(y - s * 1.05), S(s * 0.26), S(s * 0.5));
  ctx.beginPath();
  ctx.arc(S(x), S(y - s * 0.38), S(s * 0.4), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(S(x), S(y - s * 0.38), S(s * 0.34), 0.15, Math.PI - 0.15);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.fillStyle = '#A0703F';
  ctx.fillRect(S(x - s * 0.15), S(y - s * 1.2), S(s * 0.3), S(s * 0.2));
}

// a faint ring of glyphs on the ground around the start and the goal
function runeCircle(ctx, S, p, r, col) {
  ctx.save();
  ctx.strokeStyle = col;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = S(0.3);
  for (const rr of [r, r - 1.2]) {
    ctx.beginPath();
    ctx.arc(S(p.x), S(p.y), S(rr), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, m = r - 0.6;
    const x = p.x + Math.cos(a) * m, y = p.y + Math.sin(a) * m;
    ctx.beginPath();
    if (k % 3 === 0) ctx.arc(S(x), S(y), S(0.3), 0, Math.PI * 2);
    else { ctx.moveTo(S(x - 0.3), S(y - 0.3)); ctx.lineTo(S(x + 0.3), S(y + 0.3)); ctx.moveTo(S(x + 0.3), S(y - 0.3)); ctx.lineTo(S(x), S(y)); }
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- the start and the goal ---------- */

// a toadstool cottage with a door and a round window
function cottage(ctx, S, x, y) {
  const s = 6.2;
  ctx.fillStyle = '#F5E6C8';
  roundRect(ctx, S(x - s * 0.32), S(y - s * 0.25), S(s * 0.64), S(s * 0.62), S(s * 0.14));
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(S(x + s * 0.1), S(y + s * 0.37), S(s * 0.14), S(s * 0.24), 0, Math.PI, 0);
  ctx.fillStyle = '#8A5A3B';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(S(x - s * 0.15), S(y + s * 0.03), S(s * 0.08), 0, Math.PI * 2);
  ctx.fillStyle = '#FFD86B';
  ctx.fill();
  ctx.lineWidth = S(0.25);
  ctx.strokeStyle = '#8A5A3B';
  ctx.stroke();
  agaricCap(ctx, S, x, y - s * 0.22, s * 0.72);
}

// a tall violet mushroom tower with a crystal ball on top
function tower(ctx, S, x, y) {
  const s = 7.2;
  ctx.fillStyle = '#E9DDF7';
  roundRect(ctx, S(x - s * 0.22), S(y - s * 0.15), S(s * 0.44), S(s * 0.55), S(s * 0.1));
  ctx.fill();
  ctx.fillStyle = '#5C3D99';
  for (const dy of [0.02, 0.22]) {
    roundRect(ctx, S(x - s * 0.06), S(y + dy * s), S(s * 0.12), S(s * 0.14), S(s * 0.06));
    ctx.fill();
  }
  const cy = y - s * 0.15;
  ctx.beginPath();
  ctx.ellipse(S(x), S(cy), S(s * 0.55), S(s * 0.1), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#4A2C82';
  ctx.fill();
  // a tall pointed cap, like a wizard's hat
  ctx.beginPath();
  ctx.moveTo(S(x - s * 0.55), S(cy));
  ctx.quadraticCurveTo(S(x - s * 0.25), S(cy - s * 0.25), S(x - s * 0.05), S(cy - s * 0.62));
  ctx.lineTo(S(x + s * 0.05), S(cy - s * 0.62));
  ctx.quadraticCurveTo(S(x + s * 0.25), S(cy - s * 0.25), S(x + s * 0.55), S(cy));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, S(cy - s * 0.6), 0, S(cy));
  g.addColorStop(0, '#B388FF');
  g.addColorStop(1, '#6A3FC2');
  ctx.fillStyle = g;
  ctx.fill();
  for (const [dx, dy, r] of [[-0.26, -0.1, 0.07], [0.18, -0.2, 0.06], [0, -0.4, 0.05]]) sparkle(ctx, S, x + dx * s, cy + dy * s, r * s * 1.4, '#FFE27A');
  // the crystal ball
  const by = cy - s * 0.72;
  const glow = ctx.createRadialGradient(S(x), S(by), 0, S(x), S(by), S(s * 0.5));
  glow.addColorStop(0, 'rgba(127, 242, 212, 0.7)');
  glow.addColorStop(1, 'rgba(127, 242, 212, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(S(x - s * 0.6), S(by - s * 0.6), S(s * 1.2), S(s * 1.2));
  ctx.beginPath();
  ctx.arc(S(x), S(by), S(s * 0.16), 0, Math.PI * 2);
  ctx.fillStyle = '#9FFFE6';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(S(x - s * 0.05), S(by - s * 0.05), S(s * 0.05), 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

export default {
  hideIcons: ['slide'],
  // what flies up when a pawn lands: a puff of spores
  fx: { land: ['#C9A6FF', '#7FF2D4', '#FFE9A8'], kind: 'puff', trail: '#C9A6FF' },
  page: { top: '#2E1F57', bottom: '#8F6CC7', ink: '#F4ECFF', accent: '#7FF2D4', dark: true },

  background(ctx, S, map) {
    const g = ctx.createRadialGradient(S(50), S(50), S(8), S(50), S(50), S(78));
    g.addColorStop(0, '#3D2F72');
    g.addColorStop(0.6, '#2A2156');
    g.addColorStop(1, '#151233');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, S(100), S(100), S(3));
    ctx.fill();
    ctx.save();
    roundRect(ctx, 0, 0, S(100), S(100), S(3));
    ctx.clip();
    // misty glows
    for (const [x, y, r, c] of [[22, 75, 30, '127,242,212'], [75, 25, 30, '201,166,255'], [25, 25, 22, '255,143,216'], [78, 80, 24, '124,255,107']]) {
      const n = ctx.createRadialGradient(S(x), S(y), 0, S(x), S(y), S(r));
      n.addColorStop(0, `rgba(${c},0.16)`);
      n.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = n;
      ctx.fillRect(0, 0, S(100), S(100));
    }
    const rnd = seeded(41);
    // moss patches
    for (let k = 0; k < 40; k++) {
      ctx.beginPath();
      ctx.ellipse(S(rnd() * 100), S(rnd() * 100), S(2 + rnd() * 5), S(1 + rnd() * 2), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = ['rgba(60,140,110,0.22)', 'rgba(90,70,160,0.25)', 'rgba(40,100,90,0.2)'][k % 3];
      ctx.fill();
    }
    // stars in the sky corners
    for (let k = 0; k < 40; k++) {
      const x = rnd() * 100, y = rnd() * 100;
      if (x + y > 60 && x + y < 140) continue;
      ctx.beginPath();
      ctx.arc(S(x), S(y), S(0.12 + rnd() * 0.25), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.5})`;
      ctx.fill();
    }
    runeCircle(ctx, S, map.cells[0], 8, '#7FF2D4');
    runeCircle(ctx, S, map.cells[map.goal], 8, '#C9A6FF');

    // little mushrooms wherever the trail leaves room
    const free = (x, y, d) => map.cells.every(c => Math.hypot(c.x - x, c.y - y) > d)
      && Math.hypot(x - 23, y - 32) > 14 && Math.hypot(x - 64, y - 78) > 12 && Math.hypot(x - CAULDRON.x, y - CAULDRON.y) > 8;
    for (let k = 0; k < 90; k++) {
      const x = 3 + rnd() * 94, y = 4 + rnd() * 93, s = 1.6 + rnd() * 1.4, kind = rnd();
      if (!free(x, y - s * 0.5, 4.2 + s * 0.6)) continue;
      if (kind < 0.35) agaric(ctx, S, x, y, s);
      else if (kind < 0.55) agaric(ctx, S, x, y, s, ['#D9B38C', '#8A5A3B']);
      else if (kind < 0.75) glowStalk(ctx, S, x, y, s * 1.6, 'rgba(127,242,212,1)');
      else if (kind < 0.88) puffball(ctx, S, x, y - s * 0.3, s * 0.45);
      else sparkle(ctx, S, x, y - s, s * 0.5, 'rgba(255, 233, 168, 0.8)');
    }

    // the top-left glade
    moon(ctx, S, 10, 10, 4.2);
    for (const [x, y, r] of [[20, 6, 1], [33, 4.5, 0.7], [4, 22, 0.8], [47, 5, 0.9]]) sparkle(ctx, S, x, y, r, '#FFF1B8');
    crystals(ctx, S, 31, 14, 5);
    agaric(ctx, S, 23, 41, 13);
    eyeShroom(ctx, S, EYE);
    stackShroom(ctx, S, 7, 31, 6);
    for (const [x, y, h] of GLOWS) glowStalk(ctx, S, x, y, h, x > 90 ? 'rgba(255,143,216,1)' : 'rgba(127,242,212,1)');

    // the bottom-right glade
    swirlShroom(ctx, S, 63, 85, 11);
    jelly(ctx, S, 74, 67, 6);
    inkCap(ctx, S, 90, 79, 9);
    inkCap(ctx, S, 84.5, 74, 6.5);
    cauldron(ctx, S, CAULDRON);
    flask(ctx, S, 92, 95, 3.4, '#FF8FD8');
    flask(ctx, S, 70, 96, 2.8, '#7FE3F2');
    puffball(ctx, S, 57, 95, 1.6);
    puffball(ctx, S, 54.5, 96, 1);
    ctx.restore();
  },

  road(ctx, S, map) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    routePath(ctx, S, map);
    ctx.strokeStyle = '#1A1233';
    ctx.lineWidth = S(7.8);
    ctx.stroke();
    routePath(ctx, S, map);
    ctx.strokeStyle = '#4B3678';
    ctx.lineWidth = S(6.4);
    ctx.stroke();
    // glowing threads of mycelium along the trail
    ctx.save();
    ctx.shadowColor = '#7FF2D4';
    ctx.shadowBlur = S(1.2);
    routePath(ctx, S, map);
    ctx.strokeStyle = 'rgba(127, 242, 212, 0.55)';
    ctx.lineWidth = S(0.35);
    ctx.setLineDash([S(0.4), S(1.2)]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },

  // each cell is a mushroom cap seen from above
  cell(ctx, S, p, i, special) {
    const g = ctx.createRadialGradient(S(p.x - 0.8), S(p.y - 0.9), S(0.4), S(p.x), S(p.y), S(CELL_R));
    g.addColorStop(0, special ? '#FBF4FF' : '#FFF6E6');
    g.addColorStop(1, special ? '#DCC4FA' : '#EBCFAE');
    ctx.beginPath();
    ctx.arc(S(p.x), S(p.y), S(CELL_R), 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = S(0.45);
    ctx.strokeStyle = special ? '#8E5CD6' : '#8C5E3C';
    ctx.stroke();
    if (special) return;
    ctx.fillStyle = 'rgba(200, 150, 110, 0.55)';
    for (const a of [3.6, 5.5, 1.2]) {
      ctx.beginPath();
      ctx.arc(S(p.x + Math.cos(a + i) * 2.15), S(p.y + Math.sin(a + i) * 2.15), S(0.32), 0, Math.PI * 2);
      ctx.fill();
    }
    text(ctx, String(i), S(p.x), S(p.y) + S(0.1), S(2.2), '#6B3F2A');
  },

  // shelf fungi growing up a mossy stalk, like stairs
  ladder(ctx, S, curve) {
    ctx.lineCap = 'round';
    curvePath(ctx, S, curve);
    ctx.strokeStyle = '#3A2A1E';
    ctx.lineWidth = S(1.4);
    ctx.stroke();
    curvePath(ctx, S, curve);
    ctx.strokeStyle = '#6E8F4E';
    ctx.lineWidth = S(0.8);
    ctx.stroke();
    let side = 1;
    for (let t = 0.14; t < 0.88; t += 0.1) {
      const p = onCurve(curve, t), q = onCurve(curve, t + 0.01);
      const ang = Math.atan2(q.y - p.y, q.x - p.x);
      ctx.save();
      ctx.translate(S(p.x), S(p.y));
      ctx.rotate(ang + (side > 0 ? Math.PI / 2 : -Math.PI / 2));
      ctx.beginPath();
      ctx.ellipse(S(0.5), 0, S(1.5), S(0.95), 0, -Math.PI / 2, Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = '#F4A259';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(S(0.5), 0, S(1.05), S(0.62), 0, -Math.PI / 2, Math.PI / 2);
      ctx.strokeStyle = '#FFD9A0';
      ctx.lineWidth = S(0.25);
      ctx.stroke();
      ctx.restore();
      side = -side;
    }
  },

  // a fuzzy caterpillar: round segments, little feet
  slide(ctx, S, curve, k) {
    const cols = CATERPILLARS[k % CATERPILLARS.length];
    const n = 40;
    const pts = [];
    for (let s = 0; s <= n; s++) {
      const t = s / n;
      const p = onCurve(curve, t), q = onCurve(curve, Math.min(1, t + 0.01));
      const nx = -(q.y - p.y), ny = q.x - p.x, l = Math.hypot(nx, ny) || 1;
      const w = Math.sin(t * Math.PI * 4) * 0.7;
      pts.push({ x: p.x + nx / l * w, y: p.y + ny / l * w, nx: nx / l, ny: ny / l, r: 1.45 - t * 0.5 });
    }
    // feet first, so the body covers their tops
    for (let s = 2; s < pts.length; s += 2) {
      const p = pts[s];
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(S(p.x + p.nx * side * p.r), S(p.y + p.ny * side * p.r), S(0.32), 0, Math.PI * 2);
        ctx.fillStyle = '#3B2A50';
        ctx.fill();
      }
    }
    for (let s = pts.length - 1; s >= 0; s -= 2) {
      const p = pts[s];
      ctx.beginPath();
      ctx.arc(S(p.x), S(p.y), S(p.r), 0, Math.PI * 2);
      ctx.fillStyle = (s / 2) % 2 ? cols[1] : cols[0];
      ctx.fill();
      ctx.lineWidth = S(0.18);
      ctx.strokeStyle = 'rgba(40, 20, 60, 0.35)';
      ctx.stroke();
    }
  },

  // drawn over the cells: stair arrowheads and caterpillar heads
  top(ctx, S, curve, kind, k) {
    if (kind === 'ladder') { arrowHead(ctx, S, curve, 2, '#FFD36E'); return; }
    const cols = CATERPILLARS[k % CATERPILLARS.length];
    const h = curve.a;
    // antennae
    ctx.strokeStyle = '#3B2A50';
    ctx.lineWidth = S(0.3);
    for (const dx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(S(h.x + dx * 0.7), S(h.y - 1.5));
      ctx.quadraticCurveTo(S(h.x + dx * 1.1), S(h.y - 3), S(h.x + dx * 1.9), S(h.y - 3.1));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(S(h.x + dx * 1.9), S(h.y - 3.1), S(0.45), 0, Math.PI * 2);
      ctx.fillStyle = '#FFE27A';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(S(h.x), S(h.y), S(2.2), 0, Math.PI * 2);
    ctx.fillStyle = cols[0];
    ctx.fill();
    ctx.lineWidth = S(0.3);
    ctx.strokeStyle = 'rgba(40, 20, 60, 0.45)';
    ctx.stroke();
    for (const dx of [-0.8, 0.8]) {
      ctx.beginPath();
      ctx.arc(S(h.x + dx), S(h.y - 0.4), S(0.6), 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(S(h.x + dx), S(h.y - 0.3), S(0.3), 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(S(h.x), S(h.y + 0.5), S(0.75), 0.2, Math.PI - 0.2);
    ctx.strokeStyle = '#3B2A50';
    ctx.lineWidth = S(0.25);
    ctx.stroke();
    for (const dx of [-1.35, 1.35]) {
      ctx.beginPath();
      ctx.arc(S(h.x + dx), S(h.y + 0.55), S(0.35), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 120, 160, 0.6)';
      ctx.fill();
    }
  },

  // a fairy ring: tiny mushrooms in a circle, caps in the pair's colour
  portal(ctx, S, p, colour) {
    ctx.save();
    ctx.shadowColor = colour;
    ctx.shadowBlur = S(1.5);
    ctx.beginPath();
    ctx.arc(S(p.x), S(p.y), S(CELL_R + 0.25), 0, Math.PI * 2);
    ctx.lineWidth = S(0.35);
    ctx.strokeStyle = colour;
    ctx.stroke();
    ctx.restore();
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2 + 0.2;
      const x = p.x + Math.cos(a) * (CELL_R + 0.9), y = p.y + Math.sin(a) * (CELL_R + 0.9);
      ctx.fillStyle = '#F7EEDC';
      ctx.fillRect(S(x - 0.15), S(y - 0.1), S(0.3), S(0.55));
      ctx.beginPath();
      ctx.ellipse(S(x), S(y), S(0.6), S(0.45), 0, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(S(x - 0.15), S(y - 0.2), S(0.12), 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  },

  ends(ctx, S, map) {
    for (const [i, col] of [[0, '#7FF2D4'], [map.goal, '#C9A6FF']]) {
      const p = map.cells[i];
      const away = map.cells[i ? i - 1 : 1];
      // the trail curls tightly into the middle, so nudge the art away from the next cell
      const d = Math.hypot(p.x - away.x, p.y - away.y) || 1;
      const ax = p.x + (p.x - away.x) / d * 0.6, ay = p.y + (p.y - away.y) / d * 0.6;
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = S(3);
      ctx.beginPath();
      ctx.arc(S(ax), S(ay), S(4.4), 0, Math.PI * 2);
      ctx.fillStyle = '#2C2160';
      ctx.fill();
      ctx.lineWidth = S(0.7);
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.restore();
      if (i) tower(ctx, S, ax, ay + 0.6);
      else cottage(ctx, S, ax, ay + 0.2);
    }
    // the cells next door sit on top of the pads
    this.cell(ctx, S, map.cells[1], 1, false);
    this.cell(ctx, S, map.cells[map.goal - 1], map.goal - 1, false);
  },

  // drifting glowing spores, the watching eye, cauldron bubbles, pulsing glow stalks
  ambient(ctx, S, time) {
    const rnd = seeded(9);
    for (let k = 0; k < 26; k++) {
      const x0 = rnd() * 100, sp = 1.5 + rnd() * 2.5, ph = rnd() * 100;
      const y = 100 - ((time * sp + ph * 1.7) % 104);
      const x = x0 + Math.sin(time * 0.6 + k) * 2;
      const a = 0.3 + 0.35 * Math.sin(time * 2 + k * 1.3);
      ctx.beginPath();
      ctx.arc(S(x), S(y), S(0.35 + (k % 3) * 0.12), 0, Math.PI * 2);
      ctx.fillStyle = [`rgba(127,242,212,${a})`, `rgba(201,166,255,${a})`, `rgba(255,233,168,${a})`][k % 3];
      ctx.fill();
    }
    for (const [x, y, h] of GLOWS) {
      const a = 0.12 + 0.12 * Math.sin(time * 1.8 + x);
      const top = { x: x + h * 0.12, y: y - h };
      const g = ctx.createRadialGradient(S(top.x), S(top.y), 0, S(top.x), S(top.y), S(h * 0.45));
      g.addColorStop(0, `rgba(220, 255, 245, ${a})`);
      g.addColorStop(1, 'rgba(220, 255, 245, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(S(top.x - h * 0.5), S(top.y - h * 0.5), S(h), S(h));
    }
    // the eye looks around and blinks every few seconds
    const cy = EYE.y - EYE.s * 0.97, r = EYE.s * 0.27;
    const blink = time % 4.3, shut = blink < 0.18 ? Math.sin(blink / 0.18 * Math.PI) : 0;
    eye(ctx, S, EYE.x, cy, r, Math.sin(time * 0.7) * 0.9, Math.sin(time * 0.43) * 0.5, shut);
    // bubbles from the cauldron
    for (let k = 0; k < 5; k++) {
      const t = (time * 0.5 + k / 5) % 1;
      const x = CAULDRON.x + Math.sin(k * 2.1 + time) * 2 * (1 - t * 0.5), y = CAULDRON.y - CAULDRON.s * 0.4 - t * 9;
      ctx.beginPath();
      ctx.arc(S(x), S(y), S(0.4 + (1 - t) * 0.5), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(160, 255, 140, ${0.8 * (1 - t)})`;
      ctx.lineWidth = S(0.18);
      ctx.stroke();
    }
  }
};
