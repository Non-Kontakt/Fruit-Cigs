import { getOverall } from "./calc.js";

// 5v5 formation: 1 GK, 1 DEF, 2 MID, 1 ATK. The player picks theirs on the
// squad page's mini-tournament panel; AI teams use buildAIFiveASide below.
export const FIVE_SLOTS = [
  { label: "GK", positions: ["GK"] },
  { label: "DEF", positions: ["CB", "LB", "RB"] },
  { label: "MID", positions: ["CM", "AM"] },
  { label: "MID", positions: ["CM", "AM"] },
  { label: "ATK", positions: ["LW", "RW", "ST"] },
];

// Build a 5-man squad object for an AI team (pick strongest per slot)
export function buildAIFiveASide(team) {
  const squad = team.squad || [];
  const used = new Set();
  const picks = [];
  for (const slot of FIVE_SLOTS) {
    const eligible = squad
      .filter(p => !used.has(p.id) && slot.positions.includes(p.position))
      .sort((a, b) => getOverall(b) - getOverall(a));
    if (eligible.length > 0) {
      picks.push(eligible[0]);
      used.add(eligible[0].id);
    }
  }
  return picks;
}
