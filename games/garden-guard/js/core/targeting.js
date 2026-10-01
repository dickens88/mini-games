// Which enemy a tower aims at.
//   first  — furthest along the road (closest to the garden)
//   last   — least far along
//   strong — most health left
//   close  — nearest to the tower

function canHit(def, enemy) {
  return enemy.flying ? def.hitsAir : def.hitsGround;
}

function inRange(x, y, range, enemy) {
  const dx = enemy.x - x, dy = enemy.y - y;
  return dx * dx + dy * dy <= range * range;
}

const SCORE = {
  first: (e) => e.d,
  last: (e) => -e.d,
  strong: (e) => e.hp,
  close: (e, x, y) => -Math.hypot(e.x - x, e.y - y)
};

export function pickTarget(state, tower, def, stats) {
  const score = SCORE[tower.mode] || SCORE.first;
  let best = null, bestScore = -Infinity;
  for (const e of state.enemies) {
    if (e.dead || !canHit(def, e) || !inRange(tower.x, tower.y, stats.range, e)) continue;
    const s = score(e, tower.x, tower.y);
    if (s > bestScore) { best = e; bestScore = s; }
  }
  return best;
}
