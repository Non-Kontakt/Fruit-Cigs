import { getTopScorers } from "./competitionStats.js";
import { POSITION_TYPES } from "../data/positions.js";
import { getLastName } from "./player.js";
import { sortStandings } from "./league.js";
import { getSurname, getInitial } from "./matchEvents.js";

/**
 * End-of-season individual awards: Golden Boot, Player of the Season, Young
 * Player of the Season. Fired from the Awards Night summer beat
 * (useSeasonFlow.js) once the league's canonical season stats are in.
 *
 * --- Golden Boot ---
 * Pure top-scorer lookup over the canonical per-tier league stats
 * (seasonLeagueStatsByTier[tier], read the same way LeaguePage's Stats tab
 * does via competitionStats.getTopScorers). No apps threshold — matches the
 * existing "bag_man" achievement's own top-scorer read in utils/league.js,
 * which also applies none.
 *
 * --- Player of the Season / Young Player of the Season ---
 * League-wide, not player-squad-only. The player's own squad has a REAL
 * average match rating (playerRatingTracker, keyed by player id) plus real
 * season goals/assists/apps (playerSeasonStats, keyed by player name). AI
 * squads have no tracked per-match rating at all — only goals/cards via the
 * canonical league stats blob — so their rating is synthesized from team
 * results.
 *
 * The synthesis is NOT invented here: it is lifted as-is from LeaguePage.jsx's
 * `teamOfSeason` memo (the Team of the Season XI already shown on the League
 * page), which blends a team-performance base rating with each AI player's
 * individual goal/card contribution. See `syntheticAIRating` below for the
 * exact formula, reproduced line-for-line from that memo.
 *
 * Unified score (also lifted from the same memo):
 *
 *   score = (avgRating ?? 6.0) * 10 + goals * 1.5 + apps * 0.2
 *
 * avgRating is real (player squad) or synthetic (AI squad); goals and apps
 * are real for both — apps from playerSeasonStats for the player's squad,
 * `played` (team matches played) for AI squad starters, since AI starters
 * are assumed to start every match (same assumption teamOfSeason makes).
 *
 * MIN_APPS = 5: reused from teamOfSeason's own player-squad candidate filter
 * (`apps < 5` is excluded there). On an 18-match season that's a little
 * under a third of the fixtures — enough to keep a 3-game-cameo player from
 * winning the club's top individual honour, without requiring an unrealistic
 * ever-present campaign.
 *
 * YOUNG_AGE_CUTOFF = 21: standard "young player" cutoff. Age is available
 * for BOTH the player's own squad (player.age) and AI squads (AI player
 * objects carry `age` too — see utils/player.js generateAITeam/evolveAISquad)
 * so Young Player of the Season is genuinely league-wide, not scoped down to
 * the player's own squad.
 *
 * All three handle a thin/empty season (fresh save mid-summer, or a season
 * with no qualifying candidates) by returning `null` for that award — no
 * candidates, no crash, no message.
 */

const MIN_APPS = 5;
const YOUNG_AGE_CUTOFF = 21;
const NOMINEE_COUNT = 3;

// Simple deterministic hash for per-player rating variety — reproduced from
// LeaguePage.jsx's teamOfSeason memo so the same AI player gets the same
// "personality" variance here as they would on the League page.
function nameHash(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return (Math.abs(h) % 100) / 100;
}

/**
 * Synthetic 5.5–9.5 rating for an AI player, blended from their team's
 * season results plus their individual goal/card contribution. Reproduced
 * from LeaguePage.jsx's teamOfSeason memo — do not tune independently of it.
 */
function syntheticAIRating({ position, goals, cardCount, played, winRate, drawRate, gpg, cpg }) {
  const teamBase = 6.0 + winRate * 1.6 + drawRate * 0.4 + Math.min(gpg * 0.15, 0.4) - Math.min(cpg * 0.1, 0.3);
  const posType = POSITION_TYPES[position] || "MID";
  const goalsPerGame = played > 0 ? goals / played : 0;
  let rating = teamBase;
  if (posType === "FWD") rating += goalsPerGame * 1.5;
  else if (posType === "MID") rating += goalsPerGame * 2.5;
  else if (posType === "DEF") rating += goalsPerGame * 4.0;
  else rating += goalsPerGame * 3.0; // GK
  if (posType === "GK" || posType === "DEF") rating += Math.max(0, (1.0 - cpg) * 0.4);
  if (played > 0) rating -= (cardCount / played) * 0.3;
  return Math.max(5.5, Math.min(9.5, rating));
}

function score({ avgRating, goals, apps }) {
  const r = avgRating != null ? avgRating : 6.0;
  return r * 10 + goals * 1.5 + apps * 0.2;
}

/**
 * Build the league-wide candidate pool for Player of the Season / Young
 * Player of the Season: the player's own squad (real rating) plus every AI
 * squad in the player's league (synthetic rating).
 */
function buildCandidates({ squad, teamName, playerSeasonStats, playerRatingTracker, league, seasonLeagueStats }) {
  const candidates = [];

  // Per-player goals/cards for AI players, keyed the same way LeaguePage's
  // `leagueStats` derivation reads the canonical tier blob.
  const aiScorers = {}, aiCards = {}, aiAssists = {};
  const statsPlayers = seasonLeagueStats?.players || {};
  for (const p of Object.values(statsPlayers)) {
    if (p.teamId == null) continue;
    const key = `${p.name}|${p.teamId}`;
    if (p.goals > 0) aiScorers[key] = p.goals;
    if (p.assists > 0) aiAssists[key] = p.assists;
    const cards = (p.yellows || 0) + (p.reds || 0);
    if (cards > 0) aiCards[key] = cards;
  }

  // Player's own squad — real tracked data.
  if (squad && playerSeasonStats) {
    squad.forEach(p => {
      const s = playerSeasonStats[p.name] || {};
      const apps = s.apps || 0;
      if (apps < MIN_APPS) return;
      const ratings = (playerRatingTracker || {})[p.id] || [];
      const avgRating = ratings.length > 0
        ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
        : null;
      const goals = s.goals || 0;
      candidates.push({
        name: p.name, teamName: teamName || "", age: p.age ?? null,
        goals, assists: s.assists || 0, apps, avgRating,
        isPlayerTeam: true,
        score: score({ avgRating, goals, apps }),
      });
    });
  }

  // AI squads — synthetic rating from team results + individual contribution.
  (league?.teams || []).forEach((team, teamIdx) => {
    if (team.isPlayer || !team.squad) return;
    const row = league?.table?.find(r => r.teamIndex === teamIdx);
    if (!row) return;
    const played = row.won + row.drawn + row.lost;
    if (played < MIN_APPS) return;
    const winRate = row.won / played;
    const drawRate = row.drawn / played;
    const gpg = row.goalsFor / played;
    const cpg = row.goalsAgainst / played;

    team.squad.forEach(p => {
      if (p.isBench) return;
      const key = `${p.name}|${teamIdx}`;
      const goals = aiScorers[key] || 0;
      const assists = aiAssists[key] || 0;
      const cardCount = aiCards[key] || 0;
      const baseRating = syntheticAIRating({ position: p.position, goals, cardCount, played, winRate, drawRate, gpg, cpg });
      const avgRating = parseFloat((baseRating + (nameHash(p.name) - 0.5) * 0.6).toFixed(1));
      candidates.push({
        name: p.name, teamName: team.name || "", age: p.age ?? null,
        goals, assists, apps: played, avgRating,
        isPlayerTeam: false,
        score: score({ avgRating, goals, apps: played }),
      });
    });
  });

  return candidates;
}

function pickAward(candidates, limit = NOMINEE_COUNT) {
  if (!candidates || candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const nominees = sorted.slice(0, limit);
  return { winner: nominees[0], nominees };
}

/** Golden Boot: pure top-scorer lookup, no apps threshold (matches bag_man). */
export function computeGoldenBoot(seasonLeagueStats, limit = NOMINEE_COUNT) {
  const top = getTopScorers(seasonLeagueStats, limit);
  if (top.length === 0) return null;
  const nominees = top.map(p => ({ name: p.name, teamName: p.teamName || "", goals: p.goals }));
  return { winner: nominees[0], nominees };
}

/**
 * Compute all three end-of-season awards. Returns `null` per award when
 * there isn't enough data to name one (fresh save, thin/interrupted season).
 *
 * @returns {{ goldenBoot: object|null, playerOfSeason: object|null, youngPlayerOfSeason: object|null }}
 */
export function computeSeasonAwards({ squad, teamName, playerSeasonStats, playerRatingTracker, league, seasonLeagueStats }) {
  const goldenBoot = computeGoldenBoot(seasonLeagueStats);
  const candidates = buildCandidates({ squad, teamName, playerSeasonStats, playerRatingTracker, league, seasonLeagueStats });
  const playerOfSeason = pickAward(candidates);
  const youngCandidates = candidates.filter(c => c.age != null && c.age <= YOUNG_AGE_CUTOFF);
  const youngPlayerOfSeason = pickAward(youngCandidates);
  return { goldenBoot, playerOfSeason, youngPlayerOfSeason };
}

// ---------------------------------------------------------------------------
// Inbox copy — nominees-then-winner, in the game's tabloid-adjacent voice.
// Pure string builders so the wording is testable without touching the hook.
// ---------------------------------------------------------------------------

function shortName(name) {
  return getLastName(name) || name;
}

function fmtRating(avgRating) {
  return avgRating != null ? avgRating.toFixed(1) : "—";
}

/**
 * Build a display-name array aligned index-for-index with a nominee list,
 * disambiguating surname collisions with a first-initial prefix
 * ("B. Hill" / "T. Hill"). Non-colliding names stay surname-only. Mirrors
 * the tier-2 collision rule from matchEvents.js's buildScorerDisplayMap
 * (reusing its getSurname/getInitial helpers) rather than inventing new
 * name-splitting logic.
 *
 * Deliberately keyed by array position, not by n.name: player names are
 * only guaranteed unique within a squad, so two different clubs can each
 * nominate a "Ben Hill" — a name-keyed map would collapse them into one
 * shared entry and both would render "B. Hill". When first-initial +
 * surname still collides (identical full names from different clubs), the
 * nominee's teamName is appended: "B. Hill (Rovers)" vs "B. Hill (United)".
 */
function buildNomineeDisplayNames(nominees) {
  const bySurname = {};
  nominees.forEach(n => {
    const sn = getSurname(n.name) || shortName(n.name) || n.name;
    (bySurname[sn] || (bySurname[sn] = [])).push(n);
  });
  const byInitialSurname = {};
  nominees.forEach(n => {
    const sn = getSurname(n.name) || shortName(n.name) || n.name;
    if (bySurname[sn].length <= 1) return;
    const initial = getInitial(n.name);
    const key = initial ? `${initial}. ${sn}` : (shortName(n.name) || n.name);
    (byInitialSurname[key] || (byInitialSurname[key] = [])).push(n);
  });
  return nominees.map(n => {
    const sn = getSurname(n.name) || shortName(n.name) || n.name;
    if (bySurname[sn].length <= 1) return shortName(n.name) || n.name;
    const initial = getInitial(n.name);
    const initialSurname = initial ? `${initial}. ${sn}` : (shortName(n.name) || n.name);
    if (byInitialSurname[initialSurname].length <= 1) return initialSurname;
    return n.teamName ? `${initialSurname} (${n.teamName})` : initialSurname;
  });
}

export function buildGoldenBootBody(goldenBoot) {
  if (!goldenBoot) return null;
  const { winner, nominees } = goldenBoot;
  const displayNames = buildNomineeDisplayNames(nominees);
  const list = nominees.map((n, i) => `${displayNames[i]} (${n.goals})`).join(", ");
  return `THE GOLDEN BOOT — nominees: ${list}. Winner: ${winner.name.toUpperCase()} — ${winner.goals} league goal${winner.goals !== 1 ? "s" : ""}.`;
}

export function buildYoungPlayerOfSeasonBody(youngPlayerOfSeason) {
  if (!youngPlayerOfSeason) return null;
  const { winner, nominees } = youngPlayerOfSeason;
  const displayNames = buildNomineeDisplayNames(nominees);
  const list = nominees.map((n, i) => `${displayNames[i]} (${fmtRating(n.avgRating)} avg, ${n.goals}g)`).join(", ");
  const ageStr = winner.age != null ? ` (age ${winner.age})` : "";
  return `YOUNG PLAYER OF THE SEASON — nominees: ${list}. Winner: ${winner.name.toUpperCase()}${ageStr} — ${fmtRating(winner.avgRating)} avg rating, ${winner.goals} goal${winner.goals !== 1 ? "s" : ""}.`;
}

export function buildPlayerOfSeasonBody(playerOfSeason) {
  if (!playerOfSeason) return null;
  const { winner, nominees } = playerOfSeason;
  const displayNames = buildNomineeDisplayNames(nominees);
  const list = nominees.map((n, i) => `${displayNames[i]} (${fmtRating(n.avgRating)} avg, ${n.goals}g)`).join(", ");
  return `PLAYER OF THE SEASON — nominees: ${list}. Winner: ${winner.name.toUpperCase()} — ${fmtRating(winner.avgRating)} avg rating, ${winner.goals} goal${winner.goals !== 1 ? "s" : ""}, ${winner.assists || 0} assist${winner.assists === 1 ? "" : "s"}.`;
}

export const __test = { MIN_APPS, YOUNG_AGE_CUTOFF, NOMINEE_COUNT, syntheticAIRating, nameHash, score };

// ---------------------------------------------------------------------------
// Quince Cigs — Awards Night achievements. Pure so the ten live checks are
// testable against synthetic award objects without touching useSeasonFlow.js.
// ---------------------------------------------------------------------------
export function collectAwardsNightAchievements({ awards, squad, teamName, playerSeasonStats, league, unlockedAchievements, awardsHistory }) {
  const unlocked = unlockedAchievements || new Set();
  const achs = [];
  const add = (id) => { if (!unlocked.has(id) && !achs.includes(id)) achs.push(id); };
  const { goldenBoot, playerOfSeason, youngPlayerOfSeason } = awards || {};
  const pots = playerOfSeason?.winner || null;
  const ypots = youngPlayerOfSeason?.winner || null;
  const gb = goldenBoot?.winner || null;

  // Repeat Offender — this season's POTS winner (name + team) matches a
  // prior season's POTS winner. awardsHistory holds entries from PRIOR
  // seasons only — this season's entry is appended by the caller after
  // this check runs.
  if (pots) {
    const repeat = (awardsHistory || []).some(entry => entry.potsName === pots.name && entry.potsTeam === pots.teamName);
    if (repeat) add("repeat_offender");
  }

  if (pots?.isPlayerTeam) {
    add("top_of_the_bill");
    if (pots.age != null && pots.age >= 33) add("no_country_for_old_men");
    const squadPlayer = (squad || []).find(p => p.name === pots.name);
    if (squadPlayer) {
      const posType = POSITION_TYPES[squadPlayer.position];
      if (posType === "DEF" || posType === "GK") add("defenders_no_respect");
    }
  }

  if (ypots?.isPlayerTeam) {
    const squadPlayer = (squad || []).find(p => p.name === ypots.name);
    if (squadPlayer && (squadPlayer.isYouthIntake || squadPlayer.isYouthCoup)) add("raised_right");
  }

  if (pots && ypots && pots.name === ypots.name) add("doing_it_all");

  if (pots?.isPlayerTeam && ypots?.isPlayerTeam && gb && gb.teamName === teamName) add("clean_sweep");

  if (gb) {
    const outscored = (squad || []).some(p => {
      const stat = (playerSeasonStats || {})[p.name];
      return (stat?.goals || 0) >= 20 && p.name !== gb.name;
    });
    if (outscored) add("robbed");
  }

  if (pots && ypots && gb && pots.teamName === ypots.teamName && pots.teamName === gb.teamName && pots.teamName !== teamName) {
    add("class_of_their_own");
  }

  if (gb && gb.teamName === teamName && league?.table) {
    const sorted = sortStandings(league.table);
    const posIdx = sorted.findIndex(r => league.teams?.[r.teamIndex]?.isPlayer);
    if (posIdx >= 5) add("carried"); // 0-indexed: position 6+ in a 10-team league is the bottom half
  }

  return achs;
}
