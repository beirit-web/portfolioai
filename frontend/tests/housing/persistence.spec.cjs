const { test: base, expect } = require("@playwright/test");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { blockExternalRequests } = require("../browser/helpers/network.cjs");

const workspace = path.resolve(__dirname, "../../..");
const localPython = path.join(workspace, "server/.venv/bin/python");
const python = fs.existsSync(localPython) ? localPython : "python3";

// Each browser worker owns a disposable database. Only its Django child is
// restarted; the same database and signing key survive that real process restart.
const test = base.extend({
  housingServer: [async ({}, use, workerInfo) => {
    const port = 8870 + workerInfo.workerIndex;
    const origin = `http://127.0.0.1:${port}`;
    const child = spawn(python, ["scripts/run_housing_browser_checks.py", "--port", String(port), "--control-stdin"], {
      cwd: workspace, stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    let generation = 1;
    let spawnError;
    let controlOutput = "";
    const controlReplies = new Map();
    const exited = new Promise(resolve => {
      child.once("error", error => { spawnError = error; resolve(); });
      child.once("exit", resolve);
    });
    const isRunning = () => child.pid !== undefined && child.exitCode === null && child.signalCode === null;
    child.stdout.on("data", data => {
      output = (output + data).slice(-20000);
      controlOutput += data;
      const lines = controlOutput.split("\n");
      controlOutput = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("HOUSING_BROWSER_CONTROL ")) continue;
        const reply = JSON.parse(line.slice("HOUSING_BROWSER_CONTROL ".length));
        controlReplies.set(reply.id, reply);
      }
    });
    child.stderr.on("data", data => { output = (output + data).slice(-20000); });
    async function ready(generation = 1) {
      await expect.poll(async () => {
        if (spawnError) throw new Error(`Could not start disposable housing server: ${spawnError.message}`);
        if (!isRunning()) throw new Error(`Disposable housing server exited (${child.signalCode || child.exitCode}): ${output}`);
        if (!output.includes(`HOUSING_BROWSER_STARTED generation=${generation} `)) return false;
        try {
          const response = await fetch(`${origin}/wohnungssuche/`, { signal: AbortSignal.timeout(2000) });
          await response.body?.cancel();
          return response.ok;
        } catch { return false; }
      }, { timeout: 90000, intervals: [100, 250, 500] }).toBe(true);
    }
    try {
      await ready();
      await use({
        origin,
        restart: async () => { generation += 1; child.kill("SIGUSR1"); await ready(generation); },
        verificationLink: async username => {
          const id = randomUUID();
          child.stdin.write(`${JSON.stringify({ id, command: "verification_link", username })}\n`);
          await expect.poll(() => {
            if (!isRunning()) throw new Error(`Disposable housing server exited: ${output}`);
            return controlReplies.has(id);
          }, { timeout: 20000 }).toBe(true);
          const reply = controlReplies.get(id);
          controlReplies.delete(id);
          if (reply.error) throw new Error(`Cannot confirm fictional test account: ${reply.error}`);
          expect(new URL(reply.url).origin).toBe(origin);
          expect(new URL(reply.url).pathname).toMatch(/^\/verify-email\//);
          return reply.url;
        },
      });
    } finally {
      if (isRunning()) {
        child.kill("SIGTERM");
        const killTimer = setTimeout(() => child.kill("SIGKILL"), 10000);
        try { await exited; } finally { clearTimeout(killTimer); }
      }
    }
  }, { scope: "worker", timeout: 120000 }],
});

async function navigate(page, name) {
  const opener = page.getByRole("button", { name: "Navigation-Menü öffnen", exact: true });
  if (await opener.isVisible()) await opener.click();
  await page.locator(".sidebar").getByRole("button", { name, exact: true }).click();
}

async function register(page, { origin, verificationLink }, username) {
  await page.goto(`${origin}/wohnungssuche/register`);
  const form = page.locator(".login-panel");
  await form.getByLabel("Nutzername", { exact: true }).fill(username);
  await form.getByLabel("E-Mail-Adresse", { exact: true }).fill(`${username}@example.invalid`);
  await form.getByLabel("Passwort", { exact: true }).fill("Fictional-Housing-42!");
  await form.getByLabel("Passwort wiederholen", { exact: true }).fill("Fictional-Housing-42!");
  const saved = page.waitForResponse(response => response.url().endsWith("/wohnungssuche-api/register/") && response.request().method() === "POST");
  await form.getByRole("button", { name: "Konto erstellen", exact: true }).click();
  const registered = await saved;
  expect(registered.status()).toBe(201);
  expect(await registered.json()).toMatchObject({ emailVerificationRequired: true });
  await expect(form.getByRole("status")).toContainText(/E-Mail/i);
  await expect(form.getByRole("status")).toContainText(/bestätig/i);
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();

  await page.goto(`${origin}/wohnungssuche/login`);
  await page.getByLabel("Nutzername", { exact: true }).fill(username);
  await page.getByLabel("Passwort", { exact: true }).fill("Fictional-Housing-42!");
  const rejected = page.waitForResponse(response => response.url().endsWith("/wohnungssuche-api/token-auth/") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Einloggen", exact: true }).click();
  const denied = await rejected;
  expect(denied.status()).toBe(403);
  const rejectedPayload = await denied.json();
  expect(rejectedPayload).toMatchObject({ code: "email_verification_required" });
  expect(rejectedPayload).not.toHaveProperty("token");
  await expect(page.getByRole("alert")).toContainText(/bestätig/i);
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();

  await page.goto(await verificationLink(username));
  await expect(page).toHaveURL(`${origin}/wohnungssuche/login`);
  await expect(page.locator(".login-panel")).toBeVisible();
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
  await blockExternalRequests(context, origin);
  const suffix = randomUUID().slice(0, 8);
  const userA = `housing-a-${suffix}`, userB = `housing-b-${suffix}`;
  await register(page, housingServer, userA);
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
  await expect(form.getByLabel("Min. Zimmer", { exact: true })).toHaveValue("2.5");
  await expect(form.getByLabel("Max. Zimmer", { exact: true })).toHaveValue("4");
  await expect(form.getByLabel("Max Warmmiete", { exact: true })).toHaveValue("1200");
  await expect(form.getByLabel("Balkon", { exact: true })).toBeChecked();
  await expect(form.getByLabel("Musterstadt A (15 km)", { exact: true })).toBeChecked();
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
  await register(page, housingServer, userB);
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
  await blockExternalRequests(context, origin);
  const username = `housing-errors-${randomUUID().slice(0, 8)}`;
  await register(page, housingServer, username);
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
