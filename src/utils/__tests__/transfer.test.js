import { describe, it, expect } from "vitest";
import {
  getOfferValueRatio, countDistinctOfferTargets, decrementOfferExpiry, getPlayersTradedAwayThisSeason,
  reachedUnderSiegeThreshold, tradedAwayFreeSignedPlayer, signedTippedWonderkid,
  signedSameWeekAsReveal, countPassiveRevealSignings, resolveLoyaltyWatch,
} from "../transfer.js";

function makePlayer(id, position, ovr, extra = {}) {
  // Uniform attrs so getOverall() resolves to exactly `ovr` regardless of
  // position weighting (weights sum to 1.00 per position).
  return {
    id, name: id, position,
    attrs: { pace: ovr, shooting: ovr, passing: ovr, defending: ovr, physical: ovr, technique: ovr, mental: ovr },
    age: 24,
    ...extra,
  };
}

describe("getOfferValueRatio", () => {
  it("returns receivedValue / givenValue", () => {
    const offer = { aiWants: [makePlayer("low", "ST", 10)], aiOffers: [makePlayer("high", "ST", 18)] };
    const ratio = getOfferValueRatio(offer);
    expect(ratio).toBeGreaterThan(1);
  });

  it("returns 0 when aiWants has no value (nothing to divide by)", () => {
    expect(getOfferValueRatio({ aiWants: [], aiOffers: [makePlayer("a", "ST", 15)] })).toBe(0);
  });

  it("handles missing offer gracefully", () => {
    expect(getOfferValueRatio(undefined)).toBe(0);
    expect(getOfferValueRatio({})).toBe(0);
  });

  it("Daylight Robbery threshold: received worth double what's given", () => {
    // A big OVR gap reliably produces a >=2x value ratio (exponential curve).
    const offer = { aiWants: [makePlayer("low", "ST", 8)], aiOffers: [makePlayer("high", "ST", 20)] };
    expect(getOfferValueRatio(offer)).toBeGreaterThanOrEqual(2);
  });

  it("Fire Sale threshold: received worth less than half what's given", () => {
    const offer = { aiWants: [makePlayer("high", "ST", 20)], aiOffers: [makePlayer("low", "ST", 8)] };
    expect(getOfferValueRatio(offer)).toBeLessThan(0.5);
  });
});

describe("countDistinctOfferTargets", () => {
  it("counts distinct aiWants ids across offers", () => {
    const offers = [
      { aiWants: [makePlayer("p1", "ST", 12)] },
      { aiWants: [makePlayer("p2", "CM", 12)] },
      { aiWants: [makePlayer("p3", "GK", 12)] },
    ];
    expect(countDistinctOfferTargets(offers)).toBe(3);
  });

  it("does not double-count the same player wanted by two offers", () => {
    const offers = [
      { aiWants: [makePlayer("p1", "ST", 12)] },
      { aiWants: [makePlayer("p1", "ST", 12)] },
    ];
    expect(countDistinctOfferTargets(offers)).toBe(1);
  });

  it("returns 0 for no offers", () => {
    expect(countDistinctOfferTargets([])).toBe(0);
    expect(countDistinctOfferTargets(undefined)).toBe(0);
  });
});

describe("decrementOfferExpiry", () => {
  it("decrements expiresWeeks and keeps offers still alive", () => {
    const offers = [{ id: "a", expiresWeeks: 3 }, { id: "b", expiresWeeks: 2 }];
    const { offers: kept, anyExpired } = decrementOfferExpiry(offers);
    expect(kept.map(o => o.id)).toEqual(["a", "b"]);
    expect(kept.map(o => o.expiresWeeks)).toEqual([2, 1]);
    expect(anyExpired).toBe(false);
  });

  it("drops an offer that reaches zero and reports anyExpired", () => {
    const offers = [{ id: "a", expiresWeeks: 1 }, { id: "b", expiresWeeks: 3 }];
    const { offers: kept, anyExpired } = decrementOfferExpiry(offers);
    expect(kept.map(o => o.id)).toEqual(["b"]);
    expect(anyExpired).toBe(true);
  });

  it("defaults missing expiresWeeks to 1 (expires this tick)", () => {
    const { anyExpired } = decrementOfferExpiry([{ id: "a" }]);
    expect(anyExpired).toBe(true);
  });

  it("handles an empty/undefined list", () => {
    expect(decrementOfferExpiry([])).toEqual({ offers: [], anyExpired: false });
    expect(decrementOfferExpiry(undefined)).toEqual({ offers: [], anyExpired: false });
  });
});

describe("getPlayersTradedAwayThisSeason", () => {
  it("collects names from `offered` entries matching the given season", () => {
    const transferHistory = [
      { season: 2, offered: [{ name: "Sold Guy" }] },
      { season: 3, offered: [{ name: "Not This Season" }] },
    ];
    const names = getPlayersTradedAwayThisSeason(transferHistory, 2);
    expect(names.has("Sold Guy")).toBe(true);
    expect(names.has("Not This Season")).toBe(false);
  });

  it("returns an empty set when there's no history", () => {
    expect(getPlayersTradedAwayThisSeason([], 1).size).toBe(0);
    expect(getPlayersTradedAwayThisSeason(undefined, 1).size).toBe(0);
  });

  it("merges multiple trades and multiple offered players within the season", () => {
    const transferHistory = [
      { season: 1, offered: [{ name: "A" }, { name: "B" }] },
      { season: 1, offered: [{ name: "C" }] },
    ];
    const names = getPlayersTradedAwayThisSeason(transferHistory, 1);
    expect([...names].sort()).toEqual(["A", "B", "C"]);
  });
});

describe("reachedUnderSiegeThreshold", () => {
  it("false below 5", () => {
    expect(reachedUnderSiegeThreshold(4)).toBe(false);
  });
  it("true at exactly 5", () => {
    expect(reachedUnderSiegeThreshold(5)).toBe(true);
  });
  it("true above 5", () => {
    expect(reachedUnderSiegeThreshold(6)).toBe(true);
  });
});

describe("tradedAwayFreeSignedPlayer — Pure Profit", () => {
  it("true when one of the outgoing players has signedOnFree", () => {
    const outgoing = [makePlayer("a", "ST", 12), makePlayer("b", "ST", 12, { signedOnFree: true })];
    expect(tradedAwayFreeSignedPlayer(outgoing)).toBe(true);
  });
  it("false when nobody outgoing was signed on a free", () => {
    const outgoing = [makePlayer("a", "ST", 12), makePlayer("b", "ST", 12)];
    expect(tradedAwayFreeSignedPlayer(outgoing)).toBe(false);
  });
  it("handles empty/undefined", () => {
    expect(tradedAwayFreeSignedPlayer([])).toBe(false);
    expect(tradedAwayFreeSignedPlayer(undefined)).toBe(false);
  });
});

describe("signedTippedWonderkid — Catch Of The Day", () => {
  it("true when an incoming player's id is in the wonderkid tips set", () => {
    const incoming = [makePlayer("wk1", "ST", 14)];
    expect(signedTippedWonderkid(incoming, new Set(["wk1"]))).toBe(true);
  });
  it("false when no incoming player was tipped", () => {
    const incoming = [makePlayer("other", "ST", 14)];
    expect(signedTippedWonderkid(incoming, new Set(["wk1"]))).toBe(false);
  });
  it("false with an empty or missing tips set", () => {
    const incoming = [makePlayer("wk1", "ST", 14)];
    expect(signedTippedWonderkid(incoming, new Set())).toBe(false);
    expect(signedTippedWonderkid(incoming, undefined)).toBe(false);
  });
});

describe("signedSameWeekAsReveal — Strike While It's Hot", () => {
  it("true when an incoming player's reveal week matches the current week", () => {
    const incoming = [makePlayer("p1", "ST", 14)];
    const meta = { p1: { week: 10, method: "passive" } };
    expect(signedSameWeekAsReveal(incoming, meta, 10)).toBe(true);
  });
  it("false when the reveal happened a different week", () => {
    const incoming = [makePlayer("p1", "ST", 14)];
    const meta = { p1: { week: 8, method: "passive" } };
    expect(signedSameWeekAsReveal(incoming, meta, 10)).toBe(false);
  });
  it("false when the player has no reveal record", () => {
    const incoming = [makePlayer("p1", "ST", 14)];
    expect(signedSameWeekAsReveal(incoming, {}, 10)).toBe(false);
    expect(signedSameWeekAsReveal(incoming, null, 10)).toBe(false);
  });
});

describe("resolveLoyaltyWatch — Loyalty Repaid", () => {
  const watch = { playerId: "p1", playerName: "Watched Guy" };

  it("not resolved when the watched player didn't appear in this match", () => {
    const result = resolveLoyaltyWatch(watch, new Set(["other"]), "Watched Guy", "Watched Guy");
    expect(result).toEqual({ appeared: false, scoredWinner: false });
  });

  it("resolves (clears) but no unlock when he appeared without scoring the winner", () => {
    const result = resolveLoyaltyWatch(watch, new Set(["p1"]), null, "Watched Guy");
    expect(result).toEqual({ appeared: true, scoredWinner: false });
  });

  it("resolves with scoredWinner when he appeared and scored the winning goal", () => {
    const result = resolveLoyaltyWatch(watch, new Set(["p1"]), "Watched Guy", "Watched Guy");
    expect(result).toEqual({ appeared: true, scoredWinner: true });
  });

  it("matches against the player's current match-log name, not the stale watch name (renamed since rejection)", () => {
    const result = resolveLoyaltyWatch(watch, new Set(["p1"]), "New Name", "New Name");
    expect(result.scoredWinner).toBe(true);
  });

  it("no-op with a null watch", () => {
    expect(resolveLoyaltyWatch(null, new Set(["p1"]), "Watched Guy", "Watched Guy")).toEqual({ appeared: false, scoredWinner: false });
  });
});

describe("countPassiveRevealSignings — Trust The Process", () => {
  it("counts only players revealed via the passive timer", () => {
    const incoming = [makePlayer("p1", "ST", 14), makePlayer("p2", "CM", 12), makePlayer("p3", "GK", 10)];
    const meta = {
      p1: { week: 5, method: "passive" },
      p2: { week: 6, method: "dossier" },
      p3: { week: 7, method: "passive" },
    };
    expect(countPassiveRevealSignings(incoming, meta)).toBe(2);
  });
  it("returns 0 when nobody has reveal metadata", () => {
    const incoming = [makePlayer("p1", "ST", 14)];
    expect(countPassiveRevealSignings(incoming, {})).toBe(0);
    expect(countPassiveRevealSignings(incoming, null)).toBe(0);
  });
});
