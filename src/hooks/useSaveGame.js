import { useCallback } from "react";
import { useGameStore, serializeState, hydrateState } from "../store/gameStore.js";
import { getSaveKey, archiveCareerToMuseum } from "../utils/profile.js";
import { ATTRIBUTES } from "../data/training.js";
import { POSITION_TYPES, TOTAL_SLOTS } from "../data/positions.js";
import { LEAGUE_DEFS, NUM_TIERS, AI_BENCH_POSITIONS } from "../data/leagues.js";
import { STORY_ARCS } from "../data/storyArcs.js";
import { STARTER_PACKS } from "../data/cigPacks.js";
import { UNLOCKABLE_PLAYERS } from "../data/achievements.js";
import { DEFAULT_FORMATION } from "../data/formations.js";
import { getModifier } from "../data/leagueModifiers.js";
import { rand, getOverall } from "../utils/calc.js";
import { getOvrCap, pickAINationality, generateNameForNation, inferNationality, generateSquadPhilosophy } from "../utils/player.js";
import { initStoryArcs } from "../utils/arcs.js";
import { simulateMatchweek } from "../utils/match.js";
import { normalizeRosters, initLeague, initAILeague, buildSeasonCalendar, computeCalendarIndex, initCup } from "../utils/league.js";
import { seedMessageSeq, getMessageSeq } from "../utils/messageUtils.js";

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
  setActiveSaveSlot,
  setSaveSlotSummaries,
  setImportStatus,
  setPendingPlayerUnlock,
  // Component-local callbacks
  loadSettings,
  generateNewspaperName,
  generateReporterName,
  // Refs
  achievementUnlockWeeksRef,
}) {

  // Save game state to storage
  const saveGame = useCallback(async () => {
    const s = useGameStore.getState();
    const { teamName, league, activeProfileId } = s;
    if (!teamName || !league || !activeSaveSlot || !activeProfileId) return;
    setSaveStatus("saving");
    try {
      const saveData = serializeState({
        version: 2,
        teamName, newspaperName: s.newspaperName, reporterName: s.reporterName,
        squad: s.squad, league, matchweekIndex: s.matchweekIndex,
        startingXI: s.startingXI, bench: s.bench,
        unlockedAchievements: s.unlockedAchievements, unlockedPacks: s.unlockedPacks,
        achievementUnlockWeeks: s.achievementUnlockWeeks, lastSeenAchievementCount: s.lastSeenAchievementCount,
        seasonCards: s.seasonCards, seasonNumber: s.seasonNumber, leagueWins: s.leagueWins,
        leagueTier: s.leagueTier, prestigeLevel: s.prestigeLevel, leagueVersion: 3,
        lastSeasonMove: s.lastSeasonMove, matchSpeed: s.matchSpeed,
        soundEnabled: s.soundEnabled, autoSaveEnabled: s.autoSaveEnabled,
        trainingCardSpeed: s.trainingCardSpeed, matchDetail: s.matchDetail,
        musicEnabled: s.musicEnabled, musicVolume: s.musicVolume,
        disabledTracks: [...(s.disabledTracks || [])], instantMatch: s.instantMatch,
        totalGains: s.totalGains, totalMatches: s.totalMatches,
        seasonCleanSheets: s.seasonCleanSheets, seasonGoalsFor: s.seasonGoalsFor,
        seasonDraws: s.seasonDraws,
        seasonHomeUnbeaten: s.seasonHomeUnbeaten, seasonAwayWins: s.seasonAwayWins,
        seasonAwayGames: s.seasonAwayGames,
        consecutiveUnbeaten: s.consecutiveUnbeaten, consecutiveLosses: s.consecutiveLosses,
        consecutiveDraws: s.consecutiveDraws, consecutiveWins: s.consecutiveWins,
        consecutiveScoreless: s.consecutiveScoreless,
        prevStartingXI: s.prevStartingXI,
        motmTracker: s.motmTracker, stScoredConsecutive: s.stScoredConsecutive,
        playerRatingTracker: s.playerRatingTracker, playerRatingNames: s.playerRatingNames,
        playerMatchLog: s.playerMatchLog, breakoutsThisSeason: s.breakoutsThisSeason,
        playerSeasonStats: s.playerSeasonStats,
        beatenTeams: s.beatenTeams,
        retiringPlayers: s.retiringPlayers,
        cup: s.cup,
        summerPhase: s.summerPhase,
        summerData: s.summerData,
        leagueRosters: s.leagueRosters,
        halfwayPosition: s.halfwayPosition,
        clubHistory: s.clubHistory,
        recentScorelines: s.recentScorelines,
        secondPlaceFinishes: s.secondPlaceFinishes,
        playerInjuryCount: s.playerInjuryCount,
        seasonInjuryLog: s.seasonInjuryLog,
        careerMilestones: s.careerMilestones,
        benchStreaks: s.benchStreaks,
        highScoringMatches: s.highScoringMatches,
        calendarIndex: s.calendarIndex,
        seasonCalendar: s.seasonCalendar,
        calendarResults: s.calendarResults,
        leagueResults: s.leagueResults,
        inboxMessages: s.inboxMessages,
        _messageSeq: getMessageSeq(),
        trialPlayer: s.trialPlayer,
        trialHistory: s.trialHistory,
        prodigalSon: s.prodigalSon,
        lopsidedWarned: s.lopsidedWarned,
        ovrHistory: s.ovrHistory,
        storyArcs: s.storyArcs,
        allTimeLeagueStats: s.allTimeLeagueStats,
        formation: s.formation,
        slotAssignments: s.slotAssignments,
        allLeagueStates: s.allLeagueStates,
        clubRelationships: s.clubRelationships,
        transferFocus: s.transferFocus,
        transferWindowOpen: s.transferWindowOpen,
        transferWindowWeeksRemaining: s.transferWindowWeeksRemaining,
        transferOffers: s.transferOffers,
        loanedOutPlayers: s.loanedOutPlayers,
        loanedInPlayers: s.loanedInPlayers,
        transferHistory: s.transferHistory,
        shortlist: s.shortlist,
        tickets: s.tickets,
        pendingTicketBoosts: s.pendingTicketBoosts,
        doubleTrainingWeek: s.doubleTrainingWeek,
        twelfthManActive: s.twelfthManActive,
        youthCoupActive: s.youthCoupActive,
        pendingFreeAgent: s.pendingFreeAgent,
        scoutedPlayers: s.scoutedPlayers,
        testimonialPlayer: s.testimonialPlayer,
        usedTicketTypes: s.usedTicketTypes,
        formationsWonWith: s.formationsWonWith,
        freeAgentSignings: s.freeAgentSignings,
        holidayMatchesThisSeason: s.holidayMatchesThisSeason,
        fastMatchesThisSeason: s.fastMatchesThisSeason,
        gkCleanSheets: s.gkCleanSheets,
        totalShortlisted: s.totalShortlisted,
        prevSeasonSquadIds: s.prevSeasonSquadIds,
        tradesMadeInWindow: s.tradesMadeInWindow,
        tradedWithClubs: s.tradedWithClubs,
        fanSentiment: s.fanSentiment, boardSentiment: s.boardSentiment,
        gameMode: s.gameMode,
        boardWarnCount: s.boardWarnCount,
        ultimatumActive: s.ultimatumActive,
        ultimatumTarget: s.ultimatumTarget,
        ultimatumPtsEarned: s.ultimatumPtsEarned,
        ultimatumGamesLeft: s.ultimatumGamesLeft,
        ultimatumCupPending: s.ultimatumCupPending,
        trainedThisWeek: s.trainedThisWeek,
        dynastyCupQualifiers: s.dynastyCupQualifiers,
        dynastyCupBracket: s.dynastyCupBracket,
        miniTournamentBracket: s.miniTournamentBracket,
        fiveASideSquad: s.fiveASideSquad,
      });
      const saveKey = getSaveKey(activeProfileId, activeSaveSlot);
      await window.storage.set(saveKey, JSON.stringify(saveData));
      // Update slot summary for quick display
      setSaveSlotSummaries(prev => {
        const next = [...prev];
        next[activeSaveSlot - 1] = { teamName, seasonNumber: s.seasonNumber, leagueTier: s.leagueTier, week: s.calendarIndex + 1, gameMode: s.gameMode };
        return next;
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (e) {
      console.error("Save failed:", e);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }, [activeSaveSlot]);

  // Load game from storage
  const loadGame = useCallback(async (slotOverride) => {
    const store = useGameStore.getState();
    const slot = slotOverride || activeSaveSlot;
    if (!slot || !store.activeProfileId) return false;
    try {
      const result = await window.storage.get(getSaveKey(store.activeProfileId, slot));
      if (!result) return false;
      const s = hydrateState(JSON.parse(result.value));
      if (!s || !s.teamName) return false;
      setActiveSaveSlot(slot);
      store.setTeamName(s.teamName);
      store.setNewspaperName(s.newspaperName || generateNewspaperName(s.teamName));
      store.setReporterName(s.reporterName || generateReporterName());
      // Migrate: add nationality, statProgress, and potential to existing players if missing
      const loadOvrCap = getOvrCap(s.prestigeLevel || 0);
      const migratedSquad = (s.squad || []).map(p => {
        const migrated = { ...p };
        if (!migrated.nationality) migrated.nationality = inferNationality(migrated.name);
        if (!migrated.statProgress) migrated.statProgress = {};
        if (migrated.potential == null) {
          const ovr = getOverall(migrated);
          const maxGap = migrated.age <= 19 ? rand(5,10) : migrated.age <= 23 ? rand(3,8) : migrated.age <= 27 ? rand(2,5) : migrated.age <= 30 ? rand(1,3) : rand(0,2);
          migrated.potential = Math.min(loadOvrCap, ovr + maxGap);
        }
        return migrated;
      });
      store.setSquad(migratedSquad);
      // Migrate: patch AI team squad members with names/nationalities + add bench if missing
      if (s.league?.teams) {
        s.league.teams.forEach(team => {
          if (team.isPlayer) return;
          const migTier = team.tier || s.leagueTier || s.league?.tier || 11;
          if (team.squad) {
            team.squad.forEach(p => {
              if (!p.nationality) p.nationality = pickAINationality(migTier);
              if (!p.name) {
                const nd = generateNameForNation(p.nationality || pickAINationality(migTier));
                p.name = nd.name;
              }
            });
            // Add bench players if squad only has 11
            if (team.squad.length <= 11) {
              const strength = team.strength || 0.5;
              const minBase = Math.max(1, Math.round(2 + strength * 4) - 1);
              const maxBase = Math.max(2, Math.round(5 + strength * 6) - 1);
              AI_BENCH_POSITIONS.forEach((pos) => {
                const attrs = {};
                const type = POSITION_TYPES[pos];
                const biases = { GK:{defending:3,physical:2,mental:1}, DEF:{defending:3,physical:2,mental:1}, MID:{passing:3,technique:2,mental:1}, FWD:{shooting:3,pace:2,technique:1} };
                ATTRIBUTES.forEach(({ key }) => {
                  const bias = (biases[type] && biases[type][key]) || 0;
                  attrs[key] = Math.max(1, Math.min(14, rand(minBase, maxBase) + bias));
                });
                const nc = pickAINationality(migTier);
                const nd = generateNameForNation(nc);
                team.squad.push({ name: nd.name, position: pos, attrs, isBench: true, nationality: nc });
              });
            }
          }
        });
      }
      // Migrate old 3-tier league object to 11-tier system
      if (s.league && !s.leagueVersion && s.league.tier && s.league.tier <= 3) {
        const tierMap = { 1: 5, 2: 6, 3: 7 };
        s.league.tier = tierMap[s.league.tier] || 7;
        if (s.leagueTier && s.leagueTier <= 3) s.leagueTier = tierMap[s.leagueTier] || 7;
        const newDef = LEAGUE_DEFS[s.league.tier];
        if (newDef) {
          s.league.leagueName = newDef.name;
          s.league.leagueColor = newDef.color;
        }
      }
      // Also migrate leagueRosters keys
      if (s.leagueRosters && !s.leagueVersion) {
        const old = s.leagueRosters;
        if (old[1] && !old[5]) {
          const migrated = {};
          if (old[1]) migrated[5] = old[1];
          if (old[2]) migrated[6] = old[2];
          if (old[3]) migrated[7] = old[3];
          for (let t = 1; t <= NUM_TIERS; t++) {
            if (!migrated[t]) migrated[t] = (LEAGUE_DEFS[t]?.teams || []).map(c => ({ ...c }));
          }
          s.leagueRosters = migrated;
        }
      }
      // Ensure all tiers exist in rosters
      if (s.leagueRosters) {
        for (let t = 1; t <= NUM_TIERS; t++) {
          if (!s.leagueRosters[t]) s.leagueRosters[t] = (LEAGUE_DEFS[t]?.teams || []).map(c => ({ ...c }));
        }
      }
      // === V2 → V3 MIGRATION ===
      if (s.leagueVersion === 2 || (!s.leagueVersion && s.leagueRosters)) {
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
          const repairedLeague = initLeague(migratedSquad, s.teamName, repairedTier, s.leagueRosters, null, s.prestigeLevel || 0);
          s.league = repairedLeague;
          s.cup = initCup(s.teamName, repairedTier, s.leagueRosters);
          s.seasonCalendar = null;
          s.calendarIndex = 0;
          s.calendarResults = {};
          s.leagueResults = {};
        }
        s.leagueVersion = 3;
      }
      // === END V3 MIGRATION ===

      // Backfill age and id on AI players from saves that predate the aging system
      const backfillAISquad = (sq) => {
        (sq || []).forEach(p => {
          if (p.age == null) p.age = rand(22, 33);
          if (p.id == null) p.id = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        });
      };
      if (s.league?.teams) s.league.teams.forEach(t => { if (!t.isPlayer) backfillAISquad(t.squad); });
      if (s.allLeagueStates) {
        Object.values(s.allLeagueStates).forEach(als => {
          (als.teams || []).forEach(t => backfillAISquad(t.squad));
        });
      }
      // Backfill squadPhilosophy + trajectory on roster configs
      if (s.leagueRosters) {
        for (let t = 1; t <= NUM_TIERS; t++) {
          (s.leagueRosters[t] || []).forEach(cfg => {
            if (!cfg.squadPhilosophy) cfg.squadPhilosophy = generateSquadPhilosophy(cfg.trait);
            if (cfg.trajectory === undefined) cfg.trajectory = 0;
          });
        }
      }

      // Migrate old 3-tier saves to 11-tier system
      const savedTier = s.leagueTier || NUM_TIERS;
      const migratedTier = (!s.leagueVersion && savedTier <= 3) ? { 1: 5, 2: 6, 3: 7 }[savedTier] || 7 : savedTier;
      if (s.league && s.league.tier !== migratedTier) {
        s.league.tier = migratedTier;
        const tierDef = LEAGUE_DEFS[migratedTier];
        if (tierDef) {
          s.league.leagueName = tierDef.name;
          s.league.leagueColor = tierDef.color;
        }
      }
      // Always sync league name/color from LEAGUE_DEFS
      if (s.league && s.league.tier && LEAGUE_DEFS[s.league.tier]) {
        s.league.leagueName = LEAGUE_DEFS[s.league.tier].name;
        s.league.leagueColor = LEAGUE_DEFS[s.league.tier].color;
      }
      // Migrate season history league names
      if (s.seasonHistory) {
        s.seasonHistory = s.seasonHistory.map(entry => {
          if (entry.tier && LEAGUE_DEFS[entry.tier]) {
            return { ...entry, leagueName: LEAGUE_DEFS[entry.tier].name };
          }
          return entry;
        });
      }

      store.setLeague(s.league);
      store.setStartingXI(s.startingXI);
      store.setBench(s.bench);
      store.setUnlockedAchievements(s.unlockedAchievements || new Set());
      store.setUnlockedPacks(s.unlockedPacks instanceof Set && s.unlockedPacks.size > 0 ? s.unlockedPacks : new Set(STARTER_PACKS));
      if (s.achievementUnlockWeeks) { store.setAchievementUnlockWeeks(s.achievementUnlockWeeks); achievementUnlockWeeksRef.current = s.achievementUnlockWeeks; }
      store.setLastSeenAchievementCount(s.lastSeenAchievementCount ?? (s.unlockedAchievements?.size ?? 0));
      store.setSeasonCards(s.seasonCards || 0);
      store.setSeasonNumber(s.seasonNumber || 1);
      store.setLeagueWins(s.leagueWins || 0);
      store.setLeagueTier(migratedTier);
      store.setLastSeasonMove(s.lastSeasonMove || null);
      loadSettings(s);
      store.setTotalGains(s.totalGains || 0);
      store.setTotalMatches(s.totalMatches || 0);
      store.setSeasonCleanSheets(s.seasonCleanSheets || 0);
      store.setSeasonGoalsFor(s.seasonGoalsFor || 0);
      store.setSeasonDraws(s.seasonDraws || 0);
      store.setSeasonHomeUnbeaten(s.seasonHomeUnbeaten !== false);
      store.setSeasonAwayWins(s.seasonAwayWins || 0);
      store.setSeasonAwayGames(s.seasonAwayGames || 0);
      store.setConsecutiveUnbeaten(s.consecutiveUnbeaten || 0);
      store.setConsecutiveLosses(s.consecutiveLosses || 0);
      store.setConsecutiveDraws(s.consecutiveDraws || 0);
      store.setConsecutiveWins(s.consecutiveWins || 0);
      store.setConsecutiveScoreless(s.consecutiveScoreless || 0);
      store.setFanSentiment(s.fanSentiment ?? 50);
      store.setBoardSentiment(s.boardSentiment ?? 50);
      store.setDynastyCupQualifiers(s.dynastyCupQualifiers || null);
      store.setDynastyCupBracket(s.dynastyCupBracket || null);
      store.setMiniTournamentBracket(s.miniTournamentBracket || null);
      store.setFiveASideSquad(s.fiveASideSquad || null);
      store.setGameMode(s.gameMode || "casual");
      store.setBoardWarnCount(s.boardWarnCount || 0);
      store.setUltimatumActive(s.ultimatumActive || false);
      store.setUltimatumTarget(s.ultimatumTarget || 0);
      store.setUltimatumPtsEarned(s.ultimatumPtsEarned || 0);
      store.setUltimatumGamesLeft(s.ultimatumGamesLeft || 0);
      store.setUltimatumCupPending(s.ultimatumCupPending || false);
      store.setTrainedThisWeek(s.trainedThisWeek || new Set());
      // Migrate clubHistory league names
      if (s.clubHistory) {
        if (s.clubHistory.bestSeasonFinish?.tier && LEAGUE_DEFS[s.clubHistory.bestSeasonFinish.tier]) {
          s.clubHistory.bestSeasonFinish.leagueName = LEAGUE_DEFS[s.clubHistory.bestSeasonFinish.tier].name;
        }
        if (s.clubHistory.seasonArchive) {
          s.clubHistory.seasonArchive = s.clubHistory.seasonArchive.map(entry => {
            if (entry.tier && LEAGUE_DEFS[entry.tier]) {
              return { ...entry, leagueName: LEAGUE_DEFS[entry.tier].name };
            }
            return entry;
          });
        }
        if (s.clubHistory.cupHistory) {
          s.clubHistory.cupHistory = s.clubHistory.cupHistory.map(entry => {
            if (entry.cupName && entry.cupName.startsWith("The ")) {
              return { ...entry, cupName: entry.cupName.slice(4) };
            }
            return entry;
          });
        }
      }
      if (s.clubHistory && s.clubHistory.totalWins > 0) {
        store.setClubHistory(s.clubHistory);
      } else if (s.seasonNumber > 1 && !s.clubHistory?.totalWins) {
        // Migration: backfill clubHistory from available save data
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
        store.setClubHistory(h);
      }
      store.setPrevStartingXI(s.prevStartingXI || null);
      store.setMotmTracker(s.motmTracker || {});
      store.setStScoredConsecutive(s.stScoredConsecutive || 0);
      // Migrate name-keyed playerRatingTracker to ID-keyed
      let _loadedTracker = s.playerRatingTracker || {};
      if (Object.keys(_loadedTracker).length > 0) {
        const _squadIds = new Set((s.squad || []).map(p => p.id).filter(Boolean));
        const _alreadyIdKeyed = Object.keys(_loadedTracker).some(k => _squadIds.has(k));
        if (!_alreadyIdKeyed) {
          const _migrated = {};
          (s.squad || []).forEach(p => { if (p.name && p.id && _loadedTracker[p.name]) _migrated[p.id] = _loadedTracker[p.name]; });
          _loadedTracker = _migrated;
        }
      }
      store.setPlayerRatingTracker(_loadedTracker);
      store.setPlayerRatingNames(s.playerRatingNames || {});
      store.setPlayerMatchLog(s.playerMatchLog || {});
      store.setBreakoutsThisSeason(s.breakoutsThisSeason || new Map());
      store.setPlayerSeasonStats(s.playerSeasonStats || {});
      store.setBeatenTeams(s.beatenTeams || new Set());
      store.setRetiringPlayers(s.retiringPlayers || new Set());
      // Migrate cup name: strip "The " prefix
      if (s.cup && s.cup.cupName && s.cup.cupName.startsWith("The ")) {
        s.cup.cupName = s.cup.cupName.slice(4);
      }
      store.setCup(s.cup || initCup(s.teamName, migratedTier, s.leagueRosters));
      // Migration: convert summerPhase="summary" to "break"
      const rawSummerPhase = s.summerPhase || null;
      const loadedSummerPhase = rawSummerPhase === "summary" ? "break" : rawSummerPhase;
      const loadedSummerData = rawSummerPhase === "summary"
        ? { ...(s.summerData || {}), weeksLeft: s.summerData?.weeksLeft ?? 5 }
        : (s.summerData || null);
      store.setSummerPhase(loadedSummerPhase);
      store.setSummerData(loadedSummerData);
      const migratedRosters = s.leagueRosters ? normalizeRosters({ ...s.leagueRosters }) : null;
      store.setLeagueRosters(migratedRosters);
      store.setHalfwayPosition(s.halfwayPosition ?? null);
      store.setRecentScorelines(s.recentScorelines || []);
      store.setSecondPlaceFinishes(s.secondPlaceFinishes || 0);
      store.setPlayerInjuryCount(s.playerInjuryCount || {});
      store.setSeasonInjuryLog(s.seasonInjuryLog || {});
      store.setCareerMilestones(s.careerMilestones || {});
      store.setBenchStreaks(s.benchStreaks || {});
      store.setHighScoringMatches(s.highScoringMatches || 0);
      // Calendar migration: rebuild if not present
      if (s.seasonCalendar) {
        store.setSeasonCalendar(s.seasonCalendar);
        store.setCalendarIndex(s.calendarIndex || 0);
      } else if (s.league?.fixtures) {
        const cal = buildSeasonCalendar(s.league.fixtures.length, s.cup, !!getModifier(migratedTier).knockoutAtEnd, !!getModifier(migratedTier).miniTournament);
        store.setSeasonCalendar(cal);
        store.setCalendarIndex(computeCalendarIndex(cal, s.matchweekIndex || 0, s.cup));
      }
      store.setCalendarResults(s.calendarResults || {});
      store.setLeagueResults(s.leagueResults || {});
      const loadedMessages = (s.inboxMessages || []).map((m, i) => m.seq != null ? m : { ...m, seq: i });
      store.setInboxMessages(loadedMessages);
      const maxSeq = loadedMessages.reduce((mx, m) => Math.max(mx, m.seq ?? -1), -1);
      seedMessageSeq(s._messageSeq != null ? Math.max(s._messageSeq, maxSeq + 1) : maxSeq + 1);
      store.setTrialPlayer(s.trialPlayer || null);
      store.setTrialHistory(s.trialHistory || []);
      store.setProdigalSon(s.prodigalSon || null);
      if (s.prodigalSon?.phase === "redeemed" && s.prodigalSon?.pendingBoost === undefined) {
        store.setProdigalSon({ ...s.prodigalSon, pendingBoost: true });
      }
      store.setLopsidedWarned(s.lopsidedWarned || new Set());
      store.setOvrHistory(s.ovrHistory || []);
      const loadedArcs = s.storyArcs || initStoryArcs();
      // Migration v3: reconstruct completed arcs
      if (!loadedArcs._arcRewardV3) {
        const inboxCompleted = (s.inboxMessages || [])
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
      }
      store.setStoryArcs(loadedArcs);
      store.setAllTimeLeagueStats(s.allTimeLeagueStats || { scorers: {}, assisters: {}, cards: {} });
      // Load formation
      if (s.formation && s.formation.length === 11) {
        store.setFormation(s.formation.map(slot => ({...slot})));
      } else {
        store.setFormation(DEFAULT_FORMATION.map(slot => ({...slot})));
      }
      // Load slot assignments
      if (s.slotAssignments && Array.isArray(s.slotAssignments) && s.slotAssignments.length >= 11) {
        const loaded = [...s.slotAssignments];
        while (loaded.length < TOTAL_SLOTS) loaded.push(null);
        store.setSlotAssignments(loaded);
      } else {
        store.setSlotAssignments(null);
      }
      // Load AI league states
      if (s.allLeagueStates && Object.keys(s.allLeagueStates).length > 0) {
        for (const [tier, leagueState] of Object.entries(s.allLeagueStates)) {
          if (leagueState?.teams) {
            leagueState.teams.forEach(team => {
              if (team.squad) {
                team.squad.forEach(p => {
                  if (!p.nationality) p.nationality = pickAINationality(Number(tier));
                });
              }
            });
          }
        }
        store.setAllLeagueStates(s.allLeagueStates);
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
        store.setAllLeagueStates(freshAILeagues);
      }
      store.setClubRelationships(s.clubRelationships || {});
      store.setTransferFocus(Array.isArray(s.transferFocus) ? s.transferFocus : (s.transferFocus ? [s.transferFocus] : []));
      store.setTransferWindowOpen(s.transferWindowOpen || false);
      store.setTransferWindowWeeksRemaining(s.transferWindowWeeksRemaining || 0);
      store.setTransferOffers(s.transferOffers || []);
      store.setLoanedOutPlayers(s.loanedOutPlayers || []);
      store.setLoanedInPlayers(s.loanedInPlayers || []);
      store.setTransferHistory(s.transferHistory || []);
      store.setShortlist(s.shortlist || []);
      store.setTickets(s.tickets || []);
      store.setPendingTicketBoosts(s.pendingTicketBoosts || []);
      store.setDoubleTrainingWeek(s.doubleTrainingWeek || false);
      store.setTwelfthManActive(s.twelfthManActive || false);
      store.setYouthCoupActive(s.youthCoupActive || false);
      store.setPendingFreeAgent(s.pendingFreeAgent || null);
      store.setScoutedPlayers(s.scoutedPlayers || {});
      store.setTestimonialPlayer(s.testimonialPlayer || null);
      store.setUsedTicketTypes(s.usedTicketTypes || new Set());
      store.setFormationsWonWith(s.formationsWonWith || new Set());
      store.setFreeAgentSignings(s.freeAgentSignings || 0);
      store.setHolidayMatchesThisSeason(s.holidayMatchesThisSeason || 0);
      store.setFastMatchesThisSeason(s.fastMatchesThisSeason || 0);
      store.setGkCleanSheets(s.gkCleanSheets || {});
      store.setTotalShortlisted(s.totalShortlisted || 0);
      store.setPrevSeasonSquadIds(s.prevSeasonSquadIds || null);
      store.setTradesMadeInWindow(s.tradesMadeInWindow || 0);
      store.setTradedWithClubs(s.tradedWithClubs || new Set());
      store.setPrestigeLevel(s.prestigeLevel || 0);
      // Migration: seed allTimeLeagueStats from clubHistory
      if (!s.allTimeLeagueStats && s.clubHistory?.playerCareers) {
        const seeded = { scorers: {}, assisters: {}, cards: {} };
        Object.entries(s.clubHistory.playerCareers).forEach(([name, c]) => {
          if (c.goals > 0) seeded.scorers[`${name}|${s.teamName}`] = c.goals;
          if (c.assists > 0) seeded.assisters[`${name}|${s.teamName}`] = c.assists;
          if ((c.yellows || 0) + (c.reds || 0) > 0) seeded.cards[`${name}|${s.teamName}`] = (c.yellows || 0) + (c.reds || 0);
        });
        store.setAllTimeLeagueStats(seeded);
      }
      // Migration: backfill initial OVR snapshot
      if (!s.ovrHistory || s.ovrHistory.length === 0) {
        const snap = {};
        (s.squad || []).forEach(p => { snap[`${p.name}|${p.position}`] = getOverall(p); });
        store.setOvrHistory([{ w: (s.calendarIndex || 0) + 1, s: s.seasonNumber || 1, p: snap }]);
      }
      // Migration: grant missing player unlocks
      if (s.unlockedAchievements && s.squad) {
        const currentSquadIds = new Set((s.squad || []).map(p => p.id));
        const missingUnlocks = [];
        for (const achId of s.unlockedAchievements) {
          const unlock = UNLOCKABLE_PLAYERS.find(u => u.achievementId === achId);
          if (unlock && unlock.attrs) {
            const unlockId = `unlockable_${unlock.id}`;
            if (!currentSquadIds.has(unlockId)) {
              missingUnlocks.push(unlock);
            }
          }
        }
        if (missingUnlocks.length > 0) {
          setPendingPlayerUnlock(missingUnlocks);
        }
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
      const result = await window.storage.get(getSaveKey(s.activeProfileId, activeSaveSlot));
      if (!result) { setImportStatus("no-save"); setTimeout(() => setImportStatus(null), 2500); return; }
      const blob = new Blob([result.value], { type: "application/json" });
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
      if (!parsed || !parsed.teamName) {
        setImportStatus("invalid");
        setTimeout(() => setImportStatus(null), 3000);
        return;
      }
      await window.storage.set(getSaveKey(s.activeProfileId, activeSaveSlot), text);
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
      await window.storage.delete(getSaveKey(s.activeProfileId, slot));
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
  const triggerSacking = useCallback(async () => {
    const s = useGameStore.getState();
    if (!s.activeProfileId) return;
    try {
      await archiveCareerToMuseum(s.activeProfileId, {
        teamName: s.teamName, seasonNumber: s.seasonNumber, leagueTier: s.leagueTier,
        totalMatches: s.totalMatches,
        clubHistory: s.clubHistory,
      });
    } catch (e) { console.error("Museum archive failed:", e); }
    const slot = activeSaveSlot;
    if (slot && s.activeProfileId) {
      try {
        await window.storage.delete(getSaveKey(s.activeProfileId, slot));
        setSaveSlotSummaries(prev => { const n = [...prev]; n[slot - 1] = null; return n; });
      } catch (e) { /* ok */ }
    }
    s.setGameOver(true);
  }, [activeSaveSlot]);

  return { saveGame, loadGame, exportSave, importSave, deleteSave, triggerSacking };
}
