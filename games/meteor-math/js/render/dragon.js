// Dino, the little dragon who guards the planet with a star blaster (the
// glowing orb in its paws). Adapted from Bubble Buddies' Dino.
// The art is "Cute dragon" by lzubiaur (Voodoo Cactus), CC-BY 3.0 —
// https://opengameart.org/content/cute-dragon-0 — cut into layers in
// img/dragon/ so the eyes, paws and feet can move on their own.
//
// Every layer shares one frame (VB, in the artwork's own units), so they line
// up when drawn at the same spot; pivots below are in those units too.

import { DINO as DRAGON } from '../config.js';

const LAYERS = ['body', 'foot-r', 'shade', 'foot-l', 'paw-l', 'paw-r', 'eyes'];
const VB = { x: 695.6, y: 374.15, w: 239.75, h: 291.62 };
const P = {
  feet: { x: 815, y: 660 },
  eyes: { x: 801, y: 447 },
  eyeL: { x: 786, y: 448 },
  eyeR: { x: 818, y: 446 },
  pawL: { x: 740, y: 560 },
  pawR: { x: 790, y: 572 },
  hold: { x: 776, y: 548 },
  head: { x: 820, y: 410 }
};
const TAU = Math.PI * 2;
const LINE = '#5E7A2E';

const images = {};
let loaded = 0;
for (const name of LAYERS) {
  const img = new Image();
  img.onload = () => { loaded++; };
  img.src = 'img/dragon/' + name + '.svg';
  images[name] = img;
}

// each layer drawn once at the size it is shown, then reused
const raster = {};
let rasterPx = 0;
function layer(name, px) {
  if (px !== rasterPx) { for (const k in raster) delete raster[k]; rasterPx = px; }
  if (!raster[name]) {
    const s = px * DRAGON.scale;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(VB.w * s); cv.height = Math.ceil(VB.h * s);
    cv.getContext('2d').drawImage(images[name], 0, 0, cv.width, cv.height);
    raster[name] = cv;
  }
  return raster[name];
}

export const dragonReady = () => loaded === LAYERS.length;

// where the star blaster sits, in board units
export const holdPoint = () => ({
  x: DRAGON.x + (P.hold.x - P.feet.x) * DRAGON.scale,
  y: DRAGON.y + (P.hold.y - P.feet.y) * DRAGON.scale
});

const easeOut = t => 1 - (1 - t) * (1 - t);

// m: { mood: idle|cheer|wow|worried|sad, moodAge, t, lookX, lookY, throwAge, blink }
// drawHeld(ctx): draws the blaster at the origin, in board units
export function drawDragon(ctx, px, m, drawHeld) {
  if (!dragonReady()) { const h = holdPoint(); ctx.save(); ctx.translate(h.x, h.y); drawHeld(ctx); ctx.restore(); return; }
  const t = m.t, age = m.moodAge;
  let hop = 0, squash = Math.sin(t * 2.3) * 0.012, sway = Math.sin(t * 1.3) * 0.025, shiver = 0;
  let pawUp = 0, pawSpread = 0, eyeScale = 1, eyeDrop = 0, happy = false, holdLift = 0;

  switch (m.mood) {
    case 'cheer': {
      const p = (age * 2.2) % 1;
      hop = Math.sin(p * Math.PI) * 16;
      squash = p < 0.1 || p > 0.92 ? 0.08 : -0.03;
      sway = Math.sin(age * 9) * 0.08;
      pawUp = 0.5; pawSpread = 0.7 + Math.sin(age * 16) * 0.35;
      happy = true;
      holdLift = Math.abs(Math.sin(age * 6.5)) * 0.5;   // waving the blaster
      break;
    }
    case 'wow': {
      const k = Math.max(0, 1 - age * 2.5);
      hop = Math.sin(Math.min(1, age * 3) * Math.PI) * 9;
      eyeScale = 1 + 0.3 * k + 0.1;
      pawSpread = 0.7 * k;
      break;
    }
    case 'worried':
      shiver = Math.sin(t * 9) * 0.8;
      sway = 0;
      pawSpread = -0.2;
      break;
    case 'sad':
      squash = 0.05; sway = Math.sin(t * 0.8) * 0.01;
      eyeScale = 0.55; eyeDrop = 5;
      break;
  }
  // a little kick when the blaster fires
  if (m.throwAge != null && m.throwAge < 0.35) {
    const k = Math.sin(m.throwAge / 0.35 * Math.PI);
    pawUp = Math.max(pawUp, k * 0.8);
    sway -= k * 0.06;
  }

  const S = DRAGON.scale;
  ctx.save();
  ctx.translate(DRAGON.x + shiver, DRAGON.y - hop);
  ctx.rotate(sway);
  ctx.scale(S * (1 + squash * 0.7), S * (1 - squash));
  ctx.translate(-P.feet.x, -P.feet.y);

  const put = name => ctx.drawImage(layer(name, px), VB.x, VB.y, VB.w, VB.h);

  // shadow on the ground
  ctx.save();
  ctx.translate(P.feet.x - 20, P.feet.y + 2 + hop / S);
  ctx.scale(1, 0.18);
  ctx.beginPath(); ctx.arc(0, 0, 105 - hop * 1.5, 0, TAU);
  ctx.fillStyle = 'rgba(40,30,20,.16)'; ctx.fill();
  ctx.restore();

  put('body');
  put('foot-r');
  put('shade');
  put('foot-l');

  // the blaster (waved about when cheering)
  const hx = P.hold.x, hy = P.hold.y - holdLift * 55 - pawUp * 12;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(1 / S, 1 / S);
  drawHeld(ctx);
  ctx.restore();

  // paws: hug the blaster, go up for a cheer or a shot, open wide for a wow
  for (const [name, pv, side] of [['paw-l', P.pawL, -1], ['paw-r', P.pawR, 1]]) {
    ctx.save();
    ctx.translate(pv.x, pv.y);
    ctx.translate(side * pawSpread * 18, -pawUp * 18);
    ctx.rotate(side * (pawSpread * 0.35 + pawUp * 0.25));
    ctx.translate(-pv.x, -pv.y);
    put(name);
    ctx.restore();
  }

  // eyes: blink, follow the target, grow when surprised, close happily when cheering
  if (happy) {
    ctx.strokeStyle = LINE; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    for (const e of [P.eyeL, P.eyeR]) {
      ctx.beginPath(); ctx.moveTo(e.x - 10, e.y + 5); ctx.quadraticCurveTo(e.x, e.y - 12, e.x + 10, e.y + 5); ctx.stroke();
    }
  } else {
    const blink = m.blink ? 0.12 : 1;
    ctx.save();
    ctx.translate(P.eyes.x + (m.lookX || 0) * 5, P.eyes.y + (m.lookY || 0) * 3 + eyeDrop);
    ctx.scale(eyeScale, eyeScale * blink);
    ctx.translate(-P.eyes.x, -P.eyes.y);
    put('eyes');
    ctx.restore();
    if (m.blink) {
      ctx.strokeStyle = LINE; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (const e of [P.eyeL, P.eyeR]) { ctx.beginPath(); ctx.moveTo(e.x - 10, e.y + 1); ctx.quadraticCurveTo(e.x, e.y + 7, e.x + 10, e.y + 1); ctx.stroke(); }
    }
  }

  if (m.mood === 'worried') {
    ctx.fillStyle = 'rgba(140,210,255,.95)';
    const k = (t * 1.5) % 1;
    const x = P.head.x + 22, y = P.head.y + 10 + easeOut(k) * 26;
    ctx.globalAlpha = 1 - k * 0.6;
    ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.quadraticCurveTo(x + 9, y, x, y + 4); ctx.quadraticCurveTo(x - 9, y, x, y - 14); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (m.mood === 'sad') {
    ctx.fillStyle = 'rgba(120,200,255,.95)';
    for (const [e, off] of [[P.eyeL, 0], [P.eyeR, 0.5]]) {
      const k = (t * 1.2 + off) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 14 + easeOut(k) * 34, 4, 6, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
