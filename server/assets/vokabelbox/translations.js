/* Vokabelbox — Copyright (c) 2025 Eugen, MIT License. */
(() => {
  "use strict";

  // Module texts extracted from the language platform's existing dictionaries.
  const vocabulary = {
    de: {
      back: "Zur Sprachplattform",
      project_back: "Zur Projektbeschreibung",
      language: "Sprache",
      module: "Lernmodul der Sprachplattform",
      intro: "Lerne deutsche Nomen mit Artikeln. Suche, filtere, markiere schwierige Wörter und prüfe dein Wissen im Artikel-Quiz.",
      words: "Vokabeln",
      known: "gelernt",
      favorites: "Favoriten",
      word_list: "Wortliste",
      search: "Suche",
      search_placeholder: "z. B. Apfel oder Schule",
      article: "Artikel",
      all: "Alle",
      training: "Training",
      quiz: "Artikel-Quiz",
      question: "Welcher Artikel passt?",
      next: "Nächste Frage",
      selection: "Auswahl",
      overview: "Lernübersicht",
      answers: "Antworten",
      storage: "Lernstand und Favoriten werden in diesem Browser gespeichert.",
      session_storage: "Lernstand und Favoriten bleiben für diese Sitzung erhalten. Der Browserspeicher ist nicht verfügbar.",
      matches: "Treffer",
      meaning: "Bedeutung",
      mark_unknown: "Als ungelernt markieren",
      mark_known: "Als gelernt markieren",
      remove_favorite: "Favorit entfernen",
      favorite: "Favorit",
      correct: "Richtig",
      incorrect: "Richtig ist",
    },
    ru: {
      back: "К языковой платформе",
      project_back: "К описанию проекта",
      language: "Язык",
      module: "Учебный модуль языковой платформы",
      intro: "Изучайте немецкие существительные с артиклями. Ищите слова, используйте фильтры, добавляйте сложные слова в избранное и проверяйте знания в тесте.",
      words: "Слова",
      known: "выучено",
      favorites: "Избранное",
      word_list: "Список слов",
      search: "Поиск",
      search_placeholder: "например, Apfel или Schule",
      article: "Артикль",
      all: "Все",
      training: "Тренировка",
      quiz: "Тест на артикли",
      question: "Какой артикль подходит?",
      next: "Следующий вопрос",
      selection: "Выбор",
      overview: "Обзор обучения",
      answers: "Ответы",
      storage: "Прогресс и избранное сохраняются в этом браузере.",
      session_storage: "Прогресс доступен в текущем сеансе. Хранилище браузера недоступно.",
      matches: "результатов",
      meaning: "Значение",
      mark_unknown: "Отметить как невыученное",
      mark_known: "Отметить как выученное",
      remove_favorite: "Удалить из избранного",
      favorite: "В избранное",
      correct: "Правильно",
      incorrect: "Правильный ответ",
    },
    uk: {
      back: "До мовної платформи",
      project_back: "До опису проєкту",
      language: "Мова",
      module: "Навчальний модуль мовної платформи",
      intro: "Вивчайте німецькі іменники з артиклями. Шукайте слова, використовуйте фільтри, додавайте складні слова до обраного та перевіряйте знання в тесті.",
      words: "Слова",
      known: "вивчено",
      favorites: "Обране",
      word_list: "Список слів",
      search: "Пошук",
      search_placeholder: "наприклад, Apfel або Schule",
      article: "Артикль",
      all: "Усі",
      training: "Тренування",
      quiz: "Тест на артиклі",
      question: "Який артикль підходить?",
      next: "Наступне запитання",
      selection: "Вибір",
      overview: "Огляд навчання",
      answers: "Відповіді",
      storage: "Прогрес та обране зберігаються в цьому браузері.",
      session_storage: "Прогрес доступний у поточному сеансі. Сховище браузера недоступне.",
      matches: "результатів",
      meaning: "Значення",
      mark_unknown: "Позначити як невивчене",
      mark_known: "Позначити як вивчене",
      remove_favorite: "Видалити з обраного",
      favorite: "До обраного",
      correct: "Правильно",
      incorrect: "Правильна відповідь",
    },
  };

  if (typeof module !== "undefined" && module.exports) module.exports = vocabulary;
  if (typeof window === "undefined") return;

  window.TRANSLATIONS ??= {};
  for (const [language, vocab] of Object.entries(vocabulary)) {
    window.TRANSLATIONS[language] = {
      ...window.TRANSLATIONS[language],
      vocab: { ...vocab, ...window.TRANSLATIONS[language]?.vocab },
    };
  }

  const languageKey = "beirit:vokabelbox:language";
  const supportedLanguage = value => {
    const language = String(value || "").toLowerCase().split("-")[0];
    return Object.hasOwn(vocabulary, language) ? language : null;
  };
  const translatedText = (language, key) => {
    if (!key?.startsWith("vocab.")) return null;
    const name = key.slice("vocab.".length);
    return window.TRANSLATIONS[language]?.vocab?.[name] ?? vocabulary.de[name] ?? null;
  };

  function applyLanguage(language, save = false) {
    const nextLanguage = supportedLanguage(language);
    if (!nextLanguage) return;
    document.documentElement.lang = nextLanguage;
    if (save) {
      try { localStorage.setItem(languageKey, nextLanguage); } catch { /* Optional preference. */ }
    }
    for (const [attribute, target] of [
      ["data-i18n", null],
      ["data-i18n-aria-label", "aria-label"],
      ["data-i18n-placeholder", "placeholder"],
    ]) {
      document.querySelectorAll(`[${attribute}]`).forEach(element => {
        const text = translatedText(nextLanguage, element.getAttribute(attribute));
        if (text === null) return;
        if (target) element.setAttribute(target, text);
        else element.textContent = text;
      });
    }
    document.querySelectorAll("[data-vocab-language]").forEach(control => {
      if (control.tagName === "SELECT") control.value = nextLanguage;
      else control.setAttribute("aria-pressed", String(control.dataset.vocabLanguage === nextLanguage));
    });
    document.dispatchEvent(new CustomEvent("app:translations-applied", { detail: { lang: nextLanguage } }));
  }

  document.querySelectorAll("[data-vocab-language]").forEach(control => {
    const eventName = control.tagName === "SELECT" ? "change" : "click";
    control.addEventListener(eventName, () => {
      applyLanguage(control.tagName === "SELECT" ? control.value : control.dataset.vocabLanguage, true);
    });
  });

  let initialLanguage = supportedLanguage(document.documentElement.lang) || "de";
  try { initialLanguage = supportedLanguage(localStorage.getItem(languageKey)) || initialLanguage; } catch { /* Browser storage may be blocked. */ }
  applyLanguage(initialLanguage);
})();
