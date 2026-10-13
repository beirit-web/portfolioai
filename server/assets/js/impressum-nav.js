/* Progressive disclosure: links remain available when JavaScript is disabled. */
(() => {
  const nav = document.querySelector(".imprint-nav");
  if (!nav) return;
  const toggle = nav.querySelector(".imprint-nav__toggle");
  const links = document.getElementById(toggle.getAttribute("aria-controls"));
  const mobile = window.matchMedia("(max-width: 47.99rem)");

  function setOpen(open, restoreFocus = false) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? toggle.dataset.closeLabel : toggle.dataset.openLabel);
    links.hidden = mobile.matches && !open;
    if (restoreFocus) toggle.focus();
  }

  function resize() {
    const focusedLink = links.contains(document.activeElement);
    const focusedToggle = document.activeElement === toggle;
    toggle.hidden = !mobile.matches;
    setOpen(false, mobile.matches && focusedLink);
    if (!mobile.matches && focusedToggle) links.querySelector("a").focus();
  }

  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("keydown", event => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  nav.addEventListener("focusout", event => {
    if (!nav.contains(event.relatedTarget)) setOpen(false);
  });
  document.addEventListener("click", event => {
    if (!nav.contains(event.target)) setOpen(false);
  });
  links.addEventListener("click", event => {
    if (event.target.closest("a")) setOpen(false);
  });
  mobile.addEventListener("change", resize);
  window.addEventListener("pageshow", resize);
  resize();
})();
