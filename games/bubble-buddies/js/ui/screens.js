// The cards shown in the overlay: menu, level list, how to play and the
// end-of-round cards.

import { BUDDIES, R } from '../config.js';
import { LEVEL_COUNT, levelSpec } from '../data/levels.js';
import { THEME_ART } from '../render/background.js';
import { drawBuddy } from '../render/buddy.js';

const fmt = n => n.toLocaleString('en-US');

// a little row of buddies drawn into a canvas on the card
function paintBuddies(cv, list) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 300, h = cv.clientHeight || 60;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  const s = h / (R * 2.6);
  ctx.scale(dpr * s, dpr * s);
  const step = (w / s) / list.length;
  list.forEach((o, i) => drawBuddy(ctx, dpr * s, Object.assign({ x: step * (i + 0.5), y: R * 1.3, t: i }, o)));
}

const BUDDY_ROW = BUDDIES.map((_, i) => ({ color: i, mood: i === 2 ? 'happy' : null }));

export function menuScreen(overlay, save, { canResume, resumeLabel, onResume, onPlay, onLevels, onEndless, onHelp }) {
  const next = Math.min(save.unlocked, LEVEL_COUNT);
  overlay.show(`
    <canvas class="buddy-row" aria-hidden="true"></canvas>
    <h2 class="title">Bubble Buddies</h2>
    <p>Aim, shoot and match three or more buddies of the same colour to pop them. Pop the ones holding others up and they all come tumbling down!</p>
    <div class="btn-col">
      ${canResume ? `<button class="cta" type="button" data-act="resume">Keep playing <small>${resumeLabel}</small></button>` : ''}
      <button class="cta ${canResume ? 'alt' : ''}" type="button" data-act="play">${next === 1 && !save.stars[1] ? 'Start playing' : 'Play level ' + next}</button>
      <div class="btn-row">
        <button class="cta ghost" type="button" data-act="levels">All levels</button>
        <button class="cta ghost" type="button" data-act="endless">Endless${save.endlessBest ? ` <small>best ${fmt(save.endlessBest)}</small>` : ''}</button>
        <button class="cta ghost" type="button" data-act="help">How to play</button>
      </div>
    </div>`, card => {
    paintBuddies(card.querySelector('.buddy-row'), BUDDY_ROW);
    const on = { resume: onResume, play: () => onPlay(next), levels: onLevels, endless: onEndless, help: onHelp };
    card.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => on[b.dataset.act]()));
  }, canResume ? onResume : null);
}

export function levelsScreen(overlay, save, { onPick, onBack }) {
  const worlds = [];
  for (let start = 1; start <= LEVEL_COUNT; start += 10) {
    const theme = levelSpec(start).theme;
    let cells = '';
    for (let n = start; n < start + 10 && n <= LEVEL_COUNT; n++) {
      const open = n <= save.unlocked;
      const st = save.stars[n] || 0;
      cells += `<button type="button" class="lv${open ? '' : ' locked'}${n === save.unlocked ? ' current' : ''}" data-n="${n}" ${open ? '' : 'disabled'}
        aria-label="Level ${n}${open ? (st ? `, ${st} stars` : '') : ', locked'}">
        <b>${open ? n : '🔒'}</b><span class="lv-stars">${open ? '★'.repeat(st) + `<i>${'★'.repeat(3 - st)}</i>` : ''}</span></button>`;
    }
    worlds.push(`<section class="world" data-theme="${theme}"><h3>${THEME_ART[theme].name} <small>${start}–${Math.min(start + 9, LEVEL_COUNT)}</small></h3><div class="lv-grid">${cells}</div></section>`);
  }
  const total = Object.values(save.stars).reduce((a, b) => a + b, 0);
  overlay.show(`
    <h2>Levels</h2>
    <p>★ ${total} of ${LEVEL_COUNT * 3} stars collected</p>
    <div class="worlds">${worlds.join('')}</div>
    <div class="btn-row"><button class="cta ghost" type="button" data-act="back">Back</button></div>`, card => {
    card.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => onPick(Number(b.dataset.n))));
    card.querySelector('[data-act="back"]').addEventListener('click', onBack);
    const cur = card.querySelector('.lv.current');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }, onBack);
}

export function helpScreen(overlay, onClose) {
  overlay.show(`
    <h2>How to play</h2>
    <div class="how">
      <ul>
        <li><b>Aim</b> with your finger or mouse — the dotted line shows exactly where the bubble will land, bounces off the walls included. Let go (or click) to shoot.</li>
        <li><b>Match three</b> or more buddies of the same colour to pop them.</li>
        <li>Buddies that are no longer hanging from the top <b>fall down</b> for bonus points.</li>
        <li><b>Dino</b> the little dragon holds the next bubble — tap him to swap it with the one in the launcher.</li>
        <li>Each miss fills a dot under the launcher. When they run out, the <b>ceiling drops</b> one row. Don't let anyone cross the dotted line!</li>
        <li>Pops in a row build a <b>combo</b>, and every pop charges the rainbow meter. When it's full you get a power-up:</li>
      </ul>
      <ul class="powers">
        <li><canvas data-p="rainbow"></canvas><span><b>Rainbow</b> matches any colour it touches.</span></li>
        <li><canvas data-p="bomb"></canvas><span><b>Bomb</b> pops everything nearby.</span></li>
        <li><canvas data-p="lightning"></canvas><span><b>Lightning</b> clears the whole row it lands in.</span></li>
        <li><canvas data-p="gift"></canvas><span><b>Gift buddies</b> wear a bow — pop or drop one to get a power-up.</span></li>
      </ul>
      <p class="small">Clear a level in few shots for three stars. In <b>Endless</b> a new row arrives every few shots — how many waves can you clear?</p>
      <p class="small">Dino is based on <a href="https://opengameart.org/content/cute-dragon-0" target="_blank" rel="noopener">Cute dragon</a> by lzubiaur (Voodoo Cactus), CC-BY 3.0.</p>
      <p class="small keys-only">Keys: <kbd>←</kbd> <kbd>→</kbd> aim · <kbd>Space</kbd> shoot · <kbd>S</kbd> swap · <kbd>H</kbd> help</p>
    </div>
    <div class="btn-row"><button class="cta" type="button" data-act="ok">Got it!</button></div>`, card => {
    card.querySelectorAll('canvas[data-p]').forEach(cv => {
      const p = cv.dataset.p;
      paintBuddies(cv, [p === 'gift' ? { color: 0, gift: true } : { special: p, color: -1 }]);
    });
    card.querySelector('[data-act="ok"]').addEventListener('click', onClose);
  }, onClose);
}

export function winScreen(overlay, st, { best, isBest, last, onNext, onReplay, onLevels, sfx }) {
  const stars = [1, 2, 3].map(i => `<span class="big-star${i <= st.stars ? ' on' : ''}" style="--d:${0.25 + i * 0.28}s">★</span>`).join('');
  const three = st.par, two = Math.ceil(st.par * 1.4);
  overlay.show(`
    <h2>Level ${st.level} clear!</h2>
    <div class="big-stars" aria-label="${st.stars} of 3 stars">${stars}</div>
    <p class="score-line"><b>${fmt(st.score)}</b> points${isBest ? ' <span class="badge">New best!</span>' : best ? ` · best ${fmt(best)}` : ''}</p>
    <p>Cleared in <b>${st.shots}</b> shots. ${st.stars < 3 ? `Three stars at ${three} or fewer${st.stars < 2 ? `, two at ${two}` : ''}.` : 'Superb aiming!'}${st.bestStreak > 2 ? ` Best combo ×${st.bestStreak}.` : ''}</p>
    <div class="btn-row">
      ${last ? '' : '<button class="cta" type="button" data-act="next">Next level</button>'}
      <button class="cta ghost" type="button" data-act="replay">Play again</button>
      <button class="cta ghost" type="button" data-act="levels">Levels</button>
    </div>`, card => {
    const on = { next: onNext, replay: onReplay, levels: onLevels };
    card.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => on[b.dataset.act]()));
    for (let i = 1; i <= st.stars; i++) setTimeout(() => sfx.star(i), (0.25 + i * 0.28) * 1000);
  });
}

export function loseScreen(overlay, st, { onRetry, onLevels }) {
  overlay.show(`
    <canvas class="buddy-row small" aria-hidden="true"></canvas>
    <h2>Oh no!</h2>
    <p>The buddies reached the line. ${st.mode === 'level' ? 'Try popping the ones that hold up big groups — they all fall together.' : ''}</p>
    <div class="btn-row">
      <button class="cta" type="button" data-act="retry">Try again</button>
      <button class="cta ghost" type="button" data-act="levels">Levels</button>
    </div>`, card => {
    paintBuddies(card.querySelector('.buddy-row'), [0, 3, 4].map(c => ({ color: c, mood: 'sad', t: 0 })));
    const on = { retry: onRetry, levels: onLevels };
    card.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => on[b.dataset.act]()));
  });
}

export function endlessOverScreen(overlay, st, { best, isBest, onAgain, onMenu }) {
  overlay.show(`
    <canvas class="buddy-row small" aria-hidden="true"></canvas>
    <h2>Game over</h2>
    <p class="score-line"><b>${fmt(st.score)}</b> points${isBest ? ' <span class="badge">New best!</span>' : ` · best ${fmt(best)}`}</p>
    <p>You reached wave <b>${st.wave}</b> in ${st.shots} shots${st.bestStreak > 2 ? `, with a ×${st.bestStreak} combo` : ''}.</p>
    <div class="btn-row">
      <button class="cta" type="button" data-act="again">Play again</button>
      <button class="cta ghost" type="button" data-act="menu">Menu</button>
    </div>`, card => {
    paintBuddies(card.querySelector('.buddy-row'), [1, 5, 2].map(c => ({ color: c, mood: isBest ? 'happy' : 'sad' })));
    const on = { again: onAgain, menu: onMenu };
    card.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => on[b.dataset.act]()));
  });
}
