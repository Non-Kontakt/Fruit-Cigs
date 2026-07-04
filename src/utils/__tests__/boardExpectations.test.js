import { describe, it, expect } from "vitest";
import { getBoardExpectation } from "../boardExpectations.js";
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
