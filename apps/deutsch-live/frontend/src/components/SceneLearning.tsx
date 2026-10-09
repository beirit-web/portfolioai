import { useEffect, useState } from "react";
import { BookOpenCheck, ChevronRight, FileText, Folder, FolderOpen, ListChecks, MessageCircle, Mic2, Play, Volume2 } from "lucide-react";
import { fetchTopic, fetchTopics, saveProgress, saveVocabulary, type CurrentUser, type Topic, type TopicSummary } from "../api";
import { learning, ui } from "../i18n";
import { SkeletonPanel } from "./UiPrimitives";

function formatLevel(level?: string) {
  const normalized = level?.toLowerCase();
  if (normalized === "a2") return ui.levels.medium;
  if (normalized === "b1") return ui.levels.hard;
  return ui.levels.easy;
}

export default function SceneLearning({ user, onProgressSaved }: { user: CurrentUser | null; onProgressSaved: () => void }) {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [activeTopicId, setActiveTopicId] = useState("baeckerei");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [activeSceneId, setActiveSceneId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isLoadingTopic, setIsLoadingTopic] = useState(true);

  useEffect(() => {
    fetchTopics()
      .then(setTopics)
      .finally(() => setIsLoadingTopics(false));
  }, []);

  useEffect(() => {
    setIsLoadingTopic(true);
    fetchTopic(activeTopicId).then((data) => {
      setTopic(data);
      setActiveSceneId(data.scenes?.[0]?.id ?? "");
      setMessage("");
    }).finally(() => setIsLoadingTopic(false));
  }, [activeTopicId]);

  const activeScene = topic?.scenes?.find((scene) => scene.id === activeSceneId) ?? topic?.scenes?.[0] ?? null;
  const activeSceneIndex = activeScene && topic?.scenes ? Math.max(0, topic.scenes.findIndex((scene) => scene.id === activeScene.id)) : 0;
  const activeTopicSummary = topics.find((item) => item.id === activeTopicId);

  async function completeScene() {
    if (!user || !topic) {
      setMessage(ui.sceneLearning.guestProgress);
      return;
    }
    await saveProgress({ topicId: topic.id, status: "completed", completedExercises: 1 });
    await saveVocabulary({ topicId: topic.id, wordDe: topic.phrases[0].de.split(" ").slice(0, 3).join(" "), translationRu: topic.phrases[0].ru });
    onProgressSaved();
    setMessage(ui.sceneLearning.completed);
  }

  return (
    <section className="scene-learning-shell glass rounded-xl p-3 sm:rounded-[2rem] sm:p-8">
      <div className="scene-learning-intro">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
          {ui.sceneLearning.title}
        </p>
        <h2 className="view-title--compact">{ui.sceneLearning.subtitle}</h2>
        <p className="mt-4 max-w-3xl text-slate-700 dark:text-slate-300">
          {ui.sceneLearning.description}
        </p>
      </div>

      <div className="scene-learning-explorer">
        <div className="scene-learning-explorer__header">
          <FolderOpen className="h-4 w-4" />
          <span>{ui.sceneLearning.explorerTitle}</span>
        </div>
        <div className="scene-topic-list" aria-label={ui.sceneLearning.explorerTitle}>
          {isLoadingTopics && (
            <>
              <SkeletonPanel rows={2} className="p-3 sm:p-3" />
              <SkeletonPanel rows={2} className="p-3 sm:p-3" />
            </>
          )}
          {topics.map((item) => {
            const isActive = item.id === activeTopicId;
            return (
              <button
                aria-pressed={isActive}
                className={`scene-topic-button ${isActive ? "is-active" : ""}`}
                key={item.id}
                onClick={() => setActiveTopicId(item.id)}
                type="button"
              >
                <ChevronRight className="scene-topic-button__chevron" />
                {isActive ? <FolderOpen className="scene-topic-button__icon" /> : <Folder className="scene-topic-button__icon" />}
                <span className="scene-topic-button__copy">
                  <span>{item.icon} {item.ru}</span>
                  <small>{item.label}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div className="scene-picker">
          <div>
            <p className="scene-picker__label">{ui.sceneLearning.scenesFolder}</p>
            <p className="scene-picker__topic">{activeTopicSummary ? `${activeTopicSummary.icon} ${activeTopicSummary.ru}` : topic?.ru}</p>
          </div>
          <div className="scene-picker__list">
            {isLoadingTopic && (
              <>
                <SkeletonPanel rows={1} className="p-3 sm:p-3" />
                <SkeletonPanel rows={1} className="p-3 sm:p-3" />
              </>
            )}
            {!isLoadingTopic && topic?.scenes?.map((scene, index) => (
              <button
                className={`scene-picker__button ${scene.id === activeSceneId ? "is-active" : ""}`}
                key={scene.id}
                onClick={() => setActiveSceneId(scene.id)}
                type="button"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>{ui.sceneLearning.sceneNumber} {String(index + 1).padStart(2, "0")}</strong>
                  <small>{scene.ru}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {!isLoadingTopic && topic && (
        <div className="scene-learning-path" aria-label={ui.sceneLearning.subtitle}>
          <span>{ui.sceneLearning.dialogTranslation}</span>
          <span>{ui.sceneLearning.phraseBank}</span>
          <span>{ui.sceneLearning.vocabulary}</span>
          <span>{ui.sceneLearning.smallExercise}</span>
        </div>
      )}

      {isLoadingTopic && <SceneLearningSkeleton />}

      {!isLoadingTopic && topic && (
        <div className="scene-learning-layout">
          <div className="scene-learning-primary rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70">
            <h3 className="scene-learning-topic-title text-2xl font-black leading-tight">
              {topic.icon} {topic.ru} · {ui.sceneLearning.dialogTranslation}
            </h3>
            {topic.description && <p className="mt-3 text-slate-700 dark:text-slate-300">{topic.description}</p>}

            {activeScene && (
              <div className="mt-5 grid gap-4">
                <article className="dialog-card rounded-xl border border-white/60 bg-white/75 p-3 sm:rounded-3xl sm:p-5 dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="relative">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-black uppercase tabular-nums text-slate-950 shadow-sm dark:bg-cyan-300">
                        {ui.sceneLearning.sceneNumber} {String(activeSceneIndex + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 text-sm font-bold uppercase leading-snug text-cyan-700 dark:text-cyan-200">{activeScene.title}</p>
                          {activeScene.level && <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-xs font-black uppercase text-white dark:bg-white dark:text-slate-950">{formatLevel(activeScene.level)}</span>}
                          {activeScene.isPremium && <span className="shrink-0 rounded-full bg-amber-400 px-2 py-1 text-xs font-black text-slate-950">Premium</span>}
                        </div>
                        <h4 className="mt-1 text-xl font-black leading-tight">{activeScene.ru}</h4>
                      </div>
                    </div>
                    <div className="scene-audio-row">
                      <button className="scene-audio-button" type="button">
                        <Play className="h-4 w-4" />
                        {ui.sceneLearning.playScene}
                      </button>
                      <span className="scene-audio-note">
                        <Mic2 className="h-4 w-4" />
                        {ui.sceneLearning.audioPrepared}
                      </span>
                    </div>
                    <div className="scene-dialogue-list">
                      {activeScene.dialogue.map((line, index) => (
                        <div className={`scene-dialogue-line ${index % 2 === 0 ? "scene-dialogue-line--primary" : "scene-dialogue-line--secondary"}`} key={`${activeScene.id}-${line.speaker}-${line.de}`}>
                          <div className="scene-dialogue-speaker">
                            <span>{line.speaker}</span>
                            <Volume2 className="h-4 w-4" />
                          </div>
                          <p className="scene-dialogue-de">{line.de}</p>
                          <p className="scene-dialogue-ru">{line.ru}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 rounded-2xl bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                      {activeScene.explanation}
                    </p>
                  </div>
                </article>
              </div>
            )}

            <h4 className="panel-title--with-icon mt-7">
              <MessageCircle className="h-5 w-5" />
              {ui.sceneLearning.phraseBank}
            </h4>
            <div className="mt-5 grid gap-4">
              {topic.phrases.map((phrase) => (
                <article className="rounded-xl border border-white/60 bg-white/75 p-3 sm:rounded-3xl sm:p-5 dark:border-slate-700 dark:bg-slate-950/40" key={phrase.de}>
                  <p className="text-xl font-black">
                    <HighlightedGerman text={phrase.de} />
                  </p>
                  <p className="mt-2 text-slate-700 dark:text-slate-300">🪆 {phrase.ru}</p>
                  <p className="mt-3 rounded-2xl bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                    {phrase.hint}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="scene-learning-sidebar space-y-5">
            <div className="rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70">
              <h3 className="panel-title--with-icon">
                <Volume2 className="h-6 w-6" />
                {ui.sceneLearning.pronunciation}
              </h3>
              <p className="mt-3 text-slate-700 dark:text-slate-300">
                {ui.sceneLearning.pronunciationText}
              </p>
            </div>
            <div className="rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70">
              <h3 className="panel-title--with-icon">
                <BookOpenCheck className="h-6 w-6" />
                {ui.sceneLearning.vocabulary}
              </h3>
              <div className="mt-4 grid gap-3">
                {(topic.vocabulary ?? []).slice(0, 20).map((item) => (
                  <div className="learning-vocab-card" key={item.de}>
                    <p className="learning-word-chip">{item.de}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{item.ru}</p>
                    <p className="mt-2 text-sm font-semibold text-cyan-700 dark:text-cyan-200">{item.example}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70">
              <h3 className="panel-title--with-icon">
                <ListChecks className="h-6 w-6" />
                {ui.sceneLearning.smallExercise}
              </h3>
              <p className="mt-3 text-slate-700 dark:text-slate-300">{ui.sceneLearning.exerciseText}</p>
              <div className="mt-4 grid gap-3">
                {(topic.exercises ?? [{ prompt: ui.sceneLearning.exerciseText, template: learning.bakery.exerciseTemplate, type: "gap" }]).map((exercise, index) => (
                  <div className="rounded-xl bg-cyan-400/10 p-3 sm:rounded-2xl sm:p-4" key={`${exercise.type}-${index}`}>
                    <p className="font-bold">{exercise.prompt}</p>
                    {exercise.template && <p className="mt-2 text-xl font-black">{exercise.template}</p>}
                    {exercise.items && (
                      <ol className="mt-2 list-decimal space-y-1 pl-5 font-semibold">
                        {exercise.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
              <button className="scene-complete-button mt-5 rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" onClick={completeScene} type="button">
                {ui.sceneLearning.completeScene}
              </button>
              {message && <p className="mt-3 font-semibold text-cyan-700 dark:text-cyan-300">{message}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function HighlightedGerman({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, index) => {
        const cleaned = part.replace(/[.,!?;:]/g, "");
        const shouldHighlight = cleaned.length >= 7 || /^[A-ZÄÖÜ]/.test(cleaned);
        if (!part.trim() || !shouldHighlight) return <span key={`${part}-${index}`}>{part}</span>;
        return <span className="learning-keyword" key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

function SceneLearningSkeleton() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <SkeletonPanel rows={8} />
      <div className="space-y-5">
        <SkeletonPanel rows={3} />
        <SkeletonPanel rows={5} />
        <SkeletonPanel rows={4} />
      </div>
    </div>
  );
}
