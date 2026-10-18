const PASSING_GRADE_LIMIT = 4.0;
const MIN_GRADE = 1;
const MAX_GRADE = 6;
const MAX_SUBJECTS = 20;
const DECIMAL_PATTERN = /^[1-6](?:[,.]\d{1,2})?$/;
const GRADE_STEP = 0.1;

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
};

let activeAudio = null;
let animationFrame = null;

function setStatus(message, type = "info") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("is-error", type === "error");
  elements.statusMessage.classList.toggle("is-success", type === "success");
}

function setStep(step) {
  document.querySelectorAll(".step-panel").forEach((panel) => {
    const isActive = panel.dataset.step === String(step);
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });

  elements.stepIndicator.textContent = `Schritt ${step} von 3`;

  const targetInput = {
    1: elements.nameInput,
    2: elements.subjectsInput,
    3: elements.gradeInputs.querySelector("input"),
  }[step];

  window.requestAnimationFrame(() => targetInput?.focus());
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

function renderResult(grades) {
  resetResult();

  // Work in whole hundredths to preserve exact decimal boundaries.
  const totalHundredths = grades.reduce((sum, grade) => sum + Math.round(grade * 100), 0);
  const average = totalHundredths / (grades.length * 100);
  const roundedUp = Math.ceil(totalHundredths / (grades.length * 10)) / 10;
  const passed = average < PASSING_GRADE_LIMIT;
  const bestGrade = Math.min(...grades);
  const weakestGrade = Math.max(...grades);
  const distance = Math.abs(PASSING_GRADE_LIMIT - average);

  const metrics = document.createElement("div");
  metrics.className = "result-metrics";
  metrics.append(
    createMetric("Durchschnitt", average < PASSING_GRADE_LIMIT && average >= 3.995 ? "< 4,0" : formatGrade(average)),
    createMetric("Aufgerundet", formatGrade(roundedUp)),
    createMetric("Beste Note", formatGrade(bestGrade)),
    createMetric("Schwächste Note", formatGrade(weakestGrade))
  );

  const averageText = document.createElement("p");
  averageText.className = "result-lead";
  averageText.textContent = passed
    ? `Bestanden mit ${distance < 0.01 ? "weniger als 0,01" : formatGrade(distance)} Abstand zur Grenze.`
    : average === PASSING_GRADE_LIMIT ? "Die Bestehensgrenze ist erreicht. Zum Bestehen muss der Durchschnitt darunter liegen." : `${formatGrade(distance)} Punkte bis zur Grenze; zum Bestehen muss der Durchschnitt darunter liegen.`;

  const detailText = document.createElement("p");
  detailText.textContent = `${grades.length} ${grades.length === 1 ? "Note wurde" : "Noten wurden"} ausgewertet. Bestehensgrenze: ein Durchschnitt unter ${formatGrade(PASSING_GRADE_LIMIT)} gilt als bestanden; ab ${formatGrade(PASSING_GRADE_LIMIT)} gilt er als nicht bestanden.`;

  const feedback = document.createElement("p");
  feedback.textContent = passed
    ? "Herzlichen Glückwunsch, du hast bestanden."
    : "Leider hast du nicht bestanden. Viel Erfolg beim nächsten Versuch.";

  elements.resultContent.append(metrics, averageText, detailText, feedback);
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
  activeAudio = new Audio(src);
  activeAudio.volume = 0.45;
  activeAudio.play().catch(() => {
    setStatus("Ergebnis berechnet. Der Browser hat die Audiowiedergabe blockiert.", statusType);
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
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const canvas = elements.canvas;
  const context = canvas.getContext("2d");
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const colors = ["#0f8b6f", "#f9c74f", "#f94144", "#277da1", "#ffffff"];
  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * window.innerHeight * 0.35,
    size: 4 + Math.random() * 7,
    speed: 2 + Math.random() * 4,
    drift: -1.4 + Math.random() * 2.8,
    rotation: Math.random() * Math.PI,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const endTime = Date.now() + 2600;

  canvas.width = Math.floor(window.innerWidth * pixelRatio);
  canvas.height = Math.floor(window.innerHeight * pixelRatio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  function draw() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);

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
      animationFrame = window.requestAnimationFrame(draw);
    } else {
      stopCelebration();
    }
  }

  draw();
}

function stopCelebration() {
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
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
});

elements.gradeInputs.addEventListener("input", (event) => {
  if (event.target.matches("input")) {
    if (!elements.result.hidden) {
      resetResult();
      const subjects = elements.gradeInputs.querySelectorAll("input").length;
      setStatus(`Trage jetzt ${subjects} ${subjects === 1 ? "Note" : "Noten"} ein.`);
    }
    event.target.setAttribute("aria-invalid", "false");
  }
});

setStep(1);
