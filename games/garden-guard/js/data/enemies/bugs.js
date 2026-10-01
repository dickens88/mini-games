// Ordinary garden pests. Units: hp, speed in tiles per second, size as a
// fraction of a tile (for drawing and for "did the shot reach it").
//
// Optional hooks, called by the simulation with a ctx object (see core/sim.js):
//   onTick(ctx, enemy, dt)   every step while alive
//   onDeath(ctx, enemy)      once, when killed by a tower

export const ant = {
  id: 'ant', name: 'Ant',
  blurb: 'Marches in long lines. Not fast, not tough — just lots of them.',
  hp: 20, speed: 1.0, armor: 0, bounty: 3, bite: 1, size: 0.26
};

export const ladybug = {
  id: 'lady', name: 'Ladybug',
  blurb: 'Zooms along the path. Fragile, but slips past slow towers.',
  hp: 14, speed: 1.8, armor: 0, bounty: 3, bite: 1, size: 0.24
};

export default [ant, ladybug];
