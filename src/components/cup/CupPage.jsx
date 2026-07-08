import React, { useState, useMemo } from "react";
import { LEAGUE_DEFS } from "../../data/leagues.js";
import { getPosColor } from "../../utils/calc.js";
import { displayName } from "../../utils/player.js";
import { F, C, FONT } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";
import { getTopScorers, getTopAssisters, getMostYellows, getMostReds, cupKey as makeCupKey, computeTeamOfCup } from "../../utils/competitionStats.js";

export function CupPage({ cup, clubHistory, seasonNumber, leagueRosters, league, allLeagueStates, onPlayerClick, onTeamClick, seasonCupStatsByCup = null, allTimeCupStatsByCup = null, seasonCupStatsAvailable = true }) {
  // Stats tab + selectors operate on the current cup's slot.
  const currentCupKey = cup?.cupName ? makeCupKey(cup.cupName) : null;
  const seasonCupStats = (seasonCupStatsByCup && currentCupKey) ? (seasonCupStatsByCup[currentCupKey] || null) : null;
  const allTimeCupStats = (allTimeCupStatsByCup && currentCupKey) ? (allTimeCupStatsByCup[currentCupKey] || null) : null;
  const [activeTab, setActiveTab] = useState("bracket");
  const mob = useMobile();

  // Build a live name→tier lookup from current leagueRosters so tier chips always reflect current placement
  const liveTierByName = React.useMemo(() => {
    if (!leagueRosters) return {};
    const map = {};
    Object.entries(leagueRosters).forEach(([tier, teams]) => {
      (teams || []).forEach(t => { map[t.name] = parseInt(tier); });
    });
    return map;
  }, [leagueRosters]);

  // Cup match objects are lightweight stubs (name/tier/isPlayer) with no
  // squad — squads live on the live league team objects. Build a name→team
  // lookup across the player's league and every AI tier so Team of the Cup
  // can resolve real rosters without attaching squads to the cup itself
  // (the cup is serialized into saves).
  const teamByName = React.useMemo(() => {
    const map = new Map();
    (league?.teams || []).forEach(t => map.set(t.name, t));
    Object.values(allLeagueStates || {}).forEach(state => {
      (state?.teams || []).forEach(t => map.set(t.name, t));
    });
    return map;
  }, [league, allLeagueStates]);

  const resolvedTier = (team) => (team && liveTierByName[team.name] != null) ? liveTierByName[team.name] : team?.tier;
  const tierColor = (tier) => (LEAGUE_DEFS[tier]?.color) || C.textMuted;
  const tierLabel = (tier) => (LEAGUE_DEFS[tier]?.shortName) || "?";

  // Tournament-level stats (team goals, biggest wins) reconstruct from
  // cup.rounds. Player-level stats (scorers, assisters, cards) come from
  // the canonical seasonCupStats store via shared selectors.
  const cupStats = React.useMemo(() => {
    if (!cup?.rounds) return { teamGoals: {}, totalGoals: 0, totalMatches: 0, biggestWin: null, highestScoring: null, topScoringTeams: [] };
    const teamGoals = {};
    let totalGoals = 0, totalMatches = 0;
    let biggestWin = null;
    let highestScoring = null;

    cup.rounds.forEach((round) => {
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

    return { teamGoals, totalGoals, totalMatches, biggestWin, highestScoring, topScoringTeams };
  }, [cup]);

  // Player rows from canonical seasonCupStats. Same shape the LeaguePage uses.
  const playerTopScorers = React.useMemo(
    () => getTopScorers(seasonCupStats, 10).map(p => ({
      name: p.name, teamName: p.teamName || "?", goals: p.goals, playerId: p.playerId,
    })),
    [seasonCupStats]
  );
  const playerTopAssists = React.useMemo(
    () => getTopAssisters(seasonCupStats, 10).map(p => ({
      name: p.name, teamName: p.teamName || "?", assists: p.assists, playerId: p.playerId,
    })),
    [seasonCupStats]
  );
  const playerTopYellows = React.useMemo(
    () => getMostYellows(seasonCupStats, 10).map(p => ({
      name: p.name, teamName: p.teamName || "?", yellows: p.yellows, playerId: p.playerId,
    })),
    [seasonCupStats]
  );
  const playerTopReds = React.useMemo(
    () => getMostReds(seasonCupStats, 10).map(p => ({
      name: p.name, teamName: p.teamName || "?", reds: p.reds, playerId: p.playerId,
    })),
    [seasonCupStats]
  );

  // All-time cup leaders for this cup, merged with the in-progress season
  // so a current-season scorer can already appear in the all-time list.
  const allTimeMerged = React.useMemo(() => {
    const merged = {};
    const acc = (entry) => {
      const k = entry.key;
      if (!merged[k]) merged[k] = { ...entry, goals: 0, assists: 0, yellows: 0, reds: 0 };
      merged[k].goals += entry.goals || 0;
      merged[k].assists += entry.assists || 0;
      merged[k].yellows += entry.yellows || 0;
      merged[k].reds += entry.reds || 0;
      if (entry.name) merged[k].name = entry.name;
      if (entry.teamName) merged[k].teamName = entry.teamName;
    };
    Object.values(allTimeCupStats?.players || {}).forEach(acc);
    Object.values(seasonCupStats?.players || {}).forEach(acc);
    return { players: merged, processedMatches: {} };
  }, [allTimeCupStats, seasonCupStats]);
  const allTimeTopScorers = React.useMemo(
    () => getTopScorers(allTimeMerged, 10).map(p => ({ name: p.name, teamName: p.teamName || "?", goals: p.goals })),
    [allTimeMerged]
  );
  const allTimeTopAssists = React.useMemo(
    () => getTopAssisters(allTimeMerged, 10).map(p => ({ name: p.name, teamName: p.teamName || "?", assists: p.assists })),
    [allTimeMerged]
  );
  const allTimeTopYellows = React.useMemo(
    () => getMostYellows(allTimeMerged, 10).map(p => ({ name: p.name, teamName: p.teamName || "?", yellows: p.yellows })),
    [allTimeMerged]
  );
  const allTimeTopReds = React.useMemo(
    () => getMostReds(allTimeMerged, 10).map(p => ({ name: p.name, teamName: p.teamName || "?", reds: p.reds })),
    [allTimeMerged]
  );

  // Team of the Cup — best XI based on cup performance (goals + wins + round reached)
  const teamOfCup = React.useMemo(() => computeTeamOfCup({ cup, teamByName }), [cup, teamByName]);

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

            {/* Player-level cup stats — canonical seasonCupStats */}
            {!seasonCupStatsAvailable ? (
              <div style={{ marginTop: 24, textAlign: "center" }}>
                <div style={{ fontSize: F.sm, color: C.textDim, lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>
                  Player-level cup stats are unavailable for this season. This save was loaded from an older version that didn't track cup events. Full cup stats will resume next season.
                </div>
              </div>
            ) : (
              <>
                {(() => {
                  // Single ranked-list renderer used by current-season and
                  // all-time blocks below. Right-aligned value column for
                  // numeric stability; matches the LeaguePage scale.
                  const renderPlayerList = (title, icon, list, valueField, valueColor) => list.length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontSize: mob ? F.sm : F.md, color: C.gold, marginBottom: 10, letterSpacing: 1 }}>{icon} {title}</div>
                      {list.map((s, i) => (
                        <div key={`${s.name}|${s.teamName}|${i}`} style={{
                          display: "grid", gridTemplateColumns: mob ? "30px 1fr 1fr 50px" : "35px 1fr 1fr 60px",
                          padding: "10px 12px", fontSize: F.xs, gap: 4,
                          borderBottom: `1px solid ${C.bgCard}`,
                          background: i === 0 ? "rgba(250,204,21,0.06)" : "transparent",
                          alignItems: "center",
                        }}>
                          <span style={{ color: i === 0 ? C.gold : i < 3 ? C.textMuted : C.slate, fontWeight: i < 3 ? "bold" : "normal" }}>{i + 1}</span>
                          <span onClick={() => onPlayerClick?.(s.name, s.teamName)} style={{ color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: "#e2e8f044", textUnderlineOffset: 3 }}>{displayName(s.name, mob)}</span>
                          <span onClick={() => onTeamClick?.(s.teamName)} style={{ color: C.textDim, fontSize: mob ? F.micro : F.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: "#64748b44", textUnderlineOffset: 3 }}>{s.teamName}</span>
                          <span style={{ textAlign: "right", color: valueColor, fontWeight: "bold", fontSize: mob ? F.sm : F.md }}>{s[valueField]}</span>
                        </div>
                      ))}
                    </div>
                  );
                  const hasAnyAllTime = allTimeTopScorers.length > 0 || allTimeTopAssists.length > 0
                    || allTimeTopYellows.length > 0 || allTimeTopReds.length > 0;
                  return (
                    <>
                      {renderPlayerList("TOP SCORERS", "⚽", playerTopScorers, "goals", C.green)}
                      {renderPlayerList("TOP ASSISTS", "🎯", playerTopAssists, "assists", "#38bdf8")}
                      {renderPlayerList("MOST YELLOW CARDS", "🟨", playerTopYellows, "yellows", C.amber)}
                      {renderPlayerList("MOST RED CARDS", "🟥", playerTopReds, "reds", C.red)}
                      {hasAnyAllTime && (
                        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.bgInput}` }}>
                          {/* Parent label for the all-time block. CupPage
                              shows current and all-time in the same tab, so
                              we need a signpost — sized like a section
                              parent, not a peer of the rows below. */}
                          <div style={{ fontSize: mob ? F.md : F.lg, color: C.gold, marginBottom: 18, letterSpacing: 2 }}>
                            🏛️ ALL-TIME RECORDS
                          </div>
                          {renderPlayerList("TOP SCORERS", "⚽", allTimeTopScorers, "goals", C.green)}
                          {renderPlayerList("TOP ASSISTS", "🎯", allTimeTopAssists, "assists", "#38bdf8")}
                          {renderPlayerList("MOST YELLOW CARDS", "🟨", allTimeTopYellows, "yellows", C.amber)}
                          {renderPlayerList("MOST RED CARDS", "🟥", allTimeTopReds, "reds", C.red)}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
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
                        {displayName(p.name, mob)}
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
                {!cup?.winner ? "Cup matches still in progress" : "Team of the Cup unavailable for this save"}
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

