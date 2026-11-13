const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

const token = "fictional-live-search-browser-token";
const offer = {
  title: "Fiktive Wohnung am Beispielpark", city: "Konstanz", zipcode: "78462", source: "Beispielportal",
  url: "https://housing.example.test/offer/1", rooms: 2.5, living_area: 65, cold_rent: 800.25, warm_rent: 1000.5,
};

async function mockApi(context, { enabled = true, quotaError = false } = {}) {
  const calls = [];
  await context.addInitScript(token => localStorage.setItem("token", token), token);
  await context.route("**/wohnungssuche-api/**", async route => {
    const request = route.request();
    expect(request.headers().authorization).toBe(`Token ${token}`);
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/live-search/status/")) return route.fulfill({ json: { enabled, remaining: 45, monthly_limit: 45, provider: "Somantic" } });
    if (path.endsWith("/live-search/")) {
      expect(request.method()).toBe("POST");
      calls.push(request.postDataJSON());
      if (quotaError) return route.fulfill({ status: 429, json: { code: "monthly_limit", remaining: 0, detail: "Das monatliche Anfragebudget ist ausgeschöpft." } });
      return route.fulfill({ json: { results: [offer], count: 1, provider: "Somantic", search: request.postDataJSON(), fetched_at: "2026-10-21T12:00:00Z", expires_in: 900, remaining: 44 } });
    }
    return route.fulfill({ json: { results: [] } });
  });
  return calls;
}

test.beforeEach(async ({ context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
});

test("guest sees examples and a login entry without making live-search requests", async ({ page, context }) => {
  const calls = [];
  await context.route("**/wohnungssuche-api/live-search/**", route => { calls.push(route.request().url()); return route.abort(); });
  await page.goto("/wohnungssuche/apartments");
  await expect(page.getByRole("button", { name: "Für die Live-Suche anmelden", exact: true })).toBeVisible();
  await expect(page.locator(".listing-card")).toHaveCount(3);
  await page.reload();
  await expect(page.locator(".listing-card")).toHaveCount(3);
  expect(calls).toEqual([]);
});

test("only an explicit search fetches offers, with attribution and no persistent results", async ({ page, context }, testInfo) => {
  const calls = await mockApi(context);
  await page.goto("/wohnungssuche/apartments");
  const panel = page.getByRole("region", { name: "Aktuelle Wohnungen suchen", exact: true });
  await expect(panel.getByRole("button", { name: "Aktuelle Angebote abrufen", exact: true })).toBeEnabled();
  await page.reload();
  await expect(panel.getByRole("button", { name: "Aktuelle Angebote abrufen", exact: true })).toBeEnabled();
  expect(calls).toEqual([]);
  await panel.getByLabel("Warmmiete höchstens (€)", { exact: true }).fill("1100");
  await panel.getByLabel("Zimmer mindestens", { exact: true }).fill("2.5");
  await panel.getByRole("button", { name: "Aktuelle Angebote abrufen", exact: true }).click();
  await expect(panel.locator(".live-result-card")).toHaveCount(1);
  expect(calls).toEqual([{ city: "Konstanz", max_cold_rent: "", max_warm_rent: "1100", min_rooms: "2.5" }]);
  await expect(panel.locator(".live-result-card")).toContainText("Angebot von Beispielportal");
  await expect(panel.locator(".live-result-card")).toContainText("800,25");
  await expect(panel.locator(".live-result-card")).toContainText("1.000,50");
  await expect(panel.locator(".live-result-card a")).toHaveAttribute("href", offer.url);
  await expect(panel.locator(".live-search-note").first()).toContainText("Noch 44 von 45");
  await expect(panel.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain(offer.title);
  expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage }))).not.toContain(offer.title);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.screenshot({ path: testInfo.outputPath("housing-live-search.png"), fullPage: true });
  await page.reload();
  await expect(panel.getByRole("button", { name: "Aktuelle Angebote abrufen", exact: true })).toBeEnabled();
  await expect(panel.locator(".live-result-card")).toHaveCount(0);
  expect(calls).toHaveLength(1);
});

test("results expire after fifteen minutes without another provider request", async ({ page, context }) => {
  await page.clock.install();
  const calls = await mockApi(context);
  await page.goto("/wohnungssuche/apartments");
  await page.getByRole("button", { name: "Aktuelle Angebote abrufen", exact: true }).click();
  await expect(page.locator(".live-result-card")).toHaveCount(1);
  await page.clock.fastForward(15 * 60 * 1000);
  await expect(page.locator(".live-result-card")).toHaveCount(0);
  await expect(page.getByText("Die Suchergebnisse sind abgelaufen. Starte bei Bedarf eine neue Suche.", { exact: true })).toBeVisible();
  expect(calls).toHaveLength(1);
});

test("missing configuration and an exhausted budget give usable explanations", async ({ page, context }) => {
  const calls = await mockApi(context, { quotaError: true });
  await page.goto("/wohnungssuche/apartments");
  await page.getByRole("button", { name: "Aktuelle Angebote abrufen", exact: true }).click();
  await expect(page.locator(".live-search-panel").getByRole("alert")).toContainText("Anfragebudget ist ausgeschöpft");
  await expect(page.getByRole("button", { name: "Aktuelle Angebote abrufen", exact: true })).toBeDisabled();
  expect(calls).toHaveLength(1);
  await context.unroute("**/wohnungssuche-api/**");
  await mockApi(context, { enabled: false });
  await page.reload();
  await expect(page.locator(".live-search-panel")).toContainText("Die Live-Suche ist noch nicht eingerichtet.");
  await expect(page.getByRole("button", { name: "Aktuelle Angebote abrufen", exact: true })).toHaveCount(0);
  expect(calls).toHaveLength(1);
});
