// Meteors (in each world's style), shooting stars, the golden UFO and the
// four bosses, each wearing its question on a little white plate.

import { THEMES } from './themes.js';

const TAU = Math.PI * 2;
const FONT = '"Baloo 2", "Quicksand", system-ui, sans-serif';
const GUM = ['#FF5FA2', '#5ED6C0', '#FFD84D', '#9D7BFF', '#FF8A5C'];

// the question plate; `match` lights it up when the typed digits fit its answer
export function drawPlate(ctx, x, y, text, size, match, warn) {
  ctx.font = `800 ${size}px ${FONT}`;
  const w = ctx.measureText(text).width + size * 0.8, h = size * 1.3;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = match ? '#FFF6C2' : 'rgba(255,255,255,.95)';
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (match || warn) { ctx.lineWidth = 3; ctx.strokeStyle = match ? '#FFB800' : '#FF4D6D'; ctx.stroke(); }
  ctx.fillStyle = '#2B2340';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * 0.06);
  ctx.restore();
}

function lumpy(ctx, r, seed, n) {
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + 0.08 * Math.sin(a * 3 + seed * 20) + 0.05 * Math.sin(a * 5 + seed * 40);
    ctx.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k);
  }
  ctx.closePath();
}

function trail(ctx, m, rgb, t) {
  const len = m.r * 2.6;
  const g = ctx.createLinearGradient(0, -len, 0, 0);
  g.addColorStop(0, `rgba(${rgb},0)`);
  g.addColorStop(1, `rgba(${rgb},.75)`);
  ctx.fillStyle = g;
  const wob = Math.sin(t * 20 + m.seed * 10) * 3;
  ctx.beginPath();
  ctx.moveTo(-m.r * 0.85, 0);
  ctx.quadraticCurveTo(-m.r * 0.5 + wob, -len * 0.6, wob, -len);
  ctx.quadraticCurveTo(m.r * 0.5 + wob, -len * 0.6, m.r * 0.85, 0);
  ctx.fill();
}

function bubbleTrail(ctx, m, t) {
  ctx.strokeStyle = 'rgba(220,250,255,.7)'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const k = ((t * 1.6 + i / 5 + m.seed) % 1);
    ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.arc(Math.sin(i * 2.1 + m.seed * 9) * m.r * 0.5, -m.r - k * m.r * 2, 3 + i % 3 * 2, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function star(ctx, r, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU, rr = i % 2 ? r * inner : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function drawMeteor(ctx, m, world, t, match, frozen) {
  const th = THEMES[world];
  const r = m.r;
  ctx.save();
  ctx.translate(m.x, m.y);

  if (m.kind === 'shower') {
    trail(ctx, m, '255,230,120', t);
    ctx.rotate(t * 2 + m.seed * 6);
    star(ctx, r, 0.5);
    ctx.fillStyle = '#FFD84D'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#FFF4B8'; ctx.stroke();
    ctx.restore();
    drawPlate(ctx, m.x, m.y + 2, m.prob.text, 20, match);
    return;
  }

  if (!frozen) {
    if (world === 'ocean') bubbleTrail(ctx, m, t);
    else trail(ctx, m, th.trail.join(','), t);
  }
  const spin = t * m.spin + m.seed * TAU;

  if (world === 'moon' || world === 'volcano') {
    ctx.save(); ctx.rotate(spin);
    lumpy(ctx, r, m.seed, 18);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.2, 0, 0, r * 1.1);
    if (world === 'moon') { g.addColorStop(0, '#B6A79C'); g.addColorStop(1, '#6A5D56'); }
    else { g.addColorStop(0, '#5C4646'); g.addColorStop(1, '#241414'); }
    ctx.fillStyle = g; ctx.fill();
    if (world === 'moon') {
      ctx.fillStyle = 'rgba(60,45,40,.35)';
      for (let i = 0; i < 4; i++) {
        const a = m.seed * 30 + i * 1.7, d = r * (0.25 + (i % 2) * 0.35);
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.13 + (i % 3) * 0.05), 0, TAU); ctx.fill();
      }
    } else {
      // glowing cracks
      ctx.strokeStyle = '#FF7A1A'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.shadowColor = '#FF6A00'; ctx.shadowBlur = 8;
      for (let i = 0; i < 3; i++) {
        const a = m.seed * 20 + i * 2.1;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15);
        ctx.lineTo(Math.cos(a + 0.4) * r * 0.55, Math.sin(a + 0.4) * r * 0.55);
        ctx.lineTo(Math.cos(a + 0.1) * r * 0.9, Math.sin(a + 0.1) * r * 0.9);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  } else if (world === 'ocean') {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.6, 'rgba(120,220,255,.35)'); g.addColorStop(1, 'rgba(60,170,230,.75)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(230,250,255,.9)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, TAU); ctx.fill();
  } else {
    const col = GUM[Math.floor(m.seed * GUM.length)];
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.rotate(spin);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = r * 0.16;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0.3, 1.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 3.4, 4.7); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.2, r * 0.11, -0.6, 0, TAU); ctx.fill();
  }

  if (m.kind === 'big') {
    // a dashed ring says "I split in two"
    ctx.save(); ctx.rotate(-t * 0.8);
    ctx.setLineDash([8, 7]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,240,170,.9)';
    ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  if (m.prob.revenge) {
    ctx.save(); ctx.rotate(t * 1.4);
    ctx.setLineDash([5, 6]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,90,120,.95)';
    ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  if (frozen) {
    ctx.fillStyle = 'rgba(190,235,255,.45)';
    ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();

  const size = m.kind === 'big' ? 26 : m.kind === 'mini' ? 21 : 24;
  drawPlate(ctx, m.x, m.y + 2, m.prob.text, size, match);
  if (m.prob.revenge) {
    ctx.font = `800 13px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillStyle = '#FF7A93';
    ctx.fillText('again!', m.x, m.y - r - 10);
  }
}

export function drawUfo(ctx, u, t, match) {
  ctx.save();
  ctx.translate(u.x, u.y);
  ctx.rotate(Math.sin(t * 3) * 0.06);
  // tractor glow
  const g = ctx.createLinearGradient(0, 8, 0, 70);
  g.addColorStop(0, 'rgba(255,240,150,.45)'); g.addColorStop(1, 'rgba(255,240,150,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-18, 8); ctx.lineTo(18, 8); ctx.lineTo(40, 70); ctx.lineTo(-40, 70); ctx.fill();
  // dome
  ctx.fillStyle = 'rgba(170,240,255,.85)';
  ctx.beginPath(); ctx.ellipse(0, -10, 22, 20, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#7ED957';
  ctx.beginPath(); ctx.arc(0, -12, 8, 0, TAU); ctx.fill();
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-3, -13, 1.8, 0, TAU); ctx.arc(3, -13, 1.8, 0, TAU); ctx.fill();
  // saucer
  const sg = ctx.createLinearGradient(0, -12, 0, 12);
  sg.addColorStop(0, '#FFE680'); sg.addColorStop(1, '#E09B00');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(0, 0, 50, 14, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#B87400'; ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const on = Math.floor(t * 6 + i) % 2;
    ctx.fillStyle = on ? '#FF5FA2' : '#FFFFFF';
    ctx.beginPath(); ctx.arc(-32 + i * 16, 2, 3.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
  drawPlate(ctx, u.x, u.y + 34, u.prob.text, 21, match);
}

// ---------- bosses ----------

function eyes(ctx, x, y, gap, r, look, angry) {
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + s * gap, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2B2340';
    ctx.beginPath(); ctx.arc(x + s * gap + look * r * 0.3, y + r * 0.2, r * 0.5, 0, TAU); ctx.fill();
    if (angry) {
      ctx.strokeStyle = '#2B2340'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + s * (gap + r), y - r - 4); ctx.lineTo(x + s * (gap - r * 0.6), y - r + 4); ctx.stroke();
    }
  }
}

export function drawBoss(ctx, b, t, match) {
  const hurt = b.hurt > 0;
  const shake = hurt ? Math.sin(t * 60) * 5 : 0;
  ctx.save();
  ctx.translate(b.x + shake, b.y);
  const bob = Math.sin(t * 2) * 4;
  ctx.translate(0, bob);
  const look = Math.sin(t * 0.9);

  if (b.art === 'golem') {
    lumpy(ctx, 70, 0.37, 14);
    const g = ctx.createRadialGradient(-20, -24, 10, 0, 0, 80);
    g.addColorStop(0, '#A9A3B8'); g.addColorStop(1, '#5B5570');
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = '#6FBF73';
    ctx.beginPath(); ctx.ellipse(-28, -58, 22, 9, -0.3, 0, TAU); ctx.fill();
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 82, 10 + Math.sin(t * 3 + s) * 6);
      lumpy(ctx, 24, 0.5 + s, 9); ctx.fillStyle = '#7A738F'; ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = '#7CF3FF'; ctx.shadowColor = '#7CF3FF'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(-22, -10, 11, 7, 0.2, 0, TAU); ctx.ellipse(22, -10, 11, 7, -0.2, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#3D3850'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-20, 22); ctx.lineTo(-6, 16); ctx.lineTo(6, 22); ctx.lineTo(20, 16); ctx.stroke();
  } else if (b.art === 'kraken') {
    ctx.strokeStyle = '#9B4FD1'; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const x0 = -50 + i * 20, sway = Math.sin(t * 3 + i) * 18;
      ctx.lineWidth = 14 - Math.abs(i - 2.5) * 1.5;
      ctx.beginPath(); ctx.moveTo(x0, 30);
      ctx.bezierCurveTo(x0 + sway, 60, x0 - sway, 85, x0 + sway * 1.2, 105); ctx.stroke();
    }
    const g = ctx.createRadialGradient(-20, -30, 10, 0, -10, 80);
    g.addColorStop(0, '#D59BFF'); g.addColorStop(1, '#8A3FC4');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, -10, 70, 62, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    for (const [x, y, r] of [[-38, -40, 8], [30, -48, 6], [44, -14, 5]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    eyes(ctx, 0, -6, 26, 16, look, hurt);
  } else if (b.art === 'gummy') {
    const g = ctx.createRadialGradient(-20, -30, 10, 0, 0, 90);
    g.addColorStop(0, 'rgba(255,140,160,.97)'); g.addColorStop(1, 'rgba(220,30,70,.95)');
    ctx.fillStyle = g;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 48, -52, 22, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(0, 0, 68, 64, 0, 0, TAU); ctx.fill();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 72, 18, 16, 26, s * 0.5, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.ellipse(-30, -30, 16, 9, -0.6, 0, TAU); ctx.fill();
    // crown
    ctx.fillStyle = '#FFD23F'; ctx.strokeStyle = '#D99A00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-30, -60); ctx.lineTo(-30, -86); ctx.lineTo(-15, -72); ctx.lineTo(0, -92); ctx.lineTo(15, -72); ctx.lineTo(30, -86); ctx.lineTo(30, -60); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5ED6C0'; ctx.beginPath(); ctx.arc(0, -70, 5, 0, TAU); ctx.fill();
    eyes(ctx, 0, -14, 24, 13, look, hurt);
    ctx.strokeStyle = '#7A0F2A'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 14, 14, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    // magma mole: a round mole in a miner's helmet, glowing spots
    const g = ctx.createRadialGradient(-20, -26, 10, 0, 0, 85);
    g.addColorStop(0, '#8C5A44'); g.addColorStop(1, '#4A2A20');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 6, 72, 66, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FF7A1A'; ctx.shadowColor = '#FF6A00'; ctx.shadowBlur = 10;
    for (const [x, y, r] of [[-44, 28, 8], [40, 36, 10], [-14, 52, 6], [52, -2, 6]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFB13B';
    ctx.beginPath(); ctx.ellipse(0, -46, 56, 30, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(-60, -48, 120, 8);
    ctx.fillStyle = '#FFF6B0'; ctx.shadowColor = '#FFF6B0'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(0, -62, 9, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    // goggles
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(s * 24, -14, 17, 0, TAU); ctx.fill();
      ctx.fillStyle = hurt ? '#FF4D6D' : '#FFD84D'; ctx.beginPath(); ctx.arc(s * 24, -14, 11, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#FF8FB1'; ctx.beginPath(); ctx.ellipse(0, 12, 14, 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-8, 24, 7, 9); ctx.fillRect(1, 24, 7, 9);
  }
  if (hurt) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,255,255,${b.hurt * 0.6})`;
    ctx.beginPath(); ctx.arc(0, 0, 80, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  // health pips above
  const n = b.max, w = Math.min(14, 200 / n);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i < b.hp ? '#FF4D6D' : 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.roundRect(b.x - (n * w) / 2 + i * w + 1, b.y + bob - 100, w - 2, 9, 3); ctx.fill();
  }
  if (b.prob) drawPlate(ctx, b.x + shake, b.y + bob + 66, b.prob.text, 28, match, b.y > 430);
}
