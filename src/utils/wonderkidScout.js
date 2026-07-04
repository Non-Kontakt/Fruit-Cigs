// Scout Report: Wonderkid — picks a genuine standout youth prospect out of
// AI squads that already exist in the game world. The report must never
// invent a player, so this only ever returns someone who's actually on a
// real AI team's books right now.
import { getOverall, rand } from "./calc.js";

// "Youth" cutoff — matches the age band AI squad evolution already treats as
// youth replacements (see evolveAISquad's youthReplacements filter).
export const WONDERKID_AGE_THRESHOLD = 21;

// A freshly generated AI replacement's potential is always current OVR + a
// random 1-4 (see generateAIReplacement), so a gap of 5+ can only belong to
// a genuine standout — a boosted wonderkid, a golden-generation graduate, or
// an existing prospect who hasn't grown into their potential yet. That's the
// bar for "high potential relative to current OVR".
export const WONDERKID_POTENTIAL_GAP = 5;

/**
 * @param {Map<string, Array>} squadsByTeam - team name -> squad array
 * @param {string[]} teamNames - team names to consider (e.g. the player's next tier)
 * @returns {{ player: object, teamName: string } | null}
 */
export function pickWonderkidCandidate(squadsByTeam, teamNames) {
  const candidates = [];
  for (const teamName of teamNames) {
    const squad = squadsByTeam?.get?.(teamName);
    if (!squad) continue;
    for (const player of squad) {
      if ((player.age || 99) > WONDERKID_AGE_THRESHOLD) continue;
      const ovr = getOverall(player);
      const potential = player.potential ?? ovr;
      if (potential - ovr >= WONDERKID_POTENTIAL_GAP) candidates.push({ player, teamName });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[rand(0, candidates.length - 1)];
}
