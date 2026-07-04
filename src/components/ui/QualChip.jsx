import React from "react";
import { F, C, FONT } from "../../data/tokens";

// Qualification marker for knockout-tier tables (LeaguePage, Dashboard and
// their legends). The league colour carries the border and fill accent, but
// the glyph itself stays bright — a bare league-coloured letter disappears
// into the dark table rows.
export function QualChip({ color, title, style }) {
  return (
    <span
      title={title}
      style={{
        fontSize: F.xs, fontFamily: FONT, fontWeight: "bold", lineHeight: 1.3,
        color: C.text, background: `${color}2e`, border: `1px solid ${color}`,
        padding: "1px 5px", flexShrink: 0,
        ...style,
      }}
    >Q</span>
  );
}
