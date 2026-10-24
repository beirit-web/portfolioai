import { ArrowDown, ArrowRight, Check, ChevronDown, Globe2, LockKeyhole, ShoppingBag } from "lucide-react";
import type { MouseEvent } from "react";
import { getLocale, ui } from "../i18n";
import { withBase } from "../lib/paths";
import { BakeryIllustration, LearningIllustration } from "./LearningIllustrations";
import "./LandingPage.css";

type LandingPageProps = { navigate: (path: string) => void };
const stepIllustrations = ["dialogue", "practice", "quiz"] as const;

export default function LandingPage({ navigate }: LandingPageProps) {
  const copy = ui.landing;
  const isRussian = getLocale() === "ru";

  function followRoute(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(path);
  }

  return (
    <div className="dl-landing">
      <section className="premium-hero dl-hero" aria-labelledby="landing-title">
        <div className="dl-hero__copy">
          <p className="dl-eyebrow"><span className="dl-live-dot" />{copy.eyebrow}</p>
          <h1 id="landing-title">{copy.headline}{" "}<span>{copy.headlineAccent}</span></h1>
          <p className="dl-hero__intro">{copy.heroText}</p>
          <a className="dl-button dl-button--primary" href={withBase("/learn")} onClick={event => followRoute(event, "/learn")}>
            {copy.startScene}<ArrowRight aria-hidden="true" size={19} />
          </a>
          <p className="dl-hero__note"><Check aria-hidden="true" size={16} />{copy.startNote}</p>
          <a className="dl-text-link" href="#lernweg">{copy.howItWorks}<ArrowDown aria-hidden="true" size={16} /></a>
        </div>

        <figure className="dl-scene-preview">
          <div className="dl-scene-preview__label"><span>01</span>{copy.scenePreviewLabel}</div>
          <BakeryIllustration className="dl-bakery-art" />
          <figcaption>
            <span className="dl-dialogue__speaker">{copy.seller}</span>
            <p className="dl-dialogue dl-dialogue--seller" lang="de">Guten Morgen! Was darf es sein?</p>
            <span className="dl-dialogue__speaker dl-dialogue__speaker--learner">{copy.learner}</span>
            <p className="dl-dialogue dl-dialogue--learner" lang="de">Ich hätte gern zwei Brötchen und einen Kaffee.</p>
            {isRussian && <p className="dl-dialogue__translation" lang="ru">{copy.dialogueTranslation}</p>}
          </figcaption>
        </figure>
      </section>

      <section className="dl-section dl-learning-path" id="lernweg" aria-labelledby="learning-path-title">
        <div className="dl-section-heading">
          <p className="dl-eyebrow">{copy.journeyKicker}</p>
          <h2 id="learning-path-title">{copy.journeyTitle}</h2>
          <p>{copy.journeyText}</p>
        </div>
        <ol className="dl-steps">
          {copy.journeySteps.map((step, index) => (
            <li className="dl-step" key={step.title}>
              <div className="dl-step__visual">
                <span className="dl-step__number" aria-hidden="true">0{index + 1}</span>
                <LearningIllustration kind={stepIllustrations[index]} className="dl-step__art" />
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="dl-section dl-topics" aria-labelledby="topics-title">
        <div className="dl-section-heading">
          <p className="dl-eyebrow">{copy.topicsKicker}</p>
          <h2 id="topics-title">{copy.topicsTitle}</h2>
          <p>{copy.topicsText}</p>
        </div>
        <a className="dl-available-scene" href={withBase("/learn")} onClick={event => followRoute(event, "/learn")}>
          <span className="dl-available-scene__icon"><ShoppingBag aria-hidden="true" size={30} /></span>
          <div className="dl-available-scene__body">
            <span className="dl-status"><span className="dl-live-dot" />{copy.available}</span>
            <h3>{copy.bakeryTitle}</h3>
            <span className="dl-available-scene__description">{copy.bakeryText}</span>
            <span className="dl-available-scene__words" lang="de">Brötchen <span aria-hidden="true">·</span> Kaffee <span aria-hidden="true">·</span> bitte <span aria-hidden="true">·</span> danke</span>
          </div>
          <ArrowRight className="dl-available-scene__arrow" aria-hidden="true" size={22} />
        </a>
        <details className="dl-upcoming">
          <summary>{copy.upcomingTitle}<span className="dl-upcoming__count" aria-hidden="true">{copy.upcomingTopics.length}</span><ChevronDown aria-hidden="true" size={18} /></summary>
          <div className="dl-upcoming__content">
            <p>{copy.upcomingNote}</p>
            <ul>{copy.upcomingTopics.map(topic => <li key={topic}>{topic}</li>)}</ul>
          </div>
        </details>
      </section>

      <aside className="dl-reassurance" aria-label={copy.reassuranceLabel}>
        <p><Globe2 aria-hidden="true" size={21} /><span>{copy.languageNote}</span></p>
        <p><LockKeyhole aria-hidden="true" size={21} /><span>{copy.accountNote}<a href={withBase("/account")} onClick={event => followRoute(event, "/account")}>{copy.accountLink}<ArrowRight aria-hidden="true" size={15} /></a></span></p>
      </aside>

      <section className="dl-section dl-faq" aria-labelledby="faq-title">
        <div className="dl-section-heading">
          <p className="dl-eyebrow">{copy.faqKicker}</p>
          <h2 id="faq-title">{copy.faqTitle}</h2>
        </div>
        <div className="dl-faq__items">
          {copy.faqItems.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<ChevronDown aria-hidden="true" size={19} /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="dl-start" aria-labelledby="start-title">
        <span className="dl-start__decoration" aria-hidden="true">„</span>
        <div><p className="dl-eyebrow">{copy.finalKicker}</p><h2 id="start-title">{copy.finalTitle}</h2><p>{copy.finalText}</p></div>
        <a className="dl-button dl-button--primary" href={withBase("/learn")} onClick={event => followRoute(event, "/learn")}>{copy.startScene}<ArrowRight aria-hidden="true" size={19} /></a>
      </section>
    </div>
  );
}
