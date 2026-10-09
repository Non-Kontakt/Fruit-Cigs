import { serializeState } from "../store/gameStore.js";

export const GAME_SAVE_VERSION = 5;

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function validateSavePayload(s) {
  const invalid = reason => { throw new Error(`Invalid career: ${reason}`); };
  if (!isObject(s) || typeof s.teamName !== "string" || !s.teamName.trim()) invalid("missing club name");
  if (s.version != null && (!Number.isInteger(s.version) || s.version < 1 || s.version > GAME_SAVE_VERSION)) invalid("unsupported version");
  if (!Array.isArray(s.squad) || !s.squad.length) invalid("missing squad");
  const ids = new Set();
  for (const p of s.squad) {
    if (!isObject(p) || p.id == null || ids.has(p.id) || typeof p.name !== "string" || !isObject(p.attrs)) invalid("invalid player");
    if (Object.values(p.attrs).some(v => !Number.isFinite(v) || v < 0)) invalid("invalid attributes");
    ids.add(p.id);
  }
  for (const field of ["startingXI", "bench"]) {
    if (!Array.isArray(s[field]) || new Set(s[field]).size !== s[field].length || s[field].some(id => !ids.has(id))) invalid(`invalid ${field}`);
  }
  if (s.bench.some(id => s.startingXI.includes(id))) invalid("a player is both starting and benched");
  if (!isObject(s.league) || !Array.isArray(s.league.teams) || s.league.teams.length < 2 ||
      !s.league.teams.every(t => isObject(t) && typeof t.name === "string") ||
      !Array.isArray(s.league.fixtures) || !Array.isArray(s.league.table)) invalid("missing league");
  for (const row of s.league.table) {
    if (!isObject(row) || !Number.isInteger(row.teamIndex) || !s.league.teams[row.teamIndex]) invalid("invalid standings");
  }
  for (const round of s.league.fixtures) {
    if (!Array.isArray(round) || round.some(f => !isObject(f) || !s.league.teams[f.home] || !s.league.teams[f.away] || f.home === f.away)) invalid("invalid fixtures");
  }
  for (const field of ["seasonNumber", "calendarIndex", "totalMatches", "prestigeLevel"]) {
    if (s[field] != null && (!Number.isInteger(s[field]) || s[field] < (field === "seasonNumber" ? 1 : 0))) invalid(`invalid ${field}`);
  }
  if (s.gameMode != null && !["casual", "ironman"].includes(s.gameMode)) invalid("invalid mode");
  if (s.clubHistory != null && !isObject(s.clubHistory)) invalid("invalid club history");
  for (const field of ["gains", "matchResult", "cupMatchResult", "pendingLeague", "pendingTrialAction"]) {
    if (s[field] != null && !isObject(s[field])) invalid(`invalid ${field}`);
  }
  if (s.gains) {
    if (typeof s.gains.reportId !== "string") invalid("missing training report identity");
    for (const field of ["improvements", "injuries", "duos", "progress", "arcBoosts", "ticketBoosts", "cappedArcTickets", "revealedItems"]) {
      if (s.gains[field] != null && !Array.isArray(s.gains[field])) invalid(`invalid training ${field}`);
    }
    if (s.gains.pickedTickets != null && !isObject(s.gains.pickedTickets)) invalid("invalid training rewards");
  }
  for (const result of [s.matchResult, s.cupMatchResult]) {
    if (!result) continue;
    if (!Array.isArray(result.events) || !Number.isInteger(result.homeGoals) || result.homeGoals < 0 ||
        !Number.isInteger(result.awayGoals) || result.awayGoals < 0) invalid("invalid pending result");
  }
  for (const field of ["seasonCalendar", "inboxMessages", "formation", "slotAssignments", "tickets", "transferHistory", "ovrHistory", "pendingSquad", "weekRecoveries", "pendingBreakouts", "arcStepQueue"]) {
    if (s[field] != null && !Array.isArray(s[field])) invalid(`invalid ${field}`);
  }
  return s;
}

export function createSavePayload(s, messageSeq) {
  return serializeState({
    version: GAME_SAVE_VERSION,
    careerId: s.careerId,
    gameOver: s.gameOver,
    matchPending: s.matchPending, pendingSquad: s.pendingSquad,
    gains: s.gains, matchResult: s.matchResult, cupMatchResult: s.cupMatchResult,
    pendingLeague: s.pendingLeague, weekRecoveries: s.weekRecoveries,
    cardedPlayerIds: s.cardedPlayerIds,
    pendingTrialAction: s.pendingTrialAction, pendingBreakouts: s.pendingBreakouts,
    arcStepQueue: s.arcStepQueue,
    teamName: s.teamName, newspaperName: s.newspaperName, reporterName: s.reporterName,
    managerName: s.managerName, managerAvatar: s.managerAvatar,
    squad: s.squad, league: s.league, matchweekIndex: s.matchweekIndex,
    startingXI: s.startingXI, bench: s.bench,
    unlockedAchievements: s.unlockedAchievements, unlockedPacks: s.unlockedPacks,
    achievementUnlockWeeks: s.achievementUnlockWeeks, lastSeenAchievementCount: s.lastSeenAchievementCount,
    onboardingDripSuppressed: s.onboardingDripSuppressed,
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
    consecutiveCleanSheets: s.consecutiveCleanSheets,
    latestHeadline: s.latestHeadline,
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
    previousLeaguePosition: s.previousLeaguePosition,
    clubHistory: s.clubHistory,
    leagueHistory: s.leagueHistory,
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
    _messageSeq: messageSeq,
    trialPlayer: s.trialPlayer,
    trialHistory: s.trialHistory,
    prodigalSon: s.prodigalSon,
    lopsidedWarned: s.lopsidedWarned,
    ovrHistory: s.ovrHistory,
    storyArcs: s.storyArcs,
    clubFocuses: s.clubFocuses,
    allTimeLeagueStatsByTier: s.allTimeLeagueStatsByTier,
    seasonLeagueStatsByTier: s.seasonLeagueStatsByTier,
    seasonLeagueStatsAvailable: s.seasonLeagueStatsAvailable,
    seasonCupStatsByCup: s.seasonCupStatsByCup,
    allTimeCupStatsByCup: s.allTimeCupStatsByCup,
    seasonCupStatsAvailable: s.seasonCupStatsAvailable,
    formation: s.formation,
    slotAssignments: s.slotAssignments,
    manualSlotIndices: s.manualSlotIndices,
    xiPresets: s.xiPresets,
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
    wonderkidTips: s.wonderkidTips,
    scoutRevealMeta: s.scoutRevealMeta,
    dossierBurns: s.dossierBurns,
    passiveRevealSignings: s.passiveRevealSignings,
    offersRejectedThisWindow: s.offersRejectedThisWindow,
    loyaltyWatch: s.loyaltyWatch,
    testimonialPlayer: s.testimonialPlayer,
    usedTicketTypes: s.usedTicketTypes,
    formationsWonWith: s.formationsWonWith,
    freeAgentSignings: s.freeAgentSignings,
    holidayMatchesThisSeason: s.holidayMatchesThisSeason,
    wonLeagueOnHoliday: s.wonLeagueOnHoliday,
    fastMatchesThisSeason: s.fastMatchesThisSeason,
    gkCleanSheets: s.gkCleanSheets,
    totalShortlisted: s.totalShortlisted,
    prevSeasonSquadIds: s.prevSeasonSquadIds,
    tradesMadeInWindow: s.tradesMadeInWindow,
    tradedWithClubs: s.tradedWithClubs,
    weeksSinceIdentityHeadline: s.weeksSinceIdentityHeadline,
    awardsHistory: s.awardsHistory,
    backPagesReceived: s.backPagesReceived,
    hatTrickHeadlinePlayers: s.hatTrickHeadlinePlayers,
    favouriteStarts: s.favouriteStarts,
    fanSentiment: s.fanSentiment, boardSentiment: s.boardSentiment,
    sentimentLog: s.sentimentLog,
    gameMode: s.gameMode,
    boardWarnCount: s.boardWarnCount,
    ultimatumActive: s.ultimatumActive,
    ultimatumTarget: s.ultimatumTarget,
    ultimatumPtsEarned: s.ultimatumPtsEarned,
    ultimatumGamesLeft: s.ultimatumGamesLeft,
    ultimatumCupPending: s.ultimatumCupPending,
    trainedThisWeek: s.trainedThisWeek,
    manualTrainingThisWeek: s.manualTrainingThisWeek,
    dynastyCupQualifiers: s.dynastyCupQualifiers,
    dynastyCupBracket: s.dynastyCupBracket,
    miniTournamentBracket: s.miniTournamentBracket,
    fiveASideSquad: s.fiveASideSquad,
    onboardingSilencedByChoice: s.onboardingSilencedByChoice,
    compareSignWatch: s.compareSignWatch,
    fanSentimentSeasonFloor: s.fanSentimentSeasonFloor,
    ultimatumsSurvived: s.ultimatumsSurvived,
    legendCarryCounts: s.legendCarryCounts,
  });
}
