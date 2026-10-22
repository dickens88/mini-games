// Party events: every few moves something happens to the board. Each board
// has its own mix (data/boards.js). An event never makes a five — it only
// takes stones away or adds rocks, ice and gifts — so it can't win the game
// for anyone. Each run() changes the game and pushes what happened onto ev
// for the screen to animate.

import { MAX_ITEMS } from '../config.js';
import { at, xy, open, solid, longestLines, DIRS } from './board.js';
import { rules, randInt, removeStone, giveItem, pickSpots, addGifts, giftCount } from './state.js';

// the 3×3 patch around i, clipped to the board
function patch(s, i) {
  const [x, y] = xy(s, i), out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const j = at(s, x + dx, y + dy);
    if (j >= 0) out.push(j);
  }
  return out;
}

const loose = (s, i) => s.stone[i] >= 0 && !s.shield[i];

export const EVENTS = {
  meteor: {
    name: 'Meteor!', blurb: 'A meteor smashes a 3×3 patch. The crater stays for a round.',
    run(s, ev) {
      // aim where the stones are: try a few spots and take the busiest
      let best = -1, most = -1;
      for (let k = 0; k < 8; k++) {
        const c = at(s, 1 + randInt(s, s.n - 2), 1 + randInt(s, s.n - 2));
        const hits = patch(s, c).filter(j => loose(s, j)).length;
        if (hits > most) { most = hits; best = c; }
      }
      const cells = patch(s, best);
      const hit = cells.filter(j => removeStone(s, j));
      for (const j of cells) {
        if (solid(s, j)) continue;
        s.gift[j] = false;
        if (s.stone[j] < 0) { s.block[j] = Math.max(s.block[j], 2); s.blockKind[j] = 'crater'; }
      }
      ev.push({ type: 'meteor', at: best, cells, hit });
    }
  },

  lightning: {
    name: 'Lightning!', blurb: 'Lightning strikes the longest line on the board and knocks out a stone.',
    ok: s => longestLines(s).len >= 3,
    run(s, ev) {
      const { lines } = longestLines(s);
      const line = lines[randInt(s, lines.length)];
      // the middle stone hurts the most; shields send the bolt along the line
      const order = line.map((j, k) => [j, Math.abs(k - (line.length - 1) / 2)]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
      const target = order.find(j => !s.shield[j]);
      if (target === undefined) { ev.push({ type: 'lightning', at: order[0], line, hit: -1 }); return; }
      const p = s.stone[target];
      removeStone(s, target);
      ev.push({ type: 'lightning', at: target, line, hit: target, p });
    }
  },

  rockslide: {
    name: 'Rockslide!', blurb: 'Three rocks tumble onto empty spots.',
    run(s, ev) {
      const cells = pickSpots(s, 3, i => open(s, i, 0) && open(s, i, 1) && !s.gift[i] && !s.terrain[i], 1);
      cells.forEach(i => { s.rock[i] = true; });
      ev.push({ type: 'rocks', cells });
    }
  },

  giftShower: {
    name: 'Gift shower!', blurb: 'New gift boxes drop in.',
    ok: s => giftCount(s) < rules(s).maxGifts,
    run(s, ev) {
      ev.push({ type: 'gifts', cells: addGifts(s, Math.min(3, rules(s).maxGifts + 1 - giftCount(s))) });
    }
  },

  lucky: {
    name: 'Lucky dip!', blurb: 'Both players get a free item.',
    ok: s => s.items[0].length < MAX_ITEMS || s.items[1].length < MAX_ITEMS,
    run(s, ev) {
      const got = [giveItem(s, 0), giveItem(s, 1)];
      ev.push({ type: 'lucky', got });
    }
  },

  frostWave: {
    name: 'Cold snap!', blurb: 'Two patches freeze over. Nobody can go there for two moves.',
    run(s, ev) {
      const cells = [];
      for (const c of pickSpots(s, 2, i => !solid(s, i), 1)) {
        for (const j of patch(s, c)) {
          if (cells.includes(j) || solid(s, j)) continue;
          s.frost[j] = 2; s.frostFor[j] = 2;
          cells.push(j);
        }
      }
      ev.push({ type: 'frost', cells });
    }
  },

  snowball: {
    name: 'Snowball!', blurb: 'A giant snowball rolls across the board and bowls over the first stone it hits.',
    run(s, ev) {
      // try lines until one has a stone to hit
      let pick = null;
      for (let k = 0; k < 12 && !pick; k++) {
        const d = randInt(s, 4), lane = 1 + randInt(s, s.n - 2);
        const [dx, dy] = DIRS[d];
        const start = dx ? (dx > 0 ? 0 : s.n - 1) : lane;
        const startY = dy ? (dy > 0 ? 0 : s.n - 1) : lane;
        const path = [];
        let hit = -1;
        for (let x = start, y = startY, j; (j = at(s, x, y)) >= 0; x += dx, y += dy) {
          path.push(j);
          if (s.stone[j] >= 0 || solid(s, j)) { hit = j; break; }
        }
        if (k === 11 || (hit >= 0 && s.stone[hit] >= 0)) pick = { d, path, hit };
      }
      const { hit } = pick;
      const knocked = hit >= 0 && s.stone[hit] >= 0 && removeStone(s, hit);
      ev.push({ type: 'snowball', dir: pick.d, path: pick.path, hit, knocked });
    }
  },

  eruption: {
    name: 'Eruption!', blurb: 'The vents spit lava. Stones it lands on are burnt, and the lava cools for a round and a half.',
    run(s, ev) {
      const blobs = [];
      for (let v = 0; v < s.terrain.length; v++) {
        if (!s.terrain[v] || s.terrain[v].t !== 'vent') continue;
        const [x, y] = xy(s, v), spots = [];
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const j = at(s, x + dx, y + dy);
          if (j < 0 || solid(s, j) || blobs.some(b => b.at === j)) continue;
          // lava likes stones
          for (let w = s.stone[j] >= 0 ? 3 : 1; w > 0; w--) spots.push(j);
        }
        if (!spots.length) continue;
        const j = spots[randInt(s, spots.length)];
        const hit = removeStone(s, j);
        if (s.stone[j] < 0) { s.block[j] = Math.max(s.block[j], 3); s.blockKind[j] = 'lava'; s.gift[j] = false; }
        blobs.push({ from: v, at: j, hit });
      }
      ev.push({ type: 'eruption', blobs });
    }
  }
};

// the next event for this board, skipping ones that would do nothing
export function pickEvent(s, pool) {
  const ok = pool.filter(id => !EVENTS[id].ok || EVENTS[id].ok(s));
  return ok.length ? ok[randInt(s, ok.length)] : 'rockslide';
}

export function runEvent(s, id, ev) {
  ev.push({ type: 'event', id });
  EVENTS[id].run(s, ev);
}
