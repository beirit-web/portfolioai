import React, { useState } from "react";
import { apiRequest } from "./api";
import { useCollection } from "./useCollection";
import ProfileForm from "./ProfileForm";
import { euro } from "./listingUtils";

export default function ProfilesSection({ token }) {
  const [reload, setReload] = useState(0);
  const [locationReload, setLocationReload] = useState(0);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const profiles = useCollection("search-profiles/?ordering=name", token, reload);

  async function remove(profile) {
    setError(""); setSuccess(""); setBusy(true);
    try {
      await apiRequest(`search-profiles/${profile.id}/`, { token, method: "DELETE" });
      setSuccess("Suchprofil gelöscht.");
      setReload(value => value + 1);
    } catch (failure) {
      setError(failure.message);
    } finally { setBusy(false); }
  }

  return <section className="content-grid">
    <div className="listings profile-list">
      <div className="section-heading">
        <h1>Suchprofile</h1>
        {token && <button className="primary" type="button" onClick={() => { setEditing({}); setError(""); setSuccess(""); }}>Neues Profil</button>}
      </div>
      {!token ? <p>Bitte zunächst einloggen, um Suchprofile zu laden.</p> : <>
        {error && <p className="error" role="alert">{error}</p>}
        {profiles.error && <p className="error" role="alert">{profiles.error}</p>}
        {success && <p className="success" role="status">{success}</p>}
        {editing ? <ProfileForm key={editing.id || "new"} token={token} initial={editing}
          onSaved={() => { setEditing(null); setSuccess("Suchprofil gespeichert."); setReload(value => value + 1); }}
          onCancel={() => setEditing(null)} onLocationsChanged={() => setLocationReload(value => value + 1)} /> : <>
          {profiles.loading ? <p role="status">Suchprofile werden geladen…</p> : !profiles.error && profiles.entries.length === 0 && <p>Keine Suchprofile gefunden.</p>}
          {profiles.entries.map(profile => <article key={profile.id} className="listing-card profile-card" data-profile-id={profile.id}>
            <div><h2>{profile.name}</h2>
              <p>Orte: {profile.locations?.map(location => `${location.name} (${location.radius_km} km)`).join(", ") || "keine"}</p>
              <p>Budget warm: {euro(profile.max_warm_rent) || "keine Angabe"}</p>
              <p>Zimmer: {profile.min_rooms ?? "-"} bis {profile.max_rooms ?? "-"}</p>
              <p>{[profile.balcony && "Balkon", profile.fitted_kitchen && "Einbauküche", profile.ground_floor_or_elevator && "Erdgeschoss / Aufzug"].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="card-actions">
              <button className="secondary" type="button" disabled={busy} onClick={() => { setEditing(profile); setError(""); setSuccess(""); }}>Bearbeiten</button>
              <button className="secondary" type="button" disabled={busy} onClick={() => remove(profile)}>Löschen</button>
            </div>
          </article>)}
        </>}
        {!editing && <LocationsManager token={token} reload={locationReload} onChanged={() => {
          setLocationReload(value => value + 1); setReload(value => value + 1);
        }} />}
      </>}
    </div>
  </section>;
}

function LocationsManager({ token, reload, onChanged }) {
  const locations = useCollection("search-locations/", token, reload);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      await apiRequest(`search-locations/${editing.id ? `${editing.id}/` : ""}`, {
        token, method: editing.id ? "PUT" : "POST", body: { name: editing.name.trim(), radius_km: Number(editing.radius_km) },
      });
      setEditing(null); setSuccess("Suchort gespeichert."); onChanged();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function remove(location) {
    setError(""); setSuccess(""); setBusy(true);
    try {
      await apiRequest(`search-locations/${location.id}/`, { token, method: "DELETE" });
      setSuccess("Suchort gelöscht."); onChanged();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="location-manager listings" aria-labelledby="locations-heading">
    <div className="section-heading"><h2 id="locations-heading">Suchorte</h2>
      <button className="secondary" type="button" onClick={() => { setEditing({ name: "", radius_km: 15 }); setError(""); setSuccess(""); }}>Neuer Ort</button>
    </div>
    <p>Suchorte können in mehreren Profilen verwendet werden. Beim Löschen wird der Ort auch aus diesen Profilen entfernt.</p>
    {(error || locations.error) && <p className="error" role="alert">{error || locations.error}</p>}
    {success && <p className="success" role="status">{success}</p>}
    {editing && <form className="profile-form location-form" onSubmit={save}>
      <label>Ortsname<input value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} maxLength={120} required /></label>
      <label>Radius (km)<input type="number" min="0" max="1000" step="0.1" value={editing.radius_km} onChange={event => setEditing({ ...editing, radius_km: event.target.value })} required /></label>
      <div className="form-actions">
        <button className="primary" type="submit" disabled={busy}>Ort speichern</button>
        <button className="secondary" type="button" disabled={busy} onClick={() => { setEditing(null); setError(""); }}>Abbrechen</button>
      </div>
    </form>}
    {locations.loading ? <p role="status">Suchorte werden geladen…</p> : !locations.error && locations.entries.length === 0 && <p>Keine Suchorte gefunden.</p>}
    {locations.entries.map(location => <article key={location.id} className="listing-card location-card" data-location-id={location.id}>
      <div><h3>{location.name}</h3><p>Radius: {location.radius_km} km</p></div>
      <div className="card-actions">
        <button className="secondary" type="button" disabled={busy} onClick={() => { setEditing(location); setError(""); setSuccess(""); }}>Ort bearbeiten</button>
        <button className="secondary" type="button" disabled={busy} onClick={() => remove(location)}>Ort löschen</button>
      </div>
    </article>)}
  </section>;
}
