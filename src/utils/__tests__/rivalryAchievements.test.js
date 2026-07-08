import { describe, it, expect } from "vitest";
import { collectRivalryMatchAchievements, isSignedFromRival } from "../achievements.js";
import { collectSeasonEndAchievements } from "../league.js";

// Blood Orange Cigs — rivalry cig cards. Per-match cards (surrounded
// included — it reads the full post-update ledger) live in
// collectRivalryMatchAchievements, fed synthetic ledger entries below;
// settled_scores is a season-end check folded into
// collectSeasonEndAchievements (see seasonEndAchievements.test.js for the
// non-rivalry coverage of that function).

const baseLedgerEntry = (extra = {}) => ({
  played: 0, wins: 0, draws: 0, losses: 0, closeGames: 0, redCards: 0, lastMeetings: [], ...extra,
});

// A qualifying rival: 5 meetings, 3+ losses (isRival's loss-only bar).
const rivalEntry = (extra = {}) => baseLedgerEntry({ played: 5, losses: 3, wins: 1, draws: 1, ...extra });

const baseInput = (extras = {}) => ({
  ledgerEntryBefore: null, ledgerEntryAfter: null, ledger: {},
  matchResult: null, playerGoals: 0, oppGoals: 0, unlocked: new Set(),
  ...extras,
});

describe("collectRivalryMatchAchievements — null/retroactive safety", () => {
  it("never throws and returns [] with matchResult: null and no ledger entries", () => {
    const result = collectRivalryMatchAchievements(baseInput());
    expect(result).toEqual([]);
  });

  it("returns [] when goals are missing entirely", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry(), playerGoals: undefined, oppGoals: undefined,
    }));
    expect(result).toEqual([]);
  });
});

describe("bragging_rights — beat a rival", () => {
  it("unlocks on a win against a pre-match rival", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry(), playerGoals: 2, oppGoals: 1,
    }));
    expect(result).toContain("bragging_rights");
  });

  it("does NOT unlock on a win against a non-rival", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: baseLedgerEntry({ played: 1 }), playerGoals: 2, oppGoals: 1,
    }));
    expect(result).not.toContain("bragging_rights");
  });

  it("does NOT unlock on a draw or loss", () => {
    const draw = collectRivalryMatchAchievements(baseInput({ ledgerEntryBefore: rivalEntry(), playerGoals: 1, oppGoals: 1 }));
    const loss = collectRivalryMatchAchievements(baseInput({ ledgerEntryBefore: rivalEntry(), playerGoals: 0, oppGoals: 1 }));
    expect(draw).not.toContain("bragging_rights");
    expect(loss).not.toContain("bragging_rights");
  });

  it("respects already-unlocked state", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry(), playerGoals: 2, oppGoals: 1, unlocked: new Set(["bragging_rights"]),
    }));
    expect(result).not.toContain("bragging_rights");
  });
});

describe("no_love_lost — win a derby with 2+ red cards", () => {
  it("unlocks on a rival win with 2+ combined red cards", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry(), playerGoals: 2, oppGoals: 1,
      matchResult: { redCards: [{ minute: 20, teamName: "Us" }, { minute: 55, teamName: "Them" }] },
    }));
    expect(result).toContain("no_love_lost");
  });

  it("does NOT unlock with fewer than 2 red cards", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry(), playerGoals: 2, oppGoals: 1,
      matchResult: { redCards: [{ minute: 20, teamName: "Us" }] },
    }));
    expect(result).not.toContain("no_love_lost");
  });

  it("does NOT unlock without a win, even with 2+ red cards", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry(), playerGoals: 1, oppGoals: 1,
      matchResult: { redCards: [{ minute: 20, teamName: "Us" }, { minute: 55, teamName: "Them" }] },
    }));
    expect(result).not.toContain("no_love_lost");
  });
});

describe("twist_the_knife — 90th-minute winner against a rival", () => {
  it("unlocks on a last-gasp 90th minute winner", () => {
    const matchResult = {
      isPlayerHome: true,
      events: [
        { type: "goal", side: "home", minute: 90 },
      ],
    };
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry(), playerGoals: 1, oppGoals: 0, matchResult,
    }));
    expect(result).toContain("twist_the_knife");
  });

  it("does NOT unlock when the 90th minute goal wasn't the winner (already ahead)", () => {
    const matchResult = {
      isPlayerHome: true,
      events: [
        { type: "goal", side: "home", minute: 10 },
        { type: "goal", side: "home", minute: 90 },
      ],
    };
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry(), playerGoals: 2, oppGoals: 0, matchResult,
    }));
    expect(result).not.toContain("twist_the_knife");
  });

  it("does NOT unlock against a non-rival", () => {
    const matchResult = {
      isPlayerHome: true,
      events: [
        { type: "goal", side: "away", minute: 40 },
        { type: "goal", side: "home", minute: 90 },
      ],
    };
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: baseLedgerEntry({ played: 1 }), playerGoals: 1, oppGoals: 1, matchResult,
    }));
    expect(result).not.toContain("twist_the_knife");
  });
});

describe("home_and_away — beat the same rival home and away in one season", () => {
  it("unlocks after 2 wins this season against the same rival", () => {
    const ledgerEntryAfter = rivalEntry({
      lastMeetings: [
        { season: 3, week: 4, playerGoals: 2, oppGoals: 0 },
        { season: 3, week: 15, playerGoals: 1, oppGoals: 0 },
      ],
    });
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryAfter, playerGoals: 1, oppGoals: 0,
    }));
    expect(result).toContain("home_and_away");
  });

  it("does NOT unlock when one of the two meetings wasn't a win", () => {
    const ledgerEntryAfter = rivalEntry({
      lastMeetings: [
        { season: 3, week: 4, playerGoals: 1, oppGoals: 1 },
        { season: 3, week: 15, playerGoals: 1, oppGoals: 0 },
      ],
    });
    const result = collectRivalryMatchAchievements(baseInput({ ledgerEntryAfter, playerGoals: 1, oppGoals: 0 }));
    expect(result).not.toContain("home_and_away");
  });

  it("only counts meetings from the current season", () => {
    const ledgerEntryAfter = rivalEntry({
      lastMeetings: [
        { season: 2, week: 4, playerGoals: 2, oppGoals: 0 },
        { season: 3, week: 15, playerGoals: 1, oppGoals: 0 },
      ],
    });
    const result = collectRivalryMatchAchievements(baseInput({ ledgerEntryAfter, playerGoals: 1, oppGoals: 0 }));
    expect(result).not.toContain("home_and_away");
  });

  it("does NOT unlock for a double over a club that is not a rival", () => {
    const ledgerEntryAfter = baseLedgerEntry({
      played: 2, wins: 2,
      lastMeetings: [
        { season: 3, week: 4, playerGoals: 2, oppGoals: 0 },
        { season: 3, week: 15, playerGoals: 1, oppGoals: 0 },
      ],
    });
    const result = collectRivalryMatchAchievements(baseInput({ ledgerEntryAfter, playerGoals: 1, oppGoals: 0 }));
    expect(result).not.toContain("home_and_away");
  });
});

describe("breaking_the_curse — beat a rival you'd never beaten in 5+ meetings", () => {
  it("unlocks on a first-ever win after 5+ winless meetings", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry({ played: 5, wins: 0, losses: 4 }),
      playerGoals: 1, oppGoals: 0,
    }));
    expect(result).toContain("breaking_the_curse");
  });

  it("does NOT unlock if there's already a prior win on the ledger", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry({ played: 5, wins: 1, losses: 3 }),
      playerGoals: 1, oppGoals: 0,
    }));
    expect(result).not.toContain("breaking_the_curse");
  });

  it("does NOT unlock below 5 prior meetings", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry({ played: 3, wins: 0, losses: 3 }),
      playerGoals: 1, oppGoals: 0,
    }));
    expect(result).not.toContain("breaking_the_curse");
  });
});

describe("statement_win — beat a rival by 4+ goals", () => {
  it("unlocks on a 4+ goal margin against a rival", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry(), playerGoals: 5, oppGoals: 1,
    }));
    expect(result).toContain("statement_win");
  });

  it("does NOT unlock below a 4 goal margin", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryBefore: rivalEntry(), playerGoals: 4, oppGoals: 1,
    }));
    expect(result).not.toContain("statement_win");
  });
});

describe("kept_the_receipts — 10 career meetings with a single rival", () => {
  it("unlocks once the post-match ledger hits 10 meetings and is still a rival", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryAfter: rivalEntry({ played: 10 }),
    }));
    expect(result).toContain("kept_the_receipts");
  });

  it("does NOT unlock below 10 meetings", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledgerEntryAfter: rivalEntry({ played: 9 }),
    }));
    expect(result).not.toContain("kept_the_receipts");
  });
});

// ---------------------------------------------------------------------------
// Season-end rivalry checks (collectSeasonEndAchievements, league.js)
// ---------------------------------------------------------------------------

function makeLeague() {
  return {
    teams: [{ name: "Player FC", isPlayer: true }, { name: "AI United", isPlayer: false }],
    table: [
      { teamIndex: 0, points: 30, goalsFor: 20, goalsAgainst: 10, won: 10, drawn: 0, lost: 0 },
      { teamIndex: 1, points: 10, goalsFor: 10, goalsAgainst: 20, won: 3, drawn: 1, lost: 6 },
    ],
  };
}

const seasonEndInput = (extras = {}) => ({
  position: 3, currentTier: 5, moveType: "stayed", newTier: 5,
  lastSeasonMove: null, beatenTeams: new Set(), unlockedAchievements: new Set(),
  clubHistory: { seasonArchive: [] }, wonCupThisSeason: false,
  squad: [], prevSeasonSquadIds: null, seasonNumber: 3,
  dynastyCupBracket: null, cup: null,
  league: makeLeague(),
  leagueResults: {},
  playerSeasonStats: {},
  ...extras,
});

describe("collectSeasonEndAchievements — Settled Scores", () => {
  it("unlocks when unbeaten this season across 2+ rival meetings", () => {
    const clubHistory = {
      seasonArchive: [],
      rivalryLedger: {
        Rovers: rivalEntry({ lastMeetings: [
          { season: 3, week: 2, playerGoals: 2, oppGoals: 0 },
          { season: 3, week: 16, playerGoals: 1, oppGoals: 1 },
        ] }),
      },
    };
    const achs = collectSeasonEndAchievements(seasonEndInput({ clubHistory, seasonNumber: 3 }));
    expect(achs).toContain("settled_scores");
  });

  it("does NOT unlock with a loss against a rival this season", () => {
    const clubHistory = {
      seasonArchive: [],
      rivalryLedger: {
        Rovers: rivalEntry({ lastMeetings: [
          { season: 3, week: 2, playerGoals: 0, oppGoals: 1 },
          { season: 3, week: 16, playerGoals: 1, oppGoals: 1 },
        ] }),
      },
    };
    const achs = collectSeasonEndAchievements(seasonEndInput({ clubHistory, seasonNumber: 3 }));
    expect(achs).not.toContain("settled_scores");
  });

  it("does NOT unlock with fewer than 2 rival meetings this season", () => {
    const clubHistory = {
      seasonArchive: [],
      rivalryLedger: {
        Rovers: rivalEntry({ lastMeetings: [{ season: 3, week: 2, playerGoals: 2, oppGoals: 0 }] }),
      },
    };
    const achs = collectSeasonEndAchievements(seasonEndInput({ clubHistory, seasonNumber: 3 }));
    expect(achs).not.toContain("settled_scores");
  });

  it("ignores non-rival ledger entries", () => {
    const clubHistory = {
      seasonArchive: [],
      rivalryLedger: {
        Friendly: baseLedgerEntry({ played: 2, lastMeetings: [
          { season: 3, week: 2, playerGoals: 0, oppGoals: 3 },
          { season: 3, week: 16, playerGoals: 0, oppGoals: 3 },
        ] }),
      },
    };
    const achs = collectSeasonEndAchievements(seasonEndInput({ clubHistory, seasonNumber: 3 }));
    expect(achs).not.toContain("settled_scores");
  });

  it("respects already-unlocked state", () => {
    const clubHistory = {
      seasonArchive: [],
      rivalryLedger: {
        Rovers: rivalEntry({ lastMeetings: [
          { season: 3, week: 2, playerGoals: 2, oppGoals: 0 },
          { season: 3, week: 16, playerGoals: 1, oppGoals: 1 },
        ] }),
      },
    };
    const achs = collectSeasonEndAchievements(seasonEndInput({
      clubHistory, seasonNumber: 3, unlockedAchievements: new Set(["settled_scores"]),
    }));
    expect(achs).not.toContain("settled_scores");
  });
});

describe("surrounded — 3+ clubs qualify as rivals at once (per-match, full ledger)", () => {
  it("unlocks the moment the ledger holds 3 rivals", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledger: { A: rivalEntry(), B: rivalEntry(), C: rivalEntry() },
    }));
    expect(result).toContain("surrounded");
  });

  it("does NOT unlock with only 2 rivals", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledger: { A: rivalEntry(), B: rivalEntry(), C: baseLedgerEntry({ played: 1 }) },
    }));
    expect(result).not.toContain("surrounded");
  });

  it("respects already-unlocked state", () => {
    const result = collectRivalryMatchAchievements(baseInput({
      ledger: { A: rivalEntry(), B: rivalEntry(), C: rivalEntry() },
      unlocked: new Set(["surrounded"]),
    }));
    expect(result).not.toContain("surrounded");
  });
});

describe("spoils_of_war — isSignedFromRival (trade-completion decision)", () => {
  it("true when the trade partner's ledger entry qualifies as a rival", () => {
    expect(isSignedFromRival("Rovers", { Rovers: rivalEntry() })).toBe(true);
  });

  it("false for a non-rival partner, an unknown club, or a missing ledger", () => {
    expect(isSignedFromRival("Rovers", { Rovers: baseLedgerEntry({ played: 2 }) })).toBe(false);
    expect(isSignedFromRival("Nobody FC", { Rovers: rivalEntry() })).toBe(false);
    expect(isSignedFromRival("Rovers", undefined)).toBe(false);
  });

  it("false when the trade partner is unnamed", () => {
    expect(isSignedFromRival(null, { Rovers: rivalEntry() })).toBe(false);
    expect(isSignedFromRival(undefined, { Rovers: rivalEntry() })).toBe(false);
  });
});
