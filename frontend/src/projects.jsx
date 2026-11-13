import React from "react";
import { useI18n } from "./i18n/projects.js";
import { useDocumentMeta, useDocumentStateClasses } from "./hooks/useDocumentState.js";
import { usePortfolioProjects } from "./hooks/usePortfolioProjects.js";
import { appRoutes, navigateToAppPath, useBrowserPath } from "./lib/appNavigation.js";
import { PageShell } from "./components/shared/PageShell.jsx";
import { ProjectsOverviewPage } from "./components/projects/ProjectsOverviewPage.jsx";
import { languageServicesCaseStudy } from "./components/home/portfolio/languageServicesCaseStudy.mjs";
import { mountSiteApp } from "./lib/mountSiteApp.jsx";

function ProjectsApp() {
  useDocumentStateClasses();
  useDocumentMeta(appRoutes["/projekte"]);
  const { t, language } = useI18n();
  const [, setPath] = useBrowserPath();
  const { items } = usePortfolioProjects(t, { language });
  const handleNavigate = (path) => navigateToAppPath(path, setPath);

  return (
    <PageShell t={t} activePath="/projekte" onNavigate={handleNavigate}>
      <ProjectsOverviewPage items={items.map(item => languageServicesCaseStudy(item, language))} language={language} onNavigate={handleNavigate} />
    </PageShell>
  );
}

mountSiteApp(ProjectsApp);
