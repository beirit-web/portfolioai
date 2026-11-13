import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownUp, ArrowLeft, Bell, Building2, CheckCircle2, Database, ExternalLink, Filter,
  Home, Info, LayoutDashboard, List, LogOut, MapPin, Menu, RefreshCw, Search,
  ShieldCheck, Star, User, X,
} from "lucide-react";
import "./styles.css";
import "./enhancements.css";
import "../../../server/assets/css/footer-links.css";
import { apiRequest, EMAIL_VERIFICATION_RESEND_URL, PASSWORD_RESET_URL, localAccountUrl, resultsOf } from "./api";
import { sampleListings, statusLabels } from "./demoData";
import { useRoute, navigateTo } from "./routes";
import { useCollection } from "./useCollection";
import { useHousingSearch } from "./useHousingSearch";
import ProfilesSection from "./ProfilesSection";
import LiveHousingSearch from "./LiveHousingSearch";
import { euro, quantity, scoreOf, hasScore, isIndividual, isDemo, safeUrl, searchableText } from "./listingUtils";

const navItems = [
  { id: "dashboard", path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "listings", path: "/apartments", label: "Angebote", icon: List },
  { id: "profiles", path: "/search-profiles", label: "Suchprofile", icon: Filter },
  { id: "sources", path: "/sources", label: "Quellen", icon: Database },
  { id: "notifications", path: "/notifications", label: "Benachrichtigungen", icon: Bell },
  { id: "information", path: "/information", label: "Information", icon: Info },
];

function useListings(token, reload) {
  const [state, setState] = useState({ token, listings: token ? [] : sampleListings, status: token ? "loading" : "demo" });
  useEffect(() => {
    const controller = new AbortController();
    setState({ token, listings: token ? [] : sampleListings, status: token ? "loading" : "demo" });
    if (token) apiRequest("listings/?ordering=-published_at", { token, signal: controller.signal })
      .then(data => setState({ token, listings: resultsOf(data), status: "live" }))
      .catch(error => {
        if (error.name !== "AbortError") setState({ token, listings: [], status: error.status === 401 || error.status === 403 ? "auth-required" : "error" });
      });
    return () => controller.abort();
  }, [token, reload]);
  return state.token === token ? state : { listings: token ? [] : sampleListings, status: token ? "loading" : "demo" };
}

function App() {
  const route = useRoute();
  const previousRoute = useRef(route);
  const [accountHandoff, setAccountHandoff] = useState(new URLSearchParams(location.search).get("accountLogin") === "1");
  const [handoffError, setHandoffError] = useState("");
  const [token, setToken] = useState(() => new URLSearchParams(location.search).get("accountLogin") === "1" ? "" : localStorage.getItem("token") || "");
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("username") || "");
  const [reload, setReload] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const search = useHousingSearch();
  const { draft, setDraft, filters, sort, setSort } = search;
  const { listings, status } = useListings(token, reload);
  const sources = useCollection("sources/?ordering=name", token);

  useEffect(() => {
    if (!accountHandoff) return;
    const controller = new AbortController();
    apiRequest("account-session/", { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      setToken(data.token); setCurrentUser(data.username);
      localStorage.setItem("token", data.token); localStorage.setItem("username", data.username);
      const url = new URL(location.href);
      url.searchParams.delete("accountLogin");
      history.replaceState(null, "", url);
      setAccountHandoff(false);
      if (route === "login" || route === "register") navigateTo("/dashboard");
    }).catch(error => {
      if (error.name !== "AbortError") { setHandoffError(error.message); setAccountHandoff(false); }
    });
    return () => controller.abort();
  }, [accountHandoff]);

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else { localStorage.removeItem("token"); localStorage.removeItem("username"); }
  }, [token]);
  useEffect(() => {
    setMobileNavOpen(false);
    if (previousRoute.current === route) return;
    previousRoute.current = route;
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector(".workspace h1, .login-panel h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [route]);
  const offers = useMemo(() => listings.filter(isIndividual), [listings]);
  const sourceLinks = useMemo(() => listings.filter(listing => ["search_page", "collection_page"].includes(listing.listing_kind)), [listings]);
  const cities = useMemo(() => ["all", ...new Set([...offers.map(listing => listing.city).filter(Boolean), ...(filters.city !== "all" ? [filters.city] : [])])], [offers, filters.city]);
  const visible = useMemo(() => offers
    .filter(listing => filters.city === "all" || listing.city === filters.city)
    .filter(listing => !filters.hideDemo || !isDemo(listing))
    .filter(listing => filters.maxColdRent === "" || listing.cold_rent != null && Number(listing.cold_rent) <= Number(filters.maxColdRent))
    .filter(listing => filters.maxBudget === "" || listing.warm_rent != null && Number(listing.warm_rent) <= Number(filters.maxBudget))
    .filter(listing => !filters.socialOnly || listing.social_housing)
    .filter(listing => !filters.query.trim() || searchableText(listing).includes(filters.query.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at);
      if (sort === "rent") return Number(a.warm_rent ?? Infinity) - Number(b.warm_rent ?? Infinity);
      if (sort === "area") return Number(b.living_area || 0) - Number(a.living_area || 0);
      if (sort === "rooms") return Number(b.rooms || 0) - Number(a.rooms || 0);
      if (sort === "social") return Number(Boolean(b.social_housing)) - Number(Boolean(a.social_housing));
      return (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1);
    }), [offers, filters, sort]);
  const demoMode = status === "demo";
  const actual = offers.filter(listing => (demoMode || !isDemo(listing)) && listing.status !== "archived");
  const scores = actual.filter(hasScore).map(scoreOf);
  const stats = {
    best: scores.length ? Math.max(...scores) : null,
    new: actual.filter(listing => listing.status === "new").length,
    social: actual.filter(listing => listing.social_housing).length,
    contacted: actual.filter(listing => ["contacted", "viewing", "application_sent"].includes(listing.status)).length,
    count: actual.length,
    cities: new Set(actual.map(listing => listing.city).filter(Boolean)).size,
  };

  async function logout() {
    setLogoutError(""); setLoggingOut(true);
    try {
      await apiRequest("logout/", { token, method: "POST" });
    } catch (error) {
      if (error.status !== 401 && error.status !== 403) { setLogoutError(error.message); setLoggingOut(false); return; }
    }
    setToken(""); setCurrentUser(""); search.reset();
    setLoggingOut(false); navigateTo("/login");
  }
  const go = path => { setMobileNavOpen(false); setLogoutError(""); navigateTo(path); };

  async function enterDemo() {
    if (token) {
      try { await apiRequest("logout/", { token, method: "POST" }); }
      catch (error) { if (error.status !== 401 && error.status !== 403) throw error; }
    }
    setToken(""); setCurrentUser("");
    search.reset(); go("/dashboard");
  }

  if (accountHandoff) return <main className="login-page"><section className="login-panel" role="status">Anmeldung wird übernommen…</section></main>;
  if (handoffError) return <main className="login-page"><section className="login-panel"><p role="alert">{handoffError}</p><a href="/login/?next=/wohnungssuche/dashboard">Erneut anmelden</a></section></main>;
  if (route === "login" || route === "register") return <LoginPage key={route} mode={route} onDemo={enterDemo} onLogin={(nextToken, username) => {
    setToken(nextToken); setCurrentUser(username); localStorage.setItem("token", nextToken);
    localStorage.setItem("username", username); go("/dashboard");
  }} />;

  return <main className="app-shell">
    <button className="mobile-menu-button" type="button" aria-label={mobileNavOpen ? "Navigation-Menü schließen" : "Navigation-Menü öffnen"}
      aria-expanded={mobileNavOpen} aria-controls="housing-mobile-navigation" onClick={() => setMobileNavOpen(open => !open)}>
      {mobileNavOpen ? <X size={20} /> : <Menu size={20} />} Menü
    </button>
    <aside className={mobileNavOpen ? "sidebar open" : "sidebar"}>
      <div className="brand"><Home size={28} /><div><strong>Wohnungssuche Bodensee</strong><span>Privates Suchwerkzeug</span></div></div>
      <nav aria-label="Hauptnavigation">{navItems.map(item => {
        const Icon = item.icon;
        return <button key={item.id} className={route === item.id ? "active" : ""} type="button" onClick={() => go(item.path)}><Icon size={18} />{item.label}</button>;
      })}</nav>
      <div className="sidebar-footer site-footer" data-footer-tone="dark">{token ? <>
        <div className="user-chip"><User size={16} /><span>{currentUser || "Angemeldet"}</span></div>
        <button className="sidebar-action" type="button" onClick={logout} disabled={loggingOut}><LogOut size={16} />Abmelden</button>
        {logoutError && <p className="error" role="alert">{logoutError}</p>}
      </> : <>
        <button className="sidebar-action" type="button" onClick={() => go("/login")}><User size={16} />Login</button>
        <button className="sidebar-action" type="button" onClick={() => go("/register")}><User size={16} />Registrieren</button>
      </>}</div>
    </aside>
    <section className="workspace">
      {(route === "dashboard" || route === "listings") && <>
        <header className="page-header"><div><h1>{route === "dashboard" ? "Dashboard" : "Angebote"}</h1>
          <p>{route === "dashboard" ? (demoMode ? "Entdecke die Wohnungssuche mit fiktiven Beispielen und lege anschließend dein eigenes Suchprofil an." : "Deine Wohnungsangebote im Überblick. Gespeicherte Suchseiten findest du unter Quellen.") : "Durchsuche und sortiere einzelne Wohnungsangebote. Suchseiten findest du unter Quellen."}</p></div>
          <div className="header-actions">
            <button className="secondary" type="button" onClick={() => go(demoMode ? "/apartments" : "/sources")}>{demoMode ? <List size={17} /> : <Database size={17} />}{demoMode ? "Beispielangebote ansehen" : "Suchquellen ansehen"}</button>
            <button className="primary" type="button" onClick={() => go(token ? "/search-profiles" : "/register")}><Filter size={17} />{token ? "Suchprofile bearbeiten" : "Eigenes Suchprofil erstellen"}</button>
          </div>
        </header>
        <ApiStatusBanner status={status} onRetry={() => setReload(value => value + 1)} onLogin={() => go("/login")} />
        {route === "dashboard" && <section className="dashboard-summary" aria-label={demoMode ? "Demo-Überblick" : "Angebotsübersicht"}>
          <div className="summary-heading"><h2>{demoMode ? "So sieht deine Suche aus" : "Deine Angebotsübersicht"}</h2>{demoMode && <span className="demo-label">Nur fiktive Beispieldaten</span>}</div>
          <div className="metrics">{demoMode ? <>
            <Metric icon={<Building2 />} label="Beispielangebote" value={stats.count} />
            <Metric icon={<CheckCircle2 />} label="Als neu markierte Beispiele" value={stats.new} />
            <Metric icon={<ShieldCheck />} label="Beispiele für Sozialwohnungen" value={stats.social} />
            <Metric icon={<MapPin />} label="Orte in der Demo" value={stats.cities} />
          </> : <>
          <Metric icon={<Star />} label="Bester Match aus Einzelangeboten" value={stats.best === null ? "Kein Score" : `${stats.best}/100`} />
          <Metric icon={<Building2 />} label="Neue Einzelangebote" value={stats.new} />
          <Metric icon={<ShieldCheck />} label="Sozialwohnungen" value={stats.social} />
          <Metric icon={<CheckCircle2 />} label="Kontaktierte Vermieter" value={stats.contacted} />
          </>}</div>
        </section>}
        {sourceLinks.length > 0 && <section className="status-banner source-summary"><div><strong>{sourceLinks.length} gespeicherte Suchseiten</strong><p>Diese Links öffnen Angebotsübersichten. Sie werden separat unter Quellen angezeigt und zählen nicht als Wohnungsangebote.</p></div><button className="secondary" type="button" onClick={() => go("/sources")}><Database size={17} />Zu den Suchquellen</button></section>}
        {route === "dashboard" && <section className="info-box"><Search size={20} /><div><h2>Aktuelle Wohnungsangebote</h2><p>Suche gezielt nach Mietwohnungen und öffne die Originalangebote der jeweiligen Quelle.</p><button className="secondary" type="button" onClick={() => go("/apartments")}>Zur Live-Suche</button></div></section>}
        {route === "listings" && <LiveHousingSearch key={token || "guest"} token={token} filters={filters} onLogin={() => go("/login")} />}
        {route === "listings" && <h2>{demoMode ? "Beispielangebote filtern" : "Vorhandene Wohnungsangebote filtern"}</h2>}
        <SearchControls draft={draft} setDraft={setDraft} sort={sort} setSort={setSort} cities={cities}
          onSearch={() => search.apply()} onReset={search.reset} count={visible.length} total={offers.length} />
        <ActiveFilters filters={filters} onRemove={search.remove} />
        <section className="content-grid"><div className="listings">{visible.map(listing => <ListingCard key={listing.id} listing={listing} />)}
          {status === "loading" && <p role="status">Wohnungsangebote werden geladen…</p>}
          {visible.length === 0 && (status === "demo" || status === "live") && <section className="empty-offers"><h2>{offers.length ? "Keine passenden Angebote" : "Noch keine Wohnungsangebote"}</h2><p>{offers.length ? "Passe deine Filter an oder setze sie zurück, um mehr Angebote zu sehen." : "Hier erscheinen einzelne Wohnungen mit Mietpreis, Zimmerzahl und Fläche. Gespeicherte Suchseiten findest du unter Quellen."}</p>{offers.length > 0 && <button className="secondary" type="button" onClick={search.reset}>Alle Filter zurücksetzen</button>}</section>}
        </div><LocationRanking listings={visible} demoMode={demoMode} /></section>
      </>}
      {route === "profiles" && <ProfilesSection key={token || "guest"} token={token} />}
      {route === "sources" && <SourcesSection token={token} collection={sources} links={sourceLinks} status={status} onRetry={() => setReload(value => value + 1)} onLogin={() => go("/login")} />}
      {route === "notifications" && <section className="content-grid"><div className="listings profile-list"><h1>Benachrichtigungen</h1><p>Benachrichtigungen werden hier später angezeigt.</p></div></section>}
      {route === "information" && <InformationSection />}
    </section>
  </main>;
}

function LoginPage({ mode, onDemo, onLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [accountConfig, setAccountConfig] = useState(null);
  const active = useRef(false);
  const pending = useRef(false);
  const confirmationInput = useRef(null);
  const registering = mode === "register";
  const localAccounts = accountConfig?.localActivationAvailable === true;
  const passwordResetUrl = localAccountUrl(accountConfig?.passwordResetUrl) || `${PASSWORD_RESET_URL}${PASSWORD_RESET_URL.includes("?") ? "&" : "?"}next=%2Fwohnungssuche%2Flogin`;
  const verificationUrl = localAccountUrl(accountConfig?.verificationResendUrl) || `${EMAIL_VERIFICATION_RESEND_URL}?next=%2Fwohnungssuche%2Fdashboard`;
  const activationUrl = localAccountUrl(accountConfig?.activationUrl);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    apiRequest("auth/config/", { signal: controller.signal })
      .then(data => { if (active.current) setAccountConfig(data); })
      .catch(() => {}); // A missing hint must not block signing in.
    return () => { active.current = false; controller.abort(); };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    if (registering && password !== confirmation) {
      setError("Die Passwörter stimmen nicht überein.");
      confirmationInput.current?.focus();
      return;
    }
    pending.current = true;
    setError(""); setSuccess(""); setBusy(true);
    try {
      const data = await apiRequest(`${registering ? "register" : "token-auth"}/`, {
        method: "POST", body: registering
          ? { username: username.trim(), email: email.trim(), password, password_confirm: confirmation }
          : { username: username.trim(), password },
      });
      if (!active.current) return;
      if (registering) {
        if (data.emailDelivery === "local" && localAccountUrl(data.activationUrl)) {
          location.assign(localAccountUrl(data.activationUrl));
          return;
        }
        const confirmationMessage = data.detail || "Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link in der E-Mail. Danach können Sie sich anmelden.";
        setSuccess(data.emailDelivery === "console"
          ? `${confirmationMessage} In dieser lokalen Demo finden Sie den Bestätigungslink in der Serverkonsole; eine E-Mail wird nicht zugestellt.`
          : confirmationMessage);
        setPassword(""); setConfirmation("");
      } else {
        if (!data?.token) throw new Error("Die Anmeldung hat keinen gültigen Zugang zurückgegeben.");
        onLogin(data.token, data.username || username);
      }
    } catch (failure) {
      if (active.current && failure.emailDelivery === "local" && failure.activationUrl) {
        location.assign(failure.activationUrl);
        return;
      }
      if (active.current) setError(failure.message);
    }
    finally { if (active.current) { pending.current = false; setBusy(false); } }
  }
  async function showDemo() {
    if (pending.current) return;
    pending.current = true;
    setError(""); setBusy(true);
    try { await onDemo(); }
    catch (failure) { if (active.current) setError(failure.message); }
    finally { if (active.current) { pending.current = false; setBusy(false); } }
  }
  return <main className="login-page"><div className="login-layout">
    <aside className="login-intro" aria-label="Wohnungssuche Bodensee">
      <div className="brand login-brand"><span className="login-brand-icon"><Home size={26} aria-hidden="true" /></span><div><strong>Wohnungssuche Bodensee</strong><span>Dein persönlicher Suchbereich</span></div></div>
      <div className="login-intro-copy"><h2>Organisiere deine Wohnungssuche.</h2><p>Speichere deine Suchprofile und Wunschorte an einem Ort.</p></div>
      <ul className="login-benefits">
        <li><Filter size={20} aria-hidden="true" /><div><strong>Suchprofile speichern</strong><span>Budget, Zimmer und Ausstattung festhalten.</span></div></li>
        <li><MapPin size={20} aria-hidden="true" /><div><strong>Wunschorte verwalten</strong><span>Orte und Suchradien für deine Profile pflegen.</span></div></li>
      </ul>
      <p className="login-intro-note">Die Demo kannst du auch ohne Konto ausprobieren.</p>
    </aside>
    <section className="login-panel login-account-panel" aria-labelledby="housing-login-title">
    <a className="login-back-link housing-home-link" href="/projekte/wohnungssuche-bodensee" aria-label="Zur Startseite der Wohnungssuche Bodensee"><ArrowLeft size={16} aria-hidden="true" />Zur Startseite</a>
    <header className="login-heading"><h1 id="housing-login-title">{registering ? "Registrieren" : "Login"}</h1><p>{registering ? (localAccounts ? "Erstelle dein Konto und aktiviere es anschließend mit einem lokalen Code." : "Erstelle dein Konto. Danach zeigen wir dir, wie du es bestätigst und deine Suchprofile speicherst.") : "Melde dich an und verwalte deine Suchprofile und Wunschorte."}</p></header>
    {localAccounts && <section className="login-local-note" aria-label="Hinweis zur lokalen Demo"><strong>Lokale Demo – ohne E-Mail-Versand</strong><p>Diese Seite läuft lokal. Du erhältst deshalb keine E-Mail an dein Postfach.</p><p>{registering ? "Nach der Registrierung findest du deinen Aktivierungscode im lokalen Beispielpostfach /examplemail. Gib ihn auf der folgenden Anmeldeseite im selben Browser ein. Der Code ist eine Minute gültig." : "Neue Konten bestätigst du mit dem Code aus /examplemail. Bei „Passwort vergessen?“ bekommst du stattdessen einen lokalen Wiederherstellungs-Token. Beide Abläufe bleiben in diesem Browser."}</p>
      {activationUrl && <a className="login-help-link" href={activationUrl}>Offene Registrierung bestätigen</a>}
    </section>}
    {accountConfig?.emailDelivery === "console" && <p className="login-local-note">Lokale Demo: Es wird keine E-Mail an ein Postfach zugestellt. Bestätigungs- und Wiederherstellungslinks werden in der Serverkonsole ausgegeben.</p>}
    <form aria-label={registering ? "Registrierung" : "Anmeldung"} aria-busy={busy} className="login-form standalone" onSubmit={submit}>
      <label>Nutzername<input name="username" value={username} onChange={event => setUsername(event.target.value)} required maxLength={150} disabled={busy} autoCapitalize="none" spellCheck={false} autoComplete="username" /></label>
      {registering && <label>E-Mail-Adresse<input name="email" type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} disabled={busy} autoCapitalize="none" autoComplete="email" /></label>}
      <div className="login-password-field"><div className="login-password-heading"><label htmlFor="housing-password">Passwort</label><a className="login-help-link" href={passwordResetUrl}>Passwort vergessen?</a></div><input id="housing-password" name="password" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={registering ? 8 : undefined} maxLength={1024} disabled={busy} autoComplete={registering ? "new-password" : "current-password"} /></div>
      {registering && <label>Passwort wiederholen<input name="password_confirm" type="password" ref={confirmationInput} value={confirmation} onChange={event => setConfirmation(event.target.value)} required minLength={8} maxLength={1024} disabled={busy} autoComplete="new-password" /></label>}
      {error && <p className="error" role="alert">{error}</p>}{success && <p className="success" role="status">{success}</p>}
      <button type="submit" className="primary login-submit" disabled={busy}>{busy ? registering ? "Konto wird erstellt..." : "Anmeldung läuft..." : registering ? "Konto erstellen" : "Einloggen"}</button>
    </form>
    <div className="login-account-actions">
      <button className="text-button login-switch" type="button" disabled={busy} onClick={() => navigateTo(registering ? "/login" : "/register")}>{registering ? "Ich habe bereits ein Konto" : <>Noch kein Konto? <strong>Jetzt registrieren</strong></>}</button>
      <a className="login-help-link" href={verificationUrl}>{localAccounts ? "Neuen Aktivierungscode anfordern" : "Bestätigungs-E-Mail erneut senden"}</a>
    </div>
    <div className="login-demo"><p>Erst einmal ausprobieren?</p><button className="secondary" type="button" disabled={busy} onClick={showDemo}><LayoutDashboard size={17} aria-hidden="true" />Dashboard im Demo-Modus ansehen</button></div>
  </section></div></main>;
}

function ApiStatusBanner({ status, onRetry, onLogin }) {
  if (status === "live") return <div className="status-pill live" role="status">API verbunden</div>;
  if (status === "loading") return <div className="status-pill" role="status">API-Verbindung wird geprüft...</div>;
  if (status === "auth-required") return <section className="status-banner auth-required" role="status"><div><strong>Login erforderlich</strong><p>Ihre Anmeldung ist abgelaufen oder fehlt. Bitte melden Sie sich erneut an, um gespeicherte Daten zu sehen.</p></div><button className="secondary" type="button" onClick={onLogin}><User size={17} />Zum Login</button></section>;
  if (status === "error") return <section className="status-banner auth-required" role="alert"><div><strong>Daten konnten nicht geladen werden</strong><p>Die API ist nicht erreichbar. Bitte versuchen Sie es erneut.</p></div><button className="secondary" type="button" onClick={onRetry}>Verbindung erneut prüfen</button></section>;
  return <section className="status-banner demo" role="status"><div><strong>Demo-Modus aktiv</strong><p>Alle angezeigten Wohnungen sind fiktive Beispiele. Mit einem Konto kannst du eigene Suchprofile und Suchorte dauerhaft speichern.</p></div><button className="secondary" type="button" onClick={onLogin}><User size={17} />Anmelden</button></section>;
}

function SearchControls({ draft, setDraft, sort, setSort, cities, onSearch, onReset, count, total }) {
  const update = (name, value) => setDraft(current => ({ ...current, [name]: value }));
  return <form className="controls" onSubmit={event => { event.preventDefault(); onSearch(); }}>
    <label className="searchbox"><Search size={18} /><input aria-label="Titel, Ort oder Beschreibung suchen" placeholder="Titel, Ort oder Beschreibung suchen" maxLength={200} value={draft.query} onChange={event => update("query", event.target.value)} /></label>
    <label><MapPin size={18} /><select aria-label="Ort" value={draft.city} onChange={event => update("city", event.target.value)}>{cities.map(city => <option key={city} value={city}>{city === "all" ? "Alle Orte" : city}</option>)}</select></label>
    <label><input type="number" min="0" step="any" inputMode="decimal" aria-label="Maximale Kaltmiete" placeholder="Kaltmiete bis" value={draft.maxColdRent} onChange={event => update("maxColdRent", event.target.value)} /></label>
    <label><input type="number" min="0" step="any" inputMode="decimal" aria-label="Maximale Warmmiete" placeholder="Warmmiete bis" value={draft.maxBudget} onChange={event => update("maxBudget", event.target.value)} /></label>
    <label><ArrowDownUp size={18} /><select aria-label="Sortierung" value={sort} onChange={event => setSort(event.target.value)}>
      <option value="score">Match-Score</option><option value="newest">Neueste zuerst</option><option value="rent">Niedrigste Warmmiete</option><option value="area">Größte Wohnfläche</option><option value="rooms">Zimmerzahl</option><option value="social">Sozialwohnung zuerst</option>
    </select></label>
    <button className={draft.socialOnly ? "toggle active" : "toggle"} type="button" aria-pressed={draft.socialOnly} onClick={() => update("socialOnly", !draft.socialOnly)}><Filter size={18} />Sozialwohnung</button>
    <button className={draft.hideDemo ? "toggle active" : "toggle"} type="button" aria-pressed={draft.hideDemo} onClick={() => update("hideDemo", !draft.hideDemo)}><Filter size={18} />Demo ausblenden</button>
    <button className="primary search-action" type="submit"><Search size={18} />Suchen</button>
    <button className="secondary search-reset" type="button" onClick={onReset}><RefreshCw size={18} />Zurücksetzen</button>
    <span className="result-count" role="status" aria-live="polite" aria-atomic="true">{count} von {total} Wohnungsangeboten</span>
  </form>;
}

function ActiveFilters({ filters, onRemove }) {
  const chips = [
    filters.query && ["query", `Suche: ${filters.query}`],
    filters.city !== "all" && ["city", `Ort: ${filters.city}`],
    filters.maxColdRent !== "" && ["maxColdRent", `Kaltmiete bis ${euro(filters.maxColdRent)}`],
    filters.maxBudget !== "" && ["maxBudget", `Warmmiete bis ${euro(filters.maxBudget)}`],
    filters.socialOnly && ["socialOnly", "Nur Sozialwohnungen"],
    filters.hideDemo && ["hideDemo", "Demo ausgeblendet"],
  ].filter(Boolean);
  if (!chips.length) return null;
  return <section className="active-filters" aria-label="Aktive Filter"><strong>Aktive Filter</strong><div>{chips.map(([key, label]) =>
    <button className="filter-chip" key={key} type="button" aria-label={`${label} entfernen`} onClick={() => onRemove(key)}>{label}<X size={16} aria-hidden="true" /></button>
  )}</div></section>;
}

function Metric({ icon, label, value }) {
  return <article className="metric">{React.cloneElement(icon, { size: 20 })}<span>{label}</span><strong>{value}</strong></article>;
}

function ListingCard({ listing }) {
  const individual = isIndividual(listing);
  const source = ["search_page", "collection_page"].includes(listing.listing_kind);
  const score = scoreOf(listing);
  const url = safeUrl(listing.original_url);
  const method = { imap: "Aus Suchauftrags-E-Mail importiert", rss: "Aus RSS-Feed importiert", manual: "Manuell gespeicherter Link", demo: "Demo-Angebot" }[listing.import_method] || "Quelle ungeprüft";
  return <article className={individual ? "listing-card" : "listing-card source-card"}>
    <div className={hasScore(listing) ? "score" : "score muted-score"} style={{ "--score": `${score}%` }}><strong>{hasScore(listing) ? score : "-"}</strong><span>Score</span></div>
    <div className="listing-main">
      <div className="listing-title"><h2>{source ? "Gespeicherte Suchquelle" : listing.title}</h2><span>{statusLabels[listing.status] || listing.status}</span></div>
      {source && <p className="source-note">Diese Verlinkung führt zu einer Angebotsübersicht und nicht zu einem einzelnen Wohnungsangebot.</p>}
      {!individual && !source && <p className="source-note">Dieser Datensatz ist nicht als geprüftes Einzelangebot klassifiziert.</p>}
      <div className="facts"><span><MapPin size={15} />{listing.city || "Ort offen"}</span>{individual && <>
        <span>{quantity(listing.rooms, "Zi.", "Zimmer nicht angegeben")}</span><span>{quantity(listing.living_area, "m²", "Wohnfläche nicht angegeben")}</span>
        <span>{euro(listing.cold_rent) ? `${euro(listing.cold_rent)} Kaltmiete` : "Kaltmiete nicht angegeben"}</span>
        <span>{euro(listing.warm_rent) ? `${euro(listing.warm_rent)} Warmmiete` : "Warmmiete nicht angegeben"}</span>
      </>}<span>{listing.source_name || "Quelle ungeprüft"}</span></div>
      <div className="badges">{isDemo(listing) && <span>Demo-Angebot</span>}{!listing.is_verified && <span>Nicht live geprüft</span>}<span>{method}</span>
        {listing.social_housing && <span>Sozialwohnung</span>}{listing.wbs_required && <span>WBS</span>}{listing.private_landlord && <span>Privat</span>}{listing.balcony && <span>Balkon</span>}{listing.fitted_kitchen && <span>EBK</span>}{listing.elevator && <span>Aufzug</span>}
      </div>
      <p className="score-context">{hasScore(listing) ? `Berechnet mit Suchprofil „${listing.scores[0].search_profile_name}“.` : "Kein belastbarer Match-Score vorhanden."}</p>
      <ul className="reasons">{(listing.scores?.[0]?.reasons || []).slice(0, 3).map(reason => <li key={reason}>{reason}</li>)}</ul>
    </div>
    {url ? <a className="icon-button" href={url} target="_blank" rel="noopener noreferrer" aria-label="Externe Webseite öffnen" title="Sie verlassen die Anwendung und öffnen eine externe Webseite."><ExternalLink size={20} /></a>
      : <span className="icon-button disabled-link" aria-label="Kein sicherer Original-Link vorhanden"><ExternalLink size={20} /></span>}
  </article>;
}

function LocationRanking({ listings, demoMode }) {
  const groups = new Map();
  for (const listing of listings.filter(listing => isIndividual(listing) && (demoMode || !isDemo(listing)))) {
    const city = listing.city || "Ort offen";
    const group = groups.get(city) || { city, count: 0, best: null };
    group.count += 1;
    if (hasScore(listing)) group.best = Math.max(group.best ?? -1, scoreOf(listing));
    groups.set(city, group);
  }
  return <aside className="map-panel"><div className="panel-header"><MapPin size={18} /><strong>{demoMode ? "Beispielangebote nach Ort" : "Beste Treffer nach Ort"}</strong></div>
    <div className="timeline">{groups.size === 0 ? <p>Keine Einzelangebote für eine Ortsauswertung vorhanden.</p> : [...groups.values()].sort((a, b) => (b.best ?? -1) - (a.best ?? -1)).map(group =>
      <div key={group.city} className="timeline-row"><span>{group.city}</span><span>{group.count} {demoMode ? "Beispiel" : "Angebote"}</span>{!demoMode && <strong>{group.best === null ? "Kein Score" : `${group.best}/100`}</strong>}</div>)}</div>
  </aside>;
}

function SourcesSection({ token, collection, links, status, onRetry, onLogin }) {
  return <section className="content-grid"><div className="listings profile-list">
    <div className="section-heading"><h1>Quellen</h1></div>
    <section className="info-box"><Database size={20} /><div><strong>Suchseiten und Datenquellen</strong><p>Gespeicherte Suchseiten öffnen externe Angebotsübersichten. Sie sind keine einzelnen Wohnungsangebote und werden nicht nach Mietpreis oder Zimmerzahl gefiltert. Automatische Importe sind in dieser Portfolio-Demo nicht aktiviert.</p></div></section>
    {!token ? <section className="empty-offers"><h2>Deine Suchquellen an einem Ort</h2><p>Nach der Anmeldung findest du hier die hinterlegten Suchseiten. Die Beispielwohnungen kannst du ohne Konto ansehen.</p><button className="secondary" type="button" onClick={onLogin}>Anmelden</button></section> : <>
      <ApiStatusBanner status={status} onRetry={onRetry} onLogin={onLogin} />
      <section className="saved-searches" aria-labelledby="saved-searches-heading"><h2 id="saved-searches-heading">Gespeicherte Suchseiten</h2>
        {status === "live" && links.length === 0 && <p>Keine Suchseiten hinterlegt.</p>}
        {links.map(link => {
          const url = safeUrl(link.original_url || link.source_url);
          return <article className="search-source-card" key={link.id}><div><h3>{link.title}</h3><p><MapPin size={15} />{link.city || "Ort offen"} · {link.source_name || "Manuelle Quelle"}</p><p>Manuell hinterlegter Link · Verfügbarkeit nicht geprüft</p></div>
            {url && <a className="secondary" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${link.title} öffnen (neuer Tab)`}>Suchseite öffnen<ExternalLink size={16} /></a>}
          </article>;
        })}
      </section>
      <h2>Weitere Datenquellen</h2>
      {collection.error && <p className="error" role="alert">{collection.error}</p>}
      {collection.loading ? <p role="status">Quellen werden geladen…</p> : !collection.error && collection.entries.length === 0 && <p>Keine weiteren Datenquellen eingerichtet.</p>}
      {collection.entries.map(source => <article key={source.id} className="listing-card profile-card"><h2>{source.name}</h2><p>Typ: {source.source_type}</p><p>Status: {source.is_active ? "Aktiv" : "Inaktiv"}</p>{source.url && <p>URL: {source.url}</p>}</article>)}
    </>}
  </div></section>;
}

function InformationSection() {
  return <section className="content-grid"><div className="listings profile-list">
    <div className="section-heading"><h1>Über diese Anwendung</h1></div>
    <section className="info-box"><Info size={20} /><div><strong>Privates Suchwerkzeug</strong><p>Diese Anwendung unterstützt die private Organisation einer Wohnungssuche.</p></div></section>
    <article className="listing-card profile-card"><div>
      <p>Sie nutzt ausschließlich manuelle Einträge, eigene Suchauftrags-E-Mails, RSS-Feeds, offizielle APIs und ausdrücklich erlaubte öffentliche Quellen.</p>
      <p>Die Anwendung prüft nicht automatisch, ob ein Angebot noch verfügbar ist. Preis-, Flächen- und Kontaktdaten können unvollständig oder veraltet sein.</p>
      <p>Vor einer Kontaktaufnahme müssen alle Angaben auf der Originalseite geprüft werden.</p>
      <p>Die Anwendung versendet keine automatischen Wohnungsbewerbungen.</p>
    </div></article>
  </div></section>;
}

createRoot(document.getElementById("root")).render(<App />);
