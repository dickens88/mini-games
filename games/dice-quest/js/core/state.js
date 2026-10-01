// The whole game is one plain object, so saving is JSON and the balance
// script can run thousands of games without a page.

import { SEATS, AVATAR_IDS, DEFAULT_AVATARS } from '../config.js';
import { MAP_BY_ID } from '../data/maps/index.js';

const VERSION = 1;

// players: [{ name, avatar }] in seat order (2–4)
export function createState({ map = 'jungle', players = [], seed }) {
  const list = players.length >= 2 ? players.slice(0, 4) : [{}, {}];
  return {
    v: VERSION,
    seed: (seed >>> 0) || ((Math.random() * 2 ** 32) >>> 0),
    map: MAP_BY_ID[map] ? map : 'jungle',
    players: list.map((p, seat) => ({
      seat,
      name: (p.name || '').trim().slice(0, 12) || SEATS[seat].name,
      avatar: AVATAR_IDS.includes(p.avatar) ? p.avatar : DEFAULT_AVATARS[seat],
      pos: 0,
      items: [],
      shield: false,
      skip: 0,
      rank: 0,
      stats: { ladders: 0, slides: 0, bumps: 0, bumped: 0, items: 0, portals: 0 }
    })),
    turn: 0,
    phase: 'roll',     // roll → (move, effects) → roll … → over
    dice: [],          // the last roll
    double: false,     // Double dice is armed for this roll
    golden: 0,         // Golden die: the chosen face
    extra: false,      // something earned another roll
    bananas: [],
    ranks: [],         // player indexes in finishing order
    turns: 0,
    events: []
  };
}

export function serialize(state) {
  return JSON.stringify(Object.assign({}, state, { events: [] }));
}

export function deserialize(text) {
  try {
    const s = typeof text === 'string' ? JSON.parse(text) : text;
    if (!s || s.v !== VERSION || !MAP_BY_ID[s.map] || !Array.isArray(s.players) || s.players.length < 2) return null;
    // faces from older versions fall back to the seat's default animal
    s.players.forEach(p => { if (!AVATAR_IDS.includes(p.avatar)) p.avatar = DEFAULT_AVATARS[p.seat] || AVATAR_IDS[0]; });
    s.events = [];
    return s;
  } catch (e) {
    return null;
  }
}
