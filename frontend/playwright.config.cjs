const { defineConfig } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const localPython = path.resolve(__dirname, "../server/.venv/bin/python");
const python = fs.existsSync(localPython) ? localPython : "python3";

module.exports = defineConfig({
  testDir: "./tests/browser",
  outputDir: "../runtime/browser-checks/results",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
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
    command: `"${python}" ../scripts/run_browser_checks.py`,
    url: "http://127.0.0.1:8765",
    reuseExistingServer: false,
    timeout: 120000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 10000 },
  },
});
