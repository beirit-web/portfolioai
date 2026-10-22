const { test, expect } = require("@playwright/test");
const { randomUUID } = require("node:crypto");
const { blockExternalRequests } = require("./helpers/network.cjs");

const password = "Fictional-local-housing-42!";
const newPassword = "Fictional-local-housing-new-83!";

test.beforeEach(async ({ context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
});

async function localAccount(page) {
  const username = `local-housing-${randomUUID().slice(0, 8)}`;
  const email = `${username}@example.test`;
  await page.goto("/wohnungssuche/register");
  await expect(page.getByRole("region", { name: "Hinweis zur lokalen Demo", exact: true })).toContainText("keine E-Mail");
  const form = page.getByRole("form", { name: "Registrierung", exact: true });
  await form.getByLabel("Nutzername", { exact: true }).fill(username);
  await form.getByLabel("E-Mail-Adresse", { exact: true }).fill(email);
  await form.getByLabel("Passwort", { exact: true }).fill(password);
  await form.getByLabel("Passwort wiederholen", { exact: true }).fill(password);
  await form.getByRole("button", { name: "Konto erstellen", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/\?/);
  await expect(page.getByRole("form", { name: "Konto aktivieren", exact: true })).toBeVisible();
  return { username, email };
}

test("housing account activation and password recovery work locally without a mailbox", async ({ page, context, browser, baseURL }, testInfo) => {
  const { username, email } = await localAccount(page);
  const mailbox = await context.newPage();
  await mailbox.goto("/examplemail");
  const code = await mailbox.locator("#local-activation-code").textContent();
  expect(code).toMatch(/^\d{6}$/);
  const activation = page.getByRole("form", { name: "Konto aktivieren", exact: true });
  await activation.getByLabel("Aktivierungscode", { exact: true }).fill(code);
  await activation.getByRole("button", { name: "Konto aktivieren", exact: true }).click();
  const nativeLogin = page.getByRole("form", { name: "Anmelden", exact: true });
  await nativeLogin.getByLabel("E-Mail-Adresse", { exact: true }).fill(email);
  await nativeLogin.getByLabel("Passwort", { exact: true }).fill(password);
  await nativeLogin.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL(/\/wohnungssuche\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.goto("/wohnungssuche/login");
  await expect(page.getByRole("region", { name: "Hinweis zur lokalen Demo", exact: true })).toContainText("Wiederherstellungs-Token");
  await page.getByRole("link", { name: "Passwort vergessen?", exact: true }).click();
  await expect(page).toHaveURL(/password[-_]reset\/\?next=/);
  await expect(page.getByText(/Lokale Demo: Es wird keine E-Mail verschickt\./).first()).toBeVisible();
  const resetForm = page.getByRole("form", { name: "Passwort wiederherstellen", exact: true });
  await resetForm.getByLabel("E-Mail-Adresse", { exact: true }).fill(email);
  await resetForm.getByRole("button", { name: "Lokalen Token erstellen", exact: true }).click();
  const resetToken = await page.locator("#local-password-reset-token").textContent();
  expect(resetToken.length).toBeGreaterThan(20);
  expect(page.url()).not.toContain(resetToken);
  await expect(page.getByRole("button", { name: "Token verwenden und Passwort setzen", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("local-password-token.png"), fullPage: true });
  const outsider = await browser.newContext({ locale: "de-DE" });
  await blockExternalRequests(outsider, baseURL);
  try {
    const otherPage = await outsider.newPage();
    await otherPage.goto(page.url());
    await expect(otherPage.locator("#local-password-reset-token")).toHaveCount(0);
  } finally { await outsider.close(); }
  await page.getByRole("button", { name: "Token verwenden und Passwort setzen", exact: true }).click();
  await expect(page).toHaveURL(/\/set-password\//);
  expect(page.url()).not.toContain(resetToken);
  const changeForm = page.getByRole("form", { name: "Neues Passwort setzen", exact: true });
  await changeForm.getByLabel("Neues Passwort", { exact: true }).fill(newPassword);
  await changeForm.getByLabel("Passwort bestätigen", { exact: true }).fill(newPassword);
  await changeForm.getByRole("button", { name: "Speichern", exact: true }).click();
  await page.getByRole("link", { name: "Zum Login", exact: true }).click();
  await expect(page).toHaveURL(new URL("/wohnungssuche/login", baseURL).href);
  const housingLogin = page.getByRole("form", { name: "Anmeldung", exact: true });
  await housingLogin.getByLabel("Nutzername", { exact: true }).fill(username);
  await housingLogin.getByLabel("Passwort", { exact: true }).fill(newPassword);
  await housingLogin.getByRole("button", { name: "Einloggen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await mailbox.close();
});

test("correct pending credentials open the local activation flow from another browser", async ({ page, browser, baseURL }) => {
  const { username } = await localAccount(page);
  const fresh = await browser.newContext({ locale: "de-DE" });
  await blockExternalRequests(fresh, baseURL);
  try {
    const otherPage = await fresh.newPage();
    await otherPage.goto(new URL("/wohnungssuche/login", baseURL).href);
    const form = otherPage.getByRole("form", { name: "Anmeldung", exact: true });
    await form.getByLabel("Nutzername", { exact: true }).fill(username);
    await form.getByLabel("Passwort", { exact: true }).fill(password);
    await form.getByRole("button", { name: "Einloggen", exact: true }).click();
    await expect(otherPage).toHaveURL(/\/login\/\?/);
    await expect(otherPage.getByRole("form", { name: "Konto aktivieren", exact: true })).toBeVisible();
    await otherPage.goto(new URL("/examplemail", baseURL).href);
    await expect(otherPage.locator("#local-activation-code")).toHaveText(/^\d{6}$/);
  } finally { await fresh.close(); }
});
