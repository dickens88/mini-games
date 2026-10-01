// Chapter 1 — Sunny Patch.
//
// Grid legend (12 × 8):
//   S start   E the garden (enemies eat flowers here)   # road   o build pad
//   . grass   t bush   f flowers   r rock   m mushroom   (decoration only)
//
// hpMul scales every enemy's health in the level; waves use the format in core/waves.js.

export default [
  {
    id: '1-1', name: 'Carrot Lane',
    gold: 120, hpMul: 1,
    towers: ['pea'],
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
  }
];
