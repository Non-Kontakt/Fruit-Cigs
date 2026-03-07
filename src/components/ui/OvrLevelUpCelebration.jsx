import React, { useState, useEffect, useRef } from "react";
import { F, C, FONT, Z } from "../../data/tokens";
import { getAttrColor, getPosColor } from "../../utils/calc.js";
import { SFX } from "../../utils/sfx.js";

export function OvrLevelUpCelebration({ levelUps, onDone, isOnHoliday, ovrCap = 20 }) {
  const [visible, setVisible] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [numberVisible, setNumberVisible] = useState(false);
  const transitioning = useRef(false);
  const mob = window.innerWidth <= 768;

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    if (!isOnHoliday) SFX.ovrUp();
    setTimeout(() => setNumberVisible(true), 400);
  }, [currentIdx, isOnHoliday]);

  // Auto-close when on holiday
  useEffect(() => {
    if (isOnHoliday) {
      const timer = setTimeout(() => onDone(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOnHoliday, onDone]);

  const handleNext = () => {
    if (transitioning.current) return;
    transitioning.current = true;
    if (currentIdx < levelUps.length - 1) {
      setNumberVisible(false);
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
        transitioning.current = false;
      }, 200);
    } else {
      setVisible(false);
      setTimeout(() => {
        transitioning.current = false;
        try { onDone(); } catch(e) { console.error("OVR onDone error:", e); }
      }, 400);
    }
  };

  const player = levelUps[currentIdx];
  if (!player) return null;
  const ovrColor = getAttrColor(player.newOvr, ovrCap);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: Z.celebration,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.85)",
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? "auto" : "none",
      transition: "opacity 0.4s ease",
      fontFamily: FONT,
    }}>
      <style>{`
        @keyframes ovrPulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.05); filter: brightness(1.2); }
        }
        @keyframes ovrGlow {
          0%, 100% { box-shadow: 0 0 30px ${ovrColor}44, 0 0 60px ${ovrColor}22; }
          50% { box-shadow: 0 0 50px ${ovrColor}66, 0 0 100px ${ovrColor}33, 0 0 150px ${ovrColor}11; }
        }
        @keyframes numberSlam {
          0% { transform: scale(3); opacity: 0; }
          60% { transform: scale(0.9); opacity: 1; }
          80% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes arrowFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes barFill {
          0% { width: ${(player.oldOvr / 20) * 100}%; }
          100% { width: ${(player.newOvr / 20) * 100}%; }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div style={{
        background: "linear-gradient(170deg, #0f172a 0%, #0a0a1a 40%, #0f172a 100%)",
        border: `2px solid ${ovrColor}`,
        padding: mob ? "37px 28px" : "55px 64px",
        maxWidth: 520, width: mob ? "94%" : "85%",
        textAlign: "center",
        transform: visible ? "scale(1)" : "scale(0.8)",
        transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        animation: "ovrGlow 2s ease infinite",
        position: "relative", overflow: "hidden",
      }}>
        {/* Shimmer sweep */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, width: "50%", height: "100%",
            background: `linear-gradient(105deg, transparent 0%, ${ovrColor}08 40%, ${ovrColor}15 50%, ${ovrColor}08 60%, transparent 100%)`,
            animation: "shimmerSweep 3s ease infinite",
          }} />
        </div>

        {/* Arrow up icon */}
        <div style={{
          fontSize: F.h1, marginBottom: 9,
          animation: "arrowFloat 1.5s ease infinite",
        }}>⬆</div>

        {/* OVERALL UP label */}
        <div style={{
          fontSize: mob ? F.md : F.lg, color: ovrColor, letterSpacing: 3, marginBottom: 5,
          textShadow: `0 0 10px ${ovrColor}88`,
          animation: "ovrPulse 2s ease infinite",
        }}>
          OVERALL UP
        </div>

        {/* Position + Name */}
        <div style={{ marginBottom: 23, marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, flexWrap: "wrap" }}>
          <span style={{
            background: getPosColor(player.position), color: C.bg,
            padding: "5px 12px", fontSize: mob ? F.sm : F.md, fontWeight: "bold",
          }}>{player.position}</span>
          <span style={{ fontSize: mob ? F.md : F.lg, color: C.text }}>
            {player.name}
          </span>
        </div>

        {/* Big OVR number with slam animation */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: mob ? 14 : 23, marginBottom: 23,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: mob ? F.h1 : F.hero, color: C.slate, fontWeight: "bold", lineHeight: 1 }}>
              {player.oldOvr}
            </div>
            <div style={{ fontSize: F.xs, color: C.bgInput, marginTop: 5 }}>WAS</div>
          </div>

          <div style={{ fontSize: F.h3, color: ovrColor }}>→</div>

          <div style={{
            textAlign: "center",
            animation: numberVisible ? "numberSlam 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" : "none",
            opacity: numberVisible ? 1 : 0,
          }}>
            <div style={{
              fontSize: F.hero, color: ovrColor, fontWeight: "bold", lineHeight: 1,
              textShadow: `0 0 20px ${ovrColor}99, 0 0 40px ${ovrColor}44, 0 0 80px ${ovrColor}22`,
            }}>
              {player.newOvr}
            </div>
            <div style={{ fontSize: F.xs, color: ovrColor, marginTop: 4, opacity: 0.7 }}>NOW</div>
          </div>
        </div>

        {/* OVR progress bar */}
        <div style={{
          width: "80%", margin: "0 auto 24px", height: 6,
          background: "rgba(30,41,59,0.5)", border: `1px solid ${C.bgCard}`,
          overflow: "hidden", position: "relative",
        }}>
          <div style={{
            height: "100%",
            background: `linear-gradient(90deg, ${ovrColor}88, ${ovrColor})`,
            animation: "barFill 0.8s ease 0.3s both",
            boxShadow: `0 0 8px ${ovrColor}66`,
          }} />
        </div>

        {/* Multi-player indicator */}
        {levelUps.length > 1 && (
          <div style={{ fontSize: F.xs, color: C.slate, marginBottom: 16 }}>
            {currentIdx + 1} of {levelUps.length} players levelled up
          </div>
        )}

        {/* Continue button */}
        <button onClick={handleNext} style={{
          padding: mob ? "16px 32px" : "18px 42px",
          background: `${ovrColor}15`,
          border: `2px solid ${ovrColor}`,
          color: ovrColor,
          fontFamily: FONT,
          fontSize: F.md,
          cursor: "pointer", letterSpacing: 2,
          transition: "all 0.2s ease",
          animation: "ovrPulse 2s ease infinite",
        }}>
          {currentIdx < levelUps.length - 1 ? "NEXT ▶" : "CONTINUE ▶"}
        </button>
      </div>
    </div>
  );
}
