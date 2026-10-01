// The overlay on top of the board (help, pause, win, lose, resume, the level
// map, "new bug!" cards) and the toast.

import { S } from '../strings.js';

const $ = id => document.getElementById(id);

export function closeButton(onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon-btn close';
  b.setAttribute('aria-label', S.close);
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  b.addEventListener('click', onClick);
  return b;
}

export function createOverlay() {
  const el = {
    root: $('overlay'), title: $('ovTitle'), stars: $('ovStars'), how: $('ovHow'), pic: $('ovPic'), levels: $('ovLevels'),
    msg: $('ovMsg'), btn: $('ovBtn'), btn2: $('ovBtn2'), toast: $('toast')
  };
  let handlers = {}, kind = null, toastTimer = 0;
  el.btn.addEventListener('click', () => handlers.onBtn && handlers.onBtn());
  el.btn2.addEventListener('click', () => handlers.onBtn2 && handlers.onBtn2());

  return {
    get kind() { return kind; },
    // msg and how items may contain <b> from strings.js only
    show(opts) {
      kind = opts.kind;
      handlers = opts;
      el.title.textContent = opts.title;
      el.msg.innerHTML = opts.msg || '';
      el.how.hidden = !opts.how;
      el.how.innerHTML = '';
      (opts.how || []).forEach((text, i) => {
        const d = document.createElement('div');
        d.innerHTML = `<b>${i + 1}</b>${text}`;
        el.how.append(d);
      });
      el.pic.hidden = !opts.pic;
      el.pic.textContent = '';
      if (opts.pic) el.pic.append(opts.pic);
      el.levels.hidden = !opts.levels;
      el.levels.textContent = '';
      if (opts.levels) el.levels.append(levelMap(opts.levels, opts.onPick));
      el.root.classList.toggle('tall', !!opts.levels);
      el.stars.hidden = opts.stars === undefined;
      [...el.stars.children].forEach((s, i) => s.classList.toggle('on', i < (opts.stars || 0)));
      el.btn.textContent = opts.btn;
      el.btn2.hidden = !opts.btn2;
      el.btn2.textContent = opts.btn2 || '';
      el.root.hidden = false;
      const current = opts.levels && el.levels.querySelector('.current');
      (current || el.btn).focus({ preventScroll: true });
    },
    hide() { el.root.hidden = true; kind = null; handlers = {}; },
    toast(msg, ms = 1600) {
      el.toast.textContent = msg;
      el.toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
    }
  };
}

const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';

// chapters of level buttons, each with its best stars; locked ones can't be picked
function levelMap(levels, onPick) {
  const frag = document.createDocumentFragment();
  const chapters = [...new Set(levels.map(l => l.chapter))];
  for (const ch of chapters) {
    const sec = document.createElement('section');
    const h = document.createElement('h3');
    h.textContent = `${ch}. ${S.chapters[ch] || ''}`;
    const row = document.createElement('div');
    row.className = 'level-row';
    for (const l of levels.filter(x => x.chapter === ch)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'level-card' + (l.current ? ' current' : '') + (l.theme ? ' ' + l.theme : '');
      b.disabled = l.locked;
      b.setAttribute('aria-label', S.levelLabel(l.name, l.stars, l.locked));
      if (l.locked) b.title = S.locked;
      const num = document.createElement('b');
      if (l.locked) num.innerHTML = LOCK; else num.textContent = l.id;
      const name = document.createElement('span'); name.textContent = l.name;
      const stars = document.createElement('i');
      stars.innerHTML = [0, 1, 2].map(k => `<em class="${k < l.stars ? 'on' : ''}">★</em>`).join('');
      b.append(num, name, stars);
      b.addEventListener('click', () => onPick(l.id));
      row.append(b);
    }
    sec.append(h, row);
    frag.append(sec);
  }
  return frag;
}
