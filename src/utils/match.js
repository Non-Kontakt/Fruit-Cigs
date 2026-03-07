import { POSITION_TYPES } from "../data/positions.js";
import { rand, getOverall } from "./calc.js";
import { getTeamOOPMultiplier } from "./formation.js";

// Match simulation constants — all tuning values in one place
const MATCH = {
  // Home advantage
  HOME_ADV: 0.2,

  // Expected goals: max(FLOOR, INTERCEPT + strengthDiff * MULTIPLIER + homeAdv)
  XG_INTERCEPT: 1.2,
  XG_MULTIPLIER: 0.16,
  XG_FLOOR: 0.3,
  XG_ABS_FLOOR: 0.2,

  // Trait multipliers [own, opp] applied to expected goals
  TRAIT_DOMINANT:    [1.1, 0.9],
  TRAIT_STARS:       [0.9, 0.85],
  TRAIT_FREE_SCORE:  [0.7, 0.85],  // base values; each gets + random * variance
  TRAIT_FREE_SCORE_VAR: [0.6, 0.3],
  TRAIT_DEFENSIVE:   [0.8, 0.75],
  TRAIT_PHYSICAL:    [0.85, 0.85],
  TRAIT_METHODICAL:  [0.9, 0.9],
  TRAIT_FLAIR:       [1.05, 0.95],

  // Injured starter penalty
  INJURY_PENALTY: 0.08,
  INJURY_OPP_BOOST: 0.5,

  // Talisman effect — ±5% xG swing depending on whether the key player is starting
  TALISMAN_EFFECT: 0.05,

  // Out-of-position opponent boost
  OOP_OPP_BOOST: 0.4,

  // Poisson goal cap
  POISSON_CAP: 12,

  // Trait-specific goal limits
  PHYSICAL_MAX_MARGIN: 2,
  METHODICAL_MAX_MARGIN: 1,
  GRITTY_COMEBACK_CHANCE: 0.4,
  OUTFIELD_GK_EXTRA_CHANCE: 0.5,

  // Goal minute selection
  GRITTY_LATE_CHANCE: 0.55,
  GRITTY_LATE_MIN: 75,
  STARS_MID_CHANCE: 0.3,
  STARS_MID_MIN: 55,
  STARS_MID_MAX: 75,

  // Scorer weights by position type
  SCORER_FWD: 4,
  SCORER_MID: 2,
  SCORER_DEF: 0.5,
  SCORER_GK: 0.1,
  STARS_FWD_BOOST: 4,
  INJURED_SCORER: 0.15,

  // Assist generation
  ASSIST_RATE: 0.75,
  ASSIST_MID: 3,
  ASSIST_FWD: 1.5,
  ASSIST_DEF: 1,

  // Substitution timing
  SUB_MIN: 55,
  SUB_MAX: 85,

  // Commentary volume
  COMMENTARY_MIN: 12,
  COMMENTARY_MAX: 18,

  // Red card effects
  RED_GOAL_REMOVAL: 0.5,
  RED_BONUS_GOAL: 0.3,

  // Player ratings
  RATE_BASE: 5.5,
  RATE_OVR_SCALE: 2.0,
  RATE_NOISE: 1.2,
  RATE_INJURY: 1.0,
  RATE_GOAL: 1.0,
  RATE_ASSIST: 0.6,
  RATE_CS: 0.8,
  RATE_CS_SUB: 0.4,
  RATE_WIN: 0.3,
  RATE_LOSS: 0.3,
  RATE_MIN: 4.0,
  RATE_MAX: 10.0,
  RATE_SUB_THRESHOLD: 10,

  // Penalty shootout
  PEN_RATE: 0.75,
  PEN_SUDDEN_RATE: 0.7,
  PEN_MAX_ROUNDS: 15,

  // Injured starter effectiveness (in getTeamStrength)
  INJURED_EFFECTIVENESS: 0.6,

  // Flash colors for match events
  FLASH_PLAYER: "#4ade80",
  FLASH_OPP: "#ef4444",
  FLASH_CHANCE: "#fbbf24",
  FLASH_HALFTIME: "#94a3b8",
  FLASH_RED: "#ef4444",
  FLASH_OUTFIELD_GK: "#f59e0b",
  FLASH_MOTM: "#60a5fa",
};

export function getTeamStrength(team, startingXI) {
  if (team.isPlayer && startingXI) {
    const starters = team.squad.filter(p => startingXI.includes(p.id));
    if (starters.length === 0) return 5;
    return starters.reduce((sum, p) => {
      let avg = getOverall(p);
      if (p.injury) avg *= MATCH.INJURED_EFFECTIVENESS; // Injured players contribute 60% effectiveness
      return sum + avg;
    }, 0) / starters.length;
  }
  // AI teams: only use starters (non-bench) for strength calc
  const starters = team.squad.filter(p => !p.isBench);
  if (starters.length === 0) return 5;
  return starters.reduce((sum, p) => {
    return sum + getOverall(p);
  }, 0) / starters.length;
}

export function generateFixtures(teamCount) {
  // Circle method round-robin: guarantees exactly (teamCount-1)*2 matchweeks
  const n = teamCount;
  const half = Math.floor(n / 2);

  // First half: n-1 rounds, each team plays every other team once
  const firstHalf = [];
  const rotating = [];
  for (let i = 1; i < n; i++) rotating.push(i);

  for (let round = 0; round < n - 1; round++) {
    const week = [];
    // Alternate team 0's home/away each round
    if (round % 2 === 0) week.push({ home: 0, away: rotating[0] });
    else week.push({ home: rotating[0], away: 0 });
    // Pair the rest
    for (let i = 1; i < half; i++) {
      const t1 = rotating[i];
      const t2 = rotating[rotating.length - i];
      if (round % 2 === 0) week.push({ home: t1, away: t2 });
      else week.push({ home: t2, away: t1 });
    }
    firstHalf.push(week);
    rotating.unshift(rotating.pop());
  }

  // Second half: reverse home/away for each fixture
  const secondHalf = firstHalf.map(week =>
    week.map(f => ({ home: f.away, away: f.home }))
  );

  // Combine both halves
  const allWeeks = [...firstHalf, ...secondHalf];

  // Rearrange to maximize H/A alternation for team 0 (the player)
  // Separate into home and away weeks for team 0
  const homeWeeks = [];
  const awayWeeks = [];
  allWeeks.forEach(week => {
    const playerMatch = week.find(f => f.home === 0 || f.away === 0);
    if (playerMatch && playerMatch.home === 0) homeWeeks.push(week);
    else awayWeeks.push(week);
  });
  // Shuffle within each pool for variety
  // Fisher-Yates shuffle: O(n) in-place, unbiased.
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } };
  shuffle(homeWeeks);
  shuffle(awayWeeks);
  // Interleave: H, A, H, A... with random start
  const result = [];
  let hi = 0, ai = 0;
  let wantHome = Math.random() < 0.5; // random whether season starts H or A
  for (let i = 0; i < allWeeks.length; i++) {
    if (wantHome && hi < homeWeeks.length) {
      result.push(homeWeeks[hi++]);
    } else if (!wantHome && ai < awayWeeks.length) {
      result.push(awayWeeks[ai++]);
    } else if (hi < homeWeeks.length) {
      result.push(homeWeeks[hi++]);
    } else {
      result.push(awayWeeks[ai++]);
    }
    wantHome = !wantHome;
  }
  return result;
}

export function simulateMatch(homeTeam, awayTeam, playerStartingXI, playerBench, neutral, playerOOPMult, twelfthManBoost, talismanId, fanSentimentMod = 0, modifiers = {}) {
  const homeStr = getTeamStrength(homeTeam, homeTeam.isPlayer ? playerStartingXI : null);
  const awayStr = getTeamStrength(awayTeam, awayTeam.isPlayer ? playerStartingXI : null);

  const homeAdv = neutral ? 0 : MATCH.HOME_ADV + (twelfthManBoost || 0); // 12th Man ticket can boost home advantage
  let homeExpected = Math.max(MATCH.XG_FLOOR, MATCH.XG_INTERCEPT + (homeStr - awayStr) * MATCH.XG_MULTIPLIER + homeAdv);
  let awayExpected = Math.max(MATCH.XG_FLOOR, MATCH.XG_INTERCEPT + (awayStr - homeStr) * MATCH.XG_MULTIPLIER);

  // Apply trait modifiers to expected goals
  const applyTraitToExpectedGoals = (team, ownExpected, oppExpected) => {
    const t = team.trait;
    if (!t) return [ownExpected, oppExpected];
    if (t === "dominant") return [ownExpected * MATCH.TRAIT_DOMINANT[0], oppExpected * MATCH.TRAIT_DOMINANT[1]];       // Possession control
    if (t === "stars") return [ownExpected * MATCH.TRAIT_STARS[0], oppExpected * MATCH.TRAIT_STARS[1]];          // Counter: lower volume, but clinical (star effect handles the rest)
    if (t === "free_scoring") {                                                 // Youth-style variance
      const variance = MATCH.TRAIT_FREE_SCORE[0] + Math.random() * MATCH.TRAIT_FREE_SCORE_VAR[0];
      return [ownExpected * variance, oppExpected * (MATCH.TRAIT_FREE_SCORE[1] + Math.random() * MATCH.TRAIT_FREE_SCORE_VAR[1])];
    }
    if (t === "defensive") return [ownExpected * MATCH.TRAIT_DEFENSIVE[0], oppExpected * MATCH.TRAIT_DEFENSIVE[1]];      // Park the bus
    if (t === "physical") return [ownExpected * MATCH.TRAIT_PHYSICAL[0], oppExpected * MATCH.TRAIT_PHYSICAL[1]];      // Low scoring both ways
    if (t === "methodical") return [ownExpected * MATCH.TRAIT_METHODICAL[0], oppExpected * MATCH.TRAIT_METHODICAL[1]];      // Tight controlled games
    if (t === "flair") return [ownExpected * MATCH.TRAIT_FLAIR[0], oppExpected * MATCH.TRAIT_FLAIR[1]];         // Slight edge from won set pieces
    return [ownExpected, oppExpected];
  };

  // Each team's trait adjusts both its own expected goals and the opponent's.
  // Apply home trait first, then away trait on top (order matters for stacking effects).
  let [homeXG] = applyTraitToExpectedGoals(homeTeam, homeExpected, awayExpected);
  let [awayXG, homeAdjFromAway] = applyTraitToExpectedGoals(awayTeam, awayExpected, homeXG);
  homeExpected = Math.max(MATCH.XG_ABS_FLOOR, homeAdjFromAway || homeXG);
  awayExpected = Math.max(MATCH.XG_ABS_FLOOR, awayXG);

  // Detect injured starters in player team — penalty applied before goal generation
  let injuredStarters = [];
  const playerTeamRef = homeTeam.isPlayer ? homeTeam : (awayTeam.isPlayer ? awayTeam : null);
  if (playerTeamRef && playerStartingXI) {
    injuredStarters = playerTeamRef.squad.filter(p => playerStartingXI.includes(p.id) && p.injury).map(p => ({ id: p.id, name: p.name }));
    if (injuredStarters.length > 0) {
      const penalty = injuredStarters.length * MATCH.INJURY_PENALTY; // 8% weaker per injured starter
      if (homeTeam.isPlayer) {
        homeExpected = Math.max(MATCH.XG_ABS_FLOOR, homeExpected * (1 - penalty));
        awayExpected = awayExpected * (1 + penalty * MATCH.INJURY_OPP_BOOST);
      } else {
        awayExpected = Math.max(MATCH.XG_ABS_FLOOR, awayExpected * (1 - penalty));
        homeExpected = homeExpected * (1 + penalty * MATCH.INJURY_OPP_BOOST);
      }
    }
  }

  // Talisman effect — +5% when starting, -5% when absent
  if (talismanId && playerTeamRef && playerStartingXI) {
    const talismanPlaying = playerStartingXI.includes(talismanId);
    const mult = talismanPlaying ? (1 + MATCH.TALISMAN_EFFECT) : (1 - MATCH.TALISMAN_EFFECT);
    if (homeTeam.isPlayer) {
      homeExpected = Math.max(MATCH.XG_ABS_FLOOR, homeExpected * mult);
    } else {
      awayExpected = Math.max(MATCH.XG_ABS_FLOOR, awayExpected * mult);
    }
  }

  // Fan sentiment crowd effect — home xG +3% when fans buzzing, -3% when hostile
  if (fanSentimentMod !== 0 && !neutral) {
    if (homeTeam.isPlayer) homeExpected = Math.max(MATCH.XG_ABS_FLOOR, homeExpected * (1 + fanSentimentMod));
    else if (awayTeam.isPlayer) awayExpected = Math.max(MATCH.XG_ABS_FLOOR, awayExpected * (1 + fanSentimentMod));
  }

  // Out-of-position penalty for player team
  const oopMult = playerOOPMult != null ? playerOOPMult : 1.0;
  if (oopMult < 1.0 && playerTeamRef) {
    const oopPenalty = 1 - oopMult; // e.g. 0.08 if avg mult is 0.92
    if (homeTeam.isPlayer) {
      homeExpected = Math.max(MATCH.XG_ABS_FLOOR, homeExpected * oopMult);
      awayExpected = awayExpected * (1 + oopPenalty * MATCH.OOP_OPP_BOOST); // opponent gets a smaller boost
    } else {
      awayExpected = Math.max(MATCH.XG_ABS_FLOOR, awayExpected * oopMult);
      homeExpected = homeExpected * (1 + oopPenalty * MATCH.OOP_OPP_BOOST);
    }
  }

  // League modifier xG adjustments
  if (modifiers.xgMult) {
    homeExpected = Math.max(MATCH.XG_ABS_FLOOR, homeExpected * modifiers.xgMult);
    awayExpected = Math.max(MATCH.XG_ABS_FLOOR, awayExpected * modifiers.xgMult);
  }
  if (!neutral && modifiers.homeXGMult) {
    homeExpected = Math.max(MATCH.XG_ABS_FLOOR, homeExpected * modifiers.homeXGMult);
  }
  if (!neutral && modifiers.awayXGMult) {
    awayExpected = Math.max(MATCH.XG_ABS_FLOOR, awayExpected * modifiers.awayXGMult);
  }

  // Knuth's algorithm for sampling from a Poisson distribution.
  // Generates the number of goals scored given an expected-goals value.
  // Capped at 12 to allow rare blowouts (9-0, 10-1 etc.) while still preventing runaway loops.
  const poissonGoals = (expected) => {
    let goals = 0, p = Math.exp(-expected), s = p, u = Math.random();
    while (u > s && goals < MATCH.POISSON_CAP) { goals++; p *= expected / goals; s += p; }
    return goals;
  };

  let homeGoals = poissonGoals(homeExpected);
  let awayGoals = poissonGoals(awayExpected);

  // Physical: cap losing margin to max PHYSICAL_MAX_MARGIN goals
  if (homeTeam.trait === "physical" && awayGoals - homeGoals > MATCH.PHYSICAL_MAX_MARGIN) homeGoals = awayGoals - MATCH.PHYSICAL_MAX_MARGIN;
  if (awayTeam.trait === "physical" && homeGoals - awayGoals > MATCH.PHYSICAL_MAX_MARGIN) awayGoals = homeGoals - MATCH.PHYSICAL_MAX_MARGIN;

  // Methodical: cap winning margin to METHODICAL_MAX_MARGIN goal
  if (homeTeam.trait === "methodical" && homeGoals - awayGoals > MATCH.METHODICAL_MAX_MARGIN) homeGoals = awayGoals + MATCH.METHODICAL_MAX_MARGIN;
  if (awayTeam.trait === "methodical" && awayGoals - homeGoals > MATCH.METHODICAL_MAX_MARGIN) awayGoals = homeGoals + MATCH.METHODICAL_MAX_MARGIN;

  // Gritty: if losing, GRITTY_COMEBACK_CHANCE to pull one back + goals tend to be late
  if (homeTeam.trait === "gritty" && homeGoals < awayGoals && Math.random() < MATCH.GRITTY_COMEBACK_CHANCE) homeGoals++;
  if (awayTeam.trait === "gritty" && awayGoals < homeGoals && Math.random() < MATCH.GRITTY_COMEBACK_CHANCE) awayGoals++;

  // Detect outfield player in goal (no GK in starting XI)
  let outfieldInGoal = false;
  if (homeTeam.isPlayer && playerStartingXI) {
    const starters = homeTeam.squad.filter(p => playerStartingXI.includes(p.id) && !p.injury);
    const hasGK = starters.some(p => p.position === "GK");
    if (!hasGK && starters.length > 0) {
      outfieldInGoal = true;
      if (Math.random() < MATCH.OUTFIELD_GK_EXTRA_CHANCE) awayGoals++; // ~50% chance of conceding an extra goal
    }
  } else if (awayTeam.isPlayer && playerStartingXI) {
    const starters = awayTeam.squad.filter(p => playerStartingXI.includes(p.id) && !p.injury);
    const hasGK = starters.some(p => p.position === "GK");
    if (!hasGK && starters.length > 0) {
      outfieldInGoal = true;
      if (Math.random() < MATCH.OUTFIELD_GK_EXTRA_CHANCE) homeGoals++;
    }
  }

  // Pick goal minute based on team trait
  const pickGoalMinute = (team) => {
    if (team.trait === "gritty" && Math.random() < MATCH.GRITTY_LATE_CHANCE) return rand(MATCH.GRITTY_LATE_MIN, 90);    // Comeback kings: goals late
    if (team.trait === "stars" && Math.random() < MATCH.STARS_MID_CHANCE) return rand(MATCH.STARS_MID_MIN, MATCH.STARS_MID_MAX);       // Counter goals mid-second-half
    return rand(1, 90);
  };

  // Get the actual playing players for a team
  // For player teams, injured starters ARE included (playing through injury)
  const getPlayingSquad = (team) => {
    if (team.isPlayer && playerStartingXI) {
      return team.squad.filter(p => playerStartingXI.includes(p.id));
    }
    // AI teams: first 11 are starters
    return team.squad.filter(p => !p.isBench && !p.injury);
  };

  const getBench = (team) => {
    if (team.isPlayer && playerBench) {
      return team.squad.filter(p => playerBench.includes(p.id) && !p.injury);
    }
    // AI teams: bench players
    return team.squad.filter(p => p.isBench && !p.injury);
  };

  // Pick a scorer from a team (weighted by shooting + position).
  // Returns null when the team has no named players (AI roster edge case).
  const pickScorer = (team) => {
    const players = getPlayingSquad(team);
    const weights = players.map(p => {
      const type = POSITION_TYPES[p.position];
      const shoot = (p.attrs?.shooting || 10) / 20;
      const posW = type === "FWD" ? MATCH.SCORER_FWD : type === "MID" ? MATCH.SCORER_MID : type === "DEF" ? MATCH.SCORER_DEF : MATCH.SCORER_GK;
      let w = shoot * posW;
      // Stars trait: massively boost the top scorer so braces/hat-tricks happen
      if (team.trait === "stars" && type === "FWD") w *= MATCH.STARS_FWD_BOOST;
      // Injured players are far less likely to score
      if (p.injury) w *= MATCH.INJURED_SCORER;
      return w;
    });
    const total = weights.reduce((s, w) => s + w, 0);
    if (total === 0) return null;
    let r = Math.random() * total;
    for (let j = 0; j < weights.length; j++) {
      r -= weights[j];
      if (r <= 0) return players[j].name || null;
    }
    return players[0]?.name || null;
  };

  // Pick a random player for non-goal events. Returns null if roster is empty.
  const pickPlayer = (team) => {
    const players = getPlayingSquad(team);
    if (players.length === 0) return null;
    return players[rand(0, players.length - 1)].name || null;
  };
  // Null-safe wrapper for use in commentary template strings.
  const namedPlayer = (team) => pickPlayer(team) ?? "a player";

  // Pick an assister for a goal (~75% of goals have assists, in line with PL average)
  // Weighted toward MIDs/wingers > FWDs > DEFs; GKs excluded
  const pickAssister = (team, scorerName) => {
    if (Math.random() > MATCH.ASSIST_RATE) return null;
    const players = getPlayingSquad(team).filter(p => p.name !== scorerName);
    if (players.length === 0) return null;
    const weights = players.map(p => {
      const type = POSITION_TYPES[p.position];
      if (type === "GK") return 0;
      const passing = (p.attrs?.passing || 10) / 20;
      const posW = type === "MID" ? MATCH.ASSIST_MID : type === "FWD" ? MATCH.ASSIST_FWD : MATCH.ASSIST_DEF; // DEF = ASSIST_DEF
      return passing * posW;
    });
    const total = weights.reduce((s, w) => s + w, 0);
    if (total === 0) return null;
    let r = Math.random() * total;
    for (let j = 0; j < weights.length; j++) {
      r -= weights[j];
      if (r <= 0) return players[j].name || null;
    }
    return players[0]?.name || null;
  };

  // Build full event timeline
  const events = [];

  // Kick off
  events.push({ minute: 0, type: "kickoff", text: "Kick off! The match is underway.", flash: false });

  // Generate goals at random minutes (trait-aware)
  // Each goal must land on a unique minute — two goals cannot share a minute
  const goalMinutes = [];
  const usedGoalMinutes = new Set();
  const pickUniqueGoalMinute = (team) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const min = pickGoalMinute(team);
      if (!usedGoalMinutes.has(min)) { usedGoalMinutes.add(min); return min; }
    }
    // Fallback: scan sequentially for the first free minute
    for (let m = 1; m <= 90; m++) {
      if (!usedGoalMinutes.has(m)) { usedGoalMinutes.add(m); return m; }
    }
    return 90; // absolute last resort (>90 goals, impossible in practice)
  };
  for (let i = 0; i < homeGoals; i++) {
    const min = pickUniqueGoalMinute(homeTeam);
    goalMinutes.push(min);
    const scorer = pickScorer(homeTeam) ?? "Unknown";
    const assister = pickAssister(homeTeam, scorer);
    events.push({
      minute: min, type: "goal", side: "home",
      player: scorer,
      assister: assister || undefined,
      text: assister
        ? `⚽ GOAL! ${scorer} scores for ${homeTeam.name}! (Assist: ${assister})`
        : `⚽ GOAL! ${scorer} scores for ${homeTeam.name}!`,
      flash: true, flashColor: homeTeam.isPlayer ? MATCH.FLASH_PLAYER : MATCH.FLASH_OPP,
    });
  }
  for (let i = 0; i < awayGoals; i++) {
    const min = pickUniqueGoalMinute(awayTeam);
    goalMinutes.push(min);
    const scorer = pickScorer(awayTeam) ?? "Unknown";
    const assister = pickAssister(awayTeam, scorer);
    events.push({
      minute: min, type: "goal", side: "away",
      player: scorer,
      assister: assister || undefined,
      text: assister
        ? `⚽ GOAL! ${scorer} scores for ${awayTeam.name}! (Assist: ${assister})`
        : `⚽ GOAL! ${scorer} scores for ${awayTeam.name}!`,
      flash: true, flashColor: awayTeam.isPlayer ? MATCH.FLASH_PLAYER : MATCH.FLASH_OPP,
    });
  }

  // Generate substitution events (3 per team, between 55-85 min)
  const generateSubs = (team) => {
    const bench = getBench(team);
    const playing = getPlayingSquad(team);
    const subCount = Math.min(3, bench.length);
    const subEvents = [];
    const subbedOff = new Set();
    const subbedOn = new Set();
    for (let i = 0; i < subCount; i++) {
      const min = rand(MATCH.SUB_MIN, MATCH.SUB_MAX);
      const availableOff = playing.filter(p => !subbedOff.has(p.name) && POSITION_TYPES[p.position] !== "GK");
      const availableOn = bench.filter(p => !subbedOn.has(p.name));
      if (availableOff.length === 0 || availableOn.length === 0) break;
      const off = availableOff[rand(0, availableOff.length - 1)];
      const on = availableOn[rand(0, availableOn.length - 1)];
      subbedOff.add(off.name);
      subbedOn.add(on.name);
      subEvents.push({
        minute: min, type: "sub",
        text: `🔄 Substitution for ${team.name}: ${on.name} replaces ${off.name}`,
        flash: false,
      });
    }
    return subEvents;
  };

  // Add subs for both teams
  events.push(...generateSubs(homeTeam));
  events.push(...generateSubs(awayTeam));

  // Commentary events
  const commentaryTemplates = [
    { type: "shot", weight: 6, gen: (team, opp) => { const p = namedPlayer(team); return { text: `${p} fires a shot from distance — goes wide.`, flash: false }; }},
    { type: "shot", weight: 4, gen: (team, opp) => { const p = namedPlayer(team); return { text: `Good save! ${p}'s effort is tipped over the bar.`, flash: false }; }},
    { type: "chance", weight: 3, gen: (team, opp) => { const p = namedPlayer(team); return { text: `${p} breaks through on goal... but fires over!`, flash: true, flashColor: MATCH.FLASH_CHANCE }; }},
    { type: "foul", weight: 4, gen: (team, opp) => { const p = namedPlayer(opp); return { text: `Free kick. ${p} is brought down in midfield.`, flash: false }; }},
    { type: "card", weight: 1, gen: (team, opp) => { const p = namedPlayer(team); return { text: `🟨 Yellow card! ${p} goes into the book.`, flash: true, flashColor: MATCH.FLASH_CHANCE, cardPlayer: p, cardTeamName: team.name }; }},
    { type: "possession", weight: 5, gen: (team, opp) => ({ text: `${team.name} building patiently from the back...`, flash: false }) },
    { type: "possession", weight: 3, gen: (team, opp) => ({ text: `Good spell of pressure from ${team.name}.`, flash: false }) },
    { type: "tackle", weight: 3, gen: (team, opp) => { const p = namedPlayer(team); return { text: `Crunching tackle from ${p}!`, flash: false }; }},
    { type: "corner", weight: 2, gen: (team, opp) => ({ text: `Corner kick for ${team.name}. It's cleared at the near post.`, flash: false }) },
    { type: "chance", weight: 2, gen: (team, opp) => { const p = namedPlayer(team); return { text: `${p} unleashes a powerful strike — off the crossbar!`, flash: true, flashColor: MATCH.FLASH_CHANCE }; }},
  ];

  const totalCommentaryWeight = commentaryTemplates.reduce((s, t) => s + t.weight, 0);
  const commentaryCount = rand(MATCH.COMMENTARY_MIN, MATCH.COMMENTARY_MAX);
  const usedMinutes = new Set(goalMinutes);
  for (let i = 0; i < commentaryCount; i++) {
    const min = rand(1, 90);
    if (usedMinutes.has(min)) continue;
    usedMinutes.add(min);
    let r = Math.random() * totalCommentaryWeight;
    let template = commentaryTemplates[0];
    for (const t of commentaryTemplates) {
      r -= t.weight;
      if (r <= 0) { template = t; break; }
    }
    const team = Math.random() < 0.5 ? homeTeam : awayTeam;
    const opp = team === homeTeam ? awayTeam : homeTeam;
    const side = team === homeTeam ? "home" : "away";
    const evt = template.gen(team, opp);
    events.push({ minute: min, type: template.type, side, ...evt });
  }

  // Trait-specific bonus commentary
  const addTraitCommentary = (team, opp, side) => {
    const t = team.trait;
    if (!t) return;
    if (t === "physical") {
      for (let i = 0; i < rand(2, 4); i++) {
        const min = rand(1, 90);
        if (Math.random() < 0.4 && !modifiers.noCards) {
          const p = namedPlayer(team);
          events.push({ minute: min, type: "card", side, text: `🟨 Yellow card! ${p} goes into the book for a late challenge.`, flash: true, flashColor: MATCH.FLASH_CHANCE, cardPlayer: p, cardTeamName: team.name });
        } else {
          const p = namedPlayer(opp);
          events.push({ minute: min, type: "foul", side, text: `${p} is clattered by a tough ${team.name} challenge. Free kick.`, flash: false });
        }
      }
    }
    if (t === "dominant") {
      for (let i = 0; i < rand(3, 4); i++) {
        events.push({ minute: rand(1, 90), type: "possession", side, text: `${team.name} dominating possession, moving the ball with purpose.`, flash: false });
      }
    }
    if (t === "set_piece") {
      for (let i = 0; i < rand(2, 3); i++) {
        events.push({ minute: rand(1, 90), type: "corner", side, text: `Dangerous corner from ${team.name}. The keeper punches clear!`, flash: false });
      }
      events.push({ minute: rand(20, 80), type: "chance", side, text: `${team.name} free kick curls toward the top corner — just over!`, flash: true, flashColor: MATCH.FLASH_CHANCE });
    }
    if (t === "stars") {
      events.push({ minute: rand(30, 75), type: "chance", side, text: `Brilliant counter-attack from ${team.name}! The shot is saved!`, flash: true, flashColor: MATCH.FLASH_CHANCE });
      events.push({ minute: rand(50, 85), type: "chance", side, text: `${team.name}'s star man picks up the ball and runs at the defence...`, flash: false });
    }
    if (t === "gritty") {
      events.push({ minute: rand(75, 88), type: "possession", side, text: `${team.name} are throwing bodies forward! They never know when they're beaten!`, flash: false });
    }
    if (t === "methodical") {
      for (let i = 0; i < rand(1, 2); i++) {
        events.push({ minute: rand(1, 90), type: "possession", side, text: `${team.name} passing it around patiently, probing for an opening.`, flash: false });
      }
    }
    if (t === "flair") {
      for (let i = 0; i < rand(2, 3); i++) {
        const min = rand(1, 90);
        if (Math.random() < 0.3 && !modifiers.noCards) {
          const p = namedPlayer(team);
          events.push({ minute: min, type: "card", side, text: `🟨 Yellow card! ${p} is booked for simulation! The referee wasn't fooled.`, flash: true, flashColor: MATCH.FLASH_CHANCE, cardPlayer: p, cardTeamName: team.name });
        } else {
          events.push({ minute: min, type: "foul", side, text: `${team.name} player goes down in the box — free kick awarded.`, flash: false });
        }
      }
    }
    if (t === "free_scoring") {
      events.push({ minute: rand(10, 80), type: "chance", side, text: `End to end stuff! ${team.name} are always entertaining!`, flash: false });
    }
    if (t === "defensive") {
      events.push({ minute: rand(1, 90), type: "possession", side, text: `${team.name} sitting deep, two banks of four. Hard to break down.`, flash: false });
      events.push({ minute: rand(1, 90), type: "tackle", side, text: `Another block from ${team.name}! They're putting their bodies on the line.`, flash: false });
    }
  };

  addTraitCommentary(homeTeam, awayTeam, "home");
  addTraitCommentary(awayTeam, homeTeam, "away");

  // Half time
  events.push({ minute: 45, type: "halftime", text: "Half time.", flash: true, flashColor: MATCH.FLASH_HALFTIME });

  // Full time
  events.push({ minute: 90, type: "fulltime", text: "Full time! The referee blows the whistle.", flash: true, flashColor: MATCH.FLASH_HALFTIME });

  // Outfield player in goal commentary
  if (outfieldInGoal) {
    const playerTeamName = homeTeam.isPlayer ? homeTeam.name : awayTeam.name;
    events.push({ minute: 1, type: "commentary", text: `🧤 ${playerTeamName} forced to play an outfield player in goal today! This could get interesting...`, flash: true, flashColor: MATCH.FLASH_OUTFIELD_GK });
  }

  // Sort by minute
  events.sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    // subs happen before other events at same minute
    if (a.type === "sub" && b.type !== "sub") return -1;
    if (b.type === "sub" && a.type !== "sub") return 1;
    // motm always last
    if (a.type === "motm") return 1;
    if (b.type === "motm") return -1;
    // fulltime before other min-90 events but after goals
    if (a.type === "fulltime") return 1;
    if (b.type === "fulltime") return -1;
    if (a.type === "goal") return -1;
    if (b.type === "goal") return 1;
    return 0;
  });

  // Post-process: enforce sub consistency — subbed-off players can't appear after they leave
  const subbedOffByTeam = {}; // teamName -> Set of player names removed
  const subbedOnByTeam = {};  // teamName -> array of player names added
  const subMinutes = {};       // teamName -> { playerName: minuteCameOn }
  for (const evt of events) {
    if (evt.type === "sub") {
      // Parse "🔄 Substitution for TeamName: OnPlayer replaces OffPlayer"
      const subMatch = evt.text.match(/Substitution for (.+?):\s*(.+?)\s+replaces\s+(.+)$/);
      if (subMatch) {
        const teamName = subMatch[1];
        const onName = subMatch[2].trim();
        const offName = subMatch[3].trim();
        if (!subbedOffByTeam[teamName]) subbedOffByTeam[teamName] = new Set();
        subbedOffByTeam[teamName].add(offName);
        if (!subbedOnByTeam[teamName]) subbedOnByTeam[teamName] = [];
        subbedOnByTeam[teamName].push(onName);
        if (!subMinutes[teamName]) subMinutes[teamName] = {};
        subMinutes[teamName][onName] = evt.minute;
      }
    }
    // For goal events, check if scorer was subbed off
    if (evt.type === "goal" && evt.player) {
      const team = evt.side === "home" ? homeTeam : awayTeam;
      const offSet = subbedOffByTeam[team.name];
      if (offSet && offSet.has(evt.player)) {
        // Re-pick scorer from players still on pitch
        const starters = getPlayingSquad(team).map(p => p.name).filter(n => !offSet.has(n));
        const subs = subbedOnByTeam[team.name] || [];
        const available = [...starters, ...subs];
        if (available.length > 0) {
          const newScorer = available[rand(0, available.length - 1)];
          evt.player = newScorer;
          evt.text = `⚽ GOAL! ${newScorer} scores for ${team.name}!`;
        }
      }
    }
    // For other named events (cards, shots etc), check cardPlayer
    if (evt.cardPlayer && evt.cardTeamName) {
      const offSet = subbedOffByTeam[evt.cardTeamName];
      if (offSet && offSet.has(evt.cardPlayer)) {
        const team = evt.cardTeamName === homeTeam.name ? homeTeam : awayTeam;
        const starters = getPlayingSquad(team).map(p => p.name).filter(n => !offSet.has(n));
        const subs = subbedOnByTeam[team.name] || [];
        const available = [...starters, ...subs];
        if (available.length > 0) {
          const newPlayer = available[rand(0, available.length - 1)];
          evt.text = evt.text.replace(evt.cardPlayer, newPlayer);
          evt.cardPlayer = newPlayer;
        }
      }
    }
  }

  // Post-process: detect second yellows → red cards, then debuff goals
  const cardCounts = {}; // "teamName|playerName" → count
  const redCards = []; // { minute, teamName }
  if (modifiers.noCards) {
    // Strip all card events from the match
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].type === "card") events.splice(i, 1);
    }
  }
  for (const evt of events) {
    if (evt.type === "card" && evt.cardPlayer && evt.cardTeamName) {
      const key = `${evt.cardTeamName}|${evt.cardPlayer}`;
      cardCounts[key] = (cardCounts[key] || 0) + 1;
      if (cardCounts[key] === 2) {
        // Convert second yellow to red card
        evt.text = `🟥 RED CARD! ${evt.cardPlayer} gets a second yellow and is sent off!`;
        evt.flashColor = MATCH.FLASH_RED;
        evt.type = "red_card";
        redCards.push({ minute: evt.minute, teamName: evt.cardTeamName });
      }
    }
  }

  // For each red card, remove some goals from that team after the red card minute
  // (simulates playing with 10 men being harder)
  for (const red of redCards) {
    const isHome = red.teamName === homeTeam.name;
    const goalsAfterRed = events.filter(e =>
      e.type === "goal" && e.minute > red.minute &&
      ((isHome && e.side === "home") || (!isHome && e.side === "away"))
    );
    // Remove ~RED_GOAL_REMOVAL of goals after the red card (they're weaker with 10 men)
    for (const g of goalsAfterRed) {
      if (Math.random() < MATCH.RED_GOAL_REMOVAL) {
        events.splice(events.indexOf(g), 1);
        if (isHome) homeGoals--;
        else awayGoals--;
      }
    }
    // Also boost the OTHER team's chances: RED_BONUS_GOAL chance of a bonus goal
    if (Math.random() < MATCH.RED_BONUS_GOAL) {
      let bonusMin = rand(red.minute + 1, 90);
      for (let attempt = 0; attempt < 20 && usedGoalMinutes.has(bonusMin); attempt++) bonusMin = rand(red.minute + 1, 90);
      if (usedGoalMinutes.has(bonusMin)) { for (let m = red.minute + 1; m <= 90; m++) { if (!usedGoalMinutes.has(m)) { bonusMin = m; break; } } }
      usedGoalMinutes.add(bonusMin);
      const scoringTeam = isHome ? awayTeam : homeTeam;
      const scorer = pickScorer(scoringTeam) ?? "Unknown";
      events.push({
        minute: bonusMin, type: "goal", side: isHome ? "away" : "home",
        player: scorer,
        text: `⚽ GOAL! ${scorer} scores for ${scoringTeam.name}! Exploiting the extra man!`,
        flash: true, flashColor: scoringTeam.isPlayer ? MATCH.FLASH_PLAYER : MATCH.FLASH_OPP,
      });
      if (isHome) awayGoals++;
      else homeGoals++;
    }
  }

  // VAR: disallow goals and upgrade yellows to reds
  if (modifiers.var) {
    // Disallow goals
    for (let i = events.length - 1; i >= 0; i--) {
      const evt = events[i];
      if (evt.type === "goal" && Math.random() < (modifiers.varDisallowChance || 0.12)) {
        evt.type = "var_disallowed";
        evt.text = `📺 VAR REVIEW — Goal by ${evt.player} DISALLOWED!`;
        evt.flash = true;
        evt.flashColor = "#ef4444";
        if (evt.side === "home") homeGoals--;
        else awayGoals--;
      }
    }
    // Upgrade yellows to reds
    for (const evt of events) {
      if (evt.type === "card" && evt.cardPlayer && Math.random() < (modifiers.varRedUpgradeChance || 0.15)) {
        evt.type = "red_card";
        evt.text = `📺 VAR UPGRADE — ${evt.cardPlayer}'s yellow upgraded to 🟥 RED CARD!`;
        evt.flashColor = MATCH.FLASH_RED;
        redCards.push({ minute: evt.minute, teamName: evt.cardTeamName });
      }
    }
  }

  // Re-sort after red card / VAR processing
  if (redCards.length > 0 || modifiers.var) {
    events.sort((a, b) => {
      if (a.minute !== b.minute) return a.minute - b.minute;
      if (a.type === "motm") return 1;
      if (b.type === "motm") return -1;
      if (a.type === "fulltime") return 1;
      if (b.type === "fulltime") return -1;
      if (a.type === "goal") return -1;
      if (b.type === "goal") return 1;
      return 0;
    });
  }

  // Collect goal events for ratings and comeback detection
  const goalEvents = events.filter(e => e.type === "goal").sort((a, b) => a.minute - b.minute);

  // Player ratings — starting XI + bench subs
  const generateRatings = (team) => {
    if (!team.isPlayer || !playerStartingXI) return [];
    const isHome = team === homeTeam;
    const playerSide = isHome ? "home" : "away";
    const oppGoalsInMatch = isHome ? awayGoals : homeGoals;
    const teamWon = isHome ? (homeGoals > awayGoals) : (awayGoals > homeGoals);
    const teamLost = isHome ? (homeGoals < awayGoals) : (awayGoals < homeGoals);

    // Count goals and assists per player name
    const playerGoalCounts = {};
    const playerAssistCounts = {};
    for (const g of goalEvents) {
      if (g.side === playerSide) {
        if (g.player) playerGoalCounts[g.player] = (playerGoalCounts[g.player] || 0) + 1;
        if (g.assister) playerAssistCounts[g.assister] = (playerAssistCounts[g.assister] || 0) + 1;
      }
    }

    const calcRating = (p, isSubstitute) => {
      if (!p.attrs) return null;
      const overall = getOverall(p);
      let base = MATCH.RATE_BASE + (overall / 20) * MATCH.RATE_OVR_SCALE;
      const noise = (Math.random() - 0.5) * MATCH.RATE_NOISE;
      if (!isSubstitute && p.injury) base -= MATCH.RATE_INJURY;
      const goals = playerGoalCounts[p.name] || 0;
      const assists = playerAssistCounts[p.name] || 0;
      base += goals * MATCH.RATE_GOAL;
      base += assists * MATCH.RATE_ASSIST;
      const type = POSITION_TYPES[p.position];
      if (oppGoalsInMatch === 0 && (type === "GK" || type === "DEF")) base += isSubstitute ? MATCH.RATE_CS_SUB : MATCH.RATE_CS;
      if (teamWon) base += MATCH.RATE_WIN;
      else if (teamLost) base -= MATCH.RATE_LOSS;
      return Math.round(Math.max(MATCH.RATE_MIN, Math.min(MATCH.RATE_MAX, base + noise)) * 10) / 10;
    };

    const starterRatings = team.squad
      .filter(p => playerStartingXI.includes(p.id))
      .map(p => ({ name: p.name, position: p.position, rating: calcRating(p, false), isSub: false }));

    const teamSubMinutes = subMinutes[team.name] || {};
    const benchRatings = (playerBench || [])
      .map(id => team.squad.find(p => p.id === id))
      .filter(Boolean)
      .map(p => {
        const minuteOn = teamSubMinutes[p.name];
        if (minuteOn === undefined) {
          return { name: p.name, position: p.position, rating: null, isSub: true, minutesPlayed: 0 };
        }
        const minutesPlayed = 90 - minuteOn;
        if (minutesPlayed < MATCH.RATE_SUB_THRESHOLD) {
          return { name: p.name, position: p.position, rating: null, isSub: true, minutesPlayed };
        }
        return { name: p.name, position: p.position, rating: calcRating(p, true), isSub: true, minutesPlayed };
      });

    return [...starterRatings, ...benchRatings];
  };

  const ratings = generateRatings(homeTeam.isPlayer ? homeTeam : awayTeam);

  // Man of the Match — highest rated player
  let motmName = null;
  if (ratings.length > 0) {
    const validRatings = ratings.filter(r => r.rating !== null);
    if (validRatings.length > 0) {
      const motm = validRatings.reduce((best, r) => r.rating > best.rating ? r : best);
      motmName = motm.name;
      events.push({
        minute: 90, type: "motm",
        text: `⭐ Man of the Match: ${motm.name} (${motm.rating})`,
        flash: true, flashColor: MATCH.FLASH_MOTM,
      });
    }
  }

  // Comeback detection — walk through goals chronologically
  const playerIsHome = homeTeam.isPlayer;
  let runHome = 0, runAway = 0, maxDeficit = 0;
  for (const g of goalEvents) {
    if (g.side === "home") runHome++;
    else runAway++;
    const playerGoals = playerIsHome ? runHome : runAway;
    const oppGoals = playerIsHome ? runAway : runHome;
    const deficit = oppGoals - playerGoals;
    if (deficit > maxDeficit) maxDeficit = deficit;
  }
  const playerFinalGoals = playerIsHome ? homeGoals : awayGoals;
  const oppFinalGoals = playerIsHome ? awayGoals : homeGoals;
  const comeback = maxDeficit >= 2 && playerFinalGoals > oppFinalGoals;

  // Shot counting per side (shot + chance events, keyed by side field set at creation)
  const homeShotsCount = events.filter(e => (e.type === "shot" || e.type === "chance") && e.side === "home").length;
  const awayShotsCount = events.filter(e => (e.type === "shot" || e.type === "chance") && e.side === "away").length;

  // Scorer tracking — count goals per player name per side
  const scorers = {};
  for (const g of goalEvents) {
    if (g.player) {
      const key = `${g.side}|${g.player}`;
      scorers[key] = (scorers[key] || 0) + 1;
    }
  }

  // Assister tracking — count assists per player name per side
  const assisters = {};
  for (const g of goalEvents) {
    if (g.assister) {
      const key = `${g.side}|${g.assister}`;
      assisters[key] = (assisters[key] || 0) + 1;
    }
  }

  // Commentary event count (for snoozefest)
  const totalCommentaryEvents = events.filter(e =>
    e.type !== "goal" && e.type !== "halftime" && e.type !== "fulltime" &&
    e.type !== "motm" && e.type !== "substitution"
  ).length;

  // Detect GK scorer for player team
  let gkScored = false;
  if (playerTeamRef && playerStartingXI) {
    const gkPlayers = playerTeamRef.squad.filter(p => playerStartingXI.includes(p.id) && p.position === "GK");
    const playerSide = homeTeam.isPlayer ? "home" : "away";
    for (const g of goalEvents) {
      if (g.side === playerSide && gkPlayers.some(gk => gk.name === g.player)) {
        gkScored = true;
        break;
      }
    }
  }

  // Detect super sub — a subbed-on player scored for player's team
  let superSub = false;
  if (playerTeamRef) {
    const playerSide = homeTeam.isPlayer ? "home" : "away";
    const playerSubsOn = subbedOnByTeam[playerTeamRef.name] || [];
    const subOnSet = new Set(playerSubsOn);
    for (const g of goalEvents) {
      if (g.side === playerSide && g.player && subOnSet.has(g.player)) {
        superSub = true;
        break;
      }
    }
  }

  // Half-time score (goals up to and including minute 45)
  let htHome = 0, htAway = 0;
  for (const g of goalEvents) {
    if (g.minute <= 45) {
      if (g.side === "home") htHome++;
      else htAway++;
    }
  }

  // Player substitution stats
  const playerTeamName = playerTeamRef?.name;
  const playerSubsMade = playerTeamName ? (subbedOnByTeam[playerTeamName]?.length || 0) : 0;
  const playerSubMinuteValues = playerTeamName ? Object.values(subMinutes[playerTeamName] || {}) : [];
  const earliestPlayerSub = playerSubMinuteValues.length > 0 ? Math.min(...playerSubMinuteValues) : null;

  return {
    homeGoals, awayGoals,
    events,
    playerRatings: ratings,
    isPlayerHome: homeTeam.isPlayer,
    comeback,
    homeShots: homeShotsCount,
    awayShots: awayShotsCount,
    scorers,
    assisters,
    motmName,
    commentaryCount: totalCommentaryEvents,
    outfieldInGoal,
    injuredStarters,
    gkScored,
    superSub,
    redCards,
    playerSubsMade,
    earliestPlayerSub,
    halfTimeScore: { home: htHome, away: htAway },
  };
}

export function generatePenaltyShootout(homeTeam, awayTeam, events, playerStartingXI, playerBench, modifiers = {}) {
  // Determine who's on the pitch after substitutions
  const getActivePlayers = (team) => {
    const squad = team.squad || [];
    // Parse sub events for this team to find who came on/off
    const subbedOff = new Set();
    const subbedOn = new Set();
    if (events) {
      events.filter(e => e.type === "sub" && e.text?.includes(team.name)).forEach(e => {
        const match = e.text.match(/:\s*(.+?)\s+replaces\s+(.+)$/);
        if (match) {
          subbedOn.add(match[1].trim());
          subbedOff.add(match[2].trim());
        }
      });
    }

    let starters, benchPlayers;
    if (team.isPlayer && playerStartingXI) {
      // Use the actual starting XI and bench for the player's team
      starters = playerStartingXI.map(id => squad.find(p => p.id === id)).filter(Boolean);
      benchPlayers = playerBench ? playerBench.map(id => squad.find(p => p.id === id)).filter(Boolean) : [];
    } else {
      // AI teams: use isBench flag
      starters = squad.filter(p => !p.isBench);
      benchPlayers = squad.filter(p => p.isBench);
    }

    // Final on-pitch: starters minus subbed off, plus subbed on from bench
    const onPitch = [];
    starters.forEach(p => {
      if (!subbedOff.has(p.name)) onPitch.push(p);
    });
    benchPlayers.forEach(p => {
      if (subbedOn.has(p.name)) onPitch.push(p);
    });

    // Exclude GK from penalty takers
    const outfield = onPitch.filter(p => p.position !== "GK");
    return outfield.length > 0 ? outfield : [{ name: `${team.name} Player`, position: "CM" }];
  };

  const homePlayers = getActivePlayers(homeTeam);
  const awayPlayers = getActivePlayers(awayTeam);

  const kicks = [];
  let homeScore = 0;
  let awayScore = 0;

  const getShooter = (players, idx) => {
    // Cycle through available players, prioritising attackers/midfielders first
    const sorted = [...players].sort((a, b) => {
      const order = { ST: 0, AM: 1, RW: 2, LW: 3, CM: 4, RB: 5, LB: 6, CB: 7 };
      return (order[a.position] ?? 5) - (order[b.position] ?? 5);
    });
    return sorted[idx % sorted.length]?.name || `Player ${idx + 1}`;
  };

  const penRate = MATCH.PEN_RATE - (modifiers.penaltyConversionNerf || 0);

  // First 5 rounds
  for (let i = 0; i < 5; i++) {
    const homeShooter = getShooter(homePlayers, i);
    const homeScored = Math.random() < penRate;
    if (homeScored) homeScore++;
    kicks.push({ round: i + 1, side: "home", player: homeShooter, scored: homeScored });

    const awayKicksLeft = 5 - i;
    if (homeScore > awayScore + awayKicksLeft) break;

    const awayShooter = getShooter(awayPlayers, i);
    const awayScored = Math.random() < penRate;
    if (awayScored) awayScore++;
    kicks.push({ round: i + 1, side: "away", player: awayShooter, scored: awayScored });

    const homeKicksLeft = 4 - i;
    if (awayScore > homeScore + homeKicksLeft) break;
  }

  // Sudden death if still level
  let sdRound = 6;
  while (homeScore === awayScore && sdRound < MATCH.PEN_MAX_ROUNDS) {
    const hShooter = getShooter(homePlayers, sdRound - 1);
    const hScored = Math.random() < (MATCH.PEN_SUDDEN_RATE - (modifiers.penaltyConversionNerf || 0));
    if (hScored) homeScore++;
    kicks.push({ round: sdRound, side: "home", player: hShooter, scored: hScored, suddenDeath: true });

    const aShooter = getShooter(awayPlayers, sdRound - 1);
    const aScored = Math.random() < (MATCH.PEN_SUDDEN_RATE - (modifiers.penaltyConversionNerf || 0));
    if (aScored) awayScore++;
    kicks.push({ round: sdRound, side: "away", player: aShooter, scored: aScored, suddenDeath: true });

    if (homeScore !== awayScore) break;
    sdRound++;
  }

  return { kicks, homeScore, awayScore, winner: homeScore > awayScore ? "home" : "away" };
}

export function simulateMatchweek(league, matchweekIndex, playerSquad, startingXI, bench, formation, slotAssignments, twelfthManBoost, talismanId, fanSentimentMod = 0, modifiers = {}) {
  if (matchweekIndex >= league.fixtures.length) return null;
  const week = league.fixtures[matchweekIndex];
  const results = [];

  // Update player team squad reference (skip if no player squad — AI-only league)
  const teams = playerSquad
    ? league.teams.map((t, i) => i === 0 ? { ...t, squad: playerSquad } : t)
    : league.teams;

  // Compute OOP penalty once for the player team
  const oopMult = formation ? getTeamOOPMultiplier(startingXI, formation, playerSquad, slotAssignments) : 1.0;

  for (const fixture of week) {
    // 12th Man boost only applies when player team (index 0) is home
    const fixtureBoost = (fixture.home === 0 && twelfthManBoost) ? twelfthManBoost : 0;
    // Fan sentiment only applies when player team is home
    const fixtureFanMod = fixture.home === 0 ? fanSentimentMod : 0;
    const result = simulateMatch(teams[fixture.home], teams[fixture.away], startingXI, bench, false, oopMult, fixtureBoost, talismanId, fixtureFanMod, modifiers);
    results.push({ ...fixture, ...result });

    // Update table
    const homeRow = league.table.find(r => r.teamIndex === fixture.home);
    const awayRow = league.table.find(r => r.teamIndex === fixture.away);
    homeRow.played++;
    awayRow.played++;
    homeRow.goalsFor += result.homeGoals;
    homeRow.goalsAgainst += result.awayGoals;
    awayRow.goalsFor += result.awayGoals;
    awayRow.goalsAgainst += result.homeGoals;

    if (result.homeGoals > result.awayGoals) {
      homeRow.won++; homeRow.points += 3;
      awayRow.lost++;
    } else if (result.homeGoals < result.awayGoals) {
      awayRow.won++; awayRow.points += 3;
      homeRow.lost++;
    } else {
      homeRow.drawn++; awayRow.drawn++;
      // Intergalactic Elite: asymmetric draw points (player gets 1, AI gets 2)
      const isHomePlayer = teams[fixture.home]?.isPlayer;
      const isAwayPlayer = teams[fixture.away]?.isPlayer;
      if (modifiers.drawPointsPlayer != null && (isHomePlayer || isAwayPlayer)) {
        homeRow.points += isHomePlayer ? modifiers.drawPointsPlayer : (modifiers.drawPointsAI || 1);
        awayRow.points += isAwayPlayer ? modifiers.drawPointsPlayer : (modifiers.drawPointsAI || 1);
      } else {
        homeRow.points += 1;
        awayRow.points += 1;
      }
    }
  }

  return results;
}
