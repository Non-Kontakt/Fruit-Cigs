import React from "react";
import { F, C, FONT } from "../../data/tokens";
import { getPosColor } from "../../utils/calc.js";

/**
 * Standardised position badge — matches the squad view training chip dimensions exactly.
 * Desktop: 44 × 28 px  |  Mobile: 40 × 26 px  |  borderRadius: 3
 */
export function PositionChip({ position, mobile = false }) {
  const color = getPosColor(position);
  return (
    <span style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: mobile ? 40 : 44,
      height: mobile ? 26 : 28,
      borderRadius: 3,
      fontFamily: FONT,
      fontSize: F.xs,
      fontWeight: "bold",
      background: color,
      color: C.bg,
      border: `2px solid ${color}`,
      flexShrink: 0,
      letterSpacing: 0.5,
      boxSizing: "border-box",
    }}>
      {position}
    </span>
  );
}
