import { test, expect } from "@playwright/test";

test("built game starts offline with its font and preserves profile data on ?reset", async ({ page, context }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("./");
  await expect(page.getByLabel("NAME YOUR CLUB")).toBeVisible();
  expect(await page.evaluate(() => window.__fc)).toBeUndefined();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    localStorage.setItem("release-test", "keep");
  });
  await page.getByLabel("NAME YOUR CLUB").fill("Offline FC");
  await page.getByText("YOUR MANAGER · OPTIONAL", { exact: true }).click();
  await page.getByLabel("NAME YOUR MANAGER").fill("Offline QA");
  await page.getByRole("button", { name: /NEW GAME/ }).click();
  await expect(page.getByRole("button", { name: /BOOT ROOM/ })).toBeVisible();

  await context.setOffline(true);
  await page.goto("./?reset");
  await expect(page.getByText("Offline QA", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const weight of [400, 700]) {
    expect(await page.evaluate(async weight => {
      const faces = await document.fonts.load(`${weight} 24px "Pixel Operator"`);
      return faces.length === 1 && faces[0].status === "loaded";
    }, weight)).toBe(true);
  }
  expect(await page.evaluate(() => localStorage.getItem("release-test"))).toBe("keep");
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  expect(errors).toEqual([]);
});

test("production settings have no debug cheats", async ({ page }) => {
  await page.goto("./");
  await page.getByPlaceholder("e.g. Denton FC").fill("Release FC");
  await page.getByRole("button", { name: /NEW GAME/ }).click();
  await page.getByRole("button", { name: /BOOT ROOM/ }).click();
  await page.getByRole("button", { name: /SETTINGS/ }).click();
  await expect(page.getByText("SAVE MANAGEMENT", { exact: false })).toBeVisible();
  await expect(page.getByText("ALWAYS ON", { exact: true })).toBeVisible();
  await expect(page.getByText("IRONMAN", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Debug Tools", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /WIN LEAGUE/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.__fc)).toBeUndefined();
});
