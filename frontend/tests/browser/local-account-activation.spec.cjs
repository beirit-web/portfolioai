const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.setTimeout(90000);

const password = "Fictional-local-browser-42!";

test.beforeEach(async ({ context, page, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  await context.addInitScript(() => localStorage.setItem("deutsch-live-locale", "de"));
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

async function activate(page, context, email) {
  await expect(page).toHaveURL(/\/login\/\?/);
  await expect(page.locator("#id_username")).toBeDisabled();
  await expect(page.locator("#id_password")).toBeDisabled();
  const mailbox = await context.newPage();
  await mailbox.goto("/examplemail");
  await expect(mailbox.getByText(email, { exact: true })).toBeVisible();
  const code = (await mailbox.locator("#local-activation-code").textContent()).trim();
  expect(code).toMatch(/^\d{6}$/);
  const form = page.getByRole("form", { name: "Konto aktivieren", exact: true });
  await form.getByLabel("Aktivierungscode", { exact: true }).fill(code === "000000" ? "000001" : "000000");
  await form.getByRole("button", { name: "Konto aktivieren", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("Aktivierungscode ist ungültig");
  await expect(page.locator("#id_password")).toBeDisabled();
  await form.getByLabel("Aktivierungscode", { exact: true }).fill(code);
  await form.getByRole("button", { name: "Konto aktivieren", exact: true }).click();
  await expect(page.locator("#id_password")).toBeEnabled();
  await expect(page.locator("#id_username")).toHaveValue(email);
  await expect(page.getByRole("form", { name: "Konto aktivieren", exact: true })).toHaveCount(0);
  await mailbox.reload();
  await expect(mailbox.locator("#local-activation-code")).toHaveCount(0);
  await mailbox.close();
}

async function login(page) {
  await page.locator("#id_password").fill(password);
  await page.getByRole("form", { name: "Anmelden", exact: true }).getByRole("button", { name: "Anmelden", exact: true }).click();
}

test("local registration activates through the browser mailbox and preserves account edits across logins", async ({ page, context }, testInfo) => {
  const email = `local-native-${testInfo.project.name}@example.test`;
  await page.goto("/register/?next=/profil/");
  await page.getByLabel("E-Mail", { exact: true }).fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByLabel("Passwort wiederholen", { exact: true }).fill(password);
  await page.locator("#id_privacy_consent").check();
  await page.locator('main form button[type="submit"]').click();
  await activate(page, context, email);
  await login(page);
  await expect(page).toHaveURL(/\/profil\/$/);
  await page.getByRole("textbox", { name: /^Vorname:?$/ }).fill("Mustername");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Vorname:?$/ })).toHaveValue("Mustername");
  await page.goto("/logout/");
  await page.goto("/login/?next=/profil/");
  await expect(page.locator("#id_password")).toBeEnabled();
  await page.locator("#id_username").fill(email);
  await login(page);
  await expect(page).toHaveURL(/\/profil\/$/);
  await expect(page.getByRole("textbox", { name: /^Vorname:?$/ })).toHaveValue("Mustername");
});

test("housing registration uses the local code and opens a dashboard with persistent search profiles", async ({ page, context, isMobile }, testInfo) => {
  const email = `local-housing-${testInfo.project.name}@example.test`;
  await page.goto("/wohnungssuche/register");
  await page.getByLabel("Nutzername", { exact: true }).fill(`local-housing-${testInfo.project.name}`);
  await page.getByLabel("E-Mail-Adresse", { exact: true }).fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByLabel("Passwort wiederholen", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Konto erstellen", exact: true }).click();
  await activate(page, context, email);
  await login(page);
  await expect(page).toHaveURL(/\/wohnungssuche\/dashboard$/);
  await expect(page.getByText("API verbunden", { exact: true })).toBeVisible();
  if (isMobile) await page.getByRole("button", { name: "Navigation-Menü öffnen", exact: true }).click();
  await page.locator(".sidebar").getByRole("button", { name: "Suchprofile", exact: true }).click();
  await page.getByRole("button", { name: "Neues Profil", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Fiktives lokales Suchprofil");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fiktives lokales Suchprofil", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Fiktives lokales Suchprofil", exact: true })).toBeVisible();
});

test("DeutschLive registration returns to its signed-in account after local activation", async ({ page, context }, testInfo) => {
  const email = `local-learning-${testInfo.project.name}@example.test`;
  const username = `local-learning-${testInfo.project.name}`;
  await page.goto("/deutschlive/account");
  await page.getByRole("button", { name: "Registrieren", exact: true }).click();
  await page.getByLabel("Benutzername", { exact: true }).fill(username);
  await page.getByLabel("E-Mail", { exact: true }).fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByLabel("Passwort wiederholen", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Account erstellen", exact: true }).click();
  await activate(page, context, email);
  await login(page);
  await expect(page).toHaveURL(/\/deutschlive\/account\?emailConfirmed=1$/);
  await expect(page.getByRole("heading", { name: new RegExp(`^(?:Hallo,|Здравствуйте,) ${username}$`) })).toBeVisible();
});

test('two accounts can activate at the same time in the local database', async ({ browser, baseURL }, testInfo) => {
  const contexts = [];
  try {
    const accounts = await Promise.all([1, 2].map(async index => {
      const context = await browser.newContext({ baseURL });
      contexts.push(context);
      const email = `parallel-activation-${testInfo.project.name}-${index}@example.test`;
      const registration = await context.request.get('/register/');
      const csrf = (await registration.text()).match(/name="csrfmiddlewaretoken" value="([^"]+)"/)[1];
      const registered = await context.request.post('/register/', { maxRedirects: 0, form: {
        csrfmiddlewaretoken: csrf, email, password1: 'Fictional-concurrent-account-42!',
        password2: 'Fictional-concurrent-account-42!', privacy_consent: 'on',
      } });
      expect(registered.status()).toBe(302);
      const mailbox = await context.request.get('/examplemail');
      const html = await mailbox.text();
      return { context, email, code: html.match(/id="local-activation-code"[^>]*>([0-9]{6})</)[1],
        csrf: html.match(/name="csrfmiddlewaretoken" value="([^"]+)"/)[1] };
    }));
    const activations = await Promise.all(accounts.map(({ context, email, code, csrf }) =>
      context.request.post('/login/', { maxRedirects: 0, form: {
        csrfmiddlewaretoken: csrf, action: 'activate_local', username: email, activation_code: code,
      } })
    ));
    expect(activations.map(response => response.status())).toEqual([302, 302]);
    for (const account of accounts) {
      const login = await account.context.request.post('/login/', { maxRedirects: 0, form: {
        csrfmiddlewaretoken: account.csrf, username: account.email, password: 'Fictional-concurrent-account-42!',
      } });
      expect(login.status()).toBe(302);
      expect(login.headers().location).toBe('/profil/');
    }
  } finally {
    await Promise.all(contexts.map(context => context.close()));
  }
});
