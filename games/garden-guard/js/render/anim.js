// Easing curves and tiny helpers for timed visual effects. Nothing here knows
// about the game; the renderer keeps start times and asks "where are we now?".

export const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);

export const ease = {
  inQuad: t => t * t,
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  // overshoots a little and settles: things popping into place
  outBack: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  // wobbles a few times: jelly, springs
  outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1)
};

// progress 0..1 of an effect that started at `start` and lasts `dur` seconds
export function progress(now, start, dur) {
  return clamp01((now - start) / dur);
}

// rotate from angle a towards b by at most `maxStep` radians, the short way round
export function turnTowards(a, b, maxStep) {
  let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  if (Math.abs(d) <= maxStep) return b;
  return a + Math.sign(d) * maxStep;
}

// squash-and-stretch for a shot: a quick crouch, a push, then a springy settle.
// t = seconds since firing. Returns [scaleX, scaleY, pushBack].
export function shotPose(t) {
  if (t < 0.05) { const k = t / 0.05; return [1 + 0.12 * k, 1 - 0.14 * k, 0.05 * k]; }
  if (t < 0.12) { const k = (t - 0.05) / 0.07; return [1.12 - 0.2 * k, 0.86 + 0.24 * k, 0.05 - 0.07 * k]; }
  const k = clamp01((t - 0.12) / 0.35), s = 1 - ease.outElastic(k);
  return [1 - 0.08 * s, 1 + 0.1 * s, -0.02 * s];
}
