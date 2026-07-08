import { describe, it, expect } from "vitest";
import {
  collectSeasonEndAchievements, wonEveryPlayedMatchThisSeason,
  checkBeenEverywhereMan, checkUnfinishedBusiness, checkYoYoYears, checkWatchingTheThrone,
  checkWoodenSpoonCollection, checkSameTimeNextYear,
  collectDynastyCupFinalAchievements, collectMiniTournamentThirdPlaceAchievements, collectMiniTournamentFinalAchievements,
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
