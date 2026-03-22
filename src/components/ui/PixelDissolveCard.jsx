import React, { useState } from "react";
import { F, C, Z } from "../../data/tokens";
import { ATTRIBUTES } from "../../data/training.js";
import { getPosColor } from "../../utils/calc.js";
import { displayName } from "../../utils/player.js";
import { SFX } from "../../utils/sfx.js";
import { useMobile } from "../../hooks/useMobile.js";

export function PixelDissolveCard({ gain, onRevealed, index, isNext, onPlayerClick }) {
  const [dissolving, setDissolving] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [pixels, setPixels] = useState([]);
  const mob = useMobile();
  const attr = ATTRIBUTES.find(a => a.key === gain.attr);

  const handleClick = () => {
    if (dissolving || revealed || !isNext) return;
    setDissolving(true);
    SFX.reveal();

    // Generate pixel grid for dissolve
    const cols = 20;
    const rows = 4;
    const newPixels = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newPixels.push({
          x: (c / cols) * 100,
          y: (r / rows) * 100,
          w: 100 / cols,
          h: 100 / rows,
          delay: Math.random() * 500 + c * 15,
        });
      }
    }
    setPixels(newPixels);

    setTimeout(() => {
      setRevealed(true);
      setDissolving(false);
      onRevealed();
    }, 700);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: "relative",
        height: mob ? 48 : 56,
        marginBottom: mob ? 6 : 8,
        cursor: isNext && !revealed ? "pointer" : "default",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* Revealed content */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: mob ? "0 10px" : "0 16px",
        background: "linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(74,222,128,0.03) 50%, rgba(74,222,128,0.1) 100%)",
        border: "1px solid rgba(74,222,128,0.35)",
        opacity: revealed || dissolving ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}>
        <span style={{ color: C.text, fontSize: mob ? F.xs : F.sm, cursor: revealed ? "pointer" : "default", textDecoration: revealed ? "underline" : "none", textDecorationColor: "rgba(226,232,240,0.2)", textUnderlineOffset: 3, display: "inline-flex", alignItems: "center", gap: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, maxWidth: "50%" }}
          onClick={(e) => { if (revealed && onPlayerClick) { e.stopPropagation(); onPlayerClick(gain.playerName); } }}
        >{gain.playerPosition && <span style={{ background: getPosColor(gain.playerPosition), color: C.bg, padding: "4px 8px", fontSize: F.sm, fontWeight: "bold", textDecoration: "none", borderRadius: 3 }}>{gain.playerPosition}</span>}{displayName(gain.playerName, mob)}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 8 }}>
          <span style={{
            color: attr?.color || "#fff", fontSize: mob ? F.micro : F.xs,
            textShadow: `0 0 8px ${attr?.color || "#fff"}55`,
          }}>{attr?.label}</span>
          <span style={{
            color: C.green, fontSize: mob ? F.lg : F.xl, fontWeight: "bold",
            textShadow: "0 0 10px rgba(74,222,128,0.9), 0 0 25px rgba(74,222,128,0.4)",
          }}>+1</span>
          <span style={{ color: C.textMuted, fontSize: mob ? F.micro : F.xs }}>
            {gain.oldVal} → <span style={{ color: C.text }}>{gain.newVal}</span>
          </span>
        </span>
      </div>

      {/* Cover with pixel dissolve */}
      {!revealed && !dissolving && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, #181830 0%, #1e1e3a 40%, #181830 100%)",
          border: `1px solid ${isNext ? C.bgInput : "#1a1a2e"}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: mob ? "0 10px" : "0 16px",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
          boxShadow: isNext ? "0 0 12px rgba(74,222,128,0.08)" : "none",
        }}>
          <span style={{ color: isNext ? C.bgInput : "#1a1a2e", fontSize: F.sm, letterSpacing: 3 }}>? ? ? ? ?</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: isNext ? C.bgInput : "#1a1a2e", fontSize: F.xs }}>???</span>
            <span style={{ color: isNext ? C.bgInput : "#1a1a2e", fontSize: F.xl, fontWeight: "bold" }}>+1</span>
            <span style={{ color: isNext ? C.bgInput : "#1a1a2e", fontSize: F.xs }}>? → ?</span>
          </span>
          {isNext && (
            <div style={{
              position: "absolute", bottom: 4, left: 0, right: 0,
              textAlign: "center", fontSize: F.micro, color: C.green,
              letterSpacing: 2, opacity: 0.7,
              animation: "pulse 2s ease infinite",
            }}>
              TAP TO REVEAL
            </div>
          )}
        </div>
      )}

      {/* Dissolving pixel blocks */}
      {dissolving && pixels.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: `${p.w}%`,
          height: `${p.h}%`,
          background: "#1a1a30",
          opacity: 1,
          animation: `pixelFade 0.4s ease ${p.delay}ms forwards`,
          zIndex: Z.card,
        }} />
      ))}

      {/* Metallic sheen on revealed card */}
      {revealed && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)",
          animation: `sheen 2.5s ease ${index * 0.2}s infinite`,
          pointerEvents: "none",
        }} />
      )}
    </div>
  );
}
