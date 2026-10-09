import FeedbackForm from "./FeedbackForm";
import type { ReactNode } from "react";
import { ui } from "../i18n";

const provider = (
  <>
    <strong>Beirit Digital</strong>
    <br />
    Max Mustermann
  </>
);

export function DatenschutzPage() {
  return (
    <LegalShell eyebrow="Datenschutz" title="Datenschutzerklärung">
      <LegalBlock title="Verantwortlicher">
        {provider}
        <br />
        Kontakt: max.mustermann@example.com
      </LegalBlock>
      <LegalBlock title="Zweck der Plattform">
        Beirit Digital stellt eine Lernplattform für Deutsch im Alltag bereit. Die Plattform richtet sich insbesondere an
        russischsprachige Nutzer und verarbeitet Daten, die für Accounts, Sessions, Lernfortschritt, Quizfunktionen,
        Schreibtraining und Feedback notwendig sind.
      </LegalBlock>
      <LegalBlock title="Accountdaten">
        Bei Registrierung und Anmeldung werden insbesondere Benutzername, E-Mail-Adresse, Passwort-Hash,
        Bestätigungsstatus und technische Sessioninformationen verarbeitet. Diese Daten werden benötigt, um Konten
        bereitzustellen, Logins zu schützen und Lernfortschritt einem Konto zuordnen zu können.
      </LegalBlock>
      <LegalBlock title="Lernfortschritt, Quiz und Schreibtraining">
        Die Plattform kann absolvierte Szenen, Quiz-Ergebnisse, gespeicherte Wörter, Schreibübungen, Korrekturverläufe
        und Dashboard-Empfehlungen speichern. Zweck ist die persönliche Lernübersicht und die Fortsetzung begonnener
        Übungen.
      </LegalBlock>
      <LegalBlock title={ui.recordingsLegal.privacyTitle} paragraphs={ui.recordingsLegal.privacy} />
      <LegalBlock title={ui.recordingsLegal.retentionTitle} paragraphs={ui.recordingsLegal.retention} />
      <LegalBlock title={ui.recordingsLegal.accessTitle} paragraphs={ui.recordingsLegal.access} />
      <LegalBlock title={ui.recordingsLegal.storageTitle}>
        {ui.recordingsLegal.storage}{" "}
        <a className="underline" href="https://www.gesetze-im-internet.de/ttdsg/__25.html" target="_blank" rel="noreferrer">§ 25 Abs. 2 Nr. 2 TDDDG</a>.
      </LegalBlock>
      <LegalBlock title="Kontakt und Feedback">
        Wenn Nutzer Feedback senden oder Kontakt aufnehmen, werden die eingegebenen Inhalte, Kategorie, Zeitpunkt und
        technische Sicherheitsdaten verarbeitet, um Anfragen zu beantworten und Missbrauch zu verhindern.
      </LegalBlock>
      <LegalBlock title="Cookies, Sessions und Logs">
        Für Login, Sicherheit und technische Stabilität können notwendige Cookies, Sessiondaten und Server-Logs verarbeitet
        werden. Sicherheitsrelevante Ereignisse können protokolliert werden, ohne unnötige sensible Inhalte zu speichern.
      </LegalBlock>
      <LegalBlock title="Hosting und vorbereitete Dienste">
        Diese Portfolio-Demonstration verwendet Musterhosting. Zahlungsdienste und echte Zahlungen sind deaktiviert.
        Externe Dienste sind nur als Beispiele dokumentiert und werden nicht automatisch verbunden.
      </LegalBlock>
      <LegalBlock title="Nutzerrechte">
        Nutzer können Auskunft, Berichtigung, Löschung, Export und Widerspruch anfragen. Kontakt dafür:
        max.mustermann@example.com.
      </LegalBlock>
    </LegalShell>
  );
}

export function NutzungsbedingungenPage() {
  return (
    <LegalShell eyebrow="Regeln" title="Nutzungsbedingungen">
      <LegalBlock title="Anbieter">
        {provider}
      </LegalBlock>
      <LegalBlock title="Lernplattform">
        Die Plattform dient dem Lernen der deutschen Sprache anhand realitätsnaher Alltagssituationen in Deutschland.
        Inhalte dürfen nicht missbräuchlich, rechtswidrig oder störend genutzt werden.
      </LegalBlock>
      <LegalBlock title="Accounts">
        Nutzer müssen Zugangsdaten vertraulich behandeln und dürfen fremde Konten nicht verwenden. Bei Sicherheitsrisiken,
        Missbrauch oder störendem Verhalten kann der Zugriff eingeschränkt werden.
      </LegalBlock>
      <LegalBlock title="Accounts und Premium-Vorbereitung">
        Nutzer sind für die sichere Verwendung ihrer Zugangsdaten verantwortlich. Premium-Funktionen können später ergänzt
        werden und werden vor Aktivierung gesondert beschrieben.
      </LegalBlock>
      <LegalBlock title={ui.recordingsLegal.useTitle} paragraphs={ui.recordingsLegal.use} />
      <LegalBlock title={ui.recordingsLegal.backupTitle} paragraphs={ui.recordingsLegal.backup} />
      <LegalBlock title="Lerninhalte und Verfügbarkeit">
        Lerninhalte werden sorgfältig erstellt, können aber Fehler enthalten und jederzeit angepasst werden. Ein Anspruch
        auf dauerhaft unveränderte Inhalte oder unterbrechungsfreie Verfügbarkeit besteht nicht.
      </LegalBlock>
      <LegalBlock title="Keine Beratung">
        Die Inhalte ersetzen keine Rechtsberatung, medizinische Beratung oder behördliche Auskunft. KI-Funktionen können
        künftig unterstützen, aber Fehler machen und keine verbindliche Beratung leisten.
      </LegalBlock>
    </LegalShell>
  );
}

export function KontaktPage() {
  return (
    <>
      <LegalShell eyebrow="Kontakt" title="Kontakt">
        <LegalBlock title="Beirit Digital">
          Eugen Beirit
          <br />
          E-Mail: kontakt@beirit.digital
        </LegalBlock>
        <LegalBlock title="Support und Feedback">
          Für Fragen zur Lernplattform, Hinweise zu Fehlern oder Feedback zur Nutzung bitte die Kontaktadresse oder das
          Feedbackformular verwenden.
        </LegalBlock>
        <LegalBlock title="Antwort und Sicherheit">
          Bitte keine Passwörter, Ausweiskopien oder besonders sensiblen Daten über das Feedbackformular senden. Technische
          Anfragen werden nach Möglichkeit per E-Mail beantwortet.
        </LegalBlock>
        <LegalBlock title="Feedbackformular">
          Das Formular unten ist für Fehlerhinweise, Inhaltsvorschläge und allgemeine Rückmeldungen zur Lernplattform
          gedacht. Für verbindliche rechtliche Anliegen bitte direkt per E-Mail schreiben.
        </LegalBlock>
      </LegalShell>
      <div id="feedback">
        <FeedbackForm />
      </div>
    </>
  );
}

function LegalShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <article className="glass legal-page rounded-xl px-3 py-5 sm:rounded-[2rem] sm:p-8 lg:p-10">
      <p className="text-sm font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">
        Beirit Digital
      </p>
      <div className="mt-4 max-w-3xl">
        <p className="font-bold text-slate-600 dark:text-slate-300">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">{title}</h2>
        <p className="mt-4 text-lg leading-8 text-slate-700 dark:text-slate-300">
          Живой немецкий через реальные ситуации
        </p>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">{children}</div>
    </article>
  );
}

function LegalBlock({ title, children, paragraphs }: { title: string; children?: ReactNode; paragraphs?: string[] }) {
  return (
    <section className="rounded-xl bg-white/75 p-4 shadow-sm shadow-slate-900/5 dark:bg-slate-900/70">
      <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
      {children && <p className="mt-3 leading-7 text-slate-700 dark:text-slate-300">{children}</p>}
      {paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 leading-7 text-slate-700 dark:text-slate-300">{paragraph}</p>)}
    </section>
  );
}
