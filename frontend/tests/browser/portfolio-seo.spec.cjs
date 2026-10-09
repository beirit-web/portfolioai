const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route(/^https?:\/\//, route => (
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  ));
});

async function metadata(page, html) {
  return page.evaluate(source => {
    const doc = source ? new DOMParser().parseFromString(source, "text/html") : document;
    const content = selector => doc.querySelector(selector)?.getAttribute("content") || "";
    return {
      title: doc.title,
      description: content('meta[name="description"]'),
      keywords: content('meta[name="keywords"]'),
      robots: content('meta[name="robots"]'),
      canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
      ogTitle: content('meta[property="og:title"]'),
      ogDescription: content('meta[property="og:description"]'),
      ogUrl: content('meta[property="og:url"]'),
      twitterTitle: content('meta[name="twitter:title"]'),
      twitterDescription: content('meta[name="twitter:description"]'),
      twitterUrl: content('meta[name="twitter:url"]'),
      schema: Array.from(doc.querySelectorAll('script[type="application/ld+json"]'), script => JSON.parse(script.textContent)),
    };
  }, html);
}

function expectPortfolioMetadata(meta, { title, canonical }) {
  expect(meta.title).toBe(title);
  expect(meta.description.length).toBeGreaterThan(35);
  expect(meta.keywords).toContain("Portfolio");
  expect(meta.keywords).not.toMatch(/erstellen lassen|reparieren|günstig|Dienstleister|Hosting/i);
  expect(meta.canonical).toBe(canonical);
  expect(meta.ogTitle).toBe(meta.title);
  expect(meta.twitterTitle).toBe(meta.title);
  expect(meta.ogDescription).toBe(meta.description);
  expect(meta.twitterDescription).toBe(meta.description);
  expect(meta.ogUrl).toBe(canonical);
  expect(meta.twitterUrl).toBe(canonical);
  const schemaText = JSON.stringify(meta.schema);
  expect(schemaText).toContain('"WebSite"');
  expect(schemaText).not.toMatch(/"(?:LocalBusiness|ProfessionalService|PostalAddress|Offer|price|priceRange|streetAddress|telephone)"/);
}

for (const [path, title] of [
  ["/", "Beirit Web | Portfolio für Web- und Softwareentwicklung"],
  ["/kompetenzen", "Technologien und Kompetenzen | Beirit Web"],
  ["/projekte", "Web- und Softwareprojekte | Beirit Web"],
  ["/ueber-mich", "Über mich | Beirit Web"],
  ["/kontakt", "Kontakt | Beirit Web"],
  ["/projekte/enbt-botanic", "ENBT Botanic | Projekte | Beirit Web"],
]) {
  test(`${path}: portfolio metadata stays consistent after frontend startup`, async ({ page, baseURL }) => {
    const response = await page.goto(`${path === "/" ? "/" : `${path}/`}?source=seo-check`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator(path === "/kontakt" ? "#name" : "h1").first()).toBeVisible();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const serverMeta = await metadata(page, html);
    const hydratedMeta = await metadata(page);
    const expected = { title, canonical: `${baseURL}${path}` };
    expectPortfolioMetadata(serverMeta, expected);
    expectPortfolioMetadata(hydratedMeta, expected);
    expect(hydratedMeta).toEqual(serverMeta);
  });
}

test("the configured canonical origin survives frontend startup on a different host", async ({ page, baseURL }) => {
  const canonical = "https://portfolio.example.test/kontakt";
  await page.route("**/kontakt?source=configured-origin", async route => {
    const response = await route.fetch();
    const html = (await response.text()).replaceAll(`${baseURL}/kontakt`, canonical);
    await route.fulfill({ response, body: html });
  });
  await page.goto("/kontakt?source=configured-origin");
  await expect(page.locator("#name")).toBeVisible();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expectPortfolioMetadata(await metadata(page), { title: "Kontakt | Beirit Web", canonical });
  await expect(page.getByRole("link", { name: "kontakt@beirit.digital", exact: true })).toBeVisible();
  await expect(page.locator('a[href="tel:+4953515989191"]')).toBeVisible();
});
