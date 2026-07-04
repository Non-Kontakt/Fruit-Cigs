import { describe, it, expect } from "vitest";
import { findLastGain, describeLastGain } from "../attrHistory.js";

const stamped = (val, week, season) => ({ pace: val, week, season });
const bare = (val) => ({ pace: val });

describe("findLastGain", () => {
  it("finds a gain in the middle of the history, ignoring later flat weeks", () => {
    const history = [
      stamped(8, 1, 1), stamped(8, 2, 1), stamped(9, 3, 1),
      stamped(9, 4, 1), stamped(9, 5, 1),
    ];
    const last = findLastGain(history, "pace");
    expect(last).toEqual({ gain: 1, weeksAgo: 2, week: 3, season: 1 });
  });

  it("returns null when the attribute never increases (no gain ever)", () => {
    const history = [stamped(10, 1, 1), stamped(9, 2, 1), stamped(9, 3, 1), stamped(8, 4, 1)];
    expect(findLastGain(history, "pace")).toBeNull();
  });

  it("returns null when the history is fully flat", () => {
    const history = [stamped(7, 1, 1), stamped(7, 2, 1), stamped(7, 3, 1)];
    expect(findLastGain(history, "pace")).toBeNull();
  });

  it("returns null for fewer than 2 snapshots", () => {
    expect(findLastGain([stamped(7, 1, 1)], "pace")).toBeNull();
    expect(findLastGain([], "pace")).toBeNull();
  });

  it("falls back to weeksAgo (no week/season) for a gain landing in an unstamped, legacy segment", () => {
    // Legacy saves: early entries have no week/season at all.
    const history = [bare(6), bare(7), bare(7)];
    const last = findLastGain(history, "pace");
    expect(last).toEqual({ gain: 1, weeksAgo: 1, week: undefined, season: undefined });
  });

  it("handles a mixed array — unstamped legacy segment followed by stamped weeks", () => {
    const history = [bare(6), bare(7), stamped(7, 5, 2), stamped(8, 6, 2)];
    const last = findLastGain(history, "pace");
    expect(last).toEqual({ gain: 1, weeksAgo: 0, week: 6, season: 2 });
  });
});

describe("describeLastGain", () => {
  it("labels a stamped gain with season/week", () => {
    const history = [stamped(8, 1, 1), stamped(9, 2, 1)];
    expect(describeLastGain(history, "pace")).toBe("last +1 S1W2");
  });

  it("labels an unstamped gain with a relative 'weeks ago' fallback", () => {
    const history = [bare(6), bare(7), bare(7)];
    expect(describeLastGain(history, "pace")).toBe("last +1 (1w ago)");
  });

  it("labels the current week's gain as 'this week' when unstamped", () => {
    const history = [bare(6), bare(7)];
    expect(describeLastGain(history, "pace")).toBe("last +1 (this week)");
  });

  it("reports 'no gain in Nw' when the attribute never increased", () => {
    const history = [stamped(9, 1, 1), stamped(8, 2, 1), stamped(8, 3, 1)];
    expect(describeLastGain(history, "pace")).toBe("no gain in 2w");
  });

  it("reports 'no gain in Nw' for a fully flat history", () => {
    const history = [stamped(7, 1, 1), stamped(7, 2, 1), stamped(7, 3, 1), stamped(7, 4, 1)];
    expect(describeLastGain(history, "pace")).toBe("no gain in 3w");
  });

  it("prefers the stamp when the gain is in the stamped tail of a mixed array", () => {
    const history = [bare(6), bare(7), stamped(7, 5, 2), stamped(9, 6, 2)];
    expect(describeLastGain(history, "pace")).toBe("last +2 S2W6");
  });
});
