import React, { useState, useEffect } from "react";
import { SFX } from "../../utils/sfx.js";
import { C } from "../../data/tokens";

export function AnimatedPips({ oldPips, newPips, nearlyThere, pipCrossed }) {
  const [visiblePips, setVisiblePips] = useState(oldPips);
  const [glowIdx, setGlowIdx] = useState(-1);

  useEffect(() => {
    if (!pipCrossed || newPips <= oldPips) return;
    // Animate each new pip sequentially
    let current = oldPips;
    const animateNext = () => {
      if (current >= newPips) return;
      const timer = setTimeout(() => {
        current++;
        setVisiblePips(current);
        setGlowIdx(current - 1);
        SFX.progress();
        // Clear glow after 1s
        setTimeout(() => setGlowIdx(-1), 1000);
        animateNext();
      }, current === oldPips ? 800 : 400);
      return timer;
    };
    const t = animateNext();
    return () => clearTimeout(t);
  }, []);

  return (
    <span style={{ display: "flex", gap: 2 }}>
      {[0,1,2,3,4].map(i => {
        const filled = i < visiblePips;
        const isNew = i === glowIdx;
        return (
          <span key={i} style={{
            display: "inline-block", width: 10, height: 8,
            background: filled
              ? (nearlyThere ? "#38bdf8" : "#f59e0b")
              : "rgba(30,41,59,0.8)",
            border: `1px solid ${filled ? (nearlyThere ? "#7dd3fc" : "#d97706") : C.bgInput}`,
            opacity: filled ? 1 : 0.4,
            boxShadow: isNew ? `0 0 8px ${nearlyThere ? "#38bdf8" : "#f59e0b"}, 0 0 16px ${nearlyThere ? "#38bdf888" : "#f59e0b88"}` : "none",
            transition: "background 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
            transform: isNew ? "scale(1.3)" : "scale(1)",
          }} />
        );
      })}
    </span>
  );
}
