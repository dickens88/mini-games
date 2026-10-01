// The cards shown over the court: picking pals and a court, pause, how to
// play and the end of a match.

import { FORMATS } from '../config.js';
import { PALS, palById } from '../data/pals.js';
import { COURTS } from '../data/courts.js';
import { POWERUPS } from '../data/powerups.js';
import { LEVELS } from '../core/ai.js';
import { drawPalHead, drawPal } from '../render/pals.js';
import { drawPowerIcon } from '../render/icons.js';
import { paintCourtThumb } from '../render/renderer.js';

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

function paintFull(cv, palId, dir, mood, t = 0) {
  const { ctx, w, h } = hidpi(cv);
  const k = h / 130;
  drawPal(ctx, palById(palId), { x: w / 2 - dir * 8 * k, y: h - 6, dir, size: k, mood, t, run: 0 });
}

function paintIcon(cv, id) {
  const { ctx, w, h } = hidpi(cv);
  drawPowerIcon(ctx, id, w / 2, h / 2, Math.min(w, h) * 0.42);
}

const palButtons = (p, chosen, taken) => PALS.map(pal => `
  <button type="button" class="pal-pick${pal.id === chosen ? ' on' : ''}" data-p="${p}" data-pal="${pal.id}"
    aria-pressed="${pal.id === chosen}" ${pal.id === taken ? 'disabled' : ''} title="${pal.name}">
    <canvas aria-hidden="true"></canvas><span>${pal.name}</span>
  </button>`).join('');

export function setupScreen(overlay, save, { onStart, onHelp, onChange }) {
  const opp = save.opponent;
  const cpuWins = Object.entries(save.cpuWins).filter(([, n]) => n > 0);
  overlay.show(`
    <h2 class="title">Rally Pals</h2>
    <p>Two pals, one net, one bouncy ball. Pick your players and a court!</p>
    <div class="setup">
      <section class="player-box" style="--side:var(--p1)">
        <h3><span class="dot"></span>Player 1</h3>
        <div class="pal-grid" data-grid="0">${palButtons(0, save.pals[0], save.pals[1])}</div>
        <p class="keys-note keys-only">Keys: <kbd>A</kbd> <kbd>D</kbd> run · <kbd>W</kbd> jump · <kbd>S</kbd> swing</p>
      </section>
      <section class="player-box" style="--side:var(--p2)">
        <h3><span class="dot"></span>Player 2</h3>
        <div class="seg" role="group" aria-label="Who plays player 2">
          <button type="button" data-opp="friend" aria-pressed="${opp === 'friend'}">A friend</button>
          ${Object.entries(LEVELS).map(([id, l]) => `<button type="button" data-opp="${id}" aria-pressed="${opp === id}">CPU ${l.name}</button>`).join('')}
        </div>
        <div class="pal-grid" data-grid="1">${palButtons(1, save.pals[1], save.pals[0])}</div>
        <p class="keys-note keys-only" data-friend-keys ${opp === 'friend' ? '' : 'hidden'}>Keys: <kbd>←</kbd> <kbd>→</kbd> run · <kbd>↑</kbd> jump · <kbd>↓</kbd> swing</p>
      </section>
    </div>
    <h3 class="sec">Court</h3>
    <div class="courts">${COURTS.map(c => `
      <button type="button" class="court-pick${c.id === save.court ? ' on' : ''}" data-court="${c.id}" aria-pressed="${c.id === save.court}">
        <canvas aria-hidden="true"></canvas><b>${c.name}</b><small>${c.blurb}</small>
      </button>`).join('')}
    </div>
    <h3 class="sec">Match</h3>
    <div class="seg wide" role="group" aria-label="Match length">${Object.values(FORMATS).map(f => `
      <button type="button" data-format="${f.id}" aria-pressed="${f.id === save.format}"><b>${f.name}</b><small>${f.blurb}</small></button>`).join('')}
    </div>
    <div class="toggles">
      <label><input type="checkbox" data-opt="powerups" ${save.powerups ? 'checked' : ''}> Power-up bubbles</label>
      <label><input type="checkbox" data-opt="helper" ${save.helper ? 'checked' : ''}> Show where the ball lands</label>
    </div>
    ${cpuWins.length ? `<p class="trophies">🏆 Wins against the computer: ${cpuWins.map(([l, n]) => `${LEVELS[l] ? LEVELS[l].name : l} × ${n}`).join(' · ')}</p>` : ''}
    <div class="btn-row">
      <button class="cta big" type="button" data-act="start">Play!</button>
      <button class="cta ghost" type="button" data-act="help">How to play</button>
    </div>`, card => {
    card.querySelectorAll('.pal-pick').forEach(b => paintHead(b.querySelector('canvas'), b.dataset.pal));
    card.querySelectorAll('.court-pick').forEach(b => paintCourtThumb(b.querySelector('canvas'), b.dataset.court));

    const refreshPals = () => {
      card.querySelectorAll('.pal-pick').forEach(b => {
        const p = Number(b.dataset.p);
        const on = save.pals[p] === b.dataset.pal;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on);
        b.disabled = save.pals[1 - p] === b.dataset.pal;
      });
    };
    card.querySelectorAll('.pal-pick').forEach(b => b.addEventListener('click', () => {
      save.pals[Number(b.dataset.p)] = b.dataset.pal;
      refreshPals(); onChange();
    }));
    const seg = (attr, key) => card.querySelectorAll(`[data-${attr}]`).forEach(b => b.addEventListener('click', () => {
      save[key] = b.dataset[attr];
      card.querySelectorAll(`[data-${attr}]`).forEach(o => o.setAttribute('aria-pressed', o === b));
      if (attr === 'court') card.querySelectorAll('.court-pick').forEach(o => o.classList.toggle('on', o === b));
      if (attr === 'opp') card.querySelector('[data-friend-keys]').hidden = save.opponent !== 'friend';
      onChange();
    }));
    seg('opp', 'opponent'); seg('court', 'court'); seg('format', 'format');
    card.querySelectorAll('[data-opt]').forEach(i => i.addEventListener('change', () => { save[i.dataset.opt] = i.checked; onChange(); }));
    card.querySelector('[data-act="start"]').addEventListener('click', onStart);
    card.querySelector('[data-act="help"]').addEventListener('click', onHelp);
  });
}

export function pauseScreen(overlay, { onResume, onRestart, onSetup, onHelp }) {
  overlay.show(`
    <h2>Paused</h2>
    <div class="btn-col">
      <button class="cta" type="button" data-act="resume">Keep playing</button>
      <div class="btn-row">
        <button class="cta ghost" type="button" data-act="restart">Start over</button>
        <button class="cta ghost" type="button" data-act="setup">Change pals or court</button>
        <button class="cta ghost" type="button" data-act="help">How to play</button>
      </div>
    </div>`, card => {
    const on = { resume: onResume, restart: onRestart, setup: onSetup, help: onHelp };
    card.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => on[b.dataset.act]()));
  }, onResume);
}

export function helpScreen(overlay, onClose) {
  overlay.show(`
    <h2>How to play</h2>
    <div class="how">
      <table class="keys">
        <thead><tr><th></th><th><span class="dot p1"></span>Player 1</th><th><span class="dot p2"></span>Player 2</th></tr></thead>
        <tbody>
          <tr><td>Run</td><td><kbd>A</kbd> <kbd>D</kbd></td><td><kbd>←</kbd> <kbd>→</kbd></td></tr>
          <tr><td>Jump</td><td><kbd>W</kbd></td><td><kbd>↑</kbd></td></tr>
          <tr><td>Swing / serve</td><td><kbd>S</kbd> or <kbd>Space</kbd></td><td><kbd>↓</kbd> or <kbd>Enter</kbd></td></tr>
        </tbody>
      </table>
      <p class="small">On a phone or tablet each player gets their own buttons. Game controllers work too — plug in two!</p>
      <ul>
        <li><b>Swing</b> when the ball is just in front of your racket. The middle of the racket is the sweet spot.</li>
        <li>Hold <b>toward the net</b> while you swing for a fast <b>drive</b>, hold <b>away</b> for a high <b>lob</b>.</li>
        <li><b>Jump and swing</b> at a high ball to <b>smash</b> it!</li>
        <li>You win the point if the ball <b>bounces twice</b> on the other side, or if they hit it <b>out</b> or into the <b>net</b>.</li>
        <li>The ring on the ground shows where the ball will land. A dashed ring with a cross means it's going out — let it go!</li>
        <li>A ball that bonks off your head counts as your hit — it might just go over.</li>
      </ul>
      <h3>Power-up bubbles</h3>
      <p class="small">Hit a floating bubble with the ball and the power is yours.</p>
      <ul class="powers">${POWERUPS.map(p => `<li><canvas data-icon="${p.id}" aria-hidden="true"></canvas><span><b>${p.name}</b> ${p.help}</span></li>`).join('')}</ul>
      <h3>Courts</h3>
      <ul>${COURTS.map(c => `<li><b>${c.name}:</b> ${c.blurb}</li>`).join('')}</ul>
      <p class="small">Esc pauses · M turns the sound on and off.</p>
    </div>
    <div class="btn-row"><button class="cta" type="button" data-act="close">Got it!</button></div>`, card => {
    card.querySelectorAll('[data-icon]').forEach(c => paintIcon(c, c.dataset.icon));
    card.querySelector('[data-act="close"]').addEventListener('click', onClose);
  }, onClose);
}

export function resultScreen(overlay, s, names, labels, { onRematch, onSetup }) {
  const w = s.score.winner, st = s.stats;
  const tennis = FORMATS[s.score.format].type === 'tennis';
  const score = tennis ? s.score.games : s.score.points;
  // rows where nobody scored anything are left out
  const row = (label, a, b) => (a || b ? `<tr><td>${a}</td><th>${label}</th><td>${b}</td></tr>` : '');
  overlay.show(`
    <div class="podium">
      <canvas class="champ" aria-hidden="true"></canvas>
      <canvas class="loser" aria-hidden="true"></canvas>
    </div>
    <h2 class="title">${names[w]} wins!</h2>
    <p class="final"><b>${score[0]}</b> – <b>${score[1]}</b> ${tennis ? 'games' : 'points'} · longest rally <b class="small">${st.longest}</b> hits</p>
    <table class="stats">
      <thead><tr><td><span class="dot p1"></span>${labels[0]}</td><th></th><td><span class="dot p2"></span>${labels[1]}</td></tr></thead>
      <tbody>
        ${row('Points won', st.points[0], st.points[1])}
        ${row('Aces', st.aces[0], st.aces[1])}
        ${row('Smashes', st.smashes[0], st.smashes[1])}
        ${row('Headers', st.headers[0], st.headers[1])}
        ${row('Power-ups', st.powers[0], st.powers[1])}
      </tbody>
    </table>
    <div class="btn-row">
      <button class="cta" type="button" data-act="rematch">Rematch!</button>
      <button class="cta ghost" type="button" data-act="setup">Change pals or court</button>
    </div>`, card => {
    let t = 0, raf = 0;
    const champ = card.querySelector('.champ'), loser = card.querySelector('.loser');
    const tick = () => {
      if (!champ.isConnected) return cancelAnimationFrame(raf);
      t += 1 / 60;
      paintFull(champ, s.players[w].pal, 1, 'happy', t);
      paintFull(loser, s.players[1 - w].pal, -1, 'sad', t);
      raf = requestAnimationFrame(tick);
    };
    tick();
    card.querySelector('[data-act="rematch"]').addEventListener('click', onRematch);
    card.querySelector('[data-act="setup"]').addEventListener('click', onSetup);
  });
}
