import { enhanceProjectPage } from "./lib/enhanceProjectPage.js";

// Reports arrive as complete HTML; keep the client renderer for older builds.
if (document.querySelector("[data-project-detail-rendered]")) {
  enhanceProjectPage();
} else {
  import("./project-detail.jsx");
}
