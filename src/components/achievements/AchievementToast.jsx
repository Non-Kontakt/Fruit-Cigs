import React, { useState, useEffect } from "react";
import { ACHIEVEMENTS } from "../../data/achievements.js";
import { SFX } from "../../utils/sfx.js";
import { F, C, FONT, Z } from "../../data/tokens";

export function AchievementToast({ achievement, onDone, muteSound }) {
  const [visible, setVisible] = useState(false);
  const mob = window.innerWidth <= 768;

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    if (!muteSound) SFX.achievement();
  }, [muteSound]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(onDone, 400);
  };

  const ach = ACHIEVEMENTS.find(a => a.id === achievement);
  if (!ach) { setTimeout(onDone, 100); return null; }

  return (
    <div onClick={dismiss} style={{
      position: "fixed", top: mob ? 10 : 20, left: "50%", transform: `translateX(-50%) translateY(${visible ? 0 : -80}px)`,
      zIndex: Z.modal, fontFamily: FONT,
      transition: "transform 0.4s ease, opacity 0.4s ease",
      opacity: visible ? 1 : 0, cursor: "pointer",
      width: mob ? "calc(100% - 20px)" : "auto",
      maxWidth: mob ? 360 : "none",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #0d0d1f 100%)",
        border: `2px solid ${C.gold}`,
        padding: mob ? "14px 16px" : "18px 26px",
        boxShadow: "0 0 30px rgba(250,204,21,0.3)",
        display: "flex", alignItems: "center", gap: mob ? 10 : 14,
      }}>
        <span style={{ fontSize: mob ? F.lg : F.h3, flexShrink: 0 }}>{ach.icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: mob ? F.micro : F.xs, color: C.gold, letterSpacing: mob ? 1 : 2, marginBottom: 4 }}>🏅 ACHIEVEMENT UNLOCKED</div>
          <div style={{ fontSize: mob ? F.sm : F.md, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ach.name}</div>
          <div style={{ fontSize: mob ? F.micro : F.xs, color: C.textMuted, marginTop: 2 }}>{ach.desc}</div>
          <div style={{ fontSize: F.micro, color: C.slate, marginTop: 6 }}>Tap to dismiss</div>
        </div>
      </div>
    </div>
  );
}

// Achievement cabinet screen
// Youth Intake screen
