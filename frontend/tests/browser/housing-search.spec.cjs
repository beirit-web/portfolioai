const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.beforeEach(async ({ context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
});

test("demo dashboard explains the examples and offers a useful next step", async ({ page }, testInfo) => {
  await page.goto("/wohnungssuche/");
  const summary = page.getByRole("region", { name: "Demo-Überblick", exact: true });
  await expect(summary).toContainText("Nur fiktive Beispieldaten");
  await expect(summary.locator(".metric strong")).toHaveText(["3", "2", "1", "3"]);
  await expect(summary).not.toContainText("Kein Score");
  await expect(page.locator(".map-panel")).toContainText("Beispielangebote nach Ort");
  await expect(page.locator(".timeline-row")).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath("housing-demo-dashboard.png"), fullPage: true });
  await page.getByRole("button", { name: "Beispielangebote ansehen", exact: true }).click();
  await expect(page).toHaveURL(/\/wohnungssuche\/apartments$/);
  await expect(page.locator(".listing-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Eigenes Suchprofil erstellen", exact: true }).click();
  await expect(page).toHaveURL(/\/wohnungssuche\/register$/);
  await expect(page.locator(".login-panel")).toBeVisible();
});

test("bookmarked filters survive reload, chip removal and browser history", async ({ page }) => {
  await page.goto("/wohnungssuche/?source=portfolio&q=Balkon&max_cold_rent=850&max_warm_rent=1000&sort=rent");
  await expect(page.getByRole("combobox", { name: "Sortierung", exact: true })).toHaveValue("rent");
  await expect(page.getByLabel("Maximale Warmmiete", { exact: true })).toHaveValue("1000");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await expect(page.locator(".listing-card")).toContainText("Radolfzell");
  await page.getByRole("button", { name: "Warmmiete bis 1.000 € entfernen", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(2);
  expect(new URL(page.url()).searchParams.has("max_warm_rent")).toBe(false);
  await page.reload();
  await expect(page.getByLabel("Maximale Warmmiete", { exact: true })).toHaveValue("");
  await expect(page.locator(".listing-card")).toHaveCount(2);
  await page.goBack();
  await expect(page.getByLabel("Maximale Warmmiete", { exact: true })).toHaveValue("1000");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.goForward();
  await expect(page.locator(".listing-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Zurücksetzen", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Aktive Filter", exact: true })).toHaveCount(0);
  expect(new URL(page.url()).search).toBe("?source=portfolio");
});

test("submitted filters and immediate sorting stay in the URL across navigation", async ({ page }) => {
  await page.goto("/wohnungssuche/");
  await page.getByRole("combobox", { name: "Ort", exact: true }).selectOption("Konstanz");
  await page.getByRole("button", { name: "Sozialwohnung", exact: true }).click();
  await page.getByRole("button", { name: "Suchen", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Sortierung", exact: true }).selectOption("area");
  const params = new URL(page.url()).searchParams;
  expect(Object.fromEntries(params)).toEqual({ city: "Konstanz", social: "1", sort: "area" });
  await page.getByRole("button", { name: "Beispielangebote ansehen", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Ort", exact: true })).toHaveValue("Konstanz");
  await page.reload();
  await expect(page.getByRole("button", { name: "Sozialwohnung", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Demo ausblenden", exact: true }).click();
  await page.getByRole("button", { name: "Suchen", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Keine passenden Angebote", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Demo ausgeblendet entfernen", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(1);
});

test("search-page links are separate from apartments and their filters", async ({ page, context }, testInfo) => {
  const token = "fictional-search-sources-token";
  await context.addInitScript(token => localStorage.setItem("token", token), token);
  const source = {
    id: "sample-source", title: "Beispiel-Suchseite Konstanz", city: "Konstanz", listing_kind: "search_page",
    source_name: "Beispielportal", import_method: "manual", original_url: "https://housing.example.test/search/konstanz",
  };
  const offer = {
    id: "sample-offer", title: "Fiktive Wohnung in Konstanz", city: "Konstanz", listing_kind: "individual_offer",
    rooms: 2, living_area: 60, cold_rent: 700, warm_rent: 900, status: "new", is_demo: false, scores: [],
  };
  await context.route("**/wohnungssuche-api/**", route => {
    const results = new URL(route.request().url()).pathname.endsWith("/listings/") ? [source, offer] : [];
    return route.fulfill({ json: { results } });
  });
  await page.goto("/wohnungssuche/");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await expect(page.locator(".listing-card")).toContainText(offer.title);
  await expect(page.locator(".result-count")).toHaveText("1 von 1 Wohnungsangeboten");
  await page.getByLabel("Maximale Warmmiete", { exact: true }).fill("500");
  await page.getByRole("button", { name: "Suchen", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Zu den Suchquellen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gespeicherte Suchseiten", exact: true })).toBeVisible();
  await expect(page.locator(".search-source-card")).toHaveCount(1);
  await expect(page.locator(".search-source-card")).toContainText(source.title);
  await expect(page.locator(".search-source-card a")).toHaveAttribute("href", source.original_url);
  await expect(page.locator(".controls")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("housing-search-sources.png"), fullPage: true });
  await page.reload();
  await expect(page.locator(".search-source-card")).toHaveCount(1);
});

test("invalid bookmark values are safe and a zero budget remains a real filter", async ({ page }) => {
  await page.goto("/wohnungssuche/?max_cold_rent=-50&max_warm_rent=oops&sort=unknown&social=false");
  await expect(page.getByLabel("Maximale Kaltmiete", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Maximale Warmmiete", { exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Sortierung", exact: true })).toHaveValue("score");
  await expect(page.locator(".listing-card")).toHaveCount(3);
  await page.getByLabel("Maximale Warmmiete", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Suchen", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Maximale Warmmiete", { exact: true })).toHaveValue("0");
  await expect(page.locator(".listing-card")).toHaveCount(0);
});
