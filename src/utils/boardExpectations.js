// Single source of truth for what the board expects this season, keyed by
// league tier (1 = top flight). `line` is the full sentence used in the
// season-preview inbox message; `demand` is a short noun phrase for compact
// UI (the Dashboard's Club Mood one-liner).
export function getBoardExpectation(tier) {
  if (tier <= 3) {
    return { demand: "a title challenge", line: "The chairman demands nothing less than a title challenge." };
  }
  if (tier <= 5) {
    return { demand: "a top-three finish and promotion", line: "The board expects a top-three finish and promotion." };
  }
  if (tier <= 7) {
    return { demand: "a top-half finish", line: "A top-half finish is the minimum expectation." };
  }
  if (tier <= 9) {
    return { demand: "us to avoid relegation", line: "Avoid relegation and consolidate your position." };
  }
  return { demand: "us to survive and build for the future", line: "Survive and build for the future." };
}
