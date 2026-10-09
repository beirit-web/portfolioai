import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

function TechnologyCloud({ t }) {
  const points = t("home.tech.points");
  const pointDetails = t("home.tech.pointDetails");
  const [activePoint, setActivePoint] = useState(null);
  const cloudRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (cloudRef.current?.contains(event.target)) return;
      setActivePoint(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setActivePoint(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <section className="tech-logo-cloud" aria-label={t("home.tech.stackAria")} ref={cloudRef}>
      <ul className="tech-logo-grid">
        {points.map((point, index) => {
          const tooltipId = `tech-logo-tooltip-${index}`;
          const isActive = activePoint === point;
          const detail = pointDetails?.[index] || point;

          return (
            <li key={point}>
              <button
                type="button"
                className={`tech-logo-pill${isActive ? " is-active" : ""}`}
                aria-expanded={isActive}
                aria-describedby={tooltipId}
                onClick={() => setActivePoint(isActive ? null : point)}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span><strong>{point}</strong></span>
                <span id={tooltipId} className="tech-logo-pill__tooltip" role="tooltip">
                  {detail}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function TechnologyProofSection({ t, revealProps }) {
  return (
    <section className="tech-proof-section" aria-labelledby="tech-proof-title" {...revealProps("up", 0, 720, "0.8rem")}>
      <article className="tech-proof-panel">
        <header className="tech-proof-copy">
          <p>{t("home.tech.kicker")}</p>
          <p className="tech-proof-copy__lead">{t("home.tech.selectionIntro")}</p>
          <h2 id="tech-proof-title">{t("home.tech.title")}</h2>
          <p>{t("home.tech.intro")}</p>
        </header>
        <TechnologyCloud t={t} />
      </article>
    </section>
  );
}
