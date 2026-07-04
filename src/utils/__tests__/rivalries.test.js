import { describe, it, expect } from "vitest";
import { getRivalScore, isRival, getRivalryLine, getRivalryModifierForFixture } from "../rivalries.js";

const baseEntry = (extra = {}) => ({
  played: 0, wins: 0, draws: 0, losses: 0, closeGames: 0, redCards: 0, lastMeetings: [], ...extra,
});

// ---------------------------------------------------------------------------
// getRivalScore
// ---------------------------------------------------------------------------
describe("getRivalScore", () => {
  it("returns 0 for a null/missing entry", () => {
    expect(getRivalScore(null)).toBe(0);
    expect(getRivalScore(undefined)).toBe(0);
  });

  it("weights losses x2, close games x1, red cards x2", () => {
    const entry = baseEntry({ losses: 2, closeGames: 3, redCards: 1 });
    expect(getRivalScore(entry)).toBe(2 * 2 + 3 + 1 * 2); // 9
  });

  it("treats missing fields as 0", () => {
    expect(getRivalScore({})).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isRival
// ---------------------------------------------------------------------------
describe("isRival", () => {
  it("is false with fewer than 3 meetings even with a lopsided record", () => {
    const entry = baseEntry({ played: 2, losses: 2, closeGames: 2 });
    expect(isRival(entry)).toBe(false);
  });

  it("is false with enough meetings but a low heat score and few losses", () => {
    const entry = baseEntry({ played: 5, wins: 4, draws: 1, losses: 0, closeGames: 1, redCards: 0 });
    expect(isRival(entry)).toBe(false);
  });

  it("is true once the heat score clears the threshold", () => {
    // losses:2 (=4) + closeGames:2 (=2) = 6 >= threshold
    const entry = baseEntry({ played: 4, losses: 2, closeGames: 2 });
    expect(isRival(entry)).toBe(true);
  });

  it("is true on losses alone (3+) even with a low heat score otherwise", () => {
    const entry = baseEntry({ played: 5, losses: 3, closeGames: 0, redCards: 0 });
    expect(isRival(entry)).toBe(true);
  });

  it("is false for a null entry", () => {
    expect(isRival(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRivalryLine
// ---------------------------------------------------------------------------
describe("getRivalryLine", () => {
  it("leads with the winless streak when the team has never beaten this opponent", () => {
    const entry = baseEntry({ played: 5, wins: 0, losses: 3 });
    expect(getRivalryLine("City", "Rovers", entry)).toBe("City haven't beaten Rovers in 5 attempts.");
  });

  it("singularizes 'attempt' for exactly one meeting", () => {
    const entry = baseEntry({ played: 1, wins: 0 });
    expect(getRivalryLine("City", "Rovers", entry)).toBe("City haven't beaten Rovers in 1 attempt.");
  });

  it("calls out red cards when the team does have wins on the board", () => {
    const entry = baseEntry({ played: 6, wins: 2, redCards: 3 });
    expect(getRivalryLine("City", "Rovers", entry)).toBe("3 red cards in this fixture — it's never friendly.");
  });

  it("falls back to the generic rivalry line otherwise", () => {
    const entry = baseEntry({ played: 4, wins: 2, redCards: 0 });
    expect(getRivalryLine("City", "Rovers", entry)).toBe("City and Rovers — old rivals renew hostilities.");
  });

  it("falls back to the generic line for a missing entry", () => {
    expect(getRivalryLine("City", "Rovers", null)).toBe("City and Rovers — old rivals renew hostilities.");
  });
});

// ---------------------------------------------------------------------------
// getRivalryModifierForFixture
// ---------------------------------------------------------------------------
describe("getRivalryModifierForFixture", () => {
  const league = {
    teams: [
      { name: "City", isPlayer: true },
      { name: "Rovers", isPlayer: false },
      { name: "United", isPlayer: false },
      { name: "Town", isPlayer: false },
    ],
    fixtures: [
      [{ home: 0, away: 1 }, { home: 2, away: 3 }],
    ],
  };

  it("returns {} when there's no rival entry for the opponent", () => {
    const clubHistory = { rivalryLedger: {} };
    expect(getRivalryModifierForFixture(league, 0, "City", clubHistory)).toEqual({});
  });

  it("returns {} when the opponent has history but isn't a rival yet", () => {
    const clubHistory = { rivalryLedger: { Rovers: baseEntry({ played: 2, losses: 2 }) } };
    expect(getRivalryModifierForFixture(league, 0, "City", clubHistory)).toEqual({});
  });

  it("returns a rivalry line when the fixture opponent is a rival", () => {
    const clubHistory = { rivalryLedger: { Rovers: baseEntry({ played: 5, wins: 0, losses: 3 }) } };
    const mod = getRivalryModifierForFixture(league, 0, "City", clubHistory);
    expect(mod.rivalry?.line).toBe("City haven't beaten Rovers in 5 attempts.");
  });

  it("returns {} when the given matchweek is out of range", () => {
    const clubHistory = { rivalryLedger: { Rovers: baseEntry({ played: 5, losses: 3 }) } };
    expect(getRivalryModifierForFixture(league, 5, "City", clubHistory)).toEqual({});
  });
});
