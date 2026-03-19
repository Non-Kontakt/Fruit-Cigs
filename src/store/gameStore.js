import { create } from "zustand";
import { getLeagueMatchdaysPlayed } from "../utils/league.js";

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
    matchweekIndex: 0,
    // NOTE: squad, fanSentiment, boardSentiment, gameMode, activeProfileId,
    // ironmanSaveVersion, gameOver are intentionally preserved.
    // Prestige flow sets sentiment via partial carry-over formula, not hard reset.
  }),
}));
