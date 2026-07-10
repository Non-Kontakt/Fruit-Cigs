// Pure copy for the live match feed's empty-state placeholder. Only shown
// while the event list is empty (MatchResultScreen.jsx's own gate) — this
// module just decides what it says, deterministically, from the current
// display minute, so it never claims "waiting for kick off" once the match
// is well underway.
export function getMatchFeedPlaceholder(minute) {
  if (minute <= 0) return "Waiting for kick off...";
  if (minute < 15) return "Cagey stuff so far.";
  if (minute < 30) return "Nothing to report. The midfield is a swamp.";
  if (minute < 45) return "Still goalless. The away fans are doing the entertaining.";
  if (minute === 45) return "HT: no notes worth keeping.";
  return "A slow burner — both gaffers chewing their gum nervously.";
}
