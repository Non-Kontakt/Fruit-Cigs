import { describe, it, expect } from "vitest";
import { getModifier, LEAGUE_MODIFIERS } from "../leagueModifiers.js";
import { LEAGUE_DEFS } from "../leagues.js";

describe("Tier 1 (Intergalactic Elite) — softened wall", () => {
  it("no longer exposes a prediction-steal mechanic", () => {
    expect(getModifier(1).prediction).toBeFalsy();
    expect(LEAGUE_MODIFIERS[1]).not.toHaveProperty("prediction");
  });

  it("keeps the draw-point asymmetry (that part was NOT removed)", () => {
    const mod = getModifier(1);
    expect(mod.drawPointsPlayer).toBe(1);
    expect(mod.drawPointsAI).toBe(2);
  });

  it("generates AI teams over a wider 17-19 OVR range, not the old 18-20", () => {
    expect(LEAGUE_DEFS[1].ovrMin).toBe(17);
    expect(LEAGUE_DEFS[1].ovrMax).toBe(19);
  });

  it("no other tier's prediction-free modifier set was touched incidentally", () => {
    // Sanity: tier 3's knockoutAtEnd and tier 2's miniTournament are untouched by this change.
    expect(getModifier(3).knockoutAtEnd).toBe(true);
    expect(getModifier(2).miniTournament).toBe(true);
  });
});
