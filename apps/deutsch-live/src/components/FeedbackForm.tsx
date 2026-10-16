import { useState } from "react";
import type { FormEvent } from "react";
import { MessageSquarePlus, Send } from "lucide-react";
import { submitFeedback, type FeedbackCategory } from "../api";
import { ui } from "../i18n";
import { AppButton, SelectInput, TextArea, TextInput } from "./UiPrimitives";

const categories: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "bug", label: ui.feedback.bug },
  { value: "suggestion", label: ui.feedback.suggestion },
  { value: "content", label: ui.feedback.content },
  { value: "account", label: ui.feedback.account },
  { value: "other", label: ui.feedback.other }
];

export default function FeedbackForm() {
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await submitFeedback({
        category,
        message,
        contactEmail: contactEmail.trim() || undefined,
        pagePath: window.location.pathname
      });
      setMessage("");
      setContactEmail("");
      setStatusType("success");
      setStatus(ui.feedback.sent);
    } catch (error) {
      setStatusType("error");
      setStatus(error instanceof Error ? error.message : ui.feedback.failed);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="glass mt-10 rounded-xl p-3 sm:rounded-[2rem] sm:p-8">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">
        {ui.feedback.eyebrow}
      </p>
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-black">
            <MessageSquarePlus className="h-8 w-8" />
            {ui.feedback.title}
          </h2>
          <p className="mt-4 text-slate-700 dark:text-slate-300">{ui.feedback.description}</p>
        </div>

        <form className="rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70" onSubmit={submit}>
          <SelectInput
            id="feedback-category"
            label={ui.feedback.category}
            onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
            value={category}
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </SelectInput>

          <TextArea
            fieldClassName="mt-4"
            id="feedback-message"
            label={ui.feedback.message}
            maxLength={2000}
            minLength={10}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={ui.feedback.placeholder}
            required
            value={message}
          />

          <TextInput
            fieldClassName="mt-4"
            id="feedback-email"
            label={ui.feedback.contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="name@example.com"
            type="email"
            value={contactEmail}
          />

          <AppButton className="mt-4" disabled={isSaving} type="submit">
            <Send className="h-4 w-4" />
            {isSaving ? ui.feedback.sending : ui.feedback.send}
          </AppButton>
          {status && <p className={`status-message mt-3 status-message--${statusType}`}>{status}</p>}
        </form>
      </div>
    </section>
  );
}
