import { useState } from "react";
import type { FormEvent } from "react";
import { Copy, KeyRound, LogIn, LogOut, Trash2, UserPlus } from "lucide-react";
import {
  changePassword,
  confirmPasswordReset,
  deleteAccount,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resendEmailConfirmation,
  type CurrentUser
} from "../api";
import { ui } from "../i18n";

type AuthPanelProps = {
  user: CurrentUser | null;
  onUserChange: (user: CurrentUser | null) => void;
  onDashboardRefresh: () => void;
};

export default function AuthPanel({ user, onUserChange, onDashboardRefresh }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      if (mode === "login") {
        const response = await loginUser({ username, password });
        onUserChange(response.user);
        onDashboardRefresh();
        setMessage(ui.account.loginSuccess);
      } else {
        const response = await registerUser({ username, email, password });
        onUserChange(null);
        setEmail("");
        setMessage(response.emailVerificationToken ? `${response.message} ${ui.account.emailTokenPrepared} ${response.emailVerificationToken}` : response.message);
      }
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.account.authFailed);
    }
  }

  async function signOut() {
    await logoutUser();
    onUserChange(null);
  }

  async function submitReset(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await requestPasswordReset(resetIdentifier);
      if (response.resetToken) setResetToken(response.resetToken);
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.account.authFailed);
    }
  }


  async function submitResetConfirm() {
    setMessage("");
    try {
      const response = await confirmPasswordReset(resetToken, resetNewPassword);
      setResetToken("");
      setResetNewPassword("");
      setMode("login");
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.account.authFailed);
    }
  }

  async function submitPasswordChange(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      onUserChange(null);
      setMessage(response.message || ui.account.passwordChanged);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.account.authFailed);
    }
  }

  async function prepareEmailConfirmation() {
    setMessage("");
    try {
      const response = await resendEmailConfirmation();
      setMessage(response.emailVerificationToken ? `${ui.account.emailTokenPrepared} ${response.emailVerificationToken}` : response.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.account.authFailed);
    }
  }

  function generatePassword() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_";
    const values = new Uint32Array(18);
    window.crypto.getRandomValues(values);
    const generated = Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
    setPassword(generated);
    setMessage(ui.account.passwordGenerated);
  }

  async function copyPassword() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setMessage(ui.account.passwordGenerated);
  }

  async function removeAccount(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      await deleteAccount(deletePassword);
      setDeletePassword("");
      onUserChange(null);
      onDashboardRefresh();
      setMessage(ui.account.deleteSuccess);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.account.authFailed);
    }
  }

  if (user) {
    return (
      <section className="glass mt-10 rounded-xl p-3 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">
              {ui.account.active}
            </p>
            <h2 className="text-3xl font-black">{ui.account.hello}, {user.username}</h2>
            <p className="mt-2 text-slate-700 dark:text-slate-300">
              {ui.account.savedHistory}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950" onClick={signOut} type="button">
              <LogOut className="h-5 w-5" />
              {ui.common.logout}
            </button>
            {!user.settings.emailVerified && (
              <button className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/70 px-5 py-3 font-bold text-cyan-700 dark:border-cyan-500/40 dark:text-cyan-300" onClick={prepareEmailConfirmation} type="button">
                <KeyRound className="h-5 w-5" />
                {ui.account.resendEmail}
              </button>
            )}
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-300/70 px-5 py-3 font-bold dark:border-slate-700" onClick={() => setShowPasswordChange((value) => !value)} type="button">
              <KeyRound className="h-5 w-5" />
              {ui.account.changePassword}
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-red-300/70 px-5 py-3 font-bold text-red-700 dark:border-red-500/40 dark:text-red-300" onClick={() => setShowDelete((value) => !value)} type="button">
              <Trash2 className="h-5 w-5" />
              {ui.account.deleteAccount}
            </button>
          </div>
        </div>
        {!user.settings.emailVerified && <p className="mt-4 rounded-xl bg-cyan-500/10 p-3 font-semibold text-cyan-800 dark:text-cyan-200">{ui.account.emailNotVerified}</p>}
        {showPasswordChange && (
          <form className="mt-6 rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70" onSubmit={submitPasswordChange}>
            <h3 className="text-xl font-black">{ui.account.changePassword}</h3>
            <label className="mt-4 block text-sm font-bold" htmlFor="current-password">{ui.account.currentPassword}</label>
            <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-950 outline-none focus:border-cyan-400" id="current-password" onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} />
            <label className="mt-4 block text-sm font-bold" htmlFor="new-password">{ui.account.newPassword}</label>
            <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-950 outline-none focus:border-cyan-400" id="new-password" minLength={8} onChange={(event) => setNewPassword(event.target.value)} required type="password" value={newPassword} />
            <button className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" type="submit">
              <KeyRound className="h-5 w-5" />
              {ui.account.changePassword}
            </button>
          </form>
        )}
        {showDelete && (
          <form className="mt-6 rounded-xl bg-red-500/10 p-3 sm:rounded-[1.5rem] sm:p-5" onSubmit={removeAccount}>
            <h3 className="text-xl font-black text-red-800 dark:text-red-200">{ui.account.deleteAccount}</h3>
            <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-200">{ui.account.deleteWarning}</p>
            <label className="mt-4 block text-sm font-bold" htmlFor="delete-password">{ui.account.confirmPassword}</label>
            <input className="mt-2 w-full rounded-2xl border border-red-200 bg-white/90 px-4 py-3 text-slate-950 outline-none focus:border-red-400" id="delete-password" onChange={(event) => setDeletePassword(event.target.value)} required type="password" value={deletePassword} />
            <button className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white" type="submit">
              <Trash2 className="h-5 w-5" />
              {ui.account.deleteConfirm}
            </button>
          </form>
        )}
        {message && <p className="mt-4 font-semibold text-slate-700 dark:text-slate-300">{message}</p>}
      </section>
    );
  }

  return (
    <section id="konto" className="glass mt-10 rounded-xl p-3 sm:rounded-[2rem] sm:p-8">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">
        {mode === "login" ? ui.account.loginTitle : mode === "reset" ? ui.account.resetTitle : ui.account.registerTitle}
      </p>
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <h2 className="text-3xl font-black">
            {mode === "login" ? ui.account.loginTitle : mode === "reset" ? ui.account.resetTitle : ui.account.title}
          </h2>
          <p className="mt-4 text-slate-700 dark:text-slate-300">
            {mode === "reset" ? ui.account.resetDescription : ui.account.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className={`rounded-2xl px-4 py-3 font-bold ${mode === "login" ? "bg-cyan-500 text-slate-950" : "bg-white/70 dark:bg-slate-900/70"}`} onClick={() => setMode("login")} type="button">
              {ui.common.login}
            </button>
            <button className={`rounded-2xl px-4 py-3 font-bold ${mode === "register" ? "bg-cyan-500 text-slate-950" : "bg-white/70 dark:bg-slate-900/70"}`} onClick={() => setMode("register")} type="button">
              {ui.common.register}
            </button>
            <button className={`rounded-2xl px-4 py-3 font-bold ${mode === "reset" ? "bg-cyan-500 text-slate-950" : "bg-white/70 dark:bg-slate-900/70"}`} onClick={() => setMode("reset")} type="button">
              {ui.account.forgotPassword}
            </button>
          </div>
        </div>

        {mode === "reset" ? (
          <form className="rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70" onSubmit={submitReset}>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300" htmlFor="reset-identifier">
              {ui.account.resetIdentifier}
            </label>
            <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950 outline-none focus:border-cyan-400" id="reset-identifier" onChange={(event) => setResetIdentifier(event.target.value)} required value={resetIdentifier} />
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400" type="submit">
                {ui.account.resetSend}
              </button>
              <button className="rounded-2xl border border-slate-300/70 px-5 py-3 font-bold dark:border-slate-700" onClick={() => setMode("login")} type="button">
                {ui.account.backToLogin}
              </button>
            </div>
            {resetToken && (
              <div className="mt-5 rounded-xl bg-cyan-500/10 p-3">
                <p className="text-sm font-bold text-cyan-800 dark:text-cyan-200">{ui.account.resetTokenLabel}</p>
                <input className="mt-2 w-full rounded-2xl border border-cyan-200 bg-white/85 px-4 py-3 text-slate-950" onChange={(event) => setResetToken(event.target.value)} value={resetToken} />
                <label className="mt-4 block text-sm font-bold" htmlFor="reset-new-password">{ui.account.newPassword}</label>
                <input className="mt-2 w-full rounded-2xl border border-cyan-200 bg-white/85 px-4 py-3 text-slate-950" id="reset-new-password" minLength={8} onChange={(event) => setResetNewPassword(event.target.value)} required type="password" value={resetNewPassword} />
                <button className="mt-4 rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" onClick={submitResetConfirm} type="button">{ui.account.changePassword}</button>
              </div>
            )}
            {message && <p className="mt-4 font-semibold text-slate-700 dark:text-slate-300">{message}</p>}
          </form>
        ) : (
        <form className="rounded-xl bg-white/70 p-3 sm:rounded-[1.5rem] sm:p-5 dark:bg-slate-900/70" onSubmit={submit}>
          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300" htmlFor="username">
            {ui.account.username}
          </label>
          <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950 outline-none focus:border-cyan-400" id="username" onChange={(event) => setUsername(event.target.value)} required value={username} />

          {mode === "register" && (
            <>
              <label className="mt-4 block text-sm font-bold text-slate-600 dark:text-slate-300" htmlFor="email">
                {ui.account.email}
              </label>
              <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950 outline-none focus:border-cyan-400" id="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
            </>
          )}

          <label className="mt-4 block text-sm font-bold text-slate-600 dark:text-slate-300" htmlFor="password">
            {ui.account.password}
          </label>
          <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-950 outline-none focus:border-cyan-400" id="password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          {mode === "register" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-300/70 px-4 py-2 text-sm font-bold dark:border-slate-700" onClick={generatePassword} type="button">
                <KeyRound className="h-4 w-4" />
                {ui.account.generatePassword}
              </button>
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-300/70 px-4 py-2 text-sm font-bold dark:border-slate-700" disabled={!password} onClick={copyPassword} type="button">
                <Copy className="h-4 w-4" />
                {ui.account.copyPassword}
              </button>
            </div>
          )}

          <button className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400" type="submit">
            {mode === "login" ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {mode === "login" ? ui.common.login : ui.account.createAccount}
          </button>
          {mode === "login" && (
            <button className="ml-0 mt-3 block text-left text-sm font-bold text-cyan-700 dark:text-cyan-300 sm:ml-2 sm:inline-block" onClick={() => setMode("reset")} type="button">
              {ui.account.forgotPassword}
            </button>
          )}
          {message && <p className="mt-4 font-semibold text-slate-700 dark:text-slate-300">{message}</p>}
        </form>
        )}
      </div>
    </section>
  );
}
