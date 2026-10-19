const fs = require("node:fs");
const path = require("node:path");
const { transformSync } = require("esbuild");
const server = path.resolve(__dirname, "../../server");
// Account copy and Django validation are rendered in the request language.
// No full portfolio dictionaries or locale fetches are needed on these pages.
const translationSource = 'window.TRANSLATIONS={de:{},ru:{},uk:{}};window.I18N_COMPLETE_LOCALES=["de","ru","uk"];';
for (const [input, output, loader] of [
  ["assets/css/account-pages.css", "assets/css/account-pages.min.css", "css"],
  ["assets/js/main.js", "assets/js/account-runtime.min.js", "js"],
]) {
  const transformed = transformSync(fs.readFileSync(path.join(server, input), "utf8"), { loader, minify: true, target: "es2020" });
  fs.writeFileSync(path.join(server, output), `/* Generated from ${input}; edit the source. */\n${transformed.code}`);
}
fs.writeFileSync(path.join(server, "assets/js/account-translations.min.js"), `// Account copy is rendered by Django.\n${translationSource}\n`);
console.log("Built account CSS, runtime and account locale configuration.");
