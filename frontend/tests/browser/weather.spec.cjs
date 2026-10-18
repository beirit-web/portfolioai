const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");
const { gate } = require("./helpers/async.cjs");

// Fixed API dates keep forecasts independent of the machine's clock and timezone.
const hours = Array.from({ length: 24 }, (_, index) =>
  new Date(Date.UTC(2026, 9, 6, 9 + index)).toISOString().slice(0, 16));
const days = Array.from({ length: 5 }, (_, index) => `2026-10-${String(6 + index).padStart(2, "0")}`);
const repeat = value => hours.map(() => value);
const forecast = {
  timezone: "Europe/Berlin",
  utc_offset_seconds: 7200,
  current: {
    time: hours[0],
    temperature_2m: 18.4,
    apparent_temperature: 18,
    relative_humidity_2m: 63,
    precipitation: 0,
    weather_code: 2,
    wind_speed_10m: 12.4,
    wind_direction_10m: 270,
    pressure_msl: 1016.4,
    uv_index: 3,
  },
  hourly: {
    time: hours,
    temperature_2m: hours.map((_, index) => 18 + index % 4),
    apparent_temperature: repeat(18),
    precipitation_probability: hours.map((_, index) => index % 6 * 10),
    precipitation: repeat(0),
    weather_code: repeat(2),
    wind_speed_10m: repeat(12),
    uv_index: repeat(3),
  },
  daily: {
    time: days,
    weather_code: [2, 0, 61, 3, 2],
    temperature_2m_max: [22, 21, 20, 19, 18],
    temperature_2m_min: [11, 10, 9, 8, 7],
    precipitation_probability_max: [20, 30, 40, 50, 60],
    uv_index_max: [3, 3, 2, 2, 2],
    sunrise: days.map(day => `${day}T07:20`),
    sunset: days.map(day => `${day}T18:45`),
  },
};
const airQuality = {
  current: {
    european_aqi: 25,
    pm2_5: 8,
    alder_pollen: 0,
    birch_pollen: 0,
    grass_pollen: 0,
    mugwort_pollen: 0,
    ragweed_pollen: 0,
  },
  hourly: {
    time: hours,
    european_aqi: repeat(25),
    pm2_5: repeat(8),
    alder_pollen: repeat(0),
    birch_pollen: repeat(0),
    grass_pollen: repeat(0),
    mugwort_pollen: repeat(0),
    ragweed_pollen: repeat(0),
  },
};

async function mockWeather(context, baseURL, {
  failForecastOnce = false, forecastData = forecast, airQualityData = airQuality,
} = {}) {
  const origin = new URL(baseURL).origin;
  const requests = { cities: [], forecasts: 0, airQuality: 0 };
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    const headers = { "Access-Control-Allow-Origin": origin };
    if (url.hostname === "geocoding-api.open-meteo.com" && url.pathname === "/v1/search") {
      const city = url.searchParams.get("name");
      requests.cities.push(city);
      return route.fulfill({ headers, json: { results: [{
        name: city,
        admin1: city === "Berlin" ? "Berlin" : "Niedersachsen",
        country: "Deutschland",
        latitude: 52.52,
        longitude: 13.405,
      }] } });
    }
    if (url.hostname === "api.open-meteo.com" && url.pathname === "/v1/forecast") {
      requests.forecasts++;
      if (failForecastOnce && requests.forecasts === 1) {
        return route.fulfill({ headers, status: 503, json: { error: true, reason: "Simulierter Ausfall" } });
      }
      return route.fulfill({ headers, json: forecastData });
    }
    if (url.hostname === "air-quality-api.open-meteo.com" && url.pathname === "/v1/air-quality") {
      requests.airQuality++;
      return route.fulfill({ headers, json: airQualityData });
    }
    return route.abort();
  });
  return requests;
}

test.beforeEach(async ({ page }) => {
  page.browserErrors = [];
  page.on("pageerror", error => page.browserErrors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(page.browserErrors, "Uncaught browser errors").toEqual([]);
});

async function openWeather(page) {
  const response = await page.goto("/botanic/wetter/");
  expect(response.status()).toBe(200);
  await expect(page.getByRole("navigation", { name: "Botanic", exact: true }).getByRole("link", { name: "Wetter", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.locator(".app-header")).toContainText("ENBT Botanic");
  await expect(page.getByRole("heading", { name: "Wetter für Garten & Pflanzen", exact: true })).toBeVisible();
  await expect(page.locator(".weather-widget")).toHaveAttribute("data-weather-widget-initialized", "true");
}

test("weather starts from server HTML without a React module waterfall", async ({ page, context, baseURL }) => {
  const scripts = [];
  page.on("request", request => {
    if (request.resourceType() === "script") scripts.push(request.url());
  });
  await mockWeather(context, baseURL);
  const response = await page.goto("/botanic/wetter/");
  const html = await response.text();
  expect(html).toContain('id="weatherPageTitle"');
  expect(html).toContain('id="cityInput"');
  await expect(page.locator(".weather-widget")).toHaveAttribute("data-status", "updated_live");
  expect(scripts.filter(url => url.includes("weather-widget.js"))).toHaveLength(1);
  expect(scripts.some(url => url.includes("/portfolio-dist/") && /\.js(?:\?|$)/.test(url))).toBe(false);
  await expect(page.locator('script[src*="weather-widget.js"]')).toHaveAttribute("defer", "");
});

test("weather shell and source attribution are visible without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    await blockExternalRequests(context, baseURL);
    const page = await context.newPage();
    await page.goto(`${baseURL}/botanic/wetter/`);
    await expect(page.getByRole("heading", { name: "Wetter für Garten & Pflanzen", exact: true })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Ort suchen", exact: true })).toHaveValue("Helmstedt");
    await expect(page.getByRole("navigation", { name: "Gesundheitsquellen", exact: true })).toContainText("DWD Pollen");
    const notice = page.locator("noscript .care-notice");
    await expect(notice).toHaveText("Bitte aktivieren Sie JavaScript, um Wetterdaten nach Ort abzurufen.");
    await expect(notice).toBeVisible();
  } finally {
    await context.close();
  }
});

test("weather flow loads a searched city with current, hourly and five-day forecasts", async ({ page, context, baseURL }, testInfo) => {
  const requests = await mockWeather(context, baseURL);
  await openWeather(page);
  await expect(page.locator(".weather-widget")).toHaveAttribute("data-status", "updated_live");
  const search = page.getByRole("searchbox", { name: "Ort suchen", exact: true });
  await search.fill("Berlin");
  await search.press("Enter");
  await expect(page.locator("#cityName")).toHaveText("Berlin");
  await expect(page.locator("#statusMsg")).toContainText("Aktualisiert");
  await expect(page.locator("#tempNow")).toHaveText("18°");
  await expect(page.locator("#miniNow")).toHaveText("Max: 22° • Min: 11°");
  await expect(page.locator("#windValue")).toHaveText("12 km/h · W");
  await expect(page.locator("#humValue")).toHaveText("63%");
  await expect(page.locator("#pressureValue")).toHaveText("1016 hPa");
  await expect(page.locator("#respiratoryText")).toContainText("EU-AQI 25");
  await expect(page.locator("#respiratoryRisk")).toHaveAttribute("data-level", "low");
  await expect(page.locator("#healthTimeline .weather-health-hour")).toHaveCount(8);

  await expect(page.locator("#hourlyBox")).toBeVisible();
  const hourly = page.locator("#hourlyStrip .weather-hourly-chip");
  await expect(hourly).toHaveCount(24);
  await expect(hourly.first().locator(".weather-hourly-time")).toHaveText("09:00");
  await expect(hourly.first().locator(".weather-hourly-temp")).toHaveText("18°");
  await expect(hourly.last().locator(".weather-hourly-time")).toHaveText("08:00");
  await expect(hourly.last().locator(".weather-hourly-rain")).toHaveText("50% Regen");

  await expect(page.locator("#forecast")).toBeVisible();
  const daily = page.locator("#forecastList .weather-forecast-row");
  await expect(daily).toHaveCount(5);
  await expect(daily.first()).toContainText("Heute");
  await expect(daily.first().locator(".weather-forecast-temp")).toHaveText("22° / 11°");
  await expect(daily.last().locator(".weather-forecast-temp")).toHaveText("18° / 7°");
  await expect(daily.last()).toContainText("Regen: 60%");
  expect(requests.cities).toContain("Berlin");
  expect(requests.airQuality).toBeGreaterThanOrEqual(2);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
  await expect(page.locator("body")).not.toHaveClass(/weather-page/);
  await page.evaluate(() => document.fonts.ready);
  await testInfo.attach("weather-success-preview", {
    body: await page.screenshot({
      path: testInfo.outputPath(`${testInfo.project.name}-weather-success.png`),
      fullPage: true,
      animations: "disabled",
    }),
    contentType: "image/png",
  });
});

test("missing weather readings stay unavailable instead of becoming zero or a favorable forecast", async ({ page, context, baseURL }) => {
  const emptyReadings = readings => Object.fromEntries(Object.keys(readings).map(key => [key,
    key === "time" ? readings[key] : Array.isArray(readings[key]) ? readings[key].map(() => null) : null,
  ]));
  await mockWeather(context, baseURL, {
    forecastData: {
      ...forecast,
      current: emptyReadings(forecast.current),
      hourly: emptyReadings(forecast.hourly),
      daily: emptyReadings(forecast.daily),
    },
    airQualityData: {
      current: emptyReadings(airQuality.current),
      hourly: emptyReadings(airQuality.hourly),
    },
  });
  await openWeather(page);
  await expect(page.locator(".weather-widget")).toHaveAttribute("data-status", "updated_live");
  for (const selector of ["#windValue", "#humValue", "#pressureValue", "#precipValue"]) {
    await expect(page.locator(selector)).toHaveText("--");
  }
  await expect(page.locator("#uvValue")).toHaveText("k.A.");
  await expect(page.locator("#rainWindowValue")).toHaveText("Keine Daten");
  await expect(page.locator("#rainWindowHint")).toHaveText("");
  for (const selector of ["#respiratoryRisk", "#pollenRisk", "#heartRisk"]) {
    await expect(page.locator(selector)).toHaveAttribute("data-level", "unavailable");
  }
  await expect(page.locator("#healthTimeline [data-level='unavailable']")).toHaveCount(8);
  await expect(page.locator("#healthBestValue")).toHaveText("Keine Daten");
});

test("weather flow recovers from an API error using the refresh button", async ({ page, context, baseURL }) => {
  const requests = await mockWeather(context, baseURL, { failForecastOnce: true });
  await openWeather(page);
  await expect(page.locator(".weather-widget")).toHaveAttribute("data-status", "error");
  await expect(page.locator("#statusMsg")).toContainText("Wetter konnte nicht geladen werden.");
  const refresh = page.locator("#loadBtn");
  await expect(refresh).toBeEnabled();
  await refresh.click();
  await expect(page.locator(".weather-widget")).toHaveAttribute("data-status", "updated_live");
  await expect(page.locator("#statusMsg")).toContainText("Aktualisiert");
  await expect(page.locator("#tempNow")).toHaveText("18°");
  await expect(page.locator("#hourlyStrip .weather-hourly-chip")).toHaveCount(24);
  await expect(refresh).toBeEnabled();
  expect(requests.forecasts).toBe(2);
});


test("a newer city search stays busy when the previous request is aborted", async ({ page, context, baseURL }) => {
  const coordinates = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.hostname === "api.open-meteo.com") coordinates.push([url.searchParams.get("latitude"), url.searchParams.get("longitude")]);
  });
  await mockWeather(context, baseURL);
  await openWeather(page);
  await expect(page.locator(".weather-widget")).toHaveAttribute("data-status", "updated_live");
  const older = gate(), newer = gate(), olderStarted = gate(), newerStarted = gate();
  await page.route("https://geocoding-api.open-meteo.com/v1/search?*", async route => {
    const city = new URL(route.request().url()).searchParams.get("name");
    if (city !== "Berlin" && city !== "Hamburg") return route.fallback();
    (city === "Berlin" ? olderStarted : newerStarted).release();
    await (city === "Berlin" ? older : newer).ready;
    return route.fulfill({ headers: { "Access-Control-Allow-Origin": new URL(baseURL).origin }, json: { results: [{
      name: city, admin1: city, country: "Deutschland", latitude: city === "Berlin" ? 52.52 : 53.55, longitude: city === "Berlin" ? 13.405 : 9.99,
    }] } });
  });
  try {
    const search = page.getByRole("searchbox", { name: "Ort suchen", exact: true });
    await search.fill("Berlin");
    await search.press("Enter");
    await olderStarted.ready;
    const cancelled = page.waitForEvent("requestfailed", request => new URL(request.url()).searchParams.get("name") === "Berlin");
    await search.fill("Hamburg");
    await search.press("Enter");
    await newerStarted.ready;
    await cancelled;
    // Allow the aborted request's catch/finally to run before checking the UI.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator(".weather-widget-grid")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#loadBtn")).toBeDisabled();
    older.release();
    newer.release();
    await expect(page.locator("#cityName")).toHaveText("Hamburg");
    await expect(page.locator(".weather-widget-grid")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator("#loadBtn")).toBeEnabled();
    expect(coordinates).toEqual([["52.52", "13.405"], ["53.55", "9.99"]]);
  } finally {
    older.release();
    newer.release();
  }
});

test("former weather route opens Botanic and the last city survives reload", async ({ page, context, baseURL }) => {
  await mockWeather(context, baseURL);
  await page.goto("/wetter/");
  await expect(page).toHaveURL(/\/botanic\/wetter\/$/);
  const search = page.getByRole("searchbox", { name: "Ort suchen", exact: true });
  await search.fill("Berlin");
  await search.press("Enter");
  await expect(page.locator("#cityName")).toHaveText("Berlin");
  await expect(page.locator(".weather-page-quickpicks")).toContainText("Berlin");
  await page.reload();
  await expect(search).toHaveValue("Berlin");
  await expect(page.locator("#tempNow")).toHaveText("18°");
  await expect(page.locator("#cityName")).toHaveText("Berlin");
});


test("Botanic weather fits small phones, tablets and narrow desktops", async ({ page, context, baseURL }) => {
  await mockWeather(context, baseURL);
  for (const width of [320, 900, 1380, 1660]) {
    await page.setViewportSize({ width, height: 900 });
    await openWeather(page);
    await expect(page.locator("#tempNow")).toHaveText("18°");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    const rect = await page.locator("#loadBtn").boundingBox();
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1);
    await expect(page.getByRole("navigation", { name: "Botanic", exact: true })).toBeVisible();
  }
});
