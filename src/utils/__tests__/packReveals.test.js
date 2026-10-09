import { expect, it } from "vitest";
import { checkPackUnlocks, earnedPackReveals } from "../packUnlocks.js";
import { CIG_PACKS, STARTER_PACKS } from "../../data/cigPacks.js";

it("grants starter packs without treating their availability as an earned reveal", () => {
  const packs = checkPackUnlocks({ unlockedPacks: new Set(), unlockedAchievements: new Set(), seasonNumber: 1, leagueTier: 11 });
  expect(new Set(packs)).toEqual(STARTER_PACKS);
  expect(earnedPackReveals(packs)).toEqual([]);
});

it("preserves earned pack reveals and leaves the grant list unchanged", () => {
  const earned = CIG_PACKS.find(pack => !pack.starter).id;
  const packs = [...STARTER_PACKS, earned];
  expect(earnedPackReveals(packs)).toEqual([earned]);
  expect(packs).toEqual([...STARTER_PACKS, earned]);
});
