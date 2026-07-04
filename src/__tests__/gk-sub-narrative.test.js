import { describe, it, expect } from "vitest";
import { simulateMatch } from "../utils/match.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const STARTING_XI_POSITIONS = ["GK", "CB", "CB", "LB", "RB", "CM", "CM", "AM", "LW", "RW", "ST"];

function makeStarters(ovr = 70) {
  return STARTING_XI_POSITIONS.map((pos, i) => ({
    id: `s${i}`, name: `Starter ${i}`, position: pos, isBench: false,
    attrs: { pace: ovr, shooting: ovr, passing: ovr, defending: ovr, physical: ovr, technique: ovr, mental: ovr },
  }));
}

function makeFullBenchTeam(ovr = 70) {
  const bench = ["GK", "CB", "CM", "ST", "LW"].map((pos, i) => ({
    id: `b${i}`, name: `Bench ${i}`, position: pos, isBench: true,
    attrs: { pace: ovr, shooting: ovr, passing: ovr, defending: ovr, physical: ovr, technique: ovr, mental: ovr },
  }));
  return { name: "Opponent", isPlayer: false, trait: null, squad: [...makeStarters(ovr), ...bench] };
}

// Home team under test: bench of exactly one GK + one outfielder.
function makeSlimBenchTeam(benchPositions, ovr = 70) {
  const bench = benchPositions.map((pos, i) => ({
    id: `hb${i}`, name: `HomeBench ${i}`, position: pos, isBench: true,
    attrs: { pace: ovr, shooting: ovr, passing: ovr, defending: ovr, physical: ovr, technique: ovr, mental: ovr },
  }));
  return { name: "Home", isPlayer: false, trait: null, squad: [...makeStarters(ovr), ...bench] };
}

// ─── generateSubs (via simulateMatch) — GK narrative constraint ──────────────

describe("substitution narrative never puts a keeper on for an outfield player", () => {
  it("with a bench of [GK, outfielder], no sub event ever brings the GK on", () => {
    const home = makeSlimBenchTeam(["GK", "CB"]);
    const away = makeFullBenchTeam();
    const gkBenchName = home.squad.find(p => p.position === "GK" && p.isBench).name;

    let sawAnySub = false;
    for (let i = 0; i < 300; i++) {
      const r = simulateMatch(home, away, null, null, false, 1.0);
      for (const ev of r.events) {
        if (ev.type !== "sub" || ev.side !== "home") continue;
        sawAnySub = true;
        expect(ev.playerOn).not.toBe(gkBenchName);
      }
    }
    // Sanity: the scenario is exercised often enough for the assertions above to mean something.
    expect(sawAnySub).toBe(true);
  });

  it("with a GK-only bench, no sub event is ever generated for that team", () => {
    const home = makeSlimBenchTeam(["GK"]);
    const away = makeFullBenchTeam();

    for (let i = 0; i < 300; i++) {
      const r = simulateMatch(home, away, null, null, false, 1.0);
      const homeSubs = r.events.filter(ev => ev.type === "sub" && ev.side === "home");
      expect(homeSubs.length).toBe(0);
    }
  });
});
