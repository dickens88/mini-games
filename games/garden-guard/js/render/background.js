// Paints everything on the map that never moves: painterly lawn, a dirt road
// with ragged edges, build plots, trees and rocks framing the map, the bugs'
// anthill and the garden bed. Called once per level and canvas size; the
// result is cached as an image. Everything is in tile units.

import { COLS, ROWS } from '../config.js';
import { readGrid } from '../core/path.js';
import { TAU, INK, FLOWER_COLORS, hash, roundRect, ink, ellipse, circle, softShadow, toon, distToPolyline } from './kit.js';

const ROAD_R = 0.43;   // half width of the road

const DIRT = { lip: '#8A6440', rim: '#A97E4E', base: '#D9B57E' };

// colours that change with the level's season
const THEMES = {
  spring: {
    grass: '#9CC152', patchLight: 'rgba(187,217,110,.32)', patchDark: 'rgba(110,150,50,.22)',
    strokeDark: 'rgba(100,145,45,.35)', strokeLight: 'rgba(205,230,130,.4)',
    tuft: '#6E9A36', tuftLight: 'rgba(200,230,120,.7)',
    trees: [['#6FA035', '#4C7A23', 'rgba(190,225,110,.55)'], ['#7DAE3B', '#557F25', 'rgba(205,235,120,.55)']],
    bushes: ['#6FA035', '#86B444', '#4C7A23'], fruit: '#E8423E',
    warm: 'rgba(255,236,170,.14)', leaves: 0
  },
  autumn: {
    grass: '#B5B04A', patchLight: 'rgba(230,205,110,.32)', patchDark: 'rgba(140,120,40,.22)',
    strokeDark: 'rgba(140,120,40,.35)', strokeLight: 'rgba(240,215,130,.4)',
    tuft: '#8F8A30', tuftLight: 'rgba(235,215,120,.7)',
    trees: [['#E8892F', '#B35A1C', 'rgba(255,210,140,.55)'], ['#D65A3A', '#9C3622', 'rgba(255,190,150,.55)'], ['#E8B83A', '#B0811C', 'rgba(255,235,160,.55)']],
    bushes: ['#C9702A', '#D99A3A', '#8E4A1C'], fruit: '#8E2C26',
    warm: 'rgba(255,190,120,.18)', leaves: 160
  }
};
let P = THEMES.spring;

export function paintMap(b, state) {
  const level = state.level;
  P = THEMES[level.theme] || THEMES.spring;
  const seed = [...level.id].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) | 0, 7);
  let i = 0;
  const rnd = () => hash(seed, i++);
  const roadDist = (x, y) => Math.min(...state.paths.map(p => distToPolyline(p.points, x, y)));
  const { pads, road } = readGrid(level.grid);
  const padDist = (x, y) => Math.min(9, ...pads.map(p => Math.hypot(p.c + 0.5 - x, p.r + 0.5 - y)));

  lawn(b, rnd, roadDist);
  roadway(b, state, rnd, roadDist);
  for (const pad of pads) plotBed(b, pad.c + 0.5, pad.r + 0.5, rnd);
  for (const cell of road.filter(c => c.ch === 'S')) anthill(b, cell);
  for (const cell of road.filter(c => c.ch === 'E')) gardenBed(b, cell);

  // decorations: the ones the level asks for, then trees and rocks scattered
  // round the edges so the map feels framed by a garden
  const decor = [];
  level.grid.forEach((row, r) => [...row].forEach((chr, c) => {
    const x = c + 0.5, y = r + 0.5;
    if (chr === 't') decor.push({ kind: 'tree', x, y });
    else if (chr === 'f') decor.push({ kind: 'flowers', x, y });
    else if (chr === 'r') decor.push({ kind: 'rock', x, y });
    else if (chr === 'm') decor.push({ kind: 'mushrooms', x, y });
    else if (chr === 'p') decor.push({ kind: 'pumpkin', x, y });
    else if (chr === '.') {
      const edge = c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1;
      const jx = x + (rnd() - 0.5) * 0.4, jy = y + (rnd() - 0.5) * 0.3;
      const rd = roadDist(jx, jy), pd = padDist(jx, jy), roll = rnd();
      if (edge && rd > 1.05 && pd > 0.95 && roll < 0.55) decor.push({ kind: 'tree', x: jx, y: jy });
      else if (rd > 0.8 && pd > 0.8 && roll < (edge ? 0.75 : 0.22)) {
        const k = rnd();
        const kind = k < 0.35 ? 'bush' : k < 0.6 ? 'rock' : k < 0.85 ? (level.theme === 'autumn' ? 'pumpkin' : 'flowers') : 'mushrooms';
        decor.push({ kind, x: jx, y: jy });
      }
    }
  }));
  // a few trees leaning in from outside the map, like the edge of a wood
  for (let k = 0; k < 7; k++) {
    const side = Math.floor(rnd() * 4);
    const x = side < 2 ? rnd() * COLS : side === 2 ? -0.15 : COLS + 0.15;
    const y = side >= 2 ? rnd() * ROWS : side === 0 ? -0.1 : ROWS + 0.25;
    if (roadDist(x, y) > 1.1 && padDist(x, y) > 1) decor.push({ kind: 'tree', x, y });
  }
  decor.sort((a, b2) => a.y - b2.y);
  for (const d of decor) DECOR[d.kind](b, d.x, d.y, hash(Math.round(d.x * 97), Math.round(d.y * 89) + seed));

  lighting(b);
}

/* ---------- lawn ---------- */
function lawn(b, rnd, roadDist) {
  b.fillStyle = P.grass;
  b.fillRect(-1, -1, COLS + 2, ROWS + 2);

  // big soft patches of light and shade
  for (let k = 0; k < 70; k++) {
    const x = rnd() * COLS, y = rnd() * ROWS, r = 0.4 + rnd() * 1.0;
    b.fillStyle = rnd() < 0.5 ? P.patchLight : P.patchDark;
    b.beginPath();
    for (let j = 0; j < 4; j++) {
      const cx = x + (rnd() - 0.5) * r * 1.2, cy = y + (rnd() - 0.5) * r * 0.6, rr = r * (0.35 + rnd() * 0.35);
      b.moveTo(cx + rr, cy);
      b.ellipse(cx, cy, rr, rr * 0.7, 0, 0, TAU);
    }
    b.fill();
  }

  // brush strokes
  b.lineCap = 'round';
  for (let k = 0; k < 520; k++) {
    const x = rnd() * COLS, y = rnd() * ROWS;
    if (roadDist(x, y) < ROAD_R) continue;
    const a = -0.5 + rnd() * 0.5, l = 0.08 + rnd() * 0.12;
    b.strokeStyle = rnd() < 0.55 ? P.strokeDark : P.strokeLight;
    b.lineWidth = 0.035;
    b.beginPath();
    b.moveTo(x, y);
    b.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y - 0.04, x + Math.cos(a) * l, y + Math.sin(a) * l);
    b.stroke();
  }

  for (let k = 0; k < 110; k++) {
    const x = rnd() * COLS, y = rnd() * ROWS;
    if (roadDist(x, y) < ROAD_R + 0.1) continue;
    tuft(b, x, y, 0.7 + rnd() * 0.6);
  }

  // fallen leaves in autumn
  for (let k = 0; k < P.leaves; k++) {
    const x = rnd() * COLS, y = rnd() * ROWS;
    const onRoad = roadDist(x, y) < ROAD_R;
    if (onRoad && rnd() < 0.6) continue;
    b.save();
    b.translate(x, y);
    b.rotate(rnd() * TAU);
    b.globalAlpha = onRoad ? 0.7 : 0.85;
    b.beginPath();
    b.moveTo(-0.07, 0); b.quadraticCurveTo(0, -0.05, 0.07, 0); b.quadraticCurveTo(0, 0.05, -0.07, 0);
    b.fillStyle = ['#E8892F', '#D65A3A', '#E8B83A', '#C9702A'][Math.floor(rnd() * 4)];
    b.fill();
    b.restore();
  }
}

function tuft(b, x, y, s) {
  b.fillStyle = P.tuft;
  b.beginPath();
  b.moveTo(x - 0.09 * s, y);
  b.quadraticCurveTo(x - 0.08 * s, y - 0.1 * s, x - 0.11 * s, y - 0.17 * s);
  b.quadraticCurveTo(x - 0.03 * s, y - 0.1 * s, x, y - 0.2 * s);
  b.quadraticCurveTo(x + 0.03 * s, y - 0.1 * s, x + 0.11 * s, y - 0.16 * s);
  b.quadraticCurveTo(x + 0.08 * s, y - 0.08 * s, x + 0.09 * s, y);
  b.closePath();
  b.fill();
  b.fillStyle = P.tuftLight;
  b.beginPath();
  b.moveTo(x - 0.02 * s, y - 0.02 * s);
  b.quadraticCurveTo(x - 0.02 * s, y - 0.12 * s, x, y - 0.17 * s);
  b.quadraticCurveTo(x + 0.01 * s, y - 0.08 * s, x + 0.02 * s, y - 0.02 * s);
  b.fill();
}

/* ---------- road ---------- */
// the road is hundreds of overlapping circles, which gives it a soft, uneven edge
function roadBlobs(b, state, rnd, r, jitter, color, dy = 0) {
  b.fillStyle = color;
  for (const p of state.paths) {
    b.beginPath();
    for (const s of p.segs) {
      for (let d = 0; d <= s.l; d += 0.09) {
        const t = d / s.l;
        const x = s.a.x + (s.b.x - s.a.x) * t, y = s.a.y + (s.b.y - s.a.y) * t + dy;
        const rr = r + (rnd() - 0.5) * jitter;
        b.moveTo(x + rr, y);
        b.arc(x, y, rr, 0, TAU);
      }
    }
    b.fill();
  }
}

function roadway(b, state, rnd, roadDist) {
  roadBlobs(b, state, rnd, ROAD_R + 0.04, 0.05, 'rgba(60,80,25,.25)', 0.08);  // shade on the grass
  roadBlobs(b, state, rnd, ROAD_R + 0.02, 0.06, DIRT.lip, 0.045);             // lower lip
  roadBlobs(b, state, rnd, ROAD_R, 0.06, DIRT.rim);
  roadBlobs(b, state, rnd, ROAD_R - 0.07, 0.05, DIRT.base);

  for (let k = 0; k < 1100; k++) {
    const x = rnd() * COLS, y = rnd() * ROWS;
    if (roadDist(x, y) > ROAD_R - 0.1) continue;
    const r = rnd();
    b.fillStyle = r < 0.45 ? 'rgba(196,154,99,.55)' : r < 0.85 ? 'rgba(236,208,156,.6)' : 'rgba(150,110,70,.5)';
    ellipse(b, x, y, 0.025 + rnd() * 0.05, 0.015 + rnd() * 0.03, rnd() * 0.6 - 0.3);
    b.fill();
  }
  for (let k = 0; k < 120; k++) {
    const x = rnd() * COLS, y = rnd() * ROWS;
    if (roadDist(x, y) > ROAD_R - 0.12) continue;
    ellipse(b, x, y, 0.035, 0.025);
    ink(b, rnd() < 0.5 ? '#E2D8C4' : '#BFB39C', 0.016);
  }
  // grass creeping over the edges
  for (const p of state.paths) {
    for (const s of p.segs) {
      const nx = -(s.b.y - s.a.y) / s.l, ny = (s.b.x - s.a.x) / s.l;
      for (let d = rnd() * 0.3; d < s.l; d += 0.18 + rnd() * 0.32) {
        const t = d / s.l, cx = s.a.x + (s.b.x - s.a.x) * t, cy = s.a.y + (s.b.y - s.a.y) * t;
        const side = rnd() < 0.5 ? -1 : 1, off = ROAD_R - 0.02 + rnd() * 0.05;
        const x = cx + nx * side * off, y = cy + ny * side * off + 0.03;
        if (roadDist(x, y) < ROAD_R - 0.08) continue;
        if (rnd() < 0.7) tuft(b, x, y, 0.65 + rnd() * 0.4);
      }
    }
  }
}

/* ---------- plots, anthill, garden ---------- */
// dug earth with a raised lip and a few stones — "you can build here"
function plotBed(b, x, y, rnd) {
  softShadow(b, x + 0.03, y + 0.12, 0.44, 0.2, 0.3);
  ellipse(b, x, y + 0.06, 0.39, 0.24);
  ink(b, '#6B4A2C', 0.04);
  toon(b, () => ellipse(b, x, y, 0.38, 0.22), '#9C6C42', '#7E5534',
    { hl: [x - 0.1, y - 0.08, 0.13, 0.04], light: 'rgba(255,225,180,.3)', off: 0.03, line: 0.04 });
  b.strokeStyle = 'rgba(70,40,20,.35)';
  b.lineWidth = 0.025;
  b.lineCap = 'round';
  for (let k = -1; k <= 1; k++) {
    b.beginPath(); b.moveTo(x - 0.22 + Math.abs(k) * 0.06, y + k * 0.08); b.lineTo(x + 0.22 - Math.abs(k) * 0.06, y + k * 0.08); b.stroke();
  }
  for (const [dx, dy] of [[-0.36, 0.08], [0.33, 0.13], [0.3, -0.12], [-0.25, -0.16]]) {
    if (rnd() < 0.25) continue;
    toon(b, () => ellipse(b, x + dx, y + dy, 0.07, 0.05), '#D6CDBB', '#A99E89', { off: 0.015, line: 0.022 });
  }
}

function anthill(b, cell) {
  const x = cell.c === 0 ? 0.25 : cell.c === COLS - 1 ? COLS - 0.25 : cell.c + 0.5;
  const y = (cell.r === 0 ? 0.25 : cell.r === ROWS - 1 ? ROWS - 0.25 : cell.r + 0.5) + 0.05;
  softShadow(b, x + 0.06, y + 0.3, 0.7, 0.22, 0.3);
  const mound = () => {
    b.beginPath();
    b.moveTo(x - 0.62, y + 0.3);
    b.bezierCurveTo(x - 0.55, y - 0.45, x + 0.55, y - 0.5, x + 0.62, y + 0.3);
    b.quadraticCurveTo(x, y + 0.42, x - 0.62, y + 0.3);
    b.closePath();
  };
  toon(b, mound, '#C79058', '#98673A', { hl: [x - 0.22, y - 0.18, 0.18, 0.07], light: 'rgba(255,230,190,.35)', off: 0.06 });
  b.fillStyle = 'rgba(120,80,40,.45)';
  for (let k = 0; k < 14; k++) { circle(b, x - 0.45 + hash(k, 3) * 0.9, y - 0.1 + hash(3, k) * 0.35, 0.02); b.fill(); }
  ellipse(b, x, y + 0.08, 0.24, 0.2);
  ink(b, '#2A1810', 0.045);
  ellipse(b, x + 0.03, y + 0.12, 0.15, 0.12);
  b.fillStyle = '#140B07'; b.fill();
}

function gardenBed(b, cell) {
  const x = cell.c, y = cell.r;
  softShadow(b, x + 0.5, y + 0.95, 0.6, 0.14, 0.35);
  // wooden box: soil on top, planks on the front
  roundRect(b, x + 0.04, y + 0.62, 0.92, 0.32, 0.06);
  ink(b, '#9A6436');
  b.strokeStyle = 'rgba(60,30,10,.4)'; b.lineWidth = 0.02;
  b.beginPath(); b.moveTo(x + 0.08, y + 0.78); b.lineTo(x + 0.92, y + 0.78); b.stroke();
  roundRect(b, x + 0.04, y + 0.1, 0.92, 0.6, 0.1);
  ink(b, '#5C3920');
  roundRect(b, x + 0.11, y + 0.16, 0.78, 0.48, 0.08);
  b.fillStyle = '#4A2D17'; b.fill();
}

/* ---------- decorations ---------- */
function canopy(b, blobs, base, dark, light) {
  const shape = () => {
    b.beginPath();
    for (const [cx, cy, r] of blobs) { b.moveTo(cx + r, cy); b.arc(cx, cy, r, 0, TAU); }
  };
  // one outline round the whole cluster: a wide stroke underneath the fill
  shape();
  b.lineWidth = 0.09;
  b.strokeStyle = INK;
  b.lineJoin = 'round';
  b.stroke();
  toon(b, shape, base, dark, { off: 0.07, line: 0 });
  b.fillStyle = light;
  for (const [cx, cy, r] of blobs) { ellipse(b, cx - r * 0.3, cy - r * 0.4, r * 0.35, r * 0.2, -0.4); b.fill(); }
}

function tree(b, x, y, n) {
  const s = 0.85 + n * 0.35;
  softShadow(b, x + 0.12 * s, y + 0.2, 0.55 * s, 0.18 * s, 0.32);
  toon(b, () => { b.beginPath(); b.moveTo(x - 0.08, y + 0.2); b.lineTo(x - 0.06, y - 0.15); b.lineTo(x + 0.06, y - 0.15); b.lineTo(x + 0.09, y + 0.2); b.closePath(); },
    '#8A5A34', '#5E3B22', { off: 0.03, line: 0.04 });
  const tone = P.trees[Math.floor(n * 7919) % P.trees.length];
  canopy(b, [
    [x - 0.26 * s, y - 0.22 * s, 0.25 * s],
    [x + 0.25 * s, y - 0.24 * s, 0.26 * s],
    [x, y - 0.47 * s, 0.31 * s],
    [x, y - 0.2 * s, 0.29 * s]
  ], tone[0], tone[1], tone[2]);
  if (n > 0.7) {
    for (const [dx, dy] of [[-0.18, -0.3], [0.2, -0.38], [0.04, -0.15]]) { circle(b, x + dx * s, y + dy * s, 0.045); ink(b, P.fruit, 0.02); }
  }
}

function bush(b, x, y, n) {
  softShadow(b, x + 0.05, y + 0.12, 0.34, 0.1, 0.3);
  canopy(b, [[x - 0.14, y - 0.02, 0.15], [x + 0.14, y - 0.01, 0.15], [x, y - 0.12, 0.18]],
    n < 0.5 ? P.bushes[0] : P.bushes[1], P.bushes[2], 'rgba(255,240,170,.45)');
  if (n > 0.55) for (const [dx, dy] of [[-0.1, -0.08], [0.12, -0.04], [0.02, -0.18]]) { circle(b, x + dx, y + dy, 0.035); ink(b, n > 0.8 ? '#B69CFF' : '#FFFFFF', 0.016); }
}

function rock(b, x, y, n) {
  const s = 0.7 + n * 0.5;
  softShadow(b, x + 0.05, y + 0.08 * s, 0.3 * s, 0.09 * s, 0.32);
  toon(b, () => {
    b.beginPath();
    b.moveTo(x - 0.26 * s, y + 0.08 * s);
    b.lineTo(x - 0.2 * s, y - 0.12 * s);
    b.lineTo(x - 0.02 * s, y - 0.22 * s);
    b.lineTo(x + 0.2 * s, y - 0.14 * s);
    b.lineTo(x + 0.27 * s, y + 0.06 * s);
    b.quadraticCurveTo(x, y + 0.14 * s, x - 0.26 * s, y + 0.08 * s);
    b.closePath();
  }, '#B7AE9C', '#857B69', { hl: [x - 0.08 * s, y - 0.12 * s, 0.1 * s, 0.04 * s], light: 'rgba(255,255,255,.45)', off: 0.05 * s });
  if (n > 0.5) { b.fillStyle = 'rgba(110,160,60,.85)'; ellipse(b, x + 0.06 * s, y - 0.17 * s, 0.1 * s, 0.035 * s); b.fill(); }
}

function flowers(b, x, y, n) {
  for (let k = 0; k < 4; k++) {
    const fx = x + (hash(k, n * 9973) - 0.5) * 0.6, fy = y + (hash(n * 9973, k) - 0.5) * 0.45;
    b.strokeStyle = '#4E8A2E'; b.lineWidth = 0.03; b.lineCap = 'round';
    b.beginPath(); b.moveTo(fx, fy + 0.14); b.lineTo(fx, fy); b.stroke();
    const col = FLOWER_COLORS[(k + Math.floor(n * 10)) % FLOWER_COLORS.length];
    b.beginPath();
    for (let j = 0; j < 5; j++) {
      const a = j / 5 * TAU;
      b.moveTo(fx + Math.cos(a) * 0.05 + 0.04, fy + Math.sin(a) * 0.05);
      b.arc(fx + Math.cos(a) * 0.05, fy + Math.sin(a) * 0.05, 0.04, 0, TAU);
    }
    ink(b, col, 0.018);
    circle(b, fx, fy, 0.025); ink(b, '#FFD35C', 0.012);
  }
}

function mushrooms(b, x, y, n) {
  for (const [dx, dy, s] of [[-0.08, 0.02, 1], [0.15, 0.1, 0.7]]) {
    const mx = x + dx, my = y + dy;
    softShadow(b, mx + 0.03, my + 0.15 * s, 0.14 * s, 0.04 * s, 0.3);
    roundRect(b, mx - 0.055 * s, my - 0.04 * s, 0.11 * s, 0.19 * s, 0.04 * s);
    ink(b, '#F6EAD2', 0.025);
    toon(b, () => { b.beginPath(); b.ellipse(mx, my - 0.03 * s, 0.18 * s, 0.14 * s, 0, Math.PI, TAU); b.closePath(); },
      n > 0.5 ? '#E8523E' : '#A98BF0', n > 0.5 ? '#B53A2C' : '#7E62C8', { off: 0.03 * s, line: 0.03 });
    b.fillStyle = '#FFFFFF';
    circle(b, mx - 0.07 * s, my - 0.09 * s, 0.025 * s); b.fill();
    circle(b, mx + 0.05 * s, my - 0.12 * s, 0.02 * s); b.fill();
  }
}

// a round orange pumpkin with a curly stalk
function pumpkin(b, x, y, n) {
  const s = 0.75 + n * 0.45;
  softShadow(b, x + 0.04, y + 0.1 * s, 0.24 * s, 0.07 * s, 0.3);
  const body = () => {
    b.beginPath();
    for (const [dx, r] of [[-0.11, 0.13], [0.11, 0.13], [0, 0.15]]) { b.moveTo(x + dx * s + r * s, y - 0.06 * s); b.ellipse(x + dx * s, y - 0.06 * s, r * s, 0.13 * s, 0, 0, TAU); }
  };
  body(); b.lineWidth = 0.05; b.strokeStyle = INK; b.stroke();
  toon(b, body, '#F2953A', '#C2621E', { off: 0.03 * s, line: 0, hl: [x - 0.08 * s, y - 0.12 * s, 0.05 * s, 0.025 * s], light: 'rgba(255,230,180,.6)' });
  b.strokeStyle = 'rgba(150,70,20,.6)'; b.lineWidth = 0.02;
  for (const dx of [-0.06, 0.06]) { b.beginPath(); b.moveTo(x + dx * s, y - 0.18 * s); b.quadraticCurveTo(x + dx * 1.6 * s, y - 0.06 * s, x + dx * s, y + 0.06 * s); b.stroke(); }
  toon(b, () => roundRect(b, x - 0.025 * s, y - 0.27 * s, 0.05 * s, 0.09 * s, 0.02), '#6E8A2E', '#4C6420', { off: 0.01, line: 0.025 });
  b.strokeStyle = '#5E9E33'; b.lineWidth = 0.018;
  b.beginPath(); b.moveTo(x, y - 0.24 * s); b.quadraticCurveTo(x + 0.1 * s, y - 0.32 * s, x + 0.12 * s, y - 0.22 * s); b.stroke();
}

const DECOR = { tree, bush, rock, flowers, mushrooms, pumpkin };

/* ---------- light ---------- */
function lighting(b) {
  const warm = b.createLinearGradient(0, 0, COLS * 0.7, ROWS);
  warm.addColorStop(0, P.warm);
  warm.addColorStop(1, 'rgba(255,236,170,0)');
  b.fillStyle = warm;
  b.fillRect(0, 0, COLS, ROWS);
  const v = b.createRadialGradient(COLS / 2, ROWS / 2, ROWS * 0.5, COLS / 2, ROWS / 2, COLS * 0.64);
  v.addColorStop(0, 'rgba(30,40,10,0)');
  v.addColorStop(1, 'rgba(30,40,10,.3)');
  b.fillStyle = v;
  b.fillRect(0, 0, COLS, ROWS);
}
