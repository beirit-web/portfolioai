const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

const headline = "Deutsch sprechen. Im Alltag ankommen.";
const landingCopies = {
  de: require("../../../apps/deutsch-live/src/i18n/de.json").landing,
  ru: require("../../../apps/deutsch-live/src/i18n/ru.json").landing,
};

test.beforeEach(async ({ page, context, baseURL }) => {
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
  await blockExternalRequests(context, baseURL);
  await context.addInitScript(() => {
    if (!localStorage.getItem("deutsch-live-locale")) localStorage.setItem("deutsch-live-locale", "de");
  });
  await page.goto("/deutschlive/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(headline);
});

test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

test("the landing explains a real learning scene and opens the bakery without an account", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByText("Guten Morgen! Was darf es sein?", { exact: true })).toBeVisible();
  await expect(page.getByText("Ich hätte gern zwei Brötchen und einen Kaffee.", { exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/\d+\s*%/);

  const start = page.getByRole("link", { name: "Bäckerei-Szene ausprobieren", exact: true }).first();
  await expect(start).toHaveAttribute("href", "/deutschlive/learn");
  await start.click();
  await expect(page).toHaveURL(/\/deutschlive\/learn(?:\?|$)/);
  await expect(page.locator(".scene-learning-shell")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("heading", { name: "Dialoge verstehen, Aussprache üben und Sätze festigen", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Bäckerei/ })).toHaveAttribute("aria-pressed", "true");
});

test("learning steps, upcoming topics and answers remain accessible with the keyboard", async ({ page }) => {
  await page.getByRole("link", { name: "So funktioniert’s", exact: true }).click();
  await expect(page).toHaveURL(/#lernweg$/);
  await expect(page.locator("#lernweg ol > li")).toHaveCount(3);

  const upcoming = page.locator("summary").filter({ hasText: "Weitere Alltagsthemen entdecken" });
  const upcomingDetails = upcoming.locator("..");
  await expect(upcomingDetails).not.toHaveAttribute("open", "");
  await upcoming.focus();
  await page.keyboard.press("Enter");
  await expect(upcomingDetails).toHaveAttribute("open", "");
  await expect(upcomingDetails.getByText("Supermarkt", { exact: true })).toBeVisible();
  await expect(upcomingDetails.locator("a")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(upcomingDetails).not.toHaveAttribute("open", "");

  const question = page.locator("summary").filter({ hasText: "Muss ich schon Deutsch können?" });
  const answer = question.locator("..").getByText("Nein. Die erste Szene ist für einen ruhigen Start mit Übersetzung und verständlichen Sätzen gedacht.", { exact: true });
  await expect(answer).not.toBeVisible();
  await question.focus();
  await page.keyboard.press("Space");
  await expect(answer).toBeVisible();
  await page.keyboard.press("Space");
  await expect(answer).not.toBeVisible();
});

test("switching language translates the landing and survives a reload", async ({ page }) => {
  const currentLanguage = page.getByRole("banner").getByLabel("Sprache wechseln. Aktuell: Deutsch", { exact: true });
  await expect(currentLanguage).toBeVisible();
  await currentLanguage.click();
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator("body")).not.toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(headline);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/[А-Яа-яЁё]/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/[А-Яа-яЁё]/);
});

test.describe("mobile language selection stays within the screen", () => {
  test.skip(({ isMobile }) => !isMobile, "The mobile header is checked with touch input.");

  const viewports = [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 667, height: 375 },
  ];

  async function expectOnscreen(control) {
    await expect(control).toBeVisible();
    const bounds = await control.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return {
        left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
        viewportWidth: innerWidth, viewportHeight: innerHeight,
        unobstructed: Boolean(hit && element.contains(hit)),
      };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight);
    expect(bounds.unobstructed, "The language control is not clipped or covered").toBe(true);
  }

  for (const viewport of viewports) {
    test(`${viewport.width}×${viewport.height}: switch without opening the menu or scrolling`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const header = page.getByRole("banner");
      const trigger = header.getByLabel("Sprache wechseln. Aktuell: Deutsch", { exact: true });
      const menu = page.getByRole("button", { name: "Menü öffnen", exact: true });
      const russian = page.getByRole("button", { name: "Русский", exact: true });
      const originalScroll = await page.evaluate(() => scrollY);
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expectOnscreen(trigger);

      await trigger.click();
      await expectOnscreen(russian);
      await expectOnscreen(page.getByRole("button", { name: "Deutsch", exact: true }));
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      expect(await page.evaluate(() => scrollY)).toBe(originalScroll);
      await page.keyboard.press("Escape");
      await expect(russian).not.toBeVisible();
      await expect(trigger).toBeFocused();

      await trigger.click();
      await expectOnscreen(russian);
      // Click a free corner outside the header popup without asking Playwright to scroll.
      await page.mouse.click(8, viewport.height - 8);
      await expect(russian).not.toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "de");

      await trigger.click();
      await expectOnscreen(russian);
      await russian.click();
      await expect(page.locator("html")).toHaveAttribute("lang", "ru");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/[А-Яа-яЁё]/);
      const russianTrigger = header.getByLabel("Изменить язык. Текущий язык: Русский", { exact: true });
      await expect(russianTrigger).toBeFocused();
      expect(await page.evaluate(() => scrollY)).toBe(originalScroll);
      expect(await page.evaluate(() => localStorage.getItem("deutsch-live-locale"))).toBe("ru");

      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", "ru");
      await expectOnscreen(russianTrigger);
      await russianTrigger.click();
      const german = page.getByRole("button", { name: "Deutsch", exact: true });
      await expectOnscreen(german);
      await german.click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(headline);
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => localStorage.getItem("deutsch-live-locale"))).toBe("de");
      expect(await page.evaluate(() => scrollY)).toBe(originalScroll);

      await page.getByRole("main").focus();
      await page.evaluate(() => scrollTo(0, 900));
      const scrolledPosition = await page.evaluate(() => scrollY);
      await expectOnscreen(trigger);
      await trigger.click();
      await expectOnscreen(russian);
      expect(await page.evaluate(() => scrollY)).toBe(scrolledPosition);
      await menu.click();
      await expect(russian).not.toBeVisible();
      const mobileNavigation = page.getByRole("navigation", { name: "Mobile Hauptnavigation", exact: true });
      await expect(mobileNavigation).toBeVisible();
      await expect(mobileNavigation.getByRole("link").first()).toBeFocused();
      await trigger.click();
      await expectOnscreen(russian);
      await expect(mobileNavigation).not.toBeVisible();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await page.keyboard.press("Escape");
      await expect(russian).not.toBeVisible();
      await expect(trigger).toBeFocused();
    });
  }
});

test("keyboard navigation skips the shell, dismisses the menu and focuses the chosen route", async ({ page }) => {
  const main = page.getByRole("main");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Zum Inhalt springen", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(main).toBeFocused();

  await page.evaluate(() => scrollTo(0, 900));
  const projectLink = page.getByRole("link", { name: "Zur Projektstartseite", exact: true });
  await projectLink.focus();
  await expect(projectLink).toBeFocused();
  await expect.poll(() => projectLink.evaluate(link => link.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);

  const menu = page.getByRole("button", { name: "Menü öffnen", exact: true });
  if (await menu.isVisible()) {
    await menu.focus();
    await page.keyboard.press("Enter");
    const mobileNavigation = page.getByRole("navigation", { name: "Mobile Hauptnavigation", exact: true });
    await expect(mobileNavigation).toBeVisible();
    await expect(mobileNavigation.getByRole("link").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(mobileNavigation).not.toBeVisible();
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  }

  await page.getByRole("link", { name: "Bäckerei-Szene ausprobieren", exact: true }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/deutschlive\/learn(?:\?|$)/);
  await expect(main).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Szenen lernen");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(headline);
  await expect(main).toBeFocused();
});

test("the landing fits narrow phones through wide desktop screens", async ({ page }) => {
  for (const width of [320, 390, 768, 1440, 2200]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `Horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});

for (const locale of ["de", "ru"]) {
  test(`the cold ${locale} accessibility tree includes offscreen learning content and closed FAQ controls`, async ({ context }) => {
    await context.addInitScript(language => localStorage.setItem("deutsch-live-locale", language), locale);
    const coldPage = await context.newPage();
    const errors = [];
    coldPage.on("pageerror", error => errors.push(error.message));
    const cdp = await context.newCDPSession(coldPage);
    try {
      await cdp.send("Accessibility.enable");
      await coldPage.goto("/deutschlive/", { waitUntil: "networkidle" });
      await coldPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      // Query AX before scrolling, focusing or reading below-fold DOM geometry.
      const tree = await cdp.send("Accessibility.getFullAXTree");
      const normalize = value => String(value || "").replace(/\s+/g, " ").trim();
      const exposed = tree.nodes.filter(node => !node.ignored)
        .map(node => ({ role: node.role?.value, name: normalize(node.name?.value) }));
      const copy = landingCopies[locale];
      const matching = (role, name) => exposed.filter(node => node.role === role && node.name === normalize(name));
      await expect(coldPage.locator("html")).toHaveAttribute("lang", locale);
      await expect(coldPage.getByRole("heading", { level: 1 })).toHaveText(`${copy.headline} ${copy.headlineAccent}`);
      for (const name of [copy.journeyTitle, ...copy.journeySteps.map(step => step.title), copy.topicsTitle, copy.bakeryTitle, copy.faqTitle, copy.finalTitle]) {
        expect(matching("heading", name), `Exposed offscreen heading: ${name}`).toHaveLength(1);
      }
      expect(matching("link", copy.accountLink)).toHaveLength(1);
      expect(matching("link", copy.startScene), "Both the hero and closing start links stay exposed").toHaveLength(2);
      for (const [question, answer] of copy.faqItems) {
        expect(matching("DisclosureTriangle", question), `Closed FAQ control: ${question}`).toHaveLength(1);
        expect(exposed.filter(node => node.name === normalize(answer)), `Closed answer stays hidden: ${question}`).toEqual([]);
      }
      expect(errors).toEqual([]);
    } finally {
      await cdp.detach();
      await coldPage.close();
    }
  });

  test(`200% text keeps the ${locale} landing readable with all answers expanded`, async ({ page }) => {
    await page.evaluate(language => localStorage.setItem("deutsch-live-locale", language), locale);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await page.locator(".dl-landing h1").waitFor();
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expect(page.locator("html")).toHaveCSS("font-size", "32px");
    for (const summary of await page.locator("main details summary").all()) {
      await summary.focus();
      await page.keyboard.press("Enter");
    }

    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      const problems = await page.locator("main").evaluate(root => {
        const issues = [], tolerance = 2;
        const visible = element => {
          const box = element.getBoundingClientRect(), style = getComputedStyle(element);
          return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        };
        for (const element of root.querySelectorAll("a,summary,p,h1,h2,h3,svg,img")) {
          if (!visible(element)) continue;
          const box = element.getBoundingClientRect();
          if (box.left < -tolerance || box.right > innerWidth + tolerance) issues.push(`${element.tagName}: extends outside viewport`);
          if (!(element instanceof SVGElement) && element.scrollWidth > element.clientWidth + tolerance) issues.push(`${element.tagName}: content overflows its box`);
        }
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode, element = node.parentElement;
          if (!node.textContent.trim() || element instanceof SVGElement || element.closest("[aria-hidden=true]") || !visible(element)) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const box of range.getClientRects()) {
            if (box.width && (box.left < -tolerance || box.right > innerWidth + tolerance)) issues.push(`Text outside viewport: ${node.textContent.trim().slice(0, 50)}`);
          }
        }
        return [...new Set(issues)];
      });
      expect(problems, `${locale}, 200% text at ${width}px`).toEqual([]);
      const bakeryTitle = page.getByRole("heading", { level: 3, name: locale === "de" ? "In der Bäckerei" : "В пекарне", exact: true });
      const titleLines = await bakeryTitle.evaluate(element => element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight));
      expect(titleLines, `Bakery heading is squeezed at ${width}px`).toBeLessThanOrEqual(3.05);
      for (const control of await page.locator("main a,main summary").all()) {
        await control.scrollIntoViewIfNeeded();
        const box = await control.boundingBox();
        expect(box).not.toBeNull();
        expect(box.x).toBeGreaterThanOrEqual(-2);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 2);
        if (box.height <= 900) {
          expect(box.y).toBeGreaterThanOrEqual(-2);
          expect(box.y + box.height).toBeLessThanOrEqual(902);
        } else {
          // A complete content card may exceed one screen with enlarged text;
          // its interactive center must remain reachable without horizontal scrolling.
          expect(box.y + box.height / 2).toBeGreaterThanOrEqual(0);
          expect(box.y + box.height / 2).toBeLessThanOrEqual(900);
        }
      }
    }
  });
}
