// A tiny synth, no sound files: the clack of a stone, booms, zaps, jingles.

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
  place: p => { tone(p ? 520 : 440, 0.09, 'triangle', 0.14, 0, p ? 300 : 260); noise(0.05, 0.22, 0, 3000, 1200); },
  slide: () => { if (limited('slide', 0.08)) noise(0.14, 0.08, 0, 2400, 5000, 'highpass', 0.03); },
  twin: () => { tone(500, 0.25, 'sine', 0.08, 0, 1500); tone(1500, 0.2, 'sine', 0.05, 0.12, 700); },
  gift: () => [988, 1319, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, i * 0.06)),
  full: () => { tone(330, 0.12, 'square', 0.04); tone(262, 0.16, 'square', 0.04, 0.1); },
  pop: () => { if (limited('pop', 0.05)) tone(700, 0.1, 'sine', 0.06, 0, 1100); },
  pick: () => tone(660, 0.07, 'sine', 0.07, 0, 990),
  bomb: () => { noise(0.6, 0.45, 0, 1400, 80, 'lowpass', 0.01); tone(120, 0.5, 'sine', 0.2, 0, 40); },
  fuse: () => noise(0.35, 0.06, 0, 3000, 6000, 'highpass', 0.02),
  rock: () => { tone(90, 0.25, 'sine', 0.22, 0, 50); noise(0.25, 0.25, 0, 600, 120, 'lowpass', 0.005); },
  paint: () => { noise(0.25, 0.2, 0, 500, 2500, 'bandpass', 0.01); tone(300, 0.2, 'sine', 0.06, 0.05, 700); },
  shield: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.25, 'sine', 0.05, i * 0.04)),
  freeze: () => [2093, 2637, 3136, 2637].forEach((f, i) => tone(f, 0.2, 'sine', 0.05, i * 0.05)),
  meteor: () => { tone(1800, 0.7, 'sine', 0.05, 0, 300); noise(0.8, 0.45, 0.6, 1200, 60, 'lowpass', 0.01); tone(90, 0.6, 'sine', 0.22, 0.6, 35); },
  zap: () => { noise(0.35, 0.4, 0, 6000, 900, 'highpass', 0.002); tone(1200, 0.25, 'sawtooth', 0.06, 0, 120); },
  rumble: () => noise(0.9, 0.3, 0, 300, 60, 'lowpass', 0.1),
  lava: () => { noise(0.5, 0.25, 0, 500, 1800, 'bandpass', 0.05); tone(160, 0.4, 'sawtooth', 0.05, 0, 60); },
  roll: () => noise(1.1, 0.18, 0, 200, 500, 'lowpass', 0.2),
  fanfare: () => [523, 659, 784].forEach((f, i) => tone(f, 0.14, 'square', 0.04, i * 0.08)),
  tick: () => tone(1200, 0.04, 'square', 0.03),
  click: () => tone(620, 0.06, 'sine', 0.06, 0, 820),
  undo: () => tone(700, 0.18, 'sine', 0.07, 0, 350),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.11));
    tone(1319, 0.5, 'sine', 0.07, 0.46);
    tone(1568, 0.7, 'sine', 0.06, 0.56);
    noise(2, 0.16, 0.2, 900, 1700, 'bandpass', 0.3);
  },
  draw: () => [523, 494, 466].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, i * 0.14))
};
