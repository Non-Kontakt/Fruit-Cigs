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

// FC teams carry one colour; the box needs a pair. The second colour is
// whichever of the app's light text / dark background clears the higher
// WCAG contrast ratio against the (normalised) team colour.
export function deriveKit(color) {
  const normalised = normaliseHex(color);
  const bgLum = relativeLuminance(normalised);
  const lightLum = relativeLuminance(normaliseHex(C.text));
  const darkLum = relativeLuminance(normaliseHex(C.bg));
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const text = ratio(bgLum, lightLum) >= ratio(bgLum, darkLum) ? C.text : C.bg;
  return [normalised, text];
}

// Neutral palette for sideless items (half-time, full-time, MOTM).
export function neutralKit() {
  return [C.bgCard, C.text];
}

function normaliseHex(color) {
  const hex = String(color || "").replace("#", "").trim();
  const six = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  return /^[0-9a-fA-F]{6}$/.test(six) ? `#${six.toLowerCase()}` : "#334155";
}

// WCAG 2.x relative luminance.
function relativeLuminance(hex) {
  const n = hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

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
