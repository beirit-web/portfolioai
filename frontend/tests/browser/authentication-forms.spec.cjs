const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.beforeEach(async ({ context, page, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
});

test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

async function submitForm(page, path) {
  const posted = page.waitForResponse(response =>
    new URL(response.url()).pathname === path && response.request().method() === "POST"
  );
  await page.locator('main form button[type="submit"]').click();
  return posted;
}

test("portfolio login leads to registration with visible errors and back to password recovery", async ({ page, isMobile }, testInfo) => {
  await page.goto("/");
  if (isMobile) await page.locator(".site-nav-toggle").click();
  const navigation = page.locator(isMobile ? "#site-mobile-navigation" : "#site-navigation");
  await navigation.getByRole("link", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/$/);
  await expect(page.locator("#id_username")).toBeVisible();
  await expect(page.locator("#id_password")).toBeVisible();

  await page.locator("main").getByRole("link", { name: "Registrieren", exact: true }).click();
  await expect(page).toHaveURL(/\/register\/$/);
  await expect(page.getByRole("heading", { name: "Registrierung", exact: true })).toBeVisible();
  const email = `registration-${testInfo.project.name}@example.test`;
  await page.locator("#id_email").fill(email);
  await page.locator("#id_password1").fill("Fictional-registration-123!");
  await page.locator("#id_password2").fill("Another-fictional-password-456!");
  // Let Django report both the mismatch and missing consent, bypassing HTML validation.
  await page.locator("main form").evaluate(form => { form.noValidate = true; });
  expect((await submitForm(page, "/register/")).status()).toBe(200);
  const passwordField = page.locator(".form-field").filter({ has: page.locator("#id_password2") });
  await expect(passwordField.locator(".form-error")).toContainText(/Passwörter.*nicht.*(?:identisch|überein)/);
  await expect(page.locator(".form-error").filter({ hasText: "Datenschutz-Zustimmung" })).toBeVisible();
  await expect(page.locator("#id_email")).toHaveValue(email);
  await expect(page.locator("#id_password1")).toHaveValue("");
  await expect(page.locator("#id_password2")).toHaveValue("");
  await expect(page.locator("#id_privacy_consent")).not.toBeChecked();
  await expect(page.locator('main form button[type="submit"]')).toBeEnabled();

  await page.locator("main").getByRole("link", { name: "Zum Login", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/$/);
  await page.locator("main").getByRole("link", { name: "Passwort zurücksetzen", exact: true }).click();
  await expect(page).toHaveURL(/\/password-reset\/$/);
  await expect(page.getByRole("form", { name: "Passwort wiederherstellen", exact: true })).toBeVisible();
});

test("password recovery preserves invalid email input and returns a neutral success page", async ({ page }, testInfo) => {
  await page.goto("/password-reset/");
  await page.locator("#id_email").fill("keine-gueltige-adresse");
  await page.locator("main form").evaluate(form => { form.noValidate = true; });
  expect((await submitForm(page, "/password-reset/")).status()).toBe(200);
  await expect(page.locator(".form-error[role=alert]")).toContainText(/gültige.*E-Mail/);
  await expect(page.locator("#id_email")).toHaveValue("keine-gueltige-adresse");
  await expect(page.locator('main form button[type="submit"]')).toBeEnabled();

  await page.locator("#id_email").fill(`unknown-recovery-${testInfo.project.name}@example.test`);
  expect((await submitForm(page, "/password-reset/")).status()).toBe(302);
  await expect(page).toHaveURL(/\/password-reset\/done\/$/);
  await expect(page.getByRole("heading", { name: "Wiederherstellungslink angefordert", exact: true })).toBeVisible();
  await expect(page.locator("main").getByRole("status")).toContainText(/Wenn ein Konto mit dieser E-Mail existiert/);
  await page.locator("main").getByRole("link", { name: "Zurück zum Login", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/$/);
  await expect(page.locator("#id_username")).toBeVisible();
});

test("an invalid recovery link offers a working way to request a new link", async ({ page }) => {
  const response = await page.goto("/reset/MA/fictional-invalid-token/");
  expect(response.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Link ungültig", exact: true })).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toContainText(/abgelaufen/);
  await expect(page.locator('main input[type="password"]')).toHaveCount(0);
  await page.locator("main").getByRole("link", { name: "Neuen Link anfordern", exact: true }).click();
  await expect(page).toHaveURL(/\/password-reset\/$/);
  await expect(page.locator("#id_email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Link senden", exact: true })).toBeEnabled();
});
