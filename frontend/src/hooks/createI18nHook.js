import React from "react";

export function createI18nHook(i18n) {
  return function useI18n() {
    const { createTranslator, detectInitialLanguage, ensureLanguage, isLanguageLoaded } = i18n;
    const [language] = React.useState(detectInitialLanguage);
    const [translationVersion, setTranslationVersion] = React.useState(0);

    React.useEffect(() => {
      if (isLanguageLoaded(language)) return undefined;
      let active = true;
      ensureLanguage(language).then(() => {
        if (active) setTranslationVersion((version) => version + 1);
      });
      return () => {
        active = false;
      };
    }, [language]);

    const t = React.useMemo(() => createTranslator(language), [language, translationVersion]);

    React.useEffect(() => {
      document.documentElement.lang = language;
    }, [language]);

    return { language, t };
  };
}
