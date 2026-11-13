const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/housing",
  outputDir: "../runtime/housing-checks/results",
  timeout: 120000,
  expect: { timeout: 10000 },
  forbidOnly: !!process.env.CI,
  workers: 2,
  reporter: [["list"], ["html", { outputFolder: "../runtime/housing-checks/report", open: "never" }]],
  use: { locale: "de-DE", reducedMotion: "reduce", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
  ],
});
