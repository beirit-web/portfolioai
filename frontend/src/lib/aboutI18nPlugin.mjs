import { readFile } from "node:fs/promises";
import path from "node:path";

const prefix = "virtual:about-i18n/";
const languages = ["de", "ru", "uk"];

// Keep the page's translations in sync with the canonical locales without
// sending project records, services and contact form copy to the browser.
export function aboutI18nPlugin() {
  let localesDirectory;
  return {
    name: "about-route-translations",
    configResolved(config) {
      localesDirectory = path.resolve(config.root, "src/i18n/locales");
    },
    resolveId(id) {
      if (id.startsWith(prefix) && languages.includes(id.slice(prefix.length))) return `\0${id}`;
      return null;
    },
    async load(id) {
      if (!id.startsWith(`\0${prefix}`)) return null;
      const language = id.slice(prefix.length + 1);
      if (!languages.includes(language)) return null;
      const file = path.join(localesDirectory, `${language}.json`);
      this.addWatchFile(file);
      const locale = JSON.parse(await readFile(file, "utf8"));
      return `export default ${JSON.stringify({
        nav: locale.nav,
        footer: locale.footer,
        home: {
          hero: { eyebrow: locale.home.hero.eyebrow },
          about: { title: locale.home.about.title },
          tech: { stackAria: locale.home.tech.stackAria },
        },
      })};`;
    },
  };
}
