(() => {
"use strict";
const WORDS = [
  ["der", "Apfel", "apple"],
  ["der", "Bleistift", "pencil"],
  ["der", "Computer", "computer"],
  ["der", "Fußball", "football"],
  ["der", "Hund", "dog"],
  ["der", "Junge", "boy"],
  ["der", "Kopf", "head"],
  ["der", "Rucksack", "backpack"],
  ["der", "Stuhl", "chair"],
  ["der", "Tisch", "table"],
  ["die", "Blume", "flower"],
  ["die", "Flasche", "bottle"],
  ["die", "Hand", "hand"],
  ["die", "Jacke", "jacket"],
  ["die", "Katze", "cat"],
  ["die", "Küche", "kitchen"],
  ["die", "Lehrerin", "teacher"],
  ["die", "Schule", "school"],
  ["die", "Straße", "street"],
  ["die", "Tasche", "bag"],
  ["das", "Auto", "car"],
  ["das", "Bett", "bed"],
  ["das", "Buch", "book"],
  ["das", "Fahrrad", "bicycle"],
  ["das", "Fenster", "window"],
  ["das", "Haus", "house"],
  ["das", "Kind", "child"],
  ["das", "Mädchen", "girl"],
  ["das", "Sofa", "sofa"],
  ["das", "Wasser", "water"],
].map(([article, word, translation], index) => ({
  id: `${article}-${word.toLocaleLowerCase("de-DE")}-${index}`,
  article,
  word,
  translation,
}));

const ARTICLE_COLORS = {
  der: "#15803d",
  die: "#be123c",
  das: "#2563eb",
};

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
};

const storageKey = document.querySelector(".vocab-shell").dataset.storageKey;
const translate = (key) => window.TRANSLATIONS?.[document.documentElement.lang]?.vocab?.[key]
  ?? window.TRANSLATIONS?.de?.vocab?.[key]
  ?? key;

const state = {
  selectedId: WORDS[0].id,
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
    const note = document.querySelector(".vocab-storage-note");
    note.dataset.i18n = "vocab.session_storage";
    note.textContent = translate("session_storage");
  }
}

function getSelectedWord() {
  return WORDS.find((item) => item.id === state.selectedId) ?? WORDS[0];
}

function getFilteredWords() {
  const search = elements.searchInput.value.trim().toLocaleLowerCase("de-DE");
  const article = elements.articleFilter.value;

  return WORDS.filter((item) => {
    const matchesArticle = article === "all" || item.article === article;
    const searchable = `${item.article} ${item.word} ${item.translation}`.toLocaleLowerCase("de-DE");
    return matchesArticle && searchable.includes(search);
  });
}

function renderStats() {
  elements.totalCount.textContent = String(WORDS.length);
  elements.knownCount.textContent = String(state.knownIds.size);
  elements.favoriteCount.textContent = String(state.favoriteIds.size);
  elements.quizScore.textContent = `${state.correctAnswers}/${state.answeredQuestions}`;
}

function renderWords() {
  const words = getFilteredWords().sort((a, b) => a.word.localeCompare(b.word, "de-DE"));
  elements.visibleCount.textContent = `${words.length} ${translate("matches")}`;

  elements.wordGrid.replaceChildren(
    ...words.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "word-card";
      button.style.setProperty("--article-color", ARTICLE_COLORS[item.article]);
      button.classList.toggle("is-selected", item.id === state.selectedId);
      button.setAttribute("aria-pressed", String(item.id === state.selectedId));
      button.classList.toggle("is-known", state.knownIds.has(item.id));
      button.classList.toggle("is-favorite", state.favoriteIds.has(item.id));
      button.addEventListener("click", () => {
        state.selectedId = item.id;
        renderAll();
      });

      const article = document.createElement("span");
      article.className = "article-pill";
      article.textContent = item.article;

      const word = document.createElement("strong");
      word.textContent = item.word;

      const translation = document.createElement("small");
      translation.textContent = item.translation;

      button.append(article, word, translation);
      return button;
    })
  );
}

function renderDetails() {
  const selected = getSelectedWord();
  elements.detailsTitle.textContent = `${selected.article} ${selected.word}`;
  elements.detailsTranslation.textContent = `${translate("meaning")}: ${selected.translation}`;
  elements.knownButton.textContent = state.knownIds.has(selected.id)
    ? translate("mark_unknown")
    : translate("mark_known");
  elements.knownButton.setAttribute("aria-pressed", String(state.knownIds.has(selected.id)));
  elements.favoriteButton.textContent = state.favoriteIds.has(selected.id) ? translate("remove_favorite") : translate("favorite");
  elements.favoriteButton.setAttribute("aria-pressed", String(state.favoriteIds.has(selected.id)));
}

function pickQuizWord() {
  const pool = WORDS.filter((item) => item.id !== state.quizWord?.id);
  state.quizWord = pool[Math.floor(Math.random() * pool.length)] ?? WORDS[0];
  state.answeredCurrentQuestion = false;
  state.lastAnswer = null;
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
    elements.quizFeedback.textContent = `${translate("correct")}: ${state.quizWord.article} ${state.quizWord.word}.`;
  } else {
    elements.quizFeedback.textContent = `${translate("incorrect")}: ${state.quizWord.article} ${state.quizWord.word}.`;
    elements.quizFeedback.classList.add("is-error");
  }

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
  saveProgress();
}

elements.searchInput.addEventListener("input", renderWords);
elements.articleFilter.addEventListener("change", renderWords);

elements.knownButton.addEventListener("click", () => {
  const selected = getSelectedWord();
  if (state.knownIds.has(selected.id)) {
    state.knownIds.delete(selected.id);
  } else {
    state.knownIds.add(selected.id);
  }
  renderAll();
});

elements.favoriteButton.addEventListener("click", () => {
  const selected = getSelectedWord();
  if (state.favoriteIds.has(selected.id)) {
    state.favoriteIds.delete(selected.id);
  } else {
    state.favoriteIds.add(selected.id);
  }
  renderAll();
});

elements.quizOptions.forEach((button) => {
  button.addEventListener("click", () => answerQuiz(button.dataset.answer));
});

elements.nextQuestion.addEventListener("click", () => {
  pickQuizWord();
  renderStats();
});

document.addEventListener("app:translations-applied", () => {
  renderAll();
  if (state.answeredCurrentQuestion) {
    const key = state.lastAnswer === state.quizWord.article ? "correct" : "incorrect";
    elements.quizFeedback.textContent = `${translate(key)}: ${state.quizWord.article} ${state.quizWord.word}.`;
  }
});

pickQuizWord();
renderAll();

})();
