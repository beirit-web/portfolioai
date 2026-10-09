const { chromium, expect } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const { randomUUID, randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const server = path.resolve(__dirname, "../../server");
const base = process.env.SHOP_BASE_URL || "http://127.0.0.1:8000";
const screenshots = process.env.SHOP_SCREENSHOT_DIR || "/tmp/shop-check";
const email = `shop-check-${randomUUID()}@example.test`;
const password = randomBytes(24).toString("base64url");
const env = { ...process.env, SHOP_TEST_EMAIL: email, SHOP_TEST_PASSWORD: password };
function django(code) {
  return execFileSync(path.join(server, ".venv/bin/python"), ["manage.py", "shell", "-c", code], { cwd: server, env, encoding: "utf8", timeout: 60000 }).trim();
}
async function layout(page) {
  const width = page.viewportSize().width;
  const result = await page.evaluate(() => ({ width: document.documentElement.scrollWidth,
    brandRight: document.querySelector(".brand").getBoundingClientRect().right,
    actionsLeft: document.querySelector(".header-actions").getBoundingClientRect().left,
    bounds: [...document.querySelectorAll("main input:not([type=hidden]), main select, main textarea, main .button, main .icon-button, .product-card")]
      .filter(element => element.getClientRects().length).map(element => element.getBoundingClientRect().toJSON()) }));
  expect(result.width).toBeLessThanOrEqual(width);
  expect(result.brandRight).toBeLessThanOrEqual(result.actionsLeft);
  for (const bounds of result.bounds) {
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(width + 1);
  }
}
async function contact(page, date, delivery = false) {
  await page.locator("#id_customer_name").fill("Shop Browserprüfung");
  await page.locator("#id_customer_email").fill(email);
  await page.locator("#id_requested_date").fill(date);
  await page.locator("#id_customer_note").fill("Testanfrage, wird automatisch entfernt.");
  if (delivery) {
    await page.getByLabel("Lokale Lieferung", { exact: true }).check();
    await page.locator("#id_delivery_address").fill("Teststraße 12");
    await page.locator("#id_postal_code").fill("10115");
    await page.locator("#id_city").fill("Berlin");
  }
}

(async () => {
  fs.mkdirSync(screenshots, { recursive: true });
  let browser;
  let created = false;
  try {
    const info = JSON.parse(django(`
import os, json
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from shop.models import CakeProduct
p = CakeProduct.objects.get(sku='BK-ERD-001')
get_user_model().objects.create_user(username=os.environ['SHOP_TEST_EMAIL'], email=os.environ['SHOP_TEST_EMAIL'], password=os.environ['SHOP_TEST_PASSWORD'])
print(json.dumps({'id': p.pk, 'name': p.name, 'slug': p.slug, 'price': str(p.price), 'date': (timezone.localdate() + timedelta(days=max(3, p.lead_time_days))).isoformat(), 'today': timezone.localdate().isoformat()}))
`));
    created = true;
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "de-DE", isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/static/portfolio/online-shop/index.html`);
    await page.waitForURL("**/shop/");
    await expect(page.locator(".product-card")).toHaveCount(22);
    await page.locator(".product-card img").evaluateAll(images => images.forEach(image => { image.loading = "eager"; }));
    await expect.poll(() => page.locator(".product-card img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    await layout(page);
    await page.locator("input[name=q]").fill("Erdbeer");
    await page.getByRole("button", { name: "Produkte filtern" }).click();
    await expect(page.locator(".product-card")).toHaveCount(1);
    await page.getByRole("link", { name: "Filter zurücksetzen" }).click();
    await page.getByLabel("Kategorie", { exact: true }).selectOption("stueck");
    await page.getByLabel("Sortierung", { exact: true }).selectOption("priceAsc");
    await page.getByRole("button", { name: "Produkte filtern" }).click();
    await expect(page.locator(".product-card")).toHaveCount(2);
    await page.getByLabel("Kategorie", { exact: true }).selectOption("kuchen");
    await page.getByRole("button", { name: "Produkte filtern" }).click();
    await expect(page.locator(".product-card")).toHaveCount(7);
    await page.goto(`${base}/shop/`);
    await page.locator(`[data-product-id="${info.id}"]`).getByRole("button", { name: `${info.name} in den Warenkorb` }).click();
    await expect(page.locator(".mobile-cart-bar")).toBeVisible();
    await page.locator(".mobile-cart-bar").click();
    await expect(page.locator(".cart-item")).toHaveCount(1);
    await page.getByRole("button", { name: "Menge erhöhen" }).click();
    await expect(page.locator("input[name=quantity]")).toHaveValue("2");
    await page.reload();
    await expect(page.locator("input[name=quantity]")).toHaveValue("2");
    await page.getByRole("link", { name: "Zur Bestellanfrage" }).click();
    await contact(page, info.today);
    await page.locator("#id_customer_email").fill("bad");
    await page.getByRole("button", { name: "Bestellanfrage senden" }).click();
    await expect(page.locator("#id_customer_email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#id_requested_date")).toHaveAttribute("aria-invalid", "true");
    await contact(page, info.date, true);
    await expect(page.locator("#deliveryFee")).toContainText("8,90");
    expect(await page.locator(".submit-request").evaluate(button => button.getBoundingClientRect().top >= document.querySelector(".summary-total").getBoundingClientRect().bottom)).toBe(true);
    const token = await page.locator("input[name=request_key]").inputValue();
    const csrf = await page.locator("input[name=csrfmiddlewaretoken]").inputValue();
    await page.screenshot({ path: path.join(screenshots, "checkout-390.png"), fullPage: true });
    await page.getByRole("button", { name: "Bestellanfrage senden" }).click();
    await page.waitForURL("**/shop/anfragen/BK-*/");
    const guestUrl = page.url();
    await expect(page.getByRole("heading", { name: "Anfrage gespeichert" })).toBeVisible();
    await expect(page.locator(".summary-total")).toContainText(new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2 }).format(Number(info.price) * 2 + 8.9));
    expect((await context.request.post(`${base}/shop/anfrage/`, { form: { request_key: token, csrfmiddlewaretoken: csrf } })).url()).toBe(guestUrl);
    await page.goto(`${base}/shop/warenkorb/`);
    await expect(page.getByRole("heading", { name: "Dein Warenkorb ist leer" })).toBeVisible();
    const stranger = await browser.newContext();
    expect((await stranger.request.get(guestUrl)).status()).toBe(404);
    await stranger.close();

    await page.goto(`${base}/shop/anfragen/`);
    await page.locator("#id_username").fill(email);
    await page.locator("#id_password").fill(password);
    await page.locator("form:has(#id_password) [type=submit]").click();
    await page.waitForURL("**/shop/anfragen/");
    await expect(page.getByRole("heading", { name: "Noch keine Anfragen" })).toBeVisible();
    await page.goto(`${base}/shop/artikel/${info.slug}/`);
    await expect(page.locator(".ingredient-section")).toContainText("Allergene");
    await page.locator("#productQuantity").fill("2");
    await page.getByRole("button", { name: "In den Warenkorb" }).click();
    await page.getByRole("link", { name: "Zur Bestellanfrage" }).click();
    await contact(page, info.date);
    await page.getByRole("button", { name: "Bestellanfrage senden" }).click();
    await page.waitForURL("**/shop/anfragen/BK-*/");
    const ownedUrl = page.url();
    await page.goto(`${base}/shop/anfragen/`);
    await expect(page.locator(".order-row")).toHaveCount(1);

    const storage = await context.storageState();
    const noJs = await browser.newContext({ javaScriptEnabled: false, storageState: storage, viewport: { width: 320, height: 700 } });
    const noJsPage = await noJs.newPage();
    await noJsPage.goto(`${base}/shop/artikel/${info.slug}/`);
    await noJsPage.getByRole("button", { name: "In den Warenkorb" }).click();
    await noJsPage.locator("input[name=quantity]").fill("3");
    await noJsPage.getByRole("button", { name: "Menge speichern" }).click();
    await expect(noJsPage.locator("input[name=quantity]")).toHaveValue("3");
    await noJsPage.getByRole("link", { name: "Zur Bestellanfrage" }).click();
    await contact(noJsPage, info.date);
    await noJsPage.getByRole("button", { name: "Bestellanfrage senden" }).click();
    await noJsPage.waitForURL("**/shop/anfragen/BK-*/");
    await expect(noJsPage.getByRole("heading", { name: "Anfrage gespeichert" })).toBeVisible();
    await noJs.close();
    await page.goto(`${base}/shop/artikel/${info.slug}/`);
    await page.getByRole("button", { name: "In den Warenkorb" }).click();
    const saved = await context.storageState();
    expect(errors).toEqual([]);
    console.log("Redirect, catalog, photos, filters, cart, steppers, persistence, validation, delivery, saved requests, retries, private receipts, login, account history and no-JavaScript passed.");

    for (const [width, height, deviceScaleFactor = 1] of [[280,700], [320,700], [390,844], [768,1024], [844,390], [1024,768], [1440,1000], [1920,1080], [2560,1440], [3840,2160], [2560,1440,1.5], [1920,1080,2]]) {
      const responsive = await browser.newContext({ viewport: { width, height }, deviceScaleFactor, storageState: saved, locale: "de-DE" });
      const tab = await responsive.newPage();
      for (const [view, url] of [["catalog", `${base}/shop/`], ["product", `${base}/shop/artikel/${info.slug}/`],
        ["cart", `${base}/shop/warenkorb/`], ["checkout", `${base}/shop/anfrage/`], ["orders", `${base}/shop/anfragen/`], ["receipt", ownedUrl]]) {
        await tab.goto(url);
        await layout(tab);
        if (view === "catalog" && width >= 1800) {
          const grid = await tab.locator(".product-grid").evaluate(element => ({
            columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
            mainWidth: document.querySelector("main").getBoundingClientRect().width,
            cardWidth: element.querySelector(".product-card").getBoundingClientRect().width,
            brandLeft: document.querySelector(".brand").getBoundingClientRect().left,
            navLeft: parseFloat(getComputedStyle(document.querySelector(".shop-nav > div")).paddingLeft),
          }));
          expect(grid.columns).toBe(width >= 3000 ? 8 : width >= 2200 ? 6 : 5);
          expect(grid.mainWidth).toBeGreaterThan(width * .9);
          expect(grid.cardWidth).toBeGreaterThanOrEqual(300);
          expect(Math.abs(grid.brandLeft - grid.navLeft)).toBeLessThan(1);
        }
        const navigation = await tab.locator(".shop-nav > div").evaluate(element => ({
          marginLeft: getComputedStyle(element).marginLeft,
          marginRight: getComputedStyle(element).marginRight,
          justifyContent: getComputedStyle(element).justifyContent,
          width: element.getBoundingClientRect().width,
          headerHeight: document.querySelector(".shop-header").getBoundingClientRect().height,
          brandFontSize: parseFloat(getComputedStyle(document.querySelector(".brand h1")).fontSize),
          navFontSize: parseFloat(getComputedStyle(element.querySelector("a")).fontSize),
        }));
        expect(navigation.marginLeft).toBe("0px");
        expect(navigation.marginRight).toBe("0px");
        expect(navigation.justifyContent).toBe("flex-end");
        expect(navigation.width).toBe(width);
        if (width >= 3000) {
          expect(navigation.headerHeight).toBeGreaterThanOrEqual(108);
          expect(navigation.brandFontSize).toBe(32);
        }
        if (width >= 3000 || (width >= 2000 && deviceScaleFactor >= 1.5) || (width >= 1600 && deviceScaleFactor >= 2)) {
          expect(navigation.navFontSize).toBe(40);
        } else if (width >= 900) {
          expect(navigation.navFontSize).toBe(13);
        }
        if (view === "catalog" || view === "product") {
          await expect.poll(() => tab.locator(".product-photo img").first().evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
        }
        if (view === "checkout") {
          await tab.getByLabel("Lokale Lieferung", { exact: true }).check();
          await layout(tab);
        }
        await tab.screenshot({ path: path.join(screenshots, `${view}-${width}${deviceScaleFactor > 1 ? `-${deviceScaleFactor}x` : ""}.png`), fullPage: false });
      }
      await responsive.close();
      console.log(`Responsive views ${width} x ${height}, pixel ratio ${deviceScaleFactor} passed.`);
    }
    await context.close();
    console.log(`All Shop checks passed. Screenshots: ${screenshots}`);
  } finally {
    if (browser) await browser.close();
    if (created) django(`
import os
from django.contrib.auth import get_user_model
from shop.models import CakeOrder
CakeOrder.objects.filter(customer_email=os.environ['SHOP_TEST_EMAIL']).delete()
get_user_model().objects.filter(username=os.environ['SHOP_TEST_EMAIL']).delete()
`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
