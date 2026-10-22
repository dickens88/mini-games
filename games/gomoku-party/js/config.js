// Numbers shared by the rules, the drawing and the menus.

export const SIZES = [13, 15];           // lines across the board
export const WIN_LEN = 5;                // five (or more) in a row wins
export const MAX_ITEMS = 2;              // items a player can hold at once
export const UNDOS = 2;                  // take-backs per player per game

export const SIDE = ['#FF5E8A', '#3D8BFF'];   // player 1 pink, player 2 blue

export const FORMATS = {
  one: { id: 'one', name: 'One game', blurb: 'Winner takes all', to: 1 },
  bo3: { id: 'bo3', name: 'Best of 3', blurb: 'First to 2 wins', to: 2 },
  bo5: { id: 'bo5', name: 'Best of 5', blurb: 'First to 3 wins', to: 3 }
};

// seconds per move; when time runs out a stone drops somewhere by itself
export const TIMERS = { off: 0, relaxed: 20, hurry: 10 };
