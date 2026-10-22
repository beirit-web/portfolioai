import React from "react";
import { homeConfig as config, publicPageBaseUrl, publicPageUrl } from "./homeConfig.js";

const isLocalAppHost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(location.hostname);
const useLocalPortfolioLinks = config.useLocalPortfolioLinks === true && isLocalAppHost;
export const appRoutes = {
  "/": { key: "home", title: "Beirit Web | Portfolio für Web- und Softwareentwicklung", description: "Portfolio mit Webanwendungen, Softwareprojekten und technischen Fallstudien auf Basis von React, Django und Python." },
  "/kompetenzen": { key: "services", title: "Technologien und Kompetenzen | Beirit Web", description: "Technische Kompetenzen und Projekterfahrung mit React, Django, Python, APIs und responsiven Weboberflächen." },
  "/projekte": { key: "projects", title: "Web- und Softwareprojekte | Beirit Web", description: "Webanwendungen, Django-Projekte und Python-Tools mit technischen Einblicken und Live-Demos." },
  "/ueber-mich": { key: "about", title: "Über mich | Beirit Web", description: "Persönlicher Hintergrund, Arbeitsweise und technische Schwerpunkte von Eugen Beirit." },
  "/kontakt": { key: "contact", title: "Kontakt | Beirit Web", description: "Kontakt für Fragen zu den Projekten, fachlichen Austausch und berufliche Kontakte." },
  "/wetter": { key: "weather", title: "Wetter | Beirit Web", description: "Aktuelles Wetter, Regenfenster, Sonnenzeiten und 5-Tage-Ausblick direkt im Browser.", robots: "noindex, follow" },
};

const routeAliases = {
  "/profil": "/ueber-mich",
  "/projekte/": "/projekte",
  "/leistungen": "/kompetenzen",
  "/preise": "/projekte",
  "/spenden": "/projekte",
  "/zahlung": "/projekte",
  "/zahlung/erfolg": "/projekte",
  "/zahlung/abbruch": "/projekte",
  "/faq": "/kontakt",
  "/referenzen/coachingservice": "/referenzen/sprachdienstleistungen",
};
export function isAppHandledPath(pathname) {
  const normalizedPath = normalizeAppPath(pathname);
  return Boolean(
    appRoutes[normalizedPath]
    || normalizedPath.startsWith("/projekte/")
    || normalizedPath.startsWith("/referenzen/")
  );
}

export function publicSiteHref(href) {
  const value = String(href || "");
  if (!value || isExternalUrl(value) || value.startsWith("#") || !publicPageBaseUrl) return value;
  if (!value.startsWith("/")) return value;

  const target = new URL(value, location.origin);
  if (isAppHandledPath(target.pathname)) return value;

  return publicPageUrl(`${target.pathname}${target.search}${target.hash}`);
}

export function projectLiveHref(item) {
  const href = item.liveUrl || item.href || item.localHref || "";
  if (!href) return "";
  const category = item.category || "";
  if (category === "case") return "";
  return publicSiteHref(href);
}
export function isExternalUrl(href) {
  return /^https?:\/\//i.test(String(href || ""));
}
export function projectActionHref(item) {
  if (useLocalPortfolioLinks && item.localHref) return publicSiteHref(item.localHref);
  return publicSiteHref(item.href || "");
}

export function normalizeAppPath(pathname = location.pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return routeAliases[path] || path;
}

export function useBrowserPath() {
  const [path, setPath] = React.useState(() => normalizeAppPath());

  React.useEffect(() => {
    const handlePopState = () => setPath(normalizeAppPath());
    addEventListener("popstate", handlePopState);
    return () => removeEventListener("popstate", handlePopState);
  }, []);

  return [path, setPath];
}

export function navigateToAppPath(path, setPath) {
  const target = new URL(String(path || "/"), location.origin);
  const normalizedPath = normalizeAppPath(target.pathname || "/");
  const targetHash = target.hash || "";
  const targetUrl = `${normalizedPath}${target.search}${targetHash}`;
  const currentUrl = `${normalizeAppPath()}${location.search}${location.hash}`;
  const currentPath = normalizeAppPath();
  if (targetUrl === currentUrl) {
    if (targetHash) {
      scrollToHashTarget(targetHash);
    } else {
      scrollTo({ top: 0, behavior: getScrollBehavior() });
    }
    return;
  }

  if (normalizedPath !== currentPath) {
    location.assign(targetUrl);
    return;
  }

  history.pushState({}, "", targetUrl);
  setPath(normalizedPath);
  if (targetHash) {
    setTimeout(() => scrollToHashTarget(targetHash), 50);
  } else {
    scrollTo({ top: 0, behavior: "auto" });
  }
}
export function getScrollBehavior() {
  if (typeof window === "undefined" || !window.matchMedia) return "smooth";
  return matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
export function scrollToHashTarget(hash) {
  if (!hash || hash === "#top") return;
  setTimeout(() => {
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    const headerOffset = 92;
    const top = target.getBoundingClientRect().top + scrollY - headerOffset;
    scrollTo({ top: Math.max(0, top), behavior: getScrollBehavior() });
  }, 0);
}
