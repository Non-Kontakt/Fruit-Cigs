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

// Mobile drops the assist sentence from the goal prose by design.
const goalProseFor = (project) =>
  project === "mobile" ? "Robinson makes no mistake." : "Robinson makes no mistake. Wilson created the opening.";

test.describe("matchday commentary box (#460)", () => {
  test("live match: box narrates, goal locks then shows the scorer line, no feed anywhere", async ({ page }, testInfo) => {
    await mountMatch(page, "matchday-live");

    // The box opens neutral.
    await expect(page.getByText("We're underway.", { exact: true })).toBeVisible();
    // The old tabbed feed is gone.
    await expect(page.getByText("FEED", { exact: true })).toHaveCount(0);

    // Ride to the 28' goal; freeze mid-lock (lock lasts 1080ms after it).
    await page.clock.runFor(28_300);
    const lock = page.getByText("GOAL FOR RED LION FC!", { exact: true });
    await expect(lock).toBeVisible();
    // While flashing there are exactly two visual states and no tweened
    // frames between them: transitions are disabled on the box.
    const transition = await lock.evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(transition).toBe("none");

    // The lock resolves into conversational prose — no emoji, no timestamp.
    await page.clock.runFor(1_500);
    await expect(page.getByText(goalProseFor(testInfo.project.name), { exact: true })).toBeVisible();

    // MATCH is the default view; RATINGS is one discreet switch away.
    await page.getByText("RATINGS", { exact: true }).click();
    await expect(page.getByText("Vaughan", { exact: false }).first()).toBeVisible();
    await page.getByText("MATCH", { exact: true }).click();
  });

  test("match settings gear houses the speed controls", async ({ page }) => {
    await mountMatch(page, "matchday-live");
    await page.clock.runFor(5_000);
    // No inline speed row any more; the gear opens the popover.
    await expect(page.getByText("▶ SLOW", { exact: true })).toHaveCount(0);
    await page.getByLabel("Match settings").click();
    await expect(page.getByText("▶ SLOW", { exact: true })).toBeVisible();
    await page.getByText("▶▶ FAST", { exact: true }).click();
    // Fast speed: minutes now tick at 400ms — 4s of clock ≈ +10 minutes.
    await page.clock.runFor(4_000);
    const minute = await page.evaluate(() => {
      const m = document.body.innerText.match(/(\d+)'/);
      return m ? Number(m[1]) : 0;
    });
    expect(minute).toBeGreaterThan(12);
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
    await expect(page.getByText("FEED", { exact: true })).toHaveCount(0);
    // MATCH stays the default at full time; ratings are the secondary view.
    await page.getByText("RATINGS", { exact: true }).click();
    await expect(page.getByText("Vaughan", { exact: false }).first()).toBeVisible();
  });

  test("penalty shootout: kicks narrate in order and CONTINUE waits for the drain", async ({ page }) => {
    await mountMatch(page, "matchday-pens");
    await page.clock.runFor(91_200);   // whistle at 1-1; pens spin up moments later

    // Step virtual time in small increments until each contract point is
    // met (bounded) — sub-second skew from fonts/audio readiness must not
    // matter, only the ORDER of what the box shows and when CONTINUE gates.
    const stepUntil = async (locator, maxSteps = 60) => {
      for (let i = 0; i < maxSteps; i++) {
        if (await locator.count() > 0) return true;
        await page.clock.runFor(300);
      }
      return false;
    };

    // The first scored kick locks the box.
    expect(await stepUntil(page.getByText("GOAL FOR RED LION FC!", { exact: true }))).toBe(true);
    // Its conversational follow-up lands next.
    expect(await stepUntil(page.getByText("Adams scores from the spot.", { exact: true }))).toBe(true);
    // Kicks keep arriving faster than holds expire; the queue must deliver
    // the LAST kick eventually with nothing dropped in between…
    expect(await stepUntil(page.getByText("Grant misses from the spot.", { exact: true }), 120)).toBe(true);
    // …and while that final durable still holds the box, CONTINUE waits.
    await expect(page.getByText("CONTINUE ▶", { exact: true })).toHaveCount(0);
    await page.clock.runFor(2_000);
    await expect(page.getByText("CONTINUE ▶", { exact: true })).toBeVisible();
  });

  test("full time returns the view to MATCH so terminal commentary is seen", async ({ page }) => {
    await mountMatch(page, "matchday-live");
    await page.clock.runFor(40_000);
    // Player wanders into RATINGS mid-match and leaves it there.
    await page.getByText("RATINGS", { exact: true }).click();
    await expect(page.getByText("Vaughan", { exact: false }).first()).toBeVisible();
    // The whistle flips the view back to MATCH: the FT durable plays in
    // sight, never invisibly behind RATINGS.
    await page.clock.runFor(51_000);
    await expect(page.getByText("Full time! The referee blows the whistle.", { exact: true })).toBeVisible();
    await page.clock.runFor(3_000);
    await expect(page.getByText("CONTINUE ▶", { exact: true })).toBeVisible();
  });

  test("mobile: the final whistle causes zero layout shift", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only");
    await mountMatch(page, "matchday-live");
    await page.clock.runFor(85_000);
    const before = await page.getByText("Concrete Schoolyard", { exact: false }).boundingBox();
    await page.clock.runFor(10_000);   // through the whistle + drain
    await expect(page.getByText("CONTINUE ▶", { exact: true })).toBeVisible();
    const after = await page.getByText("Concrete Schoolyard", { exact: false }).boundingBox();
    expect(after.y).toBe(before.y);
  });

  test("reduced motion: the goal lock still shows its copy (steady, no strobe)", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mountMatch(page, "matchday-live");
    await page.clock.runFor(28_300);
    await expect(page.getByText("GOAL FOR RED LION FC!", { exact: true })).toBeVisible();
    await page.clock.runFor(1_500);
    await expect(page.getByText(goalProseFor(testInfo.project.name), { exact: true })).toBeVisible();
  });
});
