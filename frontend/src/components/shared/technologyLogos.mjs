// Order: languages, frameworks, presentation, databases, tools, external APIs.
const TECHNOLOGIES = [
  ["Python", "python.svg"],
  ["JavaScript", "js.svg", ["JS"]],
  ["TypeScript", "ts.svg", ["TS"]],
  ["React", "react.svg"],
  ["Django", "django.svg"],
  ["Django REST Framework"],
  ["Node.js", "nodejs.svg", ["Node"]],
  ["Express", "express.svg", ["Express.js"]],
  ["HTML", "html-5.svg", ["HTML5"]],
  ["CSS", "css-3.svg", ["CSS3"]],
  ["Tailwind CSS", "tailwindcss.svg", ["Tailwind"]],
  ["Bootstrap", "bootstrap.svg"],
  ["Sass", "sass.svg", ["SCSS"]],
  ["SQLite", "sqlite.svg"],
  ["PostgreSQL"],
  ["MySQL", "mysql.svg"],
  ["MongoDB", "mongodb.svg"],
  ["Mongoose", "mongoose.svg"],
  ["Vite", "vitejs.svg", ["Vite.js"]],
  ["Postman", "postman.svg"],
  ["Vercel", "vercel.svg"],
  ["iNaturalist API", "inaturalist.svg", ["iNaturalist"]],
  ["Open-Meteo API", null, ["Open-Meteo"]],
  ["Web Audio API", null, ["Web Audio"]],
];

const technologyKey = label => String(label ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const namesByKey = new Map();
const ranks = new Map();

TECHNOLOGIES.forEach(([label, , aliases = []], index) => {
  ranks.set(label, index);
  [label, ...aliases].forEach(alias => namesByKey.set(technologyKey(alias), label));
});

export const technologyLogos = Object.fromEntries(
  TECHNOLOGIES.filter(([, logo]) => logo).map(([label, logo]) => [label, logo]),
);

export function normalizeTechnologyLabel(label) {
  const clean = String(label ?? "").trim();
  return namesByKey.get(technologyKey(clean)) || clean;
}

export function isTechnologyLabel(label) {
  return namesByKey.has(technologyKey(label));
}

export function sortTechnologyLabels(labels) {
  return [...new Set(labels.map(normalizeTechnologyLabel).filter(Boolean))].sort((a, b) => (
    (ranks.get(a) ?? ranks.size) - (ranks.get(b) ?? ranks.size) || a.localeCompare(b)
  ));
}

export function technologyLogoSrc(label) {
  const filename = technologyLogos[normalizeTechnologyLabel(label)];
  return filename ? `/static/images/${filename}` : null;
}
