export const SUPPORTED_LANGUAGES = ["de", "ru", "uk"];
export const DEFAULT_LANGUAGE = "de";

export function normalizeLanguage(value, fallback = DEFAULT_LANGUAGE) {
  const lang = String(value || "").slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : fallback;
}

export function getNestedValue(source, key) {
  return String(key || "")
    .split(".")
    .filter(Boolean)
    .reduce((value, part) => (value == null ? undefined : value[part]), source);
}

export function detectInitialLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  const browserLanguages = [...(navigator.languages || []), navigator.language].filter(Boolean);
  const browserLanguage = browserLanguages
    .map((lang) => normalizeLanguage(lang, ""))
    .find(Boolean);
  if (browserLanguage) return browserLanguage;

  return DEFAULT_LANGUAGE;
}

export function createTranslationStore(initialTranslations, languageLoaders = {}) {
  const translations = { ...initialTranslations };
  const languagePromises = new Map();

  function createTranslator(language) {
    const lang = normalizeLanguage(language);

    return function t(key, replacements = {}) {
      const value = getNestedValue(translations[lang], key) ?? getNestedValue(translations.de, key);

      if (value === undefined) {
        if (import.meta.env?.DEV) {
          console.warn(`Missing translation key: ${key}`);
        }
        return key;
      }

      if (typeof value !== "string") return value;

      return Object.entries(replacements).reduce(
        (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
        value,
      );
    };
  }

  function isLanguageLoaded(language) {
    const lang = normalizeLanguage(language);
    return Boolean(translations[lang]);
  }

  function ensureLanguage(language) {
    const lang = normalizeLanguage(language);
    if (translations[lang]) return Promise.resolve(translations[lang]);
    const loader = languageLoaders[lang];
    if (!loader) return Promise.resolve(translations.de);
    if (!languagePromises.has(lang)) {
      languagePromises.set(
        lang,
        loader().then((module) => {
          translations[lang] = module.default;
          return translations[lang];
        }),
      );
    }
    return languagePromises.get(lang);
  }

  return { translations, createTranslator, isLanguageLoaded, ensureLanguage };
}
