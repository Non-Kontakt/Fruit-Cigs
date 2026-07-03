// Progress meters for cig cards — populated only for achievements whose
// checkAchievements() condition is a clear numeric threshold against a
// persistent counter (career total, season total, or a live collection
// size), not a one-match moment. `current` reads the same state fields the
// check itself reads, so a meter never claims progress the check wouldn't
// also recognise.
export const ACHIEVEMENT_PROGRESS = {
  // === career totals ===
  centurion: { label: "STAT GAINS", target: 100, current: (s) => s.totalGains || 0 },
  journeyman: { label: "CAREER MATCHES", target: 50, current: (s) => s.totalMatches || 0 },
  season_10: { label: "SEASONS", target: 10, current: (s) => s.seasonNumber || 0 },
  dynasty: { label: "CAREER WINS", target: 3, current: (s) => s.leagueWins || 0 },
  respect_badge: { label: "TEAMS BEATEN", target: 9, current: (s) => s.beatenTeams?.size || 0 },
  ticket_tout: { label: "TICKET TYPES", target: 11, current: (s) => s.usedTicketTypes?.size || 0 },
  talent_spotter: { label: "CAREER SHORTLISTS", target: 5, current: (s) => s.totalShortlisted || 0 },
  formation_roulette: { label: "FORMATIONS WON", target: 3, current: (s) => s.formationsWonWith?.size || 0 },
  moneyball: { label: "FREE AGENTS", target: 3, current: (s) => s.freeAgentSignings || 0 },
  the_dossier: { label: "DOSSIERS", target: 3, current: (s) => Object.keys(s.scoutedPlayers || {}).length },
  always_bridesmaid: { label: "2ND-PLACE FINISHES", target: 3, current: (s) => s.secondPlaceFinishes || 0 },
  area_51: { label: "ALIENS SIGNED", target: 5, current: (s) => (s.squad || []).filter((p) => p.nationality === "ALN").length },
  diplomat: {
    label: "ALLIED CLUBS",
    target: 3,
    current: (s) => Object.values(s.clubRelationships || {}).filter((r) => (r.pct || 0) >= 50).length,
  },

  // === live collection sizes ===
  the_black_book: { label: "SHORTLIST", target: 15, current: (s) => s.shortlist?.length || 0 },
  galacticos: { label: "SQUAD SIZE", target: 25, current: (s) => s.squad?.length || 0 },

  // === season totals (reset each season, still a genuine within-season grind) ===
  cruise_control: { label: "HOLIDAY MATCHES", target: 10, current: (s) => s.holidayMatchesThisSeason || 0 },
  speed_demon: { label: "FAST MATCHES", target: 10, current: (s) => s.fastMatchesThisSeason || 0 },
  heavy_metal: { label: "HIGH-SCORING MATCHES", target: 3, current: (s) => s.highScoringMatches || 0 },
  clean_5: { label: "CLEAN SHEETS", target: 5, current: (s) => s.seasonCleanSheets || 0 },
  goals_50: { label: "SEASON GOALS", target: 50, current: (s) => s.seasonGoalsFor || 0 },
  no_cutting: { label: "SEASON DRAWS", target: 5, current: (s) => s.seasonDraws || 0 },
  on_the_road: { label: "AWAY WINS", target: 5, current: (s) => s.seasonAwayWins || 0 },

  // === streaks — persistent counters that build across matches, even
  // though they can reset; the meter simply reflects the current run ===
  unbeaten_10: { label: "UNBEATEN RUN", target: 10, current: (s) => s.consecutiveUnbeaten || 0 },
  manager_month: { label: "WIN STREAK", target: 4, current: (s) => s.consecutiveWins || 0 },
};

// Returns a clamped { label, current, target } for an uncollected card, or
// null when the achievement has no countable meter.
export function getAchievementProgress(id, state) {
  const entry = ACHIEVEMENT_PROGRESS[id];
  if (!entry || !state) return null;
  const current = Math.max(0, Math.min(entry.target, entry.current(state) || 0));
  return { label: entry.label, current, target: entry.target };
}
