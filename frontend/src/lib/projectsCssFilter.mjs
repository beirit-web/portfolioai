import selectorParser from "postcss-selector-parser";

// Classes rendered by PageShell, SiteHeader, PageHero, PageFooter and
// ProjectsOverviewPage, including their interactive states. Keep this list in
// step with their markup; shared styles themselves remain in their source files.
const routeClasses = new Set(`
  site-shell site-shell--page home-main site-page-main page-hero
  site-header site-header--optimized site-header-nav site-header-nav--optimized
  site-logo site-logo__mark site-nav-toggle site-nav-toggle__icon
  site-nav-toggle__text site-menuicon site-menuicon__bar site-menuicon__circle
  site-nav-links site-nav-links--visible site-nav-link site-nav-splash
  site-mobile-menu-panel site-mobile-menu-panel__link
  is-mobile-menu-open is-active is-visible page-is-loaded js-motion-ready
  site-footer site-footer__inner site-footer__brand site-footer__brand-main
  site-footer__meta site-footer__small site-footer__meta-separator
  site-footer__links footer-link footer-link--scroll-top footer-link__scroll-icon
  project-overview project-grid project-overview-card project-overview-card__media
  project-overview-card__media--cover project-overview-card__body
  project-overview-card__meta project-overview-card__tags
  project-overview-card__actions project-overview-card__button
  project-overview-card__secondary-button project-overview__empty
  technology-tags technology-tag info-tooltip info-tooltip__trigger
  info-tooltip__popover lucide
  fixed inset-x-0 top-0 z-40 bg-white/90 shadow-line backdrop-blur-xl
  group inline-flex min-w-0 max-w-[68vw] items-center rounded-lg py-1 pr-1
  outline-none transition focus-visible:ring-4 focus-visible:ring-emerald-200
  sm:max-w-none h-12 w-auto max-w-[11rem] shrink-0 object-contain
  sm:h-14 sm:max-w-[13rem] min-h-screen bg-[#f7f6f2] text-stone-950
  mx-auto max-w-7xl px-3 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-36 lg:px-10
  xl:max-w-[92rem] 2xl:max-w-[104rem] mt-3 max-w-6xl font-display
  text-4xl leading-tight sm:text-6xl lg:text-7xl xl:max-w-7xl
  2xl:max-w-none 2xl:text-8xl mt-5 max-w-3xl text-base leading-8
  text-stone-700 sm:text-lg pb-16 h-4 w-4 bg-white px-4 py-8 text-sm
  text-slate-800 flex flex-col gap-4 sm:flex-row sm:items-start
  sm:justify-between flex-wrap gap-x-5 gap-y-2 hover:text-stone-950
`.trim().split(/\s+/));

// Detail reports reuse the same shell, with their own content and utilities.
const detailClasses = new Set(`
  portfolio-project-hero portfolio-project-back portfolio-project-hero__grid
  portfolio-project-hero__copy portfolio-project-hero__preview portfolio-project-hero__cover
  portfolio-project-page portfolio-project-page__overview portfolio-project-checklist portfolio-project-decision
  portfolio-project-gallery portfolio-project-gallery__grid portfolio-project-gallery__figure
  portfolio-project-gallery__figure--mobile portfolio-project-note portfolio-project-closing
  portfolio-card__meta portfolio-card__type portfolio-card__status portfolio-card__trust
  portfolio-card__trust--reference portfolio-card__desktop-preview portfolio-card__preview
  portfolio-card__browser-bar portfolio-card__mockup portfolio-card__details-grid
  portfolio-card__situation portfolio-card__implementation portfolio-card__result
  portfolio-card__features portfolio-card__features-title portfolio-card__feature-list
  portfolio-card__feature-list-icon-wrap portfolio-card__feature-list-icon
  portfolio-card__proof portfolio-card__proof-title portfolio-contact-button
  scroll-mt-24 h-5 w-5 section-cta-strip eyebrow
`.trim().split(/\s+/));

const routeIds = new Set(["top", "beirit-root", "site-navigation", "site-mobile-navigation"]);
const positiveSelectorPseudos = new Set([":is", ":where", ":has", ":matches", ":-webkit-any", ":-moz-any"]);

function isRouteClass(value, detail) {
  if (detail && (detailClasses.has(value) || value.startsWith("portfolio-project-hero--"))) return true;
  if (detail && /^(?:project-overview|project-grid)/.test(value)) return value === "project-overview-card__secondary-button";
  return routeClasses.has(value)
    || value.startsWith("project-overview-card--")
    || value.startsWith("lucide-");
}

function keepSelector(selector, detail = false) {
  for (const node of selector.nodes) {
    if (node.type === "class" && !isRouteClass(node.value, detail)) return false;
    if (node.type === "id" && !routeIds.has(node.value)) return false;
    if (node.type !== "pseudo" || !node.nodes || !positiveSelectorPseudos.has(node.value)) continue;

    const possibleBranches = node.nodes
      .map((branch) => branch.clone())
      .filter(branch => keepSelector(branch, detail));
    if (!possibleBranches.length) return false;

    // :where() has zero specificity, so removing impossible branches preserves
    // the cascade. :is() and :has() derive specificity from every branch, even
    // ones that cannot match here, so retain their original arguments.
    if (node.value === ":where") {
      node.removeAll();
      possibleBranches.forEach((branch) => node.append(branch));
    }
  }
  // Negative selectors such as :not(.hero-stage) remain intact: the absent
  // class does not prevent the outer selector from matching this route.
  return true;
}

export function filterProjectsSelector(selector, detail = false) {
  const processor = selectorParser((root) => {
    root.nodes.slice().forEach((branch) => {
      if (!keepSelector(branch, detail)) branch.remove();
    });
  });
  return processor.processSync(selector);
}

export default function projectsCssFilter() {
  return {
    postcssPlugin: "beirit-projects-css",
    OnceExit(root) {
      const filename = root.source?.input?.file || "";
      if (!/(?:^|[/\\])(?:projects-page|project-detail-page)\.css$/.test(filename)) return;

      root.walkRules((rule) => {
        // Keyframe steps are not DOM selectors. Retain animation definitions
        // and font faces conservatively, including header/menu animations.
        if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
        const selector = filterProjectsSelector(rule.selector, filename.endsWith("project-detail-page.css"));
        if (selector) rule.selector = selector;
        else rule.remove();
      });

      const removeEmptyContainers = (container) => {
        container.nodes?.slice().forEach((node) => {
          if (node.type !== "atrule" || !node.nodes) return;
          removeEmptyContainers(node);
          if (!node.nodes.some((child) => child.type !== "comment")) node.remove();
        });
      };
      removeEmptyContainers(root);
    },
  };
}
