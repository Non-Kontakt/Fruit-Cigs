import React, { useState, useMemo } from "react";
import { POSITION_TYPES } from "../../data/positions.js";
import { LEAGUE_DEFS } from "../../data/leagues.js";
import { getPosColor } from "../../utils/calc.js";
import { F, C, FONT } from "../../data/tokens";

export function CupPage({ cup, clubHistory, seasonNumber, leagueRosters, onPlayerClick, onTeamClick }) {
  const [activeTab, setActiveTab] = useState("bracket");
  const mob = window.innerWidth <= 768;

  // Build a live name→tier lookup from current leagueRosters so tier chips always reflect current placement
  const liveTierByName = React.useMemo(() => {
    if (!leagueRosters) return {};
    const map = {};
    Object.entries(leagueRosters).forEach(([tier, teams]) => {
      (teams || []).forEach(t => { map[t.name] = parseInt(tier); });
    });
    return map;
  }, [leagueRosters]);

  const resolvedTier = (team) => (team && liveTierByName[team.name] != null) ? liveTierByName[team.name] : team?.tier;
  const tierColor = (tier) => (LEAGUE_DEFS[tier]?.color) || C.textMuted;
  const tierLabel = (tier) => (LEAGUE_DEFS[tier]?.shortName) || "?";

  // Compute tournament stats from cup rounds
  const cupStats = React.useMemo(() => {
    if (!cup?.rounds) return { teamGoals: {}, totalGoals: 0, totalMatches: 0, biggestWin: null, highestScoring: null, topScorers: [], topAssists: [] };
    const teamGoals = {}; // teamName → { scored, conceded, wins, played }
    const playerScorers = {}; // "playerName|teamName" → goals
    const playerAssisters = {}; // "playerName|teamName" → assists
    let totalGoals = 0, totalMatches = 0;
    let biggestWin = null; // { winner, loser, score, round }
    let highestScoring = null; // { home, away, total, score, round }

    cup.rounds.forEach((round, rIdx) => {
      (round.matches || []).forEach(match => {
        if (!match.result || match.result.bye) return;
        const hg = match.result.homeGoals;
        const ag = match.result.awayGoals;
        const hName = match.home?.name || "?";
        const aName = match.away?.name || "?";
        totalGoals += hg + ag;
        totalMatches++;

        if (!teamGoals[hName]) teamGoals[hName] = { scored: 0, conceded: 0, wins: 0, played: 0, isPlayer: match.home?.isPlayer, tier: match.home?.tier };
        if (!teamGoals[aName]) teamGoals[aName] = { scored: 0, conceded: 0, wins: 0, played: 0, isPlayer: match.away?.isPlayer, tier: match.away?.tier };
        teamGoals[hName].scored += hg;
        teamGoals[hName].conceded += ag;
        teamGoals[hName].played++;
        teamGoals[aName].scored += ag;
        teamGoals[aName].conceded += hg;
        teamGoals[aName].played++;

        const winner = match.result.winner;
        if (winner) {
          const wName = winner.name || "?";
          if (teamGoals[wName]) teamGoals[wName].wins++;
        }

        // Individual scorer/assister tracking (only for matches that have goalScorers data)
        (match.result.goalScorers || []).forEach(g => {
          const teamName = g.side === "home" ? hName : aName;
          const sKey = `${g.name}|${teamName}`;
          playerScorers[sKey] = (playerScorers[sKey] || 0) + 1;
          if (g.assister) {
            const aKey = `${g.assister}|${teamName}`;
            playerAssisters[aKey] = (playerAssisters[aKey] || 0) + 1;
          }
        });

        const margin = Math.abs(hg - ag);
        if (!biggestWin || margin > biggestWin.margin) {
          const wName = hg > ag ? hName : aName;
          const lName = hg > ag ? aName : hName;
          biggestWin = { winner: wName, loser: lName, score: `${Math.max(hg, ag)}-${Math.min(hg, ag)}`, margin, round: round.name };
        }
        const total = hg + ag;
        if (!highestScoring || total > highestScoring.total) {
          highestScoring = { home: hName, away: aName, total, score: `${hg}-${ag}`, round: round.name };
        }
      });
    });

    const topScoringTeams = Object.entries(teamGoals)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.scored - a.scored)
      .slice(0, 10);

    const topScorers = Object.entries(playerScorers)
      .map(([key, goals]) => { const [name, teamName] = key.split("|"); return { name, teamName, goals }; })
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10);

    const topAssists = Object.entries(playerAssisters)
      .map(([key, assists]) => { const [name, teamName] = key.split("|"); return { name, teamName, assists }; })
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 10);

    return { teamGoals, totalGoals, totalMatches, biggestWin, highestScoring, topScoringTeams, topScorers, topAssists };
  }, [cup]);

  // Team of the Cup — best XI based on cup performance (goals + wins + round reached)
  const teamOfCup = React.useMemo(() => {
    if (!cup?.rounds) return [];
    // Build pool of players from all teams that played
    const candidates = [];
    const teamRoundReached = {}; // teamName → furthest round index

    cup.rounds.forEach((round, rIdx) => {
      (round.matches || []).forEach(match => {
        if (!match.result || match.result.bye) return;
        [match.home, match.away].forEach(team => {
          if (!team?.squad) return;
          const tName = team.name;
          if (!teamRoundReached[tName] || rIdx > teamRoundReached[tName]) {
            teamRoundReached[tName] = rIdx;
          }
        });
      });
    });

    // For each team, score their starters based on: round reached, team goals, and whether they won
    Object.entries(teamRoundReached).forEach(([tName, maxRound]) => {
      // Find the team object from any round they appeared in
      let teamObj = null;
      for (const round of cup.rounds) {
        for (const match of (round.matches || [])) {
          if (match.home?.name === tName) { teamObj = match.home; break; }
          if (match.away?.name === tName) { teamObj = match.away; break; }
        }
        if (teamObj) break;
      }
      if (!teamObj?.squad) return;

      const stats = cupStats.teamGoals[tName] || { scored: 0, wins: 0, played: 0 };
      const roundBonus = (maxRound + 1) * 3; // further you go, bigger boost
      const isWinner = cup.winner?.name === tName;

      teamObj.squad.filter(p => !p.isBench).forEach(p => {
        const posType = POSITION_TYPES[p.position] || "MID";
        // Score: round progression + team goals weighted by position + winner bonus
        const goalWeight = posType === "FWD" ? 2 : posType === "MID" ? 1.5 : 0.5;
        const score = roundBonus + stats.scored * goalWeight + stats.wins * 2 + (isWinner ? 10 : 0);
        candidates.push({
          name: p.name, position: p.position, teamName: tName,
          isPlayerTeam: teamObj.isPlayer, score,
          roundReached: cup.rounds[maxRound]?.name || "?",
        });
      });
    });

    // Pick best per position in 4-3-3
    const totcPositions = ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "AM", "LW", "RW", "ST"];
    const used = new Set();
    const xi = [];
    for (const pos of totcPositions) {
      const eligible = candidates
        .filter(c => c.position === pos && !used.has(`${c.name}|${c.teamName}`))
        .sort((a, b) => b.score - a.score);
      if (eligible.length > 0) {
        const pick = eligible[0];
        used.add(`${pick.name}|${pick.teamName}`);
        xi.push(pick);
      }
    }
    return xi;
  }, [cup, cupStats]);

  const cupHistory = (clubHistory?.cupHistory || []);

  const tabStyle = (tab) => ({
    padding: mob ? "10px 13px" : "10px 18px",
    fontSize: mob ? F.xs : F.sm,
    cursor: "pointer",
    fontFamily: FONT,
    background: activeTab === tab ? "rgba(250,204,21,0.1)" : "transparent",
    border: activeTab === tab ? `1px solid ${C.gold}` : `1px solid ${C.bgInput}`,
    color: activeTab === tab ? C.gold : C.textDim,
    borderRadius: 20,
    flex: mob ? "1 1 auto" : undefined,
    textAlign: "center",
  });

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: mob ? F.xl : F.h2, color: cup?.cupColor || C.gold, letterSpacing: 2 }}>
          {cup?.cupIcon || "🏆"} {cup?.cupName || "CUP"}
        </div>
        <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate, marginTop: 5 }}>
          Season {seasonNumber || 1}
          {cup?.winner && <span style={{ color: C.green, marginLeft: 8 }}>Winner: {cup.winner.name} {cup.winner.isPlayer ? "🎉" : ""}</span>}
          {cup?.playerEliminated && !cup?.winner && <span style={{ color: C.red, marginLeft: 8 }}>Eliminated</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setActiveTab("bracket")} style={tabStyle("bracket")}>📐 BRACKET</button>
        <button onClick={() => setActiveTab("stats")} style={tabStyle("stats")}>📊 STATS</button>
        <button onClick={() => setActiveTab("totc")} style={tabStyle("totc")}>🌟 TOTC</button>
        <button onClick={() => setActiveTab("history")} style={tabStyle("history")}>📜 HISTORY</button>
      </div>

      {/* Tab content */}
      <div style={{ background: C.bg, border: `1px solid ${C.bgCard}` }}>

        {/* ===== BRACKET TAB ===== */}
        {activeTab === "bracket" && (
          <div style={{ padding: mob ? "16px 10px" : "20px" }}>
            {cup ? (
              <>
                {cup.rounds.map((round, rIdx) => {
                  if (round.matches.length === 0 && rIdx > cup.currentRound) return null;
                  const isCurrent = rIdx === cup.currentRound;
                  const isFuture = rIdx > cup.currentRound;

                  return (
                    <div key={rIdx} style={{ marginBottom: 20 }}>
                      <div style={{
                        fontSize: F.md, letterSpacing: 1, marginBottom: 8,
                        color: isCurrent ? C.gold : isFuture ? C.bgInput : C.textDim,
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span>{round.name}</span>
                        {isCurrent && !cup.winner && <span style={{ fontSize: F.xs, color: C.green }}>● CURRENT</span>}
                        <span style={{ fontSize: F.micro, color: C.bgInput }}>MW {round.matchweek + 1}</span>
                      </div>

                      {round.matches.length === 0 && isFuture ? (
                        <div style={{ fontSize: F.xs, color: C.bgCard, padding: "10px 0" }}>Draw pending...</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          {round.matches.filter(m => !m.result?.bye).map((match, mIdx) => {
                            const hasResult = !!match.result;
                            const isPlayerMatch = match.home?.isPlayer || match.away?.isPlayer;
                            const isPending = isCurrent && !hasResult && isPlayerMatch;
                            const playerMatchPending = isCurrent && round.matches.some(m => !m.result?.bye && !m.result && (m.home?.isPlayer || m.away?.isPlayer));
                            const showResult = hasResult && (!playerMatchPending || isPlayerMatch);

                            const tierChip = (team) => {
                              if (!team) return null;
                              const t = resolvedTier(team);
                              if (!t) return null;
                              return <span style={{
                                background: tierColor(t), color: C.bg,
                                padding: mob ? "2px 5px" : "3px 8px", fontSize: mob ? F.xs : F.sm, fontWeight: "bold",
                                fontFamily: FONT, lineHeight: 1, flexShrink: 0,
                              }}>{tierLabel(t)}</span>;
                            };

                            return (
                              <div key={mIdx} style={{
                                display: "grid", gridTemplateColumns: mob ? "1fr 70px 1fr" : "1fr 90px 1fr",
                                alignItems: "center", gap: mob ? 3 : 4,
                                padding: mob ? "8px 8px" : "10px 13px",
                                background: isPlayerMatch ? "rgba(74,222,128,0.05)" : "transparent",
                                borderBottom: `1px solid ${C.bgCard}`,
                                borderLeft: isPlayerMatch ? `3px solid ${C.green}` : isPending ? `3px solid ${C.gold}` : "3px solid transparent",
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: mob ? 4 : 6, justifyContent: "flex-end", minWidth: 0, overflow: "hidden" }}>
                                  <span onClick={() => match.home?.name && onTeamClick?.(match.home.name)} style={{ fontSize: mob ? F.xs : F.sm, color: match.home?.isPlayer ? C.green : C.text, textAlign: "right", cursor: match.home?.name ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                                    {match.home?.name || "TBD"}
                                  </span>
                                  {tierChip(match.home)}
                                </div>

                                <div style={{ textAlign: "center", fontSize: mob ? F.sm : F.md, whiteSpace: "nowrap" }}>
                                  {showResult ? (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                      <span>
                                        <span style={{ color: match.result.homeGoals > match.result.awayGoals || (match.result.penalties && match.result.penalties.homeScore > match.result.penalties.awayScore) ? C.text : C.slate }}>{match.result.homeGoals}</span>
                                        <span style={{ color: C.bgInput }}> - </span>
                                        <span style={{ color: match.result.awayGoals > match.result.homeGoals || (match.result.penalties && match.result.penalties.awayScore > match.result.penalties.homeScore) ? C.text : C.slate }}>{match.result.awayGoals}</span>
                                      </span>
                                      {match.result.penalties && (
                                        <span style={{ fontSize: F.micro, color: C.gold, marginTop: 2 }}>
                                          {match.result.penalties.homeScore}-{match.result.penalties.awayScore} pens
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: C.slate, fontSize: F.sm }}>vs</span>
                                  )}
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: mob ? 4 : 6, minWidth: 0, overflow: "hidden" }}>
                                  {tierChip(match.away)}
                                  <span onClick={() => match.away?.name && onTeamClick?.(match.away.name)} style={{ fontSize: mob ? F.xs : F.sm, color: match.away?.isPlayer ? C.green : C.text, cursor: match.away?.name ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                                    {match.away?.name || "TBD"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Seeded teams info */}
                {cup.currentRound === 0 && cup.seededTeams && cup.seededTeams.length > 0 && (
                  <div style={{ marginTop: 12, padding: "13px 16px", background: "rgba(250,204,21,0.05)", border: `1px solid ${C.gold}22` }}>
                    <div style={{ fontSize: F.xs, color: C.gold, marginBottom: 6 }}>Seeded teams (receive a bye in Round of 32):</div>
                    <div style={{ fontSize: F.xs, color: C.textMuted, lineHeight: 2 }}>
                      {cup.seededTeams.map(t => t.name).join("  ·  ")}
                    </div>
                  </div>
                )}

                {/* Pending match reminder */}
                {cup.pendingPlayerMatch && !cup.pendingPlayerMatch.result && (
                  <div style={{ textAlign: "center", marginTop: 24, marginBottom: 24 }}>
                    <div style={{ fontSize: F.sm, color: C.textMuted, marginBottom: 12 }}>
                      Your {cup.rounds[cup.currentRound]?.name} match is coming up — play it from the squad screen
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 24, fontSize: F.sm, color: C.bgInput }}>
                Cup not yet started
              </div>
            )}
          </div>
        )}

        {/* ===== STATS TAB ===== */}
        {activeTab === "stats" && (
          <div style={{ padding: mob ? "16px 10px" : "20px" }}>
            {/* Tournament overview */}
            <div style={{ fontSize: mob ? F.sm : F.md, color: C.gold, marginBottom: 12, letterSpacing: 1 }}>📊 TOURNAMENT OVERVIEW</div>
            <div style={{
              display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr",
              gap: 8, marginBottom: 24,
            }}>
              {[
                { label: "Matches", value: cupStats.totalMatches, color: C.text },
                { label: "Goals", value: cupStats.totalGoals, color: C.green },
                { label: "Avg/Game", value: cupStats.totalMatches > 0 ? (cupStats.totalGoals / cupStats.totalMatches).toFixed(1) : "—", color: C.blue },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: mob ? "13px 10px" : "16px",
                  background: "rgba(30,41,59,0.3)", border: `1px solid ${C.bgCard}`,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: mob ? F.xl : F.h3, color: s.color, fontWeight: "bold" }}>{s.value}</div>
                  <div style={{ fontSize: F.micro, color: C.slate, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Notable results */}
            {(cupStats.biggestWin || cupStats.highestScoring) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: mob ? F.xs : F.sm, color: C.textMuted, marginBottom: 10 }}>NOTABLE RESULTS</div>
                {cupStats.biggestWin && cupStats.biggestWin.margin > 0 && (
                  <div style={{ padding: "10px 13px", borderBottom: `1px solid ${C.bgCard}`, fontSize: mob ? F.xs : F.sm, color: C.textDim }}>
                    <span style={{ color: C.gold }}>Biggest win:</span> <span onClick={() => onTeamClick?.(cupStats.biggestWin.winner)} style={{ cursor: "pointer" }}>{cupStats.biggestWin.winner}</span> {cupStats.biggestWin.score} <span onClick={() => onTeamClick?.(cupStats.biggestWin.loser)} style={{ cursor: "pointer" }}>{cupStats.biggestWin.loser}</span>
                    <span style={{ color: C.bgInput, marginLeft: 6, fontSize: F.micro }}>({cupStats.biggestWin.round})</span>
                  </div>
                )}
                {cupStats.highestScoring && cupStats.highestScoring.total > 2 && (
                  <div style={{ padding: "10px 13px", borderBottom: `1px solid ${C.bgCard}`, fontSize: mob ? F.xs : F.sm, color: C.textDim }}>
                    <span style={{ color: C.gold }}>Most goals:</span> <span onClick={() => onTeamClick?.(cupStats.highestScoring.home)} style={{ cursor: "pointer" }}>{cupStats.highestScoring.home}</span> {cupStats.highestScoring.score} <span onClick={() => onTeamClick?.(cupStats.highestScoring.away)} style={{ cursor: "pointer" }}>{cupStats.highestScoring.away}</span>
                    <span style={{ color: C.bgInput, marginLeft: 6, fontSize: F.micro }}>({cupStats.highestScoring.round})</span>
                  </div>
                )}
              </div>
            )}

            {/* Top scoring teams */}
            <div style={{ fontSize: mob ? F.sm : F.md, color: C.gold, marginBottom: 12, letterSpacing: 1 }}>⚽ TOP SCORING TEAMS</div>
            {cupStats.topScoringTeams.length > 0 ? (
              <div>
                <div style={{
                  display: "grid", gridTemplateColumns: mob ? "26px 1fr 38px 38px 38px" : "30px 1fr 44px 44px 44px",
                  padding: "10px", fontSize: mob ? F.micro : F.xs, color: C.slate,
                  borderBottom: `1px solid ${C.bgInput}`, gap: 4,
                }}>
                  <span>#</span><span>TEAM</span>
                  <span style={{ textAlign: "center" }}>P</span>
                  <span style={{ textAlign: "center" }}>GF</span>
                  <span style={{ textAlign: "center" }}>GA</span>
                </div>
                {cupStats.topScoringTeams.map((t, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: mob ? "26px 1fr 38px 38px 38px" : "30px 1fr 44px 44px 44px",
                    padding: "10px", fontSize: F.xs, gap: 4,
                    borderBottom: `1px solid ${C.bgCard}`,
                    background: t.isPlayer ? "rgba(74,222,128,0.04)" : i === 0 ? "rgba(250,204,21,0.04)" : "transparent",
                    alignItems: "center",
                  }}>
                    <span style={{ color: i === 0 ? C.gold : C.slate }}>{i + 1}</span>
                    <span onClick={() => onTeamClick?.(t.name)} style={{ color: t.isPlayer ? C.green : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                      {t.name}
                    </span>
                    <span style={{ textAlign: "center", color: C.textMuted }}>{t.played}</span>
                    <span style={{ textAlign: "center", color: C.green, fontWeight: "bold" }}>{t.scored}</span>
                    <span style={{ textAlign: "center", color: C.textDim }}>{t.conceded}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 16, fontSize: F.sm, color: C.bgInput }}>No matches played yet</div>
            )}

            {/* Individual Top Scorers */}
            {cupStats.topScorers.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: mob ? F.sm : F.md, color: C.gold, marginBottom: 12, letterSpacing: 1 }}>🥇 TOP SCORERS</div>
                {cupStats.topScorers.map((s, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: mob ? "26px 1fr 1fr 38px" : "30px 1fr 1fr 44px",
                    padding: "10px", fontSize: F.xs, gap: 4,
                    borderBottom: `1px solid ${C.bgCard}`,
                    background: i === 0 ? "rgba(250,204,21,0.06)" : "transparent",
                    alignItems: "center",
                  }}>
                    <span style={{ color: i === 0 ? C.gold : C.slate }}>{i + 1}</span>
                    <span onClick={() => onPlayerClick?.(s.name, s.teamName)} style={{ color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: "#e2e8f044", textUnderlineOffset: 3 }}>{s.name}</span>
                    <span onClick={() => onTeamClick?.(s.teamName)} style={{ color: C.textDim, fontSize: mob ? F.micro : F.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>{s.teamName}</span>
                    <span style={{ textAlign: "center", color: C.green, fontWeight: "bold", fontSize: F.md }}>{s.goals}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Individual Top Assists */}
            {cupStats.topAssists.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: mob ? F.sm : F.md, color: C.gold, marginBottom: 12, letterSpacing: 1 }}>🎯 TOP ASSISTS</div>
                {cupStats.topAssists.map((s, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: mob ? "26px 1fr 1fr 38px" : "30px 1fr 1fr 44px",
                    padding: "10px", fontSize: F.xs, gap: 4,
                    borderBottom: `1px solid ${C.bgCard}`,
                    background: i === 0 ? "rgba(250,204,21,0.06)" : "transparent",
                    alignItems: "center",
                  }}>
                    <span style={{ color: i === 0 ? C.gold : C.slate }}>{i + 1}</span>
                    <span onClick={() => onPlayerClick?.(s.name, s.teamName)} style={{ color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: "#e2e8f044", textUnderlineOffset: 3 }}>{s.name}</span>
                    <span onClick={() => onTeamClick?.(s.teamName)} style={{ color: C.textDim, fontSize: mob ? F.micro : F.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>{s.teamName}</span>
                    <span style={{ textAlign: "center", color: "#38bdf8", fontWeight: "bold", fontSize: F.md }}>{s.assists}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== TEAM OF THE CUP TAB ===== */}
        {activeTab === "totc" && (
          <div style={{ padding: mob ? "16px 10px" : "20px" }}>
            <div style={{ fontSize: mob ? F.sm : F.md, color: C.gold, marginBottom: 4, letterSpacing: 1 }}>🌟 TEAM OF THE CUP</div>
            <div style={{ fontSize: mob ? F.micro : F.xs, color: C.slate, marginBottom: 16 }}>Best XI based on team progression & cup performance</div>
            {teamOfCup.length > 0 ? (
              <div>
                {teamOfCup.map((p, i) => (
                  <div key={i} style={{
                    display: "grid",
                    gridTemplateColumns: mob ? "48px 1fr 78px" : "50px 1fr 182px 104px",
                    padding: "13px 10px", fontSize: mob ? F.xs : F.sm, gap: mob ? 4 : 8,
                    borderBottom: `1px solid ${C.bgCard}`,
                    background: p.isPlayerTeam ? "rgba(74,222,128,0.06)" : "transparent",
                    alignItems: "center",
                  }}>
                    <span style={{
                      background: getPosColor(p.position), color: C.bg,
                      padding: "3px 8px", fontSize: F.sm, fontWeight: "bold",
                      fontFamily: FONT, textAlign: "center",
                    }}>{p.position}</span>
                    <div style={{ overflow: "hidden" }}>
                      <div onClick={() => onPlayerClick?.(p.name, p.teamName)} style={{ color: p.isPlayerTeam ? C.green : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                        {p.name}
                      </div>
                      {mob && (
                        <div onClick={() => onTeamClick?.(p.teamName)} style={{ fontSize: F.micro, color: C.slate, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                          {p.teamName}
                        </div>
                      )}
                    </div>
                    {!mob && (
                      <span onClick={() => onTeamClick?.(p.teamName)} style={{ color: C.textDim, fontSize: F.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                        {p.teamName}
                      </span>
                    )}
                    <span style={{ fontSize: mob ? F.micro : F.xs, color: C.textMuted, textAlign: mob ? "right" : "left" }}>
                      {p.roundReached}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 24, fontSize: F.sm, color: C.bgInput }}>
                Cup matches still in progress
              </div>
            )}
          </div>
        )}

        {/* ===== HISTORY TAB ===== */}
        {activeTab === "history" && (
          <div style={{ padding: mob ? "16px 10px" : "20px" }}>
            <div style={{ fontSize: mob ? F.sm : F.md, color: C.gold, marginBottom: 16, letterSpacing: 1 }}>📜 CUP ROLL OF HONOUR</div>
            {cupHistory.length > 0 ? (
              <div>
                {/* Header */}
                <div style={{
                  display: "grid", gridTemplateColumns: mob ? "44px 1fr 1fr" : "64px 1fr 1fr 1fr",
                  padding: "10px", fontSize: mob ? F.micro : F.xs, color: C.slate,
                  borderBottom: `1px solid ${C.bgInput}`, gap: 4,
                }}>
                  <span>SZN</span><span>🏆 WINNER</span><span>🥈 RUNNER-UP</span>
                  {!mob && <span>YOUR RESULT</span>}
                </div>
                {[...cupHistory].reverse().map((entry, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: mob ? "44px 1fr 1fr" : "64px 1fr 1fr 1fr",
                    padding: mob ? "13px 10px" : "10px", fontSize: mob ? F.xs : F.sm, gap: 4,
                    borderBottom: `1px solid ${C.bgCard}`,
                    background: entry.winnerIsPlayer ? "rgba(74,222,128,0.06)" : "transparent",
                    alignItems: "center",
                  }}>
                    <span style={{ color: C.textDim }}>S{entry.season}</span>
                    <span onClick={() => onTeamClick?.(entry.winner)} style={{
                      color: entry.winnerIsPlayer ? C.green : C.text,
                      fontWeight: "bold",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}>
                      {entry.winnerIsPlayer ? "🏆 " : ""}{entry.winner}
                    </span>
                    <span onClick={() => onTeamClick?.(entry.runnerUp)} style={{
                      color: entry.runnerUpIsPlayer ? C.green : C.textMuted,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}>
                      {entry.runnerUp}
                    </span>
                    {!mob && (
                      <span style={{
                        fontSize: F.xs,
                        color: entry.playerResult?.includes("Winner") ? C.green
                          : entry.playerResult?.includes("Final") ? C.gold
                          : C.slate,
                      }}>
                        {entry.playerResult}
                      </span>
                    )}
                  </div>
                ))}
                {mob && (
                  <div style={{ fontSize: F.micro, color: C.bgInput, marginTop: 8, textAlign: "center" }}>
                    Rotate device for full details
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 24, color: C.bgInput }}>
                <div style={{ fontSize: mob ? F.md : F.xl, marginBottom: 8 }}>🏆</div>
                <div style={{ fontSize: F.sm }}>No cup history yet</div>
                <div style={{ fontSize: F.xs, color: C.bgCard, marginTop: 8 }}>Cup results will be recorded at the end of each season</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

