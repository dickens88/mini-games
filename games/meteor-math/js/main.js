// Meteor Math: wires the rules, the drawing, the number pad and the cards together.

import { W, H, DT } from './config.js';
import { WORLDS, LEVELS, ENDLESS, weakSpec, levelById } from './data/worlds.js';
import { heroById } from './data/heroes.js';
import { newGame, update, press, result } from './core/game.js';
import { weakest } from './core/facts.js';
import { newCheck, current, answer, apply, CHECK_SIZE } from './core/placement.js';
import { render } from './render/renderer.js';
import { THEMES } from './render/themes.js';
import { createFx, react, updateFx } from './render/fx.js';
import { createOverlay } from './ui/overlay.js';
import { buildKeys, listenKeyboard } from './ui/keypad.js';
import {
  menuScreen, worldsScreen, introScreen, pauseScreen, resultScreen, helpScreen,
  factMapScreen, checkIntroScreen, checkScreen, checkResultScreen
} from './ui/screens.js';
import { setSound, sfx } from './audio.js';
import { load, persist, defaults, isOpen } from './save.js';

let save = load();
setSound(save.sound);

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const overlay = createOverlay(document.getElementById('overlay'));
const soundBtn = document.getElementById('soundBtn');

let game = null, level = null, mode = null;
let paused = false;
let check = null;
let screen = null;            // the card to go back to after help
let finishTimer = 0;
const view = { scale: 1, t: 0, fx: createFx(), world: WORLDS[save.unlocked].id, hints: save.hints, best: save.best, hero: save.hero };

// ---------- canvas size ----------

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || W;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(w * dpr * H / W);
  view.scale = canvas.width / W;
}
new ResizeObserver(resize).observe(canvas);
resize();

function setWorld(id) {
  view.world = id;
  const th = THEMES[id];
  document.documentElement.style.setProperty('--top', th.page[0]);
  document.documentElement.style.setProperty('--bottom', th.page[1]);
  document.body.classList.toggle('dark', !!th.dark);
}
setWorld(view.world);

// ---------- cards ----------

function show(fn) { screen = fn; fn(); }

function showMenu() {
  stopGame();
  show(() => menuScreen(overlay, save, {
    play: () => { sfx.click(); showWorlds(); },
    endless: () => { sfx.click(); start(ENDLESS, 'endless'); },
    weak: () => { sfx.click(); start(weakSpec(weakest(save.stats, 12)), 'weak'); },
    map: () => { sfx.click(); showFactMap(showMenu); },
    check: () => { sfx.click(); showCheckIntro(); },
    hero: id => {
      save.hero = id; view.hero = id; persist(save);
      sfx.right();
      view.fx.dino.mood = 'cheer'; view.fx.dino.moodAge = 0; view.fx.dino.moodLeft = 1.2;
      showMenu();
    }
  }));
}

function showWorlds() {
  stopGame();
  setWorld(WORLDS[save.unlocked].id);
  show(() => worldsScreen(overlay, save, {
    pick: id => { sfx.click(); showIntro(levelById(id)); },
    back: showMenu
  }));
}

function showIntro(l) {
  setWorld(WORLDS[l.world].id);
  show(() => introScreen(overlay, l, save.stars[l.id] || 0, {
    go: () => start(l, 'level'),
    back: showWorlds
  }));
}

function showFactMap(back) {
  show(() => factMapScreen(overlay, save.stats, {
    back,
    reset: () => {
      save = Object.assign(defaults(), { sound: save.sound, hints: save.hints });
      view.hero = save.hero;
      persist(save);
      view.best = 0;
      showMenu();
    }
  }));
}

function showHelp() {
  if (check) return;
  if (game && game.phase === 'play' && !paused) pauseGame(false);
  helpScreen(overlay, heroById(save.hero).name, () => { sfx.click(); if (game && game.phase === 'play') showPause(); else if (screen) screen(); else showMenu(); });
}

// ---------- playing ----------

function start(spec, m) {
  clearTimeout(finishTimer);
  level = spec;
  mode = m;
  game = newGame(spec, save.stats);
  view.fx = createFx();
  view.hints = save.hints;
  view.best = save.best;
  setWorld(m === 'level' ? WORLDS[spec.world].id : m === 'weak' ? 'candy' : WORLDS[Math.floor(Math.random() * WORLDS.length)].id);
  paused = false;
  overlay.hide();
  document.body.classList.add('playing');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

function stopGame() {
  clearTimeout(finishTimer);
  if (game) persist(save);
  game = null;
  paused = false;
  document.body.classList.remove('playing');
}

function pauseGame(withCard) {
  if (!game || game.phase !== 'play') return;
  paused = true;
  persist(save);
  if (withCard) showPause();
}

function showPause() {
  paused = true;
  screen = showPause;
  pauseScreen(overlay, {
    resume: () => { overlay.hide(); paused = false; },
    restart: () => start(level, mode),
    quit: () => showMenu()
  });
}

function finish() {
  const res = result(game);
  const info = { endless: mode === 'endless', weak: mode === 'weak', boss: !!level.boss, next: null, opened: null, newBest: false };
  if (mode === 'level' && res.won) {
    save.stars[level.id] = Math.max(save.stars[level.id] || 0, res.stars);
    if (level.boss && level.world + 1 < WORLDS.length && save.unlocked <= level.world) {
      save.unlocked = level.world + 1;
      info.opened = WORLDS[level.world + 1].name;
    }
    const nxt = LEVELS[LEVELS.indexOf(level) + 1];
    if (nxt && isOpen(save, nxt)) info.next = nxt;
  }
  if (mode === 'endless' && res.score > save.best) { save.best = res.score; info.newBest = true; }
  persist(save);
  document.body.classList.remove('playing');
  show(() => resultScreen(overlay, res, info, {
    retry: () => start(level, mode === 'weak' ? 'weak' : mode),
    next: () => showIntro(info.next),
    map: showWorlds,
    menu: showMenu
  }));
}

function tick() {
  update(game, DT);
  if (!game.events.length) return;
  const events = game.events.splice(0);
  react(view.fx, events, game, view.world);
  if (events.some(e => e.type === 'won' || e.type === 'lost')) {
    finishTimer = setTimeout(finish, events.some(e => e.type === 'bossDown') ? 1900 : 1300);
  }
}

function key(k) {
  if (!game || paused || overlay.isOpen() || game.phase !== 'play') return false;
  if (k === 'back') sfx.back(); else if (k !== 'fire') sfx.key();
  press(game, k);
  const events = game.events.splice(0);
  react(view.fx, events, game, view.world);
  return true;
}

// ---------- quick check ----------

function showCheckIntro() {
  stopGame();
  show(() => checkIntroScreen(overlay, { go: startCheck, back: showMenu }));
}

function startCheck() {
  check = { c: newCheck(), typed: '', t0: 0, ui: null, busy: false };
  nextQuestion();
}

function nextQuestion() {
  const it = current(check.c);
  check.typed = '';
  check.busy = false;
  check.ui = checkScreen(overlay, check.c.i, CHECK_SIZE, it.prob, { key: checkKey, skip: () => submit(null), quit: quitCheck });
  check.t0 = performance.now();
}

function checkKey(k) {
  if (!check || check.busy) return;
  const it = current(check.c);
  if (k === 'back') { check.typed = check.typed.slice(0, -1); sfx.back(); }
  else if (k === 'fire') { if (check.typed) submit(Number(check.typed)); return; }
  else if (/^[0-9]$/.test(k) && check.typed.length < 3 && !(k === '0' && !check.typed)) {
    check.typed += k;
    sfx.key();
    if (check.typed.length >= String(it.prob.answer).length) { check.ui.typed(check.typed); submit(Number(check.typed)); return; }
  }
  check.ui.typed(check.typed);
}

function submit(value) {
  const it = current(check.c);
  check.busy = true;
  const ok = answer(check.c, value, performance.now() - check.t0);
  check.ui.mark(ok, it.prob.full);
  if (ok) sfx.right(); else sfx.wrong();
  setTimeout(() => {
    if (!check) return;
    if (check.c.done) finishCheck(); else nextQuestion();
  }, ok ? 450 : 1300);
}

function finishCheck() {
  const out = apply(check.c, save.stats);
  check = null;
  save.checked = true;
  save.unlocked = Math.max(save.unlocked, out.world);
  persist(save);
  setWorld(WORLDS[save.unlocked].id);
  show(() => checkResultScreen(overlay, out, WORLDS[out.world].name, {
    play: showWorlds,
    map: () => showFactMap(showMenu)
  }));
}

function quitCheck() {
  if (check.c.i > 0) apply(check.c, save.stats);
  check = null;
  save.checked = true;
  persist(save);
  showMenu();
}

// ---------- controls ----------

buildKeys(document.getElementById('keypad'), k => (check ? checkKey(k) : key(k)));

listenKeyboard(k => {
  if (k === 'mute') { toggleSound(); return true; }
  if (k === 'help') { showHelp(); return true; }
  if (check) {
    if (k === 'esc') { quitCheck(); return true; }
    checkKey(k);
    return true;
  }
  if (k === 'esc') {
    if (game && game.phase === 'play' && !paused) { pauseGame(true); return true; }
    if (overlay.isOpen()) { overlay.close(); return true; }
    return false;
  }
  return key(k);
});

document.getElementById('menuBtn').addEventListener('click', () => {
  if (check) return;
  if (game && game.phase === 'play') { if (!paused) pauseGame(true); }
  else showMenu();
});
document.getElementById('helpBtn').addEventListener('click', showHelp);

function toggleSound() {
  save.sound = !save.sound;
  setSound(save.sound);
  soundBtn.setAttribute('aria-pressed', String(save.sound));
  persist(save);
}
soundBtn.setAttribute('aria-pressed', String(save.sound));
soundBtn.addEventListener('click', toggleSound);

document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(true); });
window.addEventListener('pagehide', () => persist(save));

// ---------- the loop ----------

let acc = 0, last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  view.t += dt;
  if (game && !paused && !overlay.isOpen()) {
    acc += dt;
    while (acc >= DT) { tick(); acc -= DT; if (!game) break; }
  } else acc = 0;
  if (!paused) updateFx(view.fx, dt);
  ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  render(ctx, game, view);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// for automated checks: ?debug exposes the round and the key handler
if (/[?&]debug\b/.test(location.search)) window.meteorMath = { get game() { return game; }, key, start, LEVELS, setPaused: p => { paused = p; } };

showMenu();
