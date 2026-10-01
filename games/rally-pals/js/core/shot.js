// Turning a swing into a shot. Every shot aims at a spot on the other side:
// the pal picks the kind (drive, lob, smash…) and how cleanly they hit it
// decides how close to that spot it goes. This aim-for-the-court help is what
// keeps rallies going for little players.

import { NET_X, NET_TOP, FLOOR, BALL_R, HALF } from '../config.js';

// depth: how far into the other half (0 = at the net, 1 = the baseline)
// time: seconds in the air on a normal court
export const SHOTS = {
  normal: { depth: 0.6, time: 0.98 },
  drive: { depth: 0.72, time: 0.72 },
  lob: { depth: 0.84, time: 1.45 },
  smash: { depth: 0.55, time: 0.4 },
  serve: { depth: 0.62, time: 1.0 },
  serveDrive: { depth: 0.66, time: 0.8 },
  serveLob: { depth: 0.72, time: 1.38 }
};

// side: the hitter (0 left, 1 right); quality 0..1; r1, r2 random numbers 0..1
// wind: pals lean into the wind a bit, but never fully
export function planShot(x, y, side, kind, quality, g, rally, fire, r1, r2, wind = 0) {
  const spec = SHOTS[kind] || SHOTS.normal;
  const toward = side === 0 ? 1 : -1;
  const miss = Math.pow(1 - quality, 1.6);
  const depth = spec.depth + (r1 - 0.5) * 0.16;
  const tx = NET_X + toward * (depth * HALF + (r2 - 0.5) * 2 * (10 + 190 * miss));
  let T = spec.time * Math.sqrt(1000 / g);
  // long rallies heat up: every shot a little quicker, so even robots crack eventually
  if (kind !== 'serve' && kind !== 'serveDrive' && kind !== 'serveLob') T *= Math.max(0.55, 1 - 0.011 * rally);
  if (fire) T *= 0.62;
  T *= 1 + (r1 - 0.5) * 0.3 * miss;
  const ty = FLOOR - BALL_R;
  // a clean hit clears the net with room to spare; a scrappy one may clip it
  const clearance = 16 - 46 * miss * miss;
  let vx = 0, vy = 0;
  for (let k = 0; k < 40; k++) {
    vx = (tx - x) / T;
    vy = (ty - y - 0.5 * g * T * T) / T;
    const tn = (NET_X - x) / vx;
    if (!(tn > 0 && tn < T)) break;
    const yn = y + vy * tn + 0.5 * g * tn * tn;
    if (yn < NET_TOP - BALL_R - clearance) break;
    T += 0.04;
  }
  vx -= 0.5 * wind * T * 0.6;
  return { vx, vy };
}
