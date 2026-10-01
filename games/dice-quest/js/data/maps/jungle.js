// Jungle Trek — a winding trail up through the rainforest to a lost temple.
// The route snakes back and forth in six rows (board is 100 × 100 units).

const ROWS = [90, 74, 58, 42, 26, 11];
const route = [];
ROWS.forEach((y, r) => {
  const xs = [9, 27, 46, 65, 88];
  const row = xs.map((x, k) => ({ x, y: y + Math.sin(k * 1.7 + r) * 2.2 }));
  if (r % 2) row.reverse();
  route.push(...row);
  if (r < ROWS.length - 1) route.push({ x: r % 2 ? 4 : 94, y: y - 8 });
});

export default {
  id: 'jungle',
  name: 'Jungle Trek',
  icon: '🌴',
  blurb: 'Swing on vines, dodge snakes and find the lost temple.',
  cells: 64,
  smooth: true,
  route,
  start: { name: 'Camp', icon: '⛺' },
  goal: { name: 'Lost temple', icon: '🛕' },
  kinds: {
    ladder:  { name: 'Vine swing',    icon: '🌿', desc: 'Swing ahead!' },
    slide:   { name: 'Snake',         icon: '🐍', desc: 'Slither back down.' },
    portal:  { name: 'Temple gate',   icon: '🗿', desc: 'Step through to the other gate.' },
    trap:    { name: 'Quicksand',     icon: '⏳', desc: 'Stuck — miss a turn.' },
    boost:   { name: 'River rapids',  icon: '🌊', desc: 'Whoosh, 3 cells ahead.' },
    setback: { name: 'Cheeky monkey', icon: '🐒', desc: 'It chases you back 3.' },
    box:     { name: 'Treasure',      icon: '🎁', desc: 'Win an item.' },
    again:   { name: 'Toucan',        icon: '🦜', desc: 'Roll again.' },
    quake:   { name: 'Earthquake',    icon: '💥', desc: 'Everyone else stumbles back 2.' }
  },
  features: [
    ['ladder', 3, 14], ['ladder', 11, 27], ['ladder', 22, 37], ['ladder', 41, 55],
    ['slide', 25, 9], ['slide', 34, 19], ['slide', 47, 30], ['slide', 61, 50],
    ['portal', 17, 44],
    ['trap', 20], ['trap', 51],
    ['boost', 7], ['boost', 39],
    ['setback', 29], ['setback', 57],
    ['box', 5], ['box', 13], ['box', 24], ['box', 33], ['box', 49], ['box', 59],
    ['again', 16], ['again', 46],
    ['quake', 36]
  ]
};
