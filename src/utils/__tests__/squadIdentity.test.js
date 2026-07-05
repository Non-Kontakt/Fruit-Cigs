import { describe, it, expect } from "vitest";
import { classifySquadIdentity } from "../squadIdentity.js";
import { generateSquad } from "../player.js";

function makePlayer({ position, training = "balanced", isTrial = false }) {
  return { position, training, isTrial };
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

  it("returns null when training focus is evenly spread with no single-family majority", () => {
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

  // Regression for #255: the attribute-average route used to fire on
  // ordinary positional stat bias (defenders naturally lead defending,
  // forwards naturally lead pace, etc.) even with no deliberate training
  // identity. generateSquad() assigns training: null to every player, so
  // none of them can clear the 50% focus-family bar — every freshly
  // generated squad must classify as null.
  it("returns null for every freshly generated squad on null training (N=30)", () => {
    const N = 30;
    const results = Array.from({ length: N }, () => classifySquadIdentity(generateSquad()));
    expect(results.every((r) => r === null)).toBe(true);
  });
});
