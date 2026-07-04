import { describe, it, expect } from "vitest";
import { buildLeagueHistorySnapshot } from "../league.js";

function makeLeague({ tier, leagueName, teams, rows }) {
  return {
    tier,
    leagueName,
    teams,
    table: rows.map((r, i) => ({ teamIndex: i, ...r })),
  };
}

describe("buildLeagueHistorySnapshot", () => {
  const playerLeague = makeLeague({
    tier: 11,
    leagueName: "Concrete Schoolyard",
    teams: [{ name: "Red Lion FC", isPlayer: true }, { name: "Dog & Duck" }],
    rows: [
      { played: 18, won: 5, drawn: 5, lost: 8, goalsFor: 20, goalsAgainst: 25, points: 20 },
      { played: 18, won: 10, drawn: 4, lost: 4, goalsFor: 30, goalsAgainst: 18, points: 34 },
    ],
  });

  const otherLeague = makeLeague({
    tier: 10,
    leagueName: "Div 10",
    teams: [{ name: "Golden Boot" }, { name: "Nag's Head" }],
    rows: [
      { played: 18, won: 12, drawn: 3, lost: 3, goalsFor: 40, goalsAgainst: 15, points: 39 },
      { played: 18, won: 2, drawn: 2, lost: 14, goalsFor: 10, goalsAgainst: 40, points: 8 },
    ],
  });

  it("builds a sorted standings table for the player's own tier", () => {
    const snap = buildLeagueHistorySnapshot(11, playerLeague, {});
    expect(snap[11].leagueName).toBe("Concrete Schoolyard");
    expect(snap[11].standings.map(r => r.name)).toEqual(["Dog & Duck", "Red Lion FC"]);
    expect(snap[11].standings[0]).toMatchObject({ played: 18, won: 10, drawn: 4, lost: 4, goalsFor: 30, goalsAgainst: 18, points: 34 });
  });

  it("includes every tier present in allLeagueStates", () => {
    const snap = buildLeagueHistorySnapshot(11, playerLeague, { 10: otherLeague });
    expect(Object.keys(snap).map(Number).sort()).toEqual([10, 11]);
    expect(snap[10].leagueName).toBe("Div 10");
    expect(snap[10].standings[0].name).toBe("Golden Boot");
  });

  it("skips tiers with no table/teams instead of throwing", () => {
    const snap = buildLeagueHistorySnapshot(11, playerLeague, { 9: null, 8: {} });
    expect(snap[9]).toBeUndefined();
    expect(snap[8]).toBeUndefined();
    expect(snap[11]).toBeDefined();
  });

  it("falls back to LEAGUE_DEFS name when the league object has none", () => {
    const noName = makeLeague({ tier: 3, leagueName: null, teams: [{ name: "A" }], rows: [{ played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, points: 3 }] });
    const snap = buildLeagueHistorySnapshot(null, null, { 3: noName });
    expect(snap[3].leagueName).toBeTruthy();
  });
});
