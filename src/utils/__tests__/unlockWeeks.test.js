import { describe, it, expect } from "vitest";
import { formatUnlockWeek } from "../unlockWeeks.js";

describe("formatUnlockWeek", () => {
  it("returns empty string for a missing stamp", () => {
    expect(formatUnlockWeek(null)).toBe("");
    expect(formatUnlockWeek(undefined)).toBe("");
  });

  it("formats a legacy bare-number stamp as an absolute week", () => {
    expect(formatUnlockWeek(5)).toBe("W5");
  });

  it("formats a season/week stamp", () => {
    expect(formatUnlockWeek({ season: 2, week: 7 })).toBe("S2 W7");
  });

  it("clamps a pre-first-advance week of 0 up to W1, for both stamp shapes", () => {
    expect(formatUnlockWeek(0)).toBe("W1");
    expect(formatUnlockWeek({ season: 1, week: 0 })).toBe("S1 W1");
  });

  it("clamps a negative legacy week up to W1 too", () => {
    expect(formatUnlockWeek(-3)).toBe("W1");
    expect(formatUnlockWeek({ season: 1, week: -3 })).toBe("S1 W1");
  });

  it("leaves a valid 1-based week untouched", () => {
    expect(formatUnlockWeek({ season: 3, week: 12 })).toBe("S3 W12");
  });
});
