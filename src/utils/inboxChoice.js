// Centralised resolution of inbox-choice presentation. One module, one set
// of rules — used by both the full inbox (BootRoom) and the dashboard
// preview, so the two surfaces never drift apart.
//
// Each `choice` may declare:
//   - tone: "primary" | "neutral" | "danger"
//       Drives the button colour. Defaults to "neutral" — no automatic
//       red on refusal-style choices ("Pass", "Leave It", "Decline").
//   - resultText: string
//       Post-click summary shown on the resolved message. Should describe
//       what the choice did, not echo the button label.
//   - resultTone: "positive" | "neutral" | "danger"
//       Drives the colour and icon of the resolved-message line. Defaults
//       from `tone` (primary → positive, danger → danger, neutral →
//       neutral) — only set this explicitly when you want them to differ.
//
// Missing fields fall back gracefully so legacy saves with stale `choices`
// still render reasonably (no thrown errors, no red-on-everything).

import { C } from "../data/tokens.js";

function readTone(choice) {
  const t = choice?.tone;
  return t === "primary" || t === "neutral" || t === "danger" ? t : "neutral";
}

function readResultTone(choice) {
  const explicit = choice?.resultTone;
  if (explicit === "positive" || explicit === "neutral" || explicit === "danger") return explicit;
  const tone = readTone(choice);
  if (tone === "primary") return "positive";
  if (tone === "danger") return "danger";
  return "neutral";
}

/**
 * Style fields for a button rendering this choice.
 * Returns { background, border, color } strings for inline-style use.
 */
export function getChoiceButtonStyle(choice) {
  const tone = readTone(choice);
  if (tone === "primary") {
    return { background: "rgba(74,222,128,0.15)", border: C.green, color: C.green };
  }
  if (tone === "danger") {
    return { background: "rgba(239,68,68,0.10)", border: C.red, color: C.lightRed };
  }
  return { background: "rgba(148,163,184,0.08)", border: C.textMuted, color: C.textMuted };
}

/**
 * Resolved-message line for a chosen option: colour + leading icon + text.
 * Pass `msg` so future per-message bespoke text can hook in here without
 * touching every call site (today only `choice.resultText` and the bare
 * label are used).
 */
export function getChoiceResult(msg, choice) {
  const tone = readResultTone(choice);
  let color = C.textMuted;
  let icon = null;
  if (tone === "positive") { color = C.green; icon = "✓"; }
  else if (tone === "danger") { color = C.lightRed; icon = "✕"; }
  // Prefer per-choice resultText. Fall back to the choice's button label
  // so legacy saved choices (no resultText baked in) still echo something
  // intelligible instead of an empty line.
  const text = choice?.resultText || choice?.label || "Chosen";
  return { color, icon, text };
}
