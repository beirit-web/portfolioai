const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.beforeEach(async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  await page.addInitScript(() => localStorage.setItem("deutsch-live-locale", "de"));
});

const accountLinks = 'a[href^="/login"], a[href^="/register"], a[href^="/profil"], a[href^="/logout"], a[href^="/password-reset"]';

test("portfolio pages have no account entry before or after app rendering", async ({ page }) => {
  for (const path of ["/", "/projekte", "/kompetenzen", "/ueber-mich", "/kontakt", "/impressum"]) {
    const response = await page.goto(path);
    const serverLinks = await page.evaluate(({ html, selector }) => {
      return new DOMParser().parseFromString(html, "text/html").querySelectorAll(selector).length;
    }, { html: await response.text(), selector: accountLinks });
    expect(serverLinks).toBe(0);
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.locator(accountLinks)).toHaveCount(0);
  }
});

test("portfolio navigation also stays public for a signed-in project account", async ({ page }, testInfo) => {
  await page.goto("/login/?next=/projekte");
  await page.locator("#id_username").fill(`quiz-browser-${testInfo.project.name}@example.test`);
  await page.locator("#id_password").fill("Example-only-Quiz-42!");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL(/\/projekte$/);
  await expect(page.locator("main").first()).toBeVisible();
  await expect(page.locator(accountLinks)).toHaveCount(0);
});

for (const [name, path] of [
  ["Torten- und Kuchen-Shop", "/shop/"],
  ["ENBT Botanic", "/botanic/?tab=plants"],
  ["Notenrechner", "/static/portfolio/notenrechner/index.html"],
]) {
  test(`${name} exposes registration and recovery and keeps the project return path`, async ({ page }) => {
    await page.goto(path);
    if (name === "ENBT Botanic") await page.getByText("Kontooptionen", { exact: true }).click();
    await expect(page.getByRole("link", { name: "Registrieren", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Passwort vergessen?", exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "Anmelden", exact: true }).first().click();
    await expect(page.locator(".login-eyebrow")).toHaveText(name);
    const target = new URL(page.url()).searchParams.get("next");
    await expect(page.locator('input[name="next"]')).toHaveValue(target);
    await page.getByRole("link", { name: "Registrieren", exact: true }).click();
    await expect(page.locator(".login-eyebrow")).toHaveText(name);
    await expect(page.locator('input[name="next"]')).toHaveValue(target);
    await page.getByRole("link", { name: "Zum Login", exact: true }).click();
    await page.getByRole("link", { name: "Passwort zurücksetzen", exact: true }).click();
    await expect(page.locator(".login-eyebrow")).toHaveText(name);
    const returnLink = page.getByRole("link", { name: "Zurück zum Login", exact: true });
    expect(new URL(await returnLink.getAttribute("href"), page.url()).searchParams.get("next")).toBe(target);
    await returnLink.click();
    await expect(page.locator('input[name="next"]')).toHaveValue(target);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test("DeutschLive offers registration and returns from password recovery to its account", async ({ page }) => {
  await page.goto("/deutschlive/account");
  await page.getByRole("button", { name: "Registrieren", exact: true }).click();
  await expect(page.locator("#email")).toBeVisible();
  await page.getByRole("link", { name: /Passwort vergessen/ }).click();
  await expect(page.locator(".login-eyebrow")).toHaveText("DeutschLive");
  await page.getByRole("link", { name: "Zurück zum Login", exact: true }).click();
  await expect(page).toHaveURL(/\/deutschlive\/account$/);
  await expect(page.locator("#username")).toBeVisible();
});

test("housing offers registration and returns from password recovery to its login", async ({ page }) => {
  await page.goto("/wohnungssuche/login");
  await page.getByRole("button", { name: /Jetzt registrieren/ }).click();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await page.getByRole("link", { name: "Passwort vergessen?", exact: true }).click();
  await expect(page.locator(".login-eyebrow")).toHaveText("Wohnungssuche Bodensee");
  await page.getByRole("link", { name: "Zurück zum Login", exact: true }).click();
  await expect(page).toHaveURL(/\/wohnungssuche\/login$/);
  await expect(page.locator("#housing-password")).toBeVisible();
});
