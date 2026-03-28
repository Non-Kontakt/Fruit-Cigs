import { useCallback } from "react";
import { useGameStore } from "../store/gameStore.js";
import { ATTRIBUTES } from "../data/training.js";
import { LEAGUE_DEFS, NUM_TIERS } from "../data/leagues.js";
import { ARC_CATS } from "../data/storyArcs.js";
import { MSG } from "../data/messages.js";
import { getModifier } from "../data/leagueModifiers.js";
import { rand, getOverall } from "../utils/calc.js";
import { generateFreeAgent, getOvrCap } from "../utils/player.js";
import { getArcById, checkArcCond, getStepNarrative, processArcCompletion, resolveSeasonEndArcs } from "../utils/arcs.js";
import { sortStandings, collectSeasonEndAchievements, processSeasonSwaps, initLeagueRosters, advanceCupRound, buildNextCupRound } from "../utils/league.js";
import { checkAchievements } from "../utils/achievements.js";
import { createInboxMessage } from "../utils/messageUtils.js";
import { BGM } from "../utils/sfx.js";

const DEFAULT_FIXTURE_COUNT = 18;

/**
 * Extracts the MatchResultScreen onDone callback from App.jsx.
 *
 * All game state is read fresh from useGameStore.getState() on each call,
 * eliminating stale closure bugs. Only React useState setters and
 * component-local callbacks that can't live in Zustand are passed as params.
 */
export function useMatchResult({
  setMatchResult,
  setAchievementQueue,
  tryUnlockAchievement,
  updateUltimatumProgress,
  updateMatchLog,
  pendingLeagueRef,
  cardedPlayerIdsRef,
  aiPredictionRef,
  weekRecoveriesRef,
  achievableIdsRef,
}) {
  const processMatchDone = useCallback((matchResult, wasAlwaysFast, wasAlwaysNormal) => {
    const s = useGameStore.getState();
    const ovrCap = getOvrCap(s.prestigeLevel || 0);

    try {
      // === Flush deferred league table update ===
      let currentLeague = s.league;
      if (pendingLeagueRef.current) {
        currentLeague = pendingLeagueRef.current;
        s.setLeague(currentLeague);
        pendingLeagueRef.current = null;
      }

      // Tier 8: Track carded player team players so they skip next training
      const dojoMod = getModifier(s.leagueTier);
      if (dojoMod.cardSkipsTraining && matchResult?.events) {
        const playerTeamName = currentLeague.teams[0]?.name;
        const cardedNames = matchResult.events
          .filter(e => (e.type === "card" || e.type === "red_card") && e.cardTeamName === playerTeamName && e.cardPlayer)
          .map(e => e.cardPlayer);
        if (cardedNames.length > 0) {
          const cardedIds = s.squad.filter(p => cardedNames.includes(p.name)).map(p => p.id);
          cardedIds.forEach(id => cardedPlayerIdsRef.current.add(id));
        }
      }

      // === CRITICAL: Calendar advancement FIRST ===
      const playerIsHome = currentLeague.teams[matchResult.home]?.isPlayer;
      const playerGoals = playerIsHome ? matchResult.homeGoals : matchResult.awayGoals;
      const oppGoals = playerIsHome ? matchResult.awayGoals : matchResult.homeGoals;
      const playerWon = playerGoals > oppGoals;
      const isDraw = playerGoals === oppGoals;
      const playerLost = oppGoals > playerGoals;

      // Store result in calendar and advance index
      const calIdx = matchResult._calendarIndex != null ? matchResult._calendarIndex : s.calendarIndex;
      s.setCalendarResults(prev => ({
        ...prev,
        [calIdx]: { playerGoals, oppGoals, won: playerWon, draw: isDraw }
      }));
      let newCalIdx = calIdx + 1;
      const cal = s.seasonCalendar || [];
      while (newCalIdx < cal.length && cal[newCalIdx]?.type === "cup" && s.cup?.playerEliminated) {
        if (s.cup && s.cup.currentRound < s.cup.rounds.length) {
          const skipLookup = (name, tier) => (tier === s.leagueTier ? currentLeague : s.allLeagueStates?.[tier])?.teams?.find(t => t.name === name) || null;
          const skipCup = advanceCupRound(s.cup, s.squad, s.startingXI, s.bench, skipLookup);
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
            finCup = buildNextCupRound(finCup);
          }
          s.setCup(finCup);
        }
        newCalIdx++;
      }
      s.setCalendarIndex(newCalIdx);

      // === Season end check ===
      if (newCalIdx >= cal.length) {
        const currentTier = currentLeague.tier || s.leagueTier;
        const currentRosters = s.leagueRosters || initLeagueRosters();
        const swapResult = processSeasonSwaps(currentRosters, currentLeague, currentTier, s.allLeagueStates);
        const position = swapResult.playerPosition;
        let newTier = swapResult.playerNewTier;
        const _mod = getModifier(currentTier);
        const _mBkt = s.miniTournamentBracket;
        if (_mod.miniTournament && currentTier > 1 && _mBkt) {
          const _dRU = _mBkt.runnerUp || (_mBkt.winner && _mBkt.final?.home && _mBkt.final?.away ? (_mBkt.winner.name === _mBkt.final.home.name ? _mBkt.final.away : _mBkt.final.home) : null);
          const _promoted = _mBkt.winner?.isPlayer || _dRU?.isPlayer || (_mBkt.thirdPlaceWinner || _mBkt.thirdPlace?.winner)?.isPlayer;
          if (_promoted && newTier >= currentTier) newTier = currentTier - 1;
        } else {
          if (position <= 3 && currentTier > 1 && newTier >= currentTier) newTier = currentTier - 1;
        }
        if (newTier < currentTier - 1) newTier = currentTier - 1;
        if (newTier > currentTier + 1) newTier = currentTier + 1;
        newTier = Math.max(1, Math.min(NUM_TIERS, newTier));
        const moveType = newTier < currentTier ? "promoted" : newTier > currentTier ? "relegated" : "stayed";
        if (position === 1) s.setLeagueWins(prev => prev + 1);
        if (position === 2) s.setSecondPlaceFinishes(prev => prev + 1);
        s.setLeagueRosters(swapResult.rosters);
        const newSeasonUnlocks = collectSeasonEndAchievements({
          position, currentTier, moveType, newTier, lastSeasonMove: s.lastSeasonMove, league: currentLeague, leagueResults: s.leagueResults,
          playerSeasonStats: s.playerSeasonStats, beatenTeams: s.beatenTeams, unlockedAchievements: s.unlockedAchievements, clubHistory: s.clubHistory,
          wonCupThisSeason: s.unlockedAchievements.has("cup_winner"),
          squad: s.squad, prevSeasonSquadIds: s.prevSeasonSquadIds, seasonNumber: s.seasonNumber,
          dynastyCupBracket: s.dynastyCupBracket, cup: s.cup,
        }, BGM.getCurrentTrackId());
        if (newSeasonUnlocks.length > 0) {
          s.setUnlockedAchievements(prev => { const next = new Set(prev); newSeasonUnlocks.forEach(id => next.add(id)); return next; });
          setAchievementQueue(prev => { const ex = new Set(prev); const f = newSeasonUnlocks.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
        }
        s.setLastSeasonMove(moveType);
        if (moveType === "promoted") { s.setFanSentiment(Math.min(100, s.fanSentiment + 20)); s.setBoardSentiment(Math.min(100, s.boardSentiment + 25)); }
        if (moveType === "relegated") { s.setFanSentiment(Math.max(0, s.fanSentiment - 20)); s.setBoardSentiment(Math.max(0, s.boardSentiment - 25)); }
        if (position === 1) { s.setFanSentiment(Math.min(100, s.fanSentiment + 10)); s.setBoardSentiment(Math.min(100, s.boardSentiment + 10)); }
        const playerRow = sortStandings(currentLeague.table).find(r => currentLeague.teams[r.teamIndex]?.isPlayer);
        s.setSummerData({ moveType, fromTier: currentTier, toTier: newTier, position, leagueName: currentLeague.leagueName || LEAGUE_DEFS[currentTier].name, newLeagueName: LEAGUE_DEFS[newTier].name, newRosters: swapResult.rosters, isInvincible: position === 1 && playerRow?.lost === 0 });
        s.setSummerPhase("summary");

        // Story arc season-end tracking
        {
          const freshCup = s.cup;
          const cupWon3 = freshCup && !freshCup.playerEliminated && (() => {
            const rKeys = Object.keys(freshCup.rounds || {}).map(Number).sort((a,b)=>a-b);
            if (rKeys.length === 0) return false;
            const finalRound = freshCup.rounds[rKeys[rKeys.length-1]];
            return finalRound?.matches?.some(m => m.result?.winner?.isPlayer);
          })();
          s.setStoryArcs(prev => resolveSeasonEndArcs(prev, position, cupWon3));
        }
      }

      // === Achievements ===
      let stScored = false;
      try {
        const oppTeam = playerIsHome ? currentLeague.teams[matchResult.away] : currentLeague.teams[matchResult.home];
        const isHome = playerIsHome;
        const playerSide = playerIsHome ? "home" : "away";
        const starters = s.startingXI.map(id => s.squad.find(p => p.id === id)).filter(Boolean);
        const strikers = starters.filter(p => p.position === "ST");
        if (matchResult.scorers) {
          for (const st of strikers) {
            const key = `${playerSide}|${st.name}`;
            if (matchResult.scorers[key] && matchResult.scorers[key] > 0) { stScored = true; break; }
          }
        }

        const totalFixtures = currentLeague.fixtures?.length || DEFAULT_FIXTURE_COUNT;
        const halfwayMark = Math.floor(totalFixtures / 2);
        const completedMDs = (matchResult._playedMatchweekIndex ?? (s.matchweekIndex - 1)) + 1;
        const leagueMod = getModifier(s.leagueTier);
        if (completedMDs === halfwayMark) {
          const sorted = sortStandings(currentLeague.table);
          const pos = sorted.findIndex(r => currentLeague.teams[r.teamIndex]?.isPlayer) + 1;
          s.setHalfwayPosition(pos);
          if (leagueMod.poachEvent) {
            const p1 = generateFreeAgent(s.leagueTier, ovrCap);
            const p2 = generateFreeAgent(s.leagueTier, ovrCap);
            const p3 = generateFreeAgent(s.leagueTier, ovrCap);
            s.setInboxMessages(prev => [...prev, createInboxMessage(
              MSG.poachEvent(
                `Three players have emerged on the Saudi market. Pick one to sign — the other two will be snapped up by ${sorted[1] ? currentLeague.teams[sorted[1].teamIndex]?.name : "a rival"}.\n\n` +
                `A) ${p1.name} — ${p1.position}, Age ${p1.age}, OVR ${getOverall(p1)}\n` +
                `B) ${p2.name} — ${p2.position}, Age ${p2.age}, OVR ${getOverall(p2)}\n` +
                `C) ${p3.name} — ${p3.position}, Age ${p3.age}, OVR ${getOverall(p3)}`,
                [p1, p2, p3], sorted[1]?.teamIndex ?? 1,
              ),
              { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
            )]);
          }
        }

        // Euro Dynasty: set up Dynasty Cup bracket after final league MD
        if (leagueMod.knockoutAtEnd && completedMDs === totalFixtures) {
          const sorted = sortStandings(currentLeague.table);
          const top4 = sorted.slice(0, 4).map(r => ({ teamIndex: r.teamIndex, name: currentLeague.teams[r.teamIndex]?.name }));
          s.setDynastyCupQualifiers(top4);
          const playerInTop4 = top4.some(t => currentLeague.teams[t.teamIndex]?.isPlayer);
          if (playerInTop4) {
            const sf1Home = currentLeague.teams[top4[0].teamIndex];
            const sf1Away = currentLeague.teams[top4[3].teamIndex];
            const sf2Home = currentLeague.teams[top4[1].teamIndex];
            const sf2Away = currentLeague.teams[top4[2].teamIndex];
            const playerInSF1 = sf1Home.isPlayer || sf1Away.isPlayer;
            s.setDynastyCupBracket({
              sf1: { home: sf1Home, away: sf1Away, result: null },
              sf2: { home: sf2Home, away: sf2Away, result: null },
              final: { home: null, away: null, result: null },
              playerSF: playerInSF1 ? 1 : 2,
              playerEliminated: false,
              winner: null,
            });
          }
          s.setInboxMessages(prev => [...prev, createInboxMessage(
            MSG.dynastyDrawColor(`The league season is over. The top 4 enter the Dynasty Cup knockout!\n\nSF: ${top4[0]?.name || "TBD"} vs ${top4[3]?.name || "TBD"}\nSF: ${top4[1]?.name || "TBD"} vs ${top4[2]?.name || "TBD"}\n\n${playerInTop4 ? "You're in!" : "You didn't make the cut."}`, s.leagueTier),
            { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
          )]);
        }

        // World XI: set up mini-tournament bracket after final league MD
        if (leagueMod.miniTournament && completedMDs === totalFixtures) {
          const sorted = sortStandings(currentLeague.table);
          const top4 = sorted.slice(0, 4).map(r => ({ teamIndex: r.teamIndex, name: currentLeague.teams[r.teamIndex]?.name }));
          const playerInTop4 = top4.some(t => currentLeague.teams[t.teamIndex]?.isPlayer);
          if (playerInTop4) {
            const sf1Home = currentLeague.teams[top4[0].teamIndex];
            const sf1Away = currentLeague.teams[top4[3].teamIndex];
            const sf2Home = currentLeague.teams[top4[1].teamIndex];
            const sf2Away = currentLeague.teams[top4[2].teamIndex];
            const playerInSF1 = sf1Home.isPlayer || sf1Away.isPlayer;
            s.setMiniTournamentBracket({
              sf1: { home: sf1Home, away: sf1Away, leg1: null, leg2: null, winner: null },
              sf2: { home: sf2Home, away: sf2Away, leg1: null, leg2: null, winner: null },
              final: { home: null, away: null, result: null },
              playerSF: playerInSF1 ? 1 : 2,
              playerEliminated: false,
              winner: null,
              fiveASide: true,
            });
          }
          s.setInboxMessages(prev => [...prev, createInboxMessage(
            MSG.miniDraw(`The league season is over. The top 4 enter the 5v5 Mini-Tournament!\n\nSF: ${top4[0]?.name || "TBD"} vs ${top4[3]?.name || "TBD"} (2 legs)\nSF: ${top4[1]?.name || "TBD"} vs ${top4[2]?.name || "TBD"} (2 legs)\n\n${playerInTop4 ? "You're in! (Auto-picking your 5v5 squad)" : "You didn't qualify."}`, s.leagueTier),
            { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
          )]);
        }

        const newUnlocks = checkAchievements({
          squad: s.squad, unlocked: s.unlockedAchievements, achievableIds: achievableIdsRef.current,
          lastMatchResult: matchResult, league: currentLeague, weekGains: null,
          startingXI: s.startingXI, bench: s.bench, matchweekIndex: completedMDs, seasonCards: s.seasonCards,
          totalGains: s.totalGains, totalMatches: s.totalMatches + 1,
          seasonCleanSheets: s.seasonCleanSheets + (oppGoals === 0 ? 1 : 0),
          seasonGoalsFor: s.seasonGoalsFor + playerGoals,
          seasonDraws: s.seasonDraws + (isDraw ? 1 : 0),
          consecutiveUnbeaten: playerLost ? 0 : s.consecutiveUnbeaten + 1,
          consecutiveLosses: playerLost ? s.consecutiveLosses + 1 : 0,
          consecutiveDraws: isDraw ? s.consecutiveDraws + 1 : 0,
          consecutiveWins: playerWon ? s.consecutiveWins + 1 : 0,
          prevStartingXI: s.prevStartingXI, motmTracker: s.motmTracker, stScoredConsecutive: stScored ? s.stScoredConsecutive + 1 : 0,
          playerRatingTracker: s.playerRatingTracker, beatenTeams: s.beatenTeams,
          halfwayPosition: completedMDs === Math.floor((currentLeague.fixtures?.length || DEFAULT_FIXTURE_COUNT) / 2) ? null : s.halfwayPosition,
          seasonHomeUnbeaten: (isHome && playerLost) ? false : s.seasonHomeUnbeaten,
          seasonAwayWins: (!isHome && playerWon) ? s.seasonAwayWins + 1 : s.seasonAwayWins,
          seasonAwayGames: !isHome ? s.seasonAwayGames + 1 : s.seasonAwayGames,
          leagueWins: s.leagueWins, wasAlwaysFast,
          recoveries: weekRecoveriesRef.current || [],
          recentScorelines: [...s.recentScorelines.slice(-2), [playerGoals, oppGoals]],
          secondPlaceFinishes: s.secondPlaceFinishes,
          playerInjuryCount: s.playerInjuryCount,
          benchStreaks: s.benchStreaks,
          highScoringMatches: s.highScoringMatches + ((playerGoals + oppGoals >= 5) ? 1 : 0),
          trialHistory: s.trialHistory,
          playerSeasonStats: s.playerSeasonStats, clubHistory: s.clubHistory, consecutiveScoreless: playerGoals === 0 ? s.consecutiveScoreless + 1 : 0,
          formation: s.formation,
          slotAssignments: s.slotAssignments,
          usedTicketTypes: s.usedTicketTypes, formationsWonWith: playerWon ? new Set([...s.formationsWonWith, s.formation.map(sl => sl.pos).join("-")]) : s.formationsWonWith,
          freeAgentSignings: s.freeAgentSignings, scoutedPlayers: s.scoutedPlayers, transferFocus: s.transferFocus, clubRelationships: s.clubRelationships,
          isOnHoliday: s.isOnHoliday, holidayMatchesThisSeason: s.holidayMatchesThisSeason,
          testimonialPlayer: s.testimonialPlayer,
          seasonNumber: s.seasonNumber, lastSeasonPosition: s.clubHistory?.seasonArchive?.length > 0 ? s.clubHistory.seasonArchive[s.clubHistory.seasonArchive.length - 1].position : null,
          shortlist: s.shortlist, wasAlwaysNormal: !!wasAlwaysNormal,
          fastMatchesThisSeason: s.fastMatchesThisSeason + (wasAlwaysFast ? 1 : 0),
          twelfthManActive: s.twelfthManActive, gkCleanSheets: oppGoals === 0 ? (() => {
            const gk = s.squad?.find(p => s.startingXI.includes(p.id) && p.position === "GK");
            return gk ? { ...s.gkCleanSheets, [gk.name]: (s.gkCleanSheets[gk.name] || 0) + 1 } : s.gkCleanSheets;
          })() : s.gkCleanSheets,
          totalShortlisted: s.totalShortlisted,
        });
        if (newUnlocks.length > 0) {
          s.setUnlockedAchievements(prev => { const next = new Set(prev); newUnlocks.forEach(id => next.add(id)); return next; });
          setAchievementQueue(prev => { const ex = new Set(prev); const f = newUnlocks.filter(id => !ex.has(id)); return f.length > 0 ? [...prev, ...f] : prev; });
        }
      } catch(err) {
        console.error("Achievement check error:", err, err.stack);
      }

      // Euro Dynasty: televised match — MotM gets +1 random ATTR
      const tvMod = getModifier(s.leagueTier);
      if (tvMod.televisedChance && Math.random() < tvMod.televisedChance && matchResult.motmName) {
        const motmPlayer = s.squad?.find(p => p.name === matchResult.motmName);
        if (motmPlayer) {
          const boostable = ATTRIBUTES.filter(a => motmPlayer.attrs[a.key] < ovrCap);
          if (boostable.length > 0) {
            const pick = boostable[rand(0, boostable.length - 1)];
            const oldVal = motmPlayer.attrs[pick.key];
            const newVal = oldVal + 1;
            s.setSquad(prev => prev.map(p => p.id === motmPlayer.id ? { ...p, attrs: { ...p.attrs, [pick.key]: newVal } } : p));
            s.setPendingTicketBoosts(prev => [...prev, {
              playerId: motmPlayer.id, playerName: motmPlayer.name, playerPosition: motmPlayer.position,
              attr: pick.key, oldVal, newVal, source: "televised",
            }]);
            s.setInboxMessages(prev => [...prev, createInboxMessage(
              MSG.televisionBoost(motmPlayer.name, pick.label, s.leagueTier),
              { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
            )]);
          }
        }
      }

      // === Stats tracking ===
      try {
        const playerTeam = currentLeague.teams.find(t => t.isPlayer);
        const oppTeam = playerIsHome ? currentLeague.teams[matchResult.away] : currentLeague.teams[matchResult.home];
        const isHome = playerIsHome;

        if (matchResult.events) {
          const playerCards = matchResult.events.filter(evt => (evt.type === "card" || evt.type === "red_card") && evt.cardTeamName === playerTeam?.name).length;
          if (playerCards > 0) s.setSeasonCards(prev => prev + playerCards);
        }

        s.setTotalMatches(prev => prev + 1);
        s.setSeasonGoalsFor(prev => prev + playerGoals);
        if (oppGoals === 0) s.setSeasonCleanSheets(prev => prev + 1);
        if (isDraw) s.setSeasonDraws(prev => prev + 1);
        if (isHome && playerLost) s.setSeasonHomeUnbeaten(false);
        // Fan & Board Sentiment
        const fanMatchMod = getModifier(s.leagueTier);
        const fanMatchDelta = ((playerWon ? (isHome ? 5 : 6) : isDraw ? -1 : (isHome ? -8 : -5)) +
          (playerGoals >= 3 ? 2 : 0) + (oppGoals === 0 ? 1 : 0)) * (fanMatchMod.fanSentimentMult || 1);
        s.setFanSentiment(Math.max(0, Math.min(100, useGameStore.getState().fanSentiment + fanMatchDelta)));
        const boardDeltaMatch = playerWon ? 3 : isDraw ? 0 : -4;
        const boardChange = boardDeltaMatch < 0 ? boardDeltaMatch * (fanMatchMod.boardScrutinyMult || 1) : boardDeltaMatch;
        s.setBoardSentiment(Math.max(0, Math.min(100, useGameStore.getState().boardSentiment + boardChange)));
        // Intergalactic Elite: AI prediction check
        if (aiPredictionRef.current && fanMatchMod.prediction) {
          const pred = aiPredictionRef.current;
          const predCorrect = pred.home === matchResult.homeGoals && pred.away === matchResult.awayGoals;
          if (predCorrect) {
            const leagueNow = currentLeague;
            if (leagueNow) {
              const oppIdx = playerIsHome ? matchResult.away : matchResult.home;
              const playerIdx = playerIsHome ? matchResult.home : matchResult.away;
              const oppRow = leagueNow.table.find(r => r.teamIndex === oppIdx);
              const playerRowP = leagueNow.table.find(r => r.teamIndex === playerIdx);
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
              if (playerRowP) playerRowP.points -= normalPlayerPts;
              if (pendingLeagueRef.current) pendingLeagueRef.current = leagueNow;
              else s.setLeague({ ...leagueNow, table: leagueNow.table.map(r => ({ ...r })) });
            }
            s.setInboxMessages(prev => [...prev, createInboxMessage(
              MSG.aiPredictionCorrect(pred.home, pred.away),
              { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
            )]);
          } else {
            s.setInboxMessages(prev => [...prev, createInboxMessage(
              MSG.aiPredictionWrong(pred.home, pred.away, matchResult.homeGoals, matchResult.awayGoals, playerLost),
              { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
            )]);
          }
          aiPredictionRef.current = null;
        }
        // Ultimatum tracking (Ironman)
        if (useGameStore.getState().ultimatumActive) {
          updateUltimatumProgress(playerWon, isDraw, useGameStore.getState().cup?.playerEliminated ?? true);
        }
        if (!isHome && playerWon) s.setSeasonAwayWins(prev => prev + 1);
        if (!isHome) s.setSeasonAwayGames(prev => prev + 1);
        if (playerWon && oppTeam) s.setBeatenTeams(prev => new Set([...prev, oppTeam.name]));

        if (playerLost) { s.setConsecutiveLosses(prev => prev + 1); s.setConsecutiveUnbeaten(0); s.setConsecutiveDraws(0); s.setConsecutiveWins(0); }
        else { s.setConsecutiveUnbeaten(prev => prev + 1); s.setConsecutiveLosses(0); }
        if (isDraw) { s.setConsecutiveDraws(prev => prev + 1); s.setConsecutiveWins(0); } else s.setConsecutiveDraws(0);
        if (playerWon) s.setConsecutiveWins(prev => prev + 1); else s.setConsecutiveWins(0);
        if (playerGoals === 0) s.setConsecutiveScoreless(prev => prev + 1); else s.setConsecutiveScoreless(0);

        if (playerWon && s.formation) {
          const formKey = s.formation.map(sl => sl.pos).join("-");
          s.setFormationsWonWith(prev => new Set([...prev, formKey]));
        }

        s.setRecentScorelines(prev => [...prev.slice(-2), [playerGoals, oppGoals]]);
        if (playerGoals + oppGoals >= 5) s.setHighScoringMatches(prev => prev + 1);

        if (oppGoals === 0 && s.startingXI && s.squad) {
          const gk = s.squad.find(p => s.startingXI.includes(p.id) && p.position === "GK");
          if (gk) s.setGkCleanSheets(prev => ({ ...prev, [gk.name]: (prev[gk.name] || 0) + 1 }));
        }

        if (wasAlwaysFast) s.setFastMatchesThisSeason(prev => prev + 1);

        s.setBenchStreaks(prev => {
          const next = {};
          if (s.bench) { s.bench.forEach(id => { next[id] = (prev[id] || 0) + 1; }); }
          return next;
        });

        const newConsWins = playerWon ? s.consecutiveWins + 1 : 0;
        const newConsUnbeaten = playerLost ? 0 : s.consecutiveUnbeaten + 1;
        const newConsLosses = playerLost ? s.consecutiveLosses + 1 : 0;
        const goalDiff = playerGoals - oppGoals;
        s.setClubHistory(prev => {
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
          if (goalDiff > 0 && (!h.biggestWin || goalDiff > h.biggestWin.diff)) h.biggestWin = { score: scoreStr, opponent: oppTeam?.name || "?", season: s.seasonNumber, diff: goalDiff };
          if (goalDiff < 0 && (!h.worstDefeat || goalDiff < h.worstDefeat.diff)) h.worstDefeat = { score: scoreStr, opponent: oppTeam?.name || "?", season: s.seasonNumber, diff: goalDiff };
          return h;
        });

        s.setStScoredConsecutive(prev => stScored ? prev + 1 : 0);

        if (matchResult.motmName) s.setMotmTracker(prev => ({ ...prev, [matchResult.motmName]: (prev[matchResult.motmName] || 0) + 1 }));

        if (matchResult.playerRatings) {
          s.setPlayerRatingTracker(prev => {
            const next = { ...prev };
            matchResult.playerRatings.forEach(pr => { if (pr.rating !== null && pr.id) { if (!next[pr.id]) next[pr.id] = []; next[pr.id] = [...next[pr.id], pr.rating]; } });
            return next;
          });
          s.setPlayerRatingNames(prev => {
            const next = { ...prev };
            matchResult.playerRatings.forEach(pr => { if (pr.id && pr.name) next[pr.id] = pr.name; });
            return next;
          });
        }

        // Update per-player match log for breakout/form tracking
        updateMatchLog(matchResult, playerIsHome, s.startingXI, false, currentLeague);

        s.setPlayerSeasonStats(prev => {
          const next = { ...prev };
          const side = playerIsHome ? "home" : "away";
          s.startingXI.forEach(id => {
            const p = s.squad.find(pl => pl.id === id);
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
            const ptName = playerIsHome ? currentLeague.teams[matchResult.home]?.name : currentLeague.teams[matchResult.away]?.name;
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

        // Track appearances on player objects
        s.setSquad(prev => prev.map(p => {
          if (s.startingXI.includes(p.id)) {
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

        s.setPrevStartingXI([...s.startingXI]);

        // === Career milestone achievements ===
        try {
          const careers = s.clubHistory?.playerCareers || {};
          const getCareerTotal = (name, stat) => {
            const archived = careers[name]?.[stat] || 0;
            const season = s.playerSeasonStats[name]?.[stat] || 0;
            let thisMatch = 0;
            if (stat === "apps" && s.startingXI.some(id => { const p = s.squad.find(pl => pl.id === id); return p?.name === name; })) thisMatch = 1;
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
            if (s.unlockedAchievements.has(ms.id) || s.careerMilestones[ms.id]) continue;
            for (const p of s.squad) {
              const total = getCareerTotal(p.name, ms.stat);
              if (total >= ms.threshold) {
                s.setCareerMilestones(prev => ({ ...prev, [ms.id]: p.name }));
                if (ms.check(p)) {
                  tryUnlockAchievement(ms.id);
                }
                break;
              }
            }
          }
        } catch(err) {
          console.error("Career milestone error:", err);
        }
      } catch(err) {
        console.error("Stats tracking error:", err, err.stack);
      }

      // === Story arc match tracking ===
      try {
        let prodigalSonPreview = s.prodigalSon;
        if (s.prodigalSon && s.prodigalSon.phase === "active") {
          const _wasInXI = s.startingXI.includes(s.prodigalSon.playerId);
          const _oppTeamObj = playerIsHome ? s.league.teams[matchResult.away] : s.league.teams[matchResult.home];
          const _oppName = _oppTeamObj?.name || "";
          const _playerSide = playerIsHome ? "home" : "away";
          const _prodigalPlayer = s.squad.find(p => p.id === s.prodigalSon.playerId);
          let _scored = false;
          if (matchResult.scorers && _prodigalPlayer) {
            const _key = `${_playerSide}|${_prodigalPlayer.name}`;
            if (matchResult.scorers[_key] > 0) _scored = true;
          }
          const _ps = { ...s.prodigalSon };
          if (_wasInXI) _ps.starts = (_ps.starts || 0) + 1;
          if (_scored) _ps.goals = (_ps.goals || 0) + 1;
          if (_oppName === _ps.formerClub && playerWon && _wasInXI) _ps.wonVsFormer = true;
          if (!_ps.wonVsFormer && _scored && _ps.starts >= 10 && _ps.goals >= 3) {
            const _formerInLeague = s.league?.teams?.some(t => !t.isPlayer && t.name === _ps.formerClub);
            if (!_formerInLeague) _ps.wonVsFormer = true;
          }
          if (_ps.starts >= 10 && _ps.goals >= 3 && _ps.wonVsFormer) _ps.phase = "redeemed";
          prodigalSonPreview = _ps;
        }

        s.setStoryArcs(prev => {
          const next = {...prev};
          let changed = false;
          ARC_CATS.forEach(cat => {
            const cs = next[cat];
            if (!cs || cs.completed) return;
            const t = {...(cs.tracking || {})};
            const tid = t.targetId;
            const arc = getArcById(cs.arcId);
            if (!arc) return;

            if (tid) {
              const inXI = s.startingXI.includes(tid);
              if (inXI) { t.starts = (t.starts||0) + 1; t.apps = (t.apps||0) + 1; changed = true; }
              if (playerWon && inXI) { t.winsWithTarget = (t.winsWithTarget||0) + 1; changed = true; }
              if (matchResult.motmName) {
                const tp = s.squad.find(p => p.id === tid);
                if (tp && tp.name === matchResult.motmName) { t.motmCount = (t.motmCount||0) + 1; changed = true; }
              }
            }

            if (playerIsHome) {
              if (playerWon) { t.homeWinStreak = (t.homeWinStreak||0) + 1; changed = true; }
              else { t.homeWinStreak = 0; changed = true; }
              if (oppGoals === 0 && (playerWon || isDraw)) { t.homeCleanSheets = (t.homeCleanSheets||0) + 1; changed = true; }
              if (playerLost) { t.homeLost = true; changed = true; }
            }

            if (playerWon && s.league?.table) {
              const sorted = [...s.league.table].sort((a,b) => b.points-a.points || (b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst));
              const playerPos = sorted.findIndex(r => s.league.teams[r.teamIndex]?.isPlayer) + 1;
              const oppIdx = playerIsHome ? matchResult.away : matchResult.home;
              const oppPos = sorted.findIndex(r => r.teamIndex === oppIdx) + 1;
              if (oppPos < playerPos && oppPos > 0) { t.beatAbove = true; changed = true; }
              if (oppPos === 1) { t.beatLeaders = true; changed = true; }
            }

            if (playerWon && s.trialPlayer && s.startingXI.includes(s.trialPlayer.id)) {
              t.trialWin = true; changed = true;
            }

            next[cat] = {...cs, tracking: t};
          });

          const gs = { squad: s.squad, league: s.league, prodigalSon: prodigalSonPreview, trialPlayer: s.trialPlayer, trialHistory: s.trialHistory, leagueTier: s.leagueTier,
                        consecutiveWins: playerWon ? s.consecutiveWins+1 : 0, halfwayPosition: s.halfwayPosition, cup: s.cup };
          ARC_CATS.forEach(cat => {
            const cs = next[cat];
            if (!cs || cs.completed) return;
            const arc = getArcById(cs.arcId);
            if (!arc) return;
            let step = arc.steps[cs.step];
            while (step && step.t === "cond" && checkArcCond(step, cs.tracking, gs)) {
              const completedStepIdx = next[cat].step;
              const completedStepDesc = step.desc;
              const narr = getStepNarrative(arc.id, completedStepIdx, cs.tracking, s.squad);
              next[cat] = {...next[cat], step: next[cat].step + 1};
              changed = true;
              if (next[cat].step >= arc.steps.length) {
                const result = processArcCompletion(arc, cs, next.completed, next.bonuses, { unlockedAchievements: s.unlockedAchievements, seasonNumber: s.seasonNumber, week: s.calendarIndex + 1 });
                next.bonuses = result.bonuses;
                next.completed = result.completed;
                next[cat] = {...next[cat], completed: true};
                if (result.achievements.length > 0) {
                  result.achievements.forEach(a => tryUnlockAchievement(a));
                }
                s.setInboxMessages(pm => [...pm, createInboxMessage(
                  MSG.arcComplete(arc.name, arc.rewardDesc),
                  { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
                )]);
                s.setArcStepQueue(q => [...q, {
                  arcId:arc.id, arcName:arc.name, arcIcon:arc.icon, cat,
                  stepIdx:completedStepIdx, stepDesc:completedStepDesc, narrative:narr,
                  isComplete:true, rewardDesc:arc.rewardDesc,
                }]);
                break;
              }
              s.setArcStepQueue(q => [...q, {
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

      // === Prodigal son match tracking ===
      try {
        if (s.prodigalSon && s.prodigalSon.phase === "active") {
          const ps = { ...s.prodigalSon };
          const wasInXI = s.startingXI.includes(ps.playerId);
          const oppTeamObj = playerIsHome ? s.league.teams[matchResult.away] : s.league.teams[matchResult.home];
          const oppName = oppTeamObj?.name || "";
          const playerSide = playerIsHome ? "home" : "away";
          let scored = false;
          if (matchResult.scorers) {
            const prodigalPlayer = s.squad.find(p => p.id === ps.playerId);
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
          if (wasInXI && ps.starts === 1 && !ps.sentFlags.firstStart) {
            ps.sentFlags = { ...ps.sentFlags, firstStart: true };
            msgs.push(createInboxMessage(MSG.prodigalStart(ps.playerName), { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber }));
          }
          if (ps.consecutiveBenched >= 3 && !ps.sentFlags.benchWarn) {
            ps.sentFlags = { ...ps.sentFlags, benchWarn: true };
            msgs.push(createInboxMessage(MSG.prodigalBenched(ps.playerName), { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber }));
          }
          if (scored && !ps.sentFlags.firstGoal) {
            ps.sentFlags = { ...ps.sentFlags, firstGoal: true };
            msgs.push(createInboxMessage(MSG.prodigalGoal(ps.playerName), { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber }));
          }
          if (oppName === ps.formerClub && wasInXI && !ps.sentFlags.formerClubPlayed) {
            ps.sentFlags = { ...ps.sentFlags, formerClubPlayed: true };
            if (playerWon) {
              msgs.push(createInboxMessage(MSG.prodigalFormerWin(ps.playerName, ps.formerClub), { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber }));
            } else {
              msgs.push(createInboxMessage(MSG.prodigalFormerLoss(ps.playerName, ps.formerClub), { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber }));
            }
          }

          if (!ps.wonVsFormer && scored && ps.starts >= 10 && ps.goals >= 3 && !ps.sentFlags.rivalTranscended) {
            const formerInLeague = s.league?.teams?.some(t => !t.isPlayer && t.name === ps.formerClub);
            if (!formerInLeague) {
              ps.wonVsFormer = true;
              ps.sentFlags = { ...ps.sentFlags, rivalTranscended: true };
              msgs.push(createInboxMessage(MSG.prodigalTranscended(ps.playerName, ps.formerClub), { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber }));
            }
          }

          if (ps.starts >= 10 && ps.goals >= 3 && ps.wonVsFormer && !ps.sentFlags.redeemed) {
            ps.sentFlags = { ...ps.sentFlags, redeemed: true };
            ps.phase = "redeemed";
            ps.pendingBoost = true;
            msgs.push(createInboxMessage(MSG.prodigalRedeemed(ps.playerName), { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber }));
            tryUnlockAchievement("prodigal_son");
          }

          if (msgs.length > 0) s.setInboxMessages(prev => [...prev, ...msgs]);
          s.setProdigalSon(ps);
        }
      } catch(err) {
        console.error("Prodigal son tracking error:", err);
      }

      // === Matchday roundup inbox message ===
      try {
        const mwIdx = matchResult._playedMatchweekIndex ?? (s.matchweekIndex - 1);
        const mwResults = s.leagueResults[mwIdx];
        if (mwResults && mwResults.length > 0) {
          const allScorers = mwResults.flatMap(r => (r.goalScorers || []).map(sc => sc.name)).filter(Boolean);
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
              .filter(sc => sc.name)
              .sort((a, b) => a.minute - b.minute)
              .map(sc => {
                const base = `${shortName(sc.name)} ${sc.minute}'`;
                return sc.assister ? `${base} (A: ${shortName(sc.assister)})` : base;
              }).join(", ");
          };
          const league = currentLeague;
          const lines = mwResults.map(r => {
            const hName = league.teams[r.home]?.shortName || league.teams[r.home]?.name || "Home";
            const aName = league.teams[r.away]?.shortName || league.teams[r.away]?.name || "Away";
            const isPlayerMatch = league.teams[r.home]?.isPlayer || league.teams[r.away]?.isPlayer;
            const scorerList = formatScorers(r.goalScorers || []);
            const scoreStr = `${hName} ${r.homeGoals}-${r.awayGoals} ${aName}`;
            return isPlayerMatch ? `⚽ ${scoreStr}${scorerList ? ` (${scorerList})` : ""}` : `${scoreStr}${scorerList ? ` (${scorerList})` : ""}`;
          });
          const sorted = sortStandings(league.table);
          const playerPos = sorted.findIndex(r => league.teams[r.teamIndex]?.isPlayer) + 1;
          const top3 = sorted.slice(0, 3).map((r, i) => {
            const t = league.teams[r.teamIndex];
            return `${i + 1}. ${t?.shortName || t?.name || "?"} ${r.points}pts`;
          }).join(" · ");
          const standingsLine = playerPos <= 3 ? top3 : `${top3} · ... ${playerPos}. ${s.teamName} ${sorted[playerPos-1]?.points || 0}pts`;
          s.setInboxMessages(prev => [...prev, createInboxMessage(
            MSG.matchdayResults(mwIdx, `${lines.join("\n")}\n\n📊 ${standingsLine}`),
            { calendarIndex: s.calendarIndex, seasonNumber: s.seasonNumber },
          )]);
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
        s.setSquad(prev => prev.filter(p => p.id !== tid));
        s.setStartingXI(prev => prev.filter(id => id !== tid));
        s.setBench(prev => prev.filter(id => id !== tid));
        s.setInboxMessages(prev => [...prev, createInboxMessage(
          MSG.testimonialDone(testimonialP.name),
          { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber: s.seasonNumber },
        )]);
        s.setTestimonialPlayer(null);
      }
      setMatchResult(null);
      s.setProcessing(false);
    }
  }, [setMatchResult, setAchievementQueue, tryUnlockAchievement, updateUltimatumProgress, updateMatchLog, pendingLeagueRef, cardedPlayerIdsRef, aiPredictionRef, weekRecoveriesRef, achievableIdsRef]);

  return { processMatchDone };
}
