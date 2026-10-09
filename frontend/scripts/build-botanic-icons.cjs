const fs = require("node:fs");
const path = require("node:path");
const lucide = require("lucide-react");

const icons = { sprout: "Sprout", search: "Search", plants: "Flower2", calendar: "CalendarDays", weather: "CloudSun",
  droplet: "Droplet", plus: "Plus", check: "Check", clock: "Clock3", pause: "Pause", user: "UserRound",
  arrow: "ArrowUpRight", back: "ArrowLeft", next: "ChevronRight", previous: "ChevronLeft",
  edit: "Pencil", trash: "Trash2", x: "X", alert: "CircleAlert", pin: "MapPin", log: "History", save: "Save" };
const escape = value => String(value).replace(/[&"<>]/g, character => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[character]);
const symbols = Object.entries(icons).map(([name, exportName]) => {
  const nodes = lucide[exportName].render({}, null).props.iconNode;
  const markup = nodes.map(([tag, attributes]) => `<${tag} ${Object.entries(attributes).filter(([key]) => key !== "key").map(([key, value]) => `${key}="${escape(value)}"`).join(" ")}/>`).join("");
  return `<symbol id="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${markup}</symbol>`;
});
const destination = path.resolve(__dirname, "../../server/botanic/static/botanic/icons.svg");
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join("\n")}\n</svg>\n`);
console.log(`Generated ${symbols.length} Lucide icons for Botanic.`);
