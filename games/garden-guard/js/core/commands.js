// Everything a player (or the balance bot) can do. Each command checks its own
// rules and returns { ok, reason }, so the UI never has to repeat them.

import { EARLY_BONUS_PER_SEC, TARGET_MODES } from '../config.js';
import { TOWERS, POWERS } from '../data/registry.js';
import { hpScale } from './combat.js';
import { emit } from './events.js';
import { startWave } from './sim.js';
import { nextUpgrade, sellValue } from './towers.js';

const fail = reason => ({ ok: false, reason });

export const towerOnPad = (state, padIdx) => state.towers.find(t => t.pad === padIdx) || null;
export const towerByUid = (state, uid) => state.towers.find(t => t.uid === uid) || null;

export function canBuild(state, padIdx, type) {
  const def = TOWERS[type];
  if (state.result) return fail('over');
  if (!def || !state.level.towers.includes(type)) return fail('locked');
  if (!state.pads[padIdx]) return fail('nopad');
  if (towerOnPad(state, padIdx)) return fail('taken');
  if (state.gold < def.cost) return fail('gold');
  return { ok: true };
}

export function build(state, padIdx, type) {
  const check = canBuild(state, padIdx, type);
  if (!check.ok) return check;
  const def = TOWERS[type], pad = state.pads[padIdx];
  state.gold -= def.cost;
  const tower = {
    uid: state.nextUid++, type, pad: padIdx,
    x: pad.c + 0.5, y: pad.r + 0.5,
    level: 0, branch: null,
    cd: 0, aim: -Math.PI / 2, mode: def.mode || 'first',
    spent: def.cost, builtWave: state.waveIdx
  };
  state.towers.push(tower);
  emit(state, 'build', { uid: tower.uid, kind: type, x: tower.x, y: tower.y });
  return { ok: true, tower };
}

export function upgrade(state, uid) {
  const t = towerByUid(state, uid);
  if (!t || state.result) return fail('over');
  const up = nextUpgrade(t);
  if (!up) return fail('max');
  if (state.gold < up.cost) return fail('gold');
  state.gold -= up.cost;
  t.spent += up.cost;
  t.level++;
  emit(state, 'upgrade', { uid, kind: t.type, x: t.x, y: t.y, level: t.level });
  return { ok: true };
}

export function sell(state, uid) {
  const t = towerByUid(state, uid);
  if (!t || state.result) return fail('over');
  const value = sellValue(state, t);
  state.gold += value;
  state.towers = state.towers.filter(x => x !== t);
  emit(state, 'sell', { uid, kind: t.type, level: t.level, x: t.x, y: t.y, value });
  return { ok: true, value };
}

export function cycleMode(state, uid) {
  const t = towerByUid(state, uid);
  if (!t) return fail('none');
  t.mode = TARGET_MODES[(TARGET_MODES.indexOf(t.mode) + 1) % TARGET_MODES.length];
  return { ok: true, mode: t.mode };
}

export function earlyBonus(state) {
  return state.nextWaveIn === null ? 0 : Math.round(state.nextWaveIn * EARLY_BONUS_PER_SEC);
}

export function callWave(state) {
  if (state.result) return fail('over');
  if (state.waveIdx >= state.waves.length) return fail('last');
  const bonus = earlyBonus(state);
  state.gold += bonus;
  startWave(state);
  if (bonus) emit(state, 'bonus', { gold: bonus });
  return { ok: true, bonus };
}

export function canCast(state, id) {
  if (state.result) return fail('over');
  if (!POWERS[id] || !(id in state.powerCd)) return fail('locked');
  if (state.powerCd[id] > 0) return fail('cooldown');
  return { ok: true };
}

export function castPower(state, id, x, y) {
  const check = canCast(state, id);
  if (!check.ok) return check;
  const def = POWERS[id];
  state.powerCd[id] = def.cooldown;
  const zone = { uid: state.nextUid++, kind: id, x, y, r: def.radius, t: def.dur, dur: def.dur };
  if (def.slow) zone.slow = def.slow;
  if (def.dps) zone.dps = def.dps * hpScale(state);
  state.zones.push(zone);
  emit(state, 'power', { kind: id, x, y, r: def.radius });
  return { ok: true };
}
