const { test: base, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");
const fs = require("node:fs");
const { wavFile } = require("./helpers/audio.cjs");

const test = base.extend({ recordingLocale: ["de", { option: true }] });

test.beforeEach(async ({ context, page, baseURL, recordingLocale }) => {
  await blockExternalRequests(context, baseURL);
  await page.route("**/api/session/activity/", route => route.fulfill({ json: { authenticated: true } }));
  await context.addInitScript(locale => localStorage.setItem("deutsch-live-locale", locale), recordingLocale);
  await page.route("**/deutschlive/api/auth/me/", route => route.fulfill({ json: { user: null } }));
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
});

test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

async function openPlayer(page) {
  await page.goto("/deutschlive/recordings");
  await expect(page.getByRole("heading", { name: "Meine Aufnahmen", exact: true })).toBeVisible();
  await expect(page.locator("#recording-files")).toBeEnabled();
}

test("local audio persists, plays, changes speed and downloads without any upload", async ({ page }, testInfo) => {
  const writes = [];
  page.on("request", request => { if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(request.url()); });
  await openPlayer(page);
  const file = wavFile();
  await page.locator("#recording-files").setInputFiles(file);
  await expect(page.getByRole("status")).toContainText("Aufnahme lokal gespeichert");
  await expect(page.locator("audio")).toHaveAttribute("src", /^blob:/);
  await expect.poll(() => page.locator("audio").evaluate(audio => audio.duration)).toBe(2);
  await page.locator("audio").evaluate(audio => { audio.muted = true; return audio.play(); });
  await expect.poll(() => page.locator("audio").evaluate(audio => audio.currentTime)).toBeGreaterThan(0);
  await page.locator("audio").evaluate(audio => audio.pause());
  await page.getByLabel("Tempo", { exact: true }).selectOption("0.75");
  expect(await page.locator("audio").evaluate(audio => audio.playbackRate)).toBe(.75);
  await page.getByRole("button", { name: "Aufnahme wiederholen", exact: true }).click();
  expect(await page.locator("audio").evaluate(audio => audio.loop)).toBe(true);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Herunterladen", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(file.name);
  expect(fs.readFileSync(await download.path())).toEqual(file.buffer);
  await page.reload();
  await expect(page.locator(".recording-library__list li")).toHaveCount(1);
  await expect.poll(() => page.locator("audio").evaluate(audio => audio.duration)).toBe(2);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
  const controls = await page.locator(".recording-player__controls button, .recording-library__list li > button:last-child")
    .evaluateAll(buttons => buttons.map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
  for (const control of controls) {
    expect(control.width).toBeGreaterThanOrEqual(44);
    expect(control.height).toBeGreaterThanOrEqual(44);
  }
  await testInfo.attach("local-recordings", { body: await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-local-recordings.png`), fullPage: true,
  }), contentType: "image/png" });
  const previousAudio = await page.locator("audio").evaluateHandle(audio => audio);
  await page.locator("audio").evaluate(audio => { audio.muted = true; return audio.play(); });
  await page.evaluate(() => {
    history.pushState({}, "", "/deutschlive/");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.locator("audio")).toHaveCount(0);
  expect(await previousAudio.evaluate(audio => audio.paused)).toBe(true);
  await previousAudio.dispose();
  expect(writes).toEqual([]);
});

test("playlist search, previous and next, deletion and invalid files", async ({ page }) => {
  await openPlayer(page);
  await page.locator("#recording-files").setInputFiles([wavFile("Dialog.wav"), wavFile("Aussprache.wav")]);
  await expect(page.locator(".recording-library__list li")).toHaveCount(2);
  await expect(page.locator(".recording-player h3")).toHaveText("Aussprache");
  await page.getByRole("button", { name: "Nächste Aufnahme", exact: true }).click();
  await expect(page.locator(".recording-player h3")).toHaveText("Dialog");
  await page.getByRole("button", { name: "Vorherige Aufnahme", exact: true }).click();
  await expect(page.locator(".recording-player h3")).toHaveText("Aussprache");
  await page.getByLabel("Aufnahmen suchen", { exact: true }).fill("Dialog");
  await expect(page.locator(".recording-library__list li")).toHaveCount(1);
  await page.getByLabel("Aufnahmen suchen", { exact: true }).fill("");
  await page.getByRole("button", { name: "Aus der Sammlung entfernen: Aussprache", exact: true }).click();
  await expect(page.locator(".recording-player h3")).toHaveText("Dialog");
  await page.locator("#recording-files").setInputFiles({ name: "Text.txt", mimeType: "text/plain", buffer: Buffer.from("Text") });
  await expect(page.getByRole("alert")).toContainText("Audiodateien");
  await expect(page.locator(".recording-library__list li")).toHaveCount(1);
  await page.getByRole("button", { name: "Aus der Sammlung entfernen: Dialog", exact: true }).click();
  await expect(page.locator("audio")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Noch keine Aufnahmen.", { exact: false })).toBeVisible();
});

test("each account and guest mode has a separate local collection", async ({ page }) => {
  let user = { id: 101, username: "Anna", settings: { interfaceLanguage: "de" } };
  await page.unroute("**/deutschlive/api/auth/me/");
  await page.route("**/deutschlive/api/auth/me/", route => route.fulfill({ json: { user } }));
  await openPlayer(page);
  await expect(page.locator(".app-nav__account-button").first()).toContainText("Anna");
  await page.locator("#recording-files").setInputFiles(wavFile("Anna.wav"));
  await expect(page.locator(".recording-player h3")).toHaveText("Anna");
  user = { id: 102, username: "Boris", settings: { interfaceLanguage: "de" } };
  await page.reload();
  await expect(page.locator(".app-nav__account-button").first()).toContainText("Boris");
  await expect(page.locator(".recording-library__list li")).toHaveCount(0);
  user = null;
  await page.reload();
  await expect(page.locator("#recording-files")).toBeEnabled();
  await expect(page.locator(".recording-library__list li")).toHaveCount(0);
  user = { id: 101, username: "Anna", settings: { interfaceLanguage: "de" } };
  await page.reload();
  await expect(page.locator(".recording-player h3")).toHaveText("Anna");
});

test("unavailable local storage shows an actionable error", async ({ context, page }) => {
  await context.addInitScript(() => Object.defineProperty(window, "indexedDB", { value: undefined }));
  await page.goto("/deutschlive/recordings");
  await expect(page.getByRole("alert")).toContainText("lokale Speicherung");
  await expect(page.locator("#recording-files")).toBeDisabled();
});

for (const operation of ["add", "delete"]) {
  test(`an aborted recording ${operation} leaves the collection intact and can be retried`, async ({ page }) => {
    await openPlayer(page);
    await page.locator("#recording-files").setInputFiles(wavFile("Vorhandene Aufnahme.wav"));
    await expect(page.locator(".recording-player h3")).toHaveText("Vorhandene Aufnahme");
    await page.evaluate(operation => {
      const original = IDBObjectStore.prototype[operation];
      IDBObjectStore.prototype[operation] = function (...args) {
        const request = original.apply(this, args);
        IDBObjectStore.prototype[operation] = original;
        this.transaction.abort();
        return request;
      };
    }, operation);
    const remove = page.getByRole("button", { name: "Aus der Sammlung entfernen: Vorhandene Aufnahme", exact: true });
    if (operation === "add") await page.locator("#recording-files").setInputFiles(wavFile("Neue Aufnahme.wav"));
    else await remove.click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator(".recording-library__list li")).toHaveCount(1);
    await expect(page.locator(".recording-player h3")).toHaveText("Vorhandene Aufnahme");
    await expect(page.locator("#recording-files")).toBeEnabled();
    await expect(remove).toBeEnabled();
    if (operation === "add") {
      await page.locator("#recording-files").setInputFiles(wavFile("Neue Aufnahme.wav"));
      await expect(page.locator(".recording-library__list li")).toHaveCount(2);
    } else {
      await remove.click();
      await expect(page.locator(".recording-library__list li")).toHaveCount(0);
    }
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("#recording-files")).toBeEnabled();
    await expect(page.locator(".recording-library__list li")).toHaveCount(operation === "add" ? 2 : 0);
  });
}

test.describe("Russian recordings", () => {
  test.use({ recordingLocale: "ru" });

  test("Russian interface and old player URL open the integrated module", async ({ page }) => {
    await page.goto("/deutschLive/recordings");
    await expect(page).toHaveURL(/\/deutschlive\/recordings$/);
    await expect(page.getByRole("heading", { name: "Мои записи", exact: true })).toBeVisible();
    await expect(page.getByText("Записи остаются в этом браузере", { exact: false })).toBeVisible();
  });
});
