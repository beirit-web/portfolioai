const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.setTimeout(120000);

async function expectReadableAccount(page, scheme) {
  expect(await page.locator("body").evaluate(element => getComputedStyle(element).colorScheme)).toBe(scheme);
  const results = await page.locator('main :is(h1, h2, p, li, label, small, a, button, output, input:not([type="hidden"]):not([type="checkbox"]):not([type="file"]), textarea, select)').evaluateAll(elements => {
    const rgba = value => (value.match(/[\d.]+/g) || []).map(Number);
    const luminance = color => color.slice(0, 3).map(channel => {
      const value = channel / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
    const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
    const background = element => {
      const layers = [];
      for (let parent = element; parent; parent = parent.parentElement) {
        const color = rgba(getComputedStyle(parent).backgroundColor);
        layers.push(color);
        if ((color[3] ?? 1) === 1) break;
      }
      return layers.reverse().reduce((base, color) => color.slice(0, 3).map((channel, i) => channel * (color[3] ?? 1) + base[i] * (1 - (color[3] ?? 1))), [255, 255, 255]);
    };
    return elements.filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden" && !element.classList.contains("visually-hidden") && (element.textContent.trim() || element.matches("input,textarea,select"))).flatMap(element => {
      const style = getComputedStyle(element);
      const bg = background(element);
      const minimum = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.67 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
      const foreground = element.matches("input,textarea") ? style.webkitTextFillColor || style.color : style.color;
      const items = [{ element: element.id || element.textContent.trim().slice(0, 60) || element.tagName, contrast: contrast(rgba(foreground), bg), minimum }];
      if (element.hasAttribute("placeholder")) items.push({ element: `${element.id} placeholder`, contrast: contrast(rgba(getComputedStyle(element, "::placeholder").color), bg), minimum: 4.5 });
      return items;
    });
  });
  expect(results.length).toBeGreaterThan(2);
  expect(results.filter(result => result.contrast + .01 < result.minimum)).toEqual([]);
}

for (const colorScheme of ["light", "dark"]) {
  test(`account fields, hints, confirmations and disabled login stay readable in ${colorScheme} mode`, async ({ page, context, baseURL }, testInfo) => {
    await blockExternalRequests(context, baseURL);
    await page.emulateMedia({ colorScheme });
    for (const path of ["/login/", "/register/", "/password-reset/", "/email-bestaetigung/", "/examplemail", "/reset/MA/invalid/"]) {
      await page.goto(path);
      await expectReadableAccount(page, colorScheme);
    }
    await page.goto("/password-reset/");
    await page.locator("#id_email").fill("invalid-email");
    await page.locator("main form").evaluate(form => { form.noValidate = true; });
    await page.getByRole("button", { name: "Link senden", exact: true }).click();
    await expect(page.locator(".form-error")).toBeVisible();
    await expectReadableAccount(page, colorScheme);

    await page.goto("/register/");
    await page.locator("#id_email").fill(`contrast-${colorScheme}-${testInfo.project.name}@example.test`);
    await page.locator("#id_password1").fill("Fictional-contrast-42!");
    await page.locator("#id_password2").fill("Fictional-contrast-42!");
    await page.locator("#id_privacy_consent").check();
    await page.locator('main form button[type="submit"]').click();
    await expect(page.locator("#id_password")).toBeDisabled();
    await expectReadableAccount(page, colorScheme);
    await page.screenshot({ path: testInfo.outputPath(`activation-${colorScheme}.png`), fullPage: true });
    await page.goto("/examplemail");
    await expect(page.locator("#local-activation-code")).toBeVisible();
    await expectReadableAccount(page, colorScheme);
  });
}
