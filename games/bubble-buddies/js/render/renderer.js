// Draws the board every frame and turns rule events into motion: each bubble
// is a springy sprite that eases to its cell, wobbles when something lands
// nearby, inflates before it pops and tumbles when it falls.
//
// main.js decides *when* each event plays (renderer.after); this file decides
// how it looks.

import { W, H, R, D, ROW_H, SHOOTER, DEAD_Y, BOMB_REACH, SHOT_SPEED, BUDDIES } from '../config.js';
import { each, cellX, cellY } from '../core/grid.js';
import { danger as dangerOf } from '../core/game.js';
import { drawBuddy, colorOf } from './buddy.js';
import { createFx } from './fx.js';
import { createBackground, drawCeiling, THEME_ART } from './background.js';
import { drawLauncher, drawHeld, drawThrows } from './launcher.js';
import { drawDragon, holdPoint } from './dragon.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const easeOutBack = t => t >= 1 ? 1 : 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
const FLOOR = H - 26;

export function createRenderer(canvas, sfx, { lite = false } = {}) {
  const ctx = canvas.getContext('2d');
  let px = 1;
  const fx = createFx(lite);
  const bg = createBackground();

  const sprites = new Map();   // id → sprite, for bubbles on the board
  let popping = [];            // bubbles about to burst
  let falling = [];            // bubbles that lost their hold
  let shot = null;             // the bubble in flight
  const timers = [];

  let time = 0, shake = 0, flash = 0, flashColor = '#FFFFFF';
  let ceilY = 0, ceilV = 0;
  let recoil = 0;
  let queue = { cur: { color: 0 }, next: { color: 0 } };
  let ready = true, swapT = null, swapMode = 'swap', readyPop = null;
  let chargeShown = 0, chargeGlow = 0;
  let over = null;
  let theme = 'meadow';
  const mascot = { mood: 'idle', moodAge: 0, until: 0, throwAt: -9, blinkAt: 2, blinkEnd: 0 };
  let launcherShineAt = 1;

  /* ---------- sizing ---------- */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.max(1, Math.round(rect.width * dpr));
    if (canvas.width !== w) { canvas.width = w; canvas.height = Math.round(w * H / W); }
    px = canvas.width / W;
  }

  // board units from a pointer event
  function toBoard(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width * W, y: (clientY - rect.top) / rect.height * H };
  }

  /* ---------- sprites ---------- */
  function makeSprite(id, color, x, y) {
    return {
      id, color, special: null, gift: false, x, y, vx: 0, vy: 0, tx: x, ty: y,
      sq: 0, sqv: 0, appear: 1, delay: 0, rot: 0,
      blinkAt: time + rnd(0.5, 6), blinkEnd: 0, mood: null, moodUntil: 0, phase: rnd(0, TAU), r: 0, c: 0,
      shineAt: time + rnd(1, 9)
    };
  }

  function sync(st, intro) {
    const g = st.grid;
    const seen = new Set();
    each(g, (cell, r, c) => {
      seen.add(cell.id);
      const x = cellX(g, r, c), y = cellY(g, r);
      let sp = sprites.get(cell.id);
      if (!sp) {
        sp = makeSprite(cell.id, cell.color, x, y);
        sp.appear = 0;
        if (intro) { sp.delay = r * 0.065 + c * 0.012 + (intro.delay || 0); sp.y = y - 60; }
        else sp.y = y - ROW_H * 0.7;
        sprites.set(cell.id, sp);
      }
      sp.tx = x; sp.ty = y; sp.r = r; sp.c = c;
      sp.color = cell.color; sp.gift = !!cell.gift;
      if (cell.color >= 0) sp.special = null;
    });
    for (const id of [...sprites.keys()]) if (!seen.has(id)) sprites.delete(id);
  }

  function stepSprite(sp, dt) {
    if (sp.delay > 0) {
      sp.delay -= dt;
      if (sp.delay <= 0 && sp.c === 0) sfx.blip(sp.r);
      return;
    }
    sp.appear = Math.min(1, sp.appear + dt * 3.4);
    const K = 230, C = 15;
    sp.vx += ((sp.tx - sp.x) * K - sp.vx * C) * dt; sp.x += sp.vx * dt;
    sp.vy += ((sp.ty - sp.y) * K - sp.vy * C) * dt; sp.y += sp.vy * dt;
    sp.sqv += (-sp.sq * 420 - sp.sqv * 13) * dt; sp.sq += sp.sqv * dt;
    if (time > sp.blinkAt) { sp.blinkEnd = time + 0.13; sp.blinkAt = time + rnd(2, 7); }
    if (time > sp.shineAt + 0.6) sp.shineAt = time + rnd(4, 12);
  }

  function moodOf(sp, worried) {
    if (sp.moodUntil > time) return sp.mood;
    if (over === 'lose') return 'sad';
    if (worried && sp.ty > DEAD_Y - ROW_H * 2.2) return 'worried';
    return null;
  }

  function look(sp, pt) {
    const dx = pt.x - sp.x, dy = pt.y - sp.y;
    const d = Math.hypot(dx, dy) || 1;
    return { lx: dx / d * 0.07, ly: dy / d * 0.055 };
  }

  function drawSprite(sp, pt, worried, extra) {
    if (sp.delay > 0) return;
    const breathe = Math.sin(time * 2.2 + sp.phase) * 0.022;
    const { lx, ly } = look(sp, pt);
    drawBuddy(ctx, px, Object.assign({
      x: sp.x, y: sp.y, color: sp.color, special: sp.special, gift: sp.gift,
      scale: easeOutBack(sp.appear), sx: 1 + sp.sq + breathe, sy: 1 - sp.sq - breathe, rot: sp.rot,
      mood: moodOf(sp, worried), blink: time < sp.blinkEnd ? 1 : 0, lx, ly, t: time + sp.phase,
      shine: (time - sp.shineAt) / 0.6,
      grey: over === 'lose' && sp.greyAt != null && time > sp.greyAt
    }, extra));
  }

  function setMood(sp, mood, dur) { sp.mood = mood; sp.moodUntil = time + dur; }
  function setMascot(mood, dur) { mascot.mood = mood; mascot.moodAge = 0; mascot.until = time + dur; }

  /* ---------- the shot ---------- */
  function launch(ev, onArrive) {
    const pts = ev.points;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    shot = { pts, cum, ball: ev.ball, d: 0, total: cum[cum.length - 1], nb: 1, x: pts[0].x, y: pts[0].y, ang: 0, wall: 0, onArrive };
    ready = false; swapT = null;
    recoil = 1;
    const a = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    fx.puff(SHOOTER.x + Math.cos(a) * 44, SHOOTER.y + Math.sin(a) * 44, 4, 'rgba(255,255,255,.9)', 6);
    sfx.shoot();
  }

  function stepShot(dt) {
    const s = shot;
    s.d = Math.min(s.total, s.d + SHOT_SPEED * dt);
    let i = 1;
    while (i < s.cum.length - 1 && s.cum[i] < s.d) i++;
    const a = s.pts[i - 1], b = s.pts[i];
    const seg = s.cum[i] - s.cum[i - 1] || 1;
    const k = (s.d - s.cum[i - 1]) / seg;
    s.x = a.x + (b.x - a.x) * k; s.y = a.y + (b.y - a.y) * k;
    s.ang = Math.atan2(b.y - a.y, b.x - a.x);
    for (; s.nb < s.pts.length - 1 && s.cum[s.nb] <= s.d; s.nb++) {
      if (s.pts[s.nb].bounce) {
        sfx.bounce();
        fx.puff(s.pts[s.nb].x, s.pts[s.nb].y, 3, 'rgba(255,255,255,.9)', 4);
        fx.ring(s.pts[s.nb].x, s.pts[s.nb].y, '#FFFFFF', 18, 0.25, 3);
        s.wall = 1;
      }
    }
    s.wall = Math.max(0, s.wall - dt * 7);
    const col = colorOf(s.ball.color, s.ball.special);
    fx.trail(s.x, s.y, s.ball.special === 'rainbow' ? BUDDIES[Math.floor(time * 20) % BUDDIES.length].light : col.light);
    if (s.d >= s.total) {
      const cb = s.onArrive;
      shot = null;
      cb();
    }
  }

  function drawShot() {
    const s = shot;
    const stretch = 0.14 - s.wall * 0.3;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.ang + Math.PI / 2);
    ctx.scale(1 - stretch * 0.6, 1 + stretch);
    ctx.rotate(-(s.ang + Math.PI / 2));
    drawBuddy(ctx, px, { x: 0, y: 0, color: s.ball.color, special: s.ball.special, mood: 'happy', t: time });
    ctx.restore();
  }

  /* ---------- aim guide ---------- */
  function drawAim(tr, ball) {
    const col = colorOf(ball.color, ball.special);
    const pts = tr.points, total = tr.length;
    const gap = 15;
    let dist = (time * 50) % gap + 26;
    let seg = 1, segStart = 0;
    while (dist < total - 22 && seg < pts.length) {
      const a = pts[seg - 1], b = pts[seg];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist > segStart + len) { segStart += len; seg++; continue; }
      const k = (dist - segStart) / (len || 1);
      const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
      const f = dist / total;
      ctx.globalAlpha = 0.95 - f * 0.45;
      ctx.beginPath(); ctx.arc(x, y, 3.6 - f * 1.3, 0, TAU);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = col.dark; ctx.stroke();
      dist += gap;
    }
    ctx.globalAlpha = 1;
    const end = pts[pts.length - 1];
    const pulse = (Math.sin(time * 6) + 1) / 2;
    if (ball.special === 'bomb') {
      ctx.save(); ctx.setLineDash([5, 6]); ctx.lineDashOffset = -time * 20;
      ctx.beginPath(); ctx.arc(end.x, end.y, BOMB_REACH, 0, TAU);
      ctx.fillStyle = 'rgba(255,90,110,.12)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,110,.8)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    } else if (ball.special === 'lightning') {
      ctx.fillStyle = `rgba(255,240,120,${0.18 + pulse * 0.12})`;
      ctx.fillRect(0, end.y - R, W, D);
    }
    ctx.globalAlpha = 0.42;
    drawBuddy(ctx, px, { x: end.x, y: end.y, color: ball.color, special: ball.special, scale: 0.92, t: time, mood: 'happy' });
    ctx.globalAlpha = 0.5 + pulse * 0.4;
    ctx.save(); ctx.setLineDash([4, 4]); ctx.lineDashOffset = time * 12;
    ctx.beginPath(); ctx.arc(end.x, end.y, R + 2 + pulse * 2, 0, TAU);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ---------- per-frame ---------- */
  function frame(dt, st, view) {
    time += dt;
    for (let i = timers.length - 1; i >= 0; i--) {
      if (timers[i].at <= time) { const fn = timers[i].fn; timers.splice(i, 1); fn(); }
    }
    resize();
    theme = st.theme;

    // physics
    for (const sp of sprites.values()) stepSprite(sp, dt);
    // now and then a bubble catches the light
    if (sprites.size && Math.random() < dt * (lite ? 0.5 : 1.6)) {
      const list = [...sprites.values()];
      const sp = list[Math.floor(Math.random() * list.length)];
      if (sp.delay <= 0) fx.sparkle(sp.x - R * 0.35, sp.y - R * 0.5, '#FFFFFF', rnd(4, 7));
    }
    if (shot) stepShot(dt);
    stepPopping(dt);
    stepFalling(dt);
    fx.update(dt);
    recoil = Math.max(0, recoil - dt * 6);
    shake = Math.max(0, shake - dt * 30);
    flash = Math.max(0, flash - dt * 2.5);
    chargeShown += (st.charge - chargeShown) * Math.min(1, dt * 6);
    if (st.charge < chargeShown - 0.5 && st.charge < 2) chargeShown = st.charge;
    chargeGlow = Math.max(0, chargeGlow - dt * 2);
    if (swapT != null) { swapT = Math.min(1, swapT + dt * 4.5); if (swapT >= 1) swapT = null; }
    if (readyPop != null) { readyPop = Math.min(1, readyPop + dt * 4); if (readyPop >= 1) readyPop = null; }
    const ceilTarget = st.grid.ceil * ROW_H;
    ceilV += ((ceilTarget - ceilY) * 260 - ceilV * 14) * dt; ceilY += ceilV * dt;
    mascot.moodAge += dt;
    const dz = st.over ? 0 : dangerOf(st);
    if (mascot.until < time) mascot.mood = over === 'lose' ? 'sad' : dz ? 'worried' : 'idle';

    // where everyone looks: the bubble in flight, else the aim spot
    const pt = shot ? { x: shot.x, y: shot.y } : view.trace ? view.trace.points[view.trace.points.length - 1] : { x: SHOOTER.x, y: SHOOTER.y };

    // draw
    ctx.setTransform(px, 0, 0, px, 0, 0);
    bg.draw(ctx, px, theme, time, dt, dz);

    ctx.save();
    if (shake > 0) ctx.translate(rnd(-shake, shake) * 0.5, rnd(-shake, shake) * 0.5);
    const warn = !st.over && st.misses === st.pushEvery - 1 && st.mode === 'level' ? 1 : 0;
    drawCeiling(ctx, theme, ceilY, time, warn);
    if (warn) {
      for (const sp of sprites.values()) sp.x += Math.sin(time * 40 + sp.phase) * 0.25;
    }
    for (const sp of sprites.values()) drawSprite(sp, pt, dz > 0);
    for (const p of popping) {
      const pre = p.at - time;
      const k = Math.max(0, Math.min(1, 1 - pre / 0.14));
      drawSprite(p.sp, pt, false, { scale: 1 + k * 0.28, rot: Math.sin(time * 40 + p.sp.phase) * 0.12 * k });
    }
    if (view.trace && !shot && ready && !st.over) drawAim(view.trace, queue.cur);
    if (shot) drawShot();
    ctx.restore();

    if (time > launcherShineAt + 0.6) launcherShineAt = time + rnd(2.5, 5);
    const lv = {
      angle: view.angle, recoil, cur: queue.cur, next: queue.next, swapT, swapMode, readyPop,
      charge: chargeShown, chargeGlow, misses: st.misses, pushEvery: st.pushEvery, time, px, ready: ready && !st.over,
      shine: (time - launcherShineAt) / 0.6
    };
    drawLauncher(ctx, lv);
    if (time > mascot.blinkAt) { mascot.blinkEnd = time + 0.14; mascot.blinkAt = time + (Math.random() < 0.25 ? 0.3 : rnd(2.5, 5)); }
    const h = holdPoint();
    const ldx = pt.x - h.x, ldy = pt.y - h.y, ld = Math.hypot(ldx, ldy) || 1;
    drawDragon(ctx, px, {
      mood: mascot.mood, moodAge: mascot.moodAge, t: time, throwAge: time - mascot.throwAt,
      lookX: ldx / ld, lookY: ldy / ld, blink: time < mascot.blinkEnd
    }, c => drawHeld(c, lv));
    drawThrows(ctx, lv);

    ctx.save();
    if (shake > 0) ctx.translate(rnd(-shake, shake) * 0.5, rnd(-shake, shake) * 0.5);
    for (const f of falling) drawSprite(f.sp, pt, false, f.started ? { mood: 'surprised' } : { x: f.sp.x + Math.sin(time * 60 + f.sp.phase) * 1.2 });
    fx.draw(ctx, time);
    ctx.restore();

    if (flash > 0) {
      ctx.globalAlpha = Math.min(1, flash) * 0.6;
      ctx.fillStyle = flashColor; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- pops and drops ---------- */
  function pop(list, delay) {
    const ranked = list.slice().sort((a, b) => a.order - b.order);
    ranked.forEach((item, idx) => {
      let sp = sprites.get(item.id);
      sprites.delete(item.id);
      if (!sp) { sp = makeSprite(item.id, item.color, item.x, item.y); }
      setMood(sp, 'happy', 99);
      popping.push({ sp, at: time + delay + item.order * 0.05, idx, item });
    });
  }

  function stepPopping() {
    popping = popping.filter(p => {
      if (p.at > time) return true;
      const col = colorOf(p.item.color, p.sp.special);
      fx.burst(p.sp.x, p.sp.y, col, 1);
      if (p.item.gift) fx.hearts(p.sp.x, p.sp.y, 6);
      sfx.pop(p.idx);
      // neighbours flinch
      for (const sp of sprites.values()) {
        const dx = sp.x - p.sp.x, dy = sp.y - p.sp.y, d = Math.hypot(dx, dy);
        if (d < D * 1.6 && d > 0) { sp.vx += dx / d * 40; sp.vy += dy / d * 40; if (Math.random() < 0.5) setMood(sp, 'surprised', 0.4); }
      }
      return false;
    });
  }

  function drop(list, delay, each) {
    list.forEach((item, i) => {
      let sp = sprites.get(item.id);
      sprites.delete(item.id);
      if (!sp) sp = makeSprite(item.id, item.color, item.x, item.y);
      falling.push({ sp, at: time + delay + rnd(0, 0.08) + (item.y % 40) * 0.001, started: false, bounced: false, vx: 0, vy: 0, vr: 0, pts: each, idx: i, gift: item.gift });
    });
  }

  function stepFalling(dt) {
    falling = falling.filter(f => {
      const sp = f.sp;
      if (f.at > time) return true;
      if (!f.started) {
        f.started = true;
        f.vy = rnd(-220, -70);
        f.vx = rnd(-80, 80) + (sp.x - W / 2) * 0.25;
        f.vr = rnd(-5, 5);
        if (f.idx === 0) sfx.whee();
      }
      f.vy += 1500 * dt;
      sp.x += f.vx * dt; sp.y += f.vy * dt; sp.rot += f.vr * dt;
      sp.sqv += (-sp.sq * 420 - sp.sqv * 13) * dt; sp.sq += sp.sqv * dt;
      if (sp.x < R) { sp.x = R; f.vx = Math.abs(f.vx) * 0.6; }
      if (sp.x > W - R) { sp.x = W - R; f.vx = -Math.abs(f.vx) * 0.6; }
      if (sp.y > FLOOR - R && f.vy > 0) {
        if (!f.bounced && f.pts != null) {
          f.bounced = true;
          sp.y = FLOOR - R;
          f.vy = -f.vy * 0.45; f.vx *= 0.7;
          sp.sq = 0.3;
          return true;
        }
        if (f.pts != null) {
          const col = colorOf(sp.color, sp.special);
          fx.burst(sp.x, sp.y, col, 0.8);
          fx.text(sp.x, sp.y - 16, '+' + Math.round(f.pts), '#FFF3A0', 15, 0.8);
          if (f.gift) fx.hearts(sp.x, sp.y, 5);
          sfx.coin(f.idx);
          return false;
        }
        if (sp.y > H + R * 2) return false;
      }
      return true;
    });
  }

  /* ---------- the public side ---------- */
  return {
    toBoard,
    frame,
    after(sec, fn) { timers.push({ at: time + sec, fn }); },
    get busyFx() { return !!shot || popping.length > 0; },

    reset(st, opts = {}) {
      sprites.clear(); popping = []; falling = []; shot = null; timers.length = 0;
      over = null; theme = st.theme;
      ceilY = st.grid.ceil * ROW_H; ceilV = 0;
      chargeShown = st.charge;
      queue = { cur: st.cur, next: st.next };
      ready = true; swapT = null; readyPop = 0;
      mascot.mood = 'idle'; mascot.until = 0;
      sync(st, opts.intro ? { delay: 0.25 } : null);
      if (opts.banner) fx.banner(opts.banner, { sub: opts.sub, a: '#FFFFFF', b: '#FFE07A', size: 50, life: 1.6 });
    },
    sync: st => sync(st, null),

    setQueue(cur, next, mode) {
      queue = { cur, next };
      ready = true;
      if (mode) { swapT = 0; swapMode = mode; mascot.throwAt = time; }
    },

    launch,

    land(e, ball) {
      const sp = makeSprite(e.id, ball.color, e.x, e.y);
      if (e.rainbow) sp.special = 'rainbow';
      sp.sq = 0.24; sp.sqv = 0;
      sprites.set(e.id, sp);
      setMood(sp, 'happy', 0.5);
      for (const o of sprites.values()) {
        if (o === sp) continue;
        const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy);
        if (d < D * 3.2 && d > 0) {
          const f = (1 - d / (D * 3.2)) * 120;
          o.vx += dx / d * f; o.vy += dy / d * f;
          if (d < D * 1.3) setMood(o, 'surprised', 0.45);
        }
      }
      fx.puff(e.x, e.y + 6, 3, 'rgba(255,255,255,.8)', 8);
      sfx.land();
    },

    bomb(e) {
      fx.burst(e.x, e.y, { main: '#FF9B3D', light: '#FFE07A' }, 2.2);
      fx.burst(e.x, e.y, { main: '#5B5F9A', light: '#FFFFFF' }, 1.2);
      fx.ring(e.x, e.y, '#FFE07A', BOMB_REACH * 1.5, 0.45, 10);
      fx.ring(e.x, e.y, '#FFFFFF', BOMB_REACH, 0.3, 6);
      fx.puff(e.x, e.y, 14, 'rgba(255,240,220,.9)', 30);
      shake = lite ? 3 : 12; flash = 0.8; flashColor = '#FFF4D6';
      setMascot('wow', 0.8);
      sfx.boom();
    },

    zap(e) {
      fx.bolt(0, e.y, W, e.y);
      fx.bolt(e.x, SHOOTER.y - 30, e.x, e.y);
      for (let x = 20; x < W; x += 40) fx.sparkle(x, e.y + rnd(-8, 8), '#BFE6FF', 7);
      shake = lite ? 2 : 7; flash = 0.6; flashColor = '#E6F4FF';
      setMascot('wow', 0.8);
      sfx.zap();
    },

    rainbow(e) {
      const sp = sprites.get(e.id);
      for (let i = 0; i < 8; i++) fx.sparkle(e.x + rnd(-18, 18), e.y + rnd(-18, 18), BUDDIES[i % BUDDIES.length].light, 7);
      BUDDIES.forEach((b, i) => fx.ring(e.x, e.y, b.main, 30 + i * 9, 0.4 + i * 0.04, 3));
      if (!e.popped && sp) { sp.special = null; sp.color = e.color; sp.sq = 0.3; }
      sfx.shimmer();
    },

    pop(list, delay) { pop(list, delay); },
    drop(list, delay, each) { drop(list, delay, each); },

    text(x, y, str, color, size, life) { fx.text(x, y, str, color, size, life); },
    banner(str, opts) { fx.banner(str, opts); },
    shake(n) { shake = Math.max(shake, lite ? n * 0.3 : n); },
    confetti(n) { fx.confetti(n); },
    cheer(dur = 1.4) { setMascot('cheer', dur); },
    wow() { setMascot('wow', 0.6); },

    // a sparkle flies to the launcher, then the power-up is there
    gift(e) {
      fx.text(e.x, e.y - 10, 'Gift!', '#FFE07A', 18);
      const h = holdPoint();
      fx.fly(e.x, e.y, h.x, h.y, '#FFE07A', () => {
        fx.burst(h.x, h.y, { main: '#FFD23C', light: '#FFFFFF' }, 1);
        setMascot('wow', 0.7);
        sfx.powerup();
      });
    },
    charged() {
      chargeGlow = 1;
      const h = holdPoint();
      for (let i = 0; i < 5; i++) {
        fx.fly(SHOOTER.x + rnd(-40, 40), SHOOTER.y + 40, h.x, h.y, BUDDIES[i % BUDDIES.length].light, i === 4 ? () => {
          fx.burst(h.x, h.y, { main: '#FF7EB0', light: '#FFFFFF' }, 1.2);
          sfx.powerup();
        } : null, i * 0.06);
      }
      fx.banner('Power up!', { a: '#FFFFFF', b: '#FF9EC0', size: 40, life: 1.1, y: 330 });
      setMascot('cheer', 1);
    },

    miss(e) {
      if (e.of - e.misses === 1) { sfx.warn(); setMascot('worried', 1.2); }
    },

    push(e, st) {
      sync(st);
      if (e.kind === 'ceil') {
        for (let x = 10; x < W; x += 26) fx.puff(x, st.grid.ceil * ROW_H + 4, 1, 'rgba(255,255,255,.95)', 4);
        for (const sp of sprites.values()) setMood(sp, 'surprised', 0.6);
      }
      shake = lite ? 2 : 8;
      sfx.thud();
    },

    wave(e, st) {
      sync(st, { delay: 0 });
      for (const sp of sprites.values()) { sp.appear = 0; sp.delay = sp.r * 0.06 + sp.c * 0.012; sp.y = sp.ty - 60; }
      fx.banner('Wave ' + e.wave, { sub: '+' + e.bonus + ' bonus', a: '#FFFFFF', b: '#FFE07A', rays: true, size: 50, life: 1.6 });
      fx.confetti(60);
      sfx.win();
      setMascot('cheer', 1.6);
    },

    win() {
      fx.confetti(170);
      fx.banner('Level clear!', { a: '#FFFFFF', b: '#FFE07A', rays: true, size: 50, life: 2.2 });
      for (let i = 0; i < 5; i++) {
        timers.push({ at: time + 0.2 + i * 0.28, fn: () => {
          const x = rnd(60, W - 60), y = rnd(80, 320);
          fx.burst(x, y, BUDDIES[i % BUDDIES.length], 2);
          fx.ring(x, y, '#FFFFFF', 70, 0.5, 4);
          sfx.pop(i * 2);
        } });
      }
      setMascot('cheer', 99);
      sfx.win();
    },

    lose() {
      over = 'lose';
      setMascot('sad', 99);
      sfx.lose();
      const list = [...sprites.values()].sort((a, b) => b.ty - a.ty);
      list.forEach((sp, i) => { sp.greyAt = time + 0.3 + i * 0.008; });
      // then everyone tumbles down, bottom rows first
      timers.push({ at: time + 1.0, fn: () => {
        list.forEach((sp, i) => {
          sprites.delete(sp.id);
          falling.push({ sp, at: time + i * 0.012, started: false, bounced: true, vx: 0, vy: 0, vr: 0, pts: null, idx: i + 1 });
        });
      } });
    },

    revive() { over = null; }
  };
}

export { THEME_ART };
