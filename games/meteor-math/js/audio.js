// A tiny synth, no sound files: laser zaps, booms, keypad clicks, the UFO's
// warble and little jingles.

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

// notes of a major scale, so combos climb a tune
const SCALE = [523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319, 1397, 1568];

export const sfx = {
  key: () => tone(700, 0.04, 'sine', 0.04, 0, 900),
  back: () => tone(420, 0.05, 'sine', 0.04, 0, 300),
  zap: combo => {
    tone(1400, 0.16, 'sawtooth', 0.05, 0, 300);
    noise(0.25, 0.22, 0.05, 1800, 300, 'lowpass', 0.01);
    tone(SCALE[Math.min(combo - 1, SCALE.length - 1)], 0.14, 'triangle', 0.07, 0.07);
  },
  boom: () => { noise(0.45, 0.3, 0, 900, 120, 'lowpass', 0.01); tone(120, 0.3, 'sine', 0.12, 0, 50); },
  wrong: () => { if (limited('wrong', 0.1)) { tone(260, 0.12, 'square', 0.04, 0, 200); tone(200, 0.16, 'square', 0.035, 0.1, 160); } },
  land: () => { noise(0.6, 0.35, 0, 500, 60, 'lowpass', 0.01); tone(80, 0.5, 'sine', 0.18, 0, 40); },
  fizzle: () => noise(0.3, 0.06, 0, 3000, 6000, 'highpass', 0.02),
  spawn: () => { if (limited('spawn', 0.3)) noise(0.5, 0.025, 0, 300, 900, 'bandpass', 0.2); },
  combo: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.1, 'triangle', 0.07, i * 0.06)),
  power: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'triangle', 0.08, i * 0.05)),
  freeze: () => [2093, 2637, 3136].forEach((f, i) => tone(f, 0.2, 'sine', 0.05, i * 0.05)),
  ufo: () => { for (let i = 0; i < 6; i++) tone(900 + (i % 2) * 300, 0.09, 'sine', 0.035, i * 0.08); },
  shower: () => { for (let i = 0; i < 7; i++) tone(1047 + i * 120, 0.12, 'triangle', 0.04, i * 0.05); },
  split: () => tone(600, 0.15, 'square', 0.04, 0, 1200),
  boss: () => { tone(110, 0.6, 'sawtooth', 0.08, 0, 70); tone(165, 0.6, 'sawtooth', 0.05, 0.05, 90); },
  bossHit: () => { noise(0.3, 0.25, 0, 1500, 200, 'lowpass', 0.01); tone(200, 0.2, 'square', 0.06, 0, 100); },
  start: () => [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.07, i * 0.12)),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.11));
    tone(1319, 0.5, 'sine', 0.07, 0.46);
    tone(1568, 0.7, 'sine', 0.06, 0.56);
  },
  lose: () => [523, 440, 349, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, i * 0.16)),
  click: () => tone(620, 0.06, 'sine', 0.06, 0, 820),
  right: () => [784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, i * 0.08))
};
