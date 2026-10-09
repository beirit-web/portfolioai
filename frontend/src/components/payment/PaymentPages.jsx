import React from "react";
import { BadgeEuro, Info } from "lucide-react";

const sampleRequests = [
  { id: "demo-001", reference: "MUSTER-001", title: "Beispielprojekt Website", amount: "120.00", currency: "EUR" },
  { id: "demo-002", reference: "MUSTER-002", title: "Beispielprojekt Software", amount: "80.00", currency: "EUR" },
];

function PageHero({ title, intro, language }) {
  return (
    <section className="page-hero mx-auto max-w-7xl px-3 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-36 lg:px-10 xl:max-w-[92rem] 2xl:max-w-[104rem]">
      <p className="eyebrow">{language === "ru" ? "Демонстрация портфолио" : "Portfolio-Demonstration"}</p>
      <h1 className="mt-3 max-w-6xl font-display text-4xl leading-tight sm:text-6xl lg:text-7xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-stone-700 sm:text-lg">{intro}</p>
    </section>
  );
}

function DemoNotice({ language }) {
  return (
    <div className="pricing-note-banner flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold leading-6 text-amber-950" role="status">
      <Info className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{language === "ru"
        ? "Только вымышленные примеры. Оплата и пожертвования отключены; PayPal не подключается."
        : "Nur fiktive Musterdaten. Zahlungen und Spenden sind deaktiviert; es besteht keine Verbindung zu PayPal."}</span>
    </div>
  );
}

export function PaymentResultPage({ language, onNavigate }) {
  return (
    <>
      <PageHero
        language={language}
        title={language === "ru" ? "Демонстрация результата" : "Demonstration einer Ergebnisansicht"}
        intro={language === "ru" ? "Платеж не выполнялся. Эта страница показывает интерфейс проекта." : "Es wurde keine Zahlung ausgeführt. Diese Seite zeigt die Oberfläche des Projekts."}
      />
      <section className="mx-auto max-w-4xl px-3 pb-16 sm:px-8 lg:px-10">
        <DemoNotice language={language} />
        <a href="/zahlung" className="portfolio-contact-button mt-6" onClick={(event) => {
          event.preventDefault();
          onNavigate("/zahlung");
        }}>{language === "ru" ? "К демонстрации" : "Zur Zahlungsdemonstration"}</a>
      </section>
    </>
  );
}

export default function PaymentPage({ language }) {
  const [selectedId, setSelectedId] = React.useState(sampleRequests[0].id);
  const selectedRequest = sampleRequests.find((item) => item.id === selectedId) || sampleRequests[0];

  return (
    <>
      <PageHero
        language={language}
        title={language === "ru" ? "Пример интерфейса оплаты" : "Beispiel einer Zahlungsoberfläche"}
        intro={language === "ru" ? "Счета и суммы ниже вымышлены и служат демонстрации портфолио." : "Die folgenden Rechnungen und Beträge sind fiktiv und dienen der Portfolio-Demonstration."}
      />
      <section className="mx-auto grid max-w-7xl gap-5 px-3 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:px-10">
        <div className="price-card reveal-card">
          <h2 className="text-2xl font-bold leading-8">{language === "ru" ? "Выбрать пример" : "Musterrechnung auswählen"}</h2>
          <label className="mt-5 block">
            <span className="text-sm font-bold text-stone-700">{language === "ru" ? "Пример счета" : "Musterrechnung"}</span>
            <select className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 bg-white px-3 font-semibold text-stone-950" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {sampleRequests.map((item) => <option key={item.id} value={item.id}>{item.reference} – {item.title} – {item.amount} {item.currency}</option>)}
            </select>
          </label>
          <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-bold uppercase text-stone-500">{selectedRequest.reference}</p>
            <h3 className="mt-2 text-xl font-bold">{selectedRequest.title}</h3>
            <p className="mt-4 text-3xl font-black">{selectedRequest.amount} {selectedRequest.currency}</p>
          </div>
          <button type="button" className="portfolio-contact-button paypal-checkout-button mt-6 w-full justify-center" disabled>
            <BadgeEuro className="h-5 w-5" aria-hidden="true" />
            {language === "ru" ? "PayPal отключён — демонстрация" : "PayPal deaktiviert – Portfolio-Demo"}
          </button>
        </div>
        <aside className="price-card reveal-card">
          <h2 className="mb-4 text-xl font-bold leading-7">{language === "ru" ? "Демонстрационный режим" : "Demonstrationsmodus"}</h2>
          <DemoNotice language={language} />
          <p className="mt-4 text-sm leading-7 text-stone-700">{language === "ru"
            ? "Можно просмотреть интерфейс и выбрать пример счета. Реальные счета, платежные данные и платежные ссылки не используются."
            : "Sie können die Oberfläche ansehen und zwischen Musterrechnungen wechseln. Echte Rechnungen, Zahlungsdaten und Zahlungslinks werden nicht verwendet."}</p>
        </aside>
      </section>
    </>
  );
}
