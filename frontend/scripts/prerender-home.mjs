import { build } from "esbuild";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import postcss from "postcss";
import { filterRouteSelector } from "../src/lib/projectsCssFilter.mjs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(path.join(tmpdir(), "beirit-home-render-"));
try {
  const output = path.join(temporary, "render.mjs");
  await build({
    absWorkingDir: root,
    stdin: {
      resolveDir: root,
      contents: `
        import React from "react";
        import { renderToString } from "preact-render-to-string";
        import { HomeMain } from "./src/App.jsx";
        import { SiteHeader, PageFooter } from "./src/components/shared/PageShell.jsx";
        import de from "./src/i18n/locales/de.json";
        import ru from "./src/i18n/locales/ru.json";
        import uk from "./src/i18n/locales/uk.json";
        import { createTranslationStore } from "./src/i18n/runtime.js";
        const { createTranslator } = createTranslationStore({ de, ru, uk });
        export default Object.fromEntries(["de", "ru", "uk"].map(language => [
          language, renderToString(React.createElement(HomeMain, { t: createTranslator(language), language })),
        ]));
        export const chrome = renderToString(React.createElement(React.Fragment, null,
          React.createElement(SiteHeader, { t: createTranslator("de") }),
          React.createElement(PageFooter, { t: createTranslator("de") }),
        ));
      `,
    },
    alias: {
      "react": "preact/compat",
      "react-dom": "preact/compat",
      "react-dom/client": "preact/compat/client",
      "react/jsx-runtime": "preact/jsx-runtime",
    },
    // URL helpers also run during a local build. This is fictional sample data.
    banner: { js: 'globalThis.location = new URL("http://localhost/");' },
    define: { "import.meta.env.DEV": "false" },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: output,
    logLevel: "warning",
  });
  const { default: locales, chrome } = await import(pathToFileURL(output).href);
  const assets = path.resolve(root, "../server/assets/portfolio-dist");
  await writeFile(path.join(assets, ".vite/home-rendered.json"), JSON.stringify({ schemaVersion: 1, locales }));

  const markup = Object.values(locales).join("") + chrome;
  const classes = new Set([...markup.matchAll(/class="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/)));
  // States absent from static markup must retain their shared styles too.
  for (const value of `site-shell site-shell--home min-h-screen bg-[#f3f4f6] text-stone-950
    page-is-loaded is-ready is-visible is-open is-dragging
    is-mobile-menu-open site-nav-links--visible hero-stage__wave-grid-canvas
    info-tooltip__popover`.split(/\s+/)) classes.add(value);
  const ids = new Set(["beirit-root", ...[...markup.matchAll(/id="([^"]*)"/g)].map(match => match[1])]);
  const manifestPath = path.join(assets, ".vite/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const entry = manifest["src/home-rendering.css"];
  const originalPath = path.join(assets, entry.file);
  const originalCss = await readFile(originalPath, "utf8");
  const cssRoot = postcss.parse(originalCss);
  cssRoot.walkRules(rule => {
    if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
    const selector = filterRouteSelector(rule.selector,
      value => classes.has(value) || value.startsWith("lucide-")
        || value.startsWith("portfolio-carousel__slide--") || value.startsWith("portfolio-card__thumbnail--"), ids);
    if (selector) rule.selector = selector;
    else rule.remove();
  });
  cssRoot.walkAtRules(rule => {
    if (rule.nodes?.length === 0) rule.remove();
  });
  const css = cssRoot.toString();
  const hash = createHash("sha256").update(css).digest("hex").slice(0, 12);
  entry.file = `assets/home-rendering-${hash}.css`;
  await writeFile(path.join(assets, entry.file), css);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  if (originalPath !== path.join(assets, entry.file)) await rm(originalPath);
  console.log(`Home CSS: ${originalCss.length} → ${css.length} characters; shared source styles retained.`);
  console.log("Prerendered the complete home content in DE/RU/UK.");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
