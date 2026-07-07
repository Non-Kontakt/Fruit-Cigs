// Cigarette pack collection system for achievements
// Every pack contains EXACTLY 5 or 10 achievements — this is a hard
// invariant, not a rough guideline. All 325 achievements distributed
// across 36 packs (v3.1, recomposed v3.2, re-recomposed v3.3, expanded v3.4
// with the season-domain wave — Quince, Pineapple, Date, Redcurrant).
//
// Curation principle:
//   - Early packs (starter + first couple of unlocks) should be mostly
//     EARLY/MID-difficulty cards, with at most 1 FREAK/novelty card. A
//     "triviality" — an achievement that's mechanically easy to trigger
//     with a single deliberate action (a lineup choice, a training toggle,
//     a one-off UI action) regardless of how far into a save the player
//     is — belongs early, even if it was originally filed under a
//     long-career pack. Gating a trivial action behind 10 seasons of play
//     just means most players collect the card blind, long after they
//     actually did the thing.
//   - Deep packs should be LATE-heavy (genuinely long-career or
//     luck/grind-gated content) but may deliberately hold 1-3 cards a
//     player has plausibly already banked by the time the pack unseals —
//     a small "pre-bank on unseal" moment is a feature (an immediate,
//     earned-feeling win when a pack opens), not a bug, as long as it's a
//     minority of the pack rather than baked into the unlock condition
//     itself (see the Lime Cigs fix below for the latter, which isn't OK).
//   - FREAK-novelty specialist packs (the small 5-card packs built around
//     secret/bizarre/perfect-conditions triggers) should gate deep —
//     packs_complete 12+ — rather than shallow. Surfacing them after only
//     3 completed packs hands new players a pack full of achievements they
//     have no realistic way to have triggered yet.
//   - Recomposition NEVER changes a pack's size. Every move is one leg of
//     a size-neutral exchange: a card leaving a pack is always paired with
//     a card arriving in the same pass, closing a cycle across 3+ packs
//     (e.g. a deep pack sends a triviality to an early pack, the early
//     pack sends one of its own less-trivial cards to a mid pack, and the
//     mid pack sends a genuinely long-career card back to a deep pack).
//     Padding a pack out with whatever's convenient, or leaving a donor
//     pack short after it gives a card away, recreates the irregular-size
//     problem this recomposition exists to fix.

export const CIG_PACKS = [
  // ── STARTER PACKS (3 × 10) ───────────────────────────────────
  {
    id: "cherry_cigs",
    name: "Cherry Cigs",
    icon: "🍒",
    color: "#ef4444",
    colorLight: "#fca5a5",
    colorDark: "#991b1b",
    packSize: 10,
    starter: true,
    unlockCondition: null,
    unlockDesc: null,
    // hands_off moved out (to Kiwi — see below), paired one-for-one with
    // injections moving in from Persimmon, to keep this pack at 10.
    achievementIds: [
      "first_win",          // Win your first match
      "clean_sheet",        // Keep a clean sheet
      "bore_draw",          // Draw 0-0
      "no_comment",         // Watch match at fast speed
      "level_up",           // Player OVR increase
      "impatient",          // Set fast settings
      "patient_manager",    // Watch match at normal speed
      "save_scummer",       // Load a save
      "rotation",           // Different Starting XI
      "injections",         // Force an injured player to play (moved from Persimmon — a one-off UI action, trivial at any point in a save)
    ],
  },
  {
    id: "banana_cigs",
    name: "Banana Cigs",
    icon: "🍌",
    color: "#eab308",
    colorLight: "#fde047",
    colorDark: "#a16207",
    packSize: 10,
    starter: true,
    unlockCondition: null,
    unlockDesc: null,
    achievementIds: [
      "first_gain",         // First stat point
      "duo_boost",          // Duo boost in training
      "tinkerer",           // Change all training focuses
      "only_fans",          // 8+ on Ball Mastery
      "npc",                // 8+ on General Training
      "finish_food",        // 8+ on Finishing
      "gym_rats",           // 8+ on Gym
      "speed_freaks",       // 8+ on Speed Drills
      "centurion",          // 100 total stat gains
      "shape_shifter",      // Position training complete
    ],
  },
  {
    id: "apple_cigs",
    name: "Apple Cigs",
    icon: "🍏",
    color: "#22c55e",
    colorLight: "#86efac",
    colorDark: "#166534",
    packSize: 10,
    starter: true,
    unlockCondition: null,
    unlockDesc: null,
    // hat_trick and taxi_for moved out (to Passionfruit), heads_up moved
    // out (to Lychee) — paired one-for-one with cup_winner (from Lime) and
    // asymmetry/jumpers_for_goalposts (from Persimmon) moving in, to keep
    // this pack at 10.
    achievementIds: [
      "clinical",           // Win with fewer shots
      "out_of_pos",         // Player out of position
      "super_sub",          // Sub scores
      "lazy_sunday",        // Win without subs
      "left_on_read",       // 10+ unread inbox
      "paper_round",        // Read 5+ inbox in a week
      "cup_exit_r32",       // Knocked out first round
      "cup_winner",         // Win a cup (moved from Lime — was pre-banked by Lime's own unlock condition, see Lime below)
      "asymmetry",          // Win with an asymmetric formation (moved from Persimmon — a one-off tactical choice, pairs with out_of_pos/lazy_sunday)
      "jumpers_for_goalposts", // Win with nobody on a training focus (moved from Persimmon — same trivial-tactical-choice family)
    ],
  },

  // ── EARLY UNLOCKS (complete a starter) ────────────────────────
  {
    id: "pear_cigs",
    name: "Pear Cigs",
    icon: "🍐",
    color: "#a3e635",
    colorLight: "#d9f99d",
    colorDark: "#4d7c0f",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "cherry_cigs" },
    unlockDesc: "Complete the Cherry Cigs pack",
    // journeyman, stat_15, and galacticos moved out (to Grape) — paired
    // one-for-one with get_it_in_the_mixer/well_seasoned/baby_faced moving
    // in from Melon, to keep this pack at 10.
    achievementIds: [
      "bench_best",         // Bench highest rated player
      "all_or_nothing",     // No bench players
      "bench_fwd",          // Bench full of forwards
      "family",             // 3 starters same surname
      "needs_must",         // 13 or fewer in squad
      "dads_army",          // 10+ year age gap in XI
      "identity_crisis",    // Player in wrong position entirely
      "get_it_in_the_mixer", // 4+ forwards in XI (moved from Melon — squad-composition oddity, pairs with bench_fwd)
      "well_seasoned",      // Starting XI avg age 30+ (moved from Melon — pairs with dads_army)
      "baby_faced",         // Starting XI avg age under 20 (moved from Melon — same age-extreme family as well_seasoned/dads_army)
    ],
  },
  {
    id: "mango_cigs",
    name: "Mango Cigs",
    icon: "🥭",
    color: "#f97316",
    colorLight: "#fdba74",
    colorDark: "#c2410c",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "cherry_cigs" },
    unlockDesc: "Complete the Cherry Cigs pack",
    // mixed_up, perfect_motm, and mr_consistent moved out (to Passionfruit —
    // see below): 3 luck/freak-trigger cards (an exact 10.0 rating, an exact
    // 7.0 rating three times, a defensive player scoring) were too much
    // FREAK-novelty weight for an early pack, and belong with the
    // long-odds/long-career company they now keep. Backfilled with
    // tots_league_one and tots_championship (from Plum — see below) and
    // hat_trick (from Passionfruit) — normal in-match feats that fit
    // alongside this pack's comeback/last_gasp/all_four_of_them cluster,
    // restoring size to 10.
    achievementIds: [
      "total_football",     // Win by 5+ goals
      "fergie_time",        // Goal in 89th/90th minute
      "last_gasp",          // 90th minute winner
      "comeback",           // Win from 2-0 down
      "all_four_of_them",   // Player scores 4+
      "wonderkid",          // Under-19 MotM
      "captain_material",   // Same player MotM 3 times
      "tots_league_one",    // TOTS in Forest Hills (moved from Plum — genuinely still ahead of you this early, unlike from Plum's own tier-5 gate)
      "tots_championship",  // TOTS in Altitude Trials (moved from Plum — same reasoning)
      "hat_trick",          // Player scores 3+ (moved from Passionfruit)
    ],
  },
  {
    id: "lychee_cigs",
    name: "Lychee Cigs",
    icon: "🌸",
    color: "#ec4899",
    colorLight: "#f9a8d4",
    colorDark: "#9d174d",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "banana_cigs" },
    unlockDesc: "Complete the Banana Cigs pack",
    // old_faithful moved out (to Persimmon — see below); it was the one
    // age/veteran outlier in an otherwise all-stat-progression pack, and
    // fits Persimmon's long-career backfill better than it fit here.
    // Backfilled with heads_up (from Apple) — a half-time fightback pairs
    // with this pack's growth theme (late_bloomer, through_the_roof) as a
    // mental-growth counterpart to its physical/stat growth cards, and
    // restores size to 10.
    achievementIds: [
      "through_the_roof",   // +2 OVR in one week
      "our_academy",        // Train under-21 to 3x18
      "fresh_blood",        // Sign 3 youth in one intake
      "rising_tide",        // Starting XI avg OVR 15
      "1up_addict",         // 5+ OVR increases in a week
      "exceeded_expectations", // OVR exceeds starting potential
      "late_bloomer",       // 31+ gains OVR
      "new_tricks",         // 30+ completes position training
      "double_or_nothing",  // 6+ gains from Double Sessions
      "heads_up",           // Win from behind at HT (moved from Apple)
    ],
  },
  {
    id: "blackcurrant_cigs",
    name: "Blackcurrant Cigs",
    icon: "🖤",
    color: "#581c87",
    colorLight: "#c084fc",
    colorDark: "#3b0764",
    packSize: 5,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "apple_cigs" },
    unlockDesc: "Complete the Apple Cigs pack",
    // dirty_harry moved out (to Fig) — paired one-for-one with
    // shooting_blanks moving in from Persimmon, to keep this pack at 5.
    achievementIds: [
      "early_exits",        // Lose by 3+ goals
      "seeing_red",         // Win with fewer than 11
      "absolute_barclays",  // 3+ cards and 5+ goals
      "hand_of_god",        // GK MotM in 1-0 win
      "shooting_blanks",    // No goals in 4 matches (moved from Persimmon — an adversity/rough-patch card, pairs with early_exits)
    ],
  },

  // ── CUP PACKS ─────────────────────────────────────────────────
  {
    id: "lime_cigs",
    name: "Lime Cigs",
    icon: "🍋‍🟩",
    color: "#84cc16",
    colorLight: "#bef264",
    colorDark: "#4d7c0f",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "cup_won" },
    unlockDesc: "Win your first cup competition",
    // NOTE: cup_winner used to live in this pack, which meant meeting this
    // very unlock condition guaranteed the pack opened with 1 of its 10
    // cards already pre-banked — cup_winner moved to Apple Cigs (a starter
    // pack, already open, already home to cup_exit_r32) so unsealing Lime
    // is a genuine 10-unknowns reveal. Backfilled with the_double (from
    // Kiwi) to restore packSize.
    // cup_final_loss and wembley moved out (to Kiwi — see below), two MID
    // "reached/lost a final" cup cards paired one-for-one with cult_hero
    // and worth_the_wait moving in (from Durian, freed up by win_global and
    // win_ultimate moving there), keeping this pack at 10.
    achievementIds: [
      "cup_upset",          // Beat team 3+ tiers above
      "nerves_of_steel",    // Win penalty shootout
      "heartbreak",         // Lose penalty shootout
      "perfect_five",       // Win shootout without missing
      "sudden_death",       // Sudden death shootout win
      "joga_bonito",        // Brazilian scores in cup (player unlock)
      "professional_job",   // Cup win without penalties
      "the_double",         // Win league and cup same season (moved from Kiwi)
      "cult_hero",          // Unlockable scores 20+ (moved from Durian)
      "worth_the_wait",     // Unlockable MotM on debut (moved from Durian)
    ],
  },
  {
    id: "kiwi_cigs",
    name: "Kiwi Cigs",
    icon: "🥝",
    color: "#65a30d",
    colorLight: "#bef264",
    colorDark: "#3f6212",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "lime_cigs" },
    unlockDesc: "Complete the Lime Cigs pack",
    // Backfilled with hands_off (from Cherry) — paired one-for-one with
    // the_double moving out to Lime, to keep this pack at 10. hands_off
    // (go on holiday) echoes postcard_edge (win a cup on holiday), already
    // in this pack — a natural neighbor for the holiday-mode theme.
    // win_global and win_ultimate moved out (to Durian — the finale pack,
    // joining its win_saudi/win_european/win_world_xi/win_intergalactic
    // tier-win cluster as the cup-equivalent completionist cards).
    // Backfilled with cup_final_loss and wembley (from Lime) — MID
    // reached-a-final cup cards that sit naturally alongside this pack's
    // other assorted cup milestones, restoring size to 10.
    achievementIds: [
      "catenaccio",         // Cup win without conceding
      "cup_collector",      // Win 2 different cups
      "postcard_edge",      // Win cup while on holiday
      "win_sub_money",      // Win Sub Money Cup
      "win_clubman",        // Win Clubman Cup
      "cup_final_loss",     // Lose a cup final (moved from Lime)
      "wembley",            // Play in a cup final (moved from Lime)
      "do_it_cold",         // Win cup away from home
      "one_and_done",       // Beat both single-fixture opponents
      "hands_off",          // Go on holiday (moved from Cherry)
    ],
  },

  // ── CAREER PROGRESSION ────────────────────────────────────────
  {
    id: "grape_cigs",
    name: "Grape Cigs",
    icon: "🍇",
    color: "#8b5cf6",
    colorLight: "#c4b5fd",
    colorDark: "#5b21b6",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "seasons_played", count: 5 },
    unlockDesc: "Complete 5 seasons",
    // fifty_not_out, veteran, and always_bridesmaid moved out (to Persimmon
    // and Melon — see below) to backfill those two deep packs with
    // genuinely long-career content, restoring their sizes after their own
    // "trivialities come early" cards moved out to the early packs.
    // Backfilled with journeyman, stat_15, and galacticos (from Pear) —
    // career-appearance, attribute, and squad-size milestones fit this
    // pack's season/career-progression theme, and restore its size to 10.
    achievementIds: [
      "season_5",           // Complete 5 seasons
      "golden_boot",        // 20+ goals in a season
      "end_of_an_era",      // 3+ retirements in one season
      "steady_climb",       // Finish higher 3x in a row
      "the_rebuild",        // Promote after relegation
      "comeback_season",    // Bottom half to top 3
      "new_era",            // 5+ new players in squad
      "journeyman",         // Play 50 matches (moved from Pear)
      "stat_15",            // Player reaches 15 in a stat (moved from Pear)
      "galacticos",         // 25+ in squad (moved from Pear)
    ],
  },
  {
    id: "fig_cigs",
    name: "Fig Cigs",
    icon: "🫘",
    color: "#92400e",
    colorLight: "#d6a67a",
    colorDark: "#5c2d0e",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "grape_cigs" },
    unlockDesc: "Complete the Grape Cigs pack",
    // ticket_tout moved out (to Melon — see below), a genuinely long-career
    // card ("use all 11 ticket types") pulled to backfill that deep pack.
    // Backfilled with dirty_harry (from Blackcurrant) — no clean thematic
    // sibling among this pack's ticket/relationship cards, but the pack
    // already carries one deliberate-setback card (burned_bridges), so a
    // second friction outlier isn't a stretch, and it restores size to 10.
    achievementIds: [
      "golden_ticket",      // Use first ticket
      "sweat_equity",       // 4+ gains in double training
      "the_network",        // Transfer focus on 2 clubs
      "best_of_friends",    // Club relationship to 100%
      "the_dossier",        // Scout 3 with Dossier tickets
      "moneyball",          // Sign 3 free agents via Transfer Insider
      "the_dugout",         // Manually assign all 11 slots
      "diplomat",           // 3+ clubs at 50% relationship
      "burned_bridges",     // Club relationship to 0%
      "dirty_harry",        // 3+ yellows in a match (moved from Blackcurrant)
    ],
  },
  {
    id: "coconut_cigs",
    name: "Coconut Cigs",
    icon: "🥥",
    color: "#a3734c",
    colorLight: "#d4a574",
    colorDark: "#6b4423",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "lychee_cigs" },
    unlockDesc: "Complete the Lychee Cigs pack",
    achievementIds: [
      "youth_grad",         // Youth intake player scores
      "testimonial",        // Player retires after 30+ matches
      "reality_check",      // Trial player never starts
      "opportunity_cost",   // Turn down trial player
      "deep_end",           // Trial player scores
      "trials_hd",          // Trial player MotM
      "remember_me",        // Recruit ex-trial player
      "one_more_year",      // Delayed retirement player scores
      "guard_of_honour",    // Win with testimonial player
      "not_a_dry_eye",      // Testimonial player scores farewell
    ],
  },

  // ── TIER PROGRESSION ──────────────────────────────────────────
  {
    id: "peach_cigs",
    name: "Peach Cigs",
    icon: "🍑",
    color: "#fb923c",
    colorLight: "#fed7aa",
    colorDark: "#c2410c",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "tier_reached", tier: 7 },
    unlockDesc: "Reach tier 7",
    achievementIds: [
      "champion",           // Win the league
      "promoted",           // Win promotion
      "relegated",          // Get relegated
      "win_sunday",         // Win Concrete Schoolyard
      "win_non_league",     // Win The Alley
      "win_conference",     // Win Sunday League
      "win_league_two",     // Win The Dojo
      "win_league_one",     // Win Forest Hills
      "win_championship",   // Win Altitude Trials
      "promised_land",      // Reach The Federation
    ],
  },
  {
    id: "strawberry_cigs",
    name: "Strawberry Cigs",
    icon: "🍓",
    color: "#e11d48",
    colorLight: "#fda4af",
    colorDark: "#9f1239",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "tier_reached", tier: 3 },
    unlockDesc: "Reach tier 3",
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
    ],
  },
  {
    id: "starfruit_cigs",
    name: "Starfruit Cigs",
    icon: "⭐",
    color: "#facc15",
    colorLight: "#fef08a",
    colorDark: "#a16207",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "tier_reached", tier: 1 },
    unlockDesc: "Reach the top league",
    achievementIds: [
      "englishman_in_new_york", // Sign an Alien
      "area_51",             // Sign 5 Aliens
      "we_come_in_peace",    // Beat an Alien team
      "take_me_to_your_leader", // Beat IG leaders by 3+
      "destroy_all_humans",  // All-Alien starting XI
      "first_contact",       // Alien team 100% relationship
      "time_dilation",       // Retirement in IG
      "xenomorph",           // Train Alien new position
      "phone_home",          // Win all home in IG
      "scooty_puff_jr",     // Relegated from IG (player unlock)
    ],
  },

  // ── SEASON FORM + LEAGUE MASTERY ──────────────────────────────
  {
    id: "blueberry_cigs",
    name: "Blueberry Cigs",
    icon: "🫐",
    color: "#6366f1",
    colorLight: "#a5b4fc",
    colorDark: "#3730a3",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "seasons_played", count: 3 },
    unlockDesc: "Play 3 seasons",
    achievementIds: [
      "unbeaten_10",        // 10 matches unbeaten
      "draw_specialists",   // Draw 3 in a row
      "vote_confidence",    // Lose 5 in a row
      "manager_month",      // Win 4+ in a row
      "injury_prone",       // Same player injured 3x
      "heavy_metal",        // 3 matches with 5+ goals
      "clean_5",            // 5 clean sheets in season
      "goals_50",           // 50+ goals in season
      "fortress",           // No home losses in season
      "on_the_road",        // 5 away wins in season
    ],
  },
  {
    id: "pomegranate_cigs",
    name: "Pomegranate Cigs",
    icon: "🔴",
    color: "#dc2626",
    colorLight: "#fca5a5",
    colorDark: "#7f1d1d",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "packs_complete", count: 10 },
    unlockDesc: "Complete 10 cigarette packs",
    achievementIds: [
      "invincibles",        // Win league unbeaten
      "centurions",         // Win every league match
      "squeaky",            // Win league by 1 point
      "aguero",             // Win league on final matchday
      "efficient_machine",  // Win league without best GD
      "mentality_monsters", // Win every match in every competition in a season
      "flat_track",         // Beat every bottom-half team
      "big_game",           // Beat every top-3 team
      "respect_badge",      // Beat every team at least once
      "bag_man",            // League top scorer
    ],
  },

  // ── THEMATIC PACKS ────────────────────────────────────────────
  {
    id: "watermelon_cigs",
    name: "Watermelon Cigs",
    icon: "🍉",
    color: "#16a34a",
    colorLight: "#86efac",
    colorDark: "#14532d",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "mango_cigs" },
    unlockDesc: "Complete the Mango Cigs pack",
    achievementIds: [
      "absolute_cinema",    // Win conceding 3+
      "brace_yourself",     // Injured player scores brace
      "remember_the_name",  // Score on debut
      "smash_grab",         // 1-0 vs league leaders
      "up_for_a_corner",    // GK scores
      "slim_motm",          // Low-rated MotM
      "snoozefest",         // Dull 0-0
      "salt_wounds",        // 4+ vs bottom team
      "who_shot_rr",        // Injury return brace (player unlock)
      "score_draw",         // High-scoring draw
    ],
  },
  {
    id: "dragonfruit_cigs",
    name: "Dragonfruit Cigs",
    icon: "🐉",
    color: "#e91e8c",
    colorLight: "#f9a8d4",
    colorDark: "#9d174d",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "pear_cigs" },
    unlockDesc: "Complete the Pear Cigs pack",
    achievementIds: [
      "double_pivot",       // Two CMs defensive training
      "emergency_gk",       // Outfield player in goal
      "safe_hands",         // Clean sheet with outfield GK
      "old_guard",          // 5 starters aged 33
      "benchwarmer",        // Same player benched 10 games
      "false_nine",         // Win with no strikers
      "park_the_bus",       // Win 1-0 with 5+ defenders
      "total_voetbal",      // Win with no natural positions
      "liquid_football",    // 3+ learned positions in XI
      "inverted_wingers",   // LW in RW and RW in LW
    ],
  },
  {
    id: "guava_cigs",
    name: "Guava Cigs",
    icon: "🌺",
    color: "#fb7185",
    colorLight: "#fecdd3",
    colorDark: "#be123c",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "fig_cigs" },
    unlockDesc: "Complete the Fig Cigs pack",
    achievementIds: [
      "talent_spotter",     // 5 players on shortlist
      "the_black_book",     // 15+ on shortlist
      "deadline_day",       // Trade in final transfer week
      "window_shopping",    // Window closes without deal
      "twelfth_man_roar",   // Win by 3+ with 12th Man
      "cat_like_reflexes",  // GK 8+ clean sheets in season
      "instant_impact",     // Transfer Insider scores on debut
      "lazarus",            // Miracle Cream player scores
      "made_it_his_own",    // Renamed player MotM
      "nom_de_guerre",      // Renamed player scores
    ],
  },

  // ── LEGACY + LONG-TERM ────────────────────────────────────────
  {
    id: "passionfruit_cigs",
    name: "Passionfruit Cigs",
    icon: "💜",
    color: "#a855f7",
    colorLight: "#d8b4fe",
    colorDark: "#7e22ce",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "seasons_played", count: 10 },
    unlockDesc: "Complete 10 seasons",
    // century_club and band_of_brothers moved out (to Persimmon — see
    // below); both are long-career cards in their own right, but Persimmon
    // needed the backfill more and these two are the least Passionfruit-
    // specific (they don't touch All-Time XI/records like their siblings).
    // hat_trick, taxi_for, and brothers_in_arms — themselves a prior
    // backfill from Apple — moved out again (to Mango and Plum — see
    // above): none of the three touch All-Time XI/records like this pack's
    // other cards, and Mango/Plum needed the backfill more. Backfilled with
    // mixed_up, perfect_motm, and mr_consistent (from Mango) — luck/freak
    // in-match triggers that fit this pack's "things that take a long time
    // to see" depth better than an early pack; restores size to 10.
    achievementIds: [
      "season_10",          // Complete 10 seasons
      "all_time_top",       // Top all-time league scorers
      "all_timers",         // All-Time XI all 7.0+
      "legendary_dynasty",  // Same surname in All-Time XI
      "brexit",             // All-British All-Time XI
      "first_name_terms",   // 3 players same first name
      "one_club_man",       // Youth intake 200 apps first
      "mixed_up",           // Defensive striker scores (player unlock, moved from Mango)
      "perfect_motm",       // 10.0 MotM (moved from Mango)
      "mr_consistent",      // Exactly 7.0 rating 3 times (moved from Mango)
    ],
  },
  {
    id: "cranberry_cigs",
    name: "Cranberry Cigs",
    icon: "🔻",
    color: "#b91c1c",
    colorLight: "#fca5a5",
    colorDark: "#7f1d1d",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "blueberry_cigs" },
    unlockDesc: "Complete the Blueberry Cigs pack",
    achievementIds: [
      "back_to_back",       // Promote in consecutive seasons
      "yo_yo",              // Relegated after promoted
      "free_fall",          // Relegated consecutively
      "no_cutting",         // Draw 5 matches in season
      "no_cards",           // Season without a card
      "great_escape",       // 8th from 10th at halfway
      "away_day_merchants", // Win every away match
      "mid_table",          // Finish exactly 5th
      "wooden_spoon",       // Finish bottom
      "forest_hills_conqueror", // 5 away wins in Forest Hills (player unlock)
    ],
  },
  {
    id: "tangerine_cigs",
    name: "Tangerine Cigs",
    icon: "🍊",
    color: "#f59e0b",
    colorLight: "#fde68a",
    colorDark: "#b45309",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "coconut_cigs" },
    unlockDesc: "Complete the Coconut Cigs pack",
    achievementIds: [
      "prodigal_son",       // Rehabilitate released player
      "kolo_kolo",          // Ex-trial defender wins league (player unlock)
      "prodigy_intake",     // Youth Coup player highest OVR
      "number_one",         // Same GK 15+ starts in season
      "just_a_niggle",      // Same injury type 3x in season
      "the_sick_note",      // 3 different injury types
      "scouts_honour",      // Sign 3 different trial players
      "bayda",              // MF 8.5+ without scoring (player unlock)
      "cursed",             // 3 injuries from training
      "sick_as_a_parrot",   // Outfield trains GK
    ],
  },
  {
    id: "melon_cigs",
    name: "Melon Cigs",
    icon: "🍈",
    color: "#65a30d",
    colorLight: "#d9f99d",
    colorDark: "#365314",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "passionfruit_cigs" },
    unlockDesc: "Complete the Passionfruit Cigs pack",
    // get_it_in_the_mixer, well_seasoned, and baby_faced moved out (to Pear
    // — see above): trivial one-off squad-composition choices, not
    // long-career achievements, so gating them behind 10 seasons + a full
    // Passionfruit pack meant most players did the thing ages before ever
    // getting credit for it. Backfilled with ticket_tout (from Fig) and
    // veteran + always_bridesmaid (from Grape) — genuinely long-career
    // content that belongs this deep.
    achievementIds: [
      "true_strike",        // Non-unlockable 50 goals first
      "purist",             // Non-unlockable 100 apps first
      "our_man",            // Non-unlockable 30 MotM first
      "on_your_head_son",   // Youth intake 100 goals first
      "fan_favourite",      // Youth intake 60 MotM first
      "old_boys_network",   // Trade with every 75%+ club
      "full_circle",        // Prodigal player wins league
      "ticket_tout",        // Use all 11 ticket types
      "veteran",            // Player reaches age 42
      "always_bridesmaid",  // Finish 2nd three times
    ],
  },
  {
    id: "apricot_cigs",
    name: "Apricot Cigs",
    icon: "🟠",
    color: "#fdba74",
    colorLight: "#ffedd5",
    colorDark: "#c2410c",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "packs_complete", count: 5 },
    unlockDesc: "Complete 5 cigarette packs",
    achievementIds: [
      "cruise_control",     // 10+ matches on holiday
      "speed_demon",        // 10 fastest speed matches
      "fresh_legs",         // Use all 5 subs
      "hes_changed_it",     // Sub before 30th minute
      "whats_he_doing",     // Sub MotM without scoring
      "deja_vu_training",   // Same name back to back in report
      "formation_roulette", // 3 formations in a season
      "absentee_landlord",  // Win league on holiday
      "from_the_bottom",    // Win at Federation or above
      "just_right",         // Every Euro Dynasty opponent 2x
    ],
  },

  // ── SEASON DOMAIN (Awards Night, knockouts, history, newspaper) ─
  {
    id: "quince_cigs",
    name: "Quince Cigs",
    icon: "🍎",
    color: "#ca8a04",
    colorLight: "#fde68a",
    colorDark: "#854d0e",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "seasons_played", count: 6 },
    unlockDesc: "Play 6 seasons",
    achievementIds: [
      "top_of_the_bill",       // Your player wins Player of the Season
      "raised_right",          // Homegrown player wins Young Player of the Season
      "clean_sweep",           // Your players win all three awards
      "robbed",                // 20+ goals but miss the Golden Boot
      "doing_it_all",          // Same player wins POTS and YPOTS
      "no_country_for_old_men", // 33+ year old wins Player of the Season
      "defenders_no_respect",  // Defender/GK wins Player of the Season
      "repeat_offender",       // Same player wins POTS twice
      "class_of_their_own",    // All three awards go to one rival club
      "carried",               // Golden Boot but bottom-half finish
    ],
  },
  {
    id: "pineapple_cigs",
    name: "Pineapple Cigs",
    icon: "🍍",
    color: "#fbbf24",
    colorLight: "#fde68a",
    colorDark: "#b45309",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "tier_reached", tier: 3 },
    unlockDesc: "Reach tier 3",
    achievementIds: [
      "succession",            // Win the Dynasty Cup
      "through_side_door",     // 4th place, promoted via the Dynasty Cup
      "five_a_side_story",     // Win the 5v5 Mini-Tournament
      "both_barrels",          // League + Dynasty Cup same season
      "bottled_it_beautifully", // Win league, lose Dynasty Cup final
      "bronze_age",            // Win the 5v5 third-place playoff
      "giant_slaying_mini",    // Win the 5v5 as the 4th seed
      "knockout_artist",       // Win both knockout competitions, career
      "undercard",             // Reach Dynasty Cup final from 4th
      "kingmaker_denied",      // Beat the league champions in a final
    ],
  },
  {
    id: "date_cigs",
    name: "Date Cigs",
    icon: "🌰",
    color: "#78350f",
    colorLight: "#d6a67a",
    colorDark: "#451a03",
    packSize: 5,
    starter: false,
    unlockCondition: { type: "seasons_played", count: 8 },
    unlockDesc: "Complete 8 seasons",
    achievementIds: [
      "been_everywhere_man",   // Finish 1st through 10th across a career
      "unfinished_business",   // Win a division you were relegated from
      "yo_yo_years",           // Promoted, relegated, promoted again
      "watching_the_throne",   // A rival wins 3 straight titles elsewhere
      "wooden_spoon_collection", // Finish bottom in 2 different divisions
    ],
  },
  {
    id: "redcurrant_cigs",
    name: "Redcurrant Cigs",
    icon: "🍅",
    color: "#dc2626",
    colorLight: "#fca5a5",
    colorDark: "#7f1d1d",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "seasons_played", count: 5 },
    unlockDesc: "Play 5 seasons",
    achievementIds: [
      "the_blueprint",         // Paper names your squad's playing identity
      "route_one_reputation",  // Labelled a counter-attacking side
      "nothing_gets_past_us",  // Labelled a defensive wall
      "keep_ball_merchants",   // Labelled a possession side
      "front_page_news",       // Earn a special back page
      "framed_above_desk",     // Collect all three special back pages
      "derby_day_ink",         // Make the back page with a derby result
      "same_time_next_year",   // Same league position 3 seasons running
      "fixtures_and_fittings", // Season preview calls you part of the furniture
      "hat_trick_headlines",   // Hat-trick back pages for 3 players, 1 season
    ],
  },

  // ── SPECIALIST 5-PACKS ────────────────────────────────────────
  {
    id: "rambutan_cigs",
    name: "Rambutan Cigs",
    icon: "🦔",
    color: "#f43f5e",
    colorLight: "#fda4af",
    colorDark: "#9f1239",
    packSize: 5,
    starter: false,
    // Gates deep now (was packs_complete: 3) — a FREAK-novelty pack built
    // entirely around specific BGM-track-sync triggers has no business
    // surfacing to a player 3 packs in, long before they've plausibly
    // heard most of these tracks play out under the right conditions.
    unlockCondition: { type: "packs_complete", count: 12 },
    unlockDesc: "Complete 12 cigarette packs",
    achievementIds: [
      "forgot_kit",         // Injury while Forgot Kit plays
      "soundtrack",         // Win shootout while Shootout plays
      "gone_up_one_track",  // Promoted while Gone Up One plays
      "ice_bath_track",     // Recover while Ice Bath plays
      "training_montage",   // Gain while Training plays
    ],
  },
  {
    id: "lemon_cigs",
    name: "Lemon Cigs",
    icon: "🍋",
    color: "#fde047",
    colorLight: "#fef9c3",
    colorDark: "#a16207",
    packSize: 5,
    starter: false,
    // Gates deep now (was packs_complete: 3) — same FREAK-novelty reasoning
    // as Rambutan above: perfect-conditions/luck triggers (specific player
    // names, minute-equals-age, repeat scorelines) that shouldn't be the
    // 4th pack a new player sees.
    unlockCondition: { type: "packs_complete", count: 14 },
    unlockDesc: "Complete 14 cigarette packs",
    achievementIds: [
      "enzo_drive",         // Enzo scores late winner
      "nomin_determ",       // Baker/Cook/King hat-trick
      "six_seven",          // Goal in 67th minute
      "its_a_sign",         // Score in minute = age
      "deja_vu",            // Same score 3 in a row
    ],
  },
  {
    id: "plum_cigs",
    name: "Plum Cigs",
    icon: "🟣",
    color: "#7c3aed",
    colorLight: "#c4b5fd",
    colorDark: "#4c1d95",
    packSize: 5,
    starter: false,
    unlockCondition: { type: "tier_reached", tier: 5 },
    unlockDesc: "Reach tier 5",
    // tots_league_one (Forest Hills, tier 7) and tots_championship (Altitude
    // Trials, tier 6) moved out (to Mango — see above): both tiers are
    // already behind you by the time you reach tier 5 and this pack
    // unseals, so they were guaranteed pre-banked on open — the exact
    // pre-bank-in-the-unlock-condition problem this file's own conventions
    // call out (see the Lime Cigs fix). Backfilled with taxi_for and
    // brothers_in_arms (from Passionfruit) to restore size to 5.
    achievementIds: [
      "tots_premier",       // TOTS at Federation+
      "tots_premier_3",     // 3+ in TOTS at Federation+
      "tots_premier_5",     // 5+ in TOTS at Federation+
      "taxi_for",           // Red card (moved from Passionfruit)
      "brothers_in_arms",   // Same surname both score (moved from Passionfruit)
    ],
  },
  {
    id: "olive_cigs",
    name: "Olive Cigs",
    icon: "🫒",
    color: "#78716c",
    colorLight: "#d6d3d1",
    colorDark: "#44403c",
    packSize: 5,
    starter: false,
    unlockCondition: { type: "packs_complete", count: 10 },
    unlockDesc: "Complete 10 cigarette packs",
    achievementIds: [
      "odds_are_even",      // All 7 attrs same value
      "binary",             // All attributes at 10
      "the_specialist",     // 20 in one, under 5 in another
      "fox_box",            // ST scores 5 consecutive
      "swiss_army_knife",   // Player learns 3+ positions
    ],
  },
  {
    id: "jackfruit_cigs",
    name: "Jackfruit Cigs",
    icon: "🟡",
    color: "#d97706",
    colorLight: "#fde68a",
    colorDark: "#78350f",
    packSize: 5,
    starter: false,
    unlockCondition: { type: "packs_complete", count: 10 },
    unlockDesc: "Complete 10 cigarette packs",
    achievementIds: [
      "stat_20",            // Train attribute to 20
      "peak_perf",          // Starting XI all 15+
      "golden_gen",         // 5 squad players 18+
      "maxed_out",          // Player reaches 20 in all stats
      "dynasty",            // Win league 3 times
    ],
  },

  // ── FINAL PACK ────────────────────────────────────────────────
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
    // cult_hero and worth_the_wait moved out (to Lime — see above): neither
    // is a "win a tier's title" card like the rest of this pack, and Kiwi's
    // win_global/win_ultimate moving in (see below) needed the room.
    // Backfilled with win_global and win_ultimate (from Kiwi) — the two cup
    // completionist wins join this pack's tier-title completionist cluster,
    // making every card here a "win the whole thing" achievement and
    // restoring size to 10.
    achievementIds: [
      "sunday_to_stars",    // Title in every tier
      "tinpot_treble",      // Titles in 3 divisions
      "win_premier",        // Win The Federation
      "scooty_puff_sr",     // Win IG in 2nd season
      "win_saudi",          // Win Saudi Super League
      "win_european",       // Win Euro Dynasty
      "win_world_xi",       // Win World XI Invitational
      "win_intergalactic",  // Win Intergalactic Elite
      "win_global",         // Win Global Cup (moved from Kiwi)
      "win_ultimate",       // Win Ultimate Cup (moved from Kiwi)
    ],
  },

  // ── LATE GAME ─────────────────────────────────────────────────
  {
    id: "persimmon_cigs",
    name: "Persimmon Cigs",
    icon: "🟧",
    color: "#ea580c",
    colorLight: "#fdba74",
    colorDark: "#9a3412",
    packSize: 10,
    starter: false,
    unlockCondition: { type: "pack_complete", packId: "pomegranate_cigs" },
    unlockDesc: "Complete the Pomegranate Cigs pack",
    // shooting_blanks, injections, asymmetry, and jumpers_for_goalposts
    // moved out (to Blackcurrant/Cherry/Apple — see above): one-off
    // tactical/UI-action trivia, not late-game content. Backfilled with
    // fifty_not_out (from Grape), century_club + band_of_brothers (from
    // Passionfruit), and old_faithful (from Lychee) — genuinely long-career
    // content pulled up from mid/late packs to restore packSize.
    achievementIds: [
      "open_all_hours",     // No clean sheets in season
      "tactical_foul",      // Most booked player
      "old_pace",           // 30+ with 20 Pace
      "giant_killing",      // Beat Albion
      "impossible_job",     // Lose to Nomads
      "good_engine",        // CM with 15+ Physical & Mental
      "fifty_not_out",      // 50 career appearances
      "century_club",       // 100 career goals
      "band_of_brothers",   // 8+ players 3+ seasons
      "old_faithful",       // Player aged 36+ starting
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
