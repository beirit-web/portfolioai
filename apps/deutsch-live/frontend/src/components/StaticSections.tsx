import { useEffect, useState } from "react";
import { fetchPageContent, type PageContent } from "../api";
import { ui } from "../i18n";

export function FeatureCards() {
  return (
    <section id="features" className="mt-10 grid gap-5 md:grid-cols-3">
      {ui.manual.featureCards.map((card) => (
        <article className="soft-card glass rounded-xl p-3 sm:rounded-3xl sm:p-6" key={card.title}>
          <div className="mb-4 text-4xl">{card.icon}</div>
          <h3 className="text-xl font-black">{card.title}</h3>
          <p className="mt-3 text-slate-700 dark:text-slate-300">{card.text}</p>
        </article>
      ))}
    </section>
  );
}

export function DemoSections() {
  return (
    <>
      <section id="demo" className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-xl px-1 py-3 sm:rounded-[2rem] sm:p-8">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
            {ui.manual.demoEyebrow}
          </p>
          <h2 className="text-3xl font-black">{ui.manual.demoTitle}</h2>
          <p className="mt-4 text-slate-700 dark:text-slate-300">
            {ui.manual.demoText}
          </p>

          <div className="mt-6 space-y-4">
            <DialogLine speaker={ui.manual.dialogSeller} de="Guten Morgen! Was darf es sein?" ru={ui.manual.dialogLine1Ru} />
            <DialogLine
              accent
              speaker={ui.manual.dialogCustomer}
              de="Ich hätte gern zwei Brötchen und einen Kaffee."
              ru={ui.manual.dialogLine2Ru}
            />
            <DialogLine speaker={ui.manual.dialogSeller} de="Zum Mitnehmen?" ru={ui.manual.dialogLine3Ru} />
          </div>
        </div>

        <div className="glass rounded-xl px-1 py-3 sm:rounded-[2rem] sm:p-8">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-purple-600 dark:text-purple-300">
            {ui.manual.personalizationEyebrow}
          </p>
          <h2 className="text-3xl font-black">{ui.manual.personalizationTitle}</h2>
          <div className="mt-6 space-y-4 text-slate-700 dark:text-slate-300">
            {ui.manual.personalizationQuestions.map((question) => (
              <p className="rounded-xl border border-white/50 p-3 sm:rounded-3xl sm:p-5 dark:border-slate-700" key={question}>
                {question}
              </p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function SceneLibrary() {
  const [content, setContent] = useState<PageContent | null>(null);

  useEffect(() => {
    fetchPageContent().then(setContent).catch(() => setContent(null));
  }, []);

  return (
    <>
      <section className="glass mt-10 rounded-xl px-1 py-3 sm:rounded-[2rem] sm:p-8">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
          {ui.manual.projectScenesEyebrow}
        </p>
        <h2 className="text-3xl font-black">{ui.manual.projectScenesTitle}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(content?.scenes ?? ui.manual.defaultScenes).map((scene) => (
            <span className="rounded-2xl bg-white/70 px-5 py-4 font-semibold dark:bg-slate-900/70" key={scene}>
              {scene}
            </span>
          ))}
        </div>
      </section>

      <section className="glass mt-10 rounded-xl px-1 py-3 sm:rounded-[2rem] sm:p-8">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
          {ui.manual.sceneLibraryEyebrow}
        </p>
        <h2 className="text-3xl font-black">{ui.manual.sceneLibraryTitle}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(content?.library ?? []).map((item) => (
            <article className="dialog-card soft-card rounded-xl bg-white/75 p-3 sm:rounded-3xl sm:p-5 dark:bg-slate-900/70" key={item.title}>
              <p className="text-3xl">{item.icon}</p>
              <h3 className="mt-3 text-xl font-black">{item.title}</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export function BakeryModule() {
  return (
    <>
      <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass rounded-xl px-1 py-3 sm:rounded-[2rem] sm:p-8 fade-in-up">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
            {ui.manual.moduleEyebrow}
          </p>
          <h2 className="text-3xl font-black">{ui.manual.moduleTitle}</h2>
          <p className="mt-4 text-slate-700 dark:text-slate-300">
            {ui.manual.moduleText}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoCard title={ui.manual.phraseLabel} heading="Ich hätte gern …" text={ui.manual.phraseText} />
            <InfoCard title={ui.sceneLearning.pronunciation} heading={ui.manual.pronunciationExample} text={ui.manual.pronunciationExampleText} purple />
          </div>
        </div>

        <div className="glass rounded-xl px-1 py-3 sm:rounded-[2rem] sm:p-8 fade-in-up">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-pink-600 dark:text-pink-300">
            {ui.manual.exerciseEyebrow}
          </p>
          <h2 className="text-3xl font-black">{ui.manual.exerciseTitle}</h2>
          <div className="mt-5 space-y-3">
            {["🥐 zwei Brötchen", "☕ einen Kaffee", "🍰 ein Stück Kuchen", "🥖 ein Brot"].map((item) => (
              <p className="pill" key={item}>{item}</p>
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-cyan-500/15 p-3 sm:rounded-3xl sm:p-5">
            <p className="font-bold">{ui.manual.templateLabel}</p>
            <p className="mt-2 text-xl font-black">Ich hätte gern ________.</p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{ui.manual.templateTask}</p>
          </div>
        </div>
      </section>

      <section className="glass mt-10 rounded-xl px-1 py-3 sm:rounded-[2rem] sm:p-8">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">
          {ui.manual.bigModuleEyebrow}
        </p>
        <h2 className="text-3xl font-black">{ui.manual.bigModuleTitle}</h2>
        <p className="mt-4 max-w-4xl text-slate-700 dark:text-slate-300">
          {ui.manual.bigModuleText}
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ui.manual.bakerySteps.map(([step, title, text]) => (
            <article className="rounded-xl bg-white/75 p-3 sm:rounded-3xl sm:p-5 dark:bg-slate-900/70" key={step}>
              <p className="text-3xl">{step}</p>
              <h3 className="mt-3 font-black">{title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function DialogLine({ speaker, de, ru, accent = false }: { speaker: string; de: string; ru: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 sm:rounded-3xl sm:p-5 ${accent ? "bg-cyan-500/15" : "bg-white/75 dark:bg-slate-900/70"}`}>
      <p className="text-sm font-semibold text-slate-500">{speaker}</p>
      <p className="mt-1 text-xl font-bold">🥨 {de}</p>
      <p className="mt-2 text-slate-600 dark:text-slate-300">🪆 {ru}</p>
    </div>
  );
}

function InfoCard({ title, heading, text, purple = false }: { title: string; heading: string; text: string; purple?: boolean }) {
  return (
    <div className="rounded-xl bg-white/75 p-3 sm:rounded-3xl sm:p-5 dark:bg-slate-900/70">
      <p className={`text-sm font-bold ${purple ? "text-purple-700 dark:text-purple-300" : "text-cyan-700 dark:text-cyan-300"}`}>
        {title}
      </p>
      <p className="mt-2 text-xl font-black">{heading}</p>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  );
}
