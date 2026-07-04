// Pure helpers for deriving rivalry status and narrative copy from the
// head-to-head ledger recorded in clubHistory.rivalryLedger. No app wiring
// here — callers decide when/where to use these.
//
// Ledger shape (per opponent name):
//   { played, wins, draws, losses, closeGames, redCards, lastMeetings: [{season, week, playerGoals, oppGoals}] }

const MIN_MEETINGS_TO_QUALIFY = 3;
const RIVAL_SCORE_THRESHOLD = 6;
const RIVAL_LOSSES_THRESHOLD = 3;
const FEISTY_RED_CARD_THRESHOLD = 2; // red cards worth calling out in the opening line

// Rivalry "heat" score — losses sting twice as much as a merely close game,
// and red cards carry the same weight as a loss since a feisty fixture reads
// as a rivalry even without a lopsided head-to-head record.
export function getRivalScore(entry) {
  if (!entry) return 0;
  return (entry.losses || 0) * 2 + (entry.closeGames || 0) + (entry.redCards || 0) * 2;
}

// A fixture becomes a rivalry once there's enough history (3+ meetings) AND
// either the heat score clears the threshold, or the raw losses alone hit
// the issue's own bar (3+), regardless of how the rest of the record reads.
export function isRival(entry) {
  if (!entry || (entry.played || 0) < MIN_MEETINGS_TO_QUALIFY) return false;
  return getRivalScore(entry) >= RIVAL_SCORE_THRESHOLD || (entry.losses || 0) >= RIVAL_LOSSES_THRESHOLD;
}

// Opening-line copy for the kickoff commentary / headline hook. Picks the
// single most newsworthy angle from the ledger, falling back to a generic
// rivalry line when nothing more specific stands out.
export function getRivalryLine(teamName, oppName, entry) {
  if (!entry) return `${teamName} and ${oppName} — old rivals renew hostilities.`;
  const played = entry.played || 0;
  const wins = entry.wins || 0;
  const redCards = entry.redCards || 0;

  if (wins === 0 && played > 0) {
    return `${teamName} haven't beaten ${oppName} in ${played} attempt${played === 1 ? "" : "s"}.`;
  }
  if (redCards >= FEISTY_RED_CARD_THRESHOLD) {
    return `${redCards} red cards in this fixture — it's never friendly.`;
  }
  return `${teamName} and ${oppName} — old rivals renew hostilities.`;
}

// Computes the rivalry modifier for the player's own fixture in a given
// matchweek, ready to spread onto the shared modifiers object passed into
// simulateMatchweek. Returns {} (safe to spread) when there's no player
// fixture that week or the opponent isn't a rival.
export function getRivalryModifierForFixture(league, matchweekIndex, teamName, clubHistory) {
  const week = league?.fixtures?.[matchweekIndex];
  if (!week) return {};
  const fixture = week.find(f => league.teams[f.home]?.isPlayer || league.teams[f.away]?.isPlayer);
  if (!fixture) return {};
  const oppTeam = league.teams[fixture.home]?.isPlayer ? league.teams[fixture.away] : league.teams[fixture.home];
  const entry = clubHistory?.rivalryLedger?.[oppTeam?.name];
  if (!entry || !isRival(entry)) return {};
  return { rivalry: { line: getRivalryLine(teamName, oppTeam.name, entry) } };
}
