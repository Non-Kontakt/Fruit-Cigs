import { describe, expect, it } from "vitest";
import { getPlayerValue, getRelationshipPremium, valueTrade, evaluateTrade } from "../transfer.js";
import { preparePlayerExchange } from "../playerExchange.js";

const player = (id, ovr = 10) => ({ id, name: id, age: 25, position: "CM", attrs: Object.fromEntries(
  ["pace", "shooting", "passing", "defending", "physical", "technique", "mental"].map(key => [key, ovr])),
});
const aiSquad = ovr => [player("target", ovr), player("ai2"), player("ai3"), player("ai4")];

describe("manual trade value floor", () => {
  it("relationships reduce a premium without discounting below fair value", () => {
    expect([0, 25, 50, 80, 100].map(getRelationshipPremium)).toEqual([0.4, 0.3, 0.2, 0.1, 0]);
    const squad = aiSquad(10);
    expect(valueTrade([player("own")], [squad[0]], squad, 0).acceptable).toBe(false);
    expect(valueTrade([player("own")], [squad[0]], squad, 100).acceptable).toBe(true);
    expect(valueTrade([player("own")], [squad[0]], squad, 100).effectiveAI).toBe(getPlayerValue(squad[0]));
  });
  it("rejects the old cheap upgrade, even when the AI has surplus players", () => {
    const squad = aiSquad(12);
    expect(evaluateTrade([player("own", 10)], [squad[0]], squad, 100).acceptable).toBe(false);
  });
  it("retains positional scarcity and requires the entire asking value", () => {
    const target = player("target");
    const quote = valueTrade([player("own")], [target], [target], 100);
    expect(quote.effectiveAI).toBe(Math.ceil(getPlayerValue(target) * 1.4));
    expect(quote.acceptable).toBe(false);
    const almost = valueTrade([player("own1", 10), player("own2", 20)],
      [player("target1", 11), player("target2", 20)], aiSquad(10), 100);
    expect(almost.ratio).toBeGreaterThan(0.95);
    expect(almost.acceptable).toBe(false);
  });
  it("never accepts more raw player value than the manager gives", () => {
    for (const rel of [0, 24, 25, 49, 50, 79, 80, 99, 100]) {
      for (let ownOvr = 2; ownOvr <= 25; ownOvr++) {
        for (let targetOvr = 2; targetOvr <= 25; targetOvr++) {
          const squad = aiSquad(targetOvr);
          const quote = valueTrade([player("own", ownOvr)], [squad[0]], squad, rel);
          if (quote.acceptable) expect(quote.userValue).toBeGreaterThanOrEqual(quote.aiValue);
        }
      }
    }
  });
  it("rejects duplicates, overlap, empty and non-finite offers", () => {
    const own = player("own"), target = player("target");
    for (const [give, take] of [[[own, own], [target]], [[own], [own]], [[], [target]], [[own], []], [[player("nan", NaN)], [target]]]) {
      expect(valueTrade(give, take, aiSquad(10), 100).acceptable).toBe(false);
    }
  });
});

function world() {
  const squad = [player("own"), player("spare")];
  const team = { name: "Other FC", squad: aiSquad(10) };
  const league = { teams: [{ name: "Our FC", isPlayer: true }, team] };
  return { squad, league, allLeagueStates: { 11: structuredClone(league) }, leagueTier: 11,
    startingXI: ["own"], bench: ["spare"], slotAssignments: ["own", null], fiveASideSquad: ["own"],
    transferWindowOpen: true, clubRelationships: { "Other FC": { pct: 100 } }, transferOffers: [],
  };
}
const request = { clubName: "Other FC", offeredIds: ["own"], receivedIds: ["target"] };

describe("atomic player ownership exchange", () => {
  it("moves players in the live league and its mirror, without mutating the input", () => {
    const s = world(), before = structuredClone(s);
    const result = preparePlayerExchange(s, request);
    expect(s).toEqual(before);
    expect(result.patch.squad.map(p => p.id)).toEqual(["spare", "target"]);
    expect(result.patch.league.teams[1].squad.map(p => p.id)).toEqual(["ai2", "ai3", "ai4", "own"]);
    expect(result.patch.allLeagueStates[11].teams[1].squad).toEqual(result.patch.league.teams[1].squad);
    expect(result.patch.startingXI).toEqual([]);
    expect(result.patch.slotAssignments).toEqual([null, null]);
    expect(result.patch.fiveASideSquad).toEqual([]);
    expect(preparePlayerExchange({ ...s, ...result.patch }, request)).toBeNull();
  });
  it("moves players in another tier without replacing the current league", () => {
    const s = world();
    s.allLeagueStates = { 10: s.league }; s.league = { teams: [{ isPlayer: true }] };
    s.slotAssignments = null; s.fiveASideSquad = null;
    const result = preparePlayerExchange(s, request);
    expect(result.patch.league).toBe(s.league);
    expect(result.patch.allLeagueStates[10].teams[1].squad.map(p => p.id)).toContain("own");
    expect(result.patch.slotAssignments).toBeNull();
  });
  it("uses live ownership and values rather than stale displayed selections", () => {
    const s = world();
    s.league.teams[1].squad[0] = player("target", 20);
    expect(preparePlayerExchange(s, request)).toBeNull();
    s.league.teams[1].squad = s.league.teams[1].squad.filter(p => p.id !== "target");
    expect(preparePlayerExchange(s, request)).toBeNull();
    expect(preparePlayerExchange({ ...world(), transferWindowOpen: false }, request)).toBeNull();
  });
  it("rejects duplicate selections and removes outgoing substitutes", () => {
    expect(preparePlayerExchange(world(), { ...request, offeredIds: ["own", "own"] })).toBeNull();
    const result = preparePlayerExchange(world(), { ...request, offeredIds: ["spare"] });
    expect(result.patch.bench).toEqual([]);
  });
  it("honours generous incoming offers once without applying the manual floor", () => {
    const s = world(); s.league.teams[1].squad[0] = player("target", 20);
    const offer = { aiClubName: "Other FC", aiWants: [s.squad[0]], aiOffers: [s.league.teams[1].squad[0]] };
    s.transferOffers = [offer];
    const result = preparePlayerExchange(s, { incomingOffer: offer });
    expect(result.received[0].id).toBe("target");
    expect(result.patch.transferOffers).toEqual([]);
    expect(preparePlayerExchange({ ...s, ...result.patch }, { incomingOffer: offer })).toBeNull();
    expect(preparePlayerExchange(s, { incomingOffer: { ...offer } })).toBeNull();
  });
});
