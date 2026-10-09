import { test, expect } from "@playwright/test";

async function resume(page) {
  await page.reload();
  await page.getByText("Lifecycle QA", { exact: true }).first().click();
  await page.getByText("Resume FC", { exact: false }).first().click();
  await page.waitForFunction(() => window.__fc?.getState().teamName === "Resume FC");
}
async function seed(page) {
  await page.goto("index.html");
  await page.waitForFunction(() => !!window.__fc);
  await page.evaluate(() => window.__fc.newGame({ teamName: "Resume FC", mode: "ironman" }));
  await page.waitForFunction(() => !!window.__fc.getState().league);
  await page.evaluate(async () => {
    const { ACHIEVEMENTS, PLAYER_UNLOCK_ACHIEVEMENTS } = await import("/Fruit-Cigs/src/data/achievements.js");
    const s = window.__fc.getState();
    window.__fc.setState({
      startingXI: s.squad.slice(0, 11).map(p => p.id), bench: s.squad.slice(11, 16).map(p => p.id),
      unlockedAchievements: new Set(ACHIEVEMENTS.filter(a => !PLAYER_UNLOCK_ACHIEVEMENTS.has(a.id)).map(a => a.id)),
      storyArcs: { ...s.storyArcs, _arcRewardV3: true },
    });
    await window.__fc.storage.set("fc-profiles", JSON.stringify([{ id: "qa-profile", name: "Lifecycle QA" }]));
    await window.__fc.storage.set("fc-profile-qa-profile", JSON.stringify({ id: "qa-profile", name: "Lifecycle QA", museum: [], unlockedAchievements: [] }));
    const save = { ...window.__fc.dumpSave(), instantMatch: true, trainingCardSpeed: "summary", soundEnabled: false, musicEnabled: false };
    await window.__fc.storage.setSave("fc-save-qa-profile-1", JSON.stringify(save));
  });
  await resume(page);
}
async function waitForDisk(page, field, value) {
  await expect.poll(() => page.evaluate(async ({ field, value }) => {
    const disk = await window.__fc.storage.getSave("fc-save-qa-profile-1");
    return JSON.stringify(JSON.parse(disk.value)[field]) === JSON.stringify(value);
  }, { field, value })).toBe(true);
}

test("reload resumes a rolled league result and settles its table exactly once", async ({ page }) => {
  await seed(page);
  await page.evaluate(() => {
    const s = window.__fc.getState();
    const index = s.seasonCalendar.findIndex(e => e.type === "league");
    window.__fc.setState({ calendarIndex: index, matchPending: true });
  });
  await page.getByRole("button", { name: /PLAY MATCH/ }).click();
  await page.waitForFunction(() => !!window.__fc.getState().matchResult);
  const before = await page.evaluate(() => {
    const s = window.__fc.getState();
    return { result: s.matchResult, pending: s.pendingLeague, total: s.totalMatches, calendar: s.calendarIndex };
  });
  expect(before.pending).not.toBeNull();
  await waitForDisk(page, "matchResult", before.result);
  await resume(page);
  expect(await page.evaluate(() => window.__fc.getState().matchResult)).toEqual(before.result);
  expect(await page.evaluate(() => window.__fc.getState().pendingLeague)).toEqual(before.pending);
  await page.getByRole("button", { name: /CONTINUE/ }).first().click();
  await page.waitForFunction(() => !window.__fc.getState().matchResult);
  expect(await page.evaluate(() => window.__fc.getState().totalMatches)).toBe(before.total + 1);
  expect(await page.evaluate(() => window.__fc.getState().league.table)).toEqual(before.pending.table);
  await waitForDisk(page, "matchResult", null);
  await resume(page);
  expect(await page.evaluate(() => window.__fc.getState().totalMatches)).toBe(before.total + 1);
  expect(await page.evaluate(() => window.__fc.getState().league.table)).toEqual(before.pending.table);
});

test("training reward claims survive reload and cannot increase totals twice", async ({ page }) => {
  await seed(page);
  // Inject a completed roll, not its effects: the real report and its real
  // dismissal/save handlers must apply this exact pending squad once.
  await page.evaluate(() => {
    const s = window.__fc.getState();
    const player = s.squad[0];
    const oldVal = player.attrs.pace;
    window.__fc.setState({ pendingSquad: s.squad.map(p => p.id === player.id ? { ...p, attrs: { ...p.attrs, pace: oldVal + 1 } } : p) });
    s.setGains({ improvements: [{ playerName: player.name, playerPosition: player.position, attr: "pace", oldVal, newVal: oldVal + 1 }], injuries: [], duos: [], progress: [] });
  });
  await page.waitForFunction(() => window.__fc.getState().gains?.revealedItems?.length === 1);
  const before = await page.evaluate(() => ({ gains: window.__fc.getState().gains, pending: window.__fc.getState().pendingSquad, total: window.__fc.getState().totalGains }));
  await waitForDisk(page, "gains", before.gains);
  await resume(page);
  await expect(page.getByRole("button", { name: /CONTINUE/ }).first()).toBeVisible();
  expect(await page.evaluate(() => window.__fc.getState().totalGains)).toBe(before.total);
  await page.getByRole("button", { name: /CONTINUE/ }).first().click();
  await page.waitForFunction(() => !window.__fc.getState().gains);
  expect(await page.evaluate(() => window.__fc.getState().squad[0].attrs)).toEqual(before.pending[0].attrs);
  expect(await page.evaluate(() => window.__fc.getState().pendingSquad)).toBeNull();
  await waitForDisk(page, "gains", null);
  await resume(page);
  expect(await page.evaluate(() => window.__fc.getState().totalGains)).toBe(before.total);
  expect(await page.evaluate(() => window.__fc.getState().squad[0].attrs)).toEqual(before.pending[0].attrs);
});

test("returning from holiday preserves a pending fixture", async ({ page }) => {
  await seed(page);
  await page.evaluate(() => window.__fc.setState({ isOnHoliday: true, matchPending: true }));
  await page.getByRole("button", { name: /RETURN FROM HOLIDAY/ }).click();
  expect(await page.evaluate(() => window.__fc.getState().isOnHoliday)).toBe(false);
  expect(await page.evaluate(() => window.__fc.getState().matchPending)).toBe(true);
  await expect(page.getByRole("button", { name: /PLAY MATCH/ })).toBeVisible();
});
