import React, { useState, useMemo } from "react";
import { FONT, F, C, BTN, MODAL } from "../../data/tokens";
import { POS_COLORS } from "../../data/positions.js";
import { getOverall } from "../../utils/calc.js";

// 5v5 formation: 1 GK, 1 DEF, 2 MID, 1 ATK
const FIVE_SLOTS = [
  { label: "GK", group: "GK", positions: ["GK"] },
  { label: "DEF", group: "DEF", positions: ["CB", "LB", "RB"] },
  { label: "MID", group: "MID", positions: ["CM", "AM"] },
  { label: "MID", group: "MID", positions: ["CM", "AM"] },
  { label: "ATK", group: "FWD", positions: ["LW", "RW", "ST"] },
];

export function FiveASidePicker({ squad, ovrCap, onConfirm, onClose, roundLabel, opponentName, initialSelection }) {
  const [selected, setSelected] = useState(() => {
    if (initialSelection && initialSelection.length === 5) return [...initialSelection];
    return [null, null, null, null, null];
  });

  const eligible = useMemo(() => {
    return FIVE_SLOTS.map(slot =>
      squad
        .filter(p => !p.injury && slot.positions.includes(p.position))
        .sort((a, b) => getOverall(b) - getOverall(a))
    );
  }, [squad]);

  const selectedIds = new Set(selected.filter(Boolean));
  const allFilled = selected.every(id => id != null);

  const handleSelect = (slotIdx, playerId) => {
    setSelected(prev => {
      const next = [...prev];
      // If this player is already in another slot, clear that slot
      const existingIdx = next.indexOf(playerId);
      if (existingIdx >= 0 && existingIdx !== slotIdx) next[existingIdx] = null;
      next[slotIdx] = next[slotIdx] === playerId ? null : playerId;
      return next;
    });
  };

  const autoFill = () => {
    const used = new Set();
    const picks = [];
    for (let i = 0; i < FIVE_SLOTS.length; i++) {
      const best = eligible[i].find(p => !used.has(p.id));
      if (best) { picks.push(best.id); used.add(best.id); }
      else picks.push(null);
    }
    setSelected(picks);
  };

  return (
    <div style={{ ...MODAL.backdrop, zIndex: 9999 }} onClick={onClose}>
      <div style={{
        ...MODAL.box, maxWidth: 520, width: "94%", padding: "24px 20px",
        maxHeight: "calc(100vh - 60px)", overflow: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: F.lg, color: C.gold, letterSpacing: 2, marginBottom: 4, textAlign: "center" }}>
          5v5 MINI-TOURNAMENT
        </div>
        <div style={{ fontSize: F.xs, color: C.textMuted, textAlign: "center", marginBottom: 16 }}>
          {roundLabel}{opponentName ? ` vs ${opponentName}` : ""}
        </div>
        <div style={{ fontSize: F.xs, color: C.textDim, textAlign: "center", marginBottom: 20 }}>
          Pick your 5: 1 GK, 1 DEF, 2 MID, 1 ATK
        </div>

        {FIVE_SLOTS.map((slot, slotIdx) => {
          const available = eligible[slotIdx].filter(p => !selectedIds.has(p.id) || selected[slotIdx] === p.id);
          const chosen = selected[slotIdx] ? squad.find(p => p.id === selected[slotIdx]) : null;
          return (
            <div key={slotIdx} style={{
              marginBottom: 12, background: "rgba(15,23,42,0.8)",
              border: `1px solid ${chosen ? C.green : C.bgInput}`, borderRadius: 8, padding: "10px 12px",
            }}>
              <div style={{ fontSize: F.xs, color: POS_COLORS[slot.positions[0]] || C.textMuted, marginBottom: 6 }}>
                {slot.label} SLOT
              </div>
              {chosen ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ color: C.text, fontSize: F.sm }}>{chosen.name}</span>
                    <span style={{ color: POS_COLORS[chosen.position] || C.textMuted, fontSize: F.xs, marginLeft: 8 }}>{chosen.position}</span>
                    <span style={{ color: C.textDim, fontSize: F.xs, marginLeft: 8 }}>OVR {getOverall(chosen)}</span>
                  </div>
                  <button onClick={() => handleSelect(slotIdx, chosen.id)} style={{
                    ...BTN.ghost, padding: "4px 10px", fontSize: F.xs, fontFamily: FONT,
                  }}>X</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {available.slice(0, 6).map(p => (
                    <button key={p.id} onClick={() => handleSelect(slotIdx, p.id)} style={{
                      ...BTN.ghost, padding: "5px 10px", fontSize: F.xs, fontFamily: FONT,
                      border: `1px solid ${C.bgInput}`, borderRadius: 4,
                    }}>
                      <span style={{ color: POS_COLORS[p.position] || C.text }}>{p.position}</span>
                      {" "}{p.name.split(" ").pop()} <span style={{ color: C.textDim }}>{getOverall(p)}</span>
                    </button>
                  ))}
                  {available.length === 0 && <span style={{ color: C.red, fontSize: F.xs }}>No eligible players!</span>}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center" }}>
          <button onClick={autoFill} style={{ ...BTN.ghost, padding: "8px 16px", fontSize: F.xs, fontFamily: FONT }}>
            AUTO-PICK
          </button>
          <button
            onClick={() => allFilled && onConfirm(selected)}
            disabled={!allFilled}
            style={{
              ...(allFilled ? BTN.primary : BTN.disabled),
              padding: "8px 20px", fontSize: F.sm, fontFamily: FONT,
            }}
          >
            CONFIRM SQUAD
          </button>
        </div>
        <button onClick={onClose} style={{
          ...BTN.text, padding: "8px 16px", fontSize: F.xs, fontFamily: FONT,
          display: "block", margin: "12px auto 0",
        }}>BACK</button>
      </div>
    </div>
  );
}

// Build a 5-man squad object for an AI team (pick strongest per slot)
export function buildAIFiveASide(team) {
  const squad = team.squad || [];
  const used = new Set();
  const picks = [];
  for (const slot of FIVE_SLOTS) {
    const eligible = squad
      .filter(p => !used.has(p.id) && slot.positions.includes(p.position))
      .sort((a, b) => getOverall(b) - getOverall(a));
    if (eligible.length > 0) {
      picks.push(eligible[0]);
      used.add(eligible[0].id);
    }
  }
  return picks;
}
