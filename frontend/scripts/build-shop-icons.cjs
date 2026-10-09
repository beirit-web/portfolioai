const fs = require("node:fs");
const path = require("node:path");
const lucide = require("lucide-react");
const icons = { cake: "CakeSlice", bag: "ShoppingBag", search: "Search", user: "UserRound", plus: "Plus", minus: "Minus", check: "Check", trash: "Trash2", clock: "Clock3", filter: "SlidersHorizontal", back: "ArrowLeft", next: "ChevronRight", previous: "ChevronLeft", arrow: "ArrowUpRight", alert: "CircleAlert", send: "Send", receipt: "ReceiptText" };
const escape = value => String(value).replace(/[&"<>]/g, character => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[character]);
const symbols = Object.entries(icons).map(([name, exportName]) => {
  const markup = lucide[exportName].render({}, null).props.iconNode.map(([tag, attributes]) => `<${tag} ${Object.entries(attributes).filter(([key]) => key !== "key").map(([key, value]) => `${key}="${escape(value)}"`).join(" ")}/>`).join("");
  return `<symbol id="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${markup}</symbol>`;
});
const destination = path.resolve(__dirname, "../../server/shop/static/shop/icons.svg");
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join("\n")}\n</svg>\n`);
console.log(`Generated ${symbols.length} shop icons.`);
