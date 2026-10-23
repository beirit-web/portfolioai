import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

export function mountSiteApp(App) {
  const rootElement = document.getElementById("beirit-root");
  if (!rootElement) return;
  let hasMounted = false;
  let deferredCssPromise = null;
  const introLoader = document.querySelector("[data-intro-loader]");
  const introStartedAt = introLoader ? performance.now() : 0;
  const introMinDuration = 350;
  let introHidden = false;

  const hideIntroLoader = () => {
    if (!introLoader || introHidden) return;
    introHidden = true;

    const removeLoader = () => {
      introLoader.remove();
    };
    const elapsed = performance.now() - introStartedAt;
    const delay = Math.max(0, introMinDuration - elapsed);

    setTimeout(() => {
      introLoader.classList.add("is-hidden");
      setTimeout(removeLoader, 420);
    }, delay);
  };

  hideIntroLoader();

  const loadDeferredCss = () => {
    if (deferredCssPromise) return deferredCssPromise;
    const urls = Array.isArray(window.BEIRIT_DEFERRED_CSS)
      ? window.BEIRIT_DEFERRED_CSS.filter(Boolean)
      : [];

    if (!urls.length) {
      deferredCssPromise = Promise.resolve();
      return deferredCssPromise;
    }

    deferredCssPromise = Promise.all(urls.map((href) => new Promise((resolve) => {
      const existing = document.querySelector(`link[rel="stylesheet"][href="${href}"]`);
      if (existing) {
        resolve();
        return;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    })));

    return deferredCssPromise;
  };

  window.BEIRIT_LOAD_DEFERRED_CSS = loadDeferredCss;

  const renderApp = () => {
    if (hasMounted) return;
    hasMounted = true;
    // Reserve the final scrollbar space before the first app layout.
    document.documentElement.classList.add("page-is-loaded");

    const app = (
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    if (rootElement.dataset.prerenderedLanguage) hydrateRoot(rootElement, app);
    else createRoot(rootElement).render(app);
    hideIntroLoader();
  };

  // All home sections are present in the first render, including in Vite dev
  // where the additional component styles are supplied as separate files.
  Promise.all([window.BEIRIT_CRITICAL_CSS_READY, loadDeferredCss()]).then(renderApp);
}
