// A tiny synth, no sound files.

let actx = null;
let enabled = true;

export function setSound(on) { enabled = on; }

function audio() {
  if (!enabled) return null;
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { actx = new AC(); } catch (e) { return null; }
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function tone(freq, dur, type, vol, delay, slideTo) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + (delay || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t); o.stop(t + dur + 0.03);
}

function noise(dur, vol, delay, from, to) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + (delay || 0);
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf;
  f.type = 'bandpass';
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(a.destination);
  src.start(t); src.stop(t + dur + 0.02);
}

export const sfx = {
  rattle: () => tone(180 + Math.random() * 120, 0.04, 'square', 0.025),
  dice: n => { tone(n === 6 ? 784 : 520, 0.1, 'triangle', 0.08); if (n === 6) tone(1047, 0.16, 'triangle', 0.07, 0.08); },
  hop: k => tone(440 + (k % 6) * 45, 0.06, 'sine', 0.06, 0, 620 + (k % 6) * 45),
  takeoff: () => { noise(0.5, 0.12, 0, 400, 2400); tone(330, 0.4, 'sawtooth', 0.025, 0, 880); },
  jump: () => { tone(523, 0.08, 'triangle', 0.08); tone(784, 0.12, 'triangle', 0.08, 0.07); },
  flight: () => { noise(0.7, 0.16, 0, 300, 3000); tone(392, 0.6, 'sine', 0.05, 0, 1175); },
  bump: () => { noise(0.25, 0.25, 0, 900, 120); tone(196, 0.25, 'square', 0.05, 0, 82); },
  home: () => [659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.09, i * 0.07)),
  item: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'sine', 0.07, i * 0.05)),
  use: () => { tone(880, 0.08, 'square', 0.04); tone(1320, 0.12, 'square', 0.035, 0.06); },
  bad: () => { tone(330, 0.14, 'triangle', 0.1, 0, 160); tone(220, 0.22, 'triangle', 0.09, 0.12, 110); },
  whoosh: () => noise(0.35, 0.12, 0, 2000, 300),
  slide: () => { tone(880, 0.7, 'triangle', 0.08, 0, 160); noise(0.6, 0.06, 0.05, 1500, 200); },
  warp: () => { tone(220, 0.45, 'sine', 0.08, 0, 1760); tone(1760, 0.45, 'sine', 0.05, 0.1, 220); },
  star: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.12, 'sine', 0.06, i * 0.06)),
  turn: () => tone(660, 0.08, 'sine', 0.05, 0, 880),
  click: () => tone(620, 0.06, 'sine', 0.06, 0, 820),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, i * 0.1));
    tone(1319, 0.5, 'sine', 0.07, 0.42);
  }
};
