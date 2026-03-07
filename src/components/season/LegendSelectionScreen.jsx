import React, { useState, useEffect } from "react";
import { F, C, FONT, Z } from "../../data/tokens";
import { getOverall, getPosColor } from "../../utils/calc.js";

export function LegendSelectionScreen({ squad, maxPicks = 5, legendCap, newPrestigeLevel, onDone }) {
  const [selected, setSelected] = useState(new Set());
  const [confirming, setConfirming] = useState(false);
  const [phase, setPhase] = useState(0); // 0=black, 1=bg, 2=title, 3=cards
  const mob = window.innerWidth <= 768;

  const pickable = squad.filter(p => !p.isLegend);
  const effectiveMax = Math.min(maxPicks, pickable.length);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 700);
    const t3 = setTimeout(() => setPhase(3), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < effectiveMax) {
        next.add(id);
      }
      return next;
    });
  };

  const canConfirm = selected.size === effectiveMax;

  const keyframes = `
    @keyframes legendFadeIn {
      0% { opacity: 0; transform: translateY(30px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes legendTitleGlow {
      0%, 100% { text-shadow: 0 0 20px rgba(251,191,36,0.6), 0 0 40px rgba(251,191,36,0.2); }
      50% { text-shadow: 0 0 30px rgba(251,191,36,0.9), 0 0 60px rgba(251,191,36,0.4), 0 0 80px rgba(217,119,6,0.2); }
    }
    @keyframes starPulse {
      0%, 100% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.3); opacity: 1; }
    }
    @keyframes cardReveal {
      0% { opacity: 0; transform: translateX(-10px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes selectedGlow {
      0%, 100% { box-shadow: 0 0 12px rgba(251,191,36,0.2), inset 0 0 12px rgba(251,191,36,0.05); }
      50% { box-shadow: 0 0 20px rgba(251,191,36,0.35), inset 0 0 20px rgba(251,191,36,0.08); }
    }
    @keyframes confirmReveal {
      0% { opacity: 0; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1); }
    }
    .legend-scroll::-webkit-scrollbar { width: 4px; }
    .legend-scroll::-webkit-scrollbar-track { background: transparent; }
    .legend-scroll::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.2); border-radius: 2px; }
    .legend-scroll::-webkit-scrollbar-thumb:hover { background: rgba(251,191,36,0.4); }
  `;

  if (confirming) {
    const selectedPlayers = pickable.filter(p => selected.has(p.id));
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: Z.fullscreen,
        background: "radial-gradient(ellipse at center, #1a1000 0%, #0f0a00 30%, #000 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT,
        overflow: "hidden",
      }}>
        <style>{keyframes}</style>
        <div style={{
          textAlign: "center", maxWidth: mob ? "92%" : 520,
          padding: mob ? "36px 24px" : "52px 44px",
          background: "linear-gradient(170deg, rgba(30,41,59,0.6) 0%, rgba(15,23,42,0.8) 60%, rgba(30,41,59,0.4) 100%)",
          border: "2px solid rgba(251,191,36,0.5)",
          boxShadow: "0 0 60px rgba(251,191,36,0.15), inset 0 0 40px rgba(251,191,36,0.03)",
          animation: "confirmReveal 0.5s ease-out forwards",
        }}>
          <div style={{
            fontSize: mob ? 10 : 12, color: C.amber, letterSpacing: 4, marginBottom: 8, opacity: 0.6,
          }}>
            {"★ ★ ★ ★ ★"}
          </div>
          <div style={{
            fontSize: mob ? F.lg : F.xl, color: C.amber, marginBottom: 8, letterSpacing: 2,
            animation: "legendTitleGlow 3s ease-in-out infinite",
          }}>
            CONFIRM LEGENDS?
          </div>
          <div style={{ fontSize: F.xs, color: C.textDim, marginBottom: 28, lineHeight: 1.8 }}>
            These players become immortal. Everyone else retires.
          </div>
          <div style={{ marginBottom: 32 }}>
            {selectedPlayers.map((p, i) => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                padding: "8px 0",
                color: C.amber, fontSize: F.sm,
                animation: `cardReveal 0.4s ease-out ${i * 0.1}s both`,
              }}>
                <span style={{ color: "rgba(251,191,36,0.4)", fontSize: 8 }}>{"★"}</span>
                <span style={{ color: getPosColor(p.position), fontSize: F.xs }}>{p.position}</span>
                <span>{p.name}</span>
                <span style={{ color: C.textDim, fontSize: F.xs }}>OVR {getOverall(p)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setConfirming(false)}
              style={{
                padding: mob ? "12px 24px" : "14px 32px",
                background: "transparent", border: "1px solid rgba(148,163,184,0.3)",
                color: C.textMuted, fontFamily: FONT,
                fontSize: F.xs, cursor: "pointer", letterSpacing: 1,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => { e.target.style.borderColor = "rgba(148,163,184,0.6)"; }}
              onMouseLeave={e => { e.target.style.borderColor = "rgba(148,163,184,0.3)"; }}
            >
              GO BACK
            </button>
            <button
              onClick={() => onDone([...selected])}
              style={{
                padding: mob ? "12px 24px" : "14px 32px",
                background: "linear-gradient(180deg, #fbbf24, #d97706)",
                border: "2px solid #fcd34d",
                color: "#1e293b", fontFamily: FONT,
                fontSize: F.xs, cursor: "pointer", letterSpacing: 1,
                boxShadow: "0 4px 0 #92400e, 0 0 20px rgba(251,191,36,0.3)",
              }}
              onMouseEnter={e => { e.target.style.transform = "translateY(2px)"; e.target.style.boxShadow = "0 2px 0 #92400e, 0 0 20px rgba(251,191,36,0.3)"; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 0 #92400e, 0 0 20px rgba(251,191,36,0.3)"; }}
            >
              INDUCT LEGENDS
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sorted = pickable.slice().sort((a, b) => getOverall(b) - getOverall(a));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: Z.fullscreen,
      background: phase >= 1
        ? "radial-gradient(ellipse at 50% 30%, #1a1000 0%, #0f0a00 35%, #050300 60%, #000 100%)"
        : "#000",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: FONT,
      overflow: "hidden",
      transition: "background 1s ease",
    }}>
      <style>{keyframes}</style>

      {/* Ambient gold particles */}
      {phase >= 1 && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {Array.from({ length: 30 }, (_, i) => {
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const size = 1 + Math.random() * 2;
            const delay = Math.random() * 4;
            const dur = 3 + Math.random() * 3;
            return (
              <div key={i} style={{
                position: "absolute",
                left: `${x}%`, top: `${y}%`,
                width: size, height: size,
                borderRadius: "50%",
                background: C.amber,
                opacity: 0,
                animation: `starPulse ${dur}s ease-in-out ${delay}s infinite`,
              }} />
            );
          })}
        </div>
      )}

      {/* Scrollable content area */}
      <div className="legend-scroll" style={{
        width: "100%", maxWidth: mob ? "100%" : 820,
        height: "100%",
        overflowY: "auto", overflowX: "hidden",
        padding: mob ? "32px 16px" : "44px 32px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Header */}
        {phase >= 2 && (
          <div style={{
            textAlign: "center", marginBottom: 24, width: "100%",
            animation: "legendFadeIn 0.8s ease-out forwards",
          }}>
            {/* Decorative stars */}
            <div style={{
              fontSize: mob ? 8 : 10, color: C.amber, letterSpacing: 8, marginBottom: 12, opacity: 0.5,
            }}>
              {"★  ★  ★  ★  ★"}
            </div>

            <div style={{
              fontSize: mob ? F.xl : F.h2, color: C.amber, letterSpacing: 4,
              animation: "legendTitleGlow 3s ease-in-out infinite",
              marginBottom: 6,
            }}>
              HALL OF LEGENDS
            </div>

            <div style={{
              fontSize: mob ? 8 : 9, color: "rgba(251,191,36,0.4)", letterSpacing: 3, marginBottom: 16,
            }}>
              {"— PRESTIGE " + newPrestigeLevel + " INDUCTION —"}
            </div>

            <div style={{
              fontSize: mob ? F.xs : F.sm, color: C.textMuted, lineHeight: 2, marginBottom: 4,
            }}>
              Choose {effectiveMax} players to immortalise.
            </div>
            <div style={{
              fontSize: mob ? F.xs : F.sm, color: C.textDim, lineHeight: 2, marginBottom: 12,
            }}>
              Everyone else will retire.
            </div>

            <div style={{
              fontSize: F.xs, color: "rgba(251,191,36,0.6)",
              background: "rgba(251,191,36,0.04)",
              border: "1px solid rgba(251,191,36,0.15)",
              padding: "8px 18px", display: "inline-block",
              letterSpacing: 1,
            }}>
              Cap OVR {legendCap} · 12 apps/season
            </div>
          </div>
        )}

        {/* Selection counter as stars */}
        {phase >= 2 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            marginBottom: 20,
            animation: "legendFadeIn 0.8s ease-out 0.2s both",
          }}>
            {Array.from({ length: effectiveMax }, (_, i) => (
              <div key={i} style={{
                fontSize: mob ? 14 : 18,
                color: i < selected.size ? C.amber : "rgba(148,163,184,0.2)",
                transition: "all 0.3s ease",
                transform: i < selected.size ? "scale(1.1)" : "scale(1)",
                filter: i < selected.size ? "drop-shadow(0 0 6px rgba(251,191,36,0.6))" : "none",
              }}>
                {"★"}
              </div>
            ))}
            <span style={{
              fontSize: F.xs, color: canConfirm ? "#4ade80" : C.textDim, marginLeft: 6,
            }}>
              {selected.size}/{effectiveMax}
            </span>
          </div>
        )}

        {/* Player grid */}
        {phase >= 3 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: mob ? "1fr" : "1fr 1fr",
            gap: mob ? 5 : 7,
            marginBottom: 28,
            width: "100%",
          }}>
            {sorted.map((p, idx) => {
              const isSelected = selected.has(p.id);
              const ovr = getOverall(p);
              const isFull = selected.size >= effectiveMax && !isSelected;
              return (
                <div
                  key={p.id}
                  onClick={() => !isFull && toggle(p.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: mob ? 8 : 10,
                    padding: mob ? "11px 12px" : "12px 16px",
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(217,119,6,0.08) 100%)"
                      : "rgba(15,23,42,0.5)",
                    border: isSelected
                      ? "1px solid rgba(251,191,36,0.5)"
                      : "1px solid rgba(51,65,85,0.3)",
                    cursor: isFull ? "default" : "pointer",
                    opacity: isFull ? 0.3 : 1,
                    transition: "all 0.2s ease",
                    animation: `cardReveal 0.3s ease-out ${idx * 0.03}s both`,
                    ...(isSelected ? { animation: `cardReveal 0.3s ease-out ${idx * 0.03}s both, selectedGlow 2s ease-in-out infinite` } : {}),
                  }}
                >
                  {/* Selection star */}
                  <div style={{
                    width: 18, height: 18, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: isSelected ? 14 : 10,
                    color: isSelected ? C.amber : "rgba(148,163,184,0.2)",
                    transition: "all 0.2s ease",
                    filter: isSelected ? "drop-shadow(0 0 4px rgba(251,191,36,0.6))" : "none",
                  }}>
                    {"★"}
                  </div>

                  {/* Position */}
                  <span style={{
                    fontSize: F.xs, color: getPosColor(p.position),
                    width: 28, textAlign: "center", flexShrink: 0,
                  }}>{p.position}</span>

                  {/* Name */}
                  <span style={{
                    flex: 1, fontSize: mob ? F.xs : F.sm,
                    color: isSelected ? C.amber : C.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    transition: "color 0.2s ease",
                  }}>{p.name}</span>

                  {/* Age */}
                  <span style={{
                    fontSize: F.xs, color: C.textDim, flexShrink: 0,
                  }}>{p.age}</span>

                  {/* OVR */}
                  <span style={{
                    fontSize: F.sm,
                    color: isSelected ? C.amber : C.textMuted,
                    fontWeight: "bold", flexShrink: 0, width: 24, textAlign: "right",
                    transition: "color 0.2s ease",
                  }}>{ovr}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Confirm button */}
        {phase >= 3 && (
          <div style={{
            textAlign: "center", paddingBottom: 36,
            animation: "legendFadeIn 0.6s ease-out 0.8s both",
          }}>
            <button
              onClick={() => canConfirm && setConfirming(true)}
              disabled={!canConfirm}
              style={{
                padding: mob ? "14px 32px" : "18px 48px",
                background: canConfirm
                  ? "linear-gradient(180deg, #fbbf24, #d97706)"
                  : "rgba(30, 41, 59, 0.4)",
                border: canConfirm ? "2px solid #fcd34d" : "1px solid rgba(51,65,85,0.3)",
                color: canConfirm ? "#1e293b" : C.textDim,
                fontFamily: FONT,
                fontSize: mob ? F.xs : F.sm,
                cursor: canConfirm ? "pointer" : "default",
                letterSpacing: 2,
                boxShadow: canConfirm ? "0 4px 0 #92400e, 0 0 30px rgba(251,191,36,0.2)" : "none",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={e => {
                if (canConfirm) { e.target.style.transform = "translateY(2px)"; e.target.style.boxShadow = "0 2px 0 #92400e, 0 0 30px rgba(251,191,36,0.2)"; }
              }}
              onMouseLeave={e => {
                if (canConfirm) { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 0 #92400e, 0 0 30px rgba(251,191,36,0.2)"; }
              }}
            >
              INDUCT LEGENDS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
