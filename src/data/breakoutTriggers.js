/**
 * Breakout Trigger Definitions
 *
 * Each trigger: { id, label, narrative|narrativeFn, check(log, i, ctx) }
 * - log: player's match log array (last 20 entries)
 * - i: index of the most recent match (log.length - 1)
 * - ctx: { ovr } — player's current OVR for relative triggers
 *
 * Accumulation triggers use _accum() to find the tightest qualifying window
 * and return the actual window size. They also require the current match to
 * contribute (recency guard) so breakouts fire when the achievement happens.
 *
 * narrativeFn(window) returns dynamic text; narrative is static fallback.
 *
 * Triggers are shuffled before evaluation so the player can't predict
 * which fires. Max 2 unique triggers per player per season.
 *
 * Target: ~25-30% per player-season, balanced across positions.
 */

function _consecutive(entries) {
  for (let j = 1; j < entries.length; j++) {
    if (entries[j].calendarIndex != null && entries[j - 1].calendarIndex != null) {
      if (entries[j].calendarIndex - entries[j - 1].calendarIndex > 3) return false;
    }
  }
  return true;
}

/**
 * Check accumulation from tightest window outward.
 * @param {Array} log - match log
 * @param {number} i - current index
 * @param {Function} pred - (entry) => boolean, does this entry count?
 * @param {number} target - how many qualifying entries needed
 * @param {number} maxWindow - maximum window to check
 * @returns {number} actual window size, or 0 if not met
 */
function _accum(log, i, pred, target, maxWindow) {
  for (let w = target; w <= Math.min(maxWindow, i + 1); w++) {
    const slice = log.slice(i - w + 1, i + 1);
    if (slice.filter(pred).length >= target) return w;
  }
  return 0;
}

/** Same as _accum but sums a numeric field instead of counting booleans */
function _accumSum(log, i, field, target, maxWindow) {
  for (let w = target; w <= Math.min(maxWindow, i + 1); w++) {
    const slice = log.slice(i - w + 1, i + 1);
    if (slice.reduce((s, m) => s + (m[field] || 0), 0) >= target) return w;
  }
  return 0;
}

const _num = (n) => ["zero","one","two","three","four","five","six","seven","eight","nine","ten"][n] || n;

export const BREAKOUT_TRIGGERS = {
  FWD: [
    {
      id: "hat_trick",
      label: "Hat-Trick Hero",
      narrative: "scored a hat-trick — the crowd are on their feet",
      check: (log, i) => log[i]?.goals >= 3,
    },
    {
      id: "scoring_streak_4",
      label: "In-Form",
      narrative: "has scored in four consecutive matches — red-hot form",
      check: (log, i) => {
        if (i < 3) return false;
        const w = log.slice(i - 3, i + 1);
        return w.every(m => m.goals > 0) && _consecutive(w);
      },
    },
    {
      id: "back_to_back_brace",
      label: "2 For 2",
      narrative: "scored a brace in back-to-back matches — clinical",
      check: (log, i) => i >= 1 && log[i]?.goals >= 2 && log[i - 1]?.goals >= 2 && _consecutive([log[i-1], log[i]]),
    },
    {
      id: "fwd_volume",
      label: "Eat My Goal",
      narrativeFn: (w) => `five goals in ${_num(w)} matches — relentless`,
      check: (log, i) => {
        if (!log[i]?.goals) return false;
        const w = _accumSum(log, i, "goals", 5, 7);
        return w || false;
      },
    },
    {
      id: "false_nine",
      label: "The Firmino Role",
      narrativeFn: (w) => `assisted in three of the last ${_num(w)} matches — defenders stay pressed`,
      check: (log, i) => {
        if (!log[i]?.assists) return false;
        const w = _accum(log, i, m => m.assists > 0, 3, 5);
        return w || false;
      },
    },
    {
      id: "match_winner_3of6",
      label: "Clutch",
      narrativeFn: (w) => `scored the winning goal three times in ${_num(w)} matches — delivers when it matters`,
      check: (log, i) => {
        if (!log[i]?.winningGoal) return false;
        const w = _accum(log, i, m => m.winningGoal, 3, 6);
        return w || false;
      },
    },
    {
      id: "fwd_cup_hero",
      label: "Cup Fever",
      narrative: "scored a brace in a cup match — lives for the big occasion",
      cupOnly: true,
      check: (log, i) => log[i]?.cup && log[i]?.goals >= 2,
    },
  ],

  MID: [
    {
      id: "triple_assist",
      label: "Thread The Needle",
      narrative: "delivered three assists in a single match — pulling all the strings",
      check: (log, i) => log[i]?.assists >= 3,
    },
    {
      id: "assist_streak_3",
      label: "Cheeky Nandos",
      narrative: "assisted in three straight matches — cheeky",
      check: (log, i) => {
        if (i < 2) return false;
        const w = log.slice(i - 2, i + 1);
        return w.every(m => m.assists > 0) && _consecutive(w);
      },
    },
    {
      id: "goal_and_assist_x2",
      label: "The Pivot",
      narrativeFn: (w) => `a goal and an assist in the same match — twice in ${_num(w)} games`,
      check: (log, i) => {
        if (!(log[i]?.goals > 0 && log[i]?.assists > 0)) return false;
        const w = _accum(log, i, m => m.goals > 0 && m.assists > 0, 2, 6);
        return w || false;
      },
    },
    {
      id: "mid_assist_volume",
      label: "Pulling It Back",
      narrativeFn: (w) => `four assists in the last ${_num(w)} matches — nobody creates like this`,
      check: (log, i) => {
        if (!log[i]?.assists) return false;
        const w = _accumSum(log, i, "assists", 4, 6);
        return w || false;
      },
    },
    {
      id: "mid_scorer_3of6",
      label: "Box-To-Box",
      narrativeFn: (w) => `scored in three of the last ${_num(w)} matches from midfield — a goal threat from deep`,
      check: (log, i) => {
        if (!log[i]?.goals) return false;
        const w = _accum(log, i, m => m.goals > 0, 3, 6);
        return w || false;
      },
    },
    {
      id: "mid_big_game",
      label: "Big Game Player",
      narrative: "created a goal against the league leaders — turns up when it counts",
      check: (log, i) => log[i]?.vsLeader && log[i]?.assists >= 1 && log[i]?.teamWon,
    },
  ],

  DEF: [
    {
      id: "clean_sheets_5of7",
      group: "clean_sheet_run",
      label: "Rock Solid",
      narrativeFn: (w) => `five clean sheets in ${_num(w)} matches — an absolute wall`,
      check: (log, i) => {
        if (!log[i]?.cleanSheet) return false;
        const w = _accum(log, i, m => m.cleanSheet, 5, 7);
        return w || false;
      },
    },
    {
      id: "clean_streak_4",
      group: "clean_sheet_run",
      label: "No Leaks",
      narrative: "four clean sheets in a row — nothing gets through",
      check: (log, i) => {
        if (!log[i]?.cleanSheet) return false;
        if (i < 3) return false;
        const w = log.slice(i - 3, i + 1);
        return w.every(m => m.cleanSheet) && _consecutive(w);
      },
    },
    {
      id: "def_motm_3of6",
      label: "Rolls Royce",
      narrativeFn: (w) => `named MOTM as a defender three times in ${_num(w)} matches — class is permanent`,
      check: (log, i) => {
        if (!log[i]?.motm) return false;
        const w = _accum(log, i, m => m.motm, 3, 6);
        return w || false;
      },
    },
    {
      id: "marauding_x2",
      label: "The Bale Role",
      narrativeFn: (w) => `clean sheet with a goal or assist twice in ${_num(w)} matches — fancies himself a galactico`,
      check: (log, i) => {
        if (!(log[i]?.cleanSheet && (log[i]?.goals > 0 || log[i]?.assists > 0))) return false;
        const w = _accum(log, i, m => m.cleanSheet && (m.goals > 0 || m.assists > 0), 2, 7);
        return w || false;
      },
    },
    {
      id: "def_scorer",
      label: "Back Post Demon",
      narrativeFn: (w) => `scored in two of the last ${_num(w)} matches — a threat from set pieces`,
      check: (log, i) => {
        if (!log[i]?.goals) return false;
        const w = _accum(log, i, m => m.goals > 0, 2, 5);
        return w || false;
      },
    },
    {
      id: "def_away_masterclass",
      label: "Masterclass",
      narrative: "MOTM with a clean sheet away from home — a defensive masterclass on the road",
      check: (log, i) => log[i]?.motm && log[i]?.cleanSheet && log[i]?.away && log[i]?.teamWon,
    },
  ],

  GK: [
    {
      id: "gk_clean_sheets_4of6",
      group: "clean_sheet_run",
      label: "Brick Wall",
      narrativeFn: (w) => `four clean sheets in ${_num(w)} matches — nothing gets past`,
      check: (log, i) => {
        if (!log[i]?.cleanSheet) return false;
        const w = _accum(log, i, m => m.cleanSheet, 4, 6);
        return w || false;
      },
    },
    {
      id: "gk_clean_streak_3",
      group: "clean_sheet_run",
      label: "Impenetrable",
      narrative: "three clean sheets in a row — an unbeatable run",
      check: (log, i) => {
        if (!log[i]?.cleanSheet) return false;
        if (i < 2) return false;
        const w = log.slice(i - 2, i + 1);
        return w.every(m => m.cleanSheet) && _consecutive(w);
      },
    },
    {
      id: "gk_motm_2of5",
      label: "Shot Stopper",
      narrativeFn: (w) => `named MOTM twice in ${_num(w)} matches — superhuman reflexes`,
      check: (log, i) => {
        if (!log[i]?.motm) return false;
        const w = _accum(log, i, m => m.motm, 2, 5);
        return w || false;
      },
    },
    {
      id: "gk_scorer",
      label: "The Neuer Role",
      narrative: "the goalkeeper scored — something tells you it won't be his last",
      check: (log, i) => log[i]?.goals >= 1,
    },
    {
      id: "gk_away_hero",
      label: "Away Day Hero",
      narrative: "named MOTM in an away win — carried the team on the road",
      check: (log, i) => log[i]?.motm && log[i]?.away && log[i]?.teamWon,
    },
  ],

  UNIVERSAL: [
    {
      id: "uni_motm_3of5",
      label: "Fantasy Favorite",
      narrativeFn: (w) => `named MOTM three times in ${_num(w)} matches — the punters will be pleased`,
      check: (log, i) => {
        if (!log[i]?.motm) return false;
        const w = _accum(log, i, m => m.motm, 3, 5);
        return w || false;
      },
    },
    {
      id: "uni_high_avg_5",
      label: "Pulling His Weight",
      narrative: "averaged 7.5+ over five consecutive matches — top-class form",
      check: (log, i) => {
        if (i < 4) return false;
        const w = log.slice(i - 4, i + 1);
        if (!_consecutive(w)) return false;
        return w.reduce((s, m) => s + m.rating, 0) / w.length >= 7.5;
      },
    },
  ],
};
