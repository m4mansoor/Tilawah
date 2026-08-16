import { useEffect, useRef, useState } from "react";
import type { Recitation, Surah, Verse } from "./types";
import { api } from "./api";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      resolve(url.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function ReciteView({ verse, onDone }: { verse: Verse; onDone: () => void }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Recitation | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await submit(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("Microphone access denied. Please allow mic access and try again.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function submit(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const b64 = await blobToBase64(blob);
      setResult(await api.submit(verse.surah, verse.ayah, b64));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap narrow">
      <header className="topbar">
        <h1>Recite</h1>
        <div className="spacer" />
        <button className="link" onClick={onDone}>Home</button>
      </header>

      <div className="card verse">
        <div className="muted">Surah {verse.surah} · Ayah {verse.ayah}</div>
        <p className="verse-text">{verse.text}</p>
      </div>

      {!result ? (
        <div className="controls">
          {!recording ? (
            <button className="record" onClick={start} disabled={busy}>🎙️ Start recording</button>
          ) : (
            <div className="recording-block">
              <div className="mic-pulse" aria-hidden>🎙️</div>
              <p className="hint">Listening… recite slowly and clearly.</p>
              <button className="record stop" onClick={stop}>⏹ Stop &amp; submit</button>
            </div>
          )}
          {busy && <p className="muted">Transcribing &amp; checking…</p>}
        </div>
      ) : (
        <div className="card">
          <h2>Submitted — thank you! 🎉</h2>
          <p className="muted">Status: <b>{result.status}</b></p>
          <p className="muted">
            Match score: <b>{result.match_score != null ? Math.round(result.match_score * 100) + "%" : "—"}</b>
          </p>
          <p className="muted">Heard: {result.transcript || "(empty)"}</p>
          <button className="primary" onClick={onDone}>Done</button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}

export function BrowseView({
  onPick,
  onBack,
}: {
  onPick: (v: Verse) => void;
  onBack: () => void;
}) {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [query, setQuery] = useState("");
  const [ayahs, setAyahs] = useState<Verse[] | null>(null);
  const [surah, setSurah] = useState<Surah | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.surahs().then(setSurahs).catch((e) => setError((e as Error).message));
  }, []);

  async function open(s: Surah) {
    setSurah(s);
    setAyahs(null);
    try {
      setAyahs(await api.surahAyahs(s.number));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const filtered = surahs.filter(
    (s) =>
      !query ||
      s.name.includes(query) ||
      s.english_name.toLowerCase().includes(query.toLowerCase()) ||
      String(s.number) === query,
  );

  return (
    <main className="wrap">
      <header className="topbar">
        <h1>Browse surahs</h1>
        <div className="spacer" />
        <button className="link" onClick={onBack}>Home</button>
      </header>

      {!surah ? (
        <>
          <input
            className="search"
            placeholder="Search surah…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="list">
            {filtered.map((s) => (
              <li key={s.number}>
                <button className="list-row" onClick={() => open(s)}>
                  <span className="badge">{s.number}</span>
                  <span>{s.name}</span>
                  <span className="muted">{s.english_name} · {s.ayah_count} ayahs</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <button className="link" onClick={() => { setSurah(null); setAyahs(null); }}>
            ← All surahs
          </button>
          <h2>{surah.name}</h2>
          {ayahs === null ? (
            <p className="muted">Loading…</p>
          ) : (
            <ul className="list">
              {ayahs.map((a) => (
                <li key={a.ayah}>
                  <button className="list-row" onClick={() => onPick(a)}>
                    <span className="badge">{surah.number}:{a.ayah}</span>
                    <span className="ayah-preview">{a.text}</span>
                    <span className="muted">{a.sample_count} sample{a.sample_count === 1 ? "" : "s"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && <p className="error">{error}</p>}
    </main>
  );
}

export function MyView({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Recitation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.mine().then(setItems).catch((e) => setError((e as Error).message));
  }, []);

  return (
    <main className="wrap">
      <header className="topbar">
        <h1>My recordings</h1>
        <div className="spacer" />
        <button className="link" onClick={onBack}>Home</button>
      </header>
      {items.length === 0 && !error && (
        <p className="muted">You haven't recorded anything yet.</p>
      )}
      <ul className="list">
        {items.map((r) => (
          <li key={r.id} className="list-row static">
            <span className="badge">{r.surah}:{r.ayah}</span>
            <span className="muted">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</span>
            <span className={`status status-${r.status}`}>{r.status}</span>
            <span className="muted">{r.match_score != null ? Math.round(r.match_score * 100) + "%" : "—"}</span>
          </li>
        ))}
      </ul>
      {error && <p className="error">{error}</p>}
    </main>
  );
}

