// Board size and the numbers that set how the game feels.

export const W = 540, H = 720;          // board units; the canvas is scaled to fit
export const GROUND = 640;              // meteors that reach this line hit the planet
export const TOP = 56;                  // below the score bar
export const DT = 1 / 60;

export const DINO = { x: W / 2, y: 712, scale: 0.32 };   // where Dino's feet stand

export const SHIELDS = 3;
export const FAST_MS = 3000;            // answering faster than this counts as "knows it by heart"
export const WAIT = 0.7;                // seconds to wait when "1" could still become "12"
export const MAX_DIGITS = 3;

export const RADIUS = { rock: 40, big: 50, mini: 32, shower: 30 };
export const MARGIN = 62;               // meteors keep this far from the side walls

export const POWER_TIME = { freeze: 4, slow: 8, double: 10 };
export const UFO_TIME = 7.5;            // seconds to cross the screen
export const SHOWER_GAP = 0.8;

export const SPEED_MIN = 0.7, SPEED_MAX = 1.45;   // the adaptive fall-speed multiplier

// combo → score multiplier
export function comboMult(combo) {
  return combo >= 15 ? 4 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
}
