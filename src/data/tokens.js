// Typography scale — change SCALE to resize the entire app
const SCALE = 1.0;
const s = (n) => Math.round(n * SCALE);

export const C = {
  bg: "#0f0f23",
  bgCard: "#1e293b",
  bgInput: "#334155",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  green: "#4ade80",
  red: "#ef4444",
  slate: "#475569",
  gold: "#facc15",
  blue: "#60a5fa",
  amber: "#fbbf24",
  lightRed: "#f87171",
  purple: "#c084fc",
};

export const F = {
  micro: s(7),   // tiny decorative text, pitch player names
  xs:    s(9),   // badges, timestamps, hints
  sm:    s(11),  // small body, labels, secondary text
  md:    s(13),  // standard body, table content
  lg:    s(15),  // subheadings, emphasis
  xl:    s(18),  // section headers
  h3:    s(21),  // subsection titles
  h2:    s(24),  // page/modal titles
  h1:    s(28),  // hero titles
  hero:  s(42),  // match scores
};

// Z-index layering — semantic layer names for consistent stacking
export const Z = {
  card: 3,
  base: 10,
  header: 30,
  bar: 100,
  dropdown: 200,
  panel: 1000,
  celebration: 1050,
  panelOver: 1100,
  modal: 1200,
  seasonModal: 1250,
  modalHigh: 1300,
  backdrop: 2000,
  confirm: 3000,
  transition: 9998,
  fullscreen: 9999,
};

// The one font — every element uses this
export const FONT = "'Press Start 2P', monospace";

// Emoji style token — spread onto elements where emojis clip in tight containers
// Usage: <span style={{ ...EMOJI, fontSize: F.lg }}>🔥</span>
export const EMOJI = { fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif", lineHeight: 1, display: "inline-block", verticalAlign: "middle" };

// Button presets — spread then add padding + fontSize per use
// Usage: <button style={{ ...BTN.primary, padding: "16px 35px", fontSize: F.md }}>
export const BTN = {
  primary:  { background: "linear-gradient(180deg,#166534,#14532d)", border: `2px solid ${C.green}`, color: C.green, cursor: "pointer", fontFamily: FONT, letterSpacing: 1 },
  danger:   { background: "rgba(248,113,113,0.12)", border: `2px solid ${C.lightRed}`, color: C.lightRed, cursor: "pointer", fontFamily: FONT, letterSpacing: 1 },
  ghost:    { background: "none", border: `1px solid ${C.bgInput}`, color: C.textDim, cursor: "pointer", fontFamily: FONT, letterSpacing: 1 },
  text:     { background: "none", border: "none", color: C.textDim, cursor: "pointer", fontFamily: FONT },
  disabled: { background: "rgba(30,41,59,0.3)", border: `1px solid ${C.bgCard}`, color: C.textDim, cursor: "not-allowed", fontFamily: FONT, letterSpacing: 1 },
};

// Modal presets — spread backdrop on outer div, spread box on inner div
// Per-use: add border, padding, boxShadow, width to box
export const MODAL = {
  backdrop: { position: "fixed", inset: 0, zIndex: Z.backdrop, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT },
  box: { background: "linear-gradient(170deg,#1a1a2e 0%,#0d0d1f 60%,#1a1a2e 100%)", textAlign: "center", maxWidth: 460 },
};

// Card accent surfaces — spread then add padding, borderRadius per use
export const CARD = {
  red:   { background: "rgba(248,113,113,0.03)", border: "1px solid rgba(248,113,113,0.2)" },
  green: { background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.25)" },
  blue:  { background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.2)" },
};
