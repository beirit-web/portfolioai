const { test, expect } = require("@playwright/test");

const projectUrl = "/projekte/sprachdienstleistungen";

test.beforeEach(async ({ context }) => {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:8766(?:\/|$))/, route => route.abort());
  await context.addInitScript(() => localStorage.setItem("deutsch-live-locale", "de"));
});

test("the language platform and its learning modules link to the parent project page", async ({ page }) => {
  const visited = [];
  await page.route(`**${projectUrl}`, async route => {
    visited.push(route.request().url());
    await route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Projekt</title><main>Projektseite</main>" });
  });
  for (const route of ["/", "/vokabelbox/", "/deutschlive/", "/deutschlive/recordings"]) {
    await page.goto(route);
    const home = page.getByRole("link", { name: "Zur Projektstartseite", exact: true });
    await expect(home).toBeVisible();
    await expect(home).toBeInViewport();
    await expect(home).toHaveAttribute("href", projectUrl);
    expect((await home.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await home.click();
    await expect(page).toHaveURL(new URL(projectUrl, "http://127.0.0.1:8766").href);
  }
  expect(visited).toEqual(Array(4).fill(new URL(projectUrl, "http://127.0.0.1:8766").href));
});
