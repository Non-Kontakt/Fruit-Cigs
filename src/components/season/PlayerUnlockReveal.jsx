import React, { useState, useEffect } from "react";
import { ATTRIBUTES } from "../../data/training.js";
import { SFX } from "../../utils/sfx.js";
import { F, C, FONT, Z } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";

export function PlayerUnlockReveal({ players, onDone }) {
  const [playerIdx, setPlayerIdx] = useState(0);
  const [phase, setPhase] = useState(0); // 0=dark, 1=silhouette, 2=revealed, 3=stats
  const [statIndex, setStatIndex] = useState(-1);
  const mob = useMobile();

  const player = players[playerIdx];
  const isLast = playerIdx >= players.length - 1;

  useEffect(() => {
    SFX.playerUnlock();
    setTimeout(() => setPhase(1), 600);
  }, [playerIdx]);

  const handleNext = (e) => {
    e.stopPropagation();
    if (phase === 1) {
      setPhase(2);
      SFX.reveal();
    } else if (phase === 2) {
      setPhase(3);
      setStatIndex(0);
      SFX.reveal();
    } else if (phase === 3) {
      if (statIndex < ATTRIBUTES.length - 1) {
        setStatIndex(prev => prev + 1);
        SFX.reveal();
      } else if (!isLast) {
        setPlayerIdx(prev => prev + 1);
        setPhase(0);
        setStatIndex(-1);
        setTimeout(() => setPhase(0), 50);
      } else {
        onDone();
      }
    }
  };

  const posColor = {
    GK: C.gold, CB: C.green, LB: C.green, RB: C.green,
    CM: C.blue, AM: C.blue, LW: C.lightRed, RW: C.lightRed, ST: C.lightRed,
  }[player.position] || C.textMuted;

  const allStatsRevealed = phase === 3 && statIndex >= ATTRIBUTES.length - 1;
  const buttonLabel = phase === 1 ? "REVEAL PLAYER"
    : phase === 2 ? "SHOW STATS"
    : allStatsRevealed && !isLast ? "NEXT PLAYER"
    : allStatsRevealed ? "ADD TO SQUAD"
    : "NEXT STAT";

  const buttonColor = allStatsRevealed ? C.green : C.gold;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: Z.modalHigh,
      background: "rgba(0,0,0,0.95)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT,
    }}>
      <div style={{
        textAlign: "center", maxWidth: mob ? 340 : 420, width: "95%",
      }}>
        {/* Title */}
        <div style={{
          fontSize: mob ? F.xs : F.sm, letterSpacing: mob ? 2 : 4, marginBottom: mob ? 20 : 30,
          color: C.gold,
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}>
          {players.length > 1
            ? `⭐ PLAYER ${playerIdx + 1} OF ${players.length} UNLOCKED ⭐`
            : "⭐ NEW PLAYER UNLOCKED ⭐"}
        </div>

        {/* Player card — fixed height to prevent content shift */}
        <div style={{
          background: phase >= 2
            ? "linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(250,204,21,0.08) 100%)"
            : "rgba(15,15,35,0.8)",
          border: phase >= 2 ? `2px solid ${C.green}` : `2px solid ${C.bgInput}`,
          padding: mob ? "24px 16px 20px" : "40px 30px 30px",
          transition: "all 0.5s ease",
          boxShadow: phase >= 2 ? "0 0 40px rgba(74,222,128,0.2)" : "none",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          {/* Position badge */}
          <div style={{
            display: "inline-block",
            padding: mob ? "4px 12px" : "6px 16px", marginBottom: mob ? 14 : 20,
            fontSize: mob ? F.md : F.lg, letterSpacing: mob ? 2 : 3,
            background: phase >= 2 ? `${posColor}20` : C.bgCard,
            border: phase >= 2 ? `2px solid ${posColor}` : `2px solid ${C.bgInput}`,
            color: phase >= 2 ? posColor : C.bgInput,
            transition: "all 0.5s ease",
          }}>
            {phase >= 2 ? player.position : "??"}
          </div>

          {/* Name */}
          <div style={{
            fontSize: phase >= 2 ? (mob ? F.xl : F.h3) : (mob ? F.h3 : F.h1),
            color: phase >= 2 ? C.text : C.bgInput,
            marginBottom: 8,
            transition: "all 0.5s ease",
            letterSpacing: phase >= 2 ? 1 : 4,
          }}>
            {phase >= 2 ? player.name : "???"}
          </div>

          {/* Age */}
          <div style={{
            fontSize: F.sm, color: phase >= 2 ? C.textDim : "transparent",
            marginBottom: 26,
            transition: "color 0.5s ease",
          }}>
            Age {player.age}
          </div>

          {/* Stats — always rendered, visibility controlled */}
          <div style={{
            display: "flex", gap: mob ? 4 : 8, justifyContent: "center", marginBottom: mob ? 14 : 20,
            width: "100%", flexWrap: mob ? "wrap" : "nowrap",
            opacity: phase >= 3 ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}>
            {ATTRIBUTES.map((a, i) => {
              const revealed = phase >= 3 && i <= statIndex;
              const val = player.attrs[a.key];
              return (
                <div key={a.key} style={{
                  textAlign: "center", flex: mob ? "0 0 auto" : 1,
                  width: mob ? "22%" : "auto",
                  opacity: revealed ? 1 : 0.15,
                  transform: revealed ? "scale(1)" : "scale(0.8)",
                  transition: "all 0.3s ease",
                }}>
                  <div style={{
                    fontSize: mob ? F.micro : F.xs, color: C.textDim, letterSpacing: 1, marginBottom: mob ? 3 : 5,
                  }}>{a.label}</div>
                  <div style={{
                    fontSize: mob ? F.lg : F.xl, fontWeight: "bold",
                    color: revealed
                      ? (val >= 16 ? C.green : val >= 12 ? C.gold : C.textMuted)
                      : C.bgCard,
                    transition: "color 0.3s ease",
                  }}>
                    {revealed ? val : "?"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Flavour text — always rendered, visibility controlled */}
          <div style={{
            fontSize: F.xs, color: C.textDim, fontStyle: "italic",
            marginBottom: mob ? 18 : 26, paddingTop: mob ? 12 : 16, borderTop: `1px solid ${C.bgCard}`,
            width: "100%",
            opacity: allStatsRevealed ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}>
            "{player.flavour}"
          </div>

          {/* Action button */}
          <button onClick={handleNext} style={{
            background: `${buttonColor}18`,
            border: `2px solid ${buttonColor}`,
            color: buttonColor,
            padding: mob ? "12px 24px" : "14px 36px",
            fontSize: mob ? F.sm : F.md, letterSpacing: mob ? 2 : 3,
            cursor: "pointer",
            fontFamily: FONT,
            transition: "all 0.3s ease",
            opacity: phase >= 1 ? 1 : 0,
            pointerEvents: phase >= 1 ? "auto" : "none",
          }}>
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
