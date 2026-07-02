// Canonical competition-wide stats accumulator and selectors.
//
// Competition-agnostic — the accumulator and selectors are reused for both
// league and cup stats.
//
// Identity model: every player entry is keyed by player.id when available,
// with a deterministic composite fallback for events that lack an id.
// Names are display-only.
//
// Idempotency: every accumulation call requires a `matchId`; subsequent
// calls for the same id are no-ops. The processed-match set lives inside
// the stats blob so it travels with the data on save/load.
//
// Pure: accumulateMatchStats never mutates its input. It returns a new
// stats object with copy-on-write players and processedMatches when the
// match adds new data, or the same input reference when it doesn't.

export function emptyCompetitionStats() {
  return { players: {}, processedMatches: {} };
}

function compositeFallbackKey(teamId, name, position) {
  // Deterministic composite for AI players whose events may not carry an id.
  // Lossy by design — name collisions within the same team+position will
  // collapse, which is acceptable since the alternative is fabricating ids.
  return `c|${teamId ?? "?"}|${name ?? "?"}|${position ?? "?"}`;
}

function playerKey({ playerId, teamId, name, position }) {
  if (playerId) return String(playerId);
  return compositeFallbackKey(teamId, name, position);
}

function emptyPlayerEntry(key, identity) {
  return {
    key,
    playerId: identity.playerId || null,
    name: identity.name || "",
    teamId: identity.teamId ?? null,
    teamName: identity.teamName || "",
    position: identity.position || null,
    goals: 0, assists: 0, yellows: 0, reds: 0,
  };
}

function mergeIdentity(prev, identity) {
  // Refresh display fields if an event carries a newer name/team/position.
  // Identity (key) stays stable, so this is safe between matches.
  return {
    ...prev,
    name: identity.name || prev.name,
    teamId: identity.teamId != null ? identity.teamId : prev.teamId,
    teamName: identity.teamName || prev.teamName,
    position: identity.position || prev.position,
  };
}

/**
 * Apply a completed match's stat-bearing events to the canonical store.
 *
 * Idempotent: if `matchId` is already recorded as processed, returns the
 * input stats reference unchanged.
 *
 * Pure: returns a new stats object when work is done; never mutates input.
 *
 * @param {object} stats           - existing canonical stats object
 * @param {object} input
 * @param {string} input.matchId   - required, unique per match per competition
 * @param {object} input.result    - simulateMatch return shape, must include `events`
 * @param {object} input.homeTeam  - { id, name, squad: [{ id, name, position }] }
 * @param {object} input.awayTeam  - same shape as homeTeam
 * @returns {object} a new stats object (or the same reference if no changes)
 */
export function accumulateMatchStats(stats, input) {
  if (!stats) return stats;
  if (!input || !input.matchId) return stats;
  if (stats.processedMatches?.[input.matchId]) return stats;

  const { result, homeTeam, awayTeam } = input;
  const teamFor = (side) => side === "home" ? homeTeam : awayTeam;

  const resolvePosition = (team, id, name) => {
    if (!team || !Array.isArray(team.squad)) return null;
    const found = id
      ? team.squad.find(p => p.id === id)
      : team.squad.find(p => p.name === name);
    return found ? (found.position || null) : null;
  };

  // Build per-player deltas before touching the stats object.
  const deltas = {};
  const touch = (identity, field) => {
    const key = playerKey(identity);
    if (!deltas[key]) deltas[key] = { identity, key, goals: 0, assists: 0, yellows: 0, reds: 0 };
    deltas[key][field] += 1;
    deltas[key].identity = identity;
  };

  if (result && Array.isArray(result.events)) {
    for (const evt of result.events) {
      if (!evt || (evt.side !== "home" && evt.side !== "away")) continue;
      const team = teamFor(evt.side) || {};

      if (evt.type === "goal") {
        const id = evt.playerId || null;
        const name = evt.player || "";
        if (id || name) {
          touch({
            playerId: id, name,
            teamId: team.id ?? null, teamName: team.name || "",
            position: resolvePosition(team, id, name),
          }, "goals");
        }
        if (evt.assisterId || evt.assister) {
          const aid = evt.assisterId || null;
          const aname = evt.assister || "";
          touch({
            playerId: aid, name: aname,
            teamId: team.id ?? null, teamName: team.name || "",
            position: resolvePosition(team, aid, aname),
          }, "assists");
        }
        continue;
      }

      if (evt.type === "card" || evt.type === "red_card") {
        const cid = evt.cardPlayerId || null;
        const cname = evt.cardPlayer || "";
        if (!cid && !cname) continue;
        const ident = {
          playerId: cid, name: cname,
          teamId: team.id ?? null, teamName: team.name || "",
          position: resolvePosition(team, cid, cname),
        };
        if (evt.type === "red_card") {
          touch(ident, "reds");
          // Second-yellow rule: a yellow that becomes a red counts as both.
          if (evt.countsAsYellow === true) touch(ident, "yellows");
        } else {
          touch(ident, "yellows");
        }
      }
    }
  }

  // Build the new stats object via copy-on-write.
  const prevPlayers = stats.players || {};
  const touchedKeys = Object.keys(deltas);
  const newPlayers = touchedKeys.length === 0 ? prevPlayers : { ...prevPlayers };
  for (const key of touchedKeys) {
    const d = deltas[key];
    const prev = newPlayers[key];
    const base = prev ? mergeIdentity(prev, d.identity) : emptyPlayerEntry(key, d.identity);
    newPlayers[key] = {
      ...base,
      goals: base.goals + d.goals,
      assists: base.assists + d.assists,
      yellows: base.yellows + d.yellows,
      reds: base.reds + d.reds,
    };
  }

  return {
    players: newPlayers,
    processedMatches: { ...(stats.processedMatches || {}), [input.matchId]: true },
  };
}

// === Selectors ===

function topBy(stats, field, limit = 20) {
  if (!stats || !stats.players) return [];
  const entries = Object.values(stats.players).filter(p => (p[field] || 0) > 0);
  // Tie-break: by field desc, then name asc for full stability.
  entries.sort((a, b) => {
    if (b[field] !== a[field]) return b[field] - a[field];
    return (a.name || "").localeCompare(b.name || "");
  });
  return entries.slice(0, limit);
}

export function getTopScorers(stats, limit = 20) { return topBy(stats, "goals", limit); }
export function getTopAssisters(stats, limit = 20) { return topBy(stats, "assists", limit); }
export function getMostYellows(stats, limit = 20) { return topBy(stats, "yellows", limit); }
export function getMostReds(stats, limit = 20) { return topBy(stats, "reds", limit); }

// === MatchId helpers ===

/**
 * Canonical league match id for the current season.
 * Format: league:S{season}:T{tier}:MD{matchweekIdx}:M{fixtureIdx}
 */
export function leagueMatchId({ season, tier, matchweekIdx, fixtureIdx }) {
  return `league:S${season}:T${tier}:MD${matchweekIdx}:M${fixtureIdx}`;
}

function slug(s) {
  return String(s ?? "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "_";
}

/**
 * Deterministic key for indexing per-cup stats stores. The cup name (e.g.
 * "Clubman Cup", "Sub Money Cup") is the natural identity — slug it so
 * non-alphanumerics don't break object keys.
 */
export function cupKey(cupName) {
  return slug(cupName);
}

/**
 * Canonical cup match id for the current season.
 * Format: cup:S{season}:{cupSlug}:R{roundIdx}:{homeSlug}-{awaySlug}
 *
 * cupName, home and away are sanitised so non-alphanumeric chars don't
 * break the id. Different home/away order produces a different id, which
 * is correct — the same fixture flipped is a different match in the cup.
 */
export function cupMatchId({ season, cupName, roundIdx, home, away }) {
  return `cup:S${season}:${slug(cupName)}:R${roundIdx}:${slug(home)}-${slug(away)}`;
}

/**
 * Apply a single cup match's events to the canonical cup stats.
 * Cup teams have no numeric id, so the team name is used as `teamId`.
 */
export function accumulateCupMatch(prev, { home, away, result, season, cupName, roundIdx }) {
  if (!home || !away || !result) return prev;
  return accumulateMatchStats(prev, {
    matchId: cupMatchId({ season, cupName, roundIdx, home: home.name, away: away.name }),
    result,
    homeTeam: { id: home.name, name: home.name, squad: home.squad || [] },
    awayTeam: { id: away.name, name: away.name, squad: away.squad || [] },
  });
}

/**
 * Build a callback for advanceCupRound that funnels each AI cup-match sim
 * result into the canonical seasonCupStatsByCup store via the supplied
 * setter. The cup's events are routed into seasonCupStatsByCup[cupKey].
 */
export function makeCupAIMatchHandler(setSeasonCupStatsByCup, season, cupName) {
  const key = cupKey(cupName);
  return (homeTeam, awayTeam, simResult, roundIdx) => {
    setSeasonCupStatsByCup(prev => {
      const cupBlob = (prev || {})[key] || emptyCompetitionStats();
      const next = accumulateCupMatch(cupBlob, {
        home: homeTeam, away: awayTeam, result: simResult, season, cupName, roundIdx,
      });
      if (next === cupBlob) return prev || {};
      return { ...(prev || {}), [key]: next };
    });
  };
}

// === All-time roll-up ===

/**
 * Fold a season's stats into an all-time stats blob. Both objects share the
 * competitionStats shape. Pure — returns a new all-time object.
 *
 * `processedMatches` from the season is NOT carried over into all-time
 * (all-time tracks cumulative totals, not individual match ids).
 */
export function rollIntoAllTime(allTime, season) {
  const base = allTime || emptyCompetitionStats();
  if (!season || !season.players || Object.keys(season.players).length === 0) {
    return base;
  }
  const newPlayers = { ...(base.players || {}) };
  for (const [key, sEntry] of Object.entries(season.players)) {
    const prev = newPlayers[key];
    if (!prev) {
      newPlayers[key] = {
        key,
        playerId: sEntry.playerId || null,
        name: sEntry.name || "",
        teamId: sEntry.teamId ?? null,
        teamName: sEntry.teamName || "",
        position: sEntry.position || null,
        goals: sEntry.goals || 0,
        assists: sEntry.assists || 0,
        yellows: sEntry.yellows || 0,
        reds: sEntry.reds || 0,
      };
      continue;
    }
    newPlayers[key] = {
      ...prev,
      // Refresh display fields with the most recent identity
      name: sEntry.name || prev.name,
      teamId: sEntry.teamId != null ? sEntry.teamId : prev.teamId,
      teamName: sEntry.teamName || prev.teamName,
      position: sEntry.position || prev.position,
      goals: (prev.goals || 0) + (sEntry.goals || 0),
      assists: (prev.assists || 0) + (sEntry.assists || 0),
      yellows: (prev.yellows || 0) + (sEntry.yellows || 0),
      reds: (prev.reds || 0) + (sEntry.reds || 0),
    };
  }
  return {
    players: newPlayers,
    processedMatches: base.processedMatches || {},
  };
}

/**
 * Merge per-tier competitionStats blobs into a single career-wide blob.
 *
 * AI teams are promoted/relegated most seasons, so a player's per-tier
 * all-time board only reflects their contribution since their team's most
 * recent arrival in that division. This sums the same player key across
 * every tier so their full career shows up in one place, additive to (not
 * a replacement for) the per-division record books.
 *
 * Identity fields (name/teamName/position) are taken from whichever tier's
 * entry has the most goals for that key, so display shows the player's
 * most notable spell rather than an arbitrary last-write-wins pick.
 *
 * Pure — returns a new blob; never mutates any input.
 *
 * @param {object} statsByTier - { [tier]: competitionStatsBlob }
 * @returns {{players: object}}
 */
export function mergeStatsAcrossTiers(statsByTier) {
  const players = {};
  if (!statsByTier) return { players };

  for (const blob of Object.values(statsByTier)) {
    if (!blob || !blob.players) continue;
    for (const [key, entry] of Object.entries(blob.players)) {
      const prev = players[key];
      if (!prev) {
        players[key] = {
          key,
          playerId: entry.playerId || null,
          name: entry.name || "",
          teamId: entry.teamId ?? null,
          teamName: entry.teamName || "",
          position: entry.position || null,
          goals: entry.goals || 0,
          assists: entry.assists || 0,
          yellows: entry.yellows || 0,
          reds: entry.reds || 0,
        };
        continue;
      }
      // Identity comes from whichever tier entry has the most goals — the
      // player's dominant spell — not the most recently merged one.
      const useNewIdentity = (entry.goals || 0) > (prev.goals || 0);
      players[key] = {
        ...prev,
        name: useNewIdentity ? (entry.name || prev.name) : prev.name,
        teamId: useNewIdentity ? (entry.teamId ?? prev.teamId) : prev.teamId,
        teamName: useNewIdentity ? (entry.teamName || prev.teamName) : prev.teamName,
        position: useNewIdentity ? (entry.position || prev.position) : prev.position,
        goals: (prev.goals || 0) + (entry.goals || 0),
        assists: (prev.assists || 0) + (entry.assists || 0),
        yellows: (prev.yellows || 0) + (entry.yellows || 0),
        reds: (prev.reds || 0) + (entry.reds || 0),
      };
    }
  }

  return { players };
}

// Internal — exposed only for tests
export const __test = { playerKey, compositeFallbackKey };
