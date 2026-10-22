// The items found in gift boxes. Using one is a free action before you place
// your stone, at most one per turn. What each one does is in core/game.js;
// the icons are drawn in render/icons.js.
//
// target: which spots the item can be used on
//   enemy  an opponent's stone without a shield
//   mine   one of your own stones without a shield
//   empty  an empty spot a stone could go on
//   any    any spot on the board (the middle of a 3×3 area)

export const ITEMS = [
  { id: 'bomb', name: 'Bomb', target: 'enemy', weight: 3, color: '#FF7A45',
    help: 'Blast one enemy stone off the board. The crater stays for a round.' },
  { id: 'rock', name: 'Rock', target: 'empty', weight: 3, color: '#9C8F86',
    help: 'Drop a big rock on an empty spot. Nobody can ever go there.' },
  { id: 'paint', name: 'Paint', target: 'enemy', weight: 2, color: '#B45CFF',
    help: 'Paint an enemy stone your colour. (It can’t finish your five for you.)' },
  { id: 'shield', name: 'Shield', target: 'mine', weight: 2, color: '#2EC4B6',
    help: 'Put a bubble on one of your stones: bombs, paint and party events can’t touch it.' },
  { id: 'freeze', name: 'Freeze', target: 'any', weight: 2, color: '#5BC8FF',
    help: 'Freeze a 3×3 patch. Your opponent can’t go there on their next move.' }
];

export const itemById = id => ITEMS.find(it => it.id === id);
