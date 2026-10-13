import * as lucideIcons from "lucide-react";
import { featureIconRules, featureIllustrations } from "../components/home/portfolio/featurePresentation.mjs";
import { illustrationImageSrc } from "../components/shared/cardIllustrations.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PROJECT_COVERS, PROJECT_OVERVIEW_IMAGE_SIZES, projectDetailImage, projectScreenshotImages, portfolioSlugFor } from "../components/home/portfolio/portfolioPresentation.mjs";
import { languageServicesCaseStudy } from "../components/home/portfolio/languageServicesCaseStudy.mjs";
import { projectModuleActions } from "../components/projects/projectModuleActions.mjs";
import { PROJECTS_OVERVIEW_COPY } from "../components/projects/projectsCopy.mjs";
import { technicalGlossary } from "../components/shared/technicalGlossary.mjs";
import { TECHNOLOGIES } from "../components/shared/technologyLogos.mjs";

const virtualPrefix = "virtual:projects-i18n/";
const internalPrefix = `\0${virtualPrefix}`;
const languages = new Set(["de", "ru", "uk"]);
const overviewFields = [
  "slug", "title", "text", "overviewText", "type", "status", "category", "href", "liveUrl",
  "localHref", "images", "technologies", "tags", "published", "sortOrder", "orderIndex",
];

export function selectProjectOverviewRecord(item) {
  const record = Object.fromEntries(overviewFields
    .filter(key => Object.hasOwn(item, key))
    .map(key => [key, item[key]]));
  return { ...record, slug: portfolioSlugFor(item) };
}

// Both rendering paths share copy with the complete application. Generate the
// overview subset from canonical locales instead of maintaining another file.
export function selectProjectsTranslations(locale) {
  return {
    nav: locale.nav,
    footer: locale.footer,
    home: {
      hero: { eyebrow: locale.home.hero.eyebrow },
      portfolio: { items: locale.home.portfolio.items.map(selectProjectOverviewRecord) },
    },
  };
}

export function createProjectsPresentationCatalog(locales) {
  return {
    schemaVersion: 1,
    imageSizes: PROJECT_OVERVIEW_IMAGE_SIZES,
    covers: PROJECT_COVERS,
    detailImages: Object.fromEntries(Object.keys(PROJECT_COVERS).map(slug => [slug, {
      hero: projectDetailImage({ slug }), screenshots: projectScreenshotImages({ slug }),
    }])),
    featureRules: featureIconRules.map(rule => ({ icon: rule.icon,
      patterns: rule.patterns.map(pattern => ({ pattern: pattern.source, flags: pattern.flags })),
    })),
    featureIllustrations: Object.fromEntries(Object.entries(featureIllustrations).map(([icon, name]) => [icon, illustrationImageSrc(name, "feature")])),
    // Forward-ref render returns only the SVG description; it does not mount an
    // icon or run hooks. Store vector primitives, not executable HTML.
    featureIconNodes: Object.fromEntries(featureIconRules.map(rule => rule.icon).concat("Star", "CheckCircle2")
      .filter(name => lucideIcons[name]).map(name => [name, lucideIcons[name].render({}, null).props.iconNode])),
    technologies: TECHNOLOGIES.map(([name, logo, aliases = []], rank) => ({
      name, logo: logo || null, aliases, rank,
    })),
    glossary: Object.fromEntries(Object.entries(technicalGlossary).map(([language, entries]) => [
      language,
      entries.map(({ pattern, text }) => ({ pattern: pattern.source, flags: pattern.flags, text })),
    ])),
    locales: Object.fromEntries([...languages].map(language => {
      const locale = locales[language];
      const subset = selectProjectsTranslations(locale);
      return [language, {
        nav: subset.nav,
        footer: subset.footer,
        brand: subset.home.hero.eyebrow,
        copy: PROJECTS_OVERVIEW_COPY[language],
        items: subset.home.portfolio.items,
        detail: {
          modules: Object.fromEntries(Object.keys(PROJECT_COVERS).map(slug => [slug, projectModuleActions(slug, language)])),
          copy: Object.fromEntries(Object.entries(locale.home.portfolio).filter(([key, value]) => key !== "items" && typeof value === "string")),
          items: locale.home.portfolio.items.map(item => ({ ...item, slug: portfolioSlugFor(item) })),
        },
      }];
    })),
    projectOverrides: {
      sprachdienstleistungen: Object.fromEntries([...languages].map(language => [
        language, languageServicesCaseStudy({ slug: "sprachdienstleistungen" }, language),
      ])),
    },
  };
}

export function projectsI18nPlugin() {
  let localesDirectory;
  const localePathFor = language => path.join(localesDirectory, `${language}.json`);
  const loadLocale = async language => JSON.parse(await readFile(localePathFor(language), "utf8"));

  return {
    name: "projects-route-translations",
    configResolved(config) {
      localesDirectory = path.resolve(config.root, "src/i18n/locales");
    },
    buildStart() {
      for (const language of languages) this.addWatchFile(localePathFor(language));
    },
    resolveId(id) {
      if (!id.startsWith(virtualPrefix)) return null;
      const language = id.slice(virtualPrefix.length);
      return languages.has(language) ? `${internalPrefix}${language}` : null;
    },
    async load(id) {
      if (!id.startsWith(internalPrefix)) return null;
      const language = id.slice(internalPrefix.length);
      if (!languages.has(language)) return null;
      this.addWatchFile(localePathFor(language));
      return `export default ${JSON.stringify(selectProjectsTranslations(await loadLocale(language)))};`;
    },
    async generateBundle() {
      const locales = Object.fromEntries(await Promise.all([...languages].map(async language => [
        language, await loadLocale(language),
      ])));
      this.emitFile({
        type: "asset",
        fileName: ".vite/projects-presentation.json",
        source: JSON.stringify(createProjectsPresentationCatalog(locales)),
      });
    },
  };
}
