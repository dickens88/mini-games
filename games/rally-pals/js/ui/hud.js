// The scoreboard above the court: each pal's face, name, games and points,
// and who is serving.

import { FORMATS } from '../config.js';
import { palById } from '../data/pals.js';
import { pointLabel, call } from '../core/score.js';
import { paintHead } from './screens.js';

export function createHud(root) {
  const q = (k) => root.querySelector(`[data-hud="${k}"]`);
  let faces = [null, null];

  return {
    setup(s, labels) {
      faces = [null, null];
      [0, 1].forEach(i => {
        q('name' + i).textContent = palById(s.players[i].pal).name;
        q('tag' + i).textContent = labels[i];
      });
      this.update(s, true);
    },
    update(s, force) {
      const f = FORMATS[s.score.format];
      const tennis = f.type === 'tennis';
      [0, 1].forEach(i => {
        const mood = s.phase === 'over' ? (s.score.winner === i ? 'happy' : 'sad') : s.players[i].mood === 'happy' ? 'happy' : null;
        if (force || faces[i] !== mood) { faces[i] = mood; paintHead(q('face' + i), s.players[i].pal, mood); }
        const pts = q('pts' + i), was = pts.textContent, now = pointLabel(s.score, i);
        pts.textContent = now;
        if (!force && was !== now) { pts.classList.remove('bump'); void pts.offsetWidth; pts.classList.add('bump'); }
        const games = q('games' + i);
        games.hidden = !tennis;
        if (tennis) games.innerHTML = Array.from({ length: f.games }, (_, k) => `<i class="${k < s.score.games[i] ? 'won' : ''}"></i>`).join('');
        q('serve' + i).hidden = !(s.server === i && s.phase !== 'over');
      });
      const c = call(s.score, s.server);
      q('mid').innerHTML = tennis
        ? `<b>${c.kind === 'adv' ? 'Advantage' : c.text}</b><small>${f.name} · first to ${f.games} games</small>`
        : `<b>${f.name}</b><small>first to ${f.to} points</small>`;
    }
  };
}
