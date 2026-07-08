import { describe, it, expect } from "vitest";
import { computeTeamOfCup } from "../competitionStats.js";

// Extracted from CupPage.jsx's teamOfCup useMemo — deterministic candidate
// pool -> best-XI selection. No randomness: given the same cup + teamByName,
// the same XI comes out every time.

function makePlayer(name, position, isBench = false) {
  return { name, position, isBench };
}

function makeTeam(name, isPlayer, squad) {
  return { name, isPlayer, squad };
}

function fullSquad(prefix, isPlayer) {
  const positions = ["GK", "CB", "CB", "LB", "RB", "CM", "CM", "AM", "LW", "RW", "ST"];
  return positions.map((pos, i) => makePlayer(`${prefix}-${pos}${i}`, pos));
}

describe("computeTeamOfCup — no winner yet", () => {
  it("returns [] when the cup has no winner", () => {
    expect(computeTeamOfCup({ cup: { winner: null, rounds: [] }, teamByName: new Map() })).toEqual([]);
  });

  it("returns [] for a null/undefined cup", () => {
    expect(computeTeamOfCup({ cup: null, teamByName: new Map() })).toEqual([]);
    expect(computeTeamOfCup({ cup: undefined, teamByName: new Map() })).toEqual([]);
  });

  it("returns [] when rounds are missing", () => {
    expect(computeTeamOfCup({ cup: { winner: { name: "A" } }, teamByName: new Map() })).toEqual([]);
  });
});

describe("computeTeamOfCup — picks the winner's XI when they dominate", () => {
  it("fills all 11 slots from a single dominant winning team", () => {
    const winnerSquad = fullSquad("W", true);
    const loserSquad = fullSquad("L", false);
    const teamByName = new Map([
      ["Winners", makeTeam("Winners", true, winnerSquad)],
      ["Losers", makeTeam("Losers", false, loserSquad)],
    ]);
    const cup = {
      winner: { name: "Winners" },
      rounds: [
        {
          name: "Final",
          matches: [
            { home: { name: "Winners" }, away: { name: "Losers" }, result: { homeGoals: 5, awayGoals: 0, winner: { name: "Winners" } } },
          ],
        },
      ],
    };
    const xi = computeTeamOfCup({ cup, teamByName });
    expect(xi.length).toBe(11);
    expect(xi.every(p => p.teamName === "Winners")).toBe(true);
    expect(xi.every(p => p.isPlayerTeam)).toBe(true);
  });

  it("skips teams with no resolvable squad in teamByName", () => {
    const winnerSquad = fullSquad("W", false);
    const teamByName = new Map([["Winners", makeTeam("Winners", false, winnerSquad)]]);
    // Losers has no entry in teamByName at all — can't resolve their squad.
    const cup = {
      winner: { name: "Winners" },
      rounds: [
        {
          name: "Final",
          matches: [
            { home: { name: "Winners" }, away: { name: "Losers" }, result: { homeGoals: 3, awayGoals: 1, winner: { name: "Winners" } } },
          ],
        },
      ],
    };
    const xi = computeTeamOfCup({ cup, teamByName });
    expect(xi.every(p => p.teamName === "Winners")).toBe(true);
  });
});

describe("computeTeamOfCup — round progression and bench exclusion", () => {
  it("favors a team that went further even if they scored fewer goals", () => {
    // Team A reaches the final (round 1, index 1), Team B is knocked out in
    // round 0. Both only field a GK for this test to isolate the GK slot.
    const teamByName = new Map([
      ["A", makeTeam("A", true, [makePlayer("A-GK", "GK")])],
      ["B", makeTeam("B", false, [makePlayer("B-GK", "GK")])],
      ["C", makeTeam("C", false, [makePlayer("C-GK", "GK")])],
    ]);
    const cup = {
      winner: { name: "A" },
      rounds: [
        {
          name: "Round 1",
          matches: [
            { home: { name: "A" }, away: { name: "B" }, result: { homeGoals: 1, awayGoals: 0, winner: { name: "A" } } },
          ],
        },
        {
          name: "Final",
          matches: [
            { home: { name: "A" }, away: { name: "C" }, result: { homeGoals: 1, awayGoals: 0, winner: { name: "A" } } },
          ],
        },
      ],
    };
    const xi = computeTeamOfCup({ cup, teamByName });
    const gk = xi.find(p => p.position === "GK");
    expect(gk.teamName).toBe("A");
  });

  it("excludes bench players from candidates", () => {
    const teamByName = new Map([
      ["A", makeTeam("A", true, [makePlayer("A-GK", "GK"), makePlayer("A-GK-bench", "GK", true)])],
    ]);
    const cup = {
      winner: { name: "A" },
      rounds: [
        { name: "Final", matches: [{ home: { name: "A" }, away: { name: "A" }, result: { homeGoals: 1, awayGoals: 0, winner: { name: "A" } } }] },
      ],
    };
    const xi = computeTeamOfCup({ cup, teamByName });
    expect(xi.some(p => p.name === "A-GK-bench")).toBe(false);
  });

  it("ignores bye matches", () => {
    const teamByName = new Map([["A", makeTeam("A", true, [makePlayer("A-GK", "GK")])]]);
    const cup = {
      winner: { name: "A" },
      rounds: [
        { name: "Round 1", matches: [{ home: { name: "A" }, away: null, result: { bye: true } }] },
        { name: "Final", matches: [{ home: { name: "A" }, away: { name: "A" }, result: { homeGoals: 2, awayGoals: 0, winner: { name: "A" } } }] },
      ],
    };
    const xi = computeTeamOfCup({ cup, teamByName });
    expect(xi.length).toBe(1);
  });
});

describe("computeTeamOfCup — determinism", () => {
  it("produces the same XI across repeated calls with the same inputs", () => {
    const teamByName = new Map([
      ["Winners", makeTeam("Winners", true, fullSquad("W", true))],
      ["Losers", makeTeam("Losers", false, fullSquad("L", false))],
    ]);
    const cup = {
      winner: { name: "Winners" },
      rounds: [
        { name: "Final", matches: [{ home: { name: "Winners" }, away: { name: "Losers" }, result: { homeGoals: 2, awayGoals: 1, winner: { name: "Winners" } } }] },
      ],
    };
    const first = computeTeamOfCup({ cup, teamByName });
    const second = computeTeamOfCup({ cup, teamByName });
    expect(first).toEqual(second);
  });
});
