(() => {
  // Provider nulls and blank values represent missing measurements, not zero.
  const optionalNumber = (value) => {
    if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return Number.NaN;
    const number = Number(value);
    return Number.isFinite(number) ? number : Number.NaN;
  };
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
      card_pressure: "Luftdruck",
      hourly_title: "Nächste 24 Stunden",
      today: "Heute",
      max_short: "Max",
      min_short: "Min",
      rain_suffix: "Regen",
      precip_short: "Regen",
      rain_probability: "Regenwahrscheinlichkeit",
      record_high: "Heute maximal",
      record_low: "Heute minimal",
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
      wind_from: "aus",
      pressure_low: "niedrig",
      pressure_normal: "normal",
      pressure_high: "hoch",
      health_title: "Gesundheit & Wetter",
      health_intro: "Orientierung für wetterempfindliche Menschen",
      health_low: "Geringe Belastung",
      health_elevated: "Erhöhte Belastung",
      health_high: "Hohe Belastung",
      health_unavailable: "Keine Daten",
      health_loading: "Wird geladen",
      respiratory_title: "Atemwege & Rauchen",
      respiratory_checking: "Luftqualität und Feinstaub werden geprüft.",
      respiratory_low: "Die Luftqualität ist aktuell günstig. Rauch kann empfindliche Atemwege dennoch zusätzlich reizen.",
      respiratory_elevated: "Empfindliche oder vorgeschädigte Atemwege können stärker reagieren. Anstrengung im Freien reduzieren und Rauch meiden.",
      respiratory_high: "Die Luftqualität kann Atemwege deutlich belasten. Aufenthalt und Anstrengung im Freien möglichst begrenzen.",
      respiratory_unavailable: "Zur Luftqualität liegen aktuell keine Daten vor. Rauch belastet empfindliche Atemwege unabhängig vom Wetter.",
      pollen_title: "Pollen & Asthma",
      pollen_checking: "Aktuelle Pollendaten werden geprüft.",
      pollen_low: "Bei den erfassten Pollenarten ist aktuell keine nennenswerte Konzentration erkennbar.",
      pollen_present: "Pollen sind nachweisbar. Bei Allergie oder allergischem Asthma auf persönliche Symptome achten und den Aufenthalt im Freien anpassen.",
      pollen_unavailable: "Außerhalb der Pollensaison oder für diesen Ort liegen möglicherweise keine Pollendaten vor.",
      pollen_unit: "Körner/m³",
      heart_title: "Herz & Kreislauf",
      heart_checking: "Die thermische Wetterbelastung wird geprüft.",
      feels_like_short: "gefühlt",
      heart_low: "Die gefühlte Temperatur zeigt aktuell keine auffällige thermische Belastung.",
      heart_unavailable: "Zur thermischen Wetterbelastung liegen aktuell keine Daten vor.",
      heart_heat: "Wärme kann Herz und Kreislauf zusätzlich fordern. Belastung reduzieren und die ärztlich empfohlene Trinkmenge beachten.",
      heart_heat_high: "Starke Hitze kann Herz und Kreislauf erheblich belasten. Körperliche Anstrengung und direkte Sonne möglichst meiden.",
      heart_cold: "Kälte kann Gefäße verengen und den Kreislauf stärker beanspruchen. Warm halten und Belastung langsam steigern.",
      heart_cold_high: "Starke Kälte kann das Herz-Kreislauf-System deutlich beanspruchen. Intensive Anstrengung im Freien möglichst vermeiden.",
      health_best_title: "Beste Zeit draußen",
      health_best_loading: "Wird berechnet",
      health_best_checking: "Regen, UV, Temperatur, Luftqualität und Pollen werden verglichen.",
      health_best_hint: "Im Vergleich der nächsten 24 Stunden voraussichtlich am günstigsten.",
      health_best_caution: "Kein deutlich günstiges Fenster gefunden. Persönliche Belastungsgrenzen beachten.",
      health_timeline_title: "Gesundheitsverlauf: 24 Stunden",
      health_timeline_empty: "Für den Verlauf liegen aktuell nicht genügend Daten vor.",
      health_timeline_pollen: "Pollen",
      health_level_low: "gering",
      health_level_elevated: "erhöht",
      health_level_high: "hoch",
      health_disclaimer: "Allgemeine Orientierung, keine medizinische Diagnose. Bei akuter Atemnot oder Brustschmerz: 112.",
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
      card_pressure: "Атмосферное давление",
      hourly_title: "Ближайшие 24 часа",
      today: "Сегодня",
      max_short: "Макс",
      min_short: "Мин",
      rain_suffix: "дождь",
      precip_short: "Дождь",
      rain_probability: "Вероятность дождя",
      record_high: "Максимум сегодня",
      record_low: "Минимум сегодня",
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
      wind_from: "с",
      pressure_low: "низкое",
      pressure_normal: "нормальное",
      pressure_high: "высокое",
      health_title: "Здоровье и погода",
      health_intro: "Ориентир для людей, чувствительных к погоде",
      health_low: "Низкая нагрузка",
      health_elevated: "Повышенная нагрузка",
      health_high: "Высокая нагрузка",
      health_unavailable: "Нет данных",
      health_loading: "Загрузка",
      respiratory_title: "Дыхание и курение",
      respiratory_checking: "Проверяем качество воздуха и мелкодисперсную пыль.",
      respiratory_low: "Качество воздуха сейчас благоприятное. Дым всё равно может дополнительно раздражать чувствительные дыхательные пути.",
      respiratory_elevated: "Чувствительные дыхательные пути могут реагировать сильнее. Снизьте нагрузку на улице и избегайте дыма.",
      respiratory_high: "Качество воздуха может заметно влиять на дыхание. По возможности ограничьте пребывание и нагрузку на улице.",
      respiratory_unavailable: "Данных о качестве воздуха сейчас нет. Дым нагружает чувствительные дыхательные пути независимо от погоды.",
      pollen_title: "Пыльца и астма",
      pollen_checking: "Проверяем актуальные данные о пыльце.",
      pollen_low: "Среди отслеживаемых видов пыльцы заметной концентрации сейчас не видно.",
      pollen_present: "Пыльца присутствует. При аллергии или аллергической астме следите за симптомами и корректируйте пребывание на улице.",
      pollen_unavailable: "Вне сезона пыльцы или для этого места данные могут отсутствовать.",
      pollen_unit: "зёрен/м³",
      heart_title: "Сердце и кровообращение",
      heart_checking: "Проверяем температурную нагрузку.",
      feels_like_short: "ощущается как",
      heart_low: "Ощущаемая температура сейчас не указывает на заметную тепловую нагрузку.",
      heart_unavailable: "Данных о температурной нагрузке сейчас нет.",
      heart_heat: "Жара может дополнительно нагружать сердце и кровообращение. Снизьте нагрузку и соблюдайте назначенный врачом питьевой режим.",
      heart_heat_high: "Сильная жара может значительно нагружать сердце и кровообращение. Избегайте нагрузок и прямого солнца.",
      heart_cold: "Холод может сужать сосуды и усиливать нагрузку на кровообращение. Одевайтесь тепло и увеличивайте нагрузку постепенно.",
      heart_cold_high: "Сильный холод может заметно нагружать сердечно-сосудистую систему. Избегайте интенсивных нагрузок на улице.",
      health_best_title: "Лучшее время на улице",
      health_best_loading: "Рассчитываем",
      health_best_checking: "Сравниваем дождь, УФ, температуру, качество воздуха и пыльцу.",
      health_best_hint: "Предположительно наиболее благоприятное окно в ближайшие 24 часа.",
      health_best_caution: "Явно благоприятного окна не найдено. Учитывайте личные ограничения.",
      health_timeline_title: "Нагрузка на здоровье: 24 часа",
      health_timeline_empty: "Для прогноза сейчас недостаточно данных.",
      health_timeline_pollen: "Пыльца",
      health_level_low: "низкая",
      health_level_elevated: "повышенная",
      health_level_high: "высокая",
      health_disclaimer: "Общая информация, не медицинский диагноз. При одышке или боли в груди звоните 112.",
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
    },
  };

  const DEFAULT_CITY = "Helmstedt";
  const LAST_QUERY_KEY = "weather_last_query_v1";
  const LAST_CITY_KEY = "weather_last_city";
  const RECENT_SEARCHES_KEY = "weather_recent_searches_v1";
  const CACHE_KEY = "weather_cache_v6";
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
    "pressureValueEl",
    "pressureHintEl",
    "respiratoryRiskEl",
    "respiratoryTextEl",
    "pollenRiskEl",
    "pollenTextEl",
    "heartRiskEl",
    "heartTextEl",
    "healthBestValueEl",
    "healthBestHintEl",
    "healthTimelineEl",
    "forecastEl",
    "hourlyBox",
    "hourlyStrip",
  ];

  const hasRequiredElements = (elements) =>
    REQUIRED_ELEMENT_KEYS.every((key) => Boolean(elements[key]));

  const getWeatherWidgetElements = (widget) => ({
    wrap: widget?.querySelector(".weather-widget-grid"),
    searchForm: widget?.querySelector(".weather-search-form"),
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
    pressureLabelEl: widget?.querySelector("#pressureLabel"),
    windValueEl: widget?.querySelector("#windValue"),
    windHintEl: widget?.querySelector("#windHint"),
    humValueEl: widget?.querySelector("#humValue"),
    humHintEl: widget?.querySelector("#humHint"),
    uvValueEl: widget?.querySelector("#uvValue"),
    uvHintEl: widget?.querySelector("#uvHint"),
    precipValueEl: widget?.querySelector("#precipValue"),
    precipHintEl: widget?.querySelector("#precipHint"),
    pressureValueEl: widget?.querySelector("#pressureValue"),
    pressureHintEl: widget?.querySelector("#pressureHint"),
    healthTitleEl: widget?.querySelector("#healthTitle"),
    healthIntroEl: widget?.querySelector("#healthIntro"),
    respiratoryTitleEl: widget?.querySelector("#respiratoryTitle"),
    respiratoryRiskEl: widget?.querySelector("#respiratoryRisk"),
    respiratoryTextEl: widget?.querySelector("#respiratoryText"),
    pollenTitleEl: widget?.querySelector("#pollenTitle"),
    pollenRiskEl: widget?.querySelector("#pollenRisk"),
    pollenTextEl: widget?.querySelector("#pollenText"),
    heartTitleEl: widget?.querySelector("#heartTitle"),
    heartRiskEl: widget?.querySelector("#heartRisk"),
    heartTextEl: widget?.querySelector("#heartText"),
    healthBestTitleEl: widget?.querySelector("#healthBestTitle"),
    healthBestValueEl: widget?.querySelector("#healthBestValue"),
    healthBestHintEl: widget?.querySelector("#healthBestHint"),
    healthTimelineTitleEl: widget?.querySelector("#healthTimelineTitle"),
    healthTimelineEl: widget?.querySelector("#healthTimeline"),
    healthDisclaimerEl: widget?.querySelector("#healthDisclaimer"),
    forecastEl: widget?.querySelector("#forecast"),
    forecastListEl: widget?.querySelector("#forecastList"),
    hourlyBox: widget?.querySelector("#hourlyBox"),
    hourlyTitleEl: widget?.querySelector("#hourlyTitle"),
    hourlyStrip: widget?.querySelector("#hourlyStrip"),
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
      pressureLabelEl,
      windValueEl,
      windHintEl,
      humValueEl,
      humHintEl,
      uvValueEl,
      uvHintEl,
      precipValueEl,
      precipHintEl,
      pressureValueEl,
      pressureHintEl,
      healthTitleEl,
      healthIntroEl,
      respiratoryTitleEl,
      respiratoryRiskEl,
      respiratoryTextEl,
      pollenTitleEl,
      pollenRiskEl,
      pollenTextEl,
      heartTitleEl,
      heartRiskEl,
      heartTextEl,
      healthBestTitleEl,
      healthBestValueEl,
      healthBestHintEl,
      healthTimelineTitleEl,
      healthTimelineEl,
      healthDisclaimerEl,
      forecastEl,
      forecastListEl,
      hourlyBox,
      hourlyTitleEl,
      hourlyStrip,
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
    const autoSearchOnInit = widget.dataset.autoSearch === "true";

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
      const numeric = optionalNumber(value);
      return Number.isFinite(numeric) ? `${Math.round(numeric)}%` : "--";
    };

    const formatTemperature = (value) => {
      const numeric = optionalNumber(value);
      return Number.isFinite(numeric) ? `${Math.round(numeric)}°` : "--";
    };

    const formatWindDirection = (value) => {
      const degrees = optionalNumber(value);
      if (!Number.isFinite(degrees)) return null;

      const lang = getCurrentLang();
      const directions = {
        de: [
          ["N", "Norden"],
          ["NO", "Nordosten"],
          ["O", "Osten"],
          ["SO", "Südosten"],
          ["S", "Süden"],
          ["SW", "Südwesten"],
          ["W", "Westen"],
          ["NW", "Nordwesten"],
        ],
        ru: [
          ["С", "севера"],
          ["СВ", "северо-востока"],
          ["В", "востока"],
          ["ЮВ", "юго-востока"],
          ["Ю", "юга"],
          ["ЮЗ", "юго-запада"],
          ["З", "запада"],
          ["СЗ", "северо-запада"],
        ],
      };
      const normalized = ((degrees % 360) + 360) % 360;
      const options = directions[lang] || directions.de;
      return options[Math.round(normalized / 45) % options.length];
    };

    const formatDurationHours = (milliseconds) => {
      const numeric = optionalNumber(milliseconds);
      if (!Number.isFinite(numeric) || numeric < 0) return "--";
      const hours = numeric / (60 * 60 * 1000);
      return new Intl.NumberFormat(getCurrentLocale(), {
        maximumFractionDigits: 1,
        minimumFractionDigits: hours < 10 ? 1 : 0,
      }).format(hours);
    };

    const buildPlaceLabel = (place) => {
      const hasRegion = Boolean(String(place?.admin1 || "").trim());
      const parts = [place?.name, place?.admin1, hasRegion ? "" : place?.country]
        .map((part) => String(part || "").trim())
        .filter(Boolean);
      return [...new Set(parts)].join(", ") || DEFAULT_CITY;
    };

    const rememberWeatherSearch = (query, city) => {
      addRecentSearch(query, city);
      renderRecentQuickPicks();
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
          probability: optionalNumber(hourly.precipitation_probability?.[idx]),
          precipitation: optionalNumber(hourly.precipitation?.[idx]),
          temp: optionalNumber(hourly.temperature_2m?.[idx]),
          weatherCode: hourly.weather_code?.[idx],
          wind: optionalNumber(hourly.wind_speed_10m?.[idx]),
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
          const probability = item.probability;
          return Number.isFinite(probability) && probability > best.probability
            ? { ...item, probability } : best;
        },
        { probability: -1, time: "" },
      );

      if (rainyIndex < 0) {
        return { hasRain: false, available: items.some((item) => Number.isFinite(item.probability) || Number.isFinite(item.precipitation)), peak };
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
        available: true,
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
      const wind = optionalNumber(current?.wind_speed_10m);
      const uv = optionalNumber(current?.uv_index ?? daily?.uv_index_max?.[0]);
      const apparent = optionalNumber(current?.apparent_temperature ?? current?.temperature_2m);
      const summary = [];

      if (optionalNumber(precipChance) >= 55) {
        summary.push(texts.summary_rain_now);
      } else if (rainWindow.hasRain) {
        summary.push(`${texts.summary_dry_until} ${rainWindow.start.time}`);
      }
      if (Number.isFinite(wind) && wind >= 28) summary.push(texts.summary_wind);
      if (Number.isFinite(uv) && uv >= 6) summary.push(texts.summary_uv);
      if (Number.isFinite(apparent) && apparent <= 6) summary.push(texts.summary_cold);
      if (Number.isFinite(apparent) && apparent >= 29) summary.push(texts.summary_hot);

      if (weatherSummaryLabelEl) weatherSummaryLabelEl.textContent = texts.summary_title;
      const hasSummaryData = [wind, uv, apparent].some(Number.isFinite) || rainWindow.available;
      weatherSummaryTextEl.textContent = summary.slice(0, 3).join(" • ") || (hasSummaryData ? texts.summary_default : texts.health_unavailable);

      if (rainWindowLabelEl) rainWindowLabelEl.textContent = texts.rain_window_title;
      if (rainWindow.hasRain) {
        rainWindowValueEl.textContent =
          rainWindow.start.time === rainWindow.end.time
            ? rainWindow.start.time
            : `${rainWindow.start.time} - ${rainWindow.end.time}`;
      } else {
        rainWindowValueEl.textContent = rainWindow.available ? texts.rain_window_dry : texts.health_unavailable;
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
      const humidity = optionalNumber(current?.relative_humidity_2m);
      const wind = optionalNumber(current?.wind_speed_10m);
      const windDirection = formatWindDirection(current?.wind_direction_10m);
      const pressure = optionalNumber(current?.pressure_msl);

      cityNameEl.textContent = city;
      timeTextEl.textContent = `${formatDateTime(currentDate, timezone)} • ${weather.label}`;
      tempNowEl.textContent = formatTemperature(current?.temperature_2m);
      miniNowEl.innerHTML =
        `${texts.max_short}: ${formatTemperature(daily?.temperature_2m_max?.[0])} • ` +
        `${texts.min_short}: ${formatTemperature(daily?.temperature_2m_min?.[0])}`;
      rainNowEl.textContent = `${texts.rain_probability} ${formatPercent(precipChance)}`;

      const windStrength =
        wind > 28 ? texts.wind_stormy : wind > 14 ? texts.wind_breezy : texts.wind_calm;
      windValueEl.textContent = Number.isFinite(wind)
        ? `${Math.round(wind)} km/h${windDirection ? ` · ${windDirection[0]}` : ""}`
        : "--";
      windHintEl.textContent = !Number.isFinite(wind) ? texts.health_unavailable : windDirection
        ? `${windStrength} · ${texts.wind_from} ${windDirection[1]}`
        : windStrength;

      humValueEl.textContent = Number.isFinite(humidity) ? `${Math.round(humidity)}%` : "--";
      humHintEl.textContent =
        !Number.isFinite(humidity) ? texts.health_unavailable : humidity > 70
          ? texts.humidity_humid
          : humidity < 40
            ? texts.humidity_dry
            : texts.humidity_ok;

      uvValueEl.textContent = Number.isFinite(optionalNumber(uv)) ? Math.round(optionalNumber(uv)) : texts.uv_unknown;
      uvHintEl.textContent =
        optionalNumber(uv) >= 6
          ? texts.uv_high
          : optionalNumber(uv) >= 3
            ? texts.uv_medium
            : Number.isFinite(optionalNumber(uv))
              ? texts.uv_low
              : texts.uv_unknown;

      precipValueEl.textContent = formatPercent(precipChance);
      precipHintEl.textContent =
        !Number.isFinite(optionalNumber(precipChance)) ? texts.health_unavailable : optionalNumber(precipChance) > 50 ? texts.precip_likely : texts.precip_low;

      pressureValueEl.textContent = Number.isFinite(pressure) ? `${Math.round(pressure)} hPa` : "--";
      pressureHintEl.textContent = Number.isFinite(pressure)
        ? pressure < 1000
          ? texts.pressure_low
          : pressure > 1025
            ? texts.pressure_high
            : texts.pressure_normal
        : "--";
    };

    const renderHealthGuidance = (payload) => {
      const texts = getWeatherTexts();
      const air = payload?.airQuality || {};
      const aqi = optionalNumber(air.european_aqi);
      const pm25 = optionalNumber(air.pm2_5);
      const apparent = optionalNumber(
        payload?.current?.apparent_temperature ?? payload?.current?.temperature_2m,
      );
      const numberFormatter = new Intl.NumberFormat(getCurrentLocale(), {
        maximumFractionDigits: 1,
      });

      const setRisk = (element, level, label) => {
        element.dataset.level = level;
        element.textContent = label;
      };

      if (Number.isFinite(aqi) || Number.isFinite(pm25)) {
        const level = Number.isFinite(aqi)
          ? aqi > 60
            ? "high"
            : aqi > 40
              ? "elevated"
              : "low"
          : pm25 > 50
            ? "high"
            : pm25 > 15
              ? "elevated"
              : "low";
        const details = [
          Number.isFinite(aqi) ? `EU-AQI ${Math.round(aqi)}` : "",
          Number.isFinite(pm25) ? `PM2,5 ${numberFormatter.format(pm25)} µg/m³` : "",
        ].filter(Boolean).join(" · ");
        setRisk(
          respiratoryRiskEl,
          level,
          level === "high"
            ? texts.health_high
            : level === "elevated"
              ? texts.health_elevated
              : texts.health_low,
        );
        respiratoryTextEl.textContent = `${details}. ${
          level === "high"
            ? texts.respiratory_high
            : level === "elevated"
              ? texts.respiratory_elevated
              : texts.respiratory_low
        }`;
      } else {
        setRisk(respiratoryRiskEl, "unavailable", texts.health_unavailable);
        respiratoryTextEl.textContent = texts.respiratory_unavailable;
      }

      const pollenLabels = getCurrentLang() === "ru"
        ? {
            alder_pollen: "ольха",
            birch_pollen: "берёза",
            grass_pollen: "травы",
            mugwort_pollen: "полынь",
            ragweed_pollen: "амброзия",
          }
        : {
            alder_pollen: "Erle",
            birch_pollen: "Birke",
            grass_pollen: "Gräser",
            mugwort_pollen: "Beifuß",
            ragweed_pollen: "Ambrosia",
          };
      const pollenValues = Object.entries(pollenLabels)
        .map(([key, label]) => ({ label, value: optionalNumber(air[key]) }))
        .filter((item) => Number.isFinite(item.value));
      const strongestPollen = pollenValues.sort((a, b) => b.value - a.value)[0];

      if (!strongestPollen) {
        setRisk(pollenRiskEl, "unavailable", texts.health_unavailable);
        pollenTextEl.textContent = texts.pollen_unavailable;
      } else if (strongestPollen.value <= 0.1) {
        setRisk(pollenRiskEl, "low", texts.health_low);
        pollenTextEl.textContent = texts.pollen_low;
      } else {
        setRisk(pollenRiskEl, "elevated", texts.health_elevated);
        pollenTextEl.textContent = `${strongestPollen.label}: ${numberFormatter.format(strongestPollen.value)} ${texts.pollen_unit}. ${texts.pollen_present}`;
      }

      if (!Number.isFinite(apparent)) {
        setRisk(heartRiskEl, "unavailable", texts.health_unavailable);
        heartTextEl.textContent = texts.heart_unavailable;
      } else {
        const isHigh = apparent >= 32 || apparent <= -5;
        const isElevated = apparent >= 27 || apparent <= 5;
        const level = isHigh ? "high" : isElevated ? "elevated" : "low";
        const message = apparent >= 32
          ? texts.heart_heat_high
          : apparent >= 27
            ? texts.heart_heat
            : apparent <= -5
              ? texts.heart_cold_high
              : apparent <= 5
                ? texts.heart_cold
                : texts.heart_low;
        setRisk(
          heartRiskEl,
          level,
          level === "high"
            ? texts.health_high
            : level === "elevated"
              ? texts.health_elevated
              : texts.health_low,
        );
        heartTextEl.textContent = `${formatTemperature(apparent)} ${texts.feels_like_short}. ${message}`;
      }
    };

    const getHealthHourlyItems = (payload) => {
      const weather = payload?.hourly || {};
      const air = payload?.airQualityHourly || {};
      if (!Array.isArray(weather.time) || !weather.time.length) return [];

      const currentDate = parseApiLocalDateTime(
        payload?.current?.time,
        payload?.utcOffsetSeconds,
      );
      const currentTs = currentDate?.getTime() || Date.now();
      const airIndexByTime = new Map(
        (air.time || []).map((time, index) => [time, index]),
      );
      const pollenKeys = [
        "alder_pollen",
        "birch_pollen",
        "grass_pollen",
        "mugwort_pollen",
        "ragweed_pollen",
      ];
      const items = [];

      weather.time.forEach((time, weatherIndex) => {
        if (items.length >= 24) return;
        const date = parseApiLocalDateTime(time, payload?.utcOffsetSeconds);
        if (!date || date.getTime() < currentTs - 60 * 60 * 1000) return;
        const airIndex = airIndexByTime.get(time);
        const pollenValues = pollenKeys
          .map((key) => optionalNumber(air[key]?.[airIndex]))
          .filter(Number.isFinite);
        items.push({
          time,
          date,
          hour: Number(time.slice(11, 13)),
          rain: optionalNumber(weather.precipitation_probability?.[weatherIndex]),
          apparent: optionalNumber(
            weather.apparent_temperature?.[weatherIndex] ??
              weather.temperature_2m?.[weatherIndex],
          ),
          uv: optionalNumber(weather.uv_index?.[weatherIndex]),
          aqi: optionalNumber(air.european_aqi?.[airIndex]),
          pollen: pollenValues.length ? Math.max(...pollenValues) : null,
        });
      });

      return items.map((item) => {
        const rainPenalty = Number.isFinite(item.rain) ? Math.min(item.rain / 100, 1) * 30 : 0;
        const airPenalty = Number.isFinite(item.aqi)
          ? Math.min(Math.max(item.aqi - 20, 0) / 80, 1) * 30
          : 0;
        const pollenPenalty = Number.isFinite(item.pollen)
          ? Math.min(item.pollen / 50, 1) * 25
          : 0;
        const temperaturePenalty = Number.isFinite(item.apparent)
          ? Math.min(Math.abs(item.apparent - 20) / 20, 1) * 15
          : 0;
        const uvPenalty = Number.isFinite(item.uv)
          ? Math.min(Math.max(item.uv - 3, 0) / 5, 1) * 15
          : 0;
        const score = rainPenalty + airPenalty + pollenPenalty + temperaturePenalty + uvPenalty;
        const complete = [item.rain, item.aqi, item.pollen, item.apparent, item.uv].every(Number.isFinite);
        return {
          ...item,
          score,
          complete,
          level: !complete ? "unavailable" : score >= 55 ? "high" : score >= 25 ? "elevated" : "low",
        };
      });
    };

    const renderHealthPlanner = (payload) => {
      const texts = getWeatherTexts();
      const items = getHealthHourlyItems(payload);
      if (!items.length) {
        healthBestValueEl.textContent = texts.health_unavailable;
        healthBestHintEl.textContent = texts.health_timeline_empty;
        healthTimelineEl.textContent = texts.health_timeline_empty;
        return;
      }

      const levelLabel = (level) =>
        level === "unavailable" ? texts.health_unavailable : level === "high"
          ? texts.health_level_high
          : level === "elevated"
            ? texts.health_level_elevated
            : texts.health_level_low;
      const timelineItems = items.filter((_, index) => index % 3 === 0).slice(0, 8);
      healthTimelineEl.innerHTML = timelineItems
        .map(
          (item) => `
            <div class="weather-health-hour">
              <div class="weather-health-hour__time">${formatClock(item.date, payload.timezone)}</div>
              <div class="weather-health-hour__level" data-level="${item.level}">${levelLabel(item.level)}</div>
              <div class="weather-health-hour__detail">AQI ${Number.isFinite(item.aqi) ? Math.round(item.aqi) : "--"}</div>
              <div class="weather-health-hour__detail">${texts.health_timeline_pollen} ${Number.isFinite(item.pollen) ? Math.round(item.pollen) : "--"}</div>
            </div>
          `,
        )
        .join("");

      const candidateWindows = items
        .slice(0, -2)
        .map((item, index) => ({
          start: item,
          end: items[index + 2],
          score: (item.score + items[index + 1].score) / 2,
          complete: item.complete && items[index + 1].complete && items[index + 2].complete,
        }))
        .filter((window) => window.complete && window.start.hour >= 6 && window.start.hour <= 20)
        .sort((a, b) => a.score - b.score);
      const best = candidateWindows[0];

      if (!best) {
        healthBestValueEl.textContent = texts.health_unavailable;
        healthBestHintEl.textContent = texts.health_timeline_empty;
        return;
      }

      const dayLabel = new Intl.DateTimeFormat(getCurrentLocale(), {
        weekday: "short",
        timeZone: payload.timezone || undefined,
      }).format(best.start.date);
      healthBestValueEl.textContent =
        `${dayLabel}, ${formatClock(best.start.date, payload.timezone)}–${formatClock(best.end.date, payload.timezone)}`;
      healthBestHintEl.textContent =
        best.score >= 55 ? texts.health_best_caution : texts.health_best_hint;
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
            <div class="weather-forecast-row${idx === 0 ? " weather-forecast-row--today" : ""}">
              <div class="weather-forecast-day">
                <div class="weather-forecast-icon">${weather.icon}</div>
                <div>
                  <div>${formatDayName(isoDate, idx)}</div>
                  <span>${weather.label}</span>
                </div>
              </div>
              <div class="weather-forecast-metrics">
                <div class="weather-forecast-temp">${deg}</div>
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
            <div class="weather-hourly-chip">
              <div class="weather-hourly-time">${item.time}</div>
              <div class="weather-hourly-icon">${item.weather.icon}</div>
              <div class="weather-hourly-temp">${item.temp}</div>
              <div class="weather-hourly-rain">${item.prob} ${texts.rain_suffix}</div>
            </div>
          `,
        )
        .join("");
      hourlyBox.classList.remove("hidden");
    };

    const renderPayload = (payload, source, updatedAt) => {
      latestPayload = payload;
      renderCurrent(payload);
      renderHealthGuidance(payload);
      renderHealthPlanner(payload);
      renderInsights(payload);
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
      if (pressureLabelEl) pressureLabelEl.textContent = texts.card_pressure;
      if (healthTitleEl) healthTitleEl.textContent = texts.health_title;
      if (healthIntroEl) healthIntroEl.textContent = texts.health_intro;
      if (respiratoryTitleEl) respiratoryTitleEl.textContent = texts.respiratory_title;
      if (pollenTitleEl) pollenTitleEl.textContent = texts.pollen_title;
      if (heartTitleEl) heartTitleEl.textContent = texts.heart_title;
      if (healthBestTitleEl) healthBestTitleEl.textContent = texts.health_best_title;
      if (healthTimelineTitleEl) healthTimelineTitleEl.textContent = texts.health_timeline_title;
      if (healthDisclaimerEl) healthDisclaimerEl.textContent = texts.health_disclaimer;
      if (!latestPayload) {
        [respiratoryRiskEl, pollenRiskEl, heartRiskEl].forEach((element) => {
          delete element.dataset.level;
          element.textContent = texts.health_loading;
        });
        respiratoryTextEl.textContent = texts.respiratory_checking;
        pollenTextEl.textContent = texts.pollen_checking;
        heartTextEl.textContent = texts.heart_checking;
        healthBestValueEl.textContent = texts.health_best_loading;
        healthBestHintEl.textContent = texts.health_best_checking;
        healthTimelineEl.innerHTML = "";
      }
      if (hourlyTitleEl) hourlyTitleEl.textContent = texts.hourly_title;
      if (weatherSummaryLabelEl) weatherSummaryLabelEl.textContent = texts.summary_title;
      if (rainWindowLabelEl) rainWindowLabelEl.textContent = texts.rain_window_title;
      if (sunTimesLabelEl) sunTimesLabelEl.textContent = texts.sun_times_title;
      if (!latestPayload && timeTextEl) timeTextEl.textContent = texts.default_not_loaded;
      syncButtonLabels();
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
      const requestController = new AbortController();
      controller = requestController;
      const isCurrent = () => controller === requestController && !requestController.signal.aborted;

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
        const geo = await fetchJson(geoUrl, requestController.signal);
        if (!isCurrent()) return;

        if (!geo?.results?.length) {
          setStatusState("no_result");
          return;
        }

        setStatusState("loading");
        const place = geo.results[0];
        const placeLabel = buildPlaceLabel(place);
        const forecastUrl =
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
          "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,uv_index" +
          "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset" +
          "&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index" +
          "&past_hours=0&forecast_days=5&timezone=auto";
        const airQualityUrl =
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.latitude}&longitude=${place.longitude}` +
          "&current=european_aqi,pm2_5,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,ragweed_pollen" +
          "&hourly=european_aqi,pm2_5,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,ragweed_pollen" +
          "&forecast_hours=24&timezone=auto";
        const [data, airQualityData] = await Promise.all([
          fetchJson(forecastUrl, requestController.signal),
          fetchJson(airQualityUrl, requestController.signal).catch(() => null),
        ]);
        if (!isCurrent()) return;

        const payload = {
          city: placeLabel,
          timezone: data.timezone,
          utcOffsetSeconds: data.utc_offset_seconds || 0,
          current: data.current || {},
          daily: data.daily || {},
          hourly: data.hourly || {},
          airQuality: airQualityData?.current || {},
          airQualityHourly: airQualityData?.hourly || {},
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
        if (!isCurrent() || err?.name === "AbortError") return;
        console.error(err);
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setStatusState("offline");
        } else {
          setStatusState("error");
        }
      } finally {
        if (controller === requestController) {
          controller = null;
          setLoading(false);
        }
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
        clearTimeout(typingTimer);
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
