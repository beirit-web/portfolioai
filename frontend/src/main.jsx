import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

const rootElement = document.getElementById("beirit-root");

if (rootElement) {
  let hasMounted = false;
  let deferredCssPromise = null;
  let deferredCssScheduled = false;
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

  const keepHeaderCssLast = () => {
    const headerCss = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .find((link) => /\/header-nav-[^/]+\.css(?:$|\?)/.test(link.href));

    if (headerCss) {
      document.head.appendChild(headerCss);
    }
  };

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
    }))).then(() => {
      keepHeaderCssLast();
    });

    return deferredCssPromise;
  };

  window.BEIRIT_LOAD_DEFERRED_CSS = loadDeferredCss;

  const scheduleDeferredCssLoad = () => {
    if (deferredCssScheduled) return;
    deferredCssScheduled = true;
    const isHomePath = window.location.pathname === "/" || window.location.pathname === "";

    if (!isHomePath) {
      loadDeferredCss();
      return;
    }

    const loadWhenIdle = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadDeferredCss, { timeout: 2200 });
        return;
      }

      setTimeout(loadDeferredCss, 900);
    };

    if (document.readyState === "complete") {
      loadWhenIdle();
      return;
    }

    window.addEventListener("load", loadWhenIdle, { once: true });
  };

  const renderApp = () => {
    if (hasMounted) return;
    hasMounted = true;

    createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    hideIntroLoader();
    scheduleDeferredCssLoad();
  };

  if (window.BEIRIT_CRITICAL_CSS_READY) {
    window.BEIRIT_CRITICAL_CSS_READY.then(renderApp);
  } else {
    renderApp();
  }
}
