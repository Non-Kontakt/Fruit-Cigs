import { C } from "../data/tokens";

// Kit derivation for the matchday commentary box (#460).
//
// FC teams carry one colour; the box needs a two-colour pair whose normal
// and inverted states are both legible in small Press Start 2P across a
// large hero surface. WCAG AA (4.5:1) proved too weak in practice, so the
// contract is a minimum 7:1 MUTUAL contrast: the team hue is preserved and
// the presentation shade is stepped lighter or darker until the pair
// clears the threshold. HTO solved this with curated two-colour kits; the
// explicit guard is FC's equivalent protection for derived pairs.

export const MIN_KIT_CONTRAST = 7;

export function normaliseHex(color) {
  const hex = String(color || "").replace("#", "").trim();
  const six = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  return /^[0-9a-fA-F]{6}$/.test(six) ? `#${six.toLowerCase()}` : "#334155";
}

// WCAG 2.x relative luminance.
export function relativeLuminance(hex) {
  const n = normaliseHex(hex).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// --- hue-preserving shade adjustment -------------------------------------

function hexToHsl(hex) {
  const n = normaliseHex(hex).slice(1);
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToHex({ h, s, l }) {
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const to2 = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

// Two hue-preserving strategies, CM-style (their kits flickered between two
// rich shades of the club's colours — never a washed tint, never a box that
// melts into the page):
//
// - BRIGHT team colours keep their shade and take a deep same-hue ink as
//   text. The inverted flash phase is then a dark hue-tinted box — still a
//   box, distinct from the page's navy.
// - MID/DARK team colours can never reach 7:1 against any dark ink
//   (mathematical ceiling), so they deepen until they clear 7:1 against the
//   app's light text instead. Rich deep colour, light text; the inverted
//   phase is a light box with deep coloured text.
//
// Either way the hue is the team's; only the presentation shade earns its
// legibility.

function darkenUntil(hsl, text) {
  for (let i = 0; i < 60; i++) {
    const candidate = hslToHex(hsl);
    if (contrastRatio(candidate, text) >= MIN_KIT_CONTRAST) return candidate;
    if (hsl.l <= 0) break;
    hsl.l = Math.max(0, hsl.l - 0.015);
  }
  return hslToHex(hsl);
}

export function deriveKit(color) {
  const base = normaliseHex(color);
  const { h, s: sat } = hexToHsl(base);

  // Bright enough to clear 7:1 against a deep ink? (Needs relative
  // luminance ≥ ~0.34 even against pure black.)
  if (relativeLuminance(base) >= 0.34) {
    const ink = darkenUntil({ h, s: Math.min(sat, 0.85), l: 0.12 }, base);
    if (contrastRatio(base, ink) >= MIN_KIT_CONTRAST) return [base, ink];
  }

  // Otherwise: deepen the team colour under the app's light text.
  const bg = darkenUntil(hexToHsl(base), C.text);
  return [bg, C.text];
}

// Neutral palette for sideless items (half-time, full-time, MOTM).
export function neutralKit() {
  return [C.bgCard, C.text];
}
