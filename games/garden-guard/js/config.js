// Global rules shared by the simulation, the UI and the balance script.

export const COLS = 12;
export const ROWS = 8;

export const STEP = 1 / 60;            // fixed simulation step, seconds
export const START_LIVES = 20;
export const SELL_RATIO = 0.7;         // refund for towers built in an earlier wave
export const WAVE_GAP = 12;            // seconds between the last spawn of a wave and the next wave
export const EARLY_BONUS_PER_SEC = 2;  // gold for each second skipped by calling a wave early

// stars by flowers left at the end of a level
export const STAR_LIVES = [18, 10, 1];

export const TARGET_MODES = ['first', 'last', 'strong', 'close'];
