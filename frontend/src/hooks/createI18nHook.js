import React from "react";

export function createI18nHook(i18n) {
  return function useI18n() {
    const { createTranslator, detectInitialLanguage, ensureLanguage, isLanguageLoaded } = i18n;
    const [language] = React.useState(detectInitialLanguage);
    const [translationVersion, setTranslationVersion] = React.useState(0);
    const [loaded, setLoaded] = React.useState(() => isLanguageLoaded(language));

    React.useEffect(() => {
      if (isLanguageLoaded(language)) return undefined;
      let active = true;
      let pending = false;
      let retryTimer;
      let failures = 0;
      const load = () => {
        if (!active || pending || isLanguageLoaded(language)) return;
        pending = true;
        ensureLanguage(language).then(() => {
          if (!active) return;
          setLoaded(true);
          setTranslationVersion((version) => version + 1);
        }).catch(() => {
          // Keep German content usable and retry a transient download failure.
          // Further attempts follow connectivity/focus changes instead of looping.
          if (active && failures++ === 0) retryTimer = setTimeout(load, 1000);
        }).finally(() => { pending = false; });
      };
      const onVisibility = () => { if (document.visibilityState === "visible") load(); };
      load();
      window.addEventListener("online", load);
      window.addEventListener("focus", load);
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        active = false;
        clearTimeout(retryTimer);
        window.removeEventListener("online", load);
        window.removeEventListener("focus", load);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }, [language]);

    const t = React.useMemo(() => createTranslator(language), [language, translationVersion]);

    React.useEffect(() => {
      document.documentElement.lang = loaded ? language : "de";
    }, [language, loaded]);

    return { language, t };
  };
}
