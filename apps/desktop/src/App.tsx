import { useRef, useState } from "react";
import "./App.css";

// Correction engine URL. Override at build time with VITE_API_URL,
// or change the fallback here. Local dev: http://localhost:8000
const API_URL: string =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8010";

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

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  return (
    <main className="app">
      <header className="header">
        <h1>Tilawah</h1>
        <div className="arabic">تِلاوَة</div>
        <p className="tagline">
          Recite. Get corrected. Perfect your Quran recitation — word by word.
        </p>
      </header>

      <section className="controls">
        {!recording ? (
          <button className="record" onClick={startRecording} disabled={busy}>
            🎙️ Start Reciting
          </button>
        ) : (
          <button className="record stop" onClick={stopRecording}>
            ⏹ Stop &amp; Check
          </button>
        )}
        {busy && <p className="hint">Analyzing your recitation…</p>}
      </section>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="result">
          <h2>Your recitation</h2>
          <p className="transcript">{result.transcript || "(no transcript)"}</p>

          {result.errors.length === 0 ? (
            <p className="ok">✅ No mistakes detected.</p>
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
