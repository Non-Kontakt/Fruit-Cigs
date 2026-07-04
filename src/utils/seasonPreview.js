import { pickRandom } from "./calc.js";

/**
 * Tenure-aware / context-aware copy for the season preview inbox message
 * (fired on Summer Week 5, just before the new season kicks off).
 *
 * Two independent axes decide which line opens the preview:
 *  - tenure band: how long the manager has been at the club
 *  - context: what happened at the end of last season
 *
 * Both are pure derivations so they're testable without touching the hook.
 */

/** How long the manager has been in charge, by season number of the NEW season. */
export function getTenureBand(seasonNumber) {
  if (seasonNumber <= 1) return "fresh";
  if (seasonNumber < 8) return "building";
  return "veteran";
}

/**
 * What happened at the end of last season, from the manager's perspective.
 * Title defence takes priority over promotion/relegation since it's the
 * more specific, rarer story (and a promotion-tier win already reads as
 * "promoted", not "title defence" — defence only applies when the club
 * stayed in the same division after winning it).
 */
export function getSeasonContext({ lastSeasonMove, clubHistory, leagueTier }) {
  const archive = clubHistory?.seasonArchive || [];
  const lastEntry = archive.length > 0 ? archive[archive.length - 1] : null;
  if (lastEntry && lastEntry.position === 1 && lastEntry.tier === leagueTier) return "title_defence";
  if (lastSeasonMove === "promoted") return "post_promotion";
  if (lastSeasonMove === "relegated") return "post_relegation";
  return "default";
}

// { [context]: { [tenureBand]: [line, ...] } } — one line is picked at random
// per band so repeat seasons in the same band don't read identically.
const OPENERS = {
  fresh: {
    // Season 1 — no tenure/context history exists yet, so context is ignored.
    default: [
      "A new job, a new dugout, a new division to make your mark on.",
      "First day in the hot seat. Nobody knows what to expect from you yet.",
      "A clean slate — no history, no baggage, just a squad and a season ahead.",
    ],
  },
  building: {
    default: [
      "Still finding your feet, but the project is taking shape.",
      "Another season to build something that lasts.",
      "The foundations are in — now it's about building on them.",
    ],
    post_promotion: [
      "Up you go — a step into unfamiliar company, and a chance to prove last season wasn't a fluke.",
      "Promotion earned, and now the hard part: showing you belong at this level.",
    ],
    post_relegation: [
      "Relegation stings, but a promotion push starts now.",
      "Back down a level. Time to make sure this stop is a short one.",
    ],
    title_defence: [
      "Champions, and now everyone's out to prove it was a one-off. Time to show it wasn't.",
      "The title is yours — defending it is a different kind of pressure entirely.",
    ],
  },
  veteran: {
    default: [
      "Part of the furniture now. The board expects results, not excuses.",
      "You've seen it all here by now — another season, same standards.",
      "Long past the honeymoon period. This club is yours to shape.",
    ],
    post_promotion: [
      "Still climbing after all these years — promotion never gets old.",
      "A veteran manager, a fresh division. Some challenges never stop coming.",
    ],
    post_relegation: [
      "After everything you've built here, relegation is a bitter pill — but not the end of the story.",
      "Even the old guard takes a fall sometimes. Time to put it right.",
    ],
    title_defence: [
      "Another title to defend. At this club, that's simply what's expected of you now.",
      "You've made winning look routine — now do it all again.",
    ],
  },
};

function pickOpener(band, context) {
  const bandOpeners = OPENERS[band] || OPENERS.building;
  const lines = bandOpeners[context] || bandOpeners.default;
  return pickRandom(lines);
}

/**
 * Build the full season preview inbox body: a tenure/context-aware opener,
 * the rival-to-watch line, and the existing tier expectation line.
 */
export function buildSeasonPreviewBody({
  seasonNumber, leagueTier, leagueName, topTeamName, expectation,
  lastSeasonMove, clubHistory,
}) {
  const band = getTenureBand(seasonNumber);
  const context = band === "fresh" ? "default" : getSeasonContext({ lastSeasonMove, clubHistory, leagueTier });
  const opener = pickOpener(band, context);

  let body = `${opener} A new season in ${leagueName} awaits.`;
  if (topTeamName) body += ` ${topTeamName} look like the ones to beat this season.`;
  body += ` ${expectation}`;
  return body;
}
