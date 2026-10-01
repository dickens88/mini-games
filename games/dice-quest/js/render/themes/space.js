// Star Voyage: deep space with nebulae and planets, a glowing neon route,
// rocket trails forward, black holes that pull you back, rainbow wormholes.

import { roundRect, emoji, text, seeded, curvePath, onCurve, routePath, arrowHead, CELL_R } from '../kit.js';

export default {
  // what flies up when a pawn lands
  fx: { land: ['#5EF2FF', '#FF9EDB', '#FFFFFF'], kind: 'spark', trail: '#FFD36E' },
  page: { top: '#140F33', bottom: '#4B2C83', ink: '#F2EEFF', accent: '#5EF2FF', dark: true },

  background(ctx, S) {
    const g = ctx.createRadialGradient(S(40), S(35), S(5), S(50), S(50), S(80));
    g.addColorStop(0, '#2B1E5E');
    g.addColorStop(1, '#0B0A22');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, S(100), S(100), S(3));
    ctx.fill();
    // nebula clouds
    for (const [x, y, r, c] of [[22, 30, 22, '255,110,199'], [78, 70, 26, '94,242,255'], [70, 18, 14, '180,140,255']]) {
      const n = ctx.createRadialGradient(S(x), S(y), 0, S(x), S(y), S(r));
      n.addColorStop(0, `rgba(${c},0.22)`);
      n.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = n;
      ctx.fillRect(0, 0, S(100), S(100));
    }
    const rnd = seeded(31);
    for (let k = 0; k < 160; k++) {
      ctx.beginPath();
      ctx.arc(S(rnd() * 100), S(rnd() * 100), S(0.12 + rnd() * 0.3), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.6})`;
      ctx.fill();
    }
    // a ringed planet and a moon between the columns
    ctx.save();
    ctx.translate(S(40), S(50));
    ctx.beginPath();
    ctx.arc(0, 0, S(3.4), 0, Math.PI * 2);
    ctx.fillStyle = '#FF9F68';
    ctx.fill();
    ctx.rotate(-0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, S(6), S(1.4), 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 220, 170, 0.8)';
    ctx.lineWidth = S(0.5);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(S(79.5), S(36), S(2.2), 0, Math.PI * 2);
    ctx.fillStyle = '#C9C3E6';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(S(80.2), S(35.4), S(0.5), 0, Math.PI * 2);
    ctx.fillStyle = '#A59FC6';
    ctx.fill();
  },

  road(ctx, S, map) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.shadowColor = '#5EF2FF';
    ctx.shadowBlur = S(2);
    routePath(ctx, S, map);
    ctx.strokeStyle = 'rgba(94, 242, 255, 0.55)';
    ctx.lineWidth = S(1.1);
    ctx.stroke();
    ctx.restore();
  },

  cell(ctx, S, p, i, special) {
    ctx.save();
    ctx.shadowColor = special ? '#FF6EC7' : '#5EF2FF';
    ctx.shadowBlur = S(1.5);
    ctx.beginPath();
    ctx.arc(S(p.x), S(p.y), S(CELL_R), 0, Math.PI * 2);
    ctx.fillStyle = special ? '#3A1F5E' : '#1B1A44';
    ctx.fill();
    ctx.lineWidth = S(0.5);
    ctx.strokeStyle = special ? '#FF9EDB' : '#5EF2FF';
    ctx.stroke();
    ctx.restore();
    if (!special) text(ctx, String(i), S(p.x), S(p.y) + S(0.1), S(2.2), '#BFF8FF');
  },

  ladder(ctx, S, curve) {
    ctx.save();
    ctx.shadowColor = '#FFB703';
    ctx.shadowBlur = S(1.5);
    curvePath(ctx, S, curve);
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.9)';
    ctx.lineWidth = S(0.9);
    ctx.setLineDash([S(0.6), S(1)]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },

  slide(ctx, S, curve) {
    curvePath(ctx, S, curve);
    ctx.strokeStyle = 'rgba(180, 120, 255, 0.75)';
    ctx.lineWidth = S(0.9);
    ctx.setLineDash([S(0.6), S(1)]);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  top(ctx, S, curve, kind) {
    if (kind === 'ladder') {
      arrowHead(ctx, S, curve, 2, '#FFB703');
      const m = onCurve(curve, 0.5), q = onCurve(curve, 0.52);
      ctx.save();
      ctx.translate(S(m.x), S(m.y));
      // the rocket emoji points up-right; turn it to fly along the arc
      ctx.rotate(Math.atan2(q.y - m.y, q.x - m.x) + Math.PI / 4);
      emoji(ctx, '🚀', 0, 0, S(4));
      ctx.restore();
      return;
    }
    arrowHead(ctx, S, curve, 2, 'rgba(180, 120, 255, 0.9)');
    // the black hole sits on the top cell
    const a = curve.a;
    for (let k = 4; k >= 0; k--) {
      ctx.beginPath();
      ctx.arc(S(a.x), S(a.y), S(CELL_R + 0.4 + k * 0.45), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(160, 90, 255, ${0.15 + (4 - k) * 0.12})`;
      ctx.lineWidth = S(0.35);
      ctx.stroke();
    }
  },

  portal(ctx, S, p) {
    const cols = ['#FF6EC7', '#FFB703', '#5EF2FF', '#7CFF8A'];
    cols.forEach((c, k) => {
      ctx.beginPath();
      ctx.arc(S(p.x), S(p.y), S(CELL_R + 0.5 + k * 0.4), 0, Math.PI * 2);
      ctx.lineWidth = S(0.3);
      ctx.strokeStyle = c;
      ctx.stroke();
    });
  },

  ends(ctx, S, map) {
    for (const [i, info, col] of [[0, map.def.start, '#5EF2FF'], [map.goal, map.def.goal, '#FFB703']]) {
      const p = map.cells[i];
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = S(3);
      ctx.beginPath();
      ctx.arc(S(p.x), S(p.y), S(5), 0, Math.PI * 2);
      ctx.fillStyle = '#231B55';
      ctx.fill();
      ctx.lineWidth = S(0.7);
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.restore();
      emoji(ctx, info.icon, S(p.x), S(p.y), S(5));
    }
  },

  // twinkling stars and the odd shooting star
  ambient(ctx, S, time) {
    const rnd = seeded(77);
    for (let k = 0; k < 24; k++) {
      const x = rnd() * 100, y = rnd() * 100;
      const a = 0.5 + 0.5 * Math.sin(time * 2.4 + k * 1.7);
      ctx.fillStyle = `rgba(255,255,255,${a * 0.9})`;
      ctx.fillRect(S(x - 0.15), S(y - 0.8 * a), S(0.3), S(1.6 * a));
      ctx.fillRect(S(x - 0.8 * a), S(y - 0.15), S(1.6 * a), S(0.3));
    }
    const t = (time % 7) / 7;
    if (t < 0.15) {
      const x = 10 + t / 0.15 * 60, y = 8 + t / 0.15 * 25;
      const g = ctx.createLinearGradient(S(x - 8), S(y - 3.3), S(x), S(y));
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,0.9)');
      ctx.strokeStyle = g;
      ctx.lineWidth = S(0.4);
      ctx.beginPath();
      ctx.moveTo(S(x - 8), S(y - 3.3));
      ctx.lineTo(S(x), S(y));
      ctx.stroke();
    }
  }
};
