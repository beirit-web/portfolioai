import React from "react";
import PortfolioImage from "./PortfolioImage";
import { TechnicalLabel } from "../../shared/TechnicalLabel";
import TechnologyTags from "../../shared/TechnologyTags";
import { activateCardLink } from "../../shared/cardActivation";
import {
  portfolioProjectPath,
  portfolioSlugFor,
  projectCapabilityLabels,
  projectCarouselImage,
  projectTechnologyTags,
} from "./portfolioPresentation.mjs";

export default React.memo(function PortfolioProjectCard({
  index,
  isActive,
  item,
  language,
  copy,
  liveHref,
  level,
  onNavigate,
  suppressClickRef,
}) {
  const thumbnail = projectCarouselImage(item);
  const thumbnailVariant = thumbnail?.variant || (thumbnail?.label === "Mobile" ? "mobile" : "");
  const projectPath = portfolioProjectPath(item);
  const projectSlug = portfolioSlugFor(item);
  const technologies = projectTechnologyTags(item);
  const capabilities = projectCapabilityLabels(item);

  return (
    <a
      href={projectPath}
      className={`portfolio-card portfolio-card--showcase portfolio-carousel__slide portfolio-carousel__slide--${projectSlug} portfolio-carousel__slide--level${level ?? "-hidden"} clickable-card${isActive ? " is-active" : ""}`}
      tabIndex={isActive ? 0 : -1}
      aria-hidden={level === null ? "true" : undefined}
      draggable="false"
      onDragStart={(event) => event.preventDefault()}
      onClick={(event) => {
        if (suppressClickRef.current) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        activateCardLink(event, () => onNavigate?.(projectPath));
      }}
      onKeyDown={(event) => activateCardLink(event, () => onNavigate?.(projectPath))}
      aria-label={`${item.title} - ${copy.openProjectAria}`}
    >
      {thumbnail ? (
        <figure className={`portfolio-card__thumbnail${thumbnailVariant ? ` portfolio-card__thumbnail--${thumbnailVariant}` : ""}`}>
          <PortfolioImage
            image={thumbnail}
            title={item.title}
            loading={isActive ? "eager" : "lazy"}
            fetchPriority={isActive ? "high" : "low"}
            draggable="false"
          />
        </figure>
      ) : null}
      <div className="portfolio-card__body">
        <div className="portfolio-card__meta portfolio-card__meta--category" aria-label={copy.projectType}>
          <span>{item.type}</span>
        </div>
        <h3 className="portfolio-card__title">
          <TechnicalLabel language={language}>{item.title}</TechnicalLabel>
        </h3>
        <p className="portfolio-card__text">{item.text}</p>
        {capabilities.length ? (
          <div className="portfolio-card__details">
            <strong className="portfolio-card__detail-label">{copy.capabilities}</strong>
            <ul className="portfolio-card__features">
              {capabilities.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </div>
        ) : null}
        {technologies.length ? (
          <div className="portfolio-card__details">
            <strong className="portfolio-card__detail-label">{copy.technologies}</strong>
            <TechnologyTags
              technologies={technologies}
              className="portfolio-card__meta portfolio-card__meta--technologies"
              label={copy.technologies}
            />
          </div>
        ) : null}
        {liveHref ? <span className="portfolio-card__live">{copy.liveDemo}</span> : null}
        <div className="portfolio-card__footer">
          <span className="portfolio-card__action">
            <svg
              className="portfolio-card__action-border"
              viewBox="0 0 180 60"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect x="1" y="1" width="178" height="58" rx="6" ry="6" className="portfolio-card__action-line portfolio-card__action-line--background" />
              <rect x="1" y="1" width="178" height="58" rx="6" ry="6" className="portfolio-card__action-line portfolio-card__action-line--highlight" />
            </svg>
            <span className="portfolio-card__action-label">
              {copy.openProject}
            </span>
          </span>
          <span className="portfolio-card__index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>
    </a>
  );
});
