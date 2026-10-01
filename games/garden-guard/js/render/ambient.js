// Life that has nothing to do with the game: slow cloud shadows drifting over
// the lawn, a couple of butterflies, and in autumn leaves twirling down.
// Switched off for reduced motion.

import { COLS, ROWS } from '../config.js';
import { TAU, ink, ellipse } from './kit.js';

export function createAmbient(reducedMotion) {
  const clouds = [
    { x: 2, y: 2.2, s: 1.6 },
    { x: 9, y: 5.6, s: 2.1 }
  ];
  const flies = [
    { x: 3, y: 6, tx: 5, ty: 5, col: '#FFD35C', ph: 0 },
    { x: 10, y: 1, tx: 8, ty: 2, col: '#B69CFF', ph: 2 }
  ];

  const LEAF_COLORS = ['#E8892F', '#D65A3A', '#E8B83A', '#C9702A'];
  let leaves = [];

  function retarget(f) {
    f.tx = 0.5 + Math.random() * (COLS - 1);
    f.ty = 0.5 + Math.random() * (ROWS - 1);
  }

  return {
    setTheme(theme) {
      leaves = theme !== 'autumn' ? [] : Array.from({ length: 7 }, (_, i) => ({
        x: Math.random() * COLS, y: Math.random() * ROWS, ph: Math.random() * 6, spin: 0.6 + Math.random(),
        col: LEAF_COLORS[i % LEAF_COLORS.length]
      }));
    },
    update(dt) {
      if (reducedMotion) return;
      for (const l of leaves) {
        l.ph += dt;
        l.y += dt * 0.35;
        l.x += Math.sin(l.ph * 1.3) * dt * 0.5 + dt * 0.08;
        if (l.y > ROWS + 0.3) { l.y = -0.3; l.x = Math.random() * COLS; }
      }
      for (const c of clouds) {
        c.x += dt * 0.12;
        if (c.x - c.s * 2 > COLS) { c.x = -c.s * 2; c.y = 1 + Math.random() * (ROWS - 2); }
      }
      for (const f of flies) {
        const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
        if (d < 0.2) retarget(f);
        else { f.x += dx / d * dt * 0.55; f.y += dy / d * dt * 0.55 + Math.sin(f.ph * 3) * dt * 0.3; }
        f.ph += dt;
      }
    },
    drawShadows(g) {
      if (reducedMotion) return;
      g.fillStyle = 'rgba(20,50,30,.07)';
      for (const c of clouds) {
        g.beginPath();
        for (const [dx, dy, r] of [[0, 0, 1], [0.9, 0.15, 0.75], [-0.85, 0.2, 0.7], [0.3, -0.45, 0.65]]) {
          g.moveTo(c.x + dx * c.s + r * c.s, c.y + dy * c.s);
          g.ellipse(c.x + dx * c.s, c.y + dy * c.s, r * c.s, r * c.s * 0.62, 0, 0, TAU);
        }
        g.fill();
      }
    },
    drawFlies(g) {
      if (reducedMotion) return;
      for (const l of leaves) {
        g.save();
        g.translate(l.x, l.y);
        g.rotate(Math.sin(l.ph * l.spin) * 1.2);
        g.scale(Math.cos(l.ph * l.spin * 1.7), 1);   // flips as it tumbles
        g.beginPath();
        g.moveTo(-0.1, 0);
        g.quadraticCurveTo(0, -0.07, 0.1, 0);
        g.quadraticCurveTo(0, 0.07, -0.1, 0);
        ink(g, l.col, 0.015);
        g.restore();
      }
      for (const f of flies) {
        const flap = Math.abs(Math.sin(f.ph * 14));
        const facing = f.tx >= f.x ? 1 : -1;
        g.save();
        g.translate(f.x, f.y - 0.2);
        g.scale(facing, 1);
        for (const [dy, s] of [[-0.03, 1], [0.04, 0.7]]) {
          ellipse(g, -0.02, dy, 0.1 * s, 0.075 * s * (0.25 + flap * 0.75), -0.5);
          ink(g, f.col, 0.02);
        }
        ellipse(g, 0, 0, 0.06, 0.018);
        ink(g, '#2B1D33', 0.01);
        g.restore();
      }
    }
  };
}
