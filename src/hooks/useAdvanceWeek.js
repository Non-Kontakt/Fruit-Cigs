import { useCallback } from "react";
import { useGameStore } from "../store/gameStore.js";
import { ATTRIBUTES, TRAINING_FOCUSES, TRAINING_INJURIES } from "../data/training.js";
import { POSITION_TYPES } from "../data/positions.js";
import { LEAGUE_DEFS, NUM_TIERS } from "../data/leagues.js";
import { ARC_CATS, ARC_TICKET_POOL } from "../data/storyArcs.js";
import { TICKET_DEFS } from "../data/tickets.js";
import { MSG } from "../data/messages.js";
import { getModifier } from "../data/leagueModifiers.js";
import { rand, getOverall, getTrainingProgress, progressToPips, pickRandom } from "../utils/calc.js";
import { getOvrCap } from "../utils/player.js";
import { getArcById, checkArcCond, getStepNarrative, getFocusNarrative, processArcCompletion, precomputeArcEffects, applyArcFx, applyFinalReward, resolveSeasonEndArcs } from "../utils/arcs.js";
import { sortStandings, processSeasonSwaps, initLeagueRosters, advanceCupRound, buildNextCupRound, collectSeasonEndAchievements } from "../utils/league.js";
import { simulateMatch, generatePenaltyShootout } from "../utils/match.js";
import { checkAchievements } from "../utils/achievements.js";
import { createInboxMessage } from "../utils/messageUtils.js";
import { SFX, BGM } from "../utils/sfx.js";

const DEFAULT_FIXTURE_COUNT = 18;

export function useAdvanceWeek({
  setGains, setWeekTransition, setAchievementQueue, setRecentOvrLevelUps,
  setShowAchievements, setShowTable, setShowCalendar, setShowCup, setShowTransfers, setShowLegends, setShowSquad,
  tryUnlockAchievement,
  storyArcsRef, pendingFinalRewardRef, weekRecoveriesRef, cardedPlayerIdsRef, boardWarnWeekRef, aiPredictionRef, achievableIdsRef, revealedInjuryCount, pendingTrialAction,
}) {
  const advanceWeek = useCallback(() => {
    const s = useGameStore.getState();
    const ovrCap = getOvrCap(s.prestigeLevel || 0);
    const { processing, squad, league, leagueTier, calendarIndex, seasonCalendar,
      matchweekIndex, cup, summerPhase, summerData, startingXI, bench,
      formation, slotAssignments, allLeagueStates, leagueRosters,
      storyArcs, prodigalSon, trialPlayer, trialHistory, consecutiveWins,
      halfwayPosition, unlockedAchievements, seasonNumber, isOnHoliday,
      leagueResults, fanSentiment, boardSentiment, seasonInjuryLog,
      playerInjuryCount, trainedThisWeek, lopsidedWarned, inboxMessages,
      doubleTrainingWeek, twelfthManActive, youthCoupActive,
      clubRelationships, tickets, pendingTicketBoosts, dynastyCupQualifiers,
      teamName, prestigeLevel, transferFocus,
    } = s;
    if (processing || !league) return;

    // Clear stale summer state if data is missing
    if (summerPhase && summerPhase !== "break" && !summerData) {
      s.setSummerPhase(null);
    }
    if (summerPhase) return; // all summer phases block advanceWeek; use advanceSummer() instead

    // Season end — calendar exhausted, or (no calendar) matchweekIndex past all fixtures
    const totalFix = league.fixtures?.length || DEFAULT_FIXTURE_COUNT;
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
        s.setLeagueRosters(swapResult.rosters);
        const recoveryPlayerRow = league?.table?.find(r => league.teams[r.teamIndex]?.isPlayer);
        s.setSummerData({
          moveType, fromTier: currentTier, toTier: newTier, position,
          leagueName: league.leagueName || LEAGUE_DEFS[currentTier].name,
          newLeagueName: LEAGUE_DEFS[newTier].name,
          newRosters: swapResult.rosters,
          isInvincible: position === 1 && recoveryPlayerRow?.lost === 0,
        });
        // Season-end sentiment swings (recovery path)
        if (moveType === "promoted") { s.setFanSentiment(Math.min(100, useGameStore.getState().fanSentiment + 20)); s.setBoardSentiment(Math.min(100, useGameStore.getState().boardSentiment + 25)); }
        if (moveType === "relegated") { s.setFanSentiment(Math.max(0, useGameStore.getState().fanSentiment - 20)); s.setBoardSentiment(Math.max(0, useGameStore.getState().boardSentiment - 25)); }
        if (position === 1) { s.setFanSentiment(Math.min(100, useGameStore.getState().fanSentiment + 10)); s.setBoardSentiment(Math.min(100, useGameStore.getState().boardSentiment + 10)); }
        s.setSummerPhase("awaiting_end");

        // === STORY ARC SEASON-END TRACKING (recovery path) ===
        {
          const freshCup = useGameStore.getState().cup;
          const cupWon = freshCup && !freshCup.playerEliminated && (() => {
            const rKeys = Object.keys(freshCup.rounds || {}).map(Number).sort((a,b)=>a-b);
            if (rKeys.length === 0) return false;
            const finalRound = freshCup.rounds[rKeys[rKeys.length-1]];
            return finalRound?.matches?.some(m => m.result?.winner?.isPlayer);
          })();
          s.setStoryArcs(prev => resolveSeasonEndArcs(prev, position, cupWon));
        }
      }
      return;
    }
    if (summerPhase) return;

    s.setProcessing(true);
    if (!useGameStore.getState().isOnHoliday) {
      // Navigate to Home so GainPopup (which renders inside the Home/Squad branch) is visible
      setShowAchievements(false); setShowTable(false); setShowCalendar(false);
      setShowCup(false); setShowTransfers(false); setShowLegends(false); setShowSquad(false);
      SFX.advance();
      setWeekTransition(true);
    }
    s.setReadsThisWeek(0);
    setRecentOvrLevelUps(null);
    weekRecoveriesRef.current = [];

    // === PRE-COMPUTE ALL ARC EFFECTS SYNCHRONOUSLY ===
    // Must happen before any setState calls — see precomputeArcEffects() for why
    const arcSnap = storyArcsRef.current || storyArcs;
    const gs = { squad, league, prodigalSon, trialPlayer, trialHistory, leagueTier,
                 consecutiveWins, halfwayPosition, cup };
    const arcFx = precomputeArcEffects(arcSnap, gs, prodigalSon);
    pendingFinalRewardRef.current = arcFx.pendingFinalRewards;

    s.setStoryArcs(prev => {
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
            s.setArcStepQueue(q => [...q, {
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
      s.setStoryArcs(prev => {
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
    s.setStoryArcs(prev => {
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
            const result = processArcCompletion(arc, cs, next.completed, next.bonuses, { unlockedAchievements, seasonNumber, week: calendarIndex + 1 });
            next.bonuses = result.bonuses;
            next.completed = result.completed;
            next[cat] = {...next[cat], completed: true};
            if (result.achievements.length > 0) {
              result.achievements.forEach(a => tryUnlockAchievement(a));
            }
            s.setInboxMessages(pm => [...pm, createInboxMessage(
              MSG.arcComplete(arc.name, arc.rewardDesc),
              { calendarIndex, seasonNumber },
            )]);
            if (!useGameStore.getState().isOnHoliday) {
              s.setArcStepQueue(q => [...q, {
                arcId:arc.id, arcName:arc.name, arcIcon:arc.icon, cat,
                stepIdx:cs.step, stepDesc:step.desc, narrative:narr,
                isComplete:true, rewardDesc:arc.rewardDesc,
              }]);
            }
          } else {
            if (!useGameStore.getState().isOnHoliday) {
              s.setArcStepQueue(q => [...q, {
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
      const unreadCount = getUnreadCount(inboxMessages, calendarIndex);
      if (unreadCount >= 10) {
        tryUnlockAchievement("left_on_read");
      }
    }

    // Check training focus mass achievements at moment of advance
    const focusUnlocks = checkAchievements({
      squad, unlocked: unlockedAchievements, achievableIds: achievableIdsRef.current,
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
      s.setUnlockedAchievements(prev => {
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
                tryUnlockAchievement("xenomorph");
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
                tryUnlockAchievement("the_sick_note");
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
              s.setSeasonInjuryLog(prev => {
                const next = { ...prev };
                if (!next[p.name]) next[p.name] = {};
                next[p.name][inj.name] = (next[p.name][inj.name] || 0) + 1;
                // Check Just A Niggle: same injury type 3+ times
                if (next[p.name][inj.name] >= 3 && !unlockedAchievements.has("just_a_niggle")) {
                  tryUnlockAchievement("just_a_niggle");
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
              // Form multiplier: recent match performance affects training speed
              const _formRatings = (useGameStore.getState().playerRatingTracker[p.id] || []).slice(-3);
              const _formAvg = _formRatings.length > 0 ? _formRatings.reduce((s, r) => s + r, 0) / _formRatings.length : 0;
              const formMult = _formRatings.length === 0 ? 0.8
                : _formAvg >= 7.5 ? 1.5
                : _formAvg >= 6.5 ? 1.0
                : _formAvg >= 5.5 ? 0.8
                : 0.6;
              // Story arc training bonuses
              const arcBonuses = storyArcs?.bonuses || {};
              let arcMult = 1 + (arcBonuses.trainSpeedMult || 0);
              if (attrKey === "mental" && arcBonuses.mentalTrainMult) arcMult += arcBonuses.mentalTrainMult;
              const doubleMult = useGameStore.getState().doubleTrainingWeek ? 2 : 1;
              const dojoMult = mod.trainingSpeedMult || 1;
              const progressGain = rawProgress * focusMultiplier * arcMult * doubleMult * dojoMult * formMult;

              const oldProgress = newPlayer.statProgress[attrKey] || 0;
              let newProgress = oldProgress + progressGain;

              if (newProgress >= 1.0) {
                // STAT LEVEL UP — handle multiple level-ups if progress >= 2.0
                let levelUps = 0;
                while (newProgress >= 1.0 && newPlayer.attrs[attrKey] < playerCap) {
                  newProgress -= 1.0;
                  newPlayer.attrs[attrKey] = Math.min(playerCap, newPlayer.attrs[attrKey] + 1);
                  levelUps++;
                }
                if (newPlayer.attrs[attrKey] >= playerCap) newProgress = 0; // at cap, no overflow
                newPlayer.gains[attrKey] = (newPlayer.gains[attrKey] || 0) + levelUps;
                newPlayer.statProgress[attrKey] = Math.max(0, newProgress);
                const priorPips = progressToPips(oldProgress);
                weekGains.push({
                  playerName: p.name,
                  playerPosition: p.position,
                  attr: attrKey,
                  oldVal: current,
                  newVal: newPlayer.attrs[attrKey],
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
    if (useGameStore.getState().doubleTrainingWeek) s.setDoubleTrainingWeek(false);

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
      const intendedAttrBoost = !!(fx.stats || fx.mode);
      // Check target player exists before claiming boost was intended
      const targetExists = fx.target ? newSquad.some(p => p.id === cs.tracking?.targetId) : true;
      const prodigalExists = fx.prodigal ? newSquad.some(p => p.id === prodigalSon?.playerId) : true;
      const boostTargetValid = targetExists && prodigalExists;
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
      // Don't trigger if the target player simply doesn't exist (traded/released)
      if (intendedAttrBoost && boostTargetValid && gainCount === 0) {
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
      s.setStoryArcs(prev => {
        const n = {...prev};
        if (n.pendingFinalReward) delete n.pendingFinalReward;
        if (n.extraPendingRewards) delete n.extraPendingRewards;
        n.rewardsApplied = [...(n.rewardsApplied || []), ...appliedIds];
        return n;
      });
    }

    if (juicedThisWeek && !unlockedAchievements.has("juiced")) {
      tryUnlockAchievement("juiced");
    }

    // === SENTIMENT WEEKLY DRIFT ===
    {
      const curFan = useGameStore.getState().fanSentiment;
      const curBoard = useGameStore.getState().boardSentiment;
      let fanDelta = curFan > 55 ? -0.5 : curFan < 45 ? 0.5 : 0;
      let boardDelta = curBoard > 55 ? -0.5 : curBoard < 45 ? 0.5 : 0;
      if (consecutiveWins >= 3) fanDelta += 2;
      // Board: league position bonus/penalty after halfway point
      const _totalMDs = useGameStore.getState().league?.fixtures?.length || DEFAULT_FIXTURE_COUNT;
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
      s.setFanSentiment(newFan);
      s.setBoardSentiment(newBoard);
      // Board bonus ticket every 8 weeks when sentiment > 75
      const _wk = useGameStore.getState().calendarIndex;
      if (newBoard > 75 && _wk > 0 && _wk % 8 === 0) {
        const _picks = ["random_attr", "double_session", "relation_boost", "transfer_insider"];
        const _pick = pickRandom(_picks);
        s.setTickets(prev => [...prev, { id: `ticket_board_${Date.now()}`, type: _pick }]);
        s.setInboxMessages(prev => [...prev, createInboxMessage(
          MSG.boardReward(TICKET_DEFS[_pick]?.name || "gift"),
          { calendarIndex, seasonNumber },
        )]);
      }
      // Board warning when < 25, rate-limited to every 4 weeks
      if (newBoard < 25 && _wk - boardWarnWeekRef.current >= 4) {
        boardWarnWeekRef.current = _wk;
        const isIronman = useGameStore.getState().gameMode === "ironman" && !useGameStore.getState().ultimatumActive;
        const nextCount = isIronman ? useGameStore.getState().boardWarnCount + 1 : 0;

        if (isIronman && nextCount >= 3) {
          // 3rd strike: skip concern message, deliver ultimatum directly
          s.setBoardWarnCount(0);
          const target = leagueTier <= 3 ? 7 : leagueTier <= 7 ? 6 : 5;
          s.setUltimatumTarget(target);
          s.setUltimatumPtsEarned(0);
          s.setUltimatumGamesLeft(5);
          s.setUltimatumActive(true);
          s.setInboxMessages(prev => [...prev, createInboxMessage(
            MSG.boardUltimatum(target),
            { calendarIndex, seasonNumber },
          )]);
        } else {
          // Warning 1 or 2: concern message with escalating tone
          const isSecond = isIronman && nextCount === 2;
          s.setInboxMessages(prev => [...prev, createInboxMessage(
            MSG.boardConcern(isSecond),
            { calendarIndex, seasonNumber },
          )]);
          if (isIronman) s.setBoardWarnCount(nextCount);
        }
      }
    }

    // === HOLIDAY MODE: APPLY SQUAD DIRECTLY, SKIP POPUP ===
    if (useGameStore.getState().isOnHoliday) {
      // Apply squad changes immediately, no popup
      s.setSquad(newSquad);
      s.setTrainedThisWeek(new Set());
      // Don't set gains (no popup to show them)
      weekRecoveriesRef.current = weekRecoveries;
      revealedInjuryCount.current = 0;

      // Snapshot OVR for progress chart
      const ovrSnap = {};
      newSquad.forEach(p => {
        const key = `${p.name}|${p.position}`;
        ovrSnap[key] = getOverall(p);
      });
      s.setOvrHistory(prev => [...prev, { w: calendarIndex + 1, s: seasonNumber || 1, p: ovrSnap }]);

      // Clear prodigal boost flag
      if (prodigalSon?.pendingBoost) {
        s.setProdigalSon(prev => prev ? { ...prev, pendingBoost: false } : prev);
      }

      // Compute + process trial countdown (normally happens after the holiday return,
      // but holiday path returns early, so we must do it here using fresh squad data)
      try {
        const freshTP = useGameStore.getState().squad.find(p => p.isTrial);
        if (freshTP && useGameStore.getState().matchweekIndex > (freshTP.trialStartMatchweek ?? -1)) {
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
                season: seasonNumber, week: calendarIndex + 1,
              };
            } else {
              const rivals = (useGameStore.getState().league || league)?.teams?.filter(t => !t.isPlayer) || [];
              const rival = rivals.length > 0 ? rivals[rand(0, rivals.length - 1)] : null;
              pendingTrialAction.current = {
                type: "no_starts", id: freshTP.id, name: freshTP.name, position: freshTP.position,
                nationality: freshTP.nationality, flag: freshTP.flag, countryLabel: freshTP.countryLabel,
                rivalTeam: rival?.name || "a rival club", season: seasonNumber, week: calendarIndex + 1,
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
            s.setSquad(prev => prev.filter(p => p.id !== trialAction.id));
            s.setStartingXI(prev => prev.filter(id => id !== trialAction.id));
            s.setBench(prev => prev.filter(id => id !== trialAction.id));
            s.setTrialPlayer(null);
            s.setTrialHistory(prev => [...prev, {
              name: trialAction.name, position: trialAction.position,
              nationality: trialAction.nationality, flag: trialAction.flag,
              countryLabel: trialAction.countryLabel, attrs: trialAction.attrs,
              potential: trialAction.potential, starts: trialAction.starts,
              impressed: true, signed: false, season: trialAction.season,
            }]);
            s.setInboxMessages(prev => [...prev, createInboxMessage(
              { ...MSG.trialImpressed(trialAction), week: trialAction.week, season: trialAction.season },
              { calendarIndex, seasonNumber },
            )]);
          } else if (trialAction.type === "no_starts") {
            tryUnlockAchievement("reality_check");
            s.setSquad(prev => prev.filter(p => p.id !== trialAction.id));
            s.setStartingXI(prev => prev.filter(id => id !== trialAction.id));
            s.setBench(prev => prev.filter(id => id !== trialAction.id));
            s.setTrialPlayer(null);
            const trialAtWeek = trialAction.week + rand(2, 5);
            s.setTrialHistory(prev => [...prev, {
              name: trialAction.name, position: trialAction.position,
              nationality: trialAction.nationality, flag: trialAction.flag,
              countryLabel: trialAction.countryLabel,
              rivalTeam: trialAction.rivalTeam, rivalTier: leagueTier,
              impressed: false, declined: false, departureSeason: trialAction.season,
              phase: "on_trial",
            }]);
            s.setInboxMessages(prev => [...prev, createInboxMessage(
              { ...MSG.trialNoStarts(trialAction.name), week: trialAction.week, season: trialAction.season },
              { calendarIndex, seasonNumber },
            ), createInboxMessage(
              { ...MSG.trialRival(trialAction.name, trialAction.flag, trialAction.rivalTeam, trialAtWeek), season: trialAction.season },
              { calendarIndex, seasonNumber },
            )]);
          } else if (trialAction.type === "continue") {
            s.setTrialPlayer(prev => prev ? { ...prev, trialWeeksLeft: trialAction.newWeeksLeft, trialStarts: trialAction.newStarts } : null);
            s.setSquad(prev => prev.map(p => p.id === trialAction.id ? { ...p, trialWeeksLeft: trialAction.newWeeksLeft, trialStarts: trialAction.newStarts } : p));
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
            s.setCup(finCup);
            s.setCalendarIndex(prev => prev + 1);
            // Don't set matchPending — we auto-skipped, advance to next entry
          } else {
            // Prepare the cup round for player to play
            const updatedCup = advanceCupRound(useGameStore.getState().cup, newSquad, startingXI, bench, cupLookup);
            s.setCup(updatedCup);
            s.setMatchPending(true);
          }
        } else if (nextEntry?.type === "dynasty") {
          const dBracket = useGameStore.getState().dynastyCupBracket;
          if (dBracket && !dBracket.playerEliminated) {
            s.setMatchPending(true);
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
                s.setDynastyCupBracket({
                  sf1: { home: lt[q[0].teamIndex], away: lt[q[3].teamIndex], result: { homeGoals: sf1R.homeGoals, awayGoals: sf1R.awayGoals, winner: sf1W } },
                  sf2: { home: lt[q[1].teamIndex], away: lt[q[2].teamIndex], result: { homeGoals: sf2R.homeGoals, awayGoals: sf2R.awayGoals, winner: sf2W } },
                  final: { home: sf1W, away: sf2W, result: null },
                  playerSF: 0, playerEliminated: true, winner: null,
                });
                s.setInboxMessages(prev => [...prev, createInboxMessage(
                  MSG.dynastySFBg(`${sf1W.name} beat ${sf1W === lt[q[0].teamIndex] ? lt[q[3].teamIndex].name : lt[q[0].teamIndex].name} ${sf1R.homeGoals}-${sf1R.awayGoals}\n${sf2W.name} beat ${sf2W === lt[q[1].teamIndex] ? lt[q[2].teamIndex].name : lt[q[1].teamIndex].name} ${sf2R.homeGoals}-${sf2R.awayGoals}\n\nThe final will be ${sf1W.name} vs ${sf2W.name}.`),
                  { calendarIndex, seasonNumber },
                )]);
              }
              s.setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Dynasty Cup Semi-Finals" } }));
            } else if (nextEntry.round === "final") {
              const bk = useGameStore.getState().dynastyCupBracket;
              if (bk?.final?.home && bk?.final?.away && !bk.final.result) {
                const finR = simulateMatch(bk.final.home, bk.final.away, null, null, true, 1, 0, null, 0, dMod);
                let finW = finR.homeGoals > finR.awayGoals ? bk.final.home : finR.awayGoals > finR.homeGoals ? bk.final.away : null;
                if (!finW) { const p = generatePenaltyShootout(bk.final.home, bk.final.away, finR.events, null, null, dMod); finW = p.winner; }
                s.setDynastyCupBracket(prev => ({ ...prev, final: { ...prev.final, result: { homeGoals: finR.homeGoals, awayGoals: finR.awayGoals, winner: finW } }, winner: finW }));
                s.setInboxMessages(prev => [...prev, createInboxMessage(
                  MSG.dynastyFinalBg(`${finW.name} won the Dynasty Cup, beating ${finW === bk.final.home ? bk.final.away.name : bk.final.home.name} ${finR.homeGoals}-${finR.awayGoals} in the final.`),
                  { calendarIndex, seasonNumber },
                )]);
              }
              s.setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Dynasty Cup Final" } }));
            }
            s.setCalendarIndex(prev => prev + 1);
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
              s.setMiniTournamentBracket(prev => ({
                ...prev,
                [_holSFKey]: { ...prev[_holSFKey], leg1: { homeGoals: _holHG, awayGoals: _holAG } },
              }));
              s.setCalendarResults(prev => ({ ...prev, [_holCI]: { playerGoals: _holHG, oppGoals: _holAG, won: _holPlayerWon, draw: _holHG === _holAG, oppName: _holOppTeam?.name || "?" } }));
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
              s.setMiniTournamentBracket(prev => ({
                ...prev,
                [_holSFKey]: { ...prev[_holSFKey], leg2: { homeGoals: _holHG, awayGoals: _holAG }, winner: _holSFWinner },
                [_holOtherKey]: { ...prev[_holOtherKey], leg1: _holOtherL1, leg2: { homeGoals: _or2.homeGoals, awayGoals: _or2.awayGoals }, winner: _holOtherW },
                final: { home: mBracket.playerSF === 1 ? _holSFWinner : _holOtherW, away: mBracket.playerSF === 1 ? _holOtherW : _holSFWinner, result: null },
                thirdPlace: { home: _holPlayerSFLoser, away: _holOtherSFLoser, result: null, winner: null },
                playerEliminated: false,
                playerInFinal: _holPlayerWonSF,
              }));
              s.setCalendarResults(prev => ({ ...prev, [_holCI]: { playerGoals: _holHG, oppGoals: _holAG, won: _holHG > _holAG, draw: _holHG === _holAG, oppName: _holOppTeam?.name || "?" } }));
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
                  s.setMiniTournamentBracket(prev => ({
                    ...prev,
                    thirdPlace: { ...prev.thirdPlace, result: { homeGoals: _tpR.homeGoals, awayGoals: _tpR.awayGoals, winner: _tpW }, winner: _tpW },
                    thirdPlaceWinner: _tpW,
                  }));
                }
                s.setCalendarResults(prev => ({ ...prev, [_holCI]: { spectator: true, label: "3rd Place Playoff" } }));
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
                s.setMiniTournamentBracket(prev => ({
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
                  s.setMiniTournamentBracket(prev => ({ ...prev, final: { ...prev.final, result: { homeGoals: _finR.homeGoals, awayGoals: _finR.awayGoals, winner: _finW } }, winner: _finW, runnerUp: _finL }));
                }
                s.setCalendarResults(prev => ({ ...prev, [_holCI]: { playerGoals: _holHG, oppGoals: _holAG, won: _holWon3rd, draw: false, oppName: _holOppTeam?.name || "?" } }));
              }
            } else if (_holMiniRound === "final") {
              // Final — player is here only if they won SF
              const _holInFinal2 = mBracket.playerInFinal;
              if (_holInFinal2 === false) {
                // Player lost SF, final already simmed — skip
                s.setCalendarResults(prev => ({ ...prev, [_holCI]: { spectator: true, label: "Mini Final" } }));
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
              s.setMiniTournamentBracket(prev => ({
                ...prev,
                final: { ...prev.final, result: { homeGoals: _holHG, awayGoals: _holAG, winner: _holFinalWinner, pens: _holFinalPens } },
                winner: _holFinalWinner,
              }));
              if (_holPlayerWonFinal) {
                // MotM boost
                const _holElig = _holAutoFive;
                if (_holElig.length > 0) {
                  const _holMotm = pickRandom(_holElig);
                  const _holAttrs = ["pace","shooting","passing","dribbling","defending","physical","goalkeeping"];
                  const _holAttr = pickRandom(_holAttrs);
                  const _holNewVal = Math.min(_holMotm.legendCap || ovrCap, (_holMotm.attrs[_holAttr] || 1) + 1);
                  s.setSquad(prev => prev.map(p => p.id === _holMotm.id ? { ...p, attrs: { ...p.attrs, [_holAttr]: _holNewVal } } : p));
                  s.setInboxMessages(prev => [...prev, createInboxMessage(
                    MSG.miniHolWin(_holMotm, _holAttr, _holNewVal),
                    { calendarIndex, seasonNumber },
                  )]);
                }
              }
              // Also sim 3rd-place if not done yet (AI vs AI)
              const _bk3 = useGameStore.getState().miniTournamentBracket;
              if (_bk3?.thirdPlace && !_bk3.thirdPlace.winner) {
                const _tp3 = _bk3.thirdPlace;
                const _tpR3 = simulateMatch(_tp3.home, _tp3.away, null, null, true, 1, 0, null, 0, _holMiniMod);
                let _tpW3 = _tpR3.homeGoals > _tpR3.awayGoals ? _tp3.home : _tpR3.awayGoals > _tpR3.homeGoals ? _tp3.away : null;
                if (!_tpW3) { const _tpP3 = generatePenaltyShootout(_tp3.home, _tp3.away, _tpR3.events, null, null, _holMiniMod); _tpW3 = _tpP3.winner === "home" ? _tp3.home : _tp3.away; }
                s.setMiniTournamentBracket(prev => ({ ...prev, thirdPlace: { ...prev.thirdPlace, result: { homeGoals: _tpR3.homeGoals, awayGoals: _tpR3.awayGoals, winner: _tpW3 }, winner: _tpW3 }, thirdPlaceWinner: _tpW3 }));
              }
              const _finLoser = _holFinalWinner === _holOppTeam ? _holPlayerTeamFive : _holOppTeam;
              s.setMiniTournamentBracket(prev => ({ ...prev, runnerUp: _finLoser }));
              s.setCalendarResults(prev => ({ ...prev, [_holCI]: { playerGoals: _holHG, oppGoals: _holAG, won: _holPlayerWonFinal, draw: false, oppName: _holOppTeam?.name || "?" } }));
              }
            }
            s.setCalendarIndex(prev => prev + 1);
          } else {
            // Non-participant: sim AI mini match in background
            const mMod = getModifier(leagueTier);
            if (nextEntry.round === "sf_leg1") {
              if (!mBracket) {
                // Player didn't qualify — set up bracket from standings
                const mSorted = sortStandings(useGameStore.getState().league?.table || []);
                const mTop4 = mSorted.slice(0, 4).map(r => ({ teamIndex: r.teamIndex, name: useGameStore.getState().league?.teams?.[r.teamIndex]?.name }));
                const lt = useGameStore.getState().league?.teams || [];
                s.setMiniTournamentBracket({
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
                s.setMiniTournamentBracket(prev => ({
                  ...prev,
                  sf1: { ...prev.sf1, leg1: { homeGoals: r1.homeGoals, awayGoals: r1.awayGoals } },
                  sf2: { ...prev.sf2, leg1: { homeGoals: r2.homeGoals, awayGoals: r2.awayGoals } },
                }));
                s.setInboxMessages(prev => [...prev, createInboxMessage(
                  MSG.miniSFLeg1(`${bk.sf1.home.name} ${r1.homeGoals}-${r1.awayGoals} ${bk.sf1.away.name}\n${bk.sf2.home.name} ${r2.homeGoals}-${r2.awayGoals} ${bk.sf2.away.name}`),
                  { calendarIndex, seasonNumber },
                )]);
              }
              s.setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Mini SF Leg 1" } }));
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
                s.setMiniTournamentBracket(prev => ({
                  ...prev,
                  sf1: { ...prev.sf1, leg2: { homeGoals: r1.homeGoals, awayGoals: r1.awayGoals }, winner: w1 },
                  sf2: { ...prev.sf2, leg2: { homeGoals: r2.homeGoals, awayGoals: r2.awayGoals }, winner: w2 },
                  final: { home: w1, away: w2, result: null },
                }));
                s.setInboxMessages(prev => [...prev, createInboxMessage(
                  MSG.miniSFLeg2(`${bk.sf1.away.name} ${r1.homeGoals}-${r1.awayGoals} ${bk.sf1.home.name} (Agg: ${agg1h}-${agg1a}) — ${w1.name} advance\n${bk.sf2.away.name} ${r2.homeGoals}-${r2.awayGoals} ${bk.sf2.home.name} (Agg: ${agg2h}-${agg2a}) — ${w2.name} advance\n\nFinal: ${w1.name} vs ${w2.name}`),
                  { calendarIndex, seasonNumber },
                )]);
              }
              s.setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Mini SF Leg 2" } }));
            } else if (nextEntry.round === "third_place") {
              const bk = useGameStore.getState().miniTournamentBracket;
              if (bk?.thirdPlace && !bk.thirdPlace.winner) {
                const tp = bk.thirdPlace;
                const tpR = simulateMatch(tp.home, tp.away, null, null, true, 1, 0, null, 0, mMod);
                let tpW = tpR.homeGoals > tpR.awayGoals ? tp.home : tpR.awayGoals > tpR.homeGoals ? tp.away : null;
                if (!tpW) { const p = generatePenaltyShootout(tp.home, tp.away, tpR.events, null, null, mMod); tpW = p.winner === "home" ? tp.home : tp.away; }
                s.setMiniTournamentBracket(prev => ({
                  ...prev,
                  thirdPlace: { ...prev.thirdPlace, result: { homeGoals: tpR.homeGoals, awayGoals: tpR.awayGoals, winner: tpW }, winner: tpW },
                  thirdPlaceWinner: tpW,
                }));
                s.setInboxMessages(prev => [...prev, createInboxMessage(
                  MSG.mini3rd(`${tpW.name} beat ${tpW === tp.home ? tp.away.name : tp.home.name} ${tpR.homeGoals}-${tpR.awayGoals} to claim 3rd place.`),
                  { calendarIndex, seasonNumber },
                )]);
              }
              s.setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "3rd Place Playoff" } }));
            } else if (nextEntry.round === "final") {
              const bk = useGameStore.getState().miniTournamentBracket;
              if (bk?.final?.home && bk?.final?.away && !bk.final.result) {
                const finR = simulateMatch(bk.final.home, bk.final.away, null, null, true, 1, 0, null, 0, mMod);
                let finW = finR.homeGoals > finR.awayGoals ? bk.final.home : finR.awayGoals > finR.homeGoals ? bk.final.away : null;
                if (!finW) { const p = generatePenaltyShootout(bk.final.home, bk.final.away, finR.events, null, null, mMod); finW = p.winner === "home" ? bk.final.home : bk.final.away; }
                const finLoser = finW === bk.final.home ? bk.final.away : bk.final.home;
                s.setMiniTournamentBracket(prev => ({ ...prev, final: { ...prev.final, result: { homeGoals: finR.homeGoals, awayGoals: finR.awayGoals, winner: finW } }, winner: finW, runnerUp: finLoser }));
                s.setInboxMessages(prev => [...prev, createInboxMessage(
                  MSG.miniFinal(`${finW.name} won the 5v5 Mini-Tournament, beating ${finLoser.name} ${finR.homeGoals}-${finR.awayGoals}.`),
                  { calendarIndex, seasonNumber },
                )]);
              }
              s.setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Mini Final" } }));
            }
            s.setCalendarIndex(prev => prev + 1);
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
              const h = pickRandom(_ps);
              const a = pickRandom(_ps);
              const aiWins = _holPlHome ? a > h : h > a;
              if (!aiWins) { _holPred = { home: h, away: a }; break; }
            }
            aiPredictionRef.current = _holPred || { home: 1, away: 1 };
          }
          s.setMatchPending(true);
        }
      }

      // End processing immediately so interval can continue
      setTimeout(() => s.setProcessing(false), 100);
      return; // Skip normal pendingSquad flow
    }

    // === NORMAL MODE: SHOW POPUP ===
    s.setPendingSquad(newSquad);

    // Snapshot OVR for progress chart
    const ovrSnap = {};
    newSquad.forEach(p => {
      const key = `${p.name}|${p.position}`;
      ovrSnap[key] = getOverall(p);
    });
    s.setOvrHistory(prev => [...prev, { w: calendarIndex + 1, s: seasonNumber || 1, p: ovrSnap }]);

    // Clear prodigal boost flag after it's been applied
    if (prodigalSon?.pendingBoost) {
      s.setProdigalSon(prev => prev ? { ...prev, pendingBoost: false } : prev);
    }

    s.setTrainedThisWeek(new Set());
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
        const pick = pickRandom(ct.choices);
        s.setTickets(prev => [...prev, { id: `t_arc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, type: pick }]);
      });
    }
    setGains({ improvements: weekGains, injuries: weekInjuries, duos: weekDuos, recoveries: weekRecoveries, progress: weekProgress, arcBoosts: arcBoostGains, ticketBoosts: resolvedTicketBoosts, cappedArcTickets: useGameStore.getState().isOnHoliday ? [] : cappedArcTickets });
    s.setPendingTicketBoosts([]);

    // Sweat Equity — 4+ gains in a double training week
    if (wasDoubleTraining && weekGains.length >= 4 && !unlockedAchievements.has("sweat_equity")) {
      tryUnlockAchievement("sweat_equity");
    }
    if (!useGameStore.getState().isOnHoliday) {
      setTimeout(() => setWeekTransition(false), 1500);
    }
    weekRecoveriesRef.current = weekRecoveries;
    revealedInjuryCount.current = 0;

    // Track injury counts per player for Injury Prone
    if (weekInjuries.length > 0) {
      s.setPlayerInjuryCount(prev => {
        const next = { ...prev };
        weekInjuries.forEach(inj => { next[inj.playerName] = (next[inj.playerName] || 0) + 1; });
        return next;
      });
    }

    // Tier 8: Clear carded players after training and send inbox
    if (weekCardSkips.length > 0) {
      cardedPlayerIdsRef.current.clear();
      s.setInboxMessages(prev => [...prev, createInboxMessage(
        MSG.disciplinePenalty(weekCardSkips.join(", ")),
        { calendarIndex, seasonNumber },
      )]);
    }

    // Ice Bath — player recovers from injury while 'Ice Bath' is playing
    if (weekRecoveries.length > 0 && !unlockedAchievements.has("ice_bath_track") && BGM.getCurrentTrackId() === "ice_bath") {
      tryUnlockAchievement("ice_bath_track");
    }

    // Relationship tick — passive/focus/decay per week (disabled in Saudi Super League)
    if (getModifier(leagueTier).noRelationships) { /* skip relationship building */ } else
    s.setClubRelationships(prev => {
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

    // Within-season AI progression (current tier only — other tiers evolve between seasons)
    if (league?.teams) {
      s.setLeague(prev => {
        if (!prev?.teams) return prev;
        const newTeams = prev.teams.map(t => {
          if (t.isPlayer || !t.squad) return t;
          const newSquad = t.squad.map(p => {
            if (!p.attrs) return p;
            const ovr = getOverall(p);
            const keys = ATTRIBUTES.map(a => a.key);
            const newAttrs = { ...p.attrs };
            let changed = false;
            if ((p.age || 25) <= 28 && (p.potential || 0) > ovr) {
              if (Math.random() < 0.20) {
                const k = pickRandom(keys);
                if (newAttrs[k] < (p.potential || ovrCap)) { newAttrs[k] = Math.min(ovrCap, newAttrs[k] + 1); changed = true; }
              }
            } else if ((p.age || 30) >= 32) {
              if (Math.random() < 0.10) {
                const k = Math.random() < 0.5 ? (Math.random() < 0.5 ? "pace" : "physical") : pickRandom(keys);
                if (newAttrs[k] > 1) { newAttrs[k]--; changed = true; }
              }
            }
            return changed ? { ...p, attrs: newAttrs } : p;
          });
          return { ...t, squad: newSquad };
        });
        return { ...prev, teams: newTeams };
      });
    }

    // Trial player — compute action but defer squad changes to avoid re-triggering this useEffect
    pendingTrialAction.current = null;
    if (trialPlayer && matchweekIndex > (trialPlayer.trialStartMatchweek ?? -1)) {
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
            potential: trialPlayer.potential, starts: newStarts, season: seasonNumber, week: calendarIndex + 1,
          };
        } else {
          const rivals = league?.teams?.filter(t => !t.isPlayer) || [];
          const rival = rivals[rand(0, rivals.length - 1)];
          pendingTrialAction.current = {
            type: "no_starts", id: trialPlayer.id,
            name: trialPlayer.name, position: trialPlayer.position,
            nationality: trialPlayer.nationality, flag: trialPlayer.flag,
            countryLabel: trialPlayer.countryLabel,
            rivalTeam: rival?.name || "a rival club", season: seasonNumber, week: calendarIndex + 1,
          };
        }
      } else {
        pendingTrialAction.current = {
          type: "continue", id: trialPlayer.id,
          newWeeksLeft, newStarts,
        };
      }
    }
  }, [setGains, setWeekTransition, setAchievementQueue, setRecentOvrLevelUps, setShowAchievements, setShowTable, setShowCalendar, setShowCup, setShowTransfers, setShowLegends, setShowSquad, tryUnlockAchievement, storyArcsRef, pendingFinalRewardRef, weekRecoveriesRef, cardedPlayerIdsRef, boardWarnWeekRef, aiPredictionRef, achievableIdsRef, revealedInjuryCount, pendingTrialAction]);

  return { advanceWeek };
}
