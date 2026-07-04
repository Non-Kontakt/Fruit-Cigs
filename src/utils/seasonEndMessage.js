// Builds the subtitle shown on the season-end reveal screen. Tiers with a
// post-league knockout (Euro Dynasty's Dynasty Cup, World XI's 5v5
// Mini-Tournament) need the tournament outcome woven into the copy — league
// position alone doesn't tell the whole story once a cup run is involved.
import { getModifier } from "../data/leagueModifiers.js";

const ordSuffix = (n) => (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");

function miniTournamentLabel(finish) {
  switch (finish) {
    case "winner": return "Won the 5v5 Mini-Tournament!";
    case "runner_up": return "Runner-up in the 5v5 Mini-Tournament.";
    case "third_place": return "Won the 3rd-place playoff in the 5v5 Mini-Tournament.";
    case "eliminated": return "Eliminated in the 5v5 Mini-Tournament semi-final.";
    default: return null; // didn't qualify
  }
}

function dynastyCupLabel(finish) {
  switch (finish) {
    case "winner": return "Won the Dynasty Cup!";
    case "runner_up": return "Dynasty Cup Runner-up.";
    case "semi_finalist": return "Dynasty Cup Semi-finalist.";
    default: return null; // didn't qualify
  }
}

// Returns a short tournament-outcome fragment for tiers that run a
// post-league knockout, or null for tiers/finishes where nothing applies
// (including "didn't qualify" — that's the unremarkable default and isn't
// worth calling out in every mid-table summary).
export function tournamentOutcomeLabel(fromTier, miniTournamentFinish, dynastyCupFinish) {
  const mod = getModifier(fromTier);
  if (mod.miniTournament) return miniTournamentLabel(miniTournamentFinish);
  if (mod.knockoutAtEnd) return dynastyCupLabel(dynastyCupFinish);
  return null;
}

export function buildSeasonEndSubtitle(info) {
  const { position, type, fromTier, leagueName, newLeagueName, isInvincible, prestigeLevel, miniTournamentFinish, dynastyCupFinish } = info;
  const isChampion = position === 1;
  const isPromoted = type === "promoted";
  const isRelegated = type === "relegated";
  const tournamentLabel = tournamentOutcomeLabel(fromTier, miniTournamentFinish, dynastyCupFinish);

  if (isInvincible && isPromoted) {
    return `Undefeated champions of ${leagueName}! A perfect season.${tournamentLabel ? ` ${tournamentLabel}` : ""} Moving up to ${newLeagueName}.`;
  }
  if (isInvincible) {
    return `Undefeated champions of ${leagueName}! A perfect season.`;
  }
  if (isChampion && isPromoted) {
    return `Champions of ${leagueName}!${tournamentLabel ? ` ${tournamentLabel}` : ""} Moving up to ${newLeagueName}.`;
  }
  if (isChampion && fromTier === 1) {
    return (prestigeLevel != null && prestigeLevel < 5)
      ? `Champions of ${leagueName}! A wormhole opens beyond the pyramid...`
      : `Champions of ${leagueName}! Top of the pyramid.`;
  }
  if (isChampion) {
    return `Champions of ${leagueName}!${tournamentLabel ? ` ${tournamentLabel}` : ""}`;
  }
  if (isPromoted && tournamentLabel) {
    return `${tournamentLabel} Promoted to ${newLeagueName}!`;
  }
  if (isPromoted) {
    return `Finished ${position}${ordSuffix(position)} in ${leagueName}. Promoted to ${newLeagueName}!`;
  }
  if (isRelegated && tournamentLabel) {
    return `Finished ${position}${ordSuffix(position)} in ${leagueName}. ${tournamentLabel} Dropping to ${newLeagueName}.`;
  }
  if (isRelegated) {
    return `Finished ${position}${ordSuffix(position)} in ${leagueName}. Dropping to ${newLeagueName}.`;
  }
  if (tournamentLabel) {
    return `Finished ${position}${ordSuffix(position)} in ${leagueName}. ${tournamentLabel} Same league next season.`;
  }
  return `Finished ${position}${ordSuffix(position)} in ${leagueName}. Same league next season.`;
}
