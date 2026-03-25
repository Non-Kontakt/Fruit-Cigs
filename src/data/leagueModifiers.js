// League Modifiers — unique gameplay rules per tier
// Import via: import { getModifier } from "../data/leagueModifiers.js";

export const LEAGUE_MODIFIERS = {
  11: {
    id: "concrete_schoolyard",
    injuryAttrLossChance: 0.35,
    inboxIntro: {
      icon: "🏫",
      title: "Welcome to the Concrete Schoolyard",
      body: "There are no changing rooms. There is no physio. There's a wall for a goal and a dog on the pitch.\n\nInjuries here leave a mark — you might lose a step in something you weren't even working on.",
    },
  },
  10: {
    id: "the_alley",
    injuryChanceMult: 1.75,
    noCards: true,
    inboxIntro: {
      icon: "🌙",
      title: "Welcome to The Alley",
      body: "The Alley doesn't do fair play awards. There are no refs down here.\n\nThe pitches are rough and the tackles are rougher. Keep your best players fit — injuries are more common.",
    },
  },
  9: {
    id: "sunday_league",
    hangover: true,
    duoBoostAmount: 2,
    inboxIntro: {
      icon: "🍺",
      title: "Welcome to Sunday League",
      body: "Half the lads were out last night. The ones who weren't are carrying the ones who were.\n\nOne of your starters might show up worse for wear each matchday. On the bright side, the post-match bonding means Duo Boosts hit harder here — +2 instead of +1.",
    },
  },
  8: {
    id: "the_dojo",
    trainingSpeedMult: 1.5,
    cardSkipsTraining: true,
    cardFrequencyMult: 2.0,
    inboxIntro: {
      icon: "🥋",
      title: "Welcome to The Dojo",
      body: "Discipline above all. Train hard, stay clean, and the gains will come 50% faster.\n\nBut any player who picks up a card forfeits their next training session. The Dojo rewards control.",
    },
  },
  7: {
    id: "forest_hills",
    homeXGMult: 1.06,
    awayXGMult: 0.88,
    inboxIntro: {
      icon: "🌲",
      title: "Welcome to Forest Hills",
      body: "The hills are alive with the sound of hoofing it long. Home advantage is king here — away teams struggle on unfamiliar terrain.\n\nYour home xG gets a 6% boost, but away fixtures are 12% harder. Win 5 away matches this season to prove you belong — there's a reward waiting.",
    },
  },
  6: {
    id: "altitude_trials",
    rotationRequired: 2,
    exhaustionInjury: true,
    injuryChanceMult: 1.4,
    inboxIntro: {
      icon: "🏔️",
      title: "Welcome to the Altitude Trials",
      body: "The air is thin up here. The board demands rotation — at least 2 changes to your starting XI between consecutive matches.\n\nThe altitude takes its toll. Injuries are 40% more frequent, and exhaustion is a real risk — though strong physical players cope better.",
    },
  },
  5: {
    id: "the_federation",
    var: true,
    varDisallowChance: 0.12,
    varRedUpgradeChance: 0.15,
    boardScrutinyMult: 1.4,
    transferWindowWeeks: 9,
    inboxIntro: {
      icon: "🏛️",
      title: "Welcome to The Federation",
      body: "Welcome to the big leagues. VAR has arrived — 12% of goals may be chalked off, and 15% of yellow cards get upgraded to reds on review.\n\nThe board is watching closely. Negative sentiment swings hit 40% harder here. On the bright side, the transfer window is longer — 9 weeks to do your business.",
    },
  },
  4: {
    id: "saudi_super_league",
    saudiAgentTickets: 3,
    noRelationships: true,
    poachEvent: true,
    inboxIntro: {
      icon: "🕌",
      title: "Welcome to the Saudi Super League",
      body: "Money talks in the SSL. You'll receive 3 Saudi Agent tickets at the start of the season — each one lets you sign a free agent instantly.\n\nBut loyalty is thin here. Relationship building is disabled, and at the halfway mark, a rival club will try to poach one of your signings. Choose wisely.",
    },
  },
  3: {
    id: "euro_dynasty",
    xgMult: 1.2,
    televisedChance: 0.5,
    penaltyConversionNerf: 0.10,
    knockoutAtEnd: true,
    dynastyFixtures: 16,
    inboxIntro: {
      icon: "🌍",
      title: "Welcome to the Euro Dynasty",
      body: "The biggest stage in football. Matches are higher scoring (1.2x xG) and half of them are televised — the Man of the Match in a TV game gets a permanent +1 stat boost.\n\nPenalty shootouts are 10% harder to convert. After all league games are played, the top 4 enter a knockout tournament for the Dynasty Cup.",
    },
  },
  2: {
    id: "world_xi_invitational",
    trainingSpeedMult: 0.15,
    fanSentimentMult: 2.5,
    miniTournament: true,
    miniTournamentFixtures: 15,
    fiveASide: true,
    inboxIntro: {
      icon: "🌐",
      title: "Welcome to the World XI Invitational",
      body: "This is an exhibition league — training crawls at a fraction of its normal pace. Only Duo Boosts and story arc effects can improve your players.\n\nThe crowds are volatile. Fan sentiment swings hit 2.5x harder here.\n\nThe top 4 at season's end enter a 5v5 Mini-Tournament — two-leg semi-finals and a single-leg final. Pick your five wisely.",
    },
  },
  1: {
    id: "intergalactic_elite",
    agingYearsPerSeason: 3,
    drawPointsPlayer: 1,
    drawPointsAI: 2,
    rewindTickets: 3,
    prediction: true,
    inboxIntro: {
      icon: "🛸",
      title: "Welcome to the Intergalactic Elite",
      body: "Time moves differently at the top. Your players age 3 years per season — careers burn fast.\n\nDraws favour the opposition (they get 2 pts, you get 1). Before each match, the AI reveals its predicted scoreline — if it's right, they steal 3 points regardless of result.\n\nYou'll receive 3 Rewind tickets. Each one lets you replay a lost league match.",
    },
  },
};

export function getModifier(tier) {
  return LEAGUE_MODIFIERS[tier] || {};
}
