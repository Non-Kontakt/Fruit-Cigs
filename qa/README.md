# QA visual + behavioural harness

Playwright-driven screenshots and integration checks so UI changes can be
seen and validated **before** a human has to play through the game and
screenshot it by hand.

## Run it

```bash
npm run qa            # every fixture + flow, desktop + mobile
npm run qa:desktop    # desktop viewport only
npm run qa:mobile     # mobile viewport only
npm run qa:report     # open the last HTML report
```

Playwright boots the dev server itself (pinned to port **5178**), so nothing
needs to be running first. Output lands in `qa/.artifacts/` (gitignored):

- `qa/.artifacts/screenshots/<desktop|mobile>/<name>.png` — the images
- `qa/.artifacts/report/` — HTML report (traces on failure)

## Two layers

### 1. Component harness (`qa/tests/components.spec.js`)
Mounts one game component in isolation with deterministic mock props, one
fixture per hard-to-reach visual state — a striker's brace, duplicate
surnames, a specific inbox message, the league stats tab mid-season. Fast,
deterministic, no game-playing.

- Fixtures live in `qa/fixtures/components.jsx` (the JSX renderers) and
  `qa/fixtures/registry.js` (plain id/label list the Node spec imports).
- Browse them by hand: `npm run dev`, open
  `http://localhost:5173/Fruit-Cigs/qa.html` for an index, or
  `…/qa.html?c=<fixtureId>` for one.
- Add a fixture: append an entry to both files. A `clickText` in the
  registry makes the spec click a tab/button before the screenshot.

### 2. Full-app flows (`qa/tests/flows.spec.js`)
Boots the **real** app and exercises store → component wiring and the save
serialize/hydrate round-trip — coverage the isolated harness can't give.
Uses the dev hook `window.__fc` (see `src/devHooks.js`) to bootstrap a game
without clicking through the new-game UI, and to dump/inject saves.

`window.__fc` is gated on `import.meta.env.DEV`, so it's stripped from the
production Pages build — real players never see it.

## How we use it in the review loop

1. Make a UI change.
2. `npm run qa` → eyeball the screenshots + read any failures.
3. Anything off gets flagged (with the screenshot) for a fix decision
   before it reaches a human or a PR.

Screenshots are the primary "find issues" artifact today. Behavioural
assertions (colour/tone/text checks) get added per area as specific bug
classes come up — the harness is the place they live.
