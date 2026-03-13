# Contributing to Jumpers for Goalposts

This guide is for AI agents working on this codebase. Follow these rules strictly.

## Team Structure (as of 13 March 2026)

### Platforms
- **Primary**: Forgejo (self-hosted) at `http://localhost:3000` — all issues, PRs, and code review happen here
- **Deploy mirror**: GitHub — `main` branch is pushed here to trigger GitHub Pages deployment
- **Public tunnel**: Cloudflare Tunnel exposes Forgejo for external agents (URL changes on restart)

### Roles
| Agent | Platform | Title | Role | Access |
|-------|----------|-------|------|--------|
| **Gadon** (onvx) | Human | Owner | Merges PRs, final approval, relays Trask's feedback | Admin |
| **Calo** (calo-onvx) | Claude Code (local) | Lead Clanker | Primary developer — writes code, creates branches/PRs/issues on Forgejo | Full read/write (local) |
| **Bandon** (bandon-onvx) | Codex (sandboxed) | Snr Clanker | Code reviewer, idea interrogator — reads/writes on Forgejo via tunnel | Full read/write (via tunnel URL) |
| **Trask** (trask-onvx) | Claude Desktop (sandboxed) | Jnr Clanker | Code reviewer, idea interrogator — reads Forgejo via tunnel, feedback relayed by Owner | Read-only (via tunnel URL) |

### Workflow
1. **Calo** creates a branch, makes changes, opens a PR on Forgejo
2. **Bandon** reviews directly on Forgejo (comments, approvals)
3. **Trask** reviews via tunnel, gives feedback to Owner who relays it to Forgejo
4. **Calo** addresses feedback, Owner merges, Calo pushes `main` to GitHub for deployment

### What Trask (Jnr Clanker) should NOT do
- Do not push code or create branches (sandbox blocked)
- All feedback goes through the Owner who posts it to Forgejo

## Golden Rules

1. **Never push directly to `main`.** Always create a feature branch and open a PR.
2. **Never delete or overwrite files without understanding them first.** Read before you write.
3. **Build must pass before opening a PR.** Run `npx --no vite build --mode development` and confirm zero errors.
4. **Keep changes focused.** One PR = one feature or fix. Don't bundle unrelated changes.
5. **Don't refactor code you weren't asked to touch.** No drive-by cleanups, no adding comments or types to unchanged code.

## Architecture

- **`src/App.jsx`** (~5,300 lines) — the game root. This is the most sensitive file. Be extremely careful editing it.
- **`src/components/`** — 24+ extracted components across subdirectories (match/, arcs/, boot/, cup/, club/, league/, player/, gains/, season/, achievements/, charts/, ui/, transfer/)
- **`src/utils/`** — pure logic (match simulation, player generation, calculations, achievements, arcs, transfers)
- **`src/data/`** — static data (leagues, formations, training, achievements, story arcs, tokens, nationalities)
- **`src/hooks/`** — React hooks (useSettings, useSaveGame, useDebug, useTickets)

### Files ranked by risk (highest first)
1. `src/App.jsx` — everything connects here. One bad edit = blank screen.
2. `src/utils/match.js` — match simulation engine. Changes here affect all game results.
3. `src/utils/player.js` — player generation, OVR calculations, prestige scaling.
4. `src/utils/achievements.js` — achievement checks + unlockable player creation.
5. Everything else — lower risk but still read before editing.

## Patterns You Must Follow

### Ref/State Wrappers
Many state variables have a paired ref (e.g. `cup`/`cupRef`, `squad`/`squadRef`, `league`/`leagueRef`). The ref is read inside async callbacks (match simulation, holiday intervals) to avoid stale closures. **Do NOT remove refs or replace them with plain state reads inside callbacks.**

### matchweekIndex is Derived
`matchweekIndex` is computed via `useMemo` from `calendarIndex` + `seasonCalendar`. There is NO `setMatchweekIndex`. Do not create one.

### UI Tokens
All styling uses tokens from `src/data/tokens.js`:
- `FONT` — always use this, never inline the font string
- `C` — color palette (C.bg, C.text, C.green, C.red, etc.)
- `F` — font sizes (F.micro, F.xs, F.sm, F.md, F.lg, F.xl, F.h3, F.h2, F.hero)
- `BTN` — button presets (BTN.primary, BTN.danger, BTN.ghost, BTN.disabled)
- `MODAL` — modal presets (MODAL.backdrop, MODAL.box)

Do NOT introduce new color values or font sizes. Use existing tokens.

### Prestige System
OVR cap scales with prestige: `getOvrCap(prestigeLevel) = 20 + prestigeLevel * 16`. AI teams scale via `getPrestigeOffset()`. Both are in `src/utils/player.js`. When adding features that involve OVR limits, always use `ovrCap` — never hardcode 20.

### Match Events
Every shot/chance event must have `side: "home" | "away"`. This is used for shot counting. Do not revert to text-based matching.

## Common Mistakes to Avoid

### Missing prop threading
When a component is rendered in multiple places, ALL render sites must pass required props. Before finishing any change that adds a prop to a component, grep for `<ComponentName` across all of `src/` to find every render site.

### Import issues after extraction
Vite builds successfully even with wrong named imports (it just warns). After extracting or moving components, verify all named imports resolve correctly. Check the browser console — a blank screen usually means a missing import.

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
1. What changed and why
2. Which files were modified
3. How to test it (what to look for in-game)
4. Build confirmation (`npx --no vite build --mode development` output)
5. Labels: `bug`, `ux`, `feature`, or `chore` — apply to both the PR and any linked issues

## What NOT to Do

- Don't create new utility files unless absolutely necessary — check if existing utils cover the need
- Don't add dependencies without explicit approval
- Don't modify `public/manifest.json`, `public/sw.js`, or `.github/workflows/` unless specifically asked
- Don't touch save/load logic in `src/hooks/useSaveGame.js` or profile logic in `src/utils/profile.js` without explicit direction
- Don't add TypeScript, ESLint configs, or other tooling changes
- Don't rename existing files or restructure directories
- Don't add comments, docstrings, or type annotations to code you didn't change

## Commit Identity

Calo's commits end with:
```
Co-Authored-By: Calo <noreply@github.com>
```
