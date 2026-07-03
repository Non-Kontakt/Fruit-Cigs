import { describe, it, expect } from "vitest";
import { deriveMissingPlayerUnlocks, checkAchievements } from "../achievements.js";
import { PLAYER_UNLOCK_ACHIEVEMENTS } from "../../data/achievements.js";

// One unlock source, one add path:
// - achievement-linked unlockables: source of truth is unlockedAchievements
// - the two secret unlockables: source of truth is the team name condition
// - squad membership is only ever a "has this already been added" check,
//   never itself the reason something reads as unlocked.

describe("deriveMissingPlayerUnlocks", () => {
  it("surfaces an achievement-linked unlock once its achievement has fired and it's not yet in squad", () => {
    const missing = deriveMissingPlayerUnlocks({
      unlockedAchievements: new Set(["mixed_up"]),
      squad: [],
      teamName: "Anytown FC",
    });
    expect(missing.map(u => u.id)).toEqual(["leroy_litre"]);
  });

  it("does not re-surface an achievement-linked unlock once it's already in squad", () => {
    const missing = deriveMissingPlayerUnlocks({
      unlockedAchievements: new Set(["mixed_up"]),
      squad: [{ id: "unlockable_leroy_litre" }],
      teamName: "Anytown FC",
    });
    expect(missing).toEqual([]);
  });

  it("does not surface an unlock whose achievement hasn't fired", () => {
    const missing = deriveMissingPlayerUnlocks({
      unlockedAchievements: new Set(),
      squad: [],
      teamName: "Anytown FC",
    });
    expect(missing).toEqual([]);
  });

  it("surfaces a secret team-name unlock when the loaded team name matches, even with no achievement unlocked", () => {
    const missing = deriveMissingPlayerUnlocks({
      unlockedAchievements: new Set(),
      squad: [],
      teamName: "Cherry Reds FC",
    });
    expect(missing.map(u => u.id)).toEqual(["unlock_5"]);
  });

  it("team-name match is case-insensitive", () => {
    const missing = deriveMissingPlayerUnlocks({
      unlockedAchievements: new Set(),
      squad: [],
      teamName: "cigar city fc",
    });
    expect(missing.map(u => u.id)).toEqual(["unlock_7"]);
  });

  it("does not re-surface a secret team-name unlock once it's already in squad", () => {
    // Regression: this is the load-path gap — pendingPlayerUnlock is transient
    // React state, so a save captured before the reveal was dismissed used to
    // permanently lose the offer (team-name unlocks were only ever computed
    // once, on the very first new-game init effect).
    const missing = deriveMissingPlayerUnlocks({
      unlockedAchievements: new Set(),
      squad: [{ id: "unlockable_unlock_5" }],
      teamName: "Cherry Reds FC",
    });
    expect(missing).toEqual([]);
  });

  it("does not surface a team-name unlock when the name doesn't match", () => {
    const missing = deriveMissingPlayerUnlocks({
      unlockedAchievements: new Set(),
      squad: [],
      teamName: "Apple Rovers",
    });
    expect(missing).toEqual([]);
  });

  it("can surface multiple missing unlocks at once", () => {
    const missing = deriveMissingPlayerUnlocks({
      unlockedAchievements: new Set(["mixed_up", "kolo_kolo"]),
      squad: [],
      teamName: "Cherry Reds FC",
    });
    expect(new Set(missing.map(u => u.id))).toEqual(new Set(["leroy_litre", "unlock_6", "unlock_5"]));
  });
});

describe("checkAchievements — load-time catch-up cannot silently unlock player-unlock achievements", () => {
  // The retroactive catch-up pass on load calls checkAchievements() with
  // lastMatchResult: null (no match to catch up on). Every PLAYER_UNLOCK_ACHIEVEMENTS
  // id must depend on lastMatchResult, so that pass can never bank one of these
  // achievements — and thus never bypass the pending-consent flow — behind the
  // player's back.
  it("never returns a PLAYER_UNLOCK_ACHIEVEMENTS id when lastMatchResult is null", () => {
    const squad = [
      { id: "p1", name: "Striker One", position: "ST", age: 25, training: "defending",
        attrs: { pace: 20, shooting: 20, passing: 20, defending: 20, physical: 20, technique: 20, mental: 20 } },
    ];
    const result = checkAchievements({
      squad, unlocked: new Set(), lastMatchResult: null, league: null, weekGains: null,
      startingXI: squad.map(p => p.id), bench: [], matchweekIndex: 38, seasonCards: 0,
      totalGains: 0, totalMatches: 0, seasonCleanSheets: 0, seasonGoalsFor: 0, seasonDraws: 0,
      consecutiveUnbeaten: 0, consecutiveLosses: 0, consecutiveWins: 0,
      trialHistory: [{ impressed: true, position: "CB", name: "Striker One" }],
      leagueWins: 5,
    });
    for (const id of result) {
      expect(PLAYER_UNLOCK_ACHIEVEMENTS.has(id), `checkAchievements(lastMatchResult: null) returned player-unlock id: ${id}`).toBe(false);
    }
  });
});
