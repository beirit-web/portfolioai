import React from "react";
import { ArrowDown } from "lucide-react";
import { useMediaQuery } from "../../../hooks/useMediaQuery";

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
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  React.useEffect(() => {
    const connection = navigator.connection;
    let timeoutId;
    const updateAnimation = () => {
      clearTimeout(timeoutId);
      if (prefersReducedMotion || connection?.saveData) {
        setCanRenderWaveGrid(false);
        return;
      }
      timeoutId = setTimeout(() => setCanRenderWaveGrid(true), 180);
    };

    updateAnimation();
    connection?.addEventListener?.("change", updateAnimation);

    return () => {
      clearTimeout(timeoutId);
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

export default function Hero({ t, onAnchorNavigate }) {
  const headlineText = t("home.hero.headline");
  const taglineText = t("home.hero.tagline");

  return (
    <section className="hero-stage">
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
          <a className="hero-stage__next" href="#kompetenzen" aria-label={t("home.hero.nextAria")} onClick={(event) => onAnchorNavigate(event, "#kompetenzen")}>
            <span>{t("home.hero.next")}</span>
            <ArrowDown className="hero-stage__next-icon" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
