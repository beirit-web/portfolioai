const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route(/^https?:\/\//, route => (
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  ));
});

async function metadata(page, source) {
  return page.evaluate(html => {
    const doc = html ? new DOMParser().parseFromString(html, "text/html") : document;
    const content = selector => doc.querySelector(selector)?.getAttribute("content");
    return {
      title: doc.title,
      description: content('meta[name="description"]'),
      robots: content('meta[name="robots"]'),
      canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      ogTitle: content('meta[property="og:title"]'),
      ogDescription: content('meta[property="og:description"]'),
      ogUrl: content('meta[property="og:url"]'),
      twitterTitle: content('meta[name="twitter:title"]'),
      twitterDescription: content('meta[name="twitter:description"]'),
      twitterUrl: content('meta[name="twitter:url"]'),
    };
  }, source);
}

test("guest collection is indexable in server HTML and excludes private filters", async ({ page, baseURL }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto("/botanic/?tab=plants&q=PrivaterFilter&location=PrivaterStandort&utm_source=example");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toBe("index, follow");
  const source = await response.text();
  expect(source).not.toMatch(/PrivaterFilter|PrivaterStandort/);
  const server = await metadata(page, source);
  const live = await metadata(page);
  expect(live).toEqual(server);
  expect(live.title).toBe("Meine Pflanzen | ENBT Botanic | Beirit Digital");
  expect(live.description).toContain("Pflanzensammlung");
  expect(live.canonical).toBe(`${baseURL}/botanic/?tab=plants`);
  expect(live.robots).toBe("index, follow");
  for (const prefix of ["og", "twitter"]) {
    expect(live[`${prefix}Title`]).toBe(live.title);
    expect(live[`${prefix}Description`]).toBe(live.description);
    expect(live[`${prefix}Url`]).toBe(live.canonical);
  }
  expect(JSON.stringify(live)).not.toMatch(/PrivaterFilter|PrivaterStandort|utm_source/);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main h1")).toHaveText("Meine Pflanzen");
  const visibleText = await page.locator("main").innerText();
  expect(visibleText).toContain("Pflanzen hinzufügen");
  expect(visibleText).toContain("Gießtermine");
  expect(errors).toEqual([]);
});

test("collection and watering headings and navigation work without JavaScript at narrow widths", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/botanic/?tab=plants`);
    for (const width of [280, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.getByRole("heading", { level: 1, name: "Meine Pflanzen", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "ENBT Botanic", exact: true })).toBeVisible();
      await expect(page.locator(".account-state").getByRole("link", { name: "Anmelden", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath("collection-390.png"), fullPage: true });
    await page.getByRole("navigation", { name: "Botanic", exact: true }).getByRole("link", { name: "Gießplan", exact: true }).click();
    await expect(page.locator("main h1")).toHaveText("Gießplan");
    await expect(page).toHaveTitle("Gießplan | ENBT Botanic | Beirit Digital");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${baseURL}/botanic/?tab=watering`);
  } finally {
    await context.close();
  }
});
