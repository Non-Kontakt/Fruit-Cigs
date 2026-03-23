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
        border: `1px solid ${C.gold}`,
        boxShadow: `0 0 24px rgba(250,204,21,0.2), 0 4px 16px rgba(0,0,0,0.4)`,
        minHeight: mob ? 56 : 64,
      }}>
        {/* Filter tip — icon + held end */}
        <div style={{
          width: mob ? 38 : 46,
          background: `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`,
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: mob ? F.lg : F.h3 }}>{ach.icon}</span>
        </div>

        {/* Pack color strip — inset like a menthol/popper band */}
        <div style={{
          width: mob ? 6 : 8,
          background: `linear-gradient(180deg, ${stripColor} 0%, ${stripColor}cc 100%)`,
          flexShrink: 0,
        }} />

        {/* Body — dark background */}
        <div style={{
          flex: 1,
          background: `linear-gradient(135deg, #1e293b 0%, #2a2a4e 100%)`,
          padding: mob ? "12px 12px" : "14px 16px",
          display: "flex", alignItems: "center",
          position: "relative",
        }}>
          {/* Text content */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: mob ? F.sm : F.md, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ach.name}</div>
            <div style={{ fontSize: mob ? F.micro : F.xs, color: C.textMuted, marginTop: 2 }}>{ach.desc}</div>
          </div>

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
