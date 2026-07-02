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
// Saves created before this metadata existed carry choices with none of
// these fields. `normaliseChoice` overlays per-message-type defaults for
// them, so old saves render with the same semantics as new messages. That
// fallback lives HERE, not in the components — the rule stays centralised.

import { C } from "../data/tokens.js";

// Fallback tone/resultText for pre-metadata saved messages, keyed by
// msg.type then choice.value ("*" matches any value). Copy mirrors what
// messages.js now bakes into newly generated messages, minus details
// (names, attributes) that a stale choice doesn't carry. An entry may be a
// function of the choice when the fallback can be derived from its label.
const LEGACY_CHOICE_DEFAULTS = {
  asst_mgr_training_intro: {
    delegate: { tone: "primary", resultText: "Asst. Manager has put everyone on a balanced training programme." },
    manual:   { tone: "neutral", resultText: "You'll set training assignments yourself on the Squad page." },
  },
  asst_mgr_training_nudge: {
    delegate: { tone: "primary", resultText: "Asst. Manager stepped in — squad on a balanced programme." },
    dismiss:  { tone: "neutral", resultText: "You're holding off on training for now." },
  },
  trial_offer: {
    accept:  { tone: "primary", resultText: "You took on the trial." },
    decline: { tone: "neutral", resultText: "You passed on the trial." },
  },
  prodigal_offer: {
    accept:  { tone: "primary", resultText: "You welcomed him back." },
    decline: { tone: "neutral", resultText: "You passed on the return." },
  },
  free_agent_offer: {
    accept:  { tone: "primary", resultText: "You signed the player." },
    decline: { tone: "neutral", resultText: "You passed on the deal." },
  },
  poach_event: {
    // All poach choices are equivalent signings; the name is recoverable
    // from the button label ("Sign Remy Diaby").
    "*": (choice) => ({
      tone: "primary",
      resultText: choice?.label?.startsWith("Sign ") ? `You signed ${choice.label.slice(5)}.` : null,
    }),
  },
  stat_cap: {
    switch_training: { tone: "primary", resultText: "Training switched to the suggested focus." },
    dismiss:         { tone: "neutral", resultText: "You'll set their training yourself." },
  },
};

const VALID_TONES = new Set(["primary", "neutral", "danger"]);

function legacyDefaults(msg, choice) {
  const byType = LEGACY_CHOICE_DEFAULTS[msg?.type];
  if (!byType) return null;
  const entry = byType[choice?.value] ?? byType["*"] ?? null;
  return typeof entry === "function" ? entry(choice) : entry;
}

/**
 * Overlay legacy per-type defaults onto a choice that predates the tone /
 * resultText metadata. Explicit fields always win; a fully-declared choice
 * is returned untouched.
 */
export function normaliseChoice(msg, choice) {
  if (!choice) return choice;
  const hasTone = VALID_TONES.has(choice.tone);
  const hasText = !!choice.resultText;
  if (hasTone && hasText) return choice;
  const legacy = legacyDefaults(msg, choice);
  if (!legacy) return choice;
  return {
    ...choice,
    ...(!hasTone && VALID_TONES.has(legacy.tone) ? { tone: legacy.tone } : {}),
    ...(!hasText && legacy.resultText ? { resultText: legacy.resultText } : {}),
  };
}

function readTone(choice) {
  const t = choice?.tone;
  return VALID_TONES.has(t) ? t : "neutral";
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
 * Takes `msg` so legacy saved choices resolve their tone from the
 * per-message-type fallback table.
 */
export function getChoiceButtonStyle(msg, choice) {
  const tone = readTone(normaliseChoice(msg, choice));
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
 */
export function getChoiceResult(msg, choice) {
  const resolved = normaliseChoice(msg, choice);
  const tone = readResultTone(resolved);
  let color = C.textMuted;
  let icon = null;
  if (tone === "positive") { color = C.green; icon = "✓"; }
  else if (tone === "danger") { color = C.lightRed; icon = "✕"; }
  // Prefer per-choice resultText (declared or legacy-derived). The bare
  // label is the last resort for message types outside the fallback table.
  const text = resolved?.resultText || resolved?.label || "Chosen";
  return { color, icon, text };
}
