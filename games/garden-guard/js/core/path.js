// Paths are polylines in tile units (tile centre = c + 0.5, r + 0.5).
// An enemy only stores how far it has walked (d); its position comes from here.

import { COLS, ROWS } from '../config.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const cellAt = (grid, c, r) => (r >= 0 && r < ROWS && c >= 0 && c < COLS ? grid[r][c] : ' ');
const isRoad = ch => ch === '#' || ch === 'E';

// Walk the road from one start tile to the garden. Roads may not fork in the
// grid; levels that need forks list explicit waypoints instead.
function trace(grid, start) {
  const cells = [start];
  const seen = new Set([start.c + ',' + start.r]);
  let cur = start;
  while (cellAt(grid, cur.c, cur.r) !== 'E') {
    const next = DIRS
      .map(([dc, dr]) => ({ c: cur.c + dc, r: cur.r + dr }))
      .filter(p => isRoad(cellAt(grid, p.c, p.r)) && !seen.has(p.c + ',' + p.r));
    if (next.length !== 1) {
      throw new Error(`road at ${cur.c},${cur.r} has ${next.length} ways on; add waypoints to the level`);
    }
    cur = next[0];
    seen.add(cur.c + ',' + cur.r);
    cells.push(cur);
  }
  return cells;
}

// one tile beyond the map edge, so enemies walk in from (and out to) off-screen
function offEdge(cell) {
  if (cell.c === 0) return { c: -1, r: cell.r };
  if (cell.c === COLS - 1) return { c: COLS, r: cell.r };
  if (cell.r === 0) return { c: cell.c, r: -1 };
  if (cell.r === ROWS - 1) return { c: cell.c, r: ROWS };
  return null;
}

function simplify(cells) {
  const pts = cells.map(p => ({ x: p.c + 0.5, y: p.r + 0.5 }));
  return pts.filter((p, i) => {
    if (i === 0 || i === pts.length - 1) return true;
    const a = pts[i - 1], b = pts[i + 1];
    return (p.x - a.x) * (b.y - p.y) !== (p.y - a.y) * (b.x - p.x);
  });
}

function makePath(points) {
  const segs = [];
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, l, start: len });
    len += l;
  }
  return { points, segs, len };
}

export function pathsFromGrid(grid, waypoints) {
  if (waypoints) return waypoints.map(list => makePath(list.map(([c, r]) => ({ x: c + 0.5, y: r + 0.5 }))));
  const starts = [];
  grid.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'S') starts.push({ c, r }); }));
  return starts.map(s => {
    const cells = trace(grid, s);
    const before = offEdge(cells[0]), after = offEdge(cells[cells.length - 1]);
    if (before) cells.unshift(before);
    if (after) cells.push(after);
    return makePath(simplify(cells));
  });
}

export function pointAt(path, d) {
  const segs = path.segs;
  if (d <= 0) return { x: segs[0].a.x, y: segs[0].a.y, dir: Math.atan2(segs[0].b.y - segs[0].a.y, segs[0].b.x - segs[0].a.x) };
  for (const s of segs) {
    if (d <= s.start + s.l) {
      const t = (d - s.start) / s.l;
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, dir: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) };
    }
  }
  const last = segs[segs.length - 1];
  return { x: last.b.x, y: last.b.y, dir: Math.atan2(last.b.y - last.a.y, last.b.x - last.a.x) };
}

// build pads ('o') and every road tile, for the renderer and the input layer
export function readGrid(grid) {
  const pads = [], road = [];
  grid.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === 'o') pads.push({ c, r });
    if (ch === '#' || ch === 'S' || ch === 'E') road.push({ c, r, ch });
  }));
  return { pads, road };
}
