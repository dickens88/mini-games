// Shared drawing helpers. The art follows the Kingdom Rush recipe: a warm dark
// outline round everything, three tones per shape (shadow, base, highlight)
// with light from the top left, and soft contact shadows on the ground.
// All sizes are in tile units.

export const TAU = Math.PI * 2;
export const INK = '#33211C';      // outline colour (warm, not black)
const LINE = 0.045;         // outline width for characters
export const FLOWER_COLORS = ['#FF7EB0', '#FFD35C', '#B69CFF', '#FF9F43', '#FFFFFF'];

// deterministic noise in [0, 1)
export function hash(a, b) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function roundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// fill the current path, then outline it
export function ink(g, fill, width = LINE) {
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = width;
  g.strokeStyle = INK;
  g.lineJoin = 'round';
  g.stroke();
}

export function ellipse(g, x, y, rx, ry, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, TAU);
}

export function circle(g, x, y, r) {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
}

export function softShadow(g, x, y, rx, ry, alpha = 0.28) {
  g.fillStyle = `rgba(30,50,20,${alpha})`;
  ellipse(g, x, y, rx, ry);
  g.fill();
}

// a big cartoon eye; blink 0..1 closes it
export function eye(g, x, y, r, lookX = 0, lookY = 0, blink = 0) {
  if (blink > 0.5) {
    g.strokeStyle = INK;
    g.lineWidth = r * 0.35;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(x, y - r * 0.2, r * 0.75, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
    return;
  }
  circle(g, x, y, r);
  ink(g, '#FFFFFF', r * 0.28);
  g.fillStyle = INK;
  circle(g, x + lookX * r * 0.3, y + lookY * r * 0.3, r * 0.58);
  g.fill();
  g.fillStyle = '#FFFFFF';
  circle(g, x + lookX * r * 0.3 - r * 0.2, y + lookY * r * 0.3 - r * 0.22, r * 0.2);
  g.fill();
}

export function cheek(g, x, y, r) {
  g.fillStyle = 'rgba(255,120,150,.55)';
  ellipse(g, x, y, r, r * 0.7);
  g.fill();
}

// a short-lived closed-eye moment every few seconds, different per character
export function blinkAt(now, seed) {
  const t = (now / 1000 + seed * 1.37) % 4.2;
  return t < 0.13 ? 1 : 0;
}

// distance from a point to a polyline
export function distToPolyline(pts, x, y) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - a.x - dx * t, y - a.y - dy * t));
  }
  return best;
}

// Three-tone "toon" fill. `shape` builds the path (starting with beginPath).
// The whole shape is filled with the shadow tone, then the same shape nudged
// up-left fills the lit part, so a crescent of shadow stays on the
// bottom-right rim. `hl` = [x, y, rx, ry] adds a soft highlight.
export function toon(g, shape, base, dark, { light, hl, off = 0.05, line = LINE } = {}) {
  shape();
  g.fillStyle = dark;
  g.fill();
  g.save();
  shape();
  g.clip();
  g.translate(-off, -off * 1.2);
  shape();
  g.fillStyle = base;
  g.fill();
  if (hl) {
    g.translate(off, off * 1.2);
    g.fillStyle = light || 'rgba(255,255,255,.35)';
    ellipse(g, hl[0], hl[1], hl[2], hl[3], hl[4] || -0.4);
    g.fill();
  }
  g.restore();
  if (line) {
    shape();
    g.lineWidth = line;
    g.strokeStyle = INK;
    g.lineJoin = 'round';
    g.stroke();
  }
}

// colour helpers for the toon tones
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  const r = f(n >> 16), gg = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
}
