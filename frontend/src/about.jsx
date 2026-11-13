import React from "react";
import AboutPage from "./components/about/AboutPage.jsx";
import { PageShell } from "./components/shared/PageShell.jsx";
import { useI18n } from "./i18n/about.js";
import { useDocumentMeta, useDocumentStateClasses } from "./hooks/useDocumentState.js";
import { appRoutes, navigateToAppPath, useBrowserPath } from "./lib/appNavigation.js";
import { mountSiteApp } from "./lib/mountSiteApp.jsx";

function AboutApp() {
  useDocumentStateClasses();
  useDocumentMeta(appRoutes["/ueber-mich"]);
  const { t, language } = useI18n();
  const [, setPath] = useBrowserPath();

  return (
    <PageShell t={t} activePath="/ueber-mich" onNavigate={path => navigateToAppPath(path, setPath)}>
      <AboutPage t={t} language={language} />
    </PageShell>
  );
}

mountSiteApp(AboutApp);
