import React, { useState, useMemo } from "react";
import { POSITION_TYPES } from "../../data/positions.js";
import { ACHIEVEMENTS } from "../../data/achievements.js";
import { LEAGUE_DEFS, NUM_TIERS, TEAM_TRAITS } from "../../data/leagues.js";
import { getModifier } from "../../data/leagueModifiers.js";
import { getPosColor } from "../../utils/calc.js";
import { displayName } from "../../utils/player.js";
import { AITeamPanel } from "./AITeamPanel.jsx";
import { QualChip } from "../ui/QualChip.jsx";
import { F, C, FONT } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";
import { getTopScorers, getTopAssisters, getMostYellows, getMostReds, mergeStatsAcrossTiers } from "../../utils/competitionStats.js";

export function LeaguePage({ league, leagueResults, matchweekIndex, teamName, playerSeasonStats, playerRatingTracker, squad, startingXI, bench, seasonNumber, clubHistory, leagueHistory = {}, allTimeLeagueStatsByTier, allLeagueStates, leagueTier: leagueTierProp, onPlayerClick, onTeamClick, clubRelationships, transferFocus, onSetFocus, onRemoveFocus, onReplaceFocus, dynastyCupBracket, miniTournamentBracket, ovrCap = 20, seasonLeagueStatsByTier = null, seasonLeagueStatsAvailable = true }) {
  const [activeTab, setActiveTab] = useState("leagues");
  const [selectedMD, setSelectedMD] = useState(Math.max(0, matchweekIndex - 1));
  const [viewTeamData, setViewTeamData] = useState(null); // { team, tableRow, seasonGoals, seasonAssists }
  const [selectedSimTier, setSelectedSimTier] = useState(null);
  // History tab only: which past season's archive to display. Defaults to
  // the most recent season once leagueHistory has entries.
  const [selectedHistorySeason, setSelectedHistorySeason] = useState(null);
  // All-Time tab only: "tier" shows the selected division's record book
  // (today's default behaviour), "all" merges every division into one
  // career-wide view via mergeStatsAcrossTiers.
  const [allTimeScope, setAllTimeScope] = useState("tier");
  const mob = useMobile();

  const sorted = [...league.table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
  // Player's own tier (the one their squad plays in).
  const tier = league.tier || leagueTierProp || NUM_TIERS;
  // The tier the user is currently inspecting in the UI. Stats and All-Time
  // tabs follow this so the user can browse other divisions' record books
  // via the tier chips. Falls back to the player's tier when unset.
  const displayTier = selectedSimTier ?? tier;
  const isPlayerDisplayTier = displayTier === tier;
  const displayLeague = isPlayerDisplayTier ? league : (allLeagueStates?.[displayTier] || null);
  // Per-tier season + all-time slots for whichever tier is being inspected.
  const seasonLeagueStats = (seasonLeagueStatsByTier && displayTier != null)
    ? (seasonLeagueStatsByTier[displayTier] || null)
    : null;
  // The TOTS heuristic still uses the player's own-tier season blob — it's
  // a player-team feature, not a per-division browsable view.
  const playerTierSeasonLeagueStats = (seasonLeagueStatsByTier && tier != null)
    ? (seasonLeagueStatsByTier[tier] || null)
    : null;
  const canPromote = tier > 1;
  const canRelegate = tier < NUM_TIERS;
  const tableCols = mob ? "35px 1fr 45px 51px 59px" : "40px 1fr 47px 47px 47px 47px 59px 59px 59px";

  // Which tiers the player has ever reached (determines which leagues are unlocked to view)
  const highestTierReached = [tier, leagueTierProp, ...(clubHistory?.seasonArchive || []).map(s => s.tier || NUM_TIERS)]
    .filter(t2 => t2 != null).reduce((min, t2) => Math.min(min, t2), NUM_TIERS);
  // Tiers 5–11 always visible; tiers 1–4 unlock once the player has reached them
  const visibleTiers = Array.from({ length: NUM_TIERS }, (_, i) => i + 1).filter(t2 => t2 >= 5 || t2 >= highestTierReached).reverse();

  // Local "name|teamIdx" maps derived from the player's tier season blob.
  // Used by the TOTS heuristic and the AI-team panel onClick (player-tier
  // only path) which were originally written against this shape.
  const leagueStats = React.useMemo(() => {
    const scorers = {}, assisters = {}, cards = {};
    const players = playerTierSeasonLeagueStats?.players || {};
    for (const p of Object.values(players)) {
      const teamIdx = p.teamId;
      if (teamIdx == null) continue;
      const key = `${p.name}|${teamIdx}`;
      if (p.goals > 0) scorers[key] = p.goals;
      if (p.assists > 0) assisters[key] = p.assists;
      const totalCards = (p.yellows || 0) + (p.reds || 0);
      if (totalCards > 0) cards[key] = totalCards;
    }
    return { scorers, assisters, cards };
  }, [playerTierSeasonLeagueStats]);

  // Stats tab is canonical-only and follows the selected tier chip via
  // displayTier. The legacy "unavailable" notice only applies when the user
  // is looking at their own tier (other tiers either have populated data or
  // legitimately empty data — never legacy-unavailable).
  const displayTeams = displayLeague?.teams || [];
  const mapToCanonicalRow = (p, valueField) => ({
    name: p.name, teamName: p.teamName || "?", [valueField]: p[valueField],
    isPlayer: displayTeams[p.teamId]?.isPlayer || false,
    playerId: p.playerId,
  });
  const topScorers = React.useMemo(
    () => getTopScorers(seasonLeagueStats, 20).map(p => mapToCanonicalRow(p, "goals")),
    [seasonLeagueStats, displayTeams]
  );
  const topAssists = React.useMemo(
    () => getTopAssisters(seasonLeagueStats, 20).map(p => mapToCanonicalRow(p, "assists")),
    [seasonLeagueStats, displayTeams]
  );
  const topYellows = React.useMemo(
    () => getMostYellows(seasonLeagueStats, 15).map(p => mapToCanonicalRow(p, "yellows")),
    [seasonLeagueStats, displayTeams]
  );
  const topReds = React.useMemo(
    () => getMostReds(seasonLeagueStats, 15).map(p => mapToCanonicalRow(p, "reds")),
    [seasonLeagueStats, displayTeams]
  );

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
        const ratings = (playerRatingTracker || {})[p.id] || [];
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

  // Reusable tier-chip strip — used by leagues, stats, and alltime tabs so
  // the user can browse other divisions' tables, current-season stats, and
  // all-time records via the same control.
  //
  // `showAllOption` (All-Time tab only) prepends an "ALL" chip that merges
  // every division's records into one career-wide view instead of showing
  // a single division's book.
  const renderTierChips = ({ showAllOption = false } = {}) => (
    <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
      {showAllOption && (
        <button onClick={() => setAllTimeScope("all")} style={{
          padding: mob ? "7px 9px" : "7px 12px",
          fontSize: mob ? F.micro : F.xs,
          fontFamily: FONT,
          background: allTimeScope === "all" ? `${C.purple}22` : "transparent",
          border: `1px solid ${allTimeScope === "all" ? C.purple : C.bgInput}`,
          color: allTimeScope === "all" ? C.purple : C.textDim,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}>
          ALL
        </button>
      )}
      {visibleTiers.map(t2 => {
        const def = LEAGUE_DEFS[t2];
        const isActive = t2 === displayTier && !(showAllOption && allTimeScope === "all");
        return (
          <button key={t2} onClick={() => { setAllTimeScope("tier"); setSelectedSimTier(t2); }} style={{
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
  );

  // Shared renderer for ranked stat lists (Stats tab + All-Time tab).
  // One implementation = consistent grid, padding, type scale, and empty
  // states across goals / assists / yellow / red / all-time sections.
  // `valueColor` colours the value column. `getRowAccent` gets called per
  // row so callers can flag the player's own team or top-three highlights.
  const renderRankedList = ({
    title, icon, list, valueField, valueColor,
    emptyText = "No data yet",
    getRowAccent,
    onPlayerClickArgs,
  }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: mob ? F.sm : F.md, color: C.gold, marginBottom: 10, letterSpacing: 1 }}>{icon} {title}</div>
      {list.length === 0 ? (
        <div style={{ fontSize: F.xs, color: C.bgInput, padding: 8 }}>{emptyText}</div>
      ) : (
        list.map((p, i) => {
          const accent = getRowAccent ? getRowAccent(p, i) : null;
          const isPlayer = p.isPlayer || p.isPlayerTeam;
          // Top-1 gets a subtle gold tint; player team beats it; explicit
          // accent overrides everything else.
          const rowBg = accent === "gold" || i === 0 ? "rgba(250,204,21,0.06)"
            : isPlayer ? "rgba(74,222,128,0.04)"
            : "transparent";
          const rankColor = i === 0 ? C.gold : i < 3 ? C.textMuted : C.slate;
          return (
            <div key={`${p.name}|${p.teamName}|${i}`} style={{
              display: "grid",
              gridTemplateColumns: mob ? "30px 1fr 1fr 50px" : "35px 1fr 1fr 60px",
              padding: "10px 12px", fontSize: F.xs, gap: 4,
              borderBottom: `1px solid ${C.bgCard}`,
              background: rowBg,
              alignItems: "center",
            }}>
              <span style={{ color: rankColor, fontWeight: i < 3 ? "bold" : "normal" }}>{i + 1}</span>
              <span
                onClick={() => onPlayerClick?.(p.name, p.teamName, ...(onPlayerClickArgs?.(p) || []))}
                style={{
                  color: isPlayer ? C.green : C.text,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  cursor: "pointer",
                  textDecoration: "underline", textDecorationStyle: "dotted",
                  textDecorationColor: isPlayer ? "#4ade8044" : "#e2e8f044",
                  textUnderlineOffset: 3,
                }}
              >
                {displayName(p.name, mob)}
              </span>
              <span
                onClick={() => onTeamClick?.(p.teamName)}
                style={{
                  color: C.textDim, fontSize: mob ? F.micro : F.xs,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  cursor: "pointer",
                  textDecoration: "underline", textDecorationStyle: "dotted",
                  textDecorationColor: "#64748b44", textUnderlineOffset: 3,
                }}
              >
                {p.teamName}
              </span>
              <span style={{ textAlign: "right", color: valueColor, fontWeight: "bold", fontSize: mob ? F.sm : F.md }}>
                {p[valueField]}
              </span>
            </div>
          );
        })
      )}
    </div>
  );

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
        <button onClick={() => { setActiveTab("history"); setViewTeamData(null); }} style={tabStyle("history")}>📜 HISTORY</button>
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
        {/* Legacy "unavailable" notice only applies to the player's own tier
            mid-season migration case. For other selected tiers we just show
            the empty/populated canonical view. */}
        {activeTab === "stats" && isPlayerDisplayTier && !seasonLeagueStatsAvailable && (
          <div style={{ padding: mob ? "21px 14px" : "26px" }}>
            {renderTierChips()}
            <div style={{ textAlign: "center", marginTop: 18 }}>
              <div style={{ fontSize: mob ? F.lg : F.xl, color: C.gold, marginBottom: 14, letterSpacing: 1 }}>📊 LEAGUE STATS</div>
              <div style={{ fontSize: F.md, color: C.textDim, marginBottom: 10, lineHeight: 1.6 }}>
                Stats unavailable for this season.
              </div>
              <div style={{ fontSize: F.sm, color: C.slate, lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>
                This save was loaded from an older version that didn't track player events.
                Full league stats will resume from next season.
              </div>
            </div>
          </div>
        )}
        {activeTab === "stats" && (!isPlayerDisplayTier || seasonLeagueStatsAvailable) && (
          <div style={{ padding: mob ? "20px 14px" : "24px" }}>
            {renderTierChips()}
            <div style={{ marginTop: 18 }}>
              {renderRankedList({
                title: "TOP SCORERS", icon: "⚽",
                list: topScorers, valueField: "goals", valueColor: C.green,
                emptyText: "No goals scored yet",
              })}
              {renderRankedList({
                title: "TOP ASSISTS", icon: "🎯",
                list: topAssists, valueField: "assists", valueColor: "#38bdf8",
                emptyText: "No assists recorded yet",
              })}
              {renderRankedList({
                title: "MOST YELLOW CARDS", icon: "🟨",
                list: topYellows, valueField: "yellows", valueColor: C.amber,
                emptyText: "No yellows issued yet",
              })}
              {renderRankedList({
                title: "MOST RED CARDS", icon: "🟥",
                list: topReds, valueField: "reds", valueColor: C.red,
                emptyText: "No reds issued yet",
              })}
            </div>
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
                        {displayName(p.name, mob)}
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
          // displayTier + isPlayerDisplayTier are derived at the top of the
          // component now so Stats/All-Time can follow chip selection too.
          const isPlayerTier = isPlayerDisplayTier;
          const totalMDs = league.fixtures?.length || 18;
          const leagueDef2 = LEAGUE_DEFS[displayTier];
          const leagueColor2 = leagueDef2?.color || C.textMuted;

          // Tiers that end the season in a knockout — Euro Dynasty's Dynasty
          // Cup and World XI's 5v5 Mini-Tournament both draw their bracket
          // from the top 4 in the standings (see useMatchResult.js).
          const displayMod = getModifier(displayTier);
          const qualifyLabel = displayMod.knockoutAtEnd ? "Dynasty Cup" : displayMod.miniTournament ? "5v5 Mini-Tournament" : null;
          const qualifyCount = qualifyLabel ? 4 : 0;

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
              {renderTierChips()}

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
              <div style={{ fontSize: mob ? F.micro : F.xs, color: C.slate, marginBottom: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {displayTier > 1 && <span><span style={{ color: C.gold }}>■</span> {displayMod.miniTournament ? "5v5 tournament: top 3 promoted" : "Top 3 promoted"}</span>}
                {displayTier < NUM_TIERS && <span><span style={{ color: C.red }}>■</span> Bottom 3 relegated</span>}
                {qualifyCount > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><QualChip color={leagueColor2} /> Top {qualifyCount} qualify for the {qualifyLabel}</span>}
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
                const inQualifyZone = qualifyCount > 0 && pos < qualifyCount;
                const isLastQualifier = inQualifyZone && pos === qualifyCount - 1;
                const gd = row.gf - row.ga;
                return (
                  <div key={row.name} style={{
                    display: "grid", gridTemplateColumns: tableCols,
                    padding: mob ? "13px 10px" : "10px 10px", fontSize: F.sm, gap: 4,
                    borderBottom: isLastQualifier ? `2px dashed ${leagueColor2}` : `1px solid ${C.bgCard}`,
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
                        flex: 1, minWidth: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        textDecoration: row.teamIndex != null ? "underline" : "none",
                        textDecorationColor: row.color || C.slate,
                        textDecorationStyle: "dotted",
                        textUnderlineOffset: 3,
                      }}>
                        {row.name}
                      </span>
                      {inQualifyZone && (
                        <QualChip
                          color={leagueColor2}
                          title={`Currently in a qualifying spot for the ${qualifyLabel}`}
                          style={{ marginLeft: 6 }}
                        />
                      )}
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
          // All-time league records are tier-scoped by default: read the
          // selected tier's slot (via displayTier — chip selection) from
          // allTimeLeagueStatsByTier and merge in that tier's in-progress
          // season blob. No team-name filter — the tier slot itself defines
          // what counts as a Div N record. Promoted/relegated team entries
          // stay where they were earned, regardless of which division
          // they're in now.
          //
          // The "ALL" chip switches to a career-wide view: AI teams get
          // promoted/relegated nearly every season, so a single division's
          // board only shows an AI player's contribution since their team's
          // latest arrival there. mergeStatsAcrossTiers sums a player's
          // record across every division so their full career shows up
          // alongside the per-division books.
          const isAllDivisions = allTimeScope === "all";
          const tierAllTime = isAllDivisions
            ? mergeStatsAcrossTiers(allTimeLeagueStatsByTier || {})
            : (allTimeLeagueStatsByTier?.[displayTier] || null);
          const seasonSource = isAllDivisions
            ? mergeStatsAcrossTiers(seasonLeagueStatsByTier || {})
            : seasonLeagueStats;

          const merged = {};
          const acc = (entry) => {
            const key = entry.key;
            if (!merged[key]) {
              merged[key] = { ...entry, goals: 0, assists: 0, yellows: 0, reds: 0 };
            }
            const m = merged[key];
            m.goals += entry.goals || 0;
            m.assists += entry.assists || 0;
            m.yellows += entry.yellows || 0;
            m.reds += entry.reds || 0;
            // Refresh display fields from the most-recent source.
            if (entry.name) m.name = entry.name;
            if (entry.teamName) m.teamName = entry.teamName;
          };
          Object.values(tierAllTime?.players || {}).forEach(acc);
          Object.values(seasonSource?.players || {}).forEach(acc);

          const rows = Object.values(merged).map(p => ({
            name: p.name, teamName: p.teamName,
            goals: p.goals, assists: p.assists,
            yellows: p.yellows || 0, reds: p.reds || 0,
            isPlayerTeam: p.teamName === teamName && (isAllDivisions || isPlayerDisplayTier),
          }));

          const scorerList = rows.filter(r => r.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 20);
          const assisterList = rows.filter(r => r.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 20);
          const yellowList = rows.filter(r => r.yellows > 0).sort((a, b) => b.yellows - a.yellows).slice(0, 20);
          const redList = rows.filter(r => r.reds > 0).sort((a, b) => b.reds - a.reds).slice(0, 20);
          const scopeSuffix = isAllDivisions ? " — ALL DIVISIONS" : "";

          return (
            <div style={{ padding: mob ? "20px 14px" : "24px" }}>
              {renderTierChips({ showAllOption: true })}
              <div style={{ marginTop: 18 }}>
                {renderRankedList({
                  title: `TOP SCORERS${scopeSuffix}`, icon: "⚽",
                  list: scorerList, valueField: "goals", valueColor: C.green,
                  emptyText: "No goals on record yet",
                })}
                {renderRankedList({
                  title: `TOP ASSISTS${scopeSuffix}`, icon: "🎯",
                  list: assisterList, valueField: "assists", valueColor: "#38bdf8",
                  emptyText: "No assists on record yet",
                })}
                {renderRankedList({
                  title: `MOST YELLOW CARDS${scopeSuffix}`, icon: "🟨",
                  list: yellowList, valueField: "yellows", valueColor: C.amber,
                  emptyText: "No yellows on record yet",
                })}
                {renderRankedList({
                  title: `MOST RED CARDS${scopeSuffix}`, icon: "🟥",
                  list: redList, valueField: "reds", valueColor: C.red,
                  emptyText: "No reds on record yet",
                })}
              </div>
            </div>
          );
        })()}

        {activeTab === "history" && (() => {
          const historySeasons = Object.keys(leagueHistory || {}).map(Number).sort((a, b) => b - a);
          if (historySeasons.length === 0) {
            return (
              <div style={{ padding: mob ? "20px 14px" : "24px", textAlign: "center", fontSize: F.sm, color: C.bgInput }}>
                History begins at the end of your first season.
              </div>
            );
          }
          const activeHistorySeason = historySeasons.includes(selectedHistorySeason) ? selectedHistorySeason : historySeasons[0];
          const historyCols = mob ? "22px 1fr 26px 26px 26px 26px 30px 30px 38px" : "36px 1fr 40px 40px 40px 40px 46px 46px 54px";
          const tierEntry = leagueHistory[activeHistorySeason]?.[displayTier];
          return (
            <div style={{ padding: mob ? "20px 14px" : "24px" }}>
              {/* Season selector */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                {historySeasons.map(sn => {
                  const isActive = sn === activeHistorySeason;
                  return (
                    <button key={sn} onClick={() => setSelectedHistorySeason(sn)} style={{
                      padding: mob ? "7px 9px" : "7px 12px",
                      fontSize: mob ? F.micro : F.xs,
                      fontFamily: FONT,
                      background: isActive ? "rgba(250,204,21,0.13)" : "transparent",
                      border: `1px solid ${isActive ? C.gold : C.bgInput}`,
                      color: isActive ? C.gold : C.textDim,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}>
                      Season {sn}
                    </button>
                  );
                })}
              </div>
              {renderTierChips()}

              {!tierEntry ? (
                <div style={{ textAlign: "center", padding: 28, fontSize: F.sm, color: C.bgInput }}>
                  No data for this division that season.
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: mob ? F.sm : F.md, color: C.gold, marginBottom: 10, letterSpacing: 1 }}>
                    {tierEntry.leagueName} — SEASON {activeHistorySeason}
                  </div>
                  {/* Column headers */}
                  <div style={{ display: "grid", gridTemplateColumns: historyCols, padding: "10px 10px", fontSize: F.xs, color: C.slate, borderBottom: `1px solid ${C.bgInput}`, gap: 4 }}>
                    <span>#</span><span>TEAM</span>
                    <span style={{ textAlign: "center" }}>P</span>
                    <span style={{ textAlign: "center" }}>W</span>
                    <span style={{ textAlign: "center" }}>D</span>
                    <span style={{ textAlign: "center" }}>L</span>
                    <span style={{ textAlign: "center" }}>GF</span>
                    <span style={{ textAlign: "center" }}>GA</span>
                    <span style={{ textAlign: "center" }}>PTS</span>
                  </div>
                  {/* Rows */}
                  {tierEntry.standings.map((row, pos) => {
                    const isChampion = pos === 0;
                    const isPlayerRow = row.name === teamName;
                    return (
                      <div key={`${row.name}|${pos}`} style={{
                        display: "grid", gridTemplateColumns: historyCols,
                        padding: mob ? "13px 10px" : "10px 10px", fontSize: F.sm, gap: 4,
                        borderBottom: `1px solid ${C.bgCard}`,
                        borderLeft: isPlayerRow ? `3px solid ${C.green}` : isChampion ? `3px solid ${C.gold}` : "3px solid transparent",
                        background: isPlayerRow ? "rgba(74,222,128,0.10)" : isChampion ? "rgba(250,204,21,0.06)" : "transparent",
                        alignItems: "center",
                      }}>
                        <span style={{ color: isPlayerRow ? C.green : isChampion ? C.gold : C.textDim, fontSize: F.md }}>{pos + 1}</span>
                        <span style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                          <span style={{
                            color: isPlayerRow ? C.green : C.text, fontSize: mob ? F.xs : F.sm,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                          }}>
                            {row.name}
                          </span>
                          {isChampion && <span style={{ fontSize: F.micro, color: "#facc15", marginLeft: 6, flexShrink: 0 }}>(C)</span>}
                        </span>
                        <span style={{ textAlign: "center", color: isPlayerRow ? C.green : C.textMuted }}>{row.played}</span>
                        <span style={{ textAlign: "center", color: isPlayerRow ? C.green : C.textMuted }}>{row.won}</span>
                        <span style={{ textAlign: "center", color: isPlayerRow ? C.green : C.textMuted }}>{row.drawn}</span>
                        <span style={{ textAlign: "center", color: isPlayerRow ? C.green : C.textMuted }}>{row.lost}</span>
                        <span style={{ textAlign: "center", color: isPlayerRow ? C.green : C.textMuted }}>{row.goalsFor}</span>
                        <span style={{ textAlign: "center", color: isPlayerRow ? C.green : C.textMuted }}>{row.goalsAgainst}</span>
                        <span style={{ textAlign: "center", color: isPlayerRow ? C.green : C.text, fontWeight: "bold", fontSize: mob ? F.sm : F.md }}>{row.points}</span>
                      </div>
                    );
                  })}
                </div>
              )}
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


