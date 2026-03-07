import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { POS_COLORS, ALL_POSITIONS } from "../../data/positions.js";
import { FORMATION_PRESETS } from "../../data/formations.js";
import { detectFormationName, getEffectiveSlots } from "../../utils/formation.js";
import { F, C, FONT, Z } from "../../data/tokens";

export function TacticsPanel({ formation, setFormation, startingXI, setStartingXI, squad, onClose, isMobile, slotAssignments, setSlotAssignments }) {
  const [dragging, setDragging] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [swapSource, setSwapSource] = useState(null); // for player slot swapping
  const pitchRef = useRef(null);
  const wasDragged = useRef(false);

  // Build ordered slot→player mapping
  const slotPlayers = useMemo(() => {
    return getEffectiveSlots(startingXI, formation, squad, slotAssignments);
  }, [startingXI, formation, squad, slotAssignments]);

  const getPlayer = (idx) => {
    const id = slotPlayers[idx];
    return id ? squad.find(p => p.id === id) : null;
  };

  const handlePointerDown = (e, idx) => {
    if (editingSlot !== null) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(idx);
    wasDragged.current = false;
  };

  const handlePointerMove = useCallback((e) => {
    if (dragging === null || !pitchRef.current) return;
    e.preventDefault();
    const rect = pitchRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
    setDragPos({ x, y });
    wasDragged.current = true;
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    if (dragging !== null && dragPos && wasDragged.current) {
      const snappedX = Math.round(dragPos.x / 4) * 4;
      const snappedY = Math.round(dragPos.y / 4) * 4;
      setFormation(prev => prev.map((s, i) => i === dragging ? { ...s, x: Math.max(4, Math.min(96, snappedX)), y: Math.max(6, Math.min(94, snappedY)) } : s));
    }
    setDragging(null);
    setDragPos(null);
  }, [dragging, dragPos, setFormation]);

  const handleDotTap = (idx) => {
    if (wasDragged.current) return;
    if (swapSource !== null) {
      // Perform swap
      if (swapSource !== idx) {
        // Swap players between slots
        setSlotAssignments(prev => {
          const current = prev || getEffectiveSlots(startingXI, formation, squad, null);
          const next = [...current];
          [next[swapSource], next[idx]] = [next[idx], next[swapSource]];
          return next;
        });
      }
      setSwapSource(null);
    } else {
      setEditingSlot(prev => prev === idx ? null : idx);
    }
  };

  const changeSlotPos = (idx, newPos) => {
    setFormation(prev => prev.map((s, i) => i === idx ? { ...s, pos: newPos } : s));
    // Don't reset slot assignments when changing a slot's position role
    setEditingSlot(null);
  };

  const applyPreset = (key) => {
    const preset = FORMATION_PRESETS[key];
    if (!preset) return;
    setFormation(preset.map(s => ({ ...s })));
    // Don't clear slotAssignments — players keep their slots, just the position labels change
    // Don't reshuffle startingXI — chip system controls who's where
    setEditingSlot(null);
    setSwapSource(null);
  };

  const formationName = detectFormationName(formation);

  // Touch/mouse event handlers on the container
  useEffect(() => {
    const onMove = (e) => handlePointerMove(e);
    const onUp = () => handlePointerUp();
    if (dragging !== null) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: Z.panel,
      background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: C.bg, border: `2px solid ${C.bgInput}`, width: isMobile ? "96vw" : 440,
        maxHeight: "92vh", overflow: "auto", position: "relative",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 23px", borderBottom: `2px solid ${C.bgInput}`, background: "#1a1a2e",
        }}>
          <span style={{ fontSize: F.lg, color: C.green }}>⚽ TACTICS</span>
          <span style={{ fontSize: F.lg, color: C.text, letterSpacing: 1 }}>{formationName}</span>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${C.slate}`, color: C.textMuted,
            cursor: "pointer", fontFamily: FONT, fontSize: F.sm, padding: "7px 12px",
          }}>✕</button>
        </div>

        {/* Pitch */}
        <div ref={pitchRef} style={{
          position: "relative", width: "100%", paddingBottom: "130%",
          background: "linear-gradient(180deg, #1a5c2a 0%, #1e6b31 30%, #1a6b2f 60%, #1a5c2a 100%)",
          borderBottom: `2px solid ${C.bgInput}`, overflow: "hidden", touchAction: "none",
          userSelect: "none",
        }}>
          {/* Pitch markings */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "4%", left: "6%", right: "6%", bottom: "4%", border: "1px solid rgba(255,255,255,0.18)" }} />
            <div style={{ position: "absolute", top: "50%", left: "6%", right: "6%", height: 1, background: "rgba(255,255,255,0.15)" }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 50, height: 50, border: "1px solid rgba(255,255,255,0.15)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 4, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: "50%" }} />
            {/* Penalty areas */}
            <div style={{ position: "absolute", bottom: "4%", left: "22%", right: "22%", height: "16%", border: "1px solid rgba(255,255,255,0.15)", borderBottom: "none" }} />
            <div style={{ position: "absolute", bottom: "4%", left: "32%", right: "32%", height: "8%", border: "1px solid rgba(255,255,255,0.12)", borderBottom: "none" }} />
            <div style={{ position: "absolute", top: "4%", left: "22%", right: "22%", height: "16%", border: "1px solid rgba(255,255,255,0.15)", borderTop: "none" }} />
            <div style={{ position: "absolute", top: "4%", left: "32%", right: "32%", height: "8%", border: "1px solid rgba(255,255,255,0.12)", borderTop: "none" }} />
            {/* Grass stripes */}
            {[20, 35, 50, 65, 80].map(pct => (
              <div key={pct} style={{ position: "absolute", top: `${pct}%`, left: "6%", right: "6%", height: "7.5%", background: "rgba(255,255,255,0.02)" }} />
            ))}
          </div>

          {/* Formation dots */}
          {formation.map((slot, idx) => {
            const isDragging = dragging === idx;
            const pos = isDragging && dragPos ? dragPos : slot;
            const player = getPlayer(idx);
            const isOutOfPos = player && player.position !== slot.pos;
            const isEditing = editingSlot === idx;
            const isSwapSrc = swapSource === idx;
            const dotSize = isMobile ? 30 : 26;

            return (
              <div key={idx} style={{
                position: "absolute",
                left: `${pos.x}%`, top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                zIndex: isDragging ? Z.bar : isEditing ? 50 : Z.base,
                cursor: isDragging ? "grabbing" : "grab",
                touchAction: "none",
              }}
                onMouseDown={(e) => handlePointerDown(e, idx)}
                onTouchStart={(e) => handlePointerDown(e, idx)}
                onClick={(e) => { e.stopPropagation(); handleDotTap(idx); }}
              >
                <div style={{
                  width: dotSize, height: dotSize, borderRadius: "50%",
                  background: `radial-gradient(circle at 40% 35%, ${POS_COLORS[slot.pos] || C.textMuted}, ${POS_COLORS[slot.pos] || C.textMuted}88)`,
                  border: `2px solid ${isDragging ? "#fff" : isSwapSrc ? C.gold : isEditing ? C.gold : isOutOfPos ? "#f59e0b" : "rgba(0,0,0,0.5)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: F.xs, color: "#fff", fontFamily: FONT,
                  boxShadow: isDragging ? "0 0 16px rgba(255,255,255,0.5)" : isSwapSrc ? "0 0 10px rgba(250,204,21,0.4)" : "0 2px 6px rgba(0,0,0,0.6)",
                  transition: isDragging ? "none" : "box-shadow 0.2s, border-color 0.2s",
                  letterSpacing: 0.5,
                }}>
                  {slot.pos}
                </div>
                {/* Player name label below dot */}
                <div style={{
                  position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                  marginTop: 1, fontSize: F.xs, color: isOutOfPos ? C.amber : "#ffffffcc",
                  whiteSpace: "nowrap", textAlign: "center",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9)", fontFamily: FONT,
                  lineHeight: 1.4,
                }}>
                  {player ? player.name.split(" ").pop().slice(0, 8) : "—"}
                  {isOutOfPos && player && <div style={{ fontSize: F.micro, color: "#f59e0b88" }}>({player.position})</div>}
                </div>

                {/* Position picker popup */}
                {isEditing && !isDragging && (
                  <div style={{
                    position: "absolute",
                    top: slot.y > 50 ? "auto" : "100%",
                    bottom: slot.y > 50 ? "100%" : "auto",
                    left: "50%", transform: "translateX(-50%)",
                    marginTop: slot.y > 50 ? 0 : 20, marginBottom: slot.y > 50 ? 20 : 0,
                    background: "#0f0f23ee", border: `1px solid ${C.slate}`, padding: 4,
                    display: "flex", gap: 3, flexWrap: "wrap", width: isMobile ? 160 : 140, justifyContent: "center",
                    zIndex: Z.dropdown, boxShadow: "0 4px 16px rgba(0,0,0,0.9)", borderRadius: 2,
                  }} onClick={e => e.stopPropagation()}>
                    <div style={{ width: "100%", fontSize: F.micro, color: C.textDim, textAlign: "center", marginBottom: 2 }}>CHANGE ROLE</div>
                    {ALL_POSITIONS.map(p => (
                      <button key={p} onClick={() => changeSlotPos(idx, p)} style={{
                        padding: "4px 7px", fontSize: F.xs, cursor: "pointer",
                        background: p === slot.pos ? POS_COLORS[p] : "transparent",
                        border: `1px solid ${POS_COLORS[p] || C.bgInput}`,
                        color: p === slot.pos ? "#fff" : POS_COLORS[p] || C.textMuted,
                        fontFamily: FONT, borderRadius: 2, minWidth: 36,
                      }}>{p}</button>
                    ))}
                    <div style={{ width: "100%", borderTop: `1px solid ${C.bgCard}`, marginTop: 2, paddingTop: 3 }}>
                      <button onClick={() => { setEditingSlot(null); setSwapSource(idx); }} style={{
                        width: "100%", padding: "5px", fontSize: F.micro, cursor: "pointer",
                        background: "rgba(250,204,21,0.1)", border: `1px solid ${C.gold}44`,
                        color: C.gold, fontFamily: FONT, borderRadius: 2,
                      }}>🔄 SWAP PLAYER</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Swap mode hint */}
          {swapSource !== null && (
            <div style={{
              position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
              background: "#0f0f23ee", border: `1px solid ${C.gold}`, padding: "6px 13px",
              fontSize: F.xs, color: C.gold, fontFamily: FONT,
              zIndex: Z.dropdown, whiteSpace: "nowrap",
            }}>
              TAP ANOTHER DOT TO SWAP · <span style={{ color: C.textMuted, cursor: "pointer" }} onClick={() => setSwapSource(null)}>CANCEL</span>
            </div>
          )}
        </div>

        {/* Presets */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.bgCard}` }}>
          <div style={{ fontSize: F.xs, color: C.textDim, marginBottom: 6, letterSpacing: 1 }}>FORMATION PRESETS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {Object.keys(FORMATION_PRESETS).map(key => (
              <button key={key} onClick={() => applyPreset(key)} style={{
                padding: "7px 10px", fontSize: F.xs, cursor: "pointer",
                background: formationName === key ? "rgba(74,222,128,0.15)" : "transparent",
                border: formationName === key ? `1px solid ${C.green}` : `1px solid ${C.bgInput}`,
                color: formationName === key ? C.green : C.textMuted,
                fontFamily: FONT,
              }}>{key}</button>
            ))}
          </div>
        </div>

        {/* Help text */}
        <div style={{
          padding: "10px 16px", fontSize: F.xs, color: C.slate, textAlign: "center",
          borderTop: `1px solid ${C.bgCard}`, lineHeight: 1.6,
        }}>
          DRAG DOTS TO REPOSITION · TAP DOT TO CHANGE ROLE / SWAP PLAYER
        </div>
      </div>
    </div>
  );
}

