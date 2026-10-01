// Jungle Trek: a dirt trail of stepping stones through dense leaves; vines
// to climb, stripy snakes to slide down, stone temple gates.

import { roundRect, emoji, text, seeded, curvePath, onCurve, routePath, arrowHead, CELL_R } from '../kit.js';

const SNAKE_COLOURS = [['#F28C28', '#FFD25E'], ['#9B5DE5', '#F2C1FF'], ['#E63946', '#FFB4A2'], ['#2A9D8F', '#B8F2E6']];

export default {
  hideIcons: ['slide'],
  // what flies up when a pawn lands
  fx: { land: ['#C9A06A', '#E8D2A6', '#8A6235'], kind: 'puff', trail: '#B7F59A' },
  page: { top: '#2F8A57', bottom: '#BFE6A8', ink: '#123C25', accent: '#F2A93B' },

  background(ctx, S) {
    const g = ctx.createLinearGradient(0, 0, 0, S(100));
    g.addColorStop(0, '#1F6B43');
    g.addColorStop(1, '#2E8B53');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, S(100), S(100), S(3));
    ctx.fill();
    const rnd = seeded(11);
    // big soft leaves
    for (let k = 0; k < 70; k++) {
      const x = rnd() * 100, y = rnd() * 100, r = 3 + rnd() * 6, a = rnd() * Math.PI;
      ctx.save();
      ctx.translate(S(x), S(y));
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, 0, S(r), S(r * 0.45), 0, 0, Math.PI * 2);
      ctx.fillStyle = ['#2A7D4C', '#3A9A5C', '#195C38', '#4DAA63'][k % 4];
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#123C25';
      ctx.lineWidth = S(0.25);
      ctx.beginPath();
      ctx.moveTo(S(-r), 0);
      ctx.lineTo(S(r), 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // little flowers
    for (let k = 0; k < 26; k++) {
      const x = rnd() * 100, y = rnd() * 100;
      const col = ['#FF7FA8', '#FFD25E', '#FF9A4D', '#C99BFF'][k % 4];
      for (let p = 0; p < 5; p++) {
        const a = p / 5 * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(S(x + Math.cos(a) * 0.7), S(y + Math.sin(a) * 0.7), S(0.55), 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(S(x), S(y), S(0.4), 0, Math.PI * 2);
      ctx.fillStyle = '#FFF4C2';
      ctx.fill();
    }
  },

  road(ctx, S, map) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    routePath(ctx, S, map);
    ctx.strokeStyle = '#7A5530';
    ctx.lineWidth = S(7.6);
    ctx.stroke();
    routePath(ctx, S, map);
    ctx.strokeStyle = '#B98A55';
    ctx.lineWidth = S(6.4);
    ctx.stroke();
  },

  cell(ctx, S, p, i, special) {
    ctx.beginPath();
    ctx.arc(S(p.x), S(p.y), S(CELL_R), 0, Math.PI * 2);
    ctx.fillStyle = special ? '#FFF1D0' : '#E8D2A6';
    ctx.fill();
    ctx.lineWidth = S(0.45);
    ctx.strokeStyle = '#8A6235';
    ctx.stroke();
    if (!special) text(ctx, String(i), S(p.x), S(p.y) + S(0.1), S(2.2), '#8A6235');
  },

  ladder(ctx, S, curve) {
    // a twisting vine with leaves
    ctx.lineCap = 'round';
    curvePath(ctx, S, curve);
    ctx.strokeStyle = '#1D5B2E';
    ctx.lineWidth = S(1.5);
    ctx.stroke();
    curvePath(ctx, S, curve);
    ctx.strokeStyle = '#5BC25B';
    ctx.lineWidth = S(0.9);
    ctx.stroke();
    for (let t = 0.12; t < 0.9; t += 0.11) {
      const p = onCurve(curve, t), q = onCurve(curve, t + 0.01);
      const a = Math.atan2(q.y - p.y, q.x - p.x) + (Math.round(t * 100) % 2 ? 0.9 : -0.9);
      ctx.save();
      ctx.translate(S(p.x), S(p.y));
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(S(1.1), 0, S(1.2), S(0.5), 0, 0, Math.PI * 2);
      ctx.fillStyle = '#7ED957';
      ctx.fill();
      ctx.restore();
    }
  },

  slide(ctx, S, curve, k) {
    // a stripy snake: head at the top cell, tail at the bottom one
    const cols = SNAKE_COLOURS[k % SNAKE_COLOURS.length];
    const n = 46;
    const pts = [];
    for (let s = 0; s <= n; s++) {
      const t = s / n;
      const p = onCurve(curve, t), q = onCurve(curve, Math.min(1, t + 0.01));
      const nx = -(q.y - p.y), ny = q.x - p.x, l = Math.hypot(nx, ny) || 1;
      const w = Math.sin(t * Math.PI * 5) * 1.3 * (1 - t * 0.4);
      pts.push({ x: p.x + nx / l * w, y: p.y + ny / l * w, r: 1.35 * (1 - t * 0.65) + 0.25 });
    }
    for (let s = pts.length - 1; s >= 0; s--) {
      const p = pts[s];
      ctx.beginPath();
      ctx.arc(S(p.x), S(p.y), S(p.r), 0, Math.PI * 2);
      ctx.fillStyle = Math.floor(s / 3) % 2 ? cols[1] : cols[0];
      ctx.fill();
    }
  },

  // drawn over the cells: vine arrowheads and snake heads
  top(ctx, S, curve, kind, k) {
    if (kind === 'ladder') { arrowHead(ctx, S, curve, 2, '#3FA34D'); return; }
    const cols = SNAKE_COLOURS[k % SNAKE_COLOURS.length];
    const h = curve.a;
    ctx.beginPath();
    ctx.ellipse(S(h.x), S(h.y), S(2.3), S(2), 0, 0, Math.PI * 2);
    ctx.fillStyle = cols[0];
    ctx.fill();
    ctx.lineWidth = S(0.3);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();
    for (const dx of [-0.85, 0.85]) {
      ctx.beginPath();
      ctx.arc(S(h.x + dx), S(h.y - 0.5), S(0.65), 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(S(h.x + dx), S(h.y - 0.42), S(0.32), 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();
    }
    ctx.strokeStyle = '#E63946';
    ctx.lineWidth = S(0.3);
    ctx.beginPath();
    ctx.moveTo(S(h.x), S(h.y + 1.7));
    ctx.lineTo(S(h.x), S(h.y + 2.7));
    ctx.moveTo(S(h.x), S(h.y + 2.7));
    ctx.lineTo(S(h.x - 0.4), S(h.y + 3.1));
    ctx.moveTo(S(h.x), S(h.y + 2.7));
    ctx.lineTo(S(h.x + 0.4), S(h.y + 3.1));
    ctx.stroke();
  },

  portal(ctx, S, p, colour) {
    ctx.beginPath();
    ctx.arc(S(p.x), S(p.y), S(CELL_R + 0.9), 0, Math.PI * 2);
    ctx.lineWidth = S(1);
    ctx.strokeStyle = '#8D8D8D';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(S(p.x), S(p.y), S(CELL_R + 0.9), 0, Math.PI * 2);
    ctx.lineWidth = S(0.45);
    ctx.strokeStyle = colour;
    ctx.stroke();
  },

  ends(ctx, S, map) {
    for (const [i, info] of [[0, map.def.start], [map.goal, map.def.goal]]) {
      const p = map.cells[i];
      ctx.beginPath();
      ctx.arc(S(p.x), S(p.y), S(5), 0, Math.PI * 2);
      ctx.fillStyle = i ? '#FFD56B' : '#FFF1D0';
      ctx.fill();
      ctx.lineWidth = S(0.7);
      ctx.strokeStyle = '#8A6235';
      ctx.stroke();
      emoji(ctx, info.icon, S(p.x), S(p.y), S(5));
    }
  },

  // fireflies
  ambient(ctx, S, time) {
    const rnd = seeded(5);
    for (let k = 0; k < 14; k++) {
      const x = rnd() * 100 + Math.sin(time * 0.5 + k) * 3, y = rnd() * 100 + Math.cos(time * 0.4 + k * 2) * 3;
      const a = 0.25 + 0.35 * Math.sin(time * 2 + k * 1.3);
      ctx.beginPath();
      ctx.arc(S(x), S(y), S(0.5), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 245, 160, ${Math.max(0, a)})`;
      ctx.fill();
    }
  }
};
