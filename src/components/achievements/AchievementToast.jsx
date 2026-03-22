import React, { useState, useEffect, useRef } from "react";
import { ACHIEVEMENTS } from "../../data/achievements.js";
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
  }, [muteSound]);

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setVisible(false);
    setSwipeOffset(0);
    setTimeout(onDone, 400);
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy < 0) setSwipeOffset(dy); // only track upward swipes
  };
  const handleTouchEnd = () => {
    if (swipeOffset < -40) dismiss(); // swiped up enough
    else setSwipeOffset(0);
    touchStartY.current = null;
  };

  const ach = ACHIEVEMENTS.find(a => a.id === achievement);
  if (!ach) { setTimeout(onDone, 100); return null; }

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
        maxWidth: mob ? "none" : 480,
      }}
    >
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1a1a3e 100%)",
        border: "1px solid #1e293b",
        borderLeft: `4px solid ${C.gold}`,
        padding: mob ? "14px 12px" : "16px 20px",
        borderRadius: 6,
        boxShadow: "0 0 24px rgba(250,204,21,0.15)",
        display: "flex", alignItems: "center", gap: mob ? 10 : 14,
      }}>
        <span style={{ fontSize: mob ? F.lg : F.h3, flexShrink: 0 }}>{ach.icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: mob ? F.micro : F.xs, color: C.gold, letterSpacing: mob ? 1 : 2, marginBottom: 4 }}>ACHIEVEMENT UNLOCKED</div>
          <div style={{ fontSize: mob ? F.sm : F.md, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ach.name}</div>
          <div style={{ fontSize: mob ? F.micro : F.xs, color: C.textMuted, marginTop: 2 }}>{ach.desc}</div>
        </div>
      </div>
    </div>
  );
}

// Achievement cabinet screen
// Youth Intake screen
