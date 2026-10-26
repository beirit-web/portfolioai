import "../styles/quiz.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, PencilLine, Trophy, XCircle } from "lucide-react";
import { ApiError, fetchQuizTopic, fetchTopics, saveQuizAttempt, type CurrentUser, type QuizEvaluation, type QuizTopic, type TopicSummary } from "../api";
import { getLocale, ui } from "../i18n";
import QuizCountdown from "./QuizCountdown";

type QuizModeProps = { user: CurrentUser | null; accountLoaded?: boolean; onAttemptSaved: () => void };
type Difficulty = "easy" | "medium" | "hard";
type Selection = { topic: string; difficulty: Difficulty };
type Attempt = Parameters<typeof saveQuizAttempt>[0];
type Run = {
  started: boolean; finished: boolean; index: number; selected: number | null;
  freeAnswer: string; answers: Array<string | null>; durations: number[]; expired: boolean;
  startedAt: number; pausedAt: number | null;
};
const difficultyConfig: Record<Difficulty, { choiceSeconds: number; writingSeconds: number }> = {
  easy: { choiceSeconds: 60, writingSeconds: 180 },
  medium: { choiceSeconds: 45, writingSeconds: 150 },
  hard: { choiceSeconds: 30, writingSeconds: 120 },
};
const emptyRun = (): Run => ({ started: false, finished: false, index: 0, selected: null, freeAnswer: "", answers: [], durations: [], expired: false, startedAt: 0, pausedAt: null });
function readSelection(): Selection {
  const params = new URLSearchParams(location.search);
  const difficulty = params.get("difficulty");
  return { topic: params.get("topic") || "baeckerei", difficulty: difficulty && Object.prototype.hasOwnProperty.call(difficultyConfig, difficulty) ? difficulty as Difficulty : "easy" };
}
function duration(run: Run, limit: number, now = Date.now()) {
  return Math.max(0, Math.min(limit, Math.round(((run.pausedAt ?? now) - run.startedAt) / 1000)));
}
function title(topic: Pick<QuizTopic, "label" | "ru">) { return getLocale() === "de" ? topic.label : topic.ru; }

export default function QuizMode({ user, accountLoaded = true, onAttemptSaved }: QuizModeProps) {
  const [selection, setSelection] = useState(readSelection);
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loadedTopic, setLoadedTopic] = useState<QuizTopic | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicLoading, setTopicLoading] = useState(true);
  const [topicsError, setTopicsError] = useState(false);
  const [topicError, setTopicError] = useState<"auth" | "load" | null>(null);
  const [listReload, setListReload] = useState(0);
  const [topicReload, setTopicReload] = useState(0);
  const [run, setRun] = useState(emptyRun);
  const [evaluation, setEvaluation] = useState<QuizEvaluation | null>(null);
  const [temporaryTotal, setTemporaryTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<"auth" | "validation" | "network" | "storage" | "settings" | null>(null);
  const [message, setMessage] = useState<"saved" | "savingDisabled" | "guestPoints" | null>(null);
  const revision = useRef(0);
  const answerChosen = useRef(false);
  const submitting = useRef(false);
  const completed = useRef(false);
  const pendingAttempt = useRef<Attempt | null>(null);
  const pendingFocus = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const topic = loadedTopic?.id === selection.topic ? loadedTopic : null;
  const choiceCount = topic?.quiz.length ?? 0;
  const total = topic ? choiceCount + 1 : 0;
  const limit = run.index === choiceCount ? difficultyConfig[selection.difficulty].writingSeconds : difficultyConfig[selection.difficulty].choiceSeconds;

  const reset = useCallback(() => {
    revision.current += 1;
    answerChosen.current = false;
    submitting.current = false;
    completed.current = false;
    pendingAttempt.current = null;
    pendingFocus.current = false;
    setRun(emptyRun()); setEvaluation(null); setSaving(false); setSaveError(null); setMessage(null);
  }, []);

  useEffect(() => {
    let current = true;
    setTopicsLoading(true); setTopicsError(false);
    fetchTopics().then(data => {
      if (!Array.isArray(data)) throw new Error("Invalid topic list");
      if (current) setTopics(data);
    }).catch(() => { if (current) { setTopics([]); setTopicsError(true); } })
      .finally(() => { if (current) setTopicsLoading(false); });
    return () => { current = false; };
  }, [listReload]);

  useEffect(() => {
    let current = true;
    setTopicLoading(true); setTopicError(null); setLoadedTopic(null);
    if (!accountLoaded) return () => { current = false; };
    fetchQuizTopic(selection.topic).then(data => {
      if (data.id !== selection.topic || typeof data.quizToken !== "string" || !data.quizToken || !Array.isArray(data.quiz)
        || new Set(data.quiz.map(item => item.id)).size !== data.quiz.length
        || !data.quiz.every(item => typeof item.id === "string" && item.id && typeof item.question === "string"
          && Array.isArray(item.options) && item.options.length > 0 && item.options.every(option => typeof option === "string")
          && Array.isArray(item.optionIds) && item.optionIds.length === item.options.length
          && item.optionIds.every(id => typeof id === "string" && id) && new Set(item.optionIds).size === item.optionIds.length)) {
        throw new Error("Invalid quiz topic");
      }
      if (current) setLoadedTopic(data);
    }).catch(error => { if (current) setTopicError(error instanceof ApiError && (error.status === 401 || error.status === 403) ? "auth" : "load"); })
      .finally(() => { if (current) setTopicLoading(false); });
    return () => { current = false; };
  }, [selection.topic, topicReload, user?.id, accountLoaded]);

  useEffect(() => {
    reset();
    const changed = () => { reset(); setSelection(readSelection()); setTopicReload(value => value + 1); };
    addEventListener("popstate", changed);
    return () => removeEventListener("popstate", changed);
  }, [reset]);
  useEffect(() => { reset(); setTemporaryTotal(0); }, [user?.id, reset]);
  useEffect(() => () => { revision.current += 1; }, []);
  useEffect(() => {
    if (pendingFocus.current) {
      pendingFocus.current = false;
      heading.current?.focus();
    }
  }, [run.started, run.index, run.finished]);

  function configure(next: Selection) {
    if (submitting.current) return;
    reset(); setSelection(next); setTopicReload(value => value + 1);
    const url = new URL(location.href);
    url.searchParams.set("topic", next.topic); url.searchParams.set("difficulty", next.difficulty);
    history.pushState({}, "", url);
  }

  const expire = useCallback(() => {
    answerChosen.current = true;
    setRun(current => {
      if (!current.started || current.finished || current.expired || current.selected !== null || current.pausedAt !== null) return current;
      const time = current.index === choiceCount ? difficultyConfig[selection.difficulty].writingSeconds : difficultyConfig[selection.difficulty].choiceSeconds;
      const durations = [...current.durations]; durations[current.index] = time;
      return { ...current, expired: true, selected: current.index < choiceCount ? -1 : null, durations, pausedAt: current.startedAt + time * 1000 };
    });
  }, [choiceCount, selection.difficulty]);

  function startQuiz() {
    if (!topic || topicLoading || !accountLoaded) return;
    reset(); pendingFocus.current = true;
    setRun({ ...emptyRun(), started: true, startedAt: Date.now() });
  }
  function chooseAnswer(index: number) {
    if (!topic || !run.started || run.finished || run.index >= choiceCount || answerChosen.current || run.selected !== null) return;
    if (Date.now() >= run.startedAt + limit * 1000) { expire(); return; }
    answerChosen.current = true;
    const now = Date.now(), durations = [...run.durations]; durations[run.index] = duration(run, limit, now);
    const answers = [...run.answers]; answers[run.index] = topic.quiz[run.index].optionIds[index];
    setRun({ ...run, selected: index, answers, durations, pausedAt: now });
  }

  async function advance() {
    if (!topic || submitting.current || !accountLoaded) return;
    if (run.finished) { reset(); setTopicReload(value => value + 1); return; }
    if (completed.current) return;
    if (run.index < choiceCount) {
      if (run.selected === null) return;
      answerChosen.current = false; pendingFocus.current = true;
      setRun({ ...run, index: run.index + 1, selected: null, expired: false, pausedAt: null, startedAt: Date.now() });
      return;
    }
    submitting.current = true;
    const currentRevision = revision.current;
    const now = Date.now();
    const expired = run.expired || now >= run.startedAt + limit * 1000;
    if (!pendingAttempt.current) {
      const durations = [...run.durations]; durations[run.index] = duration(run, limit, now);
      pendingAttempt.current = {
        topicId: topic.id, quizToken: topic.quizToken,
        answers: topic.quiz.map((item, index) => ({ questionId: item.id, optionId: run.answers[index] ?? null })),
        freeAnswer: run.freeAnswer, freeAnswerExpired: expired,
        durationSeconds: durations.reduce((sum, value) => sum + value, 0), difficulty: selection.difficulty,
        save: Boolean(user?.settings.saveProgress),
      };
      setRun(current => ({ ...current, durations, pausedAt: expired ? current.startedAt + limit * 1000 : now, expired }));
    }
    const attempt = pendingAttempt.current;
    if (saveError === "settings") attempt.save = false;
    setSaving(true); setSaveError(null);
    try {
      const result = await saveQuizAttempt(attempt);
      if (revision.current !== currentRevision) return;
      if (!result?.attempt || !Number.isInteger(result.attempt.score) || result.attempt.score < 0 || result.attempt.score > total
        || result.attempt.total !== total || typeof result.saved !== "boolean"
        || (result.saved ? !user || !attempt.save || !Number.isInteger(result.attempt.id) || (result.attempt.id ?? 0) <= 0 : result.attempt.id !== null)
        || !Array.isArray(result.feedback) || result.feedback.length !== choiceCount
        || new Set(result.feedback.map(item => item.questionId)).size !== choiceCount
        || !result.feedback.every(item => {
          const question = topic.quiz.find(question => question.id === item.questionId);
          const answer = attempt.answers.find(answer => answer.questionId === item.questionId);
          return question && answer && item.selectedOptionId === answer.optionId
            && question.optionIds.includes(item.correctOptionId) && typeof item.correct === "boolean" && typeof item.explain === "string";
        }) || typeof result.writing?.accepted !== "boolean" || typeof result.writing.explain !== "string") {
        throw new ApiError("Invalid evaluation response", 502);
      }
      completed.current = true;
      pendingFocus.current = true;
      setEvaluation(result);
      setRun(current => ({ ...current, finished: true }));
      if (result.saved) {
        setMessage("saved"); onAttemptSaved();
      } else {
        setMessage(user ? "savingDisabled" : "guestPoints");
        if (!user) setTemporaryTotal(value => value + result.attempt.score);
      }
    } catch (error) {
      if (revision.current === currentRevision) {
        setSaveError(error instanceof ApiError && error.code === "save_progress_disabled" ? "settings"
          : error instanceof ApiError && (error.status === 401 || error.status === 403) ? "auth"
          : error instanceof ApiError && error.status === 400 ? "validation"
          : error instanceof ApiError && error.status >= 500 ? "storage" : "network");
      }
    } finally {
      if (revision.current === currentRevision) { submitting.current = false; setSaving(false); }
    }
  }

  const question = run.started && topic && run.index < choiceCount ? topic.quiz[run.index] : null;
  const writing = run.started && topic && run.index === choiceCount && !run.finished;
  const answered = run.finished ? total : run.index + (run.selected !== null ? 1 : 0);
  const loading = topicsLoading || topicLoading;
  const state = loading ? "loading" : topicError ? "error" : saving ? "saving" : run.finished ? "result" : run.started ? "question" : "ready";

  return <section className="quiz-shell glass rounded-xl p-3 sm:rounded-[2rem] sm:p-8" aria-labelledby="quiz-title" aria-busy={loading || saving} data-topic-id={selection.topic} data-state={state}>
    <div className="quiz-intro">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-purple-600 dark:text-purple-300">{ui.quiz.title}</p>
      <h2 id="quiz-title" className="view-title--compact">{ui.quiz.subtitle}</h2>
      <p className="mt-4 max-w-3xl text-slate-700 dark:text-slate-300">{ui.quiz.description}</p>
    </div>
    <p className="sr-only" role="status">{loading ? ui.quiz.loading : topicError || topicsError ? ui.quiz.loadFailed : ui.quiz.ready}</p>

    <fieldset className="quiz-setup-panel" disabled={saving}>
      <legend className="text-sm font-bold uppercase tracking-[0.16em] text-purple-700 dark:text-purple-300">{ui.quiz.difficulty}</legend>
      <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.quiz.choiceWritingTime}</p>
      <div className="quiz-difficulty-list">
        {(Object.keys(difficultyConfig) as Difficulty[]).map(level => <button
          aria-pressed={selection.difficulty === level} data-difficulty={level}
          className={`quiz-difficulty-button ${selection.difficulty === level ? "is-active" : ""}`} key={level}
          onClick={() => configure({ ...selection, difficulty: level })} type="button">
          {ui.quiz[level]}<span className="mt-1 block text-sm font-semibold opacity-75">{difficultyConfig[level].choiceSeconds} / {difficultyConfig[level].writingSeconds} {ui.quiz.seconds}</span>
        </button>)}
      </div>
    </fieldset>

    <fieldset className="quiz-topic-picker" disabled={saving}>
      <legend className="text-sm font-bold text-slate-700 dark:text-slate-200">{ui.quiz.selectedTopic}</legend>
      <div className="quiz-topic-list" aria-busy={topicsLoading}>
        {topicsLoading && Array.from({ length: 4 }, (_, index) => <div className="quiz-topic-button quiz-topic-placeholder" key={index} aria-hidden="true"><span className="skeleton-block h-5 w-3/4" /><small className="skeleton-block h-4 w-1/2" /></div>)}
        {topics.map(item => <button className={`quiz-topic-button choice-btn ${item.id === selection.topic ? "is-selected" : ""}`}
          aria-pressed={item.id === selection.topic} data-topic-id={item.id}
          key={item.id} onClick={() => configure({ ...selection, topic: item.id })} type="button">
          <span lang={getLocale() === "de" ? "de" : "ru"}><span aria-hidden="true">{item.icon} </span>{title(item)}</span>
          <small lang={getLocale() === "de" ? "ru" : "de"}>{getLocale() === "de" ? item.ru : item.label}</small>
        </button>)}
      </div>
      {topicsError && <div className="quiz-load-error" role="alert"><p>{ui.quiz.topicsLoadError}</p><button type="button" className="quiz-retry" onClick={() => setListReload(value => value + 1)}>{ui.quiz.retry}</button></div>}
      {!topicsLoading && !topicsError && topics.length === 0 && <p role="status">{ui.quiz.noTopics}</p>}
    </fieldset>

    <div className="quiz-workspace" aria-busy={topicLoading}>
      {topicLoading && <div className="quiz-workspace-placeholder" aria-hidden="true"><span className="skeleton-block h-7 w-2/3" /><span className="skeleton-block mt-6 h-20 w-full" /></div>}
      {topicError && <div className="quiz-load-error" role="alert"><p>{topicError === "auth" ? ui.quiz.loadAuthError : ui.quiz.topicLoadError}</p>
        {topicError === "auth" && <a className="quiz-retry" href={`${import.meta.env.VITE_APP_BASE ?? ""}/account`} target="_blank" rel="noopener noreferrer">{ui.quiz.loginNewTab}</a>}
        <button type="button" className="quiz-retry" onClick={() => setTopicReload(value => value + 1)}>{ui.quiz.retry}</button></div>}
      {!topicLoading && topic && <>
        <div className="quiz-workspace__header">
          <h3 className="flex items-center gap-2 text-2xl font-black leading-tight"><Trophy aria-hidden="true" className="h-7 w-7" /><span aria-hidden="true">{topic.icon}</span>{title(topic)}</h3>
          <p className="rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-bold text-cyan-700 dark:text-cyan-200">{run.finished ? ui.common.finished : run.started ? `${ui.common.question} ${run.index + 1} / ${total}` : `${ui.quiz.questionCount}: ${total}`}</p>
        </div>
        {!run.started ? <div className="quiz-start-card">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-purple-700 dark:text-purple-300">{ui.quiz.startTitle}</p>
          <p className="mt-2 text-slate-700 dark:text-slate-300">{ui.quiz.startDescription}</p>
          <dl className="quiz-start-summary">
            {[[ui.quiz.selectedTopic, title(topic)], [ui.quiz.difficulty, ui.quiz[selection.difficulty]], [ui.quiz.questionCount, total]].map(([label, value]) => <div className="rounded-xl bg-cyan-400/10 p-3" key={label}>
              <dt className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-200">{label}</dt><dd className="mt-1 font-black">{value}</dd>
            </div>)}
          </dl>
          <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.quiz.includesWriting}</p>
          <button className="quiz-primary-action mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-400" disabled={!accountLoaded} onClick={startQuiz} type="button"><CheckCircle2 aria-hidden="true" className="h-5 w-5" />{ui.quiz.startButton}</button>
        </div> : <>
          <div className="quiz-progress-panel">
            <label htmlFor="quiz-progress" className="text-kicker text-indigo-700 dark:text-indigo-200">{ui.quiz.progress}</label>
            <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{answered} / {total}{evaluation ? ` · ${ui.quiz.score}: ${evaluation.attempt.score}` : ""}</p>
            <progress id="quiz-progress" className="quiz-progress" value={answered} max={total} aria-valuetext={`${answered} / ${total}`} />
            <ol className="quiz-stepper" aria-label={ui.quiz.progress}>{Array.from({ length: total }, (_, index) => <li
              className={`quiz-step ${index < answered ? "is-done" : ""} ${!run.finished && index === run.index ? "is-current" : ""}`}
              aria-current={!run.finished && index === run.index ? "step" : undefined} key={index}>{index + 1}</li>)}</ol>
          </div>
          {!run.finished && <QuizCountdown key={`${selection.topic}:${selection.difficulty}:${run.index}:${run.startedAt}`} startedAt={run.startedAt} limit={limit} pausedAt={run.pausedAt}
            label={ui.quiz.timeLeft} secondsLabel={ui.quiz.seconds} onExpire={expire} />}
          <form className="quiz-question-area" onSubmit={event => { event.preventDefault(); void advance(); }}>
            {question && !run.finished && <>
              <h3 id="quiz-question-title" ref={heading} tabIndex={-1} className="quiz-question-title text-learning-sentence">{question.question}</h3>
              <div className="mt-5 grid gap-3" role="group" aria-labelledby="quiz-question-title">{question.options.map((option, index) => {
                const selected = run.selected === index;
                return <button className={`quiz-option rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-left font-semibold dark:border-slate-700 dark:bg-slate-950/50 ${selected ? "is-selected" : ""}`}
                  aria-pressed={run.selected === index} data-answer-index={index} disabled={run.selected !== null || run.expired}
                  key={`${index}:${option}`} onClick={() => chooseAnswer(index)} type="button">
                  <span>{option}</span>{selected ? <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" /> : <Circle aria-hidden="true" className="h-4 w-4 shrink-0 opacity-40" />}
                </button>;
              })}</div>
              {run.selected !== null && <p className="quiz-feedback" role="status">
                {run.expired ? ui.quiz.timeExpiredExplanation : ui.quiz.answerSelected}
              </p>}
            </>}
            {writing && <>
              <h3 id="quiz-question-title" ref={heading} tabIndex={-1} className="quiz-question-title flex items-center gap-2 text-xl font-bold"><PencilLine aria-hidden="true" className="h-6 w-6" />{topic.free_answer?.prompt ?? ui.quiz.freeAnswerPrompt}</h3>
              {topic.free_answer?.task && <div className="mt-4 rounded-xl bg-cyan-400/10 p-3 sm:rounded-2xl sm:p-4"><p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{ui.quiz.freeAnswerTask}</p><p id="quiz-writing-task" className="mt-2 font-semibold text-slate-700 dark:text-slate-300">{topic.free_answer.task}</p></div>}
              <label htmlFor="quiz-free-answer" className="quiz-writing-label">{ui.quiz.answerLabel}</label>
              <textarea id="quiz-free-answer" className="quiz-writing-input min-h-32 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950 outline-none focus:border-cyan-400 disabled:opacity-60"
                aria-describedby={`quiz-writing-hint${topic.free_answer?.task ? " quiz-writing-task" : ""}`} disabled={run.expired} readOnly={saving || pendingAttempt.current !== null} maxLength={10000}
                onChange={event => setRun(current => ({ ...current, freeAnswer: event.target.value }))} value={run.freeAnswer} />
              <p id="quiz-writing-hint" className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.quiz.freeAnswerHint}</p>
              {topic.free_answer?.building_blocks?.length ? <div className="quiz-building-blocks mt-3"><p className="text-sm font-bold text-slate-600 dark:text-slate-300">{ui.quiz.buildingBlocks}:</p><div className="mt-2 flex flex-wrap gap-2">
                {topic.free_answer.building_blocks.map((block, index) => <button className="rounded-full bg-white/80 px-3 py-2 text-sm font-bold text-slate-700 shadow-sm dark:bg-slate-950/50 dark:text-slate-200"
                  disabled={run.expired || saving || pendingAttempt.current !== null} key={`${index}:${block}`} onClick={() => setRun(current => ({ ...current, freeAnswer: `${current.freeAnswer}${current.freeAnswer.trim() ? " " : ""}${block}` }))} type="button">{block}</button>)}
              </div></div> : null}
              <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.quiz.exampleLabel}: {topic.free_answer?.example ?? "Ich hätte gern zwei Brötchen, bitte."}</p>
            </>}
            {run.expired && !run.finished && <p className="mt-3 font-semibold text-red-700 dark:text-red-300" role="status">{ui.quiz.timeExpired}</p>}
            {saving && <p role="status">{ui.quiz.saving}</p>}
            {saveError && <div className="quiz-save-error" role="alert"><p>{saveError === "auth" ? ui.quiz.authError : saveError === "validation" ? ui.quiz.validationError
              : saveError === "settings" ? ui.quiz.settingsError : saveError === "network" ? ui.quiz.networkError : ui.quiz.saveError}</p>
              {saveError === "auth" && <a className="quiz-retry" href={`${import.meta.env.VITE_APP_BASE ?? ""}/account`} target="_blank" rel="noopener noreferrer">{ui.quiz.loginNewTab}</a>}
              {saveError === "validation" && <button className="quiz-retry" onClick={() => { reset(); setTopicReload(value => value + 1); }} type="button">{ui.quiz.reloadQuiz}</button>}
            </div>}
            {run.finished && evaluation && <div className="quiz-result-card">
              <h3 ref={heading} tabIndex={-1} className="quiz-question-title text-xl font-bold">{ui.quiz.result}: {evaluation.attempt.score} / {evaluation.attempt.total}</h3>
              <p className="mt-3 font-semibold text-cyan-700 dark:text-cyan-300" role="status">{message ? ui.quiz[message] : ""}</p>
              {!user && <p className="mt-3 text-slate-600 dark:text-slate-300">{ui.quiz.temporaryGuestPoints}: {temporaryTotal}</p>}
              <ol className="quiz-review mt-5 grid gap-4">{topic.quiz.map(question => {
                const feedback = evaluation.feedback.find(item => item.questionId === question.id)!;
                const chosen = feedback.selectedOptionId === null ? ui.quiz.noAnswer : question.options[question.optionIds.indexOf(feedback.selectedOptionId)];
                const correct = question.options[question.optionIds.indexOf(feedback.correctOptionId)];
                return <li className="quiz-review-item rounded-xl border border-slate-200 p-3 dark:border-slate-700" data-question-id={question.id} key={question.id}>
                  <h4 className="font-bold">{question.question}</h4>
                  <p className="mt-2">{ui.quiz.yourAnswer}: {chosen}</p>
                  {!feedback.correct && <p className="mt-2 font-semibold">{ui.quiz.solution}: {correct}</p>}
                  <p className={`quiz-feedback ${feedback.correct ? "is-correct" : "is-wrong"}`}>
                    {feedback.correct ? <CheckCircle2 aria-hidden="true" className="mr-2 inline h-5 w-5" /> : <XCircle aria-hidden="true" className="mr-2 inline h-5 w-5" />}
                    {feedback.correct ? ui.quiz.correctAnswer : ui.quiz.wrongAnswer}{feedback.explain ? ` · ${feedback.explain}` : ""}
                  </p>
                </li>;
              })}</ol>
              <div className="quiz-writing-feedback mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <h4 className="font-bold">{ui.quiz.writingResult}</h4>
                <p className="mt-2 whitespace-pre-wrap break-words">{run.freeAnswer || ui.quiz.noAnswer}</p>
                <p className="mt-2 font-semibold">{evaluation.writing.accepted ? ui.quiz.writingAccepted : ui.quiz.writingNotAccepted}</p>
                <p className="mt-2 text-sm">{ui.quiz.freeAnswerHint}</p>
              </div>
            </div>}
            <button className="quiz-primary-action quiz-next mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-400"
              aria-busy={saving} disabled={saving || !accountLoaded || (!run.finished && run.index < choiceCount && run.selected === null)} type="submit">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />{run.finished ? ui.common.restartQuiz : saving ? ui.quiz.saving : saveError === "settings" ? ui.quiz.evaluateWithoutSave : saveError ? ui.quiz.retrySave : writing ? ui.quiz.finishButton : ui.common.next}
            </button>
          </form>
        </>}
      </>}
    </div>
  </section>;
}
