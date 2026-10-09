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

const HOME_ENTRY_TARGETS = new Set(["leistungen", "kontakt"]);

function getHomeEntryTargetId(hash) {
  const normalized = String(hash || "").trim().replace(/^#/, "");
  return HOME_ENTRY_TARGETS.has(normalized) ? normalized : "";
}

function setHomeEntryLocked(locked) {
  document.documentElement.classList.toggle("home-entry-locked", locked);
}

function getHomeEntryScrollOffset() {
  const topnav = document.getElementById("mainTopnav");
  return (topnav?.offsetHeight || 0) + 18;
}

function scrollToHomeEntryTarget(targetId, behavior = "smooth") {
  const target = document.getElementById(targetId);
  if (!target) return;

  const top =
    target.getBoundingClientRect().top + window.scrollY - getHomeEntryScrollOffset();

  window.scrollTo({
    top: Math.max(0, top),
    behavior,
  });
}

function openHomeEntryTarget(
  targetId,
  { behavior = "smooth", updateHistory = false, replaceHistory = false } = {}
) {
  if (!getHomeEntryTargetId(targetId)) return;

  setHomeEntryLocked(false);

  if (updateHistory) {
    const targetUrl = `${window.location.pathname}${window.location.search}#${targetId}`;
    const historyMethod = replaceHistory ? "replaceState" : "pushState";
    window.history[historyMethod](null, "", targetUrl);
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollToHomeEntryTarget(targetId, behavior);
    });
  });
}

function initHomeEntryNavigation() {
  if (!document.body.classList.contains("home-page")) return;
  if (!document.querySelector("[data-home-main]")) return;

  const initialTargetId = getHomeEntryTargetId(window.location.hash);

  if (initialTargetId) {
    openHomeEntryTarget(initialTargetId, {
      behavior: "auto",
      replaceHistory: true,
    });
  } else {
    setHomeEntryLocked(true);
  }

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element
      ? event.target.closest("a[href]")
      : null;
    if (!link) return;

    const url = new URL(link.getAttribute("href") || "", window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname !== window.location.pathname) return;

    const targetId = getHomeEntryTargetId(url.hash);
    if (!targetId) return;

    event.preventDefault();
    openHomeEntryTarget(targetId, {
      behavior: "smooth",
      updateHistory: window.location.hash !== `#${targetId}`,
    });
  });

  window.addEventListener("hashchange", () => {
    const targetId = getHomeEntryTargetId(window.location.hash);

    if (targetId) {
      openHomeEntryTarget(targetId, {
        behavior: "auto",
      });
      return;
    }

    setHomeEntryLocked(true);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  });
}

// The public site always uses its light design.
function initTheme() {
  if (themeInitialized) return;
  themeInitialized = true;
  document.documentElement.setAttribute("data-theme", "light");
}

initTheme();

function updateAvailabilityPill() {
  const pill = document.getElementById("availabilityStatus");
  if (!pill) return;

  const baseText = pill.dataset.baseText || pill.textContent.trim();
  pill.dataset.baseText = baseText;

  const now = new Date();
  const day = now.getDay(); // 0 = Sonntag
  const isWeekend = day === 0 || day === 6;
  const todayMeta = getDayMeta(now);
  const isBlockedDay =
    todayMeta.unavailable || todayMeta.holiday || todayMeta.isSunday;

  const open = new Date(now);
  open.setHours(WORKDAY_START, 0, 0, 0);
  const close = new Date(now);
  close.setHours(WORKDAY_END, 0, 0, 0);

  let state = "closed";
  let suffix = "";

  if (!isWeekend && !isBlockedDay && now >= open && now < close) {
    const minutesLeft = Math.floor((close - now) / 60000);
    const hhmmLeft = [
      String(Math.floor(minutesLeft / 60)).padStart(2, "0"),
      String(minutesLeft % 60).padStart(2, "0"),
    ].join(":");
    if (minutesLeft <= 10) {
      state = "soon";
    } else {
      state = "open";
    }
    suffix = ` · noch ${hhmmLeft} min`;
  }

  pill.classList.remove("open", "soon", "closed");
  pill.classList.add(state);
  pill.textContent = `${baseText}${suffix}`;
}

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
      if (icon) icon.textContent = visible ? "🙈" : "👁";
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

const availabilityState = {
  events: [],
  dayMeta: {},
  rawDays: {},
};

let availabilityCalendar = null;
const WORKDAY_START = 9;
// Standard office hours: 09:00–18:00
const WORKDAY_END = 18;
const SATURDAY_END = 11;
const DEFAULT_EVENT_DURATION_MIN = 60;
const WEEKDAY = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};
const calendarState = {
  currentDate: new Date(),
  selectedDateKey: "",
};

let calendarTooltipEl = null;
let calendarTooltipHideTimeout = null;
let calendarTooltipHandlersBound = false;
let availabilityCalendarLangBound = false;
let calendarInlineDetailBound = false;

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
function atStartOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function atEndOfYear(date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function isWithinRange(date, range) {
  if (!range?.start || !range?.end) return false;
  const ts = date.getTime();
  return ts >= range.start.getTime() && ts <= range.end.getTime();
}

const blockedRangeUntilYearEnd = (() => {
  const today = atStartOfDay(new Date());
  return { start: today, end: atEndOfYear(today) };
})();

const extraBlockedDates = (() => {
  const now = new Date();
  const years = [now.getFullYear(), now.getFullYear() + 1];
  const dates = [];
  years.forEach((year) => {
    dates.push(`${year}-01-02`, `${year}-01-03`);
  });
  return new Set(dates);
})();

// Auswahl an Feiertagen in Niedersachsen (2025/2026)
const niedersachsenHolidays = {
  2024: {
    "2024-12-25": "1. Weihnachtstag",
    "2024-12-26": "2. Weihnachtstag",
  },
  2025: {
    "2025-01-01": "Neujahr",
    "2025-04-18": "Karfreitag",
    "2025-04-21": "Ostermontag",
    "2025-05-01": "Tag der Arbeit",
    "2025-05-29": "Christi Himmelfahrt",
    "2025-06-09": "Pfingstmontag",
    "2025-10-03": "Tag der Deutschen Einheit",
    "2025-10-31": "Reformationstag",
    "2025-12-25": "1. Weihnachtstag",
    "2025-12-26": "2. Weihnachtstag",
  },
  2026: {
    "2026-01-01": "Neujahr",
    "2026-04-03": "Karfreitag",
    "2026-04-05": "Ostersonntag",
    "2026-04-06": "Ostermontag",
    "2026-05-01": "Tag der Arbeit",
    "2026-05-14": "Christi Himmelfahrt",
    "2026-05-25": "Pfingstmontag",
    "2026-10-03": "Tag der Deutschen Einheit",
    "2026-10-31": "Reformationstag",
    "2026-12-24": "Heiligabend",
    "2026-12-25": "1. Weihnachtstag",
    "2026-12-26": "2. Weihnachtstag",
    "2026-12-31": "Silvester",
  },
  2027: {
    "2027-01-01": "Neujahr",
    "2027-03-26": "Karfreitag",
    "2027-03-28": "Ostersonntag",
    "2027-03-29": "Ostermontag",
    "2027-05-01": "Tag der Arbeit",
    "2027-05-06": "Christi Himmelfahrt",
    "2027-05-17": "Pfingstmontag",
    "2027-10-03": "Tag der Deutschen Einheit",
    "2027-10-31": "Reformationstag",
    "2027-12-24": "Heiligabend",
    "2027-12-25": "1. Weihnachtstag",
    "2027-12-26": "2. Weihnachtstag",
    "2027-12-31": "Silvester",
  },
};

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

const localeMap = {
  de: "de-DE",
  en: "en-US",
  ru: "ru-RU",
  uk: "uk-UA",
};

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "")
    .split("-")
    .map((part) => Number(part));
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getHolidayInfo(date) {
  const year = date.getFullYear();
  const key = formatDateKey(date);
  const holidays = niedersachsenHolidays[year] || {};
  return holidays[key] || null;
}

function ensureCalendarTooltip() {
  if (calendarTooltipEl) return calendarTooltipEl;
  const el = document.createElement("div");
  el.id = "calendarTooltip";
  el.className = "calendar-tooltip";
  document.body.appendChild(el);
  calendarTooltipEl = el;
  return el;
}

function hideCalendarTooltip(delay = 120) {
  if (calendarTooltipHideTimeout) clearTimeout(calendarTooltipHideTimeout);
  if (!calendarTooltipEl) return;
  calendarTooltipHideTimeout = setTimeout(() => {
    calendarTooltipEl.classList.remove("visible");
  }, delay);
}

function bindCalendarTooltipGlobalHandlers() {
  if (calendarTooltipHandlersBound) return;
  window.addEventListener(
    "scroll",
    () => {
      hideCalendarTooltip(0);
    },
    true
  );
  window.addEventListener("resize", () => hideCalendarTooltip(0));
  calendarTooltipHandlersBound = true;
}

function buildDayMeta(events, days) {
  const meta = {};
  (events || []).forEach((evt) => {
    if (!evt || !evt.start) return;
    const dateKey = String(evt.start).slice(0, 10);
    if (!meta[dateKey]) meta[dateKey] = { events: [], unavailable: false };
    meta[dateKey].events.push(evt);
  });

  Object.entries(days || {}).forEach(([day, info]) => {
    if (!meta[day]) meta[day] = { events: [] };
    meta[day].unavailable = Boolean(info?.unavailable);
    meta[day].note = info?.note || meta[day].note || "";
  });

  return meta;
}

function getDayMeta(date) {
  const dateKey = formatDateKey(date);
  const base = availabilityState.dayMeta[dateKey] || { events: [] };
  const dateAtMidnight = atStartOfDay(date);
  const meta = {
    events: Array.isArray(base.events) ? base.events : [],
    unavailable: Boolean(base.unavailable),
    note: base.note || "",
    limited: false,
    holiday: false,
    isSunday: false,
  };
  const hasEvents = meta.events.length > 0;

  if (!hasEvents && isWithinRange(dateAtMidnight, blockedRangeUntilYearEnd)) {
    // Deaktiviert: pauschale Blockade des restlichen Jahres sorgt dafür,
    // dass freie Tage als gesperrt erscheinen. Unverfügbarkeiten kommen
    // nur noch aus expliziten Tagen/Events.
  }

  if (!hasEvents && extraBlockedDates.has(dateKey)) {
    // Deaktiviert: pauschale Sperre bestimmter Tage; nur explizite Konfiguration zählt.
  }

  const weekday = date.getDay();
  const holidayName = getHolidayInfo(date);

  if (holidayName) {
    meta.holiday = true;
    meta.unavailable = true;
    meta.note = meta.note || holidayName;
  }

  if (weekday === WEEKDAY.SUNDAY) {
    meta.unavailable = true;
    meta.isSunday = true;
    if (!meta.note) meta.note = translate("calendar.note.sunday");
  } else if (weekday === WEEKDAY.SATURDAY && !meta.unavailable) {
    meta.limited = true;
    if (!meta.note) meta.note = translate("calendar.note.saturday");
  }

  return meta;
}

function formatTimeLabel(date, locale) {
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildDayTimeline(date) {
  const meta = getDayMeta(date);
  const lang = document.documentElement.lang || fallbackLang;
  const locale = localeMap[lang] || localeMap[fallbackLang];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  if (meta.unavailable) {
    const note = meta.note || translate("calendar.status.unavailable", lang);
    return [
      {
        status: "unavailable",
        label: translate("calendar.status.unavailable", lang),
        note,
      },
    ];
  }

  let windowStart = new Date(date);
  windowStart.setHours(WORKDAY_START, 0, 0, 0);

  let windowEnd = new Date(date);
  windowEnd.setHours(meta.limited ? SATURDAY_END : WORKDAY_END, 0, 0, 0);
  if (windowEnd <= windowStart) return [];

  const dayEvents = (meta.events || [])
    .map((evt) => {
      const start = evt.start ? new Date(evt.start) : null;
      let end = evt.end ? new Date(evt.end) : null;

      if (start && (!end || Number.isNaN(end.getTime()))) {
        end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MIN * 60000);
      }

      return {
        start,
        end,
        title: evt.title || "",
        note: evt.note || "",
      };
    })
    .filter((evt) => {
      const { start, end } = evt;
      if (!start || Number.isNaN(start.getTime())) return false;
      if (!end || Number.isNaN(end.getTime())) return false;
      return start < endOfDay && end > startOfDay;
    })
    .sort((a, b) => a.start - b.start);

  if (dayEvents.length) {
    const earliestEventStart = dayEvents.reduce((min, evt) => {
      const ts = evt.start?.getTime();
      return Number.isFinite(ts) ? Math.min(min, ts) : min;
    }, Number.POSITIVE_INFINITY);
    if (Number.isFinite(earliestEventStart) && earliestEventStart < windowStart) {
      windowStart = new Date(earliestEventStart);
    }
  }

  const segments = [];
  let cursor = windowStart;

  const latestEventEnd = dayEvents.reduce((max, evt) => {
    const endTime = evt.end?.getTime();
    return Number.isFinite(endTime) ? Math.max(max, endTime) : max;
  }, windowEnd.getTime());
  if (latestEventEnd > windowEnd.getTime()) {
    windowEnd = new Date(latestEventEnd);
  }

  dayEvents.forEach((evt) => {
    const start = evt.start < windowStart ? windowStart : evt.start;
    const end =
      evt.end && !Number.isNaN(evt.end.getTime()) ? evt.end : evt.start;
    const clampedEnd = end > windowEnd ? windowEnd : end;

    if (clampedEnd <= cursor) return;

    const busyStart = start < cursor ? cursor : start;

    if (busyStart > cursor) {
      segments.push({
        status: "free",
        label:
          translate("calendar.status.free", lang) ||
          (lang.slice(0, 2) === "ru" ? "Свободно" : "Frei"),
        start: cursor,
        end: busyStart,
      });
    }

    if (clampedEnd > busyStart) {
      segments.push({
        status: "busy",
        label:
          translate("calendar.status.busy", lang) ||
          (lang.slice(0, 2) === "ru" ? "Занято" : "Belegt"),
        start: busyStart,
        end: clampedEnd,
        title: evt.title || "",
        note: evt.note || "",
      });
      cursor = clampedEnd;
    }
  });

  if (cursor < windowEnd) {
    segments.push({
      status: "free",
      label:
        translate("calendar.status.free", lang) ||
        (lang.slice(0, 2) === "ru" ? "Свободно" : "Frei"),
      start: cursor,
      end: windowEnd,
    });
  }

  if (!segments.length) {
    segments.push({
      status: "free",
      label: translate("calendar.status.free", lang),
      start: windowStart,
      end: windowEnd,
    });
  }

  return segments.map((segment) => {
    const hasTime = segment.start && segment.end;
    const range = hasTime
      ? `${formatTimeLabel(segment.start, locale)} – ${formatTimeLabel(
          segment.end,
          locale
        )}`
      : "";
    return { ...segment, range };
  });
}

function renderCalendarTooltipContent(meta, date, lang, locale) {
  const tooltip = ensureCalendarTooltip();
  tooltip.innerHTML = "";

  const dateEl = document.createElement("div");
  dateEl.className = "calendar-tooltip__date";
  dateEl.textContent = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  tooltip.appendChild(dateEl);

  const timeline = buildDayTimeline(date);
  const noteText =
    meta.note && !meta.unavailable
      ? meta.note
      : timeline.length
      ? ""
      : meta.note;

  if (noteText) {
    const noteEl = document.createElement("div");
    noteEl.className = "calendar-tooltip__note";
    noteEl.textContent = noteText;
    tooltip.appendChild(noteEl);
  }

  const listEl = document.createElement("ul");
  listEl.className = "calendar-tooltip__list";

  const maxItems = 5;

  if (timeline.length) {
    timeline.slice(0, maxItems).forEach((slot) => {
      const item = document.createElement("li");
      item.className = "calendar-tooltip__item";
      const badge = document.createElement("span");
      badge.className = `status-pill status-${slot.status}`;
      badge.textContent = slot.label || "";
      item.appendChild(badge);

      const time = document.createElement("span");
      time.className = "calendar-tooltip__time";
      time.textContent = slot.range || "";
      if (time.textContent) item.appendChild(time);

      const titleText = (slot.title || slot.note || "").trim();
      if (titleText && titleText !== (slot.label || "").trim()) {
        const title = document.createElement("span");
        title.textContent = titleText;
        item.appendChild(title);
      }

      listEl.appendChild(item);
    });

    const extra = timeline.length - maxItems;
    if (extra > 0) {
      const more = document.createElement("li");
      more.className = "calendar-tooltip__more";
      const extraLabel =
        lang.slice(0, 2) === "ru"
          ? `+${extra} ещё`
          : lang.slice(0, 2) === "en"
            ? `+${extra} more`
            : `+${extra} weitere`;
      more.textContent = extraLabel;
      listEl.appendChild(more);
    }
  } else {
    const fallback = document.createElement("div");
    fallback.className = "calendar-tooltip__note";
    fallback.textContent = translate("calendar.status.no_slots", lang);
    tooltip.appendChild(fallback);
  }

  if (listEl.children.length) {
    tooltip.appendChild(listEl);
  }

  return tooltip;
}

function positionCalendarTooltip(tooltip, anchorRect) {
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  const tooltipRect = tooltip.getBoundingClientRect();

  let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));

  let top = anchorRect.bottom + 10;
  if (top + tooltipRect.height > window.innerHeight) {
    top = anchorRect.top - tooltipRect.height - 10;
  }
  top = Math.max(8, top);

  tooltip.style.left = `${scrollX + left}px`;
  tooltip.style.top = `${scrollY + top}px`;
}

function showCalendarTooltip(date, anchorEl) {
  bindCalendarTooltipGlobalHandlers();
  const lang = document.documentElement.lang || fallbackLang;
  const locale = localeMap[lang] || localeMap[fallbackLang];
  const meta = getDayMeta(date);
  const tooltip = renderCalendarTooltipContent(meta, date, lang, locale);

  tooltip.classList.add("visible");
  tooltip.style.visibility = "hidden";
  tooltip.style.left = "0px";
  tooltip.style.top = "0px";
  positionCalendarTooltip(tooltip, anchorEl.getBoundingClientRect());
  tooltip.style.visibility = "visible";
}

function dedupeEvents(events) {
  const map = new Map();
  (events || []).forEach((evt) => {
    if (!evt?.start) return;
    const key = `${evt.start}|${evt.end || ""}`;
    if (!map.has(key)) {
      map.set(key, evt);
    }
  });
  return Array.from(map.values());
}

function buildCalendarRequestUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl, window.location.origin);
    url.searchParams.set("ts", String(Date.now()));
    return url.toString();
  } catch (err) {
    return rawUrl;
  }
}

function getRelevantCalendarDates() {
  const relevantKeys = new Set();

  (availabilityState.events || []).forEach((evt) => {
    const dayKey = String(evt?.start || "").slice(0, 10);
    if (dayKey) relevantKeys.add(dayKey);
  });

  Object.entries(availabilityState.rawDays || {}).forEach(([dayKey, meta]) => {
    if (!dayKey || !meta) return;
    if (meta.busy) {
      relevantKeys.add(dayKey);
      return;
    }
    if (meta.unavailable && !meta.weekend && !meta.holiday) {
      relevantKeys.add(dayKey);
    }
  });

  return Array.from(relevantKeys)
    .map((dayKey) => parseDateKey(dayKey))
    .filter((date) => date && !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
}

function resolveInitialCalendarDate() {
  const today = new Date();
  const relevantDates = getRelevantCalendarDates();
  if (!relevantDates.length) {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const currentMonthHasRelevantDate = relevantDates.some(
    (date) =>
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth()
  );
  if (currentMonthHasRelevantDate) {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const todayStart = atStartOfDay(today).getTime();
  const nextDate =
    relevantDates.find((date) => atStartOfDay(date).getTime() >= todayStart) ||
    relevantDates[relevantDates.length - 1];

  return new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
}

async function loadAvailabilityData() {
  try {
    const eventsUrl = window.EVENTS_JSON_URL || "/api/events/";
    const response = await fetch(buildCalendarRequestUrl(eventsUrl), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const rawEvents = Array.isArray(data.events)
      ? data.events.map((evt) => ({
          title: "",
          display: "background",
          ...evt,
        }))
      : [];
    availabilityState.events = dedupeEvents(rawEvents);
    const dayConfig =
      data.days && typeof data.days === "object" ? data.days : {};
    availabilityState.rawDays = dayConfig;
    availabilityState.dayMeta = buildDayMeta(
      availabilityState.events,
      dayConfig
    );
  } catch (error) {
    console.error("Fehler beim Laden der Events", error);
    availabilityState.events = [];
    availabilityState.dayMeta = {};
    availabilityState.rawDays = {};
  }
}

function ensureAvailabilityData() {
  if (window.CALENDAR_ENABLED === false) {
    availabilityState.events = [];
    availabilityState.dayMeta = {};
    availabilityState.rawDays = {};
    return Promise.resolve();
  }
  if (!appState.availabilityPromise) {
    appState.availabilityPromise = loadAvailabilityData();
  }
  return appState.availabilityPromise;
}

function renderCustomCalendar(calendarEl, lang) {
  const locale = localeMap[lang] || localeMap[fallbackLang];
  const current = calendarState.currentDate;
  const currentYear = current.getFullYear();
  const currentMonth = current.getMonth();
  const firstOfMonth = new Date(currentYear, currentMonth, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Montag = 0
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(firstOfMonth);

  const weekdayLabels = Array.from({ length: 7 }).map((_, idx) => {
    const ref = new Date(2024, 0, 1 + idx); // 01.01.2024 ist Montag
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(ref);
  });

  const gridCells = [];
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    gridCells.push({
      date: new Date(currentYear, currentMonth - 1, daysInPrevMonth - i),
      adjacent: true,
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    gridCells.push({
      date: new Date(currentYear, currentMonth, day),
      adjacent: false,
    });
  }
  while (gridCells.length % 7 !== 0) {
    const nextDay = gridCells.length - startOffset - daysInMonth + 1;
    gridCells.push({
      date: new Date(currentYear, currentMonth + 1, nextDay),
      adjacent: true,
    });
  }

  calendarEl.innerHTML = `
    <div class="calendar-nav">
      <button class="calendar-nav-btn" data-dir="-1" aria-label="Voriger Monat">‹</button>
      <div class="calendar-title">${monthLabel}</div>
      <button class="calendar-nav-btn" data-dir="1" aria-label="Nächster Monat">›</button>
    </div>
    <div class="calendar-weekdays">
      ${weekdayLabels
        .map((d) => `<div class="calendar-weekday" aria-hidden="true">${d}</div>`)
        .join("")}
    </div>
    <div class="calendar-grid" role="grid"></div>
  `;

  const gridEl = calendarEl.querySelector(".calendar-grid");
  const todayKey = formatDateKey(new Date());
  const enableHover = window.CALENDAR_HOVER !== false;
  let firstSelectableDateKey = "";

  const resolveSelectedDateKey = () => {
    const currentSelection = parseDateKey(calendarState.selectedDateKey);
    if (
      currentSelection &&
      currentSelection.getFullYear() === currentYear &&
      currentSelection.getMonth() === currentMonth
    ) {
      return calendarState.selectedDateKey;
    }

    const today = new Date();
    const relevantDates = getRelevantCalendarDates().filter(
      (date) => date.getFullYear() === currentYear && date.getMonth() === currentMonth
    );

    if (today.getFullYear() === currentYear && today.getMonth() === currentMonth) {
      const todayMeta = getDayMeta(today);
      const todayIsRelevant =
        todayMeta.unavailable ||
        todayMeta.holiday ||
        todayMeta.isSunday ||
        (Array.isArray(todayMeta.events) && todayMeta.events.length > 0);

      if (todayIsRelevant) {
        return todayKey;
      }

      const todayStart = atStartOfDay(today).getTime();
      const nextRelevantDate = relevantDates.find(
        (date) => atStartOfDay(date).getTime() >= todayStart
      );
      if (nextRelevantDate) {
        return formatDateKey(nextRelevantDate);
      }
    }

    if (relevantDates.length) {
      return formatDateKey(relevantDates[0]);
    }

    return firstSelectableDateKey || formatDateKey(new Date(currentYear, currentMonth, 1));
  };

  gridCells.forEach((entry) => {
    const cell = document.createElement("button");
    cell.className = "calendar-day";
    cell.type = "button";
    const dateObj = entry.date;
    const isAdjacent = entry.adjacent;

    const dateKey = formatDateKey(dateObj);
    const meta = getDayMeta(dateObj);
    const hasEvents = Array.isArray(meta.events) && meta.events.length > 0;

    if (meta.holiday) cell.classList.add("calendar-holiday");
    if (meta.isSunday) cell.classList.add("calendar-sunday");

    if (meta.unavailable) {
      cell.classList.add("calendar-unavailable");
    } else if (hasEvents) {
      cell.classList.add("calendar-busy");
    } else {
      cell.classList.add("calendar-free");
    }

    if (dateKey === todayKey) {
      cell.classList.add("calendar-today");
    }

    cell.dataset.date = dateKey;
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-pressed", "false");
    cell.innerHTML = `
      <span class="calendar-day-number">${dateObj.getDate()}</span>
      <span class="calendar-day-status"></span>
    `;

    if (isAdjacent) {
      cell.classList.add("calendar-adjacent");
    } else if (!firstSelectableDateKey) {
      firstSelectableDateKey = dateKey;
    }

    cell.addEventListener("click", () => {
      calendarState.selectedDateKey = dateKey;
      if (isAdjacent) {
        calendarState.currentDate = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          1
        );
        renderCustomCalendar(calendarEl, lang);
        return;
      }

      gridEl.querySelectorAll(".calendar-day").forEach((dayCell) => {
        dayCell.classList.remove("is-selected");
        dayCell.setAttribute("aria-pressed", "false");
      });
      cell.classList.add("is-selected");
      cell.setAttribute("aria-pressed", "true");
      renderInlineCalendarDetails(dateKey);
      if (shouldOpenCalendarModalOnSelect()) {
        renderModalForDate(dateKey);
      }
    });
    if (enableHover) {
      cell.addEventListener("mouseenter", () => {
        hideCalendarTooltip(0);
        showCalendarTooltip(dateObj, cell);
      });
      cell.addEventListener("mouseleave", () => hideCalendarTooltip());
    }

    gridEl.appendChild(cell);
  });

  calendarState.selectedDateKey = resolveSelectedDateKey();
  gridEl.querySelectorAll(".calendar-day").forEach((cell) => {
    if (cell.dataset.date === calendarState.selectedDateKey) {
      cell.classList.add("is-selected");
      cell.setAttribute("aria-pressed", "true");
    }
  });
  renderInlineCalendarDetails(calendarState.selectedDateKey);

  calendarEl.querySelectorAll(".calendar-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = Number(btn.dataset.dir || 0);
      calendarState.currentDate = new Date(currentYear, currentMonth + dir, 1);
      renderCustomCalendar(calendarEl, lang);
    });
  });
}

function closeCalendarModal() {
  const modal = document.getElementById("calendarModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("hidden", "hidden");
}

let calendarModalBound = false;
function initCalendarModalCloseHandlers() {
  if (calendarModalBound) return;
  const modal = document.getElementById("calendarModal");
  if (!modal) return;

  modal.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeCalendarModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCalendarModal();
  });

  calendarModalBound = true;
}

function shouldOpenCalendarModalOnSelect() {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 48rem), (pointer: coarse)").matches;
}

function buildCalendarDayDetail(dateKey) {
  const lang = document.documentElement.lang || fallbackLang;
  const locale = localeMap[lang] || localeMap[fallbackLang];
  const displayDate = new Date(`${dateKey}T12:00:00`);
  const meta = getDayMeta(displayDate);
  const title = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(displayDate);
  const timeline = buildDayTimeline(displayDate);
  let note = "";

  if (meta.note) {
    note = meta.note;
  } else if (!timeline.length) {
    note = translate("calendar.status.no_slots", lang);
  }

  const items = [];

  const appendEntry = (badgeClass, badgeText, timeText, titleText) => {
    items.push({
      badgeClass,
      badgeText: badgeText || "",
      timeText: timeText || "",
      titleText: titleText || "",
    });
  };

  if (timeline.length) {
    timeline.forEach((slot) => {
      const titleText = (slot.title || slot.note || "").trim();
      appendEntry(`status-${slot.status}`, slot.label || "", slot.range || "", titleText);
    });
  }

  if (!items.length) {
    items.push({
      badgeClass: "",
      badgeText: "",
      timeText: "",
      titleText: translate("calendar.status.no_slots", lang),
    });
  }

  return { title, note, items };
}

function renderCalendarDayDetail(target, dateKey) {
  const { titleEl, noteEl, listEl } = target || {};
  if (!titleEl || !noteEl || !listEl || !dateKey) return;

  const detail = buildCalendarDayDetail(dateKey);
  titleEl.textContent = detail.title;
  noteEl.textContent = detail.note || "";
  listEl.innerHTML = "";

  const fragment = document.createDocumentFragment();
  detail.items.forEach((entry) => {
    const li = document.createElement("li");

    if (entry.badgeClass) {
      const badge = document.createElement("span");
      badge.className = `status-pill ${entry.badgeClass}`;
      badge.textContent = entry.badgeText;
      li.appendChild(badge);
    }

    if (entry.timeText) {
      const time = document.createElement("time");
      time.textContent = entry.timeText;
      li.appendChild(time);
    }

    if (entry.titleText) {
      const text = document.createElement("span");
      text.textContent = entry.titleText;
      li.appendChild(text);
    }

    fragment.appendChild(li);
  });

  listEl.appendChild(fragment);
}

function renderInlineCalendarDetails(dateKey) {
  renderCalendarDayDetail(
    {
      titleEl: document.getElementById("availabilityCalendarDetailTitle"),
      noteEl: document.getElementById("availabilityCalendarDetailNote"),
      listEl: document.getElementById("availabilityCalendarDetailList"),
    },
    dateKey
  );

  const actionBtn = document.getElementById("availabilityCalendarDetailAction");
  if (actionBtn) {
    actionBtn.dataset.dateKey = dateKey || "";
    actionBtn.hidden = !dateKey;
  }
}

function renderModalForDate(dateKey) {
  const modal = document.getElementById("calendarModal");
  if (!modal) return;

  renderCalendarDayDetail(
    {
      titleEl: document.getElementById("calendarModalTitle"),
      noteEl: document.getElementById("calendarModalNote"),
      listEl: document.getElementById("calendarModalList"),
    },
    dateKey
  );

  modal.removeAttribute("hidden");
  modal.classList.add("open");
}

async function initAvailabilityCalendar(lang) {
  const calendarEl = document.getElementById("availabilityCalendar");
  if (!calendarEl) return;

  if (!hasTranslationsFor(lang)) {
    try {
      await ensureTranslationsLoaded(lang);
    } catch (err) {
      console.error("calendar translations load failed", err);
    }
  }

  await ensureAvailabilityData();
  initCalendarModalCloseHandlers();
  initInlineCalendarDetailHandlers();
  calendarState.currentDate = resolveInitialCalendarDate();
  calendarState.selectedDateKey = "";
  renderCustomCalendar(calendarEl, lang);

  if (!availabilityCalendarLangBound) {
    window.addEventListener("preferred_lang_changed", () => {
      const nextLang = document.documentElement.lang || fallbackLang;
      if (document.getElementById("availabilityCalendar")) {
        renderCustomCalendar(calendarEl, nextLang);
      }
    });
    availabilityCalendarLangBound = true;
  }
}

function initInlineCalendarDetailHandlers() {
  if (calendarInlineDetailBound) return;

  const actionBtn = document.getElementById("availabilityCalendarDetailAction");
  if (actionBtn) {
    actionBtn.addEventListener("click", () => {
      const dateKey = actionBtn.dataset.dateKey || calendarState.selectedDateKey;
      if (dateKey) renderModalForDate(dateKey);
    });
  }

  calendarInlineDetailBound = true;
}

function setupLazyCalendarInit(lang) {
  const calendarEl = document.getElementById("availabilityCalendar");
  if (!calendarEl) return;

  let initialized = false;
  let fallbackTimer = null;
  const init = () => {
    if (initialized) return;
    initialized = true;
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    initAvailabilityCalendar(lang).catch((err) => {
      console.error("calendar init failed", err);
    });
  };

  if ("IntersectionObserver" in window) {
    const rect = calendarEl.getBoundingClientRect();
    const isNearViewport =
      rect.top <= window.innerHeight + 200 && rect.bottom >= -200;
    if (isNearViewport) {
      init();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            init();
            observer.disconnect();
          }
        });
      },
      { rootMargin: "200px" }
    );
    observer.observe(calendarEl);
    fallbackTimer = window.setTimeout(() => {
      observer.disconnect();
      init();
    }, 1500);
  } else {
    init();
  }
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

  renderHomeAccountSummary(lang);

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
    updateCalendarLocale(targetLang);
    ensureTranslationsLoaded(targetLang)
      .then(() => {
        applyTranslations(targetLang);
        refreshFoldLabels();
        if (typeof appState.heroFoldRefresher === "function") {
          appState.heroFoldRefresher();
        }
        if (typeof appState.homeAccountFoldRefresher === "function") {
          appState.homeAccountFoldRefresher();
        }
        updateAvailabilityPill();
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


// === Availability helpers ===
function updateCalendarLocale(lang) {
  if (availabilityCalendar) {
    availabilityCalendar.setOption("locale", lang);
  }
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
  if (typeof appState.heroFoldRefresher === "function") {
    appState.heroFoldRefresher();
  }
  if (typeof appState.homeAccountFoldRefresher === "function") {
    appState.homeAccountFoldRefresher();
  }
  updateAvailabilityPill();
  updateCalendarLocale(targetLang);
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

function renderHomeAccountSummary(lang = langState.current || fallbackLang) {
  const summary = document.querySelector("[data-home-account-summary]");
  if (!summary) return;

  const messageCount = Number(summary.dataset.messageCount || "0");
  const replyCount = Number(summary.dataset.replyCount || "0");
  const latestMessageAt = summary.dataset.latestMessageAt || "";
  const pill = summary.querySelector("[data-home-account-message-pill]");
  const status = summary.querySelector("[data-home-account-status]");

  if (pill) {
    pill.textContent = `${messageCount} ${translate(
      "home.account.footer.messages",
      lang
    )}`;
  }

  if (!status) return;

  if (replyCount > 0) {
    status.textContent = `${replyCount} ${translate(
      "home.account.footer.replies_saved",
      lang
    )}`;
    return;
  }

  if (latestMessageAt) {
    status.textContent = `${translate(
      "home.account.footer.last_message",
      lang
    )} ${latestMessageAt}`;
    return;
  }

  status.textContent = translate("home.account.footer.no_history", lang);
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
    nameEl.textContent = file ? file.name : "Keine Datei ausgewählt";
  };
  input.addEventListener("change", update);
  update();
}

// === Hero fold ===
function initHeroPortraitFlip() {
  document.querySelectorAll("[data-portrait-flip]").forEach((portrait) => {
    const toggles = Array.from(
      portrait.querySelectorAll("[data-portrait-flip-toggle]")
    );
    const panels = Array.from(
      portrait.querySelectorAll("[data-portrait-panel]")
    ).filter((panel) => !panel.matches("[data-portrait-flip-toggle]"));
    if (!toggles.length) return;
    const defaultPanel =
      toggles.find((toggle) => toggle.dataset.portraitPanel)?.dataset
        .portraitPanel ||
      panels[0]?.dataset.portraitPanel ||
      "";

    const setActivePanel = (panelKey = defaultPanel) => {
      if (!panelKey) return;
      portrait.dataset.activePortraitPanel = panelKey;
      panels.forEach((panel) => {
        const active = panel.dataset.portraitPanel === panelKey;
        panel.hidden = !active;
        panel.classList.toggle("is-active", active);
      });
    };

    const setFlipped = (flipped, panelKey = defaultPanel) => {
      const activePanel =
        panelKey || portrait.dataset.activePortraitPanel || defaultPanel;
      setActivePanel(activePanel);
      portrait.classList.toggle("is-flipped", flipped);
      toggles.forEach((toggle) => {
        const active = flipped && toggle.dataset.portraitPanel === activePanel;
        toggle.setAttribute("aria-pressed", String(active));
        toggle.classList.toggle("is-active", active);
      });
    };

    setFlipped(false, defaultPanel);

    toggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const panelKey = toggle.dataset.portraitPanel || defaultPanel;
        const isSameOpen =
          portrait.classList.contains("is-flipped") &&
          portrait.dataset.activePortraitPanel === panelKey;
        setFlipped(!isSameOpen, panelKey);
      });
    });
  });
}

function initHeroFold() {
  const hero = document.querySelector(".hero");
  const body = document.getElementById("heroContent");
  const toggle = hero?.querySelector("[data-hero-fold-toggle]");
  const label = toggle?.querySelector(".hero-fold-label");
  const chevron = toggle?.querySelector(".chevron");
  if (!hero || !body || !toggle) return null;

  const setLabels = (open) => {
    if (label) {
      const openLabel = translateUI("ui.fold_close", "Zuklappen");
      const closedLabel = translateUI("ui.fold_open", "Aufklappen");
      label.textContent = open ? openLabel : closedLabel;
    }
    if (chevron) {
      chevron.textContent = open ? "▾" : "▸";
    }
  };

  const setState = (open) => {
    hero.classList.toggle("collapsed", !open);
    body.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    setLabels(open);
  };

  setState(!hero.classList.contains("collapsed"));

  toggle.addEventListener("click", () => {
    const open = hero.classList.contains("collapsed");
    setState(open);
  });

  return () => setLabels(!hero.classList.contains("collapsed"));
}

function initHomeAccountFold() {
  const card = document.querySelector("[data-home-account-card]");
  const toggle = card?.querySelector("[data-home-account-toggle]");
  const label = toggle?.querySelector(".hero-card-account__toggle-label");
  const chevron = toggle?.querySelector(".chevron");
  const body = card?.querySelector("[data-home-account-body]");
  if (!card || !toggle || !body) return null;

  const setLabels = (open) => {
    if (label) {
      const openLabel = translateUI("ui.fold_close", "Zuklappen");
      const closedLabel = translateUI("ui.fold_open", "Aufklappen");
      label.textContent = open ? openLabel : closedLabel;
    }
    if (chevron) {
      chevron.textContent = open ? "▾" : "▸";
    }
  };

  const cleanup = () => {
    if (typeof body._homeAccountCleanup === "function") {
      body._homeAccountCleanup();
    }
  };

  const applyFinalState = (open) => {
    card.classList.toggle("is-collapsed", !open);
    body.hidden = !open;
    body.style.height = "";
    body.style.overflow = "";
    body.style.opacity = "";
    body.style.transform = "";
    toggle.setAttribute("aria-expanded", String(open));
    setLabels(open);
  };

  const setState = (open, options = {}) => {
    const { immediate = false } = options;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isOpen = toggle.getAttribute("aria-expanded") === "true";

    if (!immediate && open === isOpen && body.hidden === !open) {
      setLabels(open);
      return;
    }

    cleanup();

    if (immediate || reduceMotion) {
      applyFinalState(open);
      return;
    }

    body.hidden = false;
    body.style.overflow = "hidden";

    if (open) {
      card.classList.remove("is-collapsed");
      toggle.setAttribute("aria-expanded", "true");
      setLabels(true);
      body.style.height = "0px";
      body.style.opacity = "0";
      body.style.transform = "translateY(-0.22rem)";
      void body.offsetHeight;
      body.style.height = `${body.scrollHeight}px`;
      body.style.opacity = "1";
      body.style.transform = "translateY(0)";
    } else {
      const startHeight = body.scrollHeight;
      body.style.height = `${startHeight}px`;
      body.style.opacity = "1";
      body.style.transform = "translateY(0)";
      card.classList.add("is-collapsed");
      toggle.setAttribute("aria-expanded", "false");
      setLabels(false);
      void body.offsetHeight;
      body.style.height = "0px";
      body.style.opacity = "0";
      body.style.transform = "translateY(-0.22rem)";
    }

    const onTransitionEnd = (event) => {
      if (event.target !== body || event.propertyName !== "height") return;
      body.removeEventListener("transitionend", onTransitionEnd);
      body._homeAccountCleanup = null;
      applyFinalState(open);
    };

    body._homeAccountCleanup = () => {
      body.removeEventListener("transitionend", onTransitionEnd);
      body._homeAccountCleanup = null;
    };
    body.addEventListener("transitionend", onTransitionEnd);
  };

  if (!body.id) {
    body.id = "home-account-body";
  }
  toggle.setAttribute("aria-controls", body.id);

  setState(false, { immediate: true });

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setState(open);
  });

  return () => setLabels(toggle.getAttribute("aria-expanded") === "true");
}

function initHomePriceReveal() {
  document
    .querySelectorAll(".home-price-item, .home-price-example")
    .forEach((row, index) => {
      if (row.dataset.priceReveal === "true") return;

      row.dataset.priceReveal = "true";
      row.style.setProperty("--price-row-index", String(index));
    });
}

function initHeroWhatsappMeltingText() {
  document.querySelectorAll(".hero-whatsapp-cta").forEach((button) => {
    const currentText =
      button.getAttribute("aria-label") ||
      button.querySelector(".hero-whatsapp-melting-text")?.textContent ||
      button.textContent ||
      "";
    const text = currentText.trim();

    if (!text) return;
    if (button.dataset.meltingText === text) return;

    button.dataset.meltingText = text;
    button.setAttribute("aria-label", text);
    button.textContent = "";

    const textWrap = document.createElement("span");
    textWrap.className = "hero-whatsapp-melting-text";
    textWrap.dataset.meltingText = text;
    textWrap.setAttribute("aria-hidden", "true");
    textWrap.textContent = text;
    textWrap.addEventListener(
      "animationend",
      (event) => {
        if (event.animationName !== "whatsapp-text-melt") return;
        textWrap.classList.add("is-melting-done");
      },
      { once: true }
    );

    button.appendChild(textWrap);
  });
}

function initHomeContactDisclosure() {
  document.querySelectorAll("[data-home-contact-toggle]").forEach((toggle) => {
    if (toggle.dataset.contactToggleBound === "true") return;

    const contactArea = toggle.closest(".home-contact-area");
    if (!contactArea) return;

    toggle.dataset.contactToggleBound = "true";
    toggle.setAttribute(
      "aria-expanded",
      String(contactArea.classList.contains("is-contact-open"))
    );

    toggle.addEventListener("click", () => {
      contactArea.classList.add("is-contact-open");
      toggle.setAttribute("aria-expanded", "true");
    });
  });
}

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

function initHomeTrustCubeSequence() {
  const clusters = Array.from(
    document.querySelectorAll(".home-trust-strip__cluster")
  );
  if (clusters.length === 0) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  clusters.forEach((cluster) => {
    if (cluster.dataset.trustSequenceInit === "true") return;

    cluster.dataset.trustSequenceInit = "true";

    const cubeMap = {
      one: cluster.querySelector(".home-trust-strip__cube--one"),
      two: cluster.querySelector(".home-trust-strip__cube--two"),
      three: cluster.querySelector(".home-trust-strip__cube--three"),
    };

    if (!cubeMap.one || !cubeMap.two || !cubeMap.three) return;

    const sequence = ["one", "two", "three", "three", "two", "one"];
    const turnDuration = 820;
    const pauseDuration = 520;
    let stepIndex = 0;

    const rotateCube = (cube) => {
      const currentTurns = Number.parseInt(cube.dataset.trustTurns || "0", 10);
      const nextTurns = (currentTurns + 1) % 4;
      cube.dataset.trustTurns = String(nextTurns);
      cube.style.setProperty("--trust-turns", String(nextTurns));
      cube.classList.add("is-turning");
      window.setTimeout(() => {
        cube.classList.remove("is-turning");
      }, turnDuration);
    };

    const runStep = () => {
      const cubeName = sequence[stepIndex];
      const cube = cubeMap[cubeName];

      if (cube) {
        rotateCube(cube);
      }

      stepIndex = (stepIndex + 1) % sequence.length;
      window.setTimeout(runStep, turnDuration + pauseDuration);
    };

    window.setTimeout(runStep, 480);
  });
}

function initPage() {
  initTheme();
  initHeroPortraitFlip();
  appState.heroFoldRefresher = initHeroFold();
  appState.homeAccountFoldRefresher = initHomeAccountFold();
  initHomeEntryNavigation();
  initPreferredLanguage();
  initAuthSessionTimeout();
  initAuthFormEnhancements();
  initLoadAnimations();
  initHeroWhatsappMeltingText();
  initHomeContactDisclosure();
  initHomePriceReveal();
  initHomeTrustCubeSequence();

  runIdle(() => {
    initScrollReveal();
  });

  if (document.getElementById("availabilityStatus")) {
    updateAvailabilityPill();
    setInterval(updateAvailabilityPill, 60 * 1000);
  }

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
    if (document.getElementById("availabilityCalendar")) {
      setupLazyCalendarInit(langState.current || fallbackLang);
      ensureAvailabilityData().then(() => updateAvailabilityPill());
    }
    if (document.querySelector(".footer-app-link[data-android-intent]")) {
      initFooterAppLinks();
    }
  });
}

document.addEventListener("app:translations-applied", initHeroWhatsappMeltingText);

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
