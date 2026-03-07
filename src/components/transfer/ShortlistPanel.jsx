import React from "react";
import { F, C, FONT } from "../../data/tokens";
import { getPosColor } from "../../utils/calc.js";

export function ShortlistPanel({ shortlist, setShortlist, onPlayerClick, onTeamClick, mob }) {
  const sorted = [...(shortlist || [])].sort((a, b) => (b.ovr || 0) - (a.ovr || 0));

  const handleRemove = (entry) => {
    const key = entry.id || `${entry.name}|${entry.clubName || ""}`;
    setShortlist(prev => prev.filter(p => (p.id || `${p.name}|${p.clubName || ""}`) !== key));
  };

  if (sorted.length === 0) {
    return (
      <div style={{ padding: mob ? "32px 16px" : "48px 32px", textAlign: "center" }}>
        <div style={{ color: C.gold, fontSize: F.h3, marginBottom: 16 }}>☆</div>
        <div style={{ color: C.textDim, fontSize: F.sm, lineHeight: 1.8 }}>
          No shortlisted players.<br />
          Click ☆ on any player profile to add them.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: mob ? "14px 8px" : "20px" }}>
      <div style={{ color: C.textDim, fontSize: F.xs, marginBottom: 14 }}>
        {sorted.length} player{sorted.length !== 1 ? "s" : ""} shortlisted
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map((entry, i) => {
          const key = entry.id || `${entry.name}|${entry.clubName || ""}`;
          return (
            <div key={key} style={{
              display: "flex", alignItems: "center", gap: mob ? 8 : 14,
              padding: mob ? "10px 8px" : "12px 16px",
              background: i % 2 === 0 ? "rgba(30,41,59,0.4)" : "transparent",
              borderRadius: 4,
            }}>
              {/* Position */}
              <span style={{
                background: getPosColor(entry.position),
                color: C.bg,
                padding: "4px 10px",
                fontSize: F.sm,
                fontWeight: "bold",
                fontFamily: FONT,
                minWidth: mob ? 36 : 42,
                textAlign: "center",
              }}>{entry.position}</span>

              {/* Name — clickable */}
              <span
                onClick={() => onPlayerClick?.(entry.name, entry.clubName)}
                style={{
                  color: C.text,
                  fontSize: mob ? F.sm : F.md,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                  textDecorationColor: "#e2e8f044",
                  textUnderlineOffset: 3,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >{entry.name}</span>

              {/* OVR */}
              <span style={{
                color: C.blue,
                fontSize: F.sm,
                fontFamily: FONT,
                minWidth: 32,
                textAlign: "center",
              }}>{entry.ovr}</span>

              {/* Club — clickable */}
              <span
                onClick={() => onTeamClick?.(entry.clubName)}
                style={{
                  color: entry.clubColor || C.textMuted,
                  fontSize: mob ? F.xs : F.sm,
                  cursor: entry.clubName ? "pointer" : "default",
                  textDecoration: entry.clubName ? "underline" : "none",
                  textDecorationStyle: "dotted",
                  textDecorationColor: `${entry.clubColor || C.textMuted}44`,
                  textUnderlineOffset: 3,
                  minWidth: mob ? 60 : 90,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >{entry.clubName || "Free"}</span>

              {/* Added date */}
              {!mob && (
                <span style={{
                  color: C.slate,
                  fontSize: F.xs,
                  minWidth: 70,
                  textAlign: "right",
                }}>S{entry.addedSeason} W{entry.addedWeek}</span>
              )}

              {/* Remove */}
              <button
                onClick={() => handleRemove(entry)}
                style={{
                  background: "none",
                  border: `1px solid ${C.bgInput}`,
                  color: C.textDim,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontSize: F.sm,
                  fontFamily: FONT,
                }}
              >✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
