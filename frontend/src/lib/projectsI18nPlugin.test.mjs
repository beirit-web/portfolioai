import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createProjectsPresentationCatalog, projectsI18nPlugin, selectProjectsTranslations } from "./projectsI18nPlugin.mjs";
import { languageServicesCaseStudy } from "../components/home/portfolio/languageServicesCaseStudy.mjs";
import { normalizeApiProject, portfolioProjectPath, portfolioSlugFor, projectPreviewImage, projectTechnologyTags, sortedPortfolioItems } from "../components/home/portfolio/portfolioPresentation.mjs";
import { technicalGlossary } from "../components/shared/technicalGlossary.mjs";
import { technologyLogoSrc } from "../components/shared/technologyLogos.mjs";
import { fileURLToPath } from "node:url";

const runtimeSource = await readFile(new URL("../i18n/runtime.js", import.meta.url), "utf8");
const { createTranslationStore } = await import(`data:text/javascript;base64,${Buffer.from(runtimeSource).toString("base64")}`);

async function loadLocale(language) {
  return JSON.parse(await readFile(new URL(`../i18n/locales/${language}.json`, import.meta.url), "utf8"));
}

function overviewSnapshots(items, language) {
  return sortedPortfolioItems(items.map(item => languageServicesCaseStudy(item, language))).map(item => ({
    slug: portfolioSlugFor(item),
    title: item.title,
    text: item.overviewText || item.text,
    type: item.type,
    status: item.status,
    path: portfolioProjectPath(item),
    preview: projectPreviewImage(item),
    technologies: projectTechnologyTags(item),
    liveHref: item.category === "case" ? "" : item.liveUrl || item.href || item.localHref || "",
  }));
}

test("compact route translations preserve every language's fallback cards and shell copy", async () => {
  for (const language of ["de", "ru", "uk"]) {
    const locale = await loadLocale(language);
    const subset = selectProjectsTranslations(locale);
    const fullStore = createTranslationStore({ de: locale });
    const routeStore = createTranslationStore({ de: subset });
    for (const key of ["nav", "footer", "home.hero.eyebrow"]) {
      assert.deepEqual(routeStore.createTranslator("de")(key), fullStore.createTranslator("de")(key), `${language}: ${key}`);
    }
    assert.deepEqual(overviewSnapshots(subset.home.portfolio.items, language), overviewSnapshots(locale.home.portfolio.items, language));
    assert.equal(subset.home.services, undefined);
    assert.equal(subset.home.contact, undefined);
    assert.equal(subset.home.about, undefined);
    for (const item of subset.home.portfolio.items) {
      assert.equal(item.points, undefined);
      assert.equal(item.implementation, undefined);
      assert.equal(item.technicalDecision, undefined);
    }
    assert.ok(JSON.stringify(subset).length < JSON.stringify(locale).length * 0.2, `${language}: details and unrelated pages are excluded`);
  }
});

test("compact records preserve localized overview results when combined with API projects", async () => {
  const de = await loadLocale("de");
  const projects = de.home.portfolio.items.map((item, index) => ({
    slug: portfolioSlugFor(item),
    title: item.title,
    text: `API project ${index}`,
    type: "API type",
    category: item.category || "demo",
    href: item.href,
    images: item.images,
    technologies: item.technologies,
    published: item.published,
    sortOrder: item.sortOrder,
  }));
  for (const language of ["de", "ru", "uk"]) {
    const locale = await loadLocale(language);
    const subset = selectProjectsTranslations(locale);
    const normalizeWith = items => {
      const bySlug = new Map(items.map(item => [portfolioSlugFor(item), item]));
      return projects.map(project => normalizeApiProject(project, bySlug.get(project.slug), { useLocalizedContent: language !== "de" }));
    };
    assert.deepEqual(overviewSnapshots(normalizeWith(subset.home.portfolio.items), language), overviewSnapshots(normalizeWith(locale.home.portfolio.items), language));
  }
});

test("the shared translator retains language fallback, replacements, arrays and unknown keys", () => {
  const store = createTranslationStore({
    de: { nav: { home: "Start", greeting: "Hallo {name}, {name}" }, items: ["Beispiel"] },
    ru: { nav: { home: "Главная" } },
  });
  const t = store.createTranslator("ru-RU");
  assert.equal(t("nav.home"), "Главная");
  assert.equal(t("nav.greeting", { name: "Eugen" }), "Hallo Eugen, Eugen");
  assert.deepEqual(t("items"), ["Beispiel"]);
  assert.equal(t("unknown.key"), "unknown.key");
  assert.equal(store.createTranslator("en-US")("nav.home"), "Start");
});

test("concurrent language requests share one load and expose translated route copy", async () => {
  let loads = 0;
  const store = createTranslationStore({ de: { nav: { home: "Start" } } }, {
    uk: async () => {
      loads += 1;
      return { default: { nav: { home: "Головна" } } };
    },
  });
  assert.equal(store.isLanguageLoaded("uk"), false);
  const first = store.ensureLanguage("uk-UA");
  const second = store.ensureLanguage("uk");
  assert.equal(first, second);
  await first;
  assert.equal(loads, 1);
  assert.equal(store.isLanguageLoaded("uk"), true);
  assert.equal(store.createTranslator("uk")("nav.home"), "Головна");
});

test("the emitted presentation catalog retains canonical image, technology and glossary behavior", async () => {
  const locales = Object.fromEntries(await Promise.all(["de", "ru", "uk"].map(async language => [language, await loadLocale(language)])));
  const catalog = JSON.parse(JSON.stringify(createProjectsPresentationCatalog(locales)));
  assert.equal(catalog.schemaVersion, 1);
  assert.deepEqual(Object.keys(catalog.locales), ["de", "ru", "uk"]);
  assert.equal(catalog.locales.de.brand, locales.de.home.hero.eyebrow);
  assert.equal(catalog.locales.de.copy.details, "Projektbericht");
  assert.equal(catalog.locales.ru.copy.details, "Отчёт о проекте");
  assert.equal(catalog.locales.uk.copy.details, "Звіт про проєкт");
  for (const item of locales.de.home.portfolio.items) {
    const slug = portfolioSlugFor(item);
    if (catalog.covers[slug]) assert.deepEqual(catalog.covers[slug], projectPreviewImage(item));
  }
  for (const { name, logo, aliases, rank } of catalog.technologies) {
    assert.ok(Number.isInteger(rank));
    for (const label of [name, ...aliases]) {
      assert.equal(technologyLogoSrc(label), logo ? `/static/images/${logo}` : null);
    }
  }
  for (const [language, entries] of Object.entries(catalog.glossary)) {
    for (const term of ["React + Django", "Python", "responsive", "Fullstack", "ENBT Botanic"]) {
      const projected = entries.find(entry => new RegExp(entry.pattern, entry.flags).test(term))?.text;
      const original = technicalGlossary[language].find(entry => entry.pattern.test(term))?.text;
      assert.equal(projected, original);
    }
  }
  assert.equal(catalog.projectOverrides.sprachdienstleistungen.de.status, "Portfolio-Fallstudie");
  assert.equal(catalog.projectOverrides.sprachdienstleistungen.ru.status, "Портфолио-кейс");
  assert.equal(catalog.projectOverrides.sprachdienstleistungen.uk.status, "Кейс портфоліо");
  for (const language of ["de", "ru", "uk"]) {
    assert.equal(catalog.projectOverrides.sprachdienstleistungen[language].href, "/deutschlive/");
    assert.equal(catalog.projectOverrides.sprachdienstleistungen[language].showContactCta, false);
    assert.deepEqual(catalog.locales[language].detail.modules.sprachdienstleistungen.map(module => [module.id, module.href, module.external]), [
      ["deutschlive", "/deutschlive/", true],
      ["vokabelbox", "/vokabelbox/", true],
      ["musikplayer", "/deutschlive/recordings", true],
    ]);
    assert.equal(catalog.locales[language].detail.modules["enbt-botanic"][0].href, "/botanic/wetter/");
    assert.equal(catalog.locales[language].detail.modules["enbt-botanic"][0].publicPage, true);
  }
});

test("the build plugin emits the catalog at its stable backend-consumable path", async () => {
  const plugin = projectsI18nPlugin();
  plugin.configResolved({ root: fileURLToPath(new URL("../..", import.meta.url)) });
  const emitted = [];
  await plugin.generateBundle.call({ emitFile: asset => emitted.push(asset) });
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].fileName, ".vite/projects-presentation.json");
  assert.equal(JSON.parse(emitted[0].source).schemaVersion, 1);
});
