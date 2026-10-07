// The animal heroes, drawn from shapes (adapted from Rally Pals): round
// head, little shirt, and one arm holding up the star blaster. The pal faces
// +x; dir -1 flips it to face left.

const INK = '#3B2340';

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function fillStroke(ctx, fill, stroke, w = 2.4) {
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = w; ctx.strokeStyle = stroke; ctx.stroke();
}

function ears(ctx, pal) {
  const f = pal.earFur || pal.fur, line = shade(pal.fur2);
  if (pal.ears === 'long') {
    for (const [x, r] of [[-9, -0.18], [9, 0.2]]) {
      ellipse(ctx, x, -96, 7.5, 19, r); fillStroke(ctx, f, line);
      ellipse(ctx, x, -94, 3.6, 13, r); ctx.fillStyle = pal.inner; ctx.fill();
    }
  } else if (pal.ears === 'point') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 22 + 3, -72); ctx.lineTo(s * 17 + 3, -95); ctx.lineTo(s * 4 + 3, -82); ctx.closePath();
      fillStroke(ctx, f, line);
      ctx.beginPath();
      ctx.moveTo(s * 18 + 3, -76); ctx.lineTo(s * 16 + 3, -90); ctx.lineTo(s * 8 + 3, -82); ctx.closePath();
      ctx.fillStyle = pal.inner; ctx.fill();
    }
  } else if (pal.ears === 'round') {
    for (const s of [-1, 1]) {
      ellipse(ctx, s * 18 + 2, -83, 9.5, 9.5); fillStroke(ctx, f, pal.earFur ? f : line);
      if (!pal.earFur) { ellipse(ctx, s * 18 + 2, -82, 5, 5); ctx.fillStyle = pal.inner; ctx.fill(); }
    }
  }
}

// a darker outline colour from a fill colour
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const k = 0.62;
  return `rgb(${(r * k) | 0},${(g * k) | 0},${(b * k) | 0})`;
}

function eye(ctx, x, y, mood, r = 3.7) {
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineWidth = 2.4;
  if (mood === 'happy') {
    ctx.beginPath(); ctx.arc(x, y + 1.5, 3.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else if (mood === 'bonk') {
    ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke();
  } else if (mood === 'dizzy') {
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.3) {
      const rr = 0.6 + a * 0.32;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.stroke();
  } else if (mood === 'sad') {
    ellipse(ctx, x, y + 1, r * 0.8, r * 0.9); ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x - 4, y - 6); ctx.lineTo(x + 3, y - 4.5); ctx.stroke();
  } else {
    ellipse(ctx, x, y, r * 0.9, r * 1.1); ctx.fill();
    ctx.fillStyle = '#fff';
    ellipse(ctx, x + 1.2, y - 1.4, 1.3, 1.3); ctx.fill();
  }
}

function face(ctx, pal, mood, open, t) {
  const blink = mood ? false : (t % 3.7) < 0.12;
  const ex1 = -3, ex2 = 13, ey = -64;
  if (pal.patches) {
    ctx.fillStyle = pal.patches;
    ellipse(ctx, ex1 - 0.5, ey + 1, 6, 7.5, 0.4); ctx.fill();
    ellipse(ctx, ex2 + 0.5, ey + 1, 6, 7.5, -0.4); ctx.fill();
  }
  if (pal.stripes) {
    ctx.strokeStyle = pal.stripes; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (const x of [-2, 5, 12]) { ctx.beginPath(); ctx.moveTo(x, -86); ctx.lineTo(x + 1, -79); ctx.stroke(); }
  }
  if (pal.ears === 'frog') {
    // frog eyes sit on top of the head
    for (const x of [-10, 12]) {
      ellipse(ctx, x, -84, 10, 10); fillStroke(ctx, pal.fur, shade(pal.fur2));
      ellipse(ctx, x, -84, 6.5, 6.5); ctx.fillStyle = '#fff'; ctx.fill();
      if (blink) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, -84); ctx.lineTo(x + 4, -84); ctx.stroke(); }
      else eye(ctx, x + 1, -84, mood, 3.2);
    }
  } else if (blink) {
    ctx.strokeStyle = pal.patches ? '#fff' : INK; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (const x of [ex1, ex2]) { ctx.beginPath(); ctx.moveTo(x - 3, ey); ctx.lineTo(x + 3, ey); ctx.stroke(); }
  } else {
    eye(ctx, ex1, ey, mood);
    eye(ctx, ex2, ey, mood);
  }
  // cheeks
  ctx.fillStyle = 'rgba(255,120,150,.32)';
  ellipse(ctx, -10, -53, 5, 3.4); ctx.fill();
  ellipse(ctx, 21, -53, 4.5, 3.4); ctx.fill();
  // muzzle and nose
  if (pal.muzzle && pal.muzzle !== pal.fur && pal.ears !== 'frog') {
    ellipse(ctx, 6, -53, 9.5, 6.8); ctx.fillStyle = pal.muzzle; ctx.fill();
  }
  if (pal.ears !== 'frog') {
    ctx.fillStyle = pal.id === 'bunny' || pal.id === 'kitty' ? '#FF8FB0' : INK;
    ellipse(ctx, 6.5, -56.5, 2.8, 2); ctx.fill();
  }
  // mouth
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
  if (mood === 'sad') {
    ctx.beginPath(); ctx.arc(6.5, -46, 4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  } else if (mood === 'happy' || open) {
    ctx.beginPath(); ctx.arc(6.5, -52.5, open ? 4 : 5, 0.1, Math.PI - 0.1); ctx.closePath();
    ctx.fillStyle = '#C2416B'; ctx.fill(); ctx.stroke();
  } else if (mood === 'frozen') {
    ctx.beginPath(); ctx.moveTo(2, -50); ctx.lineTo(4, -52); ctx.lineTo(6, -50); ctx.lineTo(8, -52); ctx.lineTo(10, -50); ctx.stroke();
  } else {
    const w = pal.ears === 'frog' ? 9 : 4;
    ctx.beginPath(); ctx.arc(6.5 - w / 2 + 2, -52, w / 2 + 1, 0.2, Math.PI - 0.2); ctx.stroke();
    if (pal.ears !== 'frog') { ctx.beginPath(); ctx.arc(6.5 + w / 2 - 2 + 3, -52, 3, 0.2, Math.PI - 0.2); ctx.stroke(); }
  }
}

// where the blaster sits, relative to the feet, for a pal of this size facing dir
export function palHold(size, dir, lift) {
  return { x: dir * 33 * size, y: (-36 - lift * 20) * size };
}

// o: { x, y, dir, size, mood: idle|cheer|wow|worried|sad, moodAge, t, shot (0–1 just after firing) }
// drawHeld(ctx) draws the blaster at the origin, in board units
export function drawPalHero(ctx, pal, o, drawHeld) {
  const t = o.t || 0, age = o.moodAge || 0;
  let hop = 0, shiver = 0, squash = 1 + Math.sin(t * 2.3) * 0.015, lift = 0, mood = null, open = false;
  switch (o.mood) {
    case 'cheer': { const p = (age * 2.2) % 1; hop = Math.sin(p * Math.PI) * 14; mood = 'happy'; lift = 0.6 + Math.sin(age * 12) * 0.3; break; }
    case 'wow': hop = Math.sin(Math.min(1, age * 3) * Math.PI) * 7; open = true; break;
    case 'worried': shiver = Math.sin(t * 9) * 0.8; break;
    case 'sad': mood = 'sad'; squash = 0.96; break;
  }
  if (o.shot) { lift = Math.max(lift, o.shot); open = true; }
  const dir = o.dir || 1, size = o.size || 1;

  // shadow
  ctx.save();
  ctx.translate(o.x, o.y + 2);
  ctx.scale(1, 0.2);
  ctx.beginPath(); ctx.arc(0, 0, 30 * size - hop * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(40,30,20,.18)'; ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(o.x + shiver, o.y - hop);
  ctx.scale(dir * size, size * squash);
  ctx.lineJoin = 'round';

  // feet
  for (const x of [-7, 8]) {
    ellipse(ctx, x + 2, -5, 8, 5.2); fillStroke(ctx, '#fff', INK, 2);
    ellipse(ctx, x + 3, -6.5, 5.5, 3); ctx.fillStyle = pal.shirt2; ctx.fill();
  }
  // back hand
  ellipse(ctx, -13, -27, 5.5, 5.5); fillStroke(ctx, pal.fur, shade(pal.fur2), 2);

  // body: shirt with a star on it
  ellipse(ctx, 0, -25, 16.5, 17.5); fillStroke(ctx, pal.shirt, INK);
  ctx.save();
  ellipse(ctx, 0, -25, 16.5, 17.5); ctx.clip();
  ctx.fillStyle = '#fff'; ctx.fillRect(-20, -16, 40, 12);
  ctx.restore();
  ellipse(ctx, 0, -25, 16.5, 17.5); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.6 : 6; ctx.lineTo(4 + Math.cos(a) * r, -27 + Math.sin(a) * r); }
  ctx.fill();

  // head
  ears(ctx, pal);
  ellipse(ctx, 0, -62, 26.5, 25); fillStroke(ctx, pal.fur, shade(pal.fur2), 2.6);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ellipse(ctx, -9, -74, 8, 4.5, -0.5); ctx.fill();
  face(ctx, pal, mood, open, t);

  // the arm holding up the blaster, in front of everything
  const h = palHold(1, 1, lift);
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(10, -28); ctx.lineTo(h.x - 3, h.y + 5); ctx.stroke();
  ctx.strokeStyle = pal.fur; ctx.lineWidth = 5.5;
  ctx.beginPath(); ctx.moveTo(10, -28); ctx.lineTo(h.x - 3, h.y + 5); ctx.stroke();
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.scale(dir / size, 1 / size);
  drawHeld(ctx);
  ctx.restore();
  ellipse(ctx, h.x - 3, h.y + 5, 5.8, 5.8); fillStroke(ctx, pal.fur, shade(pal.fur2), 2);
  ctx.restore();
  return { x: o.x + dir * h.x * size, y: o.y - hop + h.y * size * squash };
}

// just the head, for scoreboards and pickers
export function drawPalHead(ctx, pal, x, y, size, mood, t = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.translate(0, 62);
  ctx.lineJoin = 'round';
  ears(ctx, pal);
  ellipse(ctx, 0, -62, 26.5, 25); fillStroke(ctx, pal.fur, shade(pal.fur2), 2.6);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ellipse(ctx, -9, -74, 8, 4.5, -0.5); ctx.fill();
  face(ctx, pal, mood, false, t);
  ctx.restore();
}

export { shade };
