import React, { useState } from "react";
import { F, C, FONT, Z, EMOJI, TYPE } from "../../data/tokens";
import { CLUB_FOCUS_NODES, FOCUS_GRID_COLS, FOCUS_GRID_ROWS } from "../../data/clubFocuses.js";
import { getFocusNode, isFocusAvailable, getMissingPrereqs } from "../../utils/clubFocuses.js";
import { useMobile } from "../../hooks/useMobile.js";

// Full-screen overlay page for the Club Focus tree (AchievementCabinet
// pattern: fixed, z-modal, own header + close). Positions every node on the
// authored 6×4 grid (compact cards with written prerequisites on mobile), and lets the
// player start or switch the active focus. State lives in the store; this
// component reads clubFocuses and calls onStart(nodeId) to set activeId.

const COL_W = 156;
const ROW_H = 150;
const CHIP_W = 140;
const CHIP_H = 112;

const centerX = (col) => col * COL_W + COL_W / 2;
const centerY = (row) => row * ROW_H + ROW_H / 2;

// State palette — LOCKED dim, AVAILABLE bright, ACTIVE gold, COMPLETE green.
function nodeStyle(state) {
  switch (state) {
    case "complete": return { border: C.green, bg: "rgba(74,222,128,0.12)", text: C.green };
    case "active":   return { border: C.gold, bg: "rgba(250,204,21,0.14)", text: C.gold };
    case "available":return { border: C.blue, bg: "rgba(96,165,250,0.10)", text: C.text };
    default:         return { border: C.bgInput, bg: "rgba(15,15,35,0.5)", text: C.textDim };
  }
}

export function ClubFocusTree({ clubFocuses, onStart, onClose }) {
  const mob = useMobile();
  const [confirm, setConfirm] = useState(null); // node pending start/switch confirmation
  const cf = clubFocuses || { activeId: null, progressById: {}, completedIds: [], seasonGrants: {} };
  const completedIds = cf.completedIds || [];
  const activeId = cf.activeId;
  const activeNode = activeId ? getFocusNode(activeId) : null;

  const stateOf = (node) => {
    if (completedIds.includes(node.id)) return "complete";
    if (node.id === activeId) return "active";
    if (isFocusAvailable(node, completedIds)) return "available";
    return "locked";
  };

  const handleNodeClick = (node) => {
    const state = stateOf(node);
    if (state !== "available") return;
    setConfirm(node);
  };

  const doStart = (node) => {
    onStart?.(node.id);
    setConfirm(null);
  };

  const canvasW = FOCUS_GRID_COLS * COL_W;
  const canvasH = FOCUS_GRID_ROWS * ROW_H;

  // Edges: one line per prerequisite. requiresAny edges are dashed.
  const edges = [];
  CLUB_FOCUS_NODES.forEach(node => {
    (node.requires || []).forEach(pid => {
      const p = getFocusNode(pid);
      if (p) edges.push({ from: p, to: node, dashed: false });
    });
    (node.requiresAny || []).forEach(pid => {
      const p = getFocusNode(pid);
      if (p) edges.push({ from: p, to: node, dashed: true });
    });
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: Z.modal,
      background: C.bg, fontFamily: FONT,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        flex: "0 0 auto", padding: mob ? "12px 14px" : "16px 22px",
        borderBottom: `2px solid ${C.bgInput}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: mob ? F.lg : F.h2, color: C.gold, letterSpacing: 2 }}>
            <span style={{ ...EMOJI }}>🧭</span> CLUB FOCUS
          </div>
          {activeNode ? (
            <span style={{
              ...TYPE.compact, color: C.gold, background: "rgba(250,204,21,0.12)",
              border: `1px solid ${C.gold}`, padding: "5px 10px",
            }}>
              {activeNode.artKey} {activeNode.name} · {Math.max(0, activeNode.weeks - (cf.progressById?.[activeNode.id] || 0))}w left
            </span>
          ) : (
            <span style={{ ...TYPE.compact, color: C.textMuted }}>No focus underway — pick one below</span>
          )}
        </div>
        <button onClick={onClose} style={{
          background: "rgba(30,41,59,0.6)", border: `1px solid ${C.bgInput}`,
          color: C.text, fontFamily: FONT, fontSize: F.xs, padding: "9px 12px", minHeight: 44, flexShrink: 0, cursor: "pointer",
        }}>✕ CLOSE</button>
      </div>

      {/* Scrollable tree canvas */}
      <div style={{ flex: "1 1 auto", overflow: "auto", padding: mob ? 16 : 28 }}>
        <div style={mob
          ? { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }
          : { position: "relative", width: canvasW, height: canvasH, margin: "0 auto" }}>
          {/* Edges beneath the chips */}
          {!mob && <svg width={canvasW} height={canvasH} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {edges.map((e, i) => {
              const bothDone = completedIds.includes(e.from.id) && completedIds.includes(e.to.id);
              const fromDone = completedIds.includes(e.from.id);
              return (
                <line
                  key={i}
                  x1={centerX(e.from.pos.col)} y1={centerY(e.from.pos.row) + CHIP_H / 2 - 6}
                  x2={centerX(e.to.pos.col)} y2={centerY(e.to.pos.row) - CHIP_H / 2 + 6}
                  stroke={bothDone ? C.green : fromDone ? C.blue : C.bgInput}
                  strokeWidth={2}
                  strokeDasharray={e.dashed ? "5,5" : undefined}
                  opacity={fromDone ? 0.9 : 0.5}
                />
              );
            })}
          </svg>}

          {/* Nodes */}
          {CLUB_FOCUS_NODES.map(node => {
            const state = stateOf(node);
            const st = nodeStyle(state);
            const x = centerX(node.pos.col) - CHIP_W / 2;
            const y = centerY(node.pos.row) - CHIP_H / 2;
            const progress = cf.progressById?.[node.id] || 0;
            const missing = state === "locked" ? getMissingPrereqs(node, completedIds) : [];
            const missingLabels = missing.map(m => m.any
              ? m.any.map(id => getFocusNode(id)?.name).filter(Boolean).join(" or ")
              : getFocusNode(m)?.name).filter(Boolean);
            const tip = state === "locked" && missingLabels.length
              ? `🔒 Needs: ${missingLabels.join(", ")}`
              : node.desc;
            return (
              <button
                key={node.id}
                type="button"
                disabled={state !== "available"}
                data-testid={`focus-node-${node.id}`}
                data-state={state}
                title={tip}
                onClick={() => handleNodeClick(node)}
                style={{
                  ...(mob ? { minWidth: 0, minHeight: 112 } : { position: "absolute", left: x, top: y, width: CHIP_W, height: CHIP_H }),
                  boxSizing: "border-box", padding: "12px 8px",
                  background: st.bg, border: `2px solid ${st.border}`,
                  cursor: state === "available" ? "pointer" : "default",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  textAlign: "center",
                  boxShadow: state === "active" ? `0 0 10px ${C.gold}66` : undefined,
                }}
              >
                <div style={{ fontSize: F.md, lineHeight: 1 }}>
                  <span style={{ ...EMOJI }}>{state === "locked" ? "🔒" : node.artKey}</span>
                  {state === "complete" ? <span style={{ ...EMOJI, marginLeft: 3 }}>✓</span> : null}
                </div>
                <div style={{ ...TYPE.compact, fontWeight: 600, color: state === "locked" ? C.textMuted : st.text }}>{node.name}</div>
                {mob && <div style={{ ...TYPE.caption, color: C.textMuted }}>
                  {state === "locked" ? `Needs: ${missingLabels.join(", ")}` : node.desc}
                </div>}
                {state === "active" ? (
                  <>
                    <div style={{ width: "88%", height: 5, background: "rgba(0,0,0,0.4)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${Math.round((progress / node.weeks) * 100)}%`, height: "100%", background: C.gold }} />
                    </div>
                    <div style={{ ...TYPE.caption, color: C.gold }}>{progress}/{node.weeks}w</div>
                  </>
                ) : (
                  <div style={{ ...TYPE.caption, color: state === "complete" ? C.green : C.textMuted }}>
                    {state === "complete" ? "DONE" : `${node.weeks}w`}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Start / switch confirmation */}
      {confirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: Z.confirm,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setConfirm(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.bgCard, border: `2px solid ${C.gold}`, borderRadius: 8,
            padding: "22px 20px", maxWidth: 340, textAlign: "center",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div style={{ fontSize: F.lg, color: C.gold }}>
              <span style={{ ...EMOJI }}>{confirm.artKey}</span> {confirm.name}
            </div>
            <div style={{ ...TYPE.body, color: C.text }}>{confirm.desc}</div>
            <div style={{ ...TYPE.compact, color: C.textMuted }}>
              {activeNode && activeNode.id !== confirm.id
                ? `Switch focus? Progress on ${activeNode.name} is kept.`
                : `Start this focus? It will take ${confirm.weeks} weeks.`}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => doStart(confirm)} style={{
                background: "rgba(250,204,21,0.14)", border: `1px solid ${C.gold}`, color: C.gold,
                fontFamily: FONT, fontSize: F.sm, padding: "10px 18px", minHeight: 44, cursor: "pointer",
              }}>{activeNode && activeNode.id !== confirm.id ? "SWITCH" : "START"}</button>
              <button onClick={() => setConfirm(null)} style={{
                background: "rgba(30,41,59,0.6)", border: `1px solid ${C.bgInput}`, color: C.text,
                fontFamily: FONT, fontSize: F.sm, padding: "10px 18px", minHeight: 44, cursor: "pointer",
              }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
