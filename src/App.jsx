import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { STARTING_XI_POSITIONS, POSITION_TYPES, POS_GROUP, POSITION_ORDER, POS_COLORS, ALL_POSITIONS, SUB_COLOR, TOTAL_SLOTS } from "./data/positions.js";
import { ATTRIBUTES, TRAINING_FOCUSES, TRAINING_INJURIES } from "./data/training.js";
import { FORMATION_PRESETS, DEFAULT_FORMATION } from "./data/formations.js";
import { NATIONALITIES, NATION_NAMES, FIRST_NAMES, LAST_NAMES } from "./data/nationalities.js";
import { CUP_ROUND_MATCHWEEKS, CUP_ROUND_NAMES, CUP_DEFS } from "./data/cups.js";
import { TIER_WIN_ACHS, ACHIEVEMENTS, LEGENDARY_ACHIEVEMENTS, PRESTIGIOUS_ACHIEVEMENTS, PLAYER_UNLOCK_ACHIEVEMENTS, UNLOCKABLE_PLAYERS } from "./data/achievements.js";
import { LEAGUE_DEFS, NUM_TIERS, TEAM_TRAITS, AI_BENCH_POSITIONS } from "./data/leagues.js";
import { ARC_TICKET_POOL, ARC_CATS, ARC_CAT_LABELS, STORY_ARCS, ARC_NARRATIVES } from "./data/storyArcs.js";
import { F, C, FONT, BTN, MODAL, CARD, Z } from "./data/tokens";
import { TICKET_DEFS } from "./data/tickets.js";
import { getModifier } from "./data/leagueModifiers.js";
import { rand, getOverall, getAttrColor, getPosColor, progressToPips, getTrainingProgress, getOOPPenalty, getPositionTrainingWeeks } from "./utils/calc.js";
import { detectFormationName, assignPlayersToSlots, getFormationPositions, getEffectiveSlots, getTeamOOPMultiplier } from "./utils/formation.js";
import { pickNationality, pickAINationality, generateNameForNation, getNatFlag, getNatLabel, inferNationality, generatePlayer, generateSquad, generatePrestigeSquad, autoSelectXI, autoSelectBench, generateAITeam, checkRetirements, generateYouthPlayer, generateYouthIntake, generateTrialPlayer, generateProdigalPlayer, evolveAISquad, generateSquadPhilosophy, generateFreeAgent, getOvrCap } from "./utils/player.js";
import { getArcById, getArcsForCat, getValidTargets, checkArcCond, applyArcFx, applyFinalReward, processArcCompletion, precomputeArcEffects, initStoryArcs, getStepNarrative, getFocusNarrative, resolveSeasonEndArcs } from "./utils/arcs.js";
import { getTeamStrength, generateFixtures, simulateMatch, generatePenaltyShootout, simulateMatchweek } from "./utils/match.js";
import { initLeagueRosters, normalizeRosters, sortStandings, collectSeasonEndAchievements, processSeasonSwaps, initLeague, initAILeague, buildSeasonCalendar, computeCalendarIndex, getLeagueMatchdaysPlayed, getCupForTier, initCup, advanceCupRound, buildNextCupRound } from "./utils/league.js";
import { SFX, BGM, BGM_TRACKS } from "./utils/sfx.js";
import * as Tone from "tone";
import { useSettings } from "./hooks/useSettings.js";
import { useTickets } from "./hooks/useTickets.js";
import { useDebug } from "./hooks/useDebug.js";
import { useSaveGame } from "./hooks/useSaveGame.js";
import { Sparkline } from "./components/charts/Sparkline.jsx";
import { PixelDissolveCard } from "./components/ui/PixelDissolveCard.jsx";
import { AnimatedPips } from "./components/ui/AnimatedPips.jsx";
import { LevelUpPips } from "./components/ui/LevelUpPips.jsx";
import { OvrLevelUpCelebration } from "./components/ui/OvrLevelUpCelebration.jsx";
import { HolidayOverlay } from "./components/ui/HolidayOverlay.jsx";
import { WeekTransitionOverlay } from "./components/ui/WeekTransitionOverlay.jsx";
import { GainPopup } from "./components/gains/GainPopup.jsx";
import { MysteryCard } from "./components/gains/MysteryCard.jsx";
import { MatchResultScreen } from "./components/match/MatchResultScreen.jsx";
import { ArcStepModal } from "./components/arcs/ArcStepModal.jsx";
import { StoryArcsPanel } from "./components/arcs/StoryArcsPanel.jsx";
import { BootRoom } from "./components/boot/BootRoom.jsx";
import { CupPage } from "./components/cup/CupPage.jsx";
import { TransfersPage } from "./components/transfer/TransfersPage.jsx";
import { CHART_COLORS, OvrProgressChart, OvrChart } from "./components/charts/OvrCharts.jsx";
import { ClubLegends } from "./components/club/ClubLegends.jsx";
import { LeaguePage } from "./components/league/LeaguePage.jsx";
import { AITeamPanel } from "./components/league/AITeamPanel.jsx";
import { createUnlockablePlayer, checkAchievements } from "./utils/achievements.js";
import { generateAITransferOffers, calculateLoanReturn } from "./utils/transfer.js";
import { isMessageVisible } from "./utils/messageUtils.js";
import { AchievementToast } from "./components/achievements/AchievementToast.jsx";
import { YouthIntakeScreen } from "./components/season/YouthIntakeScreen.jsx";
import { SeasonEndReveal } from "./components/season/SeasonEndReveal.jsx";
import { PrestigeScreen } from "./components/season/PrestigeScreen.jsx";
import { LegendSelectionScreen } from "./components/season/LegendSelectionScreen.jsx";
import { PlayerUnlockReveal } from "./components/season/PlayerUnlockReveal.jsx";
import { AchievementCabinet } from "./components/achievements/AchievementCabinet.jsx";
import { PlayerPanel } from "./components/player/PlayerPanel.jsx";
import { TacticsPanel } from "./components/player/TacticsPanel.jsx";
import { Dashboard } from "./components/ui/Dashboard.jsx";
import { ProfileSelectScreen } from "./components/ui/ProfileSelectScreen.jsx";
import { ModeSelectScreen } from "./components/ui/ModeSelectScreen.jsx";
import { SackingScreen } from "./components/ui/SackingScreen.jsx";
import { MuseumScreen } from "./components/ui/MuseumScreen.jsx";
import { buildAIFiveASide } from "./components/match/FiveASidePicker.jsx";
import { listProfiles, createProfile, readProfile, scanProfileSlots, getSaveKey, unlockAchievementToProfile, updateProfileIronmanVersion, syncProfileIronmanVersion, archiveCareerToMuseum, checkIronmanIntegrity, deleteMuseumEntry } from "./utils/profile.js";
import { useGameStore } from "./store/gameStore.js";

// Storage polyfill: use window.storage (Claude artifacts) or fall back to localStorage
if (!window.storage) {
  window.storage = {
    async get(key) {
      const val = localStorage.getItem(key);
      return val !== null ? { key, value: val } : null;
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true };
    },
    async list(prefix) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!prefix || k.startsWith(prefix)) keys.push(k);
      }
      return { keys };
    },
  };
}

// SFX + BGM → src/utils/sfx.js
// ==================== MATCH RESULT SCREEN ====================

// MatchResultScreen → src/components/match/MatchResultScreen.jsx
// ArcStepModal → src/components/arcs/ArcStepModal.jsx
// StoryArcsPanel → src/components/arcs/StoryArcsPanel.jsx
// BootRoom → src/components/boot/BootRoom.jsx
// CupPage → src/components/cup/CupPage.jsx
// CHART_COLORS, OvrProgressChart, OvrChart → src/components/charts/OvrCharts.jsx
// ClubLegends → src/components/club/ClubLegends.jsx
// LeaguePage → src/components/league/LeaguePage.jsx
// createUnlockablePlayer + checkAchievements → src/utils/achievements.js
// AchievementToast → src/components/achievements/AchievementToast.jsx
// YouthIntakeScreen → src/components/season/YouthIntakeScreen.jsx
// SeasonEndReveal → src/components/season/SeasonEndReveal.jsx
// PlayerUnlockReveal → src/components/season/PlayerUnlockReveal.jsx
// AchievementCabinet → src/components/achievements/AchievementCabinet.jsx
// PlayerPanel → src/components/player/PlayerPanel.jsx
// TacticsPanel → src/components/player/TacticsPanel.jsx
const NEWSPAPER_TEMPLATES = [
  name => `The ${name} Gazette`,
  name => `The ${name} Herald`,
  name => `The ${name} Tribune`,
  name => `The ${name} Chronicle`,
  name => `The ${name} Observer`,
  name => `The ${name} Post`,
  name => `The ${name} Times`,
  name => `The ${name} Echo`,
  name => `The ${name} Standard`,
  name => `The ${name} Dispatch`,
  name => `The ${name} Star`,
  name => `The ${name} Mercury`,
  name => `The ${name} Sentinel`,
  name => `The ${name} Express`,
  name => `The Daily ${name}`,
  name => `The ${name} Courier`,
  name => `${name} Evening News`,
];
const REPORTER_FIRST = ["Barry","Colin","Keith","Derek","Malcolm","Terry","Graham","Nigel","Clive","Trevor","Maurice","Dennis","Gordon","Stanley","Frank","Arthur","Les","Norman","Brian","Geoff"];
const REPORTER_LAST = ["Finch","Partridge","Whittle","Platt","Skinner","Baines","Trotter","Coppell","Duckworth","Bramley","Stokes","Rowntree","Clegg","Hargreaves","Nuttall","Fenton","Craven","Dobson","Pilling","Seddon"];
function generateReporterName() {
  return `${REPORTER_FIRST[Math.floor(Math.random() * REPORTER_FIRST.length)]} ${REPORTER_LAST[Math.floor(Math.random() * REPORTER_LAST.length)]}`;
}
function generateNewspaperName(teamName) {
  // For multi-word names, pick one word to keep it punchy
  const words = teamName.trim().split(/\s+/);
  const short = words.length >= 2
    ? words[Math.floor(Math.random() * words.length)]
    : teamName;
  const tpl = NEWSPAPER_TEMPLATES[Math.floor(Math.random() * NEWSPAPER_TEMPLATES.length)];
  return tpl(short);
}
function FootballManager() {
  const [teamName, setTeamName] = useState(null);
  const [newspaperName, setNewspaperName] = useState(null);
  const [reporterName, setReporterName] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [initialSquad] = useState(() => {
    const sq = generateSquad().map(p => ({ ...p, seasonStartOvr: getOverall(p) }));
    useGameStore.getState().setSquad(sq);
    return sq;
  });
  // --- Zustand store: core 6 states (replaces useState + useRef mirrors) ---
  const squad = useGameStore(s => s.squad);
  const week = useGameStore(s => s.week);
  const {
    setSquad, setWeek, setLeague, setCup, setMatchPending, setProcessing,
    setPendingSquad, setIsOnHoliday, setCalendarIndex, setSeasonCalendar,
    setSummerPhase, setFanSentiment, setBoardSentiment,
    setActiveProfileId, setGameMode, setGameOver,
    setBoardWarnCount, setUltimatumActive, setUltimatumTarget,
    setUltimatumPtsEarned, setUltimatumGamesLeft, setUltimatumCupPending,
    setIronmanSaveVersion, setDoubleTrainingWeek, setTwelfthManActive,
    setYouthCoupActive, setTestimonialPlayer,
    setDynastyCupBracket, setMiniTournamentBracket,
  } = useMemo(() => useGameStore.getState(), []);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [viewingTeamGlobal, setViewingTeamGlobal] = useState(null); // { team, tableRow, seasonGoals, seasonAssists } — global AITeamPanel
  const [swapTarget, setSwapTarget] = useState(null); // injured player being swapped out
  const [gains, setGains] = useState(null);
  const pendingSquad = useGameStore(s => s.pendingSquad);

  const pendingLeagueRef = useRef(null); // deferred league table update until match result dismissed
  const cardedPlayerIdsRef = useRef(new Set()); // Tier 8: carded players skip next training
  const [dynastyCupQualifiers, setDynastyCupQualifiers] = useState(null); // Tier 3: top 4 at halfway for end-of-season knockout
  const dynastyCupBracket = useGameStore(s => s.dynastyCupBracket);
  const miniTournamentBracket = useGameStore(s => s.miniTournamentBracket);
  const [fiveASideSquad, setFiveASideSquad] = useState(null); // Tier 2: player's 5v5 squad selection [5 player IDs]
  // showFiveASidePicker removed — squad page panel handles 5v5 selection
  const aiPredictionRef = useRef(null); // Tier 1: AI predicted scoreline for current match
  const pendingTrialAction = useRef(null); // deferred trial processing after gains popup
  const holidayTargetRef = useRef(null); // Tracks target matchweek for Go on Holiday feature
  const holidayIntervalRef = useRef(null); // Interval ID for auto-advance
  const isOnHoliday = useGameStore(s => s.isOnHoliday);
  const holidayStartMatchweekRef = useRef(null); // Track starting matchweek
  const holidayWeeksWithoutMatchRef = useRef(0); // Safety counter
  const [ovrLevelUps, setOvrLevelUps] = useState(null); // [{ name, position, oldOvr, newOvr }]
  const [recentOvrLevelUps, setRecentOvrLevelUps] = useState(null); // persists until next advance week
  const [ovrHistory, setOvrHistory] = useState([]); // [{ w: week, s: season, p: { "Name|Pos": ovr } }]
  const [storyArcs, setStoryArcs] = useState(initStoryArcs());
  const [arcStepQueue, setArcStepQueue] = useState([]); // [{ arcId, stepIdx, type, desc, gains }]
  const processing = useGameStore(s => s.processing);
  const [weekTransition, setWeekTransition] = useState(false);
  const league = useGameStore(s => s.league);
  const [matchResult, setMatchResult] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [showTransfers, setShowTransfers] = useState(false);
  const [clubRelationships, setClubRelationships] = useState({}); // { [teamName]: { pct, tier } }
  const [transferFocus, setTransferFocus] = useState([]); // array of up to 2 team names
  const [transferWindowOpen, setTransferWindowOpen] = useState(false);
  const [transferWindowWeeksRemaining, setTransferWindowWeeksRemaining] = useState(0);
  const [transferOffers, setTransferOffers] = useState([]); // AI-initiated trade proposals
  const [loanedOutPlayers, setLoanedOutPlayers] = useState([]); // [{player, club, returnSeason, ovrDelta, potDelta}]
  const [loanedInPlayers, setLoanedInPlayers] = useState([]); // [{player, parentClub, returnSeason}]
  const [transferHistory, setTransferHistory] = useState([]); // Log of completed deals
  const [pendingTradeTarget, setPendingTradeTarget] = useState(null); // player to open trade for when navigating to transfers
  const [shortlist, setShortlist] = useState([]); // Bookmarked players for scouting
  const [tickets, setTickets] = useState([]); // Consumable power-up tickets
  const [pendingTicketBoosts, setPendingTicketBoosts] = useState([]); // Ticket boosts to show in next training report
  const doubleTrainingWeek = useGameStore(s => s.doubleTrainingWeek);
  const twelfthManActive = useGameStore(s => s.twelfthManActive);
  const youthCoupActive = useGameStore(s => s.youthCoupActive);
  const [pendingFreeAgent, setPendingFreeAgent] = useState(null);
  const [scoutedPlayers, setScoutedPlayers] = useState({});
  const testimonialPlayer = useGameStore(s => s.testimonialPlayer);
  // Achievement tracking state
  const [usedTicketTypes, setUsedTicketTypes] = useState(new Set());
  const [formationsWonWith, setFormationsWonWith] = useState(new Set());
  const [freeAgentSignings, setFreeAgentSignings] = useState(0);
  const [holidayMatchesThisSeason, setHolidayMatchesThisSeason] = useState(0);
  const [fastMatchesThisSeason, setFastMatchesThisSeason] = useState(0);
  const [gkCleanSheets, setGkCleanSheets] = useState({}); // { playerName: count }
  const [totalShortlisted, setTotalShortlisted] = useState(0); // lifetime shortlist additions
  const [prevSeasonSquadIds, setPrevSeasonSquadIds] = useState(null); // player IDs from last season
  const [tradesMadeInWindow, setTradesMadeInWindow] = useState(0); // trades in current transfer window
  const [tradedWithClubs, setTradedWithClubs] = useState(new Set()); // clubs traded with (for Old Boys Network)
  const [startingXI, setStartingXI] = useState([]);
  const [showLineupWarning, setShowLineupWarning] = useState(null); // null | "advance" | "match"
  const [bench, setBench] = useState([]);
  const [dragPlayer, setDragPlayer] = useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement("meta");
      meta.name = "viewport";
      meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
      document.head.appendChild(meta);
    }
  }, []);
  const [selectedForMove, setSelectedForMove] = useState(null); // mobile tap-to-move
  const [unlockedAchievements, setUnlockedAchievements] = useState(new Set());
  const [achievementQueue, setAchievementQueue] = useState([]);
  const achievementToastKeyRef = useRef(0);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showLegends, setShowLegends] = useState(false);
  const [seasonCards, setSeasonCards] = useState(0);
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [leagueWins, setLeagueWins] = useState(0);
  const [leagueTier, setLeagueTier] = useState(NUM_TIERS); // 1=Intergalactic Elite ... 11=Sunday League
  const [prestigeLevel, setPrestigeLevel] = useState(0); // 0=first playthrough, 1-5=prestige runs
  const ovrCap = useMemo(() => getOvrCap(prestigeLevel), [prestigeLevel]);
  const [seasonEndInfo, setSeasonEndInfo] = useState(null); // { type: "promoted"|"relegated"|"stayed", fromTier, toTier, position }
  const [lastSeasonMove, setLastSeasonMove] = useState(null);
  const [retiringPlayers, setRetiringPlayers] = useState(new Set()); // player IDs retiring at end of season
  const [youthIntake, setYouthIntake] = useState(null);
  // cup, calendarIndex, and seasonCalendar each keep a ref in sync with state.
  // Async match/cup callbacks read the ref (.current) to avoid stale closures —
  // the ref is always up to date even if the closure was formed before the last render.
  const cup = useGameStore(s => s.cup);
  const [showCup, setShowCup] = useState(false);
  const [cupMatchResult, setCupMatchResult] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSquad, setShowSquad] = useState(false);
  const [initialBootRoomTab, setInitialBootRoomTab] = useState(null);
  const [bootRoomKey, setBootRoomKey] = useState(0);
  const [leagueKey, setLeagueKey] = useState(0);
  const [cupKey, setCupKey] = useState(0);
  const [transfersKey, setTransfersKey] = useState(0);
  const [clubKey, setClubKey] = useState(0);
  const [cabinetKey, setCabinetKey] = useState(0);
  const calendarIndex = useGameStore(s => s.calendarIndex);
  const seasonCalendar = useGameStore(s => s.seasonCalendar);
  const matchweekIndex = useGameStore(s => s.matchweekIndex);
  const [calendarResults, setCalendarResults] = useState({}); // { [calendarIdx]: { playerGoals, oppGoals, won, draw } }
  const [inboxMessages, setInboxMessages] = useState([]); // { id, week, season, icon, title, body, color, read, choices?, choiceResult?, type? }
  const [trialPlayer, setTrialPlayer] = useState(null); // active trial player data
  const [trialHistory, setTrialHistory] = useState([]); // past trial outcomes for follow-up messages
  const [prodigalSon, setProdigalSon] = useState(null); // { phase, playerId, playerName, formerClub, position, starts, goals, wonVsFormer, sentFlags:{} }
  const [leagueResults, setLeagueResults] = useState({}); // { [matchweekIdx]: [{ home, away, homeGoals, awayGoals, goalScorers, cardRecipients }] }
  const summerPhase = useGameStore(s => s.summerPhase);
  const [summerData, setSummerData] = useState(null);
  const [showYouthIntake, setShowYouthIntake] = useState(true);
  // Persistent league rosters: tracks which AI team configs are in each tier
  // Format: { 1: [{name, color, strength, trait}, ...], 2: [...], 3: [...] }
  const [leagueRosters, setLeagueRosters] = useState(null); // { candidates: [...], slots: n } // "promoted" | "relegated" | "stayed"
  const [allLeagueStates, setAllLeagueStates] = useState({}); // { [tier]: aiLeague } — running simulations for every non-player tier
  const {
    matchSpeed, setMatchSpeed,
    soundEnabled, setSoundEnabled,
    autoSaveEnabled, setAutoSaveEnabled,
    trainingCardSpeed, setTrainingCardSpeed,
    matchDetail, setMatchDetail,
    musicEnabled, setMusicEnabled,
    musicVolume, setMusicVolume,
    disabledTracks, setDisabledTracks,
    instantMatch, setInstantMatch,
    loadSettings,
  } = useSettings();
  const [totalGains, setTotalGains] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [seasonCleanSheets, setSeasonCleanSheets] = useState(0);
  const [seasonGoalsFor, setSeasonGoalsFor] = useState(0);
  const [seasonDraws, setSeasonDraws] = useState(0);
  const [seasonHomeUnbeaten, setSeasonHomeUnbeaten] = useState(true);
  const [seasonAwayWins, setSeasonAwayWins] = useState(0);
  const [seasonAwayGames, setSeasonAwayGames] = useState(0);
  const [consecutiveUnbeaten, setConsecutiveUnbeaten] = useState(0);
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);
  const [consecutiveDraws, setConsecutiveDraws] = useState(0);
  const [consecutiveWins, setConsecutiveWins] = useState(0);
  const [consecutiveScoreless, setConsecutiveScoreless] = useState(0);
  const fanSentiment = useGameStore(s => s.fanSentiment);
  const boardSentiment = useGameStore(s => s.boardSentiment);
  const boardWarnWeekRef = useRef(0);

  // === Profile & game mode state ===
  const activeProfileId = useGameStore(s => s.activeProfileId);
  const [profileList, setProfileList] = useState([]); // [{ id, name, createdAt }]
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const gameMode = useGameStore(s => s.gameMode);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const gameOver = useGameStore(s => s.gameOver);
  const [viewingMuseumCareer, setViewingMuseumCareer] = useState(null); // career object from profile.museum
  const [viewingMuseumList, setViewingMuseumList] = useState(null); // { entries: [...] } — museum career picker
  const [museumDeleteConfirm, setMuseumDeleteConfirm] = useState(null); // entry to confirm-delete, or null

  // Sacking music: runs across both SackingScreen and MuseumScreen, stops when both are dismissed
  const sackingMusicRef = useRef(null); // { loop, allTimers, nodes }
  useEffect(() => {
    const active = gameOver || !!viewingMuseumCareer;
    if (active && !sackingMusicRef.current) {
      // Pause BGM
      if (BGM.audio && !BGM.audio.paused) BGM.audio.pause();
      let cancelled = false;
      (async () => {
        try {
          await Tone.start();
          if (cancelled) return;
          const drone = new Tone.Synth({
            oscillator: { type: "sine" },
            envelope: { attack: 2, decay: 0, sustain: 1, release: 3 },
            volume: -24,
          }).toDestination();
          const melody = new Tone.Synth({
            oscillator: { type: "triangle" },
            envelope: { attack: 0.4, decay: 1.2, sustain: 0.1, release: 2.0 },
            volume: -18,
          }).toDestination();
          const reverb = new Tone.Reverb({ decay: 6, wet: 0.65 }).toDestination();
          melody.disconnect(); melody.connect(reverb);
          drone.disconnect(); drone.connect(reverb);
          drone.triggerAttack("A2");
          const pattern = [
            { note: "A3", delay: 0.8 }, { note: "C4", delay: 3.5 },
            { note: "E3", delay: 6.0 }, { note: "G3", delay: 8.5 },
            { note: "A3", delay: 11.0 }, { note: "F3", delay: 13.5 },
            { note: "E3", delay: 16.0 }, { note: "C3", delay: 18.5 },
          ];
          const loopDuration = 22;
          const playPattern = () => pattern.map(({ note, delay }) =>
            setTimeout(() => { if (!cancelled) melody.triggerAttackRelease(note, "2n"); }, delay * 1000)
          );
          let allTimers = playPattern();
          const loop = setInterval(() => {
            if (cancelled) return;
            allTimers.forEach(clearTimeout);
            allTimers = playPattern();
          }, loopDuration * 1000);
          sackingMusicRef.current = { loop, allTimers: () => allTimers, nodes: [drone, melody, reverb], cancel: () => { cancelled = true; } };
        } catch { /* audio unavailable */ }
      })();
    } else if (!active && sackingMusicRef.current) {
      const m = sackingMusicRef.current;
      m.cancel?.();
      clearInterval(m.loop);
      m.allTimers?.().forEach(clearTimeout);
      m.nodes?.forEach(n => { try { n.dispose(); } catch {} });
      sackingMusicRef.current = null;
      // Resume BGM
      if (BGM.audio && BGM.enabled) BGM.audio.play().catch(() => {});
    }
  }, [gameOver, viewingMuseumCareer]);

  // === Sacking / ultimatum state ===
  const boardWarnCount = useGameStore(s => s.boardWarnCount);
  const ultimatumActive = useGameStore(s => s.ultimatumActive);
  const ultimatumTarget = useGameStore(s => s.ultimatumTarget);
  const ultimatumPtsEarned = useGameStore(s => s.ultimatumPtsEarned);
  const ultimatumGamesLeft = useGameStore(s => s.ultimatumGamesLeft);
  const ultimatumCupPending = useGameStore(s => s.ultimatumCupPending);

  // === Ironman integrity ===
  const ironmanSaveVersion = useGameStore(s => s.ironmanSaveVersion);
  const [isTainted, setIsTainted] = useState(false);

  const [readsThisWeek, setReadsThisWeek] = useState(0);
  const [lopsidedWarned, setLopsidedWarned] = useState(new Set()); // player IDs already warned about stat imbalance
  // Persistent club history — survives across seasons
  const [clubHistory, setClubHistory] = useState({
    // Team records
    totalWins: 0, totalDraws: 0, totalLosses: 0,
    totalGoalsFor: 0, totalGoalsConceded: 0,
    bestWinStreak: 0, bestUnbeatenRun: 0, worstLossStreak: 0,
    biggestWin: null, // { score: "5-0", opponent: "Town", season: 1 }
    worstDefeat: null,
    bestSeasonFinish: null, // { position: 1, tier: 2, season: 1 }
    bestSeasonPoints: 0,
    // Per-player career stats: { [playerName]: { goals, apps, motm, yellows, reds, seasons: [{season, position, avgRating, goals, apps}] } }
    playerCareers: {},
    // All-time XI candidates: { [positionSlot]: { name, position, season, avgRating, apps } }
    allTimeXI: {},
    // Season archive
    seasonArchive: [], // [{ season, tier, position, points, topScorer, ... }]
    // Cup history
    cupHistory: [], // [{ season, winner, runnerUp, playerResult }]
  });
  const [prevStartingXI, setPrevStartingXI] = useState(null);
  const [motmTracker, setMotmTracker] = useState({});
  const [stScoredConsecutive, setStScoredConsecutive] = useState(0);
  const [playerRatingTracker, setPlayerRatingTracker] = useState({});
  const [playerSeasonStats, setPlayerSeasonStats] = useState({}); // name → { goals, assists, yellows, reds, apps, motm }
  const [beatenTeams, setBeatenTeams] = useState(new Set());
  const [halfwayPosition, setHalfwayPosition] = useState(null);
  const [recentScorelines, setRecentScorelines] = useState([]); // last 3 [pGoals, oGoals]
  const [secondPlaceFinishes, setSecondPlaceFinishes] = useState(0);
  const [playerInjuryCount, setPlayerInjuryCount] = useState({}); // name → count this season
  const [seasonInjuryLog, setSeasonInjuryLog] = useState({}); // { playerName: { "Twisted Ankle": 2, ... } }
  const [careerMilestones, setCareerMilestones] = useState({}); // { goals50: "name"|null, apps100: "name"|null, ... }
  const [benchStreaks, setBenchStreaks] = useState({}); // playerId → consecutive bench appearances
  const [highScoringMatches, setHighScoringMatches] = useState(0); // count of 5+ total goal matches this season
  // All-time league-wide stats (accumulated at end of each season)
  // { scorers: { "PlayerName|TeamName": goals }, cards: { "PlayerName|TeamName": cards } }
  const [allTimeLeagueStats, setAllTimeLeagueStats] = useState({ scorers: {}, assisters: {}, cards: {} });
  const [trainedThisWeek, setTrainedThisWeek] = useState(new Set());
  const [injuryWarning, setInjuryWarning] = useState(0);
  const [squadFullAlert, setSquadFullAlert] = useState(false);

  const matchPending = useGameStore(s => s.matchPending);

  const [pendingPlayerUnlock, setPendingPlayerUnlock] = useState(null);
  const [showAssignAll, setShowAssignAll] = useState(false);
  const assignAllRef = useRef(null);
  useEffect(() => {
    if (!showAssignAll) return;
    const handleClick = (e) => {
      if (assignAllRef.current && !assignAllRef.current.contains(e.target)) {
        setShowAssignAll(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setShowAssignAll(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showAssignAll]);
  const [squadView, setSquadView] = useState("attrs"); // "attrs" or "stats"
  const [formation, setFormation] = useState(() => DEFAULT_FORMATION.map(s => ({...s})));
  const [slotAssignments, setSlotAssignments] = useState(null); // Array(11) of playerIds or null — manual slot→player mapping
  const [showTactics, setShowTactics] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // index of formation slot being assigned
  const [saveStatus, setSaveStatus] = useState(null);
  const [loadingGame, setLoadingGame] = useState(true);
  const [activeSaveSlot, setActiveSaveSlot] = useState(null); // 1, 2, or 3
  const [saveSlotSummaries, setSaveSlotSummaries] = useState([null, null, null]); // [{teamName, seasonNumber, leagueTier, week}]
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);
  const playMatchBtnRef = useRef(null);

  // SFX/BGM sync and BGM interaction binding are handled in useSettings

  // Impatient — both speed settings maxed
  useEffect(() => {
    if (trainingCardSpeed === "summary" && matchDetail === "highlights" && !unlockedAchievements.has("impatient")) {
      setUnlockedAchievements(prev => { const n = new Set(prev); n.add("impatient"); return n; });
      setAchievementQueue(prev => [...prev, "impatient"]);
    }
  }, [trainingCardSpeed, matchDetail]);

  // Reactively clear/update injury warning when user manages squad
  useEffect(() => {
    if (injuryWarning > 0) {
      const injuredCount = startingXI.filter(id => {
        const p = squad.find(pl => pl.id === id);
        return p && p.injury;
      }).length;
      setInjuryWarning(injuredCount);
    }
  }, [startingXI, squad]); // eslint-disable-line

  // Save game function
  const saveGame = useCallback(async () => {
    if (!teamName || !league || !activeSaveSlot || !useGameStore.getState().activeProfileId) return;
    setSaveStatus("saving");
    try {
      const saveData = {
        version: 2,
        teamName, newspaperName, reporterName, squad, week, league, matchweekIndex,
        startingXI, bench,
        unlockedAchievements: [...unlockedAchievements],
        seasonCards, seasonNumber, leagueWins, leagueTier, prestigeLevel, leagueVersion: 3, lastSeasonMove, matchSpeed,
        soundEnabled, autoSaveEnabled, trainingCardSpeed, matchDetail,
        musicEnabled, musicVolume, disabledTracks: [...disabledTracks], instantMatch,
        totalGains, totalMatches,
        seasonCleanSheets, seasonGoalsFor, seasonDraws,
        seasonHomeUnbeaten, seasonAwayWins, seasonAwayGames,
        consecutiveUnbeaten, consecutiveLosses, consecutiveDraws, consecutiveWins, consecutiveScoreless,
        prevStartingXI,
        motmTracker, stScoredConsecutive,
        playerRatingTracker, playerSeasonStats,
        beatenTeams: [...beatenTeams],
        retiringPlayers: [...retiringPlayers],
        cup,
        summerPhase,
        summerData,
        leagueRosters,
        halfwayPosition,
        clubHistory,
        recentScorelines,
        secondPlaceFinishes,
        playerInjuryCount,
        seasonInjuryLog,
        careerMilestones,
        benchStreaks,
        highScoringMatches,
        calendarIndex,
        seasonCalendar,
        calendarResults,
        leagueResults,
        inboxMessages,
        trialPlayer,
        trialHistory,
        prodigalSon,
        lopsidedWarned: [...lopsidedWarned],
        ovrHistory,
        storyArcs,
        allTimeLeagueStats,
        formation,
        slotAssignments,
        allLeagueStates,
        clubRelationships,
        transferFocus,
        transferWindowOpen,
        transferWindowWeeksRemaining,
        transferOffers,
        loanedOutPlayers,
        loanedInPlayers,
        transferHistory,
        shortlist,
        tickets,
        pendingTicketBoosts,
        doubleTrainingWeek,
        twelfthManActive,
        youthCoupActive,
        pendingFreeAgent,
        scoutedPlayers,
        testimonialPlayer,
        usedTicketTypes: [...usedTicketTypes],
        formationsWonWith: [...formationsWonWith],
        freeAgentSignings,
        holidayMatchesThisSeason,
        fastMatchesThisSeason,
        gkCleanSheets,
        totalShortlisted,
        prevSeasonSquadIds,
        tradesMadeInWindow,
        tradedWithClubs: [...tradedWithClubs],
        fanSentiment, boardSentiment,
        gameMode: useGameStore.getState().gameMode,
        boardWarnCount: useGameStore.getState().boardWarnCount,
        ultimatumActive: useGameStore.getState().ultimatumActive,
        ultimatumTarget: useGameStore.getState().ultimatumTarget,
        ultimatumPtsEarned: useGameStore.getState().ultimatumPtsEarned,
        ultimatumGamesLeft: useGameStore.getState().ultimatumGamesLeft,
        ultimatumCupPending: useGameStore.getState().ultimatumCupPending,
        ironmanSaveVersion: useGameStore.getState().ironmanSaveVersion,
        isTainted,
        dynastyCupQualifiers,
        dynastyCupBracket,
        miniTournamentBracket,
        fiveASideSquad,
      };
      // Increment ironman version — update profile AFTER save write succeeds
      // so the profile can never be ahead of the actual saved data
      let ironmanNewVer = null;
      if (useGameStore.getState().gameMode === "ironman") {
        ironmanNewVer = useGameStore.getState().ironmanSaveVersion + 1;
        setIronmanSaveVersion(ironmanNewVer);
        saveData.ironmanSaveVersion = ironmanNewVer;
      }
      const saveKey = getSaveKey(useGameStore.getState().activeProfileId, activeSaveSlot);
      await window.storage.set(saveKey, JSON.stringify(saveData));
      // Only update profile version after save is confirmed written
      if (ironmanNewVer !== null) {
        await updateProfileIronmanVersion(useGameStore.getState().activeProfileId, ironmanNewVer, activeSaveSlot);
      }
      // Update slot summary for quick display
      setSaveSlotSummaries(prev => {
        const next = [...prev];
        next[activeSaveSlot - 1] = { teamName, seasonNumber, leagueTier, week, gameMode: useGameStore.getState().gameMode };
        return next;
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (e) {
      console.error("Save failed:", e);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }, [teamName, newspaperName, squad, week, league, startingXI, bench, activeSaveSlot,
    unlockedAchievements, seasonCards, seasonNumber, leagueWins, leagueTier, prestigeLevel, matchSpeed, soundEnabled, autoSaveEnabled, trainingCardSpeed, matchDetail, musicEnabled, musicVolume, disabledTracks,
    totalGains, totalMatches, seasonCleanSheets, seasonGoalsFor, seasonDraws,
    seasonHomeUnbeaten, seasonAwayWins, seasonAwayGames, consecutiveUnbeaten, consecutiveLosses, consecutiveWins, consecutiveScoreless,
    prevStartingXI, motmTracker, stScoredConsecutive, playerRatingTracker,
    beatenTeams, halfwayPosition, clubHistory, recentScorelines, secondPlaceFinishes,
    playerInjuryCount, seasonInjuryLog, careerMilestones, benchStreaks, highScoringMatches, calendarIndex, seasonCalendar, calendarResults, leagueResults,
    inboxMessages, trialPlayer, trialHistory, prodigalSon, lopsidedWarned, ovrHistory, storyArcs, allTimeLeagueStats, formation, slotAssignments, allLeagueStates,
    tickets, pendingTicketBoosts, doubleTrainingWeek, twelfthManActive, youthCoupActive, pendingFreeAgent, scoutedPlayers, testimonialPlayer,
    usedTicketTypes, formationsWonWith, freeAgentSignings, holidayMatchesThisSeason,
    fastMatchesThisSeason, gkCleanSheets, totalShortlisted, prevSeasonSquadIds, tradesMadeInWindow, tradedWithClubs]);

  // Load game function
  const loadGame = useCallback(async (slotOverride) => {
    const slot = slotOverride || activeSaveSlot;
    if (!slot || !useGameStore.getState().activeProfileId) return false;
    try {
      const result = await window.storage.get(getSaveKey(useGameStore.getState().activeProfileId, slot));
      if (!result) return false;
      const s = JSON.parse(result.value);
      if (!s || !s.teamName) return false;
      setActiveSaveSlot(slot);
      setTeamName(s.teamName);
      setNewspaperName(s.newspaperName || generateNewspaperName(s.teamName));
      setReporterName(s.reporterName || generateReporterName());
      // Migrate: add nationality and statProgress to existing players if missing
      const migratedSquad = (s.squad || []).map(p => {
        const migrated = { ...p };
        if (!migrated.nationality) migrated.nationality = inferNationality(migrated.name);
        if (!migrated.statProgress) migrated.statProgress = {};
        return migrated;
      });
      setSquad(migratedSquad);
      setWeek(s.week);
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
        // Also update the state-level tier to match
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
          // Fill missing tiers from defaults
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
      // === V2 → V3 MIGRATION: Roster repair for saves migrated from 3-tier system ===
      // Tiers 5,6,7 are the original 3 tiers — leave those untouched.
      // All other tiers get reset to their correct themed defaults if corrupted.
      // Only rebuild league/cup if tier was actually wrong (jumped past tier 4).
      // Also runs for old saves with no leagueVersion (they got v1→v2 migration above but skipped v2→v3).
      if (s.leagueVersion === 2 || (!s.leagueVersion && s.leagueRosters)) {
        const playedTiers = new Set([5, 6, 7]);
        if (s.leagueRosters) {
          for (let t = 1; t <= NUM_TIERS; t++) {
            if (playedTiers.has(t)) continue;
            const defaultNames = new Set((LEAGUE_DEFS[t]?.teams || []).map(tm => tm.name));
            const current = s.leagueRosters[t] || [];
            const intact = current.filter(tm => defaultNames.has(tm.name)).length;
            // If fewer than half the original themed teams remain, reset this tier
            if (intact < Math.ceil(defaultNames.size / 2)) {
              s.leagueRosters[t] = (LEAGUE_DEFS[t]?.teams || []).map(c => ({ ...c }));
            }
          }
        }
        // Fix tier only if player was incorrectly jumped past tier 4
        // Prefer league.tier (updated by v1→v2 migration) over leagueTier (may be stale)
        const currentSaveTier = s.league?.tier || s.leagueTier || 5;
        if (currentSaveTier < 4) {
          s.leagueTier = 4;
          // Rebuild league and cup since tier was wrong
          const repairedTier = 4;
          const repairedLeague = initLeague(migratedSquad, s.teamName, repairedTier, s.leagueRosters, null, s.prestigeLevel || 0);
          s.league = repairedLeague;
          s.cup = initCup(s.teamName, repairedTier, s.leagueRosters);
          s.seasonCalendar = null;
          s.calendarIndex = 0;
          s.calendarResults = {};
          s.leagueResults = {};
        }
        // If tier is fine (4-11), don't touch the current season — just the background rosters
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
      // Backfill squadPhilosophy on roster configs
      if (s.leagueRosters) {
        for (let t = 1; t <= NUM_TIERS; t++) {
          (s.leagueRosters[t] || []).forEach(cfg => {
            if (!cfg.squadPhilosophy) cfg.squadPhilosophy = generateSquadPhilosophy(cfg.trait);
          });
        }
      }

      // Migrate old 3-tier saves to 11-tier system
      const savedTier = s.leagueTier || NUM_TIERS;
      const migratedTier = (!s.leagueVersion && savedTier <= 3) ? { 1: 5, 2: 6, 3: 7 }[savedTier] || 7 : savedTier;
      // Ensure league.tier matches the authoritative tier value — prevents stale tier from old saves
      if (s.league && s.league.tier !== migratedTier) {
        s.league.tier = migratedTier;
        const tierDef = LEAGUE_DEFS[migratedTier];
        if (tierDef) {
          s.league.leagueName = tierDef.name;
          s.league.leagueColor = tierDef.color;
        }
      }
      // Always sync league name/color from LEAGUE_DEFS (handles renamed leagues)
      if (s.league && s.league.tier && LEAGUE_DEFS[s.league.tier]) {
        s.league.leagueName = LEAGUE_DEFS[s.league.tier].name;
        s.league.leagueColor = LEAGUE_DEFS[s.league.tier].color;
      }
      // Migrate season history league names to current LEAGUE_DEFS names
      if (s.seasonHistory) {
        s.seasonHistory = s.seasonHistory.map(entry => {
          if (entry.tier && LEAGUE_DEFS[entry.tier]) {
            return { ...entry, leagueName: LEAGUE_DEFS[entry.tier].name };
          }
          return entry;
        });
      }

      setLeague(s.league);
      // matchweekIndex is now derived from calendarIndex — no need to set it
      setStartingXI(s.startingXI);
      setBench(s.bench);
      setUnlockedAchievements(new Set(s.unlockedAchievements || []));
      setSeasonCards(s.seasonCards || 0);
      setSeasonNumber(s.seasonNumber || 1);
      setLeagueWins(s.leagueWins || 0);
      setLeagueTier(migratedTier);
      setLastSeasonMove(s.lastSeasonMove || null);
      loadSettings(s);
      setTotalGains(s.totalGains || 0);
      setTotalMatches(s.totalMatches || 0);
      setSeasonCleanSheets(s.seasonCleanSheets || 0);
      setSeasonGoalsFor(s.seasonGoalsFor || 0);
      setSeasonDraws(s.seasonDraws || 0);
      setSeasonHomeUnbeaten(s.seasonHomeUnbeaten !== false);
      setSeasonAwayWins(s.seasonAwayWins || 0);
      setSeasonAwayGames(s.seasonAwayGames || 0);
      setConsecutiveUnbeaten(s.consecutiveUnbeaten || 0);
      setConsecutiveLosses(s.consecutiveLosses || 0);
      setConsecutiveDraws(s.consecutiveDraws || 0);
      setConsecutiveWins(s.consecutiveWins || 0);
      setConsecutiveScoreless(s.consecutiveScoreless || 0);
      setFanSentiment(s.fanSentiment ?? 50);
      setBoardSentiment(s.boardSentiment ?? 50);
      // Restore dynasty cup state (Tier 3)
      setDynastyCupQualifiers(s.dynastyCupQualifiers || null);
      setDynastyCupBracket(s.dynastyCupBracket || null);

      // Restore mini-tournament state (Tier 2)
      setMiniTournamentBracket(s.miniTournamentBracket || null);
      setFiveASideSquad(s.fiveASideSquad || null);

      // Restore game mode + sacking state
      setGameMode(s.gameMode || "casual");
      setBoardWarnCount(s.boardWarnCount || 0);
      setUltimatumActive(s.ultimatumActive || false);
      setUltimatumTarget(s.ultimatumTarget || 0);
      setUltimatumPtsEarned(s.ultimatumPtsEarned || 0);
      setUltimatumGamesLeft(s.ultimatumGamesLeft || 0);
      setUltimatumCupPending(s.ultimatumCupPending || false);
      const loadedIronmanVer = s.ironmanSaveVersion || 0;
      setIronmanSaveVersion(loadedIronmanVer);
      // Integrity check for Ironman saves
      if ((s.gameMode || "casual") === "ironman" && useGameStore.getState().activeProfileId) {
        // Force-sync profile version to match the loaded save BEFORE the check.
        // This prevents false positives from the race condition where auto-save
        // updates the profile version but Vite reload/crash interrupts before the
        // save file is fully written, leaving profile ahead of the actual save.
        if (loadedIronmanVer > 0) {
          await syncProfileIronmanVersion(useGameStore.getState().activeProfileId, loadedIronmanVer, slot);
        }
        const prof = await readProfile(useGameStore.getState().activeProfileId).catch(() => null);
        const integrity = checkIronmanIntegrity({ ironmanSaveVersion: loadedIronmanVer }, prof, slot);
        setIsTainted(!integrity.valid);
        if (!integrity.valid) {
          setTimeout(() => setInboxMessages(prev => {
            // Don't add duplicate integrity warnings
            if (prev.some(m => m.id === "msg_tainted")) return prev;
            return [...prev, {
              id: "msg_tainted", week: s.week || 1, season: s.seasonNumber || 1,
              icon: "⚠", color: C.lightRed, title: "Integrity Warning",
              body: "Ironman integrity check failed — this save appears to have been restored from a previous point. Achievements are suspended for this career.",
              read: false,
            }];
          }), 1000);
        }
      } else {
        setIsTainted(s.isTainted || false);
      }
      // Migrate clubHistory league names to current LEAGUE_DEFS names
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
        // Strip "The " prefix from old cup names in cupHistory
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
        setClubHistory(s.clubHistory);
      } else if (s.seasonNumber > 1 && !s.clubHistory?.totalWins) {
        // Migration: backfill clubHistory from available save data for existing saves
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

        // Reconstruct from league table — current season W/D/L/GF/GA
        if (s.league?.table) {
          const playerRow = s.league.table.find((r, i) => s.league.teams[r.teamIndex]?.isPlayer);
          if (playerRow) {
            h.totalWins = playerRow.won || 0;
            h.totalDraws = playerRow.drawn || 0;
            h.totalLosses = playerRow.lost || 0;
            h.totalGoalsFor = playerRow.goalsFor || 0;
            h.totalGoalsConceded = playerRow.goalsAgainst || 0;
          }
        }

        // Estimate prior seasons based on totalMatches minus current season matches
        const currentPlayed = (h.totalWins + h.totalDraws + h.totalLosses);
        const priorMatches = (s.totalMatches || 0) - currentPlayed;
        if (priorMatches > 0) {
          // Rough estimate: assume ~50% win, ~25% draw, ~25% loss for prior seasons
          h.totalWins += Math.round(priorMatches * 0.5);
          h.totalDraws += Math.round(priorMatches * 0.25);
          h.totalLosses += priorMatches - Math.round(priorMatches * 0.5) - Math.round(priorMatches * 0.25);
          // Estimate goals from seasonGoalsFor average
          const avgGF = s.seasonGoalsFor ? s.seasonGoalsFor / Math.max(1, currentPlayed) : 1.5;
          h.totalGoalsFor += Math.round(priorMatches * avgGF);
          h.totalGoalsConceded += Math.round(priorMatches * 1.2);
        }

        // Seed player careers from current season stats
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

        // Create placeholder season archive entries for prior seasons
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

        setClubHistory(h);
      }
      setPrevStartingXI(s.prevStartingXI || null);
      setMotmTracker(s.motmTracker || {});
      setStScoredConsecutive(s.stScoredConsecutive || 0);
      setPlayerRatingTracker(s.playerRatingTracker || {});
      setPlayerSeasonStats(s.playerSeasonStats || {});
      setBeatenTeams(new Set(s.beatenTeams || []));
      setRetiringPlayers(new Set(s.retiringPlayers || []));
      // Migrate cup name: strip "The " prefix from renamed cups
      if (s.cup && s.cup.cupName && s.cup.cupName.startsWith("The ")) {
        s.cup.cupName = s.cup.cupName.slice(4);
      }
      setCup(s.cup || initCup(s.teamName, migratedTier, s.leagueRosters));
      // Migration: old saves with summerPhase="summary" would auto-fire SeasonEndReveal on load.
      // Convert to "break" with weeksLeft=5 so the user manually clicks Advance Summer to see it.
      const rawSummerPhase = s.summerPhase || null;
      const loadedSummerPhase = rawSummerPhase === "summary" ? "break" : rawSummerPhase;
      const loadedSummerData = rawSummerPhase === "summary"
        ? { ...(s.summerData || {}), weeksLeft: s.summerData?.weeksLeft ?? 5 }
        : (s.summerData || null);
      setSummerPhase(loadedSummerPhase);
      setSummerData(loadedSummerData);
      // Migration: normalize rosters to ensure every tier has 9 AI teams
      // (fixes saves where ghost-team padding caused tiers to shrink over seasons)
      const migratedRosters = s.leagueRosters ? normalizeRosters({ ...s.leagueRosters }) : null;
      setLeagueRosters(migratedRosters);
      setHalfwayPosition(s.halfwayPosition ?? null);
      setRecentScorelines(s.recentScorelines || []);
      setSecondPlaceFinishes(s.secondPlaceFinishes || 0);
      setPlayerInjuryCount(s.playerInjuryCount || {});
      setSeasonInjuryLog(s.seasonInjuryLog || {});
      setCareerMilestones(s.careerMilestones || {});
      setBenchStreaks(s.benchStreaks || {});
      setHighScoringMatches(s.highScoringMatches || 0);
      // Calendar migration: rebuild if not present
      if (s.seasonCalendar) {
        setSeasonCalendar(s.seasonCalendar);
        setCalendarIndex(s.calendarIndex || 0);
      } else if (s.league?.fixtures) {
        const cal = buildSeasonCalendar(s.league.fixtures.length, s.cup, !!getModifier(migratedTier).knockoutAtEnd, !!getModifier(migratedTier).miniTournament);
        setSeasonCalendar(cal);
        setCalendarIndex(computeCalendarIndex(cal, s.matchweekIndex || 0, s.cup));
      }
      setCalendarResults(s.calendarResults || {});
      setLeagueResults(s.leagueResults || {});
      setInboxMessages(s.inboxMessages || []);
      setTrialPlayer(s.trialPlayer || null);
      setTrialHistory(s.trialHistory || []);
      setProdigalSon(s.prodigalSon || null);
      // Migration: if prodigal was redeemed but boost was lost to race condition, re-apply it
      if (s.prodigalSon?.phase === "redeemed" && s.prodigalSon?.pendingBoost === undefined) {
        setProdigalSon({ ...s.prodigalSon, pendingBoost: true });
      }
      setLopsidedWarned(new Set(s.lopsidedWarned || []));
      setOvrHistory(s.ovrHistory || []);
      const loadedArcs = s.storyArcs || initStoryArcs();
      // Migration v3: reconstruct completed arcs and force reward re-application
      // Previous migrations set _arcRewardMigration but the timing bug wasn't fixed yet
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
      setStoryArcs(loadedArcs);
      setAllTimeLeagueStats(s.allTimeLeagueStats || { scorers: {}, assisters: {}, cards: {} });
      // Load formation (or migrate from default)
      if (s.formation && s.formation.length === 11) {
        setFormation(s.formation.map(slot => ({...slot})));
      } else {
        setFormation(DEFAULT_FORMATION.map(slot => ({...slot})));
      }
      // Load slot assignments (accept old 11-slot or new 16-slot saves)
      if (s.slotAssignments && Array.isArray(s.slotAssignments) && s.slotAssignments.length >= 11) {
        const loaded = [...s.slotAssignments];
        while (loaded.length < TOTAL_SLOTS) loaded.push(null);
        setSlotAssignments(loaded);
      } else {
        setSlotAssignments(null);
      }
      // Load AI league states (or rebuild and fast-forward for old saves)
      if (s.allLeagueStates && Object.keys(s.allLeagueStates).length > 0) {
        // Migrate: add nationalities to AI players in all league states
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
        setAllLeagueStates(s.allLeagueStates);
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
        setAllLeagueStates(freshAILeagues);
      }
      setClubRelationships(s.clubRelationships || {});
      // Migration: old saves have transferFocus as string|null, new saves as array
      setTransferFocus(Array.isArray(s.transferFocus) ? s.transferFocus : (s.transferFocus ? [s.transferFocus] : []));
      setTransferWindowOpen(s.transferWindowOpen || false);
      setTransferWindowWeeksRemaining(s.transferWindowWeeksRemaining || 0);
      setTransferOffers(s.transferOffers || []);
      setLoanedOutPlayers(s.loanedOutPlayers || []);
      setLoanedInPlayers(s.loanedInPlayers || []);
      setTransferHistory(s.transferHistory || []);
      setShortlist(s.shortlist || []);
      setTickets(s.tickets || []);
      setPendingTicketBoosts(s.pendingTicketBoosts || []);
      setDoubleTrainingWeek(s.doubleTrainingWeek || false);
      setTwelfthManActive(s.twelfthManActive || false);
      setYouthCoupActive(s.youthCoupActive || false);
      setPendingFreeAgent(s.pendingFreeAgent || null);
      setScoutedPlayers(s.scoutedPlayers || {});
      setTestimonialPlayer(s.testimonialPlayer || null);
      setUsedTicketTypes(new Set(s.usedTicketTypes || []));
      setFormationsWonWith(new Set(s.formationsWonWith || []));
      setFreeAgentSignings(s.freeAgentSignings || 0);
      setHolidayMatchesThisSeason(s.holidayMatchesThisSeason || 0);
      setFastMatchesThisSeason(s.fastMatchesThisSeason || 0);
      setGkCleanSheets(s.gkCleanSheets || {});
      setTotalShortlisted(s.totalShortlisted || 0);
      setPrevSeasonSquadIds(s.prevSeasonSquadIds || null);
      setTradesMadeInWindow(s.tradesMadeInWindow || 0);
      setTradedWithClubs(new Set(s.tradedWithClubs || []));
      setPrestigeLevel(s.prestigeLevel || 0);
      // Migration: seed allTimeLeagueStats from clubHistory.playerCareers for existing saves
      if (!s.allTimeLeagueStats && s.clubHistory?.playerCareers) {
        const seeded = { scorers: {}, assisters: {}, cards: {} };
        Object.entries(s.clubHistory.playerCareers).forEach(([name, c]) => {
          if (c.goals > 0) seeded.scorers[`${name}|${s.teamName}`] = c.goals;
          if (c.assists > 0) seeded.assisters[`${name}|${s.teamName}`] = c.assists;
          if ((c.yellows || 0) + (c.reds || 0) > 0) seeded.cards[`${name}|${s.teamName}`] = (c.yellows || 0) + (c.reds || 0);
        });
        setAllTimeLeagueStats(seeded);
      }
      // Migration: backfill initial snapshot for saves with no history
      if (!s.ovrHistory || s.ovrHistory.length === 0) {
        const snap = {};
        (s.squad || []).forEach(p => { snap[`${p.name}|${p.position}`] = getOverall(p); });
        setOvrHistory([{ w: s.week || 1, s: s.seasonNumber || 1, p: snap }]);
      }
      // Migration: grant missing player unlocks for already-unlocked achievements
      // Shows the reveal screen on load so the player gets the full unlock experience
      if (s.unlockedAchievements && s.squad) {
        const unlockedSet = new Set(s.unlockedAchievements);
        const currentSquadIds = new Set((s.squad || []).map(p => p.id));
        const missingUnlocks = [];
        for (const achId of unlockedSet) {
          const unlock = UNLOCKABLE_PLAYERS.find(u => u.achievementId === achId);
          if (unlock && unlock.attrs) {
            const unlockId = `unlockable_${unlock.id}`;
            if (!currentSquadIds.has(unlockId)) {
              missingUnlocks.push(unlock);
              console.log(`Migration: queuing reveal for missing unlockable player ${unlock.name} (achievement: ${achId})`);
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
  }, []);

  // Save utilities (exported/imported/deleted) — extracted to useSaveGame hook
  const { exportSave, importSave, deleteSave } = useSaveGame({
    teamName, activeSaveSlot, setImportStatus, setSaveSlotSummaries,
  });

  // Sacking: archive career to museum and show game over screen
  const triggerSacking = useCallback(async () => {
    if (!useGameStore.getState().activeProfileId) return;
    try {
      await archiveCareerToMuseum(useGameStore.getState().activeProfileId, {
        teamName, seasonNumber, leagueTier,
        totalMatches,
        clubHistory,
      });
    } catch (e) { console.error("Museum archive failed:", e); }
    // Delete the save slot
    const slot = activeSaveSlot;
    if (slot && useGameStore.getState().activeProfileId) {
      try {
        await window.storage.delete(getSaveKey(useGameStore.getState().activeProfileId, slot));
        setSaveSlotSummaries(prev => { const n = [...prev]; n[slot - 1] = null; return n; });
      } catch (e) { /* ok */ }
    }
    setGameOver(true);
  }, [teamName, seasonNumber, leagueTier, totalMatches, clubHistory, activeSaveSlot]);

  // Ultimatum progress tracking: call after each league match result
  const updateUltimatumProgressRef = useRef(null);
  const updateUltimatumProgress = useCallback((playerWon, isDraw, cupPlayerEliminated) => {
    if (!useGameStore.getState().ultimatumActive || useGameStore.getState().gameMode !== "ironman") return;
    const pts = playerWon ? 3 : isDraw ? 1 : 0;
    const newPts = useGameStore.getState().ultimatumPtsEarned + pts;
    const newGames = useGameStore.getState().ultimatumGamesLeft - 1;
    setUltimatumPtsEarned(newPts);
    setUltimatumGamesLeft(newGames);

    const target = useGameStore.getState().ultimatumTarget;
    const maxPossible = newPts + (newGames * 3);
    const _curWeek = useGameStore.getState().week;

    if (newPts >= target) {
      // Reprieve!
      setUltimatumActive(false);
      setBoardWarnCount(0);
      setBoardSentiment(Math.max(50, useGameStore.getState().boardSentiment));
      setInboxMessages(prev => [...prev, {
        id: `msg_reprieve_${Date.now()}`, week: _curWeek, season: prev[prev.length - 1]?.season || 1,
        icon: "✅", color: "#4ade80", title: "Board Reprieve",
        body: "The board has been impressed by your response. You have their full support — for now.",
        read: false,
      }]);
    } else if (newGames <= 0 || maxPossible < target) {
      // Failed window (or mathematically eliminated)
      setUltimatumActive(false);
      if (!cupPlayerEliminated) {
        // Still in cup — hold sacking, cup is the last lifeline
        setUltimatumCupPending(true);
        setInboxMessages(prev => [...prev, {
          id: `msg_cup_hope_${Date.now()}`, week: _curWeek, season: prev[prev.length - 1]?.season || 1,
          icon: "🏆", color: C.amber, title: "Fan Rally",
          body: "Fan reaction to your cup run has given the board cause to reconsider.",
          read: false,
        }]);
      } else {
        triggerSacking();
      }
    }
  }, [setBoardWarnCount, setInboxMessages, triggerSacking]);
  updateUltimatumProgressRef.current = updateUltimatumProgress;

  // On mount: load profile list. Slot scanning happens after a profile is selected.
  useEffect(() => {
    (async () => {
      try {
        const profiles = await listProfiles();
        setProfileList(profiles);
      } catch (e) { /* failed silently */ }
      setLoadingGame(false);
      setProfilesLoaded(true);
    })();
  }, []);

  // When a profile is selected, scan its 3 save slots
  useEffect(() => {
    if (!activeProfileId) return;
    setSaveSlotSummaries([null, null, null]);
    (async () => {
      try {
        const summaries = await scanProfileSlots(activeProfileId);
        setSaveSlotSummaries(summaries);
      } catch (e) { /* failed silently */ }
    })();
  }, [activeProfileId]);

  // Auto-save after each match (when matchResult clears)
  const prevMatchResult = useRef(null);
  const revealedInjuryCount = useRef(0);
  const weekRecoveriesRef = useRef([]); // persists past gains clearing for achievement checks
  const pendingFinalRewardRef = useRef(null); // captures arc final reward for post-training application
  const storyArcsRef = useRef(storyArcs);
  useEffect(() => { storyArcsRef.current = storyArcs; }, [storyArcs]);

  // Talisman: highest-OVR non-legend by default; reassigned to Captain Fantastic arc target once that arc completes.
  const talismanIdRef = useRef(null);
  useEffect(() => {
    const playerArc = storyArcs?.player;
    if (playerArc?.completed && playerArc?.arcId === "captain_fantastic" && playerArc?.tracking?.targetId) {
      const captain = squad.find(p => p.id === playerArc.tracking.targetId && !p.isLegend);
      if (captain) { talismanIdRef.current = captain.id; return; }
    }
    const eligible = squad.filter(p => !p.isLegend);
    talismanIdRef.current = eligible.length
      ? eligible.reduce((best, p) => getOverall(p) > getOverall(best) ? p : best).id
      : null;
  }, [squad, storyArcs]);

  const advanceWeekRef = useRef(null);

  // Safety: if processing is stuck for >5 seconds, reset it
  useEffect(() => {
    if (processing) {
      const timer = setTimeout(() => setProcessing(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [processing]);
  useEffect(() => {
    if (prevMatchResult.current && !matchResult && teamName && league && autoSaveEnabled && !useGameStore.getState().gameOver) {
      saveGame();
    }
    prevMatchResult.current = matchResult;
  }, [matchResult, teamName, league, saveGame, autoSaveEnabled]);

  // Ironman auto-save: save after every week advance (training, match, cup skip) and summer phase change
  const ironmanCalendarLoaded = useRef(false);
  const ironmanSummerLoaded = useRef(false);
  useEffect(() => {
    if (!ironmanCalendarLoaded.current) { ironmanCalendarLoaded.current = true; return; }
    if (useGameStore.getState().gameMode === "ironman" && teamName && league && !useGameStore.getState().gameOver) {
      saveGame();
    }
  }, [calendarIndex, teamName, league, saveGame]);
  useEffect(() => {
    if (!ironmanSummerLoaded.current) { ironmanSummerLoaded.current = true; return; }
    if (useGameStore.getState().gameMode === "ironman" && teamName && !useGameStore.getState().gameOver) {
      saveGame();
    }
  }, [summerPhase, teamName, saveGame]);

  // === DEBUG TOOL HANDLERS === (extracted to useDebug hook)
  const { onDebugJumpTier, onDebugWinLeague, onDebugSetSquadOvr, onDebugSetPrestige } = useDebug({
    squad, setSquad, teamName, leagueRosters, setLeagueRosters, prestigeLevel, setPrestigeLevel,
    startingXI, bench, formation, slotAssignments,
    setLeague, setLeagueTier, setCup, setAllLeagueStates, setSeasonCalendar,
    setCalendarIndex, setCalendarResults, setLeagueResults,
    setMatchPending, setSummerPhase, setSummerData, setMatchResult, setCupMatchResult,
    setFiveASideSquad,
  });

  // Init league once team name is set (only if not loaded from save)
  useEffect(() => {
    if (teamName && !league) {
      const rosters = leagueRosters || initLeagueRosters();
      if (!leagueRosters) setLeagueRosters(rosters);
      const newLeague = initLeague(squad, teamName, leagueTier, rosters, null, prestigeLevel);
      setLeague(newLeague);
      const newCup = initCup(teamName, leagueTier, rosters);
      setCup(newCup);
      // Init running simulations for every non-player tier
      const initAILeagues = {};
      for (let t = 1; t <= NUM_TIERS; t++) {
        if (t === leagueTier) continue;
        const ai = initAILeague(t, rosters, null, prestigeLevel);
        if (ai) initAILeagues[t] = ai;
      }
      setAllLeagueStates(initAILeagues);
      setRetiringPlayers(checkRetirements(squad, seasonNumber));
      const cal = buildSeasonCalendar(newLeague.fixtures.length, newCup, !!getModifier(leagueTier).knockoutAtEnd, !!getModifier(leagueTier).miniTournament);
      setSeasonCalendar(cal);
      setCalendarIndex(0);

      // Initialize inbox with welcome messages
      const trialP = generateTrialPlayer(ovrCap);
      const trialWeek = rand(2, 5);
      setInboxMessages([
        { id: "msg_welcome", week: 1, season: 1, icon: "📰", title: "Welcome to the Boot Room", body: "This is your hub for news, messages and notifications. Check back here as your season progresses.", color: C.blue, read: false },
        { id: "msg_board", week: 1, season: 1, icon: "🏟️", title: "Board Expectations", body: `The board expects a solid mid-table finish this season in ${LEAGUE_DEFS[leagueTier]?.name || "Sunday League"}. Prove them wrong.`, color: C.textMuted, read: false },
        { id: "msg_trial_" + trialP.id, week: trialWeek, season: 1, icon: "🌍", title: `Trial Suggested: ${trialP.name}`, body: `Your scout reports: "${trialP.name}, a ${trialP.age}-year-old ${trialP.position} from ${trialP.countryLabel} ${trialP.flag}, is over here on holiday and is showing promise. He's available for a 3-week trial if you have space in your squad."`, color: C.green, read: false, type: "trial_offer", trialPlayerData: trialP, pendingUntilWeek: trialWeek, choices: [{ label: "Accept Trial", value: "accept" }, { label: "Decline", value: "decline" }] },
      ]);
      // Asst Manager intro — training onboarding
      setInboxMessages(prev => [...prev, {
        id: "msg_asst_mgr_training_intro", week: 3, season: 1,
        icon: "📋", color: "#f59e0b",
        title: "Asst. Manager's Notes",
        body: "Boss, now that we've got a match under our belt, I wanted to have a word about training.\n\nEach week, your players can be assigned a training focus — shooting, defending, pace, the lot. It's how they improve over time. Without it, they'll stay exactly where they are.\n\nYou can set it up on the Squad page, or if you'd rather focus on tactics and transfers, I'm happy to put everyone on a general programme for now. Your call.",
        read: false, type: "asst_mgr_training_intro", pendingUntilWeek: 3,
        choices: [{ label: "You Handle It", value: "delegate" }, { label: "I'll Set It Up", value: "manual" }],
      }]);
      // League modifier intro message
      const startMod = getModifier(leagueTier);
      if (startMod.inboxIntro) {
        setInboxMessages(prev => [...prev, {
          id: `msg_league_mod_${leagueTier}`, week: 1, season: 1,
          icon: startMod.inboxIntro.icon, title: startMod.inboxIntro.title,
          body: startMod.inboxIntro.body, color: LEAGUE_DEFS[leagueTier]?.color || C.textMuted,
          read: false,
        }]);
      }
      // Reporter intro — soft onboarding for Story Arcs
      const rName = reporterName || generateReporterName();
      if (!reporterName) setReporterName(rName);
      const pName = newspaperName || generateNewspaperName(teamName);
      setInboxMessages(prev => [...prev, {
        id: "msg_reporter_intro", week: 2, season: 1,
        icon: "📰", color: "#94a3b8",
        title: `${rName}, ${pName}`,
        body: `${profileList.find(p => p.id === activeProfileId)?.name || "Gaffer"},\n\n${rName} here — I cover your club for ${pName}. Thought I'd introduce myself now the season's underway.\n\nI've been doing this job long enough to know that the best clubs aren't just built on results. They're built on stories. The captain who drags the team through a crisis. The kid who comes from nowhere. The old pro who gets one last shot.\n\nYou'll find those threads developing in your Boot Room under Story Arcs. Keep an eye on them — the drama tends to write itself, and the payoff can be worth more than any training session.\n\nI'll be watching. Good luck.`,
        read: false, pendingUntilWeek: 2,
      }]);
      // Single-fixture opponents announcement (Dynasty / Mini-Tournament tiers)
      if (newLeague.singleFixtureOpponents) {
        const sfo = newLeague.singleFixtureOpponents;
        const sfMod = getModifier(leagueTier);
        const sfTourney = sfMod.miniTournament ? "5v5 Mini-Tournament" : "Dynasty Cup knockout phase";
        const sfMDs = newLeague.fixtures?.length || 18;
        const sfNames = sfo.map(o => o.name).join(" and ");
        setInboxMessages(prev => [...prev, {
          id: `msg_single_fix_s1`, week: 1, season: 1,
          icon: "📋", title: "Condensed Fixture List",
          body: `Due to the ${sfTourney} at the end of the season, the league has been compressed to ${sfMDs} matchdays.\n\nYou'll only face ${sfNames} once this season. Make it count.`,
          color: LEAGUE_DEFS[leagueTier]?.color || C.textMuted, read: false,
        }]);
      }

      // Initialize starter tickets for new game
      setTickets([
        { id: `t_${Date.now()}_1`, type: "delay_retirement" },
        { id: `t_${Date.now()}_2`, type: "random_attr" },
        { id: `t_${Date.now()}_3`, type: "double_session" },
        { id: `t_${Date.now()}_4`, type: "miracle_cream" },
        { id: `t_${Date.now()}_5`, type: "rename_player" },
        { id: `t_${Date.now()}_6`, type: "relations_boost" },
        { id: `t_${Date.now()}_7`, type: "twelfth_man" },
        { id: `t_${Date.now()}_8`, type: "youth_coup" },
        { id: `t_${Date.now()}_9`, type: "transfer_insider" },
        { id: `t_${Date.now()}_10`, type: "scout_dossier" },
        { id: `t_${Date.now()}_11`, type: "testimonial_match" },
        // Tier-specific bonus tickets
        ...(getModifier(leagueTier).saudiAgentTickets ? Array.from({ length: getModifier(leagueTier).saudiAgentTickets }, (_, i) => ({ id: `t_${Date.now()}_sa${i}`, type: "saudi_agent" })) : []),
        ...(getModifier(leagueTier).rewindTickets ? Array.from({ length: getModifier(leagueTier).rewindTickets }, (_, i) => ({ id: `t_${Date.now()}_rw${i}`, type: "rewind" })) : []),
      ]);

      // Check for team-name-based unlockable players (may match multiple)
      const teamNameUnlocks = UNLOCKABLE_PLAYERS.filter(u =>
        u.unlockType === "teamName" && u.attrs &&
        u.unlockValue && [].concat(u.unlockValue).some(v => teamName.toLowerCase().includes(v.toLowerCase()))
        && !squad.some(p => p.id === `unlockable_${u.id}`)
      );
      if (teamNameUnlocks.length > 0) {
        setPendingPlayerUnlock(teamNameUnlocks);
      }

      // Initial OVR snapshot for progress chart (only for fresh games, not loads)
      if (ovrHistory.length === 0) {
        const snap = {};
        squad.forEach(p => { snap[`${p.name}|${p.position}`] = getOverall(p); });
        setOvrHistory([{ w: 1, s: 1, p: snap }]);
      }
    }
  }, [teamName]); // eslint-disable-line

  // ─── Global click handlers for player/team names across all screens ───
  const resolveAnyPlayer = useCallback((playerNameOrObj, teamName) => {
    // If a full player object was passed, use it directly
    if (playerNameOrObj && typeof playerNameOrObj === "object" && playerNameOrObj.name) {
      setSelectedPlayer(playerNameOrObj);
      return;
    }
    const playerName = playerNameOrObj;
    if (!playerName) return;
    // 1. Check user's squad
    const own = useGameStore.getState().squad.find(p => p.name === playerName);
    if (own) { setSelectedPlayer(own); return; }
    // Helper: enrich AI player with club info for transfer context
    const enrichAI = (p, tm, tier) => ({ ...p, clubName: tm.name, clubColor: tm.color, clubTier: tier });
    // 2. Search current league teams
    if (league) {
      for (const tm of (league.teams || [])) {
        if (tm.isPlayer) continue;
        if (teamName && tm.name !== teamName) continue;
        const p = tm.squad?.find(p => p.name === playerName);
        if (p) { setSelectedPlayer(enrichAI(p, tm, league.tier || leagueTier)); return; }
      }
    }
    // 3. Search all league tiers
    if (allLeagueStates) {
      for (const tierKey of Object.keys(allLeagueStates)) {
        const state = allLeagueStates[tierKey];
        if (!state?.teams) continue;
        for (const tm of state.teams) {
          if (tm.isPlayer) continue;
          if (teamName && tm.name !== teamName) continue;
          const p = tm.squad?.find(p => p.name === playerName);
          if (p) { setSelectedPlayer(enrichAI(p, tm, parseInt(tierKey))); return; }
        }
      }
    }
  }, [league, allLeagueStates, leagueTier]);

  const handleGlobalTeamClick = useCallback((teamName) => {
    if (!teamName) return;
    // Search current league
    if (league) {
      const idx = league.teams.findIndex(t => t.name === teamName);
      if (idx !== -1) {
        const team = league.teams[idx];
        const tr = league.table?.find(r => r.teamIndex === idx);
        const tableRow = tr ? { played: tr.played, won: tr.won, drawn: tr.drawn, lost: tr.lost, goalsFor: tr.goalsFor, goalsAgainst: tr.goalsAgainst, points: tr.points } : null;
        setViewingTeamGlobal({ team, tableRow, tier: leagueTier });
        return;
      }
    }
    // Search all league tiers
    if (allLeagueStates) {
      for (const tierKey of Object.keys(allLeagueStates)) {
        const state = allLeagueStates[tierKey];
        if (!state?.teams) continue;
        const idx = state.teams.findIndex(t => t.name === teamName);
        if (idx !== -1) {
          const team = state.teams[idx];
          const tr = state.table?.find(r => r.teamIndex === idx);
          const tableRow = tr ? { played: tr.played, won: tr.won, drawn: tr.drawn, lost: tr.lost, goalsFor: tr.goalsFor, goalsAgainst: tr.goalsAgainst, points: tr.points } : null;
          setViewingTeamGlobal({ team, tableRow, tier: parseInt(tierKey) });
          return;
        }
      }
    }
  }, [league, allLeagueStates, leagueTier]);

  // Shared relationship focus callbacks — used by all AITeamPanel instances
  const findTeamTier = useCallback((teamName) => {
    if (league?.teams?.some(t => t.name === teamName)) return leagueTier;
    if (allLeagueStates) {
      for (const [t, state] of Object.entries(allLeagueStates)) {
        if (state?.teams?.some(tm => tm.name === teamName)) return parseInt(t);
      }
    }
    return leagueTier;
  }, [league, allLeagueStates, leagueTier]);

  const handleFocusSet = useCallback((name) => {
    if (transferFocus.includes(name)) return;
    if (!clubRelationships[name]) {
      setClubRelationships(prev => ({ ...prev, [name]: { pct: 0, tier: findTeamTier(name) } }));
    }
    if (transferFocus.length < 2) {
      setTransferFocus(prev => [...prev, name]);
    }
  }, [transferFocus, clubRelationships, findTeamTier]);

  const handleFocusRemove = useCallback((name) => {
    setTransferFocus(prev => prev.filter(n => n !== name));
  }, []);

  const handleFocusReplace = useCallback((slotIdx, name) => {
    if (!clubRelationships[name]) {
      setClubRelationships(prev => ({ ...prev, [name]: { pct: 0, tier: findTeamTier(name) } }));
    }
    setTransferFocus(prev => { const u = [...prev]; u[slotIdx] = name; return u; });
  }, [clubRelationships, findTeamTier]);

  const handleToggleShortlist = useCallback((player) => {
    setShortlist(prev => {
      const key = player.id || `${player.name}|${player.clubName || ""}`;
      const exists = prev.some(p => (p.id || `${p.name}|${p.clubName || ""}`) === key);
      if (exists) return prev.filter(p => (p.id || `${p.name}|${p.clubName || ""}`) !== key);
      // Track total shortlisted across career (for Talent Spotter achievement)
      setTotalShortlisted(prev => prev + 1);
      return [...prev, {
        id: player.id,
        name: player.name,
        position: player.position,
        ovr: getOverall(player),
        age: player.age,
        attrs: player.attrs ? { ...player.attrs } : null,
        potential: player.potential ?? null,
        nationality: player.nationality ?? null,
        clubName: player.clubName || "",
        clubColor: player.clubColor || C.textMuted,
        clubTier: player.clubTier,
        addedSeason: seasonNumber,
        addedWeek: calendarIndex,
      }];
    });
  }, [seasonNumber, calendarIndex]);

  // ─── Ticket consumption handlers (extracted to useTickets hook) ───
  const { useTicketDelayRetirement, useTicketRandomAttr, useTicketRelationBoost, useTicketDoubleSession,
    useTicketMiracleCream, useTicketTwelfthMan, useTicketYouthCoup, useTicketRenamePlayer,
    useTicketTransferInsider, useTicketScoutDossier, useTicketTestimonialMatch, useTicketSaudiAgent } = useTickets({
    squad, setSquad, retiringPlayers, setRetiringPlayers, seasonNumber, ovrCap,
    transferFocus, leagueTier, shortlist, clubHistory, teamName, clubRelationships, league, leagueResults,
    setTickets, setUsedTicketTypes, setInboxMessages, setClubRelationships,
    setDoubleTrainingWeek, setTwelfthManActive, setYouthCoupActive, setClubHistory,
    setTestimonialPlayer, setScoutedPlayers, setPendingFreeAgent, setPendingTicketBoosts,
  });

  // Rewind ticket — replay a chosen lost or drawn league match
  const useTicketRewind = useCallback((ticketId, matchCalIdx) => {
    const cal = useGameStore.getState().seasonCalendar || [];
    const entry = cal[matchCalIdx];
    const oldResult = calendarResults[matchCalIdx];
    if (!entry || entry.type !== "league" || !oldResult || oldResult.won) return;
    const oldPlayerGoals = oldResult.playerGoals;
    const oldOppGoals = oldResult.oppGoals;
    const wasDraw = oldResult.draw;
    const mwIdx = entry.leagueMD;
    const fixture = useGameStore.getState().league?.fixtures?.[mwIdx]?.find(f =>
      useGameStore.getState().league.teams[f.home]?.isPlayer || useGameStore.getState().league.teams[f.away]?.isPlayer
    );
    if (!fixture) return;
    const updatedLeague = { ...useGameStore.getState().league, table: useGameStore.getState().league.table.map(r => ({ ...r })) };
    const mod = getModifier(leagueTier);
    const oopMult = formation ? getTeamOOPMultiplier(startingXI, formation, useGameStore.getState().squad, slotAssignments) : 1.0;
    const newResult = simulateMatch(
      updatedLeague.teams[fixture.home], updatedLeague.teams[fixture.away],
      startingXI, bench, false, oopMult, 0, talismanIdRef.current, 0, mod
    );
    // Adjust league table: subtract old result, add new
    const homeRow = updatedLeague.table.find(r => r.teamIndex === fixture.home);
    const awayRow = updatedLeague.table.find(r => r.teamIndex === fixture.away);
    const playerIsHome = updatedLeague.teams[fixture.home]?.isPlayer;
    // Subtract old result
    if (wasDraw) {
      const oldPlPts = mod.drawPointsPlayer ?? 1;
      const oldAiPts = mod.drawPointsAI ?? 1;
      if (playerIsHome) {
        homeRow.goalsFor -= oldPlayerGoals; homeRow.goalsAgainst -= oldOppGoals; homeRow.drawn--; homeRow.points -= oldPlPts;
        awayRow.goalsFor -= oldOppGoals; awayRow.goalsAgainst -= oldPlayerGoals; awayRow.drawn--; awayRow.points -= oldAiPts;
      } else {
        awayRow.goalsFor -= oldPlayerGoals; awayRow.goalsAgainst -= oldOppGoals; awayRow.drawn--; awayRow.points -= oldPlPts;
        homeRow.goalsFor -= oldOppGoals; homeRow.goalsAgainst -= oldPlayerGoals; homeRow.drawn--; homeRow.points -= oldAiPts;
      }
    } else {
      // Player lost — opponent won
      if (playerIsHome) {
        homeRow.goalsFor -= oldPlayerGoals; homeRow.goalsAgainst -= oldOppGoals; homeRow.lost--;
        awayRow.goalsFor -= oldOppGoals; awayRow.goalsAgainst -= oldPlayerGoals; awayRow.won--; awayRow.points -= 3;
      } else {
        awayRow.goalsFor -= oldPlayerGoals; awayRow.goalsAgainst -= oldOppGoals; awayRow.lost--;
        homeRow.goalsFor -= oldOppGoals; homeRow.goalsAgainst -= oldPlayerGoals; homeRow.won--; homeRow.points -= 3;
      }
    }
    // Add new result
    homeRow.goalsFor += newResult.homeGoals; homeRow.goalsAgainst += newResult.awayGoals;
    awayRow.goalsFor += newResult.awayGoals; awayRow.goalsAgainst += newResult.homeGoals;
    if (newResult.homeGoals > newResult.awayGoals) {
      homeRow.won++; homeRow.points += 3; awayRow.lost++;
    } else if (newResult.awayGoals > newResult.homeGoals) {
      awayRow.won++; awayRow.points += 3; homeRow.lost++;
    } else {
      homeRow.drawn++; awayRow.drawn++;
      if (mod.drawPointsPlayer != null) {
        homeRow.points += playerIsHome ? (mod.drawPointsPlayer) : (mod.drawPointsAI || 1);
        awayRow.points += !playerIsHome ? (mod.drawPointsPlayer) : (mod.drawPointsAI || 1);
      } else {
        homeRow.points += 1; awayRow.points += 1;
      }
    }
    setLeague(updatedLeague);
    // Update calendar result
    const newPGoals = playerIsHome ? newResult.homeGoals : newResult.awayGoals;
    const newOGoals = playerIsHome ? newResult.awayGoals : newResult.homeGoals;
    setCalendarResults(prev => ({ ...prev, [matchCalIdx]: { playerGoals: newPGoals, oppGoals: newOGoals, won: newPGoals > newOGoals, draw: newPGoals === newOGoals } }));
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "rewind"]));
    const oppName = playerIsHome ? updatedLeague.teams[fixture.away]?.name : updatedLeague.teams[fixture.home]?.name;
    const oldLabel = wasDraw ? "draw" : "loss";
    setInboxMessages(prev => [...prev, {
      id: `msg_rewind_${Date.now()}`, week: calendarIndex, season: seasonNumber,
      icon: "⏪", title: "Time Rewound!",
      body: (() => {
        const base = `You replayed your ${oldLabel} against ${oppName || "the opposition"}. New result: ${newPGoals}-${newOGoals}`;
        const newWon = newPGoals > newOGoals;
        const newDraw = newPGoals === newOGoals;
        const newLost = newOGoals > newPGoals;
        if (newWon) return base + " — the timeline has been corrected.";
        if (wasDraw && newDraw) return base + " — some timelines can't be rewritten.";
        if (!wasDraw && newDraw) return base + " — better, but not the rewrite you were hoping for.";
        if (wasDraw && newLost) return base + " — time doesn't like to be tampered with.";
        return base + " — the universe insists.";
      })(),
      color: "#a78bfa", read: false,
    }]);
  }, [calendarResults, leagueTier, formation, startingXI, bench, slotAssignments, calendarIndex, seasonNumber]);

  const handleAsstXI = useCallback(() => {
    const available = squad.filter(p => !p.injury && !p.isLegend);
    const newSlots = new Array(TOTAL_SLOTS).fill(null);
    const used = new Set();
    const canPlay = (p, pos) => p.position === pos || p.learnedPositions?.includes(pos);
    formation.forEach((slot, i) => {
      const candidates = available.filter(p => canPlay(p, slot.pos) && !used.has(p.id));
      candidates.sort((a, b) => getOverall(b) - getOverall(a));
      if (candidates.length > 0) { newSlots[i] = candidates[0].id; used.add(candidates[0].id); }
    });
    const gkIdx = formation.findIndex(s => s.pos === "GK");
    if (gkIdx !== -1 && newSlots[gkIdx] == null) {
      const anyGK = squad.filter(p => p.position === "GK" && !used.has(p.id))
        .sort((a, b) => (a.injury ? 1 : 0) - (b.injury ? 1 : 0) || getOverall(b) - getOverall(a))[0];
      if (anyGK) { newSlots[gkIdx] = anyGK.id; used.add(anyGK.id); }
    }
    formation.forEach((_, i) => {
      if (newSlots[i] != null) return;
      const best = available.filter(p => !used.has(p.id)).sort((a, b) => getOverall(b) - getOverall(a));
      if (best.length > 0) { newSlots[i] = best[0].id; used.add(best[0].id); }
    });
    const benchPool = available.filter(p => !used.has(p.id));
    const benchIds = [];
    const sectionNeeds = [
      { positions: ["GK"] }, { positions: ["CB", "LB", "RB"] },
      { positions: ["CM", "AM"] }, { positions: ["LW", "RW", "ST"] },
    ];
    const benchUsed = new Set();
    for (const need of sectionNeeds) {
      const pick = benchPool
        .filter(p => (need.positions.includes(p.position) || need.positions.some(pos => p.learnedPositions?.includes(pos))) && !benchUsed.has(p.id))
        .sort((a, b) => getOverall(b) - getOverall(a))[0];
      if (pick) { benchIds.push(pick.id); benchUsed.add(pick.id); }
    }
    const rest = benchPool.filter(p => !benchUsed.has(p.id)).sort((a, b) => getOverall(b) - getOverall(a));
    for (const p of rest) { if (benchIds.length >= 5) break; benchIds.push(p.id); }
    benchIds.sort((a, b) => (POSITION_ORDER[squad.find(p => p.id === a)?.position] || 0) - (POSITION_ORDER[squad.find(p => p.id === b)?.position] || 0));
    benchIds.forEach((id, i) => { newSlots[11 + i] = id; });
    setSlotAssignments(newSlots);
    const newXI = [], newBench = [];
    newSlots.forEach((pid, i) => { if (pid == null) return; if (i < 11) newXI.push(pid); else newBench.push(pid); });
    setStartingXI(newXI);
    setBench(newBench);
  }, [squad, formation]);

  const handleInboxChoice = useCallback((msg, choice) => {
    const SQUAD_CAP = 25;
    if (msg.type === "trial_offer") {
      if (choice === "accept" && msg.trialPlayerData) {
        if (useGameStore.getState().squad.filter(p => !p.isLegend).length >= SQUAD_CAP) {
          setSquadFullAlert(true);
          return false;
        }
        const tp = { ...msg.trialPlayerData };
        setSquad(prev => [...prev, tp]);
        setTrialPlayer(tp);
        SFX.reveal();
        setStoryArcs(prev => {
          const next = {...prev};
          ARC_CATS.forEach(cat => {
            const cs = next[cat];
            if (!cs || cs.completed) return;
            next[cat] = {...cs, tracking:{...(cs.tracking||{}), trialAccepted:true}};
          });
          return next;
        });
      } else if (choice === "decline" && msg.trialPlayerData) {
        if (!unlockedAchievements.has("opportunity_cost")) {
          setUnlockedAchievements(prev => { const n = new Set(prev); n.add("opportunity_cost"); return n; });
          setAchievementQueue(prev => [...prev, "opportunity_cost"]);
        }
        const rivals = useGameStore.getState().league?.teams?.filter(t => !t.isPlayer) || [];
        const rival = rivals[rand(0, rivals.length - 1)];
        const tp = msg.trialPlayerData;
        const trialAtWeek = (week || 1) + rand(3, 6);
        setTrialHistory(prev => [...prev, {
          name: tp.name, position: tp.position, nationality: tp.nationality,
          flag: tp.flag, countryLabel: tp.countryLabel,
          rivalTeam: rival?.name || "a rival club", rivalTier: leagueTier,
          declined: true, impressed: false, departureSeason: seasonNumber,
          phase: "on_trial",
        }]);
        setInboxMessages(prev => [...prev, {
          id: `msg_trial_followup_${Date.now()}`,
          week: trialAtWeek, season: seasonNumber,
          icon: "📰", color: C.blue,
          title: `${tp.name} On Trial at ${rival?.name || "Rival"}`,
          body: `${tp.name} ${tp.flag} has gone on trial at ${rival?.name || "a rival club"}. They're giving him the chance you didn't.`,
          read: false, pendingUntilWeek: trialAtWeek,
        }]);
      }
    }
    if (msg.type === "prodigal_offer") {
      if (choice === "accept" && msg.prodigalPlayerData) {
        if (useGameStore.getState().squad.filter(p => !p.isLegend).length >= SQUAD_CAP) {
          setSquadFullAlert(true);
          return false;
        }
        const pp = { ...msg.prodigalPlayerData };
        setSquad(prev => [...prev, pp]);
        setProdigalSon(prev => prev ? { ...prev, phase: "active" } : prev);
        SFX.reveal();
      } else {
        setProdigalSon(prev => prev ? { ...prev, phase: "declined" } : prev);
      }
    }
    if (msg.type === "free_agent_offer") {
      if (choice === "accept" && msg.freeAgentData) {
        if (useGameStore.getState().squad.filter(p => !p.isLegend).length >= SQUAD_CAP) {
          setSquadFullAlert(true);
          return false;
        }
        const fa = { ...msg.freeAgentData, isFreeAgent: false, fromTransferInsider: true };
        setSquad(prev => [...prev, fa]);
        setPendingFreeAgent(null);
        setFreeAgentSignings(prev => prev + 1);
        SFX.reveal();
      } else {
        setPendingFreeAgent(null);
      }
    }
    if (msg.type === "poach_event" && msg.poachPlayers) {
      const idx = parseInt(choice, 10);
      const chosen = msg.poachPlayers[idx];
      if (chosen) {
        if (useGameStore.getState().squad.filter(p => !p.isLegend).length >= SQUAD_CAP) {
          setSquadFullAlert(true);
          return false;
        }
        setSquad(prev => [...prev, { ...chosen, isFreeAgent: false }]);
        SFX.reveal();
        // The other 2 go to top AI team — boost their strength slightly
        const rivalIdx = msg.poachRivalIdx;
        setLeague(prev => {
          if (!prev || !prev.teams[rivalIdx]) return prev;
          const teams = prev.teams.map((t, i) => i === rivalIdx ? { ...t, strength: Math.min(1, t.strength + 0.03) } : t);
          return { ...prev, teams };
        });
      }
    }
    if (msg.type === "asst_mgr_training_intro" || msg.type === "asst_mgr_training_nudge") {
      if (choice === "delegate") {
        setSquad(prev => prev.map(p => ({ ...p, training: p.training || "balanced" })));
        setTrainedThisWeek(new Set(useGameStore.getState().squad.map(p => p.id)));
      }
    }
  }, [week, leagueTier, seasonNumber, unlockedAchievements]); // eslint-disable-line

  const assignTraining = useCallback((playerId, trainingKey) => {
    setSquad(prev => prev.map(p =>
      p.id === playerId ? { ...p, training: trainingKey } : p
    ));
    setTrainedThisWeek(prev => new Set([...prev, playerId]));
  }, []);

  const assignPositionTraining = useCallback((playerId, targetPos) => {
    setSquad(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const weeks = getPositionTrainingWeeks(p.position, targetPos);
      if (weeks === 0) return p; // Can't train same position
      const learned = p.learnedPositions || [];
      if (learned.includes(targetPos)) return p; // Already learned
      return {
        ...p,
        positionTraining: { targetPos, weeksLeft: weeks, totalWeeks: weeks },
        training: null, // Clear regular training while doing position training
      };
    }));
  }, []);

  const advanceWeek = useCallback(() => {
    if (processing || !league) return;

    // Clear stale summer state if data is missing
    if (summerPhase && summerPhase !== "break" && !summerData) {
      setSummerPhase(null);
    }
    if (summerPhase) return; // all summer phases block advanceWeek; use advanceSummer() instead

    // Season end — calendar exhausted, or (no calendar) matchweekIndex past all fixtures
    const totalFix = league.fixtures?.length || 18;
    const calendarDone = useGameStore.getState().seasonCalendar && useGameStore.getState().calendarIndex >= useGameStore.getState().seasonCalendar.length;
    const noCalendarFallback = !useGameStore.getState().seasonCalendar && matchweekIndex >= totalFix;
    if (calendarDone || noCalendarFallback) {
      if (!summerPhase) {
        const sorted = sortStandings(league.table);
        const playerIdx = sorted.findIndex(r => league.teams[r.teamIndex]?.isPlayer);
        const position = playerIdx + 1;
        const currentTier = league.tier || leagueTier;
        let newTier = currentTier;
        let moveType = "stayed";
        // Promotion logic: mini-tournament tiers — all 3 promo spots from tournament results
        const mod = getModifier(currentTier);
        const mBkt = useGameStore.getState().miniTournamentBracket;
        if (mod.miniTournament && currentTier > 1 && mBkt) {
          const isWinner = mBkt.winner?.isPlayer;
          const derivedRunnerUp = mBkt.runnerUp || (mBkt.winner && mBkt.final?.home && mBkt.final?.away ? (mBkt.winner.name === mBkt.final.home.name ? mBkt.final.away : mBkt.final.home) : null);
          const isRunnerUp = derivedRunnerUp?.isPlayer;
          const is3rdPlace = (mBkt.thirdPlaceWinner || mBkt.thirdPlace?.winner)?.isPlayer;
          if (isWinner || isRunnerUp || is3rdPlace) { newTier = currentTier - 1; moveType = "promoted"; }
          else if (position >= sorted.length - 2 && currentTier < NUM_TIERS) { newTier = currentTier + 1; moveType = "relegated"; }
        } else {
          // Standard: top 3 promoted (if not already at the top)
          if (position <= 3 && currentTier > 1) { newTier = currentTier - 1; moveType = "promoted"; }
          // Bottom 3 relegated (if not already at the bottom)
          else if (position >= sorted.length - 2 && currentTier < NUM_TIERS) { newTier = currentTier + 1; moveType = "relegated"; }
        }
        // Process roster swaps for recovery path too
        const currentRosters = leagueRosters || initLeagueRosters();
        const swapResult = processSeasonSwaps(currentRosters, league, currentTier, allLeagueStates);
        setLeagueRosters(swapResult.rosters);
        const recoveryPlayerRow = league?.table?.find(r => league.teams[r.teamIndex]?.isPlayer);
        setSummerData({
          moveType, fromTier: currentTier, toTier: newTier, position,
          leagueName: league.leagueName || LEAGUE_DEFS[currentTier].name,
          newLeagueName: LEAGUE_DEFS[newTier].name,
          newRosters: swapResult.rosters,
          isInvincible: position === 1 && recoveryPlayerRow?.lost === 0,
        });
        // Season-end sentiment swings (recovery path)
        if (moveType === "promoted") { setFanSentiment(Math.min(100, useGameStore.getState().fanSentiment + 20)); setBoardSentiment(Math.min(100, useGameStore.getState().boardSentiment + 25)); }
        if (moveType === "relegated") { setFanSentiment(Math.max(0, useGameStore.getState().fanSentiment - 20)); setBoardSentiment(Math.max(0, useGameStore.getState().boardSentiment - 25)); }
        if (position === 1) { setFanSentiment(Math.min(100, useGameStore.getState().fanSentiment + 10)); setBoardSentiment(Math.min(100, useGameStore.getState().boardSentiment + 10)); }
        setSummerPhase("awaiting_end");

        // === STORY ARC SEASON-END TRACKING (recovery path) ===
        {
          const cupWon = cup && !cup.playerEliminated && (() => {
            const rKeys = Object.keys(cup.rounds || {}).map(Number).sort((a,b)=>a-b);
            if (rKeys.length === 0) return false;
            const finalRound = cup.rounds[rKeys[rKeys.length-1]];
            return finalRound?.matches?.some(m => m.result?.winner?.isPlayer);
          })();
          setStoryArcs(prev => resolveSeasonEndArcs(prev, position, cupWon));
        }
      }
      return;
    }
    if (summerPhase) return;

    setProcessing(true);
    if (!useGameStore.getState().isOnHoliday) {
      // Navigate to Home so GainPopup (which renders inside the Home/Squad branch) is visible
      setShowAchievements(false); setShowTable(false); setShowCalendar(false);
      setShowCup(false); setShowTransfers(false); setShowLegends(false); setShowSquad(false);
      SFX.advance();
      setWeekTransition(true);
    }
    setReadsThisWeek(0);
    setRecentOvrLevelUps(null);
    weekRecoveriesRef.current = [];

    // === PRE-COMPUTE ALL ARC EFFECTS SYNCHRONOUSLY ===
    // Must happen before any setState calls — see precomputeArcEffects() for why
    const arcSnap = storyArcsRef.current || storyArcs;
    const gs = { squad, league, prodigalSon, trialPlayer, trialHistory, leagueTier,
                 consecutiveWins, halfwayPosition, cup };
    const arcFx = precomputeArcEffects(arcSnap, gs, prodigalSon);
    pendingFinalRewardRef.current = arcFx.pendingFinalRewards;

    setStoryArcs(prev => {
      const next = {...prev};
      ARC_CATS.forEach(cat => {
        const cs = next[cat];
        if (!cs || cs.completed || !cs.focus) return;
        const arc = getArcById(cs.arcId);
        if (!arc) return;
        const newFocus = {...cs.focus, weeksLeft: cs.focus.weeksLeft - 1};
        if (newFocus.weeksLeft <= 0) {
          const step = arc.steps[cs.step];
          const opt = step[newFocus.choice];
          if (opt?.fx?.bonus) {
            const nb = {...(next.bonuses || {})};
            Object.entries(opt.fx.bonus).forEach(([k,v]) => { nb[k] = (nb[k]||0) + v; });
            next.bonuses = nb;
          }
          next[cat] = {...cs, step: cs.step + 1, focus: null};
          if (!useGameStore.getState().isOnHoliday) {
            const focusNarr = getFocusNarrative(arc.id, newFocus.choice, opt.name);
            setArcStepQueue(q => [...q, {
              arcId:arc.id, arcName:arc.name, arcIcon:arc.icon, cat,
              stepIdx:cs.step, stepDesc:`${opt.name} (${opt.w} weeks)`,
              narrative:focusNarr, gains:opt.desc, isComplete:false,
            }]);
          }
        } else {
          next[cat] = {...cs, focus: newFocus};
        }
      });
      // Decrement injury shield
      if (next.bonuses?.injuryShield > 0) {
        next.bonuses = {...next.bonuses, injuryShield: next.bonuses.injuryShield - 1};
        if (next.bonuses.injuryShield <= 0) delete next.bonuses.injuryShield;
      }
      return next;
    });

    // === AUTO-SELECT FOCUS CHOICES DURING HOLIDAY MODE ===
    if (useGameStore.getState().isOnHoliday) {
      setStoryArcs(prev => {
        const next = {...prev};
        let autoSelected = false;
        ARC_CATS.forEach(cat => {
          const cs = next[cat];
          if (!cs || cs.completed) return;
          const arc = getArcById(cs.arcId);
          if (!arc) return;
          const step = arc.steps[cs.step];
          // If current step is a focus step with no choice made, auto-select option A
          if (step && step.t === "focus" && !cs.focus) {
            const opt = step.a; // Always choose option A during holiday mode
            next[cat] = {...cs, focus: {choice: "a", weeksLeft: opt.w}};
            autoSelected = true;
          }
        });
        return autoSelected ? next : prev;
      });
    }

    // === STORY ARC CONDITION CHECK ===
    setStoryArcs(prev => {
      const next = {...prev};
      const gs = { squad, league, prodigalSon, trialPlayer, trialHistory, leagueTier,
                   consecutiveWins, halfwayPosition, cup };
      let changed = false;
      ARC_CATS.forEach(cat => {
        const cs = next[cat];
        if (!cs || cs.completed) return;
        const arc = getArcById(cs.arcId);
        if (!arc) return;
        const step = arc.steps[cs.step];
        if (!step || step.t !== "cond") return;
        if (checkArcCond(step, cs.tracking, gs)) {
          next[cat] = {...cs, step: cs.step + 1};
          changed = true;
          // Notification
          const narr = getStepNarrative(arc.id, cs.step, cs.tracking, squad);
          // Check if arc is now complete
          if (cs.step + 1 >= arc.steps.length) {
            // pendingFinalRewardRef is set in synchronous pre-computation above (not here — updaters run too late)
            const result = processArcCompletion(arc, cs, next.completed, next.bonuses, { unlockedAchievements, seasonNumber, week });
            next.bonuses = result.bonuses;
            next.completed = result.completed;
            next[cat] = {...next[cat], completed: true};
            if (result.achievements.length > 0) {
              setUnlockedAchievements(prev => { const n = new Set(prev); result.achievements.forEach(a => n.add(a)); return n; });
              setAchievementQueue(prev => { const ex = new Set(prev); const f = result.achievements.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
            }
            setInboxMessages(pm => [...pm, {
              id: `msg_arc_${arc.id}_${Date.now()}`, week: (week||1)+1, season: seasonNumber,
              icon: "🏆", color: C.amber,
              title: `Arc Complete: ${arc.name}`,
              body: `${arc.rewardDesc}`,
              read: false,
            }]);
            if (!useGameStore.getState().isOnHoliday) {
              setArcStepQueue(q => [...q, {
                arcId:arc.id, arcName:arc.name, arcIcon:arc.icon, cat,
                stepIdx:cs.step, stepDesc:step.desc, narrative:narr,
                isComplete:true, rewardDesc:arc.rewardDesc,
              }]);
            }
          } else {
            if (!useGameStore.getState().isOnHoliday) {
              setArcStepQueue(q => [...q, {
                arcId:arc.id, arcName:arc.name, arcIcon:arc.icon, cat,
                stepIdx:cs.step, stepDesc:step.desc, narrative:narr,
                isComplete:false,
              }]);
            }
          }
        }
      });
      return changed ? next : prev;
    });

    // Left On Read — 10+ unread inbox messages
    if (!unlockedAchievements.has("left_on_read")) {
      const unreadCount = (inboxMessages || []).filter(m => !m.read && isMessageVisible(m, week || 1)).length;
      if (unreadCount >= 10) {
        setUnlockedAchievements(prev => { const n = new Set(prev); n.add("left_on_read"); return n; });
        setAchievementQueue(prev => [...prev, "left_on_read"]);
      }
    }

    // Check training focus mass achievements at moment of advance
    const focusUnlocks = checkAchievements({
      squad, unlocked: unlockedAchievements,
      lastMatchResult: null, league, weekGains: null,
      startingXI, bench, matchweekIndex, trainedThisWeek,
      doubleTrainingWeek, usedTicketTypes, scoutedPlayers, transferFocus,
      clubRelationships, slotAssignments, formation,
      formationsWonWith, freeAgentSignings,
    });
    // Filter to only training-focus achievements (others checked elsewhere)
    const trainingFocusIds = ["only_fans", "npc", "finish_food", "gym_rats", "speed_freaks", "tinkerer", "double_pivot"];
    const focusOnly = focusUnlocks.filter(id => trainingFocusIds.includes(id));
    if (focusOnly.length > 0) {
      setUnlockedAchievements(prev => {
        const next = new Set(prev);
        focusOnly.forEach(id => next.add(id));
        return next;
      });
      setAchievementQueue(prev => { const ex = new Set(prev); const f = focusOnly.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
    }

    const weekGains = [];
    const weekInjuries = [];
    const weekDuos = [];
    const weekCardSkips = [];
    const weekRecoveries = [];
    const weekProgress = []; // notable progress events for training report

    // Compute new squad state but DON'T apply yet — store as pending
    const computeNewSquad = (prev) => {
      // Pre-pass: find duo partners (2+ non-injured players on same focused training)
      const focusGroups = {};
      prev.forEach(p => {
        if (p.injury || !p.training || p.training === "balanced") return;
        if (!focusGroups[p.training]) focusGroups[p.training] = [];
        focusGroups[p.training].push(p.id);
      });

      // For each group of 2+, ~15% chance a duo boost fires for a random pair
      const duoBoostedIds = new Set();
      const duoPairs = [];
      Object.entries(focusGroups).forEach(([trainingKey, ids]) => {
        if (ids.length < 2) return;
        if (Math.random() < 0.15) {
          const shuffled = [...ids].sort(() => Math.random() - 0.5);
          const pair = [shuffled[0], shuffled[1]];
          pair.forEach(id => duoBoostedIds.add(id));
          duoPairs.push({ ids: pair, trainingKey });
        }
      });

      // Track all progress events for selecting top ones to show
      const allProgressEvents = [];

      const newSquad = prev.map(p => {
        const newPlayer = { ...p, attrs: { ...p.attrs }, gains: {}, statProgress: { ...(p.statProgress || {}) }, history: [...p.history] };

        // Prodigal Son — deferred stat boost applied during training
        if (prodigalSon?.pendingBoost && p.id === prodigalSon.playerId) {
          const boosts = { pace: 4, physical: 3 };
          Object.entries(boosts).forEach(([attr, amount]) => {
            const oldVal = newPlayer.attrs[attr] || 0;
            const newVal = Math.min(p.legendCap || ovrCap, oldVal + amount);
            if (newVal > oldVal) {
              newPlayer.attrs[attr] = newVal;
              newPlayer.gains[attr] = (newPlayer.gains[attr] || 0) + (newVal - oldVal);
              newPlayer.statProgress[attr] = 0;
              weekGains.push({
                playerName: p.name, playerPosition: p.position,
                attr, oldVal, newVal: newVal, oldPips: 0, isProdigalBoost: true,
              });
            }
          });
        }

        // Position training countdown
        if (p.positionTraining && !p.injury) {
          const weeksLeft = p.positionTraining.weeksLeft - 1;
          if (weeksLeft <= 0) {
            // Training complete! Add to learned positions
            const learned = newPlayer.learnedPositions || [];
            if (!learned.includes(p.positionTraining.targetPos)) {
              newPlayer.learnedPositions = [...learned, p.positionTraining.targetPos];
              weekProgress.push({
                type: 'positionLearned',
                playerName: p.name,
                playerPosition: p.position,
                learnedPosition: p.positionTraining.targetPos,
              });
              // Xenomorph — Alien player learns a new position
              if (p.nationality === "ALN" && !unlockedAchievements.has("xenomorph")) {
                setUnlockedAchievements(prev => { const n = new Set(prev); n.add("xenomorph"); return n; });
                setAchievementQueue(prev => [...prev, "xenomorph"]);
              }
            }
            newPlayer.positionTraining = null;
          } else {
            newPlayer.positionTraining = { ...p.positionTraining, weeksLeft };
          }
        }

        if (p.injury) {
          const weeksLeft = p.injury.weeksLeft - 1;
          if (weeksLeft <= 0) {
            newPlayer.injury = null;
            weekRecoveries.push(p.name);
          } else {
            newPlayer.injury = { ...p.injury, weeksLeft };
          }
          // Injury drains some progress on a random stat
          const progressKeys = Object.keys(newPlayer.statProgress).filter(k => newPlayer.statProgress[k] > 0);
          if (progressKeys.length > 0) {
            const drainKey = progressKeys[rand(0, progressKeys.length - 1)];
            newPlayer.statProgress[drainKey] = Math.max(0, (newPlayer.statProgress[drainKey] || 0) - 0.15 - Math.random() * 0.2);
          }
          const snapshot = {};
          ATTRIBUTES.forEach(({ key }) => { snapshot[key] = newPlayer.attrs[key]; });
          newPlayer.history.push(snapshot);
          return newPlayer;
        }

        if (p.training) {
          const focus = TRAINING_FOCUSES.find(t => t.key === p.training);
          if (focus) {
            // Training injury check (4% chance) — skip if prodigal boost week
            const isProdigalBoostWeek = prodigalSon?.pendingBoost && p.id === prodigalSon.playerId;
            const injuryShield = storyArcs?.bonuses?.injuryShield > 0;
            const mod = getModifier(leagueTier);
            // Tier 8: Carded players skip training
            if (mod.cardSkipsTraining && cardedPlayerIdsRef.current.has(p.id)) {
              weekCardSkips.push(p.name);
              const snapshot = {};
              ATTRIBUTES.forEach(({ key }) => { snapshot[key] = newPlayer.attrs[key]; });
              newPlayer.history.push(snapshot);
              return newPlayer;
            }
            const baseInjuryChance = injuryShield ? 0.02 : 0.04; // halved with shield
            // Altitude Trials: PHY reduces injury susceptibility (PHY 10+ → 30% reduction)
            const phyResist = mod.exhaustionInjury ? Math.min(0.3, (p.attrs.physical || 0) * 0.03) : 0;
            const injuryChance = baseInjuryChance * (mod.injuryChanceMult || 1) * (1 - phyResist);
            if (!isProdigalBoostWeek && Math.random() < injuryChance) {
              // Altitude Trials: 30% chance the injury is Exhaustion specifically
              const inj = (mod.exhaustionInjury && Math.random() < 0.3)
                ? { name: "Exhaustion", weeksOut: 2 }
                : TRAINING_INJURIES[rand(0, TRAINING_INJURIES.length - 1)];
              newPlayer.injury = { name: inj.name, weeksLeft: inj.weeksOut };
              // Track distinct injury types on player (career-wide, for The Sick Note)
              newPlayer.injuryHistory = { ...(newPlayer.injuryHistory || {}), [inj.name]: true };
              if (Object.keys(newPlayer.injuryHistory).length >= 3 && !unlockedAchievements.has("the_sick_note")) {
                setUnlockedAchievements(prev => { const n = new Set(prev); n.add("the_sick_note"); return n; });
                setAchievementQueue(prev => [...prev, "the_sick_note"]);
              }
              const injEntry = { playerName: p.name, playerPosition: p.position, injury: inj.name, weeksOut: inj.weeksOut };
              // Tier 11: Concrete Schoolyard — injury may cost -1 to a non-trained ATTR
              if (mod.injuryAttrLossChance && Math.random() < mod.injuryAttrLossChance) {
                const trainedAttrs = new Set(focus.attrs);
                const lossable = ATTRIBUTES.filter(a => !trainedAttrs.has(a.key) && newPlayer.attrs[a.key] > 1);
                if (lossable.length > 0) {
                  const pick = lossable[rand(0, lossable.length - 1)];
                  newPlayer.attrs[pick.key] = newPlayer.attrs[pick.key] - 1;
                  injEntry.attrLoss = { attr: pick.key, label: pick.label, newVal: newPlayer.attrs[pick.key] };
                }
              }
              weekInjuries.push(injEntry);
              // Track injury type for Just A Niggle achievement
              setSeasonInjuryLog(prev => {
                const next = { ...prev };
                if (!next[p.name]) next[p.name] = {};
                next[p.name][inj.name] = (next[p.name][inj.name] || 0) + 1;
                // Check Just A Niggle: same injury type 3+ times
                if (next[p.name][inj.name] >= 3 && !unlockedAchievements.has("just_a_niggle")) {
                  setUnlockedAchievements(prev2 => { const n = new Set(prev2); n.add("just_a_niggle"); return n; });
                  setAchievementQueue(prev2 => [...prev2, "just_a_niggle"]);
                }
                return next;
              });
              duoBoostedIds.delete(p.id);
              const snapshot = {};
              ATTRIBUTES.forEach(({ key }) => { snapshot[key] = newPlayer.attrs[key]; });
              newPlayer.history.push(snapshot);
              return newPlayer;
            }

            // Per-player cap: legends and capBonus unlockables use their personal legendCap
            const playerCap = p.legendCap || ovrCap;

            // Duo boost: guaranteed boost to primary stat (Sunday League: +2)
            if (duoBoostedIds.has(p.id)) {
              const duoAmount = Math.min(mod.duoBoostAmount || 1, playerCap - newPlayer.attrs[focus.attrs[0]]);
              const attrKey = focus.attrs[0];
              const current = newPlayer.attrs[attrKey];
              if (current < playerCap) {
                const gain = Math.max(1, duoAmount);
                newPlayer.attrs[attrKey] = current + gain;
                newPlayer.gains[attrKey] = gain;
                newPlayer.statProgress[attrKey] = 0; // reset progress on level-up
                const duoPair = duoPairs.find(dp => dp.ids.includes(p.id));
                const partnerId = duoPair?.ids.find(id => id !== p.id);
                const partner = prev.find(pl => pl.id === partnerId);
                weekDuos.push({
                  playerName: p.name,
                  playerPosition: p.position,
                  partnerName: partner?.name || "???",
                  attr: attrKey,
                  oldVal: current,
                  newVal: current + gain,
                });
                const snapshot = {};
                ATTRIBUTES.forEach(({ key }) => { snapshot[key] = newPlayer.attrs[key]; });
                newPlayer.history.push(snapshot);
                return newPlayer;
              }
            }

            // === PROGRESS-BASED TRAINING ===
            // Tier 2 (World XI Invitational): normal training disabled
            if (!mod.trainingDisabled) {
            const overall = getOverall(p);
            const isFocused = focus.attrs.length === 1;

            focus.attrs.forEach(attrKey => {
              const current = newPlayer.attrs[attrKey];
              if (current >= playerCap) return;

              const focusMultiplier = isFocused ? 1.0 : 0.22;
              // Unlockable players use an effective age based on their 10-year career arc
              let trainingAge = p.age;
              if (p.isUnlockable && p.unlockableJoinedSeason) {
                const seasonsAtClub = Math.max(0, (seasonNumber || 1) - p.unlockableJoinedSeason);
                const ageWhenSigned = p.age - seasonsAtClub;
                if (ageWhenSigned >= 20) {
                  // Map 10-season career to normal age curve (21-36)
                  trainingAge = 21 + (seasonsAtClub / 10) * 15;
                }
              }
              // Appearance rate gates the potential training bonus
              const starts = p.seasonStarts || 0;
              const subApps = p.seasonSubApps || 0;
              const effectiveApps = starts + subApps * 0.4;
              const matchesPlayed = useGameStore.getState().matchweekIndex || 1;
              const appearanceRate = Math.min(1, effectiveApps / Math.max(1, matchesPlayed));
              const rawProgress = getTrainingProgress(current, trainingAge, p.potential, overall, appearanceRate, playerCap);
              // Story arc training bonuses
              const arcBonuses = storyArcs?.bonuses || {};
              let arcMult = 1 + (arcBonuses.trainSpeedMult || 0);
              if (attrKey === "mental" && arcBonuses.mentalTrainMult) arcMult += arcBonuses.mentalTrainMult;
              const doubleMult = useGameStore.getState().doubleTrainingWeek ? 2 : 1;
              const dojoMult = mod.trainingSpeedMult || 1;
              const progressGain = rawProgress * focusMultiplier * arcMult * doubleMult * dojoMult;

              const oldProgress = newPlayer.statProgress[attrKey] || 0;
              const newProgress = oldProgress + progressGain;

              if (newProgress >= 1.0) {
                // STAT LEVEL UP!
                newPlayer.attrs[attrKey] = Math.min(playerCap, current + 1);
                newPlayer.gains[attrKey] = 1;
                newPlayer.statProgress[attrKey] = Math.max(0, newProgress - 1.0); // keep overflow
                const priorPips = progressToPips(oldProgress);
                weekGains.push({
                  playerName: p.name,
                  playerPosition: p.position,
                  attr: attrKey,
                  oldVal: current,
                  newVal: current + 1,
                  oldPips: priorPips,
                });
              } else {
                newPlayer.statProgress[attrKey] = newProgress;
                // Track for progress report (only focused training, not general)
                if (isFocused) {
                  const oldPips = progressToPips(oldProgress);
                  const newPips = progressToPips(newProgress);
                  allProgressEvents.push({
                    playerName: p.name,
                    playerPosition: p.position,
                    attr: attrKey,
                    statVal: current,
                    oldProgress: oldProgress,
                    newProgress: newProgress,
                    oldPips,
                    newPips,
                    pipCrossed: newPips > oldPips,
                    notability: progressGain * (current / 10 + 0.5), // weight by stat level
                  });
                }
              }
            });
            } // end trainingDisabled guard

            // Age-based stat decay (33+): small chance each week a random non-trained stat drops
            // Unlockable players use effective age based on 10-year career arc
            let decayAge = p.age;
            if (p.isUnlockable && p.unlockableJoinedSeason) {
              const seasonsAtClub = Math.max(0, (seasonNumber || 1) - p.unlockableJoinedSeason);
              const ageWhenSigned = p.age - seasonsAtClub;
              if (ageWhenSigned >= 20) {
                decayAge = 21 + (seasonsAtClub / 10) * 15;
              }
            }
            if (decayAge >= 33) {
              let decayChance = decayAge >= 38 ? 0.12 : decayAge >= 35 ? 0.07 : 0.03;
              // Prodigy / Veteran tags halve stat decay
              if (p.tags?.includes("Prodigy") || p.tags?.includes("Veteran")) decayChance *= 0.5;
              if (Math.random() < decayChance) {
                const nonFocusAttrs = ATTRIBUTES.map(a => a.key).filter(k => !focus.attrs.includes(k));
                if (nonFocusAttrs.length > 0) {
                  const decayAttr = nonFocusAttrs[rand(0, nonFocusAttrs.length - 1)];
                  if (newPlayer.attrs[decayAttr] > 1) {
                    newPlayer.attrs[decayAttr]--;
                  }
                }
              }
            }
          }
        }

        const snapshot = {};
        ATTRIBUTES.forEach(({ key }) => { snapshot[key] = newPlayer.attrs[key]; });
        newPlayer.history.push(snapshot);

        return newPlayer;
      });

      // Select top 3 most notable progress events for the training report
      // Prefer: pip boundary crossings, then highest notability
      const gainedStats = new Set(weekGains.map(g => `${g.playerName}:${g.attr}`));
      const duoStats = new Set(weekDuos.map(d => `${d.playerName}:${d.attr}`));
      const eligible = allProgressEvents.filter(e => !gainedStats.has(`${e.playerName}:${e.attr}`) && !duoStats.has(`${e.playerName}:${e.attr}`));
      eligible.sort((a, b) => {
        if (a.pipCrossed !== b.pipCrossed) return a.pipCrossed ? -1 : 1;
        return b.notability - a.notability;
      });
      eligible.slice(0, 3).forEach(e => weekProgress.push(e));

      return newSquad;
    };

    // Compute but don't apply — store as pending
    // CRITICAL: Use useGameStore.getState().squad for fresh data, not stale squad from closure!
    let newSquad = computeNewSquad(useGameStore.getState().squad);

    // Snapshot before resetting — used for Sweat Equity achievement
    const wasDoubleTraining = useGameStore.getState().doubleTrainingWeek;

    // Reset double training flag after it's been consumed
    if (useGameStore.getState().doubleTrainingWeek) setDoubleTrainingWeek(false);

    // Apply arc focus effects that completed this week, derived directly from arcSnap
    // (arcSnap was captured at the top of advanceWeek before any setState calls)
    let arcBoostGains = [];
    let cappedArcTickets = [];
    let juicedThisWeek = false;
    ARC_CATS.forEach(cat => {
      const cs = arcSnap[cat];
      if (!cs || cs.completed || !cs.focus) return;
      if (cs.focus.weeksLeft - 1 > 0) return; // not the final week
      const arc = getArcById(cs.arcId);
      if (!arc) return;
      const step = arc.steps[cs.step];
      const opt = step?.[cs.focus.choice];
      if (!opt?.fx) return;
      const fx = opt.fx;
      const intendedAttrBoost = !!(fx.stats || fx.mode || fx.target || fx.prodigal || fx.squad || fx.top3);
      // Snapshot pre-boost stats to compute diffs
      const preBoost = {};
      newSquad.forEach(p => {
        preBoost[p.id] = {};
        ATTRIBUTES.forEach(({key}) => { preBoost[p.id][key] = p.attrs[key]; });
      });
      const arcResult = applyArcFx(fx, newSquad, cs.tracking?.targetId, prodigalSon?.playerId, {}, ovrCap);
      newSquad = arcResult.squad;
      if (fx.squad && fx.mode === "all") juicedThisWeek = true;
      // Compute diffs for training cards
      const _focusFilterLabels = { DEF: "Defenders", MID: "Midfielders", FWD: "Forwards", GK: "Goalkeepers" };
      const focusFilterLabel = fx.filter ? _focusFilterLabels[fx.filter] : null;
      let gainCount = 0;
      newSquad.forEach(p => {
        if (!preBoost[p.id]) return;
        ATTRIBUTES.forEach(({key}) => {
          const diff = p.attrs[key] - (preBoost[p.id][key] || 0);
          if (diff > 0) {
            gainCount++;
            arcBoostGains.push({
              playerName: p.name,
              playerPosition: p.position,
              attr: key,
              oldVal: preBoost[p.id][key],
              newVal: p.attrs[key],
              isArcBoost: true,
              sourceKey: `focus_${cat}`,
              filterLabel: focusFilterLabel,
            });
            p.gains[key] = (p.gains[key] || 0) + diff;
          }
        });
      });
      // If arc intended attr boosts but all were capped, offer ticket choice instead
      if (intendedAttrBoost && gainCount === 0) {
        const shuffled = [...ARC_TICKET_POOL].sort(() => Math.random() - 0.5);
        cappedArcTickets.push({
          arcName: opt.name || arc.name,
          choices: shuffled.slice(0, 3),
        });
      }
    });

    // Apply any pending arc FINAL REWARD effects (pre-computed synchronously above, or set during arc completion)
    if (pendingFinalRewardRef.current && pendingFinalRewardRef.current.length > 0) {
      const appliedIds = [];
      for (const reward of pendingFinalRewardRef.current) {
        const { arc, targetId, prodigalId } = reward;
        const preBoost = {};
        newSquad.forEach(p => {
          preBoost[p.id] = {};
          ATTRIBUTES.forEach(({key}) => { preBoost[p.id][key] = p.attrs[key]; });
        });
        const rewardResult = applyFinalReward(arc, newSquad, targetId, prodigalId, {}, ovrCap);
        newSquad = rewardResult.squad;
        if (arc.finalFx.squadAll) juicedThisWeek = true;
        const ffx = arc.finalFx;
        const finalIntendedBoost = !!(ffx.targetWeakest || ffx.squadStats || ffx.squadAll);
        let finalGainCount = 0;
        newSquad.forEach(p => {
          if (!preBoost[p.id]) return;
          ATTRIBUTES.forEach(({key}) => {
            const diff = p.attrs[key] - (preBoost[p.id][key] || 0);
            if (diff > 0) {
              finalGainCount++;
              arcBoostGains.push({
                playerName: p.name,
                playerPosition: p.position,
                attr: key,
                oldVal: preBoost[p.id][key],
                newVal: p.attrs[key],
                isArcBoost: true,
                sourceKey: `reward_${arc.id}`,
              });
              p.gains[key] = (p.gains[key] || 0) + diff;
            }
          });
        });
        if (finalIntendedBoost && finalGainCount === 0) {
          const shuffled = [...ARC_TICKET_POOL].sort(() => Math.random() - 0.5);
          cappedArcTickets.push({ arcName: arc.name, choices: shuffled.slice(0, 3) });
        }
        appliedIds.push(arc.id);
      }
      pendingFinalRewardRef.current = null;
      setStoryArcs(prev => {
        const n = {...prev};
        if (n.pendingFinalReward) delete n.pendingFinalReward;
        if (n.extraPendingRewards) delete n.extraPendingRewards;
        n.rewardsApplied = [...(n.rewardsApplied || []), ...appliedIds];
        return n;
      });
    }

    if (juicedThisWeek && !unlockedAchievements.has("juiced")) {
      setUnlockedAchievements(prev => { const n = new Set(prev); n.add("juiced"); return n; });
      setAchievementQueue(prev => [...prev, "juiced"]);
    }

    // === SENTIMENT WEEKLY DRIFT ===
    {
      const curFan = useGameStore.getState().fanSentiment;
      const curBoard = useGameStore.getState().boardSentiment;
      let fanDelta = curFan > 55 ? -0.5 : curFan < 45 ? 0.5 : 0;
      let boardDelta = curBoard > 55 ? -0.5 : curBoard < 45 ? 0.5 : 0;
      if (consecutiveWins >= 3) fanDelta += 2;
      // Board: league position bonus/penalty after halfway point
      const _totalMDs = useGameStore.getState().league?.fixtures?.length || 18;
      if (useGameStore.getState().matchweekIndex > _totalMDs / 2) {
        const _sortedT = [...(useGameStore.getState().league?.table || [])].sort(
          (a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
        );
        const _pIdx = useGameStore.getState().league?.teams?.findIndex(t => t.isPlayer);
        const _pos = _pIdx != null ? _sortedT.findIndex(r => r.teamIndex === _pIdx) + 1 : 0;
        const _total = _sortedT.length;
        if (_pos > 0 && _pos <= 3 && leagueTier > 1) boardDelta += 2;
        if (_pos > 0 && _pos >= _total - 2 && leagueTier < NUM_TIERS) boardDelta -= 2;
      }
      if (curFan > 75) boardDelta += 1;
      if (curFan < 25) boardDelta -= 1;
      // World XI Invitational: fan sentiment swings amplified
      const fanSentMult = getModifier(leagueTier).fanSentimentMult || 1;
      fanDelta = fanDelta * fanSentMult;
      const newFan = Math.max(0, Math.min(100, curFan + fanDelta));
      // Federation: board scrutiny multiplier on negative deltas
      const weekScrutiny = getModifier(leagueTier).boardScrutinyMult || 1;
      if (boardDelta < 0) boardDelta = boardDelta * weekScrutiny;
      const newBoard = Math.max(0, Math.min(100, curBoard + boardDelta));
      setFanSentiment(newFan);
      setBoardSentiment(newBoard);
      // Board bonus ticket every 8 weeks when sentiment > 75
      const _wk = useGameStore.getState().calendarIndex;
      if (newBoard > 75 && _wk > 0 && _wk % 8 === 0) {
        const _picks = ["random_attr", "double_session", "relation_boost", "transfer_insider"];
        const _pick = _picks[Math.floor(Math.random() * _picks.length)];
        setTickets(prev => [...prev, { id: `ticket_board_${Date.now()}`, type: _pick }]);
        setInboxMessages(prev => [...prev, {
          id: `msg_board_ticket_${Date.now()}`, week: week, season: seasonNumber,
          icon: "🎫", color: C.amber, title: "Board Reward",
          body: `The board are impressed with your work. They've sent over a ${TICKET_DEFS[_pick]?.name || "gift"} as a token of their confidence.`,
          read: false,
        }]);
      }
      // Board warning when < 25, rate-limited to every 4 weeks
      if (newBoard < 25 && _wk - boardWarnWeekRef.current >= 4) {
        boardWarnWeekRef.current = _wk;
        const isIronman = useGameStore.getState().gameMode === "ironman" && !useGameStore.getState().ultimatumActive;
        const nextCount = isIronman ? useGameStore.getState().boardWarnCount + 1 : 0;

        if (isIronman && nextCount >= 3) {
          // 3rd strike: skip concern message, deliver ultimatum directly
          setBoardWarnCount(0);
          const target = leagueTier <= 3 ? 7 : leagueTier <= 7 ? 6 : 5;
          setUltimatumTarget(target);
          setUltimatumPtsEarned(0);
          setUltimatumGamesLeft(5);
          setUltimatumActive(true);
          setInboxMessages(prev => [...prev, {
            id: `msg_ultimatum_${Date.now()}`, week: week, season: seasonNumber,
            icon: "⚠️", color: C.lightRed, title: "Board Ultimatum",
            body: `Results have fallen well below what we expect. You have five league matches to earn at least ${target} points, or we will be forced to make a change.`,
            read: false,
          }]);
        } else {
          // Warning 1 or 2: concern message with escalating tone
          const isSecond = isIronman && nextCount === 2;
          setInboxMessages(prev => [...prev, {
            id: `msg_board_warn_${Date.now()}`, week: week, season: seasonNumber,
            icon: "📋", color: C.lightRed, title: "Board Concern",
            body: isSecond
              ? "The board met again this morning. This is the second time we've had to raise this — results must improve immediately. Do not make us do this again."
              : "The board has requested a meeting. Results need to improve — patience is wearing thin.",
            read: false,
          }]);
          if (isIronman) setBoardWarnCount(nextCount);
        }
      }
    }

    // === HOLIDAY MODE: APPLY SQUAD DIRECTLY, SKIP POPUP ===
    if (useGameStore.getState().isOnHoliday) {
      // Apply squad changes immediately, no popup
      setSquad(newSquad);
      setWeek(w => w + 1);
      setTrainedThisWeek(new Set());
      // Don't set gains (no popup to show them)
      weekRecoveriesRef.current = weekRecoveries;
      revealedInjuryCount.current = 0;

      // Snapshot OVR for progress chart
      const ovrSnap = {};
      newSquad.forEach(p => {
        const key = `${p.name}|${p.position}`;
        ovrSnap[key] = getOverall(p);
      });
      setOvrHistory(prev => [...prev, { w: (week || 1) + 1, s: seasonNumber || 1, p: ovrSnap }]);

      // Clear prodigal boost flag
      if (prodigalSon?.pendingBoost) {
        setProdigalSon(prev => prev ? { ...prev, pendingBoost: false } : prev);
      }

      // Compute + process trial countdown (normally happens after the holiday return,
      // but holiday path returns early, so we must do it here using fresh squad data)
      try {
        const freshTP = useGameStore.getState().squad.find(p => p.isTrial);
        if (freshTP) {
          const wasInXI = startingXI.includes(freshTP.id);
          const twl = freshTP.trialWeeksLeft - 1;
          const tns = (freshTP.trialStarts || 0) + (wasInXI ? 1 : 0);
          if (twl <= 0) {
            const trainedP = useGameStore.getState().squad.find(p => p.id === freshTP.id) || freshTP;
            if (tns > 0) {
              pendingTrialAction.current = {
                type: "impressed", id: freshTP.id, name: freshTP.name, position: freshTP.position,
                nationality: freshTP.nationality, flag: freshTP.flag, countryLabel: freshTP.countryLabel,
                attrs: { ...trainedP.attrs }, potential: freshTP.potential, starts: tns,
                season: seasonNumber, week: (week || 1) + 1,
              };
            } else {
              const rivals = (useGameStore.getState().league || league)?.teams?.filter(t => !t.isPlayer) || [];
              const rival = rivals.length > 0 ? rivals[rand(0, rivals.length - 1)] : null;
              pendingTrialAction.current = {
                type: "no_starts", id: freshTP.id, name: freshTP.name, position: freshTP.position,
                nationality: freshTP.nationality, flag: freshTP.flag, countryLabel: freshTP.countryLabel,
                rivalTeam: rival?.name || "a rival club", season: seasonNumber, week: (week || 1) + 1,
              };
            }
          } else {
            pendingTrialAction.current = { type: "continue", id: freshTP.id, newWeeksLeft: twl, newStarts: tns };
          }
        }
      } catch(err) { console.error("Holiday trial countdown error:", err); }

      // Process trial player actions (computed just above)
      const trialAction = pendingTrialAction.current;
      pendingTrialAction.current = null;
      try {
        if (trialAction) {
          if (trialAction.type === "impressed") {
            setSquad(prev => prev.filter(p => p.id !== trialAction.id));
            setStartingXI(prev => prev.filter(id => id !== trialAction.id));
            setBench(prev => prev.filter(id => id !== trialAction.id));
            setTrialPlayer(null);
            setTrialHistory(prev => [...prev, {
              name: trialAction.name, position: trialAction.position,
              nationality: trialAction.nationality, flag: trialAction.flag,
              countryLabel: trialAction.countryLabel, attrs: trialAction.attrs,
              potential: trialAction.potential, starts: trialAction.starts,
              impressed: true, signed: false, season: trialAction.season,
            }]);
            setInboxMessages(prev => [...prev, {
              id: `msg_trial_end_${Date.now()}`, week: trialAction.week, season: trialAction.season,
              icon: "✈️", color: C.blue,
              title: `${trialAction.name} Trial Complete`,
              body: `${trialAction.name} ${trialAction.flag || ""} has headed home after an impressive trial — ${trialAction.starts} appearance${trialAction.starts !== 1 ? "s" : ""} in the first team. He'll continue developing abroad, but the door is open for a return.`,
              read: false,
            }]);
          } else if (trialAction.type === "no_starts") {
            if (!unlockedAchievements.has("reality_check")) {
              setUnlockedAchievements(prev => { const n = new Set(prev); n.add("reality_check"); return n; });
              setAchievementQueue(prev => [...prev, "reality_check"]);
            }
            setSquad(prev => prev.filter(p => p.id !== trialAction.id));
            setStartingXI(prev => prev.filter(id => id !== trialAction.id));
            setBench(prev => prev.filter(id => id !== trialAction.id));
            setTrialPlayer(null);
            const trialAtWeek = trialAction.week + rand(2, 5);
            setTrialHistory(prev => [...prev, {
              name: trialAction.name, position: trialAction.position,
              nationality: trialAction.nationality, flag: trialAction.flag,
              countryLabel: trialAction.countryLabel,
              rivalTeam: trialAction.rivalTeam, rivalTier: leagueTier,
              impressed: false, declined: false, departureSeason: trialAction.season,
              phase: "on_trial",
            }]);
            setInboxMessages(prev => [...prev, {
              id: `msg_trial_end_${Date.now()}`, week: trialAction.week, season: trialAction.season,
              icon: "😔", color: C.textMuted,
              title: `${trialAction.name} Trial Over`,
              body: `${trialAction.name} has left without making an appearance. He didn't get the chance to show what he could do.`,
              read: false,
            }, {
              id: `msg_trial_rival_${Date.now()}`, week: trialAtWeek, season: trialAction.season,
              icon: "📰", color: C.blue,
              title: `${trialAction.name} On Trial at ${trialAction.rivalTeam}`,
              body: `${trialAction.name} ${trialAction.flag || ""} has gone on trial at ${trialAction.rivalTeam}. They're giving him the chance he didn't get here.`,
              read: false, pendingUntilWeek: trialAtWeek,
            }]);
          } else if (trialAction.type === "continue") {
            setTrialPlayer(prev => prev ? { ...prev, trialWeeksLeft: trialAction.newWeeksLeft, trialStarts: trialAction.newStarts } : null);
            setSquad(prev => prev.map(p => p.id === trialAction.id ? { ...p, trialWeeksLeft: trialAction.newWeeksLeft, trialStarts: trialAction.newStarts } : p));
          }
        }
      } catch(err) { console.error("Holiday trial processing error:", err); }

      // CRITICAL: Prepare cup rounds and set matchPending
      // (normally this happens in GainPopup onDone, but we're skipping that)
      if (!summerPhase && useGameStore.getState().seasonCalendar && useGameStore.getState().cup) {
        const nextEntry = useGameStore.getState().seasonCalendar[useGameStore.getState().calendarIndex];
        if (nextEntry?.type === "cup") {
          const cupLookup = (name, tier) => {
            const freshLeague = useGameStore.getState().league;
            return tier === leagueTier ? freshLeague : (allLeagueStates?.[tier])?.teams?.find(t => t.name === name) || null;
          };
          if (useGameStore.getState().cup.playerEliminated) {
            // Auto-skip: resolve AI matches and advance calendar past this cup entry
            const updatedCup = advanceCupRound(useGameStore.getState().cup, newSquad, startingXI, bench, cupLookup);
            let finCup = updatedCup;
            if (finCup.pendingPlayerMatch) {
              const pm = finCup.pendingPlayerMatch;
              const winner = pm.away;
              const newRounds = finCup.rounds.map((r, rIdx) => {
                if (rIdx !== finCup.currentRound) return r;
                return { ...r, matches: r.matches.map(m =>
                  m.home?.name === pm.home?.name && m.away?.name === pm.away?.name
                    ? { ...m, result: { homeGoals: 0, awayGoals: 1, winner } }
                    : m
                )};
              });
              finCup = { ...finCup, rounds: newRounds, pendingPlayerMatch: null };
              finCup = buildNextCupRound(finCup);
            }
            setCup(finCup);
            setCalendarIndex(prev => prev + 1);
            // Don't set matchPending — we auto-skipped, advance to next entry
          } else {
            // Prepare the cup round for player to play
            const updatedCup = advanceCupRound(useGameStore.getState().cup, newSquad, startingXI, bench, cupLookup);
            setCup(updatedCup);
            setMatchPending(true);
          }
        } else if (nextEntry?.type === "dynasty") {
          const dBracket = useGameStore.getState().dynastyCupBracket;
          if (dBracket && !dBracket.playerEliminated) {
            setMatchPending(true);
          } else {
            // Non-participant: sim AI dynasty match in background, send inbox, skip entry
            const dMod = getModifier(leagueTier);
            if (nextEntry.round === "sf") {
              if (dBracket) {
                // Player eliminated — sim remaining SF if needed (other SF) was already done
                // Just skip, final will be handled next
              } else if (dynastyCupQualifiers) {
                // Player didn't qualify — sim both SFs
                const q = dynastyCupQualifiers;
                const lt = useGameStore.getState().league?.teams || [];
                const sf1R = simulateMatch(lt[q[0].teamIndex], lt[q[3].teamIndex], null, null, true, 1, 0, null, 0, dMod);
                const sf2R = simulateMatch(lt[q[1].teamIndex], lt[q[2].teamIndex], null, null, true, 1, 0, null, 0, dMod);
                let sf1W = sf1R.homeGoals > sf1R.awayGoals ? lt[q[0].teamIndex] : sf1R.awayGoals > sf1R.homeGoals ? lt[q[3].teamIndex] : null;
                if (!sf1W) { const p = generatePenaltyShootout(lt[q[0].teamIndex], lt[q[3].teamIndex], sf1R.events, null, null, dMod); sf1W = p.winner; }
                let sf2W = sf2R.homeGoals > sf2R.awayGoals ? lt[q[1].teamIndex] : sf2R.awayGoals > sf2R.homeGoals ? lt[q[2].teamIndex] : null;
                if (!sf2W) { const p = generatePenaltyShootout(lt[q[1].teamIndex], lt[q[2].teamIndex], sf2R.events, null, null, dMod); sf2W = p.winner; }
                setDynastyCupBracket({
                  sf1: { home: lt[q[0].teamIndex], away: lt[q[3].teamIndex], result: { homeGoals: sf1R.homeGoals, awayGoals: sf1R.awayGoals, winner: sf1W } },
                  sf2: { home: lt[q[1].teamIndex], away: lt[q[2].teamIndex], result: { homeGoals: sf2R.homeGoals, awayGoals: sf2R.awayGoals, winner: sf2W } },
                  final: { home: sf1W, away: sf2W, result: null },
                  playerSF: 0, playerEliminated: true, winner: null,
                });
                setInboxMessages(prev => [...prev, {
                  id: `msg_dynasty_sf_bg_${Date.now()}`, week: week, season: seasonNumber,
                  icon: "🌍", title: "Dynasty Cup — Semi-Finals",
                  body: `${sf1W.name} beat ${sf1W === lt[q[0].teamIndex] ? lt[q[3].teamIndex].name : lt[q[0].teamIndex].name} ${sf1R.homeGoals}-${sf1R.awayGoals}\n${sf2W.name} beat ${sf2W === lt[q[1].teamIndex] ? lt[q[2].teamIndex].name : lt[q[1].teamIndex].name} ${sf2R.homeGoals}-${sf2R.awayGoals}\n\nThe final will be ${sf1W.name} vs ${sf2W.name}.`,
                  color: "#facc15", read: false,
                }]);
              }
              setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Dynasty Cup Semi-Finals" } }));
            } else if (nextEntry.round === "final") {
              const bk = useGameStore.getState().dynastyCupBracket;
              if (bk?.final?.home && bk?.final?.away && !bk.final.result) {
                const finR = simulateMatch(bk.final.home, bk.final.away, null, null, true, 1, 0, null, 0, dMod);
                let finW = finR.homeGoals > finR.awayGoals ? bk.final.home : finR.awayGoals > finR.homeGoals ? bk.final.away : null;
                if (!finW) { const p = generatePenaltyShootout(bk.final.home, bk.final.away, finR.events, null, null, dMod); finW = p.winner; }
                setDynastyCupBracket(prev => ({ ...prev, final: { ...prev.final, result: { homeGoals: finR.homeGoals, awayGoals: finR.awayGoals, winner: finW } }, winner: finW }));
                setInboxMessages(prev => [...prev, {
                  id: `msg_dynasty_final_bg_${Date.now()}`, week: week, season: seasonNumber,
                  icon: "🏆", title: "Dynasty Cup Final",
                  body: `${finW.name} won the Dynasty Cup, beating ${finW === bk.final.home ? bk.final.away.name : bk.final.home.name} ${finR.homeGoals}-${finR.awayGoals} in the final.`,
                  color: "#facc15", read: false,
                }]);
              }
              setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Dynasty Cup Final" } }));
            }
            setCalendarIndex(prev => prev + 1);
          }
        } else if (nextEntry?.type === "mini") {
          const mBracket = useGameStore.getState().miniTournamentBracket;
          if (mBracket && !mBracket.playerEliminated) {
            // Holiday auto-play: auto-pick 5v5 squad for player, simulate directly
            const _holMiniRound = nextEntry.round;
            const _holSFKey = mBracket.playerSF === 1 ? "sf1" : "sf2";
            const _holSF = mBracket[_holSFKey];
            let _holOpp;
            if (_holMiniRound === "sf_leg1" || _holMiniRound === "sf_leg2") {
              _holOpp = _holSF.home.isPlayer ? _holSF.away : _holSF.home;
            } else if (_holMiniRound === "third_place" && mBracket.thirdPlace) {
              _holOpp = mBracket.thirdPlace.home.isPlayer ? mBracket.thirdPlace.away : mBracket.thirdPlace.home;
            } else {
              _holOpp = mBracket.final.home?.isPlayer ? mBracket.final.away : mBracket.final.home;
            }
            // Auto-pick player's 5v5 squad
            const _holPlayerSquad = useGameStore.getState().squad;
            const _holPlayerTeam = { name: teamName, color: C.green, squad: _holPlayerSquad, isPlayer: true, trait: null };
            const _holAIFive = buildAIFiveASide(_holOpp);
            const _holOppTeam = { ..._holOpp, squad: _holAIFive };
            const _holAutoFive = buildAIFiveASide(_holPlayerTeam); // use same AI logic for auto-pick
            const _holAutoIds = _holAutoFive.map(p => p.id);
            const _holMiniMod = getModifier(leagueTier);
            const _holPlayerTeamFive = { name: teamName, color: C.green, squad: _holAutoFive, isPlayer: true, trait: null };
            const _holResult = simulateMatch(_holPlayerTeamFive, _holOppTeam, _holAutoIds, [], true, 1.0, 0, null, 0, _holMiniMod);
            const _holHG = _holResult.homeGoals;
            const _holAG = _holResult.awayGoals;
            const _holPlayerWon = _holHG > _holAG;
            const _holCI = useGameStore.getState().calendarIndex;

            if (_holMiniRound === "sf_leg1") {
              setMiniTournamentBracket(prev => ({
                ...prev,
                [_holSFKey]: { ...prev[_holSFKey], leg1: { homeGoals: _holHG, awayGoals: _holAG } },
              }));
              setCalendarResults(prev => ({ ...prev, [_holCI]: { playerGoals: _holHG, oppGoals: _holAG, won: _holPlayerWon, draw: _holHG === _holAG, oppName: _holOppTeam?.name || "?" } }));
            } else if (_holMiniRound === "sf_leg2") {
              const _holLeg1 = mBracket[_holSFKey].leg1;
              // Player is always simulated as home in both legs
              const _holAggP = _holLeg1.homeGoals + _holHG;
              const _holAggO = _holLeg1.awayGoals + _holAG;
              let _holSFWinner;
              if (_holAggP > _holAggO) {
                _holSFWinner = mBracket[_holSFKey].home.isPlayer ? mBracket[_holSFKey].home : mBracket[_holSFKey].away;
              } else if (_holAggO > _holAggP) {
                _holSFWinner = mBracket[_holSFKey].home.isPlayer ? mBracket[_holSFKey].away : mBracket[_holSFKey].home;
              } else {
                const _holPens = generatePenaltyShootout(_holPlayerTeamFive, _holOppTeam, _holResult.events, _holAutoIds, [], _holMiniMod);
                _holSFWinner = _holPens.winner === "home" ? _holPlayerTeamFive : _holOppTeam;
              }
              const _holPlayerWonSF = _holSFWinner.isPlayer;
              // Sim other SF both legs
              const _holOtherKey = mBracket.playerSF === 1 ? "sf2" : "sf1";
              const _holOtherSF = mBracket[_holOtherKey];
              let _holOtherL1 = _holOtherSF.leg1;
              if (!_holOtherL1) {
                const _or1 = simulateMatch(_holOtherSF.home, _holOtherSF.away, null, null, true, 1, 0, null, 0, _holMiniMod);
                _holOtherL1 = { homeGoals: _or1.homeGoals, awayGoals: _or1.awayGoals };
              }
              const _or2 = simulateMatch(_holOtherSF.away, _holOtherSF.home, null, null, true, 1, 0, null, 0, _holMiniMod);
              const _oAggH = _holOtherL1.homeGoals + _or2.awayGoals;
              const _oAggA = _holOtherL1.awayGoals + _or2.homeGoals;
              let _holOtherW = _oAggH > _oAggA ? _holOtherSF.home : _oAggA > _oAggH ? _holOtherSF.away : null;
              if (!_holOtherW) { const _op = generatePenaltyShootout(_holOtherSF.home, _holOtherSF.away, _or2.events, null, null, _holMiniMod); _holOtherW = _op.winner === "home" ? _holOtherSF.home : _holOtherSF.away; }
              // Compute SF losers for 3rd-place playoff
              const _holPlayerSFLoser = _holSFWinner.isPlayer
                ? (mBracket[_holSFKey].home.isPlayer ? mBracket[_holSFKey].away : mBracket[_holSFKey].home)
                : (mBracket[_holSFKey].home.isPlayer ? mBracket[_holSFKey].home : mBracket[_holSFKey].away);
              const _holOtherSFLoser = _holOtherW === _holOtherSF.home ? _holOtherSF.away : _holOtherSF.home;
              setMiniTournamentBracket(prev => ({
                ...prev,
                [_holSFKey]: { ...prev[_holSFKey], leg2: { homeGoals: _holHG, awayGoals: _holAG }, winner: _holSFWinner },
                [_holOtherKey]: { ...prev[_holOtherKey], leg1: _holOtherL1, leg2: { homeGoals: _or2.homeGoals, awayGoals: _or2.awayGoals }, winner: _holOtherW },
                final: { home: mBracket.playerSF === 1 ? _holSFWinner : _holOtherW, away: mBracket.playerSF === 1 ? _holOtherW : _holSFWinner, result: null },
                thirdPlace: { home: _holPlayerSFLoser, away: _holOtherSFLoser, result: null, winner: null },
                playerEliminated: false,
                playerInFinal: _holPlayerWonSF,
              }));
              setCalendarResults(prev => ({ ...prev, [_holCI]: { playerGoals: _holHG, oppGoals: _holAG, won: _holHG > _holAG, draw: _holHG === _holAG, oppName: _holOppTeam?.name || "?" } }));
            } else if (_holMiniRound === "third_place") {
              // 3rd-place playoff — player is here if they lost SF
              const _holInFinal = mBracket.playerInFinal;
              if (_holInFinal) {
                // Player is in the final — auto-sim 3rd place as AI vs AI
                const _tp = mBracket.thirdPlace;
                if (_tp && !_tp.winner) {
                  const _tpR = simulateMatch(_tp.home, _tp.away, null, null, true, 1, 0, null, 0, _holMiniMod);
                  let _tpW = _tpR.homeGoals > _tpR.awayGoals ? _tp.home : _tpR.awayGoals > _tpR.homeGoals ? _tp.away : null;
                  if (!_tpW) { const _tpP = generatePenaltyShootout(_tp.home, _tp.away, _tpR.events, null, null, _holMiniMod); _tpW = _tpP.winner === "home" ? _tp.home : _tp.away; }
                  setMiniTournamentBracket(prev => ({
                    ...prev,
                    thirdPlace: { ...prev.thirdPlace, result: { homeGoals: _tpR.homeGoals, awayGoals: _tpR.awayGoals, winner: _tpW }, winner: _tpW },
                    thirdPlaceWinner: _tpW,
                  }));
                }
                setCalendarResults(prev => ({ ...prev, [_holCI]: { spectator: true, label: "3rd Place Playoff" } }));
              } else {
                // Player plays 3rd-place playoff
                let _hol3rdPens = null;
                if (_holHG === _holAG) {
                  _hol3rdPens = generatePenaltyShootout(_holPlayerTeamFive, _holOppTeam, _holResult.events, _holAutoIds, [], _holMiniMod);
                }
                const _hol3rdWinner = _hol3rdPens
                  ? (_hol3rdPens.winner === "home" ? _holPlayerTeamFive : _holOppTeam)
                  : (_holHG > _holAG ? _holPlayerTeamFive : _holOppTeam);
                const _holWon3rd = _hol3rdWinner.isPlayer;
                setMiniTournamentBracket(prev => ({
                  ...prev,
                  thirdPlace: { ...prev.thirdPlace, result: { homeGoals: _holHG, awayGoals: _holAG, pens: _hol3rdPens }, winner: _hol3rdWinner },
                  thirdPlaceWinner: _hol3rdWinner,
                }));
                // Also sim the final (AI vs AI since player lost SF)
                const _bk2 = useGameStore.getState().miniTournamentBracket;
                if (_bk2?.final?.home && _bk2?.final?.away && !_bk2.final?.result) {
                  const _finR = simulateMatch(_bk2.final.home, _bk2.final.away, null, null, true, 1, 0, null, 0, _holMiniMod);
                  let _finW = _finR.homeGoals > _finR.awayGoals ? _bk2.final.home : _finR.awayGoals > _finR.homeGoals ? _bk2.final.away : null;
                  if (!_finW) { const _fp = generatePenaltyShootout(_bk2.final.home, _bk2.final.away, _finR.events, null, null, _holMiniMod); _finW = _fp.winner === "home" ? _bk2.final.home : _bk2.final.away; }
                  const _finL = _finW === _bk2.final.home ? _bk2.final.away : _bk2.final.home;
                  setMiniTournamentBracket(prev => ({ ...prev, final: { ...prev.final, result: { homeGoals: _finR.homeGoals, awayGoals: _finR.awayGoals, winner: _finW } }, winner: _finW, runnerUp: _finL }));
                }
                setCalendarResults(prev => ({ ...prev, [_holCI]: { playerGoals: _holHG, oppGoals: _holAG, won: _holWon3rd, draw: false, oppName: _holOppTeam?.name || "?" } }));
              }
            } else if (_holMiniRound === "final") {
              // Final — player is here only if they won SF
              const _holInFinal2 = mBracket.playerInFinal;
              if (_holInFinal2 === false) {
                // Player lost SF, final already simmed — skip
                setCalendarResults(prev => ({ ...prev, [_holCI]: { spectator: true, label: "Mini Final" } }));
              } else {
              // Final (player plays)
              let _holFinalPens = null;
              if (_holHG === _holAG) {
                _holFinalPens = generatePenaltyShootout(_holPlayerTeamFive, _holOppTeam, _holResult.events, _holAutoIds, [], _holMiniMod);
              }
              const _holFinalWinner = _holFinalPens
                ? (_holFinalPens.winner === "home" ? _holPlayerTeamFive : _holOppTeam)
                : (_holHG > _holAG ? _holPlayerTeamFive : _holOppTeam);
              const _holPlayerWonFinal = _holFinalWinner.isPlayer;
              setMiniTournamentBracket(prev => ({
                ...prev,
                final: { ...prev.final, result: { homeGoals: _holHG, awayGoals: _holAG, winner: _holFinalWinner, pens: _holFinalPens } },
                winner: _holFinalWinner,
              }));
              if (_holPlayerWonFinal) {
                // MotM boost
                const _holElig = _holAutoFive;
                if (_holElig.length > 0) {
                  const _holMotm = _holElig[Math.floor(Math.random() * _holElig.length)];
                  const _holAttrs = ["pace","shooting","passing","dribbling","defending","physical","goalkeeping"];
                  const _holAttr = _holAttrs[Math.floor(Math.random() * _holAttrs.length)];
                  const _holNewVal = Math.min(_holMotm.legendCap || ovrCap, (_holMotm.attrs[_holAttr] || 1) + 1);
                  setSquad(prev => prev.map(p => p.id === _holMotm.id ? { ...p, attrs: { ...p.attrs, [_holAttr]: _holNewVal } } : p));
                  setInboxMessages(prev => [...prev, {
                    id: `msg_mini_hol_champ_${Date.now()}`, week: week, season: seasonNumber,
                    icon: "🏆", title: "5v5 Mini-Tournament Champions!",
                    body: `You've won the 5v5 Mini-Tournament! ${_holMotm.name} earns +1 ${_holAttr.charAt(0).toUpperCase() + _holAttr.slice(1)} (now ${_holNewVal}).`,
                    color: "#fbbf24", read: false,
                  }]);
                }
              }
              // Also sim 3rd-place if not done yet (AI vs AI)
              const _bk3 = useGameStore.getState().miniTournamentBracket;
              if (_bk3?.thirdPlace && !_bk3.thirdPlace.winner) {
                const _tp3 = _bk3.thirdPlace;
                const _tpR3 = simulateMatch(_tp3.home, _tp3.away, null, null, true, 1, 0, null, 0, _holMiniMod);
                let _tpW3 = _tpR3.homeGoals > _tpR3.awayGoals ? _tp3.home : _tpR3.awayGoals > _tpR3.homeGoals ? _tp3.away : null;
                if (!_tpW3) { const _tpP3 = generatePenaltyShootout(_tp3.home, _tp3.away, _tpR3.events, null, null, _holMiniMod); _tpW3 = _tpP3.winner === "home" ? _tp3.home : _tp3.away; }
                setMiniTournamentBracket(prev => ({ ...prev, thirdPlace: { ...prev.thirdPlace, result: { homeGoals: _tpR3.homeGoals, awayGoals: _tpR3.awayGoals, winner: _tpW3 }, winner: _tpW3 }, thirdPlaceWinner: _tpW3 }));
              }
              const _finLoser = _holFinalWinner === _holOppTeam ? _holPlayerTeamFive : _holOppTeam;
              setMiniTournamentBracket(prev => ({ ...prev, runnerUp: _finLoser }));
              setCalendarResults(prev => ({ ...prev, [_holCI]: { playerGoals: _holHG, oppGoals: _holAG, won: _holPlayerWonFinal, draw: false, oppName: _holOppTeam?.name || "?" } }));
              }
            }
            setCalendarIndex(prev => prev + 1);
          } else {
            // Non-participant: sim AI mini match in background
            const mMod = getModifier(leagueTier);
            if (nextEntry.round === "sf_leg1") {
              if (!mBracket) {
                // Player didn't qualify — set up bracket from standings
                const mSorted = sortStandings(useGameStore.getState().league?.table || []);
                const mTop4 = mSorted.slice(0, 4).map(r => ({ teamIndex: r.teamIndex, name: useGameStore.getState().league?.teams?.[r.teamIndex]?.name }));
                const lt = useGameStore.getState().league?.teams || [];
                setMiniTournamentBracket({
                  sf1: { home: lt[mTop4[0].teamIndex], away: lt[mTop4[3].teamIndex], leg1: null, leg2: null, winner: null },
                  sf2: { home: lt[mTop4[1].teamIndex], away: lt[mTop4[2].teamIndex], leg1: null, leg2: null, winner: null },
                  final: { home: null, away: null, result: null },
                  playerSF: 0, playerEliminated: true, winner: null, fiveASide: true,
                });
              }
              // Sim leg 1 of both SFs
              const bk = useGameStore.getState().miniTournamentBracket;
              if (bk) {
                const r1 = simulateMatch(bk.sf1.home, bk.sf1.away, null, null, true, 1, 0, null, 0, mMod);
                const r2 = simulateMatch(bk.sf2.home, bk.sf2.away, null, null, true, 1, 0, null, 0, mMod);
                setMiniTournamentBracket(prev => ({
                  ...prev,
                  sf1: { ...prev.sf1, leg1: { homeGoals: r1.homeGoals, awayGoals: r1.awayGoals } },
                  sf2: { ...prev.sf2, leg1: { homeGoals: r2.homeGoals, awayGoals: r2.awayGoals } },
                }));
                setInboxMessages(prev => [...prev, {
                  id: `msg_mini_sf_l1_bg_${Date.now()}`, week: week, season: seasonNumber,
                  icon: "🌐", title: "Mini-Tournament — SF Leg 1",
                  body: `${bk.sf1.home.name} ${r1.homeGoals}-${r1.awayGoals} ${bk.sf1.away.name}\n${bk.sf2.home.name} ${r2.homeGoals}-${r2.awayGoals} ${bk.sf2.away.name}`,
                  color: "#fbbf24", read: false,
                }]);
              }
              setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Mini SF Leg 1" } }));
            } else if (nextEntry.round === "sf_leg2") {
              const bk = useGameStore.getState().miniTournamentBracket;
              if (bk?.sf1?.leg1 && !bk.sf1.winner) {
                // Sim leg 2 (reversed home/away), determine winners on aggregate
                const r1 = simulateMatch(bk.sf1.away, bk.sf1.home, null, null, true, 1, 0, null, 0, mMod);
                const r2 = simulateMatch(bk.sf2.away, bk.sf2.home, null, null, true, 1, 0, null, 0, mMod);
                const agg1h = bk.sf1.leg1.homeGoals + r1.awayGoals;
                const agg1a = bk.sf1.leg1.awayGoals + r1.homeGoals;
                let w1 = agg1h > agg1a ? bk.sf1.home : agg1a > agg1h ? bk.sf1.away : null;
                if (!w1) { const p = generatePenaltyShootout(bk.sf1.home, bk.sf1.away, r1.events, null, null, mMod); w1 = p.winner === "home" ? bk.sf1.home : bk.sf1.away; }
                const agg2h = bk.sf2.leg1.homeGoals + r2.awayGoals;
                const agg2a = bk.sf2.leg1.awayGoals + r2.homeGoals;
                let w2 = agg2h > agg2a ? bk.sf2.home : agg2a > agg2h ? bk.sf2.away : null;
                if (!w2) { const p = generatePenaltyShootout(bk.sf2.home, bk.sf2.away, r2.events, null, null, mMod); w2 = p.winner === "home" ? bk.sf2.home : bk.sf2.away; }
                setMiniTournamentBracket(prev => ({
                  ...prev,
                  sf1: { ...prev.sf1, leg2: { homeGoals: r1.homeGoals, awayGoals: r1.awayGoals }, winner: w1 },
                  sf2: { ...prev.sf2, leg2: { homeGoals: r2.homeGoals, awayGoals: r2.awayGoals }, winner: w2 },
                  final: { home: w1, away: w2, result: null },
                }));
                setInboxMessages(prev => [...prev, {
                  id: `msg_mini_sf_l2_bg_${Date.now()}`, week: week, season: seasonNumber,
                  icon: "🌐", title: "Mini-Tournament — SF Leg 2",
                  body: `${bk.sf1.away.name} ${r1.homeGoals}-${r1.awayGoals} ${bk.sf1.home.name} (Agg: ${agg1h}-${agg1a}) — ${w1.name} advance\n${bk.sf2.away.name} ${r2.homeGoals}-${r2.awayGoals} ${bk.sf2.home.name} (Agg: ${agg2h}-${agg2a}) — ${w2.name} advance\n\nFinal: ${w1.name} vs ${w2.name}`,
                  color: "#fbbf24", read: false,
                }]);
              }
              setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Mini SF Leg 2" } }));
            } else if (nextEntry.round === "third_place") {
              const bk = useGameStore.getState().miniTournamentBracket;
              if (bk?.thirdPlace && !bk.thirdPlace.winner) {
                const tp = bk.thirdPlace;
                const tpR = simulateMatch(tp.home, tp.away, null, null, true, 1, 0, null, 0, mMod);
                let tpW = tpR.homeGoals > tpR.awayGoals ? tp.home : tpR.awayGoals > tpR.homeGoals ? tp.away : null;
                if (!tpW) { const p = generatePenaltyShootout(tp.home, tp.away, tpR.events, null, null, mMod); tpW = p.winner === "home" ? tp.home : tp.away; }
                setMiniTournamentBracket(prev => ({
                  ...prev,
                  thirdPlace: { ...prev.thirdPlace, result: { homeGoals: tpR.homeGoals, awayGoals: tpR.awayGoals, winner: tpW }, winner: tpW },
                  thirdPlaceWinner: tpW,
                }));
                setInboxMessages(prev => [...prev, {
                  id: `msg_mini_3rd_bg_${Date.now()}`, week: week, season: seasonNumber,
                  icon: "🥉", title: "Mini-Tournament — 3rd-Place Playoff",
                  body: `${tpW.name} beat ${tpW === tp.home ? tp.away.name : tp.home.name} ${tpR.homeGoals}-${tpR.awayGoals} to claim 3rd place.`,
                  color: "#fbbf24", read: false,
                }]);
              }
              setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "3rd Place Playoff" } }));
            } else if (nextEntry.round === "final") {
              const bk = useGameStore.getState().miniTournamentBracket;
              if (bk?.final?.home && bk?.final?.away && !bk.final.result) {
                const finR = simulateMatch(bk.final.home, bk.final.away, null, null, true, 1, 0, null, 0, mMod);
                let finW = finR.homeGoals > finR.awayGoals ? bk.final.home : finR.awayGoals > finR.homeGoals ? bk.final.away : null;
                if (!finW) { const p = generatePenaltyShootout(bk.final.home, bk.final.away, finR.events, null, null, mMod); finW = p.winner === "home" ? bk.final.home : bk.final.away; }
                const finLoser = finW === bk.final.home ? bk.final.away : bk.final.home;
                setMiniTournamentBracket(prev => ({ ...prev, final: { ...prev.final, result: { homeGoals: finR.homeGoals, awayGoals: finR.awayGoals, winner: finW } }, winner: finW, runnerUp: finLoser }));
                setInboxMessages(prev => [...prev, {
                  id: `msg_mini_final_bg_${Date.now()}`, week: week, season: seasonNumber,
                  icon: "🏆", title: "Mini-Tournament Final",
                  body: `${finW.name} won the 5v5 Mini-Tournament, beating ${finLoser.name} ${finR.homeGoals}-${finR.awayGoals}.`,
                  color: "#fbbf24", read: false,
                }]);
              }
              setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Mini Final" } }));
            }
            setCalendarIndex(prev => prev + 1);
          }
        } else if (nextEntry?.type === "league") {
          // Intergalactic Elite: generate pre-match prediction
          const _predMod = getModifier(leagueTier);
          if (_predMod.prediction) {
            const _holFix = useGameStore.getState().league?.fixtures?.[nextEntry.leagueMD]?.find(f => f.home === 0 || f.away === 0);
            const _holPlHome = _holFix ? _holFix.home === 0 : true;
            // Weighted goal pool: 0-5, realistic distribution
            const _ps = [0,0,0,1,1,1,1,1,2,2,2,2,3,3,3,4,4,5];
            // Only predict draws or player wins (AI already gets 3 pts from own wins)
            let _holPred;
            for (let _try = 0; _try < 20; _try++) {
              const h = _ps[Math.floor(Math.random() * _ps.length)];
              const a = _ps[Math.floor(Math.random() * _ps.length)];
              const aiWins = _holPlHome ? a > h : h > a;
              if (!aiWins) { _holPred = { home: h, away: a }; break; }
            }
            aiPredictionRef.current = _holPred || { home: 1, away: 1 };
          }
          setMatchPending(true);
        }
      }

      // End processing immediately so interval can continue
      setTimeout(() => setProcessing(false), 100);
      return; // Skip normal pendingSquad flow
    }

    // === NORMAL MODE: SHOW POPUP ===
    setPendingSquad(newSquad);

    // Snapshot OVR for progress chart
    const ovrSnap = {};
    newSquad.forEach(p => {
      const key = `${p.name}|${p.position}`;
      ovrSnap[key] = getOverall(p);
    });
    setOvrHistory(prev => [...prev, { w: (week || 1) + 1, s: seasonNumber || 1, p: ovrSnap }]);

    // Clear prodigal boost flag after it's been applied
    if (prodigalSon?.pendingBoost) {
      setProdigalSon(prev => prev ? { ...prev, pendingBoost: false } : prev);
    }

    setWeek(w => w + 1);
    setTrainedThisWeek(new Set());
    const resolvedTicketBoosts = pendingTicketBoosts.map(tb => {
      if (tb.playerId) {
        const current = useGameStore.getState().squad.find(p => p.id === tb.playerId);
        if (current) return { ...tb, playerName: current.name };
      }
      return tb;
    });
    // Holiday mode: auto-pick a random ticket from capped arc choices
    if (useGameStore.getState().isOnHoliday && cappedArcTickets.length > 0) {
      cappedArcTickets.forEach(ct => {
        const pick = ct.choices[Math.floor(Math.random() * ct.choices.length)];
        setTickets(prev => [...prev, { id: `t_arc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, type: pick }]);
      });
    }
    setGains({ improvements: weekGains, injuries: weekInjuries, duos: weekDuos, recoveries: weekRecoveries, progress: weekProgress, arcBoosts: arcBoostGains, ticketBoosts: resolvedTicketBoosts, cappedArcTickets: useGameStore.getState().isOnHoliday ? [] : cappedArcTickets });
    setPendingTicketBoosts([]);

    // Sweat Equity — 4+ gains in a double training week
    if (wasDoubleTraining && weekGains.length >= 4 && !unlockedAchievements.has("sweat_equity")) {
      setUnlockedAchievements(prev => { const n = new Set(prev); n.add("sweat_equity"); return n; });
      setAchievementQueue(prev => [...prev, "sweat_equity"]);
    }
    if (!useGameStore.getState().isOnHoliday) {
      setTimeout(() => setWeekTransition(false), 1500);
    }
    weekRecoveriesRef.current = weekRecoveries;
    revealedInjuryCount.current = 0;

    // Track injury counts per player for Injury Prone
    if (weekInjuries.length > 0) {
      setPlayerInjuryCount(prev => {
        const next = { ...prev };
        weekInjuries.forEach(inj => { next[inj.playerName] = (next[inj.playerName] || 0) + 1; });
        return next;
      });
    }

    // Tier 8: Clear carded players after training and send inbox
    if (weekCardSkips.length > 0) {
      cardedPlayerIdsRef.current.clear();
      setInboxMessages(prev => [...prev, {
        id: `card-skip-${Date.now()}`,
        type: "card_skip",
        icon: "🥋",
        title: "Discipline Penalty",
        body: `${weekCardSkips.join(", ")} missed training — indiscipline in the last match cost them a session.`,
        color: "#fb923c",
        read: false,
        week: calendarIndex,
        season: seasonNumber,
      }]);
    }

    // Ice Bath — player recovers from injury while 'Ice Bath' is playing
    if (weekRecoveries.length > 0 && !unlockedAchievements.has("ice_bath_track") && BGM.getCurrentTrackId() === "ice_bath") {
      setUnlockedAchievements(prev => { const n = new Set(prev); n.add("ice_bath_track"); return n; });
      setAchievementQueue(prev => [...prev, "ice_bath_track"]);
    }

    // Relationship tick — passive/focus/decay per week (disabled in Saudi Super League)
    if (getModifier(leagueTier).noRelationships) { /* skip relationship building */ } else
    setClubRelationships(prev => {
      const next = { ...prev };
      const playerTier = leagueTier;
      const leagueTeams = (league?.teams || []).filter(t => !t.isPlayer);
      // Determine this week's opponent for match-play bonus
      const thisFixture = league?.fixtures?.[matchweekIndex];
      const opponentIdx = thisFixture
        ? (thisFixture.home === 0 ? thisFixture.away : thisFixture.away === 0 ? thisFixture.home : null)
        : null;
      const opponentName = opponentIdx != null ? league?.teams?.[opponentIdx]?.name : null;
      const decayRate = (theirTier) => {
        const dist = Math.abs((theirTier || playerTier) - playerTier);
        if (dist === 0) return 0.2;
        if (dist === 1) return 0.4;
        if (dist <= 3) return 0.8;
        return 1.4;
      };
      // Same-league clubs: passive gain ± decay, match bonus, focus bonus
      leagueTeams.forEach(team => {
        const entry = next[team.name] || { pct: 0, tier: playerTier };
        let delta = 0.6; // passive same-league
        if (team.name === opponentName) delta += 1.6; // match played vs them
        if (transferFocus.includes(team.name)) {
          delta += 3.0; // active focus bonus, no decay
        } else {
          delta -= decayRate(entry.tier);
        }
        const newPct = Math.max(0, Math.min(100, entry.pct + delta));
        next[team.name] = { ...entry, pct: newPct, wasPositive: entry.wasPositive || newPct > 0 };
      });
      // Non-league focus clubs: seed entry if missing, then apply bonus (up to 2 slots)
      transferFocus.forEach(focusClubName => {
        if (!leagueTeams.find(t => t.name === focusClubName)) {
          if (!next[focusClubName]) {
            // Resolve tier from allLeagueStates so decay is correct if focus is later removed
            let focusTier = playerTier;
            for (const [t, state] of Object.entries(allLeagueStates || {})) {
              if ((state?.teams || []).some(tm => tm.name === focusClubName)) {
                focusTier = parseInt(t); break;
              }
            }
            next[focusClubName] = { pct: 0, tier: focusTier };
          }
          const entry = next[focusClubName];
          next[focusClubName] = { ...entry, pct: Math.min(100, entry.pct + 3.0) };
        }
      });
      // Non-league clubs (non-focus): decay only
      Object.keys(next).forEach(name => {
        if (leagueTeams.find(t => t.name === name)) return; // handled above
        if (transferFocus.includes(name)) return; // already handled above
        const entry = next[name];
        const newPct = entry.pct - decayRate(entry.tier);
        if (newPct < 0.1) {
          delete next[name]; // prune dead relationships
        } else {
          next[name] = { ...entry, pct: newPct };
        }
      });
      return next;
    });

    // Trial player — compute action but defer squad changes to avoid re-triggering this useEffect
    // Trial player — compute action but defer squad changes to avoid re-triggering this useEffect
    pendingTrialAction.current = null;
    if (trialPlayer) {
      const wasInXI = startingXI.includes(trialPlayer.id);
      const newWeeksLeft = trialPlayer.trialWeeksLeft - 1;
      const newStarts = trialPlayer.trialStarts + (wasInXI ? 1 : 0);

      if (newWeeksLeft <= 0) {
        // Get trained attrs from current squad
        const trainedPlayer = squad.find(p => p.id === trialPlayer.id) || trialPlayer;
        if (newStarts > 0) {
          pendingTrialAction.current = {
            type: "impressed", id: trialPlayer.id,
            name: trialPlayer.name, position: trialPlayer.position,
            nationality: trialPlayer.nationality, flag: trialPlayer.flag,
            countryLabel: trialPlayer.countryLabel, attrs: { ...trainedPlayer.attrs },
            potential: trialPlayer.potential, starts: newStarts, season: seasonNumber, week: (week || 1) + 1,
          };
        } else {
          const rivals = league?.teams?.filter(t => !t.isPlayer) || [];
          const rival = rivals[rand(0, rivals.length - 1)];
          pendingTrialAction.current = {
            type: "no_starts", id: trialPlayer.id,
            name: trialPlayer.name, position: trialPlayer.position,
            nationality: trialPlayer.nationality, flag: trialPlayer.flag,
            countryLabel: trialPlayer.countryLabel,
            rivalTeam: rival?.name || "a rival club", season: seasonNumber, week: (week || 1) + 1,
          };
        }
      } else {
        pendingTrialAction.current = {
          type: "continue", id: trialPlayer.id,
          newWeeksLeft, newStarts,
        };
      }
    }
  }, [processing, squad, league, prodigalSon, leagueTier, matchweekIndex, transferFocus]);

  // Triggered by "END SEASON" button — applies any pending arc final rewards, then opens SeasonEndReveal
  const triggerSeasonEnd = useCallback(() => {
    if (processing) return;
    setWeekTransition(true);

    const arcSnap = storyArcs;
    const gs = { squad, league, prodigalSon, trialPlayer, trialHistory, leagueTier,
                 consecutiveWins, halfwayPosition, cup };
    const arcFx = precomputeArcEffects(arcSnap, gs, prodigalSon);

    let newSquad = [...useGameStore.getState().squad];  // Use ref for fresh data!
    let newBonuses = { ...(arcSnap.bonuses || {}) };
    const appliedIds = [];
    const newCompletedIds = [];
    const achievementsToUnlock = [];

    if (arcFx.pendingFinalRewards?.length) {
      for (const { arc, targetId, prodigalId } of arcFx.pendingFinalRewards) {
        if ((arcSnap.rewardsApplied || []).includes(arc.id)) continue;

        // Snapshot pre-boost to detect capped rewards
        const preBoostSE = {};
        newSquad.forEach(p => { preBoostSE[p.id] = { ...p.attrs }; });

        // Apply stat boosts to squad
        const rewardResult = applyFinalReward(arc, newSquad, targetId, prodigalId, {}, ovrCap);
        newSquad = rewardResult.squad;

        // Check if reward was fully capped
        const ffxSE = arc.finalFx;
        const intendedBoostSE = !!(ffxSE.targetWeakest || ffxSE.squadStats || ffxSE.squadAll);
        let gainCountSE = 0;
        newSquad.forEach(p => {
          const pre = preBoostSE[p.id] || {};
          Object.keys(p.attrs).forEach(k => { if ((p.attrs[k] || 0) > (pre[k] || 0)) gainCountSE++; });
        });
        if (intendedBoostSE && gainCountSE === 0) {
          const shuffled = [...ARC_TICKET_POOL].sort(() => Math.random() - 0.5);
          const pick = shuffled[0];
          setTickets(prev => [...prev, { id: `t_arc_se_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, type: pick }]);
        }

        // Queue arc completion modal so player sees it before SeasonEndReveal
        const cat = arc.cat;
        const tracking = arcSnap[cat]?.tracking;
        const narr = getStepNarrative(arc.id, arc.steps.length - 1, tracking, newSquad);
        setArcStepQueue(q => [...q, {
          arcId: arc.id, arcName: arc.name, arcIcon: arc.icon, cat,
          stepIdx: arc.steps.length - 1,
          stepDesc: arc.steps[arc.steps.length - 1]?.desc || "",
          narrative: narr, isComplete: true, rewardDesc: arc.rewardDesc,
        }]);

        // Inbox message
        const rewardBody = (intendedBoostSE && gainCountSE === 0)
          ? `${arc.rewardDesc}\nYour squad is already maxed — a bonus ticket has been added to your cabinet instead.`
          : arc.rewardDesc;
        setInboxMessages(pm => [...pm, {
          id: `msg_arc_${arc.id}_${Date.now()}`, week: (week || 1) + 1, season: seasonNumber,
          icon: "🏆", color: C.amber,
          title: `Arc Complete: ${arc.name}`,
          body: rewardBody, read: false,
        }]);

        // Process arc completion: bonuses + meta-achievements
        const completionResult = processArcCompletion(
          arc, arcSnap[cat] || {},
          [...(arcSnap.completed || []), ...newCompletedIds],
          newBonuses,
          { unlockedAchievements, seasonNumber, week }
        );
        newBonuses = completionResult.bonuses;
        newCompletedIds.push(arc.id);
        completionResult.achievements.forEach(a => achievementsToUnlock.push(a));
        appliedIds.push(arc.id);
      }
    }

    if (appliedIds.length > 0) {
      setSquad(newSquad);
      setStoryArcs(prev => {
        const n = { ...prev, bonuses: newBonuses };
        n.rewardsApplied = [...(prev.rewardsApplied || []), ...appliedIds];
        n.completed = [...(prev.completed || []), ...newCompletedIds];
        newCompletedIds.forEach(id => {
          const arc = getArcById(id);
          if (arc && n[arc.cat]) n[arc.cat] = { ...n[arc.cat], completed: true };
        });
        return n;
      });
      if (achievementsToUnlock.length > 0) {
        setUnlockedAchievements(prev => { const n = new Set(prev); achievementsToUnlock.forEach(a => n.add(a)); return n; });
        setAchievementQueue(prev => { const ex = new Set(prev); const f = achievementsToUnlock.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
      }
    }

    setSummerPhase("break");
    setSummerData(prev => ({ ...(prev || {}), weeksLeft: 5 }));
    setTimeout(() => setWeekTransition(false), 1500);
  }, [processing, squad, league, storyArcs, prodigalSon, trialPlayer, trialHistory, leagueTier, consecutiveWins, halfwayPosition, cup, unlockedAchievements, seasonNumber, week, ovrCap]);
  advanceWeekRef.current = advanceWeek;

  // Drives the 5-week summer break, one event per click
  const advanceSummer = useCallback(() => {
    if (processing) return;
    setProcessing(true);
    if (!useGameStore.getState().isOnHoliday) setWeekTransition(true);
    const wl = summerData?.weeksLeft ?? 5;

    const FILTER_LABELS = { DEF: "Defenders", MID: "Midfielders", FWD: "Forwards", GK: "Goalkeepers" };

    if (wl === 5) {
      // Week 1: Apply any pending arc final rewards missed due to timing bugs.
      // SeasonEndReveal fires on the NEXT click (wl=4) to avoid overlap with gains popup.
      const arcSnap = storyArcs;
      const gs = { squad, league, prodigalSon, trialPlayer, trialHistory, leagueTier,
                   consecutiveWins, halfwayPosition, cup };
      const arcFx = precomputeArcEffects(arcSnap, gs, prodigalSon);
      if (arcFx.pendingFinalRewards?.length) {
        let newSquad = [...useGameStore.getState().squad];  // Use ref!
        // Snapshot attrs BEFORE any rewards so we can diff the full delta at the end
        const initialAttrs = newSquad.reduce((m, p) => { m[p.id] = { ...p.attrs }; return m; }, {});
        const appliedIds = [], arcBoostGains = [];
        for (const { arc, targetId, prodigalId } of arcFx.pendingFinalRewards) {
          if ((arcSnap.rewardsApplied || []).includes(arc.id)) continue;
          const filterKey = arc.finalFx?.filter || null;
          const filterLabel = filterKey ? FILTER_LABELS[filterKey] : null;
          const preBefore = newSquad.reduce((m, p) => { m[p.id] = { ...p.attrs }; return m; }, {});
          const res = applyFinalReward(arc, newSquad, targetId, prodigalId, {}, ovrCap);
          newSquad = res.squad;
          const ffxGP = arc.finalFx;
          const intendedBoostGP = !!(ffxGP.targetWeakest || ffxGP.squadStats || ffxGP.squadAll);
          let gainCountGP = 0;
          newSquad.forEach(p => {
            const before = preBefore[p.id] || {};
            Object.keys(p.attrs).forEach(k => {
              if ((p.attrs[k] || 0) > (before[k] || 0)) {
                gainCountGP++;
                arcBoostGains.push({ playerName: p.name, playerPosition: p.position, attr: k, oldVal: before[k] || 0, newVal: p.attrs[k], isArcBoost: true, sourceKey: `reward_${arc.id}`, filterLabel });
              }
            });
          });
          if (intendedBoostGP && gainCountGP === 0) {
            const _atp = ["double_session", "miracle_cream", "twelfth_man", "relation_boost", "transfer_insider", "youth_coup", "rewind", "random_attr"];
            const pick = _atp[Math.floor(Math.random() * _atp.length)];
            setTickets(prev => [...prev, { id: `t_arc_gp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, type: pick }]);
          }
          setArcStepQueue(q => [...q, {
            arcId: arc.id, arcName: arc.name, arcIcon: arc.icon, cat: arc.cat,
            stepIdx: arc.steps.length - 1,
            stepDesc: arc.steps[arc.steps.length - 1]?.desc || "",
            narrative: null, isComplete: true, rewardDesc: arc.rewardDesc,
          }]);
          appliedIds.push(arc.id);
        }
        if (appliedIds.length > 0) {
          // Reset each player's gains to only show the delta from this session's arc rewards.
          // This clears any stale gains from previous weeks/sessions so the squad view
          // doesn't keep showing old +1 indicators alongside the new boosts.
          newSquad = newSquad.map(p => {
            const before = initialAttrs[p.id] || {};
            const freshGains = {};
            Object.keys(p.attrs).forEach(k => {
              const diff = (p.attrs[k] || 0) - (before[k] || 0);
              if (diff > 0) freshGains[k] = diff;
            });
            return { ...p, gains: freshGains };
          });
          setPendingSquad(newSquad);
          setGains({ improvements: [], injuries: [], duos: [], recoveries: [], progress: [], arcBoosts: arcBoostGains, ticketBoosts: [] });
          setStoryArcs(prev => ({ ...prev, rewardsApplied: [...(prev.rewardsApplied || []), ...appliedIds] }));
        }
      }

      // LOAN RETURNS (Summer Week 1 of new season)
      // Process loaned-out players returning with OVR/potential changes
      if (loanedOutPlayers.length > 0) {
        const returningPlayers = loanedOutPlayers.filter(loan => loan.returnSeason <= seasonNumber);
        if (returningPlayers.length > 0) {
          setSquad(prev => {
            let updated = [...prev];
            returningPlayers.forEach(loan => {
              const idx = updated.findIndex(p => p.id === loan.player.id);
              if (idx !== -1) {
                const p = updated[idx];
                // Apply OVR changes to attributes (distribute evenly)
                const attrKeys = ATTRIBUTES.map(a => a.key);
                const delta = loan.ovrDelta;
                let remaining = Math.abs(delta);
                const newAttrs = { ...p.attrs };
                while (remaining > 0) {
                  const attr = attrKeys[Math.floor(Math.random() * attrKeys.length)];
                  const current = newAttrs[attr] || 0;
                  const pCap = p.legendCap || ovrCap;
                  if (delta > 0 && current < pCap) {
                    newAttrs[attr] = Math.min(pCap, current + 1);
                    remaining--;
                  } else if (delta < 0 && current > 0) {
                    newAttrs[attr] = Math.max(0, current - 1);
                    remaining--;
                  }
                }
                // Apply potential change
                const newPotential = Math.max(0, Math.min(p.legendCap || ovrCap, p.potential + loan.potDelta));
                updated[idx] = { ...p, attrs: newAttrs, potential: newPotential, loanedTo: undefined };
              }
            });
            return updated;
          });
          setLoanedOutPlayers(prev => prev.filter(loan => loan.returnSeason > seasonNumber));
        }
      }

      // Process loaned-in players returning to parent clubs (remove from squad)
      if (loanedInPlayers.length > 0) {
        const returning = loanedInPlayers.filter(loan => loan.returnSeason <= seasonNumber);
        if (returning.length > 0) {
          setSquad(prev => prev.filter(p => !returning.some(loan => loan.player.id === p.id)));
          setLoanedInPlayers(prev => prev.filter(loan => loan.returnSeason > seasonNumber));
          // Apply relationship penalty for each loan return
          returning.forEach(loan => {
            setClubRelationships(prev => {
              const entry = prev[loan.parentClub] || { pct: 0, tier: leagueTier };
              return { ...prev, [loan.parentClub]: { ...entry, pct: Math.max(0, entry.pct - 5) } };
            });
          });
        }
      }

      // Always advance to wl=4 regardless — SeasonEndReveal fires there
      setSummerData(prev => ({...prev, weeksLeft: 4}));
      setTimeout(() => { setProcessing(false); setWeekTransition(false); }, 1500);

    } else if (wl === 4) {
      // Week 2: Season End reveal (promotion / relegation / champions)
      setSummerPhase("summary");
      setTimeout(() => { setProcessing(false); setWeekTransition(false); }, 1500);

    } else if (wl === 3) {
      // Week 3: Team of the Season email
      let topScorer = null, topGoals = 0, topMotmName = null, topMotm = 0;
      Object.entries(playerSeasonStats).forEach(([name, s]) => {
        if ((s.goals || 0) > topGoals) { topGoals = s.goals; topScorer = name; }
        if ((s.motm || 0) > topMotm) { topMotm = s.motm; topMotmName = name; }
      });
      const sorted = [...squad].sort((a, b) => getOverall(b) - getOverall(a));
      const totsNames = sorted.slice(0, 3).map(p => p.name).join(", ");
      let totsBody = `End-of-season awards for ${league?.leagueName || "the league"} have been announced.`;
      if (topScorer && topGoals > 0) totsBody += ` ${topScorer} won the Golden Boot with ${topGoals} goal${topGoals !== 1 ? "s" : ""}.`;
      if (topMotmName && topMotm > 0) totsBody += ` ${topMotmName} was named Player of the Season (${topMotm} MOTM).`;
      if (totsNames) totsBody += ` Your standout performers: ${totsNames}.`;
      setInboxMessages(prev => [...prev, {
        id: `msg_tots_${Date.now()}`, week: week || 1, season: seasonNumber,
        icon: "⭐", color: C.amber, title: "Team of the Season", body: totsBody, read: false,
      }]);

      // TRANSFER WINDOW OPENS (Summer Week 3)
      setTransferWindowOpen(true);
      const twMod = getModifier(leagueTier);
      setTransferWindowWeeksRemaining(twMod.transferWindowWeeks || 6); // Federation: 9 weeks
      setTradesMadeInWindow(0); // Reset trade counter for new window
      const offers = generateAITransferOffers(clubRelationships, squad, allLeagueStates);
      setTransferOffers(offers);

      setSummerData(prev => ({...prev, weeksLeft: 2}));
      if (transferWindowOpen) setTransferWindowWeeksRemaining(prev => Math.max(0, prev - 1));
      setTimeout(() => { setProcessing(false); setWeekTransition(false); }, 1500);

    } else if (wl === 2) {
      // Week 4: Retirements + Youth Intake
      setShowYouthIntake(true);
      setSummerPhase("intake");
      // YouthIntake onDone will set weeksLeft=1 and return to break
      if (transferWindowOpen) setTransferWindowWeeksRemaining(prev => Math.max(0, prev - 1));
      setTimeout(() => { setProcessing(false); setWeekTransition(false); }, 1500);

    } else {
      // Week 5: Well Rested boosts + New season preview, then end summer
      const attrKeys = ATTRIBUTES.map(a => a.key);
      const eligible = squad.filter(p => !p.isTrial);
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, Math.min(3, shuffled.length));
      const arcBoosts = [];
      const newSquad = useGameStore.getState().squad.map(p => {  // Use ref for fresh data, not stale state!
        const pick = chosen.find(c => c.id === p.id);
        if (!pick) return p;
        const attr = attrKeys[Math.floor(Math.random() * attrKeys.length)];
        const amt = Math.floor(Math.random() * 3) + 1;
        const oldVal = p.attrs[attr] || 0;
        const newVal = Math.min(p.legendCap || ovrCap, oldVal + amt);
        arcBoosts.push({ playerName: p.name, playerPosition: p.position, attr, oldVal, newVal, isArcBoost: true, sourceKey: "well_rested" });
        return { ...p, attrs: { ...p.attrs, [attr]: newVal }, gains: { ...(p.gains || {}), [attr]: (p.gains?.[attr] || 0) + (newVal - oldVal) } };
      });
      setPendingSquad(newSquad);
      setGains({ improvements: [], injuries: [], duos: [], recoveries: [], progress: [], arcBoosts, ticketBoosts: [] });
      const names = chosen.map(p => p.name.split(" ").pop()).join(", ");
      const newLeagueName = league?.leagueName || LEAGUE_DEFS[leagueTier]?.name || "the new division";
      const tableSorted = sortStandings(league?.table || []);
      const topRow = tableSorted.find(r => !league?.teams?.[r.teamIndex]?.isPlayer);
      const topTeamName = topRow ? league?.teams?.[topRow.teamIndex]?.name : null;
      let expectation = "Survive and build for the future.";
      if (leagueTier <= 3) expectation = "The chairman demands nothing less than a title challenge.";
      else if (leagueTier <= 5) expectation = "The board expects a top-three finish and promotion.";
      else if (leagueTier <= 7) expectation = "A top-half finish is the minimum expectation.";
      else if (leagueTier <= 9) expectation = "Avoid relegation and consolidate your position.";
      let previewBody = `A new season in ${newLeagueName} awaits.`;
      if (topTeamName) previewBody += ` ${topTeamName} are the ones to beat — they finished top last term.`;
      previewBody += ` ${expectation}`;
      setInboxMessages(prev => [...prev,
        { id: `msg_well_rested_${Date.now()}`, week: week || 1, season: seasonNumber, icon: "☀️", color: "#f59e0b", title: "Players Return Refreshed", body: `Pre-season is underway. ${names} came back from the break in the best shape of their careers.`, read: false },
        { id: `msg_preview_${Date.now()}`, week: week || 1, season: seasonNumber, icon: "📋", color: C.blue, title: "New Season Preview", body: previewBody, read: false },
      ]);
      if (transferWindowOpen) setTransferWindowWeeksRemaining(prev => Math.max(0, prev - 1));
      setSummerPhase(null);
      setSummerData(null);
      setTimeout(() => { setProcessing(false); setWeekTransition(false); }, 1500);
    }
  }, [processing, summerData, squad, playerSeasonStats, league, leagueTier, week, seasonNumber,
      storyArcs, prodigalSon, trialPlayer, trialHistory, consecutiveWins, halfwayPosition, cup]);

  const AUTO_TRAINING = {
    GK: "balanced", CB: "defending", LB: "physical", RB: "pace",
    CM: "physical", AM: "passing", LW: "pace", RW: "shooting", ST: "shooting",
  };
  const assignAllGeneral = useCallback(() => {
    let cmCount = 0;
    setSquad(prev => prev.map(p => {
      if (p.training) return p;
      let key = AUTO_TRAINING[p.position] || "balanced";
      if (p.position === "CM") {
        cmCount++;
        if (cmCount >= 2) key = "technique";
      }
      return { ...p, training: key };
    }));
  }, []);

  // ===== EARLY RETURNS (after all hooks) =====

  // Loading
  if (loadingGame) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0a1a", color: C.slate,
        fontFamily: FONT,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: F.sm }}>Loading...</div>
      </div>
    );
  }

  // Profile selection (shown before slot picker)
  if (!activeProfileId) {
    return (
      <ProfileSelectScreen
        profiles={profileList}
        onSelect={(id) => setActiveProfileId(id)}
        onCreate={async (name) => {
          const profile = await createProfile(name);
          setProfileList(prev => [...prev, { id: profile.id, name: profile.name, createdAt: profile.createdAt }]);
          setActiveProfileId(profile.id);
        }}
        onViewMuseum={async (profileId) => {
          try {
            const prof = await readProfile(profileId);
            setViewingMuseumList({ profileId, entries: prof?.museum || [] });
            setActiveProfileId(profileId);
          } catch {
            setViewingMuseumList({ profileId, entries: [] });
            setActiveProfileId(profileId);
          }
        }}
      />
    );
  }

  // Start screen (skip if museum is open — museum list/career share the !teamName state)
  if (!teamName && !viewingMuseumList && !viewingMuseumCareer) {
    const TIER_NAMES = {};
    for (let t = 1; t <= NUM_TIERS; t++) TIER_NAMES[t] = LEAGUE_DEFS[t]?.name || `Tier ${t}`;
    const TIER_COLORS = { 1: C.gold, 2: C.blue, 3: C.lightRed };

    // Slot picker screen (no active slot chosen yet)
    if (!activeSaveSlot) {
      return (
        <div style={{
          minHeight: "100vh", background: "#0a0a1a", color: C.text,
          fontFamily: FONT,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: isMobile ? "16px" : 0,
        }}>
          <div style={{ textAlign: "center", maxWidth: 420, width: "90%" }}>
            <div style={{
              fontSize: F.xl, color: C.green, letterSpacing: 2, marginBottom: 28,
              textShadow: "0 0 20px rgba(74,222,128,0.4)",
              lineHeight: 1.2,
            }}>
              JUMPERS FOR GOALPOSTS
            </div>

            <div style={{ fontSize: F.md, color: C.textMuted, marginBottom: 16, letterSpacing: 1 }}>
              SELECT SAVE SLOT
            </div>

            {[1, 2, 3].map(slot => {
              const summary = saveSlotSummaries[slot - 1];
              const occupied = !!summary;
              return (
                <div key={slot} style={{
                  position: "relative",
                  marginBottom: 10,
                  border: occupied ? `2px solid ${TIER_COLORS[summary.leagueTier] || C.bgInput}` : `2px solid ${C.bgCard}`,
                  background: occupied ? "rgba(15,23,42,0.8)" : "rgba(10,10,26,0.5)",
                  borderRadius: 4,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                  onClick={async () => {
                    if (occupied) {
                      setActiveSaveSlot(slot);
                      const loaded = await loadGame(slot);
                      if (loaded) {
                        // Achievement: Save Scummer — load a save (delayed check after state is restored)
                        setTimeout(() => {
                          setUnlockedAchievements(prev => {
                            if (prev.has("save_scummer")) return prev;
                            const n = new Set(prev); n.add("save_scummer");
                            setAchievementQueue(q => [...q, "save_scummer"]);
                            return n;
                          });
                        }, 500);
                      } else {
                        setSaveSlotSummaries(prev => { const n = [...prev]; n[slot - 1] = null; return n; });
                        setActiveSaveSlot(null);
                      }
                    } else {
                      // Empty slot: select it and show mode picker for new career
                      setActiveSaveSlot(slot);
                      setShowModeSelect(true);
                    }
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = occupied ? "rgba(30,41,59,0.6)" : "rgba(30,41,59,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = occupied ? "rgba(15,23,42,0.8)" : "rgba(10,10,26,0.5)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 16px" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: occupied ? `linear-gradient(135deg, ${TIER_COLORS[summary.leagueTier] || C.bgInput}44, ${TIER_COLORS[summary.leagueTier] || C.bgInput}22)` : "rgba(30,41,59,0.3)",
                      border: `1px solid ${occupied ? (TIER_COLORS[summary?.leagueTier] || C.bgInput) + "66" : C.bgCard}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: F.lg, marginRight: 14, flexShrink: 0,
                      color: occupied ? (TIER_COLORS[summary.leagueTier] || C.textDim) : C.bgInput,
                    }}>
                      {slot}
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      {occupied ? (
                        <>
                          <div style={{ fontSize: F.md, color: C.text, marginBottom: 4 }}>
                            {summary.teamName}
                          </div>
                          <div style={{ fontSize: F.sm, color: TIER_COLORS[summary.leagueTier] || C.textDim }}>
                            {TIER_NAMES[summary.leagueTier] || "Sunday League"} · Season {summary.seasonNumber} · Wk {summary.week}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: F.md, color: C.bgInput }}>EMPTY SLOT</div>
                      )}
                    </div>
                    <div style={{ fontSize: F.md, color: occupied ? C.green : C.bgInput, marginLeft: 8 }}>
                      {occupied ? "▶" : "+"}
                    </div>
                  </div>

                  {/* Delete button for occupied slots */}
                  {occupied && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${summary.teamName}" save? This cannot be undone!`)) {
                          deleteSave(slot);
                        }
                      }}
                      style={{
                        position: "absolute", top: 6, right: 6,
                        background: "none", border: "none", color: C.slate,
                        fontSize: F.sm, cursor: "pointer", padding: "4px 8px",
                        fontFamily: FONT,
                        opacity: 0.5,
                      }}
                      onMouseEnter={e => { e.target.style.color = C.lightRed; e.target.style.opacity = 1; }}
                      onMouseLeave={e => { e.target.style.color = C.slate; e.target.style.opacity = 0.5; }}
                    >✕</button>
                  )}
                </div>
              );
            })}
            <div style={{ textAlign: "center", marginTop: 24, paddingBottom: 8 }}>
              <button
                onClick={() => { setActiveProfileId(null); setViewingMuseumList(null); setViewingMuseumCareer(null); }}
                style={{
                  padding: "14px 28px", background: "none",
                  border: "1px solid #334155", color: C.slate,
                  fontFamily: FONT, fontSize: "clamp(8px,1.8vw,10px)",
                  cursor: "pointer", letterSpacing: 2,
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
                onMouseLeave={e => e.currentTarget.style.color = C.slate}
              >◀ SWITCH PROFILE</button>
            </div>
          </div>
        </div>
      );
    }

    // Mode selection (for new empty slot)
    if (showModeSelect) {
      return (
        <ModeSelectScreen
          slotNumber={activeSaveSlot}
          onSelect={(mode) => { setGameMode(mode); setShowModeSelect(false); }}
          onBack={() => { setShowModeSelect(false); setActiveSaveSlot(null); }}
        />
      );
    }

    // New game name input (activeSaveSlot is set, mode chosen, but no teamName yet)
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0a1a", color: C.text,
        fontFamily: FONT,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: isMobile ? "16px" : 0,
      }}>
        <div style={{ textAlign: "center", maxWidth: 420, width: "90%" }}>
          <div style={{
            fontSize: F.h3, color: C.green, letterSpacing: 3, marginBottom: 8,
            textShadow: "0 0 20px rgba(74,222,128,0.4)",
          }}>
            ⚽ JUMPERS FOR GOALPOSTS
          </div>
          <div style={{ fontSize: F.sm, color: C.slate, marginBottom: 32 }}>
            Save Slot {activeSaveSlot} · New Career
          </div>

          <div style={{ fontSize: F.md, color: C.textMuted, marginBottom: 12, letterSpacing: 1 }}>
            NAME YOUR CLUB
          </div>
          <input
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value.slice(0, 20))}
            onKeyDown={e => { if (e.key === "Enter" && nameInput.trim()) { setTeamName(nameInput.trim()); setNewspaperName(generateNewspaperName(nameInput.trim())); setReporterName(generateReporterName()); } }}
            placeholder="e.g. Denton FC"
            autoFocus
            style={{
              width: "100%", padding: "14px 18px",
              background: C.bg, border: `2px solid ${C.bgInput}`,
              color: C.text, fontSize: F.lg,
              fontFamily: FONT,
              textAlign: "center", outline: "none",
              marginBottom: 16,
            }}
            onFocus={e => e.target.style.borderColor = C.green}
            onBlur={e => e.target.style.borderColor = C.bgInput}
          />
          <button
            onClick={() => { if (nameInput.trim()) { setTeamName(nameInput.trim()); setNewspaperName(generateNewspaperName(nameInput.trim())); setReporterName(generateReporterName()); } }}
            disabled={!nameInput.trim()}
            style={{
              width: "100%", padding: "16px",
              background: nameInput.trim() ? "linear-gradient(180deg, #166534, #14532d)" : "rgba(30,41,59,0.3)",
              border: nameInput.trim() ? `2px solid ${C.green}` : `1px solid ${C.bgCard}`,
              color: nameInput.trim() ? C.green : C.bgInput,
              fontFamily: FONT,
              fontSize: F.lg, cursor: nameInput.trim() ? "pointer" : "default",
              letterSpacing: 2,
              marginBottom: 12,
              animation: nameInput.trim() ? "glow 2s ease infinite" : "none",
            }}
          >
            NEW GAME ▶
          </button>
          <button
            onClick={() => setActiveSaveSlot(null)}
            style={{
              width: "100%", padding: "12px",
              background: "none", border: `1px solid ${C.bgCard}`,
              color: C.slate, fontFamily: FONT,
              fontSize: F.sm, cursor: "pointer", letterSpacing: 1,
            }}
          >
            ◀ BACK
          </button>
        </div>
      </div>
    );
  }

  // Museum list — career picker when accessed from profile screen
  if (viewingMuseumList && !viewingMuseumCareer) {

    const entries = viewingMuseumList.entries || [];
    return (
      <div style={{ minHeight: "100vh", background: "#06060f", fontFamily: FONT, overflowY: "auto", padding: "32px 20px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: "2em", marginBottom: 14 }}>📋</div>
            <div style={{ fontSize: "clamp(16px,4vw,22px)", color: C.lightRed, letterSpacing: 2, marginBottom: 10 }}>MUSEUM</div>
            <div style={{ fontSize: "clamp(9px,2vw,11px)", color: C.slate, letterSpacing: 1 }}>ARCHIVED IRONMAN CAREERS</div>
          </div>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", fontSize: "clamp(9px,2vw,11px)", color: C.slate, padding: "32px 0" }}>
              No archived careers yet.<br /><br />Ironman careers are saved here<br />when the board sacks you.
            </div>
          ) : (
            entries.slice().reverse().map((entry, i) => {
              const date = entry.archivedAt
                ? new Date(entry.archivedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : null;
              const seasons = Math.max(0, (entry.seasonNumber || 1) - 1);
              return (
                <div
                  key={i}
                  style={{
                    ...CARD.red, marginBottom: 10,
                    borderRadius: 3,
                    display: "flex", alignItems: "stretch",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.07)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.03)"}
                >
                  {/* Main content — click to view */}
                  <div
                    style={{ flex: 1, padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                    onClick={() => setViewingMuseumCareer(entry)}
                  >
                    <div>
                      <div style={{ fontSize: "clamp(11px,2.5vw,13px)", color: "#f1f5f9", marginBottom: 6 }}>
                        {entry.teamName || "Unknown Club"}
                      </div>
                      <div style={{ fontSize: "clamp(8px,1.8vw,10px)", color: "#94a3b8", lineHeight: 1.8 }}>
                        {seasons > 0 ? `${seasons} season${seasons !== 1 ? "s" : ""}` : "<1 season"} · Tier {entry.leagueTier || "?"}
                        {date ? ` · ${date}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: "clamp(10px,2.2vw,12px)", color: C.lightRed, flexShrink: 0 }}>VIEW ▶</div>
                  </div>
                  {/* Delete — fixed-width column, full card height, separated by border */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setMuseumDeleteConfirm(entry);
                    }}
                    style={{
                      width: 44, flexShrink: 0,
                      background: "none",
                      border: "none", borderLeft: "1px solid rgba(248,113,113,0.15)",
                      borderRadius: "0 3px 3px 0",
                      color: C.slate, fontFamily: FONT,
                      fontSize: "clamp(9px,2vw,11px)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = C.lightRed; e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = C.slate; e.currentTarget.style.background = "none"; }}
                    title="Discard this archived career"
                  >✕</button>
                </div>
              );
            })
          )}
          <div style={{ textAlign: "center", marginTop: 24, paddingBottom: 32 }}>
            <button
              onClick={() => { setViewingMuseumList(null); setActiveProfileId(null); }}
              style={{
                padding: "14px 28px", background: "none",
                border: "1px solid #334155", color: C.slate,
                fontFamily: FONT, fontSize: "clamp(8px,1.8vw,10px)",
                cursor: "pointer", letterSpacing: 2,
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
              onMouseLeave={e => e.currentTarget.style.color = C.slate}
            >◀ BACK TO MENU</button>
          </div>
        </div>

        {/* Delete confirmation modal — inline because this block is an early return */}
        {museumDeleteConfirm && (
          <div style={{ ...MODAL.backdrop, zIndex: Z.confirm }}>
            <div style={{
              ...MODAL.box, border: `3px solid ${C.lightRed}`,
              padding: "36px 44px", maxWidth: 420, width: "90%",
              boxShadow: "0 0 50px rgba(248,113,113,0.25), inset 0 0 80px rgba(0,0,0,0.6)",
            }}>
              <div style={{ fontSize: "clamp(11px,2.5vw,14px)", color: C.lightRed, marginBottom: 16, letterSpacing: 2 }}>
                🗑 DELETE CAREER?
              </div>
              <div style={{ fontSize: "clamp(10px,2.2vw,12px)", color: "#f1f5f9", lineHeight: 2, marginBottom: 8 }}>
                {museumDeleteConfirm.teamName || "This career"}
              </div>
              <div style={{ fontSize: "clamp(8px,1.8vw,10px)", color: "#94a3b8", lineHeight: 1.8, marginBottom: 28 }}>
                This will permanently erase their legacy.<br />There is no undo.
              </div>
              <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
                <button onClick={() => setMuseumDeleteConfirm(null)} style={{
                  ...BTN.primary, background: "rgba(74,222,128,0.08)",
                  padding: "14px 26px", fontSize: "clamp(8px,1.8vw,10px)",
                }}>KEEP</button>
                <button onClick={() => {
                  const key = museumDeleteConfirm.archivedAt;
                  deleteMuseumEntry(viewingMuseumList?.profileId || useGameStore.getState().activeProfileId, key);
                  setViewingMuseumList(prev => prev ? { ...prev, entries: prev.entries.filter(en => en.archivedAt !== key) } : prev);
                  setMuseumDeleteConfirm(null);
                }} style={{
                  ...BTN.danger, padding: "14px 26px", fontSize: "clamp(8px,1.8vw,10px)",
                }}>DELETE</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Museum career view
  if (viewingMuseumCareer) {
    return (
      <MuseumScreen
        career={viewingMuseumCareer}
        closeLabel={viewingMuseumList ? "◀ BACK TO MUSEUM" : "RETURN TO MENU"}
        onClose={() => {
          if (viewingMuseumList) {
            setViewingMuseumCareer(null);
          } else {
            setViewingMuseumCareer(null);
            setGameOver(false);
            setTeamName("");
            setActiveSaveSlot(null);
            setActiveProfileId(null);
          }
        }}
      />
    );
  }

  // Game over — sacked in Ironman
  if (gameOver) {
    const _returnToMenu = () => {
      setGameOver(false); setTeamName(""); setActiveSaveSlot(null); setActiveProfileId(null);
    };
    return (
      <SackingScreen
        teamName={teamName}
        seasonNumber={seasonNumber}
        leagueTier={leagueTier}
        totalMatches={totalMatches}
        totalGoals={clubHistory?.totalGoalsFor || 0}
        clubHistory={clubHistory?.seasonArchive || []}
        onViewCareer={async () => {
          // Load the most recent museum entry from this profile
          try {
            const prof = await readProfile(useGameStore.getState().activeProfileId);
            const entries = prof?.museum || [];
            const latest = entries[entries.length - 1] || null;
            if (latest) {
              setViewingMuseumCareer(latest);
            } else {
              // No archive entry (shouldn't happen) — fall through to menu
              _returnToMenu();
            }
          } catch {
            _returnToMenu();
          }
        }}
        onReturnToMenu={_returnToMenu}
      />
    );
  }

  if (!league) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a1a",
      color: C.text,
      fontFamily: FONT,
      padding: isMobile ? "8px" : "20px 24px",
      position: "relative",
      maxWidth: 1600,
      margin: "0 auto",
    }}>
      {/* Emergency reset - always accessible at highest z-index */}
      {(processing || matchResult || gains !== null || ovrLevelUps || cupMatchResult || selectedPlayer || pendingPlayerUnlock) && (
        <button onClick={() => {
          setProcessing(false);
          setMatchResult(null);
          setGains(null);
          setOvrLevelUps(null);
          setShowCup(false);
          setCupMatchResult(null);
          setSelectedPlayer(null);
          setViewingTeamGlobal(null);
          setPendingPlayerUnlock(null);
          setShowTable(false);
          setShowAchievements(false);
          setShowLegends(false);
          setShowCalendar(false);
          setShowSquad(false);
        }} style={{
          position: "fixed", top: 4, right: 4, zIndex: Z.fullscreen,
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
          color: C.lightRed, fontSize: F.micro, padding: "4px 8px", cursor: "pointer",
          fontFamily: FONT, opacity: 0.4,
        }} title="Reset stuck UI">✕ RESET</button>
      )}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes sheen {
          0% { transform: translateX(-100%); }
          20% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pixelFade {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(0); }
        }
        * { box-sizing: border-box; }
        html { touch-action: manipulation; background: #0a0a1a; padding-top: env(safe-area-inset-top); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.bgInput}; }
      `}</style>

      {/* Upcoming game banner + action button */}
      {(() => {
        const calEntry = seasonCalendar?.[calendarIndex];
        const leagueDef = LEAGUE_DEFS[leagueTier] || {};
        const leagueColor = leagueDef.color || C.textMuted;
        // Compute next match info
        let bannerMatch = null;
        if (calEntry) {
          if (calEntry.type === "league" && league) {
            const fixture = league.fixtures?.[calEntry.leagueMD]?.find(f => f.home === 0 || f.away === 0);
            if (fixture) {
              const isHome = fixture.home === 0;
              const oppIdx = isHome ? fixture.away : fixture.home;
              bannerMatch = { type: "league", opponent: league.teams[oppIdx], isHome, label: `${leagueDef.name || "League"} MD ${calEntry.leagueMD + 1}` };
            }
          } else if (calEntry.type === "cup" && cup && !cup.playerEliminated) {
            const round = cup.rounds?.[calEntry.cupRound];
            const pm = round?.matches?.find(m => m.home?.isPlayer || m.away?.isPlayer);
            if (pm) {
              const opponent = pm.home?.isPlayer ? pm.away : pm.home;
              bannerMatch = { type: "cup", opponent, isHome: pm.home?.isPlayer, label: `${cup.cupName || "Clubman Cup"} ${calEntry.cupRoundName || ""}`.trim() };
            } else {
              bannerMatch = { type: "cup", opponent: null, isHome: true, label: `${cup.cupName || "Clubman Cup"} ${calEntry.cupRoundName || ""}`.trim() };
            }
          } else if (calEntry.type === "dynasty" && dynastyCupBracket && !dynastyCupBracket.playerEliminated) {
            const dRound = calEntry.round;
            let dOpp = null;
            if (dRound === "sf") {
              const sf = dynastyCupBracket.playerSF === 1 ? dynastyCupBracket.sf1 : dynastyCupBracket.sf2;
              dOpp = sf.home.isPlayer ? sf.away : sf.home;
            } else if (dynastyCupBracket.final.home && dynastyCupBracket.final.away) {
              dOpp = dynastyCupBracket.final.home.isPlayer ? dynastyCupBracket.final.away : dynastyCupBracket.final.home;
            }
            bannerMatch = { type: "cup", opponent: dOpp, isHome: false, label: `Dynasty Cup ${dRound === "sf" ? "Semi-Final" : "Final"}` };
          } else if (calEntry.type === "mini" && miniTournamentBracket && !miniTournamentBracket.playerEliminated) {
            const mRound = calEntry.round;
            let mOpp = null;
            if (mRound === "sf_leg1" || mRound === "sf_leg2") {
              const msf = miniTournamentBracket.playerSF === 1 ? miniTournamentBracket.sf1 : miniTournamentBracket.sf2;
              mOpp = msf.home.isPlayer ? msf.away : msf.home;
            } else if (mRound === "third_place" && miniTournamentBracket.thirdPlace) {
              mOpp = miniTournamentBracket.thirdPlace.home.isPlayer ? miniTournamentBracket.thirdPlace.away : miniTournamentBracket.thirdPlace.home;
            } else if (mRound === "final" && miniTournamentBracket.final.home && miniTournamentBracket.final.away) {
              mOpp = miniTournamentBracket.final.home.isPlayer ? miniTournamentBracket.final.away : miniTournamentBracket.final.home;
            }
            const mLabel = mRound === "sf_leg1" ? "Mini SF Leg 1" : mRound === "sf_leg2" ? "Mini SF Leg 2" : mRound === "third_place" ? "5v5 3rd Place" : "Mini Final";
            bannerMatch = { type: "cup", opponent: mOpp, isHome: false, label: `5v5 ${mLabel}` };
          }
        }
        const isCupBanner = bannerMatch?.type === "cup";
        const accentColor = isCupBanner ? C.amber : leagueColor;
        // Context line: "SEASON X · WEEK Y — LEAGUE TWO MD 5" or "— CLUBMAN CUP QUARTER-FINAL"
        const contextLabel = bannerMatch ? bannerMatch.label.toUpperCase() : (calEntry?.type === "training" ? "TRAINING" : "");
        // Action button logic
        const isCupMatch = calEntry?.type === "cup" && useGameStore.getState().cup?.pendingPlayerMatch && !useGameStore.getState().cup?.playerEliminated;
        const isDisabled = processing || (summerPhase === "summary" || summerPhase === "intake");
        const isSummer = summerPhase === "awaiting_end" || summerPhase === "break";
        return (
          <div style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1a1a3e 100%)",
            border: `1px solid #1e293b`,
            borderLeft: `4px solid ${accentColor}`,
            borderRadius: 6,
            padding: isMobile ? "14px 12px" : "16px 20px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: isMobile ? F.xs : F.sm, color: C.textDim, letterSpacing: 1.2, marginBottom: 4 }}>
                {isMobile ? `S${seasonNumber} · W${week}` : `SEASON ${seasonNumber} · WEEK ${week}`}{contextLabel ? ` — ${contextLabel}` : ""}
              </div>
              {bannerMatch ? (
                <div style={{ fontSize: isMobile ? F.sm : F.xl, color: C.text, letterSpacing: 0.5, lineHeight: 1.6 }}>
                  {bannerMatch.isHome ? (
                    <>
                      <span style={{ color: C.green, fontWeight: "bold" }}>{teamName}</span>
                      <span style={{ color: C.slate, margin: isMobile ? "0 6px" : "0 10px" }}>vs</span>
                      <span style={{ color: isCupBanner ? C.amber : C.text }}>{bannerMatch.opponent?.name || "TBD"}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: isCupBanner ? C.amber : C.text }}>{bannerMatch.opponent?.name || "TBD"}</span>
                      <span style={{ color: C.slate, margin: isMobile ? "0 6px" : "0 10px" }}>vs</span>
                      <span style={{ color: C.green, fontWeight: "bold" }}>{teamName}</span>
                    </>
                  )}
                </div>
              ) : isSummer ? (
                <div style={{ fontSize: isMobile ? F.sm : F.lg, color: C.amber, letterSpacing: 0.5 }}>
                  ☀️ {summerPhase === "awaiting_end" ? "SEASON COMPLETE" : "SUMMER BREAK"}
                </div>
              ) : (
                <div style={{ fontSize: isMobile ? F.sm : F.lg, color: C.textMuted, letterSpacing: 0.5 }}>
                  Training Week
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0 }}>
              {matchPending ? (
                <button
                  onClick={() => {
                    // Starting XI warning: block if no lineup assigned
                    if (!startingXI || startingXI.length === 0) {
                      setShowLineupWarning("match");
                      return;
                    }
                    // Altitude Trials: enforce minimum ATK players
                    const atkMod = getModifier(leagueTier);
                    if (atkMod.minAtkPlayers) {
                      const atkPositions = new Set(["AM", "LW", "RW", "ST"]);
                      const atkCount = startingXI.map(id => squad.find(p => p.id === id)).filter(p => p && atkPositions.has(p.position)).length;
                      if (atkCount < atkMod.minAtkPlayers) {
                        setInboxMessages(prev => [...prev, {
                          id: `msg_atk_block_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                          icon: "🏔️", title: "Board Directive: More Attackers Required",
                          body: `The board insists on attacking football. You need at least ${atkMod.minAtkPlayers} attackers (AM/LW/RW/ST) in your starting XI. Currently: ${atkCount}.`,
                          color: C.red, read: false,
                        }]);
                        return;
                      }
                    }
                    // Mini-tournament: use 5v5 squad from squad page
                    const _calE = useGameStore.getState().seasonCalendar?.[useGameStore.getState().calendarIndex];
                    if (_calE?.type === "mini" && useGameStore.getState().miniTournamentBracket && !useGameStore.getState().miniTournamentBracket.playerEliminated) {
                      const _fiveIds = fiveASideSquad || [];
                      const _fiveFilled = _fiveIds.filter(Boolean).length;
                      if (_fiveFilled < 5) {
                        setInbox(prev => [...prev, {
                          id: `msg_five_incomplete_${Date.now()}`,
                          sender: "Match Official",
                          subject: "5v5 Squad Incomplete",
                          body: `You need 5 players selected for the mini-tournament. You have ${_fiveFilled}. Go to SQUAD to pick your 5.`,
                          read: false,
                          week: useGameStore.getState().calendarIndex,
                        }]);
                        return;
                      }
                      // Simulate match directly
                      const _miniCal = useGameStore.getState().seasonCalendar?.[useGameStore.getState().calendarIndex];
                      const _miniRound = _miniCal?.round;
                      const _miniSF = useGameStore.getState().miniTournamentBracket.playerSF === 1 ? useGameStore.getState().miniTournamentBracket.sf1 : useGameStore.getState().miniTournamentBracket.sf2;
                      let _miniOpp = null;
                      if (_miniRound === "sf_leg1" || _miniRound === "sf_leg2") {
                        _miniOpp = _miniSF.home.isPlayer ? _miniSF.away : _miniSF.home;
                      } else if (_miniRound === "third_place" && useGameStore.getState().miniTournamentBracket.thirdPlace) {
                        const tp = useGameStore.getState().miniTournamentBracket.thirdPlace;
                        _miniOpp = tp.home.isPlayer ? tp.away : tp.home;
                      } else {
                        _miniOpp = useGameStore.getState().miniTournamentBracket.final.home?.isPlayer ? useGameStore.getState().miniTournamentBracket.final.away : useGameStore.getState().miniTournamentBracket.final.home;
                      }
                      setMatchPending(false);
                      setProcessing(true);
                      const playerFive = _fiveIds.map(id => squad.find(p => p.id === id)).filter(Boolean);
                      const aiFive = buildAIFiveASide(_miniOpp);
                      const playerTeam = { name: teamName, color: C.green, squad: playerFive, isPlayer: true, trait: null };
                      const oppTeam = { ..._miniOpp, squad: aiFive };
                      const miniMod = getModifier(leagueTier);
                      const result = simulateMatch(playerTeam, oppTeam, _fiveIds, [], true, 1.0, 0, null, 0, miniMod);
                      let penalties = null;
                      if ((_miniRound === "final" || _miniRound === "third_place") && result.homeGoals === result.awayGoals) {
                        penalties = generatePenaltyShootout(playerTeam, oppTeam, result.events, _fiveIds, [], miniMod);
                      }
                      const miniLeague = { teams: [playerTeam, oppTeam], leagueName: "5v5 Mini-Tournament", leagueColor: "#fbbf24" };
                      setCupMatchResult({
                        ...result, home: 0, away: 1,
                        cupLeague: miniLeague, cupHome: playerTeam, cupAway: oppTeam,
                        isPlayerHome: true, isCup: true, isMini: true, miniRound: _miniRound,
                        penalties, _calendarIndex: useGameStore.getState().calendarIndex,
                      });
                      return;
                    }
                    if (playMatchBtnRef.current) {
                      playMatchBtnRef.current.click();
                    } else {
                      // Hidden button not in DOM (user is on a non-home/squad tab) — navigate home first
                      setShowAchievements(false); setShowTable(false); setShowCalendar(false);
                      setShowCup(false); setShowTransfers(false); setShowLegends(false); setShowSquad(false);
                      setTimeout(() => playMatchBtnRef.current?.click(), 0);
                    }
                  }}
                  style={{
                    background: isCupMatch
                      ? (injuryWarning > 0 ? "linear-gradient(180deg, #b91c1c, #991b1b)" : "linear-gradient(180deg, #854d0e, #713f12)")
                      : (injuryWarning > 0 ? "linear-gradient(180deg, #b91c1c, #991b1b)" : "linear-gradient(180deg, #166534, #14532d)"),
                    border: isCupMatch
                      ? (injuryWarning > 0 ? `2px solid ${C.lightRed}` : `2px solid ${C.gold}`)
                      : (injuryWarning > 0 ? `2px solid ${C.lightRed}` : `2px solid ${C.green}`),
                    color: isCupMatch
                      ? (injuryWarning > 0 ? "#fca5a5" : C.gold)
                      : (injuryWarning > 0 ? "#fca5a5" : C.green),
                    padding: isMobile ? "10px 14px" : "10px 22px",
                    cursor: "pointer",
                    fontFamily: FONT,
                    fontSize: isMobile ? F.sm : F.md,
                    letterSpacing: 1,
                    borderRadius: 20,
                    animation: "glow 2s ease infinite",
                  }}
                >
                  {isCupMatch ? "🏆 PLAY MATCH" : calEntry?.type === "dynasty" ? "🌍 PLAY MATCH" : calEntry?.type === "mini" ? "🌐 PLAY MATCH" : "⚽ PLAY MATCH"}
                </button>
              ) : summerPhase === "awaiting_end" ? (
                <button
                  onClick={triggerSeasonEnd}
                  disabled={processing}
                  style={{
                    background: processing ? "rgba(30,41,59,0.5)" : "linear-gradient(180deg, #92400e, #78350f)",
                    border: processing ? `1px solid ${C.bgInput}` : "2px solid #f59e0b",
                    color: processing ? C.slate : C.amber,
                    padding: isMobile ? "10px 14px" : "10px 22px",
                    cursor: processing ? "not-allowed" : "pointer",
                    fontFamily: FONT,
                    fontSize: isMobile ? F.sm : F.md,
                    letterSpacing: 1,
                    borderRadius: 20,
                    animation: processing ? "none" : "glow 2s ease infinite",
                  }}
                >
                  ☀️ END SEASON
                </button>
              ) : summerPhase === "break" ? (
                <button
                  onClick={advanceSummer}
                  disabled={processing}
                  style={{
                    background: processing ? "rgba(30,41,59,0.5)" : "linear-gradient(180deg, #92400e, #78350f)",
                    border: processing ? `1px solid ${C.bgInput}` : "2px solid #f59e0b",
                    color: processing ? C.slate : C.amber,
                    padding: isMobile ? "10px 14px" : "10px 22px",
                    cursor: processing ? "not-allowed" : "pointer",
                    fontFamily: FONT,
                    fontSize: isMobile ? F.sm : F.md,
                    letterSpacing: 1,
                    borderRadius: 20,
                    animation: processing ? "none" : "glow 2s ease infinite",
                  }}
                >
                  ☀️ ADVANCE SUMMER
                </button>
              ) : (
                <button
                  onClick={() => {
                    const nextEntry = seasonCalendar?.[calendarIndex + 1];
                    const nextIsMatch = nextEntry && ["league", "cup", "dynasty", "mini"].includes(nextEntry.type);
                    if (nextIsMatch && (!startingXI || startingXI.length === 0)) {
                      setShowLineupWarning("advance");
                      return;
                    }
                    advanceWeek();
                  }}
                  disabled={isDisabled}
                  style={{
                    background: isDisabled ? "rgba(30,41,59,0.5)" : "linear-gradient(180deg, #166534, #14532d)",
                    border: isDisabled ? `1px solid ${C.bgInput}` : `2px solid ${C.green}`,
                    color: isDisabled ? C.slate : C.green,
                    padding: isMobile ? "10px 14px" : "10px 22px",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    fontFamily: FONT,
                    fontSize: isMobile ? F.sm : F.md,
                    letterSpacing: 1,
                    borderRadius: 20,
                    animation: isDisabled ? "none" : "glow 2s ease infinite",
                    opacity: isDisabled ? 0.5 : 1,
                  }}
                >
                  ▶ ADVANCE WEEK
                </button>
              )}
              {matchPending && !isCupMatch && getModifier(leagueTier).prediction && aiPredictionRef.current && (
                <div style={{ fontFamily: FONT, fontSize: F.xs, color: "#a78bfa", marginTop: 6, textAlign: "center" }}>
                  🛸 AI predicts: {aiPredictionRef.current.home} - {aiPredictionRef.current.away}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Hidden file input for save import (used by Boot Room) */}
      <input type="file" ref={fileInputRef} accept=".json" style={{ display: "none" }} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) importSave(file);
        e.target.value = "";
      }} />

      {/* Nav bar — persistent across all tabs */}
      {(() => {
        const clearAll = () => { setShowAchievements(false); setShowTable(false); setShowCalendar(false); setShowCup(false); setShowTransfers(false); setShowLegends(false); setShowSquad(false); };
        const isHome = !showSquad && !showTable && !showCalendar && !showCup && !showTransfers && !showLegends && !showAchievements;
        const navBtn = (active, color, label, onClick) => ({
          background: active ? `${color}22` : "rgba(30, 41, 59, 0.5)",
          border: active ? `1px solid ${color}` : `1px solid ${C.bgInput}`,
          color: color,
          padding: isMobile ? "10px 8px" : "12px 20px",
          cursor: "pointer",
          fontFamily: FONT,
          fontSize: isMobile ? F.xs : F.md,
          flex: isMobile ? "1 1 auto" : undefined,
          minHeight: isMobile ? 40 : undefined,
        });
        return (
          <div style={{ display: "flex", gap: isMobile ? 6 : 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={() => clearAll()} style={navBtn(isHome, C.green)}>🏠 HOME</button>
            <button onClick={() => { clearAll(); setShowSquad(true); }} style={navBtn(showSquad, C.blue)}>📋 SQUAD</button>
            <button onClick={() => { if (showCalendar) setBootRoomKey(k => k + 1); clearAll(); setInitialBootRoomTab("inbox"); setShowCalendar(true); }} style={navBtn(showCalendar, C.blue)}>
              🥾 BOOT ROOM
              {(() => {
                const unread = inboxMessages.filter(m => !m.read && isMessageVisible(m, week || 1)).length;
                const arcPending = ["player","club","legacy"].filter(cat => { const cs = storyArcs?.[cat]; if (!cs || cs.completed) return false; const arc = STORY_ARCS.find(a => a.id === cs.arcId); if (!arc) return false; const step = arc.steps[cs.step]; return step?.t === "focus" && !cs.focus; }).length;
                const total = unread + arcPending;
                return total > 0 ? <span style={{ background: C.red, color: "#fff", fontSize: F.xs, padding: "3px 7px", borderRadius: 8, marginLeft: 8, fontFamily: FONT, minWidth: 20, textAlign: "center", display: "inline-block", lineHeight: "14px", verticalAlign: "middle" }}>{total}</span> : null;
              })()}
            </button>
            <button onClick={() => { if (showTable) setLeagueKey(k => k + 1); clearAll(); setShowTable(true); }} style={navBtn(showTable, C.gold)}>🏆 LEAGUE</button>
            {cup && <button onClick={() => { if (showCup) setCupKey(k => k + 1); clearAll(); setShowCup(true); }} style={navBtn(showCup, cup.playerEliminated ? C.slate : C.gold)}>🏆 CUP{cup.playerEliminated ? " (OUT)" : ""}</button>}
            <button onClick={() => { if (showTransfers) setTransfersKey(k => k + 1); clearAll(); setShowTransfers(true); }} style={navBtn(showTransfers, C.green)}>🤝 TRANSFERS</button>
            <button onClick={() => { if (showLegends) setClubKey(k => k + 1); clearAll(); setShowLegends(true); }} style={navBtn(showLegends, C.purple)}>📜 CLUB</button>
            <button onClick={() => { if (showAchievements) setCabinetKey(k => k + 1); clearAll(); setShowAchievements(true); }} style={navBtn(showAchievements, C.gold)}>🏅 CABINET</button>
          </div>
        );
      })()}

      {/* Page content */}
      {showAchievements ? (
        <AchievementCabinet key={cabinetKey} unlocked={unlockedAchievements} squad={squad} clubHistory={clubHistory} currentTier={leagueTier} ovrCap={ovrCap} gameMode={gameMode} isTainted={isTainted}
          tickets={tickets} retiringPlayers={retiringPlayers} transferFocus={transferFocus}
          doubleTrainingWeek={doubleTrainingWeek} twelfthManActive={twelfthManActive}
          youthCoupActive={youthCoupActive} pendingFreeAgent={pendingFreeAgent}
          shortlist={shortlist} scoutedPlayers={scoutedPlayers} testimonialPlayer={testimonialPlayer}
          rewindableMatches={(() => {
            const cal = seasonCalendar || [];
            const matches = [];
            for (let i = 0; i < calendarIndex; i++) {
              const e = cal[i]; const r = calendarResults[i];
              if (e?.type === "league" && r && !r.won) {
                const fix = league?.fixtures?.[e.leagueMD]?.find(f => f.home === 0 || f.away === 0);
                const isHome = fix ? fix.home === 0 : true;
                const oppIdx = fix ? (isHome ? fix.away : fix.home) : -1;
                const oppName = league?.teams?.[oppIdx]?.name || "???";
                matches.push({ calIdx: i, md: e.leagueMD + 1, oppName, isHome, playerGoals: r.playerGoals, oppGoals: r.oppGoals, isDraw: !!r.draw });
              }
            }
            return matches;
          })()}
          onUseTicket={{
            delay_retirement: useTicketDelayRetirement, random_attr: useTicketRandomAttr,
            relation_boost: useTicketRelationBoost, double_session: useTicketDoubleSession,
            miracle_cream: useTicketMiracleCream, twelfth_man: useTicketTwelfthMan,
            youth_coup: useTicketYouthCoup, rename_player: useTicketRenamePlayer,
            transfer_insider: useTicketTransferInsider, scout_dossier: useTicketScoutDossier,
            testimonial_match: useTicketTestimonialMatch,
            saudi_agent: useTicketSaudiAgent,
            rewind: useTicketRewind,
          }} />
      ) : showTable ? (
        <LeaguePage
          key={leagueKey}
          league={league}
          leagueResults={leagueResults}
          matchweekIndex={matchweekIndex}
          teamName={teamName}
          playerSeasonStats={playerSeasonStats}
          playerRatingTracker={playerRatingTracker}
          squad={squad}
          startingXI={startingXI}
          bench={bench}
          seasonNumber={seasonNumber}
          clubHistory={clubHistory}
          allTimeLeagueStats={allTimeLeagueStats}
          allLeagueStates={allLeagueStates}
          leagueTier={leagueTier}
          onPlayerClick={resolveAnyPlayer}
          onTeamClick={handleGlobalTeamClick}
          clubRelationships={clubRelationships}
          transferFocus={transferFocus}
          onSetFocus={handleFocusSet}
          onRemoveFocus={handleFocusRemove}
          onReplaceFocus={handleFocusReplace}
          dynastyCupBracket={dynastyCupBracket}
          miniTournamentBracket={miniTournamentBracket}
          ovrCap={ovrCap}
        />
      ) : showCalendar ? (
        <BootRoom
          key={bootRoomKey}
          calendar={seasonCalendar}
          calendarIndex={calendarIndex}
          league={league}
          cup={cup}
          calendarResults={calendarResults}
          seasonNumber={seasonNumber}
          week={week}
          settings={{ matchSpeed, setMatchSpeed, soundEnabled, setSoundEnabled, autoSaveEnabled, setAutoSaveEnabled, trainingCardSpeed, setTrainingCardSpeed, matchDetail, setMatchDetail, musicEnabled, setMusicEnabled, musicVolume, setMusicVolume, disabledTracks, setDisabledTracks, instantMatch, setInstantMatch }}
          matchweekIndex={matchweekIndex}
          onHoliday={(targetMD) => {
            // Clear any existing interval
            if (holidayIntervalRef.current) {
              clearInterval(holidayIntervalRef.current);
              holidayIntervalRef.current = null;
            }

            // Don't start if already at or past target
            if (useGameStore.getState().matchweekIndex >= targetMD) {
              return;
            }

            // Set target and enable holiday mode
            holidayTargetRef.current = targetMD;
            holidayStartMatchweekRef.current = useGameStore.getState().matchweekIndex;
            holidayWeeksWithoutMatchRef.current = 0;
            setIsOnHoliday(true);
            setInstantMatch(true); // Auto-enable instant match for fast simulation
            // Achievement: Hands Off — first holiday
            if (!unlockedAchievements.has("hands_off")) {
              setUnlockedAchievements(prev => { const n = new Set(prev); n.add("hands_off"); return n; });
              setAchievementQueue(prev => [...prev, "hands_off"]);
            }

            // Use interval to check state and advance (using refs for fresh values)
            holidayIntervalRef.current = setInterval(() => {
              // Helper: clean up holiday state
              const stopHoliday = () => {
                clearInterval(holidayIntervalRef.current);
                holidayIntervalRef.current = null;
                holidayTargetRef.current = null;
                setIsOnHoliday(false);
                setInstantMatch(false);
                setMatchResult(null);
                setCupMatchResult(null);
                setProcessing(false);
                setMatchPending(false);
                setArcStepQueue([]);
                // Navigate to Home tab
                setShowAchievements(false); setShowTable(false); setShowCalendar(false);
                setShowCup(false); setShowTransfers(false); setShowLegends(false); setShowSquad(false);
              };

              // Stop if target reached (matchweekIndex is number of completed matches)
              if (useGameStore.getState().matchweekIndex >= targetMD) {
                stopHoliday();
                return;
              }

              // Safety: Stop if we've gone 20 weeks without a match
              if (holidayWeeksWithoutMatchRef.current > 20) {
                stopHoliday();
                console.warn("Holiday mode stopped: no matches found in 20 weeks");
                return;
              }

              // Stop if entered summer (season ended)
              if (useGameStore.getState().summerPhase) {
                stopHoliday();
                return;
              }

              // Only advance if not currently processing AND no pending squad changes
              if (!useGameStore.getState().processing && !useGameStore.getState().pendingSquad) {
                // If a match is pending, trigger it with FRESH squad from ref (not stale state)
                if (useGameStore.getState().matchPending) {
                  try {
                  // Trigger match simulation directly with fresh refs instead of clicking button
                  // This ensures we use the latest squad data, not stale closures
                  const freshSquad = useGameStore.getState().squad;
                  const exhaustedHolidayIds = new Set(freshSquad.filter(p => p.isLegend && (p.legendAppearances || 0) >= 12).map(p => p.id));
                  const currentXI = startingXI.filter(id => !exhaustedHolidayIds.has(id));
                  const currentBench = bench.filter(id => !exhaustedHolidayIds.has(id));

                  // Check if it's a cup, dynasty, or league match
                  const calEntry = useGameStore.getState().seasonCalendar?.[useGameStore.getState().calendarIndex];
                  const isCupMatch = calEntry?.type === "cup";
                  const isDynastyMatch = calEntry?.type === "dynasty";

                  if (isDynastyMatch) {
                    // === HOLIDAY: Dynasty Cup match ===
                    const bracket = useGameStore.getState().dynastyCupBracket;
                    if (bracket && !bracket.playerEliminated) {
                      const round = calEntry.round; // "sf" or "final"
                      let homeTeam, awayTeam;
                      if (round === "sf") {
                        const sf = bracket.playerSF === 1 ? bracket.sf1 : bracket.sf2;
                        homeTeam = sf.home;
                        awayTeam = sf.away;
                      } else {
                        homeTeam = bracket.final.home;
                        awayTeam = bracket.final.away;
                      }
                      const playerTeam = { name: teamName, color: C.green, squad: freshSquad, isPlayer: true, trait: null };
                      const isPlayerHome = homeTeam.isPlayer;
                      const homeT = isPlayerHome ? playerTeam : homeTeam;
                      const awayT = isPlayerHome ? awayTeam : playerTeam;
                      const dynOOPMult = formation ? getTeamOOPMultiplier(currentXI, formation, freshSquad, slotAssignments) : 1.0;
                      const dynMod = getModifier(leagueTier);
                      const result = simulateMatch(homeT, awayT, currentXI, currentBench, true, dynOOPMult, 0, talismanIdRef.current, 0, dynMod);
                      let penalties = null;
                      if (result.homeGoals === result.awayGoals) {
                        penalties = generatePenaltyShootout(homeT, awayT, result.events, currentXI, currentBench, dynMod);
                      }
                      let hg = result.homeGoals;
                      let ag = result.awayGoals;
                      const winner = penalties
                        ? (penalties.winner === "home" ? homeTeam : awayTeam)
                        : (hg > ag ? homeTeam : hg < ag ? awayTeam : homeTeam);
                      const playerWon = winner.isPlayer;

                      if (round === "sf") {
                        // Auto-sim other SF
                        const otherSF = bracket.playerSF === 1 ? bracket.sf2 : bracket.sf1;
                        const otherResult = simulateMatch(otherSF.home, otherSF.away, null, null, true, 1, 0, null, 0, dynMod);
                        let otherWinner = otherResult.homeGoals > otherResult.awayGoals ? otherSF.home
                          : otherResult.awayGoals > otherResult.homeGoals ? otherSF.away : null;
                        if (!otherWinner) {
                          const otherPens = generatePenaltyShootout(otherSF.home, otherSF.away, otherResult.events, null, null, dynMod);
                          otherWinner = otherPens.winner;
                        }
                        const playerSFKey = bracket.playerSF === 1 ? "sf1" : "sf2";
                        const otherSFKey = bracket.playerSF === 1 ? "sf2" : "sf1";
                        setDynastyCupBracket(prev => ({
                          ...prev,
                          [playerSFKey]: { ...prev[playerSFKey], result: { homeGoals: hg, awayGoals: ag, winner, pens: penalties } },
                          [otherSFKey]: { ...prev[otherSFKey], result: { homeGoals: otherResult.homeGoals, awayGoals: otherResult.awayGoals, winner: otherWinner } },
                          final: { home: bracket.playerSF === 1 ? winner : otherWinner, away: bracket.playerSF === 1 ? otherWinner : winner },
                          playerEliminated: !playerWon,
                        }));
                        setInboxMessages(prev => [...prev, {
                          id: `msg_hol_dynasty_sf_${Date.now()}`, week: week, season: seasonNumber,
                          icon: "🌍", title: "Dynasty Cup — Semi-Finals",
                          body: `Your match: ${homeTeam.name} ${hg}-${ag} ${awayTeam.name}${playerWon ? " ✓" : " ✗"}\nOther SF: ${otherSF.home.name} ${otherResult.homeGoals}-${otherResult.awayGoals} ${otherSF.away.name}${playerWon ? `\n\nYou face ${otherWinner.name} in the final!` : `\n\nYour Dynasty Cup run is over.`}`,
                          color: "#facc15", read: false,
                        }]);
                      } else {
                        // Final
                        setDynastyCupBracket(prev => ({
                          ...prev,
                          final: { ...prev.final, result: { homeGoals: hg, awayGoals: ag, winner, pens: penalties } },
                          winner,
                        }));
                        if (playerWon) {
                          const eligible = freshSquad.filter(p => currentXI.includes(p.id));
                          if (eligible.length > 0) {
                            const motm = eligible[Math.floor(Math.random() * eligible.length)];
                            const attrs = ["pace","shooting","passing","dribbling","defending","physical","goalkeeping"];
                            const attr = attrs[Math.floor(Math.random() * attrs.length)];
                            const ovrCap = getOvrCap(prestigeLevel);
                            const newVal = Math.min(motm.legendCap || ovrCap, (motm.attrs[attr] || 1) + 1);
                            setSquad(prev => prev.map(p => p.id === motm.id ? { ...p, attrs: { ...p.attrs, [attr]: newVal } } : p));
                            setInboxMessages(prev => [...prev, {
                              id: `msg_hol_dynasty_win_${Date.now()}`, week: week, season: seasonNumber,
                              icon: "🏆", title: "Dynasty Cup Champions!",
                              body: `You've won the Dynasty Cup! ${motm.name} earns +1 ${attr.charAt(0).toUpperCase() + attr.slice(1)} (now ${newVal}).`,
                              color: "#facc15", read: false,
                            }]);
                          }
                        } else {
                          setInboxMessages(prev => [...prev, {
                            id: `msg_hol_dynasty_loss_${Date.now()}`, week: week, season: seasonNumber,
                            icon: "🌍", title: "Dynasty Cup Final",
                            body: `${winner.name} beat you ${hg > ag ? `${hg}-${ag}` : `${ag}-${hg}`} to win the Dynasty Cup.`,
                            color: "#facc15", read: false,
                          }]);
                        }
                      }

                      // Calendar result + advance
                      const pGoals = isPlayerHome ? hg : ag;
                      const oGoals = isPlayerHome ? ag : hg;
                      const dynOppName = (isPlayerHome ? awayTeam : homeTeam)?.name || "?";
                      setCalendarResults(prev => ({
                        ...prev,
                        [useGameStore.getState().calendarIndex]: { playerGoals: pGoals, oppGoals: oGoals, won: playerWon, draw: false, oppName: dynOppName, pens: penalties ? { homeScore: penalties.homeScore, awayScore: penalties.awayScore } : null }
                      }));
                      // If player eliminated in SF, skip remaining dynasty entries
                      let newCI = useGameStore.getState().calendarIndex + 1;
                      if (!playerWon && round === "sf") {
                        const cal = useGameStore.getState().seasonCalendar || [];
                        while (newCI < cal.length && cal[newCI]?.type === "dynasty") {
                          // Auto-sim AI final if it's the final entry
                          if (cal[newCI].round === "final" && useGameStore.getState().dynastyCupBracket) {
                            const bk = useGameStore.getState().dynastyCupBracket;
                            if (bk.final?.home && bk.final?.away) {
                              const finR = simulateMatch(bk.final.home, bk.final.away, null, null, true, 1, 0, null, 0, dynMod);
                              let finW = finR.homeGoals > finR.awayGoals ? bk.final.home : finR.awayGoals > finR.homeGoals ? bk.final.away : null;
                              if (!finW) {
                                const finPens = generatePenaltyShootout(bk.final.home, bk.final.away, finR.events, null, null, dynMod);
                                finW = finPens.winner;
                              }
                              setDynastyCupBracket(prev => ({ ...prev, final: { ...prev.final, result: { homeGoals: finR.homeGoals, awayGoals: finR.awayGoals, winner: finW } }, winner: finW }));
                              setInboxMessages(prev => [...prev, {
                                id: `msg_hol_dynasty_ai_final_${Date.now()}`, week: week, season: seasonNumber,
                                icon: "🏆", title: "Dynasty Cup Final",
                                body: `${finW.name} won the Dynasty Cup, beating ${finW === bk.final.home ? bk.final.away.name : bk.final.home.name} ${finR.homeGoals}-${finR.awayGoals}.`,
                                color: "#facc15", read: false,
                              }]);
                            }
                          }
                          setCalendarResults(prev => ({ ...prev, [newCI]: { spectator: true, label: cal[newCI].round === "sf" ? "Dynasty Cup Semi-Finals" : "Dynasty Cup Final" } }));
                          newCI++;
                        }
                      }
                      setCalendarIndex(newCI);
                      setTotalMatches(prev => prev + 1);
                      setHolidayMatchesThisSeason(prev => prev + 1);

                      // Squad appearance tracking
                      setSquad(prev => prev.map(p => {
                        if (currentXI.includes(p.id)) {
                          return { ...p, seasonStarts: (p.seasonStarts || 0) + 1, ...(p.isLegend ? { legendAppearances: Math.min(12, (p.legendAppearances || 0) + 1) } : {}) };
                        }
                        return p;
                      }));
                    }
                    // Non-participant dynasty entries: don't set matchPending,
                    // advanceWeek will handle AI sim + inbox on next tick
                    setMatchPending(false);
                  } else if (isCupMatch && useGameStore.getState().cup) {
                    // Cup match - simulate directly (don't click button)
                    const pm = useGameStore.getState().cup.pendingPlayerMatch;
                    if (pm) {
                      const opponent = pm.home.isPlayer ? pm.away : pm.home;
                      const oppTier = opponent.tier || leagueTier;
                      const freshLeague = useGameStore.getState().league;
                      const oppLeagueData = oppTier === leagueTier ? freshLeague : (allLeagueStates?.[oppTier] || null);
                      const storedOpp = oppLeagueData?.teams?.find(t => t.name === opponent.name);
                      const oppTeam = storedOpp || { name: opponent.name, color: opponent.color || C.textMuted, squad: [], strength: opponent.strength || 0.5, trait: opponent.trait };
                      const playerTeam = { name: teamName, color: C.green, squad: freshSquad, isPlayer: true, trait: null };
                      const isPlayerHome = pm.home.isPlayer;
                      const isNeutral = pm.neutral || false;
                      const homeT = isPlayerHome ? playerTeam : oppTeam;
                      const awayT = isPlayerHome ? oppTeam : playerTeam;
                      const cupOOPMult = formation ? getTeamOOPMultiplier(currentXI, formation, freshSquad, slotAssignments) : 1.0;
                      const cup12thMan = (isPlayerHome && !isNeutral && useGameStore.getState().twelfthManActive) ? 0.15 : 0;
                      const cupFanMod = isPlayerHome && !isNeutral ? (useGameStore.getState().fanSentiment > 75 ? 0.03 : useGameStore.getState().fanSentiment < 25 ? -0.03 : 0) : 0;
                      const result = simulateMatch(homeT, awayT, currentXI, currentBench, isNeutral, cupOOPMult, cup12thMan, talismanIdRef.current, cupFanMod);
                      if (cup12thMan > 0) setTwelfthManActive(false);
                      let penalties = null;
                      if (result.homeGoals === result.awayGoals) {
                        penalties = generatePenaltyShootout(homeT, awayT, result.events, currentXI, currentBench, getModifier(leagueTier));
                      }
                      // === HOLIDAY: process cup result inline, skip MatchResultScreen ===
                      let hg = result.homeGoals;
                      let ag = result.awayGoals;
                      let penResult = penalties;
                      if (hg === ag && !penResult) {
                        if (Math.random() < 0.5) hg++; else ag++;
                      }
                      const winner = penResult
                        ? (penResult.winner === "home" ? pm.home : pm.away)
                        : (hg > ag ? pm.home : pm.away);

                      // Capture round info before setCup mutates it
                      const _holidayCupRound = useGameStore.getState().cup?.currentRound ?? 0;
                      const _holidayCupTotalRounds = useGameStore.getState().cup?.rounds?.length ?? 5;

                      // Record result in cup rounds and build next round
                      const cupGoalScorers = (result.events || [])
                        .filter(e => e.type === "goal")
                        .map(e => ({ name: e.player, assister: e.assister || null, side: e.side, minute: e.minute }));
                      setCup(prev => {
                        if (!prev || !prev.pendingPlayerMatch) return prev;
                        const newRounds = prev.rounds.map((r, rIdx) => {
                          if (rIdx !== prev.currentRound) return r;
                          return { ...r, matches: r.matches.map(m => {
                            if (m.home?.name === prev.pendingPlayerMatch.home?.name && m.away?.name === prev.pendingPlayerMatch.away?.name) {
                              return { ...m, result: { homeGoals: hg, awayGoals: ag, winner, penalties: penResult ? { homeScore: penResult.homeScore, awayScore: penResult.awayScore } : null, goalScorers: cupGoalScorers } };
                            }
                            return m;
                          })};
                        });
                        const updatedCup = { ...prev, rounds: newRounds, pendingPlayerMatch: null };
                        const playerEliminated = !winner.isPlayer;
                        return buildNextCupRound({ ...updatedCup, playerEliminated: playerEliminated || prev.playerEliminated });
                      });

                      // Calendar result + advance index
                      const cupPGoals = isPlayerHome ? result.homeGoals : result.awayGoals;
                      const cupOGoals = isPlayerHome ? result.awayGoals : result.homeGoals;
                      const cupWon = penResult
                        ? (penResult.winner === "home" ? isPlayerHome : !isPlayerHome)
                        : cupPGoals > cupOGoals;
                      setCalendarResults(prev => ({
                        ...prev,
                        [useGameStore.getState().calendarIndex]: { playerGoals: cupPGoals, oppGoals: cupOGoals, won: cupWon, draw: false }
                      }));
                      setCalendarIndex(prev => prev + 1);

                      // Core stats (cup matches count too)
                      setTotalMatches(prev => prev + 1);
                      setHolidayMatchesThisSeason(prev => prev + 1);
                      setRecentScorelines(prev => [...prev.slice(-2), [cupPGoals, cupOGoals]]);
                      // Fan & Board Sentiment (holiday cup match)
                      { const _isCupFinal = _holidayCupRound === _holidayCupTotalRounds - 1;
                        const _holCupFanMult = getModifier(leagueTier).fanSentimentMult || 1;
                        const _fanDelta = (cupWon
                          ? (_isCupFinal ? 15 : _holidayCupRound >= 2 ? 5 : 3)
                          : (_holidayCupRound <= 1 ? -5 : -2)) * _holCupFanMult;
                        setFanSentiment(Math.max(0, Math.min(100, useGameStore.getState().fanSentiment + _fanDelta)));
                        setBoardSentiment(Math.max(0, Math.min(100, useGameStore.getState().boardSentiment + (cupWon ? (_isCupFinal ? 10 : 3) : -4))));
                      }
                      setClubHistory(prev => {
                        const h = { ...prev };
                        h.totalWins = (h.totalWins || 0) + (cupWon ? 1 : 0);
                        h.totalLosses = (h.totalLosses || 0) + (!cupWon ? 1 : 0);
                        h.totalGoalsFor = (h.totalGoalsFor || 0) + cupPGoals;
                        h.totalGoalsConceded = (h.totalGoalsConceded || 0) + cupOGoals;
                        return h;
                      });

                      // Squad appearance tracking for cup matches
                      setSquad(prev => prev.map(p => {
                        if (currentXI.includes(p.id)) {
                          return { ...p, seasonStarts: (p.seasonStarts || 0) + 1, ...(p.isLegend ? { legendAppearances: Math.min(12, (p.legendAppearances || 0) + 1) } : {}) };
                        }
                        const subEntry = result.playerRatings?.find(
                          pr => pr.name === p.name && pr.isSub && pr.minutesPlayed > 0
                        );
                        if (subEntry) {
                          return { ...p, seasonSubApps: (p.seasonSubApps || 0) + 1, ...(p.isLegend ? { legendAppearances: Math.min(12, (p.legendAppearances || 0) + 1) } : {}) };
                        }
                        return p;
                      }));
                      // Holiday testimonial cleanup after cup match
                      const _holTestiCup = useGameStore.getState().testimonialPlayer;
                      if (_holTestiCup) {
                        const tid = _holTestiCup.id;
                        setSquad(prev => prev.filter(p => p.id !== tid));
                        setStartingXI(prev => prev.filter(id => id !== tid));
                        setBench(prev => prev.filter(id => id !== tid));
                        setTestimonialPlayer(null);
                      }
                    }
                    setMatchPending(false);
                  } else {
                    // League match - simulate with FRESH league from ref (not stale closure)
                    const holidayCalEntry = useGameStore.getState().seasonCalendar?.[useGameStore.getState().calendarIndex];
                    const capturedMWIdx = holidayCalEntry?.leagueMD;
                    const freshLeague = useGameStore.getState().league;
                    if (freshLeague && freshLeague.fixtures && capturedMWIdx != null && capturedMWIdx < freshLeague.fixtures.length) {
                      const updatedLeague = { ...freshLeague, table: freshLeague.table.map(r => ({ ...r })) };
                      const league12thMan = useGameStore.getState().twelfthManActive ? 0.15 : 0;
                      const leagueFanMod = useGameStore.getState().fanSentiment > 75 ? 0.03 : useGameStore.getState().fanSentiment < 25 ? -0.03 : 0;
                      // Hangover: one random healthy starter gets -1 all attrs for the match
                      const holLeagueMod = getModifier(leagueTier);
                      let holHangoverPlayer = null;
                      let holHangoverOrig = null;
                      if (holLeagueMod.hangover) {
                        const healthyStarters = freshSquad.filter(p => currentXI.includes(p.id) && !p.injury);
                        if (healthyStarters.length > 0) {
                          holHangoverPlayer = healthyStarters[rand(0, healthyStarters.length - 1)];
                          holHangoverOrig = { ...holHangoverPlayer.attrs };
                          ATTRIBUTES.forEach(({ key }) => { holHangoverPlayer.attrs[key] = Math.max(1, holHangoverPlayer.attrs[key] - 1); });
                        }
                      }
                      const results = simulateMatchweek(updatedLeague, capturedMWIdx, freshSquad, currentXI, currentBench, formation, slotAssignments, league12thMan, talismanIdRef.current, leagueFanMod, holLeagueMod);
                      if (holHangoverPlayer && holHangoverOrig) Object.assign(holHangoverPlayer.attrs, holHangoverOrig);
                      if (league12thMan > 0) setTwelfthManActive(false);
                      if (results) {
                        const condensed = results.map(r => ({
                          home: r.home, away: r.away,
                          homeGoals: r.homeGoals, awayGoals: r.awayGoals,
                          goalScorers: (r.events || []).filter(e => e.type === "goal").map(e => ({ name: e.player, assister: e.assister || null, side: e.side, minute: e.minute })),
                          cardRecipients: (r.events || []).filter(e => e.type === "card" && e.cardPlayer).map(e => ({
                            name: e.cardPlayer,
                            teamIdx: e.cardTeamName === updatedLeague.teams[r.home]?.name ? r.home : r.away,
                          })),
                        }));
                        setLeagueResults(prev => ({ ...prev, [capturedMWIdx]: condensed }));
                        const playerMatch = results.find(r =>
                          updatedLeague.teams[r.home].isPlayer || updatedLeague.teams[r.away].isPlayer
                        );
                        setLeague(updatedLeague);
                        // Holiday: Dynasty Cup bracket setup at end of league
                        {
                          const holTotalFix = updatedLeague.fixtures?.length || 18;
                          const holCompletedMDs = capturedMWIdx + 1;
                          const holDynMod = getModifier(leagueTier);
                          if (holDynMod.knockoutAtEnd && holCompletedMDs === holTotalFix) {
                            const holSorted = sortStandings(updatedLeague.table);
                            const holTop4 = holSorted.slice(0, 4).map(r => ({ teamIndex: r.teamIndex, name: updatedLeague.teams[r.teamIndex]?.name }));
                            setDynastyCupQualifiers(holTop4);
                            const holPlayerInTop4 = holTop4.some(t => updatedLeague.teams[t.teamIndex]?.isPlayer);
                            if (holPlayerInTop4) {
                              const sf1H = updatedLeague.teams[holTop4[0].teamIndex];
                              const sf1A = updatedLeague.teams[holTop4[3].teamIndex];
                              const sf2H = updatedLeague.teams[holTop4[1].teamIndex];
                              const sf2A = updatedLeague.teams[holTop4[2].teamIndex];
                              const pInSF1 = sf1H.isPlayer || sf1A.isPlayer;
                              setDynastyCupBracket({
                                sf1: { home: sf1H, away: sf1A, result: null },
                                sf2: { home: sf2H, away: sf2A, result: null },
                                final: { home: null, away: null, result: null },
                                playerSF: pInSF1 ? 1 : 2,
                                playerEliminated: false,
                                winner: null,
                              });
                            }
                            setInboxMessages(prev => [...prev, {
                              id: `msg_hol_dynasty_draw_${Date.now()}`, week: week, season: seasonNumber,
                              icon: "🌍", title: "Dynasty Cup Draw",
                              body: `The league season is over. The top 4 enter the Dynasty Cup knockout!\n\nSF: ${holTop4[0]?.name || "TBD"} vs ${holTop4[3]?.name || "TBD"}\nSF: ${holTop4[1]?.name || "TBD"} vs ${holTop4[2]?.name || "TBD"}\n\n${holPlayerInTop4 ? "You're in!" : "You didn't make the cut."}`,
                              color: "#facc15", read: false,
                            }]);
                          }
                        }
                        // Holiday: Mini-Tournament bracket setup at end of league
                        {
                          const holMiniMod = getModifier(leagueTier);
                          if (holMiniMod.miniTournament) {
                            const holMiniTotal = updatedLeague.fixtures?.length || 18;
                            const holMiniCompleted = capturedMWIdx + 1;
                            if (holMiniCompleted === holMiniTotal) {
                              const holMiniSorted = sortStandings(updatedLeague.table);
                              const holMiniTop4 = holMiniSorted.slice(0, 4).map(r => ({ teamIndex: r.teamIndex, name: updatedLeague.teams[r.teamIndex]?.name }));
                              const holMiniPlayerIn = holMiniTop4.some(t => updatedLeague.teams[t.teamIndex]?.isPlayer);
                              if (holMiniPlayerIn) {
                                const ms1H = updatedLeague.teams[holMiniTop4[0].teamIndex];
                                const ms1A = updatedLeague.teams[holMiniTop4[3].teamIndex];
                                const ms2H = updatedLeague.teams[holMiniTop4[1].teamIndex];
                                const ms2A = updatedLeague.teams[holMiniTop4[2].teamIndex];
                                const mpInSF1 = ms1H.isPlayer || ms1A.isPlayer;
                                setMiniTournamentBracket({
                                  sf1: { home: ms1H, away: ms1A, leg1: null, leg2: null, winner: null },
                                  sf2: { home: ms2H, away: ms2A, leg1: null, leg2: null, winner: null },
                                  final: { home: null, away: null, result: null },
                                  playerSF: mpInSF1 ? 1 : 2,
                                  playerEliminated: false,
                                  winner: null,
                                  fiveASide: true,
                                });
                              }
                              setInboxMessages(prev => [...prev, {
                                id: `msg_hol_mini_draw_${Date.now()}`, week: week, season: seasonNumber,
                                icon: "🌐", title: "5v5 Mini-Tournament Draw",
                                body: `The league season is over. The top 4 enter the 5v5 Mini-Tournament!\n\nSF: ${holMiniTop4[0]?.name || "TBD"} vs ${holMiniTop4[3]?.name || "TBD"} (2 legs)\nSF: ${holMiniTop4[1]?.name || "TBD"} vs ${holMiniTop4[2]?.name || "TBD"} (2 legs)\n\n${holMiniPlayerIn ? "You're in! (Auto-picking your 5v5 squad during holiday)" : "You didn't qualify."}`,
                                color: "#fbbf24", read: false,
                              }]);
                            }
                          }
                        }
                        // matchweekIndex derived from calendarIndex — no explicit increment needed
                        setAllLeagueStates(prev => {
                          if (!prev || Object.keys(prev).length === 0) return prev;
                          const next = {};
                          for (const [t, aiLeague] of Object.entries(prev)) {
                            if (aiLeague.matchweekIndex >= aiLeague.fixtures.length) {
                              next[t] = aiLeague;
                            } else {
                              const copy = { ...aiLeague, table: aiLeague.table.map(r => ({ ...r })) };
                              simulateMatchweek(copy, aiLeague.matchweekIndex, null, null, null, null, null);
                              next[t] = { ...copy, matchweekIndex: aiLeague.matchweekIndex + 1 };
                            }
                          }
                          return next;
                        });
                        if (playerMatch) {
                          // === HOLIDAY: process stats inline, skip MatchResultScreen ===
                          const pIsHome = updatedLeague.teams[playerMatch.home]?.isPlayer;
                          const pGoals = pIsHome ? playerMatch.homeGoals : playerMatch.awayGoals;
                          const oGoals = pIsHome ? playerMatch.awayGoals : playerMatch.homeGoals;
                          const pWon = pGoals > oGoals;
                          const isDraw = pGoals === oGoals;
                          const pLost = oGoals > pGoals;

                          // Calendar result + advance index
                          setCalendarResults(prev => ({
                            ...prev,
                            [useGameStore.getState().calendarIndex]: { playerGoals: pGoals, oppGoals: oGoals, won: pWon, draw: isDraw }
                          }));
                          let newCI = useGameStore.getState().calendarIndex + 1;
                          const cal = useGameStore.getState().seasonCalendar || [];
                          while (newCI < cal.length && cal[newCI]?.type === "cup" && useGameStore.getState().cup?.playerEliminated) {
                            if (useGameStore.getState().cup && useGameStore.getState().cup.currentRound < useGameStore.getState().cup.rounds.length) {
                              const skipLookup = (name, tier) => (tier === leagueTier ? updatedLeague : allLeagueStates?.[tier])?.teams?.find(t => t.name === name) || null;
                              const skipCup = advanceCupRound(useGameStore.getState().cup, freshSquad, currentXI, currentBench, skipLookup);
                              let finCup = skipCup;
                              if (finCup.pendingPlayerMatch) {
                                const pm2 = finCup.pendingPlayerMatch;
                                const w2 = pm2.away;
                                const nr2 = finCup.rounds.map((r, rIdx) => {
                                  if (rIdx !== finCup.currentRound) return r;
                                  return { ...r, matches: r.matches.map(m =>
                                    m.home?.name === pm2.home?.name && m.away?.name === pm2.away?.name
                                      ? { ...m, result: { homeGoals: 0, awayGoals: 1, winner: w2 } }
                                      : m
                                  )};
                                });
                                finCup = { ...finCup, rounds: nr2, pendingPlayerMatch: null };
                                finCup = buildNextCupRound(finCup); // Only needed here — advanceCupRound returned early
                              }
                              setCup(finCup);
                            }
                            newCI++;
                          }
                          setCalendarIndex(newCI);

                          // Core stats
                          setTotalMatches(prev => prev + 1);
                          setHolidayMatchesThisSeason(prev => prev + 1);
                          setSeasonGoalsFor(prev => prev + pGoals);
                          if (oGoals === 0) setSeasonCleanSheets(prev => prev + 1);
                          if (isDraw) setSeasonDraws(prev => prev + 1);
                          setRecentScorelines(prev => [...prev.slice(-2), [pGoals, oGoals]]);
                          if (pGoals + oGoals >= 5) setHighScoringMatches(prev => prev + 1);

                          // Consecutive streaks
                          if (pLost) { setConsecutiveLosses(prev => prev + 1); setConsecutiveUnbeaten(0); setConsecutiveDraws(0); setConsecutiveWins(0); }
                          else { setConsecutiveUnbeaten(prev => prev + 1); setConsecutiveLosses(0); }
                          if (isDraw) { setConsecutiveDraws(prev => prev + 1); setConsecutiveWins(0); } else setConsecutiveDraws(0);
                          if (pWon) setConsecutiveWins(prev => prev + 1); else setConsecutiveWins(0);
                          if (pGoals === 0) setConsecutiveScoreless(prev => prev + 1); else setConsecutiveScoreless(0);
                          // Fan & Board Sentiment (holiday league match)
                          { const _holFanMult = getModifier(leagueTier).fanSentimentMult || 1;
                          setFanSentiment(Math.max(0, Math.min(100, useGameStore.getState().fanSentiment +
                            ((pWon ? (pIsHome ? 5 : 6) : isDraw ? -1 : (pIsHome ? -8 : -5)) +
                            (pGoals >= 3 ? 2 : 0) + (oGoals === 0 ? 1 : 0)) * _holFanMult
                          ))); }
                          setBoardSentiment(Math.max(0, Math.min(100, useGameStore.getState().boardSentiment + (pWon ? 3 : isDraw ? 0 : -4))));

                          // Ultimatum tracking (Ironman) — use ref to avoid stale closure
                          if (useGameStore.getState().ultimatumActive) {
                            updateUltimatumProgressRef.current?.(pWon, isDraw, useGameStore.getState().cup?.playerEliminated ?? true);
                          }

                          // Club history
                          const goalDiff = pGoals - oGoals;
                          const oppTeam = pIsHome ? updatedLeague.teams[playerMatch.away] : updatedLeague.teams[playerMatch.home];
                          setClubHistory(prev => {
                            const h = { ...prev };
                            h.totalWins = (h.totalWins || 0) + (pWon ? 1 : 0);
                            h.totalDraws = (h.totalDraws || 0) + (isDraw ? 1 : 0);
                            h.totalLosses = (h.totalLosses || 0) + (pLost ? 1 : 0);
                            h.totalGoalsFor = (h.totalGoalsFor || 0) + pGoals;
                            h.totalGoalsConceded = (h.totalGoalsConceded || 0) + oGoals;
                            if (pWon && goalDiff > (h.biggestWin?.diff || 0)) h.biggestWin = { score: `${pGoals}-${oGoals}`, opponent: oppTeam?.name || "?", season: seasonNumber, diff: goalDiff };
                            if (pLost && goalDiff < (h.worstDefeat?.diff || 0)) h.worstDefeat = { score: `${pGoals}-${oGoals}`, opponent: oppTeam?.name || "?", season: seasonNumber, diff: goalDiff };
                            return h;
                          });
                          if (pWon && oppTeam) setBeatenTeams(prev => new Set([...prev, oppTeam.name]));

                          // Matchday roundup inbox
                          try {
                            if (condensed && condensed.length > 0) {
                              const allScorers = condensed.flatMap(r => (r.goalScorers || []).map(s => s.name)).filter(Boolean);
                              const surnameCounts = {};
                              allScorers.forEach(name => { surnameCounts[name.split(" ").pop()] = (surnameCounts[name.split(" ").pop()] || 0) + 1; });
                              const shortName = (fn) => { if (!fn) return "?"; const p = fn.split(" "); const s = p[p.length-1]; return p.length <= 1 ? fn : surnameCounts[s] > 1 ? `${p[0][0]}.${s}` : s; };
                              const lines = condensed.map(r => {
                                const hN = updatedLeague.teams[r.home]?.shortName || updatedLeague.teams[r.home]?.name || "Home";
                                const aN = updatedLeague.teams[r.away]?.shortName || updatedLeague.teams[r.away]?.name || "Away";
                                const isPM = updatedLeague.teams[r.home]?.isPlayer || updatedLeague.teams[r.away]?.isPlayer;
                                const scList = (r.goalScorers||[]).filter(s => s.name).sort((a,b)=>a.minute-b.minute).map(s => s.assister ? `${shortName(s.name)} ${s.minute}' (A: ${shortName(s.assister)})` : `${shortName(s.name)} ${s.minute}'`).join(", ");
                                return isPM ? `⚽ ${hN} ${r.homeGoals}-${r.awayGoals} ${aN}${scList ? ` (${scList})` : ""}` : `${hN} ${r.homeGoals}-${r.awayGoals} ${aN}${scList ? ` (${scList})` : ""}`;
                              });
                              const sorted = sortStandings(updatedLeague.table);
                              const playerPos = sorted.findIndex(r => updatedLeague.teams[r.teamIndex]?.isPlayer) + 1;
                              const top3 = sorted.slice(0, 3).map((r, i) => `${i+1}. ${updatedLeague.teams[r.teamIndex]?.shortName || updatedLeague.teams[r.teamIndex]?.name || "?"} ${r.points}pts`).join(" · ");
                              const standingsLine = playerPos <= 3 ? top3 : `${top3} · ... ${playerPos}. ${teamName} ${sorted[playerPos-1]?.points || 0}pts`;
                              setInboxMessages(prev => [...prev, {
                                id: `msg_md_${capturedMWIdx}_${Date.now()}`, week: week, season: seasonNumber,
                                icon: "📋", color: C.blue,
                                title: `Matchday ${capturedMWIdx + 1} Results`,
                                body: `${lines.join("\n")}\n\n📊 ${standingsLine}`,
                                read: false,
                              }]);
                            }
                          } catch(err) { console.error("Holiday inbox error:", err); }

                          // Player season stats (goals, assists, apps, cards, MOTM)
                          const side = pIsHome ? "home" : "away";
                          setPlayerSeasonStats(prev => {
                            const next = { ...prev };
                            currentXI.forEach(id => {
                              const p = freshSquad.find(pl => pl.id === id);
                              if (p) {
                                if (!next[p.name]) next[p.name] = { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0 };
                                next[p.name].apps++;
                                if (p.position) next[p.name].position = p.position;
                                if (p.nationality) next[p.name].nationality = p.nationality;
                              }
                            });
                            if (playerMatch.scorers) {
                              for (const [key, count] of Object.entries(playerMatch.scorers)) {
                                const [scorerSide, name] = key.split("|");
                                if (scorerSide === side) { if (!next[name]) next[name] = { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0 }; next[name].goals += count; }
                              }
                            }
                            if (playerMatch.assisters) {
                              for (const [key, count] of Object.entries(playerMatch.assisters)) {
                                const [assisterSide, name] = key.split("|");
                                if (assisterSide === side) { if (!next[name]) next[name] = { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0 }; next[name].assists = (next[name].assists || 0) + count; }
                              }
                            }
                            if (playerMatch.events) {
                              const ptName = pIsHome ? updatedLeague.teams[playerMatch.home]?.name : updatedLeague.teams[playerMatch.away]?.name;
                              playerMatch.events.forEach(evt => {
                                if ((evt.type === "card" || evt.type === "red_card") && evt.cardTeamName === ptName && evt.cardPlayer) {
                                  if (!next[evt.cardPlayer]) next[evt.cardPlayer] = { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0 };
                                  if (evt.type === "red_card") next[evt.cardPlayer].reds++; else next[evt.cardPlayer].yellows++;
                                }
                              });
                            }
                            if (playerMatch.motmName) { if (!next[playerMatch.motmName]) next[playerMatch.motmName] = { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0 }; next[playerMatch.motmName].motm++; }
                            return next;
                          });

                          // MOTM and rating trackers
                          if (playerMatch.motmName) setMotmTracker(prev => ({ ...prev, [playerMatch.motmName]: (prev[playerMatch.motmName] || 0) + 1 }));
                          if (playerMatch.playerRatings) {
                            setPlayerRatingTracker(prev => {
                              const next = { ...prev };
                              playerMatch.playerRatings.forEach(pr => { if (pr.rating !== null) { if (!next[pr.name]) next[pr.name] = []; next[pr.name] = [...next[pr.name], pr.rating]; } });
                              return next;
                            });
                          }

                          // Squad appearance tracking (seasonStarts / seasonSubApps)
                          setSquad(prev => prev.map(p => {
                            if (currentXI.includes(p.id)) {
                              return { ...p, seasonStarts: (p.seasonStarts || 0) + 1, ...(p.isLegend ? { legendAppearances: Math.min(12, (p.legendAppearances || 0) + 1) } : {}) };
                            }
                            const subEntry = playerMatch.playerRatings?.find(
                              pr => pr.name === p.name && pr.isSub && pr.minutesPlayed > 0
                            );
                            if (subEntry) {
                              return { ...p, seasonSubApps: (p.seasonSubApps || 0) + 1, ...(p.isLegend ? { legendAppearances: Math.min(12, (p.legendAppearances || 0) + 1) } : {}) };
                            }
                            return p;
                          }));
                        }
                        // Holiday testimonial cleanup after league match
                        const _holTestiLeague = useGameStore.getState().testimonialPlayer;
                        if (_holTestiLeague) {
                          const tid = _holTestiLeague.id;
                          setSquad(prev => prev.filter(p => p.id !== tid));
                          setStartingXI(prev => prev.filter(id => id !== tid));
                          setBench(prev => prev.filter(id => id !== tid));
                          setTestimonialPlayer(null);
                        }
                        // Euro Dynasty: televised match — MotM gets +1 random ATTR (holiday)
                        const _holTvMod = getModifier(leagueTier);
                        if (_holTvMod.televisedChance && Math.random() < _holTvMod.televisedChance && playerMatch.motmName) {
                          const _tvMotm = useGameStore.getState().squad?.find(p => p.name === playerMatch.motmName);
                          if (_tvMotm) {
                            const _tvCap = getOvrCap(prestigeLevel);
                            const _tvBoostable = ATTRIBUTES.filter(a => _tvMotm.attrs[a.key] < _tvCap);
                            if (_tvBoostable.length > 0) {
                              const _tvPick = _tvBoostable[rand(0, _tvBoostable.length - 1)];
                              setSquad(prev => prev.map(p => p.id === _tvMotm.id ? { ...p, attrs: { ...p.attrs, [_tvPick.key]: p.attrs[_tvPick.key] + 1 } } : p));
                              setInboxMessages(prev => [...prev, {
                                id: `msg_hol_tv_motm_${Date.now()}`, week: week, season: seasonNumber,
                                icon: "📺", title: "Televised Match Boost",
                                body: `That match was televised! ${_tvMotm.name}'s Man of the Match performance earned a permanent +1 ${_tvPick.label}.`,
                                color: LEAGUE_DEFS[leagueTier]?.color || C.green, read: false,
                              }]);
                            }
                          }
                        }
                        // Intergalactic Elite: AI prediction check (holiday)
                        if (_holTvMod.prediction) {
                          const _holPredPool = [0,0,1,1,1,2,2,2,3,3];
                          const _holPred = { home: _holPredPool[rand(0, _holPredPool.length - 1)], away: _holPredPool[rand(0, _holPredPool.length - 1)] };
                          const _holPredCorrect = _holPred.home === playerMatch.homeGoals && _holPred.away === playerMatch.awayGoals;
                          if (_holPredCorrect) {
                            const _oppIdx = pIsHome ? playerMatch.away : playerMatch.home;
                            const _playerIdx = pIsHome ? playerMatch.home : playerMatch.away;
                            const _holLeague = useGameStore.getState().league;
                            if (_holLeague) {
                              const _oppRow = _holLeague.table.find(r => r.teamIndex === _oppIdx);
                              const _plRow = _holLeague.table.find(r => r.teamIndex === _playerIdx);
                              const hg = playerMatch.homeGoals, ag = playerMatch.awayGoals;
                              let _normalPlPts, _normalOppPts;
                              if (hg === ag) {
                                _normalPlPts = _holTvMod.drawPointsPlayer ?? 1;
                                _normalOppPts = _holTvMod.drawPointsAI ?? 1;
                              } else {
                                const _plWon = pIsHome ? hg > ag : ag > hg;
                                _normalPlPts = _plWon ? 3 : 0;
                                _normalOppPts = _plWon ? 0 : 3;
                              }
                              if (_oppRow) _oppRow.points += (3 - _normalOppPts);
                              if (_plRow) _plRow.points -= _normalPlPts;
                            }
                            setInboxMessages(prev => [...prev, {
                              id: `msg_hol_pred_correct_${Date.now()}`, week: week, season: seasonNumber,
                              icon: "🛸", title: "AI Prediction Correct!",
                              body: `The AI predicted ${_holPred.home}-${_holPred.away} and was right! The opposition steals the full 3 points from this fixture.`,
                              color: "#a78bfa", read: false,
                            }]);
                          }
                        }
                        // No need to block — stats processed inline
                      } else {
                        setProcessing(false);
                      }
                    }
                    setMatchPending(false);
                  }
                  } catch (err) {
                    console.error("Holiday match simulation error:", err);
                    setProcessing(false);
                    setMatchPending(false);
                  }
                } else {
                  // No match pending, advance to next week
                  // Use ref to always call the latest version (avoids stale closure from setInterval)
                  try {
                    advanceWeekRef.current();
                  } catch (err) {
                    console.error("Holiday advanceWeek error:", err);
                    setProcessing(false);
                  }
                }
              }
            }, 800); // Ref-based reads ensure fresh state; only need time for React to flush renders
          }}
          inbox={{ inboxMessages, setInboxMessages, onInboxChoice: handleInboxChoice, onMessageRead: () => {
            setReadsThisWeek(prev => {
              const newCount = prev + 1;
              if (newCount >= 5 && !unlockedAchievements.has("paper_round")) {
                setUnlockedAchievements(p => { const n = new Set(p); n.add("paper_round"); return n; });
                setAchievementQueue(p => [...p, "paper_round"]);
              }
              return newCount;
            });
          } }}
          onExitToMenu={async () => {
            await saveGame();
            setTeamName("");
            setNewspaperName(null);
            setReporterName(null);
            setActiveSaveSlot(null);
            setLeague(null);
            setShowCalendar(false);
          }}
          storyArcs={storyArcs}
          setStoryArcs={setStoryArcs}
          squad={squad}
          setSquad={setSquad}
          prodigalSon={prodigalSon}
          leagueTier={leagueTier}
          initialTab={initialBootRoomTab}
          save={{ saveGame, saveStatus, activeSaveSlot, exportSave, importSave: () => fileInputRef.current?.click(), deleteSave, importStatus }}
          debug={{ onDebugJumpTier, onDebugSetSquadOvr, onDebugWinLeague, onDebugSetPrestige }}
          prestigeLevel={prestigeLevel}
          ovrCap={ovrCap}
          gameMode={gameMode}
          activeProfileName={profileList.find(p => p.id === activeProfileId)?.name || null}
          onAchievementCheck={(achId) => {
            if (!unlockedAchievements.has(achId)) {
              setUnlockedAchievements(prev => { const n = new Set(prev); n.add(achId); return n; });
              setAchievementQueue(prev => [...prev, achId]);
            }
          }}
        />
      ) : showCup ? (
        <CupPage
          key={cupKey}
          cup={cup}
          clubHistory={clubHistory}
          seasonNumber={seasonNumber}
          leagueRosters={leagueRosters}
          onPlayerClick={resolveAnyPlayer}
          onTeamClick={handleGlobalTeamClick}
        />
      ) : showTransfers ? (
        <TransfersPage
          key={transfersKey}
          clubRelationships={clubRelationships}
          setClubRelationships={setClubRelationships}
          transferFocus={transferFocus}
          setTransferFocus={setTransferFocus}
          league={league}
          allLeagueStates={allLeagueStates}
          leagueTier={leagueTier}
          teamName={teamName}
          clubHistory={clubHistory}
          squad={squad}
          leagueResults={leagueResults}
          playerSeasonStats={playerSeasonStats}
          playerRatingTracker={playerRatingTracker}
          transferOffers={transferOffers}
          setTransferOffers={setTransferOffers}
          transferHistory={transferHistory}
          setTransferHistory={setTransferHistory}
          onTradeComplete={(clubName) => {
            // Track trades for Deadline Day + Old Boys Network + Window Shopping
            setTradesMadeInWindow(prev => prev + 1);
            if (clubName) setTradedWithClubs(prev => new Set([...prev, clubName]));
            // Deadline Day — trade in final week of transfer window
            if (transferWindowWeeksRemaining <= 1 && transferWindowOpen && !unlockedAchievements.has("deadline_day")) {
              setUnlockedAchievements(prev => { const n = new Set(prev); n.add("deadline_day"); return n; });
              setAchievementQueue(prev => [...prev, "deadline_day"]);
            }
            // Old Boys Network — traded with every club at 75%+ relationship
            if (!unlockedAchievements.has("old_boys_network") && clubRelationships) {
              const highRelClubs = Object.entries(clubRelationships).filter(([, r]) => (r.pct || 0) >= 75).map(([name]) => name);
              if (highRelClubs.length > 0) {
                const updatedTraded = new Set([...tradedWithClubs, clubName]);
                if (highRelClubs.every(name => updatedTraded.has(name))) {
                  setUnlockedAchievements(prev => { const n = new Set(prev); n.add("old_boys_network"); return n; });
                  setAchievementQueue(prev => [...prev, "old_boys_network"]);
                }
              }
            }
          }}
          transferWindowOpen={transferWindowOpen}
          transferWindowWeeksRemaining={transferWindowWeeksRemaining}
          setSquad={setSquad}
          setAllLeagueStates={setAllLeagueStates}
          seasonNumber={seasonNumber}
          week={calendarIndex}
          startingXI={startingXI}
          setStartingXI={setStartingXI}
          onPlayerClick={resolveAnyPlayer}
          onTeamClick={handleGlobalTeamClick}
          shortlist={shortlist}
          setShortlist={setShortlist}
          onToggleShortlist={handleToggleShortlist}
          pendingTradeTarget={pendingTradeTarget}
          onClearPendingTrade={() => setPendingTradeTarget(null)}
          scoutedPlayers={scoutedPlayers}
          ovrCap={ovrCap}
        />
      ) : showLegends ? (
        <ClubLegends key={clubKey} clubHistory={clubHistory} teamName={teamName} playerSeasonStats={playerSeasonStats} playerRatingTracker={playerRatingTracker} league={league} seasonNumber={seasonNumber} leagueTier={leagueTier} squad={squad} ovrHistory={ovrHistory} ovrCap={ovrCap} />
      ) : (
      <>
      {/* Injury warning banner */}
      {injuryWarning > 0 && matchPending && (
        <div style={{
          background: "rgba(239,68,68,0.12)", border: `1px solid ${C.red}`,
          padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12,
          fontFamily: FONT,
        }}>
          <span style={{ fontSize: F.sm, color: "#fca5a5" }}>
            🏥 {injuryWarning} starter{injuryWarning > 1 ? "s" : ""} injured in training! Manage your squad before the match.
            {(() => {
              const injured = startingXI
                .map(id => squad.find(p => p.id === id))
                .filter(p => p && p.injury);
              if (injured.length === 0) return null;
              return (
                <span style={{ display: "block", marginTop: 4, fontSize: F.xs, color: "#fca5a5" }}>
                  {injured.map(p => `${p.name} (${p.injury.name}, ${p.injury.weeksLeft}w)`).join(" · ")}
                </span>
              );
            })()}
          </span>
        </div>
      )}

      {swapTarget && (
        <div style={{
          background: "rgba(74,222,128,0.12)", border: `1px solid ${C.green}`,
          padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12,
          fontFamily: FONT,
        }}>
          <span style={{ fontSize: F.sm, color: C.green }}>
            🔄 Replacing {swapTarget.name} — click a healthy player from another section to swap.
          </span>
          <button onClick={() => setSwapTarget(null)} style={{
            background: "none", border: `1px solid ${C.bgInput}`, color: C.textMuted,
            padding: "7px 14px", cursor: "pointer", fontSize: F.sm,
            fontFamily: FONT,
          }}>CANCEL</button>
        </div>
      )}

      {isMobile && selectedForMove && !swapTarget && (
        <div style={{
          background: "rgba(74,222,128,0.12)", border: `1px solid ${C.green}`,
          padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12,
          fontFamily: FONT,
        }}>
          <span style={{ fontSize: F.sm, color: C.green }}>
            ✋ {squad.find(p => p.id === selectedForMove.id)?.name || "Player"} selected — tap another to swap, or tap a section header.
          </span>
          <button onClick={() => setSelectedForMove(null)} style={{
            background: "none", border: `1px solid ${C.bgInput}`, color: C.textMuted,
            padding: "7px 14px", cursor: "pointer", fontSize: F.sm,
            fontFamily: FONT, whiteSpace: "nowrap",
          }}>CANCEL</button>
        </div>
      )}

      {/* Youth intake pending banner */}
      {summerPhase === "intake" && summerData?.youthCandidates && !showYouthIntake && (
        <div style={{
          background: "rgba(74,222,128,0.08)", border: "1px solid #4ade8066",
          padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12,
          fontFamily: FONT,
        }}>
          <span style={{ fontSize: F.sm, color: C.green, lineHeight: 1.6 }}>
            🎓 Youth intake pending — {summerData.youthCandidates.length} graduates available. Release players if needed, then sign.
          </span>
          <button onClick={() => setShowYouthIntake(true)} style={{
            background: "linear-gradient(180deg, #166534, #14532d)",
            border: `2px solid ${C.green}`, color: C.green,
            padding: "10px 18px", cursor: "pointer", fontSize: F.xs,
            fontFamily: FONT, whiteSpace: "nowrap",
          }}>OPEN INTAKE</button>
        </div>
      )}

      {/* Hidden PLAY MATCH button — keeps full match logic, triggered by header pill via ref */}
      {matchPending && (
          (() => {
            const calEntry = useGameStore.getState().seasonCalendar?.[useGameStore.getState().calendarIndex];
            const isCupMatch = calEntry?.type === "cup" && useGameStore.getState().cup?.pendingPlayerMatch && !useGameStore.getState().cup.playerEliminated;
            const isDynastyMatch = calEntry?.type === "dynasty" && useGameStore.getState().dynastyCupBracket && !useGameStore.getState().dynastyCupBracket.playerEliminated;
            const cupRoundName = isCupMatch ? (useGameStore.getState().cup.rounds[useGameStore.getState().cup.currentRound]?.name || "Cup Match") : "";
            return (
          <button
            ref={playMatchBtnRef}
            style={{ display: "none" }}
            onClick={() => {
              setInjuryWarning(0);
              setMatchPending(false);
              setProcessing(true);
              // Strip legends who've exhausted their 12-appearance season cap
              const exhaustedLegendIds = new Set(
                squad.filter(p => p.isLegend && (p.legendAppearances || 0) >= 12).map(p => p.id)
              );
              const currentXI = startingXI.filter(id => !exhaustedLegendIds.has(id));
              const currentBench = bench.filter(id => !exhaustedLegendIds.has(id));
              if (exhaustedLegendIds.size > 0) {
                setStartingXI(currentXI);
                setBench(currentBench);
                if (slotAssignments) {
                  setSlotAssignments(prev => prev ? prev.map(id => exhaustedLegendIds.has(id) ? null : id) : prev);
                }
              }

              if (isCupMatch) {
                // === CUP MATCH ===
                const pm = useGameStore.getState().cup.pendingPlayerMatch;
                const opponent = pm.home.isPlayer ? pm.away : pm.home;
                // Look up the opponent's persistent squad from stored league data so the
                // same team (same players, same OVR) appears in both league and cup matches.
                const oppTier = opponent.tier || leagueTier;
                const oppLeagueData = oppTier === leagueTier ? league : (allLeagueStates?.[oppTier] || null);
                const storedOpp = oppLeagueData?.teams?.find(t => t.name === opponent.name);
                const oppTeam = storedOpp || generateAITeam(opponent.name, opponent.color || C.textMuted, opponent.strength || 0.5, opponent.trait, oppTier, 0, prestigeLevel);
                const playerTeam = { name: teamName, color: C.green, squad, isPlayer: true, trait: null };
                const isPlayerHome = pm.home.isPlayer;
                const isNeutral = pm.neutral || false;
                const homeT = isPlayerHome ? playerTeam : oppTeam;
                const awayT = isPlayerHome ? oppTeam : playerTeam;
                const cupOOPMult = formation ? getTeamOOPMultiplier(currentXI, formation, squad, slotAssignments) : 1.0;
                const cup12thMan2 = (isPlayerHome && !isNeutral && useGameStore.getState().twelfthManActive) ? 0.15 : 0;
                const cup2FanMod = isPlayerHome && !isNeutral ? (useGameStore.getState().fanSentiment > 75 ? 0.03 : useGameStore.getState().fanSentiment < 25 ? -0.03 : 0) : 0;
                const result = simulateMatch(homeT, awayT, currentXI, currentBench, isNeutral, cupOOPMult, cup12thMan2, talismanIdRef.current, cup2FanMod);
                if (cup12thMan2 > 0) setTwelfthManActive(false);
                let penalties = null;
                if (result.homeGoals === result.awayGoals) {
                  penalties = generatePenaltyShootout(homeT, awayT, result.events, currentXI, currentBench, getModifier(leagueTier));
                }
                const cupLeague = {
                  teams: [homeT, awayT],
                  leagueName: useGameStore.getState().cup.cupName || "Clubman Cup",
                  leagueColor: C.gold,
                };
                setCupMatchResult({
                  ...result,
                  home: 0,
                  away: 1,
                  cupLeague,
                  cupHome: pm.home,
                  cupAway: pm.away,
                  isPlayerHome,
                  isCup: true,
                  penalties,
                  _calendarIndex: useGameStore.getState().calendarIndex,
                });
              } else if (isDynastyMatch) {
                // === DYNASTY CUP MATCH ===
                const bracket = useGameStore.getState().dynastyCupBracket;
                const round = calEntry.round; // "sf" or "final"
                let homeTeam, awayTeam;
                if (round === "sf") {
                  const sf = bracket.playerSF === 1 ? bracket.sf1 : bracket.sf2;
                  homeTeam = sf.home;
                  awayTeam = sf.away;
                } else {
                  homeTeam = bracket.final.home;
                  awayTeam = bracket.final.away;
                }
                const playerTeam = { name: teamName, color: C.green, squad, isPlayer: true, trait: null };
                const isPlayerHome = homeTeam.isPlayer;
                const homeT = isPlayerHome ? playerTeam : homeTeam;
                const awayT = isPlayerHome ? awayTeam : playerTeam;
                const dynOOPMult = formation ? getTeamOOPMultiplier(currentXI, formation, squad, slotAssignments) : 1.0;
                const dynMod = getModifier(leagueTier);
                const result = simulateMatch(homeT, awayT, currentXI, currentBench, true, dynOOPMult, 0, talismanIdRef.current, 0, dynMod);
                let penalties = null;
                if (result.homeGoals === result.awayGoals) {
                  penalties = generatePenaltyShootout(homeT, awayT, result.events, currentXI, currentBench, dynMod);
                }
                const dynastyLeague = {
                  teams: [homeT, awayT],
                  leagueName: "Dynasty Cup",
                  leagueColor: "#facc15",
                };
                setCupMatchResult({
                  ...result,
                  home: 0,
                  away: 1,
                  cupLeague: dynastyLeague,
                  cupHome: homeTeam,
                  cupAway: awayTeam,
                  isPlayerHome,
                  isCup: true,
                  isDynasty: true,
                  dynastyRound: round,
                  penalties,
                  _calendarIndex: useGameStore.getState().calendarIndex,
                });
              } else {
                // === LEAGUE MATCH ===
                const capturedCalIdx = useGameStore.getState().calendarIndex;
                const capturedMWIdx = calEntry?.leagueMD;
                if (!league || capturedMWIdx == null || capturedMWIdx >= league.fixtures.length) {
                  setProcessing(false);
                  return;
                }
                const updatedLeague = { ...league, table: league.table.map(r => ({ ...r })) };
                const normalLeague12thMan = useGameStore.getState().twelfthManActive ? 0.15 : 0;
                const normalLeagueFanMod = useGameStore.getState().fanSentiment > 75 ? 0.03 : useGameStore.getState().fanSentiment < 25 ? -0.03 : 0;
                // Hangover: one random healthy starter gets -1 all attrs for the match
                const leagueMod = getModifier(leagueTier);
                let hangoverPlayer = null;
                let hangoverOrigAttrs = null;
                if (leagueMod.hangover) {
                  const healthyStarters = squad.filter(p => currentXI.includes(p.id) && !p.injury);
                  if (healthyStarters.length > 0) {
                    hangoverPlayer = healthyStarters[rand(0, healthyStarters.length - 1)];
                    hangoverOrigAttrs = { ...hangoverPlayer.attrs };
                    ATTRIBUTES.forEach(({ key }) => { hangoverPlayer.attrs[key] = Math.max(1, hangoverPlayer.attrs[key] - 1); });
                  }
                }
                const results = simulateMatchweek(updatedLeague, capturedMWIdx, squad, currentXI, currentBench, formation, slotAssignments, normalLeague12thMan, talismanIdRef.current, normalLeagueFanMod, leagueMod);
                // Restore hangover player attrs after match simulation
                if (hangoverPlayer && hangoverOrigAttrs) {
                  Object.assign(hangoverPlayer.attrs, hangoverOrigAttrs);
                }
                if (normalLeague12thMan > 0) setTwelfthManActive(false);
                if (results) {
                  // Store condensed results for the league page
                  const condensed = results.map(r => ({
                    home: r.home, away: r.away,
                    homeGoals: r.homeGoals, awayGoals: r.awayGoals,
                    goalScorers: (r.events || []).filter(e => e.type === "goal").map(e => ({ name: e.player, assister: e.assister || null, side: e.side, minute: e.minute })),
                    cardRecipients: (r.events || []).filter(e => e.type === "card" && e.cardPlayer).map(e => ({
                      name: e.cardPlayer,
                      teamIdx: e.cardTeamName === updatedLeague.teams[r.home]?.name ? r.home : r.away,
                    })),
                  }));
                  setLeagueResults(prev => ({ ...prev, [capturedMWIdx]: condensed }));

                  // Inject hangover commentary into player match
                  if (hangoverPlayer) {
                    const pmIdx = results.findIndex(r => updatedLeague.teams[r.home].isPlayer || updatedLeague.teams[r.away].isPlayer);
                    if (pmIdx !== -1 && results[pmIdx].events) {
                      results[pmIdx].events.unshift({ minute: 0, type: "commentary", text: `🤢 ${hangoverPlayer.name} showed up looking rough this morning... −1 to all stats for this match.`, flash: false });
                    }
                  }
                  const playerMatch = results.find(r =>
                    updatedLeague.teams[r.home].isPlayer || updatedLeague.teams[r.away].isPlayer
                  );
                  // Defer league table update until match result screen is dismissed
                  // so the Dashboard mini-table doesn't spoil the result
                  if (playerMatch && !useGameStore.getState().isOnHoliday) {
                    pendingLeagueRef.current = updatedLeague;
                  } else {
                    setLeague(updatedLeague);
                  }
                  // matchweekIndex derived from calendarIndex — no explicit increment needed
                  // TRANSFER WINDOW: Decrement and close after Matchday 3
                  const newMDCount = capturedMWIdx + 1;
                  if (transferWindowOpen) {
                    setTransferWindowWeeksRemaining(wks => {
                      const newWks = Math.max(0, wks - 1);
                      if (newWks === 0 || newMDCount > 3) {
                        setTransferWindowOpen(false);
                        setTransferOffers([]);
                        // Achievement: Window Shopping — window closes without any trades
                        if (!unlockedAchievements.has("window_shopping") && tradesMadeInWindow === 0) {
                          setUnlockedAchievements(prev => { const n = new Set(prev); n.add("window_shopping"); return n; });
                          setAchievementQueue(prev => [...prev, "window_shopping"]);
                        }
                        setTradesMadeInWindow(0); // Reset for next window
                      }
                      return newWks;
                    });
                    setTransferOffers(prev => prev
                      .map(o => ({ ...o, expiresWeeks: (o.expiresWeeks || 1) - 1 }))
                      .filter(o => o.expiresWeeks > 0)
                    );
                  }
                  // Advance every AI league by one matchweek in parallel
                  setAllLeagueStates(prev => {
                    if (!prev || Object.keys(prev).length === 0) return prev;
                    const next = {};
                    for (const [t, aiLeague] of Object.entries(prev)) {
                      if (aiLeague.matchweekIndex >= aiLeague.fixtures.length) {
                        next[t] = aiLeague; // season finished for this tier
                      } else {
                        const copy = { ...aiLeague, table: aiLeague.table.map(r => ({ ...r })) };
                        simulateMatchweek(copy, aiLeague.matchweekIndex, null, null, null, null, null);
                        next[t] = { ...copy, matchweekIndex: aiLeague.matchweekIndex + 1 };
                      }
                    }
                    return next;
                  });
                  if (playerMatch) {
                    playerMatch._playedMatchweekIndex = capturedMWIdx;
                    playerMatch._calendarIndex = capturedCalIdx;
                    if (hangoverPlayer) playerMatch._hangoverPlayerName = hangoverPlayer.name;
                    setMatchResult(playerMatch);
                  } else {
                    // No player match found — advance calendar to prevent desync
                    setCalendarIndex(capturedCalIdx + 1);
                    setProcessing(false);
                  }
                } else {
                  setProcessing(false);
                }
              }
            }}
          >
            {isCupMatch ? `🏆 PLAY CUP MATCH` : `⚽ PLAY MATCH`}
          </button>
            );
          })()
      )}

      {showSquad ? (
      <>
      {/* 5v5 Mini-Tournament squad banner */}
      {miniTournamentBracket && !miniTournamentBracket.playerEliminated && (() => {
        const FIVE_SLOTS = [
          { label: "GK", positions: ["GK"] },
          { label: "DEF", positions: ["CB", "LB", "RB"] },
          { label: "MID", positions: ["CM", "AM"] },
          { label: "MID", positions: ["CM", "AM"] },
          { label: "ATK", positions: ["LW", "RW", "ST"] },
        ];
        const ids = fiveASideSquad || [];
        const picksRaw = [null,null,null,null,null];
        for (let pi = 0; pi < 5; pi++) picksRaw[pi] = ids[pi] ? squad.find(p => p.id === ids[pi]) || null : null;
        const picks = picksRaw;
        const autoPickFive = () => {
          const available = squad.filter(p => !p.injury);
          const used = new Set();
          const picked = [];
          for (const slot of FIVE_SLOTS) {
            const best = available
              .filter(p => slot.positions.includes(p.position) && !used.has(p.id))
              .sort((a, b) => getOverall(b) - getOverall(a))[0];
            if (best) { picked.push(best.id); used.add(best.id); }
          }
          setFiveASideSquad(picked);
        };
        return (
          <div style={{
            marginBottom: 16, padding: isMobile ? "14px 10px" : "16px 20px",
            background: "rgba(251,191,36,0.06)", border: `1px solid rgba(251,191,36,0.25)`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: F.sm, color: C.gold, letterSpacing: 2, fontFamily: FONT }}>
                5v5 MINI-TOURNAMENT SQUAD
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setFiveASideSquad(null)} style={{
                  padding: "5px 12px", fontSize: F.xs, fontFamily: FONT,
                  background: "transparent", border: `1px solid ${C.bgInput}`,
                  color: C.textDim, cursor: "pointer",
                }}>CLEAR</button>
                <button onClick={autoPickFive} style={{
                  padding: "5px 12px", fontSize: F.xs, fontFamily: FONT,
                  background: "transparent", border: `1px solid rgba(251,191,36,0.4)`,
                  color: C.gold, cursor: "pointer",
                }}>AUTO-PICK</button>
              </div>
            </div>
            <div>
              {FIVE_SLOTS.map((slot, i) => {
                const p = picks[i];
                const posColor = POS_COLORS[slot.positions[0]] || C.slate;
                const handleFiveDrop = (e) => {
                  e.preventDefault(); e.stopPropagation();
                  const newIds = [null,null,null,null,null];
                  for (let j = 0; j < 5; j++) newIds[j] = ids[j] || null;
                  // Check if this is a 5v5 internal swap
                  const fiveIdx = e.dataTransfer.getData("fiveSlotIdx");
                  if (fiveIdx !== "") {
                    const fromIdx = parseInt(fiveIdx);
                    if (!isNaN(fromIdx) && fromIdx !== i) {
                      const tmp = newIds[i];
                      newIds[i] = newIds[fromIdx];
                      newIds[fromIdx] = tmp;
                      setFiveASideSquad(newIds);
                    }
                    setDragPlayer(null);
                    return;
                  }
                  // External drag from main squad
                  if (!dragPlayer) return;
                  const dp = squad.find(pl => pl.id === dragPlayer.id);
                  if (!dp || dp.injury) return;
                  for (let j = 0; j < 5; j++) { if (newIds[j] === dp.id) newIds[j] = null; }
                  newIds[i] = dp.id;
                  setFiveASideSquad(newIds);
                  setDragPlayer(null);
                };
                return (
                  <div key={i}
                    draggable={!isMobile && !!p}
                    onDragStart={!isMobile && p ? (e) => {
                      e.dataTransfer.setData("fiveSlotIdx", String(i));
                      setDragPlayer({ id: p.id, fromSection: "five" });
                    } : undefined}
                    onDragEnd={!isMobile ? () => setDragPlayer(null) : undefined}
                    onDragOver={!isMobile ? (e => { e.preventDefault(); e.stopPropagation(); }) : undefined}
                    onDrop={!isMobile ? handleFiveDrop : undefined}
                    onClick={() => {
                      if (p) {
                        const newIds = [null,null,null,null,null];
                        for (let j = 0; j < 5; j++) newIds[j] = ids[j] || null;
                        newIds[i] = null;
                        setFiveASideSquad(newIds);
                      }
                    }}
                    style={{
                    display: "flex", alignItems: "center", gap: isMobile ? 8 : 10,
                    padding: isMobile ? "8px 10px" : "7px 12px",
                    borderBottom: `1px solid ${C.bgCard}`,
                    background: i % 2 === 0 ? "transparent" : "rgba(30,41,59,0.15)",
                    cursor: p ? "grab" : "default",
                    userSelect: "none",
                  }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: isMobile ? 55 : 62, minWidth: isMobile ? 55 : 62, height: isMobile ? 30 : 32,
                      flexShrink: 0,
                      borderRadius: 3, fontFamily: FONT,
                      fontSize: F.sm, fontWeight: "bold", textAlign: "center",
                      background: p ? posColor : "transparent",
                      color: p ? C.bg : C.bgInput,
                      border: p ? `2px solid ${posColor}` : `2px dashed ${C.bgInput}`,
                    }}>
                      {slot.label}
                    </span>
                    {p ? (
                      <span style={{
                        fontSize: isMobile ? F.sm : F.md, color: C.text, fontFamily: FONT,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        display: "flex", alignItems: "center", gap: 5, flex: 1, minWidth: 0,
                      }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                        <span style={{ fontSize: F.xs, color: getPosColor(p.position), opacity: 0.6, fontFamily: FONT, flexShrink: 0 }}>{p.position}</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: F.xs, color: C.bgInput, fontFamily: FONT }}>Empty</span>
                    )}
                    {p && (
                      <span style={{ fontSize: F.md, color: getAttrColor(getOverall(p), ovrCap), fontWeight: "bold", fontFamily: FONT, flexShrink: 0, marginLeft: "auto" }}>
                        {getOverall(p)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {picks.filter(Boolean).length < 5 && (
              <div style={{ fontSize: F.xs, color: C.amber, marginTop: 8, fontFamily: FONT }}>
                Pick your 5 before the next match. Use AUTO-PICK or select via the match screen.
              </div>
            )}
          </div>
        );
      })()}
      {/* Squad table */}
      {(() => {
        const posSorter = (a, b) => (POSITION_ORDER[a.position] || 0) - (POSITION_ORDER[b.position] || 0);

        // Reverse map: playerId → slot index
        // When slotAssignments exists, use it. Otherwise derive from startingXI/bench.
        const playerChipMap = {};
        const allSquadIds = new Set(squad.map(p => p.id));
        if (slotAssignments) {
          slotAssignments.forEach((pid, i) => { if (pid != null && allSquadIds.has(pid)) playerChipMap[pid] = i; });
        } else {
          // Auto-derive: use getEffectiveSlots for formation positions, bench for subs
          const effectiveSlots = getEffectiveSlots(startingXI, formation, squad, null);
          effectiveSlots.forEach((pid, i) => { if (pid != null && allSquadIds.has(pid)) playerChipMap[pid] = i; });
          bench.forEach((pid, i) => { if (pid != null && allSquadIds.has(pid) && i < 5) playerChipMap[pid] = 11 + i; });
        }

        // Derive section from chip assignments
        const getPlayerSection = (id) => {
          const slot = playerChipMap[id];
          if (slot !== undefined && slot < 11) return "starting";
          if (slot !== undefined && slot >= 11) return "bench";
          return "reserves";
        };

        // Assign a chip (formation slot or sub slot) to a player
        const handleChipAssign = (slotIdx, playerId) => {
          const player = squad.find(p => p.id === playerId);
          if (!player) return;
          // Prevent assigning legends who have exhausted their 12 appearances
          if (player.isLegend && (player.legendAppearances || 0) >= 12) return;

          // If no manual assignments yet, initialize from current auto-derived state
          let newSlots;
          if (slotAssignments) {
            newSlots = [...slotAssignments];
          } else {
            // Bootstrap from auto-derived state
            newSlots = new Array(TOTAL_SLOTS).fill(null);
            const effectiveSlots = getEffectiveSlots(startingXI, formation, squad, null);
            effectiveSlots.forEach((pid, i) => { if (pid != null) newSlots[i] = pid; });
            bench.forEach((pid, i) => { if (pid != null && i < 5) newSlots[11 + i] = pid; });
          }
          while (newSlots.length < TOTAL_SLOTS) newSlots.push(null);

          // If this player already has a different chip, free it
          const existingIdx = newSlots.indexOf(playerId);
          if (existingIdx >= 0) newSlots[existingIdx] = null;

          // Assign
          newSlots[slotIdx] = playerId;
          setSlotAssignments(newSlots);

          // Sync startingXI and bench from assignments
          const newXI = [];
          const newBench = [];
          newSlots.forEach((pid, i) => {
            if (pid == null) return;
            if (i < 11) newXI.push(pid);
            else newBench.push(pid);
          });
          setStartingXI(newXI);
          setBench(newBench);

          setSelectedSlot(null);
        };

        // Remove a chip from a player (return to tray)
        const handleChipRemove = (playerId) => {
          // If no manual assignments yet, initialize from auto-derived state
          let newSlots;
          if (slotAssignments) {
            newSlots = [...slotAssignments];
          } else {
            newSlots = new Array(TOTAL_SLOTS).fill(null);
            const effectiveSlots = getEffectiveSlots(startingXI, formation, squad, null);
            effectiveSlots.forEach((pid, i) => { if (pid != null) newSlots[i] = pid; });
            bench.forEach((pid, i) => { if (pid != null && i < 5) newSlots[11 + i] = pid; });
          }
          while (newSlots.length < TOTAL_SLOTS) newSlots.push(null);
          const idx = newSlots.indexOf(playerId);
          if (idx >= 0) {
            newSlots[idx] = null;
            setSlotAssignments(newSlots);

            // Sync startingXI and bench
            const newXI = [];
            const newBench = [];
            newSlots.forEach((pid, i) => {
              if (pid == null) return;
              if (i < 11) newXI.push(pid);
              else newBench.push(pid);
            });
            setStartingXI(newXI);
            setBench(newBench);
          }
        };

        const handleDrop = (targetSection, targetPlayerId) => {
          if (!dragPlayer) return;
          const dragId = dragPlayer.id;
          const draggedPlayer = squad.find(p => p.id === dragId);
          if (!draggedPlayer) { setDragPlayer(null); return; }

          // If dropping onto another player — swap their chip assignments
          if (targetPlayerId != null && targetPlayerId !== dragId) {
            const dragChipIdx = playerChipMap[dragId];
            const targetChipIdx = playerChipMap[targetPlayerId];

            // Both have chips → swap them
            if (dragChipIdx !== undefined && targetChipIdx !== undefined) {
              let newSlots = slotAssignments ? [...slotAssignments] : new Array(TOTAL_SLOTS).fill(null);
              while (newSlots.length < TOTAL_SLOTS) newSlots.push(null);
              if (!slotAssignments) {
                const effectiveSlots = getEffectiveSlots(startingXI, formation, squad, null);
                effectiveSlots.forEach((pid, i) => { if (pid != null) newSlots[i] = pid; });
                bench.forEach((pid, i) => { if (pid != null && i < 5) newSlots[11 + i] = pid; });
              }
              newSlots[dragChipIdx] = targetPlayerId;
              newSlots[targetChipIdx] = dragId;
              setSlotAssignments(newSlots);
              // Sync XI/bench
              const newXI = [];
              const newBench = [];
              newSlots.forEach((pid, i) => { if (pid != null) { if (i < 11) newXI.push(pid); else newBench.push(pid); } });
              setStartingXI(newXI);
              setBench(newBench);
            }
            // Dragged has chip, target doesn't → give target the chip
            else if (dragChipIdx !== undefined && targetChipIdx === undefined) {
              handleChipAssign(dragChipIdx, targetPlayerId);
            }
            // Target has chip, dragged doesn't → give dragged the chip
            else if (dragChipIdx === undefined && targetChipIdx !== undefined) {
              handleChipAssign(targetChipIdx, dragId);
            }
          }

          setDragPlayer(null);
        };

        const statsGridCols = "62px 1fr 50px 46px 50px 50px 50px 50px 50px 50px 50px";
        const attrsGridCols = "62px 1fr 50px 46px repeat(7, 50px) 138px";
        const mobileGridCols = "55px 1fr 42px 76px";
        const gridCols = isMobile ? mobileGridCols : (squadView === "stats" ? statsGridCols : attrsGridCols);

        const renderHeader = () => isMobile ? null : (
          <div style={{
            display: "grid", gridTemplateColumns: gridCols,
            padding: "14px 18px", background: "#1a1a2e",
            borderBottom: `2px solid ${C.bgInput}`, fontSize: F.sm, color: C.textDim, gap: 8,
          }}>
            <span style={{ fontSize: F.sm }}>ROLE</span><span>NAME</span>
            <span style={{ textAlign: "center" }}>AGE</span>
            <span style={{ textAlign: "center" }}>OVR</span>
            {squadView === "stats" ? (
              <>
                <span style={{ textAlign: "center", color: C.green }}>G</span>
                <span style={{ textAlign: "center", color: "#38bdf8" }}>A</span>
                <span style={{ textAlign: "center", color: C.gold }}>YC</span>
                <span style={{ textAlign: "center", color: C.red }}>RC</span>
                <span style={{ textAlign: "center", color: C.blue }}>APP</span>
                <span style={{ textAlign: "center", color: "#f59e0b" }}>MOTM</span>
                <span style={{ textAlign: "center", color: C.purple }}>AVG</span>
              </>
            ) : (
              <>
                {ATTRIBUTES.map(a => (
                  <span key={a.key} style={{ textAlign: "center", color: a.color }}>{a.label}</span>
                ))}
                <span style={{ textAlign: "center" }}>TRAINING</span>
              </>
            )}
          </div>
        );

        // Mobile tap-to-move handler
        const handleMobileTap = (player, section) => {
          // If in injury swap mode, handle that first
          if (swapTarget) {
            if (player.id === swapTarget.id) { setSwapTarget(null); return; }
            if (player.injury) return;
            const targetSec = getPlayerSection(swapTarget.id);
            const fromSec = section;
            if (fromSec === targetSec) { setSwapTarget(null); return; }
            let newXI = startingXI.filter(id => id !== player.id && id !== swapTarget.id);
            let newBench = bench.filter(id => id !== player.id && id !== swapTarget.id);
            if (targetSec === "starting") newXI.push(player.id);
            else if (targetSec === "bench") newBench.push(player.id);
            setStartingXI(newXI);
            setBench(newBench);
            setSwapTarget(null);
            return;
          }
          // If injured starter/bench, enter swap mode
          if (player.injury && (section === "starting" || section === "bench")) {
            setSwapTarget(player);
            setSelectedForMove(null);
            return;
          }
          // If no one selected, select this player
          if (!selectedForMove) {
            setSelectedForMove({ id: player.id, fromSection: section });
            return;
          }
          // If tapping the already-selected player, deselect and open panel
          if (selectedForMove.id === player.id) {
            setSelectedForMove(null);
            setSelectedPlayer(player);
            return;
          }
          // Swap the two players' chip assignments
          const fromId = selectedForMove.id;
          const fromChip = playerChipMap[fromId];
          const toChip = playerChipMap[player.id];

          if (fromChip !== undefined || toChip !== undefined) {
            let newSlots = slotAssignments ? [...slotAssignments] : new Array(TOTAL_SLOTS).fill(null);
            while (newSlots.length < TOTAL_SLOTS) newSlots.push(null);
            // If no manual assignments, bootstrap
            if (!slotAssignments) {
              const effectiveSlots = getEffectiveSlots(startingXI, formation, squad, null);
              effectiveSlots.forEach((pid, i) => { if (pid != null) newSlots[i] = pid; });
              bench.forEach((pid, i) => { if (pid != null && i < 5) newSlots[11 + i] = pid; });
            }
            if (fromChip !== undefined && toChip !== undefined) {
              // Both have chips — swap
              newSlots[fromChip] = player.id;
              newSlots[toChip] = fromId;
            } else if (fromChip !== undefined) {
              // Only from has chip — give it to target
              newSlots[fromChip] = player.id;
            } else {
              // Only target has chip — give it to from
              newSlots[toChip] = fromId;
            }
            setSlotAssignments(newSlots);
            const newXI = [];
            const newBench = [];
            newSlots.forEach((pid, i) => { if (pid != null) { if (i < 11) newXI.push(pid); else newBench.push(pid); } });
            setStartingXI(newXI);
            setBench(newBench);
          }
          setSelectedForMove(null);
        };

        // Mobile: tap section header to move selected player there
        const handleMobileSectionTap = (targetSection) => {
          if (!selectedForMove) return;
          const fromId = selectedForMove.id;
          const fromSec = selectedForMove.fromSection;
          if (fromSec === targetSection) { setSelectedForMove(null); return; }
          const draggedPlayer = squad.find(p => p.id === fromId);
          if (!draggedPlayer) { setSelectedForMove(null); return; }
          if (draggedPlayer.injury && targetSection !== "reserves") { setSelectedForMove(null); return; }
          let newXI = startingXI.filter(id => id !== fromId);
          let newBench = bench.filter(id => id !== fromId);
          if (targetSection === "starting") {
            if (newXI.length < 11) newXI.push(fromId);
            else {
              const injuredStarter = newXI.find(id => { const p = squad.find(pp => pp.id === id); return p?.injury; });
              if (injuredStarter) {
                newXI = newXI.filter(id => id !== injuredStarter);
                newXI.push(fromId);
              } else { setSelectedForMove(null); return; }
            }
          }
          else if (targetSection === "bench" && newBench.length < 5) newBench.push(fromId);
          setStartingXI(newXI);
          setBench(newBench);
          setSelectedForMove(null);
        };

        const renderPlayerRow = (player, idx, section) => {
          const overall = getOverall(player);
          const trainingFocus = TRAINING_FOCUSES.find(t => t.key === player.training);
          const isInjured = !!player.injury;
          const isDragging = dragPlayer?.id === player.id;
          const isMobileSelected = selectedForMove?.id === player.id;
          const pStats = playerSeasonStats[player.name] || { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0 };
          const ratings = playerRatingTracker[player.name] || [];
          const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : "—";

          const rowBg = isMobileSelected ? "rgba(74,222,128,0.15)" : isDragging ? "rgba(74,222,128,0.1)" : isInjured ? "rgba(239,68,68,0.08)" : idx % 2 === 0 ? "transparent" : "rgba(30, 41, 59, 0.15)";
          const rowBorderLeft = isMobileSelected ? `3px solid ${C.green}` : isDragging ? `3px solid ${C.green}` : isInjured ? `3px solid ${C.red}` : "3px solid transparent";

          return (
            <div
              key={player.id}
              draggable={!isMobile}
              onDragStart={!isMobile ? () => setDragPlayer({ id: player.id, fromSection: section }) : undefined}
              onDragEnd={!isMobile ? () => setDragPlayer(null) : undefined}
              onDragOver={!isMobile ? (e => e.preventDefault()) : undefined}
              onDrop={!isMobile ? (e => {
                e.preventDefault(); e.stopPropagation();
                // Check if this is a chip drop first
                const chipIdx = e.dataTransfer.getData("chipIdx");
                if (chipIdx !== "") {
                  const ci = parseInt(chipIdx);
                  if (!isNaN(ci)) handleChipAssign(ci, player.id);
                  return;
                }
                handleDrop(section, player.id);
              }) : undefined}
              onClick={() => {
                // If a chip is selected, assign it to this player
                if (selectedSlot !== null) {
                  handleChipAssign(selectedSlot, player.id);
                  return;
                }
                if (isMobile) {
                  handleMobileTap(player, section);
                  return;
                }
                // Desktop: open player panel
                setSelectedPlayer(player);
              }}
              style={{
                display: "grid", gridTemplateColumns: gridCols,
                padding: isMobile ? "12px 10px" : "10px 12px",
                borderBottom: `1px solid ${C.bgCard}`,
                transition: "background 0.15s ease, opacity 0.15s ease",
                background: rowBg,
                gap: isMobile ? 6 : 8, alignItems: "center",
                opacity: isDragging ? 0.5 : isInjured ? 0.5 : 1,
                borderLeft: rowBorderLeft,
                cursor: isMobile ? "pointer" : "grab",
                minHeight: isMobile ? 44 : "auto",
                userSelect: "none",
              }}
              onMouseEnter={!isMobile ? (e => { if (!isDragging) e.currentTarget.style.background = "rgba(74, 222, 128, 0.05)"; }) : undefined}
              onMouseLeave={!isMobile ? (e => { e.currentTarget.style.background = isDragging ? "rgba(74,222,128,0.1)" : isInjured ? "rgba(239,68,68,0.08)" : idx % 2 === 0 ? "transparent" : "rgba(30, 41, 59, 0.15)"; }) : undefined}
            >
              {/* Chip slot — assigned position or empty drop zone */}
              {(() => {
                const chipIdx = playerChipMap[player.id];
                const hasChip = chipIdx !== undefined;
                const isSub = hasChip && chipIdx >= 11;
                const chipLabel = hasChip ? (isSub ? `SUB${chipIdx - 10}` : (formation[chipIdx]?.pos || "?")) : null;
                const chipColor = hasChip ? (isSub ? SUB_COLOR : (POS_COLORS[formation[chipIdx]?.pos] || C.slate)) : null;
                const assignedPos = formation[chipIdx]?.pos;
                const isOOP = hasChip && !isSub && assignedPos !== player.position && !(player.learnedPositions?.includes(assignedPos));

                return (
                  <span
                    draggable={!isMobile}
                    onDragStart={!isMobile ? (e) => {
                      e.stopPropagation();
                      setDragPlayer({ id: player.id, fromSection: section });
                    } : undefined}
                    onDragOver={!isMobile ? (e => { e.preventDefault(); e.stopPropagation(); }) : undefined}
                    onDrop={!isMobile ? (e => {
                      e.preventDefault(); e.stopPropagation();
                      // Check if this is a chip drop first
                      const chipIdx = e.dataTransfer.getData("chipIdx");
                      if (chipIdx !== "") {
                        const ci = parseInt(chipIdx);
                        if (!isNaN(ci)) {
                          handleChipAssign(ci, player.id);
                          return;
                        }
                      }
                      // Otherwise, handle player swap
                      handleDrop(section, player.id);
                    }) : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedSlot !== null) {
                        handleChipAssign(selectedSlot, player.id);
                        return;
                      }
                      if (hasChip) {
                        handleChipRemove(player.id);
                        return;
                      }
                    }}
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      minWidth: isMobile ? 46 : 50, height: isMobile ? 30 : 32,
                      borderRadius: 3,
                      fontFamily: FONT,
                      fontSize: isSub ? F.xs : F.sm, fontWeight: "bold",
                      textAlign: "center", cursor: "pointer",
                      transition: "all 0.15s ease",
                      position: "relative",
                      ...(hasChip ? {
                        background: chipColor,
                        color: C.bg,
                        border: `2px solid ${chipColor}`,
                      } : {
                        background: selectedSlot !== null ? "rgba(250,204,21,0.08)" : "transparent",
                        color: C.bgInput,
                        border: selectedSlot !== null ? `2px dashed ${C.gold}` : `2px dashed ${C.bgInput}`,
                      }),
                    }}
                  >
                    {hasChip ? chipLabel : "—"}
                    {isOOP && (
                      <span style={{
                        position: "absolute", top: -6, right: -10, fontSize: F.micro,
                        background: getPosColor(player.position), color: C.bg, padding: "0px 2px",
                        borderRadius: 1, fontWeight: "bold", lineHeight: 1.3,
                      }}>{player.position}</span>
                    )}
                  </span>
                );
              })()}
              <span style={{ fontSize: isMobile ? F.sm : F.md, color: isInjured ? C.lightRed : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</span>
                <span style={{
                  fontSize: F.xs, color: getPosColor(player.position), opacity: 0.6,
                  fontFamily: FONT, flexShrink: 0,
                }}>{player.position}</span>
                {isInjured ? <span style={{ fontSize: F.xs, color: C.red, flexShrink: 0, background: "rgba(239,68,68,0.15)", padding: "2px 6px", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 2 }}>INJ {player.injury.weeksLeft}w</span> : ""}{retiringPlayers.has(player.id) ? <span style={{ fontSize: F.xs, color: "#ef444488", flexShrink: 0 }}>RET</span> : ""}{player.isLegend ? <span style={{ fontSize: F.xs, color: C.amber, flexShrink: 0, background: "rgba(251,191,36,0.15)", padding: "2px 6px", border: "1px solid rgba(251,191,36,0.3)" }}>LGN {12 - (player.legendAppearances || 0)}</span> : ""}{player.isTrial ? <span style={{ fontSize: F.xs, color: C.green, flexShrink: 0, background: "rgba(74,222,128,0.15)", padding: "2px 6px", border: "1px solid #4ade8044" }}>TRIAL {player.trialWeeksLeft}w</span> : ""}
              </span>
              {isMobile ? (
                <>
                  <span style={{ fontSize: F.md, textAlign: "center", color: getAttrColor(overall, player.legendCap || ovrCap), fontWeight: "bold", position: "relative" }}>
                    {overall}
                    {(() => {
                      const seasonDelta = player.seasonStartOvr != null ? overall - player.seasonStartOvr : 0;
                      const hasFlash = recentOvrLevelUps && recentOvrLevelUps.some(l => l.name === player.name && l.position === player.position);
                      if (hasFlash) return <span style={{ position: "absolute", top: -6, right: -2, fontSize: F.sm, color: C.blue, animation: "pulse 1s ease infinite" }}>+1</span>;
                      if (seasonDelta > 0) return <span style={{ position: "absolute", top: -6, right: -2, fontSize: F.xs, color: C.green }}>+{seasonDelta}</span>;
                      return null;
                    })()}
                  </span>
                  <span style={{
                    fontSize: F.sm, textAlign: "right",
                    color: player.injury ? C.red : player.positionTraining ? C.blue : trainingFocus ? C.green : C.slate,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {summerPhase === "break" ? "☀️ HOLIDAY" : player.injury ? `🏥 ${player.injury.weeksLeft}w` : player.positionTraining ? `🎓 ${player.positionTraining.targetPos} ${player.positionTraining.weeksLeft}w` : trainingFocus ? `${trainingFocus.icon} ${trainingFocus.shortLabel || trainingFocus.label}` : `Age ${player.age}`}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: F.md, textAlign: "center", color: C.textMuted }}>{player.age}</span>
                  <span style={{ fontSize: F.md, textAlign: "center", color: getAttrColor(overall, player.legendCap || ovrCap), fontWeight: "bold", position: "relative" }}>
                    {overall}
                    {(() => {
                      const seasonDelta = player.seasonStartOvr != null ? overall - player.seasonStartOvr : 0;
                      const hasFlash = recentOvrLevelUps && recentOvrLevelUps.some(l => l.name === player.name && l.position === player.position);
                      if (hasFlash) return <span style={{ position: "absolute", top: -6, right: -2, fontSize: F.sm, color: C.blue, animation: "pulse 1s ease infinite" }}>+1</span>;
                      if (seasonDelta > 0) return <span style={{ position: "absolute", top: -6, right: -2, fontSize: F.xs, color: C.green }}>+{seasonDelta}</span>;
                      return null;
                    })()}
                  </span>
                  {squadView === "stats" ? (
                    <>
                      <span style={{ fontSize: F.md, textAlign: "center", color: pStats.goals > 0 ? C.green : C.bgInput }}>{pStats.goals || "—"}</span>
                      <span style={{ fontSize: F.md, textAlign: "center", color: pStats.assists > 0 ? "#38bdf8" : C.bgInput }}>{pStats.assists || "—"}</span>
                      <span style={{ fontSize: F.md, textAlign: "center", color: pStats.yellows > 0 ? C.gold : C.bgInput }}>{pStats.yellows || "—"}</span>
                      <span style={{ fontSize: F.md, textAlign: "center", color: pStats.reds > 0 ? C.red : C.bgInput }}>{pStats.reds || "—"}</span>
                      <span style={{ fontSize: F.md, textAlign: "center", color: pStats.apps > 0 ? C.blue : C.bgInput }}>{pStats.apps || "—"}</span>
                      <span style={{ fontSize: F.md, textAlign: "center", color: pStats.motm > 0 ? "#f59e0b" : C.bgInput }}>{pStats.motm || "—"}</span>
                      <span style={{ fontSize: F.md, textAlign: "center", color: avgRating !== "—" ? (parseFloat(avgRating) >= 8 ? C.green : parseFloat(avgRating) >= 7 ? C.gold : parseFloat(avgRating) >= 6 ? C.textMuted : C.red) : C.bgInput }}>{avgRating}</span>
                    </>
                  ) : (
                    <>
                      {ATTRIBUTES.map(attr => {
                        const val = player.attrs[attr.key];
                        const gained = player.gains[attr.key];
                        return (
                          <span key={attr.key} style={{ fontSize: F.md, textAlign: "center", color: getAttrColor(val, player.legendCap || ovrCap), position: "relative" }}>
                            {val}
                            {gained && <span style={{ position: "absolute", top: -6, right: 0, fontSize: F.sm, color: gained >= 2 ? C.gold : C.green, animation: "pulse 1s ease infinite" }}>+{gained}</span>}
                          </span>
                        );
                      })}
                      <span style={{
                        fontSize: F.sm, textAlign: "center",
                        color: player.injury ? C.red : player.positionTraining ? C.blue : trainingFocus ? C.green : C.bgInput,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {summerPhase === "break" ? "☀️ HOLIDAY" : player.injury ? `🏥 ${player.injury.weeksLeft}w` : player.positionTraining ? `🎓 ${player.positionTraining.targetPos} (${player.positionTraining.weeksLeft}w)` : trainingFocus ? `${trainingFocus.icon} ${trainingFocus.label}` : "—"}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          );
        };



        return (
          <div style={{ background: C.bg, border: `1px solid ${C.bgCard}` }}>
            {/* Sticky chip tray + toolbar */}
            <div style={{
              position: "sticky", top: 0, zIndex: Z.header,
              background: "#0a0a1a", borderBottom: `2px solid ${C.bgCard}`,
              pointerEvents: "none",
            }}>
              {/* Toolbar row */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 8px", borderBottom: `1px solid ${C.bgCard}`,
                pointerEvents: "auto",
              }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSlot(null);
                    setShowTactics(true);
                  }} style={{
                    padding: "7px 12px", fontSize: F.xs, cursor: "pointer",
                    background: "rgba(74,222,128,0.08)",
                    border: "1px solid #4ade8066",
                    color: C.green,
                    fontFamily: FONT,
                  }}>⚽ {detectFormationName(formation)}</button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setSquadView(v => v === "attrs" ? "stats" : "attrs");
                  }} style={{
                    padding: "7px 12px", fontSize: F.xs, cursor: "pointer",
                    background: squadView === "stats" ? "rgba(96,165,250,0.1)" : "transparent",
                    border: squadView === "stats" ? `1px solid ${C.blue}` : `1px solid ${C.bgInput}`,
                    color: squadView === "stats" ? C.blue : C.textMuted,
                    fontFamily: FONT,
                  }}>{squadView === "attrs" ? "📊 STATS" : "📋 ATTRS"}</button>
                  <div ref={assignAllRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      setShowAssignAll(prev => !prev);
                    }} style={{
                      padding: "7px 12px", fontSize: F.xs, cursor: "pointer",
                      background: showAssignAll ? "rgba(250,204,21,0.1)" : "transparent",
                      border: showAssignAll ? `1px solid ${C.gold}` : `1px solid ${C.bgInput}`,
                      color: showAssignAll ? C.gold : C.textMuted,
                      fontFamily: FONT,
                    }}>TRAIN ALL ▾</button>
                    {showAssignAll && (
                      <div style={{
                        position: "absolute", right: 0, top: "100%", marginTop: 4,
                        background: C.bg, border: `1px solid ${C.bgInput}`,
                        zIndex: Z.bar, minWidth: 180,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                      }}>
                        {TRAINING_FOCUSES.map(t => (
                          <button key={t.key} onClick={(e) => {
                            e.stopPropagation();
                            setSquad(prev => prev.map(p => ({ ...p, training: t.key })));
                            setTrainedThisWeek(new Set(squad.map(p => p.id)));
                            setShowAssignAll(false);
                          }} style={{
                            display: "block", width: "100%", padding: "12px 16px",
                            background: "transparent", border: "none", borderBottom: `1px solid ${C.bgCard}`,
                            color: C.text, fontSize: F.sm, textAlign: "left",
                            cursor: "pointer", fontFamily: FONT,
                          }}
                            onMouseEnter={e => e.target.style.background = "rgba(250,204,21,0.08)"}
                            onMouseLeave={e => e.target.style.background = "transparent"}
                          >
                            <span style={{ marginRight: 8 }}>{t.icon}</span>{t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    // Assistant's XI: optimal lineup considering formation, OVR, injuries, bench coverage
                    // Exclude legends — user manually assigns them when desired
                    const available = squad.filter(p => !p.injury && !p.isLegend);
                    const newSlots = new Array(TOTAL_SLOTS).fill(null);
                    const used = new Set();

                    // 1. Fill formation slots — best OVR player per position (includes learned positions)
                    const canPlay = (p, pos) => p.position === pos || p.learnedPositions?.includes(pos);
                    formation.forEach((slot, i) => {
                      const candidates = available.filter(p => canPlay(p, slot.pos) && !used.has(p.id));
                      candidates.sort((a, b) => getOverall(b) - getOverall(a));
                      if (candidates.length > 0) {
                        newSlots[i] = candidates[0].id;
                        used.add(candidates[0].id);
                      }
                    });
                    // GK safety net — if the GK slot is empty, find any GK in the full squad (even injured)
                    const gkIdx = formation.findIndex(s => s.pos === "GK");
                    if (gkIdx !== -1 && newSlots[gkIdx] == null) {
                      const anyGK = squad.filter(p => p.position === "GK" && !used.has(p.id))
                        .sort((a, b) => (a.injury ? 1 : 0) - (b.injury ? 1 : 0) || getOverall(b) - getOverall(a))[0];
                      if (anyGK) { newSlots[gkIdx] = anyGK.id; used.add(anyGK.id); }
                    }
                    // Fill any remaining XI slots with best available (OOP)
                    formation.forEach((_, i) => {
                      if (newSlots[i] != null) return;
                      const best = available.filter(p => !used.has(p.id)).sort((a, b) => getOverall(b) - getOverall(a));
                      if (best.length > 0) { newSlots[i] = best[0].id; used.add(best[0].id); }
                    });

                    // 2. Smart bench — ensure 1 GK, 1 DEF, 1 MID, 1 FWD, then best remaining
                    const benchPool = available.filter(p => !used.has(p.id));
                    const benchIds = [];
                    const sectionNeeds = [
                      { type: "GK", positions: ["GK"] },
                      { type: "DEF", positions: ["CB", "LB", "RB"] },
                      { type: "MID", positions: ["CM", "AM"] },
                      { type: "FWD", positions: ["LW", "RW", "ST"] },
                    ];
                    const benchUsed = new Set();
                    for (const need of sectionNeeds) {
                      const pick = benchPool
                        .filter(p => (need.positions.includes(p.position) || need.positions.some(pos => p.learnedPositions?.includes(pos))) && !benchUsed.has(p.id))
                        .sort((a, b) => getOverall(b) - getOverall(a))[0];
                      if (pick) { benchIds.push(pick.id); benchUsed.add(pick.id); }
                    }
                    // Fill remaining bench spots (up to 5) with best OVR
                    const rest = benchPool.filter(p => !benchUsed.has(p.id)).sort((a, b) => getOverall(b) - getOverall(a));
                    for (const p of rest) {
                      if (benchIds.length >= 5) break;
                      benchIds.push(p.id);
                    }
                    benchIds.sort((a, b) => {
                      const pa = squad.find(p => p.id === a);
                      const pb = squad.find(p => p.id === b);
                      return (POSITION_ORDER[pa?.position] || 0) - (POSITION_ORDER[pb?.position] || 0);
                    });
                    benchIds.forEach((id, i) => { newSlots[11 + i] = id; });

                    setSlotAssignments(newSlots);
                    const newXI = [];
                    const newBench = [];
                    newSlots.forEach((pid, i) => {
                      if (pid == null) return;
                      if (i < 11) newXI.push(pid);
                      else newBench.push(pid);
                    });
                    setStartingXI(newXI);
                    setBench(newBench);
                  }} style={{
                    padding: "7px 12px", fontSize: F.xs, cursor: "pointer",
                    background: "transparent",
                    border: `1px solid ${C.bgInput}`,
                    color: C.textMuted,
                    fontFamily: FONT,
                  }}>ASST XI</button>
                  {squad.some(p => p.isLegend) && (
                    <button onClick={(e) => {
                      e.stopPropagation();
                      // Fans XI: same as ASST XI but legends with remaining appearances are included
                      const available = squad.filter(p => !p.injury && !(p.isLegend && (p.legendAppearances || 0) >= 12));
                      const newSlots = new Array(TOTAL_SLOTS).fill(null);
                      const used = new Set();

                      const canPlay = (p, pos) => p.position === pos || p.learnedPositions?.includes(pos);
                      formation.forEach((slot, i) => {
                        const candidates = available.filter(p => canPlay(p, slot.pos) && !used.has(p.id));
                        candidates.sort((a, b) => getOverall(b) - getOverall(a));
                        if (candidates.length > 0) {
                          newSlots[i] = candidates[0].id;
                          used.add(candidates[0].id);
                        }
                      });
                      const gkIdx = formation.findIndex(s => s.pos === "GK");
                      if (gkIdx !== -1 && newSlots[gkIdx] == null) {
                        const anyGK = squad.filter(p => p.position === "GK" && !used.has(p.id))
                          .sort((a, b) => (a.injury ? 1 : 0) - (b.injury ? 1 : 0) || getOverall(b) - getOverall(a))[0];
                        if (anyGK) { newSlots[gkIdx] = anyGK.id; used.add(anyGK.id); }
                      }
                      formation.forEach((_, i) => {
                        if (newSlots[i] != null) return;
                        const best = available.filter(p => !used.has(p.id)).sort((a, b) => getOverall(b) - getOverall(a));
                        if (best.length > 0) { newSlots[i] = best[0].id; used.add(best[0].id); }
                      });

                      const benchPool = available.filter(p => !used.has(p.id));
                      const benchIds = [];
                      const sectionNeeds = [
                        { type: "GK", positions: ["GK"] },
                        { type: "DEF", positions: ["CB", "LB", "RB"] },
                        { type: "MID", positions: ["CM", "AM"] },
                        { type: "FWD", positions: ["LW", "RW", "ST"] },
                      ];
                      const benchUsed = new Set();
                      for (const need of sectionNeeds) {
                        const pick = benchPool
                          .filter(p => (need.positions.includes(p.position) || need.positions.some(pos => p.learnedPositions?.includes(pos))) && !benchUsed.has(p.id))
                          .sort((a, b) => getOverall(b) - getOverall(a))[0];
                        if (pick) { benchIds.push(pick.id); benchUsed.add(pick.id); }
                      }
                      const rest = benchPool.filter(p => !benchUsed.has(p.id)).sort((a, b) => getOverall(b) - getOverall(a));
                      for (const p of rest) {
                        if (benchIds.length >= 5) break;
                        benchIds.push(p.id);
                      }
                      benchIds.sort((a, b) => {
                        const pa = squad.find(p => p.id === a);
                        const pb = squad.find(p => p.id === b);
                        return (POSITION_ORDER[pa?.position] || 0) - (POSITION_ORDER[pb?.position] || 0);
                      });
                      benchIds.forEach((id, i) => { newSlots[11 + i] = id; });

                      setSlotAssignments(newSlots);
                      const newXI = [];
                      const newBench = [];
                      newSlots.forEach((pid, i) => {
                        if (pid == null) return;
                        if (i < 11) newXI.push(pid);
                        else newBench.push(pid);
                      });
                      setStartingXI(newXI);
                      setBench(newBench);
                    }} style={{
                      padding: "7px 12px", fontSize: F.xs, cursor: "pointer",
                      background: "transparent",
                      border: "1px solid rgba(251,191,36,0.4)",
                      color: C.amber,
                      fontFamily: FONT,
                    }}>FANS XI</button>
                  )}
                </div>
              </div>

              {/* Chip tray */}
              {(() => {
                // Build set of assigned slot indices from playerChipMap
                const assignedSlots = new Set(Object.values(playerChipMap));

                // Build list of all 16 chip definitions
                const chipDefs = [];
                formation.forEach((slot, i) => {
                  chipDefs.push({
                    idx: i, label: slot.pos, color: POS_COLORS[slot.pos] || C.textMuted,
                    assigned: assignedSlots.has(i),
                  });
                });
                for (let i = 0; i < 5; i++) {
                  const si = 11 + i;
                  chipDefs.push({
                    idx: si, label: `SUB${i + 1}`, color: SUB_COLOR,
                    assigned: assignedSlots.has(si),
                  });
                }

                const unassigned = chipDefs.filter(c => !c.assigned);
                const assignedCount = TOTAL_SLOTS - unassigned.length;

                return (
                  <div style={{ padding: "7px 12px", pointerEvents: "auto" }}>
                    {/* Label row */}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      marginBottom: 4,
                    }}>
                      <span style={{ fontSize: F.xs, color: C.textDim, fontFamily: FONT }}>
                        POSITIONS ({assignedCount}/{TOTAL_SLOTS})
                      </span>
                      {assignedCount > 0 && (
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setSlotAssignments(null);
                          setStartingXI([]);
                          setBench([]);
                          setSelectedSlot(null);
                        }} style={{
                          padding: "4px 10px", fontSize: F.micro, cursor: "pointer",
                          background: "transparent", border: `1px solid ${C.bgInput}`,
                          color: C.textDim, fontFamily: FONT,
                        }}>CLEAR</button>
                      )}
                    </div>
                    {/* Chip row */}
                    <div style={{
                      display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center",
                      minHeight: 24,
                    }}>
                      {unassigned.length === 0 && (
                        <span style={{ fontSize: F.xs, color: "#4ade8066", fontFamily: FONT }}>
                          ALL POSITIONS ASSIGNED ✓
                        </span>
                      )}
                      {unassigned.map(chip => {
                        const isSelected = selectedSlot === chip.idx;
                        return (
                          <div
                            key={chip.idx}
                            draggable={!isMobile}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("chipIdx", String(chip.idx));
                              setSelectedSlot(chip.idx);
                            }}
                            onDragEnd={() => setSelectedSlot(null)}
                            onClick={() => setSelectedSlot(prev => prev === chip.idx ? null : chip.idx)}
                            style={{
                              padding: "5px 7px",
                              background: isSelected ? chip.color : chip.color + "20",
                              border: `2px solid ${isSelected ? "#fff" : chip.color}`,
                              borderRadius: 3,
                              color: isSelected ? C.bg : chip.color,
                              fontSize: chip.idx >= 11 ? F.xs : F.sm,
                              fontFamily: FONT,
                              fontWeight: "bold",
                              cursor: isMobile ? "pointer" : "grab",
                              userSelect: "none",
                              transition: "all 0.15s ease",
                              boxShadow: isSelected ? `0 0 8px ${chip.color}66` : "none",
                              minWidth: isMobile ? 42 : 40,
                              textAlign: "center",
                            }}
                          >
                            {chip.label}
                          </div>
                        );
                      })}
                      {selectedSlot !== null && isMobile && (
                        <span style={{ fontSize: F.xs, color: C.gold, fontFamily: FONT, marginLeft: 6 }}>
                          ← TAP A PLAYER
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Column header */}
            {renderHeader()}

            {/* Flat squad list — sorted by chip assignment */}
            {(() => {
              // Sort: formation-chipped first (by slot idx), then sub-chipped, then unassigned (by position)
              // Legends are shown in their own section below
              const allPlayers = squad.filter(p => !p.isLegend).slice().sort((a, b) => {
                const aSlot = playerChipMap[a.id];
                const bSlot = playerChipMap[b.id];
                const aHas = aSlot !== undefined;
                const bHas = bSlot !== undefined;
                if (aHas && !bHas) return -1;
                if (!aHas && bHas) return 1;
                if (aHas && bHas) return aSlot - bSlot;
                // Both unassigned — sort by position
                return (POSITION_ORDER[a.position] || 0) - (POSITION_ORDER[b.position] || 0);
              });

              // Find boundary indices for subtle dividers
              const xiCount = allPlayers.filter(p => playerChipMap[p.id] !== undefined && playerChipMap[p.id] < 11).length;
              const subCount = allPlayers.filter(p => playerChipMap[p.id] !== undefined && playerChipMap[p.id] >= 11).length;

              return allPlayers.map((p, i) => {
                const section = playerChipMap[p.id] !== undefined
                  ? (playerChipMap[p.id] < 11 ? "starting" : "bench")
                  : "reserves";
                return (
                  <React.Fragment key={p.id}>
                    {/* Subtle divider between XI / subs / unassigned */}
                    {i === xiCount && xiCount > 0 && (
                      <div style={{ height: 2, background: "#4ade8022", margin: "0" }} />
                    )}
                    {i === xiCount + subCount && subCount > 0 && (
                      <div style={{ height: 2, background: "#60a5fa22", margin: "0" }} />
                    )}
                    {renderPlayerRow(p, i, section)}
                  </React.Fragment>
                );
              });
            })()}

            {/* Legend players section */}
            {(() => {
              const legendPlayers = squad.filter(p => p.isLegend);
              if (legendPlayers.length === 0) return null;
              const legendsSorted = legendPlayers.slice().sort((a, b) =>
                (POSITION_ORDER[a.position] || 0) - (POSITION_ORDER[b.position] || 0)
              );
              return (
                <>
                  <div style={{
                    padding: "8px 12px",
                    background: "rgba(251,191,36,0.06)",
                    borderTop: "2px solid rgba(251,191,36,0.25)",
                    borderBottom: "1px solid rgba(251,191,36,0.12)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontSize: F.sm, color: C.amber, letterSpacing: 2 }}>LEGENDS</span>
                    <span style={{ fontSize: F.xs, color: C.textDim }}>
                      ({legendPlayers.length} · max 12 apps/season)
                    </span>
                  </div>
                  {legendsSorted.map((p, i) => renderPlayerRow(p, i, "legend"))}
                </>
              );
            })()}
          </div>
        );
      })()}

      {/* Hint */}
      <div style={{
        marginTop: 12, fontSize: F.sm, color: squad.filter(p => !p.isLegend).length >= 25 ? "#f59e0b" : C.slate, textAlign: "center",
        letterSpacing: 1,
      }}>
        SQUAD: {squad.filter(p => !p.isLegend).length}/25{squad.filter(p => !p.isLegend).length >= 25 ? " · FULL — RELEASE PLAYERS TO SIGN NEW ONES" : ""}
      </div>
      {!isMobile ? (
      <div style={{
        marginTop: 4, fontSize: F.sm, color: C.bgInput, textAlign: "center",
        letterSpacing: 1,
      }}>
        DRAG PLAYERS TO MANAGE SQUAD · CLICK TO ASSIGN TRAINING
      </div>) : (
      <div style={{
        marginTop: 4, fontSize: F.sm, color: C.bgInput, textAlign: "center",
        letterSpacing: 1,
      }}>
        TAP PLAYER TO SELECT · TAP AGAIN TO VIEW · TAP ANOTHER TO SWAP
      </div>)}

      {/* Player detail panel */}
      {selectedPlayer && (
        <PlayerPanel
          player={squad.find(p => p.id === selectedPlayer.id) || selectedPlayer}
          ovrCap={ovrCap}
          onAssignTraining={(id, key) => {
            assignTraining(id, key);
            setSelectedPlayer(prev => ({ ...prev, training: key }));
          }}
          onAssignPositionTraining={(id, targetPos) => {
            assignPositionTraining(id, targetPos);
            setSelectedPlayer(prev => ({ ...prev, positionTraining: { targetPos, weeksLeft: getPositionTrainingWeeks(prev.position, targetPos), totalWeeks: getPositionTrainingWeeks(prev.position, targetPos) }, training: null }));
          }}
          onClose={() => setSelectedPlayer(null)}
          onRelease={(playerId) => {
            setSquad(prev => prev.filter(p => p.id !== playerId));
            setStartingXI(prev => prev.filter(id => id !== playerId));
            setBench(prev => prev.filter(id => id !== playerId));
            setSelectedPlayer(null);
            // Story arc: track player release
            setStoryArcs(prev => {
              const next = {...prev};
              ARC_CATS.forEach(cat => {
                const cs = next[cat];
                if (!cs || cs.completed) return;
                const t = {...(cs.tracking||{})};
                t.releasedPlayer = true;
                next[cat] = {...cs, tracking: t};
              });
              return next;
            });
          }}
          onToggleShortlist={handleToggleShortlist}
          shortlist={shortlist}
        />
      )}
      </>
      ) : (
      <Dashboard
        inboxMessages={inboxMessages}
        week={week}
        seasonNumber={seasonNumber}
        formation={formation}
        startingXI={startingXI}
        squad={squad}
        slotAssignments={slotAssignments}
        league={league}
        leagueTier={leagueTier}
        teamName={teamName}
        newspaperName={newspaperName}
        matchweekIndex={matchweekIndex}
        leagueResults={leagueResults}
        seasonCalendar={seasonCalendar}
        calendarIndex={calendarIndex}
        cup={cup}
        playerSeasonStats={playerSeasonStats}
        playerRatingTracker={playerRatingTracker}
        recentScorelines={recentScorelines}
        consecutiveWins={consecutiveWins}
        consecutiveUnbeaten={consecutiveUnbeaten}
        consecutiveLosses={consecutiveLosses}
        seasonGoalsFor={seasonGoalsFor}
        seasonCleanSheets={seasonCleanSheets}
        seasonDraws={seasonDraws}
        calendarResults={calendarResults}
        clubHistory={clubHistory}
        onOpenInbox={() => { setInitialBootRoomTab("inbox"); setShowCalendar(true); }}
        onOpenLeague={() => setShowTable(true)}
        onOpenSquad={() => setShowSquad(true)}
        onAsstXI={handleAsstXI}
        onInboxChoice={handleInboxChoice}
        setInboxMessages={setInboxMessages}
        isMobile={isMobile}
        onPlayerClick={resolveAnyPlayer}
        onTeamClick={handleGlobalTeamClick}
        fanSentiment={fanSentiment}
        boardSentiment={boardSentiment}
        ultimatumActive={ultimatumActive}
        ultimatumPtsEarned={ultimatumPtsEarned}
        ultimatumTarget={ultimatumTarget}
        ultimatumGamesLeft={ultimatumGamesLeft}
        gameMode={gameMode}
        showLineupWarning={!!showLineupWarning}
        onDismissLineupWarning={() => setShowLineupWarning(null)}
        onLineupWarningGoToSquad={() => {
          setShowLineupWarning(null);
          setShowAchievements(false); setShowTable(false); setShowCalendar(false);
          setShowCup(false); setShowTransfers(false); setShowLegends(false);
          setShowSquad(true);
        }}
        onLineupWarningPlayAnyway={() => {
          const origin = showLineupWarning;
          setShowLineupWarning(null);
          if (origin === "match") {
            if (playMatchBtnRef.current) {
              playMatchBtnRef.current.click();
            } else {
              setShowAchievements(false); setShowTable(false); setShowCalendar(false);
              setShowCup(false); setShowTransfers(false); setShowLegends(false); setShowSquad(false);
              setTimeout(() => playMatchBtnRef.current?.click(), 0);
            }
          } else {
            advanceWeek();
          }
        }}
      />
      )}

      {/* Gain popup — waits for arc step notifications */}
      {gains !== null && arcStepQueue.length === 0 && !weekTransition && (
        <GainPopup
          gains={gains}
          cardSpeed={trainingCardSpeed}
          onTicketPicked={(ticketType) => {
            setTickets(prev => [...prev, { id: `t_arc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, type: ticketType }]);
          }}
          onAchievementCheck={(revealedItem) => {
            const newUnlocks = [];
            if (revealedItem.type === "gain" || revealedItem.type === "arc_boost_group") {
              if (!unlockedAchievements.has("first_gain")) newUnlocks.push("first_gain");
              setTotalGains(prev => prev + 1);
            }
            if (revealedItem.type === "duo") {
              if (!unlockedAchievements.has("duo_boost")) newUnlocks.push("duo_boost");
              setTotalGains(prev => prev + 1);
            }
            if (revealedItem.type === "injury") {
              revealedInjuryCount.current++;
              if (revealedInjuryCount.current >= 3 && !unlockedAchievements.has("cursed")) {
                newUnlocks.push("cursed");
              }
              // Forgot Kit — injury while 'Forgot Kit' is playing
              if (!unlockedAchievements.has("forgot_kit") && BGM.getCurrentTrackId() === "forgot_kit") {
                newUnlocks.push("forgot_kit");
              }
            }
            // Training Montage — get a gain while 'Training' is playing
            if (revealedItem.type === "gain" && !unlockedAchievements.has("training_montage") && BGM.getCurrentTrackId() === "training") {
              newUnlocks.push("training_montage");
            }
            const val = revealedItem.type === "gain" ? revealedItem.data.newVal
              : revealedItem.type === "duo" ? revealedItem.data.newVal : null;
            if (!unlockedAchievements.has("stat_15") && val && val >= 15) newUnlocks.push("stat_15");
            if (!unlockedAchievements.has("stat_20") && val && val >= 20) newUnlocks.push("stat_20");
            if (newUnlocks.length > 0) {
              setUnlockedAchievements(prev => {
                const next = new Set(prev);
                newUnlocks.forEach(id => next.add(id));
                return next;
              });
              setAchievementQueue(prev => {
                const existing = new Set(prev);
                const fresh = newUnlocks.filter(id => !existing.has(id));
                return fresh.length > 0 ? [...prev, ...fresh] : prev;
              });
            }
          }}
          onDone={() => {
            let appliedSquad = squad;
            const levelUps = [];
            if (pendingSquad) {
              // Compute OVR level-ups before merging
              pendingSquad.forEach(pp => {
                const old = squad.find(p => p.id === pp.id);
                if (old) {
                  const oldOvr = getOverall(old);
                  const newOvr = getOverall(pp);
                  if (newOvr > oldOvr) {
                    levelUps.push({ name: pp.name, position: pp.position, oldOvr, newOvr });
                  }
                }
              });

              // Merge: take pending squad but preserve any training reassignments
              appliedSquad = pendingSquad.map(pp => {
                const current = useGameStore.getState().squad.find(p => p.id === pp.id);  // Use ref, not stale state!
                return current ? { ...pp, training: current.training } : pp;
              });
              setSquad(appliedSquad);
              setPendingSquad(null);

              // Trigger OVR celebration if any level-ups
              if (levelUps.length > 0) {
                setOvrLevelUps(levelUps);
                setRecentOvrLevelUps(levelUps);
                // Level Up achievement
                if (!unlockedAchievements.has("level_up")) {
                  setUnlockedAchievements(prev => { const n = new Set(prev); n.add("level_up"); return n; });
                  setAchievementQueue(prev => [...prev, "level_up"]);
                }
                // 1-Up Addict — 5+ OVR increases in a single week
                if (levelUps.length >= 5 && !unlockedAchievements.has("1up_addict")) {
                  setUnlockedAchievements(prev => { const n = new Set(prev); n.add("1up_addict"); return n; });
                  setAchievementQueue(prev => [...prev, "1up_addict"]);
                }
                // Late Bloomer — OVR increase for a player aged 31+
                if (!unlockedAchievements.has("late_bloomer") && levelUps.some(l => l.age >= 31)) {
                  setUnlockedAchievements(prev => { const n = new Set(prev); n.add("late_bloomer"); return n; });
                  setAchievementQueue(prev => [...prev, "late_bloomer"]);
                }
                // Exceeded Expectations — OVR exceeds the player's starting potential
                if (!unlockedAchievements.has("exceeded_expectations")) {
                  const exceeder = appliedSquad.find(p => !p.isTrial && p.potential && getOverall(p) > p.potential);
                  if (exceeder) {
                    setUnlockedAchievements(prev => { const n = new Set(prev); n.add("exceeded_expectations"); return n; });
                    setAchievementQueue(prev => [...prev, "exceeded_expectations"]);
                  }
                }
              }
            }
            // Déjà Vu — 2 consecutive gains share a first name
            if (gains && !unlockedAchievements.has("deja_vu_training")) {
              const imps = gains.improvements || [];
              for (let i = 0; i < imps.length - 1; i++) {
                const f1 = (imps[i].playerName || "").split(" ")[0];
                const f2 = (imps[i + 1].playerName || "").split(" ")[0];
                if (f1 && f1 === f2) {
                  setUnlockedAchievements(prev => { const n = new Set(prev); n.add("deja_vu_training"); return n; });
                  setAchievementQueue(prev => [...prev, "deja_vu_training"]);
                  break;
                }
              }
            }
            // Position learning achievements
            if (gains) {
              const posLearnedEvents = (gains.progress || []).filter(e => e.type === "positionLearned");
              posLearnedEvents.forEach(pl => {
                if (!unlockedAchievements.has("shape_shifter")) {
                  setUnlockedAchievements(prev => { const n = new Set(prev); n.add("shape_shifter"); return n; });
                  setAchievementQueue(prev => prev.includes("shape_shifter") ? prev : [...prev, "shape_shifter"]);
                }
                const plPlayer = squad.find(p => p.name === pl.playerName);
                if (!unlockedAchievements.has("new_tricks") && plPlayer && plPlayer.age >= 30) {
                  setUnlockedAchievements(prev => { const n = new Set(prev); n.add("new_tricks"); return n; });
                  setAchievementQueue(prev => prev.includes("new_tricks") ? prev : [...prev, "new_tricks"]);
                }
                if (!unlockedAchievements.has("sick_as_a_parrot") && pl.learnedPosition === "GK" && pl.playerPosition !== "GK") {
                  setUnlockedAchievements(prev => { const n = new Set(prev); n.add("sick_as_a_parrot"); return n; });
                  setAchievementQueue(prev => prev.includes("sick_as_a_parrot") ? prev : [...prev, "sick_as_a_parrot"]);
                }
              });
            }
            setGains(null);

            // === TRAINING REPORT INBOX MESSAGE ===
            try {
              if (gains) {
                const gi = gains.improvements || [];
                const inj = gains.injuries || [];
                const duos = gains.duos || [];
                const rec = gains.recoveries || [];
                const allProg = gains.progress || [];
                const posLearned = allProg.filter(p => p.type === "positionLearned");
                const prog = allProg.filter(p => p.type !== "positionLearned");
                const parts = [];
                if (levelUps.length > 0) parts.push(`⬆️ OVR up: ${levelUps.map(l => `${l.name} ${l.oldOvr}→${l.newOvr}`).join(", ")}`);
                const arcB = gains.arcBoosts || [];
                if (arcB.length > 0) {
                  // Group by sourceKey then by attr, so well_rested and arc boosts get distinct labels
                  const bySrc = {};
                  arcB.forEach(ab => {
                    const src = ab.sourceKey || "arc";
                    if (!bySrc[src]) bySrc[src] = {};
                    const k = ab.attr;
                    if (!bySrc[src][k]) bySrc[src][k] = { attr: k, amt: ab.newVal - ab.oldVal, names: [] };
                    bySrc[src][k].names.push(ab.playerName);
                  });
                  Object.entries(bySrc).forEach(([src, byA]) => {
                    const prefix = src === "well_rested" ? "☀️ Well Rested" : "📖 Arc boost";
                    const abParts = Object.values(byA).map(g => {
                      const label = ATTRIBUTES.find(a => a.key === g.attr)?.label || g.attr;
                      if (g.names.length <= 5) return `${g.names.join(", ")} ${label} +${g.amt}`;
                      return `All squad ${label} +${g.amt}`;
                    });
                    parts.push(`${prefix}: ${abParts.join(", ")}`);
                  });
                }
                if (posLearned.length > 0) posLearned.forEach(pl => {
                  const allPos = [pl.playerPosition, ...(squad.find(p => p.name === pl.playerName)?.learnedPositions || [])].join(", ");
                  parts.push(`🎓 ${pl.playerName} has learned ${pl.learnedPosition}. Plays: ${allPos}`);
                });
                const prodigalGi = gi.filter(g => g.isProdigalBoost);
                const regularGi = gi.filter(g => !g.isProdigalBoost);
                if (prodigalGi.length > 0) {
                  parts.push(`🏠 Arc reward: ${prodigalGi[0].playerName} ${prodigalGi.map(g => `${ATTRIBUTES.find(a => a.key === g.attr)?.label || g.attr} +${g.newVal - g.oldVal}`).join(", ")}`);
                }
                if (regularGi.length > 0) parts.push(`📈 ${regularGi.length} stat gain${regularGi.length > 1 ? "s" : ""}: ${regularGi.slice(0, 3).map(g => `${g.playerName} ${g.attr} ↑${g.newVal}`).join(", ")}${regularGi.length > 3 ? ` +${regularGi.length - 3} more` : ""}`);
                if (duos.length > 0) parts.push(`🤝 ${duos.length} duo boost${duos.length > 1 ? "s" : ""}: ${duos.slice(0, 2).map(d => `${d.playerName} ${d.attr} ↑${d.newVal}`).join(", ")}`);
                if (inj.length > 0) parts.push(`🏥 ${inj.length} injur${inj.length > 1 ? "ies" : "y"}: ${inj.map(i => `${i.playerName} (${i.weeksOut}w)`).join(", ")}`);
                if (rec.length > 0) parts.push(`💚 ${rec.length} recover${rec.length > 1 ? "ies" : "y"}: ${rec.join(", ")}`);
                if (prog.length > 0) parts.push(`🔄 Progress: ${prog.slice(0, 2).map(p => `${p.playerName} ${p.attr} ${Math.round(p.newProgress * 100)}%`).join(", ")}`);
                if (parts.length === 0) parts.push("A quiet week on the training pitch. No breakthroughs to report.");
                setInboxMessages(prev => [...prev, {
                  id: `msg_train_${Date.now()}`, week: week, season: seasonNumber,
                  icon: "🏋️", color: "#a78bfa",
                  title: `Training Report · Week ${week}`,
                  body: parts.join("\n"),
                  read: false,
                }]);
              }
            } catch(err) {
              console.error("Training report error:", err);
            }

            // === ASSISTANT MANAGER: LOPSIDED TRAINING WARNING ===
            try {
              // Only flag gaps in stats that matter for the player's role
              const RELEVANT_ATTRS = {
                FWD: ["pace", "shooting", "passing", "physical", "technique", "mental"], // not defending
                MID: ["pace", "shooting", "passing", "physical", "technique", "mental"], // not defending
                DEF: ["pace", "passing", "defending", "physical", "mental"], // not shooting/technique
                GK: [], // skip keepers
              };
              const GAP_THRESHOLD = 12;
              const warnings = [];
              (appliedSquad || squad).forEach(p => {
                if (!p.training || p.training === "balanced") return;
                const focus = TRAINING_FOCUSES.find(f => f.key === p.training);
                if (!focus || focus.attrs.length !== 1) return;
                const warnKey = `${p.id}_${p.training}`;
                if (lopsidedWarned.has(warnKey)) return;
                const posType = POSITION_TYPES[p.position] || "MID";
                const relevant = RELEVANT_ATTRS[posType] || [];
                if (relevant.length < 2) return;
                const trainedAttr = focus.attrs[0];
                if (!relevant.includes(trainedAttr)) return;
                const trainedVal = p.attrs[trainedAttr] || 0;
                // Only fire if the trained stat is the highest relevant stat
                const otherVals = relevant.filter(k => k !== trainedAttr).map(k => ({ key: k, val: p.attrs[k] || 0 }));
                const isHighest = otherVals.every(o => trainedVal >= o.val);
                if (!isHighest) return;
                const lowest = otherVals.reduce((a, b) => b.val < a.val ? b : a);
                if (trainedVal - lowest.val >= GAP_THRESHOLD) {
                  const highLabel = ATTRIBUTES.find(a => a.key === trainedAttr)?.label || trainedAttr;
                  const lowLabel = ATTRIBUTES.find(a => a.key === lowest.key)?.label || lowest.key;
                  warnings.push({ name: p.name, warnKey, highLabel, highest: trainedVal, lowLabel, lowest: lowest.val, training: focus.label });
                }
              });
              if (warnings.length > 0) {
                const newWarned = new Set(lopsidedWarned);
                warnings.forEach(w => newWarned.add(w.warnKey));
                setLopsidedWarned(newWarned);
                const lines = warnings.map(w => `${w.name}: ${w.highLabel} ${w.highest} / ${w.lowLabel} ${w.lowest} (on ${w.training})`);
                setInboxMessages(prev => [...prev, {
                  id: `msg_lopsided_${Date.now()}`, week: week, season: seasonNumber,
                  icon: "📋", color: "#f59e0b",
                  title: `Asst. Manager's Notes`,
                  body: `Boss, a few lads might benefit from a change of focus in training:\n${lines.join("\n")}`,
                  read: false,
                }]);
              }
            } catch(err) {
              console.error("Lopsided training check error:", err);
            }

            // === ASSISTANT MANAGER: TRAINING NUDGE (Matchday 5, no training assigned) ===
            try {
              const mwPlayed = useGameStore.getState().matchweekIndex;
              const noTrainingAssigned = (appliedSquad || squad).every(p => !p.training);
              const alreadySent = inboxMessages.some(m => m.id === "msg_asst_mgr_training_nudge");
              const introDeclined = inboxMessages.some(m => m.id === "msg_asst_mgr_training_intro" && m.choiceResult === "manual");
              if (mwPlayed >= 5 && noTrainingAssigned && !alreadySent && seasonNumber === 1) {
                setInboxMessages(prev => [...prev, {
                  id: "msg_asst_mgr_training_nudge", week: week, season: seasonNumber,
                  icon: "📋", color: "#f59e0b",
                  title: "Asst. Manager's Notes",
                  body: introDeclined
                    ? "Boss, I know you said you'd handle training yourself, but we're 5 games in and none of the lads have a programme.\n\nAt this rate they won't improve at all this season. Want me to step in and put everyone on a general regime? You can always fine-tune it later."
                    : "Boss, we're 5 matchdays in and the lads still aren't training.\n\nThey're not going to get any better on their own. Say the word and I'll put everyone on a general programme — you can always change it later on the Squad page.",
                  read: false, type: "asst_mgr_training_nudge",
                  choices: [{ label: "Go On Then", value: "delegate" }, { label: "Leave It", value: "dismiss" }],
                }]);
              }
            } catch(err) {
              console.error("Training nudge check error:", err);
            }

            // Apply deferred trial player actions
            const trialAction = pendingTrialAction.current;
            pendingTrialAction.current = null;
            if (trialAction) {
              if (trialAction.type === "impressed") {
                // Trial player departs but is remembered — will appear in next youth intake
                setSquad(prev => prev.filter(p => p.id !== trialAction.id));
                setStartingXI(prev => prev.filter(id => id !== trialAction.id));
                setBench(prev => prev.filter(id => id !== trialAction.id));
                setTrialPlayer(null);
                setTrialHistory(prev => [...prev, {
                  name: trialAction.name, position: trialAction.position,
                  nationality: trialAction.nationality, flag: trialAction.flag,
                  countryLabel: trialAction.countryLabel, attrs: trialAction.attrs,
                  potential: trialAction.potential, starts: trialAction.starts,
                  impressed: true, signed: false, season: trialAction.season,
                }]);
                setInboxMessages(prev => [...prev, {
                  id: `msg_trial_end_${Date.now()}`, week: trialAction.week, season: trialAction.season,
                  icon: "✈️", color: C.blue,
                  title: `${trialAction.name} Trial Complete`,
                  body: `${trialAction.name} ${trialAction.flag} has headed home after an impressive trial — ${trialAction.starts} appearance${trialAction.starts !== 1 ? "s" : ""} in the first team. He'll continue developing abroad, but the door is open for a return.`,
                  read: false,
                }]);
              } else if (trialAction.type === "no_starts") {
                // Reality Check achievement — brought in on trial but never started
                if (!unlockedAchievements.has("reality_check")) {
                  setUnlockedAchievements(prev => { const n = new Set(prev); n.add("reality_check"); return n; });
                  setAchievementQueue(prev => [...prev, "reality_check"]);
                }
                setSquad(prev => prev.filter(p => p.id !== trialAction.id));
                setStartingXI(prev => prev.filter(id => id !== trialAction.id));
                setBench(prev => prev.filter(id => id !== trialAction.id));
                setTrialPlayer(null);
                const trialAtWeek = trialAction.week + rand(2, 5);
                setTrialHistory(prev => [...prev, {
                  name: trialAction.name, position: trialAction.position,
                  nationality: trialAction.nationality, flag: trialAction.flag,
                  countryLabel: trialAction.countryLabel,
                  rivalTeam: trialAction.rivalTeam, rivalTier: leagueTier,
                  impressed: false, declined: false, departureSeason: trialAction.season,
                  phase: "on_trial",
                }]);
                setInboxMessages(prev => [...prev, {
                  id: `msg_trial_end_${Date.now()}`, week: trialAction.week, season: trialAction.season,
                  icon: "😔", color: C.textMuted,
                  title: `${trialAction.name} Trial Over`,
                  body: `${trialAction.name} has left without making an appearance. He didn't get the chance to show what he could do.`,
                  read: false,
                }, {
                  id: `msg_trial_rival_${Date.now()}`, week: trialAtWeek, season: trialAction.season,
                  icon: "📰", color: C.blue,
                  title: `${trialAction.name} On Trial at ${trialAction.rivalTeam}`,
                  body: `${trialAction.name} ${trialAction.flag || ""} has gone on trial at ${trialAction.rivalTeam}. They're giving him the chance he didn't get here.`,
                  read: false, pendingUntilWeek: trialAtWeek,
                }]);
              } else if (trialAction.type === "continue") {
                setTrialPlayer(prev => prev ? { ...prev, trialWeeksLeft: trialAction.newWeeksLeft, trialStarts: trialAction.newStarts } : null);
                setSquad(prev => prev.map(p => p.id === trialAction.id ? { ...p, trialWeeksLeft: trialAction.newWeeksLeft, trialStarts: trialAction.newStarts } : p));
              }
            }

            // Check for injured starters — pause and let the user manage their squad
            const currentXI = [...startingXI];
            const currentBench = [...bench];
            const injuredStarters = currentXI.filter(id => {
              const p = appliedSquad.find(pl => pl.id === id);
              return p && p.injury;
            });
            if (injuredStarters.length > 0) {
              setInjuryWarning(injuredStarters.length);
            } else {
              setInjuryWarning(0);
            }
            // Always return to squad view — let player review and click PLAY MATCH
            setProcessing(false);

            // If the upcoming calendar entry is a cup match, prepare the cup round
            if (useGameStore.getState().seasonCalendar && useGameStore.getState().cup) {
              const ci = useGameStore.getState().calendarIndex;
              const entry = useGameStore.getState().seasonCalendar[ci];
              if (entry?.type === "cup") {
                const cupLookup = (name, tier) => (tier === leagueTier ? league : allLeagueStates?.[tier])?.teams?.find(t => t.name === name) || null;
                if (useGameStore.getState().cup.playerEliminated) {
                  // Auto-skip: resolve AI matches and advance
                  const updatedCup = advanceCupRound(useGameStore.getState().cup, appliedSquad, startingXI, bench, cupLookup);
                  let finCup = updatedCup;
                  if (finCup.pendingPlayerMatch) {
                    const pm = finCup.pendingPlayerMatch;
                    const winner = pm.away;
                    const newRounds = finCup.rounds.map((r, rIdx) => {
                      if (rIdx !== finCup.currentRound) return r;
                      return { ...r, matches: r.matches.map(m =>
                        m.home?.name === pm.home?.name && m.away?.name === pm.away?.name
                          ? { ...m, result: { homeGoals: 0, awayGoals: 1, winner } }
                          : m
                      )};
                    });
                    finCup = { ...finCup, rounds: newRounds, pendingPlayerMatch: null };
                    finCup = buildNextCupRound(finCup);
                  }
                  setCup(finCup);
                  setCalendarIndex(prev => prev + 1);
                } else {
                  // Prepare the cup round (resolve AI matches, find player's opponent)
                  const updatedCup = advanceCupRound(useGameStore.getState().cup, appliedSquad, startingXI, bench, cupLookup);
                  setCup(updatedCup);
                }
              }
            }

            // Mini-Tournament: handle mini entry for non-participants
            {
              const ci2m = useGameStore.getState().calendarIndex;
              const entry2m = useGameStore.getState().seasonCalendar?.[ci2m];
              if (entry2m?.type === "mini") {
                const mBkt = useGameStore.getState().miniTournamentBracket;
                const shouldSkipM = !mBkt || mBkt.playerEliminated;
                if (shouldSkipM) {
                  const mMod2 = getModifier(leagueTier);
                  if (entry2m.round === "sf_leg1") {
                    if (!mBkt) {
                      // Player didn't qualify — set up bracket from standings
                      const mSorted = sortStandings(useGameStore.getState().league?.table || []);
                      const mTop4 = mSorted.slice(0, 4).map(r => ({ teamIndex: r.teamIndex, name: useGameStore.getState().league?.teams?.[r.teamIndex]?.name }));
                      const mlt = useGameStore.getState().league?.teams || [];
                      setMiniTournamentBracket({
                        sf1: { home: mlt[mTop4[0].teamIndex], away: mlt[mTop4[3].teamIndex], leg1: null, leg2: null, winner: null },
                        sf2: { home: mlt[mTop4[1].teamIndex], away: mlt[mTop4[2].teamIndex], leg1: null, leg2: null, winner: null },
                        final: { home: null, away: null, result: null },
                        playerSF: 0, playerEliminated: true, winner: null, fiveASide: true,
                      });
                    }
                    const mbk = useGameStore.getState().miniTournamentBracket;
                    if (mbk) {
                      const mr1 = simulateMatch(mbk.sf1.home, mbk.sf1.away, null, null, true, 1, 0, null, 0, mMod2);
                      const mr2 = simulateMatch(mbk.sf2.home, mbk.sf2.away, null, null, true, 1, 0, null, 0, mMod2);
                      setMiniTournamentBracket(prev => ({
                        ...prev,
                        sf1: { ...prev.sf1, leg1: { homeGoals: mr1.homeGoals, awayGoals: mr1.awayGoals } },
                        sf2: { ...prev.sf2, leg1: { homeGoals: mr2.homeGoals, awayGoals: mr2.awayGoals } },
                      }));
                      setInboxMessages(prev => [...prev, {
                        id: `msg_mini_sf_l1_bg2_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                        icon: "🌐", title: "Mini-Tournament — SF Leg 1",
                        body: `${mbk.sf1.home.name} ${mr1.homeGoals}-${mr1.awayGoals} ${mbk.sf1.away.name}\n${mbk.sf2.home.name} ${mr2.homeGoals}-${mr2.awayGoals} ${mbk.sf2.away.name}`,
                        color: "#fbbf24", read: false,
                      }]);
                    }
                    setCalendarResults(prev => ({ ...prev, [ci2m]: { spectator: true, label: "Mini SF Leg 1" } }));
                  } else if (entry2m.round === "sf_leg2") {
                    const mbk = useGameStore.getState().miniTournamentBracket;
                    if (mbk?.sf1?.leg1 && !mbk.sf1.winner) {
                      const mr1 = simulateMatch(mbk.sf1.away, mbk.sf1.home, null, null, true, 1, 0, null, 0, mMod2);
                      const mr2 = simulateMatch(mbk.sf2.away, mbk.sf2.home, null, null, true, 1, 0, null, 0, mMod2);
                      const magg1h = mbk.sf1.leg1.homeGoals + mr1.awayGoals;
                      const magg1a = mbk.sf1.leg1.awayGoals + mr1.homeGoals;
                      let mw1 = magg1h > magg1a ? mbk.sf1.home : magg1a > magg1h ? mbk.sf1.away : null;
                      if (!mw1) { const p = generatePenaltyShootout(mbk.sf1.home, mbk.sf1.away, mr1.events, null, null, mMod2); mw1 = p.winner === "home" ? mbk.sf1.home : mbk.sf1.away; }
                      const magg2h = mbk.sf2.leg1.homeGoals + mr2.awayGoals;
                      const magg2a = mbk.sf2.leg1.awayGoals + mr2.homeGoals;
                      let mw2 = magg2h > magg2a ? mbk.sf2.home : magg2a > magg2h ? mbk.sf2.away : null;
                      if (!mw2) { const p = generatePenaltyShootout(mbk.sf2.home, mbk.sf2.away, mr2.events, null, null, mMod2); mw2 = p.winner === "home" ? mbk.sf2.home : mbk.sf2.away; }
                      setMiniTournamentBracket(prev => ({
                        ...prev,
                        sf1: { ...prev.sf1, leg2: { homeGoals: mr1.homeGoals, awayGoals: mr1.awayGoals }, winner: mw1 },
                        sf2: { ...prev.sf2, leg2: { homeGoals: mr2.homeGoals, awayGoals: mr2.awayGoals }, winner: mw2 },
                        final: { home: mw1, away: mw2, result: null },
                      }));
                      setInboxMessages(prev => [...prev, {
                        id: `msg_mini_sf_l2_bg2_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                        icon: "🌐", title: "Mini-Tournament — SF Results",
                        body: `${mw1.name} and ${mw2.name} advance to the final on aggregate.`,
                        color: "#fbbf24", read: false,
                      }]);
                    }
                    setCalendarResults(prev => ({ ...prev, [ci2m]: { spectator: true, label: "Mini SF Leg 2" } }));
                  } else if (entry2m.round === "final") {
                    const mbk = useGameStore.getState().miniTournamentBracket;
                    if (mbk?.final?.home && mbk?.final?.away && !mbk.final.result) {
                      const mfR = simulateMatch(mbk.final.home, mbk.final.away, null, null, true, 1, 0, null, 0, mMod2);
                      let mfW = mfR.homeGoals > mfR.awayGoals ? mbk.final.home : mfR.awayGoals > mfR.homeGoals ? mbk.final.away : null;
                      if (!mfW) { const p = generatePenaltyShootout(mbk.final.home, mbk.final.away, mfR.events, null, null, mMod2); mfW = p.winner === "home" ? mbk.final.home : mbk.final.away; }
                      setMiniTournamentBracket(prev => ({ ...prev, final: { ...prev.final, result: { homeGoals: mfR.homeGoals, awayGoals: mfR.awayGoals, winner: mfW } }, winner: mfW }));
                      setInboxMessages(prev => [...prev, {
                        id: `msg_mini_final_bg2_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                        icon: "🏆", title: "Mini-Tournament Final",
                        body: `${mfW.name} won the 5v5 Mini-Tournament! ${mfR.homeGoals}-${mfR.awayGoals}`,
                        color: "#fbbf24", read: false,
                      }]);
                    }
                    setCalendarResults(prev => ({ ...prev, [ci2m]: { spectator: true, label: "Mini Final" } }));
                  }
                  setCalendarIndex(prev => prev + 1);
                }
              }
            }

            // Dynasty Cup: handle dynasty entry for non-participants
            // (sim AI match in background, advance calendar — player just gets a training week)
            {
              const ci2 = useGameStore.getState().calendarIndex;
              const entry2 = useGameStore.getState().seasonCalendar?.[ci2];
              if (entry2?.type === "dynasty") {
                const bracket = useGameStore.getState().dynastyCupBracket;
                const shouldSkip = !bracket || bracket.playerEliminated;
                if (shouldSkip) {
                  const dMod = getModifier(leagueTier);
                  if (entry2.round === "sf") {
                    if (!bracket && dynastyCupQualifiers) {
                      // Player didn't qualify — sim both SFs
                      const q = dynastyCupQualifiers;
                      const lt = league.teams;
                      const sf1R = simulateMatch(lt[q[0].teamIndex], lt[q[3].teamIndex], null, null, true, 1, 0, null, 0, dMod);
                      const sf2R = simulateMatch(lt[q[1].teamIndex], lt[q[2].teamIndex], null, null, true, 1, 0, null, 0, dMod);
                      let sf1W = sf1R.homeGoals > sf1R.awayGoals ? lt[q[0].teamIndex] : sf1R.awayGoals > sf1R.homeGoals ? lt[q[3].teamIndex] : null;
                      if (!sf1W) { const p = generatePenaltyShootout(lt[q[0].teamIndex], lt[q[3].teamIndex], sf1R.events, null, null, dMod); sf1W = p.winner; }
                      let sf2W = sf2R.homeGoals > sf2R.awayGoals ? lt[q[1].teamIndex] : sf2R.awayGoals > sf2R.homeGoals ? lt[q[2].teamIndex] : null;
                      if (!sf2W) { const p = generatePenaltyShootout(lt[q[1].teamIndex], lt[q[2].teamIndex], sf2R.events, null, null, dMod); sf2W = p.winner; }
                      setDynastyCupBracket({
                        sf1: { home: lt[q[0].teamIndex], away: lt[q[3].teamIndex], result: { homeGoals: sf1R.homeGoals, awayGoals: sf1R.awayGoals, winner: sf1W } },
                        sf2: { home: lt[q[1].teamIndex], away: lt[q[2].teamIndex], result: { homeGoals: sf2R.homeGoals, awayGoals: sf2R.awayGoals, winner: sf2W } },
                        final: { home: sf1W, away: sf2W, result: null },
                        playerSF: 0, playerEliminated: true, winner: null,
                      });
                      setInboxMessages(prev => [...prev, {
                        id: `msg_dynasty_sf_bg_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                        icon: "🌍", title: "Dynasty Cup — Semi-Finals",
                        body: `${sf1W.name} beat ${sf1W === lt[q[0].teamIndex] ? lt[q[3].teamIndex].name : lt[q[0].teamIndex].name} ${sf1R.homeGoals}-${sf1R.awayGoals}\n${sf2W.name} beat ${sf2W === lt[q[1].teamIndex] ? lt[q[2].teamIndex].name : lt[q[1].teamIndex].name} ${sf2R.homeGoals}-${sf2R.awayGoals}\n\nThe final will be ${sf1W.name} vs ${sf2W.name}.`,
                        color: "#facc15", read: false,
                      }]);
                    }
                    setCalendarResults(prev => ({ ...prev, [ci2]: { spectator: true, label: "Dynasty Cup Semi-Finals" } }));
                  } else if (entry2.round === "final") {
                    const bk = useGameStore.getState().dynastyCupBracket;
                    if (bk?.final?.home && bk?.final?.away && !bk.final.result) {
                      const finR = simulateMatch(bk.final.home, bk.final.away, null, null, true, 1, 0, null, 0, dMod);
                      let finW = finR.homeGoals > finR.awayGoals ? bk.final.home : finR.awayGoals > finR.homeGoals ? bk.final.away : null;
                      if (!finW) { const p = generatePenaltyShootout(bk.final.home, bk.final.away, finR.events, null, null, dMod); finW = p.winner; }
                      setDynastyCupBracket(prev => ({ ...prev, final: { ...prev.final, result: { homeGoals: finR.homeGoals, awayGoals: finR.awayGoals, winner: finW } }, winner: finW }));
                      setInboxMessages(prev => [...prev, {
                        id: `msg_dynasty_final_bg_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                        icon: "🏆", title: "Dynasty Cup Final",
                        body: `${finW.name} won the Dynasty Cup, beating ${finW === bk.final.home ? bk.final.away.name : bk.final.home.name} ${finR.homeGoals}-${finR.awayGoals} in the final.`,
                        color: "#facc15", read: false,
                      }]);
                    }
                    setCalendarResults(prev => ({ ...prev, [ci2]: { spectator: true, label: "Dynasty Cup Final" } }));
                  }
                  setCalendarIndex(prev => prev + 1);
                }
              }
            }

            // Only set matchPending during active season (not summer break, not past calendar end)
            if (!summerPhase) {
              const _nextCal = useGameStore.getState().seasonCalendar?.[useGameStore.getState().calendarIndex];
              if (!_nextCal) {
                // Calendar exhausted — advanceWeek will handle season-end on next call
              } else if (_nextCal.type === "dynasty") {
                const _dBracket = useGameStore.getState().dynastyCupBracket;
                if (_dBracket && !_dBracket.playerEliminated) {
                  setMatchPending(true);
                }
                // Non-participant dynasty entries handled by advanceWeek
              } else if (_nextCal.type === "mini") {
                const _mBracket = useGameStore.getState().miniTournamentBracket;
                if (_mBracket && !_mBracket.playerEliminated) {
                  const _mRound = _nextCal.round;
                  const _playerInFinal = _mBracket.playerInFinal;
                  if (_mRound === "third_place" && _playerInFinal) {
                    // Player is in the final — auto-sim 3rd-place playoff (AI vs AI)
                    const _mMod = getModifier(leagueTier);
                    const _tp = _mBracket.thirdPlace;
                    if (_tp && !_tp.winner) {
                      const _tpR = simulateMatch(_tp.home, _tp.away, null, null, true, 1, 0, null, 0, _mMod);
                      let _tpW = _tpR.homeGoals > _tpR.awayGoals ? _tp.home : _tpR.awayGoals > _tpR.homeGoals ? _tp.away : null;
                      if (!_tpW) { const _tpP = generatePenaltyShootout(_tp.home, _tp.away, _tpR.events, null, null, _mMod); _tpW = _tpP.winner === "home" ? _tp.home : _tp.away; }
                      setMiniTournamentBracket(prev => ({
                        ...prev,
                        thirdPlace: { ...prev.thirdPlace, result: { homeGoals: _tpR.homeGoals, awayGoals: _tpR.awayGoals, winner: _tpW }, winner: _tpW },
                        thirdPlaceWinner: _tpW,
                      }));
                      setInboxMessages(prev => [...prev, {
                        id: `msg_mini_3rd_bg_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                        icon: "🥉", title: "Mini-Tournament — 3rd-Place Playoff",
                        body: `${_tpW.name} beat ${_tpW === _tp.home ? _tp.away.name : _tp.home.name} ${_tpR.homeGoals}-${_tpR.awayGoals} to claim 3rd place and the final promotion spot.`,
                        color: "#fbbf24", read: false,
                      }]);
                    }
                    setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "3rd Place Playoff" } }));
                    setCalendarIndex(prev => prev + 1);
                    // Now check if the next entry is the final (player's match)
                    const _nextCal2 = useGameStore.getState().seasonCalendar?.[useGameStore.getState().calendarIndex + 1];
                    if (_nextCal2?.type === "mini" && _nextCal2.round === "final") {
                      setMatchPending(true);
                    }
                  } else if (_mRound === "final" && _playerInFinal === false) {
                    // Player was in 3rd-place match, final already simmed — just advance
                    setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Mini Final" } }));
                    setCalendarIndex(prev => prev + 1);
                  } else {
                    setMatchPending(true);
                  }
                }
                // Non-participant mini entries handled by advanceWeek
              } else {
                // Intergalactic Elite: generate pre-match prediction for league matches
                const _predMod2 = getModifier(leagueTier);
                if (_predMod2.prediction && _nextCal.type === "league") {
                  const _fix2 = league?.fixtures?.[_nextCal.leagueMD]?.find(f => f.home === 0 || f.away === 0);
                  const _plHome2 = _fix2 ? _fix2.home === 0 : true;
                  // Weighted goal pool: 0-5, realistic distribution
                  const _ps2 = [0,0,0,1,1,1,1,1,2,2,2,2,3,3,3,4,4,5];
                  // Only predict draws or player wins (AI already gets 3 pts from own wins)
                  let _pred2;
                  for (let _try = 0; _try < 20; _try++) {
                    const h = _ps2[Math.floor(Math.random() * _ps2.length)];
                    const a = _ps2[Math.floor(Math.random() * _ps2.length)];
                    const aiWins = _plHome2 ? a > h : h > a;
                    if (!aiWins) { _pred2 = { home: h, away: a }; break; }
                  }
                  aiPredictionRef.current = _pred2 || { home: 1, away: 1 };
                }
                setMatchPending(true);
              }
            }
          }}
          onPlayerClick={(name) => {
            const source = pendingSquad || squad;
            const p = source.find(pl => pl.name === name);
            if (p) setSelectedPlayer(p);
          }}
          isOnHoliday={isOnHoliday}
        />
      )}

      {/* OVR Level-Up Celebration */}
      {ovrLevelUps && ovrLevelUps.length > 0 && !gains && arcStepQueue.length === 0 && !weekTransition && (
        <OvrLevelUpCelebration
          levelUps={ovrLevelUps}
          onDone={() => setOvrLevelUps(null)}
          isOnHoliday={isOnHoliday}
          ovrCap={ovrCap}
        />
      )}

      {/* Arc step completion modal */}
      {arcStepQueue.length > 0 && !matchResult && !cupMatchResult && !weekTransition && (
        <ArcStepModal
          notification={arcStepQueue[0]}
          onDismiss={() => {
            setArcStepQueue(prev => {
              const dismissed = prev[0];
              // When a completed arc is dismissed, clear the category so player can pick a new arc
              if (dismissed?.isComplete && dismissed?.cat) {
                setStoryArcs(p => ({...p, [dismissed.cat]: null}));
              }
              return prev.slice(1);
            });
          }}
          onViewArcs={() => {
            // Clear all completed arcs' categories before opening panel
            const completedInQueue = arcStepQueue.filter(n => n.isComplete && n.cat);
            if (completedInQueue.length > 0) {
              setStoryArcs(prev => {
                const next = {...prev};
                completedInQueue.forEach(n => { next[n.cat] = null; });
                return next;
              });
            }
            setArcStepQueue([]);
            setShowCalendar(true);
            setInitialBootRoomTab("arcs");
          }}
          isOnHoliday={isOnHoliday}
        />
      )}

      {/* Match result screen */}
      {matchResult && (
        <MatchResultScreen
          result={matchResult}
          league={league}
          initialSpeed={matchSpeed}
          onSpeedChange={setMatchSpeed}
          matchDetail={matchDetail}
          instantMatch={instantMatch}
          isOnHoliday={isOnHoliday}
          onPlayerClick={resolveAnyPlayer}
          clubRelationships={clubRelationships}
          transferFocus={transferFocus}
          onSetFocus={handleFocusSet}
          onRemoveFocus={handleFocusRemove}
          onReplaceFocus={handleFocusReplace}
          ovrCap={ovrCap}
          onDone={(wasAlwaysFast, wasAlwaysNormal) => {
           try {
           // Flush deferred league table update
           if (pendingLeagueRef.current) {
             setLeague(pendingLeagueRef.current);
             pendingLeagueRef.current = null;
           }
           // Tier 8: Track carded player team players so they skip next training
           const dojoMod = getModifier(leagueTier);
           if (dojoMod.cardSkipsTraining && matchResult?.events) {
             const playerTeamName = league.teams[0]?.name;
             const cardedNames = matchResult.events
               .filter(e => (e.type === "card" || e.type === "red_card") && e.cardTeamName === playerTeamName && e.cardPlayer)
               .map(e => e.cardPlayer);
             if (cardedNames.length > 0) {
               const cardedIds = squad.filter(p => cardedNames.includes(p.name)).map(p => p.id);
               cardedIds.forEach(id => cardedPlayerIdsRef.current.add(id));
             }
           }
           // === CRITICAL: Calendar advancement FIRST — must always run ===
           const playerIsHome = league.teams[matchResult.home]?.isPlayer;
           const playerGoals = playerIsHome ? matchResult.homeGoals : matchResult.awayGoals;
           const oppGoals = playerIsHome ? matchResult.awayGoals : matchResult.homeGoals;
           const playerWon = playerGoals > oppGoals;
           const isDraw = playerGoals === oppGoals;
           const playerLost = oppGoals > playerGoals;

           // Store result in calendar and advance index
           const calIdx = matchResult._calendarIndex != null ? matchResult._calendarIndex : useGameStore.getState().calendarIndex;
           setCalendarResults(prev => ({
             ...prev,
             [calIdx]: { playerGoals, oppGoals, won: playerWon, draw: isDraw }
           }));
           let newCalIdx = calIdx + 1;
           const cal = useGameStore.getState().seasonCalendar || [];
           while (newCalIdx < cal.length && cal[newCalIdx]?.type === "cup" && useGameStore.getState().cup?.playerEliminated) {
             if (useGameStore.getState().cup && useGameStore.getState().cup.currentRound < useGameStore.getState().cup.rounds.length) {
               const skipLookup = (name, tier) => (tier === leagueTier ? league : allLeagueStates?.[tier])?.teams?.find(t => t.name === name) || null;
               const skipCup = advanceCupRound(useGameStore.getState().cup, squad, startingXI, bench, skipLookup);
               let finCup = skipCup;
               if (finCup.pendingPlayerMatch) {
                 const pm2 = finCup.pendingPlayerMatch;
                 const w2 = pm2.away;
                 const nr2 = finCup.rounds.map((r, rIdx) => {
                   if (rIdx !== finCup.currentRound) return r;
                   return { ...r, matches: r.matches.map(m =>
                     m.home?.name === pm2.home?.name && m.away?.name === pm2.away?.name
                       ? { ...m, result: { homeGoals: 0, awayGoals: 1, winner: w2 } }
                       : m
                   )};
                 });
                 finCup = { ...finCup, rounds: nr2, pendingPlayerMatch: null };
                finCup = buildNextCupRound(finCup); // Only needed here — advanceCupRound returned early
               }
               setCup(finCup);
             }
             newCalIdx++;
           }
           setCalendarIndex(newCalIdx);

           // Season end check (dynasty entries are pre-built in calendar, no extension needed)
           if (newCalIdx >= cal.length) {
             const currentTier = league.tier || leagueTier;
             const currentRosters = leagueRosters || initLeagueRosters();
             const swapResult = processSeasonSwaps(currentRosters, league, currentTier, allLeagueStates);
             const position = swapResult.playerPosition;
             let newTier = swapResult.playerNewTier;
             // Safety: promote if eligible — tournament tiers use tournament results
             const _mod = getModifier(currentTier);
             const _mBkt = useGameStore.getState().miniTournamentBracket;
             if (_mod.miniTournament && currentTier > 1 && _mBkt) {
               const _dRU = _mBkt.runnerUp || (_mBkt.winner && _mBkt.final?.home && _mBkt.final?.away ? (_mBkt.winner.name === _mBkt.final.home.name ? _mBkt.final.away : _mBkt.final.home) : null);
               const _promoted = _mBkt.winner?.isPlayer || _dRU?.isPlayer || (_mBkt.thirdPlaceWinner || _mBkt.thirdPlace?.winner)?.isPlayer;
               if (_promoted && newTier >= currentTier) newTier = currentTier - 1;
             } else {
               if (position <= 3 && currentTier > 1 && newTier >= currentTier) newTier = currentTier - 1;
             }
             // HARD SAFETY: never jump more than 1 tier in either direction
             if (newTier < currentTier - 1) newTier = currentTier - 1;
             if (newTier > currentTier + 1) newTier = currentTier + 1;
             newTier = Math.max(1, Math.min(NUM_TIERS, newTier));
             const moveType = newTier < currentTier ? "promoted" : newTier > currentTier ? "relegated" : "stayed";
             if (position === 1) setLeagueWins(prev => prev + 1);
             if (position === 2) setSecondPlaceFinishes(prev => prev + 1);
             setLeagueRosters(swapResult.rosters);
             const newSeasonUnlocks = collectSeasonEndAchievements({
               position, currentTier, moveType, newTier, lastSeasonMove, league, leagueResults,
               playerSeasonStats, beatenTeams, unlockedAchievements, clubHistory,
               wonCupThisSeason: unlockedAchievements.has("cup_winner"),
               squad: useGameStore.getState().squad, prevSeasonSquadIds, seasonNumber,
               dynastyCupBracket: useGameStore.getState().dynastyCupBracket, cup: useGameStore.getState().cup,
             }, BGM.getCurrentTrackId());
             if (newSeasonUnlocks.length > 0) {
               setUnlockedAchievements(prev => { const next = new Set(prev); newSeasonUnlocks.forEach(id => next.add(id)); return next; });
               setAchievementQueue(prev => { const ex = new Set(prev); const f = newSeasonUnlocks.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
               const seasonUnlockPlayers = newSeasonUnlocks
                 .map(achId => UNLOCKABLE_PLAYERS.find(u => u.achievementId === achId))
                 .filter(u => u && u.attrs);
               if (seasonUnlockPlayers.length > 0) {
                 setPendingPlayerUnlock(prev => prev ? [].concat(prev).concat(seasonUnlockPlayers) : seasonUnlockPlayers);
               }
             }
             setLastSeasonMove(moveType);
             // Season-end sentiment swings
             if (moveType === "promoted") { setFanSentiment(Math.min(100, useGameStore.getState().fanSentiment + 20)); setBoardSentiment(Math.min(100, useGameStore.getState().boardSentiment + 25)); }
             if (moveType === "relegated") { setFanSentiment(Math.max(0, useGameStore.getState().fanSentiment - 20)); setBoardSentiment(Math.max(0, useGameStore.getState().boardSentiment - 25)); }
             if (position === 1) { setFanSentiment(Math.min(100, useGameStore.getState().fanSentiment + 10)); setBoardSentiment(Math.min(100, useGameStore.getState().boardSentiment + 10)); }
             setSummerData({ moveType, fromTier: currentTier, toTier: newTier, position, leagueName: league.leagueName || LEAGUE_DEFS[currentTier].name, newLeagueName: LEAGUE_DEFS[newTier].name, newRosters: swapResult.rosters, isInvincible: position === 1 && playerRow?.lost === 0 });
             setSummerPhase("summary");

             // === STORY ARC SEASON-END TRACKING ===
             {
               const cupWon3 = cup && !cup.playerEliminated && (() => {
                 const rKeys = Object.keys(cup.rounds || {}).map(Number).sort((a,b)=>a-b);
                 if (rKeys.length === 0) return false;
                 const finalRound = cup.rounds[rKeys[rKeys.length-1]];
                 return finalRound?.matches?.some(m => m.result?.winner?.isPlayer);
               })();
               setStoryArcs(prev => resolveSeasonEndArcs(prev, position, cupWon3));
             }
           }

           // === Achievements — run FIRST in isolated block ===
           let stScored = false;
           try {
            const oppTeam = playerIsHome ? league.teams[matchResult.away] : league.teams[matchResult.home];
            const isHome = playerIsHome;
            const playerSide = playerIsHome ? "home" : "away";
            const starters = startingXI.map(id => squad.find(p => p.id === id)).filter(Boolean);
            const strikers = starters.filter(p => p.position === "ST");
            if (matchResult.scorers) {
              for (const st of strikers) {
                const key = `${playerSide}|${st.name}`;
                if (matchResult.scorers[key] && matchResult.scorers[key] > 0) { stScored = true; break; }
              }
            }

            const totalFixtures = league.fixtures?.length || 18;
            const halfwayMark = Math.floor(totalFixtures / 2);
            const completedMDs = (matchResult._playedMatchweekIndex ?? (matchweekIndex - 1)) + 1;
            const leagueMod = getModifier(leagueTier);
            if (completedMDs === halfwayMark) {
              const sorted = sortStandings(league.table);
              const pos = sorted.findIndex(r => league.teams[r.teamIndex]?.isPlayer) + 1;
              setHalfwayPosition(pos);
              // Saudi Super League: mid-season poach event
              if (leagueMod.poachEvent) {
                const p1 = generateFreeAgent(leagueTier, ovrCap);
                const p2 = generateFreeAgent(leagueTier, ovrCap);
                const p3 = generateFreeAgent(leagueTier, ovrCap);
                setInboxMessages(prev => [...prev, {
                  id: `msg_poach_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                  icon: "🕌", title: "Mid-Season Poach Event",
                  body: `Three players have emerged on the Saudi market. Pick one to sign — the other two will be snapped up by ${sorted[1] ? league.teams[sorted[1].teamIndex]?.name : "a rival"}.\n\n` +
                    `A) ${p1.name} — ${p1.position}, Age ${p1.age}, OVR ${getOverall(p1)}\n` +
                    `B) ${p2.name} — ${p2.position}, Age ${p2.age}, OVR ${getOverall(p2)}\n` +
                    `C) ${p3.name} — ${p3.position}, Age ${p3.age}, OVR ${getOverall(p3)}`,
                  color: "#d4a017", read: false,
                  type: "poach_event",
                  poachPlayers: [p1, p2, p3],
                  poachRivalIdx: sorted[1]?.teamIndex ?? 1,
                  choices: [
                    { label: `Sign ${p1.name}`, value: "0" },
                    { label: `Sign ${p2.name}`, value: "1" },
                    { label: `Sign ${p3.name}`, value: "2" },
                  ],
                }]);
              }
            }

            // Euro Dynasty: set up Dynasty Cup bracket after final league MD
            if (leagueMod.knockoutAtEnd && completedMDs === totalFixtures) {
              const sorted = sortStandings(league.table);
              const top4 = sorted.slice(0, 4).map(r => ({ teamIndex: r.teamIndex, name: league.teams[r.teamIndex]?.name }));
              setDynastyCupQualifiers(top4);
              const playerInTop4 = top4.some(t => league.teams[t.teamIndex]?.isPlayer);
              if (playerInTop4) {
                const sf1Home = league.teams[top4[0].teamIndex];
                const sf1Away = league.teams[top4[3].teamIndex];
                const sf2Home = league.teams[top4[1].teamIndex];
                const sf2Away = league.teams[top4[2].teamIndex];
                const playerInSF1 = sf1Home.isPlayer || sf1Away.isPlayer;
                setDynastyCupBracket({
                  sf1: { home: sf1Home, away: sf1Away, result: null },
                  sf2: { home: sf2Home, away: sf2Away, result: null },
                  final: { home: null, away: null, result: null },
                  playerSF: playerInSF1 ? 1 : 2,
                  playerEliminated: false,
                  winner: null,
                });
              }
              setInboxMessages(prev => [...prev, {
                id: `msg_dynasty_cup_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                icon: "🌍", title: "Dynasty Cup Draw",
                body: `The league season is over. The top 4 enter the Dynasty Cup knockout!\n\n` +
                  `SF: ${top4[0]?.name || "TBD"} vs ${top4[3]?.name || "TBD"}\n` +
                  `SF: ${top4[1]?.name || "TBD"} vs ${top4[2]?.name || "TBD"}\n\n` +
                  (playerInTop4 ? `You're in! The knockout begins now.` : `You didn't make the cut this time.`),
                color: LEAGUE_DEFS[leagueTier]?.color || C.green, read: false,
              }]);
            }

            // World XI: set up mini-tournament bracket after final league MD
            if (leagueMod.miniTournament && completedMDs === totalFixtures) {
              const sorted = sortStandings(league.table);
              const top4 = sorted.slice(0, 4).map(r => ({ teamIndex: r.teamIndex, name: league.teams[r.teamIndex]?.name }));
              const playerInTop4 = top4.some(t => league.teams[t.teamIndex]?.isPlayer);
              if (playerInTop4) {
                const sf1Home = league.teams[top4[0].teamIndex];
                const sf1Away = league.teams[top4[3].teamIndex];
                const sf2Home = league.teams[top4[1].teamIndex];
                const sf2Away = league.teams[top4[2].teamIndex];
                const playerInSF1 = sf1Home.isPlayer || sf1Away.isPlayer;
                setMiniTournamentBracket({
                  sf1: { home: sf1Home, away: sf1Away, leg1: null, leg2: null, winner: null },
                  sf2: { home: sf2Home, away: sf2Away, leg1: null, leg2: null, winner: null },
                  final: { home: null, away: null, result: null },
                  playerSF: playerInSF1 ? 1 : 2,
                  playerEliminated: false,
                  winner: null,
                  fiveASide: true,
                });
              }
              setInboxMessages(prev => [...prev, {
                id: `msg_mini_tournament_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                icon: "🌐", title: "5v5 Mini-Tournament Draw",
                body: `The league season is over. The top 4 enter the 5v5 Mini-Tournament!\n\n` +
                  `SF: ${top4[0]?.name || "TBD"} vs ${top4[3]?.name || "TBD"} (2 legs)\n` +
                  `SF: ${top4[1]?.name || "TBD"} vs ${top4[2]?.name || "TBD"} (2 legs)\n\n` +
                  (playerInTop4 ? `You're in! Pick your five wisely.` : `You didn't qualify for the knockout.`),
                color: LEAGUE_DEFS[leagueTier]?.color || C.gold, read: false,
              }]);
            }

            const newUnlocks = checkAchievements({
              squad: useGameStore.getState().squad, unlocked: unlockedAchievements,
              lastMatchResult: matchResult, league, weekGains: null,
              startingXI, bench, matchweekIndex: completedMDs, seasonCards,
              totalGains, totalMatches: totalMatches + 1,
              seasonCleanSheets: seasonCleanSheets + (oppGoals === 0 ? 1 : 0),
              seasonGoalsFor: seasonGoalsFor + playerGoals,
              seasonDraws: seasonDraws + (isDraw ? 1 : 0),
              consecutiveUnbeaten: playerLost ? 0 : consecutiveUnbeaten + 1,
              consecutiveLosses: playerLost ? consecutiveLosses + 1 : 0,
              consecutiveDraws: isDraw ? consecutiveDraws + 1 : 0,
              consecutiveWins: playerWon ? consecutiveWins + 1 : 0,
              prevStartingXI, motmTracker, stScoredConsecutive: stScored ? stScoredConsecutive + 1 : 0,
              playerRatingTracker, beatenTeams,
              halfwayPosition: completedMDs === Math.floor((league.fixtures?.length || 18) / 2) ? null : halfwayPosition,
              seasonHomeUnbeaten: (isHome && playerLost) ? false : seasonHomeUnbeaten,
              seasonAwayWins: (!isHome && playerWon) ? seasonAwayWins + 1 : seasonAwayWins,
              seasonAwayGames: !isHome ? seasonAwayGames + 1 : seasonAwayGames,
              leagueWins, wasAlwaysFast,
              recoveries: weekRecoveriesRef.current || [],
              recentScorelines: [...recentScorelines.slice(-2), [playerGoals, oppGoals]],
              secondPlaceFinishes,
              playerInjuryCount,
              benchStreaks,
              highScoringMatches: highScoringMatches + ((playerGoals + oppGoals >= 5) ? 1 : 0),
              trialHistory,
              playerSeasonStats, clubHistory, consecutiveScoreless: playerGoals === 0 ? consecutiveScoreless + 1 : 0,
              formation,
              slotAssignments,
              usedTicketTypes, formationsWonWith: playerWon ? new Set([...formationsWonWith, formation.map(s => s.pos).join("-")]) : formationsWonWith,
              freeAgentSignings, scoutedPlayers, transferFocus, clubRelationships,
              isOnHoliday, holidayMatchesThisSeason,
              testimonialPlayer: useGameStore.getState().testimonialPlayer,
              seasonNumber, lastSeasonPosition: clubHistory?.seasonArchive?.length > 0 ? clubHistory.seasonArchive[clubHistory.seasonArchive.length - 1].position : null,
              shortlist, wasAlwaysNormal: !!wasAlwaysNormal,
              fastMatchesThisSeason: fastMatchesThisSeason + (wasAlwaysFast ? 1 : 0),
              twelfthManActive, gkCleanSheets: oppGoals === 0 ? (() => {
                const gk = useGameStore.getState().squad?.find(p => startingXI.includes(p.id) && p.position === "GK");
                return gk ? { ...gkCleanSheets, [gk.name]: (gkCleanSheets[gk.name] || 0) + 1 } : gkCleanSheets;
              })() : gkCleanSheets,
              totalShortlisted,
            });
            if (newUnlocks.length > 0) {
              setUnlockedAchievements(prev => { const next = new Set(prev); newUnlocks.forEach(id => next.add(id)); return next; });
              setAchievementQueue(prev => { const ex = new Set(prev); const f = newUnlocks.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
              const unlockPlayers = newUnlocks
                .map(achId => UNLOCKABLE_PLAYERS.find(u => u.achievementId === achId))
                .filter(u => u && u.attrs);
              if (unlockPlayers.length > 0) {
                setPendingPlayerUnlock(prev => prev ? [].concat(prev).concat(unlockPlayers) : unlockPlayers);
              }
            }
           } catch(err) {
             console.error("Achievement check error:", err, err.stack);
           }

           // Euro Dynasty: televised match — MotM gets +1 random ATTR
           const tvMod = getModifier(leagueTier);
           if (tvMod.televisedChance && Math.random() < tvMod.televisedChance && matchResult.motmName) {
             const motmPlayer = useGameStore.getState().squad?.find(p => p.name === matchResult.motmName);
             if (motmPlayer) {
               const boostable = ATTRIBUTES.filter(a => motmPlayer.attrs[a.key] < ovrCap);
               if (boostable.length > 0) {
                 const pick = boostable[rand(0, boostable.length - 1)];
                 setSquad(prev => prev.map(p => p.id === motmPlayer.id ? { ...p, attrs: { ...p.attrs, [pick.key]: p.attrs[pick.key] + 1 } } : p));
                 setInboxMessages(prev => [...prev, {
                   id: `msg_tv_motm_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                   icon: "📺", title: "Televised Match Boost",
                   body: `That match was televised! ${motmPlayer.name}'s Man of the Match performance earned a permanent +1 ${pick.label}.`,
                   color: LEAGUE_DEFS[leagueTier]?.color || C.green, read: false,
                 }]);
               }
             }
           }

           // === Stats tracking — separate try/catch ===
           try {
            const playerTeam = league.teams.find(t => t.isPlayer);
            const oppTeam = playerIsHome ? league.teams[matchResult.away] : league.teams[matchResult.home];
            const isHome = playerIsHome;

            if (matchResult.events) {
              const playerCards = matchResult.events.filter(evt => (evt.type === "card" || evt.type === "red_card") && evt.cardTeamName === playerTeam?.name).length;
              if (playerCards > 0) setSeasonCards(prev => prev + playerCards);
            }

            setTotalMatches(prev => prev + 1);
            setSeasonGoalsFor(prev => prev + playerGoals);
            if (oppGoals === 0) setSeasonCleanSheets(prev => prev + 1);
            if (isDraw) setSeasonDraws(prev => prev + 1);
            if (isHome && playerLost) setSeasonHomeUnbeaten(false);
            // Fan & Board Sentiment (league match)
            const fanMatchMod = getModifier(leagueTier);
            const fanMatchDelta = ((playerWon ? (isHome ? 5 : 6) : isDraw ? -1 : (isHome ? -8 : -5)) +
              (playerGoals >= 3 ? 2 : 0) + (oppGoals === 0 ? 1 : 0)) * (fanMatchMod.fanSentimentMult || 1);
            setFanSentiment(Math.max(0, Math.min(100, useGameStore.getState().fanSentiment + fanMatchDelta)));
            const boardDeltaMatch = playerWon ? 3 : isDraw ? 0 : -4;
            const scrutinyMod = fanMatchMod;
            const boardChange = boardDeltaMatch < 0 ? boardDeltaMatch * (scrutinyMod.boardScrutinyMult || 1) : boardDeltaMatch;
            setBoardSentiment(Math.max(0, Math.min(100, useGameStore.getState().boardSentiment + boardChange)));
            // Intergalactic Elite: AI prediction check — correct prediction steals 3 pts
            if (aiPredictionRef.current && fanMatchMod.prediction) {
              const pred = aiPredictionRef.current;
              const predCorrect = pred.home === matchResult.homeGoals && pred.away === matchResult.awayGoals;
              if (predCorrect) {
                // AI prediction correct — override: opponent gets 3 pts, player gets 0 regardless of result
                const leagueNow = pendingLeagueRef.current || useGameStore.getState().league;
                if (leagueNow) {
                  const oppIdx = playerIsHome ? matchResult.away : matchResult.home;
                  const playerIdx = playerIsHome ? matchResult.home : matchResult.away;
                  const oppRow = leagueNow.table.find(r => r.teamIndex === oppIdx);
                  const playerRow = leagueNow.table.find(r => r.teamIndex === playerIdx);
                  const hg = matchResult.homeGoals, ag = matchResult.awayGoals;
                  let normalPlayerPts, normalOppPts;
                  if (hg === ag) {
                    normalPlayerPts = fanMatchMod.drawPointsPlayer ?? 1;
                    normalOppPts = fanMatchMod.drawPointsAI ?? 1;
                  } else {
                    const playerWonMatch = playerIsHome ? hg > ag : ag > hg;
                    normalPlayerPts = playerWonMatch ? 3 : 0;
                    normalOppPts = playerWonMatch ? 0 : 3;
                  }
                  if (oppRow) oppRow.points += (3 - normalOppPts);
                  if (playerRow) playerRow.points -= normalPlayerPts;
                  if (pendingLeagueRef.current) pendingLeagueRef.current = leagueNow;
                  else setLeague({ ...leagueNow, table: leagueNow.table.map(r => ({ ...r })) });
                }
                setInboxMessages(prev => [...prev, {
                  id: `msg_pred_correct_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                  icon: "🛸", title: "AI Prediction Correct!",
                  body: `The AI predicted ${pred.home}-${pred.away} and was right! The opposition steals the full 3 points from this fixture.`,
                  color: "#a78bfa", read: false,
                }]);
              } else {
                const _predBody = playerLost
                  ? `The AI predicted ${pred.home}-${pred.away} but the result was ${matchResult.homeGoals}-${matchResult.awayGoals}. They got the 3 points the old-fashioned way.`
                  : `The AI predicted ${pred.home}-${pred.away} but the result was ${matchResult.homeGoals}-${matchResult.awayGoals}. No points stolen.`;
                setInboxMessages(prev => [...prev, {
                  id: `msg_pred_wrong_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                  icon: "🛸", title: "AI Prediction Wrong",
                  body: _predBody,
                  color: "#6b7280", read: false,
                }]);
              }
              aiPredictionRef.current = null;
            }
            // Ultimatum tracking (Ironman)
            if (useGameStore.getState().ultimatumActive) {
              updateUltimatumProgress(playerWon, isDraw, useGameStore.getState().cup?.playerEliminated ?? true);
            }
            if (!isHome && playerWon) setSeasonAwayWins(prev => prev + 1);
            if (!isHome) setSeasonAwayGames(prev => prev + 1);
            if (playerWon && oppTeam) setBeatenTeams(prev => new Set([...prev, oppTeam.name]));

            if (playerLost) { setConsecutiveLosses(prev => prev + 1); setConsecutiveUnbeaten(0); setConsecutiveDraws(0); setConsecutiveWins(0); }
            else { setConsecutiveUnbeaten(prev => prev + 1); setConsecutiveLosses(0); }
            if (isDraw) { setConsecutiveDraws(prev => prev + 1); setConsecutiveWins(0); } else setConsecutiveDraws(0);
            if (playerWon) setConsecutiveWins(prev => prev + 1); else setConsecutiveWins(0);
            if (playerGoals === 0) setConsecutiveScoreless(prev => prev + 1); else setConsecutiveScoreless(0);

            // Track formations won with for Formation Roulette achievement
            if (playerWon && formation) {
              const formKey = formation.map(s => s.pos).join("-");
              setFormationsWonWith(prev => new Set([...prev, formKey]));
            }

            setRecentScorelines(prev => [...prev.slice(-2), [playerGoals, oppGoals]]);
            if (playerGoals + oppGoals >= 5) setHighScoringMatches(prev => prev + 1);

            // Track GK clean sheets (for Cat-Like Reflexes achievement)
            if (oppGoals === 0 && startingXI && useGameStore.getState().squad) {
              const gk = useGameStore.getState().squad.find(p => startingXI.includes(p.id) && p.position === "GK");
              if (gk) setGkCleanSheets(prev => ({ ...prev, [gk.name]: (prev[gk.name] || 0) + 1 }));
            }

            // Track fast matches (for Speed Demon achievement)
            if (wasAlwaysFast) setFastMatchesThisSeason(prev => prev + 1);

            setBenchStreaks(prev => {
              const next = {};
              if (bench) { bench.forEach(id => { next[id] = (prev[id] || 0) + 1; }); }
              return next;
            });

            const newConsWins = playerWon ? consecutiveWins + 1 : 0;
            const newConsUnbeaten = playerLost ? 0 : consecutiveUnbeaten + 1;
            const newConsLosses = playerLost ? consecutiveLosses + 1 : 0;
            const goalDiff = playerGoals - oppGoals;
            setClubHistory(prev => {
              const h = { ...prev };
              h.totalWins = (h.totalWins || 0) + (playerWon ? 1 : 0);
              h.totalDraws = (h.totalDraws || 0) + (isDraw ? 1 : 0);
              h.totalLosses = (h.totalLosses || 0) + (playerLost ? 1 : 0);
              h.totalGoalsFor = (h.totalGoalsFor || 0) + playerGoals;
              h.totalGoalsConceded = (h.totalGoalsConceded || 0) + oppGoals;
              if (newConsWins > (h.bestWinStreak || 0)) h.bestWinStreak = newConsWins;
              if (newConsUnbeaten > (h.bestUnbeatenRun || 0)) h.bestUnbeatenRun = newConsUnbeaten;
              if (newConsLosses > (h.worstLossStreak || 0)) h.worstLossStreak = newConsLosses;
              const scoreStr = `${playerGoals}-${oppGoals}`;
              if (goalDiff > 0 && (!h.biggestWin || goalDiff > h.biggestWin.diff)) h.biggestWin = { score: scoreStr, opponent: oppTeam?.name || "?", season: seasonNumber, diff: goalDiff };
              if (goalDiff < 0 && (!h.worstDefeat || goalDiff < h.worstDefeat.diff)) h.worstDefeat = { score: scoreStr, opponent: oppTeam?.name || "?", season: seasonNumber, diff: goalDiff };
              return h;
            });

            setStScoredConsecutive(prev => stScored ? prev + 1 : 0);

            if (matchResult.motmName) setMotmTracker(prev => ({ ...prev, [matchResult.motmName]: (prev[matchResult.motmName] || 0) + 1 }));

            if (matchResult.playerRatings) {
              setPlayerRatingTracker(prev => {
                const next = { ...prev };
                matchResult.playerRatings.forEach(pr => { if (pr.rating !== null) { if (!next[pr.name]) next[pr.name] = []; next[pr.name] = [...next[pr.name], pr.rating]; } });
                return next;
              });
            }

            setPlayerSeasonStats(prev => {
              const next = { ...prev };
              const side = playerIsHome ? "home" : "away";
              startingXI.forEach(id => {
                const p = squad.find(pl => pl.id === id);
                if (p) {
                  if (!next[p.name]) next[p.name] = { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0 };
                  next[p.name].apps++;
                  if (p.position) next[p.name].position = p.position;
                  if (p.nationality) next[p.name].nationality = p.nationality;
                }
              });
              if (matchResult.scorers) {
                for (const [key, count] of Object.entries(matchResult.scorers)) {
                  const [scorerSide, name] = key.split("|");
                  if (scorerSide === side) { if (!next[name]) next[name] = { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0 }; next[name].goals += count; }
                }
              }
              if (matchResult.assisters) {
                for (const [key, count] of Object.entries(matchResult.assisters)) {
                  const [assisterSide, name] = key.split("|");
                  if (assisterSide === side) { if (!next[name]) next[name] = { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0 }; next[name].assists = (next[name].assists || 0) + count; }
                }
              }
              if (matchResult.events) {
                const ptName = playerIsHome ? league.teams[matchResult.home]?.name : league.teams[matchResult.away]?.name;
                matchResult.events.forEach(evt => {
                  if ((evt.type === "card" || evt.type === "red_card") && evt.cardTeamName === ptName && evt.cardPlayer) {
                    if (!next[evt.cardPlayer]) next[evt.cardPlayer] = { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0 };
                    if (evt.type === "red_card") next[evt.cardPlayer].reds++; else next[evt.cardPlayer].yellows++;
                  }
                });
              }
              if (matchResult.motmName) { if (!next[matchResult.motmName]) next[matchResult.motmName] = { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0 }; next[matchResult.motmName].motm++; }
              return next;
            });

            // Track appearances on player objects for training potential bonus
            setSquad(prev => prev.map(p => {
              if (startingXI.includes(p.id)) {
                return { ...p, seasonStarts: (p.seasonStarts || 0) + 1, ...(p.isLegend ? { legendAppearances: Math.min(12, (p.legendAppearances || 0) + 1) } : {}) };
              }
              const subEntry = matchResult.playerRatings?.find(
                pr => pr.name === p.name && pr.isSub && pr.minutesPlayed > 0
              );
              if (subEntry) {
                return { ...p, seasonSubApps: (p.seasonSubApps || 0) + 1, ...(p.isLegend ? { legendAppearances: Math.min(12, (p.legendAppearances || 0) + 1) } : {}) };
              }
              return p;
            }));

            setPrevStartingXI([...startingXI]);

            // === CAREER MILESTONE ACHIEVEMENTS ===
            try {
              const careers = clubHistory?.playerCareers || {};
              // Helper: compute total career stat for a player
              const getCareerTotal = (name, stat) => {
                const archived = careers[name]?.[stat] || 0;
                const season = playerSeasonStats[name]?.[stat] || 0;
                // Add this match's contribution (already in playerSeasonStats by now? No — setPlayerSeasonStats is async)
                // Use matchResult to compute this match's contribution
                let thisMatch = 0;
                if (stat === "apps" && startingXI.some(id => { const p = squad.find(pl => pl.id === id); return p?.name === name; })) thisMatch = 1;
                if (stat === "goals" && matchResult.scorers) {
                  const side = playerIsHome ? "home" : "away";
                  const key = `${side}|${name}`;
                  thisMatch = matchResult.scorers[key] || 0;
                }
                if (stat === "motm" && matchResult.motmName === name) thisMatch = 1;
                return archived + season + thisMatch;
              };

              const milestoneChecks = [
                { id: "true_strike", stat: "goals", threshold: 50, check: p => !p.isUnlockable },
                { id: "purist", stat: "apps", threshold: 100, check: p => !p.isUnlockable },
                { id: "our_man", stat: "motm", threshold: 30, check: p => !p.isUnlockable },
                { id: "on_your_head_son", stat: "goals", threshold: 100, check: p => p.isYouthIntake },
                { id: "one_club_man", stat: "apps", threshold: 200, check: p => p.isYouthIntake },
                { id: "fan_favourite", stat: "motm", threshold: 60, check: p => p.isYouthIntake },
              ];

              for (const ms of milestoneChecks) {
                if (unlockedAchievements.has(ms.id) || careerMilestones[ms.id]) continue;
                // Check all squad members
                for (const p of squad) {
                  const total = getCareerTotal(p.name, ms.stat);
                  if (total >= ms.threshold) {
                    // First player to reach this milestone
                    setCareerMilestones(prev => ({ ...prev, [ms.id]: p.name }));
                    if (ms.check(p)) {
                      setUnlockedAchievements(prev => { const n = new Set(prev); n.add(ms.id); return n; });
                      setAchievementQueue(prev => [...prev, ms.id]);
                    }
                    break; // Only check until first player crosses
                  }
                }
              }
            } catch(err) {
              console.error("Career milestone error:", err);
            }
           } catch(err) {
             console.error("Stats tracking error:", err, err.stack);
           }

           // === STORY ARC MATCH TRACKING ===
           try {
             // Pre-compute prodigal phase preview so arc condition check sees the correct phase
             // (the prodigal tracking block runs AFTER setStoryArcs, so prodigalSon is stale there)
             let prodigalSonPreview = prodigalSon;
             if (prodigalSon && prodigalSon.phase === "active") {
               const _wasInXI = startingXI.includes(prodigalSon.playerId);
               const _oppTeamObj = playerIsHome ? league.teams[matchResult.away] : league.teams[matchResult.home];
               const _oppName = _oppTeamObj?.name || "";
               const _playerSide = playerIsHome ? "home" : "away";
               const _prodigalPlayer = squad.find(p => p.id === prodigalSon.playerId);
               let _scored = false;
               if (matchResult.scorers && _prodigalPlayer) {
                 const _key = `${_playerSide}|${_prodigalPlayer.name}`;
                 if (matchResult.scorers[_key] > 0) _scored = true;
               }
               const _ps = { ...prodigalSon };
               if (_wasInXI) _ps.starts = (_ps.starts || 0) + 1;
               if (_scored) _ps.goals = (_ps.goals || 0) + 1;
               if (_oppName === _ps.formerClub && playerWon && _wasInXI) _ps.wonVsFormer = true;
               // Fallback: former club no longer in this league — next goal triggers narrative resolution
               if (!_ps.wonVsFormer && _scored && _ps.starts >= 10 && _ps.goals >= 3) {
                 const _formerInLeague = league?.teams?.some(t => !t.isPlayer && t.name === _ps.formerClub);
                 if (!_formerInLeague) _ps.wonVsFormer = true;
               }
               if (_ps.starts >= 10 && _ps.goals >= 3 && _ps.wonVsFormer) _ps.phase = "redeemed";
               prodigalSonPreview = _ps;
             }

             setStoryArcs(prev => {
               const next = {...prev};
               let changed = false;
               ARC_CATS.forEach(cat => {
                 const cs = next[cat];
                 if (!cs || cs.completed) return;
                 const t = {...(cs.tracking || {})};
                 const tid = t.targetId;
                 const arc = getArcById(cs.arcId);
                 if (!arc) return;

                 // Target player tracking
                 if (tid) {
                   const inXI = startingXI.includes(tid);
                   if (inXI) { t.starts = (t.starts||0) + 1; t.apps = (t.apps||0) + 1; changed = true; }
                   if (playerWon && inXI) { t.winsWithTarget = (t.winsWithTarget||0) + 1; changed = true; }
                   if (matchResult.motmName) {
                     const tp = squad.find(p => p.id === tid);
                     if (tp && tp.name === matchResult.motmName) { t.motmCount = (t.motmCount||0) + 1; changed = true; }
                   }
                 }

                 // Home tracking (fortress, etc.)
                 if (playerIsHome) {
                   if (playerWon) { t.homeWinStreak = (t.homeWinStreak||0) + 1; changed = true; }
                   else { t.homeWinStreak = 0; changed = true; }
                   if (oppGoals === 0 && (playerWon || isDraw)) { t.homeCleanSheets = (t.homeCleanSheets||0) + 1; changed = true; }
                   if (playerLost) { t.homeLost = true; changed = true; }
                 }

                 // Beat above / leaders
                 if (playerWon && league?.table) {
                   const sorted = [...league.table].sort((a,b) => b.points-a.points || (b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst));
                   const playerPos = sorted.findIndex(r => league.teams[r.teamIndex]?.isPlayer) + 1;
                   const oppIdx = playerIsHome ? matchResult.away : matchResult.home;
                   const oppPos = sorted.findIndex(r => r.teamIndex === oppIdx) + 1;
                   if (oppPos < playerPos && oppPos > 0) { t.beatAbove = true; changed = true; }
                   if (oppPos === 1) { t.beatLeaders = true; changed = true; }
                 }

                 // Trial win
                 if (playerWon && trialPlayer && startingXI.includes(trialPlayer.id)) {
                   t.trialWin = true; changed = true;
                 }

                 next[cat] = {...cs, tracking: t};
               });

               // Also check conditions after tracking update
               // Use prodigalSonPreview (computed above) so phase transitions this match are visible
               const gs = { squad, league, prodigalSon: prodigalSonPreview, trialPlayer, trialHistory, leagueTier,
                            consecutiveWins: playerWon ? consecutiveWins+1 : 0, halfwayPosition, cup };
               ARC_CATS.forEach(cat => {
                 const cs = next[cat];
                 if (!cs || cs.completed) return;
                 const arc = getArcById(cs.arcId);
                 if (!arc) return;
                 let step = arc.steps[cs.step];
                 // Auto-advance through completed condition steps
                 while (step && step.t === "cond" && checkArcCond(step, cs.tracking, gs)) {
                   const completedStepIdx = next[cat].step;
                   const completedStepDesc = step.desc; // capture before step is reassigned
                   const narr = getStepNarrative(arc.id, completedStepIdx, cs.tracking, squad);
                   next[cat] = {...next[cat], step: next[cat].step + 1};
                   changed = true;
                   if (next[cat].step >= arc.steps.length) {
                     // Arc complete! pendingFinalRewardRef is set on next advanceWeek via precomputeArcEffects
                     const result = processArcCompletion(arc, cs, next.completed, next.bonuses, { unlockedAchievements, seasonNumber, week });
                     next.bonuses = result.bonuses;
                     next.completed = result.completed;
                     next[cat] = {...next[cat], completed: true};
                     if (result.achievements.length > 0) {
                       setUnlockedAchievements(prev => { const n = new Set(prev); result.achievements.forEach(a => n.add(a)); return n; });
                       setAchievementQueue(prev => { const ex = new Set(prev); const f = result.achievements.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
                     }
                     setInboxMessages(pm => [...pm, {
                       id: `msg_arc_${arc.id}_${Date.now()}`, week: (week||1), season: seasonNumber,
                       icon: "🏆", color: C.amber,
                       title: `Arc Complete: ${arc.name}`,
                       body: `${arc.rewardDesc}`,
                       read: false,
                     }]);
                     setArcStepQueue(q => [...q, {
                       arcId:arc.id, arcName:arc.name, arcIcon:arc.icon, cat,
                       stepIdx:completedStepIdx, stepDesc:completedStepDesc, narrative:narr,
                       isComplete:true, rewardDesc:arc.rewardDesc,
                     }]);
                     break;
                   }
                   setArcStepQueue(q => [...q, {
                     arcId:arc.id, arcName:arc.name, arcIcon:arc.icon, cat,
                     stepIdx:completedStepIdx, stepDesc:completedStepDesc, narrative:narr,
                     isComplete:false,
                   }]);
                   step = arc.steps[next[cat].step];
                 }
               });

               return changed ? next : prev;
             });
           } catch(err) { console.error("Story arc tracking error:", err); }

           // === PRODIGAL SON MATCH TRACKING ===
           try {
             if (prodigalSon && prodigalSon.phase === "active") {
               const ps = { ...prodigalSon };
               const wasInXI = startingXI.includes(ps.playerId);
               const oppTeamObj = playerIsHome ? league.teams[matchResult.away] : league.teams[matchResult.home];
               const oppName = oppTeamObj?.name || "";
               const playerSide = playerIsHome ? "home" : "away";
               let scored = false;
               if (matchResult.scorers) {
                 const prodigalPlayer = squad.find(p => p.id === ps.playerId);
                 if (prodigalPlayer) {
                   const key = `${playerSide}|${prodigalPlayer.name}`;
                   if (matchResult.scorers[key] && matchResult.scorers[key] > 0) scored = true;
                 }
               }

               if (wasInXI) {
                 ps.starts = (ps.starts || 0) + 1;
                 ps.consecutiveBenched = 0;
               } else {
                 ps.consecutiveBenched = (ps.consecutiveBenched || 0) + 1;
               }
               if (scored) ps.goals = (ps.goals || 0) + 1;
               if (oppName === ps.formerClub && playerWon && wasInXI) ps.wonVsFormer = true;
               const msgs = [];
               // First start message
               if (wasInXI && ps.starts === 1 && !ps.sentFlags.firstStart) {
                 ps.sentFlags = { ...ps.sentFlags, firstStart: true };
                 msgs.push({
                   id: `msg_prodigal_start_${Date.now()}`, week: (week || 1), season: seasonNumber,
                   icon: "📋", color: C.textMuted,
                   title: "Asst. Manager's Notes",
                   body: `${ps.playerName} looked rusty but didn't hide. The fitness will come.`,
                   read: false,
                 });
               }
               // Benched 3+ weeks warning
               if (ps.consecutiveBenched >= 3 && !ps.sentFlags.benchWarn) {
                 ps.sentFlags = { ...ps.sentFlags, benchWarn: true };
                 msgs.push({
                   id: `msg_prodigal_bench_${Date.now()}`, week: (week || 1), season: seasonNumber,
                   icon: "📋", color: C.textMuted,
                   title: "Asst. Manager's Notes",
                   body: `${ps.playerName} hasn't said a word but you can see it in him. He needs games, boss.`,
                   read: false,
                 });
               }
               // First goal message
               if (scored && !ps.sentFlags.firstGoal) {
                 ps.sentFlags = { ...ps.sentFlags, firstGoal: true };
                 msgs.push({
                   id: `msg_prodigal_goal_${Date.now()}`, week: (week || 1), season: seasonNumber,
                   icon: "⚽", color: C.gold,
                   title: `${ps.playerName} Off the Mark`,
                   body: `${ps.playerName} was emotional after that one. A long time coming.`,
                   read: false,
                 });
               }
               // Pre-match vs former club (fires when they're the next opponent)
               // Actually check post-match if we just played the former club
               if (oppName === ps.formerClub && wasInXI && !ps.sentFlags.formerClubPlayed) {
                 ps.sentFlags = { ...ps.sentFlags, formerClubPlayed: true };
                 if (playerWon) {
                   msgs.push({
                     id: `msg_prodigal_former_${Date.now()}`, week: (week || 1), season: seasonNumber,
                     icon: "🤝", color: "#f59e0b",
                     title: `${ps.playerName} vs ${ps.formerClub}`,
                     body: `${ps.playerName} didn't celebrate. Shook hands with a few of their lads after the whistle. You could tell it meant everything.`,
                     read: false,
                   });
                 } else {
                   msgs.push({
                     id: `msg_prodigal_former_${Date.now()}`, week: (week || 1), season: seasonNumber,
                     icon: "🤝", color: C.textMuted,
                     title: `${ps.playerName} vs ${ps.formerClub}`,
                     body: `Tough afternoon for ${ps.playerName} against his old lot. He'll dust himself off.`,
                     read: false,
                   });
                 }
               }

               // Narrative fallback: former club left the division — next goal after requirements met triggers resolution
               if (!ps.wonVsFormer && scored && ps.starts >= 10 && ps.goals >= 3 && !ps.sentFlags.rivalTranscended) {
                 const formerInLeague = league?.teams?.some(t => !t.isPlayer && t.name === ps.formerClub);
                 if (!formerInLeague) {
                   ps.wonVsFormer = true;
                   ps.sentFlags = { ...ps.sentFlags, rivalTranscended: true };
                   msgs.push({
                     id: `msg_prodigal_transcended_${Date.now()}`, week: (week || 1), season: seasonNumber,
                     icon: "📰", color: C.textMuted,
                     title: `${ps.formerClub} Regretting`,
                     body: `There are stories doing the rounds in the local press. Apparently ${ps.formerClub} have been watching ${ps.playerName} closely from afar. A source close to their coaching staff admitted they hadn't expected him to develop like this. He never got the chance to silence them in person — but the numbers don't lie anymore.`,
                     read: false,
                   });
                 }
               }

               // Check redemption: 10 starts + 3 goals + won vs former club
               if (ps.starts >= 10 && ps.goals >= 3 && ps.wonVsFormer && !ps.sentFlags.redeemed) {
                 ps.sentFlags = { ...ps.sentFlags, redeemed: true };
                 ps.phase = "redeemed";
                 ps.pendingBoost = true; // Deferred — boost applied next training session
                 msgs.push({
                   id: `msg_prodigal_redeemed_${Date.now()}`, week: (week || 1), season: seasonNumber,
                   icon: "🏠", color: C.green,
                   title: `${ps.playerName} — Settled In`,
                   body: `${ps.playerName} pulled me aside after training. Said this is the happiest he's been in years. Whatever you've done for him, it's working. He looks like a different player. Expect a big step up in the next session.`,
                   read: false,
                 });
                 // Achievement
                 if (!unlockedAchievements.has("prodigal_son")) {
                   setUnlockedAchievements(prev => { const n = new Set(prev); n.add("prodigal_son"); return n; });
                   setAchievementQueue(prev => [...prev, "prodigal_son"]);
                 }
               }

               if (msgs.length > 0) setInboxMessages(prev => [...prev, ...msgs]);
               setProdigalSon(ps);
             }
           } catch(err) {
             console.error("Prodigal son tracking error:", err);
           }

           // === MATCHDAY ROUNDUP INBOX MESSAGE ===
           try {
             const mwIdx = matchResult._playedMatchweekIndex ?? (matchweekIndex - 1);
             const mwResults = leagueResults[mwIdx];
             if (mwResults && mwResults.length > 0) {
               // Collect all scorer surnames to detect clashes
               const allScorers = mwResults.flatMap(r => (r.goalScorers || []).map(s => s.name)).filter(Boolean);
               const surnameCounts = {};
               allScorers.forEach(name => {
                 const surname = name.split(" ").pop();
                 surnameCounts[surname] = (surnameCounts[surname] || 0) + 1;
               });
               const shortName = (fullName) => {
                 if (!fullName) return "?";
                 const parts = fullName.split(" ");
                 const surname = parts[parts.length - 1];
                 if (parts.length <= 1) return fullName;
                 return surnameCounts[surname] > 1 ? `${parts[0][0]}.${surname}` : surname;
               };
               const formatScorers = (scorers) => {
                 return [...scorers]
                   .filter(s => s.name)
                   .sort((a, b) => a.minute - b.minute)
                   .map(s => {
                     const base = `${shortName(s.name)} ${s.minute}'`;
                     return s.assister ? `${base} (A: ${shortName(s.assister)})` : base;
                   }).join(", ");
               };
               const lines = mwResults.map(r => {
                 const hName = league.teams[r.home]?.shortName || league.teams[r.home]?.name || "Home";
                 const aName = league.teams[r.away]?.shortName || league.teams[r.away]?.name || "Away";
                 const isPlayerMatch = league.teams[r.home]?.isPlayer || league.teams[r.away]?.isPlayer;
                 const scorerList = formatScorers(r.goalScorers || []);
                 const scoreStr = `${hName} ${r.homeGoals}-${r.awayGoals} ${aName}`;
                 return isPlayerMatch ? `⚽ ${scoreStr}${scorerList ? ` (${scorerList})` : ""}` : `${scoreStr}${scorerList ? ` (${scorerList})` : ""}`;
               });
               // Build standings snippet — top 3 + player position
               const sorted = sortStandings(league.table);
               const playerPos = sorted.findIndex(r => league.teams[r.teamIndex]?.isPlayer) + 1;
               const top3 = sorted.slice(0, 3).map((r, i) => {
                 const t = league.teams[r.teamIndex];
                 return `${i + 1}. ${t?.shortName || t?.name || "?"} ${r.points}pts`;
               }).join(" · ");
               const standingsLine = playerPos <= 3 ? top3 : `${top3} · ... ${playerPos}. ${teamName} ${sorted[playerPos-1]?.points || 0}pts`;
               setInboxMessages(prev => [...prev, {
                 id: `msg_md_${mwIdx}_${Date.now()}`, week: week, season: seasonNumber,
                 icon: "📋", color: C.blue,
                 title: `Matchday ${mwIdx + 1} Results`,
                 body: `${lines.join("\n")}\n\n📊 ${standingsLine}`,
                 read: false,
               }]);
             }
           } catch(err) {
             console.error("Matchday roundup error:", err);
           }

           } catch(err) {
             console.error("Match onDone error:", err, err.stack);
           } finally {
            // Testimonial cleanup: remove temp player after any match
            const testimonialP = useGameStore.getState().testimonialPlayer;
            if (testimonialP) {
              const tid = testimonialP.id;
              setSquad(prev => prev.filter(p => p.id !== tid));
              setStartingXI(prev => prev.filter(id => id !== tid));
              setBench(prev => prev.filter(id => id !== tid));
              setInboxMessages(prev => [...prev, {
                id: `msg_testimonial_done_${Date.now()}`, week: useGameStore.getState().calendarIndex + 1, season: seasonNumber,
                icon: "🎩", title: `${testimonialP.name}: Standing Ovation`,
                body: `The crowd gave ${testimonialP.name} a standing ovation as he walked off the pitch for the final time. Eyes glistening, he applauded every corner of the ground. A fitting farewell.`,
                color: "#f472b6", read: false,
              }]);
              setTestimonialPlayer(null);
            }
            setMatchResult(null);
            setProcessing(false);
           }
          }}
        />
      )}

      {/* Tactics panel */}
      {showTactics && (
        <TacticsPanel
          formation={formation} setFormation={setFormation}
          startingXI={startingXI} setStartingXI={setStartingXI}
          squad={squad} onClose={() => setShowTactics(false)} isMobile={isMobile}
          slotAssignments={slotAssignments} setSlotAssignments={setSlotAssignments}
        />
      )}

      {/* 5v5 picker modal removed — squad page panel handles selection */}

      {/* Cup / Dynasty Cup match result */}
      {cupMatchResult && (
        <MatchResultScreen
          result={cupMatchResult}
          league={cupMatchResult.cupLeague}
          competitionLabel={cupMatchResult.isDynasty
            ? `Dynasty Cup — ${cupMatchResult.dynastyRound === "sf" ? "Semi-Final" : "Final"}`
            : cupMatchResult.isMini
            ? `5v5 Mini-Tournament — ${cupMatchResult.miniRound === "sf_leg1" ? "SF Leg 1" : cupMatchResult.miniRound === "sf_leg2" ? "SF Leg 2" : cupMatchResult.miniRound === "third_place" ? "3rd Place" : "Final"}`
            : `${cup?.cupName || "Clubman Cup"} — ${cup?.rounds[cup?.currentRound]?.name || "Cup Match"}`}
          initialSpeed={matchSpeed}
          onSpeedChange={setMatchSpeed}
          matchDetail={matchDetail}
          instantMatch={instantMatch}
          isOnHoliday={isOnHoliday}
          onPlayerClick={resolveAnyPlayer}
          clubRelationships={clubRelationships}
          transferFocus={transferFocus}
          onSetFocus={handleFocusSet}
          onRemoveFocus={handleFocusRemove}
          onReplaceFocus={handleFocusReplace}
          ovrCap={ovrCap}
          onDone={(cupWasAlwaysFast, cupWasAlwaysNormal) => {
            // === DYNASTY CUP MATCH RESULT ===
            if (cupMatchResult.isDynasty) {
              const round = cupMatchResult.dynastyRound;
              let hg = cupMatchResult.homeGoals;
              let ag = cupMatchResult.awayGoals;
              let penResult = cupMatchResult.penalties || null;
              const winner = penResult
                ? (penResult.winner === "home" ? cupMatchResult.cupHome : cupMatchResult.cupAway)
                : (hg > ag ? cupMatchResult.cupHome : hg < ag ? cupMatchResult.cupAway : cupMatchResult.cupHome); // shouldn't be draw without pens
              const playerWon = winner.isPlayer;

              if (round === "sf") {
                // Record player's SF result and auto-sim the other SF
                const bracket = useGameStore.getState().dynastyCupBracket;
                const otherSF = bracket.playerSF === 1 ? bracket.sf2 : bracket.sf1;
                const mod = getModifier(leagueTier);
                const otherResult = simulateMatch(otherSF.home, otherSF.away, null, null, true, 1, 0, null, 0, mod);
                let otherWinner = otherResult.homeGoals > otherResult.awayGoals ? otherSF.home
                  : otherResult.awayGoals > otherResult.homeGoals ? otherSF.away : null;
                if (!otherWinner) {
                  const otherPens = generatePenaltyShootout(otherSF.home, otherSF.away, otherResult.events, null, null, mod);
                  otherWinner = otherPens.winner;
                }
                // Update bracket
                const playerSFKey = bracket.playerSF === 1 ? "sf1" : "sf2";
                const otherSFKey = bracket.playerSF === 1 ? "sf2" : "sf1";
                const finalHome = bracket.playerSF === 1
                  ? (playerWon ? winner : (hg > ag ? cupMatchResult.cupHome : cupMatchResult.cupAway))
                  : otherWinner;
                const finalAway = bracket.playerSF === 1 ? otherWinner
                  : (playerWon ? winner : (hg > ag ? cupMatchResult.cupHome : cupMatchResult.cupAway));
                setDynastyCupBracket(prev => ({
                  ...prev,
                  [playerSFKey]: { ...prev[playerSFKey], result: { homeGoals: hg, awayGoals: ag, winner, pens: penResult } },
                  [otherSFKey]: { ...prev[otherSFKey], result: { homeGoals: otherResult.homeGoals, awayGoals: otherResult.awayGoals, winner: otherWinner } },
                  final: { home: bracket.playerSF === 1 ? winner : otherWinner, away: bracket.playerSF === 1 ? otherWinner : winner },
                  playerEliminated: !playerWon,
                }));
                // Inbox: other SF result
                setInboxMessages(prev => [...prev, {
                  id: `msg_dynasty_other_sf_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                  icon: "🌍", title: "Dynasty Cup — Other Semi-Final",
                  body: `${otherWinner.name} beat ${otherWinner === otherSF.home ? otherSF.away.name : otherSF.home.name} ${otherResult.homeGoals}-${otherResult.awayGoals} to reach the final.${playerWon ? `\n\nYou'll face ${otherWinner.name} in the Dynasty Cup Final!` : `\n\nYour journey ends here.`}`,
                  color: "#facc15", read: false,
                }]);
              } else {
                // Final result
                setDynastyCupBracket(prev => ({
                  ...prev,
                  final: { ...prev.final, result: { homeGoals: hg, awayGoals: ag, winner, pens: penResult } },
                  winner,
                }));
                // MotM +1 stat boost if player won the Dynasty Cup
                if (playerWon) {
                  const eligible = useGameStore.getState().squad.filter(p => startingXI.includes(p.id));
                  if (eligible.length > 0) {
                    const motm = eligible[Math.floor(Math.random() * eligible.length)];
                    const attrs = ["pace","shooting","passing","dribbling","defending","physical","goalkeeping"];
                    const attr = attrs[Math.floor(Math.random() * attrs.length)];
                    const newVal = Math.min(motm.legendCap || ovrCap, (motm.attrs[attr] || 1) + 1);
                    setSquad(prev => prev.map(p => p.id === motm.id ? { ...p, attrs: { ...p.attrs, [attr]: newVal } } : p));
                    setInboxMessages(prev => [...prev, {
                      id: `msg_dynasty_champ_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                      icon: "🏆", title: "Dynasty Cup Champions!",
                      body: `You've won the Dynasty Cup! ${motm.name} was named Man of the Match and earns a permanent +1 ${attr.charAt(0).toUpperCase() + attr.slice(1)} boost (now ${newVal}).`,
                      color: "#facc15", read: false,
                    }]);
                  }
                }
              }
              // Store dynasty result in calendar
              const dynPGoals = cupMatchResult.isPlayerHome ? hg : ag;
              const dynOGoals = cupMatchResult.isPlayerHome ? ag : hg;
              const dynOppName = (cupMatchResult.isPlayerHome ? cupMatchResult.cupAway : cupMatchResult.cupHome)?.name || "?";
              setCalendarResults(prev => ({
                ...prev,
                [cupMatchResult._calendarIndex]: { playerGoals: dynPGoals, oppGoals: dynOGoals, won: playerWon, draw: false, oppName: dynOppName, pens: penResult ? { homeScore: penResult.homeScore, awayScore: penResult.awayScore } : null }
              }));
              // Advance calendar
              setCalendarIndex(prev => prev + 1);
              setCupMatchResult(null);
              setProcessing(false);
              return;
            }

            // === MINI-TOURNAMENT MATCH RESULT ===
            if (cupMatchResult.isMini) {
              const mRound = cupMatchResult.miniRound;
              const mhg = cupMatchResult.homeGoals;
              const mag = cupMatchResult.awayGoals;
              const mPens = cupMatchResult.penalties || null;

              if (mRound === "sf_leg1") {
                // Record leg 1 result
                const sfKey = useGameStore.getState().miniTournamentBracket.playerSF === 1 ? "sf1" : "sf2";
                setMiniTournamentBracket(prev => ({
                  ...prev,
                  [sfKey]: { ...prev[sfKey], leg1: { homeGoals: mhg, awayGoals: mag } },
                }));
                setCalendarResults(prev => ({ ...prev, [cupMatchResult._calendarIndex]: { playerGoals: mhg, oppGoals: mag, won: mhg > mag, draw: mhg === mag, oppName: (cupMatchResult.cupAway || cupMatchResult.cupHome)?.name || "?" } }));
              } else if (mRound === "sf_leg2") {
                // Determine aggregate winner
                const bracket = useGameStore.getState().miniTournamentBracket;
                const sfKey = bracket.playerSF === 1 ? "sf1" : "sf2";
                const leg1 = bracket[sfKey].leg1;
                // Player is always simulated as home in both legs, so homeGoals = player's goals
                const aggPlayer = leg1.homeGoals + mhg;
                const aggOpp = leg1.awayGoals + mag;
                let sfWinner;
                if (aggPlayer > aggOpp) {
                  sfWinner = bracket[sfKey].home.isPlayer ? bracket[sfKey].home : bracket[sfKey].away;
                } else if (aggOpp > aggPlayer) {
                  sfWinner = bracket[sfKey].home.isPlayer ? bracket[sfKey].away : bracket[sfKey].home;
                } else {
                  // Tied on aggregate — use penalties from this leg (generate if not present)
                  let sfPens = mPens;
                  if (!sfPens) {
                    const pTeam = { name: teamName, color: C.green, squad, isPlayer: true };
                    const oTeam = bracket[sfKey].home.isPlayer ? bracket[sfKey].away : bracket[sfKey].home;
                    sfPens = generatePenaltyShootout(pTeam, oTeam, cupMatchResult.events || [], fiveASideSquad || [], [], getModifier(leagueTier));
                  }
                  sfWinner = sfPens.winner === "home"
                    ? (cupMatchResult.cupHome?.isPlayer ? cupMatchResult.cupHome : cupMatchResult.cupAway)
                    : (cupMatchResult.cupAway?.isPlayer ? cupMatchResult.cupAway : cupMatchResult.cupHome);
                }
                const playerWonSF = sfWinner.isPlayer;
                // Sim other SF
                const otherSFKey = bracket.playerSF === 1 ? "sf2" : "sf1";
                const otherSF = bracket[otherSFKey];
                const mMod = getModifier(leagueTier);
                // Sim other SF leg 1 if not done
                let otherLeg1 = otherSF.leg1;
                if (!otherLeg1) {
                  const or1 = simulateMatch(otherSF.home, otherSF.away, null, null, true, 1, 0, null, 0, mMod);
                  otherLeg1 = { homeGoals: or1.homeGoals, awayGoals: or1.awayGoals };
                }
                // Sim other SF leg 2
                const or2 = simulateMatch(otherSF.away, otherSF.home, null, null, true, 1, 0, null, 0, mMod);
                const otherAggH = otherLeg1.homeGoals + or2.awayGoals;
                const otherAggA = otherLeg1.awayGoals + or2.homeGoals;
                let otherWinner = otherAggH > otherAggA ? otherSF.home : otherAggA > otherAggH ? otherSF.away : null;
                if (!otherWinner) {
                  const op = generatePenaltyShootout(otherSF.home, otherSF.away, or2.events, null, null, mMod);
                  otherWinner = op.winner === "home" ? otherSF.home : otherSF.away;
                }
                // Determine SF losers for 3rd-place playoff
                const playerSFLoser = sfWinner.isPlayer
                  ? (bracket[sfKey].home.isPlayer ? bracket[sfKey].away : bracket[sfKey].home)
                  : (bracket[sfKey].home.isPlayer ? bracket[sfKey].home : bracket[sfKey].away);
                const otherSFLoser = otherWinner === otherSF.home ? otherSF.away : otherSF.home;
                setMiniTournamentBracket(prev => ({
                  ...prev,
                  [sfKey]: { ...prev[sfKey], leg2: { homeGoals: mhg, awayGoals: mag }, winner: sfWinner },
                  [otherSFKey]: { ...prev[otherSFKey], leg1: otherLeg1, leg2: { homeGoals: or2.homeGoals, awayGoals: or2.awayGoals }, winner: otherWinner },
                  final: { home: bracket.playerSF === 1 ? sfWinner : otherWinner, away: bracket.playerSF === 1 ? otherWinner : sfWinner, result: null },
                  thirdPlace: { home: playerSFLoser, away: otherSFLoser, result: null, winner: null },
                  playerEliminated: false, // player still plays 3rd-place or final
                  playerInFinal: playerWonSF,
                }));
                const otherLoserName = otherWinner === otherSF.home ? otherSF.away.name : otherSF.home.name;
                setInboxMessages(prev => [...prev, {
                  id: `msg_mini_other_sf_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                  icon: "🌐", title: "Mini-Tournament — Semi-Finals Complete",
                  body: `${otherWinner.name} beat ${otherLoserName} on aggregate to reach the final.${playerWonSF
                    ? `\n\nYou'll face ${otherWinner.name} in the 5v5 Final!`
                    : `\n\nYou'll play ${otherLoserName} in the 3rd-place playoff for the final promotion spot.`}\n\nFinal: ${bracket.playerSF === 1 ? sfWinner.name : otherWinner.name} vs ${bracket.playerSF === 1 ? otherWinner.name : sfWinner.name}\n3rd Place: ${playerSFLoser.name} vs ${otherSFLoser.name}`,
                  color: "#fbbf24", read: false,
                }]);
                setCalendarResults(prev => ({ ...prev, [cupMatchResult._calendarIndex]: { playerGoals: mhg, oppGoals: mag, won: mhg > mag, draw: mhg === mag, oppName: (cupMatchResult.cupAway || cupMatchResult.cupHome)?.name || "?" } }));
              } else if (mRound === "third_place") {
                // 3rd-place playoff
                const tpWinner = mPens
                  ? (mPens.winner === "home" ? cupMatchResult.cupHome : cupMatchResult.cupAway)
                  : (mhg > mag ? cupMatchResult.cupHome : mhg < mag ? cupMatchResult.cupAway : cupMatchResult.cupHome);
                const playerWon3rd = tpWinner.isPlayer;
                setMiniTournamentBracket(prev => ({
                  ...prev,
                  thirdPlace: { ...prev.thirdPlace, result: { homeGoals: mhg, awayGoals: mag, pens: mPens }, winner: tpWinner },
                  thirdPlaceWinner: tpWinner,
                  playerEliminated: !playerWon3rd && !prev.playerInFinal,
                }));
                // Sim the final if player is NOT in the final (AI vs AI)
                const bracket = useGameStore.getState().miniTournamentBracket;
                if (!bracket.playerInFinal && bracket.final?.home && bracket.final?.away) {
                  const mMod = getModifier(leagueTier);
                  const finR = simulateMatch(bracket.final.home, bracket.final.away, null, null, true, 1, 0, null, 0, mMod);
                  let finW = finR.homeGoals > finR.awayGoals ? bracket.final.home : finR.awayGoals > finR.homeGoals ? bracket.final.away : null;
                  if (!finW) { const fp = generatePenaltyShootout(bracket.final.home, bracket.final.away, finR.events, null, null, mMod); finW = fp.winner === "home" ? bracket.final.home : bracket.final.away; }
                  setMiniTournamentBracket(prev => ({
                    ...prev,
                    final: { ...prev.final, result: { homeGoals: finR.homeGoals, awayGoals: finR.awayGoals, winner: finW } },
                    winner: finW,
                    runnerUp: finW === bracket.final.home ? bracket.final.away : bracket.final.home,
                  }));
                  setInboxMessages(prev => [...prev, {
                    id: `msg_mini_final_bg2_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                    icon: "🏆", title: "Mini-Tournament Final Result",
                    body: `${finW.name} won the 5v5 Mini-Tournament Final, beating ${finW === bracket.final.home ? bracket.final.away.name : bracket.final.home.name} ${finR.homeGoals}-${finR.awayGoals}.`,
                    color: "#fbbf24", read: false,
                  }]);
                }
                setInboxMessages(prev => [...prev, {
                  id: `msg_mini_3rd_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                  icon: playerWon3rd ? "🥉" : "😞", title: playerWon3rd ? "3rd-Place Playoff — Victory!" : "3rd-Place Playoff — Defeat",
                  body: playerWon3rd ? `You won the 3rd-place playoff ${mhg}-${mag}! You've secured the final promotion spot.` : `You lost the 3rd-place playoff ${mhg}-${mag}. No promotion this season.`,
                  color: "#fbbf24", read: false,
                }]);
                setCalendarResults(prev => ({ ...prev, [cupMatchResult._calendarIndex]: { playerGoals: mhg, oppGoals: mag, won: playerWon3rd, draw: false, oppName: (cupMatchResult.cupAway || cupMatchResult.cupHome)?.name || "?" } }));
              } else if (mRound === "final") {
                // Final
                const mWinner = mPens
                  ? (mPens.winner === "home" ? cupMatchResult.cupHome : cupMatchResult.cupAway)
                  : (mhg > mag ? cupMatchResult.cupHome : mhg < mag ? cupMatchResult.cupAway : cupMatchResult.cupHome);
                const playerWonFinal = mWinner.isPlayer;
                const finalLoser = mWinner === cupMatchResult.cupHome ? cupMatchResult.cupAway : cupMatchResult.cupHome;
                setMiniTournamentBracket(prev => ({
                  ...prev,
                  final: { ...prev.final, result: { homeGoals: mhg, awayGoals: mag, winner: mWinner, pens: mPens } },
                  winner: mWinner,
                  runnerUp: finalLoser,
                }));
                // Sim 3rd-place playoff if player was in the final (AI vs AI 3rd place)
                const bracket = useGameStore.getState().miniTournamentBracket;
                if (bracket.thirdPlace && !bracket.thirdPlace.winner) {
                  const mMod = getModifier(leagueTier);
                  const tpR = simulateMatch(bracket.thirdPlace.home, bracket.thirdPlace.away, null, null, true, 1, 0, null, 0, mMod);
                  let tpW = tpR.homeGoals > tpR.awayGoals ? bracket.thirdPlace.home : tpR.awayGoals > tpR.homeGoals ? bracket.thirdPlace.away : null;
                  if (!tpW) { const tp2 = generatePenaltyShootout(bracket.thirdPlace.home, bracket.thirdPlace.away, tpR.events, null, null, mMod); tpW = tp2.winner === "home" ? bracket.thirdPlace.home : bracket.thirdPlace.away; }
                  setMiniTournamentBracket(prev => ({
                    ...prev,
                    thirdPlace: { ...prev.thirdPlace, result: { homeGoals: tpR.homeGoals, awayGoals: tpR.awayGoals, winner: tpW }, winner: tpW },
                    thirdPlaceWinner: tpW,
                  }));
                }
                if (playerWonFinal) {
                  const eligible = useGameStore.getState().squad.filter(p => (fiveASideSquad || []).includes(p.id));
                  if (eligible.length > 0) {
                    const motm = eligible[Math.floor(Math.random() * eligible.length)];
                    const attrs = ["pace","shooting","passing","dribbling","defending","physical","goalkeeping"];
                    const attr = attrs[Math.floor(Math.random() * attrs.length)];
                    const newVal = Math.min(motm.legendCap || ovrCap, (motm.attrs[attr] || 1) + 1);
                    setSquad(prev => prev.map(p => p.id === motm.id ? { ...p, attrs: { ...p.attrs, [attr]: newVal } } : p));
                    setInboxMessages(prev => [...prev, {
                      id: `msg_mini_champ_${Date.now()}`, week: calendarIndex, season: seasonNumber,
                      icon: "🏆", title: "5v5 Mini-Tournament Champions!",
                      body: `You've won the 5v5 Mini-Tournament! ${motm.name} was named Man of the Match and earns a permanent +1 ${attr.charAt(0).toUpperCase() + attr.slice(1)} boost (now ${newVal}).`,
                      color: "#fbbf24", read: false,
                    }]);
                  }
                }
                setCalendarResults(prev => ({ ...prev, [cupMatchResult._calendarIndex]: { playerGoals: mhg, oppGoals: mag, won: playerWonFinal, draw: false, oppName: (cupMatchResult.cupAway || cupMatchResult.cupHome)?.name || "?" } }));
              }
              setCalendarIndex(prev => prev + 1);
              setCupMatchResult(null);
              setProcessing(false);
              return;
            }

            let hg = cupMatchResult.homeGoals;
            let ag = cupMatchResult.awayGoals;
            let penResult = null;
            // Determine winner from penalties if drawn
            if (hg === ag && cupMatchResult.penalties) {
              penResult = cupMatchResult.penalties;
              // Winner determined by penalty scores, not modified main score
            } else if (hg === ag) {
              // Fallback: shouldn't happen but handle gracefully
              if (Math.random() < 0.5) hg++; else ag++;
            }
            const winner = penResult
              ? (penResult.winner === "home" ? cupMatchResult.cupHome : cupMatchResult.cupAway)
              : (hg > ag ? cupMatchResult.cupHome : cupMatchResult.cupAway);

            const cupGoalScorers = (cupMatchResult.events || [])
              .filter(e => e.type === "goal")
              .map(e => ({ name: e.player, assister: e.assister || null, side: e.side, minute: e.minute }));

            setCup(prev => {
              if (!prev || !prev.pendingPlayerMatch) return prev;
              const newRounds = prev.rounds.map((r, rIdx) => {
                if (rIdx !== prev.currentRound) return r;
                return {
                  ...r,
                  matches: r.matches.map(m => {
                    if (m.home?.name === prev.pendingPlayerMatch.home?.name && m.away?.name === prev.pendingPlayerMatch.away?.name) {
                      return { ...m, result: { homeGoals: hg, awayGoals: ag, winner, penalties: penResult ? { homeScore: penResult.homeScore, awayScore: penResult.awayScore } : null, goalScorers: cupGoalScorers } };
                    }
                    return m;
                  }),
                };
              });
              const updatedCup = { ...prev, rounds: newRounds, pendingPlayerMatch: null };
              const playerEliminated = !winner.isPlayer;
              return buildNextCupRound({ ...updatedCup, playerEliminated: playerEliminated || prev.playerEliminated });
            });

            const playerEliminated2 = !winner.isPlayer;

            // Cup achievements
            const cupAchs = [];
            const cupRoundIdx = cup?.currentRound ?? 0;
            const cupRoundCount = cup?.rounds?.length ?? 5;
            const isFinal = cupRoundIdx === cupRoundCount - 1;

            // Fan & Board Sentiment (regular cup match)
            { const _cupFanMult = getModifier(leagueTier).fanSentimentMult || 1;
              const _fanCupDelta = (winner.isPlayer
                ? (isFinal ? 15 : cupRoundIdx >= 2 ? 5 : 3)
                : (cupRoundIdx <= 1 ? -5 : -2)) * _cupFanMult;
              setFanSentiment(Math.max(0, Math.min(100, useGameStore.getState().fanSentiment + _fanCupDelta)));
              setBoardSentiment(Math.max(0, Math.min(100, useGameStore.getState().boardSentiment + (winner.isPlayer ? (isFinal ? 10 : 3) : -4))));
            }

            // Super Sub — works in cup too
            if (!unlockedAchievements.has("super_sub") && cupMatchResult.superSub) cupAchs.push("super_sub");

            // Wembley Way — play in a cup final
            if (isFinal && !unlockedAchievements.has("wembley")) cupAchs.push("wembley");

            if (winner.isPlayer) {
              // Won this cup match
              if (isFinal && !unlockedAchievements.has("cup_winner")) cupAchs.push("cup_winner");
              // Postcard From The Edge — win cup while on holiday
              if (isFinal && isOnHoliday && !unlockedAchievements.has("postcard_edge")) cupAchs.push("postcard_edge");
              // Per-cup win achievements
              if (isFinal) {
                const CUP_WIN_ACHS = { "Sub Money Cup": "win_sub_money", "Clubman Cup": "win_clubman", "Global Cup": "win_global", "Ultimate Cup": "win_ultimate" };
                const cupAchId = CUP_WIN_ACHS[cup?.cupName];
                if (cupAchId && !unlockedAchievements.has(cupAchId)) cupAchs.push(cupAchId);
                // Trophy Cabinet — win 2 different cup competitions
                if (!unlockedAchievements.has("cup_collector") && cupAchId) {
                  const cupsWon = new Set();
                  if (cupAchId) cupsWon.add(cupAchId);
                  (clubHistory?.cupHistory || []).forEach(ch => {
                    if (ch.winnerIsPlayer && ch.cupName) {
                      const prevAch = CUP_WIN_ACHS[ch.cupName];
                      if (prevAch) cupsWon.add(prevAch);
                    }
                  });
                  if (cupsWon.size >= 2) cupAchs.push("cup_collector");
                }
              }
              // On A Cold Night In Stoke — win away cup match vs team 3+ tiers above
              const opponent = cupMatchResult.isPlayerHome ? cupMatchResult.cupAway : cupMatchResult.cupHome;
              if (!cupMatchResult.isPlayerHome && opponent.tier <= leagueTier - 3 && !unlockedAchievements.has("do_it_cold")) cupAchs.push("do_it_cold");
              // Catenaccio — won the cup without conceding in any round
              if (isFinal && !unlockedAchievements.has("catenaccio") && cup?.rounds) {
                let conceded = 0;
                cup.rounds.forEach(r => {
                  const pm = r.matches?.find(m => m.home?.isPlayer || m.away?.isPlayer);
                  if (pm && pm.result && !pm.result.bye) {
                    const isHome = pm.home?.isPlayer;
                    conceded += isHome ? pm.result.awayGoals : pm.result.homeGoals;
                  }
                });
                // Also count the current match (not yet stored in cup)
                const currentConceded = cupMatchResult.isPlayerHome ? ag : hg;
                if (conceded + currentConceded === 0) cupAchs.push("catenaccio");
              }
              // A Professional Job — won the cup without any penalty shootout
              if (isFinal && !unlockedAchievements.has("professional_job") && cup?.rounds) {
                let hadPens = !!penResult;
                if (!hadPens) {
                  cup.rounds.forEach(r => {
                    const pm = r.matches?.find(m => m.home?.isPlayer || m.away?.isPlayer);
                    if (pm?.result?.penalties) hadPens = true;
                  });
                }
                if (!hadPens) cupAchs.push("professional_job");
              }
              // Cup upset: beat a Premier team while in lower league
              if (opponent.tier <= leagueTier - 3 && !unlockedAchievements.has("cup_upset")) cupAchs.push("cup_upset");
              // Story arc: beat team from higher tier in cup
              if (opponent.tier < leagueTier) {
                setStoryArcs(prev => {
                  const next = {...prev};
                  ARC_CATS.forEach(cat => {
                    const cs = next[cat];
                    if (!cs || cs.completed) return;
                    // Set both beatAbove (for step 1: "beat a team ranked above you") and beatHigherCup (for step 4: cup-specific)
                    next[cat] = {...cs, tracking:{...(cs.tracking||{}), beatAbove:true, beatHigherCup:true}};
                  });
                  return next;
                });
              }
              // Penalty shootout wins
              if (penResult) {
                if (!unlockedAchievements.has("nerves_of_steel")) cupAchs.push("nerves_of_steel");
                // Perfect Five — player won and never missed
                if (!unlockedAchievements.has("perfect_five")) {
                  const playerSide = cupMatchResult.isPlayerHome ? "home" : "away";
                  const playerMissed = penResult.kicks?.some(k => k.side === playerSide && !k.scored);
                  if (!playerMissed) cupAchs.push("perfect_five");
                }
                // Sudden Death — won in sudden death rounds
                if (!unlockedAchievements.has("sudden_death") && penResult.kicks?.some(k => k.suddenDeath)) {
                  cupAchs.push("sudden_death");
                }
                // Soundtrack — win shootout while 'Shootout' is playing
                if (!unlockedAchievements.has("soundtrack") && BGM.getCurrentTrackId() === "shootout") {
                  cupAchs.push("soundtrack");
                }
              }
            } else {
              // Lost this cup match
              if (cupRoundIdx === 0 && !unlockedAchievements.has("cup_exit_r32")) cupAchs.push("cup_exit_r32");
              if (isFinal && !unlockedAchievements.has("cup_final_loss")) cupAchs.push("cup_final_loss");
              // Heartbreak — lose on penalties
              if (penResult && !unlockedAchievements.has("heartbreak")) cupAchs.push("heartbreak");
            }

            if (cupAchs.length > 0) {
              setUnlockedAchievements(prev => {
                const next = new Set(prev);
                cupAchs.forEach(id => next.add(id));
                return next;
              });
              setAchievementQueue(prev => { const ex = new Set(prev); const f = cupAchs.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
            }

            // Joga Bonito — Brazilian player scores in a cup match
            if (!unlockedAchievements.has("joga_bonito") && cupMatchResult.events && squad) {
              const playerSide = cupMatchResult.isPlayerHome ? "home" : "away";
              const brazilians = squad.filter(p => p.nationality === "BRA").map(p => p.name);
              if (brazilians.length > 0) {
                const brazilianGoal = cupMatchResult.events.some(e =>
                  e.type === "goal" && e.side === playerSide && e.player && brazilians.includes(e.player)
                );
                if (brazilianGoal) {
                  setUnlockedAchievements(prev => { const n = new Set(prev); n.add("joga_bonito"); return n; });
                  setAchievementQueue(prev => [...prev, "joga_bonito"]);
                  // Trigger player unlock if this achievement has one
                  const unlock = UNLOCKABLE_PLAYERS.find(u => u.achievementId === "joga_bonito");
                  if (unlock && unlock.attrs) setPendingPlayerUnlock(prev => prev ? [].concat(prev, unlock) : unlock);
                }
              }
            }

            // === General achievement checks for cup matches ===
            try {
              const cupPlayerGoals = cupMatchResult.isPlayerHome ? hg : ag;
              const cupOppGoals = cupMatchResult.isPlayerHome ? ag : hg;
              const cupPlayerWon = cupPlayerGoals > cupOppGoals;
              const cupPlayerLost = cupOppGoals > cupPlayerGoals;
              const cupIsDraw = cupPlayerGoals === cupOppGoals;

              const cupNewUnlocks = checkAchievements({
                squad: useGameStore.getState().squad, unlocked: unlockedAchievements,
                lastMatchResult: cupMatchResult, league: cupMatchResult.cupLeague || league, weekGains: null,
                startingXI, bench, matchweekIndex: 0, seasonCards,
                totalGains, totalMatches: totalMatches + 1,
                seasonCleanSheets: seasonCleanSheets + (cupOppGoals === 0 ? 1 : 0),
                seasonGoalsFor: seasonGoalsFor + cupPlayerGoals,
                seasonDraws: seasonDraws + (cupIsDraw ? 1 : 0),
                consecutiveUnbeaten: cupPlayerLost ? 0 : consecutiveUnbeaten + 1,
                consecutiveLosses: cupPlayerLost ? consecutiveLosses + 1 : 0,
                consecutiveDraws: cupIsDraw ? consecutiveDraws + 1 : 0,
                consecutiveWins: cupPlayerWon ? consecutiveWins + 1 : 0,
                prevStartingXI, motmTracker, stScoredConsecutive,
                playerRatingTracker, beatenTeams, halfwayPosition,
                seasonHomeUnbeaten, seasonAwayWins, seasonAwayGames,
                leagueWins, wasAlwaysFast: !!cupWasAlwaysFast,
                recoveries: weekRecoveriesRef.current || [],
                recentScorelines: [...recentScorelines.slice(-2), [cupPlayerGoals, cupOppGoals]],
                secondPlaceFinishes, playerInjuryCount, benchStreaks,
                highScoringMatches: highScoringMatches + ((cupPlayerGoals + cupOppGoals >= 5) ? 1 : 0),
                trialHistory, playerSeasonStats, clubHistory,
                consecutiveScoreless: cupPlayerGoals === 0 ? consecutiveScoreless + 1 : 0,
                formation, slotAssignments,
                usedTicketTypes, formationsWonWith: cupPlayerWon ? new Set([...formationsWonWith, formation.map(s => s.pos).join("-")]) : formationsWonWith,
                freeAgentSignings, scoutedPlayers, transferFocus, clubRelationships,
                isOnHoliday, holidayMatchesThisSeason,
                testimonialPlayer: useGameStore.getState().testimonialPlayer,
                seasonNumber, lastSeasonPosition: clubHistory?.seasonArchive?.length > 0 ? clubHistory.seasonArchive[clubHistory.seasonArchive.length - 1].position : null,
                shortlist, wasAlwaysNormal: !!cupWasAlwaysNormal,
                fastMatchesThisSeason: fastMatchesThisSeason + (cupWasAlwaysFast ? 1 : 0),
                twelfthManActive, gkCleanSheets, totalShortlisted,
              });

              if (cupNewUnlocks.length > 0) {
                setUnlockedAchievements(prev => { const next = new Set(prev); cupNewUnlocks.forEach(id => next.add(id)); return next; });
                setAchievementQueue(prev => { const ex = new Set(prev); const f = cupNewUnlocks.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
                const cupUnlockPlayers = cupNewUnlocks
                  .map(achId => UNLOCKABLE_PLAYERS.find(u => u.achievementId === achId))
                  .filter(u => u && u.attrs);
                if (cupUnlockPlayers.length > 0) {
                  setPendingPlayerUnlock(prev => prev ? [].concat(prev).concat(cupUnlockPlayers) : cupUnlockPlayers);
                }
              }
            } catch(err) {
              console.error("Cup achievement check error:", err, err.stack);
            }

            // Track cup match appearances on player objects
            setSquad(prev => prev.map(p => {
              if (startingXI.includes(p.id)) {
                return { ...p, seasonStarts: (p.seasonStarts || 0) + 1, ...(p.isLegend ? { legendAppearances: Math.min(12, (p.legendAppearances || 0) + 1) } : {}) };
              }
              const subEntry = cupMatchResult.playerRatings?.find(
                pr => pr.name === p.name && pr.isSub && pr.minutesPlayed > 0
              );
              if (subEntry) {
                return { ...p, seasonSubApps: (p.seasonSubApps || 0) + 1, ...(p.isLegend ? { legendAppearances: Math.min(12, (p.legendAppearances || 0) + 1) } : {}) };
              }
              return p;
            }));

            // Track formations won with for Formation Roulette achievement
            if (winner.isPlayer && formation) {
              const formKey = formation.map(s => s.pos).join("-");
              setFormationsWonWith(prev => new Set([...prev, formKey]));
            }

            // Store cup result in calendar results
            const cupCalIdx = cupMatchResult._calendarIndex != null ? cupMatchResult._calendarIndex : useGameStore.getState().calendarIndex;
            const pGoals = cupMatchResult.isPlayerHome ? hg : ag;
            const oGoals = cupMatchResult.isPlayerHome ? ag : hg;
            setCalendarResults(prev => ({
              ...prev,
              [cupCalIdx]: { playerGoals: pGoals, oppGoals: oGoals, won: winner.isPlayer, draw: false }
            }));
            let newCupCalIdx = cupCalIdx + 1;
            // Auto-skip trailing cup entries if player just got eliminated
            const cal2 = useGameStore.getState().seasonCalendar || [];
            const justEliminated = !winner.isPlayer;
            while (newCupCalIdx < cal2.length && cal2[newCupCalIdx]?.type === "cup" && (justEliminated || useGameStore.getState().cup?.playerEliminated)) {
              newCupCalIdx++;
            }
            setCalendarIndex(newCupCalIdx);

            // Check for season end — all calendar entries played
            if (newCupCalIdx >= cal2.length) {
              const currentTier = league.tier || leagueTier;
              const currentRosters = leagueRosters || initLeagueRosters();
              const swapResult = processSeasonSwaps(currentRosters, league, currentTier, allLeagueStates);
              const position = swapResult.playerPosition;
              let newTier = swapResult.playerNewTier;
              // Safety: promote if eligible — tournament tiers use tournament results
              const _mod3 = getModifier(currentTier);
              const _mBkt3 = useGameStore.getState().miniTournamentBracket;
              if (_mod3.miniTournament && currentTier > 1 && _mBkt3) {
                const _dRU3 = _mBkt3.runnerUp || (_mBkt3.winner && _mBkt3.final?.home && _mBkt3.final?.away ? (_mBkt3.winner.name === _mBkt3.final.home.name ? _mBkt3.final.away : _mBkt3.final.home) : null);
                const _promoted3 = _mBkt3.winner?.isPlayer || _dRU3?.isPlayer || (_mBkt3.thirdPlaceWinner || _mBkt3.thirdPlace?.winner)?.isPlayer;
                if (_promoted3 && newTier >= currentTier) newTier = currentTier - 1;
              } else {
                if (position <= 3 && currentTier > 1 && newTier >= currentTier) newTier = currentTier - 1;
              }
              // HARD SAFETY: never jump more than 1 tier in either direction
              if (newTier < currentTier - 1) newTier = currentTier - 1;
              if (newTier > currentTier + 1) newTier = currentTier + 1;
              newTier = Math.max(1, Math.min(NUM_TIERS, newTier));
              const moveType = newTier < currentTier ? "promoted" : newTier > currentTier ? "relegated" : "stayed";

              if (position === 1) setLeagueWins(prev => prev + 1);
              if (position === 2) setSecondPlaceFinishes(prev => prev + 1);
              setLeagueRosters(swapResult.rosters);

              const newSeasonUnlocks2 = collectSeasonEndAchievements({
                position, currentTier, moveType, newTier, lastSeasonMove, league, leagueResults,
                playerSeasonStats, beatenTeams, unlockedAchievements, clubHistory,
                wonCupThisSeason: unlockedAchievements.has("cup_winner") || cupAchs.includes("cup_winner"),
                squad: useGameStore.getState().squad, prevSeasonSquadIds, seasonNumber,
                dynastyCupBracket: useGameStore.getState().dynastyCupBracket, cup: useGameStore.getState().cup,
              }, BGM.getCurrentTrackId());
              if (newSeasonUnlocks2.length > 0) {
                setUnlockedAchievements(prev => { const next = new Set(prev); newSeasonUnlocks2.forEach(id => next.add(id)); return next; });
                setAchievementQueue(prev => { const ex = new Set(prev); const f = newSeasonUnlocks2.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
                const seasonUnlockPlayers2 = newSeasonUnlocks2
                  .map(achId => UNLOCKABLE_PLAYERS.find(u => u.achievementId === achId))
                  .filter(u => u && u.attrs);
                if (seasonUnlockPlayers2.length > 0) {
                  setPendingPlayerUnlock(prev => prev ? [].concat(prev).concat(seasonUnlockPlayers2) : seasonUnlockPlayers2);
                }
              }
              setLastSeasonMove(moveType);
              // Season-end sentiment swings (cup path)
              if (moveType === "promoted") { setFanSentiment(Math.min(100, useGameStore.getState().fanSentiment + 20)); setBoardSentiment(Math.min(100, useGameStore.getState().boardSentiment + 25)); }
              if (moveType === "relegated") { setFanSentiment(Math.max(0, useGameStore.getState().fanSentiment - 20)); setBoardSentiment(Math.max(0, useGameStore.getState().boardSentiment - 25)); }
              if (position === 1) { setFanSentiment(Math.min(100, useGameStore.getState().fanSentiment + 10)); setBoardSentiment(Math.min(100, useGameStore.getState().boardSentiment + 10)); }

              const cupPathPlayerRow = league?.table?.find(r => league.teams[r.teamIndex]?.isPlayer);
              setSummerData({
                moveType, fromTier: currentTier, toTier: newTier, position,
                leagueName: league.leagueName || LEAGUE_DEFS[currentTier].name,
                newLeagueName: LEAGUE_DEFS[newTier].name,
                newRosters: swapResult.rosters,
                isInvincible: position === 1 && cupPathPlayerRow?.lost === 0,
              });
              setSummerPhase("summary");

              // === STORY ARC SEASON-END TRACKING (cup path) ===
              {
                const cupWon2 = cup && !cup.playerEliminated && (() => {
                  const rKeys = Object.keys(cup.rounds || {}).map(Number).sort((a,b)=>a-b);
                  if (rKeys.length === 0) return false;
                  const finalRound = cup.rounds[rKeys[rKeys.length-1]];
                  return finalRound?.matches?.some(m => m.result?.winner?.isPlayer);
                })();
                setStoryArcs(prev => resolveSeasonEndArcs(prev, position, cupWon2));
              }
            }

            // === CUP MATCH ROUNDUP INBOX MESSAGE ===
            try {
              const cupRound = cup?.rounds?.[cup?.currentRound];
              const roundName = cupRound?.name || "Cup Match";
              const cupName = cup?.cupName || "Clubman Cup";
              const homeName = cupMatchResult.cupHome?.name || "Home";
              const awayName = cupMatchResult.cupAway?.name || "Away";
              const penStr = penResult ? ` (${penResult.homeScore}-${penResult.awayScore} pens)` : "";
              const playerWonCup = winner.isPlayer;
              const resultLine = `${homeName} ${hg}-${ag} ${awayName}${penStr}`;
              const cupScorers = (cupMatchResult.events || []).filter(e => e.type === "goal");
              const cupSurnameCounts = {};
              cupScorers.forEach(e => {
                const surname = e.player.split(" ").pop();
                cupSurnameCounts[surname] = (cupSurnameCounts[surname] || 0) + 1;
              });
              const cupShortName = (fullName) => {
                const parts = fullName.split(" ");
                const surname = parts[parts.length - 1];
                if (parts.length <= 1) return fullName;
                return cupSurnameCounts[surname] > 1 ? `${parts[0][0]}.${surname}` : surname;
              };
              const cupGrouped = {};
              const cupOrder = [];
              cupScorers.forEach(e => {
                if (!cupGrouped[e.player]) { cupGrouped[e.player] = []; cupOrder.push(e.player); }
                cupGrouped[e.player].push(e.minute);
              });
              const cupScorerStr = cupOrder.map(name => {
                const mins = cupGrouped[name].map(m => `${m}'`).join(", ");
                return `${cupShortName(name)} ${mins}`;
              }).join(", ");
              // Show other cup results from the same round
              const otherResults = (cupRound?.matches || []).filter(m => m.result && !m.result.bye && !(m.home?.isPlayer || m.away?.isPlayer)).map(m => {
                const rh = m.home?.name || "?"; const ra = m.away?.name || "?";
                const penInfo = m.result.penalties ? ` (${m.result.penalties.homeScore}-${m.result.penalties.awayScore} pens)` : "";
                return `${rh} ${m.result.homeGoals}-${m.result.awayGoals} ${ra}${penInfo}`;
              });
              const bodyParts = [`⚽ ${resultLine}${cupScorerStr ? ` (${cupScorerStr})` : ""}`];
              if (otherResults.length > 0) bodyParts.push(`\n${otherResults.join("\n")}`);
              if (!playerWonCup) bodyParts.push(`\n❌ You have been eliminated from ${cupName}.`);
              else if (isFinal) bodyParts.push(`\n🏆 You have won ${cupName}!`);
              else bodyParts.push(`\n✅ Through to the next round.`);
              setInboxMessages(prev => [...prev, {
                id: `msg_cup_${Date.now()}`, week: week, season: seasonNumber,
                icon: "🏆", color: C.gold,
                title: `${cupName} · ${roundName}`,
                body: bodyParts.join(""),
                read: false,
              }]);
            } catch(err) {
              console.error("Cup roundup error:", err);
            }

            // Prodigal son cup tracking
            try {
              if (prodigalSon && prodigalSon.phase === "active") {
                const ps = { ...prodigalSon };
                const wasInXI = startingXI.includes(ps.playerId);
                const cupOpp = cupMatchResult.isPlayerHome ? cupMatchResult.cupAway : cupMatchResult.cupHome;
                const cupOppName = cupOpp?.name || "";
                const cupPlayerSide = cupMatchResult.isPlayerHome ? "home" : "away";
                let cupScored = false;
                if (cupMatchResult.scorers) {
                  const prodigalP = squad.find(p => p.id === ps.playerId);
                  if (prodigalP) {
                    const key = `${cupPlayerSide}|${prodigalP.name}`;
                    if (cupMatchResult.scorers[key] > 0) cupScored = true;
                  }
                }
                if (wasInXI) { ps.starts = (ps.starts || 0) + 1; ps.consecutiveBenched = 0; }
                else { ps.consecutiveBenched = (ps.consecutiveBenched || 0) + 1; }
                if (cupScored) ps.goals = (ps.goals || 0) + 1;
                if (cupOppName === ps.formerClub && winner.isPlayer && wasInXI) ps.wonVsFormer = true;
                // Check redemption
                const msgs = [];
                if (cupScored && !ps.sentFlags.firstGoal) {
                  ps.sentFlags = { ...ps.sentFlags, firstGoal: true };
                  msgs.push({ id: `msg_prodigal_goal_${Date.now()}`, week: (week || 1), season: seasonNumber, icon: "⚽", color: C.gold, title: `${ps.playerName} Off the Mark`, body: `${ps.playerName} was emotional after that one. A long time coming.`, read: false });
                }
                if (ps.starts >= 10 && ps.goals >= 3 && ps.wonVsFormer && !ps.sentFlags.redeemed) {
                  ps.sentFlags = { ...ps.sentFlags, redeemed: true };
                  ps.phase = "redeemed";
                  ps.pendingBoost = true;
                  msgs.push({ id: `msg_prodigal_redeemed_${Date.now()}`, week: (week || 1), season: seasonNumber, icon: "🏠", color: C.green, title: `${ps.playerName} — Settled In`, body: `${ps.playerName} pulled me aside after training. Said this is the happiest he's been in years. Whatever you've done for him, it's working. He looks like a different player. Expect a big step up in the next session.`, read: false });
                  if (!unlockedAchievements.has("prodigal_son")) { setUnlockedAchievements(prev => { const n = new Set(prev); n.add("prodigal_son"); return n; }); setAchievementQueue(prev => [...prev, "prodigal_son"]); }
                }
                if (msgs.length > 0) setInboxMessages(prev => [...prev, ...msgs]);
                setProdigalSon(ps);
              }
            } catch(err) { console.error("Prodigal cup tracking error:", err); }

            // Testimonial cleanup: remove temp player after cup match
            const testimonialP2 = useGameStore.getState().testimonialPlayer;
            if (testimonialP2) {
              const tid = testimonialP2.id;
              setSquad(prev => prev.filter(p => p.id !== tid));
              setStartingXI(prev => prev.filter(id => id !== tid));
              setBench(prev => prev.filter(id => id !== tid));
              setInboxMessages(prev => [...prev, {
                id: `msg_testimonial_done_cup_${Date.now()}`, week: useGameStore.getState().calendarIndex + 1, season: seasonNumber,
                icon: "🎩", title: `${testimonialP2.name}: Standing Ovation`,
                body: `The crowd gave ${testimonialP2.name} a standing ovation as he walked off the pitch for the final time. Eyes glistening, he applauded every corner of the ground. A fitting farewell.`,
                color: "#f472b6", read: false,
              }]);
              setTestimonialPlayer(null);
            }

            // Cup-pending sacking resolution (Ironman)
            if (useGameStore.getState().ultimatumCupPending && useGameStore.getState().gameMode === "ironman") {
              setUltimatumCupPending(false);
              if (isFinal && winner.isPlayer) {
                // Won the cup final — reprieve!
                setBoardWarnCount(0);
                setBoardSentiment(Math.max(50, useGameStore.getState().boardSentiment));
                setInboxMessages(prev => [...prev, {
                  id: `msg_cup_reprieve_${Date.now()}`, week: useGameStore.getState().calendarIndex + 1, season: seasonNumber,
                  icon: "🏆", color: "#4ade80", title: "Board Reprieve",
                  body: "Fan reaction to your cup run has given the board cause to reconsider. Your job is safe — for now.",
                  read: false,
                }]);
              } else if (playerEliminated2) {
                // Eliminated from cup — sacked
                triggerSacking();
              }
              // If neither (still alive but not winner), wait for next cup match
            }

            setCupMatchResult(null);
            setProcessing(false); // CRITICAL: Allow interval to continue during holiday mode
          }}
        />
      )}

      </>
      )}

      {/* Summer break phases */}
      {summerPhase === "summary" && summerData && arcStepQueue.length === 0 && !weekTransition && (
        <SeasonEndReveal info={{
          type: summerData.moveType,
          fromTier: summerData.fromTier,
          toTier: summerData.toTier,
          position: summerData.position,
          leagueName: summerData.leagueName,
          newLeagueName: summerData.newLeagueName,
          isInvincible: summerData.isInvincible,
          prestigeLevel,
          miniTournamentFinish: (() => {
            const mb = useGameStore.getState().miniTournamentBracket;
            if (!mb || !getModifier(summerData.fromTier).miniTournament) return null;
            if (mb.winner?.isPlayer) return "winner";
            const ru = mb.runnerUp || (mb.winner && mb.final?.home && mb.final?.away ? (mb.winner.name === mb.final.home.name ? mb.final.away : mb.final.home) : null);
            if (ru?.isPlayer) return "runner_up";
            if ((mb.thirdPlaceWinner || mb.thirdPlace?.winner)?.isPlayer) return "third_place";
            return "eliminated";
          })(),
        }} onDone={() => {
          // Process retirements
          const retirees = useGameStore.getState().squad.filter(p => retiringPlayers.has(p.id));
          // Save squad snapshot before retirements for season archiving
          const preRetirementSquad = [...useGameStore.getState().squad];  // Use ref!
          // Testimonial achievement — retiring player with 30+ apps
          if (!unlockedAchievements.has("testimonial")) {
            for (const p of retirees) {
              const stats = playerSeasonStats[p.name];
              // Check total apps across career (estimate from current season stats)
              // We use their current season apps — could accumulate over seasons later
              if (stats && stats.apps >= 30) {
                setUnlockedAchievements(prev => { const n = new Set(prev); n.add("testimonial"); return n; });
                setAchievementQueue(prev => [...prev, "testimonial"]);
                break;
              }
            }
          }
          // End Of An Era — 3+ players retiring at end of one season
          if (!unlockedAchievements.has("end_of_an_era") && retirees.length >= 3) {
            setUnlockedAchievements(prev => { const n = new Set(prev); n.add("end_of_an_era"); return n; });
            setAchievementQueue(prev => [...prev, "end_of_an_era"]);
          }
          // Time Dilation — player retires in the Intergalactic Elite
          if (!unlockedAchievements.has("time_dilation") && retirees.length > 0 && summerData.fromTier === 1) {
            setUnlockedAchievements(prev => { const n = new Set(prev); n.add("time_dilation"); return n; });
            setAchievementQueue(prev => [...prev, "time_dilation"]);
          }
          if (retirees.length > 0) {
            const retireIds = new Set(retirees.map(p => p.id));
            setSquad(prev => prev.filter(p => !retireIds.has(p.id)));
            setStartingXI(prev => prev.filter(id => !retireIds.has(id)));
            setBench(prev => prev.filter(id => !retireIds.has(id)));
          }
          // === PRESTIGE TRIGGER ===
          // Won Intergalactic Elite (tier 1) as champion → enter prestige wormhole
          const isPrestigeTrigger = summerData.fromTier === 1
            && summerData.position === 1
            && prestigeLevel < 5;
          if (isPrestigeTrigger) {
            // Apply IE aging before prestige reset (3 years per season in IE)
            const agingYears = getModifier(summerData.fromTier).agingYearsPerSeason || 1;
            if (agingYears > 1) {
              setSquad(prev => prev.map(p => ({ ...p, age: p.age + agingYears })));
            }
            setSummerPhase("prestige");
            setRetiringPlayers(new Set());
            return; // Skip youth intake — resetting everything via prestige
          }

          const candidates = generateYouthIntake(retiringPlayers, squad, useGameStore.getState().youthCoupActive, ovrCap);
          if (useGameStore.getState().youthCoupActive) setYouthCoupActive(false);
          // Story arc: youth stat boost
          const youthBoost = storyArcs?.bonuses?.youthStatBoost || 0;
          if (youthBoost > 0) {
            candidates.forEach(c => {
              ATTRIBUTES.forEach(({ key }) => { c.attrs[key] = Math.min(14, (c.attrs[key]||0) + youthBoost); });
            });
          }
          // If a trial player impressed this season, add them to intake with boosted stats
          const impressedTrials = trialHistory.filter(t => t.impressed && t.season === seasonNumber);
          impressedTrials.forEach(t => {
            const boostedAttrs = {};
            ATTRIBUTES.forEach(({ key }) => {
              // Significant boost — they've been training abroad and developing
              boostedAttrs[key] = Math.min(14, (t.attrs[key] || 5) + rand(3, 5));
            });
            const trialYouth = {
              id: `youth_trial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: t.name, position: t.position, age: 17, // aged up from 16
              attrs: boostedAttrs, potential: Math.min(ovrCap, (t.potential || 14) + 2),
              statProgress: {}, training: "balanced",
              history: [{ ...boostedAttrs }], gains: {}, injury: null,
              isUnlockable: false, nationality: t.nationality,
            };
            candidates.unshift(trialYouth); // Put at front so player sees them first
          });
          setSummerData(prev => ({
            ...prev,
            retirees: retirees.map(p => ({ name: p.name, position: p.position, age: p.age, attrs: { ...p.attrs }, nationality: p.nationality })),
            youthCandidates: candidates,
            preRetirementSquad,
            weeksLeft: 3,
          }));
          setRetiringPlayers(new Set());
          setSummerPhase("break");
        }} />
      )}

      {/* Prestige wormhole transition — shown after winning Intergalactic Elite */}
      {summerPhase === "prestige" && (
        <PrestigeScreen
          prestigeLevel={prestigeLevel}
          newPrestigeLevel={prestigeLevel + 1}
          onDone={() => setSummerPhase("legendSelect")}
        />
      )}

      {summerPhase === "legendSelect" && (
        <LegendSelectionScreen
          squad={squad}
          maxPicks={5}
          legendCap={getOvrCap(prestigeLevel + 1)}
          newPrestigeLevel={prestigeLevel + 1}
          onDone={(selectedIds) => {
            const newPrestige = prestigeLevel + 1;
            const legCap = getOvrCap(newPrestige);

            // Convert selected players to legends
            const newLegends = squad
              .filter(p => selectedIds.includes(p.id) && !p.isLegend)
              .map(p => ({
                ...p,
                isLegend: true,
                legendCap: legCap,
                legendPrestige: newPrestige,
                legendAppearances: 0,
                seasonStarts: 0,
                seasonSubApps: 0,
              }));

            // Archive careers of non-legend retirees
            const retirees = squad.filter(p => !selectedIds.includes(p.id) && !p.isLegend);
            setClubHistory(prev => {
              const h = { ...prev, playerCareers: { ...(prev.playerCareers || {}) } };
              retirees.forEach(p => {
                const career = h.playerCareers[p.name] || { goals: 0, assists: 0, apps: 0, motm: 0, seasons: [] };
                career.retiredAttrs = { ...p.attrs };
                career.retiredPosition = p.position;
                career.retiredAge = p.age;
                career.retiredNationality = p.nationality;
                career.retiredSeason = seasonNumber;
                h.playerCareers[p.name] = career;
              });
              return h;
            });

            // Keep existing legends from previous prestiges
            const existingLegends = squad.filter(p => p.isLegend).map(p => ({
              ...p, legendAppearances: 0, seasonStarts: 0, seasonSubApps: 0,
            }));

            // Generate fresh squad clustered around old cap so team stays competitive
            const oldCap = getOvrCap(newPrestige - 1);
            const freshSquad = generatePrestigeSquad(oldCap, getOvrCap(newPrestige));
            const fullSquad = [...freshSquad, ...existingLegends, ...newLegends];

            // Reset game state
            setPrestigeLevel(newPrestige);
            setLeagueTier(NUM_TIERS);
            setSquad(fullSquad.map(p => ({ ...p, seasonStartOvr: getOverall(p) })));
            const newXI = autoSelectXI(freshSquad, formation);
            setStartingXI(newXI);
            setBench(autoSelectBench(freshSquad, newXI));
            setSlotAssignments(null);

            // Regenerate leagues
            const rosters = leagueRosters || initLeagueRosters();
            if (!leagueRosters) setLeagueRosters(rosters);
            const newLeague = initLeague(fullSquad, teamName, NUM_TIERS, rosters, null, newPrestige);
            setLeague(newLeague);
            const newCup = initCup(teamName, NUM_TIERS, rosters);
            setCup(newCup);
            const nextAILeagues = {};
            for (let t = 1; t <= NUM_TIERS; t++) {
              if (t === NUM_TIERS) continue;
              const ai = initAILeague(t, rosters, null, newPrestige);
              if (ai) nextAILeagues[t] = ai;
            }
            setAllLeagueStates(nextAILeagues);
            const cal = buildSeasonCalendar(newLeague.fixtures.length, newCup, !!getModifier(NUM_TIERS).knockoutAtEnd, !!getModifier(NUM_TIERS).miniTournament);
            setSeasonCalendar(cal);
            setCalendarIndex(0);
            setCalendarResults({});
            setLeagueResults({});
            setMatchPending(false);
            setSummerPhase(null);
            setSummerData(null);
            setMatchResult(null);
            setCupMatchResult(null);
            setSeasonNumber(prev => prev + 1);
            setRetiringPlayers(new Set());
            setPlayerSeasonStats({});
            setPlayerRatingTracker({});
            setMotmTracker({});
            // Sentiment partial carry-over on prestige reset
            setFanSentiment(Math.round(useGameStore.getState().fanSentiment * 0.5 + 25));
            setBoardSentiment(Math.round(useGameStore.getState().boardSentiment * 0.5 + 25));
            // League modifier intro message for new tier
            const prestigeMod = getModifier(NUM_TIERS);
            if (prestigeMod.inboxIntro) {
              setInboxMessages(prev => [...prev, {
                id: `msg_league_intro_${Date.now()}`, week: 1, season: (seasonNumber || 1) + 1,
                icon: prestigeMod.inboxIntro.icon, title: prestigeMod.inboxIntro.title,
                body: prestigeMod.inboxIntro.body, color: LEAGUE_DEFS[NUM_TIERS]?.color || C.textMuted,
                read: false,
              }]);
            }
            // Reset tier-specific state for prestige reset
            cardedPlayerIdsRef.current = new Set();
            setDynastyCupQualifiers(null);
            setDynastyCupBracket(null);
            setMiniTournamentBracket(null);
            setFiveASideSquad(null);
            // setShowFiveASidePicker removed
            aiPredictionRef.current = null;

            // Generate prestige-scaled trial player for new season
            const newCap = getOvrCap(newPrestige);
            const trialP = generateTrialPlayer(newCap);
            const trialWeek = rand(2, 5);
            const nextSeason = (seasonNumber || 1) + 1;
            setInboxMessages(prev => [...prev.filter(m => m.type !== "trial_offer" || m.choiceResult), {
              id: "msg_trial_" + trialP.id, week: trialWeek, season: nextSeason,
              icon: "🌍", title: `Trial Suggested: ${trialP.name}`,
              body: `Your scout reports: "${trialP.name}, a ${trialP.age}-year-old ${trialP.position} from ${trialP.countryLabel} ${trialP.flag}, is over here on holiday and is showing promise. He's available for a 3-week trial if you have space in your squad."`,
              color: C.green, read: false, type: "trial_offer", trialPlayerData: trialP,
              pendingUntilWeek: trialWeek,
              choices: [{ label: "Accept Trial", value: "accept" }, { label: "Decline", value: "decline" }],
            }]);
          }}
        />
      )}

      {summerPhase === "intake" && summerData?.youthCandidates && showYouthIntake && !weekTransition && (
        <YouthIntakeScreen
          intake={{ candidates: summerData.youthCandidates, retirees: summerData.retirees || [] }}
          squadSize={squad.filter(p => !p.isLegend).length}
          isMobile={isMobile}
          ovrCap={ovrCap}
          onClose={() => setShowYouthIntake(false)}
          onDone={(chosen) => {
            if (chosen.length > 0) {
              // Stamp joinedSeason for Band of Brothers tracking
              const stamped = chosen.map(p => ({ ...p, joinedSeason: (seasonNumber || 1) + 1, seasonStartOvr: getOverall(p) }));
              setSquad(prev => [...prev, ...stamped]);
            }
            // Remember Me? — recruited an ex-trial player
            if (chosen.length > 0 && trialHistory.length > 0) {
              const impressedNames = trialHistory.filter(t => t.impressed).map(t => t.name);
              const recruited = chosen.filter(c => impressedNames.includes(c.name));
              if (recruited.length > 0 && !unlockedAchievements.has("remember_me")) {
                setUnlockedAchievements(prev => { const n = new Set(prev); n.add("remember_me"); return n; });
                setAchievementQueue(prev => [...prev, "remember_me"]);
                // Send "Signed!" message for each recruited trial player
                recruited.forEach(r => {
                  const trial = trialHistory.find(t => t.impressed && t.name === r.name);
                  setInboxMessages(prev => [...prev, {
                    id: `msg_trial_signed_${Date.now()}_${r.name}`, week: 1, season: (seasonNumber || 1) + 1,
                    icon: "🎉", color: C.green,
                    title: `${r.name} Signed!`,
                    body: `${r.name} ${trial?.flag || ""} has impressed enough during his trial to earn a permanent deal. The fans are buzzing — they can't wait to see him in the ${teamName} shirt again. Welcome aboard, ${r.name.split(" ")[0]}!`,
                    read: false,
                  }]);
                });
              }
            }
            // Scout's Honour — signed 3 different trial players across career
            if (!unlockedAchievements.has("scouts_honour") && trialHistory.length > 0) {
              const impressedNames = trialHistory.filter(t => t.impressed).map(t => t.name);
              // Count how many impressed trials are now in squad or have career history (meaning they were recruited)
              let recruitedCount = 0;
              for (const name of impressedNames) {
                const inSquad = [...(squad || []), ...(chosen || [])].some(p => p.name === name);
                const inHistory = clubHistory?.playerCareers?.[name]?.apps > 0;
                if (inSquad || inHistory) recruitedCount++;
              }
              if (recruitedCount >= 3) {
                setUnlockedAchievements(prev => { const n = new Set(prev); n.add("scouts_honour"); return n; });
                setAchievementQueue(prev => [...prev, "scouts_honour"]);
              }
            }
            // Story arc: trial recruited tracking
            if (chosen.length > 0 && trialHistory.length > 0) {
              const impressedNames = trialHistory.filter(t => t.impressed).map(t => t.name);
              if (chosen.some(c => impressedNames.includes(c.name))) {
                setStoryArcs(prev => {
                  const next = {...prev};
                  ARC_CATS.forEach(cat => {
                    const cs = next[cat];
                    if (!cs || cs.completed) return;
                    next[cat] = {...cs, tracking:{...(cs.tracking||{}), trialRecruited:true}};
                  });
                  return next;
                });
              }
            }
            // Fresh Blood — signed 3 youth in one intake
            if (chosen.length >= 3 && !unlockedAchievements.has("fresh_blood")) {
              setUnlockedAchievements(prev => { const n = new Set(prev); n.add("fresh_blood"); return n; });
              setAchievementQueue(prev => [...prev, "fresh_blood"]);
            }
            // Season 5 milestone
            if (seasonNumber >= 5 && !unlockedAchievements.has("season_5")) {
              setUnlockedAchievements(prev => { const n = new Set(prev); n.add("season_5"); return n; });
              setAchievementQueue(prev => [...prev, "season_5"]);
            }
            // Started From The Bottom — win the league at The Federation or above
            if (summerData.moveType === "stayed" && summerData.fromTier <= 5 && summerData.position === 1 && leagueTier <= 5) {
              if (!unlockedAchievements.has("from_the_bottom") && seasonNumber >= 5) {
                setUnlockedAchievements(prev => { const n = new Set(prev); n.add("from_the_bottom"); return n; });
                setAchievementQueue(prev => [...prev, "from_the_bottom"]);
              }
            }
            // Now init the new season
            const newTier = (() => {
              const raw = summerData.toTier;
              // HARD SAFETY: never jump more than 1 tier in either direction
              const from = summerData.fromTier || leagueTier;
              if (raw < from - 1) return from - 1;
              if (raw > from + 1) return from + 1;
              // Clamp to valid range
              return Math.max(1, Math.min(NUM_TIERS, raw));
            })();
            {
              // Archive completed season into club history
              // Use pre-retirement squad so retired players are still included
              const archiveSquad = summerData.preRetirementSquad || squad;

              // === TOTS Email ===
              try {
                const nameHash = (name) => { let h = 0; for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0; return (Math.abs(h) % 100) / 100; };
                const totsCandidates = [];
                const mwCount = league?.fixtures?.length || 18;
                // Player squad
                if (playerSeasonStats && archiveSquad) {
                  archiveSquad.forEach(p => {
                    const s = playerSeasonStats[p.name] || {};
                    const ratings = (playerRatingTracker || {})[p.name] || [];
                    const avgR = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
                    if ((s.apps || 0) < 5) return;
                    totsCandidates.push({ name: p.name, position: p.position, teamName: teamName, isPlayerTeam: true, goals: s.goals || 0, avgRating: avgR ? parseFloat(avgR.toFixed(1)) : null, apps: s.apps || 0 });
                  });
                }
                // AI teams
                league.teams.forEach((team, teamIdx) => {
                  if (team.isPlayer || !team.squad) return;
                  const row = league.table?.find(r => r.teamIndex === teamIdx);
                  if (!row) return;
                  const played = row.won + row.drawn + row.lost;
                  if (played === 0) return;
                  const wr = row.won / played, dr = row.drawn / played;
                  const gpg = row.goalsFor / played, cpg = row.goalsAgainst / played;
                  const tb = 6.0 + wr * 1.6 + dr * 0.4 + Math.min(gpg * 0.15, 0.4) - Math.min(cpg * 0.1, 0.3);
                  team.squad.forEach(p => {
                    if (p.isBench) return;
                    const key = `${p.name}|${teamIdx}`;
                    const goals = leagueResults ? Object.values(leagueResults).reduce((acc, mw) => acc + (mw || []).reduce((a2, m) => a2 + (m.goalScorers || []).filter(g => g.name === p.name && (g.side === "home" ? m.home : m.away) === teamIdx).length, 0), 0) : 0;
                    const cards = leagueResults ? Object.values(leagueResults).reduce((acc, mw) => acc + (mw || []).reduce((a2, m) => a2 + (m.cardRecipients || []).filter(c => c.name === p.name && c.teamIdx === teamIdx).length, 0), 0) : 0;
                    const pt = POSITION_TYPES[p.position] || "MID";
                    let r = tb;
                    const gpgP = goals / played;
                    if (pt === "FWD") r += gpgP * 1.5; else if (pt === "MID") r += gpgP * 2.5; else if (pt === "DEF") r += gpgP * 4.0; else r += gpgP * 3.0;
                    if (pt === "GK" || pt === "DEF") r += Math.max(0, (1.0 - cpg) * 0.4);
                    r -= (cards / played) * 0.3;
                    r += (nameHash(p.name) - 0.5) * 0.6;
                    r = Math.max(5.5, Math.min(9.5, r));
                    totsCandidates.push({ name: p.name, position: p.position, teamName: team.name, isPlayerTeam: false, goals, avgRating: parseFloat(r.toFixed(1)), apps: played });
                  });
                });
                totsCandidates.forEach(c => { c.score = (c.avgRating || 6.0) * 10 + c.goals * 1.5 + c.apps * 0.2; });
                const totsPos = ["GK","LB","CB","CB","RB","CM","CM","AM","LW","RW","ST"];
                const usedTots = new Set();
                const totsXI = [];
                for (const pos of totsPos) {
                  const el = totsCandidates.filter(c => c.position === pos && !usedTots.has(`${c.name}|${c.teamName}`)).sort((a, b) => b.score - a.score);
                  if (el.length > 0) { usedTots.add(`${el[0].name}|${el[0].teamName}`); totsXI.push(el[0]); }
                }
                if (totsXI.length > 0) {
                  const playerCount = totsXI.filter(p => p.isPlayerTeam).length;
                  const lines = totsXI.map(p => `${p.position} ${p.name} (${p.teamName}) — ${p.goals > 0 ? p.goals + "⚽ " : ""}${p.avgRating?.toFixed(1) || "—"}`);
                  const teamCounts = {};
                  totsXI.forEach(p => { teamCounts[p.teamName] = (teamCounts[p.teamName] || 0) + 1; });
                  const mostRep = Object.entries(teamCounts).sort((a, b) => b[1] - a[1])[0];
                  setInboxMessages(pm => [...pm, {
                    id: `msg_tots_s${seasonNumber}_${Date.now()}`, week: 1, season: (seasonNumber || 1) + 1,
                    icon: "🌟", color: C.gold,
                    title: `Team of the Season · S${seasonNumber}`,
                    body: `The ${summerData.leagueName || "league"} TOTS is in!\n${playerCount > 0 ? `🟢 ${playerCount} of your players made the XI` : "None of your players made the cut"}\n${mostRep ? `${mostRep[0]} lead with ${mostRep[1]} selections` : ""}\n\n${lines.join("\n")}`,
                    read: false,
                  }]);
                  // TOTS achievements
                  if (playerCount > 0) {
                    const totsAchs = [];
                    const tier = summerData.fromTier || leagueTier;
                    if (tier === 7 && !unlockedAchievements.has("tots_league_one")) totsAchs.push("tots_league_one");
                    if (tier === 6 && !unlockedAchievements.has("tots_championship")) totsAchs.push("tots_championship");
                    if (tier <= 5 && !unlockedAchievements.has("tots_premier")) totsAchs.push("tots_premier");
                    if (tier <= 5 && playerCount >= 3 && !unlockedAchievements.has("tots_premier_3")) totsAchs.push("tots_premier_3");
                    if (tier <= 5 && playerCount >= 5 && !unlockedAchievements.has("tots_premier_5")) totsAchs.push("tots_premier_5");
                    if (totsAchs.length > 0) {
                      setUnlockedAchievements(prev => { const n = new Set(prev); totsAchs.forEach(id => n.add(id)); return n; });
                      setAchievementQueue(prev => { const ex = new Set(prev); const f = totsAchs.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
                    }
                  }
                }
              } catch(err) { console.error("TOTS email error:", err); }
              setClubHistory(prev => {
                const h = JSON.parse(JSON.stringify(prev || {}));
                if (!h.playerCareers) h.playerCareers = {};
                if (!h.allTimeXI) h.allTimeXI = {};
                if (!h.seasonArchive) h.seasonArchive = [];

                // Find season standings
                const sorted = sortStandings(league?.table || []);
                const playerRow = sorted.find(r => league?.teams[r.teamIndex]?.isPlayer);
                const position = playerRow ? sorted.indexOf(playerRow) + 1 : 0;
                const points = playerRow?.points || 0;

                // Update best season finish
                const currentTierVal = summerData.fromTier;
                if (!h.bestSeasonFinish || currentTierVal < h.bestSeasonFinish.tier || (currentTierVal === h.bestSeasonFinish.tier && position < h.bestSeasonFinish.position)) {
                  h.bestSeasonFinish = { position, tier: currentTierVal, season: seasonNumber, leagueName: summerData.leagueName };
                }
                if (points > (h.bestSeasonPoints || 0)) h.bestSeasonPoints = points;

                // Find top scorer
                let topScorer = null;
                let topGoals = 0;
                Object.entries(playerSeasonStats).forEach(([name, s]) => {
                  if (s.goals > topGoals) { topGoals = s.goals; topScorer = name; }
                });

                // Archive the season summary
                h.seasonArchive.push({
                  season: seasonNumber,
                  tier: currentTierVal,
                  leagueName: summerData.leagueName,
                  position,
                  points,
                  topScorer: topScorer ? `${topScorer} (${topGoals})` : "N/A",
                  result: summerData.moveType,
                });

                // Archive cup history
                if (!h.cupHistory) h.cupHistory = [];
                if (cup && cup.winner) {
                  const finalRound = cup.rounds?.[cup.rounds.length - 1];
                  const finalMatch = finalRound?.matches?.find(m => m.result && !m.result.bye);
                  let runnerUp = null;
                  if (finalMatch) {
                    runnerUp = finalMatch.result?.winner?.name === finalMatch.home?.name
                      ? finalMatch.away : finalMatch.home;
                  }
                  // Determine player's cup result
                  let playerCupResult = "Did not enter";
                  if (cup.playerEliminated) {
                    // Find which round player was eliminated
                    for (let ri = 0; ri < cup.rounds.length; ri++) {
                      const rnd = cup.rounds[ri];
                      const pm = rnd.matches?.find(m => m.result && (m.home?.isPlayer || m.away?.isPlayer));
                      if (pm && !pm.result?.winner?.isPlayer) {
                        playerCupResult = `Eliminated in ${rnd.name}`;
                        break;
                      }
                    }
                  } else if (cup.winner.isPlayer) {
                    playerCupResult = "Winner 🏆";
                  }
                  h.cupHistory.push({
                    season: seasonNumber,
                    cupName: cup.cupName || "Cup",
                    winner: cup.winner.name,
                    winnerIsPlayer: cup.winner.isPlayer,
                    runnerUp: runnerUp?.name || "Unknown",
                    runnerUpIsPlayer: runnerUp?.isPlayer || false,
                    playerResult: playerCupResult,
                  });
                }

                // Accumulate player career stats
                Object.entries(playerSeasonStats).forEach(([name, s]) => {
                  if (!h.playerCareers[name]) h.playerCareers[name] = { goals: 0, assists: 0, apps: 0, motm: 0, yellows: 0, reds: 0, seasons: [] };
                  const career = h.playerCareers[name];
                  career.goals += s.goals || 0;
                  career.assists = (career.assists || 0) + (s.assists || 0);
                  career.apps += s.apps || 0;
                  career.motm += s.motm || 0;
                  career.yellows += s.yellows || 0;
                  career.reds += s.reds || 0;
                  // Compute avg rating for this season
                  const ratings = playerRatingTracker[name] || [];
                  const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;
                  const p = archiveSquad.find(pl => pl.name === name);
                  career.seasons.push({
                    season: seasonNumber,
                    position: p?.position || s.position || "?",
                    avgRating: Math.round(avgRating * 100) / 100,
                    goals: s.goals || 0,
                    assists: s.assists || 0,
                    apps: s.apps || 0,
                  });
                });

                // Store snapshot of retiring players for Testimonial Match ticket
                (summerData.retirees || []).forEach(retiree => {
                  const career = h.playerCareers[retiree.name];
                  if (career) {
                    career.retiredAttrs = { ...retiree.attrs };
                    career.retiredPosition = retiree.position;
                    career.retiredAge = retiree.age;
                    career.retiredNationality = retiree.nationality;
                    career.retiredSeason = seasonNumber;
                  }
                });

                // Update All-Time XI — best single-season avg rating, dynamic formation
                const allFormations = {
                  "4-3-3":   [
                    { slot: "GK", positions: ["GK"] }, { slot: "LB", positions: ["LB"] }, { slot: "CB1", positions: ["CB"] }, { slot: "CB2", positions: ["CB"] }, { slot: "RB", positions: ["RB"] },
                    { slot: "CM1", positions: ["CM"] }, { slot: "CM2", positions: ["CM"] }, { slot: "AM", positions: ["AM", "CM"] },
                    { slot: "LW", positions: ["LW"] }, { slot: "ST", positions: ["ST"] }, { slot: "RW", positions: ["RW"] },
                  ],
                  "4-4-2":   [
                    { slot: "GK", positions: ["GK"] }, { slot: "LB", positions: ["LB"] }, { slot: "CB1", positions: ["CB"] }, { slot: "CB2", positions: ["CB"] }, { slot: "RB", positions: ["RB"] },
                    { slot: "LM", positions: ["LW", "CM", "AM"] }, { slot: "CM1", positions: ["CM"] }, { slot: "CM2", positions: ["CM"] }, { slot: "RM", positions: ["RW", "CM", "AM"] },
                    { slot: "ST1", positions: ["ST"] }, { slot: "ST2", positions: ["ST"] },
                  ],
                  "4-5-1":   [
                    { slot: "GK", positions: ["GK"] }, { slot: "LB", positions: ["LB"] }, { slot: "CB1", positions: ["CB"] }, { slot: "CB2", positions: ["CB"] }, { slot: "RB", positions: ["RB"] },
                    { slot: "LM", positions: ["LW", "CM", "AM"] }, { slot: "CM1", positions: ["CM"] }, { slot: "CM2", positions: ["CM"] }, { slot: "CM3", positions: ["CM", "AM"] }, { slot: "RM", positions: ["RW", "CM", "AM"] },
                    { slot: "ST", positions: ["ST"] },
                  ],
                  "3-5-2":   [
                    { slot: "GK", positions: ["GK"] }, { slot: "CB1", positions: ["CB"] }, { slot: "CB2", positions: ["CB"] }, { slot: "CB3", positions: ["CB", "RB", "LB"] },
                    { slot: "LWB", positions: ["LB", "LW"] }, { slot: "CM1", positions: ["CM"] }, { slot: "CM2", positions: ["CM", "AM"] }, { slot: "CM3", positions: ["CM"] }, { slot: "RWB", positions: ["RB", "RW"] },
                    { slot: "ST1", positions: ["ST"] }, { slot: "ST2", positions: ["ST"] },
                  ],
                  "3-4-3":   [
                    { slot: "GK", positions: ["GK"] }, { slot: "CB1", positions: ["CB"] }, { slot: "CB2", positions: ["CB"] }, { slot: "CB3", positions: ["CB", "RB", "LB"] },
                    { slot: "LM", positions: ["LW", "LB", "CM"] }, { slot: "CM1", positions: ["CM"] }, { slot: "CM2", positions: ["CM", "AM"] }, { slot: "RM", positions: ["RW", "RB", "CM"] },
                    { slot: "LW", positions: ["LW", "ST"] }, { slot: "ST", positions: ["ST"] }, { slot: "RW", positions: ["RW", "ST"] },
                  ],
                  "4-2-3-1": [
                    { slot: "GK", positions: ["GK"] }, { slot: "LB", positions: ["LB"] }, { slot: "CB1", positions: ["CB"] }, { slot: "CB2", positions: ["CB"] }, { slot: "RB", positions: ["RB"] },
                    { slot: "DM1", positions: ["CM"] }, { slot: "DM2", positions: ["CM"] },
                    { slot: "LAM", positions: ["LW", "AM", "CM"] }, { slot: "CAM", positions: ["AM", "CM"] }, { slot: "RAM", positions: ["RW", "AM", "CM"] },
                    { slot: "ST", positions: ["ST"] },
                  ],
                };

                // Collect all candidates this season for All-Time XI
                const candidates = Object.entries(playerSeasonStats).map(([name, s]) => {
                  const ratings = playerRatingTracker[name] || [];
                  const avgRating = ratings.length >= 3 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;
                  const p = archiveSquad.find(pl => pl.name === name);
                  const position = p?.position || s.position || "?";
                  const nationality = p?.nationality || s.nationality;
                  return { name, position, avgRating, apps: s.apps || 0, season: seasonNumber, nationality };
                }).filter(c => c.avgRating > 0 && c.apps >= 5);

                // Pool: all existing archived + this season's candidates
                const archPool = Object.values(h.allTimeXI).filter(Boolean).map(v => ({ name: v.name, position: v.position, avgRating: v.avgRating }));
                const pool = [...candidates, ...archPool];
                let bestFmt = "4-3-3", bestScore = -1;
                for (const [fname, fslots] of Object.entries(allFormations)) {
                  let score = 0; const used = new Set();
                  for (const s of fslots) {
                    const elig = pool.filter(c => s.positions.includes(c.position) && !used.has(c.name));
                    if (elig.length > 0) { const b = elig.sort((a, bb) => bb.avgRating - a.avgRating)[0]; score += b.avgRating; used.add(b.name); }
                  }
                  if (score > bestScore) { bestScore = score; bestFmt = fname; }
                }
                const chosenSlots = allFormations[bestFmt];
                h.allTimeFormation = bestFmt;

                // Rebuild allTimeXI with chosen formation
                const newXI = {};
                const usedNames = new Set();
                // Migrate existing archived entries that fit
                chosenSlots.forEach(({ slot, positions }) => {
                  if (h.allTimeXI[slot] && positions.includes(h.allTimeXI[slot].position) && !usedNames.has(h.allTimeXI[slot].name)) {
                    newXI[slot] = h.allTimeXI[slot];
                    usedNames.add(h.allTimeXI[slot].name);
                  }
                });
                // Fill from archived entries by position
                chosenSlots.forEach(({ slot, positions }) => {
                  if (newXI[slot]) return;
                  const fits = Object.values(h.allTimeXI).filter(v => v && positions.includes(v.position) && !usedNames.has(v.name));
                  if (fits.length > 0) {
                    const best = fits.sort((a, b) => b.avgRating - a.avgRating)[0];
                    newXI[slot] = best;
                    usedNames.add(best.name);
                  }
                });
                // Layer this season's candidates
                chosenSlots.forEach(({ slot, positions }) => {
                  const eligible = candidates.filter(c => positions.includes(c.position) && !usedNames.has(c.name));
                  if (eligible.length > 0) {
                    const best = eligible.sort((a, b) => b.avgRating - a.avgRating)[0];
                    const current = newXI[slot];
                    if (!current || best.avgRating > current.avgRating) {
                      if (current?.name) usedNames.delete(current.name);
                      newXI[slot] = { name: best.name, position: best.position, season: best.season, avgRating: best.avgRating, apps: best.apps, nationality: best.nationality };
                      usedNames.add(best.name);
                    }
                  }
                });
                h.allTimeXI = newXI;

                // Check All-Timers: all 11 slots filled with 7.0+ rating
                const xiValues = Object.values(newXI).filter(Boolean);
                if (xiValues.length >= 11 && !unlockedAchievements.has("all_timers")) {
                  if (xiValues.every(v => v.avgRating >= 7.0)) {
                    setUnlockedAchievements(prev2 => { const n = new Set(prev2); n.add("all_timers"); return n; });
                    setAchievementQueue(prev2 => [...prev2, "all_timers"]);
                  }
                }
                // Check Brexit: all 11 slots filled with British nationalities
                const britishCodes = new Set(["ENG", "WAL", "SCO", "NIR"]);
                if (xiValues.length >= 11 && !unlockedAchievements.has("brexit")) {
                  if (xiValues.every(v => v.nationality && britishCodes.has(v.nationality))) {
                    setUnlockedAchievements(prev2 => { const n = new Set(prev2); n.add("brexit"); return n; });
                    setAchievementQueue(prev2 => [...prev2, "brexit"]);
                  }
                }

                return h;
              });
            } // end season archiving
            { // New season init — always runs
              setLeagueTier(newTier);
              setSeasonNumber(prev => prev + 1);
              // Reset season-specific arc tracking
              setStoryArcs(prev => {
                const next = {...prev};
                ARC_CATS.forEach(cat => {
                  const cs = next[cat];
                  if (!cs || cs.completed) return;
                  const t = {...(cs.tracking||{})};
                  t.homeWinStreak = 0; t.homeCleanSheets = 0;
                  t.homeLost = false; t.seasonEnded = false;
                  next[cat] = {...cs, tracking: t};
                });
                return next;
              });
              setSquad(prev => {
                const agingYears = getModifier(leagueTier).agingYearsPerSeason || 1;
                const aged = prev.map(p => ({ ...p, age: p.age + agingYears }));
                // Veteran achievement — player reaches 42
                if (!unlockedAchievements.has("veteran") && aged.some(p => p.age >= 42)) {
                  setUnlockedAchievements(prev2 => { const n = new Set(prev2); n.add("veteran"); return n; });
                  setAchievementQueue(prev2 => [...prev2, "veteran"]);
                }
                const newRetiring = checkRetirements(aged, seasonNumber + 1);
                setRetiringPlayers(newRetiring);
                return aged.map(p => ({ ...p, seasonStartOvr: getOverall(p) }));
              });
              const rosters = summerData.newRosters || leagueRosters || initLeagueRosters();

              // Collect all AI squads from current season, then evolve them
              const squadMap = new Map();
              league.teams.forEach(t => { if (!t.isPlayer && t.squad) squadMap.set(t.name, t.squad); });
              Object.values(allLeagueStates).forEach(als => {
                (als.teams || []).forEach(t => { if (t.squad) squadMap.set(t.name, t.squad); });
              });
              const evolvedSquads = new Map();
              for (let t = 1; t <= NUM_TIERS; t++) {
                for (const cfg of (rosters[t] || [])) {
                  const sq = squadMap.get(cfg.name);
                  if (!sq) continue;
                  if (!cfg.squadPhilosophy) cfg.squadPhilosophy = generateSquadPhilosophy(cfg.trait);
                  evolvedSquads.set(cfg.name, evolveAISquad(sq, t, cfg.trait, cfg.squadPhilosophy, prestigeLevel));
                }
              }

              setLeagueRosters(rosters);
              const newLeague2 = initLeague(squad, teamName, newTier, rosters, evolvedSquads, prestigeLevel);
              setLeague(newLeague2);
              // matchweekIndex derived from calendarIndex — setCalendarIndex(0) below handles it
              // Reinit AI leagues for the new season — preserved squads carry over
              const nextAILeagues = {};
              for (let t = 1; t <= NUM_TIERS; t++) {
                if (t === newTier) continue;
                const ai = initAILeague(t, rosters, evolvedSquads, prestigeLevel);
                if (ai) nextAILeagues[t] = ai;
              }
              setAllLeagueStates(nextAILeagues);
              const newSeasonCup = initCup(teamName, newTier, rosters);
              const newCal = buildSeasonCalendar(newLeague2.fixtures.length, newSeasonCup, !!getModifier(newTier).knockoutAtEnd, !!getModifier(newTier).miniTournament);
              setSeasonCalendar(newCal);
              setCalendarIndex(0);
              setCalendarResults({});
              // Accumulate league-wide all-time stats before wiping
              setAllTimeLeagueStats(prev => {
                const next = { scorers: { ...prev.scorers }, assisters: { ...(prev.assisters || {}) }, cards: { ...prev.cards } };
                // AI teams from leagueResults
                Object.values(leagueResults || {}).forEach(mwResults => {
                  (mwResults || []).forEach(match => {
                    (match.goalScorers || []).forEach(g => {
                      const teamIdx = g.side === "home" ? match.home : match.away;
                      const team = league?.teams?.[teamIdx];
                      if (!team) return;
                      const key = `${g.name}|${team.name}`;
                      next.scorers[key] = (next.scorers[key] || 0) + 1;
                      if (g.assister) {
                        const aKey = `${g.assister}|${team.name}`;
                        next.assisters[aKey] = (next.assisters[aKey] || 0) + 1;
                      }
                    });
                    (match.cardRecipients || []).forEach(c => {
                      const team = league?.teams?.[c.teamIdx];
                      if (!team) return;
                      const key = `${c.name}|${team.name}`;
                      next.cards[key] = (next.cards[key] || 0) + 1;
                    });
                  });
                });
                // Player's team from playerSeasonStats (overwrite to avoid double-counting)
                if (playerSeasonStats) {
                  Object.entries(playerSeasonStats).forEach(([name, s]) => {
                    const key = `${name}|${teamName}`;
                    // Use clubHistory career totals if available (most accurate)
                    const career = clubHistory?.playerCareers?.[name];
                    if (career) {
                      const totalGoals = (career.goals || 0) + (s.goals || 0);
                      const totalAssists = (career.assists || 0) + (s.assists || 0);
                      const totalCards = (career.yellows || 0) + (career.reds || 0) + (s.yellows || 0) + (s.reds || 0);
                      if (totalGoals > 0) next.scorers[key] = totalGoals;
                      if (totalAssists > 0) next.assisters[key] = totalAssists;
                      if (totalCards > 0) next.cards[key] = totalCards;
                    } else {
                      if (s.goals > 0) next.scorers[key] = (next.scorers[key] || 0) + (s.goals || 0);
                      if (s.assists > 0) next.assisters[key] = (next.assisters[key] || 0) + (s.assists || 0);
                      const cards = (s.yellows || 0) + (s.reds || 0);
                      if (cards > 0) next.cards[key] = (next.cards[key] || 0) + cards;
                    }
                  });
                }
                // Etched In Stone — check if player's team tops all-time scorers
                if (!unlockedAchievements.has("all_time_top")) {
                  const sortedAllTime = Object.entries(next.scorers).sort((a, b) => b[1] - a[1]);
                  if (sortedAllTime.length > 0 && sortedAllTime[0][0].endsWith(`|${teamName}`)) {
                    setUnlockedAchievements(prev2 => { const n2 = new Set(prev2); n2.add("all_time_top"); return n2; });
                    setAchievementQueue(prev2 => [...prev2, "all_time_top"]);
                  }
                }
                return next;
              });
              setLeagueResults({});
              setSeasonCards(0);
              setSeasonCleanSheets(0);
              setSeasonGoalsFor(0);
              setSeasonDraws(0);
              setSeasonHomeUnbeaten(true);
              setSeasonAwayWins(0);
              setSeasonAwayGames(0);
              setMotmTracker({});
              setStScoredConsecutive(0);
              setPlayerRatingTracker({});
              setPlayerSeasonStats({});
              // Reset appearance counters for the new season
              setSquad(prev => prev.map(p => ({ ...p, seasonStarts: 0, seasonSubApps: 0, ...(p.isLegend ? { legendAppearances: 0 } : {}) })));
              setBeatenTeams(new Set());
              // Sentiment partial carry-over: ×0.5 + 25 (100→75, 50→50, 0→25)
              setFanSentiment(Math.round(useGameStore.getState().fanSentiment * 0.5 + 25));
              setBoardSentiment(Math.round(useGameStore.getState().boardSentiment * 0.5 + 25));
              setHalfwayPosition(null);
              setPlayerInjuryCount({});
              setSeasonInjuryLog({});
              setBenchStreaks({});
              setHighScoringMatches(0);
              setFormationsWonWith(new Set());
              setHolidayMatchesThisSeason(0);
              setFastMatchesThisSeason(0);
              setGkCleanSheets({});
              // Save current squad IDs for New Era achievement detection next season
              setPrevSeasonSquadIds(useGameStore.getState().squad.map(p => p.id));
              // recentScorelines persists across seasons (it's a rolling window)
              // secondPlaceFinishes persists across seasons (it's a career stat)
              // usedTicketTypes persists across seasons (it's a career stat)
              // freeAgentSignings persists across seasons (it's a career stat)
              setCup(newSeasonCup);
              // Generate new trial player for next season
              const nextTrialP = generateTrialPlayer(ovrCap);
              // Story arc: trial stat boosts
              const trialBoost = (storyArcs?.bonuses?.trialStatBoost || 0) + (storyArcs?.bonuses?.nextTrialBoost || 0);
              if (trialBoost > 0) {
                ATTRIBUTES.forEach(({ key }) => { nextTrialP.attrs[key] = Math.min(ovrCap, (nextTrialP.attrs[key]||0) + trialBoost); });
              }
              // Clear one-time nextTrialBoost after use
              if (storyArcs?.bonuses?.nextTrialBoost) {
                setStoryArcs(prev => {
                  const nb = {...(prev.bonuses||{})};
                  delete nb.nextTrialBoost;
                  if (nb.nextTrialReveal) delete nb.nextTrialReveal;
                  return {...prev, bonuses: nb};
                });
              }
              const nextTrialWeek = rand(2, 5);
              const nextSeason = (seasonNumber || 1) + 1;
              setInboxMessages(prev => [...prev.filter(m => m.type !== "trial_offer" || m.choiceResult), {
                id: "msg_trial_" + nextTrialP.id, week: nextTrialWeek, season: nextSeason,
                icon: "🌍", title: `Trial Suggested: ${nextTrialP.name}`,
                body: `Your scout reports: "${nextTrialP.name}, a ${nextTrialP.age}-year-old ${nextTrialP.position} from ${nextTrialP.countryLabel} ${nextTrialP.flag}, is over here on holiday and is showing promise. He's available for a 3-week trial if you have space in your squad."`,
                color: C.green, read: false, type: "trial_offer", trialPlayerData: nextTrialP,
                pendingUntilWeek: nextTrialWeek,
                choices: [{ label: "Accept Trial", value: "accept" }, { label: "Decline", value: "decline" }],
              }]);
              setTrialPlayer(null); // Clear any lingering trial
              // League modifier intro message for new season
              const newSeasonMod = getModifier(newTier);
              if (newSeasonMod.inboxIntro) {
                setInboxMessages(prev => [...prev, {
                  id: `msg_league_mod_${newTier}_s${nextSeason}`, week: 1, season: nextSeason,
                  icon: newSeasonMod.inboxIntro.icon, title: newSeasonMod.inboxIntro.title,
                  body: newSeasonMod.inboxIntro.body, color: LEAGUE_DEFS[newTier]?.color || C.textMuted,
                  read: false,
                }]);
              }
              // Single-fixture opponents announcement (Dynasty / Mini-Tournament tiers)
              if (newLeague2.singleFixtureOpponents) {
                const sfo = newLeague2.singleFixtureOpponents;
                const sfMod = getModifier(newTier);
                const sfTourney = sfMod.miniTournament ? "5v5 Mini-Tournament" : "Dynasty Cup knockout phase";
                const sfMDs = newLeague2.fixtures?.length || 18;
                const sfNames = sfo.map(o => o.name).join(" and ");
                setInboxMessages(prev => [...prev, {
                  id: `msg_single_fix_s${nextSeason}`, week: 1, season: nextSeason,
                  icon: "📋", title: "Condensed Fixture List",
                  body: `Due to the ${sfTourney} at the end of the season, the league has been compressed to ${sfMDs} matchdays.\n\nYou'll only face ${sfNames} once this season. Make it count.`,
                  color: LEAGUE_DEFS[newTier]?.color || C.textMuted, read: false,
                }]);
              }
              // Tier-specific bonus tickets for new season
              if (newSeasonMod.saudiAgentTickets) {
                setTickets(prev => [...prev, ...Array.from({ length: newSeasonMod.saudiAgentTickets }, (_, i) => ({ id: `t_sa_${Date.now()}_${i}`, type: "saudi_agent" }))]);
              }
              if (newSeasonMod.rewindTickets) {
                setTickets(prev => [...prev, ...Array.from({ length: newSeasonMod.rewindTickets }, (_, i) => ({ id: `t_rw_${Date.now()}_${i}`, type: "rewind" }))]);
              }
              // Reset tier-specific state for new season
              cardedPlayerIdsRef.current = new Set();
              setDynastyCupQualifiers(null);
              setDynastyCupBracket(null);
              setMiniTournamentBracket(null);
              setFiveASideSquad(null);
              aiPredictionRef.current = null;

              // === PRODIGAL SON NARRATIVE ===
              // Triggers once, in season 2+, if not already active/completed
              if (nextSeason >= 2 && !prodigalSon) {
                const tierTeams = (rosters && rosters[newTier]) || LEAGUE_DEFS[newTier]?.teams || [];
                if (tierTeams.length > 0) {
                  const formerClub = tierTeams[rand(0, tierTeams.length - 1)].name;
                  const prodigalP = generateProdigalPlayer(formerClub, ovrCap);
                  const scoutWeek = rand(4, 6);
                  const offerWeek = scoutWeek + 2;
                  setProdigalSon({
                    phase: "scout_tip", playerId: prodigalP.id, playerName: prodigalP.name,
                    formerClub, position: prodigalP.position, playerData: prodigalP,
                    starts: 0, goals: 0, wonVsFormer: false, consecutiveBenched: 0,
                    sentFlags: {},
                  });
                  setInboxMessages(prev => [...prev,
                    {
                      id: `msg_prodigal_scout_${Date.now()}`, week: scoutWeek, season: nextSeason,
                      icon: "📋", color: "#f59e0b",
                      title: `Released Player: ${prodigalP.name}`,
                      body: `Boss, ${prodigalP.name}'s been let go by ${formerClub}. Been training on his own since. The quality's obvious but his fitness has dropped right off. I've had a word with his agent — he's available if we want him.`,
                      read: false, pendingUntilWeek: scoutWeek,
                    },
                    {
                      id: `msg_prodigal_offer_${Date.now()}`, week: offerWeek, season: nextSeason,
                      icon: "📝", color: "#f59e0b",
                      title: `${prodigalP.name} — Decision Needed`,
                      body: `${prodigalP.name} (${prodigalP.position}, 25) is willing to come in on reduced terms. He knows he has to earn his place. Do you want to bring him in?`,
                      read: false, pendingUntilWeek: offerWeek,
                      type: "prodigal_offer", prodigalPlayerData: prodigalP,
                      choices: [{ label: "Sign Him", value: "accept" }, { label: "Pass", value: "decline" }],
                    },
                  ]);
                }
              }

              // === TRIAL HISTORY PHASE PROGRESSION ===
              // Process entries that need to advance to next phase
              const nextSeason2 = nextSeason;
              setTrialHistory(prev => {
                const newMessages = [];
                const updated = prev.map(entry => {
                  if (!entry.phase || entry.phase === "done") return entry;
                  
                  // Phase 1 → 2: "on_trial" → "signed" (next season after departure)
                  if (entry.phase === "on_trial" && entry.departureSeason < nextSeason2) {
                    newMessages.push({
                      id: `msg_trial_signed_${Date.now()}_${entry.name}`,
                      week: 1, season: nextSeason2,
                      icon: "📰", color: C.lightRed,
                      title: `${entry.name} Signs for ${entry.rivalTeam}`,
                      body: `${entry.name} ${entry.flag || ""} has signed a permanent deal with ${entry.rivalTeam} after impressing on trial there. One that got away?`,
                      read: false,
                    });
                    // Boost rival team strength in rosters (search all tiers in case they moved)
                    if (rosters) {
                      for (let tierKey = 1; tierKey <= NUM_TIERS; tierKey++) {
                        if (!rosters[tierKey]) continue;
                        const rivalCfg = rosters[tierKey].find(t => t.name === entry.rivalTeam);
                        if (rivalCfg) {
                          rivalCfg.strength = Math.min(0.95, (rivalCfg.strength || 0.5) + 0.05);
                          break;
                        }
                      }
                    }
                    return { ...entry, phase: "signed" };
                  }
                  
                  // Phase 2 → 3: "signed" → check for "star" (2+ seasons after departure)
                  if (entry.phase === "signed" && entry.departureSeason + 2 <= nextSeason2) {
                    // Check if rival team finished in top half of their league last season
                    const sorted = sortStandings(league?.table || []);
                    const rivalIdx = sorted.findIndex(row => {
                      const t = league?.teams?.[row.teamIndex];
                      return t && t.name === entry.rivalTeam;
                    });
                    const isTopHalf = rivalIdx >= 0 && rivalIdx < Math.ceil(sorted.length / 2);
                    if (isTopHalf) {
                      const rivalPos = rivalIdx + 1;
                      const posStr = rivalPos === 1 ? "1st" : rivalPos === 2 ? "2nd" : rivalPos === 3 ? "3rd" : `${rivalPos}th`;
                      newMessages.push({
                        id: `msg_trial_star_${Date.now()}_${entry.name}`,
                        week: 1, season: nextSeason2,
                        icon: "⭐", color: C.amber,
                        title: `${entry.name} Is ${entry.rivalTeam}'s Star Player`,
                        body: `${entry.name} ${entry.flag || ""} has been in sensational form for ${entry.rivalTeam}, who finished ${posStr} last season. He could have been yours...`,
                        read: false,
                      });
                      return { ...entry, phase: "done" };
                    }
                    // Rival didn't do well — skip the star message, just mark done
                    return { ...entry, phase: "done" };
                  }
                  
                  return entry;
                });
                // Queue new messages
                if (newMessages.length > 0) {
                  setInboxMessages(p => [...p, ...newMessages]);
                }
                return updated;
              });
            }
            // After intake, one more summer week remains (Well Rested + Preview combined)
            setSummerPhase("break");
            setSummerData(prev => ({...(prev || {}), weeksLeft: 1}));
          }}
        />
      )}

      {/* Player unlock reveal — only shown once achievement queue is drained */}
      {pendingPlayerUnlock && achievementQueue.length === 0 && (() => {
        const scaledUnlocks = [].concat(pendingPlayerUnlock).map(u => createUnlockablePlayer(u, seasonNumber, ovrCap));
        return (
          <PlayerUnlockReveal
            players={scaledUnlocks}
            onDone={() => {
              setSquad(prev => {
                let next = [...prev];
                for (const np of scaledUnlocks) {
                  if (!next.some(p => p.id === np.id)) next.push(np);
                }
                return next;
              });
              setPendingPlayerUnlock(null);
            }}
          />
        );
      })()}

      {/* Achievement toast */}
      {achievementQueue.length > 0 && !isOnHoliday && (
        <AchievementToast
          key={achievementQueue[0] + "-" + achievementToastKeyRef.current}
          achievement={achievementQueue[0]}
          muteSound={false}
          onDone={() => {
            achievementToastKeyRef.current++;
            setAchievementQueue(prev => prev.slice(1));
          }}
        />
      )}


      {/* Squad full alert modal */}
      {squadFullAlert && (
        <div style={{ ...MODAL.backdrop }}>
          <div style={{
            ...MODAL.box, border: `3px solid ${C.red}`,
            padding: isMobile ? "20px 16px" : "28px 32px",
            maxWidth: 400, width: isMobile ? "90%" : "auto",
            boxShadow: "0 0 50px rgba(239,68,68,0.3), inset 0 0 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{ fontSize: isMobile ? F.xs : F.sm, color: C.red, marginBottom: 16, letterSpacing: 2 }}>
              🚫 SQUAD FULL
            </div>
            <div style={{ fontSize: F.micro, color: C.text, lineHeight: 1.8, marginBottom: 24 }}>
              Squad is full (25/25).
              <br />
              Release a player first to make room.
            </div>
            <button onClick={() => setSquadFullAlert(false)} style={{
              ...BTN.danger, padding: "10px 24px", fontSize: isMobile ? F.micro : F.xs,
            }}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Week transition loading overlay */}
      {weekTransition && !isOnHoliday && (
        <WeekTransitionOverlay />
      )}

      {/* Holiday mode overlay */}
      {isOnHoliday && (
        <HolidayOverlay
          currentMatchweek={matchweekIndex}
          targetMatchweek={holidayTargetRef.current || 0}
          startMatchweek={holidayStartMatchweekRef.current || 0}
          onReturn={() => {
            // Stop holiday interval
            if (holidayIntervalRef.current) {
              clearInterval(holidayIntervalRef.current);
              holidayIntervalRef.current = null;
            }
            holidayTargetRef.current = null;
            setIsOnHoliday(false);
            setInstantMatch(false); // Restore normal match speed
            // Clear any stale match/popup state
            setMatchResult(null);
            setCupMatchResult(null);
            setProcessing(false);
            setMatchPending(false);
            setArcStepQueue([]);
            // Navigate to Home tab
            setShowAchievements(false); setShowTable(false); setShowCalendar(false);
            setShowCup(false); setShowTransfers(false); setShowLegends(false); setShowSquad(false);
          }}
        />
      )}

      {/* Global AITeamPanel — opened from any screen via onTeamClick */}
      {viewingTeamGlobal && (
        <AITeamPanel
          team={viewingTeamGlobal.team}
          tableRow={viewingTeamGlobal.tableRow}
          seasonGoals={viewingTeamGlobal.seasonGoals}
          seasonAssists={viewingTeamGlobal.seasonAssists}
          onClose={() => setViewingTeamGlobal(null)}
          onPlayerClick={(player) => resolveAnyPlayer(player)}
          clubRelationships={clubRelationships}
          transferFocus={transferFocus}
          onSetFocus={handleFocusSet}
          onRemoveFocus={handleFocusRemove}
          onReplaceFocus={handleFocusReplace}
          ovrCap={ovrCap}
        />
      )}

      {/* Global PlayerPanel — for viewing players from non-squad screens (league/cup/dashboard) */}
      {selectedPlayer && !showSquad && (() => {
        const p = squad.find(sp => sp.id === selectedPlayer.id) || selectedPlayer;
        const isAI = !squad.find(sp => sp.id === p.id) && p.clubName;
        return (
          <PlayerPanel
            player={p}
            ovrCap={ovrCap}
            onClose={() => setSelectedPlayer(null)}
            onToggleShortlist={handleToggleShortlist}
            shortlist={shortlist}
            {...(isAI ? { tradeContext: {
              aiClubName: p.clubName,
              aiClubTier: p.clubTier,
              aiClubColor: p.clubColor,
              aiClubLeague: LEAGUE_DEFS[p.clubTier]?.shortName,
              relationship: (clubRelationships[p.clubName] || {}).pct || 0,
              transferWindowOpen: !!transferWindowOpen,
              transferWindowWeeksRemaining,
              onMakeOffer: (player) => {
                const allTeams = [];
                if (allLeagueStates) {
                  for (const tk of Object.keys(allLeagueStates)) {
                    for (const tm of (allLeagueStates[tk]?.teams || [])) {
                      if (tm.name === player.clubName) allTeams.push(tm);
                    }
                  }
                }
                const club = allTeams[0];
                setPendingTradeTarget({
                  player,
                  clubName: player.clubName,
                  clubColor: player.clubColor || club?.color || C.textMuted,
                  clubTier: player.clubTier || leagueTier,
                  squad: club?.squad || [],
                });
                setSelectedPlayer(null);
                setShowAchievements(false); setShowTable(false); setShowCalendar(false); setShowCup(false); setShowTransfers(false); setShowLegends(false); setShowSquad(false);
                setShowTransfers(true);
              },
            }} : {})}
          />
        );
      })()}
    </div>
  );
}

export default FootballManager;
