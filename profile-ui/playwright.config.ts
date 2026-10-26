import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    // Linux CI Chromium has classic 15px scrollbars; headless hides them by default.
    // Show them everywhere so local runs match CI.
    launchOptions: {
      ignoreDefaultArgs: ["--hide-scrollbars"],
      args: ["--disable-features=OverlayScrollbar,FluentOverlayScrollbar"],
    },
  },
  webServer: {
    command: process.env.PLAYWRIGHT_TEST_BUILD
      ? "npm run preview -- --host 127.0.0.1 --port 5173 --strictPort"
      : "npm run dev -- --host 127.0.0.1 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
