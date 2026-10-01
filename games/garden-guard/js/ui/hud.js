// Top bar and the "next wave" button. Only touches the DOM when a value changes.

import { ENEMIES } from '../data/registry.js';
import { earlyBonus } from '../core/commands.js';
import { wavePreview } from '../core/waves.js';
import { enemyIcon } from '../render/sprites/enemy-sprites.js';
import { S } from '../strings.js';

const $ = id => document.getElementById(id);

export function createHud() {
  const el = {
    level: $('levelOut'), lives: $('livesOut'), gold: $('goldOut'), wave: $('waveOut'),
    speed: $('speedOut'), speedBtn: $('speedBtn'), pause: $('pauseBtn'), sound: $('soundBtn'),
    waveBtn: $('waveBtn'), waveLabel: $('waveBtnLabel'), waveSub: $('waveBtnSub'), preview: $('wavePreview')
  };
  const shown = {};

  function set(key, value, fn) {
    if (shown[key] === value) return false;
    const before = shown[key];
    shown[key] = value;
    fn(value, before);
    return true;
  }

  function bump(node, cls) {
    const pill = node.closest('.pill');
    pill.classList.remove(cls);
    void pill.offsetWidth;   // restart the animation
    pill.classList.add(cls);
  }

  function renderPreview(state, idx) {
    el.preview.textContent = '';
    if (idx >= state.waves.length) return;
    for (const { type, count } of wavePreview(state.waves[idx])) {
      const chip = document.createElement('span');
      chip.title = ENEMIES[type].name;
      chip.append(enemyIcon(type, ENEMIES[type].size), '×' + count);
      el.preview.append(chip);
    }
  }

  return {
    el,
    update(state, { speed, paused, sound }) {
      set('level', state.level.name, v => { el.level.textContent = v; });
      set('lives', state.lives, (v, before) => {
        el.lives.textContent = v;
        if (before !== undefined && v < before) bump(el.lives, 'hurt');
      });
      set('gold', state.gold, (v, before) => {
        el.gold.textContent = v;
        if (before !== undefined && v > before) bump(el.gold, 'bump');
      });
      set('wave', state.waveIdx + '/' + state.waves.length, v => { el.wave.textContent = v; });
      set('speed', speed, v => {
        el.speed.textContent = '×' + v;
        el.speedBtn.classList.toggle('fast', v > 1);
      });
      set('paused', paused, v => el.pause.setAttribute('aria-pressed', String(v)));
      set('sound', sound, v => el.sound.setAttribute('aria-pressed', String(v)));

      // next-wave button
      const total = state.waves.length, idx = state.waveIdx;
      let label, sub;
      if (idx >= total) { label = S.allSent; sub = ''; }
      else if (idx === 0) { label = S.start; sub = `Wave 1 of ${total}`; }
      else {
        label = S.nextWave;
        sub = state.nextWaveIn !== null
          ? S.earlyBonus(Math.ceil(state.nextWaveIn), earlyBonus(state))
          : S.incoming;
      }
      set('waveLabel', label, v => { el.waveLabel.textContent = v; });
      set('waveSub', sub, v => { el.waveSub.textContent = v; });
      set('waveDisabled', idx >= total || !!state.result, v => { el.waveBtn.disabled = v; });
      set('preview', state.level.id + ':' + idx, () => renderPreview(state, idx));
    },
    reset() { for (const k in shown) delete shown[k]; }
  };
}
