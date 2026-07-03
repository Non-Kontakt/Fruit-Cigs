import { describe, it, expect } from "vitest";
import { uniqueGenerate, generateSquad, generateAITeam, generateFreeAgent } from "../player.js";
import { getOverall } from "../calc.js";

describe("uniqueGenerate", () => {
  it("never returns a name already in usedNames, even when the generator keeps repeating it", () => {
    const usedNames = new Set(["Grape Cig"]);
    const generatorFn = () => ({ name: "Grape Cig", position: "ST" });
    const result = uniqueGenerate(generatorFn, usedNames);
    expect(result.name).not.toBe("Grape Cig");
    expect(usedNames.has(result.name)).toBe(true);
  });

  it("disambiguates repeatedly without ever colliding", () => {
    const usedNames = new Set();
    const generatorFn = () => ({ name: "Same Name" });
    // Force every generation to collide by pre-seeding usedNames each round
    for (let i = 0; i < 15; i++) {
      const result = uniqueGenerate(generatorFn, usedNames);
      expect(usedNames.has(result.name)).toBe(true);
    }
    // Every returned name across the loop must be distinct
    expect(usedNames.size).toBe(15);
  });
});

describe("generateSquad — no duplicate names", () => {
  it("produces a squad with every player name unique", () => {
    for (let trial = 0; trial < 10; trial++) {
      const squad = generateSquad(20);
      const names = squad.map(p => p.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("generateAITeam — no duplicate names", () => {
  it("produces a squad with every player name unique, even in a name-poor nation pool (tier 1, ALN-heavy)", () => {
    for (let trial = 0; trial < 10; trial++) {
      const team = generateAITeam("Nebula FC", "#c084fc", 0.95, "dominant", 1, 5, 0, null);
      const names = team.squad.map(p => p.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("generateFreeAgent — dedupes against a supplied squad", () => {
  it("never returns a name already in usedNames", () => {
    const originalNames = new Set([
      "Grape Cig", "Onion Cig", "Pepper Cig", "Chilli Cig", "Basil Cig",
      "Sage Cig", "Thyme Cig", "Mint Cig", "Clove Cig", "Cumin Cig",
    ]);
    // uniqueGenerate adds its result to the set it's given, so pass a copy
    // and assert against the untouched original.
    const agent = generateFreeAgent(5, 10, 20, new Set(originalNames));
    expect(originalNames.has(agent.name)).toBe(false);
  });
});

describe("generateFreeAgent — respects the ovrCap argument", () => {
  it("never produces an OVR or potential above ovrCap, at low and high caps", () => {
    for (const ovrCap of [20, 68]) {
      for (let trial = 0; trial < 50; trial++) {
        const usedNames = new Set();
        const agent = generateFreeAgent(5, Math.round(ovrCap * 0.6), ovrCap, usedNames);
        expect(getOverall(agent)).toBeLessThanOrEqual(ovrCap);
        expect(agent.potential).toBeLessThanOrEqual(ovrCap);
      }
    }
  });
});
