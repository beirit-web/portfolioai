(() => {
  const TOPNAV_DESKTOP_QUERY = "(min-width: 68.0625rem)";
  const LEGACY_DESKTOP_WIDTH = 1088;
  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const SUPPORTED_LANGS = new Set(["de", "ru", "uk"]);

  const normalizeLang = (lang, fallback = "de") => {
    const value = (lang || "").slice(0, 2).toLowerCase();
    return SUPPORTED_LANGS.has(value) ? value : fallback;
  };

  const focusSafely = (element) => {
    if (!(element instanceof HTMLElement)) return;
    try {
      element.focus({ preventScroll: true });
    } catch (e) {
      element.focus();
    }
  };

  const forgetPreferredLang = () => {
    try {
      localStorage.removeItem("preferred_lang");
    } catch (e) {
      /* localStorage unavailable */
    }
    try {
      document.cookie = "preferred_lang=;path=/;max-age=0;samesite=lax";
    } catch (e) {
      /* cookies unavailable */
    }
  };

  const runWhenReady = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  };

  const initTopnavOffsetSync = () => {
    const topnav = document.getElementById("mainTopnav");
    if (!topnav) return;

    const root = document.documentElement;
    let rafId = 0;
    let pendingHeight = 0;

    const setOffset = (height) => {
      if (!height) return;
      root.style.setProperty("--topnav-offset", `${height}px`);
      root.style.setProperty("--topnav-height", `${height}px`);
    };

    const applyOffset = () => {
      rafId = 0;
      if (pendingHeight) {
        setOffset(pendingHeight);
        pendingHeight = 0;
        return;
      }

      // Fallback for browsers without ResizeObserver entries.
      setOffset(Math.ceil(topnav.offsetHeight || 0));
    };

    const scheduleApplyOffset = (height = 0) => {
      if (typeof height === "number" && height > 0) pendingHeight = Math.ceil(height);
      if (rafId) return;
      rafId = window.requestAnimationFrame(applyOffset);
    };

    if (typeof ResizeObserver !== "function") scheduleApplyOffset();
    window.addEventListener("resize", scheduleApplyOffset, { passive: true });

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver((entries) => {
        const blockSize = entries[0]?.borderBoxSize?.[0]?.blockSize;
        const contentHeight = entries[0]?.contentRect?.height;
        scheduleApplyOffset(blockSize || contentHeight || 0);
      });
      observer.observe(topnav);
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        scheduleApplyOffset();
      });
    }
  };

  const initFlashMessages = () => {
    setTimeout(() => {
      document.querySelectorAll(".flash").forEach((el) => {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 400);
      });
    }, 4200);
  };

  const initSideNav = () => {
    const sideNav = document.getElementById("sideNav");
    const sideNavPanel = sideNav ? sideNav.querySelector(".sidenav__panel") : null;
    const backdrop = document.getElementById("sideNavBackdrop");
    const burger = document.getElementById("burgerToggle");
    const desktopNavQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia(TOPNAV_DESKTOP_QUERY)
        : null;
    let lastFocusedElement = null;
    let focusRafId = 0;
    let focusTimerId = 0;

    const setBurgerState = (open) => {
      if (!burger) return;
      burger.classList.toggle("change", open);
      burger.setAttribute("aria-expanded", String(open));
    };

    const getFocusableElements = () => {
      if (!sideNavPanel) return [];
      return Array.from(sideNavPanel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) =>
          element instanceof HTMLElement &&
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true" &&
          Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length),
      );
    };

    const focusFirstElement = () => {
      if (!sideNavPanel) return;
      const focusable = getFocusableElements();
      const target = focusable[0] || sideNavPanel;
      focusSafely(target);
    };

    const isOpen = () => sideNav ? sideNav.classList.contains("is-open") : false;

    const setNavState = (open) => {
      if (!sideNav) return;
      sideNav.classList.toggle("is-open", open);
      sideNav.setAttribute("aria-hidden", String(!open));
      if (open) {
        sideNav.removeAttribute("inert");
      } else {
        sideNav.setAttribute("inert", "");
      }
      document.body.classList.toggle("nav-open", open);
      if (backdrop) {
        backdrop.classList.toggle("is-open", open);
        backdrop.setAttribute("aria-hidden", String(!open));
      }
      setBurgerState(open);
    };

    window.openNav = () => {
      if (!sideNav || !sideNavPanel || isOpen()) return;
      lastFocusedElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      sideNavPanel.scrollTop = 0;
      setNavState(true);

      if (focusRafId) {
        window.cancelAnimationFrame(focusRafId);
      }
      if (focusTimerId) {
        window.clearTimeout(focusTimerId);
      }
      focusTimerId = window.setTimeout(() => {
        focusTimerId = 0;
        focusRafId = window.requestAnimationFrame(() => {
          focusRafId = 0;
          focusFirstElement();
        });
      }, 360);
    };

    window.closeNav = (options = {}) => {
      if (!sideNav || !isOpen()) return;
      const restoreFocus = options.restoreFocus !== false;
      setNavState(false);

      if (focusRafId) {
        window.cancelAnimationFrame(focusRafId);
        focusRafId = 0;
      }
      if (focusTimerId) {
        window.clearTimeout(focusTimerId);
        focusTimerId = 0;
      }
      if (restoreFocus && lastFocusedElement && document.contains(lastFocusedElement)) {
        focusSafely(lastFocusedElement);
      }
      lastFocusedElement = null;
    };

    window.toggleNav = () => {
      isOpen() ? window.closeNav() : window.openNav();
    };

    const keepFocusInsidePanel = (event) => {
      if (event.key !== "Tab" || !sideNavPanel || !isOpen()) return;
      const focusable = getFocusableElements();
      if (!focusable.length) {
        event.preventDefault();
        focusSafely(sideNavPanel);
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        focusSafely(last);
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        focusSafely(first);
      }
    };

    if (burger) {
      burger.addEventListener("click", () => {
        burger.classList.remove("is-clicking");
        void burger.offsetWidth;
        burger.classList.add("is-clicking");
        window.toggleNav();
      });
      burger.addEventListener("animationend", (event) => {
        if (event.animationName === "burgerClickPop") {
          burger.classList.remove("is-clicking");
        }
      });
    }
    if (backdrop) backdrop.addEventListener("click", () => window.closeNav());
    if (sideNavPanel) sideNavPanel.addEventListener("keydown", keepFocusInsidePanel);

    if (sideNav) {
      sideNav.addEventListener("click", (event) => {
        const link = event.target.closest("a[href]");
        if (link) {
          window.closeNav({ restoreFocus: false });
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) {
        event.preventDefault();
        window.closeNav();
      }
    });

    const closeOnDesktopNav = () => {
      if (desktopNavQuery?.matches && isOpen()) {
        window.closeNav({ restoreFocus: false });
      }
    };

    if (desktopNavQuery) {
      if (typeof desktopNavQuery.addEventListener === "function") {
        desktopNavQuery.addEventListener("change", closeOnDesktopNav);
      } else if (typeof desktopNavQuery.addListener === "function") {
        desktopNavQuery.addListener(closeOnDesktopNav);
      }
    } else {
      window.addEventListener("resize", () => {
        if (window.innerWidth > LEGACY_DESKTOP_WIDTH && isOpen()) {
          window.closeNav({ restoreFocus: false });
        }
      });
    }
  };

  const initHomeSectionLinks = () => {
    const allowedTargets = new Set([
      "top",
      "funktionen",
      "technik",
      "projekt",
      "kontakt",
      "hinweise",
    ]);
    const links = Array.from(
      document.querySelectorAll("[data-home-section-link], [data-sidenav-home-link]"),
    );
    if (links.length < 2) return;

    const homeLink = links.find((link) => {
      const target = link.dataset.homeSectionLink || link.dataset.sidenavHomeLink;
      return target === "top";
    });
    if (!homeLink) return;

    const homePath = new URL(homeLink.href, window.location.href).pathname;
    const availableTargets = new Set(
      links
        .map((link) => link.dataset.homeSectionLink || link.dataset.sidenavHomeLink)
        .filter((target) => allowedTargets.has(target)),
    );

    const setActive = (target) => {
      links.forEach((link) => {
        const linkTarget = link.dataset.homeSectionLink || link.dataset.sidenavHomeLink;
        link.classList.toggle("active", linkTarget === target);
      });
    };

    const scrollToTarget = (target, behavior = "smooth") => {
      const element = document.getElementById(target);
      if (!element) return false;
      element.scrollIntoView({ block: "start", behavior });
      return true;
    };

    const syncFromHash = () => {
      const target = (window.location.hash || "").replace(/^#/, "");
      setActive(availableTargets.has(target) ? target : "top");
    };

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const url = new URL(link.href, window.location.href);
        const target = (url.hash || "").replace(/^#/, "");
        if (!allowedTargets.has(target)) return;

        if (url.pathname !== window.location.pathname) {
          setActive(target);
          return;
        }

        event.preventDefault();
        setActive(target);
        if (window.location.hash !== `#${target}`) {
          window.history.pushState(
            null,
            "",
            `${window.location.pathname}${window.location.search}#${target}`,
          );
        }
        window.requestAnimationFrame(() => {
          scrollToTarget(target, "smooth");
        });
      });
    });

    if (window.location.pathname === homePath) {
      syncFromHash();
      const initialTarget = (window.location.hash || "").replace(/^#/, "");
      if (allowedTargets.has(initialTarget)) {
        window.requestAnimationFrame(() => scrollToTarget(initialTarget, "auto"));
      }
    }
    window.addEventListener("hashchange", syncFromHash);
  };

  const initLanguageFallback = () => {
    const forceSetLang = (lang) => {
      const nextLang = normalizeLang(lang);
      if (typeof window.setLanguage === "function") {
        window.setLanguage(nextLang);
        return;
      }
      window.location.href = nextLang === "de" ? "?lang=de" : `?lang=${nextLang}`;
    };

    document.addEventListener("click", (event) => {
      const opt = event.target.closest(".lang-option");
      if (opt) {
        forceSetLang(opt.dataset.lang || "de");
      }
    });
  };

  const initHeaderTranslations = () => {
    const scopes = [
      document.getElementById("mainTopnav"),
      document.getElementById("sideNav"),
    ].filter(Boolean);
    if (!scopes.length) return;

    const getNested = (obj, path) =>
      (path || "").split(".").reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
        obj,
      );

    const detectLang = () => {
      const htmlLang = normalizeLang(document.documentElement.lang, "");
      if (htmlLang) return htmlLang;
      forgetPreferredLang();
      return normalizeLang(window.PREFERRED_LANG);
    };

    const applyHeaderTranslations = (lang) => {
      const translations = window.TRANSLATIONS || {};
      const dict = translations[lang] || translations.de || {};
      const fallback = translations.de || {};
      const resolve = (key) => getNested(dict, key) ?? getNested(fallback, key);
      const applyMappedAttributes = (scope) => {
        scope.querySelectorAll("[data-i18n-attrs]").forEach((el) => {
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
            const value = resolve(key);
            if (value !== undefined) {
              el.setAttribute(attr, value);
            }
          });
        });
      };

      scopes.forEach((scope) => {
        scope.querySelectorAll("[data-i18n]").forEach((el) => {
          const value = resolve(el.dataset.i18n);
          if (value !== undefined) {
            el.textContent = value;
          }
        });

        scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
          const value = resolve(el.dataset.i18nTitle);
          if (value !== undefined) {
            el.setAttribute("title", value);
          }
        });

        scope.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
          const value = resolve(el.dataset.i18nAriaLabel);
          if (value !== undefined) {
            el.setAttribute("aria-label", value);
          }
        });

        applyMappedAttributes(scope);

        scope.querySelectorAll("[data-current-lang]").forEach((el) => {
          el.textContent = (lang || "de").toUpperCase();
        });
      });
    };

    const sync = (lang) => applyHeaderTranslations(normalizeLang(lang, detectLang()));

    window.addEventListener("preferred_lang_changed", (event) => {
      sync(event.detail);
    });

    sync();
  };

  const initNavCubeDrag = () => {
    document.querySelectorAll(".nav-cube-link").forEach((link) => {
      const cube = link.querySelector(".nav-cube");
      if (!cube) return;

      link.setAttribute("draggable", "false");
      let startX = 0;
      let startY = 0;
      let rotateX = -16;
      let rotateY = 28;
      let startRotateX = rotateX;
      let startRotateY = rotateY;
      let pointerId = null;
      let dragging = false;
      let suppressClick = false;
      let rotationRafId = 0;
      let inertiaRafId = 0;
      let resumeTimerId = 0;
      let lastMoveTime = 0;
      let velocityX = 0;
      let velocityY = 0;

      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

      const applyRotationNow = () => {
        rotationRafId = 0;
        cube.style.setProperty("--nav-cube-user-rotate-x", `${rotateX}deg`);
        cube.style.setProperty("--nav-cube-user-rotate-y", `${rotateY}deg`);
      };

      const scheduleRotation = () => {
        if (rotationRafId) return;
        rotationRafId = window.requestAnimationFrame(applyRotationNow);
      };

      const stopInertia = () => {
        if (!inertiaRafId) return;
        window.cancelAnimationFrame(inertiaRafId);
        inertiaRafId = 0;
      };

      const scheduleAutoResume = () => {
        if (resumeTimerId) {
          window.clearTimeout(resumeTimerId);
        }
        resumeTimerId = window.setTimeout(() => {
          resumeTimerId = 0;
          stopInertia();
          link.classList.remove("is-user-rotated", "is-dragging");
          cube.style.removeProperty("--nav-cube-user-rotate-x");
          cube.style.removeProperty("--nav-cube-user-rotate-y");
        }, 4000);
      };

      const startSmoothStop = () => {
        stopInertia();
        velocityX = clamp(velocityX, -1.2, 1.2);
        velocityY = clamp(velocityY, -1.8, 1.8);
        if (Math.abs(velocityX) < 0.015 && Math.abs(velocityY) < 0.015) {
          scheduleAutoResume();
          return;
        }

        let previousTime = window.performance.now();
        const glide = (time) => {
          const deltaTime = Math.min(24, Math.max(1, time - previousTime));
          previousTime = time;
          velocityX *= 0.86;
          velocityY *= 0.86;
          rotateX = clamp(rotateX + velocityX * deltaTime, -85, 85);
          rotateY += velocityY * deltaTime;
          applyRotationNow();

          if (Math.abs(velocityX) > 0.015 || Math.abs(velocityY) > 0.015) {
            inertiaRafId = window.requestAnimationFrame(glide);
          } else {
            inertiaRafId = 0;
            scheduleAutoResume();
          }
        };

        inertiaRafId = window.requestAnimationFrame(glide);
      };

      const stopDragging = () => {
        if (!dragging) return;
        dragging = false;
        pointerId = null;
        link.classList.remove("is-dragging");
        startSmoothStop();
      };

      const updateFromPointer = (event) => {
        if (!dragging || event.pointerId !== pointerId) return;
        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        if (Math.abs(deltaX) + Math.abs(deltaY) > 2) {
          suppressClick = true;
        }
        const now = window.performance.now();
        const deltaTime = Math.max(1, now - lastMoveTime);
        const nextRotateY = startRotateY + deltaX * 18;
        const nextRotateX = clamp(startRotateX - deltaY * 14, -85, 85);
        velocityY = (nextRotateY - rotateY) / deltaTime;
        velocityX = (nextRotateX - rotateX) / deltaTime;
        rotateY = nextRotateY;
        rotateX = nextRotateX;
        lastMoveTime = now;
        scheduleRotation();
        event.preventDefault();
      };

      link.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startRotateX = rotateX;
        startRotateY = rotateY;
        lastMoveTime = window.performance.now();
        velocityX = 0;
        velocityY = 0;
        suppressClick = false;
        dragging = true;
        stopInertia();
        if (resumeTimerId) {
          window.clearTimeout(resumeTimerId);
          resumeTimerId = 0;
        }
        link.classList.add("is-user-rotated", "is-dragging");
        applyRotationNow();
        try {
          link.setPointerCapture(pointerId);
        } catch (e) {
          /* pointer capture unavailable */
        }
        event.preventDefault();
      });

      link.addEventListener("pointermove", updateFromPointer);
      document.addEventListener("pointermove", updateFromPointer, { passive: false });

      link.addEventListener("pointerup", (event) => {
        if (event.pointerId !== pointerId) return;
        stopDragging();
      });

      document.addEventListener("pointerup", (event) => {
        if (event.pointerId !== pointerId) return;
        stopDragging();
      });

      link.addEventListener("pointercancel", stopDragging);
      link.addEventListener("lostpointercapture", stopDragging);
      link.addEventListener("dragstart", (event) => event.preventDefault());

      link.addEventListener(
        "click",
        (event) => {
          if (!suppressClick) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClick = false;
        },
        true,
      );

      link.addEventListener("keydown", (event) => {
        const step = event.shiftKey ? 24 : 12;
        if (event.key === "ArrowLeft") {
          rotateY -= step;
        } else if (event.key === "ArrowRight") {
          rotateY += step;
        } else if (event.key === "ArrowUp") {
          rotateX = Math.max(-55, rotateX - step);
        } else if (event.key === "ArrowDown") {
          rotateX = Math.min(55, rotateX + step);
        } else {
          return;
        }
        event.preventDefault();
        link.classList.add("is-user-rotated");
        applyRotationNow();
        scheduleAutoResume();
      });
    });
  };

  const initDashboardNav = () => {
    const nav = document.querySelector("[data-dashboard-nav]");
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll("[data-dashboard-nav-link]"));
    const pairs = links
      .map((link) => {
        const id = link.dataset.dashboardNavLink;
        const section = id ? document.getElementById(id) : null;
        return section ? { link, section } : null;
      })
      .filter(Boolean);

    if (!pairs.length) return;

    const setCurrent = (id) => {
      links.forEach((link) => {
        link.classList.toggle("is-current", link.dataset.dashboardNavLink === id);
      });
    };

    const syncFromHash = () => {
      const id = (window.location.hash || "").replace(/^#/, "");
      if (!id) return false;
      const match = pairs.find(({ section }) => section.id === id);
      if (!match) return false;
      setCurrent(match.section.id);
      return true;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          setCurrent(visible.target.id);
        }
      },
      {
        rootMargin: "-22% 0px -52% 0px",
        threshold: [0.2, 0.45, 0.7],
      },
    );

    pairs.forEach(({ section }) => observer.observe(section));

    if (!syncFromHash()) {
      setCurrent(pairs[0].section.id);
    }

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("[data-dashboard-nav-link]");
      if (!link) return;
      setCurrent(link.dataset.dashboardNavLink);
    });

    window.addEventListener("hashchange", syncFromHash);
  };

  const init = () => {
    initTopnavOffsetSync();
    if (document.querySelector(".flash")) {
      initFlashMessages();
    }
    initSideNav();
    initHomeSectionLinks();
    initLanguageFallback();
    initHeaderTranslations();
    initNavCubeDrag();
    initDashboardNav();
  };

  runWhenReady(init);
})();
