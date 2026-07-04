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

// The message boundary must tolerate player objects with no backstory
// (legacy saves, tests, future generators) without leaking "undefined"
// into inbox copy.
describe("free-agent message backstory boundary", () => {
  it("omits the backstory sentence cleanly when the player has none", async () => {
    const { MSG } = await import("../../data/messages.js");
    const bare = { name: "Test Player", age: 25, position: "CM" };
    for (const factory of [MSG.transferInsider, MSG.saudiAgent]) {
      const body = factory(bare, 14).body;
      expect(body).not.toContain("undefined");
      expect(body).not.toContain("  "); // no double space where the sentence was
    }
  });

  it("includes the backstory as its own sentence when present", async () => {
    const { MSG } = await import("../../data/messages.js");
    const storied = { name: "Test Player", age: 25, position: "CM", backstory: "Released after a contract dispute." };
    for (const factory of [MSG.transferInsider, MSG.saudiAgent]) {
      expect(factory(storied, 14).body).toContain("Released after a contract dispute. ");
    }
  });
});
