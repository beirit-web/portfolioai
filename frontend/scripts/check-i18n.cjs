/**
 * Konsistenz-Check fuer Uebersetzungen:
 * - Sammelt statische i18n-Keys aus gemeinsamen und app-eigenen Django-Templates
 * - Prueft data-i18n, data-i18n-title, data-i18n-aria-label, data-i18n-placeholder
 * - Prueft DE/RU aus i18n-data.js, Locale-Overlays und gemeinsamem Vokabelbox-Modul
 * Exit-Code 1 bei fehlenden Keys (fuer CI/Pre-Commit nutzbar).
 */

const fs = require("node:fs");
const path = require("node:path");
const defaultServerDir = path.resolve(__dirname, "../../server");

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

const readLocaleOverlay = (localesDir, lang) => {
  const localePath = path.join(localesDir, `${lang}.json`);
  if (!fs.existsSync(localePath)) return {};
  return JSON.parse(fs.readFileSync(localePath, "utf8"));
};

function loadTranslations(serverDir) {
  const base = require(path.join(serverDir, "assets/js/i18n-data.js"));
  const vocabulary = require(path.join(serverDir, "assets/vokabelbox/translations.js"));
  const localesDir = path.join(serverDir, "assets/locales");
  return {
    ...base,
    ...Object.fromEntries(["de", "ru"].map(language => [language, mergeTranslationTree(
      mergeTranslationTree(base[language], { vocab: vocabulary[language] }),
      readLocaleOverlay(localesDir, language),
    )])),
    uk: { vocab: vocabulary.uk },
  };
}

const collectHtmlFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectHtmlFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
};

function collectTemplateFiles(serverDir) {
  const roots = [path.join(serverDir, "templates")];
  for (const entry of fs.readdirSync(serverDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const templates = path.join(serverDir, entry.name, "templates");
    if (fs.existsSync(templates) && fs.statSync(templates).isDirectory()) roots.push(templates);
  }
  return roots.flatMap(collectHtmlFiles).sort();
}

function collectKeys(files) {
  const keys = new Map();
  const attributes = /\bdata-i18n(?:-title|-aria-label|-placeholder)?\s*=\s*(["'])(.*?)\1/gs;
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const [, , key] of content.matchAll(attributes)) {
      if (!key || /[{}]/.test(key)) continue;
      if (!keys.has(key)) keys.set(key, []);
      if (!keys.get(key).includes(file)) keys.get(key).push(file);
    }
  }
  return keys;
}

const getNested = (dict, pathStr) =>
  pathStr.split(".").reduce((acc, key) => (acc != null && Object.hasOwn(acc, key) ? acc[key] : undefined), dict);

function missingTranslations(keys, translations) {
  const missing = [];
  for (const [key, files] of keys) {
    const languages = key.startsWith("vocab.") ? ["de", "ru", "uk"] : ["de", "ru"];
    const absent = languages.filter(language => getNested(translations[language], key) === undefined);
    if (absent.length) missing.push({ key, languages: absent, files });
  }
  return missing;
}

function main() {
  const files = collectTemplateFiles(defaultServerDir);
  const keys = collectKeys(files);
  const missing = missingTranslations(keys, loadTranslations(defaultServerDir));
  if (missing.length) {
    console.error("Fehlende Uebersetzungen:");
    for (const { key, languages, files } of missing) {
      console.error(`- ${key} (${languages.join(", ")}): ${files.map(file => path.relative(defaultServerDir, file)).join(", ")}`);
    }
    return 1;
  }
  console.log(`OK: ${keys.size} Keys in ${files.length} Templates abgedeckt (DE/RU, Vokabelbox zusätzlich UK).`);
  return 0;
}

module.exports = { collectTemplateFiles, collectKeys, loadTranslations, mergeTranslationTree, missingTranslations };
if (require.main === module) process.exitCode = main();
