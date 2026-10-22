// The last setup you played, in localStorage. Storage can be missing or full,
// so every access is wrapped and the game still works without it.

import { PALS } from './data/pals.js';
import { BOARDS } from './data/boards.js';
import { SIZES, FORMATS, TIMERS } from './config.js';

const KEY = 'gomoku-party-v1';

function defaults() {
  return {
    sound: true, hints: true, party: true,
    pals: ['bunny', 'fox'], board: 'garden', size: 13, format: 'bo3', timer: 'off'
  };
}

export function load() {
  const d = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw || typeof raw !== 'object') return d;
    const pal = id => (PALS.some(p => p.id === id) ? id : null);
    const pals = Array.isArray(raw.pals) ? raw.pals.map(pal) : [];
    return {
      sound: raw.sound !== false,
      hints: raw.hints !== false,
      party: raw.party !== false,
      pals: pals[0] && pals[1] && pals[0] !== pals[1] ? pals : d.pals,
      board: BOARDS.some(b => b.id === raw.board) ? raw.board : d.board,
      size: SIZES.includes(raw.size) ? raw.size : d.size,
      format: FORMATS[raw.format] ? raw.format : d.format,
      timer: raw.timer in TIMERS ? raw.timer : d.timer
    };
  } catch (e) {
    return d;
  }
}

export function persist(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode or full */ }
}
