import React, { useState, useEffect, useRef } from "react";
import { ACHIEVEMENTS } from "../../data/achievements.js";
import { ACH_TO_PACK, CIG_PACKS } from "../../data/cigPacks.js";
import { SFX } from "../../utils/sfx.js";
import { F, C, FONT, Z } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";

export function AchievementToast({ achievement, onDone, muteSound }) {
  const [visible, setVisible] = useState(false);
  const mob = useMobile();
  const dismissedRef = useRef(false);
  const touchStartY = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    if (!muteSound) SFX.achievement();
    // Inject cigBurn keyframe if not already present
    if (!document.getElementById("cig-toast-styles")) {
      const style = document.createElement("style");
      style.id = "cig-toast-styles";
      style.textContent = `@keyframes cigBurn { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }`;
      document.head.appendChild(style);
    }
  }, [muteSound]);

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setVisible(false);
    setSwipeOffset(0);
    setTimeout(onDone, 400);
  };

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy < 0) setSwipeOffset(dy);
  };
  const handleTouchEnd = () => {
    if (swipeOffset < -40) dismiss();
    else setSwipeOffset(0);
    touchStartY.current = null;
  };

  const ach = ACHIEVEMENTS.find(a => a.id === achievement);
  if (!ach) { setTimeout(onDone, 100); return null; }

  // Look up pack color for the filter-end strip
  const packId = ACH_TO_PACK[achievement];
  const pack = packId ? CIG_PACKS.find(p => p.id === packId) : null;
  const stripColor = pack?.color || C.gold;

  return (
    <div
      onClick={dismiss}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", top: mob ? "calc(10px + env(safe-area-inset-top, 0px))" : 20, left: "50%",
        transform: `translateX(-50%) translateY(${visible ? swipeOffset : -80}px)`,
        zIndex: Z.modal, fontFamily: FONT,
        transition: swipeOffset !== 0 ? "opacity 0.4s ease" : "transform 0.4s ease, opacity 0.4s ease",
        opacity: visible ? 1 : 0, cursor: "pointer",
        width: mob ? "calc(100% - 24px)" : "auto",
        maxWidth: mob ? "none" : 520,
      }}
    >
      {/* Cigarette shape */}
      <div style={{
        display: "flex", alignItems: "stretch",
        borderRadius: 6,
        overflow: "hidden",
        boxShadow: `0 0 20px ${stripColor}25, 0 4px 16px rgba(0,0,0,0.4)`,
        minHeight: mob ? 56 : 64,
      }}>
        {/* Filter end — pack color strip */}
        <div style={{
          width: mob ? 10 : 14,
          background: `linear-gradient(180deg, ${stripColor} 0%, ${stripColor}cc 100%)`,
          flexShrink: 0,
        }} />

        {/* Paper body — main content area */}
        <div style={{
          flex: 1,
          background: "linear-gradient(90deg, #f5f0e8 0%, #ede8dd 60%, #e8e0d0 100%)",
          padding: mob ? "10px 12px" : "12px 16px",
          display: "flex", alignItems: "center", gap: mob ? 8 : 12,
          position: "relative",
          // Subtle paper texture
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.015) 3px, rgba(0,0,0,0.015) 4px)",
        }}>
          {/* Achievement icon */}
          <span style={{ fontSize: mob ? F.md : F.lg, flexShrink: 0 }}>{ach.icon}</span>

          {/* Text content */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: mob ? F.micro : F.xs, color: stripColor, letterSpacing: mob ? 1 : 2, marginBottom: 2, fontWeight: "bold" }}>CIG UNLOCKED</div>
            <div style={{ fontSize: mob ? F.xs : F.sm, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "bold" }}>{ach.name}</div>
            <div style={{ fontSize: mob ? F.micro : F.xs, color: "#64748b", marginTop: 1 }}>{ach.desc}</div>
          </div>

          {/* Pack icon badge */}
          {pack && (
            <span style={{
              fontSize: mob ? F.sm : F.md, flexShrink: 0,
              opacity: 0.7,
            }}>{pack.icon}</span>
          )}
        </div>

        {/* Burning end — ember glow */}
        <div style={{
          width: mob ? 16 : 22,
          flexShrink: 0,
          background: "linear-gradient(90deg, #e8e0d0 0%, #d4a574 20%, #f97316 50%, #ef4444 80%, #991b1b 100%)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Animated ember glow */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(circle at 70% 50%, rgba(251,146,60,0.9) 0%, rgba(239,68,68,0.6) 40%, transparent 70%)",
            animation: "cigBurn 1.5s ease-in-out infinite",
          }} />
          {/* Ash tip */}
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 4,
            background: "linear-gradient(180deg, #9ca3af 0%, #6b7280 50%, #9ca3af 100%)",
          }} />
        </div>
      </div>
    </div>
  );
}
