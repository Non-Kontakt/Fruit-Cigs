import React, { useState, useEffect, useRef } from "react";
import { F, C, FONT, Z } from "../../data/tokens";
import { SFX } from "../../utils/sfx.js";
import { useMobile } from "../../hooks/useMobile.js";

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

export function PackUnlockReveal({ pack, onDone, isOnHoliday }) {
  const [phase, setPhase] = useState("enter");   // enter → locked → reveal → shown → exit
  const [dismissed, setDismissed] = useState(false);
  const doneCalledRef = useRef(false);
  const mob = useMobile();

  // Auto-close when on holiday
  useEffect(() => {
    if (isOnHoliday) {
      const timer = setTimeout(() => {
        if (!doneCalledRef.current) { doneCalledRef.current = true; onDone(); }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOnHoliday, onDone]);

  // Animation sequence
  useEffect(() => {
    if (isOnHoliday) return;
    // Phase 1: fade in overlay
    const t1 = setTimeout(() => setPhase("locked"), 50);
    // Phase 2: hold silhouette, play SFX, then reveal
    const t2 = setTimeout(() => {
      SFX.reveal();
      setPhase("reveal");
    }, 800);
    // Phase 3: shown (fully revealed)
    const t3 = setTimeout(() => setPhase("shown"), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isOnHoliday]);

  const handleDismiss = () => {
    if (dismissed) return;
    setDismissed(true);
    setPhase("exit");
    setTimeout(() => {
      if (!doneCalledRef.current) { doneCalledRef.current = true; onDone(); }
    }, 400);
  };

  if (!pack) return null;

  const rgb = hexToRgb(pack.color);
  const rgbDark = hexToRgb(pack.colorDark);
  const isRevealed = phase === "reveal" || phase === "shown";
  const overlayVisible = phase !== "enter" && phase !== "exit";

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z.celebration,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.88)",
        opacity: overlayVisible ? 1 : 0,
        pointerEvents: overlayVisible ? "auto" : "none",
        transition: "opacity 0.3s ease",
        fontFamily: FONT,
        cursor: "pointer",
      }}
    >
      <style>{`
        @keyframes packGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(${rgb}, 0.2), 0 0 40px rgba(${rgb}, 0.1); }
          50%      { box-shadow: 0 0 35px rgba(${rgb}, 0.4), 0 0 70px rgba(${rgb}, 0.15), 0 0 100px rgba(${rgb}, 0.05); }
        }
        @keyframes packFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes packShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes headerPulse {
          0%, 100% { opacity: 1; text-shadow: 0 0 12px rgba(250,204,21,0.5); }
          50%      { opacity: 0.85; text-shadow: 0 0 24px rgba(250,204,21,0.8), 0 0 48px rgba(250,204,21,0.3); }
        }
        @keyframes stampReveal {
          0%   { transform: scale(2.5); opacity: 0; }
          50%  { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* "NEW PACK UNLOCKED" header */}
      <div style={{
        fontSize: mob ? F.sm : F.lg,
        color: C.gold,
        letterSpacing: 3,
        marginBottom: 20,
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        animation: phase === "shown" ? "headerPulse 2s ease infinite" : undefined,
        textAlign: "center",
      }}>
        NEW PACK UNLOCKED
      </div>

      {/* Pack card */}
      <div style={{
        position: "relative",
        width: mob ? 200 : 240,
        minHeight: mob ? 260 : 300,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: mob ? "24px 16px" : "32px 24px",
        // Locked state: dark silhouette; Revealed: pack colors
        background: isRevealed
          ? `linear-gradient(160deg, rgba(${rgbDark}, 0.25) 0%, rgba(${rgb}, 0.08) 100%)`
          : "rgba(15,15,35,0.9)",
        border: isRevealed
          ? `2px solid rgba(${rgb}, 0.5)`
          : `2px solid ${C.bgCard}`,
        transform: phase === "shown"
          ? "scale(1)"
          : phase === "reveal"
            ? "scale(1.05)"
            : phase === "locked"
              ? "scale(1)"
              : "scale(0.8)",
        opacity: phase === "enter" ? 0 : 1,
        filter: isRevealed ? "none" : "brightness(0.6)",
        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        animation: phase === "shown" ? "packGlow 2.5s ease-in-out infinite" : undefined,
      }}>
        {/* Background texture — diagonal lines (only when revealed) */}
        {isRevealed && (
          <div style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 8px,
              rgba(${rgb}, 1) 8px,
              rgba(${rgb}, 1) 9px
            )`,
            pointerEvents: "none",
          }} />
        )}

        {/* Shimmer sweep when revealed */}
        {isRevealed && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, width: "50%", height: "100%",
              background: `linear-gradient(105deg, transparent 0%, rgba(${rgb}, 0.03) 40%, rgba(${rgb}, 0.08) 50%, rgba(${rgb}, 0.03) 60%, transparent 100%)`,
              animation: "packShimmer 3s ease infinite",
            }} />
          </div>
        )}

        {/* Cross-hatch for locked state */}
        {!isRevealed && (
          <div style={{
            position: "absolute",
            inset: 0,
            opacity: 0.03,
            backgroundImage: `repeating-linear-gradient(
              45deg, transparent, transparent 6px,
              rgba(255,255,255,1) 6px, rgba(255,255,255,1) 7px
            ), repeating-linear-gradient(
              -45deg, transparent, transparent 6px,
              rgba(255,255,255,1) 6px, rgba(255,255,255,1) 7px
            )`,
            pointerEvents: "none",
          }} />
        )}

        {/* Icon: lock when locked, fruit emoji when revealed */}
        <div style={{
          fontSize: mob ? 48 : 56,
          lineHeight: 1,
          position: "relative",
          zIndex: 1,
          opacity: isRevealed ? 1 : 0.5,
          filter: isRevealed
            ? `drop-shadow(0 0 12px rgba(${rgb}, 0.5))`
            : "none",
          animation: phase === "shown" ? "packFloat 2s ease-in-out infinite" : undefined,
          transition: "opacity 0.4s ease, filter 0.4s ease",
        }}>
          {isRevealed ? pack.icon : "\uD83D\uDD12"}
        </div>

        {/* Pack name or ??? */}
        <div style={{
          fontFamily: FONT,
          fontSize: mob ? F.sm : F.md,
          color: isRevealed ? pack.color : C.textDim,
          letterSpacing: 1,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          textShadow: isRevealed
            ? `0 0 12px rgba(${rgb}, 0.5)`
            : "none",
          animation: phase === "shown" ? "stampReveal 0.5s ease-out" : undefined,
          transition: "color 0.4s ease",
          lineHeight: 1.4,
        }}>
          {isRevealed ? pack.name : "???"}
        </div>

        {/* Pack size label */}
        {isRevealed && (
          <div style={{
            fontFamily: FONT,
            fontSize: F.micro,
            color: C.textMuted,
            position: "relative",
            zIndex: 1,
            opacity: 0.7,
          }}>
            {pack.packSize} PACK
          </div>
        )}
      </div>

      {/* Pack name below card in pack color */}
      <div style={{
        fontSize: mob ? F.md : F.lg,
        color: pack.color,
        letterSpacing: 2,
        marginTop: 20,
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
        textShadow: `0 0 16px rgba(${rgb}, 0.4)`,
        textAlign: "center",
      }}>
        {pack.name}
      </div>

      {/* Tap to dismiss hint */}
      {phase === "shown" && (
        <div style={{
          fontSize: F.xs,
          color: C.textDim,
          marginTop: 28,
          opacity: 0.5,
          letterSpacing: 1,
        }}>
          TAP TO CONTINUE
        </div>
      )}
    </div>
  );
}
