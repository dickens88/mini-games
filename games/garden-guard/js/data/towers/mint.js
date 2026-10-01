// Frost Mint: weak icy shots that leave bugs slowed for a while. The top level
// frosts a small area.

export default {
  id: 'mint', name: 'Frost Mint', key: '3',
  blurb: 'Icy shots slow bugs down so other towers get more hits in.',
  cost: 70,
  hitsGround: true, hitsAir: true,
  attack: 'shoot',
  projectile: { speed: 8, look: 'frost' },
  show: ['dmg', 'slow', 'range', 'rate'],
  levels: [
    { dmg: 3, range: 2.4, rate: 0.9, slow: 0.35, slowDur: 1.6 },
    { dmg: 5, range: 2.6, rate: 0.8, slow: 0.45, slowDur: 2, cost: 60 },
    { dmg: 8, range: 2.8, rate: 0.7, slow: 0.55, slowDur: 2.4, splash: 0.7, cost: 90 }
  ],
  onHit(ctx, p, target, stats) {
    const hits = stats.splash ? ctx.near(p.x, p.y, stats.splash) : target ? [target] : [];
    for (const e of hits) {
      ctx.damage(e, stats.dmg);
      if (!e.dead) e.fx.frost = { t: stats.slowDur, slow: stats.slow };
    }
  }
};
