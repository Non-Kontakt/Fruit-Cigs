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

// Display-only status group for a pack, used by sortPacksForDisplay below.
// Group order (lower sorts first):
//   0 — unsealed, in progress (0 < collected < total)
//   1 — unsealed, untouched (collected === 0)
//   2 — completed (collected === total) — deliberately placed before sealed
//       rather than merged into the unsealed groups above. This placement is
//       a design choice, not a technical constraint: to move the completed
//       group elsewhere, change only the number returned here.
//   3 — sealed (pack id not in unlockedPacks)
function packDisplayGroup(pack, unlockedPacks) {
  if (!unlockedPacks.has(pack.id)) return 3;
  if (pack.total > 0 && pack.collected === pack.total) return 2;
  if (pack.collected > 0) return 0;
  return 1;
}

/**
 * Display-only ordering for pack listings (the Corner Shop grid and the
 * index tab's PACK sort). Groups packs by player-facing unlock/completion
 * status; authored order (the order `packs` is given in) is preserved
 * *within* each group via a stable sort, and the input array/CIG_PACKS
 * itself is never mutated or reordered on disk — this only changes render
 * order.
 *
 * `packs` must be objects carrying at least `id`, `collected`, and `total`.
 */
export function sortPacksForDisplay(packs, unlockedPacks) {
  return packs
    .map((pack, authoredIndex) => ({ pack, authoredIndex }))
    .sort((a, b) => {
      const ga = packDisplayGroup(a.pack, unlockedPacks);
      const gb = packDisplayGroup(b.pack, unlockedPacks);
      return ga !== gb ? ga - gb : a.authoredIndex - b.authoredIndex;
    })
    .map(({ pack }) => pack);
}
