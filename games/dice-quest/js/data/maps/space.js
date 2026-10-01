// Star Voyage — hop between star stations up and down five columns of space.

const COLS = [11, 30.5, 50, 69.5, 89];
const route = [];
COLS.forEach((x, c) => {
  const ys = [89, 74, 59, 44, 29, 14];
  const col = ys.map((y, k) => ({ x: x + (k % 2 ? 2.4 : -2.4), y }));
  if (c % 2) col.reverse();
  route.push(...col);
  // a flat-topped bend over to the next column
  if (c < COLS.length - 1) {
    const y = c % 2 ? 96 : 6;
    route.push({ x: x + 4, y }, { x: x + 15.5, y });
  }
});

export default {
  id: 'space',
  name: 'Star Voyage',
  icon: '🚀',
  blurb: 'Blast off on rockets, skip through wormholes, avoid black holes.',
  cells: 64,
  smooth: false,
  route,
  start: { name: 'Launch pad', icon: '🛰️' },
  goal: { name: 'Home planet', icon: '🪐' },
  kinds: {
    ladder:  { name: 'Rocket',        icon: '🚀', desc: 'Blast ahead!' },
    slide:   { name: 'Black hole',    icon: '🕳️', desc: 'Sucked back down.' },
    portal:  { name: 'Wormhole',      icon: '🌀', desc: 'Pop out of the other end.' },
    trap:    { name: 'Tractor beam',  icon: '🛸', desc: 'Held by aliens — miss a turn.' },
    boost:   { name: 'Solar wind',    icon: '☀️', desc: 'Pushed 3 cells ahead.' },
    setback: { name: 'Meteor',        icon: '☄️', desc: 'Knocked back 3.' },
    box:     { name: 'Supply crate',  icon: '📦', desc: 'Win an item.' },
    again:   { name: 'Shooting star', icon: '🌠', desc: 'Roll again.' },
    shuffle: { name: 'Teleporter',    icon: '🔮', desc: 'Swap places with a random player!' }
  },
  features: [
    ['ladder', 6, 21], ['ladder', 28, 43], ['ladder', 45, 58],
    ['slide', 19, 4], ['slide', 38, 24], ['slide', 53, 35], ['slide', 62, 52],
    ['portal', 12, 31], ['portal', 40, 55],
    ['trap', 16], ['trap', 50],
    ['boost', 9], ['boost', 33],
    ['setback', 26], ['setback', 60],
    ['box', 3], ['box', 14], ['box', 23], ['box', 36], ['box', 48], ['box', 57],
    ['again', 18], ['again', 42],
    ['shuffle', 30]
  ]
};
