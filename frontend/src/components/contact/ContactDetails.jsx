import React from "react";

// These public personal details are intentionally retained only on the contact page.
export default function ContactDetails({ language }) {
  return (
    <address className="mx-auto mt-8 max-w-4xl rounded-xl border border-stone-300 bg-white/80 p-5 not-italic text-stone-800">
      <h2 className="text-xl font-bold">{{ de: "Direkter Kontakt", ru: "Прямой контакт", uk: "Прямий контакт" }[language] || "Direkter Kontakt"}</h2>
      <p className="mt-3 font-semibold">Eugen Beirit</p>
      <p>Großer Katthagen 13 · 38350 Helmstedt</p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <a className="underline" href="mailto:kontakt@beirit.digital">kontakt@beirit.digital</a>
        <a className="underline" href="tel:+4953515989191">+49 5351 5989191</a>
        <a className="underline" href="https://wa.me/491621892884" target="_blank" rel="noopener noreferrer">WhatsApp Business</a>
      </div>
    </address>
  );
}
