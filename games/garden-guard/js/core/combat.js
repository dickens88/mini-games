// Damage, kills and spawning. These are also the building blocks handed to
// tower and enemy hooks through ctx (see makeCtx in sim.js).

import { ENEMIES } from '../data/registry.js';
import { emit } from './events.js';
import { pointAt } from './path.js';

function hpScale(state, waveNo) {
  return (1 + 0.1 * (waveNo - 1)) * (state.level.hpMul || 1);
}

export function spawnEnemy(state, type, pathIdx, d = 0, waveNo = state.waveIdx) {
  const def = ENEMIES[type];
  if (!def) throw new Error('unknown enemy ' + type);
  const hp = Math.round(def.hp * hpScale(state, waveNo));
  const pos = pointAt(state.paths[pathIdx], d);
  const e = {
    uid: state.nextUid++, type, path: pathIdx, d,
    x: pos.x, y: pos.y, dir: pos.dir,
    hp, maxHp: hp,
    speed: def.speed, armor: def.armor || 0, flying: !!def.flying,
    bite: def.bite, bounty: def.bounty,
    fx: {},            // status effects by name: { t: seconds left, ... }
    dead: false
  };
  state.enemies.push(e);
  return e;
}

// opts.pierce ignores armour; returns the damage actually dealt
export function damage(state, enemy, amount, opts = {}) {
  if (enemy.dead || amount <= 0) return 0;
  const dealt = opts.pierce ? amount : Math.max(1, amount - enemy.armor);
  enemy.hp -= dealt;
  if (enemy.hp <= 0) kill(state, enemy, opts.ctx);
  return dealt;
}

function kill(state, enemy, ctx) {
  enemy.dead = true;
  enemy.hp = 0;
  state.gold += enemy.bounty;
  state.stats.kills++;
  emit(state, 'kill', { uid: enemy.uid, kind: enemy.type, x: enemy.x, y: enemy.y, bounty: enemy.bounty });
  const def = ENEMIES[enemy.type];
  if (def.onDeath && ctx) def.onDeath(ctx, enemy);
}

export function enemiesNear(state, x, y, r, { air = true, ground = true } = {}) {
  return state.enemies.filter(e => !e.dead && (e.flying ? air : ground) &&
    (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y) <= r * r);
}

// slower effects win; returns the multiplier for this step
export function speedFactor(enemy) {
  let f = 1;
  for (const k in enemy.fx) if (enemy.fx[k].slow) f = Math.min(f, 1 - enemy.fx[k].slow);
  return f;
}
