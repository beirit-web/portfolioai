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

// Continue the tabletop using clean grain near the photo's bottom, where no
// plate or packaging enters the texture. Keep the visible edge only at the join.
// Reuse the loaded photo, and batch geometry reads before background writes.
const productCards = [...document.querySelectorAll(".product-card")];
if (productCards.length) {
  const colourSample = document.createElement("canvas");
  colourSample.width = 64;
  colourSample.height = 1;
  const sampleContext = colourSample.getContext("2d", {willReadFrequently: true});
  const edgeColour = (image, x, y, width) => {
    // External admin images may taint a canvas even when the image itself loads.
    // Reset its bitmap between cards so that one such image cannot poison others.
    colourSample.width = 64;
    if (!sampleContext) return { value: "rgb(245 245 245)", luminance: 1 };
    try {
    sampleContext.drawImage(image, x, y, width, 1, 0, 0, colourSample.width, 1);
    const pixels = sampleContext.getImageData(0, 0, colourSample.width, 1).data;
    const channels = [0, 0, 0];
    for (let index = 0; index < pixels.length; index += 4) {
      for (let channel = 0; channel < 3; channel++) channels[channel] += pixels[index + channel];
    }
    const rgb = channels.map(value => Math.round(value / colourSample.width));
    const linear = rgb.map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return {value: `rgb(${rgb.join(" ")})`, luminance: linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722};
    } catch {
      return { value: "rgb(245 245 245)", luminance: 1 };
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
    // Separate the photo's fine grain from its shading so repeated strips do
    // not create bands. Continue the edge colour beneath that original grain.
    const filter = svgNode("filter", {id: `${id}-grain`, x: "-10%", y: "-10%", width: "120%", height: "120%",
      "color-interpolation-filters": "sRGB"}, [
      svgNode("feGaussianBlur", {stdDeviation: 4, result: "shading"}),
      svgNode("feComposite", {in: "SourceGraphic", in2: "shading", operator: "arithmetic",
        k1: 0, k2: 1, k3: -1, k4: .5}),
      // Keep the grain centred on opaque 50% grey for the overlay blend.
      svgNode("feColorMatrix", {type: "matrix", values: ".75 0 0 0 -.25 0 .75 0 0 -.25 0 0 .75 0 -.25 0 0 0 0 1"}),
    ]);
    const edge = svgNode("pattern", {id: `${id}-edge`, patternUnits: "userSpaceOnUse", width: background.width,
      height: 1}, [svgNode("svg", {width: background.width, height: 1,
        viewBox: `${background.cropX} ${background.edgeY - 1} ${background.cropWidth} 1`,
        preserveAspectRatio: "none"}, [photo.cloneNode(true)])]);
    const soften = svgNode("filter", {id: `${id}-soften`, x: "-10%", y: "-10%", width: "120%", height: "120%",
      "color-interpolation-filters": "sRGB"}, [
      svgNode("feGaussianBlur", {stdDeviation: 16}),
    ]);
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
    const shadowMask = svgNode("mask", {id: `${id}-shadow`, maskUnits: "userSpaceOnUse", x: 0, y: 0,
      width: background.width, height: 100}, [
      svgNode("rect", {width: background.width, height: 100, fill: `url(#${id}-transition)`}),
    ]);
    const texture = svgNode("svg", {class: "product-tabletop", "aria-hidden": "true", focusable: "false",
      viewBox: `0 0 ${background.width} ${background.height}`, preserveAspectRatio: "none"}, [
      svgNode("defs", {}, [pattern, edge, filter, soften, transition, edgeMask, shadowMask]),
      svgNode("rect", {...bounds, fill: background.colour}),
      // Keep the edge shading subtle enough for text over the tabletop.
      svgNode("rect", {...bounds, fill: `url(#${id}-edge)`, filter: `url(#${id}-soften)`,
        mask: `url(#${id}-shadow)`, opacity: .35}),
      svgNode("rect", {...bounds, fill: `url(#${id})`, filter: `url(#${id}-grain)`,
        style: "mix-blend-mode:overlay"}),
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
        if (!image?.naturalWidth || !copy) return null;
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
        return { card: element, geometry, copy, image: source, naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight, width: copyBox.width, height: copyBox.height,
          cropX, cropWidth, colour: colour.value,
          textTone: colour.luminance < .18 ? "light" : Math.min(colour.luminance, edge.luminance) < .6 ? "strong" : "default",
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
  // loading can fetch several later cards without requiring their SVG filters.
  const visibilityObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
      for (const entry of entries) setActive(entry.target, entry.isIntersecting);
    }, {rootMargin: "300px 0px"})
    : null;
  for (const [index, card] of productCards.entries()) {
    card.querySelector(".product-copy").dataset.tabletopId = index;
    const image = card.querySelector(".product-photo img");
    image?.addEventListener("load", () => refreshTabletop(card));
    if (visibilityObserver) visibilityObserver.observe(card);
    else setActive(card, true);
  }
  if (!tabletopObserver) window.addEventListener("resize", () => productCards.forEach(refreshTabletop));
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
