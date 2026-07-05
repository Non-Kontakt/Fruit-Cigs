# Issue #215: League & Cup Stats Overhaul Brief

From Bandon:

For #215, the big thing is this should be treated as a source-of-truth stats architecture task first, and a UI task second.

The current `LeaguePage` already shows a Stats tab, but it is mostly reconstructed from `leagueResults` plus player-only `playerSeasonStats`. That is exactly the fragility #215 is trying to remove. The ethos version of this fix is not "make the visible table look better"; it is "make individual league/cup stats real, canonical, and trustworthy."

## 1. Audit Before Implementing

Before touching UI, audit the current flow end-to-end:

- What does `simulateMatch()` emit for goals, assists, yellows, reds, MotM and ratings?
- What does `simulateMatchweek()` preserve for AI vs AI matches?
- What does `leagueResults` store after a league matchweek?
- What does `cup.rounds[].matches[].result` store after player cup matches and AI cup matches?
- Where does `playerSeasonStats` diverge from league-wide stats?
- Where is `allTimeLeagueStats` currently accumulated, and what is double-counted or reconstructed?

The answer should decide the implementation. Do not build another derived UI layer on top of the existing mixed sources.

## 2. Establish One Canonical Stat Model

We need a single season stat shape for competitions, probably something like:

- `seasonLeagueStats`
- `seasonCupStats`

Each should be structured around players, not separate disconnected bags where possible.

Suggested shape:

```js
{
  players: {
    [playerKey]: {
      playerId,
      name,
      teamId,
      teamName,
      competition,
      goals: 0,
      assists: 0,
      yellows: 0,
      reds: 0,
      apps: 0,
      starts: 0,
      motm: 0,
      ratingTotal: 0,
      ratingApps: 0,
      position
    }
  }
}
```

If that feels too big for phase 1, still use a normalised helper internally and expose selectors for scorers/assisters/cards. The important bit is that we do not keep inventing one-off `{ "Name|Team": count }` maps everywhere.

## 3. Do Not Key Canonical Stats By Name Alone

This is crucial. There is already an open duplicate-name issue (#205), and stats are exactly where duplicate names become poisonous.

Avoid keys like:

```text
John Smith|0
John Smith|Chelsea
```

Better:

- Prefer `player.id` where available.
- For AI players, thread IDs through match events if they exist.
- If some generated cup teams do not have stable player IDs, create a deterministic fallback key from competition/team/player identity, but document it.
- Keep `name` as display data, not identity.

This probably means `simulateMatch()` should stop returning only player names in events. It should either pick a player object or return a stat identity object:

```js
{
  playerId,
  playerName,
  position,
  teamSide,
  teamId,
  teamName
}
```

Then the commentary can still say the name, but stats use the ID/key.

## 4. Fix Match Event Output At The Source

Right now goals carry `player` and `assister` names. Cards carry `cardPlayer` and `cardTeamName`. That is workable for text, but weak for stats.

The clean approach is to upgrade emitted events to carry both display and identity fields, for example:

```js
{
  type: "goal",
  side: "home",
  playerId,
  player: playerName,
  assisterId,
  assister: assisterName,
  teamId,
  teamName,
  minute
}
```

For cards:

```js
{
  type: "card" | "red_card",
  cardPlayerId,
  cardPlayer,
  teamId,
  cardTeamName,
  minute
}
```

Do not parse text. Do not infer team from names if the event already knows side/team. The event should be the reliable source.

## 5. Separate Yellow And Red Cards

The issue explicitly asks for yellow cards and red cards. Current code often collapses "cards" into a single count, and some paths only collect `type === "card"` which risks missing reds.

This should become:

- `yellows`
- `reds`
- `cardsTotal` as a derived UI value only, if needed

Be careful with second-yellow reds. Decide the stat rule clearly:

- If a second yellow becomes a red, does it count as one yellow plus one red, or just one red?
- Football convention usually tracks yellow cards and red cards separately, but a second-yellow dismissal is often represented as second yellow plus red.
- Whatever we choose, tests must lock it in.

The current implementation mutates the second yellow event into `type: "red_card"`, so if we want both yellows counted, the event may need an explicit `redReason: "second_yellow"` or `countsAsYellow: true`.

## 6. Accumulate When Matches Are Simulated, Not When Pages Render

`LeaguePage` should not calculate truth. It should render selectors from canonical state.

Correct flow:

1. Match simulated.
2. Result events converted into stat deltas by a pure helper.
3. Deltas merged into `seasonLeagueStats` or `seasonCupStats`.
4. UI reads stats.

Something like:

```js
accumulateMatchStats(stats, {
  result,
  homeTeam,
  awayTeam,
  competition: "league",
  matchId
})
```

This helper should be pure and unit tested. It should not live buried in `App.jsx`.

## 7. Make Match Accumulation Idempotent

This is a classic hidden bug risk.

A match can be viewed, dismissed, auto-simmed, holiday-skipped, or restored from save. If stat accumulation runs twice for the same match, the table is ruined.

Add a `matchId` or `statEventId` and track processed matches:

```js
processedMatches: {
  [matchId]: true
}
```

For league:

```text
league:S3:MD7:homeIdx-awayIdx
```

For cup:

```text
cup:S3:Clubman:R2:homeName-awayName
```

For mini/dynasty, use their own competition namespace.

If migration/storage makes Sets awkward, store as a plain object.

## 8. Cover All Match Paths

This is the part most likely to go wrong. Stats must update through every way a match can resolve:

- Normal league match with `MatchResultScreen`
- Holiday league match inline
- AI vs AI league matches in the player's current league
- AI leagues in `allLeagueStates`, if we care about stats for other tiers
- Player cup match after result modal dismissal
- Holiday cup match inline
- AI vs AI cup matches inside `advanceCupRound`
- Dynasty/mini tournaments only if they are intended to be covered by this issue

I would explicitly scope phase 1:

- Current player league: yes
- Current season cup: yes
- Other AI-only tiers: probably no unless we are ready to store their full stats too
- Dynasty/mini: optional/future unless already simple

But the PR should state the scope so reviewers know what is deliberate.

## 9. Cup Stats Need AI vs AI Results Too

Cup stats are not just the player's cup matches. If the `CupPage` has top scorers/assisters/cards, AI cup matches need stat events too.

Current `advanceCupRound()` simulates AI vs AI cup matches but only stores score/winner in the result. If `simulateMatch()` returns events there, we should preserve a condensed stat payload from those AI matches too.

Cup match result should store at least:

- `goalScorers`
- `assisters`
- `yellowRecipients`
- `redRecipients`

Better: store a normalised `statEvents` array from the match.

## 10. Keep `playerSeasonStats` And Competition Stats Responsibilities Clear

`playerSeasonStats` is player-squad career/season tracking. It drives player profiles, achievements, club history, etc.

`seasonLeagueStats` and `seasonCupStats` should be competition-wide tables.

Do not make them fight each other. For the player's team, either:

- The canonical competition stats update from the same match result as `playerSeasonStats`, or
- `playerSeasonStats` becomes derived from the canonical match stat pipeline.

The worst version is the current-style split where AI stats come from `leagueResults`, player stats come from `playerSeasonStats`, and all-time stats merge both with special cases.

## 11. All-Time Stats Should Be Downstream, Not Hand-Merged

The current `allTimeLeagueStats` accumulation at season reset is fragile. It rebuilds/merges from current league results plus player season stats and club history. This can double count or overwrite depending on save timing.

Better approach:

1. Canonical season stats are accumulated during the season.
2. At season end, roll `seasonLeagueStats` into `allTimeLeagueStats`.
3. Then clear `seasonLeagueStats`.

Same for cup if we want cup all-time later, but #215 can focus current-season cup stats unless the issue wants career cup records too.

## 12. Save/Load Migration Needs A Clean Default

New save fields need defaults on load:

```js
seasonLeagueStats: emptyCompetitionStats(),
seasonCupStats: emptyCompetitionStats(),
allTimeLeagueStats: existingShapeMigratedOrCompatible
```

For old saves, do not attempt heroic reconstruction unless safe. It is better to show "stats available from this season onward" than create fake precision.

If migration seeds anything, label it as best-effort and keep it limited.

## 13. UI Should Be A Consumer, Not The Engine

`LeaguePage` should receive already-derived leaderboards or use small selectors:

- `getTopScorers(seasonLeagueStats)`
- `getTopAssisters(seasonLeagueStats)`
- `getMostYellows(seasonLeagueStats)`
- `getMostReds(seasonLeagueStats)`

`CupPage` should use the same pattern.

Avoid duplicating sorting/rendering logic between `LeaguePage` and `CupPage`. A shared component like `CompetitionStatsPanel` would fit the ethos nicely.

## 14. Mobile Layout Matters

Stats tables can become noisy fast. On mobile:

- Use tabs/segments: Goals, Assists, Cards
- Show top 10, not giant scroll walls
- Use compact rows: rank, player, team, value
- Highlight player-team rows subtly
- Keep team names truncated but readable
- Do not use huge emoji-heavy headings that eat vertical space

On desktop, richer columns are fine.

## 15. Make The Data Explain Achievements

This directly supports Bag Man and future awards. After this work, the player should be able to see:

- Who is leading the league scoring chart
- Whether one of their players is top
- How close the race is
- Who is racking up cards
- Who is leading cup scoring

That is the gameplay value. The stats are not just decoration; they make achievements and narratives legible.

## 16. Tests Are Non-Negotiable

Minimum tests I would expect:

- `accumulateMatchStats` counts goals and assists for both teams.
- It separates yellow and red cards.
- It handles second-yellow red according to the chosen rule.
- It does not double-count the same match twice.
- It handles duplicate player names when player IDs differ.
- It handles missing IDs/names gracefully.
- League stat selectors sort correctly and tie-break deterministically.
- Cup stat accumulation works for AI vs AI and player matches.
- Save migration/default shape does not crash old saves.

## 17. PR Should Probably Be Phased

This issue can sprawl. Best clean split:

### Phase 1

- Add canonical stat helpers/model.
- Thread needed IDs through match events.
- Accumulate league stats for current player league.
- Replace `LeaguePage` Stats tab to read canonical stats.

### Phase 2

- Add cup stat accumulation, including AI cup matches.
- Add `CupPage` stats tab/panel.

### Phase 3

- Roll season stats into all-time cleanly.
- Update achievements like Bag Man/Tactical Foul to use canonical stats instead of reconstructing from `leagueResults`.

If this is done in one PR, the structure needs to be extremely disciplined. I would rather see one clean foundation PR than a giant "stats overhaul" that touches `App.jsx` in 15 places with ad hoc merges.

## 18. Biggest Pitfalls To Avoid

- Do not key stats by player name only.
- Do not reconstruct stats inside UI components.
- Do not count only `type === "card"` and forget `red_card`.
- Do not store combined cards when the issue asks for yellows and reds.
- Do not update player matches but forget AI vs AI matches.
- Do not update normal mode but forget holiday mode.
- Do not make cup stats player-only.
- Do not double-count on result dismissal/load/season reset.
- Do not fix this by piling more special cases into `LeaguePage`.

## Ideal End State

Match simulation emits reliable stat-bearing events. A pure accumulator turns completed matches into canonical competition stats. `LeaguePage` and `CupPage` render those stats through shared selectors/components. Achievements and awards can then trust the same data.

That is the clean version, and it sets up #214 beautifully.
