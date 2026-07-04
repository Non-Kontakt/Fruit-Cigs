import { describe, it, expect } from "vitest";
import { advanceShortlistScouting, SCOUT_REVEAL_WEEKS, fallbackPotential } from "../scouting.js";

function entry(overrides = {}) {
  return { id: "p1", name: "Test Player", age: 19, ovr: 12, potential: 16, scoutWeeksLeft: SCOUT_REVEAL_WEEKS, ...overrides };
}

describe("advanceShortlistScouting", () => {
  it("counts down without revealing before the threshold", () => {
    const { nextShortlist, revealed } = advanceShortlistScouting([entry()], {});
    expect(revealed).toHaveLength(0);
    expect(nextShortlist[0].scoutWeeksLeft).toBe(SCOUT_REVEAL_WEEKS - 1);
  });

  it("reveals once the countdown reaches zero", () => {
    const { nextShortlist, revealed } = advanceShortlistScouting([entry({ scoutWeeksLeft: 1 })], {});
    expect(revealed).toHaveLength(1);
    expect(revealed[0].id).toBe("p1");
    expect(revealed[0].potential).toBe(16);
    expect(nextShortlist[0].scoutWeeksLeft).toBe(0);
  });

  it("defaults missing scoutWeeksLeft to the full threshold (old-save entries)", () => {
    const { nextShortlist } = advanceShortlistScouting([entry({ scoutWeeksLeft: undefined })], {});
    expect(nextShortlist[0].scoutWeeksLeft).toBe(SCOUT_REVEAL_WEEKS - 1);
  });

  it("does not track or re-reveal a player who's already been scouted", () => {
    const { nextShortlist, revealed } = advanceShortlistScouting(
      [entry({ scoutWeeksLeft: 1 })],
      { p1: 16 },
    );
    expect(revealed).toHaveLength(0);
    expect(nextShortlist[0]).toEqual(entry({ scoutWeeksLeft: 1 })); // untouched
  });

  it("cancels the pending reveal when a player is removed from the shortlist", () => {
    // Removing a player just means it's no longer in the array — there's
    // nothing left to reveal for it.
    const { revealed } = advanceShortlistScouting([], {});
    expect(revealed).toHaveLength(0);
  });

  it("falls back to a deterministic potential when a legacy entry has none", () => {
    const legacyEntry = { id: "legacy1", name: "Old Save Kid", age: 18, ovr: 10, scoutWeeksLeft: 1 };
    const { revealed } = advanceShortlistScouting([legacyEntry], {}, 20);
    expect(revealed).toHaveLength(1);
    expect(revealed[0].potential).toBe(fallbackPotential(legacyEntry, 20));
    expect(revealed[0].potential).toBeGreaterThanOrEqual(legacyEntry.ovr);
  });

  it("handles multiple shortlisted players independently", () => {
    const { nextShortlist, revealed } = advanceShortlistScouting(
      [entry({ id: "p1", scoutWeeksLeft: 1 }), entry({ id: "p2", scoutWeeksLeft: 3 })],
      {},
    );
    expect(revealed.map(r => r.id)).toEqual(["p1"]);
    expect(nextShortlist.find(e => e.id === "p2").scoutWeeksLeft).toBe(2);
  });
});
