import React, { useEffect, useRef, useState } from "react";
import { C, F, FONT } from "../../data/tokens";

// The matchday commentary box (#460): one box carries the whole narration,
// wearing the featured side's colours — background versus contrast text,
// nothing else (owner ruling: no border). On a goal it locks to
// "GOAL FOR [TEAM]!" and the two colours swap at full opacity; under
// prefers-reduced-motion the lock holds the scorer's colours steady for the
// same duration instead of flickering (handled here in logic, not CSS).
//
// This component is a renderer plus one animation. Sequencing — what shows
// when, queues, coalescing — lives in utils/matchCommentary.js.

const FLICKER_MS = 90;

// Kit derivation (deriveKit/neutralKit) lives in utils/matchKit.js with the
// 7:1 mutual-contrast contract; re-exported here for the screen and fixtures.
export { deriveKit, neutralKit } from "../../utils/matchKit.js";

// Style for one box state. Exported so harness fixtures can freeze exact
// frames (either flicker phase) without reaching into timing.
export function comboxStyle([bg, fg], { inverted = false, mob = false } = {}) {
  // Hero scale: the box is the matchday experience, not an accessory.
  return {
    height: mob ? 74 : 92,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: mob ? "8px 14px" : "10px 22px",
    background: inverted ? fg : bg,
    color: inverted ? bg : fg,
    fontFamily: FONT,
    fontSize: mob ? F.sm : F.md,
    lineHeight: 1.6,
    overflow: "hidden",
  };
}

export function MatchCommentaryBox({ copy, kit, flashing = false, reducedMotion = false, mob = false }) {
  const [inverted, setInverted] = useState(false);
  const flickerRef = useRef(null);

  useEffect(() => {
    clearInterval(flickerRef.current);
    setInverted(false);
    // Reduced motion: the lock keeps the scorer's colours steady — same
    // duration, no strobing. A logic decision, not a CSS hope.
    if (!flashing || reducedMotion) return;
    flickerRef.current = setInterval(() => setInverted((v) => !v), FLICKER_MS);
    return () => clearInterval(flickerRef.current);
  }, [flashing, reducedMotion]);

  return (
    <div style={{
      ...comboxStyle(kit, { inverted: flashing && inverted, mob }),
      transition: flashing ? "none" : "background-color 250ms ease, color 250ms ease",
    }}>
      {copy}
    </div>
  );
}
