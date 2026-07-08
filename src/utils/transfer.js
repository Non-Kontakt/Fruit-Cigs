import { getOverall, pickRandom, getOOPPenalty } from "./calc.js";
import { getEffectiveSlots } from "./formation.js";
import { POSITION_TYPES } from "../data/positions.js";

/**
 * Calculate a player's transfer value using exponential OVR curve with adjustments
 * @param {Object} player - Player object with attrs, age, potential, position
 * @returns {number} Transfer value in points
 */
export function getPlayerValue(player) {
  const ovr = getOverall(player);

  // Base value (exponential to make elite players much more valuable)
  const baseValue = Math.pow(ovr / 10, 2.5) * 100;

  // Age curve (peak 24-28, decline after 30)
  const ageFactor = player.age < 24 ? 1.0
    : player.age <= 28 ? 1.15
    : player.age <= 30 ? 1.0
    : 0.85;

  // Potential bonus (only for young players)
  const potentialBonus = player.age < 24 ? ((player.potential || ovr) - ovr) * 0.05 : 0;

  // Position adjustment (GK slightly less valuable)
  const positionFactor = player.position === "GK" ? 0.9 : 1.0;

  return Math.round((baseValue * ageFactor + potentialBonus) * positionFactor);
}

/**
 * Get discount multiplier based on relationship percentage
 * @param {number} relationshipPct - Relationship percentage (0-100)
 * @returns {number} Discount (0.0-0.4)
 */
export function getRelationshipDiscount(relationshipPct) {
  if (relationshipPct < 25) return 0;       // Stranger: no discount
  if (relationshipPct < 50) return 0.10;    // Acquaintance: 10%
  if (relationshipPct < 80) return 0.20;    // Friendly: 20%
  if (relationshipPct < 100) return 0.30;   // Allied: 30%
  return 0.40;                               // Partners: 40%
}

/**
 * Check if a trade is balanced (user offers enough value)
 * @param {Array} userPlayers - Players offered by user
 * @param {Array} aiPlayers - Players requested from AI
 * @param {number} discount - Relationship discount (0.0-0.4)
 * @returns {boolean} True if trade is fair
 */
export function isTradeBalanced(userPlayers, aiPlayers, discount) {
  const userValue = userPlayers.reduce((sum, p) => sum + getPlayerValue(p), 0);
  const aiValue = aiPlayers.reduce((sum, p) => sum + getPlayerValue(p), 0);
  return userValue >= aiValue * (1 - discount) * 0.95; // discount reduces AI asking price
}

/**
 * Calculate total value of an array of players
 * @param {Array} players - Array of player objects
 * @returns {number} Total value in points
 */
export function getTotalValue(players) {
  return players.reduce((sum, p) => sum + getPlayerValue(p), 0);
}

/**
 * Calculate OVR and potential changes for a loaned-out player upon return
 * Called at loan time (not return) to prevent save-scumming
 * @param {Object} player - Player being loaned
 * @param {number} destinationTier - Tier of destination club (1=best)
 * @param {number} playerTier - Player's current club tier
 * @param {number} relationship - Relationship % with destination club
 * @returns {Object} {ovrDelta, potDelta}
 */
export function calculateLoanReturn(player, destinationTier, playerTier, relationship) {
  // OVR change: -1 to +2
  let ovrDelta = Math.random() < 0.6 ? 1 : 0; // Base 60% chance +1

  // Tier bonus: +1 if loaned to higher tier club
  if (destinationTier < playerTier) ovrDelta += 1;

  // Penalty for loaning to much lower tier
  if (destinationTier > playerTier + 2) ovrDelta -= 1;

  // Age factors
  if (player.age < 21) ovrDelta += 0; // No penalty for youth
  if (player.age > 30) ovrDelta -= 1; // Decline for veterans

  // Randomness: -1 to +1
  ovrDelta += Math.floor(Math.random() * 3) - 1;

  // Clamp to -1 to +2 range
  ovrDelta = Math.max(-1, Math.min(2, ovrDelta));

  // Potential swing: -3 to +5 (wild FIFA-style variance)
  let potDelta = Math.floor(Math.random() * 9) - 3; // -3 to +5

  // Young players protected from severe potential drops
  if (player.age < 23) potDelta = Math.max(potDelta, -1);

  return { ovrDelta, potDelta };
}

/**
 * Generate AI-initiated transfer offers based on relationships
 * @param {Object} clubRelationships - Map of club name → {pct, tier}
 * @param {Array} squad - Player's squad
 * @param {Object} allLeagueStates - All AI league states
 * @returns {Array} Array of offer objects {aiClub, aiWants, aiOffers, relationship}
 */
export function generateAITransferOffers(clubRelationships, squad, allLeagueStates) {
  const offers = [];

  // Only generate offers from clubs with 50%+ relationship
  const eligibleClubs = Object.entries(clubRelationships)
    .filter(([_, data]) => data.pct >= 50)
    .map(([name, data]) => ({ name, ...data }));

  if (eligibleClubs.length === 0) return offers;

  // Generate 1-3 random offers (no duplicate clubs or target players)
  const offerCount = Math.min(3, Math.floor(Math.random() * 3) + 1);
  const shuffledClubs = [...eligibleClubs].sort(() => Math.random() - 0.5);
  const usedPlayerIds = new Set();

  for (let i = 0; i < offerCount && i < shuffledClubs.length; i++) {
    const offer = buildOfferForClub(shuffledClubs[i], squad, allLeagueStates, usedPlayerIds);
    if (offer) offers.push(offer);
  }

  return offers;
}

/**
 * Build one valid swap offer from a specific club, or null when the club
 * can't produce one (no AI squad, every user player already targeted, no
 * value-matched return player). Adds the wanted player's id to usedPlayerIds
 * on success so callers keep the no-duplicate-targets rule.
 */
function buildOfferForClub(club, squad, allLeagueStates, usedPlayerIds) {
  const aiTeam = findAITeamInLeagues(club.name, allLeagueStates);
  if (!aiTeam || !aiTeam.squad || aiTeam.squad.length === 0) return null;

  // AI wants: Random player from user squad (prefer lower OVR, skip already-targeted)
  const userSquadSorted = [...squad]
    .filter(p => !usedPlayerIds.has(p.id))
    .sort((a, b) => getOverall(a) - getOverall(b));
  if (userSquadSorted.length === 0) return null;
  const aiWants = [pickRandom(userSquadSorted.slice(0, 5))];

  // AI offers: Random player from their squad (similar value)
  const targetValue = getPlayerValue(aiWants[0]);
  const aiSquadFiltered = aiTeam.squad.filter(p => {
    const val = getPlayerValue(p);
    return val >= targetValue * 0.8 && val <= targetValue * 1.2;
  });
  if (aiSquadFiltered.length === 0) return null;

  const aiOffers = [pickRandom(aiSquadFiltered)];
  usedPlayerIds.add(aiWants[0].id);

  return {
    aiClubName: club.name,
    aiClubTier: club.tier,
    aiWants,
    aiOffers,
    relationship: club.pct,
    expiresWeeks: 3 // Offer expires after 3 weeks
  };
}

/**
 * The Little Black Book (Club Focus): deterministically try to produce ONE
 * additional valid offer from the best-relationship eligible club not already
 * represented in `offers`, respecting the no-duplicate-target rule. Returns
 * the offer or null — the caller must only consume the one-off when an offer
 * actually landed.
 */
export function generateExtraTransferOffer(clubRelationships, squad, allLeagueStates, offers) {
  const represented = new Set((offers || []).map(o => o.aiClubName));
  const usedPlayerIds = new Set((offers || []).flatMap(o => (o.aiWants || []).map(p => p.id)));
  const candidates = Object.entries(clubRelationships || {})
    .filter(([name, data]) => data.pct >= 50 && !represented.has(name))
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => (b.pct - a.pct) || a.name.localeCompare(b.name));
  for (const club of candidates) {
    const offer = buildOfferForClub(club, squad, allLeagueStates, usedPlayerIds);
    if (offer) return offer;
  }
  return null;
}

/**
 * Helper: Find AI team by name across all league states
 */
function findAITeamInLeagues(clubName, allLeagueStates) {
  for (const tier in allLeagueStates) {
    const leagueState = allLeagueStates[tier];
    if (!leagueState?.teams) continue;

    const team = leagueState.teams.find(t => t.name === clubName && !t.isPlayer);
    if (team) return team;
  }
  return null;
}

/**
 * Get available players for loan IN from a club
 * @param {Object} aiTeam - AI team object with squad
 * @param {number} squadAvgOvr - Player's squad average OVR
 * @param {number} relationship - Relationship % with club
 * @returns {Array} Available players (2-4 OVR above squad avg, age 22-32)
 */
export function getAvailableLoanPlayers(aiTeam, squadAvgOvr, relationship) {
  if (!aiTeam || !aiTeam.squad) return [];

  const minOvr = squadAvgOvr + 2;
  const maxOvr = squadAvgOvr + 4;

  const available = aiTeam.squad.filter(p => {
    const ovr = getOverall(p);
    return ovr >= minOvr && ovr <= maxOvr && p.age >= 22 && p.age <= 32;
  });

  // Number of offers based on relationship
  const maxOffers = relationship >= 80 ? 3 : relationship >= 50 ? 2 : 1;

  // Shuffle and take first N
  return available.sort(() => Math.random() - 0.5).slice(0, maxOffers);
}

/**
 * Ratio of what an AI-initiated offer hands back vs. what it asks for —
 * getTotalValue(aiOffers) / getTotalValue(aiWants). Drives Daylight Robbery
 * (ratio >= 2) and Fire Sale (ratio < 0.5) at accept time.
 * @param {{ aiWants: Array, aiOffers: Array }} offer
 * @returns {number} 0 when aiWants has no value (nothing to compare against)
 */
export function getOfferValueRatio(offer) {
  const given = getTotalValue(offer?.aiWants || []);
  const received = getTotalValue(offer?.aiOffers || []);
  if (given <= 0) return 0;
  return received / given;
}

/**
 * Count distinct target players (by id) requested across a set of live
 * incoming offers — Everyone Has A Price fires once 3+ different players
 * are simultaneously wanted.
 * @param {Array} offers - live transferOffers array
 * @returns {number}
 */
export function countDistinctOfferTargets(offers) {
  const ids = new Set();
  (offers || []).forEach(o => (o.aiWants || []).forEach(p => { if (p?.id != null) ids.add(p.id); }));
  return ids.size;
}

/**
 * Decrement every offer's expiry by one week, dropping any that reach zero.
 * Reports whether at least one offer actually expired this tick (Let It
 * Ride), distinct from offers that were simply rejected/accepted already.
 * @param {Array} offers
 * @returns {{ offers: Array, anyExpired: boolean }}
 */
export function decrementOfferExpiry(offers) {
  const decremented = (offers || []).map(o => ({ ...o, expiresWeeks: (o.expiresWeeks || 1) - 1 }));
  return {
    offers: decremented.filter(o => o.expiresWeeks > 0),
    anyExpired: decremented.some(o => o.expiresWeeks <= 0),
  };
}

/**
 * Names of every player who left the squad via a trade logged this season
 * (both direct trades and accepted incoming offers log their departing
 * player(s) under `offered` — see TransfersPage's handleTradeConfirm and
 * handleAcceptOffer). Used by Seller's Remorse to check the season's top
 * scorer against who was sold.
 * @param {Array} transferHistory
 * @param {number} seasonNumber
 * @returns {Set<string>}
 */
export function getPlayersTradedAwayThisSeason(transferHistory, seasonNumber) {
  const names = new Set();
  (transferHistory || []).forEach(t => {
    if (t.season !== seasonNumber) return;
    (t.offered || []).forEach(p => { if (p?.name) names.add(p.name); });
  });
  return names;
}

/**
 * Whether a window-scoped rejection count has crossed the Under Siege
 * threshold — reject 5 offers in a single transfer window.
 * @param {number} nextCount - the count after incrementing for this rejection
 * @returns {boolean}
 */
export function reachedUnderSiegeThreshold(nextCount) {
  return nextCount >= 5;
}

/**
 * Loyalty Repaid — resolve the watched (rejected-offer) player's appearance
 * in a just-completed match. The watch is "his next match", not "keep
 * checking forever", so it resolves — clears — the moment he actually
 * appears, whatever the result. Compares against the player's current
 * match-log name (not the name snapshotted at rejection time) so a rename
 * ticket used in between doesn't break the match.
 * @param {{ playerId: string, playerName: string } | null} watch
 * @param {Set<string>} appearedIds - player ids who appeared in this match
 * @param {string | null} winningGoalScorerName - name of whoever scored the winner, if any
 * @param {string | undefined} watchedPlayerCurrentName - the watched player's name as of this match
 * @returns {{ appeared: boolean, scoredWinner: boolean }}
 */
export function resolveLoyaltyWatch(watch, appearedIds, winningGoalScorerName, watchedPlayerCurrentName) {
  if (!watch || !appearedIds?.has(watch.playerId)) return { appeared: false, scoredWinner: false };
  const scoredWinner = winningGoalScorerName != null && winningGoalScorerName === watchedPlayerCurrentName;
  return { appeared: true, scoredWinner };
}

/**
 * Pure Profit — did any of the outgoing players in a trade get signed on a
 * free (see `signedOnFree`, set at both Transfer Insider signing paths)?
 * @param {Array} outgoingPlayers
 * @returns {boolean}
 */
export function tradedAwayFreeSignedPlayer(outgoingPlayers) {
  return (outgoingPlayers || []).some(p => p?.signedOnFree);
}

/**
 * Catch Of The Day — was any of the incoming players in a trade a wonderkid
 * our scouts previously tipped us off about?
 * @param {Array} incomingPlayers
 * @param {Set<string>} wonderkidTips - player ids named in a wonderkid tip
 * @returns {boolean}
 */
export function signedTippedWonderkid(incomingPlayers, wonderkidTips) {
  if (!wonderkidTips || wonderkidTips.size === 0) return false;
  return (incomingPlayers || []).some(p => p?.id != null && wonderkidTips.has(p.id));
}

/**
 * Strike While It's Hot — was any incoming player's potential revealed the
 * same week he was signed?
 * @param {Array} incomingPlayers
 * @param {Object} scoutRevealMeta - { [playerId]: { week, method } }
 * @param {number} currentWeek - calendarIndex at signing time
 * @returns {boolean}
 */
export function signedSameWeekAsReveal(incomingPlayers, scoutRevealMeta, currentWeek) {
  if (!scoutRevealMeta) return false;
  return (incomingPlayers || []).some(p => p?.id != null && scoutRevealMeta[p.id]?.week === currentWeek);
}

/**
 * Trust The Process — how many incoming players in this trade were revealed
 * via the passive shortlist timer (as opposed to a Scout Dossier ticket)?
 * Counts every qualifying player in the batch, not just the first, since a
 * single trade can bring in more than one passively-revealed signing.
 * @param {Array} incomingPlayers
 * @param {Object} scoutRevealMeta - { [playerId]: { week, method } }
 * @returns {number}
 */
export function countPassiveRevealSignings(incomingPlayers, scoutRevealMeta) {
  if (!scoutRevealMeta) return 0;
  return (incomingPlayers || []).filter(p => p?.id != null && scoutRevealMeta[p.id]?.method === "passive").length;
}

/**
 * Get relationship tier name for display
 * @param {number} pct - Relationship percentage
 * @returns {string} Tier name
 */
export function getRelationshipTier(pct) {
  if (pct < 25) return "Stranger";
  if (pct < 50) return "Acquaintance";
  if (pct < 80) return "Friendly";
  if (pct < 100) return "Allied";
  return "Partners";
}

/**
 * Positional need multiplier — how much the AI values keeping/acquiring a position
 * Checks how many players the AI has in the same position group (DEF/MID/FWD/GK).
 * Fewer = harder to pry away (higher multiplier), surplus = cheaper.
 * @param {Array} aiSquad - AI team's squad array
 * @param {Object} player - The player being evaluated
 * @returns {number} Multiplier (0.85–1.4)
 */
export function getPositionalNeedMultiplier(aiSquad, player) {
  if (!aiSquad?.length) return 1.0;
  const group = POSITION_TYPES[player.position] || "MID";
  const count = aiSquad.filter(p => (POSITION_TYPES[p.position] || "MID") === group).length;
  if (count <= 1) return 1.4;  // desperate need — costs more
  if (count === 2) return 1.1; // moderate need
  if (count === 3) return 1.0; // normal
  return 0.85;                 // surplus — cheaper
}

/**
 * Evaluate a trade deal with live feedback
 * @param {Array} userOffer - Players user is offering
 * @param {Array} userWant - Players user wants
 * @param {Array} aiSquad - AI team's full squad
 * @param {number} relationshipPct - Relationship percentage (0-100)
 * @returns {{ userValue, aiValue, effectiveAI, ratio, mood, quote, quoteColor, acceptable }}
 */
export function evaluateTrade(userOffer, userWant, aiSquad, relationshipPct) {
  const userValue = userOffer.reduce((sum, p) => sum + getPlayerValue(p), 0);
  const aiAdjusted = userWant.reduce((sum, p) => {
    return sum + getPlayerValue(p) * getPositionalNeedMultiplier(aiSquad, p);
  }, 0);
  const discount = getRelationshipDiscount(relationshipPct);
  const effectiveAI = aiAdjusted * (1 - discount);

  if (userWant.length === 0 || effectiveAI === 0) {
    return { userValue, aiValue: 0, effectiveAI: 0, ratio: 0, ...getManagerQuote(0) };
  }

  const ratio = userValue / effectiveAI;
  return { userValue, aiValue: aiAdjusted, effectiveAI, ratio, discount, ...getManagerQuote(ratio) };
}

/**
 * Get the AI manager's quote based on the trade ratio
 * @param {number} ratio - userValue / effectiveAI
 * @returns {{ mood, quote, quoteColor, acceptable }}
 */
export function getManagerQuote(ratio) {
  const quotes = {
    ecstatic:   ["You're being far too generous! Deal!", "I can't believe my luck. Done!", "My board will be thrilled with this one!"],
    happy:      ["That's a very fair offer. We have a deal.", "Good business for both sides. Agreed.", "I'm happy with that. Let's shake on it."],
    willing:    ["Hmm... close enough. I'll take it.", "It's not perfect, but I can work with it.", "Fine. Let's get the paperwork done."],
    skeptical:  ["You'll need to sweeten the pot a bit.", "We're getting there, but not quite.", "Add a little more and we can talk."],
    dismissive: ["That's nowhere near enough.", "You're taking the mickey.", "Come back with a serious offer."],
    angry:      ["You're having a laugh, aren't you?", "Don't insult me with that.", "Absolutely not. Get out of my office."],
    waiting:    ["Put something on the table.", "I'm listening...", "Make me an offer I can't refuse."],
  };

  if (ratio === 0) return { mood: "waiting", quote: pickRandom(quotes.waiting), quoteColor: "#475569", acceptable: false };
  if (ratio >= 1.3) return { mood: "ecstatic", quote: pickRandom(quotes.ecstatic), quoteColor: "#4ade80", acceptable: true };
  if (ratio >= 1.05) return { mood: "happy", quote: pickRandom(quotes.happy), quoteColor: "#4ade80", acceptable: true };
  if (ratio >= 0.95) return { mood: "willing", quote: pickRandom(quotes.willing), quoteColor: "#facc15", acceptable: true };
  if (ratio >= 0.85) return { mood: "skeptical", quote: pickRandom(quotes.skeptical), quoteColor: "#f59e0b", acceptable: false };
  if (ratio >= 0.70) return { mood: "dismissive", quote: pickRandom(quotes.dismissive), quoteColor: "#ef4444", acceptable: false };
  return { mood: "angry", quote: pickRandom(quotes.angry), quoteColor: "#ef4444", acceptable: false };
}

/**
 * Generate a unique trade ID
 * @param {number} season - Current season number
 * @param {number} week - Current week number
 * @returns {string} Unique trade ID
 */
export function generateTradeId(season, week) {
  return `trade-s${season}-w${week}-${Date.now().toString(36)}`;
}

/**
 * Upgrade Confirmed watch resolution — if a just-signed player matches the
 * most recently compared transfer target (TransfersPage's handleCompare),
 * remember the comparison so the season-end collector can check whether he
 * outscored the starter he replaced. Pure: takes the last comparison and the
 * list of newly-received players from a trade/offer, returns the watch
 * object to persist or null if this trade wasn't the compared target.
 * @param {{ targetId: string, targetName: string, starterName: string } | null} lastCompared
 * @param {Array} receivedPlayers - players just added to the squad
 * @returns {{ signedId: string, signedName: string, replacedName: string } | null}
 */
export function resolveCompareSignWatch(lastCompared, receivedPlayers) {
  if (!lastCompared || !receivedPlayers?.length) return null;
  const signed = receivedPlayers.find(p => p.id === lastCompared.targetId);
  if (!signed) return null;
  return { signedId: signed.id, signedName: signed.name, replacedName: lastCompared.starterName };
}

/**
 * Find who to line up against a transfer target for comparison: your CURRENT
 * STARTER for the target's position — the decision the comparison actually
 * informs is "does this target improve my starting XI".
 *
 * Selection order:
 *  1. the starter assigned to a formation slot matching the target's
 *     position (best OVR if the formation has several such slots);
 *  2. no matching slot in the formation — the closest positional fit among
 *     the current XI (getOOPPenalty, ties by OVR);
 *  3. no usable XI at all (fresh save, no lineup) — squad-wide fallback,
 *     flagged via fromXI: false.
 *
 * @returns {{ player: Object, naturalPosition: boolean, fromXI: boolean } | null}
 */
export function findComparablePlayer(squad, targetPosition, { startingXI, formation, slotAssignments } = {}) {
  const eligible = (squad || []).filter(p => p && p.attrs);
  if (eligible.length === 0) return null;

  const byId = new Map(eligible.map(p => [p.id, p]));
  let starters = [];
  let slotPositions = new Map(); // player id -> assigned slot position
  if (startingXI && startingXI.length > 0 && formation) {
    const slots = getEffectiveSlots(startingXI, formation, squad, slotAssignments);
    slots.forEach((pid, i) => {
      if (i < 11 && pid != null && byId.has(pid)) {
        starters.push(byId.get(pid));
        slotPositions.set(pid, formation[i]?.pos || null);
      }
    });
  }

  if (starters.length > 0) {
    // 1. Starter(s) assigned to a slot matching the target's position.
    const inMatchingSlot = starters.filter(p => slotPositions.get(p.id) === targetPosition);
    if (inMatchingSlot.length > 0) {
      const best = inMatchingSlot.reduce((a, b) => (getOverall(b) > getOverall(a) ? b : a));
      return { player: best, naturalPosition: best.position === targetPosition, fromXI: true };
    }
    // 2. Closest positional fit among the current XI.
    const best = starters.reduce((a, b) => {
      const fitA = getOOPPenalty(a.position, targetPosition, a.learnedPositions);
      const fitB = getOOPPenalty(b.position, targetPosition, b.learnedPositions);
      if (fitB !== fitA) return fitB > fitA ? b : a;
      return getOverall(b) > getOverall(a) ? b : a;
    });
    return { player: best, naturalPosition: best.position === targetPosition, fromXI: true };
  }

  // 3. No usable XI — squad-wide fallback.
  const samePosition = eligible.filter(p => p.position === targetPosition);
  if (samePosition.length > 0) {
    const best = samePosition.reduce((a, b) => (getOverall(b) > getOverall(a) ? b : a));
    return { player: best, naturalPosition: true, fromXI: false };
  }
  const best = eligible.reduce((a, b) => {
    const fitA = getOOPPenalty(a.position, targetPosition, a.learnedPositions);
    const fitB = getOOPPenalty(b.position, targetPosition, b.learnedPositions);
    if (fitB !== fitA) return fitB > fitA ? b : a;
    return getOverall(b) > getOverall(a) ? b : a;
  });
  return { player: best, naturalPosition: false, fromXI: false };
}
