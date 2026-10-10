import React from "react";
import { FileText, Mail, MessageSquare, UserRound } from "lucide-react";
import { FormField, FormMessage } from "../ui/form";
import "./MobileContactForm.scss";

const fieldDirections = {
  name: "face-up-left",
  email: "face-up-right",
  subject: "face-up-left",
  message: "",
};

const contactCopy = {
  de: { label: "Kontaktformular", hint: "Projektfrage oder Interesse an Zusammenarbeit? Schreiben Sie mir." },
  ru: { label: "Контактная форма", hint: "Вопрос о проекте или предложение о сотрудничестве? Напишите мне." },
  uk: { label: "Контактна форма", hint: "Питання про проєкт або пропозиція співпраці? Напишіть мені." },
};

function FieldIcon({ icon: Icon }) {
  return (
    <span className="contact-mobile-icon" aria-hidden="true">
      <Icon className="contact-mobile-icon__front" />
      <Icon className="contact-mobile-icon__back" />
    </span>
  );
}

export default function MobileContactForm({
  form, t, language, validationMessages, onSubmit, isSubmitting, status, feedback,
}) {
  const [direction, setDirection] = React.useState("");
  const [submitAttempt, setSubmitAttempt] = React.useState(0);
  const focusedFieldRef = React.useRef(null);
  const copy = contactCopy[language] || contactCopy.de;

  React.useEffect(() => {
    if (focusedFieldRef.current && !isSubmitting) {
      setDirection(fieldDirections[focusedFieldRef.current]);
    }
  }, [isSubmitting]);

  React.useEffect(() => {
    if (status !== "success" && status !== "error") return undefined;
    setDirection("");
    const animationTimer = setTimeout(() => {
      if (focusedFieldRef.current === "message") return;
      setDirection(status === "success" ? "form-complete" : "form-error");
    }, 1000);
    const resetTimer = setTimeout(() => setDirection(""), 3000);
    return () => {
      clearTimeout(animationTimer);
      clearTimeout(resetTimer);
    };
  }, [status, submitAttempt]);

  const fields = [
    { name: "name", icon: UserRound, autoComplete: "name" },
    { name: "email", icon: Mail, type: "email", autoComplete: "off", inputMode: "email" },
    { name: "subject", icon: FileText, maxLength: 160 },
    { name: "message", icon: MessageSquare, maxLength: 4000, multiline: true },
  ];
  const isAnimatingSuccess = direction === "form-complete";

  function handleFocus(name) {
    focusedFieldRef.current = name;
    if (name === "message") {
      setDirection("");
      return;
    }
    if (!isSubmitting && !isAnimatingSuccess) {
      setDirection(fieldDirections[name]);
    }
  }

  function handleBlur() {
    focusedFieldRef.current = null;
    if (!isSubmitting && !isAnimatingSuccess && direction !== "form-error") setDirection("");
  }

  function handleSubmit(event) {
    focusedFieldRef.current = null;
    setDirection("");
    setSubmitAttempt((previous) => previous + 1);
    return onSubmit(event);
  }

  return (
    <div className="contact-mobile-stage">
      <form
        className={`contact-mobile-form${direction ? ` ${direction}` : ""}`}
        onSubmit={handleSubmit}
        data-success-label={t("forms.successTitle")}
        aria-label={copy.label}
        aria-busy={isSubmitting}
        noValidate
      >
        <input type="text" className="contact-form__honeypot" tabIndex="-1" autoComplete="off" {...form.register("company")} />
        <input type="hidden" value="on" {...form.register("privacy_consent")} />
        {fields.map(({ name, icon, multiline, ...inputProps }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            rules={{
              required: validationMessages[name],
              ...(name === "email" ? {
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: validationMessages.emailInvalid },
              } : {}),
            }}
            render={({ field, fieldState }) => {
              const Control = multiline ? "textarea" : "input";
              return (
                <div className="contact-mobile-form__item">
                  <label className="contact-mobile-label" htmlFor={name}>{t(`forms.fields.${name}`)}</label>
                  <div className={`contact-mobile-field contact-mobile-field--${name}`}>
                    <FieldIcon icon={icon} />
                    <Control
                      {...inputProps}
                      {...field}
                      id={name}
                      className="contact-mobile-input"
                      placeholder={t(`forms.fields.${name}`)}
                      aria-required="true"
                      aria-invalid={Boolean(fieldState.error)}
                      aria-describedby={fieldState.error ? `mobile-${name}-error` : undefined}
                      onFocus={() => handleFocus(name)}
                      onBlur={() => { field.onBlur(); handleBlur(); }}
                    />
                  </div>
                  <div id={`mobile-${name}-error`}><FormMessage name={name} /></div>
                </div>
              );
            }}
          />
        ))}
        <button type="submit" className="contact-mobile-button" disabled={isSubmitting || isAnimatingSuccess}>
          {isSubmitting ? t("forms.submitting") : t("forms.submit")}
          <span className="contact-mobile-button__top-bottom" aria-hidden="true" />
          <span className="contact-mobile-button__left-right" aria-hidden="true" />
        </button>
        <small className="contact-mobile-hint">
          {copy.hint}
        </small>
      </form>
      {feedback ? <div className="contact-mobile-feedback contact-form--shadcn">{feedback}</div> : null}
    </div>
  );
}
