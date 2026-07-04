// Attribute-history helpers for the progress sparklines. History entries are
// weekly snapshots — { <attrKey>: number, week?, season? } — with week/season
// only present on snapshots taken after time-stamping was added, so callers
// walk the array defensively rather than assuming every entry is stamped.

/**
 * Walks a player's attribute history backward to find the most recent week
 * an attribute actually increased. Returns null if it never did (flat or
 * only ever declined across the whole tracked history).
 */
export function findLastGain(history, key) {
  if (!Array.isArray(history) || history.length < 2) return null;
  for (let i = history.length - 1; i > 0; i--) {
    const gain = (history[i]?.[key] ?? 0) - (history[i - 1]?.[key] ?? 0);
    if (gain > 0) {
      return {
        gain,
        weeksAgo: history.length - 1 - i,
        week: history[i].week,
        season: history[i].season,
      };
    }
  }
  return null;
}

/** Human-readable "last gain" annotation shown next to a Sparkline's delta. */
export function describeLastGain(history, key) {
  const last = findLastGain(history, key);
  if (!last) {
    const span = Math.max(0, (history?.length || 1) - 1);
    return `no gain in ${span}w`;
  }
  const { gain, weeksAgo, week, season } = last;
  if (week != null && season != null) return `last +${gain} S${season}W${week}`;
  return `last +${gain} (${weeksAgo === 0 ? "this week" : `${weeksAgo}w ago`})`;
}
