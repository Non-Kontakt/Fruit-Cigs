# Player Growth Rework + AI Evolution + Tier Rebalance

## Context

The current training system makes tiers 11-6 a cakewalk (player squad starts at OVR 5-6 while tier 11 AI is 1-4, and low-level training is extremely fast at levelFactor 0.28). Then tiers 3-1 become a hard wall because potential is a hard cap. AI teams are completely static within a season — they only evolve between seasons via `evolveAISquad`. The game needs a living world where growth is performance-driven, AI teams have emergent arcs, and the tier progression feels meaningful throughout.

Headless simulations (50k matches, 20-season evolutions, 500 squad generations) identified five systemic issues that must be fixed first or the new growth systems will produce wrong results.

Issue: #35

---

## Phase 0: Match Engine Prerequisites

These fix structural issues identified by headless simulation that would undermine Phases 1-3.

**Branch**: `feat/35-growth-phase0-engine-fixes`

### 0A. Rebalance player rating formula

**File**: `src/utils/match.js` (~line 812-850, `generateRatings`)

**Problem**: Ratings are 50% OVR-based. A 20-OVR CB on a winning team who contributes nothing gets 8.0+. A 10-OVR striker who scores the winner gets 7.5. This means the form multiplier (Phase 2A) and MOTM breakout triggers (Phase 3) reward existing quality, not actual performance.

**Data**: 50.5% of 8.0+ ratings have 0 goals/assists. 41.4% of MOTMs have 0 goals/assists. CB wins MOTM 19.2% — more than any position.

**Fix**: Reduce OVR weight, increase event weight:
- Current: `base = 5.5 + (overall / 20) * 2.0` (OVR contributes 0-2.0)
- Proposed: `base = 5.5 + (overall / 20) * 1.0` (OVR contributes 0-1.0)
- Increase goal bonus: 1.0 → 1.5
- Increase assist bonus: 0.6 → 1.0
- Add position-specific bonuses: tackles won for DEF, saves for GK (or approximate via clean sheet bonus increase)
- Clean sheet bonus for DEF/GK starters: 0.8 → 1.2
- Rerun sim after changes to verify MOTM distribution shifts toward contributors

### 0B. Weight star players in team strength

**File**: `src/utils/match.js` (~line 132-148, `getTeamStrength`)

**Problem**: Flat average of 11 starters means one exceptional player is diluted to noise. A +10 OVR star on an average team improves win rate by only 5%.

**Data**: OVR 18 star on OVR 8 team → 33% win rate vs 28% baseline. Investing in one player is strategically meaningless.

**Fix**: Use a weighted average that gives disproportionate impact to top performers. Something like: `strength = (top3avg * 0.4) + (remaining8avg * 0.6)`. This means the top 3 players contribute 40% of team strength instead of 27% (3/11). A star player now moves the needle without making team composition irrelevant.

### 0C. Fix Poisson under-dispersion at low xG

**File**: `src/utils/match.js` (find `poissonGoals` function)

**Problem**: At low xG (~0.9), the goal distribution is compressed — variance/mean ratio 0.67 instead of 1.0. Too many 1-0 results, too few 0-0 and 3-1. This suppresses hat-tricks and multi-goal games at early tiers where breakout triggers need them.

**Data**: T8 matches: 44% are exactly 1-goal affairs. T11 draw rate: 43.5%.

**Fix**: Investigate the `poissonGoals` implementation (Knuth's algorithm, cap at 8). The cap shouldn't cause this — it only matters at high xG. More likely: the xG values themselves are too tightly clustered at low tiers due to the `XG_FLOOR: 0.3` and trait multiplier compression. Consider: (a) adding small random noise to xG before Poisson sampling, (b) widening the xG floor/intercept spread for weaker teams, or (c) using a slightly over-dispersed distribution (negative binomial) at low xG.

### 0D. Add late-game urgency modifier

**File**: `src/utils/match.js` (inside `simulateMatch`, goal generation section)

**Problem**: After a goal, response rate is flat across all periods except 76-90' where it drops to 42% — the worst period. In real football this is where trailing teams throw everyone forward and late equalisers happen. Comebacks are structurally suppressed.

**Data**: Momentum ratio 0.999x (perfectly flat). IRL Premier League: trailing teams recover ~37-43% of the time. Our engine: ~32%.

**Fix**: After goal generation, if one team is trailing in the final third of the match (minutes 60-90), apply a small xG boost to the trailing team's remaining goal probability. This could be implemented by:
- Generating goals in two phases (first half, second half) with the trailing-team modifier applied to second-half xG
- Or post-hoc: if the trailing team has fewer Poisson-generated goals, give a % chance of an additional "desperation goal" in the 75-90' window
- The boost should be modest (~15-20% xG increase) to create realistic comeback rates without making leads worthless

### 0E. Expand name pools

**File**: `src/data/nationalities.js` (name arrays per nationality)

**Problem**: 36% collision rate at 5,000 generated names. 8 same-name collisions per tier-season. Tier 1 alien names are worst — tiny pool, every team has duplicates.

**Fix**: Expand first/last name arrays for the most-used nationalities. Alien names (Tier 1) need a larger generative pool or a combinatorial approach. Target: <5% collision rate at 5,000 names.

### 0F. Normalise player tracking to ID-based keys

**File**: `src/App.jsx`, `src/store/gameStore.js`

**Problem** (flagged by Bandon, confirmed by Trask): `playerRatingTracker` is keyed by `player.name` while the new `playerMatchLog` is keyed by `player.id`. Name-based keys break when players are renamed (the game has a rename ticket) and collide when two players share a name.

**Fix**: Migrate `playerRatingTracker` to be keyed by `player.id`. Update all read/write sites (match post-processing, form multiplier, MOTM tracking). Add save migration to re-key existing entries by matching name to current squad. This must happen before Phase 2 (form multiplier reads this data).

### Testing Phase 0
- Rerun match engine sim: MOTM should shift toward goalscorers/assisters
- Rerun lone-star sim: star player win rate should increase meaningfully (target 40%+ for OVR 14 star)
- Rerun Poisson check: variance/mean ratio should be 0.9+ at low xG
- Rerun momentum sim: 76-90' response rate should be 48%+
- Generate 5,000 names: collision rate <5%
- Rename a player → verify ratings/form still track correctly via ID

---

## Phase 1: Foundation — Training Nerf, Dynamic Potential, Match Log

**Branch**: `feat/35-growth-phase1-foundation`

### 1A. Nerf training base rate

**File**: `src/utils/calc.js` (lines 71-79)

Reduce `levelFactor` values by ~25-30% (scaled back from original 50% based on playtesting feedback — the +1 dopamine hit frequency matters):

```
normalized <= 5:   0.28 -> 0.20
normalized <= 8:   0.20 -> 0.14
normalized <= 10:  0.15 -> 0.10
normalized <= 12:  0.11 -> 0.08
normalized <= 14:  0.08 -> 0.055
normalized <= 16:  0.06 -> 0.04
normalized === 17: 0.04 -> 0.03
normalized === 18: 0.03 -> 0.02
default (19-20):   0.015 -> 0.01
```

All existing multipliers still apply. The Dojo's 1.5x now gives ~100% of old mid-range rate. Combined with form multiplier (Phase 2), in-form players recover to near-old rates.

### 1B. Dynamic potential (soft ceiling)

**File**: `src/utils/calc.js` (lines 66-93)

- Keep `if (currentStat >= ovrCap) return 0;` — hard cap unchanged
- After computing `potentialBonus`, add: `const beyondPotentialMult = overall >= potential ? 0.15 : 1.0;`
- Multiply into return value

**Trask's clarification (talentFloor interaction)**: The 0.15 multiplier applies to the ENTIRE progress including talentFloor. A high-potential player at their ceiling gets `0.15 * (levelFactor * ageFactor * (1 + talentFloor) * variance)`. The talentFloor is intentionally preserved — high-ceiling players should edge past their potential slightly faster than low-ceiling ones, but both are glacial (15% speed). This is the desired behaviour.

### 1C. Add `playerMatchLog` to Zustand store

**File**: `src/store/gameStore.js`

New state: `playerMatchLog: {}` — keyed by `player.id`, array of last 20 match entries.

Entry structure:
```js
{
  goals, assists, rating, motm, cleanSheet,
  cup, away, oppStrength, winningGoal, vsLeader,
  season, calendarIndex   // ← added per Trask: needed for consecutive-match vs consecutive-appearance distinction
}
```

Reset on new game only (NOT new season — carries across).

### 1D. Populate match log after each match

**File**: `src/App.jsx` (match post-processing)

Shared helper called from both league and cup callbacks. Derives all fields from existing match result data. The `winningGoal` derivation traces chronological goal events to find which player scored the go-ahead goal that held to the final whistle.

**Trask's note on consecutive tracking**: With `calendarIndex` in each entry, breakout triggers (Phase 3) can distinguish "scored in 4 consecutive matches" from "scored 4 times with a 6-week bench gap between each." Triggers should check that entries are within a reasonable calendarIndex window.

### 1E. Save/load

Add `playerMatchLog` to save. On load: `setPlayerMatchLog(s.playerMatchLog || {})`.

### Testing Phase 1
- Training ~25-30% slower at all stat levels
- Players above potential see 15% speed progress
- `playerMatchLog` populates after league and cup matches with correct calendarIndex
- Old saves load cleanly

---

## Phase 2: Form Multiplier + Match XP

**Branch**: `feat/35-growth-phase2-form-matchxp`

### 2A. Form multiplier on training

**File**: `src/App.jsx` (training loop, ~line 2360)

Compute form from `playerRatingTracker` (now ID-keyed after Phase 0F):

```
avg rating (last 3 matches):
  >= 7.5 → 1.5x
  >= 6.5 → 1.0x
  >= 5.5 → 0.8x
  < 5.5  → 0.6x
  no matches → 0.8x
```

Added as `* formMult` to progressGain.

### 2B. Match XP (performance-based passive growth)

**File**: `src/App.jsx` (match post-processing)

| Trigger | Attr | Amount |
|---------|------|--------|
| Scored (per goal, max 3) | shooting | 0.08 |
| Assisted (per assist, max 3) | passing | 0.08 |
| Clean sheet (DEF/GK only) | defending | 0.12 |
| Rating >= 7.5 | technique | 0.08 * ((rating-7.0)/1.5) |
| Any appearance | mental | 0.04 * (rating/7.0) |

Pace and Physical are **training-only**.

**Level-up handling** (addressing Trask's flag): Apply match XP as a standalone level-up check after match XP application — same `while (progress >= 1.0)` pattern as the training loop. This runs in the match post-processing callback, not inside the training loop. Level-ups from match XP should be included in `weekGains` for GainPopup display.

**Bandon's ID consistency note**: Match XP reads scorer/assister data from `result.scorers["side|name"]` which is name-based (match engine output). Look up player by name to find their ID, then update their `statProgress` via ID. This is fine — the name→ID lookup is within a single match context where names are unambiguous.

### Testing Phase 2
- In-form players (7.5+ avg) train ~50% faster than base
- Bench players (no matches) train 20% slower
- Match XP accumulates and triggers level-ups correctly
- Pace/physical unchanged by matches

---

## Phase 3: Breakout System

**Branch**: `feat/35-growth-phase3-breakouts`

### 3A. Breakout trigger definitions

**New file**: `src/data/breakoutTriggers.js`

Pool of ~30 triggers across position groups. Each: `{ id, label, narrative, check(log, i, ctx) }`. Shuffled before evaluation.

**FWD** (~8), **MID** (~7), **DEF** (~7), **GK** (~5), **Universal** (~3).

Full trigger list defined in Phase 1 of the existing plan — unchanged.

**Trask's consecutive-match clarification**: Triggers that check "consecutive matches" verify that `calendarIndex` values in the log are within a reasonable window (no more than 3 weeks apart). If a player was benched/injured for 6 weeks, the streak resets even though log entries are adjacent.

### 3B. Breakout evaluation + 3C. State + 3D. Wiring

Unchanged from existing plan. One breakout per player per season. Attr gains: pick 2 of 3 position-specific attrs, +2-3 each. Potential: +1.

**Bandon's AI rare-event bounds note**: All potential assignments (breakouts and Phase 4 AI events) must be clamped with `Math.min(ovrCap, ...)`. Added explicitly.

### Testing Phase 3
- Forward hat-trick → breakout fires → attrs +2-3, potential +1, inbox message
- One per player per season
- Consecutive triggers respect calendarIndex gaps
- Old saves: no breakouts, no crash

---

## Phase 4: AI Evolution

**Branch**: `feat/35-growth-phase4-ai-evolution`

### 4A. Trajectory on rosters

Add `trajectory: 0` to each roster entry in `initLeagueRosters`. Backfill on load.

### 4B. Within-season AI progression

**Current tier only** (deliberate tradeoff — stated explicitly per Trask/Bandon feedback). AI teams in `allLeagueStates` evolve between seasons only. This avoids simulating 100+ teams per week but means promotion/relegation transitions can feel slightly discontinuous. Acceptable for now; revisit if trajectory system creates enough divergence that it matters.

20% chance per young player per week of +1 to random attr (capped at potential). 10% chance per 32+ player of -1.

### 4C. Trajectory update at season end

Compare final position to expected (strength rank). +/-1 for 3+ places over/underperformance. Mean-revert 0.5 toward 0. Capped +/-4.

### 4D. Trajectory affects evolution

Youth drift scaled by `1 + trajectory * 0.15`. Replacement quality center shifted by `trajectory * 0.3`.

### 4E. Rare AI events

All potential assignments clamped: `Math.min(ovrCap, ...)`.

- Wonderkid (3%): potential = `Math.min(ovrCap, tier ovrMax + offset + 3)`
- Golden generation (1%): potential `Math.min(ovrCap, normal + 2)`
- Star decline (5% per 28+ above-avg): -3 to 2 random attrs, `Math.max(1, ...)`

### Testing Phase 4
- Within-season AI OVR changes visible in current tier
- Non-player tiers frozen within season (check allLeagueStates)
- Trajectory accumulates across seasons
- Rare event potentials never exceed ovrCap

---

## Phase 5: Tier Modifier Fixes + OVR Rebalance

**Branch**: `feat/35-growth-phase5-rebalance`

### 5A. Dojo card frequency

Add `cardFrequencyMult: 2.0` to tier 8 modifier. Apply in match.js to card template weight and trait card chances.

### 5B. Altitude Trials rotation requirement

Replace `minAtkPlayers: 4` with `rotationRequired: 2`.

**Escape rules** (addressing Bandon/Trask deadlock concern):
- If fewer than 13 fit non-GK players available, rotation requirement waived entirely
- If fewer than 15 fit, requirement reduced to 1
- GK is exempt from rotation count (you shouldn't have to bench your only keeper)
- Applies to league matches only — cup matches exempt (knockout stakes override board preferences)
- Clear inbox message explaining when requirement is waived: "The board understands your squad is stretched and has waived the rotation requirement this week."

### 5C. OVR tier rebalance

| Tier | Current | New | Gap to above |
|------|---------|-----|-------------|
| 11 | 1-4 | 1-3 | — |
| 10 | 3-5 | 2-4 | 1 |
| 9 | 4-7 | 3-6 | 1 |
| 8 | 5-8 | 5-8 | 2 |
| 7 | 7-9 | 7-9 | 2 |
| 6 | 8-11 | 8-11 | 1 |
| 5 | 10-13 | 10-13 | 2 |
| 4 | 11-14 | 12-15 | 2 |
| 3 | 13-16 | 14-17 | 2 |
| 2 | 15-18 | 16-19 | 2 |
| 1 | 17-20 | 18-20 | 2 |

**Trask's dependency note**: Phase 5 starting-attrs nerf (5D) combined with Phase 1 training nerf may make early tiers too slow without Phase 4 AI within-season progression active. Both should be merged before Phase 5 for proper balance testing.

### 5D. Lower starting player squad attrs

```
baseMin: age < 21 ? 1 : age < 28 ? 1 : 2
baseMax: age < 21 ? 4 : age < 28 ? 5 : 7
attr cap: 14 -> 10
```

### Testing Phase 5
- New game: squad OVR ~2-4, T11 AI ~1-3
- Dojo: ~double cards, players skip training
- Altitude: rotation enforced, waived when squad < 13 fit, cup exempt
- Promotion feels meaningful (especially T4→T3)

---

## Phase 6: Integration + Save Migration + Polish

**Branch**: `feat/35-growth-phase6-integration`

### 6A. Save migration

Backfill all new fields with defensive conversion at load boundary (per Bandon):
```js
setPlayerMatchLog(s.playerMatchLog || {});
setBreakoutsThisSeason(new Set(Array.isArray(s.breakoutsThisSeason) ? s.breakoutsThisSeason : []));
setPrevStartingXI(s.prevStartingXI || null);
// leagueRosters trajectory backfill
// playerRatingTracker name→id migration
```

### 6B. Holiday mode verification

All new code uses `setX(prev => ...)` or `useGameStore.getState()`. No new useCallback captures.

### 6C. BootRoom debug tools

- "Trigger Breakout" — manual fire for first eligible player
- "Set AI Trajectory" — set all teams to value
- "Reset Match Log" — clear playerMatchLog

---

## Critical Files

| File | Changes |
|------|---------|
| `src/utils/match.js` | Rating rebalance, team strength weighting, Poisson fix, late-game urgency, card scaling |
| `src/utils/calc.js` | levelFactor nerf, beyondPotentialMult |
| `src/store/gameStore.js` | playerMatchLog, breakoutsThisSeason, prevStartingXI, playerRatingTracker ID migration |
| `src/App.jsx` | Match log, form mult, match XP, breakouts, AI within-season, trajectory, rotation, save/load |
| `src/utils/player.js` | evolveAISquad trajectory, rare events (clamped), starting attrs |
| `src/data/breakoutTriggers.js` | NEW — ~30 trigger conditions |
| `src/utils/breakouts.js` | NEW — evaluation logic |
| `src/data/leagues.js` | ovrMin/ovrMax rebalance |
| `src/data/leagueModifiers.js` | Dojo cardFrequencyMult, Altitude rotationRequired |
| `src/data/nationalities.js` | Name pool expansion |
| `src/utils/league.js` | trajectory: 0 in initLeagueRosters |

## Key Risks

1. **Training pacing** — 25-30% nerf + form multiplier means in-form starters train at ~75-100% of old rate. Bench players at ~56%. If too harsh, levelFactor values are one place to tune.
2. **Stale closures** — All new code uses updater pattern or getState(). Holiday-safe.
3. **Save compat** — Defensive conversion at load boundary. Old saves work.
4. **Rating rebalance ripple** — Changing ratings affects MOTM distribution, form multiplier, match XP technique channel, and breakout triggers simultaneously. Must rerun sims after Phase 0A to validate.
5. **Star player weighting** — The top-3 weighted average in 0B changes match outcomes across the board. Must rerun league season sims to verify competitiveness isn't broken.

## Verification

1. `npx --no vite build --mode development` passes each phase
2. Rerun all headless sims after Phase 0 to verify fixes land
3. New game: starting squad OVR ~2-4, competitive with tier 11 AI
4. Training ~25-30% slower, form multiplier visible
5. Match XP: 5 attrs grow from events; pace/physical don't
6. Breakout: forward hat-trick → attrs +2-3, potential +1, inbox message
7. Dynamic potential: training continues past potential at 15% speed
8. AI: within-season changes visible, trajectory creates multi-season arcs
9. Dojo: ~4-6 carded players per season skip training
10. Altitude: rotation enforced with escape rules, cup exempt
11. Late equalisers happen noticeably more often (76-90' response rate 48%+)
12. Old saves load cleanly
