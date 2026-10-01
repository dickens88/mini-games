// Settings and the game in progress, in localStorage. Storage can be missing
// or full, so every access is wrapped and the game still works without it.

const KEY = 'dice-quest-v1';

function defaults() {
  return { sound: true, setup: null, game: null };
}

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw || typeof raw !== 'object') return defaults();
    return {
      sound: raw.sound !== false,
      setup: raw.setup && typeof raw.setup === 'object' ? raw.setup : null,
      game: typeof raw.game === 'string' ? raw.game : null
    };
  } catch (e) {
    return defaults();
  }
}

export function persist(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode or full */ }
}
