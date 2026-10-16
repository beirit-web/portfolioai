import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Bot, BookOpenText, History, MessageSquareText, Send, Sparkles, UserRound } from "lucide-react";
import {
  fetchWritingExercises,
  getWebSocketUrl,
  saveWritingExercise,
  type CurrentUser,
  type WritingExercise
} from "../api";
import { ui } from "../i18n";

const writingTasks = [
  {
    id: "bakery-order",
    topicId: "baeckerei",
    title: "Bestellung schreiben",
    prompt: "Schreiben Sie eine kurze Bestellung in der Bäckerei. Nennen Sie mindestens zwei Produkte und sagen Sie bitte.",
    example: "Guten Morgen. Ich hätte gern zwei Brötchen und ein Croissant, bitte."
  },
  {
    id: "bakery-dialogue",
    topicId: "baeckerei",
    title: "Dialog schreiben",
    prompt: "Schreiben Sie einen Mini-Dialog zwischen Kunde und Verkäufer. Fragen Sie auch nach dem Preis.",
    example: "Kunde: Was kostet das Brot? Verkäufer: Das kostet drei Euro."
  },
  {
    id: "bakery-question",
    topicId: "baeckerei",
    title: "Nachfragen üben",
    prompt: "Schreiben Sie drei höfliche Fragen für die Bäckerei, zum Beispiel zu Preis, Zutaten oder Empfehlung.",
    example: "Haben Sie Vollkornbrot? Was kostet ein Stück Kuchen? Was empfehlen Sie?"
  },
  {
    id: "supermarkt-products",
    topicId: "supermarkt",
    title: "Produkte finden",
    prompt: "Schreiben Sie drei kurze Fragen im Supermarkt: Wo ist ein Produkt, was kostet es und wo ist die Kasse?",
    example: "Wo finde ich Milch? Was kostet das Brot? Wo ist die Kasse?"
  },
  {
    id: "supermarkt-kasse",
    topicId: "supermarkt",
    title: "An der Kasse",
    prompt: "Schreiben Sie einen kurzen Kassendialog: Kundenkarte, Tüte, Bezahlung und Kassenbon.",
    example: "Ich habe keine Kundenkarte. Eine Tüte bitte. Mit Karte, bitte. Brauche ich den Kassenbon?"
  },
  {
    id: "apotheke-medikament",
    topicId: "apotheke",
    title: "Medikament suchen",
    prompt: "Schreiben Sie eine kurze Frage in der Apotheke: Sie suchen etwas gegen Schmerzen oder Erkältung.",
    example: "Guten Tag. Ich suche etwas gegen Kopfschmerzen. Haben Sie etwas ohne Rezept?"
  },
  {
    id: "apotheke-dosierung",
    topicId: "apotheke",
    title: "Dosierung verstehen",
    prompt: "Schreiben Sie drei Fragen zur Einnahme: wie oft, vor oder nach dem Essen und Nebenwirkungen.",
    example: "Wie soll ich das Medikament einnehmen? Vor dem Essen oder nach dem Essen? Gibt es Nebenwirkungen?"
  },
  {
    id: "arzt-symptoms",
    topicId: "arzt",
    title: "Symptome formulieren",
    prompt: "Schreiben Sie 2-3 kurze Sätze für den Arzt: Was tut weh und seit wann?",
    example: "Ich habe Kopfschmerzen. Seit drei Tagen. Ich habe kein Fieber."
  },
  {
    id: "arzt-appointment",
    topicId: "arzt",
    title: "Terminwunsch schreiben",
    prompt: "Schreiben Sie eine kurze Nachricht an die Praxis: Sie brauchen einen Termin und fragen nach dieser Woche.",
    example: "Guten Tag. Ich brauche einen Termin. Haben Sie diese Woche einen Termin frei?"
  },
  {
    id: "arzt-followup",
    topicId: "arzt",
    title: "Beim Arzt nachfragen",
    prompt: "Schreiben Sie höfliche Nachfragen, wenn Sie den Arzt nicht verstanden haben.",
    example: "Können Sie das bitte wiederholen? Können Sie bitte langsamer sprechen? Was soll ich jetzt machen?"
  },
  {
    id: "jobcenter-appointment",
    topicId: "jobcenter",
    title: "Termin beim Jobcenter",
    prompt: "Schreiben Sie eine kurze Nachricht: Sie haben einen Termin, nennen Ihren Namen und fragen nach dem nächsten Schritt.",
    example: "Guten Tag. Mein Name ist Ivan Petrov. Ich habe heute einen Termin. Was soll ich danach machen?"
  },
  {
    id: "jobcenter-documents",
    topicId: "jobcenter",
    title: "Unterlagen klären",
    prompt: "Schreiben Sie eine kurze Frage: Sie möchten Unterlagen abgeben und fragen, ob noch etwas fehlt.",
    example: "Guten Tag. Ich möchte diese Unterlagen abgeben. Welche Unterlagen fehlen noch?"
  },
  {
    id: "jobcenter-followup",
    topicId: "jobcenter",
    title: "Höflich nachfragen",
    prompt: "Schreiben Sie 2-3 höfliche Sätze, wenn Sie eine Frage im Jobcenter oder bei der Agentur für Arbeit nicht verstanden haben.",
    example: "Können Sie das bitte wiederholen? Bitte sprechen Sie langsam. Was muss ich jetzt machen?"
  },
  {
    id: "behoerden-formular",
    topicId: "behoerden",
    title: "Formular abgeben",
    prompt: "Schreiben Sie eine kurze Nachricht im Bürgeramt: Sie haben einen Termin und möchten ein Formular abgeben.",
    example: "Guten Tag. Ich habe einen Termin im Bürgeramt. Ich möchte dieses Formular abgeben."
  },
  {
    id: "behoerden-bescheinigung",
    topicId: "behoerden",
    title: "Bescheinigung beantragen",
    prompt: "Schreiben Sie drei kurze Sätze: Sie brauchen eine Meldebescheinigung, fragen nach Unterlagen und Bezahlung.",
    example: "Ich brauche eine Meldebescheinigung. Fehlen noch Unterlagen? Kann ich mit Karte bezahlen?"
  },
  {
    id: "schule-krankmelden",
    topicId: "schule-kindergarten",
    title: "Kind krankmelden",
    prompt: "Schreiben Sie eine kurze Nachricht an Schule oder Kindergarten: Ihr Kind ist krank und kommt heute nicht.",
    example: "Guten Morgen. Mein Kind ist krank und kommt heute nicht. Vielen Dank."
  },
  {
    id: "schule-elterngespraech",
    topicId: "schule-kindergarten",
    title: "Elterngespräch anfragen",
    prompt: "Schreiben Sie eine kurze Nachricht: Sie möchten einen Termin für ein Elterngespräch und fragen nach einem passenden Tag.",
    example: "Guten Tag. Ich möchte einen Termin für ein Elterngespräch. Passt Mittwoch um 15 Uhr?"
  },
  {
    id: "verkehr-ticket",
    topicId: "oeffentlicher-verkehr",
    title: "Ticket kaufen",
    prompt: "Schreiben Sie einen kurzen Dialog: Sie brauchen ein Ticket, fragen nach dem Preis und bezahlen mit Karte.",
    example: "Guten Tag. Ich brauche ein Ticket nach Helmstedt. Was kostet das? Kann ich mit Karte bezahlen?"
  },
  {
    id: "verkehr-richtung",
    topicId: "oeffentlicher-verkehr",
    title: "Richtung und Umstieg",
    prompt: "Schreiben Sie drei Fragen zu Bus oder Bahn: Richtung, Haltestelle und Umstieg.",
    example: "Fährt dieser Bus zum Bahnhof? Wie heißt die Haltestelle? Muss ich umsteigen?"
  }
] as const;

const buildingBlocks = [
  "Ich hätte gern ...",
  "Haben Sie ...?",
  "Was kostet ...?",
  "Wo finde ich ...?",
  "Eine Tüte bitte.",
  "Kann ich das umtauschen?",
  "Ich suche etwas gegen ...",
  "Wie soll ich das Medikament einnehmen?",
  "Gibt es Nebenwirkungen?",
  "Ich habe Schmerzen.",
  "Seit drei Tagen.",
  "Ich brauche einen Termin.",
  "Können Sie das bitte wiederholen?",
  "Ich habe heute einen Termin.",
  "Ich möchte diese Unterlagen abgeben.",
  "Welche Unterlagen fehlen?",
  "Ich habe einen Termin im Bürgeramt.",
  "Ich möchte dieses Formular abgeben.",
  "Ich brauche eine Meldebescheinigung.",
  "Bitte sprechen Sie langsam.",
  "Was muss ich jetzt machen?",
  "Mein Kind ist krank.",
  "Ich möchte mein Kind krankmelden.",
  "Ich hole mein Kind um ... Uhr ab.",
  "Ich brauche ein Ticket nach ...",
  "Fährt dieser Bus zum Bahnhof?",
  "Muss ich umsteigen?"
];

export default function BotTutor({ user }: { user: CurrentUser | null }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(writingTasks[0].id);
  const [text, setText] = useState("");
  const [latestExercise, setLatestExercise] = useState<WritingExercise | null>(null);
  const [history, setHistory] = useState<WritingExercise[]>([]);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [liveCorrection, setLiveCorrection] = useState("");
  const [liveStatus, setLiveStatus] = useState<"idle" | "connected" | "streaming" | "done">("idle");

  const selectedTask = useMemo(
    () => writingTasks.find((task) => task.id === selectedTaskId) ?? writingTasks[0],
    [selectedTaskId]
  );

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setLiveCorrection("");
      setLiveStatus("idle");
      return;
    }
    fetchWritingExercises().then(setHistory).catch(() => setHistory([]));
  }, [user]);

  useEffect(() => {
    if (!user || typeof WebSocket === "undefined") return;
    const socket = new WebSocket(getWebSocketUrl("/ws/notifications/"));
    socket.onopen = () => setLiveStatus("connected");
    socket.onmessage = (event) => {
      let payload: { type?: string; chunk?: string } = {};
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!payload || typeof payload.type !== "string") return;
      if (payload.type === "writing_correction_stream_start") {
        setLiveCorrection("");
        setLiveStatus("streaming");
      }
      if (payload.type === "writing_correction_stream_chunk") {
        setLiveCorrection((value) => `${value}${payload.chunk ?? ""}`);
        setLiveStatus("streaming");
      }
      if (payload.type === "writing_correction_stream_done") {
        setLiveStatus("done");
      }
    };
    socket.onclose = () => setLiveStatus("idle");
    return () => socket.close();
  }, [user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      setMessage(ui.writing.loginRequired);
      return;
    }
    setIsSaving(true);
    setLiveCorrection("");
    try {
      const response = await saveWritingExercise({
        topicId: selectedTask.topicId,
        prompt: selectedTask.prompt,
        text
      });
      setLatestExercise(response.exercise);
      setHistory((items) => [response.exercise, ...items.filter((item) => item.id !== response.exercise.id)].slice(0, 12));
      setText("");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.writing.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }

  function addBlock(block: string) {
    setText((value) => `${value}${value ? " " : ""}${block}`);
  }

  return (
    <section id="bot" className="writing-shell glass mt-10 rounded-xl p-3 sm:rounded-[2rem] sm:p-8">
      <p className="writing-kicker mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
        {ui.writing.title}
      </p>
      <div className="writing-layout">
        <div className="writing-task-panel">
          <h2 className="view-title--compact flex items-center gap-3">
            <MessageSquareText className="h-8 w-8" />
            {ui.writing.subtitle}
          </h2>
          <p className="writing-intro-copy mt-4 text-slate-700 dark:text-slate-300">
            {ui.writing.description}
          </p>

          <div className="writing-task-list">
            {writingTasks.map((task) => (
              <button
                className={`writing-task-button rounded-xl border px-3 py-3 text-left transition sm:rounded-2xl ${
                  selectedTask.id === task.id
                    ? "border-cyan-400 bg-cyan-400/20"
                    : "border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/65"
                }`}
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                type="button"
              >
                <span className="flex items-center gap-2 font-black">
                  <BookOpenText className="h-4 w-4" />
                  {task.title}
                </span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{task.prompt}</span>
              </button>
            ))}
          </div>
        </div>

        <form className="writing-chat-panel writing-composer" onSubmit={submit}>
          <label className="writing-input-label block text-sm font-bold" htmlFor="writing-answer">{ui.writing.inputLabel}</label>
          <div className="writing-chat-thread mt-3">
            <ChatBubble icon={<Bot />} tone="bot">
              <p className="font-semibold">{selectedTask.prompt}</p>
              <p className="mt-2 text-sm opacity-80">{ui.writing.exampleLabel}: {selectedTask.example}</p>
            </ChatBubble>
            {text.trim() && (
              <ChatBubble icon={<UserRound />} tone="user">
                <p className="whitespace-pre-wrap">{text}</p>
              </ChatBubble>
            )}
            {(isSaving || liveStatus === "streaming") && !liveCorrection && (
              <ChatBubble icon={<Bot />} tone="bot">
                <TypingIndicator label={ui.writing.typing} />
              </ChatBubble>
            )}
          </div>

          <div className="writing-block-list mt-3 flex flex-wrap gap-2">
            {buildingBlocks.map((block) => (
              <button
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                key={block}
                onClick={() => addBlock(block)}
                type="button"
              >
                {block}
              </button>
            ))}
          </div>

          <textarea
            className="writing-textarea mt-3 min-h-40 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            id="writing-answer"
            onChange={(event) => setText(event.target.value)}
            placeholder={ui.writing.placeholder}
            required
            value={text}
          />
          <button className="writing-submit-button mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" disabled={isSaving} type="submit">
            {isSaving ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {isSaving ? ui.writing.saving : ui.common.send}
          </button>
          {message && <p className="mt-4 font-semibold text-amber-700 dark:text-amber-300">{message}</p>}
          {liveCorrection && (
            <ChatBubble className="mt-4" icon={<Bot />} tone="bot">
              <p className="text-kicker text-cyan-700 dark:text-cyan-200">
                {liveStatus === "done" ? ui.writing.liveCorrection : ui.writing.liveCorrectionRunning}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{liveCorrection}</p>
            </ChatBubble>
          )}
        </form>
      </div>

      {latestExercise && (
        <div className="writing-result-thread writing-result-panel">
          <ChatBubble icon={<UserRound />} tone="user">
            <p className="whitespace-pre-wrap">{latestExercise.userText}</p>
          </ChatBubble>
          <ChatBubble icon={<Bot />} tone="bot">
            <p className="text-kicker text-cyan-700 dark:text-cyan-200">{ui.writing.correction}</p>
            <p className="mt-2 font-semibold">{latestExercise.correction}</p>
            <p className="mt-2 text-sm opacity-80">{latestExercise.explanation}</p>
          </ChatBubble>
        </div>
      )}

      <section className="writing-history-panel">
        <h3 className="panel-title--with-icon">
          <History className="h-5 w-5" />
          {ui.writing.history}
        </h3>
        {history.length === 0 ? (
          <p className="mt-3 text-slate-600 dark:text-slate-300">{ui.dashboard.noWritingHistory}</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {history.map((item) => (
              <article className="writing-history-item" key={item.id}>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{item.topicLabel}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{item.prompt}</p>
                <p className="writing-history-item__user">{item.userText}</p>
                <p className="writing-history-item__correction">{item.correction}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function ChatBubble({ children, className = "", icon, tone }: { children: ReactNode; className?: string; icon: ReactNode; tone: "bot" | "user" }) {
  return (
    <div className={`chat-bubble chat-bubble--${tone} ${className}`}>
      <span className="chat-bubble__avatar">{icon}</span>
      <div className="chat-bubble__body">{children}</div>
    </div>
  );
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <span className="typing-indicator" aria-label={label}>
      <span />
      <span />
      <span />
    </span>
  );
}
