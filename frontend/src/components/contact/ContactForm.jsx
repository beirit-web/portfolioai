import React from "react";
import { homeConfig, publicPageUrl } from "../../lib/homeConfig";
import { getCookie } from "../../lib/cookies";
import "./ContactForm.css";

const fieldNames = ["name", "email", "subject", "message"];
const validationFields = [...fieldNames, "privacy_consent"];
const apiUrl = homeConfig.contactApiUrl || "/api/contact/";

export default function ContactForm({ selectedSubject = "", initialMessage = "", t }) {
  const [values, setValues] = React.useState({ name: "", email: "", subject: selectedSubject, message: initialMessage });
  const [errors, setErrors] = React.useState({});
  const [status, setStatus] = React.useState("idle");
  const [message, setMessage] = React.useState("");
  const [sentEmail, setSentEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const sending = React.useRef(false);
  const errorFocus = React.useRef(null);
  const formRef = React.useRef(null);
  React.useEffect(() => { setValues(previous => ({ ...previous, subject: selectedSubject })); }, [selectedSubject]);
  React.useEffect(() => { setValues(previous => ({ ...previous, message: initialMessage })); }, [initialMessage]);
  React.useEffect(() => {
    if (status === "error" && errorFocus.current) {
      formRef.current?.elements.namedItem(errorFocus.current)?.focus();
      errorFocus.current = null;
    }
  }, [errors, status]);

  function updateField(name, value) {
    if (name === "privacy_consent") setConsent(value);
    else setValues(previous => ({ ...previous, [name]: value }));
    const remaining = { ...errors };
    delete remaining[name];
    setErrors(remaining);
    if (!Object.keys(remaining).length) {
      setStatus("idle");
      setMessage("");
      setSentEmail("");
    }
  }

  function showErrors(nextErrors, summary) {
    errorFocus.current = validationFields.find(name => nextErrors[name]);
    setErrors(nextErrors);
    setStatus("error");
    setMessage(summary);
  }

  async function submit(event) {
    event.preventDefault();
    if (sending.current) return;
    const nextErrors = {};
    for (const name of fieldNames) {
      if (!values[name].trim()) nextErrors[name] = t(`forms.validation.${name}Required`);
    }
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = t("forms.validation.emailInvalid");
    }
    if (!consent) nextErrors.privacy_consent = t("forms.validation.privacyRequired");
    if (Object.keys(nextErrors).length) {
      showErrors(nextErrors, t("forms.validationSummary"));
      return;
    }
    const data = new FormData(event.currentTarget);
    sending.current = true;
    setErrors({});
    setStatus("loading");
    setMessage(t("forms.sendingText"));
    setSentEmail("");
    try {
      const response = await fetch(apiUrl, {
        method: "POST", body: data, credentials: "same-origin",
        headers: { "X-CSRFToken": getCookie("csrftoken"), "X-Requested-With": "XMLHttpRequest" },
      });
      const payload = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
      if (!response.ok || !payload?.ok) {
        const serverErrors = Object.fromEntries(Object.entries(payload?.errors || {}).map(([name, list]) => {
          const code = list[0]?.code;
          const key = code === "required" ? `${name === "privacy_consent" ? "privacy" : name}Required`
            : code === "invalid" && name === "email" ? "emailInvalid"
            : code === "max_length" ? "tooLong" : "fieldInvalid";
          return [name, t(`forms.validation.${key}`)];
        }));
        showErrors(serverErrors, t(response.status === 429 ? "forms.rateLimited"
          : Object.keys(serverErrors).length ? "forms.validationSummary" : "forms.genericError"));
        return;
      }
      setSentEmail(String(data.get("email") || ""));
      setValues({ name: "", email: "", subject: selectedSubject, message: initialMessage });
      setConsent(false);
      setStatus("success");
      setMessage(t("forms.successText"));
    } catch {
      setStatus("error");
      setMessage(t("forms.networkError"));
    } finally {
      sending.current = false;
    }
  }

  return (
    <form ref={formRef} className="portfolio-contact-form" action={apiUrl} method="post" onSubmit={submit}
      noValidate aria-labelledby="contact-form-title" aria-describedby="contact-form-instructions"
      aria-busy={status === "loading"} data-status={status}>
      <input type="text" name="company" className="contact-form__honeypot" tabIndex="-1" autoComplete="off" aria-hidden="true" />
      <h2 id="contact-form-title">{t("forms.title")}</h2>
      <p id="contact-form-instructions" className="portfolio-contact-form__instructions">{t("forms.requiredHint")}</p>
      <fieldset className="portfolio-contact-form__body" disabled={status === "loading"}>
        <div className="portfolio-contact-form__fields">
          {fieldNames.map(name => {
            const Control = name === "message" ? "textarea" : "input";
            return (
              <div className={`portfolio-contact-form__field portfolio-contact-form__field--${name}`} key={name}>
                <label htmlFor={name}>{t(`forms.fields.${name}`)}</label>
                <Control id={name} name={name} type={name === "message" ? undefined : name === "email" ? "email" : "text"}
                  rows={name === "message" ? 6 : undefined}
                  autoComplete={name === "name" || name === "email" ? name : undefined}
                  maxLength={name === "name" ? 120 : name === "subject" ? 160 : name === "message" ? 4000 : undefined}
                  placeholder={t(`forms.placeholders.${name}`)} value={values[name]}
                  onChange={event => updateField(name, event.target.value)}
                  required aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} />
                {errors[name] ? <p id={`${name}-error`} className="portfolio-contact-form__error">{errors[name]}</p> : null}
              </div>
            );
          })}
        </div>
        <div className="portfolio-contact-form__privacy">
          <label className="portfolio-contact-form__consent" htmlFor="privacy_consent">
            <input id="privacy_consent" type="checkbox" name="privacy_consent" value="on" required
              checked={consent} onChange={event => updateField("privacy_consent", event.target.checked)}
              aria-invalid={Boolean(errors.privacy_consent)}
              aria-describedby={errors.privacy_consent ? "privacy_consent-error" : undefined} />
            <span>{t("forms.privacy.text")}</span>
          </label>
          <a href={publicPageUrl("/datenschutz/")}>{t("forms.privacy.link")}</a>
          {errors.privacy_consent ? <p id="privacy_consent-error" className="portfolio-contact-form__error">{errors.privacy_consent}</p> : null}
        </div>
      </fieldset>
      <div className="portfolio-contact-form__actions">
        <div id="contact-form-status" role={status === "error" ? "alert" : "status"}
          aria-live={status === "error" ? "assertive" : "polite"} aria-atomic="true"
          className={`contact-form-status contact-form-status--${status}`}>
          {status === "success" ? <strong>{t("forms.successTitle")}</strong> : null}
          {message ? <span>{message}</span> : null}
          {status === "success" && sentEmail ? <span>{t("forms.replyTo", { email: sentEmail })}</span> : null}
        </div>
        <button type="submit" disabled={status === "loading"}>{t(status === "loading" ? "forms.submitting" : "forms.submit")}</button>
      </div>
    </form>
  );
}
