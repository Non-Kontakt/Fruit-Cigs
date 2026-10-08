import { describe, it, expect } from "vitest";
import { getBoardExpectation, getCupUltimatumOutcome } from "../boardExpectations.js";
import { NUM_TIERS } from "../../data/leagues.js";

describe("getBoardExpectation", () => {
  it("returns a demand and line for every tier 1..NUM_TIERS, no gaps", () => {
    for (let tier = 1; tier <= NUM_TIERS; tier++) {
      const exp = getBoardExpectation(tier);
      expect(exp).toBeTruthy();
      expect(typeof exp.demand).toBe("string");
      expect(exp.demand.length).toBeGreaterThan(0);
      expect(typeof exp.line).toBe("string");
      expect(exp.line.length).toBeGreaterThan(0);
    }
  });

  it("title challenge is demanded at the very top", () => {
    expect(getBoardExpectation(1).demand).toBe("a title challenge");
  });

  it("bottom tier only asks for survival", () => {
    expect(getBoardExpectation(NUM_TIERS).line).toBe("Survive and build for the future.");
  });
});

describe("cup ultimatum lifecycle", () => {
  const pending = { pending: true, gameMode: "ironman", isFinal: false, playerWon: true, playerEliminated: false };
  it("retains the lifeline through every intermediate win", () => {
    for (let round = 0; round < 4; round++) expect(getCupUltimatumOutcome(pending)).toBeNull();
  });
  it("settles only on winning the final or being eliminated", () => {
    expect(getCupUltimatumOutcome({ ...pending, isFinal: true })).toBe("reprieve");
    expect(getCupUltimatumOutcome({ ...pending, playerWon: false, playerEliminated: true })).toBe("sack");
  });
  it("does not invent a pending ultimatum in other careers", () => {
    expect(getCupUltimatumOutcome({ ...pending, isFinal: true, pending: false })).toBeNull();
    expect(getCupUltimatumOutcome({ ...pending, isFinal: true, gameMode: "casual" })).toBeNull();
  });
});
