import { homeConfig as config } from "../../lib/homeConfig";
import { getCookie } from "../../lib/cookies";
import React from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import MobileContactForm from "./MobileContactForm.jsx";
import "./ContactForm.css";
import "./ContactSwitch.scss";

const contactApiUrl = config.contactApiUrl || "/api/contact/";

export default function ContactForm({ selectedSubject, initialMessage = "", t, language = "de" }) {
  const form = useForm({
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      subject: selectedSubject || "",
      message: initialMessage,
      privacy_consent: "on",
      company: "",
    },
  });
  const isMobile = useMediaQuery("(max-width: 47.99rem)");
  const [switched, setSwitched] = React.useState(false);
  const copy = language === "ru" ? {
    details: "Ваши контакты", message: "Ваше сообщение", next: "Далее", back: "Назад",
    firstTitle: "Обсудим ваш проект?", firstText: "Сначала укажите имя и электронную почту, затем расскажите о своей задаче.",
    secondTitle: "Рады вашему сообщению!", secondText: "Опишите вашу идею или вопрос. Я отвечу вам по электронной почте.",
  } : {
    details: "Ihre Kontaktdaten", message: "Ihre Nachricht", next: "Weiter", back: "Zurück",
    firstTitle: "Ein Projekt im Kopf?", firstText: "Kurz Ihre Kontaktdaten eintragen und anschließend von Ihrem Anliegen erzählen.",
    secondTitle: "Lassen Sie uns sprechen!", secondText: "Beschreiben Sie Ihre Idee oder Frage. Ich melde mich bei Ihnen per E-Mail.",
  };
  function toggleStep() {
    setSwitched((previous) => !previous);
  }
  const [status, setStatus] = React.useState("idle");
  const [message, setMessage] = React.useState("");
  const [sentEmail, setSentEmail] = React.useState("");
  React.useEffect(() => {
    form.setValue("subject", selectedSubject || "");
  }, [form, selectedSubject]);
  React.useEffect(() => {
    form.setValue("message", initialMessage || "");
  }, [form, initialMessage]);

  const validationMessages = {
    name: t("forms.validation.nameRequired"),
    email: t("forms.validation.emailRequired"),
    emailInvalid: t("forms.validation.emailInvalid"),
    subject: t("forms.validation.subjectRequired"),
    message: t("forms.validation.messageRequired"),
  };

  async function handleSubmit(_, event) {
    const formElement = event?.currentTarget;
    if (!formElement) return;
    setStatus("loading");
    setMessage("");
    setSentEmail("");
    const formData = new FormData(formElement);

    try {
      const response = await fetch(contactApiUrl, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : null;
      if (!response.ok || !payload?.ok) {
        const serverErrors = payload?.errors || {};
        let firstServerError = "";
        Object.entries(serverErrors).forEach(([name, value]) => {
          const errorMessage = value?.[0]?.message || value?.[0] || "";
          if (!errorMessage) return;
          if (["name", "email", "subject", "message"].includes(name)) {
            if (["name", "email"].includes(name)) setSwitched(false);
            form.setError(name, { type: "server", message: errorMessage });
            firstServerError ||= errorMessage;
          } else {
            firstServerError ||= errorMessage;
          }
        });
        setMessage(payload?.message || firstServerError || t("forms.genericError"));
        setStatus("error");
        return;
      }
      form.reset({
        name: "",
        email: "",
        subject: selectedSubject || "",
        message: initialMessage,
        privacy_consent: "on",
        company: "",
      });
      setSentEmail(String(formData.get("email") || ""));
      setMessage(payload.message);
      setStatus("success");
    } catch {
      setStatus("error");
      setMessage(t("forms.networkError"));
    }
  }

  function handleInvalidSubmit(errors) {
    if (errors.name || errors.email) setSwitched(false);
    setStatus("error");
    setMessage(t("forms.validationSummary"));
    setSentEmail("");
  }

  const isSubmitting = status === "loading" || form.formState.isSubmitting;
  const visibleStatus = isSubmitting ? "loading" : status;
  const visibleMessage = isSubmitting ? t("forms.sendingText") : message;

  const feedback = visibleMessage ? (
    <div
      id="contact-form-status"
      role={visibleStatus === "error" ? "alert" : "status"}
      aria-live={visibleStatus === "loading" ? "assertive" : "polite"}
      className={`contact-form-status contact-form-status--${visibleStatus}`}
    >
      {visibleStatus === "loading" ? (
        <>
          <Send className="contact-form-status__icon" aria-hidden="true" />
          <span>
            <strong>{t("forms.sendingTitle")}</strong>
            <span>{visibleMessage}</span>
          </span>
        </>
      ) : visibleStatus === "success" ? (
        <>
          <CheckCircle2 className="contact-form-status__icon" aria-hidden="true" />
          <span>
            <strong>{t("forms.successTitle")}</strong>
            <span>{message}</span>
            {sentEmail ? <span>{t("forms.replyTo", { email: sentEmail })}</span> : null}
          </span>
        </>
      ) : (
        <span>{message}</span>
      )}
    </div>
  ) : null;

  if (isMobile) {
    return (
      <Form {...form}>
        <MobileContactForm
          form={form}
          t={t}
          language={language}
          validationMessages={validationMessages}
          onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}
          isSubmitting={isSubmitting}
          status={visibleStatus}
          feedback={feedback}
        />
      </Form>
    );
  }

  return (
    <div className="contact-switch-container">
      <div className={`contact-switch${switched ? " s--switched" : ""}`}>
        <div className="contact-switch__inner">
          <Form {...form}>
            <form
              onSubmit={(event) => {
                if (!switched) {
                  event.preventDefault();
                  toggleStep();
                  return;
                }
                return form.handleSubmit(handleSubmit, handleInvalidSubmit)(event);
              }}
              className="contact-form contact-form--shadcn"
              noValidate
            >
              <input type="text" className="contact-form__honeypot" tabIndex="-1" autoComplete="off" {...form.register("company")} />
              <input type="hidden" value="on" {...form.register("privacy_consent")} />
              <div className="contact-switch__forms">
                <div className="contact-switch__form" aria-hidden={switched} inert={switched ? "" : undefined}>
                  <div className="contact-switch__form-content">
                    <div className="contact-switch-form">
                      <h2 className="contact-switch-form__heading">{copy.details}</h2>
                      <FormField
                        control={form.control}
                        name="name"
                        rules={{ required: validationMessages.name }}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel htmlFor="name" required>{t("forms.fields.name")}</FormLabel>
                            <FormControl>
                              <Input
                                id="name"
                                autoComplete="name"
                                placeholder={t("forms.placeholders.name")}
                                aria-invalid={Boolean(fieldState.error)}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage name="name" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        rules={{
                          required: validationMessages.email,
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: validationMessages.emailInvalid,
                          },
                        }}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel htmlFor="email" required>{t("forms.fields.email")}</FormLabel>
                            <FormControl>
                              <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                inputMode="email"
                                placeholder={t("forms.placeholders.email")}
                                aria-invalid={Boolean(fieldState.error)}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage name="email" />
                          </FormItem>
                        )}
                      />
                      <Button type="button" className="submit-button" onClick={toggleStep}>{copy.next}</Button>
                    </div>
                  </div>
                </div>
                <div className="contact-switch__form" aria-hidden={!switched} inert={!switched ? "" : undefined}>
                  <div className="contact-switch__form-content">
                    <div className="contact-switch-form">
                      <h2 className="contact-switch-form__heading">{copy.message}</h2>
                      <FormField
                        control={form.control}
                        name="subject"
                        rules={{ required: validationMessages.subject }}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel htmlFor="subject" required>{t("forms.fields.subject")}</FormLabel>
                            <FormControl>
                              <Input id="subject" maxLength="160" placeholder={t("forms.placeholders.subject")} aria-invalid={Boolean(fieldState.error)} {...field} />
                            </FormControl>
                            <FormMessage name="subject" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        rules={{ required: validationMessages.message }}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel htmlFor="message" required>{t("forms.fields.message")}</FormLabel>
                            <FormControl>
                              <Textarea
                                id="message"
                                rows="4"
                                maxLength="4000"
                                placeholder={t("forms.placeholders.message")}
                                aria-invalid={Boolean(fieldState.error)}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage name="message" />
                          </FormItem>
                        )}
                      />

                      {feedback}

                      <Button type="submit" disabled={isSubmitting} className="submit-button" aria-describedby={visibleMessage ? "contact-form-status" : undefined}>
                        <Mail className="submit-button__icon" aria-hidden="true" />
                        {isSubmitting ? t("forms.submitting") : t("forms.submit")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </Form>
          <aside className="contact-switch__switcher">
            <div className="contact-switch__switcher-inner">
              <div className="contact-switch__switcher-content">
                <div className="contact-switch__switcher-text">
                  <div aria-hidden={switched}><h3>{copy.firstTitle}</h3><p>{copy.firstText}</p></div>
                  <div aria-hidden={!switched}><h3>{copy.secondTitle}</h3><p>{copy.secondText}</p></div>
                </div>
                <button type="button" className="contact-switch__switcher-btn" onClick={toggleStep} aria-label={switched ? copy.back : copy.next}>
                  <span className="contact-switch__animated-border" aria-hidden="true" />
                  <span className="contact-switch__switcher-btn-inner" aria-hidden="true"><span>{copy.next}</span><span>{copy.back}</span></span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
