// Entry point: owns the game and the frame loop, and plays each rule event
// as animation + sound before taking the next input.

import { SEATS } from './config.js';
import { createState, serialize, deserialize } from './core/state.js';
import { roll, endGame } from './core/turn.js';
import { mapOf } from './core/rules.js';
import { useItem, usableSlots, needsTarget, targets } from './core/items.js';
import { drain } from './core/events.js';
import { linkCurve } from './render/kit.js';
import { THEMES } from './render/themes/index.js';
import { createRenderer } from './render/renderer.js';
import { createScene } from './render/anim.js';
import { createHud } from './ui/hud.js';
import { createDice } from './ui/dice.js';
import { createOverlay } from './ui/overlay.js';
import { createInput } from './ui/input.js';
import { setupScreen, helpScreen, targetScreen, winnerScreen, resultsScreen } from './ui/screens.js';
import { ITEM_BY_ID } from './data/items.js';
import { sfx, setSound } from './audio.js';
import { preloadAvatars } from './render/avatars.js';
import { load, persist } from './save.js';
import { S } from './strings.js';

const $ = id => document.getElementById(id);
const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

preloadAvatars();
const save = load();
setSound(save.sound);

const canvas = $('board');
const renderer = createRenderer(canvas);
const scene = createScene();
const overlay = createOverlay($('overlay'));
const dice = createDice($('dice'), { onTick: () => sfx.rattle() });
const dice2 = createDice($('dice2'));

let state = createState({ map: (save.setup && save.setup.map) || 'jungle', players: [{}, {}] });
let playing = false;
let busy = false;
let again = false;       // the current player earned another roll
let shownWinner = false;

const hud = createHud({
  players: $('players'), dock: $('dock'), dice: $('dice'), msg: $('msg'), sub: $('sub'), items: $('items')
}, { roll: () => doRoll(), item: k => doItem(k) });

/* ---------- the page takes on the map's colours ---------- */
function applyTheme(mapId) {
  const p = THEMES[mapId].page, root = document.documentElement;
  root.style.setProperty('--top', p.top);
  root.style.setProperty('--bottom', p.bottom);
  root.style.setProperty('--ink', p.ink);
  root.style.setProperty('--accent', p.accent);
  root.dataset.board = mapId;
  root.classList.toggle('dark', !!p.dark);
}

function showMap(mapId) {
  state = createState({ map: mapId, players: [{}, {}] });
  applyTheme(mapId);
  scene.snap(state, mapOf(state));
}
showMap(state.map);

/* ---------- saving ---------- */
function store() {
  save.game = playing && state.phase !== 'over' ? serialize(state) : null;
  persist(save);
}

/* ---------- toast ---------- */
let toastTimer = 0;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
}

/* ---------- starting and ending ---------- */
function startGame(setup) {
  save.setup = setup;
  state = createState({ map: setup.map, players: setup.players.slice(0, setup.count) });
  drain(state);
  applyTheme(state.map);
  playing = true;
  again = false;
  shownWinner = false;
  scene.snap(state, mapOf(state));
  overlay.hide();
  store();
  refresh();
  sfx.turn();
  renderer.showBanner(S.turnBanner(state.players[0].name), SEATS[state.players[0].seat], state.players[0].avatar);
}

function showSetup() {
  const saved = save.game ? deserialize(save.game) : null;
  setupScreen(overlay, save.setup, {
    canResume: !!saved,
    onMapPreview: id => { if (!playing) showMap(id); },
    onStart: s => { sfx.click(); startGame(s); },
    onResume: () => {
      sfx.click();
      state = saved;
      applyTheme(state.map);
      playing = true;
      again = false;
      shownWinner = state.ranks.length > 0;
      scene.snap(state, mapOf(state));
      overlay.hide();
      refresh();
    }
  });
}

function showResults() {
  sfx.win();
  renderer.confetti();
  resultsScreen(overlay, state, {
    onRematch: () => { sfx.click(); startGame(save.setup); },
    onSetup: () => { sfx.click(); playing = false; store(); showSetup(); }
  });
}

/* ---------- actions ---------- */
function refresh() {
  hud.render(state, busy || !playing, again);
}

function canPlay() {
  return playing && !busy && !overlay.isOpen() && state.phase !== 'over';
}

async function run(fn) {
  if (!canPlay()) return;
  busy = true;
  refresh();
  if (!fn(state)) { busy = false; refresh(); return; }
  const events = drain(state);
  for (const e of events) {
    const f = DIRECT[e.type];
    if (f) await f(e);
  }
  busy = false;
  store();
  refresh();
  afterSettle();
}

function afterSettle() {
  if (!playing) return;
  if (state.phase === 'over') { showResults(); return; }
  const first = state.ranks[0];
  if (first !== undefined && !shownWinner) {
    shownWinner = true;
    sfx.win();
    renderer.confetti();
    winnerScreen(overlay, state, first, {
      onKeep: () => { sfx.click(); overlay.hide(); },
      onEnd: () => { overlay.hide(); endGame(state); drain(state); store(); refresh(); showResults(); }
    });
  }
}

const doRoll = () => run(roll);

function doItem(slot) {
  if (!canPlay() || !usableSlots(state)[slot]) return;
  const id = state.players[state.turn].items[slot];
  const kind = needsTarget(id);
  if (!kind) { run(s => useItem(s, slot)); return; }
  sfx.click();
  targetScreen(overlay, state, id, targets(state), {
    onPick: arg => { overlay.hide(); run(s => useItem(s, slot, arg)); },
    onCancel: () => overlay.hide()
  });
}

/* ---------- playing the rule events ---------- */
const who = pi => state.players[pi];
const colour = pi => SEATS[who(pi).seat];
const cell = pos => mapOf(state).cells[pos];
const visOf = pi => scene.vis.get(pi);
const fx = () => THEMES[state.map].fx;

function popAt(pi, str) {
  const v = visOf(pi);
  if (v) renderer.pop(v.x, v.y, str, colour(pi).dark);
}
const kindName = kind => {
  const k = mapOf(state).def.kinds[kind];
  return k.icon + ' ' + k.name;
};
const landFx = power => v => renderer.land(v.x, v.y, fx(), power);

// walk cell by cell, counting the steps down above the pawn
async function walkPath(pi, path, dur, height, counter) {
  for (let k = 0; k < path.length; k++) {
    if (counter) scene.label(pi, path.length - k);
    sfx.hop(k);
    const last = k === path.length - 1;
    await scene.hop(pi, cell(path[k]), dur, height, landFx(last ? 1.4 : 0.6));
  }
  scene.label(pi, null);
}

// knocked back in one big tumbling arc, then dizzy
async function knockBack(pi, to) {
  await scene.hop(pi, cell(to), 0.6, 2.4, landFx(1), -1);
  scene.dizzy(pi, 1.4);
}

function curveFor(from, to) {
  const map = mapOf(state);
  const k = map.links.findIndex(l => l.from === from && l.to === to);
  return k >= 0 ? linkCurve(map, map.links[k], k) : null;
}

// an item icon flies from the board to the player's card
function flyToCard(pi, icon, from) {
  const card = $('players').children[pi];
  if (!card || REDUCED_MOTION) return;
  const start = renderer.toScreen(from.x, from.y);
  const end = card.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fly';
  el.textContent = icon;
  document.body.appendChild(el);
  const dx = end.left + end.width - 24 - start.x, dy = end.top + end.height / 2 - start.y;
  const anim = el.animate([
    { transform: `translate(${start.x}px, ${start.y}px) scale(.4)`, opacity: 0 },
    { transform: `translate(${start.x}px, ${start.y - 40}px) scale(1.5)`, opacity: 1, offset: 0.25 },
    { transform: `translate(${start.x + dx}px, ${start.y + dy}px) scale(.7)`, opacity: 1 }
  ], { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)' });
  anim.onfinish = () => {
    el.remove();
    card.classList.remove('got');
    void card.offsetWidth;
    card.classList.add('got');
  };
}

const DIRECT = {
  async roll(e) {
    $('dice2').hidden = e.dice.length < 2;
    const dock = e.dice.length > 1 ? Promise.all([dice.roll(e.dice[0]), dice2.roll(e.dice[1])]) : dice.roll(e.dice[0]);
    await Promise.all([dock, renderer.throwDice(e.dice, colour(e.pi))]);
    sfx.dice(e.dice[0]);
    again = false;
    await scene.wait(0.15);
  },
  async move(e) {
    await walkPath(e.pi, e.path, 0.24, 1.1, true);
  },
  async ladder(e) {
    sfx.jump();
    popAt(e.pi, kindName('ladder') + '!');
    const c = curveFor(e.from, e.to), col = fx().trail;
    await scene.cheer(e.pi, 1);
    if (c) await scene.ride(e.pi, c, 1.0, 1.8, { onFrame: v => { renderer.trail(v.x, v.y, col); renderer.trail(v.x, v.y, '#fff'); } });
    else await scene.hop(e.pi, cell(e.to), 0.7, 2);
    const p = cell(e.to);
    renderer.burst(p.x, p.y, ['#FFE27A', '#fff', colour(e.pi).main], 18, 20, 'spark');
    renderer.land(p.x, p.y, fx(), 1.5);
    sfx.home();
  },
  async slide(e) {
    sfx.bad();
    popAt(e.pi, kindName('slide') + '!');
    await scene.shake(e.pi, 0.4, 1.1);
    sfx.slide();
    const c = curveFor(e.from, e.to);
    if (c) await scene.ride(e.pi, c, 1.1, 0.4, { spin: 2 });
    else await scene.hop(e.pi, cell(e.to), 0.8, 0.5);
    renderer.land(cell(e.to).x, cell(e.to).y, fx(), 1.4);
    renderer.bump(0.35);
    scene.dizzy(e.pi, 1.6);
  },
  async portal(e) {
    sfx.warp();
    popAt(e.pi, kindName('portal'));
    const a = cell(e.from), b = cell(e.to);
    const cols = ['#B388FF', '#4DD0E1', '#fff'];
    renderer.swirl(a.x, a.y, cols, true);
    await scene.warp(e.pi, b, () => renderer.swirl(b.x, b.y, cols, false));
    renderer.burst(b.x, b.y, cols, 18, 20, 'spark');
  },
  async trap(e) {
    sfx.bad();
    popAt(e.pi, kindName('trap'));
    toast(S.trapped(who(e.pi).name));
    const p = cell(e.pos);
    renderer.burst(p.x, p.y + 1, fx().land, 10, 8);
    await scene.sink(e.pi, 0.8);
  },
  async boost(e) {
    sfx.whoosh();
    popAt(e.pi, kindName('boost'));
    const col = fx().trail;
    for (let k = 0; k < e.path.length; k++) {
      await scene.hop(e.pi, cell(e.path[k]), 0.13, 0.4, v => renderer.trail(v.x, v.y, col));
    }
  },
  async setback(e) {
    sfx.bad();
    popAt(e.pi, kindName('setback'));
    await scene.shake(e.pi, 0.35);
  },
  async pushed(e) {
    await knockBack(e.pi, e.to);
  },
  async slip(e) {
    sfx.whoosh();
    await knockBack(e.pi, e.to);
  },
  async banana(e) {
    popAt(e.pi, '🍌 ' + S.banana);
    await scene.wait(0.1);
  },
  async item(e) {
    sfx.item();
    const it = ITEM_BY_ID[e.item], p = cell(e.pos);
    renderer.burst(p.x, p.y, ['#FFE27A', '#fff', colour(e.pi).main], 22, 22, 'spark');
    renderer.pop(p.x, p.y, it.icon + ' ' + it.name, colour(e.pi).dark);
    toast(S.gotItem(who(e.pi).name, it.icon + ' ' + it.name));
    flyToCard(e.pi, it.icon, p);
    await scene.cheer(e.pi, 1);
  },
  async again(e) {
    sfx.star();
    const p = cell(e.pos);
    renderer.burst(p.x, p.y, ['#FFE27A', '#FFC21A', '#fff'], 24, 22, 'spark');
    popAt(e.pi, kindName('again'));
    await scene.cheer(e.pi, 1);
  },
  async quake(e) {
    sfx.bump();
    renderer.bump(1.4);
    popAt(e.pi, kindName('quake'));
    toast(S.quake);
    await scene.shakeAll(state.players.map((q, qi) => qi), 0.6, 1.2);
  },
  async kraken(e) {
    sfx.bump();
    renderer.bump(1);
    popAt(e.victim, '🐙 Kraken!');
    toast(S.kraken(who(e.victim).name));
    await scene.shake(e.victim, 0.6, 1.4);
  },
  async shuffle(e) {
    sfx.warp();
    toast(S.shuffle(who(e.pi).name, who(e.qi).name));
    const a = cell(e.a), b = cell(e.b);
    renderer.swirl(a.x, a.y, ['#FF9EDB', '#fff'], true);
    renderer.swirl(b.x, b.y, ['#5EF2FF', '#fff'], true);
    await scene.hopPair(e.pi, b, e.qi, a, 0.9, 3.5);
  },
  async swap(e) {
    sfx.whoosh();
    toast(S.swap(who(e.pi).name, who(e.qi).name));
    await scene.hopPair(e.pi, cell(e.b), e.qi, cell(e.a), 0.9, 3.5);
  },
  async bump(e) {
    const v = visOf(e.qi);
    if (v) {
      renderer.puff(v.x, v.y);
      renderer.burst(v.x, v.y, ['#FFE27A', '#fff', colour(e.pi).main], 16, 26, 'spark');
      renderer.pop(v.x, v.y, '💥 Bump!', colour(e.pi).dark);
    }
    renderer.bump(0.7);
    sfx.bump();
    toast(S.bump(who(e.pi).name, who(e.qi).name));
    await scene.wait(0.12);
  },
  async blocked(e) {
    const v = visOf(e.pi);
    if (v) renderer.burst(v.x, v.y, ['#7FD0FF', '#fff'], 20, 22, 'spark');
    sfx.use();
    popAt(e.pi, '🛡️ Blocked!');
    toast('🛡️ ' + S.blocked(who(e.pi).name));
    await scene.cheer(e.pi, 1);
  },
  async frozen(e) {
    sfx.bad();
    const v = visOf(e.qi);
    if (v) renderer.burst(v.x, v.y, ['#BDEBFF', '#fff', '#7FD0FF'], 24, 18, 'spark');
    popAt(e.qi, '❄️ Frozen!');
    toast(S.frozen(who(e.pi).name, who(e.qi).name));
    await scene.shake(e.qi, 0.5, 0.5);
  },
  async 'banana-drop'(e) {
    sfx.use();
    toast(S.bananaDrop(who(e.pi).name));
    await scene.cheer(e.pi, 1);
  },
  async use(e) {
    sfx.use();
    const it = ITEM_BY_ID[e.item];
    popAt(e.pi, it.icon + ' ' + it.name + '!');
    const v = visOf(e.pi);
    if (v) renderer.burst(v.x, v.y, ['#FFE27A', '#fff'], 14, 18, 'spark');
    await scene.wait(0.3);
  },
  async finish(e) {
    sfx.win();
    const g = cell(mapOf(state).goal);
    renderer.fireworks(g.x, g.y, [colour(e.pi).main, '#fff', '#FFE27A', colour(e.pi).soft], 5);
    toast(S.finish(who(e.pi).name));
    await scene.cheer(e.pi, 3, v => renderer.land(v.x, v.y, fx(), 0.8));
  },
  async skipped(e) {
    sfx.bad();
    toast('💤 ' + S.skipped(who(e.pi).name));
    renderer.showBanner(S.skipBanner(who(e.pi).name), colour(e.pi), who(e.pi).avatar);
    await scene.sink(e.pi, 0.9);
  },
  async 'roll-again'(e) {
    again = true;
    popAt(e.pi, e.six ? S.six : S.rollAgainPop);
    await scene.cheer(e.pi, 1);
  },
  async turn(e) {
    again = false;
    sfx.turn();
    renderer.showBanner(S.turnBanner(who(e.pi).name), colour(e.pi), who(e.pi).avatar);
    await scene.wait(0.35);
  }
};

createInput({
  roll: () => doRoll(),
  item: k => doItem(k),
  help: () => openHelp(),
  escape: () => overlay.close(),
  blocked: () => !canPlay()
});

/* ---------- top buttons ---------- */
function openHelp() {
  if (overlay.isOpen()) return;
  helpScreen(overlay, mapOf(state).def, () => overlay.hide());
}
$('helpBtn').addEventListener('click', openHelp);
$('newBtn').addEventListener('click', () => {
  if (busy) return;
  if (playing && state.phase !== 'over' && !confirm(S.confirmNew)) return;
  playing = false;
  save.game = null;
  persist(save);
  refresh();
  showSetup();
});
const soundBtn = $('soundBtn');
soundBtn.setAttribute('aria-pressed', String(save.sound));
soundBtn.addEventListener('click', () => {
  save.sound = !save.sound;
  setSound(save.sound);
  soundBtn.setAttribute('aria-pressed', String(save.sound));
  persist(save);
  if (save.sound) sfx.click();
});

/* ---------- frame loop ---------- */
let lastT = performance.now(), time = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  time += dt;
  const map = mapOf(state);
  scene.update(dt);
  scene.relax(state, map, dt);
  renderer.frame({ state, map, vis: scene.vis, time, dt, busy: busy || !playing });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('resize', () => renderer.resize());

refresh();
showSetup();
