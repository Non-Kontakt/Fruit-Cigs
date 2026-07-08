// The Club Focus tree — an authored, HOI4-style focus graph for club
// development. Each node is a project the board can pour weeks into; finishing
// one either fires a one-off reward or switches on a passive bonus that is
// derived (never stored) from completedIds via utils/clubFocuses.js.
//
// artKey is an emoji stand-in for future pixel art. pos places the node on a
// 6-column × 4-row grid read top-to-bottom: roots (row 0) → mids (row 1) →
// deeps (row 2) → capstones (row 3). Columns are chosen so the prerequisite
// lines drawn beneath the chips stay legible.
//
// requires: ALL must be complete. requiresAny: at least ONE must be complete
// (only used where the design wants two independent unlock paths).

export const CLUB_FOCUS_NODES = [
  // ─── ROOTS (row 0, no prerequisites, 4 weeks) ───
  {
    id: "new_bibs", name: "New Bibs", artKey: "🦺", weeks: 4,
    desc: "Kit the training ground out properly. Two double-session tickets land in the cabinet.",
    effectId: "grant_double_sessions", requires: [], pos: { col: 0, row: 0 },
  },
  {
    id: "man_at_every_ground", name: "A Man At Every Ground", artKey: "🔭", weeks: 4,
    desc: "Scouts posted everywhere. Shortlist reveals come a week sooner (4→3).",
    effectId: "reveal_faster", requires: [], pos: { col: 2, row: 0 },
  },
  {
    id: "new_club_shop", name: "New Club Shop", artKey: "🛍️", weeks: 4,
    desc: "A proper club shop opens. Fan sentiment +15 and a 12th-Man ticket.",
    effectId: "shop_opening", requires: [], pos: { col: 4, row: 0 },
  },

  // ─── MIDS (row 1, 5-6 weeks) ───
  {
    id: "all_weather_pitch", name: "All-Weather Pitch", artKey: "🌧️", weeks: 6,
    desc: "Train through anything. Duo boosts fire more often in training.",
    effectId: "duo_boost_up", requires: ["new_bibs"], pos: { col: 0, row: 1 },
  },
  {
    id: "ice_baths", name: "Ice Baths", artKey: "🧊", weeks: 6,
    desc: "State-of-the-art recovery. Injuries heal a week faster.",
    effectId: "injury_heal_faster", requires: ["new_bibs"], pos: { col: 1, row: 1 },
  },
  {
    id: "little_black_book", name: "The Little Black Book", artKey: "📓", weeks: 6,
    desc: "Two scout dossiers, and the next transfer window brings an extra offer.",
    effectId: "black_book", requires: ["man_at_every_ground"], pos: { col: 2, row: 1 },
  },
  {
    id: "bake_sale", name: "Under-9s Bake Sale", artKey: "🧁", weeks: 5,
    desc: "The community rallies. Your next youth intake turns up one extra candidate.",
    effectId: "extra_intake_candidate",
    requires: [], requiresAny: ["man_at_every_ground", "new_club_shop"], pos: { col: 3, row: 1 },
  },
  {
    id: "safe_standing", name: "Safe Standing", artKey: "🧱", weeks: 6,
    desc: "A proper terrace culture. Fan sentiment losses are softened.",
    effectId: "terrace_culture", requires: ["new_club_shop"], pos: { col: 4, row: 1 },
  },
  {
    id: "hospitality", name: "Matchday Hospitality", artKey: "🥂", weeks: 5,
    desc: "Prawn sandwiches all round. Board sentiment +15.",
    effectId: "prawn_sandwiches", requires: ["new_club_shop"], pos: { col: 5, row: 1 },
  },

  // ─── DEEPS (row 2, 8-9 weeks, each needs two earlier nodes) ───
  {
    id: "coaching_badges", name: "Proper Coaching Badges", artKey: "📋", weeks: 8,
    desc: "Qualified coaches raise the floor. Youth intake stats start a point higher.",
    effectId: "intake_floor", requires: ["all_weather_pitch", "bake_sale"], pos: { col: 0, row: 2 },
  },
  {
    id: "sports_scientist", name: "Sports Scientist", artKey: "🔬", weeks: 8,
    desc: "Load management, done right. Training injuries become rarer.",
    effectId: "fewer_training_injuries", requires: ["all_weather_pitch", "ice_baths"], pos: { col: 1, row: 2 },
  },
  {
    id: "gym_extension", name: "The Gym Extension", artKey: "🏗️", weeks: 8,
    desc: "More space to work. Position retraining finishes a week sooner.",
    effectId: "faster_retraining", requires: ["all_weather_pitch", "sports_scientist"], pos: { col: 2, row: 2 },
  },
  {
    id: "continental_contacts", name: "Continental Contacts", artKey: "🌍", weeks: 8,
    desc: "A network abroad. Each season, scouts tip a foreign talent onto your shortlist.",
    effectId: "continental_tip", requires: ["little_black_book", "hospitality"], pos: { col: 3, row: 2 },
  },
  {
    id: "friend_on_board", name: "A Friend On The Board", artKey: "🤝", weeks: 8,
    desc: "An ally in the boardroom. Board ultimatums grant an extra game.",
    effectId: "board_patience", requires: ["hospitality", "safe_standing"], pos: { col: 4, row: 2 },
  },
  {
    id: "floodlights", name: "Floodlights", artKey: "💡", weeks: 9,
    desc: "Evening football under the lights. A little more fan drift when things are good.",
    effectId: "floodlights", requires: ["safe_standing", "hospitality"], pos: { col: 5, row: 2 },
  },

  // ─── CAPSTONES (row 3, 10-12 weeks, cross-theme) ───
  {
    id: "prodigy_pipeline", name: "The Prodigy Pipeline", artKey: "🐣", weeks: 10,
    desc: "The academy produces a generational talent — a 16-year-old wonderkid joins.",
    effectId: "prodigy", requires: ["coaching_badges", "continental_contacts"], pos: { col: 1, row: 3 },
  },
  {
    id: "miracle_worker", name: "The Miracle Worker", artKey: "✨", weeks: 10,
    desc: "A physio who works wonders. A Miracle Cream ticket every season.",
    effectId: "seasonal_cream", requires: ["ice_baths", "sports_scientist"], pos: { col: 2, row: 3 },
  },
  {
    id: "war_chest", name: "The War Chest", artKey: "💰", weeks: 12,
    desc: "The board opens the vault. Three tickets now, and one every season after.",
    effectId: "war_chest", requires: ["friend_on_board", "floodlights", "little_black_book"], pos: { col: 4, row: 3 },
  },
];

// Grid bounds, so the UI can size its canvas without recomputing from nodes.
export const FOCUS_GRID_COLS = 6;
export const FOCUS_GRID_ROWS = 4;

// Default persisted shape — old saves migrate to this (see useSaveGame load).
export function defaultClubFocuses() {
  return { activeId: null, progressById: {}, completedIds: [], seasonGrants: {} };
}
