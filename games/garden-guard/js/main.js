// Entry point: owns the running game, the frame loop and the selection, and
// connects the simulation to the renderer, the sound and the UI.

import { STEP, START_LIVES, STAR_LIVES } from './config.js';
import { LEVELS, TOWERS } from './data/registry.js';
import { createState, serialize, deserialize } from './core/state.js';
import { step } from './core/sim.js';
import { drain } from './core/events.js';
import * as cmd from './core/commands.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { buildPanel } from './ui/build-panel.js';
import { towerPanel } from './ui/tower-panel.js';
import { createOverlay } from './ui/modals.js';
import { createInput } from './ui/input.js';
import { sfx, setSound } from './audio.js';
import { load, persist } from './save.js';
import { S } from './strings.js';

const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
const view = { selPad: null, selTower: null, preview: null };
let panel = null;     // the current dock panel, if any
let panelKey = '';

function startLevel(levelId, snapshot) {
  state = snapshot ? deserialize(snapshot) : createState(levelId, (Math.random() * 2 ** 32) >>> 0);
  renderer.setState(state);
  hud.reset();
  clearSelection();
  acc = 0;
}

/* ---------- selection & dock panel ---------- */
function clearSelection() {
  view.selPad = null; view.selTower = null; view.preview = null;
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

$('waveBtn').addEventListener('click', doWave);
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
    if (renderer.flagAt(px, py)) { clearSelection(); doWave(); return; }
    selectCell(renderer.cellAt(px, py));
  },
  cell: selectCell,
  blocked: () => overlay.kind !== null,
  overlayKey: () => { if (overlay.kind === 'pause') setPaused(false); },
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
      case 'wave':
        sfx.wave();
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
  if (result === 'win') {
    const stars = STAR_LIVES.filter(n => state.lives >= n).length;
    save.stars[id] = Math.max(save.stars[id] || 0, stars);
    persist(save);
    sfx.win();
    overlay.show({
      kind: 'end', title: S.winTitle, stars, msg: S.winMsg(state.lives, START_LIVES),
      btn: S.again, onBtn: () => { overlay.hide(); startLevel(id); }
    });
  } else {
    persist(save);
    sfx.lose();
    overlay.show({
      kind: 'end', title: S.loseTitle, msg: S.loseMsg(state.waveIdx),
      btn: S.tryAgain, onBtn: () => { overlay.hide(); startLevel(id); }
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
  // a selected tower can disappear (sold) or the game can end mid-selection
  if (view.selTower && !cmd.towerByUid(state, view.selTower)) clearSelection();
  if (panel) panel.refresh(state);

  renderer.update(dt, now);
  renderer.draw({ ...view, cursor: input.cursor });
  hud.update(state, { speed: save.speed, paused, sound: save.sound });
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
function layout() { renderer.layout(); }
window.addEventListener('resize', layout);
if (window.ResizeObserver) new ResizeObserver(layout).observe($('wrap'));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

const levelId = LEVELS[0].id;
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

// test hook, only with ?debug
if (/[?&]debug\b/.test(location.search)) {
  window.__gg = { get state() { return state; }, cmd, step, startLevel, view };
}
