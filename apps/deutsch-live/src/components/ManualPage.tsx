import FeedbackForm from "./FeedbackForm";
import { BakeryModule, DemoSections, SceneLibrary } from "./StaticSections";
import { ui } from "../i18n";

const articleHelpColumns = [
  {
    key: "der",
    title: "Der",
    article: "maskulin",
    tone:
      "from-sky-50 to-white border-sky-200 text-sky-800 dark:from-sky-950/50 dark:to-slate-950/40 dark:border-sky-800/60 dark:text-sky-100",
    chipTone: "bg-sky-50 text-sky-950 ring-sky-100 dark:bg-sky-950/70 dark:text-sky-100 dark:ring-sky-800/70",
    items: [
      "Männliche Personen, Tiere, Berufe",
      "Tage und Monate",
      "Jahreszeiten, Himmelsrichtungen",
      "Alkohol",
      "-ling",
      "-or",
      "-us",
      "-er"
    ]
  },
  {
    key: "die",
    title: "Die",
    article: "feminin",
    tone:
      "from-rose-50 to-white border-rose-200 text-rose-800 dark:from-rose-950/45 dark:to-slate-950/40 dark:border-rose-800/60 dark:text-rose-100",
    chipTone: "bg-rose-50 text-rose-950 ring-rose-100 dark:bg-rose-950/70 dark:text-rose-100 dark:ring-rose-800/70",
    items: [
      "Weibliche Personen, Tiere, Berufe",
      "-ei",
      "-heit, -keit",
      "-schaft",
      "-ung",
      "-tät, -ik",
      "-ur",
      "-ion",
      "-e"
    ]
  },
  {
    key: "das",
    title: "Das",
    article: "neutral",
    tone:
      "from-emerald-50 to-white border-emerald-200 text-emerald-800 dark:from-emerald-950/45 dark:to-slate-950/40 dark:border-emerald-800/60 dark:text-emerald-100",
    chipTone:
      "bg-emerald-50 text-emerald-950 ring-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-100 dark:ring-emerald-800/70",
    items: ["-chen", "-lein", "-erl", "-ment", "-nis", "-um", "Infinitiv"]
  }
] as const;

function ArticleHelp() {
  return (
    <section className="glass mt-10 rounded-xl p-3 sm:rounded-3xl sm:p-6" aria-labelledby="article-help-title">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
        {ui.manual.articleHelpEyebrow}
      </p>
      <div className="mt-3 max-w-3xl">
        <h3 className="text-2xl font-black" id="article-help-title">
          {ui.manual.articleHelpTitle}
        </h3>
        <p className="mt-2 text-slate-700 dark:text-slate-300">{ui.manual.articleHelpText}</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {articleHelpColumns.map((column) => (
          <article
            lang="de"
            className={`overflow-hidden rounded-xl border bg-gradient-to-b shadow-lg shadow-slate-900/5 ${column.tone}`}
            key={column.key}
          >
            <div className="border-b border-current/10 px-4 py-4 text-center">
              <div>
                <h4 className="text-4xl font-black leading-none sm:text-5xl">{column.title}</h4>
                <p className="mt-2 text-sm font-bold uppercase tracking-[0.16em] opacity-70">{column.article}</p>
              </div>
            </div>
            <ul className="grid gap-2 p-3 text-center text-base font-bold sm:p-4">
              {column.items.map((item) => (
                <li className={`flex min-h-12 items-center justify-center rounded-lg px-3 py-2 ring-1 ${column.chipTone}`} key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ManualPage() {
  return (
    <>
      <section className="glass rounded-xl px-1 py-3 sm:rounded-[2rem] sm:p-8">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">
          {ui.manual.title}
        </p>
        <h2 className="text-3xl font-black">{ui.manual.subtitle}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            [ui.manual.scenes, ui.manual.scenesText],
            [ui.manual.quiz, ui.manual.quizText],
            [ui.manual.writing, ui.manual.writingText],
            [ui.manual.dashboard, ui.manual.dashboardText]
          ].map(([title, text]) => (
            <article className="rounded-xl bg-white/75 p-3 sm:rounded-3xl sm:p-5 dark:bg-slate-900/70" key={title}>
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-2 text-slate-700 dark:text-slate-300">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          [ui.manual.faq, ui.manual.faqQuestion, ui.manual.faqAnswer],
          [ui.manual.method, ui.manual.methodQuestion, ui.manual.methodAnswer],
          [ui.manual.usage, ui.manual.usageQuestion, ui.manual.usageAnswer]
        ].map(([label, title, text]) => (
          <article className="glass rounded-xl p-3 sm:rounded-3xl sm:p-6" key={title}>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">{label}</p>
            <h3 className="mt-3 text-xl font-black">{title}</h3>
            <p className="mt-2 text-slate-700 dark:text-slate-300">{text}</p>
          </article>
        ))}
      </section>

      <ArticleHelp />

      <FeedbackForm />
      <DemoSections />
      <SceneLibrary />
      <BakeryModule />
    </>
  );
}
