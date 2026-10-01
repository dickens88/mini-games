// Every tower, enemy and level the game knows about.
// Adding a tower: create data/towers/<id>.js, draw it in render/sprites/tower-sprites.js,
// and add one line below. Nothing in core/ needs to change.

import pea from './towers/pea.js';

import bugs from './enemies/bugs.js';

import ch1 from './levels/ch1.js';

const TOWER_LIST = [pea];
const ENEMY_LIST = [...bugs];
export const LEVELS = [...ch1];

export const TOWERS = Object.fromEntries(TOWER_LIST.map(t => [t.id, t]));
export const ENEMIES = Object.fromEntries(ENEMY_LIST.map(e => [e.id, e]));

export const levelById = id => LEVELS.find(l => l.id === id);
