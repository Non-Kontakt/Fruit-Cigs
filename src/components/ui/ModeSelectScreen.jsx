import { useState } from "react";

import { C as TC, FONT } from "../../data/tokens";

const C = { ...TC, bg: "#0a0a1a" };
const F = { xl: "clamp(12px,3vw,16px)", lg: "clamp(9px,2.5vw,13px)", md: "clamp(7px,2vw,10px)", sm: "clamp(6px,1.5vw,8px)" };

const MODES = [
  {
    id: "casual",
    label: "CASUAL",
    icon: "⚽",
    color: C.blue,
    lines: [
      "Play freely.",
      "Save & load",
      "as you wish.",
      "",
      "No achievements.",
    ],
  },
  {
    id: "ironman",
    label: "IRONMAN",
    icon: "⚔",
    color: C.lightRed,
    lines: [
      "One life.",
      "Achievements",
      "only count here.",
      "",
      "The board can",
      "sack you.",
    ],
  },
];

export function ModeSelectScreen({ slotNumber, onSelect, onBack }) {
  const [hovered, setHovered] = useState(null);
  const [confirming, setConfirming] = useState(null);

  if (confirming) {
    const m = MODES.find(m => m.id === confirming);
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, color: C.text,
        fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}>
        <div style={{ textAlign: "center", maxWidth: 380, width: "90%" }}>
          <div style={{ fontSize: "2em", marginBottom: 16 }}>{m.icon}</div>
          <div style={{ fontSize: F.xl, color: m.color, marginBottom: 16 }}>{m.label} MODE</div>
          {confirming === "ironman" && (
            <div style={{ fontSize: F.sm, color: C.textMuted, marginBottom: 24, lineHeight: 2 }}>
              This career will be Ironman. There is no manual save. The board can sack you if results don't improve. This cannot be changed. Are you sure?
            </div>
          )}
          {confirming === "casual" && (
            <div style={{ fontSize: F.sm, color: C.textMuted, marginBottom: 24, lineHeight: 2 }}>
              This career will be Casual. Save and load freely. No achievements will be earned. This cannot be changed.
            </div>
          )}
          <button
            onClick={() => onSelect(confirming)}
            style={{
              width: "100%", padding: "14px", marginBottom: 10,
              background: confirming === "ironman" ? "rgba(248,113,113,0.15)" : "rgba(96,165,250,0.15)",
              border: `2px solid ${m.color}`,
              color: m.color, fontFamily: FONT, fontSize: F.md,
              cursor: "pointer", letterSpacing: 1,
            }}
          >CONFIRM {m.label} ▶</button>
          <button
            onClick={() => setConfirming(null)}
            style={{
              width: "100%", padding: "10px",
              background: "none", border: "1px solid rgba(30,41,59,0.8)",
              color: C.slate, fontFamily: FONT, fontSize: F.sm, cursor: "pointer",
            }}
          >◀ BACK</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{ textAlign: "center", maxWidth: 600, width: "95%" }}>
        <div style={{ fontSize: F.xl, color: C.green, letterSpacing: 2, marginBottom: 8, textShadow: "0 0 20px rgba(74,222,128,0.4)" }}>
          🚬 FRUIT CIGS
        </div>
        <div style={{ fontSize: F.sm, color: C.slate, marginBottom: 32, letterSpacing: 1 }}>
          Slot {slotNumber} · New Career · Choose Mode
        </div>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {MODES.map(m => (
            <div
              key={m.id}
              onClick={() => setConfirming(m.id)}
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                flex: "1 1 200px", maxWidth: 240,
                padding: "28px 20px",
                border: `2px solid ${hovered === m.id ? m.color : m.color + "40"}`,
                background: hovered === m.id ? `${m.color}10` : "rgba(15,23,42,0.8)",
                borderRadius: 6, cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "1.8em", marginBottom: 14 }}>{m.icon}</div>
              <div style={{ fontSize: F.lg, color: m.color, marginBottom: 20, letterSpacing: 2 }}>{m.label}</div>
              {m.lines.map((line, i) => (
                <div key={i} style={{ fontSize: F.sm, color: line ? C.textMuted : "transparent", marginBottom: 6, lineHeight: 1.6 }}>
                  {line || "·"}
                </div>
              ))}
              <div style={{ marginTop: 24, fontSize: F.md, color: m.color, letterSpacing: 1 }}>
                SELECT ▶
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onBack}
          style={{
            marginTop: 24, padding: "10px 20px",
            background: "none", border: "1px solid rgba(30,41,59,0.8)",
            color: C.slate, fontFamily: FONT, fontSize: F.sm, cursor: "pointer",
          }}
        >◀ BACK</button>
      </div>
    </div>
  );
}
