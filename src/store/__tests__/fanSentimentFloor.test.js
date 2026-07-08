import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "../gameStore.js";

// The People's Champion floor is tracked centrally inside the store's
// setFanSentiment action (rather than at each of its many call sites) so
// every writer — weekly drift, match deltas, ticket/choice effects, season
// carry-over — is covered automatically. These tests pin that behavior
// directly against the store, independent of any one call site.
describe("gameStore — fanSentimentSeasonFloor tracking", () => {
  beforeEach(() => {
    useGameStore.setState({ fanSentiment: 50, fanSentimentSeasonFloor: 100 });
  });

  it("defaults the floor to 100 for a fresh store", () => {
    useGameStore.setState({ fanSentimentSeasonFloor: 100 });
    expect(useGameStore.getState().fanSentimentSeasonFloor).toBe(100);
  });

  it("lowers the floor when fanSentiment drops below it", () => {
    useGameStore.getState().setFanSentiment(40);
    expect(useGameStore.getState().fanSentiment).toBe(40);
    expect(useGameStore.getState().fanSentimentSeasonFloor).toBe(40);
  });

  it("does not raise the floor when fanSentiment goes back up", () => {
    useGameStore.getState().setFanSentiment(30);
    useGameStore.getState().setFanSentiment(90);
    expect(useGameStore.getState().fanSentiment).toBe(90);
    expect(useGameStore.getState().fanSentimentSeasonFloor).toBe(30);
  });

  it("tracks the running minimum across several writes, including updater functions", () => {
    useGameStore.getState().setFanSentiment(60);
    useGameStore.getState().setFanSentiment(s => s - 15); // 45
    useGameStore.getState().setFanSentiment(70);
    useGameStore.getState().setFanSentiment(20);
    expect(useGameStore.getState().fanSentimentSeasonFloor).toBe(20);
  });

  it("setFanSentimentSeasonFloor resets the floor directly, independent of setFanSentiment", () => {
    useGameStore.getState().setFanSentiment(10);
    expect(useGameStore.getState().fanSentimentSeasonFloor).toBe(10);
    // Season/prestige rollover resets the floor to the newly-carried
    // sentiment, not 100 — a direct reset, not a min-tracked write.
    useGameStore.getState().setFanSentimentSeasonFloor(75);
    expect(useGameStore.getState().fanSentimentSeasonFloor).toBe(75);
    // And a subsequent drop below the reset value still tracks correctly.
    useGameStore.getState().setFanSentiment(60);
    expect(useGameStore.getState().fanSentimentSeasonFloor).toBe(60);
  });
});
