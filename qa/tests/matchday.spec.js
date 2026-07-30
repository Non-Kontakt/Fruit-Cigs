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

// Bounded virtual-time stepping: advance the fake clock in small chunks
// until a condition holds. Deterministic in outcome; immune to sub-second
// skew from fonts/audio readiness.
const stepUntil = async (page, locator, { steps = 120, chunk = 400 } = {}) => {
  for (let i = 0; i < steps; i++) {
    if (await locator.count() > 0) return true;
    await page.clock.runFor(chunk);
  }
  return false;
};

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

    // Ride to the 28' goal (bounded stepping — parallel-load skew must not
    // matter, only that the lock arrives).
    await page.clock.runFor(27_000);
    const lock = page.getByText("GOAL FOR RED LION FC!", { exact: true });
    expect(await stepUntil(page, lock)).toBe(true);
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
    await page.clock.runFor(90_500);   // ~90' plus protected pauses en route
    expect(await stepUntil(page, page.getByText("CONTINUE ▶", { exact: true }))).toBe(true);
    // And the feed never came back at full time.
    await expect(page.getByText("FEED", { exact: true })).toHaveCount(0);
  });

  test("key events mode: the whistle never outruns the narration (#462)", async ({ page }) => {
    await mountMatch(page, "matchday-key");
    // Dense protected narration far beyond the old 13.5s highlights budget.
    expect(await stepUntil(page, page.getByText("FULL TIME", { exact: false }), { steps: 240, chunk: 400 })).toBe(true);
    // From the moment the scoreboard says FULL TIME, no earlier-minute event
    // may ever appear in the box — only the 90' terminal group.
    const stale = ["Substitution for Yeralden", "goes into the book", "booked for a late one", "Red card!", "Yellow card"];
    for (let i = 0; i < 30; i++) {
      for (const text of stale) {
        expect(await page.getByText(text, { exact: false }).count(), `stale after FT: ${text}`).toBe(0);
      }
      if (await page.getByText("CONTINUE ▶", { exact: true }).count() > 0) break;
      await page.clock.runFor(400);
    }
    await expect(page.getByText("CONTINUE ▶", { exact: true })).toBeVisible();
  });

  test("the minute freezes for a goal's whole presentation, then resumes (#462)", async ({ page }) => {
    await mountMatch(page, "matchday-live");
    // Only coalescable lines before 28': the clock must run right through
    // them — 20 virtual seconds is exactly 20 minutes.
    await page.clock.runFor(20_000);
    await expect(page.getByText("20'", { exact: false })).toBeVisible();
    // Ride into the 28' goal lock.
    expect(await stepUntil(page, page.getByText("GOAL FOR RED LION FC!", { exact: true }))).toBe(true);
    const readMinute = () => page.evaluate(() => document.body.innerText.match(/(\d+)'/)?.[1]);
    const during = await readMinute();
    // Mid-presentation (follow-up prose), the minute has not moved.
    await page.clock.runFor(1_200);
    expect(await readMinute()).toBe(during);
    // After the presentation drains, play resumes (bounded: the very next
    // goal at 31' can re-freeze the clock, so we only require the minute to
    // move at all, not a fixed distance).
    let resumed = during;
    for (let i = 0; i < 20 && resumed === during; i++) {
      await page.clock.runFor(500);
      resumed = await readMinute();
    }
    expect(Number(resumed)).toBeGreaterThan(Number(during));
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
    await page.clock.runFor(91_200);   // ~90' plus the two goals' protected pauses
    expect(await stepUntil(page, page.getByText("PENALTY SHOOTOUT", { exact: false }))).toBe(true);

    // Serialized shootout (#462): every kick presents exactly once, in
    // order, each starting only after the previous protected presentation
    // finished. Assert the full sequence.
    for (const copy of [
      "GOAL FOR RED LION FC!",             // Adams' kick locks
      "Adams scores from the spot.",
      "Doherty misses from the spot.",
      "Robinson scores from the spot.",
      "Palmer scores from the spot.",
      "Bennett scores from the spot.",
      "Grant misses from the spot.",
    ]) {
      expect(await stepUntil(page, page.getByText(copy, { exact: true })), copy).toBe(true);
    }
    // While the final durable still holds the box, CONTINUE waits.
    await expect(page.getByText("CONTINUE ▶", { exact: true })).toHaveCount(0);
    // Then the shootout terminator fires (one more serialized step) and the
    // drain completes.
    expect(await stepUntil(page, page.getByText("CONTINUE ▶", { exact: true }))).toBe(true);
  });

  test("the shootout scene waits for terminal narration to drain (#462)", async ({ page }) => {
    await mountMatch(page, "matchday-pens");
    await page.clock.runFor(88_000);
    // Step through the whistle and the terminal drain: any frame where the
    // box still presents the FT line must have no shootout header; the
    // shootout may only exist after that narration finished.
    let sawShootout = false;
    for (let i = 0; i < 120 && !sawShootout; i++) {
      const terminalShowing = await page.getByText("Full time! The referee blows the whistle.", { exact: true }).count();
      const shootout = await page.getByText("PENALTY SHOOTOUT", { exact: false }).count();
      if (terminalShowing > 0) {
        expect(shootout, "shootout scene began during terminal narration").toBe(0);
      }
      sawShootout = shootout > 0;
      await page.clock.runFor(400);
    }
    expect(sawShootout).toBe(true);
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
    expect(await stepUntil(page, page.getByText("Full time! The referee blows the whistle.", { exact: true }))).toBe(true);
    expect(await stepUntil(page, page.getByText("CONTINUE ▶", { exact: true }))).toBe(true);
  });

  test("mobile: the final whistle causes zero layout shift", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only");
    await mountMatch(page, "matchday-live");
    await page.clock.runFor(85_000);
    const before = await page.getByText("Concrete Schoolyard", { exact: false }).boundingBox();
    expect(await stepUntil(page, page.getByText("CONTINUE ▶", { exact: true }))).toBe(true);
    const after = await page.getByText("Concrete Schoolyard", { exact: false }).boundingBox();
    // Sub-pixel text-metric rounding is not a layout shift; a real shift
    // (the 50px utility band collapsing) would move this by tens of pixels.
    expect(Math.abs(after.y - before.y)).toBeLessThan(1);
  });

  test("reduced motion: the goal lock still shows its copy (steady, no strobe)", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mountMatch(page, "matchday-live");
    await page.clock.runFor(27_000);
    expect(await stepUntil(page, page.getByText("GOAL FOR RED LION FC!", { exact: true }))).toBe(true);
    await page.clock.runFor(1_500);
    await expect(page.getByText(goalProseFor(testInfo.project.name), { exact: true })).toBeVisible();
  });
});
