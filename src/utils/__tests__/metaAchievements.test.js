import { describe, it, expect } from "vitest";
import { checkAchievements, checkCompareAchievements, checkLegendMilestones, checkMuseumAchievements } from "../achievements.js";

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
  gameMode: "casual",
  ...extras,
});

const attrs = (overrides = {}) => ({
  pace: 10, shooting: 10, passing: 10, defending: 10, physical: 10, technique: 10, mental: 10,
  ...overrides,
});

describe("checkCompareAchievements — strict attribute sweep", () => {
  it("unlocks no_contest when the target strictly beats the comparable on every attribute", () => {
    const result = checkCompareAchievements({
      targetAttrs: attrs({ pace: 15, shooting: 15, passing: 15, defending: 15, physical: 15, technique: 15, mental: 15 }),
      comparableAttrs: attrs(), unlocked: new Set(),
    });
    expect(result).toContain("no_contest");
    expect(result).not.toContain("dodged_a_bullet");
  });

  it("unlocks dodged_a_bullet when the target strictly loses on every attribute", () => {
    const result = checkCompareAchievements({
      targetAttrs: attrs({ pace: 5, shooting: 5, passing: 5, defending: 5, physical: 5, technique: 5, mental: 5 }),
      comparableAttrs: attrs(), unlocked: new Set(),
    });
    expect(result).toContain("dodged_a_bullet");
    expect(result).not.toContain("no_contest");
  });

  it("unlocks neither when even one attribute ties or goes the other way", () => {
    const result = checkCompareAchievements({
      targetAttrs: attrs({ pace: 15, shooting: 10 }), comparableAttrs: attrs(), unlocked: new Set(),
    });
    expect(result).not.toContain("no_contest");
    expect(result).not.toContain("dodged_a_bullet");
  });

  it("respects already-unlocked state", () => {
    const result = checkCompareAchievements({
      targetAttrs: attrs({ pace: 15 }), comparableAttrs: attrs(), unlocked: new Set(["no_contest"]),
    });
    expect(result).not.toContain("no_contest");
  });

  it("returns nothing when either side is missing (no XI/no squad edge case)", () => {
    expect(checkCompareAchievements({ targetAttrs: null, comparableAttrs: attrs(), unlocked: new Set() })).toEqual([]);
  });
});

describe("checkLegendMilestones — appearance cap", () => {
  it("unlocks long_goodbye when a Legend has reached the 12-appearance cap", () => {
    const squad = [makePlayer("p1", { isLegend: true, legendAppearances: 12 })];
    const result = checkLegendMilestones({ squad, lastMatchResult: null, isPlayerHome: true, unlocked: new Set() });
    expect(result).toContain("long_goodbye");
  });

  it("does not unlock long_goodbye below the cap", () => {
    const squad = [makePlayer("p1", { isLegend: true, legendAppearances: 11 })];
    const result = checkLegendMilestones({ squad, lastMatchResult: null, isPlayerHome: true, unlocked: new Set() });
    expect(result).not.toContain("long_goodbye");
  });

  it("unlocks worth_the_armband when a capped Legend scored in this match", () => {
    const squad = [makePlayer("p1", { name: "Legend One", isLegend: true, legendAppearances: 12 })];
    const lastMatchResult = { events: [{ type: "goal", side: "home", player: "Legend One" }] };
    const result = checkLegendMilestones({ squad, lastMatchResult, isPlayerHome: true, unlocked: new Set() });
    expect(result).toContain("worth_the_armband");
  });

  it("does not unlock worth_the_armband when the scorer is on the other side", () => {
    const squad = [makePlayer("p1", { name: "Legend One", isLegend: true, legendAppearances: 12 })];
    const lastMatchResult = { events: [{ type: "goal", side: "away", player: "Legend One" }] };
    const result = checkLegendMilestones({ squad, lastMatchResult, isPlayerHome: true, unlocked: new Set() });
    expect(result).not.toContain("worth_the_armband");
  });

  it("does not unlock worth_the_armband when no capped Legend scored", () => {
    const squad = [
      makePlayer("p1", { name: "Legend One", isLegend: true, legendAppearances: 12 }),
      makePlayer("p2", { name: "Regular Joe" }),
    ];
    const lastMatchResult = { events: [{ type: "goal", side: "home", player: "Regular Joe" }] };
    const result = checkLegendMilestones({ squad, lastMatchResult, isPlayerHome: true, unlocked: new Set() });
    expect(result).not.toContain("worth_the_armband");
  });

  it("respects already-unlocked state for both cards independently", () => {
    const squad = [makePlayer("p1", { name: "Legend One", isLegend: true, legendAppearances: 12 })];
    const lastMatchResult = { events: [{ type: "goal", side: "home", player: "Legend One" }] };
    const result = checkLegendMilestones({
      squad, lastMatchResult, isPlayerHome: true,
      unlocked: new Set(["long_goodbye", "worth_the_armband"]),
    });
    expect(result).toEqual([]);
  });
});

describe("checkAchievements — Built Different (Legend past his old era's cap)", () => {
  it("unlocks when a Legend's overall exceeds the OVR cap of the era he retired under", () => {
    // legendPrestige 1 → retired under prestige 0's cap (20). Give every
    // attribute a strong overall well above 20.
    const squad = [makePlayer("p1", {
      isLegend: true, legendPrestige: 1,
      attrs: attrs({ pace: 30, shooting: 30, passing: 30, defending: 30, physical: 30, technique: 30, mental: 30 }),
    })];
    const result = checkAchievements(baseInput({ squad }));
    expect(result).toContain("built_different");
  });

  it("does not unlock when the Legend is still within his old era's cap", () => {
    const squad = [makePlayer("p1", { isLegend: true, legendPrestige: 1, attrs: attrs({ pace: 18 }) })];
    const result = checkAchievements(baseInput({ squad }));
    expect(result).not.toContain("built_different");
  });

  it("ignores non-Legend players entirely", () => {
    const squad = [makePlayer("p1", { attrs: attrs({ pace: 30, shooting: 30, passing: 30, defending: 30, physical: 30, technique: 30, mental: 30 }) })];
    const result = checkAchievements(baseInput({ squad }));
    expect(result).not.toContain("built_different");
  });
});

describe("checkAchievements — Decade Of Danger (live, Ironman only)", () => {
  it("unlocks at season 10 in Ironman mode", () => {
    const result = checkAchievements(baseInput({ seasonNumber: 10, gameMode: "ironman" }));
    expect(result).toContain("decade_of_danger");
  });

  it("does not unlock in casual mode even at season 10", () => {
    const result = checkAchievements(baseInput({ seasonNumber: 10, gameMode: "casual" }));
    expect(result).not.toContain("decade_of_danger");
  });

  it("does not unlock before season 10", () => {
    const result = checkAchievements(baseInput({ seasonNumber: 9, gameMode: "ironman" }));
    expect(result).not.toContain("decade_of_danger");
  });
});

describe("checkMuseumAchievements — retroactive Museum (Elderberry Cigs)", () => {
  it("returns nothing for an empty or missing museum", () => {
    expect(checkMuseumAchievements([], new Set())).toEqual([]);
    expect(checkMuseumAchievements(null, new Set())).toEqual([]);
    expect(checkMuseumAchievements(undefined, new Set())).toEqual([]);
  });

  it("unlocks ashes_to_ashes with a single archived career", () => {
    const museum = [{ teamName: "Rovers", seasonNumber: 3, leagueTier: 8, totalMatches: 90, clubHistory: {} }];
    expect(checkMuseumAchievements(museum, new Set())).toContain("ashes_to_ashes");
  });

  it("unlocks the_collection only once 3 careers are archived", () => {
    const two = [
      { teamName: "A", seasonNumber: 2, clubHistory: {} },
      { teamName: "B", seasonNumber: 2, clubHistory: {} },
    ];
    expect(checkMuseumAchievements(two, new Set())).not.toContain("the_collection");
    const three = [...two, { teamName: "C", seasonNumber: 2, clubHistory: {} }];
    expect(checkMuseumAchievements(three, new Set())).toContain("the_collection");
  });

  it("unlocks decade_of_danger when any archived career reached season 10+", () => {
    const museum = [{ teamName: "Rovers", seasonNumber: 11, clubHistory: {} }];
    expect(checkMuseumAchievements(museum, new Set())).toContain("decade_of_danger");
  });

  it("does not unlock decade_of_danger when no career reached season 10", () => {
    const museum = [{ teamName: "Rovers", seasonNumber: 4, clubHistory: {} }];
    expect(checkMuseumAchievements(museum, new Set())).not.toContain("decade_of_danger");
  });

  it("unlocks died_as_they_lived when the final archived season won the title", () => {
    const museum = [{
      teamName: "Rovers", seasonNumber: 5,
      clubHistory: { seasonArchive: [{ season: 3, tier: 9, position: 4 }, { season: 4, tier: 9, position: 1 }] },
    }];
    expect(checkMuseumAchievements(museum, new Set())).toContain("died_as_they_lived");
  });

  it("does not unlock died_as_they_lived when the final archived season wasn't a title", () => {
    const museum = [{
      teamName: "Rovers", seasonNumber: 5,
      clubHistory: { seasonArchive: [{ season: 3, tier: 9, position: 1 }, { season: 4, tier: 9, position: 3 }] },
    }];
    expect(checkMuseumAchievements(museum, new Set())).not.toContain("died_as_they_lived");
  });

  it("respects already-unlocked state per achievement", () => {
    const museum = [{ teamName: "Rovers", seasonNumber: 11, clubHistory: {} }];
    const result = checkMuseumAchievements(museum, new Set(["ashes_to_ashes", "decade_of_danger"]));
    expect(result).not.toContain("ashes_to_ashes");
    expect(result).not.toContain("decade_of_danger");
  });
});
