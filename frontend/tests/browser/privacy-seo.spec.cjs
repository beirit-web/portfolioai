const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");
const { readMetadata } = require("./helpers/metadata.cjs");

for (const [locale, language, title] of [
  ["de-DE", "de", "Muster-Datenschutz | Beirit Web Portfolio"],
  ["ru-RU", "ru", "Пример политики конфиденциальности | Beirit Web Portfolio"],
  ["uk-UA", "de", "Muster-Datenschutz | Beirit Web Portfolio"],
]) {
  test.describe(`privacy SEO (${locale})`, () => {
    test.use({ locale });
    test("keeps indexing, localized metadata and canonical consistent with the visible text", async ({ page, context, baseURL }) => {
      await blockExternalRequests(context, baseURL);
      const response = await page.goto("/datenschutz/?utm_source=seo-check#cookies");
      expect(response.status()).toBe(200);
      expect(response.headers()["x-robots-tag"]).toBe("index, follow");
      expect(response.headers()["content-language"]).toBe(language);
      expect(response.headers()["vary"].toLowerCase()).toContain("accept-language");
      const server = await readMetadata(page, await response.text());
      const live = await readMetadata(page);
      expect(live).toEqual(server);
      expect(live.title).toBe(title);
      expect(live.robots).toBe("index, follow");
      expect(live.canonical).toBe(`${baseURL}/datenschutz/`);
      for (const prefix of ["og", "twitter"]) {
        expect(live[`${prefix}Title`]).toBe(live.title);
        expect(live[`${prefix}Description`]).toBe(live.description);
        expect(live[`${prefix}Url`]).toBe(live.canonical);
      }
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      const image = await page.locator('meta[property="og:image"]').getAttribute("content");
      expect(new URL(image).origin).toBe(new URL(baseURL).origin);
      expect(new URL(image).pathname).not.toContain("//");
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", image);
      const imageAlt = await page.locator('meta[property="og:image:alt"]').getAttribute("content");
      expect(imageAlt.trim()).not.toBe("");
      await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute("content", imageAlt);
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
    });
  });
}
