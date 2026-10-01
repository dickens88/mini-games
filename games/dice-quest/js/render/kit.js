// Small drawing helpers shared by the themes and the renderer. Board
// positions are in units of 0..100; `S` converts them to pixels.

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function emojiFont(px) {
  return `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
}

export function emoji(ctx, ch, x, y, px) {
  ctx.font = emojiFont(px);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, x, y + px * 0.07);
}

export function text(ctx, str, x, y, px, fill, stroke, weight = 800) {
  ctx.font = `${weight} ${px}px "Baloo 2", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = px * 0.22;
    ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
}

// a seeded random sequence for decorations, so the art never jumps around
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ladders, slides and portals travel along a gentle arc between two cells.
// The bend side alternates so neighbouring arcs don't sit on top of each other.
export function linkCurve(map, link, k) {
  const a = map.cells[link.from], b = map.cells[link.to];
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const bend = Math.min(14, len * 0.28) * (k % 2 ? 1 : -1);
  return { a, b, c: { x: mx - dy / len * bend, y: my + dx / len * bend } };
}

export function onCurve({ a, b, c }, t) {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

export function curvePath(ctx, S, curve) {
  ctx.beginPath();
  ctx.moveTo(S(curve.a.x), S(curve.a.y));
  ctx.quadraticCurveTo(S(curve.c.x), S(curve.c.y), S(curve.b.x), S(curve.b.y));
}

export function arrowHead(ctx, S, curve, size, colour) {
  const end = onCurve(curve, 0.86), tip = onCurve(curve, 0.93);
  const ang = Math.atan2(tip.y - end.y, tip.x - end.x);
  ctx.beginPath();
  ctx.moveTo(S(tip.x + Math.cos(ang) * size * 0.5), S(tip.y + Math.sin(ang) * size * 0.5));
  ctx.lineTo(S(tip.x + Math.cos(ang + 2.5) * size), S(tip.y + Math.sin(ang + 2.5) * size));
  ctx.lineTo(S(tip.x + Math.cos(ang - 2.5) * size), S(tip.y + Math.sin(ang - 2.5) * size));
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

// the whole route as one smooth line (for drawing the road under the cells)
export function routePath(ctx, S, map) {
  ctx.beginPath();
  map.dense.forEach((p, i) => (i ? ctx.lineTo(S(p.x), S(p.y)) : ctx.moveTo(S(p.x), S(p.y))));
}

export const CELL_R = 3.0;
