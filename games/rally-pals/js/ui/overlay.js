// One overlay card over the board, reused for the menu, level list, help and result screens.

export function createOverlay(el) {
  const card = el.querySelector('.card');
  let onClose = null;

  function show(html, bind, closable) {
    card.innerHTML = html;
    el.hidden = false;
    el.classList.toggle('closable', !!closable);
    onClose = closable || null;
    if (bind) bind(card);
    const first = card.querySelector('[autofocus], .cta');
    if (first) first.focus({ preventScroll: true });
  }
  function hide() {
    el.hidden = true;
    card.innerHTML = '';
    onClose = null;
  }
  el.addEventListener('click', e => { if (e.target === el && onClose) onClose(); });

  return {
    show, hide,
    isOpen: () => !el.hidden,
    close: () => { if (onClose) onClose(); }
  };
}
