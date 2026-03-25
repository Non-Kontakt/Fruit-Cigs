import React, { useState, useEffect, useRef } from "react";
import { F, C, FONT, Z } from "../../data/tokens";
import { getPosColor } from "../../utils/calc.js";
import { displayName } from "../../utils/player.js";
import { SFX } from "../../utils/sfx.js";
import { useMobile } from "../../hooks/useMobile.js";

const AMBER = "#f59e0b";
const AMBER_DARK = "#92400e";
const AMBER_GLOW = "#fbbf24";

export function BreakoutPopup({ breakouts, onDone, isOnHoliday }) {
  const [visible, setVisible] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const transitioning = useRef(false);
  const mob = useMobile();

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    if (!isOnHoliday) SFX.breakout();
    setTimeout(() => setStatsVisible(true), 600);
  }, [currentIdx, isOnHoliday]);

  useEffect(() => {
    if (isOnHoliday) {
      const timer = setTimeout(() => onDone(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOnHoliday, onDone]);

  const handleNext = () => {
    if (transitioning.current) return;
    transitioning.current = true;
    if (currentIdx < breakouts.length - 1) {
      setStatsVisible(false);
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
        transitioning.current = false;
      }, 200);
    } else {
      setVisible(false);
      setTimeout(() => {
        transitioning.current = false;
        try { onDone(); } catch (e) { console.error("Breakout onDone error:", e); }
      }, 400);
    }
  };

  const bo = breakouts[currentIdx];
  if (!bo) return null;

  const gainEntries = Object.entries(bo.attrGains).filter(([, v]) => v > 0);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: Z.celebration,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.88)",
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? "auto" : "none",
      transition: "opacity 0.4s ease",
      fontFamily: FONT,
    }}>
      <style>{`
        @keyframes breakoutPulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.03); filter: brightness(1.15); }
        }
        @keyframes breakoutGlow {
          0%, 100% { box-shadow: 0 0 30px ${AMBER}33, 0 0 60px ${AMBER_DARK}22; }
          50% { box-shadow: 0 0 50px ${AMBER}55, 0 0 100px ${AMBER_DARK}33, 0 0 150px ${AMBER_DARK}11; }
        }
        @keyframes labelSlam {
          0% { transform: scale(2.5); opacity: 0; }
          50% { transform: scale(0.92); opacity: 1; }
          75% { transform: scale(1.06); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes statSlide {
          0% { transform: translateX(-12px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes fireFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.1); }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div style={{
        background: `linear-gradient(170deg, ${AMBER_DARK}22 0%, #0a0a1a 35%, ${AMBER_DARK}15 100%)`,
        border: `2px solid ${AMBER}`,
        padding: mob ? "32px 24px" : "48px 56px",
        maxWidth: 520, width: mob ? "94%" : "85%",
        textAlign: "center",
        transform: visible ? "scale(1)" : "scale(0.8)",
        transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        animation: "breakoutGlow 2.5s ease infinite",
        position: "relative", overflow: "hidden",
      }}>
        {/* Shimmer sweep */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, width: "50%", height: "100%",
            background: `linear-gradient(105deg, transparent 0%, ${AMBER}06 40%, ${AMBER}12 50%, ${AMBER}06 60%, transparent 100%)`,
            animation: "shimmerSweep 3.5s ease infinite",
          }} />
        </div>

        {/* Fire icon */}
        <div style={{
          fontSize: F.hero, marginBottom: 6,
          animation: "fireFloat 1.8s ease infinite",
        }}>*</div>

        {/* BREAKOUT label */}
        <div style={{
          fontSize: mob ? F.md : F.lg, color: AMBER_GLOW, letterSpacing: 4, marginBottom: 4,
          textShadow: `0 0 12px ${AMBER}88, 0 0 24px ${AMBER_DARK}66`,
          animation: "breakoutPulse 2.5s ease infinite",
        }}>
          BREAKOUT
        </div>

        {/* Trigger label */}
        <div style={{
          fontSize: mob ? F.sm : F.md, color: AMBER, marginBottom: 16, marginTop: 2,
          animation: "labelSlam 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both",
        }}>
          {bo.trigger.label}
        </div>

        {/* Position + Name */}
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, flexWrap: "wrap" }}>
          <span style={{
            background: getPosColor(bo.position), color: C.bg,
            padding: "5px 12px", fontSize: mob ? F.sm : F.md, fontWeight: "bold",
          }}>{bo.position}</span>
          <span style={{ fontSize: mob ? F.md : F.lg, color: C.text }}>
            {displayName(bo.playerName, mob)}
          </span>
        </div>

        {/* Narrative */}
        <div style={{
          fontSize: F.sm, color: C.slate, marginBottom: 20,
          lineHeight: 1.6, fontStyle: "italic",
          maxWidth: 380, margin: "0 auto 20px",
        }}>
          {bo.playerName.split(" ").pop()} {bo.trigger.narrative}
        </div>

        {/* Attr gains */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          marginBottom: 8,
        }}>
          {gainEntries.map(([attr, gain], idx) => (
            <div key={attr} style={{
              display: "flex", alignItems: "center", gap: 10,
              animation: statsVisible ? `statSlide 0.3s ease ${idx * 0.1}s both` : "none",
              opacity: statsVisible ? 1 : 0,
            }}>
              <span style={{
                fontSize: F.sm, color: C.slate,
                textTransform: "uppercase", letterSpacing: 1,
                width: 100, textAlign: "right",
              }}>{attr}</span>
              <span style={{
                fontSize: mob ? F.md : F.lg, color: AMBER_GLOW, fontWeight: "bold",
                textShadow: `0 0 8px ${AMBER}66`,
              }}>+{gain}</span>
            </div>
          ))}
          {bo.potentialGain > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              animation: statsVisible ? `statSlide 0.3s ease ${gainEntries.length * 0.1}s both` : "none",
              opacity: statsVisible ? 1 : 0,
            }}>
              <span style={{
                fontSize: F.sm, color: C.slate,
                textTransform: "uppercase", letterSpacing: 1,
                width: 100, textAlign: "right",
              }}>potential</span>
              <span style={{
                fontSize: mob ? F.md : F.lg, color: "#a78bfa", fontWeight: "bold",
                textShadow: "0 0 8px #a78bfa66",
              }}>+{bo.potentialGain}</span>
            </div>
          )}
        </div>

        {/* Multi-breakout indicator */}
        {breakouts.length > 1 && (
          <div style={{ fontSize: F.xs, color: C.slate, marginBottom: 14, marginTop: 10 }}>
            {currentIdx + 1} of {breakouts.length} breakouts
          </div>
        )}

        {/* Continue button */}
        <button onClick={handleNext} style={{
          padding: mob ? "14px 28px" : "16px 38px",
          background: `${AMBER}12`,
          border: `2px solid ${AMBER}`,
          color: AMBER_GLOW,
          fontFamily: FONT,
          fontSize: F.md,
          cursor: "pointer", letterSpacing: 2,
          transition: "all 0.2s ease",
          marginTop: 10,
          animation: "breakoutPulse 2.5s ease infinite",
        }}>
          {currentIdx < breakouts.length - 1 ? "NEXT >" : "CONTINUE >"}
        </button>
      </div>
    </div>
  );
}
