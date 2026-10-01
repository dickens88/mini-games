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

export const beetle = {
  id: 'beetle', name: 'Beetle',
  blurb: 'A hard shell shrugs off small hits. Cactus spines go right through.',
  hp: 60, speed: 0.75, armor: 4, bounty: 7, bite: 1, size: 0.3
};

// hides in its shell once, the first time it drops below half health
export const snail = {
  id: 'snail', name: 'Snail',
  blurb: 'Slow and stubborn. When hurt it hides in its shell for a moment — almost nothing gets through.',
  hp: 150, speed: 0.45, armor: 2, bounty: 12, bite: 2, size: 0.32,
  onTick(ctx, e) {
    if (!e.hid && e.hp < e.maxHp * 0.5) {
      e.hid = true;
      e.fx.shell = { t: 2.5, slow: 1 };
      ctx.emit('shell', { uid: e.uid, x: e.x, y: e.y });
    }
    e.armor = e.fx.shell ? 12 : snail.armor;
  }
};

// pops into two moths when squashed
export const caterpillar = {
  id: 'cater', name: 'Caterpillar',
  blurb: 'Chunky and slow. Squash it and two moths flutter out!',
  hp: 55, speed: 0.85, armor: 0, bounty: 6, bite: 1, size: 0.3,
  onDeath(ctx, e) {
    ctx.spawn('moth', e.path, e.d);
    ctx.spawn('moth', e.path, Math.max(0, e.d - 0.35));
  }
};

export const moth = {
  id: 'moth', name: 'Moth',
  blurb: 'Flies over the path. Melons can’t reach it.',
  hp: 16, speed: 1.3, armor: 0, bounty: 2, bite: 1, size: 0.22, flying: true
};

export const wasp = {
  id: 'wasp', name: 'Wasp',
  blurb: 'A fast flyer with a mean buzz. Peas and spines bring it down.',
  hp: 34, speed: 1.9, armor: 0, bounty: 5, bite: 1, size: 0.24, flying: true
};

// every few seconds it springs forward along the road
const HOP_EVERY = 2.6, HOP_TIME = 0.35, HOP_SPEED = 4;
export const hopper = {
  id: 'hopper', name: 'Grasshopper',
  blurb: 'Every few seconds it leaps ahead. Slow it down and the leaps shrink.',
  hp: 40, speed: 0.9, armor: 0, bounty: 5, bite: 1, size: 0.28,
  onTick(ctx, e, dt) {
    e.hop = (e.hop || 0) + dt;
    if (e.hop >= HOP_EVERY) e.hop = -HOP_TIME;          // negative = in the air
    if (e.hop < 0) e.d += HOP_SPEED * ctx.speedFactor(e) * dt;
  }
};

// the boss: big, armoured, and lays ants as she goes
export const queen = {
  id: 'queen', name: 'Ant Queen',
  blurb: 'The boss! Armoured, huge appetite, and she keeps laying ants behind her.',
  hp: 700, speed: 0.4, armor: 3, bounty: 80, bite: 10, size: 0.46, boss: true,
  onTick(ctx, e, dt) {
    e.brood = (e.brood || 0) + dt;
    if (e.brood < 4) return;
    e.brood = 0;
    ctx.spawn('ant', e.path, Math.max(0, e.d - 0.3));
    ctx.spawn('ant', e.path, Math.max(0, e.d - 0.7));
  }
};

export default [ant, ladybug, beetle, snail, caterpillar, moth, wasp, hopper, queen];
