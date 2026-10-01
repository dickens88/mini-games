// The levels. Each one is built from its number, so level 37 is the same
// board for everyone, every time. A level is a shape (which cells hold a
// bubble) plus a way of painting colours onto it; both get harder as you go.
//
// Adding a shape: add a mask to SHAPES and put it in ORDER.

import { COLS, D, W, BUDDIES } from '../config.js';
import { makeRng, next, int, shuffle } from '../core/rng.js';
import { createGrid, put, cellX, rowLen, get, neighbors, each, count, clear } from '../core/grid.js';
import { floating } from '../core/match.js';

export const LEVEL_COUNT = 100;
export const THEMES = ['meadow', 'lagoon', 'starry'];

// mask(u, v, x, r, rows): u ∈ [0,1] across the board, v ∈ [0,1] top to bottom, x in board units
const SHAPES = {
  full: () => true,
  funnel: (u, v) => Math.abs(u - 0.5) <= 0.52 - v * 0.34,
  diamond: (u, v) => Math.abs(u - 0.5) * 2 + Math.abs(v - 0.45) * 1.6 <= 1.02 || v < 0.12,
  heart: (u, v) => {
    const x = (u - 0.5) * 2.7, y = 1.05 - v * 2.15;
    return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;
  },
  chains: (u, v, x, r) => r < 2 || Math.abs((x % 120) - 60) <= 22,
  islands: (u, v, x, r) => {
    if (r < 1) return true;
    const blobs = [[0.2, 0.62], [0.5, 0.8], [0.8, 0.62]];
    return blobs.some(([bu, bv]) => {
      if (v < bv && Math.abs(x - bu * W) <= 22) return true;      // the stem
      return ((u - bu) * 1.0) ** 2 + ((v - bv) * 0.55) ** 2 <= 0.019;
    });
  },
  zigzag: (u, v, x, r) => r < 1 || Math.abs(u - (0.5 + 0.32 * Math.sin(v * Math.PI * 2.2))) < 0.2,
  arch: (u, v) => ((u - 0.5) / 0.3) ** 2 + ((v - 1.05) / 0.62) ** 2 > 1,
  twins: (u, v, x, r) => r < 2 || Math.abs(u - 0.27) < 0.16 + v * 0.05 || Math.abs(u - 0.73) < 0.16 + v * 0.05,
  wave: (u, v) => v <= 0.62 + 0.36 * Math.cos(u * Math.PI * 3)
};

// how colours are laid on: cluster (blobs), bands (columns), rows (stripes), blocks, rings
const ORDER = [
  ['full', 'cluster'], ['funnel', 'rows'], ['heart', 'cluster'], ['chains', 'bands'],
  ['diamond', 'rings'], ['full', 'blocks'], ['islands', 'cluster'], ['zigzag', 'rows'],
  ['wave', 'bands'], ['arch', 'cluster'], ['twins', 'rings'], ['full', 'rows']
];

export function levelSpec(n) {
  const [shape, paint] = n === 1 ? ['full', 'rows'] : ORDER[(n - 1) % ORDER.length];
  return {
    n, shape, paint,
    colors: n <= 4 ? 3 : n <= 14 ? 4 : n <= 34 ? 5 : 6,
    rows: Math.min(9, 6 + Math.floor((n - 1) / 12)),
    pushEvery: n <= 8 ? 8 : n <= 30 ? 7 : n <= 60 ? 6 : 5,
    gifts: n < 3 ? 0 : n < 25 ? 1 : 2,
    clump: Math.max(0.22, 0.55 - n * 0.004),  // how often a bubble copies its neighbour's colour
    noise: Math.min(0.55, 0.08 + n * 0.006),   // how often a patterned bubble gets a random colour instead
    theme: THEMES[Math.floor((n - 1) / 10) % THEMES.length],
    seed: 7919 * n + 104729
  };
}

// → { grid, colors, par, pushEvery, theme }, cells without ids (the game hands those out)
export function buildLevel(n) {
  const spec = levelSpec(n);
  const s = makeRng(spec.seed);
  const palette = shuffle(s, BUDDIES.map((_, i) => i)).slice(0, spec.colors);
  const g = createGrid();
  const mask = SHAPES[spec.shape];

  for (let r = 0; r < spec.rows; r++) {
    for (let c = 0; c < rowLen(g, r); c++) {
      const x = cellX(g, r, c);
      const u = (x - D / 2) / (W - D), v = spec.rows > 1 ? r / (spec.rows - 1) : 0;
      if (mask(u, v, x, r, spec.rows)) put(g, r, c, { color: -1 });
    }
  }
  // anything that can't reach the ceiling would just fall on the first shot
  for (const [r, c] of floating(g)) clear(g, r, c);

  paintGrid(g, s, spec, palette);
  addGifts(g, s, spec.gifts);

  const cells = count(g);
  return {
    grid: g,
    colors: palette,
    pushEvery: spec.pushEvery,
    theme: spec.theme,
    par: Math.max(8, Math.round(cells * 0.4 + spec.colors * 2.4 - 8))   // fitted to the robot in tools/, then loosened for people
  };
}

function paintGrid(g, s, spec, palette) {
  const k = palette.length;
  const rnd = () => palette[int(s, k)];
  const bandOrder = shuffle(s, palette.slice());
  const rowsPer = spec.rows > 6 ? 2 : 1;
  each(g, (cell, r, c) => {
    const x = cellX(g, r, c), u = x / W;
    let color;
    switch (spec.paint) {
      case 'bands': color = bandOrder[Math.min(k - 1, Math.floor(u * k))]; break;
      case 'rows': color = bandOrder[Math.floor(r / rowsPer) % k]; break;
      case 'blocks': color = bandOrder[(Math.floor(c / 3) + Math.floor(r / 2)) % k]; break;
      case 'rings': {
        const d = Math.hypot(u - 0.5, (r / Math.max(1, spec.rows)) * 0.8);
        color = bandOrder[Math.floor(d * k * 1.6) % k];
        break;
      }
      default: {
        // copy a painted neighbour above or to the left now and then, so colours come in blobs
        const painted = neighbors(g, r, c).map(([nr, nc]) => get(g, nr, nc)).filter(n => n && n.color >= 0);
        color = painted.length && next(s) < spec.clump ? painted[int(s, painted.length)].color : rnd();
      }
    }
    if (spec.paint !== 'cluster' && next(s) < spec.noise) color = rnd();
    cell.color = color;
  });
}

function addGifts(g, s, n) {
  const spots = [];
  each(g, (cell, r) => { if (r >= 1) spots.push(cell); });
  shuffle(s, spots);
  spots.slice(0, n).forEach(cell => { cell.gift = true; });
}

// endless mode: a wave of rows, and single new rows that push in from the top
// (in endless every shot counts towards the next row, and a miss counts twice)
export function waveSpec(wave) {
  return {
    colors: Math.min(6, 3 + wave),
    rows: Math.min(7, 4 + wave),
    pushEvery: Math.max(5, 10 - wave)
  };
}

export function randomRow(s, palette, below, len) {
  const out = [];
  for (let c = 0; c < len; c++) {
    let color;
    if (c > 0 && next(s) < 0.45) color = out[c - 1].color;
    else if (below && below[c] && next(s) < 0.3) color = below[c].color;
    else color = palette[int(s, palette.length)];
    out.push({ color });
  }
  if (next(s) < 0.12) out[int(s, len)].gift = true;
  return out;
}

export { COLS };
