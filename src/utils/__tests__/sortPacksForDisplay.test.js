import { describe, it, expect } from "vitest";
import { sortPacksForDisplay } from "../packUnlocks.js";

// Synthetic packs covering all four display groups, deliberately authored
// out of group order and with duplicate-group siblings to prove authored
// order survives within a group (stable sort).
function pack(id, collected, total) {
  return { id, collected, total };
}

describe("sortPacksForDisplay", () => {
  it("orders groups: in-progress, untouched, completed, sealed", () => {
    const packs = [
      pack("sealed_a", 0, 10),   // sealed
      pack("complete_a", 10, 10), // completed
      pack("untouched_a", 0, 10), // unsealed, untouched
      pack("progress_a", 4, 10),  // unsealed, in progress
    ];
    const unlockedPacks = new Set(["complete_a", "untouched_a", "progress_a"]);

    const order = sortPacksForDisplay(packs, unlockedPacks).map(p => p.id);

    expect(order).toEqual(["progress_a", "untouched_a", "complete_a", "sealed_a"]);
  });

  it("keeps authored order within a group (stable sort)", () => {
    const packs = [
      pack("sealed_1", 0, 10),
      pack("sealed_2", 0, 10),
      pack("progress_1", 3, 10),
      pack("progress_2", 7, 10),
      pack("untouched_1", 0, 5),
      pack("untouched_2", 0, 5),
      pack("complete_1", 5, 5),
      pack("complete_2", 10, 10),
    ];
    const unlockedPacks = new Set(["progress_1", "progress_2", "untouched_1", "untouched_2", "complete_1", "complete_2"]);

    const order = sortPacksForDisplay(packs, unlockedPacks).map(p => p.id);

    expect(order).toEqual([
      "progress_1", "progress_2",
      "untouched_1", "untouched_2",
      "complete_1", "complete_2",
      "sealed_1", "sealed_2",
    ]);
  });

  it("surfaces a late-authored unsealed pack above earlier-authored sealed packs", () => {
    // Regression case for the pack grid bug: new packs are appended to the
    // data file, so an unsealed pack authored dead last must still sort
    // above sealed packs authored first.
    const packs = [
      pack("sealed_first", 0, 10),
      pack("sealed_second", 0, 10),
      pack("sealed_third", 0, 10),
      pack("late_unsealed", 0, 10),
    ];
    const unlockedPacks = new Set(["late_unsealed"]);

    const order = sortPacksForDisplay(packs, unlockedPacks).map(p => p.id);

    expect(order[0]).toBe("late_unsealed");
    expect(order.slice(1)).toEqual(["sealed_first", "sealed_second", "sealed_third"]);
  });

  it("does not mutate the input array", () => {
    const packs = [pack("b", 0, 10), pack("a", 5, 10)];
    const unlockedPacks = new Set(["a", "b"]);
    const copy = [...packs];

    sortPacksForDisplay(packs, unlockedPacks);

    expect(packs).toEqual(copy);
  });
});
