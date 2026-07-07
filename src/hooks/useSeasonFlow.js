import { useCallback } from "react";
import { useGameStore } from "../store/gameStore.js";
import { ATTRIBUTES } from "../data/training.js";
import { LEAGUE_DEFS } from "../data/leagues.js";
import { ARC_TICKET_POOL } from "../data/storyArcs.js";
import { MSG } from "../data/messages.js";
import { getModifier } from "../data/leagueModifiers.js";
import { getOverall, pickRandom, rand } from "../utils/calc.js";
import { getOvrCap } from "../utils/player.js";
import { getBoardExpectation } from "../utils/boardExpectations.js";
import { getArcById, applyFinalReward, processArcCompletion, precomputeArcEffects, getStepNarrative } from "../utils/arcs.js";
import { createInboxMessage } from "../utils/messageUtils.js";
import { generateAITransferOffers } from "../utils/transfer.js";
import { buildSeasonPreviewBody, getTenureBand, getSeasonContext } from "../utils/seasonPreview.js";
import { computeSeasonAwards, buildGoldenBootBody, buildYoungPlayerOfSeasonBody, buildPlayerOfSeasonBody, collectAwardsNightAchievements } from "../utils/seasonAwards.js";
import { generateAwardsHeadline } from "../utils/headlines.js";

const FILTER_LABELS = { DEF: "Defenders", MID: "Midfielders", FWD: "Forwards", GK: "Goalkeepers" };

/**
 * Extracts the season-end flow from App.jsx:
 *   - triggerSeasonEnd: fired by "END SEASON" button, applies pending arc rewards
 *   - advanceSummer: drives the 6-week summer break, one event per click
 *
 * All game state is read fresh from useGameStore.getState() on each call.
 * Only React useState setters and component-local callbacks are passed as params.
 */
export function useSeasonFlow({
  // useState setters (not in Zustand)
  setWeekTransition,
  setGains,
  setShowYouthIntake,
  // Component-local callbacks
  tryUnlockAchievement,
}) {

  // Triggered by "END SEASON" button — applies any pending arc final rewards, then opens SeasonEndReveal
  const triggerSeasonEnd = useCallback(() => {
    const s = useGameStore.getState();
    const {
      processing, squad, league, storyArcs, prodigalSon, trialPlayer, trialHistory,
      leagueTier, consecutiveWins, halfwayPosition, cup, unlockedAchievements,
      calendarIndex, seasonNumber, prestigeLevel,
    } = s;
    const ovrCap = getOvrCap(prestigeLevel || 0);

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
        const intendedBoostSE = !!(ffxSE.targetWeakest || ffxSE.squadStats || ffxSE.squadAll || ffxSE.prodigalBoost);
        const targetExistsSE = ffxSE.targetWeakest ? newSquad.some(p => p.id === targetId) : true;
        let gainCountSE = 0;
        newSquad.forEach(p => {
          const pre = preBoostSE[p.id] || {};
          Object.keys(p.attrs).forEach(k => { if ((p.attrs[k] || 0) > (pre[k] || 0)) gainCountSE++; });
        });
        if (intendedBoostSE && targetExistsSE && gainCountSE === 0) {
          const pick = pickRandom(ARC_TICKET_POOL);
          s.setTickets(prev => [...prev, { id: `t_arc_se_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, type: pick }]);
        }

        // Queue arc completion modal so player sees it before SeasonEndReveal
        const cat = arc.cat;
        const tracking = arcSnap[cat]?.tracking;
        const narr = getStepNarrative(arc.id, arc.steps.length - 1, tracking, newSquad);
        s.setArcStepQueue(q => [...q, {
          arcId: arc.id, arcName: arc.name, arcIcon: arc.icon, cat,
          stepIdx: arc.steps.length - 1,
          stepDesc: arc.steps[arc.steps.length - 1]?.desc || "",
          narrative: narr, isComplete: true, rewardDesc: arc.rewardDesc,
        }]);

        // Inbox message
        const rewardBody = (intendedBoostSE && targetExistsSE && gainCountSE === 0)
          ? `${arc.rewardDesc}\nYour squad is already maxed — a bonus ticket has been added to your cabinet instead.`
          : arc.rewardDesc;
        s.setInboxMessages(pm => [...pm, createInboxMessage(
          MSG.arcComplete(arc.name, rewardBody),
          { calendarIndex, seasonNumber },
        )]);

        // Process arc completion: bonuses + meta-achievements
        const completionResult = processArcCompletion(
          arc, arcSnap[cat] || {},
          [...(arcSnap.completed || []), ...newCompletedIds],
          newBonuses,
          { unlockedAchievements, seasonNumber, week: calendarIndex + 1 }
        );
        newBonuses = completionResult.bonuses;
        newCompletedIds.push(arc.id);
        completionResult.achievements.forEach(a => achievementsToUnlock.push(a));
        appliedIds.push(arc.id);
      }
    }

    if (appliedIds.length > 0) {
      s.setSquad(newSquad);
      s.setStoryArcs(prev => {
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
        achievementsToUnlock.forEach(a => tryUnlockAchievement(a));
      }
    }

    s.setSummerPhase("break");
    s.setSummerData(prev => ({ ...(prev || {}), weeksLeft: 6 }));
    setTimeout(() => setWeekTransition(false), 1500);
  }, []); // All state read from getState()

  // Drives the 6-week summer break, one event per click
  const advanceSummer = useCallback(() => {
    const s = useGameStore.getState();
    const {
      processing, squad, league, storyArcs, prodigalSon, trialPlayer, trialHistory,
      leagueTier, consecutiveWins, halfwayPosition, cup, calendarIndex, seasonNumber,
      summerData, playerSeasonStats, loanedOutPlayers, loanedInPlayers,
      clubRelationships, allLeagueStates, prestigeLevel,
    } = s;
    const ovrCap = getOvrCap(prestigeLevel || 0);

    if (processing) return;
    s.setProcessing(true);
    if (!useGameStore.getState().isOnHoliday) setWeekTransition(true);
    const wl = summerData?.weeksLeft ?? 6;

    // Decrements the transfer window countdown and fires the deadline-week /
    // closed inbox beats when the new value crosses those thresholds. Reads
    // transferWindowOpen/transferWindowWeeksRemaining fresh from the store
    // (not from the destructured snapshot above) because the beat that OPENS
    // the window (wl===4) also calls this in the same tick — the snapshot
    // taken at function entry would still show the window closed.
    const decrementTransferWindow = () => {
      const { transferWindowOpen: isOpen, transferWindowWeeksRemaining: remaining } = useGameStore.getState();
      if (!isOpen) return;
      const newRemaining = Math.max(0, remaining - 1);
      s.setTransferWindowWeeksRemaining(newRemaining);
      if (newRemaining === 1) {
        s.setInboxMessages(prev => [...prev, createInboxMessage(
          MSG.transferWindowFinalWeek(),
          { calendarIndex, seasonNumber },
        )]);
      } else if (newRemaining === 0) {
        s.setInboxMessages(prev => [...prev, createInboxMessage(
          MSG.transferWindowClosed(),
          { calendarIndex, seasonNumber },
        )]);
      }
    };

    if (wl === 6) {
      // Week 1: Apply any pending arc final rewards missed due to timing bugs.
      // SeasonEndReveal fires on the NEXT click (wl=5) to avoid overlap with gains popup.
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
          const intendedBoostGP = !!(ffxGP.targetWeakest || ffxGP.squadStats || ffxGP.squadAll || ffxGP.prodigalBoost);
          const targetExistsGP = ffxGP.targetWeakest ? newSquad.some(p => p.id === targetId) : true;
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
          if (intendedBoostGP && targetExistsGP && gainCountGP === 0) {
            const pick = pickRandom(ARC_TICKET_POOL);
            s.setTickets(prev => [...prev, { id: `t_arc_gp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, type: pick }]);
          }
          s.setArcStepQueue(q => [...q, {
            arcId: arc.id, arcName: arc.name, arcIcon: arc.icon, cat: arc.cat,
            stepIdx: arc.steps.length - 1,
            stepDesc: arc.steps[arc.steps.length - 1]?.desc || "",
            narrative: null, isComplete: true, rewardDesc: arc.rewardDesc,
          }]);
          appliedIds.push(arc.id);
        }
        if (appliedIds.length > 0) {
          // Reset each player's gains to only show the delta from this session's arc rewards.
          newSquad = newSquad.map(p => {
            const before = initialAttrs[p.id] || {};
            const freshGains = {};
            Object.keys(p.attrs).forEach(k => {
              const diff = (p.attrs[k] || 0) - (before[k] || 0);
              if (diff > 0) freshGains[k] = diff;
            });
            return { ...p, gains: freshGains };
          });
          s.setPendingSquad(newSquad);
          setGains({ improvements: [], injuries: [], duos: [], recoveries: [], progress: [], arcBoosts: arcBoostGains, ticketBoosts: [] });
          s.setStoryArcs(prev => ({ ...prev, rewardsApplied: [...(prev.rewardsApplied || []), ...appliedIds] }));
        }
      }

      // LOAN RETURNS (Summer Week 1 of new season)
      // Process loaned-out players returning with OVR/potential changes
      if (loanedOutPlayers.length > 0) {
        const returningPlayers = loanedOutPlayers.filter(loan => loan.returnSeason <= seasonNumber);
        if (returningPlayers.length > 0) {
          s.setSquad(prev => {
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
                  const attr = pickRandom(attrKeys);
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
          s.setLoanedOutPlayers(prev => prev.filter(loan => loan.returnSeason > seasonNumber));
        }
      }

      // Process loaned-in players returning to parent clubs (remove from squad)
      if (loanedInPlayers.length > 0) {
        const returning = loanedInPlayers.filter(loan => loan.returnSeason <= seasonNumber);
        if (returning.length > 0) {
          s.setSquad(prev => prev.filter(p => !returning.some(loan => loan.player.id === p.id)));
          s.setLoanedInPlayers(prev => prev.filter(loan => loan.returnSeason > seasonNumber));
          // Apply relationship penalty for each loan return
          returning.forEach(loan => {
            s.setClubRelationships(prev => {
              const entry = prev[loan.parentClub] || { pct: 0, tier: leagueTier };
              return { ...prev, [loan.parentClub]: { ...entry, pct: Math.max(0, entry.pct - 5) } };
            });
          });
        }
      }

      // Always advance to wl=5 regardless — SeasonEndReveal fires there
      s.setSummerData(prev => ({...prev, weeksLeft: 5}));
      setTimeout(() => { s.setProcessing(false); setWeekTransition(false); }, 1500);

    } else if (wl === 5) {
      // Week 2: Season End reveal (promotion / relegation / champions)
      s.setSummerPhase("summary");
      setTimeout(() => { s.setProcessing(false); setWeekTransition(false); }, 1500);

    } else if (wl === 4) {
      // Week 3: Team of the Season email
      let topScorer = null, topGoals = 0, topMotmName = null, topMotm = 0;
      Object.entries(playerSeasonStats).forEach(([name, st]) => {
        if ((st.goals || 0) > topGoals) { topGoals = st.goals; topScorer = name; }
        if ((st.motm || 0) > topMotm) { topMotm = st.motm; topMotmName = name; }
      });
      const sorted = [...squad].sort((a, b) => getOverall(b) - getOverall(a));
      const totsNames = sorted.slice(0, 3).map(p => p.name).join(", ");
      // Club-scoped review only — the OFFICIAL awards (Golden Boot, Player of
      // the Season) are league-wide and announced at the Awards Night beat one
      // click later; claiming them here from squad-only stats could crown a
      // different name than the real winner.
      let totsBody = `The season in review at ${league?.leagueName || "the league"}.`;
      if (topScorer && topGoals > 0) totsBody += ` Your top scorer: ${topScorer} with ${topGoals} goal${topGoals !== 1 ? "s" : ""}.`;
      if (topMotmName && topMotm > 0) totsBody += ` Most match-winning displays: ${topMotmName} (${topMotm} MOTM).`;
      if (totsNames) totsBody += ` Your standout performers: ${totsNames}. League awards night is coming up.`;
      s.setInboxMessages(prev => [...prev, createInboxMessage(
        MSG.teamOfTheSeason(totsBody),
        { calendarIndex, seasonNumber },
      )]);

      // TRANSFER WINDOW OPENS (Summer Week 3)
      s.setTransferWindowOpen(true);
      const twMod = getModifier(leagueTier);
      s.setTransferWindowWeeksRemaining(twMod.transferWindowWeeks || 6); // Federation: 9 weeks
      s.setTradesMadeInWindow(0); // Reset trade counter for new window
      const offers = generateAITransferOffers(clubRelationships, squad, allLeagueStates);
      s.setTransferOffers(offers);
      s.setInboxMessages(prev => [...prev, createInboxMessage(
        MSG.transferWindowOpen(),
        { calendarIndex, seasonNumber },
      )]);

      s.setSummerData(prev => ({...prev, weeksLeft: 3}));
      decrementTransferWindow();
      setTimeout(() => { s.setProcessing(false); setWeekTransition(false); }, 1500);

    } else if (wl === 3) {
      // Week 4: Awards Night — Golden Boot, Young Player of the Season,
      // Player of the Season, posted smallest-to-biggest so POTS lands last
      // (newest/top of inbox). Derivation lives in utils/seasonAwards.js —
      // league-wide, not player-squad-only. Gracefully no-ops on a thin/fresh
      // season (no qualifying candidates yet).
      {
        const freshState = useGameStore.getState();
        const awards = computeSeasonAwards({
          squad, teamName: freshState.teamName,
          playerSeasonStats, playerRatingTracker: freshState.playerRatingTracker,
          league, seasonLeagueStats: (freshState.seasonLeagueStatsByTier || {})[leagueTier] || null,
        });

        const awardsNightAchs = collectAwardsNightAchievements({
          awards, squad, teamName: freshState.teamName, playerSeasonStats, league,
          unlockedAchievements: freshState.unlockedAchievements,
        });
        awardsNightAchs.forEach(id => tryUnlockAchievement(id));

        const goldenBootBody = buildGoldenBootBody(awards.goldenBoot);
        if (goldenBootBody) {
          s.setInboxMessages(prev => [...prev, createInboxMessage(
            MSG.goldenBootAward(goldenBootBody),
            { calendarIndex, seasonNumber },
          )]);
        }

        const ypotsBody = buildYoungPlayerOfSeasonBody(awards.youngPlayerOfSeason);
        if (ypotsBody) {
          s.setInboxMessages(prev => [...prev, createInboxMessage(
            MSG.youngPlayerOfSeasonAward(ypotsBody),
            { calendarIndex, seasonNumber },
          )]);
        }

        const potsBody = buildPlayerOfSeasonBody(awards.playerOfSeason);
        if (potsBody) {
          // Newspaper flavour lives in the message body, not the dashboard
          // masthead — see generateAwardsHeadline's docstring for why
          // setLatestHeadline is skipped here (summer-break back-page gate).
          const { headline, byline: hlByline } = generateAwardsHeadline({
            teamName: freshState.teamName,
            winnerName: awards.playerOfSeason.winner.name,
            newspaperName: freshState.newspaperName,
            reporterName: freshState.reporterName,
          });
          const attribution = freshState.newspaperName
            ? `\n\n"${headline}"\n— ${freshState.newspaperName}${hlByline ? ` (${hlByline})` : ""}`
            : "";
          s.setInboxMessages(prev => [...prev, createInboxMessage(
            MSG.playerOfSeasonAward(potsBody + attribution),
            { calendarIndex, seasonNumber },
          )]);
        }
      }

      s.setSummerData(prev => ({...prev, weeksLeft: 2}));
      decrementTransferWindow();
      setTimeout(() => { s.setProcessing(false); setWeekTransition(false); }, 1500);

    } else if (wl === 2) {
      // Week 5: Retirements + Youth Intake
      setShowYouthIntake(true);
      s.setSummerPhase("intake");
      // YouthIntake onDone will set weeksLeft=1 and return to break
      decrementTransferWindow();
      setTimeout(() => { s.setProcessing(false); setWeekTransition(false); }, 1500);

    } else {
      // Week 6: Well Rested boosts + New season preview, then end summer
      const attrKeys = ATTRIBUTES.map(a => a.key);
      const eligible = squad.filter(p => !p.isTrial && attrKeys.some(k => (p.attrs[k] || 0) < (p.legendCap || ovrCap)));
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, Math.min(3, shuffled.length));
      const arcBoosts = [];
      const newSquad = useGameStore.getState().squad.map(p => {  // Use ref for fresh data, not stale state!
        const pick = chosen.find(c => c.id === p.id);
        if (!pick) return p;
        const playerCap = p.legendCap || ovrCap;
        const boostable = attrKeys.filter(k => (p.attrs[k] || 0) < playerCap);
        if (boostable.length === 0) return p; // fully maxed, skip
        const attr = pickRandom(boostable);
        const amt = rand(1, 3);
        const oldVal = p.attrs[attr] || 0;
        const newVal = Math.min(playerCap, oldVal + amt);
        arcBoosts.push({ playerName: p.name, playerPosition: p.position, attr, oldVal, newVal, isArcBoost: true, sourceKey: "well_rested" });
        return { ...p, attrs: { ...p.attrs, [attr]: newVal }, gains: { ...(p.gains || {}), [attr]: (p.gains?.[attr] || 0) + (newVal - oldVal) } };
      });
      s.setPendingSquad(newSquad);
      setGains({ improvements: [], injuries: [], duos: [], recoveries: [], progress: [], arcBoosts, ticketBoosts: [] });
      const names = arcBoosts.map(b => b.playerName.split(" ").pop()).join(", ");
      const newLeagueName = league?.leagueName || LEAGUE_DEFS[leagueTier]?.name || "the new division";
      // Pick strongest AI team by average squad OVR (not standings — all teams have 0 pts at season start)
      const aiTeams = (league?.teams || []).filter(t => t && !t.isPlayer && t.squad?.length);
      const topAI = aiTeams.length > 0
        ? aiTeams.reduce((best, t) => {
            const avg = t.squad.reduce((sum, p) => sum + getOverall(p), 0) / t.squad.length;
            return avg > best.avg ? { name: t.name, avg } : best;
          }, { name: null, avg: -1 })
        : null;
      const topTeamName = topAI?.name || null;
      // Single source of truth for the board's demand (also shown on the
      // dashboard); the tenure/context preview copy wraps around it.
      const expectation = getBoardExpectation(leagueTier).line;
      // Fresh reads — tenure/context copy needs last season's outcome, not
      // whatever this closure captured when advanceSummer was first called.
      const { lastSeasonMove, clubHistory } = useGameStore.getState();
      const previewBody = buildSeasonPreviewBody({
        seasonNumber, leagueTier, leagueName: newLeagueName, topTeamName, expectation,
        lastSeasonMove, clubHistory,
      });
      // Fixtures And Fittings — the preview's own tenure/context read, kept
      // in lockstep with buildSeasonPreviewBody's internals rather than
      // re-deriving band/context independently.
      const previewBand = getTenureBand(seasonNumber);
      const previewContext = previewBand === "fresh" ? "default" : getSeasonContext({ lastSeasonMove, clubHistory, leagueTier });
      if (previewBand === "veteran" && previewContext === "default") tryUnlockAchievement("fixtures_and_fittings");
      s.setInboxMessages(prev => [...prev,
        ...(names ? [createInboxMessage(MSG.wellRested(names), { calendarIndex, seasonNumber })] : []),
        createInboxMessage(MSG.seasonPreview(previewBody), { calendarIndex, seasonNumber }),
      ]);
      decrementTransferWindow();
      s.setSummerPhase(null);
      s.setSummerData(null);
      setTimeout(() => { s.setProcessing(false); setWeekTransition(false); }, 1500);
    }
  }, []); // All state read from getState()

  return { triggerSeasonEnd, advanceSummer };
}
