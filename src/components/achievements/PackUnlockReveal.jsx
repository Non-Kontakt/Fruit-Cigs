import React, { useState, useEffect, useRef } from "react";
import { F, C, FONT, Z } from "../../data/tokens";
import { SFX } from "../../utils/sfx.js";
import { useMobile } from "../../hooks/useMobile.js";
import { CigCard } from "./CigCard.jsx";

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

const AUTO_ADVANCE_MS = 8000;
const REDUCED_MOTION_AUTO_ADVANCE_MS = 10000;
const TEAR_AT_MS = 2100;
const DEAL_AT_MS = 2500;
const DEAL_STAGGER_MS = 280;

// Stepped zigzag tear line (pixel-art serration, not a smooth wave).
const TEAR_CLIP =
  "polygon(0% 100%, 0% 55%, 8% 55%, 8% 100%, 16% 100%, 16% 55%, 24% 55%, 24% 100%, 32% 100%, 32% 55%, 40% 55%, 40% 100%, 48% 100%, 48% 55%, 56% 55%, 56% 100%, 64% 100%, 64% 55%, 72% 55%, 72% 100%, 80% 100%, 80% 55%, 88% 55%, 88% 100%, 96% 100%, 96% 55%, 100% 55%, 100% 100%)";

export function PackUnlockReveal({ pack, bankedIds = [], onDone, isOnHoliday, muteSound = false }) {
  // enter → locked → reveal → torn → dealing → shown → exit
  const [phase, setPhase] = useState("enter");
  const [dealtCount, setDealtCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [paused, setPaused] = useState(false);
  const doneCalledRef = useRef(false);
  const mob = useMobile();
  const reducedMotionRef = useRef(
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  const bankedCount = bankedIds.length;
  const remaining = pack ? pack.packSize - bankedCount : 0;

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
    const timers = [];
    // Phase 1: fade in overlay
    timers.push(setTimeout(() => setPhase("locked"), 50));
    // Phase 2: hold silhouette, play SFX, then reveal
    timers.push(setTimeout(() => {
      if (!muteSound) SFX.reveal();
      setPhase("reveal");
    }, 800));
    if (reducedMotionRef.current) {
      // Reduced motion: no tear/deal choreography — jump to the settled
      // layout with everything already in place.
      timers.push(setTimeout(() => {
        setDealtCount(bankedCount);
        setPhase("shown");
      }, 1400));
      return () => timers.forEach(clearTimeout);
    }
    // Phase 3: the pack tears open
    timers.push(setTimeout(() => setPhase("torn"), TEAR_AT_MS));
    // Phase 4: deal the banked cards one by one
    timers.push(setTimeout(() => setPhase("dealing"), DEAL_AT_MS));
    for (let i = 0; i < bankedCount; i++) {
      timers.push(setTimeout(() => {
        if (!muteSound) SFX.progress();
        setDealtCount(i + 1);
      }, DEAL_AT_MS + 100 + i * DEAL_STAGGER_MS));
    }
    // Phase 5: settled
    timers.push(setTimeout(
      () => setPhase("shown"),
      DEAL_AT_MS + 300 + bankedCount * DEAL_STAGGER_MS
    ));
    return () => timers.forEach(clearTimeout);
  }, [isOnHoliday, bankedCount, muteSound]);

  const handleDismiss = () => {
    if (dismissed) return;
    setDismissed(true);
    setPhase("exit");
    setTimeout(() => {
      if (!doneCalledRef.current) { doneCalledRef.current = true; onDone(); }
    }, 400);
  };

  // Auto-advance once fully settled, paused on hover; cancelled by manual dismiss.
  useEffect(() => {
    if (phase !== "shown" || isOnHoliday || paused) return;
    const ms = reducedMotionRef.current ? REDUCED_MOTION_AUTO_ADVANCE_MS : AUTO_ADVANCE_MS;
    const timer = setTimeout(handleDismiss, ms);
    return () => clearTimeout(timer);
  }, [phase, paused, isOnHoliday]);

  if (!pack) return null;

  const rgb = hexToRgb(pack.color);
  const rgbDark = hexToRgb(pack.colorDark);
  const isRevealed = phase !== "enter" && phase !== "locked" && phase !== "exit";
  const isOpen = phase === "torn" || phase === "dealing" || phase === "shown";
  const overlayVisible = phase !== "enter" && phase !== "exit";
  const lidH = mob ? 34 : 40;

  return (
    <div
      onClick={handleDismiss}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
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
        overflow: "hidden",
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
        @keyframes lidTear {
          0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          60%  { transform: translate(24px, -70px) rotate(9deg); opacity: 1; }
          100% { transform: translate(48px, -130px) rotate(14deg); opacity: 0; }
        }
        @keyframes packJolt {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.04) rotate(-1deg); }
          60%  { transform: scale(0.99) rotate(0.5deg); }
          100% { transform: scale(1); }
        }
        @keyframes cardDeal {
          0%   { transform: translateY(-90px) scale(0.3) rotate(-6deg); opacity: 0; }
          60%  { transform: translateY(8px) scale(1.05) rotate(1deg); opacity: 1; }
          100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes slotFan {
          0%   { transform: translateY(-30px) scale(0.6); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
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
        // Sides set individually (no shorthand): once torn, the top edge is
        // the serrated tear line, not the lid's rounded corners.
        borderLeft: `2px solid ${isRevealed ? `rgba(${rgb}, 0.5)` : C.bgCard}`,
        borderRight: `2px solid ${isRevealed ? `rgba(${rgb}, 0.5)` : C.bgCard}`,
        borderBottom: `2px solid ${isRevealed ? `rgba(${rgb}, 0.5)` : C.bgCard}`,
        borderTop: isOpen
          ? `2px dashed rgba(${rgb}, 0.5)`
          : `2px solid ${isRevealed ? `rgba(${rgb}, 0.5)` : C.bgCard}`,
        borderTopLeftRadius: isOpen ? 2 : 12,
        borderTopRightRadius: isOpen ? 2 : 12,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        transform: phase === "shown" || phase === "dealing"
          ? "scale(1)"
          : phase === "reveal" || phase === "torn"
            ? "scale(1.05)"
            : phase === "locked"
              ? "scale(1)"
              : "scale(0.8)",
        opacity: phase === "enter" ? 0 : 1,
        filter: isRevealed ? "none" : "brightness(0.6)",
        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        animation: phase === "shown"
          ? "packGlow 2.5s ease-in-out infinite"
          : phase === "torn" ? "packJolt 0.4s ease" : undefined,
      }}>
        {/* The lid: flush with the pack top until the tear, then flies off
            along the serrated line. Rendered only while relevant. */}
        {isRevealed && phase !== "shown" && (
          <div style={{
            position: "absolute",
            top: -2,
            left: -2,
            right: -2,
            height: lidH,
            borderRadius: "12px 12px 0 0",
            background: `linear-gradient(160deg, rgba(${rgbDark}, 0.9) 0%, rgba(${rgb}, 0.45) 100%)`,
            border: `2px solid rgba(${rgb}, 0.5)`,
            borderBottom: "none",
            clipPath: TEAR_CLIP,
            zIndex: 2,
            animation: isOpen ? "lidTear 0.6s ease-in forwards" : undefined,
            pointerEvents: "none",
          }} />
        )}

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
          {isRevealed ? pack.icon : "🔒"}
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

      {/* The pull: banked cards dealt face-up out of the torn pack */}
      {(phase === "dealing" || phase === "shown") && bankedCount > 0 && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: mob ? 6 : 10,
          marginTop: 14,
          maxWidth: mob ? 320 : 560,
        }}>
          {bankedIds.slice(0, dealtCount).map((id) => (
            <div key={id} style={{ animation: reducedMotionRef.current ? undefined : "cardDeal 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
              <CigCard achievementId={id} state="collected" scale={mob ? 0.4 : 0.5} />
            </div>
          ))}
        </div>
      )}

      {/* Banked line + the rest of the pack, face down */}
      {phase === "shown" && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          animation: reducedMotionRef.current ? undefined : "slotFan 0.4s ease-out",
        }}>
          {bankedCount > 0 && (
            <div style={{
              fontSize: F.xs, color: pack.color,
              letterSpacing: 1, opacity: 0.8, textAlign: "center",
            }}>
              {bankedCount} CARD{bankedCount !== 1 ? "S" : ""} ALREADY COLLECTED
            </div>
          )}
          {remaining > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex" }}>
                {Array.from({ length: Math.min(remaining, 5) }).map((_, i) => (
                  <div key={i} style={{
                    width: mob ? 18 : 22,
                    height: mob ? 26 : 32,
                    borderRadius: 3,
                    marginLeft: i === 0 ? 0 : -(mob ? 8 : 10),
                    background: `linear-gradient(160deg, rgba(${rgbDark}, 0.9) 0%, rgba(${rgb}, 0.3) 100%)`,
                    border: `1px solid rgba(${rgb}, 0.5)`,
                    transform: `rotate(${(i - Math.min(remaining, 5) / 2) * 4}deg)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: mob ? 8 : 10,
                    color: `rgba(${rgb}, 0.7)`,
                  }}>?</div>
                ))}
              </div>
              <div style={{ fontSize: F.micro, color: C.textMuted, letterSpacing: 1 }}>
                {remaining} TO FIND
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tap to dismiss hint */}
      {phase === "shown" && (
        <div style={{
          fontSize: F.xs,
          color: C.textDim,
          marginTop: 22,
          opacity: 0.5,
          letterSpacing: 1,
        }}>
          TAP TO CONTINUE
        </div>
      )}
    </div>
  );
}
