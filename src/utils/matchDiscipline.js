import { C } from "../data/tokens.js";

// Resolve the referee's final decisions before their gameplay consequences.
// In particular, VAR replaces a yellow; it is not an additional card.
export function resolveDiscipline(events, modifiers = {}, random = Math.random) {
  const yellows = new Map();
  const dismissed = new Set();
  const redCards = [];
  const resolved = [];
  for (const original of events) {
    if (original.type !== "card" && original.type !== "red_card") {
      resolved.push(original);
      continue;
    }
    if (modifiers.noCards) continue;
    const event = { ...original };
    const key = JSON.stringify([event.teamId ?? event.cardTeamName, event.cardPlayerId ?? event.cardPlayer]);
    if (dismissed.has(key)) continue;
    if (event.type === "card" && modifiers.var && random() < (modifiers.varRedUpgradeChance ?? 0.15)) {
      event.type = "red_card";
      event.redReason = "var_upgrade";
      event.isDirectRed = true;
      event.countsAsYellow = false;
      event.text = `📺 VAR UPGRADE — ${event.cardPlayer}'s yellow upgraded to 🟥 RED CARD!`;
      event.flashColor = C.red;
    }
    if (event.type === "card") {
      const count = (yellows.get(key) || 0) + 1;
      yellows.set(key, count);
      if (count === 2) {
        event.type = "red_card";
        event.redReason = "second_yellow";
        event.countsAsYellow = true;
        event.text = `🟥 RED CARD! ${event.cardPlayer} gets a second yellow and is sent off!`;
        event.flashColor = C.red;
      }
    }
    if (event.type === "red_card") {
      dismissed.add(key);
      redCards.push({ minute: event.minute, teamName: event.cardTeamName });
    }
    resolved.push(event);
  }
  return { events: resolved, redCards };
}
