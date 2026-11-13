document.documentElement.classList.add("js");

const projectHomeNav = document.querySelector(".project-home-nav--shop");
if (projectHomeNav) {
  const menu = projectHomeNav.querySelector(".project-home-nav__menu");
  const toggle = menu?.querySelector("summary");
  const dropdowns = [...projectHomeNav.querySelectorAll(".project-home-nav__select")];
  const closeDropdown = dropdown => {
    if (dropdown.contains(document.activeElement)) dropdown.querySelector("summary").focus();
    dropdown.open = false;
  };
  if (menu && toggle) {
    const wideNavigation = window.matchMedia("(min-width: 1280px)");
    const updateNavigationLayout = () => {
      const focused = document.activeElement;
      dropdowns.forEach(closeDropdown);
      projectHomeNav.dataset.layout = wideNavigation.matches ? "wide" : "compact";
      menu.open = wideNavigation.matches;
      if (wideNavigation.matches && focused === toggle) dropdowns[0]?.querySelector("summary").focus();
      if (!wideNavigation.matches && menu.contains(focused) && focused !== toggle) toggle.focus();
    };
    updateNavigationLayout();
    wideNavigation.addEventListener("change", updateNavigationLayout);
    const closeMenu = () => {
      dropdowns.forEach(closeDropdown);
      if (wideNavigation.matches) return;
      if (menu.contains(document.activeElement)) toggle.focus();
      menu.open = false;
    };
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && menu.open && !wideNavigation.matches) {
        event.preventDefault();
        closeMenu();
      }
    });
    document.addEventListener("click", event => {
      if (menu.open && !menu.contains(event.target)) closeMenu();
    });
    menu.addEventListener("click", event => {
      if (event.target.closest("a[href]")) closeMenu();
    });
    menu.addEventListener("toggle", () => {
      if (!menu.open) dropdowns.forEach(dropdown => { dropdown.open = false; });
    });
    projectHomeNav.addEventListener("focusout", event => {
      if (!wideNavigation.matches && event.relatedTarget && !projectHomeNav.contains(event.relatedTarget)) menu.open = false;
    });
  }
  for (const dropdown of dropdowns) {
    const summary = dropdown.querySelector("summary");
    dropdown.addEventListener("keydown", event => {
      if (event.key === "Escape" && dropdown.open) {
        event.preventDefault();
        event.stopPropagation();
        closeDropdown(dropdown);
      }
      if (event.target === summary && event.key === "ArrowDown") {
        event.preventDefault();
        dropdown.open = true;
        dropdown.querySelector("a")?.focus();
      }
    });
    dropdown.addEventListener("toggle", () => {
      if (dropdown.open) dropdowns.filter(other => other !== dropdown).forEach(closeDropdown);
    });
    document.addEventListener("click", event => {
      if (!dropdown.contains(event.target)) closeDropdown(dropdown);
    });
  }
  const updateNavigationHeight = () => {
    document.documentElement.style.setProperty("--shop-navigation-height", `${projectHomeNav.getBoundingClientRect().height}px`);
  };
  updateNavigationHeight();
  if ("ResizeObserver" in window) {
    new ResizeObserver(updateNavigationHeight).observe(projectHomeNav);
  } else {
    addEventListener("resize", updateNavigationHeight);
  }
}

let disposeProductTabletops = initializeProductTabletops();
const catalogFilters = document.querySelector(".catalog-filters");
if (catalogFilters) {
  const toggle = catalogFilters.querySelector(".filter-button");
  const panel = catalogFilters.querySelector(".catalog-filter-panel");
  if (toggle && panel) {
    const setFiltersOpen = open => {
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      const label = open ? "Filter schließen" : "Filter öffnen";
      toggle.setAttribute("aria-label", label);
      toggle.title = label;
    };
    setFiltersOpen(false);
    toggle.hidden = false;
    catalogFilters.dataset.collapsible = "true";
    toggle.addEventListener("click", () => setFiltersOpen(panel.hidden));
    catalogFilters.addEventListener("keydown", event => {
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        toggle.focus();
        setFiltersOpen(false);
      }
    });
  }

  const search = catalogFilters.elements.q;
  const category = catalogFilters.elements.category;
  const sort = catalogFilters.elements.sort;
  const grid = document.querySelector(".product-grid");
  const heading = document.querySelector(".page-heading");
  const summary = document.querySelector(".filter-summary");
  const status = catalogFilters.querySelector(".filter-status");
  const fallbackSubmit = panel.querySelector('[type="submit"]');
  const storageKey = "beirit:shop:filters:v1";
  const defaults = {q: "", category: "all", sort: "priceAsc"};
  const values = () => ({q: search.value.trim(), category: category.value, sort: sort.value});
  const setValues = filters => {
    search.value = typeof filters?.q === "string" ? filters.q.slice(0, 80) : defaults.q;
    category.value = [...category.options].some(option => option.value === filters?.category) ? filters.category : defaults.category;
    sort.value = [...sort.options].some(option => option.value === filters?.sort) ? filters.sort : defaults.sort;
  };
  const saveFilters = () => {
    const filters = values();
    try {
      if (Object.keys(defaults).every(key => filters[key] === defaults[key])) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch { /* Filtering also works when browser storage is unavailable. */ }
  };
  const filterURL = () => {
    const url = new URL(catalogFilters.action);
    for (const [key, value] of Object.entries(values())) {
      if (value !== defaults[key]) url.searchParams.set(key, value);
    }
    url.hash = location.hash;
    return url;
  };
  let timer;
  let controller;
  let revision = 0;
  const cancelPending = () => {
    clearTimeout(timer);
    controller?.abort();
    revision++;
  };
  const applyFilters = async currentRevision => {
    const request = new AbortController();
    controller = request;
    const url = filterURL();
    try {
      const response = await fetch(url, {signal: request.signal, headers: {Accept: "text/html"}});
      if (!response.ok) throw new Error("Catalog unavailable");
      const next = new DOMParser().parseFromString(await response.text(), "text/html");
      if (currentRevision !== revision) return;
      const nextGrid = next.querySelector(".product-grid");
      const nextHeading = next.querySelector(".page-heading");
      const nextSummary = next.querySelector(".filter-summary");
      if (!nextGrid || !nextHeading || !nextSummary) throw new Error("Catalog missing");
      disposeProductTabletops();
      grid.replaceChildren(...nextGrid.childNodes);
      heading.replaceChildren(...nextHeading.childNodes);
      summary.replaceChildren(...nextSummary.childNodes);
      summary.hidden = nextSummary.hidden;
      disposeProductTabletops = initializeProductTabletops();
      // Keep the existing navigation controls and their keyboard listeners.
      const nextLinks = [...next.querySelectorAll(".project-home-nav--shop a")];
      document.querySelectorAll(".project-home-nav--shop a").forEach((link, index) => {
        const replacement = nextLinks[index];
        if (!replacement) return;
        link.setAttribute("href", replacement.getAttribute("href"));
        if (replacement.hasAttribute("aria-current")) link.setAttribute("aria-current", replacement.getAttribute("aria-current"));
        else link.removeAttribute("aria-current");
      });
      const sortLabel = document.querySelector("#headerPriceSort > summary");
      const nextSortLabel = next.querySelector("#headerPriceSort > summary");
      if (sortLabel && nextSortLabel) {
        sortLabel.textContent = nextSortLabel.textContent;
        sortLabel.setAttribute("aria-label", nextSortLabel.getAttribute("aria-label"));
      }
      history.replaceState(history.state, "", url);
      fallbackSubmit.hidden = true;
      status.classList.add("sr-only");
      status.textContent = `${grid.querySelectorAll(".product-card").length} Artikel gefunden.`;
    } catch (error) {
      if (error.name === "AbortError" || currentRevision !== revision) return;
      fallbackSubmit.hidden = false;
      status.classList.remove("sr-only");
      status.textContent = "Die Artikel konnten nicht aktualisiert werden. Bitte mit der Lupe erneut versuchen.";
    } finally {
      if (currentRevision === revision) grid.removeAttribute("aria-busy");
    }
  };
  const queueFilters = (delay = 0) => {
    cancelPending();
    saveFilters();
    grid.setAttribute("aria-busy", "true");
    status.classList.add("sr-only");
    status.textContent = "Artikel werden aktualisiert …";
    const currentRevision = revision;
    timer = setTimeout(() => applyFilters(currentRevision), delay);
  };
  search.addEventListener("input", event => {
    if (!event.isComposing) queueFilters(350);
  });
  search.addEventListener("compositionstart", cancelPending);
  search.addEventListener("compositionend", () => queueFilters(350));
  category.addEventListener("change", () => queueFilters());
  sort.addEventListener("change", () => queueFilters());
  catalogFilters.addEventListener("submit", event => {
    event.preventDefault();
    queueFilters();
  });
  document.addEventListener("click", event => {
    const reset = event.target.closest("a[data-reset-filters]");
    if (!reset || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setValues(defaults);
    search.focus({preventScroll: true});
    queueFilters();
  });
  catalogFilters.dataset.automatic = "true";
  panel.querySelector(".filter-hint").hidden = false;
  fallbackSubmit.hidden = true;
  const params = new URLSearchParams(location.search);
  if (params.has("reset")) {
    setValues(defaults);
    saveFilters();
    history.replaceState(history.state, "", filterURL());
  } else if (["q", "category", "sort"].some(key => params.has(key))) {
    saveFilters();
  } else {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && typeof saved === "object") {
        setValues(saved);
        if (Object.keys(defaults).some(key => values()[key] !== defaults[key])) queueFilters();
      }
    } catch { /* Ignore invalid or unavailable saved preferences. */ }
  }
}

// Continue the tabletop using clean grain near the photo's bottom, where no
// plate or packaging enters the texture. Keep the visible edge only at the join.
// Reuse the loaded photo, and batch geometry reads before background writes.
function initializeProductTabletops() {
  const productCards = [...document.querySelectorAll(".product-card")];
  if (!productCards.length) return () => {};
  const colourSample = document.createElement("canvas");
  colourSample.width = 64;
  colourSample.height = 1;
  const sampleContext = colourSample.getContext("2d", {willReadFrequently: true});
  const fallbackColour = { value: "rgb(245 245 245)", luminance: 1, neutral: true };
  const edgeColour = (image, x, y, width) => {
    // External admin images may taint a canvas even when the image itself loads.
    // Reset its bitmap between cards so that one such image cannot poison others.
    colourSample.width = 64;
    if (!sampleContext) return fallbackColour;
    try {
    // srcset can density-correct naturalWidth/Height while canvas source crops
    // still address bitmap pixels. Scale the whole image into our coordinate
    // system first; the 64 × 1 canvas clips the intended tabletop row.
    const sampleScale = colourSample.width / width;
    sampleContext.drawImage(image, -x * sampleScale, -y,
      image.naturalWidth * sampleScale, image.naturalHeight);
    const pixels = sampleContext.getImageData(0, 0, colourSample.width, 1).data;
    const channels = [0, 0, 0];
    let opaquePixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      // An undecoded or transparent image produces empty pixels, not a black table.
      if (pixels[index + 3] < 250) continue;
      opaquePixels++;
      for (let channel = 0; channel < 3; channel++) channels[channel] += pixels[index + channel];
    }
    if (opaquePixels < colourSample.width / 2) return fallbackColour;
    const rgb = channels.map(value => Math.round(value / opaquePixels));
    const linear = rgb.map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return {value: `rgb(${rgb.join(" ")})`, luminance: linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722,
      neutral: Math.max(...rgb) - Math.min(...rgb) <= 20};
    } catch {
      return fallbackColour;
    }
  };
  const svgNode = (tag, attributes, children = []) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
    node.append(...children);
    return node;
  };
  const renderTabletop = background => {
    background.copy.dataset.textTone = background.textTone;
    background.copy.style.backgroundColor = background.colour;
    const id = `product-tabletop-${background.copy.dataset.tabletopId}`;
    const photo = svgNode("image", {href: background.image, width: background.naturalWidth,
      height: background.naturalHeight});
    const strip = svgNode("svg", {width: background.width, height: background.bandHeight,
      viewBox: `${background.cropX} ${background.cropY} ${background.cropWidth} ${background.cropHeight}`,
      preserveAspectRatio: "none"}, [photo]);
    const reflected = strip.cloneNode(true);
    reflected.setAttribute("transform", `translate(0 ${background.bandHeight}) scale(1 -1)`);
    strip.setAttribute("y", background.bandHeight);
    const pattern = svgNode("pattern", {id, patternUnits: "userSpaceOnUse", width: background.width,
      height: background.bandHeight * 2}, [reflected, strip]);
    const edge = svgNode("pattern", {id: `${id}-edge`, patternUnits: "userSpaceOnUse", width: background.width,
      height: 1}, [svgNode("svg", {width: background.width, height: 1,
        viewBox: `${background.cropX} ${background.edgeY - 1} ${background.cropWidth} 1`,
        preserveAspectRatio: "none"}, [photo.cloneNode(true)])]);
    const bounds = {x: -48, y: -48, width: background.width + 96, height: background.height + 96};
    const transition = svgNode("linearGradient", {id: `${id}-transition`, x1: 0, y1: 0, x2: 0, y2: 1}, [
      svgNode("stop", {offset: 0, "stop-color": "white"}),
      svgNode("stop", {offset: 1, "stop-color": "black"}),
    ]);
    // Finish the join before the text starts at the 18 px inset.
    const transitionHeight = Math.min(12, background.bandHeight);
    const edgeMask = svgNode("mask", {id: `${id}-join`, maskUnits: "userSpaceOnUse", x: 0, y: 0,
      width: background.width, height: transitionHeight}, [
      svgNode("rect", {width: background.width, height: transitionHeight, fill: `url(#${id}-transition)`}),
    ]);
    const texture = svgNode("svg", {class: "product-tabletop", "aria-hidden": "true", focusable: "false",
      viewBox: `0 0 ${background.width} ${background.height}`, preserveAspectRatio: "none"}, [
      svgNode("defs", {}, [pattern, edge, transition, edgeMask]),
      svgNode("rect", {...bounds, fill: background.colour}),
      // Preserve the sampled tabletop colour on every surface. Arithmetic
      // filters and blend modes can turn the texture black on some renderers.
      svgNode("rect", {...bounds, fill: `url(#${id})`, opacity: background.lightSurface ? .16 : .24}),
      svgNode("rect", {width: background.width, height: transitionHeight, fill: `url(#${id}-edge)`, mask: `url(#${id}-join)`}),
    ]);
    const previous = background.copy.querySelector(".product-tabletop");
    if (previous) previous.replaceWith(texture);
    else background.copy.prepend(texture);
  };
  const activeCards = new Set();
  const renderedGeometry = new WeakMap();
  const pendingCards = new Set();
  let tabletopFrame;
  const refreshTabletop = card => {
    if (!card || !activeCards.has(card)) return;
    pendingCards.add(card);
    if (tabletopFrame) return;
    tabletopFrame = requestAnimationFrame(() => {
      tabletopFrame = undefined;
      const backgrounds = [...pendingCards].map(element => {
        if (!activeCards.has(element)) return null;
        const photo = element.querySelector(".product-photo");
        const image = photo?.querySelector("img");
        const copy = element.querySelector(".product-copy");
        if (!image?.complete || !image.naturalWidth || !copy) return null;
        const imageBox = image.getBoundingClientRect();
        const photoBox = photo.getBoundingClientRect();
        const copyBox = copy.getBoundingClientRect();
        if (!photoBox.height || !copyBox.height) return null;
        const source = image.currentSrc || image.src;
        const geometry = [source, image.naturalWidth, image.naturalHeight, imageBox.width,
          imageBox.height, photoBox.height, copyBox.width, copyBox.height].join(":");
        if (renderedGeometry.get(element) === geometry) return null;
        const scale = Math.max(imageBox.width / image.naturalWidth, imageBox.height / image.naturalHeight);
        const photoEdge = 0.5 + photoBox.height / (2 * image.naturalHeight * scale);
        const stripHeight = image.naturalHeight * 0.035;
        const cropX = (image.naturalWidth - copyBox.width / scale) / 2;
        const cropWidth = copyBox.width / scale;
        const cropY = image.naturalHeight * .94;
        const colour = edgeColour(image, cropX, cropY + stripHeight - 1, cropWidth);
        const edge = edgeColour(image, cropX, photoEdge * image.naturalHeight - 1, cropWidth);
        const lightSurface = colour.neutral && colour.luminance >= .65;
        return { card: element, geometry, copy, image: source, naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight, width: copyBox.width, height: copyBox.height,
          cropX, cropWidth, colour: colour.value, lightSurface,
          textTone: lightSurface ? "default" : colour.luminance < .18 ? "light" : Math.min(colour.luminance, edge.luminance) < .6 ? "strong" : "default",
          cropY, edgeY: photoEdge * image.naturalHeight,
          cropHeight: stripHeight, bandHeight: stripHeight * scale };
      }).filter(Boolean);
      pendingCards.clear();
      for (const background of backgrounds) {
        renderTabletop(background);
        renderedGeometry.set(background.card, background.geometry);
      }
    });
  };
  const tabletopObserver = "ResizeObserver" in window
    ? new ResizeObserver(entries => entries.forEach(entry => refreshTabletop(entry.target.closest(".product-card"))))
    : null;
  const setActive = (card, active) => {
    const photo = card.querySelector(".product-photo");
    const copy = card.querySelector(".product-copy");
    if (active) {
      activeCards.add(card);
      tabletopObserver?.observe(photo);
      tabletopObserver?.observe(copy);
      refreshTabletop(card);
    } else {
      activeCards.delete(card);
      tabletopObserver?.unobserve(photo);
      tabletopObserver?.unobserve(copy);
    }
  };
  // Prepare the same texture shortly before it enters view. Native image lazy
  // loading can fetch several later cards without preparing their textures.
  const visibilityObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
      for (const entry of entries) setActive(entry.target, entry.isIntersecting);
    }, {rootMargin: "300px 0px"})
    : null;
  for (const [index, card] of productCards.entries()) {
    card.querySelector(".product-copy").dataset.tabletopId = index;
    const image = card.querySelector(".product-photo img");
    image?.addEventListener("load", () => {
      renderedGeometry.delete(card);
      refreshTabletop(card);
    });
    if (visibilityObserver) visibilityObserver.observe(card);
    else setActive(card, true);
  }
  const refreshAll = () => productCards.forEach(refreshTabletop);
  if (!tabletopObserver) addEventListener("resize", refreshAll);
  return () => {
    visibilityObserver?.disconnect();
    tabletopObserver?.disconnect();
    cancelAnimationFrame(tabletopFrame);
    activeCards.clear();
    pendingCards.clear();
    if (!tabletopObserver) removeEventListener("resize", refreshAll);
  };
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

document.addEventListener("submit", event => {
  const form = event.target;
  if (!form.matches("form[method=post]")) return;
  if (form.dataset.submitting) {
    event.preventDefault();
    return;
  }
  form.dataset.submitting = "true";
  form.setAttribute("aria-busy", "true");
});
addEventListener("pageshow", () => document.querySelectorAll("form[data-submitting]").forEach(form => {
  delete form.dataset.submitting;
  form.removeAttribute("aria-busy");
}));
