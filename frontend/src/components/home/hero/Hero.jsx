import React from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { isPlainLinkClick } from "../../shared/cardActivation.js";

const LazyWaveGridHero = React.lazy(() => import("./WaveGridHero.jsx"));

function AnimatedHeadline({ text }) {
  const headlineSegments = React.useMemo(() => {
    if (text === "Webentwicklung · Softwareentwicklung · Digitale Projekte") {
      return ["Webentwicklung", "Softwareentwicklung", "Digitale Projekte"];
    }
    if (text === "Webentwicklung & digitale Lösungen") {
      return ["Webentwicklung & digitale", "Lösungen"];
    }

    return [text];
  }, [text]);

  return (
    <>
      {headlineSegments.map((segment, index) => (
        <span
          key={`${segment}-${index}`}
          className={`hero-stage__headline-segment hero-stage__headline-segment--${index + 1}`}
        >
          {segment}
          {index < headlineSegments.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

function AnimatedTagline({ text, isActive }) {
  return (
    <p
      className={`hero-stage__tagline${isActive ? " hero-stage__tagline--visible" : ""}`}
    >
      {text}
    </p>
  );
}

function DeferredWaveGridHero() {
  const [canRenderWaveGrid, setCanRenderWaveGrid] = React.useState(false);
  const hasInteracted = React.useRef(false);
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  React.useEffect(() => {
    const connection = navigator.connection;
    const interactionEvents = ["pointermove", "pointerdown", "keydown"];
    const updateAnimation = () => {
      if (prefersReducedMotion || connection?.saveData) {
        setCanRenderWaveGrid(false);
        return;
      }
      if (hasInteracted.current) setCanRenderWaveGrid(true);
    };

    const activateAnimation = (event) => {
      if (!event.isTrusted) return;
      hasInteracted.current = true;
      updateAnimation();
    };

    updateAnimation();
    interactionEvents.forEach(type => window.addEventListener(type, activateAnimation, { passive: true }));
    connection?.addEventListener?.("change", updateAnimation);

    return () => {
      interactionEvents.forEach(type => window.removeEventListener(type, activateAnimation));
      connection?.removeEventListener?.("change", updateAnimation);
    };
  }, [prefersReducedMotion]);

  return (
    <div className="hero-stage__wave-grid" aria-hidden="true">
      {canRenderWaveGrid ? (
        <React.Suspense fallback={null}>
          <LazyWaveGridHero />
        </React.Suspense>
      ) : null}
    </div>
  );
}

export default function Hero({ t, onAnchorNavigate, onRouteNavigate }) {
  const headlineText = t("home.hero.headline");
  const taglineText = t("home.hero.tagline");

  function navigateToRoute(event, href) {
    if (!onRouteNavigate || !isPlainLinkClick(event)) return;
    event.preventDefault();
    onRouteNavigate(href);
  }

  return (
    <section className="hero-stage hero-stage--portfolio">
      <DeferredWaveGridHero />
      <div className="hero-stage__mesh" aria-hidden="true" />
      <div className="hero-stage__content">
        <div className="hero-stage__copy">
          <div className="hero-stage__text">
            <h1 className="hero-stage__headline hero-stage__headline--brand">
              <AnimatedHeadline text={headlineText} />
            </h1>
            <AnimatedTagline text={taglineText} isActive />
          </div>
          <div className="hero-stage__actions">
            <a
              className="hero-stage__action hero-stage__action--primary"
              href="/projekte"
              onClick={(event) => navigateToRoute(event, "/projekte")}
            >
              <span>{t("home.hero.projectsCta")}</span>
              <ArrowRight aria-hidden="true" />
            </a>
            <a
              className="hero-stage__action hero-stage__action--secondary"
              href="/kontakt"
              onClick={(event) => navigateToRoute(event, "/kontakt")}
            >
              {t("home.hero.contactCta")}
            </a>
          </div>
          <a
            className="hero-stage__next"
            href="#kompetenzen"
            aria-label={t("home.hero.nextAria")}
            onClick={(event) => {
              if (isPlainLinkClick(event)) onAnchorNavigate?.(event, "#kompetenzen");
            }}
          >
            <span>{t("home.hero.next")}</span>
            <ArrowDown className="hero-stage__next-icon" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
