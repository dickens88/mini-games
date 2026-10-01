// Tower drawings, Kingdom Rush style: a sturdy building on the plot with a
// little gunner on top. Everything is in tile units; (x, y) is the tile centre.
// Each tower type has one function:
//   draw(g, x, y, aim, opts)
//     opts.level   0, 1, 2 …
//     opts.shotT   seconds since it last fired (drives the recoil)
//     opts.build   0..1 while the tower is going up, 1 when finished
//     opts.upg     0..1 just after an upgrade, 1 when settled
//     opts.now, opts.seed  for idle animation
// Most stand on a tree stump; the cactus has a pot. makeTower() adds the
// shared rise-out-of-the-ground and upgrade wobble.

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

// Shared by every tower: the base rises out of the ground (squat and wide at
// first), wobbles after an upgrade, and the gunner pops up on top.
function makeTower(base, gunner) {
  return (g, x, y, aim, { level = 0, shotT = 9, build = 1, upg = 1, now = 0, seed = 0 } = {}) => {
    softShadow(g, x + 0.05, y + GROUND + 0.04, 0.42 * Math.min(1, build * 2), 0.14, 0.32);
    const rise = build < 1 ? ease.outBack(Math.min(1, build / 0.6)) : 1;
    const wob = upg < 1 ? 1 + 0.14 * (1 - ease.outElastic(upg)) : 1;
    g.save();
    g.translate(x, y + GROUND);
    g.scale(wob * (1 + (1 - rise) * 0.3), rise * wob);
    g.translate(-x, -(y + GROUND));
    const top = base(g, x, y, level, now, seed);
    g.restore();

    if (build > 0.45) {
      const pop = build < 1 ? ease.outBack(Math.min(1, (build - 0.45) / 0.55)) : 1;
      const gy = y + GROUND - (y + GROUND - top) * rise * wob;
      g.save();
      g.translate(x, gy);
      g.scale(pop, pop);
      g.translate(-x, -gy);
      gunner(g, x, gy, aim, level, shotT, now, seed);
      g.restore();
    }
  };
}

// a terracotta pot, for the cactus. Returns the y of the soil.
function pot(g, x, y, level) {
  const bot = y + GROUND, h = [0.3, 0.36, 0.42][Math.min(level, 2)], top = bot - h;
  toon(g, () => {
    g.beginPath();
    g.moveTo(x - 0.3, top + 0.06);
    g.lineTo(x - 0.23, bot);
    g.quadraticCurveTo(x, bot + 0.07, x + 0.23, bot);
    g.lineTo(x + 0.3, top + 0.06);
    g.closePath();
  }, '#D9784A', '#A4502C', { off: 0.06, line: 0.045, hl: [x - 0.17, top + h * 0.55, 0.035, h * 0.3, 0], light: 'rgba(255,220,180,.3)' });
  // painted band, a stud per level like the stump's plaque
  g.strokeStyle = level >= 2 ? '#FFE58A' : '#F2B48C';
  g.lineWidth = 0.035;
  g.beginPath(); g.moveTo(x - 0.265, top + h * 0.55); g.quadraticCurveTo(x, top + h * 0.62, x + 0.265, top + h * 0.55); g.stroke();
  for (let i = 0; i <= level; i++) {
    circle(g, x + (i - level / 2) * 0.09, bot - 0.06, 0.022);
    g.fillStyle = '#FFE58A'; g.fill();
  }
  // rim and soil
  toon(g, () => roundRect(g, x - 0.34, top - 0.04, 0.68, 0.12, 0.05), '#E58A5A', '#B25A33', { off: 0.03, line: 0.04 });
  ellipse(g, x, top - 0.02, 0.27, 0.05);
  g.fillStyle = '#5C3920'; g.fill();
  return top - 0.02;
}

// leafy collar a gunner sits in
function collar(g, color = '#5E9E33') {
  for (const a of [-2.5, -1.6, -0.7, 0.3]) {
    ellipse(g, Math.cos(a) * 0.17, 0.12 + Math.sin(a) * 0.05, 0.12, 0.05, a);
    ink(g, color, 0.028);
  }
}

function smile(g, x, y, r, w = 0.06) {
  g.strokeStyle = INK; g.lineWidth = w * 0.5; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y, r, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
}

function melonBall(g, x, y, r) {
  toon(g, () => circle(g, x, y, r), '#4FA544', '#2E6E2B', { off: r * 0.2, line: r * 0.28 });
  g.save();
  circle(g, x, y, r); g.clip();
  g.strokeStyle = '#A6E07A'; g.lineWidth = r * 0.22;
  for (const k of [-0.5, 0, 0.5]) {
    g.beginPath(); g.moveTo(x + k * r - r * 0.15, y - r); g.quadraticCurveTo(x + k * r + r * 0.2, y, x + k * r - r * 0.1, y + r); g.stroke();
  }
  g.restore();
  circle(g, x, y, r); g.strokeStyle = INK; g.lineWidth = r * 0.28; g.stroke();
}

// a striped melon fellow holding the next melon over its head
function melonGunner(g, x, y, aim, level, shotT, now, seed) {
  const [sx, sy, push] = shotPose(shotT);
  const face = Math.cos(aim) < 0 ? -1 : 1;
  const breathe = Math.sin(now / 420 + seed) * 0.025;
  const grow = 0.92 + level * 0.06;
  g.save();
  g.translate(x - face * push, y - 0.17);
  g.scale(grow * face, grow);
  collar(g);
  g.scale(sx, sy * (1 + breathe));
  // body
  const body = () => ellipse(g, 0, 0, 0.3, 0.25);
  toon(g, body, '#4FA544', '#2E6E2B', { off: 0.06, line: 0, hl: [-0.12, -0.13, 0.1, 0.045], light: 'rgba(255,255,255,.45)' });
  g.save(); body(); g.clip();
  g.strokeStyle = '#9EDB72'; g.lineWidth = 0.05; g.lineCap = 'round';
  for (const k of [-0.17, 0, 0.17]) {
    g.beginPath(); g.moveTo(k - 0.04, -0.27); g.quadraticCurveTo(k + 0.06, 0, k - 0.02, 0.27); g.stroke();
  }
  g.restore();
  body(); g.strokeStyle = INK; g.lineWidth = 0.045; g.stroke();
  // face
  const blink = blinkAt(now, seed);
  eye(g, 0.04, -0.03, 0.08, 1, 0, blink);
  eye(g, 0.19, -0.03, 0.07, 1, 0, blink);
  cheek(g, -0.06, 0.08, 0.045);
  smile(g, 0.13, 0.05, 0.06);
  // a leaf spoon and the next melon, which grows back after each throw
  ellipse(g, -0.02, -0.3, 0.13, 0.045, 0.1);
  ink(g, '#6CC447', 0.025);
  const reload = Math.min(1, Math.max(0, (shotT - 0.2) / 0.5));
  if (reload > 0) melonBall(g, -0.02, -0.37, 0.1 * ease.outBack(reload));
  g.restore();
}

// a frosty mint bulb with an icicle nozzle; swivels like the pea
function mintGunner(g, x, y, aim, level, shotT, now, seed) {
  const [sx, sy, push] = shotPose(shotT);
  const breathe = Math.sin(now / 420 + seed) * 0.03;
  const lookUp = Math.sin(aim);
  g.save();
  g.translate(x - Math.cos(aim) * push, y - 0.16 - Math.sin(aim) * push * 0.5);
  const grow = 0.92 + level * 0.06;
  g.scale(grow, grow);
  collar(g, '#3FA36B');
  // two mint leaves on top, not turning with the aim
  for (const side of [-1, 1]) {
    ellipse(g, side * 0.1, -0.26, 0.13, 0.065, side * 0.6);
    ink(g, '#59C27A', 0.03);
    g.strokeStyle = 'rgba(30,90,50,.6)'; g.lineWidth = 0.015;
    g.beginPath(); g.moveTo(side * 0.02, -0.21); g.lineTo(side * 0.19, -0.31); g.stroke();
  }
  g.rotate(aim);
  if (Math.cos(aim) < 0) g.scale(1, -1);
  g.scale(sx, sy * (1 + breathe));
  // icicle nozzle
  toon(g, () => { g.beginPath(); g.moveTo(0.12, -0.1); g.lineTo(0.4, -0.04); g.lineTo(0.4, 0.04); g.lineTo(0.12, 0.1); g.closePath(); },
    '#CFF4FF', '#8CCDE8', { off: 0.025, line: 0.035 });
  // body
  toon(g, () => ellipse(g, 0, 0, 0.27, 0.24), '#BDF3E1', '#78CBB2',
    { off: 0.06, hl: [-0.1, -0.12, 0.1, 0.045], light: 'rgba(255,255,255,.75)' });
  // a frost swirl on the cheek
  g.strokeStyle = 'rgba(80,170,200,.7)'; g.lineWidth = 0.02;
  g.beginPath(); g.arc(-0.1, 0.06, 0.05, 0, Math.PI * 1.5); g.stroke();
  eye(g, 0.06, -0.06, 0.095, 1, lookUp * (Math.cos(aim) < 0 ? -1 : 1) * 0.6, blinkAt(now, seed));
  cheek(g, -0.02, 0.09, 0.045);
  g.restore();
  // a little snowflake sparkle that twinkles
  const tw = (Math.sin(now / 300 + seed) + 1) / 2;
  if (tw > 0.6) {
    g.strokeStyle = `rgba(255,255,255,${(tw - 0.6) * 2.2})`; g.lineWidth = 0.02;
    const fx = x + 0.24, fy = y - 0.42;
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI / 3;
      g.beginPath(); g.moveTo(fx - Math.cos(a) * 0.05, fy - Math.sin(a) * 0.05); g.lineTo(fx + Math.cos(a) * 0.05, fy + Math.sin(a) * 0.05); g.stroke();
    }
  }
}

// a tall cactus with two arms; it doesn't turn, its eyes follow the target
function cactusGunner(g, x, y, aim, level, shotT, now, seed) {
  const [sx, sy] = shotPose(shotT);
  const sway = Math.sin(now / 600 + seed) * 0.02;
  const h = 0.5 + level * 0.05;
  g.save();
  g.translate(x, y + 0.02);
  g.scale(sx, sy);
  g.rotate(sway);
  const GREEN = '#5DB55A', DARK = '#3A7F3A';
  // arms
  for (const side of [-1, 1]) {
    const ay = -h * (side < 0 ? 0.45 : 0.6);
    toon(g, () => {
      g.beginPath();
      g.moveTo(side * 0.12, ay + 0.05);
      g.lineTo(side * 0.24, ay + 0.05);
      g.quadraticCurveTo(side * 0.31, ay + 0.05, side * 0.31, ay - 0.03);
      g.lineTo(side * 0.31, ay - 0.16);
      g.arc(side * 0.255, ay - 0.16, 0.055, 0, Math.PI, true);
      g.lineTo(side * 0.2, ay - 0.04);
      g.lineTo(side * 0.12, ay - 0.04);
      g.closePath();
    }, GREEN, DARK, { off: 0.025, line: 0.035 });
  }
  // trunk
  const trunk = () => roundRect(g, -0.15, -h, 0.3, h + 0.02, 0.15);
  toon(g, trunk, GREEN, DARK, { off: 0.05, hl: [-0.07, -h + 0.14, 0.035, 0.1, 0], light: 'rgba(230,255,200,.5)' });
  g.strokeStyle = 'rgba(30,80,30,.45)'; g.lineWidth = 0.018;
  for (const k of [-0.06, 0.06]) { g.beginPath(); g.moveTo(k, -h + 0.08); g.lineTo(k, -0.02); g.stroke(); }
  // spines
  g.strokeStyle = '#FFF6D6'; g.lineWidth = 0.014; g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const px = (i % 2 ? 0.15 : -0.15), py = -h + 0.12 + i * (h - 0.16) / 7;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.sign(px) * 0.05, py - 0.02); g.stroke();
  }
  // face
  const lx = Math.cos(aim), ly = Math.sin(aim);
  const blink = blinkAt(now, seed);
  eye(g, -0.055, -h * 0.62, 0.06, lx, ly, blink);
  eye(g, 0.065, -h * 0.62, 0.06, lx, ly, blink);
  smile(g, 0.005, -h * 0.5, 0.04, 0.05);
  // a flower on top once upgraded
  if (level >= 1) {
    const fy = -h - 0.02, n = level >= 2 ? 7 : 5;
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2;
      const px = Math.cos(a) * 0.06, py = fy + Math.sin(a) * 0.04;
      g.moveTo(px + 0.045, py); g.arc(px, py, 0.045, 0, Math.PI * 2);
    }
    ink(g, level >= 2 ? '#FF5FA0' : '#FF9FC8', 0.02);
    circle(g, 0, fy, 0.03); ink(g, '#FFD35C', 0.015);
  }
  g.restore();
}

// a sunflower on a stem; bounces with joy each time it makes gold
function sunflowerGunner(g, x, y, aim, level, shotT, now, seed) {
  const hop = shotT < 0.5 ? Math.sin(shotT / 0.5 * Math.PI) * 0.08 : 0;
  const sway = Math.sin(now / 700 + seed) * 0.06;
  const grow = 0.9 + level * 0.07;
  g.save();
  g.translate(x, y + 0.02);
  g.scale(grow, grow);
  // stem and leaves
  g.strokeStyle = INK; g.lineWidth = 0.075; g.lineCap = 'round';
  const hx = sway * 0.6, hy = -0.42 - hop;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(0.02, -0.2, hx, hy); g.stroke();
  g.strokeStyle = '#5E9E33'; g.lineWidth = 0.04; g.stroke();
  for (const side of [-1, 1]) {
    ellipse(g, side * 0.11, -0.12, 0.1, 0.045, side * -0.5);
    ink(g, '#6CC447', 0.025);
  }
  // petals, a ring of them, more with each level
  g.translate(hx, hy);
  g.rotate(sway * 0.5);
  const n = 12 + level * 2;
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2 + now / 4000;
    ellipse(g, Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.08, 0.04, a);
    ink(g, k % 2 ? '#FFD35C' : '#FFC23A', 0.022);
  }
  toon(g, () => circle(g, 0, 0, 0.15), '#9A6236', '#6B3F20', { off: 0.03, line: 0.035 });
  g.fillStyle = 'rgba(60,30,10,.35)';
  for (let k = 0; k < 8; k++) { circle(g, Math.cos(k * 2.4) * 0.09, Math.sin(k * 2.4) * 0.09, 0.012); g.fill(); }
  const blink = shotT < 0.5 ? 1 : blinkAt(now, seed);   // eyes squeezed shut with joy
  eye(g, -0.05, -0.03, 0.045, 0, -0.3, blink);
  eye(g, 0.05, -0.03, 0.045, 0, -0.3, blink);
  cheek(g, -0.09, 0.04, 0.03); cheek(g, 0.09, 0.04, 0.03);
  smile(g, 0, 0.03, 0.045, 0.045);
  g.restore();
}

const pea = makeTower(stump, peaGunner);
const melon = makeTower(stump, melonGunner);
const mint = makeTower(stump, mintGunner);
const cactus = makeTower(pot, cactusGunner);
const sunflower = makeTower(stump, sunflowerGunner);

export const TOWER_SPRITES = { pea, melon, mint, cactus, sunflower };

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
  },

  // a melon thrown in an arc; its shadow stays on the ground
  melon(g, p) {
    const done = Math.hypot(p.x - p.ox, p.y - p.oy), left = Math.hypot(p.tx - p.x, p.ty - p.y);
    const total = done + left || 1, k = done / total;
    const h = Math.sin(k * Math.PI) * (0.5 + total * 0.18);
    g.fillStyle = 'rgba(30,50,20,.25)';
    ellipse(g, p.x, p.y + 0.1, 0.1 * (1 - h * 0.3), 0.04); g.fill();
    g.save();
    g.translate(p.x, p.y - 0.3 - h);
    g.rotate(done * 5);
    melonBall(g, 0, 0, 0.11);
    g.restore();
  },

  // an ice shard with a frosty trail
  frost(g, p) {
    const a = Math.atan2(p.ty - p.y, p.tx - p.x);
    g.save();
    g.translate(p.x, p.y - 0.25);
    g.rotate(a);
    g.fillStyle = 'rgba(200,240,255,.5)';
    ellipse(g, -0.13, 0, 0.12, 0.04); g.fill();
    toon(g, () => { g.beginPath(); g.moveTo(0.12, 0); g.lineTo(0, -0.06); g.lineTo(-0.08, 0); g.lineTo(0, 0.06); g.closePath(); },
      '#E3F8FF', '#8CCDE8', { off: 0.015, line: 0.025 });
    g.restore();
  },

  // a cactus spine: thin and very fast
  spine(g, p) {
    const a = Math.atan2(p.ty - p.y, p.tx - p.x);
    g.save();
    g.translate(p.x, p.y - 0.3);
    g.rotate(a);
    g.strokeStyle = 'rgba(255,246,214,.45)'; g.lineWidth = 0.03; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-0.38, 0); g.lineTo(-0.1, 0); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 0.05;
    g.beginPath(); g.moveTo(-0.14, 0); g.lineTo(0.14, 0); g.stroke();
    g.strokeStyle = '#F3E2A8'; g.lineWidth = 0.026;
    g.beginPath(); g.moveTo(-0.13, 0); g.lineTo(0.13, 0); g.stroke();
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
