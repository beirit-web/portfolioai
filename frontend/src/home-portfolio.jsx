import React from "react";
import { hydrateRoot } from "react-dom/client";
import HomePortfolioSection from "./components/home/portfolio/HomePortfolioSection.jsx";
import { homeOverviewCopyFor } from "./components/home/homeOverviewCopy.mjs";
import { createTranslator, ensureLanguage } from "./i18n/index.js";

export async function enhanceHomePortfolio(section, language) {
  await ensureLanguage(language);
  hydrateRoot(section, <HomePortfolioSection
    t={createTranslator(language)}
    language={language}
    homeOverviewCopy={homeOverviewCopyFor(language)}
    onNavigate={href => location.assign(href)}
    contentsOnly
  />);
  section.dataset.enhanced = "true";
}
