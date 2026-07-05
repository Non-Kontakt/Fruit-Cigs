# Fruit Cigs — Strategy Guide

> Last verified against the code: 2026-07-05

---

## The Basics: How the Game Actually Works

Each season is a repeating loop of training weeks and match days, with cup fixtures threaded in between. The calendar is fixed at the start of each season — you can see what's coming but can't reorder it. Every training week you pick a focus (one attribute, or General Training for all seven), and every player in your squad advances toward their next stat point. Then match days happen. At the end of the season, the table is resolved and you go up, down, or stay — top 3 promoted, bottom 3 relegated, standard tiers. Repeat until you win the top flight and either prestige or retire.

That's the surface. Here's what's actually going on underneath — verified line-by-line against the current code, not the pre-rework build this guide used to describe.

---

## Match Engine: What Determines Results

### Team strength isn't a simple average

Every match produces an Expected Goals (xG) value for each team, and goals are drawn from a Poisson distribution with that xG as the mean, capped at 12. But before any of the modifiers below apply, your team's underlying "strength" number is **not** a flat average of your starting XI's OVR. It's weighted:

```
strength = (top 3 players' average OVR) × 0.4 + (remaining 8 players' average OVR) × 0.6
```

One genuine star moves the needle more than spreading the same OVR evenly across the XI — a lone 18-OVR player in a squad of 12s pulls your strength up further than a uniform squad averaging the same total would. Injured starters count at **60%** of their OVR in this calculation (you still start them, they just contribute less).

### The xG formula

```
xG = max(0.3, 1.2 + (yourStrength − theirStrength) × 0.16 + homeAdvantage)
```

Home advantage is a flat **+0.2 xG** (0 on neutral ground). The Twelfth Man ticket adds **+0.15** on top for its one home game — 0.35 total, nearly double the baseline. A 3-point strength advantage is worth roughly +0.48 xG, in the same ballpark as before, but "strength" now means the top-3-weighted number above, not raw XI average.

Every multiplicative modifier below is floored at 0.2 xG — the game will never let your expected goals hit zero, however badly the modifiers stack against you.

### Two halves, not one match

The engine splits each match into two phases. First half: half your base xG, straight Poisson roll. Second half starts from the same base, then gets adjusted by whatever's happened so far:

- **Any team trailing at half-time** gets +10% xG for the second half — the engine always gives the losing side a puncher's chance.
- **Gritty** teams get a further +25% on top of that when trailing (so +37.5% combined) — this is the real mechanic behind their reputation for late goals, not a flat "40% chance" as the old numbers claimed.
- **Physical** teams get +15% own xG and −10% opponent xG in the second half regardless of scoreline — they wear you down as the game goes on.
- **Methodical** teams leading at half-time have a 20% chance to suppress the opponent's second-half xG by 15% (game management).
- **Stars** teams get +15% own xG in the second half if they scored in the first.
- **Flair** teams have a 15% chance per half of an open, chaotic second half (+0.5 xG to them, +0.3 to you — end-to-end stuff).
- **Defensive** teams get a 30% chance of a scrappy set-piece bonus goal if the match is still 0-0.
- Playing **without a recognised goalkeeper** carries a 50% chance of an extra bonus goal conceded, on top of the OOP penalty below.

Practical read: front-runners with a Methodical or Physical trait are the ones to be most careful with a lead against; if you're chasing a game, Gritty and Stars opponents are the ones who'll punish a slow start hardest.

### AI Traits — the corrected numbers

Each trait applies a multiplier to the team's own xG and a separate multiplier to the opponent's xG, before the second-half adjustments above. Read this as "when the AI has this trait, this is what happens to their scoring and yours":

| Trait | AI's own xG | Your xG | Notes |
|---|---|---|---|
| **Dominant** | ×1.1 | ×0.93 | Hardest single-number matchup — they create more, you create less |
| **Stars** | ×0.95 | ×0.9 | Counter-attack style, boosted further if they score first (see above) |
| **Free Scoring** | random ×0.7–1.3 (never below 1.0 xG) | random ×0.85–1.15 | Genuinely the most volatile — they're never truly shut out |
| **Defensive** | ×0.75 | ×0.7 | Grind matches, plus the 0-0 bonus-goal chance above |
| **Physical** | ×0.9 | ×0.9 | Even at kickoff; gets more lopsided in the second half if trailing/leading |
| **Methodical** | ×0.85 | ×0.82 | Low-scoring by default, plus the leading-suppression chance |
| **Flair** | ×1.05 | ×0.98 | Mild base disadvantage, real risk is the chaos-game roll |
| **Set Piece** | +0.15 flat | ×0.95 | Not in the old notes at all — a flat xG bump from dead balls, not a multiplier |
| **Gritty** | — | — | No base modifier; all their danger is the second-half trailing mechanics above |

**Dominant is still the toughest single matchup on paper**, but the gap to your xG is smaller than previously stated (0.93×, not 0.9×) — home advantage plus a Twelfth Man is still your best equaliser.

### Out-of-position: the penalty is a team average, not a per-slot tax

This is the biggest correction in this whole guide. The out-of-position multiplier for your team is the **average** of every starting XI slot's individual multiplier — not each OOP player's multiplier applied to the whole team's xG independently.

```
teamOOPMult = (sum of each of the 11 slots' OOP multiplier) / 11
```

If ten of your XI are in their natural position (multiplier 1.0) and one is playing an adjacent-group position out of place (multiplier 0.80), your team OOP multiplier is `(10×1.0 + 0.80)/11 ≈ 0.982` — an 1.8% dent, not a 20% one. **One out-of-position player barely costs you anything.** The penalty only becomes serious when multiple slots are misaligned at once — three or four OOP players compounds fast, since each one drags the average down individually.

The per-slot multipliers and training times to remove them (learn the position, and it's back to 1.0):

| Mismatch type | Multiplier | Weeks to learn |
|---|---|---|
| GK → Outfield | 0.55 | 22 weeks |
| Outfield → GK | 0.60 | 24 weeks |
| Distant group (e.g. defender → winger) | 0.65 | 16 weeks |
| Adjacent group (e.g. CM → ST) | 0.80 | 10 weeks |
| Same group (e.g. LB → RB, CM → AM) | 0.92 | 5 weeks |
| Learned secondary position | 1.00 | — |

Whatever your team-average OOP multiplier ends up being, the opponent also gets a smaller boost: `oppXG *= 1 + (1 − teamOOPMult) × 0.4`. So playing out of position doesn't just cost you, it hands the other side a little extra too — proportionally small when it's one player, real when it's several.

### Injured starters, Talisman, and stacking order

Playing an injured starter costs your team **−8% xG per injured starter, stacking multiplicatively** (three injured starters = ×0.76, not ×0.76 from a flat sum). Same as the OOP penalty, the opponent gets a partial boost too: `oppXG *= 1 + (injuredCount × 0.08) × 0.5`.

The **Talisman** — automatically whoever has the highest OVR among your non-legend players, reassigned permanently to your Captain Fantastic arc target once that arc completes — swings your xG **±5%** depending on whether they're in the starting XI, independent of whether they're injured. Starting an injured Talisman still gets you the +5% for playing them; benching them (injured or not) costs you the −5%. These modifiers apply in sequence — injury penalty first, then Talisman, then OOP, then league-specific modifiers — each one multiplying the running total, not adding to it.

Fan sentiment also nudges home xG: a buzzing home crowd is worth +3% xG, a hostile one −3%, scaled by whatever `fanSentimentMult` the current tier applies (see the tier-by-tier table below — some tiers amplify this 2.5×).

---

## Training: The Real Game

### Lower stats train faster — the real numbers

Training progress accumulates each week and triggers a level-up at 1.0 banked progress (multiple level-ups in one week are possible if you bank enough). The `levelFactor` — the base weekly progress rate, before every other multiplier — depends on where the stat sits, normalized to a 1–20 scale regardless of prestige cap:

| Normalized stat | levelFactor |
|---|---|
| 1–5 | 0.20 |
| 6–8 | 0.14 |
| 9–10 | 0.10 |
| 11–12 | 0.08 |
| 13–14 | 0.055 |
| 15–16 | 0.04 |
| 17 | 0.03 |
| 18 | 0.02 |
| 19–20 | 0.01 |

That's a **20× gap** between the fastest and slowest bands (0.20 vs 0.01), not the 23× the old numbers claimed. The practical takeaway is unchanged: **train your weakest relevant stats first.** A player at stat 6 gains value roughly 2× faster than one at stat 9, and roughly 5× faster than one at stat 13.

### Age is its own training multiplier — not just a decay trigger

This didn't exist in the old notes at all: your training rate is directly scaled by age, independent of decay.

| Age | Training speed multiplier |
|---|---|
| Under 23 | ×1.3 |
| 23–27 | ×1.0 |
| 28–31 | ×0.7 |
| 32–34 | ×0.5 |
| 35+ | ×0.2 |

A 22-year-old trains 85% faster than a 30-year-old on identical stats and identical training focus, before potential even enters the picture. This is the real argument for signing and developing young — it isn't just "more seasons to grow," it's a materially faster growth rate every single week they're under 23.

### Potential — the corrected formula, and it's not a hard wall

The actual potential bonus formula (a full rewrite from what this guide used to claim):

```
potentialGap = max(0, potential − currentOVR)
gapBonus     = (potentialGap / ovrCap) × 3.0 × max(0.3, appearanceRate)
talentFloor  = (potential / ovrCap) × 0.3
potentialBonus = 1 + gapBonus + talentFloor
```

Two components, not one: a **gap bonus** (far from your ceiling trains much faster, up to 3.0× scaling rather than 1.5×) and a **talent floor** (even near their ceiling, a higher-potential player still trains a bit faster than a lower-potential one at the same gap, because the floor term only cares about raw potential, not distance to it).

Worked example — potential 20, OVR 10, cap 20, full-time starter (appearanceRate 1.0):
`gapBonus = (10/20)×3.0×1.0 = 1.5`, `talentFloor = (20/20)×0.3 = 0.3` → potentialBonus = **2.8×**.

Same OVR gap, potential 12 instead of 20: `gapBonus = (2/20)×3.0×1.0 = 0.3`, `talentFloor = (12/20)×0.3 = 0.18` → potentialBonus = **1.48×**. That's a real ~1.9× speed gap between high and low potential at the same starting point, not the 2.5× vs 1.15× the old numbers claimed — still a huge deal, just a different number.

`appearanceRate` has a floor of 0.3 (benched players still keep 30% of the gap bonus) and is `starts + subApps×0.4`, divided by matches played this season — so cameo appearances count for something, just less than starts.

**Potential is not a hard ceiling.** Once a player's OVR reaches their potential, training doesn't stop — it continues at **15% of normal speed** (`beyondPotentialMult`), glacial but real. There's also a flat ±30% random variance applied every single week on top of everything else, so don't read too much into any one week's gain.

### Match form feeds back into training speed

Your last three match ratings (tracked per player) set a training-speed multiplier that applies alongside everything above:

| Recent form (avg of last 3 ratings) | Training speed multiplier |
|---|---|
| No matches played yet | ×0.8 |
| Below 5.5 | ×0.6 |
| 5.5–6.4 | ×0.8 |
| 6.5–7.4 | ×1.0 |
| 7.5+ | ×1.5 |

In-form starters train up to 1.5× faster than the baseline; anyone struggling or completely benched trains at 0.6–0.8×. This didn't exist in the old build and it changes the calculus on rotation — a player who's been poor for three straight games is also training slower, which compounds with the appearance-rate hit on the potential bonus above.

### General Training vs a single focus

Focusing one attribute trains it at full rate (`focusMultiplier = 1.0`). General Training spreads the week across all seven attributes, but each one only gets **22%** of the single-focus rate. Do the arithmetic: 7 × 0.22 = 1.54 "stat-equivalents" per week from General Training versus 1.0 from a single focus — General Training actually produces *more* total stat value per week, just diluted across everything instead of concentrated. Use single focuses when you need one specific stat now (closing an OOP gap, hitting a threshold for an arc or achievement); use General Training as the default background setting for anyone without an urgent need.

### Duo Boosts

Every training week, any pair of two-or-more non-injured players sharing the same single-attribute focus (General Training doesn't qualify) has a **15% chance** of triggering a duo boost for a random pair among them. A duo boost is a guaranteed flat **+1** to their focused attribute (**+2** in Sunday League specifically, that tier's own modifier), on top of — not instead of — whatever progress they'd already banked toward their next real level-up. It's a pure bonus; it won't wipe progress you were saving.

### Match XP: passive growth that isn't training at all

Every player who actually appears in a match (starter or a sub who got minutes) gets a separate passive attribute bump based on what they did, layered on top of anything they were training that week:

| Performance | Attribute gained | Amount (base 0.08 progress) |
|---|---|---|
| Scored (capped at 3) | Shooting | 0.08 × goals |
| Assisted (capped at 3) | Passing | 0.08 × assists |
| Clean sheet, GK/DEF, 60+ minutes | Defending | 0.08 × 1.5 |
| Match rating 7.5+ | Technique | 0.08 × ((rating − 7.0) / 1.5) |
| Any appearance | Mental | 0.08 × 0.5 × (rating / 7.0) |

**Pace and Physical are training-only** — match XP never touches them. This is a genuinely new growth channel: even a player you never train a single week will still creep up in Shooting, Passing, Defending, Technique, and Mental purely from playing well, on top of whatever your actual training focus is doing.

### Stat decay

At training age 33+, each non-focused stat has a small weekly chance of losing 1 point:

| Age | Decay chance per stat per week |
|---|---|
| 33–34 | 3% |
| 35–37 | 7% |
| 38+ | 12% |

The trained stat itself cannot decay — rotating your training focus across all seven attributes in an aging player's later seasons means no single stat is ever left exposed. **Prodigy** and **Veteran** tags halve the decay chance.

### Training injuries and arc bonuses

Any player with an active single-attribute focus (not General Training) carries a **4% weekly injury chance**, halved to 2% if you have an active Injury Shield bonus (from The Machine's "Recovery Protocol" focus step). League modifiers can multiply this further — see the tier table below.

Story arc training bonuses stack additively, then multiply onto the rest:

```
progressGain = rawProgress × focusMultiplier × arcMult × doubleMult × dojoMult × formMult
```

- **Captain Fantastic** completion: `mentalTrainMult: 0.15` — mental training +15% for the whole squad, permanently.
- **Immortals** completion: `trainSpeedMult: 0.20` — all training +20% for everyone, permanently.
- Both completed: mental trains at 1.35×, everything else at 1.20×.
- **Double Sessions** ticket doubles the whole week's gains on top of all of this.

---

## Scouting & Hidden Potential

AI and shortlisted players' potential is **hidden by default** — you see their current stats, not their ceiling. Adding a player to your shortlist starts a passive scouting clock: after **4 weeks** on the shortlist, their potential is automatically revealed via an inbox message, whether or not you're still actively watching them. Removing them from the shortlist before the timer completes just cancels the reveal.

The **Scout Dossier** ticket reveals a shortlisted player's potential instantly, skipping the wait. Old saves or edge cases that never carried a real potential value fall back to a deterministic estimate seeded from the player's name and age — you'll never see two different numbers for the same player across sessions.

---

## Youth Intake

Every youth player generated arrives as one of four archetypes, each with a distinct stat/potential profile:

| Archetype | Chance | Profile | Potential range (relative to ovrCap) |
|---|---|---|---|
| Balanced | 45% | Steady, even spread across all seven attrs | ~55–82% |
| Specialist | 20% | Strong in their position's 2–3 key attributes, weaker elsewhere | ~60–82% |
| Raw | 15% | Low across the board right now | ~72–100% (highest ceiling) |
| Wildcard | 20% | One elite stat, everything else poor | ~55–78% |

**Raw** prospects have the highest theoretical ceiling but the furthest to travel — combined with the age training multiplier above, a Raw 17-year-old is the single best long-term development bet in a fresh intake, if you're patient. The **Youth Coup** ticket guarantees the intake's first candidate becomes a Prodigy-tier standout with elevated stats and potential, flagged separately for the Prodigy Intake achievement.

---

## Aging & Retirement

Retirement becomes possible at 30 and climbs steeply from there — this applies to your squad and every AI squad on the same curve:

| Age | Retirement chance |
|---|---|
| 30 | 12% |
| 32 | 30% |
| 34 | 50% |
| 36 | 66% |
| 38 | 80% |
| 40 | 90% |
| 43+ | 100% (guaranteed) |

The **Veteran** tag halves this chance below 42, extends the guaranteed-retirement age to 43, and — combined with Prodigy — halves stat decay too. Unlockable players follow a different rule entirely: if signed under age 20 they retire on the normal age curve; if signed at 20+ they simply retire after 10 seasons at the club regardless of age, reflecting their compressed "effective age" training arc (see Unlockable Players below).

---

## The Talisman

Every team has one Talisman at all times: by default, whoever has the highest OVR among your non-legend players, recalculated automatically every time your squad changes. You'll never see a UI label for it.

**Effect**: ±5% xG swing — playing gives +5%, benched or absent gives −5%, regardless of injury status.

**The Captain Fantastic arc permanently reassigns the Talisman** to your arc target once completed. Choose a player you plan to keep for the long haul — the arc's own reward (+15% mental training for the whole squad) makes a mentally-strong CM or AM who you're actively developing toward the cap the ideal pick.

---

## Story Arcs: What They Actually Require

You run one arc per category (Player / Club / Legacy) at a time.

### Player arcs

**Captain Fantastic** — target needs Mental 15+. Steps: pick your captain → a focus choice (squad +2 mental, or captain +2 technique/+2 passing) → win 5 matches with them starting → they earn 3 Man of the Match awards. Reward: **Captain** tag, permanent +15% mental training squad-wide, and the Talisman reassignment described above.

**Youth Revolution** — target aged 19 or under. Steps: pick your prospect → start them 5 times → a focus choice (+2 to three random stats, or +3 to one stat and +2 to another) → they reach OVR 13. Reward: every future youth intake arrives with +2 to all base stats, permanently.

**The Project** — target OVR 8 or lower. Two focus choices along the way (+2 highest stat / +1 to three lowest stats, then +3 to trained stat / +1 to all stats) gated behind the target reaching OVR 12, then OVR 15. Reward: **Prodigy** tag (halved decay) plus +2 to their weakest stat.

**Old Faithful** — target age 28+. Gated behind them reaching age 32 and 30 appearances. Reward: **Veteran** tag (retirement extended to 42, halved decay).

### Club arcs

**The Machine** — win 3, then 5, then 8 in a row. A focus choice midway (squad +2 physical, or a 15-week Injury Shield halving training-injury chance). Reward: squad +2 physical, +2 pace. The conditions happen naturally during a good run — if you're already on a streak, you're most of the way there.

**Fortress** — 3 consecutive home wins → 3 home clean sheets → finish the season unbeaten at home. Reward: all defenders +2 physical, +2 mental.

**Giant Killer** — beat a team ranked above you → beat the league leaders → beat a team from the tier above in cup. Reward: all midfielders +2 mental, +2 technique.

**Scout Network** — accept a trial → win with them starting → a focus choice (next trial +2 stats, or next trial +3 stats and revealed potential — the latter is strictly better) → recruit an impressed trial. Reward: every future trial arrives with +2 base stats, permanently.

### Legacy arcs

**Immortals** — any player reaches OVR 16 → 3 players at OVR 14+ → a focus choice (top-3 OVR players +2 random stat each, or all squad +1 to all stats) → 5 players at OVR 17+. Reward: permanent +20% training speed for everyone. Stacks with Captain Fantastic for +35% mental, +20% everything else.

**Dynasty** — reach Sunday League (tier 9) → reach Altitude Trials (tier 6) → **win The Federation (tier 5)**. This is a real correction from the old notes, which claimed the final step was winning tier 1 — it isn't. Reward: squad +2 mental.

**The Double** — top 3 at the league halfway point → reach a cup semi-final → a focus choice (squad +2 physical/+1 pace, or +2 technique/+1 mental — the latter is the better pick) → win the league and the cup in the same season. Reward: squad +1 to all stats.

**Redemption** — release a player → accept their prodigal return offer (arrives as an inbox message some weeks later) → a focus choice (+2 mental/+2 technique, or +2 physical/+2 defending) → they get 10 starts, 3 goals, and beat their former club. Reward: the prodigal gets +4 pace, +3 physical — +7 stats total plus the focus step. The conditions (3 goals, facing their old club, 10 starts) are loose enough to plan around across seasons but not trivially farmable.

### Holiday mode and focus-step selection

Holiday auto-selects **Option A** at every focus step. Where it matters:

| Arc | Option A | Option B | Better choice |
|---|---|---|---|
| Scout Network | Next trial +2 stats | Next trial +3 stats, revealed potential | **B** |
| Immortals | Top 3 OVR players +2 random stat | All squad +1 to all stats | **B** — broader value |
| Youth Revolution | +2 to 3 random stats | +3 to one stat, +2 to another | Depends on archetype |
| The Double | +2 physical, +1 pace | +2 technique, +1 mental | **B** |

Come off holiday for these focus steps specifically. Everything else is safe to auto-select.

---

## Unlockable Players

There are **9** unlockable players, not 7 — two were added since the last pass through this guide (Koji Yamamoto and Trask Ulgo, both below). All of them scale identically with the prestige cap at signing:

```
scaledStat = round(baseStat × (ovrCap / 20))
potential  = ovrCap (+ capBonus, for the one player who has one)
```

**Optimal strategy is unchanged: wait for the highest prestige you can before triggering an achievement-based unlock.** Achievement unlocks bake in whatever `ovrCap` was active the moment the achievement fires; team-name unlocks trigger at game start in whatever prestige run you're in, so name your club for the run you want to play them in.

Most unlockables use an **effective age** for training/decay if signed at 20 or older: their real career is compressed onto a 21→36 age curve spread over 10 seasons at the club, so a 41-year-old like Leroy Litre still trains and declines like a player in their mid-20s to mid-30s, not like an actual veteran. Unlockables signed under 20 (Ivan Ladic) just age normally.

| Player | Pos | Unlock | Base (P0) stats | At P5 (×5) |
|---|---|---|---|---|
| **Leroy Litre** — ST, 41, English | ST | "Mixed Up": a forward/winger on Defensive Work training scores in a win | PAC16 SHO16 PAS12 DEF8 PHY16 TEC14 MEN12 | PAC80 SHO80 PAS60 DEF40 PHY80 TEC70 MEN60 |
| **Mel Racey** — ST, 71, English | ST | "Who Shot RR?": a player scores a brace in their first match after recovering from injury | PAC14 SHO18 PAS15 DEF7 PHY15 TEC17 MEN19 | PAC70 SHO90 PAS75 DEF35 PHY75 TEC85 MEN95 |
| **Solrac Otrebor** — LB, 52, Brazilian | LB | "Joga Bonito": a Brazilian player scores in a Cup match | PAC16 SHO19 PAS14 DEF14 PHY16 TEC18 MEN14 | PAC80 SHO95 PAS70 DEF70 PHY80 TEC90 MEN70 |
| **Tbaraat Leda** — AM, 36, Moroccan | AM | "Bayda": a CM/AM rates 8.5+ in a match without scoring | PAC16 SHO13 PAS15 DEF6 PHY17 TEC20 MEN10 | PAC80 SHO65 PAS75 DEF30 PHY85 TEC100 MEN50 |
| **Gnegneri Toure** — CM, 42, Ivorian | CM | "Kolo Kolo": win the league with an impressed trial defender (CB/LB/RB) still in your squad | PAC15 SHO17 PAS17 DEF15 PHY20 TEC11 MEN15 | PAC75 SHO85 PAS85 DEF75 PHY100 TEC55 MEN75 |
| **Ivan Ladic** — CM, 18, Croatian | CM | Secret: club name Cherry/Cherries/Kirsche/Cerise/Trešnja | PAC12 SHO18 PAS14 DEF12 PHY14 TEC8 MEN6 | SHO90 at P5 |
| **Helder Coelho** — ST/AM, 23, Argentine | ST | Secret: club name Cigar/Beer/Yerba/Mate | PAC15 SHO17 PAS13 DEF8 PHY10 TEC15 MEN14 | Arrives with AM already learned — no OOP cost on either position |
| **Koji Yamamoto** — CM, 29, Japanese | CM | "King of the Hills": win 5 away matches in a single Forest Hills (tier 7) season | PAC14 SHO12 PAS17 DEF15 PHY16 TEC14 MEN18 | ×5 across the board |
| **Trask Ulgo** — CB, 33, Alien | CB | "Scooty Puff Jr.": get relegated *from* the Intergalactic Elite (tier 1) | PAC21 SHO22 PAS23 DEF26 PHY26 TEC24 MEN26 (already above the P0 cap) | Personal cap is `ovrCap + 16` at every prestige — the only unlockable whose ceiling outpaces everyone else's |

Trask Ulgo deserves a special note: his unlock condition is getting relegated out of the hardest tier in the game. It's a built-in consolation prize for the tier-1 wall covered below — the designers know it's brutal and gave failure its own reward.

---

## Trials: The Best Talent Pipeline

Trial players arrive automatically with roughly **70% probability each week**. All trial players are:

- **Age 16, always**
- **Foreign nationality, always** (never British)
- **Potential 70–100% of the current ovrCap**

**The evaluation window is only 3 training weeks, not a full season.** At the end of those 3 weeks, if the trialist started **at least one** match (not the 3 starts this guide used to claim), they "impress" and join your permanent trial history — keep them or let them go, your call. If they got **zero** starts in those 3 weeks, they're released to a random rival club and you get the (slightly bitter) "Reality Check" achievement. Getting a trialist even a single start in their brief window is the whole game — don't sit them on the bench hoping to evaluate them passively.

Every accepted trial can also trigger achievements just by being in your squad (Joga Bonito if Brazilian — though trials are never British, other nationalities including Brazilian are in the pool; Deep End if they score). For **Kolo Kolo** (the Gnegneri Toure unlock) you specifically need an impressed trial defender (CB/LB/RB) still on your books when you win the title — track your trial history and don't release your impressed defenders.

---

## Transfer Insider Tickets (Free Agents)

Free agents only ever arrive via the **Transfer Insider** ticket — there's no passive free agent pool. One ticket generates:

- Position: random
- Age: 22–28
- OVR: your squad average, minus up to 2 or plus up to 1 (not a symmetric ±2)
- Potential: OVR + 2 to 6

They're calibrated to your current squad's average OVR, so using the ticket with a strong squad gets you a strong agent — the same ticket used with a weak squad gets you a weak one. Save it for when your average is high, or for filling a specific positional hole trials and youth intake aren't covering. The Moneyball achievement requires 3 Transfer Insider signings.

---

## Transfer Windows

The window is open for **6 weeks** by default at the start of each season. **The Federation (tier 5)** extends this to **9 weeks** — its own league modifier. Outside the window, you can't make signings; plan your Transfer Insider and Saudi Agent ticket usage (Saudi Super League grants 3 free instant-sign tickets per season) around when the window is actually open.

---

## Prestige: The New Game+ Loop

You prestige by winning the top flight (Tier 1) while below Prestige Level 5.

- OVR cap: `20 + prestigeLevel × 16` — P0:20 · P1:36 · P2:52 · P3:68 · P4:84 · P5:100
- AI team strength scales up by the same offset
- Your squad is fully reset and regenerated near the new cap

The new squad is genuinely strong: **75% of players arrive at newCap−3 to newCap−1, 25% at newCap or newCap+1** — the first few seasons after prestige are the most productive training window in the game, since most of your squad starts with real headroom and (if under 23) the age training bonus too.

---

## League Modifiers — Every Tier Has Its Own Rules

Each of the 11 tiers layers a distinct rule on top of the base game. From the bottom up:

| Tier | Name | Rule |
|---|---|---|
| **11** | Concrete Schoolyard | 35% chance an injury also costs −1 to a random non-trained attribute |
| **10** | The Alley | Injury chance ×1.75; no cards issued at all |
| **9** | Sunday League | A random starter may show up "hungover" each matchday; Duo Boosts grant +2 instead of +1 |
| **8** | The Dojo | Training +50% speed; but any carded player forfeits their next training session, and cards are twice as frequent |
| **7** | Forest Hills | Home xG ×1.06, away xG ×0.88 — win 5 away matches in a season for the Koji Yamamoto unlock |
| **6** | Altitude Trials | At least 2 changes required between consecutive starting XIs; injury chance ×1.4; exhaustion injuries possible, resisted by Physical (up to 30% reduction at PHY 10+) |
| **5** | The Federation | VAR: 12% of goals disallowed, 15% of yellows upgraded to red; negative board sentiment swings ×1.4; transfer window extended to 9 weeks |
| **4** | Saudi Super League | 3 free instant-sign tickets per season; relationship building disabled entirely; a rival club attempts to poach one of your signings at the halfway mark |
| **3** | Euro Dynasty | xG ×1.2 league-wide; 50% of matches are televised (MotM in a TV game gets a permanent +1 stat); penalty conversion −10%; top 4 at the season's halfway point qualify for an end-of-season knockout (Dynasty Cup) |
| **2** | World XI Invitational | Training crawls at ×0.15 speed — only Duo Boosts and arc bonuses move the needle; fan sentiment swings ×2.5; top 4 at season end play a 5-a-side Mini-Tournament (two-leg semis, single-leg final) |
| **1** | Intergalactic Elite | Players age 3 years per season; draws pay the player 1 point, the AI 2; the AI predicts a scoreline before kickoff and steals a full 3 points if the exact score is right — regardless of the actual result; 3 Rewind tickets per season (replay a lost league match) |

A few of these are worth internalising early: The Dojo's card-skips-training rule means discipline matters as much as ability there; Sunday League's Duo Boost bump makes pairing up training focuses more valuable than usual; and World XI Invitational's 0.15× training multiplier means you should lean entirely on Duo Boosts and completed arcs to make any progress at all that season.

---

## Tier-1 Survival: The Wall Is Real

This is the game's hardest single wall, and it's worth covering honestly rather than pretending it's just difficulty scaling like every other promotion.

**The jump from tier 2 to tier 1 is the smallest AI-strength increase on the entire ladder (+0.54 OVR) — every other promotion is +1.1 to +2.3.** The difficulty spike isn't really about AI teams getting stronger. It's structural:

1. **Zero spread.** Tier 1's team-strength range is 18–20 OVR — a top-to-bottom spread of about 0.25 OVR once the cap-20 clamp is applied, versus 0.83 at tier 2. There are no weak teams to farm; every AI side in the Intergalactic Elite is within a hair of every other one.
2. **Zero headroom.** Tier 1's OVR ceiling (20) *is* the prestige-0 cap. Even a maxed-out squad only ties the field — there's no version of "train harder" that gets you above par here.
3. **You arrive undercooked.** World XI Invitational's 0.15× training multiplier means the squad that gets promoted into tier 1 has gained almost nothing the previous season — sim data puts an arriving squad around 17.5 average strength against a tier-1 field sitting at ~19.5, which alone produces a last-place finish roughly 57% of the time.
4. **The point rules cost you 1.4–2.1 points a season on top of the football.** 1-point player draws (vs 2 for the AI) and the prediction-steal mechanic both work against you regardless of how well you actually play, retroactively deleting hard-earned results.
5. **You can't train your way out in one season.** Growth at attr levels 18–20 is close to zero (see the levelFactor table above) and the 3-years-per-season aging rate pushes your squad toward decline rather than growth. The upshot: **getting relegated straight back down after a promotion is the expected, designed outcome, not a sign you played badly.**

Practically: expect to yo-yo between tiers 1 and 2 for several seasons before a title actually sticks. Build the deepest bench you can before promotion, don't panic when you're outclassed on arrival, and use your Rewind tickets on the matches where the AI's prediction steal (not the football) cost you the points. If you do get relegated straight back out, at least you'll walk away with Trask Ulgo.

---

## Club Mood, Board Expectations & the Newspaper

**Board expectations scale with how high you've climbed**, not a fixed bar:

| Tier | The board expects |
|---|---|
| 1–3 | A title challenge, nothing less |
| 4–5 | A top-three finish and promotion |
| 6–7 | A top-half finish |
| 8–9 | Avoid relegation, consolidate |
| 10–11 | Survive and build for the future |

Every match result moves two separate meters. **Fan sentiment**: a win is worth +5 (home) or +6 (away) — away wins buy you slightly more goodwill — a draw costs −1, a loss costs −8 (home) or −5 (away); scoring 3+ adds +2 more, a clean sheet adds +1. All of this is then multiplied by the tier's `fanSentimentMult` (World XI Invitational runs this at ×2.5). **Board sentiment**: +3 for a win, 0 for a draw, −4 for a loss, with negative swings multiplied by the tier's `boardScrutinyMult` (The Federation runs this at ×1.4).

The **newspaper** — post-match headlines with a rotating byline — is flavour text layered on top of this, not a separate mechanical system: it reacts to hat-tricks, streaks, giant-killings and the like with tabloid-adjacent copy, but doesn't feed back into anything numeric. Enjoy it for what it is.

---

## Rivalries

A fixture becomes a tracked rivalry once you've played the same opponent **3+ times** and either their "heat score" clears a threshold, or your raw losses to them alone hit 3+:

```
heatScore = losses × 2 + closeGames + redCards × 2
rivalry triggers at heatScore ≥ 6, or losses ≥ 3, whichever comes first
```

Losses count double toward the heat score, and red cards count the same as a loss — a fixture that's produced a couple of dismissals reads as a rivalry even with an otherwise even head-to-head record. Once a fixture qualifies, kickoff commentary pulls the most newsworthy angle from your history against them (an active losing streak, or a spate of red cards) rather than a generic line.

---

## Awards Night

Three end-of-season individual awards, all computed league-wide (not just your squad):

- **Golden Boot** — pure top-scorer across the whole league, no minimum appearances.
- **Player of the Season** — a blended score (`avgRating×10 + goals×1.5 + apps×0.2`) across every player in the league with 5+ appearances. Your own squad uses real tracked match ratings; AI players get a synthesised rating built from their team's results plus their individual goal/card contribution — the same formula the League page's Team of the Season uses.
- **Young Player of the Season** — the same pool, filtered to age 21 or under.

All three return no winner at all if there simply isn't a qualifying candidate (a thin or interrupted season) rather than forcing one.

---

## Cig Cards: The Achievement System

Achievements are collected as trading cards, organised into **32 packs of 5 or 10 cards each** (290 achievements total). Three starter packs (10 cards each) are available from the very start. Every other pack unlocks via one of: completing a specific earlier pack, winning a cup, reaching a specific tier, hitting a season-count milestone, or completing a set number of packs overall — some packs gate behind "complete 3 packs," others behind "complete 10."

This guide won't list which specific action unlocks which specific hidden card — that's the point of the system, and spelling every one out would just be a spoiler list. What's worth knowing strategically: cards you're actively working toward (a specific training combo, a specific match scoreline, a specific squad composition) are visible as locked entries with hints, so browsing your current pack before a match you expect to dominate is a legitimate way to spot an easy one without looking up a full guide.

---

## Homegrown Tracking

Any player who came through your own youth intake — including a Youth Coup prodigy — carries an **HG** badge in the squad view for as long as they're at the club, and gets a specific commentary line ("Homegrown talent on the scoresheet!") when they score. There's no separate mechanical bonus attached to the tag beyond the flavour and the badge itself, but it's a clean way to track how much of your matchday XI is actually academy product versus signings.

---

## League History

The club's season-by-season standings across every tier you've played in are archived automatically each summer and browsable from the club history screen. It's a record, not a system with its own rules — useful for tracking your own promotion/relegation pattern (including how often you've bounced at tier 1) but nothing here changes how a season plays out.

---

## Achievements Worth Engineering

Most of the 290 achievements happen naturally over a long save. A handful are worth deliberately setting up — and the unlock conditions below are read straight from the current achievement checks, not guessed at:

**"Kolo Kolo"** → unlocks Gnegneri Toure. Get a trial defender (CB/LB/RB) at least one start in their 3-week trial window so they impress, keep them on your books, win the league with them still in the squad.

**"Joga Bonito"** → unlocks Solrac Otrebor. Get a Brazilian player (trial, youth, or signing) a goal in a cup match.

**"Mixed Up"** → unlocks Leroy Litre. Put an ST, LW, or RW on Defensive Work training and have them score in a match you win.

**"Who Shot RR?"** → unlocks Mel Racey. This is *not* about starting an injured player — it's about a player who **just recovered from injury this week** scoring a brace in that comeback match. Watch your recovering players' first game back.

**"Bayda"** → unlocks Tbaraat Leda. A CM or AM needs an 8.5+ match rating without scoring — genuinely hard to force, but keeping a technical midfielder on the pitch consistently gives it room to happen.

**"King of the Hills"** → unlocks Koji Yamamoto. Win 5 away matches in a single Forest Hills (tier 7) season — home advantage is inverted there, so this takes real planning around your away fixtures.

**"Scooty Puff Jr."** → unlocks Trask Ulgo, the strongest unlockable in the game (personal cap of ovrCap+16). Get relegated *from* the Intergalactic Elite. Given how the tier-1 wall works (see above), this one may find you whether you're trying for it or not.

**"Absentee Landlord"** → win the league while on holiday. Go on holiday in the last 3-4 matchweeks of a season you've already got wrapped up.

**"Jumpers For Goalposts"** → win a match with no player set to any training focus. Set everyone to null training before a match you expect to win comfortably, then reset training after — the game's own homage to its old title, and it survives the rename intact.

**"Inverted Wingers"** → win with your LW in the RW slot and vice versa. Given the OOP penalty is now a team-average (see Match Engine above), swapping a same-group pair like this costs your whole XI's average almost nothing — a low-risk achievement to grab whenever you're heavily favoured.

---

## Quick Numbers

| | |
|---|---|
| OVR cap per prestige | P0:20 · P1:36 · P2:52 · P3:68 · P4:84 · P5:100 |
| Team strength formula | top-3 avg ×0.4 + rest avg ×0.6 |
| Home advantage | +0.2 xG (+0.15 more with Twelfth Man) |
| Talisman present / absent | +5% / −5% xG |
| Injured starter | −8% xG each, stacking (opponent gets +50% of that penalty back) |
| OOP penalty | team-wide **average** of per-slot multipliers, not per-player |
| OOP same-group / adjacent / distant / GK swap | 0.92 / 0.80 / 0.65 / 0.55–0.60 |
| OOP training weeks to fix | 5 / 10 / 16 / 22–24 |
| Training speed, stat 1–5 vs 19–20 | 0.20 vs 0.01 levelFactor (20×) |
| Age training multiplier | ×1.3 under 23, down to ×0.2 at 35+ |
| High-potential vs low-potential training gap | ~1.9× at the same OVR gap (varies with potential itself) |
| Beyond-potential training | continues at 15% speed, not zero |
| Match form training multiplier | ×0.6 (poor) to ×1.5 (rating 7.5+) |
| Duo Boost chance | 15%/week per eligible pair; +1 (+2 in Sunday League) |
| Decay chance, age 33–34 / 35–37 / 38+ | 3% / 7% / 12% per stat per week |
| Prodigy/Veteran decay modifier | ×0.5 |
| Training injury chance (focused training) | 4%, halved to 2% with Injury Shield |
| Trial evaluation window | 3 weeks; any 1 start impresses, 0 starts = released |
| Trial age / nationality / potential | always 16 / always foreign / 70–100% of ovrCap |
| Transfer window length | 6 weeks (9 in The Federation) |
| Squad cap (non-legend) | 25 |
| Prestige condition | win Tier 1, prestige level below 5 |
| Unlockable stat scaling | round(baseStat × ovrCap/20); potential = ovrCap (+ capBonus if any) |
| Rivalry threshold | 3+ meetings, and (heatScore ≥ 6 or losses ≥ 3) |
