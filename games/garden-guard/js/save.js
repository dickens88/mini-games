// Progress and settings in localStorage. Storage can be missing or full, so
// every access is wrapped and the game still works without it.

const KEY = 'garden-guard-v1';
const VERSION = 1;

function defaults() {
  return {
    v: VERSION,
    sound: true,
    speed: 1,
    seenHelp: false,
    stars: {},       // levelId -> best stars (1..3)
    run: null        // start-of-wave snapshot of the game in progress
  };
}

// older saves are upgraded here, one version at a time
function migrate(raw) {
  return raw;
}

function clean(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  raw = migrate(raw);
  d.sound = raw.sound !== false;
  d.speed = raw.speed === 2 ? 2 : 1;
  d.seenHelp = raw.seenHelp === true;
  if (raw.stars && typeof raw.stars === 'object') {
    for (const k in raw.stars) {
      const n = parseInt(raw.stars[k], 10);
      if (n >= 1 && n <= 3) d.stars[k] = n;
    }
  }
  if (raw.run && typeof raw.run === 'object' && typeof raw.run.levelId === 'string') d.run = raw.run;
  return d;
}

export function load() {
  try { return clean(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return defaults(); }
}

export function persist(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ }
}
