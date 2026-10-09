import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, PencilLine, Timer, Trophy, XCircle } from "lucide-react";
import { fetchTopic, fetchTopics, saveQuizAttempt, type CurrentUser, type Topic, type TopicSummary } from "../api";
import { ui } from "../i18n";
import { SkeletonPanel, SkeletonStatGrid } from "./UiPrimitives";

type QuizModeProps = {
  user: CurrentUser | null;
  onAttemptSaved: () => void;
};

type Difficulty = "easy" | "medium" | "hard";

const difficultyConfig: Record<Difficulty, { choiceSeconds: number; writingSeconds: number }> = {
  easy: { choiceSeconds: 60, writingSeconds: 180 },
  medium: { choiceSeconds: 45, writingSeconds: 150 },
  hard: { choiceSeconds: 30, writingSeconds: 120 }
};

function getDifficultyLabel(level: Difficulty) {
  return ui.quiz[level];
}

export default function QuizMode({ user, onAttemptSaved }: QuizModeProps) {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [activeTopicId, setActiveTopicId] = useState("baeckerei");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [secondsLeft, setSecondsLeft] = useState(difficultyConfig.easy.choiceSeconds);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [freeAnswer, setFreeAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [questionDurations, setQuestionDurations] = useState<number[]>([]);
  const [temporaryTotal, setTemporaryTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [timeExpired, setTimeExpired] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
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
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setFreeAnswer("");
      setScore(0);
      setQuestionDurations([]);
      setMessage("");
      setTimeExpired(false);
      setHasStarted(false);
      setSecondsLeft(getTimeLimit(0, data.quiz.length, difficulty));
    }).finally(() => setIsLoadingTopic(false));
  }, [activeTopicId]);

  useEffect(() => {
    setSecondsLeft(getTimeLimit(currentQuestion, topic?.quiz.length ?? 0, difficulty));
    setTimeExpired(false);
  }, [currentQuestion, difficulty]);

  useEffect(() => {
    if (!hasStarted || !topic || currentQuestion > topic.quiz.length || selectedAnswer !== null || timeExpired) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setTimeExpired(true);
          if (currentQuestion < topic.quiz.length) {
            recordQuestionTime(currentQuestion, getTimeLimit(currentQuestion, topic.quiz.length, difficulty));
            setSelectedAnswer(-1);
          }
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentQuestion, difficulty, hasStarted, questionDurations, selectedAnswer, timeExpired, topic]);

  const question = useMemo(() => {
    if (!hasStarted || !topic || currentQuestion >= topic.quiz.length + 1) return null;
    if (currentQuestion === topic.quiz.length) {
      return {
        question: topic.free_answer?.prompt ?? ui.quiz.freeAnswerPrompt,
        options: [],
        answer: -1,
        explain: ui.quiz.freeAnswerHint
      };
    }
    return topic.quiz[currentQuestion];
  }, [currentQuestion, hasStarted, topic]);

  function chooseAnswer(index: number) {
    if (!question || selectedAnswer !== null || timeExpired) return;
    recordQuestionTime(currentQuestion, getTimeLimit(currentQuestion, topic?.quiz.length ?? 0, difficulty) - secondsLeft);
    setSelectedAnswer(index);
    if (index === question.answer) setScore((value) => value + 1);
  }

  async function nextQuestion() {
    if (!topic) return;
    const total = topic.quiz.length + 1;

    if (currentQuestion === topic.quiz.length) {
      const timeLimit = getTimeLimit(currentQuestion, topic.quiz.length, difficulty);
      const currentDuration = timeExpired ? timeLimit : timeLimit - secondsLeft;
      const durations = recordQuestionTime(currentQuestion, currentDuration);
      const durationSeconds = durations.reduce((sum, value) => sum + value, 0);
      const freePoint = !timeExpired && freeAnswer.trim().length >= 8 ? 1 : 0;
      const finalScore = score + freePoint;
      setScore(finalScore);
      setTemporaryTotal((value) => value + finalScore);
      if (user?.settings.saveProgress) {
        await saveQuizAttempt({ topicId: topic.id, score: finalScore, total, durationSeconds, difficulty });
        onAttemptSaved();
        setMessage(ui.quiz.saved);
      } else {
        setMessage(user ? ui.quiz.savingDisabled : ui.quiz.guestPoints);
      }
      setCurrentQuestion((value) => value + 1);
      return;
    }

    if (currentQuestion >= total) {
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setFreeAnswer("");
      setScore(0);
      setQuestionDurations([]);
      setMessage("");
      setTimeExpired(false);
      setSecondsLeft(getTimeLimit(0, topic.quiz.length, difficulty));
      setHasStarted(false);
      return;
    }

    setCurrentQuestion((value) => value + 1);
    setSelectedAnswer(null);
    setTimeExpired(false);
  }

  function recordQuestionTime(index: number, seconds: number) {
    const nextDurations = [...questionDurations];
    if (nextDurations[index] === undefined) {
      nextDurations[index] = Math.max(0, Math.round(seconds));
      setQuestionDurations(nextDurations);
    }
    return nextDurations;
  }

  function getTimeLimit(questionIndex: number, quizLength: number, level: Difficulty) {
    return questionIndex === quizLength ? difficultyConfig[level].writingSeconds : difficultyConfig[level].choiceSeconds;
  }

  function startQuiz() {
    if (!topic) return;
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setFreeAnswer("");
    setScore(0);
    setQuestionDurations([]);
    setMessage("");
    setTimeExpired(false);
    setSecondsLeft(getTimeLimit(0, topic.quiz.length, difficulty));
    setHasStarted(true);
  }

  const totalQuestions = topic ? topic.quiz.length + 1 : 0;
  const currentStep = hasStarted && topic ? Math.min(currentQuestion + 1, totalQuestions) : 0;
  const progressValue = totalQuestions ? percentage(currentStep, totalQuestions) : 0;

  return (
    <section className="quiz-shell glass rounded-xl p-3 sm:rounded-[2rem] sm:p-8">
      <div className="quiz-intro">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-purple-600 dark:text-purple-300">
          {ui.quiz.title}
        </p>
        <h2 className="view-title--compact">{ui.quiz.subtitle}</h2>
        <p className="mt-4 max-w-3xl text-slate-700 dark:text-slate-300">
          {ui.quiz.description}
        </p>
      </div>

      <div className="quiz-setup-panel">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-purple-700 dark:text-purple-300">
          {ui.quiz.difficulty}
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.quiz.choiceWritingTime}</p>
        <div className="quiz-difficulty-list">
          {(Object.keys(difficultyConfig) as Difficulty[]).map((level) => (
            <button
              aria-pressed={difficulty === level}
              className={`quiz-difficulty-button ${difficulty === level ? "is-active" : ""}`}
              key={level}
              onClick={() => {
                setDifficulty(level);
                setCurrentQuestion(0);
                setSelectedAnswer(null);
                setFreeAnswer("");
                setScore(0);
                setQuestionDurations([]);
                setMessage("");
                setTimeExpired(false);
                setHasStarted(false);
              }}
              type="button"
            >
              {getDifficultyLabel(level)}
              <span className="mt-1 block text-sm font-semibold opacity-75">
                {difficultyConfig[level].choiceSeconds} / {difficultyConfig[level].writingSeconds} {ui.quiz.seconds}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-topic-list">
        {isLoadingTopics && (
          <>
            <SkeletonPanel rows={2} className="p-3 sm:p-3" />
            <SkeletonPanel rows={2} className="p-3 sm:p-3" />
            <SkeletonPanel rows={2} className="p-3 sm:p-3" />
            <SkeletonPanel rows={2} className="p-3 sm:p-3" />
          </>
        )}
        {topics.map((item) => (
          <button className={`quiz-topic-button choice-btn ${item.id === activeTopicId ? "is-selected" : ""}`} key={item.id} onClick={() => setActiveTopicId(item.id)} type="button">
            <span>{item.icon} {item.ru}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </div>

      {isLoadingTopic && <QuizSkeleton />}

      {!isLoadingTopic && topic && (
        <div className="quiz-workspace">
          <div className="quiz-workspace__header">
            <h3 className="flex items-center gap-2 text-2xl font-black leading-tight">
              <Trophy className="h-7 w-7" />
              {topic.icon} {topic.ru}
            </h3>
            <p className="rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-bold text-cyan-700 dark:text-cyan-200">
              {hasStarted && question
                ? `${ui.common.question} ${Math.min(currentQuestion + 1, topic.quiz.length + 1)} / ${topic.quiz.length + 1}`
                : hasStarted
                  ? ui.common.finished
                  : `${ui.quiz.questionCount}: ${topic.quiz.length + 1}`}
            </p>
          </div>
          {hasStarted && totalQuestions > 0 && (
            <div className="quiz-progress-panel">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-kicker text-indigo-700 dark:text-indigo-200">{ui.quiz.progress}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {currentStep} / {totalQuestions} · {ui.quiz.score}: {score}
                  </p>
                </div>
                <p className="inline-flex items-center gap-2 rounded-full bg-cyan-400/15 px-3 py-2 text-sm font-bold text-cyan-800 dark:text-cyan-100">
                  <Timer className="h-4 w-4" />
                  {secondsLeft} {ui.quiz.seconds}
                </p>
              </div>
              <div className="progress-track" aria-hidden="true">
                <span style={{ width: `${progressValue}%` }} />
              </div>
              <div className="quiz-stepper" aria-label={ui.quiz.progress}>
                {Array.from({ length: totalQuestions }).map((_, index) => {
                  const isDone = index < currentQuestion;
                  const isCurrent = index === currentQuestion;
                  return (
                    <span className={`quiz-step ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`} key={index}>
                      {index + 1}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {!hasStarted && (
            <div className="quiz-start-card">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-purple-700 dark:text-purple-300">
                {ui.quiz.startTitle}
              </p>
              <p className="mt-2 text-slate-700 dark:text-slate-300">{ui.quiz.startDescription}</p>
              <div className="quiz-start-summary">
                <div className="rounded-xl bg-cyan-400/10 p-3">
                  <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-200">{ui.quiz.selectedTopic}</p>
                  <p className="mt-1 font-black">{topic.icon} {topic.ru}</p>
                </div>
                <div className="rounded-xl bg-cyan-400/10 p-3">
                  <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-200">{ui.quiz.difficulty}</p>
                  <p className="mt-1 font-black">{getDifficultyLabel(difficulty)}</p>
                </div>
                <div className="rounded-xl bg-cyan-400/10 p-3">
                  <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-200">{ui.quiz.questionCount}</p>
                  <p className="mt-1 font-black">{topic.quiz.length + 1}</p>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.quiz.includesWriting}</p>
              <button className="quiz-primary-action mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-400" onClick={startQuiz} type="button">
                <CheckCircle2 className="h-5 w-5" />
                {ui.quiz.startButton}
              </button>
            </div>
          )}

          {hasStarted && question && currentQuestion <= topic.quiz.length && (
            <div className="quiz-timer-strip">
              <div className="flex items-center justify-between gap-3 text-sm font-bold">
                <span>{ui.quiz.timeLeft}</span>
                <span className={secondsLeft <= 10 ? "text-red-600 dark:text-red-300" : "text-cyan-700 dark:text-cyan-300"}>
                  {secondsLeft} {ui.quiz.seconds}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${secondsLeft <= 10 ? "bg-red-500" : "bg-cyan-500"}`}
                  style={{ width: `${(secondsLeft / getTimeLimit(currentQuestion, topic.quiz.length, difficulty)) * 100}%` }}
                />
              </div>
              {timeExpired && <p className="mt-2 text-sm font-bold text-red-700 dark:text-red-300">{ui.quiz.timeExpired}</p>}
            </div>
          )}

          <div className="quiz-question-area">
            {hasStarted && question && currentQuestion < topic.quiz.length && (
              <>
                <p className="quiz-question-title text-learning-sentence">{question.question}</p>
                <div className="mt-5 grid gap-3">
                  {question.options.map((option, index) => {
                    const isCorrect = selectedAnswer !== null && index === question.answer;
                    const isWrong = selectedAnswer === index && index !== question.answer;
                    return (
                      <button className={`quiz-option rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-left font-semibold dark:border-slate-700 dark:bg-slate-950/50 ${isCorrect ? "is-correct" : ""} ${isWrong ? "is-wrong" : ""}`} disabled={selectedAnswer !== null} key={option} onClick={() => chooseAnswer(index)} type="button">
                        <span>{option}</span>
                        {isCorrect && <CheckCircle2 aria-label={ui.quiz.correctAnswer} className="h-5 w-5 shrink-0" />}
                        {isWrong && <XCircle aria-label={ui.quiz.wrongAnswer} className="h-5 w-5 shrink-0" />}
                        {!isCorrect && !isWrong && <Circle aria-hidden="true" className="h-4 w-4 shrink-0 opacity-40" />}
                      </button>
                    );
                  })}
                </div>
                {timeExpired && <p className="mt-4 font-semibold text-red-700 dark:text-red-300">{ui.quiz.timeExpiredExplanation}</p>}
                {selectedAnswer !== null && (
                  <p className={`quiz-feedback ${selectedAnswer === question.answer ? "is-correct" : "is-wrong"}`}>
                    {selectedAnswer === question.answer ? ui.quiz.correctAnswer : ui.quiz.wrongAnswer} · {question.explain}
                  </p>
                )}
              </>
            )}

            {hasStarted && question && currentQuestion === topic.quiz.length && (
              <>
                <p className="quiz-question-title flex items-center gap-2 text-xl font-bold">
                  <PencilLine className="h-6 w-6" />
                  {question.question}
                </p>
                {topic.free_answer?.task && (
                  <div className="mt-4 rounded-xl bg-cyan-400/10 p-3 sm:rounded-2xl sm:p-4">
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
                      {ui.quiz.freeAnswerTask}
                    </p>
                    <p className="mt-2 font-semibold text-slate-700 dark:text-slate-300">{topic.free_answer.task}</p>
                  </div>
                )}
                <textarea className="quiz-writing-input mt-5 min-h-32 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950 outline-none focus:border-cyan-400 disabled:opacity-60" disabled={timeExpired} onChange={(event) => setFreeAnswer(event.target.value)} value={freeAnswer} />
                {topic.free_answer?.building_blocks && (
                  <div className="quiz-building-blocks mt-3">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{ui.quiz.buildingBlocks}:</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {topic.free_answer.building_blocks.map((block) => (
                        <button
                          className="rounded-full bg-white/80 px-3 py-2 text-sm font-bold text-slate-700 shadow-sm dark:bg-slate-950/50 dark:text-slate-200"
                          disabled={timeExpired}
                          key={block}
                          onClick={() => setFreeAnswer((value) => `${value}${value.trim() ? " " : ""}${block}`)}
                          type="button"
                        >
                          {block}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {ui.quiz.exampleLabel}: {topic.free_answer?.example ?? "Ich hätte gern zwei Brötchen, bitte."}
                </p>
              </>
            )}

            {hasStarted && currentQuestion > topic.quiz.length && (
              <div className="quiz-result-card">
                <p className="text-xl font-bold">{ui.quiz.result}: {score} / {topic.quiz.length + 1}</p>
                <p className="mt-3 font-semibold text-cyan-700 dark:text-cyan-300">{message}</p>
                {!user && <p className="mt-3 text-slate-600 dark:text-slate-300">{ui.quiz.temporaryGuestPoints}: {temporaryTotal}</p>}
              </div>
            )}

            {hasStarted && ((selectedAnswer !== null && currentQuestion < topic.quiz.length) || currentQuestion >= topic.quiz.length) && (
              <button className="quiz-primary-action mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-400" onClick={nextQuestion} type="button">
                <CheckCircle2 className="h-5 w-5" />
                {currentQuestion > topic.quiz.length ? ui.common.restartQuiz : ui.common.next}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function QuizSkeleton() {
  return (
    <div className="mt-8 rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SkeletonPanel rows={2} className="w-full sm:max-w-md" />
        <SkeletonPanel rows={1} className="w-full sm:max-w-xs" />
      </div>
      <SkeletonStatGrid className="mb-5" />
      <SkeletonPanel rows={6} />
    </div>
  );
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}
