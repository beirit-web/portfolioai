const { test, expect } = require("@playwright/test");
const { readMetadata } = require("./helpers/metadata.cjs");
const { blockExternalRequests } = require("./helpers/network.cjs");
const { routes, notFound } = require("../../../apps/deutsch-live/src/seo/routes.json");

test.beforeEach(async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  await page.route("**/deutschlive/api/auth/me/", route => route.fulfill({ json: { user: null } }));
});

function expectedMetadata(copy, canonical, robots) {
  return {
    title: copy.title, description: copy.description, canonical, robots,
    ogTitle: copy.title, ogDescription: copy.description, ogUrl: canonical,
    twitterTitle: copy.title, twitterDescription: copy.description, twitterUrl: canonical,
  };
}

for (const [locale, label, ogLocale] of [["de", "Deutsch", "de_DE"], ["uk", "Українська", "uk_UA"]]) {
test(`${label} selection survives reload with matching server and browser metadata`, async ({ page, baseURL }) => {
  const response = await page.goto("/deutschlive/manual?source=example");
  const canonical = `${baseURL}/deutschlive/manual`;
  const russian = expectedMetadata(routes["/manual"].ru, canonical, "index, follow");
  expect(await readMetadata(page, await response.text())).toEqual(russian);
  await expect.poll(() => readMetadata(page)).toEqual(russian);

  await page.locator(".app-nav__actions .language-switcher summary").click();
  await page.getByRole("button", { name: label, exact: true }).click();
  const localized = expectedMetadata(routes["/manual"][locale], canonical, "index, follow");
  await expect.poll(() => readMetadata(page)).toEqual(localized);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", ogLocale);

  // The cookie must also work without the older localStorage preference.
  await page.evaluate(() => localStorage.removeItem("deutsch-live-locale"));
  const reloaded = await page.reload();
  expect(reloaded.headers()["content-language"]).toBe(locale);
  expect(await readMetadata(page, await reloaded.text())).toEqual(localized);
  await expect.poll(() => readMetadata(page)).toEqual(localized);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
});
}

test("app navigation and browser back update canonical URLs and indexability", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/deutschlive/");
  const menu = page.locator(".app-nav__desktop-menu select");
  await expect(menu).toBeVisible();
  const originalDocument = await page.evaluate(() => {
    window.seoDocumentMarker = Math.random();
    return window.seoDocumentMarker;
  });
  for (const path of ["/manual", "/dashboard"]) {
    await menu.selectOption(path);
    await expect.poll(() => readMetadata(page)).toEqual(expectedMetadata(
      routes[path].ru, `${baseURL}/deutschlive${path}`,
      path === "/dashboard" ? "noindex, follow" : "index, follow",
    ));
  }
  await page.goBack();
  await expect.poll(() => readMetadata(page)).toEqual(expectedMetadata(
    routes["/manual"].ru, `${baseURL}/deutschlive/manual`, "index, follow",
  ));
  expect(await page.evaluate(() => window.seoDocumentMarker)).toBe(originalDocument);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
});

test("an unknown URL stays a noindexed 404 and its home link restores public metadata", async ({ page, baseURL }) => {
  const path = "/missing%3Fquery%23fragment%25";
  const response = await page.goto(`/deutschlive${path}?source=example`);
  expect(response.status()).toBe(404);
  expect(response.headers()["x-robots-tag"]).toBe("noindex, follow");
  const missing = expectedMetadata(notFound.ru, `${baseURL}/deutschlive${path}`, "noindex, follow");
  expect(await readMetadata(page, await response.text())).toEqual(missing);
  await expect.poll(() => readMetadata(page)).toEqual(missing);
  await expect(page.getByRole("heading", { name: notFound.ru.heading, level: 2, exact: true })).toBeVisible();
  await page.getByRole("link", { name: notFound.ru.home, exact: true }).click();
  await expect.poll(() => readMetadata(page)).toEqual(expectedMetadata(
    routes["/"].ru, `${baseURL}/deutschlive/`, "index, follow",
  ));
});
