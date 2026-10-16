import { availableLocales, languageNames, type Locale } from "../i18n";

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
  const currentLanguage = languageNames[locale];
  const selectableLocales = availableLocales.filter((item) => item !== locale);

  return (
    <details
      className={`language-switcher ${compact ? "language-switcher-compact" : ""}`}
    >
      <summary aria-label={`Sprache wechseln. Aktuell: ${currentLanguage}`} title={currentLanguage}>
        <span
          aria-hidden="true"
          className={`language-switcher__flag ${languageFlagClasses[locale]}`}
        />
      </summary>
      <div className="language-switcher__options" role="group" aria-label="Sprache wechseln">
        {selectableLocales.map((item) => (
          <button
            aria-label={languageNames[item]}
            key={item}
            onClick={(event) => {
              onLocaleChange(item);
              event.currentTarget.closest("details")?.removeAttribute("open");
            }}
            title={languageNames[item]}
            type="button"
          >
            <span
              aria-hidden="true"
              className={`language-switcher__flag ${languageFlagClasses[item]}`}
            />
          </button>
        ))}
      </div>
    </details>
  );
}
