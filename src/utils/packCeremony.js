// Shared render helpers for the Corner Shop's cigarette-pack ceremony. The
// sealed stack (CigPacksTab) and the reveal's torn-open body and lid
// (PackUnlockReveal) all need to look like the same physical pack, so the
// surface material and the tear-line geometry live here once instead of as
// copies in each component.

// Solid diagonal-stripe pack material in the pack's own colour, with a
// faint conic-gradient checker overlay for paper texture. Every place a
// pack surface renders (sealed stack, reveal body, reveal lid) uses this
// exact background so the pack reads as one consistent object before and
// after it tears open.
export function getPackSurfaceBackground(color) {
  return `repeating-conic-gradient(rgba(255,255,255,0.10) 0% 25%, transparent 0% 50%) 0 0 / 10px 10px,
    repeating-linear-gradient(45deg, color-mix(in srgb, ${color} 78%, black) 0 8px, color-mix(in srgb, ${color} 62%, black) 8px 16px),
    color-mix(in srgb, ${color} 70%, black)`;
}

// Stepped zigzag tear line (pixel-art serration, not a smooth wave) as a
// CSS polygon() clip-path string, so the edge reads as a paper tear rather
// than a castle-wall crenellation at mobile card scale. toothWidthPct is
// the width of each upward notch; the gap between notches is 1.5x that
// width, so a notch-and-gap pair (the pitch) repeats every 2.5x
// toothWidthPct across the full 0-100% span. toothDepthPct is how far the
// notch cuts up from the bottom edge.
export function makeTearClipPath(toothWidthPct, toothDepthPct) {
  const gap = toothWidthPct * 1.5;
  const pitch = toothWidthPct + gap;
  const bottom = 100 - toothDepthPct;
  const points = ["0% 100%"];
  for (let x = 0; x < 100; x += pitch) {
    const xEnd = Math.min(x + toothWidthPct, 100);
    const xNext = Math.min(x + pitch, 100);
    points.push(`${x}% ${bottom}%`, `${xEnd}% ${bottom}%`, `${xEnd}% 100%`, `${xNext}% 100%`);
  }
  return `polygon(${points.join(", ")})`;
}
