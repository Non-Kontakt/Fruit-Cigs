# Changelog

All notable updates to Jumpers for Goalposts, written for players.

---

## 12 March 2026

### Bug Fixes

- **Save button feedback fixed**: The Export and Import buttons in Boot Room now show the correct status — "EXPORTED ✓" / "IMPORTED ✓" on success, "INVALID FILE" / "NO SAVE" on errors, and a loading state while the operation runs. Previously they never changed because the code was checking for status values that didn't exist.

### Under the Hood

- Removed duplicate colour definitions from 4 standalone screens (Mode Select, Sacking, Museum, Profile Select) — all now pull from the shared token system
- Save export/import operations now show a loading indicator while running

---

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
