import { useCallback } from "react";
import { initLeagueRosters, initLeague, initCup, initAILeague, buildSeasonCalendar, advanceCupRound, buildNextCupRound } from "../utils/league.js";
import { simulateMatchweek } from "../utils/match.js";
import { NUM_TIERS } from "../data/leagues.js";
import { getModifier } from "../data/leagueModifiers.js";

export function useDebug({
  squad, setSquad, teamName, leagueRosters, setLeagueRosters, prestigeLevel, setPrestigeLevel,
  startingXI, bench, formation, slotAssignments,
  setLeague, setLeagueTier, setCup, setAllLeagueStates, setSeasonCalendar,
  setCalendarIndex, setCalendarResults, setLeagueResults,
  setMatchPending, setSummerPhase, setSummerData, setMatchResult, setCupMatchResult,
  cupRef, seasonCalendarRef,
}) {

  const onDebugJumpTier = useCallback((tier) => {
    const rosters = leagueRosters || initLeagueRosters();
    if (!leagueRosters) setLeagueRosters(rosters);
    const newLeague = initLeague(squad, teamName, tier, rosters, null, prestigeLevel);
    setLeague(newLeague);
    setLeagueTier(tier);
    const newCup = initCup(teamName, tier, rosters);
    setCup(newCup);
    const nextAILeagues = {};
    for (let t = 1; t <= NUM_TIERS; t++) {
      if (t === tier) continue;
      const ai = initAILeague(t, rosters, null, prestigeLevel);
      if (ai) nextAILeagues[t] = ai;
    }
    setAllLeagueStates(nextAILeagues);
    const cal = buildSeasonCalendar(newLeague.fixtures.length, newCup, !!getModifier(tier).knockoutAtEnd, !!getModifier(tier).miniTournament);
    setSeasonCalendar(cal);
    setCalendarIndex(0);
    // matchweekIndex is derived from calendarIndex — resets automatically
    setCalendarResults({});
    setLeagueResults({});
    setMatchPending(false);
    setSummerPhase(null);
    setSummerData(null);
    setMatchResult(null);
    setCupMatchResult(null);
  }, [squad, teamName, leagueRosters, prestigeLevel]);

  const onDebugWinLeague = useCallback(() => {
    // 1. Simulate all league matchweeks, override player row to 1st
    setLeague(prev => {
      if (!prev) return prev;
      const playerIdx = prev.teams.findIndex(t => t.isPlayer);
      if (playerIdx < 0) return prev;
      const totalFixtures = prev.fixtures?.length || 18;
      const simLeague = { ...prev, table: prev.table.map(r => ({ ...r })) };
      for (let mw = 0; mw < totalFixtures; mw++) {
        simulateMatchweek(simLeague, mw, squad, startingXI, bench, formation, slotAssignments, 0);
      }
      const newTable = simLeague.table.map(row => {
        if (row.teamIndex === playerIdx) {
          return { ...row, played: totalFixtures, won: totalFixtures, drawn: 0, lost: 0, goalsFor: totalFixtures * 3, goalsAgainst: 0, points: totalFixtures * 3 };
        }
        return row;
      });
      return { ...prev, table: newTable };
    });

    // 2. Simulate all remaining cup rounds, player wins every match
    const curCup = cupRef.current;
    if (curCup && !curCup.playerEliminated) {
      let simCup = curCup;
      let safety = 0;
      while (simCup.currentRound < simCup.rounds.length && safety++ < 10) {
        const advanced = advanceCupRound(simCup, squad, startingXI, bench, null);
        if (advanced.pendingPlayerMatch) {
          // Resolve the player's match as a 2-0 win
          const pm = advanced.pendingPlayerMatch;
          const playerIsHome = pm.home?.isPlayer;
          const hg = playerIsHome ? 2 : 0;
          const ag = playerIsHome ? 0 : 2;
          const winner = playerIsHome ? pm.home : pm.away;
          const roundIdx = advanced.currentRound;
          const resolvedRounds = advanced.rounds.map((r, i) =>
            i !== roundIdx ? r : {
              ...r,
              matches: r.matches.map(m =>
                (m.home?.isPlayer || m.away?.isPlayer) && !m.result
                  ? { ...m, result: { homeGoals: hg, awayGoals: ag, winner } }
                  : m
              ),
            }
          );
          simCup = buildNextCupRound({ ...advanced, rounds: resolvedRounds, pendingPlayerMatch: null });
        } else {
          // No player match this round (bye or already resolved) — advanceCupRound handled it
          simCup = advanced;
        }
      }
      setCup(simCup);
    }

    // 3. Advance calendar to end, record all entries as player wins
    const cal = seasonCalendarRef.current;
    if (cal) {
      setCalendarIndex(cal.length);
      const results = {};
      cal.forEach((entry, i) => {
        if (entry.type === "league") {
          results[i] = { playerGoals: 3, oppGoals: 0, won: true, draw: false };
        } else if (entry.type === "cup") {
          results[i] = { playerGoals: 2, oppGoals: 0, won: true, draw: false };
        }
      });
      setCalendarResults(prev => ({ ...prev, ...results }));
    }

    // 4. Advance AI leagues to match
    setAllLeagueStates(prev => {
      if (!prev || Object.keys(prev).length === 0) return prev;
      const next = {};
      for (const [t, aiLeague] of Object.entries(prev)) {
        const copy = { ...aiLeague, table: aiLeague.table.map(r => ({ ...r })) };
        const totalAIFix = copy.fixtures?.length || 18;
        for (let mw = copy.matchweekIndex || 0; mw < totalAIFix; mw++) {
          simulateMatchweek(copy, mw, null, null, null, null, null);
        }
        next[t] = { ...copy, matchweekIndex: totalAIFix };
      }
      return next;
    });
  }, [squad, startingXI, bench, formation, slotAssignments]);

  const onDebugSetSquadOvr = useCallback((targetOvr) => {
    setSquad(prev => prev.map(p => {
      const newAttrs = {};
      for (const key of Object.keys(p.attrs)) newAttrs[key] = targetOvr;
      return { ...p, attrs: newAttrs };
    }));
  }, []);

  const onDebugSetPrestige = useCallback((level) => {
    setPrestigeLevel(level);
  }, []);

  return { onDebugJumpTier, onDebugWinLeague, onDebugSetSquadOvr, onDebugSetPrestige };
}
