/* Vokabelbox — Copyright (c) 2025 Eugen, MIT License. */
(() => {
  "use strict";

  if (typeof module !== "undefined" && module.exports) {
    module.exports = require("./content.json").vocabulary;
    return;
  }
  if (typeof window === "undefined") return;
  const content = document.getElementById("vocab-content");
  if (!content) return;
  const data = JSON.parse(content.textContent);
  window.VOCAB_CONTENT = data;
  const vocabulary = data.vocabulary;

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
    // The server already rendered this language; keep its initial text nodes intact.
    if (!save && document.documentElement.lang === nextLanguage) return;
    document.documentElement.lang = nextLanguage;
    if (save) {
      try { localStorage.setItem(languageKey, nextLanguage); } catch { /* Optional preference. */ }
      document.cookie = `vokabelbox_language=${nextLanguage}; Path=/vokabelbox/; Max-Age=31536000; SameSite=Lax`;
    }
    for (const [attribute, target] of [
      ["data-i18n", null],
      ["data-i18n-aria-label", "aria-label"],
      ["data-i18n-placeholder", "placeholder"],
    ]) {
      document.querySelectorAll(`[${attribute}]`).forEach(element => {
        const text = translatedText(nextLanguage, element.getAttribute(attribute));
        if (text === null) return;
        if (target) {
          if (element.getAttribute(target) !== text) element.setAttribute(target, text);
        } else if (element.textContent !== text) element.textContent = text;
      });
    }
    document.querySelectorAll("[data-vocab-language]").forEach(control => {
      if (control.tagName === "SELECT") control.value = nextLanguage;
      else control.setAttribute("aria-pressed", String(control.dataset.vocabLanguage === nextLanguage));
    });
    const copy = vocabulary[nextLanguage];
    document.title = copy.title;
    const canonical = new URL(document.querySelector('link[rel="canonical"]').href);
    canonical.search = new URLSearchParams({ lang: nextLanguage });
    document.querySelector('link[rel="canonical"]').href = canonical.href;
    for (const [selector, value] of [
      ['meta[name="description"]', copy.description],
      ['meta[property="og:title"]', copy.title],
      ['meta[property="og:description"]', copy.description],
      ['meta[property="og:url"]', canonical.href],
      ['meta[property="og:locale"]', { de: "de_DE", ru: "ru_RU", uk: "uk_UA" }[nextLanguage]],
      ['meta[name="twitter:title"]', copy.title],
      ['meta[name="twitter:description"]', copy.description],
    ]) document.querySelector(selector).content = value;
    const schemaElement = document.getElementById("vocab-schema");
    const schema = JSON.parse(schemaElement.textContent);
    Object.assign(schema, { "@id": `${canonical.href}#app`, url: canonical.href, inLanguage: nextLanguage, description: copy.description });
    schemaElement.textContent = JSON.stringify(schema);
    document.querySelector('#vocabSearch [name="lang"]').value = nextLanguage;
    document.querySelectorAll("[data-vocab-home]").forEach(link => {
      link.href = `?${new URLSearchParams({ lang: nextLanguage })}`;
    });
    document.dispatchEvent(new CustomEvent("app:translations-applied", { detail: { lang: nextLanguage, save } }));
  }

  document.querySelectorAll("[data-vocab-language]").forEach(control => {
    const eventName = control.tagName === "SELECT" ? "change" : "click";
    control.addEventListener(eventName, () => {
      applyLanguage(control.tagName === "SELECT" ? control.value : control.dataset.vocabLanguage, true);
    });
  });

  const explicitLanguage = supportedLanguage(new URLSearchParams(location.search).get("lang"));
  let initialLanguage = explicitLanguage || supportedLanguage(document.documentElement.lang) || "de";
  if (!explicitLanguage) {
    try { initialLanguage = supportedLanguage(localStorage.getItem(languageKey)) || initialLanguage; } catch { /* Browser storage may be blocked. */ }
  }
  window.VOCAB_I18N = { applyLanguage };
  applyLanguage(initialLanguage);
})();
