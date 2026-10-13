const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const baseUrl = process.env.CONTRACTS_BASE_URL || "http://localhost:8000";
const screenshotDir = process.env.CONTRACTS_SCREENSHOT_DIR || "/tmp/contract-editor-check";
const logoPath = path.resolve(__dirname, "../../server/assets/images/beirit-digital-logo-160.webp");

async function ready(page) {
  await expect(page.locator("body")).toHaveClass(/is-enhanced/);
  await expect(page.locator("#contractPreview")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("#statusBadge")).not.toHaveText("Vorschau nicht aktuell");
}

async function group(page, key) {
  if (page.viewportSize().width < 1024) await page.locator("#formTab").click();
  await page.locator(`#stepList [data-group="${key}"] button`).click();
}

async function menuAction(page, menu, action) {
  await page.locator(`#${menu} summary`).click();
  await page.locator(`#${action}`).click();
}

async function pickTemplate(page, key, screenshot = false) {
  await page.locator("#templateTrigger").click();
  await expect(page.locator("#templateTrigger")).toHaveAttribute("aria-expanded", "true");
  const layout = await page.locator("#templateListbox").evaluate(listbox => {
    const bounds = listbox.getBoundingClientRect();
    const field = listbox.parentElement.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, bottom: bounds.bottom, fieldRight: field.right,
      width: innerWidth, height: innerHeight, options: [...listbox.children].map(option => ({
        width: option.clientWidth, scrollWidth: option.scrollWidth,
        whiteSpace: getComputedStyle(option.querySelector("span")).whiteSpace,
      })) };
  });
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.width);
  expect(layout.right).toBeLessThanOrEqual(layout.fieldRight + 1);
  expect(layout.bottom).toBeLessThanOrEqual(layout.height);
  for (const option of layout.options) {
    expect(option.scrollWidth).toBeLessThanOrEqual(option.width);
    expect(option.whiteSpace).toBe("normal");
  }
  if (screenshot) await page.screenshot({ path: path.join(screenshotDir, `template-picker-${page.viewportSize().width}.png`) });
  const option = page.locator(`#templateListbox [data-template="${key}"]`);
  const label = await option.innerText();
  await option.click();
  await expect(page.locator("#templateSelect")).toHaveValue(key);
  await expect(page.locator("#templateValue")).toHaveText(label);
  await expect(option).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#templateTrigger")).toBeFocused();
  await expect(page.locator("#templateListbox")).toBeHidden();
}

async function templateKeyboard(page) {
  const trigger = page.locator("#templateTrigger");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await expect(trigger).toHaveAttribute("aria-activedescendant", "template-option-purchase");
  await page.keyboard.press("Escape");
  await expect(page.locator("#templateSelect")).toHaveValue("rent");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("#templateSelect")).toHaveValue("vehicle");
  await page.keyboard.press("Home");
  await page.keyboard.press("End");
  await page.keyboard.press("Space");
  await expect(page.locator("#templateSelect")).toHaveValue("purchase");
  await page.keyboard.press("m");
  await expect(trigger).toHaveAttribute("aria-activedescendant", "template-option-rent");
  await page.keyboard.press("Enter");
  await expect(page.locator("#templateSelect")).toHaveValue("rent");
  await trigger.click();
  await page.keyboard.press("Tab");
  await expect(page.locator("#templateListbox")).toBeHidden();
  await expect(trigger).not.toBeFocused();
  await trigger.click();
  await page.locator("#form-title").click();
  await expect(page.locator("#templateListbox")).toBeHidden();
  await trigger.click();
  await page.locator("#exportMenu summary").click();
  await expect(page.locator("#templateListbox")).toBeHidden();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#exportMenu")).not.toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await ready(page);
}

async function assertLayout(page, width) {
  const layout = await page.evaluate(() => {
    const header = document.querySelector(".app-identity").getBoundingClientRect();
    const actions = document.querySelector(".header-actions").getBoundingClientRect();
    const buttons = [...document.querySelectorAll(".section-actions .button")]
      .filter(button => button.getClientRects().length).map(button => button.getBoundingClientRect().toJSON());
    return { scrollWidth: document.documentElement.scrollWidth, identityRight: header.right,
      actionsLeft: actions.left, buttons, viewportHeight: innerHeight };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(width);
  expect(layout.identityRight).toBeLessThanOrEqual(layout.actionsLeft);
  for (const button of layout.buttons) {
    expect(button.x).toBeGreaterThanOrEqual(0);
    expect(button.right).toBeLessThanOrEqual(width);
  }
}

function contrastRatio(foreground, background) {
  const luminance = color => {
    const channels = color.startsWith("#")
      ? [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16))
      : color.match(/[\d.]+/g).slice(0, 3).map(Number);
    const linear = channels.map(channel => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

async function assertTheme(page) {
  const theme = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const primary = getComputedStyle(document.querySelector(".export-trigger"));
    const navigation = getComputedStyle(document.querySelector(".section-nav"));
    const toolbar = getComputedStyle(document.querySelector(".preview-toolbar"));
    const form = getComputedStyle(document.querySelector(".form-pane"));
    return { primary: primary.backgroundColor, pairs: [
      [primary.color, primary.backgroundColor],
      [root.getPropertyValue("--ink").trim(), form.backgroundColor],
      [root.getPropertyValue("--muted").trim(), navigation.backgroundColor],
      [root.getPropertyValue("--success").trim(), toolbar.backgroundColor],
      [root.getPropertyValue("--amber").trim(), toolbar.backgroundColor],
      [root.getPropertyValue("--danger").trim(), form.backgroundColor],
      [root.getPropertyValue("--accent").trim(), root.getPropertyValue("--accent-soft").trim()],
    ] };
  });
  expect(theme.primary).toBe("rgb(190, 48, 44)");
  for (const [foreground, background] of theme.pairs) {
    expect(contrastRatio(foreground, background), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
  }
}

async function mobileWorkflow(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 },
    isMobile: true, hasTouch: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${baseUrl}/static/portfolio/vertragsgenerator-main/index.html`);
  await page.waitForURL("**/vertragsgenerator/");
  await ready(page);
  await expect(page.locator("#formPane")).toBeVisible();
  await expect(page.locator("#previewPane")).toBeHidden();
  await expect(page.locator(".field-group:visible")).toHaveCount(1);
  await expect(page.locator("#previousSectionButton")).toBeDisabled();
  await assertTheme(page);
  await templateKeyboard(page);
  await page.locator("#vermieter").fill("Mobile Vertragspartner & Co.");
  await page.locator("#nextSectionButton").click();
  await expect(page.locator("#form-title")).toHaveText("Objekt");
  await page.locator("#adresse").fill("Neue Straße 12, Hamburg");
  await page.locator("#nextSectionButton").click();
  await page.locator("#miete").fill("1234.56");
  await ready(page);
  await expect(page.locator("#contractPreview")).toContainText("1.234,56");
  await page.locator("#previousSectionButton").click();
  await expect(page.locator("#adresse")).toHaveValue("Neue Straße 12, Hamburg");
  await group(page, "closing");
  await page.locator("#ort").fill("Hamburg");
  await page.locator("#nextSectionButton").click();
  await ready(page);
  await expect(page.locator("#previewPane")).toBeVisible();
  await expect(page.locator("#formPane")).toBeHidden();
  await expect(page.locator("#documentTab")).toHaveAttribute("aria-selected", "true");
  await page.screenshot({ path: path.join(screenshotDir, "mobile-document.png") });

  await page.locator("#zoomSelect").selectOption("1");
  await expect.poll(() => page.locator("#contractPreview").evaluate(paper => Math.round(paper.getBoundingClientRect().width))).toBe(794);
  expect(await page.locator("#documentStage").evaluate(stage => stage.scrollWidth > stage.clientWidth)).toBe(true);
  await assertLayout(page, 390);
  await page.locator("#zoomOutButton").click();
  await expect(page.locator("#zoomSelect")).toHaveValue("0.75");
  await page.locator("#zoomSelect").selectOption("fit");

  const downloadPromise = page.waitForEvent("download");
  await menuAction(page, "exportMenu", "downloadButton");
  const download = await downloadPromise;
  const text = fs.readFileSync(await download.path(), "utf8");
  expect(text).toContain("Mobile Vertragspartner & Co.");
  expect(text).toContain("1.234,56");
  expect(text).toContain("Neue Straße 12, Hamburg");
  await menuAction(page, "exportMenu", "copyButton");
  await expect(page.locator("#actionToast")).toContainText("Zwischenablage");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("1.234,56");

  await group(page, "payment");
  await page.locator("#miete").fill("-1");
  await ready(page);
  await page.locator("#documentTab").click();
  await menuAction(page, "exportMenu", "downloadButton");
  await expect(page.locator("body")).toHaveAttribute("data-view", "form");
  await expect(page.locator("#miete")).toBeFocused();
  await expect(page.locator("#miete")).toHaveAttribute("aria-invalid", "true");
  await menuAction(page, "draftMenu", "fillSample");
  await ready(page);

  await group(page, "parties");
  await page.locator("#vermieter").fill("Entwurf bleibt erhalten");
  await pickTemplate(page, "purchase");
  await ready(page);
  await group(page, "terms");
  await page.locator("#terms").evaluate(field => {
    field.value = "A".repeat(5001);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await ready(page);
  await expect(page.locator("#terms")).toHaveAttribute("aria-invalid", "true");
  await group(page, "parties");
  await page.locator("#seller").focus();
  await expect(page.locator("#terms-error")).not.toBeEmpty();
  await menuAction(page, "draftMenu", "fillSample");
  await pickTemplate(page, "rent");
  await ready(page);
  await expect(page.locator("#vermieter")).toHaveValue("Entwurf bleibt erhalten");
  await page.reload();
  await ready(page);
  await expect(page.locator("#vermieter")).toHaveValue("Entwurf bleibt erhalten");

  await page.locator("#documentTab").click();
  await page.locator("#openSettingsButton").click();
  await expect(page.locator("#documentSettingsDialog")).toBeVisible();
  await page.locator("#logoInput").setInputFiles(logoPath);
  await expect(page.locator("#logoThumbnail")).toBeVisible();
  await page.locator('[data-size="large"]').click();
  await page.locator("#logoSizeInput").evaluate(range => { range.value = "210"; range.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.screenshot({ path: path.join(screenshotDir, "mobile-settings.png") });
  await page.locator("#doneSettingsButton").click();
  await ready(page);
  await expect(page.locator("#contractPreview")).toHaveAttribute("data-font-size", "large");
  expect(await page.locator(".preview-brand img").evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  const logoBounds = await page.locator(".preview-brand img").boundingBox();
  await page.mouse.move(logoBounds.x + 15, logoBounds.y + 15);
  await page.mouse.down();
  await page.mouse.move(logoBounds.x + 35, logoBounds.y + 20);
  await page.mouse.up();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("beirit-contract-generator:logo")).x)).toBeGreaterThan(0);

  await page.locator("#openSettingsButton").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#documentSettingsDialog")).toBeHidden();
  await page.locator("#formTab").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#documentTab")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.locator("#formPane")).toBeVisible();

  await page.evaluate(() => { window.print = () => { window.contractPrinted = true; }; });
  await menuAction(page, "exportMenu", "printButton");
  await expect.poll(() => page.evaluate(() => window.contractPrinted)).toBe(true);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".app-header")).toBeHidden();
  await expect(page.locator("#contractPreview")).toBeVisible();
  await expect(page.locator("#actionToast")).toBeHidden();
  await page.pdf({ path: path.join(screenshotDir, "contract.pdf"), format: "A4" });
  await page.emulateMedia({ media: "screen" });

  await group(page, "payment");
  await page.route("**/vertragsgenerator/vorschau/", route => route.abort());
  await page.locator("#miete").fill("777");
  await expect(page.locator("#statusBadge")).toHaveText("Vorschau nicht aktuell");
  await page.unroute("**/vertragsgenerator/vorschau/");
  await page.locator("#miete").fill("778");
  await ready(page);
  await menuAction(page, "draftMenu", "resetForm");
  await ready(page);
  await page.locator("#documentTab").click();
  await page.locator("#focusMissingButton").click();
  await expect(page.locator("#vermieter")).toBeFocused();
  await expect(page.locator("#form-title")).toHaveText("Parteien");
  expect(errors).toEqual([]);
  await context.close();
  console.log("Mobile workflow: sections, tabs, zoom, TXT, clipboard, validation, saved drafts, settings, logo drag, keyboard, PDF, network recovery and missing-field navigation passed.");
}

async function responsiveLayouts(browser) {
  for (const [width, height] of [[280,700], [320,320], [320,700], [390,844], [768,1024], [844,390], [1024,768], [1440,1000], [1920,1080]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${baseUrl}/vertragsgenerator/`);
    await ready(page);
    await assertTheme(page);
    await assertLayout(page, width);
    await page.screenshot({ path: path.join(screenshotDir, `form-${width}.png`) });
    for (const key of ["object", "payment", "terms", "closing"]) {
      await group(page, key);
      await assertLayout(page, width);
    }
    await page.locator("#nextSectionButton").click();
    await expect(page.locator("#previewPane")).toBeVisible();
    await assertLayout(page, width);
    await page.screenshot({ path: path.join(screenshotDir, `document-${width}.png`) });
    await page.locator("#openSettingsButton").click();
    const dialog = await page.locator("#documentSettingsDialog").boundingBox();
    expect(dialog.x).toBeGreaterThanOrEqual(0);
    expect(dialog.x + dialog.width).toBeLessThanOrEqual(width);
    expect(dialog.height).toBeLessThanOrEqual(height);
    await page.locator("#closeSettingsButton").click();
    for (const key of ["vehicle", "purchase", "rent"]) {
      await pickTemplate(page, key, key === "purchase");
      await ready(page);
      await expect(page.locator("#contractPreview h3")).not.toBeEmpty();
      await assertLayout(page, width);
    }
    await page.close();
    console.log(`Responsive layout: ${width}px passed.`);
  }
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/vertragsgenerator/?template=vehicle`);
  await expect(page.locator("#templateSelect")).toBeVisible();
  await expect(page.locator("#templateTrigger")).toBeHidden();
  await expect(page.locator("#fin")).toBeVisible();
  await expect(page.locator("#contractPreview")).toContainText("Fahrzeugtyp");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await context.close();
}

(async () => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await mobileWorkflow(browser);
    await responsiveLayouts(browser);
    console.log(`All contract editor checks passed. Screenshots: ${screenshotDir}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
