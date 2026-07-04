import { describe, it, expect } from "vitest";
import { isRunInMoment, hasLateEqualiser } from "../bgmMoments.js";

function makeLeague({ totalWeeks, rows, playerTeamIndex = 0 }) {
  // Deliberately NO matchweekIndex on the league object — the live index is
  // a separate argument in the app (the league object's copy is not the
  // source of truth), and these tests must mirror that.
  const fixtures = Array.from({ length: totalWeeks }, () => []);
  const teams = rows.map((_, i) => ({ isPlayer: i === playerTeamIndex }));
  const table = rows.map((points, i) => ({ teamIndex: i, points, goalsFor: 0, goalsAgainst: 0 }));
  return { fixtures, teams, table };
}

describe("isRunInMoment", () => {
  it("is false outside the final 5 matchweeks", () => {
    const league = makeLeague({ totalWeeks: 38, rows: [50, 48, 45, 40] });
    expect(isRunInMoment(league, 10)).toBe(false);
  });

  it("is true in the final 5 weeks when player is top 3 within 6 points", () => {
    const league = makeLeague({ totalWeeks: 38, rows: [50, 48, 45, 40] });
    expect(isRunInMoment(league, 34)).toBe(true);
  });

  it("triggers from the live index even when the league object carries a stale one", () => {
    const league = { ...makeLeague({ totalWeeks: 38, rows: [50, 48, 45, 40] }), matchweekIndex: 0 };
    expect(isRunInMoment(league, 34)).toBe(true);
  });

  it("is false in the final 5 weeks if player is outside the top 3", () => {
    const league = makeLeague({ totalWeeks: 38, rows: [50, 48, 45, 40], playerTeamIndex: 3 });
    expect(isRunInMoment(league, 34)).toBe(false);
  });

  it("is false in the final 5 weeks if player is top 3 but more than 6 points off the lead", () => {
    const league = makeLeague({ totalWeeks: 38, rows: [50, 43, 40, 38], playerTeamIndex: 1 });
    expect(isRunInMoment(league, 34)).toBe(false);
  });

  it("is false once the season has finished (no matchweeks remaining)", () => {
    const league = makeLeague({ totalWeeks: 38, rows: [50, 48, 45, 40] });
    expect(isRunInMoment(league, 38)).toBe(false);
  });

  it("is false with missing league data", () => {
    expect(isRunInMoment(null, 34)).toBe(false);
    expect(isRunInMoment({}, 34)).toBe(false);
  });
});

describe("hasLateEqualiser", () => {
  it("is true when the player's side levels the score at minute >= 85", () => {
    const result = {
      isPlayerHome: true,
      events: [
        { type: "goal", side: "away", minute: 10 },
        { type: "goal", side: "home", minute: 87 },
      ],
    };
    expect(hasLateEqualiser(result)).toBe(true);
  });

  it("is false when the equaliser comes before minute 85", () => {
    const result = {
      isPlayerHome: true,
      events: [
        { type: "goal", side: "away", minute: 10 },
        { type: "goal", side: "home", minute: 70 },
      ],
    };
    expect(hasLateEqualiser(result)).toBe(false);
  });

  it("is false when the late goal is the opponent's, not the player's", () => {
    const result = {
      isPlayerHome: true,
      events: [
        { type: "goal", side: "home", minute: 10 },
        { type: "goal", side: "away", minute: 88 },
      ],
    };
    expect(hasLateEqualiser(result)).toBe(false);
  });

  it("is false when the late goal puts the player ahead rather than level", () => {
    const result = {
      isPlayerHome: true,
      events: [
        { type: "goal", side: "home", minute: 87 },
      ],
    };
    expect(hasLateEqualiser(result)).toBe(false);
  });

  it("handles unsorted events and the away side", () => {
    const result = {
      isPlayerHome: false,
      events: [
        { type: "goal", side: "away", minute: 90 },
        { type: "goal", side: "home", minute: 5 },
      ],
    };
    expect(hasLateEqualiser(result)).toBe(true);
  });

  it("is false with no events", () => {
    expect(hasLateEqualiser({ events: [] })).toBe(false);
    expect(hasLateEqualiser(null)).toBe(false);
  });
});
