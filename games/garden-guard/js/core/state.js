// A game in progress is one plain object. Everything except `level`, `paths`
// and `pads` (rebuilt from the level data) can go through JSON, which is how
// the start-of-wave autosave works.

import { START_LIVES } from '../config.js';
import { levelById } from '../data/registry.js';
import { pathsFromGrid, readGrid } from './path.js';
import { parseWave } from './waves.js';

const SAVED = ['seed', 'time', 'gold', 'lives', 'waveIdx', 'spawnQueue', 'nextWaveIn',
  'enemies', 'towers', 'projectiles', 'nextUid', 'result', 'stats'];

export function createState(levelId, seed) {
  const level = levelById(levelId);
  if (!level) throw new Error('unknown level ' + levelId);
  const { pads } = readGrid(level.grid);
  return {
    level,
    paths: pathsFromGrid(level.grid, level.waypoints),
    pads,
    waves: level.waves.map(parseWave),

    seed: (seed >>> 0) || 1,
    time: 0,
    gold: level.gold,
    lives: START_LIVES,
    waveIdx: 0,          // waves started so far
    spawnQueue: [],      // [{t, type, path}] still to come, sorted by t
    nextWaveIn: null,    // countdown to the next wave; null = wait for the player
    enemies: [],
    towers: [],
    projectiles: [],
    nextUid: 1,
    result: null,        // null | 'win' | 'lose'
    stats: { kills: 0, leaked: 0 },
    events: []
  };
}

export function serialize(state) {
  const out = { levelId: state.level.id };
  for (const k of SAVED) out[k] = state[k];
  return JSON.parse(JSON.stringify(out));
}

export function deserialize(data) {
  const state = createState(data.levelId, data.seed);
  for (const k of SAVED) if (data[k] !== undefined) state[k] = data[k];
  return state;
}
