import { enhanceProjectPage } from "./lib/enhanceProjectPage.js";

enhanceProjectPage();

const section = document.getElementById("referenzen");
let portfolioPending = false;
async function enhancePortfolio() {
  if (portfolioPending || !section) return;
  portfolioPending = true;
  try {
    const { enhanceHomePortfolio } = await import("./home-portfolio.jsx");
    await enhanceHomePortfolio(section, document.documentElement.lang);
    portfolioObserver?.disconnect();
  } catch {
    // Native project links remain usable after a transient module failure.
    portfolioPending = false;
  }
}
const portfolioObserver = typeof IntersectionObserver === "function"
  ? new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void enhancePortfolio();
    }, { rootMargin: "600px" })
  : null;
if (section) {
  if (portfolioObserver) portfolioObserver.observe(section);
  else void enhancePortfolio();
  section.addEventListener("pointerdown", enhancePortfolio, { passive: true });
  section.addEventListener("keydown", enhancePortfolio);
}

const waveRoot = document.querySelector(".hero-stage__wave-grid");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const connection = navigator.connection;
let hasInteracted = false;
let animation;
let animationPending = false;
async function syncAnimation() {
  if (!hasInteracted || reducedMotion.matches || connection?.saveData) {
    animation?.destroy();
    animation = undefined;
    waveRoot?.replaceChildren();
    return;
  }
  if (!waveRoot || animation || animationPending) return;
  animationPending = true;
  try {
    const { createWaveGridExperience } = await import("./components/home/hero/WaveGridHero.jsx");
    if (reducedMotion.matches || connection?.saveData) return;
    const canvas = document.createElement("canvas");
    canvas.className = "hero-stage__wave-grid-canvas";
    waveRoot.append(canvas);
    try {
      animation = createWaveGridExperience(canvas);
      requestAnimationFrame(() => canvas.classList.add("is-ready"));
    } catch {
      canvas.dataset.waveGridError = "true";
    }
  } catch {
    // Keep the static hero usable when the optional animation cannot download.
  } finally {
    animationPending = false;
  }
}
const interactionEvents = ["pointermove", "pointerdown", "keydown"];
function activateAnimation(event) {
  if (!event.isTrusted) return;
  // Browsers can emit a zero-distance pointer event while laying out a page.
  if (event.type === "pointermove" && !event.movementX && !event.movementY) return;
  hasInteracted = true;
  interactionEvents.forEach(type => removeEventListener(type, activateAnimation));
  void syncAnimation();
}
interactionEvents.forEach(type => addEventListener(type, activateAnimation, { passive: true }));
reducedMotion.addEventListener("change", syncAnimation);
connection?.addEventListener?.("change", syncAnimation);

const heroNext = document.querySelector(".hero-stage__next");
heroNext?.addEventListener("click", event => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const target = document.getElementById("kompetenzen");
  if (!target) return;
  event.preventDefault();
  scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + scrollY - 92), behavior: reducedMotion.matches ? "auto" : "smooth" });
});
