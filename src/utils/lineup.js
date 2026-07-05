import { POSITION_ORDER, TOTAL_SLOTS } from "../data/positions.js";
import { getOverall, getOOPPenalty } from "./calc.js";

const canPlay = (p, pos) => p.position === pos || p.learnedPositions?.includes(pos);

/**
 * Smart bench fill: 1 GK, 1 DEF, 1 MID, 1 FWD, then best remaining by OVR.
 * Returns array of player IDs sorted by position order.
 */
function fillBench(pool, squad, maxBench = 5) {
  const benchIds = [];
  const benchUsed = new Set();
  const sectionNeeds = [
    { positions: ["GK"] },
    { positions: ["CB", "LB", "RB"] },
    { positions: ["CM", "AM"] },
    { positions: ["LW", "RW", "ST"] },
  ];
  for (const need of sectionNeeds) {
    const pick = pool
      .filter(p => (need.positions.includes(p.position) || need.positions.some(pos => p.learnedPositions?.includes(pos))) && !benchUsed.has(p.id))
      .sort((a, b) => getOverall(b) - getOverall(a))[0];
    if (pick) { benchIds.push(pick.id); benchUsed.add(pick.id); }
  }
  const rest = pool.filter(p => !benchUsed.has(p.id)).sort((a, b) => getOverall(b) - getOverall(a));
  for (const p of rest) { if (benchIds.length >= maxBench) break; benchIds.push(p.id); }
  benchIds.sort((a, b) => {
    const pa = squad.find(p => p.id === a);
    const pb = squad.find(p => p.id === b);
    return (POSITION_ORDER[pa?.position] || 0) - (POSITION_ORDER[pb?.position] || 0);
  });
  return benchIds;
}

/**
 * Extract { slots, startingXI, bench } from a completed slots array.
 */
function extractFromSlots(slots) {
  const startingXI = [], bench = [];
  slots.forEach((pid, i) => {
    if (pid == null) return;
    if (i < 11) startingXI.push(pid);
    else bench.push(pid);
  });
  return { slots, startingXI, bench };
}

/**
 * Build an assistant-selected lineup from scratch.
 * Used by ASST XI (excludeLegends=true) and FANS XI (excludeLegends=false).
 *
 * @param {Array} squad - full player squad
 * @param {Array} formation - 11 formation slot definitions [{pos: "GK"}, ...]
 * @param {Object} opts - { excludeLegends: boolean }
 * @returns {{ slots: (string|null)[], startingXI: string[], bench: string[] }}
 */
export function buildAssistantLineup(squad, formation, { excludeLegends = true } = {}) {
  const available = squad.filter(p => !p.injury && (!excludeLegends || !p.isLegend) && !(p.isLegend && (p.legendAppearances || 0) >= 12));
  const newSlots = new Array(TOTAL_SLOTS).fill(null);
  const used = new Set();

  // Position-match pass: best OVR per slot
  formation.forEach((slot, i) => {
    const candidates = available.filter(p => canPlay(p, slot.pos) && !used.has(p.id));
    candidates.sort((a, b) => getOverall(b) - getOverall(a));
    if (candidates.length > 0) { newSlots[i] = candidates[0].id; used.add(candidates[0].id); }
  });

  // GK safety net
  const gkIdx = formation.findIndex(s => s.pos === "GK");
  if (gkIdx !== -1 && newSlots[gkIdx] == null) {
    const anyGK = squad.filter(p => p.position === "GK" && !used.has(p.id))
      .sort((a, b) => (a.injury ? 1 : 0) - (b.injury ? 1 : 0) || getOverall(b) - getOverall(a))[0];
    if (anyGK) { newSlots[gkIdx] = anyGK.id; used.add(anyGK.id); }
  }

  // Backfill: best available for remaining empty slots, ranked by how the
  // MATCH ENGINE will actually rate them there — raw OVR scaled by the same
  // out-of-position penalty the sim applies. A 12-OVR keeper at left-back is
  // worth 12 x 0.55 to the engine; the 10-OVR right-back's 10 x 0.92 beats it.
  // Keepers never backfill an outfield slot unless they're literally the
  // only body left.
  formation.forEach((slot, i) => {
    if (newSlots[i] != null) return;
    const pool = available.filter(p => !used.has(p.id));
    const outfieldPool = slot.pos !== "GK" ? pool.filter(p => p.position !== "GK") : pool;
    const best = (outfieldPool.length > 0 ? outfieldPool : pool)
      .sort((a, b) =>
        getOverall(b) * getOOPPenalty(b.position, slot.pos, b.learnedPositions)
        - getOverall(a) * getOOPPenalty(a.position, slot.pos, a.learnedPositions));
    if (best.length > 0) { newSlots[i] = best[0].id; used.add(best[0].id); }
  });

  // Bench: smart fill
  const benchPool = available.filter(p => !used.has(p.id));
  const benchIds = fillBench(benchPool, squad);
  benchIds.forEach((id, i) => { newSlots[11 + i] = id; });

  return extractFromSlots(newSlots);
}

/**
 * Sanitize a saved preset against the current squad.
 * - Prunes player IDs not in squad (sold/retired) — permanent
 * - Marks injured/appearance-capped players as unavailable — temporary, not pruned
 *
 * @param {{ slots: (string|null)[], formationSnapshot: {pos:string}[] }} preset
 * @param {Array} squad
 * @returns {{ available: Set<string>, unavailable: Set<string>, pruned: boolean, cleanedSlots: (string|null)[] }}
 */
export function sanitizePreset(preset, squad) {
  const squadIds = new Set(squad.map(p => p.id));
  const available = new Set();
  const unavailable = new Set();
  let pruned = false;

  const cleanedSlots = preset.slots.map(id => {
    if (id == null) return null;
    if (!squadIds.has(id)) { pruned = true; return null; } // sold/retired
    const p = squad.find(pl => pl.id === id);
    if (p.injury || (p.isLegend && (p.legendAppearances || 0) >= 12)) {
      unavailable.add(id);
      return null; // temporarily unavailable
    }
    available.add(id);
    return id;
  });

  return { available, unavailable, pruned, cleanedSlots };
}

/**
 * Build a lineup from a saved preset with fallback for unavailable players.
 *
 * @param {{ slots: (string|null)[], formationSnapshot: {pos:string}[] }} preset
 * @param {Array} squad
 * @param {Array} formation - current formation
 * @returns {{ slots: (string|null)[], startingXI: string[], bench: string[], pruned: boolean }}
 */
export function buildPresetLineup(preset, squad, formation) {
  const { available, pruned, cleanedSlots } = sanitizePreset(preset, squad);
  const newSlots = new Array(TOTAL_SLOTS).fill(null);
  const used = new Set();

  // Check if formation matches saved snapshot
  const sameFormation = preset.formationSnapshot &&
    preset.formationSnapshot.length === formation.length &&
    preset.formationSnapshot.every((s, i) => s.pos === formation[i].pos);

  if (sameFormation) {
    // Same formation: restore exact slot positions
    for (let i = 0; i < 11; i++) {
      const id = cleanedSlots[i];
      if (id && available.has(id)) { newSlots[i] = id; used.add(id); }
    }
  } else {
    // Different formation: remap by position match
    // Collect available starter IDs from saved slots 0-10
    const presetStarters = [];
    for (let i = 0; i < 11; i++) {
      const id = cleanedSlots[i];
      if (id && available.has(id)) presetStarters.push(id);
    }

    // First pass: position-match preset starters to current formation slots
    for (let i = 0; i < formation.length; i++) {
      const pos = formation[i].pos;
      const match = presetStarters.find(id => {
        if (used.has(id)) return false;
        const p = squad.find(pl => pl.id === id);
        return p && canPlay(p, pos);
      });
      if (match) { newSlots[i] = match; used.add(match); }
    }

    // Second pass: place remaining preset starters in any open slot
    for (const id of presetStarters) {
      if (used.has(id)) continue;
      const emptyIdx = newSlots.findIndex((s, i) => i < 11 && s == null);
      if (emptyIdx !== -1) { newSlots[emptyIdx] = id; used.add(id); }
    }
  }

  // Fallback: fill remaining empty starter slots using assistant logic
  const fallbackAvailable = squad.filter(p => !p.injury && !used.has(p.id) && !(p.isLegend && (p.legendAppearances || 0) >= 12));
  formation.forEach((slot, i) => {
    if (newSlots[i] != null) return;
    const candidates = fallbackAvailable.filter(p => canPlay(p, slot.pos) && !used.has(p.id));
    candidates.sort((a, b) => getOverall(b) - getOverall(a));
    if (candidates.length > 0) { newSlots[i] = candidates[0].id; used.add(candidates[0].id); }
  });

  // GK safety net
  const gkIdx = formation.findIndex(s => s.pos === "GK");
  if (gkIdx !== -1 && newSlots[gkIdx] == null) {
    const anyGK = squad.filter(p => p.position === "GK" && !used.has(p.id))
      .sort((a, b) => (a.injury ? 1 : 0) - (b.injury ? 1 : 0) || getOverall(b) - getOverall(a))[0];
    if (anyGK) { newSlots[gkIdx] = anyGK.id; used.add(anyGK.id); }
  }

  // Backfill any remaining empty starter slots
  formation.forEach((_, i) => {
    if (newSlots[i] != null) return;
    const best = fallbackAvailable.filter(p => !used.has(p.id)).sort((a, b) => getOverall(b) - getOverall(a));
    if (best.length > 0) { newSlots[i] = best[0].id; used.add(best[0].id); }
  });

  // Bench: use saved bench players first (preserving order), then smart-fill
  const savedBenchIds = [];
  for (let i = 11; i < cleanedSlots.length; i++) {
    const id = cleanedSlots[i];
    if (id && available.has(id) && !used.has(id)) { savedBenchIds.push(id); used.add(id); }
  }

  // Fill remaining bench spots via smart bench logic
  const benchPool = squad.filter(p => !p.injury && !used.has(p.id) && !(p.isLegend && (p.legendAppearances || 0) >= 12));
  const smartBenchIds = fillBench(benchPool, squad, 5 - savedBenchIds.length);
  const allBenchIds = [...savedBenchIds, ...smartBenchIds];
  allBenchIds.forEach((id, i) => { newSlots[11 + i] = id; });

  const result = extractFromSlots(newSlots);
  return { ...result, pruned };
}
