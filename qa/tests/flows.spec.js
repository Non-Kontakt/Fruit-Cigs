import { test, expect } from "@playwright/test";
import path from "node:path";

const SHOT_DIR = path.resolve("qa/.artifacts/screenshots");
const shot = (page, project, name) =>
  page.screenshot({ path: path.join(SHOT_DIR, project, `${name}.png`), fullPage: true });

// Boot the REAL app (index.html), not the component harness. These flows
// exercise the actual store → component wiring and the save serialize/hydrate
// round-trip — the integration coverage the isolated component harness can't
// give.

test.describe("full-app flows", () => {
  test("fresh new game wires up league + inbox", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });

    // Bootstrap a game via the dev hook (skips the new-game click-through).
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));

    // The init effect cascades league / cup / calendar / inbox off `teamName`.
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    const state = await page.evaluate(() => {
      const s = window.__fc.getState();
      return {
        teams: s.league?.teams?.length ?? 0,
        inbox: s.inboxMessages?.length ?? 0,
        calendar: s.seasonCalendar?.length ?? 0,
        tier: s.leagueTier,
      };
    });

    // Store-level assertions: the real init produced a coherent world.
    expect(state.teams, "league should have teams").toBeGreaterThan(1);
    expect(state.inbox, "inbox should be seeded").toBeGreaterThanOrEqual(3);
    expect(state.calendar, "season calendar should be built").toBeGreaterThan(0);

    await page.waitForTimeout(400);
    await shot(page, testInfo.project.name, "flow-fresh-newgame");
  });

  test("save round-trips through localStorage and resumes", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Capture the live save and seed a profile + slot into storage, exactly
    // like the game's own save/profile format.
    await page.evaluate(() => {
      const save = window.__fc.dumpSave();
      const id = "qa-profile";
      const now = new Date(0).toISOString();
      localStorage.setItem("jfg-profiles", JSON.stringify([{ id, name: "QA", createdAt: now }]));
      localStorage.setItem(`jfg-profile-${id}`, JSON.stringify({
        id, name: "QA", createdAt: now, schemaVersion: 1,
        unlockedAchievements: [], achievementDates: {}, ironmanCareers: 0,
        ironmanBest: null, lastIronmanVersion: 0, museum: [],
      }));
      localStorage.setItem(`jfg-save-${id}-1`, JSON.stringify(save));
    });

    // Reload into a cold app that must rediscover the seeded save.
    await page.reload();
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });

    // Profile is discoverable on the select screen.
    await expect(page.getByText("QA", { exact: true }).first()).toBeVisible({ timeout: 5_000 });
    await page.getByText("QA", { exact: true }).first().click();

    // scanProfileSlots parsed the injected save — its teamName shows on the slot.
    await expect(page.getByText("Red Lion FC", { exact: false }).first()).toBeVisible({ timeout: 5_000 });
    await shot(page, testInfo.project.name, "flow-resume-slot");

    // Resume it and confirm the store hydrated from the injected blob.
    await page.getByText("Red Lion FC", { exact: false }).first().click();
    await page.waitForFunction(() => window.__fc.getState().teamName === "Red Lion FC", null, { timeout: 10_000 });
    const resumed = await page.evaluate(() => window.__fc.getState().league != null);
    expect(resumed, "league should hydrate from the injected save").toBe(true);
  });

  test("mobile: selecting a squad player does not shift the list", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only");

    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Navigate to the squad page via the real nav, like a player would.
    await page.getByText("SQUAD", { exact: false }).first().click();
    await page.waitForTimeout(400);

    // Names are shortened on mobile (displayName), so match on the surname —
    // it survives the abbreviation either way.
    const surname = await page.evaluate(() => {
      const name = window.__fc.getState().squad[5].name;
      return name.split(" ").pop();
    });

    // Exclude the "selected" banner, which echoes the same player's full
    // name once tapped and would otherwise steal the .first() match.
    const row = page.getByText(surname, { exact: false }).filter({ hasNotText: "selected" }).first();
    await expect(row).toBeVisible({ timeout: 5_000 });

    const before = await row.boundingBox();
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await row.click();
    await page.waitForTimeout(300);

    const after = await row.boundingBox();
    const scrollAfter = await page.evaluate(() => window.scrollY);

    expect(Math.abs(after.y - before.y), "row should not shift vertically on selection").toBeLessThan(2);
    expect(Math.abs(scrollAfter - scrollBefore), "page should not scroll on selection").toBeLessThan(2);
  });
});
