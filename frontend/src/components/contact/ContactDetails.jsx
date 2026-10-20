import React from "react";
import ContactIcon from "./ContactIcon.jsx";

const labels = {
  de: { title: "Direkter Kontakt", email: "E-Mail", phone: "Telefon" },
  ru: { title: "Прямой контакт", email: "Электронная почта", phone: "Телефон" },
  uk: { title: "Прямий контакт", email: "Електронна пошта", phone: "Телефон" },
};

// These public personal details are intentionally retained only on the contact page.
const contactMethods = [
  { icon: "email", label: "email", href: "mailto:eugenbeirit22@gmail.com", text: "eugenbeirit22@gmail.com" },
  { icon: "phone", label: "phone", href: "tel:+4953515989191", text: "+49 5351 5989191" },
  { icon: "message", label: "WhatsApp", href: "https://wa.me/491621892884", text: "WhatsApp Business", external: true },
];

export default function ContactDetails({ language }) {
  const copy = labels[language] || labels.de;
  return (
    <aside className="contact-details" aria-labelledby="contact-details-title">
      <h2 id="contact-details-title">{copy.title}</h2>
      <address>
        <div className="contact-details__owner">
          <img src="/static/images/eugenbeirit-360.webp" alt="" width="72" height="88" loading="lazy" decoding="async" />
          <div>
            <p className="contact-details__name">Eugen Beirit</p>
            <p className="contact-details__address">Großer Katthagen 13 · 38350 Helmstedt</p>
          </div>
        </div>
        <div className="contact-details__methods">
          {contactMethods.map(({ icon, label, href, text, external }) => (
            <div className="contact-details__method" key={icon}>
              <span className={`contact-details__icon contact-details__icon--${icon}`}><ContactIcon name={icon} /></span>
              <div>
                <span className="contact-details__label">{copy[label] || label}</span>
                <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{text}</a>
              </div>
            </div>
          ))}
        </div>
      </address>
    </aside>
  );
}
