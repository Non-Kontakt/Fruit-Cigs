import { describe, it, expect } from "vitest";
import {
  computeGoldenBoot, computeSeasonAwards,
  buildGoldenBootBody, buildYoungPlayerOfSeasonBody, buildPlayerOfSeasonBody,
  __test,
} from "../seasonAwards.js";
import { emptyCompetitionStats, accumulateMatchStats } from "../competitionStats.js";

const { syntheticAIRating, MIN_APPS, YOUNG_AGE_CUTOFF } = __test;

function leagueStatsWithGoals(entries) {
  // entries: [{ name, teamId, teamName, goals, yellows, reds, playerId }]
  let stats = emptyCompetitionStats();
  entries.forEach((e, i) => {
    const events = [];
    for (let g = 0; g < (e.goals || 0); g++) events.push({ type: "goal", side: "home", player: e.name, playerId: e.playerId });
    for (let y = 0; y < (e.yellows || 0); y++) events.push({ type: "card", side: "home", cardPlayer: e.name, cardPlayerId: e.playerId });
    for (let r = 0; r < (e.reds || 0); r++) events.push({ type: "red_card", side: "home", cardPlayer: e.name, cardPlayerId: e.playerId });
    stats = accumulateMatchStats(stats, {
      matchId: `m${i}`,
      result: { events },
      homeTeam: { id: e.teamId, name: e.teamName, squad: [{ id: e.playerId, name: e.name, position: e.position || "ST" }] },
      awayTeam: { id: "away", name: "Away", squad: [] },
    });
  });
  return stats;
}

describe("computeGoldenBoot", () => {
  it("returns null for empty/missing stats", () => {
    expect(computeGoldenBoot(null)).toBeNull();
    expect(computeGoldenBoot(emptyCompetitionStats())).toBeNull();
  });

  it("picks the top scorer as winner and top 3 as nominees", () => {
    const stats = leagueStatsWithGoals([
      { name: "Adams", teamId: 0, teamName: "City", goals: 24 },
      { name: "Frimpong", teamId: 1, teamName: "Rovers", goals: 21 },
      { name: "Bello", teamId: 2, teamName: "United", goals: 19 },
      { name: "Nobody", teamId: 3, teamName: "Athletic", goals: 3 },
    ]);
    const boot = computeGoldenBoot(stats);
    expect(boot.winner.name).toBe("Adams");
    expect(boot.winner.goals).toBe(24);
    expect(boot.nominees.map(n => n.name)).toEqual(["Adams", "Frimpong", "Bello"]);
  });
});

describe("syntheticAIRating", () => {
  it("clamps between 5.5 and 9.5", () => {
    const low = syntheticAIRating({ position: "CB", goals: 0, cardCount: 20, played: 5, winRate: 0, drawRate: 0, gpg: 0, cpg: 5 });
    expect(low).toBeGreaterThanOrEqual(5.5);
    const high = syntheticAIRating({ position: "ST", goals: 40, cardCount: 0, played: 10, winRate: 1, drawRate: 0, gpg: 4, cpg: 0 });
    expect(high).toBeLessThanOrEqual(9.5);
  });

  it("rewards forwards for goals more than a flat rate but rewards defenders even more per the existing weighting", () => {
    const fwd = syntheticAIRating({ position: "ST", goals: 10, cardCount: 0, played: 10, winRate: 0.5, drawRate: 0, gpg: 1, cpg: 1 });
    const def = syntheticAIRating({ position: "CB", goals: 10, cardCount: 0, played: 10, winRate: 0.5, drawRate: 0, gpg: 1, cpg: 1 });
    expect(def).toBeGreaterThan(fwd);
  });
});

describe("computeSeasonAwards — empty/thin season handling", () => {
  it("returns all-null awards for a fresh save with no data", () => {
    const result = computeSeasonAwards({
      squad: [], teamName: "City", playerSeasonStats: {}, playerRatingTracker: {},
      league: null, seasonLeagueStats: null,
    });
    expect(result.goldenBoot).toBeNull();
    expect(result.playerOfSeason).toBeNull();
    expect(result.youngPlayerOfSeason).toBeNull();
  });

  it("does not crash when league has no table/teams", () => {
    const result = computeSeasonAwards({
      squad: [{ id: "p1", name: "Rossi", age: 24 }], teamName: "City",
      playerSeasonStats: { Rossi: { goals: 2, assists: 1, apps: 2 } },
      playerRatingTracker: {}, league: { teams: [], table: [] }, seasonLeagueStats: null,
    });
    expect(result.playerOfSeason).toBeNull(); // apps below MIN_APPS
  });
});

describe("computeSeasonAwards — player squad candidates", () => {
  it("excludes a player squad member below the minimum apps threshold", () => {
    const squad = [{ id: "p1", name: "Cameo", age: 22 }];
    const playerSeasonStats = { Cameo: { goals: 3, assists: 0, apps: MIN_APPS - 1 } };
    const result = computeSeasonAwards({
      squad, teamName: "City", playerSeasonStats, playerRatingTracker: {},
      league: null, seasonLeagueStats: null,
    });
    expect(result.playerOfSeason).toBeNull();
  });

  it("includes a qualifying player squad member using real avg rating", () => {
    const squad = [{ id: "p1", name: "Rossi", age: 24, position: "AM" }];
    const playerSeasonStats = { Rossi: { goals: 10, assists: 5, apps: 18 } };
    const playerRatingTracker = { p1: [7, 8, 7.5] };
    const result = computeSeasonAwards({
      squad, teamName: "City", playerSeasonStats, playerRatingTracker,
      league: null, seasonLeagueStats: null,
    });
    expect(result.playerOfSeason.winner.name).toBe("Rossi");
    expect(result.playerOfSeason.winner.avgRating).toBeCloseTo(7.5, 1);
  });
});

describe("computeSeasonAwards — AI squad candidates and league-wide scope", () => {
  function fakeLeague() {
    return {
      table: [{ teamIndex: 1, won: 10, drawn: 4, lost: 4, goalsFor: 30, goalsAgainst: 15 }],
      teams: [
        { isPlayer: true, squad: [] },
        {
          isPlayer: false, name: "Rovers",
          squad: [
            { id: "ai1", name: "Sterling", position: "ST", age: 20 },
            { id: "ai2", name: "Vet", position: "CB", age: 30 },
          ],
        },
      ],
    };
  }

  it("scopes Player of the Season league-wide to include AI squads", () => {
    const seasonLeagueStats = leagueStatsWithGoals([
      { name: "Sterling", teamId: 1, teamName: "Rovers", goals: 15 },
    ]);
    const result = computeSeasonAwards({
      squad: [], teamName: "City", playerSeasonStats: {}, playerRatingTracker: {},
      league: fakeLeague(), seasonLeagueStats,
    });
    expect(result.playerOfSeason).not.toBeNull();
    expect(result.playerOfSeason.nominees.some(n => n.name === "Sterling")).toBe(true);
  });

  it("scopes Young Player of the Season to age <= 21, using AI player age", () => {
    const seasonLeagueStats = leagueStatsWithGoals([
      { name: "Sterling", teamId: 1, teamName: "Rovers", goals: 15 },
      { name: "Vet", teamId: 1, teamName: "Rovers", goals: 12 },
    ]);
    const result = computeSeasonAwards({
      squad: [], teamName: "City", playerSeasonStats: {}, playerRatingTracker: {},
      league: fakeLeague(), seasonLeagueStats,
    });
    expect(result.youngPlayerOfSeason).not.toBeNull();
    const names = result.youngPlayerOfSeason.nominees.map(n => n.name);
    expect(names).toContain("Sterling"); // age 20
    expect(names).not.toContain("Vet"); // age 30
  });

  it("excludes AI teams that haven't played enough matches yet", () => {
    const league = fakeLeague();
    league.table[0] = { teamIndex: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0 }; // played=1 < MIN_APPS
    const result = computeSeasonAwards({
      squad: [], teamName: "City", playerSeasonStats: {}, playerRatingTracker: {},
      league, seasonLeagueStats: null,
    });
    expect(result.playerOfSeason).toBeNull();
  });
});

describe("copy builders", () => {
  it("return null when the award is null (thin/empty season)", () => {
    expect(buildGoldenBootBody(null)).toBeNull();
    expect(buildYoungPlayerOfSeasonBody(null)).toBeNull();
    expect(buildPlayerOfSeasonBody(null)).toBeNull();
  });

  it("builds the Golden Boot body with nominees then winner", () => {
    const goldenBoot = {
      winner: { name: "Louie Adams", teamName: "City", goals: 24 },
      nominees: [
        { name: "Louie Adams", teamName: "City", goals: 24 },
        { name: "Kwame Frimpong", teamName: "Rovers", goals: 21 },
        { name: "Samir Bello", teamName: "United", goals: 19 },
      ],
    };
    const body = buildGoldenBootBody(goldenBoot);
    expect(body).toBe("THE GOLDEN BOOT — nominees: Adams (24), Frimpong (21), Bello (19). Winner: LOUIE ADAMS — 24 league goals.");
  });

  it("builds the Young Player of the Season body with age", () => {
    const ypots = {
      winner: { name: "Sterling", teamName: "Rovers", age: 20, avgRating: 7.4, goals: 12, assists: 3 },
      nominees: [{ name: "Sterling", teamName: "Rovers", age: 20, avgRating: 7.4, goals: 12, assists: 3 }],
    };
    const body = buildYoungPlayerOfSeasonBody(ypots);
    expect(body).toContain("YOUNG PLAYER OF THE SEASON");
    expect(body).toContain("STERLING (age 20)");
    expect(body).toContain("7.4 avg rating");
  });

  it("builds the Player of the Season body with goals and assists", () => {
    const pots = {
      winner: { name: "Rossi", teamName: "City", age: 27, avgRating: 7.9, goals: 10, assists: 8 },
      nominees: [{ name: "Rossi", teamName: "City", age: 27, avgRating: 7.9, goals: 10, assists: 8 }],
    };
    const body = buildPlayerOfSeasonBody(pots);
    expect(body).toContain("PLAYER OF THE SEASON");
    expect(body).toContain("ROSSI —");
    expect(body).toContain("8 assists");
  });
});
