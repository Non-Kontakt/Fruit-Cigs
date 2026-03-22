export const TIER_WIN_ACHS = { 11: "win_sunday", 10: "win_non_league", 9: "win_conference", 8: "win_league_two", 7: "win_league_one", 6: "win_championship", 5: "win_premier", 4: "win_saudi", 3: "win_european", 2: "win_world_xi", 1: "win_intergalactic" };

export const ACHIEVEMENTS = [
  // === FIRST STEPS — early unlocks every new player will hit ===
  { id: "first_gain", name: "Baby Steps", desc: "Have a player gain their first stat point", icon: "👶" },
  { id: "first_win", name: "Off The Mark", desc: "Win your first match", icon: "✌️" },
  { id: "duo_boost", name: "Dynamic Duo", desc: "Trigger a duo boost in training", icon: "🤝" },
  { id: "clean_sheet", name: "Brick Wall", desc: "Keep a clean sheet", icon: "🧱" },
  { id: "bore_draw", name: "Bore Draw", desc: "Draw a game 0-0", icon: "😴" },
  { id: "no_comment", name: "No Comment", desc: "Watch an entire match at fast speed", icon: "⏩" },

  // === MATCH RESULTS — scoreline-based achievements ===
  { id: "score_draw", name: "Score Draw", desc: "Draw a game with both teams scoring 3+", icon: "🎭" },
  { id: "total_football", name: "Total Football", desc: "Win a match by 5 goals or more", icon: "🧡" },
  { id: "clinical", name: "Clinical", desc: "Win a match where the opponent had more shots", icon: "🎯" },
  { id: "smash_grab", name: "Smash & Grab", desc: "Win 1-0 against the current league leaders", icon: "🦝" },
  { id: "snoozefest", name: "Snoozefest", desc: "Watch a 0-0 with fewer than 10 commentary events", icon: "💤" },
  { id: "fergie_time", name: "Fergie Time", desc: "Win a match with a goal in the 89th or 90th minute", icon: "⏱️" },
  { id: "last_gasp", name: "Last Gasp", desc: "Score in the 90th minute to win the match", icon: "😱" },
  { id: "comeback", name: "Back From The Brink", desc: "Win a match having been 2-0 down", icon: "🔥" },
  { id: "early_exits", name: "Early Exits", desc: "Lose a match 5-0 or worse", icon: "🚪" },

  // === PLAYER MOMENTS — individual performances ===
  { id: "hat_trick", name: "One Man Army", desc: "Have a player score 3+ goals in a match", icon: "🎩" },
  { id: "all_four_of_them", name: "All Four of Them!", desc: "Have a player score 4+ goals in a single match", icon: "🤯" },
  { id: "fox_box", name: "Fox In The Box", desc: "Have a ST score in 5 consecutive matches", icon: "🦊" },
  { id: "perfect_motm", name: "Ran The Show", desc: "Your player was MotM with a perfect 10 rating", icon: "💯" },
  { id: "slim_motm", name: "Slim Pickings", desc: "Your player was MotM with lower than a 7.0 rating", icon: "😬" },
  { id: "wonderkid", name: "Wonderkid", desc: "Have a player under 19 be Man of the Match", icon: "🌟" },
  { id: "captain_material", name: "Captain Material", desc: "Same player MotM 3 times in a season", icon: "🎖️" },
  { id: "mr_consistent", name: "Mr. Consistent", desc: "A player gets exactly 7.0 match rating 3 times", icon: "📏" },
  { id: "dirty_harry", name: "Dirty Harry", desc: "Have 3+ yellow cards in a single match for your team", icon: "👮" },
  { id: "seeing_red", name: "Seeing Red", desc: "Win a match with fewer than 11 men on the pitch", icon: "🟥" },

  // === QUIRKY & EASTER EGGS — fun/unusual triggers ===
  { id: "mixed_up", name: "Mixed Up", desc: "A striker on Defensive Work training scores in a win", icon: "🔀" },
  { id: "enzo_drive", name: "Enzo And Drive", desc: "Score with a player called Enzo in the last 10 mins and win", icon: "🏎️" },
  { id: "nomin_determ", name: "Nominative Determinism", desc: "A player called Baker, Cook or King scores a hat-trick", icon: "📛" },
  { id: "who_shot_rr", name: "Who Shot RR?", desc: "Have a player return from injury and score a brace in their first game back", icon: "🔫" },
  { id: "joga_bonito", name: "Joga Bonito", desc: "Have a Brazilian player score a goal in a Cup match", icon: "🇧🇷" },
  { id: "bayda", name: "Bayda", desc: "Have a Midfielder achieve an average rating of 8.5+ in a game without scoring", icon: "🧙" },
  { id: "old_pace", name: "He's Having A Party", desc: "Have a player aged 30+ with 20 Pace in a match", icon: "🎉" },
  { id: "giant_killing", name: "Giant Killing", desc: "Beat Albion", icon: "⚔️" },
  { id: "impossible_job", name: "The Impossible Job", desc: "Lose to Nomads", icon: "🤯" },
  { id: "deja_vu", name: "Déjà Vu", desc: "Get the exact same scoreline in 3 consecutive matches", icon: "🔁" },
  { id: "odds_are_even", name: "Odds Are Even", desc: "Have a player with all 7 attributes on the same value", icon: "⚖️" },
  { id: "hand_of_god", name: "Hand Of God", desc: "Win 1-0 with your GK as Man of the Match", icon: "✋" },
  { id: "salt_wounds", name: "Salt In The Wounds", desc: "Score 4+ goals against the bottom-placed team", icon: "🧂" },
  { id: "six_seven", name: "6-7", desc: "Win a match with a goal in the 67th minute", icon: "6️⃣" },
  { id: "its_a_sign", name: "It's A Sign", desc: "A player scores in the minute matching their age", icon: "🔮" },
  { id: "absolute_barclays", name: "Absolute Barclays", desc: "Win a match with 3+ cards and 5+ total goals", icon: "🤪" },
  { id: "dads_army", name: "Dad's Army", desc: "Win with a 10+ year age gap between your oldest and youngest starter", icon: "🎖" },
  { id: "the_specialist", name: "The Specialist", desc: "Have a player with 20 in one stat but under 5 in another", icon: "🔬" },

  // === SQUAD TACTICS — lineup and formation decisions ===
  { id: "rotation", name: "Rotation Policy", desc: "Start a different Starting XI in two consecutive matches", icon: "🔄" },
  { id: "out_of_pos", name: "He Doesn't Even Go Here", desc: "Play a match with a player out of position", icon: "🤷" },
  { id: "bench_best", name: "I'm The Manager", desc: "Bench your highest rated player (not injured) for a match", icon: "😤" },
  { id: "all_or_nothing", name: "All Or Nothing", desc: "Start a match with 0 players on the bench", icon: "🎲" },
  { id: "bench_fwd", name: "Bench Pressed", desc: "Win a match with a bench full of Forwards", icon: "🏋️" },
  { id: "benchwarmer", name: "Benchwarmer", desc: "Have the same player on the bench for 10 consecutive matchdays", icon: "🪑" },
  { id: "double_pivot", name: "The Double Pivot", desc: "Have two CMs both training Defensive Work", icon: "🛡️" },
  { id: "emergency_gk", name: "Emergency Backup", desc: "Have an outfield player play a match in goal", icon: "🧤" },
  { id: "safe_hands", name: "Safe Hands", desc: "Keep a clean sheet with an outfield player in goal", icon: "🙌" },
  { id: "family", name: "Start A Family", desc: "Have 3 starters with the same surname", icon: "👪" },
  { id: "old_guard", name: "For Those Who Come After", desc: "Have 5 starters aged 33 in a match", icon: "👴" },
  { id: "well_seasoned", name: "Well Seasoned", desc: "Field a Starting XI with average age over 30", icon: "🧓" },
  { id: "baby_faced", name: "Baby Faced", desc: "Field a Starting XI with average age under 20", icon: "🍼" },

  // === TRAINING — training focus achievements ===
  { id: "tinkerer", name: "The Tinkerer", desc: "Change every player's training focus in a single week", icon: "🔧" },
  { id: "only_fans", name: "Only Fans", desc: "Have 8+ starters training Ball Mastery in the same week", icon: "🪩" },
  { id: "npc", name: "NPC", desc: "Have 8+ starters doing General Training in the same week", icon: "🤖" },
  { id: "finish_food", name: "Finish Your Food", desc: "Have 8+ starters training Finishing in the same week", icon: "🍽️" },
  { id: "gym_rats", name: "Gym Rats", desc: "Have 8+ starters training Gym & Conditioning in the same week", icon: "🐀" },
  { id: "speed_freaks", name: "Speed Freaks", desc: "Have 8+ starters training Speed Drills in the same week", icon: "💨" },
  { id: "cursed", name: "Cursed", desc: "Receive 3 injuries from a single training session", icon: "🩼" },

  // === PLAYER DEVELOPMENT — stat growth and squad building ===
  { id: "through_the_roof", name: "Through The Roof", desc: "A player gains +2 OVR in a single week", icon: "🚀" },
  { id: "stat_15", name: "Star Quality", desc: "Have any player reach 15 in a stat", icon: "⭐" },
  { id: "stat_20", name: "Stat Anorak", desc: "Train a player's attribute to 20", icon: "📊" },
  { id: "centurion", name: "Centurion", desc: "Reach 100 total stat gains across your squad", icon: "💪" },
  { id: "our_academy", name: "Our Academy", desc: "Train a player under 21 to have 3 stats reach 18", icon: "🎓" },
  { id: "peak_perf", name: "Peak Performance", desc: "Entire Starting XI with OVR 15+", icon: "📈" },
  { id: "golden_gen", name: "Golden Generation", desc: "Have 5 squad players with OVR 18+", icon: "✨" },
  { id: "maxed_out", name: "Maxed Out", desc: "Have any player reach 20 in all 7 attributes", icon: "🏅" },

  // === YOUTH & VETERANS �� age-related ===
  { id: "youth_grad", name: "One Of Our Own", desc: "Have a youth intake player score in a match", icon: "🌱" },
  { id: "fresh_blood", name: "Fresh Blood", desc: "Sign 3 youth players in a single intake", icon: "🩸" },
  { id: "old_faithful", name: "Old Faithful", desc: "Have a player aged 36+ still in your Starting XI", icon: "🫡" },
  { id: "testimonial", name: "Testimonial", desc: "Have a player retire who played 30+ matches for you", icon: "👏" },

  // === SEASON TRACKING — tracked across a full season ===
  { id: "unbeaten_10", name: "Unbeaten Run", desc: "Go 10 matches unbeaten", icon: "🔰" },
  { id: "draw_specialists", name: "Draw Specialists", desc: "Draw 3 matches in a row", icon: "🤝" },
  { id: "vote_confidence", name: "The Dreaded Vote of Confidence", desc: "Lose 5 matches in a row", icon: "📉" },
  { id: "manager_month", name: "Manager Of The Month", desc: "Win 4 or more matches in a row", icon: "📋" },
  { id: "injury_prone", name: "Injury Prone", desc: "Same player gets injured 3 times in a single season", icon: "🏥" },
  { id: "heavy_metal", name: "Heavy Metal Football", desc: "Play 3 matches in a season with 5+ total goals each", icon: "🎸" },
  { id: "clean_5", name: "Clean Sheet Merchant", desc: "Keep 5 clean sheets in a season", icon: "🧤" },
  { id: "goals_50", name: "Eat My Goal", desc: "Score 50+ goals in a season", icon: "🍔" },
  { id: "no_cutting", name: "No Cutting Edge", desc: "Draw 5 matches in a season", icon: "✂️" },
  { id: "fortress", name: "Fortress", desc: "Lose no home games in a season", icon: "🏰" },
  { id: "on_the_road", name: "On The Road", desc: "Win 5 away matches in a season", icon: "🚌" },
  { id: "respect_badge", name: "Respect The Badge", desc: "Beat every team in the league at least once in a season", icon: "🫡" },
  { id: "no_cards", name: "Salt & Linekar", desc: "Complete a season without any player receiving a card", icon: "😇" },
  { id: "great_escape", name: "The Great Escape", desc: "Finish in 8th having been 10th at halfway", icon: "🪂" },
  { id: "mid_table", name: "Mid-Table Mediocrity", desc: "Finish a season in exactly 5th place", icon: "🤏" },
  { id: "squeaky", name: "Squeaky Bum Time", desc: "Win the league by 1 point", icon: "🍑" },

  // === CUP — knockout competition ===
  { id: "cup_winner", name: "Silverware", desc: "Win a cup competition", icon: "🏆" },
  { id: "cup_upset", name: "Cup Upset", desc: "Beat a team 3+ tiers above you in the cup", icon: "🫖" },
  { id: "cup_final_loss", name: "So Close", desc: "Lose a cup final", icon: "🥈" },
  { id: "cup_exit_r32", name: "Early Bath", desc: "Get knocked out of the cup in the first round", icon: "🛁" },
  { id: "nerves_of_steel", name: "Nerves of Steel", desc: "Win a penalty shootout", icon: "🥶" },
  { id: "heartbreak", name: "Heartbreak", desc: "Lose a penalty shootout", icon: "💔" },
  { id: "perfect_five", name: "Perfect Five", desc: "Win a penalty shootout without missing a single kick", icon: "🖐️" },
  { id: "sudden_death", name: "Sudden Death", desc: "Win a penalty shootout that went to sudden death", icon: "☠️" },
  { id: "the_double", name: "The Double", desc: "Win the league and the cup in the same season", icon: "🏆" },

  // === MUSIC — BGM-triggered achievements ===
  { id: "forgot_kit", name: "Forgot Kit", desc: "Get a training injury while 'Forgot Kit' is playing", icon: "👟" },
  { id: "soundtrack", name: "Soundtrack", desc: "Win a penalty shootout while 'Shootout' is playing", icon: "🎵" },
  { id: "gone_up_one_track", name: "Gone Up One", desc: "Get promoted while 'Gone Up One' is playing", icon: "🎶" },
  { id: "ice_bath_track", name: "Ice Bath", desc: "A player recovers from injury while 'Ice Bath' is playing", icon: "🧊" },
  { id: "training_montage", name: "Training Montage", desc: "Get a stat gain while 'Training' is playing", icon: "🏋️" },

  // === OVR & META ===
  { id: "level_up", name: "Level Up", desc: "Have a player's OVR increase", icon: "⬆️" },
  { id: "rising_tide", name: "Rising Tide", desc: "Starting XI average OVR reaches 15", icon: "🌊" },
  { id: "impatient", name: "Impatient", desc: "Set training report to LIST and match detail to KEY", icon: "⏭️" },

  // === LEAGUE & TITLES — promotion, relegation, winning ===
  { id: "champion", name: "Champion", desc: "Win the league", icon: "🏆" },
  { id: "promoted", name: "Moving On Up", desc: "Win promotion to a higher league", icon: "📈" },
  { id: "relegated", name: "Trapdoor", desc: "Get relegated to a lower league", icon: "📉" },
  { id: "invincibles", name: "Invincibles", desc: "Win the league without losing a match", icon: "🦁" },
  { id: "centurions", name: "The Centurions", desc: "Win every league match in a season", icon: "💯" },
  { id: "back_to_back", name: "Back to Back", desc: "Win promotion in consecutive seasons", icon: "⬆️" },
  { id: "yo_yo", name: "Yo-Yo Club", desc: "Get relegated the season after being promoted", icon: "🪀" },
  { id: "free_fall", name: "Free Fall", desc: "Get relegated in consecutive seasons", icon: "🪂" },
  // Per-league title wins
  { id: "win_sunday", name: "Lock-In", desc: "Win the Concrete Schoolyard", icon: "🍺" },
  { id: "win_non_league", name: "Part-Timers", desc: "Win The Alley", icon: "🔧" },
  { id: "win_conference", name: "Conference Call", desc: "Win Sunday League", icon: "☎️" },
  { id: "win_league_two", name: "The 92", desc: "Win The Dojo", icon: "🧭" },
  { id: "win_league_one", name: "One Step Beyond", desc: "Win Forest Hills", icon: "🎺" },
  { id: "win_championship", name: "Automatic", desc: "Win Altitude Trials", icon: "🎫" },
  { id: "win_premier", name: "Living The Dream", desc: "Win The Federation", icon: "🍾" },
  { id: "win_saudi", name: "The Project™", desc: "Win the Saudi Super League", icon: "🏗️" },
  { id: "win_european", name: "The Continental", desc: "Win Euro Dynasty", icon: "🌙" },
  { id: "win_world_xi", name: "Dream Team", desc: "Win the World XI Invitational", icon: "💫" },
  { id: "win_intergalactic", name: "Close Encounters", desc: "Win the Intergalactic Elite", icon: "👽" },
  // Per-cup wins
  { id: "win_sub_money", name: "Beer Money", desc: "Win the Sub Money Cup", icon: "🍻" },
  { id: "win_clubman", name: "Proper Cup Run", desc: "Win the Clubman Cup", icon: "🏃" },
  { id: "win_global", name: "Around The World", desc: "Win the Global Cup", icon: "✈️" },
  { id: "win_ultimate", name: "The Holy Grail", desc: "Win the Ultimate Cup", icon: "🏆" },
  { id: "cup_collector", name: "Trophy Cabinet", desc: "Win 2 different cup competitions across your career", icon: "🗄️" },

  // === LEGACY — long-term, multi-season achievements ===
  { id: "journeyman", name: "Journeyman", desc: "Play 50 matches", icon: "🗺️" },
  { id: "season_5", name: "The Long Haul", desc: "Complete 5 seasons", icon: "📅" },
  { id: "dynasty", name: "Dynasty", desc: "Win the league 3 times", icon: "👑" },
  { id: "always_bridesmaid", name: "Always The Bridesmaid", desc: "Finish 2nd in the league three times", icon: "💐" },
  { id: "from_the_bottom", name: "Started From The Bottom", desc: "Win a league at The Federation or above", icon: "🚀" },
  // Trial player achievements
  { id: "reality_check", name: "Reality Check", desc: "Bring a player in on trial but never give them a start", icon: "👀" },
  { id: "opportunity_cost", name: "Opportunity Cost", desc: "Turn down the chance to bring a player in on trial", icon: "🚫" },
  { id: "deep_end", name: "Thrown In The Deep End", desc: "Have a trial player score a goal", icon: "🌊" },
  { id: "trials_hd", name: "Trials HD", desc: "Have a trial player be Man of the Match", icon: "📺" },
  { id: "remember_me", name: "Remember Me?", desc: "Recruit a player you previously had on trial", icon: "🔁" },
  { id: "kolo_kolo", name: "Kolo Kolo", desc: "Recruit an ex-trial defender and win the league with them", icon: "🎵" },
  // Name-based achievements
  { id: "first_name_terms", name: "On First Name Terms", desc: "Have 3 players in your squad with the same first name", icon: "👋" },
  { id: "deja_vu_training", name: "Déjà Vu", desc: "Have 2 players with the same first name appear back to back in a Training Report", icon: "🔄" },
  { id: "brothers_in_arms", name: "Brothers In Arms", desc: "Have 2 players with the same surname both score for the club", icon: "⚔️" },
  { id: "legendary_dynasty", name: "Legendary Dynasty", desc: "Have 2 players with the same surname in your All-Time XI", icon: "👑" },
  // Player milestone achievements
  { id: "golden_boot", name: "Golden Boot", desc: "Have a player score 20+ goals in a season", icon: "👟" },
  { id: "fifty_not_out", name: "Part of the Furniture", desc: "A player reaches 50 career appearances for your club", icon: "🪑" },
  { id: "remember_the_name", name: "Remember The Name", desc: "Have a player score on their debut appearance", icon: "📢" },
  // Negative spiral achievements
  { id: "shooting_blanks", name: "Can't Hit A Barn Door", desc: "Fail to score in 4 consecutive matches", icon: "👢" },
  { id: "wooden_spoon", name: "Wooden Spoon", desc: "Finish bottom of the league", icon: "🥄" },
  { id: "open_all_hours", name: "Open All Hours", desc: "Go an entire season without keeping a clean sheet", icon: "🚪" },
  // Perfect season
  { id: "mentality_monsters", name: "Mentality Monsters", desc: "Win every match in a league season", icon: "🧠" },
  // Cup achievements
  { id: "catenaccio", name: "Catenaccio", desc: "Win the cup without conceding a goal in any round", icon: "🔒" },
  { id: "professional_job", name: "A Professional Job", desc: "Win the cup without needing a single penalty shootout", icon: "💼" },
  // Squad extremes
  { id: "needs_must", name: "Needs Must", desc: "Play a match with 13 or fewer players in your squad", icon: "🦴" },
  { id: "galacticos", name: "Strength In Depth", desc: "Have 25+ players in your squad", icon: "🗄️" },
  // Inbox achievements
  { id: "left_on_read", name: "Left On Read", desc: "Have 10+ unread inbox messages pile up", icon: "📵" },
  { id: "paper_round", name: "Paper Round", desc: "Read 5+ inbox messages in one week", icon: "📰" },
  { id: "prodigal_son", name: "Prodigal Son", desc: "Fully rehabilitate a released player", icon: "🏠" },
  { id: "up_for_a_corner", name: "Up For A Corner", desc: "Score with a goalkeeper", icon: "🧤" },
  { id: "asymmetry", name: "Asymmetry", desc: "Win a match with an asymmetric formation", icon: "⚖️" },
  { id: "just_a_niggle", name: "Just A Niggle", desc: "Same player gets the same type of injury 3+ times in a season", icon: "🩹" },
  { id: "injections", name: "Injections", desc: "Force an injured player to play a match", icon: "💉" },
  { id: "brace_yourself", name: "Brace Yourself", desc: "An injured player scores a brace", icon: "🦿" },
  { id: "binary", name: "Binary", desc: "Have a player with all attributes at 10", icon: "🔟" },
  { id: "efficient_machine", name: "Efficient Machine", desc: "Win the league without having the highest goal difference", icon: "⚙️" },
  { id: "tactical_foul", name: "Tactical Foul", desc: "Have the league's most booked player at season end", icon: "🟨" },
  { id: "bag_man", name: "Bag Man", desc: "Have the league's top scorer at season end", icon: "👜" },
  { id: "all_timers", name: "All-Timers", desc: "All-Time XI with every player rated 7.0+", icon: "⏳" },
  { id: "brexit", name: "Brexit", desc: "Have an all-British All-Time XI", icon: "🇬🇧" },
  { id: "true_strike", name: "True Strike", desc: "First player to 50 career goals is non-unlockable", icon: "🎯" },
  { id: "purist", name: "Purist", desc: "First player to 100 career appearances is non-unlockable", icon: "📜" },
  { id: "our_man", name: "Our Man", desc: "First player to 30 career MotM awards is non-unlockable", icon: "🏅" },
  { id: "on_your_head_son", name: "On Your Head, Son", desc: "First to 100 career goals is a youth intake player", icon: "⚽" },
  { id: "one_club_man", name: "One Club Man", desc: "First to 200 career appearances is a youth intake player", icon: "🏡" },
  { id: "fan_favourite", name: "Fan Favourite", desc: "First to 60 career MotM awards is a youth intake player", icon: "💛" },
  { id: "veteran", name: "Veteran", desc: "Have a player reach age 42", icon: "🧓" },

  // === MATCH — substitution ===
  { id: "super_sub", name: "Super Sub", desc: "A substituted-on player scores a goal", icon: "🦸" },

  // === TICKETS — educational about the ticket system ===
  { id: "golden_ticket", name: "Golden Ticket", desc: "Use your first ticket", icon: "🎫" },
  { id: "ticket_tout", name: "Ticket Tout", desc: "Use all 11 different ticket types across a career", icon: "🎟️" },
  { id: "the_network", name: "The Network", desc: "Set transfer focus on 2 clubs simultaneously", icon: "🕸️" },
  { id: "best_of_friends", name: "Best Of Friends", desc: "Get any club relationship to 100%", icon: "💕" },
  { id: "the_dossier", name: "The Dossier", desc: "Scout 3 players with Dossier tickets", icon: "📋" },
  { id: "formation_roulette", name: "Formation Roulette", desc: "Win with 3 different formations in a single season", icon: "🎰" },

  // === UNIQUE PLAY — rewarding creative or unusual playstyles ===
  { id: "inverted_wingers", name: "Inverted Wingers", desc: "Win with a natural LW in the RW slot and a natural RW in the LW slot", icon: "🔄" },
  { id: "moneyball", name: "Moneyball", desc: "Sign 3 free agents via Transfer Insider tickets", icon: "💰" },
  { id: "lazy_sunday", name: "Lazy Sunday", desc: "Win a match without making any substitutions", icon: "😴" },
  { id: "sweat_equity", name: "Sweat Equity", desc: "Get 4 or more stat gains in a double training week", icon: "💦" },
  { id: "nom_de_guerre", name: "Nom De Guerre", desc: "A renamed player scores in a match", icon: "🎭" },
  { id: "the_dugout", name: "The Dugout", desc: "Manually assign all 11 slot positions", icon: "📌" },

  // === NARRATIVE — post-event story moments ===
  { id: "one_more_year", name: "One More Year", desc: "A player whose retirement was delayed scores a goal", icon: "🕯️" },
  { id: "guard_of_honour", name: "Guard Of Honour", desc: "Win a match with a testimonial player in the squad", icon: "👏" },
  { id: "not_a_dry_eye", name: "Not A Dry Eye", desc: "A testimonial player scores in their farewell match", icon: "😭" },
  { id: "instant_impact", name: "Instant Impact", desc: "A Transfer Insider signing scores on their debut", icon: "⚡" },
  { id: "lazarus", name: "Lazarus", desc: "A player healed by Miracle Cream scores in a match", icon: "🪬" },
  { id: "made_it_his_own", name: "Made It His Own", desc: "A renamed player is Man of the Match", icon: "👑" },
  { id: "comeback_season", name: "Comeback Season", desc: "Finish bottom half one season, top 3 the next", icon: "🔥" },
  { id: "absentee_landlord", name: "Absentee Landlord", desc: "Win the league while on holiday", icon: "🏖️" },

  // === OVR ===
  { id: "1up_addict", name: "1-Up Addict", desc: "Have 5 or more OVR increases in a single week", icon: "🍄" },

  // === STORY ARCS ===
  { id: "plot_armour", name: "Plot Armour", desc: "Complete your first story arc", icon: "📕" },
  { id: "page_turner", name: "Page Turner", desc: "Have 3 arcs active at the same time", icon: "📚" },
  { id: "speedrun", name: "Speedrun", desc: "Complete an arc within 10 weeks", icon: "⏱️" },
  { id: "trilogy", name: "Trilogy", desc: "Complete one arc from each category", icon: "🎬" },
  { id: "box_set", name: "Box Set", desc: "Complete 6 different arcs", icon: "📦" },
  { id: "completionist", name: "Completionist", desc: "Complete all 12 arcs", icon: "💎" },
  { id: "the_gaffer", name: "The Gaffer", desc: "Complete the Captain Fantastic arc", icon: "©️" },
  { id: "we_go_again", name: "We Go Again", desc: "Start a new arc in a category you've already completed one in", icon: "🔁" },
  { id: "cold_feet", name: "Cold Feet", desc: "Abandon a story arc", icon: "🥶" },
  { id: "juiced", name: "Juiced", desc: "Receive an all-squad, all-stats boost from an arc", icon: "💉" },

  // === TOTS — Team of the Season ===
  { id: "tots_league_one", name: "Making The Grade", desc: "Have a player in the Forest Hills TOTS", icon: "🥉" },
  { id: "tots_championship", name: "Rising Stock", desc: "Have a player in the Altitude Trials TOTS", icon: "🥈" },
  { id: "tots_premier", name: "Best In Show", desc: "Have a player in the TOTS at The Federation or above", icon: "🥇" },
  { id: "tots_premier_3", name: "Strength In Numbers", desc: "Have 3+ players in the TOTS at The Federation or above", icon: "💪" },
  { id: "tots_premier_5", name: "Total Domination", desc: "Have 5+ players in the TOTS at The Federation or above", icon: "👑" },

  // === CUP — advanced knockout ===
  { id: "wembley", name: "Wembley Way", desc: "Play in a cup final", icon: "🏟️" },
  { id: "do_it_cold", name: "On A Cold Night In Stoke", desc: "Win an away cup match against a team 3+ tiers above you", icon: "🌧️" },

  // === UNLOCKABLE PLAYERS — post-unlock ===
  { id: "cult_hero", name: "Cult Hero", desc: "Unlockable player scores 20+ goals in a season", icon: "🙌" },
  { id: "worth_the_wait", name: "Worth The Wait", desc: "Unlockable player is Man of the Match on debut", icon: "⏳" },

  // === ALL-TIME RECORDS ===
  { id: "all_time_top", name: "Etched In Stone", desc: "Your player tops the all-time league scorers chart", icon: "🪨" },
  { id: "century_club", name: "Century Club", desc: "A player reaches 100 career goals", icon: "💯" },

  // === LEAGUE DRAMA ===
  { id: "aguero", name: "AGÜEROOOO!", desc: "Win the league on the final matchday", icon: "📺" },
  { id: "flat_track", name: "Flat Track Bully", desc: "Beat every team in the bottom half in a season", icon: "🎯" },
  { id: "big_game", name: "Big Game Player", desc: "Beat every team in the top 3 (excl. yourself) in a season", icon: "🦁" },

  // === CAREER PROGRESSION ===
  { id: "promised_land", name: "The Promised Land", desc: "Reach The Federation for the first time", icon: "⛅" },
  { id: "tinpot_treble", name: "The Tinpot Treble", desc: "Win the title in 3 different divisions across your career", icon: "🏆" },
  { id: "sunday_to_stars", name: "Sunday To The Stars", desc: "Win a title in every tier from Concrete Schoolyard to Intergalactic Elite", icon: "🌟" },

  // === TACTICAL ===
  { id: "park_the_bus", name: "Park The Bus", desc: "Win 1-0 with 5+ defenders in your Starting XI", icon: "🚌" },
  { id: "total_voetbal", name: "Total Voetbal", desc: "Win with no player in their natural position in the Starting XI", icon: "🇳🇱" },

  // === MISC ===
  { id: "scouts_honour", name: "Scout's Honour", desc: "Sign 3 different trial players across your career", icon: "🔭" },
  { id: "end_of_an_era", name: "End Of An Era", desc: "Have 3+ players retire at the end of one season", icon: "😢" },

  // === POSITION LEARNING ===
  { id: "shape_shifter", name: "Shape Shifter", desc: "Have any player complete position training for the first time", icon: "🔄" },
  { id: "new_tricks", name: "New Tricks", desc: "A player aged 30 or over completes position training", icon: "🎓" },
  { id: "sick_as_a_parrot", name: "Sick As A Parrot", desc: "An outfield player completes training to play in goal", icon: "🦜" },
  { id: "liquid_football", name: "Liquid Football", desc: "Win a match with 3 or more starters playing in learned positions", icon: "💧" },

  // === SUBSTITUTIONS ===
  { id: "whats_he_doing", name: "What's He Doing On The Bench?", desc: "A substitute wins Man of the Match without scoring", icon: "🪑" },
  { id: "fresh_legs", name: "Fresh Legs", desc: "Use all 5 substitutions in a single match", icon: "🦵" },
  { id: "hes_changed_it", name: "He's Changed It", desc: "Make a substitution before the 30th minute", icon: "📋" },

  // === MATCH EVENTS ===
  { id: "taxi_for", name: "Taxi For...", desc: "A player receives a red card", icon: "🚕" },
  { id: "absolute_cinema", name: "Absolute Cinema", desc: "Win a match in which the opposition scored 3 or more goals", icon: "🎬" },
  { id: "heads_up", name: "Heads Up", desc: "Win a match having trailed at half-time", icon: "🏃" },

  // === PLAYER DEVELOPMENT ===
  { id: "exceeded_expectations", name: "Exceeded Expectations", desc: "A player's overall rating rises above their starting potential", icon: "📈" },
  { id: "late_bloomer", name: "Late Bloomer", desc: "A player aged 31 or older gains an overall rating increase", icon: "🌸" },
  { id: "the_sick_note", name: "The Sick Note", desc: "The same player suffers 3 different types of injury across their career", icon: "🩺" },

  // === SEASON ===
  { id: "away_day_merchants", name: "Away Day Merchants", desc: "Win every away match in a season", icon: "🚌" },

  // === TACTICS ===
  { id: "false_nine", name: "False Nine", desc: "Win a match with no strikers in your Starting XI", icon: "9️⃣" },
  { id: "get_it_in_the_mixer", name: "Get It In The Mixer", desc: "Start a match with 4 or more forwards in your Starting XI", icon: "🥣" },
  { id: "jumpers_for_goalposts", name: "Fruit Cigs", desc: "Win a match with no players assigned to a training focus", icon: "🚬" },
  { id: "good_engine", name: "Good Engine", desc: "Have a central midfielder with both Physical and Mental at 15 or above", icon: "🔋" },

  // === HOLIDAY MODE — power-user feature ===
  { id: "hands_off", name: "Hands Off", desc: "Go on holiday for the first time", icon: "🏖️" },
  { id: "cruise_control", name: "Cruise Control", desc: "Play 10+ consecutive matches on holiday", icon: "🚢" },
  { id: "postcard_edge", name: "Postcard From The Edge", desc: "Win the cup while on holiday", icon: "✉️" },

  // === CLUB RELATIONSHIPS — depth ===
  { id: "diplomat", name: "Diplomat", desc: "Have 3+ clubs at 50% relationship or higher", icon: "🤝" },
  { id: "burned_bridges", name: "Burned Bridges", desc: "Have a club relationship drop to 0%", icon: "🌉" },
  { id: "old_boys_network", name: "Old Boys Network", desc: "Complete a trade with every club at 75%+ relationship", icon: "🎩" },

  // === TRANSFER WINDOWS ===
  { id: "deadline_day", name: "Deadline Day", desc: "Complete a trade in the final week of a transfer window", icon: "⏰" },
  { id: "window_shopping", name: "Window Shopping", desc: "Have a transfer window close without making a deal", icon: "🛍️" },

  // === SHORTLIST ===
  { id: "talent_spotter", name: "Talent Spotter", desc: "Add 5 players to your shortlist", icon: "👁️" },
  { id: "the_black_book", name: "The Black Book", desc: "Have 15+ players on your shortlist at once", icon: "📓" },

  // === SQUAD CONTINUITY ===
  { id: "new_era", name: "New Era", desc: "Start a season with 5+ players not in last season's squad", icon: "🆕" },
  { id: "band_of_brothers", name: "Band of Brothers", desc: "Have 8+ players who've been in your squad for 3+ seasons", icon: "🫂" },

  // === MATCH SPEED ===
  { id: "patient_manager", name: "Patient Manager", desc: "Watch an entire match at normal speed", icon: "🧘" },
  { id: "speed_demon", name: "Speed Demon", desc: "Play 10 matches at fastest speed in a season", icon: "⚡" },

  // === TICKET NARRATIVES ===
  { id: "double_or_nothing", name: "Double or Nothing", desc: "Get 6+ stat gains from a Double Sessions week", icon: "🎰" },
  { id: "twelfth_man_roar", name: "12th Man Roar", desc: "Win by 3+ goals with 12th Man active", icon: "📣" },
  { id: "prodigy_intake", name: "Prodigy Intake", desc: "A Youth Coup player becomes the highest OVR in your squad", icon: "🌠" },

  // === GK-SPECIFIC ===
  { id: "number_one", name: "Number One", desc: "Have the same GK start 15+ matches in a season", icon: "1️⃣" },
  { id: "cat_like_reflexes", name: "Cat-Like Reflexes", desc: "Your GK keeps 8+ clean sheets in a season", icon: "🐱" },

  // === SEASON-OVER-SEASON ===
  { id: "steady_climb", name: "Steady Climb", desc: "Finish higher than the previous season 3 times in a row", icon: "📈" },
  { id: "the_rebuild", name: "The Rebuild", desc: "Win promotion the season after being relegated", icon: "🏗️" },

  // === REMAINING GAPS ===
  { id: "swiss_army_knife", name: "Swiss Army Knife", desc: "Have a player learn 3+ positions", icon: "🔪" },
  { id: "identity_crisis", name: "Identity Crisis", desc: "Play a player in neither their natural nor any learned position", icon: "❓" },
  { id: "full_circle", name: "Full Circle", desc: "A released youth returns as a prodigal and wins the league with you", icon: "🔄" },
  { id: "save_scummer", name: "Save Scummer", desc: "Load a save for the first time", icon: "💾" },
  { id: "season_10", name: "Season 10", desc: "Complete 10 seasons", icon: "🔟" },

  // === LEAGUE MODIFIER ACHIEVEMENTS ===
  { id: "forest_hills_conqueror", name: "King of the Hills", desc: "Win 5 away matches in a single Forest Hills season", icon: "🌲" },
  { id: "one_and_done", name: "One & Done & Done", desc: "Beat both single-fixture opponents in a Euro Dynasty season", icon: "☝️" },
  { id: "just_right", name: "Just Right", desc: "Play every Euro Dynasty opponent exactly twice in a season", icon: "⚖️" },

  // === INTERGALACTIC ELITE / ALIEN ACHIEVEMENTS ===
  { id: "englishman_in_new_york", name: "Englishman In New York", desc: "Sign an Alien player", icon: "👽" },
  { id: "area_51", name: "Area 51", desc: "Sign 5 Alien players", icon: "🛸" },
  { id: "we_come_in_peace", name: "We Come In Peace", desc: "Beat an Alien team", icon: "🕊️" },
  { id: "take_me_to_your_leader", name: "Take Me To Your Leader", desc: "Beat the league leaders in the Intergalactic Elite by 3+ goals", icon: "🌌" },
  { id: "destroy_all_humans", name: "Destroy All Humans", desc: "Have an entire starting XI of Alien players", icon: "☄️" },
  { id: "time_dilation", name: "Time Dilation", desc: "Have a player retire at the end of a season in the Intergalactic Elite", icon: "⏳" },
  { id: "xenomorph", name: "Xenomorph", desc: "Train an Alien player to learn a new position", icon: "🧬" },
  { id: "scooty_puff_jr", name: "Scooty Puff Jr.", desc: "Get relegated from the Intergalactic Elite", icon: "🚀" },
  { id: "scooty_puff_sr", name: "Scooty Puff Sr.", desc: "Win the Intergalactic Elite during your 2nd season in it", icon: "🛡️" },
  { id: "first_contact", name: "First Contact", desc: "Build a relationship with an Alien team to 100%", icon: "🤝" },
  { id: "phone_home", name: "Phone Home", desc: "Win all home games in a season in the Intergalactic Elite", icon: "🏠" },
];


export const LEGENDARY_ACHIEVEMENTS = new Set([
  "mentality_monsters", "invincibles", "centurions", "from_the_bottom", "the_double",
  "maxed_out", "dynasty", "catenaccio",
  "nominative_determinism", "always_bridesmaid", "baby_faced",
  "completionist", "speedrun",
  "tots_premier_5", "aguero", "tinpot_treble", "total_voetbal",
  "sunday_to_stars",
  "full_circle", "old_boys_network", "season_10", "band_of_brothers",
  "destroy_all_humans", "take_me_to_your_leader", "scooty_puff_sr",
]);

export const PRESTIGIOUS_ACHIEVEMENTS = new Set([
  "through_the_roof", "hand_of_god", "safe_hands", "golden_gen", "peak_perf",
  "squeaky", "perfect_motm", "comeback", "respect_badge", "no_cards",
  "kolo_kolo", "golden_boot", "professional_job",
  "fox_box", "odds_are_even", "great_escape", "perfect_five",
  "well_seasoned", "old_guard", "deja_vu", "enzo_drive",
  "soundtrack", "gone_up_one_track", "fresh_blood", "prodigal_son",
  "efficient_machine", "all_timers", "brexit", "brace_yourself",
  "on_your_head_son", "one_club_man", "fan_favourite",
  "tots_premier_3", "worth_the_wait", "century_club",
  "win_european", "win_world_xi", "win_ultimate", "win_global", "cup_collector",
  "ticket_tout", "best_of_friends", "not_a_dry_eye", "instant_impact",
  "absentee_landlord", "comeback_season",
  "cruise_control", "postcard_edge", "diplomat", "steady_climb",
  "the_rebuild", "cat_like_reflexes", "prodigy_intake", "swiss_army_knife",
  "just_right",
  "phone_home", "win_intergalactic",
]);

export const PLAYER_UNLOCK_ACHIEVEMENTS = new Set(["mixed_up", "who_shot_rr", "joga_bonito", "bayda", "kolo_kolo", "forest_hills_conqueror", "scooty_puff_jr"]);

export const UNLOCKABLE_PLAYERS = [
  {
    id: "leroy_litre",
    name: "Leroy Litre",
    position: "ST",
    age: 41,
    nationality: "ENG",
    attrs: { pace: 16, shooting: 16, passing: 12, defending: 8, physical: 16, technique: 14, mental: 12 },
    achievementId: "mixed_up",
    flavour: "Leroy's got his litres mixed up.",
  },
  {
    id: "unlock_2",
    name: "Mel Racey",
    position: "ST",
    age: 71,
    nationality: "ENG",
    attrs: { pace: 14, shooting: 18, passing: 15, defending: 7, physical: 15, technique: 17, mental: 19 },
    achievementId: "who_shot_rr",
    flavour: "71 years old and still banging them in. A real Roy of the Rovers story.",
  },
  {
    id: "unlock_3",
    name: "Solrac Otrebor",
    position: "LB",
    age: 52,
    nationality: "BRA",
    attrs: { pace: 16, shooting: 19, passing: 14, defending: 14, physical: 16, technique: 18, mental: 14 },
    achievementId: "joga_bonito",
    flavour: "52 years old, Brazilian, and playing left back. The beautiful game indeed.",
  },
  {
    id: "unlock_4",
    name: "Tbaraat Leda",
    position: "AM",
    age: 36,
    nationality: "MAR",
    attrs: { pace: 16, shooting: 13, passing: 15, defending: 6, physical: 17, technique: 20, mental: 10 },
    achievementId: "bayda",
    flavour: "Pure artistry. Doesn't need goals to dominate a game.",
  },
  {
    id: "unlock_5",
    name: "Ivan Ladic",
    position: "CM",
    age: 18,
    nationality: "HRV",
    attrs: { pace: 12, shooting: 18, passing: 14, defending: 12, physical: 14, technique: 8, mental: 6 },
    achievementId: null,
    unlockType: "teamName",
    unlockValue: ["Cherry", "Cherries", "Kirsche", "Cerise", "Trešnja"],
    secret: true,
    flavour: "A teenage Croatian with a thunderbolt of a shot. Cherry-picked for greatness.",
  },
  {
    id: "unlock_6",
    name: "Gnegneri Toure",
    position: "CM",
    age: 42,
    nationality: "CIV",
    attrs: { pace: 15, shooting: 17, passing: 17, defending: 15, physical: 20, technique: 11, mental: 15 },
    achievementId: "kolo_kolo",
    flavour: "Kolo Kolo Kolo Kolo Kolo Toure. 42 and still the engine room.",
  },
  {
    id: "unlock_7",
    name: "Helder Coelho",
    position: "ST",
    age: 23,
    nationality: "ARG",
    attrs: { pace: 15, shooting: 17, passing: 13, defending: 8, physical: 10, technique: 15, mental: 14 },
    learnedPositions: ["AM"],
    achievementId: null,
    unlockType: "teamName",
    unlockValue: ["Cigar", "Beer", "Yerba", "Mate"],
    secret: true,
    flavour: "A silky Argentine forward. Likes a cigar and a mate after training.",
  },
  {
    id: "koji_yamamoto",
    name: "Koji Yamamoto",
    position: "CM",
    age: 29,
    nationality: "JPN",
    attrs: { pace: 14, shooting: 12, passing: 17, defending: 15, physical: 16, technique: 14, mental: 18 },
    achievementId: "forest_hills_conqueror",
    flavour: "A tireless midfield general who emerged from the hills. Reads the game three moves ahead.",
  },
  {
    id: "trask_ulgo",
    name: "Trask Ulgo",
    position: "CB",
    age: 33,
    nationality: "ALN",
    attrs: { pace: 21, shooting: 22, passing: 23, defending: 26, physical: 26, technique: 24, mental: 26 },
    capBonus: 16,
    achievementId: "scooty_puff_jr",
    flavour: "An anomaly in every system he enters. Trask doesn't play by the rules — the rules play by him.",
  },
];
