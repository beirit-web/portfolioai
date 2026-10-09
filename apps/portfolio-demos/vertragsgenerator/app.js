const TEMPLATES = {
  rent: {
    label: "Mietvertrag",
    fileName: "mietvertrag-entwurf.txt",
    summary: "Wohnraummiete mit Parteien, Objekt, Zahlung und Zusatzvereinbarungen.",
    signatures: ["Vermieter", "Mieter"],
    fields: [
      ["parties", "Parteien", "vermieter", "Vermieter", "textarea", "Max Vermieter, Vermieterweg 1, 12345 Musterstadt"],
      ["parties", "Parteien", "mieter", "Mieter", "textarea", "Mira Mieterin, Mieterstraße 8, 12345 Musterstadt"],
      ["object", "Objekt", "adresse", "Mietobjekt", "textarea", "Musterstraße 12, 2. OG links, 12345 Musterstadt"],
      ["object", "Objekt", "beginn", "Mietbeginn", "date", ""],
      ["payment", "Zahlung", "miete", "Monatliche Miete", "number", "850"],
      ["payment", "Zahlung", "kaution", "Kaution", "number", "1700"],
      ["payment", "Zahlung", "zahlbarBis", "Zahlbar bis", "text", "jeweils zum 3. Werktag eines Monats"],
      ["terms", "Vereinbarungen", "uebergabe", "Übergabezustand", "textarea", "Die Wohnung wird renoviert und besenrein übergeben."],
      ["terms", "Vereinbarungen", "zusatz", "Weitere Vereinbarungen", "textarea", "Haustiere nur nach vorheriger schriftlicher Zustimmung."],
      ["closing", "Abschluss", "ort", "Ort", "text", "Musterstadt"],
      ["closing", "Abschluss", "datum", "Datum", "date", ""],
    ],
    sample: {
      vermieter: "Max Vermieter, Vermieterweg 1, 12345 Musterstadt",
      mieter: "Mira Mieterin, Mieterstraße 8, 12345 Musterstadt",
      adresse: "Musterstraße 12, 2. OG links, 12345 Musterstadt",
      beginn: "2026-01-01",
      miete: "850",
      kaution: "1700",
      zahlbarBis: "jeweils zum 3. Werktag eines Monats",
      uebergabe: "Die Wohnung wird renoviert und besenrein übergeben.",
      zusatz: "Haustiere nur nach vorheriger schriftlicher Zustimmung.",
      ort: "Musterstadt",
      datum: "2026-01-01",
    },
    render: (data) => `Mietvertrag

Zwischen
Vermieter:
${value(data.vermieter)}

und
Mieter:
${value(data.mieter)}

wird folgender Mietvertrag geschlossen.

1. Mietobjekt
${value(data.adresse)}

2. Mietbeginn
Der Mietbeginn ist der ${formatDate(data.beginn)}.

3. Miete und Kaution
Monatliche Miete: ${formatEuro(data.miete)}
Kaution: ${formatEuro(data.kaution)}
Zahlungsfrist: ${value(data.zahlbarBis)}

4. Übergabezustand
${value(data.uebergabe, "Der Übergabezustand wird bei Übergabe dokumentiert.")}

5. Weitere Vereinbarungen
${value(data.zusatz, "Keine zusätzlichen Vereinbarungen.")}

${value(data.ort)}, ${formatDate(data.datum)}

Unterschrift Vermieter: ______________________________
Unterschrift Mieter: ______________________________`,
  },
  vehicle: {
    label: "Fahrzeug-Kaufvertrag",
    fileName: "fahrzeug-kaufvertrag-entwurf.txt",
    summary: "Privater Fahrzeugverkauf mit Fahrzeugdaten, Kaufpreis und Übergabe.",
    signatures: ["Verkäufer", "Käufer"],
    fields: [
      ["parties", "Parteien", "verkaeufer", "Verkäufer", "textarea", "Veronika Verkäuferin, Beispielweg 4, 12345 Musterstadt"],
      ["parties", "Parteien", "kaeufer", "Käufer", "textarea", "Karl Käufer, Käuferstraße 9, 54321 Beispielstadt"],
      ["object", "Fahrzeug", "fahrzeug", "Fahrzeugtyp", "text", "Auto"],
      ["object", "Fahrzeug", "modell", "Marke und Modell", "text", "VW Golf 1.6 TDI"],
      ["object", "Fahrzeug", "fin", "Fahrgestellnummer", "text", "WVWZZZ1JZXW000001"],
      ["object", "Fahrzeug", "kilometer", "Kilometerstand", "text", "82.000 km"],
      ["payment", "Zahlung", "preis", "Kaufpreis", "number", "7200"],
      ["payment", "Zahlung", "zahlungsart", "Zahlungsart", "text", "Barzahlung bei Übergabe"],
      ["terms", "Übergabe", "datum", "Verkaufsdatum", "date", ""],
      ["terms", "Übergabe", "uebergabe", "Übergabe", "textarea", "Das Fahrzeug wird abgemeldet mit Fahrzeugpapieren und zwei Schlüsseln übergeben."],
      ["terms", "Übergabe", "zusatz", "Zusätzliche Vereinbarungen", "textarea", "Privatverkauf unter Ausschluss der Sachmängelhaftung."],
      ["closing", "Abschluss", "ort", "Ort", "text", "Musterstadt"],
    ],
    sample: {
      verkaeufer: "Veronika Verkäuferin, Beispielweg 4, 12345 Musterstadt",
      kaeufer: "Karl Käufer, Käuferstraße 9, 54321 Beispielstadt",
      fahrzeug: "Auto",
      modell: "VW Golf 1.6 TDI",
      fin: "WVWZZZ1JZXW000001",
      kilometer: "82.000 km",
      preis: "7200",
      zahlungsart: "Barzahlung bei Übergabe",
      datum: "2026-02-14",
      uebergabe: "Das Fahrzeug wird abgemeldet mit Fahrzeugpapieren und zwei Schlüsseln übergeben.",
      zusatz: "Privatverkauf unter Ausschluss der Sachmängelhaftung.",
      ort: "Musterstadt",
    },
    render: (data) => `Kaufvertrag für ein Fahrzeug

Verkäufer:
${value(data.verkaeufer)}

Käufer:
${value(data.kaeufer)}

1. Fahrzeugdaten
Fahrzeugtyp: ${value(data.fahrzeug)}
Marke und Modell: ${value(data.modell)}
Fahrgestellnummer: ${value(data.fin)}
Kilometerstand: ${value(data.kilometer)}

2. Kaufpreis und Zahlung
Kaufpreis: ${formatEuro(data.preis)}
Zahlungsart: ${value(data.zahlungsart)}

3. Verkauf und Übergabe
Verkaufsdatum: ${formatDate(data.datum)}
Übergabe: ${value(data.uebergabe)}

4. Zusätzliche Vereinbarungen
${value(data.zusatz, "Keine zusätzlichen Vereinbarungen.")}

${value(data.ort)}, ${formatDate(data.datum)}

Unterschrift Verkäufer: ______________________________
Unterschrift Käufer: ______________________________`,
  },
  purchase: {
    label: "Einfacher Kaufvertrag",
    fileName: "kaufvertrag-entwurf.txt",
    summary: "Allgemeiner Kaufvertrag für Waren, digitale Produkte oder einfache Leistungen.",
    signatures: ["Verkäufer", "Käufer"],
    fields: [
      ["parties", "Parteien", "seller", "Verkäufer", "textarea", "Verkäufer GmbH, Angebotsweg 2, 12345 Musterstadt"],
      ["parties", "Parteien", "buyer", "Käufer", "textarea", "Käufer Muster, Kundenstraße 7, 54321 Beispielstadt"],
      ["object", "Kaufgegenstand", "item", "Kaufgegenstand", "textarea", "Mini-Familienplaner als PDF"],
      ["payment", "Zahlung", "price", "Kaufpreis", "number", "9.99"],
      ["payment", "Zahlung", "paymentDue", "Zahlungsfrist", "text", "zahlbar sofort nach Rechnungserhalt"],
      ["terms", "Lieferung", "delivery", "Übergabe oder Lieferung", "textarea", "Digitaler Download nach Zahlungseingang"],
      ["terms", "Lieferung", "terms", "Bedingungen", "textarea", "Einmalige Zahlung. Keine laufenden Kosten. Nutzung nur privat."],
      ["closing", "Abschluss", "place", "Ort", "text", "Musterstadt"],
      ["closing", "Abschluss", "date", "Datum", "date", ""],
    ],
    sample: {
      seller: "Beispiel Anbieter, Angebotsweg 2, 12345 Musterstadt",
      buyer: "Muster Kundin, Kundenstraße 7, 54321 Beispielstadt",
      item: "Mini-Familienplaner als PDF",
      price: "9.99",
      paymentDue: "zahlbar sofort nach Rechnungserhalt",
      delivery: "Digitaler Download nach Zahlungseingang",
      terms: "Einmalige Zahlung. Keine laufenden Kosten. Nutzung nur privat.",
      place: "Musterstadt",
      date: "2026-03-01",
    },
    render: (data) => `Einfacher Kaufvertrag

Verkäufer:
${value(data.seller)}

Käufer:
${value(data.buyer)}

1. Kaufgegenstand
${value(data.item)}

2. Kaufpreis und Zahlung
Kaufpreis: ${formatEuro(data.price)}
Zahlungsfrist: ${value(data.paymentDue)}

3. Übergabe oder Lieferung
${value(data.delivery)}

4. Bedingungen
${value(data.terms, "Keine zusätzlichen Bedingungen.")}

${value(data.place)}, ${formatDate(data.date)}

Unterschrift Verkäufer: ______________________________
Unterschrift Käufer: ______________________________`,
  },
};

const elements = {
  templateSelect: document.querySelector("#templateSelect"),
  templatePicker: document.querySelector("#templatePicker"),
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
};

const OPTIONAL_FIELDS = new Set(["zusatz", "terms"]);
const STORAGE_PREFIX = "beirit-contract-generator:";
const LOGO_STORAGE_KEY = `${STORAGE_PREFIX}logo`;
const FONT_SIZE_STORAGE_KEY = `${STORAGE_PREFIX}font-size`;
const MAX_LOGO_SIZE = 1.5 * 1024 * 1024;
let storageTimer = 0;
let firstMissingField = null;
let logoData = null;
let logoDrag = null;

function value(input, fallback = "______________________________") {
  return String(input || "").trim() || fallback;
}

function formatEuro(input) {
  const parsed = Number(String(input || "").replace(",", "."));
  if (!Number.isFinite(parsed)) return "________________ EUR";
  return parsed.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function formatDate(input) {
  if (!input) return "________________";
  const date = new Date(`${input}T00:00:00`);
  return Number.isNaN(date.getTime()) ? input : date.toLocaleDateString("de-DE");
}

function todayStamp() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function fileSlug(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getTemplate() {
  return TEMPLATES[elements.templateSelect.value] ?? TEMPLATES.rent;
}

function getData() {
  return Object.fromEntries(new FormData(elements.form).entries());
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
  elements.logoName.textContent = data?.name || "Optional, nur lokal in diesem Browser.";
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
  elements.fontSizeSelect.value = size;
  elements.preview.dataset.fontSize = size;
  elements.fontSizeSample.dataset.fontSize = size;
  elements.fontSizePicker.querySelectorAll("button").forEach((button) => {
    const active = button.dataset.size === size;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
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
  elements.templatePicker.replaceChildren(
    ...Object.entries(TEMPLATES).map(([key, template]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.template = key;
      button.textContent = template.label;
      button.addEventListener("click", () => selectTemplate(key));
      return button;
    })
  );
  updateTemplatePicker();
}

function updateTemplatePicker() {
  const current = elements.templateSelect.value || "rent";
  elements.templatePicker.querySelectorAll("button").forEach((button) => {
    const active = button.dataset.template === current;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function selectTemplate(key, force = false) {
  if (!TEMPLATES[key] || (!force && elements.templateSelect.value === key)) return;
  elements.templateSelect.value = key;
  renderForm();
  if (!readDraft()) fillSample();
}

function renderForm() {
  const template = getTemplate();
  elements.templateSummary.textContent = template.summary;
  updateTemplatePicker();
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

        const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
        input.id = name;
        input.name = name;
        input.required = !OPTIONAL_FIELDS.has(name);
        input.placeholder = placeholder;
        input.autocomplete = "off";
        if (type !== "textarea") input.type = type;

        const error = document.createElement("small");
        error.id = `${name}-error`;

        wrapper.append(labelElement, input, error);
        grid.append(wrapper);
      });

    group.append(grid);
    return group;
  });

  elements.form.replaceChildren(...groupNodes);
  renderStepList();
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
    const number = document.createElement("span");
    const title = document.createElement("strong");
    number.textContent = String(index + 1).padStart(2, "0");
    title.textContent = groupLabel;
    item.append(number, title);
    return item;
  });
  elements.stepList.replaceChildren(...steps);
}

function validateFields() {
  const fields = Array.from(elements.form.querySelectorAll("input, textarea"));
  const requiredFields = fields.filter((field) => field.required);
  const missingFields = [];
  let validRequired = 0;

  fields.forEach((field) => {
    const isValid = !field.required || Boolean(field.value.trim());
    field.setAttribute("aria-invalid", String(!isValid));
    const error = document.querySelector(`#${field.id}-error`);
    if (error) error.textContent = isValid ? "" : "Pflichtfeld";
    if (field.required && isValid) validRequired += 1;
    if (field.required && !isValid) missingFields.push(field);
  });

  const completion = requiredFields.length ? Math.round((validRequired / requiredFields.length) * 100) : 100;
  const complete = validRequired === requiredFields.length;
  firstMissingField = missingFields[0] || null;
  elements.progress.textContent = `${validRequired}/${requiredFields.length}`;
  elements.statusBadge.textContent = complete ? "Bereit zum Export" : "Entwurf unvollständig";
  elements.statusBadge.classList.toggle("is-complete", complete);
  elements.completionBar.style.width = `${completion}%`;
  elements.exportHint.textContent = complete
    ? "Alle Pflichtangaben sind ausgefüllt. Der Entwurf kann kopiert, heruntergeladen oder gedruckt werden."
    : `${requiredFields.length - validRequired} Pflichtangaben fehlen noch. Leere Stellen bleiben im Entwurf sichtbar.`;
  renderMissingList(missingFields);

  getGroups().forEach(([groupKey]) => {
    const groupFields = fields.filter((field) => field.closest("[data-group]")?.dataset.group === groupKey && field.required);
    const groupDone = groupFields.length > 0 && groupFields.every((field) => field.value.trim());
    const step = elements.stepList.querySelector(`[data-group="${groupKey}"]`);
    step?.classList.toggle("is-complete", groupDone);
    step?.classList.toggle("is-active", !groupDone && groupFields.some((field) => field === document.activeElement));
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
  field.closest(".field-group")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => field.focus({ preventScroll: true }), 220);
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
    logoDrag.logoX + event.clientX - logoDrag.startX,
    logoDrag.logoY + event.clientY - logoDrag.startY
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

function previewText(content, template) {
  const lines = content
    .split("\n")
    .filter((line) => !line.trim().startsWith("Unterschrift "))
    .join("\n")
    .trim()
    .split("\n");

  if (lines[0]?.trim() === template.label) lines.shift();
  return lines.join("\n").trim();
}

function renderPreviewText(content, template) {
  const body = document.createElement("div");
  body.className = "preview-text";
  const lines = previewText(content, template).split("\n");
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

function updatePreview() {
  const template = getTemplate();
  const content = template.render(getData());
  elements.preview.replaceChildren();
  applyFontSize(elements.fontSizeSelect.value);

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
  elements.preview.append(heading, renderPreviewText(content, template), renderSignatureArea(template));
  validateFields();
}

function fillSample() {
  Object.entries(getTemplate().sample).forEach(([key, sampleValue]) => {
    const field = elements.form.elements[key];
    if (field) field.value = sampleValue;
  });
  updatePreview();
  saveDraft();
}

function currentText() {
  return getTemplate().render(getData());
}

function downloadText() {
  const template = getTemplate();
  const blob = new Blob([currentText()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${todayStamp()}-${fileSlug(template.label)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText() {
  try {
    await navigator.clipboard.writeText(currentText());
    elements.copyButton.textContent = "Kopiert";
    window.setTimeout(() => {
      elements.copyButton.textContent = "Text kopieren";
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
  selectTemplate(elements.templateSelect.value, true);
});
elements.form.addEventListener("input", () => {
  updatePreview();
  scheduleSave();
});
elements.form.addEventListener("focusin", validateFields);
elements.fillSample.addEventListener("click", fillSample);
elements.resetForm.addEventListener("click", () => {
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
elements.printButton.addEventListener("click", () => {
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

renderTemplateOptions();
elements.fontSizeSelect.value = readFontSize();
applyFontSize(elements.fontSizeSelect.value);
setLogoState(readLogo());
renderForm();
if (!readDraft()) fillSample();
