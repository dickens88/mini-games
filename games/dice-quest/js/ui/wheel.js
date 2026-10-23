// The prize wheel for treasure cells and comeback spins. The rules have
// already picked the item (so a saved game replays the same); the wheel
// only shows it being won.

import { ITEMS, ITEM_BY_ID } from '../data/items.js';
import { S } from '../strings.js';

const COLOURS = ['#FFD166', '#EF476F', '#06D6A0', '#4CC9F0', '#9B5DE5', '#F78C6B', '#B5E48C'];
const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPIN_TIME = REDUCED_MOTION ? 0.8 : 3.4;
const easeOut = t => 1 - Math.pow(1 - t, 4);

// resolves once the prize has been shown and the card is closed
export function spinWheel(overlay, { title, sub, item, onTick, onWin }) {
  const n = ITEMS.length, seg = 360 / n;
  const target = ITEMS.findIndex(it => it.id === item);
  const stops = ITEMS.map((it, k) => `${COLOURS[k % COLOURS.length]} ${k * seg}deg ${(k + 1) * seg}deg`).join(',');
  const won = ITEM_BY_ID[item];

  return new Promise(done => {
    overlay.show(`
      <h2>${title}</h2>
      ${sub ? `<p>${sub}</p>` : ''}
      <div class="wheel-wrap">
        <div class="wheel" style="background:conic-gradient(${stops})">
          ${ITEMS.map((it, k) => `<span class="wheel-icon" data-k="${k}" style="--a:${k * seg + seg / 2}deg">${it.icon}</span>`).join('')}
        </div>
        <span class="wheel-pointer" aria-hidden="true"></span>
        <button class="wheel-hub" type="button" data-act="spin" aria-label="${S.wheelSpin}">${S.wheelSpin}</button>
      </div>
      <p class="wheel-result" aria-live="polite"></p>
      <div class="btn-row"><button class="cta" type="button" data-act="spin">${S.wheelSpin}</button></div>`, card => {
      const wheel = card.querySelector('.wheel');
      const cta = card.querySelector('.cta');
      let state = 'ready';

      function finish() {
        if (state === 'closed') return;
        state = 'closed';
        overlay.hide();
        done();
      }

      function spin() {
        if (state !== 'ready') return;
        state = 'spinning';
        card.querySelectorAll('[data-act="spin"]').forEach(b => { b.disabled = true; });
        // land the prize's slice under the pointer, a little off-centre so it looks natural
        const jitter = (Math.random() - 0.5) * seg * 0.6;
        const total = 360 * (REDUCED_MOTION ? 1 : 5) - (target * seg + seg / 2) + jitter;
        const t0 = performance.now();
        let lastSlice = 0;
        (function frame(now) {
          const t = Math.min(1, (now - t0) / 1000 / SPIN_TIME);
          const a = total * easeOut(t);
          wheel.style.transform = `rotate(${a}deg)`;
          const slice = Math.floor(a / seg);
          if (slice !== lastSlice) { lastSlice = slice; if (onTick) onTick(); }
          if (t < 1) { requestAnimationFrame(frame); return; }
          state = 'won';
          card.querySelector(`.wheel-icon[data-k="${target}"]`).classList.add('won');
          card.querySelector('.wheel-result').innerHTML = `<b>${won.icon} ${won.name}!</b><small>${won.desc}</small>`;
          card.querySelector('.wheel-hub').textContent = '🎉';
          cta.textContent = S.wheelTake;
          cta.disabled = false;
          cta.focus({ preventScroll: true });
          if (onWin) onWin();
          setTimeout(finish, 2400);
        })(t0);
      }

      card.querySelectorAll('[data-act="spin"]').forEach(b => b.addEventListener('click', () => {
        if (state === 'won') finish();
        else spin();
      }));
    });
  });
}
