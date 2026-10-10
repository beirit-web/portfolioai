export function enhanceProjectPage() {
  const logo = document.querySelector(".site-logo__mark");
  const useFallbackLogo = () => {
    if (logo.dataset.fallbackApplied === "true") return;
    logo.dataset.fallbackApplied = "true";
    logo.removeAttribute("srcset");
    logo.src = "/static/images/aktueles-logo-160.webp";
  };
  logo?.addEventListener("error", useFallbackLogo);
  if (logo?.complete && !logo.naturalWidth) useFallbackLogo();

  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".site-nav-toggle");
  const panel = document.getElementById("site-mobile-navigation");
  let previousOverflow = "";
  let menuOpen = false;

  const setMenuOpen = (open, restoreFocus = false) => {
    if (!toggle || !panel || menuOpen === open) return;
    menuOpen = open;
    if (open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow;
    }
    panel.hidden = !open;
    header?.classList.toggle("is-mobile-menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? toggle.dataset.menuCloseLabel : toggle.dataset.menuOpenLabel);
    if (restoreFocus) toggle.focus();
  };

  toggle?.addEventListener("click", () => setMenuOpen(!menuOpen));
  panel?.addEventListener("click", (event) => {
    if (event.target.closest("a[href]")) setMenuOpen(false);
  });
  window.addEventListener("keydown", (event) => {
    if (!menuOpen) return;
    if (event.key === "Escape") {
      setMenuOpen(false, true);
      return;
    }
    if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey) return;
    const lastLink = panel.querySelector("a[href]:last-child");
    if (event.shiftKey && document.activeElement === toggle && lastLink) {
      event.preventDefault();
      lastLink.focus();
    } else if (!event.shiftKey && document.activeElement === lastLink) {
      event.preventDefault();
      toggle.focus();
    }
  });
  window.matchMedia("(min-width: 48rem)").addEventListener("change", (event) => {
    if (event.matches) setMenuOpen(false);
  });

  const scrollTop = document.querySelector(".footer-link--scroll-top");
  if (scrollTop) {
    scrollTop.hidden = false;
    const updateScrollTop = () => scrollTop.classList.toggle("is-visible", window.scrollY > 480);
    window.addEventListener("scroll", updateScrollTop, { passive: true });
    const checkRestoredPosition = () => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(updateScrollTop, { timeout: 1500 });
      else setTimeout(updateScrollTop, 0);
    };
    if (document.readyState === "complete") checkRestoredPosition();
    else window.addEventListener("load", checkRestoredPosition, { once: true });
    window.addEventListener("pageshow", checkRestoredPosition);
    scrollTop.addEventListener("click", () => window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    }));
  }

  enhanceTooltips();
}

function enhanceTooltips() {
  const triggers = document.querySelectorAll("[data-project-tooltip]");
  if (!triggers.length) return;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let activeTrigger;
  let popover;
  let positionFrame;
  let restoringFocus = false;

  const updatePosition = () => {
    if (!activeTrigger || !popover) return;
    const rect = activeTrigger.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 24);
    const height = popover.offsetHeight || 96;
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
    const below = rect.bottom + 8;
    const top = below + height <= window.innerHeight - 12 ? below : Math.max(12, rect.top - height - 8);
    popover.style.setProperty("--tooltip-top", `${top}px`);
    popover.style.setProperty("--tooltip-left", `${left}px`);
    popover.style.setProperty("--tooltip-width", `${width}px`);
  };
  const schedulePosition = () => {
    cancelAnimationFrame(positionFrame);
    positionFrame = requestAnimationFrame(updatePosition);
  };
  const close = () => {
    if (!activeTrigger) return;
    activeTrigger.setAttribute("aria-expanded", "false");
    activeTrigger.removeAttribute("aria-describedby");
    activeTrigger = undefined;
    popover?.remove();
    popover = undefined;
    cancelAnimationFrame(positionFrame);
    window.removeEventListener("scroll", schedulePosition, true);
    window.removeEventListener("resize", schedulePosition);
  };
  const open = (trigger) => {
    if (activeTrigger === trigger) return;
    close();
    activeTrigger = trigger;
    popover = document.createElement("span");
    popover.id = "project-term-explanation";
    popover.className = "info-tooltip__popover";
    popover.setAttribute("role", "tooltip");
    popover.textContent = trigger.dataset.projectTooltip;
    document.body.appendChild(popover);
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-describedby", popover.id);
    schedulePosition();
    window.addEventListener("scroll", schedulePosition, { capture: true, passive: true });
    window.addEventListener("resize", schedulePosition);
  };
  for (const trigger of triggers) {
    trigger.addEventListener("pointerenter", () => { if (finePointer.matches) open(trigger); });
    trigger.addEventListener("pointerleave", () => { if (finePointer.matches) close(); });
    trigger.addEventListener("focus", () => { if (finePointer.matches && !restoringFocus) open(trigger); });
    trigger.addEventListener("blur", () => { if (finePointer.matches) close(); });
    trigger.addEventListener("click", (event) => {
      if (event.detail === 0 || finePointer.matches) open(trigger);
      else if (activeTrigger === trigger) close();
      else open(trigger);
    });
  }
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeTrigger) {
      const trigger = activeTrigger;
      close();
      restoringFocus = true;
      trigger.focus({ preventScroll: true });
      restoringFocus = false;
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (activeTrigger && !activeTrigger.contains(event.target) && !popover?.contains(event.target)) close();
  });
}
