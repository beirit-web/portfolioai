import { isTechnologyLabel, sortTechnologyLabels } from "../../shared/technologyLogos.mjs";

// Cover files follow one naming convention and share the same square dimensions.
const PROJECT_COVERS = Object.fromEntries([
  "sprachdienstleistungen",
  "online-shop",
  "vertragsgenerator",
  "wohnungssuche-bodensee",
  "notenrechner",
  "enbt-botanic",
].map((slug) => [slug, {
  src: `/static/images/portfolio-covers/${slug}-cover-v1.webp`,
  label: "Cover",
  variant: "cover",
  width: 1254,
  height: 1254,
}]));

const TECHNOLOGY_NAMES = /\bReact\b|\bVite\b|\bDjango\b|\bPython\b|\bJavaScript\b|\bHTML\b|\bCSS\b/i;

export function portfolioSlugFor(item) {
  if (item?.slug) return String(item.slug);
  const title = String(item?.title || "").toLowerCase();
  const href = String(item?.href || "").toLowerCase();
  const imageSources = (item?.images || []).map((image) => String(image?.src || "").toLowerCase()).join(" ");
  if (title.includes("deutschlive")) return "deutschlive";
  if (title.includes("sprachdienstleistungen") || title.includes("языковых услуг") || href.includes("sprachdienstleistungen") || imageSources.includes("sprachdienstleistungen")) return "sprachdienstleistungen";
  if (title.includes("online-shop") || href.includes("online-shop") || imageSources.includes("online-shop")) return "online-shop";
  if (title.includes("wohnungssuche")) return "wohnungssuche-bodensee";
  if (title.includes("wetter") || title.includes("погода")) return "wetter";
  if (title.includes("vertragsgenerator") || title.includes("генератор")) return "vertragsgenerator";
  if (title.includes("optimierung") || title.includes("оптимизация")) return "webseiten-optimierung";
  if (title.includes("websystem") || title.includes("веб-система")) return "individuelles-websystem";
  if (imageSources.includes("portfolio-test-main")) return "notenrechner";
  if (imageSources.includes("portfolio-musikplayer")) return "musikplayer";
  if (imageSources.includes("portfolio-vokabelbox")) return "vokabelbox";
  if (imageSources.includes("portfolio-enbt-botanic")) return "enbt-botanic";
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "projekt";
}

export function portfolioProjectPath(item) {
  return `/projekte/${portfolioSlugFor(item)}`;
}

export function isProjectPublished(item) {
  return item?.published !== false && !["vokabelbox", "wetter", "musikplayer", "deutschlive"].includes(portfolioSlugFor(item));
}

export function selectCarouselProjects(items, limit = 6) {
  const candidates = items.filter(item => isProjectPublished(item) && item.images?.[0]);
  const selected = candidates.filter(item => item.featured === true).slice(0, limit);
  const slugs = new Set(selected.map(portfolioSlugFor));
  const coveredTechnologies = new Set(selected.flatMap(projectTechnologyTags));
  const remaining = candidates.filter(item => !slugs.has(portfolioSlugFor(item)));

  while (selected.length < limit && remaining.length) {
    // Add the project that demonstrates the most technologies not yet shown.
    let bestIndex = 0;
    let bestScore = -1;
    remaining.forEach((item, index) => {
      const score = projectTechnologyTags(item).filter(name => !coveredTechnologies.has(name)).length;
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
    const [item] = remaining.splice(bestIndex, 1);
    selected.push(item);
    projectTechnologyTags(item).forEach(name => coveredTechnologies.add(name));
  }
  return selected;
}

export function projectTechnologyTags(item) {
  const source = item.technologies ?? item.tags ?? [];
  const entries = Array.isArray(source) ? source : String(source).split(/[,;\n]/);
  return sortTechnologyLabels(entries.flatMap(entry => featureLabel(entry).split("/")));
}

export function normalizeApiProject(project, localizedItem) {
  if (!project || typeof project !== "object") return null;
  const title = String(project.title || "").trim();
  if (!title) return null;
  const image = project.image || project.images?.[0]?.src || "";
  return {
    ...project,
    title,
    text: project.text || project.shortDescription || project.description || "",
    type: localizedItem?.type || project.type || project.category || "Portfolio-Projekt",
    category: project.category || "Weitere",
    status: project.status || project.statusLabel || "",
    liveUrl: project.liveUrl || project.href || "",
    href: project.href || project.liveUrl || "",
    githubHref: project.githubUrl || project.githubHref || "",
    carouselImage: project.carouselImage || localizedItem?.carouselImage,
    images: project.images?.length
      ? project.images
      : image
        ? [{ src: image, label: project.imageAlt || "Vorschau" }]
        : [],
    technologies: project.technologies ?? project.tags ?? localizedItem?.technologies ?? localizedItem?.tags ?? [],
    features: project.features?.length ? project.features : project.technologies || project.tags || [],
    tags: project.tags?.length ? project.tags : project.technologies || [],
    published: project.published !== false,
    featured: project.featured === true,
    sortOrder: Number.isFinite(project.sortOrder) ? project.sortOrder : 100,
  };
}

export function featureLabel(item) {
  if (item && typeof item === "object") return String(item.title || item.label || "").trim();
  return String(item || "").trim();
}

export function projectCoverImage(item) {
  return PROJECT_COVERS[portfolioSlugFor(item)];
}

export function projectPreviewImage(item) {
  return projectCoverImage(item) || item.images?.[0];
}

export function projectCarouselImage(item) {
  return item.carouselImage
    || projectCoverImage(item)
    || item.images?.find((image) => image.label === "Mobile")
    || item.images?.[0];
}

export function projectCapabilityLabels(item, limit = 3) {
  const labels = (item.features || []).map(featureLabel)
    .filter((label) => label && !isTechnologyLabel(label) && !TECHNOLOGY_NAMES.test(label));
  return [...new Set(labels)].slice(0, limit);
}
