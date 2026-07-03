import { CIG_PACKS } from "../data/cigPacks.js";

/** Check if a pack is fully completed */
export function isPackComplete(packId, unlockedAchievements) {
  const pack = CIG_PACKS.find(p => p.id === packId);
  return pack && pack.achievementIds.every(id => unlockedAchievements.has(id));
}

/** Count how many packs are fully completed */
function completedPackCount(unlockedPacks, unlockedAchievements) {
  return CIG_PACKS.filter(p => unlockedPacks.has(p.id) && isPackComplete(p.id, unlockedAchievements)).length;
}

/** Evaluate a single unlock condition */
function evaluateCondition(cond, state) {
  if (!cond) return false;
  switch (cond.type) {
    case "pack_complete": return isPackComplete(cond.packId, state.unlockedAchievements);
    case "seasons_played": return state.seasonNumber >= cond.count;
    case "cup_won": return state.unlockedAchievements.has("cup_winner");
    case "tier_reached": return state.leagueTier <= cond.tier;
    case "packs_complete": return completedPackCount(state.unlockedPacks, state.unlockedAchievements) >= cond.count;
    default: return false;
  }
}

/** Check all packs and return array of newly unlockable pack IDs */
export function checkPackUnlocks(state) {
  const { unlockedPacks } = state;
  const newUnlocks = [];
  for (const pack of CIG_PACKS) {
    if (unlockedPacks.has(pack.id)) continue;
    if (pack.starter) { newUnlocks.push(pack.id); continue; }
    if (!pack.unlockCondition) continue;
    if (evaluateCondition(pack.unlockCondition, state)) {
      newUnlocks.push(pack.id);
    }
  }
  return newUnlocks;
}
