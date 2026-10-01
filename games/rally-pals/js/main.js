// Rally Pals: wires the rules, the drawing, the controls and the cards together.

import { W, H, DT } from './config.js';
import { palById } from './data/pals.js';
import { newMatch, step } from './core/match.js';
import { newBrain, think } from './core/ai.js';
import { render } from './render/renderer.js';
import { COURT_ART } from './render/courts.js';
import { createFx, updateFx } from './render/fx.js';
import { createInput } from './ui/input.js';
import { createOverlay } from './ui/overlay.js';
import { createHud } from './ui/hud.js';
import { react } from './ui/effects.js';
import { setupScreen, pauseScreen, helpScreen, resultScreen } from './ui/screens.js';
import { setSound, sfx } from './audio.js';
import { load, persist } from './save.js';

const save = load();
setSound(save.sound);

const canvas = document.getElementById('court');
const ctx = canvas.getContext('2d');
const overlay = createOverlay(document.getElementById('overlay'));
const hud = createHud(document.getElementById('hud'));
const input = createInput(document);
const soundBtn = document.getElementById('soundBtn');
const touchy = matchMedia('(hover: none) and (pointer: coarse)');

let match = null;
let brains = [null, null];
let names = ['', ''], labels = ['', ''], humans = [true, true];
let fx = createFx();
let paused = true;
let hitstop = 0;
let resultTimer = 0;
const view = { scale: 1, t: 0, fx, labels, helper: save.helper, serveHint: ['', ''] };

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

// ---------- starting and stopping ----------

function applyTheme(courtId) {
  const art = COURT_ART[courtId];
  document.documentElement.style.setProperty('--top', art.page[0]);
  document.documentElement.style.setProperty('--bottom', art.page[1]);
  document.body.classList.toggle('dark', !!art.dark);
}

function startMatch() {
  const solo = save.opponent !== 'friend';
  match = newMatch({ pals: save.pals.slice(), court: save.court, format: save.format, powerups: save.powerups });
  brains = [null, solo ? newBrain(save.opponent, (Math.random() * 1e9) | 0) : null];
  humans = [true, !solo];
  names = match.players.map(p => palById(p.pal).name);
  labels = solo ? ['You', 'CPU'] : ['P1', 'P2'];
  view.labels = labels;
  view.helper = save.helper;
  const touch = touchy.matches;
  view.serveHint = [
    touch ? 'Tap swing to serve' : solo ? 'Press S or ↓ to serve' : 'Press S to serve',
    solo ? '' : touch ? 'Tap swing to serve' : 'Press ↓ to serve'
  ];
  input.setSolo(solo);
  document.body.classList.toggle('solo', solo);
  fx = createFx(); view.fx = fx;
  applyTheme(save.court);
  hud.setup(match, labels);
  document.getElementById('hud').classList.add('live');
  clearTimeout(resultTimer);
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  overlay.hide();
  resume();
}

function resume() {
  overlay.hide();
  input.clear();
  input.setEnabled(true);
  paused = false;
}

function pause() {
  if (!match || match.phase === 'over' || paused) return;
  paused = true;
  input.setEnabled(false);
  showPause();
}

function showPause() {
  pauseScreen(overlay, { onResume: resume, onRestart: startMatch, onSetup: showSetup, onHelp: () => helpScreen(overlay, showPause) });
}

function showSetup() {
  // the old match is done with; the robots play behind the menu again
  match = null;
  document.getElementById('hud').classList.remove('live');
  paused = true;
  input.setEnabled(false);
  clearTimeout(resultTimer);
  applyTheme(save.court);
  setupScreen(overlay, save, {
    onStart: () => { sfx.click(); persist(save); startMatch(); },
    onHelp: () => helpScreen(overlay, showSetup),
    onChange: () => { sfx.click(); persist(save); applyTheme(save.court); }
  });
}

function finish() {
  const w = match.score.winner;
  if (!humans[1] && w === 0) {
    save.cpuWins[save.opponent] = (save.cpuWins[save.opponent] || 0) + 1;
    persist(save);
  }
  resultTimer = setTimeout(() => {
    input.setEnabled(false);
    resultScreen(overlay, match, names, labels, { onRematch: startMatch, onSetup: showSetup });
  }, 1600);
}

// ---------- the loop ----------

function tick() {
  const inputs = [0, 1].map(i => (brains[i] ? think(brains[i], match, i) : input.read(i)));
  const events = step(match, inputs, DT);
  if (!events.length) return;
  hitstop = Math.max(hitstop, react(events, match, fx, names, humans));
  for (const e of events) {
    if (e.type === 'point' || e.type === 'ready' || e.type === 'power') hud.update(match);
    if (e.type === 'over') { hud.update(match); finish(); }
  }
}

let acc = 0, last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  view.t += dt;
  if (match && !paused) {
    if (hitstop > 0) hitstop -= dt;
    else {
      acc += dt;
      while (acc >= DT) { tick(); acc -= DT; }
    }
    if (match.phase === 'point' || match.phase === 'serve') {
      // faces on the scoreboard follow the pals' moods
      hud.update(match);
    }
  } else acc = 0;
  updateFx(fx, dt);
  if (match) {
    ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    render(ctx, match, view);
  } else idle(dt);
  requestAnimationFrame(frame);
}

// behind the menu: two robots playing a friendly match on the chosen court
const demo = { match: null, brains: null, key: '', acc: 0, fx: createFx() };
function idle(dt) {
  const key = save.court + save.pals.join();
  if (!demo.match || demo.key !== key || demo.match.phase === 'over') {
    demo.key = key;
    demo.match = newMatch({ pals: save.pals.slice(), court: save.court, format: 'set6', powerups: true });
    demo.brains = [newBrain('normal', 1), newBrain('normal', 2)];
  }
  demo.acc = Math.min(demo.acc + dt, 0.1);
  while (demo.acc >= DT) {
    demo.acc -= DT;
    react(step(demo.match, [think(demo.brains[0], demo.match, 0), think(demo.brains[1], demo.match, 1)], DT), demo.match, demo.fx, ['', ''], [false, false], true);
  }
  updateFx(demo.fx, dt);
  ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  render(ctx, demo.match, { ...view, fx: demo.fx, labels: ['', ''], serveHint: ['', ''] });
}

// ---------- buttons and keys ----------

document.getElementById('helpBtn').addEventListener('click', () => {
  if (match && !paused) { paused = true; input.setEnabled(false); }
  helpScreen(overlay, () => (match && match.phase !== 'over' ? showPause() : showSetup()));
});
document.getElementById('menuBtn').addEventListener('click', () => {
  if (match && !paused && match.phase !== 'over') pause();
  else showSetup();
});
function setSoundOn(on) {
  save.sound = on; setSound(on); persist(save);
  soundBtn.setAttribute('aria-pressed', on);
}
soundBtn.addEventListener('click', () => setSoundOn(!save.sound));
soundBtn.setAttribute('aria-pressed', save.sound);

addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (overlay.isOpen()) overlay.close();
    else pause();
  } else if (e.code === 'KeyM') setSoundOn(!save.sound);
  else if (e.code === 'KeyH' && !overlay.isOpen()) document.getElementById('helpBtn').click();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

showSetup();
requestAnimationFrame(frame);
