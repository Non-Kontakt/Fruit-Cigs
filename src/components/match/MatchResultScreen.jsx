import React, { useState, useEffect, useRef } from "react";
import { getPosColor } from "../../utils/calc.js";
import { displayName } from "../../utils/player.js";
import { SFX, BGM } from "../../utils/sfx.js";
import { hasLateEqualiser } from "../../utils/bgmMoments.js";
import { AITeamPanel } from "../league/AITeamPanel.jsx";
import { POSITION_ORDER } from "../../data/positions.js";
import { F, C, FONT, Z } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";
import { ScorerStrip } from "./ScorerStrip.jsx";
import { MatchCommentaryBox, deriveKit, neutralKit } from "./MatchCommentaryBox.jsx";
import { useMatchCommentary } from "../../hooks/useMatchCommentary.js";

// Tier whose matches get the "Altitude Trials" theme (see data/leagues.js tier 6).
const ALTITUDE_TRIALS_TIER = 6;

// In highlights mode only key events narrate through the commentary box.
const HIGHLIGHT_TYPES = new Set(["goal", "card", "red_card", "sub", "motm", "halftime", "fulltime"]);

export function MatchResultScreen({ result, league, onDone, initialSpeed, onSpeedChange, competitionLabel, matchDetail, instantMatch, isOnHoliday, onPlayerClick, clubRelationships, transferFocus, onSetFocus, onRemoveFocus, onReplaceFocus, ovrCap = 20, formation, slotAssignments, startingXI, leagueTier, isRunIn }) {
  const [visible, setVisible] = useState(false);
  const [minute, setMinute] = useState(instantMatch ? 90 : 0);
  const isHighlights = matchDetail === "highlights";
  const [speed, setSpeed] = useState(isHighlights ? 2 : (initialSpeed || 1));
  const [finished, setFinished] = useState(instantMatch);
  const wasAlwaysFast = React.useRef(initialSpeed === 2 || isHighlights || instantMatch);
  const wasAlwaysNormal = React.useRef(initialSpeed === 1 && !isHighlights && !instantMatch);

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
  const [shownEvents, setShownEvents] = useState([]);
  const [currentHomeGoals, setCurrentHomeGoals] = useState(0);
  const [currentAwayGoals, setCurrentAwayGoals] = useState(0);
  const eventsRef = React.useRef(result.events || []);
  const processedRef = React.useRef(new Set());
  const tickerRef = React.useRef(null);
  const mob = useMobile();
  const [viewingTeam, setViewingTeam] = useState(null); // { team, tableRow, matchGoals }
  const [showMatchSettings, setShowMatchSettings] = useState(false);

  // Reduced motion is a presentation-logic decision (#460): the goal lock
  // holds steady colours instead of flickering. Read once per mount.
  const reducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  ).current;

  // Penalty shootout state
  const [penPhase, setPenPhase] = useState(null); // null | "shooting" | "done"
  const [penKickIdx, setPenKickIdx] = useState(0);
  const [penHomeScore, setPenHomeScore] = useState(0);
  const [penAwayScore, setPenAwayScore] = useState(0);
  const penalties = result.penalties || null;

  const homeTeam = league.teams[result.home];
  const awayTeam = league.teams[result.away];

  // The commentary box's presentation queue (#460). shownEvents remains the
  // canonical match record; this narrates it. Instant matches render a
  // settled terminal state — no replay.
  const commentary = useMatchCommentary({
    detail: matchDetail, mob,
    homeName: homeTeam.name, awayName: awayTeam.name,
    instant: instantMatch,
  });

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

  // Match BGM — themed tracks are prioritized from most to least specific:
  // a live shootout beats a dramatic late leveller beats the Altitude Trials
  // tier's ambient theme beats the run-in's ambient theme. Released back to
  // normal rotation once nothing applies (or the screen unmounts).
  const isShootingOut = penPhase === "shooting";
  const isLateLeveller = finished && hasLateEqualiser(result);
  const isAltitudeTrials = leagueTier === ALTITUDE_TRIALS_TIER;
  const bgmContext = isShootingOut ? "shootout"
    : isLateLeveller ? "late_leveller"
    : isAltitudeTrials ? "altitude_trials"
    : isRunIn ? "the_run_in"
    : null;
  useEffect(() => {
    if (!bgmContext) return;
    BGM.playContext(bgmContext);
    return () => BGM.releaseContext();
  }, [bgmContext]);

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

        // Narrate through the commentary queue. In highlights mode only
        // key events reach the box (same filter the feed used to apply).
        if (!isHighlights || HIGHLIGHT_TYPES.has(evt.type) || evt.flash) {
          commentary.pushEvent(evt);
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
          commentary.pushPenaltyKick(kick);
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
        height: mob ? "70vh" : "72vh",
        display: "flex", flexDirection: "column",
        boxShadow: `0 0 50px ${resultColor}33, inset 0 0 80px rgba(0,0,0,0.6)`,
        transform: visible ? "scale(1)" : "scale(0.8)",
        transition: "transform 0.4s ease, border-color 0.5s ease",
        overflow: "hidden",
        position: "relative",
      }}>
        {/* Match settings — a gear in the corner instead of an inline
            control row (owner ruling: the modal was bloated). Houses speed
            now; the home for any future mid-match settings. */}
        {!finished && !isHighlights && (
          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
            <button
              aria-label="Match settings"
              onClick={() => setShowMatchSettings(v => !v)}
              style={{
                background: showMatchSettings ? "rgba(74,222,128,0.15)" : "rgba(30,41,59,0.6)",
                border: `1px solid ${showMatchSettings ? C.green : C.bgInput}`,
                color: showMatchSettings ? C.green : C.textMuted,
                fontFamily: FONT, fontSize: F.md, cursor: "pointer",
                padding: "6px 9px", lineHeight: 1,
              }}
            >⚙</button>
            {showMatchSettings && (
              <div style={{
                position: "absolute", top: "110%", right: 0,
                background: "#0d0d1f", border: `1px solid ${C.bgInput}`,
                padding: 10, display: "flex", flexDirection: "column", gap: 8,
                minWidth: 132, boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              }}>
                <div style={{ fontSize: F.micro, color: C.textDim, letterSpacing: 2 }}>SPEED</div>
                <button onClick={() => { setSpeed(1); onSpeedChange?.(1); wasAlwaysFast.current = false; }} style={{
                  padding: "8px 12px", fontSize: F.xs,
                  background: speed === 1 ? "rgba(74,222,128,0.15)" : "transparent",
                  border: speed === 1 ? `1px solid ${C.green}` : `1px solid ${C.bgInput}`,
                  color: speed === 1 ? C.green : C.slate,
                  fontFamily: FONT, cursor: "pointer",
                }}>▶ SLOW</button>
                <button onClick={() => { setSpeed(2); onSpeedChange?.(2); wasAlwaysNormal.current = false; }} style={{
                  padding: "8px 12px", fontSize: F.xs,
                  background: speed === 2 ? "rgba(74,222,128,0.15)" : "transparent",
                  border: speed === 2 ? `1px solid ${C.green}` : `1px solid ${C.bgInput}`,
                  color: speed === 2 ? C.green : C.slate,
                  fontFamily: FONT, cursor: "pointer",
                }}>▶▶ FAST</button>
              </div>
            )}
          </div>
        )}
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
                <span style={{ lineHeight: 1.4, display: "inline-block" }}>⏱</span> {minute}'
              </span>
            )}
          </div>

          {/* Score */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: mob ? 8 : 18, marginBottom: 7 }}>
            <div style={{ textAlign: "right", flex: 1, minWidth: 0 }}>
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
                  fontSize: mob ? F.md : F.lg, color: homeTeam.isPlayer ? C.green : C.text,
                  cursor: !homeTeam.isPlayer && homeTeam.squad ? "pointer" : "default",
                  textDecoration: !homeTeam.isPlayer && homeTeam.squad ? "underline" : "none",
                  textDecorationColor: homeTeam.color || C.slate,
                  textDecorationStyle: "dotted",
                  textUnderlineOffset: 3,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >{homeTeam.name}</div>
            </div>
            <div style={{
              fontSize: mob ? F.h1 : F.hero, fontWeight: "bold", color: C.text,
              textShadow: "0 0 15px rgba(226,232,240,0.3)",
              minWidth: mob ? 70 : 104, textAlign: "center",
              transition: "all 0.3s ease",
              flexShrink: 0,
            }}>
              {currentHomeGoals} - {currentAwayGoals}
            </div>
            <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
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
                  fontSize: mob ? F.md : F.lg, color: awayTeam.isPlayer ? C.green : C.text,
                  cursor: !awayTeam.isPlayer && awayTeam.squad ? "pointer" : "default",
                  textDecoration: !awayTeam.isPlayer && awayTeam.squad ? "underline" : "none",
                  textDecorationColor: awayTeam.color || C.slate,
                  textDecorationStyle: "dotted",
                  textUnderlineOffset: 3,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >{awayTeam.name}</div>
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

          {/* Result badge — full headline on desktop, compact pill on mobile */}
          {mob ? (
            <div style={{
              display: "inline-block",
              fontSize: F.xs, color: resultColor, fontWeight: "bold",
              letterSpacing: 1, marginBottom: 4,
              padding: "2px 8px",
              border: `1px solid ${resultColor}66`,
              background: `${resultColor}15`,
              transition: "color 0.5s ease, border-color 0.5s ease",
            }}>
              {resultText}
            </div>
          ) : (
            <div style={{
              fontSize: F.xl, color: resultColor, fontWeight: "bold",
              textShadow: `0 0 10px ${resultColor}88`,
              letterSpacing: 3, marginBottom: 4,
              transition: "color 0.5s ease",
            }}>
              {resultText}
            </div>
          )}
        </div>

        {/* The commentary box (#460): one line, featured side's colours,
            goal flash handled inside the component. Fixed footprint. */}
        <div style={{ marginBottom: 10, flexShrink: 0 }}>
          <MatchCommentaryBox
            copy={commentary.copy}
            kit={commentary.side === "home" ? deriveKit(homeTeam.color)
              : commentary.side === "away" ? deriveKit(awayTeam.color)
              : neutralKit()}
            flashing={commentary.flashing}
            reducedMotion={reducedMotion}
            mob={mob}
          />
        </div>

        {/* Scorers/assisters with timestamps — beneath the box (owner
            hierarchy ruling), above ratings */}
        <ScorerStrip
          events={shownEvents}
          homeSquad={homeTeam?.squad}
          awaySquad={awayTeam?.squad}
          isMobile={mob}
        />

        {/* Ratings — the permanent section beneath the box */}
        <div style={{ color: C.textDim, fontSize: F.micro, letterSpacing: 2, marginBottom: 4, flexShrink: 0 }}>RATINGS</div>
        {result.playerRatings && (() => {
          const playerSide = result.isPlayerHome ? "home" : "away";

          // Aggregate events per player from the live feed so far
          const live = {};
          const initLive = (name) => { if (!live[name]) live[name] = { goalMinutes: [], assistMinutes: [], card: null, cardMinute: null, subOff: null, subOn: null }; return live[name]; };
          const opponentGoalMinutes = []; // for GK rating
          shownEvents.forEach(ev => {
            if (ev.type === "goal" && ev.side === playerSide) {
              if (ev.player) initLive(ev.player).goalMinutes.push(ev.minute);
              if (ev.assister) initLive(ev.assister).assistMinutes.push(ev.minute);
            }
            if (ev.type === "goal" && ev.side !== playerSide) {
              opponentGoalMinutes.push(ev.minute);
            }
            if ((ev.type === "card" || ev.type === "red_card") && ev.cardPlayer) {
              const isPlayer = ev.side ? ev.side === playerSide : (result.isPlayerHome ? ev.cardTeamName === homeTeam.name : ev.cardTeamName === awayTeam.name);
              if (isPlayer) { const e = initLive(ev.cardPlayer); e.card = ev.type === "red_card" ? "red" : "yellow"; e.cardMinute = ev.minute; }
            }
            if (ev.type === "sub" && ev.side === playerSide) {
              if (ev.playerOff) initLive(ev.playerOff).subOff = ev.minute;
              if (ev.playerOn) initLive(ev.playerOn).subOn = ev.minute;
            }
          });

          const computeLiveRating = (pr, ev, isGK) => {
            if (!pr.rating) return null;
            if (pr.isSub && ev.subOn == null) return null; // not on pitch yet
            if (ev.subOff != null) return pr.rating; // match done — frozen at final
            const startMin = ev.subOn ?? 0;
            // Subs: show "—" for first 4 minutes after coming on
            if (ev.subOn != null && (minute - ev.subOn) < 4) return null;
            const minutesActive = Math.max(1, Math.min(90, minute - startMin));
            const t = minutesActive / 90;
            // Ease-in-out, fully converges to pr.rating at t=1
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            let r = 6.5 + (pr.rating - 6.5) * ease;
            // Decaying spikes fade over 30 mins — glow lingers, base catches up underneath
            const decay = (evMin) => Math.max(0, 1 - (minute - evMin) / 30);
            ev.goalMinutes?.forEach(m => r += 1.2 * decay(m));
            ev.assistMinutes?.forEach(m => r += 0.6 * decay(m));
            // Cards: persistent drag
            if (ev.card === "yellow") r -= 0.4;
            if (ev.card === "red") r -= 2.0;
            // GK: each goal conceded is a spike down; clean sheet means base drifts higher
            if (isGK) {
              opponentGoalMinutes.forEach(m => r -= 0.9 * decay(m));
            }
            return Math.max(1.0, Math.min(9.9, r));
          };

          const slotPosMap = {};
          if (formation && slotAssignments) {
            slotAssignments.forEach((pid, slotIdx) => {
              if (!pid || !formation[slotIdx]) return;
              slotPosMap[pid] = formation[slotIdx].pos;
            });
          } else if (formation && startingXI) {
            startingXI.forEach((pid, i) => {
              if (!pid || !formation[i]) return;
              slotPosMap[pid] = formation[i].pos;
            });
          }
          const getPos = (pr) => slotPosMap[pr.id] || pr.position;
          const starters = result.playerRatings
            .filter(pr => !pr.isSub)
            .sort((a, b) => (POSITION_ORDER[getPos(a)] ?? 99) - (POSITION_ORDER[getPos(b)] ?? 99));
          const subs = result.playerRatings.filter(pr => pr.isSub);

          // Pre-compute all live ratings to find the current MotM leader
          const allLiveRatings = result.playerRatings.map(pr => {
            const ev = live[pr.name] || {};
            const isGK = (slotPosMap[pr.id] || pr.position) === "GK";
            const r = finished ? pr.rating : computeLiveRating(pr, ev, isGK);
            return { name: pr.name, rating: r };
          }).filter(x => x.rating != null);
          const motmLeader = !finished && allLiveRatings.length > 0
            ? allLiveRatings.reduce((a, b) => a.rating > b.rating ? a : b).name
            : null;

          const renderRow = (pr, i) => {
            const ev = live[pr.name] || {};
            const subOff = ev.subOff;
            const subOn = ev.subOn;
            const dimmed = subOff != null;
            const isGK = (slotPosMap[pr.id] || pr.position) === "GK";
            const isLeader = pr.name === motmLeader;
            if (!pr.rating && !pr.isSub) return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 13px" }}>
                <span onClick={() => onPlayerClick?.(pr.name)} style={{ color: C.bgInput, fontSize: F.xs, cursor: "pointer" }}>{displayName(pr.name, mob)}</span>
                <span style={{ color: C.bgInput, fontSize: F.xs }}>INJ</span>
              </div>
            );
            const liveRating = computeLiveRating(pr, ev, isGK);
            const displayRating = liveRating != null && finished
              ? Math.min(liveRating, pr.rating)  // cap late-game spikes at full time
              : liveRating ?? (finished ? pr.rating : null);
            const rColor = !displayRating ? C.textDim
              : displayRating >= 8 ? C.green : displayRating >= 7 ? "#84cc16" : displayRating >= 6 ? "#eab308" : displayRating >= 5 ? "#f97316" : C.red;
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 13px",
                opacity: dimmed ? 0.5 : 1,
                background: isLeader ? "rgba(250,204,21,0.07)" : displayRating >= 8 ? "rgba(74,222,128,0.05)" : "transparent",
                borderLeft: isLeader ? `2px solid rgba(250,204,21,0.5)` : "2px solid transparent",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ background: getPosColor(getPos(pr)), color: C.bg, padding: "1px 5px", fontSize: F.micro, fontWeight: "bold", opacity: pr.isSub && subOn == null ? 0.4 : 1 }}>{getPos(pr)}</span>
                  <span onClick={() => onPlayerClick?.(pr.name)} style={{ color: dimmed ? C.textMuted : pr.isSub ? C.textMuted : C.text, fontSize: F.xs, cursor: "pointer" }}>{displayName(pr.name, mob)}</span>
                  {subOff != null && <span style={{ color: C.red, fontSize: F.micro }}>↓{subOff}'</span>}
                  {subOn != null && <span style={{ color: C.green, fontSize: F.micro }}>↑{subOn}'</span>}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {ev.goalMinutes?.length > 0 && (
                    <span style={{ fontSize: F.xs }}>
                      {ev.goalMinutes.length === 1 ? "⚽" : `⚽×${ev.goalMinutes.length}`}
                    </span>
                  )}
                  {ev.assistMinutes?.length > 0 && (
                    <span style={{ fontSize: F.xs, color: "#38bdf8" }}>
                      {ev.assistMinutes.length === 1 ? "🎯" : `🎯×${ev.assistMinutes.length}`}
                    </span>
                  )}
                  {ev.card === "yellow" && <span style={{ fontSize: F.xs }}>🟨</span>}
                  {ev.card === "red" && <span style={{ fontSize: F.xs }}>🟥</span>}
                  <span style={{ color: rColor, fontSize: F.md, fontWeight: "bold", minWidth: 28, textAlign: "right" }}>
                    {displayRating ? displayRating.toFixed(1) : "—"}
                  </span>
                </span>
              </div>
            );
          };

          return (
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, marginBottom: 8, border: `1px solid ${C.bgCard}`, background: "rgba(15,15,35,0.6)" }}>
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

        {!result.playerRatings && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: F.xs, marginBottom: 8 }}>
            Ratings available after kick off
          </div>
        )}

        {/* Continue button — post-match only, and never while durable
            narration (a goal, full time, MOTM, a penalty) is still owed */}
        {finished && (!penalties || penPhase === "done") && !commentary.durableOutstanding && (
          <button onClick={handleDone} style={{
            display: "block", width: "100%",
            padding: "12px",
            background: `${resultColor}15`,
            border: `2px solid ${resultColor}`,
            color: resultColor,
            fontFamily: FONT,
            fontSize: F.lg, cursor: "pointer", letterSpacing: 1,
            animation: "glow 2s ease infinite",
            flexShrink: 0,
          }}>
            CONTINUE ▶
          </button>
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

