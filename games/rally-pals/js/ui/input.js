// Turning keys, touch buttons and game controllers into what each pal is
// doing: { left, right, jump, swing }, all "held" flags. Two people share one
// keyboard (W A S D and the arrow keys), or each gets their own buttons on a
// touch screen, or a controller each.

export const KEYS = [
  { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW'], swing: ['KeyS', 'Space', 'KeyF'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], swing: ['ArrowDown', 'Enter', 'NumpadEnter', 'Numpad0', 'Slash'] }
];

const ACTIONS = ['left', 'right', 'jump', 'swing'];

export function createInput(root) {
  const keys = new Set();
  const touch = [blank(), blank()];
  let solo = false;            // against the computer, both sets of keys move pal 1
  let enabled = true;

  const owns = code => KEYS.some(k => ACTIONS.some(a => k[a].includes(code)));

  addEventListener('keydown', e => {
    if (!enabled || e.metaKey || e.ctrlKey || e.altKey) return;
    if (owns(e.code)) {
      e.preventDefault();
      keys.add(e.code);
    }
  });
  addEventListener('keyup', e => { keys.delete(e.code); });
  addEventListener('blur', () => { keys.clear(); touch.forEach(t => Object.assign(t, blank())); });

  // touch buttons: data-p="0|1" data-a="left|right|jump|swing"; several fingers at once
  const held = new Map();   // pointerId → button
  function press(btn, on) {
    const p = Number(btn.dataset.p), a = btn.dataset.a;
    touch[p][a] = on;
    btn.classList.toggle('down', on);
  }
  root.querySelectorAll('[data-a]').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      held.set(e.pointerId, btn);
      press(btn, true);
      if (navigator.vibrate && btn.dataset.a === 'swing') navigator.vibrate(8);
    });
    const up = e => {
      const b = held.get(e.pointerId);
      if (!b) return;
      held.delete(e.pointerId);
      if (![...held.values()].includes(b)) press(b, false);
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });

  function fromKeys(i) {
    const out = blank();
    const sets = solo && i === 0 ? KEYS : [KEYS[i]];
    for (const k of sets) for (const a of ACTIONS) if (k[a].some(c => keys.has(c))) out[a] = true;
    return out;
  }

  // a standard controller: stick or d-pad to move, A / up to jump, B / X / triggers to swing
  function fromPad(i) {
    const out = blank();
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const pad = solo && i === 0 ? pads[0] : pads[i];
    if (!pad) return out;
    const b = n => pad.buttons[n] && pad.buttons[n].pressed;
    const x = pad.axes[0] || 0, y = pad.axes[1] || 0;
    out.left = x < -0.4 || b(14);
    out.right = x > 0.4 || b(15);
    out.jump = b(0) || b(12) || y < -0.7;
    out.swing = b(1) || b(2) || b(5) || b(7) || b(6) || b(4);
    return out;
  }

  return {
    read(i) {
      const k = fromKeys(i), t = touch[i], g = fromPad(i);
      const out = blank();
      for (const a of ACTIONS) out[a] = k[a] || t[a] || g[a];
      return out;
    },
    // anything pressed by player i? (to start the next point, skip a card…)
    any(i) { const r = this.read(i); return r.swing || r.jump; },
    setSolo(on) { solo = on; },
    setEnabled(on) { enabled = on; if (!on) keys.clear(); },
    clear() { keys.clear(); }
  };
}

function blank() { return { left: false, right: false, jump: false, swing: false }; }
