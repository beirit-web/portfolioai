document.querySelectorAll(".plant-photo img").forEach(image => {
  const fallback = () => {
    image.hidden = true;
    image.closest(".plant-photo").classList.remove("has-image");
  };
  image.addEventListener("error", fallback);
  if (image.complete && !image.naturalWidth) fallback();
});

document.querySelector('.plant-form [aria-invalid="true"]')?.focus();

document.querySelectorAll("form[method=post]").forEach(form => {
  form.addEventListener("submit", event => {
    if (form.dataset.submitting) {
      event.preventDefault();
      return;
    }
    form.dataset.submitting = "true";
    form.setAttribute("aria-busy", "true");
  });
});

addEventListener("pageshow", () => {
  document.querySelectorAll("form[data-submitting]").forEach(form => {
    delete form.dataset.submitting;
    form.removeAttribute("aria-busy");
  });
});

document.addEventListener("click", event => {
  document.querySelectorAll(".snooze-menu[open]").forEach(menu => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") document.querySelectorAll(".snooze-menu[open]").forEach(menu => {
    menu.open = false;
    menu.querySelector("summary").focus();
  });
});
