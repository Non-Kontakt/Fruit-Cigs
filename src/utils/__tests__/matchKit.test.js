import { describe, it, expect } from "vitest";
import { deriveKit, neutralKit, contrastRatio, normaliseHex, MIN_KIT_CONTRAST } from "../matchKit.js";
import { comboxStyle } from "../../components/match/MatchCommentaryBox.jsx";
import { LEAGUE_DEFS, RESERVE_TEAM_CONFIGS } from "../../data/leagues.js";

// The kit contract (#460): every derived pair — for every real FC team
// colour and for garbage inputs — must be mutually legible at 7:1, and the
// goal flash must have exactly two visual states: the pair and its exact
// inverse.

const allTeamColours = () => {
  const colours = new Set();
  for (const def of Object.values(LEAGUE_DEFS)) {
    if (def.color) colours.add(def.color);
    for (const t of def.teams || []) if (t.color) colours.add(t.color);
  }
  for (const t of RESERVE_TEAM_CONFIGS) if (t.color) colours.add(t.color);
  return [...colours];
};

describe("deriveKit — 7:1 mutual contrast contract", () => {
  it("every known FC team colour derives a pair at or above the threshold", () => {
    const colours = allTeamColours();
    expect(colours.length).toBeGreaterThanOrEqual(30); // the sweep actually swept
    for (const c of colours) {
      const [bg, fg] = deriveKit(c);
      expect(contrastRatio(bg, fg), `${c} → ${bg}/${fg}`).toBeGreaterThanOrEqual(MIN_KIT_CONTRAST);
    }
  });

  it("fallback and invalid inputs still clear the threshold", () => {
    for (const c of [null, undefined, "", "nonsense", "#12", "#12345", "红色"]) {
      const [bg, fg] = deriveKit(c);
      expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(MIN_KIT_CONTRAST);
    }
  });

  it("the neutral kit clears the threshold too", () => {
    const [bg, fg] = neutralKit();
    expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(MIN_KIT_CONTRAST);
  });

  it("normalises shorthand and junk deterministically", () => {
    expect(normaliseHex("#abc")).toBe("#aabbcc");
    expect(normaliseHex("EF4444")).toBe("#ef4444");
    expect(normaliseHex("junk")).toBe("#334155");
  });

  it("the goal flash has exactly two visual states: the pair and its exact inverse", () => {
    const kit = deriveKit("#ef4444");
    const normal = comboxStyle(kit);
    const inverted = comboxStyle(kit, { inverted: true });
    expect(inverted.background).toBe(normal.color);
    expect(inverted.color).toBe(normal.background);
    // And nothing else about the box moves between the two states.
    expect(inverted.height).toBe(normal.height);
    expect(inverted.padding).toBe(normal.padding);
    expect(inverted.fontSize).toBe(normal.fontSize);
  });
});
