// Pure data-transformation helpers extracted from useSaveGame's loadGame.
//
// Each function here takes a piece of a deserialized save blob and returns
// (or mutates-and-returns) its migrated shape. None of them call React
// state setters or Zustand store actions — that orchestration (deciding
// *when* to call these, and wiring results into the store) stays in
// useSaveGame.js. Keeping these as (input) => output functions is what
// makes them independently testable with hand-built fixture saves.
//
// A handful of loadGame's migration sections are NOT here because they're
// entangled with React setters or intertwined enough that extracting them
// risked changing behavior (see useSaveGame.js for what's left inline and
// why — notably the two retroactive-achievement reconstruction blocks).

import { ATTRIBUTES } from "../data/training.js";
import { POSITION_TYPES } from "../data/positions.js";
import { LEAGUE_DEFS, NUM_TIERS, AI_BENCH_POSITIONS } from "../data/leagues.js";
import { STORY_ARCS } from "../data/storyArcs.js";
import { getModifier } from "../data/leagueModifiers.js";
import { rand, getOverall } from "./calc.js";
import { getOvrCap, pickAINationality, generateNameForNation, inferNationality, generateSquadPhilosophy, renameDuplicateNames } from "./player.js";
import { initLeague, initCup, buildSeasonCalendar, computeCalendarIndex } from "./league.js";

/**
 * Backfill nationality/statProgress/potential on a loaded squad, then
 * repair any duplicate names (later duplicate gets a suffix; ids are
 * untouched).
 */
export function migrateSquadBackfill(rawSquad, prestigeLevel) {
  const loadOvrCap = getOvrCap(prestigeLevel || 0);
  const rawMigratedSquad = (rawSquad || []).map(p => {
    const migrated = { ...p };
    if (!migrated.nationality) migrated.nationality = inferNationality(migrated.name);
    if (!migrated.statProgress) migrated.statProgress = {};
    if (migrated.potential == null) {
      const ovr = getOverall(migrated);
      const maxGap = migrated.age <= 19 ? rand(5, 10)
        : migrated.age <= 23 ? rand(3, 8)
        : migrated.age <= 27 ? rand(2, 5)
        : migrated.age <= 30 ? rand(1, 3)
        : rand(0, 2);
      migrated.potential = Math.min(loadOvrCap, ovr + maxGap);
    }
    return migrated;
  });
  return renameDuplicateNames(rawMigratedSquad);
}

/**
 * Patch AI team squads: backfill missing names/nationalities, add a bench
 * if the squad only has 11, and repair duplicate names. Mutates each
 * team's `squad` array in place (matches the original inline migration).
 *
 * @param {array} teams - league.teams
 * @param {number} [fallbackTier] - tier to use when a team has none of its own
 */
export function migrateAITeamSquads(teams, fallbackTier) {
  (teams || []).forEach(team => {
    if (team.isPlayer) return;
    const migTier = team.tier || fallbackTier || 11;
    if (!team.squad) return;
    team.squad.forEach(p => {
      if (!p.nationality) p.nationality = pickAINationality(migTier);
      if (!p.name) {
        const nd = generateNameForNation(p.nationality || pickAINationality(migTier));
        p.name = nd.name;
      }
    });
    if (team.squad.length <= 11) {
      const strength = team.strength || 0.5;
      const minBase = Math.max(1, Math.round(2 + strength * 4) - 1);
      const maxBase = Math.max(2, Math.round(5 + strength * 6) - 1);
      AI_BENCH_POSITIONS.forEach((pos) => {
        const attrs = {};
        const type = POSITION_TYPES[pos];
        const biases = { GK: { defending: 3, physical: 2, mental: 1 }, DEF: { defending: 3, physical: 2, mental: 1 }, MID: { passing: 3, technique: 2, mental: 1 }, FWD: { shooting: 3, pace: 2, technique: 1 } };
        ATTRIBUTES.forEach(({ key }) => {
          const bias = (biases[type] && biases[type][key]) || 0;
          attrs[key] = Math.max(1, Math.min(14, rand(minBase, maxBase) + bias));
        });
        const nc = pickAINationality(migTier);
        const nd = generateNameForNation(nc);
        team.squad.push({ name: nd.name, position: pos, attrs, isBench: true, nationality: nc });
      });
    }
    team.squad = renameDuplicateNames(team.squad);
  });
  return teams;
}

/** Backfill age/id on AI players from saves that predate the aging system. */
export function backfillAISquadDefaults(squad) {
  (squad || []).forEach(p => {
    if (p.age == null) p.age = rand(22, 33);
    if (p.id == null) p.id = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  });
  return squad;
}

/** Backfill squadPhilosophy + trajectory on every tier's roster configs. */
export function backfillRosterPhilosophy(leagueRosters) {
  if (!leagueRosters) return leagueRosters;
  for (let t = 1; t <= NUM_TIERS; t++) {
    (leagueRosters[t] || []).forEach(cfg => {
      if (!cfg.squadPhilosophy) cfg.squadPhilosophy = generateSquadPhilosophy(cfg.trait);
      if (cfg.trajectory === undefined) cfg.trajectory = 0;
    });
  }
  return leagueRosters;
}

/**
 * Migrate a save's `league` object from the old 3-tier system (tier <= 3,
 * no leagueVersion) to the 11-tier system. Mutates `s.league`/`s.leagueTier`
 * in place; no-ops if the save isn't in the legacy shape.
 */
export function migrateLegacyLeagueTier3to11(s) {
  if (!(s.league && !s.leagueVersion && s.league.tier && s.league.tier <= 3)) return;
  const tierMap = { 1: 5, 2: 6, 3: 7 };
  s.league.tier = tierMap[s.league.tier] || 7;
  if (s.leagueTier && s.leagueTier <= 3) s.leagueTier = tierMap[s.leagueTier] || 7;
  const newDef = LEAGUE_DEFS[s.league.tier];
  if (newDef) {
    s.league.leagueName = newDef.name;
    s.league.leagueColor = newDef.color;
  }
}

/**
 * Migrate old leagueRosters keys {1,2,3} to {5,6,7} (pre-leagueVersion
 * saves only). Returns the same reference unchanged if migration doesn't
 * apply — callers should still run ensureAllTierRosters afterward.
 */
export function migrateLegacyRosterKeys(leagueRosters, leagueVersion) {
  if (!leagueRosters || leagueVersion) return leagueRosters;
  const old = leagueRosters;
  if (!(old[1] && !old[5])) return leagueRosters;
  const migrated = {};
  if (old[1]) migrated[5] = old[1];
  if (old[2]) migrated[6] = old[2];
  if (old[3]) migrated[7] = old[3];
  for (let t = 1; t <= NUM_TIERS; t++) {
    if (!migrated[t]) migrated[t] = (LEAGUE_DEFS[t]?.teams || []).map(c => ({ ...c }));
  }
  return migrated;
}

/** Fill in any tier missing from leagueRosters with its default teams. */
export function ensureAllTierRosters(leagueRosters) {
  if (!leagueRosters) return leagueRosters;
  for (let t = 1; t <= NUM_TIERS; t++) {
    if (!leagueRosters[t]) leagueRosters[t] = (LEAGUE_DEFS[t]?.teams || []).map(c => ({ ...c }));
  }
  return leagueRosters;
}

/**
 * V2 → V3 league repair. Rebuilds any non-played-tier roster that's more
 * than half overwritten by non-default team names (a sign of an earlier
 * generation bug), and re-initializes the player's league/cup entirely if
 * they were saved below tier 4 (a state V3 no longer allows). Mutates `s`
 * in place; no-ops if the save isn't tagged V2 (or pre-versioning with
 * leagueRosters present).
 */
export function repairLeagueV2ToV3(s, migratedSquad) {
  if (!(s.leagueVersion === 2 || (!s.leagueVersion && s.leagueRosters))) return;
  const playedTiers = new Set([5, 6, 7]);
  if (s.leagueRosters) {
    for (let t = 1; t <= NUM_TIERS; t++) {
      if (playedTiers.has(t)) continue;
      const defaultNames = new Set((LEAGUE_DEFS[t]?.teams || []).map(tm => tm.name));
      const current = s.leagueRosters[t] || [];
      const intact = current.filter(tm => defaultNames.has(tm.name)).length;
      if (intact < Math.ceil(defaultNames.size / 2)) {
        s.leagueRosters[t] = (LEAGUE_DEFS[t]?.teams || []).map(c => ({ ...c }));
      }
    }
  }
  const currentSaveTier = s.league?.tier || s.leagueTier || 5;
  if (currentSaveTier < 4) {
    s.leagueTier = 4;
    const repairedTier = 4;
    s.league = initLeague(migratedSquad, s.teamName, repairedTier, s.leagueRosters, null, s.prestigeLevel || 0);
    s.cup = initCup(s.teamName, repairedTier, s.leagueRosters);
    s.seasonCalendar = null;
    s.calendarIndex = 0;
    s.calendarResults = {};
    s.leagueResults = {};
  }
  s.leagueVersion = 3;
}

/** The 11-tier value a (possibly legacy) leagueTier migrates to. */
export function resolveMigratedTier(leagueTier, leagueVersion) {
  const savedTier = leagueTier || NUM_TIERS;
  return (!leagueVersion && savedTier <= 3) ? ({ 1: 5, 2: 6, 3: 7 }[savedTier] || 7) : savedTier;
}

/** Sync league.tier to migratedTier and refresh leagueName/leagueColor from LEAGUE_DEFS. */
export function syncLeagueTierAndNames(league, migratedTier) {
  if (!league) return league;
  league.tier = migratedTier;
  if (LEAGUE_DEFS[league.tier]) {
    league.leagueName = LEAGUE_DEFS[league.tier].name;
    league.leagueColor = LEAGUE_DEFS[league.tier].color;
  }
  return league;
}

/** Refresh each seasonHistory entry's leagueName from its tier. */
export function migrateSeasonHistoryNames(seasonHistory) {
  if (!seasonHistory) return seasonHistory;
  return seasonHistory.map(entry => {
    if (entry.tier && LEAGUE_DEFS[entry.tier]) {
      return { ...entry, leagueName: LEAGUE_DEFS[entry.tier].name };
    }
    return entry;
  });
}

/**
 * Refresh clubHistory's league names (bestSeasonFinish + seasonArchive) and
 * strip the "The " cup-name prefix from cupHistory. Mutates and returns the
 * same object.
 */
export function migrateClubHistoryNames(clubHistory) {
  if (!clubHistory) return clubHistory;
  if (clubHistory.bestSeasonFinish?.tier && LEAGUE_DEFS[clubHistory.bestSeasonFinish.tier]) {
    clubHistory.bestSeasonFinish.leagueName = LEAGUE_DEFS[clubHistory.bestSeasonFinish.tier].name;
  }
  if (clubHistory.seasonArchive) {
    clubHistory.seasonArchive = clubHistory.seasonArchive.map(entry => {
      if (entry.tier && LEAGUE_DEFS[entry.tier]) return { ...entry, leagueName: LEAGUE_DEFS[entry.tier].name };
      return entry;
    });
  }
  if (clubHistory.cupHistory) {
    clubHistory.cupHistory = clubHistory.cupHistory.map(entry => {
      if (entry.cupName && entry.cupName.startsWith("The ")) return { ...entry, cupName: entry.cupName.slice(4) };
      return entry;
    });
  }
  return clubHistory;
}

/**
 * Construct a fallback clubHistory for saves that predate clubHistory
 * tracking, estimating career totals from whatever aggregate fields the
 * save does have. Pure — doesn't touch the save's existing clubHistory;
 * callers decide whether to use this or the save's own history.
 */
export function backfillClubHistory(s) {
  const h = {
    totalWins: 0, totalDraws: 0, totalLosses: 0,
    totalGoalsFor: 0, totalGoalsConceded: 0,
    bestWinStreak: s.consecutiveWins || s.consecutiveUnbeaten || 0,
    bestUnbeatenRun: s.consecutiveUnbeaten || 0,
    worstLossStreak: s.consecutiveLosses || 0,
    biggestWin: null, worstDefeat: null,
    bestSeasonFinish: null, bestSeasonPoints: 0,
    playerCareers: {},
    allTimeXI: {},
    seasonArchive: [],
  };
  if (s.league?.table) {
    const playerRow = s.league.table.find((r) => s.league.teams[r.teamIndex]?.isPlayer);
    if (playerRow) {
      h.totalWins = playerRow.won || 0;
      h.totalDraws = playerRow.drawn || 0;
      h.totalLosses = playerRow.lost || 0;
      h.totalGoalsFor = playerRow.goalsFor || 0;
      h.totalGoalsConceded = playerRow.goalsAgainst || 0;
    }
  }
  const currentPlayed = (h.totalWins + h.totalDraws + h.totalLosses);
  const priorMatches = (s.totalMatches || 0) - currentPlayed;
  if (priorMatches > 0) {
    h.totalWins += Math.round(priorMatches * 0.5);
    h.totalDraws += Math.round(priorMatches * 0.25);
    h.totalLosses += priorMatches - Math.round(priorMatches * 0.5) - Math.round(priorMatches * 0.25);
    const avgGF = s.seasonGoalsFor ? s.seasonGoalsFor / Math.max(1, currentPlayed) : 1.5;
    h.totalGoalsFor += Math.round(priorMatches * avgGF);
    h.totalGoalsConceded += Math.round(priorMatches * 1.2);
  }
  if (s.playerSeasonStats) {
    Object.entries(s.playerSeasonStats).forEach(([name, stats]) => {
      h.playerCareers[name] = {
        goals: (stats.goals || 0) * (s.seasonNumber || 1),
        apps: (stats.apps || 0) * (s.seasonNumber || 1),
        motm: (stats.motm || 0) * (s.seasonNumber || 1),
        yellows: stats.yellows || 0,
        reds: stats.reds || 0,
        seasons: [],
      };
    });
  }
  for (let i = 1; i < (s.seasonNumber || 1); i++) {
    h.seasonArchive.push({
      season: i,
      tier: i === 1 ? NUM_TIERS : (s.leagueTier || NUM_TIERS),
      leagueName: "Unknown (pre-tracking)",
      position: "?",
      points: "?",
      topScorer: "N/A",
      result: i < (s.seasonNumber || 1) - 1 ? "stayed" : (s.lastSeasonMove || "stayed"),
    });
  }
  return h;
}

/**
 * Migrate a name-keyed playerRatingTracker (pre-id-tracking saves) to be
 * keyed by player id instead. No-ops (returns the tracker unchanged) if
 * it's empty or already id-keyed.
 */
export function migratePlayerRatingTracker(rawTracker, squad) {
  let tracker = rawTracker || {};
  if (Object.keys(tracker).length === 0) return tracker;
  const squadIds = new Set((squad || []).map(p => p.id).filter(Boolean));
  const alreadyIdKeyed = Object.keys(tracker).some(k => squadIds.has(k));
  if (alreadyIdKeyed) return tracker;
  const migrated = {};
  (squad || []).forEach(p => { if (p.name && p.id && tracker[p.name]) migrated[p.id] = tracker[p.name]; });
  return migrated;
}

/** Strip a leading "The " from a cup's name (legacy naming convention). */
export function stripCupNamePrefix(cup) {
  if (cup && cup.cupName && cup.cupName.startsWith("The ")) {
    cup.cupName = cup.cupName.slice(4);
  }
  return cup;
}

/** Migrate the retired summerPhase value "summary" to "break". */
export function migrateSummerPhase(rawSummerPhase, summerData) {
  const phase = rawSummerPhase === "summary" ? "break" : rawSummerPhase;
  const data = rawSummerPhase === "summary"
    ? { ...(summerData || {}), weeksLeft: summerData?.weeksLeft ?? 5 }
    : (summerData || null);
  return { phase, data };
}

/**
 * The summer break grew from 5 to 6 beats when Awards Night was inserted at
 * weeksLeft 3 (save version 2 → 3): old beats 5/4/3 shifted up to 6/5/4,
 * while 2 (youth intake) and 1 (preview) kept their numbers. A v2 save made
 * mid-summer must shift weeksLeft >= 3 up by one, or its next click would
 * fire the wrong beat — worst case skipping the transfer-window-open beat
 * entirely for that summer.
 */
export function migrateSummerWeeksForAwards(saveVersion, summerPhase, summerData) {
  if (saveVersion >= 3 || summerPhase !== "break" || !summerData) return summerData;
  const wl = summerData.weeksLeft;
  if (typeof wl !== "number" || wl < 3) return summerData;
  return { ...summerData, weeksLeft: wl + 1 };
}

/**
 * Decide the season calendar to load: use the save's own calendar if
 * present, otherwise rebuild one from the league's fixture count. Returns
 * null when neither is available (caller should leave the store's existing
 * calendar state untouched, matching the original no-op).
 */
export function resolveSeasonCalendar(s, migratedTier) {
  if (s.seasonCalendar) {
    return { seasonCalendar: s.seasonCalendar, calendarIndex: s.calendarIndex || 0 };
  }
  if (s.league?.fixtures) {
    const cal = buildSeasonCalendar(
      s.league.fixtures.length, s.cup,
      !!getModifier(migratedTier).knockoutAtEnd,
      !!getModifier(migratedTier).miniTournament
    );
    return { seasonCalendar: cal, calendarIndex: computeCalendarIndex(cal, s.matchweekIndex || 0, s.cup) };
  }
  return null;
}

/** Migrate season league stats to the per-tier shape (older saves kept a single blob). */
export function migrateSeasonLeagueStatsByTier(s) {
  if (s.seasonLeagueStatsByTier && typeof s.seasonLeagueStatsByTier === "object") {
    return s.seasonLeagueStatsByTier;
  }
  if (s.seasonLeagueStats && s.seasonLeagueStats.players) {
    const tierKey = s.leagueTier || NUM_TIERS;
    return { [tierKey]: s.seasonLeagueStats };
  }
  return {};
}

/** Whether season league stats should be shown, or flagged unavailable for legacy saves. */
export function resolveSeasonLeagueStatsAvailable(s, seasonByTier) {
  const matchweekProgressed = (s.matchweekIndex || 0) > 0;
  const hasAnyTierData = Object.keys(seasonByTier).length > 0;
  const explicitFlag = typeof s.seasonLeagueStatsAvailable === "boolean" ? s.seasonLeagueStatsAvailable : null;
  return explicitFlag != null ? explicitFlag : (hasAnyTierData || !matchweekProgressed);
}

/** Whether season cup stats should be shown, or flagged unavailable for legacy saves. */
export function resolveCupStatsAvailable(s, seasonCupByCup) {
  const cupProgressed = !!(s.cup && (s.cup.currentRound > 0
    || s.cup.rounds?.some(r => r.matches?.some(m => m.result && !m.result.bye))));
  const hasAnyCupData = Object.keys(seasonCupByCup).length > 0;
  const explicitCupFlag = typeof s.seasonCupStatsAvailable === "boolean" ? s.seasonCupStatsAvailable : null;
  return explicitCupFlag != null ? explicitCupFlag : (hasAnyCupData || !cupProgressed);
}

/**
 * Reconstruct completed-arc bookkeeping (v3) from inbox "Arc Complete:"
 * messages and any already-completed tracking, for saves taken before
 * `_arcRewardV3` existed. Mutates and returns the same storyArcs object.
 */
export function migrateStoryArcsCompletion(storyArcs, inboxMessages) {
  const loadedArcs = storyArcs;
  if (loadedArcs._arcRewardV3) return loadedArcs;
  const inboxCompleted = (inboxMessages || [])
    .filter(m => m.title?.startsWith("Arc Complete:"))
    .map(m => {
      const name = m.title.replace("Arc Complete: ", "");
      return STORY_ARCS.find(a => a.name === name)?.id;
    })
    .filter(Boolean);
  ["player", "club", "legacy"].forEach(cat => {
    const cs = loadedArcs[cat];
    if (cs?.completed && cs?.arcId) inboxCompleted.push(cs.arcId);
  });
  if (inboxCompleted.length > 0) {
    loadedArcs.completed = [...new Set([...(loadedArcs.completed || []), ...inboxCompleted])];
    loadedArcs.rewardsApplied = [];
  }
  loadedArcs._arcRewardV3 = true;
  return loadedArcs;
}

/** Build a single-entry OVR history snapshot for saves with none recorded yet. */
export function backfillOvrHistorySnapshot(squad, calendarIndex, seasonNumber) {
  const snap = {};
  (squad || []).forEach(p => { snap[`${p.name}|${p.position}`] = getOverall(p); });
  return [{ w: (calendarIndex || 0) + 1, s: seasonNumber || 1, p: snap }];
}

// He Doesn't Even Go Here absorbed the former Identity Crisis card (same id
// throughout, "out_of_pos") — a save that already had identity_crisis
// unlocked earned that same holistic check under its old name, so it should
// come out the other side with out_of_pos unlocked and the stale id gone.
// Returns the same Set reference when there's nothing to migrate.
export function mergeIdentityCrisisIntoOutOfPos(unlockedAchievements) {
  const prev = unlockedAchievements;
  if (!prev || !(prev instanceof Set) || !prev.has("identity_crisis")) return prev;
  const next = new Set(prev);
  next.delete("identity_crisis");
  next.add("out_of_pos");
  return next;
}
