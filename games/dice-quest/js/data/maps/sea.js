// Pirate Seas — sail a spiral of islands in to the treasure in the middle.

const route = [];
const TURNS = 2.2, R0 = 46, R1 = 17;
for (let k = 0; k <= 400; k++) {
  const t = k / 400;
  const a = Math.PI * 0.75 + t * TURNS * Math.PI * 2;
  const r = R0 + (R1 - R0) * t;
  route.push({ x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r });
}
route.push({ x: 50, y: 50 });

export default {
  id: 'sea',
  name: 'Pirate Seas',
  icon: '🏴‍☠️',
  blurb: 'Ride dolphins, beware of sharks and the mighty kraken.',
  cells: 60,
  smooth: false,
  route,
  start: { name: 'Harbour', icon: '⚓' },
  goal: { name: 'Treasure island', icon: '💰' },
  kinds: {
    ladder:  { name: 'Dolphin ride', icon: '🐬', desc: 'Hop on and zoom ahead!' },
    slide:   { name: 'Shark',        icon: '🦈', desc: 'Swim for it — back you go.' },
    portal:  { name: 'Whirlpool',    icon: '🌀', desc: 'Spun away to the other whirlpool.' },
    trap:    { name: 'Seaweed',      icon: '🌿', desc: 'Tangled — miss a turn.' },
    boost:   { name: 'Fair wind',    icon: '⛵', desc: 'Sails full, 3 cells ahead.' },
    setback: { name: 'Storm',        icon: '⛈️', desc: 'Blown back 3.' },
    box:     { name: 'Treasure chest', icon: '🧰', desc: 'Win an item.' },
    again:   { name: 'Mermaid',      icon: '🧜', desc: 'Roll again.' },
    kraken:  { name: 'Kraken',       icon: '🐙', desc: 'Grabs whoever is in the lead and drags them back 6.' }
  },
  features: [
    ['ladder', 4, 16], ['ladder', 20, 33], ['ladder', 38, 50],
    ['slide', 27, 12], ['slide', 44, 29], ['slide', 56, 40],
    ['portal', 9, 35], ['portal', 24, 47],
    ['trap', 18], ['trap', 52],
    ['boost', 6], ['boost', 31], ['boost', 42],
    ['setback', 14], ['setback', 54],
    ['box', 2], ['box', 11], ['box', 22], ['box', 37], ['box', 45], ['box', 57],
    ['again', 26], ['again', 49],
    ['kraken', 39]
  ]
};
