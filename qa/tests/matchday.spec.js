import { test, expect } from "@playwright/test";

// Integration coverage for the #460 commentary box, driven deterministically
// with Playwright's fake clock against the component-harness match fixtures
// (1000ms per match minute at speed 1).

const T0 = new Date("2026-01-06T10:00:00.000Z");

async function settleFonts(page) {
  const deadline = Date.now() + 15_000;
  for (;;) {
    if (await page.evaluate(() => document.fonts.check('12px "Press Start 2P"'))) return;
    if (Date.now() > deadline) throw new Error("fonts never settled");
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function mountMatch(page, fixtureId) {
  await page.clock.install({ time: T0 });
  await page.clock.pauseAt(T0);
  await page.goto(`qa.html?c=${fixtureId}`);
  await page.waitForSelector("#qa-root > *", { timeout: 10_000 });
  await settleFonts(page);
}

// Mobile omits the assist from the scorer line by design.
const scorerLineFor = (project) =>
  project === "mobile" ? "⚽ Nathan Robinson 28'" : "⚽ Nathan Robinson 28' (Alfie Wilson)";

test.describe("matchday commentary box (#460)", () => {
  test("live match: box narrates, goal locks then shows the scorer line, no feed anywhere", async ({ page }, testInfo) => {
    await mountMatch(page, "matchday-live");

    // The box opens neutral.
    await expect(page.getByText("We're underway.", { exact: true })).toBeVisible();
    // The old tabbed feed is gone.
    await expect(page.getByText("FEED", { exact: true })).toHaveCount(0);

    // Ride to the 28' goal; freeze mid-lock (lock lasts 1080ms after it).
    await page.clock.runFor(28_300);
    await expect(page.getByText("GOAL FOR RED LION FC!", { exact: true })).toBeVisible();

    // The lock resolves into the structured scorer line, not the feed text.
    await page.clock.runFor(1_500);
    await expect(page.getByText(scorerLineFor(testInfo.project.name), { exact: true })).toBeVisible();

    // Ratings are permanently on screen while the match runs.
    await expect(page.getByText("RATINGS", { exact: true })).toBeVisible();
  });

  test("full time: durable queue drains before CONTINUE appears", async ({ page }) => {
    await mountMatch(page, "matchday-live");
    // To 90' — the fulltime event enters the durable queue at the whistle.
    await page.clock.runFor(90_500);
    // Immediately at the whistle, durable narration can still be owed.
    // After the holds drain, CONTINUE must be available.
    await page.clock.runFor(6_000);
    await expect(page.getByText("CONTINUE ▶", { exact: true })).toBeVisible();
    // And the feed never came back at full time.
    await expect(page.getByText("FEED", { exact: true })).toHaveCount(0);
  });

  test("instant match renders a settled terminal state", async ({ page }) => {
    await mountMatch(page, "match-brace");
    await page.clock.fastForward(2_000);
    await expect(page.getByText("Full time.", { exact: true })).toBeVisible();
    await expect(page.getByText("CONTINUE ▶", { exact: true })).toBeVisible();
    await expect(page.getByText("RATINGS", { exact: true })).toBeVisible();
    await expect(page.getByText("FEED", { exact: true })).toHaveCount(0);
  });

  test("reduced motion: the goal lock still shows its copy (steady, no strobe)", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mountMatch(page, "matchday-live");
    await page.clock.runFor(28_300);
    await expect(page.getByText("GOAL FOR RED LION FC!", { exact: true })).toBeVisible();
    await page.clock.runFor(1_500);
    await expect(page.getByText(scorerLineFor(testInfo.project.name), { exact: true })).toBeVisible();
  });
});
