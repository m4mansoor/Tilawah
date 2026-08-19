import { Brand, Footer } from "./ui";
import type { View } from "./AppNew";

const WHY = [
  { icon: "🕋", title: "For Huffadh", text: "Empowers Huffadh to maintain and strengthen their memorization with consistent, structured revision." },
  { icon: "🌱", title: "For every stage", text: "Supports learners at every stage — from those just starting with Arabic letters to advanced students refining their Tajweed." },
  { icon: "🤝", title: "Learn together", text: "Connects Qaris and students through a buddy-matching system, enabling real-time recitation sessions and peer accountability." },
  { icon: "⚡", title: "Instant feedback", text: "Provides precise, instant feedback by highlighting mistakes as they happen, so learners correct themselves immediately." },
];

const STACK = [
  { icon: "📱", title: "Apps — Tauri", text: "Desktop (Windows / macOS / Linux) & Android apps built with Tauri (React + Rust) — native mic capture and offline-first." },
  { icon: "🌐", title: "Web — React", text: "A rich, responsive web platform (React + Vite) for study, recitation, and community features." },
  { icon: "⚙️", title: "API — FastAPI", text: "A robust backend handling authentication, user data, correction, and progress sync — API-first." },
  { icon: "🧠", title: "AI — Whisper on GPU", text: "A Quran-tuned Whisper model transcribes your recitation; the engine matches the verse and flags word-by-word + tajweed mistakes." },
];

const FEATURES = [
  { icon: "🎯", title: "Buddy Matching", text: "Find recitation partners who match your pace, style, and schedule." },
  { icon: "📖", title: "Interactive Mushaf", text: "Read with word-by-word highlighting and Tajweed rules." },
  { icon: "🎙️", title: "Real-Time Recitation", text: "Schedule and join live recitation sessions with peers." },
  { icon: "⚡", title: "Mistake Highlighting", text: "Get instant, precise feedback during recitation." },
  { icon: "📈", title: "Progress Tracking", text: "Monitor your revision consistency and improvement over time." },
];
export default function AboutPage({ nav }: { nav: (v: View) => void }) {
  return (
    <div className="surface-dark-plain" style={{ minHeight: "100vh", overflowX: "hidden" }}>
      <div className="pattern-overlay" />

      <div className="topnav" style={{ background: "transparent", borderBottom: "1px solid rgba(212,169,74,.3)" }}>
        <div className="nav-inner">
          <a href="#" onClick={(e) => { e.preventDefault(); nav("landing"); }}><Brand /></a>
          <div className="spacer" />
          <a href="#" onClick={(e) => { e.preventDefault(); nav("landing"); }} className="rk" style={{ fontWeight: 700, fontSize: 14, color: "rgba(247,241,227,.7)" }}>← Back</a>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 5, maxWidth: 900, margin: "0 auto", padding: "72px 28px 8px", textAlign: "center" }}>
        <div className="ar" style={{ fontSize: 26, color: "var(--gold-300)", marginBottom: 16 }}>وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div>
        <div className="rk" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,169,74,.12)", border: "1px solid rgba(212,169,74,.4)", borderRadius: 99, padding: "7px 18px", fontSize: 13, fontWeight: 700, color: "#f0d488" }}>✦ Open-source · Non-profit · For the whole ummah</div>
        <h1 className="rk" style={{ fontSize: 58, color: "#f7f1e3", margin: "20px 0 12px", fontWeight: 600, lineHeight: 1.1 }}>
          About <span style={{ background: "var(--gold-grad)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>Tilawah</span>
        </h1>
        <p style={{ fontSize: 19, color: "rgba(247,241,227,.72)", margin: 0 }}>Built by <span className="rk" style={{ fontWeight: 700, color: "#f0d488" }}>Inaamul Haq Mansoor</span> — Founder &amp; Developer</p>
      </div>

      <div style={{ position: "relative", zIndex: 5, maxWidth: 760, margin: "0 auto", padding: "44px 28px 0" }}>
        <div className="glass-card" style={{ borderRadius: 20, padding: "34px 36px" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>👋</div>
          <div className="rk" style={{ fontSize: 24, color: "#f7f1e3", fontWeight: 600, marginBottom: 12 }}>Assalamu Alaikum!</div>
          <p style={{ color: "rgba(247,241,227,.75)", fontSize: 16, lineHeight: 1.8, margin: 0 }}>
            I'm <strong style={{ color: "#f0d488" }}>Inaamul Haq Mansoor</strong>, the founder and developer behind{" "}
            <strong style={{ color: "#f7f1e3" }}>Tilawah</strong> and the{" "}
            <a href="https://github.com/m4mansoor/open-quran-engine" target="_blank" rel="noreferrer" style={{ color: "#8fd4b4", textDecoration: "underline" }}>Open Quran Engine</a>.
          </p>
        </div>
      </div>
      <div style={{ position: "relative", zIndex: 5, maxWidth: 1000, margin: "0 auto", padding: "70px 28px 0" }}>
        <div className="rk" style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".2em", color: "#f0d488", textAlign: "center", textTransform: "uppercase" }}>The Vision</div>
        <h2 className="rk" style={{ fontSize: 38, color: "#f7f1e3", textAlign: "center", margin: "12px 0 14px", fontWeight: 600 }}>Why I built Tilawah</h2>
        <p style={{ color: "rgba(247,241,227,.68)", fontSize: 16, lineHeight: 1.8, maxWidth: 720, margin: "0 auto 34px", textAlign: "center" }}>
          Tilawah was born from a simple yet powerful vision: to make Quran learning and revision{" "}
          <em>accessible, engaging, and effective</em> for every Qari and learner, everywhere. 🌍
        </p>
        <div className="grid-3">
          {WHY.map((w) => (
            <div key={w.title} className="glass-card" style={{ borderRadius: 18, padding: "28px 26px" }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>{w.icon}</div>
              <div className="rk" style={{ fontSize: 19, color: "#f0d488", fontWeight: 700, marginBottom: 8 }}>{w.title}</div>
              <div style={{ fontSize: 14, color: "rgba(247,241,227,.68)", lineHeight: 1.7 }}>{w.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 5, maxWidth: 1000, margin: "0 auto", padding: "70px 28px 0" }}>
        <div className="rk" style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".2em", color: "#8fd4b4", textAlign: "center", textTransform: "uppercase" }}>Under the hood</div>
        <h2 className="rk" style={{ fontSize: 38, color: "#f7f1e3", textAlign: "center", margin: "12px 0 14px", fontWeight: 600 }}>The technology behind Tilawah</h2>
        <p style={{ color: "rgba(247,241,227,.68)", fontSize: 16, lineHeight: 1.8, maxWidth: 760, margin: "0 auto 34px", textAlign: "center" }}>
          At the heart of Tilawah lies the <strong style={{ color: "#f7f1e3" }}>Open Quran Engine</strong> — an open-source
          project I developed to listen to Quran recitation, recognize every word, and correct it with precise tajweed feedback,
          all through an API-first architecture.
        </p>
        <div className="grid-3" style={{ alignItems: "stretch" }}>
          {STACK.map((s) => (
            <div key={s.title} className="glass-card" style={{ borderRadius: 18, padding: "28px 26px", borderTop: "2px solid rgba(143,212,180,.5)" }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>{s.icon}</div>
              <div className="rk" style={{ fontSize: 18, color: "#8fd4b4", fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: "rgba(247,241,227,.68)", lineHeight: 1.7 }}>{s.text}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "relative", zIndex: 5, maxWidth: 1000, margin: "0 auto", padding: "70px 28px 0" }}>
        <div className="rk" style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".2em", color: "#f0d488", textAlign: "center", textTransform: "uppercase" }}>For Qaris &amp; Learners</div>
        <h2 className="rk" style={{ fontSize: 38, color: "#f7f1e3", textAlign: "center", margin: "12px 0 14px", fontWeight: 600 }}>Key features</h2>
        <p style={{ color: "rgba(247,241,227,.68)", fontSize: 16, lineHeight: 1.8, maxWidth: 720, margin: "0 auto 34px", textAlign: "center" }}>
          Whether you're a Qari looking to perfect your recitation, a Hafidh maintaining your hifdh, or a beginner taking
          your first steps with the Quran — Tilawah is designed for you.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="glass-card" style={{ borderRadius: 16, padding: "24px 22px" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div className="rk" style={{ fontSize: 17, color: "#f7f1e3", fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13.5, color: "rgba(247,241,227,.66)", lineHeight: 1.65 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 5, maxWidth: 800, margin: "0 auto", padding: "80px 28px 0", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🚀</div>
        <div className="rk" style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".2em", color: "#f0d488", textTransform: "uppercase" }}>My Mission</div>
        <p className="ar" style={{ fontSize: 24, color: "#f0d488", direction: "rtl", margin: "20px 0 8px" }}>خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ</p>
        <p style={{ fontSize: 17, color: "rgba(247,241,227,.8)", lineHeight: 1.9, margin: "0 auto", maxWidth: 640 }}>
          My goal is to leverage technology to serve the Ummah, making Quran learning more accessible, effective, and
          community-driven. Tilawah is not just an app — it's a movement towards collaborative, accountable, and joyful
          Quran engagement.
        </p>
      </div>

      <div style={{ position: "relative", zIndex: 5, maxWidth: 760, margin: "0 auto", padding: "70px 28px 90px", textAlign: "center" }}>
        <div className="glass-card" style={{ borderRadius: 20, padding: "38px 32px" }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>✨</div>
          <div className="rk" style={{ fontSize: 22, color: "#f7f1e3", fontWeight: 600 }}>Inaamul Haq Mansoor</div>
          <div style={{ fontSize: 14, color: "rgba(247,241,227,.6)", margin: "6px 0 20px" }}>Founder &amp; Developer · Tilawah</div>
          <div className="flex-center" style={{ gap: 14, flexWrap: "wrap" }}>
            <a href="https://tilawah.me" target="_blank" rel="noreferrer" className="btn btn-md btn-gold">🌐 tilawah.me</a>
            <a href="https://github.com/m4mansoor/open-quran-engine" target="_blank" rel="noreferrer" className="btn btn-md btn-ghost">☆ Contribute on GitHub</a>
          </div>
          <p style={{ fontSize: 13, color: "rgba(247,241,227,.55)", lineHeight: 1.7, margin: "22px auto 0", maxWidth: 520 }}>
            I'm continuously building and improving Tilawah based on feedback from users like you. If you find value in
            this project, share it, contribute, or simply send feedback — together, we can make a meaningful impact. 🚀
          </p>
        </div>
      </div>

      <Footer onNav={nav} />
    </div>
  );
}



