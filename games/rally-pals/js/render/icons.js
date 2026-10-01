// Little pictures for the power-ups, drawn with shapes so they look the same
// on every device (emoji differ a lot between phones).

import { powerById } from '../data/powerups.js';

const INK = '#3B2340';

function flame(ctx, s, inner) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.62);
  ctx.bezierCurveTo(-s * 0.62, s * 0.55, -s * 0.6, -s * 0.1, -s * 0.12, -s * 0.7);
  ctx.bezierCurveTo(-s * 0.1, -s * 0.25, s * 0.15, -s * 0.2, s * 0.12, -s * 0.45);
  ctx.bezierCurveTo(s * 0.62, -s * 0.05, s * 0.62, s * 0.55, 0, s * 0.62);
  ctx.fillStyle = '#FF6A3D'; ctx.fill();
  ctx.lineWidth = s * 0.09; ctx.strokeStyle = '#B8361B'; ctx.stroke();
  if (inner) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.55);
    ctx.bezierCurveTo(-s * 0.32, s * 0.5, -s * 0.28, s * 0.05, 0, -s * 0.12);
    ctx.bezierCurveTo(s * 0.3, s * 0.1, s * 0.32, s * 0.5, 0, s * 0.55);
    ctx.fillStyle = '#FFD23F'; ctx.fill();
  }
}

const DRAW = {
  fire(ctx, s) { flame(ctx, s, true); },
  giant(ctx, s) {
    ctx.rotate(-0.7);
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = s * 0.16;
    ctx.beginPath(); ctx.moveTo(0, s * 0.15); ctx.lineTo(0, s * 0.72); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -s * 0.22, s * 0.36, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFE08A'; ctx.fill();
    ctx.lineWidth = s * 0.11; ctx.strokeStyle = '#E08A00'; ctx.stroke();
    ctx.lineWidth = s * 0.035; ctx.strokeStyle = 'rgba(59,35,64,.45)';
    for (const k of [-0.18, 0, 0.18]) {
      ctx.beginPath(); ctx.moveTo(k * s, -s * 0.6); ctx.lineTo(k * s, s * 0.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.32, -s * 0.22 + k * s * 1.4); ctx.lineTo(s * 0.32, -s * 0.22 + k * s * 1.4); ctx.stroke();
    }
    ctx.rotate(0.7);
    ctx.fillStyle = '#fff'; ctx.font = `800 ${s * 0.42}px 'Baloo 2', system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = s * 0.1; ctx.strokeStyle = INK;
    ctx.strokeText('+', s * 0.45, -s * 0.45); ctx.fillText('+', s * 0.45, -s * 0.45);
  },
  speed(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.35);
    ctx.lineTo(-s * 0.42, -s * 0.25);
    ctx.quadraticCurveTo(-s * 0.1, -s * 0.3, 0, -s * 0.05);
    ctx.quadraticCurveTo(s * 0.5, s * 0.02, s * 0.6, s * 0.35);
    ctx.closePath();
    ctx.fillStyle = '#3DDC97'; ctx.fill();
    ctx.lineWidth = s * 0.09; ctx.strokeStyle = '#1B8E5E'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(-s * 0.52, s * 0.28, s * 1.12, s * 0.14);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.08; ctx.lineCap = 'round';
    for (const [y, l] of [[-0.45, 0.35], [-0.6, 0.22]]) { ctx.beginPath(); ctx.moveTo(-s * 0.95, y * s + s * 0.35); ctx.lineTo(-s * (0.95 - l), y * s + s * 0.35); ctx.stroke(); }
  },
  zigzag(ctx, s) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const x = -s * 0.75 + i * s * 0.06;
      ctx.lineTo(x, Math.sin(i * 0.95) * s * 0.28);
    }
    ctx.strokeStyle = '#7A3FD6'; ctx.lineWidth = s * 0.14; ctx.stroke();
    ctx.beginPath(); ctx.arc(s * 0.55, Math.sin(20 * 0.95) * s * 0.28, s * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#E6FF5C'; ctx.fill(); ctx.lineWidth = s * 0.07; ctx.strokeStyle = INK; ctx.stroke();
  },
  tiny(ctx, s) {
    ctx.beginPath(); ctx.arc(-s * 0.1, -s * 0.1, s * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,235,255,.9)'; ctx.fill();
    ctx.lineWidth = s * 0.12; ctx.strokeStyle = '#2D7FC1'; ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineWidth = s * 0.18;
    ctx.beginPath(); ctx.moveTo(s * 0.2, s * 0.2); ctx.lineTo(s * 0.58, s * 0.58); ctx.stroke();
    ctx.strokeStyle = '#2D7FC1'; ctx.lineWidth = s * 0.08;
    ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.1); ctx.lineTo(s * 0.05, -s * 0.1); ctx.stroke();
  },
  freeze(ctx, s) {
    ctx.strokeStyle = '#2C9AD6'; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.12;
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(0, -s * 0.62); ctx.lineTo(0, s * 0.62); ctx.stroke();
      for (const k of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(0, k * -s * 0.38); ctx.lineTo(-s * 0.16, k * -s * 0.54); ctx.moveTo(0, k * -s * 0.38); ctx.lineTo(s * 0.16, k * -s * 0.54); ctx.stroke();
      }
      ctx.restore();
    }
  }
};

export function drawPowerIcon(ctx, id, x, y, size) {
  const f = DRAW[id];
  if (!f) return;
  ctx.save();
  ctx.translate(x, y);
  f(ctx, size);
  ctx.restore();
}

// a floating glass bubble with the icon inside
export function drawPowerBubble(ctx, id, x, y, r, t, fade = 1) {
  const def = powerById(id);
  ctx.save();
  ctx.globalAlpha = fade;
  const wob = Math.sin(t * 5) * 0.05;
  ctx.translate(x, y);
  ctx.scale(1 + wob, 1 - wob);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(0.55, 'rgba(255,255,255,.55)');
  g.addColorStop(1, def ? def.color + 'CC' : 'rgba(255,255,255,.6)');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = def ? def.color : '#fff'; ctx.stroke();
  drawPowerIcon(ctx, id, 0, 1, r * 0.95);
  ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
  ctx.restore();
}
