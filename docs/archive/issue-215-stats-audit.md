# Issue #215 — Stats Overhaul Audit & Scope Plan

This is the audit pass Bandon asks for in
[`docs/issue-215-stats-overhaul-brief.md`](./issue-215-stats-overhaul-brief.md)
section 1, before any implementation. Read the brief first; this doc
references it heavily.

No code changes yet. The PR exists to anchor the audit and the proposed
phase 1 scope so reviewers can push back on direction before I commit
to the architecture.

---

## 1. Where stats live today

There are **four** competing sources of truth, each with a different
identity scheme. This is the core of the fragility.

### A. `simulateMatch` events (`src/utils/match.js`)

Already emits per-event side and minute. Goal events:

```js
{ type: "goal", side, player, assister, minute, text, flash, flashColor }
```

Card events:

```js
{ type: "card" | "red_card", side, cardPlayer, cardTeamName, minute, text, ... }
```

MOTM event:

```js
{ type: "motm", minute: 90, text: "⭐ Man of the Match: ..." }
```

**No IDs on any event.** Names only. Team affiliation present on cards
(`cardTeamName`), implicit on goals via `side`.

### B. `simulateMatch` return value

The function already builds **both** name-keyed and ID-keyed maps in
the same pass:

```js
return {
  scorers,        // { "home|Name": count }      ← used everywhere
  scorersByID,    // { "home|playerId": count }  ← used by growth systems only
  assisters,
  assistersByID,
  motmName, playerRatings, ...
}
```

So IDs *are* threaded through for player-team scoring, but only for the
growth system. Stats UI ignores the `*ByID` maps.

### C. `leagueResults` (`App.jsx:2847` and `:3564`)

Stored after every league matchweek as a **condensed projection**:

```js
{
  home, away, homeGoals, awayGoals,
  goalScorers:    [{ name, assister, side, minute }],
  cardRecipients: [{ name, teamIdx }],
}
```

Notes:
- No IDs.
- No yellow/red distinction in `cardRecipients` — collapsed.
- `assister` carried per goal but never broken out as a top-level array.
- Same condensed shape on both the holiday and non-holiday paths.

### D. `playerSeasonStats` (`useMatchResult.js:524`)

Object keyed by `player.name` (player team only). Tracks
`{ goals, assists, yellows, reds, apps, motm, position, nationality }`.

Importantly: **this is the only place yellows and reds are stored
separately.** AI teams collapse cards into `cardRecipients` total only.

### E. `allTimeLeagueStats` (gameStore + season-end roll-up)

Shape:

```js
{
  scorers:   { "Name|TeamName": count },
  assisters: { "Name|TeamName": count },
  cards:     { "Name|TeamName": count },  // combined yellow + red
}
```

Accumulated **three different ways**:

1. During-season AI matchweek hook (`App.jsx:3635`): adds scorers/
   assisters from non-current-league AI matchweeks.
2. During-season holiday AI matchweek hook (`App.jsx:2945`): same idea
   for holiday-simmed weeks.
3. Season-end roll-up (`App.jsx:6531`): re-iterates the entire
   `leagueResults` object and adds AI-team scorers/cards/assists into
   the same `allTimeLeagueStats`.

**This is the double-count bug.** The AI tiers handled during the
season via paths 1 and 2 are for *other tiers* (`allLeagueStates`), not
the current league. The current league's AI matches *are* in
`leagueResults`, so path 3 picks them up correctly. The two are
disjoint by tier. So this isn't actively broken today, but the
mechanism is fragile — there's nothing structural enforcing the
disjoint, and any code change to either path could double count.

### F. UI reconstruction (`LeaguePage.jsx:38–72`)

The Stats tab rebuilds its own table:

- AI scorers/assisters/cards from `leagueResults` (skipping `teamIdx === 0`)
- Player-team scorers/assists/cards from `playerSeasonStats`
- Keyed by `Name|teamIdx` (the *index*, not name)

So the Stats tab uses **a fifth** key scheme (`Name|teamIdx`), distinct
from `allTimeLeagueStats`'s `Name|TeamName`.

---

## 2. Cup state — almost no stats at all

`cup.rounds[].matches[].result` after a player match (via the Cup
result modal flow) carries everything `simulateMatch` returned.

But `advanceCupRound` (`src/utils/league.js:639`) for **AI vs AI** cup
matches calls `simulateMatch`, **takes only `{homeGoals, awayGoals}`**,
and discards the events:

```js
return {
  ...match,
  result: { homeGoals, awayGoals, winner, penalties? },
};
```

So:
- AI cup scorers/cards exist transiently in `simulateMatch`'s output
- Then are thrown away
- The Cup page has no source of truth for cup-wide top scorers, etc.

This is the single biggest fix the brief calls out in section 9.

---

## 3. Identity issues confirmed (brief sections 3 + 4)

- All event payloads carry **names only**.
- All persisted projections (`leagueResults`, `allTimeLeagueStats`) key
  by name combinations.
- `simulateMatch` already builds `scorersByID` / `assistersByID` for
  the player team but those are never written to persisted state.
- AI match events have no player IDs at all (AI player objects do
  have stable IDs in `team.squad`, but the events don't carry them).

So the foundation Bandon wants — IDs flowing from event → accumulator
→ canonical store — needs an event-shape upgrade, plus a name→id
lookup at simulate-time for the AI side.

---

## 4. Yellow/red collapse confirmed (brief section 5)

- `simulateMatch` distinguishes `type: "card"` (yellow) and
  `type: "red_card"` (straight red).
- Second-yellow handling: I didn't trace it in this audit yet. Worth
  a follow-up confirmation before the implementation locks in the
  rule.
- `playerSeasonStats` (player team only) keeps yellows/reds separate.
- `leagueResults.cardRecipients` collapses both into one bucket.
- `allTimeLeagueStats.cards` collapses both into one bucket.
- LeaguePage Stats tab presents **a single "Cards" column**, no split.

---

## 5. Idempotency status (brief section 7)

Currently no `matchId` or processed-match tracking exists. The system
works because:

- Match completion writes `leagueResults[matchweekIndex]` keyed by MW
- Re-processing the same matchweek would overwrite, not duplicate,
  because the writes are `setLeagueResults(prev => ({ ...prev, [mw]: condensed }))`
- `playerSeasonStats` is *not* matchweek-keyed — it's incrementally
  appended. **A re-processed player match would double count.**
- `allTimeLeagueStats` accumulators (`+=`) — **also vulnerable to
  duplicate writes** if the same match path fires twice.

So the brief's concern is real for `playerSeasonStats` and
`allTimeLeagueStats`, but not for `leagueResults` (which is keyed and
overwriting, not summing).

---

## 6. Match path coverage today (brief section 8)

| Path | League stats | Cup stats |
|---|---|---|
| Normal player league match | `leagueResults` + `playerSeasonStats` ✓ | n/a |
| Holiday player league match | `leagueResults` + `playerSeasonStats` ✓ | n/a |
| Same-tier AI vs AI league | inside `leagueResults` ✓ | n/a |
| Other-tier AI leagues | direct write to `allTimeLeagueStats` only | n/a |
| Player cup match (modal) | n/a | `cup.rounds[i].matches[j].result` keeps full events ✓ |
| Holiday player cup match | n/a | inline path stores result and updates `playerSeasonStats` |
| AI vs AI cup match | n/a | **score only — events discarded ❌** |

Mini/dynasty: I didn't trace these. Brief explicitly says they're
out of scope unless we choose to include them.

---

## 7. Proposed phase 1 scope (matches brief section 17)

### In scope
1. **New canonical store**: `seasonLeagueStats` (current player league
   only). Identity by `player.id` where available, deterministic
   composite fallback otherwise. Yellows + reds separated. Phase 1
   tracks **goals, assists, yellows, reds, apps, starts**. MOTM and
   ratings are explicitly **deferred** — they live in `playerSeasonStats`
   and `motmTracker` today and don't need disturbing for the league
   Stats tab to ship.
2. **Pure accumulator**: `accumulateMatchStats(stats, { result, homeTeam,
   awayTeam, competition, matchId })` — fully unit-tested, lives in a
   new `src/utils/competitionStats.js`. **API stays competition-
   agnostic** — no league-only assumptions baked in, so phase 2's cup
   wiring reuses the same helper unchanged.
3. **Idempotency key**: `matchId = league:S{season}:T{tier}:MD{mw}:M{matchIdx}`,
   tracked in `processedMatches` on the stats blob itself (so it
   travels with the data). Cup phase 2 uses a separate namespace:
   `cup:S{season}:{cupName}:R{round}:M{matchIdx}`. Includes tier
   explicitly so future other-tier wiring doesn't need a key change.
4. **Build events from player refs at simulate-time, not from names**:
   change `pickScorer()` and the assister/card pickers in `match.js`
   so they return `{ id, name, position }` references rather than
   bare names, and pass that ref through the event creation paths.
   Goal events become:
   ```js
   { type, side, playerId, player, assisterId, assister,
     teamId, teamName, minute, ... }
   ```
   Card events similarly carry `cardPlayerId` and `teamId`.
   Display fields (`player`/`assister`/`cardPlayer`) stay so the
   commentary, scorer strip, and feed don't need to change.
   **Critical: every post-processing rewrite must update IDs too.**
   Verified rewrite paths in `match.js`:
   - ~810 substitution scorer/assister reassignment (`evt.player`
     and `evt.assister` get replaced)
   - ~841 substitution card-player reassignment (`evt.cardPlayer`)
   - ~864 second-yellow type flip (`evt.type = "red_card"`)
   - ~899 red-card bonus goal injection (fresh `pickScorer` call)
   - VAR rewrites in the same neighbourhood
   If the visible name changes but the ID does not, the canonical
   store will silently credit the wrong player. This is the single
   highest-risk integration point in phase 1 and gets a dedicated
   regression test.
5. **Wire all four current-league paths through the accumulator**:
   normal player match, holiday player match, same-tier AI matchweek
   inside the player's current league (already has events), holiday
   same-tier AI matchweek. Other-tier AI leagues (`allLeagueStates`)
   stay out of phase 1 — they're tied to the all-time roll-up which
   is phase 3.

   "Current player league" explicitly = the player's match plus the
   same-tier AI fixtures, in both normal and holiday flows. Stated
   so reviewers can sanity-check the wiring map.
6. **Replace `LeaguePage` Stats tab** with selectors over the new
   canonical store. Keep existing visual layout for now.
7. **Selectors**: `getTopScorers`, `getTopAssisters`, `getMostYellows`,
   `getMostReds` (separate, per the issue).
8. **Save/load**: persist `seasonLeagueStats`. Old saves get a clean
   empty default plus a "stats available from this season onward"
   notice if/where it matters.
9. **Tests**: per the brief's section 16 list — accumulator
   correctness, yellow/red split, second-yellow rule, idempotency,
   duplicate names with different IDs, missing IDs, selector ordering,
   plus a dedicated regression test for the post-processing rewrite
   paths (substitution rewrites must update IDs in lock-step).

### Deferred to phase 2
- Cup stats (player + AI cup matches). Requires `advanceCupRound`
  to preserve event payloads, plus a parallel `seasonCupStats` store
  and a `CupPage` Stats panel.

### Deferred to phase 3
- Roll season → all-time at season end via the new canonical store.
- Migrate `allTimeLeagueStats` shape and the achievements that read
  from it (`Bag Man`, `Tactical Foul`, `Etched In Stone`,
  `Brexit`-related logic) onto the canonical pipeline.
- MOTM / ratings entering canonical stats.
- Other-tier AI league per-player stats.

### Out of scope for #215 entirely (unless you say otherwise)
- Mini tournament / dynasty knockout stats.
- Career cup records (different feature).

---

## 8. Resolved design decisions

All four questions Bandon and I had pre-implementation are now
locked. Recording them here so the implementation PR can reference
this section instead of re-litigating.

1. **Second-yellow rule.** Counts as **one yellow + one red**. The
   second-yellow `red_card` event carries explicit metadata:
   `redReason: "second_yellow"`, `countsAsYellow: true`. The
   accumulator reads `countsAsYellow` as the signal — no inference
   from `redReason`. Direct reds are red only. VAR-upgraded yellows
   are red only unless we deliberately preserve the original yellow
   as a separate event (we don't, in phase 1).

2. **AI player identity.** Solved at `simulateMatch` event creation,
   not via cup-specific adapters. Pickers (`pickScorer`, etc.) return
   `{ id, name, position }` refs from the start so events carry
   identity from the moment a player is selected. AI squads have
   stable IDs; cup phase 2 inherits this for free.

3. **Old saves.** Clean blank default. No reconstruction from old
   name-only `leagueResults`. Best-effort would be worse than a
   clear "stats available from this season onward" line.

4. **Phase 1 cut-off.** League-only ships first; cup waits for
   phase 2. Helper API stays competition-agnostic so phase 2 reuses
   it unchanged — no league-only baked into the accumulator.

---

## 9. What this PR contains

Just this audit doc and the original brief. No code, no shape
changes yet. Phase 1 implementation PR follows next, with the
accumulator, canonical store, event upgrade, selectors, and full
tests per brief section 16 + the post-processing rewrite regression
test from section 7.4 above.
