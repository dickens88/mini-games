// Entry point: owns the running game, the frame loop and the selection, and
// connects the simulation to the renderer, the sound and the UI.

import { STEP, START_LIVES, STAR_LIVES } from './config.js';
import { LEVELS, TOWERS, ENEMIES, POWERS, levelById } from './data/registry.js';
import { createState, serialize, deserialize } from './core/state.js';
import { step } from './core/sim.js';
import { drain } from './core/events.js';
import * as cmd from './core/commands.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { buildPanel } from './ui/build-panel.js';
import { towerPanel } from './ui/tower-panel.js';
import { createOverlay } from './ui/modals.js';
import { createPowers } from './ui/powers.js';
import { enemyIcon } from './render/sprites/enemy-sprites.js';
import { towerIcon } from './render/sprites/tower-sprites.js';
import { powerIcon } from './render/sprites/power-sprites.js';
import { createInput } from './ui/input.js';
import { sfx, setSound } from './audio.js';
import { load, persist } from './save.js';
import { S } from './strings.js';

const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEBUG = /[?&]debug\b/.test(location.search);   // test hook, and every level unlocked
const $ = id => document.getElementById(id);

/* ---------- decorative stars ---------- */
(() => {
  const field = $('stars');
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('i');
    const size = 1 + Math.random() * 2.2;
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.width = s.style.height = size + 'px';
    s.style.animationDelay = Math.random() * 3.6 + 's';
    field.append(s);
  }
})();

/* ---------- setup ---------- */
const save = load();
setSound(save.sound);

const canvas = $('board');
// where flying coins should land: the gold counter, in canvas pixels
function goldTarget() {
  const pill = $('goldOut').closest('.pill').getBoundingClientRect();
  const cv = canvas.getBoundingClientRect();
  return { x: pill.left + pill.width * 0.25 - cv.left, y: pill.top + pill.height / 2 - cv.top };
}
const renderer = createRenderer(canvas, $('wrap'), { reducedMotion: REDUCED_MOTION, goldTarget });
const hud = createHud();
const overlay = createOverlay();
const panelEl = $('panel');

let state = null;
let paused = false;
let acc = 0;
const view = { selPad: null, selTower: null, preview: null, aim: null, hover: null };
const intros = [];    // "new bug / tower / power" cards waiting to be shown
const powers = createPowers($('powers'), { onPick: pickPower });
let panel = null;     // the current dock panel, if any
let panelKey = '';

function startLevel(levelId, snapshot) {
  state = snapshot ? deserialize(snapshot) : createState(levelId, (Math.random() * 2 ** 32) >>> 0);
  renderer.setState(state);
  hud.reset();
  powers.reset();
  clearSelection();
  acc = 0;
  intros.length = 0;
  save.current = state.level.id;
  if (!snapshot) save.run = null;
  // introduce the towers and powers this level brings for the first time
  for (const t of state.level.towers) if (!save.seen.includes(t)) intros.push({ kind: 'tower', id: t });
  for (const p of Object.keys(state.powerCd)) if (!save.seen.includes(p)) intros.push({ kind: 'power', id: p });
  persist(save);
}

const unlocked = i => i === 0 || !!save.stars[LEVELS[i - 1].id] || DEBUG;
const nextLevelOf = id => LEVELS[LEVELS.findIndex(l => l.id === id) + 1] || null;

/* ---------- selection & dock panel ---------- */
function clearSelection() {
  view.selPad = null; view.selTower = null; view.preview = null; view.aim = null;
  showPanel();
}

function showPanel() {
  const tower = view.selTower ? cmd.towerByUid(state, view.selTower) : null;
  const key = tower ? 't' + tower.uid : view.selPad !== null ? 'p' + view.selPad : 'idle';
  if (key === panelKey) return;
  panelKey = key;
  panelEl.textContent = '';
  if (tower) {
    panel = towerPanel(state, tower, {
      onUpgrade: doUpgrade, onSell: doSell, onMode: doMode, onClose: () => { sfx.click(); clearSelection(); }
    });
  } else if (view.selPad !== null) {
    panel = buildPanel(state, {
      onBuild: type => doBuild(type),
      onPreview: type => { view.preview = type; },
      onClose: () => { sfx.click(); clearSelection(); }
    });
  } else {
    panel = null;
    const tip = document.createElement('p');
    tip.className = 'panel-tip';
    tip.innerHTML = S.tipIdle;
    panelEl.append(tip);
    return;
  }
  panelEl.append(panel.root);
  panel.refresh(state);
}

function selectCell(cell) {
  if (!cell || state.result) { clearSelection(); return; }
  const padIdx = state.pads.findIndex(p => p.c === cell.c && p.r === cell.r);
  if (padIdx < 0) { if (view.selPad !== null || view.selTower) sfx.click(); clearSelection(); return; }
  const tower = cmd.towerOnPad(state, padIdx);
  if (tower) {
    if (view.selTower === tower.uid) { clearSelection(); return; }
    view.selTower = tower.uid; view.selPad = null;
  } else {
    if (view.selPad === padIdx) { clearSelection(); return; }
    view.selPad = padIdx; view.selTower = null;
  }
  view.preview = null;
  sfx.click();
  showPanel();
}

/* ---------- player actions ---------- */
function refuse(res) {
  sfx.bad();
  overlay.toast(S.reasons[res.reason] || res.reason);
}

function doBuild(type) {
  if (view.selPad === null) return;
  const res = cmd.build(state, view.selPad, type);
  if (!res.ok) return refuse(res);
  view.selPad = null; view.preview = null;
  view.selTower = res.tower.uid;
  showPanel();
}
function doUpgrade() {
  if (!view.selTower) return;
  const res = cmd.upgrade(state, view.selTower);
  if (!res.ok) return refuse(res);
  panelKey = ''; showPanel();
}
function doSell() {
  if (!view.selTower) return;
  const res = cmd.sell(state, view.selTower);
  if (!res.ok) return refuse(res);
  clearSelection();
}
function doMode() {
  if (!view.selTower) return;
  cmd.cycleMode(state, view.selTower);
  sfx.click();
  if (panel) panel.refresh(state);
}
function doWave() {
  const res = cmd.callWave(state);
  if (!res.ok) return refuse(res);
}

/* ---------- powers ---------- */
function pickPower(id) {
  if (view.aim === id) { view.aim = null; sfx.click(); return; }
  const res = cmd.canCast(state, id);
  if (!res.ok) return refuse(res);
  clearSelection();
  view.aim = id;
  sfx.click();
  overlay.toast(S.aimTip(POWERS[id].name), 2600);
}
function castAt(x, y) {
  const id = view.aim;
  view.aim = null;
  const res = cmd.castPower(state, id, x, y);
  if (!res.ok) return refuse(res);
}

/* ---------- the level map ---------- */
function showLevels() {
  if (overlay.kind === 'levels') { closeLevels(); return; }
  if (overlay.kind === 'intro') return;
  clearSelection();
  const ended = !!state.result;
  overlay.show({
    kind: 'levels', title: S.levelsTitle,
    levels: LEVELS.map((l, i) => ({
      id: l.id, name: l.name, theme: l.theme, chapter: l.id.split('-')[0],
      stars: save.stars[l.id] || 0, locked: !unlocked(i), current: l.id === state.level.id
    })),
    onPick: id => {
      sfx.click();
      overlay.hide();
      paused = false;
      if (id === state.level.id && !ended) return;
      startLevel(id);
    },
    btn: ended ? S.again : S.unpause,
    onBtn: () => { if (ended) { overlay.hide(); startLevel(state.level.id); } else closeLevels(); }
  });
}
function closeLevels() {
  overlay.hide();
  paused = false;
}

/* ---------- "new bug!" cards ---------- */
function showIntro(it) {
  let title, def, pic;
  if (it.kind === 'enemy') { def = ENEMIES[it.id]; title = S.newBug; pic = enemyIcon(it.id, def.size, 96); }
  else if (it.kind === 'tower') { def = TOWERS[it.id]; title = S.newTower; pic = towerIcon(it.id, 96); }
  else { def = POWERS[it.id]; title = S.newPower; pic = powerIcon(it.id, 96); }
  if (!save.seen.includes(it.id)) save.seen.push(it.id);
  persist(save);
  overlay.show({
    kind: 'intro', title, pic, msg: `<b>${def.name}</b> — ${def.blurb}`,
    btn: S.gotIt, onBtn: () => overlay.hide()
  });
}
function toggleSpeed() {
  save.speed = save.speed === 1 ? 2 : 1;
  persist(save);
  sfx.click();
}
function setPaused(p) {
  if (p === paused || state.result) return;
  paused = p;
  if (paused) {
    overlay.show({ kind: 'pause', title: S.paused, msg: S.pausedMsg, btn: S.unpause, onBtn: () => setPaused(false) });
  } else if (overlay.kind === 'pause') {
    overlay.hide();
  }
}

$('waveBtn').addEventListener('click', () => { view.aim = null; doWave(); });
$('levelsBtn').addEventListener('click', () => { sfx.click(); showLevels(); });
$('speedBtn').addEventListener('click', toggleSpeed);
$('pauseBtn').addEventListener('click', () => setPaused(!paused));
$('soundBtn').addEventListener('click', () => {
  save.sound = !save.sound;
  setSound(save.sound);
  persist(save);
  if (save.sound) sfx.click();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && running()) setPaused(true); });

const input = createInput(canvas, renderer, {
  tap: (px, py) => {
    if (view.aim) { const p = renderer.toTiles(px, py); castAt(p.x, p.y); return; }
    if (renderer.flagAt(px, py)) { clearSelection(); doWave(); return; }
    selectCell(renderer.cellAt(px, py));
  },
  hover: (px, py) => { view.hover = px === null ? null : renderer.toTiles(px, py); },
  cell: c => (view.aim ? castAt(c.c + 0.5, c.r + 0.5) : selectCell(c)),
  blocked: () => overlay.kind !== null,
  overlayKey: k => {
    if (overlay.kind === 'pause') setPaused(false);
    else if (overlay.kind === 'levels' && !state.result) closeLevels();
    else if (overlay.kind === 'intro' && k === 'Escape') overlay.hide();
  },
  wave: doWave,
  buildKey: k => {
    if (view.selPad === null) return;
    const type = state.level.towers.find(t => TOWERS[t].key === k);
    if (type) doBuild(type);
  },
  upgrade: doUpgrade,
  sell: doSell,
  mode: doMode,
  speed: toggleSpeed,
  pause: () => setPaused(!paused),
  powerKey: k => { const id = Object.keys(state.powerCd).find(p => POWERS[p].key === k); if (id) pickPower(id); },
  levels: showLevels,
  cancel: () => clearSelection()
});

/* ---------- simulation events ---------- */
function handleEvents(events) {
  renderer.handle(events);
  let leaked = 0;
  for (const ev of events) {
    switch (ev.type) {
      case 'shoot': sfx.shoot(); break;
      case 'hit': sfx.hit(); break;
      case 'kill': sfx.kill(); break;
      case 'build': sfx.build(); break;
      case 'upgrade': sfx.upgrade(); break;
      case 'sell': sfx.sell(); break;
      case 'leak': leaked += ev.bite; break;
      case 'bonus': overlay.toast(S.bonus(ev.gold)); break;
      case 'power': sfx.power(ev.kind); break;
      case 'gold': sfx.coin(); break;
      case 'wave':
        sfx.wave();
        // bugs nobody has met yet get a card before they arrive
        for (const sp of state.waves[ev.wave - 1]) {
          if (!save.seen.includes(sp.type) && !intros.some(i => i.id === sp.type)) intros.push({ kind: 'enemy', id: sp.type });
        }
        // autosave at the start of every wave
        save.run = serialize(state);
        persist(save);
        break;
      case 'end': finish(ev.result); break;
    }
  }
  if (leaked && !state.result) { sfx.leak(); overlay.toast(S.leak(leaked)); }
}

function finish(result) {
  clearSelection();
  save.run = null;
  const id = state.level.id;
  intros.length = 0;
  if (result === 'win') {
    const stars = STAR_LIVES.filter(n => state.lives >= n).length;
    save.stars[id] = Math.max(save.stars[id] || 0, stars);
    persist(save);
    sfx.win();
    const next = nextLevelOf(id);
    overlay.show({
      kind: 'end', title: S.winTitle, stars,
      msg: S.winMsg(state.lives, START_LIVES) + (next ? '' : '<br>' + S.allSaved),
      btn: next ? S.nextLevel : S.again,
      onBtn: () => { overlay.hide(); startLevel(next ? next.id : id); },
      btn2: S.levelsBtn, onBtn2: showLevels
    });
  } else {
    persist(save);
    sfx.lose();
    overlay.show({
      kind: 'end', title: S.loseTitle, msg: S.loseMsg(state.waveIdx),
      btn: S.tryAgain, onBtn: () => { overlay.hide(); startLevel(id); },
      btn2: S.levelsBtn, onBtn2: showLevels
    });
  }
}

/* ---------- frame loop ---------- */
function running() { return state && !paused && !state.result && overlay.kind === null; }

let lastT = 0;
function frame(now) {
  const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : STEP;
  lastT = now;
  // a freeze-frame on big moments: the world holds still for a few frames
  if (running() && !renderer.takeHitstop(dt)) {
    acc += dt * save.speed;
    let n = 0;
    while (acc >= STEP && n < 12) { step(state); acc -= STEP; n++; }
    if (n === 12) acc = 0;
  }
  // commands (build, sell…) emit events while paused too
  handleEvents(drain(state));
  if (overlay.kind === null && intros.length && !state.result) showIntro(intros.shift());
  if (view.aim && input.cursor) view.hover = { x: input.cursor.c + 0.5, y: input.cursor.r + 0.5 };
  if (view.aim && cmd.canCast(state, view.aim).ok === false) view.aim = null;
  // a selected tower can disappear (sold) or the game can end mid-selection
  if (view.selTower && !cmd.towerByUid(state, view.selTower)) clearSelection();
  if (panel) panel.refresh(state);

  renderer.update(dt, now);
  renderer.draw({ ...view, cursor: input.cursor });
  hud.update(state, { speed: save.speed, paused, sound: save.sound });
  powers.update(state, view.aim);
  canvas.classList.toggle('aiming', !!view.aim);
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
function layout() { renderer.layout(); }
window.addEventListener('resize', layout);
if (window.ResizeObserver) new ResizeObserver(layout).observe($('wrap'));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

const levelId = (save.run && levelById(save.run.levelId) ? save.run.levelId : null) ||
  (levelById(save.current) ? save.current : LEVELS[0].id);
const resumable = save.run && save.run.levelId === levelId;
try {
  startLevel(levelId, resumable ? save.run : null);
} catch (e) {
  // a save from an older version that no longer fits: start fresh
  save.run = null; persist(save);
  startLevel(levelId);
}
layout();

if (resumable && state.waveIdx > 0) {
  overlay.show({
    kind: 'resume', title: S.resumeTitle, msg: S.resumeMsg(state.waveIdx, state.waves.length),
    btn: S.resume, onBtn: () => overlay.hide(),
    btn2: S.restart, onBtn2: () => { overlay.hide(); save.run = null; persist(save); startLevel(levelId); }
  });
} else if (!save.seenHelp) {
  overlay.show({
    kind: 'help', title: S.helpTitle, how: S.help, msg: S.helpMsg, btn: S.letsGo,
    onBtn: () => { save.seenHelp = true; persist(save); overlay.hide(); }
  });
}
requestAnimationFrame(frame);

// test hook
if (DEBUG) {
  window.__gg = { get state() { return state; }, cmd, step, startLevel, view };
}
