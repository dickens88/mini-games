// The two player panels beside the board (face, wins, items, take-back,
// clock) and the line above it saying whose turn it is and when the next
// party event comes.

import { MAX_ITEMS } from '../config.js';
import { itemById } from '../data/items.js';
import { palById } from '../data/pals.js';
import { boardById } from '../data/boards.js';
import { drawIcon } from '../render/icons.js';
import { paintHead } from './screens.js';

function paintIcon(cv, id) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 34, h = cv.clientHeight || 34;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  drawIcon(ctx, id, w / 2, h / 2, Math.min(w, h) * 0.46);
}

export function createHud(arena, status, { onSlot, onUndo }) {
  const panels = [0, 1].map(p => arena.querySelector(`[data-panel="${p}"]`));
  const say = status.querySelector('[data-hud="say"]'), party = status.querySelector('[data-hud="party"]');
  const q = (p, k) => panels[p].querySelector(`[data-k="${k}"]`);
  const shown = [{}, {}];
  let pals = ['', ''];

  panels.forEach((el, p) => {
    el.innerHTML = `
      <div class="who">
        <canvas class="face" aria-hidden="true"></canvas>
        <div class="names"><b data-k="name"></b><small data-k="tag"></small></div>
        <span class="wins" data-k="wins"></span>
      </div>
      <div class="flag" data-k="flag"></div>
      <div class="clock" data-k="clock" hidden><i></i></div>
      <div class="items" data-k="items">${Array.from({ length: MAX_ITEMS }, (_, k) => `
        <button type="button" class="slot" data-slot="${k}"><canvas aria-hidden="true"></canvas><span></span><kbd>${k + 1}</kbd></button>`).join('')}
      </div>
      <button type="button" class="undo" data-k="undo">↶ Take back <span></span></button>`;
    el.querySelectorAll('.slot').forEach(b => b.addEventListener('click', () => onSlot(p, Number(b.dataset.slot))));
    q(p, 'undo').addEventListener('click', () => onUndo(p));
  });

  return {
    setup(o) {
      pals = o.pals;
      [0, 1].forEach(p => {
        shown[p] = {};
        q(p, 'name').textContent = palById(pals[p]).name;
        q(p, 'tag').textContent = `Player ${p + 1}`;
        q(p, 'items').hidden = !o.party;
        panels[p].querySelector('.face').dataset.mood = '-';
      });
      arena.classList.toggle('classic', !o.party);
    },

    // o: { d (game shown), wins, to, undos, canUndo, busy, aim: { p, slot } | null }
    update(o) {
      const { d } = o, over = d.winner !== null;
      [0, 1].forEach(p => {
        const el = panels[p], mine = !over && d.turn === p;
        el.classList.toggle('active', mine);
        el.classList.toggle('won', over && d.winner === p);
        const mood = over ? (d.winner === p ? 'happy' : d.winner === 'draw' ? '' : 'sad') : mine ? 'happy' : '';
        const face = el.querySelector('.face');
        if (face.dataset.mood !== mood) { face.dataset.mood = mood; paintHead(face, pals[p], mood || null); }
        q(p, 'wins').innerHTML = Array.from({ length: o.to }, (_, k) => `<i class="${k < o.wins[p] ? 'on' : ''}"></i>`).join('');
        q(p, 'wins').hidden = o.to < 2;
        q(p, 'flag').textContent = over ? (d.winner === p ? 'Winner!' : '') : mine ? (d.usedItem ? 'Now place a stone' : 'Your turn!') : '';

        // pocket
        el.querySelectorAll('.slot').forEach((b, k) => {
          const id = d.items[p][k] || '';
          if (shown[p][k] !== id) {
            shown[p][k] = id;
            const cv = b.querySelector('canvas');
            if (id) paintIcon(cv, id); else cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
            b.querySelector('span').textContent = id ? itemById(id).name : 'empty';
            b.title = id ? itemById(id).help : 'Put a stone on a gift box to get an item';
            if (id) { b.classList.remove('new'); void b.offsetWidth; b.classList.add('new'); }
          }
          b.classList.toggle('full', !!id);
          b.classList.toggle('aiming', !!(o.aim && o.aim.p === p && o.aim.slot === k));
          b.disabled = !id || !mine || o.busy || d.usedItem;
        });

        const u = q(p, 'undo');
        u.querySelector('span').textContent = `(${o.undos[p]})`;
        u.disabled = !(o.canUndo === p);
        u.hidden = over;
      });

      // the line above the board
      if (over) {
        say.innerHTML = d.winner === 'draw' ? '<b>A draw!</b> The board is full.' : `<i class="dot" style="--side:var(--p${d.winner + 1})"></i><span><b>${palById(pals[d.winner]).name}</b> made five in a row!</span>`;
        say.innerHTML += ' <button type="button" class="mini" data-act="result">Continue</button>';
      } else if (o.aim) {
        const it = itemById(d.items[o.aim.p][o.aim.slot]);
        const what = { enemy: 'pick a stone of theirs', mine: 'pick one of your stones', empty: 'pick an empty spot', any: 'pick where to freeze' }[it.target];
        say.innerHTML = `<span><b>${it.name}:</b> ${what}</span> <button type="button" class="mini" data-act="cancel">Cancel</button>`;
      } else {
        say.innerHTML = `<i class="dot" style="--side:var(--p${d.turn + 1})"></i><span><b>${palById(pals[d.turn]).name}</b>’s turn</span>`;
      }
      if (d.party && !over) {
        const every = boardById(d.board).rules.eventEvery;
        party.hidden = false;
        party.innerHTML = `<span class="pips">${Array.from({ length: every }, (_, k) => `<i class="${k < every - d.nextEvent ? 'on' : ''}"></i>`).join('')}</span>`
          + (d.nextEvent === 1 ? '<b>Party event next move!</b>' : `Party event in <b>${d.nextEvent}</b>`);
        party.classList.toggle('soon', d.nextEvent === 1);
      } else party.hidden = true;
    },

    clock(p, frac, secs) {
      [0, 1].forEach(k => {
        const c = q(k, 'clock');
        c.hidden = k !== p || frac === null;
        if (k === p && frac !== null) {
          c.firstElementChild.style.width = `${Math.max(0, frac) * 100}%`;
          c.classList.toggle('low', secs <= 3);
        }
      });
    },

    // the little buttons in the line above the board
    onAct(cb) {
      status.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) cb(b.dataset.act); });
    }
  };
}
