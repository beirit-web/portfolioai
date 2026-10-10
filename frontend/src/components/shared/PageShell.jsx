import React from "react";
import { createPortal } from "react-dom";
import { ArrowUp } from "lucide-react";
import { homeConfig as config, publicPageUrl } from "../../lib/homeConfig.js";
import { getScrollBehavior } from "../../lib/appNavigation.js";

const configuredBrandLogoUrl = config.logoUrl || "/static/images/aktueles-logo-160.webp";
const configuredBrandLogoSmallUrl = config.logoSmallUrl || configuredBrandLogoUrl;
const configuredBrandLogoLargeUrl = config.logoLargeUrl || configuredBrandLogoSmallUrl;
const brandLogoUrl = configuredBrandLogoUrl;
const brandLogoSmallUrl = configuredBrandLogoSmallUrl;
const brandLogoLargeUrl = configuredBrandLogoLargeUrl;
const brandLogoSrcSet = brandLogoSmallUrl !== brandLogoLargeUrl
  ? `${brandLogoSmallUrl} 160w, ${brandLogoLargeUrl} 320w`
  : undefined;
const footerLinkItems = [
  { href: "/kompetenzen", appPath: "/kompetenzen", labelKey: "nav.skills" },
  { href: "/kontakt", appPath: "/kontakt", labelKey: "footer.links.contact" },
  { href: publicPageUrl("/impressum"), labelKey: "footer.links.imprint" },
  { href: publicPageUrl("/datenschutz/"), labelKey: "footer.links.privacy" },
];
export function PageFooter({ t, onNavigate }) {
  const [isScrollTopVisible, setIsScrollTopVisible] = React.useState(false);

  React.useEffect(() => {
    const updateVisibility = () => {
      setIsScrollTopVisible(window.scrollY > 480);
    };

    let idleHandle;
    let timeoutHandle;
    const checkRestoredPosition = () => {
      if ("requestIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
        idleHandle = window.requestIdleCallback(updateVisibility, { timeout: 1500 });
      } else {
        clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(updateVisibility, 0);
      }
    };

    // A passive scroll event updates the threshold during interaction; an idle
    // check after load also handles restored scroll positions without forcing
    // the first page layout from the mounting effect.
    if (document.readyState === "complete") checkRestoredPosition();
    else window.addEventListener("load", checkRestoredPosition, { once: true });
    window.addEventListener("pageshow", checkRestoredPosition);
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => {
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
      clearTimeout(timeoutHandle);
      window.removeEventListener("load", checkRestoredPosition);
      window.removeEventListener("pageshow", checkRestoredPosition);
      window.removeEventListener("scroll", updateVisibility);
    };
  }, []);

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: getScrollBehavior() });
  };

  return (
    <footer className="site-footer bg-white px-4 py-8 text-sm text-slate-800 sm:px-8 lg:px-10">
      <div className="site-footer__inner mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="site-footer__brand">
          <span className="site-footer__brand-main">© 2026 Beirit Web - Eugen Beirit</span>
          <div className="site-footer__meta" aria-label="Website-Informationen">
            <small className="site-footer__small text-slate-800">{t("footer.business")}</small>
            <span className="site-footer__meta-separator" aria-hidden="true">·</span>
            <small className="site-footer__small text-slate-800">{t("footer.location")}</small>
          </div>
        </div>
        <div className="site-footer__links flex flex-wrap gap-x-5 gap-y-2">
          {footerLinkItems.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="footer-link transition hover:text-stone-950"
              onClick={link.appPath && onNavigate ? (event) => {
                event.preventDefault();
                onNavigate(link.appPath);
              } : undefined}
            >
              {t(link.labelKey)}
            </a>
          ))}
        </div>
      </div>
      <button
        type="button"
        className={`footer-link--scroll-top${isScrollTopVisible ? " is-visible" : ""}`}
        aria-label={t("footer.scrollTop")}
        onClick={handleScrollTop}
      >
        <span className="footer-link__scroll-icon" aria-hidden="true">
          <ArrowUp />
        </span>
      </button>
    </footer>
  );
}
export function SiteHeader({ t, activePath = "/", onNavigate, portal = false }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const mobileMenuToggleRef = React.useRef(null);
  const mobileMenuPanelRef = React.useRef(null);
  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/projekte", label: t("nav.portfolio") },
    { href: "/kompetenzen", label: t("nav.skills") },
    { href: "/ueber-mich", label: t("nav.aboutLink") },
    { href: "/kontakt", label: t("nav.contact") },
  ];
  const closeMobileMenu = React.useCallback((restoreFocus = false) => {
    setIsMobileMenuOpen(false);
    if (restoreFocus) {
      setTimeout(() => mobileMenuToggleRef.current?.focus(), 0);
    }
  }, []);
  const handleNavigate = React.useCallback((event, href) => {
    event.preventDefault();
    closeMobileMenu();
    onNavigate(href);
  }, [closeMobileMenu, onNavigate]);
  const renderNavigationLinks = (className = "site-nav-link") => navItems.map((item) => {
    const isActive = activePath === item.href;
    return (
      <a
        key={item.href}
        href={item.href}
        className={`${className}${isActive ? " is-active" : ""}`}
        aria-current={isActive ? "page" : undefined}
        onClick={(event) => handleNavigate(event, item.href)}
      >
        {item.label}
      </a>
    );
  });

  React.useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMobileMenu(true);
        return;
      }
      if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey) return;
      const focusableItems = [
        mobileMenuToggleRef.current,
        ...Array.from(mobileMenuPanelRef.current?.querySelectorAll("a[href]") || []),
      ].filter(Boolean);
      const firstItem = focusableItems[0];
      const lastItem = focusableItems[focusableItems.length - 1];
      if (!firstItem || !lastItem) return;
      if (event.shiftKey && document.activeElement === firstItem) {
        lastItem.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        firstItem.focus();
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeMobileMenu, isMobileMenuOpen]);

  React.useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const headerMarkup = (
    <>
      <header className={`site-header site-header--optimized fixed inset-x-0 top-0 z-40 bg-white/90 shadow-line backdrop-blur-xl${isMobileMenuOpen ? " is-mobile-menu-open" : ""}`}>
        <div className="site-header-nav site-header-nav--optimized">
          <a href="/" className="site-logo group inline-flex min-w-0 max-w-[68vw] items-center rounded-lg py-1 pr-1 outline-none transition focus-visible:ring-4 focus-visible:ring-emerald-200 sm:max-w-none" onClick={(event) => handleNavigate(event, "/")}>
            <img
              src={brandLogoUrl}
              srcSet={brandLogoSrcSet}
              sizes="56px"
              alt={t("home.hero.eyebrow")}
              className="site-logo__mark h-12 w-auto max-w-[11rem] shrink-0 object-contain sm:h-14 sm:max-w-[13rem]"
              width="80"
              height="80"
              decoding="async"
              loading="eager"
              fetchpriority="high"
              onError={(event) => {
                if (event.currentTarget.dataset.fallbackApplied === "true") return;
                event.currentTarget.dataset.fallbackApplied = "true";
                event.currentTarget.src = "/static/images/aktueles-logo-160.webp";
              }}
            />
          </a>
          <button
            type="button"
            ref={mobileMenuToggleRef}
            className="site-nav-toggle"
            aria-label={isMobileMenuOpen ? t("nav.menuClose") : t("nav.menuOpen")}
            aria-controls="site-mobile-navigation"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          >
            <span className="site-nav-toggle__icon" aria-hidden="true">
              <svg className="site-menuicon" width="50" height="50" viewBox="0 0 50 50" focusable="false">
                <g>
                  <line className="site-menuicon__bar" x1="13" y1="16.5" x2="37" y2="16.5" />
                  <line className="site-menuicon__bar" x1="13" y1="24.5" x2="37" y2="24.5" />
                  <line className="site-menuicon__bar" x1="13" y1="24.5" x2="37" y2="24.5" />
                  <line className="site-menuicon__bar" x1="13" y1="32.5" x2="37" y2="32.5" />
                  <circle className="site-menuicon__circle" r="23" cx="25" cy="25" />
                </g>
              </svg>
            </span>
            <span className="site-nav-toggle__text">{t("nav.menu")}</span>
          </button>
          <nav id="site-navigation" className={`site-nav-links${isMobileMenuOpen ? " site-nav-links--visible" : ""}`} aria-label="Hauptnavigation">
            {renderNavigationLinks()}
          </nav>
        </div>
      </header>
      <span className="site-nav-splash" aria-hidden="true" />
      {isMobileMenuOpen ? (
        <nav id="site-mobile-navigation" ref={mobileMenuPanelRef} className="site-mobile-menu-panel" aria-label="Hauptnavigation">
          {renderNavigationLinks("site-mobile-menu-panel__link")}
        </nav>
      ) : null}
    </>
  );

  if (portal && typeof document !== "undefined") {
    return createPortal(headerMarkup, document.body);
  }

  return headerMarkup;
}

export function PageShell({ t, activePath, onNavigate, children }) {
  return (
    <div className="site-shell site-shell--page min-h-screen bg-[#f7f6f2] text-stone-950">
      <SiteHeader t={t} activePath={activePath} onNavigate={onNavigate} />
      <main id="top" className="home-main site-page-main">
        {children}
      </main>
      <PageFooter t={t} onNavigate={onNavigate} />
    </div>
  );
}

export function PageHero({ eyebrow, title, intro }) {
  return (
    <section className="page-hero mx-auto max-w-7xl px-3 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-36 lg:px-10 xl:max-w-[92rem] 2xl:max-w-[104rem]">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="mt-3 max-w-6xl font-display text-4xl leading-tight sm:text-6xl lg:text-7xl xl:max-w-7xl 2xl:max-w-none 2xl:text-8xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-stone-700 sm:text-lg">{intro}</p>
    </section>
  );
}
