import { BREAKOUT_TRIGGERS } from "../data/breakoutTriggers.js";
import { POSITION_TYPES } from "../data/positions.js";
import { getOverall, rand } from "./calc.js";

// Primary attrs to boost per position type
const BREAKOUT_ATTRS = {
  GK:  ["defending", "mental", "physical"],
  DEF: ["defending", "physical", "pace"],
  MID: ["passing", "technique", "mental"],
  FWD: ["shooting", "pace", "technique"],
};

/**
 * Check if any player triggered a breakout after a match.
 * @param {Array} squad - player squad
 * @param {Object} playerMatchLog - { playerId: [MatchLogEntry...] }
 * @param {Set} breakoutsThisSeason - player IDs who already broke out this season
 * @param {number} ovrCap - current OVR cap
 * @returns {Array<{ playerId, playerName, playerPosition, trigger, attrGains, potentialGain }>}
 */
export function checkBreakouts(squad, playerMatchLog, breakoutsThisSeason, ovrCap) {
  const results = [];

  for (const p of squad) {
    if ((breakoutsThisSeason.get(p.id) || 0) >= 2) continue;
    if (p.isLegend || p.isUnlockable) continue;

    const log = playerMatchLog[p.id];
    if (!log || log.length < 3) continue;

    const i = log.length - 1;
    const type = POSITION_TYPES[p.position];
    const ovr = getOverall(p);
    const ctx = { ovr };

    // Gather position-specific + universal triggers, shuffle
    const positionTriggers = BREAKOUT_TRIGGERS[type] || [];
    const universalTriggers = BREAKOUT_TRIGGERS.UNIVERSAL || [];
    const allTriggers = [...positionTriggers, ...universalTriggers];
    const shuffled = [...allTriggers].sort(() => Math.random() - 0.5);

    for (const trigger of shuffled) {
      try {
        if (trigger.check(log, i, ctx)) {
          // BREAKOUT! Determine gains — filter to uncapped attrs, fallback to any uncapped
          const primaryAttrs = BREAKOUT_ATTRS[type] || ["technique", "mental", "passing"];
          let rewardable = primaryAttrs.filter(attr => (p.attrs[attr] || 0) < ovrCap);
          if (rewardable.length === 0) {
            rewardable = Object.keys(p.attrs).filter(attr => (p.attrs[attr] || 0) < ovrCap);
          }
          const selected = [...rewardable].sort(() => Math.random() - 0.5).slice(0, 2);
          const attrGains = {};
          for (const attr of selected) {
            const gain = rand(2, 3);
            attrGains[attr] = Math.min(gain, ovrCap - (p.attrs[attr] || 0));
          }

          // +1 to potential (capped at ovrCap)
          const potentialGain = (p.potential || 0) < ovrCap ? 1 : 0;

          // Skip if no actual reward (all attrs capped + potential maxed)
          const totalGain = Object.values(attrGains).reduce((s, v) => s + v, 0) + potentialGain;
          if (totalGain === 0) continue;

          results.push({
            playerId: p.id,
            playerName: p.name,
            playerPosition: p.position,
            trigger: { id: trigger.id, label: trigger.label, narrative: trigger.narrative },
            attrGains,
            potentialGain,
          });

          break; // one breakout per player per check
        }
      } catch (err) {
        console.warn("Breakout trigger error:", trigger.id, err);
      }
    }
  }

  return results;
}
