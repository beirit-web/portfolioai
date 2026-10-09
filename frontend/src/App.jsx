import { homeConfig as config, publicPageBaseUrl, publicPageUrl } from "./lib/homeConfig";
import React from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Braces,
  Bug,
  Cable,
  CheckCircle2,
  Code2,
  Component,
  Container,
  Cpu,
  Database,
  FileText,
  GitBranch,
  Globe2,
  Handshake,
  Hash,
  HelpCircle,
  Image,
  Languages,
  Layers3,
  LayoutTemplate,
  Mail,
  MapPinned,
  MessageSquare,
  MonitorSmartphone,
  PencilLine,
  Quote,
  ServerCog,
  ShieldCheck,
  Star,
  UserRound,
  Workflow,
  Wrench,
} from "lucide-react";
import {
  createTranslator,
  detectInitialLanguage,
  ensureLanguage,
  isLanguageLoaded,
} from "./i18n";
import Hero from "./components/home/hero/Hero";
import PortfolioProjectCard from "./components/home/portfolio/PortfolioProjectCard";
import PortfolioImage from "./components/home/portfolio/PortfolioImage";
import { usePortfolioStageHeight } from "./components/home/portfolio/usePortfolioStageHeight";
import {
  featureLabel,
  isProjectPublished,
  normalizeApiProject,
  portfolioProjectPath,
  portfolioSlugFor,
  projectPreviewImage,
  projectTechnologyTags,
  selectCarouselProjects,
} from "./components/home/portfolio/portfolioPresentation.mjs";
import { technologyLogos } from "./components/shared/technologyLogos.mjs";
import TechnologyIcon from "./components/shared/TechnologyIcon";
import TechnologyTags from "./components/shared/TechnologyTags";
import CardIllustration from "./components/shared/CardIllustration";
import { TechnicalLabel } from "./components/shared/TechnicalLabel";
import { activateCardLink } from "./components/shared/cardActivation";
import { useMediaQuery } from "./hooks/useMediaQuery";

const projectsApiUrl = config.projectsApiUrl || "/api/projects/";
const isLocalAppHost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
const useLocalPortfolioLinks = config.useLocalPortfolioLinks === true && isLocalAppHost;
const configuredBrandLogoUrl = config.logoUrl || "/static/images/aktueles-logo-160.webp";
const configuredBrandLogoSmallUrl = config.logoSmallUrl || configuredBrandLogoUrl;
const configuredBrandLogoLargeUrl = config.logoLargeUrl || configuredBrandLogoSmallUrl;
const brandLogoUrl = configuredBrandLogoUrl;
const brandLogoSmallUrl = configuredBrandLogoSmallUrl;
const brandLogoLargeUrl = configuredBrandLogoLargeUrl;
const brandLogoSrcSet = brandLogoSmallUrl !== brandLogoLargeUrl
  ? `${brandLogoSmallUrl} 160w, ${brandLogoLargeUrl} 320w`
  : undefined;
const aboutPortraitUrl = "/static/images/eugenbeirit-360.webp";
const aboutPortraitSrcSet = [
  "/static/images/eugenbeirit-360.webp 360w",
  "/static/images/eugenbeirit-540.webp 540w",
].join(", ");
const aboutPortraitFallbackUrl = "/static/images/eugenbeirit.png";
const LazyContactForm = React.lazy(() => import("./components/contact/ContactForm.jsx"));
const LazyContactDetails = React.lazy(() => import("./components/contact/ContactDetails.jsx"));
function WeatherRedirect() {
  React.useEffect(() => {
    window.location.replace(publicPageUrl("/botanic/wetter/"));
  }, []);
  return <a href={publicPageUrl("/botanic/wetter/")}>Wetter in ENBT Botanic öffnen</a>;
}
function scrollToHashTarget(hash) {
  if (!hash || hash === "#top") return;
  setTimeout(() => {
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    const headerOffset = 92;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: getScrollBehavior() });
  }, 0);
}

function ReactBrandIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" {...props}>
      <circle cx="12" cy="12" r="1.55" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="3.8" />
      <ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(120 12 12)" />
    </svg>
  );
}

function DjangoBrandIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M7 4.5h5.2v15H7a4.5 4.5 0 0 1 0-9h5.2" />
      <path d="M16.5 4.5v10.8a4.2 4.2 0 0 1-4.2 4.2" />
    </svg>
  );
}

function PythonBrandIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8.5 9.5H15a3 3 0 0 1 3 3v1.2a3 3 0 0 1-3 3h-3v1.8a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2v-4.8a4.2 4.2 0 0 1 4.2-4.2H12" />
      <path d="M15.5 14.5H9a3 3 0 0 1-3-3v-1.2a3 3 0 0 1 3-3h3V5.5a2 2 0 0 1 2-2h2.5a2 2 0 0 1 2 2v4.8a4.2 4.2 0 0 1-4.2 4.2H12" />
      <path d="M9.3 5.4h.01" />
      <path d="M14.7 18.6h.01" />
    </svg>
  );
}

function GitHubIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

const iconMap = {
  Braces,
  Bug,
  Cable,
  Code2,
  Component,
  Container,
  Cpu,
  Database,
  FileText,
  Globe2,
  Handshake,
  Image,
  Layers3,
  LayoutTemplate,
  Mail,
  MapPinned,
  MessageSquare,
  PencilLine,
  Quote,
  ServerCog,
  ShieldCheck,
  Star,
  UserRound,
  Workflow,
  GitBranch,
  ReactBrand: ReactBrandIcon,
  DjangoBrand: DjangoBrandIcon,
};

function iconFor(name, fallback = LayoutTemplate) {
  return iconMap[name] || fallback;
}

function useI18n() {
  const [language] = React.useState(detectInitialLanguage);
  const [translationVersion, setTranslationVersion] = React.useState(0);

  React.useEffect(() => {
    if (isLanguageLoaded(language)) return undefined;
    let active = true;
    ensureLanguage(language).then(() => {
      if (active) setTranslationVersion((version) => version + 1);
    });
    return () => {
      active = false;
    };
  }, [language]);

  const t = React.useMemo(() => createTranslator(language), [language, translationVersion]);

  React.useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return { language, t };
}

const footerLinkItems = [
  { href: "/kompetenzen", appPath: "/kompetenzen", labelKey: "nav.skills" },
  { href: "/kontakt", appPath: "/kontakt", labelKey: "footer.links.contact" },
  { href: publicPageUrl("/spenden/"), labelKey: "footer.links.donate" },
  { href: publicPageUrl("/impressum"), labelKey: "footer.links.imprint" },
  { href: publicPageUrl("/datenschutz/"), labelKey: "footer.links.privacy" },
];

const appRoutes = {
  "/": { key: "home", title: "Beirit Web | Web-, Software- und Digitalprojekte", description: "Portfolio von Eugen Beirit mit Webanwendungen, Softwareprojekten und technischen Fallstudien auf Basis von React, Django und Python.", keywords: "Beirit Web, Beirit Digital, Portfolio, Webentwicklung, Softwareentwicklung, React, Django, Python, Fullstack, digitale Projekte" },
  "/kompetenzen": { key: "services", title: "Technologien und Kompetenzen | Beirit Web", description: "Technische Kompetenzen und Projekterfahrung mit React, Django, Python, APIs und responsiven Weboberflächen." },
  "/projekte": { key: "projects", title: "Projekte | Beirit Digital", description: "Webprojekte, Django-Anwendungen, Python-Tools und weitere Softwarelösungen von Beirit Digital ansehen und testen." },
  "/ueber-mich": { key: "about", title: "Über Eugen Beirit | Beirit Digital", description: "Persönlicher Hintergrund, Arbeitsweise und technische Schwerpunkte von Eugen Beirit." },
  "/kontakt": { key: "contact", title: "Kontakt | Beirit Web", description: "Kontakt für Fragen zu den Projekten, fachlichen Austausch und berufliche Kontakte." },
  "/wetter": { key: "weather", title: "Wetter | Beirit Digital", description: "Aktuelles Wetter, Regenfenster, Sonnenzeiten und 5-Tage-Ausblick direkt im Browser.", robots: "noindex, follow" },
};

const routeAliases = {
  "/profil": "/ueber-mich",
  "/projekte/": "/projekte",
  "/leistungen": "/kompetenzen",
  "/preise": "/projekte",
  "/zahlung": "/projekte",
  "/zahlung/erfolg": "/projekte",
  "/zahlung/abbruch": "/projekte",
  "/faq": "/kontakt",
  "/referenzen/coachingservice": "/referenzen/sprachdienstleistungen",
};

function sortedPortfolioItems(items) {
  return [...items]
    .filter(isProjectPublished)
    .sort((first, second) => {
      const firstOrder = Number.isFinite(first.sortOrder) ? first.sortOrder : Number.MAX_SAFE_INTEGER;
      const secondOrder = Number.isFinite(second.sortOrder) ? second.sortOrder : Number.MAX_SAFE_INTEGER;
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      return String(first.title || "").localeCompare(String(second.title || ""), "de");
    });
}

function featuredPortfolioItems(items, limit = 6) {
  return selectCarouselProjects(sortedPortfolioItems(items), limit);
}

function isAppHandledPath(pathname) {
  const normalizedPath = normalizeAppPath(pathname);
  return Boolean(
    appRoutes[normalizedPath]
    || normalizedPath.startsWith("/projekte/")
    || normalizedPath.startsWith("/referenzen/")
  );
}

function publicSiteHref(href) {
  const value = String(href || "");
  if (!value || isExternalUrl(value) || value.startsWith("#") || !publicPageBaseUrl) return value;
  if (!value.startsWith("/")) return value;

  const target = new URL(value, window.location.origin);
  if (isAppHandledPath(target.pathname)) return value;

  return publicPageUrl(`${target.pathname}${target.search}${target.hash}`);
}

function projectLiveHref(item) {
  const href = item.liveUrl || item.href || item.localHref || "";
  if (!href) return "";
  const category = item.category || "";
  if (category === "case") return "";
  return publicSiteHref(href);
}

function usePortfolioProjects(t, { fetchRemote = true } = {}) {
  const fallbackItems = React.useMemo(() => sortedPortfolioItems(t("home.portfolio.items")), [t]);
  const [state, setState] = React.useState({ items: fallbackItems, featuredItems: featuredPortfolioItems(fallbackItems, 6) });

  React.useEffect(() => {
    let isActive = true;
    setState((previous) => previous.items === fallbackItems ? previous : {
      items: fallbackItems,
      featuredItems: featuredPortfolioItems(fallbackItems, 6),
    });
    if (!fetchRemote) {
      return () => {
        isActive = false;
      };
    }

    fetch(projectsApiUrl, { headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then((response) => {
        if (!response.ok) throw new Error("Project API unavailable");
        return response.json();
      })
      .then((payload) => {
        if (!isActive) return;
        const localizedBySlug = new Map(fallbackItems.map((item) => [portfolioSlugFor(item), item]));
        const normalizeProject = (project) => normalizeApiProject(project, localizedBySlug.get(portfolioSlugFor(project)));
        const apiItems = (payload.projects || []).map(normalizeProject).filter(Boolean);
        if (!apiItems.length) return;
        setState({
          items: sortedPortfolioItems(apiItems),
          featuredItems: featuredPortfolioItems(apiItems, 6),
        });
      })
      .catch(() => {
        if (isActive) setState({ items: fallbackItems, featuredItems: featuredPortfolioItems(fallbackItems, 6) });
      });
    return () => {
      isActive = false;
    };
  }, [fallbackItems, fetchRemote]);

  return state;
}

function useDeferredPortfolioFetch(isHomeRoute = false) {
  const [shouldFetchPortfolio, setShouldFetchPortfolio] = React.useState(!isHomeRoute);

  React.useEffect(() => {
    if (!isHomeRoute || shouldFetchPortfolio || typeof window === "undefined") return undefined;

    const revealPortfolioData = () => {
      setShouldFetchPortfolio(true);
    };

    if (window.location.hash === "#referenzen") {
      revealPortfolioData();
      return undefined;
    }

    const timeoutId = setTimeout(revealPortfolioData, 6500);
    const onScrollNearPortfolio = () => {
      const target = document.getElementById("referenzen");
      if (!target) return;
      const preloadDistance = window.innerHeight * 1.8;
      if (target.getBoundingClientRect().top <= preloadDistance) {
        revealPortfolioData();
      }
    };

    window.addEventListener("hashchange", revealPortfolioData, { once: true });
    window.addEventListener("scroll", onScrollNearPortfolio, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("hashchange", revealPortfolioData);
      window.removeEventListener("scroll", onScrollNearPortfolio);
    };
  }, [isHomeRoute, shouldFetchPortfolio]);

  return shouldFetchPortfolio;
}

function isExternalUrl(href) {
  return /^https?:\/\//i.test(String(href || ""));
}

function featureDescription(item) {
  if (!item || typeof item !== "object") return "";
  return String(item.text || item.description || "").trim();
}

function paragraphList(text) {
  if (Array.isArray(text)) return text.filter(Boolean);
  return String(text || "")
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function projectActionHref(item) {
  if (useLocalPortfolioLinks && item.localHref) return publicSiteHref(item.localHref);
  return publicSiteHref(item.href || "");
}

function normalizeAppPath(pathname = window.location.pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return routeAliases[path] || path;
}

function useBrowserPath() {
  const [path, setPath] = React.useState(() => normalizeAppPath());

  React.useEffect(() => {
    const handlePopState = () => setPath(normalizeAppPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return [path, setPath];
}

function navigateToAppPath(path, setPath) {
  const target = new URL(String(path || "/"), window.location.origin);
  const normalizedPath = normalizeAppPath(target.pathname || "/");
  const targetHash = target.hash || "";
  const targetUrl = `${normalizedPath}${target.search}${targetHash}`;
  const currentUrl = `${normalizeAppPath()}${window.location.search}${window.location.hash}`;
  const currentPath = normalizeAppPath();
  if (targetUrl === currentUrl) {
    if (targetHash) {
      scrollToHashTarget(targetHash);
    } else {
      window.scrollTo({ top: 0, behavior: getScrollBehavior() });
    }
    return;
  }

  if (normalizedPath !== currentPath) {
    window.location.assign(targetUrl);
    return;
  }

  window.history.pushState({}, "", targetUrl);
  setPath(normalizedPath);
  if (targetHash) {
    setTimeout(() => scrollToHashTarget(targetHash), 50);
  } else {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

function useDocumentMeta(route) {
  React.useEffect(() => {
    if (!route) return undefined;
    document.title = route.title;
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.setAttribute("name", "description");
      document.head.append(description);
    }
    description.setAttribute("content", route.description);
    if (route.keywords) {
      let keywords = document.querySelector('meta[name="keywords"]');
      if (!keywords) {
        keywords = document.createElement("meta");
        keywords.setAttribute("name", "keywords");
        document.head.append(keywords);
      }
      keywords.setAttribute("content", route.keywords);
    }
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.append(canonical);
    }
    canonical.setAttribute("href", route.canonical || `${window.location.origin}${normalizeAppPath() === "/" ? "/" : `${normalizeAppPath()}/`}`);
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) {
      robots.setAttribute("content", route.robots || "index, follow");
    }
    return undefined;
  }, [route]);
}

function useDocumentStateClasses() {
  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const root = document.documentElement;
    const handleLoad = () => root.classList.add("page-is-loaded");

    // These document classes do not require another render of the entire app.
    if (document.readyState === "complete") handleLoad();
    else window.addEventListener("load", handleLoad, { once: true });
    return () => {
      window.removeEventListener("load", handleLoad);
      root.classList.remove("page-is-loaded");
    };
  }, []);
}

function useScrollReveal(rootSelector = ".site-shell") {
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const root = document.querySelector(rootSelector);
    if (!root) return undefined;

    const revealElements = Array.from(root.querySelectorAll("[data-reveal]"));
    if (revealElements.length === 0) return undefined;

    revealElements.forEach((element) => {
      if (element.classList.contains("section-kicker")) return;
      element.classList.add("is-revealed");
    });

    return undefined;
  }, [rootSelector]);
}

function revealProps(reveal = "up", delay = 0, duration = 760, distance = "1rem") {
  if (typeof window !== "undefined" && window.location.pathname === "/") {
    return {};
  }

  return {
    "data-reveal": reveal,
    "data-reveal-delay": String(delay),
    "data-reveal-duration": String(duration),
    "data-reveal-distance": distance,
  };
}

function useDeferredHomeSections() {
  const [showSections, setShowSections] = React.useState(() => (
    typeof window !== "undefined"
      && window.location.hash
      && window.location.hash !== "#top"
  ));
  const loadingPromiseRef = React.useRef(null);

  const revealNow = React.useCallback(() => {
    setShowSections(true);
    if (loadingPromiseRef.current) return loadingPromiseRef.current;

    const deferredCssLoader = typeof window !== "undefined"
      ? window.BEIRIT_LOAD_DEFERRED_CSS
      : null;

    loadingPromiseRef.current = (typeof deferredCssLoader === "function"
      ? deferredCssLoader()
      : Promise.resolve()).finally(() => {
      loadingPromiseRef.current = null;
    });

    return loadingPromiseRef.current;
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleHashChange = () => {
      if (window.location.hash && window.location.hash !== "#top") revealNow();
    };
    const handleScrollOrInteraction = () => revealNow();
    const timeoutId = setTimeout(revealNow, 8000);

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("scroll", handleScrollOrInteraction, { passive: true, once: true });
    window.addEventListener("pointerdown", handleScrollOrInteraction, { passive: true, once: true });
    window.addEventListener("keydown", handleScrollOrInteraction, { once: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("scroll", handleScrollOrInteraction);
      window.removeEventListener("pointerdown", handleScrollOrInteraction);
      window.removeEventListener("keydown", handleScrollOrInteraction);
    };
  }, [revealNow]);

  return [showSections, revealNow];
}

function getScrollBehavior() {
  if (typeof window === "undefined" || !window.matchMedia) return "smooth";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function PageFooter({ t, onNavigate }) {
  const [isScrollTopVisible, setIsScrollTopVisible] = React.useState(false);

  React.useEffect(() => {
    const updateVisibility = () => {
      setIsScrollTopVisible(window.scrollY > 480);
    };

    // Let the first layout finish before reading the scroll position.
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(updateVisibility);
    });
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
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

function HeroTrustStrip({ t, language }) {
  const trustBadges = t("home.hero.trustBadges");

  return (
    <section className="hero-trust-strip" aria-label={t("home.hero.trustAria")}>
      <ul className="hero-trust-strip__inner">
        {trustBadges.map((badge) => (
          <li key={badge} className="hero-trust-strip__badge">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <TechnicalLabel language={language}>{badge}</TechnicalLabel>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BeforeAfterSection({ t }) {
  const beforeItems = t("home.beforeAfter.before.items");
  const afterItems = t("home.beforeAfter.after.items");

  return (
    <section className="before-after-section" {...revealProps("up", 0, 620, "0.8rem")}>
      <div className="before-after-section__inner">
        <header className="before-after-section__heading">
          <h2>{t("home.beforeAfter.title")}</h2>
          <p>{t("home.beforeAfter.intro")}</p>
        </header>
        <div className="before-after-grid" aria-label={t("home.beforeAfter.aria")}>
          <article className="before-after-card before-after-card--before" {...revealProps("left", 80, 560, "0.7rem")}>
            <h3>{t("home.beforeAfter.before.title")}</h3>
            <ul>
              {beforeItems.map((item) => (
                <li key={item}><X className="h-5 w-5" aria-hidden="true" />{item}</li>
              ))}
            </ul>
          </article>
          <article className="before-after-card before-after-card--after" {...revealProps("right", 120, 560, "0.7rem")}>
            <h3>{t("home.beforeAfter.after.title")}</h3>
            <ul>
              {afterItems.map((item) => (
                <li key={item}><CheckCircle2 className="h-5 w-5" aria-hidden="true" />{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function SolutionsSection({ t }) {
  const items = t("home.solutions.items");

  return (
    <section className="solutions-section" {...revealProps("up", 0, 620, "0.8rem")}>
      <div className="solutions-section__inner">
        <header className="solutions-section__heading">
          <h2>{t("home.solutions.title")}</h2>
          <p>{t("home.solutions.intro")}</p>
        </header>
        <ul className="solutions-grid">
          {items.map(({ icon, title }, index) => {
            const Icon = iconFor(icon, CheckCircle2);
            return (
              <li key={title} className="solution-card" {...revealProps("up", 70 + index * 45, 520, "0.65rem")}>
                <span className="solution-card__icon"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h3>{title}</h3>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ProblemsSection({ t, preview = false }) {
  const problems = t("home.problems.items");

  return (
    <section className="problems-section mx-auto max-w-7xl px-3 pt-10 pb-0 sm:px-8 sm:pt-16 sm:pb-0 lg:px-10" {...revealProps("up", 0, 760, "1rem")}>
      <div className="problems-panel">
        <header className="problems-panel__copy" {...revealProps("up", 80, 760, "0.9rem")}>
          <h2 className="home-section-title mt-3 font-display text-3xl leading-tight sm:text-4xl">{t("home.problems.title")}</h2>
          <p className="mt-4 text-base leading-8 text-stone-700">{t("home.problems.intro")}</p>
        </header>
        {!preview ? (
          <>
            <ul className="problems-grid">
              {problems.map(({ icon, title, text }, index) => {
                const Icon = iconFor(icon);
                return (
                  <li key={title} className="problem-card" {...revealProps("up", 130 + index * 45, 680, "0.75rem")}>
                    <CardIllustration name={icon} kind="problem" fallback={Icon} />
                    <span className="problem-card__body">
                      <strong>{title}</strong>
                      {text ? <span>{text}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="problems-solution" {...revealProps("up", 250, 720, "0.8rem")}>
              <p>{t("home.problems.solution")}</p>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function BenefitsSection({ t, language }) {
  const benefits = t("home.benefits.items");

  return (
    <section className="benefits-section benefits-bento-section border-y border-stone-200 bg-white py-11 sm:py-20" {...revealProps("left", 0, 760, "1.25rem")}>
      <div className="benefits-section__inner mx-auto max-w-7xl px-3 sm:px-8 lg:px-10">
        <header className="benefits-section__header max-w-3xl" {...revealProps("up", 90, 760, "0.95rem")}>
          <h2 className="home-section-title mt-3 font-display text-3xl leading-tight sm:text-4xl">{t("home.benefits.title")}</h2>
          <p className="mt-5 text-base leading-8 text-stone-700 sm:text-lg">{t("home.benefits.intro")}</p>
        </header>
        <div className="benefits-grid benefits-bento-grid mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {benefits.map(({ icon, title, text }, index) => {
            const Icon = iconFor(icon);
            return (
              <article key={title} className="benefit-card reveal-card" {...revealProps("up", 150 + index * 70, 720, "0.9rem")}>
                <div className="benefit-card__heading">
                  <h3 className="text-xl font-bold leading-7"><TechnicalLabel language={language}>{title}</TechnicalLabel></h3>
                  <span className="benefit-card__icon">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 leading-7 text-stone-700">{text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ t }) {
  const items = t("home.testimonials.items");

  return (
    <section className="testimonials-section mx-auto max-w-7xl px-3 py-11 sm:px-8 sm:py-20 lg:px-10" {...revealProps("right", 0, 760, "1.25rem")}>
      <header className="max-w-3xl" {...revealProps("up", 90, 760, "0.95rem")}>
        <h2 className="home-section-title mt-3 font-display text-3xl leading-tight sm:text-4xl">{t("home.testimonials.title")}</h2>
        <p className="mt-5 text-base leading-8 text-stone-700 sm:text-lg">{t("home.testimonials.intro")}</p>
      </header>
      <ul className="testimonial-slider mt-10" aria-label={t("home.testimonials.sliderAria")}>
        {items.map(({ title, text }, index) => (
          <li key={title} className="testimonial-card reveal-card" {...revealProps("up", 150 + index * 80, 720, "0.9rem")}>
            <header className="testimonial-card__heading">
              <h3 className="text-xl font-bold leading-7">{title}</h3>
              <Quote className="testimonial-card__quote h-6 w-6 text-emerald-700" aria-hidden="true" />
            </header>
            <p className="mt-3 leading-7 text-stone-700">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SiteHeader({ t, activePath = "/", onNavigate, portal = false }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const mobileMenuToggleRef = React.useRef(null);
  const mobileMenuPanelRef = React.useRef(null);
  const navItems = [
    { href: "/", label: t("nav.home") },
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

function PageShell({ t, activePath, onNavigate, children }) {
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

function PageHero({ eyebrow, title, intro }) {
  return (
    <section className="page-hero mx-auto max-w-7xl px-3 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-36 lg:px-10 xl:max-w-[92rem] 2xl:max-w-[104rem]">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="mt-3 max-w-6xl font-display text-4xl leading-tight sm:text-6xl lg:text-7xl xl:max-w-7xl 2xl:max-w-none 2xl:text-8xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-stone-700 sm:text-lg">{intro}</p>
    </section>
  );
}

function UnderConstructionNote({ t, onNavigate }) {
  return (
    <div className="section-cta-strip mx-auto mt-8 max-w-7xl px-3 sm:px-8 lg:px-10">
      <a href="/kontakt" className="portfolio-contact-button" onClick={(event) => {
        event.preventDefault();
        onNavigate("/kontakt");
      }}>
        {t("home.contact.title")}
      </a>
    </div>
  );
}


function featureIconFor(item) {
  const text = String(item || "").toLowerCase();
  const matches = (patterns) => patterns.some((pattern) => pattern.test(text));

  if (matches([/react/, /vite/])) return ReactBrandIcon;
  if (matches([/django/])) return DjangoBrandIcon;
  if (matches([/^python$/, /python/])) return PythonBrandIcon;
  if (matches([/^css$/, /css/])) return Hash;
  if (matches([/^javascript$/, /\bjs\b/, /javascript/])) return Braces;
  if (matches([/^html$/, /html/])) return Code2;
  if (matches([/postgres|daten|data|model|database|profilmodel|katalog|quellen|angebote|скоринг|каталог|данн/])) return Database;
  if (matches([/code|logik|funktion|backend|frontend|api|rest|widget|script|ui-|interface|интерфейс|код|логик|функц|backend|frontend/])) return Code2;
  if (matches([/mobil|responsive|gerät|darstellung|design|abstand|layout|template|ansicht|bild|bilder|визуал|мобиль|адаптац|изображ|дизайн/])) return MonitorSmartphone;
  if (matches([/formular|anfrage|kontakt|bewerbung|chat|form|заяв|форм|контакт|чат/])) return MessageSquare;
  if (matches([/text|übersetz|de\/ru|deutsch|russisch|sprache|hinweis|термин|текст|немец|русск|подсказ/])) return Languages;
  if (matches([/fehler|bug|ladeproblem|prüfung|sichtung|analyse|problem|ошиб|провер|анализ|загруз/])) return Bug;
  if (matches([/seite|startseite|unterseite|bereich|veröffentlichung|route|webseite|page|страниц|публикац|раздел/])) return LayoutTemplate;
  if (matches([/kalender|termin|ablauf|workflow|prozess|verwaltung|организац|процесс|управлен/])) return Workflow;
  if (matches([/sicher|login|konto|geschützt|auth|безопас|аккаунт|логин/])) return ShieldCheck;
  if (matches([/schnell|ladezeit|performance|cache|static|статич|быстр/])) return Cpu;

  return Star;
}

function PortfolioFeatureList({ items, illustrations = [] }) {
  return (
    <ul className="portfolio-card__feature-list">
      {items.map((item, index) => {
        const label = featureLabel(item);
        const description = featureDescription(item);
        const Icon = featureIconFor(label);
        return (
          <li key={label}>
            <span className="portfolio-card__feature-list-icon-wrap" aria-hidden="true">
              {illustrations[index] ? (
                <CardIllustration name={illustrations[index]} kind="feature" fallback={Icon} className="portfolio-card__feature-list-icon" />
              ) : (
                <TechnologyIcon label={label} fallback={Icon} className="portfolio-card__feature-list-icon" />
              )}
            </span>
            <span>
              <strong>{label}</strong>
              {description ? <small>{description}</small> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AboutTechCarousel({ items }) {
  const carouselRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const activeItem = items[activeIndex] || items[0];
  const ActiveIcon = featureIconFor(activeItem);
  const hasMultipleItems = items.length > 1;

  const goToSlide = React.useCallback((index) => {
    if (!items.length) return;
    setActiveIndex((index + items.length) % items.length);
  }, [items.length]);

  const moveSlide = React.useCallback((direction) => {
    goToSlide(activeIndex + direction);
  }, [activeIndex, goToSlide]);

  React.useEffect(() => {
    if (activeIndex <= items.length - 1) return;
    setActiveIndex(0);
  }, [activeIndex, items.length]);

  React.useEffect(() => {
    if (!window.IntersectionObserver) {
      setIsInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    });
    if (carouselRef.current) observer.observe(carouselRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!hasMultipleItems || isPaused || !isInView) return undefined;
    const intervalId = setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % items.length);
    }, 2600);
    return () => clearInterval(intervalId);
  }, [hasMultipleItems, isPaused, isInView, items.length]);

  if (!items.length) return null;

  return (
    <div
      ref={carouselRef}
      className="about-tech-carousel"
      aria-roledescription="carousel"
      aria-label="Technologien und Werkzeuge"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="about-tech-carousel__stage" aria-live="polite" key={activeItem}>
        <TechnologyIcon label={activeItem} fallback={ActiveIcon} className="about-tech-carousel__icon" />
        <strong>{activeItem}</strong>
        <span>{activeIndex + 1} / {items.length}</span>
      </div>
      <div className="about-tech-carousel__rail" aria-hidden="true">
        {items.map((item, index) => {
          const Icon = featureIconFor(item);
          return (
            <div key={item} className={`about-tech-carousel__item${index === activeIndex ? " is-active" : ""}`}>
              <TechnologyIcon label={item} fallback={Icon} className="about-tech-carousel__item-icon" />
              <strong>{item}</strong>
            </div>
          );
        })}
      </div>
      {hasMultipleItems ? (
        <div className="about-tech-carousel__controls">
          <button type="button" className="about-tech-carousel__button" onClick={() => moveSlide(-1)} aria-label="Vorherige Technologie">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="about-tech-carousel__dots" aria-label="Technologie auswählen">
            {items.map((item, index) => (
              <button
                key={item}
                type="button"
                className={`about-tech-carousel__dot${index === activeIndex ? " is-active" : ""}`}
                aria-label={`${item} anzeigen`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
          <button type="button" className="about-tech-carousel__button" onClick={() => moveSlide(1)} aria-label="Nächste Technologie">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function languageServicesCaseStudy(item, language) {
  const slug = item?.slug || portfolioSlugFor(item);
  if (slug !== "sprachdienstleistungen") return item;

  if (language === "ru") {
    return {
      ...item,
      title: "Языковой сервис DE ↔ RU",
      text: "Многоязычная веб-платформа с учебными модулями DeutschLive и Vokabelbox: диалоги, упражнения, тесты и локальные аудиозаписи.",
      status: "Портфолио-кейс",
      href: "/deutschlive/",
      liveUrl: "",
      localHref: "",
      cta: "Попробовать проект",
      showPrimaryAction: true,
      showContactCta: false,
    };
  }

  const image = item.images?.[0];
  return {
    ...item,
    title: "Sprachservice DE ↔ RU",
    text: "Mehrsprachige Webplattform mit Nutzerbereich und den Lernmodulen DeutschLive und Vokabelbox: Dialoge, Übungen, Quiz und lokal gespeicherte Aufnahmen.",
    status: "Portfolio-Fallstudie",
    href: "/deutschlive/",
    liveUrl: "",
    localHref: "",
    cta: "Projekt ausprobieren",
    showPrimaryAction: true,
    showContactCta: false,
    trustSignals: [],
    images: image ? [{ ...image, label: "Desktop" }] : item.images,
    situation: [
      "Als Projekt entstand eine zentrale digitale Plattform, die Informationen, Kontaktwege und interne Abläufe an einem Ort zusammenführt.",
      "Besonderer Fokus lag dabei auf einer mehrsprachigen Darstellung sowie klar getrennten öffentlichen und geschützten Bereichen.",
    ],
    implementation: "Die Django-Webplattform bündelt Nutzerkonten, Profile, Vokabelbox und DeutschLive. Der integrierte DeutschLive-Lernbereich bietet Dialoge, Übungen, Quiz und einen Audioplayer für eigene, ausschließlich lokal im Browser gespeicherte Aufnahmen.",
    implementationFeatures: [
      "Benutzerregistrierung und Login",
      "Integrierte Vokabelbox mit Artikel-Quiz und Favoriten",
      "DeutschLive mit Dialogen, Übungen und gemeinsamem Plattformkonto",
      "Eigene Aufnahmen lokal speichern, abspielen und herunterladen",
      "Persönlicher Profilbereich",
      "Bewerbungs- und Kontaktformulare",
      "Verwaltung eingehender Anfragen",
      "Geschützte Nutzerbereiche",
      "Mehrsprachige Inhalte und Lokalisierung",
      "Strukturierte Verwaltung über den internen Bereich",
    ],
    result: [
      "Entstanden ist eine moderne und zentral organisierte Webplattform, die öffentliche Informationen mit individuellen Nutzerbereichen und internen Verwaltungsprozessen verbindet.",
      "Die Fallstudie dokumentiert die technische Umsetzung; Sprachdienstleistungen werden darüber nicht mehr angeboten oder gebucht.",
    ],
    features: [
      { title: "Django", text: "Leistungsfähiges Webframework für die individuelle Plattform." },
      { title: "Vokabelbox", text: "Deutsch lernen mit Wortsuche, Artikelfilter, Favoriten und Quiz. Der Lernstand bleibt im jeweiligen Browser erhalten." },
      { title: "DeutschLive", text: "Dialoge, Übungen und Quiz mit dem Plattformkonto. Eigene Aufnahmen bleiben im lokalen Audioplayer auf dem Gerät." },
      { title: "Benutzerkonten", text: "Registrierung, Anmeldung und persönliche Bereiche." },
      { title: "Profilbereich", text: "Individuelle Nutzerinformationen zentral verwaltet." },
      { title: "Kontakt & Bewerbungen", text: "Strukturierte Erfassung von Anfragen." },
      { title: "Mehrsprachigkeit", text: "Inhalte für unterschiedliche Sprachgruppen." },
      { title: "Geschützte Bereiche", text: "Zugriff auf relevante Inhalte nur für angemeldete Nutzer." },
    ],
    proofLabel: "Technologie",
    tags: projectTechnologyTags(item),
    note: "",
    closingTitle: "Technische Fallstudie",
    closingText: "Das Projekt verbindet Django-Architektur, Mehrsprachigkeit, geschützte Nutzerbereiche und ein integriertes Vokabeltraining.",
  };
}

function PortfolioProjectPage({ item, t, language, onNavigate }) {
  item = languageServicesCaseStudy(item, language);
  const previewImage = projectPreviewImage(item);
  const hasCover = previewImage?.variant === "cover";
  const projectSlug = portfolioSlugFor(item);
  const isCase = (item.category || "demo") === "case";
  const fallbackActionLabel = t(isCase ? "home.portfolio.caseStudyCta" : "home.portfolio.referenceCta");
  const closingActionLabel = item.contactCta || fallbackActionLabel;
  const contactPath = `/kontakt?project=${encodeURIComponent(item.title)}${isCase ? "&topic=feature" : ""}`;
  const actionHref = projectActionHref(item) || contactPath;
  const actionLabel = actionHref === contactPath ? (item.cta || fallbackActionLabel) : t("home.portfolio.projectCta");
  const isExternalAction = isExternalUrl(actionHref);
  const githubHref = item.githubHref || item.githubUrl || "";
  const handlePrimaryAction = (event) => {
    if (actionHref !== contactPath) {
      return;
    }
    event.preventDefault();
    onNavigate(contactPath);
  };

  return (
    <>
      <section className={`portfolio-project-hero portfolio-project-hero--${projectSlug} mx-auto max-w-7xl px-3 sm:px-8 lg:px-10`}>
        <a
          href="/projekte/"
          className="portfolio-project-back"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/projekte");
          }}
        >
          {language === "ru" ? "Назад к проектам" : "Zurück zu Projekten"}
        </a>
        <div className="portfolio-project-hero__grid">
          <div className="portfolio-project-hero__copy">
            <h1>{item.title}</h1>
            <p>{item.text}</p>
            <div className="portfolio-card__meta">
              <span className="portfolio-card__type">{item.type}</span>
              {item.status ? <span className="portfolio-card__status">{item.status}</span> : null}
              {(item.trustSignals || []).map((signal) => (
                <span key={signal} className="portfolio-card__trust portfolio-card__trust--reference">{signal}</span>
              ))}
            </div>
            {item.showPrimaryAction !== false ? (
              <a
                href={actionHref}
                className="portfolio-contact-button"
                target={isExternalAction ? "_blank" : undefined}
                rel={isExternalAction ? "noopener noreferrer" : undefined}
                onClick={handlePrimaryAction}
              >
                {actionLabel}
              </a>
            ) : null}
            {githubHref ? (
              <a
                href={githubHref}
                className="project-overview-card__secondary-button portfolio-project-github-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubIcon className="h-4 w-4" aria-hidden="true" />
                GitHub
              </a>
            ) : null}
            {projectSlug === "sprachdienstleistungen" ? (
              <a id="deutschlive" href="/deutschlive/"
                className="project-overview-card__secondary-button" target="_blank" rel="noopener noreferrer">
                {language === "ru" ? "Открыть DeutschLive" : language === "uk" ? "Відкрити DeutschLive" : "DeutschLive öffnen"}
              </a>
            ) : null}
            {projectSlug === "sprachdienstleistungen" ? (
              <a
                id="vokabelbox"
                href="/static/portfolio/vokabelbox-main/index.html"
                className="project-overview-card__secondary-button"
                target="_blank"
                rel="noopener noreferrer"
              >
                {language === "ru" ? "Открыть Vokabelbox" : language === "uk" ? "Відкрити Vokabelbox" : "Vokabelbox öffnen"}
              </a>
            ) : null}
            {projectSlug === "enbt-botanic" ? (
              <a
                id="wetter"
                href={publicPageUrl("/botanic/wetter/")}
                className="project-overview-card__secondary-button"
              >
                {language === "ru" ? "Открыть погоду" : language === "uk" ? "Відкрити погоду" : "Wetter öffnen"}
              </a>
            ) : null}
            {projectSlug === "sprachdienstleistungen" ? (
              <a id="musikplayer" href="/deutschlive/recordings"
                className="project-overview-card__secondary-button" target="_blank" rel="noopener noreferrer">
                {language === "ru" ? "Мои записи" : language === "uk" ? "Мої записи" : "Meine Aufnahmen öffnen"}
              </a>
            ) : null}
          </div>
          {previewImage ? (
            <figure className={`portfolio-project-hero__preview ${hasCover ? "portfolio-project-hero__cover" : "portfolio-card__desktop-preview"}`}>
              <PortfolioImage
                image={previewImage}
                title={item.title}
                loading="eager"
                fetchPriority="high"
                width={1440}
                height={1000}
              />
              {!hasCover ? <figcaption>{previewImage.label}</figcaption> : null}
            </figure>
          ) : (
            <div className="portfolio-card__preview portfolio-project-hero__preview" aria-hidden="true">
              <div className="portfolio-card__browser-bar"><span /><span /><span /></div>
              <div className="portfolio-card__mockup">
                <strong>{item.title}</strong>
                <span>{item.type}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="projektdetails" className="portfolio-project-page mx-auto max-w-7xl scroll-mt-24 px-3 pb-16 sm:px-8 lg:px-10">
        <div className="portfolio-card__details-grid">
          <article className="portfolio-card__situation">
            <span>{t("home.portfolio.situationLabel")}</span>
            {paragraphList(item.situation).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </article>
          <article className="portfolio-card__implementation">
            <span>{t("home.portfolio.implementationLabel")}</span>
            {paragraphList(item.implementation || item.text).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {item.implementationFeatures?.length ? (
              <ul className="portfolio-project-checklist">
                {item.implementationFeatures.map((feature) => (
                  <li key={feature}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
          <article className="portfolio-card__result">
            <span>{t("home.portfolio.resultLabel")}</span>
            {paragraphList(item.result).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </article>
        </div>
        {item.features?.length ? (
          <section className="portfolio-card__features" aria-label={t("home.portfolio.featuresLabel")}>
            <strong className="portfolio-card__features-title">{t("home.portfolio.featuresLabel")}</strong>
            <PortfolioFeatureList items={item.features} />
          </section>
        ) : null}
        <section className="portfolio-card__proof" aria-label={t("home.portfolio.proofLabel")}>
          <strong className="portfolio-card__proof-title">{item.proofLabel || t("home.portfolio.proofLabel")}</strong>
          {(item.tags || []).map((tag) => <span key={tag}>{tag}</span>)}
        </section>
        {item.note ? <p className="portfolio-project-note">{item.note}</p> : null}
        {item.closingTitle || item.closingText ? (
          <section className="portfolio-project-closing" aria-label={item.closingTitle || closingActionLabel}>
            {item.closingTitle ? <h2>{item.closingTitle}</h2> : null}
            {item.closingText ? <p>{item.closingText}</p> : null}
            {item.showContactCta !== false ? (
              <a
                href={contactPath}
                className="portfolio-contact-button"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(contactPath);
                }}
              >
                {closingActionLabel}
              </a>
            ) : null}
          </section>
        ) : null}
      </section>
    </>
  );
}

function ProjectsOverviewPage({ items, language, onNavigate }) {
  const copy = {
    de: {
      title: "Projekte",
      intro: "Entdecken Sie weitere Webprojekte, Anwendungen, Tools und Softwarelösungen. Viele Projekte können direkt angesehen oder ausprobiert werden.",
      details: "Details ansehen",
      live: "Anschauen",
      github: "GitHub",
      technologies: "Technologien",
      empty: "Aktuell sind keine veröffentlichten Projekte vorhanden.",
    },
    ru: {
      title: "Проекты",
      intro: "Посмотрите другие web-проекты, приложения, инструменты и программные решения. Многие проекты можно открыть или сразу попробовать.",
      details: "Подробнее",
      live: "Открыть live",
      github: "GitHub",
      technologies: "Технологии",
      empty: "Пока нет опубликованных проектов.",
    },
  }[language] || {
    title: "Projekte",
    intro: "Entdecken Sie weitere Webprojekte, Anwendungen, Tools und Softwarelösungen. Viele Projekte können direkt angesehen oder ausprobiert werden.",
    details: "Details ansehen",
    live: "Anschauen",
    github: "GitHub",
    technologies: "Technologien",
    empty: "Aktuell sind keine veröffentlichten Projekte vorhanden.",
  };
  const projects = React.useMemo(() => sortedPortfolioItems(items), [items]);

  return (
    <>
      <PageHero title={copy.title} intro={copy.intro} />

      <section className="project-overview mx-auto max-w-7xl px-3 pb-16 sm:px-8 lg:px-10">
        {projects.length ? (
          <div className="project-grid">
            {projects.map((item, index) => {
              const thumbnail = projectPreviewImage(item);
              const detailPath = portfolioProjectPath(item);
              const liveHref = projectLiveHref(item);
              const liveIsExternal = isExternalUrl(liveHref);
              const githubHref = item.githubHref || item.githubUrl || "";
              const technologies = projectTechnologyTags(item);
              return (
                <article className={`project-overview-card project-overview-card--${portfolioSlugFor(item)}`} key={item.title}>
                  {thumbnail ? (
                    <a
                      href={detailPath}
                      className={`project-overview-card__media${thumbnail.variant === "cover" ? " project-overview-card__media--cover" : ""}`}
                      onClick={(event) => {
                        event.preventDefault();
                        onNavigate(detailPath);
                      }}
                    >
                      <PortfolioImage
                        image={thumbnail}
                        title={item.title}
                        loading={index < 3 ? "eager" : "lazy"}
                      />
                    </a>
                  ) : null}
                  <div className="project-overview-card__body">
                    <div className="project-overview-card__meta">
                      <span>{item.type}</span>
                      {item.status ? <span>{item.status}</span> : null}
                    </div>
                    <h2>
                      <TechnicalLabel language={language}>{item.title}</TechnicalLabel>
                    </h2>
                    <p>{item.text}</p>
                    <TechnologyTags technologies={technologies} className="project-overview-card__tags" label={copy.technologies} />
                    <div className="project-overview-card__actions">
                      <a
                        href={detailPath}
                        className="project-overview-card__button"
                        onClick={(event) => {
                          event.preventDefault();
                          onNavigate(detailPath);
                        }}
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        {copy.details}
                      </a>
                      {liveHref ? (
                        <a
                          href={liveHref}
                          className="project-overview-card__secondary-button"
                          target={liveIsExternal ? "_blank" : undefined}
                          rel={liveIsExternal ? "noopener noreferrer" : undefined}
                        >
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          {copy.live}
                        </a>
                      ) : null}
                      {githubHref ? (
                        <a
                          href={githubHref}
                          className="project-overview-card__secondary-button"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <GitHubIcon className="h-4 w-4" aria-hidden="true" />
                          {copy.github}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="project-overview__empty">{copy.empty}</p>
        )}
      </section>
    </>
  );
}

function FaqPageContent({ t, language, onNavigate }) {
  const faqs = t("home.faq.items");
  const [openIndex, setOpenIndex] = React.useState(0);
  const ctaLabel = language === "ru" ? "Задать вопрос" : "Eigene Frage stellen";
  const faqHighlights = language === "ru"
    ? [
        { icon: HelpCircle, label: `${faqs.length} Fragen`, text: "kompakt beantwortet" },
        { icon: ShieldCheck, label: "Unverbindlich", text: "Anfrage ohne Auftragspflicht" },
        { icon: MessageSquare, label: "Direkt fragen", text: "wenn etwas offen bleibt" },
      ]
    : [
        { icon: HelpCircle, label: `${faqs.length} Fragen`, text: "kompakt beantwortet" },
        { icon: ShieldCheck, label: "Unverbindlich", text: "Anfrage ohne Auftragspflicht" },
        { icon: MessageSquare, label: "Direkt fragen", text: "wenn etwas offen bleibt" },
      ];

  return (
    <>
      <section className="faq-hero-grid mx-auto max-w-7xl px-3 text-base leading-8 text-stone-700 sm:px-8 sm:text-lg lg:px-10">
        <div className="faq-hero-copy">
          <p className="faq-hero__eyebrow">FAQ</p>
          <h1>{t("home.faq.title")}</h1>
          <p>{t("home.faq.intro")}</p>
        </div>
        <aside className="faq-page-aside faq-page-aside--hero" aria-label={language === "ru" ? "Краткая информация" : "Kurzinfo"}>
          <div className="faq-page-aside__facts">
            {faqHighlights.map(({ icon: Icon, label, text }) => (
              <span key={label}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>
                  <strong>{label}</strong>
                  <small>{text}</small>
                </span>
              </span>
            ))}
          </div>
          <a href="/kontakt" className="portfolio-contact-button faq-page-aside__button" onClick={(event) => {
            event.preventDefault();
            onNavigate("/kontakt");
          }}>
            {ctaLabel}
          </a>
        </aside>
      </section>

      <section className="faq-section faq-page-section border-y border-stone-200 bg-white py-10 sm:py-16">
        <div className="faq-page-grid mx-auto grid max-w-7xl gap-6 px-3 sm:gap-8 sm:px-8 lg:px-10">
          <div className="faq-list">
            {faqs.map((item, index) => {
              const isOpen = openIndex === index;
              const buttonId = `faq-button-${index}`;
              const panelId = `faq-panel-${index}`;
              return (
                <article key={item.question} className="faq-item">
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  >
                    <HelpCircle className="h-5 w-5" aria-hidden="true" />
                    <span>{item.question}</span>
                  </button>
                  <div id={panelId} className="faq-answer" aria-labelledby={buttonId} hidden={!isOpen}>
                    {item.answer}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

function StandalonePage({ routeKey, projectSlug, t, language, onNavigate }) {
  useScrollReveal();
  const services = t("home.services.items");
  const shouldFetchPortfolio = routeKey === "projects" || routeKey === "portfolioProject";
  const { items: portfolioItems } = usePortfolioProjects(t, { fetchRemote: shouldFetchPortfolio });
  const aboutParagraphs = t("home.about.paragraphs");

  if (routeKey === "portfolioProject") {
    const item = portfolioItems.find((portfolioItem) => portfolioSlugFor(portfolioItem) === projectSlug);
    if (!item) {
      return (
        <>
          <PageHero eyebrow="404" title="Projekt nicht gefunden" intro="Diese Referenz wurde nicht gefunden." />
          <UnderConstructionNote t={t} onNavigate={onNavigate} />
        </>
      );
    }
    return <PortfolioProjectPage item={item} t={t} language={language} onNavigate={onNavigate} />;
  }

  if (routeKey === "projects") {
    return <ProjectsOverviewPage items={portfolioItems} language={language} onNavigate={onNavigate} />;
  }

  if (routeKey === "services") {
    const serviceSectionIds = {
      LayoutTemplate: "webseiten-verbessern",
      Bug: "fehlerbehebung",
      Workflow: "webfunktionen",
      Globe2: "uebersetzungen",
    };
    const serviceExampleIcons = {
      LayoutTemplate: ["LayoutTemplate", "LayoutTemplate", "PencilLine"],
      Bug: ["MessageSquare", "Image", "Cpu"],
      Workflow: ["MessageSquare", "ShieldCheck", "Settings"],
      Globe2: ["Globe2", "PencilLine", "Globe2"],
    };
    const serviceExamples = {
      de: {
        LayoutTemplate: ["Startseite neu ordnen", "mobile Ansicht verbessern", "Texte und Bilder sauber strukturieren"],
        Bug: ["Formularfehler beheben", "Darstellungsfehler prüfen", "Ladeprobleme eingrenzen"],
        Workflow: ["Anfrageformular erweitern", "kleinen Kundenbereich planen", "interne Verwaltung vereinfachen"],
        Globe2: ["Webseiten-Texte DE/RU", "UI-Texte für Formulare", "Software-Hinweise verständlich übertragen"],
      },
      ru: {
        LayoutTemplate: ["упорядочить главную страницу", "улучшить мобильный вид", "структурировать тексты и изображения"],
        Bug: ["исправить ошибки форм", "проверить ошибки отображения", "найти причины медленной загрузки"],
        Workflow: ["расширить форму заявки", "спланировать небольшой клиентский раздел", "упростить внутреннюю обработку"],
        Globe2: ["тексты сайта DE/RU", "тексты интерфейса для форм", "понятно адаптировать подсказки программы"],
      },
    }[language] || {};
    const techPoints = t("home.tech.points");
    const techDetails = t("home.tech.pointDetails");
    return (
      <>
        <PageHero title={t("home.services.title")} intro={t("home.services.intro")} />
        <section className="service-overview-grid mx-auto grid max-w-7xl gap-4 px-3 pb-12 sm:px-8 lg:grid-cols-2 lg:px-10">
          {services.map((service) => {
            return (
              <article
                key={service.title}
                id={serviceSectionIds[service.icon] || service.icon.toLowerCase()}
                className="service-card reveal-card"
                style={{ border: 0, borderTop: 0, borderRadius: 0, background: "transparent", boxShadow: "none" }}
              >
              <div className="service-overview-card__heading">
                <CardIllustration name={service.icon} className="service-overview-card__illustration" />
                <h2 className="text-2xl font-bold">{service.title}</h2>
              </div>
              <dl className="service-card__path mt-5">
                <div><dt>{t("home.services.cardLabels.problem")}</dt><dd>{service.problem}</dd></div>
                <div><dt>{t("home.services.cardLabels.solution")}</dt><dd>{service.solution}</dd></div>
                <div><dt>{t("home.services.cardLabels.benefit")}</dt><dd>{service.benefit}</dd></div>
              </dl>
              <div className="portfolio-card__features mt-5" aria-label="Beispiele">
                <strong className="portfolio-card__features-title">{language === "ru" ? "Примеры" : "Beispiele"}</strong>
                <PortfolioFeatureList items={serviceExamples[service.icon] || []} illustrations={serviceExampleIcons[service.icon]} />
              </div>
            </article>
            );
          })}
        </section>
        <section className="mx-auto max-w-7xl px-3 pb-16 sm:px-8 lg:px-10" style={{ paddingTop: 0 }} {...revealProps("up", 0, 720, "1rem")}>
          <div className="site-info-panel rounded-xl p-5 shadow-sm sm:p-7">
            <h2 className="home-section-title font-display text-3xl leading-tight sm:text-4xl">{t("home.tech.title")}</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-stone-700 sm:text-lg">{t("home.tech.intro")}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {techPoints.map((point, index) => (
                <article key={point} className="site-info-panel__card rounded-lg p-4">
                  <h3 className="font-bold text-stone-950">{point}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{techDetails[index]}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  if (routeKey === "about") {
    const aboutContent = {
      de: {
        intro: [
          "Ich bin Eugen Beirit und entwickle Webanwendungen, Softwareprojekte und digitale Werkzeuge.",
          "Dieses Portfolio dokumentiert ausgewählte Projekte, technische Entscheidungen und die dabei gewonnenen Erfahrungen.",
        ],
        backgroundTitle: "Beruflicher und technischer Hintergrund",
        background: [
          "Meine Grundlage im IT-Bereich ist eine Weiterbildung zum Full-Stack-Webentwickler. Ich arbeite unter anderem mit React, JavaScript, Python und Django und erweitere meine Kenntnisse kontinuierlich, insbesondere in der Python- und Django-Entwicklung.",
          "Mein Schwerpunkt liegt auf React, JavaScript, Python und Django sowie auf technisch nachvollziehbaren Fullstack-Lösungen.",
        ],
        workflowTitle: "Arbeitsweise",
        workflow: [
          "Im Mittelpunkt stehen verständliche Absprachen, direkte Kommunikation und eine zuverlässige Umsetzung.",
          "Bei technischen Projekten lege ich Wert auf nachvollziehbare, wartbare und bedarfsgerechte Lösungen. Statt unnötig komplizierter Funktionen soll eine Lösung das konkrete Problem zuverlässig lösen.",
        ],
        techStack: ["Python", "Django", "React", "JavaScript", "PostgreSQL", "HTML", "CSS"],
        valuesTitle: "Werte und Vorteile",
        values: ["persönliche und direkte Kommunikation", "realistische Einschätzung von Aufwand und Möglichkeiten", "verständliche Absprachen", "wartbare technische Lösungen", "responsive Webentwicklung", "individuelle Web- und Softwarelösungen", "deutschlandweite Zusammenarbeit"],
        hobbyTitle: "Hobby",
        hobbyEyebrow: "Privat",
        hobbyVideoTitle: "Mein alter Freund",
        hobbyVideoText: "Ein persönlicher Einblick abseits der Projektarbeit.",
        cta: "Projekt oder Termin besprechen",
      },
      ru: {
        intro: "Я Евген Байрит и разрабатываю веб-приложения, программные проекты и цифровые инструменты.",
        backgroundTitle: "Профессиональный и технический фон",
        background: "Моя основа - обучение на full-stack web developer. В портфолио представлены проекты на React, JavaScript, Python и Django.",
        workflowTitle: "Формат работы",
        workflow: "В центре работы - понятные договоренности, поддерживаемые решения и прямое общение без лишних технических терминов.",
        techStack: ["Python", "Django", "React", "JavaScript", "PostgreSQL", "HTML", "CSS"],
        valuesTitle: "Ценности и преимущества",
        values: ["прямая коммуникация", "реалистичная оценка", "поддерживаемая реализация", "адаптация под устройства", "онлайн-сотрудничество по Германии", "немецкий/русский/украинский для сайтов и software-текстов"],
        hobbyTitle: "Хобби",
        hobbyEyebrow: "Личное",
        hobbyVideoTitle: "Мой старый друг",
        hobbyVideoText: "Небольшой личный фрагмент вне проектной работы.",
        cta: "Обсудить проект",
      },
    }[language];
    const renderParagraphs = (content) => (
      Array.isArray(content)
        ? content.map((paragraph) => <p key={paragraph} className="mt-3">{paragraph}</p>)
        : <p className="mt-3">{content}</p>
    );
    const techStack = [...new Set([
      ...(aboutContent.techStack || t("home.tech.stack").map((item) => item.label)),
      ...Object.keys(technologyLogos),
    ])];
    const profilePanel = (
      <aside className="about-profile-panel" aria-label={t("nav.about")}>
        <div className="about-photo-card">
          <div className="about-photo-card__placeholder">
            <div className="about-hero-copy">
              <p className="about-hero__eyebrow">{t("nav.about")}</p>
              <h1>{t("home.about.title")}</h1>
              {Array.isArray(aboutContent.intro)
                ? aboutContent.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                : <p>{aboutContent.intro}</p>}
            </div>
          </div>
          <picture className="about-photo-card__picture">
            <source
              type="image/webp"
              srcSet={aboutPortraitSrcSet}
              sizes="(min-width: 48rem) 22rem, min(100vw - 2rem, 22rem)"
            />
            <img
              src={aboutPortraitUrl}
              alt="Eugen Beirit"
              width="360"
              height="480"
              loading="eager"
              decoding="async"
              onError={(event) => {
                if (event.currentTarget.dataset.fallbackApplied === "true") return;
                event.currentTarget.dataset.fallbackApplied = "true";
                event.currentTarget.src = aboutPortraitFallbackUrl;
              }}
            />
          </picture>
          <div className="about-profile-panel__facts">
            <span><MonitorSmartphone className="h-5 w-5" aria-hidden="true" />Web & Software</span>
            <span><Code2 className="h-5 w-5" aria-hidden="true" />Webentwicklung</span>
            <span><Wrench className="h-5 w-5" aria-hidden="true" />Fehlerbehebung</span>
            <span><Globe2 className="h-5 w-5" aria-hidden="true" />Deutschlandweit</span>
          </div>
        </div>
      </aside>
    );

    return (
      <>
        <section className="about-hero-grid mx-auto max-w-7xl px-3 text-base leading-8 text-stone-700 sm:px-8 sm:text-lg lg:px-10">
          {profilePanel}
        </section>

        <section className="about-page-content mx-auto max-w-7xl px-3 pb-12 text-base leading-8 text-stone-700 sm:px-8 sm:text-lg lg:px-10">
          <div className="about-content-stack about-content-stack--wide">
            <article className="about-page-card about-page-card--lead">
              <h2>{aboutContent.backgroundTitle}</h2>
              {renderParagraphs(aboutContent.background)}
            </article>
            <article className="about-page-card">
              <h2>{aboutContent.workflowTitle}</h2>
              {renderParagraphs(aboutContent.workflow)}
            </article>
            {aboutContent.languageServicesTitle ? (
              <article className="about-page-card">
                <h2>{aboutContent.languageServicesTitle}</h2>
                {renderParagraphs(aboutContent.languageServices)}
                {aboutContent.languageServiceItems ? (
                  <ul className="about-language-service-list">
                    {aboutContent.languageServiceItems.map((item) => (
                      <li key={item}><CheckCircle2 className="h-5 w-5" aria-hidden="true" />{item}</li>
                    ))}
                  </ul>
                ) : null}
                {aboutContent.languageServiceNote ? (
                  <p className="about-language-service-note"><strong>{aboutContent.languageServiceNote}</strong></p>
                ) : null}
              </article>
            ) : null}
            <article className="about-page-card about-page-card--tech">
              <h2>{t("home.tech.stackAria")}</h2>
              <AboutTechCarousel items={techStack} />
            </article>
          </div>
        </section>
      </>
    );
  }

  if (routeKey === "contact") {
    const params = new URLSearchParams(window.location.search);
    const selectedProject = params.get("project") || "";
    const isDonationIntent = params.get("intent") === "donation";
    const donationSubject = language === "ru"
      ? "Добровольная поддержка / пожертвование"
      : "Freiwillige Unterstützung / Spende";
    const donationMessage = language === "ru"
      ? "Я хотел(а) бы добровольно поддержать проект. Пожалуйста, сообщите мне возможный способ."
      : "Ich möchte das Projekt freiwillig unterstützen. Bitte teilen Sie mir eine passende Möglichkeit mit.";
    const selectedSubject = isDonationIntent
      ? donationSubject
      : selectedProject
        ? `Frage zu ${selectedProject}`
        : "";
    return (
      <section className="contact-section contact-page-section contact-page-section--compact">
        <div className="contact-panel">
          <React.Suspense fallback={<div className="contact-form contact-form--loading contact-mobile-stage" aria-hidden="true" />}>
            <LazyContactForm
              language={language}
              selectedSubject={selectedSubject}
              initialMessage={isDonationIntent ? donationMessage : ""}
              t={t}
            />
            <LazyContactDetails language={language} />
          </React.Suspense>
        </div>
      </section>
    );
  }

  if (routeKey === "weather") {
    return <WeatherRedirect />;
  }

  return (
    <PageHero eyebrow="404" title="Seite nicht gefunden" intro="Diese Seite ist nicht vorhanden." />
  );
}

const PORTFOLIO_DRAG_LIMIT = 140;
const PORTFOLIO_DRAG_ACTIVATION_THRESHOLD = 8;
const PORTFOLIO_CLICK_RELEASE_DELAY = 120;
const PORTFOLIO_TOUCH_AXIS_THRESHOLD = 6;
const PORTFOLIO_TOUCH_SWIPE_THRESHOLD = 42;
const PORTFOLIO_START_SLUG = "online-shop";
const PORTFOLIO_VISIBLE_RANGE = 2;

function clampPortfolioIndex(index, itemCount) {
  if (!itemCount) return 0;
  return Math.max(0, Math.min(index, itemCount - 1));
}

function clampPortfolioDragOffset(offset) {
  return Math.max(-PORTFOLIO_DRAG_LIMIT, Math.min(PORTFOLIO_DRAG_LIMIT, offset));
}

function findTouch(touchList, identifier) {
  return Array.from(touchList).find((touch) => touch.identifier === identifier);
}

function portfolioSlideLevel(index, activeIndex, itemCount) {
  if (!itemCount) return null;

  let offset = index - activeIndex;
  const halfCount = itemCount / 2;
  if (offset > halfCount) offset -= itemCount;
  if (offset < -halfCount) offset += itemCount;

  if (Math.abs(offset) > PORTFOLIO_VISIBLE_RANGE) return null;
  return -offset;
}

function usePortfolioCarousel(itemCount, initialIndex = 0) {
  const [activePortfolioIndex, setActivePortfolioIndex] = React.useState(() => (
    clampPortfolioIndex(initialIndex, itemCount)
  ));
  const [isPortfolioDragging, setIsPortfolioDragging] = React.useState(false);
  const activePortfolioIndexRef = React.useRef(activePortfolioIndex);
  const hasPortfolioInteractionRef = React.useRef(false);
  const portfolioDragStartRef = React.useRef(0);
  const portfolioDragOffsetRef = React.useRef(0);
  const portfolioDragFrameRef = React.useRef(null);
  const portfolioDragPointerRef = React.useRef(null);
  const portfolioTouchAxisRef = React.useRef(null);
  const portfolioTouchIdentifierRef = React.useRef(null);
  const portfolioTouchStartRef = React.useRef({ x: 0, y: 0 });
  const portfolioSuppressClickRef = React.useRef(false);
  const portfolioSettleTimerRef = React.useRef(null);
  const portfolioClickTimerRef = React.useRef(null);
  const portfolioTrackRef = React.useRef(null);

  const goToPortfolioSlide = React.useCallback((index) => {
    const targetIndex = clampPortfolioIndex(index, itemCount);
    hasPortfolioInteractionRef.current = true;
    activePortfolioIndexRef.current = targetIndex;
    setActivePortfolioIndex(targetIndex);
  }, [itemCount]);

  React.useEffect(() => {
    const targetIndex = clampPortfolioIndex(
      hasPortfolioInteractionRef.current ? activePortfolioIndexRef.current : initialIndex,
      itemCount,
    );
    activePortfolioIndexRef.current = targetIndex;
    setActivePortfolioIndex(targetIndex);
  }, [initialIndex, itemCount]);

  const movePortfolioSlide = React.useCallback((direction) => {
    if (!itemCount) return;
    const targetIndex = (
      activePortfolioIndexRef.current + direction + itemCount
    ) % itemCount;
    hasPortfolioInteractionRef.current = true;
    activePortfolioIndexRef.current = targetIndex;
    setActivePortfolioIndex(targetIndex);
  }, [itemCount]);

  React.useEffect(() => () => {
    if (portfolioDragFrameRef.current !== null) {
      window.cancelAnimationFrame(portfolioDragFrameRef.current);
    }
    clearTimeout(portfolioSettleTimerRef.current);
    clearTimeout(portfolioClickTimerRef.current);
  }, []);

  const paintPortfolioDragOffset = React.useCallback((offset) => {
    portfolioDragOffsetRef.current = offset;
    if (portfolioDragFrameRef.current !== null) return;

    portfolioDragFrameRef.current = window.requestAnimationFrame(() => {
      portfolioTrackRef.current?.style.setProperty(
        "--portfolio-drag-offset",
        `${portfolioDragOffsetRef.current}px`,
      );
      portfolioDragFrameRef.current = null;
    });
  }, []);

  const settlePortfolioDrag = React.useCallback(() => {
    portfolioDragOffsetRef.current = 0;
    clearTimeout(portfolioSettleTimerRef.current);
    portfolioSettleTimerRef.current = setTimeout(() => {
      portfolioTrackRef.current?.style.setProperty("--portfolio-drag-offset", "0px");
      portfolioSettleTimerRef.current = null;
    }, 0);
  }, []);

  const releasePortfolioClick = React.useCallback(() => {
    if (!portfolioSuppressClickRef.current) return;
    clearTimeout(portfolioClickTimerRef.current);
    portfolioClickTimerRef.current = setTimeout(() => {
      portfolioSuppressClickRef.current = false;
      portfolioClickTimerRef.current = null;
    }, PORTFOLIO_CLICK_RELEASE_DELAY);
  }, []);

  const completePortfolioGesture = React.useCallback((offset, swipeThreshold) => {
    setIsPortfolioDragging(false);
    if (Math.abs(offset) >= swipeThreshold) {
      movePortfolioSlide(offset < 0 ? 1 : -1);
    }
    settlePortfolioDrag();
    releasePortfolioClick();
  }, [movePortfolioSlide, releasePortfolioClick, settlePortfolioDrag]);

  const cancelPortfolioGesture = React.useCallback(() => {
    setIsPortfolioDragging(false);
    settlePortfolioDrag();
    releasePortfolioClick();
  }, [releasePortfolioClick, settlePortfolioDrag]);

  const finishPortfolioDrag = React.useCallback((event) => {
    if (portfolioDragPointerRef.current !== event.pointerId) return;
    const offset = portfolioDragOffsetRef.current;
    const viewportWidth = event.currentTarget.getBoundingClientRect().width;
    const threshold = Math.min(72, Math.max(40, viewportWidth * 0.08));
    portfolioDragPointerRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    completePortfolioGesture(offset, threshold);
  }, [completePortfolioGesture]);

  const handlePortfolioPointerDown = React.useCallback((event) => {
    if (event.pointerType === "touch") return;
    if (!event.isPrimary || event.button > 0) return;
    portfolioDragStartRef.current = event.clientX;
    portfolioDragPointerRef.current = event.pointerId;
    portfolioSuppressClickRef.current = false;
    setIsPortfolioDragging(true);
    paintPortfolioDragOffset(0);
  }, [paintPortfolioDragOffset]);

  const handlePortfolioPointerMove = React.useCallback((event) => {
    if (portfolioDragPointerRef.current !== event.pointerId) return;
    const offset = event.clientX - portfolioDragStartRef.current;
    if (Math.abs(offset) > PORTFOLIO_DRAG_ACTIVATION_THRESHOLD) {
      portfolioSuppressClickRef.current = true;
      if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
    }
    paintPortfolioDragOffset(clampPortfolioDragOffset(offset));
  }, [paintPortfolioDragOffset]);

  const handlePortfolioPointerCancel = React.useCallback((event) => {
    if (portfolioDragPointerRef.current !== event.pointerId) return;
    portfolioDragPointerRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cancelPortfolioGesture();
  }, [cancelPortfolioGesture]);

  const handlePortfolioTouchStart = React.useCallback((event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    portfolioTouchIdentifierRef.current = touch.identifier;
    portfolioTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    portfolioTouchAxisRef.current = null;
    portfolioSuppressClickRef.current = false;
    setIsPortfolioDragging(true);
    paintPortfolioDragOffset(0);
  }, [paintPortfolioDragOffset]);

  const handlePortfolioTouchMove = React.useCallback((event) => {
    const touchIdentifier = portfolioTouchIdentifierRef.current;
    if (touchIdentifier === null) return;
    const touch = findTouch(event.touches, touchIdentifier);
    if (!touch) return;

    const offsetX = touch.clientX - portfolioTouchStartRef.current.x;
    const offsetY = touch.clientY - portfolioTouchStartRef.current.y;
    if (portfolioTouchAxisRef.current === null) {
      if (Math.max(Math.abs(offsetX), Math.abs(offsetY)) < PORTFOLIO_TOUCH_AXIS_THRESHOLD) return;
      portfolioTouchAxisRef.current = Math.abs(offsetX) > Math.abs(offsetY) ? "x" : "y";
    }
    if (portfolioTouchAxisRef.current !== "x") {
      setIsPortfolioDragging(false);
      return;
    }

    event.preventDefault();
    if (Math.abs(offsetX) > PORTFOLIO_DRAG_ACTIVATION_THRESHOLD) {
      portfolioSuppressClickRef.current = true;
    }
    paintPortfolioDragOffset(clampPortfolioDragOffset(offsetX));
  }, [paintPortfolioDragOffset]);

  const finishPortfolioTouch = React.useCallback((event) => {
    const touchIdentifier = portfolioTouchIdentifierRef.current;
    if (touchIdentifier === null) return;
    if (!findTouch(event.changedTouches, touchIdentifier)) return;

    const offset = portfolioDragOffsetRef.current;
    const wasHorizontal = portfolioTouchAxisRef.current === "x";
    portfolioTouchIdentifierRef.current = null;
    portfolioTouchAxisRef.current = null;
    completePortfolioGesture(
      offset,
      wasHorizontal ? PORTFOLIO_TOUCH_SWIPE_THRESHOLD : Number.POSITIVE_INFINITY,
    );
  }, [completePortfolioGesture]);

  const cancelPortfolioTouch = React.useCallback(() => {
    if (portfolioTouchIdentifierRef.current === null) return;

    portfolioTouchIdentifierRef.current = null;
    portfolioTouchAxisRef.current = null;
    cancelPortfolioGesture();
  }, [cancelPortfolioGesture]);

  const handlePortfolioKeyDown = React.useCallback((event) => {
    if (event.target !== event.currentTarget || !itemCount) return;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      movePortfolioSlide(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      goToPortfolioSlide(event.key === "Home" ? 0 : itemCount - 1);
    }
  }, [goToPortfolioSlide, itemCount, movePortfolioSlide]);

  return {
    activePortfolioIndex,
    cancelPortfolioTouch,
    goToPortfolioSlide,
    handlePortfolioKeyDown,
    handlePortfolioPointerCancel,
    handlePortfolioPointerDown,
    handlePortfolioPointerMove,
    handlePortfolioTouchMove,
    handlePortfolioTouchStart,
    isPortfolioDragging,
    finishPortfolioDrag,
    finishPortfolioTouch,
    movePortfolioSlide,
    portfolioSuppressClickRef,
    portfolioTrackRef,
  };
}


function HomePortfolioSection({ t, language, homeOverviewCopy, onNavigate }) {
  const { featuredItems: homePortfolioItems } = usePortfolioProjects(t, {
    fetchRemote: true,
  });
  const portfolioStartIndex = React.useMemo(() => {
    const preferredIndex = homePortfolioItems.findIndex(
      (item) => portfolioSlugFor(item) === PORTFOLIO_START_SLUG,
    );
    return preferredIndex >= 0 ? preferredIndex : 0;
  }, [homePortfolioItems]);
  const {
    activePortfolioIndex,
    cancelPortfolioTouch,
    goToPortfolioSlide,
    handlePortfolioKeyDown,
    handlePortfolioPointerCancel,
    handlePortfolioPointerDown,
    handlePortfolioPointerMove,
    handlePortfolioTouchMove,
    handlePortfolioTouchStart,
    isPortfolioDragging,
    finishPortfolioDrag,
    finishPortfolioTouch,
    movePortfolioSlide,
    portfolioSuppressClickRef,
    portfolioTrackRef,
  } = usePortfolioCarousel(homePortfolioItems.length, portfolioStartIndex);

  usePortfolioStageHeight(portfolioTrackRef, homePortfolioItems);

  const activePortfolioItem = homePortfolioItems[activePortfolioIndex];
  const activePortfolioPosition = homePortfolioItems.length ? activePortfolioIndex + 1 : 0;
  const portfolioPosition = `${activePortfolioPosition} / ${homePortfolioItems.length}`;
  const portfolioStatus = language === "ru"
    ? `${activePortfolioItem?.title || "Проект"}, проект ${activePortfolioPosition} из ${homePortfolioItems.length}`
    : language === "uk"
      ? `${activePortfolioItem?.title || "Проєкт"}, проєкт ${activePortfolioPosition} з ${homePortfolioItems.length}`
      : `${activePortfolioItem?.title || "Projekt"}, Projekt ${activePortfolioPosition} von ${homePortfolioItems.length}`;

  return (
    <section id="referenzen" className="portfolio-section w-full max-w-none px-3 py-11 sm:px-8 sm:py-16 lg:px-10" {...revealProps("right", 0, 760, "1.25rem")}>
      <header className="portfolio-section__intro max-w-3xl" {...revealProps("up", 90, 760, "0.95rem")}>
        <h2 className="home-section-title mt-3 font-display text-3xl leading-tight sm:text-4xl">{t("home.portfolio.title")}</h2>
        <p className="mt-5 text-base leading-8 text-stone-700 sm:text-lg">
          {homeOverviewCopy.referencesIntro}
        </p>
      </header>
      <div className="portfolio-carousel mt-10" role="region" aria-roledescription="carousel" aria-label={language === "ru" ? "Выбранные проекты" : "Ausgewählte Referenzen"}>
        <div
          className={`portfolio-carousel__viewport${isPortfolioDragging ? " is-dragging" : ""}`}
          tabIndex={0}
          aria-label={language === "ru" ? "Используйте клавиши со стрелками для навигации по проектам" : "Projekte mit den Pfeiltasten wechseln"}
          onPointerDown={handlePortfolioPointerDown}
          onPointerMove={handlePortfolioPointerMove}
          onPointerUp={finishPortfolioDrag}
          onPointerCancel={handlePortfolioPointerCancel}
          onLostPointerCapture={handlePortfolioPointerCancel}
          onTouchStart={handlePortfolioTouchStart}
          onTouchMove={handlePortfolioTouchMove}
          onTouchEnd={finishPortfolioTouch}
          onTouchCancel={cancelPortfolioTouch}
          onKeyDown={handlePortfolioKeyDown}
        >
          <div ref={portfolioTrackRef} className="portfolio-carousel__track">
            {homePortfolioItems.map((item, index) => (
              <PortfolioProjectCard
                key={item.title}
                index={index}
                isActive={index === activePortfolioIndex}
                item={item}
                language={language}
                copy={t("home.portfolio.card")}
                liveHref={projectLiveHref(item)}
                level={portfolioSlideLevel(index, activePortfolioIndex, homePortfolioItems.length)}
                onNavigate={onNavigate}
                suppressClickRef={portfolioSuppressClickRef}
              />
            ))}
          </div>
        </div>
        <nav className="portfolio-carousel__controls" aria-label={language === "ru" ? "Навигация по проектам" : "Projektnavigation"}>
          <button
            type="button"
            className="portfolio-carousel__button"
            onClick={() => movePortfolioSlide(-1)}
            aria-label={language === "ru" ? "Предыдущий проект" : "Vorheriges Projekt"}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="portfolio-carousel__dots" role="group" aria-label={language === "ru" ? "Выбрать проект" : "Projekt auswählen"}>
            {homePortfolioItems.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={`portfolio-carousel__dot${index === activePortfolioIndex ? " is-active" : ""}`}
                aria-label={`${item.title} ${index + 1}`}
                aria-current={index === activePortfolioIndex ? "true" : undefined}
                aria-pressed={index === activePortfolioIndex}
                onClick={() => goToPortfolioSlide(index)}
              />
            ))}
          </div>
          <span className="portfolio-carousel__counter" aria-hidden="true">{portfolioPosition}</span>
          <button
            type="button"
            className="portfolio-carousel__button"
            onClick={() => movePortfolioSlide(1)}
            aria-label={language === "ru" ? "Следующий проект" : "Nächstes Projekt"}
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
        <p className="portfolio-carousel__status" aria-live="polite" aria-atomic="true">
          {portfolioStatus}
        </p>
        <footer className="portfolio-discover-panel">
          <a
            href="/projekte/"
            className="portfolio-contact-button portfolio-contact-button--projects"
            onClick={(event) => {
              event.preventDefault();
              onNavigate?.("/projekte");
            }}
          >
            <span className="portfolio-projects-cta__label">{homeOverviewCopy.referencesLink}</span>
            <span className="portfolio-projects-cta__arrows" aria-hidden="true">
              <svg viewBox="0 0 66 43" focusable="false">
                <path className="portfolio-projects-cta__arrow portfolio-projects-cta__arrow--one" d="M40.15 3.9 44 .14 65.7 21.5 44 42.86l-3.85-3.76L57 21.5 40.15 3.9Z" />
                <path className="portfolio-projects-cta__arrow portfolio-projects-cta__arrow--two" d="M20.15 3.9 24 .14 45.7 21.5 24 42.86l-3.85-3.76L37 21.5 20.15 3.9Z" />
                <path className="portfolio-projects-cta__arrow portfolio-projects-cta__arrow--three" d="M.15 3.9 4 .14 25.7 21.5 4 42.86.15 39.1 17 21.5.15 3.9Z" />
              </svg>
            </span>
          </a>
        </footer>
      </div>
    </section>
  );
}

function HomePage({ onNavigate }) {
  const { t, language } = useI18n();
  useScrollReveal();
  const [activeNavHref, setActiveNavHref] = React.useState(() => (
    window.location.hash === "#referenzen" ? "/#referenzen" : "/"
  ));
  const [showHomeSections, revealHomeSections] = useDeferredHomeSections();
  const services = t("home.services.items");
  const servicesTitle = t("home.services.title");
  const servicesTitleSegments = [servicesTitle];
  const homeOverviewCopy = {
    de: {
      learnMore: "Mehr",
      referencesIntro: "Ausgewählte Referenzen, Demos und Fallbeispiele zeigen Ausgangslage, Umsetzung und konkreten Nutzen.",
      referencesLink: "Mehr Projekte",
    },
    ru: {
      learnMore: "Еще",
      referencesIntro: "Выбранные проекты и demo показывают исходную задачу, реализацию и практическую пользу.",
      referencesLink: "Больше проектов",
    },
  }[language];
  const navigateFromHome = React.useCallback((nextPath) => {
    const pathText = String(nextPath || "");
    if (pathText.includes("#") && !pathText.endsWith("#top")) {
      revealHomeSections().finally(() => {
        setTimeout(() => onNavigate?.(nextPath), 0);
      });
      return;
    }
    onNavigate?.(nextPath);
  }, [onNavigate, revealHomeSections]);
  const navigateHomeHeader = React.useCallback((nextPath) => {
    setActiveNavHref(nextPath);
    navigateFromHome(nextPath);
  }, [navigateFromHome]);

  const handleAnchorNavigate = React.useCallback((event, href) => {
    if (!href?.startsWith("#") || href === "#top") return;
    event.preventDefault();
    revealHomeSections().finally(() => {
      setTimeout(() => scrollToHashTarget(href), 0);
    });
  }, [revealHomeSections]);

  React.useEffect(() => {
    const updateActiveHashNav = () => {
      setActiveNavHref(window.location.hash === "#referenzen" ? "/#referenzen" : "/");
    };

    updateActiveHashNav();
    window.addEventListener("hashchange", updateActiveHashNav);
    window.addEventListener("popstate", updateActiveHashNav);

    return () => {
      window.removeEventListener("hashchange", updateActiveHashNav);
      window.removeEventListener("popstate", updateActiveHashNav);
    };
  }, []);

  React.useEffect(() => {
    if (window.location.hash && window.location.hash !== "#top") {
      revealHomeSections().finally(() => {
        scrollToHashTarget(window.location.hash);
      });
      return;
    }

    scrollToHashTarget(window.location.hash);
  }, [revealHomeSections]);

  return (
    <div className="site-shell site-shell--home min-h-screen bg-[#f3f4f6] text-stone-950">
      <SiteHeader t={t} activePath={activeNavHref} onNavigate={navigateHomeHeader} portal />

      <main id="top" className="home-main">
        <React.Suspense fallback={<div className="hero-stage-fallback" aria-hidden="true" />}>
          <Hero t={t} onAnchorNavigate={handleAnchorNavigate} onRouteNavigate={navigateFromHome} />
        </React.Suspense>

        <ProblemsSection t={t} preview={!showHomeSections} />

        {showHomeSections ? (
          <>
        <section id="kompetenzen" className="home-services-section" {...revealProps("left", 0, 760, "1.25rem")}>
          <header className="home-services-heading" {...revealProps("up", 90, 760, "0.95rem")}>
            <h2 className="home-services-heading__title">
              {servicesTitleSegments.map((segment, index) => (
                <span className="home-services-heading__title-line" key={segment}>
                  {segment}
                  {index < servicesTitleSegments.length - 1 ? " " : ""}
                </span>
              ))}
            </h2>
            <p className="home-services-heading__intro">
              {t("home.services.intro")}
            </p>
          </header>
          <div className="service-card-grid">
            {services.filter(({ icon }) => icon !== "Globe2").map(({ icon, title, text, problem, solution, benefit, featured, essential }, index) => {
              const Icon = iconFor(icon);
              const servicePath = {
                LayoutTemplate: "/kompetenzen#webseiten-verbessern",
                Bug: "/kompetenzen#fehlerbehebung",
                Workflow: "/kompetenzen#webfunktionen",
              }[icon] || "/kompetenzen";
              return (
                <a
                  key={title}
                  href={servicePath}
                  className={`service-card reveal-card clickable-card${featured ? " service-card--featured" : ""}${essential ? " service-card--essential" : ""}`}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate?.(servicePath);
                  }}
                  aria-label={`${title} - ${homeOverviewCopy.learnMore}`}
                  {...revealProps("up", 150 + index * 70, 720, "0.9rem")}
                >
                <header className="service-card__heading">
                  <h3 className="text-xl font-bold leading-7">{title}</h3>
                  <span
                    className={`service-card__icon service-card__icon--${icon.toLowerCase()} flex h-11 w-11 items-center justify-center rounded-lg`}
                    aria-hidden="true"
                  >
                    <CardIllustration name={icon} fallback={Icon} />
                  </span>
                </header>
                <p className="mt-5 leading-7 text-stone-700">{benefit || solution || problem || text}</p>
              </a>
              );
            })}
          </div>
        </section>

        <HomePortfolioSection
          t={t}
          language={language}
          homeOverviewCopy={homeOverviewCopy}
          onNavigate={onNavigate}
        />

          </>
        ) : null}
      </main>

      {showHomeSections ? <PageFooter t={t} onNavigate={onNavigate} /> : null}
    </div>
  );
}

export default function App() {
  useDocumentStateClasses();
  const { t, language } = useI18n();
  const [path, setPath] = useBrowserPath();
  const projectSlug = path.startsWith("/projekte/")
    ? path.slice("/projekte/".length)
    : path.startsWith("/referenzen/")
      ? path.slice("/referenzen/".length)
      : "";
  const projectItem = projectSlug
    ? t("home.portfolio.items").find((item) => isProjectPublished(item) && portfolioSlugFor(item) === projectSlug)
    : null;
  const route = appRoutes[path] || (projectSlug
    ? {
        key: "portfolioProject",
        title: `${projectItem?.title || "Projekt"} | Projekte | Beirit Digital`,
        description: projectItem?.text || "Einzelnes Projekt von Beirit Digital mit Beschreibung, Technologien, Live-Demo und optionalem GitHub-Link.",
      }
    : null);
  useDocumentMeta(route || { title: "Seite nicht gefunden | Beirit Digital", description: "Diese Seite wurde nicht gefunden." });

  if (path === "/") {
    return <HomePage onNavigate={(nextPath) => navigateToAppPath(nextPath, setPath)} />;
  }

  const handleNavigate = (nextPath) => navigateToAppPath(nextPath, setPath);
  const activePath = projectItem || route?.key === "projects" ? "/#referenzen" : route ? path : "";

  return (
    <PageShell t={t} activePath={activePath} onNavigate={handleNavigate}>
      <StandalonePage routeKey={route?.key || "notFound"} projectSlug={projectSlug} t={t} language={language} onNavigate={handleNavigate} />
    </PageShell>
  );
}
