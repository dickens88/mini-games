// Turns a map's route into evenly spaced cells and indexes its features.
// Cell 0 is the shared start, the last cell is the goal.

import { MAP_BY_ID } from '../data/maps/index.js';

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

// a dense line through the route (smoothed or straight), then n points equally far apart along it
export function sampleRoute(route, n, smooth) {
  let dense = route;
  if (smooth) {
    dense = [];
    for (let i = 0; i < route.length - 1; i++) {
      const p0 = route[Math.max(0, i - 1)], p1 = route[i], p2 = route[i + 1], p3 = route[Math.min(route.length - 1, i + 2)];
      for (let k = 0; k < 24; k++) dense.push(catmull(p0, p1, p2, p3, k / 24));
    }
    dense.push(route[route.length - 1]);
  }
  const lens = [0];
  for (let i = 1; i < dense.length; i++) lens.push(lens[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y));
  const total = lens[lens.length - 1];
  const out = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const want = total * k / (n - 1);
    while (j < dense.length - 1 && lens[j] < want) j++;
    const a = dense[j - 1], b = dense[j];
    const seg = lens[j] - lens[j - 1] || 1;
    const t = Math.min(1, Math.max(0, (want - lens[j - 1]) / seg));
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return { cells: out, dense, length: total };
}

// scale a route to fill the board, keeping its shape
function fit(route, lo, hi) {
  const xs = route.map(p => p.x), ys = route.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = (hi - lo) / Math.max(x1 - x0, y1 - y0);
  const ox = (100 - (x1 - x0) * k) / 2, oy = (100 - (y1 - y0) * k) / 2;
  return route.map(p => ({ x: ox + (p.x - x0) * k, y: oy + (p.y - y0) * k }));
}

export function buildMap(def) {
  const { cells, dense, length } = sampleRoute(fit(def.route, 7, 93), def.cells, def.smooth);
  const at = Array(def.cells).fill(null);
  const links = [];
  for (const [kind, a, b] of def.features) {
    at[a] = { kind, to: b };
    if (kind === 'portal') at[b] = { kind, to: a };
    if (b !== undefined) links.push({ kind, from: a, to: b });
  }
  return { def, cells, dense, length, at, links, goal: def.cells - 1 };
}

const built = {};
export function getMap(id) {
  if (!built[id]) built[id] = buildMap(MAP_BY_ID[id] || MAP_BY_ID.jungle);
  return built[id];
}
