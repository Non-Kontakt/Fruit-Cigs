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
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
