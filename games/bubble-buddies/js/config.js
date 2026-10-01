// Board geometry and tuning. Everything is in board units: the canvas is
// drawn W × H and scaled to whatever size the page gives it.

export const COLS = 11;                 // bubbles in a full row (offset rows hold one fewer)
export const R = 20;                    // bubble radius
export const D = R * 2;
export const ROW_H = R * Math.sqrt(3);  // rows nest into each other
export const W = COLS * D;              // 440
export const H = 640;

export const DEAD_ROW = 12;             // a bubble this many rows down (counting a lowered ceiling) ends the round
export const DEAD_Y = R + DEAD_ROW * ROW_H - ROW_H / 2;
export const SHOOTER = { x: W / 2, y: 560 };
export const DRAGON = { x: W / 2 + 125, y: 630, scale: 0.38 };   // where Dino's feet stand; he holds the next bubble

export const SHOT_SPEED = 1500;         // units per second
export const MIN_ANGLE = 0.16;          // radians above the horizontal
export const MAX_ANGLE = Math.PI - MIN_ANGLE;
export const COLLIDE = 0.8;             // a shot sticks when it comes this close (× diameter): lets it squeeze through gaps

export const CHARGE_MAX = 24;           // power meter: 1 per popped bubble, 2 per dropped one
export const SPECIALS = ['rainbow', 'bomb', 'lightning'];
export const BOMB_REACH = D * 2.05;     // a bomb clears everything this close to where it lands

// one buddy per colour; the face differs too, so colours never have to be told apart by hue alone
export const BUDDIES = [
  { name: 'Berry', main: '#FF6B8E', light: '#FFC2D1', dark: '#D93C66', eyes: 'dot',    mouth: 'smile' },
  { name: 'Mango', main: '#FF9B3D', light: '#FFD3A1', dark: '#D96A12', eyes: 'happy',  mouth: 'open'  },
  { name: 'Lemon', main: '#FFD23C', light: '#FFF1A8', dark: '#D9A400', eyes: 'big',    mouth: 'o'     },
  { name: 'Mint',  main: '#4FD18B', light: '#B4F2CE', dark: '#22A060', eyes: 'sleepy', mouth: 'smile' },
  { name: 'Sky',   main: '#4AA8FF', light: '#B7DDFF', dark: '#1F78D6', eyes: 'wide',   mouth: 'cat'   },
  { name: 'Plum',  main: '#A97BFF', light: '#DCCBFF', dark: '#7A4BDB', eyes: 'star',   mouth: 'smile' }
];
