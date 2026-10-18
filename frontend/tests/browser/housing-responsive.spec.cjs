const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.beforeEach(async ({ context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
});

async function expectNoOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(page.viewportSize().width);
}

test("housing controls can be found by their accessible names", async ({ page }) => {
  await page.goto("/static/portfolio/wohnungssuche/index.html");
  const city = page.getByRole("combobox", { name: "Ort", exact: true });
  const sort = page.getByRole("combobox", { name: "Sortierung", exact: true });
  await city.selectOption({ label: "Konstanz" });
  await sort.selectOption({ label: "Niedrigste Warmmiete" });
  await page.getByRole("button", { name: "Suchen", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await expect(page.locator(".listing-card")).toContainText("Konstanz");
  await page.getByRole("button", { name: "Zurücksetzen", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(3);
  // Exercise sorting across different rents, after removing the one-city filter.
  await sort.selectOption({ label: "Niedrigste Warmmiete" });
  await expect(page.locator(".listing-card h2")).toHaveText([
    "Private 2-Zimmer-Wohnung in Friedrichshafen",
    "Helle Wohnung mit Balkon in Radolfzell",
    "Geförderte 3-Zimmer-Wohnung nahe Seerhein",
  ]);
  await sort.selectOption({ label: "Größte Wohnfläche" });
  await expect(page.locator(".listing-card h2")).toHaveText([
    "Geförderte 3-Zimmer-Wohnung nahe Seerhein",
    "Helle Wohnung mit Balkon in Radolfzell",
    "Private 2-Zimmer-Wohnung in Friedrichshafen",
  ]);
  await expect(city).toBeVisible();
  await expect(sort).toBeVisible();
});

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
      path: testInfo.outputPath(`housing-${width}.png`), fullPage: true,
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
  await page.getByRole("button", { name: "Navigation-Menü öffnen" }).click();
  const menu = await page.locator(".sidebar.open").evaluate(element => ({
    height: element.getBoundingClientRect().height, scroll: element.scrollHeight,
  }));
  expect(menu.height).toBeLessThanOrEqual(375 - 48);
  expect(menu.scroll).toBeGreaterThan(menu.height);
  await page.locator('nav[aria-label="Hauptnavigation"]').getByRole("button", { name: "Information", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Über diese Anwendung" })).toBeVisible();
  await expect(page.locator(".sidebar")).toBeHidden();
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "Navigation-Menü öffnen" }).click();
  await page.getByRole("button", { name: "Registrieren", exact: true }).click();
  await expect(page.locator(".login-panel")).toBeVisible();
  await expectNoOverflow(page);
});

test("saved profile layouts, long names and account forms fit small screens", async ({ page, context }, testInfo) => {
  // Real registration, confirmation and persistence run in the isolated housing suite.
  const username = `housing-layout-${testInfo.project.name}`;
  const token = "fictional-layout-token";
  const location = { id: 1, name: "Bodman-Ludwigshafen", radius_km: 15 };
  const profile = {
    id: 1, name: "Wohnungssuche für eine fiktive Familie rund um den Bodensee",
    location_ids: [location.id], locations: [location], max_warm_rent: 1200, min_rooms: 2, max_rooms: 4,
    balcony: false, fitted_kitchen: false, ground_floor_or_elevator: false,
  };
  await context.route("**/wohnungssuche-api/**", async route => {
    expect(route.request().headers().authorization).toBe(`Token ${token}`);
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint.endsWith("/logout/") && route.request().method() === "POST") return route.fulfill({ status: 204 });
    const results = endpoint.endsWith("/search-profiles/") ? [profile]
      : endpoint.endsWith("/search-locations/") ? [location] : [];
    return route.fulfill({ json: { results } });
  });
  await context.addInitScript(({ token, username }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("username", username);
  }, { token, username });
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
  await page.screenshot({ path: testInfo.outputPath(`housing-profile.png`), fullPage: true });
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await page.getByRole("button", { name: "Navigation-Menü öffnen" }).click();
  await page.locator('nav[aria-label="Hauptnavigation"]').getByRole("button", { name: "Quellen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quellen", exact: true })).toBeVisible();
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "Navigation-Menü öffnen" }).click();
  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(page.locator(".login-panel")).toBeVisible();
  await expectNoOverflow(page);
});
