import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS, LEGENDARY_ACHIEVEMENTS, PLAYER_UNLOCK_ACHIEVEMENTS } from "../achievements.js";

const achievementIds = new Set(ACHIEVEMENTS.map((a) => a.id));

describe("achievement id membership", () => {
  it("has exactly 325 achievements with unique ids", () => {
    expect(ACHIEVEMENTS.length).toBe(325);
    expect(achievementIds.size).toBe(325);
  });

  it("every LEGENDARY_ACHIEVEMENTS id exists in ACHIEVEMENTS", () => {
    for (const id of LEGENDARY_ACHIEVEMENTS) {
      expect(achievementIds.has(id), `LEGENDARY_ACHIEVEMENTS has unknown id: ${id}`).toBe(true);
    }
  });

  it("every PLAYER_UNLOCK_ACHIEVEMENTS id exists in ACHIEVEMENTS", () => {
    for (const id of PLAYER_UNLOCK_ACHIEVEMENTS) {
      expect(achievementIds.has(id), `PLAYER_UNLOCK_ACHIEVEMENTS has unknown id: ${id}`).toBe(true);
    }
  });
});
