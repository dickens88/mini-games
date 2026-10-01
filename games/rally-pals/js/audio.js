// A tiny synth, no sound files: the pock of the racket, bounces, the net,
// cheers and jingles.

let actx = null;
let enabled = true;
const last = {};

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

// the same sound at most once every gap seconds
function limited(name, gap) {
  const a = audio(); if (!a) return false;
  if (last[name] && a.currentTime - last[name] < gap) return false;
  last[name] = a.currentTime;
  return true;
}

function tone(freq, dur, type, vol, delay, slideTo) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + (delay || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t); o.stop(t + dur + 0.03);
}

let noiseBuf = null;
function noise(dur, vol, delay, from, to, type, attack) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + (delay || 0);
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf;
  f.type = type || 'bandpass';
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(a.destination);
  src.start(t, Math.random()); src.stop(t + dur + 0.02);
}

export const sfx = {
  hit: q => { tone(380 + q * 160, 0.07, 'triangle', 0.16, 0, 200); noise(0.06, 0.22, 0, 2600, 900); },
  smash: () => { tone(300, 0.16, 'square', 0.08, 0, 90); noise(0.18, 0.35, 0, 3200, 400); },
  serve: () => { tone(420, 0.07, 'triangle', 0.15, 0, 220); noise(0.07, 0.24, 0, 2800, 900); },
  toss: () => tone(500, 0.18, 'sine', 0.05, 0, 900),
  swing: () => { if (limited('swing', 0.08)) noise(0.12, 0.06, 0, 900, 2400, 'bandpass', 0.04); },
  bounce: () => { if (limited('bounce', 0.05)) { tone(180, 0.09, 'sine', 0.16, 0, 90); noise(0.04, 0.06, 0, 800, 300); } },
  net: () => { if (limited('net', 0.1)) { tone(140, 0.25, 'sawtooth', 0.05, 0, 70); noise(0.2, 0.12, 0, 600, 200, 'lowpass'); } },
  header: () => { tone(300, 0.16, 'sine', 0.14, 0, 620); tone(620, 0.12, 'sine', 0.06, 0.08, 900); },
  jump: () => { if (limited('jump', 0.1)) tone(330, 0.12, 'sine', 0.05, 0, 600); },
  point: good => good
    ? [784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.09, i * 0.09))
    : [523, 659].forEach((f, i) => tone(f, 0.14, 'triangle', 0.08, i * 0.09)),
  out: () => { tone(880, 0.12, 'square', 0.04); tone(660, 0.18, 'square', 0.04, 0.13); },
  cheer: big => { noise(big ? 1.6 : 0.9, big ? 0.16 : 0.09, 0, 900, 1600, 'bandpass', 0.25); },
  power: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'triangle', 0.07, i * 0.05)),
  bubble: () => tone(900, 0.12, 'sine', 0.04, 0, 1400),
  fire: () => { noise(0.4, 0.2, 0, 400, 2000, 'bandpass', 0.05); tone(160, 0.3, 'sawtooth', 0.05, 0, 60); },
  freeze: () => [2093, 2637, 3136].forEach((f, i) => tone(f, 0.18, 'sine', 0.05, i * 0.05)),
  shrink: () => tone(900, 0.4, 'sine', 0.07, 0, 250),
  grow: () => tone(220, 0.4, 'triangle', 0.08, 0, 700),
  zoom: () => { tone(400, 0.25, 'square', 0.03, 0, 1600); },
  wiggle: () => { for (let i = 0; i < 4; i++) tone(600 + (i % 2) * 300, 0.07, 'sine', 0.05, i * 0.06); },
  wind: () => noise(1.2, 0.07, 0, 300, 700, 'bandpass', 0.4),
  click: () => tone(620, 0.06, 'sine', 0.06, 0, 820),
  game: () => {
    [659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.09, i * 0.07));
    noise(1.2, 0.12, 0.1, 900, 1500, 'bandpass', 0.2);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.11));
    tone(1319, 0.5, 'sine', 0.07, 0.46);
    tone(1568, 0.7, 'sine', 0.06, 0.56);
    noise(2, 0.16, 0.2, 900, 1700, 'bandpass', 0.3);
  }
};
