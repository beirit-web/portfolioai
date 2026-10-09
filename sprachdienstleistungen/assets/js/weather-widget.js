(() => {
  const WEATHER_CODE_MAP = {
    0: { icon: "☀️", labels: { de: "klar", ru: "ясно" } },
    1: { icon: "🌤️", labels: { de: "haupts. klar", ru: "в основном ясно" } },
    2: { icon: "⛅", labels: { de: "wolkig", ru: "переменная облачность" } },
    3: { icon: "☁️", labels: { de: "bewölkt", ru: "облачно" } },
    45: { icon: "🌫️", labels: { de: "Nebel", ru: "туман" } },
    48: { icon: "🌫️", labels: { de: "Nebel", ru: "туман" } },
    51: { icon: "🌦️", labels: { de: "Niesel", ru: "морось" } },
    53: { icon: "🌦️", labels: { de: "Niesel", ru: "морось" } },
    55: { icon: "🌦️", labels: { de: "Niesel", ru: "морось" } },
    56: { icon: "🌧️", labels: { de: "gefrier. Niesel", ru: "ледяная морось" } },
    57: { icon: "🌧️", labels: { de: "gefrier. Niesel", ru: "ледяная морось" } },
    61: { icon: "🌧️", labels: { de: "Regen", ru: "дождь" } },
    63: { icon: "🌧️", labels: { de: "Regen", ru: "дождь" } },
    65: { icon: "🌧️", labels: { de: "starker Regen", ru: "сильный дождь" } },
    66: { icon: "🌧️", labels: { de: "gefrier. Regen", ru: "ледяной дождь" } },
    67: { icon: "🌧️", labels: { de: "gefrier. Regen", ru: "ледяной дождь" } },
    71: { icon: "❄️", labels: { de: "Schnee", ru: "снег" } },
    73: { icon: "❄️", labels: { de: "Schnee", ru: "снег" } },
    75: { icon: "❄️", labels: { de: "starker Schnee", ru: "сильный снег" } },
    77: { icon: "🌨️", labels: { de: "Schneekörner", ru: "снежная крупа" } },
    80: { icon: "🌦️", labels: { de: "Schauer", ru: "ливень" } },
    81: { icon: "🌦️", labels: { de: "Schauer", ru: "ливень" } },
    82: { icon: "🌧️", labels: { de: "starker Schauer", ru: "сильный ливень" } },
    85: { icon: "🌨️", labels: { de: "Schneeschauer", ru: "снегопад" } },
    86: { icon: "🌨️", labels: { de: "Schneeschauer", ru: "сильный снегопад" } },
    95: { icon: "⛈️", labels: { de: "Gewitter", ru: "гроза" } },
    96: { icon: "⛈️", labels: { de: "Gewitter", ru: "гроза" } },
    99: { icon: "⛈️", labels: { de: "Gewitter", ru: "гроза" } },
    default: { icon: "⛅", labels: { de: "unbekannt", ru: "неизвестно" } },
  };

  const DEFAULT_TEXTS = {
    de: {
      loading: "Lädt...",
      load: "Wetter laden",
      refresh: "Wetter aktualisieren",
      search_label: "Ort suchen",
      search_placeholder: "Ort suchen (z. B. Helmstedt)",
      default_not_loaded: "Wetter noch nicht geladen",
      status_idle: "Ort eingeben und Wetter laden.",
      status_searching: "Ort wird gesucht...",
      status_loading: "Wetter wird geladen...",
      status_updated_live: "Aktualisiert",
      status_updated_cache: "Cache",
      status_no_result: "Kein Ort gefunden.",
      status_offline: "Keine Internetverbindung.",
      status_error: "Wetter konnte nicht geladen werden.",
      card_wind: "Wind",
      card_humidity: "Luftfeuchte",
      card_uv: "UV-Index",
      card_precip: "Regenrisiko",
      hourly_title: "Nächste 24 Stunden",
      today: "Heute",
      max_short: "Max",
      min_short: "Min",
      rain_suffix: "Regen",
      precip_short: "Regen",
      record_high: "Bisher am wärmsten",
      record_low: "Bisher am kältesten",
      summary_title: "Heute relevant",
      summary_default: "Heute keine auffälligen Wetterwerte.",
      summary_dry_until: "Voraussichtlich trocken bis",
      summary_rain_now: "Regen aktuell möglich",
      summary_rain_later: "Regen später wahrscheinlich",
      summary_wind: "Wind auffällig",
      summary_uv: "UV hoch",
      summary_cold: "Jacke sinnvoll",
      summary_hot: "Hitze einplanen",
      rain_window_title: "Regen-Zeitfenster",
      rain_window_dry: "In den nächsten 24 Stunden kaum Regen.",
      rain_window_peak: "Höchstes Risiko",
      sun_times_title: "Sonnenzeiten",
      sunrise: "Aufgang",
      sunset: "Untergang",
      daylight_hours: "Sonne",
      darkness_hours: "Dunkelheit",
      hours_short: "Std.",
      wind_calm: "ruhig",
      wind_breezy: "böig",
      wind_stormy: "stürmisch",
      humidity_dry: "trocken",
      humidity_ok: "angenehm",
      humidity_humid: "feucht",
      uv_low: "niedrig",
      uv_medium: "mittel",
      uv_high: "hoch",
      uv_unknown: "k.A.",
      precip_likely: "Regen wahrscheinlich",
      precip_low: "gering",
      weather_unknown: "unbekannt",
      saved_searches_empty: "Noch keine Wetter-Suche gespeichert.",
      saved_searches_status_saved: "Suche gespeichert.",
      saved_searches_status_deleted: "Suche gelöscht.",
      saved_searches_status_error: "Gespeicherte Suchen konnten nicht aktualisiert werden.",
      saved_searches_delete: "Suche löschen",
    },
    ru: {
      loading: "Загрузка...",
      load: "Загрузить погоду",
      refresh: "Обновить погоду",
      search_label: "Введите город",
      search_placeholder: "Введите город, например Helmstedt",
      default_not_loaded: "Погода еще не загружена",
      status_idle: "Введите место и загрузите погоду.",
      status_searching: "Ищем место...",
      status_loading: "Загружаем погоду...",
      status_updated_live: "Обновлено",
      status_updated_cache: "Кэш",
      status_no_result: "Место не найдено.",
      status_offline: "Нет подключения к интернету.",
      status_error: "Не удалось загрузить погоду.",
      card_wind: "Ветер",
      card_humidity: "Влажность",
      card_uv: "УФ-индекс",
      card_precip: "Риск дождя",
      hourly_title: "Ближайшие 24 часа",
      today: "Сегодня",
      max_short: "Макс",
      min_short: "Мин",
      rain_suffix: "дождь",
      precip_short: "Дождь",
      record_high: "Самая высокая пока",
      record_low: "Самая низкая пока",
      summary_title: "Важно сегодня",
      summary_default: "Сегодня без заметных погодных рисков.",
      summary_dry_until: "Скорее всего сухо до",
      summary_rain_now: "Дождь сейчас возможен",
      summary_rain_later: "Дождь позже вероятен",
      summary_wind: "Заметный ветер",
      summary_uv: "Высокий УФ",
      summary_cold: "Лучше взять куртку",
      summary_hot: "Жара возможна",
      rain_window_title: "Период дождя",
      rain_window_dry: "В ближайшие 24 часа дождь маловероятен.",
      rain_window_peak: "Самый высокий риск",
      sun_times_title: "Солнце",
      sunrise: "Восход",
      sunset: "Закат",
      daylight_hours: "Свет",
      darkness_hours: "Темнота",
      hours_short: "ч",
      wind_calm: "спокойно",
      wind_breezy: "порывисто",
      wind_stormy: "штормовой",
      humidity_dry: "сухо",
      humidity_ok: "комфортно",
      humidity_humid: "влажно",
      uv_low: "низкий",
      uv_medium: "средний",
      uv_high: "высокий",
      uv_unknown: "н/д",
      precip_likely: "Дождь вероятен",
      precip_low: "низкий риск",
      weather_unknown: "неизвестно",
      saved_searches_empty: "Сохраненных поисков погоды пока нет.",
      saved_searches_status_saved: "Поиск сохранен.",
      saved_searches_status_deleted: "Поиск удален.",
      saved_searches_status_error: "Не удалось обновить сохраненные поиски.",
      saved_searches_delete: "Удалить поиск",
    },
  };

  const DEFAULT_CITY = "Helmstedt";
  const LAST_QUERY_KEY = "weather_last_query_v1";
  const LAST_CITY_KEY = "weather_last_city";
  const RECENT_SEARCHES_KEY = "weather_recent_searches_v1";
  const CACHE_KEY = "weather_cache_v2";
  const CACHE_TTL = 10 * 60 * 1000;
  const MAX_CACHE_ENTRIES = 8;
  const MAX_RECENT_SEARCHES = 5;

  const getCsrfToken = () => {
    const match = document.cookie.match(/(?:^|;)\s*csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  };

  const REQUIRED_ELEMENT_KEYS = [
    "wrap",
    "searchForm",
    "cityInput",
    "detailsPanel",
    "cityNameEl",
    "timeTextEl",
    "tempNowEl",
    "miniNowEl",
    "rainNowEl",
    "windValueEl",
    "windHintEl",
    "humValueEl",
    "humHintEl",
    "uvValueEl",
    "uvHintEl",
    "precipValueEl",
    "precipHintEl",
    "forecastEl",
    "hourlyBox",
    "hourlyStrip",
    "weatherRecordStrip",
    "recordHighLabelEl",
    "recordHighValueEl",
    "recordLowLabelEl",
    "recordLowValueEl",
  ];

  const hasRequiredElements = (elements) =>
    REQUIRED_ELEMENT_KEYS.every((key) => Boolean(elements[key]));

  const getWeatherWidgetElements = (widget) => ({
    wrap: widget?.querySelector(".wrap"),
    searchForm: widget?.querySelector(".search"),
    cityInput: widget?.querySelector("#cityInput"),
    statusMsg: widget?.querySelector("#statusMsg"),
    loadBtn: widget?.querySelector("#loadBtn"),
    detailsPanel: widget?.querySelector("#weatherDetails"),
    cityNameEl: widget?.querySelector("#cityName"),
    timeTextEl: widget?.querySelector("#timeText"),
    tempNowEl: widget?.querySelector("#tempNow"),
    miniNowEl: widget?.querySelector("#miniNow"),
    rainNowEl: widget?.querySelector("#rainNow"),
    windLabelEl: widget?.querySelector("#windLabel"),
    humidityLabelEl: widget?.querySelector("#humidityLabel"),
    uvLabelEl: widget?.querySelector("#uvLabel"),
    precipLabelEl: widget?.querySelector("#precipLabel"),
    windValueEl: widget?.querySelector("#windValue"),
    windHintEl: widget?.querySelector("#windHint"),
    humValueEl: widget?.querySelector("#humValue"),
    humHintEl: widget?.querySelector("#humHint"),
    uvValueEl: widget?.querySelector("#uvValue"),
    uvHintEl: widget?.querySelector("#uvHint"),
    precipValueEl: widget?.querySelector("#precipValue"),
    precipHintEl: widget?.querySelector("#precipHint"),
    forecastEl: widget?.querySelector("#forecast"),
    forecastListEl: widget?.querySelector("#forecastList"),
    hourlyBox: widget?.querySelector("#hourlyBox"),
    hourlyTitleEl: widget?.querySelector("#hourlyTitle"),
    hourlyStrip: widget?.querySelector("#hourlyStrip"),
    weatherRecordStrip: widget?.querySelector("#weatherRecordStrip"),
    recordHighLabelEl: widget?.querySelector("#recordHighLabel"),
    recordHighValueEl: widget?.querySelector("#recordHighValue"),
    recordLowLabelEl: widget?.querySelector("#recordLowLabel"),
    recordLowValueEl: widget?.querySelector("#recordLowValue"),
    weatherInsightsEl: widget?.querySelector("#weatherInsights"),
    weatherSummaryLabelEl: widget?.querySelector("#weatherSummaryLabel"),
    weatherSummaryTextEl: widget?.querySelector("#weatherSummaryText"),
    rainWindowLabelEl: widget?.querySelector("#rainWindowLabel"),
    rainWindowValueEl: widget?.querySelector("#rainWindowValue"),
    rainWindowHintEl: widget?.querySelector("#rainWindowHint"),
    sunTimesLabelEl: widget?.querySelector("#sunTimesLabel"),
    sunTimesValueEl: widget?.querySelector("#sunTimesValue"),
    sunTimesHintEl: widget?.querySelector("#sunTimesHint"),
    quickPickButtons: Array.from(
      widget?.querySelectorAll(".weather-quick-pick") || [],
    ),
    quickPicksEl: widget?.querySelector(".weather-page-quickpicks"),
    savedSearchesEl: widget?.dataset.savedSearchesTarget
      ? document.getElementById(widget.dataset.savedSearchesTarget)
      : null,
    savedSearchesEmptyEl: widget?.dataset.savedSearchesEmptyTarget
      ? document.getElementById(widget.dataset.savedSearchesEmptyTarget)
      : null,
    savedSearchesStatusEl: widget?.dataset.savedSearchesStatusTarget
      ? document.getElementById(widget.dataset.savedSearchesStatusTarget)
      : null,
  });

  const initWeatherWidget = (widget) => {
    if (!widget || widget.dataset.weatherWidgetInitialized === "true") {
      return;
    }
    widget.dataset.weatherWidgetInitialized = "true";

    const elements = getWeatherWidgetElements(widget);
    if (!hasRequiredElements(elements)) {
      return;
    }

    const {
      wrap,
      searchForm,
      cityInput,
      statusMsg,
      loadBtn,
      detailsPanel,
      cityNameEl,
      timeTextEl,
      tempNowEl,
      miniNowEl,
      rainNowEl,
      windLabelEl,
      humidityLabelEl,
      uvLabelEl,
      precipLabelEl,
      windValueEl,
      windHintEl,
      humValueEl,
      humHintEl,
      uvValueEl,
      uvHintEl,
      precipValueEl,
      precipHintEl,
      forecastEl,
      forecastListEl,
      hourlyBox,
      hourlyTitleEl,
      hourlyStrip,
      weatherRecordStrip,
      recordHighLabelEl,
      recordHighValueEl,
      recordLowLabelEl,
      recordLowValueEl,
      weatherInsightsEl,
      weatherSummaryLabelEl,
      weatherSummaryTextEl,
      rainWindowLabelEl,
      rainWindowValueEl,
      rainWindowHintEl,
      sunTimesLabelEl,
      sunTimesValueEl,
      sunTimesHintEl,
      quickPicksEl,
      savedSearchesEl,
      savedSearchesEmptyEl,
      savedSearchesStatusEl,
    } = elements;
    let { quickPickButtons } = elements;

    let widgetInitialized = false;
    let loading = false;
    let controller = null;
    let typingTimer = null;
    let forceRefresh = null;
    let lastLoadedQuery = "";
    let latestPayload = null;
    let latestStatus = { type: "idle" };
    let savedSearchItems = [];
    const autoSearchOnInit = widget.dataset.autoSearch === "true";
    const savedSearchesUrl = widget.dataset.savedSearchesUrl || "";

    const readStorage = (key) => {
      try {
        return localStorage.getItem(key);
      } catch (err) {
        return null;
      }
    };

    const writeStorage = (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        /* localStorage can be unavailable */
      }
    };

    const removeStorage = (key) => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        /* ignore */
      }
    };

    const normalizeQuery = (value) =>
      String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

    const readRecentSearches = () => {
      try {
        const parsed = JSON.parse(readStorage(RECENT_SEARCHES_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        return [];
      }
    };

    const uniqueRecentSearches = (items) => {
      const seen = new Set();
      return items
        .filter((item) => item?.query || item?.city)
        .map((item) => ({
          query: String(item.query || item.city || "").trim(),
          city: String(item.city || item.query || "").trim(),
        }))
        .filter((item) => {
          const key = normalizeQuery(item.query || item.city);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    };

    const writeRecentSearches = (items) => {
      writeStorage(
        RECENT_SEARCHES_KEY,
        JSON.stringify(uniqueRecentSearches(items).slice(0, MAX_RECENT_SEARCHES)),
      );
    };

    const addRecentSearch = (query, city) => {
      const label = String(city || query || "").trim();
      const searchQuery = String(query || city || "").trim();
      const normalized = normalizeQuery(searchQuery || label);
      if (!normalized) return;
      const next = [
        { query: searchQuery || label, city: label || searchQuery },
        ...readRecentSearches().filter((item) => normalizeQuery(item.query || item.city) !== normalized),
      ];
      writeRecentSearches(next);
    };

    const renderRecentQuickPicks = () => {
      if (!quickPicksEl) return;
      const items = uniqueRecentSearches(readRecentSearches());
      writeRecentSearches(items);
      quickPicksEl.innerHTML = "";
      items.slice(0, MAX_RECENT_SEARCHES).forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "weather-quick-pick";
        button.dataset.city = item.query || item.city;
        button.textContent = item.city || item.query;
        quickPicksEl.appendChild(button);
      });
      quickPickButtons = Array.from(quickPicksEl.querySelectorAll(".weather-quick-pick"));
      quickPicksEl.classList.toggle("hidden", !quickPickButtons.length);
      syncQuickPickVisibility(cityInput.value);
    };

    const getCurrentLang = () => {
      const hinted = (document.documentElement.lang || window.PREFERRED_LANG || "de")
        .toLowerCase()
        .slice(0, 2);
      return DEFAULT_TEXTS[hinted] ? hinted : "de";
    };

    const getCurrentLocale = () => (getCurrentLang() === "ru" ? "ru-RU" : "de-DE");

    const getWeatherTexts = () => {
      const lang = getCurrentLang();
      const translated = window.TRANSLATIONS?.[lang]?.weather || {};
      return {
        ...DEFAULT_TEXTS.de,
        ...(DEFAULT_TEXTS[lang] || {}),
        ...translated,
      };
    };

    const getWeatherMeta = (code) => {
      const lang = getCurrentLang();
      const texts = getWeatherTexts();
      const entry = WEATHER_CODE_MAP[code] || WEATHER_CODE_MAP.default;
      return {
        icon: entry.icon,
        label: entry.labels[lang] || entry.labels.de || texts.weather_unknown,
      };
    };

    const parseApiLocalDateTime = (iso, utcOffsetSeconds = 0) => {
      if (!iso || typeof iso !== "string") return null;
      const utcBase = Date.parse(`${iso}Z`);
      if (Number.isNaN(utcBase)) return null;
      return new Date(utcBase - utcOffsetSeconds * 1000);
    };

    const formatClock = (date, timeZone) => {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "--:--";
      return new Intl.DateTimeFormat(getCurrentLocale(), {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timeZone || undefined,
      }).format(date);
    };

    const formatDateTime = (date, timeZone) => {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat(getCurrentLocale(), {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timeZone || undefined,
      }).format(date);
    };

    const formatDayName = (isoDate, idx) => {
      const texts = getWeatherTexts();
      if (idx === 0) return texts.today;
      const parsed = new Date(`${isoDate}T12:00:00`);
      if (Number.isNaN(parsed.getTime())) return isoDate;
      return new Intl.DateTimeFormat(getCurrentLocale(), {
        weekday: "short",
      }).format(parsed);
    };

    const formatPercent = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? `${Math.round(numeric)}%` : "--";
    };

    const formatTemperature = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? `${Math.round(numeric)}°` : "--";
    };

    const formatDurationHours = (milliseconds) => {
      const numeric = Number(milliseconds);
      if (!Number.isFinite(numeric) || numeric < 0) return "--";
      const hours = numeric / (60 * 60 * 1000);
      return new Intl.NumberFormat(getCurrentLocale(), {
        maximumFractionDigits: 1,
        minimumFractionDigits: hours < 10 ? 1 : 0,
      }).format(hours);
    };

    const buildPlaceLabel = (place) => {
      const parts = [place?.name, place?.admin1, place?.country]
        .map((part) => String(part || "").trim())
        .filter(Boolean);
      return [...new Set(parts)].join(", ") || DEFAULT_CITY;
    };

    const renderSavedSearches = (items = []) => {
      if (!savedSearchesEl) return;
      savedSearchItems = Array.isArray(items) ? items : [];
      const texts = getWeatherTexts();
      savedSearchesEl.innerHTML = "";
      savedSearchItems.forEach((item) => {
        const row = document.createElement("div");
        row.className = "weather-saved-search";

        const loadButton = document.createElement("button");
        loadButton.type = "button";
        loadButton.className = "weather-saved-search__load";
        loadButton.dataset.city = item.query || item.city || "";
        loadButton.textContent = item.city || item.query || "";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "weather-saved-search__delete";
        deleteButton.dataset.searchId = String(item.id || "");
        deleteButton.setAttribute("aria-label", `${texts.saved_searches_delete}: ${loadButton.textContent}`);
        deleteButton.title = texts.saved_searches_delete;
        deleteButton.textContent = "×";

        row.append(loadButton, deleteButton);
        savedSearchesEl.appendChild(row);
      });

      if (savedSearchesEmptyEl) {
        savedSearchesEmptyEl.textContent = texts.saved_searches_empty;
        savedSearchesEmptyEl.hidden = Boolean(savedSearchItems.length);
      }
    };

    const rememberWeatherSearch = (query, city) => {
      addRecentSearch(query, city);
      renderRecentQuickPicks();
      saveWeatherSearch(query, city);
    };

    const setSavedSearchStatus = (message = "") => {
      if (savedSearchesStatusEl) savedSearchesStatusEl.textContent = message;
    };

    const fetchSavedSearches = async () => {
      if (!savedSearchesUrl || !savedSearchesEl) return;
      try {
        const response = await fetch(savedSearchesUrl, {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Saved searches ${response.status}`);
        const payload = await response.json();
        renderSavedSearches(payload.searches || []);
      } catch (err) {
        console.error(err);
        setSavedSearchStatus(getWeatherTexts().saved_searches_status_error);
      }
    };

    const saveWeatherSearch = async (query, city) => {
      if (!savedSearchesUrl || !savedSearchesEl) return;
      const csrfToken = getCsrfToken();
      if (!csrfToken) return;
      try {
        const response = await fetch(savedSearchesUrl, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({ query, city }),
        });
        if (!response.ok) throw new Error(`Save search ${response.status}`);
        const payload = await response.json();
        renderSavedSearches(payload.searches || []);
        setSavedSearchStatus(getWeatherTexts().saved_searches_status_saved);
      } catch (err) {
        console.error(err);
        setSavedSearchStatus(getWeatherTexts().saved_searches_status_error);
      }
    };

    const deleteSavedSearch = async (searchId) => {
      if (!savedSearchesUrl || !savedSearchesEl || !searchId) return;
      const csrfToken = getCsrfToken();
      if (!csrfToken) return;
      try {
        const deleteUrl = `${savedSearchesUrl.replace(/\/?$/, "/")}${searchId}/delete/`;
        const response = await fetch(deleteUrl, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "X-CSRFToken": csrfToken,
          },
        });
        if (!response.ok) throw new Error(`Delete search ${response.status}`);
        await fetchSavedSearches();
        setSavedSearchStatus(getWeatherTexts().saved_searches_status_deleted);
      } catch (err) {
        console.error(err);
        setSavedSearchStatus(getWeatherTexts().saved_searches_status_error);
      }
    };

    const readCacheStore = () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return { entries: {} };
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !parsed.entries) {
          return { entries: {} };
        }
        return parsed;
      } catch (err) {
        removeStorage(CACHE_KEY);
        return { entries: {} };
      }
    };

    const writeCacheStore = (store) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(store));
      } catch (err) {
        /* ignore cache write errors */
      }
    };

    const readCache = (query) => {
      const normalized = normalizeQuery(query);
      if (!normalized) return null;
      const store = readCacheStore();
      const cached = store.entries?.[normalized];
      if (!cached?.ts || Date.now() - cached.ts > CACHE_TTL) return null;
      return cached;
    };

    const writeCache = (query, payload) => {
      const normalized = normalizeQuery(query);
      if (!normalized) return;
      const store = readCacheStore();
      store.entries = store.entries || {};
      store.entries[normalized] = {
        ...payload,
        query,
      };
      const sortedKeys = Object.entries(store.entries)
        .sort((a, b) => (b[1]?.ts || 0) - (a[1]?.ts || 0))
        .map(([key]) => key);
      sortedKeys.slice(MAX_CACHE_ENTRIES).forEach((key) => {
        delete store.entries[key];
      });
      writeCacheStore(store);
    };

    const getButtonLabels = () => {
      const texts = getWeatherTexts();
      return {
        loading: texts.loading_button || texts.loading,
        load: texts.load_button || texts.load,
        refresh: texts.refresh_button || texts.refresh,
      };
    };

    const syncQuickPickVisibility = (value) => {
      const normalizedValue = normalizeQuery(value);
      let visibleCount = 0;
      quickPickButtons.forEach((button) => {
        const isCurrent = Boolean(
          normalizedValue && normalizeQuery(button.dataset.city) === normalizedValue,
        );
        button.classList.remove("is-active");
        button.hidden = isCurrent;
        if (!isCurrent) visibleCount += 1;
      });
      if (quickPicksEl) {
        quickPicksEl.classList.toggle("hidden", !visibleCount);
      }
    };

    const syncButtonLabels = () => {
      if (!loadBtn) return;
      const labels = getButtonLabels();
      const label = loading ? labels.loading : widgetInitialized ? labels.refresh : labels.load;
      const textTarget = loadBtn.querySelector(".text");
      if (textTarget) {
        textTarget.textContent = label;
      } else {
        loadBtn.textContent = label;
      }
    };

    const setLoading = (state) => {
      loading = state;
      if (loadBtn) {
        loadBtn.disabled = state;
      }
      wrap.setAttribute("aria-busy", state ? "true" : "false");
      syncButtonLabels();
    };

    const setStatusState = (type, payload = {}) => {
      latestStatus = { type, ...payload };
      const texts = getWeatherTexts();
      let message = "";
      if (type === "updated_live") {
        message = `${texts.status_updated_live}: ${formatClock(
          new Date(payload.updatedAt || Date.now()),
          payload.timeZone,
        )}`;
      } else if (type === "updated_cache") {
        message = `${texts.status_updated_cache}: ${formatClock(
          new Date(payload.updatedAt || Date.now()),
          payload.timeZone,
        )}`;
      } else if (type === "searching") {
        message = texts.status_searching;
      } else if (type === "loading") {
        message = texts.status_loading;
      } else if (type === "no_result") {
        message = texts.status_no_result;
      } else if (type === "offline") {
        message = texts.status_offline;
      } else if (type === "error") {
        message = payload.message || texts.status_error;
      } else {
        message = texts.status_idle;
      }
      widget.dataset.status = type;
      if (statusMsg) {
        statusMsg.textContent = message;
      }
    };

    const getHourlySnapshot = (currentTimeIso, hourly, utcOffsetSeconds) => {
      const currentDate = parseApiLocalDateTime(currentTimeIso, utcOffsetSeconds);
      if (!currentDate || !hourly?.time?.length) return {};

      let bestIndex = -1;
      let bestDelta = Infinity;

      hourly.time.forEach((hourIso, idx) => {
        const hourDate = parseApiLocalDateTime(hourIso, utcOffsetSeconds);
        if (!hourDate) return;
        const delta = Math.abs(hourDate.getTime() - currentDate.getTime());
        if (delta < bestDelta) {
          bestDelta = delta;
          bestIndex = idx;
        }
      });

      if (bestIndex < 0) return {};

      return {
        probability: hourly.precipitation_probability?.[bestIndex],
        precipitation: hourly.precipitation?.[bestIndex],
        weatherCode: hourly.weather_code?.[bestIndex],
      };
    };

    const getUpcomingHourlyItems = (payload, limit = 24) => {
      const { current, hourly, timezone, utcOffsetSeconds } = payload;
      if (!hourly?.time?.length) return [];
      const currentDate = parseApiLocalDateTime(current?.time, utcOffsetSeconds);
      const currentTs = currentDate?.getTime() || Date.now();
      const items = [];

      hourly.time.forEach((isoTime, idx) => {
        if (items.length >= limit) return;
        const hourDate = parseApiLocalDateTime(isoTime, utcOffsetSeconds);
        if (!hourDate) return;
        if (hourDate.getTime() < currentTs - 60 * 60 * 1000) return;
        items.push({
          date: hourDate,
          time: formatClock(hourDate, timezone),
          probability: Number(hourly.precipitation_probability?.[idx]),
          precipitation: Number(hourly.precipitation?.[idx]),
          temp: Number(hourly.temperature_2m?.[idx]),
          weatherCode: hourly.weather_code?.[idx],
          wind: Number(hourly.wind_speed_10m?.[idx]),
        });
      });

      return items;
    };

    const getRainWindow = (payload) => {
      const items = getUpcomingHourlyItems(payload, 24);
      const rainyIndex = items.findIndex(
        (item) =>
          Number.isFinite(item.probability) && item.probability >= 45 ||
          Number.isFinite(item.precipitation) && item.precipitation >= 0.2,
      );
      const peak = items.reduce(
        (best, item) => {
          const probability = Number.isFinite(item.probability) ? item.probability : 0;
          return probability > best.probability ? { ...item, probability } : best;
        },
        { probability: -1, time: "" },
      );

      if (rainyIndex < 0) {
        return { hasRain: false, peak };
      }

      let endIndex = rainyIndex;
      for (let idx = rainyIndex + 1; idx < items.length; idx += 1) {
        const item = items[idx];
        const isRainy =
          Number.isFinite(item.probability) && item.probability >= 45 ||
          Number.isFinite(item.precipitation) && item.precipitation >= 0.2;
        if (!isRainy) break;
        endIndex = idx;
      }

      return {
        hasRain: true,
        start: items[rainyIndex],
        end: items[endIndex],
        peak,
      };
    };

    const renderInsights = (payload) => {
      if (
        !weatherInsightsEl ||
        !weatherSummaryTextEl ||
        !rainWindowValueEl ||
        !rainWindowHintEl ||
        !sunTimesValueEl ||
        !sunTimesHintEl
      ) {
        return;
      }

      const texts = getWeatherTexts();
      const { current, daily, timezone, utcOffsetSeconds } = payload;
      const rainWindow = getRainWindow(payload);
      const currentSnapshot = getHourlySnapshot(current?.time, payload.hourly, utcOffsetSeconds);
      const precipChance =
        currentSnapshot.probability ??
        daily?.precipitation_probability_max?.[0] ??
        null;
      const wind = Number(current?.wind_speed_10m);
      const uv = Number(current?.uv_index ?? daily?.uv_index_max?.[0]);
      const apparent = Number(current?.apparent_temperature ?? current?.temperature_2m);
      const summary = [];

      if (Number(precipChance) >= 55) {
        summary.push(texts.summary_rain_now);
      } else if (rainWindow.hasRain) {
        summary.push(`${texts.summary_dry_until} ${rainWindow.start.time}`);
      }
      if (Number.isFinite(wind) && wind >= 28) summary.push(texts.summary_wind);
      if (Number.isFinite(uv) && uv >= 6) summary.push(texts.summary_uv);
      if (Number.isFinite(apparent) && apparent <= 6) summary.push(texts.summary_cold);
      if (Number.isFinite(apparent) && apparent >= 29) summary.push(texts.summary_hot);

      if (weatherSummaryLabelEl) weatherSummaryLabelEl.textContent = texts.summary_title;
      weatherSummaryTextEl.textContent = summary.slice(0, 3).join(" • ") || texts.summary_default;

      if (rainWindowLabelEl) rainWindowLabelEl.textContent = texts.rain_window_title;
      if (rainWindow.hasRain) {
        rainWindowValueEl.textContent =
          rainWindow.start.time === rainWindow.end.time
            ? rainWindow.start.time
            : `${rainWindow.start.time} - ${rainWindow.end.time}`;
      } else {
        rainWindowValueEl.textContent = texts.rain_window_dry;
      }
      rainWindowHintEl.textContent =
        rainWindow.peak?.probability >= 0
          ? `${texts.rain_window_peak}: ${rainWindow.peak.time} (${formatPercent(rainWindow.peak.probability)})`
          : "";

      const sunrise = parseApiLocalDateTime(daily?.sunrise?.[0], utcOffsetSeconds);
      const sunset = parseApiLocalDateTime(daily?.sunset?.[0], utcOffsetSeconds);
      if (sunTimesLabelEl) sunTimesLabelEl.textContent = texts.sun_times_title;
      sunTimesValueEl.textContent =
        `${texts.sunrise}: ${formatClock(sunrise, timezone)} • ` +
        `${texts.sunset}: ${formatClock(sunset, timezone)}`;
      const daylightMs =
        sunrise && sunset && sunset.getTime() > sunrise.getTime()
          ? sunset.getTime() - sunrise.getTime()
          : null;
      sunTimesHintEl.textContent =
        daylightMs !== null
          ? `${texts.daylight_hours}: ${formatDurationHours(daylightMs)} ${texts.hours_short} • ` +
            `${texts.darkness_hours}: ${formatDurationHours(24 * 60 * 60 * 1000 - daylightMs)} ${texts.hours_short}`
          : timezone || "";

      weatherInsightsEl.classList.remove("hidden");
    };

    const renderCurrent = (payload) => {
      const texts = getWeatherTexts();
      const { current, daily, hourly, city, timezone, utcOffsetSeconds } = payload;
      const currentSnapshot = getHourlySnapshot(current?.time, hourly, utcOffsetSeconds);
      const weather = getWeatherMeta(currentSnapshot.weatherCode ?? current?.weather_code);
      const currentDate = parseApiLocalDateTime(current?.time, utcOffsetSeconds);
      const precipChance =
        currentSnapshot.probability ??
        daily?.precipitation_probability_max?.[0] ??
        null;
      const uv = current?.uv_index ?? daily?.uv_index_max?.[0];
      const humidity = Number(current?.relative_humidity_2m);
      const wind = Number(current?.wind_speed_10m);

      cityNameEl.textContent = city;
      timeTextEl.textContent = `${formatDateTime(currentDate, timezone)} • ${weather.label}`;
      tempNowEl.textContent = formatTemperature(current?.temperature_2m);
      miniNowEl.innerHTML =
        `${texts.max_short}: ${formatTemperature(daily?.temperature_2m_max?.[0])} • ` +
        `${texts.min_short}: ${formatTemperature(daily?.temperature_2m_min?.[0])}<br/>` +
        `${texts.precip_short}: ${formatPercent(precipChance)}`;
      rainNowEl.textContent = `${weather.icon} ${formatPercent(precipChance)}`;

      windValueEl.textContent = Number.isFinite(wind) ? `${Math.round(wind)} km/h` : "--";
      windHintEl.textContent =
        wind > 28 ? texts.wind_stormy : wind > 14 ? texts.wind_breezy : texts.wind_calm;

      humValueEl.textContent = Number.isFinite(humidity) ? `${Math.round(humidity)}%` : "--";
      humHintEl.textContent =
        humidity > 70
          ? texts.humidity_humid
          : humidity < 40
            ? texts.humidity_dry
            : texts.humidity_ok;

      uvValueEl.textContent = Number.isFinite(Number(uv)) ? Math.round(Number(uv)) : texts.uv_unknown;
      uvHintEl.textContent =
        Number(uv) >= 6
          ? texts.uv_high
          : Number(uv) >= 3
            ? texts.uv_medium
            : Number.isFinite(Number(uv))
              ? texts.uv_low
              : texts.uv_unknown;

      precipValueEl.textContent = formatPercent(precipChance);
      precipHintEl.textContent =
        Number(precipChance) > 50 ? texts.precip_likely : texts.precip_low;
    };

    const updateTemperatureRecords = (payload) => {
      const texts = getWeatherTexts();
      const todayHigh = Number(payload?.daily?.temperature_2m_max?.[0]);
      const todayLow = Number(payload?.daily?.temperature_2m_min?.[0]);
      const fallbackCurrent = Number(payload?.current?.temperature_2m);
      const displayHigh = Number.isFinite(todayHigh) ? todayHigh : fallbackCurrent;
      const displayLow = Number.isFinite(todayLow) ? todayLow : fallbackCurrent;

      if (!Number.isFinite(displayHigh) || !Number.isFinite(displayLow)) {
        weatherRecordStrip.classList.add("hidden");
        return;
      }

      recordHighLabelEl.textContent = texts.record_high;
      recordLowLabelEl.textContent = texts.record_low;
      recordHighValueEl.textContent = formatTemperature(displayHigh);
      recordLowValueEl.textContent = formatTemperature(displayLow);
      weatherRecordStrip.classList.remove("hidden");
    };

    const renderForecast = (payload) => {
      const { daily } = payload;
      const texts = getWeatherTexts();
      const target = forecastListEl || forecastEl;
      target.innerHTML = "";
      if (!daily?.time?.length) {
        forecastEl.classList.add("hidden");
        return;
      }

      const days = daily.time.slice(0, 5);
      target.innerHTML = days
        .map((isoDate, idx) => {
          const weather = getWeatherMeta(daily.weather_code?.[idx]);
          const deg = `${formatTemperature(daily.temperature_2m_max?.[idx])} / ${formatTemperature(
            daily.temperature_2m_min?.[idx],
          )}`;
          const rain = formatPercent(daily.precipitation_probability_max?.[idx]);
          return `
            <div class="row${idx === 0 ? " is-today" : ""}">
              <div class="day">
                <div class="icon">${weather.icon}</div>
                <div>
                  <div>${formatDayName(isoDate, idx)}</div>
                  <span>${weather.label}</span>
                </div>
              </div>
              <div class="day-metrics">
                <div class="deg">${deg}</div>
                <span>${texts.precip_short}: ${rain}</span>
              </div>
            </div>
          `;
        })
        .join("");
      forecastEl.classList.toggle("hidden", !days.length);
    };

    const renderHourly = (payload) => {
      const texts = getWeatherTexts();
      const { current, hourly, timezone, utcOffsetSeconds } = payload;
      if (!hourly?.time?.length) {
        hourlyBox.classList.add("hidden");
        hourlyStrip.innerHTML = "";
        return;
      }

      const currentDate = parseApiLocalDateTime(current?.time, utcOffsetSeconds);
      const currentTs = currentDate?.getTime() || Date.now();
      const items = [];

      hourly.time.forEach((isoTime, idx) => {
        if (items.length >= 24) return;
        const hourDate = parseApiLocalDateTime(isoTime, utcOffsetSeconds);
        if (!hourDate) return;
        if (hourDate.getTime() < currentTs - 60 * 60 * 1000) return;
        items.push({
          time: formatClock(hourDate, timezone),
          temp: formatTemperature(hourly.temperature_2m?.[idx]),
          prob: formatPercent(hourly.precipitation_probability?.[idx] ?? hourly.precipitation?.[idx]),
          weather: getWeatherMeta(hourly.weather_code?.[idx]),
        });
      });

      if (!items.length) {
        hourlyBox.classList.add("hidden");
        hourlyStrip.innerHTML = "";
        return;
      }

      hourlyStrip.innerHTML = items
        .map(
          (item) => `
            <div class="chip">
              <div class="t">${item.time}</div>
              <div class="i">${item.weather.icon}</div>
              <div class="v">${item.temp}</div>
              <div class="p">${item.prob} ${texts.rain_suffix}</div>
            </div>
          `,
        )
        .join("");
      hourlyBox.classList.remove("hidden");
    };

    const renderPayload = (payload, source, updatedAt) => {
      latestPayload = payload;
      renderCurrent(payload);
      renderInsights(payload);
      updateTemperatureRecords(payload);
      renderForecast(payload);
      renderHourly(payload);
      syncQuickPickVisibility(cityInput.value);
      setStatusState(source === "cache" ? "updated_cache" : "updated_live", {
        updatedAt,
        timeZone: payload.timezone,
      });
    };

    const applyStaticTranslations = () => {
      const texts = getWeatherTexts();
      cityInput.placeholder = texts.search_placeholder;
      cityInput.setAttribute("aria-label", texts.search_label);
      if (windLabelEl) windLabelEl.textContent = texts.card_wind;
      if (humidityLabelEl) humidityLabelEl.textContent = texts.card_humidity;
      if (uvLabelEl) uvLabelEl.textContent = texts.card_uv;
      if (precipLabelEl) precipLabelEl.textContent = texts.card_precip;
      if (hourlyTitleEl) hourlyTitleEl.textContent = texts.hourly_title;
      if (recordHighLabelEl) recordHighLabelEl.textContent = texts.record_high;
      if (recordLowLabelEl) recordLowLabelEl.textContent = texts.record_low;
      if (weatherSummaryLabelEl) weatherSummaryLabelEl.textContent = texts.summary_title;
      if (rainWindowLabelEl) rainWindowLabelEl.textContent = texts.rain_window_title;
      if (sunTimesLabelEl) sunTimesLabelEl.textContent = texts.sun_times_title;
      if (savedSearchesEmptyEl) savedSearchesEmptyEl.textContent = texts.saved_searches_empty;
      if (!latestPayload && timeTextEl) timeTextEl.textContent = texts.default_not_loaded;
      syncButtonLabels();
      renderSavedSearches(savedSearchItems);
      detailsPanel.hidden = false;
      wrap.classList.remove("is-collapsed");
      if (latestPayload) {
        renderPayload(
          latestPayload,
          latestStatus.type === "updated_cache" ? "cache" : "live",
          latestStatus.updatedAt || Date.now(),
        );
      } else {
        setStatusState(latestStatus.type || "idle", latestStatus);
      }
    };

    const markInitialized = () => {
      if (widgetInitialized) return;
      widgetInitialized = true;
      syncButtonLabels();
      forceRefresh = () => triggerSearch(true, true);
    };

    const fetchJson = async (url, signal) => {
      const response = await fetch(url, {
        signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }
      return response.json();
    };

    const loadCity = async (query, force = false, userInitiated = false) => {
      const normalizedQuery = normalizeQuery(query);
      if (!normalizedQuery || normalizedQuery.length < 2) {
        setStatusState("idle");
        return;
      }

      setLoading(true);
      if (controller) controller.abort();
      controller = new AbortController();

      try {
        const cached = !force ? readCache(query) : null;
        if (cached) {
          renderPayload(cached, "cache", cached.ts);
          if (userInitiated) {
            rememberWeatherSearch(query, cached.city);
          }
          lastLoadedQuery = normalizedQuery;
          return;
        }

        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setStatusState("offline");
          return;
        }

        setStatusState("searching");
        const lang = getCurrentLang();
        const geoUrl =
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}` +
          `&count=1&language=${lang}&format=json`;
        const geo = await fetchJson(geoUrl, controller.signal);

        if (!geo?.results?.length) {
          setStatusState("no_result");
          return;
        }

        setStatusState("loading");
        const place = geo.results[0];
        const placeLabel = buildPlaceLabel(place);
        const forecastUrl =
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
          "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index" +
          "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset" +
          "&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m" +
          "&past_hours=0&forecast_days=5&timezone=auto";
        const data = await fetchJson(forecastUrl, controller.signal);

        const payload = {
          city: placeLabel,
          timezone: data.timezone,
          utcOffsetSeconds: data.utc_offset_seconds || 0,
          current: data.current || {},
          daily: data.daily || {},
          hourly: data.hourly || {},
        };

        renderPayload(payload, "live", Date.now());
        writeStorage(LAST_QUERY_KEY, query);
        writeStorage(LAST_CITY_KEY, placeLabel);
        writeCache(query, {
          ...payload,
          ts: Date.now(),
        });
        if (userInitiated) {
          rememberWeatherSearch(query, placeLabel);
        }
        lastLoadedQuery = normalizedQuery;
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error(err);
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setStatusState("offline");
        } else {
          setStatusState("error");
        }
      } finally {
        setLoading(false);
      }
    };

    const triggerSearch = (force = false, userInitiated = false) => {
      const query = cityInput.value.trim().replace(/\s+/g, " ");
      const normalizedQuery = normalizeQuery(query);
      if (!normalizedQuery || normalizedQuery.length < 2) {
        syncQuickPickVisibility("");
        setStatusState("idle");
        return;
      }
      syncQuickPickVisibility(query);
      writeStorage(LAST_QUERY_KEY, query);
      if (!force && normalizedQuery === lastLoadedQuery && !loading) return;
      loadCity(query, force, userInitiated);
    };

    const loadWeatherWidget = (options = {}) => {
      const { autoSearch = false } = options;
      markInitialized();
      if (autoSearch) {
        triggerSearch();
      }
    };

    const hydrateInitialCache = (query) => {
      const cached = readCache(query);
      if (!cached) return false;
      renderPayload(cached, "cache", cached.ts || Date.now());
      lastLoadedQuery = normalizeQuery(query);
      if (cached.city) {
        cityNameEl.textContent = cached.city;
        writeStorage(LAST_CITY_KEY, cached.city);
      }
      return true;
    };

    const initialQuery =
      readStorage(LAST_QUERY_KEY) || readStorage(LAST_CITY_KEY) || DEFAULT_CITY;
    const initialCityLabel = readStorage(LAST_CITY_KEY) || initialQuery;
    cityInput.value = initialQuery;
    cityNameEl.textContent = initialCityLabel;
    if (readRecentSearches().length) {
      renderRecentQuickPicks();
    } else if (quickPicksEl) {
      quickPicksEl.classList.add("hidden");
    }
    detailsPanel.hidden = false;
    wrap.classList.remove("is-collapsed");
    syncButtonLabels();
    applyStaticTranslations();
    if (!hydrateInitialCache(initialQuery)) {
      setStatusState("idle");
    }

    cityInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        triggerSearch(true, true);
        return;
      }
      clearTimeout(typingTimer);
    });

    cityInput.addEventListener("input", () => {
      clearTimeout(typingTimer);
      const query = cityInput.value.trim().replace(/\s+/g, " ");
      if (query) writeStorage(LAST_QUERY_KEY, query);
      syncQuickPickVisibility(query);
      typingTimer = setTimeout(() => {
        if (!widgetInitialized) return;
        triggerSearch(false, true);
      }, 600);
    });

    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      markInitialized();
      triggerSearch(true, true);
    });

    if (loadBtn) {
      loadBtn.addEventListener("click", () => {
        if (!widgetInitialized) {
          markInitialized();
          triggerSearch(true, true);
          return;
        }
        if (forceRefresh) forceRefresh();
      });
    }

    if (quickPicksEl) {
      quickPicksEl.addEventListener("click", (event) => {
        const button = event.target.closest(".weather-quick-pick");
        if (!button) return;
        const city = button.dataset.city?.trim();
        if (!city) return;
        cityInput.value = city;
        writeStorage(LAST_QUERY_KEY, city);
        syncQuickPickVisibility(city);
        markInitialized();
        triggerSearch(true, true);
      });
    }

    if (savedSearchesEl) {
      savedSearchesEl.addEventListener("click", (event) => {
        const deleteButton = event.target.closest(".weather-saved-search__delete");
        if (deleteButton) {
          deleteSavedSearch(deleteButton.dataset.searchId);
          return;
        }

        const loadButton = event.target.closest(".weather-saved-search__load");
        if (!loadButton) return;
        const city = loadButton.dataset.city?.trim();
        if (!city) return;
        cityInput.value = city;
        writeStorage(LAST_QUERY_KEY, city);
        syncQuickPickVisibility(city);
        markInitialized();
        triggerSearch(true, true);
      });
      fetchSavedSearches();
    }

    window.addEventListener("preferred_lang_changed", () => {
      applyStaticTranslations();
    });

    if (autoSearchOnInit || !loadBtn) {
      loadWeatherWidget({ autoSearch: true });
    }
  };

  const initAllWeatherWidgets = () => {
    document.querySelectorAll(".weather-widget").forEach((widget) => {
      initWeatherWidget(widget);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllWeatherWidgets, { once: true });
  } else {
    initAllWeatherWidgets();
  }
})();
