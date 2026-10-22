// Little pictures for the items, gift boxes and party events, drawn with
// shapes so they look the same on every device (emoji differ a lot between
// phones). Each one fits a circle of radius s around (0, 0).

const INK = '#3B2340';

function rockShape(ctx, s, fill = '#A79C93') {
  ctx.beginPath();
  ctx.moveTo(-s * 0.72, s * 0.42);
  ctx.lineTo(-s * 0.62, -s * 0.12);
  ctx.lineTo(-s * 0.25, -s * 0.5);
  ctx.lineTo(s * 0.28, -s * 0.46);
  ctx.lineTo(s * 0.7, -s * 0.05);
  ctx.lineTo(s * 0.68, s * 0.42);
  ctx.quadraticCurveTo(0, s * 0.62, -s * 0.72, s * 0.42);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.09; ctx.strokeStyle = '#5E534D'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.35, -s * 0.3); ctx.lineTo(-s * 0.1, -s * 0.05); ctx.lineTo(s * 0.25, -s * 0.12);
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = s * 0.07; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.15, s * 0.15); ctx.lineTo(s * 0.4, s * 0.3);
  ctx.strokeStyle = 'rgba(70,55,50,.35)'; ctx.stroke();
}

function snowflake(ctx, s, col = '#2C9AD6') {
  ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.12;
  for (let k = 0; k < 6; k++) {
    ctx.save();
    ctx.rotate(k * Math.PI / 3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.72); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.18, -s * 0.52); ctx.lineTo(0, -s * 0.36); ctx.lineTo(s * 0.18, -s * 0.52); ctx.stroke();
    ctx.restore();
  }
}

function star(ctx, x, y, r, col) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}

const DRAW = {
  bomb(ctx, s) {
    ctx.beginPath(); ctx.arc(-s * 0.08, s * 0.12, s * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#3E3550'; ctx.fill();
    ctx.lineWidth = s * 0.08; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.arc(-s * 0.26, -s * 0.06, s * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
    ctx.fillStyle = '#6B6080'; ctx.fillRect(s * 0.12, -s * 0.5, s * 0.28, s * 0.22);
    ctx.beginPath(); ctx.moveTo(s * 0.26, -s * 0.5); ctx.quadraticCurveTo(s * 0.35, -s * 0.8, s * 0.6, -s * 0.72);
    ctx.lineWidth = s * 0.08; ctx.strokeStyle = '#C79A5B'; ctx.stroke();
    star(ctx, s * 0.62, -s * 0.72, s * 0.24, '#FFC21A');
    star(ctx, s * 0.62, -s * 0.72, s * 0.12, '#FF6A3D');
  },
  rock(ctx, s) { rockShape(ctx, s); },
  paint(ctx, s) {
    ctx.save();
    ctx.rotate(-0.6);
    ctx.fillStyle = '#C79A5B'; ctx.fillRect(-s * 0.08, -s * 0.05, s * 0.16, s * 0.8);
    ctx.fillStyle = '#B9BEC9'; ctx.fillRect(-s * 0.2, -s * 0.2, s * 0.4, s * 0.2);
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, -s * 0.2); ctx.quadraticCurveTo(-s * 0.25, -s * 0.6, 0, -s * 0.78);
    ctx.quadraticCurveTo(s * 0.25, -s * 0.6, s * 0.22, -s * 0.2); ctx.closePath();
    ctx.fillStyle = '#B45CFF'; ctx.fill();
    ctx.lineWidth = s * 0.06; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
    for (const [x, y, r] of [[s * 0.45, s * 0.35, 0.16], [s * 0.2, s * 0.6, 0.1], [s * 0.62, s * 0.05, 0.08]]) {
      ctx.beginPath(); ctx.arc(x, y, s * r, 0, Math.PI * 2); ctx.fillStyle = '#B45CFF'; ctx.fill();
    }
  },
  shield(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.72);
    ctx.quadraticCurveTo(s * 0.35, -s * 0.55, s * 0.62, -s * 0.55);
    ctx.quadraticCurveTo(s * 0.62, s * 0.4, 0, s * 0.75);
    ctx.quadraticCurveTo(-s * 0.62, s * 0.4, -s * 0.62, -s * 0.55);
    ctx.quadraticCurveTo(-s * 0.35, -s * 0.55, 0, -s * 0.72);
    ctx.fillStyle = '#2EC4B6'; ctx.fill();
    ctx.lineWidth = s * 0.09; ctx.strokeStyle = '#167A71'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.45); ctx.quadraticCurveTo(s * 0.3, -s * 0.35, s * 0.38, -s * 0.32);
    ctx.quadraticCurveTo(s * 0.36, s * 0.25, 0, s * 0.48); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
    star(ctx, -s * 0.05, s * 0.02, s * 0.24, '#fff');
  },
  freeze(ctx, s) { snowflake(ctx, s); },
  gift(ctx, s) {
    ctx.fillStyle = '#FF6B8E';
    ctx.beginPath(); ctx.roundRect(-s * 0.6, -s * 0.2, s * 1.2, s * 0.85, s * 0.1); ctx.fill();
    ctx.lineWidth = s * 0.08; ctx.strokeStyle = '#B83158'; ctx.stroke();
    ctx.fillStyle = '#FF8AA6';
    ctx.beginPath(); ctx.roundRect(-s * 0.7, -s * 0.42, s * 1.4, s * 0.3, s * 0.08); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFD23F';
    ctx.fillRect(-s * 0.12, -s * 0.42, s * 0.24, s * 1.07);
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(k * s * 0.24, -s * 0.56, s * 0.22, s * 0.14, k * -0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD23F'; ctx.fill();
      ctx.lineWidth = s * 0.06; ctx.strokeStyle = '#D69A00'; ctx.stroke();
    }
  },
  meteor(ctx, s) {
    ctx.lineCap = 'round';
    for (const [w, c] of [[0.5, 'rgba(255,170,60,.5)'], [0.28, '#FFD23F']]) {
      ctx.beginPath(); ctx.moveTo(s * 0.75, -s * 0.75); ctx.lineTo(-s * 0.05, s * 0.05);
      ctx.lineWidth = s * w; ctx.strokeStyle = c; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(-s * 0.22, s * 0.22, s * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = '#8E6A55'; ctx.fill();
    ctx.lineWidth = s * 0.08; ctx.strokeStyle = '#4E372B'; ctx.stroke();
    ctx.fillStyle = '#6E5040';
    ctx.beginPath(); ctx.arc(-s * 0.32, s * 0.3, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-s * 0.08, s * 0.1, s * 0.07, 0, Math.PI * 2); ctx.fill();
  },
  lightning(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(s * 0.15, -s * 0.8); ctx.lineTo(-s * 0.45, s * 0.1); ctx.lineTo(-s * 0.02, s * 0.1);
    ctx.lineTo(-s * 0.2, s * 0.8); ctx.lineTo(s * 0.48, -s * 0.15); ctx.lineTo(s * 0.05, -s * 0.15); ctx.closePath();
    ctx.fillStyle = '#FFD23F'; ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.09; ctx.strokeStyle = '#D68A00'; ctx.stroke();
  },
  rockslide(ctx, s) {
    ctx.save(); ctx.translate(-s * 0.3, s * 0.25); rockShape(ctx, s * 0.55); ctx.restore();
    ctx.save(); ctx.translate(s * 0.35, s * 0.3); rockShape(ctx, s * 0.45, '#B8ADA4'); ctx.restore();
    ctx.save(); ctx.translate(s * 0.05, -s * 0.35); rockShape(ctx, s * 0.5, '#968A80'); ctx.restore();
  },
  giftShower(ctx, s) {
    ctx.save(); ctx.translate(-s * 0.3, s * 0.25); DRAW.gift(ctx, s * 0.55); ctx.restore();
    ctx.save(); ctx.translate(s * 0.35, -s * 0.2); DRAW.gift(ctx, s * 0.5); ctx.restore();
  },
  lucky(ctx, s) {
    for (let k = 0; k < 4; k++) {
      ctx.save(); ctx.rotate(k * Math.PI / 2 + Math.PI / 4);
      ctx.beginPath(); ctx.arc(-s * 0.15, -s * 0.32, s * 0.24, 0, Math.PI * 2); ctx.arc(s * 0.15, -s * 0.32, s * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = '#4CC764'; ctx.fill();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, s * 0.14, 0, Math.PI * 2); ctx.fillStyle = '#2E9A45'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, s * 0.1); ctx.quadraticCurveTo(s * 0.1, s * 0.55, s * 0.4, s * 0.75);
    ctx.lineWidth = s * 0.1; ctx.strokeStyle = '#2E9A45'; ctx.lineCap = 'round'; ctx.stroke();
  },
  frostWave(ctx, s) { snowflake(ctx, s, '#5BC8FF'); },
  snowball(ctx, s) {
    ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = s * 0.08; ctx.strokeStyle = '#8CB8D8'; ctx.stroke();
    ctx.fillStyle = '#DCEBF7';
    ctx.beginPath(); ctx.arc(s * 0.18, s * 0.2, s * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.22, s * 0.12, 0, Math.PI * 2); ctx.fill();
  },
  eruption(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, s * 0.65); ctx.lineTo(-s * 0.22, -s * 0.2); ctx.lineTo(s * 0.22, -s * 0.2); ctx.lineTo(s * 0.8, s * 0.65); ctx.closePath();
    ctx.fillStyle = '#7A4A3A'; ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.08; ctx.strokeStyle = '#3F241B'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.22, -s * 0.2); ctx.lineTo(-s * 0.05, s * 0.2); ctx.lineTo(s * 0.08, -s * 0.05); ctx.lineTo(s * 0.22, -s * 0.2); ctx.closePath();
    ctx.fillStyle = '#FF6A3D'; ctx.fill();
    for (const [x, y, r] of [[0, -s * 0.5, 0.2], [-s * 0.35, -s * 0.65, 0.13], [s * 0.38, -s * 0.7, 0.12]]) {
      ctx.beginPath(); ctx.arc(x, y, s * r, 0, Math.PI * 2); ctx.fillStyle = '#FF8A3D'; ctx.fill();
    }
  }
};

export function drawIcon(ctx, id, x, y, s) {
  const f = DRAW[id];
  if (!f) return;
  ctx.save();
  ctx.translate(x, y);
  f(ctx, s);
  ctx.restore();
}

export { rockShape, snowflake, star };
