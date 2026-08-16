import { useEffect, useState } from "react";
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
        <span className="badge">{r.surah}:{r.ayah}</span>
        <span className="muted">
          #{r.id} · score {r.match_score != null ? Math.round(r.match_score * 100) + "%" : "—"}
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
