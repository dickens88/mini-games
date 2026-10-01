// Tower stats as they stand right now (level and, later, branch applied).

import { TOWERS } from '../data/registry.js';
import { SELL_RATIO } from '../config.js';

export function towerDef(tower) {
  return TOWERS[tower.type];
}

export function towerStats(tower) {
  const def = TOWERS[tower.type];
  return Object.assign({}, def.levels[0], ...def.levels.slice(1, tower.level + 1));
}

export function nextUpgrade(tower) {
  const def = TOWERS[tower.type];
  const next = def.levels[tower.level + 1];
  return next ? { cost: next.cost, stats: Object.assign(towerStats(tower), next) } : null;
}

// full refund until the next wave starts, so a misplaced tower costs nothing
export function sellValue(state, tower) {
  return tower.builtWave === state.waveIdx ? tower.spent : Math.floor(tower.spent * SELL_RATIO);
}
