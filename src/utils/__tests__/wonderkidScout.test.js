import { describe, it, expect } from "vitest";
import { pickWonderkidCandidate, pickContinentalCandidate } from "../wonderkidScout.js";

function makePlayer({ name, age, position = "ST", attrs, potential }) {
  return { id: name, name, age, position, attrs, potential };
}

// Flat attrs so getOverall(player) resolves to a known, easy-to-reason-about value.
const flatAttrs = (v) => ({ pace: v, shooting: v, passing: v, defending: v, physical: v, technique: v, mental: v });

describe("pickWonderkidCandidate", () => {
  it("finds a qualifying young player with a big potential gap", () => {
    const squads = new Map([
      ["Rovers", [
        makePlayer({ name: "Ordinary Vet", age: 27, attrs: flatAttrs(10), potential: 12 }),
        makePlayer({ name: "Prodigy", age: 19, attrs: flatAttrs(8), potential: 15 }),
      ]],
    ]);
    const result = pickWonderkidCandidate(squads, ["Rovers"]);
    expect(result).not.toBeNull();
    expect(result.player.name).toBe("Prodigy");
    expect(result.teamName).toBe("Rovers");
  });

  it("returns null when nobody qualifies (age too old)", () => {
    const squads = new Map([
      ["Rovers", [
        makePlayer({ name: "Late Bloomer", age: 26, attrs: flatAttrs(8), potential: 15 }),
      ]],
    ]);
    expect(pickWonderkidCandidate(squads, ["Rovers"])).toBeNull();
  });

  it("returns null when the gap is below the threshold", () => {
    const squads = new Map([
      ["Rovers", [
        makePlayer({ name: "Solid Kid", age: 19, attrs: flatAttrs(10), potential: 13 }), // gap of 3
      ]],
    ]);
    expect(pickWonderkidCandidate(squads, ["Rovers"])).toBeNull();
  });

  it("returns null when no squads are supplied for the given teams", () => {
    const squads = new Map();
    expect(pickWonderkidCandidate(squads, ["Nonexistent FC"])).toBeNull();
  });

  it("only considers teams in the given team-name list", () => {
    const squads = new Map([
      ["In Scope", [makePlayer({ name: "Vet", age: 30, attrs: flatAttrs(10), potential: 11 })]],
      ["Out Of Scope", [makePlayer({ name: "Hidden Gem", age: 18, attrs: flatAttrs(8), potential: 15 })]],
    ]);
    expect(pickWonderkidCandidate(squads, ["In Scope"])).toBeNull();
  });

  it("never returns a player whose name/team isn't actually in the supplied squads", () => {
    const squads = new Map([
      ["Rovers", [
        makePlayer({ name: "Prodigy", age: 19, attrs: flatAttrs(8), potential: 15 }),
      ]],
    ]);
    const result = pickWonderkidCandidate(squads, ["Rovers"]);
    const squad = squads.get(result.teamName);
    expect(squad.some(p => p.name === result.player.name)).toBe(true);
  });
});


describe("pickContinentalCandidate — Continental Contacts picks a real, actionable prospect", () => {
  const mk = (id, nat, age, potential) => ({ id, name: `N ${id}`, position: "ST", nationality: nat, age, potential, attrs: { pace: 5, shooting: 5, passing: 5, defending: 5, physical: 5, technique: 5, mentality: 5 } });
  const squads = new Map([
    ["Rovers", [mk("a", "ENG", 19, 18), mk("b", "FRA", 21, 14)]],
    ["United", [mk("c", "BRA", 22, 16), mk("d", "ESP", 27, 19)]],
  ]);
  it("picks the highest-potential non-ENG player aged 23 or under", () => {
    const tip = pickContinentalCandidate(squads, ["Rovers", "United"]);
    expect(tip.player.id).toBe("c"); // BRA 22yo pot 16 beats FRA pot 14; ENG and 27yo excluded
    expect(tip.teamName).toBe("United");
  });
  it("null when no team fields a qualifying foreigner", () => {
    const allEng = new Map([["Rovers", [mk("a", "ENG", 19, 18)]]]);
    expect(pickContinentalCandidate(allEng, ["Rovers"])).toBe(null);
    expect(pickContinentalCandidate(squads, ["Nobody FC"])).toBe(null);
  });
});
