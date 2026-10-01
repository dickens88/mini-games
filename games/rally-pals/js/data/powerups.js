// Power-up bubbles float over the court during a rally. Hit one with your shot
// and it's yours. `on` says who it affects: you, or the other pal.
// `time` is how long it lasts in seconds; a `charge` waits for your next hit.

export const POWERUPS = [
  { id: 'fire', name: 'Fireball', on: 'me', charge: true, color: '#FF6A3D',
    help: 'Your next shot is a blazing fast fireball. Returning it knocks the other pal back!' },
  { id: 'giant', name: 'Giant Racket', on: 'me', time: 10, color: '#FFB627',
    help: 'Your racket grows huge for 10 seconds — much easier to reach the ball.' },
  { id: 'speed', name: 'Zoom Shoes', on: 'me', time: 10, color: '#3DDC97',
    help: 'Run faster and jump higher for 10 seconds.' },
  { id: 'zigzag', name: 'Wiggle Ball', on: 'me', charge: true, color: '#B77CFF',
    help: 'Your next shot wiggles up and down through the air. Good luck hitting that!' },
  { id: 'tiny', name: 'Shrink Ray', on: 'them', time: 8, color: '#4FB3FF',
    help: 'The other pal shrinks for 8 seconds, with a tiny racket to match.' },
  { id: 'freeze', name: 'Snowball', on: 'them', time: 1.1, color: '#9FE7FF',
    help: 'Freezes the other pal in an ice cube for a moment.' }
];

export const powerById = id => POWERUPS.find(p => p.id === id);
