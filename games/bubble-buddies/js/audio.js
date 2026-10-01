// A tiny synth, no sound files. Pops climb a scale as a chain goes on, so a
// big chain sounds like a little tune.

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

// the same sound at most once every gap seconds (big chains call pop dozens of times)
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
  g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t); o.stop(t + dur + 0.03);
}

function noise(dur, vol, delay, from, to, type) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + (delay || 0);
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf;
  f.type = type || 'bandpass';
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(a.destination);
  src.start(t); src.stop(t + dur + 0.02);
}

// a major pentatonic scale, so any run of pops sounds happy
const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637];
const note = i => SCALE[Math.min(SCALE.length - 1, i)];

export const sfx = {
  blip: r => tone(400 + r * 60, 0.06, 'sine', 0.04, 0, 600 + r * 60),
  shoot: () => { tone(300, 0.12, 'sine', 0.1, 0, 700); noise(0.12, 0.05, 0, 1800, 600); },
  bounce: () => tone(520, 0.1, 'triangle', 0.08, 0, 780),
  land: () => { tone(260, 0.08, 'sine', 0.1, 0, 180); tone(900, 0.04, 'sine', 0.03); },
  pop: i => {
    if (!limited('pop', 0.028)) return;
    const f = note(i);
    tone(f, 0.09, 'sine', 0.09, 0, f * 1.5);
    noise(0.05, 0.06, 0, 3000, 1200);
  },
  whee: () => tone(1200, 0.5, 'sine', 0.05, 0, 300),
  coin: i => { if (!limited('coin', 0.045)) return; tone(note(4 + (i % 8)), 0.08, 'triangle', 0.05); tone(note(6 + (i % 8)), 0.1, 'triangle', 0.04, 0.05); },
  boom: () => { noise(0.6, 0.35, 0, 900, 60, 'lowpass'); tone(110, 0.5, 'sine', 0.2, 0, 40); },
  zap: () => { noise(0.35, 0.18, 0, 5000, 800, 'highpass'); tone(1400, 0.3, 'sawtooth', 0.04, 0, 200); },
  shimmer: () => [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(f, 0.14, 'sine', 0.05, i * 0.045)),
  thud: () => { tone(120, 0.25, 'sine', 0.22, 0, 55); noise(0.25, 0.12, 0, 600, 100, 'lowpass'); },
  warn: () => { tone(880, 0.09, 'square', 0.035); tone(880, 0.09, 'square', 0.035, 0.16); },
  powerup: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.1, 'triangle', 0.06, i * 0.05)),
  combo: n => { const b = note(Math.min(8, n + 2)); tone(b, 0.1, 'triangle', 0.08); tone(b * 1.25, 0.1, 'triangle', 0.07, 0.07); tone(b * 1.5, 0.16, 'triangle', 0.07, 0.14); },
  cheer: () => [659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, 'triangle', 0.08, i * 0.06)),
  swap: () => { tone(500, 0.07, 'sine', 0.06, 0, 800); tone(800, 0.07, 'sine', 0.05, 0.06, 500); },
  star: i => { tone(note(5 + i * 2), 0.18, 'triangle', 0.09); tone(note(7 + i * 2), 0.22, 'sine', 0.06, 0.06); },
  click: () => tone(620, 0.06, 'sine', 0.06, 0, 820),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, i * 0.1));
    tone(1319, 0.5, 'sine', 0.07, 0.42);
    tone(1568, 0.6, 'sine', 0.05, 0.5);
  },
  lose: () => { [392, 370, 349, 311].forEach((f, i) => tone(f, 0.3, 'triangle', 0.09, i * 0.22, f * 0.97)); }
};
