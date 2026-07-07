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
