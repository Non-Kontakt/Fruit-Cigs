import { LEAGUE_DEFS, NUM_TIERS, RESERVE_TEAM_CONFIGS } from "../data/leagues.js";
import { CUP_ROUND_MATCHWEEKS, CUP_ROUND_NAMES, CUP_DEFS } from "../data/cups.js";
import { TIER_WIN_ACHS } from "../data/achievements.js";
import { generateAITeam, generateSquadPhilosophy } from "./player.js";
import { generateFixtures, simulateMatch } from "./match.js";
import { getModifier } from "../data/leagueModifiers.js";
import { getTopScorers } from "./competitionStats.js";
import { getPlayersTradedAwayThisSeason } from "./transfer.js";
import { getStaleShortlistEntries, hasUnresolvedDossierBurn } from "./scouting.js";

// The tier defs reuse plausible club names ("Red Lion FC", "Dog & Duck"...),
// so a player can pick a name that already belongs to an AI team. AI configs
// matching the player's name must never enter any roster.
export function collidesWithPlayerName(name, playerTeamName) {
  return !!playerTeamName && !!name &&
    name.trim().toLowerCase() === playerTeamName.trim().toLowerCase();
}

// Rename any config clashing with the player's name, keeping its colours,
// strength and trait so league line-ups and team counts stay intact. The name
// pool is sized so every tier stays full — evicting instead would leave the
// player's league a team short. Mutates namesInUse to track the swap.
function renameCollisions(configs, playerTeamName, namesInUse) {
  return configs.map(c => {
    if (!collidesWithPlayerName(c.name, playerTeamName)) return c;
    const fresh = RESERVE_TEAM_CONFIGS.find(r => !namesInUse.has(r.name) && !collidesWithPlayerName(r.name, playerTeamName));
    if (!fresh) return c;
    namesInUse.delete(c.name);
    namesInUse.add(fresh.name);
    return { ...c, name: fresh.name };
  });
}

// Ensure every tier has exactly 10 AI teams.
// AI-only leagues have 10 teams. Player's tier has 9 AI + player = 10.
// initLeague trims 10 → 9 AI when the player joins; initAILeague uses all 10.
export function normalizeRosters(rosters, playerTeamName = null) {
  const TARGET = 10;
  // Rename any AI config sharing the player's name (also heals rosters saved
  // before this guard existed).
  if (playerTeamName) {
    const namesInUse = new Set();
    for (let t = 1; t <= NUM_TIERS; t++) {
      (rosters[t] || []).forEach(r => namesInUse.add(r.name));
    }
    for (let t = 1; t <= NUM_TIERS; t++) {
      if (rosters[t]) rosters[t] = renameCollisions(rosters[t], playerTeamName, namesInUse);
    }
  }
  const allInUse = new Set();
  for (let t = 1; t <= NUM_TIERS; t++) {
    (rosters[t] || []).forEach(r => allInUse.add(r.name));
  }
  for (let t = 1; t <= NUM_TIERS; t++) {
    if ((rosters[t] || []).length >= TARGET) continue;
    if (!rosters[t]) rosters[t] = [];
    // Prefer teams originally defined for this tier, then fall back to other tiers
    const searchOrder = [t, ...Array.from({length: NUM_TIERS}, (_, i) => i + 1).filter(x => x !== t)];
    for (const dt of searchOrder) {
      for (const c of (LEAGUE_DEFS[dt]?.teams || [])) {
        if (rosters[t].length >= TARGET) break;
        if (!allInUse.has(c.name) && !collidesWithPlayerName(c.name, playerTeamName)) {
          rosters[t].push({ ...c });
          allInUse.add(c.name);
        }
      }
      if (rosters[t].length >= TARGET) break;
    }
    // Defs exhausted (they hold 109 names for 110 slots, and a player-name
    // collision costs one more) — top up from the reserve pool so AI-only
    // tiers never run a short league.
    for (const c of RESERVE_TEAM_CONFIGS) {
      if (rosters[t].length >= TARGET) break;
      if (!allInUse.has(c.name) && !collidesWithPlayerName(c.name, playerTeamName)) {
        rosters[t].push({ ...c });
        allInUse.add(c.name);
      }
    }
  }
  return rosters;
}

export function initLeagueRosters(playerTeamName = null) {
  const rosters = {};
  for (let t = 1; t <= NUM_TIERS; t++) {
    rosters[t] = (LEAGUE_DEFS[t]?.teams || []).map(c => ({
      ...c,
      squadPhilosophy: generateSquadPhilosophy(c.trait),
      trajectory: 0,
    }));
  }
  return normalizeRosters(rosters, playerTeamName);
}

// Helper: sort a league table by points then goal difference (used ~18 times)
export function sortStandings(table) {
  return [...table].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
}

// Builds one season's worth of full, sorted standings for every division —
// the player's own tier (from `playerLeague`) plus every other tier
// (from `allLeagueStates`) — for the leagueHistory season archive. Called
// at season rollover, BEFORE the new season's league objects are built, so
// callers must pass the closing season's (not the new season's) league
// state.
export function buildLeagueHistorySnapshot(playerTier, playerLeague, allLeagueStates) {
  const snapshot = {};
  const addTier = (tier, leagueObj) => {
    if (!leagueObj?.table || !leagueObj?.teams) return;
    const sorted = sortStandings(leagueObj.table);
    snapshot[tier] = {
      leagueName: leagueObj.leagueName || LEAGUE_DEFS[tier]?.name || `Tier ${tier}`,
      standings: sorted.map(r => ({
        name: leagueObj.teams[r.teamIndex]?.name || "?",
        played: r.played, won: r.won, drawn: r.drawn, lost: r.lost,
        goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, points: r.points,
      })),
    };
  };
  if (playerTier != null) addTier(playerTier, playerLeague);
  Object.entries(allLeagueStates || {}).forEach(([tier, leagueObj]) => addTier(Number(tier), leagueObj));
  return snapshot;
}

// Shared season-end achievement logic (called from 2 code paths: league-end + cup-end)
// currentTrackId: optional, replaces BGM.getCurrentTrackId() which is not available outside App.jsx
export function collectSeasonEndAchievements({ position, currentTier, moveType, newTier, lastSeasonMove, league, leagueResults, playerSeasonStats, seasonLeagueStats, beatenTeams, unlockedAchievements, clubHistory, wonCupThisSeason, squad, prevSeasonSquadIds, seasonNumber, dynastyCupBracket, cup, calendarResults, transferHistory = [], shortlist = [], dossierBurns = {} }, currentTrackId = null) {
  const achs = [];
  if (moveType === "promoted") { achs.push("promoted"); if (lastSeasonMove === "promoted") achs.push("back_to_back"); }
  if (moveType === "relegated") { achs.push("relegated"); if (lastSeasonMove === "promoted") achs.push("yo_yo"); if (lastSeasonMove === "relegated") achs.push("free_fall"); }
  if (position === 1 && wonCupThisSeason && !unlockedAchievements.has("the_double")) achs.push("the_double");
  if (moveType === "promoted" && !unlockedAchievements.has("gone_up_one_track") && currentTrackId === "gone_up_one") achs.push("gone_up_one_track");
  // Efficient Machine
  if (position === 1 && !unlockedAchievements.has("efficient_machine") && league?.table) {
    const sorted = sortStandings(league.table);
    const pRow = sorted.find(r => league.teams[r.teamIndex]?.isPlayer);
    if (pRow) {
      const pGD = pRow.goalsFor - pRow.goalsAgainst;
      const maxGD = Math.max(...sorted.map(r => r.goalsFor - r.goalsAgainst));
      if (pGD < maxGD) achs.push("efficient_machine");
    }
  }
  // Tactical Foul + Bag Man — read canonical seasonLeagueStats. Top scorer
  // and most-booked (yellows + reds) are direct picks from the canonical
  // store; the player's team is identified by teamId === player team index.
  const playerTeamIdx = league?.teams?.findIndex(t => t?.isPlayer);
  const playerCanonicalTeamId = playerTeamIdx != null && playerTeamIdx >= 0 ? playerTeamIdx : null;
  const canonicalPlayers = seasonLeagueStats?.players ? Object.values(seasonLeagueStats.players) : [];
  if (!unlockedAchievements.has("tactical_foul") && canonicalPlayers.length > 0) {
    const sortedCards = [...canonicalPlayers]
      .map(p => ({ ...p, cards: (p.yellows || 0) + (p.reds || 0) }))
      .filter(p => p.cards > 0)
      .sort((a, b) => b.cards - a.cards);
    if (sortedCards[0]?.teamId === playerCanonicalTeamId) achs.push("tactical_foul");
  }
  if (!unlockedAchievements.has("bag_man") && canonicalPlayers.length > 0) {
    const sortedGoals = [...canonicalPlayers]
      .filter(p => (p.goals || 0) > 0)
      .sort((a, b) => b.goals - a.goals);
    if (sortedGoals[0]?.teamId === playerCanonicalTeamId) achs.push("bag_man");
  }
  // AGÜEROOOO!
  if (position === 1 && !unlockedAchievements.has("aguero") && league?.table) {
    const sorted = sortStandings(league.table);
    const pRow = sorted.find(r => league.teams[r.teamIndex]?.isPlayer);
    if (pRow && sorted.length > 1) {
      const second = sorted.find(r => r !== pRow);
      if (second && pRow.points - second.points <= 3) achs.push("aguero");
    }
  }
  // Flat Track Bully
  if (!unlockedAchievements.has("flat_track") && beatenTeams && league?.table) {
    const sorted = sortStandings(league.table);
    const bh = sorted.slice(Math.ceil(sorted.length / 2)).map(r => league.teams[r.teamIndex]?.name).filter(Boolean);
    if (bh.length > 0 && bh.every(name => beatenTeams.has(name))) achs.push("flat_track");
  }
  // Big Game Player
  if (!unlockedAchievements.has("big_game") && beatenTeams && league?.table) {
    const sorted = sortStandings(league.table);
    const top3 = sorted.slice(0, 3).map(r => league.teams[r.teamIndex]).filter(t => t && !t.isPlayer).map(t => t.name);
    if (top3.length > 0 && top3.every(name => beatenTeams.has(name))) achs.push("big_game");
  }
  // Promised Land
  if (moveType === "promoted" && newTier <= 5 && !unlockedAchievements.has("promised_land")) achs.push("promised_land");
  // Per-league title
  if (position === 1) {
    const tierAch = TIER_WIN_ACHS[currentTier];
    if (tierAch && !unlockedAchievements.has(tierAch)) achs.push(tierAch);
  }
  // Compute distinct tiers where the player has won the title (used by two achievements below)
  if (position === 1) {
    const titlesWon = new Set([currentTier]);
    (clubHistory?.seasonArchive || []).forEach(s => { if (s.position === 1 && s.tier) titlesWon.add(s.tier); });
    // Tinpot Treble: won the title in at least 3 different tiers
    if (!unlockedAchievements.has("tinpot_treble") && titlesWon.size >= 3) achs.push("tinpot_treble");
    // Sunday To The Stars: won the title in every tier
    if (!unlockedAchievements.has("sunday_to_stars")) {
      const allTiers = Array.from({ length: NUM_TIERS }, (_, i) => i + 1).every(t => titlesWon.has(t));
      if (allTiers) achs.push("sunday_to_stars");
    }
  }

  // Steady Climb — finish higher than previous season 3 times in a row
  if (!unlockedAchievements.has("steady_climb") && clubHistory?.seasonArchive?.length >= 2) {
    const archive = clubHistory.seasonArchive;
    // Current position is this season (not yet in archive), check last 2 from archive
    const prevPos = archive[archive.length - 1].position;
    const prevPrevPos = archive.length >= 2 ? archive[archive.length - 2].position : null;
    // Higher = lower number. Check if this season is higher than last, and last was higher than the one before
    if (position < prevPos && prevPrevPos != null && prevPos < prevPrevPos) {
      achs.push("steady_climb");
    }
  }

  // The Rebuild — win promotion the season after being relegated
  if (!unlockedAchievements.has("the_rebuild") && moveType === "promoted" && lastSeasonMove === "relegated") {
    achs.push("the_rebuild");
  }

  // New Era — 5+ new players not in last season's squad
  if (!unlockedAchievements.has("new_era") && prevSeasonSquadIds && squad) {
    const prevIds = new Set(prevSeasonSquadIds);
    const newPlayers = squad.filter(p => !prevIds.has(p.id)).length;
    if (newPlayers >= 5) achs.push("new_era");
  }

  // Full Circle — prodigal player wins the league with you
  if (!unlockedAchievements.has("full_circle") && position === 1 && squad) {
    if (squad.some(p => p.isProdigal)) {
      achs.push("full_circle");
    }
  }

  // One & Done & Done — beat both single-fixture opponents in Euro Dynasty
  if (league?.singleFixtureOpponents && beatenTeams) {
    const sfo = league.singleFixtureOpponents;
    if (sfo.every(o => beatenTeams.has(o.name))) achs.push("one_and_done");
  }
  // Just Right — play every Euro Dynasty opponent twice in a season
  // Single-fixture opponents are only faced once in the league, so they need a second
  // meeting via the cup tournament OR the dynasty knockout phase
  if (league?.singleFixtureOpponents) {
    const sfoNames = new Set(league.singleFixtureOpponents.map(o => o.name));
    const extraMeetings = new Set(); // SFOs faced outside their single league fixture
    // Check dynasty knockout opponents
    if (dynastyCupBracket) {
      if (dynastyCupBracket.sf1?.result) {
        const pSF = dynastyCupBracket.playerSF === 1 ? dynastyCupBracket.sf1 : dynastyCupBracket.sf2;
        const opp = pSF.home?.isPlayer ? pSF.away : pSF.home;
        if (opp?.name && sfoNames.has(opp.name)) extraMeetings.add(opp.name);
      }
      if (dynastyCupBracket.final?.result) {
        const fOpp = dynastyCupBracket.final.home?.isPlayer ? dynastyCupBracket.final.away : dynastyCupBracket.final.home;
        if (fOpp?.name && sfoNames.has(fOpp.name)) extraMeetings.add(fOpp.name);
      }
    }
    // Check cup opponents (player matches with results)
    if (cup?.rounds) {
      for (const round of Object.values(cup.rounds)) {
        for (const m of (round.matches || [])) {
          if (!m.result) continue;
          const playerInvolved = m.home?.isPlayer || m.away?.isPlayer;
          if (!playerInvolved) continue;
          const opp = m.home?.isPlayer ? m.away : m.home;
          if (opp?.name && sfoNames.has(opp.name)) extraMeetings.add(opp.name);
        }
      }
    }
    // Both SFOs must have been faced a second time
    if ([...sfoNames].every(n => extraMeetings.has(n))) achs.push("just_right");
  }

  // Scooty Puff Jr. — relegated from Intergalactic Elite (tier 1)
  if (moveType === "relegated" && currentTier === 1) achs.push("scooty_puff_jr");

  // Scooty Puff Sr. — win the Intergalactic Elite during 2nd season in it
  if (position === 1 && currentTier === 1 && clubHistory?.seasonArchive) {
    const priorTier1Seasons = clubHistory.seasonArchive.filter(s => s.tier === 1).length;
    // priorTier1Seasons doesn't include the current season (archive hasn't been updated yet)
    if (priorTier1Seasons === 1) achs.push("scooty_puff_sr");
  }

  // Mentality Monsters — won every match the player actually played this
  // season, across every competition (league, cup, and any post-league
  // knockout). Distinct from Centurions (league-only): a perfect league
  // campaign undone by a single cup or knockout loss earns Centurions but
  // not this. calendarResults holds one entry per calendar slot, reset at
  // the start of each season — {won, draw} for matches the player actually
  // played, {spectator: true} for entries simulated without them (didn't
  // qualify, already eliminated). Only the former count.
  if (!unlockedAchievements.has("mentality_monsters") && wonEveryPlayedMatchThisSeason(calendarResults)) {
    achs.push("mentality_monsters");
  }

  // Seller's Remorse — a player traded away this season finishes as the
  // league's top scorer.
  if (!unlockedAchievements.has("sellers_remorse")) {
    const topScorer = getTopScorers(seasonLeagueStats, 1)[0];
    if (topScorer?.name) {
      const soldNames = getPlayersTradedAwayThisSeason(transferHistory, seasonNumber);
      if (soldNames.has(topScorer.name)) achs.push("sellers_remorse");
    }
  }

  // Cold Case — a shortlisted player carried into a second season without being signed.
  if (!unlockedAchievements.has("cold_case") && getStaleShortlistEntries(shortlist, seasonNumber).length > 0) {
    achs.push("cold_case");
  }

  // Just Browsing — burned a dossier on a player this season and never signed him.
  if (!unlockedAchievements.has("just_browsing") && hasUnresolvedDossierBurn(dossierBurns, seasonNumber, squad, transferHistory)) {
    achs.push("just_browsing");
  }

  return achs.filter(id => !unlockedAchievements.has(id));
}

export function wonEveryPlayedMatchThisSeason(calendarResults) {
  const playedEntries = Object.values(calendarResults || {}).filter(e => e && !e.spectator && typeof e.won === "boolean");
  if (playedEntries.length === 0) return false;
  return playedEntries.every(e => e.won === true);
}

export function processSeasonSwaps(rosters, playerLeague, playerTier, allLeagueStates, playerTeamName = null) {
  const standings = {};

  for (let tier = 1; tier <= NUM_TIERS; tier++) {
    if (tier === playerTier && playerLeague?.table) {
      // Player's own league — use real table
      const sorted = [...playerLeague.table].sort((a, b) =>
        b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
      );
      standings[tier] = sorted.map(r => {
        const team = playerLeague.teams[r.teamIndex];
        return { name: team.name, isPlayer: !!team.isPlayer };
      });
    } else if (allLeagueStates?.[tier]?.table?.some(r => r.played > 0)) {
      // Use real simulated standings from the running AI league
      const aiLeague = allLeagueStates[tier];
      const sorted = [...aiLeague.table].sort((a, b) =>
        b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
      );
      standings[tier] = sorted.map(r => ({ name: aiLeague.teams[r.teamIndex].name, isPlayer: false }));
    } else {
      // Fallback: simulate by strength with random noise (no real season data yet)
      const teams = [...(rosters[tier] || [])];
      const simulated = teams.map(t => ({
        name: t.name, isPlayer: false,
        score: t.strength + (Math.random() * 0.3 - 0.15),
      }));
      simulated.sort((a, b) => b.score - a.score);
      standings[tier] = simulated;
    }
  }

  const newRosters = {};
  for (let t = 1; t <= NUM_TIERS; t++) newRosters[t] = [...(rosters[t] || [])];

  // Promotion/relegation: top 3 go up, bottom 3 go down at each tier boundary.
  // Filter player out before slicing so AI team counts are always correct.
  // No artificial caps or resets — let things play out naturally.
  for (let tier = NUM_TIERS; tier >= 2; tier--) {
    const upperTier = tier - 1;
    const lowerStandings = standings[tier] || [];
    const upperStandings = standings[upperTier] || [];

    const promoted = lowerStandings.filter(t => !t.isPlayer).slice(0, 3);
    const relegated = upperStandings.filter(t => !t.isPlayer).slice(-3);

    promoted.forEach(team => {
      const cfg = newRosters[tier].find(t => t.name === team.name);
      if (cfg) {
        newRosters[tier] = newRosters[tier].filter(t => t.name !== team.name);
        newRosters[upperTier].push({ ...cfg, strength: Math.min(1, cfg.strength + 0.05) });
      }
    });
    relegated.forEach(team => {
      const cfg = newRosters[upperTier].find(t => t.name === team.name);
      if (cfg) {
        newRosters[upperTier] = newRosters[upperTier].filter(t => t.name !== team.name);
        newRosters[tier].push({ ...cfg, strength: Math.max(0.1, cfg.strength - 0.05) });
      }
    });
  }

  // Determine player's new tier (top 3 promoted, bottom 3 relegated)
  const playerStanding = standings[playerTier];
  const playerPos = playerStanding?.findIndex(s => s.isPlayer);
  const standingLen = playerStanding?.length || 10;
  let playerNewTier = playerTier;
  if (playerPos != null && playerPos >= 0) {
    if (playerTier > 1 && playerPos <= 2) playerNewTier = playerTier - 1;
    if (playerTier < NUM_TIERS && playerPos >= standingLen - 3) playerNewTier = playerTier + 1;
  }
  // Safety clamp: never jump more than 1 tier
  if (playerNewTier < playerTier - 1) playerNewTier = playerTier - 1;
  if (playerNewTier > playerTier + 1) playerNewTier = playerTier + 1;

  // Season-to-season strength drift
  for (let t = 1; t <= NUM_TIERS; t++) {
    newRosters[t] = newRosters[t].map(cfg => {
      const drift = (Math.random() - 0.45) * 0.08;
      const newStr = Math.max(0.1, Math.min(1.0, cfg.strength + drift));
      return { ...cfg, strength: parseFloat(newStr.toFixed(3)) };
    });
  }

  // Ensure every tier has exactly 10 AI teams — fills any deficit caused by ghost-team loss
  normalizeRosters(newRosters, playerTeamName);

  return { rosters: newRosters, playerNewTier, playerPosition: (playerPos ?? 0) + 1 };
}

// Post-league-position promotion can be overridden by an end-of-season
// knockout. World XI's 5v5 Mini-Tournament forces promotion for its winner,
// runner-up, or third-place playoff winner (top 3 of the bracket), regardless
// of league position. Euro Dynasty's Dynasty Cup only forces promotion for
// its outright winner — a runner-up or semi-finalist gets no bonus and falls
// back to the plain top-3-by-position rule.
export function resolveKnockoutPromotion({ mod, currentTier, position, newTier, miniTournamentBracket, dynastyCupBracket }) {
  if (mod.miniTournament && currentTier > 1 && miniTournamentBracket) {
    const bkt = miniTournamentBracket;
    const runnerUp = bkt.runnerUp || (bkt.winner && bkt.final?.home && bkt.final?.away
      ? (bkt.winner.name === bkt.final.home.name ? bkt.final.away : bkt.final.home)
      : null);
    const thirdPlaceWinner = bkt.thirdPlaceWinner || bkt.thirdPlace?.winner;
    const promoted = bkt.winner?.isPlayer || runnerUp?.isPlayer || thirdPlaceWinner?.isPlayer;
    if (promoted && newTier >= currentTier) return currentTier - 1;
    // When the bracket exists, promotion comes ONLY from the bracket — an
    // incoming newTier that processSeasonSwaps already promoted on league
    // position must be suppressed. Relegation, if already decided, stands.
    return newTier > currentTier ? newTier : currentTier;
  }
  const cupWinnerPromotion = mod.knockoutAtEnd && dynastyCupBracket?.winner?.isPlayer;
  if ((position <= 3 || cupWinnerPromotion) && currentTier > 1 && newTier >= currentTier) {
    return currentTier - 1;
  }
  return newTier;
}

export function initLeague(playerSquad, teamName, tier, rosters, preservedSquads, prestigeLevel = 0) {
  const leagueDef = LEAGUE_DEFS[tier] || LEAGUE_DEFS[2];

  // Use persistent rosters if available, otherwise defaults
  let aiTeamConfigs;
  if (rosters && rosters[tier]) {
    aiTeamConfigs = [...rosters[tier]];
  } else {
    aiTeamConfigs = [...leagueDef.teams];
  }

  // An AI team must never share the player's name — rename any collision.
  // Normally rosters arrive already clean; this catches rosters saved before
  // the guard existed.
  if (aiTeamConfigs.some(c => collidesWithPlayerName(c.name, teamName))) {
    const namesInUse = new Set(aiTeamConfigs.map(c => c.name));
    if (rosters) {
      for (let t = 1; t <= NUM_TIERS; t++) {
        (rosters[t] || []).forEach(r => namesInUse.add(r.name));
      }
    }
    aiTeamConfigs = renameCollisions(aiTeamConfigs, teamName, namesInUse);
  }

  // Ensure exactly 9 AI teams — but never pull teams that are in other tiers' rosters
  while (aiTeamConfigs.length > 9) aiTeamConfigs.pop();
  if (aiTeamConfigs.length < 9) {
    const otherTierNames = new Set();
    if (rosters) {
      for (let t = 1; t <= NUM_TIERS; t++) {
        if (t !== tier && rosters[t]) rosters[t].forEach(r => otherTierNames.add(r.name));
      }
    }
    const existing = new Set(aiTeamConfigs.map(c => c.name));
    // Fill from this tier's defs first, then any other tier's, avoiding
    // duplicates, other-tier teams, and the player's name
    const searchOrder = [tier, ...Array.from({ length: NUM_TIERS }, (_, i) => i + 1).filter(x => x !== tier)];
    for (const t of searchOrder) {
      if (aiTeamConfigs.length >= 9) break;
      (LEAGUE_DEFS[t]?.teams || []).forEach(c => {
        if (aiTeamConfigs.length >= 9) return;
        if (!existing.has(c.name) && !otherTierNames.has(c.name) && !collidesWithPlayerName(c.name, teamName)) {
          aiTeamConfigs.push({ ...c });
          existing.add(c.name);
        }
      });
    }
    // Defs exhausted — top up from the reserve pool, same as normalizeRosters
    for (const c of RESERVE_TEAM_CONFIGS) {
      if (aiTeamConfigs.length >= 9) break;
      if (!existing.has(c.name) && !otherTierNames.has(c.name) && !collidesWithPlayerName(c.name, teamName)) {
        aiTeamConfigs.push({ ...c });
        existing.add(c.name);
      }
    }
  }

  const teams = [{ name: teamName || "Your Team", color: "#4ade80", squad: playerSquad, isPlayer: true, trait: null }];
  aiTeamConfigs.forEach(cfg => {
    const preserved = preservedSquads?.get(cfg.name);
    if (preserved) {
      teams.push({ name: cfg.name, color: cfg.color, squad: preserved, isPlayer: false, trait: cfg.trait });
    } else {
      const extra = Math.max(0, (cfg.squadPhilosophy?.targetSize || 16) - 16);
      teams.push(generateAITeam(cfg.name, cfg.color, cfg.strength, cfg.trait, tier, extra, prestigeLevel, cfg.natMix || null));
    }
  });
  let fixtures = generateFixtures(teams.length);
  let singleFixtureOpponents = null;

  // Tier 3 (Euro Dynasty): 16 fixtures — 2 randomly selected opponents only play the player once
  const mod = getModifier(tier);
  if (mod.dynastyFixtures && fixtures.length > mod.dynastyFixtures) {
    // Pick 2 random AI team indices (1-9, since 0 is player)
    const aiIndices = [];
    for (let i = 1; i < teams.length; i++) aiIndices.push(i);
    // Fisher-Yates partial shuffle to pick 2
    for (let i = aiIndices.length - 1; i > aiIndices.length - 3 && i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [aiIndices[i], aiIndices[j]] = [aiIndices[j], aiIndices[i]];
    }
    const drop1 = aiIndices[aiIndices.length - 1];
    const drop2 = aiIndices[aiIndices.length - 2];
    singleFixtureOpponents = [
      { teamIndex: drop1, name: teams[drop1].name },
      { teamIndex: drop2, name: teams[drop2].name },
    ];

    // Remove one fixture (the second-half/return leg) involving player (team 0) vs each dropped opponent
    // We remove from the second half of the season so the single fixture happens early
    const toRemoveIndices = [];
    const secondHalfStart = Math.floor(fixtures.length / 2);
    for (const dropIdx of [drop1, drop2]) {
      // Find the last fixture involving player vs this opponent (should be in second half)
      let found = -1;
      for (let mw = fixtures.length - 1; mw >= secondHalfStart; mw--) {
        const hasMatch = fixtures[mw].some(f =>
          (f.home === 0 && f.away === dropIdx) || (f.home === dropIdx && f.away === 0)
        );
        if (hasMatch) { found = mw; break; }
      }
      if (found === -1) {
        // Fallback: search first half
        for (let mw = secondHalfStart - 1; mw >= 0; mw--) {
          const hasMatch = fixtures[mw].some(f =>
            (f.home === 0 && f.away === dropIdx) || (f.home === dropIdx && f.away === 0)
          );
          if (hasMatch) { found = mw; break; }
        }
      }
      if (found >= 0) toRemoveIndices.push(found);
    }

    // Remove matchweeks (sort descending to not shift indices)
    toRemoveIndices.sort((a, b) => b - a);
    for (const idx of toRemoveIndices) {
      fixtures.splice(idx, 1);
    }
  }

  // Tier 2 (World XI): 15 fixtures — 3 randomly selected opponents only play the player once
  if (mod.miniTournamentFixtures && fixtures.length > mod.miniTournamentFixtures && !singleFixtureOpponents) {
    const dropCount = fixtures.length - mod.miniTournamentFixtures;
    const aiIdx = [];
    for (let i = 1; i < teams.length; i++) aiIdx.push(i);
    // Fisher-Yates partial shuffle to pick dropCount opponents
    for (let i = aiIdx.length - 1; i > aiIdx.length - 1 - dropCount && i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [aiIdx[i], aiIdx[j]] = [aiIdx[j], aiIdx[i]];
    }
    const dropTeams = aiIdx.slice(aiIdx.length - dropCount);
    singleFixtureOpponents = dropTeams.map(idx => ({ teamIndex: idx, name: teams[idx].name }));

    const toRemove = [];
    const half = Math.floor(fixtures.length / 2);
    for (const dropIdx of dropTeams) {
      let found = -1;
      for (let mw = fixtures.length - 1; mw >= half; mw--) {
        if (fixtures[mw].some(f => (f.home === 0 && f.away === dropIdx) || (f.home === dropIdx && f.away === 0))) {
          found = mw; break;
        }
      }
      if (found === -1) {
        for (let mw = half - 1; mw >= 0; mw--) {
          if (fixtures[mw].some(f => (f.home === 0 && f.away === dropIdx) || (f.home === dropIdx && f.away === 0))) {
            found = mw; break;
          }
        }
      }
      if (found >= 0) toRemove.push(found);
    }
    toRemove.sort((a, b) => b - a);
    for (const idx of toRemove) fixtures.splice(idx, 1);
  }

  const table = teams.map((t, i) => ({
    teamIndex: i,
    played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, points: 0,
  }));
  const league = { teams, fixtures, table, results: [], tier, leagueName: leagueDef.name, leagueColor: leagueDef.color };
  if (singleFixtureOpponents) league.singleFixtureOpponents = singleFixtureOpponents;
  return league;
}

// Initialise a fully simulated AI-only league (no player team) for a given tier.
// Returns a league object compatible with simulateMatchweek.
export function initAILeague(tier, rosters, preservedSquads, prestigeLevel = 0) {
  const leagueDef = LEAGUE_DEFS[tier];
  if (!leagueDef) return null;
  const tierConfigs = [...(rosters?.[tier] || leagueDef.teams || [])];
  if (tierConfigs.length === 0) return null;
  const teams = tierConfigs.map(cfg => {
    const preserved = preservedSquads?.get(cfg.name);
    if (preserved) {
      return { name: cfg.name, color: cfg.color, squad: preserved, isPlayer: false, trait: cfg.trait };
    }
    const extra = Math.max(0, (cfg.squadPhilosophy?.targetSize || 16) - 16);
    return generateAITeam(cfg.name, cfg.color, cfg.strength, cfg.trait, tier, extra, prestigeLevel, cfg.natMix || null);
  });
  const fixtures = generateFixtures(teams.length);
  const table = teams.map((_, i) => ({
    teamIndex: i, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
  }));
  return { teams, fixtures, table, matchweekIndex: 0, tier, leagueName: leagueDef.name, leagueColor: leagueDef.color };
}

// Build an interleaved season calendar: league matches + cup rounds in correct order
// If hasDynasty is true, dynasty knockout entries (SF + Final with training gaps) are appended after the last league MD
export function buildSeasonCalendar(numLeagueMatchdays, cup, hasDynasty = false, hasMiniTournament = false) {
  const calendar = [];
  const cupAfterMD = new Map();
  const cupRounds = cup?.rounds || [];
  cupRounds.forEach((round, roundIdx) => {
    if (round.matchweek != null) cupAfterMD.set(round.matchweek, roundIdx);
  });
  for (let md = 0; md < numLeagueMatchdays; md++) {
    calendar.push({ type: "league", leagueMD: md });
    if (cupAfterMD.has(md)) {
      const ri = cupAfterMD.get(md);
      calendar.push({ type: "cup", cupRound: ri, cupRoundName: cupRounds[ri]?.name || CUP_ROUND_NAMES[ri] || "Cup" });
    }
  }
  if (hasDynasty) {
    // Training between matches happens implicitly via advanceWeek — no explicit entries needed
    calendar.push({ type: "dynasty", round: "sf" });
    calendar.push({ type: "dynasty", round: "final" });
  }
  if (hasMiniTournament) {
    calendar.push({ type: "mini", round: "sf_leg1" });
    calendar.push({ type: "mini", round: "sf_leg2" });
    calendar.push({ type: "mini", round: "third_place" });
    calendar.push({ type: "mini", round: "final" });
  }
  return calendar;
}

// Compute calendarIndex from existing state (for save migration)
export function computeCalendarIndex(calendar, matchweekIndex, cup) {
  let idx = 0;
  for (const entry of calendar) {
    if (entry.type === "league" && entry.leagueMD < matchweekIndex) idx++;
    else if (entry.type === "cup" && entry.cupRound < (cup?.currentRound || 0)) idx++;
    else break;
  }
  return idx;
}

// Count league matchdays consumed before calendarIndex (derives matchweekIndex from calendar position)
export function getLeagueMatchdaysPlayed(calendar, calendarIndex) {
  if (!calendar) return 0;
  let count = 0;
  for (let i = 0; i < calendarIndex && i < calendar.length; i++) {
    if (calendar[i].type === "league") count++;
  }
  return count;
}

export function getCupForTier(tier) {
  for (const [key, def] of Object.entries(CUP_DEFS)) {
    if (def.tiers.includes(tier)) return { key, ...def };
  }
  return { key: "clubman", ...CUP_DEFS.clubman };
}

export function initCup(playerTeamName, leagueTier, currentRosters) {
  const cupDef = getCupForTier(leagueTier);
  const cupTiers = cupDef.tiers;

  const allTeams = [];
  allTeams.push({ name: playerTeamName || "Your Team", tier: leagueTier, isPlayer: true, color: "#4ade80", trait: null, strength: 0.5 });

  if (currentRosters) {
    for (let tier = 1; tier <= NUM_TIERS; tier++) {
      if (!cupTiers.includes(tier)) continue;
      (currentRosters[tier] || []).forEach(cfg => {
        allTeams.push({
          name: cfg.name, tier, isPlayer: false, color: cfg.color || "#94a3b8",
          strength: cfg.strength || 0.5, trait: cfg.trait || null,
        });
      });
    }
  } else {
    for (let tier = 1; tier <= NUM_TIERS; tier++) {
      if (!cupTiers.includes(tier)) continue;
      const def = LEAGUE_DEFS[tier];
      if (!def) continue;
      def.teams.forEach(cfg => {
        allTeams.push({
          name: cfg.name, tier, isPlayer: false, color: cfg.color,
          strength: cfg.strength, trait: cfg.trait,
        });
      });
    }
  }

  // Top teams from highest tier get seeded byes
  const topTierTeams = allTeams.filter(t => !t.isPlayer).sort((a, b) => a.tier - b.tier || b.strength - a.strength);
  // Dynamic bracket sizing — prefer 16 for ≤19 teams, 32 for larger
  let bracketSize = 8;
  if (allTeams.length > 8 && allTeams.length <= 20) bracketSize = 16;
  else if (allTeams.length > 8) bracketSize = 32;

  const maxTeams = bracketSize;
  // If we have too many teams, trim the weakest
  let eligibleTeams = allTeams;
  if (allTeams.length > maxTeams) {
    const player = allTeams.find(t => t.isPlayer);
    const aiSorted = allTeams.filter(t => !t.isPlayer).sort((a, b) => a.tier - b.tier || b.strength - a.strength);
    eligibleTeams = [player, ...aiSorted.slice(0, maxTeams - 1)];
  }

  const eligibleAI = eligibleTeams.filter(t => !t.isPlayer).sort((a, b) => a.tier - b.tier || b.strength - a.strength);
  const numByes = bracketSize - eligibleTeams.length;
  const numSeeded = Math.max(0, Math.min(numByes, Math.min(4, eligibleAI.length)));
  const seededTeams = eligibleAI.slice(0, numSeeded);
  const seededNames = new Set(seededTeams.map(t => t.name));
  const unseededPool = eligibleTeams.filter(t => !seededNames.has(t.name));

  // Shuffle unseeded teams
  const unseeded = unseededPool.slice(0, bracketSize - numSeeded);
  for (let i = unseeded.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unseeded[i], unseeded[j]] = [unseeded[j], unseeded[i]];
  }

  // Build first round matches
  const r1Matches = [];

  // Pair up unseeded teams
  for (let i = 0; i < unseeded.length; i += 2) {
    if (i + 1 < unseeded.length) {
      r1Matches.push({ home: unseeded[i], away: unseeded[i + 1], result: null });
    }
  }

  // Give remaining byes (if odd unseeded or extra seeded slots)
  // Any leftover unseeded gets a bye
  if (unseeded.length % 2 === 1) {
    r1Matches.push({ home: unseeded[unseeded.length - 1], away: null, result: { winner: unseeded[unseeded.length - 1], homeGoals: 0, awayGoals: 0, bye: true } });
  }

  // Seeded teams get byes
  seededTeams.forEach(team => {
    r1Matches.push({ home: team, away: null, result: { winner: team, homeGoals: 0, awayGoals: 0, bye: true } });
  });

  // Shuffle match order so byes aren't all at the bottom
  for (let i = r1Matches.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r1Matches[i], r1Matches[j]] = [r1Matches[j], r1Matches[i]];
  }

  // Build round names based on bracket size
  const roundNames = bracketSize === 32
    ? ["Round of 32", "Round of 16", "Quarter-Finals", "Semi-Finals", "Final"]
    : bracketSize === 16
    ? ["Round of 16", "Quarter-Finals", "Semi-Finals", "Final"]
    : ["Quarter-Finals", "Semi-Finals", "Final"];
  const roundMatchweeks = bracketSize === 32
    ? CUP_ROUND_MATCHWEEKS
    : bracketSize === 16
    ? [CUP_ROUND_MATCHWEEKS[1], CUP_ROUND_MATCHWEEKS[2], CUP_ROUND_MATCHWEEKS[3], CUP_ROUND_MATCHWEEKS[4]]
    : [CUP_ROUND_MATCHWEEKS[2], CUP_ROUND_MATCHWEEKS[3], CUP_ROUND_MATCHWEEKS[4]];

  const rounds = roundNames.map((name, i) => ({
    name,
    matches: i === 0 ? r1Matches : [],
    matchweek: roundMatchweeks[i] || CUP_ROUND_MATCHWEEKS[i],
  }));

  return { rounds, seededTeams, currentRound: 0, playerEliminated: false, cupName: cupDef.name, cupIcon: cupDef.icon, cupColor: cupDef.color };
}

// teamLookup: (name, tier) => storedTeamObject | null — provided by App.jsx so cup
// AI vs AI matches use the same persistent squads as league simulation.
//
// onAIMatchSimulated: (homeTeam, awayTeam, simResult, roundIdx) => void
// Called once per AI vs AI match that ran simulateMatch with full squads, so
// callers can feed the events into the canonical cup-stats accumulator.
// Skipped on the strength-formula fallback path (no events available).
export function advanceCupRound(cup, playerSquad, startingXI, bench, teamLookup = null, onAIMatchSimulated = null) {
  const roundIdx = cup.currentRound;
  if (roundIdx >= cup.rounds.length) return cup;

  const round = cup.rounds[roundIdx];
  let playerMatch = null;
  let playerMatchIdx = -1;

  // Deep copy matches for immutability
  const updatedMatches = round.matches.map((match, mIdx) => {
    if (match.result) return match; // already resolved (bye)

    if (match.home?.isPlayer || match.away?.isPlayer) {
      playerMatch = match;
      playerMatchIdx = mIdx;
      return match; // don't resolve yet
    }

    // AI vs AI — use stored squads via simulateMatch for authentic results.
    // Falls back to strength formula only when squad data isn't available.
    let hg, ag;
    let goalScorers = null;
    const homeTeam = teamLookup?.(match.home.name, match.home.tier);
    const awayTeam = teamLookup?.(match.away.name, match.away.tier);
    if (homeTeam?.squad && awayTeam?.squad) {
      const result = simulateMatch(homeTeam, awayTeam, null, null, false, 1.0);
      hg = result.homeGoals;
      ag = result.awayGoals;
      goalScorers = (result.events || [])
        .filter(e => e.type === "goal")
        .map(e => ({ name: e.player, assister: e.assister || null, side: e.side, minute: e.minute }));
      if (onAIMatchSimulated) {
        onAIMatchSimulated(homeTeam, awayTeam, result, roundIdx);
      }
    } else {
      const homeAdj = (match.home.strength || 0.5) + (Math.random() * 0.3 - 0.15);
      const awayAdj = (match.away.strength || 0.5) + (Math.random() * 0.3 - 0.15);
      hg = Math.max(0, Math.floor(Math.random() * 3 + homeAdj * 2));
      ag = Math.max(0, Math.floor(Math.random() * 3 + awayAdj * 2));
    }

    if (hg === ag) {
      const penHome = Math.floor(Math.random() * 3) + 2;
      const penAway = penHome === 4 ? (Math.random() < 0.5 ? 3 : 5) : (Math.random() < 0.5 ? penHome - 1 : penHome + 1);
      const penWinner = penHome > penAway ? match.home : match.away;
      return {
        ...match,
        result: { homeGoals: hg, awayGoals: ag, winner: penWinner, penalties: { homeScore: penHome, awayScore: penAway }, goalScorers: goalScorers || [] },
      };
    }
    return {
      ...match,
      result: { homeGoals: hg, awayGoals: ag, winner: hg > ag ? match.home : match.away, goalScorers: goalScorers || [] },
    };
  });

  const newRounds = cup.rounds.map((r, i) => i === roundIdx ? { ...r, matches: updatedMatches } : r);
  const updatedCup = { ...cup, rounds: newRounds };

  if (playerMatch && !playerMatch.result) {
    return { ...updatedCup, pendingPlayerMatch: playerMatch };
  }

  return buildNextCupRound(updatedCup);
}

export function buildNextCupRound(cup) {
  const roundIdx = cup.currentRound;
  if (roundIdx >= cup.rounds.length) {
    return { ...cup, playerEliminated: true };
  }
  const round = cup.rounds[roundIdx];
  const winners = round.matches.map(m => m.result?.winner).filter(Boolean);

  // Check if player was eliminated
  const playerStillIn = winners.some(w => w.isPlayer);
  const playerEliminated = cup.playerEliminated || !playerStillIn;

  const nextRoundIdx = roundIdx + 1;
  if (nextRoundIdx >= cup.rounds.length) {
    // Cup is over
    return { ...cup, currentRound: nextRoundIdx, playerEliminated, winner: winners[0] || null };
  }

  // Shuffle winners for the next draw
  let nextTeams = [...winners];
  for (let i = nextTeams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nextTeams[i], nextTeams[j]] = [nextTeams[j], nextTeams[i]];
  }

  const nextMatches = [];
  const isFinal = nextRoundIdx === cup.rounds.length - 1;
  for (let i = 0; i < nextTeams.length; i += 2) {
    if (i + 1 < nextTeams.length) {
      const t1 = nextTeams[i], t2 = nextTeams[i + 1];
      if (isFinal) {
        // Final is at a neutral venue — still need home/away for simulation but mark as neutral
        nextMatches.push({ home: t1, away: t2, neutral: true, result: null });
      } else if (t1.isPlayer || t2.isPlayer) {
        // Alternate player's H/A based on round number
        const playerHome = nextRoundIdx % 2 === 0;
        if (t1.isPlayer) {
          nextMatches.push(playerHome ? { home: t1, away: t2, result: null } : { home: t2, away: t1, result: null });
        } else {
          nextMatches.push(playerHome ? { home: t2, away: t1, result: null } : { home: t1, away: t2, result: null });
        }
      } else {
        nextMatches.push({ home: t1, away: t2, result: null });
      }
    } else {
      nextMatches.push({ home: nextTeams[i], away: null, result: { winner: nextTeams[i], homeGoals: 0, awayGoals: 0, bye: true } });
    }
  }

  const newRounds = cup.rounds.map((r, i) => i === nextRoundIdx ? { ...r, matches: nextMatches } : r);

  return {
    ...cup,
    rounds: newRounds,
    currentRound: nextRoundIdx,
    playerEliminated,
  };
}
