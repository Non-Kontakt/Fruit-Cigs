import { create } from "zustand";
import { getLeagueMatchdaysPlayed } from "../utils/league.js";
import { DEFAULT_FORMATION } from "../data/formations.js";
import { initStoryArcs } from "../utils/arcs.js";

/**
 * Core game state store — replaces the useState + useRef mirror pattern.
 *
 * Usage in React components (subscribes to re-renders):
 *   const squad = useGameStore(s => s.squad);
 *
 * Usage in async callbacks, intervals, timeouts (always current, no stale closures):
 *   const { squad, league } = useGameStore.getState();
 *
 * Setters support both direct values and updater functions:
 *   useGameStore.getState().setSquad(newSquad);
 *   useGameStore.getState().setSquad(prev => prev.map(...));
 */
export const useGameStore = create((set, get) => ({
  // === Core game state ===
  squad: null,
  league: null,
  cup: null,
  calendarIndex: 0,
  seasonCalendar: null,

  // === Match / processing ===
  matchPending: false,
  processing: false,
  pendingSquad: null,
  isOnHoliday: false,

  // === Season / summer ===
  summerPhase: null,

  // === Sentiment ===
  fanSentiment: 50,
  boardSentiment: 50,

  // === Profile / game mode ===
  activeProfileId: null,
  gameMode: null, // "casual" | "ironman"
  gameOver: false,

  // === Sacking / ultimatum ===
  boardWarnCount: 0,
  ultimatumActive: false,
  ultimatumTarget: 0,
  ultimatumPtsEarned: 0,
  ultimatumGamesLeft: 0,
  ultimatumCupPending: false,

  // === Ironman integrity ===
  ironmanSaveVersion: 0,

  // === Tickets ===
  doubleTrainingWeek: false,
  twelfthManActive: false,
  youthCoupActive: false,
  testimonialPlayer: null,

  // === Tier-specific brackets ===
  dynastyCupBracket: null,
  miniTournamentBracket: null,

  // === Season progression ===
  seasonNumber: 1,
  leagueTier: 11,
  leagueWins: 0,
  prestigeLevel: 0,
  lastSeasonMove: null,

  // === Results ===
  calendarResults: {},
  leagueResults: {},

  // === Season statistics ===
  totalGains: 0,
  totalMatches: 0,
  seasonCleanSheets: 0,
  seasonGoalsFor: 0,
  seasonDraws: 0,
  seasonHomeUnbeaten: true,
  seasonAwayWins: 0,
  seasonAwayGames: 0,
  consecutiveUnbeaten: 0,
  consecutiveLosses: 0,
  consecutiveDraws: 0,
  consecutiveWins: 0,
  consecutiveScoreless: 0,

  // === Records / history ===
  halfwayPosition: null,
  recentScorelines: [],
  secondPlaceFinishes: 0,
  ovrHistory: [],
  clubHistory: {
    totalWins: 0, totalDraws: 0, totalLosses: 0,
    totalGoalsFor: 0, totalGoalsConceded: 0,
    bestWinStreak: 0, bestUnbeatenRun: 0, worstLossStreak: 0,
    biggestWin: null, worstDefeat: null, bestSeasonFinish: null, bestSeasonPoints: 0,
    playerCareers: {}, allTimeXI: {}, seasonArchive: [], cupHistory: [],
  },
  allTimeLeagueStats: { scorers: {}, assisters: {}, cards: {} },

  // === Squad composition ===
  startingXI: [],
  bench: [],
  formation: DEFAULT_FORMATION.map(s => ({ ...s })),
  slotAssignments: null,
  prevStartingXI: null,

  // === Player management ===
  trialPlayer: null,
  trialHistory: [],
  prodigalSon: null,
  retiringPlayers: new Set(),
  pendingFreeAgent: null,
  scoutedPlayers: {},

  // === Player tracking stats ===
  motmTracker: {},
  stScoredConsecutive: 0,
  playerRatingTracker: {},
  playerRatingNames: {},  // { [playerId]: playerName } — companion map for reverse lookup of traded players
  playerMatchLog: {},     // { [playerId]: Array<{ goals, assists, rating, motm, cleanSheet, cup, away, oppStrength, winningGoal, vsLeader, season, calendarIndex }> } — last 20 per player
  playerSeasonStats: {},
  beatenTeams: new Set(),
  playerInjuryCount: {},
  seasonInjuryLog: {},
  careerMilestones: {},
  benchStreaks: {},
  highScoringMatches: 0,
  trainedThisWeek: new Set(),
  lopsidedWarned: new Set(),

  // === Achievements / inbox / career tracking ===
  unlockedAchievements: new Set(),
  unlockedPacks: new Set(),
  achievementUnlockWeeks: {},
  lastSeenAchievementCount: 0,
  inboxMessages: [],
  usedTicketTypes: new Set(),
  formationsWonWith: new Set(),
  freeAgentSignings: 0,
  holidayMatchesThisSeason: 0,
  fastMatchesThisSeason: 0,
  gkCleanSheets: {},
  totalShortlisted: 0,
  prevSeasonSquadIds: null,
  tradesMadeInWindow: 0,
  tradedWithClubs: new Set(),
  seasonCards: 0,
  readsThisWeek: 0,

  // === Identity ===
  teamName: null,
  newspaperName: null,
  reporterName: null,

  // === Transfers & relationships ===
  clubRelationships: {},
  transferFocus: [],
  transferWindowOpen: false,
  transferWindowWeeksRemaining: 0,
  transferOffers: [],
  loanedOutPlayers: [],
  loanedInPlayers: [],
  transferHistory: [],
  pendingTradeTarget: null,
  shortlist: [],

  // === Tickets ===
  tickets: [],
  pendingTicketBoosts: [],

  // === Story arcs ===
  storyArcs: initStoryArcs(),
  arcStepQueue: [],

  // === Season/summer state ===
  summerData: null,
  leagueRosters: null,
  allLeagueStates: {},
  dynastyCupQualifiers: null,
  fiveASideSquad: null,

  // === Derived (kept in sync by setCalendarIndex) ===
  matchweekIndex: 0,

  // --- Setters ---
  // Each setter accepts a value or an updater function: set(val) or set(prev => newVal)

  setSquad: (val) => set(s => ({ squad: typeof val === "function" ? val(s.squad) : val })),
  setLeague: (val) => set(s => ({ league: typeof val === "function" ? val(s.league) : val })),
  setCup: (val) => set(s => ({ cup: typeof val === "function" ? val(s.cup) : val })),
  setCalendarIndex: (val) => set(s => {
    const next = typeof val === "function" ? val(s.calendarIndex) : val;
    return {
      calendarIndex: next,
      matchweekIndex: getLeagueMatchdaysPlayed(s.seasonCalendar, next),
    };
  }),
  setSeasonCalendar: (val) => set(s => {
    const next = typeof val === "function" ? val(s.seasonCalendar) : val;
    return {
      seasonCalendar: next,
      matchweekIndex: getLeagueMatchdaysPlayed(next, s.calendarIndex),
    };
  }),

  setMatchPending: (val) => set(s => ({ matchPending: typeof val === "function" ? val(s.matchPending) : val })),
  setProcessing: (val) => set(s => ({ processing: typeof val === "function" ? val(s.processing) : val })),
  setPendingSquad: (val) => set(s => ({ pendingSquad: typeof val === "function" ? val(s.pendingSquad) : val })),
  setIsOnHoliday: (val) => set({ isOnHoliday: val }),

  setSummerPhase: (val) => set({ summerPhase: val }),

  setFanSentiment: (val) => set(s => ({ fanSentiment: typeof val === "function" ? val(s.fanSentiment) : val })),
  setBoardSentiment: (val) => set(s => ({ boardSentiment: typeof val === "function" ? val(s.boardSentiment) : val })),

  setActiveProfileId: (val) => set({ activeProfileId: val }),
  setGameMode: (val) => set({ gameMode: val }),
  setGameOver: (val) => set({ gameOver: val }),

  setBoardWarnCount: (val) => set(s => ({ boardWarnCount: typeof val === "function" ? val(s.boardWarnCount) : val })),
  setUltimatumActive: (val) => set({ ultimatumActive: val }),
  setUltimatumTarget: (val) => set(s => ({ ultimatumTarget: typeof val === "function" ? val(s.ultimatumTarget) : val })),
  setUltimatumPtsEarned: (val) => set(s => ({ ultimatumPtsEarned: typeof val === "function" ? val(s.ultimatumPtsEarned) : val })),
  setUltimatumGamesLeft: (val) => set(s => ({ ultimatumGamesLeft: typeof val === "function" ? val(s.ultimatumGamesLeft) : val })),
  setUltimatumCupPending: (val) => set({ ultimatumCupPending: val }),

  setIronmanSaveVersion: (val) => set(s => ({ ironmanSaveVersion: typeof val === "function" ? val(s.ironmanSaveVersion) : val })),

  setDoubleTrainingWeek: (val) => set({ doubleTrainingWeek: val }),
  setTwelfthManActive: (val) => set({ twelfthManActive: val }),
  setYouthCoupActive: (val) => set({ youthCoupActive: val }),
  setTestimonialPlayer: (val) => set({ testimonialPlayer: val }),

  setDynastyCupBracket: (val) => set(s => ({ dynastyCupBracket: typeof val === "function" ? val(s.dynastyCupBracket) : val })),
  setMiniTournamentBracket: (val) => set(s => ({ miniTournamentBracket: typeof val === "function" ? val(s.miniTournamentBracket) : val })),

  setSeasonNumber: (val) => set(s => ({ seasonNumber: typeof val === "function" ? val(s.seasonNumber) : val })),
  setLeagueTier: (val) => set(s => ({ leagueTier: typeof val === "function" ? val(s.leagueTier) : val })),
  setLeagueWins: (val) => set(s => ({ leagueWins: typeof val === "function" ? val(s.leagueWins) : val })),
  setPrestigeLevel: (val) => set(s => ({ prestigeLevel: typeof val === "function" ? val(s.prestigeLevel) : val })),
  setLastSeasonMove: (val) => set({ lastSeasonMove: val }),

  setCalendarResults: (val) => set(s => ({ calendarResults: typeof val === "function" ? val(s.calendarResults) : val })),
  setLeagueResults: (val) => set(s => ({ leagueResults: typeof val === "function" ? val(s.leagueResults) : val })),

  setTotalGains: (val) => set(s => ({ totalGains: typeof val === "function" ? val(s.totalGains) : val })),
  setTotalMatches: (val) => set(s => ({ totalMatches: typeof val === "function" ? val(s.totalMatches) : val })),
  setSeasonCleanSheets: (val) => set(s => ({ seasonCleanSheets: typeof val === "function" ? val(s.seasonCleanSheets) : val })),
  setSeasonGoalsFor: (val) => set(s => ({ seasonGoalsFor: typeof val === "function" ? val(s.seasonGoalsFor) : val })),
  setSeasonDraws: (val) => set(s => ({ seasonDraws: typeof val === "function" ? val(s.seasonDraws) : val })),
  setSeasonHomeUnbeaten: (val) => set({ seasonHomeUnbeaten: val }),
  setSeasonAwayWins: (val) => set(s => ({ seasonAwayWins: typeof val === "function" ? val(s.seasonAwayWins) : val })),
  setSeasonAwayGames: (val) => set(s => ({ seasonAwayGames: typeof val === "function" ? val(s.seasonAwayGames) : val })),
  setConsecutiveUnbeaten: (val) => set(s => ({ consecutiveUnbeaten: typeof val === "function" ? val(s.consecutiveUnbeaten) : val })),
  setConsecutiveLosses: (val) => set(s => ({ consecutiveLosses: typeof val === "function" ? val(s.consecutiveLosses) : val })),
  setConsecutiveDraws: (val) => set(s => ({ consecutiveDraws: typeof val === "function" ? val(s.consecutiveDraws) : val })),
  setConsecutiveWins: (val) => set(s => ({ consecutiveWins: typeof val === "function" ? val(s.consecutiveWins) : val })),
  setConsecutiveScoreless: (val) => set(s => ({ consecutiveScoreless: typeof val === "function" ? val(s.consecutiveScoreless) : val })),

  setHalfwayPosition: (val) => set({ halfwayPosition: val }),
  setRecentScorelines: (val) => set(s => ({ recentScorelines: typeof val === "function" ? val(s.recentScorelines) : val })),
  setSecondPlaceFinishes: (val) => set(s => ({ secondPlaceFinishes: typeof val === "function" ? val(s.secondPlaceFinishes) : val })),
  setOvrHistory: (val) => set(s => ({ ovrHistory: typeof val === "function" ? val(s.ovrHistory) : val })),
  setClubHistory: (val) => set(s => ({ clubHistory: typeof val === "function" ? val(s.clubHistory) : val })),
  setAllTimeLeagueStats: (val) => set(s => ({ allTimeLeagueStats: typeof val === "function" ? val(s.allTimeLeagueStats) : val })),

  setStartingXI: (val) => set(s => ({ startingXI: typeof val === "function" ? val(s.startingXI) : val })),
  setBench: (val) => set(s => ({ bench: typeof val === "function" ? val(s.bench) : val })),
  setFormation: (val) => set(s => ({ formation: typeof val === "function" ? val(s.formation) : val })),
  setSlotAssignments: (val) => set(s => ({ slotAssignments: typeof val === "function" ? val(s.slotAssignments) : val })),
  setPrevStartingXI: (val) => set(s => ({ prevStartingXI: typeof val === "function" ? val(s.prevStartingXI) : val })),

  setTrialPlayer: (val) => set(s => ({ trialPlayer: typeof val === "function" ? val(s.trialPlayer) : val })),
  setTrialHistory: (val) => set(s => ({ trialHistory: typeof val === "function" ? val(s.trialHistory) : val })),
  setProdigalSon: (val) => set(s => ({ prodigalSon: typeof val === "function" ? val(s.prodigalSon) : val })),
  setRetiringPlayers: (val) => set(s => ({ retiringPlayers: typeof val === "function" ? val(s.retiringPlayers) : val })),
  setPendingFreeAgent: (val) => set(s => ({ pendingFreeAgent: typeof val === "function" ? val(s.pendingFreeAgent) : val })),
  setScoutedPlayers: (val) => set(s => ({ scoutedPlayers: typeof val === "function" ? val(s.scoutedPlayers) : val })),

  setMotmTracker: (val) => set(s => ({ motmTracker: typeof val === "function" ? val(s.motmTracker) : val })),
  setStScoredConsecutive: (val) => set(s => ({ stScoredConsecutive: typeof val === "function" ? val(s.stScoredConsecutive) : val })),
  setPlayerRatingTracker: (val) => set(s => ({ playerRatingTracker: typeof val === "function" ? val(s.playerRatingTracker) : val })),
  setPlayerRatingNames: (val) => set(s => ({ playerRatingNames: typeof val === "function" ? val(s.playerRatingNames) : val })),
  setPlayerMatchLog: (val) => set(s => ({ playerMatchLog: typeof val === "function" ? val(s.playerMatchLog) : val })),
  setPlayerSeasonStats: (val) => set(s => ({ playerSeasonStats: typeof val === "function" ? val(s.playerSeasonStats) : val })),
  setBeatenTeams: (val) => set(s => ({ beatenTeams: typeof val === "function" ? val(s.beatenTeams) : val })),
  setPlayerInjuryCount: (val) => set(s => ({ playerInjuryCount: typeof val === "function" ? val(s.playerInjuryCount) : val })),
  setSeasonInjuryLog: (val) => set(s => ({ seasonInjuryLog: typeof val === "function" ? val(s.seasonInjuryLog) : val })),
  setCareerMilestones: (val) => set(s => ({ careerMilestones: typeof val === "function" ? val(s.careerMilestones) : val })),
  setBenchStreaks: (val) => set(s => ({ benchStreaks: typeof val === "function" ? val(s.benchStreaks) : val })),
  setHighScoringMatches: (val) => set(s => ({ highScoringMatches: typeof val === "function" ? val(s.highScoringMatches) : val })),
  setTrainedThisWeek: (val) => set(s => ({ trainedThisWeek: typeof val === "function" ? val(s.trainedThisWeek) : val })),
  setLopsidedWarned: (val) => set(s => ({ lopsidedWarned: typeof val === "function" ? val(s.lopsidedWarned) : val })),

  setUnlockedAchievements: (val) => set(s => ({ unlockedAchievements: typeof val === "function" ? val(s.unlockedAchievements) : val })),
  setUnlockedPacks: (val) => set(s => ({ unlockedPacks: typeof val === "function" ? val(s.unlockedPacks) : val })),
  setAchievementUnlockWeeks: (val) => set(s => ({ achievementUnlockWeeks: typeof val === "function" ? val(s.achievementUnlockWeeks) : val })),
  setLastSeenAchievementCount: (val) => set({ lastSeenAchievementCount: val }),
  setInboxMessages: (val) => set(s => ({ inboxMessages: typeof val === "function" ? val(s.inboxMessages) : val })),
  setUsedTicketTypes: (val) => set(s => ({ usedTicketTypes: typeof val === "function" ? val(s.usedTicketTypes) : val })),
  setFormationsWonWith: (val) => set(s => ({ formationsWonWith: typeof val === "function" ? val(s.formationsWonWith) : val })),
  setFreeAgentSignings: (val) => set(s => ({ freeAgentSignings: typeof val === "function" ? val(s.freeAgentSignings) : val })),
  setHolidayMatchesThisSeason: (val) => set(s => ({ holidayMatchesThisSeason: typeof val === "function" ? val(s.holidayMatchesThisSeason) : val })),
  setFastMatchesThisSeason: (val) => set(s => ({ fastMatchesThisSeason: typeof val === "function" ? val(s.fastMatchesThisSeason) : val })),
  setGkCleanSheets: (val) => set(s => ({ gkCleanSheets: typeof val === "function" ? val(s.gkCleanSheets) : val })),
  setTotalShortlisted: (val) => set(s => ({ totalShortlisted: typeof val === "function" ? val(s.totalShortlisted) : val })),
  setPrevSeasonSquadIds: (val) => set(s => ({ prevSeasonSquadIds: typeof val === "function" ? val(s.prevSeasonSquadIds) : val })),
  setTradesMadeInWindow: (val) => set(s => ({ tradesMadeInWindow: typeof val === "function" ? val(s.tradesMadeInWindow) : val })),
  setTradedWithClubs: (val) => set(s => ({ tradedWithClubs: typeof val === "function" ? val(s.tradedWithClubs) : val })),
  setSeasonCards: (val) => set(s => ({ seasonCards: typeof val === "function" ? val(s.seasonCards) : val })),
  setReadsThisWeek: (val) => set(s => ({ readsThisWeek: typeof val === "function" ? val(s.readsThisWeek) : val })),

  setTeamName: (val) => set(s => ({ teamName: typeof val === "function" ? val(s.teamName) : val })),
  setNewspaperName: (val) => set(s => ({ newspaperName: typeof val === "function" ? val(s.newspaperName) : val })),
  setReporterName: (val) => set(s => ({ reporterName: typeof val === "function" ? val(s.reporterName) : val })),

  setClubRelationships: (val) => set(s => ({ clubRelationships: typeof val === "function" ? val(s.clubRelationships) : val })),
  setTransferFocus: (val) => set(s => ({ transferFocus: typeof val === "function" ? val(s.transferFocus) : val })),
  setTransferWindowOpen: (val) => set({ transferWindowOpen: val }),
  setTransferWindowWeeksRemaining: (val) => set(s => ({ transferWindowWeeksRemaining: typeof val === "function" ? val(s.transferWindowWeeksRemaining) : val })),
  setTransferOffers: (val) => set(s => ({ transferOffers: typeof val === "function" ? val(s.transferOffers) : val })),
  setLoanedOutPlayers: (val) => set(s => ({ loanedOutPlayers: typeof val === "function" ? val(s.loanedOutPlayers) : val })),
  setLoanedInPlayers: (val) => set(s => ({ loanedInPlayers: typeof val === "function" ? val(s.loanedInPlayers) : val })),
  setTransferHistory: (val) => set(s => ({ transferHistory: typeof val === "function" ? val(s.transferHistory) : val })),
  setPendingTradeTarget: (val) => set({ pendingTradeTarget: val }),
  setShortlist: (val) => set(s => ({ shortlist: typeof val === "function" ? val(s.shortlist) : val })),

  setTickets: (val) => set(s => ({ tickets: typeof val === "function" ? val(s.tickets) : val })),
  setPendingTicketBoosts: (val) => set(s => ({ pendingTicketBoosts: typeof val === "function" ? val(s.pendingTicketBoosts) : val })),

  setStoryArcs: (val) => set(s => ({ storyArcs: typeof val === "function" ? val(s.storyArcs) : val })),
  setArcStepQueue: (val) => set(s => ({ arcStepQueue: typeof val === "function" ? val(s.arcStepQueue) : val })),

  setSummerData: (val) => set(s => ({ summerData: typeof val === "function" ? val(s.summerData) : val })),
  setLeagueRosters: (val) => set(s => ({ leagueRosters: typeof val === "function" ? val(s.leagueRosters) : val })),
  setAllLeagueStates: (val) => set(s => ({ allLeagueStates: typeof val === "function" ? val(s.allLeagueStates) : val })),
  setDynastyCupQualifiers: (val) => set(s => ({ dynastyCupQualifiers: typeof val === "function" ? val(s.dynastyCupQualifiers) : val })),
  setFiveASideSquad: (val) => set(s => ({ fiveASideSquad: typeof val === "function" ? val(s.fiveASideSquad) : val })),

  // === Bulk operations ===

  /** Full reset — return to main menu or start a brand new game. Clears everything. */
  resetToMenu: () => set({
    squad: null,
    league: null,
    cup: null,
    calendarIndex: 0,
    seasonCalendar: null,
    matchPending: false,
    processing: false,
    pendingSquad: null,
    isOnHoliday: false,
    summerPhase: null,
    fanSentiment: 50,
    boardSentiment: 50,
    activeProfileId: null,
    gameMode: null,
    gameOver: false,
    boardWarnCount: 0,
    ultimatumActive: false,
    ultimatumTarget: 0,
    ultimatumPtsEarned: 0,
    ultimatumGamesLeft: 0,
    ultimatumCupPending: false,
    ironmanSaveVersion: 0,
    doubleTrainingWeek: false,
    twelfthManActive: false,
    youthCoupActive: false,
    testimonialPlayer: null,
    dynastyCupBracket: null,
    miniTournamentBracket: null,
    seasonNumber: 1,
    leagueTier: 11,
    leagueWins: 0,
    prestigeLevel: 0,
    lastSeasonMove: null,
    calendarResults: {},
    leagueResults: {},
    totalGains: 0,
    totalMatches: 0,
    seasonCleanSheets: 0,
    seasonGoalsFor: 0,
    seasonDraws: 0,
    seasonHomeUnbeaten: true,
    seasonAwayWins: 0,
    seasonAwayGames: 0,
    consecutiveUnbeaten: 0,
    consecutiveLosses: 0,
    consecutiveDraws: 0,
    consecutiveWins: 0,
    consecutiveScoreless: 0,
    halfwayPosition: null,
    recentScorelines: [],
    secondPlaceFinishes: 0,
    ovrHistory: [],
    clubHistory: {
      totalWins: 0, totalDraws: 0, totalLosses: 0,
      totalGoalsFor: 0, totalGoalsConceded: 0,
      bestWinStreak: 0, bestUnbeatenRun: 0, worstLossStreak: 0,
      biggestWin: null, worstDefeat: null, bestSeasonFinish: null, bestSeasonPoints: 0,
      playerCareers: {}, allTimeXI: {}, seasonArchive: [], cupHistory: [],
    },
    allTimeLeagueStats: { scorers: {}, assisters: {}, cards: {} },
    startingXI: [],
    bench: [],
    formation: DEFAULT_FORMATION.map(s => ({ ...s })),
    slotAssignments: null,
    prevStartingXI: null,
    trialPlayer: null,
    trialHistory: [],
    prodigalSon: null,
    retiringPlayers: new Set(),
    pendingFreeAgent: null,
    scoutedPlayers: {},
    motmTracker: {},
    stScoredConsecutive: 0,
    playerRatingTracker: {},
    playerRatingNames: {},
    playerMatchLog: {},
    playerSeasonStats: {},
    beatenTeams: new Set(),
    playerInjuryCount: {},
    seasonInjuryLog: {},
    careerMilestones: {},
    benchStreaks: {},
    highScoringMatches: 0,
    trainedThisWeek: new Set(),
    lopsidedWarned: new Set(),
    unlockedAchievements: new Set(),
    unlockedPacks: new Set(),
    achievementUnlockWeeks: {},
    lastSeenAchievementCount: 0,
    inboxMessages: [],
    usedTicketTypes: new Set(),
    formationsWonWith: new Set(),
    freeAgentSignings: 0,
    holidayMatchesThisSeason: 0,
    fastMatchesThisSeason: 0,
    gkCleanSheets: {},
    totalShortlisted: 0,
    prevSeasonSquadIds: null,
    tradesMadeInWindow: 0,
    tradedWithClubs: new Set(),
    seasonCards: 0,
    readsThisWeek: 0,
    teamName: null,
    newspaperName: null,
    reporterName: null,
    clubRelationships: {},
    transferFocus: [],
    transferWindowOpen: false,
    transferWindowWeeksRemaining: 0,
    transferOffers: [],
    loanedOutPlayers: [],
    loanedInPlayers: [],
    transferHistory: [],
    pendingTradeTarget: null,
    shortlist: [],
    tickets: [],
    pendingTicketBoosts: [],
    storyArcs: initStoryArcs(),
    arcStepQueue: [],
    summerData: null,
    leagueRosters: null,
    allLeagueStates: {},
    dynastyCupQualifiers: null,
    fiveASideSquad: null,
    matchweekIndex: 0,
  }),

  /** Seasonal reset — new season or new-game-from-slot. Preserves profile/mode, resets gameplay. */
  resetForNewSeason: () => set({
    league: null,
    cup: null,
    calendarIndex: 0,
    seasonCalendar: null,
    matchPending: false,
    processing: false,
    pendingSquad: null,
    isOnHoliday: false,
    summerPhase: null,
    boardWarnCount: 0,
    ultimatumActive: false,
    ultimatumTarget: 0,
    ultimatumPtsEarned: 0,
    ultimatumGamesLeft: 0,
    ultimatumCupPending: false,
    doubleTrainingWeek: false,
    twelfthManActive: false,
    youthCoupActive: false,
    testimonialPlayer: null,
    dynastyCupBracket: null,
    miniTournamentBracket: null,
    lastSeasonMove: null,
    calendarResults: {},
    leagueResults: {},
    seasonCleanSheets: 0,
    seasonGoalsFor: 0,
    seasonDraws: 0,
    seasonHomeUnbeaten: true,
    seasonAwayWins: 0,
    seasonAwayGames: 0,
    consecutiveUnbeaten: 0,
    consecutiveLosses: 0,
    consecutiveDraws: 0,
    consecutiveWins: 0,
    consecutiveScoreless: 0,
    halfwayPosition: null,
    startingXI: [],
    bench: [],
    slotAssignments: null,
    prevStartingXI: null,
    trialPlayer: null,
    prodigalSon: null,
    retiringPlayers: new Set(),
    pendingFreeAgent: null,
    scoutedPlayers: {},
    motmTracker: {},
    stScoredConsecutive: 0,
    playerRatingTracker: {},
    playerRatingNames: {},
    playerSeasonStats: {},
    beatenTeams: new Set(),
    playerInjuryCount: {},
    seasonInjuryLog: {},
    benchStreaks: {},
    highScoringMatches: 0,
    trainedThisWeek: new Set(),
    lopsidedWarned: new Set(),
    formationsWonWith: new Set(),
    holidayMatchesThisSeason: 0,
    fastMatchesThisSeason: 0,
    gkCleanSheets: {},
    seasonCards: 0,
    readsThisWeek: 0,
    pendingTradeTarget: null,
    arcStepQueue: [],
    summerData: null,
    dynastyCupQualifiers: null,
    fiveASideSquad: null,
    matchweekIndex: 0,
    // NOTE: seasonNumber, leagueTier, leagueWins, prestigeLevel, totalGains, totalMatches, secondPlaceFinishes, ovrHistory, clubHistory, allTimeLeagueStats, recentScorelines, formation are intentionally preserved.
    // NOTE: trialHistory, careerMilestones are career-spanning and intentionally preserved.
    // NOTE: squad, fanSentiment, boardSentiment, gameMode, activeProfileId,
    // ironmanSaveVersion, gameOver are intentionally preserved.
    // NOTE: unlockedAchievements, achievementUnlockWeeks, inboxMessages, usedTicketTypes, freeAgentSignings, totalShortlisted, tradesMadeInWindow, tradedWithClubs, prevSeasonSquadIds are intentionally preserved.
    // NOTE: clubRelationships, transferFocus, transferWindowOpen, transferWindowWeeksRemaining, transferOffers, loanedOutPlayers, loanedInPlayers, transferHistory, shortlist, tickets, pendingTicketBoosts, storyArcs, leagueRosters, allLeagueStates, teamName, newspaperName, reporterName are intentionally preserved.
    // Prestige flow sets sentiment via partial carry-over formula, not hard reset.
  }),
}));
