import { describe, it, expect } from "vitest";
import { renameDuplicateNames } from "../player.js";

const player = (id, name, extra = {}) => ({ id, name, position: "CM", ...extra });

describe("renameDuplicateNames", () => {
  it("renames later occurrences and keeps the first untouched", () => {
    const squad = [player("a", "Z. 'Void"), player("b", "Z. 'Void"), player("c", "Z. 'Void")];
    const out = renameDuplicateNames(squad);
    expect(out[0].name).toBe("Z. 'Void");
    expect(out[1].name).toBe("Z. 'Void II");
    expect(out[2].name).toBe("Z. 'Void III");
  });

  it("preserves ids and every other field", () => {
    const squad = [player("a", "Kai Mori", { attrs: { pace: 9 } }), player("b", "Kai Mori", { attrs: { pace: 4 } })];
    const out = renameDuplicateNames(squad);
    expect(out[1].id).toBe("b");
    expect(out[1].attrs).toEqual({ pace: 4 });
    expect(out[0]).toBe(squad[0]);
  });

  it("returns the same array reference when nothing is duplicated", () => {
    const squad = [player("a", "One"), player("b", "Two")];
    expect(renameDuplicateNames(squad)).toBe(squad);
  });

  it("skips suffixes already taken by another squad member", () => {
    const squad = [player("a", "Kai Mori"), player("b", "Kai Mori II"), player("c", "Kai Mori")];
    const out = renameDuplicateNames(squad);
    expect(out[2].name).toBe("Kai Mori III");
  });

  it("never steals a name owned by a player later in the list", () => {
    // The duplicate must jump to III — taking II would force an innocent
    // rename of the real Kai Mori II behind it.
    const squad = [player("a", "Kai Mori"), player("b", "Kai Mori"), player("c", "Kai Mori II")];
    const out = renameDuplicateNames(squad);
    expect(out[0].name).toBe("Kai Mori");
    expect(out[1].name).toBe("Kai Mori III");
    expect(out[2].name).toBe("Kai Mori II");
    expect(out[2]).toBe(squad[2]);
  });

  it("handles nameless or empty input gracefully", () => {
    expect(renameDuplicateNames([])).toEqual([]);
    expect(renameDuplicateNames(null)).toBe(null);
    const squad = [{ id: "a" }, player("b", "Two")];
    expect(renameDuplicateNames(squad)).toBe(squad);
  });
});
