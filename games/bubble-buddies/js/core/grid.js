// The bubble grid: rows of cells that nest like a honeycomb. Every other row
// sits half a bubble to the right and holds one fewer bubble.
//
// grid = { rows: [[cell|null]], parity, ceil }
//   parity  flips when a new row is pushed in at the top, so old rows keep their offset
//   ceil    how many rows the ceiling has been lowered
// cell = { id, color, gift? }

import { COLS, R, D, ROW_H } from '../config.js';

export function createGrid() { return { rows: [], parity: 0, ceil: 0 }; }

export const shifted = (g, r) => ((r + g.parity) & 1) === 1;
export const rowLen = (g, r) => shifted(g, r) ? COLS - 1 : COLS;
export const cellX = (g, r, c) => R + c * D + (shifted(g, r) ? R : 0);
export const cellY = (g, r) => R + (r + g.ceil) * ROW_H;

export function inside(g, r, c) { return r >= 0 && c >= 0 && c < rowLen(g, r); }

export function get(g, r, c) {
  if (!inside(g, r, c)) return null;
  const row = g.rows[r];
  return row ? row[c] || null : null;
}

export function put(g, r, c, cell) {
  while (g.rows.length <= r) g.rows.push(new Array(rowLen(g, g.rows.length)).fill(null));
  g.rows[r][c] = cell;
}

export function clear(g, r, c) {
  if (g.rows[r]) g.rows[r][c] = null;
}

export function neighbors(g, r, c) {
  const s = shifted(g, r);
  const out = [];
  const add = (rr, cc) => { if (inside(g, rr, cc)) out.push([rr, cc]); };
  add(r, c - 1); add(r, c + 1);
  if (s) { add(r - 1, c); add(r - 1, c + 1); add(r + 1, c); add(r + 1, c + 1); }
  else { add(r - 1, c - 1); add(r - 1, c); add(r + 1, c - 1); add(r + 1, c); }
  return out;
}

export function each(g, fn) {
  for (let r = 0; r < g.rows.length; r++) {
    const row = g.rows[r];
    for (let c = 0; c < row.length; c++) if (row[c]) fn(row[c], r, c);
  }
}

export function count(g) { let n = 0; each(g, () => n++); return n; }

// the deepest row that still holds a bubble, or -1 when the grid is empty
export function lowest(g) {
  for (let r = g.rows.length - 1; r >= 0; r--) if (g.rows[r].some(Boolean)) return r;
  return -1;
}

export function trim(g) {
  while (g.rows.length && !g.rows[g.rows.length - 1].some(Boolean)) g.rows.pop();
}

export function colorsIn(g) {
  const seen = new Set();
  each(g, cell => { if (cell.color >= 0) seen.add(cell.color); });
  return [...seen].sort((a, b) => a - b);
}

// the grid cell whose centre is nearest to a board point
export function nearestCell(g, x, y) {
  const r = Math.max(0, Math.round((y - R) / ROW_H - g.ceil));
  const c = Math.round((x - R - (shifted(g, r) ? R : 0)) / D);
  return [r, Math.max(0, Math.min(rowLen(g, r) - 1, c))];
}

// push a fresh row in at the top; everything else moves down one row.
// make(len) returns the new row's cells.
export function pushRow(g, make) {
  g.parity ^= 1;
  const len = rowLen(g, 0);
  const row = new Array(len).fill(null);
  make(len).forEach((cell, c) => { if (c < len) row[c] = cell; });
  g.rows.unshift(row);
}

export function cloneGrid(g) {
  return { rows: g.rows.map(row => row.map(cell => cell ? Object.assign({}, cell) : null)), parity: g.parity, ceil: g.ceil };
}
