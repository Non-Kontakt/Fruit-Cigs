import { describe, it, expect } from "vitest";
import { serializeState, hydrateState } from "../gameStore.js";

// Season-domain ledger cards (Framed Above The Desk) persist their progress
// as a Set — same SET_FIELDS mechanism as unlockedAchievements etc. Pin the
// round trip through JSON so a save/load cycle can't silently drop it.
describe("gameStore serialize/hydrate — backPagesReceived (SET_FIELDS)", () => {
  it("serializes a Set to a plain array for JSON.stringify", () => {
    const state = { backPagesReceived: new Set(["title", "promotion"]) };
    const serialized = serializeState(state);
    expect(Array.isArray(serialized.backPagesReceived)).toBe(true);
    expect(serialized.backPagesReceived.sort()).toEqual(["promotion", "title"]);
  });

  it("round-trips through JSON.stringify/parse back into a Set", () => {
    const state = { backPagesReceived: new Set(["title", "promotion", "cup_final"]) };
    const roundTripped = JSON.parse(JSON.stringify(serializeState(state)));
    const hydrated = hydrateState(roundTripped);
    expect(hydrated.backPagesReceived).toBeInstanceOf(Set);
    expect(hydrated.backPagesReceived.size).toBe(3);
    expect(hydrated.backPagesReceived.has("cup_final")).toBe(true);
  });

  it("only touches the key when present — omitted key stays absent (old saves predating this field)", () => {
    const hydrated = hydrateState({ teamName: "City" });
    expect("backPagesReceived" in hydrated).toBe(false);
  });

  it("hydrates a corrupt (non-array) value to an empty Set defensively", () => {
    const hydratedCorrupt = hydrateState({ backPagesReceived: "not-an-array" });
    expect(hydratedCorrupt.backPagesReceived).toBeInstanceOf(Set);
    expect(hydratedCorrupt.backPagesReceived.size).toBe(0);
  });
});
