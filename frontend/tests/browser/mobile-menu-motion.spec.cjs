const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(!isMobile, "The sliding panel is used below the mobile navigation breakpoint.");
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:(?:8765|8000)(?:\/|$))/, route => route.abort());
});

async function openPage(page, path) {
  await page.goto(path);
  await expect(page.locator(".site-nav-toggle")).toBeVisible();
  await expect(page.locator(".site-mobile-menu-panel")).toBeHidden();
  await page.locator(".site-nav-toggle").focus();
}

// Pause actual browser transitions at a known point instead of racing wall-clock
// delays. This also catches panels that disappear immediately when closed.
async function sampleTransition(page, action, fraction = 0.5) {
  return page.evaluate(({ action, fraction }) => new Promise((resolve, reject) => {
    const panel = document.querySelector(".site-mobile-menu-panel");
    const toggle = document.querySelector(".site-nav-toggle");
    const shouldOpen = action === "toggle" && !panel.classList.contains("is-open");
    getComputedStyle(panel).transform;
    let sampled = false;
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error("The mobile menu did not change its open state."));
    }, 2000);
    const sample = () => {
      if (sampled || panel.classList.contains("is-open") !== shouldOpen) return;
      sampled = true;
      observer.disconnect();
      clearTimeout(timeout);
      requestAnimationFrame(() => {
        getComputedStyle(panel).transform;
        const animations = panel.getAnimations();
        const transform = animations.find(animation => animation.transitionProperty === "transform");
        if (!transform) {
          reject(new Error("The menu changed state without a sliding transition."));
          return;
        }
        const duration = transform.effect.getTiming().duration;
        for (const animation of animations) {
          animation.pause();
          animation.currentTime = 0;
        }
        const startLeft = panel.getBoundingClientRect().left;
        // Keep the delayed visibility transition in step with the sliding panel.
        for (const animation of animations) animation.currentTime = duration * fraction;
        const rect = panel.getBoundingClientRect();
        const style = getComputedStyle(panel);
        resolve({
          startLeft,
          left: rect.left,
          width: rect.width,
          duration,
          visibility: style.visibility,
          borderRadius: style.borderRadius,
          ariaHidden: panel.getAttribute("aria-hidden"),
          inert: panel.inert,
        });
      });
    };
    const observer = new MutationObserver(sample);
    observer.observe(panel, { attributes: true, attributeFilter: ["class"] });
    if (action === "escape") {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    } else {
      toggle.click();
    }
    sample();
  }), { action, fraction });
}

async function finishTransition(page) {
  await page.locator(".site-mobile-menu-panel").evaluate(async panel => {
    for (const animation of panel.getAnimations()) animation.finish();
    await new Promise(resolve => requestAnimationFrame(resolve));
  });
}

for (const path of ["/ueber-mich", "/projekte"]) {
  test.describe(`${path}: mobile menu motion`, () => {
    test.use({ reducedMotion: "no-preference" });

    for (const action of ["toggle", "escape"]) {
      test(`slides in and slides out when closed with ${action}`, async ({ page }) => {
        await openPage(page, path);
        const width = page.viewportSize().width;
        const opening = await sampleTransition(page, "toggle");
        expect(opening.duration).toBeGreaterThan(0);
        expect(opening.startLeft).toBeCloseTo(width, 0);
        expect(opening.left).toBeGreaterThan(1);
        expect(opening.left).toBeLessThan(width - 1);
        expect(opening.width).toBeCloseTo(width, 0);
        expect(opening.visibility).toBe("visible");
        expect(opening.borderRadius).toBe("0px");
        expect(opening.ariaHidden).toBe("false");
        expect(opening.inert).toBe(false);
        await finishTransition(page);
        await expect(page.locator(".site-mobile-menu-panel")).toBeVisible();
        expect(await page.locator(".site-mobile-menu-panel").evaluate(panel => panel.getBoundingClientRect().left)).toBeCloseTo(0, 0);

        const closing = await sampleTransition(page, action);
        expect(closing.duration).toBe(opening.duration);
        expect(closing.startLeft).toBeCloseTo(0, 0);
        expect(closing.left).toBeGreaterThan(1);
        expect(closing.left).toBeLessThan(width - 1);
        expect(closing.visibility).toBe("visible");
        expect(closing.ariaHidden).toBe("true");
        expect(closing.inert).toBe(true);
        await expect(page.locator(".site-nav-toggle")).toHaveAttribute("aria-expanded", "false");
        await finishTransition(page);
        await expect(page.locator(".site-mobile-menu-panel")).toBeHidden();
        expect(await page.locator(".site-mobile-menu-panel").evaluate(panel => panel.getBoundingClientRect().left)).toBeCloseTo(width, 0);
        await expect(page.locator(".site-nav-toggle")).toBeFocused();
        expect(await page.locator("body").evaluate(body => body.style.overflow)).toBe("");
      });
    }

    test("reverses an unfinished slide without jumping or removing the panel", async ({ page }) => {
      await openPage(page, path);
      const opening = await sampleTransition(page, "toggle", 0.25);
      const closing = await sampleTransition(page, "toggle", 0.25);
      expect(closing.startLeft).toBeCloseTo(opening.left, 0);
      expect(closing.left).toBeGreaterThan(opening.left);
      expect(closing.visibility).toBe("visible");
      const reopening = await sampleTransition(page, "toggle", 0.5);
      expect(reopening.startLeft).toBeCloseTo(closing.left, 0);
      expect(reopening.left).toBeLessThan(closing.left);
      expect(reopening.ariaHidden).toBe("false");
      expect(reopening.inert).toBe(false);
      await finishTransition(page);
      await expect(page.locator(".site-mobile-menu-panel")).toBeVisible();
      await expect(page.locator(".site-nav-toggle")).toHaveAttribute("aria-expanded", "true");
    });
  });

  test(`${path}: reduced motion opens and closes immediately without sliding`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, path);
    const panel = page.locator(".site-mobile-menu-panel");
    const toggle = page.locator(".site-nav-toggle");
    await toggle.click();
    await expect(panel).toBeVisible();
    const opened = await panel.evaluate(element => ({
      left: element.getBoundingClientRect().left,
      sliding: element.getAnimations().some(animation => animation.transitionProperty === "transform"),
      inert: element.inert,
    }));
    expect(opened).toEqual({ left: 0, sliding: false, inert: false });
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    const closed = await panel.evaluate(element => ({
      left: element.getBoundingClientRect().left,
      sliding: element.getAnimations().some(animation => animation.transitionProperty === "transform"),
      inert: element.inert,
    }));
    expect(closed).toEqual({ left: page.viewportSize().width, sliding: false, inert: true });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });
}
