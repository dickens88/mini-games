// Turn flow: use items if you like → roll → move → whatever the cell does →
// roll again on a single 6 (or a lucky cell) → next player. These are the
// only functions the page and the balance script call to change the game.

import { current, mapOf, walk, arrive } from './rules.js';
import { nextRandom } from './rng.js';
import { emit } from './events.js';

const d6 = state => 1 + Math.floor(nextRandom(state) * 6);

export function roll(state) {
  if (state.phase !== 'roll') return false;
  const pi = state.turn, pl = current(state), goal = mapOf(state).goal;
  const golden = state.golden, remote = state.remote;
  const dice = golden ? [golden] : remote ? [remote] : state.double ? [d6(state), d6(state)] : [d6(state)];
  state.golden = 0;
  state.remote = 0;
  state.double = false;
  state.dice = dice;
  emit(state, 'roll', { pi, dice, golden: !!golden });

  const steps = dice.reduce((a, b) => a + b, 0);
  const path = walk(pl.pos, steps, goal);
  const from = pl.pos;
  pl.pos = path[path.length - 1];
  emit(state, 'move', { pi, from, path });
  arrive(state, pi);

  checkFinish(state);
  const six = !golden && dice.length === 1 && dice[0] === 6;
  endTurn(state, six);
  return true;
}

function checkFinish(state) {
  const goal = mapOf(state).goal;
  state.players.forEach((pl, pi) => {
    if (pl.rank || pl.pos !== goal) return;
    state.ranks.push(pi);
    pl.rank = state.ranks.length;
    emit(state, 'finish', { pi, rank: pl.rank });
  });
  const left = state.players.map((pl, pi) => pi).filter(pi => !state.players[pi].rank);
  if (left.length <= 1) finishOff(state, left);
}

function finishOff(state, left) {
  left.sort((a, b) => state.players[b].pos - state.players[a].pos);
  for (const pi of left) { state.ranks.push(pi); state.players[pi].rank = state.ranks.length; }
  state.phase = 'over';
  emit(state, 'over', { ranks: state.ranks.slice() });
}

// stop after the winner is known: the rest are placed by how far they got
export function endGame(state) {
  finishOff(state, state.players.map((pl, pi) => pi).filter(pi => !state.players[pi].rank));
}

function endTurn(state, six) {
  if (state.phase === 'over') return;
  const pl = current(state);
  const again = !pl.rank && (six || state.extra);
  state.extra = false;
  if (again) {
    emit(state, 'roll-again', { pi: state.turn, six });
    return;
  }
  const n = state.players.length;
  let i = state.turn;
  for (let guard = 0; guard < 64; guard++) {
    i = (i + 1) % n;
    const q = state.players[i];
    if (q.rank) continue;
    if (q.skip > 0) { q.skip--; emit(state, 'skipped', { pi: i }); continue; }
    break;
  }
  state.turn = i;
  state.turns++;
  emit(state, 'turn', { pi: i });
}
