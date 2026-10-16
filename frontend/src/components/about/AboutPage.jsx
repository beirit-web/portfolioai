import React from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Pause, Play } from "lucide-react";
import AboutFactIcon from "./AboutFactIcon.jsx";
import { featureIconFor } from "../home/portfolio/PortfolioFeatureList";
import TechnologyIcon from "../shared/TechnologyIcon";

const aboutPortraitUrl = "/static/images/eugenbeirit-360.webp";
const aboutPortraitSrcSet = [
  "/static/images/eugenbeirit-360.webp 360w",
  "/static/images/eugenbeirit-540.webp 540w",
].join(", ");
const aboutPortraitFallbackUrl = "/static/images/eugenbeirit.png";

const carouselLabels = {
  de: { title: "Technologien und Werkzeuge", previous: "Vorherige Technologie", next: "Nächste Technologie", select: "Technologie auswählen", show: item => `${item} anzeigen`, pause: "Automatischen Wechsel pausieren", resume: "Automatischen Wechsel fortsetzen" },
  ru: { title: "Технологии и инструменты", previous: "Предыдущая технология", next: "Следующая технология", select: "Выбрать технологию", show: item => `Показать ${item}`, pause: "Приостановить автоматическую смену", resume: "Возобновить автоматическую смену" },
  uk: { title: "Технології та інструменти", previous: "Попередня технологія", next: "Наступна технологія", select: "Вибрати технологію", show: item => `Показати ${item}`, pause: "Призупинити автоматичну зміну", resume: "Продовжити автоматичну зміну" },
};

function AboutTechCarousel({ items, language }) {
  const carouselRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [hasFocus, setHasFocus] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [isInView, setIsInView] = React.useState(false);
  const labels = carouselLabels[language] || carouselLabels.de;
  const activeItem = items[activeIndex] || items[0];
  const ActiveIcon = featureIconFor(activeItem);
  const hasMultipleItems = items.length > 1;
  const isRotating = hasMultipleItems && !isPaused && !reducedMotion && !isHovered && !hasFocus && isInView;

  const goToSlide = React.useCallback((index) => {
    if (!items.length) return;
    setActiveIndex((index + items.length) % items.length);
  }, [items.length]);

  const moveSlide = React.useCallback((direction) => {
    goToSlide(activeIndex + direction);
  }, [activeIndex, goToSlide]);

  React.useEffect(() => {
    if (activeIndex <= items.length - 1) return;
    setActiveIndex(0);
  }, [activeIndex, items.length]);

  React.useEffect(() => {
    if (!window.IntersectionObserver) {
      setIsInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    });
    if (carouselRef.current) observer.observe(carouselRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    if (!isRotating) return undefined;
    const intervalId = setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % items.length);
    }, 2600);
    return () => clearInterval(intervalId);
  }, [isRotating, items.length]);

  if (!items.length) return null;

  return (
    <div
      ref={carouselRef}
      className="about-tech-carousel"
      aria-roledescription="carousel"
      role="region"
      aria-label={labels.title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocus(true)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
    >
      <div className="about-tech-carousel__stage" aria-live={isRotating ? "off" : "polite"} key={activeItem}>
        <TechnologyIcon label={activeItem} fallback={ActiveIcon} className="about-tech-carousel__icon" />
        <strong>{activeItem}</strong>
        <span>{activeIndex + 1} / {items.length}</span>
      </div>
      <div className="about-tech-carousel__rail" aria-hidden="true">
        {items.map((item, index) => {
          const Icon = featureIconFor(item);
          return (
            <div key={item} className={`about-tech-carousel__item${index === activeIndex ? " is-active" : ""}`}>
              <TechnologyIcon label={item} fallback={Icon} className="about-tech-carousel__item-icon" />
              <strong>{item}</strong>
            </div>
          );
        })}
      </div>
      {hasMultipleItems ? (
        <div className="about-tech-carousel__controls">
          <button type="button" className="about-tech-carousel__button" onClick={() => moveSlide(-1)} aria-label={labels.previous}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="about-tech-carousel__dots" aria-label={labels.select}>
            {items.map((item, index) => (
              <button
                key={item}
                type="button"
                className={`about-tech-carousel__dot${index === activeIndex ? " is-active" : ""}`}
                aria-label={labels.show(item)}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
          <button type="button" className="about-tech-carousel__button" onClick={() => moveSlide(1)} aria-label={labels.next}>
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          {!reducedMotion ? (
            <button type="button" className="about-tech-carousel__button" onClick={() => setIsPaused(value => !value)} aria-label={isPaused ? labels.resume : labels.pause} aria-pressed={isPaused}>
              {isPaused ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


export default function AboutPage({ t, language }) {
  const aboutContent = {
    de: {
      intro: [
        "Ich bin Eugen und entwickle Webanwendungen, Softwareprojekte und digitale Werkzeuge.",
        "Dieses Portfolio dokumentiert ausgewählte Projekte, technische Entscheidungen und die dabei gewonnenen Erfahrungen.",
      ],
      backgroundTitle: "Beruflicher und technischer Hintergrund",
      background: [
        "Meine Grundlage im IT-Bereich ist eine Weiterbildung zum Full-Stack-Webentwickler. Ich arbeite unter anderem mit React, JavaScript, Python und Django und erweitere meine Kenntnisse kontinuierlich, insbesondere in der Python- und Django-Entwicklung.",
        "Mein Schwerpunkt liegt auf React, JavaScript, Python und Django sowie auf technisch nachvollziehbaren Fullstack-Lösungen.",
      ],
      workflowTitle: "Arbeitsweise",
      workflow: [
        "Im Mittelpunkt stehen verständliche Absprachen, direkte Kommunikation und eine zuverlässige Umsetzung.",
        "Bei technischen Projekten lege ich Wert auf nachvollziehbare, wartbare und bedarfsgerechte Lösungen. Statt unnötig komplizierter Funktionen soll eine Lösung das konkrete Problem zuverlässig lösen.",
      ],
      techStack: ["Python", "Django", "React", "JavaScript", "Node.js", "Express.js", "MongoDB", "PostgreSQL", "HTML", "CSS", "Bootstrap", "Tailwind CSS"],
      valuesTitle: "Werte und Vorteile",
      values: ["persönliche und direkte Kommunikation", "realistische Einschätzung von Aufwand und Möglichkeiten", "verständliche Absprachen", "wartbare technische Lösungen", "responsive Webentwicklung", "individuelle Web- und Softwarelösungen", "deutschlandweite Zusammenarbeit"],
      hobbyTitle: "Hobby",
      hobbyEyebrow: "Privat",
      hobbyVideoTitle: "Mein alter Freund",
      hobbyVideoText: "Ein persönlicher Einblick abseits der Projektarbeit.",
      cta: "Projekt oder Termin besprechen",
    },
    ru: {
      intro: "Я Евген и разрабатываю веб-приложения, программные проекты и цифровые инструменты.",
      backgroundTitle: "Профессиональный и технический фон",
      background: "Моя основа - обучение на full-stack web developer. В портфолио представлены проекты на React, JavaScript, Python и Django.",
      workflowTitle: "Формат работы",
      workflow: "В центре работы - понятные договоренности, поддерживаемые решения и прямое общение без лишних технических терминов.",
      techStack: ["Python", "Django", "React", "JavaScript", "Node.js", "Express.js", "MongoDB", "PostgreSQL", "HTML", "CSS", "Bootstrap", "Tailwind CSS"],
      valuesTitle: "Ценности и преимущества",
      values: ["прямая коммуникация", "реалистичная оценка", "поддерживаемая реализация", "адаптация под устройства", "онлайн-сотрудничество по Германии", "немецкий/русский/украинский для сайтов и software-текстов"],
      hobbyTitle: "Хобби",
      hobbyEyebrow: "Личное",
      hobbyVideoTitle: "Мой старый друг",
      hobbyVideoText: "Небольшой личный фрагмент вне проектной работы.",
      cta: "Обсудить проект",
    },
    uk: {
      intro: "Я Євген. Розробляю вебзастосунки, програмні проєкти та цифрові інструменти.",
      backgroundTitle: "Професійний і технічний досвід",
      background: "Моя основа в ІТ — навчання на Full-Stack веброзробника. Працюю з React, JavaScript, Python і Django та постійно розширюю свої знання.",
      workflowTitle: "Як я працюю",
      workflow: "Зрозумілі домовленості, пряме спілкування та підтримувані технічні рішення допомагають розв'язувати конкретні завдання.",
      techStack: ["Python", "Django", "React", "JavaScript", "Node.js", "Express.js", "MongoDB", "PostgreSQL", "HTML", "CSS", "Bootstrap", "Tailwind CSS"],
      valuesTitle: "Принципи роботи",
      values: ["пряме спілкування", "реалістична оцінка обсягу роботи", "зрозумілі домовленості", "підтримуваний код", "адаптивна веброзробка", "онлайн-співпраця в Німеччині"],
      hobbyTitle: "Хобі",
      hobbyEyebrow: "Особисте",
      hobbyVideoTitle: "Мій старий друг",
      hobbyVideoText: "Невеликий особистий погляд поза роботою над проєктами.",
      cta: "Зв'язатися",
    },
  }[language];
  const renderParagraphs = (content) => (
    Array.isArray(content)
      ? content.map((paragraph) => <p key={paragraph} className="mt-3">{paragraph}</p>)
      : <p className="mt-3">{content}</p>
  );
  const techStack = [...new Set([
    ...(aboutContent.techStack || t("home.tech.stack").map((item) => item.label)),
  ])];
  const profilePanel = (
    <aside className="about-profile-panel" aria-label={t("nav.about")}>
      <div className="about-photo-card">
        <div className="about-photo-card__placeholder">
          <div className="about-hero-copy">
            <h1>{t("home.about.title")}</h1>
            {Array.isArray(aboutContent.intro)
              ? aboutContent.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
              : <p>{aboutContent.intro}</p>}
          </div>
        </div>
        <picture className="about-photo-card__picture">
          <source
            type="image/webp"
            srcSet={aboutPortraitSrcSet}
            sizes="(min-width: 48rem) 22rem, calc(100vw - 2px)"
          />
          <img
            src={aboutPortraitUrl}
            alt="Eugen Beirit"
            width="360"
            height="480"
            loading="eager"
            decoding="async"
            onError={(event) => {
              if (event.currentTarget.dataset.fallbackApplied === "true") return;
              event.currentTarget.dataset.fallbackApplied = "true";
              event.currentTarget.src = aboutPortraitFallbackUrl;
            }}
          />
        </picture>
        <div className="about-profile-panel__facts">
          <span><AboutFactIcon name="software" />Web & Software</span>
          <span><AboutFactIcon name="development" />Webentwicklung</span>
          <span><AboutFactIcon name="repair" />Fehlerbehebung</span>
          <span><AboutFactIcon name="germany" />Deutschlandweit</span>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <section className="about-hero-grid text-base leading-8 text-stone-700 sm:text-lg">
        {profilePanel}
      </section>

      <section className="about-page-content mx-auto max-w-7xl px-3 pb-12 text-base leading-8 text-stone-700 sm:px-8 sm:text-lg lg:px-10">
        <div className="about-content-stack about-content-stack--wide">
          <article className="about-page-card about-page-card--lead">
            <h2>{aboutContent.backgroundTitle}</h2>
            {renderParagraphs(aboutContent.background)}
          </article>
          <article className="about-page-card">
            <h2>{aboutContent.workflowTitle}</h2>
            {renderParagraphs(aboutContent.workflow)}
          </article>
          {aboutContent.languageServicesTitle ? (
            <article className="about-page-card">
              <h2>{aboutContent.languageServicesTitle}</h2>
              {renderParagraphs(aboutContent.languageServices)}
              {aboutContent.languageServiceItems ? (
                <ul className="about-language-service-list">
                  {aboutContent.languageServiceItems.map((item) => (
                    <li key={item}><CheckCircle2 className="h-5 w-5" aria-hidden="true" />{item}</li>
                  ))}
                </ul>
              ) : null}
              {aboutContent.languageServiceNote ? (
                <p className="about-language-service-note"><strong>{aboutContent.languageServiceNote}</strong></p>
              ) : null}
            </article>
          ) : null}
          <article className="about-page-card about-page-card--tech">
            <h2>{t("home.tech.stackAria")}</h2>
            <AboutTechCarousel items={techStack} language={language} />
          </article>
        </div>
      </section>
    </>
  );
}
