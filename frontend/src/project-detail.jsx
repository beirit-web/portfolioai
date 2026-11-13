import React from "react";
import { useI18n } from "./i18n/useI18n.js";
import { useDocumentMeta, useDocumentStateClasses } from "./hooks/useDocumentState.js";
import { usePortfolioProjects } from "./hooks/usePortfolioProjects.js";
import { navigateToAppPath, useBrowserPath } from "./lib/appNavigation.js";
import { portfolioSlugFor } from "./components/home/portfolio/portfolioPresentation.mjs";
import { PageHero, PageShell } from "./components/shared/PageShell.jsx";
import PortfolioProjectPage from "./components/projects/PortfolioProjectPage.jsx";
import { mountSiteApp } from "./lib/mountSiteApp.jsx";

function ProjectDetailApp() {
  useDocumentStateClasses();
  const { t, language } = useI18n();
  const [path, setPath] = useBrowserPath();
  const slug = path.replace(/^\/(?:projekte|referenzen)\//, "");
  const { items } = usePortfolioProjects(t, { language });
  const item = items.find(item => portfolioSlugFor(item) === slug);
  useDocumentMeta({
    title: `${item?.title || "Projekt"} | Projekte | Beirit Web`,
    description: item?.text || "Portfolio-Projekt mit Beschreibung, Technologien und Live-Demo.",
  });
  const onNavigate = path => navigateToAppPath(path, setPath);

  return (
    <PageShell t={t} activePath="/projekte" onNavigate={onNavigate}>
      {item ? <PortfolioProjectPage item={item} t={t} language={language} onNavigate={onNavigate} /> : (
        <>
          <PageHero eyebrow="404" title="Projekt nicht gefunden" intro="Diese Referenz wurde nicht gefunden." />
          <div className="section-cta-strip mx-auto mt-8 max-w-7xl px-3 sm:px-8 lg:px-10">
            <a href="/kontakt" className="portfolio-contact-button">{t("home.contact.title")}</a>
          </div>
        </>
      )}
    </PageShell>
  );
}

mountSiteApp(ProjectDetailApp);
