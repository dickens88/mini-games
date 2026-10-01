// Moving along the route and everything a cell can do. Nothing here draws;
// it records events for the page to animate.

import { MAX_ITEMS, BUMP_BACK, BOOST, SETBACK, QUAKE_BACK, KRAKEN_BACK } from '../config.js';
import { getMap } from './map.js';
import { ITEMS } from '../data/items.js';
import { nextRandom } from './rng.js';
import { emit } from './events.js';

export const current = state => state.players[state.turn];
export const mapOf = state => getMap(state.map);
const active = state => state.players.filter(p => !p.rank);

// cells walked from pos, bouncing back off the goal if the roll is too big
export function walk(pos, steps, goal) {
  const path = [];
  let dir = steps < 0 ? -1 : 1;
  for (let k = 0; k < Math.abs(steps); k++) {
    if (pos === goal && dir > 0) dir = -1;
    if (pos === 0 && dir < 0) break;
    pos += dir;
    path.push(pos);
  }
  return path;
}

// a bad thing is about to happen to pl: a shield soaks it up instead
export function shielded(state, pi) {
  const pl = state.players[pi];
  if (!pl.shield) return false;
  pl.shield = false;
  emit(state, 'blocked', { pi, pos: pl.pos });
  return true;
}

function moveBy(state, pi, steps, kind) {
  const pl = state.players[pi], goal = mapOf(state).goal;
  const path = walk(pl.pos, steps, goal);
  if (!path.length) return;
  const from = pl.pos;
  pl.pos = path[path.length - 1];
  emit(state, kind, { pi, from, to: pl.pos, path });
}

function jumpTo(state, pi, to, kind) {
  const pl = state.players[pi];
  const from = pl.pos;
  pl.pos = to;
  emit(state, kind, { pi, from, to });
}

// the current player's dice moved them; now the cell (and maybe more) happens
export function arrive(state, pi) {
  cellEffect(state, pi, 0);
  bump(state, pi);
}

function cellEffect(state, pi, depth) {
  const pl = state.players[pi], map = mapOf(state);
  if (pl.pos === map.goal || pl.pos === 0) return;

  const b = state.bananas.indexOf(pl.pos);
  if (b >= 0) {
    state.bananas.splice(b, 1);
    emit(state, 'banana', { pi, pos: pl.pos });
    if (!shielded(state, pi)) { moveBy(state, pi, -SETBACK, 'slip'); if (depth < 2) cellEffect(state, pi, depth + 1); }
    return;
  }

  const f = map.at[pl.pos];
  if (!f) return;
  switch (f.kind) {
    case 'ladder':
      pl.stats.ladders++;
      jumpTo(state, pi, f.to, 'ladder');
      break;
    case 'slide':
      if (shielded(state, pi)) break;
      pl.stats.slides++;
      jumpTo(state, pi, f.to, 'slide');
      break;
    case 'portal':
      pl.stats.portals++;
      jumpTo(state, pi, f.to, 'portal');
      break;
    case 'trap':
      if (shielded(state, pi)) break;
      pl.skip++;
      emit(state, 'trap', { pi, pos: pl.pos });
      break;
    case 'boost':
      moveBy(state, pi, BOOST, 'boost');
      if (depth < 2) cellEffect(state, pi, depth + 1);
      break;
    case 'setback':
      emit(state, 'setback', { pi, pos: pl.pos });
      if (shielded(state, pi)) break;
      moveBy(state, pi, -SETBACK, 'pushed');
      if (depth < 2) cellEffect(state, pi, depth + 1);
      break;
    case 'box': {
      const item = drawItem(state, pi);
      if (pl.items.length >= MAX_ITEMS) pl.items.shift();
      pl.items.push(item);
      emit(state, 'item', { pi, item, pos: pl.pos });
      break;
    }
    case 'again':
      state.extra = true;
      emit(state, 'again', { pi, pos: pl.pos });
      break;
    case 'quake':
      emit(state, 'quake', { pi, pos: pl.pos });
      state.players.forEach((q, qi) => {
        if (qi === pi || q.rank || q.pos === 0 || shielded(state, qi)) return;
        moveBy(state, qi, -QUAKE_BACK, 'pushed');
      });
      break;
    case 'kraken': {
      const rivals = state.players.map((q, qi) => qi).filter(qi => qi !== pi && !state.players[qi].rank && state.players[qi].pos > 0);
      const lead = rivals.sort((a, b) => state.players[b].pos - state.players[a].pos)[0];
      // with nobody ahead to grab, the kraken grabs you
      const victim = lead !== undefined && state.players[lead].pos > pl.pos ? lead : pi;
      emit(state, 'kraken', { pi, victim, pos: pl.pos });
      if (!shielded(state, victim)) moveBy(state, victim, -KRAKEN_BACK, 'pushed');
      break;
    }
    case 'shuffle': {
      const rivals = state.players.map((q, qi) => qi).filter(qi => qi !== pi && !state.players[qi].rank);
      if (!rivals.length) break;
      const qi = rivals[Math.floor(nextRandom(state) * rivals.length)];
      swapPlaces(state, pi, qi, 'shuffle');
      break;
    }
  }
}

export function swapPlaces(state, pi, qi, kind) {
  const a = state.players[pi], b = state.players[qi];
  const pa = a.pos, pb = b.pos;
  a.pos = pb; b.pos = pa;
  emit(state, kind, { pi, qi, a: pa, b: pb });
}

// landing on other players pushes them back (not on the start or the goal)
function bump(state, pi) {
  const pl = state.players[pi], goal = mapOf(state).goal;
  if (pl.pos === 0 || pl.pos === goal) return;
  state.players.forEach((q, qi) => {
    if (qi === pi || q.rank || q.pos !== pl.pos) return;
    emit(state, 'bump', { pi, qi, pos: pl.pos });
    if (shielded(state, qi)) return;
    pl.stats.bumps++;
    q.stats.bumped++;
    moveBy(state, qi, -BUMP_BACK, 'pushed');
  });
}

// whoever is furthest behind finds the helpful items more often
export function drawItem(state, pi) {
  const mine = state.players[pi].pos;
  const others = active(state).filter(q => q !== state.players[pi]);
  const behind = others.length > 0 && others.every(q => q.pos >= mine);
  const weights = ITEMS.map(it => it.weight * (behind && it.boost ? 2 : 1));
  let r = nextRandom(state) * weights.reduce((a, b) => a + b, 0);
  for (let k = 0; k < ITEMS.length; k++) {
    r -= weights[k];
    if (r < 0) return ITEMS[k].id;
  }
  return ITEMS[ITEMS.length - 1].id;
}
