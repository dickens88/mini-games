// The bar above the board: which level, the score (it counts up) and how the
// stars are going.

export function createHud(el) {
  const where = el.querySelector('[data-hud="where"]');
  const score = el.querySelector('[data-hud="score"]');
  const goal = el.querySelector('[data-hud="goal"]');
  let shown = 0, target = 0, raf = 0;

  function tick() {
    shown += Math.max(1, Math.ceil((target - shown) * 0.18));
    if (shown >= target) shown = target;
    score.textContent = shown.toLocaleString('en-US');
    if (shown < target) raf = requestAnimationFrame(tick);
    else raf = 0;
  }

  function stars(st) {
    if (st.shots <= st.par) return 3;
    if (st.shots <= Math.ceil(st.par * 1.4)) return 2;
    return 1;
  }

  return {
    show(st, best) {
      where.textContent = st.mode === 'level' ? 'Level ' + st.level : 'Wave ' + st.wave;
      if (st.mode === 'level') {
        const n = stars(st);
        const left = n === 3 ? st.par - st.shots : n === 2 ? Math.ceil(st.par * 1.4) - st.shots : null;
        goal.innerHTML = `<span class="stars" aria-label="${n} stars">${'★'.repeat(n)}<i>${'★'.repeat(3 - n)}</i></span>` +
          (left != null ? `<small>${left} shot${left === 1 ? '' : 's'} left</small>` : '<small>keep going!</small>');
      } else {
        goal.innerHTML = `<small>Best</small> ${Math.max(best || 0, st.score).toLocaleString('en-US')}`;
      }
    },
    score(n, jump) {
      target = n;
      if (!jump) { shown = n; score.textContent = n.toLocaleString('en-US'); return; }
      score.parentElement.classList.remove('bump');
      void score.parentElement.offsetWidth;
      score.parentElement.classList.add('bump');
      if (!raf) raf = requestAnimationFrame(tick);
    }
  };
}
