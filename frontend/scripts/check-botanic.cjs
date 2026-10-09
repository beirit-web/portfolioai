const { chromium, expect } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const { randomUUID, randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const serverDir = path.resolve(__dirname, "../../server");
const baseUrl = process.env.BOTANIC_BASE_URL || "http://127.0.0.1:8000";
const screenshots = process.env.BOTANIC_SCREENSHOT_DIR || "/tmp/botanic-check";
const email = `botanic-check-${randomUUID()}@example.test`;
const password = randomBytes(24).toString("base64url");
const env = { ...process.env, BOTANIC_TEST_EMAIL: email, BOTANIC_TEST_PASSWORD: password };

function django(code) {
  return execFileSync(path.join(serverDir, ".venv/bin/python"), ["manage.py", "shell", "-c", code],
    { cwd: serverDir, env, encoding: "utf8", timeout: 60000 }).trim();
}

async function assertLayout(page) {
  const width = page.viewportSize().width;
  const result = await page.evaluate(() => {
    const brand = document.querySelector(".brand").getBoundingClientRect();
    const account = document.querySelector(".account-actions").getBoundingClientRect();
    const bounds = [...document.querySelectorAll("main input:not([type=hidden]), main select, main textarea, main .button, main .icon-button, .species-card")]
      .filter(element => element.getClientRects().length).map(element => element.getBoundingClientRect().toJSON());
    return { scrollWidth: document.documentElement.scrollWidth, brandRight: brand.right, accountLeft: account.left, bounds };
  });
  expect(result.scrollWidth).toBeLessThanOrEqual(width);
  expect(result.brandRight).toBeLessThanOrEqual(result.accountLeft);
  for (const item of result.bounds) {
    expect(item.x).toBeGreaterThanOrEqual(0);
    expect(item.right).toBeLessThanOrEqual(width + 1);
  }
}

async function login(page) {
  await page.locator("#id_username").fill(email);
  await page.locator("#id_password").fill(password);
  await page.locator("form:has(#id_password) [type=submit]").click();
  await page.waitForURL("**/botanic/**");
}

async function savePlant(page, { name, interval, due, paused = false }) {
  await page.goto(`${baseUrl}/botanic/arten/122521/`);
  await expect(page.locator("#id_watering_interval")).toHaveValue("10");
  await page.locator("#id_nickname").fill(name);
  await page.locator("#id_location").fill("Wohnzimmer am sehr langen Fensterbrett");
  if (interval) await page.locator("#id_watering_interval").fill(String(interval));
  await page.locator("#id_next_watering").fill(due);
  if (paused) await page.locator("#id_paused").check();
  await page.locator("#id_notes").fill("Browserpruefung: Notiz bleibt gespeichert.");
  await page.locator("#plantForm [type=submit]").click();
  await page.waitForURL("**/botanic/?tab=plants");
  const row = page.locator(".owned-plant").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(row).toBeVisible();
  return row.getAttribute("data-plant-id");
}

async function workflow(browser, dates) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${baseUrl}/static/portfolio/enbt-botanic/index.html`);
  await page.waitForURL("**/botanic/");
  await expect(page.locator(".species-card")).toHaveCount(12);
  const firstPhoto = page.locator(".species-card img").first();
  await expect.poll(() => firstPhoto.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.locator(".species-card .photo-credit").first().locator("summary").click();
  await expect(page.locator(".species-card .photo-credit[open]")).toContainText("CC-BY");
  await assertLayout(page);
  await page.screenshot({ path: path.join(screenshots, "guest-search-390.png"), fullPage: false });
  const searchResponse = await context.request.get(`${baseUrl}/botanic/api/suche/?q=Monstera`);
  expect(searchResponse.status()).toBe(200);
  expect((await searchResponse.json()).results.length).toBe(12);
  expect((await context.request.get(`${baseUrl}/botanic/api/suche/?q=x`)).status()).toBe(400);

  await page.goto(`${baseUrl}/botanic/arten/122521/`);
  await expect(page.locator(".care-guidance")).toContainText("7–10 Tage");
  await expect(page.locator("#plantForm")).toHaveCount(0);
  await page.getByRole("link", { name: "Anmelden & speichern" }).click();
  await login(page);
  await expect(page.locator("#plantForm")).toBeVisible();
  const firstId = await savePlant(page, { name: "Meine große Monstera neben dem sonnigen Wohnzimmerfenster", interval: 10, due: dates.yesterday });
  const secondId = await savePlant(page, { name: "Monstera im Büro", interval: 7, due: dates.plus2 });
  const pausedId = await savePlant(page, { name: "Monstera in Winterpause", interval: 14, due: "", paused: true });
  await page.reload();
  await expect(page.locator(".owned-plant")).toHaveCount(3);
  await page.locator('input[name="q"]').fill("Winterpause");
  await page.getByRole("button", { name: "Sammlung filtern" }).click();
  await expect(page.locator(".owned-plant")).toHaveCount(1);

  await page.goto(`${baseUrl}/botanic/?tab=watering`);
  await expect(page.locator(".owned-plant")).toHaveCount(1);
  await expect(page.locator(".status--overdue")).toBeVisible();
  await page.getByRole("button", { name: /als gegossen markieren/ }).click();
  await expect(page.locator(".message")).toContainText("Gießen für heute eingetragen");
  await expect(page.locator(".owned-plant")).toHaveCount(0);
  await page.goto(`${baseUrl}/botanic/pflanzen/${firstId}/`);
  await expect(page.locator("#id_next_watering")).toHaveValue(dates.plus10);
  await expect(page.locator(".watering-history li")).toHaveCount(1);
  await expect(page.locator("#id_notes")).toHaveValue("Browserpruefung: Notiz bleibt gespeichert.");
  await page.locator("#id_watering_interval").fill("0");
  await page.locator("#plantForm [type=submit]").click();
  await expect(page.locator("#id_watering_interval")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#id_watering_interval")).toBeFocused();
  await page.locator("#id_watering_interval").fill("8");
  await page.locator("#id_paused").check();
  await page.locator("#plantForm [type=submit]").click();
  await page.goto(`${baseUrl}/botanic/?tab=watering&filter=paused`);
  await expect(page.locator(".owned-plant")).toHaveCount(2);
  await page.goto(`${baseUrl}/botanic/pflanzen/${firstId}/`);
  await page.locator("#id_paused").uncheck();
  await page.locator("#plantForm [type=submit]").click();

  await page.goto(`${baseUrl}/botanic/?tab=watering&filter=all`);
  const second = page.locator(`[data-plant-id="${secondId}"]`);
  await second.locator(".snooze-menu summary").click();
  await second.getByRole("button", { name: "+ 3 Tage" }).click();
  await page.goto(`${baseUrl}/botanic/pflanzen/${secondId}/`);
  await expect(page.locator("#id_next_watering")).toHaveValue(dates.plus5);
  await page.goto(`${baseUrl}/botanic/?tab=watering&filter=all`);
  await page.locator(`[data-plant-id="${firstId}"]`).getByRole("button", { name: /als gegossen markieren/ }).click();
  await expect(page.locator(".message")).toContainText("bereits ein Gießvorgang");
  await page.goto(`${baseUrl}/botanic/pflanzen/${firstId}/`);
  await expect(page.locator("#id_next_watering")).toHaveValue(dates.plus10);
  await expect(page.locator(".watering-history li")).toHaveCount(1);

  const storage = await context.storageState();
  const noJs = await browser.newContext({ javaScriptEnabled: false, storageState: storage, viewport: { width: 320, height: 700 } });
  const noJsPage = await noJs.newPage();
  const noJsId = await savePlant(noJsPage, { name: "Pflanze ohne JavaScript", interval: 12, due: dates.today });
  await noJsPage.goto(`${baseUrl}/botanic/pflanzen/${noJsId}/`);
  await noJsPage.locator(".delete-block summary").click();
  await noJsPage.getByRole("button", { name: "Endgültig entfernen" }).click();
  await expect(noJsPage.locator(".owned-plant")).toHaveCount(3);
  await noJs.close();

  await page.goto(`${baseUrl}/botanic/pflanzen/${pausedId}/`);
  await page.locator(".delete-block summary").click();
  await page.getByRole("button", { name: "Endgültig entfernen" }).click();
  await expect(page.locator(".owned-plant")).toHaveCount(2);
  expect(errors).toEqual([]);
  console.log("Search, photo licensing, login return, saving, reload, filtering, watering, history, validation, pause/resume, snooze, duplicate protection, deletion and no-JavaScript passed.");
  await context.close();
  return { storage, firstId };
}

async function responsive(browser, storage, firstId) {
  for (const [width, height] of [[280,700], [320,700], [390,844], [768,1024], [844,390], [1024,768], [1440,1000], [1920,1080]]) {
    const context = await browser.newContext({ viewport: { width, height }, storageState: storage });
    const page = await context.newPage();
    for (const [view, url] of [["search", "/botanic/?tab=search"], ["plants", "/botanic/?tab=plants"],
      ["watering", "/botanic/?tab=watering&filter=all"], ["detail", `/botanic/pflanzen/${firstId}/`]]) {
      await page.goto(baseUrl + url);
      await assertLayout(page);
      if (view === "search") {
        await expect.poll(() => page.locator(".species-card img").first().evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
      }
      await page.screenshot({ path: path.join(screenshots, `${view}-${width}.png`), fullPage: false });
    }
    await context.close();
    console.log(`Responsive views: ${width} x ${height} passed.`);
  }
}

(async () => {
  fs.mkdirSync(screenshots, { recursive: true });
  let browser;
  let created = false;
  try {
    const dates = JSON.parse(django(`
import json, os
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from botanic.api import get_species
get_species(122521)
get_user_model().objects.create_user(username=os.environ['BOTANIC_TEST_EMAIL'], email=os.environ['BOTANIC_TEST_EMAIL'], password=os.environ['BOTANIC_TEST_PASSWORD'])
today = timezone.localdate()
print(json.dumps({key: (today + timedelta(days=offset)).isoformat() for key, offset in [('today', 0), ('yesterday', -1), ('plus2', 2), ('plus5', 5), ('plus10', 10)]}))
`));
    created = true;
    browser = await chromium.launch({ headless: true });
    const { storage, firstId } = await workflow(browser, dates);
    await responsive(browser, storage, firstId);
    console.log(`All Botanic checks passed. Screenshots: ${screenshots}`);
  } finally {
    if (browser) await browser.close();
    if (created) django("import os; from django.contrib.auth import get_user_model; get_user_model().objects.filter(username=os.environ['BOTANIC_TEST_EMAIL']).delete()");
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
