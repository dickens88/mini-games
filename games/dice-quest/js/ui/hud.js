// The player cards, the prompt line, the dice and the item buttons.

import { SEATS } from '../config.js';
import { mapOf } from '../core/rules.js';
import { usableSlots } from '../core/items.js';
import { ITEM_BY_ID } from '../data/items.js';
import { S } from '../strings.js';
import { avatarHtml } from '../render/avatars.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createHud(els, on) {
  els.items.addEventListener('click', e => {
    const b = e.target.closest('button[data-slot]');
    if (b && !b.disabled) on.item(Number(b.dataset.slot));
  });
  els.dice.addEventListener('click', () => on.roll());

  function render(state, busy, again) {
    const goal = mapOf(state).goal;
    els.players.dataset.n = state.players.length;
    els.players.innerHTML = state.players.map((pl, pi) => {
      const c = SEATS[pl.seat];
      const active = pi === state.turn && state.phase !== 'over';
      const pct = Math.round(pl.pos / goal * 100);
      const items = pl.items.map(id => `<span title="${esc(ITEM_BY_ID[id].name)}">${ITEM_BY_ID[id].icon}</span>`).join('');
      const badges = (pl.shield ? '<span title="Shield">🛡️</span>' : '') + (pl.skip ? '<span title="Misses a turn">💤</span>' : '');
      return `<div class="chip${active ? ' active' : ''}${pl.rank ? ' done' : ''}" style="--c:${c.main};--d:${c.dark};--s:${c.soft}">
        <span class="chip-face" aria-hidden="true">${avatarHtml(pl.avatar)}</span>
        <span class="chip-main">
          <span class="chip-top"><b>${pl.rank ? S.place[pl.rank - 1] + ' · ' : ''}${esc(pl.name)}</b>${badges}</span>
          <span class="bar" role="img" aria-label="${pl.pos} of ${goal}"><i style="width:${pct}%"></i></span>
          <span class="chip-items">${items}</span>
        </span>
      </div>`;
    }).join('');

    const pl = state.players[state.turn], c = SEATS[pl.seat];
    els.dock.style.setProperty('--c', c.main);
    els.dock.style.setProperty('--d', c.dark);
    els.dock.style.setProperty('--s', c.soft);
    const over = state.phase === 'over';
    const usable = usableSlots(state);

    els.dice.disabled = busy || over;
    els.dice.classList.toggle('ready', !els.dice.disabled);

    if (!busy && !over) {
      els.msg.textContent = again ? S.rollAgain(pl.name) : S.rollPrompt(pl.name);
      els.sub.textContent = state.double ? S.armedDouble : state.golden ? S.armedGolden(state.golden) : usable.some(Boolean) ? S.itemHint : '';
    }
    if (over) { els.msg.textContent = ''; els.sub.textContent = ''; }

    els.items.innerHTML = pl.items.map((id, k) => {
      const it = ITEM_BY_ID[id];
      const ok = !busy && usable[k];
      return `<button class="item" type="button" data-slot="${k}" ${ok ? '' : 'disabled'} title="${esc(it.desc)}">
        <span class="ico" aria-hidden="true">${it.icon}</span><span class="txt"><b>${esc(it.name)}</b><small>${esc(it.desc)}</small></span><kbd>${k ? 'W' : 'Q'}</kbd></button>`;
    }).join('');
    els.items.hidden = !pl.items.length || over;
  }

  return { render };
}
