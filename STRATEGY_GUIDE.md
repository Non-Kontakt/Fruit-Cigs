# Jumpers For Goalposts — Complete Strategy Guide

---

## The Basics: How the Game Actually Works

Each season is a repeating loop of training weeks and match days, with cup fixtures threaded in between. The calendar is fixed at the start of each season — you can see what's coming but can't reorder it. Every training week you pick a focus (one attribute, or Balanced for all seven), and every player in your squad advances that stat. Then match days happen. At the end of the season, the table is resolved and you go up, down, or stay. Repeat until you win the Premier Division and either prestige or retire.

That's the surface. Here's what's actually going on underneath.

---

## Match Engine: What Determines Results

### Expected Goals is the only number that matters

Every match produces an Expected Goals (xG) value for each team. Goals are drawn from a Poisson distribution with that xG as the mean, capped at 12. The xG formula:

```
xG = 1.2 + (yourStrength − theirStrength) × 0.16 + homeAdvantage
```

Team strength is the **average OVR of your starting XI** (injured starters count at 60% of their OVR). A 3-point OVR advantage gives roughly +0.48 xG — about one extra expected goal every two games.

Home advantage is a flat **+0.2 xG**. The Twelfth Man ticket stacks on top.

### The xG modifiers that stack on top

In application order (each one modifies the result of the previous):

| Modifier | Effect |
|---|---|
| AI team trait | Varies — see traits table |
| Your Talisman playing | **+5%** to your xG |
| Your Talisman benched | **−5%** to your xG |
| Each injured starter | **−8%** to your xG, stacking |
| Out-of-position multiplier | Multiplied against your whole xG |

The worst-case combination: your Talisman is injured, you start them anyway (injured starter penalty), and two other starters are also injured.

```
1 injured starter (Talisman) + 2 more injured starters:
= (1 − 0.24) × 0.95 = 0.76 × 0.95 = 0.722 — nearly 28% weaker
```

Never start injured players unless the alternative is literally worse.

### AI Traits

| Trait | Your xG (home) | Opponent xG | Notes |
|---|---|---|---|
| **Dominant** | ×0.9 | ×1.1 | Hardest to play against; they score more, you score less |
| **Stars** | ×0.85 | ×0.9 | Low volume but clinical; counter-attack style |
| **Free Scoring** | Random ×0.7–1.3 | Random ×0.85–1.15 | Genuinely unpredictable; expect upsets both ways |
| **Defensive** | ×0.75 | ×0.8 | Grind matches; low scoring |
| **Physical** | ×0.85 both | ×0.85 both | Low scoring — losing margin capped at 2 goals |
| **Methodical** | ×0.9 both | ×0.9 both | Winning margin capped at 1 goal |
| **Flair** | ×0.95 | ×1.05 | Slight disadvantage |
| **Gritty** | — | — | 40% chance to pull one back when losing; goals late (75+) |

**Dominant is the toughest matchup.** If you're marginally better OVR-wise, they can still neutralise you. Against Dominant teams, home advantage + Twelfth Man is the best equaliser.

**Physical and Methodical are soft traps.** Physical caps losing margin at 2 — fine if you're winning, but it also suppresses your xG. Methodical caps the winner at +1 goal margin — frustrating if you're clearly better, but it limits catastrophic defeats too.

### Out-of-Position Penalties

Every slot in your formation has a position. Put a player in the wrong slot and their individual OOP multiplier drags down your *whole team's xG*.

| Mismatch type | Multiplier | Weeks to learn |
|---|---|---|
| GK → Outfield / Outfield → GK | 0.55 – 0.60 | 22 – 24 weeks |
| Cross-group (e.g. DEF → LW) | 0.65 | 16 weeks |
| Adjacent group (e.g. CM → ST) | 0.80 | 10 weeks |
| Same group (e.g. LB → RB, CM → AM) | 0.92 | 5 weeks |
| Learned secondary position | 1.00 | — |

The **same-group moves cost only 5 weeks** and eliminate the penalty entirely. Training LB→RB or CM→AM crossovers immediately is one of the highest-value things you can do in the first few seasons.

---

## Training: The Real Game

### Lower stats train faster — exploit this

The `levelFactor` makes training 23× faster at stat 1–5 than at stat 18–20. This means:

- A player at 6 Shooting will gain more total value from one week of Shooting training than a player already at 14 Shooting
- "Dump stats" that nobody trains decay slowly but also level up quickly when you do focus on them
- Spreading training across a player's whole profile early on is more efficient than pushing one stat to max

**Practical consequence**: Train your weakest relevant stats first. A GK at 8 Defending training Defending for 4 weeks will gain more than a GK at 14 Defending doing the same.

### Potential is what separates good players from great ones

The potential bonus formula:

```
potentialBonus = 1 + (potentialGap / ovrCap) × 1.5 × max(0.3, appearanceRate)
```

Where `potentialGap = potential − currentOVR`.

A player with potential 20, current OVR 10, at prestige 0 (cap 20): `1 + (10/20) × 1.5 × 1.0 = 2.5×` training speed.

A player with potential 12, current OVR 10, at prestige 0: `1 + (2/20) × 1.5 × 1.0 = 1.15×` training speed.

That's a 2.2× speed difference between high and low potential on the same training focus. **Potential is the most underappreciated stat in the game.**

Key observations:
- The `max(0.3, appearanceRate)` floor means even benched players retain 30% of their potential bonus
- But playing regularly amplifies the bonus up to 2.5×
- **Give young high-potential players minutes even at a short-term OVR cost.** A 17-year-old with potential 18 who plays every week will overtake a 24-year-old with potential 14 within 3–4 seasons

### Stat decay

At training age 33+, each non-trained stat has a small weekly chance of dropping by 1:

| Age | Decay chance per stat per week |
|---|---|
| 33–34 | 3% |
| 35–37 | 7% |
| 38+ | 12% |

**The exploit: the trained stat cannot decay.** If you rotate training across all 7 attributes (one per week), no stat can decay — you're always training the one that would otherwise be at risk. For a player you want to keep peak for as long as possible, this is the optimal strategy in their later seasons.

The **Prodigy** and **Veteran** tags halve decay chance. Both are achievable via story arcs.

### Arc training bonuses stack on top of everything

The `arcMult` in the training formula is additive:

```
progressGain = rawProgress × focusMultiplier × arcMult × doubleMult
```

- **Captain Fantastic** completion: `mentalTrainMult: 0.15` — mental training is 15% faster for everyone, permanently
- **Immortals** completion: `trainSpeedMult: 0.20` — all training 20% faster for everyone, permanently
- **Both** completed: mental training runs at `1 + 0.15 + 0.20 = 1.35×`; all other stats at `1.20×`

Double Sessions ticket applies `doubleMult: 2` on top of all of this. Used during a week where you have high-potential players training a low stat with arc bonuses active = maximum possible gains.

---

## The Talisman

Every team has one Talisman at all times. By default it's automatically whoever has the highest OVR among your non-legend players. This updates every time your squad composition changes — injury, release, a player levelling up past your current Talisman. You'll never see a label for it anywhere.

**Effect**: ±5% xG swing. Playing = +5%, benched/absent = −5%. That's a 10% total spread per match, every match, all season.

**The Captain Fantastic arc permanently reassigns the Talisman** to your arc target once the arc completes. This means you choose your Talisman deliberately — and if that player ever leaves your squad, it falls back to highest OVR automatically.

**Strategic implication**: The arc target you pick for Captain Fantastic is your franchise player. Choose someone you plan to keep for many seasons. A CM or AM with Mental 15+ who you're actively training toward the OVR cap is ideal — they'll also benefit most from the +15% mental training bonus, making the arc doubly rewarding.

---

## Story Arcs: Priority Order and Exploits

You run one arc per category (Player / Club / Legacy) at a time. Here's what's actually worth going after:

### Tier 1: Do these first

**Captain Fantastic** (Player)
- Requires: target with Mental 15+
- Reward: Captain tag + permanent +15% mental training for entire squad + Talisman reassignment
- Why first: It's a permanent squad-wide buff that applies to every future arc, every training week, for the rest of the run. The sooner you complete it, the more it compounds.

**Immortals** (Legacy)
- Requires: player OVR 16, then 3 players OVR 14+, then 5 players OVR 17+
- Reward: permanent +20% training speed for everyone
- Why: Stacks with Captain Fantastic. Together they give +35% on mental, +20% on everything else. At high prestige this is the difference between reaching the OVR cap or not.

**Youth Revolution** (Player — if your target is ≤19)
- Requires: young target, 5 starts, training focus, then OVR 13
- Reward: All future youth intake players arrive with +2 to every stat permanently
- Why: Compounds every single season as long as you're signing youth. At P3+ with a strong prestige offset, youth arrivals become genuinely competitive.

### Tier 2: Efficient arc clears

**The Machine** (Club)
- Requires: Win 3 in a row, then 5, then 8
- Reward: All squad +2 physical, +2 pace
- Why: The conditions happen naturally during a good run. If you're 5–0 already, you're halfway there. The reward is a strong wholesale stat boost.

**The Project** (Player — low OVR target)
- Requires: Pick someone OVR 8 or lower, develop them
- Reward: Prodigy tag (halved decay, +2 to weakest stat)
- Why: Fast to complete at lower tiers where you'll have weak players anyway. Prodigy tag on a young player is long-term value.

**Dynasty** (Legacy)
- Requires: Reach tier 9, then tier 6, then win tier 1
- Reward: All squad +2 mental
- Why: You're doing this anyway. Just have the arc active and it tracks automatically.

### Exploitable arc: Redemption

The full arc chain:
1. **Release a player** from your squad
2. Wait for the prodigal return offer (arrives as inbox message after a few weeks)
3. Accept them back
4. Complete focus (choose A: +2 mental, +2 technique or B: +2 physical, +2 defending)
5. Get them to 10 starts, 3 goals, and beat the club they went to

Final reward: prodigal player gets +4 pace, +3 physical — totalling **+7 stats to one player plus the focus step gains**.

This can be run across seasons by releasing a strong player at the end of one season and completing the arc in the next. The main constraints are: they need to score 3 goals (RNG), they need to face their former club in the same season (they go to a random AI team, so you may or may not share a league bracket with them), and they need 10 starts. The conditions are annoying enough that it can't be trivially farmed, but planning a deliberate release → return cycle for a key player is entirely viable.

### Holiday mode and arc option selection

Holiday auto-selects **Option A** at every focus step. This matters for a few arcs where B is better:

| Arc | Option A | Option B | Better choice |
|---|---|---|---|
| Scout Network | +2 to next trial's stats | +3 stats + reveal potential | **B** — strictly better |
| Immortals | Top 3 OVR players +2 random stat | All squad +1 to all stats | **B** — broader value |
| Youth Revolution | +2 to 3 random stats | +3 to one stat, +2 to another | Depends on archetype |
| The Double | +2 physical, +1 pace | +2 technique, +1 mental | **B** — tech and mental matter more |

**Come off holiday for focus steps on Scout Network and Immortals.** Everything else is fine to let auto-select.

---

## Unlockable Players

There are 7 unlockable players in the game. All of them have one critical property: **their stats scale with the prestige cap at the time they join**.

```
scaledStat = round(baseStat × (ovrCap / 20))
```

At P0 (cap 20): stats are the raw values listed below.
At P5 (cap 100): every stat is multiplied by 5.

Their potential is also set to `ovrCap` — the maximum ceiling for that prestige tier. This means an unlockable signed at P5 arrives as a near-finished player who can train all the way to OVR 100.

**Optimal strategy: unlock achievement-based players at the highest prestige you can.** There is no benefit to unlocking them early if you can wait — they'll be dramatically weaker at P0 than at P3. The team-name unlocks happen at game start regardless, so name your team strategically if you want those.

### The Five Achievement Unlocks

---

**Leroy Litre** — ST, Age 41, English

*Base stats (P0):* PAC 16 · SHO 16 · PAS 12 · DEF 8 · PHY 16 · TEC 14 · MEN 12

*Unlock:* Achievement **"Mixed Up"** — have a forward or winger set to Defensive Work training score in a winning match.

*How to engineer:* Set your ST or LW/RW to Defending training. Play them. Wait for them to score. Can be set up deliberately in a game you expect to win comfortably.

*At P5:* PAC 80 · SHO 80 · PAS 60 · DEF 40 · PHY 80 · TEC 70 · MEN 60 — a strong all-around striker.

*Note:* Leroy is 41 in real age terms but unlockable players use an **effective age** for training and decay purposes — mapped to a 0–10 season career arc. In practice he trains and decays roughly like a player going from age 21 to 36 across 10 seasons, not like a 41-year-old.

---

**Mel Racey** — ST, Age 71, English

*Base stats (P0):* PAC 14 · SHO 18 · PAS 15 · DEF 7 · PHY 15 · TEC 17 · MEN 19

*Unlock:* Achievement **"Who Shot RR?"** — a player returns from injury and scores a brace in their first match back.

*How to engineer:* Start an injured player, let them score. This requires starting them while injured (which itself costs −8% xG per injured starter) and them scoring twice, which is probabilistic. Most naturally done with a strong striker who just returned from a minor injury.

*At P5:* PAC 70 · SHO 90 · PAS 75 · DEF 35 · PHY 75 · TEC 85 · MEN 95 — elite ST at any prestige level. The highest Mental of any unlockable.

---

**Solrac Otrebor** — LB, Age 52, Brazilian

*Base stats (P0):* PAC 16 · SHO 19 · PAS 14 · DEF 14 · PHY 16 · TEC 18 · MEN 14

*Unlock:* Achievement **"Joga Bonito"** — have a Brazilian player score a goal in a Cup match.

*How to engineer:* You need a Brazilian player in your squad (nationality is set at generation, not changeable). You're not guaranteed one in your starting squad — check the Transfer Insider ticket or trial players for Brazilian nationality. Once you have one, get them into the starting XI for a cup game and wait for a goal.

*At P5:* PAC 80 · SHO 95 · PAS 70 · DEF 70 · PHY 80 · TEC 90 · MEN 70 — an absurdly attacking LB.

---

**Tbaraat Leda** — AM, Age 36, Moroccan

*Base stats (P0):* PAC 16 · SHO 13 · PAS 15 · DEF 6 · PHY 17 · TEC 20 · MEN 10

*Unlock:* Achievement **"Bayda"** — a midfielder achieves a match rating of 8.5+ without scoring.

*How to engineer:* This requires a CM or AM to get a 8.5+ individual rating based purely on assists and match performance noise (no goal bonus). Difficult to engineer deliberately. Best approach: play a technical AM or CM consistently, keep them on Technique training, and hope for a high-rating game where your other players score the goals. Statistically it will happen in a long season.

*At P5:* PAC 80 · SHO 65 · PAS 75 · DEF 30 · PHY 85 · TEC 100 · MEN 50 — the highest base Technique of any unlockable.

---

**Gnegneri Toure** — CM, Age 42, Ivorian

*Base stats (P0):* PAC 15 · SHO 17 · PAS 17 · DEF 15 · PHY 20 · TEC 11 · MEN 15

*Unlock:* Achievement **"Kolo Kolo"** — win the league with a trial player who impressed (a defender: CB, LB, or RB) still in your squad.

*How to engineer:* Accept every trial player who is a defender. Get them 3 starts so they "impress." Keep them on your books. Win the title with them still in the squad. This takes planning across a full season — don't release your trial defenders.

*At P5:* PAC 75 · SHO 85 · PAS 85 · DEF 75 · PHY 100 · TEC 55 · MEN 75 — the only P5 player with capped Physical. A physical engine in midfield.

---

### The Two Secret Team-Name Unlocks

These trigger automatically at game start if your club name matches. They don't require any in-game action and join your squad immediately in the first season.

---

**Ivan Ladic** — CM, Age 18, Croatian

*Base stats (P0):* PAC 12 · SHO 18 · PAS 14 · DEF 12 · PHY 14 · TEC 8 · MEN 6

*Unlock:* Name your club **Cherry, Cherries, Kirsche, Cerise, or Trešnja** (cherry in German, French, and Croatian).

*At P5:* SHO 90 — arrives as an 18-year-old with potentially elite shooting at higher prestiges. Weak technique and mental are the tradeoff, but training fast on those from a low base compensates.

---

**Helder Coelho** — ST / AM (learned), Age 23, Argentine

*Base stats (P0):* PAC 15 · SHO 17 · PAS 13 · DEF 8 · PHY 10 · TEC 15 · MEN 14

*Unlock:* Name your club **Cigar, Beer, Yerba, or Mate**.

*At P5:* Has a learned AM position from day one. Two-position flexibility at no OOP cost — the most tactically useful unlock.

---

### When to unlock — the real answer

Team-name unlocks happen at game start in whatever prestige run you're in. If you want Ladic or Coelho at P5 stats, you need to still have the team name at P5. You can rename your club in-game via a ticket, but the unlock already happened by then. **Name your team for the unlock at the prestige level you want to play them in.**

Achievement unlocks trigger when the achievement is earned — that prestige's ovrCap is baked in at that moment. If you've been sitting on "Mixed Up" conditions for five seasons and delay until P3, Leroy Litre will arrive at PAC 48 · SHO 48 · PHY 48 — substantially more useful. There is no downside to waiting unless the achievement is trivially easy and you need the squad slot now.

---

## Trials: The Best Talent Pipeline

Trial players arrive automatically with roughly **70% probability each week**. Across an 18-matchweek season with ~8 training weeks in between (roughly 26 calendar entries), you'll see around 18 trial offers per season. You can be highly selective.

All trial players are:
- **Age 16** — always
- **Non-British nationality** — always (foreign players only)
- **High potential**: 70–100% of the current ovrCap

At higher prestiges, trials arrive with stats scaled by the same prestige factor as everything else. At P3 they arrive strong enough to start within a season of signing.

**Optimal trial strategy:**
1. Accept every trial even if you don't want them — a trial player can trigger achievements (Joga Bonito if Brazilian, Deep End if they score) just by being in your squad
2. Get 3 starts for any trial you're considering keeping — that's what "impresses"
3. Track your trial history. For the **Kolo Kolo** achievement (Gnegneri Toure unlock), you specifically need a trial defender to impress and still be in your squad when you win the title. Keep your impressed trial defenders.
4. Trial players have `isTrial: true` flag — this persists if you sign them. Achievements like "Trials HD" (trial MotM) and "Deep End" (trial scores) can trigger throughout their time at the club if they're still `isTrial` flagged.

---

## Transfer Insider Tickets (Free Agents)

Free agents **do not arrive passively**. They only come through the **Transfer Insider** ticket. Using one generates a single player based on your current squad's average OVR:

- Position: random
- Age: 22–28
- OVR: squad average ±2
- Potential: OVR + 2–6

**They're calibrated to your squad, not the league.** Use Transfer Insider when your squad average is high — you'll get stronger players. Using it early with a weak squad gives you a weak agent.

The Moneyball achievement requires signing 3 via Transfer Insider. Use tickets when you have a specific position gap that neither trials nor youth are filling.

---

## Prestige: The New Game+ Loop

You prestige by winning the Premier Division (Tier 1) while below Prestige Level 5.

What changes:
- OVR cap: `20 + prestigeLevel × 16` (P0: 20, P5: 100)
- AI team strength: scales up by the same offset
- Your squad is fully reset
- A fresh squad is generated near the new cap

**The new squad is actually strong.** 75% of players arrive at old_cap − 1 to old_cap − 3, meaning they're roughly at P0's maximum and have room to grow to P1's cap. The first few seasons of a new prestige are the most productive training periods.

**What to prioritise in the first season after prestige:**
1. Identify your new Talisman (or immediately go after Captain Fantastic to designate one)
2. Start the Immortals arc early — the conditions scale with the new cap, but the sooner you complete it the more seasons you benefit
3. Focus training on each player's primary OVR stat — large gaps from current to cap make these fast to train

---

## Achievements Worth Engineering

Most achievements happen naturally. A handful are worth deliberate setup:

**"Kolo Kolo"** → unlocks Gnegneri Toure. Keep every trial defender who impresses.

**"Joga Bonito"** → unlocks Solrac Otrebor. Requires a Brazilian player. Check the nationality of every trial player — Brazilian nationals are in the pool. Once you have one, run them in cup games.

**"Mixed Up"** → unlocks Leroy Litre. Set any ST, LW, or RW to Defending training. Leave them there until they score in a win.

**"Who Shot RR?"** → unlocks Mel Racey. Hard to force, but don't retire this achievement possibility — keep it in mind when a striker returns from injury and scores twice in a bounce-back game.

**"Bayda"** → unlocks Tbaraat Leda. Play an AM or CM consistently on Technique training until they randomly get an 8.5+ rating without scoring. Can't easily be forced.

**"Absentee Landlord"** → win the league while on holiday. Put yourself on holiday in the last 3–4 matchweeks of a season where you're comfortably clear at the top.

**"Jumpers For Goalposts"** → win with no player set to any training focus. Set everyone to null training before a match you expect to win, play it, reset training after. One of the weirder ones but easy if planned.

**"Inverted Wingers"** → win with your LW in the RW slot and RW in the LW slot. Just drag and drop before a game you're favoured to win. The OOP penalty for same-group swaps is only −8% and is eliminated if they've trained the crossed position.

---

## Quick Numbers

| | |
|---|---|
| OVR cap per prestige | P0:20 · P1:36 · P2:52 · P3:68 · P4:84 · P5:100 |
| Home advantage | +0.2 xG (Twelfth Man stacks) |
| Talisman present | +5% xG |
| Talisman absent | −5% xG |
| Injured starter | −8% xG each (stacking) |
| OOP same-group | −8% team xG (5 weeks to remove) |
| OOP cross-group | −35% team xG (16 weeks to remove) |
| Training speed at stat 1–5 | 0.28 levelFactor |
| Training speed at stat 18–20 | 0.012 levelFactor (23× slower) |
| High potential training mult | Up to 2.5× |
| Decay chance (age 33–34) | 3% per stat per week |
| Decay chance (age 38+) | 12% per stat per week |
| Prodigy/Veteran tag decay mod | ×0.5 |
| Squad cap (non-legend) | 25 |
| Trial arrival chance | ~70% per week |
| Trial player age | Always 16 |
| Trial potential | 70–100% of ovrCap |
| Prestige condition | 1st in Tier 1, prestige < 5 |
| Stat scale for unlockables | ovrCap / 20 |
