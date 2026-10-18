import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Copy, KeyRound, LogIn, LogOut, Trash2, UserPlus } from "lucide-react";
import {
  changePassword, deleteAccount, EMAIL_VERIFICATION_RESEND_URL, loginUser, logoutUser, PASSWORD_RESET_URL,
  registerUser, resendEmailConfirmation, type CurrentUser
} from "../api";
import { ui } from "../i18n";

type AuthPanelProps = {
  user: CurrentUser | null;
  onUserChange: (user: CurrentUser | null) => void;
  onDashboardRefresh: () => void;
};

type AuthSessionProps = AuthPanelProps & {
  message: string;
  setMessage: (message: string) => void;
  hasError: boolean;
  setHasError: (hasError: boolean) => void;
};

const inputClass = "mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-950 outline-none focus:border-cyan-400";
const primaryClass = "inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryClass = "inline-flex items-center gap-2 rounded-2xl border border-slate-300/70 px-4 py-3 font-bold disabled:opacity-60 dark:border-slate-700";

export default function AuthPanel(props: AuthPanelProps) {
  const [message, setMessage] = useState(() => {
    const confirmed = new URLSearchParams(window.location.search).get("emailConfirmed");
    return confirmed === "1" ? ui.account.emailConfirmed : confirmed === "invalid" ? ui.account.emailConfirmInvalid : "";
  });
  const [hasError, setHasError] = useState(() => new URLSearchParams(window.location.search).get("emailConfirmed") === "invalid");
  return <AuthSession key={props.user?.id ?? "guest"} {...props}
    message={message} setMessage={setMessage} hasError={hasError} setHasError={setHasError} />;
}

function AuthSession({ user, onUserChange, onDashboardRefresh, message, setMessage, hasError, setHasError }: AuthSessionProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [confirmationError, setConfirmationError] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const pending = useRef(false);
  const confirmationInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function runAction(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setMessage(""); setHasError(false);
    try { await action(); }
    catch (error) {
      if (active.current) {
        setHasError(true);
        setMessage(error instanceof Error ? error.message : ui.account.authFailed);
      }
    } finally {
      if (active.current) { pending.current = false; setBusy(false); }
    }
  }

  function changeMode(next: "login" | "register") {
    if (pending.current) return;
    setMode(next); setPassword(""); setConfirmation("");
    setConfirmationError(false); setMessage(""); setHasError(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if (mode === "register" && password !== confirmation) {
      setConfirmationError(true); setHasError(true); setMessage(ui.account.passwordMismatch);
      confirmationInput.current?.focus();
      return;
    }
    setConfirmationError(false);
    await runAction(async () => {
      if (mode === "login") {
        const response = await loginUser({ username: username.trim(), password });
        if (!active.current) return;
        setPassword("");
        onUserChange(response.user);
        onDashboardRefresh();
      } else {
        const response = await registerUser({ username: username.trim(), email: email.trim(), password });
        if (!active.current) return;
        setMode("login"); setEmail(""); setPassword(""); setConfirmation("");
        setMessage(response.emailDelivery === "console" ? ui.account.registrationEmailConsole : ui.account.registrationEmailSent);
      }
    });
  }

  async function signOut() {
    await runAction(async () => {
      await logoutUser();
      if (!active.current) return;
      onUserChange(null);
      onDashboardRefresh();
    });
  }

  async function submitPasswordChange(event: FormEvent) {
    event.preventDefault();
    await runAction(async () => {
      await changePassword(currentPassword, newPassword);
      if (!active.current) return;
      setCurrentPassword(""); setNewPassword("");
      setMessage(ui.account.passwordChanged);
      onUserChange(null);
    });
  }

  async function sendEmailConfirmation() {
    await runAction(async () => {
      await resendEmailConfirmation();
      if (active.current) setMessage(ui.account.emailConfirmationSent);
    });
  }

  function generatePassword() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_";
    const values = new Uint32Array(18);
    window.crypto.getRandomValues(values);
    const generated = Array.from(values, value => alphabet[value % alphabet.length]).join("");
    setPassword(generated); setConfirmation(generated); setConfirmationError(false);
    setHasError(false); setMessage(ui.account.passwordGenerated);
  }

  async function copyPassword() {
    if (!password) return;
    await runAction(async () => {
      try { await navigator.clipboard.writeText(password); }
      catch { throw new Error(ui.account.copyFailed); }
      if (active.current) setMessage(ui.account.passwordCopied);
    });
  }

  async function removeAccount(event: FormEvent) {
    event.preventDefault();
    await runAction(async () => {
      await deleteAccount(deletePassword);
      if (!active.current) return;
      setDeletePassword("");
      setMessage(ui.account.deleteSuccess);
      onUserChange(null);
      onDashboardRefresh();
    });
  }

  const status = <p id="account-status" role={hasError ? "alert" : "status"} aria-live="polite" className="mt-4 font-semibold text-slate-700 dark:text-slate-300">
    {busy ? ui.account.working : message}
  </p>;

  if (user) {
    return (
      <section aria-busy={busy} className="glass mt-10 rounded-xl p-3 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">{ui.account.active}</p>
            <h2 className="text-3xl font-black">{ui.account.hello}, {user.username}</h2>
            <p className="mt-2 text-slate-700 dark:text-slate-300">{ui.account.savedHistory}</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <button className={secondaryClass} disabled={busy} onClick={signOut} type="button">
              <LogOut className="h-5 w-5" />{ui.common.logout}
            </button>
            {!user.settings.emailVerified && (
              <button className={secondaryClass} disabled={busy} onClick={sendEmailConfirmation} type="button">
                <KeyRound className="h-5 w-5" />{ui.account.resendEmail}
              </button>
            )}
            <button aria-controls="account-password-change" aria-expanded={showPasswordChange} className={secondaryClass} disabled={busy} onClick={() => setShowPasswordChange(value => !value)} type="button">
              <KeyRound className="h-5 w-5" />{ui.account.changePassword}
            </button>
            <button aria-controls="account-delete" aria-expanded={showDelete} className={secondaryClass} disabled={busy} onClick={() => setShowDelete(value => !value)} type="button">
              <Trash2 className="h-5 w-5" />{ui.account.deleteAccount}
            </button>
          </div>
        </div>
        {!user.settings.emailVerified && <p className="mt-4 rounded-xl bg-cyan-500/10 p-3 font-semibold text-cyan-800 dark:text-cyan-200">{ui.account.emailNotVerified}</p>}
        {showPasswordChange && (
          <form aria-label={ui.account.changePassword} id="account-password-change" className="mt-6 rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70" onSubmit={submitPasswordChange}>
            <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
              <h3 className="text-xl font-black">{ui.account.changePassword}</h3>
              <label className="mt-4 block text-sm font-bold" htmlFor="current-password">{ui.account.currentPassword}</label>
              <input autoComplete="current-password" className={inputClass} id="current-password" name="currentPassword" maxLength={1024} onChange={event => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} />
              <label className="mt-4 block text-sm font-bold" htmlFor="new-password">{ui.account.newPassword}</label>
              <input autoComplete="new-password" className={inputClass} id="new-password" name="newPassword" minLength={8} maxLength={1024} onChange={event => setNewPassword(event.target.value)} required type="password" value={newPassword} />
              <button className={`mt-4 ${primaryClass}`} type="submit"><KeyRound className="h-5 w-5" />{ui.account.changePassword}</button>
            </fieldset>
          </form>
        )}
        {showDelete && (
          <form aria-label={ui.account.deleteAccount} id="account-delete" className="mt-6 rounded-xl bg-red-500/10 p-3 sm:rounded-[1.5rem] sm:p-5" onSubmit={removeAccount}>
            <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
              <h3 className="text-xl font-black text-red-800 dark:text-red-200">{ui.account.deleteAccount}</h3>
              <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-200">{ui.account.deleteWarning}</p>
              <label className="mt-4 block text-sm font-bold" htmlFor="delete-password">{ui.account.confirmPassword}</label>
              <input autoComplete="current-password" className={inputClass} id="delete-password" name="password" maxLength={1024} onChange={event => setDeletePassword(event.target.value)} required type="password" value={deletePassword} />
              <button className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white" type="submit"><Trash2 className="h-5 w-5" />{ui.account.deleteConfirm}</button>
            </fieldset>
          </form>
        )}
        {status}
      </section>
    );
  }

  return (
    <section id="konto" aria-busy={busy} className="glass mt-10 rounded-xl p-3 sm:rounded-[2rem] sm:p-8">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">{mode === "login" ? ui.account.loginTitle : ui.account.registerTitle}</p>
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <h2 className="text-3xl font-black">{mode === "login" ? ui.account.loginTitle : ui.account.registerTitle}</h2>
          <p className="mt-4 text-slate-700 dark:text-slate-300">{ui.account.description}</p>
          {mode === "register" && <p className="mt-4 text-slate-700 dark:text-slate-300">{ui.account.registrationRequiresConfirmation}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <button aria-pressed={mode === "login"} className={`rounded-2xl px-4 py-3 font-bold ${mode === "login" ? "bg-cyan-500 text-slate-950" : "bg-white/70 dark:bg-slate-900/70"}`} disabled={busy} onClick={() => changeMode("login")} type="button">{ui.common.login}</button>
            <button aria-pressed={mode === "register"} className={`rounded-2xl px-4 py-3 font-bold ${mode === "register" ? "bg-cyan-500 text-slate-950" : "bg-white/70 dark:bg-slate-900/70"}`} disabled={busy} onClick={() => changeMode("register")} type="button">{ui.common.register}</button>
          </div>
          <a className="mt-4 inline-flex min-h-11 items-center font-bold text-cyan-700 underline dark:text-cyan-300" href={PASSWORD_RESET_URL}>{ui.account.forgotPassword}</a>
          <p className="text-sm text-slate-700 dark:text-slate-300">{ui.account.resetDescription}</p>
          <a className="mt-4 inline-flex min-h-11 items-center font-bold text-cyan-700 underline dark:text-cyan-300" href={EMAIL_VERIFICATION_RESEND_URL}>{ui.account.resendEmail}</a>
        </div>
        <form aria-label={mode === "login" ? ui.account.loginTitle : ui.account.registerTitle} aria-describedby="account-status" className="rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70" onSubmit={submit}>
          <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300" htmlFor="username">{ui.account.username}</label>
            <input autoComplete="username" autoCapitalize="none" spellCheck={false} className={inputClass} id="username" name="username" maxLength={150} onChange={event => setUsername(event.target.value)} required value={username} />
            {mode === "register" && <>
              <label className="mt-4 block text-sm font-bold text-slate-600 dark:text-slate-300" htmlFor="email">{ui.account.email}</label>
              <input autoComplete="email" autoCapitalize="none" className={inputClass} id="email" name="email" maxLength={254} onChange={event => setEmail(event.target.value)} required type="email" value={email} />
            </>}
            <label className="mt-4 block text-sm font-bold text-slate-600 dark:text-slate-300" htmlFor="password">{ui.account.password}</label>
            <input autoComplete={mode === "register" ? "new-password" : "current-password"} aria-describedby={mode === "register" ? "account-password-help" : undefined} className={inputClass} id="password" name="password" minLength={mode === "register" ? 8 : undefined} maxLength={1024} onChange={event => { setPassword(event.target.value); setConfirmationError(false); }} required type="password" value={password} />
            {mode === "register" && <>
              <p id="account-password-help" className="mt-2 text-sm text-slate-700 dark:text-slate-300">{ui.account.passwordHelp}</p>
              <label className="mt-4 block text-sm font-bold text-slate-600 dark:text-slate-300" htmlFor="password-confirmation">{ui.account.repeatPassword}</label>
              <input autoComplete="new-password" aria-invalid={confirmationError || undefined} aria-describedby={confirmationError ? "account-status" : undefined} className={inputClass} id="password-confirmation" name="passwordConfirmation" ref={confirmationInput} minLength={8} maxLength={1024} onChange={event => { setConfirmation(event.target.value); setConfirmationError(false); }} required type="password" value={confirmation} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={secondaryClass} onClick={generatePassword} type="button"><KeyRound className="h-4 w-4" />{ui.account.generatePassword}</button>
                <button className={secondaryClass} disabled={!password} onClick={copyPassword} type="button"><Copy className="h-4 w-4" />{ui.account.copyPassword}</button>
              </div>
            </>}
            <button className={`mt-5 ${primaryClass}`} type="submit">
              {mode === "login" ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              {busy ? ui.account.working : mode === "login" ? ui.common.login : ui.account.createAccount}
            </button>
          </fieldset>
          {status}
        </form>
      </div>
    </section>
  );
}
