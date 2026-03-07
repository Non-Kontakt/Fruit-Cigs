import { describe, it, expect } from "vitest";
import { generateFixtures, simulateMatch, getTeamStrength } from "../utils/match.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const POSITIONS = ["GK", "CB", "CB", "LB", "RB", "CM", "CM", "AM", "LW", "RW", "ST"];

function makeSquad(ovr, isBench = false) {
  return POSITIONS.map((pos, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    position: pos,
    isBench,
    attrs: {
      pace: ovr, shooting: ovr, passing: ovr,
      defending: ovr, physical: ovr, technique: ovr, mental: ovr,
    },
  }));
}

function makeTeam(ovr, name = "Team", trait = null) {
  return { name, isPlayer: false, trait, squad: makeSquad(ovr) };
}

// ─── generateFixtures ─────────────────────────────────────────────────────────

describe("generateFixtures", () => {
  for (const n of [8, 10, 12, 16]) {
    it(`${n} teams: every team plays every other exactly twice (home + away)`, () => {
      const weeks = generateFixtures(n);
      const expectedMatchweeks = (n - 1) * 2;
      expect(weeks.length).toBe(expectedMatchweeks);

      // Count home and away appearances for each team
      const homeCount = new Array(n).fill(0);
      const awayCount = new Array(n).fill(0);
      // Track head-to-head pairs: [home][away] = count
      const h2h = Array.from({ length: n }, () => new Array(n).fill(0));

      for (const week of weeks) {
        for (const { home, away } of week) {
          homeCount[home]++;
          awayCount[away]++;
          h2h[home][away]++;
        }
      }

      for (let i = 0; i < n; i++) {
        // Each team plays (n-1)*2 total games
        expect(homeCount[i] + awayCount[i]).toBe((n - 1) * 2);
        // Balanced home/away
        expect(homeCount[i]).toBe(n - 1);
        expect(awayCount[i]).toBe(n - 1);

        for (let j = 0; j < n; j++) {
          if (i === j) {
            // No team plays itself
            expect(h2h[i][j]).toBe(0);
          } else {
            // Each team is the home team against each opponent exactly once
            expect(h2h[i][j]).toBe(1);
          }
        }
      }
    });
  }

  it("returns correct number of matches per matchweek", () => {
    const n = 10;
    const weeks = generateFixtures(n);
    for (const week of weeks) {
      expect(week.length).toBe(n / 2);
    }
  });

  it("each team appears exactly once per matchweek", () => {
    const n = 8;
    const weeks = generateFixtures(n);
    for (const week of weeks) {
      const seen = new Set();
      for (const { home, away } of week) {
        expect(seen.has(home)).toBe(false);
        expect(seen.has(away)).toBe(false);
        seen.add(home);
        seen.add(away);
      }
    }
  });
});

// ─── getTeamStrength ──────────────────────────────────────────────────────────

describe("getTeamStrength", () => {
  it("returns average OVR of non-bench players", () => {
    const team = makeTeam(10);
    // All attrs=10, all positions → weighted OVR = 10
    const str = getTeamStrength(team, null);
    expect(str).toBeCloseTo(10, 1);
  });

  it("stronger squad returns higher strength", () => {
    const weak = makeTeam(5);
    const strong = makeTeam(15);
    expect(getTeamStrength(strong, null)).toBeGreaterThan(getTeamStrength(weak, null));
  });

  it("returns 5 for empty squad", () => {
    expect(getTeamStrength({ isPlayer: false, squad: [] }, null)).toBe(5);
  });
});

// ─── simulateMatch — outcome distributions ────────────────────────────────────

describe("simulateMatch (statistical)", () => {
  const RUNS = 2000;

  function runMatches(homeOvr, awayOvr, runs = RUNS) {
    const home = makeTeam(homeOvr, "Home");
    const away = makeTeam(awayOvr, "Away");
    let homeWins = 0, draws = 0, awayWins = 0;
    for (let i = 0; i < runs; i++) {
      const r = simulateMatch(home, away, null, null, false, 1.0);
      if (r.homeGoals > r.awayGoals) homeWins++;
      else if (r.homeGoals === r.awayGoals) draws++;
      else awayWins++;
    }
    return { homeWins, draws, awayWins, total: runs };
  }

  it("equal teams: home wins 35–55%, draws 18–35%, away wins 20–40%", () => {
    const { homeWins, draws, awayWins } = runMatches(10, 10);
    expect(homeWins / RUNS).toBeGreaterThan(0.35);
    expect(homeWins / RUNS).toBeLessThan(0.55);
    expect(draws / RUNS).toBeGreaterThan(0.18);
    expect(draws / RUNS).toBeLessThan(0.35);
    expect(awayWins / RUNS).toBeGreaterThan(0.20);
    expect(awayWins / RUNS).toBeLessThan(0.40);
    // They sum to 1
    expect(homeWins + draws + awayWins).toBe(RUNS);
  });

  it("significantly stronger home team (OVR 15 vs 5) wins more than 65% of matches", () => {
    const { homeWins } = runMatches(15, 5);
    expect(homeWins / RUNS).toBeGreaterThan(0.65);
  });

  it("significantly stronger away team (OVR 15 vs 5) wins more than 40% of matches", () => {
    const { awayWins } = runMatches(5, 15);
    expect(awayWins / RUNS).toBeGreaterThan(0.40);
  });

  it("goal totals never exceed 24 per match (Poisson cap of 12 per team)", () => {
    const home = makeTeam(20, "Home");
    const away = makeTeam(20, "Away");
    for (let i = 0; i < RUNS; i++) {
      const r = simulateMatch(home, away, null, null, false, 1.0);
      expect(r.homeGoals + r.awayGoals).toBeLessThanOrEqual(24);
      expect(r.homeGoals).toBeLessThanOrEqual(12);
      expect(r.awayGoals).toBeLessThanOrEqual(12);
      expect(r.homeGoals).toBeGreaterThanOrEqual(0);
      expect(r.awayGoals).toBeGreaterThanOrEqual(0);
    }
  });

  it("neutral venue: home advantage is absent (home win rate lower than non-neutral)", () => {
    const home = makeTeam(10, "Home");
    const away = makeTeam(10, "Away");
    let neutralHomeWins = 0, normalHomeWins = 0;
    for (let i = 0; i < RUNS; i++) {
      if (simulateMatch(home, away, null, null, true,  1.0).homeGoals > simulateMatch(home, away, null, null, true, 1.0).awayGoals) neutralHomeWins++;
      if (simulateMatch(home, away, null, null, false, 1.0).homeGoals > simulateMatch(home, away, null, null, false, 1.0).awayGoals) normalHomeWins++;
    }
    // Neutral should have a lower home win rate than normal home advantage
    expect(neutralHomeWins).toBeLessThan(normalHomeWins);
  });

  it("result object has expected shape", () => {
    const r = simulateMatch(makeTeam(10), makeTeam(10), null, null, false, 1.0);
    expect(typeof r.homeGoals).toBe("number");
    expect(typeof r.awayGoals).toBe("number");
    expect(Array.isArray(r.events)).toBe(true);
    expect(typeof r.scorers).toBe("object");
    expect(typeof r.assisters).toBe("object");
  });
});
