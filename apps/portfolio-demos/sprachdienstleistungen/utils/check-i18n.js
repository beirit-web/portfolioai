/**
 * Konsistenz-Check für Übersetzungen:
 * - Sammelt alle statischen i18n-Keys aus allen HTML-Templates unter templates/
 * - Prüft data-i18n, data-i18n-title, data-i18n-aria-label, data-i18n-placeholder
 * - Prüft, ob DE/RU in assets/js/i18n-data.js dafür Werte liefern
 * Exit-Code 1 bei fehlenden Keys (für CI/Pre-Commit nutzbar).
 */

const fs = require("fs");
const path = require("path");
const TRANSLATIONS = require("../assets/js/i18n-data.js");

const templateDir = path.join(__dirname, "..", "templates");
const localesDir = path.join(__dirname, "..", "assets", "locales");

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const mergeTranslationTree = (base, overlay) => {
  if (!isPlainObject(overlay)) return overlay;

  const merged = isPlainObject(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(overlay)) {
    merged[key] = isPlainObject(value)
      ? mergeTranslationTree(merged[key], value)
      : value;
  }
  return merged;
};

const readLocaleOverlay = (lang) => {
  const localePath = path.join(localesDir, `${lang}.json`);
  if (!fs.existsSync(localePath)) return {};
  return JSON.parse(fs.readFileSync(localePath, "utf8"));
};

const translations = {
  ...TRANSLATIONS,
  de: mergeTranslationTree(TRANSLATIONS.de, readLocaleOverlay("de")),
  ru: mergeTranslationTree(TRANSLATIONS.ru, readLocaleOverlay("ru")),
};

const collectHtmlFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectHtmlFiles(fullPath);
    }
    return entry.name.endsWith(".html") ? [fullPath] : [];
  });
};

const htmlFiles = collectHtmlFiles(templateDir);

const htmlKeys = new Set();
const regex = /data-i18n(?:-title|-aria-label|-placeholder)?="([^"]+)"/g;
const isStaticKey = (value) => value && !/[{}]/.test(value);

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, "utf8");
  let m;
  while ((m = regex.exec(content)) !== null) {
    if (isStaticKey(m[1])) {
      htmlKeys.add(m[1]);
    }
  }
}

const getNested = (dict, pathStr) =>
  pathStr.split(".").reduce((acc, key) => (acc != null ? acc[key] : undefined), dict);

const missing = [];
for (const key of htmlKeys) {
  const deVal = getNested(translations.de, key);
  const ruVal = getNested(translations.ru, key);
  if (deVal === undefined || ruVal === undefined) {
    missing.push({ key, de: deVal, ru: ruVal });
  }
}

if (missing.length) {
  console.error("Fehlende Übersetzungen:", missing);
  process.exit(1);
} else {
  console.log(`OK: ${htmlKeys.size} Keys abgedeckt (DE/RU).`);
}
