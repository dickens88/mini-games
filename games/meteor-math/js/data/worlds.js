// The four worlds and their levels. Each level says which tables it is about
// and how it plays:
//   tables, upTo  the facts: one factor from `tables`, the other 1…upTo
//   ops           how often each kind of question comes up
//                   mul 7 × 8   div 56 ÷ 7   miss 7 × ? = 56
//   goal          meteors to clear
//   maxOn         most meteors falling at once
//   fall          seconds a meteor takes from the top to the ground
//   gap           seconds between new meteors
//   ufo           a golden UFO about every this many seconds (0: none)
//   shower        a meteor shower once in the level
//   split         share of meteors that are big and split in two
//   boss          a boss to beat instead of a meteor count

const L = (o) => Object.assign({ upTo: 9, ufo: 0, shower: false, split: 0, maxOn: 3, gap: 3.6, boss: null }, o);

export const WORLDS = [
  {
    id: 'moon', name: 'Moon Base', blurb: 'Times tables 1–9, quick as a flash',
    levels: [
      L({ name: 'Warm-up', tables: [6, 7], ops: { mul: 1 }, goal: 14, maxOn: 2, fall: 11, gap: 4.0 }),
      L({ name: 'Eights & Nines', tables: [8, 9], ops: { mul: 1 }, goal: 15, maxOn: 2, fall: 10.5, gap: 3.8 }),
      L({ name: 'UFO Sighting', tables: [6, 7, 8, 9], ops: { mul: 1 }, gap: 3.6, goal: 18, fall: 10, ufo: 22 }),
      L({ name: 'Star Shower', tables: [3, 4, 5, 6, 7, 8, 9], ops: { mul: 1 }, gap: 3.5, goal: 20, fall: 9.5, ufo: 24, shower: true }),
      L({ name: 'Crater Rush', tables: [6, 7, 8, 9], ops: { mul: 1 }, goal: 22, fall: 9, gap: 3.3, ufo: 20, shower: true })
    ],
    boss: L({ name: 'Rocky the Golem', tables: [6, 7, 8, 9], ops: { mul: 1 }, goal: 0, maxOn: 2, fall: 11, gap: 6,
      boss: { art: 'golem', hp: 10, time: 30 } })
  },
  {
    id: 'ocean', name: 'Ocean Planet', blurb: 'Dividing by 2 to 9',
    levels: [
      L({ name: 'First Dive', tables: [2, 3, 4, 5], ops: { div: 1 }, goal: 14, maxOn: 2, fall: 12, gap: 4.0 }),
      L({ name: 'Bubble Split', tables: [6, 7], ops: { div: 3, mul: 1 }, goal: 15, maxOn: 2, fall: 11.5, gap: 4.2, split: 0.35 }),
      L({ name: 'Deep Dark', tables: [8, 9], ops: { div: 3, mul: 1 }, gap: 4.0, goal: 16, fall: 11, split: 0.3, ufo: 24 }),
      L({ name: 'Coral Shower', tables: [6, 7, 8, 9], ops: { div: 1, mul: 1 }, gap: 3.8, goal: 18, fall: 10.5, split: 0.3, ufo: 22, shower: true }),
      L({ name: 'Tidal Wave', tables: [2, 3, 4, 5, 6, 7, 8, 9], ops: { div: 1, mul: 1 }, goal: 20, fall: 10, gap: 3.8, split: 0.3, ufo: 20, shower: true })
    ],
    boss: L({ name: 'Kraken', tables: [6, 7, 8, 9], ops: { div: 2, mul: 1 }, goal: 0, maxOn: 2, fall: 11.5, gap: 6,
      boss: { art: 'kraken', hp: 12, time: 32 } })
  },
  {
    id: 'candy', name: 'Candy Nebula', blurb: 'The 11 and 12 times tables',
    levels: [
      L({ name: 'Elevens', tables: [11], upTo: 12, ops: { mul: 1 }, goal: 14, maxOn: 2, fall: 11.5, gap: 4.0 }),
      L({ name: 'Twelves', tables: [12], upTo: 12, ops: { mul: 1 }, goal: 15, maxOn: 2, fall: 11.5, gap: 4.0 }),
      L({ name: 'Missing Sweets', tables: [11, 12], upTo: 12, ops: { mul: 2, miss: 1 }, gap: 3.9, goal: 16, fall: 11, ufo: 24 }),
      L({ name: 'Sugar Shower', tables: [10, 11, 12], upTo: 12, ops: { mul: 2, miss: 1, div: 1 }, gap: 4.1, goal: 18, fall: 10.5, ufo: 22, shower: true, split: 0.25 }),
      L({ name: 'Gumball Storm', tables: [11, 12], upTo: 12, ops: { mul: 2, div: 2, miss: 1 }, gap: 4.1, goal: 18, fall: 11, split: 0.2, ufo: 20, shower: true })
    ],
    boss: L({ name: 'Gummy King', tables: [11, 12], upTo: 12, ops: { mul: 2, div: 1, miss: 1 }, goal: 0, maxOn: 2, fall: 12, gap: 6.2,
      boss: { art: 'gummy', hp: 11, time: 40 } })
  },
  {
    id: 'volcano', name: 'Volcano Star', blurb: 'Everything from 1×1 to 12×12',
    levels: [
      L({ name: 'Hot Rocks', tables: [6, 7, 8, 9], upTo: 12, ops: { mul: 1, div: 1 }, gap: 3.7, goal: 16, fall: 10.5 }),
      L({ name: 'Lava Gaps', tables: [3, 4, 5, 6, 7, 8, 9, 11, 12], upTo: 12, ops: { mul: 2, miss: 1 }, gap: 3.6, goal: 18, fall: 10, ufo: 22 }),
      L({ name: 'Ash Cloud', tables: [3, 4, 5, 6, 7, 8, 9, 11, 12], upTo: 12, ops: { div: 2, mul: 1 }, gap: 3.8, goal: 18, fall: 10, split: 0.3, ufo: 22 }),
      L({ name: 'Fire Shower', tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], upTo: 12, ops: { mul: 2, div: 2, miss: 1 }, goal: 22, maxOn: 4, fall: 10, gap: 3.6, split: 0.3, ufo: 20, shower: true }),
      L({ name: 'Eruption', tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], upTo: 12, ops: { mul: 2, div: 2, miss: 1 }, goal: 24, maxOn: 3, fall: 10.5, gap: 4.3, split: 0.25, ufo: 18, shower: true })
    ],
    boss: L({ name: 'Magma Mole', tables: [6, 7, 8, 9, 11, 12], upTo: 12, ops: { mul: 2, div: 2, miss: 1 }, goal: 0, maxOn: 2, fall: 11, gap: 5.6,
      boss: { art: 'mole', hp: 14, time: 38 } })
  }
];

// every level as one list, each with an id like "2-3" or "2-B" and its world
export const LEVELS = [];
WORLDS.forEach((w, wi) => {
  w.levels.forEach((l, i) => LEVELS.push(Object.assign(l, { id: `${wi + 1}-${i + 1}`, world: wi, index: i })));
  LEVELS.push(Object.assign(w.boss, { id: `${wi + 1}-B`, world: wi, index: w.levels.length }));
});
export const levelById = id => LEVELS.find(l => l.id === id);

// endless: everything, getting faster
export const ENDLESS = L({ id: 'endless', name: 'Endless', world: 0, tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], upTo: 12,
  ops: { mul: 9, div: 8, miss: 3 }, goal: 0, maxOn: 2, fall: 11.5, gap: 4, ufo: 22, split: 0.25, endless: true });

// weak spots: the shakiest facts, slow, with hints and no shield to lose
export function weakSpec(pairs) {
  return L({ id: 'weak', name: 'Weak Spots', world: 0, tables: [], upTo: 12, ops: { mul: 1 }, goal: 20, maxOn: 2,
    fall: 15, gap: 3.4, gentle: true, pairs });
}
