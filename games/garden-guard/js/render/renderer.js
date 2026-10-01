// Draws a game state onto the board canvas. The static map is painted once per
// level/size (background.js); each frame draws what moves. World coordinates
// are tiles.
//
// The simulation only knows where things are. Everything that makes it feel
// alive — towers rising out of the ground, recoil, squash on hit, bugs
// flipping over, coins flying to the purse — lives here, keyed by uid and
// driven by the events the simulation emits.

import { COLS, ROWS, START_LIVES, WAVE_GAP } from '../config.js';
import { ENEMIES, TOWERS } from '../data/registry.js';
import { readGrid, pointAt } from '../core/path.js';
import { towerStats } from '../core/towers.js';
import { TAU, INK, FLOWER_COLORS, roundRect, ink, ellipse, circle, softShadow, toon } from './kit.js';
import { ease, progress, turnTowards, clamp01 } from './anim.js';
import { paintMap } from './background.js';
import { createAmbient } from './ambient.js';
import { TOWER_SPRITES, PROJECTILE_SPRITES } from './sprites/tower-sprites.js';
import { ENEMY_SPRITES } from './sprites/enemy-sprites.js';
import { createParticles } from './particles.js';

const FONT = "'Baloo 2', system-ui, sans-serif";
const GROUND = 0.16;    // bugs walk on the lower half of the road, so they read as standing on it
const BUILD_TIME = 0.55;
const UPGRADE_TIME = 0.6;
const DEATH_TIME = 0.7;
const COIN_TIME = 0.75;

export function createRenderer(canvas, wrap, { reducedMotion, goldTarget }) {
  const g = canvas.getContext('2d');
  const bg = document.createElement('canvas');
  const fx = createParticles(reducedMotion);
  const ambient = createAmbient(reducedMotion);
  let tile = 40, dpr = 1;
  let state = null, bgFor = '', ends = [], flags = [];
  let now = 0;   // seconds, real time

  const towerFx = new Map();   // uid -> { aim, shotAt, builtAt, upgAt }
  const bugFx = new Map();     // uid -> { face, bornAt, hitAt }
  let corpses = [], coins = [], ghosts = [];
  let banner = null, leakAt = -9, shake = 0, hitstop = 0;

  function layout() {
    const cs = getComputedStyle(wrap);
    const inner = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const cw = Math.max(260, inner);
    tile = cw / COLS;
    dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.style.height = Math.round(tile * ROWS) + 'px';
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(tile * ROWS * dpr);
    bgFor = '';
  }

  function paintBackground() {
    bg.width = canvas.width;
    bg.height = canvas.height;
    const b = bg.getContext('2d');
    b.setTransform(dpr * tile, 0, 0, dpr * tile, 0, 0);
    paintMap(b, state);
    bgFor = state.level.id + '@' + canvas.width;
  }

  /* ---------- per-object visual state ---------- */
  function tfx(t) {
    let v = towerFx.get(t.uid);
    if (!v) { v = { aim: t.aim, shotAt: -9, builtAt: -9, upgAt: -9 }; towerFx.set(t.uid, v); }
    return v;
  }
  function bfx(e) {
    let v = bugFx.get(e.uid);
    if (!v) {
      v = { face: Math.cos(e.dir) < 0 ? -1 : 1, bornAt: e.d < 0.5 ? now : -9, hitAt: -9 };
      bugFx.set(e.uid, v);
    }
    return v;
  }

  /* ---------- the flowers the bugs are after ---------- */
  function drawGarden() {
    const spots = [[0.28, 0.34], [0.72, 0.3], [0.5, 0.5], [0.27, 0.6], [0.73, 0.58]];
    const show = Math.ceil(state.lives / START_LIVES * spots.length);
    for (const cell of ends) {
      spots.forEach(([sx, sy], i) => {
        const x = cell.c + sx, y = cell.r + sy;
        if (i >= show) {   // a nibbled stalk
          g.strokeStyle = '#7A8B3A'; g.lineWidth = 0.035; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y + 0.1); g.lineTo(x + 0.03, y + 0.02); g.stroke();
          return;
        }
        const sway = reducedMotion ? 0 : Math.sin(now * 1.6 + i * 1.3) * 0.025;
        g.strokeStyle = '#3E8A2E'; g.lineWidth = 0.04; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y + 0.12); g.quadraticCurveTo(x, y + 0.02, x + sway, y - 0.08); g.stroke();
        g.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * TAU + i;
          const px = x + sway + Math.cos(a) * 0.08, py = y - 0.08 + Math.sin(a) * 0.08;
          g.moveTo(px + 0.065, py);
          g.arc(px, py, 0.065, 0, TAU);
        }
        ink(g, FLOWER_COLORS[i], 0.024);
        circle(g, x + sway, y - 0.08, 0.05);
        ink(g, i === 1 ? '#FF7EB0' : '#FFD35C', 0.02);
      });
    }
  }

  /* ---------- selection, range, plot signs ---------- */
  function drawRange(x, y, r) {
    g.fillStyle = 'rgba(255,255,255,.14)';
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = 0.035;
    g.setLineDash([0.14, 0.09]);
    circle(g, x, y, r); g.fill(); g.stroke();
    g.setLineDash([]);
  }

  function drawSelection(view) {
    const pulse = reducedMotion ? 0.5 : 0.5 + Math.sin(now * 5.5) * 0.5;
    if (view.selTower) {
      const t = state.towers.find(x => x.uid === view.selTower);
      if (t) drawRange(t.x, t.y, towerStats(t).range);
    }
    if (view.selPad !== null && view.selPad !== undefined) {
      const pad = state.pads[view.selPad];
      if (view.preview) drawRange(pad.c + 0.5, pad.r + 0.5, TOWERS[view.preview].levels[0].range);
      g.strokeStyle = `rgba(255,224,120,${0.7 + pulse * 0.3})`;
      g.lineWidth = 0.07;
      ellipse(g, pad.c + 0.5, pad.r + 0.5, 0.45 + pulse * 0.03, 0.29 + pulse * 0.02);
      g.stroke();
    }
    if (view.cursor) {
      g.strokeStyle = 'rgba(255,255,255,.85)';
      g.lineWidth = 0.045;
      roundRect(g, view.cursor.c + 0.06, view.cursor.r + 0.06, 0.88, 0.88, 0.16);
      g.stroke();
    }
  }

  // a little wooden sign on every empty plot: "build here"
  function drawSign(pad, lit) {
    const x = pad.c + 0.74, y = pad.r + 0.36;
    const bob = lit && !reducedMotion ? Math.sin(now * 8) * 0.02 : 0;
    g.strokeStyle = INK; g.lineWidth = 0.05; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y + 0.05); g.lineTo(x, y - 0.22); g.stroke();
    g.strokeStyle = '#8E5B35'; g.lineWidth = 0.025; g.stroke();
    toon(g, () => roundRect(g, x - 0.12, y - 0.36 + bob, 0.24, 0.17, 0.04), lit ? '#F3C76A' : '#D9A766', lit ? '#C79A3E' : '#A87A40',
      { off: 0.02, line: 0.03 });
    // a sprout painted on the board
    g.strokeStyle = '#3E7A26'; g.lineWidth = 0.022;
    g.beginPath(); g.moveTo(x, y - 0.22 + bob); g.lineTo(x, y - 0.3 + bob); g.stroke();
    g.fillStyle = '#5E9E33';
    ellipse(g, x - 0.035, y - 0.3 + bob, 0.035, 0.018, -0.5); g.fill();
    ellipse(g, x + 0.035, y - 0.31 + bob, 0.035, 0.018, 0.5); g.fill();
  }

  /* ---------- characters ---------- */
  function drawTower(t) {
    const v = tfx(t);
    const draw = TOWER_SPRITES[t.type];
    if (!draw) return;
    draw(g, t.x, t.y, v.aim, {
      level: t.level, now, seed: t.uid,
      shotT: now - v.shotAt,
      build: clamp01((now - v.builtAt) / BUILD_TIME),
      upg: clamp01((now - v.upgAt) / UPGRADE_TIME)
    });
    const up = now - v.upgAt;
    if (up < 0.35) {   // a flash of light on upgrade
      g.fillStyle = `rgba(255,250,210,${(1 - up / 0.35) * 0.55})`;
      ellipse(g, t.x, t.y - 0.1, 0.5, 0.6); g.fill();
    }
  }

  function drawGhost(gh) {
    const p = progress(now, gh.at, 0.3);
    const draw = TOWER_SPRITES[gh.type];
    if (!draw || p >= 1) return;
    g.save();
    g.translate(gh.x, gh.y + 0.22);
    g.scale(1 + p * 0.3, 1 - ease.inQuad(p));
    g.translate(-gh.x, -(gh.y + 0.22));
    g.globalAlpha = 1 - p;
    draw(g, gh.x, gh.y, gh.aim, { level: gh.level, now, seed: gh.uid });
    g.restore();
  }

  function drawEnemy(e) {
    const def = ENEMIES[e.type], s = def.size, v = bfx(e);
    const c = Math.cos(e.dir);
    if (Math.abs(c) > 0.3) v.face = c < 0 ? -1 : 1;
    const born = progress(now, v.bornAt, 0.35);
    const gy = e.y + GROUND - (e.flying ? 0.35 : 0);
    softShadow(g, e.x, e.y + GROUND + 0.02, s * 1.2 * born, s * 0.34 * born, e.flying ? 0.18 : 0.3);
    const walk = reducedMotion ? 0 : e.d * 9 + e.uid;
    const draw = ENEMY_SPRITES[e.type];
    const hitP = progress(now, v.hitAt, 0.18);
    g.save();
    if (born < 1) {   // climbing out of the anthill
      const k = ease.outBack(born);
      g.translate(e.x, gy); g.scale(k, k); g.translate(-e.x, -gy);
    }
    if (draw) draw(g, e.x, gy, v.face, s, walk, { now, seed: e.uid, squash: hitP < 1 ? 1 - hitP : 0 });
    g.restore();
    if (e.hp < e.maxHp) {
      const w = Math.max(0.42, s * 2.2), x = e.x - w / 2, y = gy - s * 2.45;
      roundRect(g, x - 0.025, y - 0.025, w + 0.05, 0.11, 0.05);
      g.fillStyle = INK; g.fill();
      const k = Math.max(0, e.hp / e.maxHp);
      roundRect(g, x, y, Math.max(0.06, w * k), 0.06, 0.03);
      g.fillStyle = k > 0.5 ? '#86D64F' : k > 0.25 ? '#FFD35C' : '#FF6B6B';
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.fillRect(x + 0.02, y + 0.008, Math.max(0, w * k - 0.04), 0.015);
    }
  }

  // knocked over: flips, hops up, spins and fades
  function drawCorpse(cp) {
    const p = progress(now, cp.at, DEATH_TIME);
    const draw = ENEMY_SPRITES[cp.type];
    if (!draw) return;
    const hop = Math.sin(Math.min(1, p * 1.4) * Math.PI) * 0.45;
    const x = cp.x + cp.vx * p, y = cp.y - hop;
    g.save();
    g.globalAlpha = p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35;
    g.translate(x, y - cp.s);
    g.rotate(cp.face * ease.outCubic(p) * Math.PI);
    g.scale(1 - p * 0.3, 1 - p * 0.3);
    g.translate(-x, -(y - cp.s));
    draw(g, x, y, cp.face, cp.s, 0, { now, seed: cp.uid });
    g.restore();
  }

  function drawActors() {
    // everything that stands on the ground is sorted by where it stands, so
    // whoever is lower on screen overlaps whoever is higher
    const items = [];
    state.pads.forEach((pad, i) => {
      if (!state.towers.some(t => t.pad === i)) items.push({ y: pad.r + 0.36, sign: pad, lit: false });
    });
    for (const t of state.towers) items.push({ y: t.y + 0.22, t });
    for (const gh of ghosts) items.push({ y: gh.y + 0.22, gh });
    for (const e of state.enemies) if (!e.flying) items.push({ y: e.y + GROUND, e });
    for (const cp of corpses) items.push({ y: cp.y, cp });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.t) drawTower(it.t);
      else if (it.e) drawEnemy(it.e);
      else if (it.cp) drawCorpse(it.cp);
      else if (it.gh) drawGhost(it.gh);
      else drawSign(it.sign, it.lit);
    }
    for (const e of state.enemies) if (e.flying) drawEnemy(e);
  }

  function drawProjectiles() {
    for (const p of state.projectiles) {
      const draw = PROJECTILE_SPRITES[p.look];
      if (draw) draw(g, p);
    }
  }

  /* ---------- wave flag at each entrance ---------- */
  function computeFlags() {
    flags = state.paths.map(p => {
      const pt = pointAt(p, Math.min(p.len, 1.55));
      return { x: pt.x, y: pt.y - 0.62 };
    });
  }

  function flagVisible() {
    return !state.result && state.waveIdx < state.waves.length && (state.waveIdx === 0 || state.nextWaveIn !== null);
  }

  function drawFlags() {
    if (!flagVisible()) return;
    const k = state.waveIdx === 0 ? 1 : 1 - state.nextWaveIn / WAVE_GAP;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(now * 6) * 0.06;
    for (const f of flags) {
      const bob = reducedMotion ? 0 : Math.sin(now * 3) * 0.04;
      const x = f.x, y = f.y + bob;
      g.save();
      g.translate(x, y); g.scale(pulse, pulse); g.translate(-x, -y);
      // pointer down to the road
      toon(g, () => { g.beginPath(); g.moveTo(x - 0.1, y + 0.22); g.lineTo(x + 0.1, y + 0.22); g.lineTo(x, y + 0.38); g.closePath(); },
        '#F3C76A', '#C79A3E', { off: 0.02, line: 0.035 });
      toon(g, () => circle(g, x, y, 0.29), '#F3C76A', '#C79A3E', { off: 0.04 });
      circle(g, x, y, 0.21);
      g.fillStyle = '#5A2E2A'; g.fill();
      // countdown ring
      g.strokeStyle = '#FFE58A'; g.lineWidth = 0.05; g.lineCap = 'round';
      g.beginPath(); g.arc(x, y, 0.25, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
      // a bug face in the middle
      ENEMY_SPRITES.ant(g, x - 0.03, y + 0.12, 1, 0.13, 0, { now, seed: 3 });
      g.restore();
    }
  }

  /* ---------- screen-space overlays ---------- */
  function drawCoins() {
    const target = goldTarget ? goldTarget() : null;
    for (const c of coins) {
      const p = ease.inOutQuad(progress(now, c.at, COIN_TIME));
      const tx = target ? target.x / tile : COLS - 1, ty = target ? target.y / tile : -0.5;
      const cx = (c.x + tx) / 2, cy = Math.min(c.y, ty) - 1.4;
      const x = (1 - p) * (1 - p) * c.x + 2 * (1 - p) * p * cx + p * p * tx;
      const y = (1 - p) * (1 - p) * c.y + 2 * (1 - p) * p * cy + p * p * ty;
      const r = 0.11 * (1 - p * 0.35);
      const spin = Math.abs(Math.cos(now * 9 + c.at * 13));
      ellipse(g, x, y, r * (0.35 + spin * 0.65), r);
      ink(g, '#FFD35C', 0.03);
      ellipse(g, x, y, r * (0.35 + spin * 0.65) * 0.55, r * 0.55);
      g.fillStyle = '#F2A93B'; g.fill();
    }
  }

  function drawBanner() {
    if (!banner) return;
    const t = now - banner.at;
    if (t > 1.9) { banner = null; return; }
    const inP = ease.outBack(clamp01(t / 0.4)), outP = ease.inQuad(clamp01((t - 1.55) / 0.35));
    const cx = COLS / 2, y = -0.9 + 1.75 * inP - 1.8 * outP;
    const w = 4.2, h = 0.85;
    // ribbon tails
    for (const side of [-1, 1]) {
      toon(g, () => {
        g.beginPath();
        g.moveTo(cx + side * (w / 2 - 0.2), y + 0.12);
        g.lineTo(cx + side * (w / 2 + 0.45), y + 0.12);
        g.lineTo(cx + side * (w / 2 + 0.25), y + h / 2 + 0.12);
        g.lineTo(cx + side * (w / 2 + 0.45), y + h + 0.12);
        g.lineTo(cx + side * (w / 2 - 0.2), y + h + 0.12);
        g.closePath();
      }, '#C9496F', '#962E4F', { off: 0.03 });
    }
    toon(g, () => roundRect(g, cx - w / 2, y, w, h, 0.18), '#FF7EB0', '#D9568A',
      { off: 0.06, hl: [cx - 1.2, y + 0.14, 1.2, 0.06, 0], light: 'rgba(255,255,255,.35)' });
    g.save();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `800 ${tile * 0.5}px ${FONT}`;
    g.lineWidth = Math.max(3, tile * 0.09);
    g.strokeStyle = INK;
    g.lineJoin = 'round';
    g.strokeText(banner.text, cx * tile, (y + h / 2 + 0.03) * tile);
    g.fillStyle = '#FFFFFF';
    g.fillText(banner.text, cx * tile, (y + h / 2 + 0.03) * tile);
    g.restore();
  }

  function drawLeakFlash() {
    const p = progress(now, leakAt, 0.6);
    if (p >= 1) return;
    const v = g.createRadialGradient(COLS / 2, ROWS / 2, ROWS * 0.35, COLS / 2, ROWS / 2, COLS * 0.62);
    v.addColorStop(0, 'rgba(255,60,80,0)');
    v.addColorStop(1, `rgba(255,60,80,${(1 - p) * 0.5})`);
    g.fillStyle = v;
    g.fillRect(0, 0, COLS, ROWS);
  }

  /* ---------- public ---------- */
  return {
    layout,
    setState(s) {
      state = s;
      bgFor = '';
      ends = readGrid(s.level.grid).road.filter(c => c.ch === 'E');
      computeFlags();
      towerFx.clear(); bugFx.clear(); fx.clear();
      corpses = []; coins = []; ghosts = []; banner = null;
    },
    // pixel position on the canvas -> tile cell
    cellAt(px, py) {
      const c = Math.floor(px / tile), r = Math.floor(py / tile);
      return c >= 0 && c < COLS && r >= 0 && r < ROWS ? { c, r } : null;
    },
    // did this tap land on a wave flag?
    flagAt(px, py) {
      if (!state || !flagVisible()) return false;
      return flags.some(f => Math.hypot(px / tile - f.x, py / tile - f.y) < 0.45);
    },
    // seconds of freeze-frame still owed; the caller skips simulation while > 0
    takeHitstop(dt) {
      if (hitstop <= 0) return false;
      hitstop -= dt;
      return true;
    },
    // turn simulation events into effects
    handle(events) {
      for (const ev of events) {
        switch (ev.type) {
          case 'shoot': {
            const t = state.towers.find(x => x.uid === ev.from);
            if (t) tfx(t).shotAt = now;
            break;
          }
          case 'hit': {
            const e = ev.target && state.enemies.find(x => x.uid === ev.target);
            if (e) bfx(e).hitAt = now;
            fx.burst(ev.x, ev.y - 0.25, ['#B5EE8A', '#6CC447', '#FFFFFF'], 4, 1.1);
            break;
          }
          case 'kill': {
            const v = bugFx.get(ev.uid);
            const s = ENEMIES[ev.kind].size;
            corpses.push({ uid: ev.uid, type: ev.kind, x: ev.x, y: ev.y + GROUND, s, at: now,
              face: v ? v.face : 1, vx: (v ? -v.face : 1) * 0.35 });
            bugFx.delete(ev.uid);
            fx.puff(ev.x, ev.y + GROUND - 0.2);
            fx.burst(ev.x, ev.y - 0.1, ['#FFD35C', '#FF7EB0', '#FFFFFF'], 7, 1.7);
            coins.push({ x: ev.x, y: ev.y - 0.2, at: now });
            fx.text(ev.x, ev.y - 0.5, '+' + ev.bounty, '#FFD35C');
            if (ev.bounty >= 8 && !reducedMotion) hitstop = Math.max(hitstop, 0.05);
            break;
          }
          case 'leak':
            leakAt = now;
            if (!reducedMotion) { shake = 0.3; hitstop = Math.max(hitstop, 0.08); }
            for (const cell of ends) fx.burst(cell.c + 0.5, cell.r + 0.4, FLOWER_COLORS, 12, 1.8);
            break;
          case 'build':
            tfx({ uid: ev.uid, aim: -Math.PI / 2 }).builtAt = now;
            fx.puff(ev.x - 0.25, ev.y + 0.2);
            fx.puff(ev.x + 0.25, ev.y + 0.2);
            setTimeout(() => fx.burst(ev.x, ev.y - 0.2, ['#7FD45A', '#FFD35C', '#FFFFFF'], 12, 1.8), reducedMotion ? 0 : 280);
            break;
          case 'upgrade': {
            const t = state.towers.find(x => x.uid === ev.uid);
            if (t) tfx(t).upgAt = now;
            fx.ring(ev.x, ev.y - 0.1, 0.6, '#FFE58A');
            fx.burst(ev.x, ev.y - 0.2, ['#FFE58A', '#FFFFFF', '#7FD45A'], 16, 2.2);
            break;
          }
          case 'sell': {
            const v = towerFx.get(ev.uid);
            ghosts.push({ uid: ev.uid, type: ev.kind, level: ev.level || 0, x: ev.x, y: ev.y, aim: v ? v.aim : -1, at: now });
            towerFx.delete(ev.uid);
            fx.puff(ev.x, ev.y + 0.1);
            fx.text(ev.x, ev.y - 0.4, '+' + ev.value, '#FFD35C');
            break;
          }
          case 'wave':
            banner = { text: `Wave ${ev.wave}`, at: now };
            break;
        }
      }
    },
    update(dt, nowMs) {
      now = nowMs / 1000;
      if (state) {
        for (const t of state.towers) { const v = tfx(t); v.aim = turnTowards(v.aim, t.aim, dt * 10); }
      }
      corpses = corpses.filter(c => now - c.at < DEATH_TIME);
      coins = coins.filter(c => now - c.at < COIN_TIME);
      ghosts = ghosts.filter(gh => now - gh.at < 0.3);
      shake = Math.max(0, shake - dt);
      fx.update(dt);
      ambient.update(dt);
    },
    draw(view) {
      if (!state) return;
      if (bgFor !== state.level.id + '@' + canvas.width) paintBackground();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      const sx = shake ? (Math.random() - 0.5) * shake * 0.3 * tile * dpr : 0;
      const sy = shake ? (Math.random() - 0.5) * shake * 0.3 * tile * dpr : 0;
      g.drawImage(bg, sx, sy);
      g.setTransform(dpr * tile, 0, 0, dpr * tile, sx, sy);
      drawGarden();
      drawSelection(view);
      drawActors();
      drawProjectiles();
      fx.drawBits(g);
      ambient.drawShadows(g);
      ambient.drawFlies(g);
      drawFlags();
      drawLeakFlash();
      drawCoins();
      drawBanner();
      g.setTransform(dpr, 0, 0, dpr, sx, sy);
      fx.drawTexts(g, tile, FONT);
    }
  };
}
