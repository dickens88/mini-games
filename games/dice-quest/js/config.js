// Rule numbers and player looks shared by the game, the renderer and the
// balance script.

export const MAX_ITEMS = 2;
export const MAX_BANANAS = 3;
export const BUMP_BACK = 2;      // landing on someone pushes them back this far
export const BOOST = 3;          // boost cells
export const SETBACK = 3;        // setback cells and bananas
export const QUAKE_BACK = 2;     // jungle earthquake: everyone else
export const KRAKEN_BACK = 6;    // sea kraken: the leader

export const SEATS = [
  { id: 'red',    name: 'Red',    main: '#FF5A6E', dark: '#C9364C', soft: '#FFD3D9' },
  { id: 'blue',   name: 'Blue',   main: '#3D9BFF', dark: '#1F6FCC', soft: '#CFE6FF' },
  { id: 'green',  name: 'Green',  main: '#34C474', dark: '#1D8F50', soft: '#C9F2DA' },
  { id: 'yellow', name: 'Yellow', main: '#FFC21A', dark: '#C98C00', soft: '#FFEDB3' }
];

// animal faces from ipaslogo.com (free for commercial use), in img/avatars/<id>.webp
export const AVATARS = [
  { id: 'rabbit',   name: 'Bunny' },
  { id: 'tiger',    name: 'Tiger' },
  { id: 'fox',      name: 'Fox' },
  { id: 'redpanda', name: 'Red panda' },
  { id: 'panda',    name: 'Panda' }
];
export const AVATAR_IDS = AVATARS.map(a => a.id);
export const DEFAULT_AVATARS = ['rabbit', 'tiger', 'fox', 'redpanda'];
