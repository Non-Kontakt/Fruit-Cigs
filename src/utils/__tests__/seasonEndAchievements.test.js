import { describe, it, expect } from "vitest";
import { collectSeasonEndAchievements, wonEveryPlayedMatchThisSeason } from "../league.js";

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
