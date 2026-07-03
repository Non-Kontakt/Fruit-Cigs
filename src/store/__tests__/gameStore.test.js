import { describe, it, expect } from "vitest";
import { useGameStore } from "../gameStore.js";

describe("resetForNewSeason", () => {
  it("clears transfer window state so a season boundary can't carry over a stale window or offers", () => {
    const store = useGameStore.getState();

    // Simulate a save made mid-transfer-window: window open, weeks left,
    // and an offer referencing a player.
    store.setTransferWindowOpen(true);
    store.setTransferWindowWeeksRemaining(4);
    store.setTransferOffers([{ id: "offer_1", playerId: "p1", clubName: "Rivals FC" }]);

    expect(useGameStore.getState().transferWindowOpen).toBe(true);
    expect(useGameStore.getState().transferWindowWeeksRemaining).toBe(4);
    expect(useGameStore.getState().transferOffers).toHaveLength(1);

    useGameStore.getState().resetForNewSeason();

    const next = useGameStore.getState();
    expect(next.transferWindowOpen).toBe(false);
    expect(next.transferWindowWeeksRemaining).toBe(0);
    expect(next.transferOffers).toEqual([]);
  });

  it("leaves career-spanning fields like squad untouched", () => {
    const squad = [{ id: "p1", name: "Test Player" }];
    useGameStore.getState().setSquad(squad);

    useGameStore.getState().resetForNewSeason();

    expect(useGameStore.getState().squad).toBe(squad);
  });
});
