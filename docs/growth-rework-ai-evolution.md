# Player Growth Rework + AI Evolution + Tier Rebalance

## Context

The current training system makes tiers 11-6 a cakewalk (player squad starts at OVR 5-6 while tier 11 AI is 1-4, and low-level training is extremely fast at levelFactor 0.28). Then tiers 3-1 become a hard wall because potential is a hard cap. AI teams are completely static within a season — they only evolve between seasons via `evolveAISquad`. The game needs a living world where growth is performance-driven, AI teams have emergent arcs, and the tier progression feels meaningful throughout.

Issue: #35

---

## Phase 1: Foundation — Training Nerf, Dynamic Potential, Match Log

**Branch**: `feat/35-growth-phase1-foundation`

### 1A. Nerf training base rate

**File**: `src/utils/calc.js` (lines 71-79)

Halve all `levelFactor` values in `getTrainingProgress`:

```
normalized <= 5:   0.28 -> 0.14
normalized <= 8:   0.20 -> 0.10
normalized <= 10:  0.15 -> 0.075
normalized <= 12:  0.11 -> 0.055
normalized <= 14:  0.08 -> 0.04
normalized <= 16:  0.06 -> 0.03
normalized === 17: 0.04 -> 0.02
normalized === 18: 0.03 -> 0.015
default (19-20):   0.015 -> 0.008
```

Pure value change. All existing multipliers (focusMultiplier, arcMult, doubleMult, dojoMult) still apply. The Dojo's 1.5x now gives 75% of old normal rate — meaningful but not dominant.

### 1B. Dynamic potential (soft ceiling)

**File**: `src/utils/calc.js` (lines 66-93)

Currently training returns 0 at ovrCap and effectively stalls at potential (gapBonus goes to 0). Change:

- Keep `if (currentStat >= ovrCap) return 0;` — hard cap unchanged
- After computing `potentialBonus` (line 91), add:
  ```js
  const beyondPotentialMult = overall >= potential ? 0.15 : 1.0;
  ```
- Multiply into return: `return levelFactor * ageFactor * potentialBonus * beyondPotentialMult * variance;`

Result: below potential = normal training. At/above potential = 15% speed (glacial but not zero). At ovrCap = still hard zero.

### 1C. Add `playerMatchLog` to Zustand store

**File**: `src/store/gameStore.js`

New state: `playerMatchLog: {}` — maps `playerId` to array of last 20 match entries.

Entry structure:
```js
{
  goals, assists, rating, motm, cleanSheet,
  cup, away, oppStrength, winningGoal, vsLeader, season
}
```

Reset on new game only (NOT new season — log carries across seasons, capped at 20 entries per player).

### 1D. Populate match log after each match

**File**: `src/App.jsx` (match post-processing, after appearance tracking ~line 7930)

Extract a shared helper `updatePlayerMatchLog(...)` called from both league and cup match callbacks. For each player who appeared:
- Count goals from `matchResult.scorers["side|name"]`
- Count assists from `matchResult.assisters["side|name"]`
- Get rating from `matchResult.playerRatings`
- Derive: cleanSheet (`oppGoals === 0`), cup (from call context), away (`!playerIsHome`), motm (`motmName === name`), winningGoal (trace goal events to find the decisive scorer), vsLeader (compare opponent to league table leader)
- Append entry, keep last 20 via `.slice(-20)`

### 1E. Save/load

**File**: `src/App.jsx` (save ~line 672, load ~line 1228)

Add `playerMatchLog` to save object. On load: `setPlayerMatchLog(s.playerMatchLog || {})`. Old saves get empty log — form/breakout features degrade gracefully to "no data."

### Testing Phase 1
- Training takes ~2x longer for level-ups at all stat levels
- Players at/above potential still see slow (15%) progress, not zero
- `playerMatchLog` populates after league and cup matches (inspect via React DevTools)
- Old saves load without crash

---

## Phase 2: Form Multiplier + Match XP

**Branch**: `feat/35-growth-phase2-form-matchxp`

### 2A. Form multiplier on training

**File**: `src/App.jsx` (training loop, ~line 2360)

After computing `appearanceRate`, compute form from `playerRatingTracker` (already exists in Zustand — array of all match ratings per player this season):

```js
const last3 = (playerRatingTracker[p.name] || []).slice(-3);
const avgRating = last3.length > 0 ? last3.reduce((s,r) => s+r, 0) / last3.length : 0;
const formMult = last3.length === 0 ? 0.8
  : avgRating >= 7.5 ? 1.5
  : avgRating >= 6.5 ? 1.0
  : avgRating >= 5.5 ? 0.8
  : 0.6;
```

Add `* formMult` to the `progressGain` calculation (line 2367).

Reads via `useGameStore.getState()` — safe for holiday mode, no ref wrapper needed.

### 2B. Match XP (performance-based passive growth)

**File**: `src/App.jsx` (match post-processing, merged into existing setSquad call ~lines 7919-7930)

For each player who appeared, add small `statProgress` increments:

| Trigger | Attr | Amount | Notes |
|---------|------|--------|-------|
| Scored (per goal, max 3) | shooting | 0.08 per goal | FWDs/AMs benefit most naturally |
| Assisted (per assist, max 3) | passing | 0.08 per assist | MIDs/AMs benefit most |
| Clean sheet (DEF/GK only) | defending | 0.12 | Rewards defensive solidity |
| Rating >= 7.5 | technique | 0.08 * ((rating - 7.0) / 1.5) | High performers get technique |
| Any appearance | mental | 0.04 * (rating / 7.0) | Universal — no position left out |

**Pace and Physical are TRAINING-ONLY** — no match XP. This gives training focus a distinct purpose.

Check for level-ups if any statProgress crosses 1.0. Apply from both league and cup match callbacks via shared helper.

### Testing Phase 2
- Players with 7.5+ avg rating train ~50% faster than base
- Bench players (no matches) train 20% slower
- After a match where a striker scored 2: shooting statProgress increases by ~0.16
- Pace and physical unchanged by match XP

---

## Phase 3: Breakout System

**Branch**: `feat/35-growth-phase3-breakouts`

### 3A. Breakout trigger definitions

**New file**: `src/data/breakoutTriggers.js`

Pool of trigger conditions per position group. Each trigger: `{ id, label, narrative, check(log, i, ctx) }`. Triggers are shuffled before evaluation — player never knows which specific one fired.

**FWD triggers** (ST, LW, RW) — ~8:
- Hat-trick in a single match
- Scored in 4+ consecutive matches
- 2+ goals in a cup match
- Scored winning goal in 3 of last 5 matches
- Back-to-back braces (2+ goals in consecutive matches)
- 5+ goals in last 8 matches
- Scored against the league leader
- 4+ goals in a single match

**MID triggers** (CM, AM) — ~7:
- 3+ assists in a single match
- Assisted in 4+ consecutive matches
- Goal + assist in same match, twice in 5 games
- 2+ assists in a cup match
- MOTM 3 times in 5 matches
- 4+ assists in last 5 matches
- Goal from midfield in 3 of last 6

**DEF triggers** (CB, LB, RB) — ~7:
- 5 clean sheets in 7 games
- Clean sheet in 3 consecutive away matches
- MOTM as a defender 3 times in 5 matches
- Clean sheet + goal/assist in same match twice in 6 games
- 4 clean sheets in a row
- MOTM in a cup match as a defender, twice in one cup run
- Average rating 7.5+ over 6 consecutive matches

**GK triggers** — ~5:
- 5 clean sheets in 7 games
- Clean sheets in 2 consecutive cup knockout rounds
- MOTM 3 times in 5 matches
- 4 clean sheets in a row
- Average rating 7.5+ over 6 consecutive matches

**Universal triggers** (any position) — ~3:
- MOTM in 3 of last 5 matches
- Average rating 8.0+ over 5 consecutive matches
- Consistently rated 1.5+ above OVR-expected baseline over 8 matches

### 3B. Breakout evaluation logic

**New file**: `src/utils/breakouts.js`

`checkBreakouts(squad, playerMatchLog, breakoutsThisSeason, ovrCap)`:
- Skips: already broke out this season, legends, unlockables, < 3 matches in log
- Gathers position-specific + universal triggers, shuffles, first match wins
- Returns: `{ playerId, playerName, trigger, attrGains, potentialGain }`

Attr gains per position type (pick 2 of 3, +2-3 each):
- FWD: shooting, pace, technique
- MID: passing, technique, mental
- DEF: defending, physical, pace
- GK: defending, mental, physical

Potential: +1 (capped at ovrCap). One breakout per player per season.

### 3C. Breakout state + wiring

**File**: `src/store/gameStore.js` — add `breakoutsThisSeason: new Set()`, reset each new season.

**File**: `src/App.jsx` — after match log update, call `checkBreakouts(...)`. For each breakout:
- Apply attr gains + potential bump via `setSquad`
- Add to `breakoutsThisSeason`
- Inbox message with trigger narrative and stat gains

### Testing Phase 3
- Forward scores hat-trick -> breakout fires -> attrs +2-3, potential +1, inbox message
- Only one breakout per player per season
- Old saves (empty log): no breakouts, no crash

---

## Phase 4: AI Evolution

**Branch**: `feat/35-growth-phase4-ai-evolution`

### 4A. Add `trajectory` to league rosters

**File**: `src/utils/league.js` (~line 36) — add `trajectory: 0` to each roster entry.

**File**: `src/App.jsx` — backfill on load: `cfg.trajectory = cfg.trajectory ?? 0`.

### 4B. Within-season AI progression

**File**: `src/App.jsx` (inside `advanceWeek`, after player training ~line 2447)

Lightweight pass on current tier's `league.teams` only (not `allLeagueStates`):
- Age <= 28, OVR below potential: 20% chance of +1 to random attr (capped at potential)
- Age >= 32: 10% chance of -1 to random attr (pace/physical biased 50%)

Uses `setLeague(prev => ...)` — holiday-safe. ~160 checks/week, negligible performance.

### 4C. Trajectory update at season end

**File**: `src/App.jsx` (~line 9710, before evolveAISquad calls)

For each AI team in each tier, compare final position to expected position (strength rank):
- Overperformed by 3+ places: trajectory +1
- Underperformed by 3+ places: trajectory -1
- Otherwise: mean-revert toward 0 by 0.5
- Capped at +/-4

Build standings from `league.table` (player tier) and `allLeagueStates` (other tiers).

### 4D. Trajectory affects evolution

**File**: `src/utils/player.js`

Add `trajectory = 0` param to `evolveAISquad` and `generateAIReplacement`:
- Youth drift scaled by `1 + trajectory * 0.15` (+4 = 60% faster youth dev)
- Replacement quality center shifted by `trajectory * 0.3`

Update all call sites to pass `cfg.trajectory || 0`.

### 4E. Rare AI events (in `evolveAISquad`, before return)

- **Wonderkid** (3% per team): one youth replacement gets potential = tier ovrMax + offset + 3
- **Golden generation** (1% per team): 2-3 youth get potential +2
- **Star decline** (5% per 28+ above-avg player): -3 to 2 random attrs

### Testing Phase 4
- AI OVRs in current tier change during the season
- Trajectory values set on rosters after season end
- Positive-trajectory teams produce better youth over multiple seasons
- Rare events fire occasionally

---

## Phase 5: Tier Modifier Fixes + OVR Rebalance

**Branch**: `feat/35-growth-phase5-rebalance`

### 5A. The Dojo card frequency

**File**: `src/data/leagueModifiers.js` (tier 8) — add `cardFrequencyMult: 2.0`

**File**: `src/utils/match.js` — multiply card template weight, physical card chance (0.4), and flair card chance (0.3) by `modifiers.cardFrequencyMult || 1`.

Result: ~2-6 cards per Dojo match instead of ~1-3. 4-6 players lose training across a season.

### 5B. Altitude Trials rotation requirement

**File**: `src/data/leagueModifiers.js` (tier 6) — replace `minAtkPlayers: 4` with `rotationRequired: 2`

**File**: `src/store/gameStore.js` — add `prevStartingXI: null`

**File**: `src/App.jsx`:
- Remove `minAtkPlayers` enforcement
- Before match start: if `mod.rotationRequired` and `prevStartingXI` exists, block if fewer than 2 changes
- After each match: update `prevStartingXI`
- Reset at season start

### 5C. OVR tier rebalance

**File**: `src/data/leagues.js` (LEAGUE_DEFS ovrMin/ovrMax)

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

### 5D. Lower starting player squad attrs

**File**: `src/utils/player.js` (generatePlayer, lines 142-153)

```
// Current -> New:
baseMin: age < 21 ? 1 : age < 28 ? 2 : 3   ->   age < 21 ? 1 : age < 28 ? 1 : 2
baseMax: age < 21 ? 6 : age < 28 ? 8 : 10   ->   age < 21 ? 4 : age < 28 ? 5 : 7
attr cap: 14 -> 10
```

Starting squads cluster around OVR 2-4, matching tier 11 AI range.

### Testing Phase 5
- New game: squad OVR ~2-4, tier 11 AI ~1-3
- Dojo: ~double the cards, carded players skip training
- Altitude: match blocked if < 2 XI changes from previous match
- Tiers 4-1 feel like real step-ups on promotion

---

## Phase 6: Integration + Save Migration + Polish

**Branch**: `feat/35-growth-phase6-integration`

### 6A. Save migration
Backfill: `playerMatchLog || {}`, `breakoutsThisSeason || []` -> Set, `prevStartingXI || null`, `leagueRosters trajectory || 0`

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
| `src/utils/calc.js` | levelFactor halved, beyondPotentialMult |
| `src/store/gameStore.js` | playerMatchLog, breakoutsThisSeason, prevStartingXI |
| `src/App.jsx` | Match log, form mult, match XP, breakouts, AI within-season, trajectory, rotation, save/load |
| `src/utils/player.js` | evolveAISquad + generateAIReplacement trajectory, rare events, starting attrs |
| `src/data/breakoutTriggers.js` | NEW — ~30 trigger conditions |
| `src/utils/breakouts.js` | NEW — evaluation logic |
| `src/data/leagues.js` | ovrMin/ovrMax rebalance |
| `src/data/leagueModifiers.js` | Dojo cardFrequencyMult, Altitude rotationRequired |
| `src/utils/match.js` | Card weight scaling |
| `src/utils/league.js` | trajectory: 0 in initLeagueRosters |

## Key Risks

1. **Training too slow?** — Good form (1.5x) = 75% of old rate. Match XP supplements. levelFactor values easy to tune.
2. **Stale closures** — All new code uses updater pattern or getState(). Holiday-safe.
3. **Save compat** — Every new field defaults gracefully. Old saves work.
4. **OVR rebalance vs existing saves** — Only affects new league init, not mid-season saves.

## Verification

1. `npx --no vite build --mode development` passes each phase
2. New game: starting squad OVR ~2-4, competitive with tier 11 AI
3. Training noticeably slower, form multiplier visible
4. Match XP: shooting/passing/defending/technique/mental grow from events; pace/physical don't
5. Breakout: forward hat-trick -> breakout -> attrs +2-3, potential +1, inbox message
6. Dynamic potential: training continues past potential at glacial pace
7. AI: within-season changes visible, trajectory creates multi-season arcs
8. Dojo: ~4-6 carded players per season skip training
9. Altitude: must rotate 2+ XI players between matches
10. Old saves load cleanly
