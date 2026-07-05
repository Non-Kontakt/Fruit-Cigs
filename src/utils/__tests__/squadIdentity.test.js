import { describe, it, expect } from "vitest";
import { classifySquadIdentity } from "../squadIdentity.js";

function makePlayer({ position, training = "balanced", attrs = {}, isTrial = false }) {
  return {
    position,
    training,
    isTrial,
    attrs: {
      pace: 10, shooting: 10, passing: 10, defending: 10, physical: 10, technique: 10, mental: 10,
      ...attrs,
    },
  };
}

// A flat, evenly-mixed squad: one player per training focus, no lean at all.
function balancedSquad() {
  return [
    makePlayer({ position: "GK", training: "balanced" }),
    makePlayer({ position: "CB", training: "defending" }),
    makePlayer({ position: "CB", training: "physical" }),
    makePlayer({ position: "LB", training: "pace" }),
    makePlayer({ position: "RB", training: "mental" }),
    makePlayer({ position: "CM", training: "passing" }),
    makePlayer({ position: "CM", training: "technique" }),
    makePlayer({ position: "AM", training: "shooting" }),
    makePlayer({ position: "LW", training: "balanced" }),
    makePlayer({ position: "RW", training: "defending" }),
    makePlayer({ position: "ST", training: "physical" }),
  ];
}

describe("classifySquadIdentity", () => {
  it("returns null for an empty or missing squad", () => {
    expect(classifySquadIdentity([])).toBeNull();
    expect(classifySquadIdentity(null)).toBeNull();
    expect(classifySquadIdentity(undefined)).toBeNull();
  });

  it("returns null when training focus is evenly spread and no attr leads", () => {
    expect(classifySquadIdentity(balancedSquad())).toBeNull();
  });

  it("classifies counter-attacking when 50%+ of outfield players train pace", () => {
    const squad = [
      makePlayer({ position: "GK", training: "balanced" }),
      makePlayer({ position: "CB", training: "pace" }),
      makePlayer({ position: "CB", training: "pace" }),
      makePlayer({ position: "LB", training: "pace" }),
      makePlayer({ position: "RB", training: "defending" }),
      makePlayer({ position: "CM", training: "passing" }),
      makePlayer({ position: "CM", training: "pace" }),
      makePlayer({ position: "AM", training: "mental" }),
      makePlayer({ position: "LW", training: "pace" }),
      makePlayer({ position: "RW", training: "pace" }),
      makePlayer({ position: "ST", training: "pace" }),
    ];
    expect(classifySquadIdentity(squad)).toBe("counter-attacking");
  });

  it("classifies counter-attacking via a clearly leading front-line pace average, without majority training share", () => {
    const squad = [
      makePlayer({ position: "GK", training: "balanced" }),
      makePlayer({ position: "CB", training: "defending", attrs: { pace: 8 } }),
      makePlayer({ position: "CB", training: "defending", attrs: { pace: 8 } }),
      makePlayer({ position: "LB", training: "defending", attrs: { pace: 9 } }),
      makePlayer({ position: "RB", training: "defending", attrs: { pace: 9 } }),
      makePlayer({ position: "CM", training: "passing", attrs: { pace: 9 } }),
      makePlayer({ position: "CM", training: "passing", attrs: { pace: 9 } }),
      makePlayer({ position: "AM", training: "mental", attrs: { pace: 9 } }),
      // Front line (FWD group) has a dramatically higher pace average than
      // the rest of the squad, with no single training focus dominating.
      makePlayer({ position: "LW", training: "shooting", attrs: { pace: 18 } }),
      makePlayer({ position: "RW", training: "technique", attrs: { pace: 18 } }),
      makePlayer({ position: "ST", training: "physical", attrs: { pace: 18 } }),
    ];
    expect(classifySquadIdentity(squad)).toBe("counter-attacking");
  });

  it("classifies defensive wall when 50%+ of outfield players train defending", () => {
    const squad = [
      makePlayer({ position: "GK", training: "balanced" }),
      makePlayer({ position: "CB", training: "defending" }),
      makePlayer({ position: "CB", training: "defending" }),
      makePlayer({ position: "LB", training: "defending" }),
      makePlayer({ position: "RB", training: "defending" }),
      makePlayer({ position: "CM", training: "defending" }),
      makePlayer({ position: "CM", training: "passing" }),
      makePlayer({ position: "AM", training: "mental" }),
      makePlayer({ position: "LW", training: "pace" }),
      makePlayer({ position: "RW", training: "shooting" }),
      makePlayer({ position: "ST", training: "physical" }),
    ];
    expect(classifySquadIdentity(squad)).toBe("defensive-wall");
  });

  it("classifies possession when 50%+ of outfield players train passing or technique", () => {
    const squad = [
      makePlayer({ position: "GK", training: "balanced" }),
      makePlayer({ position: "CB", training: "passing" }),
      makePlayer({ position: "CB", training: "technique" }),
      makePlayer({ position: "LB", training: "defending" }),
      makePlayer({ position: "RB", training: "physical" }),
      makePlayer({ position: "CM", training: "passing" }),
      makePlayer({ position: "CM", training: "technique" }),
      makePlayer({ position: "AM", training: "passing" }),
      makePlayer({ position: "LW", training: "pace" }),
      makePlayer({ position: "RW", training: "shooting" }),
      makePlayer({ position: "ST", training: "mental" }),
    ];
    expect(classifySquadIdentity(squad)).toBe("possession");
  });

  it("excludes goalkeepers and trialists from the outfield denominator", () => {
    const squad = [
      // 3 GKs all trained pace shouldn't count toward the outfield share.
      makePlayer({ position: "GK", training: "pace" }),
      makePlayer({ position: "GK", training: "pace" }),
      makePlayer({ position: "GK", training: "pace" }),
      makePlayer({ position: "CB", training: "defending" }),
      makePlayer({ position: "CB", training: "defending" }),
      makePlayer({ position: "LB", training: "defending" }),
      makePlayer({ position: "RB", training: "physical" }),
      makePlayer({ position: "CM", training: "passing" }),
      makePlayer({ position: "CM", training: "mental" }),
      makePlayer({ position: "ST", training: "shooting", isTrial: true }),
      // A trialist trained pace shouldn't inflate the outfield denominator
      // or be counted as part of the squad's real identity.
      makePlayer({ position: "ST", training: "pace", isTrial: true }),
    ];
    // Only 4/6 non-trial outfielders train defending — over the 50% bar —
    // so this should read as a defensive wall, not diluted by the trialists.
    expect(classifySquadIdentity(squad)).toBe("defensive-wall");
  });

  it("is deterministic — same input always yields the same output", () => {
    const squad = balancedSquad();
    const results = Array.from({ length: 20 }, () => classifySquadIdentity(squad));
    expect(new Set(results).size).toBe(1);
  });
});
