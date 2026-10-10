// Shared classification for client rendering and the server presentation catalog.
export const featureIconRules = [
  { patterns: [/react/, /vite/], icon: "ReactBrandIcon" },
  { patterns: [/django/], icon: "DjangoBrandIcon" },
  { patterns: [/^python$/, /python/], icon: "PythonBrandIcon" },
  { patterns: [/^css$/, /css/], icon: "Hash" },
  { patterns: [/^javascript$/, /\bjs\b/, /javascript/], icon: "Braces" },
  { patterns: [/^html$/, /html/], icon: "Code2" },
  { patterns: [/sicher|login|konto|geschützt|auth|csrf|privat|безопас|аккаунт|логин|захищ/], icon: "ShieldCheck" },
  { patterns: [/postgres|daten|data|model|database|profilmodel|suchprofil|sammlung|scoring|matching|katalog|quellen|angebote|скоринг|каталог|данн/], icon: "Database" },
  { patterns: [/code|logik|funktion|backend|frontend|api|rest|widget|script|ui-|interface|интерфейс|код|логик|функц|backend|frontend/], icon: "Code2" },
  { patterns: [/mobil|responsive|gerät|darstellung|design|abstand|layout|template|vorlage|ansicht|vorschau|preview|bild|bilder|визуал|мобиль|адаптац|адаптив|изображ|дизайн|шаблон|перегляд/], icon: "MonitorSmartphone" },
  { patterns: [/formular|anfrage|kontakt|bewerbung|chat|form|eingabe|validier|validat|feedback|заяв|форм|контакт|чат|ввод|введен|валідац|валид/], icon: "MessageSquare" },
  { patterns: [/text|übersetz|de\/ru|deutsch|russisch|sprache|hinweis|термин|текст|немец|русск|подсказ/], icon: "Languages" },
  { patterns: [/fehler|bug|ladeproblem|prüfung|sichtung|analyse|problem|ошиб|провер|анализ|загруз/], icon: "Bug" },
  { patterns: [/seite|startseite|unterseite|bereich|veröffentlichung|route|webseite|page|страниц|публикац|раздел/], icon: "LayoutTemplate" },
  { patterns: [/kalender|termin|ablauf|workflow|prozess|verwaltung|организац|процесс|управлен/], icon: "Workflow" },
  { patterns: [/schnell|ladezeit|performance|cache|static|статич|быстр/], icon: "Cpu" },
];
export function featureIconName(label) {
  const text = String(label || "").toLowerCase();
  return featureIconRules.find(rule => rule.patterns.some(pattern => pattern.test(text)))?.icon || "Star";
}
export const featureIllustrations = {
  Database: "Workflow", Code2: "Workflow", MonitorSmartphone: "LayoutTemplate",
  MessageSquare: "MessageSquare", Languages: "Globe2", Bug: "Bug",
  LayoutTemplate: "LayoutTemplate", Workflow: "Settings", ShieldCheck: "ShieldCheck",
  Cpu: "Cpu", Star: "PencilLine",
};
