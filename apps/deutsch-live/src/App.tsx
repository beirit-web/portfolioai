import { Suspense, useEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent } from "react";
import type { AuthPanelProps } from "./components/AuthPanel";
import {
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogIn,
  Headphones,
  Menu,
  PenLine,
  Settings,
  X
} from "lucide-react";
import { fetchMe, updateSettings, type CurrentUser } from "./api";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { PageSkeleton } from "./components/UiPrimitives";
import { getLocale, isLocale, setLocale as persistLocale, subscribeLocale, type Locale, ui } from "./i18n";
import { usePlatformSession } from "./lib/usePlatformSession";
import {
  AuthPanel, BotTutor, Dashboard, DatenschutzPage, GradeCalculator, ImpressumPage,
  KontaktPage, LandingPage, ManualPage, NutzungsbedingungenPage, QuizMode,
  RecordingPlayer, SceneLearning, stripBase, withBase
} from "./routes";
import "./styles/shell.css";
import { notFoundCopy, routeMetadata, updateDocumentMetadata } from "./seo";

export default function App({ initialAccountPanel }: { initialAccountPanel?: ComponentType<AuthPanelProps> } = {}) {
  const AccountPanel = initialAccountPanel || AuthPanel;
  const [path, setPath] = useState(stripBase(location.pathname));
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const previousPathRef = useRef(path);
  const [locale, setLocaleState] = useState<Locale>(getLocale());
  usePlatformSession(user, setUser);

  useEffect(() => {
    fetchMe().then((response) => {
      setUser(response.user);
      const profileLocale = response.user?.settings.interfaceLanguage;
      if (isLocale(profileLocale)) {
        persistLocale(profileLocale);
        setLocaleState(profileLocale);
      }
    }).catch(() => setUser(null)).finally(() => setAccountLoaded(true));
  }, []);

  useEffect(() => subscribeLocale(setLocaleState), []);

  useEffect(() => {
    document.body.classList.toggle("scene-learning-page", path === "/learn");
    return () => document.body.classList.remove("scene-learning-page");
  }, [path]);

  useEffect(() => {
    const onPopState = () => setPath(stripBase(location.pathname));
    addEventListener("popstate", onPopState);
    return () => removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (previousPathRef.current === path) return;
    previousPathRef.current = path;
    setIsMenuOpen(false);
    const frame = requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [path]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    }
    document.body.classList.toggle("menu-open", isMenuOpen);
    const frame = isMenuOpen
      ? requestAnimationFrame(() => mobileMenuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus())
      : null;
    addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("menu-open");
      removeEventListener("keydown", onKeyDown);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const desktop = matchMedia("(min-width: 1024px)");
    const closeMenuOnDesktop = () => {
      if (!desktop.matches) return;
      if (mobileMenuRef.current?.contains(document.activeElement)) {
        document.querySelector<HTMLSelectElement>(".app-nav__desktop-menu select")?.focus();
      }
      setIsMenuOpen(false);
    };
    desktop.addEventListener("change", closeMenuOnDesktop);
    return () => desktop.removeEventListener("change", closeMenuOnDesktop);
  }, []);

  function navigate(nextPath: string) {
    history.pushState({}, "", withBase(nextPath));
    setPath(nextPath);
    setIsMenuOpen(false);
    if (nextPath === path) mainRef.current?.focus({ preventScroll: true });
    scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function navigateFromLink(event: MouseEvent<HTMLAnchorElement>, nextPath: string) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(nextPath);
  }

  function refreshDashboard() {
    setDashboardRefresh((value) => value + 1);
  }

  function changeLocale(nextLocale: Locale) {
    persistLocale(nextLocale);
    setLocaleState(nextLocale);
    setUser((currentUser) => currentUser
      ? { ...currentUser, settings: { ...currentUser.settings, interfaceLanguage: nextLocale } }
      : currentUser
    );
    if (user) {
      updateSettings({ interfaceLanguage: nextLocale }).catch(() => undefined);
    }
  }

  const navItems = [
    { path: "/", label: ui.nav.home, icon: Home },
    { path: "/learn", label: ui.nav.learnScenes, icon: BookOpen },
    { path: "/quiz", label: ui.nav.quiz, icon: ClipboardCheck },
    { path: "/grades", label: ui.nav.grades, icon: GraduationCap },
    { path: "/recordings", label: ui.nav.recordings, icon: Headphones },
    { path: "/writing", label: ui.nav.writing, icon: PenLine },
    { path: "/dashboard", label: ui.nav.dashboard, icon: LayoutDashboard },
    { path: "/manual", label: ui.nav.manual, icon: FileText },
    { path: "/settings", label: ui.nav.settings, icon: Settings }
  ] as const;

  const metadata = routeMetadata(path, locale);
  const routeTitle = navItems.find((item) => item.path === path)?.label ?? ({
    "/handbuch": ui.nav.manual,
    "/account": ui.nav.account,
    "/recordings/": ui.nav.recordings,
    "/recordings-archiv": ui.nav.recordings,
    "/impressum": "Impressum",
    "/datenschutz": "Datenschutz",
    "/nutzungsbedingungen": "Nutzungsbedingungen",
    "/kontakt": "Kontakt",
    "/feedback": "Feedback"
  } as Record<string, string>)[path] ?? metadata.heading;
  const isLandingPage = path === "/";
  const accessibility = {
    ru: { skip: "Перейти к содержимому", navigation: "Основная навигация", mobileNavigation: "Мобильная навигация" },
    de: { skip: "Zum Inhalt springen", navigation: "Hauptnavigation", mobileNavigation: "Mobile Hauptnavigation" },
    uk: { skip: "Перейти до вмісту", navigation: "Основна навігація", mobileNavigation: "Мобільна навігація" }
  }[locale];

  useEffect(() => {
    updateDocumentMetadata(path, locale);
  }, [path, locale]);

  const page = useMemo(() => {
    if (path === "/learn") return <SceneLearning onProgressSaved={refreshDashboard} user={user} />;
    if (path === "/quiz") return <QuizMode key={user?.id ?? "guest"} accountLoaded={accountLoaded} onAttemptSaved={refreshDashboard} user={user} />;
    if (path === "/grades") return <GradeCalculator />;
    if (["/recordings", "/recordings/", "/recordings-archiv"].includes(path)) return <>
      {path === "/recordings-archiv" && <section className="glass mb-6 rounded-2xl p-6">
        <p>{ui.platformAccount.moveRecordings}</p>
        <a className="underline" href="/deutschlive/recordings">{ui.platformAccount.back}</a>
      </section>}
      <RecordingPlayer user={user} accountLoaded={accountLoaded} />
    </>;
    if (path === "/writing") return <BotTutor user={user} />;
    if (path === "/dashboard") {
      return user ? (
        <Dashboard refreshToken={dashboardRefresh} user={user} onSettingsSaved={settings => setUser(current => current?.id === user.id ? { ...current, settings } : current)} />
      ) : (
        <AccountPanel user={user} onDashboardRefresh={refreshDashboard} onUserChange={setUser} />
      );
    }
    if (path === "/manual" || path === "/handbuch") return <ManualPage />;
    if (path === "/impressum") return <ImpressumPage />;
    if (path === "/datenschutz") return <DatenschutzPage />;
    if (path === "/nutzungsbedingungen") return <NutzungsbedingungenPage />;
    if (path === "/kontakt" || path === "/feedback") return <KontaktPage />;
    if (path === "/settings") {
      return user ? (
        <Dashboard refreshToken={dashboardRefresh} user={user} onSettingsSaved={settings => setUser(current => current?.id === user.id ? { ...current, settings } : current)} />
      ) : (
        <AccountPanel user={user} onDashboardRefresh={refreshDashboard} onUserChange={setUser} />
      );
    }
    if (path === "/account") {
      return <AccountPanel user={user} onDashboardRefresh={refreshDashboard} onUserChange={setUser} />;
    }
    if (path === "/") return <LandingPage navigate={navigate} />;
    const copy = notFoundCopy(locale);
    return <section className="glass rounded-3xl p-6 sm:p-8">
      <h2 className="text-3xl font-black">{copy.heading}</h2>
      <p className="mt-4 leading-relaxed">{copy.description}</p>
      <a className="mt-6 inline-flex min-h-11 items-center rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950"
        href={withBase("/")} onClick={(event) => navigateFromLink(event, "/")}>{copy.home}</a>
    </section>;
  }, [path, user, dashboardRefresh, locale, accountLoaded, AccountPanel]);

  return (
    <div className="app-shell">
      <a className="app-skip-link" href="#deutschlive-main">{accessibility.skip}</a>
      <header className="app-shell__header">
        <a
          className="app-project-link"
          href="/projekte/sprachdienstleistungen"
        >
          <Home aria-hidden="true" className="h-5 w-5 shrink-0" />
          {ui.common.projectHome}
        </a>
        <nav aria-label={accessibility.navigation} className="glass app-nav">
          <div className="app-nav__bar">
            <a className="app-nav__brand" href={withBase("/")} onClick={(event) => navigateFromLink(event, "/")}>
              <span aria-hidden="true" className="app-nav__brand-mark"><BookOpen /></span>
              <span className="app-nav__brand-title">
                {ui.common.appName}
              </span>
            </a>

            <label className="app-nav__desktop-menu">
              <Menu aria-hidden="true" />
              <span className="sr-only">{ui.common.openMenu}</span>
              <select
                aria-label={ui.common.openMenu}
                onChange={(event) => navigate(event.target.value)}
                value={path === "/handbuch" ? "/manual" : navItems.some((item) => item.path === path) ? path : "/"}
              >
                {navItems.map((item) => (
                  <option key={item.path} value={item.path}>{item.label}</option>
                ))}
              </select>
            </label>

            <div className="app-nav__actions">
              <a
                aria-label={import.meta.env.VITE_PLATFORM_INTEGRATION === "true" ? ui.platformAccount.back : ui.common.closeProject}
                className="app-nav__close-project"
                href={import.meta.env.VITE_PLATFORM_INTEGRATION === "true" ? "/" : "/projekte/sprachdienstleistungen"}
                title={import.meta.env.VITE_PLATFORM_INTEGRATION === "true" ? ui.platformAccount.back : ui.common.closeProject}
              >
                <X className="h-5 w-5" />
                <span className="hidden pl-2 text-sm font-bold xl:inline">{import.meta.env.VITE_PLATFORM_INTEGRATION === "true" ? ui.platformAccount.back : ui.common.closeProject}</span>
              </a>
              <button
                aria-controls="deutschlive-mobile-menu"
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? ui.common.closeMenu : ui.common.openMenu}
                className="app-nav__menu-button"
                onClick={() => setIsMenuOpen((value) => !value)}
                ref={menuToggleRef}
                type="button"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <LanguageSwitcher locale={locale} onLocaleChange={changeLocale} />
              <a
                className="app-nav__account-button hidden lg:inline-flex"
                href={withBase(user ? "/settings" : "/account")}
                onClick={(event) => navigateFromLink(event, user ? "/settings" : "/account")}
              >
                <LogIn aria-hidden="true" />
                <span>{user ? user.username : ui.common.login}</span>
              </a>
            </div>
          </div>
        </nav>
      </header>
      <div
        aria-hidden={!isMenuOpen}
        className={`mobile-menu-backdrop ${isMenuOpen ? "is-visible" : ""}`}
        hidden={!isMenuOpen}
        onClick={() => {
          setIsMenuOpen(false);
          menuToggleRef.current?.focus();
        }}
      />

      <nav
        aria-hidden={!isMenuOpen}
        aria-label={accessibility.mobileNavigation}
        className={`mobile-menu ${isMenuOpen ? "is-visible" : "is-hidden"}`}
        hidden={!isMenuOpen}
        id="deutschlive-mobile-menu"
        inert={!isMenuOpen}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== menuToggleRef.current) {
            setIsMenuOpen(false);
          }
        }}
        ref={mobileMenuRef}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = path === item.path || (item.path === "/manual" && path === "/handbuch");
          return (
            <a
              aria-current={isActive ? "page" : undefined}
              className={`nav-tab ${isActive ? "is-active" : ""}`}
              href={withBase(item.path)}
              key={item.path}
              onClick={(event) => navigateFromLink(event, item.path)}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          );
        })}
        <a
          className="app-nav__account-button"
          href={withBase(user ? "/settings" : "/account")}
          onClick={(event) => navigateFromLink(event, user ? "/settings" : "/account")}
        >
          <LogIn aria-hidden="true" />
          <span>{user ? user.username : ui.common.login}</span>
        </a>
      </nav>

      <main className="app-shell__content" id="deutschlive-main" ref={mainRef} tabIndex={-1}>
        {!isLandingPage && <h1 className="sr-only">{routeTitle}</h1>}
        <Suspense fallback={<PageFallback />}>
          {page}
        </Suspense>
      </main>

      <footer className="app-footer app-shell__footer site-footer">
        <div className="app-footer__brand">
          <p className="app-footer__product">{ui.common.appName}</p>
          <p className="app-footer__meta">© 2026 Beirit Digital · {ui.common.madeInGermany}</p>
        </div>
        <nav className="app-footer__links" aria-label={ui.common.legalAndProductPages}>
          {import.meta.env.VITE_PLATFORM_INTEGRATION === "true" && <>
            <a className="app-footer__link footer-link" href="/vokabelbox/">Vokabelbox</a>
            <a className="app-footer__link footer-link" href="/profil/">{ui.platformAccount.profile}</a>
            <a className="app-footer__link footer-link" href="/#projekt">{ui.platformAccount.back}</a>
          </>}
          <a className="app-footer__link footer-link" href={withBase("/impressum")} onClick={(event) => navigateFromLink(event, "/impressum")}>
            Impressum
          </a>
          <a className="app-footer__link footer-link" href={withBase("/datenschutz")} onClick={(event) => navigateFromLink(event, "/datenschutz")}>
            Datenschutz
          </a>
          <a className="app-footer__link footer-link" href={withBase("/nutzungsbedingungen")} onClick={(event) => navigateFromLink(event, "/nutzungsbedingungen")}>
            Nutzungsbedingungen
          </a>
          <a className="app-footer__link footer-link" href={withBase("/kontakt")} onClick={(event) => navigateFromLink(event, "/kontakt")}>
            Kontakt
          </a>
          <a className="app-footer__link footer-link" href={withBase("/")} onClick={(event) => navigateFromLink(event, "/")}>
            {ui.common.aboutProject}
          </a>
          <a className="app-footer__link footer-link" href={withBase("/manual")} onClick={(event) => navigateFromLink(event, "/manual")}>
            Handbuch
          </a>
          <a className="app-footer__link footer-link" href={withBase("/feedback")} onClick={(event) => navigateFromLink(event, "/feedback")}>
            Feedback
          </a>
        </nav>
      </footer>
    </div>
  );
}

function PageFallback() {
  return <PageSkeleton rows={6} />;
}
