// Using items. Every item is used before rolling; some need a target
// (a player, or a die face for the Golden die and the Remote die).

import { MAX_BANANAS } from '../config.js';
import { current, mapOf, shielded, swapPlaces } from './rules.js';
import { ITEM_BY_ID } from '../data/items.js';
import { emit } from './events.js';

// the players an item can be aimed at
export function targets(state) {
  return state.players.map((q, qi) => qi).filter(qi => qi !== state.turn && !state.players[qi].rank);
}

const EFFECTS = {
  double: {
    can: s => !s.double && !s.golden && !s.remote,
    use: s => { s.double = true; }
  },
  golden: {
    can: s => !s.double && !s.golden && !s.remote,
    ok: (s, n) => Number.isInteger(n) && n >= 1 && n <= 6,
    use: (s, n) => { s.golden = n; }
  },
  remote: {
    can: s => !s.double && !s.golden && !s.remote,
    ok: (s, n) => Number.isInteger(n) && n >= 1 && n <= 6,
    use: (s, n) => { s.remote = n; }
  },
  shield: {
    can: s => !current(s).shield,
    use: s => { current(s).shield = true; }
  },
  swap: {
    can: s => targets(s).length > 0,
    ok: (s, qi) => targets(s).includes(qi),
    use: (s, qi) => { if (!shielded(s, qi)) swapPlaces(s, s.turn, qi, 'swap'); }
  },
  freeze: {
    can: s => targets(s).length > 0,
    ok: (s, qi) => targets(s).includes(qi),
    use: (s, qi) => {
      if (shielded(s, qi)) return;
      s.players[qi].skip++;
      emit(s, 'frozen', { pi: s.turn, qi });
    }
  },
  banana: {
    can: s => {
      const pos = current(s).pos;
      return pos > 0 && pos < mapOf(s).goal && !s.bananas.includes(pos);
    },
    use: s => {
      if (s.bananas.length >= MAX_BANANAS) s.bananas.shift();
      s.bananas.push(current(s).pos);
      emit(s, 'banana-drop', { pi: s.turn, pos: current(s).pos });
    }
  }
};

// for each item the current player holds: can it be used right now?
export function usableSlots(state) {
  const pl = current(state);
  if (state.phase !== 'roll') return pl.items.map(() => false);
  return pl.items.map(id => !!(EFFECTS[id] && EFFECTS[id].can(state)));
}

export function needsTarget(id) {
  return ITEM_BY_ID[id].target || null;
}

export function useItem(state, slot, arg) {
  if (!usableSlots(state)[slot]) return false;
  const pl = current(state);
  const id = pl.items[slot], fx = EFFECTS[id];
  if (fx.ok && !fx.ok(state, arg)) return false;
  pl.items.splice(slot, 1);
  pl.stats.items++;
  emit(state, 'use', { pi: state.turn, item: id, target: arg });
  fx.use(state, arg);
  return true;
}
