import React, { useState } from "react";
import { LEAGUE_DEFS, NUM_TIERS } from "../../data/leagues.js";
import { sortStandings } from "../../utils/league.js";
import { getNatFlag, inferNationality } from "../../utils/player.js";
import { OvrProgressChart } from "../charts/OvrCharts.jsx";
import { F, C, FONT } from "../../data/tokens";

export function ClubLegends({ clubHistory, teamName, playerSeasonStats, playerRatingTracker, league, seasonNumber, leagueTier, squad, ovrHistory, ovrCap = 20 }) {
  const [tab, setTab] = useState("records");
  const h = clubHistory || {};
  const careers = h.playerCareers || {};
  const archivedXI = h.allTimeXI || {};
  const archive = h.seasonArchive || [];
  const totalMatches = (h.totalWins || 0) + (h.totalDraws || 0) + (h.totalLosses || 0);

  // Merge archived career stats with live current-season stats
  const mergedCareers = {};
  Object.entries(careers).forEach(([name, c]) => { mergedCareers[name] = { ...c }; });
  if (playerSeasonStats) {
    Object.entries(playerSeasonStats).forEach(([name, s]) => {
      if (!mergedCareers[name]) mergedCareers[name] = { goals: 0, assists: 0, apps: 0, motm: 0, yellows: 0, reds: 0, seasons: [] };
      mergedCareers[name] = {
        ...mergedCareers[name],
        goals: (mergedCareers[name].goals || 0) + (s.goals || 0),
        assists: (mergedCareers[name].assists || 0) + (s.assists || 0),
        apps: (mergedCareers[name].apps || 0) + (s.apps || 0),
        motm: (mergedCareers[name].motm || 0) + (s.motm || 0),
        yellows: (mergedCareers[name].yellows || 0) + (s.yellows || 0),
        reds: (mergedCareers[name].reds || 0) + (s.reds || 0),
      };
    });
  }

  // Live All-Time XI: merge archived with current season candidates, using best-fit formation
  const ALL_TIME_FORMATIONS = {
    "4-3-3":   [
      { slot: "GK", positions: ["GK"], x: 50, y: 90 },
      { slot: "LB", positions: ["LB"], x: 14, y: 74 },
      { slot: "CB1", positions: ["CB"], x: 36, y: 78 },
      { slot: "CB2", positions: ["CB"], x: 64, y: 78 },
      { slot: "RB", positions: ["RB"], x: 86, y: 74 },
      { slot: "CM1", positions: ["CM"], x: 26, y: 54 },
      { slot: "CM2", positions: ["CM"], x: 74, y: 54 },
      { slot: "AM", positions: ["AM", "CM"], x: 50, y: 44 },
      { slot: "LW", positions: ["LW"], x: 16, y: 22 },
      { slot: "ST", positions: ["ST"], x: 50, y: 14 },
      { slot: "RW", positions: ["RW"], x: 84, y: 22 },
    ],
    "4-4-2":   [
      { slot: "GK", positions: ["GK"], x: 50, y: 90 },
      { slot: "LB", positions: ["LB"], x: 14, y: 74 },
      { slot: "CB1", positions: ["CB"], x: 36, y: 78 },
      { slot: "CB2", positions: ["CB"], x: 64, y: 78 },
      { slot: "RB", positions: ["RB"], x: 86, y: 74 },
      { slot: "LM", positions: ["LW", "CM", "AM"], x: 14, y: 50 },
      { slot: "CM1", positions: ["CM"], x: 38, y: 54 },
      { slot: "CM2", positions: ["CM"], x: 62, y: 54 },
      { slot: "RM", positions: ["RW", "CM", "AM"], x: 86, y: 50 },
      { slot: "ST1", positions: ["ST"], x: 36, y: 18 },
      { slot: "ST2", positions: ["ST"], x: 64, y: 18 },
    ],
    "4-5-1":   [
      { slot: "GK", positions: ["GK"], x: 50, y: 90 },
      { slot: "LB", positions: ["LB"], x: 14, y: 74 },
      { slot: "CB1", positions: ["CB"], x: 36, y: 78 },
      { slot: "CB2", positions: ["CB"], x: 64, y: 78 },
      { slot: "RB", positions: ["RB"], x: 86, y: 74 },
      { slot: "LM", positions: ["LW", "CM", "AM"], x: 14, y: 50 },
      { slot: "CM1", positions: ["CM"], x: 32, y: 54 },
      { slot: "CM2", positions: ["CM"], x: 50, y: 48 },
      { slot: "CM3", positions: ["CM", "AM"], x: 68, y: 54 },
      { slot: "RM", positions: ["RW", "CM", "AM"], x: 86, y: 50 },
      { slot: "ST", positions: ["ST"], x: 50, y: 16 },
    ],
    "3-5-2":   [
      { slot: "GK", positions: ["GK"], x: 50, y: 90 },
      { slot: "CB1", positions: ["CB"], x: 26, y: 76 },
      { slot: "CB2", positions: ["CB"], x: 50, y: 78 },
      { slot: "CB3", positions: ["CB", "RB", "LB"], x: 74, y: 76 },
      { slot: "LWB", positions: ["LB", "LW"], x: 10, y: 56 },
      { slot: "CM1", positions: ["CM"], x: 32, y: 54 },
      { slot: "CM2", positions: ["CM", "AM"], x: 50, y: 46 },
      { slot: "CM3", positions: ["CM"], x: 68, y: 54 },
      { slot: "RWB", positions: ["RB", "RW"], x: 90, y: 56 },
      { slot: "ST1", positions: ["ST"], x: 36, y: 18 },
      { slot: "ST2", positions: ["ST"], x: 64, y: 18 },
    ],
    "3-4-3":   [
      { slot: "GK", positions: ["GK"], x: 50, y: 90 },
      { slot: "CB1", positions: ["CB"], x: 26, y: 76 },
      { slot: "CB2", positions: ["CB"], x: 50, y: 78 },
      { slot: "CB3", positions: ["CB", "RB", "LB"], x: 74, y: 76 },
      { slot: "LM", positions: ["LW", "LB", "CM"], x: 14, y: 50 },
      { slot: "CM1", positions: ["CM"], x: 38, y: 54 },
      { slot: "CM2", positions: ["CM", "AM"], x: 62, y: 54 },
      { slot: "RM", positions: ["RW", "RB", "CM"], x: 86, y: 50 },
      { slot: "LW", positions: ["LW", "ST"], x: 20, y: 20 },
      { slot: "ST", positions: ["ST"], x: 50, y: 16 },
      { slot: "RW", positions: ["RW", "ST"], x: 80, y: 20 },
    ],
    "4-2-3-1": [
      { slot: "GK", positions: ["GK"], x: 50, y: 90 },
      { slot: "LB", positions: ["LB"], x: 14, y: 74 },
      { slot: "CB1", positions: ["CB"], x: 36, y: 78 },
      { slot: "CB2", positions: ["CB"], x: 64, y: 78 },
      { slot: "RB", positions: ["RB"], x: 86, y: 74 },
      { slot: "DM1", positions: ["CM"], x: 36, y: 58 },
      { slot: "DM2", positions: ["CM"], x: 64, y: 58 },
      { slot: "LAM", positions: ["LW", "AM", "CM"], x: 20, y: 38 },
      { slot: "CAM", positions: ["AM", "CM"], x: 50, y: 34 },
      { slot: "RAM", positions: ["RW", "AM", "CM"], x: 80, y: 38 },
      { slot: "ST", positions: ["ST"], x: 50, y: 16 },
    ],
  };

  // Pick the best formation based on available candidates
  function pickBestFormation(allCandidates, archivedEntries) {
    // Combine archived + live candidates for formation scoring
    const pool = [...allCandidates];
    Object.entries(archivedEntries).forEach(([slot, v]) => {
      if (v?.name && v.position) pool.push({ name: v.name, position: v.position, avgRating: v.avgRating });
    });
    
    let bestFormation = "4-3-3";
    let bestScore = -1;
    
    for (const [fname, slots] of Object.entries(ALL_TIME_FORMATIONS)) {
      let score = 0;
      const used = new Set();
      for (const s of slots) {
        const eligible = pool.filter(c => s.positions.includes(c.position) && !used.has(c.name));
        if (eligible.length > 0) {
          const best = eligible.sort((a, b) => b.avgRating - a.avgRating)[0];
          score += best.avgRating;
          used.add(best.name);
        }
      }
      if (score > bestScore) { bestScore = score; bestFormation = fname; }
    }
    return bestFormation;
  }

  const allTimeXI = {};
  Object.entries(archivedXI).forEach(([slot, v]) => { if (v) allTimeXI[slot] = { ...v }; });

  // Collect live candidates
  let liveCandidates = [];
  if (playerSeasonStats && playerRatingTracker && squad) {
    liveCandidates = Object.entries(playerSeasonStats).map(([name, s]) => {
      const ratings = playerRatingTracker[name] || [];
      const avgRating = ratings.length >= 3 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;
      const p = squad.find(pl => pl.name === name);
      const position = p?.position || s.position || "?";
      const nationality = p?.nationality || s.nationality;
      return { name, position, avgRating, apps: s.apps || 0, season: seasonNumber || 1, nationality };
    }).filter(c => c.avgRating > 0 && c.apps >= 3);
  }

  // Also gather archived candidates from career history for formation picking
  const archivedCandidates = [];
  Object.entries(archivedXI).forEach(([slot, v]) => {
    if (v) archivedCandidates.push({ name: v.name, position: v.position, avgRating: v.avgRating });
  });

  const chosenFormation = pickBestFormation([...liveCandidates, ...archivedCandidates], {});
  const formationSlots = ALL_TIME_FORMATIONS[chosenFormation];

  // Rebuild allTimeXI using new formation slots
  // First, migrate any archived entries that fit the new slots
  const migratedXI = {};
  const usedArchived = new Set();
  formationSlots.forEach(({ slot, positions }) => {
    // Check if there's an archived entry for this exact slot
    if (archivedXI[slot] && positions.includes(archivedXI[slot].position)) {
      migratedXI[slot] = { ...archivedXI[slot] };
      usedArchived.add(archivedXI[slot].name);
    }
  });
  // For unfilled slots, try to find archived players that fit by position
  formationSlots.forEach(({ slot, positions }) => {
    if (migratedXI[slot]) return;
    const archivedByPos = Object.values(archivedXI).filter(v => v && positions.includes(v.position) && !usedArchived.has(v.name));
    if (archivedByPos.length > 0) {
      const best = archivedByPos.sort((a, b) => b.avgRating - a.avgRating)[0];
      migratedXI[slot] = { ...best };
      usedArchived.add(best.name);
    }
  });

  // Now layer live candidates on top
  const finalXI = { ...migratedXI };
  if (liveCandidates.length > 0) {
    const usedNames = new Set();
    Object.values(finalXI).forEach(v => { if (v?.name) usedNames.add(v.name); });
    formationSlots.forEach(({ slot, positions }) => {
      const eligible = liveCandidates.filter(c => positions.includes(c.position) && !usedNames.has(c.name));
      if (eligible.length > 0) {
        const best = eligible.sort((a, b) => b.avgRating - a.avgRating)[0];
        const current = finalXI[slot];
        if (!current || best.avgRating > current.avgRating) {
          if (current?.name) usedNames.delete(current.name);
          finalXI[slot] = { name: best.name, position: best.position, season: best.season, avgRating: best.avgRating, apps: best.apps, live: true, nationality: best.nationality };
          usedNames.add(best.name);
        }
      }
    });
  }

  // Live current season entry for Seasons tab
  let currentSeasonEntry = null;
  if (league?.table) {
    const sorted = sortStandings(league.table);
    const playerRow = sorted.find(r => league.teams[r.teamIndex]?.isPlayer);
    const position = playerRow ? sorted.indexOf(playerRow) + 1 : 0;
    let topScorerName = null;
    let topGoals = 0;
    if (playerSeasonStats) {
      Object.entries(playerSeasonStats).forEach(([name, s]) => {
        if ((s.goals || 0) > topGoals) { topGoals = s.goals; topScorerName = name; }
      });
    }
    currentSeasonEntry = {
      season: seasonNumber || 1,
      tier: leagueTier || NUM_TIERS,
      leagueName: league.leagueName || "Unknown",
      position,
      points: playerRow?.points || 0,
      played: playerRow?.played || 0,
      topScorer: topScorerName ? `${topScorerName} (${topGoals})` : "N/A",
      result: "in_progress",
    };
  }

  const careerEntries = Object.entries(mergedCareers);
  const topScorers = [...careerEntries].sort((a, b) => b[1].goals - a[1].goals).slice(0, 8);
  const topAssistsLegends = [...careerEntries].sort((a, b) => (b[1].assists || 0) - (a[1].assists || 0)).slice(0, 8);
  const topApps = [...careerEntries].sort((a, b) => b[1].apps - a[1].apps).slice(0, 8);
  const topMotm = [...careerEntries].sort((a, b) => b[1].motm - a[1].motm).slice(0, 8);

  const tierName = (tier) => LEAGUE_DEFS[tier]?.shortName || `T${tier}`;
  const moveEmoji = (r) => r === "promoted" ? "⬆️" : r === "relegated" ? "⬇️" : r === "in_progress" ? "🔵" : "➡️";

  const tabs = [
    { id: "records", label: "RECORDS" },
    { id: "players", label: "LEGENDS" },
    { id: "xi", label: "ALL-TIME XI" },
    { id: "progress", label: "PROGRESS" },
    { id: "seasons", label: "SEASONS" },
  ];

  const mob = window.innerWidth <= 768;

  return (
    <div style={{ fontFamily: FONT }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: mob ? "10px 13px" : "10px 18px", fontSize: mob ? F.xs : F.sm, letterSpacing: 1,
              fontFamily: FONT, cursor: "pointer",
              background: tab === t.id ? "rgba(192,132,252,0.1)" : "rgba(30,41,59,0.3)",
              border: tab === t.id ? `1px solid ${C.purple}` : `1px solid ${C.bgCard}`,
              color: tab === t.id ? C.purple : C.textDim,
              borderRadius: 20, flex: mob ? "1 1 auto" : undefined, textAlign: "center",
            }}>{t.label}</button>
          ))}
        </div>

      <div style={{ background: C.bg, border: `1px solid ${C.bgCard}` }}>
        {/* RECORDS TAB */}
        {tab === "records" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: mob ? "18px 14px" : "24px" }}>
            <div style={{ fontSize: F.xs, color: C.gold, letterSpacing: 2, marginBottom: 2 }}>🏟️ MATCH RECORD</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[
                { label: "WINS", value: h.totalWins || 0, color: C.green },
                { label: "DRAWS", value: h.totalDraws || 0, color: C.amber },
                { label: "LOSSES", value: h.totalLosses || 0, color: C.red },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(30,41,59,0.3)", border: `1px solid ${C.bgCard}`, padding: "24px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: F.h2, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: F.xs, color: C.textDim, marginTop: 8, letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "GOALS SCORED", value: h.totalGoalsFor || 0 },
                { label: "GOALS CONCEDED", value: h.totalGoalsConceded || 0 },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(30,41,59,0.3)", border: `1px solid ${C.bgCard}`, padding: "20px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: F.xl, color: C.text }}>{s.value}</div>
                  <div style={{ fontSize: F.xs, color: C.textDim, marginTop: 8, letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: F.xs, color: C.gold, letterSpacing: 2, marginTop: 10, marginBottom: 2 }}>🏅 RECORDS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {(() => {
                // Compute live best season points including current season
                const liveBestPoints = Math.max(h.bestSeasonPoints || 0, currentSeasonEntry?.points || 0);

                return [
                  { label: "Best Win Streak", value: `${h.bestWinStreak || 0} matches` },
                  { label: "Best Unbeaten Run", value: `${h.bestUnbeatenRun || 0} matches` },
                  { label: "Worst Loss Streak", value: `${h.worstLossStreak || 0} matches` },
                  { label: "Biggest Win", value: h.biggestWin ? `${h.biggestWin.score} vs ${h.biggestWin.opponent} (S${h.biggestWin.season})` : "—" },
                  { label: "Worst Defeat", value: h.worstDefeat ? `${h.worstDefeat.score} vs ${h.worstDefeat.opponent} (S${h.worstDefeat.season})` : "—" },
                  { label: "Best Season Finish", value: h.bestSeasonFinish ? `${h.bestSeasonFinish.position}${["st","nd","rd"][h.bestSeasonFinish.position-1]||"th"} in ${h.bestSeasonFinish.leagueName || tierName(h.bestSeasonFinish.tier)} (S${h.bestSeasonFinish.season})` : "—" },
                  { label: "Best Season Points", value: liveBestPoints },
                ].map(r => (
                <div key={r.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 13px", background: "rgba(30,41,59,0.15)", borderLeft: `2px solid ${C.bgCard}`,
                }}>
                  <span style={{ fontSize: F.xs, color: C.textMuted }}>{r.label}</span>
                  <span style={{ fontSize: F.xs, color: C.text }}>{r.value}</span>
                </div>
              ));
              })()}
            </div>
          </div>
        )}

        {/* LEGENDS TAB */}
        {tab === "players" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: mob ? "18px 14px" : "24px" }}>
            {[
              { title: "⚽ TOP SCORERS", data: topScorers, valKey: "goals", suffix: " goals" },
              { title: "🎯 TOP ASSISTERS", data: topAssistsLegends, valKey: "assists", suffix: " assists" },
              { title: "📋 MOST APPEARANCES", data: topApps, valKey: "apps", suffix: " apps" },
              { title: "⭐ MOST MOTM AWARDS", data: topMotm, valKey: "motm", suffix: " awards" },
            ].map(section => (
              <div key={section.title}>
                <div style={{ fontSize: F.xs, color: C.gold, letterSpacing: 2, marginBottom: 4 }}>{section.title}</div>
                {section.data.length === 0 ? (
                  <div style={{ fontSize: F.xs, color: C.slate, padding: 8 }}>No data yet — complete a season</div>
                ) : section.data.map(([name, stats], i) => (
                  <div key={name} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "7px 13px",
                    background: i === 0 ? "rgba(250,204,21,0.06)" : "transparent",
                    borderLeft: i === 0 ? `2px solid ${C.gold}` : "2px solid transparent",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: F.xs, color: i === 0 ? C.gold : C.slate, width: 20 }}>{i + 1}.</span>
                      <span style={{ fontSize: F.xs, color: i === 0 ? C.gold : C.text }}>{name}</span>
                    </div>
                    <span style={{ fontSize: F.sm, color: i === 0 ? C.gold : C.textMuted }}>
                      {stats[section.valKey]}{section.suffix}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ALL-TIME XI TAB */}
        {tab === "xi" && (
          <div style={{ padding: mob ? "18px 14px" : "24px" }}>
            <div style={{ fontSize: F.sm, color: C.gold, letterSpacing: 2, marginBottom: 4, textAlign: "center" }}>⭐ ALL-TIME BEST XI</div>
            <div style={{ fontSize: F.xs, color: C.slate, textAlign: "center", marginBottom: 12 }}>Best single-season avg rating per position (min 5 apps) · {chosenFormation}</div>

            {/* Formation visual — full width */}
            <div style={{ position: "relative", width: "100%", paddingBottom: "130%", margin: "0 auto" }}>
              {/* Pitch background */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(180deg, #0d3320 0%, #0a2818 50%, #0d3320 100%)",
                border: "2px solid rgba(74,222,128,0.2)",
                borderRadius: 4,
                overflow: "hidden",
              }}>
                {/* Center circle */}
                <div style={{
                  position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                  width: 80, height: 80, border: "1px solid rgba(74,222,128,0.12)", borderRadius: "50%",
                }} />
                {/* Halfway line */}
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(74,222,128,0.12)" }} />
                {/* Penalty areas */}
                <div style={{
                  position: "absolute", bottom: 0, left: "18%", right: "18%", height: "16%",
                  border: "1px solid rgba(74,222,128,0.12)", borderBottom: "none",
                }} />
                <div style={{
                  position: "absolute", top: 0, left: "18%", right: "18%", height: "16%",
                  border: "1px solid rgba(74,222,128,0.12)", borderTop: "none",
                }} />
              </div>

              {/* Player positions — dynamic formation */}
              {formationSlots.map(({ slot, x, y }) => {
                const player = finalXI[slot];
                return (
                  <div key={slot} style={{
                    position: "absolute",
                    left: `${x}%`, top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    width: 100,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: player ? "linear-gradient(135deg, #facc15, #f59e0b)" : "rgba(30,41,59,0.5)",
                      border: player ? "2px solid #fde68a" : `1px dashed ${C.slate}`,
                      margin: "0 auto 3px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: F.xs, color: player ? "#1a1a2e" : C.textDim, fontWeight: "bold",
                      boxShadow: player ? "0 0 12px rgba(250,204,21,0.3)" : "none",
                    }}>
                      {player ? player.position : slot.replace(/[0-9]/g, "")}
                    </div>
                    {player ? (
                      <>
                        <div style={{
                          fontSize: F.xs, color: C.text, whiteSpace: "nowrap",
                          overflow: "hidden", textOverflow: "ellipsis",
                          background: "rgba(0,0,0,0.6)", padding: "3px 7px", borderRadius: 2,
                          display: "inline-block",
                        }}>
                          <span style={{ fontSize: F.sm, marginRight: 2 }}>{getNatFlag(player.nationality || inferNationality(player.name))}</span>
                          {player.name}
                        </div>
                        <div style={{ fontSize: F.xs, color: C.gold, marginTop: 2 }}>
                          ★ {player.avgRating.toFixed(1)} · S{player.season}
                          {player.live && <span style={{ color: C.blue, marginLeft: 2 }}>●</span>}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: F.xs, color: C.slate, marginTop: 1 }}>TBD</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SEASONS TAB */}
        {tab === "progress" && (
          <div style={{ padding: mob ? "18px 14px" : "24px" }}>
            <OvrProgressChart ovrHistory={ovrHistory || []} squad={squad || []} ovrCap={ovrCap} />
          </div>
        )}

        {tab === "seasons" && (
          <div style={{ padding: mob ? "18px 14px" : "24px" }}>
            <div style={{ fontSize: F.xs, color: C.gold, letterSpacing: 2, marginBottom: 8 }}>📅 SEASON HISTORY</div>
            {archive.length === 0 && !currentSeasonEntry ? (
              <div style={{ fontSize: F.xs, color: C.slate, padding: 12 }}>No completed seasons yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Current season first */}
                {currentSeasonEntry && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 13px",
                    background: "rgba(96,165,250,0.06)",
                    borderLeft: `2px solid ${C.blue}`,
                  }}>
                    <div style={{ fontSize: F.sm, color: C.blue, width: 30 }}>S{currentSeasonEntry.season}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: F.xs, color: C.text }}>
                        🔵 {currentSeasonEntry.position}{["st","nd","rd"][currentSeasonEntry.position-1]||"th"} — {currentSeasonEntry.leagueName}
                      </div>
                      <div style={{ fontSize: F.xs, color: C.blue, marginTop: 2 }}>
                        {currentSeasonEntry.points} pts ({currentSeasonEntry.played || 0} played) · Top scorer: {currentSeasonEntry.topScorer}
                      </div>
                    </div>
                    <div style={{ fontSize: F.xs, color: C.blue, letterSpacing: 1 }}>LIVE</div>
                  </div>
                )}
                {/* Archived seasons */}
                {[...archive].reverse().map((s, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 13px",
                    background: s.position === 1 ? "rgba(250,204,21,0.06)" : "rgba(30,41,59,0.2)",
                    borderLeft: s.position === 1 ? `2px solid ${C.gold}` : s.result === "relegated" ? `2px solid ${C.red}` : `2px solid ${C.bgCard}`,
                  }}>
                    <div style={{ fontSize: F.sm, color: C.slate, width: 30 }}>S{s.season}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: F.xs, color: C.text }}>
                        {moveEmoji(s.result)} {s.position}{typeof s.position === "number" ? (["st","nd","rd"][s.position-1]||"th") : "th"} — {s.leagueName}
                      </div>
                      <div style={{ fontSize: F.xs, color: C.textDim, marginTop: 2 }}>
                        {s.points} pts · Top scorer: {s.topScorer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ==================== LEAGUE PAGE (FULL PAGE WITH TABS) ====================

