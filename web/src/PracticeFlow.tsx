import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { CorrectionResult, Selection, Verse, WordError } from "./types";
import "./practice.css";

type Stage = "listen" | "ready" | "recording" | "processing" | "feedback";
type NavTarget = "learn" | "learnBrowse" | "progress";

// Placeholder reciter map — EveryAyah open recitation dataset (public domain).
// Swap `folder` values if a different audio CDN is used later.
const RECITERS = [
  { name: "Alafasy", folder: "Alafasy_128kbps" },
  { name: "Abdul Basit", folder: "Abdul_Basit_Murattal_64kbps" },
  { name: "Al-Husary", folder: "Husary_128kbps" },
  { name: "Al-Minshawi", folder: "Minshawy_Murattal_128kbps" },
  { name: "As-Sudais", folder: "Abdurrahmaan_As-Sudais_64kbps" },
];

const WAVE_BARS = 24;
const IDLE_LEVELS = [0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 0.8, 0.65, 0.5, 0.35, 0.2, 0.3, 0.45, 0.6, 0.75, 0.6, 0.45, 0.3, 0.2, 0.35, 0.5, 0.65, 0.5, 0.35];

function audioUrl(surah: number, ayah: number, folder: string): string {
  const s = String(surah).padStart(3, "0");
  const a = String(ayah).padStart(3, "0");
  return `https://everyayah.com/data/${folder}/${s}${a}.mp3`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve((r.result as string).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function ScoreRing({ score }: { score: number }) {
  const r = 64;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const filled = (pct / 100) * c;
  const color = score >= 90 ? "var(--green-300)" : score >= 60 ? "var(--gold-400)" : "var(--pf-danger)";
  return (
    <svg width="148" height="148" viewBox="0 0 148 148" role="img" aria-label={`Score ${score}%`}>
      <circle cx="74" cy="74" r={r} fill="none" stroke="rgba(247,241,227,.1)" strokeWidth="10" />
      <circle cx="74" cy="74" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - filled} transform="rotate(-90 74 74)" />
    </svg>
  );
}

function FeedbackCard({ err }: { err: WordError }) {
  const t = err.error_type;
  const isSub = t === "substitution";
  const isDel = t === "deletion";
  const icon = isSub ? "🔄" : isDel ? "−" : "+";
  const label = isSub ? "Substitution" : isDel ? "Deletion" : "Insertion";
  const badge = isSub ? "is-sub" : isDel ? "is-del" : "";
  let explain = "";
  if (isSub) explain = `You said “${err.recognized ?? ""}” instead of “${err.expected ?? err.word}”.`;
  else if (isDel) explain = `“${err.expected ?? err.word}” was missed.`;
  else explain = `An extra word “${err.word}” was heard.`;
  return (
    <div className="pf-fcard">
      <span className="pf-fcard-icon" aria-hidden="true">{icon}</span>
      <div className="pf-fcard-body">
        <span className={`pf-badge ${badge}`}>{label}</span>
        {isSub ? (
          <span className="pf-fcard-ar" dir="rtl">
            <span>{err.expected ?? err.word}</span>
            <span className="arrow" dir="ltr">→</span>
            <span className="bad">{err.recognized}</span>
          </span>
        ) : (
          <span className="pf-fcard-ar" dir="rtl"><span className="bad">{err.expected ?? err.word}</span></span>
        )}
        <p className="pf-fcard-explain">{explain}</p>
      </div>
    </div>
  );
}

export default function PracticeFlow({
  nav,
  sel,
  onShare,
}: {
  nav: (v: NavTarget) => void;
  sel: Selection;
  onShare: (r: { score: number; verse: string; label: string }) => void;
}) {
  const surah = sel.surah ?? 1;
  const [stage, setStage] = useState<Stage>("listen");
  const [ayahs, setAyahs] = useState<Verse[]>([]);
  const [surahName, setSurahName] = useState("");
  const [idx, setIdx] = useState(0);

  const [voice, setVoice] = useState(RECITERS[0].folder);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(IDLE_LEVELS);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const cancelRef = useRef(false);

  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [error, setError] = useState("");

  const ayah = ayahs[idx];
  const ayahText = ayah?.text ?? "";
  const src = ayah ? audioUrl(surah, ayah.ayah, voice) : undefined;

  function cleanup() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    api.surahAyahs(surah).then((list) => {
      setAyahs(list);
      const t = (sel.ayah ?? 1) - 1;
      if (t >= 0 && t < list.length) setIdx(t);
    }).catch(() => {});
    api.surahs().then((l) => {
      const s = l.find((x) => x.number === surah);
      if (s) setSurahName(s.name);
    }).catch(() => {});
    return () => { audioRef.current?.pause(); cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah]);

  useEffect(() => {
    if (stage !== "recording") return;
    setElapsed(0);
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [stage]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play().catch(() => {});
  }
  function replay() {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  }

  function startLevelMeter(stream: MediaStream) {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setLevels(Array.from({ length: WAVE_BARS }, (_, i) =>
          Math.max(0.08, data[Math.floor((i * data.length) / WAVE_BARS)] / 255)));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* fall back to idle bars */ }
  }

  async function startRecording() {
    setError("");
    setResult(null);
    if (!ayah) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        cleanup();
        if (cancelRef.current) { cancelRef.current = false; return; }
        setStage("processing");
        try {
          const b64 = await blobToBase64(new Blob(chunksRef.current, { type: "audio/webm" }));
          setResult(await api.correct(surah, ayah.ayah, b64));
          setStage("feedback");
        } catch (err) {
          setError((err as Error).message);
          setLevels(IDLE_LEVELS);
          setStage("ready");
        }
      };
      recRef.current = rec;
      rec.start();
      startLevelMeter(stream);
      setStage("recording");
    } catch {
      setError("Microphone access denied. Please allow mic access.");
    }
  }
  function stopRecording() { recRef.current?.stop(); }
  function cancelRecording() {
    cancelRef.current = true;
    recRef.current?.stop();
    cleanup();
    setLevels(IDLE_LEVELS);
    setStage("ready");
  }

  function nextAyah() {
    if (idx + 1 < ayahs.length) {
      setIdx(idx + 1);
      setResult(null);
      setError("");
      setPlaying(false);
      setTime(0);
      setDuration(0);
      setLevels(IDLE_LEVELS);
      setStage("listen");
    } else {
      nav("learn");
    }
  }
  function share() {
    onShare({ score: score ?? 0, verse: ayahText, label: `${surah}:${ayah?.ayah ?? 1}` });
  }

  const score = result?.match_score != null ? Math.round(result.match_score * 100) : null;
  const message = score == null ? "Keep practicing" : score >= 90 ? "Excellent progress" : score >= 60 ? "Good attempt" : "Keep practicing";
  const counts = { substitution: 0, deletion: 0, insertion: 0 };
  result?.errors.forEach((e) => { const k = e.error_type as keyof typeof counts; if (k in counts) counts[k] += 1; });
  const summaryParts: string[] = [];
  if (counts.substitution) summaryParts.push(`${counts.substitution} substitution${counts.substitution > 1 ? "s" : ""}`);
  if (counts.deletion) summaryParts.push(`${counts.deletion} deletion${counts.deletion > 1 ? "s" : ""}`);
  if (counts.insertion) summaryParts.push(`${counts.insertion} insertion${counts.insertion > 1 ? "s" : ""}`);
  const summaryText = summaryParts.length ? `${summaryParts.join(", ")} detected.` : "No mistakes detected — Masha'Allah!";

  const step = stage === "feedback" ? 3 : stage === "listen" ? 1 : 2;
  const progressPct = duration ? (time / duration) * 100 : 0;

  return (
    <div className="pf-root">
      <div className="pf-pattern" aria-hidden="true" />
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      <header className="pf-topbar">
        <button className="pf-back" onClick={() => nav("learnBrowse")}>← Browse</button>
        <div className="pf-steps" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`pf-step-dot ${step === n ? "is-active" : step > n ? "is-done" : ""}`} />
          ))}
          <span className="pf-steps-label">Step {step} of 3</span>
        </div>
        <button className="pf-back" onClick={() => nav("progress")}>My progress</button>
      </header>

      <main className="pf-main">
        {stage === "listen" && (
          <div className="pf-container">
            <div>
              <p className="pf-eyebrow">Step 1 · Listen</p>
              <h1 className="pf-title">Listen to the ayah</h1>
            </div>

            <div className="pf-ayah-card">
              <p className="pf-ayah">{ayahText || "…"}</p>
              <div className="pf-ayah-ref"><span className="pf-ayah-ref-ar">{surahName || `Surah ${surah}`}</span> · Ayah {ayah?.ayah ?? 1}</div>
            </div>

            <div className="pf-player">
              <button className="pf-play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
              <div className="pf-player-body">
                <div className="pf-player-meta">
                  <span className="pf-times">{fmtTime(time)}</span>
                  <span>{RECITERS.find((r) => r.folder === voice)?.name}</span>
                  <span className="pf-times">{fmtTime(duration)}</span>
                </div>
                <div className="pf-progress" onClick={(e) => { const a = audioRef.current; if (!a || !duration) return; const rect = e.currentTarget.getBoundingClientRect(); a.currentTime = ((e.clientX - rect.left) / rect.width) * duration; }}>
                  <div className="pf-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <button className="pf-replay" onClick={replay} aria-label="Replay">↺</button>
            </div>

            <div className="pf-voices" role="group" aria-label="Choose reciter">
              {RECITERS.map((r) => (
                <button key={r.folder} className={`pf-voice-chip ${voice === r.folder ? "is-active" : ""}`} onClick={() => { setVoice(r.folder); setTime(0); setDuration(0); }} aria-pressed={voice === r.folder}>{r.name}</button>
              ))}
            </div>

            <div className="pf-actions">
              <button className="pf-btn pf-btn-primary" onClick={() => setStage("ready")}>I'm ready to recite →</button>
            </div>
          </div>
        )}

        {stage === "ready" && (
          <div className="pf-container">
            <p className="pf-eyebrow">Step 2 · Repeat</p>

            <div className="pf-ayah-card pf-ayah-card-compact">
              <p className="pf-ayah">{ayahText || "…"}</p>
              <div className="pf-ayah-ref"><span className="pf-ayah-ref-ar">{surahName || `Surah ${surah}`}</span> · Ayah {ayah?.ayah ?? 1}</div>
            </div>

            <div className="pf-wave is-idle" aria-hidden="true">
              {IDLE_LEVELS.map((v, i) => <span key={i} className="pf-wave-bar" style={{ height: `${v * 100}%` }} />)}
            </div>
            <div className="pf-mic-wrap">
              <button className="pf-mic" onClick={startRecording} aria-label="Start recording">🎙</button>
            </div>
            <div>
              <p className="pf-title" style={{ fontSize: "clamp(18px, 4vw, 22px)" }}>Tap the mic and recite</p>
              <p className="pf-hint" style={{ marginTop: 6 }}>Speak clearly and at a comfortable pace.</p>
              {error && <p className="pf-hint" style={{ color: "var(--pf-danger)", marginTop: 6 }}>{error}</p>}
            </div>
          </div>
        )}

        {stage === "recording" && (
          <div className="pf-container">
            <p className="pf-eyebrow">Step 2 · Repeat</p>

            <div className="pf-ayah-card pf-ayah-card-compact">
              <p className="pf-ayah">{ayahText || "…"}</p>
              <div className="pf-ayah-ref"><span className="pf-ayah-ref-ar">{surahName || `Surah ${surah}`}</span> · Ayah {ayah?.ayah ?? 1}</div>
            </div>

            <div className="pf-wave" aria-hidden="true">
              {levels.map((v, i) => <span key={i} className="pf-wave-bar" style={{ height: `${v * 100}%` }} />)}
            </div>
            <div className="pf-mic-wrap">
              <span className="pf-mic-ring" aria-hidden="true" />
              <button className="pf-mic is-recording" onClick={stopRecording} aria-label="Stop recording">◼</button>
            </div>
            <div>
              <p className="pf-status is-live"><span className="pf-status-dot" aria-hidden="true" />Recording</p>
              <p className="pf-timer">{fmtTime(elapsed)}</p>
              <p className="pf-hint" style={{ marginTop: 6 }}>Recite the ayah, then tap to finish.</p>
            </div>
            <button className="pf-cancel" onClick={cancelRecording}>Cancel &amp; retry</button>
          </div>
        )}

        {stage === "processing" && (
          <div className="pf-container">
            <p className="pf-eyebrow">Step 2 · Repeat</p>
            <div className="pf-loader" role="status" aria-live="polite">
              <span className="pf-loader-ring" aria-hidden="true" />
              <span className="pf-loader-ring delay" aria-hidden="true" />
              <span className="pf-loader-core" aria-hidden="true">🎙</span>
            </div>
            <p className="pf-title">Analyzing your recitation…</p>
            <p className="pf-hint">Listening carefully and checking every word against the ayah.</p>
          </div>
        )}

        {stage === "feedback" && result && (
          <div className="pf-container">
            <p className="pf-eyebrow">Step 3 · Feedback</p>
            <div className="pf-score">
              <div className="pf-score-ring-wrap">
                <ScoreRing score={score ?? 0} />
                <div className="pf-score-val">{score != null ? `${score}%` : "—"}</div>
              </div>
              <p className="pf-score-msg">{message}</p>
              <p className="pf-summary">{summaryText}</p>
            </div>

            {result.errors.length > 0 ? (
              <div className="pf-feedback">
                {result.errors.slice(0, 6).map((e, i) => <FeedbackCard key={i} err={e} />)}
              </div>
            ) : (
              <div className="pf-ayah-card" style={{ padding: "20px" }}>
                <p className="pf-fcard-explain" style={{ textAlign: "center" }}>✓ No mistakes detected — Masha'Allah!</p>
              </div>
            )}

            <div className="pf-actions">
              {idx + 1 < ayahs.length ? (
                <button className="pf-btn pf-btn-primary" onClick={nextAyah}>Next ayah →</button>
              ) : (
                <button className="pf-btn pf-btn-primary" onClick={() => nav("learn")}>Finish lesson</button>
              )}
              <button className="pf-btn pf-btn-secondary" onClick={share}>Share this win</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

