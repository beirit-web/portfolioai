import de from "./de.json";
import ru from "./ru.json";
import learningContent from "./learningContent.json";

export type Locale = "ru" | "de";

const dictionaries = { ru, de } as const;
const LOCALE_STORAGE_KEY = "deutsch-live-locale";
let currentLocale: Locale = readInitialLocale();
let currentUi = getUi(currentLocale);
const listeners = new Set<(locale: Locale) => void>();

function mergeWithFallback<T>(fallback: T, value: unknown): T {
  if (!isRecord(fallback)) return (value ?? fallback) as T;
  const incoming = isRecord(value) ? value : {};
  const merged: Record<string, unknown> = { ...fallback };

  for (const [key, fallbackValue] of Object.entries(fallback)) {
    merged[key] = mergeWithFallback(fallbackValue, incoming[key]);
  }

  for (const [key, incomingValue] of Object.entries(incoming)) {
    if (!(key in merged)) merged[key] = incomingValue;
  }

  return merged as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "ru";
  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(storedLocale) ? storedLocale : "ru";
}

function isLocale(value: unknown): value is Locale {
  return value === "ru" || value === "de";
}

export function getUi(locale: Locale = "ru") {
  return mergeWithFallback(ru, dictionaries[locale]);
}

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  currentUi = getUi(locale);
  if (typeof window !== "undefined") window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  listeners.forEach((listener) => listener(locale));
}

export function subscribeLocale(listener: (locale: Locale) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const availableLocales: Locale[] = ["ru", "de"];
export const languageNames: Record<Locale, string> = { ru: "Русский", de: "Deutsch" };
export const ui = new Proxy({} as ReturnType<typeof getUi>, {
  get(_target, property: keyof ReturnType<typeof getUi>) {
    return currentUi[property];
  }
});
export const learning = learningContent.learning;
