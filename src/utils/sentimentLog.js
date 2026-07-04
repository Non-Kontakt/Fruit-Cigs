// Pure helper for building the fan-sentiment reason log. Entries are
// appended in chronological order (oldest first, newest last) and capped at
// the most recent MAX_ENTRIES on write, so the array never grows unbounded
// in a save file. Callers that render a "recent" list should read from the
// END of the array (e.g. `[...log].reverse().slice(0, 5)`).
const MAX_ENTRIES = 20;

export function pushSentimentEntry(prev, { delta, reason, week, season }) {
  const next = [...(prev || []), { delta, reason, week, season }];
  return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
}
