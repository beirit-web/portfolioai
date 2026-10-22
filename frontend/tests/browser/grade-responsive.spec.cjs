const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

const dictionaries = {
  de: require("../../../apps/deutsch-live/src/i18n/de.json"),
  ru: require("../../../apps/deutsch-live/src/i18n/ru.json"),
};
const viewports = [
  { width: 280, height: 640 }, { width: 320, height: 568 }, { width: 390, height: 844 },
  { width: 768, height: 1024 }, { width: 820, height: 1180 }, { width: 1024, height: 768 },
  { width: 1440, height: 1000 }, { width: 844, height: 390 }, { width: 320, height: 320 },
];
const variants = [
  {
    name: "independent calculator", standalone: true, root: ".app-shell", card: ".calculator-card",
    nameInput: "#name", countInput: "#subjects", status: "#statusMessage", grid: "#gradeInputs", result: "#result",
  },
  {
    name: "DeutschLive calculator", standalone: false, root: ".grade-calculator", card: ".grade-calculator__card",
    nameInput: "#grade-name", countInput: "#grade-subjects", status: ".grade-calculator__status",
    grid: ".grade-calculator__grade-grid", result: ".grade-calculator__result",
  },
];

test.beforeEach(async ({ context, baseURL, page }) => {
  await blockExternalRequests(context, baseURL);
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

async function openCalculator(page, variant, locale = "de") {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const dictionary = dictionaries[locale];
  if (variant.standalone) {
    await page.goto("/static/portfolio/notenrechner/index.html");
  } else {
    await page.addInitScript(language => localStorage.setItem("deutsch-live-locale", language), locale);
    await page.route("**/deutschlive/api/auth/me/", route => route.fulfill({ json: { user: null } }));
    await page.goto("/deutschlive/");
    // The direct server URL redirects to the independent app; the SPA menu opens this module.
    await page.getByRole("combobox", { name: dictionary.common.openMenu, exact: true }).selectOption("/grades");
    await expect(page).toHaveURL(/\/deutschlive\/grades$/);
  }
  const root = page.locator(variant.root);
  await expect(root.locator(variant.nameInput)).toBeVisible();
  return {
    root, card: root.locator(variant.card), name: root.locator(variant.nameInput), count: root.locator(variant.countInput),
    status: root.locator(variant.status), grid: root.locator(variant.grid), result: root.locator(variant.result),
    next: root.getByRole("button", { name: dictionary.common.next, exact: true }),
    enter: root.getByRole("button", { name: dictionary.gradeCalculator.enterGradesButton, exact: true }),
    calculate: root.getByRole("button", { name: dictionary.gradeCalculator.calculate, exact: true }),
    copy: dictionary.gradeCalculator,
  };
}

async function expectGeometry(page, variant, label) {
  const issues = await page.evaluate(async ({ selector, gridSelector }) => {
    await new Promise(resolve => requestAnimationFrame(resolve));
    const root = document.querySelector(selector);
    const problems = [];
    const tolerance = 2;
    const describe = element => element.id || `${element.tagName.toLowerCase()}.${[...element.classList].slice(0, 2).join(".")}`;
    const visible = element => {
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
    };
    if (document.documentElement.scrollWidth > innerWidth + tolerance) problems.push("document overflows horizontally");
    for (const element of [root, ...root.querySelectorAll("*")]) {
      if (!visible(element) || element instanceof SVGElement || element.tagName === "CANVAS") continue;
      const box = element.getBoundingClientRect();
      if (box.left < -tolerance || box.right > innerWidth + tolerance) problems.push(`${describe(element)} extends outside the viewport`);
      if (!(element instanceof HTMLInputElement) && element.clientWidth > 0 && element.scrollWidth > element.clientWidth + tolerance) {
        problems.push(`${describe(element)} has horizontal content overflow`);
      }
      if (element.tagName === "BUTTON" && element.scrollHeight > element.clientHeight + tolerance) {
        problems.push(`${describe(element)} clips its button label vertically`);
      }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, element = node.parentElement;
      // Off-screen rows inside the intended vertical scroller are checked after scrolling below.
      if (!node.textContent.trim() || !visible(element) || element.closest(gridSelector) || element instanceof SVGElement) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const textBox of range.getClientRects()) {
        if (textBox.width && (textBox.left < -tolerance || textBox.right > innerWidth + tolerance)) {
          problems.push(`${describe(element)} has text outside the viewport`);
        }
        for (let ancestor = element; ancestor && root.contains(ancestor); ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor), box = ancestor.getBoundingClientRect();
          if (["hidden", "clip"].includes(style.overflowX) && (textBox.left < box.left - tolerance || textBox.right > box.right + tolerance)) {
            problems.push(`${describe(element)} text is horizontally clipped by ${describe(ancestor)}`);
          }
          if (["hidden", "clip"].includes(style.overflowY) && (textBox.top < box.top - tolerance || textBox.bottom > box.bottom + tolerance)) {
            problems.push(`${describe(element)} text is vertically clipped by ${describe(ancestor)}`);
          }
        }
      }
    }
    return [...new Set(problems)].slice(0, 12);
  }, { selector: variant.root, gridSelector: variant.grid });
  expect(issues, `${variant.name}: ${label}`).toEqual([]);
}

async function resizeAndCheck(page, variant, sizes, label) {
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await expectGeometry(page, variant, `${label} at ${viewport.width}×${viewport.height}`);
  }
}

async function expectReachable(control) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeVisible();
  const problem = await control.evaluate(element => {
    const box = element.getBoundingClientRect(), tolerance = 2;
    if (box.left < -tolerance || box.right > innerWidth + tolerance || box.top < -tolerance || box.bottom > innerHeight + tolerance) {
      return "control cannot be fully scrolled into the viewport";
    }
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor), parent = ancestor.getBoundingClientRect();
      if (["auto", "scroll", "hidden", "clip"].includes(style.overflowY)
        && (box.top < parent.top - tolerance || box.bottom > parent.bottom + tolerance)) return "control is clipped by its scroll container";
      if (["auto", "scroll", "hidden", "clip"].includes(style.overflowX)
        && (box.left < parent.left - tolerance || box.right > parent.right + tolerance)) return "control is clipped horizontally";
    }
    return null;
  });
  expect(problem).toBeNull();
}

async function expectResultImages(form, expectedCount) {
  const images = form.result.locator("img");
  await expect(images).toHaveCount(expectedCount);
  for (let index = 0; index < expectedCount; index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
    const geometry = await image.evaluate(element => {
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      const naturalRatio = element.naturalWidth / element.naturalHeight;
      return {
        width: box.width, height: box.height,
        cropsContent: style.objectFit === "cover" && Math.abs(box.width / box.height - naturalRatio) > 0.01,
      };
    });
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.height).toBeGreaterThan(0);
    expect(geometry.cropsContent).toBe(false);
  }
}

for (const variant of variants) {
  test(`${variant.name}: subject counts must be whole numbers and exponent notation keeps its value`, async ({ page }) => {
    const form = await openCalculator(page, variant);
    await form.next.click();
    for (const count of ["1.9", "20.9", "1e2"]) {
      await form.count.fill(count);
      await form.enter.click();
      await expect(form.count).toHaveAttribute("aria-invalid", "true");
      await expect(form.status).toContainText(form.copy.subjectError.replace("{max}", "20"));
      await expect(form.grid).toBeHidden();
    }
    await form.count.fill("1e1");
    await form.enter.click();
    await expect(form.grid.locator("input")).toHaveCount(10);
  });

  test(`${variant.name}: decimal rounding, the passing boundary and changed grades stay accurate`, async ({ page }) => {
    const form = await openCalculator(page, variant);
    await form.next.click();
    await form.count.fill("2");
    await form.enter.click();
    const inputs = form.grid.locator("input");
    const metric = label => form.result.locator(".result-metric, .grade-calculator__metric")
      .filter({ has: page.getByText(label, { exact: true }) }).locator("strong");
    await inputs.first().fill("1.1");
    await inputs.last().fill("1.3");
    await form.calculate.click();
    await expect(metric(form.copy.roundedUp)).toHaveText("1,2");
    await inputs.first().fill("1.2");
    await expect(form.result).toBeHidden();
    await inputs.last().fill("1.21");
    await form.calculate.click();
    await expect(metric(form.copy.roundedUp)).toHaveText("1,3");
    await inputs.first().fill("3.99");
    await inputs.last().fill("4");
    await form.calculate.click();
    await expect(metric(form.copy.average)).toHaveText(variant.standalone ? "< 4,0" : "3,995");
    await expect(form.result).toHaveClass(/is-passed/);
    await expect(form.result).toContainText(variant.standalone ? "weniger als 0,01" : "0,005");
    await inputs.first().fill("4");
    await inputs.last().fill("4");
    await form.calculate.click();
    await expect(metric(form.copy.average)).toHaveText("4,0");
    await expect(form.result).toHaveClass(/is-failed/);
    await inputs.first().fill("7");
    await expect(form.result).toBeHidden();
    await form.calculate.click();
    await expect(inputs.first()).toHaveAttribute("aria-invalid", "true");
    await expect(form.result).toBeHidden();
  });

  test(`${variant.name}: ${variant.standalone ? "going back" : "restarting"} stops result audio`, async ({ page }) => {
    await page.addInitScript(() => {
      window.__playingGradeAudio = new Set();
      HTMLMediaElement.prototype.play = function () {
        window.__playingGradeAudio.add(this);
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        window.__playingGradeAudio.delete(this);
      };
    });
    const form = await openCalculator(page, variant);
    await form.next.click();
    await form.count.fill("1");
    await form.enter.click();
    await form.grid.locator("input").fill("2");
    await form.calculate.click();
    await expect(form.result).toHaveClass(/is-passed/);
    expect(await page.evaluate(() => window.__playingGradeAudio.size)).toBe(1);
    await form.root.getByRole("button", {
      name: variant.standalone ? form.copy.back : form.copy.restart, exact: true,
    }).click();
    await expect(variant.standalone ? form.count : form.name).toBeVisible();
    await expect(form.result).toBeHidden();
    expect(await page.evaluate(() => window.__playingGradeAudio.size)).toBe(0);
  });

  test(`${variant.name}: setup, long names and validation fit phone, tablet and desktop widths`, async ({ page }) => {
    test.setTimeout(90000);
    const form = await openCalculator(page, variant);
    await resizeAndCheck(page, variant, viewports, "name step");
    const longName = "Beispielname".repeat(12);
    await form.name.fill(longName);
    await expectReachable(form.next);
    await form.next.click();
    await expect(form.status).toContainText(longName);
    await resizeAndCheck(page, variant, [viewports[0], viewports[3], viewports[4], viewports[7], viewports[8]], "long welcome status");
    await form.count.fill("21");
    await expectReachable(form.enter);
    await form.enter.click();
    await expect(form.count).toHaveAttribute("aria-invalid", "true");
    await expect(form.status).toContainText(form.copy.subjectError.replace("{max}", "20"));
    await expectGeometry(page, variant, "subject-count error");
    await expectReachable(form.count);
    await form.count.fill("20");
    await form.enter.click();
    await expect(form.grid.locator("input")).toHaveCount(20);
    await expectGeometry(page, variant, "grade step at short viewport");
    await expectReachable(form.calculate);
  });

  test(`${variant.name}: all 20 grades remain editable and passed and failed results fit every size`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    const form = await openCalculator(page, variant);
    await page.setViewportSize({ width: 320, height: 320 });
    await form.next.click();
    await form.count.fill("20");
    await form.enter.click();
    const inputs = form.grid.locator("input");
    await expect(inputs).toHaveCount(20);
    expect(await form.grid.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
    for (let index = 0; index < 20; index += 1) await inputs.nth(index).fill(index === 0 ? "1" : "4");
    await expectReachable(inputs.last());
    await expect(inputs.last()).toHaveValue("4");
    await inputs.first().fill("7");
    await form.calculate.click();
    await expect(inputs.first()).toHaveAttribute("aria-invalid", "true");
    await expect(form.status).toContainText(form.copy.gradeError.replace("{min}", "1").replace("{max}", "6"));
    await expectGeometry(page, variant, "invalid grade and status");
    await expectReachable(inputs.first());
    await inputs.first().fill("1");
    await form.calculate.click();
    await expect(form.result).toHaveClass(/is-passed/);
    await resizeAndCheck(page, variant, viewports, "passed result");
    // The standalone calculator celebrates passing without a result image.
    await expectResultImages(form, variant.standalone ? 0 : 1);
    await page.screenshot({ path: testInfo.outputPath("passed-result-320.png"), fullPage: true });
    await inputs.first().fill("6");
    await form.calculate.click();
    await expect(form.result).toHaveClass(/is-failed/);
    await resizeAndCheck(page, variant, viewports, "failed result");
    await expectResultImages(form, 1);
    await page.screenshot({ path: testInfo.outputPath("failed-result-320.png"), fullPage: true });
    for (const viewport of [viewports[0], viewports[5], viewports[7], viewports[8]]) {
      await page.setViewportSize(viewport);
      await expectReachable(inputs.first());
      await expectReachable(inputs.last());
      await expectReachable(form.calculate);
    }
  });

  test(`${variant.name}: enlarged text ${variant.standalone ? "in German" : "in Russian"} stays readable and usable`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    const locale = variant.standalone ? "de" : "ru";
    const form = await openCalculator(page, variant, locale);
    await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
    await resizeAndCheck(page, variant, [viewports[0], viewports[3], viewports[7], viewports[8]], "200% font name step");
    await form.name.fill(locale === "ru" ? "ПримерОченьДлинногоИмени".repeat(5) : "Beispielname".repeat(10));
    await form.next.click();
    await expectGeometry(page, variant, "200% font welcome status");
    await form.count.fill("0");
    await form.enter.click();
    await expect(form.count).toHaveAttribute("aria-invalid", "true");
    await expectGeometry(page, variant, "200% font validation");
    await form.count.fill("2");
    await form.enter.click();
    const inputs = form.grid.locator("input");
    await expectReachable(inputs.first());
    await inputs.first().fill("2");
    await expectReachable(inputs.last());
    await inputs.last().fill("5");
    await expectReachable(form.calculate);
    await form.calculate.click();
    await expect(form.result).toHaveClass(/is-passed/);
    await resizeAndCheck(page, variant, [viewports[0], viewports[3], viewports[7], viewports[8]], "200% font result");
    await expectResultImages(form, variant.standalone ? 0 : 1);
    await page.screenshot({ path: testInfo.outputPath(`large-font-${locale}-320.png`), fullPage: true });
  });
}

test("the grade calculator loads small artwork only when a result needs it", async ({ page }) => {
  const requests = [];
  page.on("request", request => requests.push(new URL(request.url()).pathname));
  await page.goto("/static/portfolio/notenrechner/index.html");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "./img/favicon-32.png");
  expect(requests.some(path => /\/(?:lost\.webp|success\.webp|lost\.png|favicon\.png|gewonnen\.mp3|lost-signal\.mp3)$/.test(path))).toBe(false);
  await page.locator('[data-action="start"]').click();
  await page.locator("#subjects").fill("1");
  await page.locator('[data-action="subjects"]').click();
  await page.locator("#grade-0").fill("5");
  await page.locator('button[type="submit"]').click();
  const image = page.locator(".result-image");
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute("src", "./img/lost.webp");
  await expect(image).toHaveAttribute("width", "512");
  await expect(image).toHaveAttribute("height", "768");
  await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  expect(requests.some(path => /\/(?:lost\.png|favicon\.png)$/.test(path))).toBe(false);
});
