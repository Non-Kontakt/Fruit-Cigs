import { describe, it, expect } from "vitest";
import { checkAchievements } from "../achievements.js";

// Tinkerer, The Dugout, and Rotation Policy all previously fired off bulk
// state that never reflected a deliberate manual action (whole-squad
// training delegation, ASST XI auto-fill, a single swapped starter). These
// tests pin the manual-only / raised-threshold behavior.

function makePlayer(id, overrides = {}) {
  return {
    id, name: `Player ${id}`, position: "CM", age: 25,
    attrs: { pace: 10, shooting: 10, passing: 10, defending: 10, physical: 10, technique: 10, mental: 10 },
    training: "balanced",
    ...overrides,
  };
}

const baseInput = (extras = {}) => ({
  squad: [], unlocked: new Set(), lastMatchResult: null, league: null, weekGains: null,
  startingXI: [], bench: [], matchweekIndex: 0,
  seasonCards: 0, totalGains: 0, totalMatches: 0, seasonCleanSheets: 0, seasonGoalsFor: 0, seasonDraws: 0,
  consecutiveUnbeaten: 0, consecutiveLosses: 0, consecutiveWins: 0,
  prevStartingXI: null, motmTracker: {}, stScoredConsecutive: 0,
  playerRatingTracker: {}, beatenTeams: new Set(), halfwayPosition: null,
  seasonHomeUnbeaten: true, seasonAwayWins: 0, seasonAwayGames: 0,
  leagueWins: 0, wasAlwaysFast: false, recoveries: [], recentScorelines: [], secondPlaceFinishes: 0,
  playerInjuryCount: {}, benchStreaks: {}, highScoringMatches: 0, trialHistory: [],
  playerSeasonStats: {}, clubHistory: null, consecutiveScoreless: 0,
  formation: null, slotAssignments: null, manualSlotIndices: new Set(),
  usedTicketTypes: new Set(), formationsWonWith: new Set(), freeAgentSignings: 0,
  scoutedPlayers: {}, transferFocus: [], clubRelationships: {},
  isOnHoliday: false, wonLeagueOnHoliday: false, holidayMatchesThisSeason: 0,
  doubleTrainingWeek: false, testimonialPlayer: null,
  seasonNumber: 1, lastSeasonPosition: null,
  shortlist: [], wasAlwaysNormal: false, fastMatchesThisSeason: 0, twelfthManActive: false,
  gkCleanSheets: {}, totalShortlisted: 0,
  trainedThisWeek: new Set(), manualTrainingThisWeek: new Set(),
  ...extras,
});

describe("Tinkerer — manual-only training changes", () => {
  const squad = [makePlayer("p1"), makePlayer("p2"), makePlayer("p3")];
  const startingXI = squad.map(p => p.id);

  it("does NOT unlock when the whole squad was bulk-trained (trainedThisWeek full, manualTrainingThisWeek empty)", () => {
    const result = checkAchievements(baseInput({
      squad, startingXI,
      trainedThisWeek: new Set(startingXI),
      manualTrainingThisWeek: new Set(),
    }));
    expect(result).not.toContain("tinkerer");
  });

  it("unlocks when every player's training was manually assigned", () => {
    const result = checkAchievements(baseInput({
      squad, startingXI,
      trainedThisWeek: new Set(startingXI),
      manualTrainingThisWeek: new Set(startingXI),
    }));
    expect(result).toContain("tinkerer");
  });

  it("respects already-unlocked state", () => {
    const result = checkAchievements(baseInput({
      squad, startingXI,
      unlocked: new Set(["tinkerer"]),
      manualTrainingThisWeek: new Set(startingXI),
    }));
    expect(result).not.toContain("tinkerer");
  });
});

describe("The Dugout — manual-only slot assignment", () => {
  const slotsFilled = Array.from({ length: 16 }, (_, i) => (i < 11 ? `p${i}` : null));

  it("does NOT unlock when slots were auto-filled (ASST XI) — manualSlotIndices empty", () => {
    const result = checkAchievements(baseInput({
      slotAssignments: slotsFilled,
      manualSlotIndices: new Set(),
    }));
    expect(result).not.toContain("the_dugout");
  });

  it("does NOT unlock when only some slots were manually assigned", () => {
    const result = checkAchievements(baseInput({
      slotAssignments: slotsFilled,
      manualSlotIndices: new Set([0, 1, 2]),
    }));
    expect(result).not.toContain("the_dugout");
  });

  it("unlocks when all 11 starting slots were manually assigned and filled", () => {
    const result = checkAchievements(baseInput({
      slotAssignments: slotsFilled,
      manualSlotIndices: new Set(Array.from({ length: 11 }, (_, i) => i)),
    }));
    expect(result).toContain("the_dugout");
  });

  it("respects already-unlocked state", () => {
    const result = checkAchievements(baseInput({
      unlocked: new Set(["the_dugout"]),
      slotAssignments: slotsFilled,
      manualSlotIndices: new Set(Array.from({ length: 11 }, (_, i) => i)),
    }));
    expect(result).not.toContain("the_dugout");
  });
});

describe("Rotation Policy — 4+ changes required", () => {
  // The rotation check only runs as part of the post-match "Match-based
  // checks" block, which requires a lastMatchResult + league.
  const league = {
    teams: [{ name: "Player FC", isPlayer: true }, { name: "AI United", isPlayer: false }],
    table: [
      { teamIndex: 0, points: 10, goalsFor: 10, goalsAgainst: 2 },
      { teamIndex: 1, points: 5, goalsFor: 5, goalsAgainst: 8 },
    ],
  };
  const lastMatchResult = { home: 0, away: 1, homeGoals: 1, awayGoals: 0 };
  const prevStartingXI = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"];

  it("does NOT unlock with only 3 changes to the Starting XI", () => {
    const startingXI = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new1", "new2", "new3"];
    const result = checkAchievements(baseInput({ lastMatchResult, league, prevStartingXI, startingXI }));
    expect(result).not.toContain("rotation");
  });

  it("unlocks with 4 changes to the Starting XI", () => {
    const startingXI = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "new1", "new2", "new3", "new4"];
    const result = checkAchievements(baseInput({ lastMatchResult, league, prevStartingXI, startingXI }));
    expect(result).toContain("rotation");
  });

  it("respects already-unlocked state", () => {
    const startingXI = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "new1", "new2", "new3", "new4"];
    const result = checkAchievements(baseInput({
      lastMatchResult, league, prevStartingXI, startingXI, unlocked: new Set(["rotation"]),
    }));
    expect(result).not.toContain("rotation");
  });
});
