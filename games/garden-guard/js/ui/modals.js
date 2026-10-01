// The overlay on top of the board (help, pause, win, lose, resume) and the toast.

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
    root: $('overlay'), title: $('ovTitle'), stars: $('ovStars'), how: $('ovHow'),
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
      el.stars.hidden = opts.stars === undefined;
      [...el.stars.children].forEach((s, i) => s.classList.toggle('on', i < (opts.stars || 0)));
      el.btn.textContent = opts.btn;
      el.btn2.hidden = !opts.btn2;
      el.btn2.textContent = opts.btn2 || '';
      el.root.hidden = false;
      el.btn.focus({ preventScroll: true });
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
