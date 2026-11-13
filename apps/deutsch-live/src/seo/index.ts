import routeData from "./routes.json";
import type { Locale } from "../i18n";
import { withBase } from "../lib/paths";

type PageCopy = { heading: string; title: string; description: string };
type Route = { index: boolean; canonical?: string } & Record<Locale, PageCopy>;
const routes: Record<string, Route> = routeData.routes;
const aliases: Record<string, string> = routeData.aliases;

export function routeMetadata(path: string, locale: Locale) {
  const canonicalPath = aliases[path] ?? path;
  const route = routes[canonicalPath];
  return {
    ...(route?.[locale] ?? routeData.notFound[locale]),
    known: Boolean(route),
    canonicalPath: route?.canonical ?? withBase(canonicalPath),
    robots: route?.index ? "index, follow" : "noindex, follow"
  };
}

function updateMeta(attribute: "name" | "property", name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.append(element);
  }
  element.content = content;
}

export function updateDocumentMetadata(path: string, locale: Locale) {
  const metadata = routeMetadata(path, locale);
  // Django supplies its configured public origin; Vite previews use their own.
  const origin = document.head.querySelector<HTMLMetaElement>('meta[name="deutschlive:site-origin"]')?.content || location.origin;
  const canonicalUrl = new URL(metadata.canonicalPath, origin).href;
  document.documentElement.lang = locale;
  document.title = metadata.title;
  updateMeta("name", "description", metadata.description);
  updateMeta("name", "robots", metadata.robots);
  updateMeta("property", "og:title", metadata.title);
  updateMeta("property", "og:description", metadata.description);
  updateMeta("property", "og:url", canonicalUrl);
  updateMeta("property", "og:locale", { ru: "ru_RU", de: "de_DE", uk: "uk_UA" }[locale]);
  updateMeta("name", "twitter:title", metadata.title);
  updateMeta("name", "twitter:description", metadata.description);
  updateMeta("name", "twitter:url", canonicalUrl);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = canonicalUrl;
}

export function notFoundCopy(locale: Locale) {
  return routeData.notFound[locale];
}
