// Sizes and feel shared by the rules, the robot and the drawing. The court is a
// side view: player 0 on the left, player 1 on the right, the net in between.

export const W = 960, H = 500;          // the world, in canvas units
export const FLOOR = 422;               // where feet and bounces happen
export const NET_X = W / 2;
export const NET_H = 62;                // the net is a bit shorter than a pal
export const NET_TOP = FLOOR - NET_H;
export const COURT_L = 64, COURT_R = W - 64;   // baselines: landing beyond them is out
export const HALF = NET_X - COURT_L;    // length of one side of the court

export const DT = 1 / 120;              // one rules step
export const BALL_R = 9;
export const G = 1000;                  // normal gravity on the ball

export const PAL = {
  speed: 330,
  accel: 5200,
  jump: 600,
  gravity: 1650,
  headR: 26, headY: 62,                 // head circle, above the feet
  bodyR: 19, bodyY: 26,
  minX: 22, netGap: 26                  // can't walk through the side wall or the net
};

export const SWING = {
  time: 0.3,                            // a whole swing, start to recovered
  active: 0.2,                          // the part of it that can hit the ball
  reach: 48,                            // radius of the hitting zone
  ahead: 34, up: 50                     // where that zone sits, from the feet
};

export const POINT_PAUSE = 1.9;         // seconds between a point ending and the next serve
export const AUTO_SERVE = 6;            // a serve nobody takes goes by itself

export const FORMATS = {
  quick: { id: 'quick', type: 'points', to: 7, name: 'Quick match', blurb: 'First to 7 points' },
  set3: { id: 'set3', type: 'tennis', games: 3, name: 'Short set', blurb: 'Real tennis scoring, first to 3 games' },
  set6: { id: 'set6', type: 'tennis', games: 6, name: 'Full set', blurb: 'Real tennis scoring, first to 6 games' }
};
