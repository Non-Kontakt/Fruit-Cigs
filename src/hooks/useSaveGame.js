import { useCallback, useRef } from "react";
import { useGameStore, hydrateState } from "../store/gameStore.js";
import { getSaveKey, archiveCareerToMuseum, readProfile, findNewerSaveOfCareer } from "../utils/profile.js";
import { createSavePayload, validateSavePayload } from "../persistence/savePayload.js";
import { storage } from "../persistence/storage.js";
import { ATTRIBUTES } from "../data/training.js";
import { POSITION_TYPES, TOTAL_SLOTS } from "../data/positions.js";
import { LEAGUE_DEFS, NUM_TIERS, AI_BENCH_POSITIONS } from "../data/leagues.js";
import { STORY_ARCS } from "../data/storyArcs.js";
import { STARTER_PACKS } from "../data/cigPacks.js";
import { TIER_WIN_ACHS } from "../data/achievements.js";
import { DEFAULT_FORMATION } from "../data/formations.js";
import { getModifier } from "../data/leagueModifiers.js";
import { rand, getOverall } from "../utils/calc.js";
import { getOvrCap, pickAINationality, generateNameForNation, inferNationality, generateSquadPhilosophy, renameDuplicateNames } from "../utils/player.js";
import { initStoryArcs } from "../utils/arcs.js";
import { simulateMatchweek } from "../utils/match.js";
import { getLeagueMatchdaysPlayed, normalizeRosters, initLeague, initAILeague, buildSeasonCalendar, computeCalendarIndex, initCup } from "../utils/league.js";
import { seedMessageSeq, getMessageSeq } from "../utils/messageUtils.js";
import { checkAchievements, deriveMissingPlayerUnlocks, checkMuseumAchievements } from "../utils/achievements.js";
import { emptyCompetitionStats } from "../utils/competitionStats.js";
import { migrateClubFocuses } from "../utils/clubFocuses.js";
import { randomAvatar } from "../components/ui/ManagerAvatar.jsx";
import {
  migrateSquadBackfill, migrateAITeamSquads, backfillAISquadDefaults, backfillRosterPhilosophy,
  migrateLegacyLeagueTier3to11, migrateLegacyRosterKeys, ensureAllTierRosters, repairLeagueV2ToV3,
  resolveMigratedTier, syncLeagueTierAndNames, migrateSeasonHistoryNames, migrateClubHistoryNames,
  backfillClubHistory, migratePlayerRatingTracker, stripCupNamePrefix, migrateSummerPhase, migrateSummerWeeksForAwards,
  resolveSeasonCalendar, migrateSeasonLeagueStatsByTier, resolveSeasonLeagueStatsAvailable,
  resolveCupStatsAvailable, migrateStoryArcsCompletion, backfillOvrHistorySnapshot,
  mergeIdentityCrisisIntoOutOfPos, migrateIdentityCrisisUnlockWeek,
} from "../utils/saveMigrations.js";

/**
 * Extracts save/load/export/import/delete/sacking callbacks.
 *
 * All game state is read fresh from useGameStore.getState() on each call.
 * Only React useState setters and component-local callbacks are passed as params.
 */
export function useSaveGame({
  // useState values (not in Zustand)
  activeSaveSlot,
  // useState setters (not in Zustand)
  setSaveStatus,
  setArchiveStatus,
  setActiveSaveSlot,
  setSaveSlotSummaries,
  setImportStatus,
  setPendingPlayerUnlock,
  // Component-local callbacks
  loadSettings,
  generateNewspaperName,
  generateReporterName,
  onTimeTravelLoad,
  // Refs
  achievementUnlockWeeksRef,
}) {
  const sackingInFlight = useRef(null);
  const legacySave = useRef(null);

  // Save game state to storage
  const saveGame = useCallback(async () => {
    const s = useGameStore.getState();
    const { teamName, league, activeProfileId } = s;
    if (!teamName || !league || !activeSaveSlot || !activeProfileId || s.gameOver) return false;
    setSaveStatus("saving");
    try {
      // A career gets its stable identity the first time it touches disk.
      let careerId = s.careerId;
      if (!careerId) {
        careerId = `career-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        s.setCareerId(careerId);
      }
      const saveData = createSavePayload({ ...s, careerId }, getMessageSeq());
      const saveKey = getSaveKey(activeProfileId, activeSaveSlot);
      await storage.setSave(saveKey, JSON.stringify(saveData), "save");
      // Update slot summary for quick display
      setSaveSlotSummaries(prev => {
        const next = [...prev];
        next[activeSaveSlot - 1] = { teamName, seasonNumber: s.seasonNumber, leagueTier: s.leagueTier, week: s.calendarIndex + 1, gameMode: s.gameMode };
        return next;
      });
      setSaveStatus("saved");
      return true;
    } catch (e) {
      console.error("Save failed:", e);
      setSaveStatus("error");
      return false;
    }
  }, [activeSaveSlot]);

  const prepareLoad = useCallback(async (value, profileId) => {
    const raw = JSON.parse(value);
    validateSavePayload(raw);
    const s = hydrateState(raw);
    const loaded = { ...useGameStore.getInitialState(), activeProfileId: profileId };
    let pendingUnlocks = null;

    loaded.careerId = s.careerId || null;
    loaded.teamName = s.teamName;
    loaded.newspaperName = s.newspaperName || generateNewspaperName(s.teamName);
    loaded.reporterName = s.reporterName || generateReporterName();
    // Manager identity (legacy saves: leave name null, give avatar a random fallback)
    loaded.managerName = s.managerName || null;
    loaded.managerAvatar = s.managerAvatar || randomAvatar();
    // Migrate: add nationality, statProgress, and potential to existing
    // players if missing, then repair duplicate names saved before
    // generation guaranteed per-squad uniqueness.
    const migratedSquad = migrateSquadBackfill(s.squad, s.prestigeLevel);
    loaded.squad = migratedSquad;
    // Migrate: patch AI team squad members with names/nationalities + add bench if missing
    if (s.league?.teams) migrateAITeamSquads(s.league.teams, s.leagueTier || s.league?.tier);
    // Migrate old 3-tier league object to 11-tier system
    migrateLegacyLeagueTier3to11(s);
    // Also migrate leagueRosters keys, then ensure all tiers exist
    s.leagueRosters = migrateLegacyRosterKeys(s.leagueRosters, s.leagueVersion);
    s.leagueRosters = ensureAllTierRosters(s.leagueRosters);
    // === V2 → V3 MIGRATION ===
    repairLeagueV2ToV3(s, migratedSquad);
    // === END V3 MIGRATION ===

    // Backfill age and id on AI players from saves that predate the aging system
    if (s.league?.teams) s.league.teams.forEach(t => { if (!t.isPlayer) backfillAISquadDefaults(t.squad); });
    if (s.allLeagueStates) {
      Object.values(s.allLeagueStates).forEach(als => {
        (als.teams || []).forEach(t => backfillAISquadDefaults(t.squad));
      });
    }
    // Backfill squadPhilosophy + trajectory on roster configs
    s.leagueRosters = backfillRosterPhilosophy(s.leagueRosters);

    // Migrate old 3-tier saves to 11-tier system
    const migratedTier = resolveMigratedTier(s.leagueTier, s.leagueVersion);
    syncLeagueTierAndNames(s.league, migratedTier);
    // Migrate season history league names
    s.seasonHistory = migrateSeasonHistoryNames(s.seasonHistory);

    loaded.league = s.league;
    loaded.startingXI = s.startingXI;
    loaded.bench = s.bench;
    // Migration: He Doesn't Even Go Here absorbed Identity Crisis — remap
    // the stale id before anything downstream (catch-up, history
    // reconstruction) reads unlockedAchievements.
    s.unlockedAchievements = mergeIdentityCrisisIntoOutOfPos(s.unlockedAchievements || new Set());
    loaded.unlockedAchievements = s.unlockedAchievements;
    loaded.unlockedPacks = s.unlockedPacks instanceof Set && s.unlockedPacks.size > 0 ? s.unlockedPacks : new Set(STARTER_PACKS);
    if (s.achievementUnlockWeeks) {
      // Companion migration: keep the merged card's original unlock timing.
      s.achievementUnlockWeeks = migrateIdentityCrisisUnlockWeek(s.achievementUnlockWeeks);
      loaded.achievementUnlockWeeks = s.achievementUnlockWeeks;
    }
    loaded.lastSeenAchievementCount = s.lastSeenAchievementCount ?? (s.unlockedAchievements?.size ?? 0);
    // Saves predating this field never ran the drip — default suppressed,
    // so only a genuinely new career (which sets this false explicitly)
    // ever sees it.
    loaded.onboardingDripSuppressed = s.onboardingDripSuppressed ?? true;
    loaded.onboardingSilencedByChoice = s.onboardingSilencedByChoice || false;
    loaded.seasonCards = s.seasonCards || 0;
    loaded.seasonNumber = s.seasonNumber || 1;
    loaded.leagueWins = s.leagueWins || 0;
    loaded.leagueTier = migratedTier;
    loaded.lastSeasonMove = s.lastSeasonMove || null;
    loaded.totalGains = s.totalGains || 0;
    loaded.totalMatches = s.totalMatches || 0;
    loaded.seasonCleanSheets = s.seasonCleanSheets || 0;
    loaded.seasonGoalsFor = s.seasonGoalsFor || 0;
    loaded.seasonDraws = s.seasonDraws || 0;
    loaded.seasonHomeUnbeaten = s.seasonHomeUnbeaten !== false;
    loaded.seasonAwayWins = s.seasonAwayWins || 0;
    loaded.seasonAwayGames = s.seasonAwayGames || 0;
    loaded.consecutiveUnbeaten = s.consecutiveUnbeaten || 0;
    loaded.consecutiveLosses = s.consecutiveLosses || 0;
    loaded.consecutiveDraws = s.consecutiveDraws || 0;
    loaded.consecutiveWins = s.consecutiveWins || 0;
    loaded.consecutiveScoreless = s.consecutiveScoreless || 0;
    loaded.consecutiveCleanSheets = s.consecutiveCleanSheets || 0;
    loaded.latestHeadline = s.latestHeadline || null;
    loaded.fanSentiment = s.fanSentiment ?? 50;
    // Restore the recorded floor independently of the current sentiment.
    loaded.fanSentimentSeasonFloor = s.fanSentimentSeasonFloor ?? 100;
    loaded.boardSentiment = s.boardSentiment ?? 50;
    loaded.sentimentLog = s.sentimentLog || [];
    loaded.compareSignWatch = s.compareSignWatch || null;
    loaded.ultimatumsSurvived = s.ultimatumsSurvived || 0;
    loaded.legendCarryCounts = s.legendCarryCounts || {};
    loaded.dynastyCupQualifiers = s.dynastyCupQualifiers || null;
    loaded.dynastyCupBracket = s.dynastyCupBracket || null;
    loaded.miniTournamentBracket = s.miniTournamentBracket || null;
    loaded.fiveASideSquad = s.fiveASideSquad || null;
    loaded.gameMode = s.gameMode || "casual";
    loaded.boardWarnCount = s.boardWarnCount || 0;
    loaded.weeksSinceIdentityHeadline = s.weeksSinceIdentityHeadline || 0;
    loaded.ultimatumActive = s.ultimatumActive || false;
    loaded.ultimatumTarget = s.ultimatumTarget || 0;
    loaded.ultimatumPtsEarned = s.ultimatumPtsEarned || 0;
    loaded.ultimatumGamesLeft = s.ultimatumGamesLeft || 0;
    loaded.ultimatumCupPending = s.ultimatumCupPending || false;
    loaded.trainedThisWeek = s.trainedThisWeek || new Set();
    loaded.manualTrainingThisWeek = s.manualTrainingThisWeek || new Set();
    // Migrate clubHistory league names
    s.clubHistory = migrateClubHistoryNames(s.clubHistory);
    loaded.clubHistory = s.clubHistory || backfillClubHistory(s);
    loaded.prevStartingXI = s.prevStartingXI || null;
    loaded.motmTracker = s.motmTracker || {};
    loaded.stScoredConsecutive = s.stScoredConsecutive || 0;
    // Migrate name-keyed playerRatingTracker to ID-keyed
    const _loadedTracker = migratePlayerRatingTracker(s.playerRatingTracker, s.squad);
    loaded.playerRatingTracker = _loadedTracker;
    loaded.playerRatingNames = s.playerRatingNames || {};
    loaded.playerMatchLog = s.playerMatchLog || {};
    loaded.breakoutsThisSeason = s.breakoutsThisSeason || new Map();
    loaded.playerSeasonStats = s.playerSeasonStats || {};
    loaded.beatenTeams = s.beatenTeams || new Set();
    loaded.retiringPlayers = s.retiringPlayers || new Set();
    // Migrate cup name: strip "The " prefix
    s.cup = stripCupNamePrefix(s.cup);
    loaded.cup = s.cup || initCup(s.teamName, migratedTier, s.leagueRosters);
    // Migration: convert summerPhase="summary" to "break"
    const { phase: loadedSummerPhase, data: loadedSummerData } = migrateSummerPhase(s.summerPhase || null, s.summerData);
    loaded.summerPhase = loadedSummerPhase;
    // Migration: v2 mid-summer saves predate the Awards Night beat — shift
    // their remaining-weeks counter so the next click fires the right beat.
    loaded.summerData = migrateSummerWeeksForAwards(s.version ?? 2, loadedSummerPhase, loadedSummerData);
    const migratedRosters = s.leagueRosters ? normalizeRosters({ ...s.leagueRosters }, s.teamName) : null;
    loaded.leagueRosters = migratedRosters;
    loaded.halfwayPosition = s.halfwayPosition ?? null;
    loaded.previousLeaguePosition = s.previousLeaguePosition ?? null;
    loaded.recentScorelines = s.recentScorelines || [];
    loaded.secondPlaceFinishes = s.secondPlaceFinishes || 0;
    loaded.playerInjuryCount = s.playerInjuryCount || {};
    loaded.seasonInjuryLog = s.seasonInjuryLog || {};
    loaded.careerMilestones = s.careerMilestones || {};
    loaded.benchStreaks = s.benchStreaks || {};
    loaded.highScoringMatches = s.highScoringMatches || 0;
    // Calendar migration: rebuild if not present
    const calendarResolution = resolveSeasonCalendar(s, migratedTier);
    if (calendarResolution) {
      loaded.seasonCalendar = calendarResolution.seasonCalendar;
      loaded.calendarIndex = calendarResolution.calendarIndex;
    }
    loaded.calendarResults = s.calendarResults || {};
    loaded.leagueResults = s.leagueResults || {};
    loaded.leagueHistory = s.leagueHistory || {};
    const loadedMessages = (s.inboxMessages || []).map((m, i) => m.seq != null ? m : { ...m, seq: i });
    loaded.inboxMessages = loadedMessages;
    const maxSeq = loadedMessages.reduce((mx, m) => Math.max(mx, m.seq ?? -1), -1);
    const nextMessageSeq = s._messageSeq != null ? Math.max(s._messageSeq, maxSeq + 1) : maxSeq + 1;
    loaded.trialPlayer = s.trialPlayer || null;
    loaded.trialHistory = s.trialHistory || [];
    loaded.prodigalSon = s.prodigalSon || null;
    if (s.prodigalSon?.phase === "redeemed" && s.prodigalSon?.pendingBoost === undefined) {
      loaded.prodigalSon = { ...s.prodigalSon, pendingBoost: true };
    }
    loaded.lopsidedWarned = s.lopsidedWarned || new Set();
    loaded.ovrHistory = s.ovrHistory || [];
    // Migration v3: reconstruct completed arcs
    const loadedArcs = migrateStoryArcsCompletion(s.storyArcs || initStoryArcs(), s.inboxMessages);
    loaded.storyArcs = loadedArcs;
    // Club Focus tree — additive, no save-version bump. Saves predating this
    // field default to an empty tree (migration-by-default).
    loaded.clubFocuses = migrateClubFocuses(s.clubFocuses);
    // All-time league stats are tier-scoped. If the save already has
    // `allTimeLeagueStatsByTier`, use it. Otherwise start empty:
    // pre-tier-scoped saves don't record which tier the goals were
    // scored in, so attributing them to the loaded `leagueTier` would
    // invent false precision. Old saves' tier record books begin empty
    // and become accurate from this point onward. (A future career/club
    // record store can preserve old totals separately if we want them.)
    if (s.allTimeLeagueStatsByTier && typeof s.allTimeLeagueStatsByTier === "object") {
      loaded.allTimeLeagueStatsByTier = s.allTimeLeagueStatsByTier;
    } else {
      loaded.allTimeLeagueStatsByTier = {};
    }
    // Season league stats are now per-tier. New saves persist the
    // tier-keyed object; older canonical saves persisted a single blob
    // keyed at the player tier — migrate that under s.leagueTier.
    const seasonByTier = migrateSeasonLeagueStatsByTier(s);
    loaded.seasonLeagueStatsByTier = seasonByTier;
    // Legacy detection: a save without canonical stats whose season has
    // already started cannot be reconstructed reliably. Mark unavailable
    // so the Stats tab shows a notice instead of misleading partials.
    loaded.seasonLeagueStatsAvailable = resolveSeasonLeagueStatsAvailable(s, seasonByTier);
    // Cup stats are now per-cup. New saves persist seasonCupStatsByCup
    // and allTimeCupStatsByCup directly. Older canonical saves persisted
    // a single seasonCupStats blob — we don't fake-attribute that to a
    // cup key (same reasoning as the league legacy migration), so old
    // saves start with empty cup stores and the legacy availability flag
    // marks them unavailable for this season.
    const seasonCupByCup = (s.seasonCupStatsByCup && typeof s.seasonCupStatsByCup === "object")
      ? s.seasonCupStatsByCup : {};
    const allTimeCupByCup = (s.allTimeCupStatsByCup && typeof s.allTimeCupStatsByCup === "object")
      ? s.allTimeCupStatsByCup : {};
    loaded.seasonCupStatsByCup = seasonCupByCup;
    loaded.allTimeCupStatsByCup = allTimeCupByCup;
    loaded.seasonCupStatsAvailable = resolveCupStatsAvailable(s, seasonCupByCup);
    // Load formation
    if (s.formation && s.formation.length === 11) {
      loaded.formation = s.formation.map(slot => ({...slot}));
    } else {
      loaded.formation = DEFAULT_FORMATION.map(slot => ({...slot}));
    }
    // Load slot assignments
    if (s.slotAssignments && Array.isArray(s.slotAssignments) && s.slotAssignments.length >= 11) {
      const loaded = [...s.slotAssignments];
      while (loaded.length < TOTAL_SLOTS) loaded.push(null);
      loaded.slotAssignments = loaded;
    } else {
      loaded.slotAssignments = null;
    }
    loaded.manualSlotIndices = s.manualSlotIndices || new Set();
    loaded.xiPresets = s.xiPresets || { primary: null, secondary: null };
    // Load AI league states
    if (s.allLeagueStates && Object.keys(s.allLeagueStates).length > 0) {
      for (const [tier, leagueState] of Object.entries(s.allLeagueStates)) {
        if (leagueState?.teams) {
          leagueState.teams.forEach(team => {
            if (team.squad) {
              team.squad.forEach(p => {
                if (!p.nationality) p.nationality = pickAINationality(Number(tier));
              });
              team.squad = renameDuplicateNames(team.squad);
            }
          });
        }
      }
      loaded.allLeagueStates = s.allLeagueStates;
    } else if (migratedRosters) {
      const freshAILeagues = {};
      for (let t = 1; t <= NUM_TIERS; t++) {
        if (t === migratedTier) continue;
        const ai = initAILeague(t, migratedRosters, null, s.prestigeLevel || 0);
        if (ai) {
          const simToMW = Math.min(s.matchweekIndex || 0, ai.fixtures.length);
          for (let mw = 0; mw < simToMW; mw++) {
            simulateMatchweek(ai, mw, null, null, null, null, null);
            ai.matchweekIndex = mw + 1;
          }
          freshAILeagues[t] = ai;
        }
      }
      loaded.allLeagueStates = freshAILeagues;
    }
    loaded.clubRelationships = s.clubRelationships || {};
    loaded.transferFocus = Array.isArray(s.transferFocus) ? s.transferFocus : (s.transferFocus ? [s.transferFocus] : []);
    loaded.transferWindowOpen = s.transferWindowOpen || false;
    loaded.transferWindowWeeksRemaining = s.transferWindowWeeksRemaining || 0;
    loaded.transferOffers = s.transferOffers || [];
    loaded.loanedOutPlayers = s.loanedOutPlayers || [];
    loaded.loanedInPlayers = s.loanedInPlayers || [];
    loaded.transferHistory = s.transferHistory || [];
    loaded.shortlist = s.shortlist || [];
    loaded.tickets = s.tickets || [];
    loaded.pendingTicketBoosts = s.pendingTicketBoosts || [];
    loaded.doubleTrainingWeek = s.doubleTrainingWeek || false;
    loaded.twelfthManActive = s.twelfthManActive || false;
    loaded.youthCoupActive = s.youthCoupActive || false;
    loaded.pendingFreeAgent = s.pendingFreeAgent || null;
    loaded.scoutedPlayers = s.scoutedPlayers || {};
    loaded.wonderkidTips = s.wonderkidTips || new Set();
    loaded.scoutRevealMeta = s.scoutRevealMeta || {};
    loaded.dossierBurns = s.dossierBurns || {};
    loaded.passiveRevealSignings = s.passiveRevealSignings || 0;
    loaded.offersRejectedThisWindow = s.offersRejectedThisWindow || 0;
    loaded.loyaltyWatch = s.loyaltyWatch || null;
    loaded.testimonialPlayer = s.testimonialPlayer || null;
    loaded.usedTicketTypes = s.usedTicketTypes || new Set();
    loaded.formationsWonWith = s.formationsWonWith || new Set();
    loaded.freeAgentSignings = s.freeAgentSignings || 0;
    loaded.holidayMatchesThisSeason = s.holidayMatchesThisSeason || 0;
    loaded.wonLeagueOnHoliday = s.wonLeagueOnHoliday || false;
    loaded.fastMatchesThisSeason = s.fastMatchesThisSeason || 0;
    loaded.gkCleanSheets = s.gkCleanSheets || {};
    loaded.totalShortlisted = s.totalShortlisted || 0;
    loaded.prevSeasonSquadIds = s.prevSeasonSquadIds || null;
    loaded.tradesMadeInWindow = s.tradesMadeInWindow || 0;
    loaded.tradedWithClubs = s.tradedWithClubs || new Set();
    loaded.awardsHistory = s.awardsHistory || [];
    loaded.backPagesReceived = s.backPagesReceived || new Set();
    loaded.hatTrickHeadlinePlayers = s.hatTrickHeadlinePlayers || [];
    loaded.favouriteStarts = s.favouriteStarts || {};
    loaded.prestigeLevel = s.prestigeLevel || 0;
    // (No clubHistory → tier-scoped seed. clubHistory.playerCareers spans
    // tiers/clubs/cups by design; attributing those totals to one tier
    // would corrupt that tier's record book. If we want to surface those
    // career totals, that belongs in a separate career/club record store.)
    // Migration: backfill initial OVR snapshot
    if (!s.ovrHistory || s.ovrHistory.length === 0) {
      loaded.ovrHistory = backfillOvrHistorySnapshot(s.squad, s.calendarIndex, s.seasonNumber);
    }
    // Migration: retroactive achievement catch-up
    // Re-run checkAchievements against loaded state so that achievements
    // the player already satisfied (but weren't recorded under the old
    // pack-gated system) get banked silently.
    if (migratedSquad.length > 0) {
      const loadedUnlocked = s.unlockedAchievements || new Set();
      const catchUp = checkAchievements({
        squad: migratedSquad, unlocked: loadedUnlocked,
        lastMatchResult: null, league: s.league, weekGains: null,
        startingXI: s.startingXI, bench: s.bench,
        matchweekIndex: s.matchweekIndex || 0,
        seasonCards: s.seasonCards || 0,
        totalGains: s.totalGains || 0, totalMatches: s.totalMatches || 0,
        seasonCleanSheets: s.seasonCleanSheets || 0,
        seasonGoalsFor: s.seasonGoalsFor || 0,
        seasonDraws: s.seasonDraws || 0,
        consecutiveUnbeaten: s.consecutiveUnbeaten || 0,
        consecutiveLosses: s.consecutiveLosses || 0,
        consecutiveWins: s.consecutiveWins || 0,
        consecutiveScoreless: s.consecutiveScoreless || 0,
        prevStartingXI: s.prevStartingXI || null,
        motmTracker: s.motmTracker || {},
        stScoredConsecutive: s.stScoredConsecutive || 0,
        playerRatingTracker: _loadedTracker,
        beatenTeams: s.beatenTeams || new Set(),
        halfwayPosition: s.halfwayPosition ?? null,
        seasonHomeUnbeaten: s.seasonHomeUnbeaten !== false,
        seasonAwayWins: s.seasonAwayWins || 0,
        seasonAwayGames: s.seasonAwayGames || 0,
        leagueWins: s.leagueWins || 0,
        wasAlwaysFast: false, wasAlwaysNormal: false,
        recoveries: [], recentScorelines: s.recentScorelines || [],
        secondPlaceFinishes: s.secondPlaceFinishes || 0,
        playerInjuryCount: s.playerInjuryCount || {},
        benchStreaks: s.benchStreaks || {},
        highScoringMatches: s.highScoringMatches || 0,
        trialHistory: s.trialHistory || [],
        playerSeasonStats: s.playerSeasonStats || {},
        clubHistory: s.clubHistory || null,
        formation: s.formation || null,
        slotAssignments: s.slotAssignments || null,
        manualSlotIndices: s.manualSlotIndices || new Set(),
        usedTicketTypes: s.usedTicketTypes || new Set(),
        formationsWonWith: s.formationsWonWith || new Set(),
        freeAgentSignings: s.freeAgentSignings || 0,
        scoutedPlayers: s.scoutedPlayers || {},
        transferFocus: s.transferFocus || [],
        clubRelationships: s.clubRelationships || {},
        isOnHoliday: false,
        wonLeagueOnHoliday: s.wonLeagueOnHoliday || false,
        holidayMatchesThisSeason: s.holidayMatchesThisSeason || 0,
        doubleTrainingWeek: false, testimonialPlayer: null,
        seasonNumber: s.seasonNumber || 1,
        lastSeasonPosition: s.lastSeasonPosition ?? null,
        shortlist: s.shortlist || [],
        fastMatchesThisSeason: s.fastMatchesThisSeason || 0,
        twelfthManActive: false,
        gkCleanSheets: s.gkCleanSheets || {},
        totalShortlisted: s.totalShortlisted || 0,
        gameMode: s.gameMode || "casual",
        favouriteStarts: s.favouriteStarts || {},
      });
      if (catchUp.length > 0) {
        const merged = new Set(loadedUnlocked);
        catchUp.forEach(id => merged.add(id));
        s.unlockedAchievements = merged;
        loaded.unlockedAchievements = merged;
      }
    }

    // Migration: retroactive history-based achievement reconstruction
    // Reconstruct season-end and career achievements from clubHistory
    // that checkAchievements() can't detect (promotion, relegation, tier
    // wins, cup wins, career milestones, etc.)
    {
      const u = s.unlockedAchievements || new Set();
      const historyAchs = [];
      const archive = s.clubHistory?.seasonArchive || [];
      const cupHist = s.clubHistory?.cupHistory || [];

      // Season milestones
      if ((s.seasonNumber || 1) >= 5 && !u.has("season_5")) historyAchs.push("season_5");
      if ((s.seasonNumber || 1) >= 10 && !u.has("season_10")) historyAchs.push("season_10");

      // Tier wins from archive
      const titlesWon = new Set();
      archive.forEach(entry => {
        if (entry.position === 1 && entry.tier) {
          titlesWon.add(entry.tier);
          const tierAch = TIER_WIN_ACHS[entry.tier];
          if (tierAch && !u.has(tierAch)) historyAchs.push(tierAch);
        }
        if (entry.result === "promoted" && !u.has("promoted")) historyAchs.push("promoted");
        if (entry.result === "relegated" && !u.has("relegated")) historyAchs.push("relegated");
      });
      if (!u.has("champion") && titlesWon.size > 0) historyAchs.push("champion");
      if (!u.has("tinpot_treble") && titlesWon.size >= 3) historyAchs.push("tinpot_treble");
      if (!u.has("dynasty") && (s.leagueWins || 0) >= 3) historyAchs.push("dynasty");

      // Promised Land — reached tier 5 or above
      const lowestTier = Math.min(s.leagueTier || 11, ...archive.map(e => e.tier || 11));
      if (lowestTier <= 5 && !u.has("promised_land")) historyAchs.push("promised_land");

      // from_the_bottom — won a league at Federation (tier 5) or above
      if (!u.has("from_the_bottom")) {
        const wonAtHighTier = archive.some(e => e.position === 1 && e.tier && e.tier <= 5);
        if (wonAtHighTier) historyAchs.push("from_the_bottom");
      }

      // the_double — won league and cup in the same season
      if (!u.has("the_double")) {
        const leagueWinSeasons = new Set(archive.filter(e => e.position === 1).map(e => e.season));
        const cupWinSeasons = new Set(cupHist.filter(c => c.winnerIsPlayer).map(c => c.season));
        for (const s2 of leagueWinSeasons) {
          if (cupWinSeasons.has(s2)) { historyAchs.push("the_double"); break; }
        }
      }

      // Cup wins from cupHistory
      const cupWins = cupHist.filter(c => c.winnerIsPlayer);
      if (cupWins.length > 0 && !u.has("cup_winner")) historyAchs.push("cup_winner");
      const distinctCups = new Set(cupWins.map(c => c.cupName));
      if (distinctCups.size >= 2 && !u.has("cup_collector")) historyAchs.push("cup_collector");
      // Specific cup wins
      const cupNameMap = { "Sub Money": "win_sub_money", "Clubman": "win_clubman", "Global": "win_global", "Ultimate": "win_ultimate" };
      cupWins.forEach(c => {
        const achId = Object.entries(cupNameMap).find(([name]) => c.cupName?.includes(name))?.[1];
        if (achId && !u.has(achId)) historyAchs.push(achId);
      });

      // Career apps/goals from playerCareers
      const careers = s.clubHistory?.playerCareers || {};
      if (!u.has("fifty_not_out") && Object.values(careers).some(c => (c.apps || 0) >= 50)) historyAchs.push("fifty_not_out");
      if (!u.has("century_club") && Object.values(careers).some(c => (c.goals || 0) >= 100)) historyAchs.push("century_club");
      if (!u.has("golden_boot") && Object.values(careers).some(c => c.seasons?.some(ss => (ss.goals || 0) >= 20))) historyAchs.push("golden_boot");

      if (historyAchs.length > 0) {
        const merged = new Set(u);
        historyAchs.forEach(id => merged.add(id));
        s.unlockedAchievements = merged;
        loaded.unlockedAchievements = merged;
      }
    }

    // Migration: retroactive Elderberry Cigs (Museum) achievement catch-up
    // Achievements are per-save state, so a sacking-time unlock dies with
    // the deleted save — ashes_to_ashes/died_as_they_lived/the_collection/
    // decade_of_danger are re-derived here from profile.museum, which
    // outlives any individual save.
    if (profileId) {
      try {
        const profile = await readProfile(profileId);
        const museumAchs = checkMuseumAchievements(profile?.museum, s.unlockedAchievements || new Set());
        if (museumAchs.length > 0) {
          const merged = new Set(s.unlockedAchievements || new Set());
          museumAchs.forEach(id => merged.add(id));
          s.unlockedAchievements = merged;
          loaded.unlockedAchievements = merged;
        }
      } catch (e) { console.warn("Museum achievement catch-up failed:", e); }
    }

    // Migration: grant missing player unlocks
    // Re-derives "unlocked but never added" from source of truth on every
    // load, rather than trusting any snapshot taken mid-consent-flow —
    // pendingPlayerUnlock is transient React state and isn't persisted, so
    // a save captured while a reveal was still on screen (or under the old
    // pack-gated system) would otherwise lose the unlock for good.
    if (s.unlockedAchievements && s.squad) {
      const missingUnlocks = deriveMissingPlayerUnlocks({
        unlockedAchievements: s.unlockedAchievements, squad: s.squad, teamName: s.teamName,
      });
      if (missingUnlocks.length > 0) {
        pendingUnlocks = missingUnlocks;
      }
    }
    loaded.matchweekIndex = getLeagueMatchdaysPlayed(loaded.seasonCalendar, loaded.calendarIndex);
    loaded.gameOver = s.gameOver === true;
    validateSavePayload(createSavePayload(loaded, nextMessageSeq));
    return { loaded, nextMessageSeq, pendingUnlocks, settings: s };
  }, []);

  // Load game from storage
  const loadGame = useCallback(async (slotOverride) => {
    const store = useGameStore.getState();
    const slot = slotOverride || activeSaveSlot;
    if (!slot || !store.activeProfileId) return false;
    try {
      let prepared;
      const result = await storage.getSave(getSaveKey(store.activeProfileId, slot), { validate: async value => {
        try { prepared = await prepareLoad(value, store.activeProfileId); return true; }
        catch { return false; }
      } });
      if (!result) return false;
      if (result.recovered) {
        // The active record was missing/unreadable; a rotating backup stood
        // in. Loud in the console — a silent stand-in would hide data loss.
        console.warn(`Save slot ${slot}: active record missing, loaded newest backup (#${result.backupId}).`);
      }
      const { loaded, nextMessageSeq, pendingUnlocks, settings } = prepared;
      const shouldUnlockSaveScummer = (await findNewerSaveOfCareer(store.activeProfileId, loaded, slot)) != null;
      useGameStore.setState(loaded);
      setArchiveStatus(null);
      legacySave.current = settings.careerId ? null : result.value;
      achievementUnlockWeeksRef.current = loaded.achievementUnlockWeeks;
      seedMessageSeq(nextMessageSeq);
      loadSettings(settings);
      setActiveSaveSlot(slot);
      setPendingPlayerUnlock(pendingUnlocks);
      // The loaded save keeps its own achievement history: an older copy
      // that already earned Save Scummer stays earned — no repeat toast.
      if (shouldUnlockSaveScummer && onTimeTravelLoad &&
          !useGameStore.getState().unlockedAchievements.has("save_scummer")) {
        onTimeTravelLoad();
      }
      return true;
    } catch (e) {
      console.error("Load failed:", e);
      return false;
    }
  }, [activeSaveSlot]);

  // Export save data as a JSON file download
  const exportSave = useCallback(async () => {
    const s = useGameStore.getState();
    setImportStatus("exporting");
    try {
      const payload = createSavePayload(s, getMessageSeq());
      validateSavePayload(payload);
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      const safeName = (s.teamName || "backup").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "backup";
      a.href = url;
      a.download = `fruit-cigs-${safeName}-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportStatus("exported");
      setTimeout(() => setImportStatus(null), 2500);
    } catch (e) {
      console.error("Export failed:", e);
      setImportStatus("export-error");
      setTimeout(() => setImportStatus(null), 3000);
    }
  }, [activeSaveSlot]);

  // Import save from a JSON file
  const importSave = useCallback(async (file) => {
    const s = useGameStore.getState();
    setImportStatus("importing");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      validateSavePayload(parsed);
      await prepareLoad(text, s.activeProfileId);
      if (!s.activeProfileId || !activeSaveSlot) throw new Error("No active save slot");
      await storage.setSave(getSaveKey(s.activeProfileId, activeSaveSlot), text, "import");
      setImportStatus("imported");
      setTimeout(() => {
        setImportStatus(null);
        window.location.reload();
      }, 1200);
    } catch (e) {
      console.error("Import failed:", e);
      setImportStatus("invalid");
      setTimeout(() => setImportStatus(null), 3000);
    }
  }, [activeSaveSlot]);

  // Delete saved game
  const deleteSave = useCallback(async (slotOverride) => {
    const s = useGameStore.getState();
    const slot = slotOverride || activeSaveSlot;
    if (!slot || !s.activeProfileId) return;
    try {
      await storage.deleteSave(getSaveKey(s.activeProfileId, slot));
      setSaveSlotSummaries(prev => {
        const next = [...prev];
        next[slot - 1] = null;
        return next;
      });
      if (slot === activeSaveSlot) {
        setImportStatus("deleted");
        setTimeout(() => {
          setImportStatus(null);
          window.location.reload();
        }, 1200);
      }
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }, [activeSaveSlot]);

  // Sacking: archive career to museum and show game over screen
  const triggerSacking = useCallback(() => {
    if (sackingInFlight.current) return sackingInFlight.current;
    const s = useGameStore.getState();
    if (!s.activeProfileId || !activeSaveSlot) return Promise.resolve(false);
    // Freeze gameplay immediately; failure keeps this ended career available
    // for retry/export instead of silently returning it to playable state.
    s.setGameOver(true);
    setArchiveStatus("saving");
    sackingInFlight.current = (async () => {
      try {
        if (!s.careerId) s.setCareerId(crypto.randomUUID());
        const snapshot = createSavePayload(useGameStore.getState(), getMessageSeq());
        await archiveCareerToMuseum(s.activeProfileId, snapshot, activeSaveSlot, legacySave.current);
        setSaveSlotSummaries(prev => { const n = [...prev]; n[activeSaveSlot - 1] = null; return n; });
        setArchiveStatus("saved");
        return true;
      } catch (e) {
        console.error("Museum archive failed:", e);
        setArchiveStatus("error");
        return false;
      } finally {
        sackingInFlight.current = null;
      }
    })();
    return sackingInFlight.current;
  }, [activeSaveSlot]);

  return { saveGame, loadGame, exportSave, importSave, deleteSave, triggerSacking };
}
