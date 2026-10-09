const { defineConfig } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const python = ["../server/.venv/bin/python", "../.venv/bin/python"]
  .map(file => path.resolve(__dirname, file))
  .find(file => fs.existsSync(file)) || "python3";

module.exports = defineConfig({
  testDir: "./tests/browser",
  outputDir: "../runtime/browser-checks/results",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  workers: 2,
  reporter: [["list"], ["html", { outputFolder: "../runtime/browser-checks/report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:8765",
    locale: "de-DE",
    reducedMotion: "reduce",
    colorScheme: "light",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    command: `"${python}" ../server/bin/run_browser_checks.py`,
    url: "http://127.0.0.1:8765",
    reuseExistingServer: false,
    timeout: 120000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 10000 },
  },
});
