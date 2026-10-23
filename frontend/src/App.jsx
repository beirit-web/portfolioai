import PortfolioFeatureList, { ReactBrandIcon, DjangoBrandIcon } from "./components/home/portfolio/PortfolioFeatureList";
import { publicPageUrl } from "./lib/homeConfig.js";
import React from "react";
import { useI18n } from "./i18n/useI18n.js";
import { useDocumentMeta, useDocumentStateClasses } from "./hooks/useDocumentState.js";
import { usePortfolioProjects } from "./hooks/usePortfolioProjects.js";
import { appRoutes, navigateToAppPath, projectLiveHref, scrollToHashTarget, useBrowserPath } from "./lib/appNavigation.js";
import { PageFooter, PageHero, PageShell, SiteHeader } from "./components/shared/PageShell.jsx";
import { languageServicesCaseStudy } from "./components/home/portfolio/languageServicesCaseStudy.mjs";
import { ArrowLeft, ArrowRight, Braces, Bug, Cable, Code2, Component, Container, Cpu, Database, FileText, GitBranch, Globe2, Handshake, Image, Layers3, LayoutTemplate, Mail, MapPinned, MessageSquare, PencilLine, Quote, ServerCog, ShieldCheck, Star, UserRound, Workflow } from "lucide-react";
import Hero from "./components/home/hero/Hero";
import HomePortfolioSection from "./components/home/portfolio/HomePortfolioSection.jsx";
import { homeOverviewCopyFor } from "./components/home/homeOverviewCopy.mjs";
import { isProjectPublished, portfolioSlugFor } from "./components/home/portfolio/portfolioPresentation.mjs";

import CardIllustration from "./components/shared/CardIllustration";
import { isPlainLinkClick } from "./components/shared/cardActivation.js";


const LazyContactForm = React.lazy(() => import("./components/contact/ContactForm.jsx"));
const LazyContactDetails = React.lazy(() => import("./components/contact/ContactDetails.jsx"));
const PortfolioProjectPage = React.lazy(() => import("./components/projects/PortfolioProjectPage.jsx"));
const ProjectsOverviewPage = React.lazy(() => import("./components/projects/ProjectsOverviewPage.jsx")
  .then(module => ({ default: module.ProjectsOverviewPage })));
const AboutPage = React.lazy(() => import("./components/about/AboutPage.jsx"));
function WeatherRedirect() {
  React.useEffect(() => {
    location.replace(publicPageUrl("/botanic/wetter/"));
  }, []);
  return <a href={publicPageUrl("/botanic/wetter/")}>Wetter in ENBT Botanic öffnen</a>;
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
  if (typeof window === "undefined" || location.pathname === "/") {
    return {};
  }

  return {
    "data-reveal": reveal,
    "data-reveal-delay": String(delay),
    "data-reveal-duration": String(duration),
    "data-reveal-distance": distance,
  };
}

function ProblemsSection({ t }) {
  const problems = t("home.problems.items");

  return (
    <section className="problems-section mx-auto max-w-7xl px-3 pt-10 pb-0 sm:px-8 sm:pt-16 sm:pb-0 lg:px-10" {...revealProps("up", 0, 760, "1rem")}>
      <div className="problems-panel">
        <header className="problems-panel__copy" {...revealProps("up", 80, 760, "0.9rem")}>
          <h2 className="home-section-title mt-3 font-display text-3xl leading-tight sm:text-4xl">{t("home.problems.title")}</h2>
          <p className="mt-4 text-base leading-8 text-stone-700">{t("home.problems.intro")}</p>
        </header>
        <ul className="problems-grid">
          {problems.map(({ icon, title, text, projectHref, projectLabel }, index) => {
            const Icon = iconFor(icon);
            return (
              <li key={title} className="problem-card" {...revealProps("up", 130 + index * 45, 680, "0.75rem")}>
                <CardIllustration name={icon} kind="problem" fallback={Icon} />
                <span className="problem-card__body">
                  <strong>{title}</strong>
                  {text ? <span>{text}</span> : null}
                  {projectHref ? <a className="problem-card__project-link" href={projectHref}>{projectLabel}<ArrowRight className="h-4 w-4" aria-hidden="true" /></a> : null}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="problems-solution" {...revealProps("up", 250, 720, "0.8rem")}>
          <p>{t("home.problems.solution")}</p>
        </div>
      </div>
    </section>
  );
}


function UnderConstructionNote({ t, onNavigate }) {
  return (
    <div className="section-cta-strip mx-auto mt-8 max-w-7xl px-3 sm:px-8 lg:px-10">
      <a href="/kontakt" className="portfolio-contact-button" onClick={(event) => {
        if (!isPlainLinkClick(event)) return;
        event.preventDefault();
        onNavigate("/kontakt");
      }}>
        {t("home.contact.title")}
      </a>
    </div>
  );
}


function StandalonePage({ routeKey, projectSlug, t, language, onNavigate, contactComponents }) {
  useScrollReveal();
  const services = t("home.services.items");
  const shouldFetchPortfolio = routeKey === "projects" || routeKey === "portfolioProject";
  const { items: portfolioItems } = usePortfolioProjects(t, { fetchRemote: shouldFetchPortfolio, language });


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
    return <ProjectsOverviewPage items={portfolioItems.map(item => languageServicesCaseStudy(item, language))} language={language} onNavigate={onNavigate} />;
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
      uk: {
        LayoutTemplate: ["упорядкувати головну сторінку", "поліпшити мобільне відображення", "структурувати тексти та зображення"],
        Bug: ["виправити помилки форм", "перевірити відображення", "знайти причини повільного завантаження"],
        Workflow: ["розширити форму запиту", "спланувати особистий кабінет", "спростити внутрішні процеси"],
        Globe2: ["тексти вебсайту DE/RU", "тексти інтерфейсу для форм", "зрозумілі підказки застосунку"],
      },
    }[language] || {};
    const techPoints = t("home.tech.points");
    const techDetails = t("home.tech.pointDetails");
    return (
      <>
        <PageHero title={t("home.services.title")} intro={t("home.services.intro")} centerTitle centerIntro />
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
    return <AboutPage t={t} language={language} />;
  }

  if (routeKey === "contact") {
    const ContactForm = contactComponents?.Form || LazyContactForm;
    const ContactDetails = contactComponents?.Details || LazyContactDetails;
    const params = new URLSearchParams(location.search);
    const selectedProject = params.get("project") || "";
    const subjectPrefix = { de: "Frage zu", ru: "Вопрос о", uk: "Питання про" }[language] || "Frage zu";
    const selectedSubject = selectedProject ? `${subjectPrefix} ${selectedProject}` : "";
    return (
      <section className="contact-section contact-page-section contact-page-section--compact">
        <header className="contact-page-section__heading">
          <h1>{t("nav.contact")}</h1>
          <p>{t("home.contact.intro")}</p>
        </header>
        <div className="contact-panel">
          <React.Suspense fallback={<div className="contact-form contact-form--loading contact-mobile-stage" aria-hidden="true" />}>
            <ContactForm
              language={language}
              selectedSubject={selectedSubject}
              t={t}
            />
            <ContactDetails language={language} />
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

export function HomeMain({ t, language, onNavigate, onAnchorNavigate }) {
  const services = t("home.services.items");
  const servicesTitle = t("home.services.title");
  const servicesTitleSegments = [servicesTitle];
  const homeOverviewCopy = homeOverviewCopyFor(language);
  return (
      <main id="top" className="home-main" data-home-rendered="true">
        <React.Suspense fallback={<div className="hero-stage-fallback" aria-hidden="true" />}>
          <Hero t={t} onAnchorNavigate={onAnchorNavigate} onRouteNavigate={onNavigate} />
        </React.Suspense>

        <ProblemsSection t={t} />
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
                    if (!isPlainLinkClick(event)) return;
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

      </main>
  );
}

function HomePage({ onNavigate }) {
  const { t, language } = useI18n();
  useScrollReveal();
  const [activeNavHref, setActiveNavHref] = React.useState(() => (
    location.hash === "#referenzen" ? "/#referenzen" : "/"
  ));
  const navigateHomeHeader = React.useCallback((nextPath) => {
    setActiveNavHref(nextPath);
    onNavigate?.(nextPath);
  }, [onNavigate]);

  const handleAnchorNavigate = React.useCallback((event, href) => {
    if (!isPlainLinkClick(event) || !href?.startsWith("#") || href === "#top") return;
    event.preventDefault();
    scrollToHashTarget(href);
  }, []);

  React.useEffect(() => {
    const updateActiveHashNav = () => {
      setActiveNavHref(location.hash === "#referenzen" ? "/#referenzen" : "/");
    };

    updateActiveHashNav();
    addEventListener("hashchange", updateActiveHashNav);
    addEventListener("popstate", updateActiveHashNav);

    return () => {
      removeEventListener("hashchange", updateActiveHashNav);
      removeEventListener("popstate", updateActiveHashNav);
    };
  }, []);

  React.useEffect(() => {
    scrollToHashTarget(location.hash);
  }, []);

  return (
    <div className="site-shell site-shell--home min-h-screen bg-[#f3f4f6] text-stone-950">
      <SiteHeader t={t} activePath={activeNavHref} onNavigate={navigateHomeHeader} portal />

      <HomeMain t={t} language={language} onNavigate={onNavigate} onAnchorNavigate={handleAnchorNavigate} />

      <PageFooter t={t} onNavigate={onNavigate} />
    </div>
  );
}

export default function App({ contactComponents } = {}) {
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
        title: `${projectItem?.title || "Projekt"} | Projekte | Beirit Web`,
        description: projectItem?.text || "Portfolio-Projekt mit Beschreibung, Technologien und Live-Demo.",
      }
    : null);
  useDocumentMeta(route || { title: "Seite nicht gefunden | Beirit Web", description: "Diese Seite wurde nicht gefunden.", robots: "noindex, follow" });

  if (path === "/") {
    return <HomePage onNavigate={(nextPath) => navigateToAppPath(nextPath, setPath)} />;
  }

  const handleNavigate = (nextPath) => navigateToAppPath(nextPath, setPath);
  const activePath = projectItem || route?.key === "projects" ? "/projekte" : route ? path : "";

  return (
    <PageShell t={t} activePath={activePath} onNavigate={handleNavigate}>
      <React.Suspense fallback={null}>
        <StandalonePage routeKey={route?.key || "notFound"} projectSlug={projectSlug} t={t} language={language} onNavigate={handleNavigate} contactComponents={contactComponents} />
      </React.Suspense>
    </PageShell>
  );
}
