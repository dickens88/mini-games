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
  statDmg: 'Damage', statRange: 'Range', statRate: 'Shots/s',
  close: 'Close',

  reasons: {
    gold: 'Not enough gold yet',
    taken: 'There is already a tower there',
    locked: 'That tower is not available here',
    max: 'This tower is fully grown',
    last: 'That was the last wave',
    over: 'The game is over'
  },

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
  tryAgain: 'Try again',

  paused: 'Paused',
  pausedMsg: 'Take your time. The bugs are waiting too.',
  unpause: 'Keep playing',

  leak: n => (n > 1 ? `A bug ate ${n} flowers!` : 'A bug ate a flower!'),
  bonus: g => `+${g} gold for calling early`
};
