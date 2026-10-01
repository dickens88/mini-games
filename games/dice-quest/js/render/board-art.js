// Paints a whole map (everything that never moves) at a given pixel size.
// The page caches the result; the setup screen uses it for map previews.

import { THEMES } from './themes/index.js';
import { linkCurve, emoji, CELL_R } from './kit.js';

const PORTAL_COLOURS = ['#B388FF', '#4DD0E1', '#FF8A65'];

export function drawMapArt(ctx, size, map) {
  const theme = THEMES[map.def.id];
  const S = n => n * size / 100;
  ctx.save();
  theme.background(ctx, S, map);
  theme.road(ctx, S, map);

  // ladders and slides run under the cells so every cell stays readable…
  const curves = map.links.map((l, k) => linkCurve(map, l, k));
  map.links.forEach((l, k) => {
    if (l.kind === 'ladder') theme.ladder(ctx, S, curves[k], k);
    if (l.kind === 'slide') theme.slide(ctx, S, curves[k], k);
  });

  for (let i = 1; i < map.goal; i++) theme.cell(ctx, S, map.cells[i], i, !!map.at[i]);

  // icons on the cells where something happens
  const iconSize = S(CELL_R * 1.25);
  const hidden = theme.hideIcons || [];
  for (let i = 1; i < map.goal; i++) {
    const f = map.at[i];
    if (f && !hidden.includes(f.kind)) emoji(ctx, map.def.kinds[f.kind].icon, S(map.cells[i].x), S(map.cells[i].y), iconSize);
  }

  // portal pairs get matching rings
  let pair = 0;
  for (const l of map.links) {
    if (l.kind !== 'portal') continue;
    const c = PORTAL_COLOURS[pair++ % PORTAL_COLOURS.length];
    theme.portal(ctx, S, map.cells[l.from], c);
    theme.portal(ctx, S, map.cells[l.to], c);
  }

  // … and only their heads, arrows and icons sit on top
  map.links.forEach((l, k) => {
    if (theme.top && (l.kind === 'ladder' || l.kind === 'slide')) theme.top(ctx, S, curves[k], l.kind, k);
  });

  theme.ends(ctx, S, map);
  ctx.restore();
}
