import { HelpCircle } from "lucide-react";
import "./FaqSection.css";

export default function FaqSection({ t, revealProps }) {
  const faqs = t("home.faq.items");

  return (
    <section className="faq-section" {...revealProps("left", 0, 760, "1.25rem")}>
      <div className="faq-section__inner">
        <header className="faq-section__header" {...revealProps("up", 90, 760, "0.95rem")}>
          <h2 className="home-section-title faq-section__title">{t("home.faq.title")}</h2>
          <p className="faq-section__intro">
            {t("home.faq.intro")}
          </p>
        </header>
        <ul className="faq-list">
          {faqs.map((item, index) => (
            <li key={item.question}>
              <details className="faq-item" open={index === 0} {...revealProps("up", 150 + index * 70, 720, "0.85rem")}>
                <summary>
                  <HelpCircle className="faq-item__icon" aria-hidden="true" />
                  <span>{item.question}</span>
                </summary>
                <p>{item.answer}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
