import de from "virtual:about-i18n/de";
import { createTranslationStore, detectInitialLanguage } from "./runtime.js";
import { createI18nHook } from "../hooks/createI18nHook.js";

const store = createTranslationStore({ de }, {
  ru: () => import("virtual:about-i18n/ru"),
  uk: () => import("virtual:about-i18n/uk"),
});

export const useI18n = createI18nHook({ ...store, detectInitialLanguage });
