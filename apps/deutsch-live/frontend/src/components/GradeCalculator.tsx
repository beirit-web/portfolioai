import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Calculator, CheckCircle2, GraduationCap, RotateCcw, XCircle } from "lucide-react";
import { AppButton, Panel, SurfaceItem } from "./UiPrimitives";
import { ui } from "../i18n";

const PASSING_GRADE_LIMIT = 4.0;
const MIN_GRADE = 1;
const MAX_GRADE = 6;
const MAX_SUBJECTS = 20;
const DECIMAL_PATTERN = /^[1-6](?:[,.]\d{1,2})?$/;
const SUCCESS_AUDIO_URL = "/static/portfolio/test-main/gewonnen.mp3";
const FAILURE_AUDIO_URL = "/static/portfolio/test-main/lost-signal.mp3";
const SUCCESS_IMAGE_URL = "/static/portfolio/test-main/img/favicon.png";
const FAILURE_IMAGE_URL = "/static/portfolio/test-main/img/lost.png";

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

function createEmptyGrades(count: number) {
  return Array.from({ length: count }, () => "");
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

  const subjectTotal = Number.parseInt(subjectCount, 10);
  const isValidSubjectCount = Number.isInteger(subjectTotal) && subjectTotal >= 1 && subjectTotal <= MAX_SUBJECTS;
  const stepText = ui.gradeCalculator.stepIndicator
    .replace("{step}", String(step))
    .replace("{total}", "3");

  const gradeResult = useMemo(() => {
    const parsedGrades = grades.map(parseGermanDecimal);
    if (parsedGrades.length === 0 || parsedGrades.some((grade) => !Number.isFinite(grade))) return null;

    const average = parsedGrades.reduce((sum, grade) => sum + grade, 0) / parsedGrades.length;
    return {
      average,
      roundedUp: Math.ceil(average * 10) / 10,
      bestGrade: Math.min(...parsedGrades),
      weakestGrade: Math.max(...parsedGrades),
      distance: Math.abs(PASSING_GRADE_LIMIT - average),
      passed: average < PASSING_GRADE_LIMIT,
      count: parsedGrades.length
    };
  }, [grades]);

  useEffect(() => {
    return () => {
      stopCelebration();
      stopResultAudio();
    };
  }, []);

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
      return;
    }

    setInvalidFields(new Set());
    setGrades(createEmptyGrades(subjectTotal));
    updateStatus(ui.gradeCalculator.enterGrades.replace("{count}", String(subjectTotal)));
    setStep(3);
  }

  function calculate(event: FormEvent) {
    event.preventDefault();
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
      return;
    }

    const average = parsedGrades.reduce((sum, grade) => sum + grade, 0) / parsedGrades.length;
    const nextResult = {
      average,
      roundedUp: Math.ceil(average * 10) / 10,
      bestGrade: Math.min(...parsedGrades),
      weakestGrade: Math.max(...parsedGrades),
      distance: Math.abs(PASSING_GRADE_LIMIT - average),
      passed: average < PASSING_GRADE_LIMIT,
      count: parsedGrades.length
    };

    setResult(nextResult);
    updateStatus(nextResult.passed ? ui.gradeCalculator.passedStatus : ui.gradeCalculator.failedStatus, nextResult.passed ? "success" : "error");
    if (nextResult.passed) startCelebration();
    playResultAudio(nextResult.passed);
  }

  function restart() {
    stopCelebration();
    setStep(1);
    setName("");
    setSubjectCount("6");
    setGrades(createEmptyGrades(6));
    setResult(null);
    setInvalidFields(new Set());
    updateStatus(ui.gradeCalculator.initialStatus);
  }

  function stopCelebration() {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
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
    audio.volume = passed ? 0.48 : 0.36;
    void audio.play().catch(() => undefined);
  }

  function startCelebration() {
    stopCelebration();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
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
        animationRef.current = window.requestAnimationFrame(draw);
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
          <h2 className="view-title mt-4 flex items-center gap-3" id="grade-calculator-title">
            <Calculator className="h-8 w-8 text-indigo-600 dark:text-indigo-200" />
            {ui.gradeCalculator.title}
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
          <p className={`grade-calculator__status grade-calculator__status--${statusType}`} role="status" aria-live="polite">
            {status}
          </p>

          <form className="grade-calculator__form" onSubmit={calculate} noValidate>
            {step === 1 && (
              <div className="grade-calculator__step-panel">
                <label htmlFor="grade-name">{ui.gradeCalculator.nameLabel}</label>
                <input
                  autoComplete="name"
                  id="grade-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder={ui.gradeCalculator.namePlaceholder}
                  type="text"
                  value={name}
                />
                <AppButton onClick={goToSubjects}>{ui.common.next}</AppButton>
              </div>
            )}

            {step === 2 && (
              <div className="grade-calculator__step-panel">
                <label htmlFor="grade-subjects">{ui.gradeCalculator.subjectsLabel}</label>
                <input
                  aria-invalid={invalidFields.has("subjects")}
                  id="grade-subjects"
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
                <p className="grade-calculator__hint">{ui.gradeCalculator.subjectHint.replace("{max}", String(MAX_SUBJECTS))}</p>
                <div className="grade-calculator__actions">
                  <AppButton onClick={() => setStep(1)} variant="secondary">{ui.gradeCalculator.back}</AppButton>
                  <AppButton onClick={prepareGrades}>{ui.gradeCalculator.enterGradesButton}</AppButton>
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
                        id={`grade-${index}`}
                        inputMode="decimal"
                        max={MAX_GRADE}
                        min={MIN_GRADE}
                        onChange={(event) => {
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
                  src={result.passed ? SUCCESS_IMAGE_URL : FAILURE_IMAGE_URL}
                />
              </figure>
              <div className="grade-calculator__result-content">
                <div className="grade-calculator__result-heading">
                  {result.passed ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
                  <h3>{ui.gradeCalculator.resultTitle}</h3>
                </div>
                <div className="grade-calculator__metrics">
                  <Metric label={ui.gradeCalculator.average} value={formatGrade(result.average)} />
                  <Metric label={ui.gradeCalculator.roundedUp} value={formatGrade(result.roundedUp)} />
                  <Metric label={ui.gradeCalculator.bestGrade} value={formatGrade(result.bestGrade)} />
                  <Metric label={ui.gradeCalculator.weakestGrade} value={formatGrade(result.weakestGrade)} />
                </div>
                <p className="grade-calculator__lead">
                  {(result.passed ? ui.gradeCalculator.passedLead : ui.gradeCalculator.failedLead)
                    .replace("{distance}", formatGrade(result.distance))}
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
              {ui.gradeCalculator.restart}
            </AppButton>
          </div>
          <canvas className="grade-calculator__canvas" ref={canvasRef} aria-hidden="true" />
          <audio preload="auto" ref={successAudioRef} src={SUCCESS_AUDIO_URL} />
          <audio preload="auto" ref={failureAudioRef} src={FAILURE_AUDIO_URL} />
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
