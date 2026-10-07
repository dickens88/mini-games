// Everything worth keeping, in localStorage: how well each fact is known,
// stars per level, the furthest world reached, the Endless best, the chosen
// hero and settings.
// Storage can be missing, full or hand-edited, so every access is wrapped and
// anything odd falls back to a fresh start.

import { FACTS, KINDS, TOP_LEVEL } from './core/facts.js';
import { LEVELS, WORLDS } from './data/worlds.js';
import { HEROES, heroOpen } from './data/heroes.js';

const KEY = 'meteor-math-v1';

export function defaults() {
  return { sound: true, hints: true, checked: false, unlocked: 0, best: 0, hero: 'dino', stars: {}, stats: {} };
}

const num = (v, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : lo);

export function cleanStats(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of FACTS) {
    const f = raw[key];
    if (!f || typeof f !== 'object') continue;
    for (const kind of KINDS) {
      const r = f[kind];
      if (!Array.isArray(r) || r.length !== 4) continue;
      (out[key] || (out[key] = {}))[kind] = [num(r[0], 0, TOP_LEVEL), num(r[1], 0, 1e6), num(r[2], 0, 1e6), num(r[3], 0, 60000)];
    }
  }
  return out;
}

export function clean(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const stars = {};
  if (raw.stars && typeof raw.stars === 'object') {
    for (const l of LEVELS) if (raw.stars[l.id]) stars[l.id] = num(raw.stars[l.id], 0, 3);
  }
  return {
    sound: raw.sound !== false,
    hints: raw.hints !== false,
    checked: raw.checked === true,
    unlocked: num(raw.unlocked, 0, WORLDS.length - 1),
    best: num(raw.best, 0, 1e9),
    hero: HEROES.some(h => h.id === raw.hero && heroOpen(h, stars)) ? raw.hero : d.hero,
    stars,
    stats: cleanStats(raw.stats)
  };
}

export function load() {
  try { return clean(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return defaults(); }
}

export function persist(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode or full */ }
}

// a level is open once the one before it has a star; a whole world opens
// when the boss before it falls (or the Quick Check said it's fine)
export function isOpen(save, level) {
  if (level.world > save.unlocked) return false;
  if (level.index === 0) return true;
  const prev = LEVELS.find(l => l.world === level.world && l.index === level.index - 1);
  return !!save.stars[prev.id] || level.world < save.unlocked;
}
