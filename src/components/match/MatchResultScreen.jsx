import React, { useState, useEffect, useRef } from "react";
import { TEAM_TRAITS } from "../../data/leagues.js";
import { getPosColor } from "../../utils/calc.js";
import { SFX } from "../../utils/sfx.js";
import { AITeamPanel } from "../league/AITeamPanel.jsx";
import { F, C, FONT, Z } from "../../data/tokens";

export function MatchResultScreen({ result, league, onDone, initialSpeed, onSpeedChange, competitionLabel, matchDetail, instantMatch, isOnHoliday, onPlayerClick, clubRelationships, transferFocus, onSetFocus, onRemoveFocus, onReplaceFocus, ovrCap = 20 }) {
  const [visible, setVisible] = useState(false);
  const [minute, setMinute] = useState(instantMatch ? 90 : 0);
  const isHighlights = matchDetail === "highlights";
  const [speed, setSpeed] = useState(isHighlights ? 2 : (initialSpeed || 1));
  const [finished, setFinished] = useState(instantMatch);
  const wasAlwaysFast = React.useRef(initialSpeed === 2 || isHighlights || instantMatch);
  const wasAlwaysNormal = React.useRef(initialSpeed === 1 && !isHighlights && !instantMatch);
  const [showRatings, setShowRatings] = useState(false);

  // Auto-close result screen when on holiday
  // Use ref for onDone to avoid effect resetting on every App.jsx re-render
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });
  useEffect(() => {
    if (isOnHoliday && finished) {
      const timer = setTimeout(() => onDoneRef.current(wasAlwaysFast.current, wasAlwaysNormal.current), 100);
      return () => clearTimeout(timer);
    }
  }, [isOnHoliday, finished]);
  const [flashEvent, setFlashEvent] = useState(null);
  const [shownEvents, setShownEvents] = useState([]);
  const [currentHomeGoals, setCurrentHomeGoals] = useState(0);
  const [currentAwayGoals, setCurrentAwayGoals] = useState(0);
  const eventsRef = React.useRef(result.events || []);
  const processedRef = React.useRef(new Set());
  const tickerRef = React.useRef(null);
  const mob = window.innerWidth <= 768;
  const [viewingTeam, setViewingTeam] = useState(null); // { team, tableRow, matchGoals }

  // Penalty shootout state
  const [penPhase, setPenPhase] = useState(null); // null | "shooting" | "done"
  const [penKickIdx, setPenKickIdx] = useState(0);
  const [penHomeScore, setPenHomeScore] = useState(0);
  const [penAwayScore, setPenAwayScore] = useState(0);
  const penalties = result.penalties || null;

  const homeTeam = league.teams[result.home];
  const awayTeam = league.teams[result.away];

  useEffect(() => {
    setTimeout(() => setVisible(true), instantMatch ? 10 : 50);
    if (!isOnHoliday) SFX.whistle(); // Disable SFX during holiday mode

    // If instant match, process all events immediately
    if (instantMatch) {
      const events = eventsRef.current;
      let homeGoals = 0;
      let awayGoals = 0;
      events.forEach(evt => {
        processedRef.current.add(evt);
        if (evt.type === "goal") {
          if (evt.side === "home") homeGoals++;
          else awayGoals++;
        }
      });
      setShownEvents(events);
      setCurrentHomeGoals(homeGoals);
      setCurrentAwayGoals(awayGoals);

      // Handle penalties if present
      if (penalties) {
        setPenPhase("done");
        setPenKickIdx(penalties.kicks.length);
        setPenHomeScore(penalties.homeScore);
        setPenAwayScore(penalties.awayScore);
      }
    }
  }, [instantMatch]);

  // Main ticker loop
  useEffect(() => {
    if (instantMatch) return; // Skip ticker in instant mode
    if (finished) {
      // If cup match drew, start penalty phase
      if (penalties && !penPhase) {
        setTimeout(() => setPenPhase("shooting"), 800);
      }
      return;
    }
    const interval = isHighlights ? 150 : speed === 1 ? 1000 : 400;
    tickerRef.current = setInterval(() => {
      setMinute(prev => {
        const next = prev + 1;
        if (next > 90) {
          clearInterval(tickerRef.current);
          setFinished(true);
          return 90;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(tickerRef.current);
  }, [speed, finished, instantMatch]);

  // Process events as minutes tick
  useEffect(() => {
    if (instantMatch) return; // Already processed all events in initial useEffect
    const events = eventsRef.current;
    for (const evt of events) {
      if (evt.minute <= minute && !processedRef.current.has(evt)) {
        processedRef.current.add(evt);
        setShownEvents(prev => [...prev, evt]);

        if (evt.type === "goal") {
          if (evt.side === "home") setCurrentHomeGoals(g => g + 1);
          else setCurrentAwayGoals(g => g + 1);
          const isPlayerGoal = (evt.side === "home" && homeTeam.isPlayer) || (evt.side === "away" && awayTeam.isPlayer);
          if (isPlayerGoal) SFX.goal(); else SFX.noGains();
        }

        if (evt.flash) {
          setFlashEvent(evt);
          setTimeout(() => setFlashEvent(null), 2500);
        }
      }
    }
  }, [minute, instantMatch]);

  // Penalty shootout ticker
  useEffect(() => {
    if (instantMatch) return; // Already processed penalties in initial useEffect
    if (penPhase !== "shooting" || !penalties) return;
    const kickDelay = isHighlights ? 300 : speed === 2 ? 600 : 1200;
    const timer = setInterval(() => {
      setPenKickIdx(prev => {
        const next = prev + 1;
        if (next > penalties.kicks.length) {
          clearInterval(timer);
          setPenPhase("done");
          setPenHomeScore(penalties.homeScore);
          setPenAwayScore(penalties.awayScore);
          SFX.whistle();
          return prev;
        }
        // Process this kick
        const kick = penalties.kicks[next - 1];
        if (kick) {
          if (kick.scored) {
            if (kick.side === "home") setPenHomeScore(s => s + 1);
            else setPenAwayScore(s => s + 1);
            const isPlayerKick = (kick.side === "home" && homeTeam.isPlayer) || (kick.side === "away" && awayTeam.isPlayer);
            if (isPlayerKick) SFX.goal(); else SFX.noGains();
          }
        }
        return next;
      });
    }, kickDelay);
    return () => clearInterval(timer);
  }, [penPhase, speed, instantMatch]);

  const handleDone = () => {
    setVisible(false);
    setTimeout(() => { try { onDone(wasAlwaysFast.current, wasAlwaysNormal.current); } catch(e) { console.error("MatchResult onDone error:", e); } }, 400);
  };

  const playerIsHome = homeTeam.isPlayer;
  const playerGoals = playerIsHome ? currentHomeGoals : currentAwayGoals;
  const opponentGoals = playerIsHome ? currentAwayGoals : currentHomeGoals;
  const playerWon = finished && playerGoals > opponentGoals;
  const drawn = finished && playerGoals === opponentGoals;

  // Penalty outcome overrides
  const penDecided = penPhase === "done" && penalties;
  const penPlayerWon = penDecided && ((playerIsHome && penalties.winner === "home") || (!playerIsHome && penalties.winner === "away"));
  const penPlayerLost = penDecided && !penPlayerWon;

  const effectiveWin = playerWon || penPlayerWon;
  const effectiveLoss = (!playerWon && !drawn) || penPlayerLost;
  const resultColor = !finished ? C.textMuted : effectiveWin ? C.green : (drawn && !penDecided) ? C.amber : effectiveLoss ? C.red : C.amber;
  const resultText = !finished ? "LIVE"
    : penDecided ? (penPlayerWon ? "WIN (PENS)" : "LOSS (PENS)")
    : (penalties && penPhase === "shooting") ? "PENALTIES"
    : playerWon ? "WIN" : drawn ? "DRAW" : "LOSS";

  // In highlights mode, only show key events in the ticker
  const HIGHLIGHT_TYPES = new Set(["goal", "card", "red_card", "sub", "motm", "halftime", "fulltime"]);
  const displayEvents = isHighlights
    ? shownEvents.filter(e => HIGHLIGHT_TYPES.has(e.type) || e.flash)
    : shownEvents;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: Z.panel,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.85)",
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? "auto" : "none",
      transition: "opacity 0.4s ease",
      fontFamily: FONT,
    }}>
      <div style={{
        background: "linear-gradient(170deg, #1a1a2e 0%, #0d0d1f 60%, #1a1a2e 100%)",
        border: `3px solid ${resultColor}`,
        padding: mob ? "18px 14px" : "28px 32px",
        maxWidth: 621, width: mob ? "96%" : "92%",
        height: mob ? "70vh" : "55vh",
        display: "flex", flexDirection: "column",
        boxShadow: `0 0 50px ${resultColor}33, inset 0 0 80px rgba(0,0,0,0.6)`,
        transform: visible ? "scale(1)" : "scale(0.8)",
        transition: "transform 0.4s ease, border-color 0.5s ease",
        overflow: "hidden",
      }}>
        {/* Scoreboard — fixed height */}
        <div style={{ textAlign: "center", marginBottom: 4, flexShrink: 0 }}>
          {/* Competition label */}
          {competitionLabel && (
            <div style={{ fontSize: F.sm, color: C.gold, letterSpacing: 2, marginBottom: 9 }}>
              🏆 {competitionLabel}
            </div>
          )}

          {/* Clock */}
          <div style={{
            fontSize: F.lg, letterSpacing: 2, marginBottom: 14,
            color: finished ? (penPhase === "shooting" ? C.gold : C.slate) : C.green,
          }}>
            {penPhase === "shooting" ? (
              <span style={{ animation: "pulse 1s ease infinite" }}>🥅 PENALTY SHOOTOUT</span>
            ) : penPhase === "done" ? (
              "⚽ FULL TIME (PENS)"
            ) : finished ? "⚽ FULL TIME" : (
              <span style={{ animation: "pulse 1s ease infinite" }}>
                ⏱ {minute}'
              </span>
            )}
          </div>

          {/* Score */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18, marginBottom: 7 }}>
            <div style={{ textAlign: "right", flex: 1 }}>
              <div
                onClick={() => {
                  if (homeTeam.isPlayer || !homeTeam.squad) return;
                  const side = "home";
                  const mg = {};
                  (result.scorers || []).filter(s => s.side === side).forEach(s => { mg[s.name] = (mg[s.name] || 0) + 1; });
                  const tableRow = league.table?.find(r => r.teamIndex === result.home);
                  setViewingTeam({ team: homeTeam, tableRow: tableRow ? { played: tableRow.played, won: tableRow.won, drawn: tableRow.drawn, lost: tableRow.lost, goalsFor: tableRow.goalsFor, goalsAgainst: tableRow.goalsAgainst, points: tableRow.points } : null, matchGoals: Object.keys(mg).length > 0 ? mg : null });
                }}
                style={{
                  fontSize: F.lg, color: homeTeam.isPlayer ? C.green : C.text, marginBottom: 2,
                  cursor: !homeTeam.isPlayer && homeTeam.squad ? "pointer" : "default",
                  textDecoration: !homeTeam.isPlayer && homeTeam.squad ? "underline" : "none",
                  textDecorationColor: homeTeam.color || C.slate,
                  textDecorationStyle: "dotted",
                }}
              >{homeTeam.name}</div>
              {homeTeam.trait && TEAM_TRAITS[homeTeam.trait] && (
                <div style={{ fontSize: F.xs, color: C.textDim }}>{TEAM_TRAITS[homeTeam.trait].label}</div>
              )}
            </div>
            <div style={{
              fontSize: F.hero, fontWeight: "bold", color: C.text,
              textShadow: "0 0 15px rgba(226,232,240,0.3)",
              minWidth: 104, textAlign: "center",
              transition: "all 0.3s ease",
            }}>
              {currentHomeGoals} - {currentAwayGoals}
            </div>
            <div style={{ textAlign: "left", flex: 1 }}>
              <div
                onClick={() => {
                  if (awayTeam.isPlayer || !awayTeam.squad) return;
                  const side = "away";
                  const mg = {};
                  (result.scorers || []).filter(s => s.side === side).forEach(s => { mg[s.name] = (mg[s.name] || 0) + 1; });
                  const tableRow = league.table?.find(r => r.teamIndex === result.away);
                  setViewingTeam({ team: awayTeam, tableRow: tableRow ? { played: tableRow.played, won: tableRow.won, drawn: tableRow.drawn, lost: tableRow.lost, goalsFor: tableRow.goalsFor, goalsAgainst: tableRow.goalsAgainst, points: tableRow.points } : null, matchGoals: Object.keys(mg).length > 0 ? mg : null });
                }}
                style={{
                  fontSize: F.lg, color: awayTeam.isPlayer ? C.green : C.text, marginBottom: 2,
                  cursor: !awayTeam.isPlayer && awayTeam.squad ? "pointer" : "default",
                  textDecoration: !awayTeam.isPlayer && awayTeam.squad ? "underline" : "none",
                  textDecorationColor: awayTeam.color || C.slate,
                  textDecorationStyle: "dotted",
                }}
              >{awayTeam.name}</div>
              {awayTeam.trait && TEAM_TRAITS[awayTeam.trait] && (
                <div style={{ fontSize: F.xs, color: C.textDim }}>{TEAM_TRAITS[awayTeam.trait].label}</div>
              )}
            </div>
          </div>

          {/* Penalty score line */}
          {penPhase && (
            <div style={{
              fontSize: F.xl, color: C.gold, marginBottom: 5, letterSpacing: 2,
              animation: penPhase === "shooting" ? "pulse 1.5s ease infinite" : "none",
            }}>
              PENS: {penHomeScore} - {penAwayScore}
            </div>
          )}

          {/* Result badge */}
          <div style={{
            fontSize: F.xl, color: resultColor, fontWeight: "bold",
            textShadow: `0 0 10px ${resultColor}88`,
            letterSpacing: 3, marginBottom: 4,
            transition: "color 0.5s ease",
          }}>
            {resultText}
          </div>
        </div>

        {/* Speed controls — fixed slot */}
        <div style={{ display: "flex", justifyContent: "center", gap: 9, marginBottom: isHighlights ? 5 : 14, minHeight: isHighlights ? 0 : 32, flexShrink: 0 }}>
          {!finished && isHighlights && (
            <div style={{ fontSize: F.xs, color: C.gold, padding: "7px 15px", border: `1px solid ${C.gold}44`, background: "rgba(250,204,21,0.06)", letterSpacing: 1 }}>
              📺 HIGHLIGHTS
            </div>
          )}
          {!finished && !isHighlights && (
            <>
              <button onClick={() => { setSpeed(1); onSpeedChange?.(1); wasAlwaysFast.current = false; }} style={{
                padding: "8px 18px", fontSize: F.sm,
                background: speed === 1 ? "rgba(74,222,128,0.15)" : "transparent",
                border: speed === 1 ? `1px solid ${C.green}` : `1px solid ${C.bgInput}`,
                color: speed === 1 ? C.green : C.slate,
                fontFamily: FONT, cursor: "pointer",
              }}>▶ SLOW</button>
              <button onClick={() => { setSpeed(2); onSpeedChange?.(2); wasAlwaysNormal.current = false; }} style={{
                padding: "8px 18px", fontSize: F.sm,
                background: speed === 2 ? "rgba(74,222,128,0.15)" : "transparent",
                border: speed === 2 ? `1px solid ${C.green}` : `1px solid ${C.bgInput}`,
                color: speed === 2 ? C.green : C.slate,
                fontFamily: FONT, cursor: "pointer",
              }}>▶▶ FAST</button>
            </>
          )}
        </div>

        {/* Flash event — fixed height reserved slot (hidden in highlights mode) */}
        {!isHighlights && (
        <div style={{ minHeight: 58, marginBottom: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {flashEvent ? (
            <div style={{
              width: "100%",
              padding: "16px 23px",
              background: `${flashEvent.flashColor}15`,
              border: `2px solid ${flashEvent.flashColor}`,
              textAlign: "center",
              animation: "pulse 0.5s ease 3",
            }}>
              <div style={{ fontSize: F.lg, color: flashEvent.flashColor, lineHeight: 1.6 }}>
                {flashEvent.text}
              </div>
            </div>
          ) : (
            <div style={{
              width: "100%", padding: "16px 23px",
              border: `1px solid ${C.bgCard}`,
              textAlign: "center",
            }}>
              <div style={{ fontSize: F.sm, color: C.bgCard }}>—</div>
            </div>
          )}
        </div>
        )}

        {/* Event ticker — fills remaining space */}
        <div style={{
          flex: 1, overflowY: "auto",
          minHeight: 0,
          marginBottom: 14,
          border: `1px solid ${C.bgCard}`,
          background: "rgba(15,15,35,0.6)",
        }} ref={el => { if (el) el.scrollTop = el.scrollHeight; }}>
          {displayEvents.map((evt, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, padding: "8px 15px",
              borderBottom: "1px solid rgba(30,41,59,0.4)",
              fontSize: F.sm,
              color: evt.type === "goal" ? evt.flashColor :
                     evt.type === "motm" ? C.blue :
                     evt.type === "red_card" ? C.red :
                     evt.type === "halftime" || evt.type === "fulltime" ? C.textMuted :
                     evt.type === "card" ? C.amber :
                     evt.flash ? C.text : C.slate,
              background: evt.type === "goal" ? `${evt.flashColor}08` :
                          evt.type === "motm" ? "rgba(96,165,250,0.06)" :
                          evt.type === "red_card" ? "rgba(239,68,68,0.06)" : "transparent",
              fontWeight: evt.type === "goal" || evt.type === "motm" || evt.type === "red_card" ? "bold" : "normal",
            }}>
              <span style={{ color: C.bgInput, minWidth: 36 }}>{evt.minute}'</span>
              <span>{evt.text}</span>
            </div>
          ))}
          {displayEvents.length === 0 && (
            <div style={{ padding: 16, textAlign: "center", color: C.bgInput, fontSize: F.xs }}>
              Waiting for kick off...
            </div>
          )}
          {/* Penalty kicks in the ticker */}
          {penPhase && penalties && penalties.kicks.slice(0, penKickIdx).map((kick, i) => (
            <div key={`pen-${i}`} style={{
              padding: "8px 16px", borderBottom: "1px solid #1a1a2e",
              display: "flex", gap: 10, fontSize: F.xs,
              background: kick.suddenDeath ? "rgba(250,204,21,0.05)" : "transparent",
            }}>
              <span style={{ color: C.gold, minWidth: 31, textAlign: "right" }}>
                {kick.suddenDeath ? "SD" : `P${kick.round}`}
              </span>
              <span style={{
                color: kick.scored ? C.green : C.red, flex: 1,
              }}>
                {kick.scored ? "⚽" : "✕"} {kick.player} ({kick.side === "home" ? homeTeam.name : awayTeam.name})
                {kick.scored ? " SCORES!" : " MISSES!"}
              </span>
            </div>
          ))}
        </div>

        {/* Post-match: ratings and continue */}
        {finished && (!penalties || penPhase === "done") && (
          <div style={{ flexShrink: 0 }}>
            <button onClick={() => setShowRatings(!showRatings)} style={{
              width: "100%", padding: "10px", marginBottom: showRatings ? 8 : 0,
              background: "rgba(30, 41, 59, 0.3)",
              border: `1px solid ${C.bgInput}`, color: C.textMuted,
              fontFamily: FONT,
              fontSize: F.xs, cursor: "pointer", letterSpacing: 1,
            }}>
              {showRatings ? "HIDE" : "SHOW"} PLAYER RATINGS
            </button>

            {showRatings && result.playerRatings && (() => {
              const starters = result.playerRatings.filter(pr => !pr.isSub);
              const subs = result.playerRatings.filter(pr => pr.isSub);
              const side = result.isPlayerHome ? "home" : "away";
              const renderRow = (pr, i) => {
                if (!pr.rating && !pr.isSub) return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 13px" }}>
                    <span onClick={() => onPlayerClick?.(pr.name)} style={{ color: C.bgInput, fontSize: F.xs, cursor: "pointer" }}>{pr.name}</span>
                    <span style={{ color: C.bgInput, fontSize: F.xs }}>INJ</span>
                  </div>
                );
                if (!pr.rating && pr.isSub) return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 13px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ background: getPosColor(pr.position), color: C.bg, padding: "1px 5px", fontSize: F.micro, fontWeight: "bold", opacity: 0.5 }}>{pr.position}</span>
                      <span onClick={() => onPlayerClick?.(pr.name)} style={{ color: C.slate, fontSize: F.xs, cursor: "pointer" }}>{pr.name}</span>
                    </span>
                    <span style={{ color: C.slate, fontSize: F.md, fontWeight: "bold" }}>—</span>
                  </div>
                );
                const rColor = pr.rating >= 8 ? C.green : pr.rating >= 7 ? "#84cc16" : pr.rating >= 6 ? "#eab308" : pr.rating >= 5 ? "#f97316" : C.red;
                const goals = result.scorers?.[`${side}|${pr.name}`] || 0;
                const assists = result.assisters?.[`${side}|${pr.name}`] || 0;
                return (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: pr.isSub ? "6px 13px" : "7px 13px",
                    background: pr.rating >= 8 ? "rgba(74,222,128,0.05)" : "transparent",
                  }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ background: getPosColor(pr.position), color: C.bg, padding: "1px 5px", fontSize: F.micro, fontWeight: "bold" }}>{pr.position}</span>
                      <span onClick={() => onPlayerClick?.(pr.name)} style={{ color: pr.isSub ? C.textMuted : C.text, fontSize: F.xs, cursor: "pointer" }}>{pr.name}</span>
                      {pr.isSub && pr.minutesPlayed > 0 && <span style={{ color: C.slate, fontSize: F.micro }}>{pr.minutesPlayed}'</span>}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {goals > 0 && <span style={{ fontSize: F.xs }}>{"⚽".repeat(goals)}</span>}
                      {assists > 0 && <span style={{ fontSize: F.xs, color: "#38bdf8" }}>{"🎯".repeat(assists)}</span>}
                      <span style={{ color: rColor, fontSize: F.md, fontWeight: "bold" }}>{pr.rating.toFixed(1)}</span>
                    </span>
                  </div>
                );
              };
              return (
                <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 8 }}>
                  {starters.map((pr, i) => renderRow(pr, i))}
                  {subs.length > 0 && (
                    <>
                      <div style={{ borderTop: `1px solid ${C.bgCard}`, margin: "4px 10px", display: "flex", alignItems: "center", gap: 6, paddingTop: 4 }}>
                        <span style={{ color: C.bgInput, fontSize: F.micro, letterSpacing: 1 }}>SUBS</span>
                      </div>
                      {subs.map((pr, i) => renderRow(pr, starters.length + i))}
                    </>
                  )}
                </div>
              );
            })()}

            <button onClick={handleDone} style={{
              display: "block", width: "100%", marginTop: 8,
              padding: "12px",
              background: `${resultColor}15`,
              border: `2px solid ${resultColor}`,
              color: resultColor,
              fontFamily: FONT,
              fontSize: F.lg, cursor: "pointer", letterSpacing: 1,
              animation: "glow 2s ease infinite",
            }}>
              CONTINUE ▶
            </button>
          </div>
        )}
      </div>

      {/* AI Team Squad Panel */}
      {viewingTeam && (
        <AITeamPanel
          team={viewingTeam.team}
          tableRow={viewingTeam.tableRow}
          matchGoals={viewingTeam.matchGoals}
          onClose={() => setViewingTeam(null)}
          onPlayerClick={(player) => onPlayerClick?.(player.name, viewingTeam?.team?.name)}
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

// ==================== LEAGUE TABLE SCREEN ====================

// ==================== ARC STEP COMPLETION MODAL ====================

