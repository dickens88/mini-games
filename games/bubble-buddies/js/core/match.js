// Finding groups: bubbles that touch and share a colour, and bubbles that
// have lost every link to the ceiling.

import { get, neighbors, each } from './grid.js';

// every cell reachable from (r, c) through cells that pass test
export function cluster(g, r, c, test) {
  const start = get(g, r, c);
  if (!start || !test(start)) return [];
  const seen = new Set([r + ',' + c]);
  const out = [[r, c]];
  for (let i = 0; i < out.length; i++) {
    const [cr, cc] = out[i];
    for (const [nr, nc] of neighbors(g, cr, cc)) {
      const key = nr + ',' + nc;
      if (seen.has(key)) continue;
      seen.add(key);
      const cell = get(g, nr, nc);
      if (cell && test(cell)) out.push([nr, nc]);
    }
  }
  return out;
}

export function sameColor(g, r, c) {
  const cell = get(g, r, c);
  if (!cell) return [];
  return cluster(g, r, c, other => other.color === cell.color);
}

// bubbles with no path back to the top row
export function floating(g) {
  const held = new Set();
  const queue = [];
  const row0 = g.rows[0] || [];
  row0.forEach((cell, c) => { if (cell) { held.add('0,' + c); queue.push([0, c]); } });
  for (let i = 0; i < queue.length; i++) {
    const [r, c] = queue[i];
    for (const [nr, nc] of neighbors(g, r, c)) {
      const key = nr + ',' + nc;
      if (held.has(key) || !get(g, nr, nc)) continue;
      held.add(key);
      queue.push([nr, nc]);
    }
  }
  const out = [];
  each(g, (cell, r, c) => { if (!held.has(r + ',' + c)) out.push([r, c]); });
  return out;
}
