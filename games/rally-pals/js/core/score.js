// Keeping score. Two formats: first to N points, or real tennis scoring
// (15, 30, 40, deuce, advantage) where the first to N games wins the match.

import { FORMATS } from '../config.js';

export function newScore(formatId) {
  const f = FORMATS[formatId] || FORMATS.quick;
  return { format: f.id, points: [0, 0], games: [0, 0], winner: -1 };
}

const CALL = ['0', '15', '30', '40'];

// what the umpire would say about the current game, from the server's side
export function call(s, server) {
  const f = FORMATS[s.format];
  const [a, b] = s.points;
  if (f.type === 'points') return { text: `${a} – ${b}`, kind: 'score' };
  if (a >= 3 && b >= 3) {
    if (a === b) return { text: 'Deuce', kind: 'deuce' };
    return { text: 'Advantage', kind: 'adv', who: a > b ? 0 : 1 };
  }
  const first = server === 1 ? b : a, second = server === 1 ? a : b;
  if (a === b) return { text: a === 0 ? 'Love all' : `${CALL[a]} all`, kind: 'score' };
  return { text: `${CALL[first] === '0' ? 'Love' : CALL[first]} – ${CALL[second] === '0' ? 'love' : CALL[second]}`, kind: 'score' };
}

// the points of one player as shown on the scoreboard
export function pointLabel(s, who) {
  const f = FORMATS[s.format];
  const me = s.points[who], them = s.points[1 - who];
  if (f.type === 'points') return String(me);
  if (me >= 3 && them >= 3) return me > them ? 'AD' : '40';
  return CALL[Math.min(me, 3)];
}

// one point to `who`. Returns what it decided.
export function award(s, who) {
  const f = FORMATS[s.format];
  const out = { game: false, match: false };
  if (s.winner >= 0) return out;
  s.points[who]++;
  if (f.type === 'points') {
    if (s.points[who] >= f.to) { s.winner = who; out.match = true; }
    return out;
  }
  const me = s.points[who], them = s.points[1 - who];
  if (me >= 4 && me - them >= 2) {
    out.game = true;
    s.games[who]++;
    s.points = [0, 0];
    if (s.games[who] >= f.games) { s.winner = who; out.match = true; }
  }
  return out;
}

// is the next point one that could win the game, or the whole match, and for whom?
export function bigPoint(s) {
  const f = FORMATS[s.format];
  for (const who of [0, 1]) {
    const me = s.points[who], them = s.points[1 - who];
    if (f.type === 'points') {
      if (me + 1 >= f.to) return { who, kind: 'match' };
      continue;
    }
    const winsGame = me >= 3 && me - them >= 1;
    if (winsGame) return { who, kind: s.games[who] + 1 >= f.games ? 'match' : 'game' };
  }
  return null;
}

// who serves: in tennis the same pal serves a whole game, then it swaps;
// in a quick match the serve swaps every point
export function serverFor(s, firstServer) {
  const f = FORMATS[s.format];
  if (f.type === 'points') return (firstServer + s.points[0] + s.points[1]) % 2;
  return (firstServer + s.games[0] + s.games[1]) % 2;
}
