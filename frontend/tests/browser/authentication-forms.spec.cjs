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

async function expectFieldDescriptions(field, error) {
  await expect(field).toHaveAttribute("aria-describedby", /\S/);
  const descriptions = await field.evaluate(element => element.getAttribute("aria-describedby").split(/\s+/).map(id => {
    const target = document.getElementById(id);
    return {
      id,
      exists: !!target,
      visible: !!target?.getClientRects().length,
      text: target?.textContent.trim() || "",
      isError: !!target?.closest('.form-error[role="alert"]'),
    };
  }));
  for (const description of descriptions) {
    expect(description, `Description ${description.id}`).toMatchObject({ exists: true, visible: true });
    expect(description.text).not.toBe("");
  }
  if (error) {
    await expect(field).toHaveAttribute("aria-invalid", "true");
    expect(descriptions.filter(description => description.isError).map(description => description.text).join(" ")).toMatch(error);
  }
}

test("project login leads to registration with visible errors and back to password recovery", async ({ page }, testInfo) => {
  await page.goto("/botanic/?tab=plants");
  await page.getByRole("link", { name: "Anmelden", exact: true }).first().click();
  const target = new URL(page.url()).searchParams.get("next");
  expect(target).toMatch(/^\/botanic\//);
  const expectDestination = path => expect(page).toHaveURL(url =>
    url.pathname === path && url.searchParams.get("next") === target
  );
  await expectDestination("/login/");
  await expect(page.locator("#id_username")).toBeVisible();
  await expect(page.locator("#id_password")).toBeVisible();
  const password = page.locator("#id_password");
  await password.fill("Fictional-preview-password-42!");
  const reveal = page.getByRole("button", { name: "Passwort anzeigen", exact: true });
  await expect(reveal.locator("svg path").first()).toBeAttached();
  await reveal.click();
  await expect(password).toHaveAttribute("type", "text");
  const hide = page.getByRole("button", { name: "Passwort verbergen", exact: true });
  await expect(hide).toHaveAttribute("aria-pressed", "true");
  await expect(hide.locator("svg path").first()).toBeAttached();
  await hide.click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(reveal).toHaveAttribute("aria-pressed", "false");

  await page.locator("main").getByRole("link", { name: "Registrieren", exact: true }).click();
  await expectDestination("/register/");
  await expect(page.getByRole("heading", { name: "Registrierung", exact: true })).toBeVisible();
  for (const id of ["id_email", "id_image", "id_password1", "id_password2"]) {
    await expectFieldDescriptions(page.locator(`#${id}`));
  }
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
  await expectFieldDescriptions(page.locator("#id_password2"), /Passwörter.*nicht.*(?:identisch|überein)/);
  await expectFieldDescriptions(page.locator("#id_privacy_consent"), /Datenschutz-Zustimmung/);
  await expect(page.locator("#id_email")).toHaveValue(email);
  await expect(page.locator("#id_password1")).toHaveValue("");
  await expect(page.locator("#id_password2")).toHaveValue("");
  await expect(page.locator("#id_privacy_consent")).not.toBeChecked();
  await expect(page.locator('main form button[type="submit"]')).toBeEnabled();

  await page.locator("main").getByRole("link", { name: "Zum Login", exact: true }).click();
  await expectDestination("/login/");
  await page.locator("main").getByRole("link", { name: "Passwort zurücksetzen", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/password-reset/");
  const loginTarget = new URL(new URL(page.url()).searchParams.get("next"), page.url());
  expect(loginTarget.pathname).toBe("/login/");
  expect(loginTarget.searchParams.get("next")).toBe(target);
  await expect(page.getByRole("form", { name: "Passwort wiederherstellen", exact: true })).toBeVisible();
});

test("password recovery preserves invalid email input and returns a neutral success page", async ({ page }, testInfo) => {
  await page.goto("/password-reset/");
  await page.locator("#id_email").fill("keine-gueltige-adresse");
  await page.locator("main form").evaluate(form => { form.noValidate = true; });
  expect((await submitForm(page, "/password-reset/")).status()).toBe(200);
  await expect(page.locator(".form-error[role=alert]")).toContainText(/gültige.*E-Mail/);
  await expectFieldDescriptions(page.locator("#id_email"), /gültige.*E-Mail/);
  await expect(page.locator("#id_email")).toHaveValue("keine-gueltige-adresse");
  await expect(page.locator('main form button[type="submit"]')).toBeEnabled();

  await page.locator("#id_email").fill(`unknown-recovery-${testInfo.project.name}@example.test`);
  expect((await submitForm(page, "/password-reset/")).status()).toBe(302);
  await expect(page).toHaveURL(/\/password-reset\/done\/$/);
  await expect(page.getByRole("heading", { name: "Wiederherstellungslink angefordert", exact: true })).toBeVisible();
  await expect(page.locator('main p[role="status"]')).toContainText(/Wenn ein (?:aktives )?Konto mit dieser E-Mail existiert/);
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
  await expect(page.getByRole("button", { name: /^(?:Link senden|Lokalen Token erstellen)$/ })).toBeEnabled();
});

test("login associates invalid email and missing password errors with their fields", async ({ page }) => {
  await page.goto("/login/");
  await expectFieldDescriptions(page.locator("#id_username"));
  await page.locator("#id_username").fill("keine-gueltige-adresse");
  await page.locator("main form").evaluate(form => { form.noValidate = true; });
  expect((await submitForm(page, "/login/")).status()).toBe(200);
  await expectFieldDescriptions(page.locator("#id_username"), /gültige.*E-Mail/);
  await expectFieldDescriptions(page.locator("#id_password"), /(?:erforderlich|ausfüllen)/);
  await expect(page.locator("#id_username")).toHaveValue("keine-gueltige-adresse");
  await expect(page.locator('main form button[type="submit"]')).toBeEnabled();
});

test("an invalid confirmation link can be renewed while preserving the intended destination", async ({ page }, testInfo) => {
  const next = "/wohnungssuche/?tab=merkliste&source=confirmation";
  const expectDestination = path => expect(page).toHaveURL(url =>
    url.pathname === path && url.searchParams.get("next") === next
  );
  await page.goto(`/verify-email/MA/fictional-invalid-token/?${new URLSearchParams({ next })}`);
  await expectDestination("/email-bestaetigung/");
  await expect(page.locator("main").getByRole("alert")).toContainText(/(?:ungültig|abgelaufen)/);
  await expect(page.getByRole("form", { name: /^(?:Bestätigungs-E-Mail erneut senden|Neuen Aktivierungscode anfordern)$/ })).toBeVisible();
  await expect(page.locator('main input[name="next"]')).toHaveValue(next);

  await page.locator("#id_email").fill("keine-gueltige-adresse");
  await page.locator("main form").evaluate(form => { form.noValidate = true; });
  expect((await submitForm(page, "/email-bestaetigung/")).status()).toBe(200);
  await expectDestination("/email-bestaetigung/");
  await expectFieldDescriptions(page.locator("#id_email"), /gültige.*E-Mail/);
  await expect(page.locator('main input[name="next"]')).toHaveValue(next);
  await expect(page.locator("#id_email")).toHaveValue("keine-gueltige-adresse");

  await page.locator("#id_email").fill(`unknown-confirmation-${testInfo.project.name}@example.test`);
  const response = await submitForm(page, "/email-bestaetigung/");
  expect(response.status()).toBe(302);
  expect(new URLSearchParams(response.request().postData()).get("next")).toBe(next);
  await expectDestination("/email-bestaetigung/");
  expect(new URL(page.url()).searchParams.get("sent")).toBe("1");
  await expect(page.locator("main").getByRole("status")).toContainText(/(?:Wenn die Adresse zu einem noch nicht bestätigten Konto gehört|Falls keine Aktivierung offen ist)/);

  const login = page.locator("main").getByRole("link", { name: "Zum Login", exact: true });
  expect(new URL(await login.getAttribute("href"), page.url()).searchParams.get("next")).toBe(next);
  await page.locator("main").getByRole("link", { name: "Erneut versuchen", exact: true }).click();
  await expectDestination("/email-bestaetigung/");
  await expect(page.locator("#id_email")).toBeVisible();
  await expect(page.getByRole("button", { name: /^(?:Bestätigungs-E-Mail anfordern|Neuen Aktivierungscode anfordern)$/ })).toBeEnabled();

  await page.locator("main").getByRole("link", { name: "Zurück zum Login", exact: true }).click();
  await expectDestination("/login/");
  await page.locator("main").getByRole("link", { name: /^(?:Bestätigungs-E-Mail erneut senden|Neuen Aktivierungscode anfordern)$/ }).click();
  await expectDestination("/email-bestaetigung/");
  await page.locator("main").getByRole("link", { name: "Konto anlegen", exact: true }).click();
  await expectDestination("/register/");
  await page.locator("main").getByRole("link", { name: /^(?:Bestätigungs-E-Mail erneut senden|Neuen Aktivierungscode anfordern)$/ }).click();
  await expectDestination("/email-bestaetigung/");
});
