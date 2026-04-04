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
 * @param {Map} breakoutsThisSeason - { playerId => Set<triggerId> } — max 2 unique triggers per player per season
 * @param {number} ovrCap - current OVR cap
 * @returns {Array<{ playerId, playerName, playerPosition, trigger, attrGains, potentialGain }>}
 */
const BREAKOUT_COOLDOWN = 3; // minimum matches between breakouts for the same player

export function checkBreakouts(squad, playerMatchLog, breakoutsThisSeason, ovrCap, isCup = false) {
  const results = [];
  // Track group+position caps: e.g. "clean_sheet_run|DEF" → only 1 DEF can fire a clean_sheet_run trigger per match
  const groupCaps = new Set();
  // Track position type caps: max 1 breakout per position type per check
  const typeCaps = new Set();

  // Shuffle squad to prevent order bias in position-type cap
  const shuffledSquad = [...squad].sort(() => Math.random() - 0.5);

  for (const p of shuffledSquad) {
    const raw = breakoutsThisSeason.get(p.id);
    // Support both old format (Set) and new format ({ triggers: Set, lastLogIndex: number })
    const entry = raw instanceof Set ? { triggers: raw, lastLogIndex: -99 } : (raw || { triggers: new Set(), lastLogIndex: -99 });
    const usedTriggers = entry.triggers instanceof Set ? entry.triggers : new Set();
    if (usedTriggers.size >= 2) continue;
    if (p.isLegend || p.isUnlockable) continue;

    const type = POSITION_TYPES[p.position];
    if (typeCaps.has(type)) continue; // max 1 breakout per position type per check

    const log = playerMatchLog[p.id];
    if (!log || log.length < 3) continue;

    const i = log.length - 1;
    // Cooldown: skip if this player broke out too recently
    if (i - entry.lastLogIndex <= BREAKOUT_COOLDOWN) continue;
    const ovr = getOverall(p);
    const ctx = { ovr };

    // Gather position-specific + universal triggers, shuffle
    const positionTriggers = BREAKOUT_TRIGGERS[type] || [];
    const universalTriggers = BREAKOUT_TRIGGERS.UNIVERSAL || [];
    const allTriggers = [...positionTriggers, ...universalTriggers];
    const shuffled = [...allTriggers].sort(() => Math.random() - 0.5);

    for (const trigger of shuffled) {
      if (usedTriggers && usedTriggers.has(trigger.id)) continue;
      if (trigger.group && groupCaps.has(`${trigger.group}|${type}`)) continue;
      if (trigger.cupOnly && !isCup) continue;
      try {
        const checkResult = trigger.check(log, i, ctx);
        if (checkResult) {
          // BREAKOUT! Determine gains — filter to uncapped attrs, fallback to any uncapped
          const primaryAttrs = BREAKOUT_ATTRS[type] || ["technique", "mental", "passing"];
          let rewardable = primaryAttrs.filter(attr => (p.attrs[attr] || 0) < ovrCap);
          if (rewardable.length === 0) {
            rewardable = Object.keys(p.attrs).filter(attr => (p.attrs[attr] || 0) < ovrCap);
          }
          const selected = [...rewardable].sort(() => Math.random() - 0.5).slice(0, 2);
          const attrGains = {};
          for (const attr of selected) {
            const gain = rand(1, 2);
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
            logIndex: i,
            trigger: {
              id: trigger.id, label: trigger.label,
              narrative: typeof trigger.narrativeFn === "function" && typeof checkResult === "number"
                ? trigger.narrativeFn(checkResult)
                : (trigger.narrative || (typeof trigger.narrativeFn === "function" ? trigger.narrativeFn(0) : "")),
            },
            attrGains,
            potentialGain,
          });

          if (trigger.group) groupCaps.add(`${trigger.group}|${type}`);
          typeCaps.add(type);
          break; // one breakout per player per check
        }
      } catch (err) {
        console.warn("Breakout trigger error:", trigger.id, err);
      }
    }
  }

  return results;
}
