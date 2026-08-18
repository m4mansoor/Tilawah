import { useEffect, useState, type FormEvent } from "react";
import type { Recitation } from "./types";
import { api, fetchAdminAudio } from "./api";

export function AdminView({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Recitation[]>([]);
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        setItems(await api.adminQueue(status));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [status]);

  async function review(id: number, s: string) {
    setBusy(true);
    try {
      await api.review(id, s);
      setItems(await api.adminQueue(status));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <header className="topbar">
        <h1>Admin review</h1>
        <div className="spacer" />
        <button className="link" onClick={onBack}>Home</button>
      </header>

      <AssignForm />

      <div className="seg">
        {["pending", "approved", "rejected"].map((s) => (
          <button key={s} className={status === s ? "seg-active" : ""} onClick={() => setStatus(s)}>
            {s}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      <ul className="list">
        {items.map((r) => (
          <ReviewRow key={r.id} r={r} onReview={review} disabled={busy} />
        ))}
      </ul>
      {items.length === 0 && !error && <p className="muted">Nothing here.</p>}
    </main>
  );
}

function AssignForm() {
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState("ayah");
  const [surah, setSurah] = useState("");
  const [ayah, setAyah] = useState("");
  const [juz, setJuz] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await api.createAssignment(
        email,
        scope,
        surah ? Number(surah) : null,
        ayah ? Number(ayah) : null,
        juz ? Number(juz) : null,
      );
      setEmail("");
      setSurah("");
      setAyah("");
      setJuz("");
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3>Assign a recitation</h3>
      <div className="assign-grid">
        <input placeholder="Qari email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="ayah">Ayah</option>
          <option value="surah">Surah</option>
          <option value="juz">Juz</option>
        </select>
        {scope !== "juz" && <input placeholder="Surah number" value={surah} onChange={(e) => setSurah(e.target.value)} />}
        {scope === "ayah" && <input placeholder="Ayah number" value={ayah} onChange={(e) => setAyah(e.target.value)} />}
        {scope === "juz" && <input placeholder="Juz (1-30)" value={juz} onChange={(e) => setJuz(e.target.value)} />}
      </div>
      {error && <p className="error">{error}</p>}
      {done && <p className="ok-note">Assigned.</p>}
      <button className="primary" disabled={busy}>{busy ? "Assigning…" : "Assign"}</button>
    </form>
  );
}

function ReviewRow({
  r,
  onReview,
  disabled,
}: {
  r: Recitation;
  onReview: (id: number, s: string) => void;
  disabled: boolean;
}) {
  const [audio, setAudio] = useState<string | null>(null);

  async function play() {
    try {
      setAudio(await fetchAdminAudio(r.id));
    } catch {
      /* ignore */
    }
  }

  return (
    <li className="card review-row">
      <div className="review-head">
        <span className="badge">
          {r.scope === "surah" ? `Surah ${r.surah}` : r.scope === "juz" ? `Juz ${r.juz}` : `${r.surah}:${r.ayah}`}
        </span>
        <span className="muted">
          #{r.id} · score {r.match_score != null ? Math.round(r.match_score * 100) + "%" : "-"}
        </span>
      </div>
      <p className="muted transcript">Heard: {r.transcript || "(empty)"}</p>
      {audio ? (
        <audio controls autoPlay src={audio} />
      ) : (
        <button className="link" onClick={play}>▶ Play audio</button>
      )}
      <div className="review-actions">
        <button className="approve" disabled={disabled || r.status === "approved"} onClick={() => onReview(r.id, "approved")}>
          ✓ Approve
        </button>
        <button className="reject" disabled={disabled || r.status === "rejected"} onClick={() => onReview(r.id, "rejected")}>
          ✕ Reject
        </button>
      </div>
    </li>
  );
}
