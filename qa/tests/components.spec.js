import { test, expect } from "@playwright/test";
import path from "node:path";
import { FIXTURES } from "../fixtures/registry.js";

const SHOT_DIR = path.resolve("qa/.artifacts/screenshots");

// Console noise that isn't a real defect in a headless, no-audio-device
// context. Anything matching these is dropped before we assert the fixture
// rendered cleanly.
const BENIGN = [
  /AudioContext/i, /audiocontext was not allowed/i, /\bTone\b/, /play\(\) (failed|request)/i,
  /user gesture/i, /autoplay/i,
];
const isBenign = (msg) => BENIGN.some(re => re.test(msg));

// Resource-load failures are only benign for assets we EXPECT to be absent
// under the dev server: the favicon and audio files (no audio device, tracks
// not served). A failed JS chunk, image, or stylesheet must fail the test.
const EXPECTED_MISSING_RESOURCE = /favicon|\.(mp3|ogg|wav|m4a)(\?|#|$)/i;

for (const fx of FIXTURES) {
  test(`component: ${fx.id}`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const text = m.text();
      if (/Failed to load resource/i.test(text)) {
        const url = m.location()?.url || "";
        if (EXPECTED_MISSING_RESOURCE.test(url) || EXPECTED_MISSING_RESOURCE.test(text)) return;
        errors.push(`${text} (${url || "unknown url"})`);
        return;
      }
      errors.push(text);
    });

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

// Hover-pause semantics are desktop-only (mirrors the mobile-only skips in
// flows.spec.js).
test("achievement toast auto-dismisses", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "hover/timer test — desktop only");
  await page.goto("qa.html?c=achievement-toast");
  await expect(page.getByText("Champion", { exact: true })).toBeVisible();
  await page.waitForTimeout(6500);
  await expect(page.getByText("TOAST DONE")).toBeVisible();
});

test("achievement toast pauses on hover", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "hover/timer test — desktop only");
  await page.goto("qa.html?c=achievement-toast");
  const name = page.getByText("Champion", { exact: true });
  await expect(name).toBeVisible();
  await name.hover();
  await page.waitForTimeout(6500);
  await expect(page.getByText("TOAST DONE")).not.toBeVisible();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(6000);
  await expect(page.getByText("TOAST DONE")).toBeVisible();
});
