import React, { useEffect, useRef, useState } from "react";
import { C, F, FONT } from "../../data/tokens";

// The matchday commentary box (issue #460): one box carries the whole
// narration, wearing the possessing side's colours. On a goal it locks to
// "GOAL FOR [TEAM]!" and flickers at full opacity between the scorer's two
// kit colours — commentary itself never flickers; whatever fires during the
// flash lands after it settles. Ported from HTO's approved matchday toy.

const FLICKER_MS = 90;
const FLICKER_SWAPS = 12;

// FC teams carry one colour; the box needs a pair. Contrast-derived second
// colour (owner ruling: derive for now, better schemes later).
export function deriveKit(color) {
  const hex = (color || "#334155").replace("#", "");
  const n = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  const luma = (r * 299 + g * 587 + b * 114) / 1000;
  return [color, luma > 140 ? C.bg : C.text];
}

// Style for one box state. Exported so harness fixtures can freeze exact
// frames (possession, either flicker phase) without reaching into the
// component's timing.
export function comboxStyle([bg, fg], { inverted = false, mob = false } = {}) {
  const a = inverted ? fg : bg;
  const b = inverted ? bg : fg;
  return {
    minHeight: mob ? 58 : 64,
    height: mob ? 58 : 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "6px 14px",
    border: `3px solid ${b}`,
    background: a,
    color: b,
    fontFamily: FONT,
    fontSize: mob ? F.xs : F.sm,
    lineHeight: 1.5,
    overflow: "hidden",
  };
}

export function MatchCommentaryBox({ line, kit, goalFlash, onFlashDone, mob = false }) {
  const [flickerStep, setFlickerStep] = useState(null);
  const doneRef = useRef(onFlashDone);
  useEffect(() => { doneRef.current = onFlashDone; });

  useEffect(() => {
    if (!goalFlash) { setFlickerStep(null); return; }
    setFlickerStep(0);
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      if (n >= FLICKER_SWAPS) {
        clearInterval(id);
        setFlickerStep(null);
        doneRef.current?.();
      } else {
        setFlickerStep(n);
      }
    }, FLICKER_MS);
    return () => clearInterval(id);
  }, [goalFlash]);

  const flashing = goalFlash && flickerStep != null;
  const activeKit = flashing ? goalFlash.kit : kit;
  const style = comboxStyle(activeKit, { inverted: flashing && flickerStep % 2 === 1, mob });
  return (
    <div style={{
      ...style,
      transition: flashing ? "none" : "background-color 250ms ease, color 250ms ease, border-color 250ms ease",
    }}>
      {flashing ? goalFlash.copy : line}
    </div>
  );
}
