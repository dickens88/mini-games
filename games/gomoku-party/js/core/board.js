// Looking at the board: which spots are free, where a stone really ends up
// (ice slides it, portals twin it) and lines of stones. Nothing here changes
// the game; core/game.js does that.

import { WIN_LEN } from '../config.js';

export const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // right, down, left, up
const LINES = [[1, 0], [0, 1], [1, 1], [1, -1]];

export const xy = (s, i) => [i % s.n, (i / s.n) | 0];
export const at = (s, x, y) => (x >= 0 && y >= 0 && x < s.n && y < s.n ? y * s.n + x : -1);

// a spot nobody can ever use: rocks, vents and black holes
export function solid(s, i) {
  const t = s.terrain[i];
  return s.rock[i] || (t && (t.t === 'vent' || t.t === 'hole'));
}

// can player p put a stone here right now?
export function open(s, i, p) {
  if (i < 0 || s.stone[i] >= 0 || solid(s, i) || s.block[i] > 0) return false;
  return !(s.frost[i] > 0 && (s.frostFor[i] === p || s.frostFor[i] === 2));
}

export function anyOpen(s, p) {
  for (let i = 0; i < s.stone.length; i++) if (open(s, i, p)) return true;
  return false;
}

// where a stone put on i ends up: on ice it slides along the arrows until
// something is in the way or it has left the ice
export function landing(s, i, p) {
  const path = [i];
  let cur = i;
  while (s.terrain[cur] && s.terrain[cur].t === 'ice') {
    const [dx, dy] = DIRS[s.terrain[cur].dir];
    const [x, y] = xy(s, cur);
    const nxt = at(s, x + dx, y + dy);
    if (!open(s, nxt, p)) break;
    path.push(nxt);
    cur = nxt;
  }
  const t = s.terrain[cur];
  const twin = t && t.t === 'portal' && open(s, t.twin, p) ? t.twin : -1;
  return { to: cur, path, twin };
}

// the longest straight line of one colour through stone i
export function lineThrough(s, i) {
  const p = s.stone[i];
  if (p < 0) return [];
  let best = [i];
  const [x, y] = xy(s, i);
  for (const [dx, dy] of LINES) {
    const line = [i];
    for (const k of [1, -1]) {
      for (let d = 1; ; d++) {
        const j = at(s, x + dx * d * k, y + dy * d * k);
        if (j < 0 || s.stone[j] !== p) break;
        if (k > 0) line.push(j); else line.unshift(j);
      }
    }
    if (line.length > best.length) best = line;
  }
  return best;
}

export function fiveAt(s, i) {
  const line = lineThrough(s, i);
  return line.length >= WIN_LEN ? line : null;
}

// would player p win by putting a stone on i (slides and twins included)?
export function wouldWin(s, i, p) {
  if (!open(s, i, p)) return false;
  const { to, twin } = landing(s, i, p);
  s.stone[to] = p;
  if (twin >= 0) s.stone[twin] = p;
  const win = !!fiveAt(s, to) || (twin >= 0 && !!fiveAt(s, twin));
  s.stone[to] = -1;
  if (twin >= 0) s.stone[twin] = -1;
  return win;
}

// every spot where player p could win with their next stone
export function winningSpots(s, p) {
  const out = [];
  for (let i = 0; i < s.stone.length; i++) if (wouldWin(s, i, p)) out.push(i);
  return out;
}

// the longest lines on the whole board: { len, lines: [[i, ...], ...] }
export function longestLines(s) {
  let len = 0, lines = [];
  for (let i = 0; i < s.stone.length; i++) {
    if (s.stone[i] < 0) continue;
    const line = lineThrough(s, i);
    if (line.length > len) { len = line.length; lines = [line]; }
    else if (line.length === len && !lines.some(l => l[0] === line[0] && l[l.length - 1] === line[line.length - 1])) lines.push(line);
  }
  return { len, lines };
}

// spots within r steps of any stone (where the action is)
export function nearStones(s, i, r) {
  const [x, y] = xy(s, i);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const j = at(s, x + dx, y + dy);
    if (j >= 0 && s.stone[j] >= 0) return true;
  }
  return false;
}
