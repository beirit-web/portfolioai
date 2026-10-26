const sections = [
  {
    title: "Angaben gemäß § 5 DDG",
    items: [
      "Beirit Digital",
      "Max Mustermann",
      "Musterstraße 1",
      "12345 Musterstadt",
      "Deutschland"
    ]
  },
  {
    title: "Kontakt",
    items: ["E-Mail: max.mustermann@example.com"]
  },
  {
    title: "Verantwortlich nach § 18 Abs. 2 MStV",
    items: [
      "Max Mustermann",
      "Beirit Digital",
      "Musterstraße 1",
      "12345 Musterstadt",
      "Deutschland"
    ]
  }
];

export default function ImpressumPage() {
  return (
    <article lang="de" className="glass legal-page rounded-xl px-3 py-5 sm:rounded-[2rem] sm:p-8 lg:p-10">
      <p className="text-sm font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">
        Beirit Digital
      </p>
      <div className="mt-4 max-w-3xl">
        <h2 className="text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
          Impressum
        </h2>
        <p className="mt-4 text-lg leading-8 text-slate-700 dark:text-slate-300">
          Fiktive Musterangaben für die Portfolio-Demonstration.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {sections.map((section) => (
          <section className="rounded-xl bg-white/75 p-4 shadow-sm shadow-slate-900/5 dark:bg-slate-900/70" key={section.title}>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">{section.title}</h3>
            <div className="mt-4 space-y-2 text-slate-700 dark:text-slate-300">
              {section.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <LegalText title="Haftung für Inhalte">
          Für die eigenen Inhalte dieser Website ist der Betreiber nach den allgemeinen gesetzlichen Vorschriften
          verantwortlich. Die Inhalte dieser Lernplattform werden sorgfältig vorbereitet, ersetzen aber keine individuelle
          Beratung.
        </LegalText>

        <LegalText title="Haftung für Links">
          Diese Plattform kann Links zu externen Websites enthalten. Für deren Inhalte sind ausschließlich die jeweiligen
          Betreiber verantwortlich. Bei Bekanntwerden rechtswidriger Inhalte werden entsprechende Links geprüft und entfernt.
        </LegalText>

        <LegalText title="Urheberrecht">
          Die auf dieser Plattform erstellten Inhalte, Texte, Übungen, Designs und Lernmaterialien unterliegen dem deutschen
          Urheberrecht. Eine Nutzung außerhalb der vorgesehenen Lernfunktionen braucht eine vorherige Zustimmung.
        </LegalText>

        <LegalText title="Hinweis zur Lernplattform">
          Die von Beirit Digital bereitgestellte Lernplattform unterstützt russischsprachige Nutzer beim Erlernen der
          deutschen Sprache anhand realitätsnaher Alltagssituationen in Deutschland. Die Inhalte dienen ausschließlich
          Lern- und Informationszwecken und ersetzen keine Rechtsberatung, medizinische Beratung oder behördliche Auskunft.
        </LegalText>
      </div>

      <section className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/80 p-4 text-slate-800 dark:border-indigo-500/30 dark:bg-indigo-950/30 dark:text-slate-200">
        <h3 className="text-lg font-black">Streitbeilegung</h3>
        <p className="mt-2 leading-7">
          Der Betreiber ist nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </section>
    </article>
  );
}

function LegalText({ title, children }: { title: string; children: string }) {
  return (
    <section className="rounded-xl bg-white/70 p-4 shadow-sm shadow-slate-900/5 dark:bg-slate-900/70">
      <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-3 leading-7 text-slate-700 dark:text-slate-300">{children}</p>
    </section>
  );
}
