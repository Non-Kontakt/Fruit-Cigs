import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./qa/release",
  outputDir: "qa/.artifacts/release",
  workers: 2,
  retries: 0,
  forbidOnly: !!process.env.CI,
  use: { baseURL: "http://localhost:5179/Fruit-Cigs/", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run preview -- --port 5179 --strictPort",
    url: "http://localhost:5179/Fruit-Cigs/",
    reuseExistingServer: false,
  },
});
