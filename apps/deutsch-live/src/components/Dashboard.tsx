import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { BarChart3, BookOpenCheck, Download, Flame, Lightbulb, Lock, PenLine, RotateCcw, Route, Settings, Sparkles, Target, Trash2, Trophy } from "lucide-react";
import { clearLearningProgress, exportUserData, fetchDashboard, updateSettings, type CurrentUser, type DashboardData, type UserSettings } from "../api";
import { setLocale, ui, type Locale } from "../i18n";
import { EmptyState, Panel, PanelForm, SkeletonBlock, SkeletonPanel, SkeletonStatGrid, SurfaceItem } from "./UiPrimitives";

type DashboardProps = {
  user: CurrentUser | null;
  refreshToken: number;
  onSettingsSaved?: (settings: UserSettings) => void;
};

function formatLevel(level?: string) {
  const normalized = level?.toLowerCase();
  if (normalized === "a2") return ui.levels.medium;
  if (normalized === "b1") return ui.levels.hard;
  return ui.levels.easy;
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

export default function Dashboard({ user, ...props }: DashboardProps) {
  return user ? <AccountDashboard key={user.id} user={user} {...props} /> : null;
}

function AccountDashboard({ user, refreshToken, onSettingsSaved }: Omit<DashboardProps, "user"> & { user: CurrentUser }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [message, setMessage] = useState("");
  const [showClearProgress, setShowClearProgress] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadRetry, setLoadRetry] = useState(0);
  const [actionError, setActionError] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const busyRef = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);
    fetchDashboard(controller.signal).then((dashboard) => {
      if (controller.signal.aborted) return;
      setData(dashboard);
      if (!dirty.current) setSettings(dashboard.settings);
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [refreshToken, loadRetry]);

  const loadFailure = loadError ? <Panel>
    <p role="alert">{ui.dashboard.loadFailed}</p>
    <button className="mt-3 rounded-xl bg-cyan-500 px-4 py-2 font-bold text-slate-950" type="button" onClick={() => setLoadRetry(value => value + 1)}>{ui.dashboard.retry}</button>
  </Panel> : null;
  if (loadError && !data) return loadFailure;
  if (!data || !settings) return <DashboardSkeleton />;

  function editSettings(next: UserSettings) {
    dirty.current = true;
    setSettings(next);
  }

  async function runAction(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setMessage(""); setActionError(false);
    try { await action(); }
    catch { if (active.current) { setActionError(true); setMessage(ui.dashboard.actionFailed); } }
    finally { if (active.current) { busyRef.current = false; setBusy(false); } }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    await runAction(async () => {
      const response = await updateSettings({
      level: settings.level,
      mainGoal: settings.mainGoal,
      preferredTopic: settings.preferredTopic,
      saveProgress: settings.saveProgress,
      interfaceLanguage: settings.interfaceLanguage,
      explanationLanguage: settings.explanationLanguage
    });
      if (!active.current) return;
      dirty.current = false;
      setSettings(response.settings);
      onSettingsSaved?.(response.settings);
      if (response.settings.interfaceLanguage === "ru" || response.settings.interfaceLanguage === "de") {
        setLocale(response.settings.interfaceLanguage as Locale);
      }
      setMessage(ui.dashboard.settingsSaved);
    });
  }

  async function exportData() {
    await runAction(async () => {
    const payload = await exportUserData();
    if (!active.current) return;
    const blob = new Blob([JSON.stringify(payload.export, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "deutsch-live-export.json";
    link.click();
    window.URL.revokeObjectURL(url);
    setMessage(ui.dashboard.exportReady);
    });
  }

  async function removeProgress() {
    await runAction(async () => {
    await clearLearningProgress();
    const dashboard = await fetchDashboard();
    if (!active.current) return;
    setData(dashboard);
    if (!dirty.current) setSettings(dashboard.settings);
    setShowClearProgress(false);
    setMessage(ui.dashboard.clearProgressDone);
    });
  }

  return (
    <section id="dashboard" className="dashboard-shell section-shell">
      {loadFailure}
      <p role={actionError ? "alert" : "status"} aria-live="polite">{busy ? ui.dashboard.working : message}</p>
      <div className="dashboard-header section-header">
        <div>
          <p className="section-kicker">
            {ui.dashboard.title}
          </p>
          <h2 className="view-title mt-4 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-indigo-600 dark:text-indigo-200" />
            {ui.dashboard.subtitle}
          </h2>
          <p className="section-copy">
            {ui.dashboard.description}
          </p>
        </div>
      </div>

      <section className="dashboard-next-card">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-indigo-200 dark:text-indigo-700">{ui.dashboard.nextScene}</p>
          <h3 className="mt-2 text-2xl font-black leading-tight">
            {data.learningPlan.nextScene?.title ?? ui.dashboard.noNextScene}
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/75 dark:text-slate-600">
            {data.learningPlan.nextScene ? ui.dashboard.nextSceneText : ui.dashboard.repeatCompletedTopics}
          </p>
        </div>
        <Route className="dashboard-next-card__icon" />
      </section>

      <ProgressOverview data={data} />

      <div className="dashboard-flow">
        <Panel className="dashboard-recommendation-panel">
          <h3 className="text-xl font-black">{ui.dashboard.recommendations}</h3>
          <RecommendationList recommendations={data.recommendations} />
          <BadgeList badges={data.badges} />
          <PremiumHints hints={data.premiumHints} />
        </Panel>

        <div className="dashboard-stat-stack">
          <div className="section-grid--stats">
            <Stat icon={<Trophy />} label={ui.dashboard.points} tone="indigo" value={data.summary.totalScore} />
            <Stat icon={<BarChart3 />} label={ui.dashboard.quizAttempts} tone="cyan" value={data.summary.attemptCount} />
            <Stat icon={<Target />} label={ui.dashboard.average} tone="emerald" value={`${data.summary.average}%`} />
          </div>
          <div className="section-grid--stats mt-4">
            <Stat icon={<BookOpenCheck />} label={ui.dashboard.completedScenes} tone="indigo" value={`${data.progress.completedScenes} / ${data.progress.totalScenes}`} />
            <Stat icon={<Sparkles />} label={ui.dashboard.savedWords} tone="cyan" value={data.vocabulary.length} />
            <Stat icon={<Flame />} label={ui.dashboard.averageTime} tone="amber" value={formatDuration(data.summary.averageDurationSeconds)} />
          </div>
        </div>

        <LearningPlan data={data} />

        <Panel className="dashboard-topic-panel">
          <h3 className="text-xl font-black">{ui.dashboard.byTopic}</h3>
          <div className="mt-4 space-y-3">
            {data.byTopic.length === 0 && (
              <EmptyState icon={<BarChart3 />} title={ui.dashboard.noResultsTitle}>
                {ui.dashboard.noResults}
              </EmptyState>
            )}
            {data.byTopic.map((topic) => (
              <SurfaceItem className="p-4" key={topic.topicId}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">{topic.topicLabel}</p>
                  <p className="font-bold text-cyan-700 dark:text-cyan-300">
                    {topic.score} / {topic.total}
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{topic.attempts} {ui.dashboard.attempts}</p>
              </SurfaceItem>
            ))}
          </div>
        </Panel>

        <TimeAnalysis attempts={data.recentAttempts} />

        <Panel className="dashboard-writing-panel">
          <h3 className="text-xl font-black">{ui.dashboard.lastExercises}</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {data.botHistory.length === 0 && (
              <EmptyState icon={<PenLine />} title={ui.dashboard.noWritingHistoryTitle}>
                {ui.dashboard.noWritingHistory}
              </EmptyState>
            )}
            {data.botHistory.map((item) => (
              <SurfaceItem key={item.id}>{item.userText}</SurfaceItem>
            ))}
          </div>
        </Panel>

        <PanelForm className="dashboard-settings-panel" onSubmit={saveSettings}>
          <fieldset disabled={busy} className="min-w-0 border-0 p-0">
          <h3 className="flex items-center gap-2 text-xl font-black">
            <Settings className="h-6 w-6" />
            {ui.dashboard.settings}
          </h3>
          <label className="mt-4 block text-sm font-bold" htmlFor="level">{ui.dashboard.level}</label>
          <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950" id="level" onChange={(event) => editSettings({ ...settings, level: event.target.value })} value={settings.level}>
            <option value="start">{ui.levels.easy}</option>
            <option value="a1">{ui.levels.easy}</option>
            <option value="a2">{ui.levels.medium}</option>
            <option value="b1">{ui.levels.hard}</option>
          </select>

          <label className="mt-4 block text-sm font-bold" htmlFor="goal">{ui.dashboard.goal}</label>
          <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950" id="goal" onChange={(event) => editSettings({ ...settings, mainGoal: event.target.value })} value={settings.mainGoal} />

          <label className="mt-4 block text-sm font-bold" htmlFor="topic">{ui.dashboard.mainTopic}</label>
          <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950" id="topic" onChange={(event) => editSettings({ ...settings, preferredTopic: event.target.value })} value={settings.preferredTopic} />

          <label className="mt-4 block text-sm font-bold" htmlFor="interface-language">{ui.dashboard.interfaceLanguage}</label>
          <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950" id="interface-language" onChange={(event) => editSettings({ ...settings, interfaceLanguage: event.target.value })} value={settings.interfaceLanguage}>
            <option value="ru">Русский</option>
            <option value="de">Deutsch</option>
          </select>

          <label className="mt-4 block text-sm font-bold" htmlFor="explanation-language">{ui.dashboard.explanationLanguage}</label>
          <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950" id="explanation-language" onChange={(event) => editSettings({ ...settings, explanationLanguage: event.target.value })} value={settings.explanationLanguage}>
            <option value="ru">Русский</option>
            <option value="de">Deutsch</option>
          </select>

          <label className="mt-4 flex items-center gap-3 font-semibold">
            <input checked={settings.saveProgress} onChange={(event) => editSettings({ ...settings, saveProgress: event.target.checked })} type="checkbox" />
            {ui.dashboard.saveProgress}
          </label>

          <div className="dashboard-settings-actions mt-5 flex flex-wrap gap-2">
            <button className="rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" type="submit">{ui.common.save}</button>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-300/70 px-5 py-3 font-bold dark:border-slate-700" onClick={exportData} type="button">
              <Download className="h-5 w-5" />
              {ui.dashboard.exportData}
            </button>
          </div>
          </fieldset>
        </PanelForm>

        <div className="dashboard-danger-zone rounded-xl bg-red-500/10 p-3 sm:rounded-[1.5rem] sm:p-5">
          <h3 className="flex items-center gap-2 text-xl font-black text-red-800 dark:text-red-200">
            <Trash2 className="h-6 w-6" />
            {ui.dashboard.clearProgress}
          </h3>
          <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-200">
            {ui.dashboard.clearProgressWarning}
          </p>
          {showClearProgress ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-2xl bg-red-600 px-5 py-3 font-bold text-white" onClick={removeProgress} disabled={busy} type="button">
                {ui.dashboard.clearProgressConfirm}
              </button>
              <button className="rounded-2xl border border-slate-300/70 px-5 py-3 font-bold dark:border-slate-700" onClick={() => setShowClearProgress(false)} disabled={busy} type="button">
                {ui.dashboard.clearProgressCancel}
              </button>
            </div>
          ) : (
            <button className="mt-4 rounded-2xl border border-red-300/70 px-5 py-3 font-bold text-red-700 dark:border-red-500/40 dark:text-red-200" onClick={() => setShowClearProgress(true)} disabled={busy} type="button">
              {ui.dashboard.clearProgress}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}


function LearningPlan({ data }: { data: DashboardData }) {
  return (
    <div className="dashboard-learning-plan mt-6 grid gap-4 md:grid-cols-2">
      <Panel>
        <h3 className="flex items-center gap-2 text-xl font-black">
          <Route className="h-5 w-5" />
          {ui.dashboard.nextScene}
        </h3>
        {data.learningPlan.nextScene ? (
          <SurfaceItem className="mt-4 rounded-xl">
            <p className="inline-flex max-w-full rounded-full bg-cyan-400/10 px-3 py-1 text-sm font-bold text-cyan-700 dark:text-cyan-200">{formatLevel(data.learningPlan.nextScene.level)}</p>
            <p className="mt-1 font-black">{data.learningPlan.nextScene.title}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{ui.dashboard.nextSceneText}</p>
          </SurfaceItem>
        ) : (
          <EmptyState className="mt-3" icon={<BookOpenCheck />} title={ui.dashboard.noNextSceneTitle}>
            {ui.dashboard.noNextScene}
          </EmptyState>
        )}
      </Panel>

      <Panel>
        <h3 className="flex items-center gap-2 text-xl font-black">
          <RotateCcw className="h-5 w-5" />
          {ui.dashboard.review}
        </h3>
        {data.learningPlan.reviewTopics.length === 0 ? (
          <EmptyState className="mt-3" icon={<RotateCcw />} title={ui.dashboard.noReviewTitle}>
            {ui.dashboard.noReview}
          </EmptyState>
        ) : (
          <div className="mt-4 space-y-2">
            {data.learningPlan.reviewTopics.map((topic) => (
              <SurfaceItem className="rounded-xl" key={topic.topicId}>
                <div className="flex items-center justify-between gap-3 text-sm font-bold">
                  <span>{topic.topicLabel}</span>
                  <span>{topic.percentage}%</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{topic.reason}</p>
              </SurfaceItem>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <section id="dashboard" className="section-shell">
      <div className="section-header">
        <div>
          <SkeletonBlock className="h-4 w-32 rounded-full" />
          <SkeletonBlock className="mt-4 h-12 max-w-xl rounded-2xl" />
          <SkeletonBlock className="mt-4 h-5 max-w-2xl" />
        </div>
        <SkeletonPanel rows={3} />
      </div>
      <div className="section-grid section-grid--dashboard">
        <div className="space-y-4">
          <SkeletonStatGrid />
          <SkeletonPanel rows={5} />
          <SkeletonPanel rows={4} />
        </div>
        <div className="space-y-5">
          <SkeletonPanel rows={5} />
          <SkeletonPanel rows={6} />
        </div>
      </div>
    </section>
  );
}

function PremiumHints({ hints }: { hints: DashboardData["premiumHints"] }) {
  if (hints.length === 0) return null;
  return (
    <div className="mt-5 rounded-xl bg-amber-400/10 p-3 sm:rounded-2xl sm:p-4">
      <h3 className="flex items-center gap-2 text-lg font-black text-amber-800 dark:text-amber-200">
        <Lock className="h-5 w-5" />
        {ui.dashboard.premiumHints}
      </h3>
      <div className="mt-3 space-y-2">
        {hints.map((hint) => (
          <SurfaceItem className="rounded-xl bg-white/70 text-sm font-semibold text-slate-700 dark:text-slate-200" key={hint.id}>
            {hint.title} · {hint.reason}
          </SurfaceItem>
        ))}
      </div>
    </div>
  );
}

function ProgressOverview({ data }: { data: DashboardData }) {
  const sceneProgress = percentage(data.progress.completedScenes, data.progress.totalScenes);
  const dailySceneProgress = percentage(Math.min(data.progress.startedScenes || data.progress.completedScenes, data.goals.dailyScenes), data.goals.dailyScenes);
  const dailyMinutesLabel = `${data.goals.dailyMinutes} ${ui.dashboard.minutesShort}`;

  return (
    <div className="dashboard-progress-grid">
      <Panel className="dashboard-progress-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-kicker text-indigo-700 dark:text-indigo-200">{ui.dashboard.learningProgress}</p>
            <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950 dark:text-white">
              {sceneProgress}%
            </h3>
          </div>
          <BookOpenCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-200" />
        </div>
        <ProgressBar value={sceneProgress} />
        <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {data.progress.completedScenes} {ui.dashboard.of} {data.progress.totalScenes} {ui.dashboard.scenesCompleted}
        </p>
      </Panel>

      <Panel className="dashboard-progress-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-kicker text-cyan-700 dark:text-cyan-200">{ui.dashboard.dailyGoal}</p>
            <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950 dark:text-white">
              {data.goals.dailyScenes} {ui.dashboard.scenesShort} · {dailyMinutesLabel}
            </h3>
          </div>
          <Target className="h-7 w-7 text-cyan-600 dark:text-cyan-200" />
        </div>
        <ProgressBar tone="cyan" value={dailySceneProgress} />
        <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {ui.dashboard.dailyGoalHint}
        </p>
      </Panel>

      <Panel className="dashboard-progress-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-kicker text-amber-700 dark:text-amber-200">{ui.dashboard.streakPrep}</p>
            <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950 dark:text-white">
              {data.badges.length}
            </h3>
          </div>
          <Flame className="h-7 w-7 text-amber-600 dark:text-amber-200" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {data.badges.length > 0 ? ui.dashboard.badgesUnlocked : ui.dashboard.streakPrepHint}
        </p>
      </Panel>
    </div>
  );
}

function ProgressBar({ value, tone = "indigo" }: { value: number; tone?: "indigo" | "cyan" | "emerald" }) {
  const color = tone === "cyan" ? "bg-cyan-500" : tone === "emerald" ? "bg-emerald-500" : "bg-indigo-600";

  return (
    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden="true">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function RecommendationList({ recommendations }: { recommendations: string[] }) {
  if (recommendations.length === 0) {
    return (
      <EmptyState className="mt-4" icon={<Lightbulb />} title={ui.dashboard.noRecommendationsTitle}>
        {ui.dashboard.noRecommendations}
      </EmptyState>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {recommendations.map((item, index) => (
        <SurfaceItem className="recommendation-item" key={item}>
          <span className="recommendation-item__index">{index + 1}</span>
          <span>{item}</span>
        </SurfaceItem>
      ))}
    </div>
  );
}

function BadgeList({ badges }: { badges: DashboardData["badges"] }) {
  if (badges.length === 0) {
    return (
      <EmptyState className="mt-5" icon={<Trophy />} title={ui.dashboard.noBadgesTitle}>
        {ui.dashboard.noBadges}
      </EmptyState>
    );
  }

  return (
    <div className="mt-5">
      <h3 className="flex items-center gap-2 text-lg font-black">
        <Trophy className="h-5 w-5 text-amber-500" />
        {ui.dashboard.badges}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-amber-400/15 px-3 py-2 text-sm font-bold text-amber-900 dark:text-amber-100" key={badge.code}>
            <Trophy className="h-4 w-4 shrink-0" />
            {badge.title}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon, label, tone, value }: { icon: ReactNode; label: string; tone: "indigo" | "cyan" | "emerald" | "amber"; value: number | string }) {
  const toneClass = {
    amber: "text-amber-600 bg-amber-400/15 dark:text-amber-200",
    cyan: "text-cyan-600 bg-cyan-400/15 dark:text-cyan-200",
    emerald: "text-emerald-600 bg-emerald-400/15 dark:text-emerald-200",
    indigo: "text-indigo-600 bg-indigo-400/15 dark:text-indigo-200"
  }[tone];

  return (
    <div className="stat-card">
      <div className={`stat-card__icon ${toneClass}`}>{icon}</div>
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function TimeAnalysis({ attempts }: { attempts: DashboardData["recentAttempts"] }) {
  const timedAttempts = attempts.filter((attempt) => attempt.durationSeconds > 0);
  const maxDuration = Math.max(...timedAttempts.map((attempt) => attempt.durationSeconds), 1);

  return (
    <Panel className="dashboard-time-panel mt-6">
      <h3 className="text-xl font-black">{ui.dashboard.timeAnalysis}</h3>
      {timedAttempts.length === 0 ? (
        <EmptyState className="mt-3" icon={<Flame />} title={ui.dashboard.timeAnalysisEmptyTitle}>
          {ui.dashboard.timeAnalysisEmpty}
        </EmptyState>
      ) : (
        <div className="mt-4 space-y-4">
          {timedAttempts.map((attempt) => (
            <SurfaceItem key={attempt.id}>
              <div className="flex items-center justify-between gap-3 text-sm font-bold">
                <span>{attempt.topicLabel} · {difficultyLabel(attempt.difficulty)}</span>
                <span>{formatDuration(attempt.durationSeconds)} · {attempt.percentage}%</span>
              </div>
              <div className="mt-3 grid gap-2">
                <Bar label={ui.dashboard.timeSpent} value={attempt.durationSeconds} max={maxDuration} tone="cyan" />
                <Bar label={ui.dashboard.average} value={attempt.percentage} max={100} tone="emerald" suffix="%" />
              </div>
            </SurfaceItem>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Bar({ label, value, max, tone, suffix = "" }: { label: string; value: number; max: number; tone: "cyan" | "emerald"; suffix?: string }) {
  const width = Math.max(4, Math.min(100, (value / max) * 100));
  const color = tone === "cyan" ? "bg-cyan-500" : "bg-emerald-500";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>{suffix ? `${value}${suffix}` : formatDuration(value)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return `0 ${ui.quiz.seconds}`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} ${ui.quiz.seconds}`;
  return `${minutes} ${ui.dashboard.minutesShort} ${rest} ${ui.quiz.seconds}`;
}

function difficultyLabel(difficulty: "easy" | "medium" | "hard") {
  if (difficulty === "hard") return ui.quiz.hard;
  if (difficulty === "medium") return ui.quiz.medium;
  return ui.quiz.easy;
}
