const config = JSON.parse(document.querySelector("#contract-config").textContent);
const TEMPLATES = config.templates;
const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;
const iconUrl = config.iconsUrl;

const elements = {
  templateSelect: document.querySelector("#templateSelect"),
  templateField: document.querySelector(".template-field"),
  templateTrigger: document.querySelector("#templateTrigger"),
  templateValue: document.querySelector("#templateValue"),
  templateListbox: document.querySelector("#templateListbox"),
  form: document.querySelector("#contractForm"),
  preview: document.querySelector("#contractPreview"),
  progress: document.querySelector("#fieldProgress"),
  statusBadge: document.querySelector("#statusBadge"),
  storageBadge: document.querySelector("#storageBadge"),
  templateSummary: document.querySelector("#templateSummary"),
  stepList: document.querySelector("#stepList"),
  completionBar: document.querySelector("#completionBar"),
  exportHint: document.querySelector("#exportHint"),
  fontSizeSelect: document.querySelector("#fontSizeSelect"),
  fontSizePicker: document.querySelector("#fontSizePicker"),
  fontSizeSample: document.querySelector("#fontSizeSample"),
  missingList: document.querySelector("#missingList"),
  focusMissingButton: document.querySelector("#focusMissingButton"),
  logoInput: document.querySelector("#logoInput"),
  logoName: document.querySelector("#logoName"),
  clearLogoButton: document.querySelector("#clearLogoButton"),
  logoTools: document.querySelector("#logoTools"),
  logoSizeInput: document.querySelector("#logoSizeInput"),
  resetLogoPositionButton: document.querySelector("#resetLogoPositionButton"),
  fillSample: document.querySelector("#fillSample"),
  resetForm: document.querySelector("#resetForm"),
  downloadButton: document.querySelector("#downloadButton"),
  printButton: document.querySelector("#printButton"),
  copyButton: document.querySelector("#copyButton"),
  formPane: document.querySelector("#formPane"),
  formTitle: document.querySelector("#form-title"),
  sectionCount: document.querySelector("#sectionCount"),
  navStepCount: document.querySelector("#navStepCount"),
  previousSectionButton: document.querySelector("#previousSectionButton"),
  nextSectionButton: document.querySelector("#nextSectionButton"),
  documentStage: document.querySelector("#documentStage"),
  pageFrame: document.querySelector("#pageFrame"),
  zoomSelect: document.querySelector("#zoomSelect"),
  settingsDialog: document.querySelector("#documentSettingsDialog"),
  logoThumbnail: document.querySelector("#logoThumbnail"),
  actionToast: document.querySelector("#actionToast"),
};

const OPTIONAL_FIELDS = new Set(config.optionalFields);
const STORAGE_PREFIX = "beirit-contract-generator:";
const LOGO_STORAGE_KEY = `${STORAGE_PREFIX}logo`;
const FONT_SIZE_STORAGE_KEY = `${STORAGE_PREFIX}font-size`;
const MAX_LOGO_SIZE = 1.5 * 1024 * 1024;
let storageTimer = 0;
let firstMissingField = null;
let logoData = null;
let logoDrag = null;
let previewTimer = 0;
let previewVersion = 0;
let previewController = null;
let documentCache = null;
let activeTemplateKey = config.selectedTemplate;
let selectedSection = "parties";
let documentScale = 1;
let toastTimer = 0;
let activeTemplateOption = 0;
let templateSearch = "";
let templateSearchTime = 0;

function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `${iconUrl}#${name}`);
  svg.append(use);
  return svg;
}

function closeMenus() {
  document.querySelectorAll(".toolbar-menu[open]").forEach((menu) => { menu.open = false; });
  closeTemplatePicker();
}

function showToast(text) {
  window.clearTimeout(toastTimer);
  elements.actionToast.textContent = text;
  elements.actionToast.hidden = false;
  toastTimer = window.setTimeout(() => { elements.actionToast.hidden = true; }, 2600);
}

function setView(view) {
  closeMenus();
  document.body.dataset.view = view;
  document.querySelectorAll(".view-tabs [role=tab]").forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  if (!window.matchMedia("(min-width: 1024px)").matches) window.scrollTo(0, 0);
  window.requestAnimationFrame(updateDocumentZoom);
}

function selectSection(key, scroll = false) {
  const groups = getGroups();
  const index = groups.findIndex(([groupKey]) => groupKey === key);
  if (index < 0) return;
  selectedSection = key;
  elements.form.querySelectorAll(".field-group").forEach((group) => { group.hidden = group.dataset.group !== key; });
  elements.stepList.querySelectorAll("li").forEach((step) => {
    const active = step.dataset.group === key;
    step.classList.toggle("is-active", active);
    const button = step.querySelector("button");
    if (active) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  elements.formTitle.textContent = groups[index][1];
  elements.sectionCount.textContent = `${index + 1} von ${groups.length}`;
  elements.navStepCount.textContent = `${index + 1} / ${groups.length}`;
  elements.previousSectionButton.disabled = index === 0;
  const last = index === groups.length - 1;
  elements.nextSectionButton.dataset.last = String(last);
  elements.nextSectionButton.querySelector("span").textContent = last ? "Dokument prüfen" : "Weiter";
  elements.nextSectionButton.querySelector("svg").replaceWith(icon(last ? "eye" : "chevron-right"));
  if (scroll) {
    elements.formPane.scrollTop = 0;
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      window.scrollTo(0, 0);
      elements.stepList.querySelector("[aria-current=step]").scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }
}

function updateDocumentZoom() {
  const stage = elements.documentStage;
  if (!stage.clientWidth || !elements.preview.offsetHeight) return;
  const style = getComputedStyle(stage);
  const availableWidth = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  documentScale = elements.zoomSelect.value === "fit" ? Math.min(1, availableWidth / 794) : Number(elements.zoomSelect.value);
  elements.preview.style.transform = `scale(${documentScale})`;
  elements.pageFrame.style.width = `${Math.ceil(794 * documentScale)}px`;
  elements.pageFrame.style.height = `${Math.ceil(elements.preview.offsetHeight * documentScale)}px`;
  document.querySelector("#zoomOutButton").disabled = documentScale <= 0.5;
  document.querySelector("#zoomInButton").disabled = documentScale >= 1.5;
}

function changeZoom(direction) {
  const levels = [0.5, 0.75, 1, 1.25, 1.5];
  const target = direction > 0 ? levels.find((level) => level > documentScale + 0.01)
    : levels.slice().reverse().find((level) => level < documentScale - 0.01);
  if (target === undefined) return;
  elements.zoomSelect.value = String(target);
  updateDocumentZoom();
}

function todayStamp() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function getTemplate() {
  return TEMPLATES[elements.templateSelect.value] ?? TEMPLATES.rent;
}

function getData(template = getTemplate()) {
  return Object.fromEntries(template.fields.map(([, , name]) => [name, elements.form.elements[name]?.value || ""]));
}

function requestBody() {
  return new URLSearchParams({ template: elements.templateSelect.value, ...getData() });
}

function documentKey() {
  return requestBody().toString();
}

function storageKey() {
  return `${STORAGE_PREFIX}${elements.templateSelect.value || "rent"}`;
}

function setStorageBadge(text, state = "") {
  elements.storageBadge.textContent = text;
  elements.storageBadge.dataset.state = state;
}

function normalizeLogoData(data) {
  if (!data?.src) return null;
  return {
    name: data.name || "Logo",
    src: data.src,
    size: Number.isFinite(Number(data.size)) ? Number(data.size) : 150,
    x: Number.isFinite(Number(data.x)) ? Number(data.x) : 0,
    y: Number.isFinite(Number(data.y)) ? Number(data.y) : 0,
  };
}

function setLogoState(data) {
  logoData = normalizeLogoData(data);
  elements.logoName.textContent = data?.name || "Kein Logo ausgewählt";
  elements.logoThumbnail.hidden = !logoData;
  if (logoData) elements.logoThumbnail.src = logoData.src;
  else elements.logoThumbnail.removeAttribute("src");
  elements.clearLogoButton.hidden = !logoData;
  elements.logoTools.hidden = !logoData;
  if (logoData) elements.logoSizeInput.value = String(logoData.size);
  updatePreview();
}

function readDraft() {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey()) || "null");
  } catch {
    return null;
  }
}

function readLogo() {
  try {
    return JSON.parse(window.localStorage.getItem(LOGO_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function readFontSize() {
  try {
    return window.localStorage.getItem(FONT_SIZE_STORAGE_KEY) || "normal";
  } catch {
    return "normal";
  }
}

function applyData(data) {
  Object.entries(data || {}).forEach(([key, fieldValue]) => {
    const field = elements.form.elements[key];
    if (field) field.value = fieldValue;
  });
}

function saveDraft() {
  window.clearTimeout(storageTimer);
  storageTimer = 0;
  try {
    window.localStorage.setItem(storageKey(), JSON.stringify(getData()));
    setStorageBadge("Gespeichert", "saved");
  } catch {
    setStorageBadge("Speichern blockiert", "warning");
  }
}

function saveLogo(data) {
  try {
    if (data) {
      window.localStorage.setItem(LOGO_STORAGE_KEY, JSON.stringify(normalizeLogoData(data)));
      setStorageBadge("Logo gespeichert", "saved");
    } else {
      window.localStorage.removeItem(LOGO_STORAGE_KEY);
      setStorageBadge("Logo entfernt", "warning");
    }
  } catch {
    setStorageBadge("Logo zu groß", "warning");
  }
}

function saveFontSize(size) {
  try {
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
  } catch {
    setStorageBadge("Schriftgröße nicht gespeichert", "warning");
  }
}

function applyFontSize(size) {
  if (!["small", "normal", "large"].includes(size)) size = "normal";
  elements.fontSizeSelect.value = size;
  elements.preview.dataset.fontSize = size;
  elements.fontSizeSample.dataset.fontSize = size;
  elements.fontSizePicker.querySelectorAll("button").forEach((button) => {
    const active = button.dataset.size === size;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  window.requestAnimationFrame(updateDocumentZoom);
}

function scheduleSave() {
  window.clearTimeout(storageTimer);
  setStorageBadge("Speichert...", "pending");
  storageTimer = window.setTimeout(saveDraft, 220);
}

function clearDraft() {
  try {
    window.localStorage.removeItem(storageKey());
    setStorageBadge("Geleert", "warning");
  } catch {
    setStorageBadge("Speichern blockiert", "warning");
  }
}

function getGroups(template = getTemplate()) {
  return Array.from(new Map(template.fields.map(([groupKey, groupLabel]) => [groupKey, groupLabel])).entries());
}

function getFieldMeta(name, template = getTemplate()) {
  const field = template.fields.find(([, , fieldName]) => fieldName === name);
  return field ? { groupKey: field[0], groupLabel: field[1], label: field[3] } : { label: name };
}

function renderTemplateOptions() {
  elements.templateSelect.replaceChildren(
    ...Object.entries(TEMPLATES).map(([key, template]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = template.label;
      return option;
    })
  );
  elements.templateListbox.replaceChildren(...Object.entries(TEMPLATES).map(([key, template]) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "template-option";
    option.id = `template-option-${key}`;
    option.dataset.template = key;
    option.setAttribute("role", "option");
    option.tabIndex = -1;
    const label = document.createElement("span");
    label.textContent = template.label;
    option.append(label, icon("check"));
    option.addEventListener("click", () => {
      closeTemplatePicker();
      selectTemplate(key);
      elements.templateTrigger.focus({ preventScroll: true });
    });
    return option;
  }));
  elements.templateSelect.hidden = true;
  elements.templateTrigger.hidden = false;
}

function syncTemplatePicker() {
  elements.templateValue.textContent = getTemplate().label;
  elements.templateListbox.querySelectorAll("[role=option]").forEach((option) => {
    option.setAttribute("aria-selected", String(option.dataset.template === elements.templateSelect.value));
  });
}

function closeTemplatePicker() {
  const restoreFocus = elements.templateListbox.contains(document.activeElement);
  elements.templateListbox.hidden = true;
  elements.templateTrigger.setAttribute("aria-expanded", "false");
  elements.templateTrigger.removeAttribute("aria-activedescendant");
  templateSearch = "";
  if (restoreFocus) elements.templateTrigger.focus({ preventScroll: true });
}

function activateTemplateOption(index) {
  const options = [...elements.templateListbox.children];
  activeTemplateOption = Math.max(0, Math.min(index, options.length - 1));
  options.forEach((option, position) => option.classList.toggle("is-active", position === activeTemplateOption));
  const active = options[activeTemplateOption];
  elements.templateTrigger.setAttribute("aria-activedescendant", active.id);
  active.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function fitTemplatePicker() {
  if (elements.templateListbox.hidden) return;
  const top = elements.templateListbox.getBoundingClientRect().top;
  elements.templateListbox.style.maxHeight = `${Math.max(0, Math.min(260, window.innerHeight - top - 8))}px`;
}

function openTemplatePicker() {
  closeMenus();
  elements.templateListbox.hidden = false;
  elements.templateTrigger.setAttribute("aria-expanded", "true");
  fitTemplatePicker();
  activateTemplateOption(Object.keys(TEMPLATES).indexOf(elements.templateSelect.value));
}

function handleTemplateKey(event) {
  const open = !elements.templateListbox.hidden;
  if (event.key === "Tab" || event.key === "Escape") {
    closeTemplatePicker();
    if (open && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); }
    return;
  }
  if (["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    if (!open) openTemplatePicker();
    if (event.key === "Home") activateTemplateOption(0);
    else if (event.key === "End") activateTemplateOption(Object.keys(TEMPLATES).length - 1);
    else if (open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      activateTemplateOption(activeTemplateOption + (event.key === "ArrowDown" ? 1 : -1));
    } else if (open && ["Enter", " "].includes(event.key)) {
      elements.templateListbox.children[activeTemplateOption].click();
    }
    return;
  }
  if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return;
  event.preventDefault();
  if (!open) openTemplatePicker();
  const now = Date.now();
  templateSearch = (now - templateSearchTime < 700 ? templateSearch : "") + event.key.toLocaleLowerCase("de");
  templateSearchTime = now;
  const index = Object.values(TEMPLATES).findIndex((template) => template.label.toLocaleLowerCase("de").startsWith(templateSearch));
  if (index >= 0) activateTemplateOption(index);
}

function selectTemplate(key, force = false) {
  if (!TEMPLATES[key] || (!force && elements.templateSelect.value === key)) return;
  if (storageTimer) {
    window.clearTimeout(storageTimer);
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${activeTemplateKey}`, JSON.stringify(getData(TEMPLATES[activeTemplateKey])));
    } catch {
      setStorageBadge("Speichern blockiert", "warning");
    }
    storageTimer = 0;
  }
  elements.templateSelect.value = key;
  renderForm();
  if (!readDraft()) fillSample();
}

function renderForm() {
  activeTemplateKey = elements.templateSelect.value;
  syncTemplatePicker();
  const template = getTemplate();
  elements.templateSummary.textContent = template.summary;
  const groups = getGroups(template);
  const groupNodes = groups.map(([groupKey, groupLabel], index) => {
    const group = document.createElement("fieldset");
    group.className = "field-group";
    group.dataset.group = groupKey;

    const legend = document.createElement("legend");
    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    legend.append(number, document.createTextNode(groupLabel));
    group.append(legend);

    const grid = document.createElement("div");
    grid.className = "field-grid";

    template.fields
      .filter(([fieldGroup]) => fieldGroup === groupKey)
      .forEach(([, , name, label, type, placeholder]) => {
        const wrapper = document.createElement("div");
        wrapper.className = `field ${type === "textarea" ? "field--wide" : ""}`;

        const labelElement = document.createElement("label");
        labelElement.htmlFor = name;
        labelElement.textContent = label;
        const annotation = document.createElement("span");
        annotation.className = OPTIONAL_FIELDS.has(name) ? "field-optional" : "required-mark";
        annotation.textContent = OPTIONAL_FIELDS.has(name) ? "Optional" : "*";
        if (!OPTIONAL_FIELDS.has(name)) annotation.setAttribute("aria-hidden", "true");
        labelElement.append(annotation);

        const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
        input.id = name;
        input.name = name;
        input.required = !OPTIONAL_FIELDS.has(name);
        input.placeholder = placeholder;
        input.autocomplete = "off";
        input.setAttribute("aria-describedby", `${name}-error`);
        if (type !== "textarea") input.type = type;
        if (type === "number") {
          input.step = "0.01";
          input.min = "0";
        } else if (type !== "date") {
          input.maxLength = 5000;
        }

        const error = document.createElement("small");
        error.id = `${name}-error`;

        let control = input;
        if (type === "number") {
          control = document.createElement("div");
          control.className = "amount-control";
          const currency = document.createElement("span");
          currency.className = "field-unit";
          currency.textContent = "€";
          currency.setAttribute("aria-hidden", "true");
          input.setAttribute("aria-label", `${label} in Euro`);
          control.append(input, currency);
        }
        wrapper.append(labelElement, control, error);
        grid.append(wrapper);
      });

    group.append(grid);
    return group;
  });

  elements.form.replaceChildren(...groupNodes);
  for (const [name, value] of Object.entries({ csrfmiddlewaretoken: csrfToken, template: elements.templateSelect.value })) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    elements.form.prepend(input);
  }
  renderStepList();
  selectSection(getGroups()[0][0]);
  const draft = readDraft();
  if (draft) {
    applyData(draft);
    setStorageBadge("Entwurf geladen", "saved");
  } else {
    setStorageBadge("Lokal", "");
  }
  updatePreview();
}

function renderStepList() {
  const steps = getGroups().map(([groupKey, groupLabel], index) => {
    const item = document.createElement("li");
    item.dataset.group = groupKey;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "step-button";
    button.addEventListener("click", () => { setView("form"); selectSection(groupKey, true); });
    const number = document.createElement("span");
    number.className = "step-number";
    const digit = document.createElement("span");
    digit.textContent = String(index + 1).padStart(2, "0");
    number.append(digit, icon("check"));
    const copy = document.createElement("span");
    copy.className = "step-copy";
    const title = document.createElement("strong");
    title.textContent = groupLabel;
    const detail = document.createElement("small");
    detail.textContent = `${getTemplate().fields.filter(([key]) => key === groupKey).length} Angaben`;
    copy.append(title, detail);
    button.append(number, copy);
    item.append(button);
    return item;
  });
  elements.stepList.replaceChildren(...steps);
}

function validateFields(serverErrors = documentCache?.key === documentKey() ? documentCache.errors : {}) {
  const fields = Array.from(elements.form.querySelectorAll('input:not([type="hidden"]), textarea'));
  const requiredFields = fields.filter((field) => field.required);
  const missingFields = [];
  let validRequired = 0;

  fields.forEach((field) => {
    const messages = serverErrors[field.name];
    const filled = Boolean(field.value.trim());
    const isValid = !messages && ((!field.required && !filled) || (filled && field.validity.valid));
    field.setAttribute("aria-invalid", String(!isValid));
    const error = document.querySelector(`#${field.id}-error`);
    if (error) error.textContent = isValid ? "" : messages?.join(" ") || (filled ? "Ungültige Angabe" : "Pflichtfeld");
    if (field.required && isValid) validRequired += 1;
    if (!isValid) missingFields.push(field);
  });

  const completion = requiredFields.length ? Math.round((validRequired / requiredFields.length) * 100) : 100;
  const complete = missingFields.length === 0;
  firstMissingField = missingFields[0] || null;
  elements.progress.textContent = `${validRequired}/${requiredFields.length}`;
  elements.statusBadge.textContent = complete ? "Bereit zum Export" : "Entwurf unvollständig";
  elements.statusBadge.classList.toggle("is-complete", complete);
  elements.completionBar.style.width = `${completion}%`;
  elements.completionBar.parentElement.setAttribute("aria-valuenow", String(completion));
  document.querySelector(".feedback-icon").replaceChildren(icon(complete ? "circle-check" : "circle-alert"));
  document.querySelector(".document-feedback").classList.toggle("is-incomplete", !complete);
  elements.exportHint.textContent = complete
    ? "Alle Pflichtangaben sind ausgefüllt. Der Entwurf kann kopiert, heruntergeladen oder gedruckt werden."
    : `${missingFields.length} Angaben fehlen oder sind ungültig. Leere Stellen bleiben im Entwurf sichtbar.`;
  renderMissingList(missingFields);

  getGroups().forEach(([groupKey]) => {
    const groupFields = fields.filter((field) => field.closest("[data-group]")?.dataset.group === groupKey);
    const groupDone = groupFields.length > 0 && groupFields.every((field) => field.getAttribute("aria-invalid") === "false");
    const step = elements.stepList.querySelector(`[data-group="${groupKey}"]`);
    step?.classList.toggle("is-complete", groupDone);
    step?.classList.toggle("is-active", groupKey === selectedSection);
  });
}

function renderMissingList(missingFields) {
  const items = missingFields.slice(0, 5).map((field) => {
    const meta = getFieldMeta(field.name);
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = meta.groupLabel ? `${meta.groupLabel}: ${meta.label}` : meta.label;
    button.addEventListener("click", () => focusField(field));
    item.append(button);
    return item;
  });
  elements.missingList.replaceChildren(...items);
  elements.missingList.hidden = missingFields.length === 0;
  elements.focusMissingButton.hidden = missingFields.length === 0;
}

function focusField(field) {
  if (!field) return;
  closeMenus();
  setView("form");
  selectSection(field.closest(".field-group").dataset.group, true);
  window.requestAnimationFrame(() => {
    field.focus({ preventScroll: true });
    field.scrollIntoView({ block: "center", behavior: "instant" });
  });
}

function clampLogoPosition(x, y) {
  return {
    x: Math.max(-24, Math.min(320, Math.round(x))),
    y: Math.max(-20, Math.min(44, Math.round(y))),
  };
}

function updateLogoLayout() {
  const image = elements.preview.querySelector(".preview-brand img");
  if (!image || !logoData) return;
  image.style.width = `${logoData.size}px`;
  image.style.transform = `translate(${logoData.x}px, ${logoData.y}px)`;
}

function persistLogoLayout() {
  if (!logoData) return;
  saveLogo(logoData);
  updateLogoLayout();
}

function beginLogoDrag(event) {
  if (!logoData) return;
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
  logoDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    logoX: logoData.x,
    logoY: logoData.y,
  };
}

function moveLogoDrag(event) {
  if (!logoDrag || logoDrag.pointerId !== event.pointerId || !logoData) return;
  const next = clampLogoPosition(
    logoDrag.logoX + (event.clientX - logoDrag.startX) / documentScale,
    logoDrag.logoY + (event.clientY - logoDrag.startY) / documentScale
  );
  logoData.x = next.x;
  logoData.y = next.y;
  updateLogoLayout();
}

function endLogoDrag(event) {
  if (!logoDrag || logoDrag.pointerId !== event.pointerId) return;
  logoDrag = null;
  persistLogoLayout();
}

function previewText(content) {
  const lines = content
    .split("\n")
    .filter((line) => !line.trim().startsWith("Unterschrift "))
    .join("\n")
    .trim()
    .split("\n");

  lines.shift();
  return lines.join("\n").trim();
}

function renderPreviewText(content) {
  const body = document.createElement("div");
  body.className = "preview-text";
  const lines = previewText(content).split("\n");
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join("\n").trim();
    if (text) {
      const item = document.createElement("p");
      item.textContent = text;
      body.append(item);
    }
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      const heading = document.createElement("h4");
      heading.className = "clause-heading";
      heading.textContent = trimmed;
      body.append(heading);
      return;
    }

    if (trimmed.endsWith(":") && trimmed.length <= 48) {
      flushParagraph();
      const label = document.createElement("p");
      label.className = "document-label";
      label.textContent = trimmed;
      body.append(label);
      return;
    }

    paragraph.push(line);
  });

  flushParagraph();
  return body;
}

function renderSignatureArea(template) {
  const wrapper = document.createElement("section");
  wrapper.className = "signature-area";

  const title = document.createElement("h4");
  title.textContent = "Unterschriften";
  wrapper.append(title);

  const grid = document.createElement("div");
  grid.className = "signature-grid";
  template.signatures.forEach((label) => {
    const card = document.createElement("div");
    card.className = "signature-card";

    const line = document.createElement("span");
    line.className = "signature-line";
    line.setAttribute("aria-hidden", "true");

    const caption = document.createElement("span");
    caption.className = "signature-label";
    caption.textContent = label;

    const meta = document.createElement("small");
    meta.textContent = "Ort, Datum und Unterschrift";

    card.append(line, caption, meta);
    grid.append(card);
  });

  wrapper.append(grid);
  return wrapper;
}

function renderDocument(content) {
  const template = getTemplate();
  elements.preview.replaceChildren();
  applyFontSize(elements.fontSizeSelect.value);
  const masthead = document.createElement("div");
  masthead.className = "document-masthead";
  const documentType = document.createElement("span");
  documentType.textContent = "VERTRAGSENTWURF";
  const draftStatus = document.createElement("span");
  draftStatus.textContent = "ENTWURF";
  masthead.append(documentType, draftStatus);
  elements.preview.append(masthead);

  if (logoData?.src) {
    const brand = document.createElement("div");
    brand.className = "preview-brand";
    const image = document.createElement("img");
    image.src = logoData.src;
    image.alt = logoData.name ? `Logo: ${logoData.name}` : "Logo";
    image.title = "Logo ziehen, um es zu verschieben";
    image.addEventListener("pointerdown", beginLogoDrag);
    image.addEventListener("pointermove", moveLogoDrag);
    image.addEventListener("pointerup", endLogoDrag);
    image.addEventListener("pointercancel", endLogoDrag);
    brand.append(image);
    elements.preview.append(brand);
    updateLogoLayout();
  }

  const heading = document.createElement("h3");
  heading.textContent = template.label;
  elements.preview.append(heading, renderPreviewText(content), renderSignatureArea(template));
  window.requestAnimationFrame(updateDocumentZoom);
}

function setExportPending(pending) {
  elements.preview.setAttribute("aria-busy", String(pending));
  [elements.copyButton, elements.downloadButton, elements.printButton].forEach((button) => {
    button.disabled = pending;
  });
}

async function refreshDocument() {
  const key = documentKey();
  const version = ++previewVersion;
  previewController?.abort();
  previewController = new AbortController();
  setExportPending(true);
  try {
    const response = await fetch(config.previewUrl, {
      method: "POST", body: requestBody(), credentials: "same-origin",
      headers: { "X-CSRFToken": csrfToken }, signal: previewController.signal,
    });
    if (!response.ok) throw new Error("Die Vorschau konnte nicht geladen werden.");
    const result = await response.json();
    if (version !== previewVersion || key !== documentKey()) return null;
    documentCache = { key, ...result };
    renderDocument(result.text);
    validateFields(result.errors);
    setExportPending(false);
    return documentCache;
  } catch (error) {
    if (error.name === "AbortError" || version !== previewVersion) return null;
    elements.statusBadge.textContent = "Vorschau nicht aktuell";
    elements.exportHint.textContent = "Vorschau nicht erreichbar. Eingaben bleiben lokal gespeichert. Bitte erneut exportieren oder ein Feld ändern.";
    setExportPending(false);
    return null;
  }
}

function updatePreview() {
  window.clearTimeout(previewTimer);
  ++previewVersion;
  previewController?.abort();
  validateFields();
  setExportPending(true);
  previewTimer = window.setTimeout(refreshDocument, 180);
}

async function currentDocument() {
  window.clearTimeout(previewTimer);
  const result = documentCache?.key === documentKey() ? documentCache : await refreshDocument();
  if (!result) return null;
  if (result.invalidFields.length) {
    elements.exportHint.textContent = "Bitte korrigiere die ungültigen Angaben vor dem Export.";
    focusField(elements.form.elements[result.invalidFields[0]]);
    return null;
  }
  return result;
}

function fillSample() {
  closeMenus();
  Object.entries(getTemplate().sample).forEach(([key, sampleValue]) => {
    const field = elements.form.elements[key];
    if (field) field.value = sampleValue;
  });
  updatePreview();
  saveDraft();
}

async function downloadText() {
  closeMenus();
  if (!await currentDocument()) return;
  const filename = `${todayStamp()}-${getTemplate().fileName}`;
  try {
    const response = await fetch(config.downloadUrl, {
      method: "POST", body: requestBody(), credentials: "same-origin",
      headers: { "X-CSRFToken": csrfToken },
    });
    if (!response.ok) throw new Error("Download fehlgeschlagen");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    showToast("Text heruntergeladen");
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    elements.exportHint.textContent = "Download nicht möglich. Bitte versuche es erneut.";
  }
}

async function copyText() {
  closeMenus();
  const result = await currentDocument();
  if (!result) return;
  try {
    await navigator.clipboard.writeText(result.text);
    elements.copyButton.querySelector("span").textContent = "Kopiert";
    showToast("Text in die Zwischenablage kopiert");
    window.setTimeout(() => {
      elements.copyButton.querySelector("span").textContent = "Text kopieren";
    }, 1400);
  } catch {
    elements.exportHint.textContent = "Kopieren wurde vom Browser blockiert. Bitte nutze Download oder Drucken.";
  }
}

function handleLogoUpload() {
  const file = elements.logoInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    elements.logoName.textContent = "Bitte eine Bilddatei auswählen.";
    elements.logoInput.value = "";
    return;
  }
  if (file.size > MAX_LOGO_SIZE) {
    elements.logoName.textContent = "Bild ist zu groß. Maximal 1,5 MB.";
    elements.logoInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const data = { name: file.name, src: reader.result, size: 150, x: 0, y: 0 };
    setLogoState(data);
    saveLogo(data);
  });
  reader.addEventListener("error", () => {
    elements.logoName.textContent = "Bild konnte nicht gelesen werden.";
  });
  reader.readAsDataURL(file);
}

function clearLogo() {
  elements.logoInput.value = "";
  setLogoState(null);
  saveLogo(null);
}

function resizeLogo() {
  if (!logoData) return;
  logoData.size = Number(elements.logoSizeInput.value);
  updateLogoLayout();
  saveLogo(logoData);
}

function resetLogoPosition() {
  if (!logoData) return;
  logoData.x = 0;
  logoData.y = 0;
  persistLogoLayout();
}

elements.templateSelect.addEventListener("change", () => {
  closeTemplatePicker();
  selectTemplate(elements.templateSelect.value, true);
});
elements.templateTrigger.addEventListener("click", () => {
  if (elements.templateListbox.hidden) openTemplatePicker();
  else closeTemplatePicker();
});
elements.templateTrigger.addEventListener("keydown", handleTemplateKey);
window.addEventListener("resize", fitTemplatePicker);
elements.templateField.addEventListener("focusout", (event) => {
  if (!elements.templateField.contains(event.relatedTarget)) closeTemplatePicker();
});
elements.form.addEventListener("input", () => {
  updatePreview();
  scheduleSave();
});
elements.form.addEventListener("focusin", () => validateFields());
elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  downloadText();
});
elements.fillSample.addEventListener("click", fillSample);
elements.resetForm.addEventListener("click", () => {
  closeMenus();
  window.clearTimeout(storageTimer);
  storageTimer = 0;
  elements.form.reset();
  clearDraft();
  updatePreview();
});
elements.logoInput.addEventListener("change", handleLogoUpload);
elements.clearLogoButton.addEventListener("click", clearLogo);
elements.logoSizeInput.addEventListener("input", resizeLogo);
elements.resetLogoPositionButton.addEventListener("click", resetLogoPosition);
elements.fontSizePicker.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-size]");
  if (!button) return;
  saveFontSize(button.dataset.size);
  applyFontSize(button.dataset.size);
});
elements.downloadButton.addEventListener("click", downloadText);
elements.printButton.addEventListener("click", async () => {
  closeMenus();
  if (!await currentDocument()) return;
  const previousTitle = document.title;
  const restoreTitle = () => {
    document.title = previousTitle;
  };
  document.title = `${todayStamp()} ${getTemplate().label}`;
  window.addEventListener("afterprint", restoreTitle, { once: true });
  window.print();
  window.setTimeout(restoreTitle, 1200);
});
elements.copyButton.addEventListener("click", copyText);
elements.focusMissingButton.addEventListener("click", () => {
  if (firstMissingField) focusField(firstMissingField);
});
window.addEventListener("pagehide", () => {
  if (storageTimer) saveDraft();
});

document.querySelectorAll(".view-tabs [role=tab]").forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === "Home" ? "form" : event.key === "End" ? "document"
      : tab.dataset.view === "form" ? "document" : "form";
    setView(target);
    document.querySelector(`.view-tabs [data-view="${target}"]`).focus();
  });
});
elements.previousSectionButton.addEventListener("click", () => {
  const groups = getGroups();
  const index = groups.findIndex(([key]) => key === selectedSection);
  if (index > 0) selectSection(groups[index - 1][0], true);
});
elements.nextSectionButton.addEventListener("click", () => {
  const groups = getGroups();
  const index = groups.findIndex(([key]) => key === selectedSection);
  if (index === groups.length - 1) {
    setView("document");
    if (!window.matchMedia("(min-width: 1024px)").matches) document.querySelector("#documentTab").focus({ preventScroll: true });
  } else selectSection(groups[index + 1][0], true);
});
document.querySelector("#showPreviewButton").addEventListener("click", () => {
  setView("document");
  elements.preview.focus({ preventScroll: true });
});
elements.zoomSelect.addEventListener("change", updateDocumentZoom);
document.querySelector("#zoomOutButton").addEventListener("click", () => changeZoom(-1));
document.querySelector("#zoomInButton").addEventListener("click", () => changeZoom(1));
document.querySelector("#openSettingsButton").addEventListener("click", () => {
  closeMenus();
  elements.settingsDialog.showModal();
  document.body.classList.add("dialog-open");
});
for (const id of ["closeSettingsButton", "doneSettingsButton"]) {
  document.querySelector(`#${id}`).addEventListener("click", () => elements.settingsDialog.close());
}
elements.settingsDialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
elements.settingsDialog.addEventListener("click", (event) => {
  if (event.target !== elements.settingsDialog) return;
  const bounds = elements.settingsDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) elements.settingsDialog.close();
});
document.addEventListener("click", (event) => {
  if (!elements.templateField.contains(event.target)) closeTemplatePicker();
  document.querySelectorAll(".toolbar-menu[open]").forEach((menu) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});
document.querySelectorAll(".toolbar-menu").forEach((menu) => {
  menu.addEventListener("toggle", () => {
    if (menu.open) closeTemplatePicker();
    if (menu.open) document.querySelectorAll(".toolbar-menu").forEach((other) => {
      if (other !== menu) other.open = false;
    });
  });
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenus(); });
const documentObserver = new ResizeObserver(updateDocumentZoom);
documentObserver.observe(elements.documentStage);
documentObserver.observe(elements.preview);

document.body.classList.add("is-enhanced");
renderTemplateOptions();
elements.templateSelect.value = config.selectedTemplate;
elements.fontSizeSelect.value = readFontSize();
applyFontSize(elements.fontSizeSelect.value);
setLogoState(readLogo());
renderForm();
if (!readDraft()) fillSample();
