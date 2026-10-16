import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Bus,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  Home,
  Landmark,
  MessageSquareText,
  Package,
  Pill,
  School,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trophy,
  UserPlus,
  WalletCards
} from "lucide-react";
import type { ReactNode } from "react";
import { learning, ui } from "../i18n";

type LandingPageProps = {
  navigate: (path: string) => void;
};

const sceneCards = [
  { icon: ShoppingBag, progress: 82 },
  { icon: ShoppingCart, progress: 12 },
  { icon: HeartPulse, progress: 18 },
  { icon: Pill, progress: 10 },
  { icon: Building2, progress: 12 },
  { icon: Landmark, progress: 8 },
  { icon: Home, progress: 8 },
  { icon: BriefcaseBusiness, progress: 6 },
  { icon: School, progress: 5 },
  { icon: WalletCards, progress: 4 },
  { icon: Bus, progress: 6 },
  { icon: Package, progress: 3 }
];

const dailyWords = ["Brötchen", "Brezel", "Kasse", "bezahlen"];

export default function LandingPage({ navigate }: LandingPageProps) {
  return (
    <>
      <section className="premium-hero">
        <div className="premium-hero__content">
          <div className="premium-kicker">
            <Sparkles className="h-4 w-4" />
            {ui.landing.eyebrow}
          </div>
          <h2>{ui.landing.headline}</h2>
          <p>{ui.landing.heroText}</p>
          <p className="premium-hero__subcopy">{ui.landing.description}</p>
          <div className="hero-situation-list" aria-label={ui.landing.heroSituationLabel}>
            {ui.landing.heroSituations.map((situation) => (
              <span key={situation}>{situation}</span>
            ))}
          </div>
          <div className="premium-hero__actions">
            <button className="premium-button premium-button--primary" onClick={() => navigate("/learn")} type="button">
              {ui.common.startNow}
              <ArrowRight className="h-5 w-5" />
            </button>
            <button className="premium-button premium-button--secondary" onClick={() => navigate("/learn")} type="button">
              {ui.common.tryScene}
            </button>
          </div>
          <div className="premium-proof">
            <span><CheckCircle2 className="h-4 w-4" /> {ui.landing.proofAvailable}</span>
            <span><ShieldCheck className="h-4 w-4" /> {ui.landing.proofAccount}</span>
            <span><BookOpen className="h-4 w-4" /> {ui.landing.proofModes}</span>
          </div>
          <div className="hero-learning-flow" aria-label={ui.landing.learningFlowLabel}>
            {ui.landing.learningFlow.map((outcome, index) => (
              <span key={outcome}>
                <strong>{index + 1}</strong>
                {outcome}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-product-preview" aria-label={ui.landing.learningPreviewLabel}>
          <div className="preview-card preview-card--scene">
            <p className="preview-label">{ui.landing.scenePreviewLabel} · {learning.bakery.germanTitle}</p>
            <h3>{ui.landing.firstBakeryOrder}</h3>
            <div className="dialogue-preview">
              <p className="dialogue-preview__seller"><strong>Verkäuferin</strong> Guten Morgen! Was darf es sein?</p>
              <p className="dialogue-preview__learner"><strong>{ui.landing.learnerLabel}</strong> Ich hätte gern zwei Brötchen und einen Kaffee.</p>
            </div>
          </div>
          <div className="preview-grid">
            <div className="preview-card">
              <p className="preview-label">{ui.landing.todayLabel}</p>
              <h3>{ui.landing.todayValue}</h3>
              <span>{ui.landing.todaySummary}</span>
            </div>
            <div className="preview-card">
              <p className="preview-label">{ui.landing.progressLabel}</p>
              <h3>82%</h3>
              <div className="progress-track progress-track--hero"><span style={{ width: "82%" }} /></div>
              <span>Bäckerei</span>
            </div>
          </div>
        </div>
      </section>

      <section className="premium-section premium-section--intro">
        <div>
          <p className="section-kicker">{ui.landing.journeyKicker}</p>
          <h2>{ui.landing.journeyTitle}</h2>
        </div>
        <div className="journey-grid">
          {ui.landing.journeySteps.map((step, index) => {
            const icons = [<BookOpen />, <ClipboardCheck />, <Trophy />, <MessageSquareText />];
            return <JourneyStep icon={icons[index]} key={step.title} title={step.title} text={step.text} />;
          })}
        </div>
      </section>

      <section className="premium-section">
        <div className="section-heading">
          <p className="section-kicker">{ui.landing.sceneTopicsKicker}</p>
          <h2>{ui.landing.sceneTopicsTitle}</h2>
          <p>{ui.landing.sceneTopicsText}</p>
        </div>
        <div className="scene-card-grid">
          {sceneCards.map((scene, index) => (
            <SceneCard key={ui.landing.sceneCards[index].title} {...scene} {...ui.landing.sceneCards[index]} />
          ))}
        </div>
      </section>

      <section className="premium-section product-dashboard-preview">
        <div className="section-heading">
          <p className="section-kicker">{ui.landing.dashboardKicker}</p>
          <h2>{ui.landing.dashboardTitle}</h2>
          <p>{ui.landing.dashboardText}</p>
        </div>
        <div className="dashboard-preview-grid">
          <div className="dashboard-preview-main">
            <p className="preview-label">{ui.landing.nextStepLabel}</p>
            <h3>{ui.landing.nextStepTitle}</h3>
            <p>{ui.landing.nextStepText}</p>
            <div className="progress-track"><span style={{ width: "64%" }} /></div>
            <div className="achievement-preview">
              <span>{ui.landing.xpGain}</span>
              <span>{ui.landing.newWords}</span>
              <span>{ui.landing.nextSceneUnlocked}</span>
            </div>
          </div>
          <MiniMetric label={ui.landing.streakLabel} value={ui.landing.streakValue} />
          <MiniMetric label={ui.landing.pointsLabel} value={ui.landing.pointsValue} />
          <MiniMetric label={ui.landing.wordsLabel} value={ui.landing.wordsValue} />
        </div>
      </section>

      <section className="premium-section feature-split">
        <div>
          <p className="section-kicker">{ui.landing.practiceKicker}</p>
          <h2>{ui.landing.practiceTitle}</h2>
          <p>{ui.landing.practiceText}</p>
        </div>
        <div className="feature-panel-grid">
          <FeaturePanel icon={<Trophy />} title={ui.landing.moduleQuiz} text={ui.landing.moduleQuizText} />
          <FeaturePanel icon={<MessageSquareText />} title={ui.landing.moduleWriting} text={ui.landing.moduleWritingText} />
        </div>
      </section>

      <section className="premium-section feature-split">
        <div>
          <p className="section-kicker">{ui.landing.whyKicker}</p>
          <h2>{ui.landing.whyTitle}</h2>
        </div>
        <div className="feature-panel-grid">
          {ui.landing.whyItems.map((item) => (
            <FeaturePanel key={item.title} icon={<CheckCircle2 />} title={item.title} text={item.text} />
          ))}
        </div>
      </section>

      <section className="premium-section words-section">
        <div>
          <p className="section-kicker">{ui.landing.dailyWordsKicker}</p>
          <h2>{ui.landing.dailyWordsTitle}</h2>
        </div>
        <div className="daily-word-grid">
          {dailyWords.map((word) => (
            <span key={word}>{word}</span>
          ))}
        </div>
      </section>

      <section className="premium-section trust-section">
        <div>
          <p className="section-kicker">{ui.landing.trustKicker}</p>
          <h2>{ui.landing.trustTitle}</h2>
        </div>
        <div className="trust-grid">
          {ui.landing.trustItems.map((item) => (
            <p key={item}>
              <ShieldCheck className="h-5 w-5" />
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="premium-register-band">
        <div>
          <p className="section-kicker">{ui.landing.registrationKicker}</p>
          <h2>{ui.landing.accountOptionalText}</h2>
          <p>{ui.landing.registrationText}</p>
        </div>
        <div className="register-actions">
          <button className="premium-button premium-button--primary" onClick={() => navigate("/learn")} type="button">
            {ui.common.tryScene}
            <ArrowRight className="h-5 w-5" />
          </button>
          <button className="premium-button premium-button--secondary" onClick={() => navigate("/account")} type="button">
            <UserPlus className="h-5 w-5" />
            {ui.account.createAccount}
          </button>
        </div>
      </section>

      <section className="premium-section faq-section">
        <div className="section-heading">
          <p className="section-kicker">FAQ</p>
          <h2>{ui.landing.faqTitle}</h2>
        </div>
        <div className="faq-grid">
          {ui.landing.faqItems.map(([question, answer]) => (
            <article className="faq-card" key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function JourneyStep({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="journey-step">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function SceneCard({ icon: Icon, title, text, progress, status }: typeof sceneCards[number] & { title: string; text: string; status: string }) {
  return (
    <article className="scene-card">
      <div className="scene-card__top">
        <div className="scene-card__icon">
          <Icon className="h-6 w-6" />
        </div>
        <span>{status}</span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="scene-card__progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <strong>{progress}%</strong>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-metric">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function FeaturePanel({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="feature-panel">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
