// Powers the player casts on the map: tap the button, then tap a spot. Each
// leaves a zone that lives for `dur` seconds; tick() runs every step for every
// bug inside it (flyers included).

export const rain = {
  id: 'rain', name: 'Rain Cloud', key: 'q',
  blurb: 'A little cloud soaks the road. Bugs underneath slow to a crawl.',
  cooldown: 25, radius: 1.5, dur: 5, slow: 0.6,
  tick(ctx, z, e) { e.fx.rain = { t: 0.25, slow: z.slow }; }
};

// damage grows with the wave, like the bugs' health
export const bees = {
  id: 'bees', name: 'Bee Swarm', key: 'w',
  blurb: 'Angry bees sting everything in the area for a few seconds.',
  cooldown: 40, radius: 1.25, dur: 3, dps: 22,
  tick(ctx, z, e, dt) { ctx.damage(e, z.dps * dt, { pierce: true }); }
};

export default [rain, bees];
