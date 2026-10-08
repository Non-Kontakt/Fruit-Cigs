import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveDiscipline } from "../matchDiscipline.js";
import { generatePenaltyShootout, simulateMatch, getTeamStrength } from "../match.js";
import { buildAIFiveASide } from "../fiveASide.js";

const positions = ["GK", "CB", "CB", "LB", "RB", "CM", "CM", "AM", "LW", "RW", "ST"];
function team(name) {
  return { name, id: name, squad: positions.map((position, i) => ({
    id: `${name}-${i}`, name: `${name} Player ${i}`, position,
    attrs: { pace: 12, shooting: 12, passing: 12, defending: 12, physical: 12, technique: 12, mental: 12 },
  })) };
}
function seedRandom(seed) {
  vi.spyOn(Math, "random").mockImplementation(() => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  });
}
afterEach(() => vi.restoreAllMocks());

describe("final discipline decisions", () => {
  const yellow = { minute: 10, type: "card", cardTeamName: "Home", cardPlayer: "Alex", cardPlayerId: "a" };
  it("no-cards removes yellows, direct reds and any potential VAR upgrade", () => {
    const goal = { type: "goal", minute: 20 };
    const result = resolveDiscipline([yellow, { ...yellow, type: "red_card", isDirectRed: true }, goal], { noCards: true, var: true }, () => 0);
    expect(result).toEqual({ events: [goal], redCards: [] });
  });
  it("VAR replaces the yellow before second-yellow counting and red consequences", () => {
    const result = resolveDiscipline([yellow, { ...yellow, minute: 30 }], { var: true }, () => 0);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ type: "red_card", redReason: "var_upgrade", isDirectRed: true, countsAsYellow: false });
    expect(result.redCards).toEqual([{ minute: 10, teamName: "Home" }]);
    expect(yellow.type).toBe("card");
  });
  it("second yellows retain both their yellow and red statistical meaning", () => {
    const result = resolveDiscipline([yellow, { ...yellow, minute: 30 }]);
    expect(result.events[1]).toMatchObject({ type: "red_card", countsAsYellow: true, redReason: "second_yellow" });
    expect(result.redCards).toEqual([{ minute: 30, teamName: "Home" }]);
  });
  it("honours an explicit zero VAR upgrade probability", () => {
    expect(resolveDiscipline([yellow], { var: true, varRedUpgradeChance: 0 }, () => 0).events[0].type).toBe("card");
  });
});

describe("penalty shootout invariants", () => {
  it.each(["home", "away"])("stops as soon as %s has clinched, without an extra kick", winner => {
    let index = 0;
    vi.spyOn(Math, "random").mockImplementation(() => ((index++ % 2 === 0) === (winner === "home")) ? 0 : 0.99);
    const result = generatePenaltyShootout(team("Home"), team("Away"));
    expect(result.winner).toBe(winner);
    expect(result.kicks).toHaveLength(6);
    expect([result.homeScore, result.awayScore].sort()).toEqual([0, 3]);
  });
  it.each([0, 0.5, 0.9999])("always resolves the sudden-death score, including long tails (random %s)", value => {
    vi.spyOn(Math, "random").mockReturnValue(value);
    const result = generatePenaltyShootout(team("Home"), team("Away"));
    expect(result.homeScore).not.toBe(result.awayScore);
    for (const side of ["home", "away"]) {
      expect(result[`${side}Score`]).toBe(result.kicks.filter(k => k.side === side && k.scored).length);
    }
    const final = result.kicks.slice(-2);
    expect(final[0].round).toBe(final[1].round);
    expect(final[0].scored).not.toBe(final[1].scored);
    if (value === 0.9999) expect(final[0].round).toBeGreaterThan(15);
  });
  it("includes the keeper and excludes departed players, balancing eligible numbers", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999);
    const home = team("Home");
    const away = team("Away");
    const sub = { ...home.squad[2], id: "sub", name: "Home Substitute", isBench: true };
    home.squad.push(sub);
    const events = [
      { type: "sub", side: "home", playerOff: home.squad[2].name, playerOn: sub.name },
      { type: "red_card", side: "home", cardPlayerId: home.squad[1].id },
    ];
    const result = generatePenaltyShootout(home, away, events);
    const homeKicks = result.kicks.filter(k => k.side === "home").map(k => k.player);
    expect(homeKicks).not.toContain(home.squad[1].name);
    expect(homeKicks).not.toContain(home.squad[2].name);
    expect(homeKicks).toContain(sub.name);
    expect(homeKicks).toContain(home.squad[0].name);
    expect(new Set(homeKicks.slice(0, 10)).size).toBe(10);
    expect(new Set(result.kicks.filter(k => k.side === "away").map(k => k.player)).size).toBe(10);
  });
  it("handles equal conversion chances symmetrically over a seeded sample", () => {
    seedRandom(42);
    const results = Array.from({ length: 4000 }, () => generatePenaltyShootout(team("Home"), team("Away")));
    const homeWins = results.filter(r => r.winner === "home").length / results.length;
    expect(homeWins).toBeGreaterThan(0.47);
    expect(homeWins).toBeLessThan(0.53);
  });
});

describe("actual match simulation", () => {
  it("removing weak starters cannot improve strength; five-a-side has its own denominator", () => {
    const home = { ...team("Home"), isPlayer: true };
    home.squad.forEach((p, i) => { p.attrs = Object.fromEntries(Object.keys(p.attrs).map(key => [key, i < 3 ? 20 : 1])); });
    const full = getTeamStrength(home, home.squad.map(p => p.id));
    for (let count = 0; count < 11; count++) {
      expect(getTeamStrength(home, home.squad.slice(0, count).map(p => p.id))).toBeLessThan(full);
    }
    const five = { ...team("Five"), squad: team("Five").squad.slice(0, 5) };
    expect(getTeamStrength(five, null, 5)).toBeCloseTo(12);
    expect(getTeamStrength(five, null, 11)).toBeLessThan(12);
  });

  it("prestige raises the attribute ceiling, not every player's baseline match rating", () => {
    function rated(cap) {
      const home = { ...team("Home"), isPlayer: true };
      const away = team("Away");
      for (const t of [home, away]) {
        t.squad.forEach(p => { p.attrs = Object.fromEntries(Object.keys(p.attrs).map(key => [key, cap / 2])); });
      }
      seedRandom(91);
      return simulateMatch(home, away, home.squad.map(p => p.id), [], true, 1, 0, null, 0, { ovrCap: cap }).playerRatings;
    }
    const normal = rated(20);
    expect(normal).toHaveLength(11);
    expect(rated(100)).toEqual(normal);
  });

  it("a reserve picked for the five-a-side fixture becomes a starter without mutating the league squad", () => {
    const full = team("Five");
    const reserve = { ...full.squad[10], id: "reserve", isBench: true, attrs: Object.fromEntries(Object.keys(full.squad[10].attrs).map(key => [key, 20])) };
    full.squad.push(reserve);
    const selected = buildAIFiveASide(full);
    expect(selected).toHaveLength(5);
    expect(selected.find(p => p.id === "reserve").isBench).toBe(false);
    expect(selected.every(p => !p.isBench)).toBe(true);
    expect(reserve.isBench).toBe(true);
  });

  it("counts every valid goal as a shot and honours no-cards through the whole pipeline", () => {
    seedRandom(17);
    let goals = 0;
    for (let i = 0; i < 150; i++) {
      const result = simulateMatch(team("Home"), team("Away"), null, null, false, 1, 0, null, 0, { noCards: true, var: true, cardFrequencyMult: 10 });
      expect(result.events.some(e => e.type === "card" || e.type === "red_card")).toBe(false);
      expect(result.redCards).toEqual([]);
      for (const side of ["home", "away"]) {
        expect(result[`${side}Shots`]).toBe(result.events.filter(e => e.side === side && ["goal", "shot", "chance"].includes(e.type)).length);
        expect(result[`${side}Shots`]).toBeGreaterThanOrEqual(result[`${side}Goals`]);
        goals += result[`${side}Goals`];
      }
    }
    expect(goals).toBeGreaterThan(0);
  });
});
