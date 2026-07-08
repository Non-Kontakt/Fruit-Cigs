// Pure logic for the Club Focus tree. Nothing here reads or writes the store;
// callers pass the persisted clubFocuses object in and apply the returned
// values. The derived bonuses in getClubFocusBonuses are NEVER stored — they
// are recomputed from completedIds wherever a seam needs them.

import { CLUB_FOCUS_NODES, defaultClubFocuses } from "../data/clubFocuses.js";

const NODE_BY_ID = Object.fromEntries(CLUB_FOCUS_NODES.map(n => [n.id, n]));

// Recurring effects that grant something at the start of every season. Kept
// separate from one-off/passive effects so pendingSeasonGrants only ever
// considers these — a completed one-off node never re-triggers.
export const RECURRING_SEASON_EFFECTS = new Set([
  "continental_tip",   // continental_contacts
  "seasonal_cream",    // miracle_worker
  "war_chest",         // war_chest (recurring half; the 3-ticket half is a completion one-off)
]);

// Deferred one-offs — fired once, but not at the completion tick: they wait for
// the next occurrence of a specific game event (a youth intake, a transfer
// window) and mark themselves consumed by writing seasonGrants[nodeId]. Reusing
// the seasonGrants ledger keeps the persisted shape to its four keys.
export const DEFERRED_ONE_OFFS = new Set([
  "extra_intake_candidate", // bake_sale — consumed at the next youth intake
  "black_book",             // little_black_book — extra offer consumed at next window
]);

export function getFocusNode(id) {
  return NODE_BY_ID[id] || null;
}

/**
 * Migration-by-default for the persisted blob. Saves predating the Club Focus
 * tree have no `clubFocuses` key and resolve to a fresh default; a partially
 * written blob has each of its four keys backfilled defensively. No save
 * version bump — the field is purely additive.
 */
export function migrateClubFocuses(saved) {
  const cf = saved && typeof saved === "object" ? saved : {};
  const base = defaultClubFocuses();
  return {
    activeId: cf.activeId ?? base.activeId,
    progressById: cf.progressById && typeof cf.progressById === "object" ? cf.progressById : base.progressById,
    completedIds: Array.isArray(cf.completedIds) ? cf.completedIds : base.completedIds,
    seasonGrants: cf.seasonGrants && typeof cf.seasonGrants === "object" ? cf.seasonGrants : base.seasonGrants,
  };
}

export function getAllFocusNodes() {
  return CLUB_FOCUS_NODES;
}

/**
 * A node is available to start when every id in `requires` is complete AND,
 * when `requiresAny` is present, at least one of those is complete. An already
 * completed node is not "available" (it's done).
 */
export function isFocusAvailable(node, completedIds) {
  if (!node) return false;
  const done = new Set(completedIds || []);
  if (done.has(node.id)) return false;
  const reqAll = (node.requires || []).every(id => done.has(id));
  if (!reqAll) return false;
  const any = node.requiresAny || [];
  if (any.length > 0 && !any.some(id => done.has(id))) return false;
  return true;
}

/** Prerequisite ids not yet satisfied — drives the LOCKED tooltip. */
export function getMissingPrereqs(node, completedIds) {
  if (!node) return [];
  const done = new Set(completedIds || []);
  const missing = (node.requires || []).filter(id => !done.has(id));
  const any = node.requiresAny || [];
  if (any.length > 0 && !any.some(id => done.has(id))) {
    // Any-of requirement unmet: surface the whole set as one "or" group.
    missing.push({ any });
  }
  return missing;
}

/**
 * Pure derivation of every passive bonus from completedIds. Callers read the
 * field they need at their seam; the object is cheap to rebuild and is never
 * persisted.
 */
export function getClubFocusBonuses(clubFocuses) {
  const done = new Set(clubFocuses?.completedIds || []);
  const has = (id) => done.has(id);
  return {
    // reveal_faster: shortlist scouting resolves a week sooner (clamped ≥1 at seam).
    revealWeeksDelta: has("man_at_every_ground") ? -1 : 0,
    // duo_boost_up: a modest bump to the per-week duo-boost roll probability.
    duoBoostBonus: has("all_weather_pitch") ? 0.05 : 0,
    // injury_heal_faster: shave a week off new injuries (clamped ≥1 at seam).
    injuryHealDelta: has("ice_baths") ? -1 : 0,
    // intake_floor: youth intake stats start a point higher (same lever as youthStatBoost).
    intakeFloorBonus: has("coaching_badges") ? 1 : 0,
    // fewer_training_injuries: multiply the training injury chance down.
    trainingInjuryMult: has("sports_scientist") ? 0.7 : 1,
    // faster_retraining: position retraining finishes a week sooner (clamped ≥1 at seam).
    retrainWeeksDelta: has("gym_extension") ? -1 : 0,
    // board_patience: ultimatums grant an extra game.
    ultimatumExtraGames: has("friend_on_board") ? 1 : 0,
    // terrace_culture: weekly + matchday fan sentiment losses reduced ~25%.
    sentimentLossMult: has("safe_standing") ? 0.75 : 1,
    // floodlights: cosmetic evening presentation + a little extra positive drift.
    floodlights: has("floodlights"),
    floodlightsDriftBonus: has("floodlights") ? 1 : 0,
  };
}

/**
 * Advance the active focus by one week.
 * @returns {{ next: object, completedNode: object|null }}
 *   next: the updated clubFocuses object (new reference; safe to setState).
 *   completedNode: the node that finished this tick, or null.
 *
 * Completion moves the id into completedIds, clears activeId, and DELETES that
 * node's progressById entry. Partial progress on other nodes is preserved so a
 * player who switches focus keeps what they'd banked (switching sets activeId
 * only — see the UI).
 */
export function tickActiveFocus(clubFocuses) {
  const cf = clubFocuses || {};
  const activeId = cf.activeId;
  if (!activeId) return { next: cf, completedNode: null };
  const node = NODE_BY_ID[activeId];
  if (!node) {
    // Unknown id (e.g. a removed node in an old save) — clear it rather than spin.
    return { next: { ...cf, activeId: null }, completedNode: null };
  }
  const progressById = { ...(cf.progressById || {}) };
  const elapsed = (progressById[activeId] || 0) + 1;
  if (elapsed >= node.weeks) {
    delete progressById[activeId];
    const completedIds = cf.completedIds || [];
    const next = {
      ...cf,
      activeId: null,
      progressById,
      completedIds: completedIds.includes(activeId) ? completedIds : [...completedIds, activeId],
    };
    return { next, completedNode: node };
  }
  progressById[activeId] = elapsed;
  return { next: { ...cf, progressById }, completedNode: null };
}

/**
 * Season-start grants due this season that haven't been granted yet. A grant
 * is due when its recurring node is complete and seasonGrants[nodeId] doesn't
 * already equal this season number. The caller applies each grant's effect and
 * stamps seasonGrants[nodeId] = seasonNumber (see markSeasonGranted).
 * @returns {Array<{ nodeId, effectId }>}
 */
export function pendingSeasonGrants(clubFocuses, seasonNumber) {
  const cf = clubFocuses || {};
  const done = cf.completedIds || [];
  const ledger = cf.seasonGrants || {};
  const out = [];
  for (const id of done) {
    const node = NODE_BY_ID[id];
    if (!node || !RECURRING_SEASON_EFFECTS.has(node.effectId)) continue;
    if (ledger[id] !== seasonNumber) out.push({ nodeId: id, effectId: node.effectId });
  }
  return out;
}

/** Stamp seasonGrants[nodeId] = seasonNumber. Pure — returns a new object. */
export function markSeasonGranted(clubFocuses, nodeId, seasonNumber) {
  const cf = clubFocuses || {};
  return { ...cf, seasonGrants: { ...(cf.seasonGrants || {}), [nodeId]: seasonNumber } };
}

/**
 * Whether a deferred one-off is still pending (node complete, not yet
 * consumed). Consumption is recorded by writing seasonGrants[nodeId] (any
 * truthy value) — see markSeasonGranted with the current season.
 */
export function isDeferredOneOffPending(clubFocuses, effectId) {
  const cf = clubFocuses || {};
  const node = CLUB_FOCUS_NODES.find(n => n.effectId === effectId);
  if (!node) return false;
  const done = new Set(cf.completedIds || []);
  if (!done.has(node.id)) return false;
  return (cf.seasonGrants || {})[node.id] == null;
}
