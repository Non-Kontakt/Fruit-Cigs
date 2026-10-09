import React, { useState, useEffect, useRef } from "react";
import { ACHIEVEMENTS } from "../../data/achievements.js";
import { SFX } from "../../utils/sfx.js";
import { F, C, FONT, Z } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";

const AUTO_DISMISS_MS = 5000;
const REDUCED_MOTION_DISMISS_MS = 6000;
const CARDS_BY_ID = new Map(ACHIEVEMENTS.map(card => [card.id, card]));

export function AchievementToast({ achievement, achievements, onDone, muteSound, sealedPack, sealedCount = 0 }) {
  const ids = [...new Set(achievements || [achievement])];
  const cards = ids.map(id => CARDS_BY_ID.get(id)).filter(Boolean);
  const batchKey = ids.join(",");
  const latest = useRef({ ids, onDone });
  latest.current = { ids, onDone };
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const paused = hovered || focused || touching;
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
  const exitTimerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    if (!muteSound) SFX.achievement();
    return () => { clearTimeout(timer); clearTimeout(exitTimerRef.current); };
  }, [muteSound]);

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    // Acknowledge only this batch. Arrivals during the exit animation stay
    // queued for the next toast rather than disappearing with this one.
    const acknowledged = [...latest.current.ids];
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    setVisible(false);
    setSwipeOffset(0);
    exitTimerRef.current = setTimeout(() => latest.current.onDone(acknowledged), reducedMotionRef.current ? 0 : 400);
  };

  // Reduced motion: no drain bar animation, just a plain timeout.
  useEffect(() => {
    if (!reducedMotionRef.current || paused || dismissedRef.current) return;
    fallbackTimerRef.current = setTimeout(dismiss, REDUCED_MOTION_DISMISS_MS);
    return () => { if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current); };
  }, [batchKey, paused]);

  useEffect(() => {
    if (cards.length === 0) dismiss();
  }, [batchKey, cards.length]);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    setTouching(true);
  };
  const handleTouchMove = (e) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setSwipeOffset(dy);
  };
  const handleTouchEnd = () => {
    if (swipeOffset > 40) dismiss();
    else setSwipeOffset(0);
    touchStartY.current = null;
    setTouching(false);
  };

  if (!cards.length) return null;
  const ach = cards[0];
  const grouped = cards.length > 1;

  return (
    <div
      data-testid="achievement-toast"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
      style={{
        position: "fixed",
        bottom: `calc(${mob ? 12 : 20}px + env(safe-area-inset-bottom, 0px))`,
        left: mob ? 12 : 20,
        transform: `translateY(${visible ? swipeOffset : 24}px)`,
        zIndex: Z.modal, fontFamily: FONT,
        transition: reducedMotionRef.current ? "none" : swipeOffset !== 0 ? "opacity 0.4s ease" : "transform 0.4s ease, opacity 0.4s ease",
        opacity: visible ? 1 : 0, textAlign: "left",
        width: mob ? "calc(100% - 24px)" : 400,
        maxWidth: 400,
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
        padding: mob ? "14px 42px 14px 12px" : "16px 46px 16px 16px",
        borderRadius: 6,
        boxShadow: "0 0 24px rgba(250,204,21,0.15)",
        display: "flex", alignItems: "flex-start", gap: mob ? 10 : 14,
      }}>
        <span style={{ fontSize: mob ? F.lg : F.h3, flexShrink: 0 }}>{ach.icon}</span>
        <div role="status" aria-live="polite" aria-atomic="true" style={{ minWidth: 0, lineHeight: 1.7 }}>
          <div style={{ fontSize: F.xs, color: C.gold, marginBottom: 8 }}>{grouped ? `${cards.length} CIG CARDS UNLOCKED` : "CIG CARD UNLOCKED"}</div>
          {cards.slice(0, 3).map(card => <div key={card.id} style={{ fontSize: F.sm, color: C.text, overflowWrap: "anywhere", marginBottom: grouped ? 4 : 0 }}>{card.name}</div>)}
          {cards.length > 3 && <div style={{ fontSize: F.xs, color: C.textMuted }}>+{cards.length - 3} more in your collection</div>}
          {!grouped && <div style={{ fontSize: F.xs, color: C.textMuted, marginTop: 4 }}>{ach.desc}</div>}
          {(sealedPack || sealedCount > 0) && (
            <div style={{ fontSize: F.micro, color: C.textMuted, marginTop: 6 }}>{grouped ? `${sealedCount} FILED TO SEALED PACKS` : "FILED TO A SEALED PACK"}</div>
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss card notification" style={{ position: "absolute", right: 0, top: 0, minWidth: 44, minHeight: 44, border: 0, background: "none", color: C.textMuted, fontFamily: FONT, fontSize: F.sm, cursor: "pointer" }}>×</button>
        {!reducedMotionRef.current && (
          <div
            key={batchKey}
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
