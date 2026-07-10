import { describe, it, expect } from "vitest";
import { getMatchFeedPlaceholder } from "../matchFeedPlaceholder.js";

describe("getMatchFeedPlaceholder — minute-aware live feed empty state", () => {
  it("minute 0 (pre-kickoff)", () => {
    expect(getMatchFeedPlaceholder(0)).toBe("Waiting for kick off...");
  });

  it("1'-14'", () => {
    expect(getMatchFeedPlaceholder(1)).toBe("Cagey stuff so far.");
    expect(getMatchFeedPlaceholder(14)).toBe("Cagey stuff so far.");
  });

  it("15'-29'", () => {
    expect(getMatchFeedPlaceholder(15)).toBe("Nothing to report. The midfield is a swamp.");
    expect(getMatchFeedPlaceholder(29)).toBe("Nothing to report. The midfield is a swamp.");
  });

  it("30'-44'", () => {
    expect(getMatchFeedPlaceholder(30)).toBe("Still goalless. The away fans are doing the entertaining.");
    expect(getMatchFeedPlaceholder(44)).toBe("Still goalless. The away fans are doing the entertaining.");
  });

  it("HT (minute 45) with no events", () => {
    expect(getMatchFeedPlaceholder(45)).toBe("HT: no notes worth keeping.");
  });

  it("46'+", () => {
    expect(getMatchFeedPlaceholder(46)).toBe("A slow burner — both gaffers chewing their gum nervously.");
    expect(getMatchFeedPlaceholder(90)).toBe("A slow burner — both gaffers chewing their gum nervously.");
  });

  it("band selection is deterministic — same minute always returns the same copy", () => {
    for (const minute of [0, 1, 14, 15, 29, 30, 44, 45, 46, 90]) {
      const first = getMatchFeedPlaceholder(minute);
      for (let i = 0; i < 10; i++) {
        expect(getMatchFeedPlaceholder(minute)).toBe(first);
      }
    }
  });
});
