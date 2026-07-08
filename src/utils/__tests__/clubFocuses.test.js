import { describe, it, expect } from "vitest";
import {
  getFocusNode, isFocusAvailable, getMissingPrereqs, getClubFocusBonuses,
  tickActiveFocus, pendingSeasonGrants, markSeasonGranted, isDeferredOneOffPending,
  migrateClubFocuses, RECURRING_SEASON_EFFECTS, hasSquadRoom,
} from "../clubFocuses.js";
import { CLUB_FOCUS_NODES, defaultClubFocuses } from "../../data/clubFocuses.js";
import { TICKET_DEFS } from "../../data/tickets.js";

const cf = (over = {}) => ({ ...defaultClubFocuses(), ...over });

describe("clubFocuses data integrity", () => {
  it("has 18 nodes with unique ids and resolvable prerequisites", () => {
    expect(CLUB_FOCUS_NODES).toHaveLength(18);
    const ids = new Set(CLUB_FOCUS_NODES.map(n => n.id));
    expect(ids.size).toBe(18);
    for (const node of CLUB_FOCUS_NODES) {
      for (const req of [...(node.requires || []), ...(node.requiresAny || [])]) {
        expect(ids.has(req), `${node.id} requires unknown ${req}`).toBe(true);
      }
      expect(node.weeks).toBeGreaterThan(0);
      expect(node.pos.col).toBeGreaterThanOrEqual(0);
      expect(node.pos.row).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("isFocusAvailable", () => {
  it("gates a root node with no prerequisites as immediately available", () => {
    expect(isFocusAvailable(getFocusNode("new_bibs"), [])).toBe(true);
  });
  it("requires ALL of `requires`", () => {
    const node = getFocusNode("coaching_badges"); // needs all_weather_pitch + bake_sale
    expect(isFocusAvailable(node, [])).toBe(false);
    expect(isFocusAvailable(node, ["all_weather_pitch"])).toBe(false);
    expect(isFocusAvailable(node, ["all_weather_pitch", "bake_sale"])).toBe(true);
  });
  it("requires at least ONE of `requiresAny`", () => {
    const node = getFocusNode("bake_sale"); // requiresAny man_at_every_ground | new_club_shop
    expect(isFocusAvailable(node, [])).toBe(false);
    expect(isFocusAvailable(node, ["man_at_every_ground"])).toBe(true);
    expect(isFocusAvailable(node, ["new_club_shop"])).toBe(true);
  });
  it("is not available once completed", () => {
    expect(isFocusAvailable(getFocusNode("new_bibs"), ["new_bibs"])).toBe(false);
  });
  it("surfaces missing prerequisites, grouping any-of into one entry", () => {
    const miss = getMissingPrereqs(getFocusNode("bake_sale"), []);
    expect(miss.some(m => m.any)).toBe(true);
    const miss2 = getMissingPrereqs(getFocusNode("coaching_badges"), ["all_weather_pitch"]);
    expect(miss2).toContain("bake_sale");
  });
});

describe("tickActiveFocus", () => {
  it("increments progress without completing before the node's week count", () => {
    const start = cf({ activeId: "new_bibs" }); // 4 weeks
    const { next, completedNode } = tickActiveFocus(start);
    expect(completedNode).toBeNull();
    expect(next.progressById.new_bibs).toBe(1);
    expect(next.activeId).toBe("new_bibs");
  });
  it("completes on the final week: moves id to completedIds, clears activeId + its progress", () => {
    let state = cf({ activeId: "new_bibs", progressById: { new_bibs: 3 } }); // one week from done
    const { next, completedNode } = tickActiveFocus(state);
    expect(completedNode?.id).toBe("new_bibs");
    expect(next.completedIds).toContain("new_bibs");
    expect(next.activeId).toBeNull();
    expect(next.progressById.new_bibs).toBeUndefined();
  });
  it("is a no-op with no active focus (completion never re-fires)", () => {
    const done = cf({ completedIds: ["new_bibs"] });
    const { next, completedNode } = tickActiveFocus(done);
    expect(completedNode).toBeNull();
    expect(next).toBe(done);
  });
  it("preserves partial progress on a node when the player switches focus", () => {
    // Bank two weeks on new_bibs, switch to man_at_every_ground (activeId only),
    // then tick: the switched-away progress survives, the new node advances.
    let state = cf({ activeId: "new_bibs", progressById: { new_bibs: 2 } });
    state = { ...state, activeId: "man_at_every_ground" }; // switch = activeId only
    const { next } = tickActiveFocus(state);
    expect(next.progressById.new_bibs).toBe(2); // kept
    expect(next.progressById.man_at_every_ground).toBe(1); // advanced
  });
});

describe("getClubFocusBonuses — derivation per effectId", () => {
  it("returns neutral bonuses for an empty tree", () => {
    const b = getClubFocusBonuses(defaultClubFocuses());
    expect(b).toMatchObject({
      revealWeeksDelta: 0, duoBoostBonus: 0, injuryHealDelta: 0, intakeFloorBonus: 0,
      trainingInjuryMult: 1, retrainWeeksDelta: 0, ultimatumExtraGames: 0,
      sentimentLossMult: 1, floodlights: false, floodlightsDriftBonus: 0,
    });
  });
  it("maps each passive node to its bonus", () => {
    expect(getClubFocusBonuses(cf({ completedIds: ["man_at_every_ground"] })).revealWeeksDelta).toBe(-1);
    expect(getClubFocusBonuses(cf({ completedIds: ["all_weather_pitch"] })).duoBoostBonus).toBeGreaterThan(0);
    expect(getClubFocusBonuses(cf({ completedIds: ["ice_baths"] })).injuryHealDelta).toBe(-1);
    expect(getClubFocusBonuses(cf({ completedIds: ["coaching_badges"] })).intakeFloorBonus).toBe(1);
    expect(getClubFocusBonuses(cf({ completedIds: ["sports_scientist"] })).trainingInjuryMult).toBeLessThan(1);
    expect(getClubFocusBonuses(cf({ completedIds: ["gym_extension"] })).retrainWeeksDelta).toBe(-1);
    expect(getClubFocusBonuses(cf({ completedIds: ["friend_on_board"] })).ultimatumExtraGames).toBe(1);
    expect(getClubFocusBonuses(cf({ completedIds: ["safe_standing"] })).sentimentLossMult).toBeLessThan(1);
    const fl = getClubFocusBonuses(cf({ completedIds: ["floodlights"] }));
    expect(fl.floodlights).toBe(true);
    expect(fl.floodlightsDriftBonus).toBe(1);
  });
});

describe("pendingSeasonGrants — idempotency", () => {
  it("lists only recurring nodes that are complete and not yet granted this season", () => {
    const state = cf({ completedIds: ["miracle_worker", "new_bibs"] });
    const due = pendingSeasonGrants(state, 3);
    expect(due).toHaveLength(1);
    expect(due[0].effectId).toBe("seasonal_cream");
  });
  it("granting the same season twice yields only one grant", () => {
    let state = cf({ completedIds: ["miracle_worker"] });
    const first = pendingSeasonGrants(state, 3);
    expect(first).toHaveLength(1);
    state = markSeasonGranted(state, first[0].nodeId, 3);
    expect(pendingSeasonGrants(state, 3)).toHaveLength(0); // same season = no re-grant
    expect(pendingSeasonGrants(state, 4)).toHaveLength(1); // next season is due again
  });
  it("only recurring effects are ever season-granted (one-offs never appear)", () => {
    const state = cf({ completedIds: CLUB_FOCUS_NODES.map(n => n.id) });
    const due = pendingSeasonGrants(state, 2);
    for (const g of due) expect(RECURRING_SEASON_EFFECTS.has(g.effectId)).toBe(true);
    // continental_tip, seasonal_cream, war_chest = three recurring nodes.
    expect(due).toHaveLength(3);
  });
});

describe("deferred one-offs (bake_sale / black_book)", () => {
  it("is pending only while complete and unconsumed", () => {
    expect(isDeferredOneOffPending(cf({ completedIds: [] }), "extra_intake_candidate")).toBe(false);
    let state = cf({ completedIds: ["bake_sale"] });
    expect(isDeferredOneOffPending(state, "extra_intake_candidate")).toBe(true);
    state = markSeasonGranted(state, "bake_sale", 2); // consume
    expect(isDeferredOneOffPending(state, "extra_intake_candidate")).toBe(false);
  });
});

describe("war chest ticket pool", () => {
  it("is constrained to ids that exist in tickets.js", () => {
    const pool = ["double_session", "twelfth_man", "relation_boost", "random_attr"];
    for (const id of pool) expect(TICKET_DEFS[id], `${id} missing from TICKET_DEFS`).toBeTruthy();
  });
});

describe("prodigy is a completion one-off", () => {
  it("completes exactly once and does not re-complete on a later tick", () => {
    // prodigy_pipeline is 10 weeks; drive it to completion, then confirm a
    // follow-up tick (activeId cleared) never re-fires the node.
    let state = cf({ activeId: "prodigy_pipeline", progressById: { prodigy_pipeline: 9 } });
    const first = tickActiveFocus(state);
    expect(first.completedNode?.id).toBe("prodigy_pipeline");
    state = first.next;
    const second = tickActiveFocus(state);
    expect(second.completedNode).toBeNull();
  });
});

describe("migrateClubFocuses — migration-by-default", () => {
  it("resolves a save WITHOUT clubFocuses to a fresh default", () => {
    expect(migrateClubFocuses(undefined)).toEqual(defaultClubFocuses());
    expect(migrateClubFocuses(null)).toEqual(defaultClubFocuses());
  });
  it("backfills each missing key on a partial blob and preserves present ones", () => {
    const migrated = migrateClubFocuses({ completedIds: ["new_bibs"] });
    expect(migrated.completedIds).toEqual(["new_bibs"]);
    expect(migrated.activeId).toBeNull();
    expect(migrated.progressById).toEqual({});
    expect(migrated.seasonGrants).toEqual({});
  });
});

describe("hasSquadRoom — the prodigy respects the signing cap", () => {
  const player = (i, legend = false) => ({ id: `p${i}`, name: `P ${i}`, ...(legend ? { isLegend: true } : {}) });
  it("true below 25 non-legends", () => {
    expect(hasSquadRoom(Array.from({ length: 24 }, (_, i) => player(i)))).toBe(true);
  });
  it("false at 25 non-legends", () => {
    expect(hasSquadRoom(Array.from({ length: 25 }, (_, i) => player(i)))).toBe(false);
  });
  it("legends don't count against the cap", () => {
    const squad = [...Array.from({ length: 24 }, (_, i) => player(i)), player(99, true), player(100, true)];
    expect(hasSquadRoom(squad)).toBe(true);
  });
});
