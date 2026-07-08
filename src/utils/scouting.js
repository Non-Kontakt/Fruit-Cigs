// Passive shortlist scouting — an AI player's potential is hidden by
// default (see PlayerPanel), but keeping them shortlisted for a few weeks
// has your scouts quietly finish the job on their own. Removing a player
// from the shortlist before the timer completes just drops them from the
// array this function receives, which cancels the pending reveal for free.

// A few weeks, not a season — long enough to feel like real groundwork,
// short enough that you're not waiting through a whole transfer window.
export const SCOUT_REVEAL_WEEKS = 4;

// Legacy shortlist entries (or snapshots that never carried a real
// `potential`, e.g. very old saves) get a modest deterministic ceiling
// above their OVR — mirrors the Scout Dossier ticket's own fallback so a
// given player resolves to the same number either way.
export function fallbackPotential(entry, ovrCap = 20) {
  let hash = 0;
  const key = entry.id || entry.name || "";
  for (let i = 0; i < key.length; i++) { hash = ((hash << 5) - hash) + key.charCodeAt(i); hash |= 0; }
  const seed = Math.abs(hash) / 2147483647;
  const basePot = ovrCap - (Math.max(0, (entry.age || 20) - 17) * 0.5);
  return Math.max(entry.ovr || 0, Math.min(ovrCap, Math.round(basePot + (seed * 6) - 3)));
}

/**
 * Advances the passive scouting timer by one week for every shortlisted
 * player who isn't already revealed (via this timer or an instant-reveal
 * ticket). Pure function — the caller applies the returned shortlist and
 * fires reveal messages for the returned entries.
 *
 * @param {Array} shortlist - current shortlist entries
 * @param {Object} scoutedPlayers - { [playerId]: revealedPotential }
 * @param {number} ovrCap
 * @returns {{ nextShortlist: Array, revealed: Array }}
 */
export function advanceShortlistScouting(shortlist, scoutedPlayers, ovrCap = 20) {
  const revealed = [];
  const nextShortlist = (shortlist || []).map(entry => {
    if (scoutedPlayers?.[entry.id] != null) return entry; // already revealed — nothing to track
    const weeksLeft = (entry.scoutWeeksLeft ?? SCOUT_REVEAL_WEEKS) - 1;
    if (weeksLeft <= 0) {
      const potential = entry.potential ?? fallbackPotential(entry, ovrCap);
      revealed.push({ ...entry, potential });
      return { ...entry, scoutWeeksLeft: 0 };
    }
    return { ...entry, scoutWeeksLeft: weeksLeft };
  });
  return { nextShortlist, revealed };
}

/**
 * A reveal that tells you nothing new — the ceiling is no higher than what
 * the player already is. Shared by both reveal paths (passive timer + Scout
 * Dossier ticket) for the Wasted Trip achievement.
 * @param {number} potential - revealed potential
 * @param {number} ovr - player's current overall
 * @returns {boolean}
 */
export function isWastedTrip(potential, ovr) {
  return (potential ?? 0) <= (ovr ?? 0);
}

/**
 * How many distinct players have a revealed potential on record — Card
 * Index fires once this reaches 10.
 * @param {Object} scoutedPlayers - { [playerId]: revealedPotential }
 * @returns {number}
 */
export function countRevealedPlayers(scoutedPlayers) {
  return Object.keys(scoutedPlayers || {}).length;
}

/**
 * Whether a given player's revealed potential is already at the prestige
 * cap — shared by The Real Deal (signing) and Eye For Talent (awards night).
 * @param {Object} scoutedPlayers - { [playerId]: revealedPotential }
 * @param {string} playerId
 * @param {number} ovrCap
 * @returns {boolean}
 */
export function isRevealedAtCap(scoutedPlayers, playerId, ovrCap) {
  return (scoutedPlayers?.[playerId] || 0) >= ovrCap;
}

/**
 * Shortlist entries that have survived into a new season without being
 * signed — Cold Case fires at season end for anyone added before the
 * season that's now closing.
 * @param {Array} shortlist
 * @param {number} seasonNumber - the season that just ended
 * @returns {Array}
 */
export function getStaleShortlistEntries(shortlist, seasonNumber) {
  return (shortlist || []).filter(e => e.addedSeason < seasonNumber);
}

/**
 * Just Browsing — burned a Scout Dossier ticket on a player and never
 * signed him. Resolved at season end: a burn recorded in the closing
 * season whose player id isn't in the current squad counts as "never
 * signed him". Deliberately simple and season-scoped — it doesn't try to
 * track a burn across a player's entire shortlist lifetime, only whether
 * that season's burn went unrewarded.
 * @param {Object} dossierBurns - { [playerId]: { season } }
 * @param {number} seasonNumber - the season that just ended
 * @param {Array} squad - current squad
 * @returns {boolean}
 */
export function hasUnresolvedDossierBurn(dossierBurns, seasonNumber, squad) {
  const squadIds = new Set((squad || []).map(p => p.id));
  return Object.entries(dossierBurns || {}).some(([playerId, burn]) =>
    burn?.season === seasonNumber && !squadIds.has(playerId));
}
