// Pea Pod: cheap, quick single-target shooter that can hit anything.
//
// A tower definition is plain data. levels[0] is the tower as built; each
// later entry is one upgrade and carries the price of that upgrade.
// Stats: dmg per shot, range in tiles, rate = seconds between shots.

export default {
  id: 'pea', name: 'Pea Pod', key: '1',
  blurb: 'Fires peas, fast. Cheap and hits both crawlers and flyers.',
  cost: 50,
  hitsGround: true, hitsAir: true,
  attack: 'shoot',
  projectile: { speed: 9, look: 'pea' },
  levels: [
    { dmg: 6, range: 2.5, rate: 0.5 },
    { dmg: 9, range: 2.75, rate: 0.45, cost: 40 },
    { dmg: 14, range: 3.0, rate: 0.4, cost: 60 }
  ]
};
