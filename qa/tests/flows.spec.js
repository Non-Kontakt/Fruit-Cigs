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

  test("squad page renders the full player list", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Navigate to the squad page via the real nav, like a player would.
    await page.getByText("SQUAD", { exact: false }).first().click();
    await page.waitForTimeout(400);

    // Auto-assign a lineup so the list shows the real XI/bench/reserve mix
    // a player actually manages, not a fresh unassigned roster.
    await page.getByText("ASST XI", { exact: false }).first().click();
    await page.waitForFunction(() => (window.__fc.getState().startingXI || []).length === 11, null, { timeout: 5_000 });
    await page.waitForTimeout(300);

    // Sanity: the roster actually rendered (a squad is 16+ players).
    const squadSize = await page.evaluate(() => window.__fc.getState().squad.length);
    expect(squadSize, "squad should be generated").toBeGreaterThanOrEqual(16);

    await shot(page, testInfo.project.name, "flow-squad-page");
  });

  test("mobile: section headers move the selected player", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "tap-to-move is a mobile interaction");
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });
    await page.getByText("SQUAD", { exact: false }).first().click();
    await page.getByText("ASST XI", { exact: false }).first().click();
    await page.waitForFunction(() => (window.__fc.getState().startingXI || []).length === 11, null, { timeout: 5_000 });
    await page.waitForTimeout(300);

    // Pick a bench player whose surname is unique in the squad — mobile rows
    // shorten first names, so the surname is the reliable tap target.
    const target = await page.evaluate(() => {
      const s = window.__fc.getState();
      const surname = (n) => n.split(" ").slice(1).join(" ");
      for (const id of s.bench) {
        const p = s.squad.find(pl => pl.id === id);
        if (p && s.squad.filter(o => surname(o.name) === surname(p.name)).length === 1) {
          return { id: p.id, surname: surname(p.name) };
        }
      }
      return null;
    });
    expect(target, "a bench player with a unique surname should exist").not.toBeNull();

    // Select them, then tap the RESERVES header — the move the selection
    // banner promises.
    await page.getByText(target.surname, { exact: false }).first().click();
    await page.waitForTimeout(200);
    await page.getByText("RESERVES", { exact: true }).first().click();
    await page.waitForTimeout(300);

    const after = await page.evaluate((id) => {
      const s = window.__fc.getState();
      return { onBench: s.bench.includes(id), inXI: s.startingXI.includes(id) };
    }, target.id);
    expect(after.onBench, "player should have left the bench").toBe(false);
    expect(after.inXI, "player should not have joined the XI").toBe(false);
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

  test("dashboard renders the latest back-page headline", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Leave state the way processMatchDone would: one played result plus the
    // generated back page for it. The masthead should print both.
    await page.evaluate(() => {
      const s = window.__fc.getState();
      window.__fc.setState({
        calendarResults: { 0: { playerGoals: 3, oppGoals: 0, won: true, draw: false } },
        latestHeadline: {
          category: "hattrick",
          headline: "HAT-TRICK HERO: ROBINSON FIRES RED LION FC PAST DOG & DUCK 3-0",
          byline: "— Trevor Ash reports",
          season: s.seasonNumber,
          calendarIndex: 0,
        },
      });
    });
    await page.waitForTimeout(300);

    await expect(page.getByText("HAT-TRICK HERO", { exact: false }).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Trevor Ash", { exact: false }).first()).toBeVisible();
    await shot(page, testInfo.project.name, "flow-dashboard-headline");

    // Staleness guard: a newer result lands via a path that doesn't generate
    // headlines (cup/holiday). The old back page must NOT stay up — the
    // masthead falls back to copy for the newest result.
    await page.evaluate(() => {
      const s = window.__fc.getState();
      window.__fc.setState({
        calendarResults: {
          ...s.calendarResults,
          1: { playerGoals: 0, oppGoals: 2, won: false, draw: false },
        },
      });
    });
    await page.waitForTimeout(300);
    await expect(page.getByText("HAT-TRICK HERO", { exact: false })).toHaveCount(0);
  });
});
