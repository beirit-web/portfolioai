const { defineConfig } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const python = ["../apps/portfolio-demos/sprachdienstleistungen/.venv/bin/python", "../server/.venv/bin/python"]
  .map(file => path.resolve(__dirname, file)).find(file => fs.existsSync(file)) || "python3";

module.exports = defineConfig({
  testDir: "./tests/vokabelbox",
  outputDir: "../runtime/vokabelbox-checks/results",
  timeout: 45000,
  expect: { timeout: 10000 },
  workers: 2,
  use: { baseURL: "http://127.0.0.1:8766", locale: "de-DE", reducedMotion: "reduce", screenshot: "only-on-failure" },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    command: `"${python}" ../apps/portfolio-demos/sprachdienstleistungen/bin/run_browser_checks.py`,
    url: "http://127.0.0.1:8766/vokabelbox/",
    timeout: 120000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 10000 },
  },
});
