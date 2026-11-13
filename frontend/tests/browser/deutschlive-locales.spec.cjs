const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");
const uk = require("../../../apps/deutsch-live/src/i18n/uk.json");

test("Ukrainian is saved to the shared account and restored with its settings", async ({ page, context, baseURL }, testInfo) => {
  await blockExternalRequests(context, baseURL);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/login/?next=/deutschlive/");
  await page.locator("#id_username").fill(`quiz-browser-${testInfo.project.name}@example.test`);
  await page.locator("#id_password").fill("Example-only-Quiz-42!");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL(/\/deutschlive\/$/);
  // Wait for the account load before changing its preference.
  await expect(page.locator(".app-nav__actions .app-nav__account-button")).toHaveAttribute("href", "/deutschlive/settings");
  await page.locator(".app-nav__actions .language-switcher summary").click();
  const saved = page.waitForResponse(response =>
    new URL(response.url()).pathname === "/deutschlive/api/settings/" && response.request().method() === "PATCH"
  );
  await page.getByRole("button", { name: "Українська", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${uk.landing.headline} ${uk.landing.headlineAccent}`);
  await page.evaluate(() => localStorage.removeItem("deutsch-live-locale"));
  await context.clearCookies({ name: "deutschlive_locale" });
  await page.goto("/deutschlive/settings");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.getByLabel(uk.dashboard.interfaceLanguage, { exact: true })).toHaveValue("uk");
  await expect(page.getByRole("button", { name: uk.common.save, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
