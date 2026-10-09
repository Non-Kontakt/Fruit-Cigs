import { expect, test } from "@playwright/test";

test("one form starts a real autosaved career without starter pack ceremonies", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("index.html");
  await expect(page.getByLabel("NAME YOUR CLUB")).toBeVisible();
  await expect(page.getByLabel("NAME YOUR MANAGER")).toBeHidden();
  await expect(page.getByText(/CASUAL|IRONMAN/)).toHaveCount(0);
  // Previously four reveals appeared if the player spent >3s on setup.
  await page.waitForTimeout(3500);
  await page.getByLabel("NAME YOUR CLUB").fill("Denton FC");
  await page.getByRole("button", { name: /NEW GAME/ }).click();
  await page.waitForFunction(() => !!window.__fc?.getState().league);
  await expect(page.getByRole("button", { name: /BOOT ROOM/ })).toBeVisible();
  const state = await page.evaluate(() => {
    const s = window.__fc.getState();
    return { mode: s.gameMode, team: s.teamName, manager: s.managerName, profile: s.activeProfileId, packs: [...s.unlockedPacks] };
  });
  expect(state).toMatchObject({ mode: "ironman", team: "Denton FC", manager: "Gaffer" });
  expect(state.packs).toHaveLength(4);
  await expect.poll(() => page.evaluate(async profile => {
    const save = await window.__fc.storage.getSave(`fc-save-${profile}-1`);
    return save ? JSON.parse(save.value).teamName : null;
  }, state.profile)).toBe("Denton FC");
  await expect(page.getByText("NEW PACK UNLOCKED", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.reload();
  await page.getByText("Gaffer", { exact: true }).click();
  await page.getByText("Denton FC", { exact: true }).click();
  await page.waitForFunction(() => window.__fc.getState().teamName === "Denton FC");
  expect(await page.evaluate(() => window.__fc.getState().gameMode)).toBe("ironman");
});

test("manager customisation is optional and stays on the club form", async ({ page }) => {
  await page.goto("index.html");
  await page.getByLabel("NAME YOUR CLUB").fill("Orchard FC");
  await page.getByText("YOUR MANAGER · OPTIONAL", { exact: true }).click();
  await page.getByLabel("NAME YOUR MANAGER").fill("Sarna");
  await page.getByRole("button", { name: "Next hair", exact: true }).click();
  await expect(page.getByLabel("NAME YOUR CLUB")).toHaveValue("Orchard FC");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: /NEW GAME/ }).click();
  await page.waitForFunction(() => window.__fc?.getState().managerName === "Sarna");
  expect(await page.evaluate(() => window.__fc.getState().managerAvatar)).toBeTruthy();
});

test("a failed first profile write leaves the club form available to retry", async ({ page }) => {
  await page.goto("index.html");
  await page.getByLabel("NAME YOUR CLUB").fill("Retry FC");
  await page.evaluate(() => {
    const storage = window.__fc.storage;
    const set = storage.set;
    storage.set = async (...args) => {
      storage.set = set;
      throw new Error("Storage temporarily unavailable");
    };
  });
  await page.getByRole("button", { name: /NEW GAME/ }).click();
  await expect(page.getByRole("alert")).toHaveText("Couldn't start your career. Please try again.");
  await expect(page.getByLabel("NAME YOUR CLUB")).toHaveValue("Retry FC");
  await expect(page.getByRole("button", { name: /NEW GAME/ })).toBeEnabled();
  await page.getByRole("button", { name: /NEW GAME/ }).click();
  await page.waitForFunction(() => window.__fc.getState().teamName === "Retry FC");
  expect(await page.evaluate(async () => JSON.parse((await window.__fc.storage.get("fc-profiles")).value).length)).toBe(1);
});

test("grouped toast keeps arrivals during dismissal for the next notice", async ({ page }) => {
  const now = new Date("2026-01-01T10:00:00Z");
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.goto("qa.html?c=achievement-batch");
  await page.clock.runFor(500);
  await expect(page.getByText("3 CIG CARDS UNLOCKED", { exact: true })).toBeVisible();
  const toast = page.getByTestId("achievement-toast");
  const box = await toast.boundingBox();
  expect(box.x).toBeLessThan(25);
  expect(box.y).toBeGreaterThan(page.viewportSize().height / 2);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width);
  await page.getByRole("button", { name: "Dismiss card notification" }).click();
  await page.getByRole("button", { name: "ADD LATE CARD" }).click();
  await page.clock.runFor(600);
  await expect(page.getByTestId("acknowledged-cards")).toHaveText("first_win,clean_sheet,champion");
  await expect(page.getByText("CIG CARD UNLOCKED", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dismiss card notification" }).click();
  await page.clock.runFor(500);
  await expect(toast).toHaveCount(0);
  await expect(page.getByTestId("acknowledged-cards")).toHaveText("first_win,clean_sheet,champion,season_10");
});

test("reduced-motion notifications pause while keyboard-focused", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("qa.html?c=achievement-batch");
  await page.getByRole("button", { name: "Dismiss card notification" }).focus();
  await page.waitForTimeout(6500);
  await expect(page.getByText("3 CIG CARDS UNLOCKED", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dismiss card notification" }).press("Enter");
  await expect(page.getByTestId("achievement-toast")).toHaveCount(0);
});
