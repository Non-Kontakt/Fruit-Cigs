// Cigarette pack collection system for achievements
// Each pack contains 10, 15, or 20 achievements (like real cig packs)
// All 290 achievements distributed across 20 packs

export const CIG_PACKS = [
  // ── STARTER PACKS (3) ─────────────────────────────────────────
  {
    id: "cherry_cigs",
    name: "Cherry Cigs",
    icon: "🍒",
    color: "#ef4444",
    colorLight: "#fca5a5",
    colorDark: "#991b1b",
    packSize: 15,
    starter: true,
    unlockCondition: null,
    unlockDesc: null,
    achievementIds: [
      "first_win",        // Win your first match
      "clean_sheet",      // Keep a clean sheet
      "bore_draw",        // Draw 0-0
      "no_comment",       // Watch match at fast speed
      "score_draw",       // High-scoring draw
      "level_up",         // Player OVR increase
      "champion",         // Win the league
      "promoted",         // Win promotion
      "cup_winner",       // Win a cup
      "cup_exit_r32",     // Knocked out first round
      "journeyman",       // Play 50 matches
      "save_scummer",     // Load a save
      "impatient",        // Set fast settings
      "patient_manager",  // Watch match at normal speed
      "hands_off",        // Go on holiday
    ],
  },
  {
    id: "banana_cigs",
    name: "Banana Cigs",
    icon: "🍌",
    color: "#eab308",
    colorLight: "#fde047",
    colorDark: "#a16207",
    packSize: 15,
    starter: true,
    unlockCondition: null,
    unlockDesc: null,
    achievementIds: [
      "first_gain",       // First stat point
      "duo_boost",        // Duo boost in training
      "tinkerer",         // Change all training focuses
      "only_fans",        // 8+ on Ball Mastery
      "npc",              // 8+ on General Training
      "finish_food",      // 8+ on Finishing
      "gym_rats",         // 8+ on Gym
      "speed_freaks",     // 8+ on Speed Drills
      "cursed",           // 3 injuries from training
      "stat_15",          // Player reaches 15 in a stat
      "centurion",        // 100 total stat gains
      "youth_grad",       // Youth intake player scores
      "testimonial",      // Player retires after 30+ matches
      "shape_shifter",    // Position training complete
      "sweat_equity",     // 4+ gains in double training
    ],
  },
  {
    id: "apple_cigs",
    name: "Apple Cigs",
    icon: "🍏",
    color: "#22c55e",
    colorLight: "#86efac",
    colorDark: "#166534",
    packSize: 15,
    starter: true,
    unlockCondition: null,
    unlockDesc: null,
    achievementIds: [
      "clinical",         // Win with fewer shots
      "snoozefest",       // Dull 0-0
      "early_exits",      // Lose 5-0 or worse
      "hat_trick",        // Player scores 3+
      "slim_motm",        // Low-rated MotM
      "dirty_harry",      // 3+ yellows
      "seeing_red",       // Win with fewer than 11
      "rotation",         // Different Starting XI
      "out_of_pos",       // Player out of position
      "super_sub",        // Sub scores
      "taxi_for",         // Red card
      "heads_up",         // Win from behind at HT
      "lazy_sunday",      // Win without subs
      "left_on_read",     // 10+ unread inbox
      "paper_round",      // Read 5+ inbox in a week
    ],
  },

  // ── LOCKED PACKS (17) ─────────────────────────────────────────

  // Pack 4: Player moments & performances
  {
    id: "mango_cigs",
    name: "Mango Cigs",
    icon: "🥭",
    color: "#f97316",
    colorLight: "#fdba74",
    colorDark: "#c2410c",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "cherry_cigs" },
    unlockDesc: "Complete the Cherry Cigs pack",
    achievementIds: [
      "total_football",     // Win by 5+ goals
      "smash_grab",         // 1-0 vs league leaders
      "fergie_time",        // Goal in 89th/90th minute
      "last_gasp",          // 90th minute winner
      "comeback",           // Win from 2-0 down
      "all_four_of_them",   // Player scores 4+
      "perfect_motm",       // 10.0 MotM
      "wonderkid",          // Under-19 MotM
      "captain_material",   // Same player MotM 3 times
      "mr_consistent",      // Exactly 7.0 rating 3 times
      "absolute_cinema",    // Win conceding 3+
      "remember_the_name",  // Score on debut
      "brace_yourself",     // Injured player scores brace
      "up_for_a_corner",    // GK scores
      "injections",         // Force injured player to play
    ],
  },

  // Pack 5: Advanced training & development
  {
    id: "lychee_cigs",
    name: "Lychee Cigs",
    icon: "🌸",
    color: "#ec4899",
    colorLight: "#f9a8d4",
    colorDark: "#9d174d",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "banana_cigs" },
    unlockDesc: "Complete the Banana Cigs pack",
    achievementIds: [
      "through_the_roof",    // +2 OVR in one week
      "stat_20",             // Train attribute to 20
      "our_academy",         // Train under-21 to 3x18
      "peak_perf",           // Starting XI all 15+
      "golden_gen",          // 5 squad players 18+
      "maxed_out",           // Player reaches 20 in all stats
      "fresh_blood",         // Sign 3 youth in one intake
      "old_faithful",        // Player aged 36+ starting
      "rising_tide",         // Starting XI avg OVR 15
      "1up_addict",          // 5+ OVR increases in a week
      "exceeded_expectations", // OVR exceeds starting potential
      "late_bloomer",        // 31+ gains OVR
      "new_tricks",          // 30+ completes position training
      "sick_as_a_parrot",    // Outfield trains GK
      "double_or_nothing",   // 6+ gains from Double Sessions
    ],
  },

  // Pack 6: Cup achievements
  {
    id: "lime_cigs",
    name: "Lime Cigs",
    icon: "🍋‍🟩",
    color: "#84cc16",
    colorLight: "#bef264",
    colorDark: "#4d7c0f",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "cup_won" },
    unlockDesc: "Win your first cup competition",
    achievementIds: [
      "cup_upset",          // Beat team 3+ tiers above
      "cup_final_loss",     // Lose a cup final
      "nerves_of_steel",    // Win penalty shootout
      "heartbreak",         // Lose penalty shootout
      "perfect_five",       // Win shootout without missing
      "sudden_death",       // Sudden death shootout win
      "the_double",         // Win league and cup same season
      "wembley",            // Play in a cup final
      "do_it_cold",         // Away win vs 3+ tiers above
      "catenaccio",         // Cup win without conceding
      "professional_job",   // Cup win without penalties
      "win_sub_money",      // Win Sub Money Cup
      "win_clubman",        // Win Clubman Cup
      "cup_collector",      // Win 2 different cups
      "postcard_edge",      // Win cup while on holiday
    ],
  },

  // Pack 7: Career progression
  {
    id: "grape_cigs",
    name: "Grape Cigs",
    icon: "🍇",
    color: "#8b5cf6",
    colorLight: "#c4b5fd",
    colorDark: "#5b21b6",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "seasons_played", count: 5 },
    unlockDesc: "Complete 5 seasons",
    achievementIds: [
      "season_5",           // Complete 5 seasons
      "dynasty",            // Win league 3 times
      "always_bridesmaid",  // Finish 2nd three times
      "back_to_back",       // Promote in consecutive seasons
      "yo_yo",              // Relegated after promoted
      "free_fall",          // Relegated consecutively
      "fifty_not_out",      // 50 career appearances
      "golden_boot",        // 20+ goals in a season
      "veteran",            // Player reaches age 42
      "scouts_honour",      // Sign 3 trial players
      "end_of_an_era",      // 3+ retirements in one season
      "steady_climb",       // Finish higher 3x in a row
      "the_rebuild",        // Promote after relegation
      "comeback_season",    // Bottom half to top 3
      "new_era",            // 5+ new players in squad
    ],
  },

  // Pack 8: League drama & titles
  {
    id: "peach_cigs",
    name: "Peach Cigs",
    icon: "🍑",
    color: "#fb923c",
    colorLight: "#fed7aa",
    colorDark: "#c2410c",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "tier_reached", tier: 7 },
    unlockDesc: "Reach Forest Hills (tier 7)",
    achievementIds: [
      "invincibles",        // Win league unbeaten
      "centurions",         // Win every league match
      "squeaky",            // Win league by 1 point
      "aguero",             // Win league on final matchday
      "efficient_machine",  // Win league without best GD
      "mentality_monsters", // Win every match in season
      "flat_track",         // Beat every bottom-half team
      "big_game",           // Beat every top-3 team
      "respect_badge",      // Beat every team at least once
      "tactical_foul",      // Most booked player
      "bag_man",            // League top scorer
      "wooden_spoon",       // Finish bottom
      "shooting_blanks",    // No goals in 4 matches
      "open_all_hours",     // No clean sheets in season
      "mid_table",          // Finish exactly 5th
    ],
  },

  // Pack 9: Squad tactics & lineup
  {
    id: "watermelon_cigs",
    name: "Watermelon Cigs",
    icon: "🍉",
    color: "#16a34a",
    colorLight: "#86efac",
    colorDark: "#14532d",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "mango_cigs" },
    unlockDesc: "Complete the Mango Cigs pack",
    achievementIds: [
      "bench_best",         // Bench highest rated player
      "all_or_nothing",     // No bench players
      "bench_fwd",          // Bench full of forwards
      "benchwarmer",        // Same player benched 10 games
      "double_pivot",       // Two CMs defensive training
      "emergency_gk",       // Outfield player in goal
      "safe_hands",         // Clean sheet with outfield GK
      "family",             // 3 starters same surname
      "old_guard",          // 5 starters aged 33
      "well_seasoned",      // Starting XI avg age 30+
      "baby_faced",         // Starting XI avg age under 20
      "dads_army",          // 10+ year age gap in XI
      "needs_must",         // 13 or fewer in squad
      "galacticos",         // 25+ in squad
      "identity_crisis",    // Player in wrong position entirely
    ],
  },

  // Pack 10: Season tracking
  {
    id: "blueberry_cigs",
    name: "Blueberry Cigs",
    icon: "🫐",
    color: "#6366f1",
    colorLight: "#a5b4fc",
    colorDark: "#3730a3",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "leagues_won", count: 3 },
    unlockDesc: "Win 3 league titles",
    achievementIds: [
      "unbeaten_10",        // 10 matches unbeaten
      "draw_specialists",   // Draw 3 in a row
      "vote_confidence",    // Lose 5 in a row
      "manager_month",      // Win 4+ in a row
      "injury_prone",       // Same player injured 3x
      "heavy_metal",        // 3 matches with 5+ goals
      "clean_5",            // 5 clean sheets in season
      "goals_50",           // 50+ goals in season
      "no_cutting",         // Draw 5 matches in season
      "fortress",           // No home losses in season
      "on_the_road",        // 5 away wins in season
      "no_cards",           // Season without a card
      "great_escape",       // 8th from 10th at halfway
      "away_day_merchants", // Win every away match
      "formation_roulette", // 3 formations in a season
    ],
  },

  // Pack 11: Veterans, youth & continuity
  {
    id: "coconut_cigs",
    name: "Coconut Cigs",
    icon: "🥥",
    color: "#a3734c",
    colorLight: "#d4a574",
    colorDark: "#6b4423",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "lychee_cigs" },
    unlockDesc: "Complete the Lychee Cigs pack",
    achievementIds: [
      "reality_check",      // Trial player never starts
      "opportunity_cost",   // Turn down trial player
      "deep_end",           // Trial player scores
      "trials_hd",          // Trial player MotM
      "remember_me",        // Recruit ex-trial player
      "kolo_kolo",          // Ex-trial defender wins league
      "prodigal_son",       // Rehabilitate released player
      "one_more_year",      // Delayed retirement player scores
      "guard_of_honour",    // Win with testimonial player
      "not_a_dry_eye",      // Testimonial player scores farewell
      "band_of_brothers",   // 8+ players 3+ seasons
      "the_sick_note",      // 3 different injury types
      "just_a_niggle",      // Same injury type 3x in season
      "prodigy_intake",     // Youth Coup player highest OVR
      "number_one",         // Same GK 15+ starts in season
    ],
  },

  // Pack 12: Easter eggs & secrets
  {
    id: "pineapple_cigs",
    name: "Pineapple Cigs",
    icon: "🍍",
    color: "#ca8a04",
    colorLight: "#fde047",
    colorDark: "#854d0e",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "packs_complete", count: 3 },
    unlockDesc: "Complete 3 cigarette packs",
    achievementIds: [
      "mixed_up",           // Defensive striker scores
      "enzo_drive",         // Enzo scores late winner
      "nomin_determ",       // Baker/Cook/King hat-trick
      "who_shot_rr",        // Injury return brace
      "joga_bonito",        // Brazilian scores in cup
      "bayda",              // MF 8.5+ without scoring
      "old_pace",           // 30+ with 20 Pace
      "giant_killing",      // Beat Albion
      "impossible_job",     // Lose to Nomads
      "deja_vu",            // Same score 3 in a row
      "hand_of_god",        // GK MotM in 1-0 win
      "salt_wounds",        // 4+ vs bottom team
      "six_seven",          // Goal in 67th minute
      "its_a_sign",         // Score in minute = age
      "absolute_barclays",  // 3+ cards and 5+ goals
    ],
  },

  // Pack 13: Narrative & story arcs
  {
    id: "strawberry_cigs",
    name: "Strawberry Cigs",
    icon: "🍓",
    color: "#e11d48",
    colorLight: "#fda4af",
    colorDark: "#9f1239",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "tier_reached", tier: 3 },
    unlockDesc: "Reach Euro Dynasty (tier 3)",
    achievementIds: [
      "plot_armour",        // Complete first arc
      "page_turner",        // 3 arcs active
      "speedrun",           // Complete arc in 10 weeks
      "trilogy",            // One arc from each category
      "box_set",            // Complete 6 arcs
      "completionist",      // Complete all 12 arcs
      "the_gaffer",         // Complete Captain Fantastic
      "we_go_again",        // Repeat arc category
      "cold_feet",          // Abandon an arc
      "juiced",             // All-squad boost from arc
      "instant_impact",     // Transfer Insider scores on debut
      "lazarus",            // Miracle Cream player scores
      "made_it_his_own",    // Renamed player MotM
      "nom_de_guerre",      // Renamed player scores
      "absentee_landlord",  // Win league on holiday
    ],
  },

  // Pack 14: Advanced cup & knockout
  {
    id: "kiwi_cigs",
    name: "Kiwi Cigs",
    icon: "🥝",
    color: "#65a30d",
    colorLight: "#bef264",
    colorDark: "#3f6212",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "lime_cigs" },
    unlockDesc: "Complete the Lime Cigs pack",
    achievementIds: [
      "win_global",         // Win Global Cup
      "win_ultimate",       // Win Ultimate Cup
      "tinpot_treble",      // Titles in 3 divisions
      "from_the_bottom",    // Win at Federation or above
      "promised_land",      // Reach The Federation
      "win_sunday",         // Win Concrete Schoolyard
      "win_non_league",     // Win The Alley
      "win_conference",     // Win Sunday League
      "win_league_two",     // Win The Dojo
      "win_league_one",     // Win Forest Hills
      "win_championship",   // Win Altitude Trials
      "win_premier",        // Win The Federation
      "relegated",          // Get relegated
      "cruise_control",     // 10+ matches on holiday
      "speed_demon",        // 10 fastest speed matches
    ],
  },

  // Pack 15: Deeper career — long-term
  {
    id: "passionfruit_cigs",
    name: "Passionfruit Cigs",
    icon: "💜",
    color: "#a855f7",
    colorLight: "#d8b4fe",
    colorDark: "#7e22ce",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "seasons_played", count: 10 },
    unlockDesc: "Complete 10 seasons",
    achievementIds: [
      "season_10",          // Complete 10 seasons
      "first_name_terms",   // 3 players same first name
      "deja_vu_training",   // Same name back to back in report
      "brothers_in_arms",   // Same surname both score
      "legendary_dynasty",  // Same surname in All-Time XI
      "all_timers",         // All-Time XI all 7.0+
      "brexit",             // All-British All-Time XI
      "all_time_top",       // Top all-time league scorers
      "century_club",       // 100 career goals
      "true_strike",        // Non-unlockable 50 goals first
      "purist",             // Non-unlockable 100 apps first
      "our_man",            // Non-unlockable 30 MotM first
      "on_your_head_son",   // Youth intake 100 goals first
      "one_club_man",       // Youth intake 200 apps first
      "fan_favourite",      // Youth intake 60 MotM first
    ],
  },

  // Pack 16: Legendary achievements (harder, smaller pack)
  {
    id: "dragonfruit_cigs",
    name: "Dragonfruit Cigs",
    icon: "🐉",
    color: "#e91e8c",
    colorLight: "#f9a8d4",
    colorDark: "#9d174d",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "cup_won" },
    unlockDesc: "Win the double (league + cup)",
    achievementIds: [
      "sunday_to_stars",    // Title in every tier
      "park_the_bus",       // Win 1-0 with 5+ defenders
      "total_voetbal",      // Win with no natural positions
      "false_nine",         // Win with no strikers
      "get_it_in_the_mixer",// 4+ forwards in XI
      "jumpers_for_goalposts",// Win with no training focus
      "good_engine",        // CM with 15+ Physical & Mental
      "liquid_football",    // 3+ learned positions in XI
      "inverted_wingers",   // LW in RW and RW in LW
      "asymmetry",          // Win with asymmetric formation
    ],
  },

  // Pack 17: Tickets, transfers, misc
  {
    id: "fig_cigs",
    name: "Fig Cigs",
    icon: "🫘",
    color: "#92400e",
    colorLight: "#d6a67a",
    colorDark: "#5c2d0e",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "grape_cigs" },
    unlockDesc: "Complete the Grape Cigs pack",
    achievementIds: [
      "golden_ticket",      // Use first ticket
      "ticket_tout",        // Use all 11 ticket types
      "the_network",        // Transfer focus on 2 clubs
      "best_of_friends",    // Club relationship to 100%
      "the_dossier",        // Scout 3 with Dossier tickets
      "moneyball",          // Sign 3 free agents via Transfer Insider
      "the_dugout",         // Manually assign all 11 slots
      "diplomat",           // 3+ clubs at 50% relationship
      "burned_bridges",     // Club relationship to 0%
      "deadline_day",       // Trade in final transfer week
      "window_shopping",    // Window closes without deal
      "talent_spotter",     // 5 players on shortlist
      "the_black_book",     // 15+ on shortlist
      "twelfth_man_roar",   // Win by 3+ with 12th Man
      "cat_like_reflexes",  // GK 8+ clean sheets in season
    ],
  },

  // Pack 18: Alien/Intergalactic + upper tiers
  {
    id: "starfruit_cigs",
    name: "Starfruit Cigs",
    icon: "⭐",
    color: "#facc15",
    colorLight: "#fef08a",
    colorDark: "#a16207",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "tier_reached", tier: 1 },
    unlockDesc: "Reach Intergalactic Elite (tier 1)",
    achievementIds: [
      "win_saudi",           // Win Saudi Super League
      "win_european",        // Win Euro Dynasty
      "win_world_xi",        // Win World XI Invitational
      "win_intergalactic",   // Win Intergalactic Elite
      "englishman_in_new_york", // Sign an Alien
      "area_51",             // Sign 5 Aliens
      "we_come_in_peace",    // Beat an Alien team
      "take_me_to_your_leader", // Beat IG leaders by 3+
      "destroy_all_humans",  // All-Alien starting XI
      "time_dilation",       // Retirement in IG
      "xenomorph",           // Train Alien new position
      "scooty_puff_jr",     // Relegated from IG
      "scooty_puff_sr",     // Win IG in 2nd season
      "first_contact",       // Alien team 100% relationship
      "phone_home",          // Win all home in IG
    ],
  },

  // Pack 19: Prestigious / hard
  {
    id: "pomegranate_cigs",
    name: "Pomegranate Cigs",
    icon: "🔴",
    color: "#dc2626",
    colorLight: "#fca5a5",
    colorDark: "#7f1d1d",
    packSize: 15,
    starter: false,
    unlockCondition: { type: "packs_complete", count: 10 },
    unlockDesc: "Complete 10 cigarette packs",
    achievementIds: [
      "cult_hero",           // Unlockable scores 20+
      "worth_the_wait",      // Unlockable MotM on debut
      "old_boys_network",    // Trade with every 75%+ club
      "full_circle",         // Released youth returns and wins
      "swiss_army_knife",    // Player learns 3+ positions
      "tots_league_one",     // TOTS in Forest Hills
      "tots_championship",   // TOTS in Altitude Trials
      "tots_premier",        // TOTS at Federation+
      "tots_premier_3",      // 3+ in TOTS at Federation+
      "tots_premier_5",      // 5+ in TOTS at Federation+
      "fox_box",             // ST scores 5 consecutive
      "odds_are_even",       // All 7 attrs same value
      "the_specialist",      // 20 in one, under 5 in another
      "binary",              // All attributes at 10
      "forest_hills_conqueror", // 5 away wins in Forest Hills
    ],
  },

  // Pack 20: Final completionist / legendary
  {
    id: "durian_cigs",
    name: "Durian Cigs",
    icon: "💀",
    color: "#4a7c3f",
    colorLight: "#86cb70",
    colorDark: "#2d4a26",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "packs_complete", count: 15 },
    unlockDesc: "Complete 15 cigarette packs",
    achievementIds: [
      "forgot_kit",          // Injury while Forgot Kit plays
      "soundtrack",          // Win shootout while Shootout plays
      "gone_up_one_track",   // Promoted while Gone Up One plays
      "ice_bath_track",      // Recover while Ice Bath plays
      "training_montage",    // Gain while Training plays
      "one_and_done",        // Beat both single-fixture opponents
      "just_right",          // Every Euro Dynasty opponent 2x
      "fresh_legs",          // Use all 5 subs
      "hes_changed_it",      // Sub before 30th minute
      "whats_he_doing",      // Sub MotM without scoring
    ],
  },
];

// Quick lookup: achievement ID -> pack ID
export const ACH_TO_PACK = {};
CIG_PACKS.forEach(pack => {
  pack.achievementIds.forEach(achId => {
    ACH_TO_PACK[achId] = pack.id;
  });
});

// Starter pack IDs
export const STARTER_PACKS = new Set(
  CIG_PACKS.filter(p => p.starter).map(p => p.id)
);
