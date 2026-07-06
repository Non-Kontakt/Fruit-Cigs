import { describe, it, expect } from "vitest";
import { resolveKnockoutPromotion } from "../league.js";

const dynastyMod = { knockoutAtEnd: true };
const wxiMod = { miniTournament: true };
const plainMod = {};

describe("resolveKnockoutPromotion — Dynasty Cup (Euro Dynasty, tier 3)", () => {
  it("4th place + Dynasty Cup winner is promoted", () => {
    const newTier = resolveKnockoutPromotion({
      mod: dynastyMod, currentTier: 3, position: 4, newTier: 3,
      miniTournamentBracket: null,
      dynastyCupBracket: { winner: { isPlayer: true } },
    });
    expect(newTier).toBe(2);
  });

  it("4th place + Dynasty Cup runner-up is NOT promoted", () => {
    const newTier = resolveKnockoutPromotion({
      mod: dynastyMod, currentTier: 3, position: 4, newTier: 3,
      miniTournamentBracket: null,
      dynastyCupBracket: { winner: { isPlayer: false }, final: { home: { isPlayer: true }, away: { isPlayer: false } } },
    });
    expect(newTier).toBe(3);
  });

  it("1st place who lost the cup is still promoted by position", () => {
    const newTier = resolveKnockoutPromotion({
      mod: dynastyMod, currentTier: 3, position: 1, newTier: 3,
      miniTournamentBracket: null,
      dynastyCupBracket: { winner: { isPlayer: false } },
    });
    expect(newTier).toBe(2);
  });

  it("a cup win overrides an incoming relegation: 4th-place winner is promoted to exactly currentTier - 1", () => {
    // newTier arrives as relegation (4) but the cup win promotes — and the
    // promotion is exactly one tier up from currentTier, never more.
    const newTier = resolveKnockoutPromotion({
      mod: dynastyMod, currentTier: 3, position: 4, newTier: 4,
      miniTournamentBracket: null,
      dynastyCupBracket: { winner: { isPlayer: true } },
    });
    expect(newTier).toBe(2);
  });

  it("top-1 tier (no promotion possible) leaves newTier untouched even if cup won", () => {
    const newTier = resolveKnockoutPromotion({
      mod: dynastyMod, currentTier: 1, position: 4, newTier: 1,
      miniTournamentBracket: null,
      dynastyCupBracket: { winner: { isPlayer: true } },
    });
    expect(newTier).toBe(1);
  });

  it("no bracket at all (didn't qualify) falls back to pure position rule", () => {
    const promotedByPosition = resolveKnockoutPromotion({
      mod: dynastyMod, currentTier: 3, position: 2, newTier: 3,
      miniTournamentBracket: null, dynastyCupBracket: null,
    });
    expect(promotedByPosition).toBe(2);

    const stayedMidTable = resolveKnockoutPromotion({
      mod: dynastyMod, currentTier: 3, position: 6, newTier: 3,
      miniTournamentBracket: null, dynastyCupBracket: null,
    });
    expect(stayedMidTable).toBe(3);
  });
});

describe("resolveKnockoutPromotion — World XI Mini-Tournament (unchanged behaviour)", () => {
  it("mini-tournament runner-up is still promoted (existing top-3-of-bracket rule)", () => {
    const bkt = { winner: { name: "A", isPlayer: false }, final: { home: { name: "A", isPlayer: false }, away: { name: "B", isPlayer: true } } };
    const newTier = resolveKnockoutPromotion({
      mod: wxiMod, currentTier: 2, position: 6, newTier: 2,
      miniTournamentBracket: bkt, dynastyCupBracket: null,
    });
    expect(newTier).toBe(1);
  });

  it("mini-tournament semi-finalist (not top 3 of bracket) falls back to league position", () => {
    const bkt = { winner: { name: "A", isPlayer: false }, final: { home: { name: "A", isPlayer: false }, away: { name: "C", isPlayer: false } } };
    const newTier = resolveKnockoutPromotion({
      mod: wxiMod, currentTier: 2, position: 6, newTier: 2,
      miniTournamentBracket: bkt, dynastyCupBracket: null,
    });
    expect(newTier).toBe(2);
  });
});

describe("resolveKnockoutPromotion — plain tiers (no knockout modifier)", () => {
  it("top 3 promoted by position as before", () => {
    const newTier = resolveKnockoutPromotion({
      mod: plainMod, currentTier: 7, position: 3, newTier: 7,
      miniTournamentBracket: null, dynastyCupBracket: null,
    });
    expect(newTier).toBe(6);
  });

  it("4th place stays", () => {
    const newTier = resolveKnockoutPromotion({
      mod: plainMod, currentTier: 7, position: 4, newTier: 7,
      miniTournamentBracket: null, dynastyCupBracket: null,
    });
    expect(newTier).toBe(7);
  });
});
