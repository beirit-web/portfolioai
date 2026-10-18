import React from "react";
import { PROJECTS_OVERVIEW_COPY } from "./projectsCopy.mjs";
import { ArrowRight, FileText } from "lucide-react";
import PortfolioImage from "../home/portfolio/PortfolioImage.jsx";
import { PROJECT_OVERVIEW_IMAGE_SIZES, portfolioProjectPath, portfolioSlugFor, projectPreviewImage, projectTechnologyTags, sortedPortfolioItems } from "../home/portfolio/portfolioPresentation.mjs";
import TechnologyTags from "../shared/TechnologyTags.jsx";
import { TechnicalLabel } from "../shared/TechnicalLabel.jsx";
import { PageHero } from "../shared/PageShell.jsx";
import { isExternalUrl, projectLiveHref } from "../../lib/appNavigation.js";
import { isPlainLinkClick } from "../shared/cardActivation.js";

export function ProjectsOverviewPage({ items, language, onNavigate }) {
  const copy = PROJECTS_OVERVIEW_COPY[language] || PROJECTS_OVERVIEW_COPY.de;
  const projects = React.useMemo(() => sortedPortfolioItems(items), [items]);
  const firstImageIndex = projects.findIndex((item) => projectPreviewImage(item)?.src);

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
              const technologies = projectTechnologyTags(item);
              return (
                <article className={`project-overview-card project-overview-card--${portfolioSlugFor(item)}`} key={item.title}>
                  {thumbnail ? (
                    <a
                      href={detailPath}
                      className={`project-overview-card__media${thumbnail.variant === "cover" ? " project-overview-card__media--cover" : ""}`}
                      onClick={(event) => {
                        if (!isPlainLinkClick(event)) return;
                        event.preventDefault();
                        onNavigate(detailPath);
                      }}
                    >
                      <PortfolioImage
                        image={thumbnail}
                        title={item.title}
                        loading={index === firstImageIndex ? "eager" : "lazy"}
                        fetchPriority={index === firstImageIndex ? "high" : undefined}
                        srcSet={thumbnail.srcSet}
                        sizes={thumbnail.srcSet ? PROJECT_OVERVIEW_IMAGE_SIZES : undefined}
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
                    <p>{item.overviewText || item.text}</p>
                    <TechnologyTags technologies={technologies} className="project-overview-card__tags" label={copy.technologies} />
                    <div className="project-overview-card__actions">
                      <a
                        href={detailPath}
                        className="project-overview-card__button"
                        onClick={(event) => {
                          if (!isPlainLinkClick(event)) return;
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
