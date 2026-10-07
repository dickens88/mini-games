// The four worlds' looks: page colours, sky, ground and what the meteors are
// made of. The still parts of each background are drawn once into a spare
// canvas; only twinkles, bubbles and embers are drawn every frame.

import { W, H, GROUND } from '../config.js';

const TAU = Math.PI * 2;

export const THEMES = {
  moon: {
    page: ['#1B1F4B', '#4A3C8C'], dark: true,
    sky: ['#0B0F33', '#2A2468'], ground: ['#C9C3DA', '#8E86AA'], groundLine: '#E9E5F5',
    trail: [255, 160, 70], burst: ['#FFB347', '#FF7043', '#FFE08A', '#B9AFA6']
  },
  ocean: {
    page: ['#0B4F86', '#3FB4D8'], dark: true,
    sky: ['#04305C', '#0E86B8'], ground: ['#F6DCA6', '#D7AE6B'], groundLine: '#FFF0C8',
    trail: [190, 240, 255], burst: ['#BFF4FF', '#7FDBFF', '#FFFFFF', '#5FC9F8']
  },
  candy: {
    page: ['#FF9ECF', '#B79BFF'], dark: false,
    sky: ['#FFB3DA', '#A98BFF'], ground: ['#E9AE68', '#B97A3A'], groundLine: '#FFE1B0',
    trail: [255, 255, 255], burst: ['#FF6FB5', '#7EE8C8', '#FFE066', '#B48CFF']
  },
  volcano: {
    page: ['#2B0A12', '#8A2A1A'], dark: true,
    sky: ['#1A060C', '#6E1A16'], ground: ['#4A3030', '#251516'], groundLine: '#FF8A3D',
    trail: [255, 110, 40], burst: ['#FF6A00', '#FFB300', '#FF3D00', '#5A4040']
  }
};

// small fixed random numbers so the scenery is the same every time
function seeded(n) {
  let a = (n * 0x9E3779B1) | 0;
  return () => {
    let t = (a = (a + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function groundPath(ctx, lift) {
  ctx.beginPath();
  ctx.moveTo(0, GROUND + 10 - lift);
  ctx.quadraticCurveTo(W / 2, GROUND - 16 - lift, W, GROUND + 10 - lift);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
}

function drawStill(ctx, id) {
  const th = THEMES[id];
  const rnd = seeded(id.length * 31 + id.charCodeAt(0));
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  if (id === 'moon') {
    // a ringed planet and the Earth far away
    ctx.save();
    ctx.translate(430, 190);
    ctx.fillStyle = '#7F6BD6'; ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(-12, -14, 30, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,140,.75)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(0, 0, 78, 16, -0.35, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#4FA3FF'; ctx.beginPath(); ctx.arc(95, 300, 20, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5ED18A'; ctx.beginPath(); ctx.ellipse(90, 296, 9, 6, 0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(103, 308, 6, 4, -0.3, 0, TAU); ctx.fill();
  } else if (id === 'ocean') {
    // light rays and far seaweed
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let i = 0; i < 5; i++) {
      const x = 40 + i * 120;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 50, 0); ctx.lineTo(x - 60, GROUND); ctx.lineTo(x - 130, GROUND); ctx.fill();
    }
    ctx.fillStyle = 'rgba(10,60,90,.45)';
    for (let i = 0; i < 9; i++) {
      const x = rnd() * W, h = 60 + rnd() * 90;
      ctx.beginPath(); ctx.moveTo(x - 8, GROUND);
      ctx.quadraticCurveTo(x - 20, GROUND - h / 2, x, GROUND - h);
      ctx.quadraticCurveTo(x + 18, GROUND - h / 2, x + 8, GROUND); ctx.fill();
    }
  } else if (id === 'candy') {
    // candy-floss clouds and a lollipop moon
    for (let i = 0; i < 5; i++) {
      const x = rnd() * W, y = 120 + rnd() * 380, s = 0.7 + rnd() * 0.7;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.45)' : 'rgba(255,220,245,.5)';
      for (const [dx, dy, r] of [[-30, 6, 22], [0, -6, 30], [32, 4, 24], [10, 12, 22]]) {
        ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill();
      }
    }
    ctx.save(); ctx.translate(440, 150);
    ctx.fillStyle = '#FFF3A8'; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#FF7FB8'; ctx.lineWidth = 6;
    ctx.beginPath();
    for (let a = 0; a < 12; a += 0.1) { const r = a * 3; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.stroke(); ctx.restore();
  } else {
    // dark volcanoes on the horizon
    ctx.fillStyle = '#3A0E12';
    for (const [x, h, w] of [[80, 170, 150], [300, 230, 200], [480, 150, 130]]) {
      ctx.beginPath(); ctx.moveTo(x - w, GROUND); ctx.lineTo(x - 22, GROUND - h); ctx.lineTo(x + 22, GROUND - h); ctx.lineTo(x + w, GROUND); ctx.fill();
      ctx.fillStyle = '#FF6A00'; ctx.beginPath(); ctx.ellipse(x, GROUND - h, 22, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3A0E12';
    }
  }

  // the ground
  const gg = ctx.createLinearGradient(0, GROUND - 16, 0, H);
  gg.addColorStop(0, th.ground[0]); gg.addColorStop(1, th.ground[1]);
  ctx.fillStyle = gg; groundPath(ctx, 0); ctx.fill();
  ctx.strokeStyle = th.groundLine; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, GROUND + 10); ctx.quadraticCurveTo(W / 2, GROUND - 16, W, GROUND + 10); ctx.stroke();

  ctx.save(); groundPath(ctx, 0); ctx.clip();
  if (id === 'moon') {
    for (let i = 0; i < 9; i++) {
      const x = rnd() * W, y = GROUND + 16 + rnd() * 60, r = 6 + rnd() * 14;
      ctx.fillStyle = 'rgba(70,60,110,.25)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.12, r * 0.8, r * 0.25, 0, 0, Math.PI); ctx.fill();
    }
  } else if (id === 'ocean') {
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W, y = GROUND + 30 + rnd() * 40;
      ctx.fillStyle = ['#FF8FA3', '#FFD166', '#F4A261'][i % 3];
      ctx.beginPath();
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, r = k % 2 ? 4 : 9; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      ctx.fill();
    }
  } else if (id === 'candy') {
    const cols = ['#FF5FA2', '#5ED6C0', '#FFE04D', '#9D7BFF', '#FFFFFF'];
    for (let i = 0; i < 70; i++) {
      const x = rnd() * W, y = GROUND + 4 + rnd() * 80, a = rnd() * Math.PI;
      ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 4, y - Math.sin(a) * 4); ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); ctx.stroke();
    }
  } else {
    ctx.strokeStyle = '#FF7A1A'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      let x = rnd() * W, y = GROUND + 14 + rnd() * 50;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += 10 + rnd() * 16; y += (rnd() - 0.5) * 14; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  ctx.restore();
}

const cache = {};
function still(id, px) {
  const k = id + '@' + px;
  if (!cache[k]) {
    for (const key in cache) if (key.startsWith(id + '@')) delete cache[key];
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * px); cv.height = Math.round(H * px);
    const c = cv.getContext('2d');
    c.scale(px, px);
    drawStill(c, id);
    cache[k] = cv;
  }
  return cache[k];
}

// moving bits on top of the still picture
const STARS = Array.from({ length: 90 }, (_, i) => { const r = seeded(i + 7); return { x: r() * W, y: r() * (GROUND - 40), s: 0.6 + r() * 1.6, p: r() * TAU }; });

export function drawBackground(ctx, id, px, t) {
  ctx.drawImage(still(id, px), 0, 0, W, H);
  if (id === 'moon' || id === 'volcano') {
    for (const st of STARS) {
      const a = id === 'moon' ? 0.45 + 0.55 * Math.sin(t * 1.6 + st.p) : 0.25 + 0.2 * Math.sin(t * 2 + st.p);
      if (id === 'volcano') {
        // embers drifting up
        const y = (st.y - t * (14 + st.s * 10)) % (GROUND - 40);
        const yy = y < 0 ? y + GROUND - 40 : y;
        ctx.fillStyle = `rgba(255,${120 + st.s * 50 | 0},40,${a + 0.3})`;
        ctx.fillRect(st.x + Math.sin(t + st.p) * 6, yy, st.s * 1.6, st.s * 1.6);
      } else {
        ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.65 * Math.max(0, a)})`;
        ctx.beginPath(); ctx.arc(st.x, st.y, st.s * 1.1, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (id === 'ocean') {
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
    for (const st of STARS) {
      if (st.s < 1.2) continue;
      const y = GROUND - ((t * 22 * st.s + st.y) % (GROUND - 40));
      ctx.beginPath(); ctx.arc(st.x + Math.sin(t * 1.5 + st.p) * 6, y, st.s * 2.2, 0, TAU); ctx.stroke();
    }
  } else {
    for (const st of STARS) {
      if (st.s < 1.5) continue;
      const a = 0.5 + 0.5 * Math.sin(t * 2.2 + st.p);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      const x = st.x, y = st.y, r = st.s * 2.4 * a;
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.3, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.3, y); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x, y + r * 0.3); ctx.lineTo(x + r, y); ctx.lineTo(x, y - r * 0.3); ctx.fill();
    }
  }
}
