import React, { useState, useEffect } from "react";
import { SFX } from "../../utils/sfx.js";
import { C } from "../../data/tokens";

// Animated pip bar for level-up cards: shows old pips → fills to 5/5 → turns green/gold
export function LevelUpPips({ oldPips, accentColor }) {
  const startPips = oldPips ?? 3;
  const [visiblePips, setVisiblePips] = useState(startPips);
  const [phase, setPhase] = useState("filling"); // filling → complete
  const [glowIdx, setGlowIdx] = useState(-1);
  const color = accentColor || C.green;

  useEffect(() => {
    let current = startPips;
    const timers = [];
    const animateNext = () => {
      if (current >= 5) {
        timers.push(setTimeout(() => setPhase("complete"), 200));
        return;
      }
      timers.push(setTimeout(() => {
        current++;
        setVisiblePips(current);
        setGlowIdx(current - 1);
        if (current < 5) SFX.progress();
        timers.push(setTimeout(() => setGlowIdx(-1), 600));
        animateNext();
      }, current === startPips ? 600 : 280));
    };
    animateNext();
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <span style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {[0,1,2,3,4].map(i => {
        const filled = i < visiblePips;
        const isNew = i === glowIdx;
        const done = phase === "complete";
        return (
          <span key={i} style={{
            display: "inline-block", width: 9, height: 7,
            background: filled
              ? (done ? color : "#f59e0b")
              : "rgba(30,41,59,0.8)",
            border: `1px solid ${filled ? (done ? color : "#d97706") : C.bgInput}`,
            opacity: filled ? 1 : 0.3,
            boxShadow: done ? `0 0 4px ${color}88` : isNew ? "0 0 8px #f59e0b, 0 0 14px #f59e0b88" : "none",
            transition: "background 0.3s ease, opacity 0.3s ease, box-shadow 0.4s ease, border-color 0.3s ease",
            transform: isNew ? "scale(1.4)" : "scale(1)",
          }} />
        );
      })}
    </span>
  );
}
