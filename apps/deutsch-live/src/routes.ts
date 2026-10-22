import { createElement, lazy, useState, type ComponentType } from "react";
import type { AuthPanelProps } from "./components/AuthPanel";

function createPage<Props extends object>(importPage: () => Promise<{ default: ComponentType<Props> }>) {
  let loadedPage: ComponentType<Props> | undefined;
  let pendingPage: Promise<{ default: ComponentType<Props> }> | undefined;

  function preload() {
    pendingPage ??= importPage().then((module) => {
      loadedPage = module.default;
      return module;
    });
    return pendingPage;
  }

  const LazyPage = lazy(preload);

  function Page(props: Props) {
    // Keep the selected component type stable during a visit so a later parent
    // render cannot replace the lazy wrapper and reset an exercise or form.
    const [InitialPage] = useState(() => loadedPage);
    return InitialPage ? createElement(InitialPage, props) : createElement(LazyPage, props);
  }

  return Object.assign(Page, { preload });
}

export const AuthPanel = createPage<AuthPanelProps>(() => import.meta.env.VITE_PLATFORM_INTEGRATION === "true"
  ? import("./components/PlatformAccount")
  : import("./components/AuthPanel"));
export const LandingPage = createPage(() => import("./components/LandingPage"));
export const BotTutor = createPage(() => import("./components/BotTutor"));
export const Dashboard = createPage(() => import("./components/Dashboard"));
export const GradeCalculator = createPage(() => import("./components/GradeCalculator"));
export const RecordingPlayer = createPage(() => import("./components/RecordingPlayer"));
export const ImpressumPage = createPage(() => import("./components/ImpressumPage"));
export const ManualPage = createPage(() => import("./components/ManualPage"));
export const SceneLearning = createPage(() => import("./components/SceneLearning"));
export const QuizMode = createPage(() => import("./components/QuizMode"));
export const DatenschutzPage = createPage<Record<string, never>>(() => import("./components/LegalPages").then((module) => ({ default: module.DatenschutzPage })));
export const KontaktPage = createPage<Record<string, never>>(() => import("./components/LegalPages").then((module) => ({ default: module.KontaktPage })));
export const NutzungsbedingungenPage = createPage<Record<string, never>>(() => import("./components/LegalPages").then((module) => ({ default: module.NutzungsbedingungenPage })));

const APP_BASE = normalizeBase(import.meta.env.VITE_APP_BASE ?? "");

function normalizeBase(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function stripBase(pathname: string) {
  if (!APP_BASE) return pathname || "/";
  if (pathname === APP_BASE) return "/";
  if (pathname.startsWith(`${APP_BASE}/`)) return pathname.slice(APP_BASE.length) || "/";
  return pathname || "/";
}

export function withBase(pathname: string) {
  if (!APP_BASE) return pathname;
  return pathname === "/" ? `${APP_BASE}/` : `${APP_BASE}${pathname}`;
}

const preloadAccountDashboard = () => Promise.all([AuthPanel.preload(), Dashboard.preload()]);
const initialRoutes: Record<string, () => Promise<unknown>> = {
  "/learn": SceneLearning.preload,
  "/quiz": QuizMode.preload,
  "/grades": GradeCalculator.preload,
  "/recordings": RecordingPlayer.preload,
  "/recordings/": RecordingPlayer.preload,
  "/recordings-archiv": RecordingPlayer.preload,
  "/writing": BotTutor.preload,
  "/dashboard": preloadAccountDashboard,
  "/settings": preloadAccountDashboard,
  "/account": AuthPanel.preload,
  "/manual": ManualPage.preload,
  "/handbuch": ManualPage.preload,
  "/impressum": ImpressumPage.preload,
  "/datenschutz": DatenschutzPage.preload,
  "/nutzungsbedingungen": NutzungsbedingungenPage.preload,
  "/kontakt": KontaktPage.preload,
  "/feedback": KontaktPage.preload
};

export function preloadInitialRoute(pathname: string) {
  // Resolve the first page before mounting so a short skeleton and its footer
  // never become the initial layout. Other routes still load on navigation.
  return (initialRoutes[stripBase(pathname)] ?? LandingPage.preload)();
}
