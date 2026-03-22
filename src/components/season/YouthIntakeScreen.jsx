import React, { useState } from "react";
import { ATTRIBUTES } from "../../data/training.js";
import { getAttrColor, getPosColor } from "../../utils/calc.js";
import { getNatFlag, displayName } from "../../utils/player.js";
import { F, C, FONT, Z } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";

const ARCHETYPE_BADGE = {
  specialist: { label: "SPECIALIST", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  raw:        { label: "DIAMOND",    color: C.amber, bg: "rgba(251,191,36,0.12)" },
  wildcard:   { label: "WILDCARD",   color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
};

export function YouthIntakeScreen({ intake, onDone, squadSize, onClose, ovrCap = 20 }) {
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(null);
  const SQUAD_CAP = 25;
  const slotsAvailable = Math.max(0, SQUAD_CAP - (squadSize || 0));
  const mob = useMobile();

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < slotsAvailable) next.add(id);
      return next;
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: Z.seasonModal,
      background: "rgba(0,0,0,0.95)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT,
      overflow: "auto",
    }}>
      <div style={{ textAlign: "center", maxWidth: mob ? 420 : 920, width: "94%", padding: "23px 0" }}>
        <div style={{ fontSize: mob ? F.lg : F.h3, color: C.green, letterSpacing: mob ? 2 : 5, marginBottom: 12 }}>
          🎓 YOUTH INTAKE
        </div>
        <div style={{ fontSize: F.xs, color: C.textDim, marginBottom: mob ? 20 : 30, lineHeight: 1.8 }}>
          New academy graduates available. Select who to sign.
          {slotsAvailable < intake.candidates.length && (
            <div style={{ color: "#f59e0b", marginTop: 6 }}>
              ⚠️ Squad limit: {slotsAvailable} slot{slotsAvailable !== 1 ? "s" : ""} available ({SQUAD_CAP} max). Release players to make room.
            </div>
          )}
        </div>

        {/* Back to squad button */}
        {onClose && (
          <button onClick={onClose} style={{
            marginBottom: 23, padding: "12px 23px", cursor: "pointer",
            fontFamily: FONT, fontSize: F.sm,
            background: "rgba(30,41,59,0.5)", border: `1px solid ${C.bgInput}`, color: C.textMuted,
            letterSpacing: 1,
          }}>
            ← BACK TO SQUAD
          </button>
        )}

        {intake.retirees && intake.retirees.length > 0 && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid #ef444433",
            padding: "14px 21px", marginBottom: 23, fontSize: F.xs, color: "#fca5a5", lineHeight: 1.8,
          }}>
            👋 Retired: {intake.retirees.map(r => `${displayName(r.name, mob)} (${r.position}, ${r.age})`).join(", ")}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 23 }}>
          {intake.candidates.map(player => {
            const isSelected = selected.has(player.id);
            const cantSelect = !isSelected && selected.size >= slotsAvailable;
            const overall = Math.round(ATTRIBUTES.reduce((s, a) => s + player.attrs[a.key], 0) / ATTRIBUTES.length);
            const isExpanded = mob && expanded === player.id;

            return (
              <div key={player.id} style={{ opacity: cantSelect ? 0.4 : 1 }}>
                <div
                  onClick={() => toggleSelect(player.id)}
                  style={{
                    background: isSelected ? "rgba(74,222,128,0.1)" : "rgba(30,41,59,0.3)",
                    border: isSelected ? `2px solid ${C.green}` : `2px solid ${C.bgInput}`,
                    padding: mob ? "14px 12px" : "21px 23px",
                    cursor: cantSelect ? "not-allowed" : "pointer",
                    display: "grid",
                    gridTemplateColumns: mob
                      ? "auto 1fr 36px 36px"
                      : "auto 1fr 51px 46px repeat(7, 51px)",
                    gap: mob ? 6 : 9,
                    alignItems: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
                    <span style={{
                      background: getPosColor(player.position), color: C.bg,
                      padding: "3px 6px", fontSize: mob ? F.xs : F.md, fontWeight: "bold",
                      fontFamily: FONT,
                    }}>{player.position}</span>
                    {player.learnedPositions?.[0] && (
                      <span style={{
                        background: getPosColor(player.learnedPositions[0]), color: C.bg,
                        padding: "3px 6px", fontSize: mob ? F.xs : F.md, fontWeight: "bold",
                        fontFamily: FONT, opacity: 0.72,
                      }}>{player.learnedPositions[0]}</span>
                    )}
                  </span>
                  <span style={{
                    fontSize: mob ? F.xs : F.sm, color: C.text, textAlign: "left",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: 6, minWidth: 0,
                  }}>
                    <span style={{ fontSize: mob ? F.md : F.lg, lineHeight: 1, flexShrink: 0 }}>{getNatFlag(player.nationality)}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName(player.name, mob)}</span>
                    {ARCHETYPE_BADGE[player.youthArchetype] && !mob && (
                      <span style={{
                        fontSize: F.micro, color: ARCHETYPE_BADGE[player.youthArchetype].color,
                        background: ARCHETYPE_BADGE[player.youthArchetype].bg,
                        padding: "2px 5px", flexShrink: 0, letterSpacing: 1,
                        border: `1px solid ${ARCHETYPE_BADGE[player.youthArchetype].color}44`,
                      }}>{ARCHETYPE_BADGE[player.youthArchetype].label}</span>
                    )}
                  </span>
                  <span style={{ fontSize: mob ? F.xs : F.sm, textAlign: "center", color: C.textMuted }}>{player.age}</span>
                  <span style={{ fontSize: mob ? F.sm : F.md, textAlign: "center", color: getAttrColor(overall, ovrCap), fontWeight: "bold" }}>{overall}</span>
                  {!mob && ATTRIBUTES.map(a => (
                    <span key={a.key} style={{ fontSize: F.md, textAlign: "center", color: getAttrColor(player.attrs[a.key], ovrCap) }}>
                      {player.attrs[a.key]}
                    </span>
                  ))}
                </div>

                {/* Mobile: tap to expand attrs */}
                {mob && (
                  <div
                    onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : player.id); }}
                    style={{
                      fontSize: F.micro, color: C.slate, textAlign: "center",
                      padding: "4px 0", cursor: "pointer", userSelect: "none",
                      borderLeft: isSelected ? `2px solid ${C.green}` : `2px solid ${C.bgInput}`,
                      borderRight: isSelected ? `2px solid ${C.green}` : `2px solid ${C.bgInput}`,
                      borderBottom: isExpanded ? "none" : (isSelected ? `2px solid ${C.green}` : `2px solid ${C.bgInput}`),
                      background: isSelected ? "rgba(74,222,128,0.05)" : "rgba(30,41,59,0.15)",
                    }}
                  >
                    {isExpanded ? "▲ HIDE" : "▼ STATS"}
                  </div>
                )}
                {isExpanded && (
                  <div style={{
                    padding: "10px 12px",
                    borderLeft: isSelected ? `2px solid ${C.green}` : `2px solid ${C.bgInput}`,
                    borderRight: isSelected ? `2px solid ${C.green}` : `2px solid ${C.bgInput}`,
                    borderBottom: isSelected ? `2px solid ${C.green}` : `2px solid ${C.bgInput}`,
                    background: isSelected ? "rgba(74,222,128,0.06)" : "rgba(30,41,59,0.2)",
                  }}>
                    {ARCHETYPE_BADGE[player.youthArchetype] && (
                      <div style={{ textAlign: "center", marginBottom: 8 }}>
                        <span style={{
                          fontSize: F.micro, color: ARCHETYPE_BADGE[player.youthArchetype].color,
                          background: ARCHETYPE_BADGE[player.youthArchetype].bg,
                          padding: "2px 7px", letterSpacing: 1,
                          border: `1px solid ${ARCHETYPE_BADGE[player.youthArchetype].color}44`,
                        }}>{ARCHETYPE_BADGE[player.youthArchetype].label}</span>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                      {ATTRIBUTES.map(a => (
                        <div key={a.key} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: F.micro, color: C.slate, marginBottom: 4 }}>{a.label}</div>
                          <div style={{ fontSize: F.sm, color: getAttrColor(player.attrs[a.key], ovrCap) }}>{player.attrs[a.key]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!mob && (
          <div style={{ fontSize: F.xs, color: C.slate, marginBottom: 18 }}>
            {ATTRIBUTES.map(a => a.label).join("  ·  ")}
          </div>
        )}

        <button
          onClick={() => {
            const chosen = intake.candidates.filter(p => selected.has(p.id));
            onDone(chosen);
          }}
          style={{
            background: selected.size > 0 ? "linear-gradient(180deg, #166534, #14532d)" : "rgba(30,41,59,0.3)",
            border: selected.size > 0 ? `2px solid ${C.green}` : `1px solid ${C.bgInput}`,
            color: selected.size > 0 ? C.green : C.textDim,
            padding: "16px 35px", cursor: "pointer",
            fontFamily: FONT, fontSize: F.md, letterSpacing: 1,
          }}
        >
          {selected.size > 0 ? `SIGN ${selected.size} PLAYER${selected.size > 1 ? "S" : ""}` : "SKIP INTAKE"}
        </button>
      </div>
    </div>
  );
}

// Season end reveal screen (promotion/relegation/stayed)
