// The cards shown over the board: picking pals and a board, the menu, how to
// play and the end of a game.

import { FORMATS, SIZES, TIMERS, MAX_ITEMS, UNDOS } from '../config.js';
import { PALS, palById } from '../data/pals.js';
import { BOARDS } from '../data/boards.js';
import { ITEMS } from '../data/items.js';
import { EVENTS } from '../core/events.js';
import { drawPalHead } from '../render/pals.js';
import { drawIcon } from '../render/icons.js';
import { paintBoardThumb } from '../render/renderer.js';

function hidpi(cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 48, h = cv.clientHeight || 48;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w, h };
}

export function paintHead(cv, palId, mood) {
  const { ctx, w, h } = hidpi(cv);
  const k = Math.min(w, h) / 76;
  drawPalHead(ctx, palById(palId), w / 2, h * 0.6 - 4 * k, k, mood);
}

function paintIcon(cv, id) {
  const { ctx, w, h } = hidpi(cv);
  drawIcon(ctx, id, w / 2, h / 2, Math.min(w, h) * 0.44);
}

const palButtons = (p, chosen, taken) => PALS.map(pal => `
  <button type="button" class="pal-pick${pal.id === chosen ? ' on' : ''}" data-p="${p}" data-pal="${pal.id}"
    aria-pressed="${pal.id === chosen}" ${pal.id === taken ? 'disabled' : ''} title="${pal.name}">
    <canvas aria-hidden="true"></canvas><span>${pal.name}</span>
  </button>`).join('');

const seg = (attr, label, options, value) => `
  <div class="seg" role="group" aria-label="${label}">${options.map(([v, text]) => `
    <button type="button" data-${attr}="${v}" aria-pressed="${String(v) === String(value)}">${text}</button>`).join('')}
  </div>`;

export function setupScreen(overlay, save, { onStart, onHelp, onChange }) {
  overlay.show(`
    <h2 class="title">Gomoku Party</h2>
    <p>Get <b>five in a row</b> to win — but watch out for bombs, meteors and slippery ice!</p>
    <div class="setup">${[0, 1].map(p => `
      <section class="player-box" style="--side:var(--p${p + 1})">
        <h3><span class="dot"></span>Player ${p + 1}${p === 0 ? ' <small>goes first</small>' : ''}</h3>
        <div class="pal-grid">${palButtons(p, save.pals[p], save.pals[1 - p])}</div>
      </section>`).join('')}
    </div>
    <h3 class="sec">Board</h3>
    <div class="boards">${BOARDS.map(b => `
      <button type="button" class="board-pick${b.id === save.board ? ' on' : ''}" data-board="${b.id}" aria-pressed="${b.id === save.board}">
        <canvas aria-hidden="true"></canvas><b>${b.name}</b><small>${b.blurb}</small>
      </button>`).join('')}
    </div>
    <div class="opts">
      <label>Match ${seg('format', 'Match length', Object.values(FORMATS).map(f => [f.id, f.name]), save.format)}</label>
      <label>Board size ${seg('size', 'Board size', SIZES.map(n => [n, `${n}×${n}`]), save.size)}</label>
      <label>Move timer ${seg('timer', 'Move timer', Object.entries(TIMERS).map(([k, s]) => [k, s ? `${s} sec` : 'Off']), save.timer)}</label>
    </div>
    <div class="toggles">
      <label><input type="checkbox" data-opt="party" ${save.party ? 'checked' : ''}> Party twists (gifts, items, events)</label>
      <label><input type="checkbox" data-opt="hints" ${save.hints ? 'checked' : ''}> Warn me when they can win</label>
    </div>
    <div class="btn-row">
      <button class="cta big" type="button" data-act="start">Play!</button>
      <button class="cta ghost" type="button" data-act="help">How to play</button>
    </div>`, card => {
    card.querySelectorAll('.pal-pick').forEach(b => paintHead(b.querySelector('canvas'), b.dataset.pal));
    card.querySelectorAll('.board-pick').forEach(b => paintBoardThumb(b.querySelector('canvas'), b.dataset.board));

    const refreshPals = () => card.querySelectorAll('.pal-pick').forEach(b => {
      const p = Number(b.dataset.p), on = save.pals[p] === b.dataset.pal;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
      b.disabled = save.pals[1 - p] === b.dataset.pal;
    });
    card.querySelectorAll('.pal-pick').forEach(b => b.addEventListener('click', () => {
      save.pals[Number(b.dataset.p)] = b.dataset.pal;
      refreshPals(); onChange();
    }));
    const pick = (attr, key, num) => card.querySelectorAll(`[data-${attr}]`).forEach(b => b.addEventListener('click', () => {
      save[key] = num ? Number(b.dataset[attr]) : b.dataset[attr];
      card.querySelectorAll(`[data-${attr}]`).forEach(o => {
        o.setAttribute('aria-pressed', o === b);
        o.classList.toggle('on', o === b);
      });
      onChange();
    }));
    pick('board', 'board'); pick('format', 'format'); pick('size', 'size', true); pick('timer', 'timer');
    card.querySelectorAll('[data-opt]').forEach(i => i.addEventListener('change', () => { save[i.dataset.opt] = i.checked; onChange(); }));
    card.querySelector('[data-act="start"]').addEventListener('click', onStart);
    card.querySelector('[data-act="help"]').addEventListener('click', onHelp);
  });
}

export function menuScreen(overlay, { onResume, onRestart, onSetup, onHelp }) {
  overlay.show(`
    <h2>Menu</h2>
    <div class="btn-col">
      <button class="cta" type="button" data-act="resume">Keep playing</button>
      <div class="btn-row">
        <button class="cta ghost" type="button" data-act="restart">Start this game over</button>
        <button class="cta ghost" type="button" data-act="setup">New match</button>
        <button class="cta ghost" type="button" data-act="help">How to play</button>
      </div>
    </div>`, card => {
    const on = { resume: onResume, restart: onRestart, setup: onSetup, help: onHelp };
    card.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => on[b.dataset.act]()));
  }, onResume);
}

export function helpScreen(overlay, onClose) {
  const events = [...new Set(BOARDS.flatMap(b => b.rules.events))];
  overlay.show(`
    <h2>How to play</h2>
    <div class="how">
      <ul>
        <li>Take turns putting a stone on a spot where the lines cross.</li>
        <li>The first to get <b>five in a row</b> — across, down or diagonal — wins!</li>
        <li>With a mouse, click a spot. On a touch screen, tap once to see your stone, tap again to put it down.</li>
        <li>If you misclick, press <b>Take back</b> before the other player moves. You get ${UNDOS} per game.</li>
        <li>A red <b>!</b> means your opponent could win there next move — block it!</li>
      </ul>
      <h3>Party twists</h3>
      <p class="small">Turn these off in the setup for plain five-in-a-row.</p>
      <ul>
        <li>Put a stone on a <b>gift box</b> to get an item. You can hold ${MAX_ITEMS}.</li>
        <li>On your turn, tap an item, then tap where to use it. Then put down your stone as usual. One item per turn.</li>
      </ul>
      <ul class="powers">${ITEMS.map(it => `<li><canvas data-icon="${it.id}" aria-hidden="true"></canvas><span><b>${it.name}</b> ${it.help}</span></li>`).join('')}</ul>
      <p class="small">Every few moves a <b>party event</b> shakes things up. The dots above the board count down to the next one.</p>
      <ul class="powers">${events.map(id => `<li><canvas data-icon="${id}" aria-hidden="true"></canvas><span><b>${EVENTS[id].name.replace('!', '')}</b> ${EVENTS[id].blurb}</span></li>`).join('')}</ul>
      <h3>Boards</h3>
      <ul>
        <li><b>Flower Garden:</b> lots of gift boxes, so lots of items.</li>
        <li><b>Ice Pond:</b> a stone put on ice slides the way the arrows point until it bumps into something or leaves the ice. You'll see where it ends up before you place it.</li>
        <li><b>Volcano:</b> nobody can use the vents, and when they erupt they splash lava that burns stones.</li>
        <li><b>Space Station:</b> put a stone on a portal and a twin appears on the matching portal across the board. Black holes can't be used.</li>
      </ul>
      <p class="small">Esc opens the menu · M turns the sound on and off · arrow keys and Enter work too.</p>
    </div>
    <div class="btn-row"><button class="cta" type="button" data-act="close">Got it!</button></div>`, card => {
    card.querySelectorAll('[data-icon]').forEach(c => paintIcon(c, c.dataset.icon));
    card.querySelector('[data-act="close"]').addEventListener('click', onClose);
  }, onClose);
}

// o: { d, pals, wins, to, matchOver }
export function resultScreen(overlay, o, { onNext, onSetup }) {
  const { d, pals } = o, w = d.winner, st = d.stats;
  const draw = w === 'draw';
  const name = p => palById(pals[p]).name;
  const row = (label, a, b) => (a || b ? `<tr><td>${a}</td><th>${label}</th><td>${b}</td></tr>` : '');
  const title = draw ? 'It’s a draw!' : o.matchOver ? `${name(w)} wins the match!` : `${name(w)} wins this game!`;
  overlay.show(`
    <div class="podium">
      <canvas class="${draw ? 'loser' : 'champ'}" data-p="${draw ? 0 : w}" aria-hidden="true"></canvas>
      <canvas class="loser" data-p="${draw ? 1 : 1 - w}" aria-hidden="true"></canvas>
    </div>
    <h2 class="title">${title}</h2>
    ${o.to > 1 ? `<p class="final"><span class="dot p1"></span><b>${o.wins[0]}</b> – <b>${o.wins[1]}</b><span class="dot p2"></span></p>` : ''}
    <table class="stats">
      <thead><tr><td><span class="dot p1"></span>${name(0)}</td><th></th><td><span class="dot p2"></span>${name(1)}</td></tr></thead>
      <tbody>
        ${row('Stones placed', st.placed[0], st.placed[1])}
        ${row('Gifts grabbed', st.gifts[0], st.gifts[1])}
        ${row('Items used', st.items[0], st.items[1])}
        ${row('Stones lost', st.lost[0], st.lost[1])}
      </tbody>
    </table>
    ${!o.matchOver && !draw ? `<p>${name(1 - w)} goes first next game.</p>` : ''}
    <div class="btn-row">
      <button class="cta" type="button" data-act="next">${o.matchOver ? 'Rematch!' : 'Next game'}</button>
      <button class="cta ghost" type="button" data-act="look">See the board</button>
      <button class="cta ghost" type="button" data-act="setup">Change pals or board</button>
    </div>`, card => {
    card.querySelectorAll('.podium canvas').forEach(cv => {
      const p = Number(cv.dataset.p);
      paintHead(cv, pals[p], draw ? null : p === w ? 'happy' : 'sad');
    });
    card.querySelector('[data-act="next"]').addEventListener('click', onNext);
    card.querySelector('[data-act="setup"]').addEventListener('click', onSetup);
    card.querySelector('[data-act="look"]').addEventListener('click', () => overlay.hide());
  });
}
