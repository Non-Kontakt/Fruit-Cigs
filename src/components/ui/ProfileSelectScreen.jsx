import { useState } from "react";

import { C as TC, FONT } from "../../data/tokens";

const C = { ...TC, bg: "#0a0a1a", bgCard: "rgba(30,41,59,0.6)", bgInput: "#1e293b" };
const F = { xl: "clamp(13px,3vw,18px)", lg: "clamp(10px,2.5vw,14px)", md: "clamp(8px,2vw,11px)", sm: "clamp(6px,1.5vw,9px)" };

export function ProfileSelectScreen({ profiles, onSelect, onCreate, onViewMuseum }) {
  const [creating, setCreating] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  const handleCreate = () => {
    const name = nameInput.trim();
    if (!name) return;
    onCreate(name);
    setCreating(false);
    setNameInput("");
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: FONT,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>

      <div style={{ textAlign: "center", maxWidth: 420, width: "90%" }}>
        <div style={{
          fontSize: F.xl, color: C.green, letterSpacing: 2, marginBottom: 6,
          textShadow: "0 0 20px rgba(74,222,128,0.4)", lineHeight: 1.4,
        }}>
          FRUIT CIGS
        </div>
        <div style={{ fontSize: F.sm, color: C.slate, marginBottom: 32, letterSpacing: 1 }}>
          SELECT PROFILE
        </div>

        {profiles.length === 0 && !creating && (
          <div style={{ fontSize: F.md, color: C.textMuted, marginBottom: 24 }}>
            No profiles yet. Create one to begin.
          </div>
        )}

        {profiles.map(p => (
          <div key={p.id} style={{ marginBottom: 10 }}>
            <div
              onClick={() => onSelect(p.id)}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                padding: "14px 16px",
                border: `2px solid ${hoveredId === p.id ? C.green : "rgba(74,222,128,0.2)"}`,
                background: hoveredId === p.id ? "rgba(74,222,128,0.06)" : "rgba(15,23,42,0.8)",
                borderRadius: 4, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 14,
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(74,222,128,0.1)",
                border: `1px solid rgba(74,222,128,0.3)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: F.md, color: C.green, flexShrink: 0,
              }}>
                {p.name.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: F.md, color: C.text, marginBottom: 3 }}>{p.name}</div>
                {p.ironmanBest && (
                  <div style={{ fontSize: F.sm, color: C.textMuted }}>
                    Best: {p.ironmanBest.seasons} season{p.ironmanBest.seasons !== 1 ? "s" : ""} · Tier {p.ironmanBest.highestTier}
                  </div>
                )}
              </div>
              <div style={{ fontSize: F.lg, color: C.green }}>▶</div>
            </div>
            {onViewMuseum && (
              <button
                onClick={e => { e.stopPropagation(); onViewMuseum(p.id); }}
                style={{
                  width: "100%", padding: "7px",
                  background: "none",
                  border: "1px solid rgba(248,113,113,0.2)",
                  borderTop: "none",
                  color: C.lightRed, fontFamily: FONT, fontSize: F.sm,
                  cursor: "pointer", letterSpacing: 1,
                  opacity: 0.7,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "rgba(248,113,113,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "none"; }}
              >📋 MUSEUM</button>
            )}
          </div>
        ))}

        {creating ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: F.md, color: C.textMuted, marginBottom: 12, letterSpacing: 1 }}>
              PROFILE NAME
            </div>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value.slice(0, 16))}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
              placeholder="Enter name..."
              autoFocus
              style={{
                width: "100%", padding: "12px 16px", boxSizing: "border-box",
                background: C.bgInput, border: `2px solid rgba(74,222,128,0.4)`,
                color: C.text, fontSize: F.lg,
                fontFamily: FONT, textAlign: "center", outline: "none",
                marginBottom: 10,
              }}
            />
            <button
              onClick={handleCreate}
              disabled={!nameInput.trim()}
              style={{
                width: "100%", padding: "14px",
                background: nameInput.trim() ? "linear-gradient(180deg,#166534,#14532d)" : "rgba(30,41,59,0.3)",
                border: nameInput.trim() ? `2px solid ${C.green}` : `1px solid rgba(30,41,59,0.8)`,
                color: nameInput.trim() ? C.green : C.slate,
                fontFamily: FONT, fontSize: F.md, cursor: nameInput.trim() ? "pointer" : "default",
                letterSpacing: 2, marginBottom: 8,
                animation: nameInput.trim() ? "glow 2s ease infinite" : "none",
              }}
            >CREATE PROFILE ▶</button>
            <button
              onClick={() => { setCreating(false); setNameInput(""); }}
              style={{
                width: "100%", padding: "10px",
                background: "none", border: `1px solid rgba(30,41,59,0.8)`,
                color: C.slate, fontFamily: FONT, fontSize: F.sm, cursor: "pointer",
              }}
            >◀ BACK</button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{
              width: "100%", marginTop: 12, padding: "14px",
              background: "rgba(30,41,59,0.4)",
              border: `1px solid rgba(74,222,128,0.25)`,
              color: C.green, fontFamily: FONT, fontSize: F.md,
              cursor: "pointer", letterSpacing: 1,
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(74,222,128,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(30,41,59,0.4)"}
          >+ NEW PROFILE</button>
        )}
      </div>
    </div>
  );
}
