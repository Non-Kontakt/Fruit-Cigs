import React, { useState } from "react";
import { F, C, Z } from "../../data/tokens";

export function MysteryCard({ index, item, isNext, onRevealed, renderRevealed }) {
  const [dissolving, setDissolving] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [pixels, setPixels] = useState([]);
  const mob = window.innerWidth <= 768;

  const handleClick = () => {
    if (dissolving || revealed || !isNext) return;
    setDissolving(true);

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

  // Hint colour based on type (but subtle — don't give away what it is)
  const hintBorder = isNext ? C.bgInput : "#1a1a2e";

  if (revealed) {
    return renderRevealed();
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: "relative",
        height: item.type === "duo" ? (mob ? 80 : 94) : item.type === "progress" ? (mob ? 52 : 62) : (mob ? 62 : 73),
        marginBottom: mob ? 8 : 10,
        cursor: isNext ? "pointer" : "default",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* Cover */}
      {!dissolving && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, #181830 0%, #1e1e3a 40%, #181830 100%)",
          border: `1px solid ${hintBorder}`,
          display: "flex", justifyContent: "center", alignItems: "center",
          boxShadow: isNext ? "0 0 12px rgba(74, 222, 128, 0.08)" : "none",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        }}>
          <span style={{ color: isNext ? C.bgInput : "#1a1a2e", fontSize: F.xl, letterSpacing: 8 }}>? ? ?</span>
          {isNext && (
            <div style={{
              position: "absolute", bottom: 4, left: 0, right: 0,
              textAlign: "center", fontSize: F.xs, color: C.green,
              letterSpacing: 2, opacity: 0.7,
              animation: "pulse 2s ease infinite",
            }}>
              TAP TO REVEAL
            </div>
          )}
        </div>
      )}

      {/* Dissolving pixels */}
      {dissolving && (
        <>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, #181830 0%, #1e1e3a 40%, #181830 100%)",
          }} />
          {pixels.map((p, i) => (
            <div key={i} style={{
              position: "absolute",
              left: `${p.x}%`, top: `${p.y}%`,
              width: `${p.w}%`, height: `${p.h}%`,
              background: "#1a1a30",
              opacity: 1,
              animation: `pixelFade 0.4s ease ${p.delay}ms forwards`,
              zIndex: Z.card,
            }} />
          ))}
        </>
      )}
    </div>
  );
}

