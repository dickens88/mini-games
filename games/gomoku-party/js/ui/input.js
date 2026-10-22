// Pointing at the board. A mouse shows a see-through stone where you'd go and
// places it on click. A finger can't hover, so the first tap shows the stone
// and a second tap on the same spot puts it down (no oops-taps). Arrow keys
// move a cursor and Enter or Space places.

export function createInput(canvas, toBoard, { onHover, onPick }) {
  let pending = -1, cursor = -1;

  const spot = e => {
    const r = canvas.getBoundingClientRect();
    return toBoard((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };

  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    cursor = spot(e);
    onHover(cursor, -1);
  });
  canvas.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') onHover(-1, pending);
  });
  canvas.addEventListener('pointerup', e => {
    const i = spot(e);
    if (i < 0) { pending = -1; onHover(-1, -1); return; }
    if (e.pointerType === 'mouse' || i === pending) {
      pending = -1;
      onPick(i);
    } else {
      pending = i;
      onHover(i, i);
    }
  });

  return {
    clear() { pending = -1; },
    // keyboard cursor; n is the board size
    key(code, n) {
      if (cursor < 0) cursor = ((n - 1) / 2) * n + (n - 1) / 2;
      const x = cursor % n, y = (cursor / n) | 0;
      const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[code];
      if (move) {
        const nx = Math.min(n - 1, Math.max(0, x + move[0])), ny = Math.min(n - 1, Math.max(0, y + move[1]));
        cursor = ny * n + nx;
        onHover(cursor, -1);
        return true;
      }
      if (code === 'Enter' || code === 'Space') { onPick(cursor); return true; }
      return false;
    }
  };
}
