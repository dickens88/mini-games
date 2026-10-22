// Gomoku Party: wires the rules, the drawing, the panels and the cards
// together. The real game (g) changes at once when someone moves; the board
// on screen (view.d) is a copy that catches up one animation at a time.

import { FORMATS, TIMERS, UNDOS, SIDE } from './config.js';
import { itemById } from './data/items.js';
import { newGame, place, useItem, targets, canUseItems, randomSpot } from './core/game.js';
import { open, solid, winningSpots, DIRS } from './core/board.js';
import { EVENTS, runEvent } from './core/events.js';
import { render, layout, W } from './render/renderer.js';
import { THEMES, PORTAL } from './render/themes.js';
import { drawIcon } from './render/icons.js';
import { createFx, updateFx, burst, confetti, ring, word, fly } from './render/fx.js';
import { palById } from './data/pals.js';
import { createOverlay } from './ui/overlay.js';
import { createHud } from './ui/hud.js';
import { createInput } from './ui/input.js';
import { setupScreen, menuScreen, helpScreen, resultScreen } from './ui/screens.js';
import { setSound, sfx } from './audio.js';
import { load, persist } from './save.js';

const save = load();
setSound(save.sound);

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const overlay = createOverlay(document.getElementById('overlay'));
const banner = document.getElementById('banner');
const soundBtn = document.getElementById('soundBtn');
const clone = o => structuredClone(o);

let g = null;            // the game being played (null behind the setup card)
let match = null;        // { wins, to, pals }
let turnSnap = null;     // the game as it was when this turn started
let undoable = null;     // { by, snap }: the last turn, while it can still be taken back
let undos = [UNDOS, UNDOS];
let aim = null;          // { p, slot }: an item being aimed
let busy = false, queue = [], playId = 0;
let clock = 0, lastTick = 0;
let hoverAt = -1;
let resultTimer = 0;

const view = {
  scale: 1, t: 0, fx: createFx(), d: null, L: layout(save.size), pals: save.pals, theme: save.board,
  ghostAt: -1, pending: -1, aim: null, aimTargets: new Set(), hints: [],
  pops: new Map(), hide: new Set(), moving: [], over: 0, hot: 0
};

const hud = createHud(document.getElementById('arena'), document.getElementById('status'), {
  onSlot: (p, slot) => pickItem(p, slot),
  onUndo: p => takeBack(p)
});
hud.onAct(act => {
  if (act === 'cancel') cancelAim();
  else if (act === 'result') showResult();
});

const input = createInput(canvas, (fx, fy) => view.L.hit(fx * W, fy * W), {
  onHover: (i, pending) => { hoverAt = i; view.pending = pending; },
  onPick: i => pick(i)
});

// ---------- canvas size ----------

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || W;
  canvas.width = canvas.height = Math.round(w * dpr);
  view.scale = canvas.width / W;
}
new ResizeObserver(resize).observe(canvas);
resize();

function applyTheme(board) {
  const th = THEMES[board];
  document.documentElement.style.setProperty('--top', th.page[0]);
  document.documentElement.style.setProperty('--bottom', th.page[1]);
  document.body.classList.toggle('dark', th.dark);
  view.theme = board;
}

// ---------- matches and games ----------

function startMatch() {
  match = { wins: [0, 0], to: FORMATS[save.format].to, pals: save.pals.slice() };
  startGame(0);
}

function startGame(first) {
  clearTimeout(resultTimer);
  playId++;
  g = newGame({ size: save.size, board: save.board, party: save.party, first, seed: (Math.random() * 2 ** 31) | 0 });
  turnSnap = clone(g);
  undoable = null;
  undos = [UNDOS, UNDOS];
  aim = null; busy = false; queue = [];
  Object.assign(view, { d: clone(g), L: layout(g.n), pals: match.pals, over: 0, hot: 0, moving: [], fx: createFx() });
  view.pops.clear(); view.hide.clear();
  applyTheme(g.board);
  hud.setup({ pals: match.pals, party: g.party });
  document.body.classList.add('playing');
  hideBanner();
  overlay.hide();
  input.clear();
  resetClock();
  refresh();
}

function showSetup() {
  clearTimeout(resultTimer);
  playId++;
  g = null; match = null; aim = null; busy = false;
  document.body.classList.remove('playing');
  hideBanner();
  preview();
  setupScreen(overlay, save, {
    onStart: () => { sfx.click(); persist(save); startMatch(); },
    onHelp: () => helpScreen(overlay, showSetup),
    onChange: () => { sfx.click(); persist(save); preview(); }
  });
}

// behind the setup card: an empty board of the chosen kind
function preview() {
  const d = newGame({ size: save.size, board: save.board, party: save.party, first: 0, seed: 20261022 });
  Object.assign(view, { d, L: layout(d.n), pals: save.pals, over: 0, hints: [], aim: null, moving: [] });
  view.pops.clear(); view.hide.clear();
  applyTheme(save.board);
}

function showMenu() {
  if (!g) return;
  cancelAim();
  menuScreen(overlay, {
    onResume: () => overlay.hide(),
    onRestart: () => startGame(g.first),
    onSetup: showSetup,
    onHelp: () => helpScreen(overlay, showMenu)
  });
}

function finish() {
  const w = g.winner;
  if (w !== 'draw') match.wins[w]++;
  hud.clock(0, null);
  refresh();
  resultTimer = setTimeout(showResult, w === 'draw' ? 900 : 2200);
}

function showResult() {
  clearTimeout(resultTimer);
  if (!g || g.winner === null) return;
  const w = g.winner, matchOver = w !== 'draw' && match.wins[w] >= match.to;
  resultScreen(overlay, { d: g, pals: match.pals, wins: match.wins, to: match.to, matchOver }, {
    onNext: () => {
      sfx.click();
      // whoever lost goes first next time
      const first = w === 'draw' ? 1 - g.first : 1 - w;
      if (matchOver) { match.wins = [0, 0]; }
      startGame(first);
    },
    onSetup: showSetup
  });
}

// ---------- turns ----------

const canPlay = () => g && g.winner === null && !busy && !overlay.isOpen();

function canUndo() {
  if (!g || busy || g.winner !== null || !undoable || g.usedItem) return -1;
  return g.turn !== undoable.by && undos[undoable.by] > 0 ? undoable.by : -1;
}

// after an action: remember the finished turn so it can be taken back, then animate
function commit(ev, p) {
  if (g.turn !== p || g.winner !== null) {
    undoable = g.winner === null && g.turn !== p ? { by: p, snap: turnSnap } : null;
    turnSnap = clone(g);
  }
  play(ev);
}

function pick(i) {
  if (!canPlay()) return;
  if (aim) {
    const p = g.turn, ev = useItem(g, aim.slot, i);
    if (!ev) return;
    aim = null;
    commit(ev, p);
    return;
  }
  if (!open(g, i, g.turn)) return;
  const p = g.turn, ev = place(g, i);
  if (ev) commit(ev, p);
}

function pickItem(p, slot) {
  if (!canPlay() || p !== g.turn || !canUseItems(g) || !g.items[p][slot]) return;
  if (aim && aim.slot === slot) { cancelAim(); return; }
  const id = g.items[p][slot], spots = targets(g, id);
  if (!spots.length) {
    word(view.fx, W / 2, W / 2, `No place to use ${itemById(id).name}`, '#3B2340', 28);
    sfx.full();
    return;
  }
  aim = { p, slot };
  view.aimTargets = new Set(spots);
  sfx.pick();
  refresh();
}

function cancelAim() {
  if (!aim) return;
  aim = null;
  refresh();
}

function takeBack(p) {
  if (canUndo() !== p) return;
  undos[p]--;
  g = clone(undoable.snap);
  undoable = null;
  turnSnap = clone(g);
  aim = null;
  view.d = clone(g);
  view.pops.clear();
  input.clear();
  sfx.undo();
  resetClock();
  refresh();
}

function resetClock() {
  clock = TIMERS[save.timer];
  lastTick = Math.ceil(clock);
}

function timeUp() {
  aim = null;
  const i = randomSpot(g);
  if (i < 0) return;
  const p = g.turn;
  word(view.fx, ...view.L.pos(i).map((v, k) => v - k * view.L.cell * 0.8), 'Too slow!', '#FF3B3B', 26);
  commit(place(g, i), p);
}

function refresh() {
  const d = view.d;
  view.aim = aim && g ? itemById(g.items[aim.p][aim.slot]) : null;
  view.hints = save.hints && g && !busy && g.winner === null ? winningSpots(g, 1 - g.turn) : [];
  if (g) hud.update({ d, wins: match.wins, to: match.to, undos, canUndo: canUndo(), busy, aim });
}

// ---------- playing back what happened ----------

const wait = ms => new Promise(r => setTimeout(r, ms));

function play(ev) {
  queue.push(...ev);
  if (!busy) run();
}

async function run() {
  const id = playId;
  busy = true;
  input.clear();
  refresh();
  while (queue.length) {
    await show(queue.shift());
    if (id !== playId) return;
  }
  busy = false;
  view.d = clone(g);
  view.hide.clear();
  view.moving = [];
  view.hot = 0;
  resetClock();
  refresh();
  if (g.winner !== null) finish();
}

const pos = i => view.L.pos(i);
const cell = () => view.L.cell;
const name = p => palById(view.pals[p]).name;

function showBanner(icon, title, text, ms) {
  banner.innerHTML = `<canvas aria-hidden="true"></canvas><div><b>${title}</b><small>${text}</small></div>`;
  banner.hidden = false;
  banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
  const cv = banner.querySelector('canvas'), dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = cv.height = 56 * dpr;
  const c2 = cv.getContext('2d');
  c2.scale(dpr, dpr);
  drawIcon(c2, icon, 28, 28, 25);
  clearTimeout(showBanner.t);
  showBanner.t = setTimeout(hideBanner, ms);
}
function hideBanner() { banner.hidden = true; banner.classList.remove('show'); }

// drops something from above onto spot i; resolves when it lands
function drop(i, icon, size, ms = 330) {
  const [x, y] = pos(i);
  fly(view.fx, { kind: 'drop', icon, x1: x, y1: y, height: cell() * 3, size, dur: ms / 1000 });
  return wait(ms);
}

async function show(e) {
  const d = view.d, fx = view.fx, c = cell();
  switch (e.type) {
    case 'place': {
      if (e.path.length > 1) {
        view.moving = [{ p: e.p, pts: e.path.map(pos), start: view.t, dur: 0.08 * e.path.length + 0.08 }];
        sfx.place(e.p); sfx.slide();
        await wait(80 * e.path.length + 80);
        view.moving = [];
        burst(fx, ...pos(e.to), ['#fff', '#C8F0FF'], 10, 120, 4, { kind: 'shard' });
      } else sfx.place(e.p);
      d.stone[e.to] = e.p; d.last = e.to;
      view.pops.set(e.to, view.t);
      burst(fx, ...pos(e.to), ['rgba(255,255,255,.9)'], 6, 90, 3, { g: 0, life: 0.35 });
      return wait(200);
    }
    case 'twin': {
      ring(fx, ...pos(e.from), PORTAL[d.terrain[e.from].pair], c, 0.5);
      sfx.twin();
      await wait(180);
      d.stone[e.at] = e.p;
      view.pops.set(e.at, view.t);
      ring(fx, ...pos(e.at), PORTAL[d.terrain[e.at].pair], c * 1.2, 0.5);
      burst(fx, ...pos(e.at), ['#fff', PORTAL[d.terrain[e.at].pair]], 14, 160, 4, { g: 0 });
      word(fx, pos(e.at)[0], pos(e.at)[1] - c * 0.8, 'Twin!', PORTAL[d.terrain[e.at].pair], 26);
      return wait(380);
    }
    case 'gift': {
      d.gift[e.at] = false;
      const [x, y] = pos(e.at);
      burst(fx, x, y, ['#FF6B8E', '#FFD23F', '#fff'], 18, 200, 5, { kind: 'paper', g: 300, up: 80 });
      if (e.item) {
        d.items[e.p].push(e.item);
        word(fx, x, y - c * 0.8, `+ ${itemById(e.item).name}!`, itemById(e.item).color, 28);
        sfx.gift();
      } else {
        word(fx, x, y - c * 0.8, 'Pockets full!', '#7A6585', 24);
        sfx.full();
      }
      refresh();
      return wait(500);
    }
    case 'use': {
      const k = d.items[e.p].indexOf(e.item);
      if (k >= 0) d.items[e.p].splice(k, 1);
      d.usedItem = true;
      refresh();
      return;
    }
    case 'bomb': {
      sfx.fuse();
      await drop(e.at, 'bomb', c * 0.42, 360);
      d.stone[e.at] = -1; d.block[e.at] = 2; d.blockKind[e.at] = 'crater'; d.gift[e.at] = false;
      const [x, y] = pos(e.at);
      burst(fx, x, y, ['#FFD23F', '#FF8A3D', '#FF4D2E'], 26, 320, 6);
      burst(fx, x, y, ['#6E6170', '#8F8291'], 10, 60, 10, { kind: 'smoke', g: -40, life: 1 });
      ring(fx, x, y, '#FF8A3D', c * 1.6, 0.45, 8);
      word(fx, x, y - c * 0.9, 'Boom!', '#FF4D2E', 34);
      fx.shake = 0.7;
      sfx.bomb();
      return wait(550);
    }
    case 'rock': {
      await drop(e.at, 'rockShape', c * 0.5, 330);
      d.rock[e.at] = true;
      burst(fx, ...pos(e.at), ['#C9BFB6', '#8F857D'], 12, 140, 4);
      fx.shake = 0.35;
      sfx.rock();
      return wait(300);
    }
    case 'paint': {
      d.stone[e.at] = e.p;
      view.pops.set(e.at, view.t);
      const [x, y] = pos(e.at);
      burst(fx, x, y, ['#B45CFF', '#D9A6FF', SIDE[e.p]], 22, 240, 6);
      word(fx, x, y - c * 0.9, 'Splat!', '#B45CFF', 30);
      sfx.paint();
      return wait(520);
    }
    case 'shield': {
      d.shield[e.at] = true;
      ring(fx, ...pos(e.at), '#2EC4B6', c, 0.5, 5);
      sfx.shield();
      return wait(420);
    }
    case 'freeze': {
      for (const j of e.cells) { d.frost[j] = 2; d.frostFor[j] = 1 - e.p; }
      burst(fx, ...pos(e.at), ['#fff', '#BDEBFF', '#5BC8FF'], 24, 220, 5, { kind: 'shard', g: 100 });
      word(fx, pos(e.at)[0], pos(e.at)[1] - c * 1.4, 'Brrr!', '#2C9AD6', 28);
      sfx.freeze();
      return wait(500);
    }
    case 'win': {
      d.winner = e.p; d.line = e.line;
      view.over = view.t;
      confetti(fx, W);
      sfx.win();
      refresh();
      return wait(300);
    }
    case 'draw': {
      d.winner = 'draw';
      sfx.draw();
      return;
    }
    case 'turn': {
      d.turn = e.p; d.usedItem = false;
      d.nextEvent = g.nextEvent;
      refresh();
      return;
    }
    case 'skip': {
      showBanner('freeze', `${name(e.p)} is frozen out!`, 'Nowhere to go — they skip this turn.', 1500);
      sfx.freeze();
      return wait(1500);
    }
    case 'gifts': {
      for (const j of e.cells) {
        drop(j, 'gift', c * 0.34, 300).then(() => { d.gift[j] = true; sfx.pop(); });
        await wait(e.quiet ? 0 : 150);
      }
      return wait(350);
    }
    case 'event': {
      const ev = EVENTS[e.id];
      showBanner(e.id, ev.name, ev.blurb, 1700);
      sfx.fanfare();
      return wait(1300);
    }
    case 'meteor': {
      const [x, y] = pos(e.at);
      fly(fx, { kind: 'meteor', x0: x + W * 0.55, y0: -c * 2, x1: x, y1: y, size: c * 0.9, dur: 0.65 });
      sfx.meteor();
      await wait(650);
      for (const j of e.hit) d.stone[j] = -1;
      for (const j of e.cells) {
        if (solid(d, j)) continue;
        d.gift[j] = false;
        if (d.stone[j] < 0) { d.block[j] = 2; d.blockKind[j] = 'crater'; }
      }
      burst(fx, x, y, ['#FFD23F', '#FF8A3D', '#8E6A55'], 36, 380, 7);
      burst(fx, x, y, ['#7D7080', '#9C90A0'], 14, 90, 14, { kind: 'smoke', g: -30, life: 1.2 });
      ring(fx, x, y, '#FFB23F', c * 2.4, 0.6, 10);
      if (e.hit.length) word(fx, x, y - c * 1.2, e.hit.length > 1 ? `Crash! −${e.hit.length}` : 'Crash!', '#FF6A3D', 32);
      fx.shake = 1;
      return wait(650);
    }
    case 'lightning': {
      const [x, y] = pos(e.at), pts = [];
      for (let k = 0; k <= 8; k++) pts.push([x + (k === 8 ? 0 : (Math.random() - 0.5) * c * 1.4), -20 + (y + 20) * k / 8]);
      fly(fx, { kind: 'bolt', points: pts, dur: 0.18, linger: 0.3 });
      sfx.zap();
      await wait(200);
      ring(fx, x, y, '#FFE45C', c * 1.6, 0.4, 8);
      if (e.hit >= 0) {
        d.stone[e.hit] = -1;
        burst(fx, x, y, ['#FFF6C2', '#FFD23F', '#fff'], 24, 300, 5);
        word(fx, x, y - c * 0.9, 'Zap!', '#E0A400', 32);
      } else word(fx, x, y - c * 0.9, 'Shielded!', '#2EC4B6', 28);
      fx.shake = 0.45;
      return wait(600);
    }
    case 'rocks': {
      for (const j of e.cells) {
        drop(j, 'rockShape', c * 0.5, 320).then(() => {
          d.rock[j] = true; fx.shake = Math.max(fx.shake, 0.3); sfx.rock();
          burst(fx, ...pos(j), ['#C9BFB6', '#8F857D'], 10, 130, 4);
        });
        await wait(170);
      }
      return wait(450);
    }
    case 'lucky': {
      [0, 1].forEach(p => { if (e.got[p]) d.items[p].push(e.got[p]); });
      sfx.gift();
      refresh();
      return wait(500);
    }
    case 'frost': {
      for (const j of e.cells) { d.frost[j] = 2; d.frostFor[j] = 2; }
      for (const j of e.cells.filter((_, k) => k % 3 === 0)) burst(fx, ...pos(j), ['#fff', '#BDEBFF'], 6, 120, 4, { kind: 'shard', g: 60 });
      sfx.freeze();
      return wait(600);
    }
    case 'snowball': {
      const [dx, dy] = DIRS[e.dir], first = pos(e.path[0]);
      const pts = [[first[0] - dx * c * 1.5, first[1] - dy * c * 1.5], ...e.path.map(pos)];
      if (e.hit < 0) { const l = pts[pts.length - 1]; pts.push([l[0] + dx * c * 1.5, l[1] + dy * c * 1.5]); }
      const ms = 60 * pts.length + 100;
      fly(fx, { kind: 'snowball', points: pts, size: c * 0.5, dur: ms / 1000, linger: 0.2, spin: dx + dy });
      sfx.roll();
      await wait(ms);
      const [x, y] = pts[pts.length - 1];
      burst(fx, x, y, ['#fff', '#DCEBF7'], 22, 240, 6);
      if (e.knocked) {
        d.stone[e.hit] = -1;
        word(fx, x, y - c * 0.9, 'Bonk!', '#2C9AD6', 32);
        fx.shake = 0.4;
      } else if (e.hit >= 0 && d.stone[e.hit] >= 0) word(fx, x, y - c * 0.9, 'Shielded!', '#2EC4B6', 28);
      return wait(400);
    }
    case 'eruption': {
      view.hot = 0.6;
      fx.shake = 0.6;
      sfx.rumble();
      await wait(450);
      for (const b of e.blobs) {
        const [x0, y0] = pos(b.from), [x1, y1] = pos(b.at);
        fly(fx, { kind: 'blob', x0, y0: y0 - c * 0.3, x1, y1, arc: c * 2, size: c * 0.22, dur: 0.55 });
      }
      sfx.lava();
      await wait(550);
      for (const b of e.blobs) {
        const [x, y] = pos(b.at);
        if (b.hit) { d.stone[b.at] = -1; word(fx, x, y - c * 0.8, 'Sizzle!', '#FF6A3D', 26); }
        if (d.stone[b.at] < 0) { d.block[b.at] = 3; d.blockKind[b.at] = 'lava'; d.gift[b.at] = false; }
        burst(fx, x, y, ['#FFD23F', '#FF8A3D', '#D9381E'], 16, 200, 5);
      }
      view.hot = 0;
      return wait(500);
    }
  }
}

// ---------- the loop ----------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  view.t += dt;
  updateFx(view.fx, dt);

  if (g && canPlay() && TIMERS[save.timer]) {
    clock -= dt;
    const secs = Math.ceil(clock);
    if (secs < lastTick) { lastTick = secs; if (secs <= 3 && secs > 0) sfx.tick(); }
    hud.clock(g.turn, clock / TIMERS[save.timer], secs);
    if (clock <= 0) timeUp();
  } else if (g && g.winner !== null) hud.clock(0, null);

  // the see-through stone only where it could really go
  const live = g && canPlay();
  view.ghostAt = live && hoverAt >= 0 && (aim ? view.aimTargets.has(hoverAt) : open(g, hoverAt, g.turn)) ? hoverAt : -1;
  if (view.ghostAt < 0) view.pending = -1;
  canvas.style.cursor = view.ghostAt >= 0 ? 'pointer' : 'default';

  if (view.d) {
    ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    ctx.clearRect(0, 0, W, W);
    render(ctx, view);
  }
  requestAnimationFrame(frame);
}

// ---------- buttons and keys ----------

document.getElementById('helpBtn').addEventListener('click', () => {
  cancelAim();
  helpScreen(overlay, () => (g ? (g.winner !== null ? showResult() : overlay.hide()) : showSetup()));
});
document.getElementById('menuBtn').addEventListener('click', () => (g ? showMenu() : showSetup()));
function setSoundOn(on) {
  save.sound = on; setSound(on); persist(save);
  soundBtn.setAttribute('aria-pressed', on);
}
soundBtn.addEventListener('click', () => setSoundOn(!save.sound));
soundBtn.setAttribute('aria-pressed', save.sound);

addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'Escape') {
    if (aim) cancelAim();
    else if (overlay.isOpen()) overlay.close();
    else showMenu();
    return;
  }
  if (e.code === 'KeyM') { setSoundOn(!save.sound); return; }
  if (e.code === 'KeyH' && !overlay.isOpen()) { document.getElementById('helpBtn').click(); return; }
  if (!g || overlay.isOpen()) return;
  if ((e.code === 'Enter' || e.code === 'Space') && e.target.closest && e.target.closest('button')) return;
  if (e.code === 'Digit1' || e.code === 'Digit2') pickItem(g.turn, Number(e.code.slice(-1)) - 1);
  else if (e.code === 'KeyU') takeBack(canUndo());
  else if (canPlay() && input.key(e.code, g.n)) e.preventDefault();
});

// for automated checks: ?debug lets the test tools look at and steer the game
if (/[?&]debug\b/.test(location.search)) {
  window.gomoku = {
    get game() { return g; }, get busy() { return busy; },
    pick, pickItem, takeBack,
    give(p, id) { g.items[p].push(id); view.d = clone(g); turnSnap = clone(g); refresh(); },
    event(id) { const ev = []; runEvent(g, id, ev); view.d.nextEvent = g.nextEvent; play(ev); }
  };
}

showSetup();
requestAnimationFrame(frame);
