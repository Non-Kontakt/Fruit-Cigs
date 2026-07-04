import React from "react";
import { C } from "../../data/tokens";

/**
 * Thin progress/affinity bar. Defaults match the AITeamPanel rendering
 * (no `flex`, no radius on the inner fill); TransfersPage opts into its
 * extra styling via `flex` and `innerRadius`.
 */
export function XpBar({ pct, color, height = 6, flex = false, innerRadius = false }) {
  return (
    <div style={{
      height, background: C.bgCard, ...(flex ? { flex: 1 } : null),
      position: "relative", overflow: "hidden",
      borderRadius: 2,
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: `${pct}%`,
        background: color,
        transition: "width 0.3s ease",
        ...(innerRadius ? { borderRadius: 2 } : null),
      }} />
    </div>
  );
}
