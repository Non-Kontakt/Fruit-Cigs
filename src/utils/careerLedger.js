// Player career ledger — club-only player biography that knows where stats
// were earned across leagues and cups, without polluting the canonical
// competition record books.
//
// Distinct from the per-tier / per-cup competition stores:
//   - allTimeLeagueStatsByTier / allTimeCupStatsByCup are competition records
//     ("all-time Div 8 top scorers", "all-time Clubman Cup top scorers").
//   - playerCareers is the player's own career across the club:
//     ("Remy Diaby scored 10 goals in Div 8, 14 in Div 7, 3 in Clubman Cup").
//
// archivePlayerSeason consumes canonical per-competition season blobs to
// build the per-tier / per-cup breakdown. Apps and motm split per-competition
// is not supported (canonical doesn't track them) so those stay aggregate
// only on the broad season totals.
//
// Pure: returns a new playerCareers object; never mutates input.

import { cupKey } from "./competitionStats.js";

function emptyCareer() {
  return {
    goals: 0, assists: 0, apps: 0, motm: 0, yellows: 0, reds: 0,
    seasons: [],
    competitions: {},
  };
}

function emptyCompetitionAggregate(meta) {
  return {
    type: meta.type,           // "league" | "cup"
    tier: meta.tier ?? null,   // league only
    label: meta.label || "",
    goals: 0, assists: 0, yellows: 0, reds: 0,
    seasons: [],               // [{ season, goals, assists, yellows, reds }]
  };
}

// Look up a player's per-competition entry by stable id, with composite-key
// fallback. canonical = a competitionStats blob ({ players, processedMatches }).
function lookupCanonicalEntry(canonical, { playerId, teamId, name, position }) {
  if (!canonical || !canonical.players) return null;
  if (playerId && canonical.players[String(playerId)]) {
    return canonical.players[String(playerId)];
  }
  // Fallback: composite key — `c|{teamId}|{name}|{position}`. Tolerate missing
  // position by trying the explicit one first then null.
  const tryComposite = (pos) => {
    const key = `c|${teamId ?? "?"}|${name ?? "?"}|${pos ?? "?"}`;
    return canonical.players[key] || null;
  };
  return tryComposite(position) || tryComposite(null);
}

function pickStatFields(entry) {
  if (!entry) return { goals: 0, assists: 0, yellows: 0, reds: 0 };
  return {
    goals: entry.goals || 0,
    assists: entry.assists || 0,
    yellows: entry.yellows || 0,
    reds: entry.reds || 0,
  };
}

function sumStat(a, b) {
  return {
    goals: (a.goals || 0) + (b.goals || 0),
    assists: (a.assists || 0) + (b.assists || 0),
    yellows: (a.yellows || 0) + (b.yellows || 0),
    reds: (a.reds || 0) + (b.reds || 0),
  };
}

function hasAnyStat(s) {
  return (s.goals || 0) > 0 || (s.assists || 0) > 0
      || (s.yellows || 0) > 0 || (s.reds || 0) > 0;
}

/**
 * Resolve the career-key for a given player, preferring playerId match over
 * name. This is the same identity logic the archiver uses, exposed so that
 * other paths (retirement metadata, etc.) can attach to the right career
 * entry instead of accidentally duplicating one under a new name.
 *
 * Returns the existing key when found, or the supplied `name` as the
 * fall-through key for callers that want to create a new entry there.
 */
export function findCareerKey(playerCareers, { playerId, name }) {
  if (!playerCareers) return name || null;
  if (playerId) {
    for (const [key, c] of Object.entries(playerCareers)) {
      if (c && c.playerId && String(c.playerId) === String(playerId)) {
        return key;
      }
    }
  }
  if (name && playerCareers[name]) return name;
  return name || null;
}

/**
 * Total appearances for the club across a player's whole career: archived
 * seasons (clubHistory.playerCareers) plus the season in progress
 * (playerSeasonStats). Mirrors the inline pattern used by the Fifty Not Out
 * / Century Club achievement checks in utils/achievements.js.
 * @param {Object} player - { id, name }
 * @param {Object} playerSeasonStats - current-season stats, keyed by name
 * @param {Object} playerCareers - clubHistory.playerCareers
 * @returns {number}
 */
export function getCareerApps(player, playerSeasonStats, playerCareers) {
  const cKey = findCareerKey(playerCareers, { playerId: player?.id, name: player?.name });
  const archivedApps = (cKey ? playerCareers?.[cKey]?.apps : 0) || 0;
  const seasonApps = playerSeasonStats?.[player?.name]?.apps || 0;
  return archivedApps + seasonApps;
}

function findExistingCareer(playerCareers, playerId, name) {
  const key = findCareerKey(playerCareers, { playerId, name });
  return { name: key, career: key && playerCareers[key] ? playerCareers[key] : null };
}

/**
 * Archive the player team's current season into clubHistory.playerCareers.
 *
 * Iterates the player squad. For each player it adds:
 *   - broad season totals from playerSeasonStats (goals/assists/apps/motm/yellows/reds + avgRating)
 *   - per-competition breakdown (goals/assists/yellows/reds) from canonical stores:
 *       seasonLeagueStatsByTier[currentTier]  → competitions["league:T{tier}"]
 *       seasonCupStatsByCup[cupKey]           → competitions[cupKey]
 *   - the same per-competition breakdown is also recorded under the season entry's
 *     `competitions` field so future UIs can show e.g. Season 3 Div 8 split.
 *
 * Pure: returns a new playerCareers object. Old careers without a
 * `competitions` field are preserved unchanged except for the new season
 * being appended.
 *
 * @param {object} playerCareers       existing clubHistory.playerCareers
 * @param {object} input
 * @param {Array}  input.squad         player team squad (with id, name, position)
 * @param {object} input.playerSeasonStats  broad name-keyed season totals
 * @param {object} input.playerTierSeasonStats  seasonLeagueStatsByTier[currentTier] blob
 * @param {object} input.seasonCupStatsByCup    full per-cup season store
 * @param {object} input.cupLabels     { [cupKey]: cupName }
 * @param {object} input.playerRatingTracker  { [playerId]: ratings[] }
 * @param {object} input.playerRatingNames    { [playerId]: name }
 * @param {number} input.season
 * @param {number} input.tier
 * @param {string} input.leagueName
 * @returns {object} new playerCareers
 */
export function archivePlayerSeason(playerCareers, input) {
  const {
    squad = [],
    playerSeasonStats = {},
    playerTierSeasonStats = null,
    seasonCupStatsByCup = {},
    cupLabels = {},
    playerRatingTracker = {},
    playerRatingNames = {},
    season,
    tier,
    leagueName,
  } = input || {};

  const next = { ...(playerCareers || {}) };

  const leagueCompKey = `league:T${tier}`;
  const leagueCompMeta = { type: "league", tier, label: leagueName || "" };

  const playerTierTeamId = squad.length > 0 && playerTierSeasonStats?.players
    ? (() => {
        // Pick any squad player's canonical entry to discover the team id.
        for (const p of squad) {
          const e = lookupCanonicalEntry(playerTierSeasonStats, {
            playerId: p.id, teamId: null, name: p.name, position: p.position,
          });
          if (e && e.teamId != null) return e.teamId;
        }
        return null;
      })()
    : null;

  for (const [name, sStats] of Object.entries(playerSeasonStats)) {
    if (!sStats) continue;

    // Resolve squad player + ids
    const squadPlayer = squad.find(p => p.name === name);
    const playerId = squadPlayer?.id || null;
    const position = squadPlayer?.position || sStats.position || "?";

    // Reuse existing career entry by playerId first, else by name.
    const found = findExistingCareer(next, playerId, name);
    const careerKey = found.name; // back-compat: keep existing key
    const prevCareer = found.career;
    const career = prevCareer
      ? { ...prevCareer, seasons: [...(prevCareer.seasons || [])], competitions: { ...(prevCareer.competitions || {}) } }
      : emptyCareer();

    // Stable id is recorded for future code; never overwritten with null.
    if (playerId && !career.playerId) career.playerId = playerId;

    // === Broad career totals ===
    career.goals = (career.goals || 0) + (sStats.goals || 0);
    career.assists = (career.assists || 0) + (sStats.assists || 0);
    career.apps = (career.apps || 0) + (sStats.apps || 0);
    career.motm = (career.motm || 0) + (sStats.motm || 0);
    career.yellows = (career.yellows || 0) + (sStats.yellows || 0);
    career.reds = (career.reds || 0) + (sStats.reds || 0);

    // === avgRating from rating tracker ===
    let ratingId = playerId;
    if (!ratingId) {
      const entry = Object.entries(playerRatingNames).find(([, n]) => n === name);
      ratingId = entry?.[0];
    }
    const ratings = ratingId ? (playerRatingTracker[ratingId] || []) : [];
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100
      : 0;

    // === Per-competition breakdown ===
    const leagueEntry = playerTierSeasonStats
      ? lookupCanonicalEntry(playerTierSeasonStats, { playerId, teamId: playerTierTeamId, name, position })
      : null;
    const leagueSplit = pickStatFields(leagueEntry);

    const cupSplits = {}; // cupKey -> { label, stats }
    for (const [key, cupBlob] of Object.entries(seasonCupStatsByCup || {})) {
      if (!cupBlob || !cupBlob.players) continue;
      // Cup canonical entries use teamName as teamId — derive from squad lookup.
      const cupEntry = lookupCanonicalEntry(cupBlob, {
        playerId,
        teamId: null, // can't reliably know the team-name id here without iterating; lookup will skip composite if id matches
        name, position,
      });
      const cupStats = pickStatFields(cupEntry);
      if (hasAnyStat(cupStats)) {
        cupSplits[key] = { label: cupLabels[key] || key, stats: cupStats };
      }
    }

    // === Season entry ===
    const seasonEntry = {
      season,
      tier,
      leagueName: leagueName || "",
      position,
      avgRating,
      goals: sStats.goals || 0,
      assists: sStats.assists || 0,
      apps: sStats.apps || 0,
      motm: sStats.motm || 0,
      yellows: sStats.yellows || 0,
      reds: sStats.reds || 0,
      competitions: {
        league: hasAnyStat(leagueSplit)
          ? { key: leagueCompKey, ...leagueCompMeta, ...leagueSplit }
          : null,
        cups: Object.fromEntries(
          Object.entries(cupSplits).map(([key, { label, stats }]) => [
            key, { key, type: "cup", label, ...stats },
          ])
        ),
      },
    };
    career.seasons.push(seasonEntry);

    // === Cumulative competitions index ===
    if (hasAnyStat(leagueSplit)) {
      const prev = career.competitions[leagueCompKey] || emptyCompetitionAggregate(leagueCompMeta);
      const merged = { ...prev, ...leagueCompMeta, ...sumStat(prev, leagueSplit) };
      merged.seasons = [...(prev.seasons || []), { season, ...leagueSplit }];
      career.competitions[leagueCompKey] = merged;
    }
    for (const [key, { label, stats }] of Object.entries(cupSplits)) {
      const meta = { type: "cup", tier: null, label };
      const prev = career.competitions[key] || emptyCompetitionAggregate(meta);
      const merged = { ...prev, ...meta, ...sumStat(prev, stats) };
      merged.seasons = [...(prev.seasons || []), { season, ...stats }];
      career.competitions[key] = merged;
    }

    next[careerKey] = career;
  }

  return next;
}

/**
 * Build a `cupKey -> cupName` label map from the season's cup state. The
 * stat store keys are slugged cup names (cupKey()), but the UI wants the
 * original display name. Normally callers will compose this from the cup
 * being played plus any all-time map.
 */
export function deriveCupLabels(currentCup, ...extraSources) {
  const labels = {};
  const add = (name) => {
    if (!name) return;
    labels[cupKey(name)] = name;
  };
  if (currentCup?.cupName) add(currentCup.cupName);
  for (const source of extraSources) {
    if (!source) continue;
    if (typeof source === "object") {
      for (const v of Object.values(source)) {
        if (typeof v === "string") add(v);
        else if (v && typeof v === "object" && v.cupName) add(v.cupName);
      }
    }
  }
  return labels;
}
