import { describe, it, expect } from "vitest";
import {
  computeGoldenBoot, computeSeasonAwards,
  buildGoldenBootBody, buildYoungPlayerOfSeasonBody, buildPlayerOfSeasonBody,
  collectAwardsNightAchievements,
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

// AI candidates must carry their canonical assists — a winning AI Player of
// the Season announcing "0 assists" while the league stats know better
// undermines the canonical-awards premise.
describe("computeSeasonAwards — AI assists from canonical stats", () => {
  it("reports the real canonical assist count for an AI winner", () => {
    let stats = emptyCompetitionStats();
    const events = [];
    for (let g = 0; g < 15; g++) events.push({ type: "goal", side: "home", player: "Sterling", assister: g < 6 ? "Vet" : null });
    for (let g = 0; g < 4; g++) events.push({ type: "goal", side: "home", player: "Vet", assister: "Sterling" });
    stats = accumulateMatchStats(stats, {
      matchId: "m1",
      result: { events },
      homeTeam: { id: 1, name: "Rovers", squad: [{ name: "Sterling", position: "ST" }, { name: "Vet", position: "CB" }] },
      awayTeam: { id: 2, name: "United", squad: [] },
    });
    const league = {
      table: [{ teamIndex: 1, won: 10, drawn: 4, lost: 4, goalsFor: 30, goalsAgainst: 15 }],
      teams: [
        { isPlayer: true, squad: [] },
        { isPlayer: false, name: "Rovers", squad: [{ id: "ai1", name: "Sterling", position: "ST", age: 24 }] },
      ],
    };
    const result = computeSeasonAwards({
      squad: [], teamName: "City", playerSeasonStats: {}, playerRatingTracker: {},
      league, seasonLeagueStats: stats,
    });
    expect(result.playerOfSeason).not.toBeNull();
    const winner = result.playerOfSeason.winner;
    expect(winner.name).toBe("Sterling");
    expect(winner.assists, "AI winner must carry canonical assists, not 0").toBe(4);
    expect(buildPlayerOfSeasonBody(result.playerOfSeason)).toContain("4 assists");
  });
});

describe("collectAwardsNightAchievements — Quince Cigs", () => {
  const bottomHalfLeague = {
    table: [
      { teamIndex: 0, points: 10 }, { teamIndex: 1, points: 40 }, { teamIndex: 2, points: 38 },
      { teamIndex: 3, points: 36 }, { teamIndex: 4, points: 34 }, { teamIndex: 5, points: 32 },
    ],
    teams: [
      { isPlayer: true, name: "Player FC" },
      { isPlayer: false, name: "Rivals" }, { isPlayer: false, name: "Third" },
      { isPlayer: false, name: "Fourth" }, { isPlayer: false, name: "Fifth" }, { isPlayer: false, name: "Sixth" },
    ],
  };
  const topHalfLeague = {
    table: [
      { teamIndex: 0, points: 40 }, { teamIndex: 1, points: 10 },
    ],
    teams: [{ isPlayer: true, name: "Player FC" }, { isPlayer: false, name: "Rivals" }],
  };
  const noAwards = { goldenBoot: null, playerOfSeason: null, youngPlayerOfSeason: null };
  const baseArgs = (extras = {}) => ({
    awards: noAwards, squad: [], teamName: "Player FC", playerSeasonStats: {},
    league: topHalfLeague, unlockedAchievements: new Set(),
    ...extras,
  });

  it("returns nothing when no awards were computed", () => {
    expect(collectAwardsNightAchievements(baseArgs())).toEqual([]);
  });

  it("top_of_the_bill when your player wins Player of the Season", () => {
    const awards = { ...noAwards, playerOfSeason: { winner: { name: "Adams", teamName: "Player FC", isPlayerTeam: true, age: 24 }, nominees: [] } };
    expect(collectAwardsNightAchievements(baseArgs({ awards }))).toContain("top_of_the_bill");
  });

  it("does NOT unlock top_of_the_bill for an AI winner", () => {
    const awards = { ...noAwards, playerOfSeason: { winner: { name: "Rival", teamName: "Rivals", isPlayerTeam: false, age: 24 }, nominees: [] } };
    expect(collectAwardsNightAchievements(baseArgs({ awards }))).not.toContain("top_of_the_bill");
  });

  it("no_country_for_old_men when a 33+ winner is yours", () => {
    const awards = { ...noAwards, playerOfSeason: { winner: { name: "Old Adams", teamName: "Player FC", isPlayerTeam: true, age: 35 }, nominees: [] } };
    expect(collectAwardsNightAchievements(baseArgs({ awards }))).toContain("no_country_for_old_men");
  });

  it("defenders_no_respect when the winning squad player is a DEF or GK", () => {
    const squad = [{ name: "Backline", position: "CB" }];
    const awards = { ...noAwards, playerOfSeason: { winner: { name: "Backline", teamName: "Player FC", isPlayerTeam: true, age: 26 }, nominees: [] } };
    const result = collectAwardsNightAchievements(baseArgs({ awards, squad }));
    expect(result).toContain("defenders_no_respect");
  });

  it("does NOT unlock defenders_no_respect for a forward", () => {
    const squad = [{ name: "Striker", position: "ST" }];
    const awards = { ...noAwards, playerOfSeason: { winner: { name: "Striker", teamName: "Player FC", isPlayerTeam: true, age: 26 }, nominees: [] } };
    expect(collectAwardsNightAchievements(baseArgs({ awards, squad }))).not.toContain("defenders_no_respect");
  });

  it("raised_right when a homegrown player wins Young Player of the Season", () => {
    const squad = [{ name: "Academy Kid", position: "CM", isYouthIntake: true }];
    const awards = { ...noAwards, youngPlayerOfSeason: { winner: { name: "Academy Kid", teamName: "Player FC", isPlayerTeam: true, age: 19 }, nominees: [] } };
    expect(collectAwardsNightAchievements(baseArgs({ awards, squad }))).toContain("raised_right");
  });

  it("does NOT unlock raised_right when the young winner wasn't youth intake/coup", () => {
    const squad = [{ name: "Bought Kid", position: "CM" }];
    const awards = { ...noAwards, youngPlayerOfSeason: { winner: { name: "Bought Kid", teamName: "Player FC", isPlayerTeam: true, age: 19 }, nominees: [] } };
    expect(collectAwardsNightAchievements(baseArgs({ awards, squad }))).not.toContain("raised_right");
  });

  it("doing_it_all when the same player wins POTS and YPOTS", () => {
    const awards = {
      ...noAwards,
      playerOfSeason: { winner: { name: "Wonderkid", teamName: "Player FC", isPlayerTeam: true, age: 19 }, nominees: [] },
      youngPlayerOfSeason: { winner: { name: "Wonderkid", teamName: "Player FC", isPlayerTeam: true, age: 19 }, nominees: [] },
    };
    expect(collectAwardsNightAchievements(baseArgs({ awards }))).toContain("doing_it_all");
  });

  it("clean_sweep when all three awards are yours", () => {
    const awards = {
      goldenBoot: { winner: { name: "Striker", teamName: "Player FC", goals: 22 }, nominees: [] },
      playerOfSeason: { winner: { name: "Playmaker", teamName: "Player FC", isPlayerTeam: true, age: 26 }, nominees: [] },
      youngPlayerOfSeason: { winner: { name: "Kid", teamName: "Player FC", isPlayerTeam: true, age: 19 }, nominees: [] },
    };
    expect(collectAwardsNightAchievements(baseArgs({ awards }))).toContain("clean_sweep");
  });

  it("robbed when a squad player hit 20+ goals but someone else won the Golden Boot", () => {
    const squad = [{ name: "Snubbed", position: "ST" }];
    const awards = { ...noAwards, goldenBoot: { winner: { name: "Rival Striker", teamName: "Rivals", goals: 25 }, nominees: [] } };
    const playerSeasonStats = { Snubbed: { goals: 21 } };
    expect(collectAwardsNightAchievements(baseArgs({ awards, squad, playerSeasonStats }))).toContain("robbed");
  });

  it("does NOT unlock robbed when the 20+ scorer IS the Golden Boot winner", () => {
    const squad = [{ name: "Striker", position: "ST" }];
    const awards = { ...noAwards, goldenBoot: { winner: { name: "Striker", teamName: "Player FC", goals: 25 }, nominees: [] } };
    const playerSeasonStats = { Striker: { goals: 25 } };
    expect(collectAwardsNightAchievements(baseArgs({ awards, squad, playerSeasonStats }))).not.toContain("robbed");
  });

  it("class_of_their_own when all three awards go to the same rival club", () => {
    const awards = {
      goldenBoot: { winner: { name: "A", teamName: "Rivals", goals: 22 }, nominees: [] },
      playerOfSeason: { winner: { name: "B", teamName: "Rivals", isPlayerTeam: false, age: 26 }, nominees: [] },
      youngPlayerOfSeason: { winner: { name: "C", teamName: "Rivals", isPlayerTeam: false, age: 19 }, nominees: [] },
    };
    expect(collectAwardsNightAchievements(baseArgs({ awards }))).toContain("class_of_their_own");
  });

  it("carried when your Golden Boot winner finishes in the bottom half", () => {
    const awards = { ...noAwards, goldenBoot: { winner: { name: "Striker", teamName: "Player FC", goals: 25 }, nominees: [] } };
    expect(collectAwardsNightAchievements(baseArgs({ awards, league: bottomHalfLeague }))).toContain("carried");
  });

  it("does NOT unlock carried when your Golden Boot winner finishes top half", () => {
    const awards = { ...noAwards, goldenBoot: { winner: { name: "Striker", teamName: "Player FC", goals: 25 }, nominees: [] } };
    expect(collectAwardsNightAchievements(baseArgs({ awards, league: topHalfLeague }))).not.toContain("carried");
  });

  it("respects already-unlocked state", () => {
    const awards = { ...noAwards, playerOfSeason: { winner: { name: "Adams", teamName: "Player FC", isPlayerTeam: true, age: 24 }, nominees: [] } };
    const result = collectAwardsNightAchievements(baseArgs({ awards, unlockedAchievements: new Set(["top_of_the_bill"]) }));
    expect(result).not.toContain("top_of_the_bill");
  });

  describe("repeat_offender — same player wins POTS twice", () => {
    it("unlocks when this season's POTS winner (name + team) matches a prior season's entry", () => {
      const awards = { ...noAwards, playerOfSeason: { winner: { name: "Adams", teamName: "Player FC", isPlayerTeam: true, age: 26 }, nominees: [] } };
      const awardsHistory = [{ season: 1, potsName: "Adams", potsTeam: "Player FC", isPlayerTeam: true, ypotsName: null, goldenBootName: null }];
      expect(collectAwardsNightAchievements(baseArgs({ awards, awardsHistory }))).toContain("repeat_offender");
    });

    it("does NOT unlock for a first-time winner with no prior history", () => {
      const awards = { ...noAwards, playerOfSeason: { winner: { name: "Adams", teamName: "Player FC", isPlayerTeam: true, age: 26 }, nominees: [] } };
      expect(collectAwardsNightAchievements(baseArgs({ awards, awardsHistory: [] }))).not.toContain("repeat_offender");
    });

    it("does NOT unlock when the name matches but the team differs (transfer)", () => {
      const awards = { ...noAwards, playerOfSeason: { winner: { name: "Adams", teamName: "New Club", isPlayerTeam: false, age: 26 }, nominees: [] } };
      const awardsHistory = [{ season: 1, potsName: "Adams", potsTeam: "Player FC", isPlayerTeam: true, ypotsName: null, goldenBootName: null }];
      expect(collectAwardsNightAchievements(baseArgs({ awards, awardsHistory }))).not.toContain("repeat_offender");
    });

    it("does NOT unlock when a different player won this season", () => {
      const awards = { ...noAwards, playerOfSeason: { winner: { name: "Someone Else", teamName: "Player FC", isPlayerTeam: true, age: 26 }, nominees: [] } };
      const awardsHistory = [{ season: 1, potsName: "Adams", potsTeam: "Player FC", isPlayerTeam: true, ypotsName: null, goldenBootName: null }];
      expect(collectAwardsNightAchievements(baseArgs({ awards, awardsHistory }))).not.toContain("repeat_offender");
    });

    it("respects already-unlocked state", () => {
      const awards = { ...noAwards, playerOfSeason: { winner: { name: "Adams", teamName: "Player FC", isPlayerTeam: true, age: 26 }, nominees: [] } };
      const awardsHistory = [{ season: 1, potsName: "Adams", potsTeam: "Player FC", isPlayerTeam: true, ypotsName: null, goldenBootName: null }];
      const result = collectAwardsNightAchievements(baseArgs({ awards, awardsHistory, unlockedAchievements: new Set(["repeat_offender"]) }));
      expect(result).not.toContain("repeat_offender");
    });
  });
});
