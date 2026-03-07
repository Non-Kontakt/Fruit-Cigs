import React, { useMemo } from "react";
import { F, C, FONT } from "../../data/tokens";

// ─── Hashing / RNG ────────────────────────────────────────────────────────────

function hashStr(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function makeLCG(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─── WCAG contrast helpers ─────────────────────────────────────────────────────

function linearise(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// Relative luminance of a #rrggbb hex colour (WCAG 2.1 §1.4.3)
function luminance(hex) {
  const r = linearise(parseInt(hex.slice(1, 3), 16) / 255);
  const g = linearise(parseInt(hex.slice(3, 5), 16) / 255);
  const b = linearise(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(L1, L2) {
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Pick "#ffffff" or "#000000" so the emblem has the best contrast
 * against all background colours it overlaps. Uses WCAG luminance math —
 * picks whichever candidate maximises the worst-case contrast ratio.
 */
function emblemColor(...bgHexes) {
  const bgLums = bgHexes.map(luminance);
  const L_W = 1, L_B = 0;
  const minW = Math.min(...bgLums.map(L => contrast(L_W, L)));
  const minB = Math.min(...bgLums.map(L => contrast(L_B, L)));
  return minW >= minB ? "#ffffff" : "#000000";
}

// ─── Badge data ────────────────────────────────────────────────────────────────

// 6 distinct shield outlines (viewBox 0 0 100 120)
const SHIELDS = [
  "M 6 4 H 94 V 76 L 50 116 L 6 76 Z",                           // Classic pointed
  "M 6 4 H 94 V 70 Q 94 100 50 116 Q 6 100 6 70 Z",              // Curved bottom
  "M 0 4 H 100 V 82 L 50 114 L 0 82 Z",                          // Wide flat
  "M 16 4 H 84 L 100 26 V 78 L 50 114 L 0 78 V 26 Z",            // Hex top
  "M 6 4 H 94 L 100 34 V 76 L 50 116 L 0 76 V 34 Z",             // Angled shoulders
  "M 50 4 Q 94 4 94 40 Q 94 80 50 116 Q 6 80 6 40 Q 6 4 50 4 Z", // Oval/vesica
];

// All dark so they reliably contrast with bright team primaries
const SECONDARIES = [
  "#1e3a5f", "#312e81", "#14532d", "#7c1d1d",
  "#1e1b4b", "#164e63", "#44370a", "#2d1b69",
  "#0c4a6e", "#365314", "#500724", "#1c1917",
  "#2c1654", "#0a2e1a", "#3b0764", "#1a1a2e",
];

// ─── Geometry constants ────────────────────────────────────────────────────────

const CX = 50, CY = 50; // emblem centre (in shield body, away from the point)
const W = 100, H = 120;

// ─── Which background colour(s) does the emblem sit on, per pattern? ──────────
//
//   Pattern 0  – solid primary                     → primary
//   Pattern 1  – left-primary / right-secondary    → BOTH (emblem straddles x=50)
//   Pattern 2  – left-secondary / right-primary    → BOTH (same)
//   Pattern 3  – top-primary / bottom-secondary    → primary  (emblem at y=50 < split y=60)
//   Pattern 4  – diagonal top-left primary         → primary  (point 50,50 is inside tri)
//   Pattern 5  – chevron (apex at y=60)            → secondary (emblem at y=50 is above apex)
//   Pattern 6  – sash stripe (x=33–67 secondary)  → secondary (emblem at x=50 is in stripe)

function emblemBgs(patternIdx, primary, secondary) {
  switch (patternIdx) {
    case 1:
    case 2:  return [primary, secondary]; // spans both halves
    case 5:
    case 6:  return [secondary];
    default: return [primary];
  }
}

// ─── Renderers ─────────────────────────────────────────────────────────────────

function renderPattern(idx, primary, secondary) {
  switch (idx) {
    case 0: return <rect x="0" y="0" width={W} height={H} fill={primary} />;
    case 1: return (
      <>
        <rect x="0"   y="0" width={W}   height={H} fill={secondary} />
        <rect x="0"   y="0" width={W/2} height={H} fill={primary} />
      </>
    );
    case 2: return (
      <>
        <rect x="0"   y="0" width={W}   height={H} fill={primary} />
        <rect x={W/2} y="0" width={W/2} height={H} fill={secondary} />
      </>
    );
    case 3: return (
      <>
        <rect x="0" y="0"    width={W} height={H}   fill={primary} />
        <rect x="0" y={H/2} width={W} height={H/2} fill={secondary} />
      </>
    );
    case 4: return (
      <>
        <rect x="0" y="0" width={W} height={H} fill={secondary} />
        <polygon points={`0,0 ${W},0 0,${H}`} fill={primary} />
      </>
    );
    case 5: return (
      <>
        <rect x="0" y="0" width={W} height={H} fill={secondary} />
        <polygon points={`0,28 ${CX},60 ${W},28 ${W},${H} 0,${H}`} fill={primary} />
      </>
    );
    case 6: return (
      <>
        <rect x="0"  y="0" width={W}  height={H} fill={primary} />
        <rect x="33" y="0" width="34" height={H} fill={secondary} />
      </>
    );
    default: return <rect x="0" y="0" width={W} height={H} fill={primary} />;
  }
}

function starPath(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a   = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

function renderEmblem(idx, initial, E) {
  switch (idx) {
    case 0: return <path d={starPath(CX, CY, 21)} fill={E} />;
    case 1: return (
      <polygon
        fill={E}
        points={`${CX-19},${CY+11} ${CX-19},${CY-6} ${CX-10},${CY-18} ${CX},${CY-10} ${CX+10},${CY-18} ${CX+19},${CY-6} ${CX+19},${CY+11}`}
      />
    );
    case 2: return (
      <polygon
        fill={E}
        points={`${CX+5},${CY-22} ${CX-8},${CY+1} ${CX+4},${CY+1} ${CX-5},${CY+22} ${CX+12},${CY-1} ${CX+1},${CY-1}`}
      />
    );
    case 3: return <circle cx={CX} cy={CY} r="18" fill="none" stroke={E} strokeWidth="5" />;
    case 4: return (
      <>
        <rect x={CX-4}  y={CY-20} width="8"  height="40" rx="2" fill={E} />
        <rect x={CX-20} y={CY-4}  width="40" height="8"  rx="2" fill={E} />
      </>
    );
    case 5: return (
      <polygon
        fill={E}
        points={`${CX},${CY-22} ${CX+17},${CY} ${CX},${CY+22} ${CX-17},${CY}`}
      />
    );
    case 6: return (
      <text
        x={CX} y={CY + 10}
        textAnchor="middle"
        fontSize={F.h1}
        fontWeight="bold"
        fill={E}
        fontFamily={FONT}
      >
        {initial}
      </text>
    );
    case 7: return (
      <>
        <circle cx={CX}      cy={CY - 14} r="8" fill={E} />
        <circle cx={CX - 14} cy={CY + 8}  r="8" fill={E} />
        <circle cx={CX + 14} cy={CY + 8}  r="8" fill={E} />
      </>
    );
    default: return null;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Procedural SVG club crest.
 * @param {string} name  - team name (deterministic seed)
 * @param {string} color - team primary colour (#rrggbb)
 * @param {number} size  - rendered width px; height = size × 1.2
 */
export function ClubBadge({ name, color, size = 40 }) {
  const { shieldIdx, patternIdx, emblemIdx, secondary, clipId } = useMemo(() => {
    const h = hashStr(name || "?");
    const r = makeLCG(h);
    return {
      shieldIdx:  Math.floor(r() * SHIELDS.length),
      patternIdx: Math.floor(r() * 7),
      emblemIdx:  Math.floor(r() * 8),
      secondary:  SECONDARIES[Math.floor(r() * SECONDARIES.length)],
      clipId:     `bc${h}`,
    };
  }, [name]);

  const primary = color || C.green;
  const shield  = SHIELDS[shieldIdx];
  const initial = (name || "?")[0].toUpperCase();

  // WCAG-checked emblem colour — no opacity tricks, full white or black
  const bgs = emblemBgs(patternIdx, primary, secondary);
  const E   = emblemColor(...bgs);

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={Math.round(size * 1.2)}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={shield} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {renderPattern(patternIdx, primary, secondary)}
        {renderEmblem(emblemIdx, initial, E)}
      </g>

      {/* Shield outline */}
      <path d={shield} fill="none" stroke="#ffffff28" strokeWidth="3" />
    </svg>
  );
}
