// The two powers' little characters: a sleepy rain cloud and a bee. Used on
// the map while a power is working and on the power buttons.

import { TAU, INK, ink, ellipse, circle, toon } from '../kit.js';

// (x, y) is the middle of the cloud; s scales it (1 = map size)
export function drawCloud(g, x, y, s = 1) {
  const blobs = [[-0.42, 0.06, 0.3], [0.4, 0.08, 0.3], [-0.12, -0.12, 0.38], [0.18, -0.05, 0.34]];
  const shape = () => {
    g.beginPath();
    for (const [dx, dy, r] of blobs) { g.moveTo(x + (dx + r) * s, y + dy * s); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); }
  };
  shape(); g.lineWidth = 0.08 * s; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
  toon(g, shape, '#F2F6FF', '#AEBBD6', { off: 0.06 * s, line: 0 });
  g.strokeStyle = INK; g.lineWidth = 0.035 * s; g.lineCap = 'round';
  for (const dx of [-0.14, 0.12]) { g.beginPath(); g.arc(x + dx * s, y - 0.02 * s, 0.04 * s, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); }
  g.fillStyle = 'rgba(255,120,150,.5)';
  ellipse(g, x - 0.24 * s, y + 0.06 * s, 0.05 * s, 0.03 * s); g.fill();
  ellipse(g, x + 0.22 * s, y + 0.06 * s, 0.05 * s, 0.03 * s); g.fill();
}

// face 1 = flying right; flap 0..1
export function drawBee(g, x, y, face = 1, flap = 1, s = 1) {
  g.save();
  g.translate(x, y); g.scale(face * s, s);
  g.fillStyle = 'rgba(240,250,255,.85)';
  ellipse(g, -0.01, -0.07, 0.05, 0.035 * (0.3 + flap * 0.7), -0.4); g.fill();
  g.strokeStyle = INK; g.lineWidth = 0.012; g.stroke();
  ellipse(g, 0, 0, 0.08, 0.06);
  ink(g, '#FFD23F', 0.022);
  g.fillStyle = INK;
  g.fillRect(-0.03, -0.055, 0.025, 0.11);
  circle(g, 0.065, -0.01, 0.015); g.fill();
  g.restore();
}

// a small standalone picture of a power, for its button and intro card
export function powerIcon(id, cssSize = 40) {
  const c = document.createElement('canvas');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(cssSize * dpr);
  const g = c.getContext('2d');
  const s = cssSize * dpr;
  g.setTransform(s, 0, 0, s, 0, 0);
  if (id === 'rain') {
    g.strokeStyle = '#7FB8FF'; g.lineWidth = 0.035; g.lineCap = 'round';
    for (const [x, y] of [[0.3, 0.68], [0.5, 0.74], [0.7, 0.66], [0.4, 0.86], [0.6, 0.88]]) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 0.02, y + 0.08); g.stroke();
    }
    drawCloud(g, 0.5, 0.42, 0.52);
  } else {
    drawBee(g, 0.32, 0.36, 1, 1, 2.2);
    drawBee(g, 0.68, 0.48, -1, 0.4, 2.6);
    drawBee(g, 0.4, 0.74, 1, 0.7, 2);
  }
  c.setAttribute('aria-hidden', 'true');
  return c;
}
