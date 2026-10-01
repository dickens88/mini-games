// The game loop, one fixed step at a time. Pure logic: no DOM, no canvas,
// no clock — the caller decides how many steps to run (×2 speed = two per frame).

import { STEP, WAVE_GAP } from '../config.js';
import { ENEMIES } from '../data/registry.js';
import { emit } from './events.js';
import { pointAt } from './path.js';
import { nextRandom } from './rng.js';
import { damage, spawnEnemy, enemiesNear, speedFactor } from './combat.js';
import { towerDef, towerStats } from './towers.js';
import { pickTarget } from './targeting.js';

// What tower and enemy hooks are allowed to touch.
export function makeCtx(state) {
  const ctx = {
    state,
    emit: (type, data) => emit(state, type, data),
    random: () => nextRandom(state),
    damage: (enemy, amount, opts = {}) => damage(state, enemy, amount, Object.assign({ ctx }, opts)),
    spawn: (type, pathIdx, d) => spawnEnemy(state, type, pathIdx, d),
    near: (x, y, r, opts) => enemiesNear(state, x, y, r, opts)
  };
  return ctx;
}

export function startWave(state) {
  if (state.waveIdx >= state.waves.length) return;
  const waveNo = ++state.waveIdx;
  const roads = state.paths.length;
  let turn = 0;
  for (const s of state.waves[waveNo - 1]) {
    const path = s.path !== null ? Math.min(s.path, roads - 1) : (turn++ % roads);
    state.spawnQueue.push({ t: state.time + s.at, type: s.type, path, wave: waveNo });
  }
  state.spawnQueue.sort((a, b) => a.t - b.t);
  state.nextWaveIn = null;
  emit(state, 'wave', { wave: waveNo });
}

export function step(state) {
  if (state.result) return;
  const dt = STEP;
  const ctx = makeCtx(state);
  state.time += dt;

  // waves
  if (state.nextWaveIn !== null) {
    state.nextWaveIn -= dt;
    if (state.nextWaveIn <= 0) startWave(state);
  }
  while (state.spawnQueue.length && state.spawnQueue[0].t <= state.time) {
    const s = state.spawnQueue.shift();
    spawnEnemy(state, s.type, s.path, 0, s.wave);
    if (!state.spawnQueue.length && state.waveIdx < state.waves.length && state.nextWaveIn === null) {
      state.nextWaveIn = WAVE_GAP;
    }
  }

  moveEnemies(state, ctx, dt);
  runTowers(state, ctx, dt);
  moveProjectiles(state, ctx, dt);

  state.enemies = state.enemies.filter(e => !e.dead);

  if (state.lives <= 0) {
    state.lives = 0;
    state.result = 'lose';
    emit(state, 'end', { result: 'lose' });
  } else if (state.waveIdx >= state.waves.length && !state.spawnQueue.length && !state.enemies.length) {
    state.result = 'win';
    emit(state, 'end', { result: 'win' });
  }
}

function moveEnemies(state, ctx, dt) {
  for (const e of state.enemies) {
    if (e.dead) continue;
    for (const k in e.fx) {
      const f = e.fx[k];
      if (f.dps) ctx.damage(e, f.dps * dt, { pierce: true });
      f.t -= dt;
      if (f.t <= 0) delete e.fx[k];
    }
    if (e.dead) continue;
    const def = ENEMIES[e.type];
    if (def.onTick) def.onTick(ctx, e, dt);

    e.d += e.speed * speedFactor(e) * dt;
    const path = state.paths[e.path];
    if (e.d >= path.len) {
      e.dead = true;
      state.lives -= e.bite;
      state.stats.leaked++;
      emit(state, 'leak', { kind: e.type, bite: e.bite, x: e.x, y: e.y });
      continue;
    }
    const p = pointAt(path, e.d);
    e.x = p.x; e.y = p.y; e.dir = p.dir;
  }
}

function runTowers(state, ctx, dt) {
  for (const t of state.towers) {
    const def = towerDef(t), stats = towerStats(t);
    if (def.aura) def.aura(ctx, t, stats, dt);
    if (def.attack !== 'shoot') continue;
    t.cd = Math.max(0, t.cd - dt);
    if (t.cd > 0) continue;
    const target = pickTarget(state, t, def, stats);
    if (!target) continue;
    t.cd = stats.rate;
    t.aim = Math.atan2(target.y - t.y, target.x - t.x);
    if (def.onFire) { def.onFire(ctx, t, stats, target); continue; }
    fire(state, t, def, stats, target);
  }
}

export function fire(state, tower, def, stats, target, extra = {}) {
  state.projectiles.push(Object.assign({
    uid: state.nextUid++,
    from: tower.uid, kind: tower.type, look: def.projectile.look,
    x: tower.x, y: tower.y, tx: target.x, ty: target.y,
    target: target.uid, speed: def.projectile.speed,
    dmg: stats.dmg, splash: stats.splash || 0, pierce: !!stats.pierce
  }, extra));
  emit(state, 'shoot', { from: tower.uid, kind: tower.type });
}

function moveProjectiles(state, ctx, dt) {
  const alive = [];
  for (const p of state.projectiles) {
    const target = state.enemies.find(e => e.uid === p.target && !e.dead);
    if (target) { p.tx = target.x; p.ty = target.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy);
    const stepLen = p.speed * dt;
    if (dist > stepLen) {
      p.x += dx / dist * stepLen;
      p.y += dy / dist * stepLen;
      alive.push(p);
      continue;
    }
    p.x = p.tx; p.y = p.ty;
    const def = towerDef({ type: p.kind });
    if (def.onHit) def.onHit(ctx, p, target);
    else if (p.splash) {
      for (const e of ctx.near(p.x, p.y, p.splash, { air: false })) ctx.damage(e, p.dmg, { pierce: p.pierce });
    } else if (target) {
      ctx.damage(target, p.dmg, { pierce: p.pierce });
    }
    emit(state, 'hit', { kind: p.kind, x: p.x, y: p.y, splash: p.splash, target: target ? target.uid : 0 });
  }
  state.projectiles = alive;
}
