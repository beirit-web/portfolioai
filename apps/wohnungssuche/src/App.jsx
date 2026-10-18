import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownUp, Bell, Building2, CheckCircle2, Database, ExternalLink, Filter,
  Home, Info, LayoutDashboard, List, LogOut, MapPin, Menu, RefreshCw, Search,
  ShieldCheck, Star, User, X,
} from "lucide-react";
import "./styles.css";
import "./enhancements.css";
import "../../../server/assets/css/footer-links.css";
import { apiRequest, EMAIL_VERIFICATION_RESEND_URL, PASSWORD_RESET_URL, resultsOf } from "./api";
import { sampleListings, statusLabels } from "./demoData";
import { useRoute, navigateTo } from "./routes";
import { useCollection } from "./useCollection";
import ProfilesSection from "./ProfilesSection";
import { euro, quantity, scoreOf, hasScore, isIndividual, isDemo, safeUrl, searchableText } from "./listingUtils";

const navItems = [
  { id: "dashboard", path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "listings", path: "/apartments", label: "Angebote", icon: List },
  { id: "profiles", path: "/search-profiles", label: "Suchprofile", icon: Filter },
  { id: "sources", path: "/sources", label: "Quellen", icon: Database },
  { id: "notifications", path: "/notifications", label: "Benachrichtigungen", icon: Bell },
  { id: "information", path: "/information", label: "Information", icon: Info },
];
const emptyFilters = { query: "", city: "all", maxColdRent: "", maxBudget: "", socialOnly: false, hideDemo: false };

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
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("username") || "");
  const [reload, setReload] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState("score");
  const { listings, status } = useListings(token, reload);
  const sources = useCollection("sources/?ordering=name", token);

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else { localStorage.removeItem("token"); localStorage.removeItem("username"); }
  }, [token]);
  useEffect(() => {
    setMobileNavOpen(false);
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector(".workspace h1, .login-panel h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [route]);
  const cities = useMemo(() => ["all", ...new Set(listings.map(listing => listing.city).filter(Boolean))], [listings]);
  const visible = useMemo(() => listings
    .filter(listing => filters.city === "all" || listing.city === filters.city)
    .filter(listing => !filters.hideDemo || !isDemo(listing))
    .filter(listing => !Number(filters.maxColdRent) || listing.cold_rent != null && Number(listing.cold_rent) <= Number(filters.maxColdRent))
    .filter(listing => !Number(filters.maxBudget) || listing.warm_rent != null && Number(listing.warm_rent) <= Number(filters.maxBudget))
    .filter(listing => !filters.socialOnly || listing.social_housing)
    .filter(listing => !filters.query.trim() || searchableText(listing).includes(filters.query.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at);
      if (sort === "rent") return Number(a.warm_rent ?? Infinity) - Number(b.warm_rent ?? Infinity);
      if (sort === "area") return Number(b.living_area || 0) - Number(a.living_area || 0);
      if (sort === "rooms") return Number(b.rooms || 0) - Number(a.rooms || 0);
      if (sort === "social") return Number(Boolean(b.social_housing)) - Number(Boolean(a.social_housing));
      return (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1);
    }), [listings, filters, sort]);
  const actual = listings.filter(listing => !isDemo(listing) && isIndividual(listing) && listing.status !== "archived");
  const scores = actual.filter(hasScore).map(scoreOf);
  const stats = {
    best: scores.length ? Math.max(...scores) : null,
    new: actual.filter(listing => listing.status === "new").length,
    social: actual.filter(listing => listing.social_housing).length,
    contacted: actual.filter(listing => ["contacted", "viewing", "application_sent"].includes(listing.status)).length,
  };

  async function logout() {
    setLogoutError(""); setLoggingOut(true);
    try {
      await apiRequest("logout/", { token, method: "POST" });
    } catch (error) {
      if (error.status !== 401 && error.status !== 403) { setLogoutError(error.message); setLoggingOut(false); return; }
    }
    setToken(""); setCurrentUser(""); setDraft(emptyFilters); setFilters(emptyFilters);
    setLoggingOut(false); navigateTo("/login");
  }
  const go = path => { setMobileNavOpen(false); setLogoutError(""); navigateTo(path); };

  async function enterDemo() {
    if (token) {
      try { await apiRequest("logout/", { token, method: "POST" }); }
      catch (error) { if (error.status !== 401 && error.status !== 403) throw error; }
    }
    setToken(""); setCurrentUser("");
    setDraft(emptyFilters); setFilters(emptyFilters); go("/dashboard");
  }

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
          <p>{route === "dashboard" ? "Überblick über neue Angebote, passende Treffer, Sozialwohnungen und laufende Kontakte." : "Durchsuche und sortiere alle gefundenen Wohnungsangebote."}</p></div>
          <div className="header-actions">
            <button className="secondary" type="button" onClick={() => go("/sources")}><Database size={17} />Quellen verwalten</button>
            <button className="primary" type="button" onClick={() => go("/search-profiles")}><Filter size={17} />Suchprofil bearbeiten</button>
          </div>
        </header>
        <ApiStatusBanner status={status} onRetry={() => setReload(value => value + 1)} onLogin={() => go("/login")} />
        {route === "dashboard" && <section className="metrics">
          <Metric icon={<Star />} label="Bester Match aus Einzelangeboten" value={stats.best === null ? "Kein Score" : `${stats.best}/100`} />
          <Metric icon={<Building2 />} label="Neue Einzelangebote" value={stats.new} />
          <Metric icon={<ShieldCheck />} label="Sozialwohnungen" value={stats.social} />
          <Metric icon={<CheckCircle2 />} label="Kontaktierte Vermieter" value={stats.contacted} />
        </section>}
        {listings.some(isDemo) && <section className="status-banner demo" role="status"><div><strong>Demo-Daten aktiv</strong><p>Einige angezeigte Angebote dienen nur zur Vorschau und wurden nicht live geprüft.</p></div></section>}
        <SearchControls draft={draft} setDraft={setDraft} sort={sort} setSort={setSort} cities={cities}
          onSearch={() => setFilters({ ...draft })} onReset={() => { setDraft(emptyFilters); setFilters(emptyFilters); setSort("score"); }} count={visible.length} total={listings.length} />
        <section className="content-grid"><div className="listings">{visible.map(listing => <ListingCard key={listing.id} listing={listing} />)}
          {visible.length === 0 && status !== "loading" && <p>Keine passenden Angebote gefunden.</p>}
        </div><LocationRanking listings={visible} /></section>
      </>}
      {route === "profiles" && <ProfilesSection key={token || "guest"} token={token} />}
      {route === "sources" && <SourcesSection token={token} collection={sources} />}
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
  const active = useRef(false);
  const pending = useRef(false);
  const confirmationInput = useRef(null);
  const registering = mode === "register";
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
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
        const confirmationMessage = data.detail || "Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link in der E-Mail. Danach können Sie sich anmelden.";
        setSuccess(data.emailDelivery === "console"
          ? `${confirmationMessage} In dieser lokalen Demo finden Sie den Bestätigungslink in der Serverkonsole; eine E-Mail wird nicht zugestellt.`
          : confirmationMessage);
        setPassword(""); setConfirmation("");
      } else {
        if (!data?.token) throw new Error("Die Anmeldung hat keinen gültigen Zugang zurückgegeben.");
        onLogin(data.token, data.username || username);
      }
    } catch (failure) { if (active.current) setError(failure.message); }
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
  return <main className="login-page"><section className="login-panel">
    <div className="brand login-brand"><Home size={30} /><div><strong>Wohnungssuche Bodensee</strong><span>Privates Suchwerkzeug</span></div></div>
    <div><h1>{registering ? "Registrieren" : "Login"}</h1><p>{registering ? "Erstelle ein Konto und bestätige anschließend deine E-Mail-Adresse über den Bestätigungslink. Erst danach kannst du dich anmelden und Suchprofile speichern." : "Melde dich an, um Suchprofile und gespeicherte Daten zu verwalten."}</p></div>
    <form aria-label={registering ? "Registrierung" : "Anmeldung"} aria-busy={busy} className="login-form standalone" onSubmit={submit}>
      <label>Nutzername<input name="username" value={username} onChange={event => setUsername(event.target.value)} required maxLength={150} disabled={busy} autoCapitalize="none" spellCheck={false} autoComplete="username" /></label>
      {registering && <label>E-Mail-Adresse<input name="email" type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} disabled={busy} autoCapitalize="none" autoComplete="email" /></label>}
      <label>Passwort<input name="password" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={registering ? 8 : undefined} maxLength={1024} disabled={busy} autoComplete={registering ? "new-password" : "current-password"} /></label>
      {registering && <label>Passwort wiederholen<input name="password_confirm" type="password" ref={confirmationInput} value={confirmation} onChange={event => setConfirmation(event.target.value)} required minLength={8} maxLength={1024} disabled={busy} autoComplete="new-password" /></label>}
      {error && <p className="error" role="alert">{error}</p>}{success && <p className="success" role="status">{success}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? registering ? "Konto wird erstellt..." : "Anmeldung läuft..." : registering ? "Konto erstellen" : "Einloggen"}</button>
    </form>
    <button className="text-button" type="button" disabled={busy} onClick={() => navigateTo(registering ? "/login" : "/register")}>{registering ? "Ich habe bereits ein Konto" : "Noch kein Konto? Jetzt registrieren"}</button>
    <a className="text-button" href={PASSWORD_RESET_URL}>Passwort vergessen?</a>
    <a className="text-button" href={EMAIL_VERIFICATION_RESEND_URL}>Bestätigungs-E-Mail erneut senden</a>
    <button className="text-button" type="button" disabled={busy} onClick={showDemo}>Dashboard im Demo-Modus ansehen</button>
  </section></main>;
}

function ApiStatusBanner({ status, onRetry, onLogin }) {
  if (status === "live") return <div className="status-pill live" role="status">API verbunden</div>;
  if (status === "loading") return <div className="status-pill" role="status">API-Verbindung wird geprüft...</div>;
  if (status === "auth-required") return <section className="status-banner auth-required" role="status"><div><strong>Login erforderlich</strong><p>Ihre Anmeldung ist abgelaufen oder fehlt. Bitte melden Sie sich erneut an, um gespeicherte Daten zu sehen.</p></div><button className="secondary" type="button" onClick={onLogin}><User size={17} />Zum Login</button></section>;
  if (status === "error") return <section className="status-banner auth-required" role="alert"><div><strong>Daten konnten nicht geladen werden</strong><p>Die API ist nicht erreichbar. Bitte versuchen Sie es erneut.</p></div><button className="secondary" type="button" onClick={onRetry}>Verbindung erneut prüfen</button></section>;
  return <section className="status-banner demo" role="status"><div><strong>Demo-Modus aktiv</strong><p>Es werden fiktive Beispielangebote angezeigt. Melden Sie sich an, um eigene Suchprofile und Suchorte dauerhaft zu speichern.</p></div><button className="secondary" type="button" onClick={onRetry}><RefreshCw size={17} />Verbindung erneut prüfen</button></section>;
}

function SearchControls({ draft, setDraft, sort, setSort, cities, onSearch, onReset, count, total }) {
  const update = (name, value) => setDraft(current => ({ ...current, [name]: value }));
  return <form className="controls" onSubmit={event => { event.preventDefault(); onSearch(); }}>
    <label className="searchbox"><Search size={18} /><input aria-label="Titel, Ort oder Beschreibung suchen" placeholder="Titel, Ort oder Beschreibung suchen" value={draft.query} onChange={event => update("query", event.target.value)} /></label>
    <label><MapPin size={18} /><select aria-label="Ort" value={draft.city} onChange={event => update("city", event.target.value)}>{cities.map(city => <option key={city} value={city}>{city === "all" ? "Alle Orte" : city}</option>)}</select></label>
    <label><input type="number" min="0" step="50" inputMode="numeric" aria-label="Maximale Kaltmiete" placeholder="Kaltmiete bis" value={draft.maxColdRent} onChange={event => update("maxColdRent", event.target.value)} /></label>
    <label><input type="number" min="0" step="50" inputMode="numeric" aria-label="Maximale Warmmiete" placeholder="Warmmiete bis" value={draft.maxBudget} onChange={event => update("maxBudget", event.target.value)} /></label>
    <label><ArrowDownUp size={18} /><select aria-label="Sortierung" value={sort} onChange={event => setSort(event.target.value)}>
      <option value="score">Match-Score</option><option value="newest">Neueste zuerst</option><option value="rent">Niedrigste Warmmiete</option><option value="area">Größte Wohnfläche</option><option value="rooms">Zimmerzahl</option><option value="social">Sozialwohnung zuerst</option>
    </select></label>
    <button className={draft.socialOnly ? "toggle active" : "toggle"} type="button" aria-pressed={draft.socialOnly} onClick={() => update("socialOnly", !draft.socialOnly)}><Filter size={18} />Sozialwohnung</button>
    <button className={draft.hideDemo ? "toggle active" : "toggle"} type="button" aria-pressed={draft.hideDemo} onClick={() => update("hideDemo", !draft.hideDemo)}><Filter size={18} />Demo ausblenden</button>
    <button className="primary search-action" type="submit"><Search size={18} />Suchen</button>
    <button className="secondary search-reset" type="button" onClick={onReset}><RefreshCw size={18} />Zurücksetzen</button>
    <span className="result-count">{count} von {total} Treffern</span>
  </form>;
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

function LocationRanking({ listings }) {
  const groups = new Map();
  for (const listing of listings.filter(listing => isIndividual(listing) && !isDemo(listing))) {
    const city = listing.city || "Ort offen";
    const group = groups.get(city) || { city, count: 0, best: null };
    group.count += 1;
    if (hasScore(listing)) group.best = Math.max(group.best ?? -1, scoreOf(listing));
    groups.set(city, group);
  }
  return <aside className="map-panel"><div className="panel-header"><MapPin size={18} /><strong>Beste Treffer nach Ort</strong></div>
    <div className="timeline">{groups.size === 0 ? <p>Keine Einzelangebote für eine Ortsauswertung vorhanden.</p> : [...groups.values()].sort((a, b) => (b.best ?? -1) - (a.best ?? -1)).map(group =>
      <div key={group.city} className="timeline-row"><span>{group.city}</span><span>{group.count} Angebote</span><strong>{group.best === null ? "Kein Score" : `${group.best}/100`}</strong></div>)}</div>
  </aside>;
}

function SourcesSection({ token, collection }) {
  return <section className="content-grid"><div className="listings profile-list">
    <div className="section-heading"><h1>Quellen</h1></div>
    <section className="info-box"><ShieldCheck size={20} /><div><strong>Erlaubte Datenquellen</strong><p>Diese Anwendung verwendet ausschließlich IMAP-Suchaufträge, RSS-Feeds, offizielle APIs, manuelle Einträge und kommunale Quellen, bei denen ein automatisierter Zugriff erlaubt ist.</p></div></section>
    {!token ? <p>Bitte einloggen, um Quellen zu sehen.</p> : <>
      {collection.error && <p className="error" role="alert">{collection.error}</p>}
      {collection.loading ? <p role="status">Quellen werden geladen…</p> : !collection.error && collection.entries.length === 0 && <p>Keine Quellen gefunden.</p>}
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
