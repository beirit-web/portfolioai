import { getDjangoOrigin } from "../../lib/homeConfig";
import React from "react";
import { AirVent, Clock3, Flower2, HeartPulse, Info, TrendingUp } from "lucide-react";
import "./WeatherPage.css";

function useWeatherPageShell() {
  React.useEffect(() => {
    const script = document.createElement("script");
    script.src = `${getDjangoOrigin()}/static/js/weather-widget.js`;
    script.defer = true;
    script.dataset.reactWeatherWidget = "true";
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);
}

export default function WeatherPage() {
  useWeatherPageShell();

  return (
    <section className="botanic-weather">
      <section className="weather-page-layout">
        <section className="weather-page-main">
          <div
            className="weather-widget weather-widget--page"
            aria-label="Wetteransicht"
            data-i18n-aria-label="weather.widget_aria"
            data-auto-search="true"
          >
            <div className="weather-widget-grid">
              <section className="weather-command-card" aria-labelledby="weatherPageTitle">
                <div className="weather-page-widget__intro">
                  <h2 id="weatherPageTitle">Wetter für Garten &amp; Pflanzen</h2>
                  <p>
                    Temperatur, Regenfenster, Sonnenzeiten und Vorhersage für Ihren Standort – direkt in ENBT Botanic.
                  </p>
                </div>

                <div className="weather-command-card__controls">
                  <form
                    className="weather-search-form"
                    role="search"
                    aria-label="Wetter nach Ort suchen"
                    data-i18n-aria-label="weather.search_form_aria"
                  >
                    <label htmlFor="cityInput" className="visually-hidden" data-i18n="weather.search_label">Ort suchen</label>
                    <div className="weather-search-field">
                      <span className="weather-search-icon">🔍</span>
                      <input
                        id="cityInput"
                        type="search"
                        autoComplete="off"
                        autoCapitalize="words"
                        spellCheck="false"
                        placeholder="Ort suchen (z. B. Helmstedt)"
                        data-i18n-placeholder="weather.search_placeholder"
                        defaultValue="Helmstedt"
                      />
                    </div>
                  </form>

                  <div className="weather-actions">
                    <button id="loadBtn" type="button" className="load-btn weather-refresh-btn btn-primary" data-i18n="weather.refresh_button">
                      Jetzt aktualisieren
                    </button>
                  </div>
                </div>

                <div
                  className="weather-page-quickpicks hidden"
                  aria-label="Zuletzt gesuchte Orte"
                  data-i18n-aria-label="weather.recent_searches_aria"
                />

                <div className="weather-status" id="statusMsg" aria-live="polite" />
              </section>

              <section className="weather-current-card" aria-label="Aktuelle Wetterlage" data-i18n-aria-label="weather.current_aria">
                <div className="weather-current-header">
                  <div>
                    <h2 id="cityName">Helmstedt</h2>
                    <div className="weather-current-subtitle" id="timeText" data-i18n="weather.default_not_loaded">Wetter noch nicht geladen</div>
                    <div className="weather-current-temperature">
                      <div className="weather-current-temperature-value" id="tempNow">--</div>
                      <div className="weather-current-meta" id="miniNow"><span data-i18n="weather.max_short">Max</span>: -- • <span data-i18n="weather.min_short">Min</span>: --</div>
                    </div>
                  </div>
                  <div className="weather-current-rain-pill" id="rainNow"><span data-i18n="weather.rain_probability">Regenwahrscheinlichkeit</span>&nbsp;--</div>
                </div>

                <div className="weather-insights" id="weatherInsights" aria-live="polite">
                  <div className="weather-insight weather-insight--summary">
                    <div className="weather-insight__label" id="weatherSummaryLabel">
                      <span data-i18n="weather.summary_title">Heute relevant</span>
                    </div>
                    <div className="weather-insight__value" id="weatherSummaryText">--</div>
                  </div>
                  <div className="weather-insight">
                    <div className="weather-insight__label" id="rainWindowLabel">
                      <span data-i18n="weather.rain_window_title">Regen-Zeitfenster</span>
                    </div>
                    <div className="weather-insight__value" id="rainWindowValue">--</div>
                    <div className="weather-insight__hint" id="rainWindowHint">--</div>
                  </div>
                  <div className="weather-insight">
                    <div className="weather-insight__label" id="sunTimesLabel">
                      <span data-i18n="weather.sun_times_title">Sonnenzeiten</span>
                    </div>
                    <div className="weather-insight__value" id="sunTimesValue">--</div>
                    <div className="weather-insight__hint" id="sunTimesHint">--</div>
                  </div>
                </div>

              </section>

              <div className="weather-details" id="weatherDetails">
                <div className="weather-metrics-grid">
                  <div className="weather-metric-card">
                    <div className="weather-metric-label" id="windLabel" data-i18n="weather.card_wind">Wind</div>
                    <div className="weather-metric-value" id="windValue">--</div>
                    <div className="weather-metric-hint" id="windHint">--</div>
                  </div>
                  <div className="weather-metric-card">
                    <div className="weather-metric-label" id="humidityLabel" data-i18n="weather.card_humidity">Luftfeuchte</div>
                    <div className="weather-metric-value" id="humValue">--</div>
                    <div className="weather-metric-hint" id="humHint">--</div>
                  </div>
                  <div className="weather-metric-card">
                    <div className="weather-metric-label" id="uvLabel" data-i18n="weather.card_uv">UV-Index</div>
                    <div className="weather-metric-value" id="uvValue">--</div>
                    <div className="weather-metric-hint" id="uvHint">--</div>
                  </div>
                  <div className="weather-metric-card">
                    <div className="weather-metric-label" id="precipLabel" data-i18n="weather.card_precip">Regenrisiko</div>
                    <div className="weather-metric-value" id="precipValue">--</div>
                    <div className="weather-metric-hint" id="precipHint">--</div>
                  </div>
                  <div className="weather-metric-card weather-metric-card--pressure">
                    <div className="weather-metric-label" id="pressureLabel" data-i18n="weather.card_pressure">Luftdruck</div>
                    <div className="weather-metric-value" id="pressureValue">--</div>
                    <div className="weather-metric-hint" id="pressureHint">--</div>
                  </div>
                </div>

                <section className="weather-forecast" id="forecast" aria-labelledby="forecastTitle" aria-live="polite">
                  <div className="weather-forecast__header">
                    <h3 id="forecastTitle" data-i18n="weather.forecast_title">5-Tage-Ausblick</h3>
                    <span data-i18n="weather.forecast_note">Temperatur und Regenrisiko</span>
                  </div>
                  <div className="weather-forecast__list" id="forecastList" />
                </section>
                <div className="weather-hourly" id="hourlyBox">
                  <h3 id="hourlyTitle" data-i18n="weather.hourly_title">Nächste 24 Stunden</h3>
                  <div className="weather-hourly-strip" id="hourlyStrip" />
                </div>

                <section className="weather-health" aria-labelledby="healthTitle">
                  <header className="weather-health__header">
                    <Info aria-hidden="true" />
                    <div>
                      <h3 id="healthTitle" data-i18n="weather.health_title">Gesundheit &amp; Wetter</h3>
                      <p id="healthIntro" data-i18n="weather.health_intro">Orientierung für wetterempfindliche Menschen</p>
                    </div>
                  </header>

                  <div className="weather-health__grid" aria-live="polite">
                    <article className="weather-health-card">
                      <div className="weather-health-card__heading">
                        <AirVent aria-hidden="true" />
                        <h4 id="respiratoryTitle" data-i18n="weather.respiratory_title">Atemwege &amp; Rauchen</h4>
                      </div>
                      <span className="weather-health-card__status" id="respiratoryRisk" data-i18n="weather.health_loading">Wird geladen</span>
                      <p id="respiratoryText" data-i18n="weather.respiratory_checking">Luftqualität und Feinstaub werden geprüft.</p>
                    </article>

                    <article className="weather-health-card">
                      <div className="weather-health-card__heading">
                        <Flower2 aria-hidden="true" />
                        <h4 id="pollenTitle" data-i18n="weather.pollen_title">Pollen &amp; Asthma</h4>
                      </div>
                      <span className="weather-health-card__status" id="pollenRisk" data-i18n="weather.health_loading">Wird geladen</span>
                      <p id="pollenText" data-i18n="weather.pollen_checking">Aktuelle Pollendaten werden geprüft.</p>
                    </article>

                    <article className="weather-health-card">
                      <div className="weather-health-card__heading">
                        <HeartPulse aria-hidden="true" />
                        <h4 id="heartTitle" data-i18n="weather.heart_title">Herz &amp; Kreislauf</h4>
                      </div>
                      <span className="weather-health-card__status" id="heartRisk" data-i18n="weather.health_loading">Wird geladen</span>
                      <p id="heartText" data-i18n="weather.heart_checking">Die thermische Wetterbelastung wird geprüft.</p>
                    </article>
                  </div>

                  <div className="weather-health-planner">
                    <article className="weather-health-best">
                      <div className="weather-health-planner__heading">
                        <Clock3 aria-hidden="true" />
                        <h4 id="healthBestTitle" data-i18n="weather.health_best_title">Beste Zeit draußen</h4>
                      </div>
                      <div className="weather-health-best__value" id="healthBestValue" data-i18n="weather.health_best_loading">Wird berechnet</div>
                      <p id="healthBestHint" data-i18n="weather.health_best_checking">Regen, UV, Temperatur, Luftqualität und Pollen werden verglichen.</p>
                    </article>

                    <section className="weather-health-timeline" aria-labelledby="healthTimelineTitle">
                      <div className="weather-health-planner__heading">
                        <TrendingUp aria-hidden="true" />
                        <h4 id="healthTimelineTitle" data-i18n="weather.health_timeline_title">Gesundheitsverlauf: 24 Stunden</h4>
                      </div>
                      <div className="weather-health-timeline__strip" id="healthTimeline" aria-live="polite" />
                    </section>
                  </div>

                  <footer className="weather-health__footer">
                    <p id="healthDisclaimer" data-i18n="weather.health_disclaimer">
                      Allgemeine Orientierung, keine medizinische Diagnose. Bei akuter Atemnot oder Brustschmerz: 112.
                    </p>
                    <nav aria-label="Gesundheitsquellen" data-i18n-aria-label="weather.health_sources_aria">
                      <a href="https://www.dwd.de/DE/klimaumwelt/ku_beratung/gesundheit/pollen/pollen_node.html" target="_blank" rel="noreferrer" data-i18n="weather.source_dwd_pollen">DWD Pollen</a>
                      <a href="https://www.umweltbundesamt.de/themen/luft/luftqualitaet/der-luftqualitaetsindex-lqi" target="_blank" rel="noreferrer" data-i18n="weather.source_uba_air">UBA Luftqualität</a>
                      <a href="https://herzstiftung.de/ihre-herzgesundheit/gesund-bleiben/klima-und-umwelt/wetterfuehligkeit" target="_blank" rel="noreferrer" data-i18n="weather.source_heart">Deutsche Herzstiftung</a>
                      <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer" data-i18n="weather.source_weather_data">Daten: Open-Meteo/CAMS</a>
                    </nav>
                  </footer>
                </section>
              </div>
            </div>
          </div>
        </section>
      </section>
    </section>
  );
}
