/* Vokabelbox — Copyright (c) 2025 Eugen, MIT License. */
(() => {
"use strict";
const WORDS = window.VOCAB_CONTENT.words;

const shell = document.querySelector(".vocab-shell");
if (!shell) return;

const elements = {
  totalCount: document.querySelector("#totalCount"),
  knownCount: document.querySelector("#knownCount"),
  favoriteCount: document.querySelector("#favoriteCount"),
  visibleCount: document.querySelector("#visibleCount"),
  searchInput: document.querySelector("#searchInput"),
  articleFilter: document.querySelector("#articleFilter"),
  wordGrid: document.querySelector("#wordGrid"),
  quizScore: document.querySelector("#quizScore"),
  quizWord: document.querySelector("#quizWord"),
  quizFeedback: document.querySelector("#quizFeedback"),
  quizOptions: document.querySelectorAll("[data-answer]"),
  nextQuestion: document.querySelector("#nextQuestion"),
  detailsTitle: document.querySelector("#details-title"),
  detailsTranslation: document.querySelector("#detailsTranslation"),
  knownButton: document.querySelector("#knownButton"),
  favoriteButton: document.querySelector("#favoriteButton"),
  catalogPanel: document.querySelector("#catalogPanel"),
  catalogTitle: document.querySelector("#catalog-title"),
  trainerPanel: document.querySelector("#trainerPanel"),
  viewButtons: document.querySelectorAll("[data-view]"),
  details: document.querySelector("#wordDetails"),
  closeDetails: document.querySelector("#closeDetails"),
};

const storageKey = shell.dataset.storageKey;
const translate = key => window.TRANSLATIONS?.[document.documentElement.lang]?.vocab?.[key]
  ?? window.TRANSLATIONS?.de?.vocab?.[key] ?? key;

const state = {
  selectedId: null,
  view: "words",
  knownIds: new Set(),
  favoriteIds: new Set(),
  quizWord: null,
  correctAnswers: 0,
  answeredQuestions: 0,
  answeredCurrentQuestion: false,
  lastAnswer: null,
};

// Progress stays in the current browser, separately for guests and each account.
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  const validIds = new Set(WORDS.map(word => word.id));
  if (saved && typeof saved === "object") {
    state.knownIds = new Set((Array.isArray(saved.knownIds) ? saved.knownIds : []).filter(id => validIds.has(id)));
    state.favoriteIds = new Set((Array.isArray(saved.favoriteIds) ? saved.favoriteIds : []).filter(id => validIds.has(id)));
    if (Number.isSafeInteger(saved.answeredQuestions) && saved.answeredQuestions >= 0
      && Number.isSafeInteger(saved.correctAnswers) && saved.correctAnswers >= 0
      && saved.correctAnswers <= saved.answeredQuestions) {
      state.answeredQuestions = saved.answeredQuestions;
      state.correctAnswers = saved.correctAnswers;
    }
  }
} catch { /* Learning remains usable when browser storage is unavailable. */ }

function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      knownIds: [...state.knownIds], favoriteIds: [...state.favoriteIds],
      correctAnswers: state.correctAnswers, answeredQuestions: state.answeredQuestions,
    }));
  } catch {
    const note = shell.querySelector(".vocab-storage-note");
    if (note) {
      note.dataset.i18n = "vocab.session_storage";
      note.textContent = translate("session_storage");
    }
  }
}

function getSelectedWord() {
  return WORDS.find((item) => item.id === state.selectedId);
}

const language = () => Object.hasOwn(window.VOCAB_CONTENT.vocabulary, document.documentElement.lang) ? document.documentElement.lang : "de";
const meaning = word => word.meanings[language()];
const normalizeSearch = value => value.normalize("NFKC").toLocaleLowerCase("de-DE").replace(/[’‘ʼ`]/g, "'").replace(/ё/g, "е");

// Normalize and sort the small dictionary once, not on every keystroke.
const wordCollator = new Intl.Collator("de-DE");
const sortedWords = [...WORDS].sort((a, b) => wordCollator.compare(a.word, b.word));
const searchIndex = new Map(WORDS.map(item => [item.id,
  normalizeSearch(`${item.article} ${item.word} ${item.translation} ${Object.values(item.meanings).join(" ")}`),
]));
const pluralRules = {};
const cards = new Map([...elements.wordGrid.querySelectorAll("[data-word-id]")].map(card => [card.dataset.wordId, card]));

function getFilteredWords() {
  const search = normalizeSearch(elements.searchInput.value.trim());
  const article = elements.articleFilter.value;

  return sortedWords.filter((item) => {
    const matchesArticle = article === "all" || item.article === article;
    const matchesView = state.view !== "favorites" || state.favoriteIds.has(item.id);
    const searchable = searchIndex.get(item.id);
    return matchesView && matchesArticle && searchable.includes(search);
  });
}

function renderStats() {
  elements.totalCount.textContent = String(WORDS.length);
  elements.knownCount.textContent = String(state.knownIds.size);
  elements.favoriteCount.textContent = String(state.favoriteIds.size);
  elements.quizScore.textContent = `${state.correctAnswers}/${state.answeredQuestions}`;
}

function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "vocab-icon");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#vocab-icon-${name}`);
  svg.append(use);
  return svg;
}

function wordCard(item) {
  let button = cards.get(item.id);
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "word-card";
    button.dataset.wordId = item.id;
    button.dataset.article = item.article;
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", "wordDetails");
    const article = document.createElement("span");
    article.className = "article-pill";
    article.textContent = item.article;
    article.lang = "de";
    const word = document.createElement("strong");
    word.textContent = item.word;
    word.lang = "de";
    const translation = document.createElement("small");
    translation.id = `meaning-${item.id}`;
    const statuses = document.createElement("span");
    statuses.className = "word-card__statuses";
    statuses.id = `status-${item.id}`;
    button.append(article, word, translation, statuses);
    document.createElement("li").append(button);
    cards.set(item.id, button);
  }
  button.disabled = false;
  button.classList.toggle("is-selected", item.id === state.selectedId);
  button.classList.toggle("is-known", state.knownIds.has(item.id));
  button.classList.toggle("is-favorite", state.favoriteIds.has(item.id));
  const translation = button.querySelector("small");
  if (translation.textContent !== meaning(item)) translation.textContent = meaning(item);
  translation.lang = language();
  const statuses = button.querySelector(".word-card__statuses");
  const statusKey = `${language()}:${state.knownIds.has(item.id)}:${state.favoriteIds.has(item.id)}`;
  if (statuses.dataset.state !== statusKey) {
    statuses.dataset.state = statusKey;
    statuses.replaceChildren();
    for (const [active, className, label] of [
      [state.knownIds.has(item.id), "word-status word-status--known", "learned"],
      [state.favoriteIds.has(item.id), "word-status word-status--favorite", "favorite_status"],
    ]) {
      if (!active) continue;
      const badge = document.createElement("span");
      badge.className = className;
      badge.append(icon(label === "learned" ? "check" : "star"), document.createTextNode(translate(label)));
      statuses.append(badge);
    }
  }
  return button.parentElement;
}

function renderWords() {
  const words = getFilteredWords();
  pluralRules[language()] ??= new Intl.PluralRules(language());
  const plural = pluralRules[language()].select(words.length);
  const count = `${words.length} ${translate(`matches_${plural}`)}`;
  if (elements.visibleCount.textContent !== count) elements.visibleCount.textContent = count;
  if (!words.length) {
    const emptyState = document.createElement("li");
    emptyState.className = "word-empty-state";
    const title = document.createElement("strong");
    const noFavorites = state.view === "favorites" && !state.favoriteIds.size;
    title.textContent = translate(noFavorites ? "empty_favorites" : "empty_title");
    const hint = document.createElement("p");
    hint.textContent = translate(noFavorites ? "empty_favorites_hint" : "empty_hint");
    emptyState.append(title, hint);
    elements.wordGrid.replaceChildren(emptyState);
    return;
  }
  const items = words.map(wordCard);
  const current = [...elements.wordGrid.children];
  if (current.length !== items.length || items.some((item, index) => item !== current[index])) {
    elements.wordGrid.replaceChildren(...items);
  }
}

function renderDetails() {
  const selected = getSelectedWord();
  if (!selected) return;
  elements.detailsTitle.textContent = `${selected.article} ${selected.word}`;
  elements.detailsTranslation.textContent = `${translate("meaning")}: ${meaning(selected)}`;
  elements.detailsTranslation.lang = language();
  elements.knownButton.setAttribute("aria-pressed", String(state.knownIds.has(selected.id)));
  elements.favoriteButton.setAttribute("aria-pressed", String(state.favoriteIds.has(selected.id)));
}

function showView(view, resetFilters = true) {
  state.view = view;
  elements.catalogPanel.hidden = view === "training";
  elements.trainerPanel.hidden = view !== "training";
  elements.viewButtons.forEach(link => {
    if (link.dataset.view === view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
    link.href = `?${new URLSearchParams({ lang: language(), view: link.dataset.view })}`;
  });
  document.querySelector('#vocabSearch [name="view"]').value = view;
  elements.catalogTitle.dataset.i18n = view === "favorites" ? "vocab.favorites" : "vocab.words";
  elements.catalogTitle.textContent = translate(view === "favorites" ? "favorites" : "words");
  if (resetFilters) {
    elements.searchInput.value = "";
    elements.articleFilter.value = "all";
  }
  if (view === "training" && !state.quizWord) pickQuizWord();
  renderWords();
}

function renderQuizFeedback() {
  if (!state.answeredCurrentQuestion) return;
  const key = state.lastAnswer === state.quizWord.article ? "correct" : "incorrect";
  const answer = document.createElement("span");
  answer.lang = "de";
  answer.textContent = `${state.quizWord.article} ${state.quizWord.word}`;
  elements.quizFeedback.replaceChildren(`${translate(key)}: `, answer, ".");
}

function pickQuizWord() {
  const pool = WORDS.filter((item) => item.id !== state.quizWord?.id);
  state.quizWord = pool[Math.floor(Math.random() * pool.length)] ?? WORDS[0];
  state.answeredCurrentQuestion = false;
  state.lastAnswer = null;
  elements.nextQuestion.disabled = false;
  elements.quizWord.textContent = state.quizWord.word;
  elements.quizFeedback.textContent = "";
  elements.quizFeedback.classList.remove("is-error");
  elements.quizOptions.forEach((button) => {
    button.disabled = false;
    button.classList.remove("is-correct", "is-wrong");
  });
}

function answerQuiz(answer) {
  if (!state.quizWord || state.answeredCurrentQuestion) {
    return;
  }

  state.answeredCurrentQuestion = true;
  state.lastAnswer = answer;
  state.answeredQuestions += 1;
  const isCorrect = answer === state.quizWord.article;

  if (isCorrect) {
    state.correctAnswers += 1;
    state.knownIds.add(state.quizWord.id);
  } else {
    elements.quizFeedback.classList.add("is-error");
  }
  renderQuizFeedback();

  elements.quizOptions.forEach((button) => {
    const buttonAnswer = button.dataset.answer;
    button.disabled = true;
    button.classList.toggle("is-correct", buttonAnswer === state.quizWord.article);
    button.classList.toggle("is-wrong", buttonAnswer === answer && !isCorrect);
  });

  renderStats();
  renderWords();
  renderDetails();
  saveProgress();
}

function renderAll() {
  renderStats();
  renderWords();
  renderDetails();
}

function updateLocation(method = "replaceState") {
  const url = new URL(location.href);
  for (const [name, value] of Object.entries({
    lang: language(), view: state.view === "words" ? "" : state.view,
    q: elements.searchInput.value.trim(), article: elements.articleFilter.value === "all" ? "" : elements.articleFilter.value,
  })) {
    if (value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
  }
  if (url.href !== location.href) history[method](null, "", url);
}

function restoreLocation() {
  const params = new URLSearchParams(location.search);
  if (params.get("lang") && params.get("lang") !== language()) {
    window.VOCAB_I18N.applyLanguage(params.get("lang"));
  }
  elements.searchInput.value = (params.get("q") || "").slice(0, 200);
  elements.articleFilter.value = ["der", "die", "das"].includes(params.get("article")) ? params.get("article") : "all";
  showView(["training", "favorites"].includes(params.get("view")) ? params.get("view") : "words", false);
}

function filterWords() {
  renderWords();
  updateLocation();
}
elements.searchInput.addEventListener("input", filterWords);
elements.articleFilter.addEventListener("change", filterWords);
document.querySelector("#vocabSearch").addEventListener("submit", event => {
  event.preventDefault();
  filterWords();
});
elements.wordGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-word-id]");
  if (!button || !elements.wordGrid.contains(button)) return;
  state.selectedId = button.dataset.wordId;
  renderWords();
  renderDetails();
  elements.details.showModal();
});
window.addEventListener("popstate", restoreLocation);

elements.knownButton.addEventListener("click", () => {
  const selected = getSelectedWord();
  if (!selected) return;
  if (state.knownIds.has(selected.id)) {
    state.knownIds.delete(selected.id);
  } else {
    state.knownIds.add(selected.id);
  }
  renderAll();
  saveProgress();
});

elements.favoriteButton.addEventListener("click", () => {
  const selected = getSelectedWord();
  if (!selected) return;
  if (state.favoriteIds.has(selected.id)) {
    state.favoriteIds.delete(selected.id);
  } else {
    state.favoriteIds.add(selected.id);
  }
  renderAll();
  saveProgress();
});

elements.quizOptions.forEach((button) => {
  button.addEventListener("click", () => answerQuiz(button.dataset.answer));
});

elements.nextQuestion.addEventListener("click", () => {
  pickQuizWord();
  renderStats();
  elements.quizOptions[0].focus({ preventScroll: true });
});

elements.viewButtons.forEach(link => link.addEventListener("click", event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
  event.preventDefault();
  showView(link.dataset.view);
  updateLocation("pushState");
  link.closest("nav").scrollIntoView({ block: "start", behavior: "instant" });
}));
elements.closeDetails.addEventListener("click", () => elements.details.close());
elements.details.addEventListener("close", () => {
  const card = [...elements.wordGrid.querySelectorAll("[data-word-id]")].find(item => item.dataset.wordId === state.selectedId);
  (card || [...elements.viewButtons].find(button => button.dataset.view === state.view))?.focus({ preventScroll: true });
});

document.addEventListener("app:translations-applied", event => {
  showView(state.view, false);
  renderStats();
  renderDetails();
  renderQuizFeedback();
  if (event.detail.save) updateLocation();
});

restoreLocation();
renderStats();

// Native disclosure navigation works without scripts; enhance dismissal and focus.
const menu = document.querySelector("#vocabMenu");
const menuToggle = menu.querySelector("summary");
function closeMenu(restoreFocus = false) {
  menu.open = false;
  if (restoreFocus) menuToggle.focus({ preventScroll: true });
}
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && menu.open) {
    event.preventDefault();
    closeMenu(true);
  }
});
document.addEventListener("pointerdown", event => {
  if (menu.open && !menu.contains(event.target)) closeMenu(menu.contains(document.activeElement));
});
menu.addEventListener("focusout", event => {
  if (event.relatedTarget && !menu.contains(event.relatedTarget)) closeMenu();
});
menu.querySelector("nav").addEventListener("click", event => {
  if (event.target.closest("a")) closeMenu();
});
const desktopNavigation = matchMedia("(min-width: 64rem)");
desktopNavigation.addEventListener("change", event => {
  const focusWasInHiddenNavigation = event.matches
    ? menu.contains(document.activeElement)
    : document.querySelector(".vocab-desktop-nav").contains(document.activeElement);
  closeMenu();
  if (focusWasInHiddenNavigation) document.querySelector(".vocab-module-brand").focus({ preventScroll: true });
});

})();
