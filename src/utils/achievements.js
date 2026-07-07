import { ATTRIBUTES } from "../data/training.js";
import { STARTING_XI_POSITIONS, POSITION_TYPES } from "../data/positions.js";
import { DEFAULT_FORMATION } from "../data/formations.js";
import { ACHIEVEMENTS, UNLOCKABLE_PLAYERS } from "../data/achievements.js";
import { getOverall } from "../utils/calc.js";
import { getFormationPositions, getEffectiveSlots } from "../utils/formation.js";
import { sortStandings } from "../utils/league.js";
import { getFirstName, getLastName } from "../utils/player.js";
import { findCareerKey } from "./careerLedger.js";
import { isRival } from "./rivalries.js";

export function createUnlockablePlayer(unlockDef, joinedSeason, ovrCap = 20) {
  // capBonus: player's attrs can exceed the normal ovrCap by this amount (e.g. Trask Ulgo)
  const playerCap = ovrCap + (unlockDef.capBonus || 0);
  // Scale attrs proportionally to prestige cap (base defs are for cap 20)
  const scale = ovrCap / 20;
  const attrs = {};
  ATTRIBUTES.forEach(({ key }) => {
    attrs[key] = Math.max(1, Math.min(playerCap, Math.round((unlockDef.attrs[key] || 0) * scale)));
  });
  const initialSnapshot = {};
  ATTRIBUTES.forEach(({ key }) => { initialSnapshot[key] = attrs[key]; });
  return {
    id: `unlockable_${unlockDef.id}`,
    name: unlockDef.name,
    position: unlockDef.position,
    age: unlockDef.age,
    attrs,
    statProgress: {},
    training: "balanced",
    potential: playerCap,
    injury: null,
    isUnlockable: true,
    unlockableJoinedSeason: joinedSeason || 1,
    history: [initialSnapshot],
    gains: {},
    nationality: unlockDef.nationality || "ENG",
    ...(unlockDef.learnedPositions ? { learnedPositions: [...unlockDef.learnedPositions] } : {}),
    ...(unlockDef.capBonus ? { legendCap: playerCap } : {}),
    ...(unlockDef.flavour ? { flavour: unlockDef.flavour } : {}),
  };
}

// One unlock source, one add path: an unlockable player is "due" for the
// pending-consent reveal when its linked achievement is in unlockedAchievements
// (or, for the two secret team-name unlocks, the current team name matches)
// and it isn't already in the squad. Re-derived fresh on every load so a save
// captured mid-reveal (or from before the consent flow existed) can't lose
// the unlock — it just gets offered again instead of silently added.
export function deriveMissingPlayerUnlocks({ unlockedAchievements, squad, teamName }) {
  const currentSquadIds = new Set((squad || []).map(p => p.id));
  const missing = [];
  for (const unlock of UNLOCKABLE_PLAYERS) {
    if (!unlock.attrs) continue;
    const unlockId = `unlockable_${unlock.id}`;
    if (currentSquadIds.has(unlockId)) continue;
    if (unlock.unlockType === "teamName") {
      if (!teamName || !unlock.unlockValue) continue;
      const matches = [].concat(unlock.unlockValue).some(v => teamName.toLowerCase().includes(v.toLowerCase()));
      if (matches) missing.push(unlock);
    } else if (unlock.achievementId) {
      if (unlockedAchievements?.has(unlock.achievementId)) missing.push(unlock);
    }
  }
  return missing;
}

export function checkAchievements(state) {
  const { squad, unlocked, lastMatchResult, league, weekGains, startingXI, bench, matchweekIndex,
    seasonCards, totalGains, totalMatches, seasonCleanSheets, seasonGoalsFor, seasonDraws,
    consecutiveUnbeaten, consecutiveLosses, consecutiveWins, prevStartingXI, motmTracker, stScoredConsecutive,
    playerRatingTracker, beatenTeams, halfwayPosition, seasonHomeUnbeaten, seasonAwayWins, seasonAwayGames,
    leagueWins, wasAlwaysFast, recoveries, recentScorelines, secondPlaceFinishes,
    playerInjuryCount, benchStreaks, highScoringMatches, trialHistory,
    playerSeasonStats, clubHistory, consecutiveScoreless, formation: stateFormation, slotAssignments: stateSlotAssignments,
    manualSlotIndices,
    usedTicketTypes, formationsWonWith, freeAgentSignings, scoutedPlayers, transferFocus, clubRelationships,
    isOnHoliday, wonLeagueOnHoliday, holidayMatchesThisSeason, doubleTrainingWeek, testimonialPlayer,
    seasonNumber, lastSeasonPosition,
    shortlist, wasAlwaysNormal, fastMatchesThisSeason, twelfthManActive, gkCleanSheets,
    totalShortlisted } = state;
  const newUnlocks = [];

  // Training-based
  if (!unlocked.has("first_gain") && weekGains?.improvements?.length > 0) newUnlocks.push("first_gain");
  if (!unlocked.has("duo_boost") && weekGains?.duos?.length > 0) newUnlocks.push("duo_boost");
  if (!unlocked.has("stat_15")) {
    for (const p of squad) {
      if (ATTRIBUTES.some(a => p.attrs[a.key] >= 15)) { newUnlocks.push("stat_15"); break; }
    }
  }
  if (!unlocked.has("stat_20")) {
    for (const p of squad) {
      if (ATTRIBUTES.some(a => p.attrs[a.key] >= 20)) { newUnlocks.push("stat_20"); break; }
    }
  }

  // Centurion
  if (!unlocked.has("centurion") && totalGains >= 100) newUnlocks.push("centurion");

  // Journeyman
  if (!unlocked.has("journeyman") && totalMatches >= 50) newUnlocks.push("journeyman");

  // Maxed Out — any player with all 7 attrs at 20
  if (!unlocked.has("maxed_out")) {
    for (const p of squad) {
      if (ATTRIBUTES.every(a => p.attrs[a.key] >= 20)) { newUnlocks.push("maxed_out"); break; }
    }
  }

  // Binary — any player with all 7 attrs at exactly 10
  if (!unlocked.has("binary")) {
    for (const p of squad) {
      if (ATTRIBUTES.every(a => p.attrs[a.key] === 10)) { newUnlocks.push("binary"); break; }
    }
  }

  // Golden Generation — 5 squad players with OVR 18+
  if (!unlocked.has("golden_gen") && squad.filter(p => getOverall(p) >= 18).length >= 5) newUnlocks.push("golden_gen");

  // Our Academy — player under 21 with 3+ stats at 18
  if (!unlocked.has("our_academy")) {
    for (const p of squad) {
      if (p.age < 21 && ATTRIBUTES.filter(a => p.attrs[a.key] >= 18).length >= 3) {
        newUnlocks.push("our_academy"); break;
      }
    }
  }

  // Odds Are Even — player with all 7 attrs the same
  if (!unlocked.has("odds_are_even")) {
    for (const p of squad) {
      const vals = ATTRIBUTES.map(a => p.attrs[a.key]);
      if (vals.every(v => v === vals[0])) { newUnlocks.push("odds_are_even"); break; }
    }
  }

  // The Specialist — 20 in one stat, under 5 in another
  if (!unlocked.has("the_specialist")) {
    for (const p of squad) {
      const has20 = ATTRIBUTES.some(a => p.attrs[a.key] >= 20);
      const hasUnder5 = ATTRIBUTES.some(a => p.attrs[a.key] < 5);
      if (has20 && hasUnder5) { newUnlocks.push("the_specialist"); break; }
    }
  }

  // Training focus mass achievements
  if (startingXI && squad) {
    const xiPlayers = startingXI.map(id => squad.find(p => p.id === id)).filter(Boolean);
    const trainingCounts = {};
    xiPlayers.forEach(p => {
      if (p.training) trainingCounts[p.training] = (trainingCounts[p.training] || 0) + 1;
    });
    if (!unlocked.has("only_fans") && (trainingCounts["technique"] || 0) >= 8) newUnlocks.push("only_fans");
    if (!unlocked.has("npc") && (trainingCounts["balanced"] || 0) >= 8) newUnlocks.push("npc");
    if (!unlocked.has("finish_food") && (trainingCounts["shooting"] || 0) >= 8) newUnlocks.push("finish_food");
    if (!unlocked.has("gym_rats") && (trainingCounts["physical"] || 0) >= 8) newUnlocks.push("gym_rats");
    if (!unlocked.has("speed_freaks") && (trainingCounts["pace"] || 0) >= 8) newUnlocks.push("speed_freaks");

    // Double Pivot — two CMs training Defensive Work
    if (!unlocked.has("double_pivot")) {
      const cms = xiPlayers.filter(p => p.position === "CM" && p.training === "defending");
      if (cms.length >= 2) newUnlocks.push("double_pivot");
    }

    // Tinkerer — manually changed training on every player this week
    // (manualTrainingThisWeek only grows via the single-player assign path —
    // bulk delegate-to-assistant / TRAIN ALL never touch it)
    if (!unlocked.has("tinkerer") && state.manualTrainingThisWeek && state.manualTrainingThisWeek.size >= squad.length) newUnlocks.push("tinkerer");

    // Peak Performance — all XI have OVR 15+
    if (!unlocked.has("peak_perf") && xiPlayers.length === 11 && xiPlayers.every(p => getOverall(p) >= 15)) {
      newUnlocks.push("peak_perf");
    }

    // Rising Tide — Starting XI average OVR reaches 15
    if (!unlocked.has("rising_tide") && xiPlayers.length === 11) {
      const avgOvr = xiPlayers.reduce((s, p) => s + getOverall(p), 0) / 11;
      if (avgOvr >= 15) newUnlocks.push("rising_tide");
    }

    // Well Seasoned — avg age over 30
    if (!unlocked.has("well_seasoned") && xiPlayers.length === 11) {
      const avgAge = xiPlayers.reduce((s, p) => s + p.age, 0) / 11;
      if (avgAge > 30) newUnlocks.push("well_seasoned");
    }

    // Baby Faced — avg age under 20
    if (!unlocked.has("baby_faced") && xiPlayers.length === 11) {
      const avgAge = xiPlayers.reduce((s, p) => s + p.age, 0) / 11;
      if (avgAge < 20) newUnlocks.push("baby_faced");
    }

    // Start A Family — 3 starters same surname
    if (!unlocked.has("family")) {
      const surnames = xiPlayers.map(p => p.name.split(" ").pop());
      const surnameCounts = {};
      surnames.forEach(s => surnameCounts[s] = (surnameCounts[s] || 0) + 1);
      if (Object.values(surnameCounts).some(c => c >= 3)) newUnlocks.push("family");
    }
  }

  // Match-based checks
  if (lastMatchResult && league) {
    const homeTeam = league.teams[lastMatchResult.home];
    const awayTeam = league.teams[lastMatchResult.away];
    const playerIsHome = homeTeam?.isPlayer;
    const playerGoals = playerIsHome ? lastMatchResult.homeGoals : lastMatchResult.awayGoals;
    const oppGoals = playerIsHome ? lastMatchResult.awayGoals : lastMatchResult.homeGoals;
    const playerWon = playerGoals > oppGoals;
    const isDraw = playerGoals === oppGoals;
    const playerLost = oppGoals > playerGoals;
    const oppTeam = playerIsHome ? awayTeam : homeTeam;

    if (!unlocked.has("first_win") && playerWon) newUnlocks.push("first_win");
    if (!unlocked.has("clean_sheet") && oppGoals === 0) newUnlocks.push("clean_sheet");
    if (!unlocked.has("bore_draw") && isDraw && playerGoals === 0) newUnlocks.push("bore_draw");
    if (!unlocked.has("score_draw") && isDraw && playerGoals >= 3 && oppGoals >= 3) newUnlocks.push("score_draw");
    if (!unlocked.has("total_football") && playerWon && playerGoals - oppGoals >= 5) newUnlocks.push("total_football");
    if (!unlocked.has("early_exits") && playerLost && oppGoals - playerGoals >= 3) newUnlocks.push("early_exits");
    if (!unlocked.has("comeback") && lastMatchResult.comeback) newUnlocks.push("comeback");

    // Giant Killing — beat Albion
    if (!unlocked.has("giant_killing") && playerWon && oppTeam?.name === "Albion") newUnlocks.push("giant_killing");

    // The Impossible Job — lose to Nomads
    if (!unlocked.has("impossible_job") && playerLost && oppTeam?.name === "Nomads") newUnlocks.push("impossible_job");

    // Smash & Grab — win 1-0 vs current league leaders
    if (!unlocked.has("smash_grab") && playerWon && playerGoals === 1 && oppGoals === 0) {
      const sorted = sortStandings(league.table);
      if (sorted[0] && league.teams[sorted[0].teamIndex]?.name === oppTeam?.name) newUnlocks.push("smash_grab");
    }

    // All Or Nothing — empty bench
    if (!unlocked.has("all_or_nothing") && bench && bench.length === 0) newUnlocks.push("all_or_nothing");

    // Fergie Time — win with a goal at 89 or 90
    if (!unlocked.has("fergie_time") && playerWon && lastMatchResult.events) {
      const side = playerIsHome ? "home" : "away";
      if (lastMatchResult.events.some(e => e.type === "goal" && e.side === side && e.minute >= 89)) newUnlocks.push("fergie_time");
    }

    // Clinical — win with fewer shots than opponent
    if (!unlocked.has("clinical") && playerWon) {
      const playerShots = playerIsHome ? lastMatchResult.homeShots : lastMatchResult.awayShots;
      const oppShots = playerIsHome ? lastMatchResult.awayShots : lastMatchResult.homeShots;
      if (oppShots > playerShots) newUnlocks.push("clinical");
    }

    // Snoozefest — 0-0 with fewer than 10 commentary events
    if (!unlocked.has("snoozefest") && playerGoals === 0 && oppGoals === 0 && lastMatchResult.commentaryCount <= 19) {
      newUnlocks.push("snoozefest");
    }

    // Dirty Harry — 3+ cards for player team
    if (!unlocked.has("dirty_harry") && lastMatchResult.events) {
      const playerTeamName = playerIsHome ? homeTeam?.name : awayTeam?.name;
      const teamCards = lastMatchResult.events.filter(e => (e.type === "card" || e.type === "red_card") && e.cardTeamName === playerTeamName).length;
      if (teamCards >= 3) newUnlocks.push("dirty_harry");
    }

    // No Comment — entire match at fast speed
    if (!unlocked.has("no_comment") && wasAlwaysFast) newUnlocks.push("no_comment");

    // Emergency Backup — outfield player in goal
    if (!unlocked.has("emergency_gk") && lastMatchResult.outfieldInGoal) newUnlocks.push("emergency_gk");

    // Safe Hands — clean sheet with outfield player in goal
    if (!unlocked.has("safe_hands") && lastMatchResult.outfieldInGoal && oppGoals === 0) newUnlocks.push("safe_hands");

    // Up For A Corner — GK scores
    if (!unlocked.has("up_for_a_corner") && lastMatchResult.gkScored) newUnlocks.push("up_for_a_corner");

    // Super Sub — a substituted-on player scored
    if (!unlocked.has("super_sub") && lastMatchResult.superSub) newUnlocks.push("super_sub");

    // Injections — played injured player
    if (!unlocked.has("injections") && lastMatchResult.injuredStarters && lastMatchResult.injuredStarters.length > 0) newUnlocks.push("injections");

    // Brace Yourself — injured player scores a brace
    if (!unlocked.has("brace_yourself") && lastMatchResult.injuredStarters?.length > 0 && lastMatchResult.scorers) {
      const side = playerIsHome ? "home" : "away";
      const injuredNames = new Set(lastMatchResult.injuredStarters.map(p => p.name));
      for (const [key, count] of Object.entries(lastMatchResult.scorers)) {
        if (key.startsWith(side) && count >= 2) {
          const scorerName = key.split("|")[1];
          if (injuredNames.has(scorerName)) { newUnlocks.push("brace_yourself"); break; }
        }
      }
    }

    // Asymmetry — win with unbalanced wing positions
    if (!unlocked.has("asymmetry") && playerWon && startingXI && squad) {
      const xiPlayers = startingXI.map(id => squad.find(p => p.id === id)).filter(Boolean);
      const lbCount = xiPlayers.filter(p => p.position === "LB").length;
      const rbCount = xiPlayers.filter(p => p.position === "RB").length;
      const lwCount = xiPlayers.filter(p => p.position === "LW").length;
      const rwCount = xiPlayers.filter(p => p.position === "RW").length;
      const hasWingPair = (lbCount + rbCount > 0) || (lwCount + rwCount > 0);
      if (hasWingPair && (lbCount !== rbCount || lwCount !== rwCount)) {
        newUnlocks.push("asymmetry");
      }
    }

    // Hat-trick / Nominative Determinism
    if (lastMatchResult.scorers) {
      const side = playerIsHome ? "home" : "away";
      for (const [key, count] of Object.entries(lastMatchResult.scorers)) {
        if (key.startsWith(side) && count >= 3) {
          const playerName = key.split("|")[1];
          if (!unlocked.has("hat_trick")) newUnlocks.push("hat_trick");
          if (count >= 4 && !unlocked.has("all_four_of_them")) newUnlocks.push("all_four_of_them");
          if (!unlocked.has("nomin_determ")) {
            const surname = playerName.split(" ").pop().toLowerCase();
            if (["baker", "cook", "king"].includes(surname)) newUnlocks.push("nomin_determ");
          }
        }
      }
    }

    // Enzo And Drive
    if (!unlocked.has("enzo_drive") && playerWon && lastMatchResult.events) {
      const playerSide = playerIsHome ? "home" : "away";
      const enzoLateGoal = lastMatchResult.events.some(evt =>
        evt.type === "goal" && evt.side === playerSide && evt.minute >= 81 &&
        evt.player && evt.player.toLowerCase().includes("enzo")
      );
      if (enzoLateGoal) newUnlocks.push("enzo_drive");
    }

    // Mixed Up — a striker/forward on Defensive Work scores in a winning match
    if (!unlocked.has("mixed_up") && playerWon && lastMatchResult.events && squad) {
      const playerSide = lastMatchResult.isPlayerHome != null
        ? (lastMatchResult.isPlayerHome ? "home" : "away")
        : (playerIsHome ? "home" : "away");
      const forwardPositions = ["ST", "LW", "RW"];
      const defWorkForwards = squad
        .filter(p => p.training === "defending" && forwardPositions.includes(p.position))
        .map(p => p.name);
      if (defWorkForwards.length > 0) {
        const scoredGoal = lastMatchResult.events.some(e =>
          e.type === "goal" && e.side === playerSide && e.player && defWorkForwards.includes(e.player)
        );
        if (scoredGoal) {
          newUnlocks.push("mixed_up");
        }
      }
    }

    // Who Shot RR? — player returns from injury and scores a brace
    if (!unlocked.has("who_shot_rr") && lastMatchResult?.scorers && recoveries && recoveries.length > 0) {
      const playerSide = playerIsHome ? "home" : "away";
      for (const recoveredName of recoveries) {
        const key = `${playerSide}|${recoveredName}`;
        if (lastMatchResult.scorers[key] && lastMatchResult.scorers[key] >= 2) {
          newUnlocks.push("who_shot_rr");
          break;
        }
      }
    }

    // Out of position
    if (!unlocked.has("out_of_pos") && startingXI && stateFormation) {
      const slotAssign = getEffectiveSlots(startingXI, stateFormation, squad, stateSlotAssignments);
      const formPositions = getFormationPositions(stateFormation);
      for (let i = 0; i < Math.min(slotAssign.length, formPositions.length); i++) {
        const player = slotAssign[i] != null ? squad.find(p => p.id === slotAssign[i]) : null;
        if (player && player.position !== formPositions[i]) { newUnlocks.push("out_of_pos"); break; }
      }
    }

    // Bench best
    if (!unlocked.has("bench_best") && startingXI && bench) {
      const fitPlayers = squad.filter(p => !p.injury);
      if (fitPlayers.length > 0) {
        const best = fitPlayers.reduce((a, b) => getOverall(a) >= getOverall(b) ? a : b);
        if (bench.includes(best.id)) newUnlocks.push("bench_best");
      }
    }

    // Bench Pressed
    if (!unlocked.has("bench_fwd") && playerWon && bench) {
      const benchPlayers = bench.map(id => squad.find(p => p.id === id)).filter(Boolean);
      if (benchPlayers.length > 0 && benchPlayers.every(p => POSITION_TYPES[p.position] === "FWD")) newUnlocks.push("bench_fwd");
    }

    // He's Having A Party
    if (!unlocked.has("old_pace") && startingXI) {
      const xiPlayers = startingXI.map(id => squad.find(p => p.id === id)).filter(Boolean);
      if (xiPlayers.some(p => p.age >= 30 && p.attrs.pace >= 20)) newUnlocks.push("old_pace");
    }

    // For Those Who Come After
    if (!unlocked.has("old_guard") && startingXI) {
      const xiPlayers = startingXI.map(id => squad.find(p => p.id === id)).filter(Boolean);
      if (xiPlayers.filter(p => p.age >= 33).length >= 5) newUnlocks.push("old_guard");
    }

    // Seeing Red
    if (!unlocked.has("seeing_red") && playerWon && lastMatchResult.events) {
      const playerTeamName = playerIsHome ? homeTeam?.name : awayTeam?.name;
      if (lastMatchResult.events.some(evt => evt.type === "red_card" && evt.cardTeamName === playerTeamName)) newUnlocks.push("seeing_red");
    }

    // Déjà Vu — same scoreline 3 consecutive matches
    if (!unlocked.has("deja_vu") && recentScorelines && recentScorelines.length >= 3) {
      const last3 = recentScorelines.slice(-3);
      if (last3.every(s => s[0] === last3[0][0] && s[1] === last3[0][1])) newUnlocks.push("deja_vu");
    }

    // Salt In The Wounds — 4+ goals vs bottom-placed team
    if (!unlocked.has("salt_wounds") && playerGoals >= 4 && league?.table) {
      const sorted = sortStandings(league.table);
      const bottom = sorted[sorted.length - 1];
      if (bottom && league.teams[bottom.teamIndex]?.name === oppTeam?.name) newUnlocks.push("salt_wounds");
    }

    // 6-7 — win with a goal in the 67th minute
    if (!unlocked.has("six_seven") && playerWon && lastMatchResult.events) {
      const side = playerIsHome ? "home" : "away";
      if (lastMatchResult.events.some(e => e.type === "goal" && e.side === side && e.minute === 67)) newUnlocks.push("six_seven");
    }

    // It's A Sign — player scores in minute matching their age
    if (!unlocked.has("its_a_sign") && lastMatchResult.events && squad) {
      const side = playerIsHome ? "home" : "away";
      const goalEvents = lastMatchResult.events.filter(e => e.type === "goal" && e.side === side && e.player);
      for (const g of goalEvents) {
        const p = squad.find(pl => pl.name === g.player);
        if (p && g.minute === p.age) { newUnlocks.push("its_a_sign"); break; }
      }
    }

    // Absolute Barclays — win with 3+ cards AND 5+ total goals
    if (!unlocked.has("absolute_barclays") && playerWon && lastMatchResult.events) {
      const totalGoals = playerGoals + oppGoals;
      const playerTeamName = playerIsHome ? homeTeam?.name : awayTeam?.name;
      const teamCards = lastMatchResult.events.filter(e => (e.type === "card" || e.type === "red_card") && e.cardTeamName === playerTeamName).length;
      if (totalGoals >= 5 && teamCards >= 3) newUnlocks.push("absolute_barclays");
    }

    // Park The Bus — win 1-0 with 5+ defenders in Starting XI (by formation role)
    if (!unlocked.has("park_the_bus") && playerWon && playerGoals === 1 && oppGoals === 0 && startingXI) {
      const formPositions = stateFormation ? getFormationPositions(stateFormation) : [...STARTING_XI_POSITIONS];
      const defCount = formPositions.filter(p => POSITION_TYPES[p] === "DEF").length;
      if (defCount >= 5) newUnlocks.push("park_the_bus");
    }

    // Total Voetbal — win with NO player in their natural position in XI
    if (!unlocked.has("total_voetbal") && playerWon && startingXI) {
      const xiPlayers = startingXI.map(id => squad.find(p => p.id === id)).filter(Boolean);
      if (xiPlayers.length === 11) {
        // Use formation positions if available, otherwise use default
        const formPositions = stateFormation ? getFormationPositions(stateFormation) : [...STARTING_XI_POSITIONS];
        const slotAssign = getEffectiveSlots(startingXI, stateFormation || DEFAULT_FORMATION, squad, stateSlotAssignments);
        let anyInNatural = false;
        for (let i = 0; i < Math.min(slotAssign.length, formPositions.length); i++) {
          const player = slotAssign[i] != null ? squad.find(p => p.id === slotAssign[i]) : null;
          if (player && player.position === formPositions[i]) { anyInNatural = true; break; }
        }
        if (!anyInNatural) newUnlocks.push("total_voetbal");
      }
    }

    // Worth The Wait — unlockable player is MotM on debut
    if (!unlocked.has("worth_the_wait") && lastMatchResult.motmName && squad && playerSeasonStats) {
      const motmP = squad.find(p => p.name === lastMatchResult.motmName);
      if (motmP && motmP.isUnlockable) {
        const currentApps = playerSeasonStats[motmP.name]?.apps || 0;
        const cKey = findCareerKey(clubHistory?.playerCareers, { playerId: motmP.id, name: motmP.name });
        const careerApps = (cKey ? clubHistory?.playerCareers?.[cKey]?.apps : 0) || 0;
        if (currentApps === 0 && careerApps === 0) newUnlocks.push("worth_the_wait");
      }
    }

    // Dad's Army — win with 10+ year age gap between oldest and youngest non-unlockable starter
    if (!unlocked.has("dads_army") && playerWon && startingXI) {
      const xiPlayers = startingXI.map(id => squad.find(p => p.id === id)).filter(p => p && !p.isUnlockable);
      if (xiPlayers.length >= 2) {
        const ages = xiPlayers.map(p => p.age);
        if (Math.max(...ages) - Math.min(...ages) >= 10) newUnlocks.push("dads_army");
      }
    }

    // MotM achievements
    if (lastMatchResult.playerRatings?.length > 0) {
      const validRatings = lastMatchResult.playerRatings.filter(r => r.rating !== null);
      if (validRatings.length > 0) {
        const motm = validRatings.reduce((best, r) => r.rating > best.rating ? r : best);
        if (!unlocked.has("slim_motm") && motm.rating < 7.0) newUnlocks.push("slim_motm");
        if (!unlocked.has("perfect_motm") && motm.rating >= 10.0) newUnlocks.push("perfect_motm");

        // Hand Of God — win 1-0 with GK as MotM
        if (!unlocked.has("hand_of_god") && playerWon && playerGoals === 1 && oppGoals === 0 && lastMatchResult.motmName) {
          const motmP = squad.find(p => p.name === lastMatchResult.motmName);
          if (motmP && motmP.position === "GK") newUnlocks.push("hand_of_god");
        }

        // Wonderkid — MotM under 19
        if (!unlocked.has("wonderkid") && lastMatchResult.motmName) {
          const motmPlayer = squad.find(p => p.name === lastMatchResult.motmName);
          if (motmPlayer && motmPlayer.age < 19) newUnlocks.push("wonderkid");
        }

        // Captain Material — tracked externally via motmTracker
        if (!unlocked.has("captain_material") && motmTracker) {
          if (Object.values(motmTracker).some(c => c >= 3)) newUnlocks.push("captain_material");
        }

        // Mr. Consistent
        if (!unlocked.has("mr_consistent") && playerRatingTracker) {
          for (const counts of Object.values(playerRatingTracker)) {
            if (counts.filter(r => r === 7.0).length >= 3) { newUnlocks.push("mr_consistent"); break; }
          }
        }

        // Bayda — midfielder with 8.5+ average rating in a game without scoring
        if (!unlocked.has("bayda") && squad) {
          const playerSide = playerIsHome ? "home" : "away";
          const midPositions = ["CM", "AM"];
          const midfielders = squad.filter(p => midPositions.includes(p.position));
          const scorerNames = new Set();
          if (lastMatchResult.events) {
            lastMatchResult.events.forEach(e => {
              if (e.type === "goal" && e.side === playerSide && e.player) scorerNames.add(e.player);
            });
          }
          for (const pr of validRatings) {
            if (pr.rating >= 8.5 && midfielders.some(m => m.name === pr.name) && !scorerNames.has(pr.name)) {
              newUnlocks.push("bayda");
              break;
            }
          }
        }
      }
    }

    // Rotation Policy — different XI from last match
    if (!unlocked.has("rotation") && prevStartingXI && startingXI && prevStartingXI.length === 11) {
      const prevSet = new Set(prevStartingXI);
      const currSet = new Set(startingXI);
      const different = [...currSet].filter(id => !prevSet.has(id)).length;
      if (different >= 4) newUnlocks.push("rotation");
    }

    // Consecutive tracking
    if (!unlocked.has("unbeaten_10") && consecutiveUnbeaten >= 10) newUnlocks.push("unbeaten_10");
    if (!unlocked.has("vote_confidence") && consecutiveLosses >= 5) newUnlocks.push("vote_confidence");
    if (!unlocked.has("fox_box") && stScoredConsecutive >= 5) newUnlocks.push("fox_box");
    if (!unlocked.has("manager_month") && consecutiveWins >= 4) newUnlocks.push("manager_month");

    // Benchwarmer — same player on bench for 10 consecutive matchdays
    if (!unlocked.has("benchwarmer") && benchStreaks) {
      if (Object.values(benchStreaks).some(c => c >= 10)) newUnlocks.push("benchwarmer");
    }

    // Heavy Metal Football — 3 matches in a season with 5+ total goals
    if (!unlocked.has("heavy_metal") && highScoringMatches >= 3) newUnlocks.push("heavy_metal");

    // Injury Prone — same player injured 3 times in a season
    if (!unlocked.has("injury_prone") && playerInjuryCount) {
      if (Object.values(playerInjuryCount).some(c => c >= 3)) newUnlocks.push("injury_prone");
    }

    // Season-end checks
    const totalFixtures = league.fixtures?.length || 18;
    if (matchweekIndex >= totalFixtures) {
      const sorted = [...league.table].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.goalsFor - a.goalsAgainst;
        const gdB = b.goalsFor - b.goalsAgainst;
        if (gdB !== gdA) return gdB - gdA;
        return b.goalsFor - a.goalsFor;
      });
      const playerIdx = sorted.findIndex(r => league.teams[r.teamIndex]?.isPlayer);
      const playerRow = sorted[playerIdx];
      const isFirst = playerIdx === 0;

      if (!unlocked.has("champion") && isFirst) newUnlocks.push("champion");
      if (!unlocked.has("invincibles") && isFirst && playerRow?.lost === 0) newUnlocks.push("invincibles");
      if (!unlocked.has("centurions") && isFirst && playerRow?.lost === 0 && playerRow?.drawn === 0) newUnlocks.push("centurions");

      // Kolo Kolo — won the league with an ex-trial defender in the squad
      if (!unlocked.has("kolo_kolo") && isFirst && trialHistory && trialHistory.length > 0) {
        const defPositions = new Set(["CB", "LB", "RB"]);
        const impressedTrialNames = trialHistory.filter(t => t.impressed && defPositions.has(t.position)).map(t => t.name);
        if (impressedTrialNames.length > 0 && squad.some(p => impressedTrialNames.includes(p.name))) {
          newUnlocks.push("kolo_kolo");
        }
      }
      if (!unlocked.has("no_cards") && (seasonCards || 0) === 0) newUnlocks.push("no_cards");
      if (!unlocked.has("mid_table") && playerIdx === 4) newUnlocks.push("mid_table");
      if (!unlocked.has("dynasty") && leagueWins >= 3) newUnlocks.push("dynasty");
      if (!unlocked.has("clean_5") && seasonCleanSheets >= 5) newUnlocks.push("clean_5");
      if (!unlocked.has("goals_50") && seasonGoalsFor >= 50) newUnlocks.push("goals_50");
      if (!unlocked.has("no_cutting") && seasonDraws >= 5) newUnlocks.push("no_cutting");
      if (!unlocked.has("fortress") && seasonHomeUnbeaten) newUnlocks.push("fortress");
      if (!unlocked.has("on_the_road") && seasonAwayWins >= 5) newUnlocks.push("on_the_road");
      // Forest Hills: 5 away wins in tier 7 unlocks Koji Yamamoto
      if (!unlocked.has("forest_hills_conqueror") && league?.tier === 7 && seasonAwayWins >= 5) newUnlocks.push("forest_hills_conqueror");
      if (!unlocked.has("respect_badge") && beatenTeams && beatenTeams.size >= 9) newUnlocks.push("respect_badge");

      // Squeaky Bum Time — win by 1 point
      if (!unlocked.has("squeaky") && isFirst && sorted.length > 1) {
        if (playerRow.points - sorted[1].points === 1) newUnlocks.push("squeaky");
      }

      // Great Escape — 10th at halfway, finish 8th or better
      if (!unlocked.has("great_escape") && halfwayPosition >= 10 && playerIdx <= 7) newUnlocks.push("great_escape");

      // Always The Bridesmaid — finish 2nd three times
      if (!unlocked.has("always_bridesmaid") && playerIdx === 1) {
        // playerIdx === 1 means 2nd place (0-indexed). Prior finishes + this one
        if ((secondPlaceFinishes || 0) + 1 >= 3) newUnlocks.push("always_bridesmaid");
      }

      // Away Day Merchants — win every away match in a season
      if (!unlocked.has("away_day_merchants") && (seasonAwayGames || 0) > 0 && seasonAwayWins === seasonAwayGames) {
        newUnlocks.push("away_day_merchants");
      }
    }

    // Taxi For... — player team gets a red card
    if (!unlocked.has("taxi_for") && lastMatchResult.redCards?.length > 0) {
      const playerTeamName = playerIsHome ? homeTeam?.name : awayTeam?.name;
      if (lastMatchResult.redCards.some(r => r.teamName === playerTeamName)) newUnlocks.push("taxi_for");
    }

    // Absolute Cinema — win a match where opposition scored 3+
    if (!unlocked.has("absolute_cinema") && playerWon && oppGoals >= 3) newUnlocks.push("absolute_cinema");

    // Heads Up — win having trailed at half-time
    if (!unlocked.has("heads_up") && playerWon && lastMatchResult.halfTimeScore) {
      const htHome = lastMatchResult.halfTimeScore.home;
      const htAway = lastMatchResult.halfTimeScore.away;
      const playerTrailedAtHT = playerIsHome ? htHome < htAway : htAway < htHome;
      if (playerTrailedAtHT) newUnlocks.push("heads_up");
    }

    // Fresh Legs — use all 5 substitutions
    if (!unlocked.has("fresh_legs") && (lastMatchResult.playerSubsMade || 0) >= 5) newUnlocks.push("fresh_legs");

    // He's Changed It — sub before the 30th minute
    if (!unlocked.has("hes_changed_it") && lastMatchResult.earliestPlayerSub != null && lastMatchResult.earliestPlayerSub < 30) {
      newUnlocks.push("hes_changed_it");
    }

    // False Nine — win with no FWD-type starters
    if (!unlocked.has("false_nine") && playerWon && startingXI && stateFormation) {
      const formPositions = getFormationPositions(stateFormation);
      const hasFwd = formPositions.some(p => POSITION_TYPES[p] === "FWD");
      if (!hasFwd) newUnlocks.push("false_nine");
    }

    // Get It In The Mixer — 4+ forwards in Starting XI
    if (!unlocked.has("get_it_in_the_mixer") && startingXI && stateFormation) {
      const formPositions = getFormationPositions(stateFormation);
      const fwdCount = formPositions.filter(p => POSITION_TYPES[p] === "FWD").length;
      if (fwdCount >= 4) newUnlocks.push("get_it_in_the_mixer");
    }

    // Jumpers For Goalposts — win with no players on a training focus
    if (!unlocked.has("jumpers_for_goalposts") && playerWon && startingXI && squad) {
      const xiPlayers = startingXI.map(id => squad.find(p => p.id === id)).filter(Boolean);
      if (xiPlayers.length === 11 && xiPlayers.every(p => !p.training || p.training === null)) {
        newUnlocks.push("jumpers_for_goalposts");
      }
    }

    // What's He Doing On The Bench? — sub is MotM without scoring
    if (!unlocked.has("whats_he_doing") && lastMatchResult.motmName && lastMatchResult.playerRatings?.length > 0) {
      const motmPlayer = squad.find(p => p.name === lastMatchResult.motmName);
      if (motmPlayer) {
        // Check if they were a substitute (not in starting XI)
        const isSubstitute = !startingXI?.includes(motmPlayer.id);
        if (isSubstitute) {
          // Check they didn't score
          const playerSide = playerIsHome ? "home" : "away";
          const didScore = lastMatchResult.events?.some(e => e.type === "goal" && e.side === playerSide && e.player === motmPlayer.name);
          if (!didScore) newUnlocks.push("whats_he_doing");
        }
      }
    }

    // Liquid Football — win with 3+ starters playing in learned positions
    if (!unlocked.has("liquid_football") && playerWon && startingXI && stateFormation && squad) {
      const effectiveSlots = getEffectiveSlots(startingXI, stateFormation, squad, stateSlotAssignments);
      let learnedCount = 0;
      for (let i = 0; i < Math.min(effectiveSlots.length, stateFormation.length); i++) {
        const pid = effectiveSlots[i];
        if (pid == null) continue;
        const player = squad.find(p => p.id === pid);
        if (!player) continue;
        const slotPos = stateFormation[i]?.pos;
        if (slotPos && slotPos !== player.position && player.learnedPositions?.includes(slotPos)) learnedCount++;
      }
      if (learnedCount >= 3) newUnlocks.push("liquid_football");
    }
  }

  // Last Gasp — score in 90th minute to win
  if (lastMatchResult && lastMatchResult.events && !unlocked.has("last_gasp")) {
    const side = lastMatchResult.isPlayerHome ? "home" : "away";
    const playerGoals2 = lastMatchResult.events.filter(e => e.type === "goal" && e.side === side);
    const oppGoals2 = lastMatchResult.events.filter(e => e.type === "goal" && e.side !== side);
    const lastPlayerGoal = playerGoals2.filter(e => e.minute === 90);
    if (lastPlayerGoal.length > 0 && playerGoals2.length > oppGoals2.length) {
      // Check that without the 90th min goal(s) we wouldn't have won
      const goalsWithout = playerGoals2.filter(e => e.minute < 90).length;
      if (goalsWithout <= oppGoals2.length) newUnlocks.push("last_gasp");
    }
  }

  // Youth grad — youth player scored
  if (lastMatchResult && lastMatchResult.events && !unlocked.has("youth_grad")) {
    const side = lastMatchResult.isPlayerHome ? "home" : "away";
    const goals = lastMatchResult.events.filter(e => e.type === "goal" && e.side === side);
    for (const g of goals) {
      const player = squad.find(p => p.name === g.player);
      if (player && player.id && String(player.id).startsWith("youth_")) {
        newUnlocks.push("youth_grad");
        break;
      }
    }
  }

  // Trial player — scored a goal (Thrown In The Deep End)
  if (lastMatchResult && lastMatchResult.events && !unlocked.has("deep_end")) {
    const side = lastMatchResult.isPlayerHome ? "home" : "away";
    const goals = lastMatchResult.events.filter(e => e.type === "goal" && e.side === side);
    for (const g of goals) {
      const player = squad.find(p => p.name === g.player);
      if (player && player.isTrial) {
        newUnlocks.push("deep_end");
        break;
      }
    }
  }

  // Trial player — MOTM (Trials HD)
  if (lastMatchResult && lastMatchResult.motmName && !unlocked.has("trials_hd")) {
    const motmPlayer = squad.find(p => p.name === lastMatchResult.motmName);
    if (motmPlayer && motmPlayer.isTrial) {
      newUnlocks.push("trials_hd");
    }
  }

  // Old Faithful — 36+ in starting XI
  if (!unlocked.has("old_faithful") && startingXI && squad) {
    const hasOld = startingXI.some(id => {
      const p = squad.find(pl => pl.id === id);
      return p && p.age >= 36;
    });
    if (hasOld) newUnlocks.push("old_faithful");
  }

  // Draw Specialists — 3 draws in a row (check via seasonDraws momentum)
  // We use the consecutiveUnbeaten approach — track consecutive draws
  if (lastMatchResult && !unlocked.has("draw_specialists")) {
    const playerGoalsD = lastMatchResult.homeGoals;
    const oppGoalsD = lastMatchResult.awayGoals;
    const isDraw = playerGoalsD === oppGoalsD;
    // This needs consecutive tracking — we'll check via state.consecutiveDraws if available
    if (state.consecutiveDraws >= 3) newUnlocks.push("draw_specialists");
  }

  // === NAME-BASED ACHIEVEMENTS ===

  // On First Name Terms — 3 squad players with same first name
  if (!unlocked.has("first_name_terms") && squad && squad.length > 0) {
    const firstCounts = {};
    squad.forEach(p => { const f = getFirstName(p.name); if (f) firstCounts[f] = (firstCounts[f] || 0) + 1; });
    if (Object.values(firstCounts).some(c => c >= 3)) newUnlocks.push("first_name_terms");
  }

  // Brothers In Arms — 2 players with same surname both have goals this season
  if (!unlocked.has("brothers_in_arms") && playerSeasonStats && squad) {
    const scorerSurnames = {};
    squad.forEach(p => {
      const stats = playerSeasonStats[p.name];
      if (stats && stats.goals > 0) {
        const surname = getLastName(p.name);
        if (surname) scorerSurnames[surname] = (scorerSurnames[surname] || 0) + 1;
      }
    });
    if (Object.values(scorerSurnames).some(c => c >= 2)) newUnlocks.push("brothers_in_arms");
  }

  // Legendary Dynasty — 2 All-Time XI players share a surname
  if (!unlocked.has("legendary_dynasty") && clubHistory?.allTimeXI) {
    const xiSurnames = {};
    Object.values(clubHistory.allTimeXI).forEach(p => {
      if (p?.name) {
        const surname = getLastName(p.name);
        if (surname) xiSurnames[surname] = (xiSurnames[surname] || 0) + 1;
      }
    });
    if (Object.values(xiSurnames).some(c => c >= 2)) newUnlocks.push("legendary_dynasty");
  }

  // === PLAYER MILESTONE ACHIEVEMENTS ===

  // Golden Boot — 20+ goals in a season
  if (!unlocked.has("golden_boot") && playerSeasonStats) {
    if (Object.values(playerSeasonStats).some(s => (s.goals || 0) >= 20)) newUnlocks.push("golden_boot");
  }

  // Cult Hero — unlockable player 20+ goals in a season
  if (!unlocked.has("cult_hero") && playerSeasonStats && squad) {
    for (const p of squad) {
      if (p.isUnlockable && (playerSeasonStats[p.name]?.goals || 0) >= 20) {
        newUnlocks.push("cult_hero"); break;
      }
    }
  }

  // Century Club — player reaches 100 career goals
  if (!unlocked.has("century_club") && playerSeasonStats && squad) {
    for (const p of squad) {
      const cKey = findCareerKey(clubHistory?.playerCareers, { playerId: p.id, name: p.name });
      const careerGoals = ((cKey ? clubHistory?.playerCareers?.[cKey]?.goals : 0) || 0) + (playerSeasonStats[p.name]?.goals || 0);
      if (careerGoals >= 100) { newUnlocks.push("century_club"); break; }
    }
  }

  // Fifty Not Out — 50 career appearances
  if (!unlocked.has("fifty_not_out") && playerSeasonStats && clubHistory?.playerCareers) {
    for (const p of squad) {
      const cKey = findCareerKey(clubHistory.playerCareers, { playerId: p.id, name: p.name });
      const careerApps = ((cKey ? clubHistory.playerCareers[cKey]?.apps : 0) || 0) + (playerSeasonStats[p.name]?.apps || 0);
      if (careerApps >= 50) { newUnlocks.push("fifty_not_out"); break; }
    }
  }

  // Remember The Name — score on debut (0 prior apps)
  if (!unlocked.has("remember_the_name") && lastMatchResult && playerSeasonStats) {
    const side = lastMatchResult.isPlayerHome ? "home" : "away";
    const scorers = (lastMatchResult.events || []).filter(e => e.type === "goal" && e.side === side).map(e => e.player);
    for (const scorerName of scorers) {
      const currentApps = playerSeasonStats[scorerName]?.apps || 0;
      // Resolve the scorer's career via squad (gives us their stable id);
      // fall back to name-only when no squad match.
      const scorerP = squad?.find(p => p.name === scorerName);
      const cKey = findCareerKey(clubHistory?.playerCareers, { playerId: scorerP?.id, name: scorerName });
      const careerApps = (cKey ? clubHistory?.playerCareers?.[cKey]?.apps : 0) || 0;
      // Stats haven't been updated yet for this match, so 0 means this IS the debut
      if (currentApps === 0 && careerApps === 0) { newUnlocks.push("remember_the_name"); break; }
    }
  }

  // === NEGATIVE SPIRAL ACHIEVEMENTS ===

  // Shooting Blanks — 4 consecutive scoreless matches
  if (!unlocked.has("shooting_blanks") && consecutiveScoreless >= 4) newUnlocks.push("shooting_blanks");

  // Wooden Spoon — finish bottom of the league
  if (league?.table && matchweekIndex >= (league.fixtures?.length || 18)) {
    const sorted = sortStandings(league.table);
    const playerIdx = sorted.findIndex(r => league.teams[r.teamIndex]?.isPlayer);
    if (!unlocked.has("wooden_spoon") && playerIdx === sorted.length - 1) newUnlocks.push("wooden_spoon");
    // Open All Hours — entire season with 0 clean sheets
    if (!unlocked.has("open_all_hours") && seasonCleanSheets === 0) newUnlocks.push("open_all_hours");
    // Mentality Monsters moved to collectSeasonEndAchievements (utils/league.js)
    // — it now needs the full season's cup/knockout results, which this
    // per-match, league-table-only check can't see (and, for Euro Dynasty
    // and World XI, fires before the post-league knockout is even played).
  }

  // === SQUAD EXTREME ACHIEVEMENTS ===

  // Needs Must — 13 or fewer squad members
  if (!unlocked.has("needs_must") && squad && squad.length <= 13 && lastMatchResult) newUnlocks.push("needs_must");

  // Galácticos — 25+ squad members
  if (!unlocked.has("galacticos") && squad && squad.length >= 25) newUnlocks.push("galacticos");

  // Good Engine — CM with Physical and Mental both 15+
  if (!unlocked.has("good_engine") && squad) {
    const cmPositions = ["CM", "AM"];
    for (const p of squad) {
      if (cmPositions.includes(p.position) && (p.attrs.physical || 0) >= 15 && (p.attrs.mental || 0) >= 15) {
        newUnlocks.push("good_engine"); break;
      }
    }
  }

  // === EDUCATIONAL — ticket system & features awareness ===

  // Golden Ticket — use your first ticket
  if (!unlocked.has("golden_ticket") && usedTicketTypes && usedTicketTypes.size >= 1) newUnlocks.push("golden_ticket");

  // Ticket Tout — use all 11 different ticket types across a career
  if (!unlocked.has("ticket_tout") && usedTicketTypes && usedTicketTypes.size >= 11) newUnlocks.push("ticket_tout");

  // The Network — set transfer focus on 2 clubs simultaneously
  if (!unlocked.has("the_network") && transferFocus && transferFocus.length >= 2) newUnlocks.push("the_network");

  // Best Of Friends — get any club relationship to 100%
  if (!unlocked.has("best_of_friends") && clubRelationships) {
    if (Object.values(clubRelationships).some(r => (r.pct || 0) >= 100)) newUnlocks.push("best_of_friends");
  }

  // The Dossier — scout 3 players with Dossier tickets
  if (!unlocked.has("the_dossier") && scoutedPlayers && Object.keys(scoutedPlayers).length >= 3) newUnlocks.push("the_dossier");

  // Formation Roulette — win with 3+ different formations in a single season
  if (!unlocked.has("formation_roulette") && formationsWonWith && formationsWonWith.size >= 3) newUnlocks.push("formation_roulette");

  // The Dugout — manually assign all 11 slot positions
  // (manualSlotIndices only grows via single-slot drag/tap assignment —
  // ASST XI / Fans XI / preset apply reset it, so auto-fill can't qualify it)
  if (!unlocked.has("the_dugout") && stateSlotAssignments && manualSlotIndices) {
    const dugoutComplete = Array.from({ length: 11 }, (_, i) => i)
      .every(i => manualSlotIndices.has(i) && stateSlotAssignments[i] != null);
    if (dugoutComplete) newUnlocks.push("the_dugout");
  }

  // === UNIQUE PLAY — rewarding creative playstyles ===

  // Inverted Wingers — win with a natural LW in RW slot and natural RW in LW slot
  if (!unlocked.has("inverted_wingers") && lastMatchResult && league && stateFormation && stateSlotAssignments && squad) {
    const homeTeam = league.teams[lastMatchResult.home];
    const awayTeam = league.teams[lastMatchResult.away];
    const playerIsHome = homeTeam?.isPlayer;
    const pGoals = playerIsHome ? lastMatchResult.homeGoals : lastMatchResult.awayGoals;
    const oGoals = playerIsHome ? lastMatchResult.awayGoals : lastMatchResult.homeGoals;
    if (pGoals > oGoals) {
      const effectiveSlots = getEffectiveSlots(startingXI, stateFormation, squad, stateSlotAssignments);
      const formPositions = getFormationPositions(stateFormation);
      let lwInRw = false, rwInLw = false;
      for (let i = 0; i < Math.min(effectiveSlots.length, formPositions.length); i++) {
        const pid = effectiveSlots[i];
        if (!pid) continue;
        const player = squad.find(p => p.id === pid);
        if (!player) continue;
        if (player.position === "LW" && formPositions[i] === "RW") lwInRw = true;
        if (player.position === "RW" && formPositions[i] === "LW") rwInLw = true;
      }
      if (lwInRw && rwInLw) newUnlocks.push("inverted_wingers");
    }
  }

  // Moneyball — sign 3 free agents via Transfer Insider
  if (!unlocked.has("moneyball") && freeAgentSignings >= 3) newUnlocks.push("moneyball");

  // Lazy Sunday — win without making any substitutions
  if (!unlocked.has("lazy_sunday") && lastMatchResult && league) {
    const homeTeam = league.teams[lastMatchResult.home];
    const awayTeam = league.teams[lastMatchResult.away];
    const playerIsHome = homeTeam?.isPlayer;
    const pGoals = playerIsHome ? lastMatchResult.homeGoals : lastMatchResult.awayGoals;
    const oGoals = playerIsHome ? lastMatchResult.awayGoals : lastMatchResult.homeGoals;
    if (pGoals > oGoals && (lastMatchResult.playerSubsMade || 0) === 0) newUnlocks.push("lazy_sunday");
  }

  // Sweat Equity — 4+ stat gains in a double training week
  if (!unlocked.has("sweat_equity") && doubleTrainingWeek && weekGains?.improvements?.length >= 4) newUnlocks.push("sweat_equity");

  // Nom De Guerre — a renamed player scores in a match
  if (!unlocked.has("nom_de_guerre") && lastMatchResult && lastMatchResult.events && squad) {
    const side = lastMatchResult.isPlayerHome != null
      ? (lastMatchResult.isPlayerHome ? "home" : "away")
      : (league?.teams?.[lastMatchResult.home]?.isPlayer ? "home" : "away");
    const goals = lastMatchResult.events.filter(e => e.type === "goal" && e.side === side);
    for (const g of goals) {
      const player = squad.find(p => p.name === g.player);
      if (player && player.birthName) { newUnlocks.push("nom_de_guerre"); break; }
    }
  }

  // === NARRATIVE — post-event story moments ===

  // One More Year — delayed-retirement player scores
  if (!unlocked.has("one_more_year") && lastMatchResult && lastMatchResult.events && squad) {
    const side = lastMatchResult.isPlayerHome != null
      ? (lastMatchResult.isPlayerHome ? "home" : "away")
      : (league?.teams?.[lastMatchResult.home]?.isPlayer ? "home" : "away");
    const goals = lastMatchResult.events.filter(e => e.type === "goal" && e.side === side);
    for (const g of goals) {
      const player = squad.find(p => p.name === g.player);
      if (player && player.delayedRetirement) { newUnlocks.push("one_more_year"); break; }
    }
  }

  // Guard Of Honour — win a match with a testimonial player in the squad
  if (!unlocked.has("guard_of_honour") && lastMatchResult && league && testimonialPlayer) {
    const homeTeam = league.teams[lastMatchResult.home];
    const awayTeam = league.teams[lastMatchResult.away];
    const playerIsHome = homeTeam?.isPlayer;
    const pGoals = playerIsHome ? lastMatchResult.homeGoals : lastMatchResult.awayGoals;
    const oGoals = playerIsHome ? lastMatchResult.awayGoals : lastMatchResult.homeGoals;
    if (pGoals > oGoals) newUnlocks.push("guard_of_honour");
  }

  // Not A Dry Eye — testimonial player scores in their farewell match
  if (!unlocked.has("not_a_dry_eye") && lastMatchResult && lastMatchResult.events && testimonialPlayer) {
    const side = lastMatchResult.isPlayerHome != null
      ? (lastMatchResult.isPlayerHome ? "home" : "away")
      : (league?.teams?.[lastMatchResult.home]?.isPlayer ? "home" : "away");
    const goals = lastMatchResult.events.filter(e => e.type === "goal" && e.side === side);
    if (goals.some(g => g.player === testimonialPlayer.name)) newUnlocks.push("not_a_dry_eye");
  }

  // Instant Impact — Transfer Insider signing scores on debut
  if (!unlocked.has("instant_impact") && lastMatchResult && lastMatchResult.events && squad && playerSeasonStats) {
    const side = lastMatchResult.isPlayerHome != null
      ? (lastMatchResult.isPlayerHome ? "home" : "away")
      : (league?.teams?.[lastMatchResult.home]?.isPlayer ? "home" : "away");
    const goals = lastMatchResult.events.filter(e => e.type === "goal" && e.side === side);
    for (const g of goals) {
      const player = squad.find(p => p.name === g.player);
      if (player && player.fromTransferInsider) {
        const currentApps = playerSeasonStats[player.name]?.apps || 0;
        const cKey = findCareerKey(clubHistory?.playerCareers, { playerId: player.id, name: player.name });
        const careerApps = (cKey ? clubHistory?.playerCareers?.[cKey]?.apps : 0) || 0;
        if (currentApps === 0 && careerApps === 0) { newUnlocks.push("instant_impact"); break; }
      }
    }
  }

  // Lazarus — Miracle Cream-healed player scores
  if (!unlocked.has("lazarus") && lastMatchResult && lastMatchResult.events && squad) {
    const side = lastMatchResult.isPlayerHome != null
      ? (lastMatchResult.isPlayerHome ? "home" : "away")
      : (league?.teams?.[lastMatchResult.home]?.isPlayer ? "home" : "away");
    const goals = lastMatchResult.events.filter(e => e.type === "goal" && e.side === side);
    for (const g of goals) {
      const player = squad.find(p => p.name === g.player);
      if (player && player.miracleHealed) { newUnlocks.push("lazarus"); break; }
    }
  }

  // Made It His Own — renamed player is Man of the Match
  if (!unlocked.has("made_it_his_own") && lastMatchResult && lastMatchResult.motmName && squad) {
    const motmPlayer = squad.find(p => p.name === lastMatchResult.motmName);
    if (motmPlayer && motmPlayer.birthName) newUnlocks.push("made_it_his_own");
  }

  // Comeback Season — bottom half one season, top 3 the next (season-end check)
  if (lastMatchResult && league?.table && matchweekIndex >= (league.fixtures?.length || 18)) {
    if (!unlocked.has("comeback_season") && lastSeasonPosition != null) {
      const sorted = sortStandings(league.table);
      const playerIdx = sorted.findIndex(r => league.teams[r.teamIndex]?.isPlayer);
      // lastSeasonPosition is 1-indexed, playerIdx is 0-indexed
      if (lastSeasonPosition >= 6 && playerIdx <= 2) newUnlocks.push("comeback_season");
    }
  }

  // Absentee Landlord — win the league while on holiday
  // Uses latched flag set by useMatchResult when title clinched during holiday
  if (!unlocked.has("absentee_landlord") && wonLeagueOnHoliday) {
    newUnlocks.push("absentee_landlord");
  }

  // === HOLIDAY MODE ===

  // Cruise Control — 10+ consecutive matches on holiday
  if (!unlocked.has("cruise_control") && holidayMatchesThisSeason >= 10) newUnlocks.push("cruise_control");

  // === CLUB RELATIONSHIPS ===

  // Diplomat — 3+ clubs at 50% relationship or higher
  if (!unlocked.has("diplomat") && clubRelationships) {
    const above50 = Object.values(clubRelationships).filter(r => (r.pct || 0) >= 50).length;
    if (above50 >= 3) newUnlocks.push("diplomat");
  }

  // Burned Bridges — a club relationship drops to 0% (must have been interacted with — hasTrade or pct was > 0 before)
  if (!unlocked.has("burned_bridges") && clubRelationships) {
    if (Object.values(clubRelationships).some(r => r.pct <= 0 && r.wasPositive)) newUnlocks.push("burned_bridges");
  }

  // === SHORTLIST ===

  // Talent Spotter — 5+ total players shortlisted across career
  if (!unlocked.has("talent_spotter") && (totalShortlisted || 0) >= 5) newUnlocks.push("talent_spotter");

  // The Black Book — 15+ players on shortlist at once
  if (!unlocked.has("the_black_book") && shortlist && shortlist.length >= 15) newUnlocks.push("the_black_book");

  // === MATCH SPEED ===

  // Patient Manager — watched match at normal speed
  if (!unlocked.has("patient_manager") && wasAlwaysNormal) newUnlocks.push("patient_manager");

  // Speed Demon — 10 matches at fastest speed in season
  if (!unlocked.has("speed_demon") && (fastMatchesThisSeason || 0) >= 10) newUnlocks.push("speed_demon");

  // === TICKET NARRATIVES ===

  // Double or Nothing — 6+ stat gains from a double training week
  if (!unlocked.has("double_or_nothing") && doubleTrainingWeek && weekGains?.improvements?.length >= 6) newUnlocks.push("double_or_nothing");

  // 12th Man Roar — win by 3+ goals with 12th Man active
  if (!unlocked.has("twelfth_man_roar") && twelfthManActive && lastMatchResult && league) {
    const homeTeam = league.teams[lastMatchResult.home];
    const awayTeam = league.teams[lastMatchResult.away];
    const playerIsHome = homeTeam?.isPlayer;
    const pGoals = playerIsHome ? lastMatchResult.homeGoals : lastMatchResult.awayGoals;
    const oGoals = playerIsHome ? lastMatchResult.awayGoals : lastMatchResult.homeGoals;
    if (pGoals - oGoals >= 3) newUnlocks.push("twelfth_man_roar");
  }

  // Prodigy Intake — Youth Coup player becomes highest OVR in squad
  if (!unlocked.has("prodigy_intake") && squad) {
    const youthCoupPlayers = squad.filter(p => p.isYouthCoup);
    if (youthCoupPlayers.length > 0) {
      const highestOvr = Math.max(...squad.map(p => getOverall(p)));
      if (youthCoupPlayers.some(p => getOverall(p) >= highestOvr)) newUnlocks.push("prodigy_intake");
    }
  }

  // === GK-SPECIFIC ===

  // Number One — same GK starts 15+ matches in a season
  if (!unlocked.has("number_one") && playerSeasonStats && squad) {
    for (const p of squad) {
      if (p.position === "GK" && (playerSeasonStats[p.name]?.apps || 0) >= 15) {
        newUnlocks.push("number_one"); break;
      }
    }
  }

  // Cat-Like Reflexes — GK keeps 8+ clean sheets in a season
  if (!unlocked.has("cat_like_reflexes") && gkCleanSheets) {
    if (Object.values(gkCleanSheets).some(cs => cs >= 8)) newUnlocks.push("cat_like_reflexes");
  }

  // === POSITION LEARNING ===

  // Swiss Army Knife — player with 3+ learned positions
  if (!unlocked.has("swiss_army_knife") && squad) {
    if (squad.some(p => p.learnedPositions && p.learnedPositions.length >= 3)) newUnlocks.push("swiss_army_knife");
  }

  // Identity Crisis — playing in neither natural nor any learned position
  if (!unlocked.has("identity_crisis") && lastMatchResult && startingXI && stateFormation && squad) {
    const effectiveSlots = getEffectiveSlots(startingXI, stateFormation, squad, stateSlotAssignments);
    const formPositions = getFormationPositions(stateFormation);
    for (let i = 0; i < Math.min(effectiveSlots.length, formPositions.length); i++) {
      const pid = effectiveSlots[i];
      if (!pid) continue;
      const player = squad.find(p => p.id === pid);
      if (!player) continue;
      const slotPos = formPositions[i];
      if (slotPos && slotPos !== player.position && !(player.learnedPositions || []).includes(slotPos)) {
        newUnlocks.push("identity_crisis"); break;
      }
    }
  }

  // === SQUAD CONTINUITY ===

  // Band of Brothers — 8+ players in squad for 3+ seasons
  if (!unlocked.has("band_of_brothers") && squad && seasonNumber >= 3) {
    const longServants = squad.filter(p => {
      const joinedSeason = p.joinedSeason || p.unlockableJoinedSeason || 1;
      return (seasonNumber - joinedSeason) >= 2; // been here for 3+ seasons (current = season N, joined in N-2 or earlier)
    });
    if (longServants.length >= 8) newUnlocks.push("band_of_brothers");
  }

  // === SEASON 10 ===
  if (!unlocked.has("season_10") && seasonNumber >= 10) newUnlocks.push("season_10");

  // === INTERGALACTIC ELITE / ALIEN ACHIEVEMENTS ===

  // Englishman In New York — sign an Alien player
  if (!unlocked.has("englishman_in_new_york") && squad) {
    if (squad.some(p => p.nationality === "ALN")) newUnlocks.push("englishman_in_new_york");
  }

  // Area 51 — sign 5 Alien players
  if (!unlocked.has("area_51") && squad) {
    if (squad.filter(p => p.nationality === "ALN").length >= 5) newUnlocks.push("area_51");
  }

  // We Come In Peace — beat an Alien team (opponent has majority ALN players)
  if (!unlocked.has("we_come_in_peace") && lastMatchResult && league) {
    const homeTeam = league.teams[lastMatchResult.home];
    const awayTeam = league.teams[lastMatchResult.away];
    const playerIsHome = homeTeam?.isPlayer;
    const playerGoals = playerIsHome ? lastMatchResult.homeGoals : lastMatchResult.awayGoals;
    const oppGoals = playerIsHome ? lastMatchResult.awayGoals : lastMatchResult.homeGoals;
    const oppTeam = playerIsHome ? awayTeam : homeTeam;
    if (playerGoals > oppGoals && oppTeam?.squad) {
      const alienCount = oppTeam.squad.filter(p => p.nationality === "ALN").length;
      if (alienCount > oppTeam.squad.length / 2) newUnlocks.push("we_come_in_peace");
    }
  }

  // Take Me To Your Leader — beat league leaders in Intergalactic Elite by 3+ goals
  if (!unlocked.has("take_me_to_your_leader") && lastMatchResult && league?.tier === 1) {
    const homeTeam = league.teams[lastMatchResult.home];
    const awayTeam = league.teams[lastMatchResult.away];
    const playerIsHome = homeTeam?.isPlayer;
    const playerGoals = playerIsHome ? lastMatchResult.homeGoals : lastMatchResult.awayGoals;
    const oppGoals = playerIsHome ? lastMatchResult.awayGoals : lastMatchResult.homeGoals;
    const oppTeam = playerIsHome ? awayTeam : homeTeam;
    if (playerGoals > oppGoals && playerGoals - oppGoals >= 3) {
      const sorted = sortStandings(league.table);
      if (sorted[0] && league.teams[sorted[0].teamIndex]?.name === oppTeam?.name) {
        newUnlocks.push("take_me_to_your_leader");
      }
    }
  }

  // Destroy All Humans — entire starting XI of Alien players
  if (!unlocked.has("destroy_all_humans") && startingXI && squad) {
    const xiPlayers = startingXI.map(id => squad.find(p => p.id === id)).filter(Boolean);
    if (xiPlayers.length === 11 && xiPlayers.every(p => p.nationality === "ALN")) {
      newUnlocks.push("destroy_all_humans");
    }
  }

  // First Contact — club relationship 100% with an Alien team (majority ALN squad)
  if (!unlocked.has("first_contact") && clubRelationships && league) {
    for (const [teamName, rel] of Object.entries(clubRelationships)) {
      if ((rel.pct || 0) >= 100) {
        const team = league.teams?.find(t => t.name === teamName);
        if (team?.squad) {
          const alienCount = team.squad.filter(p => p.nationality === "ALN").length;
          if (alienCount > team.squad.length / 2) { newUnlocks.push("first_contact"); break; }
        }
      }
    }
  }

  // Phone Home — win all home games in a season in the Intergalactic Elite (season-end)
  if (!unlocked.has("phone_home") && lastMatchResult && league?.tier === 1 && league?.table) {
    const totalFixtures = league.fixtures?.length || 18;
    if (matchweekIndex >= totalFixtures) {
      const sorted = sortStandings(league.table);
      const playerRow = sorted.find(r => league.teams[r.teamIndex]?.isPlayer);
      if (playerRow) {
        const homeGames = playerRow.played - (seasonAwayGames || 0);
        const homeWins = playerRow.won - (seasonAwayWins || 0);
        if (homeGames > 0 && homeWins === homeGames) newUnlocks.push("phone_home");
      }
    }
  }

  // All earned achievements returned regardless of pack status — banking handled by caller
  return newUnlocks;
}

// === CIG CARDS — MATCH DOMAIN ===

/**
 * Gooseberry Cigs — breakout-moment achievements. Pure: takes this match's
 * `breakoutResults` (see checkBreakouts, src/utils/breakouts.js) plus the
 * season's breakout ledger as it stood BEFORE those results were applied,
 * and returns newly-earned achievement ids. Never mutates its inputs — the
 * caller is responsible for actually applying breakoutResults to squad/
 * breakoutsThisSeason; this function only reads.
 *
 * @param {object} params
 * @param {Array} params.breakoutResults - this match's checkBreakouts() output
 * @param {Array} params.squad - full current squad (for position/age/potential lookups)
 * @param {Map} params.breakoutsThisSeason - season ledger BEFORE breakoutResults applied
 * @param {object} params.playerMatchLog - { playerId: MatchLogEntry[] }
 * @param {number} params.ovrCap - current OVR/potential cap
 * @param {boolean} params.isCup - whether this match was a cup tie
 * @param {Set} params.unlocked - already-unlocked achievement ids
 * @returns {string[]} newly-earned achievement ids (deduped)
 */
export function collectBreakoutAchievements({ breakoutResults, squad, breakoutsThisSeason, playerMatchLog, ovrCap, isCup, unlocked }) {
  const newUnlocks = [];
  if (!breakoutResults || breakoutResults.length === 0) return newUnlocks;

  const findPlayer = (id) => (squad || []).find(p => p.id === id);
  const add = (id) => { if (!unlocked.has(id) && !newUnlocks.includes(id)) newUnlocks.push(id); };

  // Fold this match's results onto a local copy of the season ledger — never
  // mutates breakoutsThisSeason, which the caller applies separately.
  const merged = new Map();
  (breakoutsThisSeason || new Map()).forEach((raw, id) => {
    const triggers = raw instanceof Set ? new Set(raw) : new Set(raw?.triggers || []);
    merged.set(id, { triggers, lastLogIndex: raw instanceof Set ? -99 : (raw?.lastLogIndex ?? -99) });
  });
  for (const bo of breakoutResults) {
    const entry = merged.get(bo.playerId) || { triggers: new Set(), lastLogIndex: bo.logIndex };
    entry.triggers.add(bo.trigger.id);
    entry.lastLogIndex = bo.logIndex;
    merged.set(bo.playerId, entry);
  }

  // Scenes — first breakout moment, ever
  add("scenes");

  for (const bo of breakoutResults) {
    const player = findPlayer(bo.playerId);
    const seasonEntry = merged.get(bo.playerId);

    if (seasonEntry && seasonEntry.triggers.size >= 2) add("purple_patch");
    if (isCup) add("made_for_occasion");
    if (player && player.age >= 30) add("vintage_performance");

    const logLen = playerMatchLog?.[bo.playerId]?.length;
    if (logLen != null && logLen <= 5) add("fast_learner");

    if (player) {
      if ((player.potential || 0) <= 9) add("never_saw_him_coming");
      if (bo.potentialGain > 0) {
        const postPotential = Math.min(ovrCap, (player.potential || 0) + bo.potentialGain);
        if (postPotential >= ovrCap) add("raising_ceiling");
      }
    }

    if (POSITION_TYPES[bo.playerPosition] === "GK") add("wonderwall");
  }

  // Everyone's Invited — FWD/MID/DEF/GK all represented among this season's
  // breakout players (existing ledger entries + this match's incoming ones)
  const groupsPresent = new Set();
  for (const [pid, entry] of merged.entries()) {
    if (!entry.triggers || entry.triggers.size === 0) continue;
    const player = findPlayer(pid);
    if (!player) continue;
    groupsPresent.add(POSITION_TYPES[player.position]);
  }
  if (["FWD", "MID", "DEF", "GK"].every(g => groupsPresent.has(g))) add("everyones_invited");

  // Production Line — 5+ breakout moments across the squad this season
  let totalTriggers = 0;
  for (const entry of merged.values()) totalTriggers += entry.triggers.size;
  if (totalTriggers >= 5) add("production_line");

  return newUnlocks;
}

// Last-gasp winner check shared with the "last_gasp" achievement above (see
// the ~line-700 block) — same rule, generalized to any match result object.
function isLastGaspWinner(matchResult) {
  if (!matchResult || !matchResult.events) return false;
  const side = matchResult.isPlayerHome ? "home" : "away";
  const playerGoals = matchResult.events.filter(e => e.type === "goal" && e.side === side);
  const oppGoals = matchResult.events.filter(e => e.type === "goal" && e.side !== side);
  const lastMinuteGoals = playerGoals.filter(e => e.minute === 90);
  if (lastMinuteGoals.length === 0) return false;
  if (playerGoals.length <= oppGoals.length) return false;
  const goalsWithout = playerGoals.filter(e => e.minute < 90).length;
  return goalsWithout <= oppGoals.length;
}

/**
 * Blood Orange Cigs — per-match rivalry achievements. Pure: reads the
 * rivalry ledger entry for this opponent from before and after this match's
 * clubHistory.rivalryLedger update (see useMatchResult.js), plus the raw
 * match result, and returns newly-earned achievement ids.
 *
 * Rivalry status ("derby") is `isRival(ledgerEntryBefore)` throughout — the
 * PRE-match record — except kept_the_receipts, which is inherently about
 * the record AFTER this match's meeting is counted.
 *
 * Safe to call with null/undefined matchResult, ledger entries, or goals
 * (e.g. during a retroactive re-check with no live match) — always returns
 * an array, never throws.
 *
 * @param {object} params
 * @param {object|null} params.ledgerEntryBefore - opponent's ledger entry before this match
 * @param {object|null} params.ledgerEntryAfter - opponent's ledger entry after this match
 * @param {object} [params.ledger] - full rivalryLedger after this match (unused directly here, kept for callers/future cards)
 * @param {object|null} params.matchResult - raw simulateMatch result (events, redCards, isPlayerHome)
 * @param {number} params.playerGoals
 * @param {number} params.oppGoals
 * @param {Set} params.unlocked - already-unlocked achievement ids
 * @returns {string[]} newly-earned achievement ids (deduped)
 */
export function collectRivalryMatchAchievements({ ledgerEntryBefore, ledgerEntryAfter, ledger, matchResult, playerGoals, oppGoals, unlocked }) {
  const newUnlocks = [];
  const add = (id) => { if (!unlocked.has(id) && !newUnlocks.includes(id)) newUnlocks.push(id); };

  const won = (playerGoals ?? -1) > (oppGoals ?? -1) && playerGoals != null && oppGoals != null;
  const rivalBefore = isRival(ledgerEntryBefore);

  if (won && rivalBefore) add("bragging_rights");

  if (won && rivalBefore && (matchResult?.redCards?.length || 0) >= 2) add("no_love_lost");

  if (rivalBefore && isLastGaspWinner(matchResult)) add("twist_the_knife");

  if (ledgerEntryAfter?.lastMeetings?.length) {
    const meetings = ledgerEntryAfter.lastMeetings;
    const currentSeason = meetings[meetings.length - 1].season;
    const thisSeasonMeetings = meetings.filter(m => m.season === currentSeason);
    if (thisSeasonMeetings.length >= 2 && thisSeasonMeetings.every(m => m.playerGoals > m.oppGoals)) {
      add("home_and_away");
    }
  }

  if (won && rivalBefore && (ledgerEntryBefore?.played || 0) >= 5 && (ledgerEntryBefore?.wins || 0) === 0) {
    add("breaking_the_curse");
  }

  if (rivalBefore && playerGoals != null && oppGoals != null && (playerGoals - oppGoals) >= 4) {
    add("statement_win");
  }

  if (isRival(ledgerEntryAfter) && (ledgerEntryAfter?.played || 0) >= 10) add("kept_the_receipts");

  return newUnlocks;
}

// Achievement toast notification
