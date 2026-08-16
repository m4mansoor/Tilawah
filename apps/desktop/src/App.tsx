import { useEffect, useRef, useState } from "react";
import "./App.css";

// Correction engine URL. Override at build time with VITE_API_URL.
const API_URL: string =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8010";

// Authentic Islamic content shown while a recitation is being analyzed.
const TEACHINGS = [
  {
    arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    text: "The best among you is the one who learns the Quran and teaches it.",
    source: "Sahih al-Bukhari",
  },
  {
    arabic: "وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا",
    text: "And recite the Quran with measured recitation.",
    source: "Quran 73:4",
  },
  {
    arabic:
      "مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا",
    text: "Whoever recites a letter of Allah's Book gets a good deed, and a good deed is multiplied tenfold.",
    source: "Jami' at-Tirmidhi",
  },
  {
    arabic: "الْمَاهِرُ بِالْقُرْآنِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ",
    text: "The one proficient in Quran recitation will be with the noble, righteous scribes (angels).",
    source: "Sahih Muslim",
  },
  {
    arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا",
    text: "And say: 'My Lord, increase me in knowledge.'",
    source: "Quran 20:114",
  },
  {
    arabic: "اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا",
    text: "Recite and ascend, and recite slowly as you used to recite in the world.",
    source: "Sunan Abi Dawud",
  },
];

type WordError = {
  index: number;
  word: string;
  expected: string | null;
  recognized: string | null;
  error_type: string;
  tajweed_rule: string | null;
};

type CorrectionResponse = {
  status: string;
  transcript: string;
  ayah_id: number | null;
  matched_ayah_text: string | null;
  errors: WordError[];
};

function App() {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CorrectionResponse | null>(null);
  const [teachingIndex, setTeachingIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Rotate through Islamic teachings while analyzing.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(
      () => setTeachingIndex((i) => (i + 1) % TEACHINGS.length),
      5000
    );
    return () => clearInterval(id);
  }, [busy]);

  // Elapsed-seconds timer while analyzing.
  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, [busy]);

  async function startRecording() {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        await submit(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access was denied. Please allow microphone access.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  async function submit(blob: Blob) {
    setBusy(true);
    try {
      const base64 = await blobToBase64(blob);
      const res = await fetch(`${API_URL}/v1/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_base64: base64 }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setResult((await res.json()) as CorrectionResponse);
    } catch {
      setError(`Could not reach the correction engine at ${API_URL}. Is it running?`);
    } finally {
      setBusy(false);
    }
  }

  const teaching = TEACHINGS[teachingIndex];

  return (
    <main className="app">
      <header className="header">
        <h1>Tilawah</h1>
        <div className="arabic">تِلاوَة</div>
        <p className="tagline">
          Recite. Get corrected. Perfect your Quran recitation — word by word.
        </p>
      </header>

      {!busy && !result && (
        <section className="controls">
          {!recording ? (
            <button className="record" onClick={startRecording}>
              🎙️ Start Reciting
            </button>
          ) : (
            <div className="recording-block">
              <div className="mic-pulse" aria-hidden>
                🎙️
              </div>
              <p className="hint">Listening… recite slowly and clearly.</p>
              <button className="record stop" onClick={stopRecording}>
                ⏹ Stop &amp; Check
              </button>
            </div>
          )}
        </section>
      )}

      {busy && (
        <section className="analyzing">
          <div className="spinner" aria-hidden />
          <h2>Analyzing your recitation…</h2>
          <p className="elapsed">
            {elapsed < 3
              ? "Preparing the recitation model…"
              : `Working… ${elapsed}s`}{" "}
            · this can take a few seconds
          </p>

          <div className="teaching" key={teachingIndex}>
            <p className="teaching-arabic">{teaching.arabic}</p>
            <p className="teaching-text">“{teaching.text}”</p>
            <p className="teaching-source">— {teaching.source}</p>
          </div>
        </section>
      )}

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="result">
          <div className="checkmark" aria-hidden>
            ✓
          </div>
          <h2>Your recitation</h2>
          <p className="transcript">{result.transcript || "(no transcript)"}</p>

          {result.errors.length === 0 ? (
            <p className="ok">✅ Masha'Allah — no mistakes detected.</p>
          ) : (
            <>
              <h3>Corrections ({result.errors.length})</h3>
              <ul className="errors">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    <span className="badge">{e.error_type}</span>
                    {e.expected && <b>{e.expected}</b>}
                    {e.expected && e.recognized && " → "}
                    {e.recognized && <span className="wrong">{e.recognized}</span>}
                    {e.expected && !e.recognized && " (missing)"}
                    {!e.expected && e.recognized && " (extra)"}
                  </li>
                ))}
              </ul>
            </>
          )}

          <button className="again" onClick={reset}>
            🎙️ Recite Again
          </button>
        </section>
      )}
    </main>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default App;
