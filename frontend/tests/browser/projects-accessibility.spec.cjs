const { test, expect } = require("@playwright/test");

async function expectReadableButton(button, state) {
  const colors = await button.evaluate(element => {
    const style = getComputedStyle(element);
    const luminance = color => {
      const channels = color.match(/[\d.]+/g).map(Number);
      if (channels.length > 3 && channels[3] !== 1) return null;
      const linear = channels.slice(0, 3).map(channel => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return {
      label: `${element.closest("article").querySelector("h2").textContent}: ${element.textContent.trim()}`,
      color: style.color,
      background: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      ratio: foreground === null || background === null ? null
        : (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
    };
  });
  const context = `${colors.label} (${state}, ${colors.color} on ${colors.background})`;
  // These buttons use solid opaque backgrounds; a gradient or transparency needs
  // a contrast check against its rendered colors rather than this calculation.
  expect(colors.backgroundImage, context).toBe("none");
  expect(colors.ratio, context).not.toBeNull();
  expect(colors.ratio, context).toBeGreaterThanOrEqual(4.5);
}

test("all project action buttons retain readable contrast in normal, hover and keyboard focus states", async ({ page, isMobile }) => {
  await page.goto("/projekte");
  await expect(page.locator(".project-overview-card--online-shop")).toBeVisible();
  await expect(page.locator(".project-overview-card--wohnungssuche-bodensee")).toBeAttached();
  const primary = page.locator(".project-overview-card__button");
  const secondary = page.locator(".project-overview-card__secondary-button");
  expect(await primary.count()).toBeGreaterThan(0);
  expect(await secondary.count()).toBeGreaterThan(0);

  const buttons = page.locator(".project-overview-card__button, .project-overview-card__secondary-button");
  for (const button of await buttons.all()) {
    await expectReadableButton(button, "normal");
    if (!isMobile) {
      await button.hover();
      await expectReadableButton(button, "hover");
      await page.mouse.move(0, 0);
    }
    await button.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(button).toBeFocused();
    expect(await button.evaluate(element => element.matches(":focus-visible"))).toBe(true);
    await expectReadableButton(button, "keyboard focus");
    await button.evaluate(element => element.blur());
  }
});
