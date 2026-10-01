// The dock panel shown when an empty pad is chosen: one card per tower.

import { TOWERS } from '../data/registry.js';
import { towerIcon } from '../render/sprites/tower-sprites.js';
import { S } from '../strings.js';
import { closeButton } from './modals.js';

export function buildPanel(state, { onBuild, onPreview, onClose }) {
  const root = document.createElement('div');
  root.style.display = 'contents';

  const head = document.createElement('div');
  head.className = 'panel-head';
  const h = document.createElement('h3');
  h.textContent = S.buildTitle;
  head.append(h, closeButton(onClose));

  const list = document.createElement('div');
  list.className = 'build-list';
  const blurb = document.createElement('p');
  blurb.className = 'build-blurb';

  const cards = state.level.towers.map(type => {
    const def = TOWERS[type];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'build-card';
    const name = document.createElement('b'); name.textContent = def.name;
    const cost = document.createElement('small'); cost.textContent = '● ' + def.cost;
    const key = document.createElement('kbd'); key.textContent = def.key;
    b.append(towerIcon(type), name, cost, key);
    b.setAttribute('aria-label', `${def.name}, ${def.cost} gold. ${def.blurb}`);
    const show = () => { blurb.textContent = def.blurb; onPreview(type); };
    b.addEventListener('pointerenter', show);
    b.addEventListener('focus', show);
    b.addEventListener('pointerleave', () => onPreview(null));
    b.addEventListener('click', () => onBuild(type));
    list.append(b);
    return { b, def };
  });
  blurb.textContent = cards.length ? cards[0].def.blurb : '';

  root.append(head, list, blurb);
  return {
    root,
    refresh(s) { for (const { b, def } of cards) b.disabled = s.gold < def.cost; },
    focus() { const first = cards.find(c => !c.b.disabled); if (first) first.b.focus({ preventScroll: true }); }
  };
}
