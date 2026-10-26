import de from "./de.json";
import ru from "./ru.json";
import uk from "./uk.json";

export type Locale = "ru" | "de" | "uk";

const dictionaries = { ru, de, uk } as const;
const resolvedDictionaries: Partial<Record<Locale, typeof ru>> = { ru };
const LOCALE_STORAGE_KEY = "deutsch-live-locale";
const LOCALE_COOKIE_KEY = "deutschlive_locale";
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
  const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
  const cookieLocale = document.cookie.split(";").map(value => value.trim())
    .find(value => value.startsWith(`${LOCALE_COOKIE_KEY}=`))?.split("=")[1];
  const locale = isLocale(storedLocale) ? storedLocale : isLocale(cookieLocale) ? cookieLocale : "ru";
  // A first visit already uses the server's default. Only migrate an existing
  // browser preference; don't rewrite a cookie on every page load.
  if (isLocale(storedLocale) && storedLocale !== cookieLocale) persistLocaleCookie(locale);
  return locale;
}

function persistLocaleCookie(locale: Locale) {
  // Keep server-rendered metadata in the selected language on the next visit.
  // The existing localStorage preference remains authoritative in the app.
  document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; Path=/deutschlive/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

export function isLocale(value: unknown): value is Locale {
  return value === "ru" || value === "de" || value === "uk";
}

export function getUi(locale: Locale = "ru") {
  // The fallback dictionary already contains every key. Resolve the other
  // language once, instead of cloning the entire dictionary on every switch.
  return resolvedDictionaries[locale] ?? (resolvedDictionaries[locale] = mergeWithFallback(ru, dictionaries[locale]));
}

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  currentUi = getUi(locale);
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    persistLocaleCookie(locale);
  }
  listeners.forEach((listener) => listener(locale));
}

export function subscribeLocale(listener: (locale: Locale) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const availableLocales: Locale[] = ["ru", "de", "uk"];
export const languageNames: Record<Locale, string> = { ru: "Русский", de: "Deutsch", uk: "Українська" };
export const ui = new Proxy({} as ReturnType<typeof getUi>, {
  get(_target, property: keyof ReturnType<typeof getUi>) {
    return currentUi[property];
  }
});
