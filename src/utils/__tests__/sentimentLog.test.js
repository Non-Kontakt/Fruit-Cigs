import { describe, it, expect } from "vitest";
import { pushSentimentEntry } from "../sentimentLog.js";

describe("pushSentimentEntry", () => {
  it("appends a new entry", () => {
    const log = pushSentimentEntry([], { delta: 4, reason: "Beat Yeralden 3-0", week: 14, season: 2 });
    expect(log).toEqual([{ delta: 4, reason: "Beat Yeralden 3-0", week: 14, season: 2 }]);
  });

  it("appends in chronological order — newest entry is last", () => {
    let log = [];
    log = pushSentimentEntry(log, { delta: 1, reason: "first", week: 1, season: 1 });
    log = pushSentimentEntry(log, { delta: 2, reason: "second", week: 2, season: 1 });
    expect(log[0].reason).toBe("first");
    expect(log[log.length - 1].reason).toBe("second");
  });

  it("caps at the most recent 20 entries, dropping the oldest", () => {
    let log = [];
    for (let i = 0; i < 25; i++) {
      log = pushSentimentEntry(log, { delta: 1, reason: `entry-${i}`, week: i, season: 1 });
    }
    expect(log.length).toBe(20);
    expect(log[0].reason).toBe("entry-5"); // oldest 5 dropped
    expect(log[log.length - 1].reason).toBe("entry-24");
  });

  it("does not mutate the previous array", () => {
    const prev = [{ delta: 1, reason: "a", week: 1, season: 1 }];
    const next = pushSentimentEntry(prev, { delta: 2, reason: "b", week: 2, season: 1 });
    expect(prev.length).toBe(1);
    expect(next.length).toBe(2);
  });
});
