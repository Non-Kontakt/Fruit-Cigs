import { NATIONALITIES, NATION_NAMES, FOREIGN_NATIONS } from "../data/nationalities.js";
import { LEAGUE_DEFS } from "../data/leagues.js";
import { STARTING_XI_POSITIONS, EXTRA_POOL, POSITION_TYPES, POSITION_ORDER, ALL_POSITIONS } from "../data/positions.js";
import { ATTRIBUTES } from "../data/training.js";
import { AI_BENCH_POSITIONS, TRAIT_SQUAD_STYLE } from "../data/leagues.js";
import { rand, getOverall, pickRandom } from "./calc.js";

// Prestige OVR scaling — caps and offsets for each prestige level
export function getOvrCap(prestigeLevel = 0) {
  return Math.min(100, 20 + prestigeLevel * 16);
}
export function getPrestigeOffset(prestigeLevel = 0) {
  return prestigeLevel * 16;
}

// Position attribute biases — three tiers of specificity
const BIAS_FULL = {
  GK: { defending: 4, physical: 2, mental: 2, pace: -2, shooting: -4, technique: -1 },
  DEF: { defending: 3, physical: 2, mental: 1, shooting: -2, technique: -1 },
  MID: { passing: 3, technique: 2, mental: 2, defending: -1, shooting: -1 },
  FWD: { shooting: 3, pace: 2, technique: 2, defending: -3 },
};
const BIAS_AI = {
  GK: { defending: 3, physical: 2, mental: 1 }, DEF: { defending: 3, physical: 2, mental: 1 },
  MID: { passing: 3, technique: 2, mental: 1 }, FWD: { shooting: 3, pace: 2, technique: 1 },
};
const BIAS_YOUTH = {
  GK: { defending: 2, physical: 1, mental: 1 }, DEF: { defending: 2, physical: 1, pace: 1 },
  MID: { passing: 2, technique: 1, mental: 1 }, FWD: { shooting: 2, pace: 1, technique: 1 },
};

// Apply stat spikiness to an AI player's attrs (~20% chance).
// Picks one attr to boost and one to weaken, making players feel distinct.
function applyAISpike(attrs, ovrCap) {
  if (rand(0, 99) >= 20) return; // 80% stay as-is
  const keys = Object.keys(attrs);
  // Pick two different attrs
  const boostIdx = rand(0, keys.length - 1);
  let weakIdx = rand(0, keys.length - 2);
  if (weakIdx >= boostIdx) weakIdx++;
  // Scale spike magnitude to ~15-25% of cap (same relative impact at every prestige)
  const scale = Math.max(1, Math.round(ovrCap * 0.04));
  const boost = rand(scale, Math.max(scale, Math.round(ovrCap * 0.06)));
  const weaken = rand(scale, Math.max(scale, Math.round(ovrCap * 0.05)));
  attrs[keys[boostIdx]] = Math.min(ovrCap, attrs[keys[boostIdx]] + boost);
  attrs[keys[weakIdx]] = Math.max(1, attrs[keys[weakIdx]] - weaken);
}

// Retirement probability by age — shared between AI and player retirement checks
const RETIRE_CHANCE = {
  30: 0.12, 31: 0.20, 32: 0.30, 33: 0.40, 34: 0.50,
  35: 0.58, 36: 0.66, 37: 0.73, 38: 0.80, 39: 0.85,
  40: 0.90, 41: 0.93, 42: 0.96,
};
function getRetireChance(age) {
  if (age < 30) return 0;
  if (age >= 43) return 1;
  return RETIRE_CHANCE[age] || 0.96;
}

// Unique ID generator — consistent format across all player types
function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Retry wrapper — generates objects until a unique name is found
function uniqueGenerate(generatorFn, usedNames, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = generatorFn();
    if (!usedNames.has(result.name)) { usedNames.add(result.name); return result; }
  }
  const result = generatorFn();
  usedNames.add(result.name);
  return result;
}

export function getFirstName(name) { return (name || "").split(" ")[0]; }
export function getLastName(name) {
  const parts = (name || "").split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

export function pickNationality() {
  const totalWeight = NATIONALITIES.reduce((s, n) => s + n.weight, 0);
  let r = Math.random() * totalWeight;
  for (const nat of NATIONALITIES) {
    r -= nat.weight;
    if (r <= 0) return nat.code;
  }
  return "ENG";
}

export function pickAINationality(tier, teamNatMix) {
  const mix = teamNatMix || LEAGUE_DEFS[tier]?.natMix;
  if (!mix) return pickNationality();
  const total = mix.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [code, w] of mix) {
    r -= w;
    if (r <= 0) return code;
  }
  return mix[0]?.[0] || "ENG";
}

export function generateNameForNation(code) {
  const pool = NATION_NAMES[code] || NATION_NAMES.ENG;
  return {
    name: `${pool.first[rand(0, pool.first.length - 1)]} ${pool.last[rand(0, pool.last.length - 1)]}`,
    nationality: code,
  };
}

export function getNatFlag(code) {
  return NATIONALITIES.find(n => n.code === code)?.flag || "🇬🇧";
}

export function getNatLabel(code) {
  return NATIONALITIES.find(n => n.code === code)?.label || "England";
}

export function inferNationality(name) {
  if (!name) return "ENG";
  const first = getFirstName(name);
  const last = getLastName(name);
  for (const [code, pool] of Object.entries(NATION_NAMES)) {
    if (code === "ENG") continue;
    if (pool.first.includes(first) && pool.last.includes(last)) return code;
  }
  if (NATION_NAMES.SCO.last.includes(last)) return "SCO";
  if (NATION_NAMES.WAL.last.includes(last)) return "WAL";
  if (NATION_NAMES.NIR.last.includes(last)) return "NIR";
  if (NATION_NAMES.IRL.last.includes(last)) return "IRL";
  return "ENG";
}

export function generatePlayer(position, index, ovrCap = 20) {
  const type = POSITION_TYPES[position];
  const natCode = pickNationality();
  const { name } = generateNameForNation(natCode);
  const age = rand(17, 33);

  const baseMin = age < 21 ? 1 : age < 28 ? 1 : 2;
  const baseMax = age < 21 ? 4 : age < 28 ? 5 : 7;

  const biases = BIAS_FULL;

  const attrs = {};
  ATTRIBUTES.forEach(({ key }) => {
    const bias = (biases[type] && biases[type][key]) || 0;
    // Roll twice, take lower — skews distribution toward lower end while allowing rare highs
    const roll = Math.min(rand(baseMin, baseMax), rand(baseMin, baseMax));
    attrs[key] = Math.max(1, Math.min(10, roll + bias));
  });

  // Potential is relative to actual OVR — younger players have larger upside
  const ovr = getOverall({ position, attrs });
  const maxGap = age <= 19 ? rand(5, 10)
               : age <= 23 ? rand(3, 8)
               : age <= 27 ? rand(2, 5)
               : age <= 30 ? rand(1, 3)
               : rand(0, 2);
  const potential = Math.min(ovrCap, ovr + maxGap);

  const initialSnapshot = {};
  ATTRIBUTES.forEach(({ key }) => { initialSnapshot[key] = attrs[key]; });

  return {
    id: genId("p"),
    name,
    age,
    position,
    potential,
    attrs,
    statProgress: {},
    training: null,
    gains: {},
    nationality: natCode,
    history: [initialSnapshot],
    injury: null,
    tags: [],
    injuryHistory: {},
  };
}

export function generateSquad(ovrCap = 20) {
  const squadSize = rand(16, 20);
  const positions = [...STARTING_XI_POSITIONS];
  const shuffledPool = [...EXTRA_POOL].sort(() => Math.random() - 0.5);
  for (let i = 0; i < squadSize - 11; i++) {
    positions.push(shuffledPool[i % shuffledPool.length]);
  }
  positions.sort((a, b) => POSITION_ORDER[a] - POSITION_ORDER[b]);
  const usedNames = new Set();
  return positions.map((pos, i) => {
    const p = generatePlayer(pos, i, ovrCap);
    for (let attempt = 0; attempt < 10 && usedNames.has(p.name); attempt++) {
      const nd = generateNameForNation(p.nationality);
      p.name = nd.name;
    }
    usedNames.add(p.name);
    return p;
  });
}

// Generate a prestige-appropriate squad — players clustered around the old OVR cap
// so the team remains competitive after prestige reset.
// 75% of players: oldCap-3 to oldCap-1, 25%: oldCap to oldCap+1
export function generatePrestigeSquad(oldCap, newCap) {
  const squadSize = rand(16, 20);
  const positions = [...STARTING_XI_POSITIONS];
  const shuffledPool = [...EXTRA_POOL].sort(() => Math.random() - 0.5);
  for (let i = 0; i < squadSize - 11; i++) {
    positions.push(shuffledPool[i % shuffledPool.length]);
  }
  positions.sort((a, b) => POSITION_ORDER[a] - POSITION_ORDER[b]);
  const usedNames = new Set();

  return positions.map((pos, i) => {
    const isStrong = Math.random() < 0.25;
    const targetOvr = isStrong ? rand(oldCap, oldCap + 1) : rand(oldCap - 3, oldCap - 1);

    const type = POSITION_TYPES[pos];
    const natCode = pickNationality();
    const { name } = generateNameForNation(natCode);
    const age = rand(17, 33);
    const biases = BIAS_FULL;

    // Generate attrs centered around targetOvr with positional variety
    const attrs = {};
    ATTRIBUTES.forEach(({ key }) => {
      const bias = (biases[type] && biases[type][key]) || 0;
      const spread = rand(-3, 3);
      attrs[key] = Math.max(1, Math.min(newCap, targetOvr + spread + bias));
    });

    // Compute actual OVR and correct uniformly to hit target
    const actual = getOverall({ position: pos, attrs });
    const delta = targetOvr - actual;
    if (delta !== 0) {
      ATTRIBUTES.forEach(({ key }) => {
        attrs[key] = Math.max(1, Math.min(newCap, attrs[key] + delta));
      });
    }

    // Potential: young players have room to grow toward newCap
    const ovr = getOverall({ position: pos, attrs });
    const maxGap = age <= 19 ? rand(5, 10)
                 : age <= 23 ? rand(3, 8)
                 : age <= 27 ? rand(2, 5)
                 : age <= 30 ? rand(1, 3)
                 : rand(0, 2);
    const potential = Math.min(newCap, ovr + maxGap);

    const initialSnapshot = {};
    ATTRIBUTES.forEach(({ key }) => { initialSnapshot[key] = attrs[key]; });

    let p = {
      id: genId("p"),
      name,
      age,
      position: pos,
      potential,
      attrs,
      statProgress: {},
      training: null,
      gains: {},
      nationality: natCode,
      history: [initialSnapshot],
      injury: null,
      tags: [],
      injuryHistory: {},
    };

    for (let attempt = 0; attempt < 10 && usedNames.has(p.name); attempt++) {
      const nd = generateNameForNation(p.nationality);
      p.name = nd.name;
    }
    usedNames.add(p.name);
    return p;
  });
}

export function autoSelectXI(squad, formation) {
  // Exclude legends from auto-selection — user assigns them manually
  const available = squad.filter(p => !p.injury && !p.isLegend);
  const selected = [];
  const used = new Set();
  const positions = formation ? formation.map(s => s.pos) : STARTING_XI_POSITIONS;

  for (const pos of positions) {
    const candidates = available.filter(p => p.position === pos && !used.has(p.id));
    if (candidates.length > 0) {
      candidates.sort((a, b) => getOverall(b) - getOverall(a));
      selected.push(candidates[0].id);
      used.add(candidates[0].id);
    }
  }

  if (selected.length < 11) {
    for (const p of available) {
      if (!used.has(p.id)) {
        selected.push(p.id);
        used.add(p.id);
        if (selected.length >= 11) break;
      }
    }
  }

  return selected;
}

export function autoSelectBench(squad, startingXI) {
  const available = squad.filter(p => !p.injury && !startingXI.includes(p.id) && !p.isLegend);
  available.sort((a, b) => getOverall(b) - getOverall(a));
  return available.slice(0, 5).map(p => p.id);
}

function calcPotential(position, attrs, age, ovrCap) {
  const ovr = getOverall({ position, attrs });
  const maxGap = age <= 19 ? rand(5, 10) : age <= 23 ? rand(3, 8) : age <= 27 ? rand(2, 5) : age <= 30 ? rand(1, 3) : rand(0, 2);
  return Math.min(ovrCap, ovr + maxGap);
}

export function generateAITeam(name, color, strength, trait, tier, extraCount = 0, prestigeLevel = 0, teamNatMix = null) {
  const offset = getPrestigeOffset(prestigeLevel);
  const ovrCap = getOvrCap(prestigeLevel);
  const def = LEAGUE_DEFS[tier] || LEAGUE_DEFS[11];
  const tierCenter = (def.ovrMin + offset) + strength * (def.ovrMax - def.ovrMin);
  const minBase = Math.max(1, Math.round(tierCenter - 1.5));
  const maxBase = Math.min(ovrCap, Math.round(tierCenter + 1.5));
  const usedNames = new Set();
  const uniqueName = (code) => uniqueGenerate(() => generateNameForNation(code), usedNames);
  const biases = BIAS_AI;
  // Per-player quality offsets — shuffled so the star slot is random each team.
  // Sum = 1 (≈ neutral), preserving the team's expected average OVR.
  const sOff = [-3, -2, -1, -1, 0, 0, 0, 1, 1, 2, 4];
  for (let i = sOff.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sOff[i], sOff[j]] = [sOff[j], sOff[i]];
  }
  const squad = STARTING_XI_POSITIONS.map((pos, i) => {
    const attrs = {};
    const type = POSITION_TYPES[pos];
    const pMin = Math.max(1, minBase + sOff[i]);
    const pMax = Math.min(ovrCap, maxBase + sOff[i]);
    ATTRIBUTES.forEach(({ key }) => {
      const bias = (biases[type] && biases[type][key]) || 0;
      attrs[key] = Math.max(1, Math.min(ovrCap, rand(pMin, pMax) + bias));
    });
    applyAISpike(attrs, ovrCap);
    const pNameData = uniqueName(pickAINationality(tier, teamNatMix));
    const lp = rollAILearnedPositions(pos);
    const age = rand(22, 32);
    return { id: genId("ai"), name: pNameData.name, position: pos, attrs, nationality: pNameData.nationality, age, potential: calcPotential(pos, attrs, age, ovrCap), ...(lp ? { learnedPositions: lp } : {}) };
  });
  const benchMin = Math.max(1, minBase - 1);
  const benchMax = Math.max(2, maxBase - 1);
  const bOff = [-2, -1, 0, 0, 1];
  for (let i = bOff.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bOff[i], bOff[j]] = [bOff[j], bOff[i]];
  }
  AI_BENCH_POSITIONS.forEach((pos, i) => {
    const attrs = {};
    const type = POSITION_TYPES[pos];
    const pMin = Math.max(1, benchMin + bOff[i]);
    const pMax = Math.min(ovrCap, benchMax + bOff[i]);
    ATTRIBUTES.forEach(({ key }) => {
      const bias = (biases[type] && biases[type][key]) || 0;
      attrs[key] = Math.max(1, Math.min(ovrCap, rand(pMin, pMax) + bias));
    });
    applyAISpike(attrs, ovrCap);
    const pNameData = uniqueName(pickAINationality(tier, teamNatMix));
    const lp = rollAILearnedPositions(pos);
    const age = rand(19, 27);
    squad.push({ id: genId("ai"), name: pNameData.name, position: pos, attrs, isBench: true, nationality: pNameData.nationality, age, potential: calcPotential(pos, attrs, age, ovrCap), ...(lp ? { learnedPositions: lp } : {}) });
  });
  // Extra depth players for teams with large target squad sizes
  for (let e = 0; e < extraCount; e++) {
    const pos = pickRandom(ALL_POSITIONS);
    const attrs = {};
    const type = POSITION_TYPES[pos];
    const pMin = Math.max(1, benchMin + (Math.random() < 0.5 ? -1 : 0));
    const pMax = Math.min(ovrCap, benchMax);
    ATTRIBUTES.forEach(({ key }) => {
      const bias = (biases[type] && biases[type][key]) || 0;
      attrs[key] = Math.max(1, Math.min(ovrCap, rand(pMin, pMax) + bias));
    });
    applyAISpike(attrs, ovrCap);
    const nd = uniqueName(pickAINationality(tier, teamNatMix));
    const lp = rollAILearnedPositions(pos);
    const age = rand(19, 25);
    squad.push({ id: genId("ai"), name: nd.name, position: pos, attrs, isBench: true, nationality: nd.nationality, age, potential: calcPotential(pos, attrs, age, ovrCap), ...(lp ? { learnedPositions: lp } : {}) });
  }
  return { name, color, squad, isPlayer: false, trait };
}

// Generate a persistent squad management identity for an AI team.
// Called once per team, stored in leagueRosters. Trait provides the base;
// random variation means two teams with the same trait still differ.
export function generateSquadPhilosophy(trait) {
  const base = TRAIT_SQUAD_STYLE[trait] || { baseSize: 19, baseYouthRate: 0.5 };
  const sizeVariation = pickRandom([-2, -1, 0, 0, 1, 2]);
  return {
    targetSize: Math.max(14, Math.min(25, base.baseSize + sizeVariation)),
    youthRate: +(Math.max(0.15, Math.min(0.9, base.baseYouthRate + (Math.random() * 0.2 - 0.1)))).toFixed(2),
  };
}

// Pick a specific position weighted by type preferences (GK/DEF/MID/FWD).
function pickWeightedPosition(weights) {
  const positionsByType = {
    GK: ["GK"], DEF: ["CB", "CB", "LB", "RB"], MID: ["CM", "CM", "AM"], FWD: ["LW", "RW", "ST"],
  };
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of entries) {
    r -= w;
    if (r <= 0) {
      const pool = positionsByType[type];
      return pickRandom(pool);
    }
  }
  return "CM";
}

// Generate a single AI replacement player for a given position and tier.
// Youth (17-21) arrive with below-tier stats; signings (23-28) are tier-appropriate.
function generateAIReplacement(position, tier, isYouth, prestigeLevel = 0, trajectory = 0) {
  const offset = getPrestigeOffset(prestigeLevel);
  const ovrCap = getOvrCap(prestigeLevel);
  const def = LEAGUE_DEFS[tier] || LEAGUE_DEFS[11];
  const age = isYouth ? rand(17, 21) : rand(23, 28);
  const ovrAdj = isYouth ? -2.5 : 0;
  const center = (def.ovrMin + offset + def.ovrMax + offset) / 2 + ovrAdj + trajectory * 0.3;
  const pMin = Math.max(1, Math.round(center - 1.5));
  const pMax = Math.min(ovrCap, Math.round(center + 1.5));
  const attrs = {};
  const type = POSITION_TYPES[position];
  const biases = BIAS_AI;
  ATTRIBUTES.forEach(({ key }) => {
    const bias = (biases[type] && biases[type][key]) || 0;
    attrs[key] = Math.max(1, Math.min(ovrCap, rand(pMin, pMax) + bias));
  });
  applyAISpike(attrs, ovrCap);
  const natCode = pickAINationality(tier);
  const nameData = generateNameForNation(natCode);
  const ovr = Math.round(Object.values(attrs).reduce((a, b) => a + b, 0) / Object.values(attrs).length);
  const potential = Math.min(ovrCap, ovr + rand(1, 4));
  const lp = rollAILearnedPositions(position);
  return {
    id: genId("ai"),
    name: nameData.name, position, attrs, nationality: natCode, age, potential,
    ...(lp ? { learnedPositions: lp } : {}),
  };
}

// Evolve an AI team's squad for a new season: age players, retire old ones,
// recruit replacements driven by the team's trait and squad philosophy.
// Not 1:1 — teams aim toward their targetSize, creating natural variation.
export function evolveAISquad(squad, tier, trait, philosophy, prestigeLevel = 0, trajectory = 0, eventsOut = null) {
  // 1. Age everyone +1, backfill missing age/id from old saves
  const aged = squad.map(p => ({
    ...p,
    age: (p.age || rand(22, 32)) + 1,
    id: p.id || genId("ai"),
  }));

  // 2. Stat drift — young players improve, old players decline, with noise
  //    Drift step scales with prestige cap so it stays meaningful at higher tiers
  const ovrCap = getOvrCap(prestigeLevel);
  const drift = Math.max(1, Math.round(ovrCap * 0.05)); // P0:1, P1:2, P2:3, P3:3, P4:4, P5:5
  for (const p of aged) {
    if (!p.attrs) continue;
    const keys = ATTRIBUTES.map(a => a.key);
    if (p.age <= 24) {
      // Young: +drift to 1-2 random attrs, scaled by trajectory
      const trajScale = 1 + trajectory * 0.15; // +4 = 60% faster, -4 = 40% slower
      const count = rand(1, 2);
      for (let i = 0; i < count; i++) {
        const k = keys[rand(0, keys.length - 1)];
        const scaledDrift = Math.max(1, Math.round(drift * trajScale));
        p.attrs[k] = Math.min(ovrCap, (p.attrs[k] || 1) + scaledDrift);
      }
    } else if (p.age >= 31) {
      // Aging: -drift to 1-2 random attrs (physical/pace decline faster)
      const count = p.age >= 34 ? 2 : rand(1, 2);
      for (let i = 0; i < count; i++) {
        // 50% chance the decline hits pace or physical specifically
        const k = (Math.random() < 0.5 && (p.attrs.pace > 1 || p.attrs.physical > 1))
          ? (Math.random() < 0.5 ? "pace" : "physical")
          : keys[rand(0, keys.length - 1)];
        p.attrs[k] = Math.max(1, (p.attrs[k] || 1) - drift);
      }
    } else {
      // Prime (25-30): small random fluctuation — 30% chance of +/-drift to one attr
      if (rand(0, 99) < 30) {
        const k = keys[rand(0, keys.length - 1)];
        const delta = Math.random() < 0.6 ? drift : -drift;
        p.attrs[k] = Math.max(1, Math.min(ovrCap, (p.attrs[k] || 1) + delta));
      }
    }
  }

  // 3. Retirement check — same curve as player squad (increasingly random from 30+)
  const surviving = [];
  const retiredPositions = [];
  for (const p of aged) {
    const chance = getRetireChance(p.age);
    if (chance > 0 && Math.random() < chance) {
      retiredPositions.push(p.position);
    } else {
      surviving.push(p);
    }
  }

  // 4. Determine replacements — team aims toward its targetSize, not 1:1
  const target = philosophy?.targetSize || 19;
  const youthRate = philosophy?.youthRate || 0.5;
  const style = TRAIT_SQUAD_STYLE[trait] || TRAIT_SQUAD_STYLE.gritty;
  const deficit = target - surviving.length;
  const noise = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  const numReplacements = Math.max(0, deficit + noise);

  // 5. Generate replacements — 60% fill a retired position, 40% trait-weighted
  const usedNames = new Set(surviving.map(p => p.name));
  const uniqueReplacement = (pos, isYouth) => uniqueGenerate(() => generateAIReplacement(pos, tier, isYouth, prestigeLevel, trajectory), usedNames);
  const replacements = [];
  for (let i = 0; i < numReplacements; i++) {
    let pos;
    if (i < retiredPositions.length && Math.random() < 0.6) {
      pos = retiredPositions[i];
    } else {
      pos = pickWeightedPosition(style.recruitWeights);
    }
    const isYouth = Math.random() < youthRate;
    replacements.push(uniqueReplacement(pos, isYouth));
  }

  // Rare AI events — applied before trimming so boosted players aren't popped
  const def = LEAGUE_DEFS[tier] || LEAGUE_DEFS[11];
  const _offset = getPrestigeOffset(prestigeLevel);
  const youthReplacements = replacements.filter(p => (p.age || 25) <= 21);

  // Wonderkid (3%): one YOUTH replacement arrives with exceptional potential
  if (Math.random() < 0.03 && youthReplacements.length > 0) {
    const wk = youthReplacements[rand(0, youthReplacements.length - 1)];
    wk.potential = Math.min(ovrCap, def.ovrMax + _offset + 3);
    wk.age = rand(17, 19);
    if (eventsOut) eventsOut.push({ type: "wonderkid", playerName: wk.name, position: wk.position, age: wk.age });
  }

  // Golden generation (1%): 2-3 YOUTH replacements get potential +2
  if (Math.random() < 0.01 && youthReplacements.length >= 2) {
    const goldenCount = Math.min(youthReplacements.length, rand(2, 3));
    const shuffled = [...youthReplacements].sort(() => Math.random() - 0.5);
    for (let gi = 0; gi < goldenCount; gi++) {
      shuffled[gi].potential = Math.min(ovrCap, (shuffled[gi].potential || 0) + 2);
    }
    if (eventsOut) eventsOut.push({ type: "golden_gen", count: goldenCount });
  }

  // Hard floor: always able to field 11
  const result = [...surviving, ...replacements];
  while (result.length < 11) {
    result.push(uniqueReplacement(pickWeightedPosition(style.recruitWeights), true));
  }
  // Hard ceiling: never exceed 25 (same as player squad cap)
  while (result.length > 25) result.pop();

  // Star decline (5% per 28+ above-average player): sharp drop
  const avgOvr = result.reduce((s, p) => s + getOverall({ position: p.position, attrs: p.attrs }), 0) / result.length;
  for (const p of result) {
    if ((p.age || 25) >= 28 && getOverall({ position: p.position, attrs: p.attrs }) > avgOvr) {
      if (Math.random() < 0.05) {
        const keys = ATTRIBUTES.map(a => a.key);
        for (let di = 0; di < 2; di++) {
          const k = keys[rand(0, keys.length - 1)];
          p.attrs[k] = Math.max(1, (p.attrs[k] || 1) - 3);
        }
      }
    }
  }

  return result;
}

export function checkRetirements(squad, currentSeason) {
  const retiring = new Set();
  squad.forEach(p => {
    if (p.isLegend) return; // Legends never retire
    if (p.isUnlockable) {
      const joinedSeason = p.unlockableJoinedSeason || 1;
      const seasonsAtClub = (currentSeason || 1) - joinedSeason;
      const ageWhenSigned = p.age - seasonsAtClub;
      if (ageWhenSigned < 20) {
        const chance = getRetireChance(p.age);
        if (chance >= 1) { retiring.add(p.id); return; }
        if (chance > 0 && Math.random() < chance) retiring.add(p.id);
      } else {
        if (seasonsAtClub >= 10) retiring.add(p.id);
      }
      return;
    }
    const chance = getRetireChance(p.age);
    if (p.tags?.includes("Veteran")) {
      if (p.age < 42) {
        const vetChance = chance * 0.5;
        if (vetChance > 0 && Math.random() < vetChance) retiring.add(p.id);
      } else if (p.age >= 43) { retiring.add(p.id); }
      else if (Math.random() < 0.5) retiring.add(p.id);
      return;
    }
    if (chance >= 1) { retiring.add(p.id); return; }
    if (chance > 0 && Math.random() < chance) retiring.add(p.id);
  });
  return retiring;
}

// Primary stats that define each position type — used for Specialist archetype
const KEY_ATTRS_BY_TYPE = {
  GK:  ["defending", "physical", "mental"],
  DEF: ["defending", "physical", "pace"],
  MID: ["passing", "technique", "mental"],
  FWD: ["shooting", "pace", "technique"],
};
// Same-role positions eligible for secondary position learning
const POSITION_FAMILY = {
  GK:  [],
  DEF: ["CB", "LB", "RB"],
  MID: ["CM", "AM"],
  FWD: ["ST", "LW", "RW"],
};

// Roll a secondary position for an AI player (~15% chance)
function rollAILearnedPositions(position) {
  const type = POSITION_TYPES[position];
  const family = (POSITION_FAMILY[type] || []).filter(p => p !== position);
  if (family.length > 0 && rand(0, 99) < 15) {
    return [family[rand(0, family.length - 1)]];
  }
  return null;
}

export function generateYouthPlayer(position, ovrCap = 20) {
  const age = rand(17, 20);
  const type = POSITION_TYPES[position];
  const keyAttrs = KEY_ATTRS_BY_TYPE[type] || [];

  // Archetype determines stat distribution — adds personality to each intake
  const roll = rand(0, 99);
  const archetype = roll < 45 ? "balanced"    // 45% — steady all-round developer
                  : roll < 65 ? "specialist"  // 20% — strong key-role stats, weaker elsewhere
                  : roll < 80 ? "raw"         // 15% — low now, very high ceiling
                  :             "wildcard";   // 20% — one elite stat, rest poor

  const attrs = {};
  if (archetype === "balanced") {
    const lo = Math.max(1, Math.round(ovrCap * 0.18));
    const hi = Math.round(ovrCap * 0.45);
    const clamp = Math.round(ovrCap * 0.60);
    ATTRIBUTES.forEach(({ key }) => {
      const bias = BIAS_YOUTH[type]?.[key] || 0;
      attrs[key] = Math.max(1, Math.min(clamp, rand(lo, hi) + bias));
    });
  } else if (archetype === "specialist") {
    const lo = Math.max(1, Math.round(ovrCap * 0.15));
    const hi = Math.round(ovrCap * 0.35);
    const clamp = Math.round(ovrCap * 0.50);
    const specLo = Math.round(ovrCap * 0.40);
    const specHi = Math.round(ovrCap * 0.65);
    ATTRIBUTES.forEach(({ key }) => {
      const bias = BIAS_YOUTH[type]?.[key] || 0;
      if (keyAttrs.includes(key)) {
        attrs[key] = Math.min(Math.round(ovrCap * 0.72), rand(specLo, specHi) + bias);
      } else {
        attrs[key] = Math.max(1, Math.min(clamp, rand(lo, hi) + bias));
      }
    });
  } else if (archetype === "raw") {
    const lo = Math.max(1, Math.round(ovrCap * 0.10));
    const hi = Math.round(ovrCap * 0.28);
    const clamp = Math.round(ovrCap * 0.42);
    ATTRIBUTES.forEach(({ key }) => {
      const bias = BIAS_YOUTH[type]?.[key] || 0;
      attrs[key] = Math.max(1, Math.min(clamp, rand(lo, hi) + bias));
    });
  } else { // wildcard — one random stat is elite, rest are weak
    const eliteKey = ATTRIBUTES[rand(0, ATTRIBUTES.length - 1)].key;
    const lo = Math.max(1, Math.round(ovrCap * 0.10));
    const hi = Math.round(ovrCap * 0.25);
    const clamp = Math.round(ovrCap * 0.35);
    ATTRIBUTES.forEach(({ key }) => {
      if (key === eliteKey) {
        attrs[key] = Math.min(ovrCap, rand(Math.round(ovrCap * 0.50), Math.round(ovrCap * 0.72)));
      } else {
        const bias = BIAS_YOUTH[type]?.[key] || 0;
        attrs[key] = Math.max(1, Math.min(clamp, rand(lo, hi) + bias));
      }
    });
  }

  // Potential by archetype — raw has the highest ceiling
  const potential = archetype === "raw"
    ? rand(Math.round(ovrCap * 0.72), ovrCap)
    : archetype === "specialist"
    ? rand(Math.round(ovrCap * 0.60), Math.round(ovrCap * 0.82))
    : archetype === "wildcard"
    ? rand(Math.round(ovrCap * 0.55), Math.round(ovrCap * 0.78))
    : rand(Math.round(ovrCap * 0.55), Math.round(ovrCap * 0.82));

  const id = genId("youth");
  const natCode = pickNationality();
  const { name } = generateNameForNation(natCode);

  // 25% chance of arriving with a secondary position already learned
  const family = (POSITION_FAMILY[type] || []).filter(p => p !== position);
  const learnedPositions = (family.length > 0 && rand(0, 99) < 25)
    ? [family[rand(0, family.length - 1)]]
    : [];

  return {
    id, name, position, age, attrs, potential,
    statProgress: {},
    training: "balanced",
    history: [{ ...attrs }],
    gains: {},
    injury: null,
    isUnlockable: false,
    isYouthIntake: true,
    nationality: natCode,
    tags: [],
    injuryHistory: {},
    ...(learnedPositions.length > 0 ? { learnedPositions } : {}),
    youthArchetype: archetype,
  };
}

export function generateYouthIntake(retiringIds, squad, youthCoup, ovrCap = 20) {
  const retiringPositions = squad.filter(p => retiringIds.has(p.id)).map(p => p.position);
  const usedNames = new Set(squad.map(p => p.name));
  const candidates = [];
  const uniqueYouth = (pos) => uniqueGenerate(() => generateYouthPlayer(pos, ovrCap), usedNames);
  const positionsToFill = [...new Set(retiringPositions)].slice(0, 3);
  positionsToFill.forEach(pos => {
    candidates.push(uniqueYouth(pos));
  });
  const allPositions = [...STARTING_XI_POSITIONS];
  while (candidates.length < 3) {
    const pos = allPositions[rand(0, allPositions.length - 1)];
    candidates.push(uniqueYouth(pos));
  }
  // Youth Coup ticket: upgrade first candidate to prodigy
  if (youthCoup && candidates.length > 0) {
    const star = candidates[0];
    const prodigyMin = Math.round(ovrCap * 0.40);
    const prodigyMax = Math.round(ovrCap * 0.60);
    ATTRIBUTES.forEach(({ key }) => {
      star.attrs[key] = Math.min(ovrCap, Math.max(star.attrs[key], rand(prodigyMin, prodigyMax)));
    });
    star.potential = rand(Math.round(ovrCap * 0.80), ovrCap);
    star.isYouthCoup = true; // Flag for Prodigy Intake achievement
  }
  return candidates;
}

export function generateFreeAgent(tierStrength, squadAvgOvr, ovrCap = 20) {
  const positions = ["ST","LW","RW","AM","CM","CB","LB","RB","GK"];
  const position = positions[rand(0, positions.length - 1)];
  const age = rand(22, 28);
  const type = POSITION_TYPES[position];
  const tierScale = Math.max(1, 12 - tierStrength);
  const center = squadAvgOvr || tierScale;
  const baseMin = Math.max(1, center - 2);
  const baseMax = Math.min(ovrCap, center + 1);
  const biases = BIAS_FULL;
  const attrs = {};
  ATTRIBUTES.forEach(({ key }) => {
    const bias = (biases[type]?.[key]) || 0;
    attrs[key] = Math.max(1, Math.min(ovrCap, rand(baseMin, baseMax) + bias));
  });
  const ovr = getOverall({ position, attrs });
  const potential = Math.min(ovrCap, ovr + rand(2, 6));
  const natCode = pickNationality();
  const { name } = generateNameForNation(natCode);
  return {
    id: genId("free"),
    name, position, age, attrs, potential, nationality: natCode,
    statProgress: {}, training: "balanced", gains: {},
    history: [{ ...attrs }], injury: null, tags: [], injuryHistory: {},
  };
}

export function generateTrialPlayer(ovrCap = 20) {
  const natCode = FOREIGN_NATIONS[rand(0, FOREIGN_NATIONS.length - 1)];
  const { name } = generateNameForNation(natCode);
  const positions = ["ST","LW","RW","AM","CM","CB","LB","RB"];
  const position = positions[rand(0, positions.length - 1)];
  const type = POSITION_TYPES[position];
  const biases = BIAS_YOUTH;
  // Sliding scale: floor/ceiling % climb with prestige so players stay relevant
  // P0 (cap=20): ~15–40% → OVR 5–8  |  P3 (cap=68): ~36–59% → OVR 32–38
  // P5 (cap=100): ~50–72% → OVR 61–68  (potential always 70–100%)
  const pF = Math.max(0, Math.min(1, (ovrCap - 20) / 80)); // 0 at P0, 1 at P5
  const attrMin = Math.max(1, Math.round(ovrCap * (0.15 + pF * 0.35)));
  const attrMax = Math.round(ovrCap * (0.40 + pF * 0.32));
  const attrClamp = Math.round(ovrCap * (0.60 + pF * 0.15));
  const attrs = {};
  ATTRIBUTES.forEach(({ key }) => {
    const bias = (biases[type] && biases[type][key]) || 0;
    attrs[key] = Math.max(1, Math.min(attrClamp, rand(attrMin, attrMax) + bias));
  });
  const flag = NATIONALITIES.find(n => n.code === natCode)?.flag || "🏳️";
  const countryLabel = NATIONALITIES.find(n => n.code === natCode)?.label || natCode;
  const id = genId("trial");
  const potMin = Math.round(ovrCap * 0.70);
  return {
    id, name, position, age: 16, attrs, potential: rand(potMin, ovrCap),
    statProgress: {}, training: "balanced", history: [{ ...attrs }],
    gains: {}, injury: null, isUnlockable: false, nationality: natCode,
    isTrial: true, trialWeeksLeft: 3, trialStarts: 0,
    flag, countryLabel, injuryHistory: {},
  };
}

export function generateProdigalPlayer(formerClub, ovrCap = 20) {
  const { name } = generateNameForNation("ENG");
  const positions = ["ST", "AM", "CM"];
  const position = positions[rand(0, positions.length - 1)];
  // Scale attrs as % of cap — prodigal son is a polished technical player
  const s = ovrCap / 20; // scaling factor
  const attrs = {
    pace: rand(Math.round(4*s), Math.round(6*s)),
    shooting: rand(Math.round(7*s), Math.round(9*s)),
    passing: rand(Math.round(11*s), Math.round(13*s)),
    defending: rand(Math.round(3*s), Math.round(5*s)),
    physical: rand(Math.round(3*s), Math.round(5*s)),
    technique: rand(Math.round(13*s), Math.round(15*s)),
    mental: rand(Math.round(12*s), Math.round(14*s)),
  };
  const id = genId("prodigal");
  return {
    id, name, position, age: 25, attrs, potential: rand(Math.round(ovrCap * 0.9), ovrCap),
    statProgress: {}, training: "balanced", history: [{ ...attrs }],
    gains: {}, injury: null, isUnlockable: false, nationality: "ENG",
    isProdigal: true, formerClub, injuryHistory: {},
  };
}

// Abbreviated name for mobile: "Grape Cig" → "G.Cig", "Mark-Anthony Fraser" → "M-A.Fraser"
export function shortName(name) {
  if (!name) return "";
  const parts = name.split(" ");
  if (parts.length < 2) return name;
  const surname = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map(p => p[0]).join("-");
  return `${initials}.${surname}`;
}

/** Mobile-aware player name: abbreviated on small screens, full on desktop.
 *  Pass mob from useMobile() to keep reactivity explicit. */
export function displayName(name, mob) {
  const mobile = mob !== undefined ? mob : (typeof window !== "undefined" && window.innerWidth <= 768);
  return mobile ? shortName(name) : (name || "");
}
