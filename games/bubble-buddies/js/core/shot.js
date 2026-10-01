// Where a shot goes: straight lines that bounce off the side walls until the
// bubble touches another bubble or the ceiling, then the empty cell it settles in.
// The aim guide and the real shot both use this, so the guide never lies.

import { R, D, ROW_H, W, SHOOTER, COLLIDE, MIN_ANGLE, MAX_ANGLE } from '../config.js';
import { get, inside, neighbors, cellX, cellY, rowLen, nearestCell } from './grid.js';

const STEP = 3;
const HIT = D * COLLIDE;

export const clampAngle = a => Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, a));

// → { points: [{x, y, bounce?}], cell: [r, c], hit: [r, c] | null, length }
export function traceShot(g, angle, from = SHOOTER) {
  angle = clampAngle(angle);
  let x = from.x, y = from.y;
  let dx = Math.cos(angle), dy = -Math.sin(angle);
  const points = [{ x, y }];
  const top = g.ceil * ROW_H + R;

  for (let i = 0; i < 5000; i++) {
    x += dx * STEP; y += dy * STEP;
    if (x < R) { x = 2 * R - x; dx = -dx; points.push({ x: R, y, bounce: true }); }
    else if (x > W - R) { x = 2 * (W - R) - x; dx = -dx; points.push({ x: W - R, y, bounce: true }); }

    if (y <= top) return finish(g, points, Math.max(R, Math.min(W - R, x)), top, null);

    const rr = Math.round((y - R) / ROW_H - g.ceil);
    for (let r = Math.max(0, rr - 1); r <= rr + 1; r++) {
      const row = g.rows[r];
      if (!row) continue;
      const cy = cellY(g, r);
      if (Math.abs(cy - y) > HIT) continue;
      for (let c = 0; c < row.length; c++) {
        if (!row[c]) continue;
        const cx = cellX(g, r, c);
        if ((cx - x) * (cx - x) + (cy - y) * (cy - y) < HIT * HIT) return finish(g, points, x, y, [r, c]);
      }
    }
  }
  return finish(g, points, x, y, null);   // can't happen with a sane angle, but never loop forever
}

function finish(g, points, x, y, hit) {
  const cell = snap(g, x, y, hit);
  const end = { x: cellX(g, cell[0], cell[1]), y: cellY(g, cell[0]) };
  points.push(end);
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return { points, cell, hit, length };
}

const anchored = (g, r, c) => r === 0 || neighbors(g, r, c).some(([nr, nc]) => get(g, nr, nc));

// the empty cell nearest to where the shot stopped that is still held up by something
function snap(g, x, y, hit) {
  const cands = [];
  if (hit) {
    for (const [r, c] of neighbors(g, hit[0], hit[1])) if (!get(g, r, c)) cands.push([r, c]);
  } else {
    for (let c = 0; c < rowLen(g, 0); c++) if (!get(g, 0, c)) cands.push([0, c]);
  }
  const guess = nearestCell(g, x, y);
  if (inside(g, guess[0], guess[1]) && !get(g, guess[0], guess[1]) && anchored(g, guess[0], guess[1])) cands.push(guess);

  let best = null, bestD = Infinity;
  for (const [r, c] of cands) {
    const d = (cellX(g, r, c) - x) ** 2 + (cellY(g, r) - y) ** 2;
    if (d < bestD) { bestD = d; best = [r, c]; }
  }
  if (best) return best;

  // boxed in on every side (very rare): take any free cell that hangs on to something
  for (let r = 0; r <= g.rows.length; r++) {
    for (let c = 0; c < rowLen(g, r); c++) {
      if (get(g, r, c) || !anchored(g, r, c)) continue;
      const d = (cellX(g, r, c) - x) ** 2 + (cellY(g, r) - y) ** 2;
      if (d < bestD) { bestD = d; best = [r, c]; }
    }
  }
  return best || [0, 0];
}
