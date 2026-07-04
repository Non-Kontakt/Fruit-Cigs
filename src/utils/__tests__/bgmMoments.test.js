import { describe, it, expect } from "vitest";
import { isRunInMoment, hasLateEqualiser } from "../bgmMoments.js";

function makeLeague({ matchweekIndex, totalWeeks, rows, playerTeamIndex = 0 }) {
  const fixtures = Array.from({ length: totalWeeks }, () => []);
  const teams = rows.map((_, i) => ({ isPlayer: i === playerTeamIndex }));
  const table = rows.map((points, i) => ({ teamIndex: i, points, goalsFor: 0, goalsAgainst: 0 }));
  return { matchweekIndex, fixtures, teams, table };
}

describe("isRunInMoment", () => {
  it("is false outside the final 5 matchweeks", () => {
    const league = makeLeague({ matchweekIndex: 10, totalWeeks: 38, rows: [50, 48, 45, 40] });
    expect(isRunInMoment(league)).toBe(false);
  });

  it("is true in the final 5 weeks when player is top 3 within 6 points", () => {
    const league = makeLeague({ matchweekIndex: 34, totalWeeks: 38, rows: [50, 48, 45, 40] });
    expect(isRunInMoment(league)).toBe(true);
  });

  it("is false in the final 5 weeks if player is outside the top 3", () => {
    const league = makeLeague({ matchweekIndex: 34, totalWeeks: 38, rows: [50, 48, 45, 40], playerTeamIndex: 3 });
    expect(isRunInMoment(league)).toBe(false);
  });

  it("is false in the final 5 weeks if player is top 3 but more than 6 points off the lead", () => {
    const league = makeLeague({ matchweekIndex: 34, totalWeeks: 38, rows: [50, 43, 40, 38], playerTeamIndex: 1 });
    expect(isRunInMoment(league)).toBe(false);
  });

  it("is false once the season has finished (no matchweeks remaining)", () => {
    const league = makeLeague({ matchweekIndex: 38, totalWeeks: 38, rows: [50, 48, 45, 40] });
    expect(isRunInMoment(league)).toBe(false);
  });

  it("is false with missing league data", () => {
    expect(isRunInMoment(null)).toBe(false);
    expect(isRunInMoment({})).toBe(false);
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
