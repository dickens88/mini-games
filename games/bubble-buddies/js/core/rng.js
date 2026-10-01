// A small seeded random generator. Its whole state is one number kept on a
// plain object, so a saved game carries on with exactly the same bubbles.

export function makeRng(seed) { return { rng: seed | 0 }; }

export function next(s) {
  let t = (s.rng = (s.rng + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const int = (s, n) => Math.floor(next(s) * n);
export const pick = (s, arr) => arr[int(s, arr.length)];

export function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = int(s, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
