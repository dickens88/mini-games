// Little bursts, sparkles and floating numbers. Positions are in tile units;
// floating text is drawn by the renderer in screen pixels so it stays crisp.

const MAX = 400;

export function createParticles(reducedMotion) {
  const bits = [];
  const texts = [];

  return {
    burst(x, y, colors, n = 8, speed = 1.6) {
      if (reducedMotion) n = Math.ceil(n / 3);
      for (let i = 0; i < n && bits.length < MAX; i++) {
        const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
        bits.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6,
          g: 3.2, life: 0, max: 0.35 + Math.random() * 0.35,
          r: 0.035 + Math.random() * 0.04, color: colors[i % colors.length]
        });
      }
    },
    // a soft white cloud, for bugs popping and towers packing up
    puff(x, y) {
      const n = reducedMotion ? 3 : 6;
      for (let i = 0; i < n && bits.length < MAX; i++) {
        const a = i / n * Math.PI * 2;
        bits.push({ x: x + Math.cos(a) * 0.08, y: y + Math.sin(a) * 0.06, vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.35 - 0.2,
          g: 0, life: 0, max: 0.45, r: 0.1, grow: true, color: 'rgba(255,255,255,.9)' });
      }
    },
    ring(x, y, r, color) {
      bits.push({ x, y, ring: r, life: 0, max: 0.4, color });
    },
    text(x, y, str, color) {
      texts.push({ x, y, str, color, life: 0, max: 0.9 });
    },
    update(dt) {
      for (let i = bits.length - 1; i >= 0; i--) {
        const p = bits[i];
        p.life += dt;
        if (!p.ring) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        if (p.life >= p.max) bits.splice(i, 1);
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        t.life += dt;
        t.y -= 0.6 * dt;
        if (t.life >= t.max) texts.splice(i, 1);
      }
    },
    drawBits(g) {
      for (const p of bits) {
        const k = 1 - p.life / p.max;
        g.globalAlpha = Math.max(0, k);
        if (p.ring) {
          g.strokeStyle = p.color;
          g.lineWidth = 0.05;
          g.beginPath(); g.arc(p.x, p.y, p.ring * (1.2 - k * 0.7), 0, Math.PI * 2); g.stroke();
        } else {
          g.fillStyle = p.color;
          const r = p.grow ? p.r * (1.6 - k * 0.8) : p.r * (0.5 + k * 0.5);
          g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill();
        }
      }
      g.globalAlpha = 1;
    },
    drawTexts(g, tile, font) {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `800 ${Math.max(12, tile * 0.32)}px ${font}`;
      for (const t of texts) {
        const k = t.life / t.max;
        g.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(16,10,28,.75)';
        g.strokeText(t.str, t.x * tile, t.y * tile);
        g.fillStyle = t.color;
        g.fillText(t.str, t.x * tile, t.y * tile);
      }
      g.globalAlpha = 1;
    },
    clear() { bits.length = 0; texts.length = 0; }
  };
}
