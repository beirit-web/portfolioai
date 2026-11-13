const DEFAULT_PASSING_HUNDREDTHS = 400;
const PASSING_SETTINGS_KEY = "beirit.notenrechner.passing-rule.v1";
const MIN_GRADE = 1;
const MAX_GRADE = 6;
const MAX_SUBJECTS = 20;
const DECIMAL_PATTERN = /^[1-6](?:[,.]\d{1,2})?$/;
const GRADE_STEP = 0.1;

// The calculator remains available to guests; the account belongs to all demos.
if (["http:", "https:"].includes(location.protocol) && navigator.onLine) {
  fetch("/api/session/status/", { credentials: "same-origin", cache: "no-store" })
  .then(response => response.ok ? response.json() : null)
  .then(session => {
    if (!session?.authenticated) return;
    document.querySelectorAll("[data-account-guest]").forEach(link => { link.hidden = true; });
    document.querySelectorAll("[data-account-member]").forEach(link => { link.hidden = false; });
  })
  .catch(() => {});
}

const elements = {
  form: document.querySelector("#gradeForm"),
  stepIndicator: document.querySelector("#stepIndicator"),
  statusMessage: document.querySelector("#statusMessage"),
  nameInput: document.querySelector("#name"),
  subjectsInput: document.querySelector("#subjects"),
  gradeInputs: document.querySelector("#gradeInputs"),
  result: document.querySelector("#result"),
  resultContent: document.querySelector("#resultContent"),
  canvas: document.querySelector("#celebrationCanvas"),
  averageRing: document.querySelector(".average-ring"),
  liveAverage: document.querySelector("#liveAverage"),
  liveCount: document.querySelector("#liveCount"),
  liveCaption: document.querySelector("#liveCaption"),
  gradeCompletion: document.querySelector("#gradeCompletion"),
  distributionBuckets: [...document.querySelectorAll("[data-grade-bucket]")],
  subjectPresets: [...document.querySelectorAll("[data-subject-count]")],
  passingSettings: document.querySelector("#passingSettings"),
  passingGrade: document.querySelector("#passingGrade"),
  passingInclusive: document.querySelector("#passingInclusive"),
  passingSettingsStatus: document.querySelector("#passingSettingsStatus"),
  passingRuleText: document.querySelector("#passingRuleText"),
};

let activeAudio = null;
let animationFrame = null;
let passingRule = { version: 1, limitHundredths: DEFAULT_PASSING_HUNDREDTHS, inclusive: false };

function passingRuleDescription() {
  const limit = formatGrade(passingRule.limitHundredths / 100);
  return passingRule.inclusive
    ? `Ein Durchschnitt bis einschließlich ${limit} gilt als bestanden; darüber gilt er als nicht bestanden.`
    : `Ein Durchschnitt unter ${limit} gilt als bestanden; ab ${limit} gilt er als nicht bestanden.`;
}

function syncPassingSettings() {
  elements.passingGrade.value = formatGrade(passingRule.limitHundredths / 100);
  elements.passingInclusive.checked = passingRule.inclusive;
  setText(elements.passingRuleText, passingRuleDescription());
}

function setPassingSettingsStatus(message, invalid = false) {
  setText(elements.passingSettingsStatus, message);
  elements.passingSettingsStatus.classList.toggle("is-error", invalid);
}

function loadPassingSettings() {
  let saved;
  try {
    saved = localStorage.getItem(PASSING_SETTINGS_KEY);
  } catch {
    setPassingSettingsStatus("Der Browser erlaubt hier kein dauerhaftes Speichern. Deine Einstellung gilt nur für diese Sitzung.");
    syncPassingSettings();
    return;
  }

  if (saved !== null) {
    try {
      const candidate = JSON.parse(saved);
      if (candidate?.version !== 1
          || !Number.isInteger(candidate.limitHundredths)
          || candidate.limitHundredths < MIN_GRADE * 100
          || candidate.limitHundredths > MAX_GRADE * 100
          || typeof candidate.inclusive !== "boolean") {
        throw new Error("Invalid passing rule");
      }
      passingRule = { version: 1, limitHundredths: candidate.limitHundredths, inclusive: candidate.inclusive };
      setPassingSettingsStatus("Deine gespeicherte Bestehensregel ist aktiv.");
    } catch {
      setPassingSettingsStatus("Die gespeicherte Einstellung ist ungültig. Die Standardregel ist aktiv; du kannst sie neu einstellen.");
    }
  }
  syncPassingSettings();
}

// Compare whole hundredths before dividing, so a boundary is never decided by rounding.
function compareAverageToBoundary(totalHundredths, count) {
  return Math.sign(totalHundredths - passingRule.limitHundredths * count);
}

function averagePasses(totalHundredths, count) {
  const comparison = compareAverageToBoundary(totalHundredths, count);
  return comparison < 0 || (comparison === 0 && passingRule.inclusive);
}

function formatAverage(totalHundredths, count, maximumFractionDigits = 2) {
  const averageLabel = formatGrade(totalHundredths / (count * 100), maximumFractionDigits);
  const boundaryLabel = formatGrade(passingRule.limitHundredths / 100, maximumFractionDigits);
  const comparison = compareAverageToBoundary(totalHundredths, count);
  if (comparison !== 0 && averageLabel === boundaryLabel) {
    return `${comparison < 0 ? "<" : ">"} ${boundaryLabel}`;
  }
  return averageLabel;
}

function setStatus(message, type = "info") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("is-error", type === "error");
  elements.statusMessage.classList.toggle("is-success", type === "success");
}

function setStep(step, { focus = true } = {}) {
  document.body.dataset.step = String(step);
  document.querySelectorAll(".step-panel").forEach((panel) => {
    const isActive = panel.dataset.step === String(step);
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });

  elements.stepIndicator.textContent = `Schritt ${step} von 3`;
  document.querySelectorAll("[data-progress-step]").forEach((item) => {
    const itemStep = Number(item.dataset.progressStep);
    item.classList.toggle("is-current", itemStep === step);
    item.classList.toggle("is-complete", itemStep < step);
    if (itemStep === step) {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }
  });
  updateSubjectPresets();
  updateLiveOverview();

  const targetInput = {
    1: elements.nameInput,
    2: elements.subjectsInput,
    3: elements.gradeInputs.querySelector("input"),
  }[step];

  if (focus) {
    requestAnimationFrame(() => targetInput?.focus());
  }
}

function setButtonLoading(button, isLoading) {
  if (!button) {
    return;
  }

  button.disabled = isLoading;
  button.setAttribute("aria-busy", String(isLoading));
}

function resetResult() {
  stopAudio();
  stopCelebration();
  elements.result.hidden = true;
  elements.result.classList.remove("is-passed", "is-failed");
  elements.resultContent.replaceChildren();
}

function parseGermanDecimal(value) {
  const normalized = String(value).trim().replace(",", ".");

  if (!DECIMAL_PATTERN.test(normalized)) {
    return Number.NaN;
  }

  return Number.parseFloat(normalized);
}

function validateSubjectCount() {
  const subjects = Number(elements.subjectsInput.value);
  const isValid = Number.isInteger(subjects) && subjects >= 1 && subjects <= MAX_SUBJECTS;

  elements.subjectsInput.setAttribute("aria-invalid", String(!isValid));

  if (!isValid) {
    setStatus(`Bitte gib eine Anzahl zwischen 1 und ${MAX_SUBJECTS} ein.`, "error");
    elements.subjectsInput.focus();
    return null;
  }

  return subjects;
}

function createGradeFields(subjects) {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < subjects; index += 1) {
    const wrapper = document.createElement("div");
    wrapper.className = "grade-field";

    const label = document.createElement("label");
    label.htmlFor = `grade-${index}`;
    label.textContent = `Note für Fach ${index + 1}`;

    const input = document.createElement("input");
    input.id = `grade-${index}`;
    input.name = `grade-${index}`;
    input.type = "number";
    input.inputMode = "decimal";
    input.min = String(MIN_GRADE);
    input.max = String(MAX_GRADE);
    input.step = String(GRADE_STEP);
    input.autocomplete = "off";
    input.placeholder = "Zum Beispiel 2,3";
    input.required = true;

    wrapper.append(label, input);
    fragment.append(wrapper);
  }

  elements.gradeInputs.replaceChildren(fragment);
}

function createMetric(label, value) {
  const item = document.createElement("div");
  item.className = "result-metric";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.textContent = value;

  item.append(labelElement, valueElement);
  return item;
}

function getGrades() {
  const inputs = Array.from(elements.gradeInputs.querySelectorAll("input"));
  const grades = [];
  let invalidInput = null;

  inputs.forEach((input) => {
    const grade = parseGermanDecimal(input.value);
    const isValid = Number.isFinite(grade) && grade >= MIN_GRADE && grade <= MAX_GRADE;

    input.setAttribute("aria-invalid", String(!isValid));

    if (!isValid && invalidInput === null) {
      invalidInput = input;
    }

    if (isValid) {
      grades.push(grade);
    }
  });

  if (invalidInput) {
    setStatus(`Bitte trage alle Noten zwischen ${MIN_GRADE} und ${MAX_GRADE} ein.`, "error");
    invalidInput.focus();
    return null;
  }

  return grades;
}

function formatGrade(value, maximumFractionDigits = 2) {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits,
  });
}

function setText(element, value) {
  if (element && element.textContent !== value) {
    element.textContent = value;
  }
}

function updateLiveOverview() {
  const configuredCount = Number(elements.subjectsInput.value);
  const subjectCount = document.body.dataset.step !== "1"
    && Number.isInteger(configuredCount) && configuredCount >= 1 && configuredCount <= MAX_SUBJECTS
    ? configuredCount : 0;
  const enteredInputs = [...elements.gradeInputs.querySelectorAll("input")];
  // A changed subject count starts a new set; previous grades must not look current.
  const inputs = enteredInputs.length === subjectCount ? enteredInputs : [];
  const grades = [];
  const distribution = Array(MAX_GRADE).fill(0);

  inputs.forEach((input) => {
    const grade = parseGermanDecimal(input.value);
    const isValid = Number.isFinite(grade) && grade >= MIN_GRADE && grade <= MAX_GRADE;
    input.closest(".grade-field").classList.toggle("is-filled", isValid);
    if (isValid) {
      grades.push(grade);
      distribution[Math.min(MAX_GRADE, Math.max(MIN_GRADE, Math.round(grade))) - 1] += 1;
    }
  });

  const complete = subjectCount > 0 && grades.length === subjectCount;
  const totalHundredths = grades.reduce((sum, grade) => sum + Math.round(grade * 100), 0);
  const average = grades.length ? totalHundredths / (grades.length * 100) : null;
  const averageLabel = average === null ? "—" : formatAverage(totalHundredths, grades.length);

  setText(elements.liveAverage, averageLabel);
  if (elements.liveAverage) {
    const state = average === null ? "empty"
      : averagePasses(totalHundredths, grades.length) ? "passing" : "failing";
    if (elements.liveAverage.dataset.state !== state) elements.liveAverage.dataset.state = state;
  }
  setText(elements.liveCount, subjectCount
    ? `${grades.length} von ${subjectCount} ${subjectCount === 1 ? "Fach" : "Fächern"}`
    : "Noch keine Noten");
  setText(elements.liveCaption, !grades.length ? "Dein Durchschnitt erscheint hier."
    : complete ? "Alle Noten erfasst. Bereit für die Auswertung."
      : `Vorläufiger Schnitt aus ${grades.length} ${grades.length === 1 ? "Note" : "Noten"}.`);
  setText(elements.gradeCompletion, complete
    ? subjectCount === 1 ? "Die Note ist eingetragen – bereit zur Berechnung."
      : `Alle ${subjectCount} Noten eingetragen – bereit zur Berechnung.`
    : `${grades.length} von ${subjectCount} Noten eingetragen`);

  elements.distributionBuckets.forEach((bucket) => {
    const grade = Number(bucket.dataset.gradeBucket);
    const count = distribution[grade - 1];
    const height = `${Number((grades.length ? count / grades.length * 100 : 0).toFixed(2))}%`;
    const fill = bucket.querySelector(".distribution-fill");
    if (fill && fill.style.height !== height) {
      fill.style.height = height;
    }
    setText(bucket.querySelector(".distribution-count"), String(count));
    const label = `Note ${grade}: ${count} ${count === 1 ? "Fach" : "Fächer"}`;
    if (bucket.getAttribute("aria-label") !== label) bucket.setAttribute("aria-label", label);
  });
  const completion = `${subjectCount ? grades.length / subjectCount * 100 : 0}%`;
  // Keep changing progress local to the ring, without invalidating the whole page.
  if (elements.averageRing?.style.getPropertyValue("--grade-completion") !== completion) {
    elements.averageRing?.style.setProperty("--grade-completion", completion);
  }
}

function updateSubjectPresets() {
  elements.subjectPresets.forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.subjectCount) === Number(elements.subjectsInput.value)));
  });
}

function createGradeScale(totalHundredths, count) {
  const average = totalHundredths / (count * 100);
  const scale = document.createElement("div");
  scale.className = "grade-scale";

  const heading = document.createElement("div");
  heading.className = "grade-scale-heading";
  const title = document.createElement("span");
  title.textContent = "Dein Schnitt auf der Notenskala";
  const value = document.createElement("strong");
  value.textContent = formatAverage(totalHundredths, count, 4);
  heading.append(title, value);

  const track = document.createElement("div");
  track.className = "grade-scale-track";
  track.style.setProperty("--grade-position", `${(average - MIN_GRADE) / (MAX_GRADE - MIN_GRADE) * 100}%`);
  track.style.setProperty("--passing-position", `${(passingRule.limitHundredths / 100 - MIN_GRADE) / (MAX_GRADE - MIN_GRADE) * 100}%`);
  track.setAttribute("aria-hidden", "true");
  const boundary = document.createElement("span");
  boundary.className = "grade-scale-boundary";
  const marker = document.createElement("span");
  marker.className = "grade-scale-marker";
  track.append(boundary, marker);

  const labels = document.createElement("div");
  labels.className = "grade-scale-labels";
  labels.setAttribute("aria-hidden", "true");
  for (let grade = MIN_GRADE; grade <= MAX_GRADE; grade += 1) {
    const label = document.createElement("span");
    label.textContent = String(grade);
    labels.append(label);
  }

  const caption = document.createElement("p");
  caption.className = "grade-scale-caption";
  caption.textContent = `1 ist die beste Note. Die Markierung bei ${formatGrade(passingRule.limitHundredths / 100)} zeigt die Bestehensgrenze (${passingRule.inclusive ? "einschließlich" : "ohne"} dieser Note).`;
  scale.append(heading, track, labels, caption);
  return scale;
}

function renderResult(grades) {
  resetResult();

  // Work in whole hundredths to preserve exact decimal boundaries.
  const totalHundredths = grades.reduce((sum, grade) => sum + Math.round(grade * 100), 0);
  const roundedUp = Math.ceil(totalHundredths / (grades.length * 10)) / 10;
  const passed = averagePasses(totalHundredths, grades.length);
  const bestGrade = Math.min(...grades);
  const weakestGrade = Math.max(...grades);
  const boundaryDifference = totalHundredths - passingRule.limitHundredths * grades.length;
  const distance = Math.abs(boundaryDifference) / (grades.length * 100);
  const distanceText = distance > 0 && distance < 0.01 ? "weniger als 0,01" : formatGrade(distance);

  const metrics = document.createElement("div");
  metrics.className = "result-metrics";
  metrics.append(
    createMetric("Durchschnitt", formatAverage(totalHundredths, grades.length)),
    createMetric("Aufgerundet", formatGrade(roundedUp)),
    createMetric("Beste Note", formatGrade(bestGrade)),
    createMetric("Schwächste Note", formatGrade(weakestGrade))
  );

  const averageText = document.createElement("p");
  averageText.className = "result-lead";
  averageText.textContent = passed
    ? boundaryDifference === 0
      ? "Bestanden: Die Bestehensgrenze ist erreicht und zählt nach deiner Einstellung noch als bestanden."
      : `Bestanden mit ${distanceText} Abstand zur Grenze.`
    : boundaryDifference === 0
      ? "Die Bestehensgrenze ist erreicht. Zum Bestehen muss der Durchschnitt darunter liegen."
      : `${distanceText} Punkte bis zur Grenze; zum Bestehen muss der Durchschnitt ${passingRule.inclusive ? "die Grenze erreichen oder darunter liegen" : "darunter liegen"}.`;

  const detailText = document.createElement("p");
  detailText.textContent = `${grades.length} ${grades.length === 1 ? "Note wurde" : "Noten wurden"} ausgewertet. Bestehensgrenze: ${passingRuleDescription()}`;

  const feedback = document.createElement("p");
  feedback.textContent = passed
    ? "Herzlichen Glückwunsch, du hast bestanden."
    : "Leider hast du nicht bestanden. Viel Erfolg beim nächsten Versuch.";

  elements.resultContent.append(metrics, createGradeScale(totalHundredths, grades.length), averageText, detailText, feedback);
  elements.result.classList.add(passed ? "is-passed" : "is-failed");
  elements.result.hidden = false;

  if (passed) {
    setStatus("Berechnung abgeschlossen: bestanden.", "success");
    playAudio("gewonnen.mp3", "success");
    startCelebration();
  } else {
    setStatus("Berechnung abgeschlossen: nicht bestanden.", "error");
    playAudio("lost-signal.mp3", "error");
    addFailureImage();
  }

  elements.result.focus?.();
}

function addFailureImage() {
  const image = document.createElement("img");
  image.src = "./img/lost.webp";
  image.alt = "Nicht bestanden";
  image.className = "result-image";
  image.loading = "lazy";
  image.decoding = "async";
  image.width = 512;
  image.height = 768;
  elements.resultContent.append(image);
}

function playAudio(src, statusType) {
  stopAudio();
  const audio = new Audio(src);
  activeAudio = audio;
  audio.volume = 0.45;
  audio.play().catch(() => {
    if (activeAudio === audio) {
      setStatus("Ergebnis berechnet. Der Browser hat die Audiowiedergabe blockiert.", statusType);
    }
  });
}

function stopAudio() {
  if (!activeAudio) {
    return;
  }

  activeAudio.pause();
  activeAudio.currentTime = 0;
  activeAudio = null;
}

function startCelebration() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const canvas = elements.canvas;
  const context = canvas.getContext("2d");
  const pixelRatio = Math.min(devicePixelRatio || 1, 2);
  const colors = ["#0f8b6f", "#f9c74f", "#f94144", "#277da1", "#ffffff"];
  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random() * innerWidth,
    y: -20 - Math.random() * innerHeight * 0.35,
    size: 4 + Math.random() * 7,
    speed: 2 + Math.random() * 4,
    drift: -1.4 + Math.random() * 2.8,
    rotation: Math.random() * Math.PI,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const endTime = Date.now() + 2600;

  canvas.width = Math.floor(innerWidth * pixelRatio);
  canvas.height = Math.floor(innerHeight * pixelRatio);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  function draw() {
    context.clearRect(0, 0, innerWidth, innerHeight);

    particles.forEach((particle) => {
      particle.x += particle.drift;
      particle.y += particle.speed;
      particle.rotation += 0.08;

      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
      context.restore();
    });

    if (Date.now() < endTime) {
      animationFrame = requestAnimationFrame(draw);
    } else {
      stopCelebration();
    }
  }

  draw();
}

function stopCelebration() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  const context = elements.canvas.getContext("2d");
  context.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
}

document.querySelector('[data-action="start"]').addEventListener("click", () => {
  resetResult();
  const name = elements.nameInput.value.trim();
  setStatus(name ? `Willkommen, ${name}. Wähle jetzt die Anzahl der Fächer.` : "Du fährst anonym fort. Wähle jetzt die Anzahl der Fächer.");
  setStep(2);
});

document.querySelector('[data-action="subjects"]').addEventListener("click", (event) => {
  resetResult();
  setButtonLoading(event.currentTarget, true);
  const subjects = validateSubjectCount();

  if (subjects === null) {
    setButtonLoading(event.currentTarget, false);
    return;
  }

  elements.subjectsInput.setAttribute("aria-invalid", "false");
  createGradeFields(subjects);
  setStatus(`Trage jetzt ${subjects} ${subjects === 1 ? "Note" : "Noten"} ein.`);
  setStep(3);
  setButtonLoading(event.currentTarget, false);
});

document.querySelector('[data-action="back"]').addEventListener("click", () => {
  resetResult();
  setStatus("Passe die Anzahl der Fächer an oder fahre erneut fort.");
  setStep(2);
});

document.querySelectorAll('[data-action="example"]').forEach((button) => {
  button.addEventListener("click", () => {
    resetResult();
    const exampleGrades = [2, 1.7, 2.3, 3, 1.3, 2];
    elements.subjectsInput.value = String(exampleGrades.length);
    elements.subjectsInput.setAttribute("aria-invalid", "false");
    createGradeFields(exampleGrades.length);
    elements.gradeInputs.querySelectorAll("input").forEach((input, index) => {
      input.value = String(exampleGrades[index]);
    });
    setStatus("Beispiel mit 6 Noten geladen. Du kannst alle Noten ändern und dein Ergebnis berechnen.");
    setStep(3);
  });
});

document.querySelectorAll('[data-action="restart"]').forEach((button) => {
  button.addEventListener("click", () => {
    resetResult();
    elements.form.reset();
    elements.nameInput.value = "";
    elements.subjectsInput.value = "";
    elements.subjectsInput.setAttribute("aria-invalid", "false");
    elements.gradeInputs.replaceChildren();
    setStatus("Gib zuerst deinen Namen ein oder fahre anonym fort.");
    setStep(1);
  });
});

elements.subjectPresets.forEach((button) => {
  button.addEventListener("click", () => {
    elements.subjectsInput.value = button.dataset.subjectCount;
    elements.subjectsInput.setAttribute("aria-invalid", "false");
    updateSubjectPresets();
    updateLiveOverview();
  });
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  resetResult();
  const grades = getGrades();

  if (grades === null) {
    return;
  }

  renderResult(grades);
});

elements.form.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.target.tagName !== "INPUT") {
    return;
  }

  const activePanel = event.target.closest(".step-panel");

  if (!activePanel || activePanel.dataset.step === "3") {
    return;
  }

  event.preventDefault();
  activePanel.querySelector(".primary-action")?.click();
});

elements.subjectsInput.addEventListener("input", () => {
  elements.subjectsInput.setAttribute("aria-invalid", "false");
  updateSubjectPresets();
  updateLiveOverview();
});

elements.gradeInputs.addEventListener("input", (event) => {
  if (event.target.matches("input")) {
    if (!elements.result.hidden) {
      resetResult();
      const subjects = elements.gradeInputs.querySelectorAll("input").length;
      setStatus(`Trage jetzt ${subjects} ${subjects === 1 ? "Note" : "Noten"} ein.`);
    }
    event.target.setAttribute("aria-invalid", "false");
    updateLiveOverview();
  }
});

elements.passingSettings.addEventListener("submit", (event) => {
  event.preventDefault();
  const grade = parseGermanDecimal(elements.passingGrade.value);
  const valid = Number.isFinite(grade) && grade >= MIN_GRADE && grade <= MAX_GRADE;
  elements.passingGrade.setAttribute("aria-invalid", String(!valid));
  if (!valid) {
    setPassingSettingsStatus(`Bitte gib eine Bestehensnote zwischen ${MIN_GRADE} und ${MAX_GRADE} mit höchstens zwei Nachkommastellen ein. Komma oder Punkt sind erlaubt.`, true);
    elements.passingGrade.focus();
    return;
  }

  const nextRule = { version: 1, limitHundredths: Math.round(grade * 100), inclusive: elements.passingInclusive.checked };
  const changed = nextRule.limitHundredths !== passingRule.limitHundredths || nextRule.inclusive !== passingRule.inclusive;
  passingRule = nextRule;
  syncPassingSettings();
  if (changed) {
    resetResult();
    updateLiveOverview();
    setStatus(document.body.dataset.step === "3"
      ? "Bestehensregel geändert. Deine Noten bleiben erhalten; berechne das Ergebnis erneut."
      : "Deine Bestehensregel ist jetzt aktiv.");
  }

  try {
    localStorage.setItem(PASSING_SETTINGS_KEY, JSON.stringify(passingRule));
    setPassingSettingsStatus("Bestehensregel gespeichert. Sie gilt auch beim nächsten Öffnen in diesem Browser.");
  } catch {
    setPassingSettingsStatus("Bestehensregel für diese Sitzung übernommen. Der Browser erlaubt hier kein dauerhaftes Speichern.");
  }
});

elements.passingGrade.addEventListener("input", () => {
  elements.passingGrade.setAttribute("aria-invalid", "false");
});

loadPassingSettings();
setStep(1, { focus: false });
