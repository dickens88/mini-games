// The last setup you played and your wins against the computer, in
// localStorage. Storage can be missing or full, so every access is wrapped
// and the game still works without it.

import { PALS } from './data/pals.js';
import { COURTS } from './data/courts.js';
import { FORMATS } from './config.js';
import { LEVELS } from './core/ai.js';

const KEY = 'rally-pals-v1';
const OPPONENTS = ['friend', ...Object.keys(LEVELS)];

function defaults() {
  return {
    sound: true, helper: true, powerups: true,
    pals: ['bunny', 'fox'], opponent: 'friend', court: 'garden', format: 'quick',
    cpuWins: {}
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
      helper: raw.helper !== false,
      powerups: raw.powerups !== false,
      pals: pals[0] && pals[1] && pals[0] !== pals[1] ? pals : d.pals,
      opponent: OPPONENTS.includes(raw.opponent) ? raw.opponent : d.opponent,
      court: COURTS.some(c => c.id === raw.court) ? raw.court : d.court,
      format: FORMATS[raw.format] ? raw.format : d.format,
      cpuWins: raw.cpuWins && typeof raw.cpuWins === 'object' ? raw.cpuWins : {}
    };
  } catch (e) {
    return d;
  }
}

export function persist(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode or full */ }
}
