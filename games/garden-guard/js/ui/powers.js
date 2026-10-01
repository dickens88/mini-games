// The power buttons next to the wave button. Each shows its picture, a
// recharge sweep and its key; pressing one starts aiming (main.js decides
// what a tap on the map then does).

import { POWERS } from '../data/registry.js';
import { powerIcon } from '../render/sprites/power-sprites.js';
import { S } from '../strings.js';

export function createPowers(root, { onPick }) {
  let buttons = [];
  let levelKey = '';

  function build(state) {
    root.textContent = '';
    buttons = Object.keys(state.powerCd).map(id => {
      const def = POWERS[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'power';
      b.title = `${def.name} (${def.key.toUpperCase()}) — ${def.blurb}`;
      const key = document.createElement('kbd'); key.textContent = def.key.toUpperCase();
      b.append(powerIcon(id), key);
      b.addEventListener('click', () => onPick(id));
      root.append(b);
      return { id, b, def, shown: '' };
    });
    root.hidden = !buttons.length;
  }

  return {
    update(state, aim) {
      const key = state.level.id + ':' + Object.keys(state.powerCd).join();
      if (key !== levelKey) { levelKey = key; build(state); }
      for (const it of buttons) {
        const cd = state.powerCd[it.id] || 0;
        const p = cd > 0 ? cd / it.def.cooldown : 0;
        const look = `${p.toFixed(3)}|${aim === it.id}|${!!state.result}`;
        if (look === it.shown) continue;
        it.shown = look;
        it.b.style.setProperty('--cd', p);
        it.b.classList.toggle('charging', p > 0);
        it.b.disabled = p > 0 || !!state.result;
        it.b.setAttribute('aria-pressed', String(aim === it.id));
        it.b.setAttribute('aria-label', `${it.def.name}: ${p > 0 ? Math.ceil(cd) + 's' : S.ready}`);
      }
    },
    reset() { levelKey = ''; }
  };
}
