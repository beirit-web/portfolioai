import "../styles/grades.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Calculator, CheckCircle2, GraduationCap, RotateCcw, XCircle } from "lucide-react";
import { AppButton, Panel, SurfaceItem } from "./UiPrimitives";
import { ui } from "../i18n";
import successImageUrl from "../../../../server/assets/portfolio/notenrechner/img/success.webp";
import failureImageUrl from "../assets/grade-calculator/lost.webp";
import successAudioUrl from "../../../../server/assets/portfolio/notenrechner/gewonnen.mp3";
import failureAudioUrl from "../../../../server/assets/portfolio/notenrechner/lost-signal.mp3";

const PASSING_GRADE_LIMIT = 4.0;
const MIN_GRADE = 1;
const MAX_GRADE = 6;
const MAX_SUBJECTS = 20;
const DECIMAL_PATTERN = /^[1-6](?:[,.]\d{1,2})?$/;

type CalculatorStep = 1 | 2 | 3;
type ResultState = {
  average: number;
  roundedUp: number;
  bestGrade: number;
  weakestGrade: number;
  distance: number;
  passed: boolean;
  count: number;
};

function parseGermanDecimal(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!DECIMAL_PATTERN.test(normalized)) return Number.NaN;
  return Number.parseFloat(normalized);
}

function formatGrade(value: number) {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function formatAverage(value: number) {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 4 });
}

function createEmptyGrades(count: number) {
  return Array.from({ length: count }, () => "");
}

function summarizeGrades(grades: number[]): ResultState {
  // Inputs have at most two decimal places. Sum whole hundredths so a value
  // exactly on a tenth does not round up because of floating-point addition.
  const totalHundredths = grades.reduce((sum, grade) => sum + Math.round(grade * 100), 0);
  const average = totalHundredths / (grades.length * 100);
  return {
    average,
    roundedUp: Math.ceil(totalHundredths / (grades.length * 10)) / 10,
    bestGrade: Math.min(...grades),
    weakestGrade: Math.max(...grades),
    distance: Math.abs(PASSING_GRADE_LIMIT - average),
    passed: average < PASSING_GRADE_LIMIT,
    count: grades.length
  };
}

export default function GradeCalculator() {
  const [step, setStep] = useState<CalculatorStep>(1);
  const [name, setName] = useState("");
  const [subjectCount, setSubjectCount] = useState("6");
  const [grades, setGrades] = useState<string[]>(createEmptyGrades(6));
  const [status, setStatus] = useState(ui.gradeCalculator.initialStatus);
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [result, setResult] = useState<ResultState | null>(null);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const successAudioRef = useRef<HTMLAudioElement | null>(null);
  const failureAudioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const initialStep = useRef(true);

  const subjectTotal = Number(subjectCount);
  const isValidSubjectCount = Number.isInteger(subjectTotal) && subjectTotal >= 1 && subjectTotal <= MAX_SUBJECTS;
  const stepText = ui.gradeCalculator.stepIndicator
    .replace("{step}", String(step))
    .replace("{total}", "3");

  const gradeResult = useMemo(() => {
    const parsedGrades = grades.map(parseGermanDecimal);
    if (parsedGrades.length === 0 || parsedGrades.some((grade) => !Number.isFinite(grade) || grade < MIN_GRADE || grade > MAX_GRADE)) return null;
    return summarizeGrades(parsedGrades);
  }, [grades]);

  useEffect(() => {
    return () => {
      stopCelebration();
      stopResultAudio();
    };
  }, []);

  useEffect(() => {
    // Route navigation owns the initial focus. Later steps replace the active
    // control, so continue at the first field of the newly displayed step.
    if (initialStep.current) { initialStep.current = false; return; }
    formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [step]);

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  function updateStatus(message: string, type: "info" | "success" | "error" = "info") {
    setStatus(message);
    setStatusType(type);
  }

  function resetResult() {
    stopCelebration();
    stopResultAudio();
    setResult(null);
  }

  function goToSubjects() {
    resetResult();
    setInvalidFields(new Set());
    updateStatus(
      name.trim()
        ? ui.gradeCalculator.welcomeNamed.replace("{name}", name.trim())
        : ui.gradeCalculator.welcomeAnonymous
    );
    setStep(2);
  }

  function prepareGrades() {
    resetResult();
    if (!isValidSubjectCount) {
      setInvalidFields(new Set(["subjects"]));
      updateStatus(ui.gradeCalculator.subjectError.replace("{max}", String(MAX_SUBJECTS)), "error");
      formRef.current?.querySelector<HTMLInputElement>("#grade-subjects")?.focus();
      return;
    }

    setInvalidFields(new Set());
    setGrades(createEmptyGrades(subjectTotal));
    updateStatus(ui.gradeCalculator.enterGrades.replace("{count}", String(subjectTotal)));
    setStep(3);
  }

  function calculate() {
    resetResult();
    const nextInvalidFields = new Set<string>();
    const parsedGrades = grades.map((value, index) => {
      const grade = parseGermanDecimal(value);
      if (!Number.isFinite(grade) || grade < MIN_GRADE || grade > MAX_GRADE) {
        nextInvalidFields.add(`grade-${index}`);
      }
      return grade;
    });

    setInvalidFields(nextInvalidFields);
    if (nextInvalidFields.size > 0) {
      updateStatus(
        ui.gradeCalculator.gradeError
          .replace("{min}", String(MIN_GRADE))
          .replace("{max}", String(MAX_GRADE)),
        "error"
      );
      formRef.current?.querySelector<HTMLInputElement>(`#${nextInvalidFields.values().next().value}`)?.focus();
      return;
    }

    const nextResult = summarizeGrades(parsedGrades);

    setResult(nextResult);
    updateStatus(nextResult.passed ? ui.gradeCalculator.passedStatus : ui.gradeCalculator.failedStatus, nextResult.passed ? "success" : "error");
    if (nextResult.passed) startCelebration();
    playResultAudio(nextResult.passed);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (step === 1) goToSubjects();
    else if (step === 2) prepareGrades();
    else calculate();
  }

  function restart() {
    resetResult();
    setStep(1);
    setName("");
    setSubjectCount("6");
    setGrades(createEmptyGrades(6));
    setInvalidFields(new Set());
    updateStatus(ui.gradeCalculator.initialStatus);
  }

  function stopCelebration() {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function stopResultAudio() {
    [successAudioRef.current, failureAudioRef.current].forEach((audio) => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    });
  }

  function playResultAudio(passed: boolean) {
    stopResultAudio();
    const audio = passed ? successAudioRef.current : failureAudioRef.current;
    if (!audio) return;
    audio.src = passed ? successAudioUrl : failureAudioUrl;
    audio.volume = passed ? 0.48 : 0.36;
    void audio.play().catch(() => undefined);
  }

  function startCelebration() {
    stopCelebration();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * pixelRatio);
    canvas.height = Math.floor(rect.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const colors = ["#4f46e5", "#06b6d4", "#34d399", "#fbbf24", "#f8fafc"];
    const particles = Array.from({ length: 72 }, () => ({
      x: Math.random() * rect.width,
      y: -20 - Math.random() * rect.height * 0.4,
      size: 4 + Math.random() * 7,
      speed: 2 + Math.random() * 3.5,
      drift: -1.4 + Math.random() * 2.8,
      rotation: Math.random() * Math.PI,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    const endTime = Date.now() + 2400;

    const draw = () => {
      context.clearRect(0, 0, rect.width, rect.height);
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
        animationRef.current = requestAnimationFrame(draw);
      } else {
        stopCelebration();
      }
    };

    draw();
  }

  return (
    <section className="section-shell grade-calculator" aria-labelledby="grade-calculator-title">
      <div className="section-header">
        <div>
          <p className="section-kicker">{ui.gradeCalculator.eyebrow}</p>
          <h2 className="view-title grade-calculator__title mt-4 flex items-center gap-3" id="grade-calculator-title">
            <Calculator aria-hidden="true" className="h-8 w-8 text-indigo-600 dark:text-indigo-200" />
            <span>{ui.gradeCalculator.title}</span>
          </h2>
          <p className="section-copy">{ui.gradeCalculator.description}</p>
        </div>
        <Panel className="grade-calculator__summary">
          <GraduationCap className="h-8 w-8 text-cyan-600 dark:text-cyan-200" />
          <p>{ui.gradeCalculator.summary}</p>
        </Panel>
      </div>

      <div className="grade-calculator__layout">
        <Panel className="grade-calculator__intro">
          <p className="text-kicker">{ui.gradeCalculator.featuresTitle}</p>
          <ul>
            {ui.gradeCalculator.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </Panel>

        <Panel className="grade-calculator__card">
          <span className="grade-calculator__step">{stepText}</span>
          <p id="grade-status" className={`grade-calculator__status grade-calculator__status--${statusType}`} role="status" aria-live="polite">
            {status}
          </p>

          <form aria-label={ui.gradeCalculator.title} className="grade-calculator__form" onSubmit={submit} ref={formRef} noValidate>
            {step === 1 && (
              <div className="grade-calculator__step-panel">
                <label htmlFor="grade-name">{ui.gradeCalculator.nameLabel}</label>
                <input
                  autoComplete="name"
                  id="grade-name"
                  name="name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder={ui.gradeCalculator.namePlaceholder}
                  type="text"
                  value={name}
                />
                <AppButton type="submit">{ui.common.next}</AppButton>
              </div>
            )}

            {step === 2 && (
              <div className="grade-calculator__step-panel">
                <label htmlFor="grade-subjects">{ui.gradeCalculator.subjectsLabel}</label>
                <input
                  aria-invalid={invalidFields.has("subjects")}
                  aria-describedby={`grade-subjects-hint${invalidFields.has("subjects") ? " grade-status" : ""}`}
                  id="grade-subjects"
                  name="subjects"
                  inputMode="numeric"
                  max={MAX_SUBJECTS}
                  min={1}
                  onChange={(event) => {
                    setSubjectCount(event.target.value);
                    setInvalidFields(new Set());
                  }}
                  placeholder={ui.gradeCalculator.subjectsPlaceholder}
                  type="number"
                  value={subjectCount}
                />
                <p className="grade-calculator__hint" id="grade-subjects-hint">{ui.gradeCalculator.subjectHint.replace("{max}", String(MAX_SUBJECTS))}</p>
                <div className="grade-calculator__actions">
                  <AppButton onClick={() => setStep(1)} variant="secondary">{ui.gradeCalculator.back}</AppButton>
                  <AppButton type="submit">{ui.gradeCalculator.enterGradesButton}</AppButton>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grade-calculator__step-panel">
                <div className="grade-calculator__grade-grid">
                  {grades.map((grade, index) => (
                    <label className="grade-calculator__grade-field" htmlFor={`grade-${index}`} key={index}>
                      <span>{ui.gradeCalculator.gradeLabel.replace("{index}", String(index + 1))}</span>
                      <input
                        aria-invalid={invalidFields.has(`grade-${index}`)}
                        aria-describedby={invalidFields.has(`grade-${index}`) ? "grade-status" : undefined}
                        id={`grade-${index}`}
                        name={`grade-${index}`}
                        inputMode="decimal"
                        max={MAX_GRADE}
                        min={MIN_GRADE}
                        onChange={(event) => {
                          if (result) {
                            resetResult();
                            updateStatus(ui.gradeCalculator.enterGrades.replace("{count}", String(grades.length)));
                          }
                          const nextGrades = [...grades];
                          nextGrades[index] = event.target.value;
                          setGrades(nextGrades);
                          if (invalidFields.size) {
                            const nextInvalidFields = new Set(invalidFields);
                            nextInvalidFields.delete(`grade-${index}`);
                            setInvalidFields(nextInvalidFields);
                          }
                        }}
                        placeholder={ui.gradeCalculator.gradePlaceholder}
                        step="0.1"
                        type="number"
                        value={grade}
                      />
                    </label>
                  ))}
                </div>
                <div className="grade-calculator__actions">
                  <AppButton onClick={() => {
                    resetResult();
                    updateStatus(ui.gradeCalculator.adjustSubjects);
                    setStep(2);
                  }} variant="secondary">{ui.gradeCalculator.back}</AppButton>
                  <AppButton type="submit">{ui.gradeCalculator.calculate}</AppButton>
                </div>
              </div>
            )}
          </form>

          {result && (
            <SurfaceItem className={`grade-calculator__result ${result.passed ? "is-passed" : "is-failed"}`}>
              <figure className="grade-calculator__result-media" aria-hidden="true">
                <img
                  alt=""
                  decoding="async"
                  loading="lazy"
                  width={512}
                  height={result.passed ? 512 : 768}
                  src={result.passed ? successImageUrl : failureImageUrl}
                />
              </figure>
              <div className="grade-calculator__result-content">
                <div className="grade-calculator__result-heading">
                  {result.passed ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
                  <h3 ref={resultHeadingRef} tabIndex={-1}>{ui.gradeCalculator.resultTitle}</h3>
                </div>
                <div className="grade-calculator__metrics">
                  <Metric label={ui.gradeCalculator.average} value={formatAverage(result.average)} />
                  <Metric label={ui.gradeCalculator.roundedUp} value={formatGrade(result.roundedUp)} />
                  <Metric label={ui.gradeCalculator.bestGrade} value={formatGrade(result.bestGrade)} />
                  <Metric label={ui.gradeCalculator.weakestGrade} value={formatGrade(result.weakestGrade)} />
                </div>
                <p className="grade-calculator__lead">
                  {(result.passed ? ui.gradeCalculator.passedLead : ui.gradeCalculator.failedLead)
                    .replace("{distance}", formatAverage(result.distance)).replace("{limit}", formatGrade(PASSING_GRADE_LIMIT))}
                </p>
                <p>
                  {ui.gradeCalculator.detailText
                    .replace("{count}", String(result.count))
                    .replace("{limit}", formatGrade(PASSING_GRADE_LIMIT))}
                </p>
              </div>
            </SurfaceItem>
          )}

          {!result && gradeResult && (
            <p className="grade-calculator__preview">
              {ui.gradeCalculator.livePreview.replace("{average}", formatGrade(gradeResult.average))}
            </p>
          )}

          <div className="grade-calculator__footer-actions">
            <AppButton onClick={restart} variant="ghost">
              <RotateCcw aria-hidden="true" />
              <span>{ui.gradeCalculator.restart}</span>
            </AppButton>
          </div>
          <canvas className="grade-calculator__canvas" ref={canvasRef} aria-hidden="true" />
          <audio preload="none" ref={successAudioRef} />
          <audio preload="none" ref={failureAudioRef} />
        </Panel>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grade-calculator__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
