// Sunflower: doesn't fight. While bugs are on the map it soaks up sunshine and
// turns it into gold every few seconds.

export default {
  id: 'sunflower', name: 'Sunflower', key: '5',
  blurb: 'Makes gold while bugs are about. Pays for itself in a few waves.',
  cost: 80,
  hitsGround: false, hitsAir: false,
  attack: 'none',
  show: ['gold', 'every'],
  levels: [
    { gold: 5, every: 6 },
    { gold: 7, every: 5.5, cost: 70 },
    { gold: 10, every: 5, cost: 100 }
  ],
  aura(ctx, t, stats, dt) {
    const s = ctx.state;
    if (!s.enemies.length && !s.spawnQueue.length) return;
    t.cd += dt;
    if (t.cd < stats.every) return;
    t.cd -= stats.every;
    s.gold += stats.gold;
    ctx.emit('gold', { from: t.uid, kind: t.type, x: t.x, y: t.y, gold: stats.gold });
  }
};
