import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Headphones, Repeat2, SkipBack, SkipForward, Trash2, Upload } from "lucide-react";
import type { CurrentUser } from "../api";
import { ui } from "../i18n";
import { AppButton, Panel } from "./UiPrimitives";
import { addLocalRecordings, listLocalRecordings, removeLocalRecording, type LocalRecording } from "../lib/localRecordings";
import "./RecordingPlayer.css";

export default function RecordingPlayer({ user }: { user: CurrentUser | null }) {
  const ownerKey = user ? `user:${user.id}` : "guest";
  // Remount the library when the account changes, so old asynchronous work cannot
  // restore another account's selection or audio URL in the current interface.
  return <RecordingLibrary key={ownerKey} ownerKey={ownerKey} />;
}

function RecordingLibrary({ ownerKey }: { ownerKey: string }) {
  const [recordings, setRecordings] = useState<LocalRecording[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [status, setStatus] = useState<keyof typeof ui.recordings | "">("");
  const [error, setError] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [speed, setSpeed] = useState("1");
  const audioRef = useRef<HTMLAudioElement>(null);
  const bindAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (audioRef.current !== audio) audioRef.current?.pause();
    audioRef.current = audio;
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const selected = recordings.find(recording => recording.id === selectedId);
  const filtered = recordings.filter(recording => recording.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  useEffect(() => {
    active.current = true;
    listLocalRecordings(ownerKey).then(items => {
      if (!active.current) return;
      setRecordings(items);
      setSelectedId(items[0]?.id ?? "");
      setStorageReady(true);
    }).catch(() => {
      if (active.current) { setStatus("storageError"); setError(true); }
    }).finally(() => { if (active.current) setLoading(false); });
    return () => { active.current = false; };
  }, [ownerKey]);

  useEffect(() => {
    if (!selected) { setSource(""); return; }
    const url = URL.createObjectURL(selected.blob);
    setSource(url);
    return () => { URL.revokeObjectURL(url); };
  }, [selected]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = Number(speed);
  }, [speed, source]);

  async function importFiles(files: File[]) {
    if (!files.length) return;
    setBusy(true); setStatus(""); setError(false);
    try {
      const added = await addLocalRecordings(files, ownerKey);
      if (!active.current) return;
      const ordered = [...added].reverse();
      setRecordings(current => [...ordered, ...current]);
      setSelectedId(ordered[0].id);
      setStatus("saved");
    } catch (cause) {
      if (!active.current) return;
      setError(true);
      setStatus(cause instanceof Error && cause.message === "invalid_audio" ? "invalidAudio" : "storageError");
    } finally {
      if (active.current) { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
    }
  }

  async function remove(recording: LocalRecording) {
    setBusy(true); setStatus(""); setError(false);
    try {
      await removeLocalRecording(recording.id, ownerKey);
      if (!active.current) return;
      const remaining = recordings.filter(item => item.id !== recording.id);
      setRecordings(remaining);
      if (selectedId === recording.id) setSelectedId(remaining[0]?.id ?? "");
      setStatus("removed");
    } catch {
      if (active.current) { setStatus("storageError"); setError(true); }
    } finally { if (active.current) setBusy(false); }
  }

  function step(direction: number) {
    const index = recordings.findIndex(recording => recording.id === selectedId);
    const next = recordings[(index + direction + recordings.length) % recordings.length];
    if (next) setSelectedId(next.id);
  }

  return (
    <Panel className="recording-library">
      <div className="recording-library__heading"><Headphones aria-hidden="true" /><h2>{ui.recordings.title}</h2></div>
      <p className="text-body-copy">{ui.recordings.lead}</p>
      <p className="recording-library__storage-note">{ui.recordings.storageNote}</p>
      <div className="recording-library__import">
        <label htmlFor="recording-files">{ui.recordings.choose}</label>
        <input ref={inputRef} id="recording-files" type="file" multiple
          accept="audio/*,.mp3,.wav,.ogg,.oga,.webm,.m4a,.aac,.flac"
          disabled={loading || busy || !storageReady} aria-describedby="recording-formats"
          onChange={event => { void importFiles(Array.from(event.target.files ?? [])); }} />
        <small id="recording-formats">{ui.recordings.formats}</small>
        <Upload aria-hidden="true" />
      </div>
      <p role={error ? "alert" : "status"} className={`recording-library__status ${error ? "recording-library__status--error" : ""}`}>
        {loading ? ui.recordings.loading : busy ? ui.recordings.saving : status ? ui.recordings[status] : ""}
      </p>
      {selected && <section className="recording-player" aria-label={ui.recordings.player}>
        <h3>{selected.name}</h3>
        {source && <audio key={source} ref={bindAudio} src={source} controls preload="metadata" loop={repeat}
          aria-label={`${ui.recordings.play}: ${selected.name}`}
          onError={() => { setStatus("playbackError"); setError(true); }} />}
        <div className="recording-player__controls">
          <AppButton aria-label={ui.recordings.previous} disabled={recordings.length < 2 || busy} onClick={() => step(-1)}><SkipBack aria-hidden="true" /></AppButton>
          <AppButton aria-label={ui.recordings.next} disabled={recordings.length < 2 || busy} onClick={() => step(1)}><SkipForward aria-hidden="true" /></AppButton>
          <AppButton aria-label={ui.recordings.repeat} aria-pressed={repeat} onClick={() => setRepeat(value => !value)}><Repeat2 aria-hidden="true" /></AppButton>
          <label>{ui.recordings.speed}<select aria-label={ui.recordings.speed} value={speed} onChange={event => setSpeed(event.target.value)}>
            {["0.5", "0.75", "1", "1.25", "1.5", "2"].map(value => <option key={value} value={value}>{value}×</option>)}
          </select></label>
          <a className="recording-player__download" href={source || undefined} download={selected.filename}><Download aria-hidden="true" />{ui.recordings.download}</a>
        </div>
      </section>}
      <div className="recording-library__list-heading"><h3>{ui.recordings.library} <span>({recordings.length})</span></h3>
        <label className="sr-only" htmlFor="recording-search">{ui.recordings.search}</label>
        <input id="recording-search" type="search" value={query} placeholder={ui.recordings.search} onChange={event => setQuery(event.target.value)} />
      </div>
      {!loading && !recordings.length && <p className="recording-library__empty">{ui.recordings.empty}</p>}
      {!!recordings.length && !filtered.length && <p>{ui.recordings.noResults}</p>}
      <ul className="recording-library__list">{filtered.map(recording => <li key={recording.id}>
        <button type="button" className="recording-library__select" aria-pressed={selectedId === recording.id}
          onClick={() => { setSelectedId(recording.id); setStatus(""); setError(false); }}>
          <Headphones aria-hidden="true" /><span><strong>{recording.name}</strong><small>{recording.filename} · {(recording.blob.size / 1024 / 1024).toFixed(1)} MB</small></span>
        </button>
        <AppButton disabled={busy} aria-label={`${ui.recordings.remove}: ${recording.name}`} onClick={() => { void remove(recording); }}><Trash2 aria-hidden="true" /></AppButton>
      </li>)}</ul>
    </Panel>
  );
}
