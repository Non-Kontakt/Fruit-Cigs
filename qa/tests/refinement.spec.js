import { test, expect } from "@playwright/test";

test("dashboard shortcuts reach the existing training, arcs and focus controls", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("index.html");
  await page.waitForFunction(() => !!window.__fc);
  await page.evaluate(() => window.__fc.newGame({ teamName: "Orchard FC" }));
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("button")).toHaveCount(8);
  if (testInfo.project.name === "mobile") {
    const transfers = nav.getByRole("button", { name: /TRANSFERS/ }).locator("span").last();
    expect(await transfers.evaluate(el => el.getBoundingClientRect().height < 20)).toBe(true);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `qa/.artifacts/refinement/${testInfo.project.name}-home.png`, fullPage: true });

  const before = await page.evaluate(() => window.__fc.getState().squad.map(p => p.training));
  await page.getByRole("button", { name: /^TRAINING >/ }).click();
  await expect(page.getByRole("button", { name: "TRAIN ALL ▾" })).toBeFocused();
  expect(await page.evaluate(() => window.__fc.getState().squad.map(p => p.training))).toEqual(before);
  await page.keyboard.press("Escape");
  await nav.getByRole("button", { name: /HOME/ }).click();

  await page.getByRole("button", { name: /^ARCS >/ }).click();
  await expect(page.getByText("STORY ARCS", { exact: false }).first()).toBeVisible();
  await page.screenshot({ path: `qa/.artifacts/refinement/${testInfo.project.name}-arcs.png`, fullPage: true });
  await page.getByRole("button", { name: /INBOX/ }).click();
  await page.screenshot({ path: `qa/.artifacts/refinement/${testInfo.project.name}-inbox.png`, fullPage: true });
  await nav.getByRole("button", { name: /HOME/ }).click();

  await page.getByRole("button", { name: /^CLUB FOCUS >/ }).click();
  const root = page.getByTestId("focus-node-new_bibs");
  await expect(root).toBeEnabled();
  await expect(page.locator('[data-state="locked"]').first()).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `qa/.artifacts/refinement/${testInfo.project.name}-focus.png` });
  await root.click();
  await page.getByRole("button", { name: "START", exact: true }).click();
  await expect(root).toHaveAttribute("data-state", "active");
  await page.getByRole("button", { name: /CLOSE/ }).click();
  await nav.getByRole("button", { name: /HOME/ }).click();
  await expect(page.getByRole("button", { name: /^CLUB FOCUS >/ })).toContainText("New Bibs");
  await nav.getByRole("button", { name: /CLUB/, exact: false }).click();
  await expect(root).toHaveCount(0); // Regular Club navigation must not reopen the focus overlay.
  expect(errors).toEqual([]);
});

test("pack ceremony has keyboard dismissal and reduced motion does not animate", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("qa.html?c=pack-reveal-banked");
  await page.clock.fastForward(2000);
  const button = page.getByRole("button", { name: "CONTINUE", exact: true });
  await expect(button).toBeVisible();
  await button.focus();
  await page.clock.fastForward(11000);
  await expect(button).toBeVisible();
  const animations = await page.locator("#qa-root").evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === "running").length);
  expect(animations).toBe(0);
  await page.screenshot({ path: `qa/.artifacts/refinement/${testInfo.project.name}-pack.png` });
  await button.press("Enter");
  await page.clock.fastForward(500);
  await expect(page.getByText("REVEAL DONE", { exact: true })).toBeVisible();
});

test("match commentary stays pixel-led and ratings use readable supporting type", async ({ page }, testInfo) => {
  await page.goto("qa.html?c=matchday-live");
  const box = page.getByTestId("commentary-box");
  await expect(box).toBeVisible();
  expect(await box.evaluate(el => getComputedStyle(el).fontFamily)).toContain("Pixel Operator");
  expect((await box.boundingBox()).height).toBeGreaterThanOrEqual(112);
  await page.getByRole("button", { name: "RATINGS", exact: true }).click();
  const player = page.getByRole("button", { name: /Vaughan/ }).first();
  await expect(player).toBeVisible();
  expect(await player.evaluate(el => getComputedStyle(el).fontFamily)).toContain("Pixel Operator");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `qa/.artifacts/refinement/${testInfo.project.name}-ratings.png` });
});
