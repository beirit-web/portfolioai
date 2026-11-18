type Dictionary = typeof import("./ru.json");

export type Locale = "ru" | "de" | "uk";

const loaders = {
  de: () => import("./de.json"),
  ru: () => import("./ru.json"),
  uk: () => import("./uk.json"),
};
const resolvedDictionaries: Partial<Record<Locale, Dictionary>> = {};
let changeSequence = 0;
const LOCALE_STORAGE_KEY = "deutsch-live-locale";
const LOCALE_COOKIE_KEY = "deutschlive_locale";
let currentLocale: Locale = readInitialLocale();
let currentUi: Dictionary;
const listeners = new Set<(locale: Locale) => void>();

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "uk";
  const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
  const cookieLocale = document.cookie.split(";").map(value => value.trim())
    .find(value => value.startsWith(`${LOCALE_COOKIE_KEY}=`))?.split("=")[1];
  const locale = isLocale(storedLocale) ? storedLocale : isLocale(cookieLocale) ? cookieLocale : "uk";
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

async function loadLocale(locale: Locale): Promise<Dictionary> {
  return resolvedDictionaries[locale] ?? (resolvedDictionaries[locale] = (await loaders[locale]()).default);
}

export async function prepareInitialLocale() {
  currentUi = await loadLocale(currentLocale);
}

export function getUi(locale: Locale = currentLocale): Dictionary {
  const dictionary = resolvedDictionaries[locale];
  if (!dictionary) throw new Error("Locale must be loaded before rendering.");
  return dictionary;
}

export function getLocale() {
  return currentLocale;
}

export async function setLocale(locale: Locale) {
  const sequence = ++changeSequence;
  const dictionary = await loadLocale(locale);
  if (sequence !== changeSequence) return false;
  currentLocale = locale;
  currentUi = dictionary;
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    persistLocaleCookie(locale);
  }
  listeners.forEach((listener) => listener(locale));
  return true;
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
