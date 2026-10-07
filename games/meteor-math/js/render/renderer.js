// Draws one frame: the world, meteors, the UFO, a boss, the hero, the beams and
// bursts, the score bar along the top and the answer being typed.

import { W, H, GROUND, TOP, SHIELDS, POWER_TIME, DINO, comboMult } from '../config.js';
import { drawBackground } from './themes.js';
import { drawMeteor, drawUfo, drawBoss } from './things.js';
import { drawHero } from './hero.js';
import { heroById } from '../data/heroes.js';
import { hintTarget } from '../core/game.js';
import { powerById } from '../data/powerups.js';
import { comboTier, comboColor } from './fx.js';

const TAU = Math.PI * 2;
const FONT = '"Baloo 2", "Quicksand", system-ui, sans-serif';

const fits = (typed, answer) => typed && String(answer).startsWith(typed);
// overshoots a little and settles: for things that pop in
const backOut = t => { const c = 2.6; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

function starPath(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

// a glow behind the hero during a streak, bigger and brighter as it grows
function comboAura(ctx, fx, t) {
  const tier = comboTier(fx.combo);
  if (tier < 2) return;
  const x = DINO.x, y = DINO.y - 48;
  const r = 52 + tier * 14 + Math.sin(t * 7) * 5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, comboColor(fx.combo, t, 0));
  g.addColorStop(0.55, comboColor(fx.combo, t, 0.12 + tier * 0.06));
  g.addColorStop(1, comboColor(fx.combo, t, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  // spinning rays once it's really going
  if (tier >= 3) {
    ctx.translate(x, y); ctx.rotate(t * 1.5);
    ctx.fillStyle = comboColor(fx.combo, t + 0.3, 0.1 + (tier - 3) * 0.04);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(TAU / 8);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -r * 1.25); ctx.lineTo(9, -r * 1.25); ctx.fill();
    }
  }
  ctx.restore();
}

// the edges of the screen glow during a huge streak
function comboEdges(ctx, fx, t) {
  const tier = comboTier(fx.combo);
  if (tier < 4) return;
  const a = (tier === 4 ? 0.16 : 0.24) + Math.sin(t * 6) * 0.06;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, comboColor(fx.combo, t, 0));
  g.addColorStop(1, comboColor(fx.combo, t, a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawOrb(ctx, t, power, rgb) {
  const r = 9 + Math.sin(t * 6) * 1.2 + power * 4;
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 2.2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, `rgba(${rgb},.95)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill();
}

function shieldIcon(ctx, x, y, on) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -11); ctx.quadraticCurveTo(9, -9, 11, -8); ctx.quadraticCurveTo(11, 6, 0, 12);
  ctx.quadraticCurveTo(-11, 6, -11, -8); ctx.quadraticCurveTo(-9, -9, 0, -11); ctx.closePath();
  ctx.fillStyle = on ? '#5FD3FF' : 'rgba(255,255,255,.18)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = on ? '#E8FAFF' : 'rgba(255,255,255,.35)'; ctx.stroke();
  if (on) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-4, -3, 3, 5, 0.3, 0, TAU); ctx.fill(); }
  ctx.restore();
}

function hud(ctx, s, view) {
  ctx.fillStyle = 'rgba(10,8,30,.45)';
  ctx.fillRect(0, 0, W, TOP - 8);
  for (let i = 0; i < SHIELDS; i++) shieldIcon(ctx, 22 + i * 28, 24, s.spec.gentle || i < s.shields);

  ctx.textBaseline = 'middle';
  // middle: progress, boss health or time
  const mid = W / 2;
  if (s.spec.endless) {
    const sec = Math.floor(s.t), txt = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    ctx.font = `800 20px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText('⏱ ' + txt, mid, 18);
    ctx.font = `700 12px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText('best ' + view.best, mid, 37);
  } else {
    const boss = s.boss;
    const done = boss ? boss.max - boss.hp : s.cleared, goal = boss ? boss.max : s.spec.goal;
    const bw = 170, bx = mid - bw / 2;
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.beginPath(); ctx.roundRect(bx, 12, bw, 12, 6); ctx.fill();
    ctx.fillStyle = boss ? '#FF4D6D' : '#FFD84D';
    ctx.beginPath(); ctx.roundRect(bx, 12, Math.max(12, (bw * Math.min(done, goal)) / goal), 12, 6); ctx.fill();
    ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText(boss ? `${s.spec.name} · ${boss.hp} left` : `${s.spec.name} · ${Math.min(done, goal)} / ${goal}`, mid, 37);
  }

  // right: score and combo
  ctx.textAlign = 'right';
  ctx.font = `800 24px ${FONT}`; ctx.fillStyle = '#fff';
  ctx.fillText(s.score, W - 14, 20);
  if (s.combo >= 2) {
    const m = comboMult(s.combo), tier = comboTier(s.combo);
    // grows with the streak and bumps on every hit
    const k = 1 + view.fx.comboPulse * (0.25 + tier * 0.08);
    ctx.save();
    ctx.translate(W - 14, 40);
    ctx.scale(k, k);
    ctx.font = `800 ${13 + tier * 1.4}px ${FONT}`;
    const txt = (tier >= 3 ? '🔥 ' : '') + (m > 1 ? `×${m} · ` : '') + `${s.combo} combo`;
    if (tier >= 2) { ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,40,.7)'; ctx.strokeText(txt, 0, 0); }
    ctx.fillStyle = tier ? comboColor(s.combo, view.t) : m > 1 ? '#FFD84D' : 'rgba(255,255,255,.75)';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  // power-up timers under the shields
  let px = 16;
  for (const id of ['freeze', 'slow', 'double']) {
    const left = s.fx[id];
    if (!(left > 0)) continue;
    const p = powerById(id);
    ctx.save();
    ctx.translate(px + 14, TOP + 18);
    ctx.fillStyle = 'rgba(10,8,30,.5)'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7CF3FF'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + TAU * (left / POWER_TIME[id])); ctx.stroke();
    ctx.font = `16px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.icon, 0, 1);
    ctx.restore();
    px += 36;
  }
}

// the answer being typed, in a bubble next to the hero
function typedBubble(ctx, s, view) {
  const x = W / 2 + 104, y = GROUND + 40;
  const fx = view.fx;
  const shake = fx.wrongT > 0 ? Math.sin(fx.wrongT * 60) * 6 : 0;
  ctx.save();
  ctx.translate(x + shake, y);
  ctx.beginPath(); ctx.roundRect(-52, -24, 104, 48, 16);
  ctx.fillStyle = fx.wrongT > 0 ? '#FFD6DE' : 'rgba(255,255,255,.95)';
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.fill(); ctx.shadowColor = 'transparent';
  // the tail pointing at the hero
  ctx.beginPath(); ctx.moveTo(-52, 2); ctx.lineTo(-64, 12); ctx.lineTo(-52, 12); ctx.fill();
  ctx.font = `800 32px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2B2340';
  const caret = Math.floor(view.t * 2) % 2 ? '_' : ' ';
  ctx.fillText(s.typed ? s.typed : caret, 0, 3);
  if (s.pending > 0) {
    ctx.strokeStyle = '#FFB800'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(40, -12, 6, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - s.pending / 0.7)); ctx.stroke();
  }
  ctx.restore();
}

// Weak Spots: dots for the question that's been waiting a while (7 × 8 → 7 rows of 8)
function hintDots(ctx, s) {
  const m = hintTarget(s, 4);
  if (!m) return;
  const [a, b] = m.prob.key.split('x').map(Number);
  const rows = Math.min(a, b), cols = Math.max(a, b);
  const gap = 9.5, x0 = 22;
  const y0 = GROUND - 24 - rows * gap;
  ctx.fillStyle = 'rgba(10,8,30,.45)';
  ctx.beginPath(); ctx.roundRect(x0 - 10, y0 - 28, cols * gap + 12, rows * gap + 32, 10); ctx.fill();
  ctx.font = `800 14px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`${rows} rows of ${cols}`, x0 - 2, y0 - 14);
  ctx.fillStyle = '#FFD84D';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    ctx.beginPath(); ctx.arc(x0 + c * gap + 3, y0 + 4 + r * gap, 3.3, 0, TAU); ctx.fill();
  }
  // and a line from the dots to the meteor they're for
  ctx.strokeStyle = 'rgba(255,216,77,.6)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0 + cols * gap / 2, y0 - 28); ctx.lineTo(m.x, m.y + m.r); ctx.stroke();
  ctx.setLineDash([]);
}

export function render(ctx, s, view) {
  const fx = view.fx;
  const world = view.world;
  ctx.save();
  if (fx.shake > 0) ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
  drawBackground(ctx, world, view.scale, view.t);

  const typed = s ? s.typed : '';
  const frozen = s && s.fx.freeze > 0;

  // the shield over the planet, fading as shields break
  if (s && !s.spec.gentle) {
    const k = s.shields / SHIELDS;
    ctx.strokeStyle = `rgba(95,211,255,${0.15 + 0.35 * k})`;
    ctx.lineWidth = 2 + 4 * k;
    ctx.beginPath(); ctx.moveTo(0, GROUND - 4); ctx.quadraticCurveTo(W / 2, GROUND - 30, W, GROUND - 4); ctx.stroke();
  }

  if (s) {
    if (s.boss && s.boss.y > -60) drawBoss(ctx, s.boss, view.t, s.boss.prob && fits(typed, s.boss.prob.answer));
    for (const m of s.meteors) drawMeteor(ctx, m, world, view.t, fits(typed, m.prob.answer), frozen);
    if (s.ufo) drawUfo(ctx, s.ufo, view.t, fits(typed, s.ufo.prob.answer));
  }

  // beams, from wherever the hero holds the blaster
  const beam = heroById(view.hero).beam.join(',');
  for (const b of fx.beams) {
    const x0 = fx.hold.x, y0 = fx.hold.y;
    const k = 1 - b.age / b.life;
    const tier = comboTier(b.combo || 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // a wider beam in a streak, with a colour halo; rainbow from 10 in a row
    if (tier >= 2) {
      ctx.strokeStyle = tier >= 3 ? `hsla(${(view.t * 500 + b.combo * 29) % 360 | 0},100%,60%,${k * 0.6})` : comboColor(b.combo, view.t, k * 0.5);
      ctx.lineWidth = (14 + tier * 7) * k;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    }
    ctx.strokeStyle = b.gold ? `rgba(255,210,80,${k})` : `rgba(${beam},${k})`;
    ctx.lineWidth = (14 + tier * 2) * k;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = (5 + tier) * k;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    ctx.restore();
  }
  for (const r of fx.rings) {
    if (r.age < 0) continue;
    const k = r.age / r.life;
    ctx.strokeStyle = r.hue != null ? `hsla(${r.hue},100%,65%,${1 - k})` : `rgba(255,255,255,${1 - k})`;
    ctx.lineWidth = (r.w || 4) * (1 - k);
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + k), 0, TAU); ctx.stroke();
  }
  for (const p of fx.parts) {
    ctx.globalAlpha = 1 - p.age / p.life;
    ctx.fillStyle = p.color;
    if (p.star) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.age * p.spin);
      starPath(ctx, p.size * 1.7); ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // the hero looks at the most dangerous meteor
  const d = fx.dino;
  let target = null;
  if (s) for (const m of s.meteors) if (!target || m.y > target.y) target = m;
  const h = fx.hold;
  if (target) {
    const dx = target.x - h.x, dy = target.y - h.y, len = Math.hypot(dx, dy) || 1;
    d.lookX += (dx / len - d.lookX) * 0.15; d.lookY += (dy / len - d.lookY) * 0.15;
  } else { d.lookX *= 0.9; d.lookY *= 0.9; }
  d.faceX = target ? target.x - DINO.x : 0;
  if (s && s.phase === 'play' && d.mood === 'idle' && target && target.y > GROUND - 150 && target.kind !== 'shower') { d.mood = 'worried'; d.moodLeft = 0.3; }
  fx.combo = s ? s.combo : 0;
  comboAura(ctx, fx, view.t);
  fx.hold = drawHero(ctx, view.hero, view.scale, d, c => drawOrb(c, view.t, d.throwAge != null ? 1 - d.throwAge / 0.4 : 0, beam));

  if (s) {
    if (s.spec.gentle && view.hints) hintDots(ctx, s);
    if (s.phase === 'play') typedBubble(ctx, s, view);
  }

  // floating text
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of fx.pops) {
    const k = p.age / p.life;
    ctx.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
    ctx.font = `800 ${p.size}px ${FONT}`;
    const y = p.y - Math.min(1, k * 3) * 22;
    ctx.save();
    ctx.translate(Math.max(80, Math.min(W - 80, p.x)), y);
    if (p.bounce) {
      // combo labels spring in and wiggle, more for longer streaks
      const sc = 0.4 + 0.6 * backOut(Math.min(1, p.age * 5));
      ctx.scale(sc, sc);
      ctx.rotate(Math.sin(p.age * 18) * 0.04 * comboTier(p.combo) * (1 - k));
    }
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,10,40,.7)';
    ctx.strokeText(p.text, 0, 0);
    ctx.fillStyle = p.combo ? comboColor(p.combo, view.t) : p.color;
    ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // freeze tint, streak glow and hit flash
  if (frozen) { ctx.fillStyle = 'rgba(180,235,255,.12)'; ctx.fillRect(0, 0, W, H); }
  comboEdges(ctx, fx, view.t);
  if (fx.flash > 0) { ctx.fillStyle = `rgba(${fx.flashColor},${fx.flash * 0.5})`; ctx.fillRect(0, 0, W, H); }

  if (s) hud(ctx, s, view);

  // banners
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let by = H * 0.36;
  for (const b of fx.banners) {
    const k = b.age / b.life;
    const pop = Math.min(1, b.age * 6);
    const fancy = b.fancy || 0;
    ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.save();
    ctx.translate(W / 2, by);
    if (fancy) {
      // combo milestones: a sunburst behind, a springy entrance and a wiggle
      const sc = (0.2 + 0.8 * backOut(Math.min(1, b.age * 3.5))) * (1 + fancy * 0.05);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.rotate(b.age * (0.8 + fancy * 0.3));
      const rays = 10 + fancy * 2, len = (110 + fancy * 24) * sc;
      for (let i = 0; i < rays; i++) {
        ctx.fillStyle = fancy >= 3 ? `hsla(${(i * 360) / rays + b.age * 200 | 0},100%,65%,.22)` : 'rgba(255,220,100,.2)';
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.arc(0, 0, len, (i * TAU) / rays, ((i + 0.5) * TAU) / rays);
        ctx.fill();
      }
      ctx.restore();
      ctx.scale(sc, sc);
      ctx.rotate(Math.sin(b.age * 12) * 0.05 * (1 - k));
    } else ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
    ctx.font = `800 ${40 + fancy * 3}px ${FONT}`;
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(20,10,40,.75)';
    ctx.strokeText(b.text, 0, 0);
    if (fancy >= 3) {
      // rainbow letters that slide along
      const w = ctx.measureText(b.text).width / 2, g = ctx.createLinearGradient(-w, 0, w, 0);
      for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(i * 60 + view.t * 300) % 360 | 0},100%,64%)`);
      ctx.fillStyle = g;
    } else ctx.fillStyle = b.color;
    ctx.fillText(b.text, 0, 0);
    if (b.sub) {
      ctx.font = `700 17px ${FONT}`; ctx.lineWidth = 5;
      ctx.strokeText(b.sub, 0, 34); ctx.fillStyle = '#fff'; ctx.fillText(b.sub, 0, 34);
    }
    ctx.restore();
    by += 78;
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
