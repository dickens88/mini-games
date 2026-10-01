// What the page does when something happens in the match: sounds, sparkles,
// pop-up words, banners, a happy crowd.

import { FLOOR, W } from '../config.js';
import { powerById } from '../data/powerups.js';
import { FORMATS } from '../config.js';
import { sfx } from '../audio.js';
import { burst, word, banner } from '../render/fx.js';
import { SIDE_COLORS } from '../render/renderer.js';

const REASON = {
  ace: 'Ace!', winner: 'Winner!', smash: 'Smash!', fire: 'Fireball!', header: 'Header!',
  out: 'Out!', net: 'Net!', short: "Didn't get over!"
};

const POWER_SOUND = { fire: 'fire', giant: 'grow', speed: 'zoom', zigzag: 'wiggle', tiny: 'shrink', freeze: 'freeze' };

// returns how long to freeze the action for a punchy hit (seconds)
// quiet: the demo behind the menu — sparkles only, no sounds or banners
export function react(events, s, fx, names, humans, quiet) {
  if (quiet) return reactQuietly(events, s, fx);
  let stop = 0;
  for (const e of events) {
    switch (e.type) {
      case 'swing': sfx.swing(); break;
      case 'jump': sfx.jump(); break;
      case 'land': burst(fx, e.x, FLOOR, 5, { speed: 80, size: 3, color: 'rgba(255,255,255,.8)', spread: Math.PI, life: 0.35, gravity: 100 }); break;
      case 'toss': sfx.toss(); break;
      case 'hit': {
        const big = e.kind === 'smash' || e.fire;
        if (e.kind && e.kind.startsWith('serve')) sfx.serve(); else if (big) sfx.smash(); else sfx.hit(e.quality);
        burst(fx, e.x, e.y, big ? 18 : 7, { speed: big ? 320 : 170, size: big ? 5 : 3.5, color: big ? ['#FFD23F', '#FF6A3D', '#fff'] : ['#fff', '#F6FF9E'], kind: 'star', life: 0.45, gravity: 200 });
        if (e.kind === 'smash') { word(fx, 'Smash!', e.x, e.y - 30, '#FFD23F', 26); fx.shake = 9; stop = 0.08; }
        else if (e.fire) { fx.shake = 7; stop = 0.06; fx.flash = 0.6; sfx.fire(); }
        else if (e.quality > 0.9 && !e.kind.startsWith('serve')) word(fx, 'Perfect!', e.x, e.y - 30, '#7DF9C8', 20);
        if (e.zig) word(fx, 'Wiggle!', e.x, e.y - 50, '#D7B8FF', 18);
        if (e.rally >= 10 && e.rally % 5 === 0) {
          word(fx, `Rally × ${e.rally}!`, W / 2, 90, '#FFD23F', 26);
          fx.cheer = Math.max(fx.cheer, 0.8);
        }
        break;
      }
      case 'header':
        sfx.header();
        word(fx, 'Bonk!', e.x, e.y - 30, '#FFB627', 22);
        burst(fx, e.x, e.y, 6, { speed: 140, size: 5, color: '#FFD23F', kind: 'star', life: 0.5 });
        break;
      case 'burn':
        burst(fx, e.x, e.y, 16, { speed: 220, size: 7, color: ['#FF6A3D', '#FFD23F'], kind: 'flame', life: 0.5, gravity: -150 });
        word(fx, 'Hot hot hot!', e.x, e.y - 40, '#FF8A3D', 20);
        fx.shake = 6;
        break;
      case 'bounce':
        if (!e.quiet) sfx.bounce();
        burst(fx, e.x, FLOOR, e.quiet ? 3 : 6, { speed: 90, size: 3, color: s.court.id === 'moon' ? '#C8C0F0' : s.court.id === 'ice' ? '#fff' : s.court.id === 'beach' ? '#F2CF8E' : '#B5E8A0', spread: Math.PI * 0.8, life: 0.4 });
        break;
      case 'net':
        sfx.net(); fx.shake = Math.max(fx.shake, 3);
        break;
      case 'bubble':
        sfx.bubble();
        burst(fx, e.x, e.y, 10, { speed: 120, size: 3, color: powerById(e.power).color, kind: 'star', life: 0.5, gravity: 0 });
        break;
      case 'power': {
        const d = powerById(e.power);
        sfx.power();
        const snd = POWER_SOUND[e.power]; if (snd) setTimeout(() => sfx[snd](), 180);
        burst(fx, e.x, e.y, 26, { speed: 260, size: 5, color: [d.color, '#fff'], kind: 'star', life: 0.7, gravity: 120 });
        word(fx, d.name + '!', e.x, e.y - 34, d.color, 24);
        const to = s.players[e.target];
        if (e.target !== e.who) word(fx, e.power === 'freeze' ? 'Brrr!' : 'Uh-oh!', to.x, to.y - 140, '#fff', 18);
        break;
      }
      case 'wind':
        sfx.wind();
        word(fx, e.to === 0 ? 'The wind drops' : 'Gust!', W / 2, 60, '#fff', 20);
        break;
      case 'point': {
        const name = names[e.winner];
        const good = humans[e.winner] || !humans[1 - e.winner];
        sfx.point(good);
        if (e.reason === 'out' || e.reason === 'net') sfx.out();
        fx.cheer = e.match ? 6 : e.game ? 2.5 : 1.4;
        if (e.match) {
          sfx.win();
          banner(fx, `Match, ${name}!`, '', SIDE_COLORS[e.winner], 2.4);
          confetti(fx, 120);
        } else if (e.game) {
          sfx.game();
          const g = s.score.games;
          banner(fx, `Game, ${name}!`, `Games ${g[0]} – ${g[1]}`, SIDE_COLORS[e.winner], 1.8);
          confetti(fx, 50);
        } else {
          sfx.cheer(false);
          const f = FORMATS[s.score.format];
          banner(fx, REASON[e.reason] || 'Point!', f.type === 'tennis' ? `${name} · ${e.call.text}` : `Point to ${name}`, SIDE_COLORS[e.winner], 1.6);
        }
        if (e.rally >= 12 && !e.match) word(fx, `What a rally — ${e.rally} hits!`, W / 2, 230, '#FFD23F', 22);
        break;
      }
      case 'ready':
        if (e.big) {
          const kind = e.big.kind === 'match' ? 'Match point' : 'Game point';
          word(fx, `${kind} ${names[e.big.who]}!`, W / 2, 120, SIDE_COLORS[e.big.who], 26);
        } else if (e.call.kind === 'deuce') {
          word(fx, 'Deuce!', W / 2, 120, '#fff', 28);
        }
        break;
    }
  }
  return stop;
}

function confetti(fx, n) {
  for (let i = 0; i < n; i++) {
    burst(fx, Math.random() * W, -10, 1, { speed: 60, size: 9, color: ['#FF6F9C', '#FFD23F', '#4C8DFF', '#3DDC97', '#B77CFF'], kind: 'confetti', life: 2.6, gravity: 140, angle: Math.PI / 2, spread: 1 });
  }
}

function reactQuietly(events, s, fx) {
  for (const e of events) {
    if (e.type === 'hit') burst(fx, e.x, e.y, 6, { speed: 160, size: 3.5, color: ['#fff', '#F6FF9E'], kind: 'star', life: 0.4, gravity: 200 });
    if (e.type === 'point') fx.cheer = 1.2;
    if (e.type === 'power') burst(fx, e.x, e.y, 18, { speed: 220, size: 5, color: [powerById(e.power).color, '#fff'], kind: 'star', life: 0.6, gravity: 120 });
  }
  return 0;
}
