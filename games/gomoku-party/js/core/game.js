// Taking turns: using an item, putting down a stone, and what happens at the
// end of each move (timers tick, gifts appear, party events go off). Every
// action returns a list of what happened, in order, for the screen to play
// back; null means the action wasn't allowed.

import { itemById } from '../data/items.js';
import { open, anyOpen, landing, fiveAt, nearStones, xy, at } from './board.js';
import { rules, randInt, giveItem, removeStone, addGifts, giftCount } from './state.js';
import { pickEvent, runEvent } from './events.js';

export { newGame } from './state.js';

// ---------- items ----------

function paintWins(s, i, p) {
  const was = s.stone[i];
  s.stone[i] = p;
  const win = !!fiveAt(s, i);
  s.stone[i] = was;
  return win;
}

export function canTarget(s, id, i, p = s.turn) {
  if (i < 0 || i >= s.stone.length) return false;
  switch (itemById(id).target) {
    case 'enemy': return s.stone[i] === 1 - p && !s.shield[i] && !(id === 'paint' && paintWins(s, i, p));
    case 'mine': return s.stone[i] === p && !s.shield[i];
    case 'empty': return open(s, i, p) && !s.gift[i];
    default: return true;
  }
}

export function targets(s, id, p = s.turn) {
  const out = [];
  for (let i = 0; i < s.stone.length; i++) if (canTarget(s, id, i, p)) out.push(i);
  return out;
}

export function canUseItems(s) {
  return s.winner === null && !s.usedItem;
}

export function useItem(s, slot, i) {
  const p = s.turn, id = s.items[p][slot];
  if (!id || !canUseItems(s) || !canTarget(s, id, i, p)) return null;
  s.items[p].splice(slot, 1);
  s.usedItem = true;
  s.stats.items[p]++;
  const ev = [{ type: 'use', p, item: id, at: i }];
  if (id === 'bomb') {
    removeStone(s, i);
    s.block[i] = 2; s.blockKind[i] = 'crater';
    s.gift[i] = false;
    ev.push({ type: 'bomb', p, at: i });
  } else if (id === 'rock') {
    s.rock[i] = true;
    ev.push({ type: 'rock', at: i });
  } else if (id === 'paint') {
    s.stone[i] = p;
    ev.push({ type: 'paint', p, at: i });
  } else if (id === 'shield') {
    s.shield[i] = true;
    ev.push({ type: 'shield', p, at: i });
  } else if (id === 'freeze') {
    const [x, y] = xy(s, i), cells = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const j = at(s, x + dx, y + dy);
      if (j < 0) continue;
      s.frost[j] = 2; s.frostFor[j] = 1 - p;
      cells.push(j);
    }
    ev.push({ type: 'freeze', p, at: i, cells });
  }
  // a rock on the last free spot: nothing left to do but pass
  if (!anyOpen(s, p)) endTurn(s, ev);
  return ev;
}

// ---------- stones ----------

function collect(s, i, p, ev) {
  if (!s.gift[i]) return;
  s.gift[i] = false;
  const item = giveItem(s, p);
  if (item) s.stats.gifts[p]++;
  ev.push({ type: 'gift', p, at: i, item });
}

export function place(s, i) {
  const p = s.turn;
  if (s.winner !== null || !open(s, i, p)) return null;
  const { to, path, twin } = landing(s, i, p);
  const ev = [{ type: 'place', p, at: i, to, path }];
  s.stone[to] = p;
  s.stats.placed[p]++;
  s.last = to;
  collect(s, to, p, ev);
  if (twin >= 0) {
    s.stone[twin] = p;
    s.stats.placed[p]++;
    ev.push({ type: 'twin', p, from: to, at: twin });
    collect(s, twin, p, ev);
  }
  const line = fiveAt(s, to) || (twin >= 0 && fiveAt(s, twin));
  if (line) {
    s.winner = p; s.line = line;
    ev.push({ type: 'win', p, line });
    return ev;
  }
  endTurn(s, ev);
  return ev;
}

// when the clock runs out: a stone drops on a random free spot near the action
export function randomSpot(s) {
  const p = s.turn, all = [], close = [];
  for (let i = 0; i < s.stone.length; i++) {
    if (!open(s, i, p)) continue;
    all.push(i);
    if (nearStones(s, i, 1)) close.push(i);
  }
  const pool = close.length ? close : all;
  return pool.length ? pool[randInt(s, pool.length)] : -1;
}

// ---------- end of a move ----------

function endTurn(s, ev) {
  const p = s.turn;
  s.moves++;
  for (let i = 0; i < s.block.length; i++) {
    if (s.block[i] > 0 && --s.block[i] === 0) s.blockKind[i] = '';
    if (s.frost[i] > 0 && --s.frost[i] === 0) s.frostFor[i] = -1;
  }
  if (s.party) {
    const r = rules(s);
    if (--s.nextGift <= 0) {
      s.nextGift = r.giftEvery;
      if (giftCount(s) < r.maxGifts) {
        const cells = addGifts(s, 1);
        if (cells.length) ev.push({ type: 'gifts', cells, quiet: true });
      }
    }
    if (--s.nextEvent <= 0) {
      s.nextEvent = r.eventEvery;
      runEvent(s, pickEvent(s, r.events), ev);
    }
  }
  s.turn = 1 - p;
  s.usedItem = false;
  ev.push({ type: 'turn', p: s.turn });
  if (!anyOpen(s, s.turn)) {
    if (!anyOpen(s, p)) {
      s.winner = 'draw';
      ev.push({ type: 'draw' });
    } else {
      // frozen out (or a full corner of rocks): this turn is skipped
      ev.push({ type: 'skip', p: s.turn });
      s.turn = p;
      ev.push({ type: 'turn', p });
    }
  }
}
