// Draws the chosen hero at the bottom of the screen and says where its
// blaster is, so the laser starts from the right place.

import { DINO } from '../config.js';
import { drawDragon, holdPoint } from './dragon.js';
import { drawPalHero } from './pals.js';
import { heroById } from '../data/heroes.js';

const PAL_SIZE = 1.12;
const TURN_GAP = 45;     // the target must be this far to the other side before the pal turns
const TURN_HOLD = 0.6;   // and the pal stays turned at least this long (seconds)

// which way a pal faces: measured from its body (not the blaster, which swaps
// sides when it turns) with some slack, so a meteor straight overhead can't
// make it flip back and forth every frame
function facing(d) {
  if (d.dir == null) { d.dir = 1; d.turnedAt = -1; }
  const want = d.faceX < -TURN_GAP ? -1 : d.faceX > TURN_GAP ? 1 : d.dir;
  if (want !== d.dir && d.t - d.turnedAt >= TURN_HOLD) { d.dir = want; d.turnedAt = d.t; }
  return d.dir;
}

// d: Dino-style mood state from fx.dino; returns the blaster's position
export function drawHero(ctx, heroId, px, d, drawHeld) {
  const hero = heroById(heroId);
  if (hero.id === 'dino') {
    drawDragon(ctx, px, d, drawHeld);
    return holdPoint();
  }
  return drawPalHero(ctx, hero, {
    x: DINO.x, y: DINO.y - 4, size: PAL_SIZE,
    dir: facing(d),
    mood: d.mood, moodAge: d.moodAge, t: d.t,
    shot: d.throwAge != null ? Math.sin(Math.min(1, d.throwAge / 0.4) * Math.PI) : 0
  }, drawHeld);
}
