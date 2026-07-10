// Achievement unlock timestamps. Legacy saves stored a bare absolute week
// number; newer entries carry { season, week, seasonLen }. `week` is always
// the 1-based display week (see the write site in App.jsx) — but saves
// written before that convention was enforced can still hold a raw 0-based
// calendarIndex, so every display route clamps through this one helper
// rather than trusting the stored value, healing old saves without a
// migration.
export function formatUnlockWeek(u) {
  // u == null covers both "no stamp recorded" (undefined) and an explicit
  // null; a legacy stamp of bare 0 is a real (buggy) value, not a missing
  // one, so it must fall through to the clamp below rather than be treated
  // as absent.
  if (u == null) return "";
  if (typeof u === "number") return `W${Math.max(1, u)}`;
  return `S${u.season} W${Math.max(1, u.week)}`;
}
