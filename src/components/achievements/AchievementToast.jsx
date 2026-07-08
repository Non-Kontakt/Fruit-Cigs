import React, { useState, useEffect, useRef } from "react";
import { ACHIEVEMENTS } from "../../data/achievements.js";
import { SFX } from "../../utils/sfx.js";
import { F, C, FONT, Z } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";

const AUTO_DISMISS_MS = 5000;
const REDUCED_MOTION_DISMISS_MS = 6000;

export function AchievementToast({ achievement, onDone, muteSound, sealedPack }) {
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const mob = useMobile();
  const dismissedRef = useRef(false);
  const touchStartY = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const reducedMotionRef = useRef(
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    if (!muteSound) SFX.achievement();
  }, [muteSound]);

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    setVisible(false);
    setSwipeOffset(0);
    setTimeout(onDone, 400);
  };

  // Reduced motion: no drain bar animation, just a plain timeout.
  useEffect(() => {
    if (!reducedMotionRef.current) return;
    fallbackTimerRef.current = setTimeout(dismiss, REDUCED_MOTION_DISMISS_MS);
    return () => { if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current); };
  }, []);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    setPaused(true);
  };
  const handleTouchMove = (e) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy < 0) setSwipeOffset(dy);
  };
  const handleTouchEnd = () => {
    if (swipeOffset < -40) dismiss();
    else setSwipeOffset(0);
    touchStartY.current = null;
    setPaused(false);
  };

  const ach = ACHIEVEMENTS.find(a => a.id === achievement);
  if (!ach) { setTimeout(onDone, 100); return null; }

  return (
    <div
      onClick={dismiss}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "fixed",
        top: mob ? `calc(8px + env(safe-area-inset-top, 0px))` : 20,
        left: mob ? 8 : "50%",
        transform: mob ? `translateY(${visible ? swipeOffset : -80}px)` : `translateX(-50%) translateY(${visible ? swipeOffset : -80}px)`,
        zIndex: Z.modal, fontFamily: FONT,
        transition: swipeOffset !== 0 ? "opacity 0.4s ease" : "transform 0.4s ease, opacity 0.4s ease",
        opacity: visible ? 1 : 0, cursor: "pointer",
        width: mob ? "calc(100% - 16px)" : "auto",
        maxWidth: mob ? "none" : 480,
      }}
    >
      <style>{`
        @keyframes achToastDrain {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div style={{
        position: "relative",
        overflow: "hidden",
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
          <div style={{ fontSize: mob ? F.micro : F.xs, color: C.gold, letterSpacing: mob ? 1 : 2, marginBottom: 4 }}>CIG CARD UNLOCKED</div>
          <div style={{ fontSize: mob ? F.sm : F.md, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ach.name}</div>
          <div style={{ fontSize: mob ? F.micro : F.xs, color: C.textMuted, marginTop: 2 }}>{ach.desc}</div>
          {sealedPack && (
            <div style={{ fontSize: F.micro, color: C.textDim, letterSpacing: 2, marginTop: 4 }}>FILED TO A SEALED PACK</div>
          )}
        </div>
        {!reducedMotionRef.current && (
          <div
            onAnimationEnd={dismiss}
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              height: 3,
              width: "100%",
              background: C.green,
              opacity: 0.6,
              animation: `achToastDrain ${AUTO_DISMISS_MS}ms linear forwards`,
              animationPlayState: paused ? "paused" : "running",
            }}
          />
        )}
      </div>
    </div>
  );
}
