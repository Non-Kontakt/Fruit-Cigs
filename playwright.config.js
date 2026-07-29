import { defineConfig } from "@playwright/test";

// Pinned dev-server port so the harness URL is deterministic (the plain
// `npm run dev` hops ports when 5173 is taken).
const PORT = 5178;
const BASE = `http://localhost:${PORT}/Fruit-Cigs/`;

export default defineConfig({
  testDir: "./qa/tests",
  // All Playwright output lives under qa/.artifacts (gitignored).
  outputDir: "./qa/.artifacts/test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "qa/.artifacts/report", open: "never" }],
  ],
  // Visual regression baselines are committed, one per project per platform.
  // The platform suffix is load-bearing: font rasterization differs between
  // macOS and Linux, so each platform owns its own baseline set rather than
  // sharing one and hiding the difference behind a fat diff threshold.
  snapshotPathTemplate: "qa/baselines/{projectName}-{platform}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      // Strict by design: zero differing pixels allowed. Animations are
      // frozen and the caret hidden at capture time so stillness is real,
      // not tolerated.
      maxDiffPixels: 0,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
