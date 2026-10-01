// Keyboard shortcuts for the same actions as the buttons.

export function createInput(on) {
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { on.escape(); return; }
    if (on.blocked()) return;
    if (k === ' ' || k === 'enter') {
      if (e.target && e.target.tagName === 'BUTTON' && e.target.id !== 'dice') return;
      e.preventDefault();
      on.roll();
    } else if (k === 'q') on.item(0);
    else if (k === 'w') on.item(1);
    else if (k === 'h' || k === '?') on.help();
  });
}
