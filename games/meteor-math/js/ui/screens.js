// The cards: menu, world map, level intro, pause, results, help, the fact
// map for grown-ups, and the Quick Check.

import { WORLDS, LEVELS } from '../data/worlds.js';
import { POWERS } from '../data/powerups.js';
import { FACTS, factKey, peek, tally, MAX } from '../core/facts.js';
import { CHECK_SIZE } from '../core/placement.js';
import { isOpen } from '../save.js';
import { HEROES, heroById, heroOpen, starTotal } from '../data/heroes.js';
import { drawPalHead } from '../render/pals.js';
import { buildKeys } from './keypad.js';

const starRow = n => [0, 1, 2].map(i => `<i class="star${i < n ? ' on' : ''}">★</i>`).join('');
const tablesText = l => l.tables.length > 6 ? `${Math.min(...l.tables)}–${Math.max(...l.tables)}` : l.tables.join(', ');
const OPS = { mul: '7 × 8', div: '56 ÷ 8', miss: '7 × ? = 56' };

function bind(card, map) {
  for (const sel in map) card.querySelectorAll(sel).forEach(el => el.addEventListener('click', map[sel]));
}

function known(stats) {
  const m = tally(stats, 'mul'), d = tally(stats, 'div');
  return { mul: m.levels[3] + m.levels[4], div: d.levels[3] + d.levels[4], total: FACTS.length };
}

const DINO_LAYERS = ['body', 'foot-r', 'shade', 'foot-l', 'paw-l', 'paw-r', 'eyes'];

function heroPicker(save) {
  const total = starTotal(save.stars);
  return `<div class="heroes" role="radiogroup" aria-label="Choose your hero">${HEROES.map(h => {
    const open = heroOpen(h, save.stars);
    const pic = h.id === 'dino'
      ? `<span class="dino-pic">${DINO_LAYERS.map(l => `<img src="img/dragon/${l}.svg" alt="">`).join('')}</span>`
      : `<canvas data-head="${h.id}" width="96" height="96"></canvas>`;
    return `<button class="hero${h.id === save.hero ? ' on' : ''}" data-hero="${h.id}" role="radio" aria-checked="${h.id === save.hero}"
      ${open ? '' : `disabled title="Collect ${h.stars} stars to unlock (you have ${total})"`}>
      ${pic}<span>${open ? h.name : `🔒 ${h.stars}★`}</span></button>`;
  }).join('')}</div>`;
}

function bindPicker(card, save, onPick) {
  card.querySelectorAll('canvas[data-head]').forEach(cv => {
    const c = cv.getContext('2d');
    c.scale(cv.width / 96, cv.height / 96);
    drawPalHead(c, heroById(cv.dataset.head), 45, 60, 1.05, null);
  });
  card.querySelectorAll('.hero').forEach(b => b.addEventListener('click', () => onPick(b.dataset.hero)));
}

export function menuScreen(overlay, save, cb) {
  const k = known(save.stats);
  const firstTime = !save.checked;
  const name = heroById(save.hero).name;
  overlay.show(`
    <h2 class="title">Meteor Math</h2>
    <p>Meteors are falling, and each one has a times-table question on it. Type the answer and ${name} zaps it!</p>
    ${heroPicker(save)}
    ${firstTime ? `<div class="first">
      <p><b>New here?</b> Start with a 2-minute Quick Check so the game knows which facts you already have.</p>
      <button class="cta big" data-a="check" autofocus>Quick Check</button>
      <button class="link" data-a="play">Skip it, just play</button>
    </div>` : `<div class="btn-col">
      <button class="cta big" data-a="play" autofocus>Play</button>
    </div>`}
    <div class="modes">
      <button class="mode" data-a="endless"><b>∞ Endless</b><small>How long can you last? Best ${save.best}</small></button>
      <button class="mode" data-a="weak"><b>🎯 Weak Spots</b><small>Slow, with dot hints, only your trickiest facts</small></button>
      <button class="mode" data-a="map"><b>📊 Fact Map</b><small>${k.mul} / ${k.total} × and ${k.div} / ${k.total} ÷ known by heart</small></button>
      ${firstTime ? '' : '<button class="mode" data-a="check"><b>✅ Quick Check</b><small>Take the 2-minute check again</small></button>'}
    </div>`, card => {
    bind(card, {
      '[data-a=play]': cb.play, '[data-a=endless]': cb.endless, '[data-a=weak]': cb.weak,
      '[data-a=map]': cb.map, '[data-a=check]': cb.check
    });
    bindPicker(card, save, cb.hero);
  });
}

export function worldsScreen(overlay, save, cb) {
  const rows = WORLDS.map((w, wi) => {
    const lv = LEVELS.filter(l => l.world === wi);
    const locked = wi > save.unlocked;
    const btns = lv.map(l => {
      const open = isOpen(save, l);
      const boss = !!l.boss;
      return `<button class="lvl${boss ? ' boss' : ''}" data-id="${l.id}" ${open ? '' : 'disabled'} title="${l.name}">
        <b>${boss ? '👾' : l.index + 1}</b><span class="stars">${open ? starRow(save.stars[l.id] || 0) : '🔒'}</span></button>`;
    }).join('');
    return `<div class="world w-${w.id}${locked ? ' locked' : ''}">
      <div class="wname"><b>${wi + 1}. ${w.name}</b><small>${locked ? 'Beat the boss before to open' : w.blurb}</small></div>
      <div class="lvls">${btns}</div></div>`;
  }).join('');
  overlay.show(`<h2>Pick a level</h2><div class="worlds">${rows}</div>
    <div class="btn-row"><button class="cta ghost" data-a="back">Back</button></div>`, card => {
    bind(card, { '[data-a=back]': cb.back });
    card.querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => cb.pick(b.dataset.id)));
  }, cb.back);
}

export function introScreen(overlay, level, best, cb) {
  const ops = Object.keys(level.ops).map(o => `<span class="chip">${OPS[o]}</span>`).join('');
  const what = level.boss
    ? `Beat <b>${level.name}</b>: answer ${level.boss.hp} of its questions before it reaches the ground.`
    : `Zap <b>${level.goal}</b> meteors. Don't let them hit the ground: you have 3 shields.`;
  const extras = [level.ufo && '🛸 golden UFOs', level.shower && '🌠 a shooting-star shower', level.split && '💥 big meteors that split']
    .filter(Boolean).join(' · ');
  overlay.show(`
    <h2>${level.id.replace('-B', ' · Boss')} · ${level.name}</h2>
    <p>${what}</p>
    <p>Tables <b>${tablesText(level)}</b>${level.upTo > 9 ? ' up to ×12' : ''}</p>
    <div class="chips">${ops}</div>
    ${extras ? `<p class="small">${extras}</p>` : ''}
    ${best ? `<p class="small">Your best: ${starRow(best)}</p>` : ''}
    <div class="btn-row"><button class="cta ghost" data-a="back">Back</button><button class="cta big" data-a="go" autofocus>Go!</button></div>`,
  card => bind(card, { '[data-a=go]': cb.go, '[data-a=back]': cb.back }), cb.back);
}

export function pauseScreen(overlay, cb) {
  overlay.show(`<h2>Paused</h2>
    <div class="btn-col">
      <button class="cta big" data-a="resume" autofocus>Keep going</button>
      <button class="cta ghost" data-a="restart">Start again</button>
      <button class="cta ghost" data-a="quit">Quit to menu</button>
    </div>`, card => bind(card, { '[data-a=resume]': cb.resume, '[data-a=restart]': cb.restart, '[data-a=quit]': cb.quit }), cb.resume);
}

export function resultScreen(overlay, res, info, cb) {
  const pct = Math.round(res.accuracy * 100);
  let title, line;
  if (info.endless) { title = info.newBest ? 'New best!' : 'Good run!'; line = `You lasted ${Math.floor(res.time / 60)}:${String(Math.floor(res.time) % 60).padStart(2, '0')}.`; }
  else if (info.weak) { title = 'Practice done!'; line = 'Those tricky facts are a bit less tricky now.'; }
  else if (res.won) { title = info.boss ? 'Boss beaten!' : 'Level clear!'; line = info.boss && info.opened ? `<b>${info.opened}</b> is open!` : ''; }
  else { title = 'The planet got hit!'; line = 'So close. Every try makes the facts stick.'; }
  const missed = res.missList.length
    ? `<div class="practice"><h3>Facts to practise</h3><div class="chips">${res.missList.map(f => `<span class="chip warn">${f}</span>`).join('')}</div></div>`
    : (res.won || info.weak) ? '<p class="small">No meteor got through. Brilliant!</p>' : '';
  const buttons = [];
  if (info.endless || info.weak || !res.won) buttons.push('<button class="cta big" data-a="retry" autofocus>Play again</button>');
  if (res.won && info.next) buttons.push(`<button class="cta big" data-a="next" autofocus>Next level</button>`);
  if (res.won && !info.next && !info.endless && !info.weak) buttons.push('<button class="cta big" data-a="retry" autofocus>Play again</button>');
  overlay.show(`
    <h2 class="title">${title}</h2>
    ${!info.endless && !info.weak && res.won ? `<div class="big-stars">${starRow(res.stars)}</div>` : ''}
    ${line ? `<p>${line}</p>` : ''}
    <div class="numbers">
      <div><b>${res.score}</b><small>score</small></div>
      <div><b>${pct}%</b><small>right</small></div>
      <div><b>${res.bestCombo}</b><small>best combo</small></div>
    </div>
    ${missed}
    <div class="btn-row">${buttons.join('')}
      ${info.endless || info.weak ? '' : '<button class="cta ghost" data-a="map">Levels</button>'}
      <button class="cta ghost" data-a="menu">Menu</button></div>`, card => bind(card, {
    '[data-a=retry]': cb.retry, '[data-a=next]': cb.next, '[data-a=map]': cb.map, '[data-a=menu]': cb.menu
  }));
}

export function helpScreen(overlay, heroName, close) {
  const powers = POWERS.map(p => `<li><span class="pi">${p.icon}</span><span><b>${p.name}</b> ${p.desc}</span></li>`).join('');
  overlay.show(`<h2>How to play</h2>
    <div class="how">
      <ul>
        <li>Each meteor has a question: <b>7 × 8</b>, <b>56 ÷ 8</b> or <b>7 × ? = 56</b>.</li>
        <li>Type the answer with the number pad or your keyboard. When it matches a meteor, ${heroName} zaps it straight away. (If you type <b>1</b> while a <b>12</b> is falling, ${heroName} waits a moment for the next digit; press <b>Enter</b> or ★ to fire now.)</li>
        <li>A meteor that hits the ground breaks a shield and shows you the right answer. It comes back soon for another go!</li>
        <li>Wrong answers don't cost anything, they just end your combo. Answer 5, 10, 15 in a row for ×2, ×3, ×4 points.</li>
        <li><b>Big meteors</b> with a dashed ring split in two: the same fact the other way round. <b>Shooting stars</b> run through one times table in order and don't hurt if you miss them.</li>
      </ul>
      <h3>Heroes</h3>
      <p class="small">Pick your hero on the menu. Dino, Bunny and Bear are ready from the start; Panda, Fox, Kitty and Frog join as you collect stars in the levels. They all play the same, each with their own laser colour.</p>
      <h3>Golden UFO prizes</h3>
      <ul class="powers">${powers}</ul>
      <h3>How it learns</h3>
      <p class="small">The game remembers every fact you answer and how quickly. Facts you answer in under 3 seconds move up; missed ones move down and come up more often. The <b>Fact Map</b> shows what you know by heart, and <b>Weak Spots</b> practises just the tricky ones.</p>
      <h3>Keys</h3>
      <p class="small"><kbd>0</kbd>–<kbd>9</kbd> type · <kbd>Backspace</kbd> fix · <kbd>Enter</kbd> fire · <kbd>Esc</kbd> pause · <kbd>M</kbd> sound · <kbd>H</kbd> help</p>
      <p class="small credit">Dino is "Cute dragon" by lzubiaur (Voodoo Cactus), <a href="https://opengameart.org/content/cute-dragon-0" target="_blank" rel="noopener">OpenGameArt</a>, CC-BY 3.0.</p>
    </div>
    <div class="btn-row"><button class="cta" data-a="close" autofocus>Got it</button></div>`, card => bind(card, { '[data-a=close]': close }), close);
}

// ---------- the fact map ----------

const LEVEL_NAME = ['Tricky', 'Learning', 'Getting there', 'Know it', 'By heart'];

function cellClass(r) {
  if (!r || !r[1]) return 'c-new';
  return 'c' + r[0];
}

function grid(stats, kind) {
  let html = '<div class="grid"><span class="hd"></span>';
  for (let c = 1; c <= MAX; c++) html += `<span class="hd">${c}</span>`;
  for (let r = 1; r <= MAX; r++) {
    html += `<span class="hd">${r}</span>`;
    for (let c = 1; c <= MAX; c++) {
      const key = factKey(r, c);
      html += `<button class="cell ${cellClass(peek(stats, key, kind))}" data-k="${key}" data-r="${r}" data-c="${c}" data-kind="${kind}" aria-label="${r} times ${c}"></button>`;
    }
  }
  return html + '</div>';
}

export function factMapScreen(overlay, stats, cb) {
  const sum = kind => {
    const t = tally(stats, kind);
    return `${t.levels[4]} by heart · ${t.levels[3]} known · ${t.levels[0] + t.levels[1] + t.levels[2]} learning · ${t.unseen} not yet seen`;
  };
  overlay.show(`<h2>Fact Map</h2>
    <p class="small">Every fact from 1×1 to 12×12. Tap a square to see how it's going.</p>
    <div class="maps">
      <div><h3>Times ×</h3>${grid(stats, 'mul')}<p class="small">${sum('mul')}</p></div>
      <div><h3>Divide ÷ and missing numbers</h3>${grid(stats, 'div')}<p class="small">${sum('div')}</p></div>
    </div>
    <p class="detail" aria-live="polite">&nbsp;</p>
    <div class="legend">
      <span><i class="c-new"></i>Not yet</span><span><i class="c0"></i>Tricky</span><span><i class="c1"></i>Learning</span>
      <span><i class="c2"></i>Getting there</span><span><i class="c3"></i>Know it</span><span><i class="c4"></i>By heart</span>
    </div>
    <div class="btn-row"><button class="cta ghost" data-a="reset">Reset progress…</button><button class="cta" data-a="back" autofocus>Back</button></div>`,
  card => {
    bind(card, { '[data-a=back]': cb.back });
    const detail = card.querySelector('.detail');
    card.querySelectorAll('.cell').forEach(b => b.addEventListener('click', () => {
      const r = +b.dataset.r, c = +b.dataset.c, kind = b.dataset.kind;
      const rec = peek(stats, b.dataset.k, kind);
      const fact = kind === 'mul' ? `${r} × ${c} = ${r * c}` : `${r * c} ÷ ${r} = ${c}`;
      detail.innerHTML = !rec || !rec[1] ? `<b>${fact}</b> · not asked yet`
        : `<b>${fact}</b> · ${LEVEL_NAME[rec[0]]} · asked ${rec[1]}×, missed ${rec[2]}×${rec[3] ? ` · about ${(rec[3] / 1000).toFixed(1)} s` : ''}`;
    }));
    card.querySelector('[data-a=reset]').addEventListener('click', e => {
      const b = e.currentTarget;
      if (b.dataset.sure) { cb.reset(); return; }
      b.dataset.sure = '1';
      b.textContent = 'Really wipe everything? Tap again';
      b.classList.add('danger');
    });
  }, cb.back);
}

// ---------- quick check ----------

export function checkIntroScreen(overlay, cb) {
  overlay.show(`<h2>Quick Check</h2>
    <p>${CHECK_SIZE} questions, no meteors, no rush. Answer as quickly as you comfortably can. If you don't know one, tap <b>Not sure</b>: that's useful too!</p>
    <p class="small">The game uses this to skip what you already know and start where it's useful.</p>
    <div class="btn-row"><button class="cta ghost" data-a="back">Back</button><button class="cta big" data-a="go" autofocus>Start</button></div>`,
  card => bind(card, { '[data-a=go]': cb.go, '[data-a=back]': cb.back }), cb.back);
}

// returns a handle to update the typed answer and show right/wrong
export function checkScreen(overlay, n, total, prob, cb) {
  let typedEl, box;
  overlay.show(`<div class="check">
    <div class="progress"><i style="width:${(n / total) * 100}%"></i></div>
    <p class="small">Question ${n + 1} of ${total}</p>
    <div class="q">${prob.text.replace('?', '<span class="qm">?</span>')}</div>
    <div class="ans"><span class="typed"></span></div>
    <div class="keypad in-card"></div>
    <button class="link" data-a="skip">Not sure</button>
    <button class="link small" data-a="quit">Stop the check</button>
  </div>`, card => {
    typedEl = card.querySelector('.typed');
    box = card.querySelector('.ans');
    buildKeys(card.querySelector('.keypad'), cb.key);
    bind(card, { '[data-a=skip]': cb.skip, '[data-a=quit]': cb.quit });
  });
  return {
    typed(text) { typedEl.textContent = text; },
    mark(ok, full) { box.classList.add(ok ? 'ok' : 'bad'); typedEl.textContent = ok ? '✓ ' + full : full; }
  };
}

export function checkResultScreen(overlay, out, worldName, cb) {
  const pct = x => Math.round(x * 100) + '%';
  overlay.show(`<h2 class="title">All done!</h2>
    <p>You got <b>${out.right} of ${out.asked}</b> right.</p>
    <div class="numbers">
      <div><b>${pct(out.mul)}</b><small>× up to 9, quick</small></div>
      <div><b>${pct(out.div)}</b><small>÷ up to 9, quick</small></div>
      <div><b>${pct(out.twelve)}</b><small>11s and 12s</small></div>
    </div>
    <p>${out.world > 0 ? `Great: worlds up to <b>${worldName}</b> are open. Start there, or warm up from the beginning.` : 'Start at the Moon Base: it gets those facts quick as a flash.'}</p>
    <div class="btn-row"><button class="cta ghost" data-a="map">See the Fact Map</button><button class="cta big" data-a="play" autofocus>Play</button></div>`,
  card => bind(card, { '[data-a=play]': cb.play, '[data-a=map]': cb.map }));
}
