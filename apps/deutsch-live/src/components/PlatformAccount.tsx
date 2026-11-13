import { useState } from "react";
import { logoutUser, type CurrentUser } from "../api";
import { ui } from "../i18n";

type Props = {
  user: CurrentUser | null;
  onUserChange: (user: CurrentUser | null) => void;
  onDashboardRefresh: () => void;
};

export default function PlatformAccount({ user, onUserChange, onDashboardRefresh }: Props) {
  const [error, setError] = useState("");
  const next = encodeURIComponent("/deutschlive/dashboard");
  async function signOut() {
    try {
      await logoutUser();
      onUserChange(null);
      onDashboardRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ui.account.authFailed);
    }
  }
  return (
    <section className="glass rounded-3xl p-6 sm:p-8">
      <h2 className="text-2xl font-bold">{ui.platformAccount.title}</h2>
      <p className="mt-4 leading-relaxed">{ui.platformAccount.description}</p>
      {user && <p className="mt-4 break-words">{user.username}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        {user ? <>
          <a className="inline-flex min-h-11 items-center rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" href="/profil/">{ui.platformAccount.profile}</a>
          <button className="inline-flex min-h-11 items-center rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" type="button" onClick={signOut}>{ui.common.logout}</button>
        </> : <>
          <a className="inline-flex min-h-11 items-center rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" href={`/login/?next=${next}`}>{ui.common.login}</a>
          <a className="inline-flex min-h-11 items-center rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" href="/register/">{ui.platformAccount.register}</a>
        </>}
        <a className="inline-flex min-h-11 items-center rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" href="/vokabelbox/">Vokabelbox</a>
        <a className="inline-flex min-h-11 items-center rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950" href="/">{ui.platformAccount.back}</a>
      </div>
      {error && <p role="alert" className="mt-4">{error}</p>}
    </section>
  );
}
