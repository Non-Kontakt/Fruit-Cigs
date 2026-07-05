# Contributing to Fruit Cigs

This guide is for AI agents working on this codebase. Follow these rules strictly.

## Team Structure

### Platforms
- **Primary**: Forgejo (self-hosted) at `http://localhost:3000` — all issues, PRs, and code review happen here
- **Deploy mirror**: GitHub — a launchd bridge polls Forgejo `main` and pushes to GitHub, which triggers the GitHub Pages deploy. Nobody pushes GitHub manually.
- **Public tunnel**: Cloudflare Tunnel exposes Forgejo for external agents (URL changes on restart)

### Roles
| Agent | Platform | Title | Role | Access |
|-------|----------|-------|------|--------|
| **Gadon** (onvx) | Human | Owner | Merges PRs, final approval, playtests, design decisions | Admin |
| **Calo** (calo-onvx) | Claude Code (local) | Lead Clanker | Primary developer — writes code, reviews subagent work, creates branches/PRs/issues | Full read/write (local) |
| **Bandon** (bandon-onvx) | Codex (sandboxed) | Snr Clanker | Code reviewer, idea interrogator — reads/writes on Forgejo via tunnel | Full read/write (via tunnel URL) |

> Trask (trask-onvx, Jnr Clanker) has retired from active duty. He lives on
> in the game as the unlockable player **Trask Ulgo** (`src/data/achievements.js`).

### Workflow
1. **Calo** creates a branch, makes changes (directly or via delegated subagents whose work Calo reviews), verifies, opens a PR on Forgejo
2. **Bandon** reviews on Forgejo (comments, feedback)
3. **Calo** addresses feedback and makes all code edits
4. **Owner** merges PRs — no one else merges
5. The deploy bridge ships merged `main` to GitHub Pages automatically

### What reviewers should NOT do
- Do not make code edits — all code changes go through Calo
- Do not merge PRs — only Owner merges

## Golden Rules

1. **Never push directly to `main`.** Always create a feature branch and open a PR.
2. **Never delete or overwrite files without understanding them first.** Read before you write.
3. **Full verification before opening a PR** (see Verification below). A change nobody ran is a change nobody verified.
4. **Keep changes focused.** One PR = one feature or fix. Don't bundle unrelated changes.
5. **Don't refactor code you weren't asked to touch.** No drive-by cleanups, no adding comments or types to unchanged code.
6. **No project history in source.** Issue numbers, phase labels, and reviewer names don't belong in code comments — they rot. Comments state constraints the code can't show.

## Verification

Every branch must pass all three before a PR opens:

```
npm run build        # production build, zero errors
npx vitest run       # full unit suite
npm run qa           # full Playwright suite (desktop + mobile projects)
```

**Pipe discipline:** a chain like `npm run qa | tail -2 && git push` does NOT
gate the push on the tests — the pipeline exits with `tail`'s status. Start
verification chains with `set -o pipefail`, and read complete output, not a
truncated tail.

### The QA harness (`qa/`)
- **Component fixtures** — `qa/fixtures/registry.js` (id/label/clickText metadata) + `qa/fixtures/components.jsx` (a RENDERERS map with an import-time drift assertion). Playwright loops every fixture across desktop and mobile viewports and screenshots each to `qa/.artifacts/screenshots/`. Fixtures freeze visual states that are painful to reach in-game.
- **Full-app flows** — `qa/tests/flows.spec.js` boots the real app (`index.html`) and drives it through the dev hook `window.__fc` (`newGame({teamName, tier})`, `getState()`, `setState()`, `dumpSave()`). Use flows for store→component wiring and save round-trips; use fixtures for visual states.
- The dev server is pinned to **port 5178** for QA. Kill stray servers before trusting a run — Playwright's `reuseExistingServer` will happily test someone else's checkout.
- After any merge, grep the tree for leftover conflict markers (`^<<<<<<<`) — build and vitest do NOT parse the QA fixture files, so markers there only surface in the Playwright run.

## Architecture

- **`src/App.jsx`** — the game root and by far the largest file. Most sensitive file in the repo; one bad edit = blank screen.
- **`src/components/`** — extracted components, one directory per game area (match/, arcs/, boot/, cup/, club/, league/, player/, gains/, season/, achievements/, charts/, ui/, transfer/)
- **`src/utils/`** — pure logic. Match engine (match.js), player generation (player.js), league/cup structure (league.js), achievements, save migrations (saveMigrations.js), stats (competitionStats.js), plus focused single-purpose modules (rivalries, seasonAwards, seasonPreview, scouting, backstory, headlines, bgmMoments, ...)
- **`src/data/`** — static data (leagues, leagueModifiers, formations, training, achievements, cigPacks, storyArcs, tokens, messages, tickets, ...)
- **`src/hooks/`** — the extracted game loop: useAdvanceWeek, useMatchResult, useSeasonFlow, useSaveGame, useTickets, useGainPopupHandler, plus useSettings/useDebug/useMobile/useLatestRef
- **`src/store/gameStore.js`** — the Zustand store; `serializeState`/`hydrateState` handle Set↔array conversion via `SET_FIELDS`

### Files ranked by risk (highest first)
1. `src/App.jsx` — everything connects here.
2. `src/utils/match.js` — match simulation engine. Changes here affect all game results.
3. `src/hooks/useSaveGame.js` + `src/utils/saveMigrations.js` — save/load and migrations. Bump the save `version` and add a tested migration whenever the shape of persisted state changes meaning (see `migrateSummerWeeksForAwards` for the pattern).
4. `src/utils/player.js` — player generation, OVR calculations, prestige scaling.
5. `src/utils/achievements.js` — achievement checks + unlockable player creation.
6. Everything else — lower risk but still read before editing.

## Patterns You Must Follow

### Ref/State Wrappers
Many state variables have a paired ref (e.g. `cup`/`cupRef`, `squad`/`squadRef`). The ref is read inside async callbacks (match simulation, holiday intervals) to avoid stale closures. **Do NOT remove refs or replace them with plain state reads inside callbacks.** `achievementUnlockWeeksRef` is synced manually at its set-sites (not via effect) because the save path reads it synchronously — that timing is load-bearing.

### Fresh-read hooks
`useAdvanceWeek`, `useMatchResult`, `useSeasonFlow`, `useGainPopupHandler`, and `useTickets` read all game state fresh via `useGameStore.getState()` on each call, per their header comments. Reads that follow a setState within the same flow are re-reading the freshly committed value **by design** — do not consolidate them into a single destructure.

### matchweekIndex is Derived
`matchweekIndex` is computed from `calendarIndex` + `seasonCalendar`. There is NO `setMatchweekIndex`. Do not create one. League objects may carry their own stale `matchweekIndex` — the store's derived value is the only source of truth.

### UI Tokens
All styling uses tokens from `src/data/tokens.js`:
- `FONT` — always use this, never inline the font string
- `C` — color palette (C.bg, C.text, C.green, C.red, etc.)
- `F` — font sizes (F.micro, F.xs, F.sm, F.md, F.lg, F.xl, F.h3, F.h2, F.hero)
- `BTN` — button presets (BTN.primary, BTN.danger, BTN.ghost, BTN.text, BTN.disabled) — use for clean fits; most game buttons are deliberately bespoke
- `MODAL` — modal presets (MODAL.backdrop, MODAL.box)

Do NOT introduce new color values or font sizes. Use existing tokens.

### Prestige System
OVR cap scales with prestige: `getOvrCap(prestigeLevel)` in `src/utils/player.js`. AI teams scale via `getPrestigeOffset()`. When adding features that involve OVR limits, always use `ovrCap` — never hardcode 20.

### Match Events
Every shot/chance event must have `side: "home" | "away"`. This is used for shot counting. Do not revert to text-based matching. Substitutions are narrative-only events — team strength is computed before subs are generated, and nothing recomputes it mid-match.

### Canonical stats
League-wide individual stats accumulate during simulation into `seasonLeagueStatsByTier` / `seasonCupStatsByCup` (`src/utils/competitionStats.js`) and roll into all-time stores at season end. Features that need "who leads the league in X" read these — never reconstruct from `playerSeasonStats`, which is player-squad-scoped.

## Common Mistakes to Avoid

### Missing prop threading
When a component is rendered in multiple places, ALL render sites must pass required props. Before finishing any change that adds a prop to a component, grep for `<ComponentName` across all of `src/` to find every render site.

### Import issues after extraction
Vite builds successfully even with wrong named imports (it just warns). After extracting or moving components, verify all named imports resolve correctly. Check the browser console — a blank screen usually means a missing import. Merges can also auto-produce **duplicate imports** (both sides added the same import at different lines) — the parse error only surfaces in the QA suite.

### Stale closures in intervals
Any function called from `setInterval` or `setTimeout` must use ref wrappers, not direct state/callback references. The interval captures the version from when it was created. Use `fnRef.current()` pattern.

### Silent try/catch in loops
Never swallow errors silently in interval-driven code. At minimum `console.warn`. Better: generate core output before risky formatting.

## Branch Naming

Prefix with type, include the issue number when one exists:
- `fix/9-cup-name-mismatch`
- `feat/8-training-onboarding`
- `chore/16-pr-template`

No issue? Use a short description: `fix/dropdown-dismiss`, `feat/league-modifiers-phase2`

## PR Description

Every PR must include:
1. What changed and why (root cause first, for fixes)
2. Which files were modified
3. How to test it (what to look for in-game)
4. Verification results (build + vitest + Playwright counts)
5. Labels: `bug`, `ux`, `feature`, or `chore` — apply to both the PR and any linked issues

## What NOT to Do

- Don't create new utility files unless the logic is genuinely new and pure — check if existing utils cover the need
- Don't add dependencies without explicit approval
- Don't modify `public/manifest.json`, `public/sw.js`, or `.github/workflows/` unless specifically asked
- Don't change persisted state shape without a save-version bump and a tested migration
- Don't add TypeScript, ESLint configs, or other tooling changes
- Don't rename existing files or restructure directories
- Don't add comments, docstrings, or type annotations to code you didn't change

## Commit Identity

Calo's commits end with:
```
Co-Authored-By: Calo <noreply@github.com>
```
