import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import {
  normalizeApiProject,
  portfolioProjectPath,
  projectCapabilityLabels,
  projectCarouselImage,
  projectPreviewImage,
  projectTechnologyTags,
  selectCarouselProjects,
} from "./portfolioPresentation.mjs";

const desktop = { src: "/desktop.webp", label: "Desktop" };
const mobile = { src: "/mobile.webp", label: "Mobile" };

test("technology-only metadata is not shown as a project capability", () => {
  assert.deepEqual(projectCapabilityLabels({ features: ["TypeScript", "SQLite", "iNaturalist API", "Quiz"] }), ["Quiz"]);
});

test("carousel fills available slots with projects that add different technologies", () => {
  const items = [
    { slug: "shop", featured: true, images: [desktop], technologies: ["Python", "Django"] },
    { slug: "similar", images: [desktop], technologies: ["Python", "Django"] },
    { slug: "react", images: [desktop], technologies: ["TypeScript", "React", "Vite"] },
    { slug: "draft", published: false, images: [desktop], technologies: ["MongoDB"] },
  ];
  assert.deepEqual(selectCarouselProjects(items, 2).map(item => item.slug), ["shop", "react"]);
  assert.deepEqual(selectCarouselProjects(items, 6).map(item => item.slug), ["shop", "react", "similar"]);
});

test("carousel technologies separate HTML and CSS and do not mislabel Vite as React", () => {
  assert.deepEqual(projectTechnologyTags({ tags: ["HTML/CSS", "JavaScript", "Vite"] }), ["JavaScript", "HTML", "CSS", "Vite"]);
  assert.deepEqual(projectTechnologyTags({ tags: ["React", "TypeScript", "Tailwind CSS", "Node.js"] }), ["TypeScript", "React", "Node.js", "Tailwind CSS"]);
});

test("API projects use localized purpose and mobile preview while preserving saved project content", () => {
  const project = normalizeApiProject({
    title: " Shop ",
    slug: "online-shop",
    type: "Django-Webanwendung",
    shortDescription: "Gespeicherte Bestellanfragen",
    liveUrl: "/shop/",
    images: [desktop],
    technologies: ["Django", "Python"],
  }, { type: "Online-Shop", carouselImage: mobile });

  assert.equal(project.type, "Online-Shop");
  assert.equal(project.title, "Shop");
  assert.equal(project.text, "Gespeicherte Bestellanfragen");
  assert.equal(project.liveUrl, "/shop/");
  assert.equal(portfolioProjectPath(project), "/projekte/online-shop");
  assert.equal(projectCarouselImage(project), mobile);
  assert.deepEqual(project.images, [desktop]);
  assert.deepEqual(projectTechnologyTags(project), ["Python", "Django"]);
});

test("an explicitly configured API carousel image takes priority over the localized preview", () => {
  const custom = { src: "/custom.png", label: "Mobile" };
  const project = normalizeApiProject({ title: "Shop", carouselImage: custom }, { carouselImage: mobile });
  assert.equal(projectCarouselImage(project), custom);
});

test("known projects share cover artwork across previews and carousel while preserving source screenshots", () => {
  const project = normalizeApiProject({ title: "Shop", slug: "online-shop", images: [desktop] });
  const cover = projectCarouselImage(project);
  assert.equal(cover.variant, "cover");
  assert.ok(cover.src.endsWith("/online-shop-cover-v1.webp"));
  assert.equal(projectPreviewImage(project), cover);
  assert.deepEqual(project.images, [desktop]);
});

test("projects without a dedicated carousel image prefer mobile, then the first gallery image", () => {
  assert.equal(projectPreviewImage({ images: [desktop, mobile] }), desktop);
  assert.equal(projectCarouselImage({ images: [desktop, mobile] }), mobile);
  assert.equal(projectCarouselImage({ images: [desktop] }), desktop);
  assert.equal(projectCarouselImage({ images: [] }), undefined);
});

test("invalid API entries are excluded and new projects retain their own purpose", () => {
  assert.equal(normalizeApiProject(null), null);
  assert.equal(normalizeApiProject({ title: " " }), null);
  assert.equal(normalizeApiProject({ title: "Neu", category: "Planung" }).type, "Planung");
});

test("capabilities accept mixed feature formats, exclude technology names and avoid duplicate labels", () => {
  const project = { features: [
    "Django-Templates",
    { title: "Warenkorb" },
    { label: "Login" },
    "Warenkorb",
    "Bestellanfragen",
    "Admin-Verwaltung",
    "",
  ] };
  assert.deepEqual(projectCapabilityLabels(project), ["Warenkorb", "Login", "Bestellanfragen"]);
});

test("all supported languages provide card labels and existing cover artwork for projects with screenshots", () => {
  const languages = ["de", "ru", "uk"].map((language) => JSON.parse(readFileSync(
    new URL(`../../../i18n/locales/${language}.json`, import.meta.url), "utf8",
  )));
  const keys = Object.keys(languages[0].home.portfolio.card).sort();
  for (const locale of languages) {
    assert.deepEqual(Object.keys(locale.home.portfolio.card).sort(), keys);
    for (const project of locale.home.portfolio.items.filter((item) => item.images?.length)) {
      const image = projectCarouselImage(project);
      assert.equal(image.variant, "cover");
      assert.ok(image.width > 0 && image.height === image.width);
      assert.ok(existsSync(new URL(`../../../../../server/assets/${image.src.slice(8)}`, import.meta.url)), image.src);
    }
  }
});

test("Vokabelbox is part of the language platform and never a standalone published project", async () => {
  const { isProjectPublished, portfolioSlugFor } = await import("./portfolioPresentation.mjs");
  assert.equal(isProjectPublished({ title: "Vokabelbox", slug: "vokabelbox", published: true }), false);
  assert.equal(isProjectPublished({ title: "Vokabelbox", images: [{ src: "/static/images/portfolio-vokabelbox-main-desktop.webp" }] }), false);
  for (const language of ["de", "ru", "uk"]) {
    const locale = JSON.parse(readFileSync(new URL(`../../../i18n/locales/${language}.json`, import.meta.url), "utf8"));
    assert.ok(locale.home.portfolio.items.every(item => portfolioSlugFor(item) !== "vokabelbox"));
    const platform = locale.home.portfolio.items.find(item => portfolioSlugFor(item) === "sprachdienstleistungen");
    assert.match(platform.text, /Vokabelbox/);
    assert.match(JSON.stringify(platform.features), /Vokabelbox/);
  }
});

test("weather is integrated into Botanic in every portfolio language", async () => {
  const { isProjectPublished, portfolioSlugFor } = await import("./portfolioPresentation.mjs");
  assert.equal(isProjectPublished({ slug: "wetter", published: true }), false);
  assert.equal(isProjectPublished({ title: "Wetter", published: true }), false);
  assert.equal(isProjectPublished({ slug: "enbt-botanic", published: true }), true);
  for (const language of ["de", "ru", "uk"]) {
    const locale = JSON.parse(readFileSync(new URL(`../../../i18n/locales/${language}.json`, import.meta.url), "utf8"));
    assert.equal(locale.home.portfolio.items.some(item => portfolioSlugFor(item) === "wetter"), false);
    const botanic = locale.home.portfolio.items.find(item => portfolioSlugFor(item) === "enbt-botanic");
    assert.ok(botanic.features.some(feature => feature.includes("Open-Meteo")));
  }
});

test("DeutschLive and its music player belong to the language platform in every language", async () => {
  const { isProjectPublished, portfolioSlugFor } = await import("./portfolioPresentation.mjs");
  assert.equal(isProjectPublished({ slug: "musikplayer", published: true }), false);
  assert.equal(isProjectPublished({ slug: "deutschlive", published: true }), false);
  for (const language of ["de", "ru", "uk"]) {
    const locale = JSON.parse(readFileSync(new URL(`../../../i18n/locales/${language}.json`, import.meta.url), "utf8"));
    assert.equal(locale.home.portfolio.items.some(item => portfolioSlugFor(item) === "musikplayer"), false);
    const platform = locale.home.portfolio.items.find(item => portfolioSlugFor(item) === "sprachdienstleistungen");
    assert.ok(platform.evidence.some(item => item.includes("/deutschlive/recordings")));
  }
});

test("technology labels come from explicit metadata, not descriptions or capabilities", () => {
  assert.deepEqual(projectTechnologyTags({ type: "React-Demo", features: ["Django", "Open-Meteo"], technologies: ["Python", "HTML/CSS", "SQLite"] }), ["Python", "HTML", "CSS", "SQLite"]);
  assert.deepEqual(projectTechnologyTags({ technologies: "Vite, React, JS, React, PostgreSQL" }), ["JavaScript", "React", "PostgreSQL", "Vite"]);
});
