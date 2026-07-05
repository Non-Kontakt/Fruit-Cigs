import { describe, it, expect } from "vitest";
import { findComparablePlayer } from "../transfer.js";

function makePlayer(id, position, ovr, extra = {}) {
  // Uniform attrs so getOverall() resolves to exactly `ovr` regardless of
  // position weighting (weights sum to 1.00 per position).
  return {
    id, position,
    attrs: { pace: ovr, shooting: ovr, passing: ovr, defending: ovr, physical: ovr, technique: ovr, mental: ovr },
    ...extra,
  };
}

describe("findComparablePlayer", () => {
  it("returns null for an empty squad", () => {
    expect(findComparablePlayer([], "ST")).toBeNull();
    expect(findComparablePlayer(null, "ST")).toBeNull();
  });

  it("picks the best-OVR player at the exact same position", () => {
    const squad = [
      makePlayer("p1", "ST", 12),
      makePlayer("p2", "ST", 16),
      makePlayer("p3", "CM", 18),
    ];
    const result = findComparablePlayer(squad, "ST");
    expect(result.exactMatch).toBe(true);
    expect(result.player.id).toBe("p2");
  });

  it("falls back to closest positional fit (by getOOPPenalty) when no exact match exists", () => {
    // No ST in the squad. CM->ST is an "adjacent group" penalty (0.80),
    // GK->ST is the worst possible fit — CM should win despite lower OVR.
    const squad = [
      makePlayer("gk1", "GK", 19),
      makePlayer("cm1", "CM", 10),
    ];
    const result = findComparablePlayer(squad, "ST");
    expect(result.exactMatch).toBe(false);
    expect(result.player.id).toBe("cm1");
  });

  it("ties in positional fit break by higher OVR", () => {
    // Both LB and RB are "same group" fits for RW... use two CMs (identical
    // fit for AM) to keep the tie-break unambiguous.
    const squad = [
      makePlayer("cm1", "CM", 10),
      makePlayer("cm2", "CM", 14),
    ];
    const result = findComparablePlayer(squad, "AM");
    expect(result.exactMatch).toBe(false);
    expect(result.player.id).toBe("cm2");
  });

  it("a learned position counts as an exact fit via getOOPPenalty, but findComparablePlayer's exactMatch flag is about natural position only", () => {
    const squad = [
      makePlayer("cb1", "CB", 15, { learnedPositions: ["ST"] }),
    ];
    const result = findComparablePlayer(squad, "ST");
    // No player whose natural `.position` is "ST", so this is the fallback path —
    // exactMatch reports the natural-position match, not the learned-position fit.
    expect(result.exactMatch).toBe(false);
    expect(result.player.id).toBe("cb1");
  });
});
