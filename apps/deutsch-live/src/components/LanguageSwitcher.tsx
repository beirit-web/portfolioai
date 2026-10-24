import { availableLocales, languageNames, type Locale } from "../i18n";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";

type LanguageSwitcherProps = {
  compact?: boolean;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
};

const languageFlagClasses: Record<Locale, string> = {
  de: "language-switcher__flag--de",
  ru: "language-switcher__flag--ru"
};

export default function LanguageSwitcher({ compact = false, locale, onLocaleChange }: LanguageSwitcherProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const currentLanguage = languageNames[locale];
  const labels = locale === "ru"
    ? { change: "Изменить язык", current: "Текущий язык" }
    : { change: "Sprache wechseln", current: "Aktuell" };

  useEffect(() => {
    function closeOnOutsidePress(event: PointerEvent) {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) details.open = false;
    }
    document.addEventListener("pointerdown", closeOnOutsidePress, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress, true);
  }, []);

  return (
    <details
      className={`language-switcher ${compact ? "language-switcher-compact" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !event.currentTarget.open) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.open = false;
        summaryRef.current?.focus();
      }}
      ref={detailsRef}
    >
      <summary aria-label={`${labels.change}. ${labels.current}: ${currentLanguage}`} ref={summaryRef} title={currentLanguage}>
        <span
          aria-hidden="true"
          className={`language-switcher__flag ${languageFlagClasses[locale]}`}
        />
        <ChevronDown aria-hidden="true" className="language-switcher__chevron" />
      </summary>
      <div className="language-switcher__options" role="group" aria-label={labels.change}>
        {availableLocales.map((item) => (
          <button
            aria-label={languageNames[item]}
            aria-pressed={item === locale}
            key={item}
            lang={item}
            onClick={(event) => {
              const details = event.currentTarget.closest("details");
              summaryRef.current?.focus();
              details?.removeAttribute("open");
              if (item !== locale) onLocaleChange(item);
            }}
            title={languageNames[item]}
            type="button"
          >
            <span
              aria-hidden="true"
              className={`language-switcher__flag ${languageFlagClasses[item]}`}
            />
            <span>{languageNames[item]}</span>
            {item === locale && <Check aria-hidden="true" className="language-switcher__selected" size={18} />}
          </button>
        ))}
      </div>
    </details>
  );
}
