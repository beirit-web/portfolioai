import React, { useState } from "react";
import { apiRequest } from "./api";
import { useCollection } from "./useCollection";

export default function ProfileForm({ token, initial = {}, onSaved, onCancel, onLocationsChanged }) {
  const [name, setName] = useState(initial.name || "");
  const [minRooms, setMinRooms] = useState(initial.min_rooms ?? "");
  const [maxRooms, setMaxRooms] = useState(initial.max_rooms ?? "");
  const [maxWarmRent, setMaxWarmRent] = useState(initial.max_warm_rent ?? "");
  const [balcony, setBalcony] = useState(Boolean(initial.balcony));
  const [fittedKitchen, setFittedKitchen] = useState(Boolean(initial.fitted_kitchen));
  const [groundOrElevator, setGroundOrElevator] = useState(Boolean(initial.ground_floor_or_elevator));
  const [selected, setSelected] = useState(initial.location_ids || initial.locations?.map(location => location.id) || []);
  const [newLocationName, setNewLocationName] = useState("");
  const [newRadius, setNewRadius] = useState(15);
  const [newLocations, setNewLocations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const collection = useCollection("search-locations/", token);
  const locations = [...collection.entries, ...newLocations];

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!token) throw new Error("Bitte melden Sie sich an, um ein Suchprofil zu speichern.");
      const profile = await apiRequest(`search-profiles/${initial.id ? `${initial.id}/` : ""}`, {
        token,
        method: initial.id ? "PUT" : "POST",
        body: {
          name: name.trim(), min_rooms: minRooms === "" ? null : Number(minRooms),
          max_rooms: maxRooms === "" ? null : Number(maxRooms),
          max_warm_rent: maxWarmRent === "" ? null : Number(maxWarmRent),
          balcony, fitted_kitchen: fittedKitchen, ground_floor_or_elevator: groundOrElevator,
          location_ids: selected,
        },
      });
      onSaved(profile);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function addLocation() {
    setError("");
    if (!newLocationName.trim()) {
      setError("Bitte geben Sie einen Ortsnamen ein.");
      return;
    }
    setBusy(true);
    try {
      const location = await apiRequest("search-locations/", {
        token, method: "POST", body: { name: newLocationName.trim(), radius_km: Number(newRadius) },
      });
      setNewLocations(entries => [...entries, location]);
      setSelected(ids => [...ids, location.id]);
      setNewLocationName("");
      onLocationsChanged();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return <form className="profile-form" onSubmit={submit}>
    <label>Name<input value={name} onChange={event => setName(event.target.value)} required maxLength={120} /></label>
    <fieldset>
      <legend>Orte</legend>
      {collection.loading && <p role="status">Orte werden geladen…</p>}
      {collection.error && <p className="error" role="alert">{collection.error}</p>}
      <div className="location-options">
        {locations.map(location => <label key={location.id}>
          <input type="checkbox" checked={selected.includes(location.id)} onChange={() => setSelected(ids =>
            ids.includes(location.id) ? ids.filter(id => id !== location.id) : [...ids, location.id])} />
          <span>{location.name} ({location.radius_km} km)</span>
        </label>)}
      </div>
      <div className="new-location-row">
        <input aria-label="Neuer Ort" placeholder="Neuer Ort" value={newLocationName} onChange={event => setNewLocationName(event.target.value)} maxLength={120} />
        <label>Radius (km)<input type="number" min="0" max="1000" step="0.1" value={newRadius} onChange={event => setNewRadius(event.target.value)} /></label>
        <button type="button" className="secondary" disabled={busy} onClick={addLocation}>Hinzufügen</button>
      </div>
    </fieldset>
    <label>Min. Zimmer<input value={minRooms} onChange={event => setMinRooms(event.target.value)} type="number" min="0" max="100" step="0.5" /></label>
    <label>Max. Zimmer<input value={maxRooms} onChange={event => setMaxRooms(event.target.value)} type="number" min="0" max="100" step="0.5" /></label>
    <label>Max Warmmiete<input value={maxWarmRent} onChange={event => setMaxWarmRent(event.target.value)} type="number" min="0" max="1000000" step="0.01" /></label>
    <label><input type="checkbox" checked={balcony} onChange={event => setBalcony(event.target.checked)} /> Balkon</label>
    <label><input type="checkbox" checked={fittedKitchen} onChange={event => setFittedKitchen(event.target.checked)} /> Einbauküche</label>
    <label><input type="checkbox" checked={groundOrElevator} onChange={event => setGroundOrElevator(event.target.checked)} /> Erdgeschoss / Aufzug</label>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="form-actions">
      <button className="primary" type="submit" disabled={busy}>{busy ? "Speichern..." : "Speichern"}</button>
      <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Abbrechen</button>
    </div>
  </form>;
}
