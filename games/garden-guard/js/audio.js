// A tiny synth, no sound files. Busy moments fire dozens of shots a second,
// so each sound has a minimum gap and a cap on how loud the mix can get.

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

function throttled(name, gapMs, fn) {
  return (...args) => {
    const now = performance.now();
    if (last[name] && now - last[name] < gapMs) return;
    last[name] = now;
    fn(...args);
  };
}

export const sfx = {
  shoot: throttled('shoot', 70, () => tone(520 + Math.random() * 120, 0.05, 'sine', 0.03, 0, 300)),
  hit: throttled('hit', 60, () => tone(240 + Math.random() * 60, 0.05, 'triangle', 0.035)),
  kill: throttled('kill', 50, () => { tone(660, 0.07, 'triangle', 0.06, 0, 990); tone(1320, 0.06, 'sine', 0.03, 0.05); }),
  leak: () => { tone(330, 0.16, 'triangle', 0.12, 0, 160); tone(220, 0.22, 'triangle', 0.1, 0.12, 110); },
  build: () => { tone(392, 0.09, 'triangle', 0.1); tone(587, 0.12, 'triangle', 0.1, 0.07); },
  upgrade: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, i * 0.05)),
  sell: () => { tone(988, 0.07, 'sine', 0.08); tone(1319, 0.12, 'sine', 0.08, 0.07); },
  wave: () => { tone(392, 0.18, 'square', 0.04); tone(523, 0.26, 'square', 0.04, 0.16); },
  bad: () => tone(210, 0.14, 'triangle', 0.1, 0, 150),
  coin: throttled('coin', 120, () => { tone(1175, 0.06, 'sine', 0.05); tone(1568, 0.1, 'sine', 0.05, 0.05); }),
  power: kind => {
    if (kind === 'rain') [784, 659, 523, 440].forEach((f, i) => tone(f, 0.16, 'sine', 0.07, i * 0.07));
    else for (let i = 0; i < 6; i++) tone(180 + i * 20, 0.09, 'sawtooth', 0.025, i * 0.05, 240 + i * 20);
  },
  click: () => tone(620, 0.06, 'sine', 0.06, 0, 820),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, i * 0.1));
    tone(1319, 0.5, 'sine', 0.07, 0.42);
  },
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.1, i * 0.16))
};
