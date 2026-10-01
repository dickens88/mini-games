// Cactus: a sniper. Long range, slow, and its spines go straight through
// armour. Aims at the toughest bug by default.

export default {
  id: 'cactus', name: 'Cactus', key: '4',
  blurb: 'Long-range spines that pierce armour. Picks on the toughest bug.',
  cost: 110,
  hitsGround: true, hitsAir: true,
  attack: 'shoot',
  mode: 'strong',
  projectile: { speed: 18, look: 'spine' },
  show: ['dmg', 'range', 'rate'],
  levels: [
    { dmg: 38, range: 4.0, rate: 2.2, pierce: true },
    { dmg: 60, range: 4.4, rate: 2.0, cost: 100 },
    { dmg: 95, range: 4.8, rate: 1.8, cost: 150 }
  ]
};
