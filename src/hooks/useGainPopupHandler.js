import { useCallback } from "react";
import { useGameStore } from "../store/gameStore.js";
import { ATTRIBUTES, TRAINING_FOCUSES } from "../data/training.js";
import { POSITION_TYPES } from "../data/positions.js";
import { MSG } from "../data/messages.js";
import { getModifier } from "../data/leagueModifiers.js";
import { rand, getOverall, pickRandom } from "../utils/calc.js";
import { getOvrCap } from "../utils/player.js";
import { sortStandings, advanceCupRound, buildNextCupRound } from "../utils/league.js";
import { simulateMatch, generatePenaltyShootout } from "../utils/match.js";
import { createInboxMessage } from "../utils/messageUtils.js";

/**
 * Extracts the GainPopup onDone callback from App.jsx.
 *
 * All game state is read fresh from useGameStore.getState() on each call.
 * Only React useState setters and component-local callbacks are passed as params.
 */
export function useGainPopupHandler({
  // useState setters (not in Zustand)
  setGains,
  setOvrLevelUps,
  setRecentOvrLevelUps,
  setInjuryWarning,
  // Component-local callbacks
  tryUnlockAchievement,
  // Refs
  pendingTrialAction,
  aiPredictionRef,
}) {
  const processGainsDone = useCallback((gains) => {
    const s = useGameStore.getState();
    const ovrCap = getOvrCap(s.prestigeLevel || 0);

    let appliedSquad = s.squad;
    const levelUps = [];
    if (s.pendingSquad) {
      // Compute OVR level-ups before merging
      s.pendingSquad.forEach(pp => {
        const old = s.squad.find(p => p.id === pp.id);
        if (old) {
          const oldOvr = getOverall(old);
          const newOvr = getOverall(pp);
          if (newOvr > oldOvr) {
            levelUps.push({ name: pp.name, position: pp.position, oldOvr, newOvr });
          }
        }
      });

      // Merge: take pending squad but preserve any training reassignments
      appliedSquad = s.pendingSquad.map(pp => {
        const current = useGameStore.getState().squad.find(p => p.id === pp.id);
        return current ? { ...pp, training: current.training } : pp;
      });
      s.setSquad(appliedSquad);
      s.setPendingSquad(null);

      // Trigger OVR celebration if any level-ups
      if (levelUps.length > 0) {
        setOvrLevelUps(levelUps);
        setRecentOvrLevelUps(levelUps);
        if (!s.unlockedAchievements.has("level_up")) {
          tryUnlockAchievement("level_up");
        }
        if (!s.unlockedAchievements.has("through_the_roof") && levelUps.some(l => l.newOvr - l.oldOvr >= 2)) {
          tryUnlockAchievement("through_the_roof");
        }
        if (levelUps.length >= 5 && !s.unlockedAchievements.has("1up_addict")) {
          tryUnlockAchievement("1up_addict");
        }
        if (!s.unlockedAchievements.has("late_bloomer") && levelUps.some(l => l.age >= 31)) {
          tryUnlockAchievement("late_bloomer");
        }
        if (!s.unlockedAchievements.has("exceeded_expectations")) {
          const exceeder = appliedSquad.find(p => !p.isTrial && p.potential && getOverall(p) > p.potential);
          if (exceeder) {
            tryUnlockAchievement("exceeded_expectations");
          }
        }
      }
    }
    // Déjà Vu — 2 consecutive gains share a first name
    if (gains && !s.unlockedAchievements.has("deja_vu_training")) {
      const imps = gains.improvements || [];
      for (let i = 0; i < imps.length - 1; i++) {
        const f1 = (imps[i].playerName || "").split(" ")[0];
        const f2 = (imps[i + 1].playerName || "").split(" ")[0];
        if (f1 && f1 === f2) {
          tryUnlockAchievement("deja_vu_training");
          break;
        }
      }
    }
    // Position learning achievements
    if (gains) {
      const posLearnedEvents = (gains.progress || []).filter(e => e.type === "positionLearned");
      posLearnedEvents.forEach(pl => {
        if (!s.unlockedAchievements.has("shape_shifter")) {
          tryUnlockAchievement("shape_shifter");
        }
        const plPlayer = s.squad.find(p => p.name === pl.playerName);
        if (!s.unlockedAchievements.has("new_tricks") && plPlayer && plPlayer.age >= 30) {
          tryUnlockAchievement("new_tricks");
        }
        if (!s.unlockedAchievements.has("sick_as_a_parrot") && pl.learnedPosition === "GK" && pl.playerPosition !== "GK") {
          tryUnlockAchievement("sick_as_a_parrot");
        }
      });
    }
    setGains(null);

    // === Training report inbox message ===
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
          const allPos = [pl.playerPosition, ...(s.squad.find(p => p.name === pl.playerName)?.learnedPositions || [])].join(", ");
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
        s.setInboxMessages(prev => [...prev, createInboxMessage(
          MSG.trainingReport(s.calendarIndex + 1, parts.join("\n")),
          { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
        )]);
      }
    } catch(err) {
      console.error("Training report error:", err);
    }

    // === Assistant manager: lopsided training warning ===
    try {
      const RELEVANT_ATTRS = {
        FWD: ["pace", "shooting", "passing", "physical", "technique", "mental"],
        MID: ["pace", "shooting", "passing", "physical", "technique", "mental"],
        DEF: ["pace", "passing", "defending", "physical", "mental"],
        GK: [],
      };
      const GAP_THRESHOLD = 12;
      const warnings = [];
      (appliedSquad || s.squad).forEach(p => {
        if (!p.training || p.training === "balanced") return;
        const focus = TRAINING_FOCUSES.find(f => f.key === p.training);
        if (!focus || focus.attrs.length !== 1) return;
        const warnKey = `${p.id}_${p.training}`;
        if (s.lopsidedWarned.has(warnKey)) return;
        const posType = POSITION_TYPES[p.position] || "MID";
        const relevant = RELEVANT_ATTRS[posType] || [];
        if (relevant.length < 2) return;
        const trainedAttr = focus.attrs[0];
        if (!relevant.includes(trainedAttr)) return;
        const trainedVal = p.attrs[trainedAttr] || 0;
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
        const newWarned = new Set(s.lopsidedWarned);
        warnings.forEach(w => newWarned.add(w.warnKey));
        s.setLopsidedWarned(newWarned);
        const lines = warnings.map(w => `${w.name}: ${w.highLabel} ${w.highest} / ${w.lowLabel} ${w.lowest} (on ${w.training})`);
        s.setInboxMessages(prev => [...prev, createInboxMessage(
          MSG.lopsidedWarning(`Boss, a few lads might benefit from a change of focus in training:\n${lines.join("\n")}`),
          { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
        )]);
      }
    } catch(err) {
      console.error("Lopsided training check error:", err);
    }

    // === Assistant manager: training nudge ===
    try {
      const mwPlayed = s.matchweekIndex;
      const noTrainingAssigned = (appliedSquad || s.squad).every(p => !p.training);
      const alreadySent = s.inboxMessages.some(m => m.id === "msg_asst_mgr_training_nudge");
      const introDeclined = s.inboxMessages.some(m => m.id === "msg_asst_mgr_training_intro" && m.choiceResult === "manual");
      if (mwPlayed >= 5 && noTrainingAssigned && !alreadySent && s.seasonNumber === 1) {
        s.setInboxMessages(prev => [...prev, createInboxMessage(
          MSG.trainingNudge(introDeclined),
          { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
        )]);
      }
    } catch(err) {
      console.error("Training nudge check error:", err);
    }

    // === Apply deferred trial player actions ===
    const trialAction = pendingTrialAction.current;
    pendingTrialAction.current = null;
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
          { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
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
          rivalTeam: trialAction.rivalTeam, rivalTier: s.leagueTier,
          impressed: false, declined: false, departureSeason: trialAction.season,
          phase: "on_trial",
        }]);
        s.setInboxMessages(prev => [...prev, createInboxMessage(
          { ...MSG.trialNoStarts(trialAction.name), week: trialAction.week, season: trialAction.season },
          { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
        ), createInboxMessage(
          { ...MSG.trialRival(trialAction.name, trialAction.flag, trialAction.rivalTeam, trialAtWeek), season: trialAction.season },
          { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
        )]);
      } else if (trialAction.type === "continue") {
        s.setTrialPlayer(prev => prev ? { ...prev, trialWeeksLeft: trialAction.newWeeksLeft, trialStarts: trialAction.newStarts } : null);
        s.setSquad(prev => prev.map(p => p.id === trialAction.id ? { ...p, trialWeeksLeft: trialAction.newWeeksLeft, trialStarts: trialAction.newStarts } : p));
      }
    }

    // === Check for injured starters ===
    const currentXI = [...s.startingXI];
    const injuredStarters = currentXI.filter(id => {
      const p = appliedSquad.find(pl => pl.id === id);
      return p && p.injury;
    });
    setInjuryWarning(injuredStarters.length > 0 ? injuredStarters.length : 0);
    s.setProcessing(false);

    // === Cup preparation ===
    if (s.seasonCalendar && s.cup) {
      const ci = useGameStore.getState().calendarIndex;
      const entry = s.seasonCalendar[ci];
      if (entry?.type === "cup") {
        const cupLookup = (name, tier) => (tier === s.leagueTier ? s.league : s.allLeagueStates?.[tier])?.teams?.find(t => t.name === name) || null;
        if (s.cup.playerEliminated) {
          const updatedCup = advanceCupRound(s.cup, appliedSquad, s.startingXI, s.bench, cupLookup);
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
        } else {
          const updatedCup = advanceCupRound(s.cup, appliedSquad, s.startingXI, s.bench, cupLookup);
          s.setCup(updatedCup);
        }
      }
    }

    // === Mini-Tournament: handle non-participant entries ===
    {
      const ci2m = useGameStore.getState().calendarIndex;
      const entry2m = useGameStore.getState().seasonCalendar?.[ci2m];
      if (entry2m?.type === "mini") {
        const mBkt = useGameStore.getState().miniTournamentBracket;
        const shouldSkipM = !mBkt || mBkt.playerEliminated;
        if (shouldSkipM) {
          const mMod2 = getModifier(s.leagueTier);
          if (entry2m.round === "sf_leg1") {
            if (!mBkt) {
              const mSorted = sortStandings(useGameStore.getState().league?.table || []);
              const mTop4 = mSorted.slice(0, 4).map(r => ({ teamIndex: r.teamIndex, name: useGameStore.getState().league?.teams?.[r.teamIndex]?.name }));
              const mlt = useGameStore.getState().league?.teams || [];
              s.setMiniTournamentBracket({
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
              s.setMiniTournamentBracket(prev => ({
                ...prev,
                sf1: { ...prev.sf1, leg1: { homeGoals: mr1.homeGoals, awayGoals: mr1.awayGoals } },
                sf2: { ...prev.sf2, leg1: { homeGoals: mr2.homeGoals, awayGoals: mr2.awayGoals } },
              }));
              s.setInboxMessages(prev => [...prev, createInboxMessage(
                MSG.miniSFLeg1Bg2(`${mbk.sf1.home.name} ${mr1.homeGoals}-${mr1.awayGoals} ${mbk.sf1.away.name}\n${mbk.sf2.home.name} ${mr2.homeGoals}-${mr2.awayGoals} ${mbk.sf2.away.name}`),
                { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
              )]);
            }
            s.setCalendarResults(prev => ({ ...prev, [ci2m]: { spectator: true, label: "Mini SF Leg 1" } }));
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
              s.setMiniTournamentBracket(prev => ({
                ...prev,
                sf1: { ...prev.sf1, leg2: { homeGoals: mr1.homeGoals, awayGoals: mr1.awayGoals }, winner: mw1 },
                sf2: { ...prev.sf2, leg2: { homeGoals: mr2.homeGoals, awayGoals: mr2.awayGoals }, winner: mw2 },
                final: { home: mw1, away: mw2, result: null },
              }));
              s.setInboxMessages(prev => [...prev, createInboxMessage(
                MSG.miniSFLeg2Bg2(`${mw1.name} and ${mw2.name} advance to the final on aggregate.`),
                { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
              )]);
            }
            s.setCalendarResults(prev => ({ ...prev, [ci2m]: { spectator: true, label: "Mini SF Leg 2" } }));
          } else if (entry2m.round === "final") {
            const mbk = useGameStore.getState().miniTournamentBracket;
            if (mbk?.final?.home && mbk?.final?.away && !mbk.final.result) {
              const mfR = simulateMatch(mbk.final.home, mbk.final.away, null, null, true, 1, 0, null, 0, mMod2);
              let mfW = mfR.homeGoals > mfR.awayGoals ? mbk.final.home : mfR.awayGoals > mfR.homeGoals ? mbk.final.away : null;
              if (!mfW) { const p = generatePenaltyShootout(mbk.final.home, mbk.final.away, mfR.events, null, null, mMod2); mfW = p.winner === "home" ? mbk.final.home : mbk.final.away; }
              s.setMiniTournamentBracket(prev => ({ ...prev, final: { ...prev.final, result: { homeGoals: mfR.homeGoals, awayGoals: mfR.awayGoals, winner: mfW } }, winner: mfW }));
              s.setInboxMessages(prev => [...prev, createInboxMessage(
                MSG.miniFinalBg2(`${mfW.name} won the 5v5 Mini-Tournament! ${mfR.homeGoals}-${mfR.awayGoals}`),
                { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
              )]);
            }
            s.setCalendarResults(prev => ({ ...prev, [ci2m]: { spectator: true, label: "Mini Final" } }));
          }
          s.setCalendarIndex(prev => prev + 1);
        }
      }
    }

    // === Dynasty Cup: handle non-participant entries ===
    {
      const ci2 = useGameStore.getState().calendarIndex;
      const entry2 = useGameStore.getState().seasonCalendar?.[ci2];
      if (entry2?.type === "dynasty") {
        const bracket = useGameStore.getState().dynastyCupBracket;
        const shouldSkip = !bracket || bracket.playerEliminated;
        if (shouldSkip) {
          const dMod = getModifier(s.leagueTier);
          if (entry2.round === "sf") {
            if (!bracket && s.dynastyCupQualifiers) {
              const q = s.dynastyCupQualifiers;
              const lt = s.league.teams;
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
                { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
              )]);
            }
            s.setCalendarResults(prev => ({ ...prev, [ci2]: { spectator: true, label: "Dynasty Cup Semi-Finals" } }));
          } else if (entry2.round === "final") {
            const bk = useGameStore.getState().dynastyCupBracket;
            if (bk?.final?.home && bk?.final?.away && !bk.final.result) {
              const finR = simulateMatch(bk.final.home, bk.final.away, null, null, true, 1, 0, null, 0, dMod);
              let finW = finR.homeGoals > finR.awayGoals ? bk.final.home : finR.awayGoals > finR.homeGoals ? bk.final.away : null;
              if (!finW) { const p = generatePenaltyShootout(bk.final.home, bk.final.away, finR.events, null, null, dMod); finW = p.winner; }
              s.setDynastyCupBracket(prev => ({ ...prev, final: { ...prev.final, result: { homeGoals: finR.homeGoals, awayGoals: finR.awayGoals, winner: finW } }, winner: finW }));
              s.setInboxMessages(prev => [...prev, createInboxMessage(
                MSG.dynastyFinalBg(`${finW.name} won the Dynasty Cup, beating ${finW === bk.final.home ? bk.final.away.name : bk.final.home.name} ${finR.homeGoals}-${finR.awayGoals} in the final.`),
                { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
              )]);
            }
            s.setCalendarResults(prev => ({ ...prev, [ci2]: { spectator: true, label: "Dynasty Cup Final" } }));
          }
          s.setCalendarIndex(prev => prev + 1);
        }
      }
    }

    // === Set matchPending for next calendar entry ===
    if (!s.summerPhase) {
      const _nextCal = useGameStore.getState().seasonCalendar?.[useGameStore.getState().calendarIndex];
      if (!_nextCal) {
        // Calendar exhausted — advanceWeek will handle season-end on next call
      } else if (_nextCal.type === "dynasty") {
        const _dBracket = useGameStore.getState().dynastyCupBracket;
        if (_dBracket && !_dBracket.playerEliminated) {
          s.setMatchPending(true);
        }
      } else if (_nextCal.type === "mini") {
        const _mBracket = useGameStore.getState().miniTournamentBracket;
        if (_mBracket && !_mBracket.playerEliminated) {
          const _mRound = _nextCal.round;
          const _playerInFinal = _mBracket.playerInFinal;
          if (_mRound === "third_place" && _playerInFinal) {
            const _mMod = getModifier(s.leagueTier);
            const _tp = _mBracket.thirdPlace;
            if (_tp && !_tp.winner) {
              const _tpR = simulateMatch(_tp.home, _tp.away, null, null, true, 1, 0, null, 0, _mMod);
              let _tpW = _tpR.homeGoals > _tpR.awayGoals ? _tp.home : _tpR.awayGoals > _tpR.homeGoals ? _tp.away : null;
              if (!_tpW) { const _tpP = generatePenaltyShootout(_tp.home, _tp.away, _tpR.events, null, null, _mMod); _tpW = _tpP.winner === "home" ? _tp.home : _tp.away; }
              s.setMiniTournamentBracket(prev => ({
                ...prev,
                thirdPlace: { ...prev.thirdPlace, result: { homeGoals: _tpR.homeGoals, awayGoals: _tpR.awayGoals, winner: _tpW }, winner: _tpW },
                thirdPlaceWinner: _tpW,
              }));
              s.setInboxMessages(prev => [...prev, createInboxMessage(
                MSG.mini3rd(`${_tpW.name} beat ${_tpW === _tp.home ? _tp.away.name : _tp.home.name} ${_tpR.homeGoals}-${_tpR.awayGoals} to claim 3rd place and the final promotion spot.`),
                { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
              )]);
            }
            s.setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "3rd Place Playoff" } }));
            s.setCalendarIndex(prev => prev + 1);
            const _nextCal2 = useGameStore.getState().seasonCalendar?.[useGameStore.getState().calendarIndex + 1];
            if (_nextCal2?.type === "mini" && _nextCal2.round === "final") {
              s.setMatchPending(true);
            }
          } else if (_mRound === "final" && _playerInFinal === false) {
            s.setCalendarResults(prev => ({ ...prev, [useGameStore.getState().calendarIndex]: { spectator: true, label: "Mini Final" } }));
            s.setCalendarIndex(prev => prev + 1);
          } else {
            s.setMatchPending(true);
          }
        }
      } else {
        // Intergalactic Elite: generate pre-match prediction for league matches
        const _predMod2 = getModifier(s.leagueTier);
        if (_predMod2.prediction && _nextCal.type === "league") {
          const _fix2 = s.league?.fixtures?.[_nextCal.leagueMD]?.find(f => f.home === 0 || f.away === 0);
          const _plHome2 = _fix2 ? _fix2.home === 0 : true;
          const _ps2 = [0,0,0,1,1,1,1,1,2,2,2,2,3,3,3,4,4,5];
          let _pred2;
          for (let _try = 0; _try < 20; _try++) {
            const h = pickRandom(_ps2);
            const a = pickRandom(_ps2);
            const aiWins = _plHome2 ? a > h : h > a;
            if (!aiWins) { _pred2 = { home: h, away: a }; break; }
          }
          aiPredictionRef.current = _pred2 || { home: 1, away: 1 };
        }
        s.setMatchPending(true);
      }
    }
  }, [setGains, setOvrLevelUps, setRecentOvrLevelUps, setInjuryWarning, tryUnlockAchievement, pendingTrialAction, aiPredictionRef]);

  return { processGainsDone };
}
