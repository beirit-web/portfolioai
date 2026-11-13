import { enhanceProjectPage } from "./lib/enhanceProjectPage.js";
// The overview arrives as HTML. Enhance its controls without rebuilding it.
const renderedOverview = document.querySelector("[data-projects-rendered]");
if (!renderedOverview || !Array.isArray(window.BEIRIT_HOME_CONFIG?.initialProjects)) {
  // Keep the existing API-backed application available when the HTML bootstrap
  // is missing, including builds without the server presentation catalog.
  import("./projects.jsx");
} else {
  enhanceProjectPage();
}
