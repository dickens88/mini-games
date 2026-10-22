// The four boards. Each has its own look (render/themes.js), its own special
// spots and its own mix of party events (core/events.js). Special spots are
// laid out fresh every game but always point-symmetric around the middle, so
// neither player starts closer to the good stuff. A new board starts here.
//
// Terrain kinds:
//   ice     a stone put here slides the way the arrows point (dir 0 → 1 ↓ 2 ← 3 ↑)
//   vent    a volcano vent: nobody can go here, and it erupts during events
//   portal  a stone put here makes a twin on the paired portal (twin = its index)
//   hole    a black hole: nobody can go here

import { int } from '../core/rng.js';

export const BOARDS = [
  {
    id: 'garden', name: 'Flower Garden', blurb: 'Gift boxes pop up everywhere',
    rules: { startGifts: 4, giftEvery: 3, maxGifts: 5, eventEvery: 7, events: ['giftShower', 'lucky', 'lightning', 'rockslide'] },
    terrain: () => []
  },
  {
    id: 'ice', name: 'Ice Pond', blurb: 'Stones on the ice slide along',
    rules: { startGifts: 2, giftEvery: 4, maxGifts: 4, eventEvery: 6, events: ['frostWave', 'snowball', 'giftShower', 'lightning'] },
    terrain: icePatches
  },
  {
    id: 'volcano', name: 'Volcano', blurb: 'Vents erupt and burn stones',
    rules: { startGifts: 2, giftEvery: 4, maxGifts: 4, eventEvery: 6, events: ['eruption', 'eruption', 'meteor', 'lucky'] },
    terrain: vents
  },
  {
    id: 'space', name: 'Space Station', blurb: 'Portals give you a twin stone',
    rules: { startGifts: 2, giftEvery: 4, maxGifts: 4, eventEvery: 6, events: ['meteor', 'lightning', 'giftShower', 'rockslide'] },
    terrain: portals
  }
];

export const boardById = id => BOARDS.find(b => b.id === id) || BOARDS[0];

// ---------- laying out special spots ----------

const mirror = (n, x, y) => [n - 1 - x, n - 1 - y];

// keep the very middle clear so the first stone can always go there
function nearMiddle(n, x, y, r) {
  const m = (n - 1) / 2;
  return Math.abs(x - m) <= r && Math.abs(y - m) <= r;
}

// spots taken so far, with a margin of `gap` around each
function makeTaken(n) {
  const taken = new Set();
  return {
    free: (x, y, gap) => {
      for (let dy = -gap; dy <= gap; dy++) for (let dx = -gap; dx <= gap; dx++) if (taken.has((y + dy) * n + (x + dx))) return false;
      return true;
    },
    add: (x, y) => taken.add(y * n + x)
  };
}

function icePatches(n, rng) {
  const out = [], taken = makeTaken(n);
  for (let pair = 0, tries = 0; pair < 2 && tries < 400; tries++) {
    const across = int(rng, 2) === 0;
    const len = 3 + int(rng, 2), wide = 2;
    const w = across ? len : wide, h = across ? wide : len;
    const x0 = 1 + int(rng, n - w - 1), y0 = 1 + int(rng, n - h - 1);
    const cells = [];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) cells.push([x, y]);
    const twins = cells.map(([x, y]) => mirror(n, x, y));
    const all = cells.concat(twins);
    // the patch and its mirror must not touch each other or anything else
    if (all.some(([x, y]) => nearMiddle(n, x, y, 1) || !taken.free(x, y, 1))) continue;
    if (cells.some(([x, y]) => twins.some(([a, b]) => Math.abs(a - x) <= 2 && Math.abs(b - y) <= 2))) continue;
    const dir = across ? int(rng, 2) * 2 : 1 + int(rng, 2) * 2;
    cells.forEach(([x, y]) => { out.push({ x, y, t: 'ice', dir }); taken.add(x, y); });
    twins.forEach(([x, y]) => { out.push({ x, y, t: 'ice', dir: (dir + 2) % 4 }); taken.add(x, y); });
    pair++;
  }
  return out;
}

function vents(n, rng) {
  const out = [], taken = makeTaken(n);
  for (let pair = 0, tries = 0; pair < 2 && tries < 400; tries++) {
    const x = 2 + int(rng, n - 4), y = 2 + int(rng, n - 4);
    const [mx, my] = mirror(n, x, y);
    if (nearMiddle(n, x, y, 2) || !taken.free(x, y, 3) || !taken.free(mx, my, 3)) continue;
    if (Math.abs(mx - x) < 4 && Math.abs(my - y) < 4) continue;
    out.push({ x, y, t: 'vent' }, { x: mx, y: my, t: 'vent' });
    taken.add(x, y); taken.add(mx, my);
    pair++;
  }
  return out;
}

function portals(n, rng) {
  const out = [], taken = makeTaken(n);
  const place = (count, gap, make) => {
    for (let k = 0, tries = 0; k < count && tries < 400; tries++) {
      const x = 1 + int(rng, n - 2), y = 1 + int(rng, n - 2);
      const [mx, my] = mirror(n, x, y);
      if (nearMiddle(n, x, y, 1) || !taken.free(x, y, gap) || !taken.free(mx, my, gap)) continue;
      if (Math.abs(mx - x) < 4 && Math.abs(my - y) < 4) continue;
      out.push(...make(x, y, mx, my, k));
      taken.add(x, y); taken.add(mx, my);
      k++;
    }
  };
  // each portal's twin is its mirror spot, so both players get the same deal
  place(2, 2, (x, y, mx, my, k) => [
    { x, y, t: 'portal', pair: k, twin: my * n + mx },
    { x: mx, y: my, t: 'portal', pair: k, twin: y * n + x }
  ]);
  place(2, 1, (x, y, mx, my) => [{ x, y, t: 'hole' }, { x: mx, y: my, t: 'hole' }]);
  return out;
}
