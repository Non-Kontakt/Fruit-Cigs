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
 */

export const BREAKOUT_TRIGGERS = {
  FWD: [
    {
      id: "hat_trick",
      label: "Hat-Trick Hero",
      narrative: "scored a hat-trick — the crowd are on their feet",
      check: (log, i) => log[i]?.goals >= 3,
    },
    {
      id: "four_goals",
      label: "Unstoppable",
      narrative: "scored four in a single match — absolutely devastating",
      check: (log, i) => log[i]?.goals >= 4,
    },
    {
      id: "streak_scorer_4",
      label: "On Fire",
      narrative: "has scored in four consecutive matches — red-hot form",
      check: (log, i) => {
        if (i < 3) return false;
        const window = log.slice(i - 3, i + 1);
        if (window.length < 4) return false;
        return window.every(m => m.goals > 0) && _isConsecutive(window);
      },
    },
    {
      id: "cup_brace",
      label: "Cup Specialist",
      narrative: "delivered a brace in the cup — lives for the big occasion",
      check: (log, i) => log[i]?.cup && log[i]?.goals >= 2,
    },
    {
      id: "winning_goal_3of5",
      label: "Match Winner",
      narrative: "keeps scoring the goals that matter most",
      check: (log, i) => {
        if (i < 4) return false;
        const window = log.slice(i - 4, i + 1);
        return window.filter(m => m.winningGoal).length >= 3;
      },
    },
    {
      id: "back_to_back_brace",
      label: "Double Double",
      narrative: "scored a brace in back-to-back matches — clinical",
      check: (log, i) => i >= 1 && log[i]?.goals >= 2 && log[i - 1]?.goals >= 2,
    },
    {
      id: "volume_scorer",
      label: "Goal Machine",
      narrative: "has five goals in the last eight matches — unstoppable form",
      check: (log, i) => {
        if (i < 7) return false;
        const window = log.slice(i - 7, i + 1);
        return window.reduce((s, m) => s + m.goals, 0) >= 5;
      },
    },
    {
      id: "vs_leader",
      label: "Giant Killer",
      narrative: "scored against the league leaders — fearless",
      check: (log, i) => log[i]?.vsLeader && log[i]?.goals > 0,
    },
  ],

  MID: [
    {
      id: "triple_assist",
      label: "Playmaker Supreme",
      narrative: "delivered three assists in a single match — pulling all the strings",
      check: (log, i) => log[i]?.assists >= 3,
    },
    {
      id: "assist_streak_4",
      label: "Creative Genius",
      narrative: "has assisted in four straight matches — the ultimate creator",
      check: (log, i) => {
        if (i < 3) return false;
        const window = log.slice(i - 3, i + 1);
        if (window.length < 4) return false;
        return window.every(m => m.assists > 0) && _isConsecutive(window);
      },
    },
    {
      id: "goal_and_assist_twice",
      label: "Complete Midfielder",
      narrative: "goal and assist in the same match — twice in five games",
      check: (log, i) => {
        if (i < 4) return false;
        const window = log.slice(i - 4, i + 1);
        return window.filter(m => m.goals > 0 && m.assists > 0).length >= 2;
      },
    },
    {
      id: "cup_assists",
      label: "Cup Creator",
      narrative: "delivered two assists in a cup match — thrives under pressure",
      check: (log, i) => log[i]?.cup && log[i]?.assists >= 2,
    },
    {
      id: "mid_motm_3of5",
      label: "Midfield Maestro",
      narrative: "named MOTM three times in five matches — running the show",
      check: (log, i) => {
        if (i < 4) return false;
        return log.slice(i - 4, i + 1).filter(m => m.motm).length >= 3;
      },
    },
    {
      id: "assist_volume",
      label: "Assist King",
      narrative: "four assists in the last five matches — nobody creates like this",
      check: (log, i) => {
        if (i < 4) return false;
        return log.slice(i - 4, i + 1).reduce((s, m) => s + m.assists, 0) >= 4;
      },
    },
    {
      id: "scoring_midfielder",
      label: "Box-to-Box Threat",
      narrative: "scored in three of the last six matches from midfield",
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
      narrative: "five clean sheets in seven games — an absolute wall",
      check: (log, i) => {
        if (i < 6) return false;
        return log.slice(i - 6, i + 1).filter(m => m.cleanSheet).length >= 5;
      },
    },
    {
      id: "away_clean_sheets_3",
      label: "Away Day Wall",
      narrative: "three consecutive away clean sheets — impenetrable on the road",
      check: (log, i) => {
        const awayMatches = log.slice(0, i + 1).filter(m => m.away);
        if (awayMatches.length < 3) return false;
        return awayMatches.slice(-3).every(m => m.cleanSheet);
      },
    },
    {
      id: "def_motm_3of5",
      label: "Defensive Colossus",
      narrative: "named MOTM as a defender three times in five matches",
      check: (log, i) => {
        if (i < 4) return false;
        return log.slice(i - 4, i + 1).filter(m => m.motm).length >= 3;
      },
    },
    {
      id: "marauding_defender",
      label: "Marauding Defender",
      narrative: "clean sheet and a goal or assist in the same match — twice in six games",
      check: (log, i) => {
        if (i < 5) return false;
        return log.slice(i - 5, i + 1).filter(m => m.cleanSheet && (m.goals > 0 || m.assists > 0)).length >= 2;
      },
    },
    {
      id: "clean_streak_4",
      label: "Fortress",
      narrative: "four clean sheets in a row — nothing gets through",
      check: (log, i) => {
        if (i < 3) return false;
        const window = log.slice(i - 3, i + 1);
        return window.every(m => m.cleanSheet) && _isConsecutive(window);
      },
    },
    {
      id: "cup_def_motm",
      label: "Cup Warrior",
      narrative: "MOTM in two cup matches as a defender — built for the big stage",
      check: (log, i) => {
        const cupMatches = log.slice(0, i + 1).filter(m => m.cup && m.motm);
        return cupMatches.length >= 2;
      },
    },
    {
      id: "def_consistency",
      label: "Mr. Reliable",
      narrative: "averaged 7.5+ over six consecutive matches — never lets the team down",
      check: (log, i) => {
        if (i < 5) return false;
        const window = log.slice(i - 5, i + 1);
        if (!_isConsecutive(window)) return false;
        const avg = window.reduce((s, m) => s + m.rating, 0) / window.length;
        return avg >= 7.5;
      },
    },
  ],

  GK: [
    {
      id: "gk_clean_sheets_5of7",
      label: "Brick Wall",
      narrative: "five clean sheets in seven games — nothing gets past",
      check: (log, i) => {
        if (i < 6) return false;
        return log.slice(i - 6, i + 1).filter(m => m.cleanSheet).length >= 5;
      },
    },
    {
      id: "gk_cup_clean_sheets",
      label: "Cup Keeper",
      narrative: "clean sheets in two consecutive cup knockout rounds — nerves of steel",
      check: (log, i) => {
        const cupMatches = log.slice(0, i + 1).filter(m => m.cup);
        if (cupMatches.length < 2) return false;
        return cupMatches.slice(-2).every(m => m.cleanSheet);
      },
    },
    {
      id: "gk_motm_3of5",
      label: "Shot Stopper",
      narrative: "named MOTM three times in five matches — superhuman reflexes",
      check: (log, i) => {
        if (i < 4) return false;
        return log.slice(i - 4, i + 1).filter(m => m.motm).length >= 3;
      },
    },
    {
      id: "gk_clean_streak_4",
      label: "Impenetrable",
      narrative: "four clean sheets in a row — an unbeatable run",
      check: (log, i) => {
        if (i < 3) return false;
        const window = log.slice(i - 3, i + 1);
        return window.every(m => m.cleanSheet) && _isConsecutive(window);
      },
    },
    {
      id: "gk_consistency",
      label: "Safe Hands",
      narrative: "averaged 7.5+ over six consecutive matches — total command of the box",
      check: (log, i) => {
        if (i < 5) return false;
        const window = log.slice(i - 5, i + 1);
        if (!_isConsecutive(window)) return false;
        const avg = window.reduce((s, m) => s + m.rating, 0) / window.length;
        return avg >= 7.5;
      },
    },
  ],

  UNIVERSAL: [
    {
      id: "uni_motm_3of5",
      label: "Star Performer",
      narrative: "named MOTM three times in five matches — simply outstanding",
      check: (log, i) => {
        if (i < 4) return false;
        return log.slice(i - 4, i + 1).filter(m => m.motm).length >= 3;
      },
    },
    {
      id: "avg_rating_8_over_5",
      label: "Consistent Excellence",
      narrative: "averaged 8.0+ over five consecutive matches — world-class form",
      check: (log, i) => {
        if (i < 4) return false;
        const window = log.slice(i - 4, i + 1);
        const avg = window.reduce((s, m) => s + m.rating, 0) / window.length;
        return avg >= 8.0;
      },
    },
    {
      id: "exceeding_expectations",
      label: "Exceeding Expectations",
      narrative: "consistently rated well above their ability — something special is happening",
      check: (log, i, ctx) => {
        if (i < 7) return false;
        const window = log.slice(i - 7, i + 1);
        const avgRating = window.reduce((s, m) => s + m.rating, 0) / window.length;
        // OVR 1-20 maps to threshold 5.9-13.5 — must consistently outperform baseline
        const threshold = (ctx?.ovr || 10) * 0.4 + 5.5;
        return avgRating >= threshold;
      },
    },
  ],
};

// Helper: check if match log entries are within a reasonable calendarIndex window
// (no more than 3 weeks gap between any two consecutive entries)
function _isConsecutive(entries) {
  for (let j = 1; j < entries.length; j++) {
    if (entries[j].calendarIndex != null && entries[j - 1].calendarIndex != null) {
      if (entries[j].calendarIndex - entries[j - 1].calendarIndex > 3) return false;
    }
  }
  return true;
}
