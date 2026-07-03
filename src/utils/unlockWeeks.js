// Achievement unlock timestamps. Legacy saves stored a bare absolute week
// number; newer entries carry { season, week, seasonLen }.
export function formatUnlockWeek(u) {
  if (!u) return "";
  if (typeof u === "number") return `W${u}`;
  return `S${u.season} W${u.week}`;
}
