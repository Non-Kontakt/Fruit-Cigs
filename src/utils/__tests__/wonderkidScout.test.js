import { describe, it, expect } from "vitest";
import { pickWonderkidCandidate } from "../wonderkidScout.js";

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
