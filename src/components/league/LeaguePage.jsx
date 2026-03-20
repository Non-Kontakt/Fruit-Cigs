import React, { useState, useMemo } from "react";
import { POSITION_TYPES } from "../../data/positions.js";
import { ACHIEVEMENTS } from "../../data/achievements.js";
import { LEAGUE_DEFS, NUM_TIERS, TEAM_TRAITS } from "../../data/leagues.js";
import { getModifier } from "../../data/leagueModifiers.js";
import { getPosColor } from "../../utils/calc.js";
import { AITeamPanel } from "./AITeamPanel.jsx";
import { F, C, FONT } from "../../data/tokens";

export function LeaguePage({ league, leagueResults, matchweekIndex, teamName, playerSeasonStats, playerRatingTracker, squad, startingXI, bench, seasonNumber, clubHistory, allTimeLeagueStats, allLeagueStates, leagueTier: leagueTierProp, onPlayerClick, onTeamClick, clubRelationships, transferFocus, onSetFocus, onRemoveFocus, onReplaceFocus, dynastyCupBracket, miniTournamentBracket, ovrCap = 20 }) {
  const [activeTab, setActiveTab] = useState("leagues");
  const [selectedMD, setSelectedMD] = useState(Math.max(0, matchweekIndex - 1));
  const [viewTeamData, setViewTeamData] = useState(null); // { team, tableRow, seasonGoals, seasonAssists }
  const [selectedSimTier, setSelectedSimTier] = useState(null);
  const mob = window.innerWidth <= 768;

  const sorted = [...league.table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
  const tier = league.tier || leagueTier || NUM_TIERS;
  const canPromote = tier > 1;
  const canRelegate = tier < NUM_TIERS;
  const tableCols = mob ? "35px 1fr 45px 51px 59px" : "40px 1fr 47px 47px 47px 47px 59px 59px 59px";

  // Which tiers the player has ever reached (determines which leagues are unlocked to view)
  const highestTierReached = [tier, leagueTierProp, ...(clubHistory?.seasonArchive || []).map(s => s.tier || NUM_TIERS)]
    .filter(t2 => t2 != null).reduce((min, t2) => Math.min(min, t2), NUM_TIERS);
  // Tiers 5–11 always visible; tiers 1–4 unlock once the player has reached them
  const visibleTiers = Array.from({ length: NUM_TIERS }, (_, i) => i + 1).filter(t2 => t2 >= 5 || t2 >= highestTierReached).reverse();

  // Aggregate league-wide stats from stored results
  const leagueStats = React.useMemo(() => {
    const scorers = {}; // "PlayerName|teamIdx" → goals
    const assisters = {}; // "PlayerName|teamIdx" → assists
    const cards = {};   // "PlayerName|teamIdx" → cards
    Object.values(leagueResults || {}).forEach(mwResults => {
      (mwResults || []).forEach(match => {
        (match.goalScorers || []).forEach(g => {
          const teamIdx = g.side === "home" ? match.home : match.away;
          // Skip player's team (index 0) — use playerSeasonStats for them instead
          if (teamIdx === 0) return;
          const key = `${g.name}|${teamIdx}`;
          scorers[key] = (scorers[key] || 0) + 1;
          if (g.assister) {
            const aKey = `${g.assister}|${teamIdx}`;
            assisters[aKey] = (assisters[aKey] || 0) + 1;
          }
        });
        (match.cardRecipients || []).forEach(c => {
          if (c.teamIdx === 0) return;
          const key = `${c.name}|${c.teamIdx}`;
          cards[key] = (cards[key] || 0) + 1;
        });
      });
    });
    // Add player's team stats from playerSeasonStats (the authoritative source)
    if (playerSeasonStats) {
      Object.entries(playerSeasonStats).forEach(([name, s]) => {
        const key = `${name}|0`;
        if (s.goals > 0) scorers[key] = s.goals;
        if (s.assists > 0) assisters[key] = s.assists;
        if ((s.yellows || 0) + (s.reds || 0) > 0) cards[key] = (s.yellows || 0) + (s.reds || 0);
      });
    }
    return { scorers, assisters, cards };
  }, [leagueResults, playerSeasonStats]);

  // Top scorers list
  const topScorers = React.useMemo(() => {
    return Object.entries(leagueStats.scorers)
      .map(([key, goals]) => {
        const [name, teamIdx] = key.split("|");
        const team = league.teams[parseInt(teamIdx)];
        return { name, teamName: team?.name || "?", goals, isPlayer: team?.isPlayer };
      })
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 20);
  }, [leagueStats.scorers, league.teams]);

  // Top assists list
  const topAssists = React.useMemo(() => {
    return Object.entries(leagueStats.assisters)
      .map(([key, assists]) => {
        const [name, teamIdx] = key.split("|");
        const team = league.teams[parseInt(teamIdx)];
        return { name, teamName: team?.name || "?", assists, isPlayer: team?.isPlayer };
      })
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 20);
  }, [leagueStats.assisters, league.teams]);

  // Top cards list
  const topCards = React.useMemo(() => {
    return Object.entries(leagueStats.cards)
      .map(([key, count]) => {
        const [name, teamIdx] = key.split("|");
        const team = league.teams[parseInt(teamIdx)];
        return { name, teamName: team?.name || "?", cards: count, isPlayer: team?.isPlayer };
      })
      .sort((a, b) => b.cards - a.cards)
      .slice(0, 15);
  }, [leagueStats.cards, league.teams]);

  // Team of the Season
  const teamOfSeason = React.useMemo(() => {
    if (matchweekIndex < 3) return [];
    const candidates = [];

    // Simple deterministic hash for per-player variety
    const nameHash = (name) => { let h = 0; for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0; return (Math.abs(h) % 100) / 100; };

    // Player's squad members — real tracked data
    if (playerSeasonStats && squad) {
      squad.forEach(p => {
        const s = playerSeasonStats[p.name] || {};
        const ratings = (playerRatingTracker || {})[p.name] || [];
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
        const goals = s.goals || 0;
        const apps = s.apps || 0;
        if (apps < 5) return;
        candidates.push({
          name: p.name, position: p.position, teamName: teamName,
          isPlayerTeam: true, goals, avgRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null, apps,
        });
      });
    }

    // AI team players — generate synthetic ratings from team & individual performance
    league.teams.forEach((team, teamIdx) => {
      if (team.isPlayer || !team.squad) return;
      const row = league.table?.find(r => r.teamIndex === teamIdx);
      if (!row) return;
      const played = row.won + row.drawn + row.lost;
      if (played === 0) return;
      const winRate = row.won / played;
      const drawRate = row.drawn / played;
      const gpg = row.goalsFor / played; // goals per game
      const cpg = row.goalsAgainst / played; // conceded per game
      // Base team rating: 6.0-8.0 range based on results
      const teamBase = 6.0 + winRate * 1.6 + drawRate * 0.4 + Math.min(gpg * 0.15, 0.4) - Math.min(cpg * 0.1, 0.3);

      team.squad.forEach(p => {
        if (p.isBench) return;
        const key = `${p.name}|${teamIdx}`;
        const goals = leagueStats.scorers[key] || 0;
        const cardCount = leagueStats.cards[key] || 0;
        const posType = POSITION_TYPES[p.position] || "MID";
        const apps = played; // starters play all games

        // Individual adjustments
        let rating = teamBase;
        // Goals boost (bigger for non-forwards)
        const goalsPerGame = goals / played;
        if (posType === "FWD") rating += goalsPerGame * 1.5;
        else if (posType === "MID") rating += goalsPerGame * 2.5;
        else if (posType === "DEF") rating += goalsPerGame * 4.0;
        else rating += goalsPerGame * 3.0; // GK
        // Defensive bonus for GK/DEF from low conceding
        if (posType === "GK" || posType === "DEF") rating += Math.max(0, (1.0 - cpg) * 0.4);
        // Card penalty
        rating -= (cardCount / played) * 0.3;
        // Per-player variety (±0.3) for realism
        rating += (nameHash(p.name) - 0.5) * 0.6;
        // Clamp
        rating = Math.max(5.5, Math.min(9.5, rating));

        candidates.push({
          name: p.name, position: p.position, teamName: team.name,
          isPlayerTeam: false, goals, avgRating: parseFloat(rating.toFixed(1)), apps,
        });
      });
    });

    // Unified scoring: avgRating-first, goals as tiebreaker
    candidates.forEach(c => {
      const r = c.avgRating || 6.0;
      c.score = r * 10 + c.goals * 1.5 + c.apps * 0.2;
    });

    // Pick best player per position slot for a 4-3-3
    const totsPositions = ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "AM", "LW", "RW", "ST"];
    const used = new Set();
    const xi = [];
    for (const pos of totsPositions) {
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
  }, [leagueStats, league.teams, league.table, squad, playerSeasonStats, playerRatingTracker, matchweekIndex, teamName]);

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
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: mob ? F.xl : F.h2, color: league.leagueColor || C.gold, letterSpacing: 2 }}>
          🏆 {league.leagueName || "LEAGUE"}
        </div>
        <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate, marginTop: 5 }}>
          Season {seasonNumber || 1} · Matchday {matchweekIndex}/{league.fixtures?.length || 18}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => { setActiveTab("leagues"); setViewTeamData(null); }} style={tabStyle("leagues")}>📊 TABLE</button>
        <button onClick={() => { setActiveTab("results"); setViewTeamData(null); }} style={tabStyle("results")}>📋 RESULTS</button>
        <button onClick={() => { setActiveTab("stats"); setViewTeamData(null); }} style={tabStyle("stats")}>⚽ STATS</button>
        <button onClick={() => { setActiveTab("tots"); setViewTeamData(null); }} style={tabStyle("tots")}>🌟 TOTS</button>
        <button onClick={() => { setActiveTab("alltime"); setViewTeamData(null); }} style={tabStyle("alltime")}>🏛️ ALL-TIME</button>
      </div>

      {/* Tab content */}
      <div style={{ background: C.bg, border: `1px solid ${C.bgCard}` }}>


        {/* ===== RESULTS TAB ===== */}
        {activeTab === "results" && (() => {
          // Build page list: league MDs + dynasty rounds
          const pages = [];
          for (let md = 0; md < matchweekIndex; md++) pages.push({ type: "league", md, label: `Matchday ${md + 1}` });
          if (dynastyCupBracket?.sf1?.result) pages.push({ type: "dynasty", round: "sf", label: "🌍 Dynasty Cup — Semi-Finals" });
          if (dynastyCupBracket?.final?.result) pages.push({ type: "dynasty", round: "final", label: "🏆 Dynasty Cup — Final" });
          const maxPage = pages.length - 1;
          const currentPage = pages[selectedMD] || pages[maxPage];
          return (
          <div style={{ padding: mob ? "21px 14px" : "26px" }}>
            {/* Matchday selector */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 18 }}>
              <button onClick={() => setSelectedMD(prev => Math.max(0, prev - 1))} disabled={selectedMD <= 0}
                style={{ background: "none", border: `1px solid ${C.bgInput}`, color: selectedMD <= 0 ? C.bgCard : C.textMuted, padding: "10px 17px", cursor: selectedMD <= 0 ? "not-allowed" : "pointer", fontSize: F.lg, fontFamily: FONT }}>◀</button>
              <span style={{ fontSize: mob ? F.lg : F.xl, color: currentPage?.type === "dynasty" ? "#facc15" : C.gold, minWidth: mob ? 167 : 232, textAlign: "center" }}>
                {currentPage?.label || `Matchday ${selectedMD + 1}`}
              </span>
              <button onClick={() => setSelectedMD(prev => Math.min(maxPage, prev + 1))} disabled={selectedMD >= maxPage}
                style={{ background: "none", border: `1px solid ${C.bgInput}`, color: selectedMD >= maxPage ? C.bgCard : C.textMuted, padding: "10px 17px", cursor: selectedMD >= maxPage ? "not-allowed" : "pointer", fontSize: F.lg, fontFamily: FONT }}>▶</button>
            </div>

            {/* Dynasty Cup results */}
            {currentPage?.type === "dynasty" ? (() => {
              const dcMatches = [];
              if (currentPage.round === "sf") {
                if (dynastyCupBracket.sf1?.result) dcMatches.push({ home: dynastyCupBracket.sf1.home, away: dynastyCupBracket.sf1.away, ...dynastyCupBracket.sf1.result });
                if (dynastyCupBracket.sf2?.result) dcMatches.push({ home: dynastyCupBracket.sf2.home, away: dynastyCupBracket.sf2.away, ...dynastyCupBracket.sf2.result });
              } else if (dynastyCupBracket.final?.result) {
                dcMatches.push({ home: dynastyCupBracket.final.home, away: dynastyCupBracket.final.away, ...dynastyCupBracket.final.result });
              }
              return dcMatches.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {dcMatches.map((m, i) => {
                    const hWin = m.winner === m.home || m.homeGoals > m.awayGoals;
                    const aWin = m.winner === m.away || m.awayGoals > m.homeGoals;
                    const isPlayer = m.home?.isPlayer || m.away?.isPlayer;
                    const pensLabel = m.pens ? ` (${m.pens.homeScore ?? m.pens.homeGoals}-${m.pens.awayScore ?? m.pens.awayGoals}p)` : "";
                    return (
                      <div key={i} style={{ padding: mob ? "21px 14px" : "21px 26px", borderBottom: `1px solid ${C.bgCard}`, background: isPlayer ? "rgba(74,222,128,0.04)" : "transparent" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: mob ? 9 : 18 }}>
                          <div onClick={() => m.home?.name && onTeamClick?.(m.home.name)} style={{ flex: 1, textAlign: "right", fontSize: mob ? F.md : F.lg, color: m.home?.isPlayer ? C.green : hWin ? C.text : C.textDim, fontWeight: hWin ? "bold" : "normal", cursor: m.home?.name ? "pointer" : "default" }}>
                            {m.home?.name || "?"}
                          </div>
                          <div style={{ fontSize: mob ? F.xl : F.h2, fontWeight: "bold", color: C.text, minWidth: mob ? 85 : 104, textAlign: "center", background: "rgba(30,41,59,0.5)", padding: "8px 14px", border: isPlayer ? "1px solid #4ade8033" : `1px solid ${C.bgCard}` }}>
                            {m.homeGoals} - {m.awayGoals}{pensLabel}
                          </div>
                          <div onClick={() => m.away?.name && onTeamClick?.(m.away.name)} style={{ flex: 1, textAlign: "left", fontSize: mob ? F.md : F.lg, color: m.away?.isPlayer ? C.green : aWin ? C.text : C.textDim, fontWeight: aWin ? "bold" : "normal", cursor: m.away?.name ? "pointer" : "default" }}>
                            {m.away?.name || "?"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div style={{ textAlign: "center", padding: 28, fontSize: F.md, color: C.bgInput }}>No dynasty results yet</div>;
            })() : null}

            {/* League results for selected matchday */}
            {currentPage?.type === "league" && leagueResults[currentPage.md] ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {leagueResults[currentPage.md].map((match, i) => {
                  const homeTeam = league.teams[match.home];
                  const awayTeam = league.teams[match.away];
                  const homeWin = match.homeGoals > match.awayGoals;
                  const awayWin = match.awayGoals > match.homeGoals;
                  const isPlayerMatch = homeTeam?.isPlayer || awayTeam?.isPlayer;
                  const homeScorers = (match.goalScorers || []).filter(g => g.side === "home");
                  const awayScorers = (match.goalScorers || []).filter(g => g.side === "away");

                  // Build set of all surnames in this matchday for uniqueness check
                  const allMatchdayScorers = (leagueResults[currentPage.md] || []).flatMap(m => m.goalScorers || []);
                  const surnameCount = {};
                  allMatchdayScorers.forEach(g => {
                    const parts = (g.name || "").split(" ");
                    const surname = parts.length > 1 ? parts[parts.length - 1] : g.name;
                    surnameCount[surname] = (surnameCount[surname] || 0) + 1;
                  });

                  // Group scorers by name, condense minutes, use short name
                  const formatScorerList = (scorers) => {
                    const grouped = {};
                    const order = [];
                    scorers.forEach(g => {
                      if (!grouped[g.name]) { grouped[g.name] = []; order.push(g.name); }
                      grouped[g.name].push(g.minute);
                    });
                    return order.map(fullName => {
                      const parts = fullName.split(" ");
                      const surname = parts.length > 1 ? parts[parts.length - 1] : fullName;
                      const shortName = (surnameCount[surname] || 0) > 1
                        ? `${parts[0][0]}.${surname}`
                        : surname;
                      const mins = grouped[fullName].map(m => `${m}'`).join(", ");
                      return `${shortName} ${mins}`;
                    }).join(", ");
                  };
                  return (
                    <div key={i} style={{
                      padding: mob ? "21px 14px" : "21px 26px",
                      borderBottom: `1px solid ${C.bgCard}`,
                      background: isPlayerMatch ? "rgba(74,222,128,0.04)" : "transparent",
                    }}>
                      {/* Scoreline */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: mob ? 9 : 18 }}>
                        <div onClick={() => homeTeam?.name && onTeamClick?.(homeTeam.name)} style={{
                          flex: 1, textAlign: "right",
                          fontSize: mob ? F.md : F.lg,
                          color: homeTeam?.isPlayer ? C.green : homeWin ? C.text : C.textDim,
                          fontWeight: homeWin ? "bold" : "normal",
                          cursor: homeTeam?.name ? "pointer" : "default",
                        }}>
                          {homeTeam?.name || "?"}
                        </div>
                        <div style={{
                          fontSize: mob ? F.xl : F.h2, fontWeight: "bold",
                          color: C.text, minWidth: mob ? 85 : 104, textAlign: "center",
                          background: "rgba(30,41,59,0.5)", padding: "8px 14px",
                          border: isPlayerMatch ? "1px solid #4ade8033" : `1px solid ${C.bgCard}`,
                        }}>
                          {match.homeGoals} - {match.awayGoals}
                        </div>
                        <div onClick={() => awayTeam?.name && onTeamClick?.(awayTeam.name)} style={{
                          flex: 1, textAlign: "left",
                          fontSize: mob ? F.md : F.lg,
                          color: awayTeam?.isPlayer ? C.green : awayWin ? C.text : C.textDim,
                          fontWeight: awayWin ? "bold" : "normal",
                          cursor: awayTeam?.name ? "pointer" : "default",
                        }}>
                          {awayTeam?.name || "?"}
                        </div>
                      </div>
                      {/* Scorer details */}
                      {(homeScorers.length > 0 || awayScorers.length > 0) && (
                        <div style={{ display: "flex", justifyContent: "center", gap: mob ? 9 : 18, marginTop: 7 }}>
                          <div style={{ flex: 1, textAlign: "right", fontSize: mob ? F.xs : F.sm, color: C.slate }}>
                            {homeScorers.length > 0 ? formatScorerList(homeScorers) : ""}
                          </div>
                          <div style={{ minWidth: mob ? 85 : 104 }} />
                          <div style={{ flex: 1, textAlign: "left", fontSize: mob ? F.xs : F.sm, color: C.slate }}>
                            {awayScorers.length > 0 ? formatScorerList(awayScorers) : ""}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : currentPage?.type === "league" ? (
              <div style={{ textAlign: "center", padding: 28, fontSize: F.md, color: C.bgInput }}>
                {matchweekIndex === 0 ? "No matches played yet" : "No data for this matchday"}
              </div>
            ) : null}
          </div>
          );
        })()}

        {/* ===== STATS TAB ===== */}
        {activeTab === "stats" && (
          <div style={{ padding: mob ? "21px 14px" : "26px" }}>
            {/* Top Scorers */}
            <div style={{ fontSize: mob ? F.lg : F.xl, color: C.gold, marginBottom: 14, letterSpacing: 1 }}>🥇 TOP SCORERS</div>
            {topScorers.length > 0 ? (
              <div style={{ marginBottom: 28 }}>
                {topScorers.map((s, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: mob ? "35px 1fr 1fr 51px" : "40px 1fr 1fr 59px",
                    padding: "14px", fontSize: F.md, gap: 5,
                    borderBottom: `1px solid ${C.bgCard}`,
                    background: i === 0 ? "rgba(250,204,21,0.06)" : s.isPlayer ? "rgba(74,222,128,0.04)" : "transparent",
                    alignItems: "center",
                  }}>
                    <span style={{ color: i === 0 ? C.gold : i < 3 ? C.textMuted : C.slate, fontWeight: i < 3 ? "bold" : "normal" }}>
                      {i + 1}
                    </span>
                    <span onClick={() => onPlayerClick?.(s.name, s.teamName)} style={{ color: s.isPlayer ? C.green : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: s.isPlayer ? "#4ade8044" : "#e2e8f044", textUnderlineOffset: 3 }}>
                      {s.name}
                    </span>
                    <span onClick={() => onTeamClick?.(s.teamName)} style={{ color: C.textDim, fontSize: mob ? F.xs : F.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: "#64748b44", textUnderlineOffset: 3 }}>
                      {s.teamName}
                    </span>
                    <span style={{ textAlign: "center", color: C.green, fontWeight: "bold", fontSize: F.xl }}>
                      {s.goals}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 18, fontSize: F.md, color: C.bgInput, marginBottom: 28 }}>No goals scored yet</div>
            )}

            {/* Top Assists */}
            <div style={{ fontSize: mob ? F.lg : F.xl, color: C.gold, marginBottom: 14, letterSpacing: 1 }}>🎯 TOP ASSISTS</div>
            {topAssists.length > 0 ? (
              <div style={{ marginBottom: 28 }}>
                {topAssists.map((s, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: mob ? "35px 1fr 1fr 51px" : "40px 1fr 1fr 59px",
                    padding: "14px", fontSize: F.md, gap: 5,
                    borderBottom: `1px solid ${C.bgCard}`,
                    background: i === 0 ? "rgba(250,204,21,0.06)" : s.isPlayer ? "rgba(74,222,128,0.04)" : "transparent",
                    alignItems: "center",
                  }}>
                    <span style={{ color: i === 0 ? C.gold : i < 3 ? C.textMuted : C.slate, fontWeight: i < 3 ? "bold" : "normal" }}>
                      {i + 1}
                    </span>
                    <span onClick={() => onPlayerClick?.(s.name, s.teamName)} style={{ color: s.isPlayer ? C.green : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: s.isPlayer ? "#4ade8044" : "#e2e8f044", textUnderlineOffset: 3 }}>
                      {s.name}
                    </span>
                    <span onClick={() => onTeamClick?.(s.teamName)} style={{ color: C.textDim, fontSize: mob ? F.xs : F.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: "#64748b44", textUnderlineOffset: 3 }}>
                      {s.teamName}
                    </span>
                    <span style={{ textAlign: "center", color: "#38bdf8", fontWeight: "bold", fontSize: F.xl }}>
                      {s.assists}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 18, fontSize: F.md, color: C.bgInput, marginBottom: 28 }}>No assists recorded yet</div>
            )}

            {/* Most Carded */}
            <div style={{ fontSize: mob ? F.lg : F.xl, color: C.gold, marginBottom: 14, letterSpacing: 1 }}>🟨 MOST BOOKED</div>
            {topCards.length > 0 ? (
              <div>
                {topCards.map((c, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: mob ? "30px 1fr 1fr 44px" : "35px 1fr 1fr 51px",
                    padding: "12px", fontSize: F.sm, gap: 4,
                    borderBottom: `1px solid ${C.bgCard}`,
                    background: c.isPlayer ? "rgba(74,222,128,0.04)" : "transparent",
                    alignItems: "center",
                  }}>
                    <span style={{ color: C.slate }}>{i + 1}</span>
                    <span onClick={() => onPlayerClick?.(c.name, c.teamName)} style={{ color: c.isPlayer ? C.green : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: c.isPlayer ? "#4ade8044" : "#e2e8f044", textUnderlineOffset: 3 }}>
                      {c.name}
                    </span>
                    <span onClick={() => onTeamClick?.(c.teamName)} style={{ color: C.textDim, fontSize: mob ? F.xs : F.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: "#64748b44", textUnderlineOffset: 3 }}>
                      {c.teamName}
                    </span>
                    <span style={{ textAlign: "center", color: C.amber, fontWeight: "bold", fontSize: F.lg }}>
                      {c.cards}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 16, fontSize: F.sm, color: C.bgInput }}>No cards issued yet</div>
            )}
          </div>
        )}

        {/* ===== TEAM OF THE SEASON TAB ===== */}
        {activeTab === "tots" && (
          <div style={{ padding: mob ? "18px 12px" : "23px" }}>
            <div style={{ fontSize: mob ? F.md : F.lg, color: C.gold, marginBottom: 4, letterSpacing: 1 }}>🌟 TEAM OF THE SEASON</div>
            <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate, marginBottom: 16 }}>Best performers based on goals, ratings & league position</div>
            {teamOfSeason.length > 0 ? (
              <div>
                {/* Header row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: mob ? "55px 1fr 51px 51px" : "58px 1fr 180px 51px 51px",
                  padding: "9px 12px", fontSize: mob ? F.xs : F.sm, gap: mob ? 4 : 8,
                  borderBottom: `1px solid ${C.bgInput}`, color: C.slate,
                }}>
                  <span></span>
                  <span>Player</span>
                  {!mob && <span>Club</span>}
                  <span style={{ textAlign: "center" }}>Goals</span>
                  <span style={{ textAlign: "center" }}>Avg</span>
                </div>
                {teamOfSeason.map((p, i) => {
                  const r = p.avgRating;
                  const rColor = r >= 7.5 ? C.green : r >= 7.0 ? C.gold : r >= 6.5 ? C.textMuted : C.textDim;
                  return (
                  <div key={i} style={{
                    display: "grid",
                    gridTemplateColumns: mob ? "55px 1fr 51px 51px" : "58px 1fr 180px 51px 51px",
                    padding: "15px 12px", fontSize: mob ? F.sm : F.md, gap: mob ? 4 : 8,
                    borderBottom: `1px solid ${C.bgCard}`,
                    background: p.isPlayerTeam ? "rgba(74,222,128,0.06)" : "transparent",
                    alignItems: "center",
                  }}>
                    <span style={{
                      background: getPosColor(p.position), color: C.bg,
                      padding: "3px 9px", fontSize: F.sm, fontWeight: "bold",
                      fontFamily: FONT, textAlign: "center",
                    }}>{p.position}</span>
                    <div style={{ overflow: "hidden" }}>
                      <div onClick={() => onPlayerClick?.(p.name, p.teamName)} style={{ color: p.isPlayerTeam ? C.green : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                        {p.name}
                      </div>
                      <div onClick={() => onTeamClick?.(p.teamName)} style={{ fontSize: F.xs, color: C.slate, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                        {p.teamName}{p.apps ? ` · ${p.apps} app${p.apps !== 1 ? "s" : ""}` : ""}
                      </div>
                    </div>
                    {!mob && (
                      <span onClick={() => onTeamClick?.(p.teamName)} style={{ color: C.textDim, fontSize: F.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                        {p.teamName}
                      </span>
                    )}
                    <span style={{ textAlign: "center", color: C.green, fontSize: F.md }}>
                      {p.goals > 0 ? `${p.goals}⚽` : ""}
                    </span>
                    <span style={{ textAlign: "center", color: rColor, fontSize: F.md, fontWeight: "bold" }}>
                      {r ? r.toFixed(1) : "—"}
                    </span>
                  </div>
                  );
                })}
                {/* Player count summary */}
                {(() => {
                  const teams = {};
                  teamOfSeason.forEach(p => { teams[p.teamName] = (teams[p.teamName] || 0) + 1; });
                  const sorted = Object.entries(teams).sort((a, b) => b[1] - a[1]);
                  return (
                    <div style={{ fontSize: mob ? F.micro : F.xs, color: C.slate, marginTop: 12, padding: "0 10px" }}>
                      {sorted.map(([t, c]) => `${t} (${c})`).join(" · ")}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 24, fontSize: F.sm, color: C.bgInput }}>
                Play some matches first
              </div>
            )}
          </div>
        )}

        {/* ===== ALL-TIME TAB ===== */}
        {/* ===== LEAGUES TAB ===== */}
        {activeTab === "leagues" && (() => {
          const displayTier = selectedSimTier ?? tier;
          const isPlayerTier = displayTier === tier;
          const totalMDs = league.fixtures?.length || 18;
          const leagueDef2 = LEAGUE_DEFS[displayTier];
          const leagueColor2 = leagueDef2?.color || C.textMuted;

          // Build standings rows for the selected tier
          let rows;
          if (isPlayerTier) {
            rows = sorted.map(r => {
              const tm = league.teams[r.teamIndex];
              return {
                name: tm.name, color: tm.color, trait: tm.trait, isPlayer: tm.isPlayer,
                teamIndex: r.teamIndex,
                matchesPlayed: r.played, won: r.won, drawn: r.drawn, lost: r.lost,
                points: r.points, gf: r.goalsFor, ga: r.goalsAgainst,
              };
            });
          } else {
            const aiLeague = allLeagueStates?.[displayTier];
            if (aiLeague) {
              const sortedAI = [...aiLeague.table].sort((a, b) =>
                b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
              );
              rows = sortedAI.map(r2 => {
                const tm = aiLeague.teams[r2.teamIndex];
                return {
                  name: tm.name, color: tm.color, trait: tm.trait, isPlayer: false,
                  teamIndex: r2.teamIndex,
                  matchesPlayed: r2.played, won: r2.won, drawn: r2.drawn, lost: r2.lost,
                  points: r2.points, gf: r2.goalsFor, ga: r2.goalsAgainst,
                };
              });
            } else {
              // No AI league data — show teams from static defs (not clickable)
              const tierRoster = leagueDef2?.teams || [];
              rows = [...tierRoster].sort((a, b) => b.strength - a.strength).map(t2 => ({
                name: t2.name, color: t2.color, trait: t2.trait, isPlayer: false,
                matchesPlayed: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0,
              }));
            }
          }

          return (
            <div style={{ padding: mob ? "16px 10px" : "20px" }}>
              {/* Tier selector chips */}
              <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
                {visibleTiers.map(t2 => {
                  const def = LEAGUE_DEFS[t2];
                  const isActive = t2 === displayTier;
                  return (
                    <button key={t2} onClick={() => setSelectedSimTier(t2)} style={{
                      padding: mob ? "7px 9px" : "7px 12px",
                      fontSize: mob ? F.micro : F.xs,
                      fontFamily: FONT,
                      background: isActive ? `${def?.color}22` : "transparent",
                      border: `1px solid ${isActive ? (def?.color || C.textMuted) : C.bgInput}`,
                      color: isActive ? (def?.color || C.text) : C.textDim,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}>
                      {def?.shortName || t2}
                      {t2 === tier && <span style={{ color: C.green, marginLeft: 3 }}>★</span>}
                    </button>
                  );
                })}
              </div>

              {/* League name + matchday progress */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div style={{ fontSize: mob ? F.xs : F.sm, color: leagueColor2, letterSpacing: 1 }}>
                  {leagueDef2?.name || "League"}
                </div>
                {!isPlayerTier && rows[0]?.matchesPlayed > 0 && (
                  <div style={{ fontSize: mob ? F.micro : F.xs, color: C.slate }}>
                    MD {rows[0].matchesPlayed} / {(leagueDef2?.teams?.length - 1) * 2 || 18}
                  </div>
                )}
              </div>

              {/* Promo/relego legend */}
              <div style={{ fontSize: mob ? F.micro : F.xs, color: C.slate, marginBottom: 10, display: "flex", gap: 12 }}>
                {displayTier > 1 && <span><span style={{ color: C.gold }}>■</span> {getModifier(displayTier).miniTournament ? "5v5 tournament: top 3 promoted" : "Top 3 promoted"}</span>}
                {displayTier < NUM_TIERS && <span><span style={{ color: C.red }}>■</span> Bottom 3 relegated</span>}
              </div>

              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: tableCols, padding: "10px 10px", fontSize: F.xs, color: C.slate, borderBottom: `1px solid ${C.bgInput}`, gap: 4 }}>
                <span>#</span><span>TEAM</span>
                {mob
                  ? <><span style={{ textAlign: "center" }}>P</span><span style={{ textAlign: "center" }}>GD</span><span style={{ textAlign: "center" }}>PTS</span></>
                  : <><span style={{ textAlign: "center" }}>P</span><span style={{ textAlign: "center" }}>W</span><span style={{ textAlign: "center" }}>D</span><span style={{ textAlign: "center" }}>L</span><span style={{ textAlign: "center" }}>GF</span><span style={{ textAlign: "center" }}>GD</span><span style={{ textAlign: "center" }}>PTS</span></>}
              </div>

              {/* Rows */}
              {rows.map((row, pos) => {
                const totalTeams = rows.length;
                const inPromoZone = displayTier > 1 && pos <= 2;
                const inRelegZone = displayTier < NUM_TIERS && pos >= totalTeams - 3;
                const gd = row.gf - row.ga;
                return (
                  <div key={row.name} style={{
                    display: "grid", gridTemplateColumns: tableCols,
                    padding: mob ? "13px 10px" : "10px 10px", fontSize: F.sm, gap: 4,
                    borderBottom: `1px solid ${C.bgCard}`,
                    borderLeft: row.isPlayer ? `3px solid ${C.green}` : inPromoZone ? `3px solid ${C.gold}` : inRelegZone ? `3px solid ${C.red}` : "3px solid transparent",
                    background: row.isPlayer ? "rgba(74,222,128,0.10)" : inPromoZone ? "rgba(250,204,21,0.03)" : inRelegZone ? "rgba(239,68,68,0.03)" : "transparent",
                    alignItems: "center",
                  }}>
                    <span style={{ color: row.isPlayer ? C.green : inPromoZone ? C.gold : inRelegZone ? C.red : C.textDim, fontSize: F.md }}>{pos + 1}</span>
                    <span
                      onClick={() => {
                        if (row.teamIndex == null) return;
                        // Player's own team
                        if (row.isPlayer) {
                          const playerTeam = league.teams[row.teamIndex];
                          const tr = league.table?.find(r => r.teamIndex === row.teamIndex);
                          const tableRow = tr ? { played: tr.played, won: tr.won, drawn: tr.drawn, lost: tr.lost, goalsFor: tr.goalsFor, goalsAgainst: tr.goalsAgainst, points: tr.points } : null;
                          const sGoals = {}, sAssists = {};
                          if (playerSeasonStats) {
                            Object.entries(playerSeasonStats).forEach(([name, s]) => {
                              if (s.goals > 0) sGoals[name] = s.goals;
                              if (s.assists > 0) sAssists[name] = s.assists;
                            });
                          }
                          // Annotate squad with isBench flag based on startingXI/bench ID arrays
                          const xiSet = new Set(startingXI || []);
                          const benchSet = new Set(bench || []);
                          const annotatedSquad = (squad || [])
                            .filter(p => xiSet.has(p.id) || benchSet.has(p.id))
                            .map(p => ({ ...p, isBench: benchSet.has(p.id) }));
                          setViewTeamData({
                            team: { name: teamName, color: playerTeam?.color || C.green, squad: annotatedSquad, isPlayer: true },
                            tableRow,
                            seasonGoals: Object.keys(sGoals).length ? sGoals : null,
                            seasonAssists: Object.keys(sAssists).length ? sAssists : null,
                          });
                          return;
                        }
                        // AI team
                        let team, tableRow;
                        if (isPlayerTier) {
                          team = league.teams[row.teamIndex];
                          const tr = league.table?.find(r => r.teamIndex === row.teamIndex);
                          tableRow = tr ? { played: tr.played, won: tr.won, drawn: tr.drawn, lost: tr.lost, goalsFor: tr.goalsFor, goalsAgainst: tr.goalsAgainst, points: tr.points } : null;
                        } else {
                          const aiLeague2 = allLeagueStates?.[displayTier];
                          if (!aiLeague2) return;
                          team = aiLeague2.teams[row.teamIndex];
                          const tr = aiLeague2.table?.find(r => r.teamIndex === row.teamIndex);
                          tableRow = tr ? { played: tr.played, won: tr.won, drawn: tr.drawn, lost: tr.lost, goalsFor: tr.goalsFor, goalsAgainst: tr.goalsAgainst, points: tr.points } : null;
                        }
                        if (!team?.squad) return;
                        const sGoals = {}, sAssists = {};
                        if (isPlayerTier) {
                          Object.entries(leagueStats.scorers).forEach(([key, goals]) => {
                            const [name, tidxStr] = key.split("|");
                            if (parseInt(tidxStr) === row.teamIndex) sGoals[name] = goals;
                          });
                          Object.entries(leagueStats.assisters).forEach(([key, assists]) => {
                            const [name, tidxStr] = key.split("|");
                            if (parseInt(tidxStr) === row.teamIndex) sAssists[name] = assists;
                          });
                        }
                        setViewTeamData({
                          team,
                          tableRow,
                          seasonGoals: Object.keys(sGoals).length ? sGoals : null,
                          seasonAssists: Object.keys(sAssists).length ? sAssists : null,
                        });
                      }}
                      style={{
                        color: row.isPlayer ? C.green : C.text, fontSize: mob ? F.xs : F.sm,
                        display: "flex", alignItems: "center", minWidth: 0,
                        cursor: row.teamIndex != null ? "pointer" : "default",
                      }}
                    >
                      <span style={{
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        textDecoration: row.teamIndex != null ? "underline" : "none",
                        textDecorationColor: row.color || C.slate,
                        textDecorationStyle: "dotted",
                      }}>
                        {row.name}
                      </span>
                      {(() => {
                        const seasonDone = isPlayerTier && matchweekIndex >= (league.fixtures?.length || 18);
                        if (!seasonDone) return null;
                        const isChamp = pos === 0;
                        const mod = getModifier(displayTier);
                        if (mod.miniTournament && displayTier > 1 && miniTournamentBracket) {
                          const mW = miniTournamentBracket.winner;
                          const mR = miniTournamentBracket.runnerUp
                            || (mW && miniTournamentBracket.final?.home && miniTournamentBracket.final?.away
                              ? (mW.name === miniTournamentBracket.final.home.name ? miniTournamentBracket.final.away : miniTournamentBracket.final.home)
                              : null);
                          const m3 = miniTournamentBracket.thirdPlaceWinner
                            || miniTournamentBracket.thirdPlace?.winner || null;
                          if (mW && row.name === mW.name) return <span style={{ fontSize: F.micro, color: "#facc15", marginLeft: 6, flexShrink: 0 }}>(C)</span>;
                          if (mR && row.name === mR.name) return <span style={{ fontSize: F.micro, color: C.gold, marginLeft: 6, flexShrink: 0 }}>(P)</span>;
                          if (m3 && row.name === m3.name) return <span style={{ fontSize: F.micro, color: C.gold, marginLeft: 6, flexShrink: 0 }}>(P)</span>;
                        } else {
                          if (isChamp) return <span style={{ fontSize: F.micro, color: "#facc15", marginLeft: 6, flexShrink: 0 }}>(C)</span>;
                          if (displayTier > 1 && inPromoZone && !isChamp) return <span style={{ fontSize: F.micro, color: C.gold, marginLeft: 6, flexShrink: 0 }}>(P)</span>;
                        }
                        return null;
                      })()}
                      {!mob && row.trait && TEAM_TRAITS[row.trait] && (
                        <span style={{ fontSize: F.micro, color: C.textDim, marginLeft: 6, flexShrink: 0 }}>{TEAM_TRAITS[row.trait].label}</span>
                      )}
                    </span>
                    {mob ? (
                      <>
                        <span style={{ textAlign: "center", color: row.isPlayer ? C.green : C.textMuted }}>{row.matchesPlayed}</span>
                        <span style={{ textAlign: "center", color: gd > 0 ? C.green : gd < 0 ? C.red : C.textMuted }}>{gd > 0 ? `+${gd}` : gd}</span>
                        <span style={{ textAlign: "center", color: row.isPlayer ? C.green : C.text, fontWeight: "bold", fontSize: F.md }}>{row.points}</span>
                      </>
                    ) : (
                      <>
                        <span style={{ textAlign: "center", color: row.isPlayer ? C.green : C.textMuted }}>{row.matchesPlayed}</span>
                        <span style={{ textAlign: "center", color: row.isPlayer ? C.green : C.textMuted }}>{row.won}</span>
                        <span style={{ textAlign: "center", color: row.isPlayer ? C.green : C.textMuted }}>{row.drawn}</span>
                        <span style={{ textAlign: "center", color: row.isPlayer ? C.green : C.textMuted }}>{row.lost}</span>
                        <span style={{ textAlign: "center", color: row.isPlayer ? C.green : C.textMuted }}>{row.gf}</span>
                        <span style={{ textAlign: "center", color: gd > 0 ? C.green : gd < 0 ? C.red : C.textMuted }}>{gd > 0 ? `+${gd}` : gd}</span>
                        <span style={{ textAlign: "center", color: row.isPlayer ? C.green : C.text, fontWeight: "bold", fontSize: F.md }}>{row.points}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {activeTab === "alltime" && (() => {
          // Merge persisted allTimeLeagueStats with current season data
          const merged = { scorers: { ...(allTimeLeagueStats?.scorers || {}) }, assisters: { ...(allTimeLeagueStats?.assisters || {}) }, cards: { ...(allTimeLeagueStats?.cards || {}) } };

          // Add current season AI stats from leagueResults
          Object.values(leagueResults || {}).forEach(mwResults => {
            (mwResults || []).forEach(match => {
              (match.goalScorers || []).forEach(g => {
                const teamIdx = g.side === "home" ? match.home : match.away;
                const team = league?.teams?.[teamIdx];
                if (!team || team.isPlayer) return; // skip player team here
                const key = `${g.name}|${team.name}`;
                merged.scorers[key] = (merged.scorers[key] || 0) + 1;
                if (g.assister) {
                  const aKey = `${g.assister}|${team.name}`;
                  merged.assisters[aKey] = (merged.assisters[aKey] || 0) + 1;
                }
              });
              (match.cardRecipients || []).forEach(c => {
                const team = league?.teams?.[c.teamIdx];
                if (!team || team.isPlayer) return;
                const key = `${c.name}|${team.name}`;
                merged.cards[key] = (merged.cards[key] || 0) + 1;
              });
            });
          });

          // Add player team current season from playerSeasonStats + clubHistory
          if (playerSeasonStats) {
            Object.entries(playerSeasonStats).forEach(([name, s]) => {
              const key = `${name}|${teamName}`;
              const career = clubHistory?.playerCareers?.[name];
              // Career total + current season (career doesn't include current season yet)
              const careerGoals = career ? (career.goals || 0) : 0;
              const careerAssists = career ? (career.assists || 0) : 0;
              const careerCards = career ? ((career.yellows || 0) + (career.reds || 0)) : 0;
              const totalGoals = careerGoals + (s.goals || 0);
              const totalAssists = careerAssists + (s.assists || 0);
              const totalCards = careerCards + (s.yellows || 0) + (s.reds || 0);
              if (totalGoals > 0) merged.scorers[key] = totalGoals;
              if (totalAssists > 0) merged.assisters[key] = totalAssists;
              if (totalCards > 0) merged.cards[key] = totalCards;
            });
          }

          // Build sorted lists
          const scorerList = Object.entries(merged.scorers)
            .map(([key, goals]) => { const [name, team] = key.split("|"); return { name, teamName: team, goals, isPlayerTeam: team === teamName }; })
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 20);
          const assisterList = Object.entries(merged.assisters)
            .map(([key, assists]) => { const [name, team] = key.split("|"); return { name, teamName: team, assists, isPlayerTeam: team === teamName }; })
            .sort((a, b) => b.assists - a.assists)
            .slice(0, 20);
          const cardList = Object.entries(merged.cards)
            .map(([key, cards]) => { const [name, team] = key.split("|"); return { name, teamName: team, cards, isPlayerTeam: team === teamName }; })
            .sort((a, b) => b.cards - a.cards)
            .slice(0, 20);

          const hasData = scorerList.length > 0 || cardList.length > 0;
          const isFirstSeason = (seasonNumber || 1) <= 1 && !allTimeLeagueStats?.scorers;

          const renderAllTimeList = (title, icon, list, valueFn, unitLabel) => (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: mob ? F.xs : F.sm, color: C.gold, marginBottom: 8, letterSpacing: 1 }}>{icon} {title}</div>
              {list.length > 0 ? list.map((p, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: mob ? "26px 1fr 100px 54px" : "30px 1fr 156px 64px",
                  padding: "10px", fontSize: F.xs, gap: 4,
                  borderBottom: `1px solid ${C.bgCard}`,
                  background: p.isPlayerTeam ? "rgba(74,222,128,0.04)" : "transparent",
                  alignItems: "center",
                }}>
                  <span style={{ color: i < 3 ? C.gold : C.slate }}>{i + 1}</span>
                  <div style={{ overflow: "hidden" }}>
                    <span onClick={() => onPlayerClick?.(p.name, p.teamName)} style={{ color: p.isPlayerTeam ? C.green : C.text, cursor: "pointer" }}>{p.name}</span>
                  </div>
                  <span onClick={() => onTeamClick?.(p.teamName)} style={{ color: C.textDim, fontSize: mob ? F.micro : F.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                    {p.teamName}
                  </span>
                  <span style={{ textAlign: "right", color: i === 0 ? C.gold : C.text, fontWeight: i < 3 ? "bold" : "normal", fontSize: mob ? F.sm : F.md }}>
                    {valueFn(p)}
                  </span>
                </div>
              )) : (
                <div style={{ fontSize: F.xs, color: C.bgInput, padding: 8 }}>No data yet</div>
              )}
            </div>
          );

          return (
            <div style={{ padding: mob ? "16px 10px" : "20px" }}>
              <div style={{ fontSize: mob ? F.sm : F.md, color: C.gold, marginBottom: 4, letterSpacing: 1 }}>🏛️ LEAGUE ALL-TIME RECORDS</div>
              <div style={{ fontSize: mob ? F.micro : F.xs, color: C.slate, marginBottom: 16 }}>
                Cumulative stats across all seasons
              </div>
              {renderAllTimeList("TOP SCORERS", "⚽", scorerList, p => p.goals)}
              {renderAllTimeList("TOP ASSISTS", "🎯", assisterList, p => p.assists)}
              {renderAllTimeList("MOST BOOKED", "🟨", cardList, p => p.cards)}
            </div>
          );
        })()}
      </div>

      {/* AI Team Squad Panel */}
      {viewTeamData && (
        <AITeamPanel
          team={viewTeamData.team}
          tableRow={viewTeamData.tableRow}
          seasonGoals={viewTeamData.seasonGoals}
          seasonAssists={viewTeamData.seasonAssists}
          onClose={() => setViewTeamData(null)}
          onPlayerClick={(player) => onPlayerClick?.(player.name, viewTeamData?.team?.name)}
          clubRelationships={clubRelationships}
          transferFocus={transferFocus}
          onSetFocus={onSetFocus}
          onRemoveFocus={onRemoveFocus}
          onReplaceFocus={onReplaceFocus}
          ovrCap={ovrCap}
        />
      )}
    </div>
  );
}

// ==================== ACHIEVEMENTS SYSTEM ====================


