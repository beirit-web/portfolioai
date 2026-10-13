// Keep the existing React menu state as the source of truth.
const mobile = matchMedia("(max-width: 980px)");
const backdrop = document.createElement("div");
backdrop.className = "housing-nav-backdrop";
backdrop.hidden = true;
backdrop.setAttribute("aria-hidden", "true");
document.body.append(backdrop);

let expanded = false;
let scrollPosition = 0;
let previousBodyStyle = null;
let background = null;
let backgroundState = null;
let opener = null;
let panel = null;

function focusableItems() {
  return [...(panel?.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), [tabindex='0']") || [])]
    .filter(element => element.getClientRects().length > 0);
}

function lockPage() {
  scrollPosition = window.scrollY;
  previousBodyStyle = {
    position: document.body.style.position,
    top: document.body.style.top,
    width: document.body.style.width,
    overflow: document.body.style.overflow,
  };
  Object.assign(document.body.style, {
    position: "fixed", top: `-${scrollPosition}px`, width: "100%", overflow: "hidden",
  });
  background = document.querySelector(".workspace");
  if (background) {
    backgroundState = { inert: background.inert, ariaHidden: background.getAttribute("aria-hidden") };
    background.inert = true;
    background.setAttribute("aria-hidden", "true");
  }
}

function unlockPage() {
  if (previousBodyStyle) {
    Object.assign(document.body.style, previousBodyStyle);
    previousBodyStyle = null;
    window.scrollTo(0, scrollPosition);
  }
  if (background && backgroundState) {
    background.inert = backgroundState.inert;
    if (backgroundState.ariaHidden === null) background.removeAttribute("aria-hidden");
    else background.setAttribute("aria-hidden", backgroundState.ariaHidden);
  }
  background = null;
  backgroundState = null;
}

function closeMenu(restoreFocus = true) {
  if (opener?.getAttribute("aria-expanded") === "true") opener.click();
  // React applies the state change before the next frame.
  requestAnimationFrame(() => {
    synchronize();
    if (restoreFocus && opener?.isConnected && mobile.matches) opener.focus({ preventScroll: true });
  });
}

function addHomeLink(container, className) {
  if (!container || container.querySelector(".housing-home-link")) return;
  const homeLink = document.createElement("a");
  homeLink.href = "/projekte/wohnungssuche-bodensee";
  homeLink.className = `${className} housing-home-link`;
  homeLink.textContent = "Zur Startseite";
  homeLink.setAttribute("aria-label", "Zur Startseite der Wohnungssuche Bodensee");
  container.append(homeLink);
}

function synchronize() {
  opener = document.querySelector(".mobile-menu-button");
  panel = document.querySelector(".sidebar");
  if (opener) {
    const name = opener.getAttribute("aria-expanded") === "true"
      ? "Navigation-Menü schließen" : "Navigation-Menü öffnen";
    if (opener.getAttribute("aria-label") !== name) opener.setAttribute("aria-label", name);
  }
  for (const select of document.querySelectorAll(".controls select")) {
    const firstOption = select.options[0]?.textContent.trim();
    const name = firstOption === "Alle Orte" ? "Ort" : firstOption === "Match-Score" ? "Sortierung" : null;
    if (name && select.getAttribute("aria-label") !== name) select.setAttribute("aria-label", name);
  }
  addHomeLink(document.querySelector(".login-panel"), "text-button");
  addHomeLink(document.querySelector(".workspace .page-header .header-actions"), "secondary");
  if (opener && panel) {
    panel.id = "housing-mobile-navigation";
    opener.setAttribute("aria-controls", panel.id);
    addHomeLink(panel.querySelector(".sidebar-footer"), "sidebar-action");
    let closeButton = panel.querySelector(".housing-nav-close");
    if (!closeButton) {
      closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "housing-nav-close";
      closeButton.textContent = "Menü schließen";
      closeButton.setAttribute("aria-label", "Menü schließen");
      closeButton.addEventListener("click", () => closeMenu());
      panel.prepend(closeButton);
    }
  }
  const nextExpanded = Boolean(mobile.matches && panel && opener?.getAttribute("aria-expanded") === "true");
  if (nextExpanded === expanded) return;
  expanded = nextExpanded;
  backdrop.hidden = !expanded;
  document.body.classList.toggle("housing-navigation-open", expanded);
  if (expanded) {
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Hauptnavigation");
    lockPage();
    requestAnimationFrame(() => {
      if (expanded && panel?.isConnected) (panel.querySelector("nav button.active") || focusableItems()[0])?.focus();
    });
  } else {
    panel?.removeAttribute("role");
    panel?.removeAttribute("aria-modal");
    panel?.removeAttribute("aria-label");
    unlockPage();
  }
}

backdrop.addEventListener("click", () => closeMenu());
document.addEventListener("keydown", event => {
  if (!expanded) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu();
  } else if (event.key === "Tab") {
    const items = focusableItems();
    const first = items[0], last = items.at(-1);
    if (!first) return;
    if (!panel.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

function onRouteChange() {
  if (!expanded) return;
  closeMenu(false);
  requestAnimationFrame(() => {
    const heading = document.querySelector(".workspace h1, .login-panel h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  });
}
window.addEventListener("popstate", onRouteChange);
window.addEventListener("hashchange", onRouteChange);
mobile.addEventListener("change", () => { if (!mobile.matches) closeMenu(false); });

const observer = new MutationObserver(synchronize);
observer.observe(document.getElementById("root"), {
  childList: true, subtree: true, attributes: true, attributeFilter: ["aria-expanded"],
});
synchronize();
