const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.beforeEach(async ({ context, page, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  await context.addInitScript(() => localStorage.setItem("deutsch-live-locale", "de"));
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
  await page.route("**/deutschlive/api/auth/me/", route => route.fulfill({ json: {
    user: {
      id: 42, username: "account-example", email: "account@example.test", isStaff: false, roles: ["learner"],
      settings: { emailVerified: true, interfaceLanguage: "de" },
    },
  } }));
  await page.route("**/deutschlive/api/auth/csrf/", route => route.fulfill({ json: {} }));
  await page.route("**/api/session/activity/", route => route.fulfill({ json: { ok: true } }));
});

test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

test("registration requires email confirmation and offers a replacement link before login", async ({ page }) => {
  await page.route("**/deutschlive/api/auth/me/", route => route.fulfill({ json: { user: null } }));
  let registrations = 0;
  await page.route("**/deutschlive/api/auth/register/", route => {
    registrations++;
    return route.fulfill({ status: 201, json: { ok: true, emailVerificationRequired: true, emailDelivery: "console" } });
  });
  await page.route("**/deutschlive/api/auth/login/", route => route.fulfill({
    status: 403, json: { code: "email_verification_required", error: "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse." },
  }));
  await page.goto("/deutschlive/account");
  await page.getByRole("button", { name: "Registrieren", exact: true }).click();
  await expect(page.getByText("Erst danach ist die Anmeldung möglich.", { exact: false })).toBeVisible();
  await page.getByLabel("Benutzername", { exact: true }).fill("registration-example");
  await page.getByLabel("E-Mail", { exact: true }).fill("registration@example.test");
  await page.getByLabel("Passwort", { exact: true }).fill("Fictional-registration-123!");
  await page.getByLabel("Passwort wiederholen", { exact: true }).fill("Different-fictional-456!");
  await page.getByRole("button", { name: "Account erstellen", exact: true }).click();
  await expect(page.locator("#account-status")).toContainText("Passwörter stimmen nicht überein");
  expect(registrations).toBe(0);
  await page.getByLabel("Passwort wiederholen", { exact: true }).fill("Fictional-registration-123!");
  await page.getByRole("button", { name: "Account erstellen", exact: true }).click();
  await expect(page.getByRole("form", { name: "Im Account anmelden", exact: true })).toBeVisible();
  await expect(page.locator("#account-status")).toContainText("bevor Sie sich anmelden");
  await expect(page.locator("#account-status")).toContainText("Serverkonsole");
  await expect(page.getByLabel("Passwort", { exact: true })).toHaveValue("");
  await page.getByLabel("Passwort", { exact: true }).fill("Fictional-registration-123!");
  await page.getByRole("form", { name: "Im Account anmelden", exact: true }).getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.locator("#account-status")).toContainText("bestätigen Sie zuerst Ihre E-Mail-Adresse");
  await page.getByRole("link", { name: "Bestätigungs-E-Mail erneut senden", exact: true }).click();
  await expect(page).toHaveURL(/\/email-bestaetigung\/$/);
  await expect(page.getByRole("form", { name: "Bestätigungs-E-Mail erneut senden", exact: true })).toBeVisible();
});

for (const action of [
  {
    name: "password change", toggle: "Passwort ändern", form: "#account-password-change",
    endpoint: "change-password", submit: "Passwort ändern", success: "Passwort geändert. Bitte erneut anmelden.",
    fields: { currentPassword: "fictional-current-password-123", newPassword: "fictional-next-password-456" },
  },
  {
    name: "account deletion", toggle: "Account löschen", form: "#account-delete",
    endpoint: "delete-account", submit: "Endgültig löschen", success: "Account wurde gelöscht.",
    fields: { password: "fictional-current-password-123" },
  },
]) {
  test(`${action.name} keeps its confirmation when the login form replaces the signed-in account`, async ({ page }) => {
    let attempts = 0;
    await page.route(`**/deutschlive/api/auth/${action.endpoint}/`, route => {
      expect(route.request().postDataJSON()).toEqual(action.fields);
      attempts++;
      return route.fulfill(attempts === 1
        ? { status: 400, json: { error: "Das Beispielpasswort wurde nicht akzeptiert." } }
        : { json: { ok: true } });
    });
    await page.goto("/deutschlive/account");
    await page.getByRole("heading", { name: "Hallo, account-example", exact: true }).waitFor();
    await page.getByRole("button", { name: action.toggle, exact: true }).click();
    const form = page.locator(action.form);
    for (const [name, value] of Object.entries(action.fields)) await form.locator(`[name="${name}"]`).fill(value);
    await form.getByRole("button", { name: action.submit, exact: true }).click();
    await expect(page.locator("#account-status")).toHaveRole("alert");
    await expect(page.locator("#account-status")).toContainText("Beispielpasswort wurde nicht akzeptiert");
    for (const [name, value] of Object.entries(action.fields)) await expect(form.locator(`[name="${name}"]`)).toHaveValue(value);
    await form.getByRole("button", { name: action.submit, exact: true }).click();
    await expect(page.getByRole("form", { name: "Im Account anmelden", exact: true })).toBeVisible();
    await expect(page.locator("#account-status")).toHaveRole("status");
    await expect(page.locator("#account-status")).toHaveText(action.success);
    await expect(page.locator("#password")).toHaveValue("");
    await expect(page.locator(action.form)).toHaveCount(0);
    expect(attempts).toBe(2);
    await page.getByRole("button", { name: "Registrieren", exact: true }).click();
    await expect(page.locator("#account-status")).toBeEmpty();
  });
}
