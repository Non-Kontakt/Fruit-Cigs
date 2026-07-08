import { describe, it, expect } from "vitest";
import { collectBreakoutAchievements } from "../achievements.js";

// Gooseberry Cigs — breakout-moment cig cards. `breakoutsThisSeason` is
// always the season ledger as it stood BEFORE `breakoutResults` are applied
// (matching checkBreakouts' own inputs, see src/utils/breakouts.js) — the
// function folds them together internally for season-aggregate checks.

function makePlayer(id, overrides = {}) {
  return {
    id, name: `Player ${id}`, position: "CM", age: 24, potential: 16,
    attrs: { pace: 10, shooting: 10, passing: 10, defending: 10, physical: 10, technique: 10, mental: 10 },
    ...overrides,
  };
}

function makeBreakout(playerId, overrides = {}) {
  return {
    playerId, playerName: `Player ${playerId}`, playerPosition: "CM", logIndex: 10,
    trigger: { id: "clean_sheet_run", label: "Clean Sheet Run", narrative: "..." },
    attrGains: { defending: 1 },
    potentialGain: 0,
    ...overrides,
  };
}

const baseInput = (extras = {}) => ({
  breakoutResults: [], squad: [], breakoutsThisSeason: new Map(),
  playerMatchLog: {}, ovrCap: 20, isCup: false, unlocked: new Set(),
  ...extras,
});

describe("collectBreakoutAchievements — empty/no-op safety", () => {
  it("returns [] with no breakout results", () => {
    expect(collectBreakoutAchievements(baseInput())).toEqual([]);
  });

  it("returns [] and never throws with null/undefined optional fields", () => {
    const result = collectBreakoutAchievements({
      breakoutResults: [makeBreakout("p1")], squad: null, breakoutsThisSeason: null,
      playerMatchLog: null, ovrCap: 20, isCup: false, unlocked: new Set(),
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("scenes — first breakout moment", () => {
  it("unlocks on any breakout result", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1")],
      squad: [makePlayer("p1")],
    }));
    expect(result).toContain("scenes");
  });

  it("respects already-unlocked state", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1")],
      squad: [makePlayer("p1")],
      unlocked: new Set(["scenes"]),
    }));
    expect(result).not.toContain("scenes");
  });
});

describe("purple_patch — same player, two breakouts in a season", () => {
  it("unlocks when the ledger already has one trigger and this match adds a second", () => {
    const breakoutsThisSeason = new Map([["p1", { triggers: new Set(["hat_trick_run"]), lastLogIndex: 3 }]]);
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1", { trigger: { id: "clean_sheet_run", label: "x", narrative: "" } })],
      squad: [makePlayer("p1")],
      breakoutsThisSeason,
    }));
    expect(result).toContain("purple_patch");
  });

  it("does NOT unlock on a player's first breakout of the season", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1")],
      squad: [makePlayer("p1")],
    }));
    expect(result).not.toContain("purple_patch");
  });

  it("supports the legacy Set-only breakoutsThisSeason format", () => {
    const breakoutsThisSeason = new Map([["p1", new Set(["hat_trick_run"])]]);
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1", { trigger: { id: "clean_sheet_run", label: "x", narrative: "" } })],
      squad: [makePlayer("p1")],
      breakoutsThisSeason,
    }));
    expect(result).toContain("purple_patch");
  });
});

describe("made_for_occasion — cup tie breakout", () => {
  it("unlocks when isCup is true", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1")], squad: [makePlayer("p1")], isCup: true,
    }));
    expect(result).toContain("made_for_occasion");
  });

  it("does NOT unlock in a league match", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1")], squad: [makePlayer("p1")], isCup: false,
    }));
    expect(result).not.toContain("made_for_occasion");
  });
});

describe("vintage_performance — 30+ breaks out", () => {
  it("unlocks for a 30+ year old", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1")], squad: [makePlayer("p1", { age: 31 })],
    }));
    expect(result).toContain("vintage_performance");
  });

  it("does NOT unlock under 30", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1")], squad: [makePlayer("p1", { age: 29 })],
    }));
    expect(result).not.toContain("vintage_performance");
  });
});

describe("fast_learner — breakout within first 5 appearances", () => {
  it("unlocks when the player's match log is 5 or fewer entries", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1")], squad: [makePlayer("p1")],
      playerMatchLog: { p1: [1, 2, 3, 4, 5] },
    }));
    expect(result).toContain("fast_learner");
  });

  it("does NOT unlock past the first 5 appearances", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1")], squad: [makePlayer("p1")],
      playerMatchLog: { p1: [1, 2, 3, 4, 5, 6] },
    }));
    expect(result).not.toContain("fast_learner");
  });
});

describe("raising_ceiling — breakout pushes potential to the cap", () => {
  it("unlocks when the post-gain potential reaches the cap", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1", { potentialGain: 1 })],
      squad: [makePlayer("p1", { potential: 19 })],
      ovrCap: 20,
    }));
    expect(result).toContain("raising_ceiling");
  });

  it("does NOT unlock when the gain doesn't reach the cap", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1", { potentialGain: 1 })],
      squad: [makePlayer("p1", { potential: 10 })],
      ovrCap: 20,
    }));
    expect(result).not.toContain("raising_ceiling");
  });

  it("does NOT unlock when potentialGain is 0, even if already at the cap", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1", { potentialGain: 0 })],
      squad: [makePlayer("p1", { potential: 20 })],
      ovrCap: 20,
    }));
    expect(result).not.toContain("raising_ceiling");
  });
});

describe("wonderwall — goalkeeper breaks out", () => {
  it("unlocks for a GK breakout", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1", { playerPosition: "GK" })],
      squad: [makePlayer("p1", { position: "GK" })],
    }));
    expect(result).toContain("wonderwall");
  });

  it("does NOT unlock for an outfield breakout", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1", { playerPosition: "ST" })],
      squad: [makePlayer("p1", { position: "ST" })],
    }));
    expect(result).not.toContain("wonderwall");
  });
});

describe("never_saw_him_coming — single-digit potential breaks out", () => {
  it("unlocks when potential BEFORE the gain is single-digit", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1", { potentialGain: 1 })],
      squad: [makePlayer("p1", { potential: 9 })],
    }));
    expect(result).toContain("never_saw_him_coming");
  });

  it("does NOT unlock at double-digit potential", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p1")],
      squad: [makePlayer("p1", { potential: 10 })],
    }));
    expect(result).not.toContain("never_saw_him_coming");
  });
});

describe("everyones_invited — all 4 position groups break out in a season", () => {
  it("unlocks when the season ledger + this match's events cover FWD/MID/DEF/GK", () => {
    const squad = [
      makePlayer("gk", { position: "GK" }),
      makePlayer("def", { position: "CB" }),
      makePlayer("mid", { position: "CM" }),
      makePlayer("fwd", { position: "ST" }),
    ];
    const breakoutsThisSeason = new Map([
      ["gk", { triggers: new Set(["t1"]), lastLogIndex: 1 }],
      ["def", { triggers: new Set(["t1"]), lastLogIndex: 1 }],
      ["mid", { triggers: new Set(["t1"]), lastLogIndex: 1 }],
    ]);
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("fwd", { playerPosition: "ST" })],
      squad, breakoutsThisSeason,
    }));
    expect(result).toContain("everyones_invited");
  });

  it("does NOT unlock when a position group is missing", () => {
    const squad = [
      makePlayer("def", { position: "CB" }),
      makePlayer("mid", { position: "CM" }),
      makePlayer("fwd", { position: "ST" }),
    ];
    const breakoutsThisSeason = new Map([
      ["def", { triggers: new Set(["t1"]), lastLogIndex: 1 }],
      ["mid", { triggers: new Set(["t1"]), lastLogIndex: 1 }],
    ]);
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("fwd", { playerPosition: "ST" })],
      squad, breakoutsThisSeason,
    }));
    expect(result).not.toContain("everyones_invited");
  });
});

describe("production_line — 5+ breakout moments across the squad in a season", () => {
  it("unlocks once the season total (existing + incoming) reaches 5", () => {
    const breakoutsThisSeason = new Map([
      ["p1", { triggers: new Set(["a", "b"]), lastLogIndex: 1 }],
      ["p2", { triggers: new Set(["a"]), lastLogIndex: 1 }],
      ["p3", { triggers: new Set(["a"]), lastLogIndex: 1 }],
    ]);
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p4")],
      squad: [makePlayer("p1"), makePlayer("p2"), makePlayer("p3"), makePlayer("p4")],
      breakoutsThisSeason,
    }));
    expect(result).toContain("production_line");
  });

  it("does NOT unlock below 5", () => {
    const breakoutsThisSeason = new Map([["p1", { triggers: new Set(["a"]), lastLogIndex: 1 }]]);
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [makeBreakout("p2")],
      squad: [makePlayer("p1"), makePlayer("p2")],
      breakoutsThisSeason,
    }));
    expect(result).not.toContain("production_line");
  });
});

describe("dedupe and multiple simultaneous breakouts", () => {
  it("returns each id at most once even when multiple players qualify for the same card", () => {
    const result = collectBreakoutAchievements(baseInput({
      breakoutResults: [
        makeBreakout("p1", { playerPosition: "GK" }),
        makeBreakout("p2", { playerPosition: "GK" }),
      ],
      squad: [makePlayer("p1", { position: "GK" }), makePlayer("p2", { position: "GK" })],
    }));
    expect(result.filter(id => id === "wonderwall").length).toBe(1);
    expect(result.filter(id => id === "scenes").length).toBe(1);
  });
});
