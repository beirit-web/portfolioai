const fs = require("node:fs");
const path = require("node:path");
const lucide = require("lucide-react");

const ATTRIBUTE_ESCAPES = { "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" };
const escapeAttribute = value => String(value).replace(/[&"<>]/g, character => ATTRIBUTE_ESCAPES[character]);

function buildIconSprite({ icons, app, description }) {
  const symbols = Object.entries(icons).map(([name, exportName]) => {
    const nodes = lucide[exportName].render({}, null).props.iconNode;
    const markup = nodes.map(([tag, attributes]) => {
      const attrs = Object.entries(attributes).filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${escapeAttribute(value)}"`).join(" ");
      return `<${tag} ${attrs}/>`;
    }).join("");
    return `<symbol id="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${markup}</symbol>`;
  });

  const destination = path.resolve(__dirname, "../../../server", app, "static", app, "icons.svg");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join("\n")}\n</svg>\n`);
  console.log(`Generated ${symbols.length} ${description}`);
}

module.exports = buildIconSprite;
