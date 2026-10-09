const fs = require("node:fs");
const path = require("node:path");
const lucide = require("lucide-react");

const icons = {
  "file-text": "FileText", "chevron-down": "ChevronDown", "download": "Download",
  "sliders-horizontal": "SlidersHorizontal", "check": "Check", "chevron-left": "ChevronLeft",
  "chevron-right": "ChevronRight", "eye": "Eye", "pen-line": "PenLine",
  "ellipsis": "Ellipsis", "copy": "Copy", "printer": "Printer", "upload": "Upload",
  "x": "X", "rotate-ccw": "RotateCcw", "plus": "Plus", "minus": "Minus",
  "shield-check": "ShieldCheck", "circle-check": "CircleCheck", "sparkles": "Sparkles",
  "trash-2": "Trash2", "arrow-up-right": "ArrowUpRight", "circle-alert": "CircleAlert",
};

const escapeAttribute = value => String(value).replace(/[&"<>]/g, character => ({
  "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;",
})[character]);

const symbols = Object.entries(icons).map(([name, exportName]) => {
  const nodes = lucide[exportName].render({}, null).props.iconNode;
  const markup = nodes.map(([tag, attributes]) => {
    const attrs = Object.entries(attributes).filter(([key]) => key !== "key")
      .map(([key, value]) => `${key}="${escapeAttribute(value)}"`).join(" ");
    return `<${tag} ${attrs}/>`;
  }).join("");
  return `<symbol id="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${markup}</symbol>`;
});

const destination = path.resolve(__dirname, "../../server/contracts/static/contracts/icons.svg");
fs.writeFileSync(destination, `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join("\n")}\n</svg>\n`);
console.log(`Generated ${symbols.length} Lucide icons for the contract editor.`);
