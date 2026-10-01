// The look of each court: sky, scenery, a little crowd, the court surface and
// the net. The still parts are painted once into a picture (back), the moving
// parts (clouds, waves, snow, stars, the crowd) every frame (live).

import { W, H, FLOOR, NET_X, NET_H, COURT_L, COURT_R, HALF } from '../config.js';

const FAR = FLOOR - 20, NEAR = FLOOR + 22;   // the court surface, seen a little from above
const INK = '#3B2340';

// a tiny seeded random so the scenery is the same every time
function rand(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function sky(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function cloud(ctx, x, y, s, color = '#fff') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
  ctx.arc(x + 20 * s, y - 10 * s, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 44 * s, y - 2 * s, 17 * s, 0, Math.PI * 2);
  ctx.arc(x + 24 * s, y + 6 * s, 16 * s, 0, Math.PI * 2);
  ctx.fill();
}

function hills(ctx, y, amp, color, seed, step = 120) {
  const r = rand(seed);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR);
  let x = -40;
  ctx.lineTo(x, y);
  while (x < W + 40) {
    const nx = x + step * (0.7 + r() * 0.6);
    ctx.quadraticCurveTo((x + nx) / 2, y - amp * (0.5 + r()), nx, y + (r() - 0.5) * amp * 0.4);
    x = nx;
  }
  ctx.lineTo(W, FLOOR);
  ctx.closePath();
  ctx.fill();
}

// ---------- the court surface and the net, shared by every court ----------

function surface(ctx, c) {
  // front face
  const fg = ctx.createLinearGradient(0, NEAR, 0, H);
  fg.addColorStop(0, c.front); fg.addColorStop(1, c.front2);
  ctx.fillStyle = fg;
  ctx.fillRect(0, NEAR, W, H - NEAR);
  // top
  ctx.fillStyle = c.top;
  ctx.fillRect(0, FAR, W, NEAR - FAR);
  if (c.stripes) {
    ctx.fillStyle = c.stripes;
    for (let i = 0; i < 12; i += 2) {
      const x0 = i * 80, x1 = x0 + 80;
      ctx.beginPath();
      ctx.moveTo(x0 + (x0 - NET_X) * -0.03, FAR); ctx.lineTo(x1 + (x1 - NET_X) * -0.03, FAR);
      ctx.lineTo(x1 + (x1 - NET_X) * 0.03, NEAR); ctx.lineTo(x0 + (x0 - NET_X) * 0.03, NEAR);
      ctx.fill();
    }
  }
  if (c.shine) {
    ctx.fillStyle = c.shine;
    for (const [x, w] of [[90, 120], [330, 60], [610, 140], [820, 50]]) {
      ctx.beginPath();
      ctx.moveTo(x, FAR + 4); ctx.lineTo(x + w, FAR + 4); ctx.lineTo(x + w - 30, NEAR - 4); ctx.lineTo(x - 30, NEAR - 4);
      ctx.fill();
    }
  }
  // the far edge and the lip between top and front
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(0, FAR, W, 3);
  ctx.fillStyle = c.lip;
  ctx.fillRect(0, NEAR - 1, W, 5);

  // court lines, a touch of perspective: the far side is a little narrower
  const at = (x, y) => x + (x - NET_X) * ((y - FLOOR) / (NEAR - FAR)) * 0.06;
  ctx.strokeStyle = c.line; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const fy = FAR + 4, ny = NEAR - 4;
  ctx.beginPath();
  ctx.moveTo(at(COURT_L, fy), fy); ctx.lineTo(at(COURT_R, fy), fy);
  ctx.lineTo(at(COURT_R, ny), ny); ctx.lineTo(at(COURT_L, ny), ny); ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = 2.4;
  for (const sx of [NET_X - HALF * 0.55, NET_X + HALF * 0.55]) {
    ctx.beginPath(); ctx.moveTo(at(sx, fy), fy); ctx.lineTo(at(sx, ny), ny); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(NET_X - HALF * 0.55, FLOOR); ctx.lineTo(NET_X + HALF * 0.55, FLOOR); ctx.stroke();
  // baseline tick marks
  for (const sx of [COURT_L, COURT_R]) {
    ctx.beginPath(); ctx.moveTo(at(sx, FLOOR) + (sx < NET_X ? -1 : 1) * 0, FLOOR - 3); ctx.lineTo(at(sx, FLOOR) + (sx < NET_X ? 10 : -10), FLOOR - 3); ctx.stroke();
  }
}

export function drawNet(ctx, c) {
  const top = FLOOR - NET_H;
  const dx = 11, dy = 20;     // far post is up and to the right a little
  const nb = { x: NET_X - dx, y: FLOOR + dy }, fb = { x: NET_X + dx, y: FLOOR - dy };
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.beginPath(); ctx.moveTo(nb.x, nb.y); ctx.lineTo(fb.x, fb.y); ctx.lineTo(fb.x + 22, fb.y); ctx.lineTo(nb.x + 22, nb.y); ctx.fill();
  // far post
  ctx.fillStyle = c.post;
  ctx.fillRect(fb.x - 3, fb.y - NET_H - 6, 6, NET_H + 6);
  // mesh
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(nb.x, nb.y - NET_H + 4); ctx.lineTo(fb.x, fb.y - NET_H + 4); ctx.lineTo(fb.x, fb.y - 4); ctx.lineTo(nb.x, nb.y - 4); ctx.closePath();
  ctx.fillStyle = c.mesh; ctx.fill();
  ctx.clip();
  ctx.strokeStyle = c.meshLine; ctx.lineWidth = 1;
  for (let i = -6; i <= 6; i++) {
    const f = (i + 6) / 12;
    ctx.beginPath(); ctx.moveTo(nb.x + (fb.x - nb.x) * f, nb.y + (fb.y - nb.y) * f - NET_H); ctx.lineTo(nb.x + (fb.x - nb.x) * f, nb.y + (fb.y - nb.y) * f); ctx.stroke();
  }
  for (let y = 0; y < NET_H; y += 7) {
    ctx.beginPath(); ctx.moveTo(nb.x, nb.y - y); ctx.lineTo(fb.x, fb.y - y); ctx.stroke();
  }
  ctx.restore();
  // tape
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(nb.x, nb.y - NET_H + 2); ctx.lineTo(fb.x, fb.y - NET_H + 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(59,35,64,.25)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(nb.x, nb.y - NET_H + 5.5); ctx.lineTo(fb.x, fb.y - NET_H + 5.5); ctx.stroke();
  // near post
  ctx.fillStyle = c.post;
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(nb.x - 4, nb.y - NET_H - 8, 8, NET_H + 8, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(nb.x, nb.y - NET_H - 9, 5, 0, Math.PI * 2); ctx.fillStyle = c.postTop || c.post; ctx.fill(); ctx.stroke();
  void top;
}

// ---------- a small crowd of fans that bounce when a point is won ----------

function makeCrowd(seed, n, y0, colors, kind) {
  const r = rand(seed);
  const fans = [];
  for (let i = 0; i < n; i++) {
    const x = 30 + (i + r() * 0.6) * ((W - 60) / n);
    if (Math.abs(x - NET_X) < 26) continue;
    fans.push({ x, y: y0 + r() * 10, c: colors[(r() * colors.length) | 0], ph: r() * 6, s: 0.8 + r() * 0.35, ear: (r() * 3) | 0, kind });
  }
  return fans;
}

function drawFan(ctx, f, hop) {
  const y = f.y - hop;
  ctx.save();
  ctx.translate(f.x, y);
  ctx.scale(f.s, f.s);
  ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(59,35,64,.5)';
  if (f.kind === 'alien') {
    ctx.strokeStyle = 'rgba(30,20,60,.6)';
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -20); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -21, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#FFE45C'; ctx.fill();
  } else if (f.ear === 0) {
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 4, -15, 2.6, 7, s * 0.2, 0, Math.PI * 2); ctx.fillStyle = f.c; ctx.fill(); ctx.stroke(); }
  } else if (f.ear === 1) {
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 7, -8, 3.6, 0, Math.PI * 2); ctx.fillStyle = f.c; ctx.fill(); ctx.stroke(); }
  } else {
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 9, -5); ctx.lineTo(s * 7, -15); ctx.lineTo(s * 2, -9); ctx.closePath(); ctx.fillStyle = f.c; ctx.fill(); ctx.stroke(); }
  }
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fillStyle = f.c; ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK;
  if (hop > 3) {
    ctx.lineWidth = 1.4; ctx.strokeStyle = INK;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 3.5, -1, 2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 3, 2.6, 0, Math.PI); ctx.fillStyle = '#C2416B'; ctx.fill();
    // waving arms
    ctx.strokeStyle = f.c; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 8, 2); ctx.lineTo(s * 14, -8); ctx.stroke(); }
  } else {
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 3.5, -1, 1.4, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

function crowd(ctx, fans, t, cheer) {
  for (const f of fans) {
    const idle = Math.max(0, Math.sin(t * 2 + f.ph)) * 1.5;
    const hop = cheer > 0 ? Math.abs(Math.sin(t * 11 + f.ph)) * 10 * Math.min(1, cheer) : idle;
    drawFan(ctx, f, hop);
  }
}

// ---------- the four courts ----------

const gardenFans = makeCrowd(11, 30, FAR - 44, ['#FFD5E0', '#FFE7A8', '#C9F0B8', '#CFE3FF', '#FFC8A8', '#E6D6FF', '#fff'], 'pal');
const beachFans = makeCrowd(23, 24, FAR - 40, ['#FFB4A2', '#FFE08A', '#A8E6CF', '#B5D8FF', '#fff', '#FFC1E3'], 'pal');
const iceFans = makeCrowd(37, 28, FAR - 46, ['#E8F4FF', '#C6E2FF', '#FFE0EC', '#fff', '#D9D2FF', '#FFE9B5'], 'pal');
const moonFans = makeCrowd(51, 22, FAR - 40, ['#9BF59B', '#7FE3FF', '#C59BFF', '#FFB2E0', '#B6FF8A'], 'alien');

export const COURT_ART = {
  garden: {
    page: ['#8FD3FF', '#C8F2B5'], dark: false,
    top: '#6CC35A', stripes: 'rgba(255,255,255,.1)', front: '#7A5233', front2: '#5C3A22', lip: '#4F9E41', line: '#fff',
    mesh: 'rgba(255,255,255,.18)', meshLine: 'rgba(255,255,255,.75)', post: '#2F6B3A', postTop: '#FFD23F',
    back(ctx) {
      sky(ctx, ['#7CCBFF', '#B7E6FF', '#E8F8FF']);
      ctx.fillStyle = 'rgba(255,240,170,.9)';
      ctx.beginPath(); ctx.arc(830, 78, 34, 0, Math.PI * 2); ctx.fill();
      hills(ctx, FAR - 120, 50, '#A8DE8F', 3, 170);
      hills(ctx, FAR - 78, 34, '#8ED07A', 9, 120);
      // trees
      const r = rand(5);
      for (let i = 0; i < 6; i++) {
        const x = 40 + i * 180 + r() * 60, y = FAR - 70;
        ctx.fillStyle = '#8A5A3A'; ctx.fillRect(x - 4, y - 10, 8, 30);
        ctx.fillStyle = i % 2 ? '#5DB84C' : '#4DA83E';
        ctx.beginPath(); ctx.arc(x, y - 22, 22, 0, Math.PI * 2); ctx.arc(x - 15, y - 10, 15, 0, Math.PI * 2); ctx.arc(x + 15, y - 10, 15, 0, Math.PI * 2); ctx.fill();
      }
      // hedge behind the fans' bench
      ctx.fillStyle = '#3F9440';
      ctx.beginPath(); ctx.moveTo(0, FAR);
      for (let x = 0; x <= W; x += 24) ctx.arc(x, FAR - 22, 15, Math.PI, 0);
      ctx.lineTo(W, FAR); ctx.fill();
      ctx.fillStyle = '#4DAA4D'; ctx.fillRect(0, FAR - 22, W, 22);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = ['#FF7FA8', '#FFD23F', '#fff', '#B98CFF'][i % 4];
        ctx.beginPath(); ctx.arc(10 + i * 24 + r() * 10, FAR - 14 - r() * 18, 3.2, 0, Math.PI * 2); ctx.fill();
      }
    },
    live(ctx, t, s, cheer) {
      for (const [x0, y, sp, k] of [[0, 70, 9, 1], [380, 120, 6, 0.8], [700, 52, 11, 1.1], [200, 160, 5, 0.6]]) {
        const x = ((x0 + t * sp) % (W + 200)) - 100;
        cloud(ctx, x, y, k, 'rgba(255,255,255,.92)');
      }
      crowd(ctx, gardenFans, t, cheer);
      // bunting between two poles
      ctx.strokeStyle = 'rgba(59,35,64,.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 40); ctx.quadraticCurveTo(W / 2, 90, W, 40); ctx.stroke();
      for (let i = 1; i < 24; i++) {
        const x = i * W / 24, f = x / W, y = 40 + 4 * 50 * f * (1 - f);
        ctx.fillStyle = ['#FF6F9C', '#FFD23F', '#4C8DFF', '#3DDC97'][i % 4];
        const sw = Math.sin(t * 2 + i) * 2;
        ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.lineTo(x + sw, y + 18); ctx.fill();
      }
    }
  },

  beach: {
    page: ['#FFC48C', '#8EE3F0'], dark: false,
    top: '#F6D79A', stripes: null, front: '#E2B56E', front2: '#C8954C', lip: '#E8BF7A', line: '#3F8CFF',
    mesh: 'rgba(255,255,255,.2)', meshLine: 'rgba(255,255,255,.8)', post: '#2F5E9E', postTop: '#FF6A3D',
    back(ctx) {
      sky(ctx, ['#FF9E7A', '#FFC48C', '#FFE6B0']);
      ctx.fillStyle = '#FFF2C4';
      ctx.beginPath(); ctx.arc(720, 150, 54, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,242,196,.35)';
      ctx.beginPath(); ctx.arc(720, 150, 80, 0, Math.PI * 2); ctx.fill();
      // the sea
      const sea = ctx.createLinearGradient(0, FAR - 120, 0, FAR - 40);
      sea.addColorStop(0, '#3FB8D8'); sea.addColorStop(1, '#7FE0EE');
      ctx.fillStyle = sea; ctx.fillRect(0, FAR - 120, W, 90);
      // sand
      ctx.fillStyle = '#F2CF8E';
      ctx.beginPath(); ctx.moveTo(0, FAR - 34); ctx.quadraticCurveTo(300, FAR - 52, 560, FAR - 38); ctx.quadraticCurveTo(800, FAR - 26, W, FAR - 44); ctx.lineTo(W, FAR); ctx.lineTo(0, FAR); ctx.fill();
      // palm trees
      for (const [x, lean] of [[46, 0.15], [910, -0.2]]) {
        ctx.save(); ctx.translate(x, FAR - 30); ctx.rotate(lean);
        ctx.fillStyle = '#A4703E';
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(0, -i * 17, 8 - i * 0.3, 9, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.translate(0, -160);
        ctx.fillStyle = '#3DAA5A';
        for (let i = 0; i < 6; i++) {
          ctx.save(); ctx.rotate(-2.6 + i * 1.04);
          ctx.beginPath(); ctx.ellipse(36, 0, 40, 9, 0.25, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = '#7A4A26';
        for (const [cx, cy] of [[-6, 6], [6, 8], [0, 12]]) { ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      // umbrella
      ctx.save(); ctx.translate(820, FAR - 26);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -70); ctx.stroke();
      ctx.translate(-8, -70);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#fff' : '#FF5E7E';
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.arc(0, 18, 50, Math.PI + i * Math.PI / 4, Math.PI + (i + 1) * Math.PI / 4); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
    live(ctx, t, s, cheer) {
      // waves
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let row = 0; row < 3; row++) {
        const y = FAR - 108 + row * 24;
        ctx.beginPath();
        for (let x = -20; x < W + 20; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.03 + t * (1.5 + row * 0.4) + row) * 3);
        ctx.stroke();
      }
      for (const [x0, y, sp] of [[100, 60, 7], [600, 40, 10]]) cloud(ctx, ((x0 + t * sp) % (W + 200)) - 100, y, 0.8, 'rgba(255,255,255,.8)');
      // a seagull or two
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) {
        const x = ((t * (30 + i * 12) + i * 400) % (W + 100)) - 50, y = 90 + i * 40 + Math.sin(t * 2 + i) * 6, f = Math.sin(t * 8 + i) * 4;
        ctx.beginPath(); ctx.moveTo(x - 10, y - f); ctx.quadraticCurveTo(x - 5, y - 6, x, y); ctx.quadraticCurveTo(x + 5, y - 6, x + 10, y - f); ctx.stroke();
      }
      crowd(ctx, beachFans, t, cheer);
    }
  },

  ice: {
    page: ['#B9C8FF', '#E6F4FF'], dark: false,
    top: '#CFEFFF', stripes: null, shine: 'rgba(255,255,255,.55)', front: '#8FD0F0', front2: '#5FAFDA', lip: '#B2E2F7', line: '#FF6F9C',
    mesh: 'rgba(255,255,255,.25)', meshLine: 'rgba(80,120,170,.6)', post: '#5E6FA8', postTop: '#fff',
    back(ctx) {
      sky(ctx, ['#8D9BEA', '#B9C8FF', '#E8EEFF']);
      // mountains
      const r = rand(17);
      for (const [y, col, snow] of [[FAR - 170, '#9AA7E0', '#fff'], [FAR - 110, '#7E8FD6', '#F2F6FF']]) {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(0, FAR);
        let x = -60;
        const peaks = [];
        while (x < W + 60) { const w = 120 + r() * 120, h = 40 + r() * 70; peaks.push([x + w / 2, y - h, w]); ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w, y); x += w; }
        ctx.lineTo(W, FAR); ctx.fill();
        ctx.fillStyle = snow;
        for (const [px, py, w] of peaks) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - w * 0.14, py + 26); ctx.lineTo(px, py + 18); ctx.lineTo(px + w * 0.14, py + 26); ctx.fill(); }
      }
      // pines
      for (let i = 0; i < 14; i++) {
        const x = 20 + i * 70 + r() * 30, y = FAR - 40, h = 50 + r() * 26;
        ctx.fillStyle = '#3E7A72';
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x, y - h + k * 14); ctx.lineTo(x - 16 + k * 2, y - h + 28 + k * 16); ctx.lineTo(x + 16 - k * 2, y - h + 28 + k * 16); ctx.fill(); }
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x - 6, y - h + 11); ctx.lineTo(x + 6, y - h + 11); ctx.fill();
      }
      // rink boards
      ctx.fillStyle = '#fff'; ctx.fillRect(0, FAR - 24, W, 24);
      ctx.fillStyle = '#FF8FB0'; ctx.fillRect(0, FAR - 24, W, 4);
      ctx.fillStyle = '#7FB6FF'; ctx.fillRect(0, FAR - 6, W, 3);
    },
    live(ctx, t, s, cheer) {
      crowd(ctx, iceFans, t, cheer);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 46; i++) {
        const x = (i * 97 + Math.sin(t * 0.8 + i) * 20 + t * 12) % W;
        const y = (i * 53 + t * (24 + (i % 5) * 6)) % FLOOR;
        ctx.beginPath(); ctx.arc(x, y, 1.6 + (i % 3) * 0.7, 0, Math.PI * 2); ctx.fill();
      }
    }
  },

  moon: {
    page: ['#1B1440', '#3A2C78'], dark: true,
    top: '#8E86B8', stripes: null, shine: 'rgba(160,240,255,.18)', front: '#5F578C', front2: '#3D3566', lip: '#A49CCB', line: '#7DF9FF',
    mesh: 'rgba(125,249,255,.12)', meshLine: 'rgba(125,249,255,.65)', post: '#4B4380', postTop: '#FF5EC4',
    back(ctx) {
      sky(ctx, ['#0F0B2E', '#241A5C', '#3D2E80']);
      const r = rand(29);
      // earth
      ctx.fillStyle = '#4FA3FF'; ctx.beginPath(); ctx.arc(780, 95, 42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5ED18B';
      ctx.beginPath(); ctx.ellipse(768, 82, 16, 11, 0.5, 0, Math.PI * 2); ctx.ellipse(796, 110, 13, 8, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(770, 100, 20, 4, 0.2, 0, Math.PI * 2); ctx.fill();
      // ringed planet
      ctx.save(); ctx.translate(170, 120); ctx.rotate(-0.3);
      ctx.fillStyle = '#FFB86B'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,170,.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 40, 9, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      // moon ground with craters
      ctx.fillStyle = '#6E66A0';
      ctx.beginPath(); ctx.moveTo(0, FAR - 30);
      for (let x = 0; x <= W; x += 60) ctx.quadraticCurveTo(x + 30, FAR - 46 - r() * 20, x + 60, FAR - 30 - r() * 12);
      ctx.lineTo(W, FAR); ctx.lineTo(0, FAR); ctx.fill();
      ctx.fillStyle = 'rgba(40,30,80,.35)';
      for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.ellipse(r() * W, FAR - 12 - r() * 20, 14 + r() * 16, 4 + r() * 3, 0, 0, Math.PI * 2); ctx.fill(); }
      // a little base dome
      ctx.fillStyle = 'rgba(180,240,255,.35)'; ctx.strokeStyle = '#B7F3FF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(890, FAR - 30, 46, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4B4380'; ctx.fillRect(840, FAR - 32, 100, 10);
    },
    live(ctx, t, s, cheer) {
      const r = rand(41);
      for (let i = 0; i < 70; i++) {
        const x = r() * W, y = r() * (FAR - 90), k = 0.5 + 0.5 * Math.sin(t * (1 + r() * 2) + i);
        ctx.fillStyle = `rgba(255,255,255,${0.3 + k * 0.7})`;
        ctx.beginPath(); ctx.arc(x, y, 0.8 + k * 1.2, 0, Math.PI * 2); ctx.fill();
      }
      // a shooting star now and then
      const p = (t % 7) / 7;
      if (p < 0.12) {
        const k = p / 0.12, x = 300 + k * 300, y = 40 + k * 90;
        ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 40, y - 12); ctx.stroke();
      }
      crowd(ctx, moonFans, t, cheer);
    }
  }
};

export function drawSurface(ctx, art) { surface(ctx, art); }
export { FAR, NEAR };
