// Entry point: owns the game and the frame loop, reads the pointer and keys,
// and plays each shot's events as a little timeline of motion and sound.

import { SHOOTER, MIN_ANGLE, MAX_ANGLE } from './config.js';
import { newLevel, newEndless, shoot, swap, aim, serialize, deserialize } from './core/game.js';
import { clampAngle } from './core/shot.js';
import { LEVEL_COUNT } from './data/levels.js';
import { createRenderer, THEME_ART } from './render/renderer.js';
import { onDragon, holdPoint } from './render/dragon.js';
import { createOverlay } from './ui/overlay.js';
import { createHud } from './ui/hud.js';
import { menuScreen, levelsScreen, helpScreen, winScreen, loseScreen, endlessOverScreen } from './ui/screens.js';
import { sfx, setSound } from './audio.js';
import { load, persist } from './save.js';

const $ = id => document.getElementById(id);
const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const seed = () => (Math.random() * 2147483647) | 0;

const save = load();
setSound(save.sound);

const canvas = $('board');
const renderer = createRenderer(canvas, sfx, { lite: REDUCED_MOTION });
const overlay = createOverlay($('overlay'));
const hud = createHud($('hud'));

let state = deserialize(save.game);
const resumed = !!state;
if (!state) state = newLevel(Math.min(save.unlocked, LEVEL_COUNT), seed());

let angle = Math.PI / 2;
let trace = null, traceFor = '';
let version = 0;          // bumps whenever the board changes, so the aim guide is worked out again
let busy = false;         // a shot is playing out
let aiming = false;       // a finger or mouse button is down on the board
const keys = { left: false, right: false };

/* ---------- the page takes on the world's colours ---------- */
function applyTheme() {
  const art = THEME_ART[state.theme], root = document.documentElement;
  root.style.setProperty('--top', art.page[0]);
  root.style.setProperty('--bottom', art.page[1]);
  root.dataset.theme = state.theme;
  root.classList.toggle('dark', !!art.dark);
}

function store() {
  save.game = state.over ? null : serialize(state);
  persist(save);
}

function start(st, { quiet } = {}) {
  state = st;
  busy = false;
  version++;
  applyTheme();
  renderer.reset(state, quiet ? { intro: true } : {
    intro: true,
    banner: state.mode === 'level' ? 'Level ' + state.level : 'Endless',
    sub: state.mode === 'level' ? THEME_ART[state.theme].name : 'Wave ' + state.wave
  });
  hud.show(state, save.endlessBest);
  hud.score(state.score);
  overlay.hide();
  store();
}

/* ---------- shooting ---------- */
function fire() {
  if (busy || state.over || overlay.isOpen()) return;
  busy = true;
  const ball = state.cur;
  const ev = shoot(state, angle);
  hud.show(state, save.endlessBest);
  renderer.launch(ev[0], () => resolve(ev, ball));
}

function centroid(list) {
  let x = 0, y = 0;
  for (const b of list) { x += b.x; y += b.y; }
  return { x: x / list.length, y: y / list.length };
}

function celebrate(e) {
  const n = e.cleared;
  if (n >= 20) {
    renderer.banner('Bubble-tastic!', { rays: true, a: '#FFFFFF', b: '#FF7EB0', size: 42 });
    renderer.shake(9); renderer.confetti(70); renderer.cheer(1.8); sfx.cheer();
  } else if (n >= 12) {
    renderer.banner('Awesome!', { rays: true, a: '#FFFFFF', b: '#A97BFF', size: 46 });
    renderer.shake(6); renderer.cheer(1.4); sfx.cheer();
  } else if (n >= 7) {
    renderer.banner('Great!', { a: '#FFFFFF', b: '#4AA8FF', size: 44 });
    renderer.shake(3); renderer.cheer(1);
  } else if (n >= 5) {
    renderer.banner('Nice!', { a: '#FFFFFF', b: '#4FD18B', size: 38, life: 0.9 });
    renderer.wow();
  }
  if (e.streak >= 2) {
    renderer.text(SHOOTER.x, SHOOTER.y - 66, 'Combo ×' + e.streak, '#FFE07A', 18 + Math.min(e.streak, 6) * 2, 1.1);
    sfx.combo(e.streak);
  }
}

// play one shot's events; times are seconds after the bubble arrives
function resolve(ev, ball) {
  let popEnd = 0.05, extra = 0.1;
  for (const e of ev) {
    switch (e.t) {
      case 'land': renderer.land(e, ball); break;
      case 'bomb': renderer.bomb(e); break;
      case 'zap': renderer.zap(e); break;
      case 'rainbow': renderer.rainbow(e); break;
      case 'pop': {
        const far = Math.max(...e.list.map(b => b.order));
        renderer.pop(e.list, 0.06);
        popEnd = 0.06 + far * 0.05 + 0.12;
        const c = centroid(e.list);
        renderer.after(popEnd - 0.05, () => renderer.text(c.x, c.y, '+' + e.points, '#FFFFFF', 18 + Math.min(14, e.list.length)));
        break;
      }
      case 'drop':
        renderer.drop(e.list, popEnd, e.points / e.list.length);
        break;
      case 'combo': renderer.after(popEnd, () => celebrate(e)); break;
      case 'gift': renderer.after(popEnd + 0.1, () => renderer.gift(e)); extra = Math.max(extra, 0.7); break;
      case 'charged': renderer.after(popEnd + 0.15, () => renderer.charged(e)); extra = Math.max(extra, 0.75); break;
      case 'miss': renderer.miss(e); break;
      case 'push': renderer.after(popEnd + 0.2, () => renderer.push(e, state)); extra = Math.max(extra, 0.55); break;
      case 'wave': renderer.after(popEnd + 0.8, () => { applyTheme(); renderer.wave(e, state); }); extra = Math.max(extra, 1.9); break;
      case 'win': renderer.after(popEnd + 0.45, () => renderer.win()); renderer.after(popEnd + 2.1, finishWin); break;
      case 'lose': renderer.after(popEnd + 0.3, () => renderer.lose()); renderer.after(popEnd + 2.3, finishLose); break;
      case 'score': renderer.after(popEnd, () => { hud.score(e.score, e.gained > 0); hud.show(state, save.endlessBest); }); break;
    }
  }
  if (state.over) { store(); return; }
  renderer.after(popEnd + extra, () => {
    renderer.sync(state);
    renderer.setQueue(state.cur, state.next, 'advance');
    version++;
    busy = false;
    store();
  });
}

function doSwap() {
  if (busy || state.over || overlay.isOpen()) return;
  if (swap(state)) {
    renderer.setQueue(state.cur, state.next, 'swap');
    sfx.swap();
    store();
  }
}

/* ---------- end of a round ---------- */
function finishWin() {
  const n = state.level;
  save.stars[n] = Math.max(save.stars[n] || 0, state.stars);
  const best = save.best[n] || 0;
  const isBest = state.score > best;
  if (isBest) save.best[n] = state.score;
  save.unlocked = Math.max(save.unlocked, Math.min(LEVEL_COUNT, n + 1));
  store();
  winScreen(overlay, state, {
    best, isBest: isBest && best > 0, last: n >= LEVEL_COUNT, sfx,
    onNext: () => start(newLevel(n + 1, seed())),
    onReplay: () => start(newLevel(n, seed())),
    onLevels: showLevels
  });
}

function finishLose() {
  store();
  if (state.mode === 'endless') {
    const best = save.endlessBest;
    const isBest = state.score > best;
    if (isBest) { save.endlessBest = state.score; persist(save); }
    endlessOverScreen(overlay, state, { best: Math.max(best, state.score), isBest, onAgain: () => start(newEndless(seed())), onMenu: showMenu });
  } else {
    const n = state.level;
    loseScreen(overlay, state, { onRetry: () => start(newLevel(n, seed())), onLevels: showLevels });
  }
}

/* ---------- menus ---------- */
function showMenu() {
  const live = !state.over;
  menuScreen(overlay, save, {
    canResume: live && (state.shots > 0 || resumed),
    resumeLabel: state.mode === 'level' ? 'Level ' + state.level : 'Endless · wave ' + state.wave,
    onResume: () => overlay.hide(),
    onPlay: n => start(newLevel(n, seed())),
    onLevels: showLevels,
    onEndless: () => start(newEndless(seed())),
    onHelp: () => helpScreen(overlay, showMenu)
  });
}

function showLevels() {
  levelsScreen(overlay, save, { onPick: n => start(newLevel(n, seed())), onBack: showMenu });
}

/* ---------- pointer ---------- */
function aimAt(p) {
  let a = Math.atan2(SHOOTER.y - p.y, p.x - SHOOTER.x);
  if (a < 0) a = p.x < SHOOTER.x ? MAX_ANGLE : MIN_ANGLE;
  angle = clampAngle(a);
}

// tapping Dino, his bubble or the launcher swaps the two bubbles
const onSwapSpot = p => onDragon(p) || Math.hypot(p.x - holdPoint().x, p.y - holdPoint().y) < 30 || Math.hypot(p.x - SHOOTER.x, p.y - SHOOTER.y) < 24;

canvas.addEventListener('pointerdown', e => {
  if (overlay.isOpen()) return;
  const p = renderer.toBoard(e.clientX, e.clientY);
  if (onSwapSpot(p)) { doSwap(); return; }
  aiming = true;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
  aimAt(p);
  e.preventDefault();
});
canvas.addEventListener('pointermove', e => {
  if (overlay.isOpen()) return;
  const p = renderer.toBoard(e.clientX, e.clientY);
  if (aiming || e.pointerType === 'mouse') {
    if (!aiming && p.y > SHOOTER.y - 10) return;   // mouse resting on the launcher area keeps the old aim
    aimAt(p);
  }
});
canvas.addEventListener('pointerup', e => {
  if (!aiming) return;
  aiming = false;
  const p = renderer.toBoard(e.clientX, e.clientY);
  // dragging back down below the launcher cancels the shot
  if (p.y < SHOOTER.y - 6) fire();
});
canvas.addEventListener('pointercancel', () => { aiming = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- keys ---------- */
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (overlay.isOpen()) {
    if (k === 'Escape') overlay.close();
    return;
  }
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; e.preventDefault(); }
  else if (k === ' ' || k === 'Enter' || k === 'ArrowUp' || k === 'w' || k === 'W') { if (!e.repeat) fire(); e.preventDefault(); }
  else if (k === 's' || k === 'S' || k === 'ArrowDown' || k === 'x' || k === 'X') { if (!e.repeat) doSwap(); e.preventDefault(); }
  else if (k === 'h' || k === 'H' || k === '?') helpScreen(overlay, () => overlay.hide());
  else if (k === 'Escape') showMenu();
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});
window.addEventListener('blur', () => { keys.left = keys.right = false; aiming = false; });

/* ---------- nav buttons ---------- */
$('helpBtn').addEventListener('click', () => helpScreen(overlay, () => overlay.hide()));
$('menuBtn').addEventListener('click', showMenu);
$('newBtn').addEventListener('click', () => start(state.mode === 'level' ? newLevel(state.level, seed()) : newEndless(seed())));
const soundBtn = $('soundBtn');
soundBtn.setAttribute('aria-pressed', String(save.sound));
soundBtn.addEventListener('click', () => {
  save.sound = !save.sound;
  setSound(save.sound);
  soundBtn.setAttribute('aria-pressed', String(save.sound));
  persist(save);
  if (save.sound) sfx.click();
});

/* ---------- the loop ---------- */
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
  lastT = now;
  if (!overlay.isOpen()) {
    if (keys.left) angle = clampAngle(angle + 1.5 * dt);
    if (keys.right) angle = clampAngle(angle - 1.5 * dt);
  }
  const key = angle.toFixed(4) + '|' + version;
  if (!busy && key !== traceFor) { trace = aim(state, angle); traceFor = key; }
  renderer.frame(dt, state, { angle, trace: busy ? null : trace });
  requestAnimationFrame(loop);
}

applyTheme();
renderer.reset(state, { intro: true });
hud.show(state, save.endlessBest);
hud.score(state.score);
if (resumed || save.unlocked > 1 || Object.keys(save.stars).length) showMenu();
else menuScreen(overlay, save, {
  canResume: false,
  onPlay: n => start(newLevel(n, seed())),
  onLevels: showLevels,
  onEndless: () => start(newEndless(seed())),
  onHelp: () => helpScreen(overlay, showMenu)
});
requestAnimationFrame(loop);
// canvas text uses the display font once it has loaded
if (document.fonts && document.fonts.load) document.fonts.load("800 20px 'Baloo 2'").catch(() => {});

// ?debug: lets the test tools steer the game from the console
if (/[?&]debug\b/.test(location.search)) {
  window.bb = {
    get state() { return state; },
    aim: a => { angle = clampAngle(a); },
    fire,
    swap: doSwap,
    start: (n, s) => start(n === 'endless' ? newEndless(s || 1) : newLevel(n, s || 1)),
    give: kind => { state.cur = { special: kind, color: -1 }; renderer.setQueue(state.cur, state.next, 'swap'); }
  };
}
