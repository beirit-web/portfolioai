import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import check from "./check-i18n.cjs";

function fixtures(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-i18n-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [name, contents] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
  return root;
}

test("translation checks include shared and application templates, skipping hidden environments", t => {
  const root = fixtures(t, {
    "templates/base.html": '<h1 data-i18n="nav.home"></h1>',
    "botanic/templates/botanic/nested/weather.html": '<p data-i18n="weather.title"></p>',
    "shop/templates/catalog.html": "<h2 data-i18n='shop.title'></h2>",
    ".venv/templates/ignored.html": '<p data-i18n="environment.key"></p>',
    "templates/example.txt": 'data-i18n="not.html"',
  });
  const files = check.collectTemplateFiles(root);
  assert.deepEqual(files.map(file => path.relative(root, file)), [
    "botanic/templates/botanic/nested/weather.html", "shop/templates/catalog.html", "templates/base.html",
  ]);
  assert.deepEqual([...check.collectKeys(files).keys()], ["weather.title", "shop.title", "nav.home"]);
});

test("static attributes support either quote style, whitespace and source-file diagnostics", t => {
  const root = fixtures(t, {
    "one.html": `<p data-i18n = 'text' data-i18n-title="title" data-i18n-aria-label = 'aria'
      data-i18n-placeholder="placeholder" data-i18n="{{ dynamic }}" data-i18n-params="ignored"></p>`,
    "two.html": '<span data-i18n="text"></span><span data-i18n="text"></span>',
  });
  const files = [path.join(root, "one.html"), path.join(root, "two.html")];
  const keys = check.collectKeys(files);
  assert.deepEqual([...keys.keys()], ["text", "title", "aria", "placeholder"]);
  assert.deepEqual(keys.get("text"), files);
});

test("missing entries identify languages and templates, including the Ukrainian vocabulary", () => {
  const keys = new Map([["weather.title", ["weather.html"]], ["vocab.start", ["vocab.html"]], ["toString", ["base.html"]]]);
  const missing = check.missingTranslations(keys, {
    de: { weather: { title: "Wetter" }, vocab: { start: "Start" } },
    ru: { vocab: { start: "Начать" } },
    uk: { vocab: {} },
  });
  assert.deepEqual(missing, [
    { key: "weather.title", languages: ["ru"], files: ["weather.html"] },
    { key: "vocab.start", languages: ["uk"], files: ["vocab.html"] },
    { key: "toString", languages: ["de", "ru"], files: ["base.html"] },
  ]);
});

test("locale overlays preserve unrelated entries and replace arrays without modifying base data", () => {
  const base = { nav: { home: "Start", menu: "Menü" }, items: ["Alt"] };
  const overlay = { nav: { home: "Neu" }, items: ["Eins", "Zwei"] };
  assert.deepEqual(check.mergeTranslationTree(base, overlay), {
    nav: { home: "Neu", menu: "Menü" }, items: ["Eins", "Zwei"],
  });
  assert.deepEqual(base, { nav: { home: "Start", menu: "Menü" }, items: ["Alt"] });
});
