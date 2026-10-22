// Painting the board each frame from the game being shown (main.js keeps a
// copy that catches up with the real game one animation at a time).

import { SIDE } from '../config.js';
import { itemById } from '../data/items.js';
import { landing, xy } from '../core/board.js';
import { THEMES, drawIce, drawVent, drawPortal, drawHole } from './themes.js';
import { drawStone, drawShield } from './stones.js';
import { drawIcon, rockShape, snowflake } from './icons.js';
import { drawFx } from './fx.js';

export const W = 760;   // the board is W × W board units

export function layout(n) {
  const cell = W / (n + 0.9);
  const pad = (W - (n - 1) * cell) / 2;
  return {
    W, n, cell, pad,
    pos: i => [pad + (i % n) * cell, pad + ((i / n) | 0) * cell],
    // the spot nearest to a point, or -1 when it's off the grid
    hit(x, y) {
      const cx = Math.round((x - pad) / cell), cy = Math.round((y - pad) / cell);
      if (cx < 0 || cy < 0 || cx >= n || cy >= n) return -1;
      const [px, py] = [pad + cx * cell, pad + cy * cell];
      return Math.hypot(x - px, y - py) < cell * 0.62 ? cy * n + cx : -1;
    }
  };
}

// ---------- the painted surface, cached per size ----------

const surfaces = new Map();
function surface(theme, L, px) {
  const size = Math.round(W * px);
  const key = `${theme}|${L.n}|${size}`;
  let cv = surfaces.get(key);
  if (cv) return cv;
  if (surfaces.size > 8) surfaces.clear();
  cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.scale(px, px);
  THEMES[theme].surface(ctx, L);
  surfaces.set(key, cv);
  return cv;
}

export function paintBoardThumb(cv, theme) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 120, h = cv.clientHeight || 68;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  const k = Math.max(cv.width, cv.height) / W;
  const L = layout(9);
  ctx.save();
  ctx.translate((cv.width - W * k) / 2, (cv.height - W * k) / 2);
  ctx.scale(k, k);
  THEMES[theme].surface(ctx, L);
  grid(ctx, L, THEMES[theme]);
  const sample = {
    garden: [[2, 2, 'gift'], [6, 3, 'gift'], [4, 6, 'gift']],
    ice: [[2, 2, 'ice'], [3, 2, 'ice'], [4, 2, 'ice'], [4, 6, 'ice2'], [5, 6, 'ice2'], [6, 6, 'ice2']],
    volcano: [[2, 3, 'vent'], [6, 5, 'vent']],
    space: [[2, 2, 'portal'], [6, 6, 'portal'], [6, 2, 'hole'], [2, 6, 'hole']]
  }[theme];
  for (const [x, y, what] of sample) {
    const [px, py] = L.pos(y * 9 + x), c = L.cell;
    if (what === 'gift') drawIcon(ctx, 'gift', px, py, c * 0.36);
    else if (what === 'ice' || what === 'ice2') drawIce(ctx, px, py, c, what === 'ice' ? 0 : 2, 0);
    else if (what === 'vent') drawVent(ctx, px, py, c, 0);
    else if (what === 'portal') drawPortal(ctx, px, py, c, 0, 0);
    else if (what === 'hole') drawHole(ctx, px, py, c, 0);
  }
  ctx.restore();
}

function grid(ctx, L, th) {
  const { n, cell, pad } = L, end = pad + (n - 1) * cell;
  ctx.strokeStyle = th.line; ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const v = pad + k * cell;
    ctx.moveTo(pad, v); ctx.lineTo(end, v);
    ctx.moveTo(v, pad); ctx.lineTo(v, end);
  }
  ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeRect(pad, pad, end - pad, end - pad);
  // star points
  const m = (n - 1) / 2, q = 3;
  ctx.fillStyle = th.dot;
  for (const [x, y] of [[m, m], [q, q], [n - 1 - q, q], [q, n - 1 - q], [n - 1 - q, n - 1 - q]]) {
    ctx.beginPath(); ctx.arc(pad + x * cell, pad + y * cell, cell * 0.08, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- one frame ----------

const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const back = k => { k = Math.min(1, Math.max(0, k)); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

// view: { scale, t, fx, d (the game being shown), L, pals, theme,
//         ghostAt (spot under the pointer, or -1), pending (spot tapped once),
//         aim (the item being aimed, or null) and aimTargets (where it can go),
//         hints (spots to warn about), pops (spot → time a stone landed),
//         hide (things not to draw yet), moving (sliding stones),
//         over (time the game ended, or 0), hot (vents about to erupt) }
export function render(ctx, v) {
  const { d, L, t } = v, c = L.cell, th = THEMES[v.theme];
  ctx.save();
  if (v.fx.shake > 0) ctx.translate((Math.random() - 0.5) * v.fx.shake * 18, (Math.random() - 0.5) * v.fx.shake * 18);
  ctx.drawImage(surface(v.theme, L, v.scale), 0, 0, W, W);

  const N = d.stone.length;
  // under the grid: ice, scorched craters, cooling lava
  for (let i = 0; i < N; i++) {
    const tr = d.terrain[i];
    if (tr && tr.t === 'ice') { const [x, y] = L.pos(i); drawIce(ctx, x, y, c, tr.dir, t); }
  }
  for (let i = 0; i < N; i++) {
    if (!d.block[i]) continue;
    const [x, y] = L.pos(i);
    if (d.blockKind[i] === 'lava') {
      const g = ctx.createRadialGradient(x, y, 1, x, y, c * 0.48);
      const pulse = 0.85 + Math.sin(t * 5 + i) * 0.15;
      g.addColorStop(0, `rgba(255,220,120,${pulse})`); g.addColorStop(0.5, '#FF6A2D'); g.addColorStop(1, 'rgba(160,30,10,.0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, c * 0.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(40,25,25,.45)';
      ctx.beginPath(); ctx.ellipse(x, y, c * 0.4, c * 0.34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(40,25,25,.5)'; ctx.lineWidth = 2;
      for (let k = 0; k < 5; k++) {
        const a = k * 1.26 + i;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * c * 0.35, y + Math.sin(a) * c * 0.3); ctx.lineTo(x + Math.cos(a) * c * 0.5, y + Math.sin(a) * c * 0.44); ctx.stroke();
      }
    }
    countdown(ctx, x + c * 0.3, y + c * 0.3, d.block[i], c);
  }
  grid(ctx, L, th);

  // frost
  for (let i = 0; i < N; i++) {
    if (!d.frost[i]) continue;
    const [x, y] = L.pos(i);
    ctx.fillStyle = 'rgba(200,240,255,.62)';
    ctx.beginPath(); ctx.roundRect(x - c * 0.47, y - c * 0.47, c * 0.94, c * 0.94, c * 0.15); ctx.fill();
    const who = d.frostFor[i];
    ctx.strokeStyle = who === 2 ? '#7CC8F0' : SIDE[who]; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 0.6; snowflake(ctx, c * 0.28, '#5BA8D6'); ctx.restore();
  }

  // special spots and things on the board
  for (let i = 0; i < N; i++) {
    const tr = d.terrain[i], [x, y] = L.pos(i);
    if (tr && tr.t === 'vent') drawVent(ctx, x, y, c, t, v.hot);
    else if (tr && tr.t === 'portal') drawPortal(ctx, x, y, c, tr.pair, t);
    else if (tr && tr.t === 'hole') drawHole(ctx, x, y, c, t);
    if (d.rock[i] && !v.hide.has('r' + i)) { ctx.save(); ctx.translate(x, y + c * 0.04); rockShape(ctx, c * 0.5); ctx.restore(); }
    if (d.gift[i] && !v.hide.has('g' + i)) {
      const bob = Math.sin(t * 3 + i * 0.7) * c * 0.04;
      ctx.fillStyle = 'rgba(40,20,40,.18)';
      ctx.beginPath(); ctx.ellipse(x, y + c * 0.3, c * 0.26, c * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      drawIcon(ctx, 'gift', x, y + bob, c * 0.34);
    }
  }

  // danger: spots where the other player could win next move
  for (const i of v.hints) {
    const [x, y] = L.pos(i), k = 0.5 + Math.sin(t * 6) * 0.5;
    ctx.beginPath(); ctx.arc(x, y, c * (0.36 + k * 0.06), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,60,60,${0.12 + k * 0.1})`; ctx.fill();
    ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#FF3B3B'; ctx.font = `800 ${c * 0.42}px 'Baloo 2', system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, y + c * 0.03);
  }

  // stones
  const r = c * 0.45;
  for (let i = 0; i < N; i++) {
    const p = d.stone[i];
    if (p < 0 || v.hide.has(i)) continue;
    let [x, y] = L.pos(i);
    let size = 1, lift = 0, mood = null;
    const born = v.pops.get(i);
    if (born !== undefined) size = back((t - born) / 0.32);
    if (v.over) {
      mood = d.winner === p ? 'happy' : d.winner === 'draw' ? null : 'sad';
      if (d.line && d.line.includes(i)) lift = Math.abs(Math.sin(t * 7 + d.line.indexOf(i) * 0.6)) * c * 0.18;
    }
    if (v.aim && v.aimTargets.has(i) && v.aim.target !== 'any') { mood = mood || (v.aim.target === 'mine' ? 'happy' : 'sad'); }
    drawStone(ctx, x, y, { pal: v.pals[p], p, mood, r: r * size, px: v.scale, lift });
    if (d.shield[i]) drawShield(ctx, x, y - lift, r * size, t);
  }
  // stones on the move (sliding on ice)
  for (const m of v.moving) {
    const k = ease((t - m.start) / m.dur), seg = m.pts.length - 1;
    const pos = k * seg, j = Math.min(seg - 1, Math.floor(pos)), u = pos - j;
    const [a, b] = [m.pts[j], m.pts[j + 1]];
    drawStone(ctx, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, { pal: v.pals[m.p], p: m.p, r, px: v.scale });
  }
  // win line
  if (v.over && d.line) {
    const [a, b] = [L.pos(d.line[0]), L.pos(d.line[d.line.length - 1])];
    const k = ease((t - v.over) / 0.6);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = c * 0.22; ctx.stroke();
    ctx.strokeStyle = '#FFC21A'; ctx.lineWidth = c * 0.12; ctx.stroke();
    ctx.restore();
  }
  // last stone played
  if (d.last >= 0 && d.stone[d.last] >= 0 && !v.over && !v.hide.has(d.last)) {
    const [x, y] = L.pos(d.last);
    ctx.beginPath(); ctx.arc(x, y, r * 1.12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.stroke();
  }

  if (v.aim) aimLayer(ctx, v, r);
  else if (v.ghostAt >= 0) ghost(ctx, v, r);

  drawFx(ctx, v.fx, t);
  ctx.restore();
}

function countdown(ctx, x, y, n, c) {
  ctx.beginPath(); ctx.arc(x, y, c * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = 'rgba(59,35,64,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#3B2340'; ctx.font = `800 ${c * 0.22}px 'Baloo 2', system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(n, x, y + 1);
}

// where your stone would go: the spot, its slide on the ice and its portal twin
function ghost(ctx, v, r) {
  const { d, L, t } = v, p = d.turn, i = v.ghostAt;
  const { to, path, twin } = landing(d, i, p);
  const sure = v.pending === i;
  if (path.length > 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; ctx.setLineDash([2, 8]); ctx.lineCap = 'round';
    ctx.lineDashOffset = -t * 30;
    ctx.beginPath();
    for (const j of path) { const [x, y] = L.pos(j); ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.restore();
    const [x, y] = L.pos(i);
    ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); ctx.fillStyle = SIDE[p]; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
  }
  const [x, y] = L.pos(to);
  drawStone(ctx, x, y, { pal: v.pals[p], p, r, px: v.scale, alpha: sure ? 0.85 : 0.55, ghost: true });
  if (sure) {
    ctx.beginPath(); ctx.arc(x, y, r * (1.2 + Math.sin(t * 8) * 0.06), 0, Math.PI * 2);
    ctx.strokeStyle = SIDE[p]; ctx.lineWidth = 4; ctx.stroke();
  }
  if (twin >= 0) {
    const [tx, ty] = L.pos(twin);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.setLineDash([3, 9]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.restore();
    drawStone(ctx, tx, ty, { pal: v.pals[p], p, r, px: v.scale, alpha: 0.5, ghost: true });
  }
}

// aiming an item: every spot it can go on glows; the one under the pointer shows what will happen
function aimLayer(ctx, v, r) {
  const { L, t, aim } = v, c = L.cell, col = itemById(aim.id).color;
  if (aim.target !== 'any') {
    for (const i of v.aimTargets) {
      const [x, y] = L.pos(i);
      ctx.beginPath(); ctx.arc(x, y, r * (1.15 + Math.sin(t * 6 + i) * 0.05), 0, Math.PI * 2);
      ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.stroke();
    }
  }
  const i = v.ghostAt;
  if (i < 0 || !v.aimTargets.has(i)) return;
  const [x, y] = L.pos(i);
  ctx.save();
  if (aim.id === 'freeze') {
    const [cx, cy] = xy(v.d, i);
    const x0 = Math.max(0, cx - 1), y0 = Math.max(0, cy - 1), x1 = Math.min(L.n - 1, cx + 1), y1 = Math.min(L.n - 1, cy + 1);
    ctx.fillStyle = 'rgba(160,225,255,.45)'; ctx.strokeStyle = '#5BC8FF'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(L.pad + (x0 - 0.5) * c, L.pad + (y0 - 0.5) * c, (x1 - x0 + 1) * c, (y1 - y0 + 1) * c, c * 0.2);
    ctx.fill(); ctx.stroke();
    ctx.translate(x, y); snowflake(ctx, c * 0.4);
  } else if (aim.id === 'rock') {
    ctx.globalAlpha = 0.6; ctx.translate(x, y); rockShape(ctx, c * 0.5);
  } else if (aim.id === 'shield') {
    drawShield(ctx, x, y, r, t);
  } else {
    // bomb and paint: crosshair on the stone
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const rr = r * 1.25;
    ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + t;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rr * 0.75, y + Math.sin(a) * rr * 0.75); ctx.lineTo(x + Math.cos(a) * rr * 1.3, y + Math.sin(a) * rr * 1.3); ctx.stroke();
    }
    drawIcon(ctx, aim.id, x + r * 0.9, y - r * 0.9, r * 0.6);
  }
  ctx.restore();
}
