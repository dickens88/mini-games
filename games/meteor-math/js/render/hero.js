// Draws the chosen hero at the bottom of the screen and says where its
// blaster is, so the laser starts from the right place.

import { DINO } from '../config.js';
import { drawDragon, holdPoint } from './dragon.js';
import { drawPalHero } from './pals.js';
import { heroById } from '../data/heroes.js';

const PAL_SIZE = 1.12;

// d: Dino-style mood state from fx.dino; returns the blaster's position
export function drawHero(ctx, heroId, px, d, drawHeld) {
  const hero = heroById(heroId);
  if (hero.id === 'dino') {
    drawDragon(ctx, px, d, drawHeld);
    return holdPoint();
  }
  return drawPalHero(ctx, hero, {
    x: DINO.x, y: DINO.y - 4, size: PAL_SIZE,
    dir: d.lookX < -0.25 ? -1 : 1,
    mood: d.mood, moodAge: d.moodAge, t: d.t,
    shot: d.throwAge != null ? Math.sin(Math.min(1, d.throwAge / 0.4) * Math.PI) : 0
  }, drawHeld);
}
