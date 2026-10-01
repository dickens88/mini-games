// Items from treasure cells. All are used before rolling.
// Adding an item: an entry here and an effect in core/items.js.
// `target`: 'player' asks whom to aim at, 'number' asks for a die face.
// `boost: true` items turn up more often for whoever is last.

export const ITEMS = [
  { id: 'double', name: 'Double dice', icon: '🎲', weight: 5, boost: true,  desc: 'Roll two dice this turn and move the total.' },
  { id: 'golden', name: 'Golden die',  icon: '✨', weight: 3, boost: true,  desc: 'Pick the number you roll.', target: 'number' },
  { id: 'shield', name: 'Shield',      icon: '🛡️', weight: 4, boost: false, desc: 'Blocks the next bad thing that happens to you.' },
  { id: 'swap',   name: 'Swap',        icon: '🔄', weight: 3, boost: true,  desc: 'Trade places with any player.', target: 'player' },
  { id: 'freeze', name: 'Freeze',      icon: '❄️', weight: 4, boost: false, desc: 'A player of your choice misses their next turn.', target: 'player' },
  { id: 'remote', name: 'Remote die',  icon: '📡', weight: 1, boost: false, desc: 'Rare! Pick your next roll — a 6 still rolls again.', target: 'number' },
  { id: 'banana', name: 'Banana',      icon: '🍌', weight: 4, boost: false, desc: 'Drop a banana where you stand. Whoever stops on it slides back 3.' }
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map(it => [it.id, it]));
