import { FORMATION_PRESETS } from "../data/formations.js";
import { STARTING_XI_POSITIONS, POSITION_TYPES } from "../data/positions.js";
import { getOOPPenalty } from "./calc.js";

export function detectFormationName(formation) {
  if (!formation || formation.length !== 11) return "???";
  const bands = { def: 0, mid: 0, att: 0 };
  formation.forEach(s => {
    if (s.pos === "GK") return;
    if (s.y >= 58) bands.def++;
    else if (s.y >= 28) bands.mid++;
    else bands.att++;
  });
  for (const [name, preset] of Object.entries(FORMATION_PRESETS)) {
    if (preset.every((s, i) => s.pos === formation[i].pos && Math.abs(s.x - formation[i].x) < 6 && Math.abs(s.y - formation[i].y) < 6)) return name;
  }
  return `${bands.def}-${bands.mid}-${bands.att}`;
}

export function assignPlayersToSlots(playerIds, formation, squad) {
  if (!formation || !squad) return playerIds;
  const players = playerIds.map(id => squad.find(p => p.id === id)).filter(Boolean);
  const ordered = new Array(11).fill(null);
  const used = new Set();
  // Pass 1: exact position match
  for (let i = 0; i < formation.length; i++) {
    const match = players.find(p => p.position === formation[i].pos && !used.has(p.id));
    if (match) { ordered[i] = match.id; used.add(match.id); }
  }
  // Pass 2: same type match (DEF/MID/FWD)
  for (let i = 0; i < formation.length; i++) {
    if (ordered[i] != null) continue;
    const slotType = POSITION_TYPES[formation[i].pos];
    const match = players.find(p => POSITION_TYPES[p.position] === slotType && !used.has(p.id));
    if (match) { ordered[i] = match.id; used.add(match.id); }
  }
  // Pass 3: fill remaining with anyone
  for (let i = 0; i < formation.length; i++) {
    if (ordered[i] != null) continue;
    const match = players.find(p => !used.has(p.id));
    if (match) { ordered[i] = match.id; used.add(match.id); }
  }
  return ordered.filter(id => id != null);
}

export function getFormationPositions(formation) {
  return formation ? formation.map(s => s.pos) : [...STARTING_XI_POSITIONS];
}

export function getEffectiveSlots(startingXI, formation, squad, slotAssignments) {
  if (slotAssignments) {
    const xiSet = new Set(startingXI);
    return slotAssignments.map(id => (id != null && xiSet.has(id)) ? id : null);
  }
  const auto = assignPlayersToSlots(startingXI, formation, squad);
  const result = new Array(11).fill(null);
  auto.forEach((id, i) => { if (i < 11) result[i] = id; });
  return result;
}

export function getTeamOOPMultiplier(startingXI, formation, squad, slotAssignments) {
  if (!startingXI || !formation || !squad) return 1.0;
  const effectiveSlots = getEffectiveSlots(startingXI, formation, squad, slotAssignments);
  let totalMult = 0;
  let count = 0;
  for (let i = 0; i < Math.min(effectiveSlots.length, formation.length); i++) {
    const pid = effectiveSlots[i];
    if (pid == null) continue;
    const player = squad.find(p => p.id === pid);
    if (!player) continue;
    totalMult += getOOPPenalty(player.position, formation[i].pos, player.learnedPositions);
    count++;
  }
  return count > 0 ? totalMult / count : 1.0;
}
