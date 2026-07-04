import { sortStandings } from "./league.js";

/**
 * Pure derivations that decide whether a themed BGM context applies to the
 * current moment. Kept side-effect free so the trigger logic (which BGM
 * track, if any, should be playing) is independently testable from the
 * screens that call BGM.playContext().
 */

/**
 * True during the run-in: the final 5 league matchweeks, with the player
 * sitting in the top 3 and within 6 points of the league leader.
 */
export function isRunInMoment(league, matchweekIndex) {
  if (!league?.table?.length || !league?.fixtures?.length || !league?.teams) return false;
  const totalWeeks = league.fixtures.length;
  // The live matchweek is an explicit parameter: the league object's own
  // matchweekIndex is NOT the app's source of truth (the store derives the
  // real one from calendarIndex), so reading it here would silently miss
  // the run-in in actual play.
  const weeksRemaining = totalWeeks - (matchweekIndex ?? 0);
  if (weeksRemaining > 5 || weeksRemaining < 1) return false;

  const sorted = sortStandings(league.table);
  const playerIdx = sorted.findIndex(r => league.teams[r.teamIndex]?.isPlayer);
  if (playerIdx === -1 || playerIdx >= 3) return false;

  const topPoints = sorted[0]?.points ?? 0;
  const playerPoints = sorted[playerIdx]?.points ?? 0;
  return (topPoints - playerPoints) <= 6;
}

/**
 * True if, in the just-finished match, the player's side scored an
 * equaliser (the score was level immediately after that goal) at minute 85
 * or later.
 */
export function hasLateEqualiser(result) {
  if (!result?.events?.length) return false;
  const playerSide = result.isPlayerHome ? "home" : "away";
  const goals = result.events
    .filter(e => e.type === "goal")
    .slice()
    .sort((a, b) => a.minute - b.minute);
  let home = 0, away = 0;
  for (const g of goals) {
    if (g.side === "home") home++; else away++;
    if (g.side === playerSide && g.minute >= 85 && home === away) return true;
  }
  return false;
}
