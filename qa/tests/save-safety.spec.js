import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function resume(page) {
  await page.reload();
  await page.getByText("Save QA", { exact: true }).first().click();
  await page.getByText("Save Test FC", { exact: false }).first().click();
  await page.waitForFunction(() => window.__fc?.getState().teamName === "Save Test FC");
}

test("failed save keeps the career open, exports live progress and can retry", async ({ page }, testInfo) => {
  await page.goto("index.html");
  await page.waitForFunction(() => !!window.__fc);
  await page.evaluate(() => window.__fc.newGame({ teamName: "Save Test FC" }));
  await page.waitForFunction(() => !!window.__fc.getState().league);
  await page.evaluate(async () => {
    const id = "qa-profile";
    await window.__fc.storage.set("fc-profiles", JSON.stringify([{ id, name: "Save QA" }]));
    await window.__fc.storage.set(`fc-profile-${id}`, JSON.stringify({
      id, name: "Save QA", unlockedAchievements: [], achievementDates: {}, museum: [],
    }));
    await window.__fc.storage.setSave(`fc-save-${id}-1`, JSON.stringify(window.__fc.dumpSave()));
  });
  await resume(page);
  await page.evaluate(() => {
    const s = window.__fc.getState();
    window.__fc.setState({ clubHistory: { ...s.clubHistory, totalWins: 0, totalLosses: 7 } });
    const original = window.__fc.storage.setSave;
    window.__restoreSave = () => { window.__fc.storage.setSave = original; };
    window.__fc.storage.setSave = async () => { throw new Error("QA: storage full"); };
  });
  await page.getByRole("button", { name: /BOOT ROOM/ }).click();
  await page.getByRole("button", { name: /SETTINGS/ }).click();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: /EXIT TO MENU/ }).click();
  await expect(page.getByRole("alert")).toContainText("Save failed");
  expect(await page.evaluate(() => window.__fc.getState().teamName)).toBe("Save Test FC");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "EXPORT CURRENT CAREER" }).click();
  const download = await downloadPromise;
  const exportedPath = testInfo.outputPath("recovered-career.json");
  await download.saveAs(exportedPath);
  expect(JSON.parse(await readFile(exportedPath, "utf8")).clubHistory.totalLosses).toBe(7);

  await page.evaluate(() => window.__restoreSave());
  await page.getByRole("button", { name: "RETRY SAVE" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /SAVED/ })).toBeVisible();
  await resume(page);
  expect(await page.evaluate(() => window.__fc.getState().clubHistory.totalLosses)).toBe(7);
});
