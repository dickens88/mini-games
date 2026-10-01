// Progress, best scores and the round in progress, in localStorage. Storage
// can be missing or full, so every access is wrapped and the game still works.

const KEY = 'bubble-buddies-v1';

function defaults() {
  return { sound: true, unlocked: 1, stars: {}, best: {}, endlessBest: 0, game: null };
}

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw || typeof raw !== 'object') return defaults();
    return {
      sound: raw.sound !== false,
      unlocked: Number.isInteger(raw.unlocked) && raw.unlocked > 0 ? raw.unlocked : 1,
      stars: raw.stars && typeof raw.stars === 'object' ? raw.stars : {},
      best: raw.best && typeof raw.best === 'object' ? raw.best : {},
      endlessBest: Number(raw.endlessBest) || 0,
      game: typeof raw.game === 'string' ? raw.game : null
    };
  } catch (e) {
    return defaults();
  }
}

export function persist(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode or full */ }
}
