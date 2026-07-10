import { describe, it, expect } from "vitest";
import {
  collectSeasonEndAchievements, wonEveryPlayedMatchThisSeason,
  checkBeenEverywhereMan, checkUnfinishedBusiness, checkYoYoYears, checkWatchingTheThrone,
  checkWoodenSpoonCollection, checkSameTimeNextYear,
  collectDynastyCupFinalAchievements, collectMiniTournamentThirdPlaceAchievements, collectMiniTournamentFinalAchievements,
  getSeasonUnbeatenRun, isSeasonUnbeatenRecord, RECORD_UNBEATEN_THRESHOLD,
} from "../league.js";

// Bag Man (top scorer plays for the player's team) and Tactical Foul (most
// booked player is on the player's team) now read directly from the canonical
// seasonLeagueStats. These tests pin that behavior.

function makeLeague(playerTeamIdx = 0) {
  return {
    teams: [
      { name: "Player FC", isPlayer: playerTeamIdx === 0 },
      { name: "AI United",  isPlayer: playerTeamIdx === 1 },
    ],
    table: [
      { teamIndex: 0, points: 30, goalsFor: 20, goalsAgainst: 10, won: 10, drawn: 0, lost: 0, played: 10 },
      { teamIndex: 1, points: 10, goalsFor: 10, goalsAgainst: 20, won: 3, drawn: 1, lost: 6, played: 10 },
    ],
  };
}

function statsBlob(players) {
  return { players, processedMatches: {} };
}

const baseInput = (extras = {}) => ({
  position: 1, currentTier: 1, moveType: "stayed", newTier: 1,
  lastSeasonMove: null, beatenTeams: new Set(), unlockedAchievements: new Set(),
  clubHistory: { seasonArchive: [] }, wonCupThisSeason: false,
  squad: [], prevSeasonSquadIds: null, seasonNumber: 2,
  dynastyCupBracket: null, cup: null,
  league: makeLeague(0),
  leagueResults: {},
  playerSeasonStats: {},
  ...extras,
});

describe("collectSeasonEndAchievements — Bag Man via canonical", () => {
  it("unlocks bag_man when top scorer's teamId is the player's team idx", () => {
    const seasonLeagueStats = statsBlob({
      "p1": { key: "p1", name: "Striker", teamId: 0, teamName: "Player FC", goals: 25, assists: 0, yellows: 0, reds: 0 },
      "p2": { key: "p2", name: "Other",   teamId: 1, teamName: "AI United", goals: 18, assists: 0, yellows: 0, reds: 0 },
    });
    const achs = collectSeasonEndAchievements(baseInput({ seasonLeagueStats }));
    expect(achs).toContain("bag_man");
  });

  it("does NOT unlock bag_man when an AI team's player is top scorer", () => {
    const seasonLeagueStats = statsBlob({
      "p1": { key: "p1", name: "Striker", teamId: 0, teamName: "Player FC", goals: 18, assists: 0, yellows: 0, reds: 0 },
      "p2": { key: "p2", name: "Other",   teamId: 1, teamName: "AI United", goals: 25, assists: 0, yellows: 0, reds: 0 },
    });
    const achs = collectSeasonEndAchievements(baseInput({ seasonLeagueStats }));
    expect(achs).not.toContain("bag_man");
  });

  it("does NOT unlock bag_man when seasonLeagueStats is empty", () => {
    const achs = collectSeasonEndAchievements(baseInput({ seasonLeagueStats: statsBlob({}) }));
    expect(achs).not.toContain("bag_man");
  });

  it("respects already-unlocked state", () => {
    const seasonLeagueStats = statsBlob({
      "p1": { key: "p1", name: "Striker", teamId: 0, teamName: "Player FC", goals: 25, assists: 0, yellows: 0, reds: 0 },
    });
    const achs = collectSeasonEndAchievements(baseInput({
      seasonLeagueStats,
      unlockedAchievements: new Set(["bag_man"]),
    }));
    expect(achs).not.toContain("bag_man");
  });
});

describe("wonEveryPlayedMatchThisSeason — pure calendarResults check", () => {
  it("false with no played entries (fresh/empty season)", () => {
    expect(wonEveryPlayedMatchThisSeason({})).toBe(false);
    expect(wonEveryPlayedMatchThisSeason(null)).toBe(false);
  });

  it("true when every played entry was a win, ignoring spectator entries", () => {
    const calendarResults = {
      0: { playerGoals: 2, oppGoals: 0, won: true, draw: false },
      1: { playerGoals: 3, oppGoals: 1, won: true, draw: false },
      2: { spectator: true, label: "Dynasty Cup Semi-Finals" }, // player didn't qualify — doesn't count
      3: { playerGoals: 1, oppGoals: 0, won: true, draw: false },
    };
    expect(wonEveryPlayedMatchThisSeason(calendarResults)).toBe(true);
  });

  it("false when a cup match was drawn or lost, even with a perfect league", () => {
    const calendarResults = {
      0: { playerGoals: 2, oppGoals: 0, won: true, draw: false },   // league win
      1: { playerGoals: 1, oppGoals: 1, won: false, draw: true },  // cup draw
      2: { playerGoals: 4, oppGoals: 0, won: true, draw: false },   // league win
    };
    expect(wonEveryPlayedMatchThisSeason(calendarResults)).toBe(false);
  });

  it("false when a played Dynasty Cup / Mini Tournament match was lost", () => {
    const calendarResults = {
      0: { playerGoals: 2, oppGoals: 0, won: true, draw: false },
      1: { playerGoals: 0, oppGoals: 1, won: false, draw: false }, // lost the dynasty final
    };
    expect(wonEveryPlayedMatchThisSeason(calendarResults)).toBe(false);
  });
});

describe("getSeasonUnbeatenRun — season-scoped streak for the Gazette's record headline", () => {
  const leagueCalendar = (n) => Array.from({ length: n }, () => ({ type: "league" }));

  it("counts consecutive non-losses back from the most recent played slot, treating a draw as a non-loss", () => {
    const calendarResults = {
      0: { won: true, draw: false },
      1: { won: false, draw: true }, // draw — continues the run
      2: { won: true, draw: false },
      3: { won: true, draw: false },
    };
    expect(getSeasonUnbeatenRun(calendarResults, leagueCalendar(4))).toBe(4);
  });

  it("stops walking backward at the first loss", () => {
    const calendarResults = {
      0: { won: true, draw: false },
      1: { won: false, draw: false }, // loss — the run started after this
      2: { won: true, draw: false },
    };
    expect(getSeasonUnbeatenRun(calendarResults, leagueCalendar(3))).toBe(1);
  });

  it("ignores spectator entries", () => {
    const calendarResults = {
      0: { won: true, draw: false },
      1: { spectator: true, label: "Dynasty Cup Semi-Finals" },
      2: { won: true, draw: false },
    };
    const seasonCalendar = [{ type: "league" }, { type: "dynasty", round: "sf" }, { type: "league" }];
    expect(getSeasonUnbeatenRun(calendarResults, seasonCalendar)).toBe(2);
  });

  it("the season boundary is a hard start: calendarResults is reset to {} at season start, so a fresh season one game in reads exactly 1, never a leftover career number", () => {
    const calendarResults = { 0: { won: true, draw: false } };
    expect(getSeasonUnbeatenRun(calendarResults, leagueCalendar(1))).toBe(1);
  });

  it("reads 0 for empty/null calendarResults", () => {
    expect(getSeasonUnbeatenRun({}, [])).toBe(0);
    expect(getSeasonUnbeatenRun(null, [])).toBe(0);
  });

  it("cup non-losses between league matches do NOT inflate the league run", () => {
    // League: W, W. Cup: D wedged in between. If cup slots leaked into the
    // league-only run, this would read 3 instead of 2.
    const seasonCalendar = [
      { type: "league", leagueMD: 0 },
      { type: "cup", cupRound: 0 },
      { type: "league", leagueMD: 1 },
    ];
    const calendarResults = {
      0: { won: true, draw: false },   // league win
      1: { won: false, draw: true },   // cup draw — must be ignored
      2: { won: true, draw: false },   // league win
    };
    expect(getSeasonUnbeatenRun(calendarResults, seasonCalendar)).toBe(2);
  });

  it("a cup LOSS between league non-losses does NOT break the league run", () => {
    // League: D, W. Cup: L wedged in between. If cup slots counted toward
    // the league-only run, the cup loss would wrongly reset it to 0.
    const seasonCalendar = [
      { type: "league", leagueMD: 0 },
      { type: "cup", cupRound: 0 },
      { type: "league", leagueMD: 1 },
    ];
    const calendarResults = {
      0: { won: false, draw: true },   // league draw
      1: { won: false, draw: false },  // cup loss — must be ignored
      2: { won: true, draw: false },   // league win
    };
    expect(getSeasonUnbeatenRun(calendarResults, seasonCalendar)).toBe(2);
  });
});

describe("isSeasonUnbeatenRecord — pinned threshold for the record headline trigger", () => {
  it("RECORD_UNBEATEN_THRESHOLD is 8", () => {
    expect(RECORD_UNBEATEN_THRESHOLD).toBe(8);
  });

  it("does not fire one game into a new season even against a prior-season 8+ career best — the reported bug this fix decouples from", () => {
    // bestUnbeatenRun (8) is the club's real all-time best, carried over
    // from last season; the season-scoped run is just the 1 game played so
    // far this season (W1 D0 L0). The headline must NOT claim a record.
    expect(isSeasonUnbeatenRecord(1, 8)).toBe(false);
  });

  it("fires once the season-scoped run clears the threshold and beats the club's best", () => {
    expect(isSeasonUnbeatenRecord(9, 8)).toBe(true);
  });

  it("does not fire at exactly the prior best — must exceed it, not match it", () => {
    expect(isSeasonUnbeatenRecord(8, 8)).toBe(false);
  });

  it("does not fire below the threshold even with no prior best on record", () => {
    expect(isSeasonUnbeatenRecord(5, 0)).toBe(false);
  });
});

describe("collectSeasonEndAchievements — Mentality Monsters (all-competitions perfect season)", () => {
  it("does NOT unlock mentality_monsters on a perfect league undone by a cup loss (Centurions is a separate, league-only check unaffected by this)", () => {
    const calendarResults = {
      0: { playerGoals: 2, oppGoals: 0, won: true, draw: false },
      1: { playerGoals: 0, oppGoals: 2, won: false, draw: false }, // cup loss
      2: { playerGoals: 3, oppGoals: 0, won: true, draw: false },
    };
    const achs = collectSeasonEndAchievements(baseInput({ calendarResults }));
    expect(achs).not.toContain("mentality_monsters");
  });

  it("unlocks mentality_monsters when every played match across every competition was won", () => {
    const calendarResults = {
      0: { playerGoals: 2, oppGoals: 0, won: true, draw: false },
      1: { playerGoals: 3, oppGoals: 1, won: true, draw: false }, // cup win
      2: { playerGoals: 1, oppGoals: 0, won: true, draw: false }, // dynasty final win
    };
    const achs = collectSeasonEndAchievements(baseInput({ calendarResults }));
    expect(achs).toContain("mentality_monsters");
  });

  it("respects already-unlocked state", () => {
    const calendarResults = { 0: { playerGoals: 1, oppGoals: 0, won: true, draw: false } };
    const achs = collectSeasonEndAchievements(baseInput({
      calendarResults,
      unlockedAchievements: new Set(["mentality_monsters"]),
    }));
    expect(achs).not.toContain("mentality_monsters");
  });
});

describe("collectSeasonEndAchievements — Tactical Foul via canonical", () => {
  it("unlocks tactical_foul when most-booked player is on the player's team", () => {
    const seasonLeagueStats = statsBlob({
      "p1": { key: "p1", name: "Bruiser", teamId: 0, teamName: "Player FC", goals: 0, assists: 0, yellows: 8, reds: 1 },
      "p2": { key: "p2", name: "Other",   teamId: 1, teamName: "AI United", goals: 0, assists: 0, yellows: 5, reds: 0 },
    });
    const achs = collectSeasonEndAchievements(baseInput({ seasonLeagueStats }));
    expect(achs).toContain("tactical_foul");
  });

  it("counts yellows + reds combined for ranking", () => {
    // Player team: 5y + 0r = 5 cards. AI: 6y + 0r = 6 cards. AI wins.
    const seasonLeagueStats = statsBlob({
      "p1": { key: "p1", name: "Bruiser", teamId: 0, teamName: "Player FC", goals: 0, assists: 0, yellows: 5, reds: 0 },
      "p2": { key: "p2", name: "Other",   teamId: 1, teamName: "AI United", goals: 0, assists: 0, yellows: 6, reds: 0 },
    });
    const achs = collectSeasonEndAchievements(baseInput({ seasonLeagueStats }));
    expect(achs).not.toContain("tactical_foul");
  });
});

describe("collectSeasonEndAchievements — Reading The Room (first season at a new tier)", () => {
  it("unlocks when a top-3 tier (<=3) finish is top 3, first time at that tier", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      currentTier: 2, position: 3, clubHistory: { seasonArchive: [] },
    }));
    expect(achs).toContain("reading_the_room");
  });

  it("does not unlock a top-3 tier finish outside the top 3", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      currentTier: 2, position: 4, clubHistory: { seasonArchive: [] },
    }));
    expect(achs).not.toContain("reading_the_room");
  });

  it("unlocks a tier 4-5 top-3-and-promoted finish", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      currentTier: 5, position: 2, moveType: "promoted", clubHistory: { seasonArchive: [] },
    }));
    expect(achs).toContain("reading_the_room");
  });

  it("does not unlock tier 4-5 top-3 without promotion", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      currentTier: 5, position: 2, moveType: "stayed", clubHistory: { seasonArchive: [] },
    }));
    expect(achs).not.toContain("reading_the_room");
  });

  it("unlocks a survival-tier (>=8) finish that avoided relegation", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      currentTier: 9, position: 6, moveType: "stayed", clubHistory: { seasonArchive: [] },
    }));
    expect(achs).toContain("reading_the_room");
  });

  it("does NOT unlock when the club has already played a season at this tier before", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      currentTier: 9, position: 6, moveType: "stayed",
      clubHistory: { seasonArchive: [{ season: 1, tier: 9, position: 5 }] },
    }));
    expect(achs).not.toContain("reading_the_room");
  });

  it("respects already-unlocked state", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      currentTier: 2, position: 1, clubHistory: { seasonArchive: [] },
      unlockedAchievements: new Set(["reading_the_room"]),
    }));
    expect(achs).not.toContain("reading_the_room");
  });
});

describe("collectSeasonEndAchievements — Prove Them Wrong (won the league on a survival-only tier)", () => {
  it("unlocks when the title is won at tier 8 or below the top flight (survival demand)", () => {
    const achs = collectSeasonEndAchievements(baseInput({ currentTier: 8, position: 1 }));
    expect(achs).toContain("prove_them_wrong");
  });

  it("does not unlock a title win at tier 7 (top-half demand, not survival)", () => {
    const achs = collectSeasonEndAchievements(baseInput({ currentTier: 7, position: 1 }));
    expect(achs).not.toContain("prove_them_wrong");
  });

  it("does not unlock a non-title finish even at a survival tier", () => {
    const achs = collectSeasonEndAchievements(baseInput({ currentTier: 9, position: 2 }));
    expect(achs).not.toContain("prove_them_wrong");
  });
});

describe("collectSeasonEndAchievements — Second Life (title with a Legend in the squad)", () => {
  it("unlocks when the title is won with an isLegend player in the squad", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      position: 1, squad: [{ id: "p1", isLegend: true }, { id: "p2" }],
    }));
    expect(achs).toContain("second_life");
  });

  it("does not unlock a title win with no Legends in the squad", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      position: 1, squad: [{ id: "p1" }, { id: "p2" }],
    }));
    expect(achs).not.toContain("second_life");
  });
});

describe("collectSeasonEndAchievements — Full Reset, Same Result (title within 4 seasons of a prestige)", () => {
  it("unlocks a title won 4 seasons after a prestige with no title in between", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      position: 1, seasonNumber: 5,
      clubHistory: { seasonArchive: [{ season: 1, tier: 11, result: "prestige", position: 3 }] },
    }));
    expect(achs).toContain("full_reset_same_result");
  });

  it("does not unlock a title won more than 4 seasons after the prestige", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      position: 1, seasonNumber: 6,
      clubHistory: { seasonArchive: [{ season: 1, tier: 11, result: "prestige", position: 3 }] },
    }));
    expect(achs).not.toContain("full_reset_same_result");
  });

  it("does not unlock when a title was already won since the prestige", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      position: 1, seasonNumber: 5,
      clubHistory: { seasonArchive: [
        { season: 1, tier: 11, result: "prestige", position: 3 },
        { season: 3, tier: 9, position: 1 },
      ] },
    }));
    expect(achs).not.toContain("full_reset_same_result");
  });

  it("does not unlock without a prior prestige season", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      position: 1, seasonNumber: 5,
      clubHistory: { seasonArchive: [{ season: 1, tier: 9, position: 3 }] },
    }));
    expect(achs).not.toContain("full_reset_same_result");
  });
});

describe("collectSeasonEndAchievements — Should've Listened / Told You So (silence-the-tips trio, season 1 only)", () => {
  it("unlocks shouldve_listened on a season-1 dead-last finish after silencing the tips", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      seasonNumber: 1, position: 10, onboardingSilencedByChoice: true,
    }));
    expect(achs).toContain("shouldve_listened");
  });

  it("does not unlock shouldve_listened without having silenced the tips by choice", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      seasonNumber: 1, position: 10, onboardingSilencedByChoice: false,
    }));
    expect(achs).not.toContain("shouldve_listened");
  });

  it("does not unlock shouldve_listened outside season 1 (seasonNumber never resets to 1 across a prestige)", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      seasonNumber: 6, position: 10, onboardingSilencedByChoice: true,
    }));
    expect(achs).not.toContain("shouldve_listened");
  });

  it("does not unlock shouldve_listened when not actually dead last", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      seasonNumber: 1, position: 9, onboardingSilencedByChoice: true,
    }));
    expect(achs).not.toContain("shouldve_listened");
  });

  it("unlocks told_you_so on a season-1 promotion after silencing the tips", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      seasonNumber: 1, moveType: "promoted", onboardingSilencedByChoice: true,
    }));
    expect(achs).toContain("told_you_so");
  });

  it("does not unlock told_you_so without having silenced the tips by choice", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      seasonNumber: 1, moveType: "promoted", onboardingSilencedByChoice: false,
    }));
    expect(achs).not.toContain("told_you_so");
  });

  it("does not unlock told_you_so on a season-1 finish that wasn't a promotion", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      seasonNumber: 1, moveType: "stayed", onboardingSilencedByChoice: true,
    }));
    expect(achs).not.toContain("told_you_so");
  });

  it("respects already-unlocked state for both", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      seasonNumber: 1, position: 10, moveType: "promoted", onboardingSilencedByChoice: true,
      unlockedAchievements: new Set(["shouldve_listened", "told_you_so"]),
    }));
    expect(achs).not.toContain("shouldve_listened");
    expect(achs).not.toContain("told_you_so");
  });
});

describe("collectSeasonEndAchievements — Upgrade Confirmed (signed comparison target outscores the man he replaced)", () => {
  it("unlocks when the signed player out-scored the replaced starter", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      compareSignWatch: { signedId: "s1", signedName: "New Guy", replacedName: "Old Guy" },
      playerSeasonStats: { "New Guy": { goals: 10 }, "Old Guy": { goals: 3 } },
    }));
    expect(achs).toContain("upgrade_confirmed");
  });

  it("does not unlock when the signed player scored fewer goals", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      compareSignWatch: { signedId: "s1", signedName: "New Guy", replacedName: "Old Guy" },
      playerSeasonStats: { "New Guy": { goals: 2 }, "Old Guy": { goals: 3 } },
    }));
    expect(achs).not.toContain("upgrade_confirmed");
  });

  it("treats a replaced player missing from playerSeasonStats as 0 goals (departed the squad)", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      compareSignWatch: { signedId: "s1", signedName: "New Guy", replacedName: "Departed Guy" },
      playerSeasonStats: { "New Guy": { goals: 1 } },
    }));
    expect(achs).toContain("upgrade_confirmed");
  });

  it("does not unlock without a compareSignWatch present", () => {
    const achs = collectSeasonEndAchievements(baseInput({ compareSignWatch: null }));
    expect(achs).not.toContain("upgrade_confirmed");
  });

  it("respects already-unlocked state", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      compareSignWatch: { signedId: "s1", signedName: "New Guy", replacedName: "Old Guy" },
      playerSeasonStats: { "New Guy": { goals: 10 }, "Old Guy": { goals: 3 } },
      unlockedAchievements: new Set(["upgrade_confirmed"]),
    }));
    expect(achs).not.toContain("upgrade_confirmed");
  });
});

describe("collectSeasonEndAchievements — The People's Champion (fan sentiment never below 50 all season)", () => {
  it("unlocks when the season floor never dropped below 50 and stats were tracked from MW0", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      fanSentimentSeasonFloor: 50, seasonLeagueStatsAvailable: true,
    }));
    expect(achs).toContain("peoples_champion");
  });

  it("does not unlock when the floor dipped below 50", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      fanSentimentSeasonFloor: 49, seasonLeagueStatsAvailable: true,
    }));
    expect(achs).not.toContain("peoples_champion");
  });

  it("does not unlock when canonical stats weren't tracked from the start of the season (mid-season load)", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      fanSentimentSeasonFloor: 100, seasonLeagueStatsAvailable: false,
    }));
    expect(achs).not.toContain("peoples_champion");
  });

  it("respects already-unlocked state", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      fanSentimentSeasonFloor: 80, seasonLeagueStatsAvailable: true,
      unlockedAchievements: new Set(["peoples_champion"]),
    }));
    expect(achs).not.toContain("peoples_champion");
  });
});

describe("collectSeasonEndAchievements — Flying Without A Net (top division in Ironman)", () => {
  it("unlocks when Ironman promotion lands the club at tier 1", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      currentTier: 2, newTier: 1, moveType: "promoted", gameMode: "ironman",
    }));
    expect(achs).toContain("flying_without_net");
  });

  it("does not unlock in casual mode", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      currentTier: 2, newTier: 1, moveType: "promoted", gameMode: "casual",
    }));
    expect(achs).not.toContain("flying_without_net");
  });

  it("does not unlock an Ironman promotion that doesn't reach tier 1", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      currentTier: 3, newTier: 2, moveType: "promoted", gameMode: "ironman",
    }));
    expect(achs).not.toContain("flying_without_net");
  });
});

describe("collectSeasonEndAchievements — Seller's Remorse", () => {
  it("unlocks when a player traded away this season is the league's top scorer", () => {
    const seasonLeagueStats = statsBlob({
      "p1": { key: "p1", name: "Sold Striker", teamId: 1, teamName: "AI United", goals: 25, assists: 0, yellows: 0, reds: 0 },
    });
    const transferHistory = [
      { season: 2, offered: [{ name: "Sold Striker" }] },
    ];
    const achs = collectSeasonEndAchievements(baseInput({ seasonLeagueStats, transferHistory }));
    expect(achs).toContain("sellers_remorse");
  });

  it("does NOT unlock when the top scorer wasn't sold this season", () => {
    const seasonLeagueStats = statsBlob({
      "p1": { key: "p1", name: "Home Grown Hero", teamId: 0, teamName: "Player FC", goals: 25, assists: 0, yellows: 0, reds: 0 },
    });
    const transferHistory = [{ season: 2, offered: [{ name: "Someone Else" }] }];
    const achs = collectSeasonEndAchievements(baseInput({ seasonLeagueStats, transferHistory }));
    expect(achs).not.toContain("sellers_remorse");
  });

  it("ignores trades logged in a different season", () => {
    const seasonLeagueStats = statsBlob({
      "p1": { key: "p1", name: "Sold Striker", teamId: 1, teamName: "AI United", goals: 25, assists: 0, yellows: 0, reds: 0 },
    });
    const transferHistory = [{ season: 1, offered: [{ name: "Sold Striker" }] }]; // wrong season
    const achs = collectSeasonEndAchievements(baseInput({ seasonLeagueStats, transferHistory, seasonNumber: 2 }));
    expect(achs).not.toContain("sellers_remorse");
  });

  it("respects already-unlocked state", () => {
    const seasonLeagueStats = statsBlob({
      "p1": { key: "p1", name: "Sold Striker", teamId: 1, teamName: "AI United", goals: 25, assists: 0, yellows: 0, reds: 0 },
    });
    const transferHistory = [{ season: 2, offered: [{ name: "Sold Striker" }] }];
    const achs = collectSeasonEndAchievements(baseInput({
      seasonLeagueStats, transferHistory,
      unlockedAchievements: new Set(["sellers_remorse"]),
    }));
    expect(achs).not.toContain("sellers_remorse");
  });
});

describe("collectSeasonEndAchievements — Cold Case", () => {
  it("unlocks when a shortlist entry survived from an earlier season", () => {
    const shortlist = [{ id: "p1", addedSeason: 1 }];
    const achs = collectSeasonEndAchievements(baseInput({ shortlist, seasonNumber: 2 }));
    expect(achs).toContain("cold_case");
  });

  it("does NOT unlock for a player added this season", () => {
    const shortlist = [{ id: "p1", addedSeason: 2 }];
    const achs = collectSeasonEndAchievements(baseInput({ shortlist, seasonNumber: 2 }));
    expect(achs).not.toContain("cold_case");
  });

  it("does NOT unlock with an empty shortlist", () => {
    const achs = collectSeasonEndAchievements(baseInput({ shortlist: [], seasonNumber: 2 }));
    expect(achs).not.toContain("cold_case");
  });

  it("respects already-unlocked state", () => {
    const shortlist = [{ id: "p1", addedSeason: 1 }];
    const achs = collectSeasonEndAchievements(baseInput({
      shortlist, seasonNumber: 2,
      unlockedAchievements: new Set(["cold_case"]),
    }));
    expect(achs).not.toContain("cold_case");
  });
});

describe("collectSeasonEndAchievements — Just Browsing", () => {
  it("unlocks when a dossier burned this season is on a player never signed", () => {
    const dossierBurns = { p1: { season: 2 } };
    const achs = collectSeasonEndAchievements(baseInput({ dossierBurns, seasonNumber: 2, squad: [] }));
    expect(achs).toContain("just_browsing");
  });

  it("does NOT unlock when the burned player was signed (in the squad)", () => {
    const dossierBurns = { p1: { season: 2 } };
    const achs = collectSeasonEndAchievements(baseInput({ dossierBurns, seasonNumber: 2, squad: [{ id: "p1" }] }));
    expect(achs).not.toContain("just_browsing");
  });

  it("does NOT unlock for a burn from an earlier season", () => {
    const dossierBurns = { p1: { season: 1 } };
    const achs = collectSeasonEndAchievements(baseInput({ dossierBurns, seasonNumber: 2, squad: [] }));
    expect(achs).not.toContain("just_browsing");
  });

  it("does NOT unlock with no burns", () => {
    const achs = collectSeasonEndAchievements(baseInput({ dossierBurns: {}, seasonNumber: 2 }));
    expect(achs).not.toContain("just_browsing");
  });

  it("respects already-unlocked state", () => {
    const dossierBurns = { p1: { season: 2 } };
    const achs = collectSeasonEndAchievements(baseInput({
      dossierBurns, seasonNumber: 2, squad: [],
      unlockedAchievements: new Set(["just_browsing"]),
    }));
    expect(achs).not.toContain("just_browsing");
  });
});

describe("checkBeenEverywhereMan — Date Cigs", () => {
  it("false with only a few positions covered", () => {
    const clubHistory = { seasonArchive: [{ position: 1 }, { position: 2 }] };
    expect(checkBeenEverywhereMan(clubHistory, 3)).toBe(false);
  });

  it("true once every position 1-10 is covered across archive + current", () => {
    const clubHistory = { seasonArchive: Array.from({ length: 9 }, (_, i) => ({ position: i + 1 })) };
    expect(checkBeenEverywhereMan(clubHistory, 10)).toBe(true);
  });
});

describe("checkUnfinishedBusiness — Date Cigs", () => {
  it("true when champion at a tier you were once relegated from", () => {
    const clubHistory = { seasonArchive: [{ tier: 5, result: "relegated" }] };
    expect(checkUnfinishedBusiness(clubHistory, 1, 5)).toBe(true);
  });

  it("false when not champion this season", () => {
    const clubHistory = { seasonArchive: [{ tier: 5, result: "relegated" }] };
    expect(checkUnfinishedBusiness(clubHistory, 2, 5)).toBe(false);
  });

  it("false when never relegated from this tier", () => {
    const clubHistory = { seasonArchive: [{ tier: 4, result: "relegated" }] };
    expect(checkUnfinishedBusiness(clubHistory, 1, 5)).toBe(false);
  });
});

describe("checkYoYoYears — Date Cigs", () => {
  it("true for promoted, relegated, promoted across 3 consecutive seasons", () => {
    const clubHistory = { seasonArchive: [{ result: "promoted" }, { result: "relegated" }] };
    expect(checkYoYoYears(clubHistory, "promoted")).toBe(true);
  });

  it("false when the sequence is broken", () => {
    const clubHistory = { seasonArchive: [{ result: "promoted" }, { result: "stayed" }] };
    expect(checkYoYoYears(clubHistory, "promoted")).toBe(false);
  });

  it("false with fewer than 2 archived seasons", () => {
    expect(checkYoYoYears({ seasonArchive: [{ result: "relegated" }] }, "promoted")).toBe(false);
  });
});

describe("checkWatchingTheThrone — Date Cigs", () => {
  it("true when a rival club wins 3 straight titles in another division", () => {
    const leagueHistory = {
      1: { 4: { standings: [{ name: "Rival FC" }] } },
      2: { 4: { standings: [{ name: "Rival FC" }] } },
      3: { 4: { standings: [{ name: "Rival FC" }] } },
    };
    expect(checkWatchingTheThrone(leagueHistory, "Player FC")).toBe(true);
  });

  it("false when the streak is broken by a different champion", () => {
    const leagueHistory = {
      1: { 4: { standings: [{ name: "Rival FC" }] } },
      2: { 4: { standings: [{ name: "Someone Else" }] } },
      3: { 4: { standings: [{ name: "Rival FC" }] } },
    };
    expect(checkWatchingTheThrone(leagueHistory, "Player FC")).toBe(false);
  });

  it("does not count the player's own club as a rival streak", () => {
    const leagueHistory = {
      1: { 4: { standings: [{ name: "Player FC" }] } },
      2: { 4: { standings: [{ name: "Player FC" }] } },
      3: { 4: { standings: [{ name: "Player FC" }] } },
    };
    expect(checkWatchingTheThrone(leagueHistory, "Player FC")).toBe(false);
  });
});

describe("checkWoodenSpoonCollection — Date Cigs", () => {
  it("true after finishing bottom in 2 different tiers", () => {
    const clubHistory = { seasonArchive: [{ position: 10, tier: 5 }] };
    expect(checkWoodenSpoonCollection(clubHistory, 10, 6)).toBe(true);
  });

  it("false when the bottom finish repeats in the same tier", () => {
    const clubHistory = { seasonArchive: [{ position: 10, tier: 5 }] };
    expect(checkWoodenSpoonCollection(clubHistory, 10, 5)).toBe(false);
  });
});

describe("checkSameTimeNextYear — Redcurrant Cigs", () => {
  it("true for the same position 3 seasons running", () => {
    const clubHistory = { seasonArchive: [{ position: 5 }, { position: 5 }] };
    expect(checkSameTimeNextYear(clubHistory, 5)).toBe(true);
  });

  it("false when a position differs", () => {
    const clubHistory = { seasonArchive: [{ position: 5 }, { position: 6 }] };
    expect(checkSameTimeNextYear(clubHistory, 5)).toBe(false);
  });
});

describe("collectSeasonEndAchievements — season-domain wave, retroactive-safe", () => {
  it("does not crash and unlocks nothing extra with fully empty history", () => {
    expect(() => collectSeasonEndAchievements(baseInput())).not.toThrow();
  });
});

describe("collectSeasonEndAchievements — grandfather_clause (Physalis Cigs)", () => {
  const veteran = { id: "v1", name: "Old Faithful", age: 33, position: "CB" };
  const leagueWithFixtures = { ...makeLeague(0), fixtures: Array.from({ length: 20 }, () => ({})) };

  it("unlocks when a 33+ player's apps equal the season's league fixture count", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      squad: [veteran],
      playerSeasonStats: { "Old Faithful": { apps: 20 } },
      league: leagueWithFixtures,
    }));
    expect(achs).toContain("grandfather_clause");
  });

  it("does NOT unlock when the veteran missed even one league match", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      squad: [veteran],
      playerSeasonStats: { "Old Faithful": { apps: 19 } },
      league: leagueWithFixtures,
    }));
    expect(achs).not.toContain("grandfather_clause");
  });

  it("does NOT unlock when the ever-present player is under 33", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      squad: [{ ...veteran, age: 28 }],
      playerSeasonStats: { "Old Faithful": { apps: 20 } },
      league: leagueWithFixtures,
    }));
    expect(achs).not.toContain("grandfather_clause");
  });

  it("falls back to 18 league matches when league.fixtures is unavailable", () => {
    const achsShort = collectSeasonEndAchievements(baseInput({
      squad: [veteran],
      playerSeasonStats: { "Old Faithful": { apps: 17 } },
      league: makeLeague(0), // no .fixtures
    }));
    expect(achsShort).not.toContain("grandfather_clause");

    const achsFull = collectSeasonEndAchievements(baseInput({
      squad: [veteran],
      playerSeasonStats: { "Old Faithful": { apps: 18 } },
      league: makeLeague(0),
    }));
    expect(achsFull).toContain("grandfather_clause");
  });

  it("respects already-unlocked state", () => {
    const achs = collectSeasonEndAchievements(baseInput({
      squad: [veteran],
      playerSeasonStats: { "Old Faithful": { apps: 20 } },
      league: leagueWithFixtures,
      unlockedAchievements: new Set(["grandfather_clause"]),
    }));
    expect(achs).not.toContain("grandfather_clause");
  });
});

function makeKnockoutLeague(playerTeamIdx = 0) {
  return {
    teams: [
      { name: "Player FC", isPlayer: playerTeamIdx === 0 },
      { name: "Second FC", isPlayer: playerTeamIdx === 1 },
      { name: "Third FC", isPlayer: playerTeamIdx === 2 },
      { name: "Fourth FC", isPlayer: playerTeamIdx === 3 },
    ],
    table: [
      { teamIndex: 0, points: 40 }, { teamIndex: 1, points: 36 },
      { teamIndex: 2, points: 32 }, { teamIndex: 3, points: 28 },
    ],
  };
}

describe("collectDynastyCupFinalAchievements — Pineapple Cigs", () => {
  it("succession when the player wins the final", () => {
    const achs = collectDynastyCupFinalAchievements({
      playerWon: true, dynastyCupQualifiers: null, league: makeKnockoutLeague(1), opponentName: "Second FC", unlockedAchievements: new Set(),
    });
    expect(achs).toContain("succession");
  });

  it("through_side_door when the 4th seed wins it all", () => {
    const qualifiers = [{ teamIndex: 1 }, { teamIndex: 2 }, { teamIndex: 3 }, { teamIndex: 0 }];
    const achs = collectDynastyCupFinalAchievements({
      playerWon: true, dynastyCupQualifiers: qualifiers, league: makeKnockoutLeague(0), opponentName: "Second FC", unlockedAchievements: new Set(),
    });
    expect(achs).toContain("through_side_door");
    expect(achs).toContain("undercard");
  });

  it("undercard when reaching the final from 4th seed even in defeat", () => {
    const qualifiers = [{ teamIndex: 1 }, { teamIndex: 2 }, { teamIndex: 3 }, { teamIndex: 0 }];
    const achs = collectDynastyCupFinalAchievements({
      playerWon: false, dynastyCupQualifiers: qualifiers, league: makeKnockoutLeague(0), opponentName: "Second FC", unlockedAchievements: new Set(),
    });
    expect(achs).toContain("undercard");
    expect(achs).not.toContain("succession");
  });

  it("both_barrels when league champions also win the Dynasty Cup", () => {
    // Player is teamIndex 0, which also tops the table (highest points).
    const achs = collectDynastyCupFinalAchievements({
      playerWon: true, dynastyCupQualifiers: null, league: makeKnockoutLeague(0), opponentName: "Second FC", unlockedAchievements: new Set(),
    });
    expect(achs).toContain("both_barrels");
  });

  it("bottled_it_beautifully when league champions lose the Dynasty Cup final", () => {
    const achs = collectDynastyCupFinalAchievements({
      playerWon: false, dynastyCupQualifiers: null, league: makeKnockoutLeague(0), opponentName: "Second FC", unlockedAchievements: new Set(),
    });
    expect(achs).toContain("bottled_it_beautifully");
  });

  it("kingmaker_denied when beating the league champions in the final", () => {
    // Player is teamIndex 1 (not champions); opponent "Player FC" (teamIndex 0) IS champions.
    const achs = collectDynastyCupFinalAchievements({
      playerWon: true, dynastyCupQualifiers: null, league: makeKnockoutLeague(1), opponentName: "Player FC", unlockedAchievements: new Set(),
    });
    expect(achs).toContain("kingmaker_denied");
  });

  it("respects already-unlocked state", () => {
    const achs = collectDynastyCupFinalAchievements({
      playerWon: true, dynastyCupQualifiers: null, league: makeKnockoutLeague(1), opponentName: "Second FC",
      unlockedAchievements: new Set(["succession"]),
    });
    expect(achs).not.toContain("succession");
  });
});

describe("collectMiniTournamentThirdPlaceAchievements — Pineapple Cigs", () => {
  it("bronze_age when the player wins the 3rd-place playoff", () => {
    expect(collectMiniTournamentThirdPlaceAchievements({ playerWon3rd: true, unlockedAchievements: new Set() })).toEqual(["bronze_age"]);
  });

  it("nothing on defeat", () => {
    expect(collectMiniTournamentThirdPlaceAchievements({ playerWon3rd: false, unlockedAchievements: new Set() })).toEqual([]);
  });
});

describe("collectMiniTournamentFinalAchievements — Pineapple Cigs", () => {
  it("five_a_side_story when the player wins the final", () => {
    const achs = collectMiniTournamentFinalAchievements({
      playerWonFinal: true, playerLeaguePosition: 1, league: makeKnockoutLeague(0), opponentName: "Second FC", unlockedAchievements: new Set(),
    });
    expect(achs).toContain("five_a_side_story");
  });

  it("giant_slaying_mini when the 4th-placed team wins the 5v5", () => {
    const achs = collectMiniTournamentFinalAchievements({
      playerWonFinal: true, playerLeaguePosition: 4, league: makeKnockoutLeague(0), opponentName: "Second FC", unlockedAchievements: new Set(),
    });
    expect(achs).toContain("giant_slaying_mini");
  });

  it("does NOT unlock giant_slaying_mini from a non-4th finish", () => {
    const achs = collectMiniTournamentFinalAchievements({
      playerWonFinal: true, playerLeaguePosition: 2, league: makeKnockoutLeague(0), opponentName: "Second FC", unlockedAchievements: new Set(),
    });
    expect(achs).not.toContain("giant_slaying_mini");
  });

  it("kingmaker_denied when beating the league champions in the 5v5 final", () => {
    const achs = collectMiniTournamentFinalAchievements({
      playerWonFinal: true, playerLeaguePosition: 2, league: makeKnockoutLeague(1), opponentName: "Player FC", unlockedAchievements: new Set(),
    });
    expect(achs).toContain("kingmaker_denied");
  });

  it("nothing on defeat", () => {
    const achs = collectMiniTournamentFinalAchievements({
      playerWonFinal: false, playerLeaguePosition: 4, league: makeKnockoutLeague(0), opponentName: "Second FC", unlockedAchievements: new Set(),
    });
    expect(achs).toEqual([]);
  });
});
