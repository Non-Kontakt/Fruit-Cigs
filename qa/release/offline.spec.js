import { test, expect } from "@playwright/test";

test("built game starts offline with its font and preserves profile data on ?reset", async ({ page, context }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("./");
  await expect(page.getByRole("button", { name: /NEW PROFILE/ })).toBeVisible();
  expect(await page.evaluate(() => window.__fc)).toBeUndefined();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    localStorage.setItem("release-test", "keep");
  });
  await page.getByRole("button", { name: /NEW PROFILE/ }).click();
  await page.getByPlaceholder("Enter name...").fill("Offline QA");
  await page.getByRole("button", { name: /CREATE PROFILE/ }).click();
  await expect(page.getByText("SELECT SAVE SLOT", { exact: true })).toBeVisible();

  await context.setOffline(true);
  await page.goto("./?reset");
  await expect(page.getByText("Offline QA", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('12px "Press Start 2P"'))).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("release-test"))).toBe("keep");
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  expect(errors).toEqual([]);
});

test("production settings have no debug cheats", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: /NEW PROFILE/ }).click();
  await page.getByPlaceholder("Enter name...").fill("Release QA");
  await page.getByRole("button", { name: /CREATE PROFILE/ }).click();
  await page.getByText("EMPTY SLOT", { exact: true }).first().click();
  await page.getByText("CASUAL", { exact: true }).click();
  await page.getByRole("button", { name: /CONFIRM CASUAL/ }).click();
  await page.getByPlaceholder("e.g. Brian Clough").fill("QA Manager");
  await page.getByRole("button", { name: /CONTINUE/ }).click();
  await page.getByPlaceholder("e.g. Denton FC").fill("Release FC");
  await page.getByRole("button", { name: /NEW GAME/ }).click();
  await page.getByRole("button", { name: /BOOT ROOM/ }).click();
  await page.getByRole("button", { name: /SETTINGS/ }).click();
  await expect(page.getByText("SAVE MANAGEMENT", { exact: false })).toBeVisible();
  await expect(page.getByText("Debug Tools", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /WIN LEAGUE/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.__fc)).toBeUndefined();
});
