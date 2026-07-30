import { test, expect } from "@playwright/test";

// Visual regression suite — committed baselines, strict comparison.
//
// This is a deliberate safety net over the views where layout regressions
// have repeatedly reached review (see issues #443, #427, #425, #406, #401):
// a small, stable, high-value set — not a screenshot of every screen.
//
// Determinism rules (the whole suite is built around them):
// - Playwright's fake clock controls every timer. Live-match states are
//   parked at an exact minute; nothing captures while time can move.
// - Math.random is replaced with a seeded LCG via addInitScript for
//   full-app views, so generated squads/leagues are identical every run.
// - Animations are disabled and the caret hidden at capture time
//   (playwright.config.js expect.toHaveScreenshot).
// - Captures target the meaningful panel (or the viewport for fixed
//   overlays), never enormous full-page scrolls of dynamic content.
//
// Baselines: qa/baselines/<project>-<platform>/<name>.png — committed.
// Update ONLY via `npm run test:visual:update`, and review the image diffs
// like code. A failing test is a question, not a prompt to regenerate.

const T0 = new Date("2026-01-06T10:00:00.000Z");

// Test-side polling. In-page polling (waitForFunction's rAF/interval) stalls
// under a paused fake clock, so we poll from the driver with real time.
async function settleUntil(page, fn, { timeout = 15_000 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await page.evaluate(fn)) return;
    if (Date.now() > deadline) throw new Error(`settleUntil timed out: ${fn}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const fontsReady = () => document.fonts.check('12px "Press Start 2P"');

// Seeded LCG stand-in for Math.random — deterministic squad/league/name
// generation for full-app boots. Installed before any app module evaluates.
const SEEDED_RANDOM = `
  (() => {
    let s = 0xC0FFEE >>> 0;
    Math.random = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  })();
`;

// Mount a component fixture under a paused clock. Returns after fonts are
// loaded and the harness has rendered; time has not moved.
async function mountFixture(page, fixtureId) {
  await page.clock.install({ time: T0 });
  await page.clock.pauseAt(T0);
  await page.goto(`qa.html?c=${fixtureId}`);
  await page.waitForSelector("#qa-root > *", { timeout: 10_000 });
  await settleUntil(page, fontsReady);
}

// Boot the real app with seeded RNG under a running fake clock (boot needs
// rAF/timers), then freeze time once the world exists.
async function bootApp(page) {
  await page.addInitScript(SEEDED_RANDOM);
  await page.clock.install({ time: T0 });
  await page.goto("index.html");
  await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
  await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
  await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });
  await settleUntil(page, fontsReady);
  // Stop the clock, then deterministically flush anything still queued
  // (fade-ins, deferred reveals) so every run captures the same settled frame.
  await page.clock.pauseAt(new Date(T0.getTime() + 60_000));
  await page.clock.fastForward(5_000);
}

// ---------------------------------------------------------------------------
// Matchday — the #460 full-screen scene with MATCH | RATINGS views. Four
// baselines: each view, live and at full time. The MATCH frames protect the
// hero box + ledger composition; the RATINGS frames protect the redesigned
// list — and the full-time RATINGS baseline is the #455 acceptance evidence
// (visible player rows at 1440x900).
// ---------------------------------------------------------------------------

test("visual: matchday live — MATCH view at 45'", async ({ page }) => {
  await mountFixture(page, "matchday-live");
  // runFor (not fastForward): fastForward fires each timer at most once,
  // but the match minute needs its interval fired repeatedly. The extra
  // seconds let the commentary queue settle out of any goal lock.
  await page.clock.runFor(50_000);
  await expect(page).toHaveScreenshot("matchday-live.png");
});

test("visual: matchday live — RATINGS view", async ({ page }) => {
  await mountFixture(page, "matchday-live");
  await page.clock.runFor(50_000);
  await page.getByText("RATINGS", { exact: true }).click();
  await expect(page).toHaveScreenshot("matchday-live-ratings.png");
});

test("visual: matchday full time — MATCH view", async ({ page }) => {
  await mountFixture(page, "match-brace");
  await page.clock.fastForward(2_000);
  await expect(page).toHaveScreenshot("matchday-fulltime.png");
});

test("visual: matchday full time — RATINGS view (#455 evidence)", async ({ page }) => {
  await mountFixture(page, "match-brace");
  await page.clock.fastForward(2_000);
  await page.getByText("RATINGS", { exact: true }).click();
  await expect(page).toHaveScreenshot("matchday-fulltime-ratings.png");
});

// ---------------------------------------------------------------------------
// Panels — captured as elements so the whole panel is asserted, not a
// viewport-cropped slice of it
// ---------------------------------------------------------------------------

const PANELS = [
  { name: "corner-shop-packs", fixture: "pack-grid-sealed" },
  { name: "league-stats", fixture: "leaguestats-mid", clickText: "STATS" },
  { name: "cup-stats", fixture: "cup-totc", clickText: "TOTC" },
  { name: "player-compare", fixture: "player-compare" },
];

for (const p of PANELS) {
  test(`visual: ${p.name}`, async ({ page }) => {
    await mountFixture(page, p.fixture);
    if (p.clickText) {
      await page.getByText(p.clickText, { exact: false }).first().click();
    }
    await page.clock.fastForward(2_000);
    await expect(page.locator("#qa-root")).toHaveScreenshot(`${p.name}.png`);
  });
}

// ---------------------------------------------------------------------------
// Full app — dashboard, and the mobile navigation/header state
// ---------------------------------------------------------------------------

test("visual: dashboard", async ({ page }) => {
  await bootApp(page);
  await expect(page).toHaveScreenshot("dashboard.png");
});

test("visual: mobile navigation and header", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only view");
  await bootApp(page);
  // The nav grid + header live in the top band of the app on mobile
  // (issue #425 territory). Clip to that band so the assertion is about
  // the navigation state, not the dashboard content below it.
  await expect(page).toHaveScreenshot("mobile-nav-header.png", {
    clip: { x: 0, y: 0, width: 390, height: 430 },
  });
});
