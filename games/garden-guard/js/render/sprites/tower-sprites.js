// Tower drawings, Kingdom Rush style: a sturdy building on the plot with a
// little gunner on top. Everything is in tile units; (x, y) is the tile centre.
// Each tower type has one function:
//   draw(g, x, y, aim, opts)
//     opts.level   0, 1, 2 …
//     opts.shotT   seconds since it last fired (drives the recoil)
//     opts.build   0..1 while the tower is going up, 1 when finished
//     opts.upg     0..1 just after an upgrade, 1 when settled
//     opts.now, opts.seed  for idle animation

import { INK, roundRect, ink, ellipse, circle, softShadow, eye, cheek, blinkAt, toon } from '../kit.js';
import { ease, shotPose } from '../anim.js';

const GROUND = 0.22;   // where the base meets the ground, below the tile centre

// A tree-stump tower: taller and better dressed with each level.
// Returns the y of the stump top, where the gunner stands.
function stump(g, x, y, level, now, seed) {
  const h = [0.3, 0.38, 0.46][Math.min(level, 2)];
  const bot = y + GROUND, top = bot - h, rx = 0.3, ry = 0.12;

  // roots
  for (const side of [-1, 1]) {
    toon(g, () => {
      g.beginPath();
      g.moveTo(x + side * 0.18, bot - 0.1);
      g.quadraticCurveTo(x + side * 0.36, bot - 0.02, x + side * 0.4, bot + 0.05);
      g.quadraticCurveTo(x + side * 0.26, bot + 0.06, x + side * 0.12, bot + 0.02);
      g.closePath();
    }, '#8E5B35', '#5F3A20', { off: 0.02, line: 0.035 });
  }
  // bark
  toon(g, () => {
    g.beginPath();
    g.moveTo(x - rx, top);
    g.lineTo(x - rx, bot);
    g.ellipse(x, bot, rx, ry, 0, Math.PI, 0, true);
    g.lineTo(x + rx, top);
    g.closePath();
  }, '#93603A', '#5F3A20', { off: 0.06, line: 0.045, hl: [x - 0.18, top + h * 0.5, 0.04, h * 0.35, 0], light: 'rgba(255,220,170,.22)' });
  g.strokeStyle = 'rgba(50,25,10,.45)';
  g.lineWidth = 0.022;
  g.lineCap = 'round';
  for (const k of [-0.15, 0.02, 0.17]) {
    g.beginPath();
    g.moveTo(x + k, top + ry * 0.9);
    g.quadraticCurveTo(x + k + 0.02, top + h * 0.5, x + k - 0.01, bot + ry * 0.75);
    g.stroke();
  }
  // level plaque with gold studs
  roundRect(g, x - 0.09 - level * 0.045, bot - 0.08, 0.18 + level * 0.09, 0.09, 0.03);
  ink(g, '#C99A52', 0.025);
  for (let i = 0; i <= level; i++) {
    circle(g, x + (i - level / 2) * 0.09, bot - 0.035, 0.022);
    g.fillStyle = '#FFE58A'; g.fill();
  }
  // cut top with growth rings
  toon(g, () => ellipse(g, x, top, rx, ry), '#E3BD80', '#C49456', { off: 0.03, line: 0.045 });
  g.strokeStyle = 'rgba(150,100,50,.55)';
  g.lineWidth = 0.018;
  ellipse(g, x + 0.01, top + 0.005, rx * 0.62, ry * 0.6); g.stroke();
  ellipse(g, x + 0.01, top + 0.005, rx * 0.3, ry * 0.28); g.stroke();

  // level 2: a leafy garland round the rim
  if (level >= 1) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.05 + i * 0.1125);
      const lx = x + Math.cos(a) * rx * 0.98, ly = top + Math.sin(a) * ry + 0.02;
      ellipse(g, lx, ly, 0.06, 0.035, a + 1.2);
      ink(g, i % 2 ? '#7DBB45' : '#5E9E33', 0.02);
    }
  }
  // level 3: a pennant on a little pole
  if (level >= 2) {
    const px = x - rx * 0.8, py = top - 0.02;
    g.strokeStyle = INK; g.lineWidth = 0.035;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px, py - 0.4); g.stroke();
    const wave = Math.sin(now / 160 + seed) * 0.03;
    toon(g, () => {
      g.beginPath();
      g.moveTo(px, py - 0.4);
      g.quadraticCurveTo(px - 0.12, py - 0.36 + wave, px - 0.22, py - 0.33 + wave * 1.5);
      g.lineTo(px, py - 0.26);
      g.closePath();
    }, '#FF7EB0', '#D9568A', { off: 0.015, line: 0.025 });
    circle(g, px, py - 0.41, 0.025); ink(g, '#FFD35C', 0.015);
  }
  return top;
}

// the pea gunner: a fat pea pod that swivels to face its target
function peaGunner(g, x, y, aim, level, shotT, now, seed) {
  const [sx, sy, push] = shotPose(shotT);
  const breathe = Math.sin(now / 420 + seed) * 0.03;
  const lookUp = Math.sin(aim);
  g.save();
  g.translate(x - Math.cos(aim) * push, y - 0.16 - Math.sin(aim) * push * 0.5);
  const grow = 0.92 + level * 0.06;
  g.scale(grow, grow);

  // leafy collar the pod sits in
  for (const a of [-2.5, -1.6, -0.7, 0.3]) {
    ellipse(g, Math.cos(a) * 0.17, 0.12 + Math.sin(a) * 0.05, 0.12, 0.05, a);
    ink(g, '#5E9E33', 0.028);
  }
  g.rotate(aim);
  if (Math.cos(aim) < 0) g.scale(1, -1);
  g.scale(sx, sy * (1 + breathe));

  // muzzle tube
  toon(g, () => roundRect(g, 0.1, -0.11, 0.27, 0.22, 0.09), '#76C94A', '#4E9A2E', { off: 0.03 });
  ellipse(g, 0.36, 0, 0.055, 0.085);
  ink(g, '#24521A', 0.03);
  // body
  toon(g, () => ellipse(g, 0, 0, 0.29, 0.24), '#93DD5F', '#5FA83A',
    { off: 0.06, hl: [-0.1, -0.12, 0.1, 0.045], light: 'rgba(255,255,255,.55)' });
  // a curly sprout on the head
  g.strokeStyle = INK; g.lineWidth = 0.06; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-0.12, -0.2); g.quadraticCurveTo(-0.2, -0.36, -0.08, -0.36); g.stroke();
  g.strokeStyle = '#6CC447'; g.lineWidth = 0.03; g.stroke();
  // face: looks a little up or down towards the target
  eye(g, 0.05, -0.06, 0.1, 1, lookUp * (Math.cos(aim) < 0 ? -1 : 1) * 0.6, blinkAt(now, seed));
  cheek(g, -0.1, 0.08, 0.05);
  g.restore();
}

function pea(g, x, y, aim, { level = 0, shotT = 9, build = 1, upg = 1, now = 0, seed = 0 } = {}) {
  softShadow(g, x + 0.05, y + GROUND + 0.04, 0.42 * Math.min(1, build * 2), 0.14, 0.32);
  const rise = build < 1 ? ease.outBack(Math.min(1, build / 0.6)) : 1;
  const wob = upg < 1 ? 1 + 0.14 * (1 - ease.outElastic(upg)) : 1;
  g.save();
  g.translate(x, y + GROUND);
  g.scale(wob * (1 + (1 - rise) * 0.3), rise * wob);   // squat and wide while it rises
  g.translate(-x, -(y + GROUND));
  const top = stump(g, x, y, level, now, seed);
  g.restore();

  if (build > 0.45) {
    const pop = build < 1 ? ease.outBack(Math.min(1, (build - 0.45) / 0.55)) : 1;
    const gy = y + GROUND - (y + GROUND - top) * rise * wob;
    g.save();
    g.translate(x, gy);
    g.scale(pop, pop);
    g.translate(-x, -gy);
    peaGunner(g, x, gy, aim, level, shotT, now, seed);
    g.restore();
  }
}

export const TOWER_SPRITES = { pea };

export const PROJECTILE_SPRITES = {
  // a pea, stretched along its flight
  pea(g, p) {
    const a = Math.atan2(p.ty - p.y, p.tx - p.x);
    g.save();
    g.translate(p.x, p.y - 0.25);
    g.rotate(a);
    g.fillStyle = 'rgba(190,240,140,.45)';
    ellipse(g, -0.12, 0, 0.1, 0.05); g.fill();
    toon(g, () => ellipse(g, 0, 0, 0.11, 0.08), '#8FDA5A', '#4E9A2E',
      { off: 0.02, line: 0.03, hl: [-0.03, -0.03, 0.035, 0.02], light: 'rgba(255,255,255,.8)' });
    g.restore();
  }
};

// a small standalone picture of a tower, for buttons and cards
export function towerIcon(type, cssSize = 44) {
  const c = document.createElement('canvas');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(cssSize * dpr);
  const g = c.getContext('2d');
  const s = cssSize * dpr * 0.82;
  g.setTransform(s, 0, 0, s, c.width / 2 - 0.5 * s, c.height / 2 - 0.42 * s);
  (TOWER_SPRITES[type] || pea)(g, 0.5, 0.5, -0.3, { level: 0, now: 1000 });
  c.setAttribute('aria-hidden', 'true');
  return c;
}
