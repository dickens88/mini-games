// Everything that flies about for a moment: laser beams, bursts, floating
// "+15"s, the right answer shown where a meteor landed, banners, screen
// shake and the hero's mood. react() turns the round's events into these (and
// sounds); updateFx() ages them.

import { W, GROUND } from '../config.js';
import { THEMES } from './themes.js';
import { powerById } from '../data/powerups.js';
import { sfx } from '../audio.js';

export function createFx() {
  return {
    parts: [], beams: [], pops: [], banners: [], rings: [],
    shake: 0, flash: 0, flashColor: '255,77,109',
    wrongT: 0,
    hold: { x: W / 2, y: GROUND + 20 },     // the blaster; the renderer keeps this up to date
    dino: { mood: 'idle', moodAge: 0, moodLeft: 0, throwAge: null, blink: false, blinkT: 2, lookX: 0, lookY: 0, t: 0 }
  };
}

function burst(fx, x, y, colors, n, speed, size) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.9);
    fx.parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.2,
      life: 0.5 + Math.random() * 0.5, age: 0, size: size * (0.5 + Math.random()),
      color: colors[i % colors.length], g: 300
    });
  }
}

export function pop(fx, x, y, text, color, size, life) {
  fx.pops.push({ x, y, text, color, size: size || 24, life: life || 0.9, age: 0 });
}

export function banner(fx, text, sub, color, life) {
  fx.banners = fx.banners.filter(b => b.text !== text);
  fx.banners.push({ text, sub: sub || '', color: color || '#FFD84D', life: life || 1.8, age: 0 });
}

export function mood(fx, m, secs) {
  fx.dino.mood = m;
  fx.dino.moodAge = 0;
  fx.dino.moodLeft = secs || 1.2;
}

const MILESTONES = { 5: 'Combo ×2!', 10: 'Combo ×3!', 15: 'Combo ×4!', 20: 'On fire!', 30: 'Unstoppable!', 40: 'Legendary!' };

export function react(fx, events, s, world) {
  const th = THEMES[world];
  for (const e of events) {
    switch (e.type) {
      case 'start':
        banner(fx, e.name, 'Get ready…', '#FFFFFF', 1.7);
        sfx.start();
        break;
      case 'spawn':
        if (e.kind !== 'shower') sfx.spawn();
        break;
      case 'typed':
        break;
      case 'zap': {
        fx.beams.push({ x1: e.x, y1: e.y, age: 0, life: 0.22, gold: e.target !== 'meteor' || e.kind === 'shower' });
        fx.dino.throwAge = 0;
        const colors = e.kind === 'shower' ? ['#FFD84D', '#FFF4B8', '#FFFFFF'] : th.burst;
        burst(fx, e.x, e.y, colors, e.target === 'boss' ? 26 : 18, 260, 5);
        fx.rings.push({ x: e.x, y: e.y, age: 0, life: 0.35, r: 50 });
        pop(fx, e.x, e.y - 30, '+' + e.points, e.fast ? '#FFD84D' : '#FFFFFF', e.mult > 1 ? 28 : 24);
        if (e.fast && e.target === 'meteor' && e.kind !== 'shower') pop(fx, e.x, e.y + 8, 'quick!', '#7CF3FF', 16, 0.7);
        sfx.zap(e.combo);
        setTimeout(() => sfx.boom(), 60);
        if (MILESTONES[e.combo]) { banner(fx, MILESTONES[e.combo], e.combo + ' in a row', '#FFD84D', 1.4); sfx.combo(); mood(fx, 'cheer', 1.4); }
        else if (fx.dino.mood !== 'cheer') mood(fx, 'wow', 0.5);
        break;
      }
      case 'split':
        burst(fx, e.x, e.y, ['#FFF0AA', '#FFFFFF'], 12, 200, 4);
        pop(fx, e.x, e.y - 52, 'Split!', '#FFF0AA', 18, 0.8);
        sfx.split();
        break;
      case 'pop':
        burst(fx, e.x, e.y, th.burst, 14, 240, 5);
        fx.rings.push({ x: e.x, y: e.y, age: 0, life: 0.35, r: 46 });
        break;
      case 'land':
        if (e.kind === 'shower') {
          burst(fx, e.x, e.y, ['#FFD84D', '#FFF4B8'], 8, 120, 3);
          sfx.fizzle();
          break;
        }
        burst(fx, e.x, e.y - 6, th.burst.concat(['#888']), 30, 320, 6);
        fx.rings.push({ x: e.x, y: e.y, age: 0, life: 0.5, r: 90 });
        // the right answer, big, where it landed
        pop(fx, Math.max(110, Math.min(W - 110, e.x)), GROUND - 70, e.text, '#FFFFFF', 30, 2.2);
        fx.shake = Math.max(fx.shake, 12);
        fx.flash = 0.45; fx.flashColor = '255,77,109';
        sfx.land();
        mood(fx, 'sad', 1.4);
        break;
      case 'slam':
        burst(fx, e.x, GROUND - 10, th.burst, 34, 340, 7);
        fx.shake = Math.max(fx.shake, 18);
        fx.flash = 0.5; fx.flashColor = '255,77,109';
        banner(fx, 'Ouch!', 'Push it back with right answers', '#FF7A93', 1.4);
        sfx.land();
        mood(fx, 'sad', 1.4);
        break;
      case 'wrong':
        fx.wrongT = 0.4;
        fx.shake = Math.max(fx.shake, 4);
        sfx.wrong();
        mood(fx, 'worried', 0.6);
        break;
      case 'ufo':
        banner(fx, 'UFO!', 'Zap it for a prize', '#FFD84D', 1.5);
        sfx.ufo();
        break;
      case 'power': {
        const p = powerById(e.id);
        banner(fx, p.icon + ' ' + p.name, p.desc, '#7CF3FF', 1.8);
        burst(fx, e.x, e.y, ['#FFD84D', '#7CF3FF', '#FF5FA2', '#FFFFFF'], 30, 300, 5);
        if (e.id === 'freeze') { sfx.freeze(); fx.flash = 0.35; fx.flashColor = '180,235,255'; }
        else sfx.power();
        if (e.id === 'bomb') { fx.shake = Math.max(fx.shake, 14); fx.flash = 0.5; fx.flashColor = '255,255,255'; sfx.boom(); }
        mood(fx, 'cheer', 1.2);
        break;
      }
      case 'shower':
        banner(fx, 'Shooting stars!', `The ${e.table} times table, in order`, '#FFD84D', 2);
        sfx.shower();
        break;
      case 'bossAsk':
        break;
      case 'bossHit':
        fx.shake = Math.max(fx.shake, 7);
        sfx.bossHit();
        break;
      case 'bossDown':
        for (let i = 0; i < 4; i++) setTimeout(() => { burst(fx, e.x + (Math.random() - 0.5) * 100, e.y + (Math.random() - 0.5) * 80, th.burst.concat(['#FFFFFF']), 30, 380, 7); sfx.boom(); }, i * 160);
        fx.shake = 20;
        break;
      case 'hurt':
        break;
      case 'won':
        mood(fx, 'cheer', 99);
        sfx.win();
        break;
      case 'lost':
        mood(fx, 'sad', 99);
        sfx.lose();
        break;
    }
  }
}

export function updateFx(fx, dt) {
  for (const p of fx.parts) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.98; }
  fx.parts = fx.parts.filter(p => p.age < p.life);
  for (const k of ['beams', 'pops', 'banners', 'rings']) {
    for (const o of fx[k]) o.age += dt;
    fx[k] = fx[k].filter(o => o.age < o.life);
  }
  fx.shake = Math.max(0, fx.shake - dt * 40);
  fx.flash = Math.max(0, fx.flash - dt * 1.5);
  fx.wrongT = Math.max(0, fx.wrongT - dt);
  const d = fx.dino;
  d.t += dt;
  d.moodAge += dt;
  if (d.throwAge != null) { d.throwAge += dt; if (d.throwAge > 0.4) d.throwAge = null; }
  d.moodLeft -= dt;
  if (d.moodLeft <= 0 && d.mood !== 'idle') { d.mood = 'idle'; d.moodAge = 0; }
  d.blinkT -= dt;
  if (d.blinkT <= 0) { d.blink = !d.blink; d.blinkT = d.blink ? 0.12 : 2 + Math.random() * 3; }
}
