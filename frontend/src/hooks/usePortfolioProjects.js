import React from "react";
import { homeConfig as config } from "../lib/homeConfig.js";
import { normalizeApiProject, portfolioSlugFor, selectCarouselProjects, sortedPortfolioItems } from "../components/home/portfolio/portfolioPresentation.mjs";

const projectsApiUrl = config.projectsApiUrl || "/api/projects/";
function featuredPortfolioItems(items, limit = 6) {
  return selectCarouselProjects(sortedPortfolioItems(items), limit);
}
export function usePortfolioProjects(t, { fetchRemote = true, language = "de" } = {}) {
  const fallbackItems = React.useMemo(() => sortedPortfolioItems(t("home.portfolio.items")), [t]);
  const normalizeProjects = React.useCallback((projects) => {
    const localizedBySlug = new Map(fallbackItems.map((item) => [portfolioSlugFor(item), item]));
    return sortedPortfolioItems(projects.map((project) => normalizeApiProject(
      project,
      localizedBySlug.get(portfolioSlugFor(project)),
      { useLocalizedContent: language !== "de" },
    )).filter(Boolean));
  }, [fallbackItems, language]);
  const embeddedItems = React.useMemo(() => (
    fetchRemote && Array.isArray(config.initialProjects) ? normalizeProjects(config.initialProjects) : null
  ), [fetchRemote, normalizeProjects]);
  const initialItems = embeddedItems ?? fallbackItems;
  const [state, setState] = React.useState(() => ({ items: initialItems, featuredItems: featuredPortfolioItems(initialItems, 6) }));

  React.useEffect(() => {
    let isActive = true;
    setState((previous) => previous.items === initialItems ? previous : {
      items: initialItems,
      featuredItems: featuredPortfolioItems(initialItems, 6),
    });
    if (!fetchRemote || embeddedItems !== null) {
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
        if (!Array.isArray(payload.projects)) return;
        const apiItems = normalizeProjects(payload.projects);
        setState({
          items: apiItems,
          featuredItems: featuredPortfolioItems(apiItems, 6),
        });
      })
      .catch(() => {
        if (isActive) setState({ items: fallbackItems, featuredItems: featuredPortfolioItems(fallbackItems, 6) });
      });
    return () => {
      isActive = false;
    };
  }, [embeddedItems, fallbackItems, fetchRemote, initialItems, normalizeProjects]);

  return state;
}
