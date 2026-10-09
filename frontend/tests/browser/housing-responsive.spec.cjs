const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context }) => {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:8765(?:\/|$))/, route => route.abort());
});

async function expectNoOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(page.viewportSize().width);
}

test("housing search fits phones, tablets and desktop screens", async ({ page }, testInfo) => {
  await page.goto("/static/portfolio/wohnungssuche/index.html");
  await expect(page.locator(".controls")).toBeVisible();
  for (const width of [320, 390, 768, 980, 981, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      page: document.documentElement.scrollWidth,
      overflowing: [...document.querySelectorAll(".workspace, .controls, .controls > *, .listing-card, .map-panel")]
        .filter(element => element.getBoundingClientRect().right > innerWidth + 1)
        .map(element => element.className),
    }));
    if (width === 390 || width === 1280) await page.screenshot({
      path: `../runtime/browser-checks/previews/${testInfo.project.name}-housing-${width}.png`, fullPage: true,
    });
    expect(layout, `Layout at ${width}px`).toEqual({ viewport: width, page: width, overflowing: [] });
  }
});

test("filters and mobile navigation remain usable, including landscape", async ({ page }) => {
  await page.goto("/static/portfolio/wohnungssuche/index.html");
  await expect(page.locator(".listing-card")).toHaveCount(3);
  await page.locator('.searchbox input').fill("Radolfzell");
  await page.getByRole("button", { name: "Suchen", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await expect(page.locator(".listing-card")).toContainText("Radolfzell");
  await page.getByRole("button", { name: "Zurücksetzen", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(3);
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    const controls = await page.locator(".controls button, .header-actions button").evaluateAll(elements =>
      elements.map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
    for (const control of controls) {
      expect(control.width).toBeGreaterThanOrEqual(44);
      expect(control.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.setViewportSize({ width: 812, height: 375 });
  await page.getByRole("button", { name: "Navigation öffnen" }).click();
  const menu = await page.locator(".sidebar.open").evaluate(element => ({
    height: element.getBoundingClientRect().height, scroll: element.scrollHeight,
  }));
  expect(menu.height).toBeLessThanOrEqual(375 - 48);
  expect(menu.scroll).toBeGreaterThan(menu.height);
  await page.locator('nav[aria-label="Hauptnavigation"]').getByRole("button", { name: "Information", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Über diese Anwendung" })).toBeVisible();
  await expect(page.locator(".sidebar")).toBeHidden();
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "Navigation öffnen" }).click();
  await page.getByRole("button", { name: "Registrieren", exact: true }).click();
  await expect(page.locator(".login-panel")).toBeVisible();
  await expectNoOverflow(page);
});

test("profiles, long source names and account forms fit small screens", async ({ page, context }, testInfo) => {
  await context.addInitScript(() => {
    localStorage.setItem("token", "browser-layout-fixture");
    localStorage.setItem("username", "wohnungsinteressent.mit.langem.namen@example.test");
  });
  const location = { id: 7, name: "Bodman-Ludwigshafen", radius_km: 15 };
  const profile = { id: 1, name: "Wohnungssuche für eine Familie rund um den Bodensee", locations: [location], max_warm_rent: 1200, min_rooms: 2, max_rooms: 4 };
  await page.route(/\/(?:api|wohnungssuche-api)\/[^/?]+\/(?:\?.*)?$/, async route => {
    const endpoint = new URL(route.request().url()).pathname.split("/").filter(Boolean).at(-1);
    const entries = {
      "listings": [], "search-profiles": [profile], "search-locations": [location],
      "sources": [{ id: 1, name: "Kommunale Wohnungsangebote Bodman-Ludwigshafen", source_type: "rss", is_active: true, url: `https://example.test/${"wohnungssuche".repeat(18)}` }],
    };
    await route.fulfill({ json: { results: entries[endpoint] || [] }, headers: { "Access-Control-Allow-Origin": "*" } });
  });
  await page.goto("/search-profiles");
  await expect(page.locator(".profile-card")).toContainText(profile.name);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoOverflow(page);
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole("button", { name: "Neues Profil", exact: true }).click();
  await expect(page.locator(".profile-form")).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Mein Suchprofil");
  await page.getByLabel("Bodman-Ludwigshafen (15 km)").check();
  await page.getByPlaceholder("Neuer Ort").fill("Konstanz");
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoOverflow(page);
    const overflowing = await page.locator(".profile-form").evaluate(form =>
      [...form.querySelectorAll("input, button, fieldset")].filter(element => element.getBoundingClientRect().right > innerWidth + 1).length);
    expect(overflowing).toBe(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `../runtime/browser-checks/previews/${testInfo.project.name}-housing-profile.png`, fullPage: true });
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await page.getByRole("button", { name: "Navigation öffnen" }).click();
  await page.locator('nav[aria-label="Hauptnavigation"]').getByRole("button", { name: "Quellen", exact: true }).click();
  await expect(page.locator(".profile-card")).toContainText("Kommunale Wohnungsangebote");
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "Navigation öffnen" }).click();
  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(page.locator(".login-panel")).toBeVisible();
  await expectNoOverflow(page);
});
