// Melon Lobber: slow, lobs a melon in an arc that splats everything nearby on
// the ground. Can't reach flyers.

export default {
  id: 'melon', name: 'Melon Lobber', key: '2',
  blurb: 'Lobs melons that splat a whole crowd. Ground bugs only.',
  cost: 90,
  hitsGround: true, hitsAir: false,
  attack: 'shoot',
  projectile: { speed: 5, look: 'melon' },
  show: ['dmg', 'splash', 'range', 'rate'],
  levels: [
    { dmg: 14, splash: 0.9, range: 2.6, rate: 1.8 },
    { dmg: 22, splash: 1.0, range: 2.8, rate: 1.7, cost: 80 },
    { dmg: 34, splash: 1.15, range: 3.0, rate: 1.6, cost: 120 }
  ]
};
