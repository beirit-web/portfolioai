const { test: base, expect } = require("@playwright/test");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const workspace = path.resolve(__dirname, "../../..");
const python = ["server/.venv/bin/python", ".venv/bin/python"]
  .map(file => path.join(workspace, file)).find(file => fs.existsSync(file)) || "python3";

// Each browser worker owns a disposable database. Only its Django child is
// restarted; the same database and signing key survive that real process restart.
const test = base.extend({
  housingServer: [async ({}, use, workerInfo) => {
    const port = 8870 + workerInfo.workerIndex;
    const origin = `http://127.0.0.1:${port}`;
    const child = spawn(python, ["server/bin/run_housing_browser_checks.py", "--port", String(port)], {
      cwd: workspace, stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let generation = 1;
    child.stdout.on("data", data => { output = (output + data).slice(-20000); });
    child.stderr.on("data", data => { output = (output + data).slice(-20000); });
    async function ready(generation = 1) {
      await expect.poll(async () => {
        if (child.exitCode !== null) throw new Error(`Disposable housing server exited: ${output}`);
        if (!output.includes(`HOUSING_BROWSER_STARTED generation=${generation} `)) return false;
        try { return (await fetch(`${origin}/wohnungssuche/`)).ok; } catch { return false; }
      }, { timeout: 90000, intervals: [100, 250, 500] }).toBe(true);
    }
    try {
      await ready();
      await use({ origin, restart: async () => { generation += 1; child.kill("SIGUSR1"); await ready(generation); } });
    } finally {
      if (child.exitCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        const killTimer = setTimeout(() => child.kill("SIGKILL"), 15000);
        await exited;
        clearTimeout(killTimer);
      }
    }
  }, { scope: "worker", timeout: 120000 }],
});

async function navigate(page, name) {
  const opener = page.getByRole("button", { name: "Navigation-Menü öffnen", exact: true });
  if (await opener.isVisible()) await opener.click();
  await page.locator(".sidebar").getByRole("button", { name, exact: true }).click();
}

async function register(page, origin, username) {
  await page.goto(`${origin}/wohnungssuche/register`);
  const form = page.locator(".login-panel");
  await form.getByLabel("Nutzername", { exact: true }).fill(username);
  await form.getByLabel("E-Mail-Adresse", { exact: true }).fill(`${username}@example.invalid`);
  await form.getByLabel("Passwort", { exact: true }).fill("Fictional-Housing-42!");
  await form.getByLabel("Passwort wiederholen", { exact: true }).fill("Fictional-Housing-42!");
  const saved = page.waitForResponse(response => response.url().endsWith("/wohnungssuche-api/register/") && response.request().method() === "POST");
  await form.getByRole("button", { name: "Konto erstellen", exact: true }).click();
  expect((await saved).status()).toBe(201);
}

async function login(page, origin, username) {
  await page.goto(`${origin}/wohnungssuche/login`);
  const form = page.locator(".login-panel");
  await form.getByLabel("Nutzername", { exact: true }).fill(username);
  await form.getByLabel("Passwort", { exact: true }).fill("Fictional-Housing-42!");
  await form.getByRole("button", { name: "Einloggen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  return page.evaluate(() => localStorage.getItem("token"));
}

function auth(token) { return { Authorization: `Token ${token}` }; }

test("profiles and locations survive reload and server restart and stay private across two accounts", async ({ page, context, housingServer }) => {
  const { origin, restart } = housingServer;
  await context.route(/^https?:\/\//, route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const suffix = randomUUID().slice(0, 8);
  const userA = `housing-a-${suffix}`, userB = `housing-b-${suffix}`;
  await register(page, origin, userA);
  const tokenA = await login(page, origin, userA);
  await navigate(page, "Suchprofile");
  await page.getByRole("button", { name: "Neues Profil", exact: true }).click();
  const form = page.locator(".profile-form");
  await form.getByLabel("Name", { exact: true }).fill("Fiktives Familienprofil A");
  await form.getByLabel("Min. Zimmer", { exact: true }).fill("2.5");
  await form.getByLabel("Max. Zimmer", { exact: true }).fill("4");
  await form.getByLabel("Max Warmmiete", { exact: true }).fill("1200");
  await form.getByLabel("Balkon", { exact: true }).check();
  await form.getByPlaceholder("Neuer Ort", { exact: true }).fill("Musterstadt A");
  await form.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await expect(form.getByLabel("Musterstadt A (15 km)", { exact: true })).toBeChecked();
  await form.getByRole("button", { name: "Speichern", exact: true }).click();
  const card = page.locator(".profile-card").filter({ hasText: "Fiktives Familienprofil A" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Musterstadt A");
  const profileA = (await (await context.request.get(`${origin}/wohnungssuche-api/search-profiles/`, { headers: auth(tokenA) })).json()).results[0];
  const locationA = profileA.locations[0];
  expect(profileA).toMatchObject({ name: "Fiktives Familienprofil A", balcony: true });
  expect(Number(profileA.min_rooms)).toBe(2.5);
  await page.reload();
  await expect(card).toBeVisible();
  await restart();
  await page.reload();
  await expect(card).toBeVisible();
  await expect(card).toContainText("Musterstadt A");

  await card.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("Fiktives Familienprofil A");
  await form.getByLabel("Name", { exact: true }).fill("Fiktives Profil A geändert");
  await form.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.locator(".profile-card").filter({ hasText: "Fiktives Profil A geändert" })).toBeVisible();

  const locationCard = page.locator(".location-card").filter({ hasText: "Musterstadt A" });
  await locationCard.getByRole("button", { name: "Ort bearbeiten", exact: true }).click();
  const locationForm = page.locator(".location-form");
  await locationForm.getByLabel("Ortsname", { exact: true }).fill("Beispielstadt A");
  await locationForm.getByLabel("Radius (km)", { exact: true }).fill("25");
  await locationForm.getByRole("button", { name: "Ort speichern", exact: true }).click();
  await expect(page.locator(".location-card").filter({ hasText: "Beispielstadt A" })).toContainText("25");
  await page.reload();
  await expect(page.locator(".profile-card").filter({ hasText: "Fiktives Profil A geändert" })).toContainText("Beispielstadt A");
  await restart();
  await page.reload();
  await expect(page.locator(".profile-card")).toContainText("Fiktives Profil A geändert");
  await expect(page.locator(".location-card")).toContainText("25");

  await navigate(page, "Abmelden");
  await expect(page.locator(".login-panel")).toBeVisible();
  expect((await context.request.get(`${origin}/wohnungssuche-api/search-profiles/`, { headers: auth(tokenA) })).status()).toBe(401);
  await register(page, origin, userB);
  const tokenB = await login(page, origin, userB);
  await navigate(page, "Suchprofile");
  await expect(page.locator(".profile-card")).toHaveCount(0);
  await expect(page.locator(".location-card")).toHaveCount(0);
  for (const resource of [`search-profiles/${profileA.id}/`, `search-locations/${locationA.id}/`]) {
    expect((await context.request.get(`${origin}/wohnungssuche-api/${resource}`, { headers: auth(tokenB) })).status()).toBe(404);
    expect((await context.request.patch(`${origin}/wohnungssuche-api/${resource}`, { headers: auth(tokenB), data: { name: "Fremde Änderung" } })).status()).toBe(404);
    expect((await context.request.delete(`${origin}/wohnungssuche-api/${resource}`, { headers: auth(tokenB) })).status()).toBe(404);
  }
  expect((await context.request.post(`${origin}/wohnungssuche-api/search-profiles/`, { headers: auth(tokenB), data: { name: "Fremde Zuordnung", location_ids: [locationA.id] } })).status()).toBe(400);
  await page.getByRole("button", { name: "Neues Profil", exact: true }).click();
  await form.getByLabel("Name", { exact: true }).fill("Fiktives Profil B");
  await form.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.locator(".profile-card")).toHaveCount(1);
  await expect(page.locator(".profile-card")).toContainText("Fiktives Profil B");
  await navigate(page, "Abmelden");
  await login(page, origin, userA);
  await navigate(page, "Suchprofile");
  await expect(page.locator(".profile-card")).toHaveCount(1);
  await expect(page.locator(".profile-card")).toContainText("Fiktives Profil A geändert");
  page.on("dialog", dialog => dialog.accept());
  await page.locator(".location-card").getByRole("button", { name: "Ort löschen", exact: true }).click();
  await expect(page.locator(".location-card")).toHaveCount(0);
  await expect(page.locator(".profile-card")).toHaveCount(1);
  await expect(page.locator(".profile-card")).not.toContainText("Beispielstadt A");
  await page.locator(".profile-card").getByRole("button", { name: "Löschen", exact: true }).click();
  await expect(page.locator(".profile-card")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".profile-card")).toHaveCount(0);
  await expect(page.locator(".location-card")).toHaveCount(0);
});

test("validation, offline saves and an expired login never report a saved profile", async ({ page, context, housingServer }) => {
  const { origin } = housingServer;
  const username = `housing-errors-${randomUUID().slice(0, 8)}`;
  await register(page, origin, username);
  await login(page, origin, username);
  await navigate(page, "Suchprofile");
  await page.getByRole("button", { name: "Neues Profil", exact: true }).click();
  const form = page.locator(".profile-form");
  await form.getByLabel("Name", { exact: true }).fill("Fiktiver Entwurf erhalten");
  await form.getByLabel("Min. Zimmer", { exact: true }).fill("3");
  await form.getByLabel("Max. Zimmer", { exact: true }).fill("2");
  await form.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(form.locator(".error")).toBeVisible();
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("Fiktiver Entwurf erhalten");
  await expect(page.locator(".profile-card")).toHaveCount(0);
  await form.getByLabel("Max. Zimmer", { exact: true }).fill("4");
  await context.setOffline(true);
  await form.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(form.locator(".error")).toContainText(/nicht erreichbar|Verbindung|Netz/i);
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("Fiktiver Entwurf erhalten");
  await context.setOffline(false);
  await form.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.locator(".profile-card")).toContainText("Fiktiver Entwurf erhalten");
  await page.locator(".profile-card").getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await form.getByLabel("Name", { exact: true }).fill("Fiktiver Entwurf nach Sessionende");
  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect((await context.request.post(`${origin}/wohnungssuche-api/logout/`, { headers: auth(token) })).status()).toBe(204);
  await form.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(form.locator(".error")).toContainText(/Anmeldung.*abgelaufen/i);
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("Fiktiver Entwurf nach Sessionende");
  await expect(page.locator(".success")).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("token", "fictional-expired-token"));
  await page.reload();
  await expect(page.locator(".profile-card")).toHaveCount(0);
  await expect(page.getByText(/Anmeldung.*abgelaufen|erneut.*anmelden|Login erforderlich/i).first()).toBeVisible();
  await page.goto(`${origin}/wohnungssuche/login`);
  await page.getByRole("button", { name: "Dashboard im Demo-Modus ansehen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.locator(".listing-card")).toHaveCount(3);
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
});
