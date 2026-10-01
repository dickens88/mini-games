// Pointer and keyboard turned into a handful of named actions, so main.js
// never has to know which key or finger did what.

import { COLS, ROWS } from '../config.js';

export function createInput(canvas, renderer, act) {
  let cursor = null;   // keyboard cell cursor, shown only after an arrow key

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    const r = canvas.getBoundingClientRect();
    cursor = null;
    act.tap(e.clientX - r.left, e.clientY - r.top);
  });

  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (act.blocked()) {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') act.overlayKey(e.key);
      return;
    }
    const tag = document.activeElement && document.activeElement.tagName;
    const k = e.key;
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[k] && tag !== 'BUTTON') {
      e.preventDefault();
      if (!cursor) cursor = { c: Math.floor(COLS / 2), r: Math.floor(ROWS / 2) };
      else {
        cursor.c = Math.min(COLS - 1, Math.max(0, cursor.c + arrows[k][0]));
        cursor.r = Math.min(ROWS - 1, Math.max(0, cursor.r + arrows[k][1]));
      }
      canvas.focus({ preventScroll: true });
    } else if (k === 'Enter' && cursor && tag !== 'BUTTON') {
      e.preventDefault(); act.cell({ ...cursor });
    } else if (k === ' ' && tag !== 'BUTTON') {
      e.preventDefault(); if (!e.repeat) act.wave();
    } else if (/^[1-9]$/.test(k)) act.buildKey(k);
    else if (k === 'u' || k === 'U') act.upgrade();
    else if (k === 's' || k === 'S') act.sell();
    else if (k === 't' || k === 'T') act.mode();
    else if (k === 'f' || k === 'F') act.speed();
    else if (k === 'p' || k === 'P') act.pause();
    else if (k === 'Escape') { cursor = null; act.cancel(); }
  });

  return { get cursor() { return cursor; } };
}
