# Changelog

All notable updates to Fruit Cigs, written for players.

---

## 5 July 2026 — The Great Sweep

One weekend, the whole backlog. The largest single update the game has had.

### See what the game is thinking
- **OVR demystified**: the player panel now shows exactly how much each attribute counts for your player's position, so you know why that +1 did (or didn't) move the number.
- **Club mood explained**: the fan bar expands to show *why* sentiment moved — every result, promotion, cup run and streak logged with its swing. The board line now tells you what they expect this season.
- **Progress with a timeline**: player sparklines gained season markers and "last gain" labels — stagnation finally looks different from growth.
- **Squad Progress → Most Improved**: a ranked view of who's actually developed since joining you.

### A living, talking world
- **The back page grew**: cup finals make the paper, season previews know your tenure and context, and every season now ends with **Awards Night** — Golden Boot, Young Player, and Player of the Season, league-wide.
- **Rivalries**: your head-to-head history now breeds real rivals — RIVAL-flagged fixtures, needle in the kickoff commentary, derby headlines.
- **League history**: every division's final table is archived every season. The new HISTORY tab answers "who won the Saudi Super League in Season 3?"
- **Transfer window drama**: opening day, deadline week, and the slam of the window closing all land in your inbox.
- **Scouting matters**: AI players' potential is hidden until scouted — shortlist and wait, or spend a Scout Dossier. Your own academy prospects now show their ceiling at intake, and homegrown players wear an HG badge.
- **Free agents have pasts**: every free-agent tip arrives with a one-line backstory.
- **The soundtrack knows the moment**: themed tracks now play at their moments — shootouts, prestige, title run-ins, late equalisers.

### Fixes worth knowing about
- Wonderkid scout reports now always name a real player you can actually find.
- Promotion messages tell the truth about tournament results, and knockout-tier tables mark qualification spots.
- Duo training boosts no longer wipe banked progress; holiday careers no longer silently lose compensation tickets.
- The keeper will never again be announced as a substitute winger.

## 3 July 2026 — The Cig Cards Update

- **Achievements became cig cards**: all 290 are now collectible cigarette cards in themed packs. Packs unseal as your career deepens; until then their cards show name-only teases. Every card is earnable at any time — earning one behind a sealed pack files it away for the reveal.
- **The Index**: a full-collection ledger with chronological, pack, and A-Z views. Tap any card for the full-art modal — foil shimmer included on the ones that deserve it.
- **Every unlock celebrated**: achievement toasts fire the moment you earn anything, auto-dismiss politely, and pause when you hover.

## April 2026 — The Stats Update

- **Real league-wide stats**: top scorers, assisters, and card magnets tracked properly across every competition — league and cup, this season and all-time, every division.
- **Career ledger**: per-tier and per-cup career history for every player who's passed through your club.
- **Matchday polish**: grouped scorer rows, tighter rhythm, cleaner stats tabs.

## March 2026 — The Foundation Update

- The great decomposition: the game's engine was restructured under the hood (89 changes merged) — the foundation everything above stands on.

---

<details>
<summary><b>Older entries (from the Jumpers for Goalposts era)</b></summary>


## 11 March 2026

### Improvements

- **Training rebalanced**: Non-focus training now grows stats at roughly double the old rate (0.22x vs 0.12x), so players develop more naturally across all attributes instead of just the one they're training. High-stat diminishing returns softened slightly for levels 15-19.
- **Veteran training buffed**: Players aged 32-34 now train at 50% speed (up from 40%). Still slow, but veterans aren't completely frozen anymore.
- **World XI training reworked**: Training in the World XI Invitational now runs at 15% speed instead of being fully disabled. Still brutally slow, but your players can inch forward.

### Bug Fixes

- **Assistant Manager email timing**: The Asst. Manager training onboarding email no longer arrives before you've played your first match. Also fixed the inbox button using the wrong colour.
- **Save export/import fixed**: Export and import now use the correct profile-scoped storage key, so saves belong to the right profile slot.

### Under the Hood

- Extracted remaining match engine magic numbers into named constants for easier balance tuning

---

## 8 March 2026 — The Big Tidy-Up

### New Features

- **Reporter Introduction**: A local reporter now emails you at the start of Week 2 to introduce themselves. They cover your club for the in-game newspaper and hint at Story Arcs developing in your Boot Room. Keep an eye on them.
- **Assistant Manager Training Onboarding**: Your Asst. Manager now sends you a message early in your first season offering to handle training on your behalf. You can delegate (he'll put everyone on General Training) or head to the Squad page to set it up yourself. If you ignore training for 5+ weeks, he'll nudge you again.
- **Empty Starting XI Warning**: Trying to advance into a match or hit Play Match with no starting lineup now shows a warning with a shortcut to the Squad page. No more accidental forfeits.

### Improvements

- **"ASSIGN ALL" renamed to "TRAIN ALL"**: The button on the Squad page that sets training focus for all players was confusingly named. Now it says what it actually does.
- **Training dropdown closes properly**: The TRAIN ALL dropdown now closes when you click outside it or press Escape. Previously it just hung around.
- **Match result screen scrolls correctly**: Player ratings after a match now scroll within the modal without pushing the CONTINUE button off-screen. The button is always visible and clickable.
- **Empty training reports suppressed**: The "No events this week" training popup no longer appears when nothing happened. Less clicking, less friction.

### Bug Fixes

- **Cup name fixed**: The cup competition was showing "Clubman Cup" in all headlines regardless of which cup you were actually in. Now displays the correct cup name.
- **Cup round display fixed**: Round numbers in the cup were off by one. Round of 32 was showing as Round of 64, etc. Corrected.
- **Duplicate achievement removed**: "Keeping It In The Family" was identical in practice to "Start A Family" — both triggered at the same time. Removed the duplicate to keep the Cabinet clean.

### Under the Hood

- Added PR and issue templates for consistent development workflow
- Standardised branch naming convention across the team
- Updated contributing guidelines

---

## 10 March 2026 — Under the Hood

### Improvements

- **Achievement Cabinet on mobile**: The ticket picker in the Achievement Cabinet now scrolls smoothly on mobile devices without breaking the interface.

### Under the Hood

- **State management refactored**: Completed a major migration of the core game state management system from React hooks (useState/useRef) to Zustand store. This includes all 6 core state properties and an additional 22 ref-mirrored states.
- **Message utilities extracted**: Refactored message filtering logic into a shared utility module for better code reusability.
- **State mutation safeguards**: Added stricter control over direct state mutations to prevent bugs and improve maintainability.

---

*— Trask*

</details>
