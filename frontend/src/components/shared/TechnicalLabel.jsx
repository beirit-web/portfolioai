import React from "react";
import { createPortal } from "react-dom";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const technicalGlossary = {
  de: [
    { pattern: /react.*django|django.*react/i, text: "React gestaltet die sichtbare Oberfläche; Django übernimmt Formulare, Daten und Verwaltung." },
    { pattern: /react/i, text: "Technik für moderne, schnelle und interaktive Webseiten-Oberflächen." },
    { pattern: /django/i, text: "Technik für sichere Formulare, Verwaltungsbereiche, Benutzerkonten und Datenabläufe." },
    { pattern: /responsive|responsiv/i, text: "Die Webseite passt sich automatisch an Smartphone, Tablet und PC an." },
    { pattern: /frontend/i, text: "Alles, was Besucher auf der Webseite sehen und bedienen." },
    { pattern: /backend/i, text: "Der technische Teil im Hintergrund: Formulare, Daten, Login und Verwaltung." },
    { pattern: /rest api|rest-apis|rest APIs/i, text: "Schnittstelle, damit Frontend und Backend Daten austauschen können." },
    { pattern: /seo/i, text: "Grundlagen, damit Suchmaschinen die Webseite besser verstehen." },
    { pattern: /deployment/i, text: "Die fertige Webseite wird online gestellt und technisch bereitgestellt." },
    { pattern: /dark mode/i, text: "Die Webseite kann auch in einem dunklen Farbschema genutzt werden." },
    { pattern: /admin-system|adminbereich|\badmin\b/i, text: "Geschützter Bereich zur Verwaltung von Inhalten und Daten." },
    { pattern: /fullstack/i, text: "Frontend und Backend werden als zusammengehörige Weblösung umgesetzt." },
    { pattern: /\bui\b|ui-zustände/i, text: "Die sichtbare Bedienoberfläche einer Webseite oder Anwendung." },
    { pattern: /audit/i, text: "Systematische Prüfung der Webseite auf technische und gestalterische Probleme." },
    { pattern: /python/i, text: "Programmiersprache, die häufig für sichere Webanwendungen und Automatisierung genutzt wird." },
    { pattern: /postgresql/i, text: "Datenbank zur zuverlässigen Speicherung strukturierter Inhalte und Benutzerdaten." },
    { pattern: /^html$/i, text: "Grundstruktur einer Webseite, in der Inhalte und Bereiche angeordnet werden." },
    { pattern: /^css$/i, text: "Gestaltung einer Webseite, zum Beispiel Farben, Abstände und Darstellung auf verschiedenen Geräten." },
    { pattern: /javascript/i, text: "Ermöglicht interaktive Funktionen und direkte Reaktionen auf Eingaben der Besucher." },
    { pattern: /typescript/i, text: "Ergänzung für JavaScript, die Programmfehler früher erkennbar macht." },
    { pattern: /tailwind css/i, text: "Werkzeug für ein konsistentes und responsives Webdesign." },
    { pattern: /scss/i, text: "Erweiterte Stylesheets für übersichtliche und wartbare Gestaltung." },
    { pattern: /docker/i, text: "Verpackt eine Anwendung, damit sie zuverlässig bereitgestellt werden kann." },
    { pattern: /^git$/i, text: "Werkzeug zur nachvollziehbaren Verwaltung von Änderungen am Programmcode." },
  ],
  ru: [
    { pattern: /react.*django|django.*react/i, text: "React отвечает за видимый интерфейс, а Django - за формы, данные и управление." },
    { pattern: /react/i, text: "Технология для современных, быстрых и интерактивных интерфейсов сайта." },
    { pattern: /django/i, text: "Технология для безопасных форм, личных кабинетов, учетных записей и работы с данными." },
    { pattern: /responsive|адаптив/i, text: "Сайт автоматически подстраивается под смартфон, планшет и компьютер." },
    { pattern: /frontend|фронтенд/i, text: "Все, что посетители видят на сайте и чем они управляют." },
    { pattern: /backend|бэкенд/i, text: "Техническая часть в фоне: формы, данные, вход и управление." },
    { pattern: /rest api|rest-apis|rest APIs/i, text: "Интерфейс для обмена данными между внешней и внутренней частью сайта." },
    { pattern: /seo/i, text: "Основы, которые помогают поисковым системам лучше понимать сайт." },
    { pattern: /deployment|разв[её]ртывание/i, text: "Готовый сайт публикуется и технически настраивается в интернете." },
    { pattern: /dark mode|т[её]мн/i, text: "Сайт можно использовать в темной цветовой схеме." },
    { pattern: /admin-систем|admin-system|админ|\badmin\b/i, text: "Защищенный раздел для управления содержимым и данными." },
    { pattern: /fullstack/i, text: "Внешняя и внутренняя части создаются как единая веб-система." },
    { pattern: /\bui\b|ui-состояния/i, text: "Видимая часть сайта или приложения, которой управляет пользователь." },
    { pattern: /audit|аудит/i, text: "Системная проверка сайта на технические и визуальные проблемы." },
    { pattern: /python/i, text: "Язык программирования для веб-приложений и автоматизации." },
    { pattern: /postgresql/i, text: "База данных для надежного хранения структурированной информации." },
    { pattern: /^html$/i, text: "Базовая структура сайта, в которой расположены его содержание и разделы." },
    { pattern: /^css$/i, text: "Оформление сайта: цвета, отступы и отображение на разных устройствах." },
    { pattern: /javascript/i, text: "Добавляет интерактивные функции и реакцию сайта на действия посетителей." },
    { pattern: /typescript/i, text: "Дополнение JavaScript, которое помогает раньше находить ошибки." },
    { pattern: /tailwind css/i, text: "Инструмент для последовательного и адаптивного дизайна сайта." },
    { pattern: /scss/i, text: "Расширенные стили для понятного и удобного сопровождения дизайна." },
    { pattern: /docker/i, text: "Упаковывает приложение для надежного запуска и публикации." },
    { pattern: /^git$/i, text: "Инструмент для отслеживания изменений в программном коде." },
  ],
};

function glossaryEntryFor(term, language) {
  const normalizedTerm = String(term || "").trim();
  return (technicalGlossary[language] || technicalGlossary.de)
    .find(({ pattern }) => pattern.test(normalizedTerm));
}

function InfoTooltip({ term, explanation, language = "de" }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef(null);
  const tooltipRef = React.useRef(null);
  const tooltipId = React.useId();
  const hasFinePointer = useMediaQuery("(hover: hover) and (pointer: fine)");

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.min(288, window.innerWidth - viewportPadding * 2);
    const tooltipHeight = tooltipRef.current?.offsetHeight || 96;
    const centeredLeft = rect.left + rect.width / 2 - width / 2;
    const left = Math.max(viewportPadding, Math.min(centeredLeft, window.innerWidth - width - viewportPadding));
    const below = rect.bottom + 8;
    const fitsBelow = below + tooltipHeight <= window.innerHeight - viewportPadding;
    const top = fitsBelow ? below : Math.max(viewportPadding, rect.top - tooltipHeight - 8);
    tooltipRef.current?.style.setProperty("--tooltip-top", `${top}px`);
    tooltipRef.current?.style.setProperty("--tooltip-left", `${left}px`);
    tooltipRef.current?.style.setProperty("--tooltip-width", `${width}px`);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const frame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, updatePosition]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || tooltipRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, updatePosition]);

  const accessibleLabel = language === "ru" ? `Объяснение термина "${term}"` : `Erklärung zu "${term}"`;

  return (
    <span className="info-tooltip">
      <button
        ref={triggerRef}
        type="button"
        className="info-tooltip__trigger"
        aria-label={accessibleLabel}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onPointerEnter={() => { if (hasFinePointer) setIsOpen(true); }}
        onPointerLeave={() => { if (hasFinePointer) setIsOpen(false); }}
        onFocus={() => { if (hasFinePointer) setIsOpen(true); }}
        onBlur={() => { if (hasFinePointer) setIsOpen(false); }}
        onClick={(event) => {
          if (event.detail === 0 || hasFinePointer) setIsOpen(true);
          else setIsOpen((current) => !current);
        }}
      >
        i
      </button>
      {isOpen && typeof document !== "undefined" ? createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className="info-tooltip__popover"
        >
          {explanation}
        </span>,
        document.body,
      ) : null}
    </span>
  );
}

export function TechnicalLabel({ children, language = "de" }) {
  const entry = glossaryEntryFor(children, language);
  if (!entry) return children;
  return (
    <>
      {children}
      <InfoTooltip term={children} explanation={entry.text} language={language} />
    </>
  );
}
