// Enemy drawings, in tile units, seen from the side like little cartoon
// characters with three-tone shading. Each type has one function:
//   draw(g, x, y, facing, s, walk, opts)
//     facing  1 = walking right, -1 = walking left
//     s       the enemy's size from its data (≈ radius in tiles)
//     walk    animation phase, grows with distance walked
//     opts    { now, seed, squash (0..1 hit squash), hide (snail in its shell), hop (0..1 grasshopper mid-leap) }
// (x, y) is where the bug touches the ground.

import { INK, ink, ellipse, circle, eye, cheek, blinkAt, toon } from '../kit.js';

// legs swing in a walk cycle: front and back pairs move opposite ways
function legs(g, s, walk, xs, hip) {
  g.strokeStyle = INK;
  g.lineWidth = s * 0.17;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  xs.forEach((lx, i) => {
    const ph = walk + (i % 2) * Math.PI;
    const swing = Math.sin(ph) * s * 0.22, lift = Math.max(0, Math.cos(ph)) * s * 0.12;
    g.beginPath();
    g.moveTo(lx * s, -hip * s);
    g.lineTo(lx * s + swing * 0.4, -hip * s * 0.45 - lift);
    g.lineTo(lx * s + swing, -lift);
    g.stroke();
  });
}

function antenna(g, x0, y0, x1, y1, r, wobble) {
  g.strokeStyle = INK;
  g.lineWidth = r * 0.75;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo(x1 - r * 3, y1 + r * 2 + wobble, x1, y1 + wobble);
  g.stroke();
  circle(g, x1, y1 + wobble, r);
  g.fillStyle = '#FF8FB8'; g.fill();
  g.lineWidth = r * 0.5; g.stroke();
}

// shared hop, squash and facing
function pose(g, x, y, facing, s, walk, opts, hop, drawFn) {
  const bounce = Math.abs(Math.sin(walk)) * s * hop;
  const sq = opts.squash || 0;
  g.save();
  g.translate(x, y);
  g.scale(facing * (1 + sq * 0.2), 1 - sq * 0.2);
  g.translate(0, -bounce);
  g.rotate(Math.sin(walk) * 0.05);
  drawFn();
  g.restore();
}

function ant(g, x, y, facing, s, walk, opts = {}) {
  pose(g, x, y, facing, s, walk, opts, 0.16, () => {
    const lag = Math.sin(walk - 0.6) * s * 0.06;   // antennae trail a beat behind
    legs(g, s, walk, [-0.45, -0.05, 0.35], 0.62);
    // abdomen
    toon(g, () => ellipse(g, -s * 0.78, -s * 0.78 + lag * 0.5, s * 0.62, s * 0.5, -0.25), '#D0603F', '#9A3E26',
      { off: s * 0.12, line: s * 0.14, hl: [-s * 0.9, -s * 1.02, s * 0.22, s * 0.1], light: 'rgba(255,220,200,.55)' });
    // waist
    toon(g, () => circle(g, -s * 0.08, -s * 0.66, s * 0.26), '#BC5236', '#8A3420', { off: s * 0.06, line: s * 0.14 });
    antenna(g, s * 0.5, -s * 1.45, s * 0.82, -s * 2.08, s * 0.12, lag);
    antenna(g, s * 0.72, -s * 1.42, s * 1.22, -s * 1.9, s * 0.12, lag * 1.3);
    // head
    toon(g, () => circle(g, s * 0.6, -s * 0.98, s * 0.56), '#DE6A47', '#A6432A',
      { off: s * 0.1, line: s * 0.14, hl: [s * 0.42, -s * 1.25, s * 0.18, s * 0.09], light: 'rgba(255,225,205,.6)' });
    eye(g, s * 0.78, -s * 1.1, s * 0.25, 1, 0.1, blinkAt(opts.now || 0, opts.seed || 0));
    cheek(g, s * 0.6, -s * 0.74, s * 0.13);
    g.strokeStyle = INK; g.lineWidth = s * 0.09; g.lineCap = 'round';
    g.beginPath(); g.arc(s * 0.98, -s * 0.8, s * 0.12, 0.1 * Math.PI, 0.8 * Math.PI); g.stroke();
  });
}

function ladybug(g, x, y, facing, s, walk, opts = {}) {
  pose(g, x, y, facing, s, walk * 1.3, opts, 0.08, () => {
    legs(g, s, walk * 1.3, [-0.5, -0.05, 0.4], 0.45);
    // head
    toon(g, () => circle(g, s * 0.78, -s * 0.58, s * 0.42), '#4A3A56', '#2A1E33', { off: s * 0.08, line: s * 0.14 });
    eye(g, s * 0.94, -s * 0.68, s * 0.21, 1, 0, blinkAt(opts.now || 0, opts.seed || 0));
    // shell dome
    const dome = () => {
      g.beginPath();
      g.moveTo(-s * 0.98, -s * 0.32);
      g.bezierCurveTo(-s * 0.98, -s * 1.56, s * 0.98, -s * 1.56, s * 0.98, -s * 0.32);
      g.quadraticCurveTo(0, -s * 0.18, -s * 0.98, -s * 0.32);
      g.closePath();
    };
    toon(g, dome, '#F25450', '#B3302E', { off: s * 0.14, line: s * 0.14 });
    g.strokeStyle = INK; g.lineWidth = s * 0.09;
    g.beginPath(); g.moveTo(s * 0.05, -s * 1.24); g.quadraticCurveTo(s * 0.1, -s * 0.72, s * 0.05, -s * 0.28); g.stroke();
    g.fillStyle = INK;
    for (const [sx, sy, r] of [[-0.52, -0.66, 0.17], [-0.25, -1.04, 0.13], [0.45, -0.75, 0.16], [0.42, -1.1, 0.1]]) {
      circle(g, sx * s, sy * s, r * s); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.55)';
    ellipse(g, -s * 0.4, -s * 1.12, s * 0.24, s * 0.09, -0.35); g.fill();
  });
}

// a rhinoceros beetle: like the ladybug, but a dark steel-blue shell and a horn
function beetle(g, x, y, facing, s, walk, opts = {}) {
  pose(g, x, y, facing, s, walk, opts, 0.06, () => {
    legs(g, s, walk, [-0.55, -0.1, 0.35], 0.45);
    toon(g, () => circle(g, s * 0.78, -s * 0.55, s * 0.38), '#3C3550', '#221D30', { off: s * 0.08, line: s * 0.14 });
    // horn
    toon(g, () => {
      g.beginPath();
      g.moveTo(s * 0.92, -s * 0.78);
      g.quadraticCurveTo(s * 1.25, -s * 0.9, s * 1.22, -s * 1.38);
      g.quadraticCurveTo(s * 1.08, -s * 1.0, s * 0.8, -s * 0.88);
      g.closePath();
    }, '#4A4362', '#2A2438', { off: s * 0.04, line: s * 0.12 });
    eye(g, s * 0.92, -s * 0.6, s * 0.18, 1, 0, blinkAt(opts.now || 0, opts.seed || 0));
    // frowning brow: it means business
    g.strokeStyle = INK; g.lineWidth = s * 0.09; g.lineCap = 'round';
    g.beginPath(); g.moveTo(s * 0.76, -s * 0.84); g.lineTo(s * 1.06, -s * 0.76); g.stroke();
    const shell = () => {
      g.beginPath();
      g.moveTo(-s * 1.0, -s * 0.3);
      g.bezierCurveTo(-s * 1.0, -s * 1.5, s * 0.9, -s * 1.5, s * 0.9, -s * 0.3);
      g.quadraticCurveTo(0, -s * 0.16, -s * 1.0, -s * 0.3);
      g.closePath();
    };
    toon(g, shell, '#5363C9', '#2E3590', { off: s * 0.14, line: s * 0.14 });
    g.strokeStyle = INK; g.lineWidth = s * 0.08;
    g.beginPath(); g.moveTo(-s * 0.05, -s * 1.2); g.quadraticCurveTo(0, -s * 0.7, -s * 0.05, -s * 0.26); g.stroke();
    // metallic shine
    g.fillStyle = 'rgba(190,210,255,.7)';
    ellipse(g, -s * 0.45, -s * 1.05, s * 0.28, s * 0.08, -0.35); g.fill();
    ellipse(g, s * 0.35, -s * 1.08, s * 0.12, s * 0.05, 0.3); g.fill();
  });
}

// a snail; opts.hide pulls it into its shell
function snail(g, x, y, facing, s, walk, opts = {}) {
  const hide = !!opts.hide;
  pose(g, x, y, facing, s, 0, opts, 0, () => {
    const stretch = 1 + Math.sin(walk * 0.7) * 0.06;
    if (!hide) {
      // soft body along the ground, head raised at the front
      toon(g, () => {
        g.beginPath();
        g.moveTo(-s * 1.05 * stretch, 0);
        g.quadraticCurveTo(-s * 0.4, -s * 0.38, s * 0.6 * stretch, -s * 0.32);
        g.quadraticCurveTo(s * 0.92 * stretch, -s * 1.15, s * 1.12 * stretch, -s * 0.55);
        g.quadraticCurveTo(s * 1.2 * stretch, 0, s * 0.6, 0);
        g.closePath();
      }, '#F2C46D', '#C9963F', { off: s * 0.08, line: s * 0.13, hl: [s * 0.9, -s * 0.75, s * 0.1, s * 0.05], light: 'rgba(255,245,210,.7)' });
      // eye stalks
      const wob = Math.sin(walk * 0.9) * s * 0.06;
      for (const [bx, tx, ty] of [[0.9, 0.92, -1.5], [1.02, 1.28, -1.4]]) {
        g.strokeStyle = INK; g.lineWidth = s * 0.14; g.lineCap = 'round';
        g.beginPath(); g.moveTo(bx * s * stretch, -s * 0.85); g.lineTo(tx * s * stretch + wob, ty * s); g.stroke();
        g.strokeStyle = '#F2C46D'; g.lineWidth = s * 0.06; g.stroke();
        eye(g, tx * s * stretch + wob, ty * s, s * 0.14, 1, 0, blinkAt(opts.now || 0, opts.seed || 0));
      }
      cheek(g, s * 1.0 * stretch, -s * 0.48, s * 0.1);
    }
    // the shell: a spiral house
    const sy = hide ? -s * 0.62 : -s * 0.92;
    toon(g, () => circle(g, -s * 0.15, sy, s * 0.66), '#D9895A', '#A35A33',
      { off: s * 0.12, line: s * 0.14, hl: [-s * 0.38, sy - s * 0.32, s * 0.18, s * 0.08], light: 'rgba(255,225,190,.55)' });
    g.strokeStyle = '#7A3E22'; g.lineWidth = s * 0.1; g.lineCap = 'round';
    g.beginPath();
    for (let k = 0; k <= 40; k++) {
      const a = k / 40 * Math.PI * 3.2, r = s * (0.06 + k / 40 * 0.46);
      const px = -s * 0.12 + Math.cos(a) * r, py = sy + Math.sin(a) * r;
      if (k) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.stroke();
    if (hide) {   // peeking out
      eye(g, s * 0.42, -s * 0.18, s * 0.11, 1, 0.3, 0);
    }
  });
}

// a caterpillar: a row of bobbing segments
function caterpillar(g, x, y, facing, s, walk, opts = {}) {
  pose(g, x, y, facing, s, 0, opts, 0, () => {
    const segs = [-1.15, -0.72, -0.3];
    segs.forEach((sx, i) => {
      const lift = Math.max(0, Math.sin(walk * 1.2 - i * 0.9)) * s * 0.18;
      const cy = -s * 0.42 - lift;
      // little feet
      g.fillStyle = INK;
      ellipse(g, sx * s, -s * 0.04, s * 0.1, s * 0.06); g.fill();
      toon(g, () => circle(g, sx * s, cy, s * 0.42), i % 2 ? '#8BD346' : '#9EE05A', '#5A9A2E',
        { off: s * 0.08, line: s * 0.13, hl: [sx * s - s * 0.12, cy - s * 0.18, s * 0.12, s * 0.06], light: 'rgba(240,255,200,.6)' });
      circle(g, sx * s + s * 0.05, cy - s * 0.05, s * 0.07);
      g.fillStyle = '#FFD35C'; g.fill();
    });
    const hb = Math.max(0, Math.sin(walk * 1.2 + 0.9)) * s * 0.12;
    antenna(g, s * 0.3, -s * 1.0 - hb, s * 0.5, -s * 1.55 - hb, s * 0.11, Math.sin(walk) * s * 0.05);
    antenna(g, s * 0.52, -s * 0.95 - hb, s * 0.88, -s * 1.42 - hb, s * 0.11, Math.sin(walk + 1) * s * 0.05);
    toon(g, () => circle(g, s * 0.42, -s * 0.62 - hb, s * 0.5), '#A8E86A', '#5A9A2E',
      { off: s * 0.09, line: s * 0.14, hl: [s * 0.26, -s * 0.85 - hb, s * 0.15, s * 0.07], light: 'rgba(240,255,200,.7)' });
    eye(g, s * 0.6, -s * 0.72 - hb, s * 0.21, 1, 0.1, blinkAt(opts.now || 0, opts.seed || 0));
    cheek(g, s * 0.45, -s * 0.42 - hb, s * 0.12);
    g.strokeStyle = INK; g.lineWidth = s * 0.08; g.lineCap = 'round';
    g.beginPath(); g.arc(s * 0.74, -s * 0.48 - hb, s * 0.1, 0.1 * Math.PI, 0.8 * Math.PI); g.stroke();
  });
}

// wings for the flyers; flap 0..1
function wing(g, cx, cy, rx, ry, rot, fill, flap, line) {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  g.scale(1, 0.25 + flap * 0.75);
  ellipse(g, 0, -ry, rx, ry);
  g.restore();
  ink(g, fill, line);
}

function moth(g, x, y, facing, s, walk, opts = {}) {
  const flap = Math.abs(Math.sin(walk * 1.6));
  pose(g, x, y, facing, s, walk, opts, 0.05, () => {
    wing(g, -s * 0.2, -s * 0.75, s * 0.7, s * 0.55, -0.5, '#B9A2DC', flap, s * 0.12);
    // fuzzy body
    toon(g, () => ellipse(g, -s * 0.1, -s * 0.6, s * 0.62, s * 0.36), '#E9DCC6', '#B5A189', { off: s * 0.08, line: s * 0.13 });
    g.strokeStyle = 'rgba(120,95,70,.5)'; g.lineWidth = s * 0.07;
    for (const k of [-0.45, -0.2]) { g.beginPath(); g.moveTo(k * s, -s * 0.9); g.lineTo(k * s, -s * 0.3); g.stroke(); }
    wing(g, s * 0.05, -s * 0.72, s * 0.62, s * 0.5, -0.15, '#D7C7F2', flap, s * 0.12);
    g.fillStyle = 'rgba(120,80,170,.6)';
    circle(g, s * 0.02, -s * 1.15 * (0.25 + flap * 0.75) - s * 0.72 * (1 - flap) * 0.2, s * 0.1); g.fill();
    // feathery antennae
    g.strokeStyle = INK; g.lineWidth = s * 0.07; g.lineCap = 'round';
    for (const dx of [0.55, 0.75]) {
      g.beginPath(); g.moveTo(dx * s, -s * 0.85); g.quadraticCurveTo((dx + 0.15) * s, -s * 1.3, (dx + 0.35) * s, -s * 1.35); g.stroke();
    }
    toon(g, () => circle(g, s * 0.58, -s * 0.65, s * 0.3), '#F3E8D4', '#C2AE93', { off: s * 0.05, line: s * 0.12 });
    eye(g, s * 0.68, -s * 0.7, s * 0.16, 1, 0, blinkAt(opts.now || 0, opts.seed || 0));
  });
}

function wasp(g, x, y, facing, s, walk, opts = {}) {
  const flap = Math.abs(Math.sin((opts.now || 0) * 40 + (opts.seed || 0)));
  pose(g, x, y, facing, s, walk, opts, 0.04, () => {
    // stinger
    toon(g, () => { g.beginPath(); g.moveTo(-s * 1.0, -s * 0.5); g.lineTo(-s * 1.35, -s * 0.38); g.lineTo(-s * 0.95, -s * 0.32); g.closePath(); },
      '#3A2A2A', '#1E1414', { off: s * 0.02, line: s * 0.1 });
    // striped abdomen
    const abd = () => ellipse(g, -s * 0.5, -s * 0.55, s * 0.55, s * 0.36, 0.2);
    toon(g, abd, '#FFD23F', '#D69E1C', { off: s * 0.08, line: 0 });
    g.save(); abd(); g.clip();
    g.fillStyle = '#2C1F1F';
    for (const k of [-0.75, -0.42]) { g.fillRect(k * s, -s * 1.0, s * 0.14, s * 1.0); }
    g.restore();
    abd(); g.strokeStyle = INK; g.lineWidth = s * 0.13; g.stroke();
    // thorax and head
    toon(g, () => circle(g, s * 0.1, -s * 0.62, s * 0.26), '#3A2A2A', '#1E1414', { off: s * 0.05, line: s * 0.12 });
    g.globalAlpha = 0.8;
    wing(g, -s * 0.05, -s * 0.8, s * 0.48, s * 0.42, -0.45, 'rgba(230,245,255,.75)', flap, s * 0.08);
    wing(g, s * 0.12, -s * 0.82, s * 0.4, s * 0.36, -0.1, 'rgba(230,245,255,.85)', flap, s * 0.08);
    g.globalAlpha = 1;
    toon(g, () => circle(g, s * 0.52, -s * 0.66, s * 0.3), '#FFD23F', '#D69E1C', { off: s * 0.05, line: s * 0.12 });
    eye(g, s * 0.62, -s * 0.7, s * 0.16, 1, 0.2, blinkAt(opts.now || 0, opts.seed || 0));
    g.strokeStyle = INK; g.lineWidth = s * 0.08; g.lineCap = 'round';
    g.beginPath(); g.moveTo(s * 0.48, -s * 0.9); g.lineTo(s * 0.78, -s * 0.84); g.stroke();
  });
}

// a grasshopper; opts.hop (0..1) while it's in the air stretches the legs out
function hopper(g, x, y, facing, s, walk, opts = {}) {
  const air = opts.hop !== undefined && opts.hop !== null;
  pose(g, x, y, facing, s, air ? 0 : walk, opts, 0.05, () => {
    if (!air) legs(g, s, walk, [0.2, 0.5], 0.42);
    // big hind leg: folded on the ground, kicked out in the air
    toon(g, () => {
      g.beginPath();
      if (air) {
        g.moveTo(-s * 0.3, -s * 0.6);
        g.lineTo(-s * 1.2, -s * 0.35);
        g.lineTo(-s * 1.25, -s * 0.2);
        g.lineTo(-s * 0.25, -s * 0.42);
      } else {
        g.moveTo(-s * 0.4, -s * 0.55);
        g.lineTo(-s * 0.1, -s * 1.05);
        g.lineTo(-s * 0.02, -s * 0.95);
        g.lineTo(-s * 0.25, -s * 0.45);
      }
      g.closePath();
    }, '#7CC24A', '#4E8A2E', { off: s * 0.05, line: s * 0.12 });
    g.strokeStyle = INK; g.lineWidth = s * 0.12; g.lineCap = 'round';
    g.beginPath();
    if (air) { g.moveTo(-s * 1.2, -s * 0.28); g.lineTo(-s * 1.55, -s * 0.05); }
    else { g.moveTo(-s * 0.06, -s * 1.0); g.lineTo(-s * 0.55, -s * 0.02); }
    g.stroke();
    // long body
    toon(g, () => ellipse(g, -s * 0.2, -s * 0.62, s * 0.78, s * 0.3, -0.08), '#9BDB5C', '#5E9E33',
      { off: s * 0.07, line: s * 0.13, hl: [-s * 0.35, -s * 0.78, s * 0.3, s * 0.06], light: 'rgba(240,255,200,.6)' });
    g.strokeStyle = 'rgba(60,110,30,.6)'; g.lineWidth = s * 0.05;
    for (const k of [-0.75, -0.5, -0.25]) { g.beginPath(); g.moveTo(k * s, -s * 0.85); g.lineTo(k * s - s * 0.05, -s * 0.4); g.stroke(); }
    // head
    toon(g, () => ellipse(g, s * 0.62, -s * 0.78, s * 0.32, s * 0.36, 0.3), '#A8E86A', '#5E9E33', { off: s * 0.06, line: s * 0.13 });
    antenna(g, s * 0.62, -s * 1.1, s * 0.4, -s * 1.85, s * 0.08, 0);
    eye(g, s * 0.72, -s * 0.86, s * 0.18, 1, air ? -0.4 : 0, blinkAt(opts.now || 0, opts.seed || 0));
    cheek(g, s * 0.66, -s * 0.6, s * 0.09);
  });
}

// the Ant Queen: a huge ant with a crown and folded wings
function queen(g, x, y, facing, s, walk, opts = {}) {
  pose(g, x, y, facing, s, walk * 0.8, opts, 0.08, () => {
    const lag = Math.sin(walk - 0.6) * s * 0.05;
    legs(g, s, walk * 0.8, [-0.5, -0.05, 0.35], 0.62);
    // abdomen, big and striped
    const abd = () => ellipse(g, -s * 0.85, -s * 0.8 + lag * 0.5, s * 0.78, s * 0.58, -0.2);
    toon(g, abd, '#B8403A', '#7E2622', { off: s * 0.12, line: 0, hl: [-s * 1.0, -s * 1.1, s * 0.25, s * 0.1], light: 'rgba(255,210,200,.5)' });
    g.save(); abd(); g.clip();
    g.strokeStyle = 'rgba(70,15,15,.45)'; g.lineWidth = s * 0.1;
    for (const k of [-1.25, -0.95, -0.65]) { g.beginPath(); g.moveTo(k * s, -s * 1.4); g.quadraticCurveTo(k * s + s * 0.12, -s * 0.8, k * s, -s * 0.2); g.stroke(); }
    g.restore();
    abd(); g.strokeStyle = INK; g.lineWidth = s * 0.13; g.stroke();
    // folded wings
    g.globalAlpha = 0.75;
    ellipse(g, -s * 0.55, -s * 1.25, s * 0.7, s * 0.2, -0.25);
    ink(g, 'rgba(235,245,255,.8)', s * 0.08);
    g.globalAlpha = 1;
    toon(g, () => circle(g, -s * 0.08, -s * 0.68, s * 0.26), '#A8382F', '#7E2622', { off: s * 0.06, line: s * 0.13 });
    antenna(g, s * 0.5, -s * 1.45, s * 0.8, -s * 2.0, s * 0.1, lag);
    antenna(g, s * 0.7, -s * 1.42, s * 1.15, -s * 1.85, s * 0.1, lag * 1.3);
    toon(g, () => circle(g, s * 0.6, -s * 0.98, s * 0.52), '#C94B40', '#8E2C26',
      { off: s * 0.1, line: s * 0.13, hl: [s * 0.44, -s * 1.22, s * 0.16, s * 0.08], light: 'rgba(255,220,210,.6)' });
    // crown
    toon(g, () => {
      g.beginPath();
      g.moveTo(s * 0.3, -s * 1.38);
      g.lineTo(s * 0.26, -s * 1.78);
      g.lineTo(s * 0.44, -s * 1.58);
      g.lineTo(s * 0.58, -s * 1.86);
      g.lineTo(s * 0.72, -s * 1.58);
      g.lineTo(s * 0.9, -s * 1.76);
      g.lineTo(s * 0.86, -s * 1.36);
      g.quadraticCurveTo(s * 0.58, -s * 1.28, s * 0.3, -s * 1.38);
      g.closePath();
    }, '#FFD35C', '#D9A030', { off: s * 0.04, line: s * 0.09 });
    circle(g, s * 0.58, -s * 1.46, s * 0.06); ink(g, '#FF7EB0', s * 0.04);
    eye(g, s * 0.78, -s * 1.08, s * 0.22, 1, 0.1, blinkAt(opts.now || 0, opts.seed || 0));
    g.strokeStyle = INK; g.lineWidth = s * 0.07; g.lineCap = 'round';
    g.beginPath(); g.moveTo(s * 0.62, -s * 1.3); g.lineTo(s * 0.95, -s * 1.22); g.stroke();
    cheek(g, s * 0.6, -s * 0.76, s * 0.12);
    g.beginPath(); g.arc(s * 0.96, -s * 0.82, s * 0.1, 0.1 * Math.PI, 0.8 * Math.PI); g.stroke();
  });
}

export const ENEMY_SPRITES = { ant, lady: ladybug, beetle, snail, cater: caterpillar, moth, wasp, hopper, queen };

// a small standalone picture of an enemy, for the wave preview
export function enemyIcon(type, size, cssSize = 22) {
  const c = document.createElement('canvas');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(cssSize * dpr);
  const g = c.getContext('2d');
  const scale = cssSize * dpr * 0.36 / size;
  g.setTransform(scale, 0, 0, scale, c.width / 2, c.height / 2 + size * scale * 0.75);
  (ENEMY_SPRITES[type] || ant)(g, 0, 0, 1, size, 0.8, { now: 1000 });
  c.setAttribute('aria-hidden', 'true');
  return c;
}
