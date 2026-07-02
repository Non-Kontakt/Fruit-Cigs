import { test, expect } from "@playwright/test";
import path from "node:path";
import { FIXTURES } from "../fixtures/registry.js";

const SHOT_DIR = path.resolve("qa/.artifacts/screenshots");

// Console noise that isn't a real defect in a headless, no-audio-device,
// no-network context. Anything matching these is dropped before we assert
// the fixture rendered cleanly.
const BENIGN = [
  /AudioContext/i, /audiocontext was not allowed/i, /\bTone\b/, /play\(\) (failed|request)/i,
  /user gesture/i, /autoplay/i, /Failed to load resource/i, /favicon/i,
];
const isBenign = (msg) => BENIGN.some(re => re.test(msg));

for (const fx of FIXTURES) {
  test(`component: ${fx.id}`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

    await page.goto(`qa.html?c=${fx.id}`);
    // Wait for the harness to mount the fixture.
    await page.waitForSelector("#qa-root > *", { timeout: 10_000 });

    // Optional sub-navigation (e.g. click the STATS tab on LeaguePage).
    if (fx.clickText) {
      await page.getByText(fx.clickText, { exact: false }).first().click();
    }

    // Let fade-ins / deferred timeouts settle (MatchResultScreen reveals ~50ms).
    await page.waitForTimeout(450);

    await page.screenshot({
      path: path.join(SHOT_DIR, testInfo.project.name, `${fx.id}.png`),
      fullPage: true,
    });

    const real = errors.filter((e) => !isBenign(e));
    expect(real, `console/page errors in ${fx.id}:\n${real.join("\n")}`).toEqual([]);
  });
}
