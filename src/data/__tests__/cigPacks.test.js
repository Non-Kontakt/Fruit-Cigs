import { describe, it, expect } from "vitest";
import { CIG_PACKS, ACH_TO_PACK, STARTER_PACKS } from "../cigPacks.js";
import { ACHIEVEMENTS } from "../achievements.js";
import { checkPackUnlocks, isPackComplete } from "../../utils/packUnlocks.js";

const achievementIds = new Set(ACHIEVEMENTS.map((a) => a.id));

describe("CIG_PACKS integrity", () => {
  it("every pack's packSize matches its achievementIds array length", () => {
    for (const pack of CIG_PACKS) {
      expect(pack.achievementIds.length, `${pack.id} packSize/array mismatch`).toBe(pack.packSize);
    }
  });

  it("every pack's packSize is exactly 5 or 10 — no irregular pack sizes", () => {
    for (const pack of CIG_PACKS) {
      expect([5, 10], `${pack.id} has packSize ${pack.packSize}, not 5 or 10`).toContain(pack.packSize);
    }
  });

  it("every achievement appears in exactly one pack, covering all 350", () => {
    const seenIn = new Map();
    let total = 0;
    for (const pack of CIG_PACKS) {
      total += pack.achievementIds.length;
      for (const id of pack.achievementIds) {
        expect(seenIn.has(id), `${id} appears in both ${seenIn.get(id)} and ${pack.id}`).toBe(false);
        seenIn.set(id, pack.id);
      }
    }
    expect(total).toBe(370);
    expect(seenIn.size).toBe(370);
  });

  it("every achievement id referenced by a pack exists in ACHIEVEMENTS", () => {
    for (const pack of CIG_PACKS) {
      for (const id of pack.achievementIds) {
        expect(achievementIds.has(id), `${pack.id} references unknown achievement id: ${id}`).toBe(true);
      }
    }
  });

  it("every ACHIEVEMENTS id is placed in some pack", () => {
    for (const ach of ACHIEVEMENTS) {
      expect(ACH_TO_PACK[ach.id], `${ach.id} is not in any pack`).toBeTruthy();
    }
  });

  it("ACH_TO_PACK has no duplicate/overwritten entries (built from CIG_PACKS, exercises the same invariant)", () => {
    expect(Object.keys(ACH_TO_PACK).length).toBe(370);
  });

  it("starter packs are exactly cherry, banana, apple and have no unlock condition", () => {
    expect([...STARTER_PACKS].sort()).toEqual(["apple_cigs", "banana_cigs", "cherry_cigs"]);
    for (const pack of CIG_PACKS) {
      if (pack.starter) {
        expect(pack.unlockCondition).toBeNull();
      }
    }
  });

  it("every non-starter pack has a truthy unlockCondition with a recognised type", () => {
    const knownTypes = new Set(["pack_complete", "seasons_played", "cup_won", "tier_reached", "packs_complete"]);
    for (const pack of CIG_PACKS) {
      if (pack.starter) continue;
      expect(pack.unlockCondition, `${pack.id} has no unlockCondition`).toBeTruthy();
      expect(knownTypes.has(pack.unlockCondition.type), `${pack.id} has unknown unlockCondition.type`).toBe(true);
    }
  });

  it("pack_complete unlockConditions reference a real pack id", () => {
    const packIds = new Set(CIG_PACKS.map((p) => p.id));
    for (const pack of CIG_PACKS) {
      if (pack.unlockCondition?.type === "pack_complete") {
        expect(packIds.has(pack.unlockCondition.packId), `${pack.id} unlocks on unknown pack ${pack.unlockCondition.packId}`).toBe(true);
      }
    }
  });

  it("the Lime Cigs circular-unlock fix: cup_winner is not inside the pack gated on winning a cup", () => {
    const lime = CIG_PACKS.find((p) => p.id === "lime_cigs");
    expect(lime.unlockCondition).toEqual({ type: "cup_won" });
    expect(lime.achievementIds).not.toContain("cup_winner");
  });

  it("Rambutan and Lemon (FREAK-novelty 5-packs) gate at packs_complete 12+", () => {
    const rambutan = CIG_PACKS.find((p) => p.id === "rambutan_cigs");
    const lemon = CIG_PACKS.find((p) => p.id === "lemon_cigs");
    expect(rambutan.unlockCondition).toEqual({ type: "packs_complete", count: 12 });
    expect(lemon.unlockCondition).toEqual({ type: "packs_complete", count: 14 });
  });
});

describe("unlock-stability guard: once unlocked, a pack is never re-locked by recomposition", () => {
  it("checkPackUnlocks never removes an already-unlocked pack, even when a pack's completion status flips from complete to incomplete", () => {
    // Simulate a save that had Melon Cigs fully complete under some prior
    // membership, but is now missing one of Melon's *current* achievements
    // (as if the pack's cards had been reshuffled out from under it).
    const melon = CIG_PACKS.find((p) => p.id === "melon_cigs");
    const missingOne = melon.achievementIds[0];
    const unlockedAchievements = new Set(
      ACHIEVEMENTS.map((a) => a.id).filter((id) => id !== missingOne)
    );
    const unlockedPacks = new Set(CIG_PACKS.map((p) => p.id)); // every pack previously unlocked

    expect(isPackComplete("melon_cigs", unlockedAchievements)).toBe(false);

    const newlyUnlockable = checkPackUnlocks({
      unlockedPacks, unlockedAchievements, seasonNumber: 99, leagueTier: 1, prestigeLevel: 0, leagueWins: 999,
    });

    // Nothing should come back as "newly unlockable" — everything already
    // in unlockedPacks is skipped outright, regardless of completion.
    expect(newlyUnlockable).toEqual([]);
    // And the pack is still present in the set the caller already had —
    // checkPackUnlocks only ever proposes additions, never removals.
    expect(unlockedPacks.has("melon_cigs")).toBe(true);
  });

  it("a downstream pack_complete-chained pack stays unlocked even if its prerequisite pack un-completes", () => {
    // fig_cigs unlocks on pack_complete(grape_cigs). Simulate a save where
    // grape was complete and fig got unlocked, then Grape's membership
    // changed such that grape_cigs is no longer complete for this save.
    // unlockedAchievements is otherwise empty (nothing else banked), so the
    // only thing under test is whether fig_cigs — already unlocked — could
    // possibly get dropped/re-proposed once its prerequisite un-completes.
    const grape = CIG_PACKS.find((p) => p.id === "grape_cigs");
    const bankedGrapeAchievements = grape.achievementIds.slice(1); // all but one
    const unlockedAchievements = new Set(bankedGrapeAchievements);
    const unlockedPacks = new Set(["cherry_cigs", "banana_cigs", "apple_cigs", "grape_cigs", "fig_cigs"]);

    expect(isPackComplete("grape_cigs", unlockedAchievements)).toBe(false);

    const newlyUnlockable = checkPackUnlocks({
      unlockedPacks, unlockedAchievements, seasonNumber: 5, leagueTier: 5, prestigeLevel: 0, leagueWins: 0,
    });

    // fig_cigs is already in unlockedPacks — checkPackUnlocks skips it
    // outright (see the `if (unlockedPacks.has(pack.id)) continue;` guard),
    // so it can never appear in the "newly unlockable" list, and nothing
    // in this codebase ever removes an id from unlockedPacks once added.
    expect(newlyUnlockable).not.toContain("fig_cigs");
    expect(unlockedPacks.has("fig_cigs")).toBe(true);
  });
});
