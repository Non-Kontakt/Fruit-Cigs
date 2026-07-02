import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/Fruit-Cigs/",
  build: {
    // Only the game entry ships to production. qa.html is a dev-only harness
    // and is intentionally excluded from the build so it never reaches Pages.
    rollupOptions: { input: "index.html" },
  },
  test: {
    environment: "node",
    // Scope vitest to the app's own unit tests so it never tries to execute
    // the Playwright specs under qa/ (which share the .spec.js suffix).
    include: ["src/**/*.{test,spec}.{js,jsx}"],
  },
});
