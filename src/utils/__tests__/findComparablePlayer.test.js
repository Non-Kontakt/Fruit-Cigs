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
    expect(result.naturalPosition).toBe(true);
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
    expect(result.naturalPosition).toBe(false);
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
    expect(result.naturalPosition).toBe(false);
    expect(result.player.id).toBe("cm2");
  });

  it("a learned position counts as a perfect fit via getOOPPenalty, but naturalPosition reports the natural position only", () => {
    const squad = [
      makePlayer("cb1", "CB", 15, { learnedPositions: ["ST"] }),
    ];
    const result = findComparablePlayer(squad, "ST");
    // No player whose natural `.position` is "ST", so this is the fallback path —
    // naturalPosition reports the natural-position match, not the learned-position fit.
    expect(result.naturalPosition).toBe(false);
    expect(result.player.id).toBe("cb1");
  });
});


// The comparison informs "does this target improve my STARTING XI" — so the
// current starter must win even when a better player warms the bench.
describe("findComparablePlayer starter preference", () => {
  const attrs = (v) => ({ pace: v, shooting: v, passing: v, defending: v, physical: v, technique: v, mental: v });
  const p = (id, position, v) => ({ id, name: id, position, attrs: attrs(v) });
  const FORMATION = [
    { pos: "GK" }, { pos: "LB" }, { pos: "CB" }, { pos: "CB" }, { pos: "RB" },
    { pos: "LW" }, { pos: "CM" }, { pos: "CM" }, { pos: "RW" }, { pos: "ST" }, { pos: "ST" },
  ];
  const squad = [
    p("gk1", "GK", 12), p("lb1", "LB", 10), p("cb1", "CB", 11), p("cb2", "CB", 11),
    p("rb1", "RB", 10), p("lw1", "LW", 10), p("cm1", "CM", 10), p("cm2", "CM", 10),
    p("rw1", "RW", 10), p("st_starter", "ST", 13), p("st_starter2", "ST", 12),
    p("st_bench", "ST", 16), // better than both starters, but benched
  ];
  const startingXI = ["gk1", "lb1", "cb1", "cb2", "rb1", "lw1", "cm1", "cm2", "rw1", "st_starter", "st_starter2"];

  it("picks the starting ST over a better benched ST", () => {
    const result = findComparablePlayer(squad, "ST", { startingXI, formation: FORMATION, slotAssignments: null });
    expect(result.fromXI).toBe(true);
    expect(result.player.id).toBe("st_starter"); // best OVR among the two ST slots
  });

  it("falls back to the closest fit within the XI when the formation has no matching slot", () => {
    const result = findComparablePlayer(squad, "AM", { startingXI, formation: FORMATION, slotAssignments: null });
    expect(result.fromXI).toBe(true);
    expect(startingXI).toContain(result.player.id);
  });

  it("uses the squad-wide fallback only when there is no usable XI", () => {
    const result = findComparablePlayer(squad, "ST", { startingXI: [], formation: FORMATION, slotAssignments: null });
    expect(result.fromXI).toBe(false);
    expect(result.player.id).toBe("st_bench");
  });
});
