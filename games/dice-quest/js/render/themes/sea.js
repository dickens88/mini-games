// Pirate Seas: open water, a spiral sea lane of little sandbanks, dolphin
// leaps forward, shark chases back, swirling whirlpools.

import { roundRect, emoji, text, seeded, curvePath, onCurve, routePath, arrowHead, CELL_R } from '../kit.js';

export default {
  // what flies up when a pawn lands
  fx: { land: ['#FFFFFF', '#BDE8FF', '#7FD4FF'], kind: 'drop', trail: '#E6F7FF' },
  page: { top: '#1C7FC4', bottom: '#BDE8FF', ink: '#0B3558', accent: '#FFB703' },

  background(ctx, S) {
    const g = ctx.createRadialGradient(S(50), S(50), S(5), S(50), S(50), S(75));
    g.addColorStop(0, '#4FC3F7');
    g.addColorStop(0.55, '#1E88C8');
    g.addColorStop(1, '#0D5A91');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, S(100), S(100), S(3));
    ctx.fill();
    const rnd = seeded(23);
    // little wave marks
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = S(0.35);
    ctx.lineCap = 'round';
    for (let k = 0; k < 60; k++) {
      const x = rnd() * 100, y = rnd() * 100, w = 1.5 + rnd() * 2;
      ctx.beginPath();
      ctx.arc(S(x - w), S(y), S(w), Math.PI * 1.15, Math.PI * 1.85);
      ctx.arc(S(x + w), S(y), S(w), Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    // tiny far-off islands in the corners
    for (const [x, y, r] of [[5, 6, 3.2], [95, 8, 2.6], [94, 94, 3.4], [6, 95, 2.4]]) {
      ctx.beginPath();
      ctx.ellipse(S(x), S(y), S(r * 1.4), S(r * 0.8), 0, 0, Math.PI * 2);
      ctx.fillStyle = '#F6DFA4';
      ctx.fill();
      emoji(ctx, '🌴', S(x), S(y - r * 0.6), S(r * 1.6));
    }
  },

  road(ctx, S, map) {
    // a dashed sea lane
    ctx.lineCap = 'round';
    routePath(ctx, S, map);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = S(7.4);
    ctx.stroke();
    routePath(ctx, S, map);
    ctx.setLineDash([S(1.2), S(1.6)]);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = S(0.5);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  cell(ctx, S, p, i, special) {
    ctx.beginPath();
    ctx.ellipse(S(p.x), S(p.y + 0.5), S(CELL_R + 0.5), S(CELL_R * 0.75), 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(S(p.x), S(p.y), S(CELL_R), 0, Math.PI * 2);
    ctx.fillStyle = special ? '#FFF3CF' : '#F6DFA4';
    ctx.fill();
    ctx.lineWidth = S(0.45);
    ctx.strokeStyle = '#C99A4A';
    ctx.stroke();
    if (!special) text(ctx, String(i), S(p.x), S(p.y) + S(0.1), S(2.2), '#A0742C');
  },

  ladder(ctx, S, curve) {
    // a dolphin's leap: a dashed arc with a splash at the end
    ctx.lineCap = 'round';
    curvePath(ctx, S, curve);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = S(1.3);
    ctx.setLineDash([S(1.6), S(1.1)]);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  slide(ctx, S, curve) {
    curvePath(ctx, S, curve);
    ctx.strokeStyle = 'rgba(200, 30, 60, 0.75)';
    ctx.lineWidth = S(1.2);
    ctx.setLineDash([S(1.6), S(1.1)]);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  top(ctx, S, curve, kind) {
    arrowHead(ctx, S, curve, 2, kind === 'ladder' ? '#FFFFFF' : 'rgba(200, 30, 60, 0.9)');
    const m = onCurve(curve, 0.5);
    emoji(ctx, kind === 'ladder' ? '🐬' : '🦈', S(m.x), S(m.y), S(4));
  },

  portal(ctx, S, p, colour) {
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(S(p.x), S(p.y), S(CELL_R + 0.5 + k * 0.7), k, k + Math.PI * 1.4);
      ctx.lineWidth = S(0.4);
      ctx.strokeStyle = k === 1 ? colour : 'rgba(255,255,255,0.8)';
      ctx.stroke();
    }
  },

  ends(ctx, S, map) {
    const s = map.cells[0], g = map.cells[map.goal];
    // harbour: a little wooden dock
    roundRect(ctx, S(s.x - 5.5), S(s.y - 4), S(11), S(8), S(1.5));
    ctx.fillStyle = '#B5793F';
    ctx.fill();
    ctx.strokeStyle = '#7A4A22';
    ctx.lineWidth = S(0.5);
    ctx.stroke();
    emoji(ctx, map.def.start.icon, S(s.x), S(s.y), S(5));
    // treasure island
    ctx.beginPath();
    ctx.ellipse(S(g.x), S(g.y + 0.8), S(8.5), S(6.5), 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(S(g.x), S(g.y), S(7.5), S(5.5), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F6DFA4';
    ctx.fill();
    emoji(ctx, '🌴', S(g.x - 3.8), S(g.y - 2.2), S(4.5));
    emoji(ctx, map.def.goal.icon, S(g.x + 1), S(g.y + 0.3), S(5));
  },

  // glinting sun on the water
  ambient(ctx, S, time) {
    const rnd = seeded(9);
    for (let k = 0; k < 18; k++) {
      const x = rnd() * 100, y = rnd() * 100;
      const a = Math.sin(time * 1.6 + k * 2.1);
      if (a < 0.4) continue;
      ctx.globalAlpha = (a - 0.4) * 1.2;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = S(0.3);
      ctx.beginPath();
      ctx.moveTo(S(x - 1), S(y));
      ctx.lineTo(S(x + 1), S(y));
      ctx.moveTo(S(x), S(y - 1));
      ctx.lineTo(S(x), S(y + 1));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
};
