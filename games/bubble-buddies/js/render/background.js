// The scenery behind the bubbles. Every ten levels the world changes; endless
// has its own. The still parts are painted once, the drifting parts live.

import { W, H, DEAD_Y } from '../config.js';
import { star } from './buddy.js';

const TAU = Math.PI * 2;

export const THEME_ART = {
  meadow: { top: '#86CFFF', bottom: '#FFE1EE', hill: '#9BE08A', hill2: '#7CCB6E', page: ['#7CC8FF', '#FFD9E8'], ceil: '#FFFFFF', name: 'Cloud Meadow' },
  lagoon: { top: '#4FC9E0', bottom: '#D9FFF4', hill: '#FFE3A8', hill2: '#F7CF84', page: ['#38B7D6', '#C7FAEC'], ceil: '#E6FBFF', name: 'Lagoon Bay' },
  starry: { top: '#3A2C78', bottom: '#B28BE2', hill: '#6E59B8', hill2: '#5A4AA0', page: ['#2E2468', '#A985DB'], ceil: '#E9E2FF', name: 'Starlight Sky', dark: true },
  candy: { top: '#FF8FBA', bottom: '#FFE1A1', hill: '#FFC6DD', hill2: '#FFAFCF', page: ['#FF86B3', '#FFDE9C'], ceil: '#FFF4FA', name: 'Candy Rush' }
};

const statics = new Map();

function paintStatic(theme, px) {
  const key = theme + '@' + px;
  if (statics.has(key)) return statics.get(key);
  statics.clear();
  const a = THEME_ART[theme];
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * px); cv.height = Math.round(H * px);
  const g = cv.getContext('2d');
  g.scale(px, px);

  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, a.top); sky.addColorStop(1, a.bottom);
  g.fillStyle = sky; g.fillRect(0, 0, W, H);

  // a soft glow behind the board
  const glow = g.createRadialGradient(W / 2, H * 0.38, 20, W / 2, H * 0.38, W * 0.8);
  glow.addColorStop(0, 'rgba(255,255,255,.28)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  if (theme === 'starry') {
    g.fillStyle = 'rgba(255,248,214,.95)';
    g.beginPath(); g.arc(W - 70, 120, 26, 0, TAU); g.fill();
    g.fillStyle = a.top;
    g.beginPath(); g.arc(W - 58, 112, 23, 0, TAU); g.fill();
  } else {
    // big lazy clouds far back
    g.fillStyle = 'rgba(255,255,255,.45)';
    for (const [x, y, s] of [[70, 150, 1], [W - 60, 250, 1.3], [150, 360, 0.8]]) cloud(g, x, y, s);
  }

  // hills along the bottom
  g.fillStyle = a.hill2;
  g.beginPath(); g.moveTo(0, H);
  g.lineTo(0, H - 70);
  g.quadraticCurveTo(W * 0.25, H - 120, W * 0.5, H - 78);
  g.quadraticCurveTo(W * 0.78, H - 40, W, H - 96);
  g.lineTo(W, H); g.fill();
  g.fillStyle = a.hill;
  g.beginPath(); g.moveTo(0, H);
  g.lineTo(0, H - 40);
  g.quadraticCurveTo(W * 0.3, H - 70, W * 0.6, H - 42);
  g.quadraticCurveTo(W * 0.85, H - 22, W, H - 50);
  g.lineTo(W, H); g.fill();

  if (theme === 'meadow') {
    for (let i = 0; i < 14; i++) flower(g, 14 + i * 31 + (i % 3) * 5, H - 18 - (i % 4) * 7, ['#FF7EB0', '#FFFFFF', '#FFD23C'][i % 3]);
  } else if (theme === 'lagoon') {
    g.strokeStyle = '#3FB98A'; g.lineWidth = 5; g.lineCap = 'round';
    for (const x of [24, 60, W - 40, W - 80]) {
      g.beginPath(); g.moveTo(x, H);
      g.bezierCurveTo(x - 14, H - 30, x + 14, H - 50, x - 4, H - 80); g.stroke();
    }
    g.fillStyle = '#FF9B8A';
    for (const x of [100, W - 120]) star(g, x, H - 16, 9, 4, 0.2, '#FF9B8A');
  } else if (theme === 'candy') {
    for (let i = 0; i < 6; i++) lolly(g, 30 + i * 78, H - 30 - (i % 2) * 14);
  }

  // inner shade at the walls
  for (const [x0, x1] of [[0, 14], [W, W - 14]]) {
    const sh = g.createLinearGradient(x0, 0, x1, 0);
    sh.addColorStop(0, 'rgba(40,20,70,.16)'); sh.addColorStop(1, 'rgba(40,20,70,0)');
    g.fillStyle = sh; g.fillRect(Math.min(x0, x1), 0, 14, H);
  }

  statics.set(key, cv);
  return cv;
}

function cloud(g, x, y, s) {
  g.beginPath();
  g.arc(x, y, 20 * s, 0, TAU); g.arc(x + 22 * s, y - 8 * s, 24 * s, 0, TAU);
  g.arc(x + 46 * s, y, 18 * s, 0, TAU); g.arc(x + 22 * s, y + 6 * s, 20 * s, 0, TAU);
  g.fill();
}
function flower(g, x, y, c) {
  g.fillStyle = c;
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 3.6, y + Math.sin(a) * 3.6, 3, 0, TAU); g.fill(); }
  g.fillStyle = '#FFB84D'; g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
}
function lolly(g, x, y) {
  g.strokeStyle = '#FFFFFF'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40); g.stroke();
  g.fillStyle = '#FF6B8E'; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill();
  g.strokeStyle = '#FFFFFF'; g.lineWidth = 2.5;
  g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI * 1.4); g.stroke();
}

export function createBackground() {
  // drifting see-through bubbles and twinkles
  const motes = [];
  for (let i = 0; i < 18; i++) motes.push({ x: Math.random() * W, y: Math.random() * H, r: 3 + Math.random() * 9, v: 8 + Math.random() * 18, ph: Math.random() * TAU });
  const twinkles = [];
  for (let i = 0; i < 40; i++) twinkles.push({ x: Math.random() * W, y: Math.random() * H * 0.85, s: 1 + Math.random() * 2.4, ph: Math.random() * TAU });

  return {
    draw(ctx, px, theme, time, dt, danger) {
      ctx.drawImage(paintStatic(theme, px), 0, 0, W, H);
      if (theme === 'starry') {
        for (const t of twinkles) {
          const k = (Math.sin(time * 2 + t.ph) + 1) / 2;
          ctx.globalAlpha = 0.3 + k * 0.7;
          star(ctx, t.x, t.y, t.s * (0.6 + k * 0.6) + 1, t.s * 0.35, 0, '#FFF8D6');
        }
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = 1.2;
      for (const m of motes) {
        m.y -= m.v * dt;
        if (m.y < -20) { m.y = H + 20; m.x = Math.random() * W; }
        const x = m.x + Math.sin(time * 0.8 + m.ph) * 8;
        ctx.beginPath(); ctx.arc(x, m.y, m.r, 0, TAU);
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.stroke();
        ctx.beginPath(); ctx.arc(x - m.r * 0.35, m.y - m.r * 0.35, m.r * 0.22, 0, TAU);
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
      }

      // the line the bubbles must not cross
      const pulse = danger ? (Math.sin(time * (danger > 1 ? 10 : 5)) + 1) / 2 : 0;
      ctx.save();
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -time * 14;
      ctx.lineWidth = 2.5 + pulse * 1.5;
      ctx.strokeStyle = danger ? `rgba(255,70,110,${0.5 + pulse * 0.5})` : 'rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.moveTo(6, DEAD_Y); ctx.lineTo(W - 6, DEAD_Y); ctx.stroke();
      ctx.restore();
      if (danger) {
        const glow = ctx.createLinearGradient(0, DEAD_Y - 30, 0, DEAD_Y + 10);
        glow.addColorStop(0, 'rgba(255,70,110,0)'); glow.addColorStop(1, `rgba(255,70,110,${0.12 + pulse * 0.18})`);
        ctx.fillStyle = glow; ctx.fillRect(0, DEAD_Y - 30, W, 40);
      }
    }
  };
}

// the fluffy ceiling the bubbles hang from; it lowers when you miss too often
export function drawCeiling(ctx, theme, y, time, wobble) {
  const a = THEME_ART[theme];
  ctx.save();
  ctx.translate(Math.sin(time * 40) * wobble * 2.5, 0);
  ctx.fillStyle = a.ceil;
  ctx.fillRect(-10, -10, W + 20, y + 10 - 4);
  ctx.beginPath();
  for (let x = -10; x <= W + 20; x += 22) ctx.arc(x, y - 4, 13, 0, Math.PI);
  ctx.fill();
  if (y > 14) {
    // a lowered ceiling is a quilted cloud, not a blank slab
    ctx.save();
    ctx.beginPath(); ctx.rect(-10, -10, W + 20, y + 4); ctx.clip();
    ctx.fillStyle = a.hill;
    ctx.globalAlpha = 0.35;
    for (let row = 0, yy = y - 26; yy > -20; row++, yy -= 24) {
      for (let x = (row % 2) * 22 - 10; x < W + 20; x += 44) {
        ctx.beginPath(); ctx.arc(x, yy, 5, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(80,60,120,.12)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -10; x <= W + 20; x += 22) { ctx.moveTo(x + 13, y - 4); ctx.arc(x, y - 4, 13, 0, Math.PI); }
  ctx.stroke();
  if (y > 18) {
    // the rope the ceiling hangs from
    ctx.strokeStyle = 'rgba(80,60,120,.18)'; ctx.lineWidth = 3;
    for (const x of [60, W - 60]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - 14); ctx.stroke(); }
  }
  ctx.restore();
}
