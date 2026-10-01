// Wave strings keep level files short and readable:
//
//   'ant*8@0.8, lady*4@0.5+2, beetle*2@1.5:1'
//
// Groups run one after another. In each group:
//   type*count   which enemy and how many (count defaults to 1)
//   @gap         seconds between two of them (default 1)
//   +delay       pause before the group starts (default 1, none for the first group)
//   :path        which road to use; without it, enemies take turns on every road

const GROUP = /^([a-z][\w-]*)(?:\*(\d+))?(?:@([\d.]+))?(?:\+([\d.]+))?(?::(\d+))?$/;

export function parseWave(text) {
  const groups = text.split(',').map(s => s.trim()).filter(Boolean);
  const spawns = [];
  let t = 0;
  groups.forEach((g, i) => {
    const m = GROUP.exec(g);
    if (!m) throw new Error('bad wave group: ' + g);
    const count = m[2] ? +m[2] : 1;
    const gap = m[3] ? +m[3] : 1;
    t += m[4] ? +m[4] : (i === 0 ? 0 : 1);
    for (let k = 0; k < count; k++) {
      spawns.push({ at: t, type: m[1], path: m[5] !== undefined ? +m[5] : null });
      if (k < count - 1) t += gap;
    }
  });
  return spawns;
}

// [{type, count}] in order of first appearance, for the "next wave" preview
export function wavePreview(spawns) {
  const out = [];
  for (const s of spawns) {
    const hit = out.find(o => o.type === s.type);
    if (hit) hit.count++;
    else out.push({ type: s.type, count: 1 });
  }
  return out;
}
