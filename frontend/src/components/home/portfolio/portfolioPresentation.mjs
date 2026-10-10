import { isTechnologyLabel, sortTechnologyLabels } from "../../shared/technologyLogos.mjs";

// Cover files follow one naming convention and share the same square dimensions.
export const PROJECT_COVERS = Object.fromEntries([
  "sprachdienstleistungen",
  "online-shop",
  "vertragsgenerator",
  "wohnungssuche-bodensee",
  "notenrechner",
  "enbt-botanic",
].map((slug) => [slug, {
  src: `/static/images/portfolio-covers/${slug}-cover-v1.webp`,
  srcSet: [
    `/static/images/portfolio-covers/${slug}-cover-v1-480.webp 480w`,
    `/static/images/portfolio-covers/${slug}-cover-v1-768.webp 768w`,
    `/static/images/portfolio-covers/${slug}-cover-v1.webp 1254w`,
  ].join(", "),
  label: "Cover",
  variant: "cover",
  width: 1254,
  height: 1254,
}]));

export const PROJECT_OVERVIEW_IMAGE_SIZES = "(max-width: 47.99rem) calc(100vw - 2rem), (max-width: 74rem) calc((100vw - 4rem) / 2), calc((min(100vw, 92rem) - 7rem) / 3)";

// Match the single-column hero below 80rem and the wider detail grids above it.
export const PROJECT_DETAIL_IMAGE_SIZES = "(max-width: 39.99rem) calc(100vw - 1.5rem), (max-width: 63.99rem) calc(100vw - 4rem), (max-width: 79.99rem) calc(100vw - 5rem), (max-width: 89.99rem) calc((100vw - 7rem) * 0.54), (max-width: 109.99rem) calc((min(100vw, 94rem) - 8rem) * 0.58), 57.6rem";
const PROJECT_SCREENSHOT_SIZES = "(max-width: 600px) calc(100vw - 3.5rem), (max-width: 63.99rem) calc((100vw - 8rem) * 0.75), (max-width: 89.99rem) calc((min(100vw, 80rem) - 9.5rem) * 0.75), (max-width: 109.99rem) calc((min(100vw, 94rem) - 9.5rem) * 0.75), 70.875rem";

export function projectDetailImage(item) {
  const image = projectPreviewImage(item);
  if (!image?.srcSet || image.variant !== "cover") return image;
  return {
    ...image,
    srcSet: image.srcSet.replace(`${image.src} 1254w`, `${image.src.replace(".webp", "-960.webp")} 960w, ${image.src} 1254w`),
    sizes: PROJECT_DETAIL_IMAGE_SIZES,
  };
}

const TECHNOLOGY_NAMES = /\bReact\b|\bVite\b|\bDjango\b|\bPython\b|\bJavaScript\b|\bHTML\b|\bCSS\b/i;

export function projectScreenshotImages(item) {
  const slug = portfolioSlugFor(item);
  if (!PROJECT_COVERS[slug]) return (item.images || []).filter(image => image.variant !== "cover");
  return [
    {
      src: `/static/images/portfolio-previews/${slug}-desktop.webp`,
      srcSet: [480, 768, 960].map(width => `/static/images/portfolio-previews/${slug}-desktop-${width}.webp ${width}w`).concat(`/static/images/portfolio-previews/${slug}-desktop.webp 1440w`).join(", "),
      sizes: `auto, ${PROJECT_SCREENSHOT_SIZES}`,
      label: "Desktop", width: 1440, height: 1000,
    },
    {
      src: `/static/images/portfolio-previews/${slug}-mobile.webp`,
      srcSet: `/static/images/portfolio-previews/${slug}-mobile-256.webp 256w, /static/images/portfolio-previews/${slug}-mobile.webp 390w`,
      sizes: "auto, (max-width: 600px) 16rem, (max-width: 89.99rem) calc((min(100vw, 80rem) - 9.5rem) / 4), 24rem",
      label: "Mobile", width: 390, height: slug === "online-shop" ? 764 : 844,
    },
  ];
}

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

export function sortedPortfolioItems(items) {
  return [...items]
    .filter(isProjectPublished)
    .sort((first, second) => {
      const firstOrder = Number.isFinite(first.sortOrder) ? first.sortOrder : Number.MAX_SAFE_INTEGER;
      const secondOrder = Number.isFinite(second.sortOrder) ? second.sortOrder : Number.MAX_SAFE_INTEGER;
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      // Preserve the server's order for tied records, including localized titles.
      if (Number.isFinite(first.orderIndex) && Number.isFinite(second.orderIndex)) return first.orderIndex - second.orderIndex;
      return String(first.title || "").localeCompare(String(second.title || ""), "de");
    });
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

export function normalizeApiProject(project, localizedItem, { useLocalizedContent = false } = {}) {
  if (!project || typeof project !== "object") return null;
  const title = String(project.title || "").trim();
  if (!title) return null;
  const image = project.image || project.images?.[0]?.src || "";
  return {
    ...localizedItem,
    ...project,
    title: useLocalizedContent && localizedItem ? localizedItem.title : title,
    text: useLocalizedContent && localizedItem ? localizedItem.text : project.text || project.shortDescription || project.description || "",
    situation: useLocalizedContent && localizedItem ? localizedItem.situation : project.situation || localizedItem?.situation,
    implementation: useLocalizedContent && localizedItem ? localizedItem.implementation : project.implementation || localizedItem?.implementation,
    result: useLocalizedContent && localizedItem ? localizedItem.result : project.result || localizedItem?.result,
    technicalDecision: project.technicalDecision || localizedItem?.technicalDecision,
    type: localizedItem?.type || project.type || project.category || "Portfolio-Projekt",
    category: project.category || "Weitere",
    status: useLocalizedContent && localizedItem ? localizedItem.status : project.status || project.statusLabel || "",
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
    features: useLocalizedContent && localizedItem ? localizedItem.features : project.features?.length ? project.features : localizedItem?.features || project.technologies || project.tags || [],
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
