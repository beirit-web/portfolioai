import React from "react";
import { homeConfig as config } from "../lib/homeConfig.js";
import { normalizeAppPath } from "../lib/appNavigation.js";

const portfolioKeywords = "Beirit Web, Portfolio, Webentwicklung, Softwareentwicklung, React, Django, Python, JavaScript, Fullstack";
export function useDocumentMeta(route) {
  React.useEffect(() => {
    if (!route) return undefined;
    const pageMeta = config.pageMeta || {};
    const title = pageMeta.title || route.title;
    const description = pageMeta.description || route.description;
    const keywords = pageMeta.keywords || route.keywords || portfolioKeywords;
    const updateMeta = (attribute, key, content) => {
      let meta = document.querySelector(`meta[${attribute}="${key}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, key);
        document.head.append(meta);
      }
      meta.setAttribute("content", content);
    };
    document.title = title;
    updateMeta("name", "description", description);
    updateMeta("name", "keywords", keywords);
    let canonical = document.querySelector('link[rel="canonical"]');
    const canonicalUrl = pageMeta.canonical || route.canonical || canonical?.href || `${window.location.origin}${normalizeAppPath()}`;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.append(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);
    updateMeta("name", "robots", pageMeta.robots || route.robots || "index, follow");
    updateMeta("property", "og:title", title);
    updateMeta("property", "og:description", description);
    updateMeta("property", "og:url", canonicalUrl);
    updateMeta("property", "og:type", pageMeta.ogType || "website");
    updateMeta("name", "twitter:title", title);
    updateMeta("name", "twitter:description", description);
    updateMeta("name", "twitter:url", canonicalUrl);
    return undefined;
  }, [route]);
}

export function useDocumentStateClasses() {
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.add("page-is-loaded");
    return () => {
      root.classList.remove("page-is-loaded");
    };
  }, []);
}
