// All words the player reads, in one place. Tower and enemy names live with
// their data; everything else is here so a translation only touches this file.

export const S = {
  start: 'Start',
  nextWave: 'Next wave',
  allSent: 'All waves sent',
  earlyBonus: (s, g) => `in ${s}s · call now +${g}`,
  incoming: 'Bugs on the way…',

  tipIdle: 'Tap an empty <b>garden plot</b> to plant a tower. Tap a tower to upgrade or sell it.',
  buildTitle: 'Build a tower',
  level: n => `Lv ${n}`,
  maxLevel: 'Max level',
  upgrade: 'Upgrade',
  sell: 'Sell',
  target: 'Target',
  modes: { first: 'First', last: 'Last', strong: 'Strong', close: 'Close' },
  stats: {
    dmg: 'Damage', range: 'Range', rate: 'Shots/s', splash: 'Splash',
    slow: 'Slow', gold: 'Gold', every: 'Every'
  },
  close: 'Close',

  reasons: {
    gold: 'Not enough gold yet',
    taken: 'There is already a tower there',
    locked: 'That tower is not available here',
    max: 'This tower is fully grown',
    last: 'That was the last wave',
    over: 'The game is over',
    cooldown: 'Still recharging'
  },

  aimTip: name => `Tap the map to drop the ${name}. Tap the button again to cancel.`,
  ready: 'Ready',

  levelsTitle: 'Garden map',
  levelsBtn: 'Levels',
  chapters: { 1: 'Sunny Patch', 2: 'Pumpkin Hollow' },
  locked: 'Win the level before to unlock',
  levelLabel: (name, stars, locked) => locked ? `${name}, locked` : `${name}, ${stars} of 3 stars`,

  newBug: 'New bug!',
  newTower: 'New tower!',
  newPower: 'New power!',
  gotIt: 'Got it',

  helpTitle: 'How to play',
  help: [
    'Tap an empty plot and pick a tower',
    'Press Start to send the bugs',
    'Stop them before they reach the flowers'
  ],
  helpMsg: 'Bugs drop <b>gold</b> — spend it on more towers and upgrades.',
  letsGo: "Let's go!",

  resumeTitle: 'Welcome back',
  resumeMsg: (w, n) => `Your game is waiting at the start of <b>wave ${w}</b> of ${n}.`,
  resume: 'Keep playing',
  restart: 'Start over',

  winTitle: 'Garden saved!',
  winMsg: (lives, total) => `<b>${lives}</b> of ${total} flowers made it through.`,
  loseTitle: 'The bugs ate the garden',
  loseMsg: w => `You held out until wave <b>${w}</b>. Try a different plan!`,
  again: 'Play again',
  nextLevel: 'Next level',
  allSaved: 'That was the last garden — every one is safe. Go back for three stars everywhere!',
  tryAgain: 'Try again',

  paused: 'Paused',
  pausedMsg: 'Take your time. The bugs are waiting too.',
  unpause: 'Keep playing',

  leak: n => (n > 1 ? `A bug ate ${n} flowers!` : 'A bug ate a flower!'),
  bonus: g => `+${g} gold for calling early`
};
