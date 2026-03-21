import React, { useState, useEffect, useRef, useCallback } from "react";
import { ATTRIBUTES } from "../../data/training.js";
import { getPosColor, progressToPips } from "../../utils/calc.js";
import { SFX } from "../../utils/sfx.js";
import { AnimatedPips } from "../ui/AnimatedPips.jsx";
import { LevelUpPips } from "../ui/LevelUpPips.jsx";
import { PixelDissolveCard } from "../ui/PixelDissolveCard.jsx";
import { MysteryCard } from "./MysteryCard.jsx";
import { F, C, FONT, Z } from "../../data/tokens";

import { TICKET_DEFS } from "../../data/tickets.js";

export function GainPopup({ gains, onDone, onPlayerClick, onAchievementCheck, onTicketPicked, cardSpeed, isOnHoliday }) {
  const [visible, setVisible] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [pickedTickets, setPickedTickets] = useState({});
  const mob = window.innerWidth <= 768;
  const isQuick = cardSpeed === "quick";
  const isSummary = cardSpeed === "summary";
  const doneRef = useRef(false);
  const safeDone = useCallback(() => { if (doneRef.current) return; doneRef.current = true; onDone(); }, [onDone]);

  // Auto-close training reports when on holiday
  useEffect(() => {
    if (isOnHoliday) {
      const timer = setTimeout(() => safeDone(), 600); // Auto-close after 600ms to ensure all state updates propagate
      return () => clearTimeout(timer);
    }
  }, [isOnHoliday, onDone]);

  const improvements = gains.improvements || [];
  const injuries = gains.injuries || [];
  const duos = gains.duos || [];
  const progressEvents = gains.progress || [];
  const arcBoosts = gains.arcBoosts || [];
  const ticketBoosts = gains.ticketBoosts || [];

  const MAX_MYSTERY = 6;

  // Build all items, then split into mystery (tap to reveal) and overflow (auto-shown)
  const [{ mysteryQueue, overflowItems }] = useState(() => {
    const allItems = [];
    injuries.forEach(inj => allItems.push({ type: "injury", data: inj, priority: 100 }));
    duos.forEach(d => allItems.push({ type: "duo", data: d, priority: 90 }));
    improvements.forEach(g => {
      if (g.isProdigalBoost) {
        allItems.push({ type: "prodigal_boost", data: g, priority: 120 });
      } else {
        // Higher stat gains are more interesting
        allItems.push({ type: "gain", data: g, priority: 30 + (g.newVal || 0) });
      }
    });
    // Group arc boosts into cards — one card per (source × stat) combination
    // This ensures a squad-wide PHY boost and a separate individual PHY boost show as distinct cards
    if (arcBoosts.length > 0) {
      const bySourceAttr = {};
      arcBoosts.forEach(ab => {
        const k = `${ab.sourceKey || "arc"}:${ab.attr}`;
        if (!bySourceAttr[k]) bySourceAttr[k] = { attr: ab.attr, amount: ab.newVal - ab.oldVal, players: [], sourceKey: ab.sourceKey, filterLabel: ab.filterLabel || null };
        bySourceAttr[k].players.push({ name: ab.playerName, position: ab.playerPosition, oldVal: ab.oldVal, newVal: ab.newVal });
      });
      Object.values(bySourceAttr).forEach(group => {
        allItems.push({ type: "arc_boost_group", data: group, priority: 110 });
      });
    }
    ticketBoosts.forEach(tb => allItems.push({ type: tb.source === "televised" ? "televised_boost" : "ticket_boost", data: tb, priority: 115 }));
    (gains.cappedArcTickets || []).forEach(ct => allItems.push({ type: "capped_arc_ticket", data: ct, priority: 105 }));
    progressEvents.forEach(p => {
      if (p.type === "positionLearned") {
        allItems.push({ type: "positionLearned", data: p, priority: 80 });
      } else {
        allItems.push({ type: "progress", data: p, priority: p.newProgress >= 0.8 ? 25 : 10 });
      }
    });

    // Sort by priority descending for selection
    const sorted = [...allItems].sort((a, b) => b.priority - a.priority);
    const mystery = sorted.slice(0, MAX_MYSTERY);
    const overflow = sorted.slice(MAX_MYSTERY);

    // Shuffle mystery cards: prodigal boosts first, then ticket boosts, then arc boosts, then rest
    const mysteryProdigal = mystery.filter(i => i.type === "prodigal_boost");
    const mysteryTicketBoosts = mystery.filter(i => i.type === "ticket_boost" || i.type === "televised_boost");
    const mysteryArcBoosts = mystery.filter(i => i.type === "arc_boost_group");
    const mysteryCappedArc = mystery.filter(i => i.type === "capped_arc_ticket");
    const mysteryRest = mystery.filter(i => i.type !== "prodigal_boost" && i.type !== "arc_boost_group" && i.type !== "ticket_boost" && i.type !== "televised_boost" && i.type !== "capped_arc_ticket");
    for (let i = mysteryRest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mysteryRest[i], mysteryRest[j]] = [mysteryRest[j], mysteryRest[i]];
    }

    return {
      mysteryQueue: [...mysteryProdigal, ...mysteryTicketBoosts, ...mysteryArcBoosts, ...mysteryCappedArc, ...mysteryRest],
      overflowItems: overflow,
    };
  });

  const totalMystery = mysteryQueue.length;
  const totalAll = totalMystery + overflowItems.length;

  // Fire achievement checks for overflow items immediately
  useEffect(() => {
    if (onAchievementCheck && overflowItems.length > 0) {
      overflowItems.forEach(item => onAchievementCheck(item));
    }
    // Quick & summary modes: immediately fire achievements for ALL mystery cards too
    if ((isQuick || isSummary) && onAchievementCheck) {
      mysteryQueue.forEach(item => onAchievementCheck(item));
    }
  }, []);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    if (totalAll === 0) {
      setTimeout(() => SFX.noGains(), 400);
      setTimeout(() => safeDone(), 600);
    }
    // Quick mode: auto-reveal all mystery cards on mount (shows revealed cards, no tapping)
    if (isQuick && totalMystery > 0) {
      setRevealedCount(totalMystery);
    }
  }, [totalAll]);

  // Play sound when a card is revealed
  const handleRevealItem = useCallback((index) => {
    const item = mysteryQueue[index];
    if (item.type === "injury") SFX.injury();
    else if (item.type === "duo") SFX.duoBoost();
    else if (item.type === "breakthrough" || item.type === "prodigal_boost") SFX.breakthrough();
    else if (item.type === "arc_boost_group") SFX.arcStep();
    else if (item.type === "capped_arc_ticket") SFX.arcStep();
    else if (item.type === "televised_boost") SFX.breakthrough();
    else if (item.type === "progress") SFX.progress();
    else if (item.type === "positionLearned") SFX.reveal();
    else SFX.reveal();
  }, [mysteryQueue]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => { try { safeDone(); } catch(e) { console.error("GainPopup onDone error:", e); } }, 400);
  };

  const handleRevealAll = () => {
    // Check achievements for all unrevealed mystery cards
    if (onAchievementCheck) {
      for (let i = revealedCount; i < totalMystery; i++) {
        onAchievementCheck(mysteryQueue[i]);
      }
    }
    setRevealedCount(totalMystery);
  };

  const allRevealed = revealedCount >= totalMystery;

  // Render a revealed card based on its type
  const renderRevealedCard = (item, index) => {
    if (item.type === "injury") {
      const inj = item.data;
      return (
        <div key={index} style={{
          padding: "18px 20px", marginBottom: 8,
          background: "linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.03) 100%)",
          border: "1px solid rgba(239,68,68,0.3)",
          animation: "slideIn 0.4s ease both",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#fca5a5", fontSize: F.lg, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(252,165,165,0.3)", textUnderlineOffset: 3, display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => onPlayerClick && onPlayerClick(inj.playerName)}
            >🏥 {inj.playerPosition && <span style={{ background: getPosColor(inj.playerPosition), color: C.bg, padding: "1px 5px", fontSize: F.xs, fontWeight: "bold", textDecoration: "none" }}>{inj.playerPosition}</span>}{inj.playerName}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.red, fontSize: F.sm }}>{inj.injury}</span>
              <span style={{ color: C.lightRed, fontSize: F.md, fontWeight: "bold" }}>{inj.weeksOut}w</span>
            </span>
          </div>
          {inj.attrLoss && (
            <div style={{ marginTop: 6, color: "#f87171", fontSize: F.xs }}>
              Concrete pitch took its toll: −1 {inj.attrLoss.label} ({inj.attrLoss.newVal})
            </div>
          )}
        </div>
      );
    }
    if (item.type === "duo") {
      const d = item.data;
      const attr = ATTRIBUTES.find(a => a.key === d.attr);
      return (
        <div key={index} style={{
          padding: "13px 20px", marginBottom: 8,
          background: "linear-gradient(135deg, rgba(250,204,21,0.12) 0%, rgba(250,204,21,0.03) 50%, rgba(250,204,21,0.1) 100%)",
          border: "1px solid rgba(250,204,21,0.35)",
          position: "relative", overflow: "hidden",
          animation: "slideIn 0.4s ease both",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 25%, rgba(250,204,21,0.08) 40%, rgba(250,204,21,0.15) 50%, rgba(250,204,21,0.08) 60%, transparent 75%)",
            animation: "sheen 2s ease infinite", pointerEvents: "none",
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <span style={{ color: "#fef08a", fontSize: F.sm, flexShrink: 0 }}>🤝</span>
              {d.playerPosition && <span style={{ background: getPosColor(d.playerPosition), color: C.bg, padding: "1px 5px", fontSize: F.micro, fontWeight: "bold", flexShrink: 0 }}>{d.playerPosition}</span>}
              <span style={{ color: C.text, fontSize: F.md, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(226,232,240,0.2)", textUnderlineOffset: 3 }}
                onClick={() => onPlayerClick && onPlayerClick(d.playerName)}
              >{d.playerName}</span>
              <span style={{ color: "#92723f", fontSize: F.xs, flexShrink: 0 }}>w/</span>
              <span style={{ color: "#a3a3a3", fontSize: F.xs, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(163,163,163,0.2)", textUnderlineOffset: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                onClick={() => onPlayerClick && onPlayerClick(d.partnerName)}
              >{d.partnerName}</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ color: attr?.color || "#fff", fontSize: F.md, textShadow: `0 0 8px ${attr?.color || "#fff"}55` }}>{attr?.label}</span>
              <span style={{ position: "relative", display: "inline-flex", alignItems: "flex-start" }}>
                <span style={{ color: C.gold, fontSize: F.h2, fontWeight: "bold", textShadow: "0 0 12px rgba(250,204,21,0.9), 0 0 30px rgba(250,204,21,0.4)", lineHeight: 1 }}>{d.newVal}</span>
                <span style={{ color: C.gold, fontSize: F.xs, marginLeft: 2, marginTop: -2, opacity: 0.8 }}>+{d.newVal - d.oldVal}</span>
              </span>
              <span style={{ color: C.slate, fontSize: F.xs }}>was {d.oldVal}</span>
            </span>
          </div>
        </div>
      );
    }
    // Progress card — shows pip bar with animation
    if (item.type === "progress") {
      const p = item.data;
      const attr = ATTRIBUTES.find(a => a.key === p.attr);
      const filledPips = progressToPips(p.newProgress);
      const nearlyThere = p.newProgress >= 0.8;
      return (
        <div key={index} style={{
          padding: "16px 20px", marginBottom: 8,
          background: nearlyThere
            ? "linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.03) 50%, rgba(56,189,248,0.1) 100%)"
            : "linear-gradient(135deg, rgba(148,163,184,0.08) 0%, rgba(148,163,184,0.02) 100%)",
          border: `1px solid ${nearlyThere ? "rgba(56,189,248,0.35)" : "rgba(148,163,184,0.15)"}`,
          animation: "slideIn 0.4s ease both",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: nearlyThere ? "#7dd3fc" : C.textMuted, fontSize: F.md, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(148,163,184,0.2)", textUnderlineOffset: 3, display: "inline-flex", alignItems: "center", gap: 5 }}
              onClick={() => onPlayerClick && onPlayerClick(p.playerName)}
            >⬆ {p.playerPosition && <span style={{ background: getPosColor(p.playerPosition), color: C.bg, padding: "1px 5px", fontSize: F.micro, fontWeight: "bold", textDecoration: "none" }}>{p.playerPosition}</span>}{p.playerName}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: attr?.color || "#fff", fontSize: F.sm }}>{attr?.label} {p.statVal}</span>
              <AnimatedPips oldPips={p.oldPips} newPips={filledPips} nearlyThere={nearlyThere} pipCrossed={p.pipCrossed} />
              {nearlyThere && <span style={{ fontSize: F.xs, color: "#38bdf8", animation: "pulse 1.5s ease infinite" }}>CLOSE!</span>}
            </span>
          </div>
        </div>
      );
    }
    // Story Arc boost card — grouped, blue/purple arc feel
    if (item.type === "arc_boost_group") {
      const group = item.data;
      const attr = ATTRIBUTES.find(a => a.key === group.attr);
      return (
        <div key={index} style={{
          padding: "20px 20px", marginBottom: 8,
          background: "linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(167,139,250,0.08) 40%, rgba(96,165,250,0.15) 100%)",
          border: "2px solid rgba(96,165,250,0.6)",
          position: "relative", overflow: "hidden",
          animation: "slideIn 0.4s ease both",
          boxShadow: "0 0 20px rgba(96,165,250,0.15), inset 0 0 20px rgba(96,165,250,0.05)",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 20%, rgba(96,165,250,0.12) 35%, rgba(255,255,255,0.15) 50%, rgba(96,165,250,0.12) 65%, transparent 80%)",
            animation: "sheen 2s ease infinite", pointerEvents: "none",
          }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: F.xs, color: group.sourceKey === "well_rested" ? C.amber : "#93c5fd", letterSpacing: 3, marginBottom: 6, textShadow: group.sourceKey === "well_rested" ? "0 0 10px rgba(251,191,36,0.5)" : "0 0 10px rgba(96,165,250,0.5)" }}>{group.sourceKey === "well_rested" ? "☀️ WELL RESTED" : "📖 ARC BOOST"}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#dbeafe", fontSize: mob ? F.sm : F.md }}>
                {group.players.length === 1 ? (group.players[0].name) : group.players.length <= 5 ? group.players.map(p => p.name).join(", ") : group.filterLabel ? `All ${group.filterLabel} (${group.players.length})` : `All squad (${group.players.length} players)`}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: attr?.color || "#fff", fontSize: F.md, textShadow: `0 0 8px ${attr?.color || "#fff"}55` }}>{attr?.label}</span>
                <span style={{ color: C.blue, fontSize: F.h1, fontWeight: "bold", textShadow: "0 0 15px rgba(96,165,250,0.9), 0 0 35px rgba(96,165,250,0.4)", lineHeight: 1 }}>+{group.amount}</span>
              </span>
            </div>
          </div>
        </div>
      );
    }
    // Prodigal Son boost card — teal/green homecoming feel
    if (item.type === "prodigal_boost") {
      const g = item.data;
      const attr = ATTRIBUTES.find(a => a.key === g.attr);
      const gained = g.newVal - g.oldVal;
      return (
        <div key={index} style={{
          padding: "20px 20px", marginBottom: 8,
          background: "linear-gradient(135deg, rgba(45,212,191,0.2) 0%, rgba(74,222,128,0.08) 40%, rgba(45,212,191,0.15) 100%)",
          border: "2px solid rgba(45,212,191,0.6)",
          position: "relative", overflow: "hidden",
          animation: "slideIn 0.4s ease both",
          boxShadow: "0 0 20px rgba(45,212,191,0.15), inset 0 0 20px rgba(45,212,191,0.05)",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 20%, rgba(45,212,191,0.12) 35%, rgba(255,255,255,0.15) 50%, rgba(45,212,191,0.12) 65%, transparent 80%)",
            animation: "sheen 2s ease infinite", pointerEvents: "none",
          }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: F.xs, color: "#5eead4", letterSpacing: 3, marginBottom: 6, textShadow: "0 0 10px rgba(45,212,191,0.5)" }}>🏠 SETTLED IN</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#ccfbf1", fontSize: F.lg, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(204,251,241,0.3)", textUnderlineOffset: 3, display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() => onPlayerClick && onPlayerClick(g.playerName)}
              >{g.playerPosition && <span style={{ background: getPosColor(g.playerPosition), color: C.bg, padding: "1px 7px", fontSize: F.xs, fontWeight: "bold", textDecoration: "none" }}>{g.playerPosition}</span>}{g.playerName}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: attr?.color || "#fff", fontSize: F.md, textShadow: `0 0 8px ${attr?.color || "#fff"}55` }}>{attr?.label}</span>
                <span style={{ position: "relative", display: "inline-flex", alignItems: "flex-start" }}>
                  <span style={{ color: "#2dd4bf", fontSize: F.h1, fontWeight: "bold", textShadow: "0 0 15px rgba(45,212,191,0.9), 0 0 35px rgba(45,212,191,0.4)", lineHeight: 1 }}>{g.newVal}</span>
                  <span style={{ color: "#5eead4", fontSize: F.xs, marginLeft: 2, marginTop: -2 }}>+{gained}</span>
                </span>
                <span style={{ color: "#4a7c72", fontSize: F.xs }}>was {g.oldVal}</span>
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Position learned card
    if (item.type === "positionLearned") {
      const p = item.data;
      return (
        <div key={index} style={{
          padding: "18px 20px", marginBottom: 8,
          background: "linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(96,165,250,0.04) 100%)",
          border: "1px solid rgba(96,165,250,0.4)",
          animation: "slideIn 0.4s ease both",
        }}>
          <div style={{ fontSize: F.xs, color: "#93c5fd", letterSpacing: 2, marginBottom: 8 }}>🎓 POSITION LEARNED</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#bfdbfe", fontSize: F.md, cursor: "pointer" }}
              onClick={() => onPlayerClick && onPlayerClick(p.playerName)}
            >
              {p.playerPosition && <span style={{ background: getPosColor(p.playerPosition), color: C.bg, padding: "1px 7px", fontSize: F.xs, fontWeight: "bold", marginRight: 6 }}>{p.playerPosition}</span>}
              {p.playerName}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: C.blue, fontSize: F.xs }}>can now play</span>
              <span style={{ background: getPosColor(p.learnedPosition), color: C.bg, padding: "3px 9px", fontSize: F.sm, fontWeight: "bold" }}>{p.learnedPosition}</span>
            </span>
          </div>
        </div>
      );
    }
    // Ticket boost — purple/gold, shows ticket icon + stat change
    if (item.type === "ticket_boost") {
      const tb = item.data;
      const attr = ATTRIBUTES.find(a => a.key === tb.attr);
      return (
        <div key={index} style={{
          padding: "18px 20px", marginBottom: 8,
          background: "linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(250,204,21,0.06) 50%, rgba(168,85,247,0.1) 100%)",
          border: "1px solid rgba(168,85,247,0.4)",
          position: "relative", overflow: "hidden",
          animation: "slideIn 0.4s ease both",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)",
            animation: `sheen 2.5s ease ${index * 0.2}s infinite`, pointerEvents: "none",
          }} />
          <div style={{ fontSize: F.micro, color: C.purple, letterSpacing: 2, marginBottom: 8, position: "relative" }}>🎟️ TICKET BOOST</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
            <span style={{ color: C.text, fontSize: F.lg, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(226,232,240,0.2)", textUnderlineOffset: 3, display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => onPlayerClick && onPlayerClick(tb.playerName)}
            >{tb.playerPosition && <span style={{ background: getPosColor(tb.playerPosition), color: C.bg, padding: "1px 7px", fontSize: F.xs, fontWeight: "bold", textDecoration: "none" }}>{tb.playerPosition}</span>}{tb.playerName}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: attr?.color || "#fff", fontSize: F.md, textShadow: `0 0 8px ${attr?.color || "#fff"}55` }}>{attr?.label}</span>
              <span style={{ position: "relative", display: "inline-flex", alignItems: "flex-start" }}>
                <span style={{ color: C.purple, fontSize: F.h1, fontWeight: "bold", textShadow: "0 0 12px rgba(168,85,247,0.9), 0 0 30px rgba(168,85,247,0.4)", lineHeight: 1 }}>{tb.newVal}</span>
                <span style={{ color: C.purple, fontSize: F.xs, marginLeft: 2, marginTop: -2, opacity: 0.8 }}>+1</span>
              </span>
              <span style={{ color: C.slate, fontSize: F.xs }}>was {tb.oldVal}</span>
            </span>
          </div>
        </div>
      );
    }
    // Televised match MotM boost — Euro Dynasty deep blue
    if (item.type === "televised_boost") {
      const tb = item.data;
      const attr = ATTRIBUTES.find(a => a.key === tb.attr);
      const blue = "#1e3a8a";
      return (
        <div key={index} style={{
          padding: "18px 20px", marginBottom: 8,
          background: `linear-gradient(135deg, rgba(30,58,138,0.15) 0%, rgba(30,58,138,0.06) 50%, rgba(30,58,138,0.12) 100%)`,
          border: `1px solid rgba(30,58,138,0.5)`,
          position: "relative", overflow: "hidden",
          animation: "slideIn 0.4s ease both",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)",
            animation: `sheen 2.5s ease ${index * 0.2}s infinite`, pointerEvents: "none",
          }} />
          <div style={{ fontSize: F.micro, color: blue, letterSpacing: 2, marginBottom: 8, position: "relative" }}>📺 TELEVISED MOTM BOOST</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
            <span style={{ color: C.text, fontSize: F.lg, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(226,232,240,0.2)", textUnderlineOffset: 3, display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => onPlayerClick && onPlayerClick(tb.playerName)}
            >{tb.playerPosition && <span style={{ background: getPosColor(tb.playerPosition), color: C.bg, padding: "1px 7px", fontSize: F.xs, fontWeight: "bold", textDecoration: "none" }}>{tb.playerPosition}</span>}{tb.playerName}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: attr?.color || "#fff", fontSize: F.md, textShadow: `0 0 8px ${attr?.color || "#fff"}55` }}>{attr?.label}</span>
              <span style={{ position: "relative", display: "inline-flex", alignItems: "flex-start" }}>
                <span style={{ color: blue, fontSize: F.h1, fontWeight: "bold", textShadow: `0 0 12px rgba(30,58,138,0.9), 0 0 30px rgba(30,58,138,0.4)`, lineHeight: 1 }}>{tb.newVal}</span>
                <span style={{ color: blue, fontSize: F.xs, marginLeft: 2, marginTop: -2, opacity: 0.8 }}>+1</span>
              </span>
              <span style={{ color: C.slate, fontSize: F.xs }}>was {tb.oldVal}</span>
            </span>
          </div>
        </div>
      );
    }
    if (item.type === "capped_arc_ticket") {
      const ct = item.data;
      const picked = pickedTickets[index];
      const pickedDef = picked ? TICKET_DEFS[picked] : null;
      return (
        <div key={index} style={{
          padding: "18px 20px", marginBottom: 8,
          background: "linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(99,102,241,0.06) 50%, rgba(167,139,250,0.12) 100%)",
          border: "1px solid rgba(167,139,250,0.4)",
          position: "relative", overflow: "hidden",
          animation: "slideIn 0.4s ease both",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)",
            animation: `sheen 2.5s ease ${index * 0.2}s infinite`, pointerEvents: "none",
          }} />
          <div style={{ fontSize: F.micro, color: "#a78bfa", letterSpacing: 2, marginBottom: 6, position: "relative" }}>
            MASTERY OVERFLOW
          </div>
          <div style={{ fontSize: F.xs, color: C.textMuted, marginBottom: 12, position: "relative" }}>
            {ct.arcName} — your squad's beyond training. Pick a reward:
          </div>
          {picked ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", padding: "8px 12px", background: `${pickedDef.color}18`, border: `1px solid ${pickedDef.color}44` }}>
              <span style={{ fontSize: F.lg }}>{pickedDef.icon}</span>
              <span style={{ fontSize: F.sm, color: pickedDef.color }}>{pickedDef.name}</span>
              <span style={{ fontSize: F.micro, color: C.textDim, marginLeft: "auto" }}>CLAIMED</span>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, position: "relative", flexWrap: "wrap" }}>
              {ct.choices.map(ticketType => {
                const def = TICKET_DEFS[ticketType];
                if (!def) return null;
                return (
                  <div
                    key={ticketType}
                    onClick={() => {
                      setPickedTickets(prev => ({ ...prev, [index]: ticketType }));
                      onTicketPicked?.(ticketType);
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${def.color}28`; e.currentTarget.style.borderColor = `${def.color}88`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${def.color}12`; e.currentTarget.style.borderColor = `${def.color}44`; }}
                    style={{
                      flex: 1, minWidth: mob ? "100%" : 90, padding: "10px 12px",
                      background: `${def.color}12`, border: `1px solid ${def.color}44`,
                      cursor: "pointer", textAlign: "center", transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: F.lg, marginBottom: 4 }}>{def.icon}</div>
                    <div style={{ fontSize: F.micro, color: def.color, marginBottom: 4, lineHeight: 1.3 }}>{def.name}</div>
                    <div style={{ fontSize: F.micro, color: C.textDim, lineHeight: 1.3 }}>{def.desc}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    // Regular gain — green, with pip bar filling to max
    const g = item.data;
    const attr = ATTRIBUTES.find(a => a.key === g.attr);
    return (
      <div key={index} style={{
        padding: "18px 20px", marginBottom: 8,
        background: "linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(74,222,128,0.03) 50%, rgba(74,222,128,0.1) 100%)",
        border: "1px solid rgba(74,222,128,0.35)",
        position: "relative", overflow: "hidden",
        animation: "slideIn 0.4s ease both",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)",
          animation: `sheen 2.5s ease ${index * 0.2}s infinite`, pointerEvents: "none",
        }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <span style={{ color: C.text, fontSize: F.lg, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(226,232,240,0.2)", textUnderlineOffset: 3, display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => onPlayerClick && onPlayerClick(g.playerName)}
          >{g.playerPosition && <span style={{ background: getPosColor(g.playerPosition), color: C.bg, padding: "1px 7px", fontSize: F.xs, fontWeight: "bold", textDecoration: "none" }}>{g.playerPosition}</span>}{g.playerName}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LevelUpPips oldPips={g.oldPips} accentColor={C.green} />
            <span style={{ color: attr?.color || "#fff", fontSize: F.md, textShadow: `0 0 8px ${attr?.color || "#fff"}55` }}>{attr?.label}</span>
            <span style={{ position: "relative", display: "inline-flex", alignItems: "flex-start" }}>
              <span style={{ color: C.green, fontSize: F.h1, fontWeight: "bold", textShadow: "0 0 12px rgba(74,222,128,0.9), 0 0 30px rgba(74,222,128,0.4)", lineHeight: 1 }}>{g.newVal}</span>
              <span style={{ color: C.green, fontSize: F.xs, marginLeft: 2, marginTop: -2, opacity: 0.8 }}>+1</span>
            </span>
            <span style={{ color: C.slate, fontSize: F.xs }}>was {g.oldVal}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: Z.panel,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)",
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? "auto" : "none",
      transition: "opacity 0.4s ease",
      fontFamily: FONT,
    }}>
      <div style={{
        background: "linear-gradient(170deg, #1a1a2e 0%, #0d0d1f 60%, #1a1a2e 100%)",
        border: `3px solid ${C.green}`,
        padding: mob ? "26px 20px" : "42px 47px",
        maxWidth: 780,
        width: mob ? "96%" : "92%",
        maxHeight: mob ? "85vh" : "80vh",
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 50px rgba(74, 222, 128, 0.25), inset 0 0 80px rgba(0,0,0,0.6)",
        transform: visible ? "scale(1)" : "scale(0.8)",
        transition: "transform 0.4s ease",
      }}>
        <div style={{
          textAlign: "center", color: C.green, fontSize: mob ? F.xl : F.h3,
          marginBottom: 6, letterSpacing: 3,
          textShadow: "0 0 12px rgba(74,222,128,0.6), 0 0 30px rgba(74,222,128,0.2)",
          flexShrink: 0,
        }}>
          📈 TRAINING REPORT
        </div>
        <div style={{
          textAlign: "center", color: C.slate, fontSize: F.sm,
          marginBottom: 28,
          flexShrink: 0,
        }}>
          {totalAll} event{totalAll !== 1 ? "s" : ""} this week
        </div>

        <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {totalAll > 0 ? (
          <>
            {/* SUMMARY MODE: compact text list, no cards */}
            {isSummary ? (
              <div>
                {[...mysteryQueue, ...overflowItems].map((item, i) => {
                  if (item.type === "injury") {
                    const inj = item.data;
                    return (
                      <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(30,41,59,0.3)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#fca5a5", fontSize: F.sm, cursor: "pointer" }} onClick={() => onPlayerClick && onPlayerClick(inj.playerName)}>🏥 {inj.playerName}</span>
                          <span style={{ color: C.red, fontSize: F.xs }}>{inj.injury} ({inj.weeksOut}w)</span>
                        </div>
                        {inj.attrLoss && <div style={{ color: "#f87171", fontSize: F.xs, marginTop: 3 }}>−1 {inj.attrLoss.label}</div>}
                      </div>
                    );
                  }
                  if (item.type === "duo") {
                    const d = item.data;
                    const attr = ATTRIBUTES.find(a => a.key === d.attr);
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(30,41,59,0.3)" }}>
                        <span style={{ color: C.amber, fontSize: F.sm, cursor: "pointer" }} onClick={() => onPlayerClick && onPlayerClick(d.playerName)}>🤝 {d.playerName}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: attr?.color || "#fff", fontSize: F.xs }}>{attr?.label}</span>
                          <span style={{ color: C.green, fontSize: F.md, fontWeight: "bold" }}>{d.newVal}</span>
                          <span style={{ color: C.green, fontSize: F.xs }}>+1</span>
                        </span>
                      </div>
                    );
                  }
                  if (item.type === "gain") {
                    const g = item.data;
                    const attr = ATTRIBUTES.find(a => a.key === g.attr);
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(30,41,59,0.3)" }}>
                        <span style={{ color: C.textMuted, fontSize: F.sm, cursor: "pointer" }} onClick={() => onPlayerClick && onPlayerClick(g.playerName)}>{g.playerName}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: attr?.color || "#fff", fontSize: F.xs }}>{attr?.label}</span>
                          <span style={{ color: C.green, fontSize: F.md, fontWeight: "bold" }}>{g.newVal}</span>
                          <span style={{ color: C.green, fontSize: F.xs }}>+1</span>
                        </span>
                      </div>
                    );
                  }
                  if (item.type === "arc_boost_group") {
                    const group = item.data;
                    const attr = ATTRIBUTES.find(a => a.key === group.attr);
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(96,165,250,0.2)", background: "rgba(96,165,250,0.04)" }}>
                        <span style={{ color: "#93c5fd", fontSize: F.sm }}>📖 {group.players.length} players</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: attr?.color || "#fff", fontSize: F.xs }}>{attr?.label}</span>
                          <span style={{ color: C.blue, fontSize: F.md, fontWeight: "bold" }}>+{group.amount}</span>
                        </span>
                      </div>
                    );
                  }
                  if (item.type === "positionLearned") {
                    const p = item.data;
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(96,165,250,0.2)", background: "rgba(96,165,250,0.04)" }}>
                        <span style={{ color: C.blue, fontSize: F.sm, cursor: "pointer" }} onClick={() => onPlayerClick && onPlayerClick(p.playerName)}>🎓 {p.playerName}</span>
                        <span style={{ color: C.blue, fontSize: F.xs }}>Learned {p.learnedPosition}</span>
                      </div>
                    );
                  }
                  if (item.type === "progress") {
                    const p = item.data;
                    const attr = ATTRIBUTES.find(a => a.key === p.attr);
                    const pips = progressToPips(p.newProgress);
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(30,41,59,0.3)" }}>
                        <span style={{ color: C.textDim, fontSize: F.sm, cursor: "pointer" }} onClick={() => onPlayerClick && onPlayerClick(p.playerName)}>{p.playerName}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ color: attr?.color || "#fff", fontSize: F.xs }}>{attr?.label} {p.statVal}</span>
                          <span style={{ display: "flex", gap: 1 }}>
                            {[0,1,2,3,4].map(j => (
                              <span key={j} style={{ width: 7, height: 4, background: j < pips ? (p.newProgress >= 0.8 ? "#06b6d4" : "#f59e0b") : "rgba(30,41,59,0.6)", opacity: j < pips ? 0.8 : 0.3 }} />
                            ))}
                          </span>
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
            <>
            {/* FULL & QUICK MODES: mystery cards */}
            {mysteryQueue.map((item, i) => {
              // Already revealed (or auto-revealed in quick mode)
              if (i < revealedCount) {
                return renderRevealedCard(item, i);
              }
              // Next card to reveal — use PixelDissolveCard wrapper
              if (i === revealedCount) {
                return (
                  <MysteryCard
                    key={i}
                    index={i}
                    item={item}
                    isNext={true}
                    onRevealed={() => {
                      handleRevealItem(i);
                      setRevealedCount(c => c + 1);
                      if (onAchievementCheck) onAchievementCheck(item);
                    }}
                    renderRevealed={() => renderRevealedCard(item, i)}
                  />
                );
              }
              // Future locked cards
              return (
                <MysteryCard
                  key={i}
                  index={i}
                  item={item}
                  isNext={false}
                  onRevealed={() => {}}
                  renderRevealed={() => null}
                />
              );
            })}

            {!allRevealed && !isQuick && (
              <div style={{
                textAlign: "center", fontSize: F.xs, color: C.slate,
                marginTop: 12, letterSpacing: 1,
                animation: "pulse 2s ease infinite",
              }}>
                ◀ TAP NEXT CARD TO REVEAL ▶
              </div>
            )}

            {/* Overflow — auto-revealed compact summary after mystery cards done */}
            {allRevealed && overflowItems.length > 0 && (
              <div style={{
                marginTop: 12, padding: "13px 16px",
                background: "rgba(30,41,59,0.2)",
                border: "1px solid rgba(71,85,105,0.2)",
              }}>
                <div style={{ fontSize: F.xs, color: C.slate, marginBottom: 8, letterSpacing: 1 }}>
                  + {overflowItems.length} MORE
                </div>
                {overflowItems.map((item, i) => {
                  if (item.type === "gain" || item.type === "breakthrough") {
                    const g = item.data;
                    const attr = ATTRIBUTES.find(a => a.key === g.attr);
                    const gained = g.newVal - g.oldVal;
                    return (
                      <div key={`ov-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(30,41,59,0.3)" }}>
                        <span style={{ color: C.textMuted, fontSize: F.sm, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(148,163,184,0.2)", textUnderlineOffset: 2 }}
                          onClick={() => onPlayerClick && onPlayerClick(g.playerName)}
                        >{g.playerName}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: attr?.color || "#fff", fontSize: F.xs }}>{attr?.label}</span>
                          <span style={{ color: C.green, fontSize: F.md, fontWeight: "bold" }}>{g.newVal}</span>
                          <span style={{ color: C.green, fontSize: F.xs }}>+{gained}</span>
                        </span>
                      </div>
                    );
                  }
                  if (item.type === "arc_boost_group") {
                    const group = item.data;
                    const attr = ATTRIBUTES.find(a => a.key === group.attr);
                    return (
                      <div key={`ov-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(96,165,250,0.2)" }}>
                        <span style={{ color: "#93c5fd", fontSize: F.sm }}>📖 {group.players.length} players</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: C.blue, fontSize: F.micro }}>ARC</span>
                          <span style={{ color: attr?.color || "#fff", fontSize: F.xs }}>{attr?.label}</span>
                          <span style={{ color: C.blue, fontSize: F.md, fontWeight: "bold" }}>+{group.amount}</span>
                        </span>
                      </div>
                    );
                  }
                  if (item.type === "progress") {
                    const p = item.data;
                    const attr = ATTRIBUTES.find(a => a.key === p.attr);
                    const pips = progressToPips(p.newProgress);
                    return (
                      <div key={`ov-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(30,41,59,0.3)" }}>
                        <span style={{ color: C.textDim, fontSize: F.sm, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(100,116,139,0.2)", textUnderlineOffset: 2 }}
                          onClick={() => onPlayerClick && onPlayerClick(p.playerName)}
                        >{p.playerName}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ color: attr?.color || "#fff", fontSize: F.xs }}>{attr?.label} {p.statVal}</span>
                          <span style={{ display: "flex", gap: 1 }}>
                            {[0,1,2,3,4].map(j => (
                              <span key={j} style={{ width: 7, height: 4, background: j < pips ? "#f59e0b" : "rgba(30,41,59,0.6)", opacity: j < pips ? 0.8 : 0.3 }} />
                            ))}
                          </span>
                        </span>
                      </div>
                    );
                  }
                  if (item.type === "injury") {
                    const inj = item.data;
                    return (
                      <div key={`ov-${i}`} style={{ padding: "5px 0", borderBottom: "1px solid rgba(30,41,59,0.3)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#fca5a5", fontSize: F.sm }}>🏥 {inj.playerName}</span>
                          <span style={{ color: C.red, fontSize: F.xs }}>{inj.injury} ({inj.weeksOut}w)</span>
                        </div>
                        {inj.attrLoss && <div style={{ color: "#f87171", fontSize: F.xs, marginTop: 3 }}>−1 {inj.attrLoss.label}</div>}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
            </>
            )}
          </>
        ) : (
          <div style={{ color: C.textDim, textAlign: "center", fontSize: F.lg, padding: "24px 0" }}>
            No events this week. Keep training!
          </div>
        )}

        </div>{/* end scrollable area */}

        {/* Bottom buttons — pinned */}
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexShrink: 0 }}>
          {!allRevealed && totalMystery > 0 && !isQuick && !isSummary && (
            <button
              onClick={handleRevealAll}
              style={{
                flex: 1, padding: "16px",
                background: "rgba(30, 41, 59, 0.3)",
                border: `1px solid ${C.bgCard}`, color: C.bgInput,
                fontFamily: FONT,
                fontSize: F.sm, cursor: "pointer", letterSpacing: 1,
              }}
            >
              SKIP ALL ▶▶
            </button>
          )}
          <button
            onClick={handleDismiss}
            style={{
              flex: (allRevealed || isQuick || isSummary) ? 1 : undefined,
              padding: "16px 26px",
              background: (allRevealed || isQuick || isSummary) ? "rgba(74, 222, 128, 0.1)" : "rgba(30, 41, 59, 0.3)",
              border: (allRevealed || isQuick || isSummary) ? `2px solid ${C.green}` : `1px solid ${C.bgCard}`,
              color: (allRevealed || isQuick || isSummary) ? C.green : C.bgInput,
              fontFamily: FONT,
              fontSize: (allRevealed || isQuick || isSummary) ? F.lg : F.sm,
              cursor: "pointer", letterSpacing: 1,
              transition: "all 0.3s ease",
              animation: (allRevealed || isQuick || isSummary) ? "glow 2s ease infinite" : "none",
            }}
          >
            CONTINUE ▶
          </button>
        </div>
      </div>
    </div>
  );
}

