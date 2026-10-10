import React from "react";
import { CheckCircle2 } from "lucide-react";
import PortfolioImage from "../home/portfolio/PortfolioImage";

export function paragraphList(text) {
  if (Array.isArray(text)) return text.filter(Boolean);
  return String(text || "")
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function PortfolioProjectPreview({ image: previewImage, item }) {
  const hasCover = previewImage?.variant === "cover";
  return (
    previewImage ? (
      <figure className={`portfolio-project-hero__preview ${hasCover ? "portfolio-project-hero__cover" : "portfolio-card__desktop-preview"}`}>
        <PortfolioImage
          image={previewImage}
          title={item.title}
          loading="eager"
          fetchPriority="high"
          width={1440}
          height={1000}
        />
        {!hasCover ? <figcaption>{previewImage.label}</figcaption> : null}
      </figure>
    ) : (
      <div className="portfolio-card__preview portfolio-project-hero__preview" aria-hidden="true">
        <div className="portfolio-card__browser-bar"><span /><span /><span /></div>
        <div className="portfolio-card__mockup">
          <strong>{item.title}</strong>
          <span>{item.type}</span>
        </div>
      </div>
    )
  );
}

export function PortfolioProjectDetails({ item, t }) {
  return (
    <div className="portfolio-card__details-grid">
      <article className="portfolio-card__situation">
        <span>{t("home.portfolio.situationLabel")}</span>
        {paragraphList(item.situation).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </article>
      <article className="portfolio-card__implementation">
        <span>{t("home.portfolio.ownContributionLabel")}</span>
        {paragraphList(item.implementation || item.text).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {item.implementationFeatures?.length ? (
          <ul className="portfolio-project-checklist">
            {item.implementationFeatures.map((feature) => (
              <li key={feature}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
      <article className="portfolio-card__result">
        <span>{t("home.portfolio.resultLabel")}</span>
        {paragraphList(item.result).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </article>
    </div>
  );
}
