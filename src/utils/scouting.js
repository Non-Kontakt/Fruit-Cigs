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
