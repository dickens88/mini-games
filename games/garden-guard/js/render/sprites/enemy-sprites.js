// Enemy drawings, in tile units, seen from the side like little cartoon
// characters with three-tone shading. Each type has one function:
//   draw(g, x, y, facing, s, walk, opts)
//     facing  1 = walking right, -1 = walking left
//     s       the enemy's size from its data (≈ radius in tiles)
//     walk    animation phase, grows with distance walked
//     opts    { now, seed, squash (0..1 hit squash) }
// (x, y) is where the bug touches the ground.

import { INK, ellipse, circle, eye, cheek, blinkAt, toon } from '../kit.js';

// legs swing in a walk cycle: front and back pairs move opposite ways
function legs(g, s, walk, xs, hip) {
  g.strokeStyle = INK;
  g.lineWidth = s * 0.17;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  xs.forEach((lx, i) => {
    const ph = walk + (i % 2) * Math.PI;
    const swing = Math.sin(ph) * s * 0.22, lift = Math.max(0, Math.cos(ph)) * s * 0.12;
    g.beginPath();
    g.moveTo(lx * s, -hip * s);
    g.lineTo(lx * s + swing * 0.4, -hip * s * 0.45 - lift);
    g.lineTo(lx * s + swing, -lift);
    g.stroke();
  });
}

function antenna(g, x0, y0, x1, y1, r, wobble) {
  g.strokeStyle = INK;
  g.lineWidth = r * 0.75;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo(x1 - r * 3, y1 + r * 2 + wobble, x1, y1 + wobble);
  g.stroke();
  circle(g, x1, y1 + wobble, r);
  g.fillStyle = '#FF8FB8'; g.fill();
  g.lineWidth = r * 0.5; g.stroke();
}

// shared hop, squash and facing
function pose(g, x, y, facing, s, walk, opts, hop, drawFn) {
  const bounce = Math.abs(Math.sin(walk)) * s * hop;
  const sq = opts.squash || 0;
  g.save();
  g.translate(x, y);
  g.scale(facing * (1 + sq * 0.2), 1 - sq * 0.2);
  g.translate(0, -bounce);
  g.rotate(Math.sin(walk) * 0.05);
  drawFn();
  g.restore();
}

function ant(g, x, y, facing, s, walk, opts = {}) {
  pose(g, x, y, facing, s, walk, opts, 0.16, () => {
    const lag = Math.sin(walk - 0.6) * s * 0.06;   // antennae trail a beat behind
    legs(g, s, walk, [-0.45, -0.05, 0.35], 0.62);
    // abdomen
    toon(g, () => ellipse(g, -s * 0.78, -s * 0.78 + lag * 0.5, s * 0.62, s * 0.5, -0.25), '#D0603F', '#9A3E26',
      { off: s * 0.12, line: s * 0.14, hl: [-s * 0.9, -s * 1.02, s * 0.22, s * 0.1], light: 'rgba(255,220,200,.55)' });
    // waist
    toon(g, () => circle(g, -s * 0.08, -s * 0.66, s * 0.26), '#BC5236', '#8A3420', { off: s * 0.06, line: s * 0.14 });
    antenna(g, s * 0.5, -s * 1.45, s * 0.82, -s * 2.08, s * 0.12, lag);
    antenna(g, s * 0.72, -s * 1.42, s * 1.22, -s * 1.9, s * 0.12, lag * 1.3);
    // head
    toon(g, () => circle(g, s * 0.6, -s * 0.98, s * 0.56), '#DE6A47', '#A6432A',
      { off: s * 0.1, line: s * 0.14, hl: [s * 0.42, -s * 1.25, s * 0.18, s * 0.09], light: 'rgba(255,225,205,.6)' });
    eye(g, s * 0.78, -s * 1.1, s * 0.25, 1, 0.1, blinkAt(opts.now || 0, opts.seed || 0));
    cheek(g, s * 0.6, -s * 0.74, s * 0.13);
    g.strokeStyle = INK; g.lineWidth = s * 0.09; g.lineCap = 'round';
    g.beginPath(); g.arc(s * 0.98, -s * 0.8, s * 0.12, 0.1 * Math.PI, 0.8 * Math.PI); g.stroke();
  });
}

function ladybug(g, x, y, facing, s, walk, opts = {}) {
  pose(g, x, y, facing, s, walk * 1.3, opts, 0.08, () => {
    legs(g, s, walk * 1.3, [-0.5, -0.05, 0.4], 0.45);
    // head
    toon(g, () => circle(g, s * 0.78, -s * 0.58, s * 0.42), '#4A3A56', '#2A1E33', { off: s * 0.08, line: s * 0.14 });
    eye(g, s * 0.94, -s * 0.68, s * 0.21, 1, 0, blinkAt(opts.now || 0, opts.seed || 0));
    // shell dome
    const dome = () => {
      g.beginPath();
      g.moveTo(-s * 0.98, -s * 0.32);
      g.bezierCurveTo(-s * 0.98, -s * 1.56, s * 0.98, -s * 1.56, s * 0.98, -s * 0.32);
      g.quadraticCurveTo(0, -s * 0.18, -s * 0.98, -s * 0.32);
      g.closePath();
    };
    toon(g, dome, '#F25450', '#B3302E', { off: s * 0.14, line: s * 0.14 });
    g.strokeStyle = INK; g.lineWidth = s * 0.09;
    g.beginPath(); g.moveTo(s * 0.05, -s * 1.24); g.quadraticCurveTo(s * 0.1, -s * 0.72, s * 0.05, -s * 0.28); g.stroke();
    g.fillStyle = INK;
    for (const [sx, sy, r] of [[-0.52, -0.66, 0.17], [-0.25, -1.04, 0.13], [0.45, -0.75, 0.16], [0.42, -1.1, 0.1]]) {
      circle(g, sx * s, sy * s, r * s); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.55)';
    ellipse(g, -s * 0.4, -s * 1.12, s * 0.24, s * 0.09, -0.35); g.fill();
  });
}

export const ENEMY_SPRITES = { ant, lady: ladybug };

// a small standalone picture of an enemy, for the wave preview
export function enemyIcon(type, size, cssSize = 22) {
  const c = document.createElement('canvas');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(cssSize * dpr);
  const g = c.getContext('2d');
  const scale = cssSize * dpr * 0.36 / size;
  g.setTransform(scale, 0, 0, scale, c.width / 2, c.height / 2 + size * scale * 0.75);
  (ENEMY_SPRITES[type] || ant)(g, 0, 0, 1, size, 0.8, { now: 1000 });
  c.setAttribute('aria-hidden', 'true');
  return c;
}
