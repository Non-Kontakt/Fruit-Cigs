import { describe, it, expect } from "vitest";
import { getFreeAgentBackstory } from "../backstory.js";

describe("getFreeAgentBackstory", () => {
  it("returns a non-empty string for the young band (age <= 23)", () => {
    for (let i = 0; i < 20; i++) {
      const line = getFreeAgentBackstory(22, "ST");
      expect(typeof line).toBe("string");
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it("returns a non-empty string for the prime band (24-26)", () => {
    for (let i = 0; i < 20; i++) {
      const line = getFreeAgentBackstory(25, "CM");
      expect(typeof line).toBe("string");
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it("returns a non-empty string for the veteran band (age >= 27)", () => {
    for (let i = 0; i < 20; i++) {
      const line = getFreeAgentBackstory(28, "CB");
      expect(typeof line).toBe("string");
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it("draws from different pools across age bands", () => {
    const youngLines = new Set(Array.from({ length: 40 }, () => getFreeAgentBackstory(22, "ST")));
    const primeLines = new Set(Array.from({ length: 40 }, () => getFreeAgentBackstory(25, "ST")));
    const veteranLines = new Set(Array.from({ length: 40 }, () => getFreeAgentBackstory(28, "ST")));

    // No overlap between the three bands' pools.
    for (const line of youngLines) {
      expect(primeLines.has(line)).toBe(false);
      expect(veteranLines.has(line)).toBe(false);
    }
    for (const line of primeLines) {
      expect(veteranLines.has(line)).toBe(false);
    }
  });

  it("falls back gracefully for an unknown position", () => {
    const line = getFreeAgentBackstory(25, "UNKNOWN");
    expect(typeof line).toBe("string");
    expect(line.length).toBeGreaterThan(0);
  });
});
