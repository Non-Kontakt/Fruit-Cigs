import { useCallback } from "react";
import { useGameStore } from "../store/gameStore.js";
import { POSITION_TYPES } from "../data/positions.js";
import { ATTRIBUTES } from "../data/training.js";
import { LEAGUE_DEFS, NUM_TIERS } from "../data/leagues.js";
import { ARC_CATS } from "../data/storyArcs.js";
import { MSG } from "../data/messages.js";
import { getModifier } from "../data/leagueModifiers.js";
import { rand, getOverall } from "../utils/calc.js";
import { generateFreeAgent, generatePrestigeSquad, generateYouthIntake, generateTrialPlayer, generateProdigalPlayer, autoSelectXI, autoSelectBench, checkRetirements, evolveAISquad, generateSquadPhilosophy, getOvrCap } from "../utils/player.js";
import { sortStandings, initLeagueRosters, initLeague, initAILeague, initCup, buildSeasonCalendar, buildLeagueHistorySnapshot } from "../utils/league.js";
import { emptyCompetitionStats, rollIntoAllTime, getTopScorers, computeTeamOfCup } from "../utils/competitionStats.js";
import { archivePlayerSeason, deriveCupLabels, findCareerKey } from "../utils/careerLedger.js";
import { applyLegendCarry } from "../utils/achievements.js";
import { createInboxMessage } from "../utils/messageUtils.js";
import { pickWonderkidCandidate } from "../utils/wonderkidScout.js";
import { getClubFocusBonuses, pendingSeasonGrants, markSeasonGranted, isDeferredOneOffPending } from "../utils/clubFocuses.js";
import { defaultClubFocuses } from "../data/clubFocuses.js";
import { getNatFlag } from "../utils/player.js";

const DEFAULT_FIXTURE_COUNT = 18;

// Roll every populated tier/cup season blob into its matching all-time
// slot before the season-end paths clear the season stores. Also runs
// the Etched In Stone check against the post-roll closing-tier all-time
// league blob (Option A: top of the player's current division's chart).
function finalizeSeasonStatsIntoAllTime({
  setAllTimeLeagueStatsByTier, setAllTimeCupStatsByCup,
  seasonLeagueStatsByTier, seasonCupStatsByCup,
  closingTier, teamName, unlockedAchievements, tryUnlockAchievement,
}) {
  setAllTimeLeagueStatsByTier(prevAll => {
    const nextAll = { ...(prevAll || {}) };
    for (const [tierKey, seasonBlob] of Object.entries(seasonLeagueStatsByTier || {})) {
      const tierAllTime = nextAll[tierKey] || emptyCompetitionStats();
      nextAll[tierKey] = rollIntoAllTime(tierAllTime, seasonBlob);
    }
    if (tryUnlockAchievement && !unlockedAchievements?.has?.("all_time_top")) {
      const closingBlob = nextAll[closingTier] || emptyCompetitionStats();
      const top = getTopScorers(closingBlob, 1)[0];
      if (top && top.teamName === teamName) {
        tryUnlockAchievement("all_time_top");
      }
    }
    return nextAll;
  });
  setAllTimeCupStatsByCup(prevAll => {
    const nextAll = { ...(prevAll || {}) };
    for (const [key, seasonBlob] of Object.entries(seasonCupStatsByCup || {})) {
      const cupAllTime = nextAll[key] || emptyCompetitionStats();
      nextAll[key] = rollIntoAllTime(cupAllTime, seasonBlob);
    }
    return nextAll;
  });
}

/**
 * Extracts the season-end onDone callbacks from App.jsx: SeasonEndReveal
 * (summary consumption + prestige trigger), PrestigeScreen, the
 * LegendSelectionScreen prestige reset, and the YouthIntakeScreen rollover
 * into the new season. Sibling of useSeasonFlow, which drives the summer
 * weeks around these screens.
 *
 * All game state is read fresh from useGameStore.getState() at the top of
 * each callback — while the player sits on a season-end screen the store and
 * the render closure agree, so the entry snapshot is equivalent to the
 * closure reads this code used inside App.jsx. Reads that follow a setter
 * within the same flow deliberately re-read the freshly committed value via
 * useGameStore.getState() — do not consolidate them into the entry snapshot.
 *
 * The prestige reset (legend selection) and the normal-path reset (youth
 * intake) are intentionally hand-duplicated with small divergences (e.g.
 * only prestige clears dossierBurns); do not de-duplicate them. The two
 * setClubHistory writes for a prestige season (seasonArchive at the reveal,
 * playerCareers at legend selection) are separate store writes by design.
 *
 * Only React useState setters and component-local callbacks that can't live
 * in Zustand are passed as params.
 */
export function useSeasonEnd({
  tryUnlockAchievement,
  cardedPlayerIdsRef,
  setMatchResult,
  setCupMatchResult,
}) {
  const onSeasonEndRevealDone = useCallback(() => {
    const s = useGameStore.getState();
    const {
      calendarIndex, clubHistory, clubFocuses, league, playerSeasonStats, prestigeLevel, retiringPlayers,
      seasonNumber, squad, storyArcs, summerData, trialHistory, unlockedAchievements,
      setBench, setClubFocuses, setClubHistory, setInboxMessages, setRetiringPlayers, setSquad, setStartingXI,
      setSummerData, setSummerPhase, setYouthCoupActive,
    } = s;
    const ovrCap = getOvrCap(prestigeLevel);
    // Same store read twice for the same field — read once.
    const retirementSquad = squad;
    // Process retirements
    const retirees = retirementSquad.filter(p => retiringPlayers.has(p.id));
    // Save squad snapshot before retirements for season archiving
    const preRetirementSquad = [...retirementSquad];  // Use ref!
    // Testimonial achievement — retiring player with 30+ career apps.
    // playerId-first lookup so a renamed retiree's history still counts.
    if (!unlockedAchievements.has("testimonial")) {
      for (const p of retirees) {
        const ckey = findCareerKey(clubHistory?.playerCareers, { playerId: p.id, name: p.name });
        const career = ckey ? clubHistory?.playerCareers?.[ckey] : null;
        const currentStats = playerSeasonStats[p.name];
        const careerApps = (career?.apps || 0) + (currentStats?.apps || 0);
        if (careerApps >= 30) {
          tryUnlockAchievement("testimonial");
          break;
        }
      }
    }
    // End Of An Era — 3+ players retiring at end of one season
    if (!unlockedAchievements.has("end_of_an_era") && retirees.length >= 3) {
      tryUnlockAchievement("end_of_an_era");
    }
    // Time Dilation — player retires in the Intergalactic Elite
    if (!unlockedAchievements.has("time_dilation") && retirees.length > 0 && summerData.fromTier === 1) {
      tryUnlockAchievement("time_dilation");
    }
    // Inbox: brief retirement notification per notable retiree
    // (100+ apps OR 30+ goals — same threshold as the SeasonEndReveal
    // Departed section). playerId-first lookup as above.
    retirees.forEach(p => {
      const ckey = findCareerKey(clubHistory?.playerCareers, { playerId: p.id, name: p.name });
      const career = ckey ? clubHistory?.playerCareers?.[ckey] : null;
      const currentStats = playerSeasonStats[p.name];
      const apps = (career?.apps || 0) + (currentStats?.apps || 0);
      const goals = (career?.goals || 0) + (currentStats?.goals || 0);
      if (apps >= 100 || goals >= 30) {
        setInboxMessages(prev => [...prev, createInboxMessage(
          MSG.retirementNotable(p.name, apps, goals),
          { calendarIndex, seasonNumber },
        )]);
      }
    });
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
      // Archive the prestige season before resetting
      setClubHistory(prev => {
        const h = JSON.parse(JSON.stringify(prev || {}));
        if (!h.seasonArchive) h.seasonArchive = [];
        const sorted = sortStandings(league?.table || []);
        const playerRow = sorted.find(r => league?.teams[r.teamIndex]?.isPlayer);
        const position = playerRow ? sorted.indexOf(playerRow) + 1 : 0;
        const points = playerRow?.points || 0;
        const currentTierVal = summerData.fromTier;
        if (!h.bestSeasonFinish || currentTierVal < h.bestSeasonFinish.tier || (currentTierVal === h.bestSeasonFinish.tier && position < h.bestSeasonFinish.position)) {
          h.bestSeasonFinish = { position, tier: currentTierVal, season: seasonNumber, leagueName: summerData.leagueName };
        }
        if (points > (h.bestSeasonPoints || 0)) h.bestSeasonPoints = points;
        let topScorer = null, topGoals = 0;
        Object.entries(playerSeasonStats).forEach(([name, s]) => { if (s.goals > topGoals) { topGoals = s.goals; topScorer = name; } });
        h.seasonArchive.push({
          season: seasonNumber, tier: currentTierVal, leagueName: summerData.leagueName,
          position, points, topScorer: topScorer ? `${topScorer} (${topGoals})` : "N/A",
          result: "prestige", prestigeLevel: prestigeLevel || 0,
          // Snapshot how many Club Focuses were completed before the wormhole
          // reset wipes the tree (the reset itself lands in legend selection).
          clubFocusesCompleted: (clubFocuses?.completedIds || []).length,
        });
        return h;
      });
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
    // Story arc youth stat boost + Club Focus (Proper Coaching Badges) intake
    // floor pull the same lever — combine them into one boost applied here.
    const focusFloor = getClubFocusBonuses(clubFocuses).intakeFloorBonus || 0;
    const youthBoost = (storyArcs?.bonuses?.youthStatBoost || 0) + focusFloor;
    if (youthBoost > 0) {
      candidates.forEach(c => {
        ATTRIBUTES.forEach(({ key }) => { c.attrs[key] = Math.min(14, (c.attrs[key]||0) + youthBoost); });
      });
    }
    // Club Focus (Under-9s Bake Sale) one-off: the next intake turns up one
    // extra candidate. Consumed by stamping seasonGrants[bake_sale] so it
    // never fires again (reusing the ledger keeps the persisted shape).
    if (isDeferredOneOffPending(clubFocuses, "extra_intake_candidate")) {
      // Generate one more prospect, name-unique against the squad + this
      // intake, and apply the same combined youth boost the others got.
      const extra = generateYouthIntake(new Set(), [...squad, ...candidates], false, ovrCap)[0];
      if (extra) {
        if (youthBoost > 0) ATTRIBUTES.forEach(({ key }) => { extra.attrs[key] = Math.min(14, (extra.attrs[key]||0) + youthBoost); });
        candidates.push(extra);
      }
      setClubFocuses(prev => markSeasonGranted(prev, "bake_sale", seasonNumber));
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
      retirees: retirees.map(p => ({ id: p.id, name: p.name, position: p.position, age: p.age, attrs: { ...p.attrs }, nationality: p.nationality })),
      youthCandidates: candidates,
      preRetirementSquad,
      weeksLeft: 4,
    }));
    setRetiringPlayers(new Set());
    setSummerPhase("break");
  }, []); // All state read from getState()

  const onPrestigeDone = useCallback(() => {
    useGameStore.getState().setSummerPhase("legendSelect");
  }, []);

  const onLegendSelectionDone = useCallback((selectedIds) => {
    const s = useGameStore.getState();
    const {
      allLeagueStates, cup, formation, gameMode, league, leagueRosters, leagueTier,
      playerRatingNames, playerRatingTracker, playerSeasonStats, prestigeLevel,
      seasonCupStatsByCup, seasonLeagueStatsByTier, seasonNumber, squad, teamName,
      unlockedAchievements,
      setAllLeagueStates, setAllTimeCupStatsByCup, setAllTimeLeagueStatsByTier, setBench,
      setBoardSentiment, setBreakoutsThisSeason, setCalendarIndex, setCalendarResults,
      setClubFocuses, setClubHistory, setCup, setDossierBurns, setDynastyCupBracket, setDynastyCupQualifiers,
      setFanSentiment, setFanSentimentSeasonFloor, setFavouriteStarts, setFiveASideSquad,
      setHatTrickHeadlinePlayers, setInboxMessages, setLeague, setLeagueHistory, setLeagueResults,
      setLeagueRosters, setLeagueTier, setLegendCarryCounts, setLoyaltyWatch, setManualSlotIndices,
      setMatchPending, setMiniTournamentBracket, setMotmTracker, setOffersRejectedThisWindow,
      setPlayerMatchLog, setPlayerRatingNames, setPlayerRatingTracker, setPlayerSeasonStats,
      setPrestigeLevel, setPrevStartingXI, setRetiringPlayers, setScoutRevealMeta,
      setSeasonCalendar, setSeasonCupStatsAvailable, setSeasonCupStatsByCup,
      setSeasonLeagueStatsAvailable, setSeasonLeagueStatsByTier, setSeasonNumber,
      setSlotAssignments, setSquad, setStartingXI, setSummerData, setSummerPhase,
      setTransferOffers, setTransferWindowOpen, setTransferWindowWeeksRemaining,
    } = s;
    const newPrestige = prestigeLevel + 1;
    const legCap = getOvrCap(newPrestige);

    // Prestige/Legends meta achievements — evaluated on the
    // player's own confirmed choice, before any of the reset logic
    // below touches prestigeLevel/squad.
    if (!unlockedAchievements.has("new_game_plus") && newPrestige === 1) tryUnlockAchievement("new_game_plus");
    if (!unlockedAchievements.has("groundhog_season") && newPrestige >= 3) tryUnlockAchievement("groundhog_season");
    if (!unlockedAchievements.has("chosen_few") && selectedIds.length === 5) tryUnlockAchievement("chosen_few");
    if (!unlockedAchievements.has("travelling_light") && selectedIds.length === 0) tryUnlockAchievement("travelling_light");
    if (!unlockedAchievements.has("double_down") && gameMode === "ironman") tryUnlockAchievement("double_down");

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

    // Prestige is a real season-end too — archive the closing
    // season's career stats before marking retirees, so the final
    // prestige season isn't dropped from the player ledger.
    const retirees = squad.filter(p => !selectedIds.includes(p.id) && !p.isLegend);
    setClubHistory(prev => {
      let careers = archivePlayerSeason(prev?.playerCareers || {}, {
        squad,
        playerSeasonStats,
        playerTierSeasonStats: seasonLeagueStatsByTier?.[leagueTier] || null,
        seasonCupStatsByCup,
        cupLabels: deriveCupLabels(cup),
        playerRatingTracker,
        playerRatingNames,
        season: seasonNumber,
        tier: leagueTier,
        leagueName: league?.leagueName,
      });
      // Mark retirement metadata on retiree careers (post-archive so
      // the closing season's stats are already folded in). Resolve
      // the career key by playerId first so a renamed player's
      // metadata attaches to the existing entry rather than forking
      // a new one under the new name.
      const next = { ...careers };
      retirees.forEach(p => {
        const key = findCareerKey(next, { playerId: p.id, name: p.name });
        const existing = next[key] || { goals: 0, assists: 0, apps: 0, motm: 0, seasons: [] };
        next[key] = {
          ...existing,
          retiredAttrs: { ...p.attrs },
          retiredPosition: p.position,
          retiredAge: p.age,
          retiredNationality: p.nationality,
          retiredSeason: seasonNumber,
        };
      });
      return { ...prev, playerCareers: next };
    });

    // Keep existing legends from previous prestiges
    const existingLegends = squad.filter(p => p.isLegend).map(p => ({
      ...p, legendAppearances: 0, seasonStarts: 0, seasonSubApps: 0,
    }));

    // Museum Piece — bump legendCarryCounts for every player carried
    // forward as a Legend at this boundary: already-existing Legends
    // (always retained automatically) plus any newly named this
    // time. Unlocks once the same player id has been carried across
    // two separate prestiges.
    {
      const carriedLegendIds = [...existingLegends, ...newLegends].map(p => p.id);
      const { counts: nextLegendCarryCounts, unlocked: museumPieceEarned } = applyLegendCarry(
        useGameStore.getState().legendCarryCounts, carriedLegendIds,
      );
      setLegendCarryCounts(nextLegendCarryCounts);
      if (museumPieceEarned && !unlockedAchievements.has("museum_piece")) tryUnlockAchievement("museum_piece");
    }

    // Generate fresh squad clustered around old cap so team stays competitive
    const oldCap = getOvrCap(newPrestige - 1);
    const freshSquad = generatePrestigeSquad(oldCap, getOvrCap(newPrestige));
    const fullSquad = [...freshSquad, ...existingLegends, ...newLegends];

    // Reset game state
    setPrestigeLevel(newPrestige);
    setLeagueTier(NUM_TIERS);
    setSquad(fullSquad.map(p => ({ ...p, seasonStartOvr: getOverall(p), seasonStartAttrs: { ...p.attrs } })));
    const newXI = autoSelectXI(freshSquad, formation);
    setStartingXI(newXI);
    setBench(autoSelectBench(freshSquad, newXI));
    setSlotAssignments(null);
    setManualSlotIndices(new Set());

    // Regenerate leagues
    const rosters = leagueRosters || initLeagueRosters(teamName);
    if (!leagueRosters) setLeagueRosters(rosters);
    // Snapshot the closing season's full standings for every
    // division BEFORE the league objects get rebuilt below —
    // `league`/`allLeagueStates` still hold the final tables here.
    setLeagueHistory(prev => ({ ...prev, [seasonNumber]: buildLeagueHistorySnapshot(leagueTier, league, allLeagueStates) }));
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
    // Prestige is a real season-end too — fold the closing season's
    // canonical stats into all-time before wiping the season stores.
    // The closing tier is the current `leagueTier` (the prestige tier
    // change to NUM_TIERS happens further down).
    finalizeSeasonStatsIntoAllTime({
      setAllTimeLeagueStatsByTier, setAllTimeCupStatsByCup,
      seasonLeagueStatsByTier, seasonCupStatsByCup,
      closingTier: leagueTier,
      teamName, unlockedAchievements, tryUnlockAchievement,
    });
    setLeagueResults({});
    setSeasonLeagueStatsByTier({});
    setSeasonLeagueStatsAvailable(true);
    setSeasonCupStatsByCup({});
    setSeasonCupStatsAvailable(true);
    setMatchPending(false);
    setSummerPhase(null);
    setSummerData(null);
    setMatchResult(null);
    setCupMatchResult(null);
    setSeasonNumber(prev => prev + 1);
    // Prune recurring messages from previous seasons
    {
      const newSN = (seasonNumber || 1) + 1;
      const RECURRING_PREFIXES = ["msg_train_", "msg_md_", "msg_cup_", "msg_lopsided_", "card-skip-"];
      const NARRATIVE_EXEMPT = ["msg_cup_hope_", "msg_cup_reprieve_"];
      const isRecurring = (id) => RECURRING_PREFIXES.some(p => id?.startsWith(p)) && !NARRATIVE_EXEMPT.some(p => id?.startsWith(p));
      setInboxMessages(prev => prev.filter(m => !isRecurring(m.id) || m.season >= newSN));
    }
    setRetiringPlayers(new Set());
    setPlayerSeasonStats({});
    setPlayerRatingTracker({});
    setPlayerRatingNames({});
    setPlayerMatchLog({});
    setBreakoutsThisSeason(new Map());
    setPrevStartingXI(null);
    setMotmTracker({});
    setHatTrickHeadlinePlayers([]);
    setFavouriteStarts({});
    useGameStore.getState().setWonLeagueOnHoliday(false);
    // Sentiment partial carry-over on prestige reset
    const newPrestigeFanSentiment = Math.round(useGameStore.getState().fanSentiment * 0.5 + 25);
    setFanSentiment(newPrestigeFanSentiment);
    // The People's Champion floor resets to the newly-carried
    // sentiment for the new era, not 100 — setFanSentiment above
    // only ever lowers the floor (Math.min), so it must be reset
    // explicitly here rather than left to that side effect.
    setFanSentimentSeasonFloor(newPrestigeFanSentiment);
    setBoardSentiment(Math.round(useGameStore.getState().boardSentiment * 0.5 + 25));
    // League modifier intro message for new tier
    const prestigeMod = getModifier(NUM_TIERS);
    if (prestigeMod.inboxIntro) {
      setInboxMessages(prev => [...prev, createInboxMessage(
        MSG.leagueModIntroPrestige(prestigeMod, NUM_TIERS),
        { calendarIndex: 0, seasonNumber: (seasonNumber || 1) + 1 },
      )]);
    }
    // Reset tier-specific state for prestige reset
    cardedPlayerIdsRef.current = new Set();
    setDynastyCupQualifiers(null);
    setDynastyCupBracket(null);
    setMiniTournamentBracket(null);
    setFiveASideSquad(null);
    setTransferWindowOpen(false);
    setTransferWindowWeeksRemaining(0);
    setTransferOffers([]);
    setOffersRejectedThisWindow(0);
    setLoyaltyWatch(null);
    // Squad-scoped scouting metadata — the squad is fully wiped by
    // prestige, so any pending reveal/burn record can never match
    // again. wonderkidTips and passiveRevealSignings are career-long
    // and survive.
    setScoutRevealMeta({});
    setDossierBurns({});
    // Club Focus tree resets with the wormhole — a fresh era starts an empty
    // tree, so post-prestige season grants are naturally none.
    setClubFocuses(defaultClubFocuses());
    // setShowFiveASidePicker removed

    // Generate prestige-scaled trial player for new season
    const newCap = getOvrCap(newPrestige);
    const trialP = generateTrialPlayer(newCap, new Set(useGameStore.getState().squad.map(p => p.name)));
    const trialWeek = rand(2, 5);
    const nextSeason = (seasonNumber || 1) + 1;
    setInboxMessages(prev => [...prev.filter(m => m.type !== "trial_offer" || m.choiceResult), createInboxMessage(
      MSG.trialOffer(trialP, trialWeek),
      { calendarIndex: 0, seasonNumber: nextSeason },
    )]);
  }, []); // All state read from getState()

  const onYouthIntakeDone = useCallback((chosen) => {
    const s = useGameStore.getState();
    const {
      allLeagueStates, clubFocuses, clubHistory, cup, league, leagueResults, leagueRosters, leagueTier,
      playerRatingNames, playerRatingTracker, playerSeasonStats, prestigeLevel, prodigalSon,
      seasonCupStatsByCup, seasonLeagueStatsByTier, seasonNumber, squad, storyArcs, summerData,
      teamName, trialHistory, unlockedAchievements, setClubFocuses, setScoutedPlayers, setShortlist,
      setAllLeagueStates, setAllTimeCupStatsByCup, setAllTimeLeagueStatsByTier, setBeatenTeams,
      setBenchStreaks, setBoardSentiment, setBreakoutsThisSeason, setCalendarIndex,
      setCalendarResults, setClubHistory, setCup, setDynastyCupBracket, setDynastyCupQualifiers,
      setFanSentiment, setFanSentimentSeasonFloor, setFastMatchesThisSeason, setFavouriteStarts,
      setFiveASideSquad, setFormationsWonWith, setGkCleanSheets, setHalfwayPosition,
      setHatTrickHeadlinePlayers, setHighScoringMatches, setHolidayMatchesThisSeason,
      setInboxMessages, setLeague, setLeagueHistory, setLeagueResults, setLeagueRosters,
      setLeagueTier, setLoyaltyWatch, setMiniTournamentBracket, setMotmTracker,
      setPlayerInjuryCount, setPlayerMatchLog, setPlayerRatingNames, setPlayerRatingTracker,
      setPlayerSeasonStats, setPrevSeasonSquadIds, setPrevStartingXI, setPreviousLeaguePosition,
      setProdigalSon, setRetiringPlayers, setScoutRevealMeta, setSeasonAwayGames,
      setSeasonAwayWins, setSeasonCalendar, setSeasonCards, setSeasonCleanSheets,
      setSeasonCupStatsAvailable, setSeasonCupStatsByCup, setSeasonDraws, setSeasonGoalsFor,
      setSeasonHomeUnbeaten, setSeasonInjuryLog, setSeasonLeagueStatsAvailable,
      setSeasonLeagueStatsByTier, setSeasonNumber, setSquad, setStScoredConsecutive, setStoryArcs,
      setSummerData, setSummerPhase, setTickets, setTrialHistory, setTrialPlayer, setWonderkidTips,
    } = s;
    const ovrCap = getOvrCap(prestigeLevel);
    if (chosen.length > 0) {
      // Stamp joinedSeason for Band of Brothers tracking
      const stamped = chosen.map(p => ({ ...p, joinedSeason: (seasonNumber || 1) + 1, seasonStartOvr: getOverall(p), seasonStartAttrs: { ...p.attrs } }));
      setSquad(prev => [...prev, ...stamped]);
    }
    // Remember Me? — recruited an ex-trial player
    if (chosen.length > 0 && trialHistory.length > 0) {
      const impressedNames = trialHistory.filter(t => t.impressed).map(t => t.name);
      const recruited = chosen.filter(c => impressedNames.includes(c.name));
      if (recruited.length > 0 && !unlockedAchievements.has("remember_me")) {
        tryUnlockAchievement("remember_me");
        // Send "Signed!" message for each recruited trial player
        recruited.forEach(r => {
          const trial = trialHistory.find(t => t.impressed && t.name === r.name);
          setInboxMessages(prev => [...prev, createInboxMessage(
            MSG.trialSignedYouth(r.name, trial?.flag, teamName),
            { calendarIndex: 0, seasonNumber: (seasonNumber || 1) + 1 },
          )]);
        });
      }
    }
    // Scout's Honour — signed 3 different trial players across career
    if (!unlockedAchievements.has("scouts_honour") && trialHistory.length > 0) {
      const impressedNames = trialHistory.filter(t => t.impressed).map(t => t.name);
      // Count how many impressed trials are now in squad or have career history (meaning they were recruited)
      let recruitedCount = 0;
      for (const name of impressedNames) {
        const liveP = [...(squad || []), ...(chosen || [])].find(p => p.name === name);
        const inSquad = !!liveP;
        // Identity-aware history lookup: use the squad player's id when
        // available so a renamed-then-recruited trial still counts.
        const cKey = findCareerKey(clubHistory?.playerCareers, { playerId: liveP?.id, name });
        const inHistory = (cKey ? clubHistory?.playerCareers?.[cKey]?.apps : 0) > 0;
        if (inSquad || inHistory) recruitedCount++;
      }
      if (recruitedCount >= 3) {
        tryUnlockAchievement("scouts_honour");
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
      tryUnlockAchievement("fresh_blood");
    }
    // Season 5 milestone
    if (seasonNumber >= 5 && !unlockedAchievements.has("season_5")) {
      tryUnlockAchievement("season_5");
    }
    // Started From The Bottom — win the league at The Federation or above
    if (summerData.moveType === "stayed" && summerData.fromTier <= 5 && summerData.position === 1 && leagueTier <= 5) {
      if (!unlockedAchievements.has("from_the_bottom") && seasonNumber >= 5) {
        tryUnlockAchievement("from_the_bottom");
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

      // Hoisted out of the TOTS try block below so the Team of the
      // Cup cig-card check (which runs after it, same summer beat)
      // can intersect the two XIs for "Best Of Both" without
      // persisting any new state.
      let totsXIForAchievements = [];

      // === TOTS Email ===
      try {
        const nameHash = (name) => { let h = 0; for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0; return (Math.abs(h) % 100) / 100; };
        const totsCandidates = [];
        const mwCount = league?.fixtures?.length || DEFAULT_FIXTURE_COUNT;
        // Player squad
        if (playerSeasonStats && archiveSquad) {
          archiveSquad.forEach(p => {
            const s = playerSeasonStats[p.name] || {};
            const ratings = (playerRatingTracker || {})[p.id] || [];
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
        totsXIForAchievements = totsXI;
        if (totsXI.length > 0) {
          const playerCount = totsXI.filter(p => p.isPlayerTeam).length;
          const lines = totsXI.map(p => `${p.position} ${p.name} (${p.teamName}) — ${p.goals > 0 ? p.goals + "⚽ " : ""}${p.avgRating?.toFixed(1) || "—"}`);
          const teamCounts = {};
          totsXI.forEach(p => { teamCounts[p.teamName] = (teamCounts[p.teamName] || 0) + 1; });
          const mostRep = Object.entries(teamCounts).sort((a, b) => b[1] - a[1])[0];
          const _totsBody = "The " + (summerData.leagueName || "league") + " TOTS is in!\n" + (playerCount > 0 ? "\uD83D\uDFE2 " + playerCount + " of your players made the XI" : "None of your players made the cut") + "\n" + (mostRep ? mostRep[0] + " lead with " + mostRep[1] + " selections" : "") + "\n\n" + lines.join("\n");
          setInboxMessages(pm => [...pm, createInboxMessage(
            MSG.teamOfTheSeasonDetailed(seasonNumber, _totsBody),
            { calendarIndex: 0, seasonNumber: (seasonNumber || 1) + 1 },
          )]);
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
              totsAchs.forEach(id => tryUnlockAchievement(id));
            }
          }
        }
      } catch(err) { console.error("TOTS email error:", err); }

      // === Team of the Cup cig cards (Kumquat Cigs) ===
      // Mirrors the TOTS achievement block above — computed as a
      // sibling statement (not nested inside the setClubHistory
      // updater just below) so tryUnlockAchievement's own setState
      // calls stay outside another setState's updater function.
      try {
        if (cup && cup.winner) {
          const totcTeamByName = new Map();
          (league?.teams || []).forEach(t => totcTeamByName.set(t.name, t));
          Object.values(allLeagueStates || {}).forEach(st => (st?.teams || []).forEach(t => totcTeamByName.set(t.name, t)));
          const totcXI = computeTeamOfCup({ cup, teamByName: totcTeamByName });
          const playerCount = totcXI.filter(p => p.isPlayerTeam).length;
          if (playerCount > 0) {
            const cupAchs = [];
            if (playerCount >= 3 && !unlockedAchievements.has("cup_runneth_over")) cupAchs.push("cup_runneth_over");
            if (playerCount >= 6 && !unlockedAchievements.has("eleven_out_of_eleven")) cupAchs.push("eleven_out_of_eleven");
            const gkSlot = totcXI.find(p => p.position === "GK");
            if (gkSlot?.isPlayerTeam && !unlockedAchievements.has("cup_keeper")) cupAchs.push("cup_keeper");

            // Beaten But Not Forgotten — made TOTC despite exiting
            // before the final. A final-round exit is "So Close"
            // (cup_final_loss), not this.
            if (cup.playerEliminated && !unlockedAchievements.has("beaten_not_forgotten")) {
              let eliminatedRoundIdx = -1;
              for (let ri = 0; ri < cup.rounds.length; ri++) {
                const rnd = cup.rounds[ri];
                const pm = rnd.matches?.find(m => m.result && (m.home?.isPlayer || m.away?.isPlayer));
                if (pm && !pm.result?.winner?.isPlayer) { eliminatedRoundIdx = ri; break; }
              }
              if (eliminatedRoundIdx >= 0 && eliminatedRoundIdx < cup.rounds.length - 1) {
                cupAchs.push("beaten_not_forgotten");
              }
            }

            // Best Of Both — same player made both TOTS and TOTC this season
            if (totsXIForAchievements.length > 0 && !unlockedAchievements.has("best_of_both")) {
              const totsPlayerNames = new Set(totsXIForAchievements.filter(p => p.isPlayerTeam).map(p => p.name));
              if (totcXI.some(p => p.isPlayerTeam && totsPlayerNames.has(p.name))) cupAchs.push("best_of_both");
            }

            cupAchs.forEach(id => tryUnlockAchievement(id));
          }
        }
      } catch (err) { console.error("Team of the Cup achievement error:", err); }

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
          prestigeLevel: prestigeLevel || 0,
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

        // Player career ledger — broad totals + per-tier / per-cup
        // breakdown from canonical season stores. Pure helper.
        h.playerCareers = archivePlayerSeason(h.playerCareers, {
          squad: archiveSquad,
          playerSeasonStats,
          playerTierSeasonStats: seasonLeagueStatsByTier?.[currentTierVal] || null,
          seasonCupStatsByCup,
          cupLabels: deriveCupLabels(cup),
          playerRatingTracker,
          playerRatingNames,
          season: seasonNumber,
          tier: currentTierVal,
          leagueName: summerData.leagueName,
        });

        // Store snapshot of retiring players for Testimonial Match
        // ticket. Resolve the career key by playerId first so a
        // renamed player's retirement metadata lands on the existing
        // career entry rather than missing it.
        (summerData.retirees || []).forEach(retiree => {
          const key = findCareerKey(h.playerCareers, { playerId: retiree.id, name: retiree.name });
          const career = key ? h.playerCareers[key] : null;
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
          const p = archiveSquad.find(pl => pl.name === name);
          let _rId = p?.id;
          if (!_rId) { const _e = Object.entries(playerRatingNames).find(([, n]) => n === name); _rId = _e?.[0]; }
          const ratings = _rId ? (playerRatingTracker[_rId] || []) : [];
          const avgRating = ratings.length >= 3 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;
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
            tryUnlockAchievement("all_timers");
          }
        }
        // Check Brexit: all 11 slots filled with British nationalities
        const britishCodes = new Set(["ENG", "WAL", "SCO", "NIR"]);
        if (xiValues.length >= 11 && !unlockedAchievements.has("brexit")) {
          if (xiValues.every(v => v.nationality && britishCodes.has(v.nationality))) {
            tryUnlockAchievement("brexit");
          }
        }

        return h;
      });
    } // end season archiving
    { // New season init — always runs
      setLeagueTier(newTier);
      setSeasonNumber(prev => prev + 1);
      // Prune recurring messages from previous seasons
      {
        const newSN = (seasonNumber || 1) + 1;
        const RECURRING_PREFIXES = ["msg_train_", "msg_md_", "msg_cup_", "msg_lopsided_", "card-skip-"];
        const NARRATIVE_EXEMPT = ["msg_cup_hope_", "msg_cup_reprieve_"];
        const isRecurring = (id) => RECURRING_PREFIXES.some(p => id?.startsWith(p)) && !NARRATIVE_EXEMPT.some(p => id?.startsWith(p));
        setInboxMessages(prev => prev.filter(m => !isRecurring(m.id) || m.season >= newSN));
      }
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
          tryUnlockAchievement("veteran");
        }
        const newRetiring = checkRetirements(aged, seasonNumber + 1);
        setRetiringPlayers(newRetiring);
        return aged.map(p => ({ ...p, seasonStartOvr: getOverall(p), seasonStartAttrs: { ...p.attrs } }));
      });
      const rosters = summerData.newRosters || leagueRosters || initLeagueRosters(teamName);

      // Collect all AI squads from current season, then evolve them
      const squadMap = new Map();
      league.teams.forEach(t => { if (!t.isPlayer && t.squad) squadMap.set(t.name, t.squad); });
      Object.values(allLeagueStates).forEach(als => {
        (als.teams || []).forEach(t => { if (t.squad) squadMap.set(t.name, t.squad); });
      });
      // Update AI team trajectories based on season performance
      // Use leagueTier (tier we PLAYED in), not newTier (destination after promotion/relegation)
      for (let t = 1; t <= NUM_TIERS; t++) {
        const tierTable = t === leagueTier ? league?.table
          : allLeagueStates[t]?.table;
        if (!tierTable || !rosters[t]) continue;
        const tierTeams = t === leagueTier ? league?.teams
          : allLeagueStates[t]?.teams;
        if (!tierTeams) continue;
        const sorted = sortStandings(tierTable);
        const strengthSorted = [...(rosters[t] || [])].sort((a, b) => (b.strength || 0) - (a.strength || 0));
        for (const cfg of rosters[t]) {
          const actualPos = sorted.findIndex(r => tierTeams[r.teamIndex]?.name === cfg.name) + 1;
          const expectedPos = strengthSorted.findIndex(c => c.name === cfg.name) + 1;
          if (actualPos === 0 || expectedPos === 0) continue;
          const diff = expectedPos - actualPos; // positive = overperformed
          let traj = cfg.trajectory || 0;
          if (diff >= 3) traj = Math.min(4, traj + 1);
          else if (diff <= -3) traj = Math.max(-4, traj - 1);
          else { if (traj > 0) traj = Math.max(0, traj - 0.5); else if (traj < 0) traj = Math.min(0, traj + 0.5); }
          cfg.trajectory = Math.round(traj * 10) / 10;
        }
      }

      const evolvedSquads = new Map();
      const aiEvents = [];
      for (let t = 1; t <= NUM_TIERS; t++) {
        for (const cfg of (rosters[t] || [])) {
          const sq = squadMap.get(cfg.name);
          if (!sq) continue;
          if (!cfg.squadPhilosophy) cfg.squadPhilosophy = generateSquadPhilosophy(cfg.trait);
          const teamEvents = [];
          evolvedSquads.set(cfg.name, evolveAISquad(sq, t, cfg.trait, cfg.squadPhilosophy, prestigeLevel, cfg.trajectory || 0, teamEvents));
          teamEvents.forEach(e => aiEvents.push({ ...e, teamName: cfg.name, tier: t }));
        }
      }

      // Inbox messages for rare AI events in the player's new tier
      const _nextSN = (seasonNumber || 1) + 1;
      const relevantEvents = aiEvents.filter(e => e.tier === newTier);
      for (const evt of relevantEvents) {
        if (evt.type === "golden_gen") {
          setInboxMessages(prev => [...prev, createInboxMessage({
            id: `msg_ai_golden_gen_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            icon: "\uD83C\uDF1F",
            title: "Scout Report: Golden Generation",
            body: `${evt.teamName} have produced an exceptional youth intake this season. ${evt.count} promising talents have emerged from their academy.`,
            color: "#facc15",
          }, { calendarIndex: 0, seasonNumber: _nextSN })]);
        }
      }

      // Scout Report: Wonderkid \u2014 only ever names a real player who's
      // actually sitting in an AI squad right now (never a name
      // snapshotted mid-generation that might not survive squad
      // trimming). Rarity check first \u2014 this is meant to read as an
      // occasional standout headline, not a weekly occurrence \u2014 then
      // skip silently if nobody currently qualifies.
      if (Math.random() < 0.15) {
        const newTierTeamNames = (rosters[newTier] || []).map(cfg => cfg.name);
        const wonderkid = pickWonderkidCandidate(evolvedSquads, newTierTeamNames);
        if (wonderkid) {
          const { player: wkPlayer, teamName: wkTeam } = wonderkid;
          setInboxMessages(prev => [...prev, createInboxMessage({
            id: `msg_ai_wonderkid_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            icon: "\u2B50",
            title: "Scout Report: Wonderkid",
            body: `Sources say ${wkTeam} have unearthed a generational talent in their youth academy. ${wkPlayer.name} (${wkPlayer.position}, ${wkPlayer.age}) is one to watch.`,
            color: "#facc15",
          }, { calendarIndex: 0, seasonNumber: _nextSN })]);
          // Catch Of The Day \u2014 remember the tipped player's id. The
          // same evolvedSquads objects feed straight into next
          // season's league/AI rosters (see initLeague/initAILeague
          // below), so this id survives into any later trade.
          if (wkPlayer.id != null) setWonderkidTips(prev => new Set(prev).add(wkPlayer.id));
        }
      }

      // Pre-pass: add trial-to-rival players to evolvedSquads BEFORE building leagues
      const nextSeasonPre = (seasonNumber || 1) + 1;
      (useGameStore.getState().trialHistory || []).forEach(entry => {
        if (entry.phase === "on_trial" && entry.departureSeason < nextSeasonPre && entry.rivalTeam && rosters) {
          for (let tk = 1; tk <= NUM_TIERS; tk++) {
            const rivalCfg = (rosters[tk] || []).find(t => t.name === entry.rivalTeam);
            if (!rivalCfg) continue;
            const rivalSquad = evolvedSquads?.get(entry.rivalTeam);
            if (rivalSquad) {
              const rivalOvrCap = getOvrCap(prestigeLevel);
              const rivalAvgOvr = rivalSquad.length > 0
                ? Math.round(rivalSquad.reduce((s, p) => s + getOverall(p), 0) / rivalSquad.length) : 8;
              const generated = generateFreeAgent(tk, rivalAvgOvr, rivalOvrCap, new Set(rivalSquad.map(p => p.name)));
              rivalSquad.push({ ...generated, name: entry.name, position: entry.position || generated.position, nationality: entry.nationality, flag: entry.flag });
            }
            break;
          }
        }
      });

      setLeagueRosters(rosters);
      // Snapshot the closing season's full standings for every
      // division BEFORE the league objects get rebuilt below —
      // `league`/`allLeagueStates` still hold the final tables here.
      setLeagueHistory(prev => ({ ...prev, [seasonNumber]: buildLeagueHistorySnapshot(leagueTier, league, allLeagueStates) }));
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
      finalizeSeasonStatsIntoAllTime({
        setAllTimeLeagueStatsByTier, setAllTimeCupStatsByCup,
        seasonLeagueStatsByTier, seasonCupStatsByCup,
        closingTier: summerData?.fromTier || leagueTier,
        teamName, unlockedAchievements, tryUnlockAchievement,
      });
      setLeagueResults({});
      setSeasonLeagueStatsByTier({});
      setSeasonLeagueStatsAvailable(true);
      setSeasonCupStatsByCup({});
      setSeasonCupStatsAvailable(true);
      setSeasonCards(0);
      setSeasonCleanSheets(0);
      setSeasonGoalsFor(0);
      setSeasonDraws(0);
      setSeasonHomeUnbeaten(true);
      setSeasonAwayWins(0);
      setSeasonAwayGames(0);
      // Transfer window state is NOT reset here — the summer window opens
      // one break-week earlier and intentionally carries into the new season.
      // offersRejectedThisWindow follows the same rule (reset only when a
      // new window actually opens, in useSeasonFlow.js).
      setLoyaltyWatch(null);
      // Squad-scoped scouting metadata — pending reveals/burns for
      // last season's shortlist can't resolve into a squad that's
      // about to reset its per-season tracking anyway.
      setScoutRevealMeta({});
      setMotmTracker({});
      setStScoredConsecutive(0);
      setPlayerRatingTracker({});
      setPlayerRatingNames({});
      setPlayerMatchLog({});
      setBreakoutsThisSeason(new Map());
      setPrevStartingXI(null);
      setPlayerSeasonStats({});
      setHatTrickHeadlinePlayers([]);
      setFavouriteStarts({});
      // Reset appearance counters for the new season
      setSquad(prev => prev.map(p => ({ ...p, seasonStarts: 0, seasonSubApps: 0, ...(p.isLegend ? { legendAppearances: 0 } : {}) })));
      setBeatenTeams(new Set());
      // Sentiment partial carry-over: ×0.5 + 25 (100→75, 50→50, 0→25)
      const newSeasonFanSentiment = Math.round(useGameStore.getState().fanSentiment * 0.5 + 25);
      setFanSentiment(newSeasonFanSentiment);
      // The People's Champion floor resets to the newly-carried
      // sentiment for the new season, not 100 — see the matching
      // reset at the prestige rollover above.
      setFanSentimentSeasonFloor(newSeasonFanSentiment);
      setBoardSentiment(Math.round(useGameStore.getState().boardSentiment * 0.5 + 25));
      setHalfwayPosition(null);
      setPreviousLeaguePosition(null);
      setPlayerInjuryCount({});
      setSeasonInjuryLog({});
      setBenchStreaks({});
      setHighScoringMatches(0);
      setFormationsWonWith(new Set());
      setHolidayMatchesThisSeason(0);
      useGameStore.getState().setWonLeagueOnHoliday(false);
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
      const nextTrialP = generateTrialPlayer(ovrCap, new Set(useGameStore.getState().squad.map(p => p.name)));
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
      setInboxMessages(prev => [...prev.filter(m => m.type !== "trial_offer" || m.choiceResult), createInboxMessage(
        MSG.trialOffer(nextTrialP, nextTrialWeek),
        { calendarIndex: 0, seasonNumber: nextSeason },
      )]);
      setTrialPlayer(null); // Clear any lingering trial
      // League modifier intro message for new season
      const newSeasonMod = getModifier(newTier);
      if (newSeasonMod.inboxIntro) {
        setInboxMessages(prev => [...prev, createInboxMessage(
          MSG.leagueModIntroNewSeason(newSeasonMod, newTier, nextSeason),
          { calendarIndex: 0, seasonNumber: nextSeason },
        )]);
      }
      // Single-fixture opponents announcement (Dynasty / Mini-Tournament tiers)
      if (newLeague2.singleFixtureOpponents) {
        const sfo = newLeague2.singleFixtureOpponents;
        const sfMod = getModifier(newTier);
        const sfTourney = sfMod.miniTournament ? "5v5 Mini-Tournament" : "Dynasty Cup knockout phase";
        const sfMDs = newLeague2.fixtures?.length || DEFAULT_FIXTURE_COUNT;
        const sfNames = sfo.map(o => o.name).join(" and ");
        setInboxMessages(prev => [...prev, createInboxMessage(
          MSG.singleFixtureNewSeason(sfTourney, sfMDs, sfNames, newTier, nextSeason),
          { calendarIndex: 0, seasonNumber: nextSeason },
        )]);
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

      // === PRODIGAL SON NARRATIVE ===
      // Triggers once, in season 2+, if not already active/completed
      if (nextSeason >= 2 && !prodigalSon) {
        const tierTeams = (rosters && rosters[newTier]) || LEAGUE_DEFS[newTier]?.teams || [];
        if (tierTeams.length > 0) {
          const formerClub = tierTeams[rand(0, tierTeams.length - 1)].name;
          const prodigalP = generateProdigalPlayer(formerClub, ovrCap, new Set(useGameStore.getState().squad.map(p => p.name)));
          const scoutWeek = rand(4, 6);
          const offerWeek = scoutWeek + 2;
          setProdigalSon({
            phase: "scout_tip", playerId: prodigalP.id, playerName: prodigalP.name,
            formerClub, position: prodigalP.position, playerData: prodigalP,
            starts: 0, goals: 0, wonVsFormer: false, consecutiveBenched: 0,
            sentFlags: {},
          });
          setInboxMessages(prev => [...prev,
            createInboxMessage(
              MSG.prodigalScout(prodigalP.name, formerClub, scoutWeek),
              { calendarIndex: 0, seasonNumber: nextSeason },
            ),
            createInboxMessage(
              MSG.prodigalOffer(prodigalP, formerClub, offerWeek),
              { calendarIndex: 0, seasonNumber: nextSeason },
            ),
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
            newMessages.push(createInboxMessage(
                               MSG.trialSignedRival(entry.name, entry.flag, entry.rivalTeam),
                               { calendarIndex: 0, seasonNumber: nextSeason2 },
                             ));
            // Boost rival team strength (player already added to squad in pre-pass above)
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
              newMessages.push(createInboxMessage(
                MSG.trialStar(entry.name, entry.flag, entry.rivalTeam, posStr),
                { calendarIndex: 0, seasonNumber: nextSeason2 },
                               ));
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
    // === CLUB FOCUS: season-start grants ===
    // Recurring focus rewards (Continental Contacts, Miracle Worker, War
    // Chest's recurring half) fire once per season. pendingSeasonGrants is
    // idempotent against the seasonGrants ledger, so a reload can't double up.
    {
      const nextSeasonCF = (seasonNumber || 1) + 1;
      const cf = useGameStore.getState().clubFocuses;
      const due = pendingSeasonGrants(cf, nextSeasonCF);
      if (due.length > 0) {
        const wcPool = ["double_session", "twelfth_man", "relation_boost", "random_attr"];
        due.forEach(({ nodeId, effectId }) => {
          if (effectId === "seasonal_cream") {
            setTickets(prev => [...prev, { id: `t_focus_mc_${Date.now()}_${nodeId}`, type: "miracle_cream" }]);
          } else if (effectId === "war_chest") {
            setTickets(prev => [...prev, { id: `t_focus_wcs_${Date.now()}`, type: pickRandom(wcPool) }]);
          } else if (effectId === "continental_tip") {
            // A lead, not a signing: generate a non-ENG prospect, drop him on
            // the shortlist with potential already revealed, and file a report.
            const usedNames = new Set(useGameStore.getState().squad.map(p => p.name));
            const avgOvr = Math.round(squad.reduce((a, p) => a + getOverall(p), 0) / Math.max(1, squad.length));
            let tip = generateFreeAgent(leagueTier, avgOvr, ovrCap, usedNames);
            let guard = 0;
            while (tip.nationality === "ENG" && guard++ < 8) tip = generateFreeAgent(leagueTier, avgOvr, ovrCap, usedNames);
            const tipPot = Math.min(ovrCap, Math.max(getOverall(tip) + 2, Math.round(ovrCap * 0.8)));
            const flag = getNatFlag ? getNatFlag(tip.nationality) : "";
            const countryLabel = `${flag} ${tip.nationality}`.trim();
            setShortlist(prev => ([...prev, {
              id: tip.id, name: tip.name, position: tip.position, ovr: getOverall(tip),
              age: tip.age, attrs: { ...tip.attrs }, potential: tipPot, nationality: tip.nationality,
              clubName: "Free Agent", clubColor: "#94a3b8", clubTier: leagueTier,
              addedSeason: nextSeasonCF, addedWeek: 0, scoutWeeksLeft: 0,
            }]));
            setScoutedPlayers(prev => ({ ...prev, [tip.id]: tipPot }));
            setInboxMessages(prev => [...prev, createInboxMessage(
              MSG.clubFocusContinentalTip(tip.name, countryLabel, tipPot, ovrCap),
              { calendarIndex: 0, seasonNumber: nextSeasonCF },
            )]);
          }
          setClubFocuses(prev => markSeasonGranted(prev, nodeId, nextSeasonCF));
        });
      }
    }

    // After intake, one more summer week remains (Well Rested + Preview combined)
    setSummerPhase("break");
    setSummerData(prev => ({...(prev || {}), weeksLeft: 1}));
  }, []); // All state read from getState()

  return { onSeasonEndRevealDone, onPrestigeDone, onLegendSelectionDone, onYouthIntakeDone };
}
