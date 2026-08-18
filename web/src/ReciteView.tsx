import { useEffect, useRef, useState } from "react";
import type { Juz, Recitation, Selection, Surah, Verse } from "./types";
import { api } from "./api";
import { t } from "./i18n";
import { ArrowLeftIcon, MicIcon, StopIcon } from "./icons";

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

export function ReciteView({ selection, onDone }: { selection: Selection; onDone: () => void }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Recitation | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!recording) return;
    setElapsed(0);
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [recording]);

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
      setError(t("recite.micDenied"));
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
      setResult(
        await api.submit(selection.scope, selection.surah, selection.ayah, selection.juz, b64),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap narrow">
      <header className="topbar">
        <button className="link back" onClick={onDone}>
          <ArrowLeftIcon size={20} /> {t("common.back")}
        </button>
        <div className="spacer" />
        <span className="muted">{selection.label}</span>
      </header>

      <div className="card verse animate-in">
        <div className="verse-ref">
          <span className="badge">{selection.label}</span>
        </div>
        <p className="verse-text">{selection.text}</p>
      </div>

      {!result ? (
        <div className="recorder">
          {!recording && !busy && (
            <div className="animate-in d1">
              <button className="mic-btn" onClick={start} aria-label={t("recite.startRecording")}>
                <MicIcon size={40} />
              </button>
              <p className="hint">{t("recite.startHint")}</p>
            </div>
          )}

          {recording && (
            <div className="animate-in d1">
              <div className="wave">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="timer">{formatTime(elapsed)}</div>
              <button className="record stop" onClick={stop}>
                <StopIcon size={18} /> {t("recite.stopSubmit")}
              </button>
            </div>
          )}

          {busy && (
            <div className="animate-in d1">
              <div className="spinner" />
              <p className="muted">{t("recite.transcribing")}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card success-card animate-in">
          <svg className="checkmark" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="24" />
            <path d="M14 27 l8 8 16 -16" />
          </svg>
          <h2>{t("recite.thanks")}</h2>
          <div className="score-big">
            {result.match_score != null ? Math.round(result.match_score * 100) + "%" : "-"}
          </div>
          <p className="summary">{result.summary || ""}</p>
          {result.errors && result.errors.length > 0 && (
            <ul className="error-list">
              {result.errors.map((e, i) => (
                <li key={i}>
                  <span className="badge err">{e.error_type}</span>
                  {e.expected && <b>{e.expected}</b>}
                  {e.expected && e.recognized && " → "}
                  {e.recognized && <span className="wrong">{e.recognized}</span>}
                  {e.expected && !e.recognized && ` ${t("recite.missing")}`}
                  {!e.expected && e.recognized && ` ${t("recite.extra")}`}
                </li>
              ))}
            </ul>
          )}
          <button className="primary" onClick={onDone}>{t("recite.done")}</button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function BrowseView({
  onPick,
  onBack,
}: {
  onPick: (s: Selection) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<"ayah" | "surah" | "juz">("ayah");

  return (
    <main className="wrap">
      <header className="topbar">
        <h1>{t("nav.browse")}</h1>
        <div className="spacer" />
        <button className="link" onClick={onBack}>{t("common.home")}</button>
      </header>

      <div className="seg">
        <button className={tab === "ayah" ? "seg-active" : ""} onClick={() => setTab("ayah")}>
          {t("common.ayah")}
        </button>
        <button className={tab === "surah" ? "seg-active" : ""} onClick={() => setTab("surah")}>
          {t("common.surah")}
        </button>
        <button className={tab === "juz" ? "seg-active" : ""} onClick={() => setTab("juz")}>
          {t("common.juz")}
        </button>
      </div>

      {tab === "ayah" && <AyahPicker onPick={onPick} />}
      {tab === "surah" && <SurahPicker onPick={onPick} />}
      {tab === "juz" && <JuzPicker onPick={onPick} />}
    </main>
  );
}

function AyahPicker({ onPick }: { onPick: (s: Selection) => void }) {
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
    <>
      {!surah ? (
        <>
          <input
            className="search"
            placeholder={t("recite.searchSurah")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="list">
            {filtered.map((s) => (
              <li key={s.number}>
                <button className="list-row" onClick={() => open(s)}>
                  <span className="badge">{s.number}</span>
                  <span>{s.name}</span>
                  <span className="muted">{s.english_name} · {s.ayah_count} {t("common.ayahs")}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <button className="link" onClick={() => { setSurah(null); setAyahs(null); }}>
            {t("recite.allSurahs")}
          </button>
          <h2>{surah.name}</h2>
          {ayahs === null ? (
            <p className="muted">{t("common.loading")}</p>
          ) : (
            <ul className="list">
              {ayahs.map((a) => (
                <li key={a.ayah}>
                  <button
                    className="list-row"
                    onClick={() =>
                      onPick({
                        scope: "ayah",
                        surah: surah.number,
                        ayah: a.ayah,
                        juz: null,
                        text: a.text,
                        label: `${surah.number}:${a.ayah}`,
                      })
                    }
                  >
                    <span className="badge">{surah.number}:{a.ayah}</span>
                    <span className="ayah-preview">{a.text}</span>
                    <span className="muted">{a.sample_count} {a.sample_count === 1 ? t("common.sample") : t("common.samples")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && <p className="error">{error}</p>}
    </>
  );
}

function SurahPicker({ onPick }: { onPick: (s: Selection) => void }) {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    api.surahs().then(setSurahs).catch((e) => setError((e as Error).message));
  }, []);

  async function pick(s: Surah) {
    setBusy(s.number);
    try {
      const ayahs = await api.surahAyahs(s.number);
      const text = ayahs.map((a) => a.text).join(" ");
      onPick({ scope: "surah", surah: s.number, ayah: null, juz: null, text, label: `${t("common.surah")} ${s.name}` });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <ul className="list">
        {surahs.map((s) => (
          <li key={s.number}>
            <button className="list-row" onClick={() => pick(s)} disabled={busy === s.number}>
              <span className="badge">{s.number}</span>
              <span>{s.name}</span>
              <span className="muted">{s.english_name} · {s.ayah_count} {t("common.ayahs")}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="error">{error}</p>}
    </>
  );
}

function JuzPicker({ onPick }: { onPick: (s: Selection) => void }) {
  const [juzs, setJuzs] = useState<Juz[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    api.juzList().then(setJuzs).catch((e) => setError((e as Error).message));
  }, []);

  async function pick(j: Juz) {
    setBusy(j.number);
    try {
      const ayahs = await api.juzAyahs(j.number);
      const text = ayahs.map((a) => a.text).join(" ");
      onPick({ scope: "juz", surah: null, ayah: null, juz: j.number, text, label: `${t("common.juz")} ${j.number}` });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <ul className="list">
        {juzs.map((j) => (
          <li key={j.number}>
            <button className="list-row" onClick={() => pick(j)} disabled={busy === j.number}>
              <span className="badge">{t("common.juz")} {j.number}</span>
              <span className="muted">{t("recite.startsAt")} {j.start_surah}:{j.start_ayah}</span>
              <span className="muted">{j.ayah_count} {t("common.ayahs")}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="error">{error}</p>}
    </>
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
        <h1>{t("my.title")}</h1>
        <div className="spacer" />
        <button className="link" onClick={onBack}>{t("common.home")}</button>
      </header>
      {items.length === 0 && !error && (
        <p className="muted">{t("my.empty")}</p>
      )}
      <ul className="list">
        {items.map((r) => (
          <li key={r.id} className="list-row static">
            <span className="badge">{recitationLabel(r)}</span>
            <span className="muted">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</span>
            <span className={`status status-${r.status}`}>{r.status}</span>
            <span className="muted">{r.match_score != null ? Math.round(r.match_score * 100) + "%" : "-"}</span>
          </li>
        ))}
      </ul>
      {error && <p className="error">{error}</p>}
    </main>
  );
}

function recitationLabel(r: Recitation): string {
  if (r.scope === "surah") return `${t("common.surah")} ${r.surah}`;
  if (r.scope === "juz") return `${t("common.juz")} ${r.juz}`;
  return `${r.surah}:${r.ayah}`;
}

