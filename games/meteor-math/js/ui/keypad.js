// The number pad: big buttons for fingers, and the keyboard's digits,
// Backspace and Enter (keyboard players never need to tab to the buttons).
// The same buttons are built into the Quick Check card.

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'back', 'fire'];
const LABEL = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-6-6z"/><path d="M12 10l4 4m0-4l-4 4"/></svg>',
  fire: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 6.4L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.6z"/></svg>'
};
const NAME = { back: 'Delete', fire: 'Fire' };

export function buildKeys(el, onKey) {
  el.innerHTML = KEYS.map(k =>
    `<button type="button" class="key k${k}" data-k="${k}" tabindex="-1" aria-label="${NAME[k] || k}">${LABEL[k] || k}</button>`).join('');
  el.addEventListener('pointerdown', e => {
    const b = e.target.closest('button[data-k]');
    if (!b || !el.contains(b)) return;
    e.preventDefault();
    b.classList.add('down');
    setTimeout(() => b.classList.remove('down'), 110);
    onKey(b.dataset.k);
  });
}

// the physical keyboard; handler(key) returns true when it used the key
export function listenKeyboard(handler) {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let k = null;
    if (/^[0-9]$/.test(e.key)) k = e.key;
    else if (e.key === 'Backspace' || e.key === 'Delete') k = 'back';
    else if (e.key === 'Enter' || e.key === ' ') k = 'fire';
    else if (e.key === 'Escape') k = 'esc';
    else if (e.key === 'h' || e.key === 'H' || e.key === '?') k = 'help';
    else if (e.key === 'm' || e.key === 'M') k = 'mute';
    if (k && handler(k, e)) e.preventDefault();
  });
}
