import de from "./locales/de.json";
import { createTranslationStore } from "./runtime.js";

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, normalizeLanguage, getNestedValue, detectInitialLanguage } from "./runtime.js";

const store = createTranslationStore({ de }, {
  ru: () => import("./locales/ru.json"),
  uk: () => import("./locales/uk.json"),
});

export const { translations, createTranslator, isLanguageLoaded, ensureLanguage } = store;
