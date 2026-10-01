// Chapter 1 — Sunny Patch.
//
// Grid legend (12 × 8):
//   S start   E the garden (enemies eat flowers here)   # road   o build pad
//   . grass   t bush   f flowers   r rock   m mushroom   p pumpkin   (decoration only)
//
// Roads may not touch each other in the grid. Levels whose roads merge list
// `waypoints` instead: one list of [c, r] per road, starting and ending one
// tile off the map (the grid's # then only keeps pads and decoration off it).
//
// hpMul scales every enemy's health in the level; waves use the format in core/waves.js.
// towers and powers list what the player may use; theme picks the palette.

export default [
  {
    id: '1-1', name: 'Carrot Lane',
    gold: 120, hpMul: 1,
    towers: ['pea'], powers: [],
    grid: [
      't...o...o..t',
      'S#########.f',
      '.o..o..o.#o.',
      'f....o...#..',
      '..########o.',
      '.o#.o..o....',
      '..#########E',
      't...o...o..f'
    ],
    waves: [
      'ant*6@1.2',
      'ant*10@0.9',
      'ant*6@0.9, lady*4@0.7',
      'lady*10@0.6',
      'ant*12@0.6, lady*6@0.5+1.5',
      'ant*16@0.5',
      'lady*14@0.45, ant*10@0.5',
      'ant*20@0.4, lady*12@0.35+1'
    ]
  },
  {
    id: '1-2', name: 'Clover Bend',
    gold: 150, hpMul: 1.15,
    towers: ['pea', 'melon'], powers: ['rain'],
    grid: [
      't.S...o..o.t',
      '.o#.o.####..',
      '..#.o.#.o#o.',
      'f.#####..#..',
      '.o.o...o.#o.',
      '....######.f',
      't.o.#.o....t',
      '...oE...o...'
    ],
    waves: [
      'ant*8@1',
      'ant*6@0.8, lady*5@0.6',
      'beetle*3@2',
      'ant*14@0.5',
      'beetle*4@1.5, ant*8@0.6',
      'lady*12@0.45',
      'ant*10@0.5, beetle*5@1.2+1',
      'lady*8@0.4, ant*12@0.4',
      'beetle*10@0.8, lady*8@0.4',
      'ant*20@0.3, beetle*8@0.8+1, lady*14@0.3'
    ]
  },
  {
    id: '1-3', name: 'Twin Hedges',
    gold: 250, hpMul: 0.9,
    towers: ['pea', 'melon', 'mint'], powers: ['rain', 'bees'],
    grid: [
      't..o..o..o.t',
      'S####.o.###E',
      '..o.#.o.#.o.',
      '.o..#####.o.',
      'f..o.o.o.o..',
      '.o....#####E',
      'S######.o...',
      't..o..o...ft'
    ],
    waves: [
      'ant*10@0.9',
      'moth*6@0.8',
      'cater*4@1.6',
      'ant*12@0.5, lady*6@0.6',
      'beetle*4@1.2, moth*8@0.5',
      'cater*8@1',
      'lady*14@0.4',
      'beetle*6@1, cater*4@1.2',
      'moth*12@0.4, ant*12@0.4',
      'cater*8@0.9, beetle*6@0.9, lady*10@0.35'
    ]
  },
  {
    id: '1-4', name: "Queen's March",
    gold: 220, hpMul: 1.25,
    towers: ['pea', 'melon', 'mint', 'cactus'], powers: ['rain', 'bees'],
    grid: [
      't.o..o.o..ft',
      '..####.o.o..',
      '.o#..#.o###E',
      '..#o.#o.#.o.',
      '.o#..#..#o..',
      '..#.o####...',
      'S##..o..o.o.',
      't...o...o..t'
    ],
    waves: [
      'ant*12@0.7',
      'hopper*5@1.5',
      'beetle*5@1.2, moth*6@0.6',
      'cater*6@1, lady*8@0.5',
      'hopper*10@0.9',
      'beetle*8@0.9, ant*14@0.4',
      'moth*12@0.4, cater*6@0.9',
      'hopper*8@0.7, beetle*6@0.9',
      'lady*20@0.3',
      'cater*10@0.7, hopper*10@0.6',
      'beetle*12@0.7, moth*14@0.35',
      'ant*20@0.4, queen+2, beetle*6@1+3'
    ]
  }
];
