document.documentElement.classList.add("js");

const projectHomeNav = document.querySelector(".project-home-nav--shop");
if (projectHomeNav) {
  const updateNavigationHeight = () => {
    document.documentElement.style.setProperty("--shop-navigation-height", `${projectHomeNav.getBoundingClientRect().height}px`);
  };
  updateNavigationHeight();
  if ("ResizeObserver" in window) {
    new ResizeObserver(updateNavigationHeight).observe(projectHomeNav);
  } else {
    window.addEventListener("resize", updateNavigationHeight);
  }
}

const headerPriceSort = document.querySelector("#headerPriceSort");
if (headerPriceSort) {
  headerPriceSort.addEventListener("change", () => {
    if (headerPriceSort.value) headerPriceSort.form.requestSubmit();
  });
}

document.querySelectorAll(".quantity-form").forEach(form => {
  const input = form.querySelector("input[name=quantity]");
  const updateButtons = () => {
    form.querySelectorAll(".stepper").forEach(button => {
      button.disabled = Number(button.dataset.step) < 0 ? input.valueAsNumber <= 1 : input.valueAsNumber >= 20;
    });
  };
  updateButtons();
  input.addEventListener("input", updateButtons);
  form.querySelectorAll(".stepper").forEach(button => button.addEventListener("click", () => {
    if (form.dataset.submitting) return;
    input.value = String(Math.max(1, Math.min(20, (input.valueAsNumber || 1) + Number(button.dataset.step))));
    form.requestSubmit();
  }));
});

const checkout = document.querySelector("#checkoutForm");
if (checkout) {
  const currency = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
  const updateDelivery = () => {
    const local = checkout.querySelector('input[name=delivery_method]:checked')?.value === "local_delivery";
    document.querySelector("#deliveryAddress").hidden = !local;
    document.querySelectorAll("#deliveryAddress input").forEach(input => input.setAttribute("aria-required", String(local)));
    const fee = local ? Number(checkout.dataset.localFee) : 0;
    document.querySelector("#deliveryFee").textContent = currency.format(fee);
    document.querySelector("#totalPrice").textContent = currency.format(Number(checkout.dataset.subtotal) + fee);
  };
  checkout.querySelectorAll('input[name=delivery_method]').forEach(input => input.addEventListener("change", updateDelivery));
  updateDelivery();
  checkout.querySelector('[aria-invalid="true"]')?.focus();
}

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
window.addEventListener("pageshow", () => document.querySelectorAll("form[data-submitting]").forEach(form => {
  delete form.dataset.submitting;
  form.removeAttribute("aria-busy");
}));
