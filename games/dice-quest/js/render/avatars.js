// The animal face pictures: <img> markup for the page and loaded images for
// the canvas. Until a picture has loaded the canvas draws a plain token.

import { AVATARS } from '../config.js';

const NAMES = Object.fromEntries(AVATARS.map(a => [a.id, a.name]));
const images = {};

export const avatarUrl = id => new URL(`../../img/avatars/${id}.webp`, import.meta.url).href;

export function avatarImage(id) {
  if (!images[id]) {
    const im = new Image();
    im.decoding = 'async';
    im.src = avatarUrl(id);
    images[id] = im;
  }
  const im = images[id];
  return im.complete && im.naturalWidth ? im : null;
}

export function avatarHtml(id, cls = 'ava') {
  return `<img class="${cls}" src="${avatarUrl(id)}" alt="${NAMES[id] || ''}" width="64" height="64" draggable="false">`;
}

export function preloadAvatars() {
  AVATARS.forEach(a => avatarImage(a.id));
}
