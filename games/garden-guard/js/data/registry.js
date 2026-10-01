// Every tower, enemy and level the game knows about.
// Adding a tower: create data/towers/<id>.js, draw it in render/sprites/tower-sprites.js,
// and add one line below. Nothing in core/ needs to change.

import pea from './towers/pea.js';
import melon from './towers/melon.js';
import mint from './towers/mint.js';
import cactus from './towers/cactus.js';
import sunflower from './towers/sunflower.js';

import bugs from './enemies/bugs.js';

import ch1 from './levels/ch1.js';
import ch2 from './levels/ch2.js';

import powers from './powers.js';

const TOWER_LIST = [pea, melon, mint, cactus, sunflower];
const ENEMY_LIST = [...bugs];
export const LEVELS = [...ch1, ...ch2];

export const TOWERS = Object.fromEntries(TOWER_LIST.map(t => [t.id, t]));
export const ENEMIES = Object.fromEntries(ENEMY_LIST.map(e => [e.id, e]));
export const POWERS = Object.fromEntries(powers.map(p => [p.id, p]));

export const levelById = id => LEVELS.find(l => l.id === id);
