const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route(/^https?:\/\//, route => (
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  ));
});

test("old API data cannot restore the separate Vokabelbox card", async ({ page }) => {
  await page.route("**/api/projects/", route => route.fulfill({ json: {
    projects: [
      { title: "Vokabelbox", slug: "vokabelbox", published: true, featured: true },
      { title: "Webplattform für Sprachdienstleistungen", slug: "sprachdienstleistungen", published: true, features: ["Vokabelbox"], shortDescription: "Sprachplattform mit integrierter Vokabelbox" },
    ],
  } }));
  await page.goto("/projekte/");
  await expect(page.locator(".project-overview-card")).toHaveCount(1);
  await expect(page.locator(".project-overview-card")).toContainText("Sprachplattform mit integrierter Vokabelbox");
  await expect(page.locator('a[href="/projekte/vokabelbox"]')).toHaveCount(0);
});

test("fallback portfolio presents Vokabelbox inside the language platform", async ({ page }) => {
  await page.route("**/api/projects/", route => route.fulfill({ status: 503, json: {} }));
  await page.goto("/projekte/");
  await expect(page.locator(".project-overview-card--sprachdienstleistungen")).toContainText("Vokabelbox");
  await expect(page.locator(".project-overview-card--vokabelbox")).toHaveCount(0);
  await page.locator('.project-overview-card--sprachdienstleistungen a.project-overview-card__button').click();
  await expect(page.locator("#vokabelbox")).toHaveAttribute("href", "/static/portfolio/vokabelbox-main/index.html");
  await expect(page.locator(".portfolio-project-hero__copy")).toContainText("Vokabelbox");
});


test("weather belongs to Botanic in the fallback portfolio and stale API data", async ({ page }) => {
  await page.route("**/api/projects/", route => route.fulfill({ status: 503, json: {} }));
  await page.goto("/projekte/");
  await expect(page.locator(".project-overview-card--wetter")).toHaveCount(0);
  await expect(page.locator(".project-overview-card--enbt-botanic")).toContainText("Wettermodul");
  await page.locator('.project-overview-card--enbt-botanic a.project-overview-card__button').click();
  await expect(page.locator("#wetter")).toHaveAttribute("href", "/botanic/wetter/");
  await page.unroute("**/api/projects/");
  await page.route("**/api/projects/", route => route.fulfill({ json: { projects: [
    { title: "Wetter", slug: "wetter", published: true, featured: true },
    { title: "ENBT Botanic", slug: "enbt-botanic", published: true, shortDescription: "Pflanzen und Wettermodul" },
  ] } }));
  await page.goto("/projekte/");
  await expect(page.locator(".project-overview-card")).toHaveCount(1);
  await expect(page.locator(".project-overview-card--enbt-botanic")).toBeVisible();
});

test("DeutschLive and local recordings are language-platform modules", async ({ page }) => {
  await page.route("**/api/projects/", route => route.fulfill({ status: 503, json: {} }));
  await page.goto("/projekte/");
  await expect(page.locator(".project-overview-card--musikplayer")).toHaveCount(0);
  await expect(page.locator(".project-overview-card--deutschlive")).toHaveCount(0);
  await expect(page.locator(".project-overview-card--sprachdienstleistungen")).toContainText("DeutschLive");
  await page.locator('.project-overview-card--sprachdienstleistungen a.project-overview-card__button').click();
  await expect(page.locator("#musikplayer")).toHaveAttribute("href", "/deutschlive/recordings");
  await expect(page.locator("#deutschlive")).toHaveAttribute("href", "/deutschlive/");
  await page.unroute("**/api/projects/");
  await page.route("**/api/projects/", route => route.fulfill({ json: { projects: [
    { title: "Musikplayer", slug: "musikplayer", published: true, featured: true },
    { title: "DeutschLive", slug: "deutschlive", published: true },
    { title: "Webplattform für Sprachdienstleistungen", slug: "sprachdienstleistungen", published: true, shortDescription: "DeutschLive und Vokabelbox" },
  ] } }));
  await page.goto("/projekte/");
  await expect(page.locator(".project-overview-card")).toHaveCount(1);
  await expect(page.locator(".project-overview-card--sprachdienstleistungen")).toBeVisible();
  await expect(page.locator(".project-overview-card--deutschlive")).toHaveCount(0);
});
