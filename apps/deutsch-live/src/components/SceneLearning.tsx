import { useEffect, useRef, useState } from "react";
import { BookOpenCheck, ChevronRight, FileText, Folder, FolderOpen, ListChecks, MessageCircle, Mic2, Play, Volume2 } from "lucide-react";
import { fetchLearningTopic, fetchTopics, saveProgress, saveVocabulary, type CurrentUser, type Topic, type TopicSummary } from "../api";
import { learning, ui } from "../i18n";
import { SkeletonPanel } from "./UiPrimitives";

type LearningSelection = { topicId: string; sceneId: string };

function readSelection(): LearningSelection {
  const params = new URLSearchParams(window.location.search);
  return { topicId: params.get("topic") || "baeckerei", sceneId: params.get("scene") || "" };
}

function writeSelection(selection: LearningSelection, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  url.searchParams.set("topic", selection.topicId);
  if (selection.sceneId) url.searchParams.set("scene", selection.sceneId);
  else url.searchParams.delete("scene");
  if (url.href === window.location.href) return;
  if (mode === "push") window.history.pushState(window.history.state, "", url);
  else window.history.replaceState(window.history.state, "", url);
}

function contentLanguage(text: string) {
  return /[А-Яа-яЁё]/.test(text) ? "ru" : "de";
}

function formatLevel(level?: string) {
  const normalized = level?.toLowerCase();
  if (normalized === "a2") return ui.levels.medium;
  if (normalized === "b1") return ui.levels.hard;
  return ui.levels.easy;
}

export default function SceneLearning({ user, onProgressSaved }: { user: CurrentUser | null; onProgressSaved: () => void }) {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [selection, setSelection] = useState(readSelection);
  const { topicId: activeTopicId, sceneId: activeSceneId } = selection;
  const [topic, setTopic] = useState<Topic | null>(null);
  const [message, setMessage] = useState("");
  const [hasSaveError, setHasSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [topicsError, setTopicsError] = useState(false);
  const [topicError, setTopicError] = useState(false);
  const [topicsRetry, setTopicsRetry] = useState(0);
  const [topicRetry, setTopicRetry] = useState(0);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isLoadingTopic, setIsLoadingTopic] = useState(true);
  const selectionRef = useRef(selection);
  const userIdRef = useRef(user?.id ?? null);
  const saveRequestRef = useRef(0);
  const savingRef = useRef(false);
  const mountedRef = useRef(false);
  selectionRef.current = selection;
  userIdRef.current = user?.id ?? null;

  function clearSaveState() {
    saveRequestRef.current += 1;
    savingRef.current = false;
    setIsSaving(false);
    setMessage("");
    setHasSaveError(false);
  }

  function select(next: LearningSelection, mode?: "push" | "replace") {
    const previous = selectionRef.current;
    if (previous.topicId !== next.topicId || previous.sceneId !== next.sceneId) {
      clearSaveState();
      if (previous.topicId !== next.topicId) {
        setTopic(null);
        setTopicError(false);
        setIsLoadingTopic(true);
      }
      selectionRef.current = next;
      setSelection(next);
    }
    if (mode) writeSelection(next, mode);
  }

  useEffect(() => {
    mountedRef.current = true;
    const onPopState = () => select(readSelection());
    window.addEventListener("popstate", onPopState);
    return () => {
      mountedRef.current = false;
      saveRequestRef.current += 1;
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => { clearSaveState(); }, [user?.id]);

  useEffect(() => {
    let active = true;
    setIsLoadingTopics(true);
    setTopicsError(false);
    fetchTopics()
      .then((data) => { if (active) setTopics(data); })
      .catch(() => { if (active) setTopicsError(true); })
      .finally(() => { if (active) setIsLoadingTopics(false); });
    return () => { active = false; };
  }, [topicsRetry]);

  useEffect(() => {
    let active = true;
    setTopic(null);
    setTopicError(false);
    setIsLoadingTopic(true);
    fetchLearningTopic(activeTopicId).then((data) => {
      if (!active || selectionRef.current.topicId !== activeTopicId) return;
      const requestedSceneId = selectionRef.current.sceneId;
      const sceneId = data.scenes?.find((scene) => scene.id === requestedSceneId)?.id ?? data.scenes?.[0]?.id ?? "";
      select({ topicId: activeTopicId, sceneId }, "replace");
      setTopic(data);
    }).catch(() => {
      if (active && selectionRef.current.topicId === activeTopicId) setTopicError(true);
    }).finally(() => {
      if (active && selectionRef.current.topicId === activeTopicId) setIsLoadingTopic(false);
    });
    return () => { active = false; };
  }, [activeTopicId, topicRetry]);

  useEffect(() => {
    if (!topic || topic.id !== activeTopicId || isLoadingTopic) return;
    const sceneId = topic.scenes?.find((scene) => scene.id === activeSceneId)?.id ?? topic.scenes?.[0]?.id ?? "";
    select({ topicId: activeTopicId, sceneId }, "replace");
  }, [topic, activeTopicId, activeSceneId, isLoadingTopic]);

  const isTopicReady = !isLoadingTopic && !topicError && topic?.id === activeTopicId;
  const activeScene = topic?.scenes?.find((scene) => scene.id === activeSceneId) ?? topic?.scenes?.[0] ?? null;
  const activeSceneIndex = activeScene && topic?.scenes ? Math.max(0, topic.scenes.findIndex((scene) => scene.id === activeScene.id)) : 0;
  const activeTopicSummary = topics.find((item) => item.id === activeTopicId);

  async function completeScene() {
    if (savingRef.current || !topic || !isTopicReady) return;
    if (!user) {
      setHasSaveError(false);
      setMessage(ui.sceneLearning.guestProgress);
      return;
    }
    const requestId = ++saveRequestRef.current;
    const savingSelection = selectionRef.current;
    const savingUserId = user.id;
    const isCurrent = () => mountedRef.current && saveRequestRef.current === requestId
      && userIdRef.current === savingUserId
      && selectionRef.current.topicId === savingSelection.topicId
      && selectionRef.current.sceneId === savingSelection.sceneId;
    const phrase = topic.phrases[0];
    let progressSaved = false;
    savingRef.current = true;
    setIsSaving(true);
    setMessage("");
    setHasSaveError(false);
    try {
      await saveProgress({ topicId: topic.id, status: "completed", completedExercises: 1 });
      if (!isCurrent()) return;
      progressSaved = true;
      onProgressSaved();
      if (phrase) {
        await saveVocabulary({ topicId: topic.id, wordDe: phrase.de.split(" ").slice(0, 3).join(" "), translationRu: phrase.ru });
      }
      if (isCurrent()) setMessage(phrase ? ui.sceneLearning.completed : ui.sceneLearning.completedWithoutVocabulary);
    } catch {
      if (isCurrent()) {
        setHasSaveError(true);
        setMessage(progressSaved ? ui.sceneLearning.vocabularySaveError : ui.sceneLearning.saveError);
      }
    } finally {
      if (isCurrent()) {
        savingRef.current = false;
        setIsSaving(false);
      }
    }
  }

  return (
    <section aria-busy={isLoadingTopics || isLoadingTopic} aria-labelledby="scene-learning-title" className="scene-learning-shell glass rounded-xl p-3 sm:rounded-[2rem] sm:p-8">
      <div className="scene-learning-intro">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
          {ui.sceneLearning.title}
        </p>
        <h2 className="view-title--compact" id="scene-learning-title">{ui.sceneLearning.subtitle}</h2>
        <p className="mt-4 max-w-3xl text-slate-700 dark:text-slate-300">
          {ui.sceneLearning.description}
        </p>
      </div>
      <p aria-live="polite" className="sr-only" role="status">
        {isLoadingTopics || isLoadingTopic ? ui.sceneLearning.loadingContent : topicsError || topicError ? ui.sceneLearning.loadFailed : ui.sceneLearning.contentReady}
      </p>

      <div className="scene-learning-explorer">
        <div className="scene-learning-explorer__header">
          <FolderOpen aria-hidden="true" className="h-4 w-4" />
          <span>{ui.sceneLearning.explorerTitle}</span>
        </div>
        <div aria-busy={isLoadingTopics} className="scene-topic-list" aria-label={ui.sceneLearning.explorerTitle} role="group">
          {isLoadingTopics && (
            <>
              {Array.from({ length: 4 }, (_, index) => <SkeletonPanel className="p-3 sm:p-3" key={index} rows={1} />)}
            </>
          )}
          {topicsError && (
            <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-900/70">
              <p role="alert">{ui.sceneLearning.topicsLoadError}</p>
              <button className="mt-3 rounded-xl bg-cyan-500 px-4 py-2 font-bold text-slate-950" onClick={() => setTopicsRetry((value) => value + 1)} type="button">
                {ui.sceneLearning.retry}
              </button>
            </div>
          )}
          {topics.map((item) => {
            const isActive = item.id === activeTopicId;
            return (
              <button
                aria-pressed={isActive}
                className={`scene-topic-button ${isActive ? "is-active" : ""}`}
                data-topic-id={item.id}
                key={item.id}
                onClick={() => { if (!isActive) select({ topicId: item.id, sceneId: "" }, "push"); }}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="scene-topic-button__chevron" />
                {isActive ? <FolderOpen aria-hidden="true" className="scene-topic-button__icon" /> : <Folder aria-hidden="true" className="scene-topic-button__icon" />}
                <span className="scene-topic-button__copy">
                  <span lang="ru"><span aria-hidden="true">{item.icon}</span> {item.ru}</span>
                  <small lang="de">{item.label}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div className="scene-picker">
          <div>
            <p className="scene-picker__label">{ui.sceneLearning.scenesFolder}</p>
            <p className="scene-picker__topic" lang="ru">{activeTopicSummary ? `${activeTopicSummary.icon} ${activeTopicSummary.ru}` : topic?.id === activeTopicId ? topic.ru : ""}</p>
          </div>
          <div aria-busy={isLoadingTopic} aria-label={ui.sceneLearning.scenesFolder} className="scene-picker__list" role="group">
            {isLoadingTopic && (
              <>
                <SkeletonPanel rows={1} className="p-3 sm:p-3" />
                <SkeletonPanel rows={1} className="p-3 sm:p-3" />
              </>
            )}
            {isTopicReady && topic?.scenes?.map((scene, index) => (
              <button
                aria-pressed={scene.id === activeSceneId}
                className={`scene-picker__button ${scene.id === activeSceneId ? "is-active" : ""}`}
                data-scene-id={scene.id}
                key={scene.id}
                onClick={() => select({ topicId: activeTopicId, sceneId: scene.id }, "push")}
                type="button"
              >
                <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>{ui.sceneLearning.sceneNumber} {String(index + 1).padStart(2, "0")}</strong>
                  <small lang="ru">{scene.ru}</small>
                  <span className="sr-only" lang={contentLanguage(scene.title)}>{scene.title}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {isTopicReady && topic && (
        <div className="scene-learning-path" aria-label={ui.sceneLearning.subtitle}>
          <span>{ui.sceneLearning.dialogTranslation}</span>
          <span>{ui.sceneLearning.phraseBank}</span>
          <span>{ui.sceneLearning.vocabulary}</span>
          <span>{ui.sceneLearning.smallExercise}</span>
        </div>
      )}

      {isLoadingTopic && <SceneLearningSkeleton />}

      {topicError && (
        <div className="mt-5 rounded-xl bg-white/70 p-4 dark:bg-slate-900/70">
          <p role="alert">{ui.sceneLearning.topicLoadError}</p>
          <button className="mt-3 rounded-xl bg-cyan-500 px-4 py-2 font-bold text-slate-950" onClick={() => setTopicRetry((value) => value + 1)} type="button">
            {ui.sceneLearning.retry}
          </button>
        </div>
      )}

      {isTopicReady && topic && (
        <div className="scene-learning-layout" data-topic-id={topic.id}>
          <div className="scene-learning-primary rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70">
            <h3 className="scene-learning-topic-title text-2xl font-black leading-tight">
              <span lang="ru"><span aria-hidden="true">{topic.icon}</span> {topic.ru}</span> · {ui.sceneLearning.dialogTranslation}
            </h3>
            {topic.description && <p className="mt-3 text-slate-700 dark:text-slate-300" lang={contentLanguage(topic.description)}>{topic.description}</p>}

            {activeScene && (
              <div className="mt-5 grid gap-4">
                <article className="dialog-card rounded-xl border border-white/60 bg-white/75 p-3 sm:rounded-3xl sm:p-5 dark:border-slate-700 dark:bg-slate-950/40" data-scene-id={activeScene.id}>
                  <div className="relative">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-black uppercase tabular-nums text-slate-950 shadow-sm dark:bg-cyan-300">
                        {ui.sceneLearning.sceneNumber} {String(activeSceneIndex + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 text-sm font-bold uppercase leading-snug text-cyan-700 dark:text-cyan-200" lang={contentLanguage(activeScene.title)}>{activeScene.title}</p>
                          {activeScene.level && <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-xs font-black uppercase text-white dark:bg-white dark:text-slate-950">{formatLevel(activeScene.level)}</span>}
                          {activeScene.isPremium && <span className="shrink-0 rounded-full bg-amber-400 px-2 py-1 text-xs font-black text-slate-950">Premium</span>}
                        </div>
                        <h4 className="mt-1 text-xl font-black leading-tight" lang="ru">{activeScene.ru}</h4>
                      </div>
                    </div>
                    <div className="scene-audio-row">
                      <button aria-describedby="scene-audio-availability" className="scene-audio-button" disabled type="button">
                        <Play aria-hidden="true" className="h-4 w-4" />
                        {ui.sceneLearning.playScene}
                      </button>
                      <span className="scene-audio-note" id="scene-audio-availability">
                        <Mic2 aria-hidden="true" className="h-4 w-4" />
                        {ui.sceneLearning.audioPrepared}
                      </span>
                    </div>
                    <div className="scene-dialogue-list">
                      {activeScene.dialogue.map((line, index) => (
                        <div className={`scene-dialogue-line ${index % 2 === 0 ? "scene-dialogue-line--primary" : "scene-dialogue-line--secondary"}`} key={`${activeScene.id}-${line.speaker}-${line.de}`}>
                          <div className="scene-dialogue-speaker">
                            <span lang={contentLanguage(line.speaker)}>{line.speaker}</span>
                            <Volume2 aria-hidden="true" className="h-4 w-4" />
                          </div>
                          <p className="scene-dialogue-de" lang="de">{line.de}</p>
                          <p className="scene-dialogue-ru" lang="ru">{line.ru}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 rounded-2xl bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-800 dark:text-cyan-200" lang={contentLanguage(activeScene.explanation)}>
                      {activeScene.explanation}
                    </p>
                  </div>
                </article>
              </div>
            )}

            <h4 className="panel-title--with-icon mt-7">
              <MessageCircle aria-hidden="true" className="h-5 w-5" />
              {ui.sceneLearning.phraseBank}
            </h4>
            <div className="mt-5 grid gap-4">
              {topic.phrases.map((phrase) => (
                <article className="learning-phrase-card rounded-xl border border-white/60 bg-white/75 p-3 sm:rounded-3xl sm:p-5 dark:border-slate-700 dark:bg-slate-950/40" key={phrase.de}>
                  <p className="text-xl font-black" lang="de">
                    <HighlightedGerman text={phrase.de} />
                  </p>
                  <p className="mt-2 text-slate-700 dark:text-slate-300" lang="ru"><span aria-hidden="true">🪆</span> {phrase.ru}</p>
                  <p className="mt-3 rounded-2xl bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-800 dark:text-cyan-200" lang={contentLanguage(phrase.hint)}>
                    {phrase.hint}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="scene-learning-sidebar space-y-5">
            <div className="rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70">
              <h3 className="panel-title--with-icon">
                <Volume2 aria-hidden="true" className="h-6 w-6" />
                {ui.sceneLearning.pronunciation}
              </h3>
              <p className="mt-3 text-slate-700 dark:text-slate-300">
                {ui.sceneLearning.pronunciationText}
              </p>
            </div>
            <div className="rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70">
              <h3 className="panel-title--with-icon">
                <BookOpenCheck aria-hidden="true" className="h-6 w-6" />
                {ui.sceneLearning.vocabulary}
              </h3>
              <div className="mt-4 grid gap-3">
                {(topic.vocabulary ?? []).slice(0, 20).map((item) => (
                  <div className="learning-vocab-card" key={item.de}>
                    <p className="learning-word-chip" lang="de">{item.de}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300" lang="ru">{item.ru}</p>
                    <p className="mt-2 text-sm font-semibold text-cyan-700 dark:text-cyan-200" lang="de">{item.example}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70">
              <h3 className="panel-title--with-icon">
                <ListChecks aria-hidden="true" className="h-6 w-6" />
                {ui.sceneLearning.smallExercise}
              </h3>
              <p className="mt-3 text-slate-700 dark:text-slate-300">{ui.sceneLearning.exerciseText}</p>
              <div className="mt-4 grid gap-3">
                {(topic.exercises ?? [{ prompt: ui.sceneLearning.exerciseText, template: learning.bakery.exerciseTemplate, type: "gap" }]).map((exercise, index) => (
                  <div className="rounded-xl bg-cyan-400/10 p-3 sm:rounded-2xl sm:p-4" key={`${exercise.type}-${index}`}>
                    <p className="font-bold" lang={contentLanguage(exercise.prompt)}>{exercise.prompt}</p>
                    {exercise.template && <p className="mt-2 text-xl font-black" lang="de">{exercise.template}</p>}
                    {exercise.items && (
                      <ol className="mt-2 list-decimal space-y-1 pl-5 font-semibold" lang="de">
                        {exercise.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
              <button aria-busy={isSaving} className="scene-complete-button mt-5 rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" disabled={isSaving} onClick={completeScene} type="button">
                {isSaving ? ui.sceneLearning.saving : ui.sceneLearning.completeScene}
              </button>
              {message && <p className="mt-3 font-semibold text-cyan-700 dark:text-cyan-300" role={hasSaveError ? "alert" : "status"}>{message}</p>}
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
        if (!part.trim() || !shouldHighlight) return part;
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
