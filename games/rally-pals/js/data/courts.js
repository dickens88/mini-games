// The four courts. Each one plays differently — this is where the rules read
// gravity, bounciness, slipperiness and wind. Their look is in render/courts.js.

export const COURTS = [
  {
    id: 'garden', name: 'Garden Court', blurb: 'Soft green grass. A good place to start.',
    gravity: 1000, bounce: 0.72, skid: 0.88,
    grip: 1, wind: 0
  },
  {
    id: 'beach', name: 'Sunny Beach', blurb: 'Gusts of wind push the ball about — watch the flags!',
    gravity: 1000, bounce: 0.64, skid: 0.8,
    grip: 0.85, wind: 170
  },
  {
    id: 'ice', name: 'Frosty Rink', blurb: 'Slippery! Pals slide around and the ball skids fast.',
    gravity: 1000, bounce: 0.76, skid: 0.99,
    grip: 0.16, wind: 0
  },
  {
    id: 'moon', name: 'Moon Base', blurb: 'Low gravity: floaty shots and enormous jumps.',
    gravity: 560, bounce: 0.74, skid: 0.9,
    grip: 0.8, wind: 0, lowGravity: true
  }
];

export const courtById = id => COURTS.find(c => c.id === id) || COURTS[0];
