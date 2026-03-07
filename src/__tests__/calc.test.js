import { describe, it, expect } from "vitest";
import { getOverall, getOvrProgress, getOOPPenalty, getPositionTrainingWeeks } from "../utils/calc.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const attrs = (val) => ({
  pace: val, shooting: val, passing: val,
  defending: val, physical: val, technique: val, mental: val,
});

const player = (position, attrVal = 10) => ({
  position,
  attrs: attrs(attrVal),
});

// ─── getOverall ───────────────────────────────────────────────────────────────

describe("getOverall", () => {
  it("returns 0 for null player", () => {
    expect(getOverall(null)).toBe(0);
    expect(getOverall({})).toBe(0);
    expect(getOverall({ attrs: null })).toBe(0);
  });

  it("returns the attr value when all attrs are equal (any position)", () => {
    // When all 7 attrs are the same value, weighted average = that value regardless of weights
    for (const pos of ["GK", "CB", "LB", "RB", "CM", "AM", "LW", "RW", "ST"]) {
      expect(getOverall(player(pos, 10))).toBe(10);
      expect(getOverall(player(pos, 5))).toBe(5);
      expect(getOverall(player(pos, 20))).toBe(20);
    }
  });

  it("GK shooting weight is 0 — boosting shooting does not increase GK OVR", () => {
    const baseGK = { position: "GK", attrs: { pace: 10, shooting: 1, passing: 10, defending: 10, physical: 10, technique: 10, mental: 10 } };
    const highShoGK = { position: "GK", attrs: { pace: 10, shooting: 20, passing: 10, defending: 10, physical: 10, technique: 10, mental: 10 } };
    expect(getOverall(baseGK)).toBe(getOverall(highShoGK));
  });

  it("OVR weights sum to 1.00 for every position — verified via uniform attrs", () => {
    // If weights sum to exactly 1.00, a player with all attrs=10 must return exactly 10
    for (const pos of ["GK", "CB", "LB", "RB", "CM", "AM", "LW", "RW", "ST"]) {
      expect(getOverall(player(pos, 10))).toBe(10);
      expect(getOverall(player(pos, 15))).toBe(15);
    }
  });

  it("position weighting differentiates players with same total attr sum", () => {
    // A GK with high DEF/PHY/MEN and low SHO should outscore the inverse
    const strongGK = { position: "GK", attrs: { pace: 8, shooting: 2, passing: 10, defending: 18, physical: 16, technique: 8, mental: 18 } };
    const weakGK   = { position: "GK", attrs: { pace: 8, shooting: 18, passing: 10, defending: 2, physical: 4, technique: 8, mental: 2 } };
    expect(getOverall(strongGK)).toBeGreaterThan(getOverall(weakGK));

    // A ST with high SHO should outscore a ST with high DEF
    const clinicalST = { position: "ST", attrs: { pace: 14, shooting: 18, passing: 8, defending: 2, physical: 14, technique: 14, mental: 10 } };
    const defendingST = { position: "ST", attrs: { pace: 14, shooting: 2, passing: 8, defending: 18, physical: 14, technique: 14, mental: 10 } };
    expect(getOverall(clinicalST)).toBeGreaterThan(getOverall(defendingST));
  });

  it("falls back to plain mean for unknown position", () => {
    const p = { position: "UNKNOWN", attrs: attrs(10) };
    expect(getOverall(p)).toBe(10);
  });

  it("OVR stays within 0–20 range for extreme attr values", () => {
    for (const pos of ["GK", "ST", "CM"]) {
      expect(getOverall(player(pos, 0))).toBeGreaterThanOrEqual(0);
      expect(getOverall(player(pos, 20))).toBeLessThanOrEqual(20);
    }
  });
});

// ─── getOvrProgress ───────────────────────────────────────────────────────────

describe("getOvrProgress", () => {
  it("returns 0 for null player", () => {
    expect(getOvrProgress(null)).toBe(0);
  });

  it("returns a value in [0, 1]", () => {
    for (const pos of ["GK", "CB", "ST"]) {
      const p = getOvrProgress(player(pos, 10));
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("returns 0.5 when raw weighted avg is exactly on an integer (uniform attrs)", () => {
    // Uniform attrs=10 → rawAvg=10.0 exactly → progress = 10.0 - round(10.0) + 0.5 = 0.5
    for (const pos of ["GK", "CB", "LB", "RB", "CM", "AM", "LW", "RW", "ST"]) {
      expect(getOvrProgress(player(pos, 10))).toBeCloseTo(0.5, 5);
    }
  });
});

// ─── getOOPPenalty ────────────────────────────────────────────────────────────

describe("getOOPPenalty", () => {
  it("returns 1.0 for same position", () => {
    expect(getOOPPenalty("CM", "CM", [])).toBe(1.0);
    expect(getOOPPenalty("GK", "GK", [])).toBe(1.0);
  });

  it("returns 1.0 for a learned position", () => {
    expect(getOOPPenalty("CM", "ST", ["ST", "LW"])).toBe(1.0);
  });

  it("returns 1.0 for null/undefined inputs", () => {
    expect(getOOPPenalty(null, "CM", [])).toBe(1.0);
    expect(getOOPPenalty("CM", null, [])).toBe(1.0);
  });

  it("outfield player in goal (GK_TO_OUTFIELD) → 0.55", () => {
    expect(getOOPPenalty("ST", "GK", [])).toBe(0.55);
    expect(getOOPPenalty("CB", "GK", [])).toBe(0.55);
  });

  it("GK playing outfield (OUTFIELD_TO_GK) → 0.60", () => {
    expect(getOOPPenalty("GK", "ST", [])).toBe(0.60);
    expect(getOOPPenalty("GK", "CM", [])).toBe(0.60);
  });

  it("same position group (e.g. LB→RB, CM→AM) → 0.92", () => {
    expect(getOOPPenalty("LB", "RB", [])).toBe(0.92);
    expect(getOOPPenalty("CM", "AM", [])).toBe(0.92);
    expect(getOOPPenalty("LW", "RW", [])).toBe(0.92);
    expect(getOOPPenalty("LW", "ST", [])).toBe(0.92);
  });

  it("adjacent position group (e.g. CB→CM, CM→ST) → 0.80", () => {
    // CB=group1, CM=group2 → dist 1
    expect(getOOPPenalty("CB", "CM", [])).toBe(0.80);
    // CM=group2, ST=group3 → dist 1
    expect(getOOPPenalty("CM", "ST", [])).toBe(0.80);
  });

  it("distant position group (e.g. CB→ST) → 0.65", () => {
    // CB=group1, ST=group3 → dist 2
    expect(getOOPPenalty("CB", "ST", [])).toBe(0.65);
    expect(getOOPPenalty("CB", "LW", [])).toBe(0.65);
  });
});

// ─── getPositionTrainingWeeks ─────────────────────────────────────────────────

describe("getPositionTrainingWeeks", () => {
  it("returns 0 for same position or null inputs", () => {
    expect(getPositionTrainingWeeks("CM", "CM")).toBe(0);
    expect(getPositionTrainingWeeks(null, "CM")).toBe(0);
    expect(getPositionTrainingWeeks("CM", null)).toBe(0);
  });

  it("outfield → GK takes 24 weeks", () => {
    expect(getPositionTrainingWeeks("ST", "GK")).toBe(24);
    expect(getPositionTrainingWeeks("CB", "GK")).toBe(24);
  });

  it("GK → outfield takes 22 weeks", () => {
    expect(getPositionTrainingWeeks("GK", "ST")).toBe(22);
    expect(getPositionTrainingWeeks("GK", "CM")).toBe(22);
  });

  it("same group takes 5 weeks", () => {
    expect(getPositionTrainingWeeks("LB", "RB")).toBe(5);
    expect(getPositionTrainingWeeks("LW", "RW")).toBe(5);
  });

  it("adjacent group takes 10 weeks", () => {
    expect(getPositionTrainingWeeks("CB", "CM")).toBe(10);
    expect(getPositionTrainingWeeks("CM", "ST")).toBe(10);
  });

  it("distant group takes 16 weeks", () => {
    expect(getPositionTrainingWeeks("CB", "ST")).toBe(16);
    expect(getPositionTrainingWeeks("CB", "LW")).toBe(16);
  });
});
