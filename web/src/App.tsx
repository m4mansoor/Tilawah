import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Coverage, QariProfile, Selection } from "./types";
import { api, clearToken, getToken, setToken } from "./api";
import { Crescent, HeroBanner } from "./Art";
import { BookIcon, HeadphonesIcon, MicIcon, ShieldIcon } from "./icons";
import { BrowseView, MyView, ReciteView } from "./ReciteView";
import { AdminView } from "./AdminView";

type View =
  | "loading"
  | "auth"
  | "onboarding"
  | "home"
  | "recite"
  | "browse"
  | "my"
  | "admin";

export default function App() {
  const [view, setView] = useState<View>("loading");
  const [profile, setProfile] = useState<QariProfile | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setView("auth");
        return;
      }
      try {
        const p = await api.getProfile();
        setProfile(p);
        setView(p.consent_ok ? "home" : "onboarding");
      } catch {
        clearToken();
        setView("auth");
      }
    })();
  }, []);

  async function refreshCoverage() {
    try {
      setCoverage(await api.coverage());
    } catch {
      /* ignore */
    }
  }

  async function afterAuth() {
    const p = await api.getProfile();
    setProfile(p);
    setView(p.consent_ok ? "home" : "onboarding");
  }

  function logout() {
    clearToken();
    setProfile(null);
    setView("auth");
  }

  function goRecite(s: Selection) {
    setSelection(s);
    setView("recite");
  }

  if (view === "loading") {
    return (
      <main className="wrap narrow">
        <div className="spinner" />
        <p className="center">Preparing Tilawah…</p>
      </main>
    );
  }

  if (view === "auth") return <AuthView onAuthed={afterAuth} />;

  if (view === "onboarding" && profile) {
    return (
      <OnboardingView
        profile={profile}
        onDone={(p) => {
          setProfile(p);
          setView("home");
        }}
      />
    );
  }

  if (view === "recite" && selection) {
    return (
      <ReciteView
        selection={selection}
        onDone={() => {
          setSelection(null);
          setView("home");
          refreshCoverage();
        }}
      />
    );
  }

  if (view === "browse") {
    return <BrowseView onPick={goRecite} onBack={() => setView("home")} />;
  }

  if (view === "my") return <MyView onBack={() => setView("home")} />;

  if (view === "admin" && profile?.role === "admin") {
    return <AdminView onBack={() => setView("home")} />;
  }

  return (
    <HomeView
      profile={profile!}
      coverage={coverage}
      onCoverage={refreshCoverage}
      onReciteNext={async () => {
        const v = await api.nextVerse();
        goRecite({
          scope: "ayah",
          surah: v.surah,
          ayah: v.ayah,
          juz: null,
          text: v.text,
          label: `${v.surah}:${v.ayah}`,
        });
      }}
      onBrowse={() => setView("browse")}
      onMy={() => setView("my")}
      onAdmin={() => setView("admin")}
      onLogout={logout}
    />
  );
}

function AuthView({ onAuthed }: { onAuthed: () => Promise<void> }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password, name || undefined);
      setToken(res.access_token);
      await onAuthed();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <HeroBanner />
      <main className="wrap narrow">
        <p className="tagline">Recite for the Ummah. Help build the Quran model.</p>
        <form onSubmit={submit} className="card">
        {mode === "register" && (
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
      <p className="muted">
        {mode === "login" ? "New here? " : "Have an account? "}
        <button className="link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
      </main>
    </>
  );
}

function OnboardingView({
  profile,
  onDone,
}: {
  profile: QariProfile;
  onDone: (p: QariProfile) => void;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [gender, setGender] = useState(profile.gender ?? "");
  const [ageRange, setAgeRange] = useState(profile.age_range ?? "");
  const [level, setLevel] = useState(profile.tajweed_level ?? "");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("Please consent to recording storage & training use.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const p = await api.updateProfile({
        name,
        qiraah: "hafs",
        gender: gender || null,
        age_range: ageRange || null,
        tajweed_level: level || null,
        consent_ok: true,
      });
      onDone(p);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <HeroBanner />
      <main className="wrap narrow">
        <h1>Welcome, {profile.name || profile.email}</h1>
        <p className="tagline">A few details before you start reciting.</p>
        <form onSubmit={submit} className="card">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Qira'ah
          <input value="Hafs 'an 'Asim" disabled />
        </label>
        <label>
          Gender
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label>
          Age range
          <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="under18">Under 18</option>
            <option value="18-30">18-30</option>
            <option value="31-50">31-50</option>
            <option value="51+">51+</option>
          </select>
        </label>
        <label>
          Tajweed experience
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Select…</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced / certified</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I consent to my recitations being stored and used to train Tilawah's recitation model.</span>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Start reciting"}
        </button>
      </form>
      </main>
    </>
  );
}

function HomeView(props: {
  profile: QariProfile;
  coverage: Coverage | null;
  onCoverage: () => Promise<void>;
  onReciteNext: () => Promise<void>;
  onBrowse: () => void;
  onMy: () => void;
  onAdmin: () => void;
  onLogout: () => void;
}) {
  const { profile, coverage, onCoverage, onReciteNext, onBrowse, onMy, onAdmin, onLogout } = props;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    onCoverage();
  }, [onCoverage]);

  async function reciteNext() {
    setBusy(true);
    try {
      await onReciteNext();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <header className="topbar">
        <Crescent size={30} />
        <h1 className="brand">تِلاوَة</h1>
        <div className="spacer" />
        <span className="muted">{profile.name || profile.email}</span>
        <button className="link" onClick={onLogout}>Log out</button>
      </header>

      <section className="home-banner animate-in">
        <img src="/img/blue-mosque.jpg" alt="" />
        <div className="home-banner-overlay">
          <div>
            <div className="home-greeting">Assalamu Alaikum, {profile.name || "Qari"}</div>
            <div className="home-sub">Your recitation helps build the Quran model.</div>
          </div>
        </div>
      </section>

      <button className="primary big cta-recite animate-in d1" onClick={reciteNext} disabled={busy}>
        <MicIcon size={22} />
        <span>{busy ? "Finding a verse…" : "Start reciting"}</span>
      </button>

      {coverage && (
        <section className="card progress-card animate-in d2">
          <div className="progress-head">
            <h2>Collection progress</h2>
            <span className="progress-pct">
              {Math.round((coverage.covered_ayahs / coverage.total_ayahs) * 100)}%
            </span>
          </div>
          <div className="bar">
            <div
              className="bar-fill"
              style={{ width: `${Math.min(100, (coverage.covered_ayahs / coverage.total_ayahs) * 100)}%` }}
            />
          </div>
          <div className="stat-row">
            <Stat label="Approved" value={coverage.approved_samples} />
            <Stat label="Verses covered" value={`${coverage.covered_ayahs} / ${coverage.total_ayahs}`} />
            <Stat label="Fully collected" value={coverage.complete_ayahs} />
            <Stat label="Target / verse" value={`${coverage.target_per_ayah} qaris`} />
          </div>
        </section>
      )}

      <div className="action-grid">
        <ActionCard icon={<BookIcon />} label="Browse surahs" onClick={onBrowse} delay="d3" />
        <ActionCard icon={<HeadphonesIcon />} label="My recordings" onClick={onMy} delay="d4" />
        {profile.role === "admin" && (
          <ActionCard icon={<ShieldIcon />} label="Admin review" onClick={onAdmin} delay="d4" />
        )}
      </div>

      <footer className="footer">Tilawah · Recite for the Ummah</footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ActionCard({
  icon,
  label,
  onClick,
  delay,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  delay?: string;
}) {
  return (
    <button className={`card action animate-in ${delay ?? ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}


