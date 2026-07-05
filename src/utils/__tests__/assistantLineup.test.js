import { describe, it, expect } from "vitest";
import { buildAssistantLineup } from "../lineup.js";

// Backfill must rank leftover players by EFFECTIVE strength in the slot
// (OVR x the same out-of-position penalty the match engine applies), not by
// raw OVR — otherwise a high-OVR backup keeper wins any orphaned outfield
// slot and then plays at 0.55x in the sim.

const attrs = (v) => ({ pace: v, shooting: v, passing: v, defending: v, physical: v, technique: v, mental: v });
const player = (id, position, v) => ({ id, name: id, position, attrs: attrs(v) });

// 4-4-2-ish formation: slot positions only matter for this test.
const FORMATION = [
  { pos: "GK" }, { pos: "LB" }, { pos: "CB" }, { pos: "CB" }, { pos: "RB" },
  { pos: "LW" }, { pos: "CM" }, { pos: "CM" }, { pos: "RW" },
  { pos: "ST" }, { pos: "ST" },
];

// A squad with natural fits for every slot EXCEPT the ones under test.
function baseSquad() {
  return [
    player("gk1", "GK", 12),
    player("cb1", "CB", 11), player("cb2", "CB", 11),
    player("rb1", "RB", 10),
    player("lw1", "LW", 10),
    player("cm1", "CM", 10), player("cm2", "CM", 10),
    player("rw1", "RW", 10),
    player("st1", "ST", 10), player("st2", "ST", 10),
  ];
}

describe("buildAssistantLineup backfill position fit", () => {
  it("prefers a benched natural RB over a higher-OVR backup GK for an empty LB slot", () => {
    // No natural LB anywhere; leftovers are a 14-OVR GK and a 9-OVR RB.
    // Engine values them at 14x0.55=7.7 vs 9x0.92=8.28 — the RB must win.
    const squad = [...baseSquad(), player("gk2", "GK", 14), player("rb2", "RB", 9)];
    const { startingXI } = buildAssistantLineup(squad, FORMATION);
    const lbSlot = startingXI[FORMATION.findIndex(s => s.pos === "LB")];
    expect(lbSlot).toBe("rb2");
  });

  it("prefers a benched LW over a higher-OVR CB for an empty RW slot", () => {
    const squad = baseSquad().filter(p => p.id !== "rw1"); // no natural RW
    squad.push(player("cb3", "CB", 12), player("lw2", "LW", 10));
    const { startingXI } = buildAssistantLineup(squad, FORMATION);
    const rwSlot = startingXI[FORMATION.findIndex(s => s.pos === "RW")];
    expect(rwSlot).toBe("lw2");
  });

  it("still uses a GK outfield as the genuine last resort", () => {
    // Ten outfielders for eleven slots: the second GK is the only body left.
    const squad = [...baseSquad(), player("gk2", "GK", 8)];
    const { startingXI } = buildAssistantLineup(squad, FORMATION);
    expect(startingXI.filter(Boolean).length).toBe(11);
    expect(startingXI).toContain("gk2");
  });

  it("keeps the natural-fit first pass intact — no OOP shuffling of exact matches", () => {
    const squad = [...baseSquad(), player("lb1", "LB", 7)];
    const { startingXI } = buildAssistantLineup(squad, FORMATION);
    const lbSlot = startingXI[FORMATION.findIndex(s => s.pos === "LB")];
    expect(lbSlot).toBe("lb1"); // a weak natural LB beats any strong out-of-position leftover
  });
});
