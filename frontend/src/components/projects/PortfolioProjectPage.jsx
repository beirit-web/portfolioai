import React from "react";
import { CheckCircle2, Code2 } from "lucide-react";
import { publicPageUrl } from "../../lib/homeConfig.js";
import { isExternalUrl, projectActionHref } from "../../lib/appNavigation.js";
import { languageServicesCaseStudy } from "../home/portfolio/languageServicesCaseStudy.mjs";
import { projectDetailImage, portfolioSlugFor, projectScreenshotImages, projectTechnologyTags } from "../home/portfolio/portfolioPresentation.mjs";
import PortfolioImage from "../home/portfolio/PortfolioImage";
import PortfolioFeatureList from "../home/portfolio/PortfolioFeatureList";
import TechnologyTags from "../shared/TechnologyTags";

function paragraphList(text) {
  if (Array.isArray(text)) return text.filter(Boolean);
  return String(text || "")
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}


export default function PortfolioProjectPage({ item, t, language, onNavigate }) {
  item = languageServicesCaseStudy(item, language);
  const previewImage = projectDetailImage(item);
  const hasCover = previewImage?.variant === "cover";
  const projectSlug = portfolioSlugFor(item);
  const isCase = (item.category || "demo") === "case";
  const fallbackActionLabel = t(isCase ? "home.portfolio.caseStudyCta" : "home.portfolio.referenceCta");
  const closingActionLabel = item.contactCta || fallbackActionLabel;
  const contactPath = `/kontakt?project=${encodeURIComponent(item.title)}${isCase ? "&topic=feature" : ""}`;
  const actionHref = projectActionHref(item) || contactPath;
  const actionLabel = actionHref === contactPath ? (item.cta || fallbackActionLabel) : t("home.portfolio.projectCta");
  const isExternalAction = isExternalUrl(actionHref);
  const screenshots = projectScreenshotImages(item);
  const handlePrimaryAction = (event) => {
    if (actionHref !== contactPath) {
      return;
    }
    event.preventDefault();
    onNavigate(contactPath);
  };

  return (
    <>
      <section className={`portfolio-project-hero portfolio-project-hero--${projectSlug} mx-auto max-w-7xl px-3 sm:px-8 lg:px-10`}>
        <a
          href="/projekte/"
          className="portfolio-project-back"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/projekte");
          }}
        >
          {language === "ru" ? "Назад к проектам" : "Zurück zu Projekten"}
        </a>
        <div className="portfolio-project-hero__grid">
          <div className="portfolio-project-hero__copy">
            <h1>{item.title}</h1>
            <p>{item.text}</p>
            <div className="portfolio-card__meta">
              <span className="portfolio-card__type">{item.type}</span>
              {item.status ? <span className="portfolio-card__status">{item.status}</span> : null}
              {(item.trustSignals || []).map((signal) => (
                <span key={signal} className="portfolio-card__trust portfolio-card__trust--reference">{signal}</span>
              ))}
            </div>
            {item.showPrimaryAction !== false ? (
              <a
                href={actionHref}
                className="portfolio-contact-button"
                target={isExternalAction ? "_blank" : undefined}
                rel={isExternalAction ? "noopener noreferrer" : undefined}
                onClick={handlePrimaryAction}
              >
                {actionLabel}
              </a>
            ) : null}
            {projectSlug === "sprachdienstleistungen" ? (
              <a id="deutschlive" href="/deutschlive/"
                className="project-overview-card__secondary-button" target="_blank" rel="noopener noreferrer">
                {language === "ru" ? "Открыть DeutschLive" : language === "uk" ? "Відкрити DeutschLive" : "DeutschLive öffnen"}
              </a>
            ) : null}
            {projectSlug === "sprachdienstleistungen" ? (
              <a
                id="vokabelbox"
                href="/static/portfolio/vokabelbox-main/index.html"
                className="project-overview-card__secondary-button"
                target="_blank"
                rel="noopener noreferrer"
              >
                {language === "ru" ? "Открыть Vokabelbox" : language === "uk" ? "Відкрити Vokabelbox" : "Vokabelbox öffnen"}
              </a>
            ) : null}
            {projectSlug === "enbt-botanic" ? (
              <a
                id="wetter"
                href={publicPageUrl("/botanic/wetter/")}
                className="project-overview-card__secondary-button"
              >
                {language === "ru" ? "Открыть погоду" : language === "uk" ? "Відкрити погоду" : "Wetter öffnen"}
              </a>
            ) : null}
            {projectSlug === "sprachdienstleistungen" ? (
              <a id="musikplayer" href="/deutschlive/recordings"
                className="project-overview-card__secondary-button" target="_blank" rel="noopener noreferrer">
                {language === "ru" ? "Мои записи" : language === "uk" ? "Мої записи" : "Meine Aufnahmen öffnen"}
              </a>
            ) : null}
          </div>
          {previewImage ? (
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
          )}
        </div>
      </section>

      <section id="projektdetails" className="portfolio-project-page mx-auto max-w-7xl scroll-mt-24 px-3 pb-16 sm:px-8 lg:px-10">
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
        {item.technicalDecision ? (
          <section className="portfolio-project-decision" aria-labelledby="technical-decision-title">
            <h2 id="technical-decision-title">{t("home.portfolio.decisionLabel")}</h2>
            {paragraphList(item.technicalDecision).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ) : null}
        {screenshots.length ? (
          <section className="portfolio-project-gallery" aria-labelledby="project-gallery-title">
            <h2 id="project-gallery-title">{t("home.portfolio.previewGalleryLabel")}</h2>
            <div className="portfolio-project-gallery__grid">
              {screenshots.map((image) => (
                <figure key={image.src} className={`portfolio-project-gallery__figure${image.label === "Mobile" ? " portfolio-project-gallery__figure--mobile" : ""}`} style={image.label === "Mobile" ? { "--portfolio-preview-ratio": `${image.width || 390} / ${image.height || 844}` } : undefined}>
                  <a href={image.src} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} – ${image.label}`}>
                    <PortfolioImage image={image} title={item.title} loading="lazy" />
                  </a>
                  <figcaption>{image.label}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}
        {item.features?.length ? (
          <section className="portfolio-card__features" aria-label={t("home.portfolio.featuresLabel")}>
            <strong className="portfolio-card__features-title">{t("home.portfolio.featuresLabel")}</strong>
            <PortfolioFeatureList items={item.features} />
          </section>
        ) : null}
        <section className="portfolio-card__proof" aria-label={t("home.portfolio.proofLabel")}>
          <strong className="portfolio-card__proof-title">{item.proofLabel || t("home.portfolio.proofLabel")}</strong>
          <TechnologyTags technologies={projectTechnologyTags(item)} iconSize={28} fallbackIcon={Code2} label={t("home.portfolio.proofLabel")} />
        </section>
        {item.note ? <p className="portfolio-project-note">{item.note}</p> : null}
        {item.closingTitle || item.closingText ? (
          <section className="portfolio-project-closing" aria-label={item.closingTitle || closingActionLabel}>
            {item.closingTitle ? <h2>{item.closingTitle}</h2> : null}
            {item.closingText ? <p>{item.closingText}</p> : null}
            {item.showContactCta !== false ? (
              <a
                href={contactPath}
                className="portfolio-contact-button"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(contactPath);
                }}
              >
                {closingActionLabel}
              </a>
            ) : null}
          </section>
        ) : null}
      </section>
    </>
  );
}


