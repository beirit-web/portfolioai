import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { apiRequest } from "./api";
import { quantity, safeUrl } from "./listingUtils";

const currency = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const price = value => value == null ? null : currency.format(value);

export default function LiveHousingSearch({ token, filters, onLogin }) {
  const [criteria, setCriteria] = useState(() => ({
    city: filters.city === "all" ? "Konstanz" : filters.city,
    max_cold_rent: filters.maxColdRent, max_warm_rent: filters.maxBudget, min_rooms: "",
  }));
  const [config, setConfig] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const active = useRef(true);
  const pending = useRef(false);
  const request = useRef(null);

  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    if (token) apiRequest("live-search/status/", { token, signal: controller.signal })
      .then(data => { if (active.current) setConfig(data); })
      .catch(failure => { if (failure.name !== "AbortError" && active.current) setError(failure.message); });
    return () => { active.current = false; controller.abort(); request.current?.abort(); };
  }, [token]);

  useEffect(() => {
    if (!result) return;
    const seconds = Math.max(1, Math.min(900, Number(result.expires_in) || 900));
    const timer = setTimeout(() => { setResult(null); setExpired(true); }, seconds * 1000);
    return () => clearTimeout(timer);
  }, [result]);

  function update(name, value) {
    setCriteria(current => ({ ...current, [name]: value }));
    setResult(null); setExpired(false); setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (pending.current || !config?.enabled || config.remaining <= 0) return;
    pending.current = true;
    request.current = new AbortController();
    setBusy(true); setError(""); setResult(null); setExpired(false);
    try {
      const data = await apiRequest("live-search/", { token, method: "POST", body: criteria, signal: request.current.signal });
      if (active.current) {
        setResult(data);
        setConfig(current => ({ ...current, remaining: data.remaining }));
      }
    } catch (failure) {
      if (active.current && failure.name !== "AbortError") {
        setError(failure.message);
        if (Number.isInteger(failure.remaining)) setConfig(current => ({ ...current, remaining: failure.remaining }));
      }
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  }

  return <section className="live-search-panel" aria-labelledby="live-search-heading">
    <div><h2 id="live-search-heading">Aktuelle Wohnungen suchen</h2><p>Suche auf Anfrage nach Mietwohnungen. Die Ergebnisse kommen über Somantic und verlinken auf das jeweilige Originalangebot.</p></div>
    {!token ? <div className="live-search-intro"><p>Melde dich an, um nach aktuellen Angeboten zu suchen. Beispielangebote kannst du weiterhin ohne Konto ansehen.</p><button className="secondary" type="button" onClick={onLogin}>Für die Live-Suche anmelden</button></div> : <>
      {!config && !error && <p role="status">Live-Suche wird vorbereitet…</p>}
      {config?.enabled === false && <p role="status">Die Live-Suche ist noch nicht eingerichtet. Die Beispielangebote und deine Suchprofile bleiben verfügbar.</p>}
      {config?.enabled && <>
        <form className="live-search-form" onSubmit={submit} aria-label="Aktuelle Mietwohnungen suchen">
          <label>Ort für die Live-Suche<input value={criteria.city} onChange={event => update("city", event.target.value)} minLength={2} maxLength={120} required disabled={busy} /></label>
          <label>Kaltmiete höchstens (€)<input type="number" min="0" max="1000000" step="any" inputMode="decimal" value={criteria.max_cold_rent} onChange={event => update("max_cold_rent", event.target.value)} disabled={busy} /></label>
          <label>Warmmiete höchstens (€)<input type="number" min="0" max="1000000" step="any" inputMode="decimal" value={criteria.max_warm_rent} onChange={event => update("max_warm_rent", event.target.value)} disabled={busy} /></label>
          <label>Zimmer mindestens<input type="number" min="0" max="100" step="0.5" inputMode="decimal" value={criteria.min_rooms} onChange={event => update("min_rooms", event.target.value)} disabled={busy} /></label>
          <button className="primary" type="submit" disabled={busy || config.remaining <= 0}><Search size={17} />{busy ? "Wohnungen werden gesucht…" : "Aktuelle Angebote abrufen"}</button>
        </form>
        <p className="live-search-note">Jeder Abruf verwendet eine Anfrage. Noch {config.remaining} von {config.monthly_limit} Anfragen im gemeinsamen Monatsbudget. Es gibt keine automatischen Abrufe.</p>
        {config.remaining <= 0 && <p role="status">Das monatliche Anfragebudget ist ausgeschöpft. Im nächsten Monat kannst du wieder suchen.</p>}
      </>}
      {busy && <p role="status">Aktuelle Wohnungsangebote werden gesucht…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {expired && <p role="status">Die Suchergebnisse sind abgelaufen. Starte bei Bedarf eine neue Suche.</p>}
      {result && <section className="live-results" aria-label="Ergebnisse der Live-Suche">
        <p role="status">{result.count} passende Angebote für {result.search.city} in dieser Antwort.</p>
        <p className="live-search-note">Bis zu 20 zuletzt erfasste Angebote werden je Abruf geprüft; zusätzliche Budgetfilter können die Auswahl verkleinern. Ergebnisse bleiben höchstens 15 Minuten und nur bis zum Verlassen dieser Seite sichtbar. Prüfe Verfügbarkeit und Angaben im Originalangebot.</p>
        {result.results.map((listing, index) => {
          const url = safeUrl(listing.url);
          return <article className="live-result-card" key={`${listing.source}-${index}`}><h3>{listing.title}</h3>
            <div className="facts"><span>{listing.zipcode} {listing.city}</span><span>{quantity(listing.rooms, "Zimmer", "Zimmerzahl offen")}</span><span>{quantity(listing.living_area, "m²", "Fläche offen")}</span></div>
            <p>{price(listing.cold_rent) !== null ? `${price(listing.cold_rent)} Kaltmiete` : "Kaltmiete nicht angegeben"} · {price(listing.warm_rent) !== null ? `${price(listing.warm_rent)} Warmmiete` : "Warmmiete nicht angegeben"}</p>
            <p className="live-search-note">Angebot von {listing.source} · Gefunden über Somantic</p>
            {url && <a className="secondary" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${listing.title}: Originalangebot auf ${listing.source} öffnen (neuer Tab)`}>Originalangebot auf {listing.source}<ExternalLink size={16} /></a>}
          </article>;
        })}
        {result.count === 0 && <p>Für diese Anfrage wurden keine passenden Angebote geliefert. Versuche einen anderen Ort oder ein höheres Budget.</p>}
      </section>}
    </>}
  </section>;
}
