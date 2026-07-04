// Pure helper for building the fan-sentiment reason log. Entries are
// appended in chronological order (oldest first, newest last) and capped at
// the most recent MAX_ENTRIES on write, so the array never grows unbounded
// in a save file. Callers that render a "recent" list should read from the
// END of the array (e.g. `[...log].reverse().slice(0, 5)`).
const MAX_ENTRIES = 20;

export function pushSentimentEntry(prev, { delta, reason, week, season }) {
  // A reason attached to no movement is noise (e.g. a win while sentiment is
  // already clamped at 100) — normalize here so every writer gets the
  // invariant for free rather than guarding at each call site.
  const rounded = Math.round(delta);
  if (rounded === 0) return prev || [];
  const next = [...(prev || []), { delta: rounded, reason, week, season }];
  return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
}
