import { lazy, Suspense, useEffect, useMemo, useState } from "react";
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
import LandingPage from "./components/LandingPage";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { PageSkeleton } from "./components/UiPrimitives";
import { getLocale, setLocale as persistLocale, subscribeLocale, type Locale, ui } from "./i18n";
import { usePlatformSession } from "./lib/usePlatformSession";

const AuthPanel = lazy(() => import.meta.env.VITE_PLATFORM_INTEGRATION === "true"
  ? import("./components/PlatformAccount")
  : import("./components/AuthPanel"));
const BotTutor = lazy(() => import("./components/BotTutor"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const GradeCalculator = lazy(() => import("./components/GradeCalculator"));
const RecordingPlayer = lazy(() => import("./components/RecordingPlayer"));
const ImpressumPage = lazy(() => import("./components/ImpressumPage"));
const ManualPage = lazy(() => import("./components/ManualPage"));
const QuizMode = lazy(() => import("./components/QuizMode"));
const SceneLearning = lazy(() => import("./components/SceneLearning"));
const DatenschutzPage = lazy(() => import("./components/LegalPages").then((module) => ({ default: module.DatenschutzPage })));
const KontaktPage = lazy(() => import("./components/LegalPages").then((module) => ({ default: module.KontaktPage })));
const NutzungsbedingungenPage = lazy(() => import("./components/LegalPages").then((module) => ({ default: module.NutzungsbedingungenPage })));

const APP_BASE = normalizeBase(import.meta.env.VITE_APP_BASE ?? "");

function normalizeBase(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function stripBase(pathname: string) {
  if (!APP_BASE) return pathname || "/";
  if (pathname === APP_BASE) return "/";
  if (pathname.startsWith(`${APP_BASE}/`)) return pathname.slice(APP_BASE.length) || "/";
  return pathname || "/";
}

function withBase(pathname: string) {
  if (!APP_BASE) return pathname;
  return pathname === "/" ? `${APP_BASE}/` : `${APP_BASE}${pathname}`;
}

export default function App() {
  const [path, setPath] = useState(stripBase(window.location.pathname));
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [locale, setLocaleState] = useState<Locale>(getLocale());
  usePlatformSession(user, setUser);

  useEffect(() => {
    fetchMe().then((response) => {
      setUser(response.user);
      const profileLocale = response.user?.settings.interfaceLanguage;
      if (profileLocale === "ru" || profileLocale === "de") {
        persistLocale(profileLocale);
        setLocaleState(profileLocale);
      }
    }).catch(() => setUser(null)).finally(() => setAccountLoaded(true));
  }, []);

  useEffect(() => subscribeLocale(setLocaleState), []);

  useEffect(() => {
    const onPopState = () => setPath(stripBase(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }
    document.body.classList.toggle("menu-open", isMenuOpen);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  function navigate(nextPath: string) {
    window.history.pushState({}, "", withBase(nextPath));
    setPath(nextPath);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      updateSettings({ ...user.settings, interfaceLanguage: nextLocale }).catch(() => undefined);
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

  const page = useMemo(() => {
    if (path === "/learn") return <SceneLearning onProgressSaved={refreshDashboard} user={user} />;
    if (path === "/quiz") return <QuizMode onAttemptSaved={refreshDashboard} user={user} />;
    if (path === "/grades") return <GradeCalculator />;
    if (["/recordings", "/recordings/", "/recordings-archiv"].includes(path)) return accountLoaded ? <>
      {path === "/recordings-archiv" && <section className="glass mb-6 rounded-2xl p-6">
        <p>{ui.platformAccount.moveRecordings}</p>
        <a className="underline" href="/deutschlive/recordings">{ui.platformAccount.back}</a>
      </section>}
      <RecordingPlayer user={user} />
    </> : <PageSkeleton />;
    if (path === "/writing") return <BotTutor user={user} />;
    if (path === "/dashboard") {
      return user ? (
        <Dashboard refreshToken={dashboardRefresh} user={user} />
      ) : (
        <AuthPanel user={user} onDashboardRefresh={refreshDashboard} onUserChange={setUser} />
      );
    }
    if (path === "/manual" || path === "/handbuch") return <ManualPage />;
    if (path === "/impressum") return <ImpressumPage />;
    if (path === "/datenschutz") return <DatenschutzPage />;
    if (path === "/nutzungsbedingungen") return <NutzungsbedingungenPage />;
    if (path === "/kontakt" || path === "/feedback") return <KontaktPage />;
    if (path === "/settings") {
      return user ? (
        <Dashboard refreshToken={dashboardRefresh} user={user} />
      ) : (
        <AuthPanel user={user} onDashboardRefresh={refreshDashboard} onUserChange={setUser} />
      );
    }
    if (path === "/account") {
      return <AuthPanel user={user} onDashboardRefresh={refreshDashboard} onUserChange={setUser} />;
    }
    return <LandingPage navigate={navigate} />;
  }, [path, user, dashboardRefresh, locale, accountLoaded]);

  return (
    <main className="app-shell">
      <a
        className="mb-3 inline-flex min-h-11 items-center gap-2 px-2 py-2 text-sm font-bold underline underline-offset-4"
        href="/projekte/sprachdienstleistungen"
      >
        <Home aria-hidden="true" className="h-5 w-5 shrink-0" />
        {ui.common.projectHome}
      </a>
      <nav className="glass app-nav">
          <div className="app-nav__bar">
            <button className="app-nav__brand" onClick={() => navigate("/")} type="button">
              <h1 className="break-words text-base font-bold leading-snug sm:text-xl">
                {ui.common.appName}
              </h1>
            </button>

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
              <div className="hidden items-center gap-2 lg:flex">
                <LanguageSwitcher locale={locale} onLocaleChange={changeLocale} />
              </div>
              <button
                className="app-nav__account-button hidden lg:inline-flex"
                onClick={() => navigate(user ? "/settings" : "/account")}
                type="button"
              >
                <LogIn aria-hidden="true" />
                <span>{user ? user.username : ui.common.login}</span>
              </button>
              <button
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? ui.common.closeMenu : ui.common.openMenu}
                className="app-nav__menu-button"
                onClick={() => setIsMenuOpen((value) => !value)}
                type="button"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
      </nav>

      <section className="app-shell__content">
        <div
          aria-hidden={!isMenuOpen}
          className={`mobile-menu-backdrop ${isMenuOpen ? "is-visible" : ""}`}
          onClick={() => setIsMenuOpen(false)}
        />

        <div
          className={`mobile-menu ${isMenuOpen ? "is-visible" : "is-hidden"}`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = path === item.path || (item.path === "/manual" && path === "/handbuch");
            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={`nav-tab ${isActive ? "is-active" : ""}`}
                key={item.path}
                onClick={() => navigate(item.path)}
                type="button"
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            className="app-nav__account-button"
            onClick={() => navigate(user ? "/settings" : "/account")}
            type="button"
          >
            <LogIn aria-hidden="true" />
            <span>{user ? user.username : ui.common.login}</span>
          </button>
          <LanguageSwitcher locale={locale} onLocaleChange={changeLocale} />
        </div>

        <Suspense fallback={<PageFallback />}>
          {page}
        </Suspense>

        <footer className="app-footer">
          <div className="app-footer__brand">
            <p className="app-footer__product">{ui.common.appName}</p>
            <p className="app-footer__meta">© 2026 Beirit Digital · {ui.common.madeInGermany}</p>
          </div>
          <nav className="app-footer__links" aria-label={ui.common.legalAndProductPages}>
            {import.meta.env.VITE_PLATFORM_INTEGRATION === "true" && <>
              <a className="app-footer__link" href="/vokabelbox/">Vokabelbox</a>
              <a className="app-footer__link" href="/profil/">{ui.platformAccount.profile}</a>
              <a className="app-footer__link" href="/#projekt">{ui.platformAccount.back}</a>
            </>}
            <button className="app-footer__link" onClick={() => navigate("/impressum")} type="button">
              Impressum
            </button>
            <button className="app-footer__link" onClick={() => navigate("/datenschutz")} type="button">
              Datenschutz
            </button>
            <button className="app-footer__link" onClick={() => navigate("/nutzungsbedingungen")} type="button">
              Nutzungsbedingungen
            </button>
            <button className="app-footer__link" onClick={() => navigate("/kontakt")} type="button">
              Kontakt
            </button>
            <button className="app-footer__link" onClick={() => navigate("/")} type="button">
              {ui.common.aboutProject}
            </button>
            <button className="app-footer__link" onClick={() => navigate("/manual")} type="button">
              Handbuch
            </button>
            <button className="app-footer__link" onClick={() => navigate("/feedback")} type="button">
              Feedback
            </button>
          </nav>
        </footer>
      </section>
    </main>
  );
}

function PageFallback() {
  return <PageSkeleton rows={6} />;
}
