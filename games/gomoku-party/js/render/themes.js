// How each board looks: the page colours, the board surface and its grid,
// and the special spots (ice, vents, portals, black holes). The surface is
// painted once into a canvas per size; the moving bits are drawn each frame.

import { DIRS } from '../core/board.js';
import { star } from './icons.js';

// a little seeded random for decorations, so they don't jump between frames
function deco(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

function flower(ctx, x, y, r, petal, middle) {
  ctx.fillStyle = petal;
  for (let k = 0; k < 5; k++) {
    const a = k * Math.PI * 2 / 5;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, Math.PI * 2); ctx.fillStyle = middle; ctx.fill();
}

export const THEMES = {
  garden: {
    page: ['#9FDBFF', '#C8F2B5'], dark: false,
    line: 'rgba(110,70,30,.62)', dot: '#7A4C22',
    surface(ctx, L) {
      const W = L.W, rnd = deco(3);
      // grass all around, wooden board in the middle
      ctx.fillStyle = '#8BD36A'; roundRect(ctx, 0, 0, W, W, 30); ctx.fill();
      for (let k = 0; k < 260; k++) {
        const x = rnd() * W, y = rnd() * W;
        ctx.strokeStyle = rnd() < 0.5 ? '#76C255' : '#A2E07F'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 6, y - 7); ctx.stroke();
      }
      const b = L.pad - L.cell * 0.62;
      ctx.fillStyle = 'rgba(60,90,30,.35)'; roundRect(ctx, b + 4, b + 8, W - b * 2, W - b * 2, 22); ctx.fill();
      const g = ctx.createLinearGradient(0, b, 0, W - b);
      g.addColorStop(0, '#F8D9A0'); g.addColorStop(1, '#EDBF7A');
      ctx.fillStyle = g; roundRect(ctx, b, b, W - b * 2, W - b * 2, 22); ctx.fill();
      ctx.save(); ctx.clip();
      for (let k = 0; k < 30; k++) {
        const y = b + rnd() * (W - b * 2);
        ctx.strokeStyle = `rgba(170,110,50,${0.06 + rnd() * 0.08})`; ctx.lineWidth = 1 + rnd() * 3;
        ctx.beginPath(); ctx.moveTo(b, y);
        ctx.bezierCurveTo(W * 0.3, y + (rnd() - 0.5) * 20, W * 0.7, y + (rnd() - 0.5) * 20, W - b, y + (rnd() - 0.5) * 10);
        ctx.stroke();
      }
      ctx.restore();
      ctx.lineWidth = 5; ctx.strokeStyle = '#C48A4A'; roundRect(ctx, b, b, W - b * 2, W - b * 2, 22); ctx.stroke();
      // flowers in the grass
      const cols = [['#FF8AA6', '#FFD23F'], ['#FFFFFF', '#FFC21A'], ['#B98CFF', '#FFF3B0'], ['#FFD23F', '#FF8A3D']];
      for (let k = 0; k < 26; k++) {
        const edge = Math.floor(rnd() * 4), along = 20 + rnd() * (W - 40), off = 6 + rnd() * Math.max(4, b - 16);
        const [x, y] = [[along, off], [W - off, along], [along, W - off], [off, along]][edge];
        const [petal, mid] = cols[Math.floor(rnd() * cols.length)];
        flower(ctx, x, y, 5 + rnd() * 4, petal, mid);
      }
    }
  },

  ice: {
    page: ['#BFE6FF', '#F2FAFF'], dark: false,
    line: 'rgba(40,95,150,.45)', dot: '#2C6FA6',
    surface(ctx, L) {
      const W = L.W, rnd = deco(5);
      const g = ctx.createLinearGradient(0, 0, W, W);
      g.addColorStop(0, '#E9F7FF'); g.addColorStop(0.5, '#CBEAFB'); g.addColorStop(1, '#E2F4FF');
      ctx.fillStyle = g; roundRect(ctx, 0, 0, W, W, 30); ctx.fill();
      // frosty cracks and sparkles
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 18; k++) {
        let x = rnd() * W, y = rnd() * W;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let j = 0; j < 4; j++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      for (let k = 0; k < 40; k++) star(ctx, rnd() * W, rnd() * W, 2 + rnd() * 3, 'rgba(255,255,255,.9)');
      // snowy rim
      ctx.lineWidth = 14; ctx.strokeStyle = '#fff'; roundRect(ctx, 7, 7, W - 14, W - 14, 26); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#A9D4F0'; roundRect(ctx, 15, 15, W - 30, W - 30, 20); ctx.stroke();
    }
  },

  volcano: {
    page: ['#4A1E24', '#1E1418'], dark: true,
    line: 'rgba(255,170,120,.42)', dot: '#FF8A4C',
    surface(ctx, L) {
      const W = L.W, rnd = deco(9);
      const g = ctx.createRadialGradient(W / 2, W / 2, W * 0.1, W / 2, W / 2, W * 0.75);
      g.addColorStop(0, '#4A3A40'); g.addColorStop(1, '#2A2026');
      ctx.fillStyle = g; roundRect(ctx, 0, 0, W, W, 30); ctx.fill();
      // basalt tiles
      for (let k = 0; k < 70; k++) {
        const x = rnd() * W, y = rnd() * W, r = 10 + rnd() * 26;
        ctx.fillStyle = `rgba(${rnd() < 0.5 ? '20,14,18' : '90,74,80'},${0.15 + rnd() * 0.15})`;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) { const a = j * Math.PI / 3 + rnd() * 0.4; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        ctx.fill();
      }
      // glowing cracks
      for (const [w, c] of [[6, 'rgba(255,90,30,.25)'], [2, 'rgba(255,170,60,.8)']]) {
        const r2 = deco(11);
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let k = 0; k < 10; k++) {
          let x = r2() * W, y = r2() * W;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let j = 0; j < 3; j++) { x += (r2() - 0.5) * 70; y += (r2() - 0.5) * 70; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      ctx.lineWidth = 8; ctx.strokeStyle = '#1A1014'; roundRect(ctx, 4, 4, W - 8, W - 8, 28); ctx.stroke();
    }
  },

  space: {
    page: ['#1B1F4B', '#0B0D22'], dark: true,
    line: 'rgba(150,200,255,.36)', dot: '#8FD3FF',
    surface(ctx, L) {
      const W = L.W, rnd = deco(13);
      const g = ctx.createLinearGradient(0, 0, W, W);
      g.addColorStop(0, '#1E2460'); g.addColorStop(1, '#100F2E');
      ctx.fillStyle = g; roundRect(ctx, 0, 0, W, W, 30); ctx.fill();
      for (const [x, y, r, c] of [[W * 0.2, W * 0.25, W * 0.35, 'rgba(180,92,255,.18)'], [W * 0.8, W * 0.75, W * 0.4, 'rgba(61,139,255,.16)']]) {
        const n = ctx.createRadialGradient(x, y, 0, x, y, r);
        n.addColorStop(0, c); n.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = n; ctx.fillRect(0, 0, W, W);
      }
      for (let k = 0; k < 160; k++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.6})`;
        ctx.beginPath(); ctx.arc(rnd() * W, rnd() * W, 0.6 + rnd() * 1.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineWidth = 6; ctx.strokeStyle = '#3A4290'; roundRect(ctx, 4, 4, W - 8, W - 8, 28); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(143,211,255,.5)'; roundRect(ctx, 12, 12, W - 24, W - 24, 22); ctx.stroke();
    }
  }
};

// ---------- special spots ----------

const PORTAL = ['#B45CFF', '#3DDC97'];

export function drawIce(ctx, x, y, c, dir, t) {
  const h = c * 0.5;
  ctx.save();
  const g = ctx.createLinearGradient(x - h, y - h, x + h, y + h);
  g.addColorStop(0, 'rgba(210,245,255,.95)'); g.addColorStop(1, 'rgba(140,215,250,.95)');
  ctx.fillStyle = g;
  ctx.fillRect(x - h, y - h, c, c);
  ctx.beginPath(); ctx.moveTo(x - h * 0.7, y + h * 0.2); ctx.lineTo(x - h * 0.1, y - h * 0.6);
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = c * 0.05; ctx.lineCap = 'round'; ctx.stroke();
  // chevrons drifting the way stones slide
  const [dx, dy] = DIRS[dir];
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.beginPath(); ctx.rect(-h, -h, c, c); ctx.clip();
  const off = ((t * 0.6) % 1) * c * 0.5;
  ctx.strokeStyle = 'rgba(30,120,190,.55)'; ctx.lineWidth = c * 0.07; ctx.lineJoin = 'round';
  for (let k = -2; k <= 1; k++) {
    const ax = k * c * 0.5 + off;
    ctx.beginPath(); ctx.moveTo(ax - c * 0.1, -c * 0.16); ctx.lineTo(ax + c * 0.06, 0); ctx.lineTo(ax - c * 0.1, c * 0.16); ctx.stroke();
  }
  ctx.restore();
}

export function drawVent(ctx, x, y, c, t, hot) {
  const r = c * 0.48;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - r, y + r * 0.7); ctx.lineTo(x - r * 0.35, y - r * 0.45); ctx.lineTo(x + r * 0.35, y - r * 0.45); ctx.lineTo(x + r, y + r * 0.7);
  ctx.quadraticCurveTo(x, y + r * 0.95, x - r, y + r * 0.7);
  ctx.fillStyle = '#6B4038'; ctx.fill();
  ctx.lineWidth = c * 0.05; ctx.strokeStyle = '#2A1612'; ctx.lineJoin = 'round'; ctx.stroke();
  const glow = 0.6 + Math.sin(t * 4 + x) * 0.25 + (hot || 0);
  ctx.beginPath(); ctx.ellipse(x, y - r * 0.45, r * 0.36, r * 0.13, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,${120 + glow * 60 | 0},40,${Math.min(1, glow)})`; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - r * 0.25, y - r * 0.4); ctx.lineTo(x - r * 0.1, y + r * 0.1); ctx.lineTo(x + r * 0.05, y - r * 0.3);
  ctx.strokeStyle = 'rgba(255,120,50,.85)'; ctx.lineWidth = c * 0.05; ctx.stroke();
  // smoke puffs
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.35 + k / 3) % 1;
    ctx.beginPath(); ctx.arc(x + Math.sin(p * 6 + k) * r * 0.25, y - r * 0.55 - p * c * 0.8, r * (0.12 + p * 0.25), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(160,140,150,${0.45 * (1 - p)})`; ctx.fill();
  }
  ctx.restore();
}

export function drawPortal(ctx, x, y, c, pair, t) {
  const r = c * 0.42, col = PORTAL[pair % 2];
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.35, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.globalAlpha = 0.75;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = c * 0.06; ctx.strokeStyle = col; ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const a = t * 2.4 + k * Math.PI * 2 / 3;
    ctx.beginPath(); ctx.arc(x, y, r * 0.95, a, a + 1.3); ctx.stroke();
  }
  ctx.restore();
}

export function drawHole(ctx, x, y, c, t) {
  const r = c * 0.44;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, '#000'); g.addColorStop(0.55, '#120826'); g.addColorStop(1, 'rgba(180,92,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = c * 0.035;
  for (let k = 0; k < 4; k++) {
    const a = -t * 1.8 + k * Math.PI / 2;
    ctx.strokeStyle = `rgba(210,160,255,${0.35 + k * 0.1})`;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r * 0.45, a * 0.2, a, a + 1.6); ctx.stroke();
  }
  ctx.restore();
}

export { PORTAL };
