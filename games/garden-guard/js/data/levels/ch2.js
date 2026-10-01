// Chapter 2 — Pumpkin Hollow. Autumn colours, every tower, and the tougher
// bugs: wasps, snails, and in the end more than one queen.
// Grid legend and level fields: see ch1.js.

const ALL = ['pea', 'melon', 'mint', 'cactus', 'sunflower'];

export default [
  {
    id: '2-1', name: 'Pumpkin Patch', theme: 'autumn',
    gold: 240, hpMul: 1.1,
    towers: ALL, powers: ['rain', 'bees'],
    grid: [
      't.p.o..o.o.t',
      '.o..o..####S',
      '..o....#.o..',
      '.o..o.o#..p.',
      '..######.o..',
      '.o#.o..o..p.',
      '..####.o..t.',
      'p..o.E.o...t'
    ],
    waves: [
      'ant*12@0.6',
      'wasp*5@1',
      'beetle*6@1, ant*10@0.5',
      'hopper*8@0.8, wasp*5@0.8',
      'cater*8@0.9',
      'lady*16@0.35, wasp*8@0.6',
      'beetle*10@0.8, hopper*8@0.7',
      'wasp*14@0.45, moth*12@0.4',
      'cater*12@0.7, beetle*8@0.8',
      'hopper*14@0.5, wasp*12@0.4, beetle*10@0.7'
    ]
  },
  {
    // the garden is in the middle and the road spirals in to it
    id: '2-2', name: 'Leafy Loop', theme: 'autumn',
    gold: 240, hpMul: 1.15,
    towers: ALL, powers: ['rain', 'bees'],
    grid: [
      't.o..S.o..pt',
      '..o..#..o...',
      '.#####.####.',
      'o#.o.o.#.o#o',
      '.#.oE###.o#.',
      'o#.o..o.o.#o',
      '.##########.',
      't.o..o..o.pt'
    ],
    waves: [
      'ant*14@0.5',
      'snail*3@2.5',
      'beetle*6@1, lady*10@0.4',
      'snail*5@1.8, ant*12@0.5',
      'wasp*10@0.6, hopper*8@0.7',
      'cater*10@0.8',
      'snail*8@1.4, beetle*6@1',
      'lady*20@0.3, wasp*10@0.5',
      'hopper*14@0.5, snail*6@1.4',
      'beetle*12@0.7, cater*10@0.7',
      'snail*10@1.1, wasp*14@0.4, ant*20@0.3'
    ]
  },
  {
    // two anthills, one road to the garden
    id: '2-3', name: 'Crossroads', theme: 'autumn',
    gold: 260, hpMul: 1.1,
    towers: ALL, powers: ['rain', 'bees'],
    grid: [
      't..o..o..o.t',
      'S####.o.o...',
      '..o.#.o.o.o.',
      '.o..#####.o.',
      'f.o.#.o.#.o.',
      '.o..#.o.#o..',
      'S####...###E',
      't.o..o.o...t'
    ],
    waypoints: [
      [[-1, 1], [4, 1], [4, 3], [8, 3], [8, 6], [12, 6]],
      [[-1, 6], [4, 6], [4, 3], [8, 3], [8, 6], [12, 6]]
    ],
    waves: [
      'ant*16@0.5',
      'lady*14@0.4',
      'beetle*8@0.9',
      'wasp*12@0.5, moth*10@0.4',
      'snail*6@1.4',
      'hopper*14@0.5',
      'cater*12@0.7',
      'beetle*12@0.7, lady*16@0.3',
      'snail*8@1.1, wasp*14@0.4',
      'hopper*16@0.4, cater*10@0.7',
      'beetle*16@0.6, moth*20@0.3',
      'snail*10@1, hopper*16@0.4, wasp*16@0.35'
    ]
  },
  {
    // two anthills join early, then one long road down to the garden
    id: '2-4', name: 'Harvest Moon', theme: 'autumn',
    gold: 300, hpMul: 1.2,
    towers: ALL, powers: ['rain', 'bees'],
    grid: [
      't.o..oS.o..t',
      '.o..o.#.o.o.',
      'S##########.',
      '.o.o.o.o.o#.',
      'f.o..o..o.#o',
      '...########.',
      '.o.#.o.o.o..',
      't.oE..o..o.t'
    ],
    waypoints: [
      [[-1, 2], [10, 2], [10, 5], [3, 5], [3, 8]],
      [[6, -1], [6, 2], [10, 2], [10, 5], [3, 5], [3, 8]]
    ],
    waves: [
      'ant*18@0.45',
      'beetle*8@0.9, lady*10@0.4',
      'wasp*12@0.5',
      'snail*6@1.3, hopper*8@0.7',
      'cater*12@0.7',
      'queen:0, ant*12@0.6+2',
      'beetle*14@0.6, moth*16@0.35',
      'hopper*18@0.4',
      'snail*10@1, wasp*14@0.4',
      'lady*30@0.25',
      'cater*14@0.6, beetle*12@0.6',
      'queen:1, hopper*14@0.5+2',
      'snail*12@0.9, wasp*20@0.3',
      'beetle*20@0.5, cater*14@0.6, moth*20@0.3',
      'queen:0, queen+1:1, beetle*14@0.6+4, wasp*16@0.35'
    ]
  }
];
