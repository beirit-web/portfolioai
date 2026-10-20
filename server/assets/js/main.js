// === Language UI / tooltip toggles ===
const langButtons = Array.from(document.querySelectorAll(".lang-switcher"));
const langOptions = Array.from(document.querySelectorAll(".lang-option"));
const langTooltip = document.querySelector(".lang-tooltip");
const langCurrents = Array.from(document.querySelectorAll(".lang-current"));
let themeInitialized = false;

const hideTooltip = () => langTooltip?.classList.remove("visible");
const showTooltip = () => langTooltip?.classList.add("visible");
const closeLangMenus = () => {
  document.querySelectorAll(".lang-menu").forEach((menu) => {
    menu.classList.remove("is-open", "is-closing");
    menu.style.display = "none";
  });
  langButtons.forEach((btn) => btn.setAttribute("aria-expanded", "false"));
};

function setupLangSwitcher(btn) {
  const wrapper = btn.closest(".lang-wrapper");
  const menu = wrapper ? wrapper.querySelector(".lang-menu") : null;
  if (!menu) return;
  let closeTimer = null;

  const openMenu = () => {
    if (closeTimer) window.clearTimeout(closeTimer);
    menu.style.display = "flex";
    menu.classList.remove("is-closing");
    menu.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
  };
  const closeMenu = () => {
    if (menu.style.display === "none") {
      btn.setAttribute("aria-expanded", "false");
      return;
    }
    if (closeTimer) window.clearTimeout(closeTimer);
    menu.classList.remove("is-open");
    menu.classList.add("is-closing");
    btn.setAttribute("aria-expanded", "false");
    closeTimer = window.setTimeout(() => {
      menu.classList.remove("is-closing");
      menu.style.display = "none";
      closeTimer = null;
    }, 680);
  };

  btn.addEventListener("mouseenter", showTooltip);
  btn.addEventListener("mouseleave", hideTooltip);
  btn.addEventListener("focus", showTooltip);
  btn.addEventListener("blur", hideTooltip);
  wrapper?.addEventListener("mouseleave", hideTooltip);

  btn.addEventListener("click", () => {
    const isOpen = menu.style.display === "flex";
    closeLangMenus();
    if (!isOpen) {
      openMenu();
    }
    hideTooltip();
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      closeMenu();
    }
    if (wrapper && !wrapper.contains(e.target)) {
      hideTooltip();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
      hideTooltip();
    }
  });
}

langButtons.forEach(setupLangSwitcher);

langOptions.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetLang = btn.dataset.lang;
    if (!targetLang) return;
    void setLanguage(targetLang);
  });
});

// Scroll-to-top links
const scrollTopLinks = Array.from(
  document.querySelectorAll("[data-scroll-top]")
);
const siteFooter = document.querySelector(".site-footer");
const SCROLL_TOP_REVEAL_Y = 480;

scrollTopLinks.forEach((link) => {
  link.classList.remove("is-visible");
});

function shouldShowScrollTopLinks() {
  return window.scrollY > SCROLL_TOP_REVEAL_Y;
}

function updateScrollTopLinksVisibility() {
  const isVisible = shouldShowScrollTopLinks();
  const footerOverlap = siteFooter instanceof Element
    ? Math.max(0, window.innerHeight - siteFooter.getBoundingClientRect().top)
    : 0;
  const footerOffset = footerOverlap > 0 ? `${footerOverlap}px` : "0px";

  scrollTopLinks.forEach((link) => {
    link.classList.toggle("is-visible", isVisible);
    link.style.setProperty("--scroll-top-footer-offset", footerOffset);
  });
}

let scrollTopVisibilityFrame = 0;
function requestScrollTopLinksVisibilityUpdate() {
  if (scrollTopVisibilityFrame) return;

  scrollTopVisibilityFrame = window.requestAnimationFrame(() => {
    scrollTopVisibilityFrame = 0;
    updateScrollTopLinksVisibility();
  });
}

function scheduleInitialScrollTopLinksVisibility() {
  const run = () => requestScrollTopLinksVisibilityUpdate();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 1200 });
    return;
  }

  window.setTimeout(run, 240);
}

document.addEventListener("click", (e) => {
  const target = e.target instanceof Element
    ? e.target.closest("[data-scroll-top]")
    : null;
  if (!target) return;

  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

if (scrollTopLinks.length > 0) {
  scheduleInitialScrollTopLinksVisibility();
  window.addEventListener("scroll", requestScrollTopLinksVisibilityUpdate, {
    passive: true,
  });
  window.addEventListener("resize", requestScrollTopLinksVisibilityUpdate);
}

function initTheme() {
  if (themeInitialized) return;
  themeInitialized = true;
  document.documentElement.setAttribute("data-theme", "light");
}

initTheme();

const fallbackLang = "de";
const supportedLanguages = ["de", "ru", "uk"];
const LANG_STORAGE_KEY = "preferred_lang";
// central language state (avoids duplicate globals)
const langState = { current: fallbackLang };
const appState = {
  availabilityPromise: null,
  heroFoldRefresher: null,
  homeAccountFoldRefresher: null,
  translationsPromise: null,
  localePromises: {},
  loadedLocaleOverlays: new Set(),
};
const authSessionState = {
  initialized: false,
  idleTimerId: 0,
  statusTimerId: 0,
  lastActivityPingAt: 0,
  checkingStatus: false,
  sendingActivity: false,
  redirecting: false,
};

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;)\s*csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function getAuthSessionConfig() {
  const raw = window.AUTH_SESSION_CONFIG || {};
  const isAuthenticated =
    raw.isAuthenticated === true || raw.isAuthenticated === "true";

  return {
    isAuthenticated,
    activityUrl: raw.activityUrl || "/api/session/activity/",
    statusUrl: raw.statusUrl || "/api/session/status/",
    loginUrl: raw.loginUrl || "/login/",
    idleTimeoutMs: Math.max(1000, Number(raw.idleTimeoutMs) || 600000),
    statusPollMs: Math.max(5000, Number(raw.statusPollMs) || 15000),
    activityThrottleMs: Math.max(1000, Number(raw.activityThrottleMs) || 15000),
  };
}

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
}

function buildFallbackAuthRedirectUrl(config, reason = "idle") {
  const isIdleTimeout = reason === "idle_timeout";
  const url = isIdleTimeout
    ? new URL("/", window.location.origin)
    : new URL(config.loginUrl, window.location.origin);
  const loginReason = reason === "idle_timeout" ? "idle" : reason;

  if (loginReason) {
    url.searchParams.set("reason", loginReason);
  }

  if (!isIdleTimeout) {
    const currentPath =
      `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url.pathname !== window.location.pathname || url.search) {
      url.searchParams.set("next", currentPath);
    }
  }

  return url.toString();
}

function redirectToExpiredLogin(config, payload) {
  if (authSessionState.redirecting) return;
  authSessionState.redirecting = true;

  const target = payload?.loginUrl
    ? new URL(payload.loginUrl, window.location.origin).toString()
    : buildFallbackAuthRedirectUrl(config, payload?.reason || "idle");

  window.location.assign(target);
}

async function checkAuthSessionStatus(config) {
  if (!config.isAuthenticated) return;
  if (authSessionState.redirecting || authSessionState.checkingStatus) return;

  authSessionState.checkingStatus = true;
  try {
    const response = await fetch(config.statusUrl, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (response.status === 401) {
      const payload = await parseJsonSafely(response);
      redirectToExpiredLogin(config, payload);
      return;
    }

    if (!response.ok) return;

    const payload = await parseJsonSafely(response);
    if (payload && payload.authenticated === false) {
      redirectToExpiredLogin(config, payload);
    }
  } catch (err) {
    /* ignore transient network errors */
  } finally {
    authSessionState.checkingStatus = false;
  }
}

async function sendAuthActivity(config, { force = false } = {}) {
  if (!config.isAuthenticated) return;
  if (authSessionState.redirecting || authSessionState.sendingActivity) return;

  const now = Date.now();
  if (!force && now - authSessionState.lastActivityPingAt < config.activityThrottleMs) {
    return;
  }

  const csrfToken = getCsrfToken();
  if (!csrfToken) return;

  authSessionState.sendingActivity = true;
  try {
    const response = await fetch(config.activityUrl, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: "{}",
    });

    if (response.status === 401) {
      const payload = await parseJsonSafely(response);
      redirectToExpiredLogin(config, payload);
      return;
    }

    if (!response.ok) return;

    authSessionState.lastActivityPingAt = now;
  } catch (err) {
    /* ignore transient network errors */
  } finally {
    authSessionState.sendingActivity = false;
  }
}

function resetAuthIdleTimer(config) {
  if (authSessionState.idleTimerId) {
    window.clearTimeout(authSessionState.idleTimerId);
  }

  authSessionState.idleTimerId = window.setTimeout(() => {
    void checkAuthSessionStatus(config);
  }, config.idleTimeoutMs);
}

function registerAuthActivity(config, { forcePing = false } = {}) {
  if (!config.isAuthenticated || authSessionState.redirecting) return;
  resetAuthIdleTimer(config);
  void sendAuthActivity(config, { force: forcePing });
}

function initAuthSessionTimeout() {
  if (authSessionState.initialized) return;

  const config = getAuthSessionConfig();
  if (!config.isAuthenticated) return;

  authSessionState.initialized = true;

  registerAuthActivity(config, { forcePing: true });
  void checkAuthSessionStatus(config);

  authSessionState.statusTimerId = window.setInterval(() => {
    void checkAuthSessionStatus(config);
  }, config.statusPollMs);

  ["pointerdown", "mousemove", "scroll", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, () => registerAuthActivity(config), {
      passive: true,
    });
  });

  document.addEventListener("keydown", () => registerAuthActivity(config));

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    registerAuthActivity(config, { forcePing: true });
    void checkAuthSessionStatus(config);
  });

  window.addEventListener("focus", () => {
    registerAuthActivity(config, { forcePing: true });
    void checkAuthSessionStatus(config);
  });
}

function authFormToggleLabels() {
  const lang = (document.documentElement.lang || fallbackLang).slice(0, 2);
  if (lang === "uk") return { show: "Показати пароль", hide: "Приховати пароль" };
  if (lang === "ru") {
    return {
      show: "Показать пароль",
      hide: "Скрыть пароль",
    };
  }
  return {
    show: "Passwort anzeigen",
    hide: "Passwort verbergen",
  };
}

function initAuthFormEnhancements() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    if (button.dataset.passwordToggleBound === "true") return;

    const inputId = button.dataset.passwordToggle;
    const input = inputId ? document.getElementById(inputId) : null;
    if (!(input instanceof HTMLInputElement)) return;

    button.dataset.passwordToggleBound = "true";
    const icon = button.querySelector('[aria-hidden="true"]');
    const textTarget = button.querySelector("[data-password-toggle-text]");
    const labels = authFormToggleLabels();

    const syncState = () => {
      const visible = input.type === "text";
      const label = visible ? labels.hide : labels.show;
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-pressed", visible ? "true" : "false");
      if (textTarget) textTarget.textContent = label;
      if (icon && icon.localName !== "svg") icon.textContent = visible ? "🙈" : "👁";
    };

    button.addEventListener("click", () => {
      input.type = input.type === "password" ? "text" : "password";
      syncState();
      input.focus({ preventScroll: true });
      const end = input.value.length;
      if (typeof input.setSelectionRange === "function") {
        input.setSelectionRange(end, end);
      }
    });

    syncState();
  });

  document.querySelectorAll("form[data-submit-once]").forEach((form) => {
    if (form.dataset.submitOnceBound === "true") return;

    form.dataset.submitOnceBound = "true";
    form.addEventListener("submit", (event) => {
      const submitter = event.submitter instanceof HTMLButtonElement
        ? event.submitter
        : form.querySelector('button[type="submit"]');
      if (!(submitter instanceof HTMLButtonElement)) return;
      if (submitter.dataset.submitting === "true") {
        event.preventDefault();
        return;
      }

      submitter.dataset.submitting = "true";
      submitter.disabled = true;
      submitter.classList.add("is-loading");
      if (submitter.dataset.loadingLabel) {
        submitter.textContent = submitter.dataset.loadingLabel;
      }
    });
  });
}

// === i18n (runtime, uses window.TRANSLATIONS) ===
function getTranslations() {
  return window.TRANSLATIONS || {};
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeTranslationTree(base, overlay) {
  if (Array.isArray(overlay)) {
    return overlay.slice();
  }
  if (!isPlainObject(overlay)) {
    return overlay;
  }

  const source = isPlainObject(base) ? base : {};
  const merged = { ...source };

  Object.entries(overlay).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      merged[key] = value.slice();
      return;
    }
    if (isPlainObject(value)) {
      merged[key] = mergeTranslationTree(source[key], value);
      return;
    }
    merged[key] = value;
  });

  return merged;
}

function patchTranslations() {
  const translations = getTranslations();
  ["ru", "uk"].forEach((lang) => {
    if (!translations[lang]) return;
    const nav = translations[lang].nav || {};
    const footer = translations[lang].footer || {};
    nav.weather = nav.weather || "Погода";
    footer.weather_link = footer.weather_link || "Погода";
    translations[lang].nav = nav;
    translations[lang].footer = footer;
  });
  return translations;
}

function hasTranslationsFor(lang) {
  const translations = patchTranslations();
  return Boolean(translations[lang] || translations[fallbackLang]);
}

function getLocaleOverlayUrl(lang) {
  const mapped = window.I18N_LOCALE_URLS?.[lang];
  if (mapped) return mapped;
  return `/static/locales/${lang}.json`;
}

async function ensureLocaleOverlay(lang) {
  const targetLang = supportedLanguages.includes(lang) ? lang : fallbackLang;

  if (window.I18N_COMPLETE_LOCALES?.includes(targetLang)) {
    appState.loadedLocaleOverlays.add(targetLang);
    return patchTranslations();
  }

  if (appState.loadedLocaleOverlays.has(targetLang)) {
    return patchTranslations();
  }

  if (appState.localePromises[targetLang]) {
    return appState.localePromises[targetLang];
  }

  appState.localePromises[targetLang] = fetch(getLocaleOverlayUrl(targetLang), {
    credentials: "same-origin",
    cache: "no-cache",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`locale overlay ${targetLang} failed: ${response.status}`);
      }
      return response.json();
    })
    .then((overlay) => {
      const translations = getTranslations();
      const merged = {
        ...translations,
        [targetLang]: mergeTranslationTree(translations[targetLang], overlay),
      };
      window.TRANSLATIONS = merged;
      appState.loadedLocaleOverlays.add(targetLang);
      return patchTranslations();
    })
    .catch((err) => {
      console.warn(`locale overlay unavailable for ${targetLang}`, err);
      return patchTranslations();
    })
    .finally(() => {
      appState.localePromises[targetLang] = null;
    });

  return appState.localePromises[targetLang];
}

function ensureTranslationsLoaded(lang = fallbackLang) {
  const targetLang = supportedLanguages.includes(lang) ? lang : fallbackLang;

  const ensureScript = () => {
    if (hasTranslationsFor(targetLang)) {
      return Promise.resolve(patchTranslations());
    }
    if (appState.translationsPromise) {
      return appState.translationsPromise;
    }

    appState.translationsPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-translations-script="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(patchTranslations()), {
          once: true,
        });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = window.I18N_DATA_URL || "/static/js/i18n-data.js";
      script.defer = true;
      script.dataset.translationsScript = "true";
      script.onload = () => resolve(patchTranslations());
      script.onerror = (err) => {
        appState.translationsPromise = null;
        reject(err);
      };
      document.head.appendChild(script);
    });

    return appState.translationsPromise;
  };

  return ensureScript().then(() =>
    Promise.all([
      ensureLocaleOverlay(fallbackLang),
      targetLang === fallbackLang
        ? Promise.resolve(patchTranslations())
        : ensureLocaleOverlay(targetLang),
    ]).then(() => patchTranslations())
  );
}

function persistPreferredLang(lang) {
  if (!supportedLanguages.includes(lang)) return;
  try {
    localStorage.removeItem(LANG_STORAGE_KEY);
  } catch (err) {
    /* localStorage not available */
  }
  try {
    document.cookie = "preferred_lang=;path=/;max-age=0;samesite=lax";
  } catch (err) {
    /* cookies not available */
  }
}

function readPreferredLang() {
  try {
    localStorage.removeItem(LANG_STORAGE_KEY);
  } catch (err) {
    /* ignore */
  }
  try {
    document.cookie = "preferred_lang=;path=/;max-age=0;samesite=lax";
  } catch (err) {
    /* ignore */
  }
  return null;
}

function syncLangUI(lang) {
  langCurrents.forEach((el) => {
    el.textContent = (lang || fallbackLang).toUpperCase();
  });
  langOptions.forEach((btn) => {
    const active = btn.dataset.lang === lang;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-checked", active ? "true" : "false");
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

// Datums-Helfer (vermeiden mehrfach gesetzte Stunden/Minuten)
function getNested(dict, path) {
  return path
    .split(".")
    .reduce(
      (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
      dict
    );
}

function translate(key, langOverride) {
  const lang = langOverride || document.documentElement.lang || fallbackLang;
  const translations = patchTranslations();
  return (
    getNested(translations[lang], key) ??
    getNested(translations[fallbackLang], key) ??
    key
  );
}

const htmlLike = /<\/?[a-z][\s\S]*>/i;

function formatHeroTitle(el, value) {
  const text = String(value || "").trim();
  if (!text) return;

  el.setAttribute("aria-label", text);

  if (text === "Dolmetsch- & Sprachdienstleistungen") {
    const markup = '<span class="hero-title__line">Dolmetsch- &</span><span class="hero-title__line hero-title__line--long">Sprachdienstleistungen</span>';
    if (el.innerHTML !== markup) el.innerHTML = markup;
    return;
  }

  if (el.textContent !== text) el.textContent = text;
}

function applyTranslations(lang) {
  // Immer anwenden, auch wenn derselbe Wert erneut gesetzt wird,
  // damit spätes Laden des Dictionaries oder DOM-Updates greifen.
  langState.current = lang;
  const translations = patchTranslations();
  const fallbackDict = translations[fallbackLang];
  const dict = translations[lang] || fallbackDict;
  document.documentElement.setAttribute("lang", lang);
  if (!dict && !fallbackDict) return;

  const resolveTranslation = (key) =>
    getNested(dict, key) ?? getNested(fallbackDict, key);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const value = resolveTranslation(key);
    if (value === undefined) return;

    if (key === "hero.title") {
      formatHeroTitle(el, value);
      return;
    }

    const isHtml = htmlLike.test(value);
    if (isHtml) {
      if (el.innerHTML !== value) el.innerHTML = value;
    } else {
      if (el.textContent !== value) el.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const value = resolveTranslation(el.dataset.i18nTitle);
    if (value !== undefined && el.getAttribute("title") !== value) {
      el.setAttribute("title", value);
    }
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const value = resolveTranslation(el.dataset.i18nAriaLabel);
    if (value !== undefined && el.getAttribute("aria-label") !== value) {
      el.setAttribute("aria-label", value);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const value = resolveTranslation(el.dataset.i18nPlaceholder);
    if (value !== undefined && el.getAttribute("placeholder") !== value) {
      el.setAttribute("placeholder", value);
    }
  });

  document.querySelectorAll("[data-i18n-attrs]").forEach((el) => {
    const entries = (el.dataset.i18nAttrs || "")
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean);
    entries.forEach((entry) => {
      const separator = entry.indexOf(":");
      if (separator === -1) return;
      const attr = entry.slice(0, separator).trim();
      const key = entry.slice(separator + 1).trim();
      if (!attr || !key) return;
      const value = resolveTranslation(key);
      if (value !== undefined && el.getAttribute(attr) !== value) {
        el.setAttribute(attr, value);
      }
    });
  });


  document.dispatchEvent(
    new CustomEvent("app:translations-applied", {
      detail: { lang },
    })
  );
}

function detectBrowserLanguage() {
  readPreferredLang();

  const candidates = Array.from(
    new Set([
      ...(navigator.languages || []),
      navigator.language,
      navigator.userLanguage,
    ].filter(Boolean))
  );
  const browserLang = candidates
    .map((lang) => String(lang || "").slice(0, 2).toLowerCase())
    .find((lang) => supportedLanguages.includes(lang));
  if (browserLang) {
    return browserLang;
  }

  return fallbackLang;
}

function initPreferredLanguage() {
  const renderedLang =
    (document.documentElement.lang || fallbackLang).slice(0, 2).toLowerCase();
  const renderedPreferredLang = supportedLanguages.includes(renderedLang)
    ? renderedLang
    : "";
  const preferredLang = renderedPreferredLang || detectBrowserLanguage();
  const targetLang = supportedLanguages.includes(preferredLang)
    ? preferredLang
    : fallbackLang;

  langState.current = renderedLang;
  window.PREFERRED_LANG = targetLang;
  syncLangUI(renderedLang);
  closeLangMenus();

  if (targetLang === renderedLang) {
    langState.current = targetLang;
    persistPreferredLang(targetLang);
    ensureTranslationsLoaded(targetLang)
      .then(() => {
        applyTranslations(targetLang);
        refreshFoldLabels();
      })
      .catch((err) => {
        console.error("translations init failed", err);
      });
    return;
  }

  window.requestAnimationFrame(() => {
    void setLanguage(targetLang);
  });
}


// === Language switching ===
async function setLanguage(lang) {
  const targetLang = supportedLanguages.includes(lang) ? lang : fallbackLang;
  try {
    await ensureTranslationsLoaded(targetLang);
  } catch (err) {
    console.error("translations load failed", err);
  }

  langState.current = targetLang;
  persistPreferredLang(targetLang);
  window.PREFERRED_LANG = targetLang;
  syncLangUI(targetLang);
  closeLangMenus();
  applyTranslations(targetLang);
  refreshFoldLabels();
  try {
    window.dispatchEvent(
      new CustomEvent("preferred_lang_changed", { detail: targetLang })
    );
  } catch (err) {
    console.error("preferred_lang_changed event failed", err);
  }
}


function translateUI(path, fallback = "") {
  const translations = patchTranslations();
  const dict = translations[langState.current] || translations[fallbackLang];
  const value =
    getNested(dict, path) ?? getNested(translations[fallbackLang], path);
  return value ?? fallback;
}

function applyGuestAvatarImage() {
  const root = document.documentElement;
  const avatars = document.querySelectorAll("[data-avatar-img]");
  const imageValue = 'url("/static/images/language-bg.webp")';
  if (root) {
    root.style.setProperty("--page-bg-image", imageValue);
  }
  avatars.forEach((avatar) => {
    if (avatar.dataset.userAvatar === "true" || avatar.dataset.avatarUrl) return;
    avatar.style.backgroundImage = imageValue;
  });
}

function initProfileFileInput() {
  const input = document.querySelector('[data-file-input="profile"]');
  const nameEl = document.querySelector('[data-file-name-target="profile"]');
  if (!input || !nameEl) return;
  const update = () => {
    const file = input.files && input.files[0];
    nameEl.textContent = file ? file.name : (nameEl.dataset.emptyLabel || "Keine Datei ausgewählt");
  };
  input.addEventListener("change", update);
  update();
}

// === Hero fold ===
function refreshFoldLabels() {
  document.querySelectorAll(".fold-section").forEach((section) => {
    const toggle = section.querySelector(".section-fold-toggle");
    const label = toggle?.querySelector(".section-fold-label");
    if (!toggle || !label) return;
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    const openLabel = translateUI("ui.fold_close", label.textContent);
    const closedLabel = translateUI("ui.fold_open", label.textContent);
    label.textContent = isOpen ? openLabel : closedLabel;
  });
}


// === Fold sections ===
function initFoldSections() {
  const storageKey = "foldSections";
  const readState = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch (e) {
      return {};
    }
  };
  const writeState = (state) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      /* localStorage not available */
    }
  };

  const storedState = readState();

  document.querySelectorAll(".fold-section").forEach((section, index) => {
    const toggle = section.querySelector(".section-fold-toggle");
    const body = section.querySelector(".section-body");
    if (!toggle || !body) return;

    const foldKey = section.id || `section-${index + 1}`;
    section.dataset.foldKey = foldKey;

    const bodyId = body.id || `${foldKey}-body`;
    body.id = bodyId;
    toggle.setAttribute("aria-controls", bodyId);

    const label = toggle.querySelector(".section-fold-label");
    const chevron = toggle.querySelector(".chevron");

    const setState = (open) => {
      section.classList.toggle("closed", !open);
      toggle.setAttribute("aria-expanded", String(open));
      body.hidden = !open;
      if (label) {
        const openLabel = translateUI("ui.fold_close", "Zuklappen");
        const closedLabel = translateUI("ui.fold_open", "Aufklappen");
        label.textContent = open ? openLabel : closedLabel;
      }
      if (chevron) {
        chevron.setAttribute("aria-hidden", "true");
      }
      storedState[foldKey] = open;
      writeState(storedState);
    };

    const initial = Object.prototype.hasOwnProperty.call(storedState, foldKey)
      ? Boolean(storedState[foldKey])
      : true;
    setState(initial);

    toggle.addEventListener("click", () => {
      const next = section.classList.contains("closed");
      setState(next);
    });
  });
}

function initFooterAppLinks() {
  const isAndroid = /Android/i.test(window.navigator.userAgent || "");
  if (!isAndroid) return;

  document.querySelectorAll(".footer-app-link[data-android-intent]").forEach((link) => {
    if (link.dataset.appIntentBound === "true") return;
    link.dataset.appIntentBound = "true";

    link.addEventListener("click", (event) => {
      const intentUrl = link.dataset.androidIntent;
      const storeUrl = link.dataset.storeUrl || link.href;
      if (!intentUrl || !storeUrl) return;

      event.preventDefault();

      let fallbackTimer = null;
      let handedOff = false;

      const cleanup = () => {
        if (fallbackTimer) {
          window.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pagehide", handlePageHide);
        window.removeEventListener("blur", handleBlur);
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          handedOff = true;
          cleanup();
        }
      };

      const handlePageHide = () => {
        handedOff = true;
        cleanup();
      };

      const handleBlur = () => {
        handedOff = true;
        cleanup();
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pagehide", handlePageHide, { once: true });
      window.addEventListener("blur", handleBlur, { once: true });

      fallbackTimer = window.setTimeout(() => {
        cleanup();
        if (!handedOff) {
          window.open(storeUrl, "_blank", "noopener,noreferrer");
        }
      }, 900);

      window.location.href = intentUrl;
    });
  });
}

function initManualNavigation() {
  const sidebar = document.querySelector(".manual-sidebar");
  if (!sidebar) return;

  const nav = sidebar.querySelector(".manual-nav");
  const links = Array.from(sidebar.querySelectorAll("[data-manual-nav]"));
  const currentIndex = sidebar.querySelector("[data-manual-current-index]");
  const fractionTotal = sidebar.querySelector(".manual-sidebar__fraction-total");
  const progressFill = sidebar.querySelector("[data-manual-progress]");
  const activeTitle = sidebar.querySelector("[data-manual-active-title]");
  const activeAnchor = sidebar.querySelector("[data-manual-active-anchor]");

  if (!nav || !links.length) return;

  let activeId = "";

  const readLinkTitle = (link) =>
    link.querySelector(".manual-nav__title")?.textContent.trim() ||
    link.textContent.trim();
  const getInitialId = () => {
    const hashId = window.location.hash.replace(/^#/, "");
    if (hashId && links.some((link) => link.getAttribute("href") === `#${hashId}`)) {
      return hashId;
    }
    return links[0]?.getAttribute("href")?.replace(/^#/, "") || "";
  };

  if (fractionTotal) {
    fractionTotal.textContent = `/${links.length}`;
  }

  const setActive = (id, force = false) => {
    if (!id || (!force && id === activeId)) return;
    const activeLink = links.find((link) => link.getAttribute("href") === `#${id}`);
    if (!activeLink) return;

    activeId = id;
    const currentStep = Math.max(1, links.indexOf(activeLink) + 1);
    const progress = `${(currentStep / links.length) * 100}%`;

    links.forEach((link) => {
      const isActive = link === activeLink;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (currentIndex) currentIndex.textContent = String(currentStep);
    if (progressFill) progressFill.style.width = progress;
    if (activeTitle) activeTitle.textContent = readLinkTitle(activeLink);
    if (activeAnchor) activeAnchor.textContent = `#${id}`;
    activeLink.scrollIntoView({ block: "nearest", inline: "nearest" });
    revealManualSection(id);

  };

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href")?.replace(/^#/, "");
      if (id) setActive(id);
    });
  });

  document.addEventListener("app:translations-applied", () => {
    const fallbackId = activeId || getInitialId();
    if (fallbackId) setActive(fallbackId, true);
  });
  window.addEventListener("hashchange", () => {
    const nextId = getInitialId();
    if (nextId) setActive(nextId, true);
  });
  const initialId = getInitialId();
  if (initialId) setActive(initialId, true);
}

function revealManualSection(id) {
  if (!id) return;
  const section = document.getElementById(id);
  if (!section || !section.classList.contains("manual-section")) return;

  const toggle = section.querySelector("[data-manual-toggle]");
  const body = section.querySelector("[data-manual-body]");
  if (!toggle || !body) return;

  setManualSectionCollapsed(section, toggle, body, false);
}

function initManualSectionToggles() {
  const sections = Array.from(document.querySelectorAll(".manual-section[data-manual-section]"));
  if (!sections.length) return;

  sections.forEach((section, index) => {
    const toggle = section.querySelector("[data-manual-toggle]");
    const body = section.querySelector("[data-manual-body]");
    if (!toggle || !body) return;

    if (!body.id) {
      body.id = `${section.id || `manual-section-${index + 1}`}-body`;
    }
    toggle.setAttribute("aria-controls", body.id);
    setManualSectionCollapsed(section, toggle, body, false, { immediate: true });

    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      setManualSectionCollapsed(section, toggle, body, isExpanded);
    });
  });

  const initialId = window.location.hash.replace(/^#/, "");
  if (initialId) revealManualSection(initialId);
}

function updateManualToggleLabel(toggle, expanded) {
  const label = expanded ? "Abschnitt zuklappen" : "Abschnitt aufklappen";
  toggle.setAttribute("aria-label", label);
  toggle.setAttribute("title", label);
}

function cleanupManualBodyTransition(body) {
  if (typeof body._manualToggleCleanup === "function") {
    body._manualToggleCleanup();
  }
}

function setManualSectionCollapsed(section, toggle, body, collapsed, options = {}) {
  const { immediate = false } = options;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCurrentlyCollapsed =
    section.classList.contains("is-collapsed") || toggle.getAttribute("aria-expanded") === "false";

  if (!immediate && collapsed === isCurrentlyCollapsed && body.hidden === collapsed) {
    updateManualToggleLabel(toggle, !collapsed);
    return;
  }

  cleanupManualBodyTransition(body);

  const applyFinalState = () => {
    section.classList.toggle("is-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    updateManualToggleLabel(toggle, !collapsed);
    body.hidden = collapsed;
    body.style.height = "";
    body.style.overflow = "";
    body.style.opacity = "";
    body.style.transform = "";
  };

  if (immediate || reduceMotion) {
    applyFinalState();
    return;
  }

  body.hidden = false;
  body.style.overflow = "hidden";

  if (collapsed) {
    const startHeight = body.scrollHeight;
    body.style.height = `${startHeight}px`;
    body.style.opacity = "1";
    body.style.transform = "translateY(0)";
    section.classList.add("is-collapsed");
    toggle.setAttribute("aria-expanded", "false");
    updateManualToggleLabel(toggle, false);
    void body.offsetHeight;
    body.style.height = "0px";
    body.style.opacity = "0";
    body.style.transform = "translateY(-0.22rem)";
  } else {
    section.classList.remove("is-collapsed");
    toggle.setAttribute("aria-expanded", "true");
    updateManualToggleLabel(toggle, true);
    body.style.height = "0px";
    body.style.opacity = "0";
    body.style.transform = "translateY(-0.22rem)";
    void body.offsetHeight;
    body.style.height = `${body.scrollHeight}px`;
    body.style.opacity = "1";
    body.style.transform = "translateY(0)";
  }

  const onTransitionEnd = (event) => {
    if (event.target !== body || event.propertyName !== "height") return;
    body.removeEventListener("transitionend", onTransitionEnd);
    body._manualToggleCleanup = null;
    applyFinalState();
  };

  body._manualToggleCleanup = () => {
    body.removeEventListener("transitionend", onTransitionEnd);
    body._manualToggleCleanup = null;
  };
  body.addEventListener("transitionend", onTransitionEnd);
}

const runIdle = window.requestIdleCallback
  ? (fn) => window.requestIdleCallback(fn, { timeout: 500 })
  : (fn) => setTimeout(fn, 1);

function initLoadAnimations() {
  if (document.documentElement.classList.contains("page-is-loaded")) return;

  const markLoaded = () => {
    window.setTimeout(() => {
      document.documentElement.classList.add("page-is-loaded");
    }, 220);
  };

  if (document.readyState === "complete") {
    markLoaded();
    return;
  }

  window.addEventListener("load", markLoaded, { once: true });
}

function initTemplateScrollRevealTargets() {
  const root = document.querySelector(".template-body .page-shell.template-page");
  if (!root) return;
  if (root.classList.contains("legal-page-shell--imprint")) return;

  const setRevealAttributes = (
    element,
    { reveal = "up", delay = 0, duration = 720, distance = "" } = {}
  ) => {
    if (!element || !(element instanceof HTMLElement)) return;

    if (!element.hasAttribute("data-reveal")) {
      element.setAttribute("data-reveal", reveal);
    }

    if (!element.hasAttribute("data-reveal-delay")) {
      element.setAttribute("data-reveal-delay", String(Math.max(0, delay)));
    }

    if (!element.hasAttribute("data-reveal-duration")) {
      element.setAttribute("data-reveal-duration", String(duration));
    }

    if (distance && !element.hasAttribute("data-reveal-distance")) {
      element.setAttribute("data-reveal-distance", distance);
    }
  };

  const stageElements = (
    elements,
    {
      baseDelay = 0,
      step = 70,
      maxDelay = 520,
      reveal = "up",
      duration = 720,
      distance = "",
      force = false,
    } = {}
  ) => {
    Array.from(elements)
      .filter((element, index, list) => element instanceof HTMLElement && list.indexOf(element) === index)
      .forEach((element, index) => {
        if (force) {
          element.removeAttribute("data-reveal");
          element.removeAttribute("data-reveal-delay");
          element.removeAttribute("data-reveal-duration");
          element.removeAttribute("data-reveal-distance");
        }

        const resolvedReveal =
          typeof reveal === "function" ? reveal(element, index) : reveal;
        setRevealAttributes(element, {
          reveal: resolvedReveal,
          delay: Math.min(baseDelay + index * step, maxDelay),
          duration,
          distance,
        });
      });
  };

  const selectors = [
    ".template-hero",
    ".terms-hero",
    ".template-panel",
    ".legal-section",
    ".weather-page-main",
    ".weather-side-card",
    ".profile-card",
    ".profile-card__panel",
    ".apply-sidebar-card",
    ".apply-value-card",
    ".apply-status-card",
    ".template-panel-grid > *",
  ];

  const elements = Array.from(root.querySelectorAll(selectors.join(",")))
    .filter((element, index, list) => list.indexOf(element) === index);

  let panelIndex = 0;
  elements.forEach((element, index) => {
    if (
      element.matches(
        ".template-panel, .legal-section, .weather-side-card, .profile-card, .apply-value-card, .apply-status-card"
      )
    ) {
      element.classList.add("motion-hover-lift");
    }

    const isHero = element.matches(".template-hero, .terms-hero");
    const isPanel = element.matches(
      ".template-panel, .legal-section, .weather-page-main, .weather-side-card, .profile-card, .profile-card__panel, .apply-sidebar-card, .apply-value-card, .apply-status-card"
    );
    const reveal = isHero ? "down" : isPanel && panelIndex++ % 2 === 1 ? "right" : "left";

    setRevealAttributes(element, {
      reveal,
      delay: Math.min(index * 85, 520),
      duration: 760,
      distance: isPanel ? "1.25rem" : "",
    });
  });

  root.querySelectorAll(".template-hero__copy, .terms-hero__copy").forEach((container) => {
    stageElements(container.children, {
      baseDelay: 80,
      step: 110,
      maxDelay: 680,
      reveal: "up",
      duration: 800,
      distance: "1rem",
    });
  });

  root.querySelectorAll(".terms-hero__facts").forEach((container) => {
    stageElements(container.children, {
      baseDelay: 260,
      step: 110,
      maxDelay: 700,
      reveal: "zoom",
      duration: 760,
    });
  });

  root.querySelectorAll(".template-panel, .legal-section").forEach((panel) => {
    const directContent = Array.from(panel.children).filter(
      (child) =>
        child instanceof HTMLElement &&
        !child.matches("ul, ol, form, .template-panel-grid, .apply-value-grid")
    );
    const directListItems = Array.from(panel.children)
      .filter((child) => child instanceof HTMLElement && child.matches("ul, ol"))
      .flatMap((list) => Array.from(list.children))
      .filter((child) => child instanceof HTMLElement && child.matches("li"));
    const nestedListItems = Array.from(panel.querySelectorAll(".template-list > li"));

    stageElements(directContent, {
      baseDelay: 120,
      step: 95,
      maxDelay: 720,
      reveal: "up",
      duration: 760,
      distance: "0.95rem",
    });

    stageElements([...directListItems, ...nestedListItems], {
      baseDelay: 190,
      step: 75,
      maxDelay: 900,
      reveal: "up",
      duration: 720,
      distance: "0.85rem",
    });
  });

  stageElements(root.querySelectorAll(".apply-value-card, .apply-sidebar-card, .apply-status-card"), {
    baseDelay: 210,
    step: 105,
    maxDelay: 760,
    reveal: "up",
    duration: 760,
  });

  stageElements(root.querySelectorAll(".form-field, .apply-form-actions, .contact-notice"), {
    baseDelay: 170,
    step: 80,
    maxDelay: 900,
    reveal: "up",
    duration: 720,
    distance: "0.9rem",
  });
}

function initScrollReveal() {
  if (document.documentElement.dataset.motionRevealInit === "true") return;

  initTemplateScrollRevealTargets();

  const revealElements = Array.from(document.querySelectorAll("[data-reveal]")).filter(
    (element) => !element.classList.contains("section-kicker"),
  );
  if (revealElements.length === 0) return;

  document.documentElement.dataset.motionRevealInit = "true";

  revealElements.forEach((element) => {
    const delay = Number.parseInt(element.dataset.revealDelay || "", 10);
    if (Number.isFinite(delay) && delay >= 0) {
      element.style.setProperty("--reveal-delay", `${delay}ms`);
    }

    const duration = Number.parseInt(element.dataset.revealDuration || "", 10);
    if (Number.isFinite(duration) && duration > 0) {
      element.style.setProperty("--reveal-duration", `${duration}ms`);
    }

    const distance = String(element.dataset.revealDistance || "").trim();
    if (distance) {
      element.style.setProperty("--reveal-distance", distance);
    }
  });

  const revealNow = (element) => {
    element.classList.add("is-revealed");
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach(revealNow);
    return;
  }

  document.documentElement.classList.add("js-motion-ready");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealNow(entry.target);
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -10% 0px",
    }
  );

  revealElements.forEach((element) => observer.observe(element));
}

function initPage() {
  initTheme();
  initPreferredLanguage();
  initAuthSessionTimeout();
  initAuthFormEnhancements();
  initLoadAnimations();

  runIdle(() => {
    initScrollReveal();
  });


  if (document.querySelector("[data-womens-day-effect]")) {
    initWomensDayEffects();
  }

  runIdle(() => {
    if (document.querySelector("[data-avatar-img]")) {
      applyGuestAvatarImage();
    }
    if (document.querySelector('[data-file-input="profile"]')) {
      initProfileFileInput();
    }
    if (document.querySelector(".fold-section")) {
      initFoldSections();
    }
    if (document.querySelector("[data-manual-toggle]")) {
      initManualSectionToggles();
    }
    if (document.querySelector(".manual-sidebar")) {
      initManualNavigation();
    }
    if (document.querySelector(".footer-app-link[data-android-intent]")) {
      initFooterAppLinks();
    }
  });
}


function initWomensDayEffects() {
  document.querySelectorAll("[data-womens-day-effect]").forEach((card) => {
    if (card.dataset.womensDayBound === "true") return;
    card.dataset.womensDayBound = "true";

    let dragging = false;

    const setReveal = (value) => {
      const percent = Math.max(0, Math.min(100, Number(value) || 0));
      card.style.setProperty("--reveal", `${percent}%`);
    };

    const setFromClientX = (clientX) => {
      const rect = card.getBoundingClientRect();
      const percent = ((clientX - rect.left) / rect.width) * 100;
      setReveal(percent);
    };

    card.addEventListener("pointerdown", (event) => {
      dragging = true;
      setFromClientX(event.clientX);
      if (card.setPointerCapture) {
        card.setPointerCapture(event.pointerId);
      }
    });

    card.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      setFromClientX(event.clientX);
    });

    const stopDragging = (event) => {
      if (!dragging) return;
      dragging = false;
      if (card.releasePointerCapture && card.hasPointerCapture?.(event.pointerId)) {
        card.releasePointerCapture(event.pointerId);
      }
    };

    card.addEventListener("pointerup", stopDragging);
    card.addEventListener("pointercancel", stopDragging);

    card.addEventListener("click", (event) => {
      if (dragging) return;
      setFromClientX(event.clientX);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}
