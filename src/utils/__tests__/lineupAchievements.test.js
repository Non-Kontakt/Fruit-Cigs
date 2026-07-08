import { describe, it, expect } from "vitest";
import { collectLineupAchievements, getFavouriteStartsIncrement } from "../achievements.js";
import { getPriorPlayedResult } from "../league.js";
import { STARTING_XI_POSITIONS } from "../../data/positions.js";

// Physalis Cigs — post-match Starting XI/bench composition checks, plus the
// pure helpers behind The Favourite's counter and Keep The Faith's
// prior-match lookup.

function makePlayer(id, overrides = {}) {
  return {
    id, name: `Player ${id}`, position: "CM", age: 25, nationality: "ENG",
    attrs: { pace: 10, shooting: 10, passing: 10, defending: 10, physical: 10, technique: 10, mental: 10 },
    training: "balanced",
    ...overrides,
  };
}

function makeXISquad(overridesByIndex = {}) {
  return STARTING_XI_POSITIONS.map((pos, i) => makePlayer(`p${i}`, { position: pos, ...(overridesByIndex[i] || {}) }));
}

describe("collectLineupAchievements — United Nations / Foreign Legion (nationality sweeps)", () => {
  it("unlocks united_nations with 11 distinct nationalities", () => {
    const nats = ["ENG", "BRA", "ARG", "FRA", "GER", "ESP", "ITA", "NED", "POR", "JPN", "CIV"];
    const squad = makeXISquad(Object.fromEntries(nats.map((n, i) => [i, { nationality: n }])));
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).toContain("united_nations");
  });

  it("does NOT unlock united_nations when two starters share a nationality", () => {
    const nats = ["ENG", "BRA", "ARG", "FRA", "GER", "ESP", "ITA", "NED", "POR", "JPN", "BRA"];
    const squad = makeXISquad(Object.fromEntries(nats.map((n, i) => [i, { nationality: n }])));
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).not.toContain("united_nations");
  });

  it("unlocks foreign_legion when all 11 share one non-English nationality", () => {
    const squad = makeXISquad(Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i, { nationality: "BRA" }])));
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).toContain("foreign_legion");
  });

  it("does NOT unlock foreign_legion when the shared nationality is England", () => {
    const squad = makeXISquad(); // all default to ENG
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).not.toContain("foreign_legion");
  });

  it("does NOT unlock foreign_legion when nationalities are mixed", () => {
    const squad = makeXISquad({ 0: { nationality: "BRA" } }); // rest default ENG
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).not.toContain("foreign_legion");
  });

  it("respects already-unlocked state for both", () => {
    const squad = makeXISquad(Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i, { nationality: "BRA" }])));
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set(["foreign_legion", "united_nations"]) });
    expect(result).not.toContain("foreign_legion");
    expect(result).not.toContain("united_nations");
  });
});

describe("collectLineupAchievements — Class Of '92 (homegrown XI)", () => {
  it("unlocks when every starter is a youth intake or youth coup player", () => {
    const squad = makeXISquad(Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i, { isYouthIntake: i % 2 === 0, isYouthCoup: i % 2 === 1 }])));
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).toContain("class_of_92");
  });

  it("does NOT unlock when one starter is neither youth intake nor youth coup", () => {
    const squad = makeXISquad(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i, { isYouthIntake: true }])));
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).not.toContain("class_of_92");
  });
});

describe("collectLineupAchievements — Year Group (same-age XI)", () => {
  it("unlocks when every starter is the same age", () => {
    const squad = makeXISquad(Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i, { age: 23 }])));
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).toContain("year_group");
  });

  it("does NOT unlock when one starter's age differs", () => {
    const squad = makeXISquad({ 0: { age: 30 } }); // rest default 25
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).not.toContain("year_group");
  });
});

describe("collectLineupAchievements — The Kids Are Alright (teen bench)", () => {
  const squad = makeXISquad();
  const startingXI = squad.map(p => p.id);
  const teens = [
    makePlayer("b1", { age: 17 }), makePlayer("b2", { age: 18 }), makePlayer("b3", { age: 19 }),
    makePlayer("b4", { age: 16 }), makePlayer("b5", { age: 19 }),
  ];
  const fullSquad = [...squad, ...teens];

  it("unlocks with a full 5-player bench, all teenagers", () => {
    const bench = teens.map(p => p.id);
    const result = collectLineupAchievements({ squad: fullSquad, startingXI, bench, unlocked: new Set() });
    expect(result).toContain("kids_are_alright");
  });

  it("does NOT unlock with an empty bench (vacuous every() guard)", () => {
    const result = collectLineupAchievements({ squad: fullSquad, startingXI, bench: [], unlocked: new Set() });
    expect(result).not.toContain("kids_are_alright");
  });

  it("does NOT unlock with a short bench (4 of 5 filled)", () => {
    const bench = teens.slice(0, 4).map(p => p.id);
    const result = collectLineupAchievements({ squad: fullSquad, startingXI, bench, unlocked: new Set() });
    expect(result).not.toContain("kids_are_alright");
  });

  it("does NOT unlock when one bench player isn't a teenager", () => {
    const nonTeenBench = [...teens.slice(0, 4), makePlayer("b6", { age: 20 })];
    const withNonTeen = [...squad, ...nonTeenBench];
    const bench = nonTeenBench.map(p => p.id);
    const result = collectLineupAchievements({ squad: withNonTeen, startingXI, bench, unlocked: new Set() });
    expect(result).not.toContain("kids_are_alright");
  });
});

describe("collectLineupAchievements — Backbone (homegrown spine)", () => {
  it("unlocks when homegrown players cover GK, DEF, MID, and FWD at once", () => {
    const squad = makeXISquad({
      0: { isYouthIntake: true },              // GK
      1: { isYouthIntake: true },              // CB (DEF)
      5: { isYouthCoup: true },                // CM (MID)
      10: { isYouthIntake: true },             // ST (FWD)
    });
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).toContain("backbone");
  });

  it("does NOT unlock when one group has no homegrown representative", () => {
    const squad = makeXISquad({
      1: { isYouthIntake: true },              // CB (DEF)
      5: { isYouthCoup: true },                // CM (MID)
      10: { isYouthIntake: true },             // ST (FWD)
      // no homegrown GK
    });
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).not.toContain("backbone");
  });

  it("does NOT unlock with no homegrown players at all", () => {
    const squad = makeXISquad();
    const startingXI = squad.map(p => p.id);
    const result = collectLineupAchievements({ squad, startingXI, bench: [], unlocked: new Set() });
    expect(result).not.toContain("backbone");
  });
});

describe("collectLineupAchievements — Keep The Faith (margin + unchanged XI)", () => {
  const squad = makeXISquad();
  const startingXI = squad.map(p => p.id);

  it("unlocks when the XI is unchanged right after losing the prior match by 5+", () => {
    const prevResult = { playerGoals: 0, oppGoals: 5, won: false, draw: false };
    const result = collectLineupAchievements({
      squad, startingXI, bench: [], prevStartingXI: [...startingXI], prevResult, unlocked: new Set(),
    });
    expect(result).toContain("keep_the_faith");
  });

  it("does NOT unlock when the prior loss margin is only 4", () => {
    const prevResult = { playerGoals: 0, oppGoals: 4, won: false, draw: false };
    const result = collectLineupAchievements({
      squad, startingXI, bench: [], prevStartingXI: [...startingXI], prevResult, unlocked: new Set(),
    });
    expect(result).not.toContain("keep_the_faith");
  });

  it("does NOT unlock when the XI changed from the prior match", () => {
    const prevResult = { playerGoals: 0, oppGoals: 5, won: false, draw: false };
    const changedPrevXI = [...startingXI.slice(0, 10), "someone-else"];
    const result = collectLineupAchievements({
      squad, startingXI, bench: [], prevStartingXI: changedPrevXI, prevResult, unlocked: new Set(),
    });
    expect(result).not.toContain("keep_the_faith");
  });

  it("does NOT unlock when there's no prior result (first match of a save)", () => {
    const result = collectLineupAchievements({
      squad, startingXI, bench: [], prevStartingXI: null, prevResult: null, unlocked: new Set(),
    });
    expect(result).not.toContain("keep_the_faith");
  });

  it("respects already-unlocked state", () => {
    const prevResult = { playerGoals: 0, oppGoals: 5, won: false, draw: false };
    const result = collectLineupAchievements({
      squad, startingXI, bench: [], prevStartingXI: [...startingXI], prevResult,
      unlocked: new Set(["keep_the_faith"]),
    });
    expect(result).not.toContain("keep_the_faith");
  });
});

describe("getFavouriteStartsIncrement — The Favourite's per-season counter", () => {
  const low = makePlayer("low", { position: "ST", attrs: { pace: 5, shooting: 5, passing: 5, defending: 5, physical: 5, technique: 5, mental: 5 } });
  const high = makePlayer("high", { position: "ST", attrs: { pace: 18, shooting: 18, passing: 18, defending: 18, physical: 18, technique: 18, mental: 18 } });
  const gk = makePlayer("gk", { position: "GK", attrs: { pace: 1, shooting: 1, passing: 1, defending: 1, physical: 1, technique: 1, mental: 1 } });
  const squad = [low, high, gk];

  it("bumps the lowest-OVR outfielder when they start", () => {
    const next = getFavouriteStartsIncrement(squad, ["low", "high"], {});
    expect(next.low).toBe(1);
    expect(next.high).toBeUndefined();
  });

  it("never counts the GK, even though the GK has the lowest raw attributes", () => {
    const next = getFavouriteStartsIncrement(squad, ["gk", "high"], {});
    expect(next.gk).toBeUndefined();
  });

  it("does not increment when the current lowest outfielder didn't start", () => {
    const prev = { low: 3 };
    const next = getFavouriteStartsIncrement(squad, ["high"], prev);
    expect(next).toBe(prev); // same reference — no-op
  });

  it("counts every tied player when multiple outfielders share the lowest OVR", () => {
    const low2 = makePlayer("low2", { position: "ST", attrs: { pace: 5, shooting: 5, passing: 5, defending: 5, physical: 5, technique: 5, mental: 5 } });
    const tiedSquad = [low, low2, high];
    const next = getFavouriteStartsIncrement(tiedSquad, ["low", "low2", "high"], {});
    expect(next.low).toBe(1);
    expect(next.low2).toBe(1);
    expect(next.high).toBeUndefined();
  });

  it("accumulates across repeated calls, reaching the 10-start threshold", () => {
    let starts = {};
    for (let i = 0; i < 10; i++) {
      starts = getFavouriteStartsIncrement(squad, ["low", "high"], starts);
    }
    expect(starts.low).toBe(10);
  });

  it("handles a missing squad/startingXI without throwing", () => {
    expect(getFavouriteStartsIncrement(null, ["low"], { a: 1 })).toEqual({ a: 1 });
    expect(getFavouriteStartsIncrement(squad, null, { a: 1 })).toEqual({ a: 1 });
  });
});

describe("getPriorPlayedResult — the prior *played* match, skipping spectator entries", () => {
  it("returns null with no entries", () => {
    expect(getPriorPlayedResult({})).toBe(null);
    expect(getPriorPlayedResult(null)).toBe(null);
  });

  it("returns the highest-indexed played entry", () => {
    const calendarResults = {
      0: { playerGoals: 2, oppGoals: 0, won: true, draw: false },
      1: { playerGoals: 0, oppGoals: 5, won: false, draw: false },
    };
    expect(getPriorPlayedResult(calendarResults)).toEqual({ playerGoals: 0, oppGoals: 5, won: false, draw: false });
  });

  it("skips spectator entries to find the most recent actual match", () => {
    const calendarResults = {
      0: { playerGoals: 1, oppGoals: 1, won: false, draw: true },
      1: { playerGoals: 0, oppGoals: 5, won: false, draw: false },
      2: { spectator: true, label: "Dynasty Cup Semi-Finals" },
    };
    expect(getPriorPlayedResult(calendarResults)).toEqual({ playerGoals: 0, oppGoals: 5, won: false, draw: false });
  });
});
