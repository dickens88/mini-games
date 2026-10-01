// The cards shown in the overlay: setup, how to play, item targets, winner, results.

import { SEATS, AVATAR_IDS, DEFAULT_AVATARS } from '../config.js';
import { MAPS } from '../data/maps/index.js';
import { ITEMS, ITEM_BY_ID } from '../data/items.js';
import { getMap } from '../core/map.js';
import { drawMapArt } from '../render/board-art.js';
import { S } from '../strings.js';
import { avatarHtml } from '../render/avatars.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const seatStyle = seat => { const c = SEATS[seat]; return `--c:${c.main};--d:${c.dark};--s:${c.soft}`; };

// setup: { map, count, players: [{ name, avatar }] × 4 }
export function setupScreen(overlay, setup, { canResume, onStart, onResume, onMapPreview }) {
  const st = {
    map: setup && setup.map || MAPS[0].id,
    count: setup && setup.count >= 2 && setup.count <= 4 ? setup.count : 2,
    players: [0, 1, 2, 3].map(k => {
      const p = Object.assign({ name: '', avatar: DEFAULT_AVATARS[k] }, setup && setup.players && setup.players[k]);
      if (!AVATAR_IDS.includes(p.avatar)) p.avatar = DEFAULT_AVATARS[k];
      return p;
    })
  };

  function seatRows() {
    return st.players.slice(0, st.count).map((p, seat) => `
      <div class="seat-row" style="${seatStyle(seat)}">
        <button type="button" class="face-btn" data-face="${seat}" aria-label="Change ${SEATS[seat].name}'s character" title="${S.avatarHint}">${avatarHtml(p.avatar)}</button>
        <input type="text" maxlength="12" data-seat="${seat}" value="${esc(p.name)}" placeholder="${SEATS[seat].name}" aria-label="${SEATS[seat].name} player name">
      </div>`).join('');
  }

  overlay.show(`
    <h2>${S.setupTitle}</h2>
    <div class="maps" role="radiogroup" aria-label="Map">
      ${MAPS.map(m => `<button type="button" class="map-card" role="radio" data-map="${m.id}" aria-checked="${m.id === st.map}">
        <canvas width="240" height="240" data-preview="${m.id}" aria-hidden="true"></canvas>
        <b>${m.icon} ${m.name}</b><small>${m.blurb}</small></button>`).join('')}
    </div>
    <div class="seg" role="radiogroup" aria-label="${S.players}">
      ${[2, 3, 4].map(n => `<button type="button" role="radio" data-count="${n}" aria-checked="${n === st.count}">${n} players</button>`).join('')}
    </div>
    <div class="seats">${seatRows()}</div>
    <div class="btn-row">
      <button class="cta" type="button" data-act="start">${S.start}</button>
      ${canResume ? `<button class="cta ghost" type="button" data-act="resume">${S.resume}</button>` : ''}
    </div>`, card => {
    card.querySelectorAll('canvas[data-preview]').forEach(cv => {
      drawMapArt(cv.getContext('2d'), cv.width, getMap(cv.dataset.preview));
    });
    const seats = card.querySelector('.seats');
    const keepNames = () => card.querySelectorAll('input[data-seat]').forEach(inp => { st.players[inp.dataset.seat].name = inp.value.trim(); });
    const bindFaces = () => seats.querySelectorAll('[data-face]').forEach(b => b.addEventListener('click', () => {
      const p = st.players[b.dataset.face];
      const taken = st.players.slice(0, st.count).map(q => q.avatar);
      let k = AVATAR_IDS.indexOf(p.avatar);
      do k = (k + 1) % AVATAR_IDS.length; while (taken.includes(AVATAR_IDS[k]) && AVATAR_IDS[k] !== p.avatar);
      p.avatar = AVATAR_IDS[k];
      b.innerHTML = avatarHtml(p.avatar);
      b.classList.remove('boing');
      void b.offsetWidth;
      b.classList.add('boing');
    }));
    bindFaces();
    card.querySelectorAll('[data-map]').forEach(b => b.addEventListener('click', () => {
      st.map = b.dataset.map;
      card.querySelectorAll('[data-map]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
      onMapPreview(st.map);
    }));
    card.querySelectorAll('[data-count]').forEach(b => b.addEventListener('click', () => {
      keepNames();
      st.count = Number(b.dataset.count);
      card.querySelectorAll('[data-count]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
      seats.innerHTML = seatRows();
      bindFaces();
    }));
    card.querySelector('[data-act="start"]').addEventListener('click', () => {
      keepNames();
      onStart({ map: st.map, count: st.count, players: st.players.map(p => Object.assign({}, p)) });
    });
    const r = card.querySelector('[data-act="resume"]');
    if (r) r.addEventListener('click', onResume);
  });
}

export function helpScreen(overlay, mapDef, onClose) {
  const k = mapDef.kinds;
  const order = ['ladder', 'slide', 'portal', 'boost', 'setback', 'trap', 'box', 'again', 'quake', 'kraken', 'shuffle'];
  overlay.show(`
    <h2>${S.help}</h2>
    <div class="how">
      <p>Everyone starts at the ${esc(mapDef.start.name)}. Take turns rolling the dice and race along the trail — first to reach the ${esc(mapDef.goal.name)} wins! You need the exact number to land on the finish; extra steps bounce you back.</p>
      <ul>
        <li>Roll a <b>6</b> and you roll again.</li>
        <li>Land on another player and you <b>bump</b> them back 2 cells.</li>
      </ul>
      <h3>${mapDef.icon} ${esc(mapDef.name)}</h3>
      <ul class="cells">
        ${order.filter(id => k[id]).map(id => `<li><span class="ico">${k[id].icon}</span><b>${esc(k[id].name)}</b> — ${esc(k[id].desc)}</li>`).join('')}
      </ul>
      <h3>Items</h3>
      <ul class="cells">
        ${ITEMS.map(it => `<li><span class="ico">${it.icon}</span><b>${it.name}</b> — ${it.desc}</li>`).join('')}
      </ul>
      <p class="small">Animal pictures from <a href="https://ipaslogo.com/" target="_blank" rel="noopener">ipaslogo.com</a>.</p>
      <p class="small">Use items before you roll. You can carry two. Whoever is last finds the best ones more often.</p>
    </div>
    <div class="btn-row"><button class="cta" type="button" data-act="close">${S.close}</button></div>`,
  card => card.querySelector('[data-act="close"]').addEventListener('click', onClose), onClose);
}

// who to aim a Swap / Freeze at, or which face to roll with the Golden die
export function targetScreen(overlay, state, itemId, choices, { onPick, onCancel }) {
  const it = ITEM_BY_ID[itemId];
  const number = it.target === 'number';
  const body = number
    ? `<div class="faces">${[1, 2, 3, 4, 5, 6].map(n => `<button type="button" class="face-pick" data-pick="${n}">${n}</button>`).join('')}</div>`
    : `<div class="targets">${choices.map(qi => {
      const q = state.players[qi];
      return `<button type="button" class="target" data-pick="${qi}" style="${seatStyle(q.seat)}"><span class="face">${avatarHtml(q.avatar)}</span><b>${esc(q.name)}</b><small>cell ${q.pos}${q.shield ? ' · 🛡️' : ''}</small></button>`;
    }).join('')}</div>`;
  overlay.show(`
    <h2>${it.icon} ${number ? S.pickNumber : S.pickPlayer(it.name)}</h2>
    ${body}
    <div class="btn-row"><button class="cta ghost" type="button" data-act="cancel">${S.cancel}</button></div>`, card => {
    card.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => onPick(Number(b.dataset.pick))));
    card.querySelector('[data-act="cancel"]').addEventListener('click', onCancel);
  }, onCancel);
}

export function winnerScreen(overlay, state, pi, { onKeep, onEnd }) {
  const pl = state.players[pi];
  overlay.show(`
    <div class="trophy">${avatarHtml(pl.avatar)}</div>
    <h2 style="color:${SEATS[pl.seat].dark}">🏆 ${esc(S.wins(pl.name))}</h2>
    <p>${S.winsMsg}</p>
    <div class="btn-row">
      <button class="cta" type="button" data-act="keep">${S.keepRacing}</button>
      <button class="cta ghost" type="button" data-act="end">${S.results}</button>
    </div>`, card => {
    card.querySelector('[data-act="keep"]').addEventListener('click', onKeep);
    card.querySelector('[data-act="end"]').addEventListener('click', onEnd);
  });
}

export function resultsScreen(overlay, state, { onRematch, onSetup }) {
  const rows = state.ranks.map((pi, k) => {
    const pl = state.players[pi];
    return `<li style="${seatStyle(pl.seat)}">
      <span class="place">${['🥇', '🥈', '🥉', '🎖️'][k]}</span>
      <span class="face">${avatarHtml(pl.avatar)}</span>
      <span class="who"><b>${esc(pl.name)}</b><small>${S.statLine(pl.stats)}</small></span>
    </li>`;
  }).join('');
  overlay.show(`
    <h2>${S.results}</h2>
    <ol class="podium">${rows}</ol>
    <div class="btn-row">
      <button class="cta" type="button" data-act="again">${S.rematch}</button>
      <button class="cta ghost" type="button" data-act="setup">${S.newGame}</button>
    </div>`, card => {
    card.querySelector('[data-act="again"]').addEventListener('click', onRematch);
    card.querySelector('[data-act="setup"]').addEventListener('click', onSetup);
  });
}
