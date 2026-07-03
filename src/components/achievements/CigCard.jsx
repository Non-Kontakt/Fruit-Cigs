import React, { useEffect, useMemo, useRef, useState } from "react";
import { C, FONT } from "../../data/tokens";
import { CIG_PACKS } from "../../data/cigPacks.js";
import { ACHIEVEMENTS, LEGENDARY_ACHIEVEMENTS } from "../../data/achievements.js";
import { mixColor, mountDithering, prefersReducedMotion } from "../../utils/cigCardShaders.js";
import { formatUnlockWeek } from "../../utils/unlockWeeks.js";

// Card anatomy pixel constants, straight off the approved pitch — sticker
// frame, stepped pixel corners, 8-bit sky, badge foil patch, trading-card
// plate. `scale` resizes the whole thing via a CSS transform wrapper so
// none of these numbers need to change.
const CARD_W = 216;
const CARD_H = 316;
const STICKER = "#e9e9f2";
const STICKER_SHADE = "#b9b9cc";
const INK = "#10101f";

// Stepped pixel-corner clip-paths (card frame vs. the smaller badge/roundel
// squares), copied verbatim from the pitch's .card / .badge clip-paths.
const CARD_CLIP =
  "polygon(0 8px, 4px 8px, 4px 4px, 8px 4px, 8px 0, calc(100% - 8px) 0, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 4px), 4px calc(100% - 4px), 4px calc(100% - 8px), 0 calc(100% - 8px))";
const SQUARE_CLIP =
  "polygon(0 6px, 6px 6px, 6px 0, calc(100% - 6px) 0, calc(100% - 6px) 6px, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 6px calc(100% - 6px), 0 calc(100% - 6px))";

const STYLE_ID = "cig-card-styles";
function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes cigLegendShimmer {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;
  document.head.appendChild(style);
}

const achById = {};
ACHIEVEMENTS.forEach((a) => { achById[a.id] = a; });
const packById = {};
const achToPack = {};
CIG_PACKS.forEach((p) => {
  packById[p.id] = p;
  p.achievementIds.forEach((id) => { achToPack[id] = p.id; });
});

export function CigCard({ achievementId, state, unlockWeek = null, scale = 1, noGl = false }) {
  const ach = achById[achievementId];
  const packId = achToPack[achievementId];
  const pack = packById[packId];
  const accent = pack?.color || C.purple;
  const legendary = LEGENDARY_ACHIEVEMENTS.has(achievementId);
  const [hovered, setHovered] = useState(false);

  const cardRef = useRef(null);
  const backGlRef = useRef(null);
  const badgeGlRef = useRef(null);
  const skyGlRef = useRef(null);

  const { serial, packName, packCount } = useMemo(() => {
    const idx = ACHIEVEMENTS.findIndex((a) => a.id === achievementId);
    const serial = `NO. ${String(idx + 1).padStart(3, "0")}/${ACHIEVEMENTS.length}`;
    let packName = "";
    let packCount = "";
    if (pack) {
      const i = pack.achievementIds.indexOf(achievementId) + 1;
      packName = pack.name.toUpperCase();
      packCount = `${i}/${pack.packSize}`;
    }
    return { serial, packName, packCount };
  }, [achievementId, pack]);

  // Card back — ambient dithering wave in the pack colour, dormant if noGl.
  useEffect(() => {
    if (state !== "hidden" || noGl || !backGlRef.current) return;
    const mount = mountDithering(backGlRef.current, {
      back: mixColor(accent, -0.72),
      front: mixColor(accent, -0.18),
      shape: "wave",
      pxSize: 3,
      speed: 0.35,
    });
    return () => mount.dispose();
  }, [state, noGl, accent]);

  // Collected foil: pack-colour ripple on the badge, or (legendary) a
  // fixed-gold ripple on the sky — both dormant until the pointer hovers
  // the card.
  useEffect(() => {
    if (state !== "collected") return;
    if (legendary) {
      if (!skyGlRef.current) return;
      const mount = mountDithering(skyGlRef.current, {
        back: mixColor("#8a6a14", -0.5),
        front: mixColor("#ffe9a3", 0),
        shape: "ripple",
        pxSize: 3,
        speed: 0.4,
        hoverCard: cardRef.current,
      });
      return () => mount.dispose();
    }
    if (!badgeGlRef.current) return;
    const mount = mountDithering(badgeGlRef.current, {
      back: mixColor(accent, -0.7),
      front: mixColor(accent, 0.45),
      shape: "ripple",
      pxSize: 2,
      speed: 0.45,
      hoverCard: cardRef.current,
    });
    return () => mount.dispose();
  }, [state, legendary, accent]);

  useEffect(() => {
    if (state === "collected" && legendary) injectKeyframes();
  }, [state, legendary]);

  if (!ach || !pack) return null;

  const reduced = prefersReducedMotion();
  const isGhost = state === "uncollected";
  const isCollected = state === "collected";

  return (
    <div style={{ width: CARD_W * scale, height: CARD_H * scale }}>
      <div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: CARD_W,
          height: CARD_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
          clipPath: CARD_CLIP,
        }}
      >
        {state === "hidden"
          ? renderBack({ accent, noGl, backGlRef })
          : renderFace({
              ach, accent, legendary, isGhost, isCollected,
              serial, packName, packCount, unlockWeek, hovered, badgeGlRef, skyGlRef, reduced,
            })}
      </div>
    </div>
  );
}

function renderBack({ accent, noGl, backGlRef }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: STICKER, padding: 8,
      display: "flex", clipPath: CARD_CLIP,
    }}>
      <div style={{
        flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        background: `repeating-conic-gradient(rgba(255,255,255,0.10) 0% 25%, transparent 0% 50%) 0 0 / 12px 12px,
          repeating-linear-gradient(45deg, color-mix(in srgb, ${accent} 78%, black) 0 10px, color-mix(in srgb, ${accent} 62%, black) 10px 20px),
          color-mix(in srgb, ${accent} 70%, black)`,
        boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${accent} 45%, black)`,
      }}>
        {!noGl && <div ref={backGlRef} style={{ position: "absolute", inset: 0 }} />}
        <div style={{
          position: "relative", zIndex: 1, background: INK, padding: "14px 12px", textAlign: "center",
          boxShadow: `0 0 0 3px ${STICKER}, 0 0 0 5px rgba(0,0,0,0.4)`, clipPath: SQUARE_CLIP,
        }}>
          <span style={{ fontSize: 26, display: "block", marginBottom: 8 }}>🚬</span>
          <span style={{ fontFamily: FONT, fontSize: 8, color: "#f1f5f9", letterSpacing: 1, display: "block" }}>FRUIT CIGS</span>
          <span style={{ fontFamily: FONT, fontSize: 5, color: C.textDim, letterSpacing: 1, display: "block", marginTop: 6 }}>CIG CARD SERIES</span>
        </div>
      </div>
    </div>
  );
}

function renderFace({ ach, accent, legendary, isGhost, isCollected, serial, packName, packCount, unlockWeek, hovered, badgeGlRef, skyGlRef, reduced }) {
  const legendCollected = legendary && isCollected;

  let faceBackground = STICKER;
  let faceAnimation;
  if (isGhost) faceBackground = "#2a2a40";
  if (legendCollected) {
    faceBackground = "linear-gradient(115deg, #ffe9a3 0%, #d9a93f 30%, #f6d878 48%, #fff3c4 52%, #d9a93f 70%, #ffe9a3 100%)";
    faceAnimation = reduced ? undefined : "cigLegendShimmer 9s ease-in-out infinite";
  }

  const innerRing = legendCollected ? "#a97f1f" : isGhost ? "#30304a" : STICKER_SHADE;
  const nameColor = isGhost ? "#767e9c" : "#f1f5f9";
  const descColor = isGhost ? "#565e7c" : "#8b93ad";
  const packLineColor = isGhost ? "#565e7c" : accent;

  const d1 = isCollected ? (legendCollected ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.14)") : "transparent";
  const d2 = isCollected ? "rgba(0,0,0,0.2)" : "transparent";

  const badgeShadow = legendCollected
    ? "0 0 0 3px #ffe9a3, 0 0 0 5px rgba(120,85,10,0.6)"
    : isGhost
      ? "0 0 0 3px #2a2a40, 0 0 0 5px rgba(0,0,0,0.45)"
      : `0 0 0 3px ${STICKER}, 0 0 0 5px rgba(0,0,0,0.45)`;

  return (
    <div style={{
      position: "absolute", inset: 0, background: faceBackground, backgroundSize: legendCollected ? "320% 320%" : undefined,
      animation: faceAnimation, padding: 8, display: "flex", flexDirection: "column", clipPath: CARD_CLIP,
    }}>
      <div style={{
        flex: 1, background: INK, boxShadow: `inset 0 0 0 2px ${innerRing}`,
        display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
        filter: isGhost ? "grayscale(1) brightness(0.72) contrast(0.9)" : undefined,
      }}>
        {/* sky */}
        <div style={{
          height: 128, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
          filter: isGhost ? "grayscale(0.85) brightness(0.55)" : undefined,
          background: `repeating-conic-gradient(${d1} 0% 25%, transparent 0% 50%) 0 62px / 8px 8px,
            repeating-conic-gradient(${d2} 0% 25%, transparent 0% 50%) 4px 90px / 8px 8px,
            linear-gradient(color-mix(in srgb, ${accent} 90%, white) 0 34px, color-mix(in srgb, ${accent} 70%, ${INK}) 34px 70px, color-mix(in srgb, ${accent} 45%, ${INK}) 70px 100px, color-mix(in srgb, ${accent} 22%, ${INK}) 100px 128px)`,
        }}>
          {legendCollected && (
            <div
              ref={skyGlRef}
              style={{ position: "absolute", inset: 0, opacity: hovered ? 1 : 0, transition: "opacity 0.35s", pointerEvents: "none" }}
            />
          )}
          {/* badge */}
          <div style={{
            width: 84, height: 84, background: INK, boxShadow: badgeShadow,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44,
            clipPath: SQUARE_CLIP, position: "relative", zIndex: 1,
            filter: isGhost ? "grayscale(1) brightness(0.8)" : undefined,
          }}>
            {isCollected && !legendary && (
              <div
                ref={badgeGlRef}
                style={{ position: "absolute", inset: 0, opacity: hovered ? 1 : 0, transition: "opacity 0.3s", pointerEvents: "none" }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>{isGhost ? "?" : ach.icon}</span>
          </div>
        </div>

        {/* plate */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 12px 10px", gap: 8 }}>
          <div style={{ fontFamily: FONT, fontSize: 6.5, letterSpacing: 1, color: packLineColor, display: "flex", justifyContent: "space-between", gap: 6 }}>
            <span>{packName}</span>
            <span>{packCount}</span>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 11, lineHeight: 1.65, color: nameColor, textWrap: "balance", textTransform: "uppercase" }}>
            {ach.name}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 10, lineHeight: 1.55, color: descColor, flex: 1 }}>
            {ach.desc}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, borderTop: "2px solid #1e1e33", paddingTop: 8 }}>
            <span style={{ fontFamily: FONT, fontSize: 6, color: "#4a5170", letterSpacing: 1 }}>{serial}</span>
            {isCollected && (
              <span style={{
                fontFamily: FONT, fontSize: 6, letterSpacing: 1, color: INK,
                background: legendary ? C.amber : C.green, padding: "4px 6px 3px", boxShadow: "2px 2px 0 rgba(0,0,0,0.5)",
              }}>
                {formatUnlockWeek(unlockWeek)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
