// The die is a button: nine pip slots, lit per face. Rolling flickers random
// faces for a moment before landing on the real one.

const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FACES = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function createDice(btn, { onTick } = {}) {
  const face = btn.querySelector('.face');
  const pips = [];
  for (let k = 0; k < 9; k++) {
    const p = document.createElement('i');
    face.appendChild(p);
    pips.push(p);
  }

  function show(n) {
    const on = FACES[n] || [];
    pips.forEach((p, k) => p.classList.toggle('on', on.includes(k)));
    btn.dataset.face = n || '';
  }

  async function roll(final) {
    btn.classList.remove('landed');
    btn.classList.add('rolling');
    const ticks = REDUCED_MOTION ? 2 : 9;
    let last = 0;
    for (let k = 0; k < ticks; k++) {
      let n;
      do n = 1 + Math.floor(Math.random() * 6); while (n === last);
      last = n;
      show(n);
      if (onTick) onTick();
      await sleep(45 + k * 9);
    }
    show(final);
    btn.classList.remove('rolling');
    void btn.offsetWidth;
    btn.classList.add('landed');
    await sleep(REDUCED_MOTION ? 80 : 260);
  }

  show(6);
  return { show, roll };
}
