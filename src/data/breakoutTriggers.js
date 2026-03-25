/**
 * Breakout Trigger Definitions
 *
 * Each trigger: { id, label, narrative, check(log, i, ctx) }
 * - log: player's match log array (last 20 entries)
 * - i: index of the most recent match (log.length - 1)
 * - ctx: { ovr } — player's current OVR for relative triggers
 *
 * Triggers are shuffled before evaluation so the player can't predict
 * which fires. Only one breakout per player per season.
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
      narrative: "five goals in the last seven matches — relentless",
      check: (log, i) => {
        if (i < 6) return false;
        return log.slice(i - 6, i + 1).reduce((s, m) => s + m.goals, 0) >= 5;
      },
    },
    {
      id: "false_nine",
      label: "The Firmino Role",
      narrative: "assisted in three of the last five matches — defenders stay pressed",
      check: (log, i) => {
        if (i < 4) return false;
        return log.slice(i - 4, i + 1).filter(m => m.assists > 0).length >= 3;
      },
    },
    {
      id: "match_winner_3of6",
      label: "Clutch",
      narrative: "scored the winning goal three times in six matches — delivers when it matters",
      check: (log, i) => {
        if (i < 5) return false;
        return log.slice(i - 5, i + 1).filter(m => m.winningGoal).length >= 3;
      },
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
      narrative: "a goal and an assist in the same match — twice in six games",
      check: (log, i) => {
        if (i < 5) return false;
        return log.slice(i - 5, i + 1).filter(m => m.goals > 0 && m.assists > 0).length >= 2;
      },
    },
    {
      id: "mid_assist_volume",
      label: "Pulling It Back",
      narrative: "four assists in the last six matches — nobody creates like this",
      check: (log, i) => {
        if (i < 5) return false;
        return log.slice(i - 5, i + 1).reduce((s, m) => s + m.assists, 0) >= 4;
      },
    },
    {
      id: "mid_scorer_3of6",
      label: "Box-To-Box",
      narrative: "scored in three of the last six matches from midfield — a goal threat from deep",
      check: (log, i) => {
        if (i < 5) return false;
        return log.slice(i - 5, i + 1).filter(m => m.goals > 0).length >= 3;
      },
    },
  ],

  DEF: [
    {
      id: "clean_sheets_5of7",
      label: "Rock Solid",
      narrative: "five clean sheets in seven matches — an absolute wall",
      check: (log, i) => {
        if (i < 6) return false;
        return log.slice(i - 6, i + 1).filter(m => m.cleanSheet).length >= 5;
      },
    },
    {
      id: "clean_streak_4",
      label: "No Leaks",
      narrative: "four clean sheets in a row — nothing gets through",
      check: (log, i) => {
        if (i < 3) return false;
        const w = log.slice(i - 3, i + 1);
        return w.every(m => m.cleanSheet) && _consecutive(w);
      },
    },
    {
      id: "def_motm_3of6",
      label: "Rolls Royce",
      narrative: "named MOTM as a defender three times in six matches — class is permanent",
      check: (log, i) => {
        if (i < 5) return false;
        return log.slice(i - 5, i + 1).filter(m => m.motm).length >= 3;
      },
    },
    {
      id: "marauding_x2",
      label: "The Bale Role",
      narrative: "clean sheet with a goal or assist twice in seven matches — fancies himself a galactico",
      check: (log, i) => {
        if (i < 6) return false;
        return log.slice(i - 6, i + 1).filter(m => m.cleanSheet && (m.goals > 0 || m.assists > 0)).length >= 2;
      },
    },
    {
      id: "def_scorer",
      label: "Back Post Demon",
      narrative: "scored in two of the last five matches — a threat from set pieces",
      check: (log, i) => {
        if (i < 4) return false;
        return log.slice(i - 4, i + 1).filter(m => m.goals > 0).length >= 2;
      },
    },
  ],

  GK: [
    {
      id: "gk_clean_sheets_4of6",
      label: "Brick Wall",
      narrative: "four clean sheets in six matches — nothing gets past",
      check: (log, i) => {
        if (i < 5) return false;
        return log.slice(i - 5, i + 1).filter(m => m.cleanSheet).length >= 4;
      },
    },
    {
      id: "gk_clean_streak_3",
      label: "Impenetrable",
      narrative: "three clean sheets in a row — an unbeatable run",
      check: (log, i) => {
        if (i < 2) return false;
        const w = log.slice(i - 2, i + 1);
        return w.every(m => m.cleanSheet) && _consecutive(w);
      },
    },
    {
      id: "gk_motm_2of5",
      label: "Shot Stopper",
      narrative: "named MOTM twice in five matches — superhuman reflexes",
      check: (log, i) => {
        if (i < 4) return false;
        return log.slice(i - 4, i + 1).filter(m => m.motm).length >= 2;
      },
    },
    {
      id: "gk_scorer",
      label: "The Neuer Role",
      narrative: "the goalkeeper scored — something tells you it won't be his last",
      check: (log, i) => log[i]?.goals >= 1,
    },
  ],

  UNIVERSAL: [
    {
      id: "uni_motm_3of5",
      label: "Fantasy Favorite",
      narrative: "named MOTM three times in five matches — the punters will be pleased",
      check: (log, i) => {
        if (i < 4) return false;
        return log.slice(i - 4, i + 1).filter(m => m.motm).length >= 3;
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
