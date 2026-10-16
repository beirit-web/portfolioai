const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");
const { wavFile } = require("./helpers/audio.cjs");
const fs = require("node:fs");

test("learning links stay local while earlier recordings remain downloadable", async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  await context.addInitScript(() => localStorage.setItem("deutsch-live-locale", "de"));
  const redirect = await page.request.get("/deutschlive/recordings?lang=de", { maxRedirects: 0 });
  expect(redirect.status()).toBe(200);
  expect(redirect.headers().location).toBeUndefined();
  await page.goto("/deutschlive/recordings-archiv");
  await expect(page.getByRole("heading", { name: "Meine Aufnahmen", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("nicht automatisch übertragen");
  // Seed an earlier collection in its existing database, then reopen the archive.
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("deutschlive-recordings-v1", 1);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("recordings", "readwrite");
      transaction.objectStore("recordings").put({
        id: "previous-recording", ownerKey: "guest", name: "Bisherige Aufnahme", filename: "alte-aufnahme.wav",
        createdAt: Date.now(), blob: new Blob(["local archive"], { type: "audio/wav" }),
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    };
    request.onerror = () => reject(request.error);
  }));
  await page.reload();
  await expect(page.locator(".recording-player h3")).toHaveText("Bisherige Aufnahme");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Herunterladen", exact: true }).click();
  const archiveDownload = await download;
  expect(archiveDownload.suggestedFilename()).toBe("alte-aufnahme.wav");
  expect(fs.readFileSync(await archiveDownload.path(), "utf8")).toBe("local archive");
  await page.goto("/deutschlive/recordings");
  await expect(page.locator("#recording-files")).toBeEnabled();
  // Both current routes use the same app and preserve the earlier collection.
  await expect(page.locator(".recording-library__list li")).toHaveCount(1);
  await expect(page.locator(".recording-player h3")).toHaveText("Bisherige Aufnahme");
  await page.locator("#recording-files").setInputFiles(wavFile("Neue Aufnahme.wav"));
  await expect(page.locator(".recording-player h3")).toHaveText("Neue Aufnahme");
  await page.reload();
  await expect(page.locator(".recording-library__list li")).toHaveCount(2);
  await expect(page.locator(".recording-player h3")).toHaveText("Neue Aufnahme");
  await page.goto("/deutschlive/recordings-archiv");
  await expect(page.locator(".recording-library__list li")).toHaveCount(2);
  await expect(page.locator(".recording-library__list li")).toContainText(["Neue Aufnahme", "Bisherige Aufnahme"]);
});
