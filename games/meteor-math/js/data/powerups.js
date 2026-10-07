// What the golden UFO drops when you zap it.

export const POWERS = [
  { id: 'freeze', name: 'Freeze', icon: '❄️', weight: 3, desc: 'Every meteor stops for 4 seconds.' },
  { id: 'bomb', name: 'Star Bomb', icon: '💣', weight: 2, desc: 'Blows up every meteor on the screen.' },
  { id: 'slow', name: 'Slow-mo', icon: '🐢', weight: 3, desc: 'Meteors fall at half speed for 8 seconds.' },
  { id: 'shield', name: 'Shield', icon: '🛡️', weight: 2, desc: 'Fixes one shield (or 50 bonus points).' },
  { id: 'double', name: 'Double', icon: '✨', weight: 3, desc: 'Double points for 10 seconds.' }
];
export const powerById = id => POWERS.find(p => p.id === id);
