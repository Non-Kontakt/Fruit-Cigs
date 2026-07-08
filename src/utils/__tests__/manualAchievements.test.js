import { describe, it, expect } from "vitest";
import { checkAchievements, hasAllBackPages, addHatTrickScorer } from "../achievements.js";
import { STARTING_XI_POSITIONS } from "../../data/positions.js";

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

describe("hasAllBackPages — Framed Above The Desk", () => {
  it("false with an empty set", () => {
    expect(hasAllBackPages(new Set())).toBe(false);
  });

  it("false with only two of the three types", () => {
    expect(hasAllBackPages(new Set(["title", "promotion"]))).toBe(false);
  });

  it("true once all three types are present", () => {
    expect(hasAllBackPages(new Set(["title", "promotion", "cup_final"]))).toBe(true);
  });

  it("true regardless of insertion order or extra unknown entries", () => {
    expect(hasAllBackPages(new Set(["cup_final", "unrelated", "promotion", "title"]))).toBe(true);
  });

  it("handles a null/undefined set without throwing", () => {
    expect(hasAllBackPages(null)).toBe(false);
    expect(hasAllBackPages(undefined)).toBe(false);
  });
});

describe("addHatTrickScorer — Hat-Trick Headlines", () => {
  it("appends a new distinct name", () => {
    const result = addHatTrickScorer(["Adams"], "Baker");
    expect(result).toEqual(["Adams", "Baker"]);
  });

  it("dedupes — does not append a name already recorded", () => {
    const prev = ["Adams", "Baker"];
    const result = addHatTrickScorer(prev, "Adams");
    expect(result).toBe(prev); // same reference — caller uses this to skip setState
    expect(result).toEqual(["Adams", "Baker"]);
  });

  it("ignores a missing/falsy name", () => {
    const prev = ["Adams"];
    expect(addHatTrickScorer(prev, undefined)).toBe(prev);
    expect(addHatTrickScorer(prev, null)).toBe(prev);
    expect(addHatTrickScorer(prev, "")).toBe(prev);
  });

  it("treats a missing prior list as empty", () => {
    expect(addHatTrickScorer(undefined, "Adams")).toEqual(["Adams"]);
    expect(addHatTrickScorer(null, "Adams")).toEqual(["Adams"]);
  });

  it("three distinct scorers reach the unlock threshold", () => {
    let players = [];
    players = addHatTrickScorer(players, "Adams");
    players = addHatTrickScorer(players, "Baker");
    players = addHatTrickScorer(players, "Adams"); // repeat, not distinct
    players = addHatTrickScorer(players, "Clarke");
    expect(players).toEqual(["Adams", "Baker", "Clarke"]);
    expect(players.length).toBeGreaterThanOrEqual(3);
  });
});

// Minimal valid league/lastMatchResult — out_of_pos and keeper_rush live
// inside checkAchievements' "if (lastMatchResult && league)" block, which
// indexes league.teams[lastMatchResult.home/away] unconditionally.
const minimalLeague = {
  teams: [{ name: "Player FC", isPlayer: true }, { name: "AI United", isPlayer: false }],
  table: [
    { teamIndex: 0, points: 10, goalsFor: 10, goalsAgainst: 2 },
    { teamIndex: 1, points: 5, goalsFor: 5, goalsAgainst: 8 },
  ],
};
const minimalMatchResult = { home: 0, away: 1, homeGoals: 1, awayGoals: 0 };

describe("out_of_pos (He Doesn't Even Go Here) — merged with the former Identity Crisis", () => {
  // 11-slot formation matching STARTING_XI_POSITIONS order, and a squad
  // whose natural positions line up 1:1 with that formation by default.
  // slotAssignments (not formation-auto-assign) pins each squad member to
  // an exact slot so tests can control the mismatch precisely.
  const formation = STARTING_XI_POSITIONS.map(pos => ({ pos }));
  const squad = STARTING_XI_POSITIONS.map((pos, i) => makePlayer(`p${i}`, { position: pos }));
  const startingXI = squad.map(p => p.id);
  const slotAssignments = [...startingXI, null, null, null, null, null];
  const cmSlotIndex = STARTING_XI_POSITIONS.indexOf("CM"); // p5

  it("does NOT unlock when the misplaced player's learned position covers the slot", () => {
    const misplacedSquad = squad.map((p, i) =>
      i === cmSlotIndex ? { ...p, position: "ST", learnedPositions: ["CM"] } : p
    );
    const result = checkAchievements({
      squad: misplacedSquad, unlocked: new Set(), lastMatchResult: minimalMatchResult, league: minimalLeague,
      startingXI, bench: [], formation, slotAssignments, manualSlotIndices: new Set(),
    });
    expect(result).not.toContain("out_of_pos");
  });

  it("unlocks when the misplaced player has neither the natural nor a learned position for the slot", () => {
    const misplacedSquad = squad.map((p, i) =>
      i === cmSlotIndex ? { ...p, position: "ST", learnedPositions: [] } : p
    );
    const result = checkAchievements({
      squad: misplacedSquad, unlocked: new Set(), lastMatchResult: minimalMatchResult, league: minimalLeague,
      startingXI, bench: [], formation, slotAssignments, manualSlotIndices: new Set(),
    });
    expect(result).toContain("out_of_pos");
  });

  it("respects already-unlocked state", () => {
    const misplacedSquad = squad.map((p, i) => i === cmSlotIndex ? { ...p, position: "ST" } : p);
    const result = checkAchievements({
      squad: misplacedSquad, unlocked: new Set(["out_of_pos"]), lastMatchResult: minimalMatchResult, league: minimalLeague,
      startingXI, bench: [], formation, slotAssignments, manualSlotIndices: new Set(),
    });
    expect(result).not.toContain("out_of_pos");
  });
});

describe("keeper_rush — GK starts as an outfielder", () => {
  const formation = STARTING_XI_POSITIONS.map(pos => ({ pos }));
  const squad = STARTING_XI_POSITIONS.map((pos, i) => makePlayer(`p${i}`, { position: pos }));
  const startingXI = squad.map(p => p.id);
  const slotAssignments = [...startingXI, null, null, null, null, null];
  const gkSlotIndex = STARTING_XI_POSITIONS.indexOf("GK"); // 0
  const stSlotIndex = STARTING_XI_POSITIONS.indexOf("ST"); // 10

  it("unlocks when the natural GK starts in an outfield slot", () => {
    // Swap the GK and ST players' positions across slots: p0 (natural GK,
    // still in the squad) now occupies the ST slot.
    const swappedSquad = squad.map((p, i) => {
      if (i === gkSlotIndex) return { ...p, position: "GK" }; // unchanged, still in GK slot originally
      return p;
    });
    const swappedXI = [...startingXI];
    [swappedXI[gkSlotIndex], swappedXI[stSlotIndex]] = [swappedXI[stSlotIndex], swappedXI[gkSlotIndex]];
    const swappedSlotAssignments = [...swappedXI, null, null, null, null, null];
    const result = checkAchievements({
      squad: swappedSquad, unlocked: new Set(), lastMatchResult: minimalMatchResult, league: minimalLeague,
      startingXI: swappedXI, bench: [], formation, slotAssignments: swappedSlotAssignments, manualSlotIndices: new Set(),
    });
    expect(result).toContain("keeper_rush");
  });

  it("does NOT unlock when the GK starts in the GK slot", () => {
    const result = checkAchievements({
      squad, unlocked: new Set(), lastMatchResult: minimalMatchResult, league: minimalLeague,
      startingXI, bench: [], formation, slotAssignments, manualSlotIndices: new Set(),
    });
    expect(result).not.toContain("keeper_rush");
  });

  it("does NOT unlock when an outfielder starts in the GK slot (that's emergency_gk's territory)", () => {
    // No natural GK in this XI at all — the GK slot is filled by a natural
    // ST player instead.
    const noGkSquad = squad.map((p, i) => i === gkSlotIndex ? { ...p, position: "ST" } : p);
    const result = checkAchievements({
      squad: noGkSquad, unlocked: new Set(), lastMatchResult: minimalMatchResult, league: minimalLeague,
      startingXI, bench: [], formation, slotAssignments, manualSlotIndices: new Set(),
    });
    expect(result).not.toContain("keeper_rush");
  });

  it("respects already-unlocked state", () => {
    const swappedXI = [...startingXI];
    [swappedXI[gkSlotIndex], swappedXI[stSlotIndex]] = [swappedXI[stSlotIndex], swappedXI[gkSlotIndex]];
    const swappedSlotAssignments = [...swappedXI, null, null, null, null, null];
    const result = checkAchievements({
      squad, unlocked: new Set(["keeper_rush"]), lastMatchResult: minimalMatchResult, league: minimalLeague,
      startingXI: swappedXI, bench: [], formation, slotAssignments: swappedSlotAssignments, manualSlotIndices: new Set(),
    });
    expect(result).not.toContain("keeper_rush");
  });
});
