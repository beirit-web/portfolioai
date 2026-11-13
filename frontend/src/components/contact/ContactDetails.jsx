import React from "react";

const labels = {
  de: { title: "Kontakt", name: "Eugen" },
  ru: { title: "Контакт", name: "Евгений" },
  uk: { title: "Контакт", name: "Євген" },
};

export default function ContactDetails({ language }) {
  const copy = labels[language] || labels.de;
  return (
    <aside className="contact-details" aria-labelledby="contact-details-title">
      <h2 id="contact-details-title">{copy.title}</h2>
      <address>
        <div className="contact-details__owner">
          <img src="/static/images/eugen-360.webp" alt="" width="72" height="88" loading="lazy" decoding="async" />
          <div>
            <p className="contact-details__name">{copy.name}</p>
          </div>
        </div>
      </address>
    </aside>
  );
}
