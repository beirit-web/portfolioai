import assert from "node:assert/strict";
import test from "node:test";
import postcss from "postcss";
import projectsCssFilter, { filterProjectsSelector } from "./projectsCssFilter.mjs";

test("keeps route utilities, interactive states, variants and global selectors", () => {
  for (const selector of [
    "html.page-is-loaded body", "main > section", "*::before",
    ".sm\\:px-8", ".bg-\\[\\#f7f6f2\\]",
    ".project-overview-card--future-project .project-overview-card__button",
    ".site-mobile-menu-panel__link.is-active", ".footer-link--scroll-top.is-visible",
    ".home-main .info-tooltip__trigger[aria-expanded=\"true\"]",
  ]) assert.equal(filterProjectsSelector(selector), selector);
});

test("drops absent required classes and IDs without deleting matching list branches", () => {
  assert.equal(filterProjectsSelector(".site-shell--home .project-grid"), "");
  assert.equal(filterProjectsSelector("#kontakt .site-shell"), "");
  assert.equal(filterProjectsSelector(".service-card, .project-grid"), " .project-grid");
});

test("negative selectors do not require their excluded class or ID", () => {
  for (const selector of [
    "main > section:not(.hero-stage)", ".page-hero p:not(.eyebrow)",
    ".site-shell:not(:has(#kontakt))", "body:not(.site-shell--home,.service-card)",
  ]) assert.equal(filterProjectsSelector(selector), selector);
});

test("where prunes only impossible branches, including nested positive selectors", () => {
  assert.equal(filterProjectsSelector(".site-shell :where(.service-card,.project-grid)"), ".site-shell :where(.project-grid)");
  assert.equal(filterProjectsSelector(":where(.service-card,:where(.price-grid,.project-grid))"), ":where(:where(.project-grid))");
  assert.equal(filterProjectsSelector(".site-shell :where(.service-card,.price-grid)"), "");
});

test("is and has preserve specificity contributed by impossible alternatives", () => {
  for (const selector of [
    ".site-shell :is(.project-grid,#kontakt)",
    ".site-shell:has(.project-grid,#kontakt)",
    ".site-shell :is(.project-grid,.absent.absent)",
  ]) assert.equal(filterProjectsSelector(selector), selector);
  assert.equal(filterProjectsSelector(".page-hero:has(+ .service-overview-grid)"), "");
  assert.equal(filterProjectsSelector(".site-shell :is(.service-card,.price-grid)"), "");
});

test("other functional pseudo selectors are preserved conservatively", () => {
  const selector = ".project-grid > :nth-child(2n of .unknown)";
  assert.equal(filterProjectsSelector(selector), selector);
});

test("project output retains order, declarations, font faces, keyframes and only populated media", async () => {
  const css = `
    @font-face { font-family: Example; src: url(example.woff2) }
    @media (min-width: 10px) { .service-card { color: red } }
    @media (min-width: 20px) { .project-grid { display: grid } }
    .project-grid { gap: 1rem }
    .service-card { color: red }
    .project-grid { gap: 2rem }
    @keyframes example { from { opacity: 0 } to { opacity: 1 } }
  `;
  const result = await postcss([projectsCssFilter()]).process(css, { from: "/tmp/projects-page.css" });
  assert.ok(!result.css.includes("service-card"));
  assert.ok(!result.css.includes("min-width: 10px"));
  assert.ok(result.css.includes("min-width: 20px"));
  assert.ok(result.css.indexOf("gap: 1rem") < result.css.indexOf("gap: 2rem"));
  assert.ok(result.css.includes("@font-face"));
  assert.ok(result.css.includes("@keyframes example"));
  assert.ok(result.css.includes("from { opacity: 0 }"));
});

test("other stylesheet entries pass through unchanged", async () => {
  const css = ".site-shell--home { color: red } @media (min-width: 1px) { .price-grid { display: grid } }";
  const result = await postcss([projectsCssFilter()]).process(css, { from: "/tmp/styles.css" });
  assert.equal(result.css, css);
});
