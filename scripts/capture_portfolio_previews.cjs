/**
 * Capture the public demos against the disposable browser-check server.
 *
 * Start server/bin/run_browser_checks.py first, with HTTP_PROXY and HTTPS_PROXY
 * pointed at http://127.0.0.1:9 and NO_PROXY=127.0.0.1,localhost to keep remote
 * APIs offline. Then run: node scripts/capture_portfolio_previews.cjs
 * Optional project slugs capture only those projects; --device=mobile or
 * --device=desktop restricts capture to one viewport.
 * Requires the installed frontend Playwright browser and server Pillow.
 */
const { chromium } = require("../frontend/node_modules/@playwright/test");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repository = path.resolve(__dirname, "..");
const origin = new URL(process.env.PORTFOLIO_PREVIEW_BASE_URL || "http://127.0.0.1:8765").origin;
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname)) {
  throw new Error("Portfolio previews require a local disposable server.");
}
const outputDirectory = path.join(repository, "server/assets/images/portfolio-previews");
const python = path.join(repository, "server/.venv/bin/python");
const projects = [
  { slug: "online-shop", route: "/shop/" },
  { slug: "vertragsgenerator", route: "/vertragsgenerator/" },
  { slug: "enbt-botanic", route: "/botanic/" },
  { slug: "wohnungssuche-bodensee", route: "/static/portfolio/wohnungssuche/index.html" },
  { slug: "notenrechner", route: "/static/portfolio/test-main/index.html" },
  { slug: "sprachdienstleistungen", route: "/deutschlive/" },
];
const viewports = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 },
};
const captureArguments = process.argv.slice(2);
const deviceArgument = captureArguments.find(argument => argument.startsWith("--device="));
const requestedDevice = deviceArgument?.slice("--device=".length);
if (deviceArgument && !viewports[requestedDevice]) {
  throw new Error(`Unknown capture device: ${requestedDevice}`);
}
const requested = new Set(captureArguments.filter(argument => argument !== deviceArgument));
for (const slug of requested) {
  if (!projects.some(project => project.slug === slug)) throw new Error(`Unknown portfolio project: ${slug}`);
}
const selectedProjects = requested.size ? projects.filter(project => requested.has(project.slug)) : projects;
const selectedViewports = Object.entries(viewports).filter(([device]) => !requestedDevice || device === requestedDevice);

async function prepareDemo(page, slug) {
  if (slug === "online-shop" && page.viewportSize().width < 768) {
    // Show a real product below the sticky quick navigation.
    await page.locator(".product-card").first().evaluate(element => {
      const navigation = document.querySelector(".project-home-nav--shop").getBoundingClientRect().height;
      window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - navigation - 12);
    });
  }
  if (slug === "vertragsgenerator") {
    await page.locator("#contractPreview[aria-busy='false']").waitFor({ state: "attached" });
  }
  if (slug === "notenrechner") {
    // Exercise the real calculator anonymously using sample grades.
    const grades = page.viewportSize().width < 768 ? ["2"] : ["1", "2", "3"];
    await page.locator('[data-action="start"]').click();
    await page.locator("#subjects").fill(String(grades.length));
    await page.locator('[data-action="subjects"]').click();
    for (const [index, grade] of grades.entries()) {
      await page.locator(`#grade-${index}`).fill(grade);
    }
    await page.locator('button[type="submit"]').click();
    await page.locator("#result:not([hidden])").waitFor();
    if (page.viewportSize().width < 768) {
      await page.locator(".calculator-card").evaluate(element => element.scrollIntoView({ block: "start" }));
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
    }
  }
  if (slug === "wohnungssuche-bodensee" && page.viewportSize().width < 768) {
    await page.getByRole("button", { name: "Navigation öffnen" }).click();
    await page.locator('nav[aria-label="Hauptnavigation"]').getByRole("button", { name: "Angebote", exact: true }).click();
    await page.locator(".listing-card").first().waitFor();
    await page.locator(".controls").evaluate(element => {
      window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 60);
    });
  }
  if (slug === "sprachdienstleistungen") {
    await page.locator(".premium-hero__actions button").first().click();
    await page.locator(".dialog-card").first().waitFor();
    await page.locator(".scene-learning-primary").scrollIntoViewIfNeeded();
  }
}

async function loadedAssets(page) {
  await page.locator("img").evaluateAll(images => {
    for (const image of images) image.loading = "eager";
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every(image => image.complete));
  const brokenLocalImages = await page.locator("img").evaluateAll(images => images
    .filter(image => image.currentSrc && new URL(image.currentSrc).origin === location.origin && !image.naturalWidth)
    .map(image => image.currentSrc));
  if (brokenLocalImages.length) throw new Error(`Local images did not load: ${brokenLocalImages.join(", ")}`);
}

async function frameCapture(page, slug, device) {
  if (slug !== "online-shop" || device !== "mobile") return;
  // End after the first complete product, before the next card starts. Resizing
  // the real viewport keeps navigation and content intact in the screenshot.
  const height = await page.locator(".product-card").first().evaluate(element => {
    const card = element.getBoundingClientRect();
    const next = document.querySelectorAll(".product-card")[1]?.getBoundingClientRect();
    const spacing = next ? Math.min(12, Math.max(0, (next.top - card.bottom) / 2)) : 12;
    return Math.ceil(card.bottom + spacing);
  });
  await page.setViewportSize({ width: page.viewportSize().width, height });
  await prepareDemo(page, slug);
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "beirit-portfolio-previews-"));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const project of selectedProjects) {
      for (const [device, viewport] of selectedViewports) {
        const context = await browser.newContext({
          viewport, locale: "de-DE", reducedMotion: "reduce", colorScheme: "light",
          isMobile: device === "mobile", hasTouch: device === "mobile", deviceScaleFactor: 1,
          serviceWorkers: "block",
        });
        try {
          const externalRequests = new Set();
          await context.route(/^https?:\/\//, route => {
            const url = new URL(route.request().url());
            if (url.origin === origin) return route.continue();
            externalRequests.add(url.origin);
            return route.abort();
          });
          if (project.slug === "sprachdienstleistungen") {
            await context.addInitScript(() => localStorage.setItem("deutsch-live-locale", "de"));
          }
          const page = await context.newPage();
          page.setDefaultTimeout(20000);
          const response = await page.goto(`${origin}${project.route}`, { waitUntil: "networkidle" });
          if (!response?.ok()) throw new Error(`${project.route} returned ${response?.status()}`);
          await prepareDemo(page, project.slug);
          await loadedAssets(page);
          await frameCapture(page, project.slug, device);
          const png = path.join(temporary, `${project.slug}-${device}.png`);
          const webp = path.join(outputDirectory, `${project.slug}-${device}.webp`);
          await page.screenshot({ path: png, fullPage: false, animations: "disabled" });
          execFileSync(python, ["-c", "from PIL import Image; import sys; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2], 'WEBP', quality=88, method=6)", png, webp]);
          // Regenerate responsive candidates with each source capture.
          execFileSync(python, [path.join(repository, "scripts/build_responsive_image_variants.py"), webp,
            "--widths", ...(device === "desktop" ? [480, 640, 768, 960] : [256, 320]).map(String)]);
          console.log(JSON.stringify({ project: project.slug, device, viewport: page.viewportSize(), path: path.relative(repository, webp),
            route: new URL(page.url()).pathname, blockedExternalOrigins: [...externalRequests] }));
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    if (browser) await browser.close();
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
