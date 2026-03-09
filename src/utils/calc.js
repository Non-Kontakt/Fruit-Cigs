import { ATTRIBUTES } from "../data/training.js";
import { POS_GROUP, POSITION_TYPES } from "../data/positions.js";

export function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Position-weighted OVR. Weights sum to 1.00 per position.
// Only GK shooting is zero — every other attr contributes at least a small amount
// so training any attribute always has some OVR payoff for the player.
const OVR_WEIGHTS = {
  GK:  { pace:0.06, shooting:0.00, passing:0.12, defending:0.34, physical:0.20, technique:0.08, mental:0.20 },
  CB:  { pace:0.10, shooting:0.03, passing:0.05, defending:0.32, physical:0.22, technique:0.08, mental:0.20 },
  LB:  { pace:0.22, shooting:0.04, passing:0.11, defending:0.22, physical:0.14, technique:0.12, mental:0.15 },
  RB:  { pace:0.22, shooting:0.04, passing:0.11, defending:0.22, physical:0.14, technique:0.12, mental:0.15 },
  CM:  { pace:0.06, shooting:0.04, passing:0.24, defending:0.10, physical:0.14, technique:0.20, mental:0.22 },
  AM:  { pace:0.08, shooting:0.16, passing:0.24, defending:0.02, physical:0.05, technique:0.25, mental:0.20 },
  LW:  { pace:0.27, shooting:0.20, passing:0.10, defending:0.04, physical:0.06, technique:0.23, mental:0.10 },
  RW:  { pace:0.27, shooting:0.20, passing:0.10, defending:0.04, physical:0.06, technique:0.23, mental:0.10 },
  ST:  { pace:0.20, shooting:0.28, passing:0.04, defending:0.02, physical:0.20, technique:0.18, mental:0.08 },
};

export function getOverall(player) {
  if (!player?.attrs) return 0;
  const w = OVR_WEIGHTS[player.position];
  if (!w) {
    const vals = ATTRIBUTES.map(a => player.attrs[a.key] || 0);
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }
  return Math.round(ATTRIBUTES.reduce((s, a) => s + (player.attrs[a.key] || 0) * w[a.key], 0));
}

// Returns 0→1 progress within the current OVR band toward the next +1.
// OVR uses Math.round, so each band spans ±0.5 around the integer.
export function getOvrProgress(player) {
  if (!player?.attrs) return 0;
  const w = OVR_WEIGHTS[player.position];
  const rawAvg = w
    ? ATTRIBUTES.reduce((s, a) => s + (player.attrs[a.key] || 0) * w[a.key], 0)
    : ATTRIBUTES.map(a => player.attrs[a.key] || 0).reduce((s, v) => s + v, 0) / ATTRIBUTES.length;
  return Math.max(0, Math.min(1, rawAvg - Math.round(rawAvg) + 0.5));
}

export function getAttrColor(val, cap = 20) {
  const pct = val / cap;
  if (pct <= 0.25) return "#ef4444";
  if (pct <= 0.40) return "#f97316";
  if (pct <= 0.55) return "#eab308";
  if (pct <= 0.70) return "#84cc16";
  if (pct <= 0.85) return "#22c55e";
  return "#10b981";
}

export function getPosColor(pos) {
  const type = POSITION_TYPES[pos];
  if (type === "GK") return "#eab308";
  if (type === "DEF") return "#3b82f6";
  if (type === "MID") return "#22c55e";
  return "#ef4444";
}

export function progressToPips(progress) {
  return Math.min(5, Math.floor(progress * 5));
}

export function getTrainingProgress(currentStat, age, potential, overall, appearanceRate = 0, ovrCap = 20) {
  if (currentStat >= ovrCap) return 0;
  // Normalize stat to a 1-20 equivalent scale for the progress curve
  // At P0 (cap 20): stat 1-20 maps to 1-20. At P1 (cap 36): stat 1-36 maps to ~1-20.
  const normalized = ovrCap <= 20 ? currentStat : Math.max(1, Math.round((currentStat / ovrCap) * 20));
  const levelFactor = normalized <= 5 ? 0.28
    : normalized <= 8 ? 0.20
    : normalized <= 10 ? 0.15
    : normalized <= 12 ? 0.11
    : normalized <= 14 ? 0.08
    : normalized <= 16 ? 0.06
    : normalized === 17 ? 0.04
    : normalized === 18 ? 0.03
    : 0.015;
  const ageFactor = age < 23 ? 1.3 : age < 28 ? 1.0 : age < 32 ? 0.7 : age < 35 ? 0.5 : 0.2;
  const potentialGap = Math.max(0, potential - overall);
  // Potential bonus: gap-based scaling + flat talent bonus for high-ceiling players.
  // Gap bonus: far-from-ceiling players train significantly faster (up to ~2.5× extra).
  // Talent floor: even near their ceiling, high-potential players edge ahead of low-potential ones.
  const gapBonus = (potentialGap / Math.max(1, ovrCap)) * 3.0 * Math.max(0.3, appearanceRate);
  const talentFloor = (potential / Math.max(1, ovrCap)) * 0.3;
  const potentialBonus = 1 + gapBonus + talentFloor;
  const variance = 0.7 + Math.random() * 0.6;
  return levelFactor * ageFactor * potentialBonus * variance;
}

// Out-of-position effectiveness multipliers (applied to xG in match simulation)
const OOP_MULT = {
  GK_TO_OUTFIELD: 0.55, // Outfield player forced into goal
  OUTFIELD_TO_GK: 0.60, // GK forced outfield
  SAME_GROUP:     0.92, // e.g. LB playing RB — minor discomfort
  ADJACENT_GROUP: 0.80, // e.g. CM playing ST — noticeable penalty
  DISTANT_GROUP:  0.65, // e.g. defender playing winger — severe penalty
};

// Weeks of position training required to learn a new position
const POS_TRAIN_WEEKS = {
  GK_TO_OUTFIELD: 22,
  OUTFIELD_TO_GK: 24,
  SAME_GROUP:      5,
  ADJACENT_GROUP: 10,
  DISTANT_GROUP:  16,
};

export function getOOPPenalty(naturalPos, assignedPos, learnedPositions) {
  if (!naturalPos || !assignedPos || naturalPos === assignedPos) return 1.0;
  if (learnedPositions && learnedPositions.includes(assignedPos)) return 1.0;
  if (assignedPos === "GK" && naturalPos !== "GK") return OOP_MULT.GK_TO_OUTFIELD;
  if (naturalPos === "GK" && assignedPos !== "GK") return OOP_MULT.OUTFIELD_TO_GK;
  const dist = Math.abs((POS_GROUP[naturalPos] || 0) - (POS_GROUP[assignedPos] || 0));
  if (dist === 0) return OOP_MULT.SAME_GROUP;
  if (dist === 1) return OOP_MULT.ADJACENT_GROUP;
  return OOP_MULT.DISTANT_GROUP;
}

export function getPositionTrainingWeeks(naturalPos, targetPos) {
  if (!naturalPos || !targetPos || naturalPos === targetPos) return 0;
  if (targetPos === "GK" && naturalPos !== "GK") return POS_TRAIN_WEEKS.OUTFIELD_TO_GK;
  if (naturalPos === "GK" && targetPos !== "GK") return POS_TRAIN_WEEKS.GK_TO_OUTFIELD;
  const dist = Math.abs((POS_GROUP[naturalPos] || 0) - (POS_GROUP[targetPos] || 0));
  if (dist === 0) return POS_TRAIN_WEEKS.SAME_GROUP;
  if (dist === 1) return POS_TRAIN_WEEKS.ADJACENT_GROUP;
  return POS_TRAIN_WEEKS.DISTANT_GROUP;
}
