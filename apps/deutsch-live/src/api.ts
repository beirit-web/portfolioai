export type Phrase = {
  de: string;
  ru: string;
  hint: string;
  scene?: string;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  optionIds: string[];
};

export type LearningScene = {
  id: string;
  title: string;
  ru: string;
  level?: string;
  isPremium?: boolean;
  dialogue: Array<{
    speaker: string;
    de: string;
    ru: string;
  }>;
  explanation: string;
};

export type VocabularyItem = {
  de: string;
  ru: string;
  example: string;
};

export type MiniExercise = {
  type: "gap" | "translation" | "order" | "roleplay";
  prompt: string;
  template?: string;
  answer?: string;
  items?: string[];
};

export type FreeAnswerTask = {
  prompt: string;
  task: string;
  example: string;
  building_blocks: string[];
};

export type TopicSummary = {
  id: string;
  label: string;
  icon: string;
  ru: string;
  phraseCount: number;
  quizCount: number;
};

export type Topic = TopicSummary & {
  description?: string;
  phrases: Phrase[];
  scenes?: LearningScene[];
  vocabulary?: VocabularyItem[];
  exercises?: MiniExercise[];
  free_answer?: FreeAnswerTask;
  quiz: QuizQuestion[];
};

export type QuizTopic = Pick<Topic, "id" | "label" | "icon" | "ru" | "quiz" | "free_answer"> & { quizToken: string };

export type QuizEvaluation = {
  attempt: {
    id: number | null;
    topicLabel: string;
    score: number;
    total: number;
    percentage: number;
    durationSeconds: number;
    difficulty: string;
  };
  saved: boolean;
  feedback: Array<{
    questionId: string;
    selectedOptionId: string | null;
    correctOptionId: string;
    correct: boolean;
    explain: string;
  }>;
  writing: { accepted: boolean; explain: string };
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export type PageContent = {
  scenes: string[];
  library: Array<{ icon: string; title: string; text: string }>;
};

export type UserSettings = {
  role: string;
  premiumStatus: string;
  hasPremiumAccess: boolean;
  emailVerified: boolean;
  interfaceLanguage: string;
  explanationLanguage: string;
  themePreference: "light" | "dark" | "system";
  level: string;
  mainGoal: string;
  preferredTopic: string;
  saveProgress: boolean;
};

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  isStaff: boolean;
  roles: string[];
  settings: UserSettings;
};


export type WritingExercise = {
  id: number;
  topicId: string;
  topicLabel: string;
  prompt: string;
  userText: string;
  correction: string;
  explanation: string;
  status: string;
  createdAt: string;
};


export type FeedbackCategory = "bug" | "suggestion" | "content" | "account" | "other";

export type FeedbackItem = {
  id: number;
  category: FeedbackCategory;
  status: string;
  message: string;
  createdAt: string;
};

export type DashboardData = {
  summary: {
    totalScore: number;
    totalQuestions: number;
    attemptCount: number;
    average: number;
    averageDurationSeconds: number;
  };
  byTopic: Array<{ topicId: string; topicLabel: string; score: number; total: number; attempts: number }>;
  recentAttempts: Array<{
    id: number;
    topicId: string;
    topicLabel: string;
    score: number;
    total: number;
    percentage: number;
    durationSeconds: number;
    difficulty: "easy" | "medium" | "hard";
    createdAt: string;
  }>;
  botHistory: WritingExercise[];
  progress: {
    completedScenes: number;
    startedScenes: number;
    totalScenes: number;
  };
  learningPlan: {
    nextScene: { id: string; topicId: string; title: string; level: string; isPremium: boolean } | null;
    reviewTopics: Array<{ topicId: string; topicLabel: string; percentage: number; reason: string }>;
  };
  premiumHints: Array<{ id: string; title: string; topicId: string; reason: string }>;
  vocabulary: Array<{ id: number; wordDe: string; translationRu: string }>;
  recommendations: string[];
  goals: {
    dailyMinutes: number;
    dailyScenes: number;
  };
  badges: Array<{ code: string; title: string }>;
  settings: UserSettings;
};

const CONFIGURED_API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE ?? "");

function normalizeApiBase(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function getApiBase() {
  if (CONFIGURED_API_BASE) return CONFIGURED_API_BASE;
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/deutschlive")) {
    return "/deutschlive";
  }
  return "";
}

export function getWebSocketUrl(path: string) {
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${getApiBase()}${path}`;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, { credentials: "include" });
  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status}`, response.status);
  }
  return response.json();
}

const getCache = new Map<string, { expiresAt: number; value: unknown }>();
const pendingGets = new Map<string, Promise<unknown>>();

async function getCachedJson<T>(path: string, ttlMs: number): Promise<T> {
  const now = Date.now();
  const cached = getCache.get(path);
  if (cached && cached.expiresAt > now) return cached.value as T;

  const pending = pendingGets.get(path);
  if (pending) return pending as Promise<T>;

  const request = getJson<T>(path)
    .then((value) => {
      getCache.set(path, { expiresAt: Date.now() + ttlMs, value });
      return value;
    })
    .finally(() => pendingGets.delete(path));
  pendingGets.set(path, request);
  return request;
}

async function postJson<T>(path: string, body: unknown, method = "POST"): Promise<T> {
  await ensureCsrf();
  const response = await fetch(`${getApiBase()}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken")
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error ?? `Request failed: ${response.status}`, response.status, data.code);
  }
  return data;
}

let csrfReady: Promise<unknown> | null = null;

function ensureCsrf() {
  if (!csrfReady) {
    csrfReady = getJson("/api/auth/csrf/").catch((error) => {
      csrfReady = null;
      throw error;
    });
  }
  return csrfReady;
}

function getCookie(name: string) {
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : "";
}

export async function fetchTopics() {
  const data = await getCachedJson<{ topics: TopicSummary[] }>("/api/topics/", 5 * 60 * 1000);
  return data.topics;
}


export async function fetchLearningTopic(topicId: string) {
  return getCachedJson<Topic>(`/api/topics/${encodeURIComponent(topicId)}/?view=learn`, 5 * 60 * 1000);
}

export async function fetchQuizTopic(topicId: string) {
  return getJson<QuizTopic>(`/api/topics/${encodeURIComponent(topicId)}/?view=quiz`);
}

export async function fetchPageContent() {
  return getCachedJson<PageContent>("/api/page/", 10 * 60 * 1000);
}

export async function fetchMe() {
  return getJson<{ user: CurrentUser | null; authTokenExpiresAt?: string }>("/api/auth/me/");
}

export async function registerUser(payload: { username: string; email: string; password: string }) {
  return postJson<{ ok: boolean; message: string; emailVerificationRequired?: boolean; emailVerificationToken?: string }>("/api/auth/register/", payload);
}

export async function loginUser(payload: { username: string; password: string }) {
  return postJson<{ user: CurrentUser; authTokenExpiresAt: string }>("/api/auth/login/", payload);
}

export async function logoutUser() {
  return postJson<{ ok: boolean }>("/api/auth/logout/", {});
}

export async function requestPasswordReset(identifier: string) {
  return postJson<{ ok: boolean; message: string; resetToken?: string }>("/api/auth/password-reset/", { identifier });
}

export async function confirmPasswordReset(token: string, password: string) {
  return postJson<{ ok: boolean; message: string }>("/api/auth/password-reset/confirm/", { token, password });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return postJson<{ ok: boolean; message: string }>("/api/auth/change-password/", { currentPassword, newPassword });
}

export async function resendEmailConfirmation() {
  return postJson<{ ok: boolean; message: string; emailVerificationToken?: string }>("/api/auth/email/resend/", {});
}

export async function exportUserData() {
  return getJson<{ export: unknown; format: "json" }>("/api/auth/export/");
}

export async function deleteAccount(password: string) {
  return postJson<{ ok: boolean }>("/api/auth/delete-account/", { password });
}

export async function fetchDashboard() {
  return getJson<DashboardData>("/api/dashboard/");
}

export async function clearLearningProgress() {
  return postJson<{ ok: boolean; deleted: Record<string, number> }>("/api/dashboard/clear-progress/", {});
}

export async function saveQuizAttempt(payload: {
  topicId: string;
  quizToken: string;
  answers: Array<{ questionId: string; optionId: string | null }>;
  freeAnswer: string;
  freeAnswerExpired: boolean;
  durationSeconds: number;
  difficulty: "easy" | "medium" | "hard";
  save: boolean;
}) {
  return postJson<QuizEvaluation>(
    "/api/quiz-attempts/",
    payload
  );
}

export async function saveProgress(payload: { topicId: string; status: "started" | "completed"; completedExercises?: number }) {
  return postJson<{ progress: { topicId: string; status: string; completedExercises: number } }>("/api/progress/", payload);
}

export async function saveVocabulary(payload: { topicId: string; wordDe: string; translationRu: string; notes?: string }) {
  return postJson<{ vocabulary: { id: number; wordDe: string; translationRu: string } }>("/api/vocabulary/", payload);
}


export async function fetchWritingExercises() {
  const data = await getJson<{ exercises: WritingExercise[] }>("/api/writing/exercises/");
  return data.exercises;
}

export async function saveWritingExercise(payload: { topicId: string; prompt: string; text: string }) {
  return postJson<{ exercise: WritingExercise }>("/api/writing/exercises/", payload);
}

export async function submitFeedback(payload: { category: FeedbackCategory; message: string; contactEmail?: string; pagePath?: string }) {
  return postJson<{ feedback: FeedbackItem }>("/api/feedback/", payload);
}

export async function updateSettings(settings: Partial<UserSettings>) {
  return postJson<{ settings: UserSettings }>("/api/settings/", settings, "PATCH");
}
