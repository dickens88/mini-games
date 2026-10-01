// The dock panel for a tower that is already built: stats, upgrade, sell, target mode.

import { towerDef, towerStats, nextUpgrade, sellValue } from '../core/towers.js';
import { S } from '../strings.js';
import { closeButton } from './modals.js';

const fmt = n => (Math.round(n * 100) / 100).toString();

// how each stat reads in the panel
const SHOW = {
  rate: v => 1 / v,
  slow: v => Math.round(v * 100) + '%',
  every: v => v + 's'
};
const shown = (key, stats) => (stats[key] === undefined ? undefined : SHOW[key] ? SHOW[key](stats[key]) : stats[key]);

function statLine(label, now, next) {
  const span = document.createElement('span');
  span.append(label + ' ');
  const b = document.createElement('b'); b.textContent = typeof now === 'number' ? fmt(now) : now;
  span.append(b);
  if (next !== undefined && next !== now) {
    const i = document.createElement('i'); i.textContent = ' → ' + (typeof next === 'number' ? fmt(next) : next);
    span.append(i);
  }
  return span;
}

function actButton(cls, label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'act ' + cls;
  const t = document.createElement('b'); t.textContent = label;
  const small = document.createElement('small');
  b.append(t, small);
  b.addEventListener('click', onClick);
  return { b, small };
}

export function towerPanel(state, tower, { onUpgrade, onSell, onMode, onClose }) {
  const root = document.createElement('div');
  root.style.display = 'contents';

  const head = document.createElement('div');
  head.className = 'panel-head';
  const h = document.createElement('h3');
  head.append(h, closeButton(onClose));

  const body = document.createElement('div');
  body.className = 'tower-body';
  const stats = document.createElement('div');
  stats.className = 'tower-stats';
  const actions = document.createElement('div');
  actions.className = 'tower-actions';
  body.append(stats, actions);

  const up = actButton('up', S.upgrade, onUpgrade);
  const mode = actButton('mode', S.target, onMode);
  const sell = actButton('sell', S.sell, onSell);
  actions.append(up.b, mode.b, sell.b);
  root.append(head, body);

  let shownLevel = -1;
  function refresh(s) {
    const def = towerDef(tower), cur = towerStats(tower), next = nextUpgrade(tower);
    if (shownLevel !== tower.level) {
      shownLevel = tower.level;
      h.textContent = def.name;
      const lv = document.createElement('span'); lv.className = 'lv'; lv.textContent = S.level(tower.level + 1);
      h.append(lv);
      stats.textContent = '';
      const n = next ? next.stats : undefined;
      for (const key of def.show || ['dmg', 'range', 'rate']) {
        if (cur[key] !== undefined) stats.append(statLine(S.stats[key], shown(key, cur), n && shown(key, n)));
      }
    }
    up.small.textContent = next ? '● ' + next.cost : S.maxLevel;
    up.b.disabled = !next || s.gold < next.cost;
    mode.small.textContent = S.modes[tower.mode];
    mode.b.hidden = (def.attack || 'shoot') !== 'shoot';
    sell.small.textContent = '+' + sellValue(s, tower);
  }
  refresh(state);

  return { root, refresh, focus() { (up.b.disabled ? mode.b : up.b).focus({ preventScroll: true }); } };
}
