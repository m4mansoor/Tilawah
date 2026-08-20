import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Coverage, QariProfile, Recitation, Selection, Surah, Verse } from "./types";
import { api, clearToken, getToken, setToken } from "./api";
import { Brand, Crescent, Footer, NavBar, PageHead, Stat } from "./ui";
import { getLang, setLang, type Lang } from "./i18n";
import LandingPage from "./Landing";
import AboutPage from "./About";
import PracticeFlow from "./PracticeFlow";
import { pathForView, pathToView, PUBLIC_VIEWS } from "./router";

export type View =
  | "landing" | "login" | "register" | "forgot" | "onboarding"
  | "home" | "browse" | "surah" | "recite" | "recordings" | "assignments"
  | "leaderboard" | "profile" | "learn" | "learnBrowse" | "practice" | "progress"
  | "review" | "donate" | "privacy" | "terms" | "challenge" | "share" | "about";

const QARI_LINKS = [
  { label: "Browse", key: "browse" },
  { label: "Recordings", key: "recordings" },
  { label: "Assignments", key: "assignments" },
  { label: "Leaderboard", key: "leaderboard" },
];
const LEARN_LINKS = [
  { label: "Learn", key: "learn" },
  { label: "Browse & learn", key: "learnBrowse" },
  { label: "Practice", key: "practice" },
  { label: "My progress", key: "progress" },
];

// Verse audio (EveryAyah — the open recitation dataset this project credits).
// File format: {surah}{ayah} padded to 3 digits, e.g. 001005.mp3 = Al-Fatihah:5.
function verseAudioUrl(surah: number, ayah: number, folder: string): string {
  const s = String(surah).padStart(3, "0");
  const a = String(ayah).padStart(3, "0");
  return `https://everyayah.com/data/${folder}/${s}${a}.mp3`;
}

let _audio: HTMLAudioElement | null = null;
function playVerse(surah: number, ayah: number, folder: string, onChange: (f: string | null) => void) {
  if (_audio) { _audio.pause(); _audio = null; }
  const audio = new Audio(verseAudioUrl(surah, ayah, folder));
  _audio = audio;
  onChange(folder);
  audio.onended = () => { onChange(null); _audio = null; };
  audio.onerror = () => { onChange(null); _audio = null; };
  audio.play().catch(() => { onChange(null); _audio = null; });
}
function stopVerse() { if (_audio) { _audio.pause(); _audio = null; } }

export default function App() {
  const [view, setView] = useState<View>(() => pathToView(window.location.pathname).view as View);
  const [profile, setProfile] = useState<QariProfile | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [lang, setLangState] = useState<Lang>(getLang());
  const [share, setShare] = useState<{ score: number; verse: string; label: string } | null>(null);

  // Reconstruct a deep-linked surah (e.g. /surah/1) into a selection.
  const openSurahByNumber = (n: number) => {
    api.surahs()
      .then((list) => {
        const s = list.find((x) => x.number === n);
        if (s) {
          setSelection({ scope: "surah", surah: s.number, ayah: null, juz: null, text: "", label: s.name });
          setView("surah");
        } else {
          setView("browse");
        }
      })
      .catch(() => setView("browse"));
  };

  // First-load bootstrap: honour the URL (deep links + refresh) and auth.
  useEffect(() => {
    const initial = pathToView(window.location.pathname);
    if (initial.view === "surah" && initial.surah) openSurahByNumber(initial.surah);

    if (getToken()) {
      api.getProfile()
        .then((p) => {
          setProfile(p);
          if (!p.consent_ok) { setView("onboarding"); return; }
          // Keep "logged-in landing -> dashboard", but never override a deep
          // link to a public page such as /about or /privacy.
          if (initial.view === "landing" || initial.view === "login" || initial.view === "register" || initial.view === "forgot") {
            setView("home");
          }
        })
        .catch(() => { clearToken(); setView("landing"); });
    } else if (!PUBLIC_VIEWS.includes(initial.view)) {
      setView("landing");
    }
  }, []);

  // Keep the address bar in sync with the view + reset scroll on navigation.
  useEffect(() => {
    const path = pathForView(view, selection?.surah);
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
    window.scrollTo(0, 0);
  }, [view, selection]);

  // Handle the browser back / forward buttons.
  useEffect(() => {
    const onPop = () => {
      const r = pathToView(window.location.pathname);
      if (r.view === "surah" && r.surah) {
        openSurahByNumber(r.surah);
      } else {
        setSelection(null);
        setView(r.view as View);
      }
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const nav = (v: View) => setView(v);
  const goRecite = (s: Selection) => { setSelection(s); setView("recite"); };
  const goSurah = (s: Surah) => { setSelection({ scope: "surah", surah: s.number, ayah: null, juz: null, text: "", label: s.name }); setView("surah"); };
  const startPractice = (surah: number, ayah: number) => {
    setSelection({ scope: "ayah", surah, ayah, juz: null, text: "", label: `${surah}:${ayah}` });
    setView("practice");
  };
  const toggleLang = () => { const n = lang === "en" ? "ar" : "en"; setLang(n); setLangState(n); };
  const logout = () => { clearToken(); setProfile(null); setView("landing"); };
  const onAuthed = async () => {
    const p = await api.getProfile();
    setProfile(p);
    setView(p.consent_ok ? "home" : "onboarding");
  };

  switch (view) {
    case "login": return <LoginPage nav={nav} onAuthed={onAuthed} />;
    case "register": return <RegisterPage nav={nav} onAuthed={onAuthed} />;
    case "forgot": return <ForgotPage nav={nav} />;
    case "onboarding": return <OnboardingPage nav={nav} profile={profile} onDone={(p) => { setProfile(p); setView("home"); }} />;
    case "browse": return <BrowsePage nav={nav} profile={profile} onOpenSurah={goSurah} lang={lang} onToggleLang={toggleLang} onLogout={logout} />;
    case "surah": return selection ? <SurahPage nav={nav} sel={selection} onRecite={goRecite} profile={profile} lang={lang} onToggleLang={toggleLang} onLogout={logout} /> : <BrowsePage nav={nav} profile={profile} onOpenSurah={goSurah} lang={lang} onToggleLang={toggleLang} onLogout={logout} />;
    case "recite": return selection ? <RecitePage nav={nav} sel={selection} /> : <BrowsePage nav={nav} profile={profile} onOpenSurah={goSurah} lang={lang} onToggleLang={toggleLang} onLogout={logout} />;
    case "recordings": return <RecordingsPage nav={nav} profile={profile} lang={lang} onToggleLang={toggleLang} onLogout={logout} />;
    case "assignments": return <AssignmentsPage nav={nav} profile={profile} onRecite={goRecite} lang={lang} onToggleLang={toggleLang} onLogout={logout} />;
    case "leaderboard": return <LeaderboardPage nav={nav} profile={profile} lang={lang} onToggleLang={toggleLang} onLogout={logout} />;
    case "profile": return <ProfilePage nav={nav} profile={profile} lang={lang} onToggleLang={toggleLang} onLogout={logout} />;
    case "learn": return <LearnHome nav={nav} profile={profile} lang={lang} onToggleLang={toggleLang} onLogout={logout} onPractice={() => startPractice(1, 1)} />;
    case "learnBrowse": return <LearnBrowse nav={nav} profile={profile} lang={lang} onToggleLang={toggleLang} onLogout={logout} onPractice={(n) => startPractice(n, 1)} />;
    case "practice": return selection ? <PracticeFlow nav={nav} sel={selection} onShare={(s) => { setShare(s); setView("share"); }} /> : <LearnHome nav={nav} profile={profile} lang={lang} onToggleLang={toggleLang} onLogout={logout} onPractice={() => startPractice(1, 1)} />;
    case "progress": return <ProgressPage nav={nav} profile={profile} lang={lang} onToggleLang={toggleLang} onLogout={logout} />;
    case "review": return <ReviewPage nav={nav} />;
    case "donate": return <DonatePage nav={nav} />;
    case "privacy": return <LegalPage nav={nav} kind="privacy" />;
    case "terms": return <LegalPage nav={nav} kind="terms" />;
    case "challenge": return <ChallengePage nav={nav} />;
    case "share": return <SharePage nav={nav} share={share} />;
    case "about": return <AboutPage nav={nav} />;
    case "home": return <HomePage nav={nav} profile={profile} onRecite={goRecite} lang={lang} onToggleLang={toggleLang} onLogout={logout} />;
    default: return <LandingPage nav={nav} />;
  }
}

function AuthShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="auth-wrap">
      <div className="pattern-overlay" />
      <span className="spark" style={{ top: 60, right: 120, fontSize: 26 }}>✦</span>
      <span className="spark" style={{ bottom: 100, left: 100, fontSize: 20 }}>✦</span>
      <div className="auth-logo">
        <Crescent size={56} />
        <div className="ar" style={{ fontSize: 30, color: "var(--gold-300)" }}>تلاوة</div>
      </div>
      <div className="auth-card" style={{ maxWidth: wide ? 460 : 420 }}>{children}</div>
      <div className="ar" style={{ marginTop: 28, fontSize: 16, color: "rgba(212,169,74,.85)", position: "relative" }}>وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div>
    </div>
  );
}

function LoginPage({ nav, onAuthed }: { nav: (v: View) => void; onAuthed: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const r = await api.login(email, password); setToken(r.access_token); await onAuthed(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <AuthShell>
      <div className="glass-card arch-card" style={{ padding: "64px 40px 40px" }}>
        <div className="eyebrow">Welcome back</div>
        <h1 className="rk" style={{ fontSize: 28, color: "#f7f1e3", margin: "0 0 28px" }}>Sign in to Tilawah</h1>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
          <div><div className="field-label">Email</div><input className="input" aria-label="Email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <div className="field-label" style={{ marginBottom: 0 }}>Password</div>
              <a href="#" onClick={(e) => { e.preventDefault(); nav("forgot"); }} style={{ fontSize: 12, fontWeight: 600 }}>Forgot?</a>
            </div>
            <input className="input" aria-label="Password" type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div style={{ color: "var(--red-light)", fontSize: 13 }}>{error}</div>}
          <button className="btn btn-lg btn-gold" disabled={busy} style={{ marginTop: 8, width: "100%" }}>{busy ? "Signing in…" : "Sign in"}</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "6px 0" }}>
            <div className="divider" style={{ flex: 1 }} /><span style={{ fontSize: 11, color: "rgba(247,241,227,.7)", letterSpacing: ".15em", textTransform: "uppercase" }}>or</span><div className="divider" style={{ flex: 1 }} />
          </div>
          <button type="button" className="btn btn-md btn-ghost" style={{ width: "100%" }}>Continue with Google</button>
        </form>
        <div style={{ marginTop: 26, fontSize: 13, color: "rgba(247,241,227,.6)" }}>
          New to Tilawah? <a href="#" onClick={(e) => { e.preventDefault(); nav("register"); }} style={{ fontWeight: 700 }}>Create an account</a>
        </div>
      </div>
    </AuthShell>
  );
}

function RegisterPage({ nav, onAuthed }: { nav: (v: View) => void; onAuthed: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState("beginner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const r = await api.register(email, password, name); setToken(r.access_token); await api.updateProfile({ tajweed_level: level }); await onAuthed(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <AuthShell wide>
      <div className="glass-card arch-card-wide" style={{ padding: "66px 42px 40px" }}>
        <div className="eyebrow">Join the mission</div>
        <h1 className="rk" style={{ fontSize: 28, color: "#f7f1e3", margin: "0 0 8px" }}>Create your account</h1>
        <p style={{ fontSize: 13, color: "rgba(247,241,227,.6)", lineHeight: 1.6, margin: "0 0 26px" }}>Lend your voice to the Quran collection — every recitation counts.</p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
          <div><div className="field-label">Full name</div><input className="input" aria-label="Full name" placeholder="Inaam Ahmed" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><div className="field-label">Email</div><input className="input" aria-label="Email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><div className="field-label">Password</div><input className="input" aria-label="Password" type="password" required placeholder="8+ characters" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div>
            <div className="field-label">Recitation experience</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["beginner", "Beginner"], ["hafiz", "Hafiz"], ["qari", "Qari"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setLevel(v)} className={level === v ? "btn btn-sm btn-gold" : "btn btn-sm btn-ghost"} style={{ flex: 1 }}>{l}</button>
              ))}
            </div>
          </div>
          {error && <div style={{ color: "var(--red-light)", fontSize: 13 }}>{error}</div>}
          <button className="btn btn-lg btn-gold" disabled={busy} style={{ marginTop: 8, width: "100%" }}>{busy ? "Creating…" : "Create account"}</button>
          <div style={{ fontSize: 11, color: "rgba(247,241,227,.7)", textAlign: "center", lineHeight: 1.6 }}>
            By joining you agree to our <a href="#" onClick={(e) => { e.preventDefault(); nav("terms"); }}>Terms</a> and <a href="#" onClick={(e) => { e.preventDefault(); nav("privacy"); }}>Privacy Policy</a>.
          </div>
        </form>
        <div style={{ marginTop: 22, fontSize: 13, color: "rgba(247,241,227,.6)" }}>
          Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); nav("login"); }} style={{ fontWeight: 700 }}>Sign in</a>
        </div>
      </div>
    </AuthShell>
  );
}

function ForgotPage({ nav }: { nav: (v: View) => void }) {
  const [sent, setSent] = useState(false);
  return (
    <AuthShell>
      <div className="glass-card arch-card" style={{ padding: "64px 40px 40px" }}>
        <div style={{ width: 54, height: 54, margin: "0 auto 16px", borderRadius: "50%", background: "rgba(212,169,74,.15)", border: "1px solid rgba(212,169,74,.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🔑</div>
        <h1 className="rk" style={{ fontSize: 26, color: "#f7f1e3", margin: "0 0 8px" }}>Forgot your password?</h1>
        <p style={{ fontSize: 13, color: "rgba(247,241,227,.6)", lineHeight: 1.65, margin: "0 0 26px" }}>{sent ? "If an account exists for that email, a reset link is on its way." : "Enter your email and we'll send you a link to reset it."}</p>
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
          <div><div className="field-label">Email</div><input className="input" aria-label="Email" type="email" required placeholder="you@example.com" /></div>
          <button className="btn btn-lg btn-gold" style={{ width: "100%" }}>Send reset link</button>
        </form>
        <div style={{ marginTop: 26, fontSize: 13, color: "rgba(247,241,227,.6)" }}><a href="#" onClick={(e) => { e.preventDefault(); nav("login"); }} style={{ fontWeight: 700 }}>← Back to sign in</a></div>
      </div>
    </AuthShell>
  );
}

const RIWAYAHS = [
  { name: "Hafs 'an 'Asim", desc: "The most widely recited riwayah worldwide", ar: "حفص" },
  { name: "Warsh 'an Nafi'", desc: "Common across North and West Africa", ar: "ورش" },
  { name: "Qalun 'an Nafi'", desc: "Recited in Libya and parts of Tunisia", ar: "قالون" },
];

function OnboardingPage({ nav, profile, onDone }: { nav: (v: View) => void; profile: QariProfile | null; onDone: (p: QariProfile) => void }) {
  const [step, setStep] = useState(1);
  const [qiraah, setQiraah] = useState(0);
  const [micLive, setMicLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = profile?.name || profile?.email?.split("@")[0] || "Qari";

  async function finish() {
    setBusy(true);
    try { onDone(await api.updateProfile({ qiraah: RIWAYAHS[qiraah].name, consent_ok: true })); }
    catch { setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="pattern-overlay" />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, marginBottom: 34 }}>
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, background: step >= n ? "var(--gold-grad)" : "rgba(247,241,227,.07)", color: step >= n ? "var(--green-950)" : "rgba(247,241,227,.6)", border: "1px solid rgba(212,169,74,.5)" }}>
              {step > n ? "✓" : n}
            </div>
            {n < 3 && <div style={{ width: 44, height: 2, background: step > n ? "var(--gold-500)" : "rgba(212,169,74,.3)", borderRadius: 2 }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div style={{ position: "relative", width: "100%", maxWidth: 520, textAlign: "center" }} className="fade-up">
          <div className="ar" style={{ fontSize: 24, color: "var(--gold-500)", marginBottom: 8 }}>أهلاً وسهلاً</div>
          <h1 className="rk" style={{ fontSize: 32, color: "#f7f1e3", margin: "0 0 8px" }}>Welcome, {name}</h1>
          <p style={{ fontSize: 14, color: "rgba(247,241,227,.65)", lineHeight: 1.7, margin: "0 0 30px" }}>Which riwayah (recitation style) do you recite in? Most reciters use Hafs.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {RIWAYAHS.map((r, i) => (
              <button key={r.name} onClick={() => setQiraah(i)} style={{ background: i === qiraah ? "rgba(212,169,74,.16)" : "rgba(247,241,227,.05)", border: `1px solid ${i === qiraah ? "var(--gold-500)" : "rgba(212,169,74,.35)"}`, color: "#f7f1e3", borderRadius: 16, padding: "18px 24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left", fontFamily: "var(--font-body)" }}>
                <span><span style={{ fontWeight: 800, fontSize: 15, display: "block" }}>{r.name}</span><span style={{ fontSize: 12, opacity: .6 }}>{r.desc}</span></span>
                <span className="ar" style={{ fontSize: 22, color: "var(--gold-300)" }}>{r.ar}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-lg btn-gold" style={{ marginTop: 26 }} onClick={() => setStep(2)}>Continue →</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ position: "relative", width: "100%", maxWidth: 520, textAlign: "center" }} className="fade-up">
          <h1 className="rk" style={{ fontSize: 32, color: "#f7f1e3", margin: "0 0 8px" }}>Test your microphone</h1>
          <p style={{ fontSize: 14, color: "rgba(247,241,227,.65)", margin: "0 0 30px" }}>Recite anything — we'll check your audio levels.</p>
          <div className="glass-card arch-card-sm" style={{ padding: "44px 30px 34px" }}>
            <button onClick={() => setMicLive(!micLive)} className="crescent" style={{ width: 84, height: 84, background: micLive ? "linear-gradient(135deg,#e05252,#f08c8c)" : "var(--gold-grad)", cursor: "pointer", fontSize: 30 }}><span>{micLive ? "◼" : "🎙"}</span></button>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 40, justifyContent: "center", marginTop: 24 }}>
              {[40, 70, 55, 90, 65, 80, 45, 95, 60, 75, 50, 85, 70, 60, 45, 80].map((h, i) => (
                <span key={i} style={{ width: 3, height: 18, display: "inline-flex", alignItems: "flex-end", overflow: "hidden" }}>
                  <span style={{ width: 3, display: "block", borderRadius: 2, background: micLive ? "var(--gold-500)" : "rgba(212,169,74,.35)", height: micLive ? `${h}%` : "18%", animation: micLive ? `eq ${0.6 + (i % 4) * 0.15}s ${i * 0.05}s ease-in-out infinite` : "none" }} />
                </span>
              ))}
            </div>
            <div className="rk" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: micLive ? "var(--green-300)" : "rgba(247,241,227,.5)", marginTop: 16 }}>
              {micLive ? "Levels look great — clear and strong" : "Tap the mic to test"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
            <button className="btn btn-md btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-md btn-gold" onClick={() => { setMicLive(false); setStep(3); }}>Continue →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ position: "relative", width: "100%", maxWidth: 600, textAlign: "center" }} className="fade-up">
          <h1 className="rk" style={{ fontSize: 32, color: "#f7f1e3", margin: "0 0 8px" }}>Your first ayah</h1>
          <p style={{ fontSize: 14, color: "rgba(247,241,227,.65)", margin: "0 0 26px" }}>Start with the Basmalah — recite it slowly and clearly.</p>
          <div className="glass-card arch-card-sm" style={{ padding: "48px 34px 30px", marginBottom: 28 }}>
            <div className="ar" style={{ fontSize: 40, lineHeight: 1.9, color: "#f7f1e3", direction: "rtl" }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>
            <div style={{ fontSize: 13, fontStyle: "italic", color: "rgba(247,241,227,.6)", marginTop: 12 }}>"In the name of Allah, the Entirely Merciful, the Especially Merciful."</div>
          </div>
          <button className="btn btn-lg btn-gold" disabled={busy} onClick={finish} style={{ width: "100%" }}>{busy ? "Saving…" : "🎙 Start reciting"}</button>
          <div style={{ marginTop: 16 }}><a href="#" onClick={(e) => { e.preventDefault(); nav("home"); }} style={{ fontSize: 13, color: "rgba(247,241,227,.55)" }}>Skip for now — go to home</a></div>
        </div>
      )}
    </div>
  );
}

function nextPrayerLabel(): string {
  const times: [string, number, number][] = [["Fajr", 4, 40], ["Dhuhr", 12, 25], ["Asr", 15, 48], ["Maghrib", 18, 49], ["Isha", 20, 19]];
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  for (const [name, h, m] of times) {
    const t = h * 60 + m;
    if (t > mins) {
      const d = t - mins;
      return `${name} in ${d >= 60 ? Math.floor(d / 60) + "h " + (d % 60) + "m" : d + "m"}`;
    }
  }
  return "Fajr soon";
}

function HomePage({ nav, profile, onRecite, lang, onToggleLang, onLogout }: { nav: (v: View) => void; profile: QariProfile | null; onRecite: (s: Selection) => void; lang: Lang; onToggleLang: () => void; onLogout: () => void }) {
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [board, setBoard] = useState<{ name: string; points: number }[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.coverage().then(setCoverage).catch(() => {}); api.leaderboard().then(setBoard).catch(() => {}); }, []);

  async function reciteNext() {
    setBusy(true);
    try {
      const v = await api.nextVerse();
      onRecite({ scope: "ayah", surah: v.surah, ayah: v.ayah, juz: null, text: v.text, label: `${v.surah}:${v.ayah}` });
    } catch { setBusy(false); }
  }

  return (
    <div className="surface-light">
      <NavBar links={QARI_LINKS} active="home" onNav={nav} user={profile?.name || profile?.email} points={profile?.points} streak={profile?.streak} onLogout={onLogout} onToggleLang={onToggleLang} lang={lang}
        right={<button className="btn btn-sm btn-dark" onClick={() => nav("learn")}>Learn</button>} />

      <div className="pagehead" style={{ textAlign: "center" }}>
        <div className="pattern-overlay" />
        <div className="inner" style={{ padding: "clamp(48px, 10vw, 84px) 20px 80px" }}>
          <div className="ar" style={{ fontSize: 30, color: "var(--gold-500)", marginBottom: 12 }}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <h1 className="rk" style={{ fontSize: 36, color: "#f7f1e3", margin: "0 0 12px" }}>Every verse counts</h1>
          <p style={{ color: "rgba(247,241,227,.65)", fontSize: 15, maxWidth: 440, margin: "0 auto 30px", lineHeight: 1.65 }}>6,236 verses. 5 qaris each. Your voice brings the collection one recitation closer.</p>
          <button className="btn btn-lg btn-gold btn-gold-pulse" disabled={busy} onClick={reciteNext}>{busy ? "Finding…" : "🎙 Start reciting"}</button>
        </div>
      </div>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "50px 28px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {coverage && (
            <div className="card" style={{ padding: "30px 34px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h2 className="rk" style={{ fontSize: 22, color: "var(--ink-dark)", margin: 0 }}>Collection progress</h2>
                <span className="pill pill-gold">{Math.round((coverage.covered_ayahs / coverage.total_ayahs) * 100)}% complete</span>
              </div>
              <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(100, (coverage.covered_ayahs / coverage.total_ayahs) * 100)}%` }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(120px, 100%), 1fr))", gap: 16, marginTop: 22 }}>
                <Stat value={coverage.approved_samples} label="Approved" />
                <Stat value={coverage.covered_ayahs} label="Verses covered" />
                <Stat value={coverage.complete_ayahs} label="Fully collected" />
                <Stat value={`${coverage.target_per_ayah} qaris`} label="Target / verse" />
              </div>
            </div>
          )}
          <div className="card" style={{ padding: "30px 34px" }}>
            <h2 className="rk" style={{ fontSize: 22, color: "var(--ink-dark)", margin: "0 0 20px" }}>How it works</h2>
            <div className="grid-3">
              {[["1", "Pick a verse", "Browse 114 surahs or take your next assignment."], ["2", "Recite it", "Record clearly — our AI transcribes with diacritics."], ["3", "Get corrected", "Word-by-word feedback with tajweed rules."]].map(([n, t, d]) => (
                <div key={n}>
                  <div className="diamond" style={{ width: 36, height: 36, marginBottom: 12 }}><span>{n}</span></div>
                  <div className="rk" style={{ fontWeight: 700, color: "var(--ink-dark)", marginBottom: 4 }}>{t}</div>
                  <div style={{ fontSize: 13, color: "var(--muted-2)", lineHeight: 1.6 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card" style={{ padding: "22px 24px" }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Leaderboard</div>
            {board.length === 0 ? <div className="mut" style={{ fontSize: 13 }}>No points yet — be the first!</div> : (
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {board.slice(0, 5).map((e, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="rk" style={{ fontWeight: 700, color: "var(--gold-ink)", width: 22 }}>{i + 1}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{e.name}</span>
                    <span className="rk" style={{ color: "var(--gold-ink)", fontWeight: 700 }}>★ {e.points}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="card card-dark" style={{ padding: "22px 24px", background: "var(--dark-grad)", border: "1px solid rgba(212,169,74,.4)" }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Prayer times</div>
            <div className="rk" style={{ fontSize: 20, fontWeight: 700, color: "#f7f1e3" }}>{nextPrayerLabel()}</div>
            <div style={{ fontSize: 12, color: "rgba(247,241,227,.55)", marginTop: 6 }}>Makkah, Saudi Arabia</div>
          </div>
          <div className="card" style={{ padding: "22px 24px", textAlign: "center" }}>
            <div className="ar" style={{ fontSize: 22, color: "var(--gold-ink)", marginBottom: 8 }}>وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div>
            <div style={{ fontSize: 13, color: "var(--muted-2)", fontStyle: "italic" }}>"And recite the Quran with measured recitation." — Quran 73:4</div>
          </div>
        </div>
      </div>

      <Footer onNav={nav} />
    </div>
  );
}

function BrowsePage({ nav, profile, onOpenSurah, lang, onToggleLang, onLogout }: { nav: (v: View) => void; profile: QariProfile | null; onOpenSurah: (s: Surah) => void; lang: Lang; onToggleLang: () => void; onLogout: () => void }) {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [query, setQuery] = useState("");
  useEffect(() => { api.surahs().then(setSurahs).catch(() => {}); }, []);
  const filtered = surahs.filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.english_name.toLowerCase().includes(query.toLowerCase()) || String(s.number) === query);
  return (
    <div className="surface-light">
      <NavBar links={QARI_LINKS} active="browse" onNav={nav} user={profile?.name || profile?.email} points={profile?.points} streak={profile?.streak} onLogout={onLogout} onToggleLang={onToggleLang} lang={lang} />
      <PageHead>
        <div className="center" style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="ar" style={{ fontSize: 24, color: "var(--gold-500)", marginBottom: 8 }}>ٱقْرَأْ بِٱسْمِ رَبِّكَ</div>
          <h1 className="rk" style={{ fontSize: "clamp(30px, 6vw, 40px)", color: "#f7f1e3", margin: "0 0 10px" }}>Browse the Quran</h1>
          <p style={{ color: "rgba(247,241,227,.65)", fontSize: 15, margin: "0 0 24px" }}>114 surahs · 6,236 verses — find the verse that needs your voice.</p>
          <input className="input" aria-label="Search surah" placeholder="Search surah…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 420, margin: "0 auto" }} />
        </div>
      </PageHead>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 28px 70px" }}>
        <div className="grid-3">
          {filtered.map((s) => (
            <a key={s.number} href="#" onClick={(e) => { e.preventDefault(); onOpenSurah(s); }} className="card card-hover" style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, color: "inherit" }}>
              <div className="diamond"><span>{s.number}</span></div>
              <div className="verse-text">
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ink-dark)" }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{s.english_name} · {s.ayah_count} verses</div>
                <div className="bar-thin"><div className="bar-fill" style={{ width: "8%" }} /></div>
              </div>
              <span className="ar" style={{ fontSize: 22, color: "var(--gold-ink)", flexShrink: 0 }}>{s.name.includes("Al-Fatihah") ? "الفاتحة" : s.name.includes("Ikhlas") ? "الإخلاص" : "سورة"}</span>
            </a>
          ))}
        </div>
      </div>
      <Footer onNav={nav} />
    </div>
  );
}

const SURAH_NAMES: Record<number, string> = { 1: "الفاتحة", 2: "البقرة", 112: "الإخلاص", 114: "الناس" };

function SurahPage({ nav, sel, onRecite, profile, lang, onToggleLang, onLogout }: { nav: (v: View) => void; sel: Selection; onRecite: (s: Selection) => void; profile: QariProfile | null; lang: Lang; onToggleLang: () => void; onLogout: () => void }) {
  const [ayahs, setAyahs] = useState<Verse[]>([]);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  useEffect(() => { if (sel.surah) api.surahAyahs(sel.surah).then(setAyahs).catch(() => {}); }, [sel.surah]);
  return (
    <div className="surface-light">
      <NavBar links={QARI_LINKS} active="browse" onNav={nav} user={profile?.name || profile?.email} points={profile?.points} streak={profile?.streak} onLogout={onLogout} onToggleLang={onToggleLang} lang={lang} />
      <PageHead>
        <div className="center" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="ar" style={{ fontSize: "clamp(30px, 7vw, 40px)", color: "var(--gold-500)", marginBottom: 8 }}>{SURAH_NAMES[sel.surah || 1] || "سورة"}</div>
          <h1 className="ar" style={{ fontSize: 40, lineHeight: 1.7, color: "#f7f1e3", margin: "0 0 8px" }}>{sel.label}</h1>
          <div style={{ color: "rgba(247,241,227,.6)", fontSize: 13 }}>{ayahs.length} verses · target 5 qaris per verse</div>
        </div>
      </PageHead>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 28px 60px", display: "flex", flexDirection: "column", gap: 14 }}>
        {ayahs.map((a) => (
          <div key={a.ayah} className="card card-hover verse-row">
            <div className="diamond"><span>{a.ayah}</span></div>
            <div className="verse-text">
              <div className="ar" style={{ fontSize: 24, lineHeight: 1.8, color: "var(--ink-dark)", direction: "rtl", textAlign: "right" }}>{a.text}</div>
            </div>
            <div className="verse-slots">
              {[0, 1, 2, 3, 4].map((j) => <span key={j} className={`slot ${j < (a.sample_count || 0) ? "slot-gold" : "slot-empty"}`} />)}
            </div>
            <button className="btn btn-sm btn-ghost-light" onClick={() => { const key = `${a.surah}:${a.ayah}`; if (playingKey === key) { stopVerse(); setPlayingKey(null); } else playVerse(a.surah, a.ayah, "Alafasy_128kbps", (f) => setPlayingKey(f ? key : null)); }}>{playingKey === `${a.surah}:${a.ayah}` ? "⏸ Stop" : "▶ Listen"}</button>
            <button className="btn btn-sm btn-dark" onClick={() => onRecite({ scope: "ayah", surah: sel.surah, ayah: a.ayah, juz: null, text: a.text, label: `${sel.surah}:${a.ayah}` })}>🎙 Recite</button>
          </div>
        ))}
        {ayahs.length === 0 && <div className="center mut" style={{ padding: 40 }}>Loading verses…</div>}
      </div>
      <Footer onNav={nav} />
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve((r.result as string).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function RecitePage({ nav, sel }: { nav: (v: View) => void; sel: Selection }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Recitation | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const STAGES = ["Uploading your recitation…", "Transcribing with AI…", "Matching to the verse…", "Checking tajweed rules…"];
  const TIPS = ["وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا", "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ", "إِنَّ مَعَ الْعُسْرِ يُسْرًا"];

  useEffect(() => {
    if (!recording) return;
    setElapsed(0);
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (!busy) { setPhase(0); return; }
    const id = setInterval(() => setPhase((p) => (p + 1) % STAGES.length), 2400);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  async function start() {
    setError(""); setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setBusy(true);
        try {
          const b64 = await blobToBase64(new Blob(chunks.current, { type: "audio/webm" }));
          setResult(await api.submit(sel.scope, sel.surah, sel.ayah, sel.juz, b64));
        } catch (err) { setError((err as Error).message); }
        finally { setBusy(false); }
      };
      recRef.current = rec; rec.start(); setRecording(true);
    } catch { setError("Microphone access denied. Please allow mic access."); }
  }
  function stop() { recRef.current?.stop(); setRecording(false); }

  const score = result?.match_score != null ? Math.round(result.match_score * 100) : null;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="surface-dark" style={{ display: "flex", flexDirection: "column" }}>
      <div className="pattern-overlay" />
      <div style={{ position: "relative", zIndex: 5, maxWidth: 1100, width: "100%", margin: "0 auto", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); nav("browse"); }} className="rk" style={{ fontWeight: 700, fontSize: 14, color: "rgba(247,241,227,.9)" }}>← Browse</a>
        <div className="center">
          <div className="rk" style={{ fontSize: 18, fontWeight: 700, color: "#f7f1e3" }}>{sel.label}</div>
          <div style={{ fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color: "rgba(247,241,227,.85)", fontWeight: 700 }}>Recite slowly & clearly</div>
        </div>
        <a href="#" onClick={(e) => { e.preventDefault(); nav("home"); }} className="rk" style={{ fontWeight: 700, fontSize: 14, color: "rgba(247,241,227,.9)" }}>Home</a>
      </div>

      <div style={{ position: "relative", zIndex: 5, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: "10px 28px 40px" }}>
        <div className="glass-card arch-card-sm fade-up" style={{ maxWidth: 860, width: "100%", padding: "26px 30px" }}>
          <div className="pill pill-gold" style={{ marginBottom: 12 }}>{sel.label}</div>
          <div className="ar" style={{ fontSize: "clamp(28px, 6vw, 40px)", lineHeight: 1.9, color: "#f7f1e3", direction: "rtl" }}>{sel.text}</div>
        </div>

        {!result ? (
          busy ? (
            <div className="center fade-up" style={{ maxWidth: 560, width: "100%" }}>
              <div style={{ position: "relative", width: 92, height: 92, margin: "0 auto 26px" }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(212,169,74,.5)", animation: "ringPulse 1.8s ease-out infinite" }} />
                <span style={{ position: "absolute", inset: 12, borderRadius: "50%", border: "2px solid rgba(212,169,74,.35)", animation: "ringPulse 1.8s ease-out .6s infinite" }} />
                <div style={{ position: "absolute", inset: 18, borderRadius: "50%", background: "var(--gold-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🌙</div>
              </div>
              <h2 className="rk" style={{ fontSize: 24, color: "#f7f1e3", margin: "0 0 6px" }}>{STAGES[phase]}</h2>
              <p style={{ fontSize: 14, color: "rgba(247,241,227,.85)", margin: "0 0 24px" }}>First checks can take a little longer — hang tight.</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 26 }}>
                {STAGES.map((s, i) => (
                  <span key={s} style={{ width: i === phase ? 26 : 8, height: 8, borderRadius: 99, background: i === phase ? "var(--gold-500)" : "rgba(247,241,227,.15)", transition: "all .3s" }} />
                ))}
              </div>
              <div className="glass-card" style={{ padding: "18px 22px", borderRadius: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>While you wait</div>
                <div className="ar" style={{ fontSize: 20, color: "var(--gold-300)", direction: "rtl", lineHeight: 1.9 }}>{TIPS[phase % TIPS.length]}</div>
              </div>
            </div>
          ) : (
            <div className="center fade-up" style={{ maxWidth: 860, width: "100%" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, height: 40, marginBottom: 22 }}>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <span key={i} style={{ width: 5, height: "100%", borderRadius: 99, background: recording ? "var(--gold-grad)" : "rgba(247,241,227,.15)", transformOrigin: "bottom", animation: recording ? `eq 1s ease-in-out ${i * 0.1}s infinite` : "none" }} />
                ))}
              </div>

              <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto" }}>
                {recording && <span style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "2px solid var(--red-light)", animation: "ringPulse 1.6s ease-out infinite" }} />}
                <button className="crescent" style={{ width: 96, height: 96, cursor: "pointer", fontSize: 34, background: recording ? "linear-gradient(135deg,#e05252,#f08c8c)" : "var(--gold-grad)", position: "relative", animation: recording ? "glowPulse 2s ease-in-out infinite" : "none" }} onClick={recording ? stop : start}>
                  <span>{recording ? "◼" : "🎙"}</span>
                </button>
              </div>

              <div className="rk" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: recording ? "var(--red-light)" : "rgba(247,241,227,.85)", marginTop: 20 }}>
                {recording ? `${fmt(elapsed)} · Recording… tap to stop` : "Tap to record"}
              </div>
              <div style={{ fontSize: 14, color: "rgba(247,241,227,.8)", marginTop: 8 }}>{recording ? "Recite slowly and clearly — every word will be checked." : "Allow microphone access, then recite the verse above."}</div>
              {error && <div style={{ color: "var(--red-light)", marginTop: 14, fontSize: 14 }}>{error}</div>}
            </div>
          )
        ) : (
          <div className="glass-card fade-up" style={{ maxWidth: 760, width: "100%", padding: "34px 40px", borderRadius: 24 }}>
            <div className="center" style={{ marginBottom: 22 }}>
              <div style={{ width: 96, height: 96, margin: "0 auto 14px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, background: score != null && score >= 90 ? "var(--green-grad)" : score != null && score >= 60 ? "var(--gold-grad)" : "linear-gradient(135deg,#e05252,#f08c8c)", color: score != null ? "var(--green-950)" : "#f7f1e3", boxShadow: "0 12px 34px rgba(201,153,43,.35)" }}>
                {score != null ? `${score}%` : "—"}
              </div>
              <h2 className="rk" style={{ fontSize: 26, color: "#f7f1e3", margin: "0 0 6px" }}>JazakAllah khair!</h2>
              <p style={{ fontSize: 14, color: "rgba(247,241,227,.85)", maxWidth: 440, margin: "0 auto", lineHeight: 1.6 }}>{result.summary || "Keep going — every recitation counts."}</p>
            </div>

            {result.transcript && (
              <div style={{ marginBottom: 18, background: "rgba(247,241,227,.04)", border: "1px solid rgba(212,169,74,.25)", borderRadius: 14, padding: "14px 18px" }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>What we heard</div>
                <div className="ar" style={{ fontSize: 20, color: "rgba(247,241,227,.85)", direction: "rtl", lineHeight: 1.9 }}>{result.transcript}</div>
              </div>
            )}

            {result.errors && result.errors.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.errors.slice(0, 8).map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, background: "rgba(247,241,227,.04)", borderRadius: 10, padding: "8px 12px", flexWrap: "wrap" }}>
                    <span className={e.error_type === "deletion" ? "pill pill-red" : e.error_type === "insertion" ? "pill pill-green" : "pill pill-gold"} style={{ textTransform: "none", letterSpacing: 0 }}>{e.error_type}</span>
                    {e.expected && <b className="ar" style={{ color: "#f7f1e3", fontSize: 16 }}>{e.expected}</b>}
                    {e.expected && e.recognized && <span style={{ color: "rgba(247,241,227,.7)" }}>→</span>}
                    {e.recognized && <span className="ar" style={{ color: "var(--red-light)", fontSize: 16 }}>{e.recognized}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="center" style={{ padding: "8px 0 2px", color: "var(--green-300)", fontSize: 14, fontWeight: 700 }}>✓ No mistakes detected — Masha'Allah!</div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
              <button className="btn btn-md btn-ghost" onClick={() => { setResult(null); setError(""); }}>🔁 Recite again</button>
              <button className="btn btn-md btn-gold" onClick={() => nav("recordings")}>View recordings</button>
              <button className="btn btn-md btn-ghost" onClick={() => nav("home")}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function pillFor(status: string): [string, string] {
  if (status === "approved") return ["pill-green", "Approved ✓"];
  if (status === "rejected") return ["pill-red", "Re-record"];
  return ["pill-gold", "Pending review"];
}

function RecordingsPage({ nav, profile, lang, onToggleLang, onLogout }: { nav: (v: View) => void; profile: QariProfile | null; lang: Lang; onToggleLang: () => void; onLogout: () => void }) {
  const [items, setItems] = useState<Recitation[]>([]);
  useEffect(() => { api.mine().then(setItems).catch(() => {}); }, []);
  return (
    <div className="surface-light">
      <NavBar links={QARI_LINKS} active="recordings" onNav={nav} user={profile?.name || profile?.email} points={profile?.points} streak={profile?.streak} onLogout={onLogout} onToggleLang={onToggleLang} lang={lang} />
      <PageHead>
        <div className="center">
          <div className="ar" style={{ fontSize: 24, color: "var(--gold-500)", marginBottom: 8 }}>تسجيلاتي</div>
          <h1 className="rk" style={{ fontSize: 36, color: "#f7f1e3", margin: "0 0 8px" }}>My recordings</h1>
          <div style={{ color: "rgba(247,241,227,.6)", fontSize: 14 }}>{items.length} submissions · {items.filter((r) => r.status === "approved").length} approved</div>
        </div>
      </PageHead>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 28px 70px", display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((r) => {
          const [pc, pl] = pillFor(r.status);
          return (
            <div key={r.id} className="card" style={{ padding: "20px 26px", display: "flex", alignItems: "center", gap: 18 }}>
              <div className="diamond"><span>{r.surah}</span></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ink-dark)" }}>{r.scope === "surah" ? `Surah ${r.surah}` : r.scope === "juz" ? `Juz ${r.juz}` : `Ayah ${r.surah}:${r.ayah}`}</div>
                <div className="mut" style={{ fontSize: 12 }}>{r.created_at ? new Date(r.created_at).toLocaleString() : ""} · {r.match_score != null ? Math.round(r.match_score * 100) + "%" : "—"}</div>
              </div>
              <span className={`pill ${pc}`}>{pl}</span>
            </div>
          );
        })}
        {items.length === 0 && <div className="center mut" style={{ padding: 40 }}>You haven't recorded anything yet — <a href="#" onClick={(e) => { e.preventDefault(); nav("browse"); }}>browse surahs</a> to start.</div>}
      </div>
      <Footer onNav={nav} />
    </div>
  );
}

function AssignmentsPage({ nav, profile, onRecite, lang, onToggleLang, onLogout }: { nav: (v: View) => void; profile: QariProfile | null; onRecite: (s: Selection) => void; lang: Lang; onToggleLang: () => void; onLogout: () => void }) {
  const [items, setItems] = useState<{ id: number; scope: string; surah: number | null; ayah: number | null; juz: number | null; status: string }[]>([]);
  useEffect(() => { api.myAssignments().then(setItems).catch(() => {}); }, []);
  async function recite(a: { scope: string; surah: number | null; ayah: number | null }) {
    const ayahs = await api.surahAyahs(a.surah ?? 1);
    const text = a.scope === "ayah" ? (ayahs.find((x) => x.ayah === a.ayah)?.text ?? "") : ayahs.map((x) => x.text).join(" ");
    onRecite({ scope: a.scope as "ayah" | "surah", surah: a.surah, ayah: a.ayah, juz: null, text, label: a.scope === "ayah" ? `${a.surah}:${a.ayah}` : `Surah ${a.surah}` });
  }
  return (
    <div className="surface-light">
      <NavBar links={QARI_LINKS} active="assignments" onNav={nav} user={profile?.name || profile?.email} points={profile?.points} streak={profile?.streak} onLogout={onLogout} onToggleLang={onToggleLang} lang={lang} />
      <PageHead>
        <div className="center">
          <div className="ar" style={{ fontSize: 24, color: "var(--gold-500)", marginBottom: 8 }}>المهام</div>
          <h1 className="rk" style={{ fontSize: 36, color: "#f7f1e3", margin: "0 0 8px" }}>Assignments</h1>
          <div style={{ color: "rgba(247,241,227,.6)", fontSize: 14 }}>Verses picked just for you by the review team.</div>
        </div>
      </PageHead>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 28px 70px" }}>
        <div className="grid-3">
          {items.map((a) => (
            <div key={a.id} className="card card-hover" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="ar" style={{ fontSize: 28, color: "var(--gold-ink)" }}>{a.scope === "juz" ? "جزء" : "سورة"}</span>
                <span className="pill pill-gold">{a.scope === "surah" ? `Surah ${a.surah}` : a.scope === "juz" ? `Juz ${a.juz}` : `${a.surah}:${a.ayah}`}</span>
              </div>
              <div className="rk" style={{ fontSize: 19, fontWeight: 700, color: "var(--ink-dark)" }}>
                {a.scope === "surah" ? `Surah ${a.surah}` : a.scope === "juz" ? `Juz ${a.juz}` : `Ayah ${a.surah}:${a.ayah}`}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted-2)", lineHeight: 1.6 }}>Your voice is needed to complete this verse's qari collection.</div>
              <button className="btn btn-md btn-dark" style={{ marginTop: "auto" }} onClick={() => recite(a)}>🎙 Recite now</button>
            </div>
          ))}
        </div>
        {items.length === 0 && <div className="center mut" style={{ padding: 40 }}>No assignments yet — check back soon, or <a href="#" onClick={(e) => { e.preventDefault(); nav("browse"); }}>browse surahs</a>.</div>}
      </div>
      <Footer onNav={nav} />
    </div>
  );
}

function LeaderboardPage({ nav, profile, lang, onToggleLang, onLogout }: { nav: (v: View) => void; profile: QariProfile | null; lang: Lang; onToggleLang: () => void; onLogout: () => void }) {
  const [rows, setRows] = useState<{ name: string; points: number; streak: number }[]>([]);
  useEffect(() => { api.leaderboard().then(setRows).catch(() => {}); }, []);
  return (
    <div className="surface-light">
      <NavBar links={QARI_LINKS} active="leaderboard" onNav={nav} user={profile?.name || profile?.email} points={profile?.points} streak={profile?.streak} onLogout={onLogout} onToggleLang={onToggleLang} lang={lang} />
      <PageHead>
        <div className="center">
          <div className="ar" style={{ fontSize: 24, color: "var(--gold-500)", marginBottom: 8 }}>المتصدرون</div>
          <h1 className="rk" style={{ fontSize: 36, color: "#f7f1e3", margin: "0 0 8px" }}>Leaderboard</h1>
          <div style={{ color: "rgba(247,241,227,.6)", fontSize: 14 }}>The Ummah's most dedicated reciters this month.</div>
        </div>
      </PageHead>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 28px 70px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r, i) => {
            const you = r.name === (profile?.name || "");
            return (
              <div key={i} style={{ background: you ? "linear-gradient(150deg,#06201a,#0e4a3a)" : "var(--card)", border: `1px solid ${you ? "rgba(212,169,74,.7)" : "rgba(212,169,74,.32)"}`, borderRadius: 14, padding: "16px 22px", display: "flex", alignItems: "center", gap: 18 }}>
                <span className="rk" style={{ fontWeight: 700, fontSize: 16, color: "var(--gold-ink)", width: 36 }}>#{i + 1}</span>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>{r.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: you ? "var(--gold-300)" : "var(--ink-dark)" }}>{r.name}{you ? " (you)" : ""}</div>
                  <div className="mut" style={{ fontSize: 12 }}>🔥 {r.streak} day streak</div>
                </div>
                <span className="rk" style={{ fontWeight: 700, fontSize: 16, color: "var(--gold-ink)", width: 70, textAlign: "right" }}>★ {r.points}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Footer onNav={nav} />
    </div>
  );
}

function ProfilePage({ nav, profile, lang, onToggleLang, onLogout }: { nav: (v: View) => void; profile: QariProfile | null; lang: Lang; onToggleLang: () => void; onLogout: () => void }) {
  const name = profile?.name || profile?.email || "Qari";
  return (
    <div className="surface-light">
      <NavBar links={QARI_LINKS} active="profile" onNav={nav} user={name} points={profile?.points} streak={profile?.streak} onLogout={onLogout} onToggleLang={onToggleLang} lang={lang} />
      <PageHead>
        <div className="center">
          <div className="avatar" style={{ width: 84, height: 84, fontSize: 34, margin: "0 auto 16px" }}>{name[0]}</div>
          <h1 className="rk" style={{ fontSize: 32, color: "#f7f1e3", margin: "0 0 6px" }}>{name}</h1>
          <div className="rk" style={{ fontSize: 14, color: "var(--gold-300)" }}>★ {profile?.points ?? 0} points · 🔥 {profile?.streak ?? 0} day streak</div>
        </div>
      </PageHead>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 28px 70px" }}>
        <div className="grid-3" style={{ marginBottom: 24 }}>
          {[["🏅", "Top 10", "Reach leaderboard"], ["🌙", "Juz Amma", "Complete Juz 30"], ["🎙", "First surah", "Recite Al-Fatihah fully"]].map(([ic, t, d]) => (
            <div key={t} className="center" style={{ padding: "20px 10px", borderRadius: 14, background: "var(--card-warm)", border: "1px dashed rgba(212,169,74,.45)", opacity: .8 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>{ic}</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: "var(--ink-dark)" }}>{t}</div>
              <div className="mut" style={{ fontSize: 11 }}>{d}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "30px 34px", marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 20 }}>Account</div>
          {[["Email", profile?.email || "—"], ["Riwayah", profile?.qiraah || "Hafs 'an 'Asim"], ["Level", profile?.tajweed_level || "Beginner"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid rgba(212,169,74,.2)" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-dark)" }}>{k}</span>
              <span style={{ fontSize: 14, color: "var(--muted-2)" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "linear-gradient(150deg,#06201a,#0e4a3a)", borderRadius: 18, padding: "26px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
          <div>
            <div className="rk" style={{ fontSize: 17, fontWeight: 700, color: "#f7f1e3" }}>Support the mission</div>
            <div style={{ fontSize: 13, color: "rgba(247,241,227,.6)", marginTop: 4 }}>Help fund the Quran collection effort.</div>
          </div>
          <button className="btn btn-md btn-gold" onClick={() => nav("donate")}>🤲 Donate</button>
        </div>
      </div>
      <Footer onNav={nav} />
    </div>
  );
}

function ReviewPage({ nav }: { nav: (v: View) => void }) {
  const [items, setItems] = useState<Recitation[]>([]);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  useEffect(() => { api.adminQueue("pending").then(setItems).catch(() => setDenied(true)); }, []);
  const item = items[idx];
  async function act(status: string) {
    if (!item) return; setBusy(true);
    try { await api.review(item.id, status); setIdx((i) => i + 1); } catch {} finally { setBusy(false); }
  }
  return (
    <div className="surface-dark" style={{ display: "flex", flexDirection: "column" }}>
      <div className="pattern-overlay" />
      <div style={{ position: "relative", zIndex: 5, maxWidth: 1100, width: "100%", margin: "0 auto", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); nav("home"); }} className="rk" style={{ fontWeight: 700, fontSize: 14, color: "rgba(247,241,227,.8)", display: "inline-flex", alignItems: "center", minHeight: 24 }}>← Home</a>
        <div className="center">
          <div className="rk" style={{ fontSize: 18, fontWeight: 700, color: "#f7f1e3" }}>Review queue <span className="ar" style={{ color: "var(--gold-500)", fontSize: 22, marginLeft: 6 }}>المراجعة</span></div>
          <div style={{ fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color: "rgba(247,241,227,.75)", fontWeight: 700 }}>{denied ? "Restricted" : `${Math.max(0, items.length - idx)} recordings awaiting review`}</div>
        </div>
        <span className="rk" style={{ fontSize: 13, fontWeight: 700, color: "var(--gold-300)" }}>Reviewer mode</span>
      </div>
      <div style={{ position: "relative", zIndex: 5, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 28px 40px" }}>
        {item ? (
          <div className="glass-card fade-up" style={{ maxWidth: 720, width: "100%", padding: "38px 44px", borderRadius: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
              <div className="avatar" style={{ width: 46, height: 46, fontSize: 18 }}>{(item.transcript || "Q")[0]}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Recitation #{item.id}</div>
                <div className="mut" style={{ fontSize: 12 }}>{item.scope === "surah" ? `Surah ${item.surah}` : `${item.surah}:${item.ayah}`} · score {item.match_score != null ? Math.round(item.match_score * 100) + "%" : "—"}</div>
              </div>
            </div>
            <div className="ar" style={{ fontSize: 28, lineHeight: 1.9, color: "#f7f1e3", direction: "rtl", textAlign: "center", marginBottom: 20 }}>{item.transcript || "(no transcript)"}</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-md btn-gold" disabled={busy} onClick={() => act("approved")}>✓ Approve</button>
              <button className="btn btn-md" disabled={busy} style={{ background: "rgba(224,82,82,.18)", color: "var(--red-light)", border: "1px solid rgba(224,82,82,.4)" }} onClick={() => act("rejected")}>✕ Reject</button>
            </div>
          </div>
        ) : denied ? (
          <div className="center fade-up">
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
            <div className="rk" style={{ fontSize: 30, fontWeight: 600, color: "#f7f1e3", marginBottom: 8 }}>Reviewer access only</div>
            <div style={{ fontSize: 15, marginBottom: 26, color: "rgba(247,241,227,.72)" }}>This queue is open to approved reviewers. If you think you should have access, please get in touch.</div>
            <button className="btn btn-md btn-gold" onClick={() => nav("home")}>Back to home</button>
          </div>
        ) : (
          <div className="center fade-up">
            <div style={{ fontSize: 52, marginBottom: 16 }}>🌙</div>
            <div className="rk" style={{ fontSize: 30, fontWeight: 600, color: "#f7f1e3", marginBottom: 8 }}>Queue clear — JazakAllah khair!</div>
            <div style={{ fontSize: 15, marginBottom: 26, color: "rgba(247,241,227,.72)" }}>No more recordings to review.</div>
            <button className="btn btn-md btn-gold" onClick={() => nav("home")}>Back to home</button>
          </div>
        )}
      </div>
    </div>
  );
}

function LearnHome({ nav, profile, lang, onToggleLang, onLogout, onPractice }: { nav: (v: View) => void; profile: QariProfile | null; lang: Lang; onToggleLang: () => void; onLogout: () => void; onPractice: () => void }) {
  const path = ["بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ", "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ", "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ", "مَـٰلِكِ يَوْمِ ٱلدِّينِ", "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ", "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ"];
  return (
    <div className="surface-light">
      <NavBar links={LEARN_LINKS} active="learn" onNav={nav} learn user={profile?.name || profile?.email} points={profile?.points} streak={profile?.streak} onLogout={onLogout} onToggleLang={onToggleLang} lang={lang}
        right={<button className="btn btn-sm btn-ghost" onClick={() => nav("home")}>🎙 Qari mode</button>} />
      <PageHead learn>
        <div className="center" style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="eyebrow" style={{ color: "var(--green-300)" }}>Learn mode</div>
          <h1 className="rk" style={{ fontSize: 36, color: "#f7f1e3", margin: "8px 0 10px" }}>Master Al-Fatihah</h1>
          <p style={{ color: "rgba(247,241,227,.65)", fontSize: 15 }}>Listen, repeat, and get live tajweed feedback — one ayah at a time.</p>
          <button className="btn btn-lg btn-green" onClick={onPractice}>Continue learning →</button>
        </div>
      </PageHead>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 28px 70px" }}>
        <h2 className="rk" style={{ fontSize: 24, color: "var(--ink-dark)", margin: "0 0 18px" }}>Your learning path</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {path.map((ar, i) => {
            const done = i < 4, current = i === 4;
            return (
              <div key={i} style={{ background: current ? "var(--green-100)" : "var(--card-warm)", border: `1px solid ${current ? "rgba(24,122,94,.45)" : "rgba(212,169,74,.2)"}`, borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, background: done ? "var(--green-grad)" : "var(--card)", color: done ? "#f7f1e3" : "var(--muted)", border: current ? "2px solid var(--green-500)" : "1px solid rgba(212,169,74,.4)" }}>{done ? "✓" : i + 1}</div>
                <div className="ar" style={{ fontSize: 22, lineHeight: 1.7, color: "var(--ink-dark)", direction: "rtl", flex: 1, textAlign: "right" }}>{ar}</div>
                <span className="rk" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: done ? "var(--green-500)" : current ? "var(--gold-ink)" : "var(--muted)" }}>{done ? "Learned" : current ? "Today" : "Locked"}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Footer onNav={nav} learn />
    </div>
  );
}

function LearnBrowse({ nav, profile, lang, onToggleLang, onLogout, onPractice }: { nav: (v: View) => void; profile: QariProfile | null; lang: Lang; onToggleLang: () => void; onLogout: () => void; onPractice: (surah: number) => void }) {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  useEffect(() => { api.surahs().then(setSurahs).catch(() => {}); }, []);
  return (
    <div className="surface-light">
      <NavBar links={LEARN_LINKS} active="learnBrowse" onNav={nav} learn user={profile?.name || profile?.email} points={profile?.points} streak={profile?.streak} onLogout={onLogout} onToggleLang={onToggleLang} lang={lang}
        right={<button className="btn btn-sm btn-ghost" onClick={() => nav("home")}>🎙 Qari mode</button>} />
      <PageHead learn>
        <div className="center">
          <div className="eyebrow" style={{ color: "var(--green-300)" }}>Browse & learn</div>
          <h1 className="rk" style={{ fontSize: 36, color: "#f7f1e3", margin: "8px 0 8px" }}>Choose a surah</h1>
          <div style={{ color: "rgba(247,241,227,.6)", fontSize: 14 }}>Short surahs to build your confidence.</div>
        </div>
      </PageHead>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 28px 70px" }}>
        <div className="grid-3">
          {surahs.filter((s) => [1, 93, 94, 97, 103, 105, 106, 108, 110, 112, 113, 114].includes(s.number)).map((s) => (
            <a key={s.number} href="#" onClick={(e) => { e.preventDefault(); onPractice(s.number); }} className="card card-hover" style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, color: "inherit" }}>
              <div className="diamond" style={{ background: "linear-gradient(135deg,#e3f2ea,#f3faf6)", border: "1px solid rgba(24,122,94,.35)" }}><span style={{ color: "var(--green-500)" }}>{s.number}</span></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ink-dark)" }}>{s.name}</div>
                <div className="mut" style={{ fontSize: 12 }}>{s.ayah_count} verses</div>
              </div>
              <span className="pill pill-green">Start</span>
            </a>
          ))}
        </div>
      </div>
      <Footer onNav={nav} learn />
    </div>
  );
}

function ProgressPage({ nav, profile, lang, onToggleLang, onLogout }: { nav: (v: View) => void; profile: QariProfile | null; lang: Lang; onToggleLang: () => void; onLogout: () => void }) {
  const surahs = [{ name: "Al-Fatihah", ar: "الفاتحة", pct: 57, label: "4 of 7 ayahs" }, { name: "Al-Ikhlas", ar: "الإخلاص", pct: 100, label: "Complete ✓" }, { name: "Al-Falaq", ar: "الفلق", pct: 20, label: "1 of 5 ayahs" }, { name: "An-Nas", ar: "الناس", pct: 0, label: "Not started" }];
  const skills = [["Madd", "مدّ", 82], ["Ghunnah", "غنّة", 64], ["Qalqalah", "قلقلة", 71], ["Makharij", "مخارج", 48], ["Waqf", "وقف", 58]] as const;
  return (
    <div className="surface-light">
      <NavBar links={LEARN_LINKS} active="progress" onNav={nav} learn user={profile?.name || profile?.email} points={profile?.points} streak={profile?.streak} onLogout={onLogout} onToggleLang={onToggleLang} lang={lang}
        right={<button className="btn btn-sm btn-ghost" onClick={() => nav("home")}>🎙 Qari mode</button>} />
      <PageHead learn>
        <div className="center">
          <div className="eyebrow" style={{ color: "var(--green-300)" }}>My progress</div>
          <h1 className="rk" style={{ fontSize: 34, color: "#f7f1e3", margin: "8px 0 16px" }}>🔥 5-day streak</h1>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} style={{ width: 38, height: 38, borderRadius: 10, background: i < 5 ? "var(--green-100)" : "var(--card-warm)", border: i === 5 ? "2px dashed var(--green-500)" : "1px solid rgba(212,169,74,.25)", fontSize: 12, fontWeight: 800, color: i < 5 ? "var(--green-500)" : "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>{i < 5 ? "🔥" : d}</div>
            ))}
          </div>
        </div>
      </PageHead>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "44px 28px 70px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 24 }}>
        <div className="card" style={{ padding: "28px 30px" }}>
          <h2 className="rk" style={{ fontSize: 20, color: "var(--ink-dark)", margin: "0 0 18px" }}>Surah progress</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {surahs.map((s) => (
              <div key={s.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "var(--ink-dark)" }}>{s.name} <span className="ar" style={{ color: "var(--gold-ink)" }}>{s.ar}</span></span>
                  <span className="mut" style={{ fontSize: 12 }}>{s.label}</span>
                </div>
                <div className="bar-thin"><div className={s.pct === 100 ? "bar-green" : "bar-fill"} style={{ width: `${s.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: "28px 30px" }}>
          <h2 className="rk" style={{ fontSize: 20, color: "var(--ink-dark)", margin: "0 0 18px" }}>Tajweed skills</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {skills.map(([name, ar, pct]) => (
              <div key={name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "var(--ink-dark)" }}>{name} <span className="ar" style={{ color: "var(--green-500)" }}>{ar}</span></span>
                  <span className="rk" style={{ fontWeight: 700, fontSize: 13, color: pct < 55 ? "var(--gold-ink)" : "var(--green-500)" }}>{pct}%{pct < 55 ? " · focus" : ""}</span>
                </div>
                <div className="bar-thin"><div className={pct < 55 ? "bar-fill" : "bar-green"} style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer onNav={nav} learn />
    </div>
  );
}

function DonatePage({ nav }: { nav: (v: View) => void }) {
  const [amount, setAmount] = useState(25);
  const [monthly, setMonthly] = useState(false);
  return (
    <div className="surface-dark-plain">
      <div className="pattern-overlay" />
      <div className="topnav" style={{ background: "transparent", borderBottom: "1px solid rgba(212,169,74,.3)" }}>
        <div className="nav-inner"><Brand /><div className="spacer" /><a href="#" onClick={(e) => { e.preventDefault(); nav("home"); }} className="rk" style={{ fontWeight: 700, fontSize: 14, color: "rgba(247,241,227,.7)" }}>← Back to home</a></div>
      </div>
      <div style={{ position: "relative", zIndex: 5, maxWidth: 800, margin: "0 auto", padding: "64px 28px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 14, animation: "floatY 6s ease-in-out infinite", display: "inline-block" }}>🤲</div>
        <div className="ar" style={{ fontSize: 24, color: "var(--gold-500)", marginBottom: 10 }}>مَنْ ذَا الَّذِي يُقْرِضُ اللَّهَ قَرْضًا حَسَنًا</div>
        <h1 className="rk" style={{ fontSize: "clamp(30px, 7vw, 44px)", color: "#f7f1e3", margin: "0 0 14px" }}>Help the Quran reach every ear</h1>
        <p style={{ color: "rgba(247,241,227,.7)", fontSize: 16, lineHeight: 1.7, maxWidth: 560, margin: "0 auto 30px" }}>Your donation keeps the collection open, funds GPU transcription, and pays our reviewers.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          {[5, 10, 25, 50, 100, 250].map((v) => (
            <button key={v} onClick={() => setAmount(v)} className="btn btn-md" style={{ background: v === amount ? "var(--gold-grad)" : "rgba(247,241,227,.06)", color: v === amount ? "var(--green-950)" : "#f7f1e3", border: v === amount ? "none" : "1px solid rgba(212,169,74,.35)" }}>${v}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 22 }}>
          <button onClick={() => setMonthly(false)} className="btn btn-sm" style={{ background: !monthly ? "var(--gold-grad)" : "transparent", color: !monthly ? "var(--green-950)" : "#f7f1e3", border: monthly ? "1px solid rgba(212,169,74,.35)" : "none" }}>Give once</button>
          <button onClick={() => setMonthly(true)} className="btn btn-sm" style={{ background: monthly ? "var(--gold-grad)" : "transparent", color: monthly ? "var(--green-950)" : "#f7f1e3", border: !monthly ? "1px solid rgba(212,169,74,.35)" : "none" }}>Monthly</button>
        </div>
        <button className="btn btn-lg btn-gold btn-gold-pulse" style={{ width: "100%", maxWidth: 400 }}>🤲 Donate ${amount}{monthly ? " / month" : ""}</button>
        <div style={{ fontSize: 12, color: "rgba(247,241,227,.5)", marginTop: 14 }}>🔒 Secure payment · 100% goes to the project · Zakat-eligible</div>
      </div>
      <div style={{ position: "relative", zIndex: 5, maxWidth: 1000, margin: "0 auto", padding: "10px 28px 70px" }}>
        <div className="grid-3">
          {[["$10", "Reviews and approves 50 recorded verses"], ["$50", "Stores a full surah from all 5 target qaris"], ["$100", "Sponsors a complete juz in the voice model"]].map(([v, d]) => (
            <div key={v} className="glass-card" style={{ borderRadius: 18, padding: "26px 28px", textAlign: "center" }}>
              <div className="rk" style={{ fontSize: 26, color: "var(--gold-300)", fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 13, color: "rgba(247,241,227,.65)", lineHeight: 1.6, marginTop: 6 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="footer"><div className="footer-inner"><span>Tilawah · Recite for the Ummah</span><span className="footer-ar">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</span></div></div>
    </div>
  );
}

function LegalPage({ nav, kind }: { nav: (v: View) => void; kind: "privacy" | "terms" }) {
  const title = kind === "privacy" ? "Privacy Policy" : "Terms of Service";
  const body = kind === "privacy"
    ? ["Your recitations are private — only you and reviewers see them.", "Approved recordings join the open collection to train the Tilawah model.", "We never sell your data. Email and profile info stay encrypted.", "You can delete your account and data anytime."]
    : ["Tilawah is a non-profit Quran voice collection.", "By reciting you consent to your approved recordings being used for training.", "Be respectful — this is a sacred community effort.", "Donations are zakat-eligible and 100% go to the project."];
  return (
    <div className="surface-light">
      <div className="topnav"><div className="nav-inner"><a href="#" onClick={(e) => { e.preventDefault(); nav("landing"); }}><Brand /></a><div className="spacer" /><a href="#" onClick={(e) => { e.preventDefault(); nav("home"); }} className="rk" style={{ fontWeight: 700, fontSize: 14, color: "rgba(247,241,227,.7)" }}>← Back</a></div></div>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 28px 80px" }}>
        <h1 className="rk" style={{ fontSize: 36, color: "var(--ink-dark)", margin: "0 0 24px" }}>{title}</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {body.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 12, fontSize: 15, color: "var(--muted-2)", lineHeight: 1.7 }}>
              <span className="diamond" style={{ width: 24, height: 24 }}><span style={{ fontSize: 11 }}>{i + 1}</span></span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>
      <Footer onNav={nav} />
    </div>
  );
}

function ChallengePage({ nav }: { nav: (v: View) => void }) {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  return (
    <div className="surface-dark-plain">
      <div className="pattern-overlay" />
      <div className="topnav" style={{ background: "transparent", borderBottom: "1px solid rgba(212,169,74,.3)" }}>
        <div className="nav-inner"><Brand /><div className="spacer" /><a href="#" onClick={(e) => { e.preventDefault(); nav("home"); }} className="rk" style={{ fontWeight: 700, fontSize: 14, color: "rgba(247,241,227,.7)" }}>← Back to home</a></div>
      </div>
      <div style={{ position: "relative", zIndex: 5, maxWidth: 840, margin: "0 auto", padding: "64px 28px 44px", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 14, animation: "floatY 6s ease-in-out infinite", display: "inline-block" }}>🌙</div>
        <div className="eyebrow">Ramadan 2026</div>
        <h1 className="rk" style={{ fontSize: "clamp(30px, 7vw, 44px)", color: "#f7f1e3", margin: "10px 0 14px" }}>Recite Juz Amma in 30 days</h1>
        <p style={{ color: "rgba(247,241,227,.7)", fontSize: 16, maxWidth: 560, margin: "0 auto" }}>One short surah a day. Complete the challenge to earn the Juz Amma badge and 500 bonus points.</p>
        <div className="grid-3" style={{ marginTop: 30 }}>
          {[["30", "days"], ["21", "remaining"], ["2,415", "reciters joined"]].map(([v, l]) => (
            <div key={l} className="glass-card" style={{ borderRadius: 18, padding: "20px 16px" }}><div className="rk" style={{ fontSize: 26, fontWeight: 700, color: "var(--gold-300)" }}>{v}</div><div style={{ fontSize: 12, color: "rgba(247,241,227,.55)", fontWeight: 700 }}>{l}</div></div>
          ))}
        </div>
      </div>
      <div style={{ position: "relative", zIndex: 5, maxWidth: 900, margin: "0 auto", padding: "0 28px 60px" }}>
        <div className="glass-card" style={{ borderRadius: 22, padding: "30px 36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
            <span className="rk" style={{ fontSize: 16, fontWeight: 700, color: "#f7f1e3" }}>🔥 Your streak — day 8</span>
            <span style={{ fontSize: 12, color: "rgba(247,241,227,.55)", fontWeight: 700 }}>1 streak freeze available ❄️</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(38px, 100%), 1fr))", gap: 8 }}>
            {days.map((n) => (
              <div key={n} style={{ aspectRatio: "1", borderRadius: 8, background: n <= 8 ? "var(--gold-grad)" : n === 9 ? "rgba(212,169,74,.2)" : "transparent", border: n <= 8 ? "none" : n === 9 ? "1px dashed var(--gold-500)" : "1px solid rgba(212,169,74,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: n <= 8 ? "var(--green-950)" : "rgba(247,241,227,.75)" }}>{n}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="center" style={{ position: "relative", zIndex: 5, maxWidth: 640, margin: "0 auto", padding: "0 28px 80px" }}>
        <div className="glass-card arch-card-sm" style={{ padding: "50px 40px 36px" }}>
          <div style={{ fontSize: 46, marginBottom: 12 }}>🏅</div>
          <div className="rk" style={{ fontSize: 24, fontWeight: 600, color: "#f7f1e3", marginBottom: 8 }}>The Juz Amma badge</div>
          <div style={{ fontSize: 14, color: "rgba(247,241,227,.65)", lineHeight: 1.7 }}>Awarded once, forever on your profile — plus 500 bonus points.</div>
        </div>
      </div>
    </div>
  );
}

function SharePage({ nav, share }: { nav: (v: View) => void; share: { score: number; verse: string; label: string } | null }) {
  const score = share?.score ?? 0;
  const verse = share?.verse || "";
  const label = share?.label || "";
  return (
    <div className="surface-dark" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="pattern-overlay" />
      <div className="glass-card arch-card-sm fade-up" style={{ maxWidth: 460, width: "100%", margin: 28, padding: "48px 40px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 46, marginBottom: 12 }}>🎉</div>
        <div className="eyebrow">Share your win</div>
        <h1 className="rk" style={{ fontSize: 28, color: "#f7f1e3", margin: "8px 0 8px" }}>Masha'Allah — {score}%!</h1>
        <p style={{ fontSize: 14, marginBottom: 24, color: "rgba(247,241,227,.78)" }}>You nailed {label || "your ayah"}.</p>
        <div className="glass-card" style={{ borderRadius: 16, padding: "20px", marginBottom: 24 }}>
          <div className="ar" style={{ fontSize: 26, color: "var(--gold-300)", direction: "rtl" }}>{verse}</div>
          <div style={{ fontSize: 12, marginTop: 8, color: "rgba(247,241,227,.78)" }}>tilawah.me · Recite for the Ummah</div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-md btn-gold" onClick={() => nav("learn")}>📋 Copy card</button>
          <button className="btn btn-md btn-ghost" onClick={() => nav("learn")}>Done</button>
        </div>
      </div>
    </div>
  );
}
