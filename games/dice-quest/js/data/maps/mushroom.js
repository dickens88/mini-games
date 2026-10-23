// Mushroom Hollow — two fairy rings joined in an S: spiral out of the
// mushroom cottage, cross over, and spiral in to the wizard's tower.

const C1 = { x: 28, y: 72 }, C2 = { x: 72, y: 28 };
const R0 = 10, R1 = 26, TURNS = 1.75;
const EXIT = -Math.PI / 4 - 0.6, ENTER = Math.PI * 3 / 4 - 0.6;

function spiral(c, a0, dir, r0, r1) {
  const out = [];
  const n = Math.round(TURNS * 15);
  for (let k = 0; k <= n; k++) {
    const t = k / n, a = a0 + dir * t * TURNS * Math.PI * 2, r = r0 + (r1 - r0) * t;
    out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  return out;
}

// a half circle between a spiral's centre and its inner end, so the trail
// leaves (or reaches) the centre without a sharp corner
function hook(c, a, dir, fromCentre) {
  const m = { x: c.x + Math.cos(a) * R0 / 2, y: c.y + Math.sin(a) * R0 / 2 };
  const pts = [];
  for (let k = 0; k <= 8; k++) {
    const t = fromCentre ? k / 8 : 1 - k / 8;
    const f = a - dir * Math.PI * (1 - t);
    pts.push({ x: m.x + Math.cos(f) * R0 / 2, y: m.y + Math.sin(f) * R0 / 2 });
  }
  return pts;
}

const a0 = EXIT - TURNS * Math.PI * 2, b1 = ENTER - TURNS * Math.PI * 2;
const route = [
  ...hook(C1, a0, 1, true).slice(0, -1),
  ...spiral(C1, a0, 1, R0, R1),
  ...spiral(C2, ENTER, -1, R1, R0),
  ...hook(C2, b1, 1, false).slice(1)
];

export default {
  id: 'mushroom',
  name: 'Mushroom Hollow',
  icon: '🍄',
  blurb: 'Bounce on toadstools, ride fairy rings and dodge the wizard’s wild spells.',
  cells: 64,
  smooth: true,
  route,
  start: { name: 'Mushroom cottage', icon: '🏡' },
  goal: { name: 'Wizard’s tower', icon: '🔮' },
  kinds: {
    ladder:  { name: 'Fungus stairs',  icon: '🍄', desc: 'Climb the shelf mushrooms up and ahead!' },
    slide:   { name: 'Caterpillar',    icon: '🐛', desc: 'Slide down its squishy back.' },
    portal:  { name: 'Fairy ring',     icon: '🧚', desc: 'Step in the ring, pop out of the other one.' },
    trap:    { name: 'Sleepy spores',  icon: '💤', desc: 'Achoo… zzz — miss a turn.' },
    boost:   { name: 'Puffball',       icon: '💨', desc: 'Poof! Blown 3 cells ahead.' },
    setback: { name: 'Grumpy toad',    icon: '🐸', desc: 'It croaks you back 3.' },
    box:     { name: 'Potion',         icon: '🧪', desc: 'Win an item.' },
    again:   { name: 'Magic wand',     icon: '🪄', desc: 'Roll again.' },
    spell:   { name: 'Wizard',         icon: '🧙', desc: 'Casts a random spell: zoom 5 ahead, put the leader to sleep, swap first and last, or potions for all!' }
  },
  features: [
    ['ladder', 3, 18], ['ladder', 9, 28], ['ladder', 32, 52], ['ladder', 38, 56],
    ['slide', 22, 5], ['slide', 29, 12], ['slide', 54, 35], ['slide', 60, 45],
    ['portal', 15, 43], ['portal', 26, 34],
    ['trap', 20], ['trap', 57],
    ['boost', 8], ['boost', 46],
    ['setback', 27], ['setback', 59],
    ['box', 2], ['box', 13], ['box', 25], ['box', 36], ['box', 47], ['box', 58],
    ['again', 17], ['again', 41],
    ['spell', 31], ['spell', 50]
  ]
};
